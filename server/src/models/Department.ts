import { Schema, model } from "mongoose";

export const DEPARTMENT_NAMES = [
  "IT Support",
  "Facilities",
  "Administration",
] as const;
export type DepartmentName = (typeof DEPARTMENT_NAMES)[number];

const departmentSchema = new Schema(
  {
    name: {
      type: String,
      enum: DEPARTMENT_NAMES,
      required: true,
      unique: true,
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Department = model("Department", departmentSchema);
