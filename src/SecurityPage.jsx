import React, { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import logoImage from "./assets/ByteStrikeLogoFinal.png";
import cyfrinWordmark from "./assets/cyfrin-wordmark.svg";
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

export default function SecurityPage() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100 font-sans">
      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-white/[0.06] py-3"
            : "bg-transparent py-5"
        }`}
      >
        <div className="container mx-auto px-6 max-w-4xl flex items-center justify-between">
          <RouterLink to="/" className="flex items-center gap-3">
            <img src={logoImage} alt="ByteStrike" className="h-7 w-auto" />
          </RouterLink>
          <RouterLink
            to="/"
            className="group text-sm text-zinc-500 hover:text-zinc-200 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            Back
          </RouterLink>
        </div>
      </header>

      <main className="pt-28 pb-24">
        <div className="container mx-auto px-6 max-w-4xl">

          {/* Page header */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="mb-12"
          >
            <p className="text-xs text-zinc-500 mb-4 uppercase tracking-widest font-medium">Security</p>
            <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight mb-4">
              Security & Assurance
            </h1>
            <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-2xl">
              Security is foundational to ByteStrike. Our codebase has been reviewed through an external
              audit process with Cyfrin and further validated through Battlechain testing to strengthen
              reliability under real-world market behavior.
            </p>
            <p className="mt-4 text-xs text-zinc-600">
              Last updated: April 22, 2026
            </p>
          </motion.div>

          <div className="h-px bg-white/[0.06] mb-10" />

          {/* Sections */}
          <div className="space-y-4">
            {SECTIONS.map((section, idx) => (
              <motion.section
                key={section.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: idx * 0.06, ease: [0.25, 0.1, 0.25, 1] }}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 md:p-7"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1">
                    {section.badge}
                  </span>
                  {section.partner && (
                    <img
                      src={section.partner}
                      alt="Cyfrin"
                      className="h-6 w-auto opacity-70"
                      loading="lazy"
                    />
                  )}
                </div>

                <h2 className="text-lg font-semibold text-white mb-2 tracking-tight">
                  {section.title}
                </h2>
                <p className="text-zinc-400 text-sm leading-relaxed mb-5">
                  {section.content}
                </p>

                <ul className="space-y-2">
                  {section.points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-sm text-zinc-400">
                      <span className="mt-[9px] w-1 h-1 rounded-full bg-zinc-600 shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </motion.section>
            ))}
          </div>

          {/* Contact */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="mt-4 rounded-xl border border-white/[0.06] p-6 md:p-7"
          >
            <p className="text-sm text-zinc-400 leading-relaxed">
              Security posture evolves with the protocol. We continue to harden implementation details,
              extend test coverage, and monitor critical pathways as the system scales. For security-related
              inquiries, contact{" "}
              <a
                href="mailto:gabejaffe@byte-strike.com"
                className="text-zinc-200 hover:text-white underline underline-offset-2 decoration-zinc-600 hover:decoration-zinc-400 transition-colors"
              >
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
