import { Goal } from "../models/Goal.js";
import { DailyTask } from "../models/DailyTask.js";
import { ProgressEntry } from "../models/ProgressEntry.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess } from "../utils/response.js";

function mapGoal(goal) {
  return {
    id: goal._id.toString(),
    title: goal.title,
    description: goal.description,
    category: goal.category,
    createdBy: goal.createdBy,
    itemName: goal.itemName,
    goalType: goal.goalType,
    unitType: goal.unitType,
    startValue: goal.startValue,
    unit: goal.unit,
    unitLabel: goal.unit,
    targetValue: goal.targetValue,
    currentValue: goal.currentValue,
    status: goal.status,
    priority: goal.priority,
    color: goal.color,
    icon: goal.icon,
    customFields: Array.isArray(goal.customFields) ? goal.customFields : [],
    startDate: goal.startDate ? goal.startDate.toISOString() : null,
    dueDate: goal.dueDate ? goal.dueDate.toISOString() : null,
    notes: goal.notes,
    archived: goal.archived,
    completedAt: goal.completedAt ? goal.completedAt.toISOString() : null,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString()
  };
}

function buildGoalFilter(userId, query) {
  const filter = { user: userId };

  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: "i" } },
      { category: { $regex: query.search, $options: "i" } },
      { description: { $regex: query.search, $options: "i" } }
    ];
  }

  if (query.category) {
    filter.category = query.category;
  }

  if (query.priority) {
    filter.priority = query.priority;
  }

  if (typeof query.archived === "boolean") {
    filter.archived = query.archived;
  }

  if (query.status && query.status !== "all") {
    filter.status = query.status;
  }

  return filter;
}

function buildGoalSort(query) {
  const direction = query.sortOrder === "asc" ? 1 : -1;
  return {
    [query.sortBy || "updatedAt"]: direction
  };
}

function applyGoalState(goal, payload) {
  goal.title = payload.title;
  goal.description = payload.description;
  goal.category = payload.category;
  goal.createdBy = payload.createdBy;
  goal.itemName = payload.itemName;
  goal.goalType = payload.goalType;
  goal.unitType = payload.unitType;
  goal.startValue = payload.startValue;
  goal.unit = payload.unit;
  goal.targetValue = payload.targetValue;
  goal.currentValue = payload.currentValue;
  goal.priority = payload.priority;
  goal.color = payload.color;
  goal.icon = payload.icon;
  goal.customFields = Array.isArray(payload.customFields) ? payload.customFields : [];
  goal.startDate = payload.startDate ? new Date(payload.startDate) : goal.startDate;
  goal.dueDate = payload.dueDate ? new Date(payload.dueDate) : null;
  goal.notes = payload.notes;
  goal.archived = payload.archived;

  if (payload.status === "completed" || goal.currentValue >= goal.targetValue) {
    goal.status = "completed";
    goal.completedAt = goal.completedAt || new Date();
  } else {
    goal.status = payload.status;
    goal.completedAt = null;
  }
}

export async function listGoals(req, res) {
  const query = req.validatedQuery || req.query;
  const filter = buildGoalFilter(req.user._id, query);
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 9;
  const skip = (page - 1) * limit;
  const sort = buildGoalSort(query);

  const [total, goals] = await Promise.all([
    Goal.countDocuments(filter),
    Goal.find(filter).sort(sort).skip(skip).limit(limit)
  ]);

  sendSuccess(res, {
    message: "Goals loaded.",
    data: {
      goals: goals.map(mapGoal)
    },
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  });
}

export async function getGoal(req, res) {
  const goal = await Goal.findOne({
    _id: req.params.goalId,
    user: req.user._id
  });

  if (!goal) {
    throw new ApiError(404, "Goal not found.");
  }

  sendSuccess(res, {
    message: "Goal loaded.",
    data: {
      goal: mapGoal(goal)
    }
  });
}

export async function createGoal(req, res) {
  const goal = new Goal({
    user: req.user._id
  });
  applyGoalState(goal, req.body);
  await goal.save();

  sendSuccess(res, {
    statusCode: 201,
    message: "Goal created.",
    data: {
      goal: mapGoal(goal)
    }
  });
}

export async function updateGoal(req, res) {
  const goal = await Goal.findOne({
    _id: req.params.goalId,
    user: req.user._id
  });

  if (!goal) {
    throw new ApiError(404, "Goal not found.");
  }

  applyGoalState(goal, req.body);
  await goal.save();

  sendSuccess(res, {
    message: "Goal updated.",
    data: {
      goal: mapGoal(goal)
    }
  });
}

export async function deleteGoal(req, res) {
  const goal = await Goal.findOneAndDelete({
    _id: req.params.goalId,
    user: req.user._id
  });

  if (!goal) {
    throw new ApiError(404, "Goal not found.");
  }

  await Promise.all([
    DailyTask.deleteMany({ goal: goal._id, user: req.user._id }),
    ProgressEntry.deleteMany({ goal: goal._id, user: req.user._id })
  ]);

  sendSuccess(res, {
    message: "Goal deleted."
  });
}
