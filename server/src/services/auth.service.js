import jwt from "jsonwebtoken";
import { RefreshToken } from "../models/RefreshToken.js";
import { config } from "../config/env.js";
import {
  durationToMs,
  hashToken,
  randomOtp,
  randomToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} from "../utils/token.utils.js";
import { ApiError } from "../utils/ApiError.js";

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function setRefreshCookie(res, refreshToken) {
  res.cookie(config.refreshCookieName, refreshToken, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.isProduction ? "none" : "lax",
    maxAge: durationToMs(config.refreshTokenExpiresIn),
    path: "/"
  });
}

export function clearRefreshCookie(res) {
  res.clearCookie(config.refreshCookieName, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.isProduction ? "none" : "lax",
    path: "/"
  });
}

export function generateOtpPayload() {
  const otp = randomOtp();
  return {
    rawOtp: otp,
    codeHash: hashToken(otp),
    expiresAt: new Date(Date.now() + config.emailOtpExpiresMinutes * 60 * 1000)
  };
}

export function generatePasswordResetPayload() {
  const token = randomToken(32);
  return {
    rawToken: token,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + config.passwordResetExpiresMinutes * 60 * 1000)
  };
}

export async function issueAuthTokens(user, meta = {}, replacedSession = null) {
  const session = new RefreshToken({
    user: user._id,
    tokenHash: "pending",
    userAgent: meta.userAgent || "",
    ipAddress: meta.ipAddress || "",
    expiresAt: new Date(Date.now() + durationToMs(config.refreshTokenExpiresIn)),
    lastUsedAt: new Date()
  });

  const refreshToken = signRefreshToken(user, session._id.toString());
  const decoded = jwt.decode(refreshToken);
  if (decoded?.exp) {
    session.expiresAt = new Date(decoded.exp * 1000);
  }

  session.tokenHash = hashToken(refreshToken);
  await session.save();

  if (replacedSession) {
    replacedSession.revokedAt = new Date();
    replacedSession.replacedByTokenHash = session.tokenHash;
    await replacedSession.save();
  }

  return {
    accessToken: signAccessToken(user),
    refreshToken,
    session: {
      id: session._id.toString(),
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      lastUsedAt: session.lastUsedAt.toISOString()
    }
  };
}

export async function rotateRefreshToken(rawRefreshToken, meta = {}) {
  try {
    const payload = verifyRefreshToken(rawRefreshToken);
    const session = await RefreshToken.findOne({
      _id: payload.sid,
      user: payload.sub,
      tokenHash: hashToken(rawRefreshToken),
      revokedAt: null,
      expiresAt: { $gt: new Date() }
    }).populate("user");

    if (!session || !session.user) {
      throw new ApiError(401, "Refresh session is invalid or expired.");
    }

    session.lastUsedAt = new Date();
    session.userAgent = meta.userAgent || session.userAgent;
    session.ipAddress = meta.ipAddress || session.ipAddress;
    await session.save();

    return {
      ...(await issueAuthTokens(session.user, meta, session)),
      user: session.user
    };
  } catch (error) {
    throw error.statusCode ? error : new ApiError(401, "Refresh token is invalid.");
  }
}

export async function revokeRefreshToken(rawRefreshToken) {
  try {
    const payload = verifyRefreshToken(rawRefreshToken);
    await RefreshToken.updateOne(
      {
        _id: payload.sid,
        user: payload.sub,
        tokenHash: hashToken(rawRefreshToken),
        revokedAt: null
      },
      {
        $set: {
          revokedAt: new Date()
        }
      }
    );
  } catch {
    // Keep logout idempotent.
  }
}

export async function revokeAllUserSessions(userId) {
  await RefreshToken.updateMany(
    {
      user: userId,
      revokedAt: null
    },
    {
      $set: {
        revokedAt: new Date()
      }
    }
  );
}
