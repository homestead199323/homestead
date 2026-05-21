import React from "react";

function stageColors(stage, cc) {
  if (stage === "ready") {
    return {
      bg: "rgba(119,142,57,.44)",
      pattern: "radial-gradient(circle at 18px 16px, rgba(205,98,50,.78) 0 6px, transparent 7px), radial-gradient(circle at 23px 18px, rgba(65,117,43,.58) 0 9px, transparent 10px)",
      border: "1px solid rgba(207,101,48,.4)",
      bar: "rgba(207,101,48,.9)",
    };
  }
  if (stage === "growing") {
    return {
      bg: `rgba(${cc.r},${cc.g},${cc.b},.36)`,
      pattern: "radial-gradient(circle at 17px 16px, rgba(80,130,48,.58) 0 10px, transparent 11px)",
      border: "1px solid rgba(77,126,54,.25)",
      bar: `rgba(${cc.r},${cc.g},${cc.b},.9)`,
    };
  }
  return {
    bg: "rgba(122,87,47,.30)",
    pattern: "radial-gradient(circle at 20px 19px, rgba(128,158,73,.42) 0 4px, transparent 5px)",
    border: "1px solid rgba(139,103,63,.22)",
    bar: "rgba(139,103,63,.82)",
  };
}

export default function CropStagePatch({ patch, compact = false, showText = true }) {
  const colors = stageColors(patch.stage, patch.cc);
  const progress = Math.max(0, Math.min(100, (patch.growthPct || 0) * 100));
  return (
    <div
      data-crop-patch="true"
      style={{
        position: "absolute",
        left: `${(patch.px * 100).toFixed(1)}%`,
        top: `${(patch.py * 100).toFixed(1)}%`,
        width: `${(patch.pw * 100).toFixed(1)}%`,
        height: `${(patch.ph * 100).toFixed(1)}%`,
        background: colors.bg,
        border: colors.border,
        borderRadius: compact ? 5 : 9,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 5,
        boxShadow: patch.stage === "ready" ? "0 0 10px rgba(207,101,48,.20)" : "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: colors.pattern,
          backgroundSize: patch.stage === "ready" ? "52px 44px" : patch.stage === "growing" ? "34px 31px" : "36px 34px",
          opacity: compact ? 0.6 : 0.82,
        }}
      />
      {showText && (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          color: "#fff",
          fontSize: compact ? 8 : 10,
          fontWeight: 900,
          textShadow: "0 1px 3px rgba(0,0,0,.42)",
          padding: 4,
          lineHeight: 1.15,
        }}>
          <span>{patch.pctLabel}%</span>
        </div>
      )}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: compact ? 2 : 3, background: "rgba(0,0,0,.13)" }}>
        <div style={{ height: "100%", width: `${progress.toFixed(0)}%`, background: colors.bar }}/>
      </div>
    </div>
  );
}
