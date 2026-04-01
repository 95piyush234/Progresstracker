import winston from "winston";

const consoleFormat = winston.format.printf(({ level, message, timestamp, stack }) =>
  `${timestamp} [${level}] ${stack || message}`
);

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    consoleFormat
  ),
  transports: [new winston.transports.Console()]
});

export const morganStream = {
  write(message) {
    logger.http(message.trim());
  }
};
