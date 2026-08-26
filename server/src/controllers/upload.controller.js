import cloudinary from "../config/cloudinary.js";
import { sendSuccess } from "../utils/response.js";

export async function uploadFile(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded." });
  }

  const fileResult = await new Promise((resolve, reject) => {
    let stream = cloudinary.uploader.upload_stream(
      { folder: "progress-tracker" },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          format: result.format,
          size: result.bytes
        });
      }
    );
    stream.end(req.file.buffer);
  });

  sendSuccess(res, {
    statusCode: 201,
    message: "File uploaded successfully.",
    data: {
      file: fileResult
    }
  });
}