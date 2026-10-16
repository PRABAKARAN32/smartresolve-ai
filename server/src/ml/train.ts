import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Example, NBModel, predict, trainNaiveBayes } from "./naiveBayes";
import { tokenize } from "./text";

interface Row extends Example {
  split: "train" | "test";
}

const ROOT = path.resolve(__dirname, "../../..");
const DATASET = path.join(ROOT, "seed/dataset.csv");
const MODEL_OUT = path.join(__dirname, "model.json");
const METRICS_OUT = path.join(__dirname, "metrics.json");
const REPORT_OUT = path.join(ROOT, "docs/ai-evaluation.md");

function loadDataset(raw: string): Row[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && !l.startsWith("text,label,split"))
    .map((line) => {
      const parts = line.split(",");
      const split = (parts.pop() ?? "").trim();
      const label = (parts.pop() ?? "").trim();
      const text = parts.join(",").trim().replace(/^"|"$/g, "");
      if (split !== "train" && split !== "test")
        throw new Error(`Bad split value in line: ${line}`);
      return { text, label, split };
    });
}

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : inter / union;
}

const raw = fs.readFileSync(DATASET, "utf8");
const rows = loadDataset(raw);
const train = rows.filter((r) => r.split === "train");
const test = rows.filter((r) => r.split === "test");
const classes = [...new Set(rows.map((r) => r.label))].sort();

// Dataset requirements from the brief
for (const c of classes) {
  const total = rows.filter((r) => r.label === c).length;
  const tests = test.filter((r) => r.label === c).length;
  if (total < 30 || tests < 10)
    throw new Error(
      `${c}: needs 30+ examples and 10+ test cases (has ${total} and ${tests})`,
    );
}
if (classes.length !== 3)
  throw new Error(`Expected 3 departments, found ${classes.length}`);

// Leakage check: flag test rows that are near-duplicates of a training row
const leaks = test
  .map((t) => {
    const tt = tokenize(t.text);
    const best = train.reduce(
      (m, r) => Math.max(m, jaccard(tt, tokenize(r.text))),
      0,
    );
    return { text: t.text, similarity: Math.round(best * 100) / 100 };
  })
  .filter((x) => x.similarity > 0.6);

const datasetRevision = crypto
  .createHash("sha256")
  .update(raw)
  .digest("hex")
  .slice(0, 8);
const model: NBModel = trainNaiveBayes(train, {
  version: `nb-${datasetRevision}`,
  datasetRevision,
});

// Evaluate on the held-out test set only
const cols = [...classes, "(none)"];
const matrix: Record<string, Record<string, number>> = {};
for (const c of classes)
  matrix[c] = Object.fromEntries(cols.map((k) => [k, 0]));

let correct = 0;
let routedToReview = 0;
const mistakes: {
  text: string;
  actual: string;
  predicted: string;
  confidence: number;
}[] = [];

for (const t of test) {
  const p = predict(model, t.text);
  const predicted = p.department ?? "(none)";
  matrix[t.label][predicted] += 1;
  if (predicted === t.label) correct += 1;
  else
    mistakes.push({
      text: t.text,
      actual: t.label,
      predicted,
      confidence: p.confidence,
    });
  if (p.routingState === "NEEDS_REVIEW") routedToReview += 1;
}

const perClass = classes.map((c) => {
  const tp = matrix[c][c];
  const fn = test.filter((t) => t.label === c).length - tp;
  const fp = classes
    .filter((o) => o !== c)
    .reduce((s, o) => s + matrix[o][c], 0);
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 =
    precision + recall === 0
      ? 0
      : (2 * precision * recall) / (precision + recall);
  return { class: c, precision, recall, f1, support: tp + fn };
});

const metrics = {
  modelVersion: model.version,
  datasetRevision,
  trainedAt: model.trainedAt,
  trainExamples: train.length,
  testExamples: test.length,
  accuracy: correct / test.length,
  routedToReviewOnTest: routedToReview,
  perClass,
  confusionMatrix: matrix,
  mistakes,
  possibleLeaks: leaks,
  params: model.params,
};

fs.writeFileSync(MODEL_OUT, JSON.stringify(model));
fs.writeFileSync(METRICS_OUT, JSON.stringify(metrics, null, 2));

// Human-readable evidence for the submission package
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const md = [
  "# AI Evaluation: Department Classifier",
  "",
  "All data is **synthetic** (fictional complaints written for this demo). Evaluation uses a held-out test split that the model never saw during training.",
  "",
  `- Model: multinomial Naive Bayes over TF-IDF weighted word counts (\`${model.version}\`)`,
  `- Training examples: ${train.length} | Held-out test examples: ${test.length}`,
  `- Overall accuracy on the held-out set: **${pct(metrics.accuracy)}** (${correct}/${test.length})`,
  `- Test cases that would go to manual review: ${routedToReview}/${test.length}`,
  `- Review rules (tunable, not calibrated): confidence < ${model.params.minConfidence}, top-2 margin < ${model.params.minMargin}, or fewer than ${model.params.minKnownTokens} recognised words`,
  "",
  "A small synthetic dataset cannot support a real-world reliability claim.",
  "",
  "## Per-class precision and recall",
  "",
  "| Department | Precision | Recall | F1 | Test cases |",
  "|---|---|---|---|---|",
  ...perClass.map(
    (p) =>
      `| ${p.class} | ${pct(p.precision)} | ${pct(p.recall)} | ${pct(p.f1)} | ${p.support} |`,
  ),
  "",
  "## Confusion matrix (rows = actual, columns = predicted)",
  "",
  `| Actual \\ Predicted | ${cols.join(" | ")} |`,
  `|---|${cols.map(() => "---").join("|")}|`,
  ...classes.map(
    (c) => `| ${c} | ${cols.map((k) => matrix[c][k]).join(" | ")} |`,
  ),
  "",
  "## Misclassified test cases",
  "",
  mistakes.length === 0
    ? "None."
    : mistakes
        .map(
          (m) =>
            `- "${m.text}": actual **${m.actual}**, predicted **${m.predicted}** (confidence ${pct(m.confidence)})`,
        )
        .join("\n"),
  "",
  "## Train/test leakage check",
  "",
  leaks.length === 0
    ? "No test case has a token-overlap (Jaccard) above 0.6 with any training case."
    : leaks.map((l) => `- "${l.text}" (similarity ${l.similarity})`).join("\n"),
  "",
].join("\n");

fs.mkdirSync(path.dirname(REPORT_OUT), { recursive: true });
fs.writeFileSync(REPORT_OUT, md);

console.log(
  `Dataset revision ${datasetRevision}: ${train.length} train, ${test.length} test`,
);
console.log(
  `Accuracy: ${pct(metrics.accuracy)} (${correct}/${test.length}); would go to review: ${routedToReview}`,
);
console.table(
  perClass.map((p) => ({
    class: p.class,
    precision: pct(p.precision),
    recall: pct(p.recall),
    f1: pct(p.f1),
    n: p.support,
  })),
);
console.log("Confusion matrix (rows actual, columns predicted):");
console.table(matrix);
if (mistakes.length) console.log("Mistakes:", mistakes);
if (leaks.length)
  console.warn("Possible leakage, rewrite these test rows:", leaks);
console.log(
  `Wrote ${path.relative(ROOT, MODEL_OUT)}, ${path.relative(ROOT, METRICS_OUT)}, ${path.relative(ROOT, REPORT_OUT)}`,
);
