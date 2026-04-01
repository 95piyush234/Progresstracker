import { Router } from "express";
import { listUsers } from "../controllers/admin.controller.js";
import { authorize, requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { adminUserQuerySchema } from "../validators/auth.validators.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, authorize("admin"));
adminRouter.get("/users", validate(adminUserQuerySchema, "query"), asyncHandler(listUsers));
