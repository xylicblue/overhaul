import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../creatclient";

const FACTORS = [
  ["source_of_funds", "Source of funds"],
  ["ownership", "Ownership structure"],
  ["geography", "Geographic risk"],
  ["wallet", "Wallet screening"],
];

const titleCase = (value) => String(value || "")
  .replace(/_/g, " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const scoreTone = (band) => ({
  low: "text-up border-up/25 bg-up/[0.07]",
  medium: "text-warn border-warn/25 bg-warn/[0.07]",
  high: "text-down border-down/25 bg-down/[0.07]",
}[band] || "text-ink-muted border-line bg-surface-2");

function initialForm(context) {
  const latest = context?.assessments?.[0];
  const derived = context?.derived_inputs?.factors || {};
  const applicationCode = derived.isic?.key || String(context?.application?.isic_division || "").match(/\d{4}/)?.[0] || "";
  const fired = latest?.gate_results
    ? Object.entries(latest.gate_results).filter(([, value]) => value).map(([key]) => key)
    : [];
  return {
    isicCode: applicationCode || latest?.isic_code || "",
    source_of_funds: derived.source_of_funds?.key || latest?.source_of_funds_key || "",
    ownership: derived.ownership?.key || latest?.ownership_key || "",
    geography: derived.geography?.key || latest?.geography_key || "",
    wallet: latest?.wallet_key || "",
    gateKeys: fired,
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
    setContext(null);
    setForm(null);
    supabase.rpc("admin_entity_risk_context", { p_application_id: selectedId })
      .then(({ data, error: contextError }) => {
        if (contextError) throw contextError;
        if (!active) return;
        setContext(data);
        setForm(initialForm(data));
      })
      .catch((loadError) => active && setError(loadError.message || "Could not load the risk assessment."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [selectedId]);

  const rulesByFactor = useMemo(() => Object.fromEntries(FACTORS.map(([factor]) => [
    factor,
    (context?.factor_rules || []).filter((rule) => rule.factor === factor),
  ])), [context]);
  const derivedFactors = context?.derived_inputs?.factors || {};
  const canAssess = ["submitted", "under_review", "approved"].includes(context?.application?.status) &&
    context?.application?.identity_verification_status === "completed";
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
      const { data: nextContext, error: refreshError } = await supabase.rpc(
        "admin_entity_risk_context",
        { p_application_id: selectedId },
      );
      if (refreshError) throw refreshError;
      setContext(nextContext);
      setForm(initialForm(nextContext));
    } catch (saveError) {
      setError(saveError.message || "Could not create the risk assessment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={`${standalone ? "" : "mb-6"} overflow-hidden rounded-2xl border border-line-subtle bg-surface-1`}>
      <div className="flex flex-col gap-1 border-b border-line-subtle px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-faint">Entity compliance</p>
          <h2 className="mt-1 text-[15px] font-semibold text-ink">Application review and risk assessment</h2>
        </div>
        <p className="text-[10px] text-ink-ghost">{queue.length} applications · model {context?.model?.version || "2026-08-06"} · immutable revisions</p>
      </div>

      {error && <div className="border-b border-down/20 bg-down/[0.06] px-4 py-3 text-[11px] text-down">{error}</div>}

      <div className="grid min-h-[640px] lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="border-b border-line-subtle bg-surface-0/35 p-3 lg:border-b-0 lg:border-r">
          <div className="mb-3 grid gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search entities"
              aria-label="Search entity applications"
              className="h-9 w-full rounded-lg border border-line bg-surface-1 px-3 text-[10px] text-ink outline-none placeholder:text-ink-ghost focus:border-blue-500/50"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter applications by status"
              className="h-9 w-full rounded-lg border border-line bg-surface-1 px-3 text-[10px] text-ink-muted outline-none focus:border-blue-500/50"
            >
              <option value="all">All states</option>
              {["draft", "in_progress", "submitted", "under_review", "approved", "rejected"].map((status) => (
                <option key={status} value={status}>{titleCase(status)}</option>
              ))}
            </select>
          </div>
          <p className="mb-2 px-2 text-[9px] font-bold uppercase tracking-widest text-ink-faint">Applications</p>
          {filteredQueue.length === 0 && !loading ? (
            <p className="px-2 py-8 text-center text-[11px] text-ink-ghost">No matching applications.</p>
          ) : filteredQueue.map((item) => (
            <button
              type="button"
              key={item.application_id}
              onClick={() => setSelectedId(item.application_id)}
              className={`mb-1 w-full rounded-lg px-3 py-2.5 text-left transition-colors ${selectedId === item.application_id ? "bg-surface-3" : "hover:bg-surface-2"}`}
            >
              <span className="block truncate text-[12px] font-medium text-ink">{item.entity_legal_name || "Unnamed entity"}</span>
              <span className="mt-1 flex items-center justify-between gap-2 text-[9px] text-ink-ghost">
                <span>{titleCase(item.application_status)} · {item.latest_assessment_id ? `Revision ${item.latest_revision}` : "Not assessed"}</span>
                {item.final_band && <span className={scoreTone(item.final_band).split(" ")[0]}>{titleCase(item.final_band)}</span>}
                {item.decision === "blocked" && <span className="text-down">Blocked</span>}
              </span>
            </button>
          ))}
        </aside>

        <div className="p-4 md:p-5">
          {loading && !context ? (
            <div className="flex h-full items-center justify-center text-[11px] text-ink-faint">Loading assessment…</div>
          ) : !context || !form ? (
            <div className="flex h-full items-center justify-center text-[11px] text-ink-faint">Select an entity to begin.</div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
              <div>
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[17px] font-semibold text-ink">{context.application.entity_legal_name}</h3>
                    <p className="mt-1 text-[10px] text-ink-ghost">
                      {context.connected_persons.length} connected person{context.connected_persons.length === 1 ? "" : "s"}
                      {context.application.is_financial_institution ? " · Tier 3 mandatory EDD" : " · Tier 2"}
                    </p>
                  </div>
                  {context.assessments?.[0] && (
                    <div className={`rounded-lg border px-3 py-2 text-right ${scoreTone(context.assessments[0].final_band)}`}>
                      <span className="block text-[9px] uppercase tracking-wide opacity-70">Latest result</span>
                      <span className="text-[14px] font-semibold">
                        {context.assessments[0].decision === "blocked"
                          ? "Blocked"
                          : `${Number(context.assessments[0].effective_score).toFixed(2)} · ${titleCase(context.assessments[0].final_band)}`}
                      </span>
                    </div>
                  )}
                </div>

                {(context.derived_inputs?.warnings?.length || context.derived_inputs?.missing?.length) && (
                  <div className="mb-5 rounded-xl border border-warn/20 bg-warn/[0.055] px-4 py-3">
                    <p className="text-[10px] font-semibold text-warn">Automatic input review</p>
                    {context.derived_inputs?.missing?.length > 0 && (
                      <p className="mt-1 text-[10px] leading-4 text-ink-muted">
                        Compliance must resolve: {context.derived_inputs.missing.map(titleCase).join(", ")}.
                      </p>
                    )}
                    {(context.derived_inputs?.warnings || []).map((warning) => (
                      <p key={warning} className="mt-1 text-[9px] leading-4 text-ink-ghost">{warning}</p>
                    ))}
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 flex items-center justify-between text-[10px] font-medium text-ink-muted">
                      ISIC class
                      {derivedFactors.isic?.ready && <em className="not-italic text-[8px] font-semibold uppercase tracking-wide text-up">From application</em>}
                    </span>
                    <input
                      value={form.isicCode}
                      onChange={(event) => update("isicCode", event.target.value.replace(/\D/g, "").slice(0, 4))}
                      readOnly={derivedFactors.isic?.ready && !adjustDerived}
                      inputMode="numeric"
                      placeholder="6201"
                      className="h-10 w-full rounded-lg border border-line bg-surface-0 px-3 text-[12px] text-ink outline-none focus:border-blue-500/60 read-only:cursor-default read-only:text-ink-muted"
                    />
                  </label>
                  {FACTORS.map(([factor, label]) => (
                    <label className="block" key={factor}>
                      <span className="mb-1.5 flex items-center justify-between text-[10px] font-medium text-ink-muted">
                        {label}
                        {derivedFactors[factor]?.ready && <em className="not-italic text-[8px] font-semibold uppercase tracking-wide text-up">From application</em>}
                        {factor === "wallet" && <em className="not-italic text-[8px] font-semibold uppercase tracking-wide text-ink-ghost">Manual until Scorechain</em>}
                      </span>
                      <select
                        value={form[factor]}
                        onChange={(event) => update(factor, event.target.value)}
                        disabled={derivedFactors[factor]?.ready && !adjustDerived}
                        className="h-10 w-full rounded-lg border border-line bg-surface-0 px-3 text-[11px] text-ink outline-none focus:border-blue-500/60 disabled:cursor-default disabled:text-ink-muted disabled:opacity-80"
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
                    className="mt-3 text-[9px] font-medium text-ink-ghost underline decoration-line underline-offset-4 transition-colors hover:text-ink-muted"
                  >
                    {adjustDerived ? "Use application-derived values" : "Adjust application-derived values"}
                  </button>
                )}

                <div className="mt-5 border-t border-line-subtle pt-5">
                  <p className="text-[10px] font-semibold text-ink-muted">Gate checks</p>
                  <p className="mb-3 mt-1 text-[9px] leading-relaxed text-ink-ghost">Record every confirmed bright-line result. Gate-bearing factor selections are also enforced by the database.</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {(context.gate_rules || []).map((gate) => (
                      <label key={gate.gate_key} className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line-subtle px-3 py-2.5 hover:bg-surface-2/60">
                        <input
                          type="checkbox"
                          checked={form.gateKeys.includes(gate.gate_key)}
                          onChange={() => toggleGate(gate.gate_key)}
                          className="mt-0.5 h-3.5 w-3.5 accent-blue-500"
                        />
                        <span className="min-w-0">
                          <span className="block text-[10px] leading-snug text-ink-muted">{gate.label}</span>
                          <span className={`mt-1 block text-[8px] font-bold tracking-wide ${gate.action === "BLOCK" ? "text-down" : "text-warn"}`}>{gate.action.replace("_", "-")}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <aside className="space-y-4 rounded-xl border border-line-subtle bg-surface-0/45 p-4">
                <div>
                  <p className="text-[10px] font-semibold text-ink-muted">Applicant evidence</p>
                  <dl className="mt-3 space-y-2 text-[10px]">
                    <div><dt className="text-ink-ghost">Application state</dt><dd className="mt-0.5 text-ink-muted">{titleCase(context.application.status)}</dd></div>
                    <div><dt className="text-ink-ghost">Declared ISIC</dt><dd className="mt-0.5 text-ink-muted">{context.application.isic_division || "—"}</dd></div>
                    <div><dt className="text-ink-ghost">Declared source of funds</dt><dd className="mt-0.5 whitespace-pre-wrap text-ink-muted">{context.application.source_of_funds || "—"}</dd></div>
                    <div><dt className="text-ink-ghost">Incorporation</dt><dd className="mt-0.5 text-ink-muted">{context.application.incorporation_place || "—"}</dd></div>
                    <div><dt className="text-ink-ghost">KYC state</dt><dd className="mt-0.5 text-ink-muted">{titleCase(context.application.identity_verification_status)}</dd></div>
                    <div><dt className="text-ink-ghost">Connected persons</dt><dd className="mt-0.5 text-ink-muted">{context.connected_persons.length}</dd></div>
                    <div><dt className="text-ink-ghost">Documents</dt><dd className="mt-0.5 text-ink-muted">{context.document_records?.length || 0}</dd></div>
                  </dl>
                </div>

                {context.connected_persons.length > 0 && (
                  <div className="border-t border-line-subtle pt-4">
                    <p className="text-[10px] font-semibold text-ink-muted">People</p>
                    <div className="mt-2 space-y-2">
                      {context.connected_persons.map((person) => (
                        <div key={person.id} className="rounded-lg border border-line-subtle px-3 py-2">
                          <p className="truncate text-[10px] font-medium text-ink-muted">{person.full_name}</p>
                          <p className="mt-0.5 truncate text-[9px] text-ink-ghost">
                            {(person.roles || []).map(titleCase).join(", ")} · {titleCase(person.sumsub_review_status)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <label className="block border-t border-line-subtle pt-4">
                  <span className="mb-1.5 block text-[10px] font-medium text-ink-muted">Compliance notes</span>
                  <textarea
                    value={form.complianceNotes}
                    onChange={(event) => update("complianceNotes", event.target.value)}
                    rows={4}
                    className="w-full resize-y rounded-lg border border-line bg-surface-0 px-3 py-2 text-[10px] text-ink outline-none focus:border-blue-500/60"
                    placeholder="Evidence sources and rationale"
                  />
                </label>

                <div className="border-t border-line-subtle pt-4">
                  <p className="text-[10px] font-medium text-ink-muted">Manual score override</p>
                  <p className="mb-2 mt-1 text-[9px] leading-relaxed text-ink-ghost">Leave blank to use the workbook calculation. Overrides are permanent audit records.</p>
                  <input
                    value={form.manualScore}
                    onChange={(event) => update("manualScore", event.target.value)}
                    type="number"
                    min="0"
                    max="10"
                    step="0.01"
                    placeholder="0.00–10.00"
                    className="h-9 w-full rounded-lg border border-line bg-surface-0 px-3 text-[11px] text-ink outline-none focus:border-blue-500/60"
                  />
                  {form.manualScore !== "" && (
                    <textarea
                      value={form.manualReason}
                      onChange={(event) => update("manualReason", event.target.value)}
                      rows={3}
                      className="mt-2 w-full resize-y rounded-lg border border-line bg-surface-0 px-3 py-2 text-[10px] text-ink outline-none focus:border-blue-500/60"
                      placeholder="Required reason for override"
                    />
                  )}
                </div>

                <button
                  type="button"
                  onClick={createAssessment}
                  disabled={saving || !canAssess}
                  title={!canAssess ? "Submit the application and complete every identity verification first." : undefined}
                  className="h-10 w-full rounded-lg bg-white text-[11px] font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Calculating…"
                    : !["submitted", "under_review", "approved"].includes(context.application.status)
                      ? "Awaiting submission"
                      : context.application.identity_verification_status !== "completed"
                        ? "Awaiting identity checks"
                      : context.assessments?.length ? "Create new revision" : "Calculate risk"}
                </button>
                {result && <p className="text-center text-[9px] text-up">Revision {result.revision} saved to the audit trail.</p>}
              </aside>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
