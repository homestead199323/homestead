import React, { useMemo } from "react";
import GroveScene from "../grove/GroveScene";
import { makeProjector } from "../grove/sceneMath";

/*
   WalkMap — guided walk map view (Grove edition).

   Renders the SAME isometric GroveScene as the home screen — one map
   engine everywhere. The scene keeps its natural aspect ratio and is
   letterboxed inside the fill container (CSS aspect-ratio transfer).

   Walker token: stops carry cx/cy as percent of farm meters (top-down).
   We convert percent → meters → iso projection → percent of the scene
   box, so the walker stands exactly on the projected ground point.
*/

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

  const fW = (data && data.farmW) || 100;
  const fH = (data && data.farmH) || 60;
  const PROJ = useMemo(function() { return makeProjector(fW, fH); }, [fW, fH]);

  /* stop cx/cy (% of farm meters) → iso scene percent */
  function stopPct(cx, cy) {
    const pt = PROJ.p((cx / 100) * fW, (cy / 100) * fH, 6);
    return { left: (pt[0] / PROJ.vbW) * 100, top: (pt[1] / PROJ.vbH) * 100 };
  }
  const walkerPos = current ? stopPct(current.cx, current.cy) : stopPct(0, 50);

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

  /* Letterbox: outer fills, inner keeps the scene's aspect ratio.
     width:100% + maxHeight:100% + aspect-ratio → CSS transferred sizing. */
  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden", borderRadius: 12,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <style>{WALKER_CSS}</style>
      <div style={{
        position: "relative",
        width: "100%", maxHeight: "100%",
        aspectRatio: PROJ.vbW + " / " + PROJ.vbH,
      }}>
        <GroveScene
          data={data}
          interactive={false}
          showEditButton={false}
          showHelperText={false}
          showTimeTint={false}
          noBorder={true}
          onZoneClick={handleZoneClick}
        />
        <WalkerToken x={walkerPos.left} y={walkerPos.top} />
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
      <div style={{ position:"absolute", left:"50%", top:"50%", transform:"translate(-50%,-50%)", width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg,#fff 0%,#e8f5e9 100%)", border:"2.5px solid #4caf50", boxShadow:"0 2px 10px rgba(0,0,0,.45)", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>🚶</div>
    </div>
  );
}
