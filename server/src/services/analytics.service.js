import { DailyTask } from "../models/DailyTask.js";
import { Goal } from "../models/Goal.js";
import { ProgressEntry } from "../models/ProgressEntry.js";

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function formatDayKey(date) {
  return startOfDay(date).toISOString().slice(0, 10);
}

function buildSeriesMap(days) {
  return Array.from({ length: days }, (_, index) => {
    const date = startOfDay(Date.now() - (days - index - 1) * 24 * 60 * 60 * 1000);
    return {
      date,
      key: formatDayKey(date),
      value: 0,
      completedTasks: 0
    };
  });
}

function calculateStreak(uniqueDayKeys) {
  if (!uniqueDayKeys.length) {
    return { current: 0, longest: 0 };
  }

  const sorted = [...new Set(uniqueDayKeys)].sort();
  let longest = 1;
  let running = 1;

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = startOfDay(sorted[index - 1]).getTime();
    const current = startOfDay(sorted[index]).getTime();
    const difference = (current - previous) / (24 * 60 * 60 * 1000);
    if (difference === 1) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 1;
    }
  }

  let current = 0;
  const today = startOfDay(new Date());
  const keys = new Set(uniqueDayKeys);
  const cursor = new Date(today);
  while (keys.has(formatDayKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { current, longest };
}

export async function buildOverviewAnalytics(userId, rangeDays = 30) {
  const today = new Date();
  const rangeStart = startOfDay(Date.now() - (rangeDays - 1) * 24 * 60 * 60 * 1000);
  const rangeEnd = endOfDay(today);
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);

  const [goals, todayTasks, allTasksInRange, progressEntries, recentEntries] = await Promise.all([
    Goal.find({ user: userId, archived: false }).sort({ updatedAt: -1 }),
    DailyTask.find({ user: userId, date: { $gte: todayStart, $lte: todayEnd } }).sort({ createdAt: -1 }),
    DailyTask.find({
      user: userId,
      date: { $gte: rangeStart, $lte: rangeEnd },
      completed: true
    }),
    ProgressEntry.find({
      user: userId,
      entryDate: { $gte: rangeStart, $lte: rangeEnd }
    }).sort({ entryDate: 1 }),
    ProgressEntry.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("goal", "title unit color")
  ]);

  const goalCompletionCount = goals.filter((goal) => goal.status === "completed").length;
  const activeGoals = goals.filter((goal) => goal.status === "active").length;
  const dueSoonCount = goals.filter((goal) => goal.dueDate && new Date(goal.dueDate) >= todayStart && new Date(goal.dueDate) <= endOfDay(Date.now() + 7 * 24 * 60 * 60 * 1000)).length;
  const completedTasksToday = todayTasks.filter((task) => task.completed).length;

  const series = buildSeriesMap(rangeDays);
  const seriesMap = new Map(series.map((item) => [item.key, item]));

  for (const entry of progressEntries) {
    const key = formatDayKey(entry.entryDate);
    if (seriesMap.has(key)) {
      seriesMap.get(key).value += entry.value;
    }
  }

  for (const task of allTasksInRange) {
    const key = formatDayKey(task.date);
    if (seriesMap.has(key)) {
      seriesMap.get(key).completedTasks += 1;
    }
  }

  const activityDays = [
    ...progressEntries.map((entry) => formatDayKey(entry.entryDate)),
    ...allTasksInRange.map((task) => formatDayKey(task.date))
  ];
  const streak = calculateStreak(activityDays);

  const categoryBreakdown = goals.reduce((accumulator, goal) => {
    const existing = accumulator.get(goal.category) || { category: goal.category, count: 0, completed: 0 };
    existing.count += 1;
    if (goal.status === "completed") {
      existing.completed += 1;
    }
    accumulator.set(goal.category, existing);
    return accumulator;
  }, new Map());

  return {
    stats: {
      totalGoals: goals.length,
      activeGoals,
      completedGoals: goalCompletionCount,
      completionRate: goals.length ? Math.round((goalCompletionCount / goals.length) * 100) : 0,
      todayTasks: todayTasks.length,
      completedTasksToday,
      dueSoonCount,
      currentStreak: streak.current,
      longestStreak: streak.longest
    },
    dailySeries: series.map((item) => ({
      date: item.key,
      progressValue: Number(item.value.toFixed(2)),
      completedTasks: item.completedTasks
    })),
    categoryBreakdown: Array.from(categoryBreakdown.values()).sort((left, right) => right.count - left.count),
    recentEntries: recentEntries.map((entry) => ({
      id: entry._id.toString(),
      value: entry.value,
      note: entry.note,
      entryDate: entry.entryDate.toISOString(),
      createdAt: entry.createdAt.toISOString(),
      goal: entry.goal ? {
        id: entry.goal._id.toString(),
        title: entry.goal.title,
        unit: entry.goal.unit,
        color: entry.goal.color
      } : null
    }))
  };
}
