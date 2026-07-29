import React, { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Plus } from "lucide-react";
import logoImage from "./assets/ByteStrikeLogoFinal.png";
import Footer from "./components/Footer";

// NOTE: bios are professional placeholder copy — swap in the final text (and add an
// `img` path per member) when they're ready. `img` falls back to initials.
const TEAM = [
  {
    name: "Quinn Domina",
    role: "Co-Founder, CTO & Head of Product",
    country: "USA",
    img: "/about-us-images/quinn.jpeg",
    bio: "Quinn leads engineering and product at ByteStrike, owning the protocol architecture and the exchange's technical roadmap.",
  },
  {
    name: "Gabe Jaffe",
    role: "Founder & CEO",
    country: "USA",
    img: "/about-us-images/gabe%20jaffe.jpeg",
    bio: "Gabe founded ByteStrike and sets the company's strategy, partnerships, and long-term direction for the compute-futures market.",
  },
  {
    name: "Amit Vijay",
    role: "Co-Founder, Compliance Officer & Risk Officer",
    country: "Canada",
    img: "/about-us-images/amir%20vijay.jpeg",
    bio: "Amit oversees compliance and risk, aligning the exchange's controls and risk framework with the standards expected of a regulated venue.",
  },
  {
    name: "Malcolm Butterfield",
    role: "Senior Representative & INED",
    country: "ON-ISLAND",
    img: "/about-us-images/malcolm.jpeg",
    bio: "Malcolm serves as Senior Representative and Independent Non-Executive Director, bringing independent oversight to the board. ",
  },
  {
    name: "Alison Morrison",
    role: "Money Laundering Reporting Officer",
    country: "ON-ISLAND",
    img: "/about-us-images/alison.jpeg",
    bio: "Alison is the Money Laundering Reporting Officer, responsible for AML/CFT reporting and the integrity of the exchange's financial-crime controls.",
  },
  {
    name: "Sebastian Zapata Veira",
    role: "Chief Regulatory Strategist",
    country: "Mexico",
    img: "/about-us-images/sebastian.jpeg",
    bio: "Sebastian shapes ByteStrike's regulatory strategy across jurisdictions, guiding engagement with regulators as the platform scales.",
  },
];

function initials(name) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function Avatar({ member, size }) {
  const dim = size === "sm" ? "w-10 h-10" : "w-16 h-16";
  const text = size === "sm" ? "text-xs" : "text-base";
  return (
    <div
      className={`${dim} rounded-full ring-2 ring-blue-500/50 ring-offset-2 ring-offset-[#0a0a0f] bg-gradient-to-br from-white/[0.08] to-white/[0.015] flex items-center justify-center overflow-hidden shrink-0`}
    >
      {member.img ? (
        // Empty alt on purpose: the name is adjacent visible text, and names must
        // not appear in indexable alt attributes.
        <img src={member.img} alt="" className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <span className={`${text} font-semibold text-zinc-300 tracking-wide`}>{initials(member.name)}</span>
      )}
    </div>
  );
}

function TeamCard({ member, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: (index % 3) * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
      tabIndex={0}
      className="group relative min-h-[248px] rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden transition-all duration-300 hover:border-blue-500/40 hover:bg-white/[0.03] focus:outline-none focus-visible:border-blue-500/50 focus-visible:ring-1 focus-visible:ring-blue-500/30"
    >
      {/* Blue top accent */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/70 to-transparent opacity-70 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Corner affordance — hints the card is interactive */}
      <div className="absolute top-4 right-4 text-zinc-600 group-hover:text-blue-400 transition-colors duration-300">
        <Plus className="w-4 h-4 group-hover:rotate-45 transition-transform duration-300" />
      </div>

      {/* Face (default) */}
      <div className="p-6 flex flex-col items-start transition-opacity duration-300 group-hover:opacity-0 group-focus-within:opacity-0">
        <Avatar member={member} />
        <p className="mt-5 text-[13px] text-zinc-400 leading-snug">{member.role}</p>
        <h3 className="mt-1.5 text-lg font-semibold text-white tracking-tight">{member.name}</h3>
        <span className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-400/90">
          {member.country}
        </span>
      </div>

      {/* Bio (revealed on hover / focus) */}
      <div className="absolute inset-0 p-6 bg-[#0b0b12] flex flex-col opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300">
        <div className="flex items-center gap-3 mb-4">
          <Avatar member={member} size="sm" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white leading-tight truncate">{member.name}</h3>
            <p className="text-[11px] text-zinc-500 leading-tight">{member.role}</p>
          </div>
        </div>
        <p className="text-[13px] text-zinc-300 leading-relaxed">{member.bio}</p>
      </div>
    </motion.div>
  );
}

export default function AboutUsPage() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100 font-sans">
      {/* Keep this page out of search. Names/bios are viewable on-site but must
          not make the site rank for an individual's name (targeting risk). The
          X-Robots-Tag header in public/_headers is the robust second layer. */}
      <title>About — ByteStrike</title>
      <meta name="robots" content="noindex, nofollow" />

      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-white/[0.06] py-3"
            : "bg-transparent py-5"
        }`}
      >
        <div className="container mx-auto px-6 max-w-6xl flex items-center justify-between">
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
        <div className="container mx-auto px-6 max-w-6xl">

          {/* Page header */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="mb-14 max-w-3xl"
          >
            <p className="text-[11px] text-zinc-400 mb-4 uppercase tracking-[0.2em] font-semibold">
              Governance &amp; Team
            </p>
            <h1 className="text-3xl md:text-5xl font-semibold text-white tracking-tight leading-[1.1]">
              Team, Compliance &amp; Commitment
            </h1>
          </motion.div>

          <div className="h-px bg-white/[0.06] mb-10" />

          {/* Team grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {TEAM.map((member, i) => (
              <TeamCard key={member.name} member={member} index={i} />
            ))}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
