/**
 * Verifies the live 24h market stats RPC (add_market_stats_24h_rpc.sql).
 *
 * Uses the ANON key on purpose — that's exactly the access the trade page has,
 * so a pass here means the ticker bar and market switcher will show these numbers.
 *
 *   node scripts/verifyMarketStats.mjs
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const { data, error } = await sb.rpc("get_market_stats_24h");
if (error) {
  console.error("❌ RPC failed:", error.message);
  console.error("   (has add_market_stats_24h_rpc.sql been run in the SQL editor?)");
  process.exit(1);
}

console.log(`get_market_stats_24h() → ${data.length} markets with trades in the last 24h\n`);
const rows = [...data].sort((a, b) => Number(b.volume_24h_usd) - Number(a.volume_24h_usd));

let total = 0;
let nonZero = 0;
for (const s of rows) {
  const vol = Number(s.volume_24h_usd) || 0;
  const chg = Number(s.change_24h_percent) || 0;
  total += vol;
  if (vol > 0) nonZero++;
  console.log(
    `  ${String(s.market_name).padEnd(28)} vol=$${vol.toFixed(2).padStart(11)}  ` +
    `trades=${String(s.trades_24h).padStart(4)}  chg=${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%  ` +
    `px=${Number(s.current_price).toFixed(4)}  hi=${Number(s.high_24h).toFixed(4)} lo=${Number(s.low_24h).toFixed(4)}`,
  );
}
console.log(`\n  COMBINED 24h volume: $${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

// The old table, for contrast — this is what the UI was reading before.
const { data: old } = await sb.from("market_stats_24h").select("market_name, volume_24h_usd").limit(5);
console.log("\n  legacy market_stats_24h table (what the UI read before):");
for (const o of old || []) console.log(`    ${String(o.market_name).padEnd(28)} vol=$${o.volume_24h_usd}`);

if (nonZero === 0) {
  console.log("\n❌ Every market reports $0 volume — stats are not being derived.");
  process.exit(1);
}
console.log(`\n✅ ${nonZero} market(s) reporting real 24h volume.`);
