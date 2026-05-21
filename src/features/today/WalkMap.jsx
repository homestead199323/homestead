import React from "react";
import LivingFarmMap from "../farm/living/LivingFarmMap";

/* ═════════════════════════════════════════════
   WalkMap — guided walk map view.

   DESIGN CONTRACT (immutable — do not change):
     • The entire farm ALWAYS fits on screen. Zero scroll. Zero pan. Zero zoom.
     • map box = object-fit:contain via CSS aspectRatio + flex centering.
     • LivingFarmMap fills the box with fitMode="fill".
     • Walker token is absolutely positioned inside the box at cx/cy%.
   ═════════════════════════════════════════════ */

const WALKER_CSS = `
@keyframes walk-bob {
  0%, 100% { transform: translate(-50%,-50%) translateY(0px); }
  50%       { transform: translate(-50%,-50%) translateY(-3px); }
}
.walk-walker-token { animation: walk-bob 1.2s ease-in-out infinite; }
`;

export default function WalkMap({ stops, currentStopIdx, data, onStopClick }) {
  const safeStops = stops || [];
  const current = currentStopIdx >= 0 ? safeStops[currentStopIdx] : null;
  const walkerX = current ? current.cx : 5;
  const walkerY = current ? current.cy : 90;

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

  if (!data || !data.zones || data.zones.length === 0) {
    return (
      <div style={{ position:"absolute", inset:0, background:"#1a3d2e", borderRadius:14 }}>
        <style>{WALKER_CSS}</style>
        <WalkerToken x={50} y={50} />
      </div>
    );
  }

  const fW = data.farmW || 100;
  const fH = data.farmH || 60;

  return (
    <div style={{
      position: "absolute",
      inset: 0,
      overflow: "hidden",
      background: "#1a3d2e",
      borderRadius: 14,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <style>{WALKER_CSS}</style>
      <div style={{
        position: "relative",
        width: "100%",
        maxHeight: "100%",
        aspectRatio: `${fW} / ${fH}`,
        overflow: "hidden",
        borderRadius: 12,
        flexShrink: 0,
      }}>
        <LivingFarmMap
          data={data}
          fitMode="fill"
          showTimeTint={false}
          showEditButton={false}
          showHelperText={false}
          showCropPatches={false}
          interactive={false}
          noBorder={true}
          onZoneClick={handleZoneClick}
        />
        <WalkerToken x={walkerX} y={walkerY} />
      </div>
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
        transition: "left 0.7s cubic-bezier(.4,0,.2,1), top 0.7s cubic-bezier(.4,0,.2,1)",
        zIndex: 20,
        pointerEvents: "none",
      }}
    >
      <div style={{ position:"absolute", left:"50%", top:"50%", transform:"translate(-50%,-50%)", width:44, height:44, borderRadius:"50%", background:"radial-gradient(circle, rgba(127,201,127,.5) 0%, transparent 70%)" }} />
      <div style={{ position:"absolute", left:"50%", top:"50%", transform:"translate(-50%,-50%)", width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg,#fff 0%,#e8f5e9 100%)", border:"2.5px solid #4caf50", boxShadow:"0 2px 10px rgba(0,0,0,.45)", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>&#x1F6B6;</div>
    </div>
  );
}
