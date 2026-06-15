import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, ShieldCheck, ArrowDown } from "lucide-react";
import logo from "../assets/ByteStrikeLogoFinal.png";
import {
  PRIVACY_SECTIONS,
  PRIVACY_EFFECTIVE_DATE,
  PRIVACY_LAST_UPDATED,
} from "../content/privacySections";

// ─────────────────────────────────────────────────────────────────────────────
// Section renderer — compact, tokenised version of the /privacy layout.
// ─────────────────────────────────────────────────────────────────────────────
const Section = ({ section }) => (
  <section className="rounded-xl border border-line-subtle bg-surface-2/40 p-4">
    <div className="flex items-start gap-3 mb-2.5">
      <span className="shrink-0 mt-px num text-[10px] font-semibold text-ink-faint bg-surface-3 border border-line-subtle rounded px-1.5 py-0.5">
        {section.number}
      </span>
      <h3 className="text-[13px] font-semibold text-ink leading-snug">{section.title}</h3>
    </div>

    {section.content && (
      <p className="text-[12px] text-ink-muted leading-relaxed">{section.content}</p>
    )}

    {section.items && (
      <div className="flex flex-col gap-2 mt-3">
        {section.items.map((item) => (
          <div key={item.label} className="flex gap-2.5">
            <span className="mt-1.5 w-1 h-1 rounded-full bg-blue-400/70 shrink-0" />
            <p className="text-[12px] leading-relaxed">
              <span className="text-ink font-medium">{item.label}: </span>
              <span className="text-ink-muted">{item.text}</span>
            </p>
          </div>
        ))}
      </div>
    )}
  </section>
);

// ─────────────────────────────────────────────────────────────────────────────
// PrivacyDisclosureModal
// Shown once, immediately before a user's first ever trade. The reader must
// scroll to the end before the acceptance checkbox unlocks; confirming records
// acceptance and continues the trade.
// ─────────────────────────────────────────────────────────────────────────────
const PrivacyDisclosureModal = ({ isOpen, onConfirm, onCancel, submitting = false }) => {
  const bodyRef = useRef(null);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // Enable acceptance only once the user has scrolled through the full policy.
  const checkScroll = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 16) setReachedEnd(true);
  }, []);

  // Reset on open; if the content fits without scrolling, unlock immediately.
  useEffect(() => {
    if (!isOpen) return;
    setReachedEnd(false);
    setAgreed(false);
    const id = requestAnimationFrame(() => {
      const el = bodyRef.current;
      if (el && el.scrollHeight <= el.clientHeight + 16) setReachedEnd(true);
    });
    return () => cancelAnimationFrame(id);
  }, [isOpen]);

  const scrollToBottom = () => {
    const el = bodyRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm"
            onClick={submitting ? undefined : onCancel}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="w-full max-w-2xl max-h-[86vh] flex flex-col bg-surface-1 border border-line rounded-xl shadow-[0_32px_64px_rgba(0,0,0,0.7)] overflow-hidden pointer-events-auto">

              {/* ── Header ─────────────────────────────────────────────── */}
              <div className="shrink-0 px-5 py-4 border-b border-line-subtle flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <ShieldCheck size={17} className="text-blue-400" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <img src={logo} alt="ByteStrike" className="h-3.5 w-auto opacity-90" />
                      <span className="text-ink-ghost text-[11px]">·</span>
                      <h2 className="text-[14px] font-semibold text-ink tracking-tight truncate">Privacy Policy</h2>
                    </div>
                    <p className="text-[11px] text-ink-faint mt-0.5 leading-relaxed">
                      Before your first trade, please review and accept how we handle your data.
                    </p>
                  </div>
                </div>
                <button
                  onClick={onCancel}
                  disabled={submitting}
                  className="shrink-0 p-1.5 -mr-1 rounded-md text-ink-faint hover:text-ink hover:bg-surface-2 transition-colors duration-150 disabled:opacity-40"
                  aria-label="Close"
                >
                  <X size={16} strokeWidth={1.75} />
                </button>
              </div>

              {/* ── Meta row ───────────────────────────────────────────── */}
              <div className="shrink-0 px-5 py-2 border-b border-line-subtle flex items-center gap-3 text-[10px] text-ink-faint">
                <span>Effective <span className="text-ink-muted">{PRIVACY_EFFECTIVE_DATE}</span></span>
                <span className="text-ink-ghost">·</span>
                <span>Updated <span className="text-ink-muted">{PRIVACY_LAST_UPDATED}</span></span>
              </div>

              {/* ── Scrollable policy body ─────────────────────────────── */}
              <div
                ref={bodyRef}
                onScroll={checkScroll}
                className="relative flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 py-4 flex flex-col gap-2.5"
              >
                {PRIVACY_SECTIONS.map((s) => (
                  <Section key={s.id} section={s} />
                ))}
                <p className="text-[11px] text-ink-faint text-center pt-2 pb-1">
                  By continuing, you acknowledge that you have read and understood this Privacy Policy.
                </p>
              </div>

              {/* "Scroll to read" affordance until the end is reached */}
              {!reachedEnd && (
                <button
                  type="button"
                  onClick={scrollToBottom}
                  className="shrink-0 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium text-blue-400 hover:text-blue-300 bg-surface-2/60 border-t border-line-subtle transition-colors duration-150"
                >
                  <ArrowDown size={12} className="animate-bounce" />
                  Scroll to read the full policy
                </button>
              )}

              {/* ── Footer: acceptance + actions ───────────────────────── */}
              <div className="shrink-0 px-5 py-4 border-t border-line bg-surface-1">
                <label
                  htmlFor="privacy-accept"
                  className={`flex items-start gap-2.5 mb-4 select-none ${
                    reachedEnd ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                  }`}
                >
                  <input
                    id="privacy-accept"
                    type="checkbox"
                    checked={agreed}
                    disabled={!reachedEnd}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="sr-only"
                  />
                  <span
                    className={`mt-px w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors duration-150 ${
                      agreed ? "bg-blue-500 border-blue-500" : "bg-surface-2 border-line-strong"
                    }`}
                  >
                    {agreed && <Check size={12} className="text-white" strokeWidth={3} />}
                  </span>
                  <span className="text-[12px] leading-relaxed text-ink-muted">
                    I have read and agree to ByteStrike's Privacy Policy, and I consent to the
                    collection and processing of my trading and wallet data as described above.
                  </span>
                </label>

                <div className="flex gap-2.5">
                  <button
                    onClick={onCancel}
                    disabled={submitting}
                    className="px-4 py-2.5 rounded-md bg-transparent border border-line hover:border-line-strong text-ink-muted hover:text-ink text-[12px] font-medium transition-colors duration-150 disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onConfirm}
                    disabled={!agreed || submitting}
                    className="flex-1 py-2.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-semibold transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Accept & Continue"
                    )}
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default PrivacyDisclosureModal;
