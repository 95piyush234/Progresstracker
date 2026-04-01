import { Goal } from "../models/Goal.js";

function syncGoalCompletionState(goal) {
  if (goal.currentValue >= goal.targetValue) {
    goal.status = "completed";
    goal.completedAt = goal.completedAt || new Date();
    return;
  }

  if (goal.status === "completed") {
    goal.status = "active";
  }
  goal.completedAt = null;
}

export async function applyProgressDelta(goalId, delta) {
  if (!goalId) {
    return null;
  }

  const goal = await Goal.findById(goalId);
  if (!goal) {
    return null;
  }

  goal.currentValue = Number(goal.currentValue || 0) + Number(delta || 0);
  if (goal.currentValue < 0) {
    goal.currentValue = 0;
  }

  syncGoalCompletionState(goal);
  await goal.save();
  return goal;
}
