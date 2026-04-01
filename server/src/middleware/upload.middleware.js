import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { config } from "../config/env.js";

fs.mkdirSync(config.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, config.uploadDir);
  },
  filename: (_req, file, callback) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const base = path.basename(file.originalname || "file", ext).replace(/[^a-z0-9-_]+/gi, "-").slice(0, 60) || "file";
    callback(null, `${Date.now()}-${base}${ext || ".png"}`);
  }
});

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
