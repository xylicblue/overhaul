import React, { useState, useEffect, useRef } from "react";
import { Link as Routerlink } from "react-router-dom";
import logoImage from "../assets/ByteStrikeLogoFinal.png";

const Footer = () => {
  const [isVisible, setIsVisible] = useState(false);
  const footerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );

    if (footerRef.current) observer.observe(footerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <footer
      ref={footerRef}
      className={`relative z-10 bg-[#0a0a0f] border-t border-white/[0.05] py-10 transition-opacity duration-500 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="container mx-auto px-6 lg:px-8">

        {/* ── Top: brand + columns ─────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8 mb-10">

          {/* Brand */}
          <div className="md:col-span-5 lg:col-span-4">
            <img src={logoImage} alt="ByteStrike" className="h-6 w-auto mb-4" />
            <p className="text-zinc-400 text-[13px] leading-relaxed max-w-xs">
              A futures exchange for GPU compute. Standardized contracts, onchain settlement.
            </p>
          </div>

          {/* Columns */}
          <div className="md:col-span-7 lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8">

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-4">Platform</p>
              <ul className="space-y-2.5 text-[13px]">
                <li><Routerlink to="/trade"     className="text-zinc-400 hover:text-white transition-colors duration-150">Trade</Routerlink></li>
                <li><Routerlink to="/portfolio" className="text-zinc-400 hover:text-white transition-colors duration-150">Portfolio</Routerlink></li>
                <li><Routerlink to="/markets"   className="text-zinc-400 hover:text-white transition-colors duration-150">Markets</Routerlink></li>
                <li><Routerlink to="/guide"     className="text-zinc-400 hover:text-white transition-colors duration-150">Guide</Routerlink></li>
              </ul>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-4">Methodology</p>
              <ul className="space-y-2.5 text-[13px]">
                <li><Routerlink to="/methodology/h100" className="text-zinc-400 hover:text-white transition-colors duration-150">H100 Index</Routerlink></li>
                <li><Routerlink to="/methodology/b200" className="text-zinc-400 hover:text-white transition-colors duration-150">B200 Index</Routerlink></li>
                <li><Routerlink to="/methodology/a100" className="text-zinc-400 hover:text-white transition-colors duration-150">A100 Index</Routerlink></li>
                <li><Routerlink to="/methodology/t4"   className="text-zinc-400 hover:text-white transition-colors duration-150">T4 Index</Routerlink></li>
              </ul>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-4">Connect</p>
              <div className="flex gap-3">
                <a
                  href="https://twitter.com/byte_strike"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Twitter"
                  className="text-zinc-500 hover:text-zinc-200 transition-colors duration-150"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href="https://linkedin.com/company/bytestrike"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="text-zinc-500 hover:text-zinc-200 transition-colors duration-150"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              </div>
            </div>

          </div>
        </div>

        {/* ── Bottom: legal bar ────────────────────────────────── */}
        <div className="border-t border-white/[0.05] pt-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-[12px] text-zinc-500">
          <p className="tabular-nums">© {new Date().getFullYear()} ByteStrike. All rights reserved.</p>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span>
              Charts by{" "}
              <a
                href="https://www.tradingview.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-white transition-colors duration-150"
              >
                TradingView
              </a>
            </span>
            <a href="#" className="hover:text-white transition-colors duration-150">Terms</a>
            <Routerlink to="/privacy"  className="hover:text-white transition-colors duration-150">Privacy</Routerlink>
            <Routerlink to="/security" className="hover:text-white transition-colors duration-150">Security</Routerlink>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
