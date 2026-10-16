import { describe, it, expect } from "vitest";
import {
  DUPLICATE_THRESHOLD,
  DupCandidate,
  findDuplicates,
} from "../ml/similarity";

const wifi: DupCandidate = {
  id: "1",
  publicId: "SR-000001",
  title: "Lab 204 Wi-Fi is down",
  description: "No internet in computer lab 204 since this morning.",
  building: "Main Block",
  room: "Lab 204",
  predictedDepartment: "IT Support",
};

describe("duplicate detection", () => {
  it("catches Journey B: same outage, different wording", () => {
    const matches = findDuplicates(
      {
        title: "No internet in computer lab 204",
        description:
          "There is no internet connection in computer lab 204 for all students.",
        building: "Main Block",
        room: "Computer Lab 204",
        predictedDepartment: "IT Support",
      },
      [wifi],
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].publicId).toBe("SR-000001");
    expect(matches[0].score).toBeGreaterThanOrEqual(DUPLICATE_THRESHOLD);
  });

  it("still matches when the new issue's department is unknown", () => {
    const matches = findDuplicates(
      {
        title: "No internet in computer lab 204",
        description:
          "There is no internet connection in computer lab 204 for all students.",
        building: "Main Block",
        room: "Computer Lab 204",
        predictedDepartment: null,
      },
      [wifi],
    );
    expect(matches).toHaveLength(1);
  });

  it("does not match an unrelated Facilities complaint", () => {
    const matches = findDuplicates(
      {
        title: "Water leak in corridor",
        description: "Water is dripping from the ceiling near the staircase.",
        building: "Main Block",
        room: "Corridor 2",
        predictedDepartment: "Facilities",
      },
      [wifi],
    );
    expect(matches).toEqual([]);
  });

  it("does not match a different IT issue elsewhere", () => {
    const matches = findDuplicates(
      {
        title: "Printer not responding",
        description:
          "Printer in the computer centre is not responding to print jobs.",
        building: "Library",
        room: "Computer centre",
        predictedDepartment: "IT Support",
      },
      [wifi],
    );
    expect(matches).toEqual([]);
  });

  it("returns at most three suggestions", () => {
    const many = Array.from({ length: 5 }, (_, i) => ({
      ...wifi,
      id: String(i),
      publicId: `SR-00000${i + 1}`,
    }));
    expect(findDuplicates(wifi, many)).toHaveLength(3);
  });

  it("exposes only a safe summary", () => {
    const [m] = findDuplicates(wifi, [
      { ...wifi, id: "2", publicId: "SR-000002" },
    ]);
    expect(m).not.toHaveProperty("description");
    expect(m).not.toHaveProperty("reporterId");
    expect(m).not.toHaveProperty("email");
    expect(m.reasons.length).toBeGreaterThan(0);
  });
});
