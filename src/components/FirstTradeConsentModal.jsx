import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, ShieldCheck, ShieldAlert, ArrowDown } from "lucide-react";
import logo from "../assets/ByteStrikeLogoFinal.png";
import {
  PRIVACY_SECTIONS,
  PRIVACY_EFFECTIVE_DATE,
  PRIVACY_LAST_UPDATED,
} from "../content/privacySections";
import {
  RISK_SECTIONS,
  RISK_VERSION,
  RISK_DATE,
  RISK_INTRO,
  RISK_ACK_CHECKBOX,
} from "../content/riskDisclosureSections";

// ─────────────────────────────────────────────────────────────────────────────
// Section renderer — compact, tokenised. Supports a top paragraph (content),
// labelled items (label/text), and plain bullet lists (bullets).
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

    {section.bullets && (
      <div className="flex flex-col gap-2 mt-3">
        {section.bullets.map((b, i) => (
          <div key={i} className="flex gap-2.5">
            <span className="mt-1.5 w-1 h-1 rounded-full bg-ink-faint shrink-0" />
            <p className="text-[12px] text-ink-muted leading-relaxed">{b}</p>
          </div>
        ))}
      </div>
    )}
  </section>
);

// ─────────────────────────────────────────────────────────────────────────────
// Step definitions — same modal chrome, different content + accent.
// ─────────────────────────────────────────────────────────────────────────────
const ACCENTS = {
  amber: { box: "bg-amber-500/10 border-amber-500/25", icon: "text-amber-400" },
  blue: { box: "bg-blue-500/10 border-blue-500/20", icon: "text-blue-400" },
};

const STEPS = [
  {
    key: "risk",
    icon: ShieldAlert,
    accent: "amber",
    title: "Market Rules & Risk Disclosure",
    subtitle: "Before your first trade, please review and acknowledge the market rules and risks.",
    meta: [["Version", RISK_VERSION], ["Updated", RISK_DATE]],
    intro: RISK_INTRO,
    sections: RISK_SECTIONS,
    checkbox: RISK_ACK_CHECKBOX,
    confirm: "I Acknowledge",
  },
  {
    key: "privacy",
    icon: ShieldCheck,
    accent: "blue",
    title: "Privacy Policy",
    subtitle: "Before your first trade, please review and accept how we handle your data.",
    meta: [["Effective", PRIVACY_EFFECTIVE_DATE], ["Updated", PRIVACY_LAST_UPDATED]],
    intro: null,
    sections: PRIVACY_SECTIONS,
    checkbox:
      "I have read and agree to ByteStrike's Privacy Policy, and I consent to the collection and processing of my trading and wallet data as described above.",
    confirm: "Accept & Continue",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// StepPanel — one full consent screen. Owns its own scroll-to-end + checkbox
// state, so each step starts fresh when it slides in.
// ─────────────────────────────────────────────────────────────────────────────
const StepPanel = ({ step, index, total, submitting, onAccept, onCancel }) => {
  const bodyRef = useRef(null);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const Icon = step.icon;
  const ac = ACCENTS[step.accent];
  const isLast = index === total - 1;

  const checkScroll = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 16) setReachedEnd(true);
  }, []);

  // If the content fits without scrolling, unlock immediately.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const el = bodyRef.current;
      if (el && el.scrollHeight <= el.clientHeight + 16) setReachedEnd(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const scrollToBottom = () => {
    const el = bodyRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-surface-1">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="shrink-0 px-5 py-4 border-b border-line-subtle flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center ${ac.box}`}>
            <Icon size={17} className={ac.icon} strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <img src={logo} alt="ByteStrike" className="h-3.5 w-auto opacity-90" />
              <span className="text-ink-ghost text-[11px]">·</span>
              <h2 className="text-[14px] font-semibold text-ink tracking-tight truncate">{step.title}</h2>
            </div>
            <p className="text-[11px] text-ink-faint mt-0.5 leading-relaxed">{step.subtitle}</p>
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

      {/* ── Meta row + step indicator ─────────────────────────── */}
      <div className="shrink-0 px-5 py-2 border-b border-line-subtle flex items-center gap-3 text-[10px] text-ink-faint">
        {step.meta.map(([label, value], i) => (
          <React.Fragment key={label}>
            {i > 0 && <span className="text-ink-ghost">·</span>}
            <span>{label} <span className="text-ink-muted">{value}</span></span>
          </React.Fragment>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === index ? "w-4 bg-ink-muted" : "w-1.5 bg-surface-3"
              }`}
            />
          ))}
          <span className="ml-1 num text-ink-faint">{index + 1}/{total}</span>
        </div>
      </div>

      {/* ── Scrollable body ───────────────────────────────────── */}
      <div
        ref={bodyRef}
        onScroll={checkScroll}
        className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 py-4 flex flex-col gap-2.5"
      >
        {step.intro && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
            <p className="text-[12px] text-amber-200/90 leading-relaxed">
              <span className="font-semibold text-amber-300">Important notice. </span>
              {step.intro}
            </p>
          </div>
        )}
        {step.sections.map((s) => (
          <Section key={s.id} section={s} />
        ))}
        <p className="text-[11px] text-ink-faint text-center pt-2 pb-1">
          By continuing, you acknowledge that you have read and understood the above.
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
          Scroll to read the full document
        </button>
      )}

      {/* ── Footer: acceptance + actions ──────────────────────── */}
      <div className="shrink-0 px-5 py-4 border-t border-line bg-surface-1">
        <label
          htmlFor={`consent-accept-${step.key}`}
          className={`flex items-start gap-2.5 mb-4 select-none ${
            reachedEnd ? "cursor-pointer" : "cursor-not-allowed opacity-50"
          }`}
        >
          <input
            id={`consent-accept-${step.key}`}
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
          <span className="text-[12px] leading-relaxed text-ink-muted">{step.checkbox}</span>
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
            onClick={onAccept}
            disabled={!agreed || submitting}
            className="flex-1 py-2.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-semibold transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting && isLast ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              step.confirm
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FirstTradeConsentModal
// Two-step gate shown immediately before a user's first ever trade:
//   1) Market Rules & Risk Disclosure  →  2) Privacy Policy.
// Accepting step 1 slides horizontally into step 2; accepting step 2 records
// both acknowledgements and resumes the trade.
// ─────────────────────────────────────────────────────────────────────────────
const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
};

const FirstTradeConsentModal = ({ isOpen, onConfirm, onCancel, submitting = false }) => {
  const [[step, direction], setStep] = useState([0, 0]);

  // Always restart at step 1 when (re)opened.
  useEffect(() => {
    if (isOpen) setStep([0, 0]);
  }, [isOpen]);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleAccept = () => {
    if (isLast) onConfirm();
    else setStep([step + 1, 1]);
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

          {/* Centered box (pops in/out) */}
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="relative w-full max-w-2xl h-[86vh] max-h-[680px] overflow-hidden bg-surface-1 border border-line rounded-xl shadow-[0_32px_64px_rgba(0,0,0,0.7)] pointer-events-auto">
              {/* Sliding steps */}
              <AnimatePresence initial={false} custom={direction}>
                <motion.div
                  key={current.key}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 320, damping: 34 },
                    opacity: { duration: 0.2 },
                  }}
                  className="absolute inset-0"
                >
                  <StepPanel
                    step={current}
                    index={step}
                    total={STEPS.length}
                    submitting={submitting}
                    onAccept={handleAccept}
                    onCancel={onCancel}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default FirstTradeConsentModal;
