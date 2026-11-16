import React, { useMemo, useState } from "react";
import { CheckCircle2, FileText, KeyRound, Loader2, ShieldCheck, UploadCloud } from "lucide-react";
import toast from "react-hot-toast";
import {
  requestEntityWalletOwnershipChallenge,
  submitEntityWalletOwnershipFallback,
  verifyEntityWalletOwnershipSignature,
} from "../services/api";
import {
  ACCEPTED_ENTITY_DOCUMENT_TYPES,
  removeWalletOwnershipEvidence,
  updateEntityApplication,
  uploadWalletOwnershipEvidence,
} from "../services/entityOnboarding";

const normalizeWallets = (value) => [...new Set(String(value || "")
  .split("\n")
  .map((wallet) => wallet.trim().toLowerCase())
  .filter(Boolean))];

const statusLabel = (proof) => {
  if (!proof) return "Not proven";
  if (proof.status === "verified") return "Ownership verified";
  if (proof.status === "pending_review") return "Evidence under review";
  if (proof.status === "rejected") return "Evidence rejected";
  return "Proof required";
};

export default function WalletOwnershipPanel({ application, walletText, proofs, onChanged }) {
  const wallets = useMemo(() => normalizeWallets(walletText), [walletText]);
  const [busyWallet, setBusyWallet] = useState("");
  const [fallbackWallet, setFallbackWallet] = useState("");
  const [fallbackMethod, setFallbackMethod] = useState("custodian_confirmation");
  const [transactionHash, setTransactionHash] = useState("");
  const [transactionNote, setTransactionNote] = useState("");
  const [custodianFile, setCustodianFile] = useState(null);

  const proofFor = (wallet) => proofs.find((proof) => proof.wallet_address === wallet);

  const saveWallets = async () => {
    if (!wallets.length) throw new Error("Enter at least one wallet address.");
    const invalid = wallets.find((wallet) => !/^0x[0-9a-f]{40}$/.test(wallet));
    if (invalid) throw new Error(`${invalid} is not a valid Ethereum-compatible address.`);
    const saved = await updateEntityApplication(application.id, { crypto_wallet_addresses: wallets });
    onChanged?.({ application: saved });
    return saved;
  };

  const sign = async (wallet) => {
    setBusyWallet(wallet);
    try {
      await saveWallets();
      if (!window.ethereum?.request) throw new Error("Open this page in a browser with an Ethereum wallet installed.");
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const connected = String(accounts?.[0] || "").toLowerCase();
      if (connected !== wallet) throw new Error(`Connect ${wallet} before signing. The currently selected wallet is different.`);
      const chainHex = await window.ethereum.request({ method: "eth_chainId" });
      const chainId = Number.parseInt(chainHex, 16);
      const { challenge } = await requestEntityWalletOwnershipChallenge(application.id, wallet, chainId);
      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [challenge.message, connected],
      });
      await verifyEntityWalletOwnershipSignature(challenge.id, signature);
      await onChanged?.();
      toast.success("Wallet control verified");
    } catch (error) {
      toast.error(error.message || "Could not verify wallet control.");
    } finally {
      setBusyWallet("");
    }
  };

  const submitFallback = async (wallet) => {
    setBusyWallet(wallet);
    let uploadedPath = "";
    try {
      await saveWallets();
      const payload = {
        application_id: application.id,
        wallet_address: wallet,
        proof_method: fallbackMethod,
      };
      if (fallbackMethod === "custodian_confirmation") {
        if (!custodianFile) throw new Error("Upload the custodian's written confirmation.");
        const uploaded = await uploadWalletOwnershipEvidence({ applicationId: application.id, walletAddress: wallet, file: custodianFile });
        uploadedPath = uploaded.storagePath;
        payload.storage_path = uploaded.storagePath;
        payload.original_filename = uploaded.originalFilename;
      } else {
        payload.transaction_hash = transactionHash;
        payload.note = transactionNote;
      }
      await submitEntityWalletOwnershipFallback(payload);
      await onChanged?.();
      setFallbackWallet("");
      setCustodianFile(null);
      setTransactionHash("");
      setTransactionNote("");
      toast.success("Ownership evidence sent to Compliance");
    } catch (error) {
      if (uploadedPath) {
        try { await removeWalletOwnershipEvidence(uploadedPath); } catch { /* Private orphan cleanup is best-effort. */ }
      }
      toast.error(error.message || "Could not submit wallet evidence.");
    } finally {
      setBusyWallet("");
    }
  };

  return (
    <section className="entity-wallet-proof">
      <div className="entity-wallet-proof-intro">
        <span><KeyRound size={18} /></span>
        <div>
          <h3>Prove control of each wallet</h3>
          <p>Sign a one-time readable message after declaring a wallet. Signing is free and cannot move funds. ByteStrike verifies ordinary wallets and EIP-1271 corporate smart-contract wallets before Scorechain screening.</p>
        </div>
      </div>

      {!wallets.length && <p className="entity-wallet-empty">Enter a wallet address above to begin.</p>}
      <div className="entity-wallet-proof-list">
        {wallets.map((wallet) => {
          const proof = proofFor(wallet);
          const complete = proof?.status === "verified";
          const pending = proof?.status === "pending_review";
          return (
            <div key={wallet} className={`entity-wallet-proof-row ${complete ? "is-verified" : ""}`}>
              <div className="entity-wallet-proof-copy">
                {complete ? <CheckCircle2 size={17} /> : <ShieldCheck size={17} />}
                <span><strong>{wallet}</strong><small>{statusLabel(proof)}{proof?.proof_method ? ` · ${proof.proof_method.replace(/_/g, " ")}` : ""}</small></span>
              </div>
              {!complete && !pending && (
                <div className="entity-wallet-proof-actions">
                  <button type="button" className="entity-secondary" onClick={() => sign(wallet)} disabled={busyWallet === wallet}>
                    {busyWallet === wallet ? <Loader2 size={14} className="spin" /> : <KeyRound size={14} />} Connect and sign
                  </button>
                  <button type="button" className="entity-wallet-fallback-link" onClick={() => setFallbackWallet(fallbackWallet === wallet ? "" : wallet)}>Use a fallback</button>
                </div>
              )}
              {fallbackWallet === wallet && !complete && !pending && (
                <div className="entity-wallet-fallback">
                  <div className="entity-wallet-fallback-tabs">
                    <button type="button" className={fallbackMethod === "custodian_confirmation" ? "active" : ""} onClick={() => setFallbackMethod("custodian_confirmation")}>Custodian confirmation</button>
                    <button type="button" className={fallbackMethod === "test_transaction" ? "active" : ""} onClick={() => setFallbackMethod("test_transaction")}>Test transaction</button>
                  </div>
                  {fallbackMethod === "custodian_confirmation" ? (
                    <label className="entity-wallet-file">
                      <UploadCloud size={15} />
                      <span>{custodianFile?.name || "Upload written custodian confirmation"}</span>
                      <input type="file" hidden accept={ACCEPTED_ENTITY_DOCUMENT_TYPES.join(",")} onChange={(event) => setCustodianFile(event.target.files?.[0] || null)} />
                    </label>
                  ) : (
                    <>
                      <input value={transactionHash} onChange={(event) => setTransactionHash(event.target.value)} placeholder="0x transaction hash" />
                      <textarea value={transactionNote} onChange={(event) => setTransactionNote(event.target.value)} rows={2} placeholder="Optional context for Compliance" />
                      <small>The transaction must have been sent from the declared wallet. Compliance will validate it before screening starts.</small>
                    </>
                  )}
                  <button type="button" className="entity-secondary" onClick={() => submitFallback(wallet)} disabled={busyWallet === wallet}>
                    {busyWallet === wallet ? <Loader2 size={14} className="spin" /> : <FileText size={14} />} Submit for review
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="entity-wallet-proof-note">Fallback evidence allows the application to be submitted, but Scorechain screening waits until Compliance verifies ownership.</p>
    </section>
  );
}
