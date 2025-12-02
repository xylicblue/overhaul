import React from "react";
import { motion } from "framer-motion";
import "./spinner.css"; // We'll create this next

const LoadingSpinner = () => {
  return (
    <div className="spinner-container">
      <motion.div
        className="spinner"
        animate={{ rotate: 360 }}
        transition={{
          loop: Infinity,
          ease: "linear",
          duration: 1,
        }}
      ></motion.div>
    </div>
  );
};

export default LoadingSpinner;
