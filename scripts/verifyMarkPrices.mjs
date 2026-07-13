/**
 * Verifies the mark-price fix (add_mark_price_from_trades.sql).
 *
 * Uses the ANON key on purpose — that is exactly the access the chart has, so a
 * pass here means the chart itself will render current prices.
 *
 *   node scripts/verifyMarkPrices.mjs
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const MARKETS = ["H100-GPU-PERP", "B200-PERP-V2", "H200-PERP-V2", "T4-PERP", "A100-PERP"];
const hours = (ts) => (Date.now() - Date.parse(ts)) / 3.6e6;

let failures = 0;
console.log("now:", new Date().toISOString(), "\n");

for (const market of MARKETS) {
  // Newest trade the live indexer recorded (the truth).
  const { data: trade } = await sb
    .from("canonical_pnl_events")
    .select("execution_price, block_timestamp")
    .eq("market_name", market)
    .gt("execution_price", 0)
    .order("block_timestamp", { ascending: false })
    .limit(1);

  // Newest mark the chart would read.
  const { data: mark } = await sb
    .from("vamm_price_history")
    .select("price, timestamp")
    .eq("market", market)
    .order("timestamp", { ascending: false })
    .limit(1);

  const t = trade?.[0];
  const m = mark?.[0];
  if (!t) {
    console.log(`${market.padEnd(15)} no trades on record — skipping`);
    continue;
  }

  // The chart's newest mark should now match the newest trade.
  const matches = m && Math.abs(Number(m.price) - Number(t.execution_price)) < 1e-6
    && Math.abs(Date.parse(m.timestamp) - Date.parse(t.block_timestamp)) < 1000;
  if (!matches) failures++;

  console.log(
    `${matches ? "PASS" : "FAIL"}  ${market.padEnd(15)} ` +
    `chart=$${Number(m?.price ?? 0).toFixed(4)} @${m?.timestamp ?? "none"} (${m ? hours(m.timestamp).toFixed(1) : "—"}h) | ` +
    `lastTrade=$${Number(t.execution_price).toFixed(4)} @${t.block_timestamp}`,
  );
}

// The candle RPC the TradingView datafeed actually calls.
const { data: candles, error } = await sb.rpc("get_vamm_candles", {
  p_markets: ["T4-PERP"],
  p_bucket_seconds: 3600,
  p_from: null,
  p_to: null,
  p_max_bars: 5,
});
console.log("\nget_vamm_candles(T4-PERP, 1h) →", error ? `ERROR: ${error.message}` : `${candles.length} candles`);
for (const c of candles || []) {
  console.log(`  ${c.bucket_time}  O=${Number(c.open).toFixed(4)} H=${Number(c.high).toFixed(4)} L=${Number(c.low).toFixed(4)} C=${Number(c.close).toFixed(4)} n=${c.volume}`);
}
const newestCandle = candles?.[0]?.bucket_time;
if (!newestCandle || hours(newestCandle) > 24) {
  console.log("\nFAIL: newest candle is not recent.");
  failures++;
}

console.log(failures === 0 ? "\n✅ All markets charting current prices." : `\n❌ ${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
