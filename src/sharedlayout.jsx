// src/SharedLayout.js
import React, { useState, useEffect } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { supabase } from "./creatclient";
import Web3AuthHandler from "./web3auth";
import ProfileDropdown from "./dropdown";
import Footer from "./components/Footer";
import { HeaderWallet } from "./components/HeaderWallet";
import { Menu, X } from "lucide-react";
import logoImage from "./assets/ByteStrikeLogoFinal.png";

// Clean, dark-themed header for the app
const AppHeader = ({ session, profile, handleLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#050505] border-b border-zinc-800 flex items-center px-4 justify-between backdrop-blur-md bg-[#050505]/90">
      {/* Logo & Nav */}
      <div className="flex items-center gap-8">
        <Link to="/" className="flex items-center gap-3 group">
          <img
            src={logoImage}
            alt="ByteStrike"
            className="h-8 w-auto group-hover:scale-105 transition-transform"
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
            to="/portfolio"
            className={({ isActive }) =>
              `transition-colors ${
                isActive ? "text-blue-400" : "text-zinc-400 hover:text-white"
              }`
            }
          >
            Portfolio
          </NavLink>
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
        </nav>
      </div>

      {/* Right Side: Auth & Mobile Menu */}
      <div className="flex items-center gap-4">
        {/* Wallet Status (Visible on Desktop) */}
        <div className="hidden lg:block">
          <HeaderWallet />
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
              <Link
                to="/login"
                className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-blue-900/20"
              >
                Sign Up
              </Link>
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
            <HeaderWallet />
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
              <Link
                to="/login"
                className="text-sm font-medium text-zinc-400"
                onClick={() => setIsMenuOpen(false)}
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="px-4 py-2 bg-blue-600 text-center text-white text-sm font-bold rounded-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign Up
              </Link>
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
