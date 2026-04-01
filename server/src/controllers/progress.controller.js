import { Goal } from "../models/Goal.js";
import { DailyTask } from "../models/DailyTask.js";
import { ProgressEntry } from "../models/ProgressEntry.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess } from "../utils/response.js";
import { applyProgressDelta } from "../services/progress.service.js";

function mapEntry(entry) {
  return {
    id: entry._id.toString(),
    goal: entry.goal?._id ? {
      id: entry.goal._id.toString(),
      title: entry.goal.title,
      unit: entry.goal.unit,
      color: entry.goal.color
    } : entry.goal ? { id: entry.goal.toString() } : null,
    task: entry.task?._id ? {
      id: entry.task._id.toString(),
      title: entry.task.title
    } : entry.task ? { id: entry.task.toString() } : null,
    value: entry.value,
    note: entry.note,
    tag: entry.tag || "",
    system: Boolean(entry.system),
    entryDate: entry.entryDate.toISOString(),
    attachment: entry.attachment || null,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString()
  };
}

function buildFilter(userId, query) {
  const filter = { user: userId };

  if (query.goalId) {
    filter.goal = query.goalId;
  }

  if (query.dateFrom || query.dateTo) {
    filter.entryDate = {};
    if (query.dateFrom) {
      filter.entryDate.$gte = new Date(query.dateFrom);
    }
    if (query.dateTo) {
      filter.entryDate.$lte = new Date(query.dateTo);
    }
  }

  return filter;
}

export async function listProgressEntries(req, res) {
  const query = req.validatedQuery || req.query;
  const filter = buildFilter(req.user._id, query);
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 12;
  const skip = (page - 1) * limit;
  const direction = query.sortOrder === "asc" ? 1 : -1;
  const sort = { [query.sortBy || "entryDate"]: direction };

  const [total, entries] = await Promise.all([
    ProgressEntry.countDocuments(filter),
    ProgressEntry.find(filter)
      .populate("goal", "title unit color")
      .populate("task", "title")
      .sort(sort)
      .skip(skip)
      .limit(limit)
  ]);

  sendSuccess(res, {
    message: "Progress entries loaded.",
    data: {
      entries: entries.map(mapEntry)
    },
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  });
}

export async function createProgressEntry(req, res) {
  const goal = await Goal.findOne({
    _id: req.body.goal,
    user: req.user._id
  });

  if (!goal) {
    throw new ApiError(404, "Linked goal not found.");
  }

  let task = null;
  if (req.body.task) {
    task = await DailyTask.findOne({
      _id: req.body.task,
      user: req.user._id
    });

    if (!task) {
      throw new ApiError(404, "Linked task not found.");
    }
  }

  const entry = await ProgressEntry.create({
    user: req.user._id,
    goal: goal._id,
    task: task?._id || null,
    value: req.body.value,
    note: req.body.note,
    tag: req.body.tag || "",
    system: Boolean(req.body.system),
    entryDate: new Date(req.body.entryDate),
    attachment: req.body.attachment || {}
  });

  const updatedGoal = await applyProgressDelta(goal._id, entry.value);
  const populated = await ProgressEntry.findById(entry._id).populate("goal", "title unit color").populate("task", "title");

  sendSuccess(res, {
    statusCode: 201,
    message: "Progress entry created.",
    data: {
      entry: mapEntry(populated),
      goal: updatedGoal ? {
        id: updatedGoal._id.toString(),
        currentValue: updatedGoal.currentValue,
        status: updatedGoal.status,
        completedAt: updatedGoal.completedAt ? updatedGoal.completedAt.toISOString() : null
      } : null
    }
  });
}

export async function updateProgressEntry(req, res) {
  const entry = await ProgressEntry.findOne({
    _id: req.params.entryId,
    user: req.user._id
  });

  if (!entry) {
    throw new ApiError(404, "Progress entry not found.");
  }

  const previousGoalId = entry.goal.toString();
  const previousValue = Number(entry.value || 0);
  const goal = await Goal.findOne({
    _id: req.body.goal,
    user: req.user._id
  });

  if (!goal) {
    throw new ApiError(404, "Linked goal not found.");
  }

  let task = null;
  if (req.body.task) {
    task = await DailyTask.findOne({
      _id: req.body.task,
      user: req.user._id
    });

    if (!task) {
      throw new ApiError(404, "Linked task not found.");
    }
  }

  entry.goal = goal._id;
  entry.task = task?._id || null;
  entry.value = req.body.value;
  entry.note = req.body.note;
  entry.tag = req.body.tag || "";
  entry.system = Boolean(req.body.system);
  entry.entryDate = new Date(req.body.entryDate);
  entry.attachment = req.body.attachment || {};
  await entry.save();

  let updatedGoal = null;
  if (previousGoalId === goal._id.toString()) {
    updatedGoal = await applyProgressDelta(goal._id, Number(req.body.value) - previousValue);
  } else {
    await applyProgressDelta(previousGoalId, -previousValue);
    updatedGoal = await applyProgressDelta(goal._id, Number(req.body.value));
  }
  const populated = await ProgressEntry.findById(entry._id).populate("goal", "title unit color").populate("task", "title");

  sendSuccess(res, {
    message: "Progress entry updated.",
    data: {
      entry: mapEntry(populated),
      goal: updatedGoal ? {
        id: updatedGoal._id.toString(),
        currentValue: updatedGoal.currentValue,
        status: updatedGoal.status,
        completedAt: updatedGoal.completedAt ? updatedGoal.completedAt.toISOString() : null
      } : null
    }
  });
}

export async function deleteProgressEntry(req, res) {
  const entry = await ProgressEntry.findOneAndDelete({
    _id: req.params.entryId,
    user: req.user._id
  });

  if (!entry) {
    throw new ApiError(404, "Progress entry not found.");
  }

  const updatedGoal = await applyProgressDelta(entry.goal, -entry.value);

  sendSuccess(res, {
    message: "Progress entry deleted.",
    data: {
      goal: updatedGoal ? {
        id: updatedGoal._id.toString(),
        currentValue: updatedGoal.currentValue,
        status: updatedGoal.status,
        completedAt: updatedGoal.completedAt ? updatedGoal.completedAt.toISOString() : null
      } : null
    }
  });
}
