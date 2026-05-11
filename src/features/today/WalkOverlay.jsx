import { useState, useMemo, useRef, useEffect } from "react";
import { F } from "../../lib/theme";
import { markTaskDone, todayLocalKey, appendLog } from "../../lib/utils";
import { uid } from "../../lib/storage";
import { rCM } from "../../lib/regional";
import { useSwipeUp } from "../../lib/use-swipe-up";
import WalkMap from "./WalkMap";
import { buildWalkStops } from "./walk-stops";

/* ═══════════════════════════════════════════
   WalkOverlay — map-guided guided walk through today's tasks.

   Layout (full-screen overlay):
     ┌────────────────────────────────┐
     │ Header  (n of N · close ×)    │
     │ Progress bar                  │
     │ ───────────────────────────── │
     │     <WalkMap>  (animated)     │
     │ ───────────────────────────── │
     │ Task card                     │
     │   emoji · title · log input  │
     │   [Skip]      [Done ✓]        │
     └────────────────────────────────┘

   State machine (phase):
     • walking — showing the current step's task card
     • summary — end-of-walk recap

   A "step" is one task at one stop. A stop can hold multiple tasks
   (e.g. water + harvest in the same bed). The map walker only moves
   when the stop changes, not between tasks at the same stop.

   Quick-log handling:
     • harvest → moves plot to "harvested", adds yield to pantry, logs it
     • eggs    → adds count to pantry, logs it
     • water   → logs amount (no domain state change)
     • all     → markTaskDone (drives streak/badges via updateGamify
                  wrapper in App.jsx)

   Props (unchanged from previous version):
     tasks    — buildTaskQueue output (full list)
     data     — app state
     setData  — setter; auto-wraps with updateGamify in App.jsx
     onClose  — close handler from parent
   ═══════════════════════════════════════════ */

// Soft chime via Web Audio API — no asset, no CSP change.
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
  } catch (e) { /* silent */ }
}

function buzz() {
  try { if (navigator.vibrate) navigator.vibrate(15); } catch (e) { /* silent */ }
}

// ─── Quick-log defaults ──────────────────────────────────────────────────────
function defaultLogValue(task, data) {
  if (!task) return null;
  if (task.type === "harvest" && task.plotId) {
    const plots = (data.garden && data.garden.plots) || [];
    const plot = plots.find(function(p) { return p.id === task.plotId; });
    if (!plot) return 3;
    if (plot.expectedYieldKg) return plot.expectedYieldKg;
    const crop = rCM(data.region).get(plot.crop);
    if (crop && crop.yld) return crop.yld;
    return 3;
  }
  if (task.type === "water") {
    if (task.plotId) return 5;
    if (task.headCount) return Math.max(1, Math.round(task.headCount * 4));
    return 5;
  }
  if (task.type === "eggs") {
    const heads = task.headCount || 1;
    return Math.max(1, Math.floor(heads * 0.7));
  }
  return null;
}

// Returns the new `data` after completing the given task with optional log value.
function applyTaskCompletion(data, task, logValue) {
  if (!task) return data;

  // Harvest — move plot to harvested, push yield to pantry, log.
  if (task.type === "harvest" && task.plotId) {
    const plots = (data.garden && data.garden.plots) || [];
    const plot = plots.find(function(p) { return p.id === task.plotId; });
    if (plot) {
      const crop = rCM(data.region).get(plot.crop);
      const kg = Number(logValue) > 0 ? Number(logValue) : (plot.expectedYieldKg || (crop && crop.yld) || 3);
      const item = {
        id: uid(),
        name: plot.crop,
        category: "Fresh Produce",
        qty: kg,
        unit: "kg",
        source: "farm",
        addedDate: todayLocalKey(),
        storageNote: (crop && crop.storage) || "",
      };
      const next = {
        ...data,
        garden: { plots: plots.map(function(x) { return x.id === plot.id ? { ...x, status: "harvested" } : x; }) },
        pantry: { items: [...((data.pantry && data.pantry.items) || []), item] },
        log: appendLog(data.log, { text: "🧺 Harvested " + kg + "kg " + plot.crop }),
      };
      return markTaskDone(next, task.key);
    }
  }

  // Eggs — add to pantry, log.
  if (task.type === "eggs") {
    const count = Number(logValue) > 0 ? Math.round(Number(logValue)) : 1;
    const item = {
      id: uid(),
      name: "Eggs",
      category: "Eggs",
      qty: count,
      unit: "count",
      source: "farm",
      addedDate: todayLocalKey(),
      storageNote: "Refrigerate within 2 hours of collection.",
    };
    const next = {
      ...data,
      pantry: { items: [...((data.pantry && data.pantry.items) || []), item] },
      log: appendLog(data.log, { text: "🥚 Collected " + count + " eggs" }),
    };
    return markTaskDone(next, task.key);
  }

  // Water — log the amount only.
  if (task.type === "water") {
    const litres = Number(logValue) > 0 ? Number(logValue) : null;
    const text = litres ? ("💧 " + task.title + " (~" + litres + "L)") : ("💧 " + task.title);
    const next = { ...data, log: appendLog(data.log, { text: text }) };
    return markTaskDone(next, task.key);
  }

  // Everything else — pure check-off.
  return markTaskDone(data, task.key);
}

// ─────────────────────────────────────────────────────────────────────────────

export default function WalkOverlay({ tasks, data, setData, onClose }) {
  // Snapshot stops on open. Re-running every render would shift the order
  // mid-walk (each completion shrinks the queue), which is jarring.
  const stops = useMemo(function() {
    return buildWalkStops(tasks, data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Flatten to steps so we can advance one task at a time even when a stop
  // has several. Walker only animates on stopIdx change.
  const steps = useMemo(function() {
    const flat = [];
    stops.forEach(function(s, si) {
      s.tasks.forEach(function(t, ti) {
        flat.push({ stop: s, stopIdx: si, task: t, taskIdx: ti });
      });
    });
    return flat;
  }, [stops]);

  const total = steps.length;

  const [stepIdx, setStepIdx] = useState(0);
  const [phase, setPhase] = useState(total === 0 ? "summary" : "walking");
  const [logVal, setLogVal] = useState(function() {
    return defaultLogValue(total > 0 ? steps[0].task : null, data);
  });
  const completedRef = useRef([]);
  const startStreakRef = useRef((data.gamify && data.gamify.streak) || 0);

  const step = steps[stepIdx];
  const task = step ? step.task : null;
  const currentStopIdx = step ? step.stopIdx : -1;

  // Map needs checkmark hints — derived from completed task keys.
  const completedStopKeys = useMemo(function() {
    const done = new Set();
    stops.forEach(function(s) {
      const allDone = s.tasks.every(function(t) {
        return completedRef.current.indexOf(t.key) !== -1;
      });
      if (allDone) done.add(s.stopKey);
    });
    return done;
    // stepIdx dep forces re-eval after each completion
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops, stepIdx]);

  // Reset the quick-log input each time the active task changes.
  useEffect(function() {
    setLogVal(defaultLogValue(task, data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx]);

  // Lock body scroll
  useEffect(function() {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return function() { document.body.style.overflow = prev; };
  }, []);

  // Esc closes
  useEffect(function() {
    const h = function(e) { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return function() { window.removeEventListener("keydown", h); };
  }, [onClose]);

  function advance() {
    if (stepIdx + 1 >= total) {
      setPhase("summary");
    } else {
      setStepIdx(stepIdx + 1);
    }
  }

  function completeCurrent() {
    if (!task) { advance(); return; }
    completedRef.current.push(task.key);
    setData(applyTaskCompletion(data, task, logVal));
    playChime();
    buzz();
    advance();
  }

  function skipCurrent() {
    advance();
  }

  // Quick-log tasks need explicit Done — swipe-up disabled for them so the
  // user doesn't accidentally commit a 0kg harvest.
  const needsInput = task && (task.type === "harvest" || task.type === "eggs" || task.type === "water");
  const swipe = useSwipeUp({ onSwipeUp: completeCurrent, disabled: phase !== "walking" || needsInput });

  const completedCount = completedRef.current.length;
  const skippedCount = total - completedCount;

  // Pre-compute type label (no nested ternaries in render path)
  let typeLabel = "";
  if (task) {
    if (task.routine) typeLabel = "routine";
    else if (task.type === "harvest") typeLabel = "harvest ready";
    else if (task.type === "step") typeLabel = "growing step";
    else if (task.type === "health") typeLabel = "health check";
    else if (task.type === "hoof") typeLabel = "hoof check";
    else if (task.type === "hive") typeLabel = "hive inspection";
    else if (task.type === "clean") typeLabel = "housekeeping";
    else if (task.type === "bedding") typeLabel = "bedding change";
    else if (task.type === "paddock") typeLabel = "paddock rotation";
    else typeLabel = "today";
  }

  let inputUnit = "";
  let inputHelp = "";
  if (task && task.type === "harvest") { inputUnit = "kg"; inputHelp = "Weigh what you bring in"; }
  else if (task && task.type === "water") { inputUnit = "L"; inputHelp = "Approx. amount today"; }
  else if (task && task.type === "eggs") { inputUnit = "eggs"; inputHelp = "Count what's in the nest box"; }

  let stopHeader = "";
  let stopBadge = "";
  if (step) {
    stopHeader = step.stop.label;
    const tasksAtStop = step.stop.tasks.length;
    if (tasksAtStop > 1) {
      stopBadge = (step.taskIdx + 1) + " / " + tasksAtStop + " here";
    }
  }

  const cardTransform = phase === "walking" && !needsInput ? ("translateY(" + swipe.offsetY + "px)") : "translateY(0)";
  const cardOpacity = phase === "walking" && !needsInput ? Math.max(0.3, 1 - Math.abs(swipe.offsetY) / 300) : 1;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "linear-gradient(180deg, #1a3d2e 0%, #0f2418 100%)",
      display: "flex", flexDirection: "column",
      color: "#fff",
      fontFamily: F.body,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.7)", letterSpacing: ".02em" }}>
          {phase === "walking" ? ("Walk · " + (stepIdx + 1) + " of " + total) : "Walk complete"}
        </div>
        <button onClick={onClose} aria-label="Close walk" style={{ background: "transparent", border: "none", color: "rgba(255,255,255,.6)", fontSize: 24, cursor: "pointer", padding: 4, lineHeight: 1, width: 32, height: 32 }}>×</button>
      </div>

      {/* Progress bar */}
      {phase === "walking" && (
        <div style={{ height: 3, background: "rgba(255,255,255,.08)" }}>
          <div style={{
            height: "100%",
            width: (total === 0 ? 0 : (stepIdx / total) * 100) + "%",
            background: "#7fc97f",
            transition: "width 0.3s ease",
          }} />
        </div>
      )}

      {/* Walking phase */}
      {phase === "walking" && task && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Map */}
          <div style={{ padding: "14px 14px 6px" }}>
            <WalkMap
              stops={stops}
              currentStopIdx={currentStopIdx}
              completedStopKeys={completedStopKeys}
              zones={data.zones || []}
              farmW={data.farmW || 100}
              farmH={data.farmH || 60}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, padding: "0 4px" }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", fontWeight: 600 }}>📍 {stopHeader}</div>
              {stopBadge && <div style={{ fontSize: 10, color: "rgba(255,255,255,.5)", letterSpacing: ".05em" }}>{stopBadge}</div>}
            </div>
          </div>

          {/* Task card */}
          <div
            onTouchStart={needsInput ? undefined : swipe.bind.onTouchStart}
            onTouchMove={needsInput ? undefined : swipe.bind.onTouchMove}
            onTouchEnd={needsInput ? undefined : swipe.bind.onTouchEnd}
            style={{
              flex: 1,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "8px 20px 4px",
              transform: cardTransform,
              opacity: cardOpacity,
              transition: swipe.dragging ? "none" : "transform 0.18s ease, opacity 0.18s ease",
              touchAction: needsInput ? "auto" : "none",
              userSelect: "none",
            }}
          >
            <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 12 }}>{task.emoji || "🌱"}</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: F.head, textAlign: "center", marginBottom: 6, maxWidth: 340, lineHeight: 1.2, padding: "0 8px" }}>
              {task.title}
            </div>
            {task.desc && (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)", marginBottom: 10, textAlign: "center", maxWidth: 320, lineHeight: 1.4 }}>
                {task.desc}
              </div>
            )}
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 12 }}>
              {typeLabel}
            </div>

            {/* Quick-log input */}
            {needsInput && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, background: "rgba(255,255,255,.06)", padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)" }}>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step={task.type === "eggs" ? "1" : "0.1"}
                  value={logVal == null ? "" : logVal}
                  onChange={function(e) {
                    const v = e.target.value;
                    setLogVal(v === "" ? "" : Number(v));
                  }}
                  style={{
                    width: 80,
                    background: "transparent",
                    border: "none",
                    color: "#fff",
                    fontSize: 24,
                    fontWeight: 700,
                    textAlign: "right",
                    outline: "none",
                    fontFamily: F.head,
                  }}
                />
                <div style={{ fontSize: 14, color: "rgba(255,255,255,.7)", fontWeight: 600 }}>{inputUnit}</div>
              </div>
            )}
            {needsInput && (
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", marginTop: 4 }}>{inputHelp}</div>
            )}
          </div>

          {/* Action area */}
          <div style={{ padding: "10px 20px 22px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            {!needsInput && (
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", letterSpacing: ".05em" }}>
                swipe up to complete
              </div>
            )}
            <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 360 }}>
              <button onClick={skipCurrent} style={{
                flex: 1, padding: "13px 18px", borderRadius: 14,
                background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)",
                color: "rgba(255,255,255,.85)", fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}>Skip</button>
              <button onClick={completeCurrent} style={{
                flex: 2, padding: "13px 18px", borderRadius: 14,
                background: "#7fc97f", border: "none",
                color: "#0f2418", fontSize: 14, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 2px 10px rgba(127,201,127,.25)",
              }}>Done ✓</button>
            </div>
          </div>
        </div>
      )}

      {/* Summary phase */}
      {phase === "summary" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center" }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>
            {total === 0 ? "👋" : completedCount === total ? "🎉" : completedCount > 0 ? "✓" : "🌿"}
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, fontFamily: F.head, marginBottom: 8 }}>
            {total === 0
              ? "Nothing for today"
              : completedCount === total
                ? "Walk complete"
                : completedCount === 0
                  ? "Maybe later"
                  : completedCount + " of " + total + " done"}
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,.7)", marginBottom: 24, maxWidth: 300, lineHeight: 1.5 }}>
            {total === 0
              ? "Take it easy 🌿"
              : completedCount === total
                ? "Nice work. See you tomorrow."
                : completedCount === 0
                  ? "No worries — come back when you're ready."
                  : skippedCount + " left for later."}
          </div>
          {completedCount > 0 && startStreakRef.current === 0 && (
            <div style={{ fontSize: 13, color: "#7fc97f", fontWeight: 600, marginBottom: 24, padding: "8px 14px", background: "rgba(127,201,127,.12)", borderRadius: 10, border: "1px solid rgba(127,201,127,.25)" }}>
              🌱 Streak started — day 1
            </div>
          )}
          <button onClick={onClose} style={{
            padding: "14px 32px", borderRadius: 14,
            background: "#7fc97f", border: "none",
            color: "#0f2418", fontSize: 15, fontWeight: 700, cursor: "pointer",
          }}>Back to Today</button>
        </div>
      )}
    </div>
  );
}
