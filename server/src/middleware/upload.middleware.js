import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { config } from "../config/env.js";

fs.mkdirSync(config.uploadDir, { recursive: true });

const storage = multer.memoryStorage();

function fileFilter(_req, file, callback) {
  if (!file.mimetype.startsWith("image/")) {
    callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Only image uploads are allowed."));
    return;
  }

  callback(null, true);
}

export const uploadAttachment = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxFileSizeBytes,
    files: 1
  }
}).single("file");
