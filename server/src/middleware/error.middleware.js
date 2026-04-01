import multer from "multer";
import { logger } from "../config/logger.js";

export function notFoundHandler(req, _res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

export function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || error.status || 500;

  if (statusCode >= 500) {
    logger.error(error);
  } else {
    logger.warn(error.message);
  }

  if (error instanceof multer.MulterError) {
    res.status(400).json({
      success: false,
      message: error.message
    });
    return;
  }

  res.status(statusCode).json({
    success: false,
    message: error.message || "Something went wrong.",
    ...(error.details ? { details: error.details } : {})
  });
}
