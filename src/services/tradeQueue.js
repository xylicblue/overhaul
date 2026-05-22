import { recordTrade } from "./api";

const QUEUE_KEY   = "bs_pending_trades";
const MAX_RETRIES = 3;
const DELAYS_MS   = [2000, 4000, 8000];

// ── localStorage helpers ─────────────────────────────────────────────────────

function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function setQueue(queue) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // storage full or unavailable — silently skip
  }
}

function enqueue(tradeData, vammData) {
  const queue = getQueue();
  queue.push({ tradeData, vammData, enqueuedAt: Date.now() });
  setQueue(queue);
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Record a trade with automatic retry. Falls back to localStorage queue if
 * all attempts fail so the record isn't permanently lost.
 */
export async function recordTradeWithRetry(tradeData, vammData) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await recordTrade(tradeData, vammData);
      return; // success — done
    } catch {
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, DELAYS_MS[attempt]));
      }
    }
  }
  // All retries exhausted — save locally for the next drain
  enqueue(tradeData, vammData);
}

/**
 * Drain the localStorage queue. Call once on app startup.
 * api-trade validates trades on-chain so no auth token is needed.
 * Returns the number of records successfully synced.
 */
export async function drainPendingTrades() {
  const queue = getQueue();
  if (queue.length === 0) return 0;

  let synced = 0;
  // Walk backwards so splice indices stay valid
  for (let i = queue.length - 1; i >= 0; i--) {
    const { tradeData, vammData } = queue[i];
    try {
      await recordTrade(tradeData, vammData);
      const fresh = getQueue();
      fresh.splice(i, 1);
      setQueue(fresh);
      synced++;
    } catch {
      // leave it for the next drain
    }
  }
  return synced;
}

export function getPendingTradeCount() {
  return getQueue().length;
}
