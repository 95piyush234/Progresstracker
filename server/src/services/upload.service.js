import path from "node:path";

export function mapUploadedFile(file) {
  if (!file) {
    return null;
  }

  return {
    url: `/uploads/${path.basename(file.path)}`,
    filename: file.filename,
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  };
}
