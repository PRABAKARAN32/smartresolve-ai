import { tokenize } from "./text";

export interface DupInput {
  title: string;
  description: string;
  building: string;
  room: string;
  predictedDepartment: string | null;
}
export interface DupCandidate extends DupInput {
  id: string;
  publicId: string;
}
export interface DupMatch {
  id: string;
  publicId: string;
  title: string;
  building: string;
  room: string;
  score: number;
  textSimilarity: number;
  reasons: string[];
}

export const DUPLICATE_THRESHOLD = 0.55; // initial value; document any tuning
export const MAX_SUGGESTIONS = 3;
const SAME_ROOM_BONUS = 0.15;
const SAME_BUILDING_BONUS = 0.05;

// Applied after stemming. A Map avoids prototype keys like "constructor".
const SYNONYMS = new Map<string, string>(
  Object.entries({
    wifi: "network",
    internet: "network",
    connection: "network",
    connectivity: "network",
    broadband: "network",
    lan: "network",
    pc: "computer",
    desktop: "computer",
  }),
);

function tokens(text: string): string[] {
  return tokenize(text).map((t) => SYNONYMS.get(t) ?? t);
}

function vectors(docs: string[][]): Map<string, number>[] {
  const N = docs.length;
  const df = new Map<string, number>();
  for (const d of docs)
    for (const t of new Set(d)) df.set(t, (df.get(t) ?? 0) + 1);

  return docs.map((d) => {
    const tf = new Map<string, number>();
    for (const t of d) tf.set(t, (tf.get(t) ?? 0) + 1);
    const v = new Map<string, number>();
    for (const [t, n] of tf)
      v.set(t, n * (Math.log((N + 1) / ((df.get(t) ?? 0) + 1)) + 1));
    return v;
  });
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [t, w] of a) {
    na += w * w;
    const o = b.get(t);
    if (o) dot += w * o;
  }
  for (const w of b.values()) nb += w * w;
  return na === 0 || nb === 0 ? 0 : dot / Math.sqrt(na * nb);
}

const digits = (s: string) => (s.match(/\d+/g) ?? []).join("-");
const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function sameRoom(a: string, b: string): boolean {
  const da = digits(a);
  const db = digits(b);
  if (da && db) return da === db; // "Lab 204" and "Computer Lab 204"
  return normalise(a) === normalise(b);
}

const compatible = (a: string | null, b: string | null) =>
  a === null || b === null || a === b;
const round3 = (x: number) => Math.round(x * 1000) / 1000;

export function findDuplicates(
  input: DupInput,
  candidates: DupCandidate[],
  threshold: number = DUPLICATE_THRESHOLD,
): DupMatch[] {
  const eligible = candidates.filter((c) =>
    compatible(input.predictedDepartment, c.predictedDepartment),
  );
  if (eligible.length === 0) return [];

  const docs = [input, ...eligible].map((x) =>
    tokens(`${x.title}. ${x.description}`),
  );
  const vecs = vectors(docs);

  const matches: DupMatch[] = [];
  eligible.forEach((c, i) => {
    const text = cosine(vecs[0], vecs[i + 1]);
    const sameBuilding = c.building === input.building;
    const roomMatch = sameBuilding && sameRoom(c.room, input.room);

    let bonus = 0;
    const reasons = [`Text similarity ${Math.round(text * 100)}%`];
    if (roomMatch) {
      bonus = SAME_ROOM_BONUS;
      reasons.push("Same building and room");
    } else if (sameBuilding) {
      bonus = SAME_BUILDING_BONUS;
      reasons.push("Same building");
    }
    if (c.predictedDepartment)
      reasons.push(`Same suggested department: ${c.predictedDepartment}`);

    const score = Math.min(1, text + bonus);
    if (score >= threshold) {
      matches.push({
        id: c.id,
        publicId: c.publicId,
        title: c.title,
        building: c.building,
        room: c.room,
        score: round3(score),
        textSimilarity: round3(text),
        reasons,
      });
    }
  });

  return matches
    .sort((a, b) => b.score - a.score || a.publicId.localeCompare(b.publicId))
    .slice(0, MAX_SUGGESTIONS);
}
