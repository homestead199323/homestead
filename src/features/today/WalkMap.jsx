import React from "react";
import LivingFarmMap from "../farm/living/LivingFarmMap";

/* ═══════════════════════════════════════════
   WalkMap — guided walk view.

   Visual contract (changed 2026-05-19):
     • Background is the LivingFarmMap PNG + zone artwork (same map the
       user designs in Farm setup). Rendered at 2× viewport size inside
       a clipping viewport, then translated so the walker's logical
       position lands at viewport centre. Result: walker stays glued to
       screen centre, map pans underneath like a farm-sim camera.
     • A single cartoon persona (🚶) sits centred. The smooth pan comes
       from the inner-map's transform transition, not the walker.
     • Tapping a zone jumps the walk to that zone's first stop, if the
       zone is part of the walk.

   Removed:
     • Stop pins, route paths, plot-emoji icons, vignette, scale label,
       time-of-day gradient. These were the old "game-board" look; the
       new look is the living farm map + walker only.

   Props:
     stops             — buildWalkStops() output (used to find a stop's
                         zoneId for the walker position and tap-jump)
     currentStopIdx    — index into stops, -1 = walker at gate
     completedStopKeys — unused now (kept in signature for backwards-compat;
                         visual completion state lives in StopPopup instead)
     zones             — data.zones (unused directly — LivingFarmMap reads
                         them from `data`; kept for signature compat)
     plotIcons         — unused (kept for signature compat)
     farmW, farmH      — unused (LivingFarmMap reads from `data`; kept for
                         signature compat so we don't need to touch the
                         WalkOverlay call site)
     onStopClick       — jumpToStop(i)
     data              — NEW: full app data, required by LivingFarmMap
   ═══════════════════════════════════════════ */

const ANIM_CSS = `
@keyframes walk-bob {
  0%, 100% { transform: translate(-50%, -50%) translateY(0px) rotate(0deg); }
  25%      { transform: translate(-50%, -50%) translateY(-2px) rotate(-4deg); }
  75%      { transform: translate(-50%, -50%) translateY(-2px) rotate(4deg); }
}
.walk-walker { animation: walk-bob 1.1s ease-in-out infinite; }
`;

export default function WalkMap({ stops, currentStopIdx, data, onStopClick }) {
  const safeStops = stops || [];

  // Walker position: at the gate (0%, 50%) before first stop; otherwise
  // at the current stop's centre. cx/cy are already percentages of the
  // farm box, so we can place the walker directly with left/top %.
  const current = currentStopIdx >= 0 ? safeStops[currentStopIdx] : null;
  const walkerX = current ? current.cx : 0;
  const walkerY = current ? current.cy : 50;

  // Map zoneId -> earliest stop index in this walk, so a zone-tap can
  // jump the walker to the first task in that zone.
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

  // If `data` is missing (shouldn't happen — WalkOverlay always passes it)
  // we fall back to a plain dark background so the walk never breaks.
  if (!data || !data.zones) {
    return (
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(135deg, #2d4a36 0%, #18301f 100%)",
        borderRadius: 14, overflow: "hidden",
      }}>
        <style>{ANIM_CSS}</style>
        <Walker x={50} y={50}/>
      </div>
    );
  }

  /* Camera-follow viewport.

     We render the map at ZOOM× the viewport size, then translate it so
     that the walker's logical position (walkerX%, walkerY% of the map)
     lands at the viewport centre. The walker itself is drawn centred
     and fixed — it does NOT move on screen; the map slides underneath.

     Math:
       inner size = 100% of viewport × ZOOM
       to put logical point (wx%, wy%) of inner at viewport centre,
       translate inner by:
         tx = 50% (viewport) − wx% × ZOOM (of viewport)
         ty = 50% (viewport) − wy% × ZOOM (of viewport)
       expressed as a % of viewport:
         tx% = 50 − wx × ZOOM
         ty% = 50 − wy × ZOOM
     The transition on transform makes the pan feel smooth, like a
     camera tracking shot. */
  const ZOOM = 2;
  const tx = 50 - walkerX * ZOOM;
  const ty = 50 - walkerY * ZOOM;

  return (
    <div style={{
      position: "absolute", inset: 0,
      borderRadius: 14, overflow: "hidden",
      background: "#1a3d2e",
    }}>
      <style>{ANIM_CSS}</style>

      {/* Inner: ZOOM× viewport size, panned so walker sits dead-centre. */}
      <div style={{
        position: "absolute",
        left: 0, top: 0,
        width: (ZOOM * 100) + "%",
        height: (ZOOM * 100) + "%",
        transform: "translate(" + tx + "%, " + ty + "%)",
        transition: "transform 0.95s cubic-bezier(.4,.0,.2,1)",
        willChange: "transform",
      }}>
        <LivingFarmMap
          data={data}
          fitMode="fill"
          showTimeTint={false}
          showEditButton={false}
          showHelperText={false}
          showCropPatches={false}
          interactive={false}
          onZoneClick={handleZoneClick}
        />
        {/* Walker is positioned on the INNER map (in inner-map %), so it
            stays glued to its logical spot. Because the inner is translated
            to put that spot at viewport centre, the walker appears centred. */}
        <Walker x={walkerX} y={walkerY}/>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Walker — cartoon persona that bobs and slides
   between stops via CSS transition.
   ───────────────────────────────────────────── */
function Walker({ x, y }) {
  return (
    <div className="walk-walker"
         style={{
           position: "absolute",
           left: x + "%",
           top: y + "%",
           width: 38, height: 38,
           transformOrigin: "center",
           zIndex: 30,
           pointerEvents: "none",
         }}>
      {/* Soft halo so the persona reads on any zone artwork */}
      <div style={{
        position: "absolute", inset: 0,
        borderRadius: "50%",
        background: "radial-gradient(circle at center, rgba(127,201,127,.55) 0%, rgba(127,201,127,0) 70%)",
      }} />
      {/* Persona token */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        width: 26, height: 26,
        marginLeft: -13, marginTop: -13,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #ffffff 0%, #e8f5e9 100%)",
        border: "2px solid #4caf50",
        boxShadow: "0 2px 8px rgba(0,0,0,.4)",
        fontSize: 15,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>🚶</div>
    </div>
  );
}
