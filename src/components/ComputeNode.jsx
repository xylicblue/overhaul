import React from "react";
import { motion } from "framer-motion";

const ComputeNode = () => {
  return (
    <div className="w-full h-[400px] flex items-center justify-center perspective-1000 relative overflow-hidden rounded-2xl bg-black/20 border border-white/5 backdrop-blur-sm">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-purple-500/10 to-transparent opacity-50 blur-3xl" />

      <motion.div
        className="relative w-48 h-48 preserve-3d"
        animate={{
          rotateX: [15, -15, 15],
          rotateY: [0, 360],
        }}
        transition={{
          rotateX: { duration: 8, repeat: Infinity, ease: "easeInOut" },
          rotateY: { duration: 20, repeat: Infinity, ease: "linear" },
        }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Core Cube */}
        <div className="absolute inset-0 transform-style-3d">
          {/* Front Face */}
          <div className="absolute inset-0 border-2 border-blue-500/30 bg-blue-900/10 backdrop-blur-md translate-z-24 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 blur-md" />
          </div>
          {/* Back Face */}
          <div className="absolute inset-0 border-2 border-purple-500/30 bg-purple-900/10 backdrop-blur-md -translate-z-24 rotate-y-180 flex items-center justify-center">
             <div className="w-16 h-16 rounded-full bg-purple-500/20 blur-md" />
          </div>
          {/* Right Face */}
          <div className="absolute inset-0 border-2 border-blue-400/30 bg-blue-800/10 backdrop-blur-md rotate-y-90 translate-z-24" />
          {/* Left Face */}
          <div className="absolute inset-0 border-2 border-blue-400/30 bg-blue-800/10 backdrop-blur-md -rotate-y-90 translate-z-24" />
          {/* Top Face */}
          <div className="absolute inset-0 border-2 border-indigo-500/30 bg-indigo-900/10 backdrop-blur-md rotate-x-90 translate-z-24" />
          {/* Bottom Face */}
          <div className="absolute inset-0 border-2 border-indigo-500/30 bg-indigo-900/10 backdrop-blur-md -rotate-x-90 translate-z-24" />
        </div>

        {/* Floating Elements / Particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]"
            initial={{
              x: Math.random() * 200 - 100,
              y: Math.random() * 200 - 100,
              z: Math.random() * 200 - 100,
              opacity: 0,
            }}
            animate={{
              x: Math.random() * 200 - 100,
              y: Math.random() * 200 - 100,
              z: Math.random() * 200 - 100,
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Inner Grid Lines (Holographic effect) */}
        <div className="absolute inset-4 border border-white/10 rounded-lg translate-z-12" />
        <div className="absolute inset-4 border border-white/10 rounded-lg -translate-z-12" />
      </motion.div>

      {/* CSS for 3D transforms since Tailwind doesn't have all utilities by default */}
      <style jsx>{`
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .translate-z-24 {
          transform: translateZ(6rem);
        }
        .-translate-z-24 {
          transform: translateZ(-6rem);
        }
        .translate-z-12 {
            transform: translateZ(3rem);
        }
        .-translate-z-12 {
            transform: translateZ(-3rem);
        }
        .rotate-y-90 {
          transform: rotateY(90deg) translateZ(6rem);
        }
        .-rotate-y-90 {
          transform: rotateY(-90deg) translateZ(6rem);
        }
        .rotate-x-90 {
          transform: rotateX(90deg) translateZ(6rem);
        }
        .-rotate-x-90 {
          transform: rotateX(-90deg) translateZ(6rem);
        }
        .rotate-y-180 {
            transform: rotateY(180deg) translateZ(6rem);
        }
      `}</style>
    </div>
  );
};

export default ComputeNode;
