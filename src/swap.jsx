import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-scroll";
import Web3AuthHandler from "./web3auth";
import toast from "react-hot-toast";
import { Link as Routerlink, useNavigate } from "react-router-dom";
import PriceIndexChart from "./chart";
import { supabase } from "./creatclient";
import AnimatedSection from "./animated";
import Footer from "./components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import heroBackground from "./assets/bg.jpg";
import whatIsItVisual from "./assets/ai.png";
import logoImage from "./assets/ByteStrikeLogoFinal.png";
import ceoPortrait from "./assets/gabe.jpg";
import ProfileDropdown from "./dropdown";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
};

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
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

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
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30">
      {session && <Web3AuthHandler />}

      {/* Navbar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-slate-950/80 backdrop-blur-md border-b border-white/5 py-3"
            : "bg-transparent py-5"
        }`}
      >
        <div className="container mx-auto px-6 flex justify-between items-center">
          <Routerlink to="/" className="flex items-center gap-3 group">
            <img
              src={logoImage}
              alt="Byte Strike"
              className="h-8 w-auto transition-transform group-hover:scale-105"
            />
            <span className="font-bold text-xl tracking-tight">ByteStrike</span>
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
                  className="text-sm font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {item}
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Routerlink
              to="/trade"
              className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
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
                  className="btn-primary py-2 px-4 text-xs"
                >
                  Sign Up
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
              className="md:hidden bg-slate-900 border-b border-white/10 overflow-hidden"
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
                {!session && (
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
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={heroBackground}
            alt="Background"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-950/50 to-slate-950"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
              A New Marketplace <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                for Compute
              </span>
            </h1>
            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Hedge, Plan, and Scale. We are building the foundational
              infrastructure for a futures market where compute capacity is
              priced, risk-managed, and traded like a commodity.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="contact"
                smooth={true}
                offset={-80}
                className="btn-primary text-lg px-8 py-4 rounded-full"
              >
                Join Interest List
              </Link>
              <Routerlink
                to="/trade"
                className="btn-secondary text-lg px-8 py-4 rounded-full"
              >
                Launch App
              </Routerlink>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Price Index Chart */}
      <section className="py-12 bg-slate-950">
        <div className="container mx-auto px-6">
          <PriceIndexChart />
        </div>
      </section>

      {/* What We Do */}
      <AnimatedSection id="what-we-do" className="py-24 relative">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                What Is a Compute Futures Exchange?
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-6">
                We are envisioning a regulated marketplace where compute
                capacity itself becomes a tradable commodity. This platform
                would enable participants to buy or sell standardized contracts
                for future compute delivery—like GPU hours or cloud capacity—at
                prices locked in today.
              </p>
              <div className="pl-6 border-l-2 border-blue-500">
                <p className="text-slate-500 italic">
                  "Think of it like the established futures markets for energy
                  or agriculture. We're applying that same powerful financial
                  model to the foundational resource of the 21st century."
                </p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full"></div>
              <img
                src={whatIsItVisual}
                alt="Visual"
                className="relative z-10 w-full rounded-2xl border border-white/10 shadow-2xl"
              />
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {/* Why Now */}
      <section id="why-it-matters" className="py-24 bg-slate-900/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Now? The Inevitable Shift
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Compute is the new oil. The market needs sophisticated financial
              tools to manage the explosive growth and volatility of AI
              infrastructure.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyNowCardsData.map((card, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="card group cursor-pointer"
                onClick={() =>
                  setExpandedCardIndex(
                    expandedCardIndex === index ? null : index
                  )
                }
              >
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                  {card.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{card.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  {card.summary}
                </p>

                <AnimatePresence>
                  {expandedCardIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="text-slate-500 text-sm border-t border-white/10 pt-4 mt-2">
                        {card.details}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button className="text-blue-400 text-sm font-medium flex items-center gap-1 mt-2">
                  {expandedCardIndex === index ? "Show Less" : "Learn More"}
                  <svg
                    className={`w-4 h-4 transition-transform ${
                      expandedCardIndex === index ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact" className="py-24 relative">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="glass-panel rounded-2xl p-8 md:p-12">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-4">Join the Revolution</h2>
              <p className="text-slate-400">
                We are conducting market discovery. If you are a potential user,
                supplier, or infrastructure operator, we invite you to share
                your interest.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="input-field"
                    value={formData.name}
                    onChange={handleFormChange}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="input-field"
                    value={formData.email}
                    onChange={handleFormChange}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                  Industry / Role (Optional)
                </label>
                <input
                  type="text"
                  name="role"
                  className="input-field"
                  value={formData.role}
                  onChange={handleFormChange}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                  What interests you? (Optional)
                </label>
                <textarea
                  name="interest"
                  rows="4"
                  className="input-field resize-none"
                  value={formData.interest}
                  onChange={handleFormChange}
                ></textarea>
              </div>
              <div className="text-center">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full md:w-auto min-w-[200px]"
                >
                  {isSubmitting ? "Submitting..." : "Stay Informed"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Team / About */}
      <section id="about" className="py-24 bg-slate-900/30">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-12 max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="w-full md:w-1/3"
            >
              <img
                src={ceoPortrait}
                alt="Gabe Jaffe"
                className="w-full rounded-2xl border border-white/10 shadow-xl"
              />
            </motion.div>
            <div className="w-full md:w-2/3">
              <h2 className="text-3xl font-bold mb-2">Meet Our Founder</h2>
              <h3 className="text-xl text-blue-400 mb-6">
                Gabe Jaffe, Founder & CEO
              </h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                Gabe Jaffe is a Sophomore student at the McDonough School of
                Business at Georgetown University. At the age of 15, he founded
                his first company, Teen Hampton and Teen NYC. Now, he is working
                to build the foundations of a futures market for compute as a
                commodity to accelerate AI learning and market growth.
              </p>
              <blockquote className="border-l-2 border-blue-500 pl-4 italic text-slate-300 mb-8">
                "We stand at a pivotal moment where computational power is the
                most critical resource on the planet. Our mission is to build
                the tools that will power the next century of innovation with
                stability and foresight."
              </blockquote>
              <div className="flex items-center gap-2 text-sm text-slate-400 border-t border-white/10 pt-4">
                <span className="font-semibold">Contact:</span>
                <a
                  href="mailto:gabe.jaffe@bytestrike.com"
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  gabejaffe@byte-strike.com
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
