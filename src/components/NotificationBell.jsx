import React, { useState, useRef, useEffect } from "react";
import { Bell, BellOff, CheckCheck, Settings, X, Zap, AlertTriangle, TrendingUp, DollarSign, ArrowDownCircle, Radio } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "../hooks/useNotifications";
import { useAccount } from "wagmi";

// ── Admin notification type config ────────────────────────────────────────────
const ADMIN_TYPE_CONFIG = {
  info:         { label: "Info",         dot: "bg-blue-400",   badge: "text-blue-300 bg-blue-500/10 border-blue-500/20",   border: "border-l-blue-500" },
  warning:      { label: "Warning",      dot: "bg-amber-400",  badge: "text-amber-300 bg-amber-500/10 border-amber-500/20", border: "border-l-amber-500" },
  announcement: { label: "Update",       dot: "bg-purple-400", badge: "text-purple-300 bg-purple-500/10 border-purple-500/20", border: "border-l-purple-500" },
};

// ── Trader notification priority config ───────────────────────────────────────
const PRIORITY_CONFIG = {
  critical: { dot: "bg-red-400",    border: "border-l-red-500",    badge: "text-red-300 bg-red-500/10 border-red-500/20",       label: "Critical" },
  high:     { dot: "bg-orange-400", border: "border-l-orange-500", badge: "text-orange-300 bg-orange-500/10 border-orange-500/20", label: "High" },
  medium:   { dot: "bg-yellow-400", border: "border-l-yellow-500", badge: "text-yellow-300 bg-yellow-500/10 border-yellow-500/20", label: "Medium" },
  low:      { dot: "bg-zinc-500",   border: "border-l-zinc-600",   badge: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",   label: "Info" },
};

// ── Category icons ────────────────────────────────────────────────────────────
const CATEGORY_ICON = {
  A: AlertTriangle,
  B: AlertTriangle,
  C: TrendingUp,
  D: TrendingUp,
  E: DollarSign,
  F: Radio,
  G: AlertTriangle,
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Single notification row ───────────────────────────────────────────────────
function NotificationRow({ n, isUnread, onMarkRead, onDismiss }) {
  const isTrader = n._source === "trader";

  const cfg = isTrader
    ? PRIORITY_CONFIG[n.priority] || PRIORITY_CONFIG.low
    : ADMIN_TYPE_CONFIG[n.type]   || ADMIN_TYPE_CONFIG.info;

  const CategoryIcon = isTrader ? (CATEGORY_ICON[n.category] || Zap) : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ duration: 0.15 }}
      onMouseEnter={() => isUnread && onMarkRead(n.id, n._source)}
      className={`relative flex gap-3 px-4 py-3.5 cursor-default transition-colors duration-100 border-l-[3px]
        ${isUnread ? cfg.border : "border-l-transparent"}
        ${isUnread ? "bg-white/[0.025]" : ""}
        hover:bg-white/[0.035]
        border-t border-t-white/[0.04]
      `}
    >
      {/* Icon */}
      <div className="mt-[13px] shrink-0">
        {isTrader && CategoryIcon ? (
          <div className={`w-5 h-5 rounded-md flex items-center justify-center ${isUnread ? "bg-white/[0.08]" : "bg-white/[0.04]"}`}>
            <CategoryIcon size={11} className={isUnread ? cfg.dot.replace("bg-", "text-") : "text-zinc-600"} />
          </div>
        ) : (
          <div className={`w-1.5 h-1.5 rounded-full ${isUnread ? cfg.dot : "bg-zinc-700"}`} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 py-0.5 pr-4">
        {/* Badge + time row */}
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${cfg.badge}`}>
            {isTrader ? cfg.label : cfg.label}
          </span>
          {isTrader && n.market_label && (
            <span className="text-[10px] text-zinc-600 truncate max-w-[100px]">{n.market_label}</span>
          )}
          <span className="text-[10px] text-zinc-700 ml-auto shrink-0 tabular-nums">
            {timeAgo(n.created_at)}
          </span>
        </div>

        {/* Title */}
        <p className={`text-[13px] font-semibold leading-snug mb-0.5 ${isUnread ? "text-white" : "text-zinc-300"}`}>
          {isTrader ? n.title : n.title}
        </p>

        {/* Body */}
        <p className="text-[12px] text-zinc-500 leading-relaxed">
          {isTrader ? n.body : n.message}
        </p>

        {/* CTA actions (trader only) */}
        {isTrader && n.actions && n.actions.length > 0 && (
          <div className="flex gap-2 mt-2">
            {n.actions.map((action, i) => (
              <a
                key={i}
                href={action.href}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              >
                {action.label} →
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Dismiss button (trader notifications only) */}
      {isTrader && onDismiss && (
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(n.id); }}
          className="absolute top-2.5 right-2.5 p-1 rounded text-zinc-700 hover:text-zinc-400 hover:bg-white/[0.06] transition-all opacity-0 group-hover:opacity-100"
          title="Dismiss"
        >
          <X size={11} />
        </button>
      )}
    </motion.div>
  );
}

// ── Main Bell Component ───────────────────────────────────────────────────────
export default function NotificationBell({ userId }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  // Get wallet address from wagmi for trader notifications
  const { address: walletAddress } = useAccount();

  const {
    notifications,
    readIds,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    dismiss,
    notifEnabled,
  } = useNotifications(userId, walletAddress);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Flash badge animation color: red for critical unread, blue otherwise
  const hasCritical = notifications.some(
    (n) => n._source === "trader" && n.status === "unread" && n.priority === "critical"
  );

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
            className={`absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-0.5 rounded-full
              ${hasCritical ? "bg-red-500 animate-pulse" : "bg-blue-500"}
              text-[9px] font-bold text-white leading-none ring-2 ring-[#050505]`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      {/* ── Dropdown Panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0,   y: -4,  scale: 0.97 }}
            transition={{ duration: 0.14, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute right-0 top-[calc(100%+10px)] w-[360px] z-[200]
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
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border
                    ${hasCritical
                      ? "bg-red-500/15 text-red-300 border-red-500/20"
                      : "bg-blue-500/15 text-blue-300 border-blue-500/20"
                    }`}
                  >
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-blue-400 transition-colors group"
                >
                  <CheckCheck size={12} className="group-hover:text-blue-400 transition-colors" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Body */}
            <div className="max-h-[420px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              {!notifEnabled ? (
                <div className="py-12 text-center px-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
                    <BellOff size={18} className="text-zinc-600" />
                  </div>
                  <p className="text-sm text-zinc-500 font-medium">Notifications muted</p>
                  <p className="text-xs text-zinc-700 mt-1">Re-enable them in Settings.</p>
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
                <AnimatePresence initial={false}>
                  {notifications.map((n) => {
                    const isUnread = n._source === "admin"
                      ? !readIds.has(n.id)
                      : n.status === "unread";
                    return (
                      <NotificationRow
                        key={n.id}
                        n={n}
                        isUnread={isUnread}
                        onMarkRead={markRead}
                        onDismiss={n._source === "trader" ? dismiss : null}
                      />
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-white/[0.05] flex items-center justify-between">
              <span className="text-[10px] text-zinc-700">
                {notifications.length > 0 ? `${notifications.length} notification${notifications.length !== 1 ? "s" : ""}` : "No notifications"}
              </span>
              <a
                href="/settings"
                className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-white transition-colors font-medium"
                onClick={() => setOpen(false)}
              >
                <Settings size={11} />
                Preferences
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
