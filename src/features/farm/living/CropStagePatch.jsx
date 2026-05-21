import React from "react";

function stageMeta(stage) {
  if (stage === "ready") {
    return {
      label: "Ready",
      bg: "rgba(216,188,138,.38)",
      fill: "rgba(214,101,49,.50)",
      border: "1px solid rgba(207,101,48,.42)",
      texture: "radial-gradient(circle at 22px 20px, rgba(218,96,43,.88) 0 6px, transparent 7px), radial-gradient(circle at 28px 22px, rgba(68,122,48,.55) 0 10px, transparent 11px), radial-gradient(circle at 13px 24px, rgba(83,138,55,.34) 0 8px, transparent 9px)",
      textureSize: "58px 48px",
    };
  }
  if (stage === "growing") {
    return {
      label: "Growing",
      bg: "rgba(218,192,142,.36)",
      fill: "rgba(103,145,76,.48)",
      border: "1px solid rgba(77,126,54,.25)",
      texture: "radial-gradient(circle at 18px 18px, rgba(63,124,47,.62) 0 10px, transparent 11px), radial-gradient(circle at 33px 20px, rgba(91,151,62,.36) 0 8px, transparent 9px)",
      textureSize: "42px 38px",
    };
  }
  return {
    label: "Just planted",
    bg: "rgba(220,193,142,.34)",
    fill: "rgba(153,113,66,.30)",
    border: "1px solid rgba(139,103,63,.22)",
    texture: "radial-gradient(circle at 22px 21px, rgba(126,157,78,.50) 0 4px, transparent 5px), radial-gradient(circle at 26px 18px, rgba(80,122,55,.34) 0 3px, transparent 4px)",
    textureSize: "38px 35px",
  };
}

function shortVariety(variety) {
  if (!variety) return "";
  return variety.length > 14 ? variety.slice(0, 13) + "…" : variety;
}

export default function CropStagePatch({
  patch,
  compact = false,
  showText = true,
  interactive = false,
  selected = false,
  onClick,
}) {
  const meta = stageMeta(patch.stage, patch.cc);
  const progress = Math.max(0, Math.min(100, (patch.growthPct || 0) * 100));
  const visualProgress = patch.stage === "ready"
    ? Math.max(progress, 86)
    : patch.stage === "growing"
      ? Math.max(progress, 34)
      : Math.max(progress, 14);
  const labelSize = compact ? 8 : 11;
  const variety = shortVariety(patch.variety);

  return (
    <div
      data-crop-patch="true"
      onClick={interactive ? onClick : undefined}
      style={{
        position: "absolute",
        left: `${(patch.px * 100).toFixed(1)}%`,
        top: `${(patch.py * 100).toFixed(1)}%`,
        width: `${(patch.pw * 100).toFixed(1)}%`,
        height: `${(patch.ph * 100).toFixed(1)}%`,
        background: meta.bg,
        border: selected ? "1px solid rgba(255,255,255,.92)" : meta.border,
        borderRadius: compact ? 6 : 12,
        overflow: "hidden",
        pointerEvents: interactive ? "auto" : "none",
        zIndex: 5,
        cursor: interactive ? "pointer" : "default",
        boxShadow: selected
          ? "0 0 0 2px rgba(255,255,255,.92), 0 0 0 5px rgba(40,88,58,.28), 0 8px 18px rgba(38,50,30,.18)"
          : patch.stage === "ready"
            ? "0 0 10px rgba(207,101,48,.20)"
            : "inset 0 1px rgba(255,255,255,.14)",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: `${Math.min(100, visualProgress).toFixed(0)}%`,
          background: meta.fill,
          borderRadius: "inherit",
          overflow: "hidden",
          transition: "height .35s ease",
        }}
      >
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage: meta.texture,
          backgroundSize: meta.textureSize,
          opacity: compact ? 0.62 : 0.8,
        }}/>
      </div>
      <div
        style={{
          position: "absolute",
          top: compact ? 4 : 7,
          left: compact ? 4 : 7,
          zIndex: 6,
          padding: compact ? "2px 5px" : "3px 7px",
          borderRadius: 999,
          background: "rgba(255,255,255,.70)",
          color: "rgba(38,51,38,.88)",
          fontSize: compact ? 8 : 10,
          fontWeight: 850,
          lineHeight: 1,
          boxShadow: "0 2px 6px rgba(38,50,30,.08)",
        }}
      >
        {progress.toFixed(0)}%
      </div>
      {showText && (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          color: "#fff",
          fontSize: labelSize,
          fontWeight: 900,
          textShadow: "0 1px 5px rgba(19,30,18,.48)",
          padding: 4,
          lineHeight: 1.15,
          zIndex: 5,
          overflow: "hidden",
        }}>
          <span style={{
            maxWidth: "92%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>{patch.crop}</span>
          {variety && !compact && (
            <span style={{
              marginTop: 2,
              maxWidth: "92%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: 9,
              fontWeight: 850,
              opacity: 0.9,
            }}>{variety}</span>
          )}
        </div>
      )}
      {!compact && (
        <div style={{
          position: "absolute",
          right: 7,
          bottom: 7,
          zIndex: 6,
          padding: "3px 7px",
          borderRadius: 999,
          background: "rgba(25,35,25,.34)",
          color: "#fff",
          fontSize: 9,
          fontWeight: 850,
          lineHeight: 1,
          textShadow: "0 1px 3px rgba(0,0,0,.3)",
        }}>{meta.label}</div>
      )}
    </div>
  );
}
