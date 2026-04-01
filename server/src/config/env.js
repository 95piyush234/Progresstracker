import dotenv from "dotenv";
import path from "node:path";

dotenv.config();

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function toList(value, fallback = []) {
  if (!value) return fallback;
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isPlaceholderValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return true;

  return [
    "yourgmail@gmail.com",
    "your_16_character_gmail_app_password",
    "replace-with-a-long-random-access-secret",
    "replace-with-a-long-random-refresh-secret"
  ].includes(normalized);
}

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: (process.env.NODE_ENV || "development") === "production",
  port: toNumber(process.env.PORT, 5000),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/progress-tracker-saas",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  clientOrigins: toList(process.env.CLIENT_ORIGINS, ["http://localhost:5173", "http://127.0.0.1:5173"]),
  accessTokenSecret: process.env.JWT_ACCESS_SECRET || "replace-with-a-long-random-access-secret",
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET || "replace-with-a-long-random-refresh-secret",
  accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  refreshCookieName: process.env.REFRESH_COOKIE_NAME || "pt_refresh_token",
  bcryptSaltRounds: toNumber(process.env.BCRYPT_SALT_ROUNDS, 12),
  rateLimitWindowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  rateLimitMax: toNumber(process.env.RATE_LIMIT_MAX, 200),
  authRateLimitMax: toNumber(process.env.AUTH_RATE_LIMIT_MAX, 20),
  mail: {
    from: process.env.MAIL_FROM && !process.env.MAIL_FROM.includes("example.com")
      ? process.env.MAIL_FROM
      : (process.env.SMTP_USER ? `Progress Tracker <${process.env.SMTP_USER}>` : "Progress Tracker <no-reply@example.com>"),
    host: process.env.SMTP_HOST || "",
    port: toNumber(process.env.SMTP_PORT, 587),
    secure: toBoolean(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || ""
  },
  emailOtpExpiresMinutes: toNumber(process.env.EMAIL_OTP_EXPIRES_MINUTES, 10),
  passwordResetExpiresMinutes: toNumber(process.env.PASSWORD_RESET_EXPIRES_MINUTES, 30),
  uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR || "./uploads"),
  maxFileSizeBytes: toNumber(process.env.MAX_FILE_SIZE_MB, 5) * 1024 * 1024
};

export function isMailConfigured() {
  return Boolean(
    config.mail.host
    && config.mail.user
    && config.mail.pass
    && !isPlaceholderValue(config.mail.user)
    && !isPlaceholderValue(config.mail.pass)
  );
}
