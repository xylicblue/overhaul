import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileText,
  LockKeyhole,
  Mail,
  MessageSquareText,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  UserRoundCheck,
  Users,
  WalletCards,
  X,
  XCircle,
} from "lucide-react";
import { supabase } from "../creatclient";
import {
  decideEntityApplication,
  retryEntityDecisionEmail,
  screenEntityWallets,
} from "../services/api";
import { createOnboardingDocumentPreview } from "../services/entityOnboarding";

const FACTORS = [
  ["source_of_funds", "Source of funds"],
  ["ownership", "Ownership structure"],
  ["geography", "Geographic risk"],
  ["wallet", "Wallet screening"],
];

const SUMSUB_GATE_KEYS = new Set([
  "sanctions_name_match",
  "pep_confirmed",
  "unresolved_adverse_media",
  "financial_crime_record",
]);

const FACTOR_GATE_KEYS = {
  ownership: ["ubo_unidentified"],
  geography: ["fatf_grey_jurisdiction", "sanctioned_jurisdiction"],
  wallet: ["high_wallet_risk", "critical_wallet_risk"],
};

const SCORECHAIN_RATING_GATE_KEYS = new Set([
  "high_wallet_risk",
  "critical_wallet_risk",
]);

const titleCase = (value) => String(value || "")
  .replace(/_/g, " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const scoreTone = (band) => ({
  low: "text-up border-up/25 bg-up/[0.07]",
  medium: "text-warn border-warn/25 bg-warn/[0.07]",
  high: "text-down border-down/25 bg-down/[0.07]",
}[band] || "text-ink-muted border-line bg-surface-2");

const walletRiskLabel = (value) => ({
  none: "No identified risk",
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
  critical: "Critical risk",
}[value] || "Awaiting screening");

const statusTone = (ready) => ready
  ? "border-up/20 bg-up/[0.055] text-up"
  : "border-warn/20 bg-warn/[0.055] text-warn";

const formatDate = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

async function fetchEntityReviewContext(applicationId) {
  const [contextResult, decisionResult] = await Promise.all([
    supabase.rpc("admin_entity_risk_context", { p_application_id: applicationId }),
    supabase
      .from("entity_application_decisions")
      .select("*, email_deliveries:entity_application_decision_emails(*)")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (contextResult.error) throw contextResult.error;
  if (decisionResult.error) throw decisionResult.error;
  return {
    ...contextResult.data,
    latest_compliance_decision: decisionResult.data || null,
  };
}

function initialForm(context) {
  const latest = context?.assessments?.[0];
  const derived = context?.derived_inputs?.factors || {};
  const providerInputs = context?.derived_inputs?.provider_inputs || {};
  const applicationCode = derived.isic?.key || context?.application?.isic_class_code || String(context?.application?.isic_division || "").match(/\b\d{4}\b/)?.[0] || "";
  const fired = latest?.gate_results
    ? Object.entries(latest.gate_results).filter(([, value]) => value).map(([key]) => key)
    : [];
  const automaticGates = providerInputs.screening_gates?.gate_keys || [];
  const retainedGates = providerInputs.screening_gates?.ready
    ? fired.filter((key) => !SUMSUB_GATE_KEYS.has(key))
    : fired;
  return {
    isicCode: applicationCode || latest?.isic_code || "",
    source_of_funds: derived.source_of_funds?.key || latest?.source_of_funds_key || "",
    ownership: derived.ownership?.key || latest?.ownership_key || "",
    geography: derived.geography?.key || latest?.geography_key || "",
    wallet: providerInputs.wallet?.key || latest?.wallet_key || "",
    gateKeys: [...new Set([...retainedGates, ...automaticGates])],
    complianceNotes: "",
    manualScore: "",
    manualReason: "",
  };
}

export default function EntityRiskReview({ standalone = false }) {
  const [queue, setQueue] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [context, setContext] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [adjustDerived, setAdjustDerived] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [openingDocumentId, setOpeningDocumentId] = useState("");
  const [documentPreview, setDocumentPreview] = useState(null);
  const [screeningWallet, setScreeningWallet] = useState(false);
  const [walletNotice, setWalletNotice] = useState("");
  const [decisionMode, setDecisionMode] = useState("");
  const [decisionMessage, setDecisionMessage] = useState("");
  const [internalDecisionNote, setInternalDecisionNote] = useState("");
  const [deciding, setDeciding] = useState(false);
  const [decisionNotice, setDecisionNotice] = useState(null);

  const loadQueue = useCallback(async () => {
    const { data, error: queueError } = await supabase.rpc("admin_entity_risk_queue");
    if (queueError) throw queueError;
    const rows = data || [];
    setQueue(rows);
    setSelectedId((current) => current || rows[0]?.application_id || null);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadQueue()
      .catch((loadError) => active && setError(loadError.message || "Could not load the entity risk queue."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [loadQueue]);

  useEffect(() => {
    if (!selectedId) {
      setContext(null);
      setForm(null);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setError("");
    setResult(null);
    setAdjustDerived(false);
    setDocumentsOpen(false);
    setOpeningDocumentId("");
    setDocumentPreview(null);
    setWalletNotice("");
    setDecisionMode("");
    setDecisionMessage("");
    setInternalDecisionNote("");
    setDecisionNotice(null);
    setContext(null);
    setForm(null);
    fetchEntityReviewContext(selectedId)
      .then((data) => {
        if (!active) return;
        setContext(data);
        setForm(initialForm(data));
      })
      .catch((loadError) => active && setError(loadError.message || "Could not load the risk assessment."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [selectedId]);

  useEffect(() => {
    if (!documentPreview) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setDocumentPreview(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [documentPreview]);

  const rulesByFactor = useMemo(() => Object.fromEntries(FACTORS.map(([factor]) => [
    factor,
    (context?.factor_rules || []).filter((rule) => rule.factor === factor),
  ])), [context]);
  const derivedFactors = context?.derived_inputs?.factors || {};
  const isicMatch = context?.isic_match;
  const providerInputs = context?.derived_inputs?.provider_inputs || {};
  const automaticGateKeys = useMemo(
    () => context?.derived_inputs?.provider_inputs?.screening_gates?.gate_keys || [],
    [context],
  );
  const sumsubReady = Boolean(providerInputs.screening_gates?.ready);
  const factorGateKeys = useMemo(() => FACTORS.flatMap(([factor]) => {
    const selectedRule = (rulesByFactor[factor] || []).find((rule) => rule.rule_key === form?.[factor]);
    return selectedRule?.default_gate_key ? [selectedRule.default_gate_key] : [];
  }), [form, rulesByFactor]);
  const factorManagedGateKeys = useMemo(
    () => new Set(Object.entries(FACTOR_GATE_KEYS).flatMap(([factor, gateKeys]) => (
      form?.[factor] ? gateKeys : []
    ))),
    [form],
  );
  const lockedGateKeys = useMemo(
    () => new Set([
      ...(sumsubReady ? SUMSUB_GATE_KEYS : automaticGateKeys),
      ...factorManagedGateKeys,
    ]),
    [automaticGateKeys, factorManagedGateKeys, sumsubReady],
  );
  const gateRows = useMemo(() => (context?.gate_rules || []).map((gate) => {
    const fromSumsub = automaticGateKeys.includes(gate.gate_key);
    const fromFactor = factorGateKeys.includes(gate.gate_key);
    const locked = lockedGateKeys.has(gate.gate_key);
    const checked = fromSumsub || fromFactor || (!locked && form?.gateKeys.includes(gate.gate_key));
    let stateLabel = "Manual confirmation required";
    if (fromSumsub) stateLabel = "Confirmed by Sumsub";
    else if (fromFactor && SCORECHAIN_RATING_GATE_KEYS.has(gate.gate_key)) stateLabel = "Confirmed by Scorechain";
    else if (fromFactor) stateLabel = "Confirmed by risk factor";
    else if (locked && SUMSUB_GATE_KEYS.has(gate.gate_key)) stateLabel = "Cleared by Sumsub";
    else if (locked && SCORECHAIN_RATING_GATE_KEYS.has(gate.gate_key)) stateLabel = "Cleared by Scorechain";
    else if (locked) stateLabel = "Cleared by risk factor";
    else if (checked) stateLabel = "Confirmed by Compliance";
    return { ...gate, checked, locked, stateLabel };
  }), [automaticGateKeys, context?.gate_rules, factorGateKeys, form?.gateKeys, lockedGateKeys]);
  const gateGroups = useMemo(() => ({
    findings: gateRows.filter((gate) => gate.checked),
    manual: gateRows.filter((gate) => !gate.checked && !gate.locked),
    cleared: gateRows.filter((gate) => !gate.checked && gate.locked),
  }), [gateRows]);
  const latestAssessment = context?.assessments?.[0] || null;
  const latestComplianceDecision = context?.latest_compliance_decision || null;
  const applicationStatus = context?.application?.status || "";
  const walletCount = context?.application?.crypto_wallet_addresses?.length || 0;
  const applicationDetails = context ? [
    ["Entity type", titleCase(context.application.entity_type_other || context.application.entity_type)],
    ["Corporate ID", context.application.corporate_identification_number],
    ["Incorporation date", formatDate(context.application.incorporation_date)],
    ["Registered address", context.application.registered_address],
    ["Business address", context.application.business_address_same ? "Same as registered address" : context.application.business_address],
    ["Entity phone", context.application.entity_phone],
    ["Primary contact", context.application.primary_contact_legal_name],
    ["Primary contact phone", context.application.primary_contact_phone],
    ["Stock exchange", context.application.listed_on_stock_exchange ? context.application.stock_exchange_name || "Listed" : "Not listed"],
    ["Financial institution", context.application.is_financial_institution ? titleCase(context.application.financial_institution_type || "Yes") : "No"],
    ["Regulatory registration", context.application.regulatory_registration_number],
    ["Competent authority", context.application.competent_authority],
  ].filter(([, value]) => value && value !== "Not available") : [];
  const canAssess = ["submitted", "under_review", "approved"].includes(context?.application?.status) &&
    context?.application?.identity_verification_status === "completed";
  const assessmentIsCurrent = Boolean(
    latestAssessment?.assessed_at &&
    (!context?.application?.submitted_at || new Date(latestAssessment.assessed_at) >= new Date(context.application.submitted_at)),
  );
  const canDecide = ["submitted", "under_review"].includes(applicationStatus) && assessmentIsCurrent;
  const approvalBlocked = latestAssessment?.decision === "blocked";
  const failedDecisionEmails = (latestComplianceDecision?.email_deliveries || [])
    .filter((delivery) => delivery.status === "failed");
  const filteredQueue = useMemo(() => queue.filter((item) => {
    const matchesStatus = statusFilter === "all" || item.application_status === statusFilter;
    const matchesQuery = !query.trim() || String(item.entity_legal_name || "")
      .toLowerCase()
      .includes(query.trim().toLowerCase());
    return matchesStatus && matchesQuery;
  }), [queue, query, statusFilter]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggleGate = (key) => setForm((current) => ({
    ...current,
    gateKeys: current.gateKeys.includes(key)
      ? current.gateKeys.filter((item) => item !== key)
      : [...current.gateKeys, key],
  }));

  const previewDocument = async (document) => {
    setOpeningDocumentId(document.id);
    setError("");
    try {
      const signedUrl = await createOnboardingDocumentPreview(document);
      setDocumentPreview({ document, signedUrl });
    } catch (previewError) {
      setError(previewError.message || "Could not open the document.");
    } finally {
      setOpeningDocumentId("");
    }
  };

  const runWalletScreening = async () => {
    if (!selectedId) return;
    setScreeningWallet(true);
    setError("");
    setWalletNotice("");
    try {
      const screening = await screenEntityWallets(selectedId, {
        force: Boolean(providerInputs.wallet?.ready),
      });
      const nextContext = await fetchEntityReviewContext(selectedId);
      setContext(nextContext);
      setForm(initialForm(nextContext));
      await loadQueue();
      setWalletNotice(screening.automatic_assessment?.created
        ? `${walletRiskLabel(screening.wallet_key)} · Assessment revision ${screening.automatic_assessment.revision} created`
        : `${walletRiskLabel(screening.wallet_key)} · Screening complete`);
    } catch (screeningError) {
      setError(screeningError.message || "Could not complete Scorechain wallet screening.");
    } finally {
      setScreeningWallet(false);
    }
  };

  const createAssessment = async () => {
    if (!["submitted", "under_review", "approved"].includes(context?.application?.status)) {
      setError("This application can be reviewed now, but risk can be calculated only after it is submitted.");
      return;
    }
    if (context?.application?.identity_verification_status !== "completed") {
      setError("Identity verification must be completed for the primary contact and every connected person before risk is calculated.");
      return;
    }
    if (!form || FACTORS.some(([factor]) => !form[factor]) || !/^\d{4}$/.test(form.isicCode)) {
      setError("Enter a valid four-digit ISIC code and select every risk factor.");
      return;
    }
    const adjustedApplicationInput = (
      (derivedFactors.isic?.ready && form.isicCode !== derivedFactors.isic.key) ||
      ["source_of_funds", "ownership", "geography"].some((factor) =>
        derivedFactors[factor]?.ready && form[factor] !== derivedFactors[factor].key
      )
    );
    if (adjustedApplicationInput && !form.complianceNotes.trim()) {
      setError("Add Compliance notes explaining every change to an application-derived risk input.");
      return;
    }
    if (form.manualScore !== "" && !form.manualReason.trim()) {
      setError("Explain every manual score override before saving it.");
      return;
    }

    setSaving(true);
    setError("");
    setWalletNotice("");
    try {
      const { data, error: saveError } = await supabase.rpc("admin_create_entity_risk_assessment", {
        p_application_id: selectedId,
        p_source_of_funds_key: form.source_of_funds,
        p_ownership_key: form.ownership,
        p_geography_key: form.geography,
        p_wallet_key: form.wallet,
        p_isic_code: form.isicCode,
        p_gate_keys: form.gateKeys,
        p_gate_evidence: form.complianceNotes.trim()
          ? { compliance_notes: form.complianceNotes.trim() }
          : {},
        p_manual_score_override: form.manualScore === "" ? null : Number(form.manualScore),
        p_manual_override_reason: form.manualScore === "" ? null : form.manualReason.trim(),
      });
      if (saveError) throw saveError;
      setResult(data);
      await loadQueue();
      const nextContext = await fetchEntityReviewContext(selectedId);
      setContext(nextContext);
      setForm(initialForm(nextContext));
    } catch (saveError) {
      setError(saveError.message || "Could not create the risk assessment.");
    } finally {
      setSaving(false);
    }
  };

  const chooseDecision = (action) => {
    setDecisionMode(action);
    setDecisionNotice(null);
    setDecisionMessage(action === "approve"
      ? "Your entity application has been approved."
      : "");
    setInternalDecisionNote("");
  };

  const submitDecision = async () => {
    if (!canDecide || !decisionMode) return;
    if (["reject", "request_information"].includes(decisionMode) && !decisionMessage.trim()) {
      setError(decisionMode === "request_information"
        ? "List the additional information the client must provide."
        : "Add the client-facing rejection message before continuing.");
      return;
    }
    if (decisionMode === "approve" && approvalBlocked) {
      setError("This assessment contains a blocking gate and cannot be approved.");
      return;
    }

    setDeciding(true);
    setError("");
    setDecisionNotice(null);
    try {
      const response = await decideEntityApplication({
        applicationId: selectedId,
        action: decisionMode,
        clientMessage: decisionMessage.trim(),
        internalNote: internalDecisionNote.trim(),
      });
      await loadQueue();
      const nextContext = await fetchEntityReviewContext(selectedId);
      setContext(nextContext);
      setForm(initialForm(nextContext));
      setDecisionMode("");
      const failed = Number(response.email?.failed || 0);
      const sent = Number(response.email?.sent || 0);
      setDecisionNotice({
        tone: failed ? "warning" : "success",
        decisionId: response.decision?.decision_id,
        message: failed
          ? `Decision saved. ${sent} email${sent === 1 ? "" : "s"} sent; ${failed} require a retry.`
          : `Decision saved and ${sent} email${sent === 1 ? "" : "s"} sent.`,
      });
    } catch (decisionError) {
      setError(decisionError.message || "Could not complete the Compliance decision.");
    } finally {
      setDeciding(false);
    }
  };

  const retryDecisionEmail = async () => {
    const decisionId = latestComplianceDecision?.id || decisionNotice?.decisionId;
    if (!decisionId) return;
    setDeciding(true);
    setError("");
    try {
      const response = await retryEntityDecisionEmail(decisionId);
      const nextContext = await fetchEntityReviewContext(selectedId);
      setContext(nextContext);
      const failed = Number(response.email?.failed || 0);
      setDecisionNotice({
        tone: failed ? "warning" : "success",
        decisionId,
        message: failed ? `${failed} email${failed === 1 ? "" : "s"} still require attention.` : "All decision emails have been sent.",
      });
    } catch (retryError) {
      setError(retryError.message || "Could not retry the decision email.");
    } finally {
      setDeciding(false);
    }
  };

  const renderGate = (gate, emphasis = "neutral") => {
    const isBlock = gate.action === "BLOCK";
    const tone = emphasis === "finding"
      ? isBlock
        ? "border-down/25 bg-down/[0.055]"
        : "border-warn/25 bg-warn/[0.055]"
      : "border-line-subtle bg-surface-0/35";
    return (
      <label
        key={gate.gate_key}
        className={`flex min-h-[76px] items-start gap-3 rounded-2xl border p-3.5 transition-colors ${gate.locked ? "cursor-default" : "cursor-pointer hover:border-line hover:bg-surface-2/60"} ${tone}`}
      >
        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${gate.checked ? (isBlock ? "border-down bg-down text-white" : "border-warn bg-warn text-black") : "border-line-strong bg-surface-0 text-transparent"}`}>
          {gate.checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
          <input
            type="checkbox"
            checked={gate.checked}
            onChange={() => toggleGate(gate.gate_key)}
            disabled={gate.locked}
            className="sr-only"
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium leading-5 text-ink">{gate.label}</span>
          <span className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px]">
            <span className={`font-semibold ${isBlock ? "text-down" : "text-warn"}`}>
              {isBlock ? "Blocks onboarding" : "Forces high risk"}
            </span>
            <span className="text-ink-ghost">·</span>
            <span className={gate.checked ? "text-ink-muted" : "text-ink-faint"}>{gate.stateLabel}</span>
          </span>
        </span>
        {gate.locked && <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-ghost" aria-label="Managed automatically" />}
      </label>
    );
  };

  return (
    <section className={`${standalone ? "" : "mb-6"} overflow-hidden rounded-[22px] border border-white/[0.07] bg-surface-1 shadow-[0_24px_80px_rgba(0,0,0,0.28)]`}>
      <div className="flex flex-col gap-3 border-b border-line-subtle px-5 py-5 md:flex-row md:items-end md:justify-between md:px-7">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-ink-faint">
            <ShieldCheck className="h-4 w-4" />
            Entity Compliance
          </div>
          <h2 className="text-[22px] font-semibold tracking-[-0.025em] text-ink">Application review</h2>
          <p className="mt-1.5 text-[13px] leading-5 text-ink-faint">Review evidence, confirm risk signals, and record an auditable decision.</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-ink-faint">
          <span>{queue.length} applications</span>
          <span className="text-ink-ghost">·</span>
          <span>Model {context?.model?.version || "2026-08-06"}</span>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 border-b border-down/20 bg-down/[0.065] px-5 py-3.5 text-[13px] leading-5 text-down md:px-7">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid min-h-[720px] lg:grid-cols-[330px_minmax(0,1fr)]">
        <aside className="border-b border-line-subtle bg-surface-0/45 p-4 lg:border-b-0 lg:border-r lg:p-5">
          <div className="mb-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-ghost" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search applications"
                aria-label="Search entity applications"
                className="h-11 w-full rounded-xl border border-line bg-surface-1 pl-10 pr-3 text-[13px] text-ink outline-none placeholder:text-ink-ghost focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>
            <div className="relative mt-2.5">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter applications by status"
                className="h-10 w-full appearance-none rounded-xl border border-line bg-surface-1 px-3 pr-9 text-[12px] text-ink-muted outline-none focus:border-blue-500/50"
              >
                <option value="all">All application states</option>
                {["draft", "in_progress", "submitted", "under_review", "information_requested", "approved", "rejected"].map((status) => (
                  <option key={status} value={status}>{titleCase(status)}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-ghost" />
            </div>
          </div>
          <div className="mb-2 flex items-center justify-between px-2">
            <p className="text-[11px] font-semibold text-ink-muted">Applications</p>
            <span className="text-[10px] text-ink-ghost">{filteredQueue.length}</span>
          </div>
          {filteredQueue.length === 0 && !loading ? (
            <p className="px-2 py-10 text-center text-[13px] text-ink-faint">No matching applications.</p>
          ) : filteredQueue.map((item) => (
            <button
              type="button"
              key={item.application_id}
              onClick={() => setSelectedId(item.application_id)}
              className={`group mb-1.5 flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all ${selectedId === item.application_id ? "border-blue-500/25 bg-blue-500/[0.08]" : "border-transparent hover:border-line-subtle hover:bg-surface-2/70"}`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[13px] font-semibold ${selectedId === item.application_id ? "bg-blue-500/15 text-blue-300" : "bg-surface-2 text-ink-muted"}`}>
                {(item.entity_legal_name || "E").trim().charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-ink">{item.entity_legal_name || "Unnamed entity"}</span>
                <span className="mt-1 block truncate text-[11px] text-ink-faint">
                  {titleCase(item.application_status)} · {item.latest_assessment_id ? `Revision ${item.latest_revision}` : "Not assessed"}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {item.decision === "blocked" ? (
                  <span className="h-2 w-2 rounded-full bg-down" title="Blocked" />
                ) : item.final_band ? (
                  <span className={`h-2 w-2 rounded-full ${item.final_band === "low" ? "bg-up" : item.final_band === "medium" ? "bg-warn" : "bg-down"}`} title={`${titleCase(item.final_band)} risk`} />
                ) : null}
                <ChevronRight className={`h-4 w-4 transition-transform ${selectedId === item.application_id ? "text-blue-400" : "text-ink-ghost group-hover:translate-x-0.5 group-hover:text-ink-faint"}`} />
              </span>
            </button>
          ))}
        </aside>

        <div className="bg-surface-1 p-4 md:p-6 xl:p-8">
          {loading && !context ? (
            <div className="flex h-full min-h-[520px] items-center justify-center gap-3 text-[13px] text-ink-faint">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading application…
            </div>
          ) : !context || !form ? (
            <div className="flex h-full min-h-[520px] flex-col items-center justify-center text-center">
              <Building2 className="h-7 w-7 text-ink-ghost" />
              <p className="mt-4 text-[15px] font-medium text-ink-muted">Select an application</p>
              <p className="mt-1 text-[12px] text-ink-faint">Choose an entity from the list to begin the review.</p>
            </div>
          ) : (
            <div>
                <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3.5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface-2 text-[16px] font-semibold text-ink">
                      {(context.application.entity_legal_name || "E").trim().charAt(0).toUpperCase()}
                    </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[22px] font-semibold tracking-[-0.025em] text-ink">{context.application.entity_legal_name}</h3>
                      <span className="rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[10px] font-medium text-ink-muted">{titleCase(applicationStatus)}</span>
                    </div>
                    <p className="mt-1.5 text-[12px] text-ink-faint">
                      {context.connected_persons.length} connected person{context.connected_persons.length === 1 ? "" : "s"}
                      {context.application.is_financial_institution ? " · Tier 3 · Enhanced due diligence" : " · Tier 2 review"}
                    </p>
                  </div>
                  </div>
                  {latestAssessment ? (
                    <div className={`min-w-[168px] rounded-2xl border px-4 py-3 text-right ${scoreTone(latestAssessment.final_band)}`}>
                      <span className="block text-[10px] font-medium opacity-70">Latest assessment</span>
                      <span className="mt-0.5 block text-[17px] font-semibold tracking-[-0.01em]">
                        {latestAssessment.decision === "blocked"
                          ? "Blocked"
                          : `${Number(latestAssessment.effective_score).toFixed(2)} · ${titleCase(latestAssessment.final_band)} risk`}
                      </span>
                      <span className="mt-1 block text-[10px] opacity-70">Revision {latestAssessment.revision}</span>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-line bg-surface-0/40 px-4 py-3 text-right">
                      <span className="block text-[10px] text-ink-faint">Latest assessment</span>
                      <span className="mt-0.5 block text-[14px] font-medium text-ink-muted">Not yet assessed</span>
                    </div>
                  )}
                </div>

                {Boolean(context.derived_inputs?.warnings?.length || context.derived_inputs?.missing?.length) && (
                  <div className="mb-6 flex items-start gap-3 rounded-2xl border border-warn/20 bg-warn/[0.05] px-4 py-3.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
                    <div>
                    <p className="text-[12px] font-semibold text-warn">Review required</p>
                    {context.derived_inputs?.missing?.length > 0 && (
                      <p className="mt-1 text-[12px] leading-5 text-ink-muted">
                        Missing inputs: {context.derived_inputs.missing.map(titleCase).join(", ")}.
                      </p>
                    )}
                    {(context.derived_inputs?.warnings || []).map((warning) => (
                      <p key={warning} className="mt-1 text-[11px] leading-5 text-ink-faint">{warning}</p>
                    ))}
                    </div>
                  </div>
                )}

                <div className="mb-7 grid gap-3 md:grid-cols-3">
                  <div className={`rounded-2xl border p-4 ${statusTone(context.application.identity_verification_status === "completed")}`}>
                    <div className="flex items-center justify-between">
                      <UserRoundCheck className="h-5 w-5" />
                      {context.application.identity_verification_status === "completed" ? <Check className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                    </div>
                    <p className="mt-4 text-[12px] font-semibold text-ink">Identity verification</p>
                    <p className="mt-1 text-[11px] text-ink-faint">{context.application.identity_verification_status === "completed" ? "All required people verified" : titleCase(context.application.identity_verification_status)}</p>
                  </div>
                  <div className={`rounded-2xl border p-4 ${statusTone(providerInputs.screening_gates?.ready)}`}>
                    <div className="flex items-center justify-between">
                      <ShieldCheck className="h-5 w-5" />
                      {providerInputs.screening_gates?.ready ? <Check className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                    </div>
                    <p className="mt-4 text-[12px] font-semibold text-ink">Sumsub screening</p>
                    <p className="mt-1 text-[11px] text-ink-faint">
                      {providerInputs.screening_gates?.ready ? "All subjects screened" : `${providerInputs.screening_gates?.completed_subjects || 0} of ${providerInputs.screening_gates?.expected_subjects || 0} complete`}
                    </p>
                  </div>
                  <div className={`rounded-2xl border p-4 ${statusTone(providerInputs.wallet?.ready)}`}>
                    <div className="flex items-center justify-between">
                      <WalletCards className="h-5 w-5" />
                      {providerInputs.wallet?.ready ? <Check className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                    </div>
                    <p className="mt-4 text-[12px] font-semibold text-ink">Wallet screening</p>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <p className="text-[11px] text-ink-faint">{providerInputs.wallet?.ready ? walletRiskLabel(providerInputs.wallet.key) : `${walletCount} wallet${walletCount === 1 ? "" : "s"} waiting`}</p>
                      {!["draft", "in_progress", "rejected"].includes(applicationStatus) && (
                        <button type="button" onClick={runWalletScreening} disabled={screeningWallet} className="shrink-0 text-[11px] font-semibold text-blue-400 hover:text-blue-300 disabled:cursor-wait disabled:opacity-60">
                          {screeningWallet ? "Screening…" : providerInputs.wallet?.ready ? "Rescreen" : "Run now"}
                        </button>
                      )}
                    </div>
                    {walletNotice && (
                      <p className="mt-2 border-t border-current/10 pt-2 text-[10px] font-medium leading-4 opacity-80">
                        {walletNotice}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="space-y-6">

                <section className="rounded-[20px] border border-line-subtle bg-surface-0/30 p-5 md:p-6">
                  <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="text-[16px] font-semibold tracking-[-0.01em] text-ink">Risk factors</h4>
                      <p className="mt-1 text-[12px] leading-5 text-ink-faint">Values sourced from the application and verified screening providers.</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${context.derived_inputs?.assessment_ready ? "border-up/20 bg-up/[0.06] text-up" : "border-line bg-surface-2 text-ink-faint"}`}>
                      {context.derived_inputs?.assessment_ready ? "Ready to assess" : "Pending inputs"}
                    </span>
                  </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 flex items-center justify-between text-[12px] font-medium text-ink-muted">
                      ISIC class
                      {derivedFactors.isic?.ready && <em className="not-italic text-[9px] font-semibold text-up">Application</em>}
                    </span>
                    <input
                      value={form.isicCode}
                      onChange={(event) => update("isicCode", event.target.value.replace(/\D/g, "").slice(0, 4))}
                      readOnly={derivedFactors.isic?.ready && !adjustDerived}
                      inputMode="numeric"
                      placeholder="Four-digit code"
                      className="h-12 w-full rounded-xl border border-line bg-surface-1 px-3.5 text-[14px] text-ink outline-none transition-shadow focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10 read-only:cursor-default read-only:text-ink-muted"
                    />
                    {isicMatch?.class_name && form.isicCode === isicMatch.code && (
                      <span className="mt-2 block text-[11px] leading-5 text-ink-faint">
                        {isicMatch.class_name} · {titleCase(isicMatch.risk_level)} risk · {isicMatch.score}/10
                      </span>
                    )}
                  </label>
                  {FACTORS.map(([factor, label]) => (
                    <label className="block" key={factor}>
                      <span className="mb-2 flex items-center justify-between text-[12px] font-medium text-ink-muted">
                        {label}
                        {derivedFactors[factor]?.ready && <em className="not-italic text-[9px] font-semibold text-up">Application</em>}
                        {factor === "wallet" && providerInputs.wallet?.ready && <em className="not-italic text-[9px] font-semibold text-up">Scorechain</em>}
                        {factor === "wallet" && !providerInputs.wallet?.ready && <em className="not-italic text-[9px] font-semibold text-ink-faint">Awaiting Scorechain</em>}
                      </span>
                      <select
                        value={form[factor]}
                        onChange={(event) => update(factor, event.target.value)}
                        disabled={(derivedFactors[factor]?.ready && !adjustDerived) || (factor === "wallet" && providerInputs.wallet?.ready)}
                        className="h-12 w-full rounded-xl border border-line bg-surface-1 px-3.5 text-[13px] text-ink outline-none transition-shadow focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-default disabled:text-ink-muted disabled:opacity-80"
                      >
                        <option value="">Select category</option>
                        {(rulesByFactor[factor] || []).map((rule) => (
                          <option key={rule.rule_key} value={rule.rule_key}>
                            {rule.label} · {rule.score}/10
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>

                {Object.values(derivedFactors).some((factor) => factor?.ready) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (adjustDerived) {
                        setForm((current) => ({
                          ...current,
                          isicCode: derivedFactors.isic?.key || current.isicCode,
                          source_of_funds: derivedFactors.source_of_funds?.key || current.source_of_funds,
                          ownership: derivedFactors.ownership?.key || current.ownership,
                          geography: derivedFactors.geography?.key || current.geography,
                        }));
                      }
                      setAdjustDerived((current) => !current);
                    }}
                    className="mt-4 text-[11px] font-medium text-blue-400 transition-colors hover:text-blue-300"
                  >
                    {adjustDerived ? "Use application-derived values" : "Adjust application-derived values"}
                  </button>
                )}
                </section>

                <section className="rounded-[20px] border border-line-subtle bg-surface-0/30 p-5 md:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="text-[16px] font-semibold tracking-[-0.01em] text-ink">Risk gates</h4>
                      <p className="mt-1 max-w-2xl text-[12px] leading-5 text-ink-faint">Provider-managed checks are locked. Only items requiring Compliance judgement can be changed manually.</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${gateGroups.findings.length ? "border-down/20 bg-down/[0.06] text-down" : "border-up/20 bg-up/[0.06] text-up"}`}>
                      {gateGroups.findings.length ? `${gateGroups.findings.length} active finding${gateGroups.findings.length === 1 ? "" : "s"}` : "No active findings"}
                    </span>
                  </div>

                  {gateGroups.findings.length > 0 && (
                    <div className="mt-5">
                      <div className="mb-2.5 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-down" />
                        <h5 className="text-[12px] font-semibold text-ink">Active findings</h5>
                      </div>
                      <div className="grid gap-2.5 xl:grid-cols-2">
                        {gateGroups.findings.map((gate) => renderGate(gate, "finding"))}
                      </div>
                    </div>
                  )}

                  {gateGroups.manual.length > 0 && (
                    <div className="mt-6">
                      <div className="mb-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4 text-ink-faint" />
                          <h5 className="text-[12px] font-semibold text-ink">Manual confirmation</h5>
                        </div>
                        <span className="text-[10px] text-ink-ghost">Select only confirmed matches</span>
                      </div>
                      <div className="grid gap-2.5 xl:grid-cols-2">
                        {gateGroups.manual.map((gate) => renderGate(gate))}
                      </div>
                    </div>
                  )}

                  {gateGroups.cleared.length > 0 && (
                    <details className="group mt-6 rounded-2xl border border-line-subtle bg-surface-1/50">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5">
                        <span className="flex items-center gap-2 text-[12px] font-medium text-ink-muted">
                          <ShieldCheck className="h-4 w-4 text-up" />
                          Automatically cleared checks
                          <span className="text-ink-ghost">({gateGroups.cleared.length})</span>
                        </span>
                        <ChevronDown className="h-4 w-4 text-ink-ghost transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="grid gap-2.5 border-t border-line-subtle p-3 xl:grid-cols-2">
                        {gateGroups.cleared.map((gate) => renderGate(gate))}
                      </div>
                    </details>
                  )}
                </section>
              </div>

              <aside className="space-y-4 self-start 2xl:sticky 2xl:top-5">
                <section className="rounded-[20px] border border-line-subtle bg-surface-0/30 p-5">
                  <div className="flex items-center gap-2.5">
                    <Building2 className="h-4 w-4 text-ink-faint" />
                    <h4 className="text-[14px] font-semibold text-ink">Application details</h4>
                  </div>
                  <dl className="mt-4 divide-y divide-line-subtle text-[12px]">
                    <div className="flex items-center justify-between gap-4 py-3 first:pt-0">
                      <dt className="text-ink-faint">Application state</dt>
                      <dd className="font-medium text-ink-muted">{titleCase(applicationStatus)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-3">
                      <dt className="text-ink-faint">Submitted</dt>
                      <dd className="font-medium text-ink-muted">{formatDate(context.application.submitted_at)}</dd>
                    </div>
                    <div className="py-3">
                      <dt className="text-ink-faint">Declared ISIC class</dt>
                      <dd className="mt-1.5 text-ink-muted">
                        <span className="font-medium text-ink">{context.application.isic_class_code || context.application.isic_division || "—"}</span>
                        {isicMatch?.class_name && <span className="mt-1 block text-[11px] leading-5 text-ink-faint">{isicMatch.class_name}</span>}
                      </dd>
                    </div>
                    <div className="py-3">
                      <dt className="text-ink-faint">Declared source of funds</dt>
                      <dd className="mt-1.5 whitespace-pre-wrap leading-5 text-ink-muted">{context.application.source_of_funds || "—"}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-4 py-3">
                      <dt className="text-ink-faint">Incorporation</dt>
                      <dd className="max-w-[58%] text-right leading-5 text-ink-muted">{context.application.incorporation_place || "—"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-3">
                      <dt className="text-ink-faint">Documents</dt>
                      <dd className="flex items-center gap-3 text-ink-muted">
                        <span>{context.document_records?.length || 0}</span>
                        {(context.document_records?.length || 0) > 0 && (
                          <button type="button" onClick={() => setDocumentsOpen((current) => !current)} className="flex items-center gap-1 font-semibold text-blue-400 hover:text-blue-300">
                            {documentsOpen ? "Hide" : "Review"}
                            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${documentsOpen ? "rotate-90" : ""}`} />
                          </button>
                        )}
                      </dd>
                    </div>
                  </dl>
                  <details className="group mt-3 rounded-xl border border-line-subtle bg-surface-1/50">
                    <summary className="flex cursor-pointer list-none items-center justify-between px-3.5 py-3 text-[11px] font-medium text-ink-muted">
                      Full application information
                      <ChevronDown className="h-3.5 w-3.5 text-ink-ghost transition-transform group-open:rotate-180" />
                    </summary>
                    <dl className="divide-y divide-line-subtle border-t border-line-subtle px-3.5 text-[11px]">
                      {applicationDetails.map(([label, value]) => (
                        <div key={label} className="py-3">
                          <dt className="text-ink-ghost">{label}</dt>
                          <dd className="mt-1 break-words leading-5 text-ink-muted">{value}</dd>
                        </div>
                      ))}
                      <div className="py-3">
                        <dt className="text-ink-ghost">Declared wallets</dt>
                        <dd className="mt-1.5 space-y-1.5">
                          {(context.application.crypto_wallet_addresses || []).map((address) => (
                            <span key={address} className="block break-all rounded-lg bg-surface-0 px-2.5 py-2 font-mono text-[9px] leading-4 text-ink-faint">{address}</span>
                          ))}
                          {walletCount === 0 && <span className="text-ink-ghost">No wallets supplied</span>}
                        </dd>
                      </div>
                    </dl>
                  </details>
                </section>

                {documentsOpen && context.document_records?.length > 0 && (
                  <section className="rounded-[20px] border border-line-subtle bg-surface-0/30 p-5">
                    <div className="flex items-center gap-2.5">
                      <FileText className="h-4 w-4 text-ink-faint" />
                      <h4 className="text-[14px] font-semibold text-ink">Submitted documents</h4>
                    </div>
                    <div className="mt-4 space-y-2.5">
                      {context.document_records.map((document) => {
                        const person = context.connected_persons.find((item) => item.id === document.connected_person_id);
                        return (
                          <div key={document.id} className="rounded-2xl border border-line-subtle bg-surface-1/60 p-3.5">
                            <div className="flex items-start gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-faint"><FileText className="h-4 w-4" /></span>
                              <div className="min-w-0">
                                <p className="break-words text-[12px] font-medium leading-5 text-ink-muted">{document.original_filename || titleCase(document.category)}</p>
                                <p className="mt-0.5 text-[10px] leading-4 text-ink-faint">
                                  {titleCase(document.category)}{person ? ` · ${person.full_name}` : ""}
                                  {document.size_bytes ? ` · ${(Number(document.size_bytes) / 1024 / 1024).toFixed(2)} MB` : ""}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => previewDocument(document)}
                              disabled={openingDocumentId === document.id}
                              className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-blue-400 hover:text-blue-300 disabled:cursor-wait disabled:opacity-60"
                            >
                              {openingDocumentId === document.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <LockKeyhole className="h-3.5 w-3.5" />}
                              {openingDocumentId === document.id ? "Opening…" : "Open secure preview"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {context.connected_persons.length > 0 && (
                  <section className="rounded-[20px] border border-line-subtle bg-surface-0/30 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2.5">
                        <Users className="h-4 w-4 text-ink-faint" />
                        <h4 className="text-[14px] font-semibold text-ink">Connected people</h4>
                      </span>
                      <span className="text-[10px] text-ink-ghost">{context.connected_persons.length}</span>
                    </div>
                    <div className="mt-4 space-y-2.5">
                      {context.connected_persons.map((person) => (
                        <div key={person.id} className="flex items-center gap-3 rounded-2xl border border-line-subtle bg-surface-1/60 p-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-semibold text-ink-muted">{(person.full_name || "P").trim().charAt(0).toUpperCase()}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-medium text-ink-muted">{person.full_name}</p>
                            <p className="mt-0.5 truncate text-[10px] text-ink-faint">{(person.roles || []).map(titleCase).join(", ")}</p>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${person.sumsub_review_status === "approved" ? "bg-up/[0.08] text-up" : "bg-warn/[0.08] text-warn"}`}>{titleCase(person.sumsub_review_status)}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section className="rounded-[20px] border border-line-subtle bg-surface-0/30 p-5">
                  <div className="mb-4">
                    <h4 className="text-[14px] font-semibold text-ink">Decision record</h4>
                    <p className="mt-1 text-[11px] leading-5 text-ink-faint">Add the rationale that should remain with this assessment revision.</p>
                  </div>
                <label className="block">
                  <span className="mb-2 block text-[12px] font-medium text-ink-muted">Compliance notes</span>
                  <textarea
                    value={form.complianceNotes}
                    onChange={(event) => update("complianceNotes", event.target.value)}
                    rows={4}
                    className="w-full resize-y rounded-xl border border-line bg-surface-1 px-3.5 py-3 text-[12px] leading-5 text-ink outline-none transition-shadow placeholder:text-ink-ghost focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10"
                    placeholder="Evidence reviewed, findings, and rationale"
                  />
                </label>

                <details className="group mt-4 rounded-xl border border-line-subtle bg-surface-1/50">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-3.5 py-3 text-[11px] font-medium text-ink-muted">
                    Manual score override
                    <ChevronDown className="h-3.5 w-3.5 text-ink-ghost transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="border-t border-line-subtle p-3.5">
                  <p className="mb-2 text-[10px] leading-4 text-ink-faint">Optional. Overrides become permanent audit records and require a reason.</p>
                  <input
                    value={form.manualScore}
                    onChange={(event) => update("manualScore", event.target.value)}
                    type="number"
                    min="0"
                    max="10"
                    step="0.01"
                    placeholder="0.00–10.00"
                    className="h-11 w-full rounded-xl border border-line bg-surface-0 px-3.5 text-[13px] text-ink outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10"
                  />
                  {form.manualScore !== "" && (
                    <textarea
                      value={form.manualReason}
                      onChange={(event) => update("manualReason", event.target.value)}
                      rows={3}
                      className="mt-2.5 w-full resize-y rounded-xl border border-line bg-surface-0 px-3.5 py-3 text-[12px] leading-5 text-ink outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10"
                      placeholder="Required reason for override"
                    />
                  )}
                  </div>
                </details>

                <button
                  type="button"
                  onClick={createAssessment}
                  disabled={saving || !canAssess}
                  title={!canAssess ? "Submit the application and complete every identity verification first." : undefined}
                  className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-[13px] font-semibold text-black shadow-[0_8px_30px_rgba(255,255,255,0.08)] transition-all hover:bg-white/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving
                    ? "Calculating…"
                    : !["submitted", "under_review", "approved"].includes(context.application.status)
                      ? "Awaiting submission"
                      : context.application.identity_verification_status !== "completed"
                        ? "Awaiting identity checks"
                      : context.assessments?.length ? "Create assessment revision" : "Calculate risk"}
                  {!saving && canAssess && <ChevronRight className="h-4 w-4" />}
                </button>
                {result && (
                  <p className="mt-3 rounded-xl border border-up/15 bg-up/[0.05] px-3 py-2.5 text-center text-[11px] leading-5 text-up">
                    {result.message || `Revision ${result.revision} saved to the audit trail.`}
                  </p>
                )}
                <p className="mt-3 flex items-center justify-center gap-1.5 text-[9px] text-ink-ghost">
                  <LockKeyhole className="h-3 w-3" />
                  Saved as an immutable audit revision
                </p>

                <div className="mt-6 border-t border-line-subtle pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[12px] font-semibold text-ink">Final decision</p>
                      <p className="mt-1 text-[10px] leading-4 text-ink-faint">
                        Recorded decisions are permanent and the client is notified by email.
                      </p>
                    </div>
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-ink-ghost" />
                  </div>

                  {latestComplianceDecision ? (
                    <div className={`mt-4 rounded-2xl border p-4 ${
                      latestComplianceDecision.action === "approve"
                        ? "border-up/20 bg-up/[0.055]"
                        : latestComplianceDecision.action === "reject"
                          ? "border-down/20 bg-down/[0.055]"
                          : "border-warn/20 bg-warn/[0.055]"
                    }`}>
                      <div className="flex items-center gap-2">
                        {latestComplianceDecision.action === "approve" ? (
                          <CheckCircle2 className="h-4 w-4 text-up" />
                        ) : latestComplianceDecision.action === "reject" ? (
                          <XCircle className="h-4 w-4 text-down" />
                        ) : (
                          <MessageSquareText className="h-4 w-4 text-warn" />
                        )}
                        <p className="text-[12px] font-semibold text-ink">
                          {latestComplianceDecision.action === "approve"
                            ? "Application approved"
                            : latestComplianceDecision.action === "reject"
                              ? "Application rejected"
                              : "Additional information requested"}
                        </p>
                      </div>
                      <p className="mt-3 whitespace-pre-line text-[11px] leading-5 text-ink-muted">
                        {latestComplianceDecision.client_message}
                      </p>
                      <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[10px] text-ink-faint">
                        <span>{formatDate(latestComplianceDecision.created_at)}</span>
                        <span>
                          {(latestComplianceDecision.email_deliveries || []).filter((item) => item.status === "sent").length}
                          /{(latestComplianceDecision.email_deliveries || []).length} emails sent
                        </span>
                      </div>
                      {failedDecisionEmails.length > 0 && (
                        <button
                          type="button"
                          onClick={retryDecisionEmail}
                          disabled={deciding}
                          className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-warn/25 bg-warn/[0.08] text-[11px] font-semibold text-warn hover:bg-warn/[0.13] disabled:opacity-50"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${deciding ? "animate-spin" : ""}`} />
                          Retry {failedDecisionEmails.length} failed email{failedDecisionEmails.length === 1 ? "" : "s"}
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {!latestAssessment ? (
                        <div className="mt-4 rounded-xl border border-line-subtle bg-surface-0/40 px-3.5 py-3 text-[11px] leading-5 text-ink-faint">
                          Calculate and save the risk assessment before selecting an outcome.
                        </div>
                      ) : !canDecide ? (
                        <div className="mt-4 rounded-xl border border-line-subtle bg-surface-0/40 px-3.5 py-3 text-[11px] leading-5 text-ink-faint">
                          {applicationStatus === "information_requested"
                            ? "Waiting for the client to update and resubmit the application."
                            : "A current assessment and an application awaiting review are required."}
                        </div>
                      ) : (
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => chooseDecision("request_information")}
                            className={`rounded-xl border px-2 py-3 text-center transition-colors ${decisionMode === "request_information" ? "border-warn/40 bg-warn/[0.11] text-warn" : "border-line bg-surface-0/45 text-ink-muted hover:bg-surface-2"}`}
                          >
                            <MessageSquareText className="mx-auto h-4 w-4" />
                            <span className="mt-1.5 block text-[9px] font-semibold leading-3">Request info</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => chooseDecision("reject")}
                            className={`rounded-xl border px-2 py-3 text-center transition-colors ${decisionMode === "reject" ? "border-down/40 bg-down/[0.11] text-down" : "border-line bg-surface-0/45 text-ink-muted hover:bg-surface-2"}`}
                          >
                            <XCircle className="mx-auto h-4 w-4" />
                            <span className="mt-1.5 block text-[9px] font-semibold leading-3">Reject</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => chooseDecision("approve")}
                            disabled={approvalBlocked}
                            title={approvalBlocked ? "Resolve the blocking risk gates before approval." : undefined}
                            className={`rounded-xl border px-2 py-3 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${decisionMode === "approve" ? "border-up/40 bg-up/[0.11] text-up" : "border-line bg-surface-0/45 text-ink-muted hover:bg-surface-2"}`}
                          >
                            <CheckCircle2 className="mx-auto h-4 w-4" />
                            <span className="mt-1.5 block text-[9px] font-semibold leading-3">Approve</span>
                          </button>
                        </div>
                      )}

                      {decisionMode && canDecide && (
                        <div className="mt-3 rounded-2xl border border-line-subtle bg-surface-0/45 p-3.5">
                          <label className="block">
                            <span className="text-[10px] font-semibold text-ink-muted">
                              {decisionMode === "request_information"
                                ? "Information required from the client"
                                : decisionMode === "reject"
                                  ? "Client-facing decision message"
                                  : "Approval message"}
                            </span>
                            <textarea
                              value={decisionMessage}
                              onChange={(event) => setDecisionMessage(event.target.value)}
                              rows={decisionMode === "approve" ? 3 : 5}
                              maxLength={5000}
                              placeholder={decisionMode === "request_information"
                                ? "List each required document or clarification on a separate line."
                                : decisionMode === "reject"
                                  ? "Provide the clear message that will be sent to the primary contact."
                                  : "Optional message included in the approval email."}
                              className="mt-2 w-full resize-y rounded-xl border border-line bg-surface-1 px-3 py-2.5 text-[11px] leading-5 text-ink outline-none placeholder:text-ink-ghost focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10"
                            />
                          </label>
                          <details className="mt-2.5">
                            <summary className="cursor-pointer text-[10px] font-medium text-ink-faint">Add internal note</summary>
                            <textarea
                              value={internalDecisionNote}
                              onChange={(event) => setInternalDecisionNote(event.target.value)}
                              rows={3}
                              maxLength={5000}
                              placeholder="Internal rationale. This is not sent to the client."
                              className="mt-2 w-full resize-y rounded-xl border border-line bg-surface-1 px-3 py-2.5 text-[11px] leading-5 text-ink outline-none placeholder:text-ink-ghost focus:border-blue-500/60"
                            />
                          </details>
                          {decisionMode === "approve" && (
                            <p className="mt-2.5 text-[9px] leading-4 text-ink-faint">
                              Approval activates email-bound entity memberships for the representative and every connected person.
                            </p>
                          )}
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => setDecisionMode("")}
                              disabled={deciding}
                              className="h-10 flex-1 rounded-xl border border-line text-[11px] font-semibold text-ink-muted hover:bg-surface-2 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={submitDecision}
                              disabled={deciding}
                              className={`flex h-10 flex-[1.6] items-center justify-center gap-2 rounded-xl text-[11px] font-semibold disabled:opacity-50 ${decisionMode === "approve" ? "bg-up text-black" : decisionMode === "reject" ? "bg-down text-white" : "bg-warn text-black"}`}
                            >
                              {deciding ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                              {decisionMode === "approve" ? "Approve and notify" : decisionMode === "reject" ? "Reject and notify" : "Send request"}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {decisionNotice && (
                    <div className={`mt-3 rounded-xl border px-3 py-2.5 text-[10px] leading-4 ${decisionNotice.tone === "success" ? "border-up/20 bg-up/[0.055] text-up" : "border-warn/20 bg-warn/[0.055] text-warn"}`}>
                      {decisionNotice.message}
                    </div>
                  )}
                </div>
                </section>
              </aside>
            </div>
            </div>
          )}
        </div>
      </div>
      {documentPreview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDocumentPreview(null);
          }}
        >
          <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[22px] border border-line bg-surface-1 shadow-[0_30px_120px_rgba(0,0,0,0.65)]" role="dialog" aria-modal="true" aria-label="Document preview">
            <div className="flex items-center justify-between gap-4 border-b border-line-subtle px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-faint"><FileText className="h-4 w-4" /></span>
                <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-ink">{documentPreview.document.original_filename || "Submitted document"}</p>
                <p className="mt-0.5 text-[10px] text-ink-faint">Secure preview · Link expires in 5 minutes</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <a href={documentPreview.signedUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[11px] font-medium text-blue-400 hover:text-blue-300">Open in new tab <ChevronRight className="h-3.5 w-3.5" /></a>
                <button type="button" onClick={() => setDocumentPreview(null)} className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink" aria-label="Close document preview"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <iframe
              src={documentPreview.signedUrl}
              title={documentPreview.document.original_filename || "Submitted document"}
              className="min-h-0 flex-1 bg-white"
            />
          </div>
        </div>
      )}
    </section>
  );
}
