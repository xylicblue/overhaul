import React, { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import logoImage from "./assets/ByteStrikeLogoFinal.png";
import Footer from "./components/Footer";

// NOTE: placeholder copy. Final Terms of Service text is with legal; swap the
// section content in when it lands. The route and layout are live now so the
// footer link works and /terms does not error.
const SECTIONS = [
  {
    id: "acceptance",
    badge: "Section 1",
    title: "Acceptance of Terms",
    content:
      "Placeholder text. By accessing or using the ByteStrike platform, you agree to be bound by these Terms of Service and all terms incorporated by reference. If you do not agree, you may not use the platform.",
    points: [
      "Placeholder: eligibility and account requirements",
      "Placeholder: acceptance on first use and on each material update",
      "Placeholder: definitions of key terms used throughout",
    ],
  },
  {
    id: "use",
    badge: "Section 2",
    title: "Use of the Platform",
    content:
      "Placeholder text describing permitted and prohibited uses of the platform, user responsibilities, and the scope of access granted to registered users.",
    points: [
      "Placeholder: permitted use and account responsibilities",
      "Placeholder: prohibited conduct and enforcement",
      "Placeholder: availability and changes to the service",
    ],
  },
  {
    id: "risk",
    badge: "Section 3",
    title: "Risk Disclosure",
    content:
      "Placeholder text. Trading perpetual futures involves substantial risk, including the risk of losing more than your initial margin. This section will summarize the material risks of using the platform.",
    points: [
      "Placeholder: market, liquidation, and volatility risk",
      "Placeholder: no financial advice; user responsibility",
      "Placeholder: limitation of liability and disclaimers",
    ],
  },
];

export default function TermsPage() {
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
            <p className="text-xs text-zinc-500 mb-4 uppercase tracking-widest font-medium">Legal</p>
            <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight mb-4">
              Terms of Service
            </h1>
            <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-2xl">
              Placeholder introduction. These Terms of Service govern your access to and use of the
              ByteStrike platform. The final text is being prepared with legal counsel and will be
              published here.
            </p>
            <p className="mt-4 text-xs text-zinc-600">
              Draft — placeholder content
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
              Placeholder. For questions about these terms, contact{" "}
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
