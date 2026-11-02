import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Ban,
  Check,
  ChevronDown,
  ExternalLink,
  FilePlus2,
  FileText,
  History,
  LockKeyhole,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { analyseOwnershipStructure } from "../utils/ownershipStructure";
import {
  openComplianceDocument,
  removeComplianceDocument,
  reviewBackgroundScreening,
  reviewMonitoringAlert,
  registerCurrentComplianceOfficer,
  reviseEntityMonitoringThresholds,
  setEntityRestriction,
  setMemberAccountFrozen,
  updateEntityMonitoringProfile,
  uploadComplianceDocument,
} from "../services/entityCompliance";

const titleCase = (value) => String(value || "")
  .replace(/_/g, " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDateTime = (value) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString();
};

const formatUsd = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Not available";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
};

const bandTone = (band) => ({
  low: "border-up/20 bg-up/[0.06] text-up",
  medium: "border-warn/20 bg-warn/[0.06] text-warn",
  high: "border-down/20 bg-down/[0.06] text-down",
}[band] || "border-line bg-surface-2 text-ink-muted");

const BACKGROUND_GATE_OPTIONS = [
  ["sanctions_name_match", "Sanctions match"],
  ["pep_confirmed", "PEP confirmed"],
  ["unresolved_adverse_media", "Unresolved adverse media"],
  ["financial_crime_record", "Financial-crime record"],
];

export function ComplianceEvidencePanel({ applicationId, documents = [], purpose, onRefresh }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy("upload");
    setError("");
    try {
      await uploadComplianceDocument({ applicationId, purpose, file });
      await onRefresh();
    } catch (uploadError) {
      setError(uploadError.message || "Could not upload the document.");
    } finally {
      setBusy("");
    }
  };

  const open = async (document) => {
    setBusy(document.id);
    setError("");
    try {
      const signedUrl = await openComplianceDocument(document);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (openError) {
      setError(openError.message || "Could not open the document.");
    } finally {
      setBusy("");
    }
  };

  const remove = async (document) => {
    if (!window.confirm(`Remove ${document.original_filename}?`)) return;
    setBusy(document.id);
    setError("");
    try {
      await removeComplianceDocument(document);
      await onRefresh();
    } catch (removeError) {
      setError(removeError.message || "Could not remove the document.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-line-subtle bg-surface-0/45 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-ink-muted">Supporting evidence</p>
          <p className="mt-1 text-[9px] leading-4 text-ink-faint">Optional. Up to three private documents per application.</p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy === "upload" || documents.length >= 3}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface-1 px-2.5 text-[10px] font-semibold text-ink-muted hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy === "upload" ? <RefreshCw className="h-3 w-3 animate-spin" /> : <FilePlus2 className="h-3 w-3" />}
          Add document
        </button>
        <input ref={inputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={upload} />
      </div>
      {documents.length > 0 && (
        <div className="mt-3 space-y-2">
          {documents.map((document) => (
            <div key={document.id} className="flex items-center gap-2 rounded-lg border border-line-subtle bg-surface-1/60 px-2.5 py-2">
              <FileText className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
              <span className="min-w-0 flex-1 truncate text-[10px] text-ink-muted">{document.original_filename}</span>
              <button type="button" disabled={busy === document.id} onClick={() => open(document)} className="text-blue-400 hover:text-blue-300" aria-label="Open document"><ExternalLink className="h-3.5 w-3.5" /></button>
              <button type="button" disabled={busy === document.id} onClick={() => remove(document)} className="text-ink-ghost hover:text-down" aria-label="Remove document"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}
      {error && <p className="mt-2 text-[10px] leading-4 text-down">{error}</p>}
    </div>
  );
}

function RiskOverview({ context }) {
  const latest = context.assessments?.[0];
  const activeGates = latest?.gate_results
    ? Object.entries(latest.gate_results).filter(([, active]) => active).map(([key]) => key)
    : [];
  const factors = latest ? [
    ["Business activity", latest.isic_score, latest.isic_code],
    ["Source of funds / wealth", latest.source_of_funds_score, latest.source_of_funds_key],
    ["Ownership", latest.ownership_score, latest.ownership_key],
    ["Geography", latest.geography_score, latest.geography_key],
    ["Wallet", latest.wallet_score, latest.wallet_key],
  ] : [];

  if (!latest) return <p className="mt-4 text-[12px] text-ink-faint">No risk assessment has been recorded.</p>;
  return (
    <div className="mt-5 grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
      <div className={`rounded-2xl border p-5 ${bandTone(latest.final_band || (latest.decision === "blocked" ? "high" : ""))}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-70">Current classification</p>
        <p className="mt-2 text-[24px] font-semibold tracking-[-0.03em]">{latest.decision === "blocked" ? "Blocked" : `${titleCase(latest.final_band)} risk`}</p>
        <p className="mt-1 text-[11px] opacity-75">Effective score {Number(latest.effective_score).toFixed(2)} / 10</p>
        {latest.manual_score_override != null && <p className="mt-3 rounded-lg border border-current/15 px-2.5 py-2 text-[10px] leading-4">Manually adjusted from {Number(latest.weighted_score).toFixed(2)}.</p>}
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {factors.map(([label, score, key]) => (
          <div key={label} className="rounded-2xl border border-line-subtle bg-surface-1/55 p-3.5">
            <div className="flex items-center justify-between gap-3"><span className="text-[10px] text-ink-faint">{label}</span><strong className="text-[13px] text-ink">{score}/10</strong></div>
            <p className="mt-2 text-[10px] leading-4 text-ink-muted">{titleCase(key)}</p>
          </div>
        ))}
      </div>
      <div className="xl:col-span-2 rounded-2xl border border-line-subtle bg-surface-1/40 p-4">
        <p className="text-[11px] font-semibold text-ink-muted">Why this rating was assigned</p>
        <p className="mt-2 text-[11px] leading-5 text-ink-faint">
          The weighted factor score was {Number(latest.weighted_score).toFixed(2)}. {activeGates.length
            ? `Triggered controls: ${activeGates.map(titleCase).join(", ")}.`
            : "No blocking or forced-high risk gate was active."}
        </p>
        {latest.manual_override_reason && <p className="mt-2 rounded-xl border border-warn/15 bg-warn/[0.04] px-3 py-2.5 text-[11px] leading-5 text-ink-muted"><strong className="text-warn">Override rationale:</strong> {latest.manual_override_reason}</p>}
        {latest.gate_evidence?.compliance_notes && <p className="mt-2 text-[11px] leading-5 text-ink-muted"><strong>Compliance rationale:</strong> {latest.gate_evidence.compliance_notes}</p>}
      </div>
    </div>
  );
}

function LiveMonitoringPanel({ context, busy, onSave, onReviseModel, onRegisterOfficer }) {
  const live = context.extended?.live_monitoring || {};
  const latest = live.latest_risk;
  const model = live.model;
  const rules = live.rules || [];
  const events = live.recent_events || [];
  const vendorStatus = live.vendor_status || [];
  const screeningSchedule = live.screening_schedule || [];
  const canManageThresholds = live.can_manage_thresholds === true;
  const application = context.application || {};
  const [accountPurpose, setAccountPurpose] = useState(application.account_purpose || "");
  const [expectedDeposits, setExpectedDeposits] = useState(application.expected_monthly_deposits_usd || "");
  const [rationale, setRationale] = useState("");
  const [capacityStep, setCapacityStep] = useState(model?.capacity_step || 1);
  const [thresholdPercent, setThresholdPercent] = useState(Number(model?.compliance_threshold_factor || 1) * 100);
  const [modelRationale, setModelRationale] = useState("");
  const [approvalReference, setApprovalReference] = useState("");
  const [officerRationale, setOfficerRationale] = useState("");

  useEffect(() => {
    setAccountPurpose(application.account_purpose || "");
    setExpectedDeposits(application.expected_monthly_deposits_usd || "");
  }, [application.account_purpose, application.expected_monthly_deposits_usd]);

  useEffect(() => {
    setCapacityStep(model?.capacity_step || 1);
    setThresholdPercent(Number(model?.compliance_threshold_factor || 1) * 100);
  }, [model?.capacity_step, model?.compliance_threshold_factor]);

  const submitProfile = () => {
    if (!accountPurpose || (expectedDeposits !== "" && Number(expectedDeposits) <= 0)) {
      onSave(null, "Select the account purpose and, if supplied, enter a positive expected monthly deposit amount.");
      return;
    }
    if (!rationale.trim()) {
      onSave(null, "Record why the monitoring profile is being added or changed.");
      return;
    }
    onSave({ accountPurpose, expectedMonthlyDeposits: expectedDeposits, rationale });
    setRationale("");
  };

  const factors = latest?.factor_scores || {};
  const factorLabels = {
    aum: "Account equity",
    cash_in_volume: "Deposit volume",
    cash_in_count: "Deposit count",
    cash_out_volume: "Withdrawal volume",
    cash_out_count: "Withdrawal count",
  };
  const implementedRules = rules.filter((rule) => rule.implementation_status === "implemented");
  const pendingRules = rules.filter((rule) => rule.implementation_status === "pending");
  const disabledRules = rules.filter((rule) => rule.implementation_status === "disabled" || !rule.enabled);

  const submitModelRevision = () => {
    const factor = Number(thresholdPercent) / 100;
    if (!Number.isInteger(Number(capacityStep)) || Number(capacityStep) < 1 || Number(capacityStep) > 11 || factor <= 0 || factor > 1) {
      onReviseModel(null, "Use a capacity step from 1 to 11 and a threshold factor from 1% to 100%.");
      return;
    }
    if (!modelRationale.trim()) {
      onReviseModel(null, "Record the rationale for the monitoring-model revision.");
      return;
    }
    if (!window.confirm("Create a new global monitoring-model revision? This threshold configuration will apply to every monitored entity.")) return;
    onReviseModel({
      capacityStep,
      thresholdFactor: factor,
      rationale: modelRationale,
      approvalReference,
    });
  };

  return (
    <section className="rounded-[22px] border border-line-subtle bg-surface-0/30 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-400">Live monitoring</p>
          <h4 className="mt-2 text-[17px] font-semibold text-ink">Composed customer risk</h4>
          <p className="mt-1 max-w-3xl text-[11px] leading-5 text-ink-faint">Onboarding risk contributes 30%. Confirmed protocol activity contributes 70% after the first monitored event.</p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold ${model?.operation_mode === "enforced" ? "border-down/20 bg-down/[0.06] text-down" : "border-blue-400/20 bg-blue-400/[0.06] text-blue-400"}`}>
          {model ? `${titleCase(model.operation_mode)} mode · v${model.version}` : "Configuration pending"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <div className={`rounded-2xl border p-4 ${latest?.final_band ? bandTone(latest.final_band) : "border-line-subtle bg-surface-1/50 text-ink-muted"}`}>
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] opacity-70">Current composed risk</p>
          <p className="mt-2 text-[20px] font-semibold tracking-[-0.02em]">{latest?.composed_score != null ? `${Number(latest.composed_score).toFixed(2)} / 10` : "Awaiting activity"}</p>
          <p className="mt-1 text-[10px] opacity-75">{latest?.final_band ? `${titleCase(latest.final_band)} risk · revision ${latest.revision}` : "The onboarding rating remains the current classification until the first confirmed protocol event."}</p>
        </div>
        <div className="rounded-2xl border border-line-subtle bg-surface-1/50 p-4">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Onboarding component · 30%</p>
          <p className="mt-2 text-[20px] font-semibold text-ink">{latest?.onboarding_score != null ? Number(latest.onboarding_score).toFixed(2) : context.assessments?.[0]?.effective_score != null ? Number(context.assessments[0].effective_score).toFixed(2) : "—"}</p>
          <p className="mt-1 text-[10px] text-ink-faint">Latest approved onboarding assessment.</p>
        </div>
        <div className="rounded-2xl border border-line-subtle bg-surface-1/50 p-4">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Transactional component · 70%</p>
          <p className="mt-2 text-[20px] font-semibold text-ink">{latest?.transactional_score != null ? Number(latest.transactional_score).toFixed(2) : "—"}</p>
          <p className="mt-1 text-[10px] text-ink-faint">Recalculated after each confirmed deposit, withdrawal or trade.</p>
        </div>
      </div>

      {latest && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {Object.entries(factorLabels).map(([key, label]) => (
            <div key={key} className="rounded-xl border border-line-subtle bg-surface-1/35 px-3 py-2.5">
              <p className="text-[9px] text-ink-faint">{label}</p>
              <p className="mt-1 text-[13px] font-semibold text-ink">{Number(factors[key] ?? 0).toFixed(0)} / 10</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]">
        <div className="rounded-2xl border border-line-subtle bg-surface-1/40 p-4">
          <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-ink-faint" /><h5 className="text-[12px] font-semibold text-ink">Monitoring profile</h5></div>
          <p className="mt-1 text-[10px] leading-4 text-ink-faint">These customer-declared inputs support purpose-sensitive rules. Every Compliance change is retained in an immutable lineage.</p>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            <label className="space-y-1.5"><span className="text-[9px] font-semibold text-ink-faint">Account purpose</span><select value={accountPurpose} onChange={(event) => setAccountPurpose(event.target.value)} className="h-10 w-full rounded-xl border border-line bg-surface-0 px-3 text-[10px] text-ink"><option value="">Select purpose</option><option value="hedging">Hedging</option><option value="trading">Trading</option></select></label>
            <label className="space-y-1.5"><span className="text-[9px] font-semibold text-ink-faint">Expected monthly deposits (USD) · optional</span><input type="number" min="1" step="0.01" value={expectedDeposits} onChange={(event) => setExpectedDeposits(event.target.value)} className="h-10 w-full rounded-xl border border-line bg-surface-0 px-3 text-[10px] text-ink" /><span className="block text-[8px] leading-3.5 text-ink-ghost">May be collected as a tailored EDD baseline.</span></label>
          </div>
          <textarea value={rationale} onChange={(event) => setRationale(event.target.value)} rows={2} placeholder="Required rationale for adding or changing these values" className="mt-2.5 w-full rounded-xl border border-line bg-surface-0 px-3 py-2.5 text-[10px] text-ink" />
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2"><p className="text-[9px] text-ink-ghost">Current baseline: {application.account_purpose ? titleCase(application.account_purpose) : "Not recorded"} · {formatUsd(application.expected_monthly_deposits_usd)}</p><button type="button" onClick={submitProfile} disabled={busy === "monitoring-profile"} className="h-9 rounded-lg bg-white px-3 text-[10px] font-semibold text-black disabled:opacity-50">Save monitoring profile</button></div>
        </div>

        <div className="rounded-2xl border border-line-subtle bg-surface-1/40 p-4">
          <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-ink-faint" /><h5 className="text-[12px] font-semibold text-ink">Control coverage</h5></div>
          <div className="mt-3 grid grid-cols-3 gap-2"><div className="rounded-xl bg-surface-0/60 p-3"><p className="text-[18px] font-semibold text-ink">{implementedRules.length}</p><p className="text-[9px] text-ink-faint">Automated in shadow mode</p></div><div className="rounded-xl bg-surface-0/60 p-3"><p className="text-[18px] font-semibold text-ink">{pendingRules.length}</p><p className="text-[9px] text-ink-faint">Pending data integration</p></div><div className="rounded-xl bg-surface-0/60 p-3"><p className="text-[18px] font-semibold text-ink">{disabledRules.length}</p><p className="text-[9px] text-ink-faint">Inapplicable third-party rules</p></div></div>
          <details className="group mt-3 rounded-xl border border-line-subtle bg-surface-0/35">
            <summary className="cursor-pointer list-none px-3 py-2.5 text-[10px] font-semibold text-ink-muted">Global threshold governance <ChevronDown className="ml-1 inline h-3.5 w-3.5 transition-transform group-open:rotate-180" /></summary>
            <div className="space-y-2.5 border-t border-line-subtle p-3">
              <p className="text-[9px] leading-4 text-ink-faint">This is a global control affecting every monitored entity. Only the registered Compliance Officer can create a revision. Each change requires a rationale and remains in the audit lineage.</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1"><span className="text-[8px] font-semibold text-ink-faint">Capacity step</span><select value={capacityStep} onChange={(event) => setCapacityStep(Number(event.target.value))} className="h-9 w-full rounded-lg border border-line bg-surface-1 px-2.5 text-[9px] text-ink">{Array.from({ length: 11 }, (_, index) => index + 1).map((step) => <option key={step} value={step}>Step {step}</option>)}</select></label>
                <label className="space-y-1"><span className="text-[8px] font-semibold text-ink-faint">Compliance threshold factor</span><div className="relative"><input type="number" min="1" max="100" step="1" value={thresholdPercent} onChange={(event) => setThresholdPercent(event.target.value)} className="h-9 w-full rounded-lg border border-line bg-surface-1 px-2.5 pr-7 text-[9px] text-ink" /><span className="absolute right-2.5 top-2.5 text-[9px] text-ink-ghost">%</span></div></label>
              </div>
              <textarea value={modelRationale} onChange={(event) => setModelRationale(event.target.value)} rows={2} placeholder="Required model-change rationale" className="w-full rounded-lg border border-line bg-surface-1 px-2.5 py-2 text-[9px] text-ink" />
              <input value={approvalReference} onChange={(event) => setApprovalReference(event.target.value)} placeholder="Administrative approval reference (optional)" disabled={!canManageThresholds} className="h-9 w-full rounded-lg border border-line bg-surface-1 px-2.5 text-[9px] text-ink disabled:opacity-45" />
              <button type="button" onClick={submitModelRevision} disabled={busy === "monitoring-model" || !canManageThresholds} className="h-9 w-full rounded-lg border border-blue-400/25 bg-blue-400/[0.08] text-[9px] font-semibold text-blue-400 disabled:opacity-50">{canManageThresholds ? "Create model revision" : "Compliance Officer authorization required"}</button>
              {!canManageThresholds && !(live.compliance_roles || []).length && <div className="rounded-lg border border-warn/15 bg-warn/[0.04] p-2.5"><p className="text-[8px] leading-3.5 text-ink-faint">No Compliance Officer is registered. An AAL2 administrator may bootstrap the first assignment; later changes require the current officer.</p><input value={officerRationale} onChange={(event) => setOfficerRationale(event.target.value)} placeholder="Assignment rationale" className="mt-2 h-8 w-full rounded-lg border border-line bg-surface-1 px-2.5 text-[9px] text-ink" /><button type="button" onClick={() => onRegisterOfficer(officerRationale)} disabled={!officerRationale.trim() || busy === "compliance-officer"} className="mt-2 h-8 w-full rounded-lg bg-white text-[9px] font-semibold text-black disabled:opacity-50">Register me as Compliance Officer</button></div>}
            </div>
          </details>
          <details className="group mt-3 rounded-xl border border-line-subtle bg-surface-0/35"><summary className="cursor-pointer list-none px-3 py-2.5 text-[10px] font-semibold text-ink-muted">View configured rule inventory <ChevronDown className="ml-1 inline h-3.5 w-3.5 transition-transform group-open:rotate-180" /></summary><div className="max-h-64 space-y-1.5 overflow-y-auto border-t border-line-subtle p-2.5">{rules.map((rule) => <div key={rule.id} className="rounded-lg border border-line-subtle bg-surface-1/55 px-2.5 py-2"><div className="flex items-center justify-between gap-2"><span className="text-[9px] font-medium text-ink-muted">{rule.title}</span><span className={`text-[8px] font-semibold ${rule.implementation_status === "implemented" ? "text-blue-400" : "text-ink-ghost"}`}>{rule.implementation_status === "implemented" ? "Shadow" : titleCase(rule.implementation_status)}</span></div><p className="mt-1 text-[8px] leading-3.5 text-ink-faint">{rule.consequence}{rule.implementation_note ? ` · ${rule.implementation_note}` : ""}</p></div>)}</div></details>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-line-subtle bg-surface-1/35 p-4">
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-ink-faint" /><h5 className="text-[12px] font-semibold text-ink">Screening operations</h5></div>
          <p className="mt-1 text-[10px] leading-4 text-ink-faint">Daily sanctions, PEP and adverse-media schedules are recorded here. Vendor outages remain visible and preserve the last available result for later reruns.</p>
          <div className="mt-3 space-y-2">{screeningSchedule.length ? screeningSchedule.map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl border border-line-subtle bg-surface-0/45 px-3 py-2"><span className="text-[9px] font-medium text-ink-muted">{titleCase(item.screening_type)}</span><span className="text-[8px] text-ink-faint">Next {formatDateTime(item.next_due_at)}</span></div>) : <p className="text-[9px] text-ink-ghost">No screening schedule has been initialized for this entity.</p>}</div>
        </div>
        <div className="rounded-2xl border border-line-subtle bg-surface-1/35 p-4">
          <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-ink-faint" /><h5 className="text-[12px] font-semibold text-ink">Vendor availability</h5></div>
          <div className="mt-3 space-y-2">{vendorStatus.length ? vendorStatus.map((item) => <div key={item.vendor} className="rounded-xl border border-line-subtle bg-surface-0/45 px-3 py-2"><div className="flex items-center justify-between"><span className="text-[9px] font-medium text-ink-muted">{titleCase(item.vendor)}</span><span className={`text-[8px] font-semibold ${item.availability === "available" ? "text-up" : "text-warn"}`}>{titleCase(item.availability)}</span></div><p className="mt-1 text-[8px] text-ink-ghost">Last successful result: {formatDateTime(item.last_success_at)}</p></div>) : <p className="text-[9px] text-ink-ghost">No vendor status has been reported yet.</p>}</div>
        </div>
      </div>

      <details className="group mt-4 rounded-2xl border border-line-subtle bg-surface-1/35">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[10px] font-semibold text-ink-muted">Recent confirmed protocol activity <span className="text-ink-ghost">{events.length} retained <ChevronDown className="ml-1 inline h-3.5 w-3.5 transition-transform group-open:rotate-180" /></span></summary>
        <div className="divide-y divide-line-subtle border-t border-line-subtle">
          {events.slice(0, 12).map((event) => <div key={event.id} className="grid gap-1 px-4 py-3 text-[9px] sm:grid-cols-[150px_1fr_auto] sm:items-center"><span className="font-medium text-ink-muted">{titleCase(event.event_type)}</span><span className="truncate text-ink-faint">{formatDateTime(event.occurred_at)} · {event.transaction_hash}</span><span className="text-ink">{formatUsd(event.amount_usd)}</span></div>)}
          {!events.length && <p className="px-4 py-5 text-center text-[10px] text-ink-faint">No confirmed protocol events have been recorded for this entity yet.</p>}
        </div>
      </details>
    </section>
  );
}

function OwnershipReview({ context }) {
  const analysis = useMemo(() => analyseOwnershipStructure(
    context.application?.ownership_structure || [],
    context.connected_persons || [],
  ), [context.application?.ownership_structure, context.connected_persons]);
  return (
    <details className="group rounded-[20px] border border-line-subtle bg-surface-0/30">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
        <span className="flex items-center gap-2.5"><Users className="h-4 w-4 text-ink-faint" /><span className="text-[13px] font-semibold text-ink">Ownership calculator</span></span>
        <span className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold ${analysis.complete ? "border-up/20 bg-up/[0.06] text-up" : "border-warn/20 bg-warn/[0.06] text-warn"}`}>{analysis.complete ? "100% mapped" : `${analysis.directTotal.toFixed(2)}% direct mapped`}</span>
      </summary>
      <div className="border-t border-line-subtle p-5">
        <p className="text-[11px] leading-5 text-ink-faint">Effective ownership multiplies each direct and indirect percentage through every corporate layer.</p>
        <div className="mt-3 space-y-2">
          {analysis.naturalOwners.map((owner) => (
            <div key={owner.id} className="rounded-xl border border-line-subtle bg-surface-1/55 p-3">
              <div className="flex items-center justify-between gap-3"><span className="text-[11px] font-medium text-ink-muted">{owner.name}</span><strong className="text-[12px] text-ink">{owner.effectivePercentage.toFixed(2)}%</strong></div>
              <p className="mt-1 text-[9px] leading-4 text-ink-faint">{owner.path.join(" → ")}</p>
            </div>
          ))}
          {!analysis.naturalOwners.length && <p className="text-[11px] text-ink-faint">No ownership map is available for this legacy application.</p>}
        </div>
        {analysis.errors.length > 0 && <div className="mt-3 rounded-xl border border-warn/20 bg-warn/[0.05] p-3 text-[10px] leading-5 text-warn">{analysis.errors.join(" ")}</div>}
      </div>
    </details>
  );
}

export default function EntityComplianceControls({ context, onRefresh }) {
  const extended = context.extended || {};
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [screeningForm, setScreeningForm] = useState(null);
  const [alertForm, setAlertForm] = useState(null);
  const [restrictionType, setRestrictionType] = useState("close_only");
  const [restrictionRationale, setRestrictionRationale] = useState("");
  const activeRestrictions = (extended.account_restrictions || []).filter((item) => item.status === "active");

  const run = async (key, action) => {
    setBusy(key);
    setNotice("");
    try {
      await action();
      await onRefresh();
      setNotice("Compliance record updated.");
    } catch (actionError) {
      setNotice(actionError.message || "Could not update the Compliance record.");
    } finally {
      setBusy("");
    }
  };

  const submitScreening = () => {
    if (!screeningForm?.outcome) return setNotice("Select a background-screening outcome.");
    if (screeningForm.outcome === "true_positive" && !screeningForm.gateKeys?.length) {
      return setNotice("Select at least one confirmed screening finding for a true positive.");
    }
    return run(`screen-${screeningForm.id}`, async () => {
      await reviewBackgroundScreening({
        caseId: screeningForm.id,
        outcome: screeningForm.outcome,
        gateKeys: screeningForm.gateKeys || [],
        note: screeningForm.note,
        providerReference: screeningForm.providerReference,
      });
      setScreeningForm(null);
    });
  };

  const submitAlert = () => {
    if (!alertForm?.status || !alertForm?.rationale?.trim()) return setNotice("Select an outcome and record the alert-review rationale.");
    return run(`alert-${alertForm.id}`, async () => {
      await reviewMonitoringAlert({ alertId: alertForm.id, status: alertForm.status, rationale: alertForm.rationale });
      setAlertForm(null);
    });
  };

  const addRestriction = () => {
    if (!restrictionRationale.trim()) return setNotice("Record the rationale before applying a restriction.");
    const memberUserIds = (extended.memberships || []).map((membership) => membership.user_id).filter(Boolean);
    return run("restriction", async () => {
      await setEntityRestriction({
        applicationId: context.application.id,
        restrictionType,
        active: true,
        rationale: restrictionRationale,
        memberUserIds,
      });
      setRestrictionRationale("");
    });
  };

  const saveMonitoringProfile = (values, validationMessage = "") => {
    if (!values) {
      setNotice(validationMessage);
      return;
    }
    return run("monitoring-profile", () => updateEntityMonitoringProfile({
      applicationId: context.application.id,
      ...values,
    }));
  };

  const reviseMonitoringModel = (values, validationMessage = "") => {
    if (!values) {
      setNotice(validationMessage);
      return;
    }
    return run("monitoring-model", () => reviseEntityMonitoringThresholds(values));
  };

  const registerOfficer = (rationale) => run("compliance-officer", async () => {
    await registerCurrentComplianceOfficer(rationale);
    await onRefresh();
  });

  return (
    <div className="space-y-5">
      <section className="rounded-[22px] border border-line-subtle bg-surface-0/30 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-400">Customer risk dashboard</p><h4 className="mt-2 text-[17px] font-semibold text-ink">Classification, rationale and lineage</h4><p className="mt-1 text-[11px] leading-5 text-ink-faint">A durable customer profile that remains available after application approval.</p></div>
          <History className="h-5 w-5 text-ink-ghost" />
        </div>
        <RiskOverview context={context} />
        {(context.assessments || []).length > 0 && (
          <details className="group mt-4 rounded-2xl border border-line-subtle bg-surface-1/45">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-[11px] font-semibold text-ink-muted">Risk classification lineage <span className="text-ink-ghost">{context.assessments.length} revision{context.assessments.length === 1 ? "" : "s"} <ChevronDown className="ml-1 inline h-3.5 w-3.5 transition-transform group-open:rotate-180" /></span></summary>
            <div className="divide-y divide-line-subtle border-t border-line-subtle">
              {context.assessments.map((assessment) => (
                <div key={assessment.id} className="grid gap-2 px-4 py-3 text-[10px] sm:grid-cols-[80px_1fr_auto] sm:items-center">
                  <span className="font-semibold text-ink">Revision {assessment.revision}</span>
                  <span className="text-ink-faint">{formatDateTime(assessment.assessed_at)}{assessment.manual_score_override != null ? " · Manual override" : " · Automated inputs"}</span>
                  <span className={`w-fit rounded-full border px-2 py-1 font-semibold ${bandTone(assessment.final_band || "high")}`}>{assessment.decision === "blocked" ? "Blocked" : `${titleCase(assessment.final_band)} · ${Number(assessment.effective_score).toFixed(2)}`}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </section>

      <LiveMonitoringPanel context={context} busy={busy} onSave={saveMonitoringProfile} onReviseModel={reviseMonitoringModel} onRegisterOfficer={registerOfficer} />

      <OwnershipReview context={context} />

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-[20px] border border-line-subtle bg-surface-0/30 p-5">
          <div className="flex items-center justify-between"><span className="flex items-center gap-2.5"><ShieldCheck className="h-4 w-4 text-ink-faint" /><h4 className="text-[14px] font-semibold text-ink">Background screening</h4></span><span className="text-[10px] text-ink-ghost">{(extended.background_screenings || []).length} cases</span></div>
          <p className="mt-2 text-[10px] leading-4 text-ink-faint">Non-platform connected people are reviewed from submitted identity evidence and do not receive biometric invitations.</p>
          <div className="mt-4 space-y-2.5">
            {(extended.background_screenings || []).map((screening) => {
              const person = context.connected_persons.find((item) => item.id === screening.connected_person_id);
              return (
                <div key={screening.id} className="rounded-2xl border border-line-subtle bg-surface-1/55 p-3.5">
                  <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-medium text-ink-muted">{person?.full_name || "Connected person"}</p><p className="mt-1 text-[9px] text-ink-faint">{titleCase(screening.status)} · {titleCase(screening.provider)}</p></div><button type="button" onClick={() => setScreeningForm({ id: screening.id, outcome: screening.review_answer || "", providerReference: screening.provider_reference || "", note: screening.note || "", gateKeys: screening.gate_keys || [] })} className="text-[10px] font-semibold text-blue-400">Review</button></div>
                  {screeningForm?.id === screening.id && <div className="mt-3 space-y-2 border-t border-line-subtle pt-3"><select value={screeningForm.outcome} onChange={(event) => setScreeningForm((current) => ({ ...current, outcome: event.target.value, gateKeys: ["clear", "false_positive"].includes(event.target.value) ? [] : current.gateKeys }))} className="h-9 w-full rounded-lg border border-line bg-surface-0 px-2.5 text-[10px] text-ink"><option value="">Select outcome</option><option value="clear">Clear</option><option value="false_positive">False positive</option><option value="true_positive">True positive</option><option value="inconclusive">Inconclusive</option></select>{["true_positive", "inconclusive"].includes(screeningForm.outcome) && <div className="grid gap-1.5 rounded-lg border border-line-subtle bg-surface-0/45 p-2.5 sm:grid-cols-2">{BACKGROUND_GATE_OPTIONS.map(([key, label]) => <label key={key} className="flex cursor-pointer items-center gap-2 text-[9px] text-ink-muted"><input type="checkbox" checked={screeningForm.gateKeys.includes(key)} onChange={() => setScreeningForm((current) => ({ ...current, gateKeys: current.gateKeys.includes(key) ? current.gateKeys.filter((item) => item !== key) : [...current.gateKeys, key] }))} />{label}</label>)}</div>}<input value={screeningForm.providerReference} onChange={(event) => setScreeningForm((current) => ({ ...current, providerReference: event.target.value }))} placeholder="Provider reference (optional)" className="h-9 w-full rounded-lg border border-line bg-surface-0 px-2.5 text-[10px] text-ink" /><textarea value={screeningForm.note} onChange={(event) => setScreeningForm((current) => ({ ...current, note: event.target.value }))} rows={2} placeholder="Review rationale" className="w-full rounded-lg border border-line bg-surface-0 px-2.5 py-2 text-[10px] text-ink" /><button type="button" onClick={submitScreening} disabled={busy === `screen-${screening.id}`} className="h-9 w-full rounded-lg bg-white text-[10px] font-semibold text-black disabled:opacity-50">Save screening outcome</button></div>}
                </div>
              );
            })}
            {!(extended.background_screenings || []).length && <p className="rounded-xl border border-line-subtle bg-surface-1/40 px-3 py-4 text-center text-[10px] text-ink-faint">No background-screening cases are queued.</p>}
          </div>
        </div>

        <div className="rounded-[20px] border border-line-subtle bg-surface-0/30 p-5">
          <div className="flex items-center justify-between"><span className="flex items-center gap-2.5"><ShieldAlert className="h-4 w-4 text-ink-faint" /><h4 className="text-[14px] font-semibold text-ink">Ongoing monitoring alerts</h4></span><span className="text-[10px] text-ink-ghost">{(extended.monitoring_alerts || []).length} alerts</span></div>
          <p className="mt-2 text-[10px] leading-4 text-ink-faint">Transaction rules run in shadow mode. Daily vendor schedules and vendor availability are visible; final vendor API execution is activated when production screening credentials and list coverage are confirmed.</p>
          <div className="mt-4 space-y-2.5">
            {(extended.monitoring_alerts || []).map((alert) => (
              <div key={alert.id} className="rounded-2xl border border-line-subtle bg-surface-1/55 p-3.5"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-medium text-ink-muted">{alert.title}</p><p className="mt-1 text-[9px] text-ink-faint">{titleCase(alert.source)} · {titleCase(alert.severity)} · {titleCase(alert.status)}</p><p className={`mt-1 text-[8px] ${alert.response_due_at && new Date(alert.response_due_at) < new Date() && !["false_positive", "closed"].includes(alert.status) ? "text-down" : "text-ink-ghost"}`}>Review due {formatDateTime(alert.response_due_at)}</p></div><button type="button" onClick={() => setAlertForm({ id: alert.id, status: "", rationale: alert.review_rationale || "" })} className="text-[10px] font-semibold text-blue-400">Assess</button></div><p className="mt-2 text-[10px] leading-4 text-ink-faint">{alert.description}</p>{alertForm?.id === alert.id && <div className="mt-3 space-y-2 border-t border-line-subtle pt-3"><select value={alertForm.status} onChange={(event) => setAlertForm((current) => ({ ...current, status: event.target.value }))} className="h-9 w-full rounded-lg border border-line bg-surface-0 px-2.5 text-[10px] text-ink"><option value="">Select outcome</option><option value="reviewing">Reviewing</option><option value="false_positive">False positive</option><option value="true_positive">True positive</option><option value="escalated">Escalated</option><option value="closed">Closed</option></select><textarea value={alertForm.rationale} onChange={(event) => setAlertForm((current) => ({ ...current, rationale: event.target.value }))} rows={2} placeholder="Required rationale" className="w-full rounded-lg border border-line bg-surface-0 px-2.5 py-2 text-[10px] text-ink" /><button type="button" onClick={submitAlert} disabled={busy === `alert-${alert.id}`} className="h-9 w-full rounded-lg bg-white text-[10px] font-semibold text-black disabled:opacity-50">Record assessment</button></div>}</div>
            ))}
            {!(extended.monitoring_alerts || []).length && <p className="rounded-xl border border-line-subtle bg-surface-1/40 px-3 py-4 text-center text-[10px] leading-4 text-ink-faint">No open or historical alerts are recorded for this customer.</p>}
          </div>
        </div>
      </section>

      <section className="rounded-[20px] border border-line-subtle bg-surface-0/30 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><span className="flex items-center gap-2.5"><Ban className="h-4 w-4 text-down" /><h4 className="text-[14px] font-semibold text-ink">Customer activity controls</h4></span><p className="mt-2 max-w-3xl text-[10px] leading-5 text-ink-faint">The recommended freeze is close-only: it blocks new positions, margin changes, deposits and withdrawals while preserving the ability to reduce or close an existing position. Every application and revocation requires a rationale. Direct calls to audited contracts remain outside this off-chain control boundary.</p></div><LockKeyhole className="h-4 w-4 text-ink-ghost" /></div>
        <div className="mt-4 grid gap-2.5 md:grid-cols-[220px_minmax(0,1fr)_auto]"><select value={restrictionType} onChange={(event) => setRestrictionType(event.target.value)} className="h-11 rounded-xl border border-line bg-surface-1 px-3 text-[11px] text-ink"><option value="close_only">Freeze new activity · closing allowed</option><option value="all_activity">All platform activity</option><option value="trading">All trading</option><option value="open_position">Opening positions</option><option value="close_position">Closing positions</option><option value="margin_change">Margin changes</option><option value="collateral_deposit">Collateral deposits</option><option value="collateral_withdrawal">Collateral withdrawals</option></select><input value={restrictionRationale} onChange={(event) => setRestrictionRationale(event.target.value)} placeholder="Required rationale, e.g. law-enforcement request and reference" className="h-11 rounded-xl border border-line bg-surface-1 px-3 text-[11px] text-ink" /><button type="button" onClick={addRestriction} disabled={busy === "restriction"} className="h-11 rounded-xl bg-down px-4 text-[11px] font-semibold text-white disabled:opacity-50">Apply control</button></div>
        <ComplianceEvidencePanel applicationId={context.application.id} documents={extended.compliance_documents || []} purpose="account_restriction" onRefresh={onRefresh} />
        {activeRestrictions.length > 0 && <div className="mt-4 grid gap-2.5 md:grid-cols-2">{activeRestrictions.map((restriction) => <div key={restriction.id} className="rounded-xl border border-down/15 bg-down/[0.04] p-3"><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-semibold text-down">{titleCase(restriction.restriction_type)}</span><button type="button" onClick={() => { const reason = window.prompt("Record why this restriction is being revoked:"); if (reason?.trim()) run(`revoke-${restriction.id}`, () => setEntityRestriction({ applicationId: context.application.id, restrictionType: restriction.restriction_type, active: false, rationale: reason })); }} className="text-[9px] font-semibold text-blue-400">Revoke</button></div><p className="mt-1 text-[10px] leading-4 text-ink-faint">{restriction.rationale}</p></div>)}</div>}
        {(extended.memberships || []).some((membership) => membership.user_id) && <details className="group mt-4 rounded-xl border border-line-subtle bg-surface-1/40"><summary className="cursor-pointer list-none px-3.5 py-3 text-[10px] font-semibold text-ink-muted">Linked member account state <ChevronDown className="ml-1 inline h-3.5 w-3.5 transition-transform group-open:rotate-180" /></summary><div className="space-y-2 border-t border-line-subtle p-3">{extended.memberships.filter((membership) => membership.user_id).map((membership) => <div key={membership.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-0/45 p-2.5"><div className="min-w-0"><p className="truncate text-[10px] text-ink-muted">{membership.email}</p><p className="mt-0.5 text-[9px] text-ink-faint">{membership.frozen ? `Frozen · ${membership.frozen_reason || "No reason shown"}` : "Active"}</p></div><button type="button" onClick={() => { const reason = membership.frozen ? "" : window.prompt("Record the account-freeze rationale:"); if (!membership.frozen && !reason?.trim()) return; run(`member-${membership.user_id}`, () => setMemberAccountFrozen({ userId: membership.user_id, frozen: !membership.frozen, rationale: reason || "" })); }} className={`rounded-lg border px-2.5 py-1.5 text-[9px] font-semibold ${membership.frozen ? "border-up/20 text-up" : "border-down/20 text-down"}`}>{membership.frozen ? "Unfreeze" : "Freeze"}</button></div>)}</div></details>}
      </section>

      {notice && <div className={`flex items-start gap-2 rounded-xl border px-3.5 py-3 text-[11px] leading-5 ${/could not|required|select/i.test(notice) ? "border-down/20 bg-down/[0.05] text-down" : "border-up/20 bg-up/[0.05] text-up"}`}>{/could not|required|select/i.test(notice) ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />}{notice}</div>}
    </div>
  );
}
