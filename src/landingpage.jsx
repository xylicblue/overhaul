import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-scroll";
import Web3AuthHandler from "./web3auth";
import toast from "react-hot-toast";
import { Link as Routerlink, useNavigate } from "react-router-dom";
import PriceIndexChart from "./chart";
import { supabase } from "./creatclient";
import AnimatedSection from "./animated";
import Footer from "./components/Footer";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
} from "framer-motion";
import heroBackground from "./assets/bg.jpg";
import whatIsItVisual from "./assets/ai.png";
import logoImage from "./assets/ByteStrikeLogoFinal.png";
import ceoPortrait from "./assets/gabe.jpg";
import ProfileDropdown from "./dropdown";
import NetworkMesh from "./components/NetworkMesh";
import SpotlightCard from "./components/SpotlightCard";

import ParticleNetwork from "./components/ParticleNetwork";
import AuroraBackground from "./components/AuroraBackground";


const whyNowCardsData = [
  {
    title: "Explosive Demand",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-3.75-2.25M21 12l-3.75 2.25"
        />
      </svg>
    ),
    summary:
      "The demand for computational resources, driven by AI and LLMs, is growing at an unprecedented rate.",
    details:
      "No AI model or industrial process can run without compute. The gap between supply and demand is widening.",
  },
  {
    title: "Market Volatility",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.362-6.867 8.267 8.267 0 013 2.48Z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z"
        />
      </svg>
    ),
    summary:
      "GPU prices and cloud costs face extreme volatility, making financial planning a high-stakes gamble.",
    details:
      "Compute markets are opaque and volatile. Supply chain disruptions and geopolitical factors drive cost swings.",
  },
  {
    title: "Capital Constraints",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V6.375c0-.621.504-1.125 1.125-1.125h.375m16.5 0h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m0 0h-.375a1.125 1.125 0 01-1.125-1.125V6.375c0-.621.504-1.125 1.125-1.125h.375M3 8.25v1.5m18-1.5v1.5m-12-1.5h.008v.008H9v-.008zm4.5 0h.008v.008h-.008v-.008zm4.5 0h.008v.008h-.008v-.008zm-9 4.5h.008v.008H9v-.008zm4.5 0h.008v.008h-.008v-.008zm4.5 0h.008v.008h-.008v-.008z"
        />
      </svg>
    ),
    summary:
      "Perceived risk and uncertainty in AI infrastructure leads to high financing costs.",
    details:
      "Hedging instruments reduce perceived risk, lower financing costs, and unlock larger infrastructure commitments.",
  },
  {
    title: "Need for Hedging",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286zm0 13.036h.008v.008h-.008v-.008z"
        />
      </svg>
    ),
    summary:
      "A futures market provides essential financial tools for price discovery and risk management.",
    details:
      "High-growth companies rely on steady prices. Compute infrastructure requires massive upfront investment and long-term planning.",
  },
];

const LandingPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expandedCardIndex, setExpandedCardIndex] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const [selectedMarket, setSelectedMarket] = useState("H100-PERP"); // Market selection for index chart

  // Mobile detection for performance optimization
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    interest: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
    };
    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
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
          toast.success(
            "This email is already registered! We'll keep you updated."
          );
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

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-indigo-500/30 relative overflow-hidden">


      {session && <Web3AuthHandler />}

      {/* Navbar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-slate-950/70 backdrop-blur-xl border-b border-white/5 py-3 shadow-lg shadow-black/20"
            : "bg-transparent py-6"
        }`}
      >
        <div className="container mx-auto px-6 flex justify-between items-center">
          <Routerlink to="/" className="flex items-center gap-3 group">
            <img
              src={logoImage}
              alt="Byte Strike"
              className="h-9 w-auto transition-transform group-hover:scale-105 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]"
            />
          </Routerlink>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {[
              "What We're Exploring",
              "Why This Matters",
              "Your Input",
              "About Us",
            ].map((item, i) => {
              const to = ["what-we-do", "why-it-matters", "contact", "about"][
                i
              ];
              return (
                <Link
                  key={to}
                  to={to}
                  smooth={true}
                  duration={500}
                  offset={-80}
                  className="text-sm font-medium text-slate-300 hover:text-white transition-colors cursor-pointer hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                >
                  {item}
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Routerlink
              to="/trade"
              className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors hover:drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]"
            >
              Trade
            </Routerlink>
            {session && profile ? (
              <ProfileDropdown
                session={session}
                profile={profile}
                onLogout={handleLogout}
              />
            ) : (
              <div className="flex items-center gap-3">
                <Routerlink
                  to="/login"
                  className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Login
                </Routerlink>
                <Routerlink
                  to="/signup"
                  className="relative px-5 py-2.5 rounded-full bg-white text-black text-xs font-bold uppercase tracking-wide shadow-lg shadow-white/10 hover:shadow-white/20 hover:scale-105 transition-all duration-300 overflow-hidden group"
                >
                  <span className="relative z-10">Sign Up</span>
                  <div className="absolute inset-0 bg-slate-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Routerlink>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  isMenuOpen
                    ? "M6 18L18 6M6 6l12 12"
                    : "M4 6h16M4 12h16M4 18h16"
                }
              />
            </svg>
          </button>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-slate-900/95 backdrop-blur-xl border-b border-white/10 overflow-hidden"
            >
              <div className="flex flex-col p-6 gap-4">
                {[
                  "What We're Exploring",
                  "Why This Matters",
                  "Your Input",
                  "About Us",
                ].map((item, i) => (
                  <Link
                    key={i}
                    to={["what-we-do", "why-it-matters", "contact", "about"][i]}
                    smooth={true}
                    offset={-80}
                    onClick={() => setIsMenuOpen(false)}
                    className="text-slate-300 hover:text-white font-medium"
                  >
                    {item}
                  </Link>
                ))}
                <div className="h-px bg-white/10 my-2"></div>
                <Routerlink to="/trade" className="text-blue-400 font-semibold">
                  Trade
                </Routerlink>
                {session && profile ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                      <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {profile.username
                          ? profile.username.charAt(0).toUpperCase()
                          : "U"}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-white">
                          {profile.username || "User"}
                        </span>
                        <span className="text-xs text-slate-400 truncate max-w-[150px]">
                          {session.user.email}
                        </span>
                      </div>
                    </div>

                    <Routerlink
                      to="/settings"
                      className="flex items-center gap-2 text-slate-300 hover:text-white p-2"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                      Settings
                    </Routerlink>

                    <button
                      onClick={handleLogout}
                      className="text-left text-red-400 hover:text-red-300 font-medium p-2"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <>
                    <Routerlink to="/login" className="text-slate-300">
                      Login
                    </Routerlink>
                    <Routerlink
                      to="/signup"
                      className="btn-primary text-center"
                    >
                      Sign Up
                    </Routerlink>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <AuroraBackground className="min-h-screen pt-20 overflow-hidden relative">
        <ParticleNetwork className="absolute inset-0 z-0 pointer-events-none opacity-40" />
        <motion.div
          style={isMobile ? {} : { y: heroY, opacity: heroOpacity }}
          className="container mx-auto px-6 relative z-10 text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="mb-8"
          >
            <span className="inline-block py-1 px-3 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6 backdrop-blur-sm">
              The Future of Compute
            </span>
            <h1 className="text-6xl md:text-8xl font-extrabold mb-6 tracking-tight leading-tight">
              A New Marketplace <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-500 animate-gradient-x">
                for Compute
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 mb-10 max-w-3xl mx-auto leading-relaxed font-light">
              Hedge, Plan, and Scale. We are building the foundational
              infrastructure for a futures market where compute capacity is
              priced, risk-managed, and traded like a commodity.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link
                to="contact"
                smooth={true}
                offset={-80}
                className="relative group px-8 py-4 rounded-full bg-white text-black font-bold text-lg shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105 transition-all duration-300"
              >
                Join Interest List
              </Link>
              <Routerlink
                to="/trade"
                className="relative group px-8 py-4 rounded-full bg-white/5 border border-white/10 text-white font-bold text-lg backdrop-blur-md hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:scale-105 transition-all duration-300 flex items-center gap-2"
              >
                Trade
                <svg
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Routerlink>
            </div>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-slate-500"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7-7-7"
            />
          </svg>
        </motion.div>
      </AuroraBackground>



      {/* Price Index Chart */}
      <section className="py-12 relative z-10">
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center">
            
            {/* Minimalist Floating Nav */}
            <div className="mb-12 relative z-20">
              <div className="flex flex-wrap justify-center items-center gap-1 p-1.5 rounded-full bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
                {[
                  { name: "H100-PERP", label: "H100 GPU" },
                  { name: "B200-PERP", label: "B200 GPU" },
                  { name: "H100-HyperScalers-PERP", label: "Hyperscalers" },
                  { name: "H100-non-HyperScalers-PERP", label: "Specialized" },
                ].map((market) => (
                  <button
                    key={market.name}
                    onClick={() => setSelectedMarket(market.name)}
                    className={`relative px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                      selectedMarket === market.name ? "text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {selectedMarket === market.name && (
                      <motion.div
                        layoutId="minimalNav"
                        className="absolute inset-0 bg-white/10 rounded-full shadow-inner border border-white/5"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className="relative z-10">{market.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Seamless Chart Container */}
            <div className="w-full max-w-5xl h-[500px] relative group perspective-1000">
               {/* Ambient Glow */}
               <div className="absolute -inset-10 bg-gradient-to-tr from-indigo-500/10 via-purple-500/5 to-blue-500/10 rounded-[50px] blur-3xl opacity-50 group-hover:opacity-75 transition-opacity duration-1000" />
               
               <div className="relative w-full h-full bg-black/40 backdrop-blur-sm border border-white/5 rounded-[40px] p-8 shadow-2xl transition-transform duration-700 hover:scale-[1.01]">
                 <div className="absolute top-8 left-8 z-10">
                    <motion.div
                      key={selectedMarket}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col gap-1"
                    >
                      <h3 className="text-3xl font-bold text-white tracking-tight">
                        {
                          selectedMarket === "H100-PERP" ? "NVIDIA H100" :
                          selectedMarket === "B200-PERP" ? "NVIDIA Blackwell B200" :
                          selectedMarket === "H100-HyperScalers-PERP" ? "Hyperscaler Aggregate" : "Specialized Cloud"
                        }
                      </h3>
                      <p className="text-sm font-medium text-slate-400 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                        Real-Time Index Price
                      </p>
                    </motion.div>
                 </div>
                 
                 {/* Chart with extra padding for the header */}
                 <div className="pt-16 h-full">
                    <PriceIndexChart market={selectedMarket} />
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Do */}
      <AnimatedSection id="what-we-do" className="py-20 relative z-10">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                What Is a Compute Futures Exchange?
              </h2>
              <p className="text-slate-300 text-lg leading-relaxed mb-8">
                We are envisioning a regulated marketplace where compute
                capacity itself becomes a tradable commodity. This platform
                would enable participants to buy or sell standardized contracts
                for future compute delivery, like GPU hours or cloud capacity,
                at prices locked in today.
              </p>
              <div className="pl-6 border-l-4 border-indigo-500 bg-indigo-500/5 py-4 pr-4 rounded-r-xl">
                <p className="text-slate-400 italic text-lg">
                  "Think of it like the established futures markets for energy
                  or agriculture. We're applying that same powerful financial
                  model to the foundational resource of the 21st century."
                </p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="relative group"
            >

              <NetworkMesh />
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {/* Why Now - Bento Grid */}
      <section id="why-it-matters" className="py-20 relative z-10">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Why Now? The Inevitable Shift
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              Compute is the new oil. The market needs sophisticated financial
              tools to manage the explosive growth and volatility of AI
              infrastructure.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {whyNowCardsData.map((card, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="h-full"
              >
                <SpotlightCard className="h-full flex flex-col">
                  <div className="mb-auto">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-indigo-400 mb-6">
                      {card.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-white">
                      {card.title}
                    </h3>
                    <p className="text-slate-400 leading-relaxed text-sm">
                      {card.summary}
                    </p>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-white/5">
                    <p className="text-xs text-slate-500">
                      {card.details}
                    </p>
                  </div>
                </SpotlightCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact" className="py-20 relative z-10">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="relative">

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 md:p-16 shadow-2xl relative z-10">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4">Contact</h2>
                <p className="text-slate-300 text-lg">
                  We are conducting market discovery. If you are a potential
                  user, supplier, or infrastructure operator, we invite you to
                  share your interest.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="group">
                    <label className="block text-xs font-bold text-indigo-400 mb-2 uppercase tracking-wider group-focus-within:text-indigo-300 transition-colors">
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all duration-300"
                      value={formData.name}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="group">
                    <label className="block text-xs font-bold text-indigo-400 mb-2 uppercase tracking-wider group-focus-within:text-indigo-300 transition-colors">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all duration-300"
                      value={formData.email}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>
                <div className="group">
                  <label className="block text-xs font-bold text-indigo-400 mb-2 uppercase tracking-wider group-focus-within:text-indigo-300 transition-colors">
                    Industry / Role (Optional)
                  </label>
                  <input
                    type="text"
                    name="role"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all duration-300"
                    value={formData.role}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="group">
                  <label className="block text-xs font-bold text-indigo-400 mb-2 uppercase tracking-wider group-focus-within:text-indigo-300 transition-colors">
                    What interests you? (Optional)
                  </label>
                  <textarea
                    name="interest"
                    rows="4"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all duration-300 resize-none"
                    value={formData.interest}
                    onChange={handleFormChange}
                  ></textarea>
                </div>
                <div className="text-center pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full md:w-auto min-w-[200px] px-8 py-4 bg-white hover:bg-slate-200 text-black font-bold rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Submitting..." : "Stay Informed"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* About Us */}
      <section id="about" className="py-20 relative z-10">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="relative group">
              <div className="absolute inset-0 bg-indigo-600 blur-[50px] opacity-20 transition-opacity duration-500 rounded-full"></div>
              <img
                src={ceoPortrait}
                alt="Gabe Jaffe"
                loading="lazy"
                className="relative z-10 w-full max-w-md mx-auto rounded-2xl border border-white/10 shadow-2xl transition-all duration-500"
              />
            </div>
            <div>
              <h2 className="text-4xl font-bold mb-8">About Us</h2>
              <h3 className="text-2xl text-indigo-400 font-bold mb-4">
                Gabe Jaffe, Founder & CEO
              </h3>
              <p className="text-slate-300 leading-relaxed mb-8 text-lg">
                Gabe Jaffe is a Sophomore student at the McDonough School of
                Business at Georgetown University. At the age of 15, he founded
                his first company, Teen Hampton and Teen NYC, a digital platform
                for teenage tutors, sports instructors, and babysitters, that
                has housed more than 100 workers and served more than 1,000
                clients. As Gabe scaled the business, he appeared on{" "}
                <a
                  href="https://www.youtube.com/watch?v=MJko_jIdZxk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
                >
                  Good Day New York
                </a>
                ,{" "}
                <a
                  href="https://www.foxnews.com/video/6307767277112"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
                >
                  Fox National News
                </a>
                ,{" "}
                <a
                  href="https://www.youtube.com/watch?v=stkR3mEhIAQ"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
                >
                  CBS Inside Edition
                </a>
                , and more to discuss his accomplishments. Now, he is working to
                build the foundations of a futures market for compute as a
                commodity to accelerate AI learning and market growth.
              </p>
              <blockquote className="border-l-4 border-indigo-500 pl-6 italic text-slate-400 mb-10 text-xl font-light">
                "We stand at a pivotal moment where computational power is the
                most critical resource on the planet. Our mission is to build
                the tools that will power the next century of innovation with
                stability and foresight."
              </blockquote>
              <div className="flex items-center gap-3 text-sm text-slate-400 border-t border-white/10 pt-6">
                <span className="font-semibold text-white">Contact:</span>
                <a
                  href="mailto:gabe.jaffe@bytestrike.com"
                  className="text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-2 group"
                >
                  gabejaffe@byte-strike.com
                  <svg
                    className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
