import React from "react";
import { Link } from "react-router-dom";
import { HiOutlineHome } from "react-icons/hi2";
import logo from "../assets/ByteStrikeLogoFinal.png";
import BokehBackground from "./BokehBackground";

const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#050505] text-slate-200 overflow-hidden relative">
      {/* Background Visual */}
      <BokehBackground className="absolute inset-0 z-0" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505] pointer-events-none z-0" />

      {/* Form Container */}
      <div className="w-full max-w-xl flex flex-col p-8 relative z-10 bg-[#050505]/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl m-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="flex items-center gap-2 group">
             <img src={logo} alt="ByteStrike" className="h-8 w-auto" />

          </Link>

          <Link 
            to="/" 
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all text-xs font-medium"
          >
            <HiOutlineHome className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
        </div>

        {/* Form Content */}
        <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white tracking-tight mb-2">{title}</h2>
              <p className="text-zinc-400">{subtitle}</p>
            </div>

            {children}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-zinc-600">
          © {new Date().getFullYear()} ByteStrike. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
