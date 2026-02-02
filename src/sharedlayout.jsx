// src/SharedLayout.js
import React, { useState, useEffect } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDisconnect } from "wagmi";
import { supabase } from "./creatclient";
import Web3AuthHandler from "./web3auth";
import ProfileDropdown from "./dropdown";
import Footer from "./components/Footer";
import { HeaderWallet } from "./components/HeaderWallet";
import { Menu, X } from "lucide-react";
import logoImage from "./assets/ByteStrikeLogoFinal.png";
import { useAuthModal } from "./context/AuthModalContext";

// Clean, dark-themed header for the app
const AppHeader = ({ session, profile, handleLogout, openLogin, openSignup }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#050505] border-b border-zinc-800 flex items-center px-4 justify-between backdrop-blur-md bg-[#050505]/90">
      {/* Logo & Nav */}
      <div className="flex items-center gap-8">
        <Link to="/" className="flex items-center gap-3 group">
          <img
            src={logoImage}
            alt="ByteStrike"
            className="h-7 w-auto group-hover:scale-105 transition-transform"
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
          
          {/* Index Methodology Dropdown */}
          <div className="relative group">
            <button className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1">
              Index Methodology
              <svg className="w-3 h-3 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700 rounded-lg shadow-xl overflow-hidden min-w-[160px]">
                <Link
                  to="/methodology/h100"
                  className="block px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors border-b border-zinc-700/50"
                >
                  H100 Methodology
                </Link>
                <Link
                  to="/methodology/a100"
                  className="block px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors border-b border-zinc-700/50"
                >
                  A100 Methodology
                </Link>
                <Link
                  to="/methodology/b200"
                  className="block px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  B200 Methodology
                </Link>
              </div>
            </div>
          </div>
        </nav>
      </div>

      {/* Right Side: Auth & Mobile Menu */}
      <div className="flex items-center gap-4">
        {/* Wallet Status (Visible on Desktop, only when logged in) */}
        <div className="hidden lg:block">
          {session && <HeaderWallet />}
        </div>

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
                className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Log In
              </button>
              <button
                onClick={openSignup}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-blue-900/20"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden text-zinc-400 hover:text-white"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
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
          <div className="text-zinc-500 text-xs uppercase tracking-wider mt-2">Documentation</div>
          <Link
            to="/methodology/h100"
            className="text-sm text-zinc-400 hover:text-white"
            onClick={() => setIsMenuOpen(false)}
          >
            H100 Methodology
          </Link>
          <Link
            to="/methodology/a100"
            className="text-sm text-zinc-400 hover:text-white"
            onClick={() => setIsMenuOpen(false)}
          >
            A100 Methodology
          </Link>
          <Link
            to="/methodology/b200"
            className="text-sm text-zinc-400 hover:text-white"
            onClick={() => setIsMenuOpen(false)}
          >
            B200 Methodology
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
                className="text-sm font-medium text-zinc-400 text-left"
                onClick={() => { setIsMenuOpen(false); openLogin(); }}
              >
                Log In
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-center text-white text-sm font-bold rounded-lg"
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
