import React, { useState, useRef, useEffect, memo } from "react";
import { Bell, BellOff, CheckCheck, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotificationStore } from "../stores/useNotificationStore";

const TYPE_CONFIG = {
  info:         { label: "Info",         dot: "bg-blue-400",   badge: "text-blue-300 bg-blue-500/10 border-blue-500/20" },
  warning:      { label: "Warning",      dot: "bg-amber-400",  badge: "text-amber-300 bg-amber-500/10 border-amber-500/20" },
  announcement: { label: "Announcement", dot: "bg-purple-400", badge: "text-purple-300 bg-purple-500/10 border-purple-500/20" },
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function NotificationBell({ userId }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const { readIds, loading, markRead, markAllRead, prefs, getNotifications, getUnreadCount } =
    useNotificationStore();
  const notifications  = getNotifications();
  const unreadCount    = getUnreadCount();
  const notifEnabled   = prefs.enabled !== false;

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

      {/* ── Bell button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200
          ${open
            ? "text-white bg-white/[0.08]"
            : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"
          }`}
      >
        {notifEnabled ? <Bell size={15} /> : <BellOff size={15} />}

        {notifEnabled && unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-0.5 rounded-full bg-blue-500 text-[9px] font-bold text-white leading-none ring-2 ring-[#050505]"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      {/* ── Panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0,   y: -4,  scale: 0.97 }}
            transition={{ duration: 0.14, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute right-0 top-[calc(100%+10px)] w-[340px] z-[200]
              rounded-2xl border border-white/[0.07]
              bg-[#0c0c12]/95 backdrop-blur-xl
              shadow-[0_24px_48px_rgba(0,0,0,0.7)]
              overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <Bell size={13} className="text-zinc-500" />
                <span className="text-[13px] font-semibold text-white tracking-tight">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full
                    bg-blue-500/15 text-blue-300 border border-blue-500/20">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead(userId)}
                  className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-blue-400 transition-colors group"
                >
                  <CheckCheck size={12} className="group-hover:text-blue-400 transition-colors" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Body */}
            <div className="max-h-[380px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              {!notifEnabled ? (
                <div className="py-12 text-center px-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
                    <BellOff size={18} className="text-zinc-600" />
                  </div>
                  <p className="text-sm text-zinc-500 font-medium">Notifications muted</p>
                  <p className="text-xs text-zinc-700 mt-1">You can re-enable them in Settings.</p>
                </div>
              ) : loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 rounded-full border-2 border-zinc-800 border-t-blue-500 animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-12 text-center px-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
                    <Bell size={18} className="text-zinc-600" />
                  </div>
                  <p className="text-sm text-zinc-500 font-medium">All caught up</p>
                  <p className="text-xs text-zinc-700 mt-1">No new notifications right now.</p>
                </div>
              ) : (
                <div>
                  {notifications.map((n, idx) => {
                    const isUnread = !readIds[n.id];
                    const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
                    return (
                      <div
                        key={n.id}
                        onMouseEnter={() => isUnread && markRead(n.id, userId)}
                        className={`relative flex gap-3 px-4 py-3.5 cursor-default transition-colors duration-100
                          ${isUnread ? "bg-white/[0.025]" : ""}
                          hover:bg-white/[0.035]
                          ${idx > 0 ? "border-t border-white/[0.04]" : ""}
                        `}
                      >
                        {/* Left: unread indicator bar */}
                        {isUnread && (
                          <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full ${cfg.dot}`} />
                        )}

                        {/* Type dot */}
                        <div className="mt-[15px] shrink-0">
                          <div className={`w-1.5 h-1.5 rounded-full ${isUnread ? cfg.dot : "bg-zinc-700"}`} />
                        </div>

                        <div className="flex-1 min-w-0 py-0.5">
                          {/* Meta row */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${cfg.badge}`}>
                              {cfg.label}
                            </span>
                            <span className="text-[10px] text-zinc-700 ml-auto shrink-0 tabular-nums">
                              {timeAgo(n.created_at)}
                            </span>
                          </div>
                          <p className={`text-[13px] font-semibold leading-snug mb-0.5 ${isUnread ? "text-white" : "text-zinc-300"}`}>
                            {n.title}
                          </p>
                          <p className="text-[12px] text-zinc-500 leading-relaxed">
                            {n.message}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer — always visible */}
            <div className="px-4 py-2.5 border-t border-white/[0.05] flex items-center justify-between">
              <span className="text-[10px] text-zinc-700">
                {notifications.length > 0 ? `${notifications.length} active` : "No notifications"}
              </span>
              <a
                href="/settings"
                className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-white transition-colors font-medium"
                onClick={() => setOpen(false)}
              >
                <Settings size={11} />
                Manage preferences
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(NotificationBell);
