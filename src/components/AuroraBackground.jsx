import React from "react";
import { motion } from "framer-motion";

export const AuroraBackground = ({ className, children, ...props }) => {
  return (
    <div
      className={`relative flex flex-col  items-center justify-center bg-[#050505] text-slate-200 transition-bg ${className}`}
      {...props}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`
            absolute -inset-[10px] opacity-50
            [--white-gradient:repeating-linear-gradient(100deg,var(--white)_0%,var(--white)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--white)_16%)]
            [--dark-gradient:repeating-linear-gradient(100deg,var(--black)_0%,var(--black)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--black)_16%)]
            [--aurora:repeating-linear-gradient(100deg,#3b82f6_10%,#a855f7_15%,#93c5fd_20%,#e879f9_25%,#60a5fa_30%)]
            [background-image:var(--dark-gradient),var(--aurora)]
            [background-size:300%,_200%]
            [background-position:50%_50%,50%_50%]
            filter blur-[10px]
            after:content-[""] after:absolute after:inset-0 
            after:[background-image:var(--dark-gradient),var(--aurora)]
            after:[background-size:200%,_100%] 
            after:animate-aurora after:[background-attachment:fixed] after:mix-blend-difference
          `}
        ></div>
      </div>
      {children}
    </div>
  );
};

export default AuroraBackground;
