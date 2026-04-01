import { Router } from "express";
import {
  createGoal,
  deleteGoal,
  getGoal,
  listGoals,
  updateGoal
} from "../controllers/goal.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createGoalSchema,
  goalParamSchema,
  goalQuerySchema,
  updateGoalSchema
} from "../validators/goal.validators.js";

export const goalRouter = Router();

goalRouter.use(requireAuth);
goalRouter.get("/", validate(goalQuerySchema, "query"), asyncHandler(listGoals));
goalRouter.post("/", validate(createGoalSchema), asyncHandler(createGoal));
goalRouter.get("/:goalId", validate(goalParamSchema, "params"), asyncHandler(getGoal));
goalRouter.patch("/:goalId", validate(goalParamSchema, "params"), validate(updateGoalSchema), asyncHandler(updateGoal));
goalRouter.delete("/:goalId", validate(goalParamSchema, "params"), asyncHandler(deleteGoal));
