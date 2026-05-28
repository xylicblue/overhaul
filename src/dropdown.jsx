import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import sumsubWebSdk from "@sumsub/websdk";
import { supabase } from "./creatclient";
import "./dropdown.css"; // Keeping for SDK styles if needed, but minimizing usage
import Portal from "./Portal";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useConnectModal, useAccountModal } from "@rainbow-me/rainbowkit";
import { 
  Wallet, 
  User, 
  Settings, 
  LogOut, 
  ShieldCheck, 
  ShieldAlert, 
  ChevronDown, 
  ExternalLink,
  Copy,
  Check
} from "lucide-react";

// Avatar Component
const Avatar = ({ username, className = "" }) => {
  const initial = username ? username.charAt(0).toUpperCase() : "U";
  return (
    <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20 ${className}`}>
      {initial}
    </div>
  );
};

const ProfileDropdown = ({ session, profile, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [isSdkActive, setIsSdkActive] = useState(false);
  const { isConnected, address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const { disconnect } = useDisconnect();
  const [copied, setCopied] = useState(false);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sumsub SDK Logic
  const launchSumsubSDK = async () => {
    setIsOpen(false);
    setIsSdkActive(true);

    try {
      const getNewToken = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("User session not found.");
        const { data, error } = await supabase.functions.invoke("get-sumsub-token", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (error) throw error;
        return data.token;
      };

      const initialAccessToken = await getNewToken();
      const sumsubSdk = sumsubWebSdk
        .init(initialAccessToken, getNewToken)
        .withConf({ lang: "en" })
        .on("idCheck.applicantStatusUpdated", (payload) => {
          if (payload.reviewStatus === "completed") {
            setTimeout(() => setIsSdkActive(false), 3000);
          }
        })
        .on("idCheck.onDone", () => setTimeout(() => setIsSdkActive(false), 3000))
        .build();

      sumsubSdk.launch("#sumsub-websdk-container");
    } catch (error) {
      console.error("Verification error:", error);
      setIsSdkActive(false);
      alert("Could not start verification. Please try again later.");
    }
  };

  useEffect(() => {
    document.body.style.overflow = isSdkActive ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [isSdkActive]);

  const username = profile?.username || session.user.email.split("@")[0];
  const kycStatus = profile?.kyc_status || "not_verified";
  const isVerified = kycStatus === "verified" || kycStatus === "completed";

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative z-50" ref={dropdownRef}>
      {/* Trigger Pill */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`
          flex items-center gap-3 pl-1 pr-4 py-1 rounded-full border transition-all duration-300 group
          ${isOpen 
            ? "bg-slate-800 border-blue-500/50 shadow-lg shadow-blue-500/10" 
            : "bg-slate-900/50 border-slate-700 hover:border-slate-600 hover:bg-slate-800/80"
          }
        `}
      >
        <Avatar username={username} />
        <div className="flex flex-col items-start">
          <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">
            {username}
          </span>
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            {isVerified ? (
              <span className="text-green-400 flex items-center gap-0.5">
                <ShieldCheck size={10} /> Verified
              </span>
            ) : (
              <span className="text-slate-500">Unverified</span>
            )}
          </span>
        </div>
        <ChevronDown 
          size={14} 
          className={`text-slate-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} 
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-72 bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/5"
          >
            {/* Header Section */}
            <div className="p-4 border-b border-slate-700/50 bg-slate-800/30">
              <div className="flex items-center gap-3 mb-3">
                <Avatar username={username} className="w-10 h-10 text-base" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white truncate">{username}</h4>
                  <p className="text-xs text-slate-400 truncate">{session.user.email}</p>
                </div>
              </div>
              
              {/* KYC Status Badge */}
              <div className={`
                flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border
                ${isVerified 
                  ? "bg-green-500/10 border-green-500/20 text-green-400" 
                  : "bg-red-500/10 border-red-500/20 text-red-400"
                }
              `}>
                <span className="flex items-center gap-1.5">
                  {isVerified ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                  {isVerified ? "Identity Verified" : "Identity Not Verified"}
                </span>
                {!isVerified && (
                  <button 
                    onClick={launchSumsubSDK}
                    className="text-xs underline hover:text-red-300 transition-colors"
                  >
                    Verify
                  </button>
                )}
              </div>
            </div>

            {/* Wallet Section */}
            <div className="p-2">
              {isConnected ? (
                <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                      <Wallet size={12} /> Connected Wallet
                    </span>
                    <span className="flex h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900 rounded-lg p-2 border border-slate-800">
                    <span className="font-mono text-xs text-slate-300">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={copyAddress}
                        className="p-1.5 hover:bg-slate-800 rounded-md text-slate-500 hover:text-white transition-colors"
                        title="Copy Address"
                      >
                        {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                      </button>
                      <button 
                        onClick={openAccountModal}
                        className="p-1.5 hover:bg-slate-800 rounded-md text-slate-500 hover:text-white transition-colors"
                        title="Wallet Details"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={openConnectModal}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <Wallet size={16} /> Connect Wallet
                </button>
              )}
            </div>

            {/* Menu Items */}
            <div className="p-2 border-t border-slate-700/50">
              <a 
                href="/settings" 
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors group"
              >
                <Settings size={16} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                Settings
              </a>
              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors group"
              >
                <LogOut size={16} className="text-slate-500 group-hover:text-red-400 transition-colors" />
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sumsub SDK Portal */}
      {isSdkActive && (
        <Portal>
          <div id="sumsub-websdk-container" className="sdk-active fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center"></div>
        </Portal>
      )}
    </div>
  );
};

export default ProfileDropdown;
