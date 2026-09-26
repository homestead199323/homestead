import PlantingForm from '../quiet/PlantingForm';
import React, { useState, useEffect, useMemo, useRef } from "react";
import { C, F, SX } from "../../lib/theme";
import { Btn, Card, Pill, Ring, Stat } from "../../components/ui";
import {bedRows, growthOf} from "../quiet/farm-model";
import {ChevronDown, ChevronRight} from "lucide-react";
import { NurseryList } from "../nursery/NurseryUI";
import { activeBatches } from "../nursery/nursery-model";
import {isTreeCrop} from "../quiet/planting-plan";
import PlantArt from "../quiet/PlantArt";
import MapLines from "../quiet/MapLines";
import { REGIONS, REGION_MAP } from "../../data/regions";
import { ZT, ZT_MAP } from "../../data/zones";
import { searchCity } from "../../data/cities";
import { uid } from "../../lib/storage";
import { todayLocalKey, localDateFromKey } from "../../lib/utils";
import { getRegionalCrops, rCM } from "../../lib/regional";
import PlotOverlay from "./PlotOverlay";
import GroveScene from "../grove/GroveScene";
import {ORNAMENT_TYPES,ornamentTypesFor,MAX_ORNAMENTS} from "../quiet/ornaments";
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

function Setup({data, setData:saveData, onPlantInZone, onBack}) {
  const [history,setHistory]=useState({past:[],future:[],gesture:false});
  const gesture=useRef(false);
  const snapshot=d=>({zones:d.zones,garden:d.garden,livestock:d.livestock,ornaments:d.ornaments,mapLines:d.mapLines,farmW:d.farmW,farmH:d.farmH,roadsEnabled:d.roadsEnabled});
  function setData(next){if(!gesture.current)setHistory(h=>({...h,past:[...h.past.slice(-49),snapshot(data)],future:[]}));saveData(next);}
  function beginEdit(){gesture.current=true;setHistory(h=>({...h,past:[...h.past.slice(-49),snapshot(data)],future:[],gesture:true}));}
  function endEdit(){gesture.current=false;setHistory(h=>({...h,gesture:false}));}
  function travel(redo){const source=redo?history.future:history.past;if(!source.length)return;const prev=source[source.length-1];setHistory(redo?{past:[...history.past,snapshot(data)],future:history.future.slice(0,-1),gesture:false}:{past:history.past.slice(0,-1),future:[...history.future,snapshot(data)],gesture:false});saveData({...data,...prev});setFarmW(prev.farmW||100);setFarmH(prev.farmH||60);setSel(null);}

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
  const mapEnv = resolveEnvironment(data);
  const ORN_PALETTE = ornamentTypesFor(mapEnv);
  /* Stage 4c: balcony/backyard canvases are the real space and can be far
     smaller than a farm — a 10 m floor would lock balcony users out of
     editing their own dimensions (starter canvas can be 3×2 m). */
  const sizeMin = mapEnv === "balcony" ? 2 : mapEnv === "backyard" ? 4 : 10;
  const sizeLabel = mapEnv === "farm" ? "Total farm size" : "Total space size";
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
  const delZ = id => { setData({...data,zones:data.zones.filter(z=>z.id!==id),garden:{...data.garden,plots:data.garden.plots.map(p=>p.zone===id?{...p,zone:""}:p)},livestock:{...data.livestock,animals:data.livestock.animals.map(a=>a.zone===id?{...a,zone:""}:a)}});setSel(null); };

  /* ── Grove editor plumbing ── */
  const groveData = {...data, zones, farmW, farmH, ornaments: data.ornaments || []};
  function clampGeom(g) {
    const wM = Math.max(.2, Math.min(farmW, g.wM));
    const hM = Math.max(.2, Math.min(farmH, g.hM));
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
    const defaultWM = Math.min(farmW*.3, t==="beehive"?1:t==="house"?8:3), defaultHM = Math.min(farmH*.3,t==="beehive"?1:t==="house"?6:1.2);
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
                selectedId:sel, onBeginEdit:beginEdit, onEndEdit:endEdit,
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
        maxHeight:"43dvh",overflowY:"auto",padding:"10px 14px calc(10px + env(safe-area-inset-bottom))"}}>
        <div style={{maxWidth:720, margin:"0 auto"}}>
          <div className="q-row" style={{marginBottom:10}}><button className="q-secondary" disabled={!history.past.length} onClick={()=>travel(false)}>Undo</button><button className="q-secondary" disabled={!history.future.length} onClick={()=>travel(true)}>Redo</button><small style={{color:C.t2}}>Top view · edits save automatically</small></div>

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
                <MeterField label="Width" value={sz.wM} min={.2} max={farmW} onCommit={function(n) { commitGeom("wM", n); }}/>
                <MeterField label="Height" value={sz.hM} min={.2} max={farmH} onCommit={function(n) { commitGeom("hM", n); }}/>
              </div>
              <details className="q-inset"><summary>Rows & appearance</summary><div className="q-grid2">
                {isPlantZone&&<label>Number of rows<input type="number" min="1" max="100" value={sz.rowCount||bedRows(sz)} onChange={e=>{const n=+e.target.value;if(Number.isInteger(n)&&n>=1&&n<=100)upZ(sz.id,{rowCount:n});}}/></label>}
                <label>Material<select value={sz.material||"wood"} onChange={e=>upZ(sz.id,{material:e.target.value})}><option value="wood">Natural wood</option><option value="stone">Pale stone</option><option value="metal">Soft metal</option></select></label>
                <label>Colour<select value={sz.color||"sage"} onChange={e=>upZ(sz.id,{color:e.target.value})}><option value="sage">Sage</option><option value="clay">Clay</option></select></label>
                {["water","pasture","compost"].includes(sz.type)&&<label>Shape<select value={sz.shape||"rectangle"} onChange={e=>upZ(sz.id,{shape:e.target.value})}><option value="rectangle">Rectangle</option><option value="oval">Oval</option></select></label>}
              </div><div className="q-row q-wrap"><button className="q-secondary" disabled={sz.hM>farmW||sz.wM>farmH} title={sz.hM>farmW||sz.wM>farmH?"The rotated area would not fit within your farm dimensions":undefined} onClick={()=>{const c=clampGeom({...sz,wM:sz.hM,hM:sz.wM});upZ(sz.id,{...c,rowAxis:sz.rowAxis==='vertical'?'horizontal':'vertical'});}}>Rotate 90°</button><button className="q-secondary" onClick={()=>{const z={...sz,id:uid(),name:sz.name+' copy',...clampGeom({...sz,xM:sz.xM+.5,yM:sz.yM+.5})};setData({...data,zones:[...data.zones,z]});setSel(z.id);}}>Duplicate area</button></div><small>Duplicating copies the area and its appearance. Plantings and animals stay in their original area.</small></details>
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

              <div style={{fontSize:11, fontWeight:700, color:C.t2, textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:6}}>{sizeLabel}</div>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:10, alignItems:"end", marginBottom:4}}>
                <MeterField label="Width (m)" value={farmW} min={sizeMin} max={2000}
                  onCommit={function(n) { const v = n; setFarmW(v); setData({...data, farmW: v,zones:zones.map(z=>({...z,wM:Math.min(z.wM,v),xM:Math.max(0,Math.min(z.xM,v-z.wM))}))}); }}/>
                <MeterField label="Height (m)" value={farmH} min={sizeMin} max={2000}
                  onCommit={function(n) { const v = n; setFarmH(v); setData({...data, farmH: v,zones:zones.map(z=>({...z,hM:Math.min(z.hM,v),yM:Math.max(0,Math.min(z.yM,v-z.hM))}))}); }}/>
                <div style={{fontSize:11, color:C.t3, fontFamily:F.mono, paddingBottom:10, whiteSpace:"nowrap"}}>{(farmW*farmH).toLocaleString()} m²</div>
              </div>
              <div style={{fontSize:11, color:C.t3, marginBottom:16}}>Areas are kept inside the space when its size changes. Recheck planting rows after shrinking an area.</div>

              <section className="q-inset"><h3>Ground & paths</h3><div className="q-grid2">{[
                ['groundMaterial','Ground material',[['meadow','Grass'],['soil','Soil'],['gravel','Gravel'],['stone','Stone']]],
                ['groundColor','Ground color',[['natural','Natural'],['dry','Warm / dry'],['deep','Deep green']]],
                ['pathMaterial','Path material',[['gravel','Gravel'],['stone','Stone'],['earth','Earth']]],
                ['pathColor','Path color',[['light','Light'],['warm','Warm sand'],['dark','Slate']]],
              ].map(([key,label,options])=><label key={key}>{label}<select value={data.mapStyle?.[key]||options[0][0]} onChange={e=>setData({...data,mapStyle:{...data.mapStyle,[key]:e.target.value}})}>{options.map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></label>)}</div></section>

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

              <MapLines data={data} setData={setData}/>
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
  const [openSec,setOpenSec]=useState({});
  const [showAll,setShowAll]=useState({});
  const [initial,setInitial]=useState({});
  useEffect(()=>{if(pageData?.crop||pageData?.zone){setInitial(pageData);setShowAdd(true);clearPageData?.();}},[pageData,clearPageData]);
  const sp=data.garden.plots.find(p=>p.id===selP);
  // Pre-computed values to avoid IIFEs in JSX (IIFEs crash the app)
  const _active=data.garden.plots.filter(function(p){return p.status!=="harvested";});
  const _totalArea=_active.reduce(function(s,p){return s+(p.measureType==="area"?+(p.qty||0):0);},0);
  const _totalYield=_active.reduce(function(s,p){return s+(p.expectedYieldKg||0);},0);
  const _ready=_active.filter(function(p){return p.harvestDate&&localDateFromKey(p.harvestDate)<=localDateFromKey(todayLocalKey());}).length;
  // Trees (orchard crops or any fruit/nut tree) get their own section, separate from vegetable beds.
  // Sections: vegetable beds, herbs, and trees (orchard areas or any fruit/nut tree, wherever planted).
  const _cropMap=rCM(data.region);
  const _kind=function(p){const z=data.zones.find(z=>z.id===p.zone);const c=_cropMap.get(p.crop);if(z?.type==="orchard"||isTreeCrop(c))return "orchard";if(c?.cat==="Herb"||z?.type==="herbs")return "herbs";return "beds";};
  const _today=localDateFromKey(todayLocalKey());
  const _dueIn=function(p){const h=localDateFromKey(p.harvestDate);return h?(h-_today)/864e5:Infinity;};
  const _sum=function(list,key){return list.reduce(function(s,p){return s+(+p[key]||0);},0);};
  const _sections=[["beds","Vegetable beds","plants"],["herbs","Herbs","plants"],["orchard","Orchard","trees"]].map(function([key,title,unit]){
    const plots=_active.filter(function(p){return _kind(p)===key;}).sort(function(a,b){return _dueIn(a)-_dueIn(b);});
    return {key,title,unit,plots,count:_sum(plots,"plantCount"),kg:_sum(plots,"expectedYieldKg"),ready:plots.filter(function(p){return _dueIn(p)<=0;}).length};
  });
  const _PREVIEW=5;
  const _seedlings=activeBatches(data);
  function renderCrop(p,unit){
        const c=rCM(data.region).get(p.crop);
        const growth=growthOf(p,c,todayLocalKey());
        const pct=growth.progress;
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
              <Ring pct={pct} size={60} color={isR?C.orange:C.green}><PlantArt crop={p.crop} stage={growth.index} size={48}/></Ring>
              <div style={SX.flex1}>
                <div style={{fontSize:15,fontWeight:600}}>{p.name||p.crop}</div>
                <div style={{fontSize:12,color:C.t2,marginTop:2,display:"flex",gap:8,flexWrap:"wrap"}}>
                  {zone&&<span>📍 {zone.name}</span>}
                  {p.plantCount&&<span>{unit==="trees"?"🌳":"🌱"} {p.plantCount} {p.plantCount===1?unit.slice(0,-1):unit}</span>}
                  {p.qty&&p.measureType==="area"&&<span>📐 {p.qty}m²</span>}
                  {p.expectedYieldKg&&<span>📦 ~{p.expectedYieldKg}kg</span>}
                  {!hasQty&&p.plantDate&&<span>{p.plantDate}</span>}
                  {p.status==="planned"&&p.plannedDate&&<span>🌱 from nursery · plant out {localDateFromKey(p.plannedDate).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</span>}
                </div>
              </div>
              <div style={{display:"flex",gap:4,flexDirection:"column",alignItems:"flex-end"}}>
                {isR&&<Pill c={C.orange} bg={C.harvestBg}>Harvest window</Pill>}
                {dL>0&&<Pill>~{dL}d</Pill>}<small style={{fontSize:11,color:C.t2}}>{growth.label}</small>
              </div>
            </div>
          </Card>
          </div>
        );
  }
  return (
    <div className="page-enter" style={SX.mw800}>
      <div style={SX.pageHead}>
        <div><h2 style={SX.headerH2}>Your crops</h2><p style={SX.pageSubHead}>Track your crops from seed to harvest</p></div>
        <Btn onClick={()=>setShowAdd(true)}>+ Plant Crop</Btn>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:10,marginBottom:20}}>
        <Stat label="Active Crops" value={_active.length}/>
        {_sections[0].count+_sections[1].count>0&&<Stat label="Plants" value={_sections[0].count+_sections[1].count} sub="veg and herbs"/>}
        {_sections[2].count>0&&<Stat label="Trees" value={_sections[2].count} sub="fruit and nut"/>}
        {_totalArea>0&&<Stat label="Total Area" value={`${_totalArea.toFixed(0)}m²`} sub="under cultivation"/>}
        {_totalYield>0&&<Stat label="Est. Yield" value={`${_totalYield.toFixed(0)}kg`} sub="at harvest" color={C.green}/>}
        <Stat label="Ready" value={_ready} sub="to harvest" color={C.orange}/>
      </div>
      {(_seedlings.length>0||data.zones.some(function(z){return z.type==="nursery";}))&&(
        <section style={{marginBottom:18}}>
          <button type="button" aria-expanded={openSec.seedlings??true} onClick={function(){setOpenSec({...openSec,seedlings:!(openSec.seedlings??true)});}}
            style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,width:"100%",padding:"8px 2px",margin:"0 0 6px",background:"none",border:0,borderBottom:`1px solid ${C.bdr}`,cursor:"pointer",color:C.text,textAlign:"left"}}>
            <span style={{display:"flex",alignItems:"center",gap:8}}>
              {(openSec.seedlings??true)?<ChevronDown size={18}/>:<ChevronRight size={18}/>}
              <span style={{fontSize:17,fontWeight:650}}>Seedlings</span>
            </span>
            <small style={{color:C.t2,fontSize:12}}>{_seedlings.length} {_seedlings.length===1?"batch":"batches"} · {_seedlings.reduce(function(n,b){return n+b.cells;},0)} cells</small>
          </button>
          {(openSec.seedlings??true)&&<NurseryList data={data} setData={setData}/>}
        </section>)}
      {_active.length===0?
        <Card style={{textAlign:"center",padding:"56px 24px",background:C.grdLight}}><div style={SX.emptyIcon}>🌱</div><div style={SX.s15Bold}>Ready to grow?</div><div style={{color:C.t2,marginTop:6,fontSize:12.5,maxWidth:240,margin:"6px auto 0"}}>Tap "Plant Crop" to add your first seeds and start tracking</div></Card>:
      <>{_sections.map(function(sec){
        if(!sec.plots.length)return null;
        const open=openSec[sec.key]??true, all=showAll[sec.key]||sec.plots.length<=_PREVIEW+1;
        const shown=all?sec.plots:sec.plots.slice(0,_PREVIEW);
        return (
        <section key={sec.key} style={{marginBottom:18}}>
          <button type="button" aria-expanded={open} onClick={function(){setOpenSec({...openSec,[sec.key]:!open});}}
            style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,width:"100%",padding:"8px 2px",margin:"0 0 6px",background:"none",border:0,borderBottom:`1px solid ${C.bdr}`,cursor:"pointer",color:C.text,textAlign:"left"}}>
            <span style={{display:"flex",alignItems:"center",gap:8}}>
              {open?<ChevronDown size={18}/>:<ChevronRight size={18}/>}
              <span style={{fontSize:17,fontWeight:650}}>{sec.title}</span>
              {sec.ready>0&&<Pill c={C.orange} bg={C.harvestBg}>{sec.ready} ready</Pill>}
            </span>
            <small style={{color:C.t2,fontSize:12}}>{sec.plots.length} {sec.plots.length===1?"crop":"crops"} · {sec.count} {sec.unit}{sec.kg>0?` · ~${Math.round(sec.kg)}kg`:""}</small>
          </button>
          {open&&<div style={{display:"grid",gap:8}}>{shown.map(function(p){return renderCrop(p,sec.unit);})}</div>}
          {open&&sec.plots.length>_PREVIEW+1&&(
            <button type="button" className="q-text-button" style={{marginTop:8}} onClick={function(){setShowAll({...showAll,[sec.key]:!all});}}>
              {all?"Show fewer":`Show all ${sec.plots.length} crops`}
            </button>)}
        </section>);})}</>}

      {sp && <PlotOverlay plot={sp} data={data} setData={setData} onClose={()=>setSelP(null)}/>}

      {showAdd&&<PlantingForm data={data} setData={setData} initial={initial} onClose={()=>{setShowAdd(false);setInitial({});}}/>}
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


