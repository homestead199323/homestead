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
@keyframes walk-popup-in {
  from { opacity: 0; }
  to   { opacity: 1; }
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

export default function WalkMap({ stops, currentStopIdx, completedStopKeys, zones, plotIcons, farmW, farmH, onStopClick }) {
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

  // ── Continuous walk path ─────────────────────────────────────────────────
  // The route from the gate (0, 50) through every stop, in order. Drawn as
  // ONE smooth path with quadratic-Bezier corners (rather than separate
  // line segments), so it reads as a single continuous walking route.
  // Past portion = solid; future portion = dashed/faded — drawn from two
  // <path> elements that share a common waypoint at the walker.
  const waypoints = [{ x: 0, y: 50 }];
  for (let i = 0; i < safeStops.length; i++) {
    waypoints.push({ x: safeStops[i].cx, y: safeStops[i].cy });
  }
  // Convert all to viewBox coords (path is rendered inside the SVG)
  const wpts = waypoints.map(function(w) { return { x: w.x / 100 * W, y: w.y / 100 * H }; });

  function buildSmoothD(points) {
    if (points.length < 2) return "";
    let d = "M " + points[0].x.toFixed(2) + " " + points[0].y.toFixed(2);
    if (points.length === 2) {
      d += " L " + points[1].x.toFixed(2) + " " + points[1].y.toFixed(2);
      return d;
    }
    // Smooth corners: for each interior point, draw a quadratic curve to
    // the midpoint of the segment to the next point, using the interior
    // point itself as the control. This rounds the route's corners.
    for (let i = 1; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const mx = (curr.x + next.x) / 2;
      const my = (curr.y + next.y) / 2;
      d += " Q " + curr.x.toFixed(2) + " " + curr.y.toFixed(2) + " " + mx.toFixed(2) + " " + my.toFixed(2);
    }
    const last = points[points.length - 1];
    d += " L " + last.x.toFixed(2) + " " + last.y.toFixed(2);
    return d;
  }

  // walker index in wpts: -1 -> gate (idx 0), 0 -> first stop (idx 1), etc.
  const splitIdx = Math.max(0, currentStopIdx + 1);
  const pastPts = wpts.slice(0, splitIdx + 1);
  const futurePts = wpts.slice(splitIdx);
  const pastPathD = pastPts.length >= 2 ? buildSmoothD(pastPts) : "";
  const futurePathD = futurePts.length >= 2 ? buildSmoothD(futurePts) : "";

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

      {/* ── SVG: zones + walk path ── */}
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

        {/* Past route — solid green, behind future trail */}
        {pastPathD && (
          <path d={pastPathD}
                stroke="rgba(127,201,127,.7)"
                strokeWidth="0.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none" />
        )}

        {/* Future route — single dashed path; animates as one piece */}
        {futurePathD && (
          <path d={futurePathD}
                stroke="rgba(127,201,127,.45)"
                strokeWidth="0.5"
                strokeDasharray="1.5 1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                className="walk-trail" />
        )}
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

      {/* ── Stop markers — tappable; current = pulsing ring, past = check, future = emoji ── */}
      {safeStops.map(function(s, i) {
        const isCurrent = i === currentStopIdx;
        const isPast = i < currentStopIdx;
        const isDoneStop = completed.has(s.stopKey);
        const stopEmoji = (s.tasks && s.tasks[0] && s.tasks[0].emoji) || s.icon || "📍";

        const baseSize = isCurrent ? 38 : isPast ? 22 : 28;
        const bg = isCurrent
          ? "#7fc97f"
          : (isPast || isDoneStop)
            ? "rgba(127,201,127,.7)"
            : "rgba(15, 36, 24, 0.92)";
        const border = isCurrent
          ? "3px solid #fff"
          : (isPast || isDoneStop)
            ? "1px solid rgba(255,255,255,.6)"
            : "1.5px solid rgba(127,201,127,.5)";
        const content = isCurrent
          ? stopEmoji
          : (isPast || isDoneStop)
            ? "✓"
            : stopEmoji;

        const stopBoxShadow = isCurrent
          ? "none"
          : (isPast || isDoneStop)
            ? "0 1px 4px rgba(0,0,0,.5)"
            : "0 2px 8px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.08)";

        return (
          <div key={s.stopKey}
               className={isCurrent ? "walk-current-pulse" : ""}
               onClick={onStopClick ? function() { onStopClick(i); } : undefined}
               role={onStopClick ? "button" : undefined}
               aria-label={onStopClick ? ("Jump to " + (s.label || "stop")) : undefined}
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
                 fontSize: isCurrent ? 20 : (isPast || isDoneStop) ? 11 : 15,
                 color: (isCurrent ? "#0f2418" : "#fff"),
                 fontWeight: 700,
                 zIndex: isCurrent ? 4 : 3,
                 transition: "all 0.3s ease",
                 cursor: onStopClick ? "pointer" : "default",
                 boxShadow: stopBoxShadow,
                 WebkitTapHighlightColor: "transparent",
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
