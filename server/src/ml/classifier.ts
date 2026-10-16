import { NBModel, Prediction, predict } from "./naiveBayes";
import modelJson from "./model.json";

const model = modelJson as unknown as NBModel;

export const MODEL_VERSION = model.version;

export function classify(text: string): Prediction {
  return predict(model, text);
}

// Wording rule from the brief: a prediction is a suggestion, never a confirmed assignment
export function suggestionLabel(p: Prediction): string {
  return p.department
    ? `Suggested: ${p.department}, subject to review`
    : "No confident suggestion, sent for manual review";
}
