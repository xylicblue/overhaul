import labels from "../config/agentLabels.json";

// Maps a simulator wallet address (any case) → its agent name, e.g. "mm-01".
// These are the testnet trading-agent wallets. The JSON is generated from the
// agent package: run `npm run export:labels` in ../agent to regenerate it when
// the fleet size or composition changes.
const MAP = labels;

/** Agent name for an address, or null if it's not a known simulator wallet. */
export function agentName(address) {
  if (!address) return null;
  return MAP[String(address).toLowerCase()] ?? null;
}
