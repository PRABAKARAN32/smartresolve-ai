import { describe, it, expect } from "vitest";
import { chooseAssignee } from "../services/assignment";

const s = (id: string, departmentId: string, workload: number) => ({
  id,
  departmentId,
  workload,
});

describe("chooseAssignee", () => {
  it("picks the lowest workload", () => {
    expect(
      chooseAssignee([s("a", "d1", 3), s("b", "d1", 1), s("c", "d1", 2)], "d1"),
    ).toBe("b");
  });

  it("breaks ties with the lowest staff ID, deterministically", () => {
    const staff = [s("b", "d1", 1), s("a", "d1", 1)];
    expect(chooseAssignee(staff, "d1")).toBe("a");
    expect(chooseAssignee([...staff].reverse(), "d1")).toBe("a");
  });

  it("never picks staff from another department, even with a lower workload", () => {
    const staff = [s("it1", "d-it", 0), s("fac1", "d-fac", 5)];
    expect(chooseAssignee(staff, "d-fac")).toBe("fac1");
  });

  it("returns null when nobody is eligible", () => {
    expect(chooseAssignee([], "d1")).toBeNull();
    expect(chooseAssignee([s("it1", "d-it", 0)], "d-fac")).toBeNull();
  });
});
