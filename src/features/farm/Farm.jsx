import React, { useState, useEffect, useMemo, useRef } from "react";
import { C, F, SX } from "../../lib/theme";
import { Btn, Card, Inp, Sel, Overlay, Pill, Ring, Stat } from "../../components/ui";
import { COMP } from "../../data/companions";
import { REGIONS, REGION_MAP } from "../../data/regions";
import { ZT, ZT_MAP } from "../../data/zones";
import { searchCity } from "../../data/cities";
import { uid } from "../../lib/storage";
import { appendLog, todayLocalKey, localDateFromKey, addDaysToLocalKey } from "../../lib/utils";
import { getRegionalCrops, getRegionalVarieties, rCM, rCR } from "../../lib/regional";
import { cropMeasureType, plantsFromArea, expectedYield, buildZoneSpaceMap } from "../../lib/farm-calc";
import PlotOverlay from "./PlotOverlay";
import GroveScene, { ORNAMENT_TYPES, ornamentTypesFor, MAX_ORNAMENTS } from "../grove/GroveScene";
import { resolveEnvironment } from "../../lib/environment";
import { makeProjector } from "../grove/sceneMath";
import FarmIcon from "../../components/FarmIcon";
import { PALETTE_DRAG_TYPE } from "./living/ZonePalette";

/* ═══════════════════════════════════════════
   FARM DESIGNER v3 — game-style full-screen builder
   Full-bleed map stage + bottom build tray (iOS patterns).
   Everything autosaves through setData; Done stamps setupDone.
   MARKER: FARM_DESIGNER_V3_GAME
   ═══════════════════════════════════════════ */

const FD_CSS = `
.fd-tray{display:flex;gap:8px;overflow-x:auto;padding:6px 2px 8px;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.fd-tray::-webkit-scrollbar{display:none}
.fd-tile{position:relative;flex:0 0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-width:66px;min-height:60px;padding:8px 10px;border-radius:14px;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .12s ease,background .12s ease;font-family:inherit}
.fd-tile:active{transform:scale(.94)}
.fd-panel{animation:fdUp .22s ease}
@keyframes fdUp{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
.fd-sheet{animation:fdUp .26s ease}
.fd-seg{display:flex;gap:4px;background:rgba(0,0,0,.05);border-radius:11px;padding:3px}
.fd-seg button{flex:1;border:none;border-radius:9px;padding:7px 0;font-size:12px;font-weight:700;cursor:pointer;-webkit-tap-highlight-color:transparent;font-family:inherit}
@media (prefers-reduced-motion: reduce){.fd-panel,.fd-sheet{animation:none}.fd-tile:active{transform:none}}
`;

/* Starter layouts. make() returns fresh ids each apply. */
const FD_TEMPLATES = [
  { id: "small", icon: "🏡", label: "Small Homestead", dims: "80×50 m", w: 80, h: 50,
    make: function() { return [
      {id:uid(),name:"House",type:"house",xM:32,yM:1,wM:16,hM:6,x:40,y:2,w:20,h:12},
      {id:uid(),name:"Veggie Beds",type:"veg",xM:2,yM:9,wM:24,hM:18,x:3,y:18,w:30,h:35},
      {id:uid(),name:"Herbs",type:"herbs",xM:28,yM:9,wM:14,hM:8,x:36,y:18,w:18,h:15},
      {id:uid(),name:"Orchard",type:"orchard",xM:2,yM:29,wM:28,hM:19,x:3,y:58,w:35,h:38},
      {id:uid(),name:"Coop",type:"barn",xM:46,yM:9,wM:12,hM:6,x:57,y:18,w:15,h:12},
      {id:uid(),name:"Pasture",type:"pasture",xM:46,yM:16,wM:24,hM:15,x:57,y:33,w:30,h:30},
      {id:uid(),name:"Well",type:"water",xM:60,yM:9,wM:8,hM:5,x:75,y:18,w:10,h:10},
      {id:uid(),name:"Compost",type:"compost",xM:70,yM:27,wM:8,hM:6,x:88,y:55,w:10,h:12},
      {id:uid(),name:"Greenhouse",type:"greenhouse",xM:29,yM:18,wM:14,hM:9,x:36,y:36,w:18,h:18},
      {id:uid(),name:"Shed",type:"storage",xM:70,yM:35,wM:8,hM:6,x:88,y:70,w:10,h:12},
    ]; } },
  { id: "medium", icon: "🌾", label: "Medium Farm", dims: "150×80 m", w: 150, h: 80,
    make: function() { return [
      {id:uid(),name:"House",type:"house",xM:63,yM:1,wM:24,hM:8,x:42,y:2,w:16,h:10},
      {id:uid(),name:"Kitchen Garden",type:"veg",xM:4,yM:12,wM:30,hM:20,x:3,y:15,w:20,h:25},
      {id:uid(),name:"Field A",type:"veg",xM:39,yM:12,wM:27,hM:20,x:26,y:15,w:18,h:25},
      {id:uid(),name:"Field B",type:"veg",xM:70,yM:12,wM:27,hM:20,x:47,y:15,w:18,h:25},
      {id:uid(),name:"Greenhouse",type:"greenhouse",xM:102,yM:12,wM:21,hM:14,x:68,y:15,w:14,h:18},
      {id:uid(),name:"Herbs",type:"herbs",xM:102,yM:29,wM:21,hM:8,x:68,y:36,w:14,h:10},
      {id:uid(),name:"Orchard",type:"orchard",xM:4,yM:35,wM:42,hM:22,x:3,y:44,w:28,h:28},
      {id:uid(),name:"Vineyard",type:"orchard",xM:51,yM:35,wM:33,hM:14,x:34,y:44,w:22,h:18},
      {id:uid(),name:"Pasture",type:"pasture",xM:51,yM:52,wM:45,hM:24,x:34,y:65,w:30,h:30},
      {id:uid(),name:"Barn",type:"barn",xM:100,yM:40,wM:21,hM:11,x:67,y:50,w:14,h:14},
      {id:uid(),name:"Chickens",type:"barn",xM:100,yM:54,wM:21,hM:10,x:67,y:67,w:14,h:12},
      {id:uid(),name:"Pond",type:"water",xM:4,yM:61,wM:21,hM:14,x:3,y:76,w:14,h:18},
      {id:uid(),name:"Compost",type:"compost",xM:126,yM:50,wM:20,hM:8,x:84,y:63,w:13,h:10},
      {id:uid(),name:"Shed",type:"storage",xM:126,yM:61,wM:20,hM:8,x:84,y:76,w:13,h:10},
    ]; } },
];

/* Exact-metre input: local draft, commits on blur or Enter.
   Commit path: draft → blur → onCommit → handleZoneGeom → dim tag on map. */
function MeterField({label, value, min, max, onCommit}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(function() { setDraft(String(value)); }, [value]);
  const commit = function() {
    let n = parseFloat(draft);
    if (!isFinite(n)) { setDraft(String(value)); return; }
    if (min != null && n < min) n = min;
    if (max != null && n > max) n = max;
    onCommit(Math.round(n * 10) / 10);
  };
  return (
    <label style={{display:"flex", flexDirection:"column", gap:3, minWidth:0}}>
      <span style={{fontSize:10, fontWeight:700, color:C.t2, textTransform:"uppercase", letterSpacing:"0.04em"}}>{label}</span>
      <input type="number" inputMode="decimal" value={draft}
        onChange={function(e) { setDraft(e.target.value); }}
        onBlur={commit}
        onKeyDown={function(e) { if (e.key === "Enter") e.currentTarget.blur(); }}
        style={{width:"100%", padding:"8px 10px", border:`1.5px solid ${C.bdr}`, borderRadius:10,
          fontSize:16, fontFamily:F.mono, background:C.card, color:C.text, outline:"none", boxSizing:"border-box"}}/>
    </label>
  );
}

function Setup({data, setData, onPlantInZone, onBack}) {
  const [sel, setSel] = useState(null);
  const [selOrn, setSelOrn] = useState(null);       // selected ornament id (for move/delete)
  const [armedType, setArmedType] = useState(null); // tap-to-place: id of armed palette type, or null
  const [armedOrn, setArmedOrn] = useState(null);   // tap-to-place: id of armed ornament type, or null
  const [tray, setTray] = useState("zones");        // bottom tray tab: zones | decor
  const [sheet, setSheet] = useState(null);         // null | "settings"
  const [farmW, setFarmW] = useState(data.farmW || 100);
  const [farmH, setFarmH] = useState(data.farmH || 60);
  const [tutorialDismissed, setTutorialDismissed] = useState(!!data.designerTutorialSeen);
  const [stageFit, setStageFit] = useState({w: 0, h: 0});
  const stageRef = useRef(null);
  const ORN_IDS = new Set(ORNAMENT_TYPES.map(o => o.id));
  /* Stage 4b (brief §7): decor tray only offers env-appropriate items;
     ORN_IDS stays the superset so already-placed decor keeps working */
  const ORN_PALETTE = ornamentTypesFor(resolveEnvironment(data));
  const [cityQuery, setCityQuery] = useState(data.city || "");
  const [cityResults, setCityResults] = useState([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const cityRef = useRef(null);
  const curRegion = REGION_MAP.get(data.region || "western_europe");
  const regionCropCount = getRegionalCrops(data.region || "western_europe").length;

  // Zones already migrated to meter coords on load (see migrateZones)
  /* Heal zones created without map geometry (e.g. by Onboarding before
     2026-05-16, or by older imports). A zone with no xM/yM/wM/hM is
     invisible on the canvas. Derive geometry from areaM2 (square-ish
     1.5:1 aspect) and stack them top-down along the left edge so multiple
     unplaced zones don't overlap. This is render-only; we don't mutate
     data.zones, so the user's storage stays clean until they actually
     interact with the zone. */
  const zones = (data.zones || []).map((z, i) => {
    if (z.xM != null && z.yM != null && z.wM != null && z.hM != null) return z;
    const area = +z.areaM2 || 6;
    const wM = Math.max(1, Math.round(Math.sqrt(area * 1.5) * 10) / 10);
    const hM = Math.max(1, Math.round((area / wM) * 10) / 10);
    return { ...z, xM: 4, yM: 4 + i * (hM + 1), wM, hM };
  });

  const upZ = (id, u) => setData({...data, zones: data.zones.map(z => z.id===id ? {...z,...u} : z)});
  const delZ = id => { setData({...data, zones: data.zones.filter(z => z.id !== id)}); setSel(null); };

  /* ── Grove editor plumbing ── */
  const groveData = {...data, zones, farmW, farmH, ornaments: data.ornaments || []};
  function clampGeom(g) {
    const wM = Math.max(3, Math.min(farmW, g.wM));
    const hM = Math.max(3, Math.min(farmH, g.hM));
    const xM = Math.max(0, Math.min(farmW - wM, g.xM));
    const yM = Math.max(0, Math.min(farmH - hM, g.yM));
    return {
      xM: Math.round(xM * 10) / 10, yM: Math.round(yM * 10) / 10,
      wM: Math.round(wM * 10) / 10, hM: Math.round(hM * 10) / 10,
    };
  }
  function handleZoneGeom(id, g) {
    const c = clampGeom(g);
    upZ(id, {...c, x: c.xM / farmW * 100, y: c.yM / farmH * 100, w: c.wM / farmW * 100, h: c.hM / farmH * 100});
  }
  function handlePlaceAt(xM, yM, type) {
    // Ornament placement wins when an ornament type is armed (or dragged in)
    if (armedOrn || (type && ORN_IDS.has(type))) { placeOrnamentAt(xM, yM, type); return; }
    const t = type || armedType;
    if (!t || !ZT_MAP.get(t)) { setArmedType(null); return; }
    const defaultWM = 10, defaultHM = 8;
    const c = clampGeom({xM: xM - defaultWM / 2, yM: yM - defaultHM / 2, wM: defaultWM, hM: defaultHM});
    const zt2 = ZT_MAP.get(t);
    const baseName = zt2 ? zt2.label : t;
    const existing = data.zones.filter(z => z.type === t).length;
    const newZone = {
      id: uid(),
      name: existing > 0 ? baseName + " " + (existing + 1) : baseName,
      type: t,
      xM: c.xM, yM: c.yM, wM: c.wM, hM: c.hM,
    };
    setData({...data, zones: [...data.zones, newZone]});
    setSel(newZone.id);
    setArmedType(null);
  }

  /* ── Ornament plumbing (decorations; schema [{id,type,xM,yM}], max 10) ── */
  const ornaments = data.ornaments || [];
  function clampPt(xM, yM) {
    return {
      xM: Math.round(Math.max(0, Math.min(farmW, xM)) * 10) / 10,
      yM: Math.round(Math.max(0, Math.min(farmH, yM)) * 10) / 10,
    };
  }
  function placeOrnamentAt(xM, yM, type) {
    const t = type || armedOrn;
    if (!t) return;
    if (ornaments.length >= MAX_ORNAMENTS) { setArmedOrn(null); return; }
    const c = clampPt(xM, yM);
    const newOrn = { id: uid(), type: t, xM: c.xM, yM: c.yM };
    setData({...data, ornaments: [...ornaments, newOrn]});
    setSelOrn(newOrn.id);
    setArmedOrn(null);
  }
  function handleOrnamentMove(id, xM, yM) {
    const c = clampPt(xM, yM);
    setData({...data, ornaments: ornaments.map(o => o.id === id ? {...o, ...c} : o)});
  }
  function delOrn(id) {
    setData({...data, ornaments: ornaments.filter(o => o.id !== id)});
    setSelOrn(null);
  }
  const sOrn = ornaments.find(o => o.id === selOrn);
  const sz = zones.find(z => z.id === sel);
  const szT = sz ? ZT_MAP.get(sz.type) : null;
  const sOrnType = sOrn ? ORNAMENT_TYPES.find(function(o) { return o.id === sOrn.type; }) : null;

  const doneAndClose = function() {
    setData({...data, setupDone: true, farmW, farmH, zones: zones});
    if (onBack) onBack();
  };

  /* ── Letterbox fit: size the scene box to fit the stage while keeping
     the projector's exact aspect, so GroveScene's client-px → viewBox
     pointer math (drag / resize / tap-to-place) stays valid. ── */
  const PROJ = useMemo(function() { return makeProjector(farmW, farmH); }, [farmW, farmH]);
  useEffect(function() {
    const el = stageRef.current;
    if (!el) return;
    function measure() {
      const r = el.getBoundingClientRect();
      const availW = Math.max(0, r.width - 16);
      const availH = Math.max(0, r.height - 16);
      const ratio = PROJ.vbW / PROJ.vbH;
      let w = availW, h = w / ratio;
      if (h > availH) { h = availH; w = h * ratio; }
      setStageFit({w: Math.floor(w), h: Math.floor(h)});
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return function() { ro.disconnect(); };
  }, [PROJ]);

  const zoneCounts = (data.zones || []).reduce(function(acc, z) {
    acc[z.type] = (acc[z.type] || 0) + 1;
    return acc;
  }, {});

  const applyTemplate = function(w, h, zoneList) {
    setFarmW(w); setFarmH(h);
    setData({...data, farmW: w, farmH: h, zones: zoneList});
  };

  const commitGeom = function(field, n) {
    if (!sz) return;
    const g = {xM: sz.xM, yM: sz.yM, wM: sz.wM, hM: sz.hM};
    g[field] = n;
    handleZoneGeom(sz.id, g);
  };

  const isPlantZone = sz && ["veg", "orchard", "herbs", "greenhouse", "raised", "container"].includes(sz.type);

  return (
    <div data-fd-root style={{position:"fixed", inset:0, zIndex:2100, background:C.bg, display:"flex", flexDirection:"column"}}>
      <style>{FD_CSS}</style>

      {/* ── Top bar ── */}
      <div style={{flex:"0 0 auto", display:"flex", alignItems:"center", gap:10,
        padding:"calc(10px + env(safe-area-inset-top)) 14px 10px",
        background:C.card, borderBottom:`1px solid ${C.bdr}`}}>
        {onBack && (
          <button type="button" aria-label="Close designer" onClick={onBack}
            style={{border:"none", background:"transparent", color:C.t2, fontSize:20, lineHeight:1,
              padding:"6px 8px", cursor:"pointer", WebkitTapHighlightColor:"transparent", fontFamily:"inherit"}}>✕</button>
        )}
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize:15, fontWeight:800, fontFamily:F.head, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>Farm Designer</div>
          <div style={{fontSize:11, color:C.t2, fontFamily:F.mono}}>{farmW}×{farmH} m · {zones.length} {zones.length === 1 ? "zone" : "zones"} · {ornaments.length}/{MAX_ORNAMENTS} decor</div>
        </div>
        <button type="button" aria-label="Farm settings" onClick={function() { setSheet("settings"); }}
          style={{border:`1px solid ${C.bdr}`, background:C.card, color:C.text, fontSize:16, lineHeight:1,
            width:36, height:36, borderRadius:12, cursor:"pointer", WebkitTapHighlightColor:"transparent"}}>⚙</button>
        <Btn onClick={doneAndClose}>Done</Btn>
      </div>

      {/* ── Stage: letterboxed GroveScene ── */}
      <div ref={stageRef} style={{flex:1, minHeight:0, position:"relative", display:"flex",
        alignItems:"center", justifyContent:"center", overflow:"hidden"}}>
        {stageFit.w > 0 && (
          <div style={{width:stageFit.w, maxWidth:"100%"}}>
            <GroveScene
              data={groveData}
              showEditButton={false}
              showHelperText={false}
              showTimeTint={false}
              edit={{
                selectedId:sel,
                onSelect:function(id){ setSel(id); if(id) setSelOrn(null); },
                onZoneGeom:handleZoneGeom,
                onPlaceAt:handlePlaceAt,
                armed:!!armedType || !!armedOrn,
                dragType:PALETTE_DRAG_TYPE,
                ornamentSelectedId:selOrn,
                onOrnamentSelect:function(id){ setSelOrn(id); if(id) setSel(null); },
                onOrnamentMove:handleOrnamentMove,
              }}
            />
          </div>
        )}

        {armedType && (
          <div style={{
            position: "absolute", top: 8, left: 8, right: 8,
            padding: "8px 12px", background: C.green, color: "#fff",
            borderRadius: 10, fontSize: 12, fontWeight: 700,
            boxShadow: "0 4px 12px rgba(0,0,0,.25)", zIndex: 10,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          }} onClick={function(e){e.stopPropagation();}}>
            <span style={{flex:1,lineHeight:1.3}}>
              Tap map to place <strong>{ZT_MAP.get(armedType) ? ZT_MAP.get(armedType).label : armedType}</strong>
            </span>
            <button type="button" onClick={function(){setArmedType(null);}}
              style={{background:"rgba(255,255,255,.25)",border:"none",color:"#fff",padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>Cancel</button>
          </div>
        )}
        {armedOrn && (
          <div style={{
            position: "absolute", top: 8, left: 8, right: 8,
            padding: "8px 12px", background: "#6b4f2e", color: "#fff",
            borderRadius: 10, fontSize: 12, fontWeight: 700,
            boxShadow: "0 4px 12px rgba(0,0,0,.25)", zIndex: 10,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          }} onClick={function(e){e.stopPropagation();}}>
            <span style={{flex:1,lineHeight:1.3}}>
              Tap map to place <strong>{(ORNAMENT_TYPES.find(function(o){return o.id===armedOrn;})||{}).label || armedOrn}</strong>
            </span>
            <button type="button" onClick={function(){setArmedOrn(null);}}
              style={{background:"rgba(255,255,255,.25)",border:"none",color:"#fff",padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>Cancel</button>
          </div>
        )}

        {/* Idle hint pill */}
        {zones.length > 0 && !armedType && !armedOrn && !sz && !sOrn && (
          <div style={{position:"absolute", bottom:10, left:"50%", transform:"translateX(-50%)",
            background:"rgba(30,40,32,.72)", color:"#fff", fontSize:10.5, fontWeight:600,
            padding:"5px 12px", borderRadius:99, whiteSpace:"nowrap", pointerEvents:"none", maxWidth:"92%",
            overflow:"hidden", textOverflow:"ellipsis"}}>
            Drag zones to move · Drag corner dots to resize · Build from the tray below
          </div>
        )}

        {/* Empty state — template starters */}
        {zones.length === 0 && tutorialDismissed && (
          <div style={{position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none", padding:16}}>
            <div style={{background:C.card, borderRadius:16, padding:"22px 24px", maxWidth:340, width:"100%",
              textAlign:"center", boxShadow:C.shL, pointerEvents:"auto"}}>
              <div style={{fontSize:32, marginBottom:8}}>🏡</div>
              <div style={{fontSize:15, fontWeight:700, fontFamily:F.head, marginBottom:4}}>Start with a template</div>
              <div style={{fontSize:12, color:C.t2, marginBottom:14}}>or tap a zone type in the tray below and tap the map</div>
              <div style={{display:"flex", flexDirection:"column", gap:8}}>
                {FD_TEMPLATES.map(function(t) {
                  return (
                    <button key={t.id} type="button"
                      onClick={function() { applyTemplate(t.w, t.h, t.make()); }}
                      style={{display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
                        border:`1.5px solid ${C.bdr}`, borderRadius:12, background:C.bg, color:C.text,
                        cursor:"pointer", WebkitTapHighlightColor:"transparent", textAlign:"left", fontFamily:"inherit"}}>
                      <span style={{fontSize:20}}>{t.icon}</span>
                      <span style={{flex:1, fontSize:13, fontWeight:700}}>{t.label}</span>
                      <span style={{fontSize:11, color:C.t3, fontFamily:F.mono}}>{t.dims}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* First-visit tutorial — shown until dismissed */}
        {!tutorialDismissed && (
          <div style={{
            position:"absolute",inset:0,zIndex:80,
            background:"rgba(0,0,0,.55)",backdropFilter:"blur(3px)",
            display:"flex",alignItems:"center",justifyContent:"center",
          }}>
            <div style={{
              background:C.card,borderRadius:16,padding:"28px 32px",
              maxWidth:360,width:"90%",textAlign:"center",
              boxShadow:"0 24px 64px rgba(0,0,0,.3)",
            }}>
              <div style={{fontSize:36,marginBottom:10}}>🗺️</div>
              <div style={{fontSize:18,fontWeight:800,fontFamily:F.head,marginBottom:6}}>Design your farm</div>
              <div style={{fontSize:13,color:C.t2,lineHeight:1.6,marginBottom:20}}>
                Three steps to get started:
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:24,textAlign:"left"}}>
                {[
                  {n:"1",icon:"➕",label:"Pick a zone type","sub":"Tap a tile in the build tray, then tap the map to place it"},
                  {n:"2",icon:"✋",label:"Drag to position","sub":"Move zones around the map to match your real farm"},
                  {n:"3",icon:"📐",label:"Set real measurements","sub":"Select a zone and enter actual metres so spacing and yields are accurate"},
                ].map(function(step){
                  return (
                    <div key={step.n} style={{display:"flex",gap:14,alignItems:"flex-start",background:C.bg,borderRadius:12,padding:"10px 14px"}}>
                      <div style={{width:32,height:32,borderRadius:16,background:C.green,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{step.icon}</div>
                      <div>
                        <div style={{fontSize:14,fontWeight:700,color:C.text}}>{step.label}</div>
                        <div style={{fontSize:12,color:C.t2,marginTop:2}}>{step.sub}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={function(){
                  setTutorialDismissed(true);
                  setData({...data, designerTutorialSeen: true});
                }}
                style={{width:"100%",padding:"12px 0",background:C.green,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",letterSpacing:"0.01em",fontFamily:"inherit"}}>
                Got it — let me design my farm
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom dock: build tray / zone panel / ornament panel ── */}
      <div style={{flex:"0 0 auto", background:C.card, borderTop:`1px solid ${C.bdr}`,
        padding:"10px 14px calc(10px + env(safe-area-inset-bottom))"}}>
        <div style={{maxWidth:720, margin:"0 auto"}}>

          {sz && (
            <div className="fd-panel" data-fd-zone-panel>
              <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:10}}>
                <span style={{fontSize:20}}>{szT ? szT.icon : "▦"}</span>
                <input type="text" value={sz.name} aria-label="Zone name"
                  onChange={function(e) { upZ(sz.id, {name: e.target.value}); }}
                  style={{flex:1, minWidth:0, padding:"8px 10px", border:`1.5px solid ${C.bdr}`, borderRadius:10,
                    fontSize:16, fontWeight:700, fontFamily:F.body, background:C.bg, color:C.text, outline:"none", boxSizing:"border-box"}}/>
                <Btn v="danger" sm onClick={function() { delZ(sz.id); }}>Delete</Btn>
                <Btn v="ghost" sm onClick={function() { setSel(null); }}>Done</Btn>
              </div>
              <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:8, marginBottom:10}}>
                <MeterField label="X (m)" value={sz.xM} min={0} max={farmW} onCommit={function(n) { commitGeom("xM", n); }}/>
                <MeterField label="Y (m)" value={sz.yM} min={0} max={farmH} onCommit={function(n) { commitGeom("yM", n); }}/>
                <MeterField label="Width" value={sz.wM} min={3} max={farmW} onCommit={function(n) { commitGeom("wM", n); }}/>
                <MeterField label="Height" value={sz.hM} min={3} max={farmH} onCommit={function(n) { commitGeom("hM", n); }}/>
              </div>
              <div style={{display:"flex", alignItems:"center", gap:10, flexWrap:"wrap"}}>
                <select value={sz.type} aria-label="Zone type"
                  onChange={function(e) { upZ(sz.id, {type: e.target.value}); }}
                  style={{flex:"1 1 150px", padding:"8px 10px", border:`1.5px solid ${C.bdr}`, borderRadius:10,
                    fontSize:13, fontWeight:600, fontFamily:F.body, background:C.bg, color:C.text, cursor:"pointer", boxSizing:"border-box"}}>
                  {ZT.map(function(t) { return <option key={t.id} value={t.id}>{t.icon} {t.label}</option>; })}
                </select>
                {sz.type!=="water" && sz.type!=="compost" && sz.type!=="house" && (
                  <label style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer",userSelect:"none"}}>
                    <input type="checkbox" checked={sz.road!==false}
                      onChange={function(e){ upZ(sz.id,{road:e.target.checked?true:false}); }}
                      style={{width:16,height:16,accentColor:C.green,cursor:"pointer"}}/>
                    <span style={{fontSize:12,fontWeight:600,color:C.text}}>Connect a path</span>
                  </label>
                )}
                {isPlantZone && onPlantInZone && (
                  <button type="button" onClick={function() { onPlantInZone(sz.id); }}
                    style={{padding:"8px 14px", background:C.green, color:"#fff", border:"none", borderRadius:10,
                      fontSize:12, fontWeight:700, cursor:"pointer", WebkitTapHighlightColor:"transparent", fontFamily:"inherit"}}>+ Plant</button>
                )}
              </div>
            </div>
          )}

          {!sz && sOrn && (
            <div className="fd-panel" data-fd-orn-panel>
              <div style={{display:"flex", alignItems:"center", gap:10}}>
                <span style={{fontSize:22}}>{sOrnType ? sOrnType.icon : "❖"}</span>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:14, fontWeight:700, fontFamily:F.head}}>{sOrnType ? sOrnType.label : "Decoration"}</div>
                  <div style={{fontSize:11, color:C.t3}}>Drag on the map to reposition</div>
                </div>
                <Btn v="danger" sm onClick={function() { delOrn(sOrn.id); }}>Delete</Btn>
                <Btn v="ghost" sm onClick={function() { setSelOrn(null); }}>Done</Btn>
              </div>
            </div>
          )}

          {!sz && !sOrn && (
            <div data-fd-tray-root>
              <div className="fd-seg" style={{marginBottom:8}}>
                <button type="button"
                  onClick={function() { setTray("zones"); setArmedOrn(null); }}
                  style={{background: tray==="zones" ? C.card : "transparent",
                    color: tray==="zones" ? C.text : C.t2,
                    boxShadow: tray==="zones" ? "0 1px 4px rgba(0,0,0,.12)" : "none"}}>Zones</button>
                <button type="button"
                  onClick={function() { setTray("decor"); setArmedType(null); }}
                  style={{background: tray==="decor" ? C.card : "transparent",
                    color: tray==="decor" ? (ornaments.length>=MAX_ORNAMENTS ? "#c0392b" : C.text) : C.t2,
                    boxShadow: tray==="decor" ? "0 1px 4px rgba(0,0,0,.12)" : "none"}}>Decor {ornaments.length}/{MAX_ORNAMENTS}</button>
              </div>

              {tray === "zones" && (
                <div className="fd-tray" data-fd-tray="zones">
                  {ZT.map(function(t) {
                    const armed = armedType === t.id;
                    const n = zoneCounts[t.id] || 0;
                    return (
                      <button key={t.id} type="button" className="fd-tile" draggable
                        onDragStart={function(e) { e.dataTransfer.setData(PALETTE_DRAG_TYPE, t.id); e.dataTransfer.effectAllowed = "copy"; }}
                        onClick={function() { setSel(null); setSelOrn(null); setArmedOrn(null); setArmedType(armed ? null : t.id); }}
                        style={{border: armed ? `2px solid ${C.green}` : `1px solid ${C.bdr}`,
                          background: armed ? C.gp : C.bg, color: C.text}}>
                        <span style={{fontSize:22, lineHeight:1}}>{t.icon}</span>
                        <span style={{fontSize:10, fontWeight:700, whiteSpace:"nowrap"}}>{t.label}</span>
                        {n > 0 && (
                          <span style={{position:"absolute", top:4, right:4, minWidth:16, height:16, borderRadius:8,
                            background:C.green, color:"#fff", fontSize:9.5, fontWeight:800,
                            display:"flex", alignItems:"center", justifyContent:"center", padding:"0 4px"}}>{n}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {tray === "decor" && (
                <div className="fd-tray" data-fd-tray="decor">
                  {ORN_PALETTE.map(function(o) {
                    const armed = armedOrn === o.id;
                    const full = ornaments.length >= MAX_ORNAMENTS;
                    return (
                      <button key={o.id} type="button" className="fd-tile" disabled={full && !armed}
                        onClick={function() { if (full && !armed) return; setSel(null); setSelOrn(null); setArmedType(null); setArmedOrn(armed ? null : o.id); }}
                        style={{border: armed ? "2px solid #6b4f2e" : `1px solid ${C.bdr}`,
                          background: armed ? "#6b4f2e" : C.bg, color: armed ? "#fff" : C.text,
                          opacity: full && !armed ? 0.4 : 1, cursor: full && !armed ? "not-allowed" : "pointer"}}>
                        <span style={{fontSize:22, lineHeight:1}}>{o.icon}</span>
                        <span style={{fontSize:10, fontWeight:700, whiteSpace:"nowrap"}}>{o.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Settings sheet: farm size, climate, templates ── */}
      {sheet === "settings" && (
        <div style={{position:"absolute", inset:0, zIndex:120, display:"flex", flexDirection:"column", justifyContent:"flex-end"}}>
          <div onClick={function() { setSheet(null); }}
            style={{position:"absolute", inset:0, background:"rgba(0,0,0,.45)"}}/>
          <div className="fd-sheet" data-fd-settings style={{position:"relative", background:C.card, borderRadius:"18px 18px 0 0",
            boxShadow:"0 -12px 40px rgba(0,0,0,.25)", maxHeight:"82%", overflowY:"auto",
            padding:"16px 18px calc(16px + env(safe-area-inset-bottom))"}}>
            <div style={{maxWidth:640, margin:"0 auto"}}>
              <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14}}>
                <div style={{fontSize:16, fontWeight:800, fontFamily:F.head}}>Farm settings</div>
                <button type="button" aria-label="Close settings" onClick={function() { setSheet(null); }}
                  style={{border:"none", background:"transparent", color:C.t2, fontSize:20, lineHeight:1, padding:"4px 6px", cursor:"pointer", WebkitTapHighlightColor:"transparent", fontFamily:"inherit"}}>✕</button>
              </div>

              <div style={{fontSize:11, fontWeight:700, color:C.t2, textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:6}}>Total farm size</div>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:10, alignItems:"end", marginBottom:4}}>
                <MeterField label="Width (m)" value={farmW} min={10} max={2000}
                  onCommit={function(n) { const v = Math.round(n); setFarmW(v); setData({...data, farmW: v}); }}/>
                <MeterField label="Height (m)" value={farmH} min={10} max={2000}
                  onCommit={function(n) { const v = Math.round(n); setFarmH(v); setData({...data, farmH: v}); }}/>
                <div style={{fontSize:11, color:C.t3, fontFamily:F.mono, paddingBottom:10, whiteSpace:"nowrap"}}>{(farmW*farmH).toLocaleString()} m²</div>
              </div>
              <div style={{fontSize:11, color:C.t3, marginBottom:16}}>Zones outside the new bounds snap back in when you next move them.</div>

              <div style={{fontSize:11, fontWeight:700, color:C.t2, textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:6}}>Climate region</div>
              <div style={{display:"flex", gap:8, alignItems:"center", marginBottom:10}}>
                <span style={{fontSize:18}}>{curRegion ? curRegion.emoji : "🌍"}</span>
                <div>
                  <div style={{fontSize:13, fontWeight:700, color:C.green}}>{curRegion ? curRegion.name : "Set your growing region"}</div>
                  <div style={SX.t2_11}>{curRegion ? curRegion.desc : "Type your city below to set your growing region"}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:12,alignItems:"flex-start",flexWrap:"wrap", marginBottom:4}}>
                <div style={{position:"relative",flex:"1 1 200px",minWidth:180}} ref={cityRef}>
                  <label style={{fontSize:11,fontWeight:600,color:C.t2,display:"block",marginBottom:3}}>Your City</label>
                  <input type="text" placeholder="Type your city (e.g. London, Berlin, Chicago...)" value={cityQuery}
                    onChange={function(e) {
                      const v = e.target.value;
                      setCityQuery(v);
                      if (v.length < 2) { setCityResults([]); setShowCityDropdown(false); return; }
                      const res = searchCity(v);
                      setCityResults(res);
                      setShowCityDropdown(res.length > 0);
                    }}
                    onFocus={function() { if (cityResults.length > 0) setShowCityDropdown(true); }}
                    onBlur={function() { setTimeout(function() { setShowCityDropdown(false); }, 200); }}
                    style={{width:"100%",padding:"8px 12px",border:`1.5px solid ${C.bdr}`,borderRadius:10,fontSize:16,fontFamily:F.body,background:C.card,color:C.text,outline:"none",boxSizing:"border-box"}}/>
                  {showCityDropdown && cityResults.length > 0 && (
                    <div style={{position:"absolute",top:"100%",left:0,right:0,background:C.card,border:`1px solid ${C.bdr}`,borderRadius:10,boxShadow:C.shL,zIndex:50,maxHeight:220,overflowY:"auto",marginTop:4}}>
                      {cityResults.map(function(c, idx) {
                        const rInfo = REGION_MAP.get(c.region);
                        return (
                          <div key={c.city + "-" + c.country + "-" + idx}
                            onMouseDown={function() {
                              setCityQuery(c.city + ", " + c.country);
                              setData({...data, city: c.city + ", " + c.country, region: c.region});
                              setShowCityDropdown(false);
                            }}
                            style={{padding:"8px 14px",cursor:"pointer",borderBottom:`1px solid ${C.bdr}`,fontSize:13,display:"flex",justifyContent:"space-between",alignItems:"center"}}
                            onMouseOver={function(e) { e.currentTarget.style.background = C.gp; }}
                            onMouseOut={function(e) { e.currentTarget.style.background = "transparent"; }}>
                            <span style={{fontWeight:600}}>{c.city}, {c.country}</span>
                            <span style={SX.t2_11}>{rInfo ? rInfo.emoji + " " + rInfo.name : c.region}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div style={{flex:"1 1 200px",minWidth:180}}>
                  <label style={{fontSize:11,fontWeight:600,color:C.t2,display:"block",marginBottom:3}}>Or pick a region</label>
                  <select value={data.region || "western_europe"}
                    onChange={function(e) { setData({...data, region: e.target.value}); }}
                    style={{width:"100%",padding:"8px 12px",border:`1.5px solid ${C.bdr}`,borderRadius:10,fontSize:16,fontFamily:F.body,background:C.card,color:C.text,cursor:"pointer",boxSizing:"border-box"}}>
                    {REGIONS.map(function(r) {
                      return <option key={r.id} value={r.id}>{r.emoji} {r.name} — {r.examples}</option>;
                    })}
                  </select>
                </div>
              </div>
              {curRegion && <div style={{fontSize:11,color:C.t2,fontStyle:"italic", marginBottom:16}}>{regionCropCount} crops available for {curRegion.name} climate</div>}

              {data.zones.length === 0 && (
                <div>
                  <div style={{fontSize:11, fontWeight:700, color:C.t2, textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:6}}>Templates</div>
                  <div style={{display:"flex", flexDirection:"column", gap:8}}>
                    {FD_TEMPLATES.map(function(t) {
                      return (
                        <button key={t.id} type="button"
                          onClick={function() { applyTemplate(t.w, t.h, t.make()); setSheet(null); }}
                          style={{display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
                            border:`1.5px solid ${C.bdr}`, borderRadius:12, background:C.bg, color:C.text,
                            cursor:"pointer", WebkitTapHighlightColor:"transparent", textAlign:"left", fontFamily:"inherit"}}>
                          <span style={{fontSize:20}}>{t.icon}</span>
                          <span style={{flex:1, fontSize:13, fontWeight:700}}>{t.label}</span>
                          <span style={{fontSize:11, color:C.t3, fontFamily:F.mono}}>{t.dims}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   FARMING MODULE
   ═══════════════════════════════════════════ */

function Farming({data, setData, pageData, clearPageData}) {
  const [showAdd,setShowAdd]=useState(false);
  const [selP,setSelP]=useState(null);
  const [form,setForm]=useState({crop:"",variety:"",name:"",zone:"",plantDate:"",cost:"",qty:"",measureType:""});
  const [cropSearch,setCropSearch]=useState("");
  const [cropDropdownOpen,setCropDropdownOpen]=useState(false);

  // Auto-open add form when arriving from Seasonal Calendar with a specific crop
  useEffect(() => {
    if (pageData?.crop || pageData?.zone) {
      setForm(f => ({...f,
        ...(pageData.crop ? {crop: pageData.crop} : {}),
        ...(pageData.plantDate ? {plantDate: pageData.plantDate} : {}),
        ...(pageData.zone ? {zone: pageData.zone} : {}),
      }));
      setShowAdd(true);
      if (clearPageData) clearPageData();
    }
  }, [pageData, clearPageData]);
  const ci=rCM(data.region).get(form.crop);
  const vi=ci && form.variety ? getRegionalVarieties(ci.name, data.region).find(v=>v.name===form.variety) : null;
  const effectiveDays = vi?.days || ci?.days || 0;
  const autoMeasure = ci ? cropMeasureType(ci.name, data.region) : "plants";
  const activeMeasure = form.measureType || autoMeasure;
  const plantsCalc = activeMeasure==="area" ? plantsFromArea(ci?.name, +form.qty||0, data.region) : null;
  const yieldCalc = ci && form.qty ? expectedYield(ci.name, +form.qty||0, activeMeasure, vi?.yld, data.region) : null;
  const autoH=()=>form.plantDate&&ci?addDaysToLocalKey(form.plantDate, effectiveDays):"";
  const vegZ=data.zones.filter(z=>["veg","orchard","herbs","greenhouse","raised","container"].includes(z.type));
  const zoneSpace = useMemo(() => buildZoneSpaceMap(data.zones, data.garden.plots, data.farmW||100, data.farmH||60, data.region), [data.zones, data.garden.plots, data.farmW, data.farmH, data.region]);

  const add=()=>{
    if(!form.crop)return;
    const c=rCM(data.region).get(form.crop);
    const v=form.variety?getRegionalVarieties(form.crop, data.region).find(vr=>vr.name===form.variety):null;
    const displayName=form.name||(form.variety?`${form.crop} (${form.variety})`:form.crop);
    const _measure = form.measureType || (c ? cropMeasureType(c.name, data.region) : "plants");
    const _qty = (form.qty && +form.qty > 0) ? +form.qty : null;
    const _plants = _qty ? (_measure==="area" ? plantsFromArea(form.crop,_qty,data.region) : _qty) : null;
    const _yieldKg = _qty ? expectedYield(form.crop, _qty, _measure, v?.yld, data.region) : null;
    const p={id:uid(),crop:form.crop,variety:form.variety||"",name:displayName,plantDate:form.plantDate,harvestDate:autoH(),status:form.plantDate?"planted":"planned",zone:form.zone,varietyNote:v?.note||"",steps:c?c.steps.map(s=>({...s,done:false})):[],qty:_qty,measureType:_measure,plantCount:_plants,expectedYieldKg:_yieldKg};
    const nd={...data,garden:{plots:[...data.garden.plots,p]},log:appendLog(data.log,{text:`🌱 Planted ${displayName}${_plants?` (${_plants} plants)`:""}`})};
    if(form.cost&&+form.cost>0)nd.costs={items:[...(data.costs?.items||[]),{id:uid(),type:"expense",amount:+form.cost,label:`Seeds: ${displayName}`,date:todayLocalKey(),cat:"Seeds"}]};
    setData(nd);setForm({crop:"",variety:"",name:"",zone:"",plantDate:"",cost:"",qty:"",measureType:""});setCropSearch("");setCropDropdownOpen(false);setShowAdd(false);
  };
  // tog/del/harv moved into PlotOverlay component — no longer needed here
  const sp=data.garden.plots.find(p=>p.id===selP);

  // Pre-computed values to avoid IIFEs in JSX (IIFEs crash the app)
  const _active=data.garden.plots.filter(function(p){return p.status!=="harvested";});
  const _totalPlants=_active.reduce(function(s,p){return s+(p.plantCount||0);},0);
  const _totalArea=_active.reduce(function(s,p){return s+(p.measureType==="area"?+(p.qty||0):0);},0);
  const _totalYield=_active.reduce(function(s,p){return s+(p.expectedYieldKg||0);},0);
  const _ready=_active.filter(function(p){return p.harvestDate&&localDateFromKey(p.harvestDate)<=localDateFromKey(todayLocalKey());}).length;
  // Plot overlay now computes its own zone / companion / card state — removed unused locals
  const _formZoneObj=form.zone?vegZ.find(function(z){return z.id===form.zone;}):null;
  const _formZoneStats=form.zone?zoneSpace[form.zone]:null;
  const _formZoneFill=_formZoneStats?(_formZoneStats.pct>=0.95?C.red:_formZoneStats.pct>=0.7?C.orange:C.green):C.green;

  // Crop picker: filter by search + group by type (Veggies/Fruits/Herbs/Grains)
  const _cropSearchQ = cropSearch.trim().toLowerCase();
  const _cropsForPicker = rCR(data.region).filter(function(c){
    if (!_cropSearchQ) return true;
    const n = c.name.toLowerCase();
    return n.startsWith(_cropSearchQ) || n.includes(_cropSearchQ);
  });
  const _cropGroupsForPicker = [
    {label:"🥬 Veggies",  crops: _cropsForPicker.filter(function(c){return c.cat === "Vegetable";})},
    {label:"🍎 Fruits",   crops: _cropsForPicker.filter(function(c){return c.cat === "Fruit" || c.cat === "Fruit Tree" || c.cat === "Nut Tree";})},
    {label:"🌿 Herbs",    crops: _cropsForPicker.filter(function(c){return c.cat === "Herb";})},
    {label:"🌾 Grains",   crops: _cropsForPicker.filter(function(c){return c.cat === "Grain";})}
  ];
  const _cropPickerHasResults = _cropGroupsForPicker.some(function(g){return g.crops.length > 0;});

  return (
    <div className="page-enter" style={SX.mw800}>
      <div style={SX.pageHead}>
        <div><h2 style={SX.headerH2}>🌱 Farming</h2><p style={SX.pageSubHead}>Track your crops from seed to harvest</p></div>
        <Btn onClick={()=>setShowAdd(true)}>+ Plant Crop</Btn>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:10,marginBottom:20}}>
        <Stat label="Active Crops" value={_active.length}/>
        {_totalPlants>0&&<Stat label="Total Plants" value={_totalPlants} sub="across all beds"/>}
        {_totalArea>0&&<Stat label="Total Area" value={`${_totalArea.toFixed(0)}m²`} sub="under cultivation"/>}
        {_totalYield>0&&<Stat label="Est. Yield" value={`${_totalYield.toFixed(0)}kg`} sub="at harvest" color={C.green}/>}
        <Stat label="Ready" value={_ready} sub="to harvest" color={C.orange}/>
      </div>
      {data.garden.plots.filter(p=>p.status!=="harvested").length===0?
        <Card style={{textAlign:"center",padding:"56px 24px",background:C.grdLight}}><div style={SX.emptyIcon}>🌱</div><div style={SX.s15Bold}>Ready to grow?</div><div style={{color:C.t2,marginTop:6,fontSize:12.5,maxWidth:240,margin:"6px auto 0"}}>Tap "Plant Crop" to add your first seeds and start tracking</div></Card>:
      <div style={{display:"grid",gap:8}}>{data.garden.plots.filter(p=>p.status!=="harvested").map(p=>{
        const c=rCM(data.region).get(p.crop);
        const done=p.steps?p.steps.filter(s=>s.done).length:0;
        const total=p.steps?p.steps.length:0;
        const pct=total>0?done/total:0;
        const todayDate = localDateFromKey(todayLocalKey());
        const harvestDate = localDateFromKey(p.harvestDate);
        const isR=p.harvestDate&&harvestDate<=todayDate;
        const dL=harvestDate?Math.ceil((harvestDate-todayDate)/864e5):null;
        const zone=data.zones.find(z=>z.id===p.zone);
        const hasQty = p.plantCount || p.qty;
        return (
          <div key={p.id}>
          <Card onClick={()=>setSelP(p.id)} style={isR?{boxShadow:`0 0 0 2px ${C.orange}`}:{}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <Ring pct={pct} color={isR?C.orange:C.green}>{c?.emoji||"🌱"}</Ring>
              <div style={SX.flex1}>
                <div style={{fontSize:15,fontWeight:600}}>{p.name||p.crop}</div>
                <div style={{fontSize:12,color:C.t2,marginTop:2,display:"flex",gap:8,flexWrap:"wrap"}}>
                  {zone&&<span>📍 {zone.name}</span>}
                  {p.plantCount&&<span>🌱 {p.plantCount} plants</span>}
                  {p.qty&&p.measureType==="area"&&<span>📐 {p.qty}m²</span>}
                  {p.expectedYieldKg&&<span>📦 ~{p.expectedYieldKg}kg</span>}
                  {!hasQty&&p.plantDate&&<span>{p.plantDate}</span>}
                </div>
              </div>
              <div style={{display:"flex",gap:4,flexDirection:"column",alignItems:"flex-end"}}>
                {isR&&<Pill c={C.orange} bg={C.harvestBg}>🧺 Ready</Pill>}
                {dL>0&&<Pill>{dL}d</Pill>}
              </div>
            </div>
          </Card>
          </div>
        );
      })}</div>}

      {sp && <PlotOverlay plot={sp} data={data} setData={setData} onClose={()=>setSelP(null)}/>}

      {showAdd&&(
        <Overlay title="🌱 Plant a Crop" onClose={()=>{setShowAdd(false);setCropSearch("");setCropDropdownOpen(false);}}>
          <div style={SX.mb12}>
            <label style={{display:"block",fontSize:12,fontWeight:600,color:C.t2,marginBottom:5,fontFamily:F.body}}>Crop</label>
            <div style={{position:"relative"}}>
              <input
                type="text"
                placeholder={form.crop ? "" : "Type a letter (e.g. T) or tap to browse…"}
                value={cropDropdownOpen ? cropSearch : (form.crop ? ((rCM(data.region).get(form.crop)?.emoji||"🌱")+" "+form.crop) : "")}
                onFocus={function(){setCropDropdownOpen(true);setCropSearch("");}}
                onChange={function(e){setCropSearch(e.target.value);setCropDropdownOpen(true);}}
                onBlur={function(){setTimeout(function(){setCropDropdownOpen(false);},150);}}
                style={{width:"100%",padding:"10px 14px",paddingRight:36,border:`1.5px solid ${cropDropdownOpen?C.green:C.bdr}`,borderRadius:C.rs,background:C.card,fontSize:16,fontFamily:F.body,color:C.text,outline:"none",boxSizing:"border-box"}}
              />
              <div style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",fontSize:12,color:C.t2}}>{cropDropdownOpen?"▲":"▼"}</div>
              {cropDropdownOpen && (
                <div style={{position:"absolute",top:"100%",left:0,right:0,marginTop:4,background:C.card,border:`1.5px solid ${C.bdr}`,borderRadius:C.rs,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",maxHeight:320,overflowY:"auto",zIndex:10}}>
                  {!_cropPickerHasResults && (
                    <div style={{padding:"14px 16px",fontSize:13,color:C.t2,textAlign:"center"}}>No crops match "{cropSearch}"</div>
                  )}
                  {_cropGroupsForPicker.map(function(g){
                    if (g.crops.length === 0) return null;
                    return (
                      <div key={g.label}>
                        <div style={{padding:"6px 12px",fontSize:11,fontWeight:700,color:C.t2,textTransform:"uppercase",background:C.bg,position:"sticky",top:0,letterSpacing:"0.03em"}}>{g.label}</div>
                        {g.crops.map(function(c){
                          const isSel = c.name === form.crop;
                          return (
                            <div
                              key={c.name}
                              onMouseDown={function(e){e.preventDefault();setForm({...form,crop:c.name,variety:""});setCropSearch("");setCropDropdownOpen(false);}}
                              style={{padding:"9px 14px",fontSize:14,cursor:"pointer",background:isSel?C.soft:"transparent",color:C.text,borderBottom:`1px solid ${C.bdr}`}}
                              onMouseEnter={function(e){e.currentTarget.style.background=C.soft;}}
                              onMouseLeave={function(e){e.currentTarget.style.background=isSel?C.soft:"transparent";}}
                            >
                              <FarmIcon name={c.name} emoji={c.emoji} size={17}/> {c.name}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          {ci && getRegionalVarieties(ci.name, data.region).length > 0 && (
            <Sel label="Variety / Breed" value={form.variety} onChange={e=>setForm({...form,variety:e.target.value})} options={[{value:"",label:"— Any / General —"},...getRegionalVarieties(ci.name, data.region).map(v=>({value:v.name,label:`${v.name} — ${v.note.slice(0,50)}`}))]}/>
          )}
          {vi && <Card style={{marginBottom:10,background:C.soft,padding:12}}><div style={SX.lblGreen}>🧬 {vi.name}</div><div style={{fontSize:12,marginTop:4}}>{vi.note}</div>{vi.days!==ci.days&&<div style={{fontSize:11,color:C.gl,marginTop:2}}>Adjusted harvest: ~{vi.days} days (vs {ci.days} general)</div>}</Card>}
          {ci&&<Card style={{marginBottom:14,background:C.gp}}><div style={SX.s13}>Harvest ~<strong>{effectiveDays}d</strong> · {ci.waterFreq} · {ci.sun} · {ci.spacing}cm</div>{COMP[ci.name]&&<div style={{fontSize:12,color:C.gl,marginTop:4}}>✓ Good with: {COMP[ci.name].good.join(", ")}{COMP[ci.name].bad.length>0?` · ✕ Bad: ${COMP[ci.name].bad.join(", ")}`:""}</div>}</Card>}
          {vegZ.length>0&&(
            <div style={SX.mb12}>
              <label style={{display:"block",fontSize:12,fontWeight:600,color:C.t2,marginBottom:5}}>Zone</label>
              <select value={form.zone} onChange={e=>setForm({...form,zone:e.target.value})}
                style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${C.bdr}`,borderRadius:C.rs,background:C.card,fontSize:16,fontFamily:F.body,color:C.text,outline:"none",boxSizing:"border-box"}}>
                <option value="">Select zone...</option>
                {vegZ.map(z=>{
                  const sp=zoneSpace[z.id]||{totalM2:0,freeM2:0,pct:0};
                  const label = sp.totalM2 > 0
                    ? (sp.pct>=0.95 ? `📍 ${z.name} — FULL`
                    : `📍 ${z.name} — ${sp.freeM2}m² free of ${sp.totalM2.toFixed(0)}m²`)
                    : `📍 ${z.name}`;
                  return <option key={z.id} value={z.id}>{label}</option>;
                })}
              </select>
              {form.zone && _formZoneObj && _formZoneStats && _formZoneStats.totalM2 > 0 && (
                <div style={{marginTop:6}}>
                  <div style={{height:4,borderRadius:2,background:C.bdr,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${Math.min(100,_formZoneStats.pct*100).toFixed(0)}%`,background:_formZoneFill,borderRadius:2}}/>
                  </div>
                  <div style={{fontSize:11,color:_formZoneFill,marginTop:3,fontWeight:600}}>
                    {_formZoneStats.pct>=0.95?"⚠ Zone full — consider another zone or expand this zone"
                      :`${_formZoneStats.freeM2}m² available in this zone`}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quantity section — smart defaults based on crop type */}
          {ci && (
            <div style={{background:C.bg,borderRadius:C.rs,padding:"12px 14px",marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:700,color:C.t2,marginBottom:8}}>HOW MUCH ARE YOU PLANTING?</div>
              <div style={{display:"flex",gap:6,marginBottom:10}}>
                {["plants","area"].map(m=>(
                  <button key={m} onClick={()=>setForm({...form,measureType:m,qty:""})}
                    style={{padding:"5px 14px",borderRadius:16,border:"none",fontSize:12,fontWeight:600,cursor:"pointer",
                      background:activeMeasure===m?C.green:C.card,color:activeMeasure===m?"#fff":C.t2}}>
                    {m==="plants"?"🌱 By plant count":"📐 By area (m²)"}
                  </button>
                ))}
              </div>
              <div style={SX.grid2}>
                <div>
                  <label style={{display:"block",fontSize:12,fontWeight:600,color:C.t2,marginBottom:5}}>
                    {activeMeasure==="area"?"Area (m²)":"Number of plants"}
                  </label>
                  <input type="number" min="0" step={activeMeasure==="area"?"0.5":"1"} value={form.qty}
                    onChange={e=>setForm({...form,qty:e.target.value})}
                    placeholder={activeMeasure==="area"?"e.g. 4":"e.g. 6"}
                    style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${C.bdr}`,borderRadius:C.rs,fontSize:14,fontFamily:F.body,boxSizing:"border-box"}}/>
                </div>
                <div style={{display:"flex",flexDirection:"column",justifyContent:"flex-end",paddingBottom:2}}>
                  {plantsCalc!=null&&<div style={{fontSize:12,color:C.green,fontWeight:600}}>🌱 ~{plantsCalc} plants</div>}
                  {yieldCalc!=null&&<div style={{fontSize:12,color:C.orange,fontWeight:600}}>📦 ~{yieldCalc}kg yield</div>}
                  {ci.spacing&&<div style={SX.t2_11}>Spacing: {ci.spacing}cm</div>}
                </div>
              </div>
            </div>
          )}

          <Inp label="Name (optional)" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
          <Inp label="Plant Date" type="date" value={form.plantDate} max={todayLocalKey()} onChange={e=>setForm({...form,plantDate:e.target.value})}/>
          {form.plantDate&&ci&&<div style={{fontSize:12,color:C.green,marginBottom:10}}>🧺 Harvest: {autoH()}</div>}
          <Inp label="Seed Cost (€)" type="number" value={form.cost} onChange={e=>setForm({...form,cost:e.target.value})}/>
          <div style={SX.btnRowEnd}><Btn v="secondary" onClick={()=>{setShowAdd(false);setCropSearch("");setCropDropdownOpen(false);}}>Cancel</Btn><Btn onClick={add} dis={!form.crop}>Plant</Btn></div>
        </Overlay>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   MAP SCREEN — read-only farm map ↔ Layout editor
   "Map" is its own sidebar item: the map plus zone details and an
   Edit Layout button. Editing opens the Farm Designer (Setup), which
   has no nav item of its own (Onboarding owns the first-run setup).
   Crops is now a separate top-level screen.
   ════════════════════════════════════════════ */
function MapScreen({data, setData, pageData, clearPageData, setPage}) {
  const [editing, setEditing] = useState(function() {
    return !!(pageData && pageData.edit);
  });

  useEffect(function() { clearPageData(); }, [clearPageData]);

  function handlePlantInZone(zoneId) {
    // Crops is its own page now — hand the zone over so the plant form pre-fills.
    setPage("crops", {zone: zoneId});
  }

  if (editing) {
    return (
      <div style={{maxWidth:1100}}>
        <Setup data={data} setData={setData} onPlantInZone={handlePlantInZone} onBack={function(){setEditing(false);}}/>
      </div>
    );
  }

  return (
    <div style={{maxWidth:1100}}>
      <GroveScene data={data} setData={setData} onEditLayout={function(){setEditing(true);}} onPlantInZone={handlePlantInZone} onShowCrops={function(){setPage("crops");}}/>
    </div>
  );
}

/* ════════════════════════════════════════════
   CROPS SCREEN — plant + track crops. Own sidebar item.
   ════════════════════════════════════════════ */
function CropsScreen(props) {
  return <Farming {...props}/>;
}

export { MapScreen, CropsScreen, Setup };
export default MapScreen;

