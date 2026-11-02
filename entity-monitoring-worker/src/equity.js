const WAD = 10n ** 18n;

export function effectivePositionMargin(notionalX18, marginRatioX18) {
  return (BigInt(notionalX18) * BigInt(marginRatioX18)) / WAD;
}

export function aggregateAccountEquity(freeCollateralX18, positions = []) {
  return positions.reduce(
    (total, position) => total + effectivePositionMargin(position.notionalX18, position.marginRatioX18),
    BigInt(freeCollateralX18),
  );
}
