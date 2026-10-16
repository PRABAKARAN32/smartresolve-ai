import { describe, it, expect } from "vitest";
import { Issue } from "../models/Issue";
import { User } from "../models/User";

const base = {
  publicId: "SR-000001",
  reporterId: "507f1f77bcf86cd799439011",
  title: "Lab 204 Wi-Fi is down",
  description:
    "The Wi-Fi in computer lab 204 has been down since this morning.",
  building: "Main Block",
  room: "Lab 204",
  urgency: "HIGH",
  affectedCount: 35,
  priority: "P2",
  priorityScore: 9,
};

describe("Issue schema", () => {
  it("accepts a valid issue", () => {
    expect(new Issue(base).validateSync()).toBeUndefined();
  });
  it("rejects a short description and a bad count", () => {
    const err = new Issue({
      ...base,
      description: "too short",
      affectedCount: 0,
    }).validateSync();
    expect(err?.errors.description).toBeDefined();
    expect(err?.errors.affectedCount).toBeDefined();
  });
});

describe("User schema", () => {
  it("defaults role to REPORTER", () => {
    const u = new User({
      displayName: "A",
      email: "a@x.com",
      passwordHash: "h",
    });
    expect(u.role).toBe("REPORTER");
  });
});

describe("Issue schema", () => {
  it("accepts a valid issue", async () => {
    await new Issue(base).validate(); // throws if invalid
  });
  it("rejects a short description and a bad count", async () => {
    await expect(
      new Issue({
        ...base,
        description: "too short",
        affectedCount: 0,
      }).validate(),
    ).rejects.toThrow(/validation failed/i);
  });
});
