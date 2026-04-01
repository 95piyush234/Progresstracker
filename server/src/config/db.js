import mongoose from "mongoose";
import { config } from "./env.js";
import { logger } from "./logger.js";

export async function connectDatabase() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(config.mongoUri, {
    autoIndex: !config.isProduction
  });

  logger.info(`MongoDB connected: ${mongoose.connection.host}`);
}
