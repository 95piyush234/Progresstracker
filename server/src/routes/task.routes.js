import { Router } from "express";
import {
  createTask,
  deleteTask,
  listTasks,
  toggleTask,
  updateTask
} from "../controllers/task.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createTaskSchema,
  taskParamSchema,
  taskQuerySchema,
  updateTaskSchema
} from "../validators/task.validators.js";

export const taskRouter = Router();

taskRouter.use(requireAuth);
taskRouter.get("/", validate(taskQuerySchema, "query"), asyncHandler(listTasks));
taskRouter.post("/", validate(createTaskSchema), asyncHandler(createTask));
taskRouter.patch("/:taskId", validate(taskParamSchema, "params"), validate(updateTaskSchema), asyncHandler(updateTask));
taskRouter.patch("/:taskId/toggle", validate(taskParamSchema, "params"), asyncHandler(toggleTask));
taskRouter.delete("/:taskId", validate(taskParamSchema, "params"), asyncHandler(deleteTask));
