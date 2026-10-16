import { Types } from "mongoose";
import { Department, DepartmentName } from "../models/Department";
import { Issue } from "../models/Issue";
import { User } from "../models/User";

export interface StaffLoad {
  id: string;
  departmentId: string;
  workload: number; // issues currently ASSIGNED or IN_PROGRESS
}

// Lowest workload wins; ties go to the lowest ID. Staff from other departments are never considered.
export function chooseAssignee(
  staff: StaffLoad[],
  departmentId: string,
): string | null {
  const eligible = staff.filter((s) => s.departmentId === departmentId);
  if (eligible.length === 0) return null;
  eligible.sort(
    (a, b) =>
      a.workload - b.workload || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  return eligible[0].id;
}

export interface AssignmentResult {
  departmentId: string;
  assigneeId: string;
  assigneeName: string;
}

export async function autoAssign(
  departmentName: DepartmentName,
): Promise<AssignmentResult | null> {
  const dept = await Department.findOne({ name: departmentName, active: true });
  if (!dept) return null;

  const staff = await User.find({
    role: "STAFF",
    departmentId: dept._id,
    active: true,
  })
    .select("displayName departmentId")
    .lean();
  if (staff.length === 0) return null;

  const loads = await Issue.aggregate<{ _id: Types.ObjectId; n: number }>([
    {
      $match: {
        assigneeId: { $in: staff.map((s) => s._id) },
        status: { $in: ["ASSIGNED", "IN_PROGRESS"] },
      },
    },
    { $group: { _id: "$assigneeId", n: { $sum: 1 } } },
  ]);
  const load = new Map(loads.map((l) => [String(l._id), l.n]));

  const chosen = chooseAssignee(
    staff.map((s) => ({
      id: String(s._id),
      departmentId: String(s.departmentId),
      workload: load.get(String(s._id)) ?? 0,
    })),
    String(dept._id),
  );
  if (!chosen) return null;

  const person = staff.find((s) => String(s._id) === chosen);
  return {
    departmentId: String(dept._id),
    assigneeId: chosen,
    assigneeName: person?.displayName ?? "Staff",
  };
}
