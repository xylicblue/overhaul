import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, FileText, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { supabase } from "../creatclient";
import {
  getEntityWalletOwnershipEvidenceUrl,
  reviewEntityWalletOwnershipFallback,
} from "../services/api";

const humanize = (value) => String(value || "").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function EntityWalletOwnershipReview({ applicationId, onChanged }) {
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [rationales, setRationales] = useState({});
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!applicationId) return;
    const { data, error: loadError } = await supabase
      .from("entity_wallet_ownership_proofs")
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: true });
    if (loadError) throw loadError;
    setProofs(data || []);
  }, [applicationId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    load().catch((loadError) => active && setError(loadError.message)).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [load]);

  const review = async (proof, decision) => {
    setBusy(proof.id);
    setError("");
    try {
      await reviewEntityWalletOwnershipFallback({
        application_id: applicationId,
        wallet_address: proof.wallet_address,
        proof_id: proof.id,
        decision,
        rationale: rationales[proof.id] || "",
      });
      await load();
      await onChanged?.();
    } catch (reviewError) {
      setError(reviewError.message || "Could not record the ownership decision.");
    } finally {
      setBusy("");
    }
  };

  const openEvidence = async (proof) => {
    setBusy(proof.id);
    setError("");
    try {
      const result = await getEntityWalletOwnershipEvidenceUrl(applicationId, proof.id);
      window.open(result.signed_url, "_blank", "noopener,noreferrer");
    } catch (openError) {
      setError(openError.message || "Could not open the ownership evidence.");
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="rounded-[20px] border border-line-subtle bg-surface-0/30 p-5">
      <div className="flex items-center gap-2.5">
        <ShieldCheck className="h-4 w-4 text-ink-faint" />
        <h4 className="text-[14px] font-semibold text-ink">Wallet ownership</h4>
      </div>
      <p className="mt-1.5 text-[10px] leading-4 text-ink-faint">Ownership must be verified before Scorechain screening. Signature proofs are automatic; fallback evidence requires Compliance review.</p>
      {error && <p className="mt-3 rounded-xl border border-down/20 bg-down/[0.05] px-3 py-2 text-[10px] text-down">{error}</p>}
      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-[11px] text-ink-faint"><Loader2 className="h-4 w-4 animate-spin" /> Loading evidence…</div>
      ) : (
        <div className="mt-4 space-y-2.5">
          {proofs.map((proof) => (
            <div key={proof.id} className="rounded-2xl border border-line-subtle bg-surface-1/60 p-3.5">
              <div className="flex items-start gap-2.5">
                {proof.status === "verified" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-up" /> : <FileText className="mt-0.5 h-4 w-4 shrink-0 text-warn" />}
                <div className="min-w-0 flex-1">
                  <p className="break-all font-mono text-[9px] leading-4 text-ink-muted">{proof.wallet_address}</p>
                  <p className="mt-1 text-[9px] text-ink-faint">{humanize(proof.proof_method)} · {humanize(proof.status)}</p>
                </div>
              </div>
              {proof.evidence?.storage_path && (
                <button type="button" onClick={() => openEvidence(proof)} disabled={busy === proof.id} className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-blue-400">
                  <ExternalLink className="h-3.5 w-3.5" /> Open custodian confirmation
                </button>
              )}
              {proof.evidence?.transaction_hash && <p className="mt-3 break-all rounded-lg bg-surface-0 px-2.5 py-2 font-mono text-[9px] text-ink-faint">{proof.evidence.transaction_hash}</p>}
              {proof.status === "pending_review" && (
                <div className="mt-3 border-t border-line-subtle pt-3">
                  <textarea
                    value={rationales[proof.id] || ""}
                    onChange={(event) => setRationales((current) => ({ ...current, [proof.id]: event.target.value }))}
                    rows={2}
                    placeholder="Required Compliance rationale"
                    className="w-full resize-y rounded-xl border border-line bg-surface-0 px-3 py-2.5 text-[11px] text-ink outline-none focus:border-blue-500/60"
                  />
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => review(proof, "verified")} disabled={busy === proof.id} className="flex items-center gap-1.5 rounded-lg bg-up/[0.1] px-2.5 py-2 text-[10px] font-semibold text-up"><CheckCircle2 className="h-3.5 w-3.5" /> Verify</button>
                    <button type="button" onClick={() => review(proof, "rejected")} disabled={busy === proof.id} className="flex items-center gap-1.5 rounded-lg bg-down/[0.1] px-2.5 py-2 text-[10px] font-semibold text-down"><XCircle className="h-3.5 w-3.5" /> Reject</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!proofs.length && <p className="text-[10px] text-ink-ghost">No wallet ownership evidence has been submitted.</p>}
        </div>
      )}
    </section>
  );
}
