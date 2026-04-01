import path from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config/env.js";
import { logger, morganStream } from "./config/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { adminRouter } from "./routes/admin.routes.js";
import { analyticsRouter } from "./routes/analytics.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { goalRouter } from "./routes/goal.routes.js";
import { progressRouter } from "./routes/progress.routes.js";
import { taskRouter } from "./routes/task.routes.js";
import { uploadRouter } from "./routes/upload.routes.js";

function sanitizeInput(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeInput);
  }

  if (value && typeof value === "object") {
    return Object.entries(value).reduce((accumulator, [key, nestedValue]) => {
      const safeKey = key.replace(/\$/g, "").replace(/\./g, "");
      accumulator[safeKey] = sanitizeInput(nestedValue);
      return accumulator;
    }, {});
  }

  return value;
}

export function createApp() {
  const app = express();
  const workspaceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const premiumFrontendDir = path.join(workspaceDir, "frontend");
  const premiumIndexPath = path.join(premiumFrontendDir, "index.html");
  const premiumStylePath = path.join(premiumFrontendDir, "style.css");
  const premiumScriptPath = path.join(premiumFrontendDir, "script.js");

  app.set("trust proxy", 1);

  app.use(helmet({
    crossOriginResourcePolicy: false
  }));

  app.use(cors({
    origin(origin, callback) {
      if (!origin || origin === "null" || config.clientOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true
  }));

  app.use(morgan(config.isProduction ? "combined" : "dev", { stream: morganStream }));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(cookieParser());
  app.use((req, _res, next) => {
    req.body = sanitizeInput(req.body);
    req.params = sanitizeInput(req.params);
    next();
  });

  app.use((req, _res, next) => {
    req.requestMeta = {
      ipAddress: req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.socket.remoteAddress || "",
      userAgent: req.headers["user-agent"] || ""
    };
    next();
  });

  app.use(rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    handler(_req, res) {
      res.status(429).json({
        success: false,
        message: "Too many requests. Please slow down and try again shortly."
      });
    }
  }));

  app.use("/uploads", express.static(path.resolve(config.uploadDir)));
  app.use("/api/auth", authRouter);
  app.use("/api/goals", goalRouter);
  app.use("/api/tasks", taskRouter);
  app.use("/api/progress", progressRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/uploads", uploadRouter);
  app.use("/api/admin", adminRouter);
  app.use("/frontend", express.static(premiumFrontendDir));

  app.get("/api/health", (_req, res) => {
    res.json({
      success: true,
      message: "Progress Tracker API is healthy."
    });
  });

  app.get("/", (_req, res) => {
    res.sendFile(premiumIndexPath);
  });

  app.get("/reset-password", (_req, res) => {
    res.sendFile(premiumIndexPath);
  });

  app.get("/style.css", (_req, res) => {
    res.sendFile(premiumStylePath);
  });

  app.get("/script.js", (_req, res) => {
    res.sendFile(premiumScriptPath);
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  logger.debug("Express app bootstrapped.");
  return app;
}
