import Joi from "joi";

export const taskQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  date: Joi.date().iso().optional(),
  status: Joi.string().valid("completed", "pending", "all").default("all"),
  priority: Joi.string().valid("low", "medium", "high").optional(),
  goalId: Joi.string().trim().hex().length(24).optional(),
  sortBy: Joi.string().valid("date", "createdAt", "priority", "title").default("date"),
  sortOrder: Joi.string().valid("asc", "desc").default("asc")
});

export const createTaskSchema = Joi.object({
  goal: Joi.string().trim().hex().length(24).allow(null, "").optional(),
  title: Joi.string().trim().max(120).required(),
  description: Joi.string().trim().allow("").max(400).default(""),
  date: Joi.date().iso().required(),
  completed: Joi.boolean().default(false),
  priority: Joi.string().valid("low", "medium", "high").default("medium")
});

export const updateTaskSchema = createTaskSchema;

export const taskParamSchema = Joi.object({
  taskId: Joi.string().trim().hex().length(24).required()
});
