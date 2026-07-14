/* ═══════════════════════════════════════════
   GROVE SCENE v2 — top-down illustrated farm
   Phase 12. One engine for home / walk / layout /
   designer. Bird's-eye camera, reference-art world:
   grass, tree border, gate, auto roads, fences,
   detailed buildings, per-stage crop rows, animals,
   ornaments. UI layer (tags, markers, stage rings,
   zone card) unchanged from Phase 11.
   MARKER: GROVE_SCENE_V2_TOPDOWN
   ═══════════════════════════════════════════ */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { C } from "../../lib/theme";
import { rCM } from "../../lib/regional";
import { buildZoneSpaceMap } from "../../lib/farm-calc";
import FarmIcon from "../../components/FarmIcon";
import { localDateFromKey, todayLocalKey } from "../../lib/utils";
import GroveZoneCard from "./GroveZoneCard";
import { isPlantZone, zoneAnimalGroups, zoneFillColor } from "../farm/living/visuals";
import { makeProjector, depthOf, srand } from "./sceneMath";
import { resolveEnvironment } from "../../lib/environment";

/* ── World palette (fixed physical colors; night handled by hour tint) ── */
const W = {
  grass: "#7cb342", grassLight: "#82b94b", grassDark: "#6da33a", grassPatch: "#76ad3e",
  soil: "#9c7247", soilDark: "#855f38", soilRow: "#8a6540",
  fence: "#8d6e46", post: "#6b4f2e", frame: "#a0805a",
  road: "#d9b779", roadDash: "#e2c48c",
  canopy: "#4e8c3a", canopyHi: "#5d9c46", canopyDk: "#447e32", shadow: "#679b3a", trunk: "#6b4f2e",
  water: "#3d8cc4", waterMid: "#4a9fd8", waterHi: "#5db0e4", shimmer: "#7ec3ec",
  pastureG: "#8ec258", orchardG: "#9cc961",
};
/* Patch stage ring — SAME semantics as legend / zone cards (A-layer) */
const STAGE_FILL = {
  just_planted: { fill: "#c9a97b", stroke: "#a9895c" },
  growing:      { fill: "#8cbd71", stroke: "#6d9d55" },
  ready:        { fill: "#e3b45c", stroke: "#e08a2e" },
};
const BUILDING_TYPES = new Set(["house", "barn", "storage"]);
const SOIL_TYPES = new Set(["veg", "herbs", "raised", "container"]);
const FRAMED_TYPES = new Set(["raised", "container"]);

/* Ornaments (user-placed, max 10 — placed via Farm Designer) */
// eslint-disable-next-line react-refresh/only-export-components -- palette constant consumed by Farm Designer; dev-only Fast Refresh nit
export const ORNAMENT_TYPES = [
  { id: "tree",     label: "Tree",      icon: "🌳" },
  { id: "bush",     label: "Bush",      icon: "🌿" },
  { id: "flowers",  label: "Flowers",   icon: "🌼" },
  { id: "rock",     label: "Rocks",     icon: "🪨" },
  { id: "pond",     label: "Mini pond", icon: "💧" },
  { id: "haybale",  label: "Hay bale",  icon: "🌾" },
  { id: "woodpile", label: "Wood pile", icon: "🪵" },
  { id: "bench",    label: "Bench",     icon: "🪑" },
];
export const MAX_ORNAMENTS = 10;

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

/* ── Top-down sprite fragments (SVG element arrays) ── */
function TreeSprite({ x, y, r, dark, sway, seed }) {
  return (
    <g>
      <ellipse cx={x + r * 0.25} cy={y + r * 0.85} rx={r * 1.05} ry={r * 0.38} fill={W.shadow}/>
      <g className={sway ? "grove-tree-sway" : undefined} style={sway ? { animationDelay: "-" + Math.round(srand(seed) * 5000) + "ms" } : undefined}>
        <circle cx={x} cy={y} r={r} fill={dark ? "#3f7530" : W.canopy}/>
        <circle cx={x + r * 0.42} cy={y - r * 0.36} r={r * 0.52} fill={W.canopyHi}/>
        <circle cx={x - r * 0.46} cy={y - r * 0.3} r={r * 0.42} fill={W.canopyDk}/>
      </g>
    </g>
  );
}

function CowSprite({ x, y, s, flip, seed }) {
  const f = flip ? -1 : 1;
  return (
    <g className="grove-graze" style={{ animationDelay: "-" + Math.round(srand(seed) * 4000) + "ms" }}>
      <ellipse cx={x} cy={y + s * 0.55} rx={s * 1.15} ry={s * 0.4} fill={W.shadow}/>
      <ellipse cx={x} cy={y} rx={s} ry={s * 0.62} fill="#f4f2ee"/>
      <ellipse cx={x - s * 0.35 * f} cy={y - s * 0.08} rx={s * 0.36} ry={s * 0.27} fill="#2e2e2e"/>
      <ellipse cx={x + s * 0.42 * f} cy={y + s * 0.18} rx={s * 0.3} ry={s * 0.2} fill="#2e2e2e"/>
      <circle cx={x + s * 0.92 * f} cy={y - s * 0.18} r={s * 0.32} fill="#f4f2ee"/>
      <circle cx={x + s * 1.05 * f} cy={y - s * 0.26} r={s * 0.09} fill="#2e2e2e"/>
    </g>
  );
}

function SheepSprite({ x, y, s, flip, seed }) {
  const f = flip ? -1 : 1;
  return (
    <g className="grove-graze" style={{ animationDelay: "-" + Math.round(srand(seed) * 4000) + "ms" }}>
      <ellipse cx={x} cy={y + s * 0.5} rx={s} ry={s * 0.36} fill={W.shadow}/>
      <ellipse cx={x} cy={y} rx={s * 0.88} ry={s * 0.58} fill="#f0ece2"/>
      <circle cx={x - s * 0.3} cy={y - s * 0.22} r={s * 0.3} fill="#faf7ef"/>
      <circle cx={x + s * 0.25} cy={y - s * 0.26} r={s * 0.26} fill="#faf7ef"/>
      <circle cx={x + s * 0.8 * f} cy={y} r={s * 0.24} fill="#4a4038"/>
    </g>
  );
}

function ChickenSprite({ x, y, s, seed }) {
  return (
    <g className="grove-graze" style={{ animationDelay: "-" + Math.round(srand(seed) * 3000) + "ms" }}>
      <ellipse cx={x} cy={y + s * 0.55} rx={s * 0.75} ry={s * 0.3} fill={W.shadow}/>
      <circle cx={x} cy={y} r={s * 0.6} fill="#f5f0e6"/>
      <circle cx={x + s * 0.42} cy={y - s * 0.4} r={s * 0.2} fill="#e8913a"/>
      <circle cx={x + s * 0.18} cy={y - s * 0.18} r={s * 0.1} fill="#2e2e2e"/>
    </g>
  );
}

function PigSprite({ x, y, s, flip, seed }) {
  const f = flip ? -1 : 1;
  return (
    <g className="grove-graze" style={{ animationDelay: "-" + Math.round(srand(seed) * 4000) + "ms" }}>
      <ellipse cx={x} cy={y + s * 0.5} rx={s} ry={s * 0.36} fill={W.shadow}/>
      <ellipse cx={x} cy={y} rx={s * 0.9} ry={s * 0.58} fill="#e8a7a0"/>
      <circle cx={x + s * 0.82 * f} cy={y - s * 0.1} r={s * 0.3} fill="#e8a7a0"/>
      <ellipse cx={x + s * 1.02 * f} cy={y - s * 0.08} rx={s * 0.14} ry={s * 0.11} fill="#c97e76"/>
    </g>
  );
}

function animalSprite(rawSpecies, key, x, y, s, seed) {
  const species = String(rawSpecies || "").toLowerCase();
  const flip = srand(seed + 3) > 0.5;
  if (species === "chicken" || species === "duck" || species === "quail" || species === "turkey" || species === "goose")
    return <ChickenSprite key={key} x={x} y={y} s={s * 0.7} seed={seed}/>;
  if (species === "sheep" || species === "goat" || species === "alpaca")
    return <SheepSprite key={key} x={x} y={y} s={s * 0.85} flip={flip} seed={seed}/>;
  if (species === "pig")
    return <PigSprite key={key} x={x} y={y} s={s * 0.85} flip={flip} seed={seed}/>;
  if (species === "rabbit")
    return <ChickenSprite key={key} x={x} y={y} s={s * 0.55} seed={seed}/>;
  return <CowSprite key={key} x={x} y={y} s={s} flip={flip} seed={seed}/>;
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
     onZoneGeom(id, {xM,yM,wM,hM}), onPlaceAt(xM,yM,type?), armed, dragType,
     ornamentMode, onOrnamentMove(id, xM, yM), onOrnamentSelect(id) } */
  edit = null,
}) {
  const boxRef = useRef(null);
  /* editor pointer state — {mode:"drag"|"resize"|"ornament", id, corner?, startSX, startSY, orig} */
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

  /* Stage 4 (brief §17): pause CSS animations while the tab is hidden */
  const [tabHidden, setTabHidden] = useState(() => typeof document !== "undefined" && document.visibilityState === "hidden");
  useEffect(() => {
    function onVis() { setTabHidden(document.visibilityState === "hidden"); }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
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

  const env = resolveEnvironment(data);

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

  /* Pre-compute everything render needs */
  const scene = useMemo(() => {
    const zs = [...(data.zones || [])].sort((a, b) => depthOf(a) - depthOf(b)).map(z => {
      const x0 = z.xM || 0, y0 = z.yM || 0, w = z.wM || 10, h = z.hM || 8;
      const x1 = x0 + w, y1 = y0 + h;
      const building = BUILDING_TYPES.has(z.type);
      const patches = building || z.type === "orchard" ? [] : patchesForZone(z);
      const orchardPlots = z.type === "orchard"
        ? (data.garden && data.garden.plots ? data.garden.plots : []).filter(pp => pp.zone === z.id && pp.status !== "harvested")
        : [];
      const readyCount =
        patches.filter(pt => pt.stage === "ready").length +
        orchardPlots.filter(pp => pp.harvestDate && pp.harvestDate <= today).length;
      return { z, x0, y0, w, h, x1, y1, E: 0, building, patches, orchardPlots, readyCount };
    });
    return { zs };
  // patchesForZone closes over data/cropMap/today — recompute on those
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.zones, data.garden, PROJ, cropMap, today]);

  /* ── Auto road network: house front (or farm center) → each zone + gate ── */
  const roads = useMemo(() => {
    if (env !== "farm") return [];
    const zs = data.zones || [];
    if (zs.length === 0) return [];
    const house = zs.find(z => z.type === "house");
    const ax = house ? (house.xM || 0) + (house.wM || 10) / 2 : fW / 2;
    const ay = house ? (house.yM || 0) + (house.hM || 8) + 0.6 : fH / 2;
    const padM = PROJ.pad / PROJ.unit;
    const segs = [];
    /* gate stub — anchor down, across, out through the gate */
    segs.push([[ax, ay], [ax, fH - 0.01], [fW / 2, fH - 0.01], [fW / 2, fH + padM * 0.9]]);
    zs.forEach(z => {
      if (z === house || z.road === false || z.type === "water" || z.type === "compost") return;
      const cx = (z.xM || 0) + (z.wM || 10) / 2;
      const cy = (z.yM || 0) + (z.hM || 8) / 2;
      const mids = [
        [cx, z.yM || 0], [cx, (z.yM || 0) + (z.hM || 8)],
        [z.xM || 0, cy], [(z.xM || 0) + (z.wM || 10), cy],
      ];
      let best = mids[0]; let bd = Infinity;
      mids.forEach(m => {
        const d = Math.abs(m[0] - ax) + Math.abs(m[1] - ay);
        if (d < bd) { bd = d; best = m; }
      });
      segs.push([[ax, ay], [best[0], ay], [best[0], best[1]]]);
    });
    return segs;
  }, [data.zones, fW, fH, PROJ, env]);

  /* ── World scatter: border trees, free trees, tufts, flowers (seeded) ── */
  const world = useMemo(() => {
    const zs = data.zones || [];
    const padM = PROJ.pad / PROJ.unit;
    const insideZone = (x, y, m) => zs.some(z => {
      const zx = z.xM || 0, zy = z.yM || 0, zw = z.wM || 10, zh = z.hM || 8;
      return x > zx - m && x < zx + zw + m && y > zy - m && y < zy + zh + m;
    });
    const border = [];
    const step = Math.max(4, fW / 11);
    let i = 0;
    if (env === "farm") {
    for (let x = step * 0.4; x < fW; x += step) {
      border.push({ x: x + (srand(i) - 0.5) * 2.4, y: -padM * (0.35 + srand(i + 50) * 0.3), r: 0.75 + srand(i + 99) * 0.5, i }); i++;
    }
    for (let x = step * 0.55; x < fW; x += step) {
      if (Math.abs(x - fW / 2) < Math.max(4, fW * 0.09)) { i++; continue; }
      border.push({ x: x + (srand(i) - 0.5) * 2.4, y: fH + padM * (0.35 + srand(i + 50) * 0.3), r: 0.75 + srand(i + 99) * 0.5, i }); i++;
    }
    const stepY = Math.max(4, fH / 9);
    for (let y = stepY * 0.5; y < fH; y += stepY) {
      border.push({ x: -padM * (0.35 + srand(i + 20) * 0.3), y: y + (srand(i) - 0.5) * 2, r: 0.7 + srand(i + 99) * 0.5, i }); i++;
      border.push({ x: fW + padM * (0.35 + srand(i + 21) * 0.3), y: y + (srand(i + 1) - 0.5) * 2, r: 0.7 + srand(i + 99) * 0.5, i }); i++;
    }
    }
    const free = [];
    if (env === "farm") {
    for (let k = 0; k < 4; k++) {
      const x = 2 + srand(k * 7 + 2) * (fW - 4);
      const y = 2 + srand(k * 7 + 5) * (fH - 4);
      if (!insideZone(x, y, 1.6)) free.push({ x, y, r: 0.9 + srand(k + 40) * 0.5, i: 200 + k });
    }
    }
    const tufts = [];
    if (env !== "balcony") {
    for (let k = 0; k < 16; k++) {
      const x = 1 + srand(k * 13 + 3) * (fW - 2);
      const y = 1 + srand(k * 13 + 9) * (fH - 2);
      if (!insideZone(x, y, 0.4)) tufts.push({ x, y, fl: srand(k + 77) > 0.62, i: k });
    }
    }
    return { border, free, tufts };
  }, [data.zones, fW, fH, PROJ, env]);

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
  const M = (m) => m * U;

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
  function startOrnamentDrag(o, e) {
    if (!edit) return;
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
    const [sx, sy] = toVB(e.clientX, e.clientY);
    setEditPtr({ mode: "ornament", id: o.id, startSX: sx, startSY: sy,
      orig: { xM: o.xM || 0, yM: o.yM || 0 } });
    edit.onOrnamentSelect && edit.onOrnamentSelect(o.id);
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
    if (editPtr.mode === "ornament") {
      edit.onOrnamentMove && edit.onOrnamentMove(editPtr.id, o.xM + dxM, o.yM + dyM);
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

  /* ── Fence helper: perimeter rail + posts every ~4m ── */
  function fenceEls(x0, y0, w, h, keyBase, dashed) {
    const els = [];
    els.push(<rect key={keyBase + "-rail"} x={P(x0, y0)[0]} y={P(x0, y0)[1]} width={M(w)} height={M(h)} rx={M(0.3)}
      fill="none" stroke={W.fence} strokeWidth={Math.max(1.4, U * 0.16)} strokeDasharray={dashed ? `${U * 0.7} ${U * 0.35}` : undefined}/>);
    const ps = Math.max(3.5, Math.min(6, w / 3));
    const post = (px, py, k) => {
      const c = P(px, py);
      els.push(<rect key={keyBase + "-p" + k} x={c[0] - Math.max(1.6, U * 0.14)} y={c[1] - Math.max(1.6, U * 0.14)}
        width={Math.max(3.2, U * 0.28)} height={Math.max(3.2, U * 0.28)} fill={W.post}/>);
    };
    let k = 0;
    for (let x = x0; x <= x0 + w + 0.01; x += ps) { post(Math.min(x, x0 + w), y0, k++); post(Math.min(x, x0 + w), y0 + h, k++); }
    for (let y = y0 + ps; y < y0 + h; y += ps) { post(x0, y, k++); post(x0 + w, y, k++); }
    return els;
  }

  /* ── Crop patch renderer: per-stage rows + A-layer stage ring ── */
  function patchEls(z, pt, keyBase) {
    const inset = 0.18;
    const px0 = z.xM + pt.px * z.wM + inset, py0 = z.yM + pt.py * z.hM + inset;
    const pw = Math.max(0.5, pt.pw * z.wM - inset * 2), ph = Math.max(0.5, pt.ph * z.hM - inset * 2);
    const o = P(px0, py0);
    const st = STAGE_FILL[pt.stage] || STAGE_FILL.just_planted;
    const horiz = pw >= ph;
    const els = [];
    const base = pt.stage === "ready" ? "#caa15c" : pt.stage === "growing" ? "#8a6a45" : "#a3794d";
    els.push(<rect key={keyBase + "-b"} x={o[0]} y={o[1]} width={M(pw)} height={M(ph)} rx={M(0.25)} fill={base}/>);
    const rowGap = 1.15;
    const n = Math.max(2, Math.floor((horiz ? ph : pw) / rowGap));
    const rowCol = pt.stage === "ready" ? "#d9a531" : pt.stage === "growing" ? "#6fae4e" : W.soilRow;
    const dashCol = pt.stage === "ready" ? "#f0d06a" : pt.stage === "growing" ? "#a4d685" : null;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const a = horiz ? P(px0 + 0.25, py0 + t * ph) : P(px0 + t * pw, py0 + 0.25);
      const b = horiz ? P(px0 + pw - 0.25, py0 + t * ph) : P(px0 + t * pw, py0 + ph - 0.25);
      els.push(<line key={keyBase + "-r" + i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
        stroke={rowCol} strokeWidth={Math.max(2, U * 0.42)} strokeLinecap="round"/>);
      if (dashCol && i % 2 === 0) {
        els.push(<line key={keyBase + "-d" + i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
          stroke={dashCol} strokeWidth={Math.max(1, U * 0.16)} strokeDasharray={`${U * 0.2} ${U * 0.65}`}/>);
      }
    }
    if (pt.stage === "ready" && pw * ph >= 22) {
      const bc = P(px0 + pw * 0.72, py0 + ph * 0.32);
      const br = Math.min(M(0.9), Math.min(M(pw), M(ph)) * 0.3);
      els.push(<ellipse key={keyBase + "-bs"} cx={bc[0] + br * 0.25} cy={bc[1] + br * 0.55} rx={br * 1.05} ry={br * 0.4} fill="#b9892f"/>);
      els.push(<circle key={keyBase + "-bl"} cx={bc[0]} cy={bc[1]} r={br} fill="#d9a531"/>);
      els.push(<circle key={keyBase + "-bl2"} cx={bc[0]} cy={bc[1]} r={br * 0.55} fill="none" stroke="#b9892f" strokeWidth={Math.max(1.2, br * 0.16)}/>);
    }
    els.push(<rect key={keyBase + "-ring"} x={o[0]} y={o[1]} width={M(pw)} height={M(ph)} rx={M(0.25)}
      fill="none" stroke={st.stroke} strokeWidth={1.6}/>);
    return els;
  }

  /* ── Ornament renderer (user-placed decorations, max 10) ── */
  function ornamentEls(o) {
    const c = P(o.xM || 0, o.yM || 0);
    const s = M(0.55);
    const sel = edit && edit.ornamentSelectedId === o.id;
    const drag = edit ? {
      onPointerDown: (e) => startOrnamentDrag(o, e),
      onClick: (e) => { e.stopPropagation(); edit.onOrnamentSelect && edit.onOrnamentSelect(o.id); },
      style: { cursor: "grab" },
    } : {};
    let body = null;
    if (o.type === "tree") body = <TreeSprite x={c[0]} y={c[1]} r={M(0.95)} sway seed={spriteHash(o.id)}/>;
    else if (o.type === "bush") body = (<g>
      <ellipse cx={c[0]} cy={c[1] + s * 0.6} rx={s * 1.2} ry={s * 0.4} fill={W.shadow}/>
      <circle cx={c[0] - s * 0.4} cy={c[1]} r={s * 0.7} fill={W.canopy}/>
      <circle cx={c[0] + s * 0.45} cy={c[1] + s * 0.1} r={s * 0.6} fill={W.canopyHi}/>
    </g>);
    else if (o.type === "flowers") body = (<g>
      <circle cx={c[0] - s * 0.5} cy={c[1]} r={s * 0.3} fill="#e8698a"/>
      <circle cx={c[0] + s * 0.2} cy={c[1] - s * 0.35} r={s * 0.3} fill="#e8b23a"/>
      <circle cx={c[0] + s * 0.55} cy={c[1] + s * 0.3} r={s * 0.3} fill="#f5f0e6"/>
      <ellipse cx={c[0]} cy={c[1] + s * 0.5} rx={s * 0.5} ry={s * 0.25} fill={W.canopyHi}/>
    </g>);
    else if (o.type === "rock") body = (<g>
      <ellipse cx={c[0]} cy={c[1] + s * 0.5} rx={s * 1.1} ry={s * 0.35} fill={W.shadow}/>
      <circle cx={c[0] - s * 0.3} cy={c[1]} r={s * 0.65} fill="#9aa0a5"/>
      <circle cx={c[0] + s * 0.45} cy={c[1] + s * 0.15} r={s * 0.45} fill="#aab0b4"/>
    </g>);
    else if (o.type === "pond") body = (<g>
      <ellipse cx={c[0]} cy={c[1]} rx={M(1.3)} ry={M(0.95)} fill={W.water}/>
      <ellipse cx={c[0]} cy={c[1]} rx={M(0.95)} ry={M(0.65)} fill={W.waterHi}/>
      <path className="grove-shimmer" d={`M ${c[0] - M(0.5)} ${c[1]} q ${M(0.25)} ${-M(0.12)} ${M(0.5)} 0`} stroke={W.shimmer} strokeWidth={Math.max(1.2, U * 0.14)} fill="none" strokeLinecap="round"/>
    </g>);
    else if (o.type === "haybale") body = (<g>
      <ellipse cx={c[0] + s * 0.2} cy={c[1] + s * 0.55} rx={s * 1.05} ry={s * 0.4} fill="#b9892f"/>
      <circle cx={c[0]} cy={c[1]} r={s * 0.9} fill="#d9a531"/>
      <circle cx={c[0]} cy={c[1]} r={s * 0.5} fill="none" stroke="#b9892f" strokeWidth={Math.max(1.4, s * 0.16)}/>
    </g>);
    else if (o.type === "woodpile") body = (<g>
      <circle cx={c[0] - s * 0.55} cy={c[1] + s * 0.2} r={s * 0.42} fill="#a8814f"/><circle cx={c[0] - s * 0.55} cy={c[1] + s * 0.2} r={s * 0.2} fill="#c69d64"/>
      <circle cx={c[0] + s * 0.35} cy={c[1] + s * 0.2} r={s * 0.42} fill="#a8814f"/><circle cx={c[0] + s * 0.35} cy={c[1] + s * 0.2} r={s * 0.2} fill="#c69d64"/>
      <circle cx={c[0] - s * 0.1} cy={c[1] - s * 0.35} r={s * 0.42} fill="#96703f"/><circle cx={c[0] - s * 0.1} cy={c[1] - s * 0.35} r={s * 0.2} fill="#b8905a"/>
    </g>);
    else body = (<g>
      <rect x={c[0] - s * 0.9} y={c[1] - s * 0.25} width={s * 1.8} height={s * 0.4} rx={s * 0.12} fill={W.frame}/>
      <rect x={c[0] - s * 0.75} y={c[1] + s * 0.15} width={s * 0.28} height={s * 0.5} fill={W.post}/>
      <rect x={c[0] + s * 0.47} y={c[1] + s * 0.15} width={s * 0.28} height={s * 0.5} fill={W.post}/>
    </g>);
    return (
      <g key={o.id} data-grove-ornament={o.type} {...drag}>
        {body}
        {sel && <circle cx={c[0]} cy={c[1]} r={M(1.6)} fill="none" stroke="#f1df45" strokeWidth="2.5" strokeDasharray="6 4"/>}
      </g>
    );
  }

  const ornaments = (data.ornaments || []).slice(0, MAX_ORNAMENTS);
  const roadW = Math.max(6, U * 1.3);
  const gate = P(fW / 2, fH);
  /* Stage 4: balcony frame geometry — clamped so huge per-meter scales
     (tiny balconies) never push the wall/railing outside the viewBox */
  const wallH = Math.max(8, P(0, 0)[1] - Math.min(8, U * 0.2));
  const railY = Math.min(vbH - 8, P(0, fH)[1] + Math.min(14, U * 0.35));
  const railPostH = Math.min(22, Math.max(8, U * 0.55));

  return (
    <div data-grove-scene-marker="scene-root" data-anim-paused={tabHidden ? "" : undefined} style={{ position: "relative" }}>
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
        background: env === "balcony" ? "#c9a570" : W.grass,
      }}>
        {/* ═══ SVG base layer — the world ═══ */}
        <svg viewBox={`0 0 ${vbW} ${vbH}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}>
          <rect x="0" y="0" width={vbW} height={vbH} fill={env === "balcony" ? "#c9a570" : W.grass}/>
          {env !== "balcony" && (
            <g data-env-el="grass-shading">
              <ellipse cx={vbW * 0.28} cy={vbH * 0.3} rx={vbW * 0.2} ry={vbH * 0.12} fill={W.grassLight}/>
              <ellipse cx={vbW * 0.72} cy={vbH * 0.62} rx={vbW * 0.22} ry={vbH * 0.13} fill={W.grassLight}/>
              <ellipse cx={vbW * 0.45} cy={vbH * 0.85} rx={vbW * 0.24} ry={vbH * 0.1} fill={W.grassPatch}/>
            </g>
          )}
          {env === "balcony" && (
            <g data-env-el="decking">
              {Array.from({ length: Math.max(2, Math.ceil(vbH / Math.max(12, U * 0.55))) }, function(_, i) {
                const py = (i + 1) * Math.max(12, U * 0.55);
                return <line key={"pk" + i} x1="0" y1={py} x2={vbW} y2={py} stroke="#b8935d" strokeWidth="1.6"/>;
              })}
            </g>
          )}
          {env === "farm" && <rect x={P(0, 0)[0]} y={P(0, 0)[1]} width={M(fW)} height={M(fH)} fill="none" stroke={W.grassDark} strokeWidth="1.5"/>}

          {/* grass tufts + wildflowers */}
          {world.tufts.map(t => {
            const c = P(t.x, t.y);
            if (t.fl) return (
              <g key={"tf" + t.i}>
                <circle cx={c[0]} cy={c[1]} r={Math.max(1.6, U * 0.14)} fill={srand(t.i + 5) > 0.5 ? "#e8698a" : "#e8b23a"}/>
                <circle cx={c[0] + U * 0.3} cy={c[1] + U * 0.16} r={Math.max(1.4, U * 0.12)} fill="#f5f0e6"/>
              </g>
            );
            return (
              <path key={"tf" + t.i} d={`M ${c[0]} ${c[1]} l ${U * 0.08} ${-U * 0.36} M ${c[0] + U * 0.16} ${c[1]} l ${U * 0.1} ${-U * 0.42} M ${c[0] - U * 0.14} ${c[1]} l ${U * 0.05} ${-U * 0.3}`}
                stroke="#69a238" strokeWidth={Math.max(1.1, U * 0.09)} fill="none" strokeLinecap="round"/>
            );
          })}

          {/* auto road network — base then center dashes */}
          {roads.map((seg, i) => (
            <polyline key={"rb" + i} points={seg.map(pt => P(pt[0], pt[1]).map(v => v.toFixed(1)).join(",")).join(" ")}
              fill="none" stroke={W.road} strokeWidth={roadW} strokeLinecap="round" strokeLinejoin="round"/>
          ))}
          {roads.map((seg, i) => (
            <polyline key={"rd" + i} points={seg.map(pt => P(pt[0], pt[1]).map(v => v.toFixed(1)).join(",")).join(" ")}
              fill="none" stroke={W.roadDash} strokeWidth={Math.max(2, roadW * 0.24)} strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray={`${roadW * 0.9} ${roadW * 0.75}`}/>
          ))}

          {/* gate at the bottom edge — farm only (brief §7: no farm elements off-farm) */}
          {env === "farm" && (
            <g data-env-el="farm-gate">
              <rect x={gate[0] - M(2.2)} y={gate[1] - M(0.25)} width={M(0.5)} height={M(1.6)} fill={W.post}/>
              <rect x={gate[0] + M(1.7)} y={gate[1] - M(0.25)} width={M(0.5)} height={M(1.6)} fill={W.post}/>
              <rect x={gate[0] - M(2.5)} y={gate[1] - M(0.6)} width={M(5)} height={M(0.45)} rx={M(0.12)} fill={W.fence}/>
            </g>
          )}

          {/* backyard: residential perimeter fence (brief §6) */}
          {env === "backyard" && (
            <g data-env-el="yard-fence">{fenceEls(0.25, 0.25, fW - 0.5, fH - 0.5, "yardfence", false)}</g>
          )}

          {/* balcony: apartment wall band (top) + railing (bottom) (brief §6) */}
          {env === "balcony" && (
            <g data-env-el="balcony-frame">
              <rect x="0" y="0" width={vbW} height={wallH} fill="#e6ddcc"/>
              <rect x="0" y={wallH - 3} width={vbW} height="3" fill="#c9bda6"/>
              <rect x={vbW / 2 - Math.min(28, U * 0.7)} y={Math.max(2, wallH - Math.min(56, U * 1.4))} width={Math.min(56, U * 1.4)} height={Math.min(56, U * 1.4)} rx="2" fill="#8a6a4a"/>
              <rect x="0" y={railY} width={vbW} height={Math.max(2.5, Math.min(5, U * 0.12))} rx="2" fill="#7a8288"/>
              {Array.from({ length: Math.max(4, Math.floor(fW / 1.1) + 1) }, function(_, i) {
                const n = Math.max(3, Math.floor(fW / 1.1));
                const px = (i / n) * (vbW - 6) + 3;
                return <rect key={"rl" + i} x={px} y={railY} width={Math.max(2, Math.min(4, U * 0.06))} height={railPostH} fill="#6b737a"/>;
              })}
            </g>
          )}

          {/* editor placement grid */}
          {edit && (
            <g stroke="#ffffff" strokeOpacity=".16" strokeWidth="1">
              {Array.from({ length: Math.floor(fW / 5) }, (_, i) => (
                <line key={"gx" + i} x1={P((i + 1) * 5, 0)[0]} y1={P((i + 1) * 5, 0)[1]} x2={P((i + 1) * 5, fH)[0]} y2={P((i + 1) * 5, fH)[1]}/>
              ))}
              {Array.from({ length: Math.floor(fH / 5) }, (_, i) => (
                <line key={"gy" + i} x1={P(0, (i + 1) * 5)[0]} y1={P(0, (i + 1) * 5)[1]} x2={P(fW, (i + 1) * 5)[0]} y2={P(fW, (i + 1) * 5)[1]}/>
              ))}
            </g>
          )}

          {/* zones */}
          {scene.zs.map(({ z, x0, y0, w, h, x1, y1, building, patches, orchardPlots }) => {
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
            const o = P(x0, y0);
            const sel = isEditSel ? (
              <rect x={o[0]} y={o[1]} width={M(w)} height={M(h)} rx={M(0.3)}
                fill="none" stroke="#f1df45" strokeWidth="2.5" strokeDasharray="6 4"/>
            ) : null;
            const hoverOp = hovered ? 0.94 : 1;

            if (building) {
              const horiz = w >= h;
              const ridgeCol = z.type === "barn" ? "#59646a" : z.type === "house" ? "#4a9660" : "#9a7a4e";
              const roofCol = z.type === "barn" ? "#4a5459" : z.type === "house" ? "#3e7d4f" : "#8a6a42";
              const lineCol = z.type === "barn" ? "#414a4f" : z.type === "house" ? "#356b43" : "#755735";
              const nLines = Math.max(2, Math.floor((horiz ? w : h) / 2.6));
              const lines = [];
              for (let i = 1; i <= nLines; i++) {
                const t = i / (nLines + 1);
                const a = horiz ? P(x0 + t * w, y0 + 0.3) : P(x0 + 0.3, y0 + t * h);
                const b = horiz ? P(x0 + t * w, y1 - 0.3) : P(x1 - 0.3, y0 + t * h);
                lines.push(<line key={"sl" + i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={lineCol} strokeWidth={Math.max(1, U * 0.09)}/>);
              }
              const rA = horiz ? P(x0 + 0.4, (y0 + y1) / 2) : P((x0 + x1) / 2, y0 + 0.4);
              const rB = horiz ? P(x1 - 0.4, (y0 + y1) / 2) : P((x0 + x1) / 2, y1 - 0.4);
              const shadowOff = M(0.35);
              const extra = [];
              if (z.type === "barn") {
                const stripH = Math.min(1.9, h * 0.28);
                const so = P(x0, y1 - stripH);
                extra.push(<rect key="fs" x={so[0]} y={so[1]} width={M(w)} height={M(stripH)} fill="#c0392b"/>);
                extra.push(<rect key="fs2" x={so[0]} y={so[1]} width={M(w)} height={Math.max(1.5, M(stripH) * 0.16)} fill="#a52f22"/>);
                const dw = Math.min(2.2, w * 0.32);
                const dpos = P((x0 + x1) / 2 - dw / 2, y1 - stripH + 0.12);
                extra.push(<rect key="dr" x={dpos[0]} y={dpos[1]} width={M(dw)} height={M(stripH - 0.24)} fill="#f5f0e6"/>);
                extra.push(<path key="dx" d={`M ${dpos[0]} ${dpos[1]} l ${M(dw)} ${M(stripH - 0.24)} M ${dpos[0] + M(dw)} ${dpos[1]} l ${-M(dw)} ${M(stripH - 0.24)}`}
                  stroke="#c0392b" strokeWidth={Math.max(1.6, U * 0.16)} fill="none"/>);
                const cup = P((x0 + x1) / 2, y0 + (horiz ? h * 0.5 : h * 0.28));
                extra.push(<rect key="cu" x={cup[0] - M(0.55)} y={cup[1] - M(0.55)} width={M(1.1)} height={M(1.1)} rx={M(0.12)} fill="#3a4246"/>);
                extra.push(<rect key="cu2" x={cup[0] - M(0.34)} y={cup[1] - M(0.34)} width={M(0.68)} height={M(0.68)} fill="#8fb6c9"/>);
                if (w >= 7 && h >= 5) {
                  const sc = P(x1 - 1.6, y0 + 1.7);
                  const sr = Math.min(M(1.25), Math.min(M(w), M(h)) * 0.2);
                  extra.push(<circle key="si" cx={sc[0]} cy={sc[1]} r={sr} fill="#d8dcdd" stroke="#b8bfc2" strokeWidth={Math.max(1.4, sr * 0.12)}/>);
                  extra.push(<circle key="si2" cx={sc[0]} cy={sc[1]} r={sr * 0.55} fill="none" stroke="#b8bfc2" strokeWidth={Math.max(1.1, sr * 0.1)}/>);
                  extra.push(<circle key="si3" cx={sc[0]} cy={sc[1]} r={sr * 0.2} fill="#c8ced0"/>);
                }
                if (w >= 8) {
                  const hb = P(x0 + 0.7, y1 - stripH - 1.5);
                  extra.push(<rect key="hb1" x={hb[0]} y={hb[1]} width={M(1.1)} height={M(1.1)} fill="#e6c14f"/>);
                  extra.push(<rect key="hb2" x={hb[0] + M(1.25)} y={hb[1]} width={M(1.1)} height={M(1.1)} fill="#d9a531"/>);
                }
              }
              if (z.type === "house") {
                const stripH = Math.min(1.5, h * 0.22);
                const so = P(x0 + 0.3, y1 - stripH);
                extra.push(<rect key="po" x={so[0]} y={so[1]} width={M(w - 0.6)} height={M(stripH)} fill="#d9cdb4"/>);
                for (let i = 0; i < 3; i++) {
                  const px = P(x0 + 0.8 + i * ((w - 1.6) / 2), y1 - stripH + 0.15);
                  extra.push(<rect key={"pp" + i} x={px[0]} y={px[1]} width={Math.max(2, U * 0.22)} height={M(stripH - 0.3)} fill={W.fence}/>);
                }
                const ch = P(x0 + w * 0.72, y0 + h * 0.3);
                extra.push(<rect key="ch" x={ch[0] - M(0.45)} y={ch[1] - M(0.45)} width={M(0.9)} height={M(0.9)} fill="#8f8f8f"/>);
                extra.push(<rect key="ch2" x={ch[0] - M(0.3)} y={ch[1] - M(0.3)} width={M(0.6)} height={M(0.6)} fill="#6e6e6e"/>);
              }
              if (z.type === "storage") {
                for (let i = 0; i < 3; i++) {
                  const lc = P(x1 - 1.1, y0 + 1 + i * 0.9);
                  extra.push(<circle key={"lg" + i} cx={lc[0]} cy={lc[1]} r={M(0.4)} fill="#a8814f"/>);
                  extra.push(<circle key={"lg2" + i} cx={lc[0]} cy={lc[1]} r={M(0.19)} fill="#c69d64"/>);
                }
              }
              return (
                <g key={z.id} {...common} data-grove-building={z.type} opacity={hoverOp}>
                  <rect x={o[0] + shadowOff} y={o[1] + shadowOff} width={M(w)} height={M(h)} rx={M(0.4)} fill="rgba(30,56,34,.22)"/>
                  <rect x={o[0]} y={o[1]} width={M(w)} height={M(h)} rx={M(0.4)} fill={roofCol}/>
                  {lines}
                  <line x1={rA[0]} y1={rA[1]} x2={rB[0]} y2={rB[1]} stroke={ridgeCol} strokeWidth={Math.max(2.5, U * 0.3)} strokeLinecap="round"/>
                  {extra}
                  {sel}
                </g>
              );
            }

            if (z.type === "water") {
              const rx = Math.min(M(w), M(h)) * 0.42;
              const i1 = P(x0 + 0.5, y0 + 0.5); const i2 = P(x0 + 1.1, y0 + 1.1);
              const s1 = P(x0 + w * 0.3, y0 + h * 0.4); const s2 = P(x0 + w * 0.45, y0 + h * 0.62);
              const rk = P(x0 + w * 0.14, y0 + h * 0.2); const rd = P(x1 - 0.6, y1 - 0.9);
              return (
                <g key={z.id} {...common} data-grove-zone="water" opacity={hoverOp}>
                  <rect x={o[0]} y={o[1]} width={M(w)} height={M(h)} rx={rx} fill={W.water}/>
                  <rect x={i1[0]} y={i1[1]} width={M(w - 1)} height={M(h - 1)} rx={rx * 0.85} fill={W.waterMid}/>
                  <rect x={i2[0]} y={i2[1]} width={M(w - 2.2)} height={M(h - 2.2)} rx={rx * 0.7} fill={W.waterHi}/>
                  <path className="grove-shimmer" d={`M ${s1[0]} ${s1[1]} q ${M(0.6)} ${-M(0.25)} ${M(1.2)} 0`} stroke={W.shimmer} strokeWidth={Math.max(1.4, U * 0.16)} fill="none" strokeLinecap="round"/>
                  <path className="grove-shimmer" style={{ animationDelay: "-1.4s" }} d={`M ${s2[0]} ${s2[1]} q ${M(0.5)} ${-M(0.2)} ${M(1)} 0`} stroke={W.shimmer} strokeWidth={Math.max(1.2, U * 0.14)} fill="none" strokeLinecap="round"/>
                  <circle cx={rk[0]} cy={rk[1]} r={M(0.42)} fill="#9aa0a5"/>
                  <circle cx={rk[0] + M(0.55)} cy={rk[1] - M(0.3)} r={M(0.28)} fill="#aab0b4"/>
                  <ellipse cx={rd[0] - M(1)} cy={rd[1]} rx={M(0.38)} ry={M(0.22)} fill="#6fae4e"/>
                  <path d={`M ${rd[0]} ${rd[1]} l ${M(0.1)} ${-M(0.7)} M ${rd[0] + M(0.22)} ${rd[1]} l ${M(0.14)} ${-M(0.8)}`} stroke="#5b8f3c" strokeWidth={Math.max(1.3, U * 0.13)} fill="none" strokeLinecap="round"/>
                  {sel}
                </g>
              );
            }

            if (z.type === "compost") {
              const c1 = P(x0 + w * 0.35, y0 + h * 0.5); const c2 = P(x0 + w * 0.68, y0 + h * 0.45);
              return (
                <g key={z.id} {...common} data-grove-zone="compost" opacity={hoverOp}>
                  <rect x={o[0]} y={o[1]} width={M(w)} height={M(h)} rx={M(0.35)} fill="#7a5c3a"/>
                  <rect x={o[0]} y={o[1]} width={M(w)} height={M(h)} rx={M(0.35)} fill="none" stroke={W.frame} strokeWidth={Math.max(2, U * 0.25)}/>
                  <circle cx={c1[0]} cy={c1[1]} r={Math.min(M(1.1), M(h) * 0.3)} fill="#6e5233"/>
                  <circle cx={c2[0]} cy={c2[1]} r={Math.min(M(0.85), M(h) * 0.24)} fill="#8a6a45"/>
                  {sel}
                </g>
              );
            }

            if (z.type === "greenhouse") {
              const horiz = w >= h;
              const rA = horiz ? P(x0 + 0.3, (y0 + y1) / 2) : P((x0 + x1) / 2, y0 + 0.3);
              const rB = horiz ? P(x1 - 0.3, (y0 + y1) / 2) : P((x0 + x1) / 2, y1 - 0.3);
              const inner = [];
              if (patches.length === 0) {
                const n = Math.max(2, Math.floor((horiz ? h : w) / 1.4));
                for (let i = 0; i < n; i++) {
                  const t = (i + 0.5) / n;
                  const a = horiz ? P(x0 + 0.7, y0 + t * h) : P(x0 + t * w, y0 + 0.7);
                  const b = horiz ? P(x1 - 0.7, y0 + t * h) : P(x0 + t * w, y1 - 0.7);
                  inner.push(<line key={"gr" + i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#9dc98a" strokeWidth={Math.max(2.4, U * 0.34)} strokeDasharray={`${U * 0.4} ${U * 0.3}`} strokeLinecap="round"/>);
                }
              }
              return (
                <g key={z.id} {...common} data-grove-zone="greenhouse" opacity={hoverOp}>
                  <rect x={o[0]} y={o[1]} width={M(w)} height={M(h)} rx={M(0.3)} fill="#e9e2cf"/>
                  {patches.map(pt => patchEls(z, pt, z.id + "-" + pt.plotId))}
                  {inner}
                  <rect x={o[0]} y={o[1]} width={M(w)} height={M(h)} rx={M(0.3)} fill="#cfe8ef" opacity="0.5"/>
                  <line x1={horiz ? P(x0 + w / 3, y0)[0] : o[0]} y1={horiz ? o[1] : P(x0, y0 + h / 3)[1]}
                        x2={horiz ? P(x0 + w / 3, y1)[0] : P(x1, y0)[0]} y2={horiz ? P(x0, y1)[1] : P(x0, y0 + h / 3)[1]}
                        stroke="#ffffff" strokeWidth="1" opacity="0.85"/>
                  <line x1={horiz ? P(x0 + w * 2 / 3, y0)[0] : o[0]} y1={horiz ? o[1] : P(x0, y0 + h * 2 / 3)[1]}
                        x2={horiz ? P(x0 + w * 2 / 3, y1)[0] : P(x1, y0)[0]} y2={horiz ? P(x0, y1)[1] : P(x0, y0 + h * 2 / 3)[1]}
                        stroke="#ffffff" strokeWidth="1" opacity="0.85"/>
                  <line x1={rA[0]} y1={rA[1]} x2={rB[0]} y2={rB[1]} stroke="#f5f5f2" strokeWidth={Math.max(2.4, U * 0.28)} strokeLinecap="round"/>
                  <rect x={o[0]} y={o[1]} width={M(w)} height={M(h)} rx={M(0.3)} fill="none" stroke="#f5f5f2" strokeWidth={Math.max(2.4, U * 0.28)}/>
                  {sel}
                </g>
              );
            }

            if (z.type === "orchard") {
              const n = Math.max(1, orchardPlots.length);
              const cols = Math.max(1, Math.ceil(Math.sqrt(n * (w / Math.max(1, h)))));
              const rows = Math.max(1, Math.ceil(n / cols));
              const cw = (w - 2) / cols, chh = (h - 2) / rows;
              const tr = Math.min(1.15, Math.min(cw, chh) * 0.36);
              return (
                <g key={z.id} {...common} data-grove-zone="orchard" opacity={hoverOp}>
                  <rect x={o[0]} y={o[1]} width={M(w)} height={M(h)} rx={M(0.35)} fill={W.orchardG}/>
                  {fenceEls(x0, y0, w, h, z.id + "-f", true)}
                  {orchardPlots.map((pp, i) => {
                    const cx = x0 + 1 + (i % cols) * cw + cw / 2;
                    const cy = y0 + 1 + Math.floor(i / cols) * chh + chh / 2;
                    const c = P(cx, cy);
                    const ready = pp.harvestDate && pp.harvestDate <= today;
                    return (
                      <g key={pp.id}>
                        <TreeSprite x={c[0]} y={c[1]} r={M(tr)} sway seed={spriteHash(pp.id)}/>
                        {ready && <circle cx={c[0]} cy={c[1]} r={M(tr) * 1.5} fill="none" stroke="#e08a2e" strokeWidth="2" strokeDasharray="4 3"/>}
                        {ready && <circle cx={c[0] + M(tr) * 0.4} cy={c[1] - M(tr) * 0.2} r={Math.max(1.6, M(tr) * 0.16)} fill="#e08a2e"/>}
                        {ready && <circle cx={c[0] - M(tr) * 0.35} cy={c[1] + M(tr) * 0.15} r={Math.max(1.6, M(tr) * 0.16)} fill="#e08a2e"/>}
                      </g>
                    );
                  })}
                  {sel}
                </g>
              );
            }

            if (z.type === "pasture" || z.type === "barnyard") {
              const groups = zoneAnimalGroups(z, data.livestock && data.livestock.animals);
              const sprites = [];
              let idx = 0;
              groups.forEach(g => {
                const cnt = Math.min(3, g.count);
                for (let i = 0; i < cnt && sprites.length < 5; i++) {
                  const px = x0 + 1.2 + srand(spriteHash(z.id) + idx * 11 + 4) * (w - 2.4);
                  const py = y0 + 1.2 + srand(spriteHash(z.id) + idx * 11 + 8) * (h - 2.4);
                  const c = P(px, py);
                  sprites.push(animalSprite(g.type, z.id + "-a" + idx, c[0], c[1], Math.max(4, M(0.62)), spriteHash(z.id) + idx));
                  idx++;
                }
              });
              const hasTree = w * h >= 90;
              const tc = P(x1 - 1.8, y0 + 1.9);
              return (
                <g key={z.id} {...common} data-grove-zone="pasture" opacity={hoverOp}>
                  <rect x={o[0]} y={o[1]} width={M(w)} height={M(h)} rx={M(0.35)} fill={W.pastureG}/>
                  <ellipse cx={o[0] + M(w * 0.35)} cy={o[1] + M(h * 0.6)} rx={M(w * 0.26)} ry={M(h * 0.2)} fill="#96c962"/>
                  {fenceEls(x0, y0, w, h, z.id + "-f", true)}
                  {hasTree && <TreeSprite x={tc[0]} y={tc[1]} r={M(1)} sway seed={spriteHash(z.id) + 3}/>}
                  {sprites}
                  {sel}
                </g>
              );
            }

            /* soil beds: veg / herbs / raised / container / default plate */
            const soilLike = SOIL_TYPES.has(z.type);
            const framed = FRAMED_TYPES.has(z.type);
            const furrows = [];
            if (soilLike && patches.length === 0) {
              const horiz = w >= h;
              const n = Math.max(2, Math.floor((horiz ? h : w) / 1.35));
              for (let i = 0; i < n; i++) {
                const t = (i + 0.5) / n;
                const a = horiz ? P(x0 + 0.5, y0 + t * h) : P(x0 + t * w, y0 + 0.5);
                const b = horiz ? P(x1 - 0.5, y0 + t * h) : P(x0 + t * w, y1 - 0.5);
                furrows.push(<line key={"fu" + i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={W.soilRow} strokeWidth={Math.max(2.4, U * 0.4)} strokeLinecap="round"/>);
              }
            }
            return (
              <g key={z.id} {...common} data-grove-zone={z.type} opacity={hoverOp}>
                <rect x={o[0]} y={o[1]} width={M(w)} height={M(h)} rx={M(0.3)}
                  fill={soilLike ? W.soil : "#c2d3a0"}
                  stroke={soilLike ? W.soilDark : "#a6b787"} strokeWidth="1.2"/>
                {furrows}
                {patches.map(pt => patchEls(z, pt, z.id + "-" + pt.plotId))}
                {framed
                  ? <rect x={o[0]} y={o[1]} width={M(w)} height={M(h)} rx={M(0.3)} fill="none" stroke={W.frame} strokeWidth={Math.max(3, U * 0.34)}/>
                  : soilLike ? fenceEls(x0, y0, w, h, z.id + "-f", false) : null}
                {sel}
              </g>
            );
          })}

          {/* ornaments */}
          {ornaments.map(o2 => ornamentEls(o2))}

          {/* tree border + free trees (over zone edges, like a real hedgerow) */}
          {world.free.map(t => <TreeSprite key={"ft" + t.i} x={P(t.x, t.y)[0]} y={P(t.x, t.y)[1]} r={M(t.r)} sway seed={t.i}/>)}
          {world.border.map(t => (
            <g key={"bt" + t.i}>
              <circle cx={P(t.x, t.y)[0]} cy={P(t.x, t.y)[1]} r={M(t.r)} fill={srand(t.i + 7) > 0.5 ? "#3f7530" : W.canopy}/>
              <circle cx={P(t.x, t.y)[0] + M(t.r) * 0.35} cy={P(t.x, t.y)[1] - M(t.r) * 0.3} r={M(t.r) * 0.45} fill={W.canopyHi}/>
            </g>
          ))}
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
            const tagPos = pct(P(x0 + w / 2, y0 + h, 2));
            const centerTop = pct(P(x0 + w / 2, y0 + h / 2, U * 1.1));
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

                {/* animal chips (UI layer, on top of the SVG animal sprites) */}
                {groups.map((g, gi) => {
                  const pos = building
                    ? pct(P(x0 + w * (0.28 + gi * 0.36), y0 + h * 0.9, 0))
                    : pct(P(x0 + w * (0.32 + gi * 0.3), y0 + h * 0.22, 0));
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
                  const hp = pct(P(hc.m[0], hc.m[1], 0));
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
