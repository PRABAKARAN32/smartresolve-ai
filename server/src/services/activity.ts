import { Types } from "mongoose";
import { ActivityLog } from "../models/ActivityLog";

export async function logActivity(entry: {
  issueId: Types.ObjectId | string;
  actorId?: string | null; // null means SYSTEM
  action: string;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
}) {
  await ActivityLog.create({
    issueId: entry.issueId,
    actorId: entry.actorId ?? null,
    action: entry.action,
    before: entry.before ?? null,
    after: entry.after ?? null,
    reason: entry.reason ?? null,
  });
}
