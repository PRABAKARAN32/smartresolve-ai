import { tokenize } from "./text";

export interface Example {
  text: string;
  label: string;
}

export interface NBParams {
  minConfidence: number; // below this, route to manual review (tunable, not calibrated)
  minMargin: number; // top-2 closer than this counts as a tie
  minKnownTokens: number; // fewer recognised words than this means insufficient detail
  alpha: number; // Laplace smoothing
}

export const DEFAULT_PARAMS: NBParams = {
  minConfidence: 0.65,
  minMargin: 0.15,
  minKnownTokens: 3,
  alpha: 1,
};

export interface NBModel {
  version: string;
  trainedAt: string;
  datasetRevision: string;
  trainingExamples: number;
  classes: string[];
  logPrior: Record<string, number>;
  idf: Record<string, number>;
  logLikelihood: Record<string, Record<string, number>>;
  params: NBParams;
}

export interface Prediction {
  department: string | null;
  confidence: number;
  probabilities: Record<string, number>;
  routingState: "CONFIDENT" | "NEEDS_REVIEW";
  reason: string;
  knownTokens: number;
}

function termCounts(tokens: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of tokens) m.set(t, (m.get(t) ?? 0) + 1);
  return m;
}

export function trainNaiveBayes(
  examples: Example[],
  meta: { version: string; datasetRevision: string },
  params: NBParams = DEFAULT_PARAMS,
): NBModel {
  const classes = [...new Set(examples.map((e) => e.label))].sort();
  const docs = examples.map((e) => ({
    label: e.label,
    counts: termCounts(tokenize(e.text)),
  }));
  const N = docs.length;

  const df = new Map<string, number>();
  for (const d of docs)
    for (const t of d.counts.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const vocab = [...df.keys()].sort();

  const idf: Record<string, number> = {};
  for (const t of vocab)
    idf[t] = Math.log((N + 1) / ((df.get(t) ?? 0) + 1)) + 1;

  const logPrior: Record<string, number> = {};
  const logLikelihood: Record<string, Record<string, number>> = {};

  for (const c of classes) {
    const classDocs = docs.filter((d) => d.label === c);
    logPrior[c] = Math.log(classDocs.length / N);

    const weight = new Map<string, number>();
    let total = 0;
    for (const d of classDocs) {
      for (const [t, n] of d.counts) {
        const w = n * idf[t];
        weight.set(t, (weight.get(t) ?? 0) + w);
        total += w;
      }
    }
    logLikelihood[c] = {};
    for (const t of vocab) {
      logLikelihood[c][t] = Math.log(
        ((weight.get(t) ?? 0) + params.alpha) /
          (total + params.alpha * vocab.length),
      );
    }
  }

  return {
    version: meta.version,
    trainedAt: new Date().toISOString(),
    datasetRevision: meta.datasetRevision,
    trainingExamples: N,
    classes,
    logPrior,
    idf,
    logLikelihood,
    params,
  };
}

const round4 = (x: number) => Math.round(x * 10000) / 10000;

export function predict(model: NBModel, text: string): Prediction {
  const counts = termCounts(tokenize(text));
  const known = [...counts.keys()].filter((t) => Object.hasOwn(model.idf, t));
  const uniform = Object.fromEntries(
    model.classes.map((c) => [c, round4(1 / model.classes.length)]),
  );

  if (known.length < model.params.minKnownTokens) {
    return {
      department: null,
      confidence: 0,
      probabilities: uniform,
      routingState: "NEEDS_REVIEW",
      reason: `Only ${known.length} recognisable word(s) found, which is not enough detail to suggest a department`,
      knownTokens: known.length,
    };
  }

  const scores = model.classes.map((c) => {
    let s = model.logPrior[c];
    for (const t of known)
      s += (counts.get(t) as number) * model.idf[t] * model.logLikelihood[c][t];
    return s;
  });
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0);

  const ranked = model.classes
    .map((c, i) => ({ c, p: exps[i] / sum }))
    .sort((a, b) => b.p - a.p || a.c.localeCompare(b.c));
  const [top, second] = ranked;

  const probabilities = Object.fromEntries(
    ranked.map((r) => [r.c, round4(r.p)]),
  );
  let routingState: Prediction["routingState"] = "CONFIDENT";
  let reason = `Confidence ${(top.p * 100).toFixed(0)}% meets the ${(model.params.minConfidence * 100).toFixed(0)}% review threshold`;

  if (top.p < model.params.minConfidence) {
    routingState = "NEEDS_REVIEW";
    reason = `Confidence ${(top.p * 100).toFixed(0)}% is below the ${(model.params.minConfidence * 100).toFixed(0)}% review threshold`;
  } else if (top.p - second.p < model.params.minMargin) {
    routingState = "NEEDS_REVIEW";
    reason = `${top.c} and ${second.c} are too close to call`;
  }

  return {
    department: top.c,
    confidence: round4(top.p),
    probabilities,
    routingState,
    reason,
    knownTokens: known.length,
  };
}
