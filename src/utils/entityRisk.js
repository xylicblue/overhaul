export const ENTITY_RISK_WEIGHTS = Object.freeze({
  isic: 0.25,
  sourceOfFunds: 0.15,
  ownership: 0.15,
  geography: 0.30,
  wallet: 0.15,
});

const SCORE_KEYS = Object.keys(ENTITY_RISK_WEIGHTS);

function validScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score) || score < 0 || score > 10) {
    throw new RangeError("Risk factor scores must be between 0 and 10.");
  }
  return score;
}

export function entityRiskBand(score) {
  const value = validScore(score);
  if (value <= 3.3) return "low";
  if (value <= 6.7) return "medium";
  return "high";
}

export function calculateEntityRisk({
  scores,
  hasBlockGate = false,
  hasForceHighGate = false,
  isTier3 = false,
  manualScore = null,
  manualOverrideReason = null,
}) {
  const normalizedScores = Object.fromEntries(
    SCORE_KEYS.map((key) => [key, validScore(scores?.[key])]),
  );
  const weightedScore = Number(SCORE_KEYS.reduce(
    (total, key) => total + normalizedScores[key] * ENTITY_RISK_WEIGHTS[key],
    0,
  ).toFixed(2));

  if (manualScore != null && !String(manualOverrideReason || "").trim()) {
    throw new Error("A reason is required when Compliance overrides the computed score.");
  }
  const effectiveScore = manualScore == null ? weightedScore : validScore(manualScore);
  const calculatedBand = entityRiskBand(effectiveScore);
  const finalBand = hasBlockGate ? null : hasForceHighGate ? "high" : calculatedBand;
  const eddRequired = !hasBlockGate && (hasForceHighGate || finalBand === "high" || isTier3);

  return {
    weightedScore,
    effectiveScore,
    calculatedBand,
    finalBand,
    decision: hasBlockGate
      ? "blocked"
      : eddRequired
        ? "enhanced_due_diligence"
        : "compliance_review",
    eddRequired,
    reviewIntervalMonths: hasBlockGate
      ? null
      : finalBand === "low"
        ? 18
        : finalBand === "medium"
          ? 12
          : 6,
  };
}
