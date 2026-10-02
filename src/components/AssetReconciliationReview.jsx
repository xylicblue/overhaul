import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Database, RefreshCw, ShieldCheck, X } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../creatclient";

const tone = {
  passed: "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300",
  approved: "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300",
  signed: "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300",
  exception: "border-red-500/20 bg-red-500/[0.07] text-red-300",
  critical: "border-red-500/20 bg-red-500/[0.07] text-red-300",
  rejected: "border-red-500/20 bg-red-500/[0.07] text-red-300",
  pending: "border-amber-500/20 bg-amber-500/[0.07] text-amber-300",
};

const label = (value) => String(value || "unknown").replaceAll("_", " ");
const when = (value) => value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) + " UTC" : "Not available";

function formatRaw(value, decimals = 6) {
  try {
    const raw = BigInt(value || 0);
    const negative = raw < 0n;
    const absolute = negative ? -raw : raw;
    const base = 10n ** BigInt(decimals);
    const whole = absolute / base;
    const fraction = (absolute % base).toString().padStart(decimals, "0").slice(0, Math.min(decimals, 4)).replace(/0+$/, "");
    return `${negative ? "-" : ""}${whole.toLocaleString()}${fraction ? `.${fraction}` : ""}`;
  } catch { return "—"; }
}

function StatusPill({ value }) {
  return <span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${tone[value] || tone.pending}`}>{label(value)}</span>;
}

function Metric({ title, value, note, alert = false }) {
  return (
    <div className="rounded-xl border border-line-subtle bg-surface-1 px-4 py-3.5">
      <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-ink-ghost">{title}</div>
      <div className={`mt-1.5 text-[18px] font-semibold tracking-[-0.03em] ${alert ? "text-red-300" : "text-ink"}`}>{value}</div>
      <div className="mt-1 text-[10px] text-ink-faint">{note}</div>
    </div>
  );
}

function ActionDialog({ action, busy, onClose, onSubmit }) {
  const [note, setNote] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [resolution, setResolution] = useState("");
  if (!action) return null;
  const needsResolution = action.kind === "propose_exception";
  const needsText = action.kind !== "approve_daily";
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/65 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-surface-1 shadow-2xl">
        <div className="flex items-start justify-between border-b border-line-subtle px-5 py-4">
          <div><h3 className="text-[15px] font-semibold text-ink">{action.title}</h3><p className="mt-1 text-[11px] leading-5 text-ink-faint">{action.description}</p></div>
          <button onClick={onClose} disabled={busy} className="rounded-lg p-1.5 text-ink-faint hover:bg-surface-2 hover:text-ink"><X size={15} /></button>
        </div>
        <div className="space-y-3 px-5 py-4">
          {needsResolution && <>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Root cause<textarea value={rootCause} onChange={(event) => setRootCause(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-line bg-surface-0 px-3 py-2 text-[12px] normal-case tracking-normal text-ink outline-none focus:border-blue-500/40" /></label>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Corrective action<textarea value={resolution} onChange={(event) => setResolution(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-line bg-surface-0 px-3 py-2 text-[12px] normal-case tracking-normal text-ink outline-none focus:border-blue-500/40" /></label>
          </>}
          {needsText && <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-faint">{action.kind === "sign_month" ? "Attestation" : "Review note"}<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-line bg-surface-0 px-3 py-2 text-[12px] normal-case tracking-normal text-ink outline-none focus:border-blue-500/40" /></label>}
        </div>
        <div className="flex justify-end gap-2 border-t border-line-subtle px-5 py-4">
          <button onClick={onClose} disabled={busy} className="rounded-lg border border-line px-3 py-2 text-[11px] text-ink-muted hover:bg-surface-2">Cancel</button>
          <button onClick={() => onSubmit({ note, rootCause, resolution })} disabled={busy || (needsResolution && (!rootCause.trim() || !resolution.trim())) || (action.kind === "sign_month" && !note.trim())} className="rounded-lg bg-blue-500 px-3.5 py-2 text-[11px] font-semibold text-white hover:bg-blue-400 disabled:opacity-40">{busy ? "Saving…" : action.confirm}</button>
        </div>
      </div>
    </div>
  );
}

export default function AssetReconciliationReview() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError("");
    const { data, error: loadError } = await supabase.rpc("admin_asset_reconciliation_dashboard", { p_limit: 30 });
    if (loadError) throw loadError;
    setDashboard(data);
  }, []);

  useEffect(() => {
    load().catch((loadError) => setError(loadError.message || "Could not load reconciliation controls.")).finally(() => setLoading(false));
  }, [load]);

  const roles = dashboard?.roles || [];
  const latest = dashboard?.latest_run;
  const results = useMemo(() => dashboard?.latest_results || [], [dashboard?.latest_results]);
  const exceptions = dashboard?.open_exceptions || [];
  const reviews = dashboard?.daily_reviews || [];
  const attestations = dashboard?.monthly_attestations || [];
  const worker = dashboard?.worker;
  const canPrepare = roles.includes("protocol_operations");
  const canReview = roles.includes("finance_operations");
  const canSign = roles.includes("compliance_risk");
  const minimumCoverage = useMemo(() => {
    const values = results.map((result) => result.coverage_bps).filter((value) => value != null).map(Number);
    return values.length ? `${(Math.min(...values) / 100).toFixed(2)}%` : "N/A";
  }, [results]);

  async function submit(values) {
    if (!action) return;
    setBusy(true);
    try {
      let response;
      if (action.kind === "prepare_daily") response = await supabase.rpc("admin_prepare_asset_reconciliation_daily", { p_review_id: action.id, p_note: values.note || null });
      if (action.kind === "approve_daily" || action.kind === "reject_daily") response = await supabase.rpc("admin_review_asset_reconciliation_daily", { p_review_id: action.id, p_approved: action.kind === "approve_daily", p_note: values.note || null });
      if (action.kind === "propose_exception") response = await supabase.rpc("admin_propose_asset_reconciliation_exception_resolution", { p_exception_id: action.id, p_investigation_note: values.note || null, p_root_cause: values.rootCause, p_resolution_note: values.resolution });
      if (action.kind === "approve_exception") response = await supabase.rpc("admin_approve_asset_reconciliation_exception_resolution", { p_exception_id: action.id, p_note: values.note || null });
      if (action.kind === "sign_month") response = await supabase.rpc("admin_sign_asset_reconciliation_attestation", { p_attestation_id: action.id, p_attestation_text: values.note });
      if (response?.error) throw response.error;
      toast.success("Control record updated");
      setAction(null);
      await load();
    } catch (submitError) { toast.error(submitError.message || "Could not update the control record"); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="grid min-h-[320px] place-items-center"><RefreshCw size={18} className="animate-spin text-blue-400" /></div>;
  if (error) return <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] p-5 text-[12px] text-red-300">{error}</div>;

  return (
    <div className="space-y-6">
      <div className={`flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${worker?.ready && !worker?.last_error ? "border-emerald-500/15 bg-emerald-500/[0.035]" : "border-amber-500/20 bg-amber-500/[0.045]"}`}>
        <div className="flex items-center gap-2.5">
          <span className={`h-2 w-2 rounded-full ${worker?.ready && !worker?.last_error ? "bg-emerald-400" : "bg-amber-400"}`} />
          <div><div className="text-[11px] font-medium text-ink">{worker?.ready ? "Reconciliation worker online" : "Reconciliation worker status unavailable"}</div><div className="mt-0.5 text-[9px] text-ink-ghost">Last successful control: {when(worker?.last_successful_run_at)}</div></div>
        </div>
        {worker?.last_error && <div className="max-w-xl text-[10px] text-amber-300">{worker.last_error}</div>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Latest control" value={latest ? label(latest.status) : "No run"} note={latest ? `Finalized block ${latest.block_number}` : "Awaiting worker"} alert={latest?.status === "exception"} />
        <Metric title="Minimum coverage" value={minimumCoverage} note="Lowest collateral-token reserve ratio" alert={results.some((result) => result.coverage_bps != null && Number(result.coverage_bps) < 10000)} />
        <Metric title="Collateral tokens" value={results.length} note="Each token reconciled independently" />
        <Metric title="Open exceptions" value={exceptions.length} note={exceptions.some((item) => item.severity === "critical") ? "Critical remediation required" : "Zero unexplained difference required"} alert={exceptions.length > 0} />
      </div>

      <section className="rounded-2xl border border-line bg-surface-1">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-subtle px-5 py-4">
          <div><h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink"><ShieldCheck size={15} className="text-blue-400" /> Reserve sufficiency</h2><p className="mt-1 text-[10px] text-ink-faint">Vault assets and client ledger liabilities at the same finalized block, independently verified through two RPC providers.</p></div>
          <div className="flex items-center gap-2"><StatusPill value={latest?.status || "pending"} /><button onClick={() => load().catch((e) => toast.error(e.message))} className="rounded-lg border border-line p-2 text-ink-faint hover:bg-surface-2"><RefreshCw size={13} /></button></div>
        </div>
        <div className="grid gap-3 p-4 lg:grid-cols-2">
          {results.map((result) => {
            const coverage = result.coverage_bps == null ? "N/A" : `${(Number(result.coverage_bps) / 100).toFixed(2)}%`;
            return <article key={result.id} className="rounded-xl border border-line-subtle bg-surface-0 p-4">
              <div className="flex items-center justify-between"><div className="text-[13px] font-semibold text-ink">{result.token_symbol}</div><StatusPill value={result.status} /></div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div><div className="text-[9px] uppercase tracking-wider text-ink-ghost">Vault assets</div><div className="mt-1 num text-[12px] text-ink">{formatRaw(result.vault_assets_raw, result.token_decimals)}</div></div>
                <div><div className="text-[9px] uppercase tracking-wider text-ink-ghost">Liabilities</div><div className="mt-1 num text-[12px] text-ink">{formatRaw(result.client_liabilities_raw, result.token_decimals)}</div></div>
                <div><div className="text-[9px] uppercase tracking-wider text-ink-ghost">Coverage</div><div className={`mt-1 num text-[12px] ${Number(result.coverage_bps || 10000) < 10000 ? "text-red-300" : "text-emerald-300"}`}>{coverage}</div></div>
              </div>
              <div className="mt-3 border-t border-line-subtle pt-3 text-[10px] text-ink-faint">Difference <span className="num text-ink-muted">{formatRaw(result.asset_difference_raw, result.token_decimals)} {result.token_symbol}</span> · Indexed ledger difference <span className="num text-ink-muted">{formatRaw(result.indexer_difference_raw, result.token_decimals)}</span></div>
              {Array.isArray(result.related_balances) && result.related_balances.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{result.related_balances.map((balance) => <span key={`${balance.label}-${balance.account}`} className="rounded-lg border border-line-subtle bg-surface-1 px-2.5 py-1.5 text-[9px] text-ink-faint">{balance.label}: <span className="num text-ink-muted">{formatRaw(balance.balanceRaw, result.token_decimals)} {result.token_symbol}</span></span>)}</div>}
            </article>;
          })}
          {!results.length && <div className="col-span-full py-8 text-center text-[11px] text-ink-ghost">No reconciliation evidence has been recorded.</div>}
        </div>
        {latest && <div className="border-t border-line-subtle px-5 py-3 text-[9px] text-ink-ghost">Evidence captured {when(latest.completed_at)} at block {latest.block_number} · {latest.block_hash}</div>}
      </section>

      {exceptions.length > 0 && <section className="rounded-2xl border border-red-500/20 bg-red-500/[0.025]">
        <div className="border-b border-red-500/10 px-5 py-4"><h2 className="flex items-center gap-2 text-[14px] font-semibold text-red-200"><AlertTriangle size={15} /> Exceptions requiring closure</h2></div>
        <div className="divide-y divide-red-500/10">{exceptions.map((item) => <div key={item.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div><div className="flex items-center gap-2"><StatusPill value={item.severity} /><span className="text-[12px] font-medium text-ink">{label(item.code)}</span></div><p className="mt-2 text-[10px] text-ink-faint">Difference: <span className="num">{item.difference_raw}</span>{item.remediation_due_at ? ` · Remediation due ${when(item.remediation_due_at)}` : ""}</p></div>
          <div className="flex gap-2">{canPrepare && ["open", "investigating"].includes(item.status) && <button onClick={() => setAction({ kind: "propose_exception", id: item.id, title: "Propose exception closure", description: "Document the investigation, root cause and corrective action for independent review.", confirm: "Submit for review" })} className="rounded-lg border border-line bg-surface-1 px-3 py-2 text-[10px] text-ink-muted hover:bg-surface-2">Document resolution</button>}{canReview && item.status === "pending_independent_review" && <button onClick={() => setAction({ kind: "approve_exception", id: item.id, title: "Approve exception closure", description: "Confirm independently that the correction and root-cause record are complete.", confirm: "Approve closure" })} className="rounded-lg bg-emerald-500 px-3 py-2 text-[10px] font-semibold text-white">Approve closure</button>}</div>
        </div>)}</div>
      </section>}

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface-1">
          <div className="border-b border-line-subtle px-5 py-4"><h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink"><Clock3 size={15} className="text-blue-400" /> Daily independent review</h2></div>
          <div className="divide-y divide-line-subtle">{reviews.slice(0, 7).map((review) => <div key={review.id} className="flex items-center justify-between gap-3 px-5 py-3.5"><div><div className="text-[11px] font-medium text-ink">{review.control_date}</div><div className="mt-1 text-[9px] text-ink-ghost">Due {when(review.due_at)}</div></div><div className="flex items-center gap-2"><StatusPill value={review.status} />{canPrepare && review.status === "pending_preparation" && <button onClick={() => setAction({ kind: "prepare_daily", id: review.id, title: "Prepare daily reconciliation", description: "Confirm the source evidence and exceptions have been reviewed before independent approval.", confirm: "Submit review" })} className="rounded-lg border border-line px-2.5 py-1.5 text-[9px] text-ink-muted">Prepare</button>}{canReview && review.status === "awaiting_independent_review" && <><button onClick={() => setAction({ kind: "approve_daily", id: review.id, title: "Approve daily reconciliation", description: "Provide independent Finance/Operations approval.", confirm: "Approve" })} className="rounded-lg bg-emerald-500 px-2.5 py-1.5 text-[9px] font-semibold text-white">Approve</button><button onClick={() => setAction({ kind: "reject_daily", id: review.id, title: "Reject daily reconciliation", description: "Document why the control evidence is not acceptable.", confirm: "Reject" })} className="rounded-lg border border-red-500/30 px-2.5 py-1.5 text-[9px] text-red-300">Reject</button></>}</div></div>)}</div>
        </section>
        <section className="rounded-2xl border border-line bg-surface-1">
          <div className="border-b border-line-subtle px-5 py-4"><h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink"><Database size={15} className="text-blue-400" /> Monthly attestation</h2></div>
          <div className="divide-y divide-line-subtle">{attestations.slice(0, 6).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 px-5 py-3.5"><div><div className="text-[11px] font-medium text-ink">{item.period_start} to {item.period_end}</div><div className="mt-1 text-[9px] text-ink-ghost">Due {when(item.due_at)}</div></div><div className="flex items-center gap-2"><StatusPill value={item.status} />{canSign && item.status === "pending" && <button onClick={() => setAction({ kind: "sign_month", id: item.id, title: "Sign reserve-sufficiency attestation", description: "Signing is blocked until every daily control is approved and all exceptions are independently closed.", confirm: "Sign attestation" })} className="rounded-lg bg-blue-500 px-2.5 py-1.5 text-[9px] font-semibold text-white">Sign</button>}</div></div>)}</div>
        </section>
      </div>

      <div className="rounded-xl border border-line-subtle bg-surface-1 px-4 py-3 text-[10px] leading-5 text-ink-faint"><CheckCircle2 size={13} className="mr-2 inline text-emerald-400" />Position margin is already included inside each client's vault ledger balance and is not counted a second time. Insurance Fund, Fee Router and treasury balances are reported separately and never used to conceal a client-asset deficit.</div>
      <ActionDialog action={action} busy={busy} onClose={() => !busy && setAction(null)} onSubmit={submit} />
    </div>
  );
}
