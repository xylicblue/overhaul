import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-scroll";
import Web3AuthHandler from "./web3auth";
import toast from "react-hot-toast";
import { Link as Routerlink, useNavigate } from "react-router-dom";
import PriceIndexChart from "./chart";
import { supabase } from "./creatclient";
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
import tradingPreview from "./assets/tradingpic.png";
import ProfileDropdown from "./dropdown";
import { useAuthModal } from "./context/AuthModalContext";

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
    title: "Explosive Demand",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-3.75-2.25M21 12l-3.75 2.25" />
      </svg>
    ),
    summary: "The demand for computational resources, driven by AI and LLMs, is growing at an unprecedented rate.",
    details: "No AI model or industrial process can run without compute. The gap between supply and demand is widening.",
  },
  {
    title: "Market Volatility",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.362-6.867 8.267 8.267 0 013 2.48Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
      </svg>
    ),
    summary: "GPU prices and cloud costs face extreme volatility, making financial planning a high-stakes gamble.",
    details: "Compute markets are opaque and volatile. Supply chain disruptions and geopolitical factors drive cost swings.",
  },
  {
    title: "Capital Constraints",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V6.375c0-.621.504-1.125 1.125-1.125h.375m16.5 0h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m0 0h-.375a1.125 1.125 0 01-1.125-1.125V6.375c0-.621.504-1.125 1.125-1.125h.375M3 8.25v1.5m18-1.5v1.5m-12-1.5h.008v.008H9v-.008zm4.5 0h.008v.008h-.008v-.008zm4.5 0h.008v.008h-.008v-.008zm-9 4.5h.008v.008H9v-.008zm4.5 0h.008v.008h-.008v-.008zm4.5 0h.008v.008h-.008v-.008z" />
      </svg>
    ),
    summary: "Perceived risk and uncertainty in AI infrastructure leads to high financing costs.",
    details: "Hedging instruments reduce perceived risk, lower financing costs, and unlock larger infrastructure commitments.",
  },
  {
    title: "Need for Hedging",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286zm0 13.036h.008v.008h-.008v-.008z" />
      </svg>
    ),
    summary: "A futures market provides essential financial tools for price discovery and risk management.",
    details: "High-growth companies rely on steady prices. Compute infrastructure requires massive upfront investment and long-term planning.",
  },
];


const LandingPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const { openLogin, openSignup } = useAuthModal();
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
  const horizontalRef = useRef(null);
  const aboutImageRef = useRef(null);
  const pageRef = useRef(null);

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

  /* ─── 4. Horizontal Scroll for "Why Now" ─── */
  const { scrollYProgress: horizontalScrollProgress } = useScroll({
    target: horizontalRef,
    offset: ["start start", "end end"],
  });
  const horizontalX = useTransform(horizontalScrollProgress, [0, 1], ["0%", "-20%"]);

  /* ─── 5. About Image Curtain Reveal ─── */
  const { scrollYProgress: aboutImageProgress } = useScroll({
    target: aboutImageRef,
    offset: ["start end", "center center"],
  });
  const curtainScaleX = useTransform(aboutImageProgress, [0, 1], [1, 0]);

  /* ─── 6. Platform Preview Cinematic Reveal ─── */
  const previewRef = useRef(null);
  const { scrollYProgress: previewProgress } = useScroll({
    target: previewRef,
    offset: ["start end", "end center"],
  });
  const previewRotateX = useTransform(previewProgress, [0, 1], [8, 0]);
  const previewScale = useTransform(previewProgress, [0, 1], [0.9, 1]);
  const previewOpacity = useTransform(previewProgress, [0, 0.4], [0, 1]);

  /* ─── Effects ─── */
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };
    getSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
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
      }
    };
    getProfile();
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("interest_list").insert([formData]);
      if (error) {
        if (error.code === "23505" || error.message.includes("duplicate")) {
          toast.success("This email is already registered! We'll keep you updated.");
          setFormData({ name: "", email: "", role: "", interest: "" });
          return;
        }
        throw error;
      }
      toast.success("Thank you for your interest!");
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
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/[0.06] py-3"
            : "bg-transparent py-5"
        }`}
      >
        <div className="container mx-auto px-6 flex justify-between items-center">
          <Routerlink to="/" className="flex items-center gap-3">
            <img src={logoImage} alt="ByteStrike" className="h-7 w-auto" />
          </Routerlink>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {["What We're Exploring", "Why This Matters", "Your Input", "About Us"].map((item, i) => {
              const to = ["what-we-do", "why-it-matters", "contact", "about"][i];
              return (
                <Link key={to} to={to} smooth={true} duration={500} offset={-80}
                  className="text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer">
                  {item}
                </Link>
              );
            })}
            
            {/* Index Methodology Dropdown */}
            <div className="relative group">
              <button className="text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1">
                Index Methodology
                <svg className="w-3 h-3 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="bg-[#12121a] border border-white/[0.08] rounded-xl shadow-xl overflow-hidden min-w-[180px]">
                  {[
                    { path: "/methodology/h100", label: "H100 Methodology" },
                    { path: "/methodology/a100", label: "A100 Methodology" },
                    { path: "/methodology/b200", label: "B200 Methodology" },
                    { path: "/methodology/t4", label: "T4 Methodology" },
                  ].map((item, i, arr) => (
                    <Routerlink key={item.path} to={item.path}
                      className={`block px-4 py-3 text-sm text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors ${i < arr.length - 1 ? "border-b border-white/[0.06]" : ""}`}>
                      {item.label}
                    </Routerlink>
                  ))}
                </div>
              </div>
            </div>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Routerlink to="/trade" className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">
              Trade
            </Routerlink>
            {session && profile ? (
              <ProfileDropdown session={session} profile={profile} onLogout={handleLogout} />
            ) : (
              <div className="flex items-center gap-3">
                <button onClick={() => openLogin()} className="text-sm text-zinc-400 hover:text-white transition-colors">Login</button>
                <button onClick={() => openSignup()}
                  className="px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-300">
                  Sign Up
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
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
                <Routerlink to="/trade" className="text-blue-400 font-medium" onClick={() => setIsMenuOpen(false)}>Trade</Routerlink>
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


      {/* ═══ HERO SECTION — Interactive: 3D tilt + chart line + magnetic buttons ═══ */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width - 0.5;
          const y = (e.clientY - rect.top) / rect.height - 0.5;
          setHeroMouse({ x, y, clientX: e.clientX, clientY: e.clientY, rect });
        }}
        onMouseLeave={() => setHeroMouse({ x: 0, y: 0, clientX: 0, clientY: 0, rect: null })}
      >
        {/* Cursor spotlight */}
        {heroMouse.rect && (
          <div
            className="absolute pointer-events-none z-0"
            style={{
              left: heroMouse.clientX - heroMouse.rect.left - 200,
              top: heroMouse.clientY - heroMouse.rect.top - 200,
              width: 400,
              height: 400,
              background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)",
              transition: "left 0.15s ease-out, top 0.15s ease-out",
            }}
          />
        )}

        {/* Background blobs — lag behind on scroll */}
        <motion.div className="absolute inset-0 pointer-events-none" style={{ y: heroBgY }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-600/[0.07] rounded-full blur-[120px] animate-gradient-shift" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-purple-600/[0.04] rounded-full blur-[100px]" />
        </motion.div>


        {/* ─── Animated Chart Line (SVG background) ─── */}
        <motion.svg
          className="absolute inset-0 w-full h-full pointer-events-none z-[1]"
          viewBox="0 0 1400 800"
          preserveAspectRatio="none"
          initial="hidden"
          animate="visible"
        >
          <defs>
            <linearGradient id="chartLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(59,130,246,0)" />
              <stop offset="30%" stopColor="rgba(59,130,246,0.15)" />
              <stop offset="70%" stopColor="rgba(59,130,246,0.2)" />
              <stop offset="100%" stopColor="rgba(59,130,246,0.05)" />
            </linearGradient>
            <filter id="chartGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <motion.path
            d="M0,500 C100,480 200,520 300,460 C400,400 450,440 550,380 C650,320 700,350 800,310 C900,270 950,290 1050,250 C1150,210 1200,230 1300,200 C1350,185 1400,190 1400,190"
            fill="none"
            stroke="url(#chartLineGrad)"
            strokeWidth="2"
            filter="url(#chartGlow)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 2.5, ease: "easeInOut", delay: 0.8 }}
          />
          {/* Subtle fill area under the line */}
          <motion.path
            d="M0,500 C100,480 200,520 300,460 C400,400 450,440 550,380 C650,320 700,350 800,310 C900,270 950,290 1050,250 C1150,210 1200,230 1300,200 C1350,185 1400,190 1400,190 L1400,800 L0,800 Z"
            fill="url(#chartLineGrad)"
            opacity="0.03"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.03 }}
            transition={{ duration: 2, delay: 1.5 }}
          />
        </motion.svg>

        {/* Hero content — 3D tilt on mouse + moves up faster on scroll */}
        <motion.div
          className="container mx-auto px-6 relative z-10 text-center"
          style={{
            y: heroTextY,
            opacity: heroTextOpacity,
            rotateX: heroMouse.y * -8,
            rotateY: heroMouse.x * 8,
            transformPerspective: 1200,
          }}
        >
          <motion.div variants={staggerContainer} initial="hidden" animate="visible">
            {/* Badge */}
            <motion.div variants={scaleFade}>
              <span className="inline-block py-1.5 px-4 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-widest mb-8">
                The Future of Compute
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1 variants={blurFadeIn} className="text-5xl md:text-7xl font-semibold mb-6 tracking-tight leading-[1.1] text-white">
              A New Marketplace <br />for Compute
            </motion.h1>

            {/* Subheading */}
            <motion.p variants={fadeUp} className="text-lg md:text-xl text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              Trade against live cloud GPU prices. We are building the foundational
              infrastructure for a futures market where compute capacity is
              priced, risk-managed, and traded like a commodity.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="contact" smooth={true} offset={-80}
                className="px-8 py-3.5 rounded-full bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-all duration-200 cursor-pointer">
                Join Interest List
              </Link>
              <Routerlink to="/trade"
                className="group px-8 py-3.5 rounded-full border border-white/[0.1] bg-white/[0.04] text-white font-semibold text-sm hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-200 flex items-center gap-2">
                <span>Trade Now</span>
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Routerlink>
            </motion.div>

            {/* Trust line */}
            <motion.div variants={staggerContainer} className="mt-16 flex flex-wrap justify-center items-center gap-x-6 gap-y-2">
              {["Live Price Indices", "GPU Compute Futures", "Transparent Methodology"].map((text, i) => (
                <React.Fragment key={text}>
                  {i > 0 && <motion.span variants={fadeUpSubtle} className="w-1 h-1 rounded-full bg-zinc-700" />}
                  <motion.span variants={fadeUpSubtle} className="text-xs text-zinc-500 uppercase tracking-wider">{text}</motion.span>
                </React.Fragment>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10"
          style={{ opacity: useTransform(heroScrollProgress, [0, 0.2], [1, 0]) }}
        >
          <span className="text-[10px] text-zinc-600 uppercase tracking-widest">Scroll</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
          >
            <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </motion.div>
        </motion.div>
      </section>

      <div className="section-divider max-w-5xl mx-auto" />


      {/* ═══ PRICE INDEX CHART — with scroll scale-in ═══ */}
      <section id="what-we-do" className="py-24 relative z-10">
        <div className="container mx-auto px-6">
          <AnimatedSection className="flex flex-col items-center">
            
            {/* Section Header */}
            <motion.div variants={blurFadeIn} className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight mb-4">
                Real-Time GPU Price Indices
              </h2>
              <p className="text-zinc-400 max-w-2xl mx-auto text-lg leading-relaxed">
                Live pricing data aggregated from major cloud providers,
                updated continuously to reflect the true cost of compute.
              </p>
            </motion.div>

            {/* GPU Model Selector */}
            <motion.div variants={fadeUp} className="relative z-20 w-full max-w-5xl mx-auto mb-10">
              <div className="flex flex-col items-center gap-6 relative z-10">
                <div className="flex items-center p-1 bg-white/[0.03] rounded-full border border-white/[0.08]">
                  {["H100", "A100", "H200", "B200", "T4"].map((model) => (
                    <button key={model}
                      onClick={() => {
                        setSelectedModel(model);
                        const firstMarket = model === "H100" ? "H100-PERP" : model === "A100" ? "A100-PERP" : model === "H200" ? "H200-PERP" : model === "B200" ? "B200-PERP" : "T4-PERP";
                        setSelectedMarket(firstMarket);
                      }}
                      className={`relative px-5 md:px-7 py-2.5 rounded-full text-xs md:text-sm font-medium transition-all duration-300 whitespace-nowrap ${selectedModel === model ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
                      {selectedModel === model && (
                        <motion.div layoutId="modelActive" className="absolute inset-0 bg-white/[0.08] rounded-full border border-white/[0.06]"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                      )}
                      <span className="relative z-10">{model}</span>
                    </button>
                  ))}
                </div>

                {/* Sub-market pills */}
                <AnimatePresence mode="wait">
                  {selectedModel !== "A100" && selectedModel !== "T4" && (
                    <motion.div key={selectedModel}
                      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}>
                      <div className="flex flex-wrap justify-center gap-2">
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
                        ]).map((market) => (
                          <button key={market.name} onClick={() => setSelectedMarket(market.name)}
                            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                              selectedMarket === market.name
                                ? "bg-blue-600 text-white"
                                : "bg-white/[0.04] text-zinc-500 hover:bg-white/[0.08] hover:text-zinc-300 border border-white/[0.06]"
                            }`}>
                            {market.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Chart Container — scroll-linked scale-in + ambient glow */}
            <motion.div
              ref={chartRef}
              style={{ scale: chartScale, opacity: chartOpacity }}
              className="w-full max-w-5xl h-[400px] md:h-[500px] relative px-4 md:px-0"
            >
              {/* Ambient glow behind the card */}
              <div className="absolute -inset-4 bg-blue-600/[0.06] rounded-3xl blur-2xl pointer-events-none" />
              
              <div className="relative w-full h-full bg-[#0d0d14] border border-white/[0.08] rounded-2xl overflow-hidden">
                {/* Gradient accent line at the top */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
                
                <div className="p-4 md:p-8 h-full">
                  <div className="flex items-start justify-between mb-4 md:mb-0">
                    <div className="z-10">
                      <motion.div key={selectedMarket} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-1">
                        <h3 className="text-xl md:text-2xl font-semibold text-white tracking-tight">
                          {marketNameMap[selectedMarket] || "GPU Index"}
                        </h3>
                        <p className="text-xs md:text-sm text-zinc-500 flex items-center gap-2">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          Real-Time Index Price
                        </p>
                      </motion.div>
                    </div>
                    {/* Trade action in top right */}
                    <Routerlink 
                      to="/trade" 
                      className="group hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.1] transition-all text-xs text-zinc-400 hover:text-white"
                    >
                      Trade {selectedModel}
                      <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Routerlink>
                  </div>
                  <div className="pt-8 md:pt-4 h-full w-full overflow-hidden" style={{ height: "calc(100% - 60px)" }}>
                    <PriceIndexChart market={selectedMarket} />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Methodology Link */}
            <motion.div variants={fadeUp} className="w-full max-w-3xl mx-auto mt-16 px-6 relative z-10">
              <div className="flex flex-col items-center text-center">
                <motion.div variants={scaleFade} className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-6">
                  <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </motion.div>
                <h4 className="text-2xl md:text-3xl font-semibold text-white mb-4 tracking-tight">
                  Transparent, Rigorous Methodology
                </h4>
                <p className="text-zinc-400 leading-relaxed max-w-2xl text-base md:text-lg mb-8">
                  Our GPU indices are calculated using real-time pricing from qualified providers, 
                  revenue-weighted adjustments, and performance normalization.
                </p>
                <Routerlink to={`/methodology/${selectedModel.toLowerCase()}`}
                  className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.12] transition-all duration-200">
                  <span className="text-zinc-200 group-hover:text-white transition-colors text-sm font-medium">
                    View {selectedModel} Methodology
                  </span>
                  <svg className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors group-hover:translate-x-0.5 transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Routerlink>
              </div>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      <div className="section-divider max-w-5xl mx-auto" />


      {/* ═══ PLATFORM PREVIEW — Cinematic Floating Reveal ═══ */}
      <section className="relative z-10 -mt-8 pb-32" style={{ perspective: "1200px" }}>
        <div className="container mx-auto px-6">
          <motion.div
            ref={previewRef}
            className="relative w-full max-w-5xl mx-auto"
            style={{
              rotateX: previewRotateX,
              scale: previewScale,
              opacity: previewOpacity,
              transformOrigin: "center top",
            }}
          >
            {/* Ambient glow */}
            <div className="absolute -inset-6 bg-blue-600/[0.08] rounded-3xl blur-3xl pointer-events-none" />
            <div className="absolute -inset-12 bg-blue-500/[0.03] rounded-3xl blur-[60px] pointer-events-none" />
            
            {/* Browser frame */}
            <div className="relative rounded-2xl overflow-hidden border border-white/[0.1] shadow-2xl shadow-blue-950/40">
              {/* Top bar (faux browser chrome) */}
              <div className="flex items-center gap-2 px-4 py-3 bg-[#111118] border-b border-white/[0.06]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="flex items-center gap-2 px-5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-xs text-zinc-500">
                    <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    bytestrike.com/trade
                  </div>
                </div>
                <div className="w-16" />
              </div>

              {/* Screenshot */}
              <img
                src={tradingPreview}
                alt="ByteStrike Trading Platform"
                className="w-full h-auto block"
                loading="lazy"
              />

              {/* Bottom fade */}
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/70 to-transparent pointer-events-none" />
            </div>

            {/* CTA floating over bottom fade */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center z-10">
              <Routerlink
                to="/trade"
                className="group inline-flex items-center gap-3 px-8 py-3.5 rounded-full bg-white hover:bg-zinc-200 text-zinc-900 font-semibold text-sm transition-all duration-200 shadow-lg shadow-black/30"
              >
                <span>Start Trading</span>
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Routerlink>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="section-divider max-w-5xl mx-auto" />

      {/* ═══ WHY NOW — Horizontal Scroll Section ═══ */}
      <section id="why-it-matters" className="relative z-10">
        {/* This outer div is tall to give us scroll travel */}
        <div ref={horizontalRef} className="relative" style={{ height: "200vh" }}>
          {/* Sticky container stays in view while we scroll through 300vh */}
          <div className="sticky top-0 h-screen flex flex-col justify-center overflow-hidden">
            
            {/* Section header */}
            <AnimatedSection className="text-center mb-12 px-6">
              <motion.h2 variants={blurFadeIn} className="text-4xl md:text-5xl font-semibold mb-6 text-white tracking-tight">
                Why Now? The Inevitable Shift
              </motion.h2>
              <motion.p variants={fadeUp} className="text-zinc-400 max-w-2xl mx-auto text-lg">
                Compute is the new oil. The market needs sophisticated financial
                tools to manage the explosive growth and volatility of AI
                infrastructure.
              </motion.p>
            </AnimatedSection>

            {/* Horizontal scrolling cards */}
            <motion.div
              className="flex gap-8 pl-8 md:pl-16 lg:pl-24 will-change-transform"
              style={{ x: horizontalX }}
            >
              {whyNowCardsData.map((card, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 w-[340px] md:w-[400px] relative"
                >                  <div className="h-full p-8 rounded-2xl bg-white/[0.025] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300 group relative">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                      {React.cloneElement(card.icon, { className: "w-6 h-6" })}
                    </div>
                    {/* Title */}
                    <h3 className="text-xl font-semibold text-white mb-3">{card.title}</h3>
                    {/* Summary */}
                    <p className="text-zinc-400 text-sm leading-relaxed mb-4">{card.summary}</p>
                    {/* Details */}
                    <p className="text-zinc-500 text-xs leading-relaxed pt-4 border-t border-white/[0.06]">{card.details}</p>
                  </div>
                </div>
              ))}

              {/* Extra padding so last card is fully visible */}
              <div className="flex-shrink-0 w-24" />
            </motion.div>
          </div>
        </div>
      </section>

      <div className="section-divider max-w-5xl mx-auto" />


      {/* ═══ CONTACT FORM ═══ */}
      <section id="contact" className="py-24 relative z-10">
        <div className="container mx-auto px-6 max-w-3xl relative z-10">
          <AnimatedSection className="text-center mb-12">
            <motion.h2 variants={blurFadeIn} className="text-4xl md:text-5xl font-semibold text-white tracking-tight mb-6">
              Contact
            </motion.h2>
            <motion.p variants={fadeUp} className="text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed">
              We are conducting market discovery. If you are a potential
              user, supplier, or infrastructure operator, we invite you to
              share your interest.
            </motion.p>
          </AnimatedSection>

          <AnimatedSection>
            <motion.div variants={scaleFade} className="bg-white/[0.025] border border-white/[0.06] rounded-2xl p-8 md:p-10">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <motion.div variants={fadeUpSubtle}>
                    <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Name</label>
                    <input type="text" name="name" required
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                      placeholder="Your name" value={formData.name} onChange={handleFormChange} />
                  </motion.div>
                  <motion.div variants={fadeUpSubtle}>
                    <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Email</label>
                    <input type="email" name="email" required
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                      placeholder="you@company.com" value={formData.email} onChange={handleFormChange} />
                  </motion.div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <motion.div variants={fadeUpSubtle}>
                    <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Role / Industry</label>
                    <input type="text" name="role"
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                      placeholder="e.g. Infrastructure Lead" value={formData.role} onChange={handleFormChange} />
                  </motion.div>
                  <motion.div variants={fadeUpSubtle}>
                    <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Interest (Optional)</label>
                    <input type="text" name="interest"
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                      placeholder="Tell us more" value={formData.interest} onChange={handleFormChange} />
                  </motion.div>
                </div>

                <motion.div variants={fadeUpSubtle} className="text-center pt-4">
                  <button type="submit" disabled={isSubmitting}
                    className="group inline-flex items-center gap-3 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-full transition-all duration-200 disabled:opacity-50">
                    <span>{isSubmitting ? "Sending..." : "Request Access"}</span>
                    <svg className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                    </svg>
                  </button>
                </motion.div>
              </form>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      <div className="section-divider max-w-5xl mx-auto" />


      {/* ═══ ABOUT US — with image curtain reveal ═══ */}
      <section id="about" className="py-24 relative z-10">
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid md:grid-cols-12 gap-10 lg:gap-16 items-center">
              
            {/* Image with curtain wipe reveal */}
            <AnimatedSection className="md:col-span-5 relative flex flex-col justify-center" variants={staggerContainer}>
              <motion.div variants={slideFromLeft} ref={aboutImageRef} className="relative rounded-2xl overflow-hidden border border-white/[0.06] max-w-[400px] mx-auto w-full">
                <div className="aspect-square">
                  <img src={ceoPortrait} alt="Gabe Jaffe" loading="lazy" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent opacity-60"></div>
                </div>


                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="absolute bottom-5 left-5 z-20"
                >
                  <div className="bg-[#0a0a0f]/80 backdrop-blur-md border border-white/[0.08] rounded-xl px-5 py-3">
                    <p className="text-white text-lg font-semibold tracking-tight">Gabe Jaffe</p>
                    <p className="text-xs text-zinc-400 uppercase tracking-widest mt-0.5">Founder & CEO</p>
                  </div>
                </motion.div>
              </motion.div>
            </AnimatedSection>

            {/* Bio */}
            <AnimatedSection className="md:col-span-7 space-y-8" variants={staggerContainer}>
              <motion.div variants={slideFromRight}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/20 mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  <span className="text-blue-300 text-[10px] font-semibold uppercase tracking-widest">Vision & Leadership</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight leading-[1.1]">
                  About Us
                </h2>
              </motion.div>

              <motion.div variants={fadeUp} className="space-y-4 text-base md:text-lg text-zinc-400 leading-relaxed">
                <p>
                  <span className="text-white">Gabe Jaffe</span> is a Sophomore student at the <span className="text-white">McDonough School of Business</span> at Georgetown University. At the age of 15, he founded his first company, <span className="text-white">Teen Hampton</span> and <span className="text-white">Teen NYC</span>, a digital platform for teenage tutors, sports instructors, and babysitters, that has housed more than 100 workers and served more than 1,000 clients.
                </p>
                <p>
                  As Gabe scaled the business, he appeared on{" "}
                  <a href="https://www.youtube.com/watch?v=MJko_jIdZxk" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">Good Day New York</a>,{" "}
                  <a href="https://www.foxnews.com/video/6307767277112" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">Fox National News</a>,{" "}
                  <a href="https://www.youtube.com/watch?v=stkR3mEhIAQ" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">CBS Inside Edition</a>, and more to discuss his accomplishments.
                </p>
                <p>
                  Now, he is working to build the foundations of a futures market for compute as a commodity to accelerate AI learning and market growth.
                </p>
              </motion.div>

              {/* Blockquote */}
              <motion.div variants={fadeUp} className="border-l-2 border-blue-600 pl-6 py-2">
                <blockquote className="text-lg md:text-xl italic text-zinc-200 leading-relaxed">
                  "We stand at a pivotal moment where computational power is the most critical resource on the planet. Our mission is to build the tools that will power the next century of innovation."
                </blockquote>
              </motion.div>

              <motion.div variants={fadeUpSubtle} className="flex items-center gap-4 pt-6 border-t border-white/[0.06]">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium mb-0.5">Get in Touch</p>
                  <a href="mailto:gabe.jaffe@bytestrike.com" className="text-lg text-white hover:text-blue-400 transition-colors">
                    gabejaffe@byte-strike.com
                  </a>
                </div>
              </motion.div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
