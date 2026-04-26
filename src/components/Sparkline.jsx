import React, { useEffect, useState, memo } from "react";
import { supabase } from "../creatclient";
import { SPARKLINE_CONFIG } from "../config/marketsConfig";

// Build a smooth cubic-bezier SVG path from an array of values
function buildPath(data, w, h) {
  if (data.length < 2) return "";
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 0.001;
  const pad = h * 0.12;

  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: pad + (1 - (v - min) / range) * (h - 2 * pad),
  }));

  return pts.reduce((acc, p, i) => {
    if (i === 0) return `M${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    const prev = pts[i - 1];
    const cx = ((prev.x + p.x) / 2).toFixed(1);
    return `${acc} C${cx} ${prev.y.toFixed(1)},${cx} ${p.y.toFixed(1)},${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }, "");
}

// Build a closed fill path (same line + straight back along bottom)
function buildFill(data, w, h) {
  const line = buildPath(data, w, h);
  if (!line) return "";
  return `${line} L${w} ${h} L0 ${h} Z`;
}

const Sparkline = memo(({ marketId, width = 68, height = 26, block = false }) => {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cfg = SPARKLINE_CONFIG[marketId];
    if (!cfg) { setLoading(false); return; }

    let cancelled = false;

    (async () => {
      const timeField = cfg.timeField || "created_at";
      let q = supabase
        .from(cfg.table)
        .select(`${cfg.priceField}, ${timeField}`)
        .order(timeField, { ascending: false })
        .limit(24);

      if (cfg.providerFilter) {
        q = q.eq("provider_name", cfg.providerFilter);
      }

      const { data } = await q;

      if (!cancelled && data && data.length > 1) {
        const vals = data
          .reverse()
          .map(r => parseFloat(r[cfg.priceField]))
          .filter(v => !isNaN(v) && v > 0);
        if (vals.length > 1) setPoints(vals);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [marketId]);

  if (loading) {
    return (
      <div
        style={block ? { height } : { width, height }}
        className={`rounded animate-pulse bg-white/[0.04] ${block ? "w-full" : "shrink-0"}`}
      />
    );
  }

  if (points.length < 2) {
    return <div style={block ? { height } : { width, height }} className={block ? "w-full" : "shrink-0"} />;
  }

  const isUp = points[points.length - 1] >= points[0];
  const strokeColor = isUp ? "#34d399" : "#f87171"; // emerald-400 / red-400
  const fillId      = `sf-${marketId.replace(/[^a-z0-9]/gi, "")}`;
  const linePath    = buildPath(points, width, height);
  const fillPath    = buildFill(points, width, height);

  return (
    <svg
      width={block ? "100%" : width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={block ? "none" : undefined}
      fill="none"
      className={block ? "w-full overflow-visible" : "shrink-0 overflow-visible"}
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={strokeColor} stopOpacity="0.18" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0"    />
        </linearGradient>
      </defs>
      {/* Fill area under curve */}
      <path d={fillPath} fill={`url(#${fillId})`} />
      {/* Line */}
      <path
        d={linePath}
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
});

export default Sparkline;
