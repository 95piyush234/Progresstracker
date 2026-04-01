import Joi from "joi";

const email = Joi.string().trim().email().max(120).required();
const password = Joi.string().trim().min(8).max(120).required();

export const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  email,
  password
});

export const verifyEmailSchema = Joi.object({
  email,
  otp: Joi.string().trim().pattern(/^\d{6}$/).required()
});

export const resendVerificationSchema = Joi.object({
  email
});

export const loginSchema = Joi.object({
  email,
  password
});

export const refreshSchema = Joi.object({
  refreshToken: Joi.string().trim().allow("").optional()
});

export const forgotPasswordSchema = Joi.object({
  email,
  resetUrlBase: Joi.string().trim().max(1200).allow("").optional()
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().trim().required(),
  password
});

export const adminUserQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().allow("").default(""),
  role: Joi.string().valid("admin", "user").optional()
});
