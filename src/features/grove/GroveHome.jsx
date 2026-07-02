/* ═══════════════════════════════════════════
   GROVE HOME — the map is the app (Phase 11.6)
   MARKER: GROVE_HOME_V1

   Replaces TodayScreen as the default page.
   Desktop/tablet: capped column (scene + inline sheet).
   Mobile (<768): scene hero + FIXED bottom sheet with
   two snap states (peek / full) — drag or tap the grab
   region to toggle. Sits above the tab bar (z 300,
   below BottomNav 400 / overlays 500+ / FAB 2000).

   Task completion mirrors WalkOverlay's light path:
   step tasks toggle the plot's persistent steps[i].done
   AND write the completions map; everything else just
   writes completions via markTaskDone.
   ═══════════════════════════════════════════ */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { C, F } from "../../lib/theme";
import { fetchWeather } from "../../lib/weather";
import { markTaskDone } from "../../lib/utils";
import FarmIcon from "../../components/FarmIcon";
import WalkOverlay from "../today/WalkOverlay";
import GroveScene from "./GroveScene";

function markerKind(t) {
  if (t.type === "harvest") return "harvest";
  if (t.type === "water") return "water";
  if (t.type === "eggs") return "eggs";
  return "care";
}

const KIND_ORDER = ["harvest", "water", "eggs", "care"];
const SHEET_PEEK = 122;

export default function GroveHome({ data, setData, setPage, tasks }) {
  /* ── Greeting + weather (TodayScreen pattern) ── */
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dateLabel = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const [weather, setWeather] = useState(null);
  useEffect(() => {
    let mounted = true;
    if (!data.city) { setWeather(null); return; }
    fetchWeather(data.city).then(w => { if (mounted) setWeather(w); });
    return () => { mounted = false; };
  }, [data.city]);

  const g = data.gamify || { streak: 0 };
  const [walkOpen, setWalkOpen] = useState(false);

  /* ── Mobile detection (matches App.jsx viewW < 768) ── */
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const fn = e => setIsMobile(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  /* ── Bottom-sheet snap state (mobile) ── */
  const [sheetFull, setSheetFull] = useState(false);
  const touch = useRef({ y: 0, last: 0, swallowClick: false });
  function onGrabTouchStart(e) {
    touch.current.y = e.touches[0].clientY;
    touch.current.last = e.touches[0].clientY;
  }
  function onGrabTouchMove(e) {
    touch.current.last = e.touches[0].clientY;
  }
  function onGrabTouchEnd() {
    const dy = touch.current.last - touch.current.y;
    if (dy < -28) { setSheetFull(true); touch.current.swallowClick = true; }
    else if (dy > 28) { setSheetFull(false); touch.current.swallowClick = true; }
  }
  function onGrabClick() {
    if (touch.current.swallowClick) { touch.current.swallowClick = false; return; }
    setSheetFull(v => !v);
  }

  /* ── Today's actionable tasks (queue is already done-filtered) ── */
  const actionable = useMemo(
    () => tasks.filter(t => t.pri <= 2 && t.type !== "forecast" && t.type !== "upcoming"),
    [tasks]
  );
  const attention = actionable.filter(t => t.pri <= 1);
  const routine = actionable.filter(t => t.pri === 2);
  const routineShown = routine.slice(0, 8);
  const routineExtra = routine.length - routineShown.length;

  /* ── Markers: group actionable tasks by zone → [{kind,count}] ── */
  const tasksByZone = useMemo(() => {
    const plotById = new Map((data.garden && data.garden.plots ? data.garden.plots : []).map(p => [p.id, p]));
    const animalZone = (data.zones || []).find(z => z.type === "barn" || z.type === "pasture");
    const acc = {};
    actionable.forEach(t => {
      let zid = null;
      if (t.plotId) {
        const p = plotById.get(t.plotId);
        zid = p ? p.zone : null;
      } else if (animalZone) {
        zid = animalZone.id;
      }
      if (!zid) return;
      const kind = markerKind(t);
      if (!acc[zid]) acc[zid] = {};
      acc[zid][kind] = (acc[zid][kind] || 0) + 1;
    });
    const out = {};
    Object.keys(acc).forEach(zid => {
      out[zid] = KIND_ORDER.filter(k => acc[zid][k]).map(k => ({ kind: k, count: acc[zid][k] })).slice(0, 3);
    });
    return out;
  }, [actionable, data.garden, data.zones]);

  /* ── Complete a task from the sheet ── */
  function completeTask(t) {
    if (t.type === "step" && t.plotId && typeof t.stepIdx === "number") {
      const plots = data.garden.plots.map(p => {
        if (p.id !== t.plotId) return p;
        const steps = (p.steps || []).map((s, i) => i === t.stepIdx ? { ...s, done: true } : s);
        return { ...p, steps };
      });
      const next = { ...data, garden: { ...data.garden, plots } };
      setData(markTaskDone(next, t.key));
      return;
    }
    setData(markTaskDone(data, t.key));
  }

  function TaskRow({ t }) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 2px", borderBottom: `1px solid ${C.bdr}` }}>
        <input type="checkbox" checked={false} onChange={() => completeTask(t)} aria-label={`Done: ${t.title}`}/>
        <FarmIcon name={t.cropName || t.speciesType || ""} emoji={t.emoji || "🌱"} size={20}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
          <div style={{ fontSize: 11, color: C.t3 }}>{t.loc}</div>
        </div>
        {t.type === "harvest" && (
          <span style={{ fontSize: 10, fontWeight: 700, color: "#9a5f14", background: C.harvestBg, border: "1px solid rgba(214,138,42,.4)", borderRadius: 99, padding: "2px 8px" }}>Ready</span>
        )}
      </div>
    );
  }

  const streakHot = g.streak >= 7;

  /* ── Shared pieces ── */
  const headerRow = (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
      <div>
        <div style={{ fontSize: 21, fontWeight: 800, fontFamily: F.head, color: C.text, letterSpacing: "-0.02em" }}>{greet}</div>
        <div style={{ fontSize: 12, color: C.t2, marginTop: 2 }}>{dateLabel}</div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {weather && weather.ok && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: C.card, border: `1px solid ${C.bdr}`, borderRadius: 99, padding: "5px 11px", fontSize: 12, color: C.t2, boxShadow: C.sh }}>
            <span>{weather.emoji}</span>
            <b style={{ color: C.text, fontWeight: 700 }}>{weather.temp}°C</b>
          </span>
        )}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: C.card, border: `1px solid ${C.bdr}`, borderRadius: 99, padding: "5px 11px", fontSize: 12, color: streakHot ? C.orange : C.green, fontWeight: 700, boxShadow: C.sh }}>
          <span>{streakHot ? "🔥" : "🌱"}</span>
          {g.streak > 0 ? `${g.streak} day${g.streak === 1 ? "" : "s"}` : "Day 1 awaits"}
        </span>
      </div>
    </div>
  );

  const sceneBlock = (
    <GroveScene
      data={data}
      setData={setData}
      tasksByZone={tasksByZone}
      onEditLayout={() => setPage("map", { edit: true })}
      onPlantInZone={zid => setPage("crops", { zone: zid })}
      onShowCrops={() => setPage("crops")}
      showHelperText={false}
    />
  );

  const legendRow = (
    <div style={{ display: "flex", justifyContent: "center", gap: 16, fontSize: 10.5, color: C.t3 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <span style={{ width: 7, height: 7, borderRadius: 99, background: "#b08d57", display: "inline-block" }}/> Planted
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <span style={{ width: 9, height: 9, borderRadius: 99, background: "#3f8f5f", display: "inline-block" }}/> Growing
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <span style={{ width: 11, height: 11, borderRadius: 99, border: "2px solid #e08a2e", display: "inline-block" }}/> Ready
      </span>
    </div>
  );

  const walkCta = actionable.length > 0 && (
    <button onClick={() => setWalkOpen(true)} style={{
      width: "100%", background: C.grd, color: "#fff", border: "none",
      borderRadius: 13, padding: "12px 16px", fontSize: 14, fontWeight: 700,
      cursor: "pointer", boxShadow: "0 2px 8px color-mix(in srgb, var(--color-green-dark) 30%, transparent)",
      flexShrink: 0,
    }}>
      Start your walk · {actionable.length} stop{actionable.length === 1 ? "" : "s"}
    </button>
  );

  const sheetTitleRow = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <div style={{ fontSize: 15, fontWeight: 700, fontFamily: F.head, color: C.text }}>On your farm today</div>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: C.green, background: C.greenPale, borderRadius: 99, padding: "3px 9px" }}>
        {actionable.length} {actionable.length === 1 ? "task" : "tasks"}
      </span>
    </div>
  );

  const emptyState = (
    <div style={{ textAlign: "center", padding: "14px 8px 10px", color: C.t2 }}>
      <div style={{ fontSize: 26, marginBottom: 6 }}>🌿</div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>A quiet day on the farm</div>
      <div style={{ fontSize: 11.5, marginTop: 3 }}>Nothing needs you right now — enjoy it.</div>
    </div>
  );

  const taskSections = (
    <div>
      {attention.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: C.t3, marginBottom: 2 }}>Needs attention</div>
          {attention.map(t => <TaskRow key={t.key} t={t}/>)}
        </div>
      )}
      {routineShown.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: C.t3, marginBottom: 2 }}>Routine</div>
          {routineShown.map(t => <TaskRow key={t.key} t={t}/>)}
        </div>
      )}
      {routineExtra > 0 && (
        <button onClick={() => setPage("tasks")} style={{
          width: "100%", marginTop: 10, background: "transparent", border: "none",
          color: C.green, fontSize: 12, fontWeight: 700, cursor: "pointer", minHeight: "unset",
        }} data-icon="true">
          +{routineExtra} more in Task Queue →
        </button>
      )}
    </div>
  );

  /* ═══ Mobile: fixed snap sheet ═══ */
  if (isMobile) {
    return (
      <div data-grove-home-marker="root" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {headerRow}
        {sceneBlock}
        {legendRow}
        <div style={{ height: SHEET_PEEK + 18 }}/>

        <div data-grove-home-marker="sheet" style={{
          position: "fixed", left: 8, right: 8,
          bottom: "calc(64px + env(safe-area-inset-bottom))",
          zIndex: 300,
          height: sheetFull ? "min(70vh, 600px)" : SHEET_PEEK,
          transition: "height .32s cubic-bezier(.25,.46,.45,.94)",
          background: C.card, border: `1px solid ${C.bdr}`, borderRadius: 20,
          boxShadow: "var(--shadow-xl)",
          padding: "8px 16px 10px",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div
            onClick={onGrabClick}
            onTouchStart={onGrabTouchStart}
            onTouchMove={onGrabTouchMove}
            onTouchEnd={onGrabTouchEnd}
            style={{ cursor: "pointer", touchAction: "none", flexShrink: 0 }}
            aria-label={sheetFull ? "Collapse tasks" : "Expand tasks"}
          >
            <div style={{ width: 36, height: 4, borderRadius: 99, background: C.bdr, margin: "0 auto 10px" }}/>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: F.head, color: C.text }}>On your farm today</div>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: C.green, background: C.greenPale, borderRadius: 99, padding: "3px 9px" }}>
                  {actionable.length}
                </span>
                <span style={{ fontSize: 11, color: C.t3, transform: sheetFull ? "rotate(180deg)" : "none", transition: "transform .3s", display: "inline-block" }}>▲</span>
              </span>
            </div>
          </div>

          {actionable.length === 0 ? emptyState : walkCta}

          <div style={{ flex: 1, overflowY: sheetFull ? "auto" : "hidden", marginTop: 2, paddingBottom: 6, WebkitOverflowScrolling: "touch" }}>
            {actionable.length > 0 && taskSections}
          </div>
        </div>

        {walkOpen && createPortal(
          <WalkOverlay tasks={tasks} data={data} setData={setData} onClose={() => setWalkOpen(false)}/>,
          document.body
        )}
      </div>
    );
  }

  /* ═══ Desktop / tablet: capped column, inline sheet ═══ */
  return (
    <div data-grove-home-marker="root" style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 960, margin: "0 auto", width: "100%" }}>
      {headerRow}
      {sceneBlock}
      {legendRow}

      <div data-grove-home-marker="sheet" style={{
        background: C.card, border: `1px solid ${C.bdr}`, borderRadius: 20,
        boxShadow: C.shL, padding: "10px 16px 14px",
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 99, background: C.bdr, margin: "0 auto 12px" }}/>
        {sheetTitleRow}
        {actionable.length === 0 ? emptyState : (
          <div>
            {walkCta}
            {taskSections}
          </div>
        )}
      </div>

      {walkOpen && createPortal(
        <WalkOverlay tasks={tasks} data={data} setData={setData} onClose={() => setWalkOpen(false)}/>,
        document.body
      )}
    </div>
  );
}
