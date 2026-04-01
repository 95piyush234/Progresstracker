import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

export function hashToken(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

export function randomOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function durationToMs(value) {
  const match = String(value || "").trim().match(/^(\d+)([smhd])$/i);
  if (!match) {
    return 0;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const unitMap = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  return amount * unitMap[unit];
}

export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      email: user.email,
      type: "access"
    },
    config.accessTokenSecret,
    { expiresIn: config.accessTokenExpiresIn }
  );
}

export function signRefreshToken(user, sessionId) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      sid: sessionId,
      role: user.role,
      type: "refresh"
    },
    config.refreshTokenSecret,
    { expiresIn: config.refreshTokenExpiresIn }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.accessTokenSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.refreshTokenSecret);
}
