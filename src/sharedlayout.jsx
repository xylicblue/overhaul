// src/SharedLayout.js
import React, { useState, useEffect, useRef } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useDisconnect } from "wagmi";
import { supabase } from "./creatclient";
import Web3AuthHandler from "./web3auth";
import ProfileDropdown from "./dropdown";
import Footer from "./components/Footer";
import { HeaderWallet } from "./components/HeaderWallet";
import { Menu, X } from "lucide-react";
import logoImage from "./assets/ByteStrikeLogoFinal.png";
import { useAuthModal } from "./context/AuthModalContext";
import NotificationBell from "./components/NotificationBell";

// Clean, dark-themed header for the app
const dropdownVariants = {
  hidden:  { opacity: 0, y: -6, scale: 0.97 },
  visible: { opacity: 1, y: 0,  scale: 1,    transition: { duration: 0.16, ease: "easeOut" } },
  exit:    { opacity: 0, y: -4, scale: 0.97, transition: { duration: 0.12, ease: "easeIn"  } },
};

const AppHeader = ({ session, profile, handleLogout, openLogin, openSignup }) => {
  const [isMenuOpen,      setIsMenuOpen]      = useState(false);
  const [docsOpen,        setDocsOpen]        = useState(false);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const docsRef        = useRef(null);
  const methodologyRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (docsRef.current        && !docsRef.current.contains(e.target))        setDocsOpen(false);
      if (methodologyRef.current && !methodologyRef.current.contains(e.target)) setMethodologyOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] h-14 bg-[#050505] border-b border-zinc-800 flex items-center px-4 justify-between backdrop-blur-md bg-[#050505]/90">
      {/* Logo & Nav */}
      <div className="flex items-center gap-8">
        <Link to="/" className="flex items-center gap-3 group">
          <img
            src={logoImage}
            alt="ByteStrike"
            className="h-7 w-auto"
          />
          {/* <span className="text-lg font-bold text-white tracking-tight group-hover:text-blue-400 transition-colors hidden sm:block">
            ByteStrike
          </span> */}
        </Link>


        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <NavLink
            to="/trade"
            className={({ isActive }) =>
              `transition-colors ${
                isActive ? "text-blue-400" : "text-zinc-400 hover:text-white"
              }`
            }
          >
            Trade
          </NavLink>
          <NavLink
            to="/markets"
            className={({ isActive }) =>
              `transition-colors ${
                isActive ? "text-blue-400" : "text-zinc-400 hover:text-white"
              }`
            }
          >
            Markets
          </NavLink>
          <NavLink
            to="/portfolio"
            className={({ isActive }) =>
              `transition-colors ${
                isActive ? "text-blue-400" : "text-zinc-400 hover:text-white"
              }`
            }
          >
            Portfolio
          </NavLink>
          {/* Leaderboard disabled temporarily
          <NavLink
            to="/leaderboard"
            className={({ isActive }) =>
              `transition-colors ${
                isActive ? "text-blue-400" : "text-zinc-400 hover:text-white"
              }`
            }
          >
            Leaderboard
          </NavLink>
          */}
          <NavLink
            to="/guide"
            className={({ isActive }) =>
              `transition-colors ${
                isActive ? "text-blue-400" : "text-zinc-400 hover:text-white"
              }`
            }
          >
            Guide
          </NavLink>

          {/* ── Docs Dropdown ───────────────────────────────────── */}
          <div className="relative" ref={docsRef} onMouseEnter={() => { setDocsOpen(true); setMethodologyOpen(false); }} onMouseLeave={() => setDocsOpen(false)}>
            <button
              className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
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
                  <div className="bg-[#111118] border border-white/[0.08] rounded-2xl shadow-2xl p-5 w-[580px]">
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
                            <Link
                              key={item.id}
                              to={`/docs#${item.id}`}
                              onClick={() => setDocsOpen(false)}
                              className="block py-2 px-2 -mx-2 rounded-lg hover:bg-white/[0.05] transition-colors group/item"
                            >
                              <p className="text-sm font-medium text-zinc-200 group-hover/item:text-white transition-colors">{item.label}</p>
                              <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
                            </Link>
                          ))}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/[0.06]">
                      <Link
                        to="/docs"
                        onClick={() => setDocsOpen(false)}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        View full contract reference →
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Index Methodology Dropdown ──────────────────────── */}
          <div className="relative" ref={methodologyRef} onMouseEnter={() => { setMethodologyOpen(true); setDocsOpen(false); }} onMouseLeave={() => setMethodologyOpen(false)}>
            <button
              className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
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
                  <div className="bg-[#111118] border border-white/[0.08] rounded-2xl shadow-2xl p-5 w-[380px]">
                    <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-4">Price Indices</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { path: "/methodology/h100", label: "H100", desc: "NVIDIA H100 SXM & PCIe compute index"  },
                        { path: "/methodology/a100", label: "A100", desc: "NVIDIA A100 80GB data center index"    },
                        { path: "/methodology/b200", label: "B200", desc: "NVIDIA Blackwell B200 compute index"   },
                        { path: "/methodology/t4",   label: "T4",   desc: "NVIDIA T4 inference GPU index"        },
                      ].map(item => (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setMethodologyOpen(false)}
                          className="group/item block p-3 rounded-xl border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-150"
                        >
                          <p className="text-sm font-semibold text-zinc-100 group-hover/item:text-white transition-colors mb-1">{item.label}</p>
                          <p className="text-xs text-zinc-500 leading-relaxed">{item.desc}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>
      </div>

      {/* Right Side: Auth & Mobile Menu */}
      <div className="flex items-center gap-4">
        {/* Wallet Status (Visible on Desktop, only when logged in) */}
        <div className="hidden lg:block">
          {session && <HeaderWallet />}
        </div>

        {session && (
          <NotificationBell userId={session.user?.id} />
        )}

        <div className="hidden md:block">
          {session && profile ? (
            <ProfileDropdown
              session={session}
              profile={profile}
              onLogout={handleLogout}
            />
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={openLogin}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Login
              </button>
              <button
                onClick={openSignup}
                className="px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-300"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>

        {/* Mobile: profile pill + hamburger */}
        <div className="md:hidden flex items-center gap-2">
          {session && profile && (
            <ProfileDropdown
              session={session}
              profile={profile}
              onLogout={handleLogout}
            />
          )}
          <button
            className="text-zinc-400 hover:text-white p-1"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="absolute top-14 left-0 right-0 bg-[#0A0A0A] border-b border-zinc-800 p-4 flex flex-col gap-4 md:hidden shadow-xl">
          <div className="flex justify-center pb-2">
            {session && <HeaderWallet />}
          </div>
          <NavLink
            to="/trade"
            className={({ isActive }) =>
              `text-sm font-medium ${
                isActive ? "text-blue-400" : "text-zinc-400"
              }`
            }
            onClick={() => setIsMenuOpen(false)}
          >
            Trade
          </NavLink>
          <NavLink
            to="/markets"
            className={({ isActive }) =>
              `text-sm font-medium ${
                isActive ? "text-blue-400" : "text-zinc-400"
              }`
            }
            onClick={() => setIsMenuOpen(false)}
          >
            Markets
          </NavLink>
          <NavLink
            to="/portfolio"
            className={({ isActive }) =>
              `text-sm font-medium ${
                isActive ? "text-blue-400" : "text-zinc-400"
              }`
            }
            onClick={() => setIsMenuOpen(false)}
          >
            Portfolio
          </NavLink>
          {/* Leaderboard disabled temporarily
          <NavLink
            to="/leaderboard"
            className={({ isActive }) =>
              `text-sm font-medium ${
                isActive ? "text-blue-400" : "text-zinc-400"
              }`
            }
            onClick={() => setIsMenuOpen(false)}
          >
            Leaderboard
          </NavLink>
          */}
          <NavLink
            to="/guide"
            className={({ isActive }) =>
              `text-sm font-medium ${
                isActive ? "text-blue-400" : "text-zinc-400"
              }`
            }
            onClick={() => setIsMenuOpen(false)}
          >
            Guide
          </NavLink>
          {/* ── Index Methodology ────────────────────────── */}
          <div className="text-zinc-500 text-xs uppercase tracking-wider mt-2">Index Methodology</div>
          <Link
            to="/methodology/h100"
            className="text-sm text-zinc-400 hover:text-white"
            onClick={() => setIsMenuOpen(false)}
          >
            H100 Index
          </Link>
          <Link
            to="/methodology/a100"
            className="text-sm text-zinc-400 hover:text-white"
            onClick={() => setIsMenuOpen(false)}
          >
            A100 Index
          </Link>
          <Link
            to="/methodology/b200"
            className="text-sm text-zinc-400 hover:text-white"
            onClick={() => setIsMenuOpen(false)}
          >
            B200 Index
          </Link>
          <Link
            to="/methodology/t4"
            className="text-sm text-zinc-400 hover:text-white"
            onClick={() => setIsMenuOpen(false)}
          >
            T4 Index
          </Link>

          {/* ── Contract Docs ─────────────────────────── */}
          <div className="text-zinc-500 text-xs uppercase tracking-wider mt-2">Contract Docs</div>
          <Link
            to="/docs#clearinghouse"
            className="text-sm text-zinc-400 hover:text-white"
            onClick={() => setIsMenuOpen(false)}
          >
            ClearingHouse
          </Link>
          <Link
            to="/docs"
            className="text-sm text-blue-400 hover:text-blue-300"
            onClick={() => setIsMenuOpen(false)}
          >
            Full Reference →
          </Link>

          <div className="h-px bg-zinc-800 my-2"></div>
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
                  <span className="text-xs text-zinc-400 truncate max-w-[150px]">
                    {session.user.email}
                  </span>
                </div>
              </div>

              <Link
                to="/settings"
                className="flex items-center gap-2 text-zinc-300 hover:text-white p-2"
                onClick={() => setIsMenuOpen(false)}
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
              </Link>

              <button
                onClick={() => {
                  handleLogout();
                  setIsMenuOpen(false);
                }}
                className="text-sm font-medium text-red-400 text-left p-2 hover:text-red-300"
              >
                Log Out
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <button
                className="text-sm text-zinc-400 text-left hover:text-white transition-colors"
                onClick={() => { setIsMenuOpen(false); openLogin(); }}
              >
                Login
              </button>
              <button
                className="px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-300 text-center"
                onClick={() => { setIsMenuOpen(false); openSignup(); }}
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

const SharedLayout = () => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();
  const { disconnect } = useDisconnect();
  const { openLogin, openSignup } = useAuthModal();

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => setSession(session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      setSession(session)
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      const getProfile = async () => {
        const { data } = await supabase
          .from("profiles")
          .select("username, kyc_status, wallet_address")
          .eq("id", session.user.id)
          .single();
        setProfile(data);
      };
      getProfile();

      const channel = supabase
        .channel("realtime-profiles")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${session.user.id}`,
          },
          (payload) => setProfile(payload.new)
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session]);

  const handleLogout = async () => {
    disconnect(); // Disconnect wallet first
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-200 flex flex-col font-sans">
      {session && <Web3AuthHandler />}
      <AppHeader
        session={session}
        profile={profile}
        handleLogout={handleLogout}
        openLogin={openLogin}
        openSignup={openSignup}
      />

      {/* Main Content Area - Padded top for fixed header */}
      <div className="flex-1 pt-14 flex flex-col">
        <Outlet />
      </div>

      {/* Footer - Only show on non-trading pages if needed, but for now keep it */}
      <div className="hidden md:block">
        {/* Use CSS to hide footer on /trade route if possible, or just keep it simple */}
      </div>
    </div>
  );
};

export default SharedLayout;
