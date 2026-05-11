import { ZT_MAP } from "../../data/zones";

/* ═══════════════════════════════════════════
   WalkMap — animated SVG farm map for the guided walk.

   Renders:
     • all configured zones as soft-fill rectangles
     • planted crop emojis inside zones (one per active plot)
     • stop markers (past/current/future) with visual state
     • dashed future-path trail behind the walker
     • a walker character that slides between stops via CSS transition

   The container now fills its parent's height (no aspect-ratio cap) so
   the map area uses whatever flex space the overlay gives it. The SVG
   inside uses preserveAspectRatio="none" — zones get stretched to fill
   for a fuller game feel, accuracy is a non-goal here.

   Props:
     stops             — buildWalkStops() output
     currentStopIdx    — index into stops, -1 means walker still at gate
     completedStopKeys — Set of stopKeys fully done
     zones             — data.zones (drawn beneath)
     plotIcons         — [{ id, zoneId, emoji, px, py }] active plots
     farmW, farmH      — farm dimensions in meters (defaults: 100, 60)
   ═══════════════════════════════════════════ */

const ANIM_CSS = `
@keyframes walk-pulse-ring {
  0%   { box-shadow: 0 0 0 0 rgba(127,201,127,.55), 0 2px 8px rgba(0,0,0,.4); }
  70%  { box-shadow: 0 0 0 18px rgba(127,201,127,0),  0 2px 8px rgba(0,0,0,.4); }
  100% { box-shadow: 0 0 0 0 rgba(127,201,127,0),    0 2px 8px rgba(0,0,0,.4); }
}
@keyframes walk-bob {
  0%, 100% { transform: translate(-50%, -50%) translateY(0px) rotate(0deg); }
  25%      { transform: translate(-50%, -50%) translateY(-2px) rotate(-4deg); }
  75%      { transform: translate(-50%, -50%) translateY(-2px) rotate(4deg); }
}
@keyframes walk-trail-fade {
  0%   { opacity: 0.15; stroke-dashoffset: 0; }
  100% { opacity: 0.55; stroke-dashoffset: -8; }
}
@keyframes walk-sparkle {
  0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
  50%      { opacity: 1;   transform: translate(-50%, -50%) scale(1.25); }
}
@keyframes walk-leaf-sway {
  0%, 100% { transform: translate(-50%, -50%) rotate(-3deg); }
  50%      { transform: translate(-50%, -50%) rotate(3deg); }
}
.walk-walker      { animation: walk-bob 1.1s ease-in-out infinite; }
.walk-current-pulse { animation: walk-pulse-ring 1.8s ease-out infinite; }
.walk-trail       { animation: walk-trail-fade 1.2s linear infinite; }
.walk-plot-leaf   { animation: walk-leaf-sway 3.2s ease-in-out infinite; }
.walk-sparkle     { animation: walk-sparkle 1.6s ease-in-out infinite; }
`;

// Soft time-of-day tint over the map: morning warm, midday neutral, evening cool, night dim.
function timeOfDayGradient() {
  const h = new Date().getHours();
  if (h < 6 || h >= 20) return "linear-gradient(135deg, #1a2e22 0%, #0a160e 100%)";          // night
  if (h < 9)            return "linear-gradient(135deg, #3a4a2e 0%, #1f2a1a 100%)";          // dawn warm
  if (h < 17)           return "linear-gradient(135deg, #2d4a36 0%, #18301f 100%)";          // day
  return                       "linear-gradient(135deg, #3a3a2e 0%, #1e1d14 100%)";          // dusk warm
}

export default function WalkMap({ stops, currentStopIdx, completedStopKeys, zones, plotIcons, farmW, farmH }) {
  const W = farmW || 100;
  const H = farmH || 60;
  const safeStops = stops || [];
  const safePlots = plotIcons || [];
  const safeZones = zones || [];
  const completed = completedStopKeys || new Set();

  // Walker position: gate (0, 50) before first stop, else the current stop's center.
  const current = currentStopIdx >= 0 ? safeStops[currentStopIdx] : null;
  const walkerX = current ? current.cx : 0;
  const walkerY = current ? current.cy : 50;
  const currentZoneId = current ? current.zoneId : null;

  // Build lookups for plot rendering — plot lives within a zone, position
  // is computed by combining zone xM/yM + per-plot px/py percentage.
  const zoneById = new Map();
  safeZones.forEach(function(z) { zoneById.set(z.id, z); });

  // Future path: from walker forward to remaining stops (dashed trail).
  const futurePath = [];
  if (currentStopIdx < safeStops.length - 1) {
    let prevX = walkerX, prevY = walkerY;
    for (let i = Math.max(0, currentStopIdx + 1); i < safeStops.length; i++) {
      const s = safeStops[i];
      futurePath.push({ x1: prevX, y1: prevY, x2: s.cx, y2: s.cy });
      prevX = s.cx; prevY = s.cy;
    }
  }

  return (
    <div style={{
      position: "absolute",
      inset: 0,
      background: timeOfDayGradient(),
      borderRadius: 14,
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,.08)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,.04), 0 4px 16px rgba(0,0,0,.25)",
    }}>
      <style>{ANIM_CSS}</style>

      {/* ── SVG: zones + future path ── */}
      <svg viewBox={"0 0 " + W + " " + H}
           preserveAspectRatio="none"
           style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}>
        <defs>
          <pattern id="walk-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="0.2" />
          </pattern>
          <radialGradient id="walk-vignette" cx="50%" cy="50%" r="70%">
            <stop offset="60%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.45)" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width={W} height={H} fill="url(#walk-grid)" />

        {safeZones.map(function(z) {
          const zt = ZT_MAP.get(z.type);
          const fill = zt ? zt.fill : "#52b788";
          const isCurrent = z.id === currentZoneId;
          return (
            <rect key={z.id}
                  x={z.xM || 0} y={z.yM || 0}
                  width={z.wM || 10} height={z.hM || 8}
                  fill={fill}
                  opacity={isCurrent ? 0.6 : 0.28}
                  stroke={isCurrent ? "#fff" : "rgba(255,255,255,.18)"}
                  strokeWidth={isCurrent ? 0.4 : 0.15}
                  rx="0.6" />
          );
        })}

        {/* Vignette overlay for game-like depth */}
        <rect x="0" y="0" width={W} height={H} fill="url(#walk-vignette)" pointerEvents="none" />

        {/* Future path */}
        {futurePath.map(function(seg, i) {
          const x1 = seg.x1 / 100 * W;
          const y1 = seg.y1 / 100 * H;
          const x2 = seg.x2 / 100 * W;
          const y2 = seg.y2 / 100 * H;
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="rgba(127,201,127,.5)"
                  strokeWidth="0.45"
                  strokeDasharray="1.5 1.5"
                  className="walk-trail" />
          );
        })}
      </svg>

      {/* ── Plot icons inside zones — game-like sense of "there's stuff there" ── */}
      {safePlots.map(function(p) {
        const zone = zoneById.get(p.zoneId);
        if (!zone) return null;
        const cxPct = ((zone.xM || 0) + (zone.wM || 10) * (p.px || 50) / 100) / W * 100;
        const cyPct = ((zone.yM || 0) + (zone.hM || 8) * (p.py || 50) / 100) / H * 100;
        return (
          <div key={p.id}
               className="walk-plot-leaf"
               style={{
                 position: "absolute",
                 left: cxPct + "%",
                 top: cyPct + "%",
                 fontSize: 16,
                 filter: "drop-shadow(0 1px 2px rgba(0,0,0,.5))",
                 pointerEvents: "none",
                 zIndex: 2,
                 transformOrigin: "center",
               }}>
            {p.emoji}
          </div>
        );
      })}

      {/* ── Stop markers ── current = pulsing ring + emoji, past = check, future = small dot ── */}
      {safeStops.map(function(s, i) {
        const isCurrent = i === currentStopIdx;
        const isPast = i < currentStopIdx;
        const isDoneStop = completed.has(s.stopKey);

        const baseSize = isCurrent ? 36 : isPast ? 22 : 24;
        const bg = isCurrent
          ? "#7fc97f"
          : (isPast || isDoneStop)
            ? "rgba(127,201,127,.7)"
            : "rgba(255,255,255,.22)";
        const border = isCurrent
          ? "3px solid #fff"
          : (isPast || isDoneStop)
            ? "1px solid rgba(255,255,255,.6)"
            : "1px solid rgba(255,255,255,.4)";
        const content = isCurrent
          ? (s.icon || s.tasks[0]?.emoji || "📍")
          : (isPast || isDoneStop)
            ? "✓"
            : "•";

        return (
          <div key={s.stopKey}
               className={isCurrent ? "walk-current-pulse" : ""}
               style={{
                 position: "absolute",
                 left: s.cx + "%",
                 top: s.cy + "%",
                 width: baseSize,
                 height: baseSize,
                 marginLeft: -baseSize / 2,
                 marginTop: -baseSize / 2,
                 borderRadius: "50%",
                 background: bg,
                 border: border,
                 display: "flex",
                 alignItems: "center",
                 justifyContent: "center",
                 fontSize: isCurrent ? 18 : 11,
                 color: isCurrent ? "#0f2418" : "#fff",
                 fontWeight: 700,
                 zIndex: isCurrent ? 4 : 3,
                 transition: "all 0.4s ease",
               }}>
            {content}
          </div>
        );
      })}

      {/* ── Walker character — bigger, brighter, with bob animation ── */}
      <div className="walk-walker"
           style={{
             position: "absolute",
             left: walkerX + "%",
             top: walkerY + "%",
             width: 34, height: 34,
             marginLeft: 0, marginTop: 0,
             transformOrigin: "center",
             transition: "left 0.95s cubic-bezier(.4,.0,.2,1), top 0.95s cubic-bezier(.4,.0,.2,1)",
             zIndex: 6,
             pointerEvents: "none",
           }}>
        <div style={{
          position: "absolute", inset: 0,
          borderRadius: "50%",
          background: "radial-gradient(circle at center, rgba(127,201,127,.45) 0%, rgba(127,201,127,0) 70%)",
        }} />
        <div style={{
          position: "absolute",
          left: "50%", top: "50%",
          width: 22, height: 22,
          marginLeft: -11, marginTop: -11,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #ffffff 0%, #e8f5e9 100%)",
          border: "2px solid #4caf50",
          boxShadow: "0 2px 6px rgba(0,0,0,.4)",
          fontSize: 12,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>🚶</div>
      </div>

      {/* ── Scale hint, top-left ── */}
      <div style={{
        position: "absolute", top: 8, left: 12,
        fontSize: 9, color: "rgba(255,255,255,.45)",
        letterSpacing: ".08em", textTransform: "uppercase",
        fontWeight: 600,
        pointerEvents: "none",
        background: "rgba(0,0,0,.25)",
        padding: "2px 6px",
        borderRadius: 4,
      }}>
        {W}m × {H}m
      </div>
    </div>
  );
}
