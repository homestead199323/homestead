/* ═══════════════════════════════════════════
   GROVE SCENE — the farm as an isometric scene
   Phase 11.2–11.5. SVG base layer (ground, plates,
   buildings, trees) + HTML overlay (crop sprites,
   zone tags, animal chips, task markers).
   MARKER: GROVE_SCENE_V1

   Same data plumbing as LivingFarmMap: zones by
   xM/yM/wM/hM, plots row-packed per zone with the
   unified algorithm, fill % via buildZoneSpaceMap,
   animals via zoneAnimalGroups. Click zone → ZoneOverlay
   (or custom onZoneClick).
   ═══════════════════════════════════════════ */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { C } from "../../lib/theme";
import { rCM } from "../../lib/regional";
import { buildZoneSpaceMap } from "../../lib/farm-calc";
import FarmIcon from "../../components/FarmIcon";
import { localDateFromKey, todayLocalKey } from "../../lib/utils";
import GroveZoneCard from "./GroveZoneCard";
import { isPlantZone, zoneAnimalGroups, zoneFillColor } from "../farm/living/visuals";
import { makeProjector, polyPoints, depthOf } from "./sceneMath";

/* ── Per-type plate palette: top face + left/right side shades ── */
const TYPE_COLORS = {
  veg:        { top: "#e6d9b6", l: "#cbbb92", r: "#b2a077", detail: "#c4b184" },
  herbs:      { top: "#d8e4c1", l: "#bcc99e", r: "#a4b287", detail: "#8fae6a" },
  greenhouse: { top: "#e2ece6", l: "#bccec4", r: "#a3b8ad", detail: "#98b4a6" },
  pasture:    { top: "#bcd49b", l: "#a0b981", r: "#8aa46d", detail: "#93b56f" },
  compost:    { top: "#a58c67", l: "#8d7654", r: "#786347", detail: "#8d7654" },
  water:      { top: "#8fc2cf", l: "#6fa4b3", r: "#5e93a2", detail: "#c9e6ec" },
  default:    { top: "#c2d3a0", l: "#a6b787", r: "#90a173", detail: "#a6b787" },
};
/* Patch fill per growth stage — planted soil → growing green → ready gold */
const STAGE_FILL = {
  just_planted: { fill: "#c9a97b", stroke: "#a9895c" },
  growing:      { fill: "#8cbd71", stroke: "#6d9d55" },
  ready:        { fill: "#e3b45c", stroke: "#e08a2e" },
};

const BUILDING_COLORS = {
  house:   { wl: "#d8ac7a", wr: "#b5854f", roof: "#8a5a38", ridge: "#9c6b45", door: "#6b4a2e" },
  barn:    { wl: "#c2795a", wr: "#a05c40", roof: "#7c4630", ridge: "#8f563c", door: "#5c3421" },
  storage: { wl: "#a29a8c", wr: "#847c6f", roof: "#6d665b", ridge: "#7c756a", door: "#524c43" },
};
const BUILDING_TYPES = new Set(["house", "barn", "storage"]);

/* Small inline glyphs for task markers (duotone, self-contained) */
function MarkerGlyph({ kind, size = 15 }) {
  const s = { width: size, height: size, display: "block" };
  if (kind === "harvest") return (
    <svg viewBox="0 0 24 24" style={s}><path fill="none" stroke="#b0741b" strokeWidth="1.9" strokeLinecap="round" d="M7 10c0-4 2-7 5-7s5 3 5 7"/><path fill="#f0d9a8" stroke="#b0741b" strokeWidth="1.3" d="M3.5 10h17l-1.6 9.2A2.5 2.5 0 0 1 16.4 21H7.6a2.5 2.5 0 0 1-2.5-1.8z"/></svg>
  );
  if (kind === "water") return (
    <svg viewBox="0 0 24 24" style={s}><path fill="#bbd8f5" stroke="#2f7de0" strokeWidth="1.4" d="M12 2.5C8.5 7.5 5.5 11 5.5 15a6.5 6.5 0 0 0 13 0c0-4-3-7.5-6.5-12.5z"/></svg>
  );
  if (kind === "eggs") return (
    <svg viewBox="0 0 24 24" style={s}><path fill="#f2e3c0" stroke="#8a6a2e" strokeWidth="1.4" d="M12 2C8.5 2 5 8 5 13.5S8 22 12 22s7-3 7-8.5S15.5 2 12 2z"/></svg>
  );
  return (
    <svg viewBox="0 0 24 24" style={s}><path fill="#9ad0a8" stroke="#2e7a4b" strokeWidth="1.4" d="M20 4C11 4 5 9 4.5 16.5 4.4 18 5 20 5 20s2.5.6 4.5.4C17 19.8 20.5 13 20 4z"/></svg>
  );
}

function SproutGlyph({ size = 13 }) {
  return (
    <svg viewBox="0 0 24 24" style={{ width: size, height: size, display: "block" }}>
      <path stroke="#2e7a4b" strokeWidth="2" strokeLinecap="round" fill="none" d="M12 22v-8"/>
      <path fill="#7cc491" d="M12 14c0-4-2.6-6.5-6.5-6.5C5.5 11.5 8 14 12 14zm0 0c0-4 2.6-6.5 6.5-6.5C18.5 11.5 16 14 12 14z"/>
    </svg>
  );
}

function spriteHash(id) {
  let h = 0;
  const str = String(id || "");
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 100000;
  return h;
}

export default function GroveScene({
  data,
  setData,
  tasksByZone = {},
  onEditLayout,
  onPlantInZone,
  onShowCrops,
  onZoneClick,
  interactive = true,
  showEditButton = true,
  showHelperText = true,
  showTimeTint = true,
  noBorder = false,
  /* edit mode (Farm Designer): { selectedId, onSelect(id|null),
     onZoneGeom(id, {xM,yM,wM,hM}), onPlaceAt(xM,yM,type?), armed, dragType } */
  edit = null,
}) {
  const boxRef = useRef(null);
  /* editor pointer state — {mode:"drag"|"resize", id, corner?, startSX, startSY, orig:{xM,yM,wM,hM}} */
  const [editPtr, setEditPtr] = useState(null);

  /* client px → viewBox units (aspect is locked, so width ratio suffices) */
  function toVB(clientX, clientY) {
    const rect = boxRef.current.getBoundingClientRect();
    const s = rect.width > 0 ? PROJ.vbW / rect.width : 1;
    return [(clientX - rect.left) * s, (clientY - rect.top) * s];
  }
  /* ── Hour-of-day tint (Phase 8.5 behavior, kept) ── */
  const [mapHour, setMapHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const id = setInterval(() => setMapHour(new Date().getHours()), 60000);
    return () => clearInterval(id);
  }, []);
  const tint = useMemo(() => {
    const h = mapHour;
    if (h >= 8 && h <= 17) return null;
    if (h === 6 || h === 7) return "rgba(255,180,80,.10)";
    if (h === 18 || h === 19) return "rgba(255,140,60,.13)";
    return "rgba(15,30,60,.25)";
  }, [mapHour]);

  const [selZoneId, setSelZoneId] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  const selZone = data.zones.find(z => z.id === selZoneId) || null;

  const today = todayLocalKey();
  const cropMap = useMemo(() => rCM(data.region), [data.region]);
  const fW = data.farmW || 100;
  const fH = data.farmH || 60;

  const zoneSpace = useMemo(
    () => buildZoneSpaceMap(data.zones, data.garden && data.garden.plots ? data.garden.plots : [], fW, fH, data.region),
    [data.zones, data.garden, fW, fH, data.region]
  );

  const PROJ = useMemo(() => makeProjector(fW, fH), [fW, fH]);

  /* ── Row-pack per zone — identical algorithm to Farm Designer / LivingFarmMap ── */
  function patchesForZone(z) {
    if (!isPlantZone(z.type)) return [];
    const plots = (data.garden && data.garden.plots ? data.garden.plots : [])
      .filter(function (p) { return p.zone === z.id && p.status !== "harvested"; });
    if (plots.length === 0) return [];
    const zoneTotalM2 = (z.wM || 10) * (z.hM || 8);
    if (zoneTotalM2 <= 0) return [];
    const todayMs = localDateFromKey(today).getTime();
    const raw = [];
    plots.forEach(function (p) {
      let area = 0;
      const crop = cropMap.get(p.crop);
      if (p.measureType === "area" && p.qty) area = +p.qty;
      else if (p.plantCount && crop) { const sp = crop.spacing / 100; area = p.plantCount * sp * sp; }
      if (area <= 0) return;
      const frac = Math.min(1, area / zoneTotalM2);
      let growthPct = 0;
      let stage = "just_planted";
      if (p.plantDate && crop && crop.days > 0) {
        const plantedMs = localDateFromKey(p.plantDate).getTime();
        const elapsedDays = Math.max(0, (todayMs - plantedMs) / 864e5);
        growthPct = Math.max(0, Math.min(1, elapsedDays / crop.days));
        if (growthPct >= 0.85 || (p.harvestDate && p.harvestDate <= today)) stage = "ready";
        else if (growthPct >= 0.10) stage = "growing";
      } else if (p.harvestDate && p.harvestDate <= today) {
        growthPct = 1; stage = "ready";
      }
      raw.push({ plotId: p.id, crop: p.crop, name: p.name || p.crop, frac, growthPct, stage });
    });
    raw.sort(function (a, b) { return b.frac - a.frac; });
    const sumFrac = raw.reduce(function (s, r) { return s + r.frac; }, 0);
    const scale = sumFrac > 1 ? 1 / sumFrac : 1;
    const rows = [];
    let cur = []; let curW = 0;
    raw.forEach(function (r) {
      const pw = r.frac * scale;
      if (curW + pw > 1.0001 && cur.length > 0) { rows.push(cur); cur = []; curW = 0; }
      cur.push({ ...r, pw });
      curW += pw;
    });
    if (cur.length > 0) rows.push(cur);
    const rowH = rows.length > 0 ? 1 / rows.length : 1;
    const out = [];
    rows.forEach(function (row, ri) {
      let x = 0;
      row.forEach(function (p) {
        out.push({ ...p, ph: rowH, px: x, py: ri * rowH });
        x += p.pw;
      });
    });
    return out;
  }

  /* Pre-compute everything render needs, back-to-front */
  const scene = useMemo(() => {
    const p = PROJ.p; const U = PROJ.unit;
    const plateE = Math.max(8, Math.min(18, U * 0.7));
    const zs = [...(data.zones || [])].sort((a, b) => depthOf(a) - depthOf(b)).map(z => {
      const x0 = z.xM || 0, y0 = z.yM || 0, w = z.wM || 10, h = z.hM || 8;
      const x1 = x0 + w, y1 = y0 + h;
      const building = BUILDING_TYPES.has(z.type);
      const E = z.type === "water" || z.type === "compost" ? Math.max(3, plateE * 0.4)
        : building ? Math.max(16, Math.min(34, U * 1.6)) : plateE;
      const G = { tl: p(x0, y0), tr: p(x1, y0), br: p(x1, y1), bl: p(x0, y1) };
      const T = { tl: p(x0, y0, E), tr: p(x1, y0, E), br: p(x1, y1, E), bl: p(x0, y1, E) };
      const patches = building || z.type === "orchard" ? [] : patchesForZone(z);
      const orchardPlots = z.type === "orchard"
        ? (data.garden && data.garden.plots ? data.garden.plots : []).filter(pp => pp.zone === z.id && pp.status !== "harvested")
        : [];
      const readyCount =
        patches.filter(pt => pt.stage === "ready").length +
        orchardPlots.filter(pp => pp.harvestDate && pp.harvestDate <= today).length;
      return { z, x0, y0, w, h, x1, y1, E, G, T, building, patches, orchardPlots, readyCount };
    });
    return { zs, plateE, U };
  // patchesForZone closes over data/cropMap/today — recompute on those
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.zones, data.garden, PROJ, cropMap, today]);

  /* ── Empty state ── */
  if (!data.zones || data.zones.length === 0) {
    return (
      <div data-grove-scene-marker="empty" style={{
        padding: 40, textAlign: "center", color: C.t2,
        background: C.bg, borderRadius: 16, border: `1px dashed ${C.bdr}`,
      }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🗺️</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>No zones yet</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>Design your farm layout to see it here</div>
        {onEditLayout && (
        <button onClick={onEditLayout} style={{
          marginTop: 14, padding: "8px 20px", background: C.green, color: "#fff",
          border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>Design Farm Layout</button>
        )}
      </div>
    );
  }

  const { vbW, vbH } = PROJ;
  const P = PROJ.p; const U = PROJ.unit;
  const pct = ([sx, sy]) => ({ left: (sx / vbW * 100) + "%", top: (sy / vbH * 100) + "%" });

  function clickZone(z) {
    if (edit) { edit.onSelect && edit.onSelect(z.id); return; }
    if (onZoneClick) { onZoneClick(z); return; }
    if (interactive) setSelZoneId(z.id);
  }

  /* ── Editor pointer plumbing ── */
  function startZoneDrag(z, e) {
    if (!edit) return;
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
    const [sx, sy] = toVB(e.clientX, e.clientY);
    setEditPtr({ mode: "drag", id: z.id, startSX: sx, startSY: sy,
      orig: { xM: z.xM || 0, yM: z.yM || 0, wM: z.wM || 10, hM: z.hM || 8 } });
    edit.onSelect && edit.onSelect(z.id);
  }
  function startCornerResize(z, corner, e) {
    if (!edit) return;
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
    const [sx, sy] = toVB(e.clientX, e.clientY);
    setEditPtr({ mode: "resize", id: z.id, corner, startSX: sx, startSY: sy,
      orig: { xM: z.xM || 0, yM: z.yM || 0, wM: z.wM || 10, hM: z.hM || 8 } });
  }
  function editPointerMove(e) {
    if (!edit || !editPtr) return;
    const [sx, sy] = toVB(e.clientX, e.clientY);
    const { dxM, dyM } = PROJ.invertDelta(sx - editPtr.startSX, sy - editPtr.startSY);
    const o = editPtr.orig;
    if (editPtr.mode === "drag") {
      edit.onZoneGeom && edit.onZoneGeom(editPtr.id, { xM: o.xM + dxM, yM: o.yM + dyM, wM: o.wM, hM: o.hM });
      return;
    }
    /* corner resize — corners named by meter-space corner they grab */
    let xM = o.xM, yM = o.yM, wM = o.wM, hM = o.hM;
    const c = editPtr.corner;
    const MIN = 3;
    if (c === "br") { wM = Math.max(MIN, o.wM + dxM); hM = Math.max(MIN, o.hM + dyM); }
    if (c === "tr") { wM = Math.max(MIN, o.wM + dxM); const nh = Math.max(MIN, o.hM - dyM); yM = o.yM + (o.hM - nh); hM = nh; }
    if (c === "bl") { const nw = Math.max(MIN, o.wM - dxM); xM = o.xM + (o.wM - nw); wM = nw; hM = Math.max(MIN, o.hM + dyM); }
    if (c === "tl") { const nw = Math.max(MIN, o.wM - dxM); xM = o.xM + (o.wM - nw); wM = nw;
      const nh = Math.max(MIN, o.hM - dyM); yM = o.yM + (o.hM - nh); hM = nh; }
    edit.onZoneGeom && edit.onZoneGeom(editPtr.id, { xM, yM, wM, hM });
  }
  function editPointerUp() { if (editPtr) setEditPtr(null); }
  function editCanvasClick(e) {
    if (!edit) return;
    if (edit.armed && edit.onPlaceAt) {
      const [sx, sy] = toVB(e.clientX, e.clientY);
      const m = PROJ.invert(sx, sy);
      edit.onPlaceAt(m.xM, m.yM);
      return;
    }
    edit.onSelect && edit.onSelect(null);
  }
  function editDragOver(e) {
    if (!edit || !edit.dragType || !e.dataTransfer) return;
    if (Array.from(e.dataTransfer.types || []).includes(edit.dragType)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }
  function editDrop(e) {
    if (!edit || !edit.onPlaceAt || !e.dataTransfer) return;
    const t = e.dataTransfer.getData(edit.dragType || "") || e.dataTransfer.getData("text/plain");
    if (!t) return;
    e.preventDefault();
    const [sx, sy] = toVB(e.clientX, e.clientY);
    const m = PROJ.invert(sx, sy);
    edit.onPlaceAt(m.xM, m.yM, t);
  }

  /* Ground grid lines every ~5m, clipped to the farm diamond */
  const gridLines = [];
  const step = fW > 60 || fH > 60 ? 10 : 5;
  for (let gx = step; gx < fW; gx += step) gridLines.push([P(gx, 0), P(gx, fH)]);
  for (let gy = step; gy < fH; gy += step) gridLines.push([P(0, gy), P(fW, gy)]);

  return (
    <div data-grove-scene-marker="scene-root" style={{ position: "relative" }}>
      <div ref={boxRef}
        onPointerMove={edit ? editPointerMove : undefined}
        onPointerUp={edit ? editPointerUp : undefined}
        onPointerCancel={edit ? editPointerUp : undefined}
        onClick={edit ? editCanvasClick : undefined}
        onDragOver={edit ? editDragOver : undefined}
        onDrop={edit ? editDrop : undefined}
        style={{
        position: "relative", width: "100%", overflow: "hidden",
        touchAction: edit ? "none" : undefined,
        cursor: edit && edit.armed ? "crosshair" : undefined,
        aspectRatio: `${vbW} / ${vbH}`,
        borderRadius: noBorder ? 0 : 18,
        border: noBorder ? "none" : `1px solid ${C.bdr}`,
        background: "linear-gradient(180deg,#cfe4ea 0%,#d9ead8 22%,#b6d29c 40%,#a3c489 100%)",
      }}>
        {/* ═══ SVG base layer ═══ */}
        <svg viewBox={`0 0 ${vbW} ${vbH}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}>
          <defs>
            <clipPath id="grove-ground-clip">
              <polygon points={polyPoints([P(0, 0), P(fW, 0), P(fW, fH), P(0, fH)])}/>
            </clipPath>
            <radialGradient id="grove-grass" cx="45%" cy="35%" r="80%">
              <stop offset="0%" stopColor="#b8d49d"/><stop offset="100%" stopColor="#98bb7c"/>
            </radialGradient>
          </defs>

          {/* ground diamond + soft drop shadow */}
          <polygon points={polyPoints([P(0, 0.6), P(fW, 0.6), P(fW, fH + 0.6), P(0, fH + 0.6)])} fill="rgba(30,56,34,.16)"/>
          <polygon points={polyPoints([P(0, 0), P(fW, 0), P(fW, fH), P(0, fH)])} fill="url(#grove-grass)" stroke="#8aae70" strokeWidth="1.5"/>
          <g clipPath="url(#grove-ground-clip)" stroke="#7fa468" strokeOpacity=".28" strokeWidth="1">
            {gridLines.map((ln, i) => (
              <line key={i} x1={ln[0][0]} y1={ln[0][1]} x2={ln[1][0]} y2={ln[1][1]}/>
            ))}
          </g>

          {/* zones back-to-front */}
          {scene.zs.map(({ z, x0, y0, w, h, x1, y1, E, G, T, building, patches, orchardPlots }) => {
            const cc = TYPE_COLORS[z.type] || TYPE_COLORS.default;
            const hovered = hoverId === z.id;
            const common = {
              onClick: (e) => { if (edit) e.stopPropagation(); clickZone(z); },
              onPointerDown: edit ? (e) => startZoneDrag(z, e) : undefined,
              onMouseEnter: interactive ? () => setHoverId(z.id) : undefined,
              onMouseLeave: interactive ? () => setHoverId(null) : undefined,
              style: {
                cursor: edit
                  ? (editPtr && editPtr.id === z.id && editPtr.mode === "drag" ? "grabbing" : "grab")
                  : (interactive || onZoneClick ? "pointer" : "default"),
                touchAction: edit ? "none" : undefined,
              },
            };
            const isEditSel = edit && edit.selectedId === z.id;

            if (building) {
              const bc = BUILDING_COLORS[z.type] || BUILDING_COLORS.storage;
              const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
              const R = { tl: P(x0, y0, E), tr: P(x1, y0, E), br: P(x1, y1, E), bl: P(x0, y1, E) };
              // roof overhang: expand footprint 8% around center, at wall height
              const ox0 = cx - (w / 2) * 1.08, ox1 = cx + (w / 2) * 1.08;
              const oy0 = cy - (h / 2) * 1.08, oy1 = cy + (h / 2) * 1.08;
              const RO = { tl: P(ox0, oy0, E), tr: P(ox1, oy0, E), br: P(ox1, oy1, E), bl: P(ox0, oy1, E) };
              const r1 = w >= h ? P(ox0, cy, E) : P(cx, oy0, E);
              const r2 = w >= h ? P(ox1, cy, E) : P(cx, oy1, E);
              // door on the right (x = x1) wall
              const dW = Math.min(1.6, w * 0.3), dCy = cy;
              const d1 = P(x1, dCy - dW / 2), d2 = P(x1, dCy + dW / 2);
              const d1t = P(x1, dCy - dW / 2, E * 0.72), d2t = P(x1, dCy + dW / 2, E * 0.72);
              return (
                <g key={z.id} {...common} data-grove-building={z.type}>
                  <ellipse cx={(G.br[0] + G.tl[0]) / 2} cy={(G.br[1] + G.tl[1]) / 2 + 3} rx={Math.abs(G.tr[0] - G.bl[0]) / 2 + 4} ry={Math.abs(G.br[1] - G.tl[1]) / 5} fill="rgba(30,56,34,.18)"/>
                  <polygon points={polyPoints([T.bl, T.br, G.br, G.bl])} fill={bc.wl} opacity={hovered ? .92 : 1}/>
                  <polygon points={polyPoints([T.tr, T.br, G.br, G.tr])} fill={bc.wr} opacity={hovered ? .92 : 1}/>
                  <polygon points={polyPoints([d1t, d2t, d2, d1])} fill={bc.door}/>
                  <polygon points={polyPoints([RO.tl, RO.tr, RO.br, RO.bl])} fill={bc.roof} stroke={bc.ridge} strokeWidth="1"/>
                  <line x1={r1[0]} y1={r1[1]} x2={r2[0]} y2={r2[1]} stroke={bc.ridge} strokeWidth={Math.max(1.5, U * 0.12)}/>
                  {isEditSel && <polygon points={polyPoints([G.tl, G.tr, G.br, G.bl])} fill="none" stroke="#f1df45" strokeWidth="2.5" strokeDasharray="6 4"/>}
                </g>
              );
            }

            if (z.type === "water") {
              return (
                <g key={z.id} {...common}>
                  <polygon points={polyPoints([G.tl, G.tr, G.br, G.bl])} fill={cc.top} stroke={cc.r} strokeWidth="1.2"/>
                  <path d={`M ${P(x0 + w * .25, y0 + h * .4)[0]} ${P(x0 + w * .25, y0 + h * .4)[1]} q ${U * .8} ${-U * .25} ${U * 1.6} 0`} stroke={cc.detail} strokeWidth="1.6" fill="none" strokeLinecap="round"/>
                  <path d={`M ${P(x0 + w * .45, y0 + h * .65)[0]} ${P(x0 + w * .45, y0 + h * .65)[1]} q ${U * .7} ${-U * .22} ${U * 1.4} 0`} stroke={cc.detail} strokeWidth="1.4" fill="none" strokeLinecap="round"/>
                  {isEditSel && <polygon points={polyPoints([G.tl, G.tr, G.br, G.bl])} fill="none" stroke="#f1df45" strokeWidth="2.5" strokeDasharray="6 4"/>}
                </g>
              );
            }

            /* raised plate: two side faces + top */
            const details = [];
            if (z.type === "veg") {
              const n = Math.max(3, Math.min(10, Math.round(h / 1.6)));
              for (let i = 1; i < n; i++) {
                const yy = y0 + (h * i) / n;
                details.push(<line key={i} x1={P(x0 + 0.5, yy, E)[0]} y1={P(x0 + 0.5, yy, E)[1]} x2={P(x1 - 0.5, yy, E)[0]} y2={P(x1 - 0.5, yy, E)[1]} stroke={cc.detail} strokeWidth={Math.max(1.4, U * 0.14)}/>);
              }
            }
            if (z.type === "herbs" || z.type === "pasture") {
              const sx = 2.4, sy = 2.2; let k = 0;
              for (let gx = x0 + 1.2; gx < x1 - 0.6 && k < 16; gx += sx) {
                for (let gy = y0 + 1.1; gy < y1 - 0.6 && k < 16; gy += sy) {
                  const pt = P(gx, gy, E); k++;
                  details.push(<circle key={"t" + k} cx={pt[0]} cy={pt[1]} r={Math.max(1.6, U * 0.16)} fill={cc.detail} opacity=".8"/>);
                }
              }
            }
            if (z.type === "greenhouse") {
              const nx = Math.max(2, Math.min(6, Math.round(w / 2)));
              for (let i = 1; i < nx; i++) {
                const xx = x0 + (w * i) / nx;
                details.push(<line key={"gx" + i} x1={P(xx, y0, E)[0]} y1={P(xx, y0, E)[1]} x2={P(xx, y1, E)[0]} y2={P(xx, y1, E)[1]} stroke="#fff" strokeOpacity=".55" strokeWidth="1.2"/>);
              }
              const ny = Math.max(2, Math.min(5, Math.round(h / 2)));
              for (let i = 1; i < ny; i++) {
                const yy = y0 + (h * i) / ny;
                details.push(<line key={"gy" + i} x1={P(x0, yy, E)[0]} y1={P(x0, yy, E)[1]} x2={P(x1, yy, E)[0]} y2={P(x1, yy, E)[1]} stroke="#fff" strokeOpacity=".45" strokeWidth="1.2"/>);
              }
            }

            /* orchard trees, one per active plot (max 6), else 2 decorative */
            const trees = [];
            if (z.type === "orchard") {
              const n = Math.max(orchardPlots.length > 0 ? Math.min(orchardPlots.length, 6) : 2, 1);
              const cols = Math.ceil(Math.sqrt(n));
              const rowsN = Math.ceil(n / cols);
              for (let i = 0; i < n; i++) {
                const ci = i % cols, ri = Math.floor(i / cols);
                const tx = x0 + w * ((ci + 0.5) / cols);
                const ty = y0 + h * ((ri + 0.6) / rowsN);
                const base = P(tx, ty, E);
                const plot = orchardPlots[i];
                const isReady = plot && plot.harvestDate && plot.harvestDate <= today;
                const tr = Math.max(6, U * 0.75);
                trees.push(
                  <g key={"tree" + i}>
                    <ellipse cx={base[0]} cy={base[1] + 2} rx={tr * 0.9} ry={tr * 0.32} fill="rgba(30,56,34,.2)"/>
                    <g className="grove-tree-sway" style={{ animationDelay: "-" + ((i * 1300) % 4600) + "ms" }}>
                      <rect x={base[0] - Math.max(1.6, U * 0.16)} y={base[1] - tr * 1.15} width={Math.max(3.2, U * 0.32)} height={tr * 1.2} rx="2" fill="#8a5a38"/>
                      <circle cx={base[0]} cy={base[1] - tr * 1.6} r={tr} fill="#3e7a4a"/>
                      <circle cx={base[0] + tr * 0.4} cy={base[1] - tr * 1.35} r={tr * 0.68} fill="#356a40" opacity=".92"/>
                      <circle cx={base[0] - tr * 0.38} cy={base[1] - tr * 1.85} r={tr * 0.45} fill="#4e8f5a"/>
                      {isReady && <circle cx={base[0]} cy={base[1] - tr * 1.6} r={tr + 3} fill="none" stroke="#e08a2e" strokeWidth="2" className="grove-ready-ring"/>}
                    </g>
                  </g>
                );
              }
            }

            return (
              <g key={z.id} {...common} data-grove-zone={z.type}>
                <polygon points={polyPoints([T.bl, T.br, G.br, G.bl])} fill={cc.l}/>
                <polygon points={polyPoints([T.tr, T.br, G.br, G.tr])} fill={cc.r}/>
                <polygon points={polyPoints([T.tl, T.tr, T.br, T.bl])} fill={cc.top} stroke={isEditSel ? "#f1df45" : cc.r} strokeWidth={isEditSel ? 2.5 : 1} strokeDasharray={isEditSel ? "6 4" : undefined} opacity={hovered ? .93 : 1}/>
                {patches.map(pt => {
                  const pwM = pt.pw * w;
                  const phM = pt.ph * h;
                  const mIn = Math.min(0.15, pwM * 0.14, phM * 0.14);
                  const px0 = x0 + pt.px * w + mIn;
                  const px1 = x0 + (pt.px + pt.pw) * w - mIn;
                  const py0 = y0 + pt.py * h + mIn;
                  const py1 = y0 + (pt.py + pt.ph) * h - mIn;
                  if (px1 <= px0 || py1 <= py0) return null;
                  const sf = STAGE_FILL[pt.stage] || STAGE_FILL.growing;
                  return (
                    <polygon
                      key={"patch" + pt.plotId}
                      points={polyPoints([P(px0, py0, E), P(px1, py0, E), P(px1, py1, E), P(px0, py1, E)])}
                      fill={sf.fill}
                      stroke={sf.stroke}
                      strokeWidth={pt.stage === "ready" ? 1.6 : 1}
                      opacity=".96"
                    />
                  );
                })}
                {details}
                {trees}
              </g>
            );
          })}
        </svg>

        {/* ═══ HTML overlay: sprites, tags, animals, markers ═══ */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {scene.zs.map(({ z, x0, y0, w, h, E, patches, building }) => {
            const groups = zoneAnimalGroups(z, data.livestock && data.livestock.animals).slice(0, 2);
            const sp = isPlantZone(z.type) ? zoneSpace[z.id] : null;
            const fillPct = sp && sp.totalM2 > 0 ? Math.round((sp.pct || 0) * 100) : null;
            const zoneTasks = edit ? null : (tasksByZone[z.id] || null);
            const isEditSel = edit && edit.selectedId === z.id;
            const handleCorners = isEditSel ? [
              { c: "tl", m: [x0, y0] }, { c: "tr", m: [x0 + w, y0] },
              { c: "br", m: [x0 + w, y0 + h] }, { c: "bl", m: [x0, y0 + h] },
            ] : [];
            const tagPos = pct(P(x0 + w / 2, y0 + h, building ? -4 : 2));
            const centerTop = pct(P(x0 + w / 2, y0 + h / 2, E + (building ? 30 : 34)));
            return (
              <React.Fragment key={z.id}>
                {/* crop sprites */}
                {patches.map(pt => {
                  const mx = x0 + (pt.px + pt.pw / 2) * w;
                  const my = y0 + (pt.py + pt.ph / 2) * h;
                  const pos = pct(P(mx, my, E));
                  const ready = pt.stage === "ready";
                  const grown = pt.growthPct >= 0.5;
                  return (
                    <div key={pt.plotId} data-grove-sprite={pt.stage} style={{
                      position: "absolute", ...pos, transform: "translate(-50%,-92%)",
                      display: "flex", flexDirection: "column", alignItems: "center", pointerEvents: "none",
                    }}>
                      <div className="grove-pop" style={{ animationDelay: (spriteHash(pt.plotId) % 5) * 0.07 + "s" }}>
                        <div className={ready ? "grove-ready-halo" : ""} style={{
                          borderRadius: 99, padding: ready ? 3 : 0,
                          background: ready ? "rgba(255,244,220,.9)" : "transparent",
                          border: ready ? "1.6px solid #e08a2e" : "none",
                          display: "flex",
                        }}>
                          <span className="grove-sway" style={{ animationDelay: "-" + (spriteHash(pt.plotId) % 3900) + "ms" }}>
                            {ready || grown
                              ? <FarmIcon name={pt.crop} emoji={(cropMap.get(pt.crop) || {}).emoji || "🌱"} size={ready ? 22 : 17}/>
                              : <SproutGlyph size={pt.stage === "growing" ? 15 : 12}/>}
                          </span>
                        </div>
                      </div>
                      <div style={{ width: ready ? 20 : 14, height: 4, borderRadius: 99, background: "rgba(30,56,34,.22)", marginTop: 1 }}/>
                    </div>
                  );
                })}

                {/* animal chips */}
                {groups.map((g, gi) => {
                  const pos = building
                    ? pct(P(x0 + w * (0.28 + gi * 0.36), y0 + h * 0.9, 0))
                    : pct(P(x0 + w * (0.32 + gi * 0.3), y0 + h * 0.62, E));
                  return (
                    <div key={g.type} style={{
                      position: "absolute", ...pos, transform: "translate(-50%,-90%)",
                      display: "flex", alignItems: "center", gap: 2, pointerEvents: "none",
                      filter: "drop-shadow(0 2px 2px rgba(30,56,34,.3))",
                    }}>
                      <FarmIcon name={g.type} emoji="🐔" size={15}/>
                      {g.count > 1 && <span style={{ fontSize: 9, fontWeight: 800, color: "#2c3a2c", background: "rgba(255,255,255,.85)", borderRadius: 99, padding: "1px 4px" }}>×{g.count}</span>}
                    </div>
                  );
                })}

                {/* zone tag */}
                <button onClick={(e) => { if (edit) e.stopPropagation(); clickZone(z); }} style={{
                  position: "absolute", ...tagPos, transform: "translate(-50%,12%)",
                  pointerEvents: "auto", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 5,
                  background: "rgba(255,255,255,.88)", backdropFilter: "blur(5px)",
                  border: "1px solid rgba(255,255,255,.9)", borderRadius: 99,
                  padding: "2px 8px", minHeight: "unset", whiteSpace: "nowrap",
                  font: "600 9px Inter, sans-serif", color: "#22301f",
                  boxShadow: "0 1px 4px rgba(20,36,24,.2)",
                }} data-icon="true">
                  {z.name}
                  {edit && <em style={{ fontStyle: "normal", fontWeight: 700, color: "#5e6e5e" }}>{(z.wM || 10).toFixed(0)}×{(z.hM || 8).toFixed(0)}m</em>}
                  {!edit && fillPct !== null && <em style={{ fontStyle: "normal", fontWeight: 700, color: zoneFillColor(fillPct) }}>{fillPct}%</em>}
                  {!edit && groups.length > 0 && fillPct === null && (
                    <em style={{ fontStyle: "normal", fontWeight: 700, color: "#5e6e5e" }}>
                      {groups.reduce((s, g) => s + g.count, 0)}
                    </em>
                  )}
                </button>

                {/* editor resize handles — 4 corners of the selected zone */}
                {handleCorners.map(hc => {
                  const hp = pct(P(hc.m[0], hc.m[1], building ? 0 : E));
                  return (
                    <div key={hc.c}
                      onPointerDown={(e) => startCornerResize(z, hc.c, e)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: "absolute", ...hp, transform: "translate(-50%,-50%)",
                        width: 16, height: 16, borderRadius: 8,
                        background: "#fff", border: "2.5px solid #f1df45",
                        boxShadow: "0 1px 5px rgba(20,36,24,.4)",
                        pointerEvents: "auto", cursor: "grab", touchAction: "none", zIndex: 6,
                      }}/>
                  );
                })}

                {/* task markers */}
                {zoneTasks && (
                  <div style={{
                    position: "absolute", ...centerTop, transform: "translate(-50%,-100%)",
                    display: "flex", gap: 5, pointerEvents: "none",
                  }}>
                    {zoneTasks.map((m, mi) => (
                      <button key={m.kind} onClick={() => clickZone(z)} data-icon="true"
                        className="grove-bob" style={{
                          animationDelay: (mi * 0.5) + "s",
                          pointerEvents: "auto", cursor: "pointer",
                          position: "relative", minHeight: "unset",
                          width: 26, height: 26, borderRadius: 99,
                          background: "#fff", border: m.kind === "harvest" ? "2px solid #e8a13c" : "1px solid rgba(30,50,34,.14)",
                          boxShadow: "0 3px 8px rgba(18,34,22,.28)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                        <MarkerGlyph kind={m.kind} size={13}/>
                        {m.count > 1 && (
                          <span style={{
                            position: "absolute", top: -5, right: -5,
                            background: m.kind === "harvest" ? "#e08a2e" : C.green,
                            color: "#fff", fontSize: 8.5, fontWeight: 800,
                            borderRadius: 99, padding: "1.5px 4.5px",
                          }}>{m.count}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* time-of-day tint */}
        {showTimeTint && tint && <div style={{ position: "absolute", inset: 0, background: tint, pointerEvents: "none", transition: "background 2s ease" }}/>}

        {/* Edit button */}
        {showEditButton && onEditLayout && (
          <button onClick={onEditLayout} style={{
            position: "absolute", top: 10, right: 10,
            background: "rgba(255,255,255,.85)", backdropFilter: "blur(6px)",
            border: "1px solid rgba(255,255,255,.95)", borderRadius: 99,
            padding: "6px 13px", fontSize: 11.5, fontWeight: 600, color: "#1c2a1e",
            cursor: "pointer", boxShadow: "0 1px 5px rgba(20,36,24,.18)", minHeight: "unset",
          }} data-icon="true">✎ Edit</button>
        )}
      </div>

      {showHelperText && (
        <div style={{ fontSize: 10.5, color: C.t3, textAlign: "center", marginTop: 6 }}>
          Tap a zone or a floating task to open it
        </div>
      )}

      {selZone && (
        <GroveZoneCard
          zone={selZone}
          data={data}
          setData={setData}
          onClose={() => setSelZoneId(null)}
          onEditLayout={onEditLayout}
          onPlantInZone={onPlantInZone}
          onShowCrops={onShowCrops}
        />
      )}
    </div>
  );
}
