// src/components/AuthLayout.jsx

import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import logo from "./assets/ByteStrikeLogoFinal.png";

const AuthLayout = ({ children }) => {
  return (
    <div className="auth-page">
      <Link to="/" className="auth-home-button">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
        Home
      </Link>
      <div className="auth-split-layout">
        {/* Left Side: The "Promo" Panel */}
        <motion.div
          className="auth-promo-panel"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="promo-bg-text">BYTE</span>
          <img src={logo} alt="ByteStrike Logo" className="auth-logo" />
          <h2>WITH THE COMPUTE ECOSYSTEM</h2>
          <p>Seamlessly Enhance The Future Through Our Exchange Technology</p>
        </motion.div>

        {/* Right Side: The Form Panel */}
        <motion.div
          className="auth-form-panel"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
};

export default AuthLayout;
