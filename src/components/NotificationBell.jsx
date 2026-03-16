import React, { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "../hooks/useNotifications";

// Type → colour mapping
const TYPE_STYLES = {
  info:         { badge: "bg-blue-500/15 text-blue-300 border-blue-500/25",   dot: "bg-blue-400" },
  warning:      { badge: "bg-amber-500/15 text-amber-300 border-amber-500/25", dot: "bg-amber-400" },
  announcement: { badge: "bg-purple-500/15 text-purple-300 border-purple-500/25", dot: "bg-purple-400" },
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell({ userId }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const { notifications, readIds, unreadCount, loading, markRead, markAllRead } =
    useNotifications(userId);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-0.5 rounded-full bg-blue-500 text-[9px] font-bold text-white leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1,    y: 0 }}
            exit={{ opacity: 0, scale: 0.96,    y: -6 }}
            transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute right-0 top-[calc(100%+8px)] w-80 z-[200] rounded-xl border border-zinc-800 bg-[#0e0e14] shadow-2xl shadow-black/60 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/25 px-1.5 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[11px] text-zinc-500 hover:text-blue-400 transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[360px] overflow-y-auto divide-y divide-zinc-800/60">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-5 h-5 rounded-full border-2 border-zinc-700 border-t-blue-500 animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell size={22} className="mx-auto text-zinc-700 mb-2" />
                  <p className="text-sm text-zinc-600">No notifications</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const isUnread = !readIds.has(n.id);
                  const style = TYPE_STYLES[n.type] || TYPE_STYLES.info;
                  return (
                    <div
                      key={n.id}
                      className={`flex gap-3 px-4 py-3.5 transition-colors cursor-default ${
                        isUnread ? "bg-white/[0.02]" : ""
                      } hover:bg-white/[0.03]`}
                      onMouseEnter={() => isUnread && markRead(n.id)}
                    >
                      {/* Unread dot */}
                      <div className="mt-1.5 shrink-0">
                        <div className={`w-1.5 h-1.5 rounded-full ${isUnread ? style.dot : "bg-zinc-700"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${style.badge}`}>
                            {n.type}
                          </span>
                          <span className="text-[10px] text-zinc-600 ml-auto shrink-0">{timeAgo(n.created_at)}</span>
                        </div>
                        <p className="text-sm font-medium text-zinc-200 leading-snug">{n.title}</p>
                        <p className="text-xs text-zinc-500 leading-relaxed mt-0.5">{n.message}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-zinc-800 text-center">
                <span className="text-[10px] text-zinc-600">
                  {notifications.length} active notification{notifications.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
