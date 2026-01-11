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
              className="h-7 w-auto transition-transform group-hover:scale-105 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]"
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
            
            {/* Index Methodology Dropdown */}
            <div className="relative group">
              <button className="text-sm font-medium text-slate-300 hover:text-white transition-colors cursor-pointer hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] flex items-center gap-1">
                Index Methodology
                <svg className="w-3 h-3 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl overflow-hidden min-w-[180px]">
                  <Routerlink
                    to="/methodology/h100"
                    className="block px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors border-b border-white/5"
                  >
                    H100 Methodology
                  </Routerlink>
                  <Routerlink
                    to="/methodology/b200"
                    className="block px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    B200 Methodology
                  </Routerlink>
                </div>
              </div>
            </div>
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
                  className="group relative rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <span className="relative z-10 px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white">Sign Up</span>
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
                <Routerlink to="/trade" className="text-blue-400 font-semibold" onClick={() => setIsMenuOpen(false)}>
                  Trade
                </Routerlink>
                <div className="text-slate-500 text-xs uppercase tracking-wider mt-2">Documentation</div>
                <Routerlink to="/methodology/h100" className="text-slate-300 hover:text-white" onClick={() => setIsMenuOpen(false)}>
                  H100 Methodology
                </Routerlink>
                <Routerlink to="/methodology/b200" className="text-slate-300 hover:text-white" onClick={() => setIsMenuOpen(false)}>
                  B200 Methodology
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
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l-.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
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
                className="relative group px-8 py-4 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:shadow-[0_0_40px_rgba(99,102,241,0.6)] hover:scale-105 transition-all duration-300 flex items-center gap-2 border border-indigo-400/30"
              >
                <span className="relative z-10">Trade Now</span>
                <svg
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform relative z-10"
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
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 opacity-0 group-hover:opacity-20 transition-opacity" />
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
            
                  {/* Minimalist Floating Nav - Horizontal Scroll on Mobile */}
                  <div className="mb-8 md:mb-12 relative z-20 flex justify-center w-full">
                    <div className="w-full overflow-x-auto pb-4 md:pb-0 px-4 flex justify-start md:justify-center scrollbar-hide">
                      <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.2)] mx-auto whitespace-nowrap min-w-max">
                        {[
                          { name: "H100-PERP", label: "H100 GPU HOURS" },
                          { name: "H200-PERP", label: "H200 GPU HOURS" },
                          { name: "B200-PERP", label: "B200 GPU HOURS" },
                          { name: "H100-non-HyperScalers-PERP", label: "NEOCLOUD H100 HOURS" },
                        ].map((market) => (
                          <button
                            key={market.name}
                            onClick={() => setSelectedMarket(market.name)}
                            className={`relative px-4 md:px-5 py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-300 ${
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
                  </div>

                  {/* Seamless Chart Container */}
                  <div className="w-full max-w-5xl h-[400px] md:h-[500px] relative group perspective-1000 px-4 md:px-0">
                     {/* Ambient Glow */}
                     <div className="absolute -inset-4 md:-inset-10 bg-gradient-to-tr from-indigo-500/10 via-purple-500/5 to-blue-500/10 rounded-[30px] md:rounded-[50px] blur-2xl md:blur-3xl opacity-50 group-hover:opacity-75 transition-opacity duration-1000" />
                     
                     <div className="relative w-full h-full bg-black/40 backdrop-blur-sm border border-white/5 rounded-[30px] md:rounded-[40px] p-4 md:p-8 shadow-2xl transition-transform duration-700 hover:scale-[1.01]">
                       <div className="absolute top-6 left-6 md:top-8 md:left-8 z-10">
                          <motion.div
                            key={selectedMarket}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col gap-1"
                          >
                            <h3 className="text-xl md:text-3xl font-bold text-white tracking-tight">
                              {
                                selectedMarket === "H100-PERP" ? "NVIDIA H100" :
                                selectedMarket === "H200-PERP" ? "NVIDIA H200" :
                                selectedMarket === "B200-PERP" ? "NVIDIA Blackwell B200" : "Neocloud H100"
                              }
                            </h3>
                            <p className="text-xs md:text-sm font-medium text-slate-400 flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                              Real-Time Index Price
                            </p>
                          </motion.div>
                       </div>
                       
                       {/* Chart with extra padding for the header */}
                       <div className="pt-16 md:pt-16 h-full w-full overflow-hidden">
                          <PriceIndexChart market={selectedMarket} />
                       </div>
                     </div>
                  </div>

                  {/* How We Calculate This Index */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="w-full max-w-3xl mt-12 px-4 md:px-0"
                  >
                    <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 hover:bg-white/[0.04] transition-colors">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                              </svg>
                            </div>
                            <h4 className="text-lg md:text-xl font-bold text-white">How We Calculate This Index</h4>
                          </div>
                          <p className="text-sm text-slate-400 leading-relaxed">
                            Our GPU compute indices are calculated using rigorous, transparent methodologies inspired by commodity markets. 
                            We aggregate real-time pricing from qualified cloud providers, apply revenue-weighted adjustments, and normalize for performance equivalency.
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                          <Routerlink
                            to="/methodology/h100"
                            className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all text-center"
                          >
                            H100 Methodology
                          </Routerlink>
                          <Routerlink
                            to="/methodology/b200"
                            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-all text-center shadow-lg shadow-indigo-900/20"
                          >
                            B200 Methodology
                          </Routerlink>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </section>


            {/* Why Now - Bento Grid */}
            <section id="why-it-matters" className="py-20 relative z-10">
              <div className="container mx-auto px-6">
                <div className="text-center mb-20">
                  <h2 className="text-4xl md:text-5xl font-serif font-medium mb-6 text-white">
                    Why Now? The Inevitable Shift
                  </h2>
                  <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                    Compute is the new oil. The market needs sophisticated financial
                    tools to manage the explosive growth and volatility of AI
                    infrastructure.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {whyNowCardsData.map((card, index) => {
                     // Add simple state management inline for click handling
                     const [isClicked, setIsClicked] = React.useState(false);
                     
                     return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1, duration: 0.5 }}
                        className="h-[360px]" 
                      >
                        <div 
                          onClick={() => setIsClicked(!isClicked)}
                          className={`h-full group relative rounded-[2rem] overflow-hidden border border-white/10 bg-white/[0.02] backdrop-blur-xl hover:bg-white/[0.05] transition-colors duration-500 hover:shadow-[0_0_40px_rgba(79,70,229,0.1)] hover:border-white/20 ${isClicked ? 'bg-white/[0.05] shadow-[0_0_40px_rgba(79,70,229,0.1)] border-white/20' : ''}`}
                        >
                          {/* Subtle Gradient Glow - Shown on Hover OR Click */}
                          <div className={`absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-transparent to-purple-500/20 transition-opacity duration-700 ease-in-out ${isClicked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></div>
                          
                          {/* Info Icon - Visual Cue for Interaction */}
                          <div className="absolute top-4 right-4 z-20 group/info">
                              <div className="w-8 h-8 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center border border-white/10 cursor-help hover:bg-white/10 transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-indigo-300/70">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                                </svg>
                              </div>
                              
                              {/* Tooltip */}
                              <div className="absolute top-10 right-0 w-max max-w-[150px] bg-black/90 backdrop-blur-xl px-3 py-2 rounded-lg border border-white/10 opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none transform translate-y-1 group-hover/info:translate-y-0 duration-200">
                                <p className="text-[10px] text-center text-indigo-100 font-medium tracking-wide">
                                  {/* Change text based on device via simple CSS logic or just generic text */}
                                  Hover to Reveal
                                </p>
                              </div>
                          </div>
                          
                          {/* Header: Icon + Title - Centered by default, moves up on Hover OR Click */}
                          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center w-full px-6 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isClicked ? 'top-12 -translate-y-0' : 'group-hover:top-12 group-hover:-translate-y-0'}`}>
                            <div className={`w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-indigo-300 mb-6 shadow-lg shadow-black/20 transition-all duration-500 ${isClicked ? 'mb-4 w-12 h-12 rounded-xl scale-90' : 'group-hover:mb-4 group-hover:w-12 group-hover:h-12 group-hover:rounded-xl group-hover:scale-90'}`}>
                              {React.cloneElement(card.icon, { className: `w-8 h-8 transition-all duration-500 ${isClicked ? 'w-6 h-6' : 'group-hover:w-6 group-hover:h-6'}` })}
                            </div>
                            <h3 className="text-2xl font-serif font-medium text-white text-center transition-all duration-500">
                              {card.title}
                            </h3>
                          </div>

                          {/* Hidden Text Revealed on Hover OR Click - Centered */}
                          <div className={`absolute bottom-0 left-0 right-0 p-8 flex flex-col items-center text-center transition-all duration-500 delay-100 ease-out ${isClicked ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 group-hover:opacity-100 group-hover:translate-y-0'}`}>
                             <p className="text-slate-300 text-sm leading-relaxed mb-6 max-w-[90%]">
                              {card.summary}
                            </p>
                             <div className="w-full pt-4 border-t border-white/10">
                                <p className="text-indigo-200/60 text-xs italic font-medium tracking-wide">
                                  {card.details}
                                </p>
                            </div>
                          </div>

                        </div>
                      </motion.div>
                    );
                  })}
          </div>
        </div>
      </section>

      {/* Contact Form - Minimalist Redesign */}
      <section id="contact" className="py-32 relative z-10">
        <div className="container mx-auto px-6 max-w-4xl">
          
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif text-white tracking-tight mb-6">Contact</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto font-light leading-relaxed">
              We are conducting market discovery. If you are a potential
              user, supplier, or infrastructure operator, we invite you to
              share your interest.
            </p>
          </div>

          <div className="relative">
            {/* Removed heavy container, keeping it open and integrated */}
            <form onSubmit={handleSubmit} className="space-y-10">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="group relative">
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder=" "
                    className="peer w-full bg-transparent border-b border-white/20 py-4 text-white placeholder-transparent focus:outline-none focus:border-indigo-500 transition-all duration-300"
                    value={formData.name}
                    onChange={handleFormChange}
                  />
                  <label className="absolute left-0 top-4 text-slate-500 text-sm transition-all duration-300 peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:-top-6 peer-focus:text-xs peer-focus:text-indigo-400 peer-valid:-top-6 peer-valid:text-xs peer-valid:text-indigo-400 cursor-text pointer-events-none uppercase tracking-wider font-medium">
                    Name
                  </label>
                </div>
                
                <div className="group relative">
                   <input
                    type="email"
                    name="email"
                    required
                    placeholder=" "
                    className="peer w-full bg-transparent border-b border-white/20 py-4 text-white placeholder-transparent focus:outline-none focus:border-indigo-500 transition-all duration-300"
                    value={formData.email}
                    onChange={handleFormChange}
                  />
                  <label className="absolute left-0 top-4 text-slate-500 text-sm transition-all duration-300 peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:-top-6 peer-focus:text-xs peer-focus:text-indigo-400 peer-valid:-top-6 peer-valid:text-xs peer-valid:text-indigo-400 cursor-text pointer-events-none uppercase tracking-wider font-medium">
                    Email
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div className="group relative">
                    <input
                      type="text"
                      name="role"
                      placeholder=" "
                      className="peer w-full bg-transparent border-b border-white/20 py-4 text-white placeholder-transparent focus:outline-none focus:border-indigo-500 transition-all duration-300"
                      value={formData.role}
                      onChange={handleFormChange}
                    />
                    <label className="absolute left-0 top-4 text-slate-500 text-sm transition-all duration-300 peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:-top-6 peer-focus:text-xs peer-focus:text-indigo-400 peer-valid:-top-6 peer-valid:text-xs peer-valid:text-indigo-400 cursor-text pointer-events-none uppercase tracking-wider font-medium">
                      Role / Industry
                    </label>
                 </div>
                 
                 <div className="group relative">
                    <input
                      type="text"
                      name="interest"
                      placeholder=" "
                      className="peer w-full bg-transparent border-b border-white/20 py-4 text-white placeholder-transparent focus:outline-none focus:border-indigo-500 transition-all duration-300"
                      value={formData.interest}
                      onChange={handleFormChange}
                    />
                    <label className="absolute left-0 top-4 text-slate-500 text-sm transition-all duration-300 peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:-top-6 peer-focus:text-xs peer-focus:text-indigo-400 peer-valid:-top-6 peer-valid:text-xs peer-valid:text-indigo-400 cursor-text pointer-events-none uppercase tracking-wider font-medium">
                      Interest (Optional)
                    </label>
                 </div>
              </div>

              <div className="text-center pt-8">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-black font-medium tracking-wide text-sm uppercase rounded-full overflow-hidden hover:bg-neutral-200 transition-colors disabled:opacity-50"
                >
                  <span className="relative z-10">{isSubmitting ? "Sending..." : "Request Access"}</span>
                  <svg 
                    className="w-4 h-4 relative z-10 transform group-hover:translate-x-1 transition-transform duration-300" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* About Us */}
      <section id="about" className="py-20 relative z-10">
        <div className="container mx-auto px-6">
          
          {/* Sophisticated Ambient Glows - Moved to Section Level */}
          <div className="absolute top-1/2 right-0 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2 animate-pulse-slow"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none -translate-x-1/2 translate-y-1/2"></div>

          <div className="grid md:grid-cols-12 gap-10 lg:gap-16 items-center relative z-10">
              
              {/* Image Section - Matte Frame Effect */}
              <div className="md:col-span-5 relative group perspective-1000 flex flex-col justify-center">
                <div className="relative p-2 rounded-[2rem] bg-gradient-to-b from-white/10 to-white/5 border border-white/5 shadow-2xl max-w-[400px] mx-auto w-full">
                   <div className="relative rounded-[1.5rem] overflow-hidden aspect-square max-h-[400px]">
                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10 opacity-60"></div>
                     <img
                      src={ceoPortrait}
                      alt="Gabe Jaffe"
                      loading="lazy"
                      className="w-full h-full object-cover grayscale-[10%] group-hover:grayscale-0 transition-all duration-1000 ease-out scale-100 group-hover:scale-105"
                    />
                    
                    {/* Floating Name Badge - Glass Effect */}
                    <div className="absolute bottom-5 left-5 z-20 overflow-hidden rounded-xl">
                       <div className="bg-white/10 backdrop-blur-md border border-white/10 px-5 py-3">
                         <p className="text-white text-lg font-serif tracking-wide">
                           Gabe Jaffe
                         </p>
                         <p className="text-[10px] font-sans text-indigo-200 uppercase tracking-[0.2em] mt-1 border-t border-white/20 pt-1 inline-block">
                           Founder & CEO
                         </p>
                       </div>
                    </div>
                   </div>
                </div>
              </div>

              {/* Bio Section */}
              <div className="md:col-span-7 space-y-8">
                <div>
                   <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4">
                     <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                     <span className="text-indigo-200 text-[10px] font-bold uppercase tracking-[0.2em]">Vision & Leadership</span>
                   </div>
                  <h2 className="text-4xl md:text-6xl font-serif text-white tracking-tight leading-[1.1]">
                    About Us
                  </h2>
                </div>

                <div className="space-y-4 text-base md:text-lg text-slate-300 font-light leading-relaxed">
                  <p>
                    <span className="text-white">Gabe Jaffe</span> is a Sophomore student at the <span className="text-white border-b border-indigo-500/30 pb-0.5 transition-colors hover:border-indigo-400">McDonough School of Business</span> at Georgetown University. At the age of 15, he founded his first company, <span className="text-white">Teen Hampton</span> and <span className="text-white">Teen NYC</span>, a digital platform for teenage tutors, sports instructors, and babysitters, that has housed more than 100 workers and served more than 1,000 clients.
                  </p>
                  
                  <p>
                    As Gabe scaled the business, he appeared on 
                    <a href="https://www.youtube.com/watch?v=MJko_jIdZxk" target="_blank" rel="noopener noreferrer" className="text-white mx-1.5 hover:text-indigo-300 transition-colors border-b border-indigo-500/30 hover:border-indigo-400">Good Day New York</a>, 
                    <a href="https://www.foxnews.com/video/6307767277112" target="_blank" rel="noopener noreferrer" className="text-white mx-1.5 hover:text-indigo-300 transition-colors border-b border-indigo-500/30 hover:border-indigo-400">Fox National News</a>, 
                    <a href="https://www.youtube.com/watch?v=stkR3mEhIAQ" target="_blank" rel="noopener noreferrer" className="text-white mx-1.5 hover:text-indigo-300 transition-colors border-b border-indigo-500/30 hover:border-indigo-400">CBS Inside Edition</a>, and more to discuss his accomplishments.
                  </p>

                  <p>
                   Now, he is working to build the foundations of a futures market for compute as a commodity to accelerate AI learning and market growth.
                  </p>
                </div>

                {/* Refined Blockquote */}
                <div className="relative py-2">
                   <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full opacity-50"></div>
                   <blockquote className="pl-8 text-lg md:text-xl font-serif italic text-white/90 leading-relaxed relative">
                      <svg className="absolute -top-4 -left-2 w-6 h-6 text-indigo-500/30 transform -scale-x-100" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.896 14.321 16.064 14.929 15.504C15.539 14.944 16.367 14.494 17.413 14.154L16.273 11.234C15.221 11.63 14.321 12.036 13.573 12.452C12.827 12.868 12.063 13.528 11.281 14.432V9.07201C11.839 8.24001 12.871 7.42801 14.377 6.63601L13.141 4.54801C10.741 5.92801 8.92701 7.62001 7.70101 9.62401C6.47501 11.628 5.86301 13.754 5.86301 16.002C5.86301 18.25 6.42501 19.942 7.54901 21.078C8.67301 22.214 10.169 22.782 12.037 22.782C12.883 22.782 13.543 22.188 14.017 21ZM26.965 21L26.965 18C26.965 16.896 27.269 16.064 27.877 15.504C28.487 14.944 29.317 14.494 30.363 14.154L29.223 11.234C28.169 11.63 27.269 12.036 26.523 12.452C25.777 12.868 25.011 13.528 24.229 14.432V9.07201C24.787 8.24001 25.821 7.42801 27.327 6.63601L26.091 4.54801C23.691 5.92801 21.875 7.62001 20.649 9.62401C19.423 11.628 18.811 13.754 18.811 16.002C18.811 18.25 19.373 19.942 20.499 21.078C21.623 22.214 23.119 22.782 24.987 22.782C25.833 22.782 26.493 22.188 26.965 21Z"/></svg>
                      "We stand at a pivotal moment where computational power is the most critical resource on the planet. Our mission is to build the tools that will power the next century of innovation."
                   </blockquote>
                </div>

                <div className="flex items-center gap-6 pt-6 border-t border-white/5">
                   <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                   </div>
                   <div>
                      <p className="text-[10px] text-indigo-300 uppercase tracking-widest font-bold mb-1">Get in Touch</p>
                      <a href="mailto:gabe.jaffe@bytestrike.com" className="text-lg text-white hover:text-indigo-300 transition-colors font-serif">
                        gabejaffe@byte-strike.com
                      </a>
                   </div>
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
