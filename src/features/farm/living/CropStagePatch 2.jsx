/* ═══════════════════════════════════════════
   CROP STAGE PATCH v3 — calm, icon-first
   MARKER: CROP_PATCH_V3

   One patch = one plot inside a zone on the Living Farm Map.
   Glance layer: crop icon in a white chip + progress ring
   (growth %) + stage tint (sand → green → amber). Details
   (variety, dates, exact %) live in the tap card / overlay.
   ═══════════════════════════════════════════ */
import React from "react";
import { F } from "../../../lib/theme";
import { CROP_MAP } from "../../../data/crops";
import { FARM_SVG } from "../../../components/FarmIcon";
import { STAGE_STYLE } from "./visuals";

export default function CropStagePatch({
  patch,
  compact = false,
  showText = true,
  interactive = false,
  selected = false,
  onClick,
}) {
  const meta = STAGE_STYLE[patch.stage] || STAGE_STYLE.just_planted;
  const ready = patch.stage === "ready";
  const pct = Math.max(0, Math.min(100, Math.round((patch.growthPct || 0) * 100)));
  const ringPct = Math.max(pct, 3);
  const cropDef = CROP_MAP.get(patch.crop);
  const cropEmoji = (cropDef && cropDef.emoji) || "🌱";
  const SvgIcon = FARM_SVG[patch.crop] || null;
  const showLabels = showText && !compact;
  const chipSize = compact ? "clamp(14px, 58%, 22px)" : "clamp(18px, 52%, 38px)";

  return (
    <div
      data-crop-patch="v3"
      onClick={interactive ? onClick : undefined}
      style={{
        position: "absolute",
        left: `${(patch.px * 100).toFixed(1)}%`,
        top: `${(patch.py * 100).toFixed(1)}%`,
        width: `${(patch.pw * 100).toFixed(1)}%`,
        height: `${(patch.ph * 100).toFixed(1)}%`,
        background: meta.bg,
        border: selected ? "1px solid rgba(255,255,255,.95)" : `1px solid ${meta.border}`,
        borderRadius: compact ? 6 : 10,
        overflow: "hidden",
        pointerEvents: interactive ? "auto" : "none",
        cursor: interactive ? "pointer" : "default",
        zIndex: 5,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: compact ? 1 : 3,
        boxShadow: selected
          ? "0 0 0 2px rgba(255,255,255,.95), 0 0 0 5px rgba(40,88,58,.28), 0 8px 18px rgba(38,50,30,.18)"
          : ready
            ? meta.glow
            : "inset 0 1px rgba(255,255,255,.35)",
      }}
    >
      <div style={{ position: "relative", width: chipSize, aspectRatio: "1", flexShrink: 0 }}>
        <div style={{
          position: "absolute",
          inset: "10%",
          borderRadius: "50%",
          background: "rgba(255,255,255,.94)",
          boxShadow: "0 1px 4px rgba(38,50,30,.14)",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          {SvgIcon ? (
            <span style={{ display: "flex", width: "70%", height: "70%" }}><SvgIcon/></span>
          ) : (
            <span style={{ fontSize: compact ? 10 : 15, lineHeight: 1 }}>{cropEmoji}</span>
          )}
        </div>
        <svg viewBox="0 0 36 36" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
          <circle cx="18" cy="18" r="16.4" fill="none" stroke="rgba(43,58,46,.13)" strokeWidth="3"/>
          <circle
            cx="18" cy="18" r="16.4" fill="none"
            stroke={meta.ring} strokeWidth="3" strokeLinecap="round"
            pathLength="100"
            strokeDasharray={`${ringPct} ${100 - ringPct}`}
          />
        </svg>
      </div>
      {showLabels && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", maxWidth: "94%", lineHeight: 1.15 }}>
          <span style={{
            fontSize: 10, fontWeight: 800, color: "#2b3a2e",
            maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            textShadow: "0 1px 2px rgba(255,255,255,.55)",
          }}>{patch.crop}</span>
          <span style={{ fontSize: 8.5, fontWeight: 800, fontFamily: F.mono, color: meta.ring }}>
            {ready ? "Ready" : `${pct}%`}
          </span>
        </div>
      )}
      {ready && !compact && (
        <div style={{
          position: "absolute", top: 3, right: 3,
          width: 16, height: 16, borderRadius: "50%",
          background: "rgba(255,255,255,.95)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9,
          boxShadow: "0 1px 3px rgba(38,50,30,.2)",
        }}>🧺</div>
      )}
    </div>
  );
}
