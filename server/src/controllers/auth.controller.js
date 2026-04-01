import { EmailVerificationOtp } from "../models/EmailVerificationOtp.js";
import { PasswordResetToken } from "../models/PasswordResetToken.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess } from "../utils/response.js";
import { hashToken } from "../utils/token.utils.js";
import {
  clearRefreshCookie,
  generateOtpPayload,
  generatePasswordResetPayload,
  issueAuthTokens,
  normalizeEmail,
  revokeAllUserSessions,
  revokeRefreshToken,
  rotateRefreshToken,
  setRefreshCookie
} from "../services/auth.service.js";
import { config, isMailConfigured } from "../config/env.js";
import { sendPasswordResetEmail, sendVerificationOtpEmail } from "../services/email.service.js";

function userPayload(user) {
  return user.toSafeObject();
}

function buildPasswordResetUrl(resetUrlBase, rawToken) {
  const encodedToken = encodeURIComponent(rawToken);
  const base = String(resetUrlBase || "").trim();

  if (base) {
    if (base.includes("__TOKEN__")) {
      return base.replace(/__TOKEN__/g, encodedToken);
    }

    if (/^file:\/\//i.test(base) || /\.html(?:$|[?#])/i.test(base)) {
      return `${config.clientUrl.replace(/\/$/, "")}/?token=${encodedToken}`;
    }

    return `${base.replace(/\/$/, "")}/reset-password?token=${encodedToken}`;
  }

  return `${config.clientUrl.replace(/\/$/, "")}/?token=${encodedToken}`;
}

async function createAndSendVerificationOtp(user) {
  if (!isMailConfigured()) {
    throw new ApiError(503, "Email delivery is not configured on the server yet. Add SMTP settings in server/.env before sending OTPs.");
  }

  await EmailVerificationOtp.updateMany(
    {
      user: user._id,
      usedAt: null
    },
    {
      $set: { usedAt: new Date() }
    }
  );

  const { rawOtp, codeHash, expiresAt } = generateOtpPayload();
  await EmailVerificationOtp.create({
    user: user._id,
    email: user.email,
    codeHash,
    expiresAt
  });

  const delivery = await sendVerificationOtpEmail({
    email: user.email,
    name: user.name,
    otp: rawOtp
  });

  if (!delivery.delivered) {
    throw new ApiError(503, delivery.error || "Verification email could not be delivered. Please try again later.");
  }

  return {
    expiresAt,
    delivery: {
      mode: "email",
      delivered: delivery.delivered,
      preview: delivery.preview
    }
  };
}

export async function register(req, res) {
  if (!isMailConfigured()) {
    throw new ApiError(503, "Email delivery is not configured on the server yet. Add SMTP settings in server/.env before creating accounts.");
  }

  const email = normalizeEmail(req.body.email);
  const existingUser = await User.findOne({ email });

  if (existingUser?.isVerified) {
    throw new ApiError(409, "An account with that email already exists.");
  }

  if (existingUser) {
    throw new ApiError(409, "An account with that email already exists. Verify it or use resend verification instead.");
  }

  const user = new User({
    name: req.body.name.trim(),
    email,
    password: req.body.password,
    isVerified: false
  });

  await user.save();
  const { expiresAt, delivery } = await createAndSendVerificationOtp(user);

  sendSuccess(res, {
    statusCode: 202,
    message: "Verification OTP sent to your email.",
    data: {
      email: user.email,
      expiresAt: expiresAt.toISOString(),
      delivery
    }
  });
}

export async function resendVerification(req, res) {
  const email = normalizeEmail(req.body.email);
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "No account exists for that email.");
  }

  if (user.isVerified) {
    throw new ApiError(400, "This account is already verified.");
  }

  const { expiresAt, delivery } = await createAndSendVerificationOtp(user);
  sendSuccess(res, {
    statusCode: 202,
    message: "A fresh verification OTP was sent.",
    data: {
      email: user.email,
      expiresAt: expiresAt.toISOString(),
      delivery
    }
  });
}

export async function verifyEmail(req, res) {
  const email = normalizeEmail(req.body.email);
  const otpRecord = await EmailVerificationOtp.findOne({
    email,
    usedAt: null,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 }).populate("user");

  if (!otpRecord || !otpRecord.user) {
    throw new ApiError(400, "No active verification OTP was found for that email.");
  }

  if (otpRecord.codeHash !== hashToken(req.body.otp)) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    throw new ApiError(401, "That OTP is invalid.");
  }

  otpRecord.usedAt = new Date();
  await otpRecord.save();

  otpRecord.user.isVerified = true;
  otpRecord.user.lastLoginAt = new Date();
  await otpRecord.user.save();

  const auth = await issueAuthTokens(otpRecord.user, req.requestMeta);
  setRefreshCookie(res, auth.refreshToken);

  sendSuccess(res, {
    message: "Email verified and account activated.",
    data: {
      user: userPayload(otpRecord.user),
      accessToken: auth.accessToken,
      session: auth.session
    }
  });
}

export async function login(req, res) {
  const email = normalizeEmail(req.body.email);
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const passwordMatches = await user.comparePassword(req.body.password);
  if (!passwordMatches) {
    throw new ApiError(401, "Invalid email or password.");
  }

  if (!user.isVerified) {
    throw new ApiError(403, "Verify your email before signing in.");
  }

  user.lastLoginAt = new Date();
  await user.save();

  const auth = await issueAuthTokens(user, req.requestMeta);
  setRefreshCookie(res, auth.refreshToken);

  sendSuccess(res, {
    message: "Signed in successfully.",
    data: {
      user: userPayload(user),
      accessToken: auth.accessToken,
      session: auth.session
    }
  });
}

export async function refresh(req, res) {
  const rawRefreshToken = req.cookies[config.refreshCookieName] || req.body.refreshToken || "";
  if (!rawRefreshToken) {
    throw new ApiError(401, "Refresh token is required.");
  }

  const result = await rotateRefreshToken(rawRefreshToken, req.requestMeta);
  setRefreshCookie(res, result.refreshToken);

  sendSuccess(res, {
    message: "Session refreshed.",
    data: {
      user: userPayload(result.user),
      accessToken: result.accessToken,
      session: result.session
    }
  });
}

export async function logout(req, res) {
  const rawRefreshToken = req.cookies[config.refreshCookieName] || req.body.refreshToken || "";
  if (rawRefreshToken) {
    await revokeRefreshToken(rawRefreshToken);
  }

  clearRefreshCookie(res);
  sendSuccess(res, {
    message: "Signed out successfully."
  });
}

export async function me(req, res) {
  sendSuccess(res, {
    message: "Authenticated user loaded.",
    data: {
      user: userPayload(req.user)
    }
  });
}

export async function forgotPassword(req, res) {
  const email = normalizeEmail(req.body.email);
  const user = await User.findOne({ email });

  if (!isMailConfigured()) {
    throw new ApiError(503, "Password reset email is not configured on the server yet. Add SMTP settings in server/.env first.");
  }

  if (user) {
    await PasswordResetToken.updateMany(
      {
        user: user._id,
        usedAt: null
      },
      {
        $set: { usedAt: new Date() }
      }
    );

    const { rawToken, tokenHash, expiresAt } = generatePasswordResetPayload();
    await PasswordResetToken.create({
      user: user._id,
      tokenHash,
      expiresAt
    });

    const resetUrl = buildPasswordResetUrl(req.body.resetUrlBase, rawToken);
    const delivery = await sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      resetUrl
    });

    if (!delivery.delivered) {
      throw new ApiError(503, delivery.error || "Password reset email could not be delivered. Please try again later.");
    }
  }

  sendSuccess(res, {
    message: "If the account exists, a password reset link has been sent.",
    data: {
      delivery: {
        mode: "email",
        delivered: true,
        preview: false
      }
    }
  });
}

export async function mailStatus(_req, res) {
  sendSuccess(res, {
    message: "Mail delivery status loaded.",
    data: {
      configured: isMailConfigured(),
      mode: isMailConfigured() ? "email" : "unavailable",
      from: config.mail.from
    }
  });
}

export async function resetPassword(req, res) {
  const record = await PasswordResetToken.findOne({
    tokenHash: hashToken(req.body.token),
    usedAt: null,
    expiresAt: { $gt: new Date() }
  }).populate("user");

  if (!record || !record.user) {
    throw new ApiError(400, "That password reset link is invalid or expired.");
  }

  record.usedAt = new Date();
  await record.save();

  record.user.password = req.body.password;
  await record.user.save();
  await revokeAllUserSessions(record.user._id);

  sendSuccess(res, {
    message: "Password reset successfully. Please sign in again."
  });
}
