import { describe, it, expect } from "vitest";
import { detectEmergency } from "../domain/emergency";
import { canViewIssue } from "../domain/access";

describe("emergency guidance", () => {
  it("triggers on the hazard flag", () =>
    expect(detectEmergency("Broken chair", true)).not.toBeNull());
  it("triggers on danger words", () =>
    expect(
      detectEmergency("Sparks coming from the socket", false),
    ).not.toBeNull());
  it("stays quiet for ordinary issues", () =>
    expect(detectEmergency("Lab 204 Wi-Fi is down", false)).toBeNull());
});

describe("canViewIssue", () => {
  const issue = { reporterId: "r1", departmentId: "d1" };
  it("lets a reporter see only their own issue", () => {
    expect(
      canViewIssue({ id: "r1", role: "REPORTER", departmentId: null }, issue),
    ).toBe(true);
    expect(
      canViewIssue({ id: "r2", role: "REPORTER", departmentId: null }, issue),
    ).toBe(false);
  });
  it("limits staff to their own department", () => {
    expect(
      canViewIssue({ id: "s1", role: "STAFF", departmentId: "d1" }, issue),
    ).toBe(true);
    expect(
      canViewIssue({ id: "s2", role: "STAFF", departmentId: "d2" }, issue),
    ).toBe(false);
  });
  it("blocks staff on an unrouted issue", () =>
    expect(
      canViewIssue(
        { id: "s1", role: "STAFF", departmentId: "d1" },
        { reporterId: "r1", departmentId: null },
      ),
    ).toBe(false));
  it("lets admins see everything", () =>
    expect(
      canViewIssue({ id: "a1", role: "ADMIN", departmentId: null }, issue),
    ).toBe(true));
});
