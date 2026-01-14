import React from "react";

/**
 * Skeleton Loading Components
 * Premium shimmer effect for loading states
 */

// Base skeleton with shimmer animation
const Skeleton = ({ className = "", ...props }) => (
  <div
    className={`relative overflow-hidden bg-zinc-800/50 rounded ${className}`}
    {...props}
  >
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-zinc-700/30 to-transparent" />
  </div>
);

// Chart skeleton
export const ChartSkeleton = () => (
  <div className="w-full h-full p-4 flex flex-col gap-4">
    {/* Header */}
    <div className="flex justify-between items-start">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-16 rounded-lg" />
        <Skeleton className="h-8 w-16 rounded-lg" />
        <Skeleton className="h-8 w-16 rounded-lg" />
      </div>
    </div>
    
    {/* Chart area */}
    <div className="flex-1 flex items-end gap-1 pt-8">
      {[...Array(20)].map((_, i) => (
        <Skeleton
          key={i}
          className="flex-1 rounded-t"
          style={{ height: `${Math.random() * 60 + 20}%` }}
        />
      ))}
    </div>
    
    {/* X-axis labels */}
    <div className="flex justify-between pt-2">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-3 w-12" />
      ))}
    </div>
  </div>
);

// Table skeleton
export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <div className="w-full space-y-3">
    {/* Header */}
    <div className="flex gap-4 pb-2 border-b border-zinc-800">
      {[...Array(columns)].map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    
    {/* Rows */}
    {[...Array(rows)].map((_, rowIndex) => (
      <div key={rowIndex} className="flex gap-4 py-2">
        {[...Array(columns)].map((_, colIndex) => (
          <Skeleton
            key={colIndex}
            className="h-5 flex-1"
            style={{ opacity: 1 - rowIndex * 0.15 }}
          />
        ))}
      </div>
    ))}
  </div>
);

// Position card skeleton
export const PositionCardSkeleton = () => (
  <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-4">
    <div className="flex justify-between items-start">
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-8 w-8 rounded-lg" />
    </div>
    
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-24" />
      </div>
    </div>
    
    <Skeleton className="h-10 w-full rounded-lg" />
  </div>
);

// Trading panel skeleton
export const TradingPanelSkeleton = () => (
  <div className="p-4 space-y-4">
    {/* Tabs */}
    <div className="flex gap-2">
      <Skeleton className="h-10 flex-1 rounded-lg" />
      <Skeleton className="h-10 flex-1 rounded-lg" />
    </div>
    
    {/* Input fields */}
    <div className="space-y-3">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
    
    <div className="space-y-3">
      <Skeleton className="h-4 w-20" />
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-8 flex-1 rounded-lg" />
        ))}
      </div>
    </div>
    
    {/* Summary */}
    <div className="space-y-2 pt-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
    
    {/* Button */}
    <Skeleton className="h-12 w-full rounded-xl mt-4" />
  </div>
);

// Ticker bar skeleton
export const TickerBarSkeleton = () => (
  <div className="h-12 bg-[#050505] border-b border-zinc-800 flex items-center px-4 gap-6">
    <Skeleton className="h-8 w-24 rounded-full" />
    <Skeleton className="h-6 w-20" />
    <div className="flex gap-6">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex flex-col gap-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  </div>
);

// Market list skeleton
export const MarketListSkeleton = ({ items = 6 }) => (
  <div className="space-y-2">
    {[...Array(items)].map((_, i) => (
      <div
        key={i}
        className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg"
        style={{ opacity: 1 - i * 0.12 }}
      >
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="text-right space-y-1">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    ))}
  </div>
);

export default Skeleton;
