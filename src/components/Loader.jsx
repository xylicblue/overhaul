import React from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   Loader — abstract, minimalist pulse bars
   Usage:
     <Loader />                         inline, medium, white
     <Loader size="sm" />               small bars
     <Loader size="lg" />               large bars
     <Loader color="#00d4aa" />         teal accent
     <Loader label="Loading…" />        with a label below
     <Loader.Page />                    full-screen centered overlay
     <Loader.Inline label="Loading…" /> flex-row with label beside
   ──────────────────────────────────────────────────────────────────────────── */

const SIZES = {
  xs: { w: 2,  h: 10, gap: 2,  label: 8  },
  sm: { w: 2,  h: 14, gap: 3,  label: 9  },
  md: { w: 3,  h: 18, gap: 3,  label: 10 },
  lg: { w: 4,  h: 24, gap: 4,  label: 11 },
};

// Inlined keyframe — injected once per page mount
const STYLE_ID = "__bs_loader_style__";
function ensureStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes bs-bar {
      0%,100% { transform: scaleY(0.25); opacity: 0.2; }
      50%      { transform: scaleY(1);    opacity: 0.85; }
    }
  `;
  document.head.appendChild(el);
}

// ── Core bars ─────────────────────────────────────────────────────────────────
const Loader = ({
  size  = "md",
  color = "rgba(255,255,255,0.65)",
  label = null,
  className = "",
}) => {
  ensureStyle();
  const { w, h, gap, label: labelSize } = SIZES[size] || SIZES.md;

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 ${className}`}
      aria-label="Loading"
      role="status"
    >
      {/* Three bars */}
      <div style={{ display: "flex", alignItems: "center", gap: `${gap}px` }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width:           w,
              height:          h,
              borderRadius:    w / 2,
              background:      color,
              transformOrigin: "center bottom",
              animation:       `bs-bar 1s ease-in-out infinite`,
              animationDelay:  `${i * 0.18}s`,
            }}
          />
        ))}
      </div>

      {/* Optional label */}
      {label && (
        <span
          style={{
            fontSize:      labelSize,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color:         "rgba(255,255,255,0.28)",
            fontFamily:    "'IBM Plex Mono', ui-monospace, monospace",
            userSelect:    "none",
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
};

// ── Full-screen page overlay ───────────────────────────────────────────────────
Loader.Page = function LoaderPage({ label }) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#050505]"
      role="status"
      aria-label="Loading page"
    >
      {/* Subtle radial glow behind bars */}
      <div
        style={{
          position: "absolute",
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <Loader size="lg" label={label || "Loading"} />
    </div>
  );
};

// ── Inline (horizontal) variant ───────────────────────────────────────────────
Loader.Inline = function LoaderInline({ size = "xs", color, label, className = "" }) {
  ensureStyle();
  const { w, h, gap, label: labelSize } = SIZES[size] || SIZES.xs;
  const c = color || "rgba(255,255,255,0.5)";

  return (
    <span
      className={`inline-flex items-center gap-2 ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: `${gap}px` }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              display:         "inline-block",
              width:           w,
              height:          h,
              borderRadius:    w / 2,
              background:      c,
              transformOrigin: "center bottom",
              animation:       `bs-bar 1s ease-in-out infinite`,
              animationDelay:  `${i * 0.18}s`,
            }}
          />
        ))}
      </span>
      {label && (
        <span style={{ fontSize: labelSize, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", fontFamily: "ui-monospace, monospace" }}>
          {label}
        </span>
      )}
    </span>
  );
};

export default Loader;
