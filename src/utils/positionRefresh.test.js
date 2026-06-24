import test from "node:test";
import assert from "node:assert/strict";
import { waitForPositionMargin } from "./positionRefresh.js";

test("position refresh stops when confirmed margin is observed", async () => {
  const margins = [10n, 15n, 20n];
  let reads = 0;
  const result = await waitForPositionMargin({
    readSnapshot: async () => ({ position: { margin: margins[reads++] } }),
    minimumMarginRaw: 15n,
    sleep: async () => {},
  });

  assert.equal(result.observed, true);
  assert.equal(result.snapshot.position.margin, 15n);
  assert.equal(reads, 2);
});

test("position refresh is bounded when an RPC remains stale", async () => {
  let reads = 0;
  const result = await waitForPositionMargin({
    readSnapshot: async () => {
      reads += 1;
      return { position: { margin: 10n } };
    },
    minimumMarginRaw: 20n,
    attempts: 3,
    sleep: async () => {},
  });

  assert.equal(result.observed, false);
  assert.equal(result.snapshot.position.margin, 10n);
  assert.equal(reads, 3);
});
