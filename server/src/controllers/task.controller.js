import { DailyTask } from "../models/DailyTask.js";
import { Goal } from "../models/Goal.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess } from "../utils/response.js";

function mapTask(task) {
  return {
    id: task._id.toString(),
    goal: task.goal?._id ? {
      id: task.goal._id.toString(),
      title: task.goal.title
    } : task.goal ? { id: task.goal.toString() } : null,
    title: task.title,
    description: task.description,
    date: task.date.toISOString(),
    completed: task.completed,
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
    priority: task.priority,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString()
  };
}

function buildTaskFilter(userId, query) {
  const filter = { user: userId };

  if (query.date) {
    const date = new Date(query.date);
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    filter.date = { $gte: start, $lte: end };
  }

  if (query.status === "completed") {
    filter.completed = true;
  } else if (query.status === "pending") {
    filter.completed = false;
  }

  if (query.priority) {
    filter.priority = query.priority;
  }

  if (query.goalId) {
    filter.goal = query.goalId;
  }

  return filter;
}

export async function listTasks(req, res) {
  const query = req.validatedQuery || req.query;
  const filter = buildTaskFilter(req.user._id, query);
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const skip = (page - 1) * limit;
  const direction = query.sortOrder === "desc" ? -1 : 1;
  const sort = { [query.sortBy || "date"]: direction };

  const [total, tasks] = await Promise.all([
    DailyTask.countDocuments(filter),
    DailyTask.find(filter).populate("goal", "title").sort(sort).skip(skip).limit(limit)
  ]);

  sendSuccess(res, {
    message: "Tasks loaded.",
    data: {
      tasks: tasks.map(mapTask)
    },
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  });
}

export async function createTask(req, res) {
  let goal = null;
  if (req.body.goal) {
    goal = await Goal.findOne({ _id: req.body.goal, user: req.user._id });
    if (!goal) {
      throw new ApiError(404, "Linked goal not found.");
    }
  }

  const task = await DailyTask.create({
    user: req.user._id,
    goal: goal?._id || null,
    title: req.body.title,
    description: req.body.description,
    date: new Date(req.body.date),
    completed: req.body.completed,
    completedAt: req.body.completed ? new Date() : null,
    priority: req.body.priority
  });

  const populated = await DailyTask.findById(task._id).populate("goal", "title");
  sendSuccess(res, {
    statusCode: 201,
    message: "Task created.",
    data: {
      task: mapTask(populated)
    }
  });
}

export async function updateTask(req, res) {
  const task = await DailyTask.findOne({
    _id: req.params.taskId,
    user: req.user._id
  });

  if (!task) {
    throw new ApiError(404, "Task not found.");
  }

  if (req.body.goal) {
    const goal = await Goal.findOne({ _id: req.body.goal, user: req.user._id });
    if (!goal) {
      throw new ApiError(404, "Linked goal not found.");
    }
    task.goal = goal._id;
  } else {
    task.goal = null;
  }

  task.title = req.body.title;
  task.description = req.body.description;
  task.date = new Date(req.body.date);
  task.priority = req.body.priority;
  task.completed = req.body.completed;
  task.completedAt = req.body.completed ? (task.completedAt || new Date()) : null;
  await task.save();

  const populated = await DailyTask.findById(task._id).populate("goal", "title");
  sendSuccess(res, {
    message: "Task updated.",
    data: {
      task: mapTask(populated)
    }
  });
}

export async function toggleTask(req, res) {
  const task = await DailyTask.findOne({
    _id: req.params.taskId,
    user: req.user._id
  }).populate("goal", "title");

  if (!task) {
    throw new ApiError(404, "Task not found.");
  }

  task.completed = !task.completed;
  task.completedAt = task.completed ? new Date() : null;
  await task.save();

  sendSuccess(res, {
    message: "Task toggled.",
    data: {
      task: mapTask(task)
    }
  });
}

export async function deleteTask(req, res) {
  const task = await DailyTask.findOneAndDelete({
    _id: req.params.taskId,
    user: req.user._id
  });

  if (!task) {
    throw new ApiError(404, "Task not found.");
  }

  sendSuccess(res, {
    message: "Task deleted."
  });
}
