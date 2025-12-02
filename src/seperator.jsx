// src/components/SectionSeparator.jsx

import React from "react";
import { motion } from "framer-motion";
import "./seperator.css"; // We will create this file next

const SectionSeparator = () => {
  return (
    <div className="separator-wrapper">
      <motion.div
        className="separator-line left"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
      />
      <motion.div
        className="separator-diamond"
        initial={{ scale: 0, rotate: -45 }}
        whileInView={{ scale: 1, rotate: 45 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ duration: 0.5, ease: [0.17, 0.67, 0.83, 0.67] }}
      />
      <motion.div
        className="separator-line right"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
      />
    </div>
  );
};

export default SectionSeparator;
