const defaultSleep = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs));

export async function waitForPositionMargin({
  readSnapshot,
  minimumMarginRaw = 0n,
  attempts = 4,
  delayMs = 750,
  sleep = defaultSleep,
}) {
  let snapshot = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    snapshot = await readSnapshot();
    if (!minimumMarginRaw || snapshot.position.margin >= minimumMarginRaw) {
      return { snapshot, observed: true };
    }
    if (attempt + 1 < attempts) await sleep(delayMs);
  }
  return { snapshot, observed: false };
}
