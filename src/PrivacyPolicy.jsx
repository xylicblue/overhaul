import React, { useState, useEffect, useRef } from "react";
import { Link as RouterLink } from "react-router-dom";
import { motion } from "framer-motion";
import logoImage from "./assets/ByteStrikeLogoFinal.png";
import Footer from "./components/Footer";
import { PRIVACY_SECTIONS, PRIVACY_EFFECTIVE_DATE, PRIVACY_LAST_UPDATED } from "./content/privacySections";

// ── Section data — single source of truth, shared with the trade disclosure modal
const SECTIONS = PRIVACY_SECTIONS;

// ── Tiny fade-up variant ───────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
};

// ── Main component ─────────────────────────────────────────────────────────────
export default function PrivacyPolicy() {
  const [activeSection, setActiveSection] = useState("commitment");
  const [isScrolled, setIsScrolled] = useState(false);
  const sectionRefs = useRef({});

  // Track scroll for header blur + active TOC highlight
  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 20);

      // Determine which section is closest to the top of the viewport
      let current = SECTIONS[0].id;
      for (const s of SECTIONS) {
        const el = sectionRefs.current[s.id];
        if (el && el.getBoundingClientRect().top <= 120) {
          current = s.id;
        }
      }
      setActiveSection(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id) => {
    const el = sectionRefs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100 font-sans">

      {/* ── Dot-grid background ─────────────────────────────────────────── */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* ── Navbar ──────────────────────────────────────────────────────── */}
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

      {/* ── Page layout ─────────────────────────────────────────────────── */}
      <main className="relative z-10 pt-28 pb-24">
        <div className="container mx-auto px-6 max-w-6xl">

          {/* ── Hero / title block ──────────────────────────────────────── */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mb-16"
          >
            <span className="inline-block py-1 px-3 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-semibold uppercase tracking-widest mb-5">
              Legal
            </span>
            <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight mb-4">
              Privacy Policy
            </h1>
            <p className="text-zinc-500 text-sm">
              Effective date: <span className="text-zinc-300">{PRIVACY_EFFECTIVE_DATE}</span>
              &nbsp;&nbsp;·&nbsp;&nbsp;
              Last updated: <span className="text-zinc-300">{PRIVACY_LAST_UPDATED}</span>
            </p>
            <p className="mt-5 text-zinc-400 text-base leading-relaxed max-w-2xl">
              This Privacy Policy describes how ByteStrike ("we," "us," or "our") collects, uses,
              and shares your information when you visit{" "}
              <span className="text-blue-400 font-mono text-sm">byte-strike.com</span> or use our
              platform and associated services.
            </p>

            {/* Thin divider */}
            <div className="mt-10 h-px bg-white/[0.06]" />
          </motion.div>

          {/* ── Two-column: TOC (sticky) + content ─────────────────────── */}
          <div className="flex gap-12 items-start">

            {/* Sticky TOC — hidden on mobile */}
            <aside className="hidden lg:block w-56 shrink-0 sticky top-28">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-4">
                Table of Contents
              </p>
              <nav className="flex flex-col gap-0.5">
                {SECTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => scrollTo(s.id)}
                    className={`text-left px-3 py-2 rounded-lg text-xs transition-all duration-150 flex items-center gap-2 group ${
                      activeSection === s.id
                        ? "bg-blue-500/10 text-blue-300 font-medium"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
                    }`}
                  >
                    <span className={`font-mono text-[10px] shrink-0 ${
                      activeSection === s.id ? "text-blue-500" : "text-zinc-700 group-hover:text-zinc-500"
                    }`}>
                      {s.number}
                    </span>
                    {s.title}
                  </button>
                ))}
              </nav>
            </aside>

            {/* Content ───────────────────────────────────────────────── */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col gap-2">
                {SECTIONS.map((s, idx) => (
                  <motion.section
                    key={s.id}
                    ref={(el) => (sectionRefs.current[s.id] = el)}
                    id={s.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.45, delay: idx * 0.03, ease: [0.25, 0.1, 0.25, 1] }}
                    className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 md:p-8 scroll-mt-28"
                  >
                    {/* Section header */}
                    <div className="flex items-start gap-4 mb-5">
                      <span className="shrink-0 mt-0.5 font-mono text-[11px] font-semibold text-zinc-600 bg-white/[0.04] border border-white/[0.06] rounded-md px-2 py-1">
                        {s.number}
                      </span>
                      <h2 className="text-lg font-semibold text-white leading-snug">
                        {s.title}
                      </h2>
                    </div>

                    {/* Top-level paragraph */}
                    {s.content && (
                      <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                        {s.content}
                      </p>
                    )}

                    {/* Labelled item list */}
                    {s.items && (
                      <div className="flex flex-col gap-3 mt-1">
                        {s.items.map((item) => (
                          <div
                            key={item.label}
                            className="flex gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]"
                          >
                            <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-blue-500/60 shrink-0 mt-2" />
                            <div>
                              <span className="text-zinc-200 text-sm font-medium">{item.label}: </span>
                              <span className="text-zinc-400 text-sm leading-relaxed">{item.text}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bullet list */}
                    {s.bullets && (
                      <ul className="mt-2 flex flex-col gap-2">
                        {s.bullets.map((b) => (
                          <li key={b} className="flex items-start gap-2.5 text-sm text-zinc-400 leading-relaxed">
                            <svg className="w-4 h-4 text-blue-500/60 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Contact CTA */}
                    {s.contact && (
                      <a
                        href="mailto:privacy@byte-strike.com"
                        className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-300 text-sm font-medium hover:bg-blue-600/20 hover:border-blue-500/40 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        gabejaffe@byte-strike.com
                      </a>
                    )}
                  </motion.section>
                ))}
              </div>

              {/* Bottom note */}
              <p className="mt-10 text-xs text-zinc-600 text-center">
                By using ByteStrike, you acknowledge that you have read and understood this Privacy Policy.
                <br />
                Questions? Reach us at{" "}
                <a href="mailto:privacy@byte-strike.com" className="text-zinc-400 hover:text-white transition-colors underline underline-offset-2">
                  gabejaffe@byte-strike.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
