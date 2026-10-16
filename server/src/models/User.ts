import { Schema, model } from "mongoose";

export const ROLES = ["REPORTER", "STAFF", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

const userSchema = new Schema(
  {
    displayName: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true, default: "REPORTER" },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

userSchema.index({ role: 1, departmentId: 1, active: 1 });

export const User = model("User", userSchema);
