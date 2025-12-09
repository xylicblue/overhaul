import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const CircuitAnimation = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <div ref={ref} className="absolute inset-0 z-0 pointer-events-none h-full">
      <svg
        className="w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M50,0 C50,20 20,30 20,50 C20,70 80,80 80,100"
          fill="none"
          stroke="url(#circuit-gradient)"
          strokeWidth="0.5"
          style={{ pathLength }}
        />
        <defs>
          <linearGradient id="circuit-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
            <stop offset="50%" stopColor="#8b5cf6" stopOpacity="1" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default CircuitAnimation;
