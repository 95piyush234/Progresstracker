import { Router } from "express";
import { uploadFile } from "../controllers/upload.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { uploadAttachment } from "../middleware/upload.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const uploadRouter = Router();

uploadRouter.use(requireAuth);
uploadRouter.post("/attachment", uploadAttachment, asyncHandler(uploadFile));
