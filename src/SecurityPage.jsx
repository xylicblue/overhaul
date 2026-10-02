import React, { useEffect, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import logoImage from "./assets/ByteStrikeLogoFinal.png";
import cyfrinWordmark from "./assets/cyfrin-wordmark.svg";
import battlechainLogo from "./assets/battlechainlogo.png";
import Footer from "./components/Footer";

const SECTIONS = [
  {
    id: "cyfrin",
    badge: "External Audit",
    title: "Cyfrin Security Review",
    content:
      "ByteStrike underwent a third-party security review by Cyfrin, focused on core protocol logic, margin accounting, liquidation paths, and permission boundaries across the perpetuals stack.",
    points: [
      "Comprehensive review of core contracts and integration boundaries",
      "Validation of invariant-sensitive flows such as funding and position lifecycle",
      "Remediation-focused workflow with follow-up verification",
    ],
    partner: cyfrinWordmark,
    partnerAlt: "Cyfrin",
    partnerUrl: "https://www.cyfrin.io/",
  },
  {
    id: "battlechain",
    badge: "Testing",
    title: "Battlechain Testing Program",
    content:
      "In parallel with formal audits, we ran Battlechain testing to stress protocol behavior under adversarial and edge-case scenarios that resemble real market conditions.",
    points: [
      "Scenario-based testing for position opens/closes and liquidation thresholds",
      "Validation under volatile mark/index divergence conditions",
      "Regression testing to ensure fixes remain stable across releases",
    ],
    partner: battlechainLogo,
    partnerAlt: "BattleChain",
    partnerUrl: "https://www.battlechain.com/",
    partnerText: "BattleChain",
  },
  {
    id: "security-process",
    badge: "Process",
    title: "Defense in Depth",
    content:
      "We treat security as an ongoing process, not a one-time milestone. Audits and testing are complemented by continuous internal review, restricted admin surfaces, and pre-deploy verification workflows.",
    points: [
      "Role-gated administrative controls for sensitive protocol actions",
      "Contract-level test coverage for core risk and accounting invariants",
      "Incremental hardening informed by production feedback and monitoring",
    ],
  },
];

export default function SecurityPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const sectionRefs = useRef({});

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 20);

      let current = SECTIONS[0].id;
      for (const section of SECTIONS) {
        const element = sectionRefs.current[section.id];
        if (element && element.getBoundingClientRect().top <= 120) {
          current = section.id;
        }
      }
      setActiveSection(current);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id) => {
    const element = sectionRefs.current[id];
    if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100 font-sans">
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/[0.06] py-3"
            : "bg-transparent py-5"
        }`}
      >
        <div className="container mx-auto px-6 flex items-center justify-between">
          <RouterLink to="/" className="flex items-center gap-3">
            <img src={logoImage} alt="ByteStrike" className="h-7 w-auto" />
          </RouterLink>
          <RouterLink
            to="/"
            className="text-sm font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </RouterLink>
        </div>
      </header>

      <main className="relative z-10 pt-28 pb-24">
        <div className="container mx-auto px-6 max-w-6xl">
          <Motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="mb-16"
          >
            <span className="inline-block py-1 px-3 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-semibold uppercase tracking-widest mb-5">
              Security
            </span>
            <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight mb-4">
              Security & Assurance
            </h1>
            <p className="text-zinc-500 text-sm">
              Last updated: <span className="text-zinc-300">April 22, 2026</span>
            </p>
            <p className="mt-5 text-zinc-400 text-base leading-relaxed max-w-2xl">
              Security is foundational to ByteStrike. Our codebase has been reviewed through an external
              audit process with Cyfrin and further validated through Battlechain testing to strengthen
              reliability under real-world market behavior.
            </p>
            <div className="mt-10 h-px bg-white/[0.06]" />
          </Motion.div>

          <div className="flex gap-12 items-start">
            <aside className="hidden lg:block w-56 shrink-0 sticky top-28">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-4">
                Table of Contents
              </p>
              <nav className="flex flex-col gap-0.5">
                {SECTIONS.map((section, index) => (
                  <button
                    key={section.id}
                    onClick={() => scrollTo(section.id)}
                    className={`text-left px-3 py-2 rounded-lg text-xs transition-all duration-150 flex items-center gap-2 group ${
                      activeSection === section.id
                        ? "bg-blue-500/10 text-blue-300 font-medium"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
                    }`}
                  >
                    <span className={`font-mono text-[10px] shrink-0 ${
                      activeSection === section.id ? "text-blue-500" : "text-zinc-700 group-hover:text-zinc-500"
                    }`}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {section.title}
                  </button>
                ))}
              </nav>
            </aside>

            <div className="flex-1 min-w-0">
              <div className="flex flex-col gap-2">
                {SECTIONS.map((section, index) => (
                  <Motion.section
                    key={section.id}
                    ref={(element) => {
                      sectionRefs.current[section.id] = element;
                    }}
                    id={section.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.45, delay: index * 0.03, ease: [0.25, 0.1, 0.25, 1] }}
                    className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 md:p-8 scroll-mt-28"
                  >
                    <div className="flex items-start justify-between gap-5 mb-5">
                      <div className="flex items-start gap-4 min-w-0">
                        <span className="shrink-0 mt-0.5 font-mono text-[11px] font-semibold text-zinc-600 bg-white/[0.04] border border-white/[0.06] rounded-md px-2 py-1">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <span className="block text-[10px] font-semibold uppercase tracking-widest text-blue-400/80 mb-1.5">
                            {section.badge}
                          </span>
                          <h2 className="text-lg font-semibold text-white leading-snug">
                            {section.title}
                          </h2>
                        </div>
                      </div>

                      {section.partner && (
                        <a
                          href={section.partnerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex shrink-0 items-center gap-2 opacity-70 hover:opacity-100 transition-opacity"
                        >
                          <img src={section.partner} alt={section.partnerAlt ?? "Partner"} className="h-6 w-auto" loading="lazy" />
                          {section.partnerText && (
                            <span className="hidden sm:inline text-sm font-semibold text-white">{section.partnerText}</span>
                          )}
                        </a>
                      )}
                    </div>

                    <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                      {section.content}
                    </p>

                    <ul className="mt-2 flex flex-col gap-2">
                      {section.points.map((point) => (
                        <li key={point} className="flex items-start gap-2.5 text-sm text-zinc-400 leading-relaxed">
                          <svg className="w-4 h-4 text-blue-500/60 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </Motion.section>
                ))}
              </div>

              <Motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                className="mt-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 md:p-8"
              >
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Security posture evolves with the protocol. We continue to harden implementation details,
                  extend test coverage, and monitor critical pathways as the system scales. For security-related
                  inquiries, contact{" "}
                  <a href="mailto:support@byte-strike.com" className="text-zinc-200 hover:text-white underline underline-offset-2 decoration-zinc-600 hover:decoration-zinc-400 transition-colors">
                    support@byte-strike.com
                  </a>
                  .
                </p>
              </Motion.div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
