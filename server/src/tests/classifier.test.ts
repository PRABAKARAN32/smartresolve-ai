import { describe, it, expect } from "vitest";
import { tokenize } from "../ml/text";
import { classify } from "../ml/classifier";

describe("tokenize", () => {
  it("lowercases, strips punctuation, numbers and stopwords, and normalises wifi", () => {
    expect(tokenize("The Wi-Fi in Lab 204 is DOWN!")).toEqual([
      "wifi",
      "lab",
      "down",
    ]);
  });
});

describe("classifier on unseen text", () => {
  it("suggests IT Support", () => {
    const p = classify(
      "Projector and wifi down. The projector is not working and the wifi is down in the seminar hall.",
    );
    expect(p.department).toBe("IT Support");
  });
  it("suggests Facilities", () => {
    const p = classify(
      "Leak in washroom. Water is leaking from the ceiling and the tap is broken in the washroom.",
    );
    expect(p.department).toBe("Facilities");
  });
  it("suggests Administration", () => {
    const p = classify(
      "ID card correction. Please issue a certificate and correct the name on my ID card.",
    );
    expect(p.department).toBe("Administration");
  });
  it("sends an ambiguous report to manual review", () => {
    const p = classify(
      "Office problem. Nothing is working in the main office.",
    );
    expect(p.routingState).toBe("NEEDS_REVIEW");
  });
  it("is deterministic and returns probabilities that sum to 1", () => {
    const text =
      "Leak in washroom. Water is leaking from the ceiling and the tap is broken in the washroom.";
    const a = classify(text);
    expect(classify(text)).toEqual(a);
    const sum = Object.values(a.probabilities).reduce((x, y) => x + y, 0);
    expect(sum).toBeGreaterThan(0.999);
    expect(sum).toBeLessThan(1.001);
  });
});
