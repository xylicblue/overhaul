import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "warning",
  isLoading = false,
  details = null,
}) => {
  const confirmStyles = {
    warning: "bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/25 hover:border-amber-500/40",
    danger:  "bg-red-500/15  hover:bg-red-500/25  text-red-400  border border-red-500/25  hover:border-red-500/40",
    info:    "bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/25 hover:border-blue-500/40",
  };

  const accentLine = {
    warning: "via-amber-500/30",
    danger:  "via-red-500/30",
    info:    "via-blue-500/30",
  };

  const style = confirmStyles[variant] || confirmStyles.warning;
  const accent = accentLine[variant] || accentLine.warning;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-[100]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-sm px-4"
          >
            <div className="w-full bg-[#0d0d14] border border-white/[0.08] rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.75)] overflow-hidden">

              {/* Top gradient accent */}
              <div className={`h-px bg-gradient-to-r from-transparent ${accent} to-transparent`} />

              {/* Header */}
              <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[15px] font-semibold text-white leading-tight">{title}</h3>
                  <p className="mt-1 text-[12px] text-zinc-400 leading-relaxed">{message}</p>
                </div>
                <button
                  onClick={onClose}
                  className="shrink-0 p-1 mt-0.5 text-zinc-600 hover:text-zinc-300 transition-colors duration-150"
                >
                  <X size={14} strokeWidth={1.75} />
                </button>
              </div>

              {/* Details */}
              {details && (
                <div className="mx-5 mb-3 p-3.5 bg-white/[0.025] border border-white/[0.06] rounded-xl text-[12px]">
                  {details}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 px-5 pb-5 pt-1">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 bg-transparent border border-white/[0.08] hover:border-white/[0.16] text-zinc-400 hover:text-white text-[12px] font-medium rounded-xl transition-all duration-150 disabled:opacity-40"
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={`flex-1 px-4 py-2.5 text-[12px] font-semibold rounded-xl transition-all duration-150 disabled:opacity-40 flex items-center justify-center gap-2 ${style}`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      Processing…
                    </>
                  ) : confirmText}
                </button>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ConfirmationModal;
