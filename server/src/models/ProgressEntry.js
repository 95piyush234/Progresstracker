import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      default: ""
    },
    filename: {
      type: String,
      default: ""
    },
    mimetype: {
      type: String,
      default: ""
    },
    size: {
      type: Number,
      default: 0
    }
  },
  { _id: false }
);

const progressEntrySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    goal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Goal",
      required: true,
      index: true
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyTask",
      default: null
    },
    value: {
      type: Number,
      required: true
    },
    note: {
      type: String,
      default: "",
      maxlength: 500
    },
    tag: {
      type: String,
      default: "",
      maxlength: 80
    },
    system: {
      type: Boolean,
      default: false
    },
    entryDate: {
      type: Date,
      required: true,
      index: true
    },
    attachment: {
      type: attachmentSchema,
      default: () => ({})
    }
  },
  { timestamps: true }
);

progressEntrySchema.index({ user: 1, createdAt: -1 });
progressEntrySchema.index({ user: 1, goal: 1, entryDate: -1 });

export const ProgressEntry = mongoose.model("ProgressEntry", progressEntrySchema);
