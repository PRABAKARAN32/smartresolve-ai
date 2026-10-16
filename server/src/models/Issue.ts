import { Schema, model } from "mongoose";
import { DEPARTMENT_NAMES } from "./Department";

export const STATUSES = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
] as const;
export const URGENCIES = ["LOW", "MEDIUM", "HIGH"] as const;
export const PRIORITIES = ["P1", "P2", "P3", "P4"] as const;
export const ROUTING_STATES = ["CONFIDENT", "NEEDS_REVIEW"] as const;
export type Status = (typeof STATUSES)[number];

const issueSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true },
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, minlength: 5, maxlength: 120 },
    description: {
      type: String,
      required: true,
      minlength: 20,
      maxlength: 1000,
    },
    building: { type: String, required: true },
    room: { type: String, required: true, minlength: 2, maxlength: 80 },
    urgency: { type: String, enum: URGENCIES, required: true },
    affectedCount: {
      type: Number,
      required: true,
      min: 1,
      max: 500,
      validate: Number.isInteger,
    },
    hazardFlag: { type: Boolean, default: false },

    predictedDepartment: {
      type: String,
      enum: [...DEPARTMENT_NAMES, null],
      default: null,
    },
    predictionConfidence: { type: Number, default: null },
    routingState: {
      type: String,
      enum: ROUTING_STATES,
      default: "NEEDS_REVIEW",
    },

    priority: { type: String, enum: PRIORITIES, required: true },
    priorityScore: { type: Number, required: true },
    priorityFactors: { type: [String], default: [] },

    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      default: null,
      index: true,
    },
    assigneeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    status: { type: String, enum: STATUSES, default: "OPEN", index: true },

    firstResponseAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    resolutionNote: { type: String, default: null, maxlength: 1000 },
    duplicateLinkIds: {
      type: [Schema.Types.ObjectId],
      ref: "Issue",
      default: [],
    },
  },
  { timestamps: true },
);

issueSchema.index({ createdAt: -1 });

export const Issue = model("Issue", issueSchema);
