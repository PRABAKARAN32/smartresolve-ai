import { describe, it, expect } from "vitest";
import { computePriority, impactPoints } from "../domain/priority";

const p = (
  urgency: "LOW" | "MEDIUM" | "HIGH",
  affectedCount: number,
  hazardFlag = false,
) => computePriority({ urgency, affectedCount, hazardFlag });

describe("impact boundaries", () => {
  it.each([
    [1, 1],
    [5, 1],
    [6, 2],
    [20, 2],
    [21, 3],
    [500, 3],
  ])("%i people gives impact %i", (n, expected) =>
    expect(impactPoints(n)).toBe(expected),
  );
});

describe("priority boundaries", () => {
  it("score 3 is P4", () =>
    expect(p("LOW", 1)).toMatchObject({ score: 3, priority: "P4" }));
  it("score 4 is P4 (upper edge)", () =>
    expect(p("LOW", 6)).toMatchObject({ score: 4, priority: "P4" }));
  it("score 5 is P3 (lower edge)", () =>
    expect(p("LOW", 21)).toMatchObject({ score: 5, priority: "P3" }));
  it("score 7 is P3 (upper edge)", () =>
    expect(p("HIGH", 1)).toMatchObject({ score: 7, priority: "P3" }));
  it("score 8 is P2 (lower edge)", () =>
    expect(p("HIGH", 6)).toMatchObject({ score: 8, priority: "P2" }));
  it("score 9 is P2 (max without hazard)", () =>
    expect(p("HIGH", 35)).toMatchObject({ score: 9, priority: "P2" }));
});

describe("hazard override", () => {
  it("forces P1 even for a low score", () =>
    expect(p("LOW", 1, true)).toMatchObject({ score: 8, priority: "P1" }));
  it("adds 5 to the score", () => expect(p("HIGH", 35, true).score).toBe(14));
});

describe("determinism and explanation", () => {
  it("same input gives identical output", () =>
    expect(p("MEDIUM", 12)).toEqual(p("MEDIUM", 12)));
  it("lists contributing factors", () =>
    expect(p("HIGH", 35).factors.length).toBe(4));
});
