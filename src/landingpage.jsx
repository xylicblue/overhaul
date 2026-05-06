import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-scroll";
import Web3AuthHandler from "./web3auth";
import toast from "react-hot-toast";
import { Link as Routerlink, useNavigate } from "react-router-dom";
import PriceIndexChart from "./chart";
import { supabase } from "./creatclient";
import { submitInterest } from "./services/api";
import Footer from "./components/Footer";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useInView,
  useMotionValueEvent,
  useSpring,
} from "framer-motion";
import logoImage from "./assets/ByteStrikeLogoFinal.png";
import ceoPortrait from "./assets/gabe.jpg";
import cyfrinWordmark from "./assets/cyfrin-wordmark.svg";
import battlechainLogo from "./assets/nav-mark.svg";
import ProfileDropdown from "./dropdown";
import NotificationBell from "./components/NotificationBell";
import { useAuthModal } from "./context/AuthModalContext";
import Sparkline from "./components/Sparkline";
import { useDisconnect } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useNotificationStore } from "./stores/useNotificationStore";
import { useTradingStore } from "./stores/useTradingStore";

/* ─── Animation Variants (trigger-once) ─── */
const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const fadeUpSubtle = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const scaleFade = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1, scale: 1,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const slideFromLeft = {
  hidden: { opacity: 0, x: -50 },
  visible: {
    opacity: 1, x: 0,
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const slideFromRight = {
  hidden: { opacity: 0, x: 50 },
  visible: {
    opacity: 1, x: 0,
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const blurFadeIn = {
  hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
  visible: {
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const dropdownVariants = {
  hidden: { opacity: 0, y: -6, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.16, ease: "easeOut" } },
  exit:   { opacity: 0, y: -4, scale: 0.97, transition: { duration: 0.12, ease: "easeIn" } },
};

/* ─── Animated Section Wrapper (trigger-once) ─── */
const AnimatedSection = ({ children, className = "", variants = staggerContainer, ...props }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div ref={ref} variants={variants} initial="hidden" animate={isInView ? "visible" : "hidden"} className={className} {...props}>
      {children}
    </motion.div>
  );
};

/* ─── Card Data ─── */
const whyNowCardsData = [
  {
    num: "01",
    title: "Explosive Demand",
    body: "AI training and inference are scaling GPU spend faster than fab capacity, power, and interconnect can deliver. The supply gap is structural, not cyclical.",
  },
  {
    num: "02",
    title: "Market Volatility",
    body: "H100 rental rates have moved by an order of magnitude across providers and quarters. Buyers can't underwrite long-running jobs; operators can't commit forward capacity.",
  },
  {
    num: "03",
    title: "Capital Constraints",
    body: "GPU clusters are multi-year, multi-hundred-million-dollar commitments. With no instruments to hedge price or utilization, the cost of capital sits structurally higher than it should.",
  },
  {
    num: "04",
    title: "Missing market infrastructure",
    body: "Oil, power, and grain trade on standardized forward curves. Compute - the input AI is built on - has no equivalent. We provide the contracts, settlement, and price discovery layer.",
  },
];


const GPU_INDEX_MARKETS = [
  {
    id: "H100-PERP",
    name: "H100",
    full: "NVIDIA H100 SXM",
    badge: "HOT",
    badgeColor: "text-yellow-400 bg-yellow-500/10 border-yellow-500/25",
  },
  {
    id: "B200-PERP",
    name: "B200",
    full: "NVIDIA Blackwell B200",
    badge: "NEW",
    badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
  },
  // {
  //   id: "H200-PERP",
  //   name: "H200",
  //   full: "NVIDIA H200 SXM",
  //   badge: null,
  //   badgeColor: "",
  // },
  {
    id: "T4-PERP",
    name: "T4",
    full: "NVIDIA T4 Inference",
    badge: "BETA",
    badgeColor: "text-zinc-400 bg-zinc-500/10 border-zinc-500/25",
  },
];

// Markets shown in the hero widget ticker — only IDs that exist in SPARKLINE_CONFIG
const HERO_TICKER_MARKETS = [
  { id: "H100-PERP",          name: "H100", sub: "Index"     },
  { id: "B200-PERP",          name: "B200", sub: "Index"     },
  { id: "T4-PERP",            name: "T4",   sub: "Index"     },
  { id: "ORACLE-B200-PERP",   name: "B200", sub: "Oracle"    },
  { id: "COREWEAVE-B200-PERP",name: "B200", sub: "CoreWeave" },
  // { id: "H100-non-HyperScalers-PERP", name: "H100", sub: "Neocloud" },
];

const LandingPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const { openLogin, openSignup } = useAuthModal();
  const { disconnect } = useDisconnect();
  const queryClient = useQueryClient();
  const [selectedMarket, setSelectedMarket] = useState("H100-PERP");
  const [selectedModel, setSelectedModel] = useState("H100");

  const [formData, setFormData] = useState({
    name: "", email: "", role: "", interest: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [heroMouse, setHeroMouse] = useState({ x: 0, y: 0, clientX: 0, clientY: 0, rect: null });

  /* ─── Refs for scroll-driven sections ─── */
  const heroRef = useRef(null);
  const chartRef = useRef(null);
  const pageRef = useRef(null);
  const docsRef = useRef(null);
  const methodologyRef = useRef(null);

  /* ─── 1. Scroll Progress Bar — full page ─── */
  const { scrollYProgress: pageProgress } = useScroll();
  const smoothProgress = useSpring(pageProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  /* ─── 2. Hero Parallax Exit ─── */
  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroTextY = useTransform(heroScrollProgress, [0, 1], [0, -150]);
  const heroTextOpacity = useTransform(heroScrollProgress, [0, 0.7], [1, 0]);
  const heroBgY = useTransform(heroScrollProgress, [0, 1], [0, 80]);

  /* ─── 3. Chart Scale-In ─── */
  const { scrollYProgress: chartScrollProgress } = useScroll({
    target: chartRef,
    offset: ["start end", "center center"],
  });
  const chartScale = useTransform(chartScrollProgress, [0, 1], [0.85, 1]);
  const chartOpacity = useTransform(chartScrollProgress, [0, 0.6], [0.3, 1]);

  /* ─── Effects ─── */
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (docsRef.current && !docsRef.current.contains(e.target)) setDocsOpen(false);
      if (methodologyRef.current && !methodologyRef.current.contains(e.target)) setMethodologyOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setSessionLoading(false);
    };
    getSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setSessionLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const getProfile = async () => {
      if (session?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("username, kyc_status, wallet_address")
          .eq("id", session.user.id)
          .single();
        if (data) setProfile(data);
      } else {
        setProfile(null);
      }
    };
    getProfile();
  }, [session]);

  const handleLogout = async () => {
    disconnect();
    queryClient.clear();
    useTradingStore.setState({
      size: "",
      priceLimit: "",
      lastTxHash: null,
      lastTxSide: null,
      closingPositionId: null,
      closeSize: "",
    });
    useNotificationStore.getState().teardown();
    setProfile(null);
    await supabase.auth.signOut();
    navigate("/");
  };

  const [indexPrices, setIndexPrices] = useState({});
  useEffect(() => {
    (async () => {
      const [h100, b200, t4, oracleB200, coreweaveB200, h100Neocloud] = await Promise.all([
        // GPU index markets
        supabase.from("price_data").select("price").order("timestamp", { ascending: false }).limit(1).single(),
        supabase.from("b200_index_prices").select("index_price").order("created_at", { ascending: false }).limit(1).single(),
        supabase.from("t4_index_prices").select("index_price").order("created_at", { ascending: false }).limit(1).single(),
        // Provider markets (mirror SPARKLINE_CONFIG providerFilter values)
        supabase.from("b200_provider_prices").select("effective_price").eq("provider_name", "Oracle").order("created_at", { ascending: false }).limit(1).single(),
        supabase.from("b200_provider_prices").select("effective_price").eq("provider_name", "CoreWeave").order("created_at", { ascending: false }).limit(1).single(),
        supabase.from("price_data").select("price").order("timestamp", { ascending: false }).limit(1).single(),
      ]);
      setIndexPrices({
        "H100-PERP":           h100.data?.price                   != null ? parseFloat(h100.data.price)                         : null,
        "B200-PERP":           b200.data?.index_price             != null ? parseFloat(b200.data.index_price)                   : null,
        "T4-PERP":             t4.data?.index_price               != null ? parseFloat(t4.data.index_price)                     : null,
        "ORACLE-B200-PERP":    oracleB200.data?.effective_price   != null ? parseFloat(oracleB200.data.effective_price)         : null,
        "COREWEAVE-B200-PERP": coreweaveB200.data?.effective_price != null ? parseFloat(coreweaveB200.data.effective_price)    : null,
        "H100-non-HyperScalers-PERP": h100Neocloud.data?.price != null ? parseFloat(h100Neocloud.data.price) : null,
      });
    })();
  }, []);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await submitInterest(formData);
      if (result.duplicate) {
        toast.success("This email is already registered! We'll keep you updated.");
      } else {
        toast.success("Thank you for your interest!");
      }
      setFormData({ name: "", email: "", role: "", interest: "" });
    } catch (error) {
      console.error("Error submitting form:", error.message);
      toast.error("Sorry, there was an error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const marketNameMap = {
    "H100-PERP": "NVIDIA H100",
    "A100-PERP": "NVIDIA A100",
    "H200-PERP": "NVIDIA H200",
    "B200-PERP": "NVIDIA Blackwell B200",
    "T4-PERP": "NVIDIA T4",
    "H100-non-HyperScalers-PERP": "Neocloud H100",
    "ORACLE-H200-PERP": "Oracle Cloud H200",
    "AWS-H200-PERP": "AWS H200",
    "COREWEAVE-H200-PERP": "CoreWeave H200",
    "GCP-H200-PERP": "Google Cloud H200",
    "ORACLE-B200-PERP": "Oracle Cloud B200",
    "AWS-B200-PERP": "AWS B200",
    "COREWEAVE-B200-PERP": "CoreWeave B200",
    "GCP-B200-PERP": "Google Cloud B200",
  };

  return (
    <div ref={pageRef} className="min-h-screen bg-[#0a0a0f] text-zinc-100 font-sans selection:bg-blue-600/30 relative" style={{ overflowX: "clip" }}>

      {session && <Web3AuthHandler />}


      {/* ─── Navbar ─── */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          isScrolled
            ? "bg-[#0a0a0f]/85 backdrop-blur-md border-b border-white/[0.05] py-3"
            : "bg-transparent py-4"
        }`}
      >
        <div className="container mx-auto px-6 lg:px-8 flex justify-between items-center">
          <Routerlink to="/" className="flex items-center gap-3">
            <img src={logoImage} alt="ByteStrike" className="h-7 w-auto" />
          </Routerlink>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-7">
            {["What We're Exploring", "Why This Matters", "Your Input", "About Us"].map((item, i) => {
              const to = ["what-we-do", "why-it-matters", "contact", "about"][i];
              return (
                <Link key={to} to={to} smooth={true} duration={500} offset={-80}
                  className="text-[13px] text-zinc-300 hover:text-white transition-colors duration-150 cursor-pointer">
                  {item}
                </Link>
              );
            })}

            <Routerlink
              to="/security"
              className="text-[13px] text-zinc-300 hover:text-white transition-colors duration-150"
            >
              Security
            </Routerlink>

            {/* ── Docs Dropdown ───────────────────────────────────── */}
            <div className="relative" ref={docsRef} onMouseEnter={() => { setDocsOpen(true); setMethodologyOpen(false); }} onMouseLeave={() => setDocsOpen(false)}>
              <button
                className="text-[13px] text-zinc-300 hover:text-white transition-colors duration-150 cursor-pointer flex items-center gap-1"
              >
                Docs
                <motion.svg
                  animate={{ rotate: docsOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-3 h-3"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
              </button>

              <AnimatePresence>
                {docsOpen && (
                  <motion.div
                    variants={dropdownVariants}
                    initial="hidden" animate="visible" exit="exit"
                    className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-50"
                  >
                    <div className="bg-[#111118] border border-white/[0.08] rounded-xl shadow-2xl p-5 w-[580px]">
                      <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-4">Contract Reference</p>
                      <div className="grid grid-cols-2 gap-6">
                        {[
                          {
                            category: "Core Protocol",
                            items: [
                              { id: "overview",      label: "Architecture Overview", desc: "System topology and upgrade paths" },
                              { id: "clearinghouse", label: "ClearingHouse",         desc: "Positions, margin, liquidations"  },
                            ],
                          },
                          {
                            category: "Risk & Financials",
                            items: [
                              { id: "insurancefund", label: "InsuranceFund",       desc: "Shortfall coverage mechanism"  },
                              { id: "oracle",        label: "Oracle System",        desc: "Price feed adapter interfaces" },
                              { id: "calculations",  label: "Calculations Library", desc: "WAD math and margin formulas"  },
                            ],
                          },
                        ].map(({ category, items }) => (
                          <div key={category}>
                            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">{category}</p>
                            {items.map(item => (
                              <Routerlink
                                key={item.id}
                                to={`/docs#${item.id}`}
                                onClick={() => setDocsOpen(false)}
                                className="block py-2 px-2 -mx-2 rounded-lg hover:bg-white/[0.05] transition-colors group/item"
                              >
                                <p className="text-sm font-medium text-zinc-200 group-hover/item:text-white transition-colors">{item.label}</p>
                                <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
                              </Routerlink>
                            ))}
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-4 border-t border-white/[0.06]">
                        <Routerlink
                          to="/docs"
                          onClick={() => setDocsOpen(false)}
                          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          View full contract reference →
                        </Routerlink>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Index Methodology Dropdown ──────────────────────── */}
            <div className="relative" ref={methodologyRef} onMouseEnter={() => { setMethodologyOpen(true); setDocsOpen(false); }} onMouseLeave={() => setMethodologyOpen(false)}>
              <button
                className="text-[13px] text-zinc-300 hover:text-white transition-colors duration-150 cursor-pointer flex items-center gap-1"
              >
                Index Methodology
                <motion.svg
                  animate={{ rotate: methodologyOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-3 h-3"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
              </button>

              <AnimatePresence>
                {methodologyOpen && (
                  <motion.div
                    variants={dropdownVariants}
                    initial="hidden" animate="visible" exit="exit"
                    className="absolute top-full right-0 pt-3 z-50"
                  >
                    <div className="bg-[#111118] border border-white/[0.08] rounded-xl shadow-2xl p-5 w-[380px]">
                      <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-4">Price Indices</p>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { path: "/methodology/h100", label: "H100", desc: "NVIDIA H100 SXM & PCIe compute index"   },
                          { path: "/methodology/a100", label: "A100", desc: "NVIDIA A100 80GB data center index"     },
                          { path: "/methodology/b200", label: "B200", desc: "NVIDIA Blackwell B200 compute index"    },
                          { path: "/methodology/t4",   label: "T4",   desc: "NVIDIA T4 inference GPU index"         },
                        ].map(item => (
                          <Routerlink
                            key={item.path}
                            to={item.path}
                            onClick={() => setMethodologyOpen(false)}
                            className="group/item block p-3 rounded-lg border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition-colors duration-150"
                          >
                            <p className="text-sm font-semibold text-zinc-100 group-hover/item:text-white transition-colors mb-1">{item.label}</p>
                            <p className="text-xs text-zinc-500 leading-relaxed">{item.desc}</p>
                          </Routerlink>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Routerlink
              to="/trade"
              className="px-4 py-1.5 rounded-full border border-white/[0.12] bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/[0.2] text-zinc-200 hover:text-white text-[13px] font-medium transition-colors duration-150"
            >
              Trade
            </Routerlink>
            {!sessionLoading && session && (
              <NotificationBell userId={session.user?.id} />
            )}
            {sessionLoading || (session && !profile) ? (
              <div className="w-24 h-8 rounded-md bg-white/[0.04] animate-pulse" />
            ) : session && profile ? (
              <ProfileDropdown session={session} profile={profile} onLogout={handleLogout} />
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openLogin()}
                  className="px-2.5 py-1.5 text-[13px] text-zinc-300 hover:text-white transition-colors duration-150"
                >
                  Login
                </button>
                <button
                  onClick={() => openSignup()}
                  className="px-4 py-1.5 text-[13px] font-semibold text-zinc-900 bg-white hover:bg-zinc-100 rounded-md transition-colors duration-150"
                >
                  Sign up
                </button>
              </div>
            )}
          </div>

          {/* Mobile: profile pill + hamburger */}
          <div className="md:hidden flex items-center gap-2">
            {sessionLoading || (session && !profile) ? (
              <div className="w-8 h-8 rounded-full bg-white/[0.04] animate-pulse" />
            ) : session && profile ? (
              <ProfileDropdown session={session} profile={profile} onLogout={handleLogout} />
            ) : null}
            <button className="text-white p-1" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }} className="md:hidden bg-[#0a0a0f]/95 backdrop-blur-xl border-b border-white/[0.06] overflow-hidden">
              <div className="flex flex-col p-6 gap-4">
                {["What We're Exploring", "Why This Matters", "Your Input", "About Us"].map((item, i) => (
                  <Link key={i} to={["what-we-do", "why-it-matters", "contact", "about"][i]} smooth={true} offset={-80} onClick={() => setIsMenuOpen(false)} className="text-zinc-400 hover:text-white">{item}</Link>
                ))}
                <div className="h-px bg-white/[0.06] my-2"></div>
                <Routerlink to="/trade" className="text-white font-medium" onClick={() => setIsMenuOpen(false)}>Trade</Routerlink>
                <Routerlink to="/security" className="text-zinc-400 hover:text-white" onClick={() => setIsMenuOpen(false)}>Security</Routerlink>
                <Routerlink to="/docs" className="text-zinc-400 hover:text-white" onClick={() => setIsMenuOpen(false)}>Docs</Routerlink>
                <div className="text-zinc-600 text-xs uppercase tracking-wider mt-2">Documentation</div>
                <Routerlink to="/methodology/h100" className="text-zinc-400 hover:text-white" onClick={() => setIsMenuOpen(false)}>H100 Methodology</Routerlink>
                <Routerlink to="/methodology/a100" className="text-zinc-400 hover:text-white" onClick={() => setIsMenuOpen(false)}>A100 Methodology</Routerlink>
                <Routerlink to="/methodology/b200" className="text-zinc-400 hover:text-white" onClick={() => setIsMenuOpen(false)}>B200 Methodology</Routerlink>
                {session && profile ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {profile.username ? profile.username.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-white">{profile.username || "User"}</span>
                        <span className="text-xs text-zinc-500 truncate max-w-[150px]">{session.user.email}</span>
                      </div>
                    </div>
                    <Routerlink to="/settings" className="flex items-center gap-2 text-zinc-400 hover:text-white p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l-.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                      Settings
                    </Routerlink>
                    <button onClick={handleLogout} className="text-left text-red-400 hover:text-red-300 font-medium p-2">Logout</button>
                  </div>
                ) : (
                  <>
                    <button onClick={() => { setIsMenuOpen(false); openLogin(); }} className="text-zinc-400 text-left">Login</button>
                    <button onClick={() => { setIsMenuOpen(false); openSignup(); }} className="btn-primary text-center">Sign Up</button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>


      {/* ═══ HERO ═══ */}
      <section
        ref={heroRef}
        className="relative min-h-screen pt-28 md:pt-32 pb-20 flex items-center"
      >
        <motion.div
          className="container mx-auto px-6 lg:px-12 max-w-7xl relative z-10"
          style={{ y: heroTextY, opacity: heroTextOpacity }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-12 items-center">

            {/* ─── LEFT: Content ────────────────────────────────────────── */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="lg:col-span-7"
            >
              {/* Eyebrow */}
              <motion.div variants={fadeUpSubtle} className="flex items-center gap-2.5 mb-7">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.22em]">
                  GPU Compute Futures · Live on Sepolia
                </span>
              </motion.div>

              {/* Headline — declarative, specific */}
              <motion.h1
                variants={blurFadeIn}
                className="text-[42px] sm:text-5xl md:text-[58px] lg:text-[68px] font-semibold text-white tracking-[-0.025em] leading-[1.04] mb-6"
              >
                A Futures Exchange<br className="hidden sm:block" /> For Gpu Compute.
              </motion.h1>

              {/* Subheading — what it is, in one sentence */}
              <motion.p
                variants={fadeUp}
                className="text-base md:text-lg text-zinc-400 leading-relaxed max-w-xl mb-10"
              >
                Perpetual contracts on H100, H200, B200, and T4 rental rates -
                settled live against aggregated cloud provider indices.
              </motion.p>

              {/* CTAs — deliberate, not pill-shaped */}
              <motion.div
                variants={fadeUp}
                className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 mb-14"
              >
                <Routerlink
                  to="/trade"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white text-zinc-900 font-semibold text-sm hover:bg-zinc-200 transition-colors duration-150"
                >
                  Open Trading App
                </Routerlink>
                <Routerlink
                  to="/markets"
                  className="group inline-flex items-center gap-1.5 text-sm font-medium text-zinc-300 hover:text-white transition-colors px-2 py-3"
                >
                  View Markets
                  <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Routerlink>
              </motion.div>

              {/* Status strip — concrete proof points */}
              <motion.div
                variants={fadeUpSubtle}
                className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-zinc-500"
              >
                <span>16 markets live</span>
                <span className="w-px h-3 bg-white/[0.08]" />
                <span>Onchain settlement</span>
                <span className="w-px h-3 bg-white/[0.08]" />
                <span className="inline-flex items-center gap-2">
                  <span>Audited by</span>
                  <a
                    href="https://www.cyfrin.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Cyfrin"
                    className="inline-flex items-center opacity-80 hover:opacity-100 transition-opacity duration-150"
                  >
                    <img src={cyfrinWordmark} alt="Cyfrin" className="h-3.5 w-auto" loading="lazy" />
                  </a>
                  <span className="text-zinc-700">&</span>
                  <a
                    href="https://www.battlechain.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="BattleChain"
                    className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-white transition-colors duration-150"
                  >
                    <img src={battlechainLogo} alt="" className="h-3.5 w-auto" loading="lazy" />
                    <span className="font-medium">BattleChain</span>
                  </a>
                </span>
              </motion.div>
            </motion.div>

            {/* ─── RIGHT: Live exchange snippet ──────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
              className="lg:col-span-5"
            >
              <div className="rounded-xl border border-white/[0.08] bg-[#0c0c12] overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)]">

                {/* Window header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.05] bg-[#08080c]">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                    </span>
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-[0.18em]">
                      Live Markets
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">$ / GPU · hr</span>
                </div>

                {/* Market rows — infinite auto-scroll */}
                <div className="overflow-hidden" style={{ height: "189px" }}>
                  <motion.div
                    animate={{ y: ["0%", "-50%"] }}
                    transition={{ duration: 16, repeat: Infinity, ease: "linear", repeatType: "loop" }}
                  >
                    {[...HERO_TICKER_MARKETS, ...HERO_TICKER_MARKETS].map((m, i) => (
                      <div
                        key={`${m.id}-${i}`}
                        className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.04]"
                      >
                        <div className="w-12 shrink-0">
                          <div className="text-sm font-semibold text-white leading-none">{m.name}</div>
                          <div className="text-[9px] text-zinc-600 mt-1.5 leading-none font-mono tracking-wide">{m.sub}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <Sparkline marketId={m.id} width={120} height={26} block />
                        </div>
                        <div className="text-right w-20 shrink-0 font-mono">
                          <div className="text-sm font-semibold text-white">
                            {indexPrices[m.id] != null
                              ? `$${indexPrices[m.id].toFixed(2)}`
                              : <span className="text-zinc-700">—</span>}
                          </div>
                          <div className="text-[9px] text-zinc-600 mt-1 leading-none">Index</div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.05] bg-[#08080c]">
                  <span className="text-[10px] text-zinc-600">Updated continuously</span>
                  <Routerlink
                    to="/markets"
                    className="group inline-flex items-center gap-1 text-[10px] font-medium text-zinc-400 hover:text-white transition-colors"
                  >
                    View all
                    <svg className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Routerlink>
                </div>
              </div>
            </motion.div>

          </div>
        </motion.div>
      </section>

      {/* ═══ MARKETS PREVIEW (disabled — flip `false` to `true` to re-enable) ═══ */}
      {false && (
      <section className="relative z-10 py-20 md:py-28 overflow-hidden">
        {/* Hairline separator */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />

        <div className="container mx-auto px-6">
          <AnimatedSection className="flex flex-col items-center">

            {/* Eyebrow */}
            <motion.p
              variants={fadeUpSubtle}
              className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-400/70 mb-5"
            >
              Live GPU Markets
            </motion.p>

            {/* Headline */}
            <motion.h2
              variants={blurFadeIn}
              className="text-4xl md:text-5xl font-semibold text-white tracking-tight mb-4 text-center leading-[1.1]"
            >
              The world's compute,<br className="hidden sm:block" /> priced live.
            </motion.h2>

            {/* Sub */}
            <motion.p
              variants={fadeUp}
              className="text-zinc-400 max-w-md mx-auto text-base leading-relaxed text-center mb-14"
            >
              Perpetual futures on GPU rental rates, aggregated from global cloud providers in real time.
            </motion.p>

            {/* Cards */}
            <motion.div
              variants={staggerContainer}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 w-full max-w-4xl"
            >
              {GPU_INDEX_MARKETS.map((market) => (
                <motion.div
                  key={market.id}
                  variants={fadeUpSubtle}
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 320, damping: 22 }}
                >
                  <Routerlink
                    to={`/trade?market=${market.id}`}
                    className="group flex flex-col h-full p-4 md:p-5 rounded-2xl bg-white/[0.025] border border-white/[0.07] hover:border-white/[0.14] hover:bg-white/[0.04] transition-all duration-300 relative overflow-hidden"
                  >
                    {/* Hover top accent */}
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/0 to-transparent group-hover:via-blue-500/50 transition-all duration-500 pointer-events-none" />

                    {/* Name + badges */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0">
                        <div className="text-[22px] md:text-2xl font-semibold text-white tracking-tight leading-none">
                          {market.name}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-1 leading-none">{market.full}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
                        <span className="text-[8px] text-zinc-600 border border-zinc-800/80 px-1.5 py-0.5 rounded font-mono">
                          PERP
                        </span>
                        {market.badge && (
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${market.badgeColor}`}>
                            {market.badge}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Sparkline — fills card width */}
                    <div className="my-2 w-full">
                      <Sparkline marketId={market.id} width={160} height={44} block />
                    </div>

                    {/* Price */}
                    <div className="mt-2">
                      {indexPrices[market.id] != null ? (
                        <span className="text-[17px] font-mono font-semibold text-white tracking-tight">
                          ${indexPrices[market.id].toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-[17px] font-mono font-semibold text-zinc-700">—</span>
                      )}
                      <div className="text-[9px] text-zinc-600 mt-0.5 uppercase tracking-widest">per GPU · hr</div>
                    </div>

                    {/* Trade CTA */}
                    <div className="flex items-center gap-1 mt-auto pt-3 text-[11px] font-medium text-zinc-600 group-hover:text-blue-400 transition-colors duration-200">
                      Trade futures
                      <svg
                        className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  </Routerlink>
                </motion.div>
              ))}
            </motion.div>

            {/* Bottom actions */}
            <motion.div variants={fadeUp} className="mt-10 flex items-center gap-5 text-sm">
              <Routerlink
                to="/markets"
                className="group inline-flex items-center gap-1.5 font-medium text-zinc-400 hover:text-white transition-colors"
              >
                View all markets
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Routerlink>
              <span className="w-1 h-1 rounded-full bg-zinc-700" />
              <Routerlink
                to="/trade"
                className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                Start trading →
              </Routerlink>
            </motion.div>

          </AnimatedSection>
        </div>
      </section>
      )}

      <div className="section-divider max-w-5xl mx-auto" />


      {/* ═══ PRICE INDEX CHART ═══ */}
      <section id="what-we-do" className="py-20 md:py-24 relative z-10">
        <div className="container mx-auto px-6 lg:px-12 max-w-6xl">
          <AnimatedSection className="flex flex-col items-center">

            {/* Section header — restrained, product-driven */}
            <motion.div variants={blurFadeIn} className="text-center mb-10">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500 mb-3">
                Indices
              </p>
              <h2 className="text-3xl md:text-[38px] font-semibold text-white tracking-[-0.02em] leading-[1.1] mb-3">
                Live GPU Price Indices.
              </h2>
              <p className="text-zinc-400 text-[15px] leading-relaxed max-w-lg mx-auto">
                Composite indices from major cloud providers. Updated continuously.
              </p>
            </motion.div>

            {/* Model selector — segmented control, not pill */}
            <motion.div variants={fadeUp} className="relative z-20 w-full max-w-5xl mx-auto">
              <div className="flex flex-col items-center gap-3">

                {/* Primary tabs */}
                <div className="inline-flex items-center p-1 bg-white/[0.025] rounded-lg border border-white/[0.05]">
                  {["H100", "B200", "H200", "T4", "A100"].map((model) => {
                    const isActive = selectedModel === model;
                    return (
                      <button
                        key={model}
                        onClick={() => {
                          setSelectedModel(model);
                          const firstMarket = model === "H100" ? "H100-PERP" : model === "A100" ? "A100-PERP" : model === "H200" ? "H200-PERP" : model === "B200" ? "B200-PERP" : "T4-PERP";
                          setSelectedMarket(firstMarket);
                        }}
                        className={`relative px-5 md:px-6 py-2 rounded-md text-[12px] md:text-[13px] font-semibold transition-colors duration-150 whitespace-nowrap ${
                          isActive ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="modelActive"
                            className="absolute inset-0 bg-white/[0.06] rounded-md"
                            transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                          />
                        )}
                        <span className="relative z-10">{model}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Sub-market chips — subtle, restrained, fixed-height container to prevent layout jump */}
                <div className="min-h-[34px] flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    {selectedModel !== "A100" && selectedModel !== "T4" && (
                      <motion.div
                        key={selectedModel}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div className="flex flex-wrap justify-center gap-1.5">
                          {(selectedModel === "H100" ? [
                            { name: "H100-PERP", label: "Global Weighted Average" },
                            { name: "H100-non-HyperScalers-PERP", label: "Neocloud Index" },
                          ] : selectedModel === "H200" ? [
                            { name: "H200-PERP", label: "Global Average" },
                            { name: "ORACLE-H200-PERP", label: "Oracle Cloud" },
                            { name: "AWS-H200-PERP", label: "AWS" },
                            { name: "COREWEAVE-H200-PERP", label: "CoreWeave" },
                            { name: "GCP-H200-PERP", label: "Google Cloud" },
                          ] : [
                            { name: "B200-PERP", label: "Global Average" },
                            { name: "ORACLE-B200-PERP", label: "Oracle Cloud" },
                            { name: "AWS-B200-PERP", label: "AWS" },
                            { name: "COREWEAVE-B200-PERP", label: "CoreWeave" },
                            { name: "GCP-B200-PERP", label: "Google Cloud" },
                          ]).map((market) => {
                            const isActive = selectedMarket === market.name;
                            return (
                              <button
                                key={market.name}
                                onClick={() => setSelectedMarket(market.name)}
                                className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors duration-150 border ${
                                  isActive
                                    ? "bg-white/[0.06] text-white border-white/[0.1]"
                                    : "bg-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.025] border-transparent"
                                }`}
                              >
                                {market.label}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>

            {/* Chart panel — clean, no ambient glow, no top accent */}
            <motion.div
              ref={chartRef}
              style={{ scale: chartScale, opacity: chartOpacity }}
              className="w-full max-w-5xl h-[400px] md:h-[480px] relative mt-6"
            >
              {/* Trade action — minimal text link, top-right */}
              <Routerlink
                to={`/trade?market=${selectedMarket}`}
                className="absolute -top-9 right-0 group hidden md:inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-400 hover:text-white transition-colors duration-150"
              >
                Trade {selectedModel}
                <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Routerlink>

              <div className="relative w-full h-full bg-[#0c0c12] border border-white/[0.07] rounded-xl overflow-visible">
                <PriceIndexChart market={selectedMarket} />
              </div>
            </motion.div>

            {/* Methodology footer — inline note + link, no icon block */}
            <motion.div
              variants={fadeUp}
              className="w-full max-w-5xl mt-10 pt-6 border-t border-white/[0.05] flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
            >
              <p className="text-zinc-500 text-[13px] leading-relaxed max-w-xl">
                Indices are computed from real-time provider pricing with revenue-weighted
                adjustments and performance normalization.
              </p>
              <Routerlink
                to={`/methodology/${selectedModel.toLowerCase()}`}
                className="group inline-flex items-center gap-1.5 text-[13px] font-medium text-zinc-300 hover:text-white transition-colors duration-150 shrink-0"
              >
                View {selectedModel} methodology
                <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Routerlink>
            </motion.div>

          </AnimatedSection>
        </div>
      </section>

      <div className="section-divider max-w-5xl mx-auto" />


      {/* ═══ TRADING INTERFACE PREVIEW ═══ */}
      <section className="relative z-10 py-20 md:py-24">
        <div className="container mx-auto px-6 lg:px-12 max-w-6xl">

          {/* Section header — eyebrow + tight heading + corner CTA */}
          <AnimatedSection className="mb-8 flex items-end justify-between flex-wrap gap-4">
            <motion.div variants={fadeUpSubtle}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500 mb-3">
                Interface
              </p>
              <h2 className="text-2xl md:text-[28px] font-semibold text-white tracking-[-0.015em] leading-[1.1]">
                Our Trading Platform.
              </h2>
            </motion.div>
            <motion.div variants={fadeUpSubtle}>
              <Routerlink
                to="/trade"
                className="group inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Open trading app
                <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H8M17 7V16" />
                </svg>
              </Routerlink>
            </motion.div>
          </AnimatedSection>

          {/* Embedded trading interface frame — real product slice */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="rounded-lg border border-white/[0.08] bg-[#0a0a10] overflow-hidden"
          >
            {/* App chrome — minimal terminal-style top bar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-[#08080c]">
              <div className="flex items-center gap-3 min-w-0">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                <span className="text-[11px] font-semibold text-zinc-300 font-mono tracking-wide truncate">H100-PERP</span>
                <span className="hidden sm:inline text-[10px] text-zinc-600 font-mono uppercase tracking-[0.14em]">Perp · Index</span>
              </div>
              <div className="flex items-center gap-3 font-mono shrink-0">
                <span className="hidden sm:inline text-[9px] text-zinc-600 uppercase tracking-[0.14em]">Last</span>
                <span className="text-[11px] font-semibold text-white tabular-nums">
                  {indexPrices?.["H100-PERP"] != null ? `$${Number(indexPrices["H100-PERP"]).toFixed(2)}` : "$3.77"}
                </span>
                <span className="text-[10px] font-medium text-emerald-400 tabular-nums">+0.10%</span>
              </div>
            </div>

            {/* Body — asymmetric chart + order slice */}
            <div className="grid grid-cols-12">

              {/* Chart — 8 cols, compact mode (no internal header), single blue line */}
              <div className="col-span-12 lg:col-span-8 h-[340px] lg:h-[400px] border-b lg:border-b-0 lg:border-r border-white/[0.06] relative">
                <PriceIndexChart market="H100-PERP" compact />
              </div>

              {/* Order slice — 4 cols */}
              <div className="col-span-12 lg:col-span-4 flex flex-col">

                {/* Slice header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                    New Order
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-zinc-600">
                    Market · Cross
                  </span>
                </div>

                {/* Body */}
                <div className="flex-1 p-4 flex flex-col gap-3.5">

                  {/* Long / Short */}
                  <div className="grid grid-cols-2 gap-px bg-zinc-800/80 rounded-md overflow-hidden p-px">
                    <div className="py-1.5 text-center text-[11px] font-semibold rounded bg-emerald-500/[0.10] text-emerald-400 border border-emerald-500/[0.18]">
                      Long
                    </div>
                    <div className="py-1.5 text-center text-[11px] font-semibold text-zinc-500 rounded">
                      Short
                    </div>
                  </div>

                  {/* Size */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">Size</span>
                      <span className="text-[9px] font-mono text-zinc-600">USDC</span>
                    </div>
                    <div className="px-3 py-2 bg-white/[0.02] border border-white/[0.06] rounded-md">
                      <span className="text-[13px] font-mono tabular-nums text-white">1,250.00</span>
                    </div>
                  </div>

                  {/* Leverage */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">Leverage</span>
                      <span className="text-[11px] font-mono tabular-nums text-zinc-300">5×</span>
                    </div>
                    <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full w-[44%] bg-zinc-300/80 rounded-full" />
                    </div>
                    <div className="flex justify-between text-[9px] font-mono text-zinc-700 mt-0.5">
                      <span>1×</span><span>3×</span><span>5×</span><span>10×</span>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="border-t border-white/[0.06] pt-3 space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500">Margin</span>
                      <span className="font-mono text-zinc-200 tabular-nums">$250.00</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500">Est. liq.</span>
                      <span className="font-mono text-zinc-200 tabular-nums">$3.02</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500">Fee</span>
                      <span className="font-mono text-zinc-200 tabular-nums">$0.625</span>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="mt-auto h-9 rounded-md bg-emerald-500/[0.10] border border-emerald-500/[0.20] text-emerald-400 text-[12px] font-semibold flex items-center justify-center">
                    Place Long Order
                  </div>

                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      <div className="section-divider max-w-5xl mx-auto" />

      {/* ═══ MARKET CONTEXT ═══ */}
      <section id="why-it-matters" className="relative z-10 py-20 md:py-28">
        <div className="container mx-auto px-6 lg:px-12 max-w-6xl">

          {/* Section header — statement, not a question */}
          <AnimatedSection className="mb-12 md:mb-14 max-w-3xl mx-auto text-center">
            <motion.p
              variants={fadeUpSubtle}
              className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500 mb-3"
            >
              Market Context
            </motion.p>
            <motion.h2
              variants={blurFadeIn}
              className="text-3xl md:text-[40px] font-semibold text-white tracking-[-0.02em] leading-[1.1] mb-4"
            >
              Compute Markets Are Missing<br className="hidden sm:block" /> Their Financial Layer.
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-zinc-400 text-[15px] leading-relaxed max-w-xl mx-auto"
            >
              Compute is the new oil. The market needs sophisticated financial tools to manage the explosive growth and volatility of AI infrastructure.
            </motion.p>
          </AnimatedSection>

          {/* Cards — bordered grid, hairline separators */}
          <AnimatedSection
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.05] rounded-xl overflow-hidden border border-white/[0.05]"
          >
            {whyNowCardsData.map((card) => (
              <motion.div
                key={card.num}
                variants={fadeUpSubtle}
                className="bg-[#0a0a0f] hover:bg-[#0c0c14] transition-colors duration-150 p-6 md:p-7 flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono font-semibold text-zinc-600 tabular-nums">
                    {card.num}
                  </span>
                  <span className="flex-1 h-px bg-white/[0.06]" />
                </div>
                <h3 className="text-[15px] font-semibold text-white leading-snug">
                  {card.title}
                </h3>
                <p className="text-zinc-500 text-[13px] leading-relaxed">
                  {card.body}
                </p>
              </motion.div>
            ))}
          </AnimatedSection>

        </div>
      </section>

      <div className="section-divider max-w-5xl mx-auto" />


      {/* ═══ REQUEST ACCESS ═══ */}
      <section id="contact" className="py-20 md:py-28 relative z-10">
        <div className="container mx-auto px-6 lg:px-12 max-w-6xl">
          <AnimatedSection variants={staggerContainer}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">

              {/* ─── LEFT: Context ─── */}
              <motion.div variants={fadeUp} className="lg:col-span-5 lg:sticky lg:top-32">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500 mb-3">
                  Get in Touch
                </p>
                <h2 className="text-3xl md:text-[40px] font-semibold text-white tracking-[-0.02em] leading-[1.1] mb-4">
                  Questions & Feedback.
                </h2>
                <p className="text-zinc-400 text-[15px] leading-relaxed max-w-md">
                  Share thoughts, suggestions, or anything you'd like us to consider as we
                  build out the platform. We read every message.
                </p>

                {/* Direct email alternative */}
                <div className="mt-10 pt-6 border-t border-white/[0.05]">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600 mb-2">
                    Or reach us directly
                  </div>
                  <a
                    href="mailto:gabejaffe@byte-strike.com"
                    className="group inline-flex items-center gap-1.5 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
                  >
                    gabejaffe@byte-strike.com
                    <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </a>
                </div>
              </motion.div>

              {/* ─── RIGHT: Form panel ─── */}
              <motion.div variants={fadeUp} className="lg:col-span-7">
                <div className="bg-white/[0.02] border border-white/[0.07] rounded-xl p-6 md:p-8">

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Row 1 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="contact-name" className="block text-[12px] font-medium text-zinc-400 mb-1.5">
                          Name
                        </label>
                        <input
                          id="contact-name"
                          type="text"
                          name="name"
                          required
                          value={formData.name}
                          onChange={handleFormChange}
                          placeholder="Your name"
                          className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/[0.25] focus:bg-white/[0.03] transition-colors duration-150"
                        />
                      </div>
                      <div>
                        <label htmlFor="contact-email" className="block text-[12px] font-medium text-zinc-400 mb-1.5">
                          Work / Personal email
                        </label>
                        <input
                          id="contact-email"
                          type="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleFormChange}
                          placeholder="you@company.com"
                          className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/[0.25] focus:bg-white/[0.03] transition-colors duration-150"
                        />
                      </div>
                    </div>

                    {/* Row 2 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="contact-role" className="block text-[12px] font-medium text-zinc-400 mb-1.5">
                          Role
                        </label>
                        <input
                          id="contact-role"
                          type="text"
                          name="role"
                          value={formData.role}
                          onChange={handleFormChange}
                          placeholder="e.g. Infrastructure Lead"
                          className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/[0.25] focus:bg-white/[0.03] transition-colors duration-150"
                        />
                      </div>
                      <div>
                        <label htmlFor="contact-interest" className="block text-[12px] font-medium text-zinc-400 mb-1.5">
                          Message <span className="text-zinc-600 font-normal">(optional)</span>
                        </label>
                        <input
                          id="contact-interest"
                          type="text"
                          name="interest"
                          value={formData.interest}
                          onChange={handleFormChange}
                          placeholder="Share your thoughts or questions"
                          className="w-full bg-white/[0.02] border border-white/[0.08] rounded-md px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/[0.25] focus:bg-white/[0.03] transition-colors duration-150"
                        />
                      </div>
                    </div>

                    {/* Submit row */}
                    <div className="pt-3 mt-2 border-t border-white/[0.05] flex items-center justify-end">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex items-center justify-center px-5 py-2.5 rounded-md bg-white text-zinc-900 font-semibold text-sm hover:bg-zinc-200 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? "Sending…" : "Send message"}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>

            </div>
          </AnimatedSection>
        </div>
      </section>

      <div className="section-divider max-w-5xl mx-auto" />


      {/* ═══ ABOUT US ═══ */}
      <section id="about" className="py-24 relative z-10">
        <div className="container mx-auto px-6">
          <AnimatedSection className="max-w-5xl mx-auto">

            {/* Header */}
            <motion.div variants={fadeUp} className="mb-12">
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium mb-4">About Us</p>
              <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight leading-[1.1] mb-5">
                The Financial Layer<br className="hidden sm:block" /> For Compute.
              </h2>
              <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-2xl">
                ByteStrike is a licensed futures exchange for GPU compute hours. We turn AI's most strategic commodity into a tradable, hedgeable asset.
              </p>
            </motion.div>

            <div className="h-px bg-white/[0.06] mb-10" />

            {/* Three editorial columns */}
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  num: "01",
                  label: "The Problem",
                  body: "AI runs on GPU hours. The market for them is enormous, and primitive. Spot prices swing 10×. Enterprises overpay on long-term contracts. Operators sit on idle capacity. There is no standardized instrument, no forward curve, no way to hedge directional exposure.",
                },
                {
                  num: "02",
                  label: "What We Do",
                  body: "ByteStrike gives compute the financial rails it's missing. Enterprises lock in prices ahead of training runs. Operators hedge utilization and monetize idle capacity. Allocators gain AI exposure without owning hardware. Settlement is onchain; counterparty risk is managed at the exchange layer.",
                },
                {
                  num: "03",
                  label: "Why Now",
                  body: "Hyperscalers and neoclouds will spend hundreds of billions on GPUs this cycle. That capital demands price discovery, risk transfer, and liquidity. The commodities that shaped the last century - oil, power, grain - each found their market. Compute is next, and it's bigger than any of them.",
                },
              ].map(({ num, label, body }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: i * 0.09, ease: [0.25, 0.1, 0.25, 1] }}
                  className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-6 flex flex-col gap-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-zinc-600 tabular-nums">{num}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{label}</span>
                  </div>
                  <div className="h-px bg-white/[0.05]" />
                  <p className="text-zinc-400 text-sm leading-relaxed">{body}</p>
                </motion.div>
              ))}
            </div>

            {/* Contact footer */}
            <motion.div variants={fadeUp} className="mt-12">
              <div className="flex items-center justify-between flex-wrap gap-4 px-5 py-4 rounded-lg border border-white/[0.06] bg-white/[0.015]">
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                    Get in touch
                  </p>
                </div>
                <a
                  href="mailto:gabejaffe@byte-strike.com"
                  className="group inline-flex items-center gap-2 text-[13px] font-medium text-zinc-300 hover:text-white transition-colors duration-150"
                >
                  gabejaffe@byte-strike.com
                  <svg className="w-3 h-3 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-150" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H8M17 7V16" />
                  </svg>
                </a>
              </div>
            </motion.div>

          </AnimatedSection>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
