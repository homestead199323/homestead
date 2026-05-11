import { useState, useMemo, useRef, useEffect } from "react";
import { C, F } from "../../lib/theme";
import { markTaskDone } from "../../lib/utils";
import { useSwipeUp } from "../../lib/use-swipe-up";

/* ═══════════════════════════════════════════
   WalkOverlay — full-screen guided walk through today's tasks.

   One task per screen. Swipe-up or tap Done to complete. Tap Skip
   to advance without marking done. End-of-walk summary card shows
   tasks done count + streak preview.

   Tasks are snapshotted on open (useMemo with [] deps). Completing
   a task here calls setData(markTaskDone(data, key)) — same path
   the TaskQueue swipe-right uses, so streak/badges flow through
   the existing updateGamify wrapper in setData.

   Walk ordering: attention items first (harvests, growing steps,
   periodic animal care due today), then routine items (feed/water)
   grouped by location. If the user bails mid-walk, the urgent
   stuff is already done.

   Props:
     tasks    — buildTaskQueue output (full list, not pre-filtered)
     data     — app state
     setData  — setter (auto-wraps with updateGamify in App.jsx)
     onClose  — close handler from parent
   ═══════════════════════════════════════════ */

// Soft chime via Web Audio API — no asset, no CSP change. iOS Safari
// allows audio creation inside a user-gesture handler (swipe-up commit
// or button tap both qualify).
function playChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) { /* silent fail */ }
}

function buzz() {
  try { if (navigator.vibrate) navigator.vibrate(15); } catch (e) { /* silent */ }
}

export default function WalkOverlay({ tasks, data, setData, onClose }) {
  // Snapshot the walk's task list on open — attention first, routine after.
  const walkList = useMemo(function() {
    const todayKey = (function(){
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth()+1).padStart(2,"0");
      const dd = String(d.getDate()).padStart(2,"0");
      return y+"-"+m+"-"+dd;
    })();
    const doneToday = new Set((data.completions && data.completions[todayKey]) || []);
    const todayTasks = tasks.filter(function(t){
      if (t.daysOut !== 0) return false;
      if (t.type === "upcoming" || t.type === "forecast") return false;
      if (t.key && doneToday.has(t.key)) return false;
      return true;
    });
    const attention = todayTasks.filter(function(t){ return t.routine !== true; });
    const routine = todayTasks.filter(function(t){ return t.routine === true; });
    attention.sort(function(a,b){ return (a.pri||0) - (b.pri||0); });
    routine.sort(function(a,b){ return (a.loc||"").localeCompare(b.loc||""); });
    return attention.concat(routine);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState(walkList.length === 0 ? "summary" : "walking");
  const completedRef = useRef([]);
  const startStreakRef = useRef((data.gamify && data.gamify.streak) || 0);

  const total = walkList.length;
  const t = walkList[idx];

  const advance = function() {
    if (idx + 1 >= total) setPhase("summary");
    else setIdx(idx + 1);
  };

  const completeCurrent = function() {
    if (!t) { advance(); return; }
    if (t.key) {
      completedRef.current.push(t.key);
      setData(markTaskDone(data, t.key));
    }
    playChime();
    buzz();
    advance();
  };

  const skipCurrent = function() { advance(); };

  // Swipe-up gesture (only active during "walking" phase)
  const swipe = useSwipeUp({ onSwipeUp: completeCurrent, disabled: phase !== "walking" });

  // Lock body scroll while overlay is open
  useEffect(function() {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return function() { document.body.style.overflow = prev; };
  }, []);

  // Esc closes the overlay
  useEffect(function() {
    const h = function(e) { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return function() { window.removeEventListener("keydown", h); };
  }, [onClose]);

  const completedCount = completedRef.current.length;
  const skippedCount = total - completedCount;
  const cardTransform = phase === "walking" ? "translateY("+swipe.offsetY+"px)" : "translateY(0)";
  const cardOpacity = phase === "walking" ? Math.max(0.2, 1 - Math.abs(swipe.offsetY) / 300) : 1;

  // Type-label for the current task (small caption under title)
  const typeLabel = t
    ? (t.routine
        ? "routine"
        : t.type === "harvest"
          ? "harvest ready"
          : t.type === "step"
            ? "growing step"
            : "today")
    : "";

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:1000,
      background:"linear-gradient(180deg, #1a3d2e 0%, #0f2418 100%)",
      display:"flex", flexDirection:"column",
      color:"#fff",
      fontFamily:F.body,
    }}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 18px",borderBottom:"1px solid rgba(255,255,255,.08)"}}>
        <div style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,.7)",letterSpacing:".02em"}}>
          {phase === "walking" ? "Walk · "+(idx+1)+" of "+total : "Walk complete"}
        </div>
        <button onClick={onClose} aria-label="Close walk" style={{background:"transparent",border:"none",color:"rgba(255,255,255,.6)",fontSize:24,cursor:"pointer",padding:4,lineHeight:1,width:32,height:32}}>×</button>
      </div>

      {/* Progress bar (walking phase only) */}
      {phase === "walking" && (
        <div style={{height:3,background:"rgba(255,255,255,.08)"}}>
          <div style={{
            height:"100%",
            width:(total === 0 ? 0 : (idx / total) * 100)+"%",
            background:"#7fc97f",
            transition:"width 0.3s ease",
          }} />
        </div>
      )}

      {/* Walking phase — current task */}
      {phase === "walking" && t && (
        <div style={{flex:1,display:"flex",flexDirection:"column"}}>
          <div
            onTouchStart={swipe.bind.onTouchStart}
            onTouchMove={swipe.bind.onTouchMove}
            onTouchEnd={swipe.bind.onTouchEnd}
            style={{
              flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              padding:"20px",
              transform: cardTransform,
              opacity: cardOpacity,
              transition: swipe.dragging ? "none" : "transform 0.18s ease, opacity 0.18s ease",
              touchAction:"none",
              userSelect:"none",
            }}
          >
            <div style={{fontSize:88,lineHeight:1,marginBottom:24}}>{t.emoji || "🌱"}</div>
            <div style={{fontSize:26,fontWeight:800,fontFamily:F.head,textAlign:"center",marginBottom:10,maxWidth:340,lineHeight:1.2,padding:"0 8px"}}>
              {t.title}
            </div>
            {t.loc && (
              <div style={{fontSize:14,color:"rgba(255,255,255,.65)",marginBottom:4}}>
                {t.loc}
              </div>
            )}
            <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginTop:24,letterSpacing:".05em",textTransform:"uppercase"}}>
              {typeLabel}
            </div>
          </div>

          {/* Action area */}
          <div style={{padding:"12px 20px 24px",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
            <div style={{fontSize:11,color:"rgba(255,255,255,.4)",letterSpacing:".05em"}}>
              swipe up to complete
            </div>
            <div style={{display:"flex",gap:10,width:"100%",maxWidth:340}}>
              <button onClick={skipCurrent} style={{
                flex:1,padding:"14px 18px",borderRadius:14,
                background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.12)",
                color:"rgba(255,255,255,.85)",fontSize:15,fontWeight:600,cursor:"pointer",
              }}>Skip</button>
              <button onClick={completeCurrent} style={{
                flex:2,padding:"14px 18px",borderRadius:14,
                background:"#7fc97f",border:"none",
                color:"#0f2418",fontSize:15,fontWeight:700,cursor:"pointer",
              }}>Done ✓</button>
            </div>
          </div>
        </div>
      )}

      {/* Summary phase */}
      {phase === "summary" && (
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px",textAlign:"center"}}>
          <div style={{fontSize:72,marginBottom:16}}>
            {total === 0 ? "👋" : completedCount === total ? "🎉" : completedCount > 0 ? "✓" : "🌿"}
          </div>
          <div style={{fontSize:26,fontWeight:800,fontFamily:F.head,marginBottom:8}}>
            {total === 0
              ? "Nothing for today"
              : completedCount === total
                ? "Walk complete"
                : completedCount === 0
                  ? "Maybe later"
                  : completedCount+" of "+total+" done"}
          </div>
          <div style={{fontSize:14,color:"rgba(255,255,255,.7)",marginBottom:28,maxWidth:300,lineHeight:1.5}}>
            {total === 0
              ? "Take it easy 🌿"
              : completedCount === total
                ? "Nice work. See you tomorrow."
                : completedCount === 0
                  ? "No worries — come back when you're ready."
                  : skippedCount+" left for later."}
          </div>
          {completedCount > 0 && startStreakRef.current === 0 && (
            <div style={{fontSize:13,color:"#7fc97f",fontWeight:600,marginBottom:24,padding:"8px 14px",background:"rgba(127,201,127,.12)",borderRadius:10,border:"1px solid rgba(127,201,127,.25)"}}>
              🌱 Streak started — day 1
            </div>
          )}
          <button onClick={onClose} style={{
            padding:"14px 32px",borderRadius:14,
            background:"#7fc97f",border:"none",
            color:"#0f2418",fontSize:15,fontWeight:700,cursor:"pointer",
          }}>Back to Today</button>
        </div>
      )}
    </div>
  );
}
