import mongoose from "mongoose";
import { connectDatabase } from "../src/config/db.js";
import { User } from "../src/models/User.js";
import { Goal } from "../src/models/Goal.js";
import { DailyTask } from "../src/models/DailyTask.js";
import { ProgressEntry } from "../src/models/ProgressEntry.js";

async function seed() {
  await connectDatabase();

  const email = "demo@progresstracker.local";
  const password = "DemoPass123";

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name: "Demo User",
      email,
      password,
      isVerified: true,
      role: "user",
      lastLoginAt: new Date()
    });
  } else {
    user.name = "Demo User";
    user.password = password;
    user.isVerified = true;
    user.role = "user";
    user.lastLoginAt = new Date();
    await user.save();
  }

  await Promise.all([
    Goal.deleteMany({ user: user._id }),
    DailyTask.deleteMany({ user: user._id }),
    ProgressEntry.deleteMany({ user: user._id })
  ]);

  const today = new Date();
  const day = (offset) => {
    const value = new Date(today);
    value.setDate(value.getDate() + offset);
    return value;
  };

  const [fitnessGoal, learningGoal, readingGoal] = await Goal.create([
    {
      user: user._id,
      title: "Workout Consistency",
      description: "Complete 20 focused workout sessions this quarter.",
      category: "Fitness",
      unit: "sessions",
      targetValue: 20,
      currentValue: 6,
      status: "active",
      priority: "high",
      color: "#06b6d4",
      startDate: day(-20),
      dueDate: day(45),
      notes: "Track short strength blocks and recovery sessions."
    },
    {
      user: user._id,
      title: "JavaScript Mastery",
      description: "Finish 40 structured study hours on advanced JavaScript and React.",
      category: "Learning",
      unit: "hours",
      targetValue: 40,
      currentValue: 14,
      status: "active",
      priority: "high",
      color: "#a855f7",
      startDate: day(-18),
      dueDate: day(30),
      notes: "Focus on async patterns, testing, and architecture."
    },
    {
      user: user._id,
      title: "Reading Habit",
      description: "Read 12 books this year with steady weekly progress.",
      category: "Reading",
      unit: "books",
      targetValue: 12,
      currentValue: 3,
      status: "active",
      priority: "medium",
      color: "#f59e0b",
      startDate: day(-60),
      dueDate: day(180),
      notes: "Aim for 20 pages most evenings."
    }
  ]);

  await DailyTask.create([
    {
      user: user._id,
      goal: fitnessGoal._id,
      title: "30 min strength session",
      description: "Upper body + light cardio finisher",
      date: day(0),
      completed: true,
      completedAt: new Date(),
      priority: "high"
    },
    {
      user: user._id,
      goal: learningGoal._id,
      title: "React hooks revision",
      description: "Review context patterns and useReducer",
      date: day(0),
      completed: false,
      priority: "medium"
    },
    {
      user: user._id,
      goal: readingGoal._id,
      title: "Read 20 pages",
      description: "Finish the current chapter tonight",
      date: day(0),
      completed: false,
      priority: "medium"
    }
  ]);

  await ProgressEntry.create([
    {
      user: user._id,
      goal: fitnessGoal._id,
      value: 2,
      note: "Two solid sessions this week.",
      entryDate: day(-4)
    },
    {
      user: user._id,
      goal: fitnessGoal._id,
      value: 4,
      note: "Momentum carried over from the previous week.",
      entryDate: day(-12)
    },
    {
      user: user._id,
      goal: learningGoal._id,
      value: 5,
      note: "Completed async JavaScript module.",
      entryDate: day(-9)
    },
    {
      user: user._id,
      goal: learningGoal._id,
      value: 9,
      note: "Shipped several practice apps and note reviews.",
      entryDate: day(-2)
    },
    {
      user: user._id,
      goal: readingGoal._id,
      value: 1,
      note: "Finished one short non-fiction book.",
      entryDate: day(-25)
    },
    {
      user: user._id,
      goal: readingGoal._id,
      value: 2,
      note: "Completed two books this month.",
      entryDate: day(-6)
    }
  ]);

  console.log("Demo data seeded successfully.");
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
