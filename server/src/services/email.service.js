import nodemailer from "nodemailer";
import { config, isMailConfigured } from "../config/env.js";
import { logger } from "../config/logger.js";

let transporter = null;

function getTransporter() {
  if (!isMailConfigured()) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.secure,
      auth: {
        user: config.mail.user,
        pass: config.mail.pass
      }
    });
  }

  return transporter;
}

export async function sendEmail({ to, subject, text, html }) {
  const activeTransporter = getTransporter();

  if (!activeTransporter) {
    logger.error(`SMTP is not configured. Email delivery skipped for ${to}.`);
    return {
      delivered: false,
      preview: false,
      error: "SMTP is not configured on the server."
    };
  }

  try {
    await activeTransporter.sendMail({
      from: config.mail.from,
      to,
      subject,
      text,
      html
    });

    return { delivered: true, preview: false };
  } catch (error) {
    logger.error(`SMTP delivery failed: ${error.message}`);
    return {
      delivered: false,
      preview: false,
      error: error.message
    };
  }
}

export function sendVerificationOtpEmail({ email, name, otp }) {
  return sendEmail({
    to: email,
    subject: "Verify your Progress Tracker account",
    text: `Hello ${name},\n\nYour verification OTP is ${otp}. It expires in ${config.emailOtpExpiresMinutes} minutes.\n\nIf this was not you, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827;">
        <h2 style="margin:0 0 12px;">Verify your Progress Tracker account</h2>
        <p>Hello ${name},</p>
        <p>Your verification OTP is:</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#111827;color:#ffffff;padding:16px 20px;border-radius:14px;text-align:center;">
          ${otp}
        </div>
        <p style="margin-top:16px;">This code expires in ${config.emailOtpExpiresMinutes} minutes.</p>
      </div>
    `
  });
}

export function sendPasswordResetEmail({ email, name, resetUrl }) {
  return sendEmail({
    to: email,
    subject: "Reset your Progress Tracker password",
    text: `Hello ${name},\n\nReset your password here:\n${resetUrl}\n\nThis link expires in ${config.passwordResetExpiresMinutes} minutes.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827;">
        <h2 style="margin:0 0 12px;">Reset your Progress Tracker password</h2>
        <p>Hello ${name},</p>
        <p>Use the button below to set a new password.</p>
        <p style="margin:24px 0;">
          <a href="${resetUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:12px;font-weight:700;">Reset Password</a>
        </p>
        <p>This link expires in ${config.passwordResetExpiresMinutes} minutes.</p>
        <p>If the button doesn't work, use this link:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
      </div>
    `
  });
}
