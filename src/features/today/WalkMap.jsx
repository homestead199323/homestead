import React from "react";
import LivingFarmMap from "../farm/living/LivingFarmMap";

/* ═══════════════════════════════════════════
   WalkMap — guided walk map view.

   DESIGN CONTRACT (locked — do not add zoom, pan, camera-follow, or scroll):
     • The entire farm is always visible. No scrolling. No panning.
     • LivingFarmMap renders in fitMode="aspect" so the whole farm fits
       inside the container with its real proportions preserved.
     • The walker (🚶) is positioned as a percentage of the map container,
       matching the stop's cx/cy coordinates exactly.
     • No camera-follow, no 2× inner map, no translate tricks.
     • Mobile-first: the container is 100% wide, height is controlled by
       the parent (WalkOverlay). No overflow.

   Props:
     stops             — buildWalkStops() output
     currentStopIdx    — index into stops (-1 = gate / start)
     data              — full app state (passed to LivingFarmMap)
     onStopClick       — called with stop index when user taps a zone
   ═══════════════════════════════════════════ */

const WALKER_CSS = `
@keyframes walk-bob {
  0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
  50%       { transform: translate(-50%, -50%) translateY(-3px); }
}
.walk-walker-token { animation: walk-bob 1.2s ease-in-out infinite; }
`;

export default function WalkMap({ stops, currentStopIdx, data, onStopClick }) {
  const safeStops = stops || [];

  // Walker sits at the current stop's cx/cy (percent of farm box).
  // Before the first stop, park it near the bottom-left (gate).
  const current = currentStopIdx >= 0 ? safeStops[currentStopIdx] : null;
  const walkerX = current ? current.cx : 5;
  const walkerY = current ? current.cy : 90;

  // Zone tap → jump to first stop in that zone
  const zoneToStopIdx = new Map();
  for (let i = 0; i < safeStops.length; i++) {
    const zid = safeStops[i].zoneId;
    if (zid && !zoneToStopIdx.has(zid)) zoneToStopIdx.set(zid, i);
  }
  function handleZoneClick(zone) {
    if (!onStopClick) return;
    const idx = zoneToStopIdx.get(zone.id);
    if (idx !== undefined && idx !== currentStopIdx) onStopClick(idx);
  }

  if (!data || !data.zones) {
    return (
      <div style={{ position: "absolute", inset: 0, background: "#1a3d2e", borderRadius: 14 }}>
        <style>{WALKER_CSS}</style>
        <WalkerToken x={50} y={50} />
      </div>
    );
  }

  return (
    /* Outer container fills the space given by WalkOverlay.
       overflow:hidden ensures nothing bleeds out. */
    <div style={{
      position: "absolute",
      inset: 0,
      borderRadius: 14,
      overflow: "hidden",
      background: "#1a3d2e",
    }}>
      <style>{WALKER_CSS}</style>

      {/* Farm map — full farm, no scrolling, no zoom */}
      <LivingFarmMap
        data={data}
        fitMode="aspect"
        showTimeTint={false}
        showEditButton={false}
        showHelperText={false}
        showCropPatches={false}
        interactive={false}
        noBorder={true}
        onZoneClick={handleZoneClick}
      />

      {/* Walker overlaid on top, positioned as % of container */}
      <WalkerToken x={walkerX} y={walkerY} />
    </div>
  );
}

function WalkerToken({ x, y }) {
  return (
    <div
      className="walk-walker-token"
      style={{
        position: "absolute",
        left: x + "%",
        top: y + "%",
        // transition so the walker slides smoothly between stops
        transition: "left 0.7s cubic-bezier(.4,0,.2,1), top 0.7s cubic-bezier(.4,0,.2,1)",
        zIndex: 20,
        pointerEvents: "none",
      }}
    >
      {/* Glow halo */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        transform: "translate(-50%, -50%)",
        width: 44, height: 44,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(127,201,127,.5) 0%, transparent 70%)",
      }} />
      {/* Token */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        transform: "translate(-50%, -50%)",
        width: 28, height: 28,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #fff 0%, #e8f5e9 100%)",
        border: "2.5px solid #4caf50",
        boxShadow: "0 2px 10px rgba(0,0,0,.45)",
        fontSize: 16,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>🚶</div>
    </div>
  );
}
