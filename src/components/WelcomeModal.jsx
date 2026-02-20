import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { Link } from "react-router-dom";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Wallet,
  Droplets,
  Coins,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// Step content
// ─────────────────────────────────────────────────────────────────────────────

const StepItem = ({ num, title, desc }) => (
  <div className="flex gap-3 p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl">
    <span className="shrink-0 w-5 h-5 mt-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold font-mono flex items-center justify-center">
      {num}
    </span>
    <div>
      <p className="text-xs font-bold text-white mb-0.5">{title}</p>
      {desc && <p className="text-[11px] text-zinc-500 leading-relaxed">{desc}</p>}
    </div>
  </div>
);

const Callout = ({ icon: Icon, color, children }) => {
  const colors = {
    green:  "bg-emerald-500/5  border-emerald-500/20 text-emerald-300",
    blue:   "bg-blue-500/5    border-blue-500/20   text-blue-300",
    amber:  "bg-amber-500/5   border-amber-500/20  text-amber-300",
  };
  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-xl border ${colors[color]}`}>
      {Icon && <Icon size={13} className="shrink-0 mt-0.5" />}
      <p className="text-[11px] leading-relaxed">{children}</p>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const steps = [
  {
    id: "01",
    title: "Connect Your Wallet",
    subtitle: "Link a Web3 wallet to get started",
    icon: Wallet,
    accent: "blue",
    content: (
      <div className="space-y-2.5">
        <StepItem num="1" title="Open the connect dialog" desc='Click "Connect Wallet" in the top-right corner of the navbar.' />
        <StepItem num="2" title="Choose your wallet" desc="Select MetaMask, Rainbow, or any supported wallet and approve the connection." />
        <StepItem num="3" title="Switch to Sepolia" desc="If prompted, switch your network to Sepolia Testnet." />
        <Callout icon={CheckCircle2} color="green">
          <strong>Verified</strong> once your address appears in the navbar with a green pulse indicator.
        </Callout>
      </div>
    ),
  },
  {
    id: "02",
    title: "Get Sepolia ETH",
    subtitle: "Needed to pay transaction gas",
    icon: Droplets,
    accent: "violet",
    content: (
      <div className="space-y-2.5">
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Sepolia ETH covers gas fees for every on-chain action. Use the built-in faucet:
        </p>
        <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Built-in Faucet</p>
          <StepItem num="1" title='Find "Need Test ETH?"' desc="Located in the Collateral panel on the right side." />
          <StepItem num="2" title='Click "Get Test ETH"' desc="Receive 0.04 ETH automatically, once every 24 hours." />
        </div>
        <Callout icon={null} color="blue">
          <strong>No external faucets needed.</strong> Request once every 24 hours if your balance runs low.
        </Callout>
        <details className="group">
          <summary className="flex items-center gap-1.5 text-[10px] text-zinc-600 cursor-pointer hover:text-zinc-400 transition-colors select-none">
            <ChevronRight size={12} className="group-open:rotate-90 transition-transform" />
            Alternative external faucets
          </summary>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              { label: "Alchemy Faucet", href: "https://sepoliafaucet.com", note: "0.5 ETH" },
              { label: "Google Cloud",   href: "https://cloud.google.com/application/web3/faucet/ethereum/sepolia", note: "0.05 ETH" },
            ].map(({ label, href, note }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 bg-zinc-900 border border-zinc-800/80 rounded-lg hover:border-zinc-700 transition-colors group/l"
              >
                <span className="text-[10px] font-bold text-zinc-400 group-hover/l:text-white transition-colors">{label}</span>
                <span className="flex items-center gap-1 text-[9px] text-zinc-600 group-hover/l:text-blue-400 transition-colors">
                  {note} <ExternalLink size={9} />
                </span>
              </a>
            ))}
          </div>
        </details>
      </div>
    ),
  },
  {
    id: "03",
    title: "Get Test USDC",
    subtitle: "Mock capital for trading",
    icon: Coins,
    accent: "amber",
    content: (
      <div className="space-y-2.5">
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          ByteStrike uses synthetic USDC on Sepolia. Mint your starting capital for free:
        </p>
        <StepItem num="1" title='Click "Mint 10,000 USDC"' desc="Located in the trading panel under Collateral." />
        <StepItem num="2" title="Confirm the transaction" desc="Allow ~15 seconds for the transaction to confirm on-chain." />

        <div className="border-t border-zinc-800/60 pt-2.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Next steps</p>
          <div className="space-y-1.5">
            {[
              { dot: "blue",    text: <><strong className="text-zinc-200">Approve USDC</strong> for the trading contract</> },
              { dot: "blue",    text: <><strong className="text-zinc-200">Deposit collateral</strong> — 1,000–5,000 USDC recommended</> },
              { dot: "emerald", text: <><strong className="text-zinc-200">Open a position</strong> and start trading!</> },
            ].map(({ dot, text }, i) => (
              <div key={i} className="flex items-start gap-2.5 py-1">
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-${dot}-400`} />
                <span className="text-[11px] text-zinc-400">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <Callout icon={AlertTriangle} color="amber">
          <strong>Testnet only.</strong> All tokens and positions are simulated — no real funds are at risk.
        </Callout>
      </div>
    ),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// WelcomeModal
// ─────────────────────────────────────────────────────────────────────────────
const WelcomeModal = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  const step = steps[currentStep];
  const Icon = step.icon;
  const isLast = currentStep === steps.length - 1;

  const handleNext = () => isLast ? onClose() : setCurrentStep(s => s + 1);
  const handlePrev = () => currentStep > 0 && setCurrentStep(s => s - 1);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md bg-[#0a0a10] border border-zinc-800/80 rounded-2xl shadow-[0_24px_80px_-12px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Top accent line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

            {/* Header */}
            <div className="px-5 py-4 border-b border-zinc-800/60 flex items-center gap-3 relative">
              {/* Step id badge */}
              <span className="shrink-0 px-2 py-1 rounded bg-zinc-800/80 text-[10px] font-bold font-mono text-zinc-500 border border-zinc-700/50">
                {step.id}
              </span>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-white tracking-tight truncate">{step.title}</h2>
                <p className="text-[10px] text-zinc-600 mt-0.5">{step.subtitle}</p>
              </div>

              {/* Close */}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-600 hover:text-white hover:bg-zinc-800 transition-all"
              >
                <X size={14} />
              </button>
            </div>

            {/* Progress bar — segmented */}
            <div className="flex h-0.5 bg-zinc-900">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 transition-all duration-400 ${i <= currentStep ? "bg-blue-500" : "bg-transparent"}`}
                />
              ))}
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto flex-1" style={{ scrollbarWidth: "none" }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18 }}
                >
                  {step.content}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-zinc-800/60 bg-zinc-900/20 flex items-center justify-between shrink-0">
              {/* Step dots */}
              <div className="flex items-center gap-1.5">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentStep(i)}
                    className={`rounded-full transition-all duration-200 ${
                      i === currentStep
                        ? "w-4 h-1.5 bg-blue-500"
                        : "w-1.5 h-1.5 bg-zinc-700 hover:bg-zinc-600"
                    }`}
                  />
                ))}
              </div>

              {/* Nav buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    currentStep === 0
                      ? "text-zinc-700 cursor-not-allowed"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-white hover:bg-zinc-100 text-black text-[11px] font-bold rounded-lg transition-all"
                >
                  {isLast ? "Get Started" : "Next"}
                  {!isLast && <ChevronRight size={13} />}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default WelcomeModal;
