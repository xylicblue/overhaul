import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import sumsubWebSdk from "@sumsub/websdk";
import { supabase } from "./creatclient";
import { getSumsubToken } from "./services/api";
import "./dropdown.css";
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
  Check,
  CircleDot,
  Power,
} from "lucide-react";

// ─── Avatar ──────────────────────────────────────────────────────────────────
const Avatar = ({ username, size = "sm" }) => {
  const initial = username ? username.charAt(0).toUpperCase() : "U";
  const dims = size === "lg" ? "w-10 h-10 text-base" : "w-7 h-7 text-xs";
  return (
    <div
      className={`${dims} rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold ring-2 ring-white/[0.06] shadow-lg shadow-blue-500/10`}
    >
      {initial}
    </div>
  );
};

// ─── Dropdown Menu Item ──────────────────────────────────────────────────────
const MenuItem = ({ icon: Icon, label, onClick, href, variant = "default" }) => {
  const base =
    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 cursor-pointer";
  const variants = {
    default: "text-zinc-400 hover:text-white hover:bg-white/[0.04]",
    danger: "text-zinc-400 hover:text-red-400 hover:bg-red-500/[0.06]",
  };

  const content = (
    <>
      <Icon size={15} className="shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
      {label}
    </>
  );

  if (href) {
    return (
      <a href={href} className={`${base} ${variants[variant]} group`}>
        {content}
      </a>
    );
  }
  return (
    <button onClick={onClick} className={`${base} ${variants[variant]} group`}>
      {content}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
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
        const data = await getSumsubToken();
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
      {/* ── Trigger ────────────────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full border transition-all duration-200 group
          ${isOpen
            ? "bg-white/[0.06] border-white/[0.12]"
            : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1]"
          }
        `}
      >
        <Avatar username={username} />
        <span className="text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors max-w-[80px] truncate hidden sm:inline">
          {username}
        </span>
        <ChevronDown
          size={13}
          className={`text-zinc-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* ── Dropdown ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 mt-2.5 w-[300px] bg-[#0a0a0f]/95 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.8)] overflow-hidden z-[9999]"
          >
            {/* ── Profile Header ─────────────────────────────────────── */}
            <div className="p-4 pb-3">
              <div className="flex items-center gap-3">
                <Avatar username={username} size="lg" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate leading-tight">
                    {username}
                  </h4>
                  <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                    {session.user.email}
                  </p>
                </div>
                {/* KYC Chip */}
                <div
                  className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    isVerified
                      ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/[0.08]"
                      : "text-zinc-500 border-zinc-700/50 bg-zinc-800/30 cursor-pointer hover:text-amber-400 hover:border-amber-500/20 hover:bg-amber-500/[0.06] transition-colors"
                  }`}
                  onClick={!isVerified ? launchSumsubSDK : undefined}
                  title={isVerified ? "Identity verified" : "Click to verify identity"}
                >
                  {isVerified ? (
                    <ShieldCheck size={11} />
                  ) : (
                    <ShieldAlert size={11} />
                  )}
                  {isVerified ? "KYC" : "Verify"}
                </div>
              </div>
            </div>

            <div className="h-px bg-white/[0.06] mx-3" />

            {/* ── Wallet Section ──────────────────────────────────────── */}
            <div className="p-3">
              {isConnected ? (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Wallet
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-400">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                      </span>
                      Connected
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-[#050505] rounded-lg px-3 py-2 border border-white/[0.04]">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 opacity-80" />
                      <span className="font-mono text-xs text-zinc-300 tracking-wide">
                        {address?.slice(0, 6)}...{address?.slice(-4)}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={copyAddress}
                        className="p-1.5 rounded-md text-zinc-600 hover:text-white hover:bg-white/[0.06] transition-all"
                        title="Copy address"
                      >
                        {copied ? (
                          <Check size={12} className="text-emerald-400" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                      <button
                        onClick={openAccountModal}
                        className="p-1.5 rounded-md text-zinc-600 hover:text-white hover:bg-white/[0.06] transition-all"
                        title="Wallet details"
                      >
                        <ExternalLink size={12} />
                      </button>
                      <button
                        onClick={() => disconnect()}
                        className="p-1.5 rounded-md text-zinc-600 hover:text-red-400 hover:bg-red-500/[0.06] transition-all"
                        title="Disconnect"
                      >
                        <Power size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={openConnectModal}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 hover:border-blue-500/40 text-blue-400 hover:text-blue-300 text-xs font-bold transition-all duration-200"
                >
                  <Wallet size={13} />
                  Connect Wallet
                </button>
              )}
            </div>

            <div className="h-px bg-white/[0.06] mx-3" />

            {/* ── Navigation ──────────────────────────────────────────── */}
            <div className="p-1.5">
              <MenuItem icon={Settings} label="Settings" href="/settings" />
              <MenuItem
                icon={LogOut}
                label="Sign Out"
                onClick={onLogout}
                variant="danger"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sumsub SDK Portal */}
      {isSdkActive && (
        <Portal>
          <div
            id="sumsub-websdk-container"
            className="sdk-active fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center"
          ></div>
        </Portal>
      )}
    </div>
  );
};

export default ProfileDropdown;
