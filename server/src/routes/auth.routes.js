import { Router } from "express";
import rateLimit from "express-rate-limit";
import { config } from "../config/env.js";
import {
  forgotPassword,
  login,
  logout,
  mailStatus,
  me,
  refresh,
  register,
  resendVerification,
  resetPassword,
  verifyEmail
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema
} from "../validators/auth.validators.js";

const authLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler(_req, res) {
    res.status(429).json({
      success: false,
      message: "Too many authentication attempts. Please try again later."
    });
  }
});

export const authRouter = Router();

authRouter.post("/register", authLimiter, validate(registerSchema), asyncHandler(register));
authRouter.post("/verify-email", authLimiter, validate(verifyEmailSchema), asyncHandler(verifyEmail));
authRouter.post("/resend-verification", authLimiter, validate(resendVerificationSchema), asyncHandler(resendVerification));
authRouter.post("/login", authLimiter, validate(loginSchema), asyncHandler(login));
authRouter.post("/refresh", validate(refreshSchema), asyncHandler(refresh));
authRouter.post("/forgot-password", authLimiter, validate(forgotPasswordSchema), asyncHandler(forgotPassword));
authRouter.post("/reset-password", authLimiter, validate(resetPasswordSchema), asyncHandler(resetPassword));
authRouter.post("/logout", asyncHandler(logout));
authRouter.get("/mail-status", asyncHandler(mailStatus));
authRouter.get("/me", requireAuth, asyncHandler(me));
