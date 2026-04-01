import fs from "node:fs";
import { createApp } from "./app.js";
import { connectDatabase } from "./config/db.js";
import { config } from "./config/env.js";
import { logger } from "./config/logger.js";

async function start() {
  fs.mkdirSync(config.uploadDir, { recursive: true });
  await connectDatabase();

  const app = createApp();
  app.listen(config.port, () => {
    logger.info(`Progress Tracker API listening on http://localhost:${config.port}`);
  });
}

start().catch((error) => {
  logger.error(error);
  process.exit(1);
});
