import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Wallet,
  BarChart3,
  ArrowRight,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

/**
 * Premium Empty State Component
 * Displays helpful illustrations and CTAs for empty data states
 */
const EmptyState = ({
  type = "positions", // 'positions' | 'trades' | 'wallet' | 'data' | 'custom'
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  icon: CustomIcon,
  secondaryActionLabel,
  secondaryActionHref,
  onSecondaryAction,
  tips = [],
}) => {
  // Default configurations based on type
  const configs = {
    positions: {
      icon: TrendingUp,
      defaultTitle: "No Open Positions",
      defaultDescription: "Start trading to open your first position. Your active trades will appear here.",
      defaultActionLabel: "Start Trading",
      defaultActionHref: "/trade",
      gradient: "from-blue-500/20 via-indigo-500/10 to-purple-500/20",
      iconColor: "text-blue-400",
      tips: [],
    },
    trades: {
      icon: BarChart3,
      defaultTitle: "No Trade History",
      defaultDescription: "Your completed trades will be recorded here for reference.",
      defaultActionLabel: "Make Your First Trade",
      defaultActionHref: "/trade",
      gradient: "from-emerald-500/20 via-teal-500/10 to-cyan-500/20",
      iconColor: "text-emerald-400",
      tips: [],
    },
    wallet: {
      icon: Wallet,
      defaultTitle: "Wallet Not Connected",
      defaultDescription: "Connect your wallet to view your positions and start trading.",
      defaultActionLabel: "Connect Wallet",
      gradient: "from-amber-500/20 via-orange-500/10 to-rose-500/20",
      iconColor: "text-amber-400",
      tips: [],
    },
    data: {
      icon: RefreshCw,
      defaultTitle: "No Data Available",
      defaultDescription: "We couldn't find any data to display. Try refreshing or check back later.",
      defaultActionLabel: "Refresh",
      gradient: "from-slate-500/20 via-zinc-500/10 to-gray-500/20",
      iconColor: "text-slate-400",
      tips: [],
    },
    custom: {
      icon: Sparkles,
      gradient: "from-indigo-500/20 via-purple-500/10 to-pink-500/20",
      iconColor: "text-indigo-400",
      tips: [],
    },
  };

  const config = configs[type] || configs.custom;
  const Icon = CustomIcon || config.icon;
  const displayTitle = title || config.defaultTitle;
  const displayDescription = description || config.defaultDescription;
  const displayActionLabel = actionLabel || config.defaultActionLabel;
  const displayActionHref = actionHref || config.defaultActionHref;
  const displayTips = tips.length > 0 ? tips : config.tips;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center p-8 text-center"
    >
      {/* Animated Icon Container */}
      <div className="relative mb-6">
        {/* Gradient Glow */}
        <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} rounded-full blur-2xl opacity-60`} />
        
        {/* Icon Circle */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          className="relative w-20 h-20 bg-surface-2 rounded-full flex items-center justify-center border border-line shadow-xl"
        >
          {/* Animated ring */}
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-line animate-[spin_20s_linear_infinite]" />
          
          <Icon size={32} className={`${config.iconColor} relative z-10`} />
        </motion.div>
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-ink mb-2">{displayTitle}</h3>

      {/* Description */}
      <p className="text-sm text-ink-muted max-w-xs mb-6 leading-relaxed">
        {displayDescription}
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {displayActionLabel && (displayActionHref || onAction) && (
          displayActionHref ? (
            <Link
              to={displayActionHref}
              className="group inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-900/25 hover:shadow-blue-900/40 hover:scale-[1.02]"
            >
              {displayActionLabel}
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ) : (
            <button
              onClick={onAction}
              className="group inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-900/25 hover:shadow-blue-900/40 hover:scale-[1.02]"
            >
              {displayActionLabel}
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          )
        )}

        {secondaryActionLabel && (secondaryActionHref || onSecondaryAction) && (
          secondaryActionHref ? (
            <Link
              to={secondaryActionHref}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-surface-2 hover:bg-surface-3 text-ink-muted hover:text-ink text-sm font-medium rounded-xl transition-all border border-line"
            >
              {secondaryActionLabel}
              <ExternalLink size={14} />
            </Link>
          ) : (
            <button
              onClick={onSecondaryAction}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-surface-2 hover:bg-surface-3 text-ink-muted hover:text-ink text-sm font-medium rounded-xl transition-all border border-line"
            >
              {secondaryActionLabel}
            </button>
          )
        )}
      </div>

      {/* Tips Section */}
      {displayTips.length > 0 && (
        <div className="w-full max-w-sm">
          <div className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider mb-2">
            Quick Tips
          </div>
          <div className="space-y-2">
            {displayTips.map((tip, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="flex items-start gap-2 text-left"
              >
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500/50 shrink-0" />
                <span className="text-xs text-ink-faint">{tip}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

/**
 * Compact version for smaller panels
 */
export const CompactEmptyState = ({
  icon: Icon = TrendingUp,
  title = "No Data",
  description,
  actionLabel,
  onAction,
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex flex-col items-center justify-center py-8 px-4 text-center"
  >
    <div className="w-12 h-12 bg-surface-2 rounded-full flex items-center justify-center mb-3 border border-dashed border-line">
      <Icon size={20} className="text-ink-faint" />
    </div>
    <p className="text-sm font-medium text-ink-muted mb-1">{title}</p>
    {description && (
      <span className="text-xs text-ink-faint max-w-[200px]">{description}</span>
    )}
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="mt-3 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
      >
        {actionLabel} →
      </button>
    )}
  </motion.div>
);

export default EmptyState;
