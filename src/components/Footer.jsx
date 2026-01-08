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
      className={`relative z-10 bg-[#050505] border-t border-zinc-800 py-12 transition-opacity duration-700 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-12">
          {/* Brand */}
          <div className="max-w-xs">
            <div className="flex items-center gap-3 mb-4">
              <img src={logoImage} alt="Byte Strike" className="h-7 w-auto" />
              <span className="font-bold text-xl text-white tracking-tight">
                ByteStrike
              </span>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Financializing AI Compute. Building the infrastructure for the
              next generation of digital commodities.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-16">
            <div>
              <h4 className="font-semibold text-white mb-4">Platform</h4>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li>
                  <Routerlink
                    to="/trade"
                    className="hover:text-blue-400 transition-colors"
                  >
                    Trade
                  </Routerlink>
                </li>
                <li>
                  <Routerlink
                    to="/portfolio"
                    className="hover:text-blue-400 transition-colors"
                  >
                    Portfolio
                  </Routerlink>
                </li>
                <li>
                  <Routerlink
                    to="/guide"
                    className="hover:text-blue-400 transition-colors"
                  >
                    Guide
                  </Routerlink>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Documentation</h4>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li>
                  <Routerlink
                    to="/methodology/h100"
                    className="hover:text-blue-400 transition-colors"
                  >
                    H100 Methodology
                  </Routerlink>
                </li>
                <li>
                  <Routerlink
                    to="/methodology/b200"
                    className="hover:text-blue-400 transition-colors"
                  >
                    B200 Methodology
                  </Routerlink>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Connect</h4>
              <div className="flex gap-4">
                <a
                  href="https://twitter.com/byte_strike"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-blue-400 transition-colors"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href="https://linkedin.com/company/bytestrike"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-blue-400 transition-colors"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} Byte Strike. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-zinc-300 transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-zinc-300 transition-colors">
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
