import type { AuthUser } from "../middleware/auth";

export function canViewIssue(
  user: AuthUser,
  issue: { reporterId: unknown; departmentId?: unknown },
): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "REPORTER") return String(issue.reporterId) === user.id;
  if (user.role === "STAFF") {
    return (
      issue.departmentId != null &&
      user.departmentId !== null &&
      String(issue.departmentId) === user.departmentId
    );
  }
  return false;
}
