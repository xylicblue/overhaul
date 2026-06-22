import test from "node:test";
import assert from "node:assert/strict";
import { parseUnits } from "ethers";
import { closePresetSize, formatPositionSize } from "./positionSize.js";

test("100 percent close preserves the exact raw dust position", () => {
  const positionRaw = parseUnits("0.000049123456789123", 18);
  const preset = closePresetSize(-positionRaw, 100);

  assert.equal(preset.raw, positionRaw);
  assert.equal(preset.formatted, "0.000049123456789123");
});

test("partial close presets are calculated with integer raw units", () => {
  const positionRaw = parseUnits("0.000049123456789123", 18);
  const preset = closePresetSize(positionRaw, 25);

  assert.equal(preset.raw, positionRaw / 4n);
});

test("dust positions are not displayed as zero", () => {
  const positionRaw = parseUnits("0.000049123456789123", 18);

  assert.notEqual(formatPositionSize(positionRaw), "0.0000");
  assert.notEqual(formatPositionSize(positionRaw), "0");
});
