import { formatUnits } from "ethers";

export const absolutePositionSize = (value) => {
  const raw = BigInt(value ?? 0n);
  return raw < 0n ? -raw : raw;
};

export const closePresetSize = (rawSize, percent) => {
  const absoluteSize = absolutePositionSize(rawSize);
  const normalizedPercent = Math.max(0, Math.min(100, Math.trunc(percent)));
  const presetRaw = normalizedPercent === 100
    ? absoluteSize
    : (absoluteSize * BigInt(normalizedPercent)) / 100n;
  return { raw: presetRaw, formatted: formatUnits(presetRaw, 18) };
};

export const formatPositionSize = (rawSize) => {
  const exact = formatUnits(absolutePositionSize(rawSize), 18);
  const numeric = Number(exact);
  if (!Number.isFinite(numeric) || numeric === 0) return "0";
  if (numeric < 0.0001) return numeric.toPrecision(4);
  return numeric.toFixed(4);
};
