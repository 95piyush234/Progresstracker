import Joi from "joi";

const attachmentSchema = Joi.object({
  url: Joi.string().uri().required(),
  filename: Joi.string().trim().max(200).allow("").default(""),
  mimetype: Joi.string().trim().max(120).allow("").default(""),
  size: Joi.number().min(0).default(0)
}).optional();

export const progressQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(12),
  goalId: Joi.string().trim().hex().length(24).optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
  sortBy: Joi.string().valid("entryDate", "createdAt", "value").default("entryDate"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc")
});

export const createProgressSchema = Joi.object({
  goal: Joi.string().trim().hex().length(24).required(),
  task: Joi.string().trim().hex().length(24).allow(null, "").optional(),
  value: Joi.number().required(),
  note: Joi.string().trim().allow("").max(500).default(""),
  tag: Joi.string().trim().allow("").max(80).default(""),
  system: Joi.boolean().default(false),
  entryDate: Joi.date().iso().required(),
  attachment: attachmentSchema
});

export const updateProgressSchema = createProgressSchema;

export const progressParamSchema = Joi.object({
  entryId: Joi.string().trim().hex().length(24).required()
});
