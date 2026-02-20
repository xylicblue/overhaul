import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Wallet,
  Download,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Zap,
  ChevronRight,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: "setup",   number: "01", label: "Prerequisites"      },
  { id: "connect", number: "02", label: "Connect Wallet"     },
  { id: "eth",     number: "03", label: "Get Test ETH"       },
  { id: "usdc",    number: "04", label: "Get Test USDC"      },
  { id: "deposit", number: "05", label: "Deposit Collateral" },
  { id: "trade",   number: "06", label: "Start Trading"      },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────
const SectionHeading = ({ number, children }) => (
  <div className="flex items-center gap-3 mb-6">
    <span className="text-[11px] font-bold font-mono text-zinc-600 tabular-nums">{number}</span>
    <div className="w-px h-4 bg-zinc-800" />
    <h2 className="text-xl font-bold text-white tracking-tight">{children}</h2>
  </div>
);

const Card = ({ children, className = "" }) => (
  <div className={`bg-[#0a0a10] border border-zinc-800/80 rounded-xl overflow-hidden ${className}`}>
    {children}
  </div>
);

const CardAccent = ({ color = "blue", children }) => {
  const colors = {
    blue:  "border-blue-500/30 bg-blue-500/5",
    green: "border-emerald-500/30 bg-emerald-500/5",
    amber: "border-amber-500/30 bg-amber-500/5",
    red:   "border-red-500/30 bg-red-500/5",
  };
  return (
    <div className={`border rounded-xl p-4 ${colors[color]}`}>
      {children}
    </div>
  );
};

const Step = ({ n, children }) => (
  <div className="flex items-start gap-3">
    <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-500 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
      {n}
    </div>
    <p className="text-sm text-zinc-400 leading-relaxed">{children}</p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// GuidePage
// ─────────────────────────────────────────────────────────────────────────────
const GuidePage = () => {
  const [activeSection, setActiveSection] = useState("setup");

  const scrollToSection = (id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - 90, behavior: "smooth" });
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.pageYOffset + 130;
      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        const el = document.getElementById(SECTIONS[i].id);
        if (el && el.offsetTop <= scrollY) { setActiveSection(SECTIONS[i].id); break; }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#06060a] text-zinc-200 font-sans">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative pt-24 pb-14 px-6 overflow-hidden border-b border-zinc-800/60">
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.3) 1px,transparent 1px)", backgroundSize: "40px 40px" }}
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#06060a] to-transparent" />

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/8 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-5">
            <BookOpen size={11} />
            Trading Guide
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight leading-tight">
            Get started with<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">ByteStrike</span>
          </h1>
          <p className="text-base text-zinc-500 max-w-lg leading-relaxed mb-8">
            Set up your wallet, fund your account, and open your first perpetual futures position in under 10 minutes.
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-6 text-[11px] font-mono text-zinc-600">
            {[
              { dot: "bg-blue-500",    text: "~10 min" },
              { dot: "bg-emerald-500", text: "Free (Testnet)" },
              { dot: "bg-zinc-500",    text: "Beginner" },
            ].map(({ dot, text }) => (
              <div key={text} className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-12 flex gap-10">

        {/* Sidebar */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-24">
            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-3 px-1">Contents</p>
            <nav className="relative">
              {/* Active indicator line */}
              <div className="absolute left-0 top-0 bottom-0 w-px bg-zinc-800" />
              <div className="space-y-0.5">
                {SECTIONS.map(({ id, number, label }) => {
                  const active = activeSection === id;
                  return (
                    <button
                      key={id}
                      onClick={() => scrollToSection(id)}
                      className={`w-full flex items-center gap-3 pl-4 pr-2 py-2 text-left transition-colors relative ${
                        active ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {/* Active left line */}
                      {active && (
                        <div className="absolute left-0 top-0 bottom-0 w-px bg-blue-500" />
                      )}
                      <span className="text-[9px] font-mono font-bold text-zinc-700 tabular-nums w-4 shrink-0">{number}</span>
                      <span className="text-[11px] font-medium">{label}</span>
                      {active && <ChevronRight size={10} className="ml-auto text-blue-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-16 max-w-2xl">

          {/* ── 01 Prerequisites ─────────────────────────────────────────── */}
          <section id="setup" className="scroll-mt-24">
            <SectionHeading number="01">Prerequisites</SectionHeading>
            <Card>
              <div className="p-5 border-b border-zinc-800/60">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet size={14} className="text-blue-400" />
                  <h3 className="text-sm font-bold text-white">Web3 Wallet Required</h3>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  You'll need a browser-based Web3 wallet. We recommend <span className="text-zinc-300 font-medium">MetaMask</span> or <span className="text-zinc-300 font-medium">Rainbow</span>.
                </p>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-start gap-3 p-3 bg-zinc-900/40 rounded-lg border border-zinc-800/60">
                  <div className="p-1.5 bg-blue-500/10 rounded-md shrink-0">
                    <Download size={13} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white mb-0.5">Download MetaMask</p>
                    <p className="text-[11px] text-zinc-500 mb-1.5">Available for Chrome, Firefox, iOS, and Android.</p>
                    <a href="https://metamask.io" target="_blank" rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                      metamask.io →
                    </a>
                  </div>
                </div>
                <CardAccent color="amber">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-300/80">Always backup your seed phrase and never share it with anyone.</p>
                  </div>
                </CardAccent>
              </div>
            </Card>
          </section>

          {/* ── 02 Connect ───────────────────────────────────────────────── */}
          <section id="connect" className="scroll-mt-24">
            <SectionHeading number="02">Connect Wallet</SectionHeading>
            <Card>
              <div className="divide-y divide-zinc-800/60">
                {[
                  { title: "Find the connect button",  desc: "Click 'Connect Wallet' in the top-right corner of the header." },
                  { title: "Select your wallet",       desc: "Choose your wallet from the modal and approve the connection request." },
                  { title: "Switch to Sepolia",        desc: "If prompted, approve the network switch to Sepolia Testnet in your wallet." },
                ].map(({ title, desc }, i) => (
                  <div key={i} className="flex items-start gap-4 px-5 py-4">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700/60 text-zinc-500 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white mb-0.5">{title}</p>
                      <p className="text-[11px] text-zinc-500">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 bg-emerald-500/5 border-t border-emerald-500/15 flex items-center gap-2">
                <CheckCircle size={12} className="text-emerald-400 shrink-0" />
                <p className="text-[11px] text-emerald-400/80 font-medium">Your wallet address will appear in the header when connected.</p>
              </div>
            </Card>
          </section>

          {/* ── 03 Get ETH ───────────────────────────────────────────────── */}
          <section id="eth" className="scroll-mt-24">
            <SectionHeading number="03">Get Sepolia ETH</SectionHeading>
            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
              Sepolia ETH is needed to pay gas fees for on-chain transactions. Use our built-in faucet — no account required.
            </p>
            <Card>
              {/* Recommended */}
              <div className="relative p-5 border-b border-zinc-800/60 overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={13} className="text-blue-400" />
                  <span className="text-xs font-bold text-white">Built-in Faucet</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 border border-blue-500/25 text-blue-400 uppercase tracking-wider">Recommended</span>
                </div>
                <div className="space-y-2.5">
                  <Step n="1">Navigate to the <span className="text-zinc-300 font-medium">Trade</span> page and expand the <span className="text-zinc-300 font-medium">Collateral</span> section in the right panel.</Step>
                  <Step n="2">Scroll down to <span className="text-zinc-300 font-medium">Testnet Faucets</span> and click <span className="text-zinc-300 font-medium">Get Sepolia ETH</span>.</Step>
                  <Step n="3">Receive <span className="font-mono text-blue-300">0.04 ETH</span> automatically — no login needed.</Step>
                </div>
              </div>

              {/* External */}
              <div className="p-5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-3">External Faucets</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: "Alchemy Faucet",      url: "https://sepoliafaucet.com",                                              note: "Free account · 0.5 ETH/day"  },
                    { name: "Google Cloud Faucet",  url: "https://cloud.google.com/application/web3/faucet/ethereum/sepolia",     note: "Google account · 0.05 ETH/day" },
                  ].map(({ name, url, note }) => (
                    <a key={name} href={url} target="_blank" rel="noopener noreferrer"
                      className="p-3 bg-zinc-900/40 border border-zinc-800/60 rounded-lg hover:border-zinc-700 hover:bg-zinc-900/70 transition-all group">
                      <p className="text-[11px] font-bold text-white mb-0.5 group-hover:text-blue-400 transition-colors">{name}</p>
                      <p className="text-[10px] text-zinc-600">{note}</p>
                    </a>
                  ))}
                </div>
              </div>
            </Card>
          </section>

          {/* ── 04 Get USDC ──────────────────────────────────────────────── */}
          <section id="usdc" className="scroll-mt-24">
            <SectionHeading number="04">Get Test USDC</SectionHeading>
            <Card>
              <div className="p-5 border-b border-zinc-800/60">
                <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
                  ByteStrike uses mock USDC as collateral. You can mint up to <span className="font-mono text-zinc-300">10,000 USDC</span> for free directly from the app.
                </p>
                <div className="space-y-2.5">
                  <Step n="1">On the Trade page, expand the <span className="text-zinc-300 font-medium">Collateral</span> section.</Step>
                  <Step n="2">Under <span className="text-zinc-300 font-medium">Testnet Faucets</span>, click <span className="text-zinc-300 font-medium">Mint 10,000 USDC</span>.</Step>
                  <Step n="3">Confirm the transaction in your wallet and wait ~15s for confirmation.</Step>
                </div>
              </div>
              <div className="px-5 py-3 flex items-center justify-between">
                <span className="text-[10px] text-zinc-600 font-mono">Mint amount</span>
                <span className="text-[11px] font-mono font-bold text-zinc-300">10,000 USDC</span>
              </div>
            </Card>
          </section>

          {/* ── 05 Deposit ───────────────────────────────────────────────── */}
          <section id="deposit" className="scroll-mt-24">
            <SectionHeading number="05">Deposit Collateral</SectionHeading>
            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
              Before trading, you must deposit USDC as margin into the protocol. This is a two-step process.
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                {
                  step: "A",
                  title: "Approve USDC",
                  desc:  "Grant the smart contract permission to spend your USDC. This is a one-time action per wallet.",
                  color: "border-blue-500/20 bg-blue-500/5",
                  numColor: "bg-blue-500/15 text-blue-400",
                },
                {
                  step: "B",
                  title: "Deposit Funds",
                  desc:  "Enter an amount (e.g. 5,000 USDC) and click Deposit. Funds move into your margin account.",
                  color: "border-emerald-500/20 bg-emerald-500/5",
                  numColor: "bg-emerald-500/15 text-emerald-400",
                },
              ].map(({ step, title, desc, color, numColor }) => (
                <div key={step} className={`rounded-xl border p-5 ${color}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold mb-3 ${numColor}`}>{step}</div>
                  <h4 className="text-sm font-bold text-white mb-1">{title}</h4>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── 06 Trade ─────────────────────────────────────────────────── */}
          <section id="trade" className="scroll-mt-24">
            <SectionHeading number="06">Start Trading</SectionHeading>
            <Card>
              <div className="p-5 border-b border-zinc-800/60">
                <h3 className="text-sm font-bold text-white mb-4">Opening a Position</h3>
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

              {/* Long / Short explainer */}
              <div className="grid grid-cols-2 divide-x divide-zinc-800/60">
                {[
                  { icon: <TrendingUp size={13} />, label: "Long", note: "Profit when price goes UP",   color: "text-emerald-400", bg: "bg-emerald-500/5" },
                  { icon: <TrendingDown size={13} />, label: "Short", note: "Profit when price goes DOWN", color: "text-red-400",     bg: "bg-red-500/5"     },
                ].map(({ icon, label, note, color, bg }) => (
                  <div key={label} className={`p-4 ${bg}`}>
                    <div className={`flex items-center gap-1.5 mb-1 ${color}`}>
                      {icon}
                      <span className="text-xs font-bold">{label}</span>
                    </div>
                    <p className="text-[10px] text-zinc-500">{note}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Risk note */}
            <CardAccent color="amber">
              <div className="flex items-start gap-2">
                <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-300/80 leading-relaxed">
                  Leverage amplifies both gains and losses. If your margin falls below the maintenance requirement, your position may be liquidated. Always monitor your Liquidation Price.
                </p>
              </div>
            </CardAccent>
          </section>

          {/* ── CTA ──────────────────────────────────────────────────────── */}
          <div className="border border-zinc-800/60 rounded-xl p-8 bg-[#0a0a10] text-center relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Ready?</p>
            <h2 className="text-xl font-bold text-white mb-2">Start Trading on Testnet</h2>
            <p className="text-xs text-zinc-500 mb-6">No real funds at risk. Free to explore.</p>
            <Link
              to="/trade"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-blue-900/30"
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
