import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

/**
 * Reusable Confirmation Modal Component
 * Clean, professional design with subtle animations
 */
const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "warning", // 'warning' | 'danger' | 'info'
  isLoading = false,
  details = null,
}) => {
  const variants = {
    warning: {
      icon: "text-amber-400",
      iconBg: "bg-amber-500/10",
      button: "bg-amber-500 hover:bg-amber-400",
    },
    danger: {
      icon: "text-red-400",
      iconBg: "bg-red-500/10",
      button: "bg-red-500 hover:bg-red-400",
    },
    info: {
      icon: "text-blue-400",
      iconBg: "bg-blue-500/10",
      button: "bg-blue-500 hover:bg-blue-400",
    },
  };

  const style = variants[variant] || variants.warning;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-md px-4"
          >
            <div className="w-full bg-[#0A0A0F] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="relative px-6 pt-6 pb-4">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X size={18} />
                </button>

                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${style.iconBg}`}>
                    <AlertTriangle className={`w-6 h-6 ${style.icon}`} />
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <p className="mt-1 text-sm text-zinc-400">{message}</p>
                  </div>
                </div>
              </div>

              {/* Details Section */}
              {details && (
                <div className="mx-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                  {details}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 p-6 pt-4">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={`flex-1 px-4 py-2.5 ${style.button} text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    confirmText
                  )}
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
