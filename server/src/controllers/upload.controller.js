import { mapUploadedFile } from "../services/upload.service.js";
import { sendSuccess } from "../utils/response.js";

export async function uploadFile(req, res) {
  const file = mapUploadedFile(req.file);

  sendSuccess(res, {
    statusCode: 201,
    message: "File uploaded successfully.",
    data: {
      file
    }
  });
}
