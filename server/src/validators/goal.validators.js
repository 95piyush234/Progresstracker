import Joi from "joi";

export const goalQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(9),
  search: Joi.string().trim().allow("").default(""),
  category: Joi.string().trim().allow("").optional(),
  status: Joi.string().valid("active", "completed", "paused", "all").default("all"),
  priority: Joi.string().valid("low", "medium", "high").optional(),
  archived: Joi.boolean().optional(),
  sortBy: Joi.string().valid("createdAt", "updatedAt", "dueDate", "targetValue", "currentValue", "title").default("updatedAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc")
});

export const createGoalSchema = Joi.object({
  title: Joi.string().trim().max(120).required(),
  description: Joi.string().trim().allow("").max(500).default(""),
  category: Joi.string().trim().allow("").max(60).default("General"),
  createdBy: Joi.string().trim().allow("").max(80).default("You"),
  itemName: Joi.string().trim().allow("").max(120).default(""),
  goalType: Joi.string().trim().allow("").max(60).default("Target progress"),
  unitType: Joi.string().trim().allow("").max(30).default("custom"),
  startValue: Joi.number().min(0).default(0),
  unit: Joi.string().trim().allow("").max(30).default("units"),
  icon: Joi.string().trim().allow("").max(20).default(""),
  customFields: Joi.array().items(
    Joi.object({
      label: Joi.string().trim().allow("").max(40).required(),
      value: Joi.string().trim().allow("").max(120).required()
    })
  ).default([]),
  targetValue: Joi.number().min(1).required(),
  currentValue: Joi.number().min(0).default(0),
  status: Joi.string().valid("active", "completed", "paused").default("active"),
  priority: Joi.string().valid("low", "medium", "high").default("medium"),
  color: Joi.string().trim().pattern(/^#([A-Fa-f0-9]{6})$/).default("#7c3aed"),
  startDate: Joi.date().iso().optional(),
  dueDate: Joi.date().iso().allow(null).optional(),
  notes: Joi.string().trim().allow("").max(1000).default(""),
  archived: Joi.boolean().default(false)
});

export const updateGoalSchema = createGoalSchema;

export const goalParamSchema = Joi.object({
  goalId: Joi.string().trim().hex().length(24).required()
});
