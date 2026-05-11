import { ZT_MAP } from "../../data/zones";

/* ═══════════════════════════════════════════
   WalkMap — animated SVG farm map for the guided walk.

   Renders:
     • all configured zones as soft-fill rectangles
     • a stop marker for each computed walk stop (past/current/future)
     • the path the walker will trace, as a dashed line behind the dot
     • a walker dot that slides between stops using CSS transition

   Walker animation:
     The walker is an absolutely-positioned HTML div over the SVG. CSS
     transitions on `left`/`top` percentages move it smoothly when the
     `currentStopIdx` changes. Inside-SVG transforms have flaky support
     across mobile browsers — HTML overlay is the safe path.

   Props:
     stops             — buildWalkStops() output
     currentStopIdx    — index into stops, -1 means walker still at gate
     completedStopKeys — Set of stopKeys fully done
     zones             — data.zones (drawn beneath)
     farmW, farmH      — farm dimensions in meters (defaults: 100, 60)
   ═══════════════════════════════════════════ */

const ANIM_CSS = `
@keyframes walk-pulse {
  0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  50%      { opacity: 0.85; transform: translate(-50%, -50%) scale(1.18); }
}
@keyframes walk-bob {
  0%, 100% { transform: translate(-50%, -50%) translateY(0px) rotate(0deg); }
  25%      { transform: translate(-50%, -50%) translateY(-1.5px) rotate(-3deg); }
  75%      { transform: translate(-50%, -50%) translateY(-1.5px) rotate(3deg); }
}
@keyframes walk-trail-fade {
  0% { opacity: 0; stroke-dashoffset: 0; }
  100% { opacity: 0.4; stroke-dashoffset: -8; }
}
.walk-walker {
  animation: walk-bob 1.1s ease-in-out infinite;
}
.walk-current-ring {
  animation: walk-pulse 1.6s ease-in-out infinite;
}
.walk-trail {
  animation: walk-trail-fade 1.2s linear infinite;
}
`;

export default function WalkMap({ stops, currentStopIdx, completedStopKeys, zones, farmW, farmH }) {
  const W = farmW || 100;
  const H = farmH || 60;
  const aspect = W / H;
  const safeStops = stops || [];
  const completed = completedStopKeys || new Set();

  // Walker position: gate (0, 50) before first stop, else the current stop's center
  const current = currentStopIdx >= 0 ? safeStops[currentStopIdx] : null;
  const walkerX = current ? current.cx : 0;
  const walkerY = current ? current.cy : 50;
  const currentZoneId = current ? current.zoneId : null;

  // Path from current stop forward (the part still to walk).
  // Drawn as a faint dashed line so the user sees the route ahead.
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
      position: "relative",
      width: "100%",
      aspectRatio: aspect,
      maxHeight: 220,
      background: "linear-gradient(135deg, #243d2e 0%, #14241a 100%)",
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
        </defs>
        <rect x="0" y="0" width={W} height={H} fill="url(#walk-grid)" />

        {(zones || []).map(function(z) {
          const zt = ZT_MAP.get(z.type);
          const fill = zt ? zt.fill : "#52b788";
          const isCurrent = z.id === currentZoneId;
          return (
            <rect key={z.id}
                  x={z.xM || 0} y={z.yM || 0}
                  width={z.wM || 10} height={z.hM || 8}
                  fill={fill}
                  opacity={isCurrent ? 0.55 : 0.22}
                  stroke={isCurrent ? "#fff" : "rgba(255,255,255,.15)"}
                  strokeWidth={isCurrent ? 0.4 : 0.15}
                  rx="0.6" />
          );
        })}

        {/* Future path: from walker to remaining stops */}
        {futurePath.map(function(seg, i) {
          // Convert percent coords to viewBox coords
          const x1 = seg.x1 / 100 * W;
          const y1 = seg.y1 / 100 * H;
          const x2 = seg.x2 / 100 * W;
          const y2 = seg.y2 / 100 * H;
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="rgba(255,255,255,.35)"
                  strokeWidth="0.4"
                  strokeDasharray="1.5 1.5"
                  className="walk-trail" />
          );
        })}
      </svg>

      {/* ── HTML markers (easier to size/animate than SVG text) ── */}
      {safeStops.map(function(s, i) {
        const isCurrent = i === currentStopIdx;
        const isPast = i < currentStopIdx;
        const isDoneStop = completed.has(s.stopKey);

        // Marker visual: current = pulsing ring + emoji, past = small check, future = dot
        const baseSize = isCurrent ? 30 : isPast ? 20 : 22;
        const bg = isCurrent
          ? "#7fc97f"
          : (isPast || isDoneStop)
            ? "rgba(127,201,127,.65)"
            : "rgba(255,255,255,.18)";
        const border = isCurrent
          ? "2px solid #fff"
          : (isPast || isDoneStop)
            ? "1px solid rgba(255,255,255,.6)"
            : "1px solid rgba(255,255,255,.35)";
        const content = isCurrent
          ? (s.icon || s.tasks[0]?.emoji || "📍")
          : (isPast || isDoneStop)
            ? "✓"
            : "";

        return (
          <div key={s.stopKey}
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
                 fontSize: isCurrent ? 15 : 11,
                 color: isCurrent ? "#0f2418" : "#fff",
                 fontWeight: 700,
                 zIndex: isCurrent ? 4 : 3,
                 transition: "all 0.4s ease",
                 boxShadow: isCurrent ? "0 0 0 6px rgba(127,201,127,.18), 0 2px 8px rgba(0,0,0,.4)" : "0 1px 3px rgba(0,0,0,.4)",
               }}>
            {content}
          </div>
        );
      })}

      {/* ── Walker dot ── slides between stops via CSS transition. */}
      <div className="walk-walker"
           style={{
             position: "absolute",
             left: walkerX + "%",
             top: walkerY + "%",
             width: 26, height: 26,
             marginLeft: 0, marginTop: 0,
             transformOrigin: "center",
             transition: "left 0.95s cubic-bezier(.4,.0,.2,1), top 0.95s cubic-bezier(.4,.0,.2,1)",
             zIndex: 6,
             pointerEvents: "none",
           }}>
        <div style={{
          position: "absolute", inset: 0,
          borderRadius: "50%",
          background: "rgba(127,201,127,.25)",
          border: "1px solid rgba(127,201,127,.4)",
        }} />
        <div style={{
          position: "absolute",
          left: "50%", top: "50%",
          width: 16, height: 16,
          marginLeft: -8, marginTop: -8,
          borderRadius: "50%",
          background: "#fff",
          border: "2px solid #7fc97f",
          fontSize: 9,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>🚶</div>
      </div>

      {/* ── Compass / scale hint ── small label, top-left */}
      <div style={{
        position: "absolute", top: 8, left: 10,
        fontSize: 9, color: "rgba(255,255,255,.45)",
        letterSpacing: ".08em", textTransform: "uppercase",
        fontWeight: 600,
        pointerEvents: "none",
      }}>
        {W}m × {H}m
      </div>
    </div>
  );
}
