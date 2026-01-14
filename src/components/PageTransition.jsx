import React from "react";
import { motion } from "framer-motion";

/**
 * Page Transition Wrapper
 * Wraps page content with smooth enter/exit animations
 */
const PageTransition = ({ children, className = "" }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 25,
        duration: 0.3,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * Fade-only transition for smaller components
 */
export const FadeTransition = ({ children, className = "", delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.2,
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * Staggered children animation
 * Use this to animate list items with a stagger effect
 */
export const StaggerContainer = ({ children, className = "", staggerDelay = 0.05 }) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * Stagger item - use as children of StaggerContainer
 */
export const StaggerItem = ({ children, className = "" }) => {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            type: "spring",
            stiffness: 300,
            damping: 24,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * Scale up animation - good for modals and cards
 */
export const ScaleTransition = ({ children, className = "" }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
