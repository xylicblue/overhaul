import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Wallet,
  Download,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Zap,
} from "lucide-react";

const SECTIONS = [
  { id: "setup",   number: "01", label: "Prerequisites"      },
  { id: "connect", number: "02", label: "Connect Wallet"     },
  { id: "eth",     number: "03", label: "Get Test ETH"       },
  { id: "usdc",    number: "04", label: "Get Test USDC"      },
  { id: "deposit", number: "05", label: "Deposit Collateral" },
  { id: "trade",   number: "06", label: "Start Trading"      },
];

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const SectionHeading = ({ number, children }) => (
  <div className="mb-6">
    <div className="flex items-center gap-3 mb-3">
      <span className="font-mono text-[10px] text-zinc-600 tabular-nums">{number}</span>
      <h2 className="text-[1.25rem] font-semibold text-white tracking-tight">{children}</h2>
    </div>
    <div className="w-8 h-px bg-zinc-700" />
  </div>
);

const Step = ({ n, children }) => (
  <div className="flex items-start gap-3">
    <span className="font-mono text-[10px] text-zinc-600 tabular-nums mt-[3px] shrink-0 w-4">{n}.</span>
    <p className="text-sm text-zinc-400 leading-relaxed">{children}</p>
  </div>
);

const C = ({ children }) => (
  <code className="font-mono text-[13px] bg-zinc-800 text-zinc-100 px-1.5 py-0.5 rounded">
    {children}
  </code>
);

const Note = ({ color = "blue", label, children }) => {
  const palette = {
    blue:  { border: "border-l-blue-500",  bg: "bg-blue-500/[0.07]",  label: "text-blue-400"  },
    amber: { border: "border-l-amber-500", bg: "bg-amber-500/[0.07]", label: "text-amber-400" },
    green: { border: "border-l-green-500", bg: "bg-green-500/[0.07]", label: "text-green-400" },
  };
  const p = palette[color] ?? palette.blue;
  return (
    <div className={`border-l-2 ${p.border} ${p.bg} pl-4 pr-4 py-3 rounded-r-md`}>
      {label && <p className={`text-xs font-semibold uppercase tracking-wider ${p.label} mb-1`}>{label}</p>}
      <p className="text-sm leading-relaxed text-zinc-300">{children}</p>
    </div>
  );
};

const GuidePage = () => {
  const [activeSection, setActiveSection] = useState("setup");

  const scrollToSection = (id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - 80, behavior: "smooth" });
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.pageYOffset + 110;
      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        const el = document.getElementById(SECTIONS[i].id);
        if (el && el.offsetTop <= scrollY) { setActiveSection(SECTIONS[i].id); break; }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-300">

      {/* ── Page header ── */}
      <div className="border-b border-zinc-800/60 pt-20 pb-8 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <p className="text-xs text-zinc-500 mb-4 font-mono">
              ByteStrike Protocol&nbsp;&nbsp;/&nbsp;&nbsp;Guide
            </p>
            <h1 className="text-2xl font-semibold text-white tracking-tight mb-2">
              Getting Started
            </h1>
            <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Set up your wallet, fund your account with testnet tokens, and open your first perpetual futures position.
            </p>
            <div className="flex items-center gap-5 mt-4 text-[11px] font-mono text-zinc-600">
              {["~10 min", "Free · Sepolia Testnet", "Beginner"].map((text, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-zinc-700" />
                  {text}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-5xl mx-auto px-6 flex gap-12 py-10">

        {/* Sidebar */}
        <aside className="hidden lg:block w-52 flex-shrink-0">
          <motion.div
            className="sticky top-20"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
          >
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 px-3">
              Steps
            </p>
            <nav className="space-y-0.5">
              {SECTIONS.map(({ id, number, label }) => {
                const active = activeSection === id;
                return (
                  <button
                    key={id}
                    onClick={() => scrollToSection(id)}
                    className={`w-full text-left flex items-center gap-2.5 px-3 py-1.5 rounded text-sm transition-all duration-150 ${
                      active
                        ? "bg-blue-500/10 text-white"
                        : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="font-mono text-[10px] text-zinc-600 tabular-nums shrink-0">{number}</span>
                    <span className={active ? "font-medium" : ""}>{label}</span>
                  </button>
                );
              })}
            </nav>
          </motion.div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-16">

          {/* ── 01 Prerequisites ── */}
          <motion.section id="setup" className="scroll-mt-20" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}>
            <SectionHeading number="01">Prerequisites</SectionHeading>
            <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl overflow-hidden">
              <div className="p-5 border-b border-white/[0.05]">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet size={14} className="text-zinc-400" />
                  <h3 className="text-sm font-semibold text-white">Web3 Wallet Required</h3>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  You'll need a browser-based Web3 wallet. We recommend{" "}
                  <span className="text-zinc-200">MetaMask</span> or{" "}
                  <span className="text-zinc-200">Rainbow</span>.
                </p>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-start gap-3 p-4 rounded-lg border border-white/[0.05] bg-white/[0.02]">
                  <Download size={13} className="text-zinc-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white mb-0.5">Download MetaMask</p>
                    <p className="text-xs text-zinc-500 mb-2">Available for Chrome, Firefox, iOS, and Android.</p>
                    <a href="https://metamask.io" target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                      metamask.io →
                    </a>
                  </div>
                </div>
                <Note color="amber" label="Security">
                  Always backup your seed phrase and never share it with anyone.
                </Note>
              </div>
            </div>
          </motion.section>

          {/* ── 02 Connect ── */}
          <motion.section id="connect" className="scroll-mt-20" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}>
            <SectionHeading number="02">Connect Wallet</SectionHeading>
            <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl overflow-hidden">
              <div className="divide-y divide-white/[0.05]">
                {[
                  { title: "Find the connect button", desc: "Click 'Connect Wallet' in the top-right corner of the header." },
                  { title: "Select your wallet",      desc: "Choose your wallet from the modal and approve the connection request." },
                  { title: "Switch to Sepolia",       desc: "If prompted, approve the network switch to Sepolia Testnet in your wallet." },
                ].map(({ title, desc }, i) => (
                  <div key={i} className="flex items-start gap-4 px-5 py-4">
                    <span className="font-mono text-[10px] text-zinc-600 tabular-nums mt-[3px] shrink-0 w-4">{i + 1}.</span>
                    <div>
                      <p className="text-sm font-medium text-white mb-0.5">{title}</p>
                      <p className="text-sm text-zinc-500">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-white/[0.05] flex items-center gap-2 bg-white/[0.01]">
                <CheckCircle size={12} className="text-zinc-600 shrink-0" />
                <p className="text-xs text-zinc-500">Your wallet address will appear in the header when connected.</p>
              </div>
            </div>
          </motion.section>

          {/* ── 03 Get ETH ── */}
          <motion.section id="eth" className="scroll-mt-20" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}>
            <SectionHeading number="03">Get Sepolia ETH</SectionHeading>
            <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
              Sepolia ETH is needed to pay gas fees for on-chain transactions. Use the built-in faucet — no account required.
            </p>
            <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl overflow-hidden">
              <div className="p-5 border-b border-white/[0.05]">
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={13} className="text-zinc-400" />
                  <span className="text-sm font-medium text-white">Built-in Faucet</span>
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-zinc-400 uppercase tracking-wider">Recommended</span>
                </div>
                <div className="space-y-3">
                  <Step n="1">Navigate to the <span className="text-zinc-200">Trade</span> page and expand the <span className="text-zinc-200">Collateral</span> section in the right panel.</Step>
                  <Step n="2">Scroll down to <span className="text-zinc-200">Testnet Faucets</span> and click <span className="text-zinc-200">Get Sepolia ETH</span>.</Step>
                  <Step n="3">Receive <C>0.04 ETH</C> automatically — no login needed.</Step>
                </div>
              </div>
              <div className="p-5">
                <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">External Faucets</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: "Alchemy Faucet",     url: "https://sepoliafaucet.com",                                          note: "Free account · 0.5 ETH/day"    },
                    { name: "Google Cloud Faucet", url: "https://cloud.google.com/application/web3/faucet/ethereum/sepolia", note: "Google account · 0.05 ETH/day" },
                  ].map(({ name, url, note }) => (
                    <a key={name} href={url} target="_blank" rel="noopener noreferrer"
                      className="p-3 rounded-lg border border-white/[0.06] hover:border-white/[0.1] hover:bg-white/[0.03] transition-all">
                      <p className="text-sm font-medium text-zinc-300 mb-0.5">{name}</p>
                      <p className="text-xs text-zinc-600">{note}</p>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>

          {/* ── 04 Get USDC ── */}
          <motion.section id="usdc" className="scroll-mt-20" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}>
            <SectionHeading number="04">Get Test USDC</SectionHeading>
            <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl overflow-hidden">
              <div className="p-5 border-b border-white/[0.05]">
                <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
                  ByteStrike uses mock USDC as collateral. Mint up to <C>10,000 USDC</C> for free directly from the app.
                </p>
                <div className="space-y-3">
                  <Step n="1">On the Trade page, expand the <span className="text-zinc-200">Collateral</span> section.</Step>
                  <Step n="2">Under <span className="text-zinc-200">Testnet Faucets</span>, click <span className="text-zinc-200">Mint 10,000 USDC</span>.</Step>
                  <Step n="3">Confirm the transaction in your wallet and wait ~15s for confirmation.</Step>
                </div>
              </div>
              <div className="px-5 py-3 flex items-center justify-between">
                <span className="text-xs text-zinc-600 font-mono">Mint amount</span>
                <C>10,000 USDC</C>
              </div>
            </div>
          </motion.section>

          {/* ── 05 Deposit ── */}
          <motion.section id="deposit" className="scroll-mt-20" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}>
            <SectionHeading number="05">Deposit Collateral</SectionHeading>
            <p className="text-sm text-zinc-400 mb-5 leading-relaxed">
              Before trading, deposit USDC as margin into the protocol. This is a two-step process.
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                {
                  step: "A",
                  title: "Approve USDC",
                  desc: "Grant the smart contract permission to spend your USDC. This is a one-time action per wallet.",
                },
                {
                  step: "B",
                  title: "Deposit Funds",
                  desc: "Enter an amount (e.g. 5,000 USDC) and click Deposit. Funds move into your margin account.",
                },
              ].map(({ step, title, desc }) => (
                <div key={step} className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-5">
                  <div className="w-7 h-7 rounded-lg border border-white/[0.08] bg-white/[0.04] flex items-center justify-center text-xs font-semibold text-zinc-300 mb-4 font-mono">{step}</div>
                  <h4 className="text-sm font-semibold text-white mb-1.5">{title}</h4>
                  <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </motion.section>

          {/* ── 06 Trade ── */}
          <motion.section id="trade" className="scroll-mt-20" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}>
            <SectionHeading number="06">Start Trading</SectionHeading>
            <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl overflow-hidden mb-4">
              <div className="p-5 border-b border-white/[0.05]">
                <h3 className="text-sm font-semibold text-white mb-4">Opening a Position</h3>
                <div className="space-y-3">
                  {[
                    "Select a market from the ticker bar (e.g. H100-PERP, T4-PERP).",
                    "Choose Long (Buy) to profit when price rises, or Short (Sell) to profit when price falls.",
                    "Enter your position size and set your preferred leverage using the slider or presets.",
                    "Review the Order Summary — check Margin Required and Est. Liquidation Price.",
                    "Click the green or red button to submit. Confirm the transaction in your wallet.",
                  ].map((text, i) => (
                    <Step key={i} n={i + 1}>{text}</Step>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-white/[0.05]">
                {[
                  { icon: <TrendingUp size={13} />,   label: "Long",  note: "Profit when price goes UP"   },
                  { icon: <TrendingDown size={13} />, label: "Short", note: "Profit when price goes DOWN" },
                ].map(({ icon, label, note }) => (
                  <div key={label} className="p-4">
                    <div className="flex items-center gap-1.5 mb-1 text-zinc-300">
                      {icon}
                      <span className="text-xs font-semibold">{label}</span>
                    </div>
                    <p className="text-xs text-zinc-500">{note}</p>
                  </div>
                ))}
              </div>
            </div>
            <Note color="amber" label="Risk">
              Leverage amplifies both gains and losses. If your margin falls below the maintenance requirement, your position may be liquidated. Always monitor your Liquidation Price.
            </Note>
          </motion.section>

          {/* ── CTA ── */}
          <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-7">
            <h2 className="text-base font-semibold text-white mb-1.5">Ready to start?</h2>
            <p className="text-sm text-zinc-400 mb-5">No real funds at risk. Free to explore on Sepolia testnet.</p>
            <Link
              to="/trade"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/[0.1] bg-white/[0.05] hover:bg-white/[0.08] hover:border-white/[0.15] text-sm font-medium text-zinc-200 hover:text-white transition-all duration-200"
            >
              Open Trade Page
              <ArrowRight size={14} />
            </Link>
          </div>

        </main>
      </div>
    </div>
  );
};

export default GuidePage;
