import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

const LuxGradientBackground = () => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#020205]">
      {/* Deep atmospheric base */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050510] via-[#0a0a1a] to-[#050510]" />

      {/* Soft moving orbs */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
          x: [-50, 50, -50],
          y: [-20, 20, -20]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-indigo-900/20 rounded-full blur-[120px] mix-blend-screen"
      />
      
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          x: [20, -20, 20],
          y: [30, -30, 30]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-violet-900/10 rounded-full blur-[100px] mix-blend-screen"
      />

      <motion.div 
        animate={{ 
          opacity: [0.1, 0.2, 0.1],
          scale: [1.2, 1, 1.2]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-blue-900/10 rounded-full blur-[150px] mix-blend-screen"
      />

      {/* Grain overlay for texture */}
      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100" />
    </div>
  );
};

export default LuxGradientBackground;
