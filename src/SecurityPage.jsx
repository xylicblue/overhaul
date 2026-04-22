import React, { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { motion } from "framer-motion";
import logoImage from "./assets/ByteStrikeLogoFinal.png";
import cyfrinWordmark from "./assets/cyfrin-wordmark.svg";
import Footer from "./components/Footer";

const securitySections = [
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

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] } },
};

export default function SecurityPage() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

      <main className="relative z-10 pt-28 pb-20">
        <div className="container mx-auto px-6 max-w-5xl">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mb-12"
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
            <p className="mt-5 text-zinc-400 text-base leading-relaxed max-w-3xl">
              Security is foundational to ByteStrike. Our codebase has been reviewed through an external
              audit process with Cyfrin and further validated through Battlechain testing to strengthen
              reliability under real-world market behavior.
            </p>
            <div className="mt-10 h-px bg-white/[0.06]" />
          </motion.div>

          <div className="grid gap-6">
            {securitySections.map((section, idx) => (
              <motion.section
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: idx * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 md:p-8"
              >
                <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400 bg-white/[0.04] border border-white/[0.08] rounded-md px-2.5 py-1 mb-4">
                  {section.badge}
                </span>
                {section.id === "cyfrin" && (
                  <div className="mb-5 inline-flex items-center rounded-xl border border-white/[0.08] bg-white/[0.03] p-2">
                    <img
                      src={cyfrinWordmark}
                      alt="Cyfrin"
                      className="h-8 md:h-10 w-auto"
                      loading="lazy"
                    />
                  </div>
                )}
                <h2 className="text-xl md:text-2xl font-semibold text-white mb-3 tracking-tight">
                  {section.title}
                </h2>
                <p className="text-zinc-400 text-sm md:text-base leading-relaxed mb-5">
                  {section.content}
                </p>
                <ul className="space-y-3">
                  {section.points.map((point) => (
                    <li key={point} className="flex gap-3 text-sm text-zinc-300">
                      <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-blue-500/70 shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </motion.section>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="mt-10 rounded-2xl border border-blue-500/20 bg-blue-500/[0.05] p-6 md:p-7"
          >
            <h3 className="text-base md:text-lg font-semibold text-white mb-2">Continuous Improvement</h3>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Security posture evolves with the protocol. We continue to harden implementation details,
              extend test coverage, and monitor critical pathways as the system scales.
            </p>
            <p className="mt-4 text-sm text-zinc-400">
              Security-related questions can be directed to{" "}
              <a href="mailto:gabejaffe@byte-strike.com" className="text-blue-400 hover:text-blue-300 transition-colors">
                gabejaffe@byte-strike.com
              </a>
              .
            </p>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
