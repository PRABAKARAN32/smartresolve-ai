export type Urgency = "LOW" | "MEDIUM" | "HIGH";
export type PriorityLevel = "P1" | "P2" | "P3" | "P4";

export interface PriorityInput {
  urgency: Urgency;
  affectedCount: number;
  hazardFlag: boolean;
}

export interface PriorityResult {
  priority: PriorityLevel;
  score: number;
  factors: string[];
}

const URGENCY_POINTS: Record<Urgency, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

export function impactPoints(affectedCount: number): number {
  if (affectedCount <= 5) return 1;
  if (affectedCount <= 20) return 2;
  return 3;
}

export function computePriority(input: PriorityInput): PriorityResult {
  const urgency = URGENCY_POINTS[input.urgency];
  const impact = impactPoints(input.affectedCount);
  const score = 2 * urgency + impact + (input.hazardFlag ? 5 : 0);

  let priority: PriorityLevel;
  if (input.hazardFlag || score >= 11) priority = "P1";
  else if (score >= 8) priority = "P2";
  else if (score >= 5) priority = "P3";
  else priority = "P4";

  const factors = [
    `Urgency ${input.urgency}: 2 x ${urgency} = ${2 * urgency} points`,
    `Impact: ${input.affectedCount} affected people = ${impact} point${impact > 1 ? "s" : ""}`,
    input.hazardFlag
      ? "Safety hazard flagged: +5 points, priority forced to P1"
      : "No safety hazard flagged",
    `Total score ${score} gives ${priority}`,
  ];

  return { priority, score, factors };
}
