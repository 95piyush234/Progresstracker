import mongoose from "mongoose";

const goalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    description: {
      type: String,
      default: "",
      maxlength: 500
    },
    category: {
      type: String,
      default: "General",
      trim: true,
      maxlength: 60
    },
    createdBy: {
      type: String,
      default: "You",
      trim: true,
      maxlength: 80
    },
    itemName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120
    },
    goalType: {
      type: String,
      default: "Target progress",
      trim: true,
      maxlength: 60
    },
    unitType: {
      type: String,
      default: "custom",
      trim: true,
      maxlength: 30
    },
    startValue: {
      type: Number,
      default: 0,
      min: 0
    },
    unit: {
      type: String,
      default: "units",
      trim: true,
      maxlength: 30
    },
    icon: {
      type: String,
      default: "",
      trim: true,
      maxlength: 20
    },
    customFields: {
      type: [
        new mongoose.Schema(
          {
            label: {
              type: String,
              trim: true,
              maxlength: 40,
              default: ""
            },
            value: {
              type: String,
              trim: true,
              maxlength: 120,
              default: ""
            }
          },
          { _id: false }
        )
      ],
      default: []
    },
    targetValue: {
      type: Number,
      required: true,
      min: 1
    },
    currentValue: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ["active", "completed", "paused"],
      default: "active"
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium"
    },
    color: {
      type: String,
      default: "#7c3aed"
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    dueDate: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      default: "",
      maxlength: 1000
    },
    archived: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

goalSchema.index({ user: 1, status: 1 });
goalSchema.index({ user: 1, category: 1 });
goalSchema.index({ user: 1, archived: 1 });
goalSchema.index({ user: 1, updatedAt: -1 });

export const Goal = mongoose.model("Goal", goalSchema);
