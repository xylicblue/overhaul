import test from "node:test";
import assert from "node:assert/strict";
import { calculateEntityRisk, entityRiskBand } from "./entityRisk.js";

const workedExample = {
  isic: 2,
  sourceOfFunds: 1,
  ownership: 3,
  geography: 1,
  wallet: 2,
};

test("matches the workbook worked example", () => {
  assert.deepEqual(calculateEntityRisk({ scores: workedExample }), {
    weightedScore: 1.7,
    effectiveScore: 1.7,
    calculatedBand: "low",
    finalBand: "low",
    decision: "compliance_review",
    eddRequired: false,
    reviewIntervalMonths: 18,
  });
});

test("uses the workbook's stated upper bounds without leaving decimal gaps", () => {
  assert.equal(entityRiskBand(3.3), "low");
  assert.equal(entityRiskBand(3.35), "medium");
  assert.equal(entityRiskBand(6.7), "medium");
  assert.equal(entityRiskBand(6.75), "high");
});

test("a force-high gate retains the number and routes to EDD", () => {
  const result = calculateEntityRisk({ scores: workedExample, hasForceHighGate: true });
  assert.equal(result.weightedScore, 1.7);
  assert.equal(result.finalBand, "high");
  assert.equal(result.decision, "enhanced_due_diligence");
  assert.equal(result.reviewIntervalMonths, 6);
});

test("a block gate has precedence over every rating override", () => {
  const result = calculateEntityRisk({
    scores: workedExample,
    hasBlockGate: true,
    hasForceHighGate: true,
    isTier3: true,
  });
  assert.equal(result.finalBand, null);
  assert.equal(result.decision, "blocked");
  assert.equal(result.eddRequired, false);
  assert.equal(result.reviewIntervalMonths, null);
});

test("Tier 3 requires EDD without changing the numerical rating", () => {
  const result = calculateEntityRisk({ scores: workedExample, isTier3: true });
  assert.equal(result.finalBand, "low");
  assert.equal(result.decision, "enhanced_due_diligence");
  assert.equal(result.eddRequired, true);
});

test("manual score overrides are bounded and require a reason", () => {
  assert.throws(
    () => calculateEntityRisk({ scores: workedExample, manualScore: 7 }),
    /reason is required/i,
  );
  const result = calculateEntityRisk({
    scores: workedExample,
    manualScore: 7,
    manualOverrideReason: "Documented Compliance adjustment",
  });
  assert.equal(result.weightedScore, 1.7);
  assert.equal(result.effectiveScore, 7);
  assert.equal(result.finalBand, "high");
  assert.equal(result.eddRequired, true);
});
