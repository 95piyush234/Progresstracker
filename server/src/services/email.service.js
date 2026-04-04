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
      connectionTimeout: config.mail.requestTimeoutMs,
      greetingTimeout: config.mail.requestTimeoutMs,
      socketTimeout: config.mail.requestTimeoutMs,
      dnsTimeout: config.mail.requestTimeoutMs,
      auth: {
        user: config.mail.user,
        pass: config.mail.pass
      }
    });
  }

  return transporter;
}

async function sendWithResend({ to, subject, text, html }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.mail.resendApiKey}`
    },
    body: JSON.stringify({
      from: config.mail.from,
      to: Array.isArray(to) ? to : [to],
      subject,
      text,
      html
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = payload?.message
      || payload?.error
      || payload?.name
      || "Resend API request failed.";
    throw new Error(detail);
  }

  return {
    delivered: true,
    preview: false,
    provider: "resend",
    id: payload?.id || ""
  };
}

function mapResendError(error) {
  const message = String(error?.message || "").trim();

  if (/only send testing emails to your own email address/i.test(message)) {
    return "Resend is in testing mode. It can only send to your Resend account email right now. For testing, use that same email address, or verify a domain in Resend and set MAIL_FROM to an address on that domain.";
  }

  if (/verify a domain/i.test(message) || /from address/i.test(message)) {
    return "Resend rejected the sender address. Set MAIL_FROM to onboarding@resend.dev for testing, or verify your own domain in Resend and use an address from that domain.";
  }

  if (/api key/i.test(message) || /unauthorized/i.test(message)) {
    return "Resend API key is invalid or missing. Check RESEND_API_KEY in Render.";
  }

  return message || "Resend email delivery failed.";
}

function mapSmtpError(error) {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "").trim();
  const renderBlockedPorts = process.env.RENDER && [25, 465, 587].includes(Number(config.mail.port));

  if (renderBlockedPorts && ["ESOCKET", "ETIMEDOUT", "ECONNECTION", "ECONNRESET", "EDNS"].includes(code)) {
    return "SMTP delivery timed out on Render. Configure RESEND_API_KEY for production email delivery, or move to a plan that allows outbound SMTP.";
  }

  if (["EAUTH", "EENVELOPE"].includes(code)) {
    return "The configured mail credentials or sender address were rejected. Check SMTP credentials and MAIL_FROM.";
  }

  return message || "Email delivery failed.";
}

export async function sendEmail({ to, subject, text, html }) {
  if (!isMailConfigured()) {
    logger.error(`Email delivery is not configured. Delivery skipped for ${to}.`);
    return {
      delivered: false,
      preview: false,
      error: "Email delivery is not configured on the server."
    };
  }

  if (config.mail.provider === "resend") {
    try {
      return await sendWithResend({ to, subject, text, html });
    } catch (error) {
      logger.error(`Resend delivery failed: ${error.message}`);
      return {
        delivered: false,
        preview: false,
        error: mapResendError(error)
      };
    }
  }

  const activeTransporter = getTransporter();
  if (!activeTransporter) {
    logger.error(`SMTP transport is not configured. Delivery skipped for ${to}.`);
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

    return { delivered: true, preview: false, provider: "smtp" };
  } catch (error) {
    logger.error(`SMTP delivery failed: ${error.message}`);
    return {
      delivered: false,
      preview: false,
      error: mapSmtpError(error)
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
