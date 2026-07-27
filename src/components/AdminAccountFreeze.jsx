import React, { useEffect, useState } from "react";
import { supabase } from "../creatclient";
import { Search, Ban, ShieldCheck } from "lucide-react";

// Admin control to freeze / unfreeze a single account, with the audit log.
// Resolves a wallet address, username, or user id via admin_lookup_account, then
// calls admin_set_account_frozen (both is_admin-gated, security definer).
const shortAddr = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");
const fmtTime = (t) => (t ? new Date(t).toLocaleString() : "—");

export default function AdminAccountFreeze() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [reason, setReason] = useState("");
  const [log, setLog] = useState([]);
  const [err, setErr] = useState("");

  const loadLog = async () => {
    const { data, error } = await supabase.rpc("admin_account_freeze_log", { p_limit: 50 });
    if (!error) setLog(data || []);
  };
  useEffect(() => { loadLog(); }, []);

  const lookup = async (e) => {
    e?.preventDefault();
    setErr("");
    const { data, error } = await supabase.rpc("admin_lookup_account", { p_query: query.trim() });
    if (error) { setErr(error.message); setResults([]); return; }
    setResults(data || []);
  };

  const setFrozen = async (id, frozen) => {
    if (frozen && !window.confirm("Freeze this account? It will be signed out and blocked from trading.")) return;
    setBusyId(id);
    setErr("");
    const { error } = await supabase.rpc("admin_set_account_frozen", { p_user_id: id, p_frozen: frozen, p_reason: frozen ? (reason || null) : null });
    if (error) setErr(error.message);
    await lookup();
    await loadLog();
    setBusyId(null);
  };

  return (
    <div className="bg-surface-1 border border-line-subtle rounded-xl overflow-hidden mb-6">
      <div className="px-4 py-3 border-b border-line-subtle">
        <div className="text-[11px] font-bold uppercase tracking-widest text-ink-faint">Account Controls — Freeze / Unfreeze</div>
      </div>
      <div className="p-4">
        <form onSubmit={lookup} className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint w-3.5 h-3.5" />
            <input
              value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Wallet address, username, or user id"
              className="w-full bg-surface-2 border border-line rounded-md pl-8 pr-3 py-2 text-[12px] text-ink focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <button type="submit" className="px-3 py-2 rounded-md bg-surface-2 border border-line text-[12px] text-ink-muted hover:text-ink">Look up</button>
        </form>

        <input
          value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (recorded in the audit log when freezing)"
          className="w-full bg-surface-2 border border-line rounded-md px-3 py-2 text-[12px] text-ink focus:outline-none focus:border-blue-500/50 mb-3"
        />

        {err && <p className="text-[12px] text-down mb-2">{err}</p>}

        {results && results.length === 0 && <p className="text-[12px] text-ink-faint mb-2">No account matched.</p>}
        {results && results.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 p-3 mb-2 rounded-lg bg-surface-2/50 border border-line-subtle">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold text-ink">{r.username || shortAddr(r.wallet_address)}</span>
                {r.frozen
                  ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-down/10 text-down border border-down/30"><Ban size={10} /> Frozen</span>
                  : <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-up/10 text-up border border-up/30"><ShieldCheck size={10} /> Active</span>}
              </div>
              <div className="text-[10px] num text-ink-ghost mt-0.5">{shortAddr(r.wallet_address)} · {r.id.slice(0, 8)}…{r.frozen && r.frozen_reason ? ` · ${r.frozen_reason}` : ""}</div>
            </div>
            {r.frozen
              ? <button disabled={busyId === r.id} onClick={() => setFrozen(r.id, false)} className="shrink-0 px-3 py-1.5 rounded-md bg-surface-2 border border-up/30 text-up text-[11px] hover:bg-up/10 disabled:opacity-50">Unfreeze</button>
              : <button disabled={busyId === r.id} onClick={() => setFrozen(r.id, true)} className="shrink-0 px-3 py-1.5 rounded-md bg-surface-2 border border-down/30 text-down text-[11px] hover:bg-down/10 disabled:opacity-50">Freeze</button>}
          </div>
        ))}

        {log.length > 0 && (
          <div className="mt-4 pt-3 border-t border-line-subtle">
            <div className="text-[10px] font-bold uppercase tracking-widest text-ink-faint mb-2">Recent freeze actions</div>
            <div className="space-y-1">
              {log.slice(0, 8).map((l) => (
                <div key={l.id} className="flex items-center justify-between text-[11px]">
                  <span className={l.action === "freeze" ? "text-down" : "text-up"}>{l.action}</span>
                  <span className="num text-ink-faint">{l.user_id.slice(0, 8)}…</span>
                  <span className="text-ink-ghost truncate max-w-[40%]">{l.reason || "—"}</span>
                  <span className="num text-ink-ghost">{fmtTime(l.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
