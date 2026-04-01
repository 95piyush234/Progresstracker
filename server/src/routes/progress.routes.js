import { Router } from "express";
import {
  createProgressEntry,
  deleteProgressEntry,
  listProgressEntries,
  updateProgressEntry
} from "../controllers/progress.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createProgressSchema,
  progressParamSchema,
  progressQuerySchema,
  updateProgressSchema
} from "../validators/progress.validators.js";

export const progressRouter = Router();

progressRouter.use(requireAuth);
progressRouter.get("/", validate(progressQuerySchema, "query"), asyncHandler(listProgressEntries));
progressRouter.post("/", validate(createProgressSchema), asyncHandler(createProgressEntry));
progressRouter.patch("/:entryId", validate(progressParamSchema, "params"), validate(updateProgressSchema), asyncHandler(updateProgressEntry));
progressRouter.delete("/:entryId", validate(progressParamSchema, "params"), asyncHandler(deleteProgressEntry));
