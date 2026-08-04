import mongoose from "mongoose";
import { config } from "./env.js";
import { logger } from "./logger.js";

export async function connectDatabase() {
  mongoose.set("strictQuery", true);

  if (config.isProduction && config.mongoUri.includes("127.0.0.1")) {
    throw new Error("MONGODB_URI is required in Render. Add your MongoDB Atlas connection string in the service environment settings.");
  }

  await mongoose.connect(config.mongoUri, {
    autoIndex: !config.isProduction
  });

  logger.info(`MongoDB connected: ${mongoose.connection.host}`);
}
