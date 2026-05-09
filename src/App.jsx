import React, { useState, useEffect, useCallback, useMemo, useRef, useReducer } from "react";
import { createPortal } from "react-dom";
import {
  Home, ClipboardList, Map as MapIcon, Sprout, Rabbit, CalendarDays, Package,
  TrendingUp, BookOpen, MessageSquare, MoreHorizontal, PawPrint,
  Settings, ChevronLeft, ChevronRight, Send, Search, Plus,
  Check, AlertTriangle, Info, Download, Upload, Leaf, Moon, Sun, Trash2, User
} from "lucide-react";

import {
  uid,
  loadFarm, saveFarm, flushFarm, exportFarm,
  loadPage, savePage,
  loadTheme, saveTheme,
  loadFeedbackDone, markFeedbackDone,
  loadFeedbackDismissed, markFeedbackDismissed,
  loadFirstUse, saveFirstUse,
} from "./lib/storage";
import { C, F, SX } from "./lib/theme";
import { ZT, ZT_MAP } from "./data/zones";
import { COMP } from "./data/companions";
import { VARIETIES, VAR_RO } from "./data/varieties";
import { CROPS, CROP_MAP, CROP_COLORS } from "./data/crops";
import { REGIONS, REGION_MAP } from "./data/regions";
import { RO, LDB_RO } from "./data/regional-overrides";
import { LDB } from "./data/livestock";
import { LIVESTOCK_CALENDAR } from "./data/livestock-calendar";
import { PRESERVATION } from "./data/preservation";
import { BADGES } from "./data/badges";
import { PROJECT_GUIDES, BLUEPRINT_IMAGES } from "./data/projects";
import { appendLog, todayLocalKey, localDateFromKey, addDaysToLocalKey, daysBetweenLocalKeys, markTaskDone } from "./lib/utils";
import { CITY_DB, searchCity } from "./data/cities";
import { getRegionalCrops, rCM, rCR, getRegionalVarieties } from "./lib/regional";
import { cropMeasureType, plantsFromArea, expectedYield, buildZoneSpaceMap } from "./lib/farm-calc";
import { buildTaskQueue } from "./lib/task-queue";
import { MN_FULL, MN_ABR, CROP_DIFFICULTY } from "./lib/calendar";
import { migrateZones, migrateGamify, migrateCompletions, updateGamify } from "./lib/migrations";
import { farmKnowledgeEngine, buildAISuggestions } from "./lib/ai";
import { Btn, Card, Inp, Sel, Txt, Overlay, Pill, Tooltip, Ring, Stat, StepChecklist, WaterCard, StorageCard } from "./components/ui";
import Pantry from "./features/pantry/Pantry";
import Financials from "./features/financials/Financials";
import Manuals from "./features/manuals/Manuals";
import Livestock from "./features/animals/Livestock";
import AnimalOverlay from "./features/animals/AnimalOverlay";
import PlotOverlay from "./features/farm/PlotOverlay";
import TaskQueue from "./features/tasks/TaskQueue";
/* ═══════════════════════════════════════════
   DEFAULT STATE
   ═══════════════════════════════════════════ */
const DEF = {schemaVersion:7,zones:[],garden:{plots:[]},livestock:{animals:[]},pantry:{items:[]},costs:{items:[]},log:[],setupDone:false,region:"western_europe",city:"",
  // Daily task completions — keyed by local YYYY-MM-DD, value is array of task keys
  // completed on that day. Auto-pruned to last 30 days on migration.
  completions: {},
  // Gamification state
  gamify: {
    streak: 0,               // Current consecutive-day streak
    bestStreak: 0,           // All-time best streak
    lastActiveDate: null,    // ISO date string "YYYY-MM-DD" of last logged activity
    badges: [],              // Array of { id, unlockedAt } for earned badges
    totalHarvests: 0,        // Lifetime harvest count
    totalPlants: 0,          // Lifetime plant count
    totalLogEntries: 0,      // Lifetime activity log entries
  },
};

/* ═══════════════════════════════════════════
   BADGE DEFINITIONS — real farming milestones
   ═══════════════════════════════════════════ */



/* ═══════════════════════════════════════════
   TASK QUEUE ENGINE — sorted by urgency
   ═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   (FarmMap component removed — replaced by div-based farm map in Setup)
   ═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   WEATHER DASHBOARD CARD — full card for dashboard
   ═══════════════════════════════════════════ */


/* ═══════════════════════════════════════════
   FARM SETUP — simplified editing
   ═══════════════════════════════════════════ */
function Setup({data, setData}) {
  const [showAdd, setShowAdd] = useState(false);
  const [sel, setSel] = useState(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({name:"", type:"veg", wM:"10", hM:"8"});
  const [farmW, setFarmW] = useState(data.farmW || 100); // total farm width in meters
  const [farmH, setFarmH] = useState(data.farmH || 60);  // total farm height in meters
  const [dragging, setDragging] = useState(null); // {id, startX, startY, origXM, origYM}
  const [zoneResize, setZoneResize] = useState(null); // {id, edge, startX, startY, origXM, origYM, origWM, origHM}
  const [cropDrag, setCropDrag] = useState(null); // {plotId, zoneId, startX, startY, origPx, origPy}
  const [cropResize, setCropResize] = useState(null); // {plotId, zoneId, startX, startY, origPw, origPh, frac}
  const [hoverInfo, setHoverInfo] = useState(null); // zone hover tooltip
  const svgRef = useRef(null);
  const [cityQuery, setCityQuery] = useState(data.city || "");
  const [cityResults, setCityResults] = useState([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const cityRef = useRef(null);
  const curRegion = REGION_MAP.get(data.region || "western_europe");
  const regionCropCount = getRegionalCrops(data.region || "western_europe").length;

  // Zones already migrated to meter coords on load (see migrateZones)
  const zones = data.zones;

  const upZ = (id, u) => setData({...data, zones: data.zones.map(z => z.id===id ? {...z,...u} : z)});
  const delZ = id => { setData({...data, zones: data.zones.filter(z => z.id !== id)}); setSel(null); };
  const upPlot = (plotId, u) => setData({...data, garden:{...data.garden, plots: data.garden.plots.map(p => p.id===plotId ? {...p,...u} : p)}});
  const sz = zones.find(z => z.id === sel);

  const doSave = () => {
    setData({...data, setupDone:true, farmW, farmH,
      zones: zones // save with meter coords
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addZ = () => {
    if (!form.name) return;
    const wM = Math.max(1, +form.wM || 10);
    const hM = Math.max(1, +form.hM || 8);
    setData({...data, zones:[...data.zones, {
      id:uid(), name:form.name, type:form.type,
      xM:2, yM:2, wM, hM,
      // keep legacy fields for compatibility
      x:2/farmW*100, y:2/farmH*100, w:wM/farmW*100, h:hM/farmH*100
    }]});
    setForm({name:"", type:"veg", wM:"10", hM:"8"});
    setShowAdd(false);
  };

  // Drag is handled inline on the map container div

  return (
    <div className="page-enter" style={{maxWidth:860}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={SX.headerH2}>🗺 Farm Designer</h2>
          <p style={{color:C.t2,fontSize:13,margin:"4px 0",fontWeight:500}}>Drag zones to position · Enter real measurements in metres</p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <Btn v="secondary" onClick={()=>setShowAdd(true)}>+ Zone</Btn>
          {data.zones.length>0 && <Btn onClick={doSave}>{saved?"✓ Saved!":"Save Layout"}</Btn>}
        </div>
      </div>

      {/* Climate Region — city input */}
      <Card style={{marginBottom:12,padding:"14px 18px",background:C.grdLight,border:`1.5px solid ${C.gm}`}}>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
          <span style={{fontSize:18}}>{curRegion ? curRegion.emoji : "🌍"}</span>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:C.green}}>Climate Region{curRegion ? `: ${curRegion.name}` : ""}</div>
            <div style={SX.t2_11}>{curRegion ? curRegion.desc : "Type your city below to set your growing region"}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:12,alignItems:"flex-start",flexWrap:"wrap"}}>
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
              style={{width:"100%",padding:"8px 12px",border:`1.5px solid ${C.bdr}`,borderRadius:10,fontSize:14,fontFamily:F.body,background:"#fff",outline:"none",boxSizing:"border-box"}}/>
            {showCityDropdown && cityResults.length > 0 && (
              <div style={{position:"absolute",top:"100%",left:0,right:0,background:"#fff",border:`1px solid ${C.bdr}`,borderRadius:10,boxShadow:C.shL,zIndex:50,maxHeight:220,overflowY:"auto",marginTop:4}}>
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
              style={{width:"100%",padding:"8px 12px",border:`1.5px solid ${C.bdr}`,borderRadius:10,fontSize:13,fontFamily:F.body,background:"#fff",cursor:"pointer",boxSizing:"border-box"}}>
              {REGIONS.map(function(r) {
                return <option key={r.id} value={r.id}>{r.emoji} {r.name} — {r.examples}</option>;
              })}
            </select>
          </div>
        </div>
        {curRegion && <div style={{marginTop:8,fontSize:11,color:C.t2,fontStyle:"italic"}}>{regionCropCount} crops available for {curRegion.name} climate</div>}
      </Card>

      {/* Farm size config */}
      <Card style={{marginBottom:12,padding:"10px 16px"}}>
        <div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontSize:12,fontWeight:700,color:C.t2}}>🗺 Total Farm Size:</span>
          <div style={SX.rowCenterG6}>
            <label style={SX.t2_12}>Width</label>
            <input type="number" min="10" max="2000" value={farmW}
              onChange={e => { const v = +e.target.value||100; setFarmW(v); setData({...data, farmW:v}); }}
              style={{width:70,padding:"4px 8px",border:`1px solid ${C.bdr}`,borderRadius:6,fontSize:13,fontFamily:F.mono}}/>
            <span style={SX.t2_12}>m</span>
          </div>
          <div style={SX.rowCenterG6}>
            <label style={SX.t2_12}>Height</label>
            <input type="number" min="10" max="2000" value={farmH}
              onChange={e => { const v = +e.target.value||60; setFarmH(v); setData({...data, farmH:v}); }}
              style={{width:70,padding:"4px 8px",border:`1px solid ${C.bdr}`,borderRadius:6,fontSize:13,fontFamily:F.mono}}/>
            <span style={SX.t2_12}>m</span>
          </div>
          <span style={{fontSize:11,color:C.t3,fontFamily:F.mono}}>{farmW}m × {farmH}m = {(farmW*farmH).toLocaleString()} m²</span>
        </div>
      </Card>

      {/* Draggable Farm Map — clean light style (matches Dashboard) */}
      <div ref={svgRef} style={{
        position:"relative",
        background:"linear-gradient(180deg,#f7faf5,#edf4e8)",
        border:`1px solid ${C.bdr}`,borderRadius:16,overflow:"hidden",
        minHeight:440,userSelect:"none",
        cursor:dragging?"grabbing":"default",
      }}
        onClick={e => { if (e.target === svgRef.current) setSel(null); }}
        onMouseMove={e => {
          const rect = svgRef.current.getBoundingClientRect();
          const curX = e.clientX - rect.left;
          const curY = e.clientY - rect.top;
          // Crop patch resize — adjust width/height while keeping same area fraction
          if (cropResize) {
            const zoneEl = document.getElementById(`zone-${cropResize.zoneId}`);
            if (zoneEl) {
              const zr = zoneEl.getBoundingClientRect();
              const dx = (curX - (zr.left - rect.left) - cropResize.startX) / zr.width;
              let newPw = Math.max(0.15, Math.min(1, cropResize.origPw + dx));
              let newPh = Math.max(0.08, Math.min(1, cropResize.frac / newPw)); // keep area constant
              newPh = Math.min(1, newPh);
              upPlot(cropResize.plotId, {patchW: newPw, patchH: newPh});
            }
            return;
          }
          // Crop patch drag — move within zone
          if (cropDrag) {
            const zoneEl = document.getElementById(`zone-${cropDrag.zoneId}`);
            if (zoneEl) {
              const zr = zoneEl.getBoundingClientRect();
              const dx = (curX - (zr.left - rect.left) - cropDrag.startX) / zr.width;
              const dy = (curY - (zr.top - rect.top) - cropDrag.startY) / zr.height;
              const newPx = Math.max(0, Math.min(1, cropDrag.origPx + dx));
              const newPy = Math.max(0, Math.min(1, cropDrag.origPy + dy));
              upPlot(cropDrag.plotId, {patchX: newPx, patchY: newPy});
            }
            return;
          }
          // Zone resize — drag edges/corners to change size
          if (zoneResize) {
            const dxM = ((curX - zoneResize.startX) / rect.width) * farmW;
            const dyM = ((curY - zoneResize.startY) / rect.height) * farmH;
            const e2 = zoneResize.edge;
            let {origXM, origYM, origWM, origHM} = zoneResize;
            let newXM = origXM, newYM = origYM, newWM = origWM, newHM = origHM;
            if (e2.includes("r")) newWM = Math.max(3, origWM + dxM);
            if (e2.includes("b")) newHM = Math.max(3, origHM + dyM);
            if (e2.includes("l")) { newXM = Math.max(0, origXM + dxM); newWM = Math.max(3, origWM - dxM); }
            if (e2.includes("t")) { newYM = Math.max(0, origYM + dyM); newHM = Math.max(3, origHM - dyM); }
            upZ(zoneResize.id, {xM:newXM, yM:newYM, wM:newWM, hM:newHM, x:newXM/farmW*100, y:newYM/farmH*100, w:newWM/farmW*100, h:newHM/farmH*100});
            return;
          }
          // Zone drag
          if (!dragging) return;
          const dxPct = ((curX - dragging.startX) / rect.width) * 100;
          const dyPct = ((curY - dragging.startY) / rect.height) * 100;
          const dxM = dxPct / 100 * farmW;
          const dyM = dyPct / 100 * farmH;
          const z = zones.find(z => z.id === dragging.id);
          const newXM = Math.max(0, Math.min(farmW - (z.wM||10), dragging.origXM + dxM));
          const newYM = Math.max(0, Math.min(farmH - (z.hM||8), dragging.origYM + dyM));
          upZ(dragging.id, {xM: newXM, yM: newYM, x: newXM/farmW*100, y: newYM/farmH*100});
        }}
        onMouseUp={() => { setDragging(null); setZoneResize(null); setCropDrag(null); setCropResize(null); }}
        onMouseLeave={() => { setDragging(null); setZoneResize(null); setCropDrag(null); setCropResize(null); setHoverInfo(null); }}>

        {/* Grid overlay */}
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(to right, rgba(80,95,80,.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(80,95,80,.06) 1px, transparent 1px)",backgroundSize:"24px 24px",pointerEvents:"none"}}/>

        {/* Grid labels — X axis (every 10m) */}
        <div style={{position:"absolute",bottom:2,left:0,right:0,display:"flex",pointerEvents:"none"}}>
          {Array.from({length: Math.floor(farmW/10)+1}).map((_,i) => (
            <span key={i} style={{position:"absolute",left:`${(i*10/farmW)*100}%`,transform:"translateX(-50%)",fontSize:8,fontFamily:F.mono,color:"rgba(80,95,80,.35)"}}>{i*10}m</span>
          ))}
        </div>
        {/* Grid labels — Y axis (every 10m) */}
        <div style={{position:"absolute",top:0,left:2,bottom:0,pointerEvents:"none"}}>
          {Array.from({length: Math.floor(farmH/10)+1}).map((_,i) => (
            <span key={i} style={{position:"absolute",top:`${(i*10/farmH)*100}%`,fontSize:8,fontFamily:F.mono,color:"rgba(80,95,80,.35)"}}>{i*10}m</span>
          ))}
        </div>

        {/* North indicator */}
        <div style={{position:"absolute",top:8,left:12,fontSize:10,fontFamily:F.mono,fontWeight:700,color:"rgba(80,95,80,.35)",pointerEvents:"none"}}>N↑</div>

        {/* Zone hover tooltip */}
        {!dragging && hoverInfo && (
          <div style={{
            position:"absolute", left: hoverInfo.x, top: hoverInfo.y - 8,
            transform:"translate(-50%, -100%)", zIndex:50, pointerEvents:"none",
            minWidth:180, maxWidth:240,
          }}>
            <div style={{
              background:"#1d1d1f", color:"#fff", borderRadius:10, padding:"10px 14px",
              fontSize:12, lineHeight:1.5, fontFamily:F.body, boxShadow:"0 8px 24px rgba(0,0,0,.25)",
            }}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>{hoverInfo.icon} {hoverInfo.name}</div>
              <div style={{opacity:.7,fontSize:11,marginBottom:2}}>{hoverInfo.typeLabel}</div>
              <div style={{opacity:.7,fontSize:11}}>{hoverInfo.wM}×{hoverInfo.hM}m · {hoverInfo.area} m²</div>
              {hoverInfo.cropCount > 0 && <div style={{marginTop:4,fontSize:11,color:"#95d5b2"}}>{hoverInfo.cropCount} crop{hoverInfo.cropCount>1?"s":""} planted</div>}
              {hoverInfo.animalCount > 0 && <div style={{fontSize:11,color:"#ffcc00"}}>{hoverInfo.animalCount} animal{hoverInfo.animalCount>1?"s":""}</div>}
            </div>
            <div style={{width:0,height:0,borderLeft:"6px solid transparent",borderRight:"6px solid transparent",borderTop:"6px solid #1d1d1f",margin:"0 auto"}}/>
          </div>
        )}

        {/* Zone blocks — with crop color patches (same as Dashboard) */}
        {(()=>{
          const SETUP_CC = CROP_COLORS;
          const setupColorMap = new Map(); let sci=0;
          data.garden.plots.forEach(p=>{ if(p.status!=="harvested"&&!setupColorMap.has(p.crop)){setupColorMap.set(p.crop,SETUP_CC[sci%SETUP_CC.length]);sci++;} });
          return zones.map(z => {
            const zt = ZT_MAP.get(z.type);
            const xPct = ((z.xM||0) / farmW * 100).toFixed(2);
            const yPct = ((z.yM||0) / farmH * 100).toFixed(2);
            const wPct = ((z.wM||10) / farmW * 100).toFixed(2);
            const hPct = ((z.hM||8) / farmH * 100).toFixed(2);
            const isSel = sel === z.id;
            const isDraggingThis = dragging?.id === z.id;
            const isPlant = ["veg","orchard","herbs","greenhouse"].includes(z.type);
            const zPlots = data.garden.plots.filter(p => p.zone === z.id && p.status !== "harvested");
            const isAnimalZone = ["barn","pasture"].includes(z.type);
            const zAnimals = isAnimalZone ? data.livestock.animals.filter(a => LDB[a.type]) : [];
            const animalCount = zAnimals.reduce((s,a) => s + a.count, 0);

            // Build crop patches — use saved positions if available, otherwise auto-layout
            const zoneTotalM2 = (z.wM||10)*(z.hM||8);
            const cropPatches = [];
            if (isPlant && zPlots.length > 0 && zoneTotalM2 > 0) {
              let autoFillY = 1;
              zPlots.forEach(p => {
                let area = 0;
                if (p.measureType==="area"&&p.qty) area=+p.qty;
                else if (p.plantCount) { const cr=rCM(data.region).get(p.crop); if(cr){const sp=cr.spacing/100;area=p.plantCount*sp*sp;} }
                if (area>0) {
                  const frac=Math.min(0.98,area/zoneTotalM2);
                  const cc=setupColorMap.get(p.crop)||{r:100,g:140,b:60};
                  // Use saved patch position/size if the plot has them, else auto-layout
                  let pw, ph, px, py;
                  if (p.patchW !== undefined && p.patchH !== undefined) {
                    pw = p.patchW; ph = p.patchH;
                    px = p.patchX || 0.03; py = p.patchY || 0;
                  } else {
                    const side = Math.sqrt(frac);
                    pw = Math.min(1, side * 1.2);
                    ph = Math.min(1, frac / pw);
                    px = 0.03;
                    py = Math.max(0, autoFillY - ph);
                    autoFillY -= ph + 0.02;
                  }
                  cropPatches.push({plotId:p.id,crop:p.crop,name:p.name||p.crop,frac,pctLabel:Math.round(frac*100),cc,pw,ph,px,py});
                }
              });
              cropPatches.sort((a,b)=>b.frac-a.frac);
            }

            return (
              <div key={z.id} id={`zone-${z.id}`}
                onMouseDown={e => {
                  // Only start zone drag if not clicking a crop patch
                  if (e.target.closest('[data-crop-patch]')) return;
                  e.stopPropagation();
                  const rect = svgRef.current.getBoundingClientRect();
                  const z2 = zones.find(zz => zz.id === z.id);
                  setDragging({id:z.id,startX:e.clientX-rect.left,startY:e.clientY-rect.top,origXM:z2.xM||0,origYM:z2.yM||0,rect});
                  setSel(z.id);
                }}
                onMouseMove={e => {
                  if (!dragging && !cropDrag && !cropResize) {
                    const rect = svgRef.current.getBoundingClientRect();
                    setHoverInfo({x:e.clientX-rect.left,y:e.clientY-rect.top,name:z.name,icon:zt?.icon||"",typeLabel:zt?.label||z.type,wM:(z.wM||10).toFixed(0),hM:(z.hM||8).toFixed(0),area:((z.wM||10)*(z.hM||8)).toFixed(0),cropCount:zPlots.length,animalCount});
                  }
                }}
                onMouseLeave={() => setHoverInfo(null)}
                onClick={() => { if (!dragging && !cropDrag && !cropResize) setSel(z.id); }}
                style={{
                  position:"absolute",
                  left:`${xPct}%`,top:`${yPct}%`,width:`${wPct}%`,height:`${hPct}%`,
                  borderRadius:10,
                  border:`2px solid ${isSel ? C.green : C.bdr}`,
                  boxShadow: isSel ? `0 0 0 3px rgba(45,106,79,.25), 0 0 16px rgba(45,106,79,.15), inset 0 0 20px rgba(45,106,79,.08)` : "0 2px 8px rgba(0,0,0,.06)",
                  background: zt?.fill ? `${zt.fill}${isSel ? "bb" : "88"}` : C.surface,
                  cursor: isDraggingThis ? "grabbing" : "pointer",
                  opacity: isDraggingThis ? 0.75 : 1,
                  transition: dragging ? "none" : "all .2s ease",
                  transform: isSel && !isDraggingThis ? "scale(1.02)" : "scale(1)",
                  overflow:"hidden",
                }}>
                {/* Zone name */}
                <div style={{position:"absolute",top:0,left:0,right:0,padding:"2px 4px",fontSize:10,fontWeight:700,color:C.text,textAlign:"center",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",zIndex:3,pointerEvents:"none",textShadow:"0 1px 2px rgba(0,0,0,.18)"}}>{z.name}</div>
                {/* Crop patches — draggable + resizable */}
                {cropPatches.map((cb) => {
                  const isDragThis = cropDrag?.plotId === cb.plotId;
                  const isResizeThis = cropResize?.plotId === cb.plotId;
                  return (
                    <div key={cb.plotId} data-crop-patch="true"
                      onMouseDown={e => {
                        e.stopPropagation();
                        const zoneEl = document.getElementById(`zone-${z.id}`);
                        if (!zoneEl) return;
                        const zr = zoneEl.getBoundingClientRect();
                        setCropDrag({plotId:cb.plotId, zoneId:z.id,
                          startX: e.clientX - zr.left, startY: e.clientY - zr.top,
                          origPx: cb.px, origPy: cb.py});
                      }}
                      style={{
                        position:"absolute",
                        left:`${(cb.px*100).toFixed(1)}%`,top:`${(cb.py*100).toFixed(1)}%`,
                        width:`${(cb.pw*100).toFixed(1)}%`,height:`${(cb.ph*100).toFixed(1)}%`,
                        background:`rgba(${cb.cc.r},${cb.cc.g},${cb.cc.b},.38)`,
                        borderRadius:6,overflow:"visible",
                        display:"flex",alignItems:"center",justifyContent:"center",zIndex:1,
                        cursor: isDragThis ? "grabbing" : "grab",
                        border: (isDragThis||isResizeThis) ? `1.5px dashed rgba(${cb.cc.r},${cb.cc.g},${cb.cc.b},.7)` : "1px solid transparent",
                        transition: (cropDrag||cropResize) ? "none" : "all .15s",
                      }}>
                      <div style={{position:"absolute",inset:"10%",borderRadius:"50%",background:`rgba(${cb.cc.r},${cb.cc.g},${cb.cc.b},.25)`,filter:"blur(8px)",zIndex:0,pointerEvents:"none"}}/>
                      <div style={{position:"relative",zIndex:1,textAlign:"center",lineHeight:1.2,pointerEvents:"none"}}>
                        <div style={{fontSize:10,fontWeight:900,color:"#fff",textShadow:"0 1px 4px rgba(0,0,0,.55)"}}>{cb.pctLabel}%</div>
                        <div style={{fontSize:7,fontWeight:700,color:"rgba(255,255,255,.9)",textShadow:"0 1px 2px rgba(0,0,0,.4)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"100%",padding:"0 2px"}}>{cb.name}</div>
                      </div>
                      {/* Resize handle — bottom-right corner */}
                      <div data-crop-patch="true"
                        onMouseDown={e => {
                          e.stopPropagation();
                          const zoneEl = document.getElementById(`zone-${z.id}`);
                          if (!zoneEl) return;
                          const zr = zoneEl.getBoundingClientRect();
                          setCropResize({plotId:cb.plotId, zoneId:z.id,
                            startX: e.clientX - zr.left, startY: e.clientY - zr.top,
                            origPw: cb.pw, origPh: cb.ph, frac: cb.frac});
                          setCropDrag(null); // don't drag while resizing
                        }}
                        style={{
                          position:"absolute",bottom:-3,right:-3,width:10,height:10,
                          background:`rgba(${cb.cc.r},${cb.cc.g},${cb.cc.b},.7)`,
                          borderRadius:"0 6px 0 4px",cursor:"nwse-resize",zIndex:5,
                          border:"1.5px solid rgba(255,255,255,.6)",
                        }}/>
                    </div>
                  );
                })}
                {/* Size label */}
                <span style={{position:"absolute",bottom:2,left:"50%",transform:"translateX(-50%)",fontSize:8,fontFamily:F.mono,color:"rgba(35,50,35,.4)",whiteSpace:"nowrap",pointerEvents:"none",zIndex:2}}>{(z.wM||0).toFixed(0)}×{(z.hM||0).toFixed(0)}m</span>
                {/* Resize handles — show when selected, like Paint */}
                {isSel && ["r","b","l","t","rb","lb","rt","lt"].map(edge => {
                  const isCorner = edge.length === 2;
                  const sz3 = isCorner ? 10 : 6;
                  const pos = {};
                  if (edge.includes("t")) { pos.top = -sz3/2; }
                  if (edge.includes("b")) { pos.bottom = -sz3/2; }
                  if (edge.includes("l")) { pos.left = -sz3/2; }
                  if (edge.includes("r")) { pos.right = -sz3/2; }
                  if (edge === "t" || edge === "b") { pos.left = "50%"; pos.transform = "translateX(-50%)"; }
                  if (edge === "l" || edge === "r") { pos.top = "50%"; pos.transform = "translateY(-50%)"; }
                  const cursors = {r:"ew-resize",l:"ew-resize",t:"ns-resize",b:"ns-resize",rb:"nwse-resize",lt:"nwse-resize",rt:"nesw-resize",lb:"nesw-resize"};
                  return (
                    <div key={edge} data-crop-patch="true"
                      onMouseDown={e => {
                        e.stopPropagation();
                        const rect2 = svgRef.current.getBoundingClientRect();
                        setZoneResize({id:z.id, edge, startX:e.clientX-rect2.left, startY:e.clientY-rect2.top,
                          origXM:z.xM||0, origYM:z.yM||0, origWM:z.wM||10, origHM:z.hM||8});
                      }}
                      style={{position:"absolute",...pos, width:sz3, height:sz3,
                        background:"#fff", border:`2px solid ${C.green}`, borderRadius:isCorner?2:1,
                        cursor:cursors[edge], zIndex:10,
                      }}/>
                  );
                })}
              </div>
            );
          });
        })()}

        {/* Selected zone info panel — persistent game-style HUD */}
        {sel && !dragging && (() => {
          const sz2 = zones.find(z => z.id === sel);
          if (!sz2) return null;
          const zt2 = ZT_MAP.get(sz2.type);
          const area2 = ((sz2.wM||10)*(sz2.hM||8)).toFixed(0);
          const zPlots2 = data.garden.plots.filter(p => p.zone === sel && p.status !== "harvested");
          const isAnimal2 = ["barn","pasture"].includes(sz2.type);
          const animalCount2 = isAnimal2 ? data.livestock.animals.filter(a => LDB[a.type]).reduce((s,a) => s + a.count, 0) : 0;
          // Position panel near the zone
          const panelX = Math.min(75, Math.max(5, ((sz2.xM||0) / farmW * 100) + ((sz2.wM||10) / farmW * 100) + 1));
          const panelY = Math.max(3, ((sz2.yM||0) / farmH * 100));
          // If panel would go off-right, put it on the left side of zone
          const flipLeft = panelX > 70;
          const finalX = flipLeft ? Math.max(2, ((sz2.xM||0) / farmW * 100) - 26) : panelX;
          return (
            <div style={{
              position:"absolute", left:`${finalX}%`, top:`${panelY}%`,
              zIndex:60, width:180, animation:"fadeIn .2s ease",
            }}>
              <div style={{
                background:"linear-gradient(135deg,#1a2e1a,#243524)", color:"#fff",
                borderRadius:14, padding:"14px 16px",
                boxShadow:"0 8px 32px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.08)",
                backdropFilter:"blur(8px)", border:"1px solid rgba(100,180,100,.2)",
              }}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{fontSize:18}}>{zt2?.icon || "📍"}</div>
                  <div onClick={(e) => { e.stopPropagation(); setSel(null); }}
                    style={{width:20,height:20,borderRadius:10,background:"rgba(255,255,255,.1)",
                      display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",
                      fontSize:11,color:"rgba(255,255,255,.5)",lineHeight:1}}>✕</div>
                </div>
                <div style={{fontSize:15,fontWeight:800,marginBottom:2,fontFamily:F.head,letterSpacing:"-0.02em"}}>{sz2.name}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.5)",marginBottom:10,fontWeight:500}}>{zt2?.label || sz2.type}</div>
                <div className="g2" style={{gap:6,marginBottom:8}}>
                  <div style={{background:"rgba(255,255,255,.06)",borderRadius:8,padding:"6px 8px",textAlign:"center"}}>
                    <div style={{fontSize:15,fontWeight:800,fontFamily:F.mono}}>{(sz2.wM||10).toFixed(0)}×{(sz2.hM||8).toFixed(0)}</div>
                    <div style={{fontSize:9,color:"rgba(255,255,255,.4)",marginTop:1}}>metres</div>
                  </div>
                  <div style={{background:"rgba(255,255,255,.06)",borderRadius:8,padding:"6px 8px",textAlign:"center"}}>
                    <div style={{fontSize:15,fontWeight:800,fontFamily:F.mono}}>{area2}</div>
                    <div style={{fontSize:9,color:"rgba(255,255,255,.4)",marginTop:1}}>m²</div>
                  </div>
                </div>
                {zPlots2.length > 0 && (
                  <div style={{borderTop:"1px solid rgba(255,255,255,.08)",paddingTop:8,marginTop:4}}>
                    <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.4)",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.05em"}}>Crops</div>
                    {zPlots2.slice(0,4).map(p => (
                      <div key={p.id} style={{fontSize:11,color:"rgba(255,255,255,.8)",marginBottom:2}}>
                        🌱 {p.name || p.crop} {p.status === "growing" ? "· growing" : p.status === "ready" ? "· ready!" : ""}
                      </div>
                    ))}
                    {zPlots2.length > 4 && <div style={{fontSize:10,color:"rgba(255,255,255,.3)"}}>+{zPlots2.length-4} more</div>}
                  </div>
                )}
                {animalCount2 > 0 && (
                  <div style={{borderTop:"1px solid rgba(255,255,255,.08)",paddingTop:8,marginTop:4}}>
                    <div style={{fontSize:11,color:"#ffcc00"}}>🐄 {animalCount2} animal{animalCount2>1?"s":""}</div>
                  </div>
                )}
                <div style={{marginTop:10,fontSize:10,color:"rgba(255,255,255,.3)",textAlign:"center",fontStyle:"italic"}}>Click zone to edit below ↓</div>
              </div>
            </div>
          );
        })()}

        {/* Helper text */}
        <div style={{position:"absolute",bottom:6,left:10,fontSize:9,color:"rgba(80,95,80,.45)",fontFamily:F.mono,pointerEvents:"none"}}>Drag zones to reposition · Click to select</div>
      </div>
      {/* Crop color legend */}
      {(()=>{
        const LCC = CROP_COLORS.slice(0, 8);
        const lm=new Map();let li=0;
        data.garden.plots.filter(p=>p.status!=="harvested").forEach(p=>{if(!lm.has(p.crop)){lm.set(p.crop,LCC[li%LCC.length]);li++;}});
        if(lm.size===0)return null;
        return(
          <div style={{display:"flex",flexWrap:"wrap",gap:"4px 10px",padding:"8px 0 0",alignItems:"center"}}>
            <span style={{fontSize:10,fontWeight:700,color:C.t2}}>Crops:</span>
            {[...lm.entries()].map(([name,cc])=>(
              <div key={name} style={{display:"flex",alignItems:"center",gap:3}}>
                <div style={{width:8,height:8,borderRadius:2,background:`rgba(${cc.r},${cc.g},${cc.b},.55)`,boxShadow:`0 0 4px rgba(${cc.r},${cc.g},${cc.b},.3)`}}/>
                <span style={{fontSize:10,color:C.t1}}>{name}</span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Inline editor for selected zone */}
      {sz && (
        <Card style={{marginTop:10,boxShadow:`0 0 0 2px ${C.green}`}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <div style={{fontSize:15,fontWeight:700,fontFamily:F.head}}>✏ {sz.name}</div>
            <div style={{display:"flex",gap:6}}>
              <Btn v="danger" sm onClick={()=>delZ(sz.id)}>Delete</Btn>
              <Btn v="ghost" sm onClick={()=>setSel(null)}>Done</Btn>
            </div>
          </div>
          <div style={SX.grid2}>
            <Inp label="Name" value={sz.name} onChange={e=>upZ(sz.id,{name:e.target.value})}/>
            <Sel label="Zone Type" value={sz.type} onChange={e=>upZ(sz.id,{type:e.target.value})} options={ZT.map(t=>({value:t.id,label:`${t.icon} ${t.label}`}))}/>
          </div>
          <div style={{fontSize:12,color:C.t3,marginTop:6,fontStyle:"italic"}}>Drag to move · Drag edges to resize on the map above</div>
        </Card>
      )}

      {/* Templates */}
      {data.zones.length===0 && (
        <Card style={{marginTop:16,textAlign:"center",padding:32}}>
          <div style={{fontSize:36,marginBottom:12}}>🏡</div>
          <div style={{fontSize:16,fontWeight:600,marginBottom:12}}>Start with a template</div>
          <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
            <Btn v="secondary" onClick={()=>setData({...data,farmW:80,farmH:50,zones:[
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
            ]})}>🏡 Small Homestead (80×50m)</Btn>
            <Btn v="secondary" onClick={()=>setData({...data,farmW:150,farmH:80,zones:[
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
            ]})}>🌾 Medium Farm (150×80m)</Btn>
          </div>
        </Card>
      )}

      {/* Zone list */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:8,marginTop:14}}>
        {zones.map(z=>{const zt=ZT.find(t=>t.id===z.type);return(
          <Card key={z.id} onClick={()=>setSel(z.id)} active={sel===z.id} style={{borderLeft:`4px solid ${zt?.fill||C.bdr}`}}>
            <div style={{fontSize:13,fontWeight:600}}>{zt?.icon} {z.name}</div>
            <div style={SX.t2_11}>{zt?.label}</div>
            <div style={{fontSize:10,color:C.t3,fontFamily:F.mono,marginTop:2}}>{(z.wM||0).toFixed(0)}m × {(z.hM||0).toFixed(0)}m</div>
          </Card>
        );})}
      </div>

      {showAdd && (
        <Overlay title="Add Zone" onClose={()=>setShowAdd(false)}>
          <Inp label="Zone Name" placeholder="Main Veggie Bed" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
          <Sel label="Type" value={form.type} onChange={e=>setForm({...form,type:e.target.value})} options={ZT.map(t=>({value:t.id,label:`${t.icon} ${t.label}`}))}/>
          <div style={SX.grid2}>
            <Inp label="Width (metres)" type="number" min="1" value={form.wM} onChange={e=>setForm({...form,wM:e.target.value})}/>
            <Inp label="Height (metres)" type="number" min="1" value={form.hM} onChange={e=>setForm({...form,hM:e.target.value})}/>
          </div>
          <div style={{fontSize:12,color:C.t2,marginBottom:12}}>Zone will be placed at top-left — drag to reposition after adding.</div>
          <div style={SX.btnRowEnd}>
            <Btn v="secondary" onClick={()=>setShowAdd(false)}>Cancel</Btn>
            <Btn onClick={addZ} dis={!form.name}>Add Zone</Btn>
          </div>
        </Overlay>
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
    if (pageData?.crop) {
      setForm(f => ({...f, crop: pageData.crop, plantDate: pageData.plantDate || ""}));
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
  const vegZ=data.zones.filter(z=>["veg","orchard","herbs","greenhouse"].includes(z.type));
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
          <Card key={p.id} onClick={()=>setSelP(p.id)} style={isR?{boxShadow:`0 0 0 2px ${C.orange}`}:{}}>
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
                style={{width:"100%",padding:"10px 14px",paddingRight:36,border:`1.5px solid ${cropDropdownOpen?C.green:C.bdr}`,borderRadius:C.rs,background:C.card,fontSize:14,fontFamily:F.body,color:C.text,outline:"none",boxSizing:"border-box"}}
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
                              {c.emoji} {c.name}
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
                style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${C.bdr}`,borderRadius:C.rs,background:C.card,fontSize:14,fontFamily:F.body,color:C.text,outline:"none",boxSizing:"border-box"}}>
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

/* ═══════════════════════════════════════════
   FARM MAP HERO — full-width zone map view
   ═══════════════════════════════════════════ */
function FarmMapHero({data, onEditLayout}) {
  const cropColorMap = useMemo(function() {
    const m = new Map();
    let idx = 0;
    data.garden.plots.forEach(function(p) {
      if (p.status !== "harvested" && !m.has(p.crop)) {
        m.set(p.crop, CROP_COLORS[idx % CROP_COLORS.length]);
        idx++;
      }
    });
    return m;
  }, [data.garden.plots]);

  const zoneBlocks = useMemo(function() {
    const fW = data.farmW || 100, fH = data.farmH || 60;
    return data.zones.map(function(z) {
      const xPct = ((z.xM||0)/fW*100).toFixed(1);
      const yPct = ((z.yM||0)/fH*100).toFixed(1);
      const wPct = ((z.wM||10)/fW*100).toFixed(1);
      const hPct = ((z.hM||8)/fH*100).toFixed(1);
      const zt = ZT_MAP.get(z.type);
      const isPlant = ["veg","orchard","herbs","greenhouse"].includes(z.type);
      const zPlots = isPlant ? data.garden.plots.filter(function(p){return p.zone===z.id&&p.status!=="harvested";}) : [];
      const zoneTotalM2 = (z.wM||10)*(z.hM||8);
      const patches = [];
      if (isPlant && zPlots.length > 0 && zoneTotalM2 > 0) {
        let autoY = 1;
        zPlots.forEach(function(p) {
          let area = 0;
          if (p.measureType==="area"&&p.qty) area=+p.qty;
          else if (p.plantCount) {
            const crop=rCM(data.region).get(p.crop);
            if(crop){const sp=crop.spacing/100;area=p.plantCount*sp*sp;}
          }
          if (area > 0) {
            const frac = Math.min(0.98, area/zoneTotalM2);
            const cc = cropColorMap.get(p.crop)||{r:100,g:140,b:60};
            let pw, ph, px, py;
            if (p.patchW!==undefined&&p.patchH!==undefined) {
              pw=p.patchW;ph=p.patchH;px=p.patchX||0.03;py=p.patchY||0;
            } else {
              const side=Math.sqrt(frac);
              pw=Math.min(1,side*1.2);ph=Math.min(1,frac/pw);
              px=0.03;py=Math.max(0,autoY-ph);autoY-=ph+0.02;
            }
            patches.push({name:p.name||p.crop,pctLabel:Math.round(frac*100),cc,pw,ph,px,py});
          }
        });
        patches.sort(function(a,b){return b.pctLabel-a.pctLabel;});
      }
      return {z,zt,xPct,yPct,wPct,hPct,patches};
    });
  }, [data.zones, data.garden.plots, data.farmW, data.farmH, data.region, cropColorMap]);

  const legendEntries = useMemo(function(){return [...cropColorMap.entries()];},[cropColorMap]);

  if (data.zones.length === 0) {
    return (
      <div style={{padding:40,textAlign:"center",color:C.t2,background:C.bg,borderRadius:16,border:`1px dashed ${C.bdr}`}}>
        <div style={{fontSize:32,marginBottom:8}}>🗺️</div>
        <div style={{fontSize:14,fontWeight:600}}>No zones yet</div>
        <div style={{fontSize:12,marginTop:4}}>Go to Layout tab to design your farm</div>
        <button onClick={onEditLayout} style={{marginTop:14,padding:"8px 20px",background:C.green,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer"}}>Design Farm Layout</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{position:"relative",background:"linear-gradient(180deg,#f7faf5,#edf4e8)",border:`1px solid ${C.bdr}`,borderRadius:16,overflow:"hidden",aspectRatio:`${data.farmW||100} / ${data.farmH||60}`,width:"100%"}}>
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(to right, rgba(80,95,80,.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(80,95,80,.06) 1px, transparent 1px)",backgroundSize:"24px 24px"}}/>
        {zoneBlocks.map(function({z,zt,xPct,yPct,wPct,hPct,patches}) {
          return (
            <div key={z.id} style={{position:"absolute",left:`${xPct}%`,top:`${yPct}%`,width:`${wPct}%`,height:`${hPct}%`,borderRadius:10,border:"1.5px solid rgba(35,50,35,.15)",background:zt?.fill?`${zt.fill}88`:"#ddd8",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,left:0,right:0,padding:"1px 3px",fontSize:8,fontWeight:700,color:C.text,textAlign:"center",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",zIndex:3,textShadow:"0 1px 2px rgba(0,0,0,.18)"}}>{z.name}</div>
              {patches.map(function(cb,i) {
                return (
                  <div key={i} style={{position:"absolute",left:`${(cb.px*100).toFixed(1)}%`,top:`${(cb.py*100).toFixed(1)}%`,width:`${(cb.pw*100).toFixed(1)}%`,height:`${(cb.ph*100).toFixed(1)}%`,background:`rgba(${cb.cc.r},${cb.cc.g},${cb.cc.b},.38)`,borderRadius:4,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1}}>
                    <div style={{position:"absolute",inset:"10%",borderRadius:"50%",background:`rgba(${cb.cc.r},${cb.cc.g},${cb.cc.b},.25)`,filter:"blur(6px)",zIndex:0}}/>
                    <div style={{position:"relative",zIndex:1,textAlign:"center",lineHeight:1.1}}>
                      <div style={{fontSize:8,fontWeight:900,color:"#fff",textShadow:"0 1px 3px rgba(0,0,0,.55)"}}>{cb.pctLabel}%</div>
                      <div style={{fontSize:6,fontWeight:700,color:"rgba(255,255,255,.85)",textShadow:"0 1px 2px rgba(0,0,0,.4)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"100%",padding:"0 1px"}}>{cb.name}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
        <button onClick={onEditLayout} style={{position:"absolute",top:8,right:10,background:"rgba(255,255,255,.9)",border:`1px solid ${C.bdr}`,borderRadius:8,padding:"5px 12px",fontSize:11,fontWeight:600,color:C.green,cursor:"pointer"}}>✏️ Edit Layout</button>
      </div>
      {legendEntries.length > 0 && (
        <div style={{display:"flex",flexWrap:"wrap",gap:"4px 10px",padding:"8px 0 0",alignItems:"center"}}>
          <span style={{fontSize:10,fontWeight:700,color:C.t2}}>Crops:</span>
          {legendEntries.map(function([name,cc]) {
            return (
              <div key={name} style={{display:"flex",alignItems:"center",gap:3}}>
                <div style={{width:8,height:8,borderRadius:2,background:`rgba(${cc.r},${cc.g},${cc.b},.55)`,boxShadow:`0 0 4px rgba(${cc.r},${cc.g},${cc.b},.3)`}}/>
                <span style={{fontSize:10,color:C.t1}}>{name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   FARM TAB — merges Map + Crops + Layout
   ═══════════════════════════════════════════ */
function FarmTab({data, setData, pageData, clearPageData}) {
  const [subTab, setSubTab] = useState(function() {
    return (pageData && pageData.tab) ? pageData.tab : "map";
  });
  const noopClearPageData = useCallback(function(){}, []);

  useEffect(function() { clearPageData(); }, [clearPageData]);

  const farmPageData = (pageData && !pageData.tab) ? pageData : null;

  const FARM_TABS = [
    {id:"map",   l:"🗺️  Map"},
    {id:"crops", l:"🌱 Crops"},
    {id:"setup", l:"⚙️  Layout"},
  ];

  return (
    <div style={{maxWidth:1100}}>
      <div style={{display:"flex",background:C.bg,borderRadius:10,padding:3,marginBottom:16,border:`1px solid ${C.bdr}`,width:"fit-content"}}>
        {FARM_TABS.map(function(t) {
          const active = subTab===t.id;
          return (
            <button key={t.id} onClick={function(){setSubTab(t.id);}}
              style={{padding:"6px 18px",borderRadius:8,border:"none",background:active?C.card:"transparent",
                color:active?C.green:C.t2,fontWeight:active?700:500,fontSize:13,fontFamily:F.body,
                cursor:"pointer",transition:"all .15s",boxShadow:active?"0 1px 4px rgba(0,0,0,.08)":"none",whiteSpace:"nowrap"}}>
              {t.l}
            </button>
          );
        })}
      </div>
      {subTab==="map"   && <FarmMapHero data={data} onEditLayout={function(){setSubTab("setup");}}/>}
      {subTab==="crops" && <Farming data={data} setData={setData} pageData={farmPageData} clearPageData={noopClearPageData}/>}
      {subTab==="setup" && <Setup data={data} setData={setData}/>}
    </div>
  );
}

/* ═══════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════ */
function TodayScreen({data, setData, setPage, tasks}) {
  const [selZone,setSelZone]=useState(null);
  const [openPlotId,setOpenPlotId]=useState(null);
  const [openAnimalId,setOpenAnimalId]=useState(null);
  const [wide,setWide]=useState(typeof window!=="undefined"&&window.innerWidth>=800);  useEffect(()=>{const h=()=>setWide(window.innerWidth>=800);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  const totalKg=data.pantry.items.filter(i=>i.unit==="kg").reduce((s,i)=>s+i.qty,0);
  const costs=useMemo(() => data.costs?.items || [], [data.costs?.items]);
  const {exp,inc}=useMemo(()=>{let e=0,r=0;costs.forEach(i=>i.type==="expense"?e+=i.amount:r+=i.amount);return{exp:e,inc:r};},[costs]);
  const zoneSpace = useMemo(() => buildZoneSpaceMap(data.zones, data.garden.plots, data.farmW||100, data.farmH||60, data.region), [data.zones, data.garden.plots, data.farmW, data.farmH, data.region]);

  const togStep = (pid, si) => {
    const plots = data.garden.plots.map(p => {
      if (p.id === pid) { const st = [...p.steps]; st[si] = {...st[si], done: !st[si].done}; return {...p, steps: st}; }
      return p;
    });
    setData({...data, garden: {plots}});
  };

  // Enrich tasks with zone id for linking
  const enrichedTasks = useMemo(() => tasks.map(t => {
    const plot = data.garden.plots.find(p => p.id === t.plotId);
    return { ...t, zoneId: plot?.zone || null };
  }), [tasks, data.garden.plots]);

  // Zone intelligence data
  const zoneIntel = useMemo(() => {
    const intel = {};
    data.zones.forEach(z => {
      const zPlots = data.garden.plots.filter(p => p.zone === z.id && p.status !== "harvested");
      const zTasks = enrichedTasks.filter(t => t.zoneId === z.id);
      const sp = zoneSpace[z.id];
      const zt = ZT_MAP.get(z.type);
      const isAnimal = ["barn","pasture"].includes(z.type);
      const zAnimals = isAnimal ? data.livestock.animals.filter(a => {
        const zone = data.zones.find(zn => zn.id === z.id);
        return zone && zone.type === (a.type === "Chicken" || a.type === "Duck" || a.type === "Turkey" || a.type === "Quail" || a.type === "Goose" ? "barn" : "pasture");
      }) : [];
      const totalAnimals = zAnimals.reduce((s,a) => s + a.count, 0);
      const yieldEst = zPlots.reduce((s,p) => s + (p.expectedYieldKg || 0), 0);
      const cropProgress = zPlots.map(p => {
        const crop = rCM(data.region).get(p.crop);
        if (!crop || !p.plantDate) return null;
        const dSince = daysBetweenLocalKeys(p.plantDate, new Date());
        const pct = Math.min(1, dSince / crop.days);
        return { name: p.name || p.crop, pct, emoji: crop.emoji };
      }).filter(Boolean);

      intel[z.id] = {
        zone: z, zt, sp, isAnimal,
        plotCount: zPlots.length,
        taskCount: zTasks.length,
        urgentCount: zTasks.filter(t => t.pri <= 1).length,
        yieldEst,
        totalAnimals,
        cropProgress,
        status: zTasks.filter(t=>t.pri===0).length > 0 ? "Needs attention"
          : zTasks.filter(t=>t.pri<=2).length > 0 ? "Active"
          : zPlots.length > 0 || totalAnimals > 0 ? "Stable" : "Empty"
      };
    });
    return intel;
  }, [data.zones, data.garden.plots, data.livestock.animals, data.region, enrichedTasks, zoneSpace]);

  // Auto-select first zone with tasks, or first zone
  const activeZone = selZone && zoneIntel[selZone] ? selZone
    : data.zones.find(z => (zoneIntel[z.id]?.taskCount || 0) > 0)?.id
    || data.zones[0]?.id || null;
  const azData = activeZone ? zoneIntel[activeZone] : null;

  // Priority color helper
  const priColor = (pri) => pri === 0 ? C.red : pri <= 1 ? C.orange : pri <= 2 ? C.blue : C.green;
  const priBg = (pri) => pri === 0 ? C.dangerBg : pri <= 1 ? C.harvestBg : pri <= 2 ? C.waterBg : C.soft;

  // Status color helper
  const statusStyle = (s) => s === "Needs attention" ? {color:C.red,bg:C.dangerBg}
    : s === "Active" ? {color:C.orange,bg:C.harvestBg}
    : s === "Stable" ? {color:C.green,bg:C.soft}
    : {color:C.t2,bg:C.bg};

  // ── Progress Rings data ──
  const g = data.gamify || DEF.gamify;
  const activePlots = data.garden.plots.filter(p => p.status !== "harvested");
  const ringData = useMemo(() => {
    // Ring 1: Tasks done today — steps marked done / total steps across active plots
    const allSteps = activePlots.flatMap(p => p.steps || []);
    const doneSteps = allSteps.filter(s => s.done);
    const taskPct = allSteps.length > 0 ? doneSteps.length / allSteps.length : 0;

    // Ring 2: Crops growing — active plots that have been planted / total zone capacity
    const plantedCount = activePlots.filter(p => p.plantDate).length;
    const zoneCapacity = Math.max(1, data.zones.filter(z => ["veg","orchard","herbs","greenhouse"].includes(z.type)).length * 4); // ~4 crops per zone as target
    const growPct = Math.min(1, plantedCount / zoneCapacity);

    // Ring 3: Harvest readiness — crops within 7 days of harvest / all active
    const todayDate = localDateFromKey(todayLocalKey());
    const readyCount = activePlots.filter(p => {
      if (!p.plantDate) return false;
      const crop = rCM(data.region).get(p.crop);
      if (!crop) return false;
      const harvestDate = localDateFromKey(addDaysToLocalKey(p.plantDate, crop.days));
      return harvestDate && harvestDate - todayDate <= 7 * 864e5;
    }).length;
    const harvestPct = activePlots.length > 0 ? readyCount / activePlots.length : 0;

    return { taskPct, growPct, harvestPct, doneSteps: doneSteps.length, totalSteps: allSteps.length, plantedCount, readyCount };
  }, [activePlots, data.zones, data.region]);

  // All three rings closed?
  const allRingsClosed = ringData.taskPct >= 1 && ringData.growPct >= 1 && ringData.harvestPct >= 1;

  // Pre-computed vars to avoid IIFEs in JSX render
  const _dap = data.garden.plots.filter(function(p){return p.status!=="harvested";});
  const _dfp = _dap.reduce(function(s,p){return s+(p.plantCount||0);},0);
  const _dfa = _dap.reduce(function(s,p){return s+(p.measureType==="area"?+(p.qty||0):0);},0);
  const _dfy = _dap.reduce(function(s,p){return s+(p.expectedYieldKg||0);},0);
  const _dac = data.livestock.animals.reduce(function(s,a){return s+a.count;},0);
  const _durgent = enrichedTasks.filter(function(t){return t.pri<=1;}).length;
  const _dready = _dap.filter(function(p){
    if(!p.plantDate)return false;
    const crop=rCM(data.region).get(p.crop);
    if(!crop)return false;
    return daysBetweenLocalKeys(p.plantDate, new Date()) >= crop.days;
  });
  const _dnet = inc - exp;
  const _dAnimalTypes=(function(){const t={};data.livestock.animals.forEach(function(a){t[a.type]=(t[a.type]||0)+a.count;});return Object.entries(t).sort(function(a,b){return b[1]-a[1];});})();
  const _dCropCats=(function(){const cats={};_dap.forEach(function(p){const cr=rCM(data.region).get(p.crop);if(cr)cats[cr.cat]=(cats[cr.cat]||0)+1;});return Object.entries(cats).sort(function(a,b){return b[1]-a[1];});})();
  const _catIcons={Fruit:"🍅",Vegetable:"🥬",Herb:"🌿",Legume:"🫘",Root:"🥕",Grain:"🌾",Flower:"🌻",Brassica:"🥦",Perennial:"🫐",Tuber:"🥔"};
  const _miniColorMap=(function(){const m=new Map();let i=0;data.garden.plots.forEach(function(p){if(p.status!=="harvested"&&!m.has(p.crop)){m.set(p.crop,CROP_COLORS[i%CROP_COLORS.length]);i++;}});return m;})();

  // Overlay lookups — pre-computed to avoid IIFEs in JSX render path
  const openPlot = openPlotId ? data.garden.plots.find(x => x.id === openPlotId) : null;
  const openAnimal = openAnimalId ? (data.livestock?.animals || []).find(x => x.id === openAnimalId) : null;

  return (
    <div className="page-enter" style={{maxWidth:1100}}>
      {/* ── Morning Dashboard Header ── */}
      <div style={{marginBottom:20}}>
            {/* Top row: Rings + Title + Date */}
            <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:16}}>
              <div style={{position:"relative",width:64,height:64,flexShrink:0}}>
                <Ring pct={ringData.taskPct} size={64} sw={4} color="#34c759">{""}</Ring>
                <div style={{position:"absolute",top:8,left:8}}><Ring pct={ringData.growPct} size={48} sw={4} color={C.blue}>{""}</Ring></div>
                <div style={{position:"absolute",top:16,left:16}}><Ring pct={ringData.harvestPct} size={32} sw={4} color={C.orange}>{allRingsClosed?"✨":""}</Ring></div>
              </div>
              <div style={{fontSize:10,lineHeight:1.9,flexShrink:0}}>
                <div><span style={{display:"inline-block",width:8,height:8,borderRadius:4,background:"#34c759",marginRight:5}}/>Tasks <strong>{ringData.doneSteps}/{ringData.totalSteps}</strong></div>
                <div><span style={{display:"inline-block",width:8,height:8,borderRadius:4,background:C.blue,marginRight:5}}/>Growing <strong>{ringData.plantedCount}</strong></div>
                <div><span style={{display:"inline-block",width:8,height:8,borderRadius:4,background:C.orange,marginRight:5}}/>Harvest <strong>{ringData.readyCount}</strong></div>
              </div>
              <div style={SX.flex1}>
                <h2 style={{fontFamily:F.head,fontSize:24,margin:0,letterSpacing:"-0.03em",fontWeight:800,color:C.text}}>MyTerra</h2>
                <p style={{color:C.t2,fontSize:12,margin:"2px 0 0",fontWeight:500}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</p>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                <div style={{textAlign:"center",padding:"5px 10px",background:g.streak>=7?C.harvestBg:C.surface,borderRadius:10}}>
                  <div style={{fontSize:20,fontWeight:800,fontFamily:F.head,color:g.streak>=7?C.orange:C.green,lineHeight:1}}>{g.streak}</div>
                  <div style={{fontSize:8,color:C.t2,fontWeight:600,marginTop:1}}>streak{g.streak>=7?" 🔥":""}</div>
                </div>
                {g.badges.length > 0 && (
                  <div style={{display:"flex",gap:2}}>
                    {g.badges.slice(-3).map(b => {
                      const def = BADGES.find(bd => bd.id === b.id);
                      return def ? <Tooltip key={b.id} width={180} content={<div><div style={{fontWeight:700}}>{def.emoji} {def.name}</div><div style={{opacity:.85,marginTop:2}}>{def.desc}</div></div>}><span style={{fontSize:16,cursor:"pointer"}}>{def.emoji}</span></Tooltip> : null;
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Info boxes — what a farmer reads first */}
            <div className="g5" style={{gap:10}}>
              {/* TODAY'S WORK */}
              <Card onClick={function(){setPage("tasks");}} style={{padding:"14px 16px",background:_durgent>0?C.grdTask:C.grdCrops,border:_durgent>0?`1px solid ${C.orange}`:`1px solid ${C.bdr}`}}>
                <div style={SX.capHeader}>Today's Work</div>
                <div style={{fontSize:28,fontWeight:800,fontFamily:F.head,color:_durgent>0?C.orange:C.text,lineHeight:1,marginTop:4}}>{enrichedTasks.length}</div>
                <div style={SX.t2_11mt4}>
                  {enrichedTasks.length === 0 ? <span style={{color:C.green,fontWeight:600}}>a quiet day 🌿</span> : _durgent > 0 ? <span style={{color:C.orange,fontWeight:700}}>{_durgent} need attention</span> : "on your walk today"}
                </div>
                <div style={SX.t3_10mt2}>
                  <span style={{display:"inline-block",width:6,height:6,borderRadius:3,background:"#34c759",marginRight:4}}/>{ringData.doneSteps}/{ringData.totalSteps} done
                </div>
              </Card>

              {/* CROPS */}
              <Card onClick={function(){setPage("farm");}} style={{padding:"14px 16px",background:"linear-gradient(135deg,#f5fbf0,#edf5e5)",border:"1px solid rgba(45,106,79,.08)"}}>
                <div style={SX.capHeader}>Crops</div>
                <div style={{fontSize:28,fontWeight:800,fontFamily:F.head,color:C.text,lineHeight:1,marginTop:4}}>{_dap.length}</div>
                <div style={SX.t2_11mt4}>
                  <span style={{display:"inline-block",width:6,height:6,borderRadius:3,background:C.blue,marginRight:4}}/>{ringData.plantedCount} growing
                </div>
                {_dready.length > 0 && (
                  <div style={{fontSize:10,color:C.orange,fontWeight:700,marginTop:2}}>🌾 {_dready.length} ready to harvest!</div>
                )}
                {_dready.length === 0 && _dfa > 0 && (
                  <div style={SX.t3_10mt2}>{_dfa.toFixed(0)}m² cultivated</div>
                )}
              </Card>

              {/* ANIMALS */}
              <Card onClick={function(){setPage("live");}} style={{padding:"14px 16px",background:"linear-gradient(135deg,#faf8f0,#f5f0e5)",border:"1px solid rgba(180,150,60,.08)"}}>
                <div style={SX.capHeader}>Animals</div>
                <div style={{fontSize:28,fontWeight:800,fontFamily:F.head,color:C.text,lineHeight:1,marginTop:4}}>{_dac}</div>
                <div style={SX.t2_11mt4}>
                  {_dAnimalTypes.length === 0 ? "none yet" : _dAnimalTypes.slice(0,2).map(([t,c]) => `${c} ${t}`).join(", ")}
                </div>
                {data.livestock.animals.length > 2 && (
                  <div style={SX.t3_10mt2}>{Object.keys(data.livestock.animals.reduce((m,a)=>{m[a.type]=1;return m;},{})).length} types</div>
                )}
              </Card>

              {/* WHAT'S GROWING — crop categories */}
              <Card style={{padding:"14px 16px",background:"linear-gradient(135deg,#f8faf5,#f0f4eb)",border:"1px solid rgba(45,106,79,.08)"}}>
                <div style={SX.capHeader}>Growing</div>
                <>
                    <div style={{fontSize:28,fontWeight:800,fontFamily:F.head,color:C.text,lineHeight:1,marginTop:4}}>{_dCropCats.length}</div>
                    <div style={SX.t2_11mt4}>{_dCropCats.length === 1 ? "category" : "categories"}</div>
                    <div style={{fontSize:10,color:C.t3,marginTop:3,lineHeight:1.6}}>
                      {_dCropCats.slice(0,3).map(function([cat,n]){return <div key={cat}>{_catIcons[cat]||"🌱"} {n} {cat}{n>1?"s":""}</div>;})}
                    </div>
                  </>
              </Card>

              {/* MONEY */}
              <Card style={{padding:"14px 16px",background:_dnet>=0?"linear-gradient(135deg,#f0faf5,#e5f5ed)":"linear-gradient(135deg,#fdf5f5,#f5eaea)",border:_dnet>=0?`1px solid rgba(45,106,79,.08)`:`1px solid rgba(220,60,60,.08)`}}>
                <div style={SX.capHeader}>Money</div>
                <div style={{fontSize:28,fontWeight:800,fontFamily:F.head,color:_dnet>=0?C.green:C.red,lineHeight:1,marginTop:4}}>€{_dnet.toFixed(0)}</div>
                <div style={SX.t2_11mt4}>
                  {inc > 0 && <span style={{color:C.green}}>+€{inc.toFixed(0)}</span>}
                  {inc > 0 && exp > 0 && " / "}
                  {exp > 0 && <span style={{color:C.red}}>-€{exp.toFixed(0)}</span>}
                  {inc === 0 && exp === 0 && "no transactions"}
                </div>
                <div style={SX.t3_10mt2}>Pantry: {Math.round(totalKg)}kg stored</div>
              </Card>
            </div>
      </div>

      {/* ── Main two-column: Task Pipeline + Zone Inspector ── */}
      <div style={{display:"grid",gridTemplateColumns: data.zones.length > 0 && wide ? "1.05fr 1.25fr" : "1fr",gap:16,marginBottom:20}}>

        {/* LEFT: Task Pipeline */}
        <Card p={false} style={{overflow:"hidden",display:"flex",flexDirection:"column"}}>
          <div style={{padding:"16px 18px 12px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:15,fontWeight:800,fontFamily:F.head,letterSpacing:"-0.02em",color:C.text}}>Task Pipeline</div>
            <button onClick={()=>setPage("tasks")} style={{background:C.gp,border:"none",fontSize:12,color:C.green,fontWeight:600,cursor:"pointer",padding:"5px 12px",borderRadius:8,transition:"all .2s"}}>View all →</button>
          </div>
          <div style={{flex:1,overflow:"auto",padding:"6px 10px"}}>
            {enrichedTasks.length === 0 ? (
              <div style={{textAlign:"center",padding:"48px 24px",color:C.t2,background:C.grdLight,borderRadius:12,margin:8}}>
                <div style={{fontSize:40,marginBottom:12,filter:"drop-shadow(0 2px 4px rgba(0,0,0,.1))"}}>🌱</div>
                <div style={{fontSize:14,fontWeight:700,color:C.text}}>Your garden awaits</div>
                <div style={{fontSize:12.5,marginTop:6,lineHeight:1.5,maxWidth:220,margin:"6px auto 0"}}>Add crops or livestock to get personalized daily tasks</div>
              </div>
            ) : enrichedTasks.slice(0, 12).map((t, i) => {
              const isActive = t.zoneId === activeZone;
              const canOpen = !!(t.plotId || t.animalId);
              const canMarkDone = t.type !== "step" && t.type !== "upcoming" && t.type !== "forecast" && t.type !== "harvest";
              return (
                <div key={t.key || i}
                  onClick={() => {
                    if (t.zoneId) setSelZone(t.zoneId);
                    if (t.plotId) setOpenPlotId(t.plotId);
                    else if (t.animalId) setOpenAnimalId(t.animalId);
                  }}
                  style={{
                    display:"grid",gridTemplateColumns:"auto 1fr auto",gap:10,alignItems:"center",
                    padding:"10px 12px",marginBottom:4,
                    border:`1px solid ${isActive ? C.gm : C.bdr}`,
                    borderRadius:12,background:isActive ? C.soft : C.raised,
                    cursor: canOpen ? "pointer" : (t.zoneId?"pointer":"default"),
                    transition:"all .15s"
                  }}>
                  <span style={{width:9,height:9,borderRadius:"50%",background:priColor(t.pri),flexShrink:0}}/>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.emoji} {t.title}</div>
                    <div style={{fontSize:11,color:C.t2,marginTop:1}}>{t.loc}{t.daysOut > 0 ? ` · in ${t.daysOut}d` : t.daysOut === 0 && t.type !== "water" ? " · now" : ""}</div>
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
                    {t.stepIdx != null && <button onClick={e=>{e.stopPropagation();togStep(t.plotId,t.stepIdx);}} style={{background:C.green,color:"#fff",border:"none",borderRadius:6,padding:"3px 7px",fontSize:10,fontWeight:700,cursor:"pointer"}}>Done</button>}
                    {canMarkDone && <button onClick={e=>{e.stopPropagation();setData(markTaskDone(data,t.key));}} style={{background:C.green,color:"#fff",border:"none",borderRadius:6,padding:"3px 7px",fontSize:10,fontWeight:700,cursor:"pointer"}}>Done</button>}
                    {t.type==="harvest" && <button onClick={e=>{e.stopPropagation();if(t.plotId)setOpenPlotId(t.plotId);else setPage("farm");}} style={{background:C.orange,color:"#fff",border:"none",borderRadius:6,padding:"3px 7px",fontSize:10,fontWeight:700,cursor:"pointer"}}>Harvest</button>}
                    <Pill c={priColor(t.pri)} bg={priBg(t.pri)}>
                      {t.zoneId ? (data.zones.find(z=>z.id===t.zoneId)?.name?.split(" ").map(w=>w[0]).join("").slice(0,3) || "—") : "Farm"}
                    </Pill>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* RIGHT: Zone Inspector + Mini Map */}
        {data.zones.length > 0 && (
          <div style={{display:"grid",gap:14,gridTemplateRows:"auto 1fr",alignContent:"start"}}>

            {/* Zone Inspector */}
            <Card p={false} style={SX.overflowHidden}>
              <div style={{padding:"14px 16px 10px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:14,fontWeight:800,fontFamily:F.head}}>
                  {azData ? `${azData.zt?.icon || ""} ${azData.zone.name}` : "Select a zone"}
                </div>
                {azData && <Pill c={statusStyle(azData.status).color} bg={statusStyle(azData.status).bg}>{azData.status}</Pill>}
              </div>

              {azData ? (
                <div style={{padding:14}}>
                  {/* Metrics row */}
                  <div className="g2" style={{gap:8,marginBottom:14}}>
                    <div style={{border:`1px solid ${C.bdr}`,borderRadius:12,padding:"10px 12px",background:"#fff"}}>
                      <div style={SX.t2_11b}>Task Load</div>
                      <div style={{fontSize:22,fontWeight:800,fontFamily:F.head}}>{azData.taskCount}</div>
                      {azData.urgentCount > 0 && <div style={{fontSize:10,color:C.red,fontWeight:600,marginTop:2}}>{azData.urgentCount} urgent</div>}
                    </div>
                    <div style={{border:`1px solid ${C.bdr}`,borderRadius:12,padding:"10px 12px",background:"#fff"}}>
                      <div style={SX.t2_11b}>{azData.isAnimal ? "Animals" : "Est. Yield"}</div>
                      <div style={{fontSize:22,fontWeight:800,fontFamily:F.head}}>
                        {azData.isAnimal ? azData.totalAnimals : `${azData.yieldEst.toFixed(0)}kg`}
                      </div>
                      {azData.sp && azData.sp.totalM2 > 0 && !azData.isAnimal && (
                        <div style={{fontSize:10,color:C.t2,marginTop:2,fontFamily:F.mono}}>{azData.sp.usedM2}/{azData.sp.totalM2.toFixed(0)}m²</div>
                      )}
                    </div>
                  </div>

                  {/* Crop progress gauges */}
                  {azData.cropProgress.length > 0 && (
                    <div style={{display:"flex",flexWrap:"wrap",gap:12,justifyContent:"center"}}>
                      {azData.cropProgress.slice(0, 5).map((cp, i) => {
                        const pct = Math.round(cp.pct * 100);
                        const r = 32, stroke = 6, circ = 2 * Math.PI * (r - stroke);
                        const offset = circ - (circ * pct / 100);
                        const gaugeColor = pct >= 90 ? "#e74c3c" : pct >= 50 ? "#f39c12" : C.green;
                        const statusLabel = pct >= 100 ? "Ready to harvest!" : pct >= 80 ? "Almost ready" : pct >= 50 ? "Growing strong" : pct >= 25 ? "Sprouting" : "Just planted";
                        return (
                          <div key={i} style={{textAlign:"center",minWidth:80}}>
                            <div style={{position:"relative",width:r*2,height:r*2,margin:"0 auto"}}>
                              <svg width={r*2} height={r*2} style={{transform:"rotate(-90deg)"}}>
                                <circle cx={r} cy={r} r={r-stroke} fill="none" stroke="#edf3e9" strokeWidth={stroke}/>
                                <circle cx={r} cy={r} r={r-stroke} fill="none" stroke={gaugeColor} strokeWidth={stroke}
                                  strokeDasharray={circ} strokeDashoffset={offset}
                                  strokeLinecap="round" style={{transition:"stroke-dashoffset .6s ease"}}/>
                              </svg>
                              <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                                <div style={{fontSize:14,fontWeight:800,color:"#2d3a2d",fontFamily:F.mono}}>{pct}%</div>
                              </div>
                            </div>
                            <div style={{fontSize:11,fontWeight:600,color:"#445644",marginTop:4}}>{cp.emoji} {cp.name}</div>
                            <div style={{fontSize:9,color:C.t3,marginTop:1}}>{statusLabel}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Zone capacity bar */}
                  {azData.sp && azData.sp.totalM2 > 0 && (
                    <div style={{marginTop:14}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                        <span style={{color:"#445644"}}>Zone Capacity</span>
                        <strong style={{color: azData.sp.pct >= 0.95 ? C.red : azData.sp.pct >= 0.7 ? C.orange : C.green, fontFamily:F.mono}}>
                          {azData.sp.pct >= 0.95 ? "FULL" : `${azData.sp.freeM2}m² free`}
                        </strong>
                      </div>
                      <div style={{height:7,borderRadius:20,background:"#edf3e9",overflow:"hidden",border:"1px solid #e0e9da"}}>
                        <div style={{height:"100%",width:`${Math.min(100,azData.sp.pct*100).toFixed(0)}%`,background: azData.sp.pct >= 0.95 ? C.red : azData.sp.pct >= 0.7 ? C.orange : `linear-gradient(90deg, ${C.gl}, ${C.green})`,borderRadius:20}}/>
                      </div>
                    </div>
                  )}

                  {/* Quick zone nav */}
                  {data.zones.length > 1 && (
                    <div style={{display:"flex",gap:6,marginTop:14,flexWrap:"wrap"}}>
                      {data.zones.map(z => {
                        const zi = zoneIntel[z.id];
                        const isSel = z.id === activeZone;
                        return (
                          <button key={z.id} onClick={() => setSelZone(z.id)}
                            style={{fontSize:11,fontWeight:isSel?700:500,padding:"5px 10px",borderRadius:20,
                              border:`1px solid ${isSel ? C.green : C.bdr}`,
                              background:isSel ? C.gp : "#fff",color:isSel ? C.green : "#556655",
                              cursor:"pointer",transition:"all .15s"}}>
                            {zi?.zt?.icon} {z.name.length > 10 ? z.name.slice(0,10)+"…" : z.name}
                            {zi?.urgentCount > 0 && <span style={{marginLeft:4,color:C.red,fontWeight:700}}>!</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{padding:32,textAlign:"center",color:C.t2}}>
                  <div style={SX.s13}>Click a task or zone to inspect</div>
                </div>
              )}
            </Card>

            {/* Mini Farm Map — preserves actual farm proportions */}
            <div style={{position:"relative",background:"linear-gradient(180deg,#f7faf5,#edf4e8)",border:`1px solid ${C.bdr}`,borderRadius:16,overflow:"hidden",aspectRatio:`${data.farmW||100} / ${data.farmH||60}`,width:"100%"}}>
              {/* Grid overlay */}
              <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(to right, rgba(80,95,80,.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(80,95,80,.06) 1px, transparent 1px)",backgroundSize:"24px 24px"}}/>
              {/* Zone blocks — with crop color overlays */}
              {(()=>{
                // Build crop color map for the mini map
                const MINI_CROP_COLORS = CROP_COLORS;
                const miniCropColorMap = new Map();
                let colorIdx = 0;
                data.garden.plots.forEach(p => {
                  if (p.status !== "harvested" && !miniCropColorMap.has(p.crop)) {
                    miniCropColorMap.set(p.crop, MINI_CROP_COLORS[colorIdx % MINI_CROP_COLORS.length]);
                    colorIdx++;
                  }
                });
                return data.zones.map(z => {
                  const fW = data.farmW || 100, fH = data.farmH || 60;
                  const xPct = ((z.xM || 0) / fW * 100).toFixed(1);
                  const yPct = ((z.yM || 0) / fH * 100).toFixed(1);
                  const wPct = ((z.wM || 10) / fW * 100).toFixed(1);
                  const hPct = ((z.hM || 8) / fH * 100).toFixed(1);
                  const zt = ZT_MAP.get(z.type);
                  const isSel = z.id === activeZone;
                  const isPlant = ["veg","orchard","herbs","greenhouse"].includes(z.type);

                  // Calculate crop patches — use saved positions from Farm Layout
                  const zPlots = isPlant ? data.garden.plots.filter(p => p.zone === z.id && p.status !== "harvested") : [];
                  const zoneTotalM2 = (z.wM||10)*(z.hM||8);
                  const patches = [];
                  if (isPlant && zPlots.length > 0 && zoneTotalM2 > 0) {
                    let autoFillY = 1;
                    zPlots.forEach(p => {
                      let area = 0;
                      if (p.measureType === "area" && p.qty) area = +p.qty;
                      else if (p.plantCount) {
                        const crop = rCM(data.region).get(p.crop);
                        if (crop) { const sp = crop.spacing/100; area = p.plantCount * sp * sp; }
                      }
                      if (area > 0) {
                        const frac = Math.min(0.98, area / zoneTotalM2);
                        const cc = miniCropColorMap.get(p.crop) || {r:100,g:140,b:60};
                        let pw, ph, px, py;
                        if (p.patchW !== undefined && p.patchH !== undefined) {
                          pw = p.patchW; ph = p.patchH;
                          px = p.patchX || 0.03; py = p.patchY || 0;
                        } else {
                          const side = Math.sqrt(frac);
                          pw = Math.min(1, side * 1.2);
                          ph = Math.min(1, frac / pw);
                          px = 0.03;
                          py = Math.max(0, autoFillY - ph);
                          autoFillY -= ph + 0.02;
                        }
                        patches.push({crop:p.crop, name:p.name||p.crop, frac, pctLabel:Math.round(frac*100), cc, pw, ph, px, py});
                      }
                    });
                    patches.sort((a,b) => b.frac - a.frac);
                  }

                  return (
                    <div key={z.id}
                      onClick={() => setSelZone(z.id)}
                      style={{
                        position:"absolute",
                        left:`${xPct}%`,top:`${yPct}%`,width:`${wPct}%`,height:`${hPct}%`,
                        borderRadius:10,
                        border:`1.5px solid ${isSel ? C.green : "rgba(35,50,35,.15)"}`,
                        boxShadow: isSel ? `0 0 0 3px rgba(45,106,79,.18)` : "none",
                        background: zt?.fill ? `${zt.fill}88` : "#ddd8",
                        cursor:"pointer",transition:"all .15s",overflow:"hidden",
                      }}>
                      {/* Zone name label — floating on top */}
                      <div style={{position:"absolute",top:0,left:0,right:0,padding:"1px 3px",fontSize:8,fontWeight:700,
                        color:C.text,textAlign:"center",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                        zIndex:3}}>
                        {z.name}
                      </div>
                      {/* Crop patches — use saved positions from Farm Layout */}
                      {patches.map((cb,i) => (
                        <div key={i} style={{
                          position:"absolute",
                          left:`${(cb.px * 100).toFixed(1)}%`,
                          top:`${(cb.py * 100).toFixed(1)}%`,
                          width:`${(cb.pw * 100).toFixed(1)}%`,
                          height:`${(cb.ph * 100).toFixed(1)}%`,
                          background:`rgba(${cb.cc.r},${cb.cc.g},${cb.cc.b},.38)`,
                          borderRadius:4,overflow:"hidden",
                          display:"flex",alignItems:"center",justifyContent:"center",
                          zIndex:1,
                        }}>
                          {/* Inner glow */}
                          <div style={{position:"absolute",inset:"10%",borderRadius:"50%",
                            background:`rgba(${cb.cc.r},${cb.cc.g},${cb.cc.b},.25)`,
                            filter:"blur(6px)",zIndex:0}}/>
                          {/* Label */}
                          <div style={{position:"relative",zIndex:1,textAlign:"center",lineHeight:1.1}}>
                            <div style={{fontSize:8,fontWeight:900,color:"#fff",
                              textShadow:"0 1px 3px rgba(0,0,0,.55)"}}>{cb.pctLabel}%</div>
                            <div style={{fontSize:6,fontWeight:700,color:"rgba(255,255,255,.85)",
                              textShadow:"0 1px 2px rgba(0,0,0,.4)",
                              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                              maxWidth:"100%",padding:"0 1px"}}>{cb.name}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                });
              })()}
              {/* Edit link */}
              <button onClick={function(){setPage("farm",{tab:"setup"});}} style={{position:"absolute",top:6,right:8,background:"rgba(255,255,255,.85)",border:`1px solid ${C.bdr}`,borderRadius:8,padding:"3px 8px",fontSize:10,fontWeight:600,color:C.green,cursor:"pointer"}}>Edit Map</button>
            </div>
            {/* Crop color legend */}
            {_miniColorMap.size > 0 && (
              <div style={{display:"flex",flexWrap:"wrap",gap:"4px 10px",padding:"6px 0 0",alignItems:"center"}}>
                  <span style={{fontSize:10,fontWeight:700,color:C.t2}}>Crops:</span>
                  {[..._miniColorMap.entries()].map(function([name,cc]){return (
                    <div key={name} style={{display:"flex",alignItems:"center",gap:3}}>
                      <div style={{width:8,height:8,borderRadius:2,background:`rgba(${cc.r},${cc.g},${cc.b},.55)`,boxShadow:`0 0 4px rgba(${cc.r},${cc.g},${cc.b},.3)`}}/>
                      <span style={{fontSize:10,color:C.t1}}>{name}</span>
                    </div>
                  );})})
              </div>
            )}
          </div>
        )}
      </div>



      {/* Recent Activity */}
      {data.log.length>0&&<div><div style={{fontSize:14,fontWeight:700,fontFamily:F.head,marginBottom:8}}>Recent Activity</div>{data.log.slice(-5).reverse().map((l,i)=><div key={i} style={{fontSize:12,color:C.t2,padding:"6px 0",borderBottom:`1px solid ${C.bg}`}}>{l.text}</div>)}</div>}

      {/* ── Achievement Badges ── */}
      <div style={{marginTop:20}}>
        <div style={{fontSize:14,fontWeight:700,fontFamily:F.head,marginBottom:10}}>Achievements</div>
        <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
          {BADGES.map(badge => {
            const earned = g.badges.find(b => b.id === badge.id);
            return (
              <Tooltip key={badge.id} width={200} content={
                <div>
                  <div style={{fontWeight:700,marginBottom:4}}>{badge.emoji} {badge.name}</div>
                  <div style={{opacity:.85}}>{badge.desc}</div>
                  {earned && <div style={{marginTop:6,color:"#ffcc00",fontWeight:600,fontSize:11}}>Unlocked {earned.unlockedAt}</div>}
                  {!earned && <div style={{marginTop:6,opacity:.6,fontSize:11}}>Not yet earned</div>}
                </div>
              }>
                <div style={{
                  flex:"0 0 auto",minWidth:100,padding:"12px 10px",borderRadius:12,textAlign:"center",cursor:"pointer",
                  background: earned ? C.harvestBg : C.surface,
                  border: earned ? `1.5px solid ${C.orange}` : `1.5px dashed ${C.bdr}`,
                  opacity: earned ? 1 : 0.72,
                  transition: "all .3s ease",
                  boxShadow: earned ? "0 2px 8px rgba(255,152,0,.15)" : "none",
                }}>
                  <div style={{fontSize:28,filter:earned?"none":"grayscale(1)",marginBottom:4}}>{badge.emoji}</div>
                  <div style={{fontSize:10,fontWeight:700,color:earned?C.text:C.t2,fontFamily:F.body}}>{badge.name}</div>
                  {earned && <div style={{fontSize:9,color:C.orange,marginTop:2,fontWeight:600}}>Unlocked ✓</div>}
                  {!earned && <div style={{fontSize:9,color:C.t3,marginTop:2}}>{badge.desc.slice(0,35)}…</div>}
                </div>
              </Tooltip>
            );
          })}
        </div>
      </div>
      {openPlot && <PlotOverlay plot={openPlot} data={data} setData={setData} onClose={()=>setOpenPlotId(null)} setPage={setPage}/>}
      {openAnimal && <AnimalOverlay animal={openAnimal} data={data} setData={setData} onClose={()=>setOpenAnimalId(null)}/>}
    </div>
  );
}

const NAV=[
  {id:"home",    l:"Today",         E:Home},
  {id:"tasks",   l:"Tasks",         E:ClipboardList},
  {id:"farm",    l:"Farm",          E:Sprout},
  {id:"live",    l:"Livestock",     E:Rabbit},
  {id:"season",  l:"Seasonal",      E:CalendarDays},
  {id:"pantry",  l:"Pantry",        E:Package},
  {id:"fin",     l:"Financials",    E:TrendingUp},
  {id:"manuals", l:"Manuals",       E:BookOpen},
  {id:"feedback",l:"Give Feedback", E:MessageSquare},
];

/* ═══════════════════════════════════════════
   DATA REDUCER — replaces spread-based state updates
   ═══════════════════════════════════════════ */
function dataReducer(state, action) {
  if (action.type === 'SET_ALL') return action.data;
  if (action.type === 'TOGGLE_STEP') {
    const plots = state.garden.plots.map(p => {
      if (p.id === action.plotId) {
        const st = [...p.steps];
        st[action.stepIdx] = {...st[action.stepIdx], done: !st[action.stepIdx].done};
        return {...p, steps: st};
      }
      return p;
    });
    return {...state, garden: {plots}};
  }
  // Fallback: merge like the old setData({...data, ...changes})
  return {...state, ...action};
}

/* ═══════════════════════════════════════════
   ERROR BOUNDARY — graceful crash recovery
   ═══════════════════════════════════════════ */
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("MyTerra Error:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg,fontFamily:F.body,padding:32}}>
          <div style={{background:C.card,borderRadius:C.r,padding:32,maxWidth:480,boxShadow:C.shL,textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:12}}>🌾</div>
            <h2 style={{fontFamily:F.head,fontSize:22,marginBottom:8}}>Something went wrong</h2>
            <p style={{color:C.t2,fontSize:14,marginBottom:16}}>Your farm data is safe in your browser. Try reloading.</p>
            <p style={{color:C.t2,fontSize:12,marginBottom:20,fontFamily:F.mono,background:"#f5f5f5",padding:8,borderRadius:8,textAlign:"left",wordBreak:"break-word"}}>{String(this.state.error)}</p>
            <div style={{display:"flex",gap:8,justifyContent:"center"}}>
              <button onClick={() => {
                try {
                  const raw = exportFarm();
                  if (raw) {
                    const blob = new Blob([raw], { type: "application/json" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `myterra-emergency-backup-${todayLocalKey()}.json`;
                    a.click();
                  }
                } catch(e) { alert("Could not export: " + e.message); }
              }} style={{padding:"10px 20px",borderRadius:10,border:`1.5px solid ${C.bdr}`,background:C.card,cursor:"pointer",fontSize:13,fontWeight:600}}>
                Export Backup
              </button>
              <button onClick={() => window.location.reload()} style={{padding:"10px 20px",borderRadius:10,border:"none",background:C.green,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600}}>
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ═══════════════════════════════════════════
   BOTTOM NAVIGATION — mobile (< 768px)
   ═══════════════════════════════════════════ */
const BOTTOM_TABS = [
  {id:"home",   l:"Today",   E:Home},
  {id:"farm",   l:"Farm",    E:Sprout},
  {id:"live",   l:"Animals", E:PawPrint},
  {id:"pantry", l:"Pantry",  E:Package},
  {id:"more",   l:"More",    E:MoreHorizontal},
];

const MORE_ITEMS = [
  {id:"tasks",   l:"Task Queue",    E:ClipboardList},
  {id:"season",  l:"Seasonal",      E:CalendarDays},
  {id:"fin",     l:"Financials",    E:TrendingUp},
  {id:"manuals", l:"Manuals",       E:BookOpen},
  {id:"feedback",l:"Give Feedback", E:MessageSquare},
];

const BottomNav = React.memo(function BottomNav({page, setPage, taskCount, moreOpen, setMoreOpen}) {
  return (
    <nav aria-label="Main navigation" style={{
      position:"fixed", bottom:0, left:0, right:0,
      height:"calc(56px + env(safe-area-inset-bottom))",
      background:C.card, borderTop:`1px solid ${C.bdr}`,
      display:"flex", alignItems:"flex-start", paddingTop:6,
      paddingBottom:"env(safe-area-inset-bottom)",
      zIndex:400, boxShadow:"0 -1px 12px rgba(0,0,0,.06)",
    }}>
      {BOTTOM_TABS.map(function(tab) {
        const isActive = tab.id==="more" ? moreOpen : (page===tab.id && !moreOpen);
        return (
          <button key={tab.id} aria-label={tab.l}
            onClick={function(){ if(tab.id==="more"){setMoreOpen(!moreOpen);}else{setMoreOpen(false);setPage(tab.id);} }}
            style={{
              flex:1, display:"flex", flexDirection:"column", alignItems:"center",
              justifyContent:"flex-start", gap:2, border:"none", background:"transparent",
              cursor:"pointer", padding:"2px 4px", minHeight:44,
              color: isActive ? C.green : C.t2, position:"relative",
            }}
          >
            <span style={{display:"flex",alignItems:"center",justifyContent:"center",opacity:isActive?1:0.45,transition:"opacity .15s"}}><tab.E size={22} strokeWidth={isActive?2.2:1.7}/></span>
            <span style={{fontSize:9,fontWeight:isActive?700:400,fontFamily:F.body,letterSpacing:"0.01em",whiteSpace:"nowrap"}}>{tab.l}</span>
            {tab.id==="home"&&taskCount>0&&(
              <span style={{position:"absolute",top:0,right:"calc(50% - 18px)",background:"#ef4444",color:"#fff",fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:8,minWidth:16,textAlign:"center"}}>{taskCount>9?"9+":taskCount}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
});

const MoreDrawer = React.memo(function MoreDrawer({page, setPage, onClose, exportData, importData, isOffline, darkMode, setDarkMode}) {
  return createPortal(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.35)",backdropFilter:"blur(2px)",WebkitBackdropFilter:"blur(2px)",zIndex:500}}/>
      <div style={{
        position:"fixed", bottom:"calc(56px + env(safe-area-inset-bottom))",
        left:0, right:0, zIndex:501,
        background:C.card, borderRadius:"20px 20px 0 0",
        paddingBottom:8, boxShadow:"0 -4px 32px rgba(0,0,0,.14)",
        animation:"slideUp .22s cubic-bezier(.25,.46,.45,.94) both",
        maxHeight:"70vh", overflowY:"auto",
      }}>
        <div style={{width:36,height:4,borderRadius:2,background:C.bdr,margin:"12px auto 8px"}}/>
        {/* Profile section */}
        <div style={{display:"flex",alignItems:"center",gap:14,padding:"10px 20px 14px",borderBottom:`1px solid ${C.bdr}`}}>
          <div style={{width:44,height:44,borderRadius:22,background:C.grdHero,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <User size={22} strokeWidth={1.8} color="#fff"/>
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:F.body}}>My Farm</div>
            <div style={{fontSize:11,color:C.t2,marginTop:1}}>MyTerra · Free plan</div>
          </div>
        </div>
        <div style={{padding:"4px 0"}}>
          {MORE_ITEMS.map(function(item) {
            return (
              <button key={item.id} onClick={function(){setPage(item.id);onClose();}}
                style={{display:"flex",alignItems:"center",gap:14,width:"100%",padding:"14px 20px",
                  border:"none",background:page===item.id?C.gp:"transparent",
                  color:page===item.id?C.green:C.text,cursor:"pointer",
                  fontSize:15,fontFamily:F.body,fontWeight:page===item.id?600:400,
                  textAlign:"left",transition:"background .15s",
                }}
              >
                <span style={{width:28,display:"flex",alignItems:"center",justifyContent:"center",color:page===item.id?C.green:C.t2}}><item.E size={19} strokeWidth={1.8}/></span>{item.l}
              </button>
            );
          })}
        </div>
        <div style={{margin:"4px 20px",borderTop:`1px solid ${C.bdr}`,paddingTop:4}}>
          <button onClick={exportData} style={{display:"flex",alignItems:"center",gap:14,width:"100%",padding:"12px 0",border:"none",background:"transparent",color:C.t2,cursor:"pointer",fontSize:14,fontFamily:F.body,textAlign:"left"}}>
            <span style={{width:28,display:"flex",alignItems:"center",justifyContent:"center"}}><Download size={17} strokeWidth={1.8}/></span> Export Backup
          </button>
          <label style={{display:"flex",alignItems:"center",gap:14,width:"100%",padding:"12px 0",cursor:"pointer",fontSize:14,fontFamily:F.body,color:C.t2}}>
            <span style={{width:28,display:"flex",alignItems:"center",justifyContent:"center"}}><Upload size={17} strokeWidth={1.8}/></span> Import Backup
            <input type="file" accept=".json" onChange={function(e){if(e.target.files[0])importData(e.target.files[0]);e.target.value="";}} style={{display:"none"}}/>
          </label>
        </div>
          <button onClick={function(){setDarkMode(!darkMode);}} style={{display:"flex",alignItems:"center",gap:14,width:"100%",padding:"12px 0",border:"none",background:"transparent",color:C.t2,cursor:"pointer",fontSize:14,fontFamily:F.body,textAlign:"left"}}>
            <span style={{width:28,display:"flex",alignItems:"center",justifyContent:"center"}}>{darkMode ? <Sun size={17} strokeWidth={1.8}/> : <Moon size={17} strokeWidth={1.8}/>}</span> {darkMode ? "Light Mode" : "Dark Mode"}
          </button>
        {isOffline&&<div style={{padding:"8px 20px",fontSize:11,fontWeight:600,color:"#ea580c",background:"linear-gradient(135deg, #fff7ed, #fef3c7)",textAlign:"center",borderRadius:8,margin:"0 10px 8px"}}>📡 Offline — data saved locally</div>}
      </div>
    </>,
    document.body
  );
});

function AppInner() {
  // Lazy initializer — loads data synchronously, no loading flash
  // Wrapped in try-catch: if storage is corrupt or migration throws, fall back to DEF
  // instead of crashing the reducer with undefined state.
  const initData = () => {
    try {
      const d = loadFarm();
      let initial = d ? {...DEF,...d,log:d.log||[],costs:d.costs||{items:[]}} : DEF;
      if (!initial.schemaVersion) initial = {...initial, schemaVersion: 7};
      initial = migrateZones(initial);
      initial = migrateGamify(initial);
      initial = migrateCompletions(initial);
      return initial;
    } catch (e) {
      console.error("initData failed, falling back to DEF:", e);
      return DEF;
    }
  };

  const [page,setPageRaw]=useState(() => {
    try { const p = loadPage(); return (p && p !== "setup") ? p : "home"; } catch(e) { return "home"; }
  });
  const [pageData,setPageData]=useState(null);
  const [data,dispatchData]=useReducer(dataReducer, null, initData);
  const [viewW,setViewW]=useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  const [moreOpen,setMoreOpen]=useState(false);
  const [darkMode,setDarkMode]=useState(() => {
    try {
      const saved = loadTheme();
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch(e) { return false; }
  });
  const [isOffline,setIsOffline]=useState(typeof navigator !== "undefined" && !navigator.onLine);
  const [showFeedbackPrompt,setShowFeedbackPrompt]=useState(false);

  // 7-day feedback prompt — record first use, show prompt after 7 days (once)
  useEffect(() => {
    try {
      if (loadFeedbackDone()) return; // already submitted
      if (loadFeedbackDismissed()) return; // user said "maybe later"
      let firstUse = loadFirstUse();
      if (!firstUse) {
        saveFirstUse(Date.now());
        return; // just started using, check again next time
      }
      const daysSinceFirst = (Date.now() - parseInt(firstUse)) / (1000 * 60 * 60 * 24);
      if (daysSinceFirst >= 7) setShowFeedbackPrompt(true);
    } catch(e) {}
  }, []);

  // Online/offline detection
  useEffect(() => {
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Responsive breakpoint listener
  useEffect(() => {
    const check = () => setViewW(window.innerWidth);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const isMobile = viewW < 768;
  const isTablet = viewW >= 768 && viewW < 1024;

  // Flush pending save on tab close / navigate away
  useEffect(() => {
    const flush = () => flushFarm();
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, []);

  // Dark mode — apply data-theme attribute and persist
  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
      saveTheme(darkMode ? 'dark' : 'light');
    } catch(e) {}
  }, [darkMode]);

  // Navigate + persist current page
  const setPage = useCallback((p, pData) => {
    setPageRaw(p);
    setPageData(pData || null);
    try { savePage(p); } catch(e) {}
  }, []);

  // Save wrapper — backward-compatible setData that dispatches + debounced save
  // Also runs gamification updates (streak, badges) on every data change
  const setData = useCallback((nd) => {
    const withGamify = updateGamify(nd);
    dispatchData({type:'SET_ALL', data: withGamify});
    saveFarm(withGamify);
    // silent save — no UI indicator
  }, []);

  // Export farm data as JSON backup
  const exportData = useCallback(() => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `myterra-backup-${todayLocalKey()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch(e) { console.warn("Export failed:", e); }
  }, [data]);

  // Import farm data from JSON backup
  const importData = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const d = JSON.parse(e.target.result);
        // Defensive: reject backup files with prototype-pollution payloads
        if (d && typeof d === "object" && (
          Object.prototype.hasOwnProperty.call(d, "__proto__") ||
          Object.prototype.hasOwnProperty.call(d, "constructor") ||
          Object.prototype.hasOwnProperty.call(d, "prototype")
        )) {
          throw new Error("Backup file contains reserved keys and cannot be imported safely.");
        }
        const merged = migrateCompletions(migrateGamify(migrateZones({...DEF, ...d, log: d.log||[], costs: d.costs||{items:[]}})));
        setData(merged);
      } catch(err) { alert("Invalid backup file: " + err.message); }
    };
    reader.readAsText(file);
  }, [setData]);

  // Auto-redirect to setup ONLY on very first visit
  // Defensive null guards: do nothing if data or data.zones is missing.
  useEffect(()=>{
    if(!data || !Array.isArray(data.zones)) return;
    if(!data.setupDone && data.zones.length===0) setPageRaw("setup");
  },[data]);

  // Compute tasks ONCE — passed down to Dashboard + TaskQueue
  // Null guard: if data hasn't initialized yet, return empty tasks rather than crashing buildTaskQueue.
  const tasks = useMemo(() => data ? buildTaskQueue(data) : [], [data]);
  const taskCount = useMemo(() => tasks.filter(t => t.pri <= 2).length, [tasks]);
  const clearFarmPageData = useCallback(() => setPageData(null), []);

  // Loading fallback — if reducer somehow returns null, render a safe placeholder instead of crashing pg()
  if (!data) {
    return <div style={{padding:40,textAlign:"center",color:C.t2,fontFamily:F.body}}>Loading…</div>;
  }

  const pg = () => {
    switch(page) {
      case "tasks": return <TaskQueue data={data} setData={setData} setPage={setPage} tasks={tasks}/>;
      case "farm": return <FarmTab data={data} setData={setData} pageData={pageData} clearPageData={clearFarmPageData}/>;
      case "season": return <SeasonalCalendar data={data} setPage={setPage}/>;
      case "live": return <Livestock data={data} setData={setData}/>;
      case "pantry": return <Pantry data={data} setData={setData}/>;
      case "fin": return <Financials data={data} setData={setData}/>;
      case "manuals": return <Manuals data={data}/>;
      case "feedback": return <FeedbackSurvey setPage={setPage}/>;
      default: return <TodayScreen data={data} setData={setData} setPage={setPage} tasks={tasks}/>;
    }
  };

  return (
    <>
      {/* Fonts loaded via system fallback for offline use */}
      <div style={{display:"flex",height:"100vh",fontFamily:F.body,background:C.bg,color:C.text,overflow:"hidden",letterSpacing:"0.005em"}}>
        <nav style={{width:isMobile?0:isTablet?64:220,minWidth:isMobile?0:isTablet?64:220,background:C.card,borderRight:isMobile?"none":`1px solid ${C.bdr}`,display:isMobile?"none":"flex",flexDirection:"column",padding:"0",overflow:"hidden",position:"relative",transition:"width .3s cubic-bezier(.25,.46,.45,.94)"}}>
          {/* Premium brand header */}
          <div style={{padding:isTablet?"16px 0":"24px 20px 20px",marginBottom:4,background:C.grdHero,borderRadius:isTablet?"0":"0 0 20px 0",display:"flex",flexDirection:"column",alignItems:isTablet?"center":"flex-start"}}>
            <div style={{fontSize:isTablet?22:21,fontFamily:F.head,fontWeight:800,color:"#fff",letterSpacing:"-0.02em",display:"flex",alignItems:"center",gap:6}}><Leaf size={isTablet?22:20} strokeWidth={2}/>{!isTablet&&" MyTerra"}</div>
            {!isTablet&&<div style={{fontSize:11,color:"rgba(255,255,255,.7)",marginTop:3,fontWeight:500}}>Farm Manager</div>}
          </div>
          <div style={{padding:"8px 10px",display:"flex",flexDirection:"column",gap:2}}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>{setPage(n.id);}} className="nav-item" style={{display:"flex",alignItems:"center",gap:isTablet?0:11,padding:isTablet?"10px 0":"10px 14px",justifyContent:isTablet?"center":"flex-start",border:"none",background:page===n.id?C.gp:"transparent",color:page===n.id?C.green:C.t2,cursor:"pointer",fontSize:13.5,fontFamily:F.body,fontWeight:page===n.id?600:500,textAlign:"left",width:"100%",borderRadius:10,borderLeft:isTablet?"none":page===n.id?`3px solid ${C.green}`:"3px solid transparent",position:"relative",letterSpacing:"0.01em"}} title={isTablet?n.l:undefined}>
              <span style={{width:isTablet?undefined:24,display:"flex",alignItems:"center",justifyContent:"center",opacity:page===n.id?1:0.55,transition:"opacity .2s"}}><n.E size={isTablet?20:17} strokeWidth={page===n.id?2.2:1.8}/></span>{!isTablet&&n.l}
              {n.id==="home"&&taskCount>0&&<span style={{position:"absolute",right:10,background:"linear-gradient(135deg, #ef4444, #dc2626)",color:"#fff",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:10,minWidth:18,textAlign:"center",boxShadow:"0 2px 6px rgba(239,68,68,.3)"}}>{taskCount}</span>}
              {n.id==="tasks"&&taskCount>0&&<span style={{position:"absolute",right:10,background:"linear-gradient(135deg, #f59e0b, #d97706)",color:"#fff",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:10,boxShadow:"0 2px 6px rgba(245,158,11,.3)"}}>{taskCount}</span>}
            </button>
          ))}
          </div>
          <div style={SX.flex1}/>
          {/* Backup controls — hidden on tablet icon rail */}
          {!isTablet&&<div style={{padding:"10px 14px",borderTop:`1px solid ${C.bdr}`,margin:"0 10px"}}>
            <button onClick={exportData} style={{display:"flex",alignItems:"center",gap:7,width:"100%",padding:"7px 10px",border:"none",background:"transparent",color:C.t2,cursor:"pointer",fontSize:11.5,fontFamily:F.body,fontWeight:500,borderRadius:8,transition:"all .2s"}} title="Download farm data as JSON backup">
              <Download size={14} strokeWidth={1.8}/> Export Backup
            </button>
            <label style={{display:"flex",alignItems:"center",gap:7,width:"100%",padding:"7px 10px",border:"none",background:"transparent",color:C.t2,cursor:"pointer",fontSize:11.5,fontFamily:F.body,fontWeight:500,borderRadius:8,transition:"all .2s"}} title="Restore from a JSON backup file">
              <Upload size={14} strokeWidth={1.8}/> Import Backup
              <input type="file" accept=".json" onChange={e => { if(e.target.files[0]) importData(e.target.files[0]); e.target.value=""; }} style={{display:"none"}}/>
            </label>
          </div>}
          {!isTablet&&<div style={{padding:"10px 24px 18px",fontSize:10.5,color:C.t3,fontWeight:500}}>{rCR(data.region).length} crops · {Object.keys(LDB).length} animals</div>}
          <button onClick={()=>setDarkMode(!darkMode)} style={{display:"flex",alignItems:"center",gap:isTablet?0:8,padding:isTablet?"10px 0":"8px 20px 14px",border:"none",background:"transparent",color:C.t2,cursor:"pointer",fontSize:12,fontFamily:F.body,fontWeight:500,width:"100%",justifyContent:isTablet?"center":"flex-start"}} title={darkMode?"Switch to light mode":"Switch to dark mode"}>
            {darkMode ? <Sun size={isTablet?20:14} strokeWidth={1.8}/> : <Moon size={isTablet?20:14} strokeWidth={1.8}/>}{!isTablet&&<span style={{marginLeft:2}}>{darkMode?"Light Mode":"Dark Mode"}</span>}
          </button>
          {isOffline&&!isTablet&&<div style={{padding:"8px 20px",fontSize:11,fontWeight:600,color:"#ea580c",background:"linear-gradient(135deg, #fff7ed, #fef3c7)",textAlign:"center",borderRadius:8,margin:"0 10px 10px"}}>📡 Offline — data saved locally</div>}
        </nav>
        <main style={{flex:1,overflow:"auto",padding:isMobile?"16px 16px calc(72px + env(safe-area-inset-bottom))":isTablet?"24px":"32px 36px",background:C.bg}}>
          {pg()}
        </main>
      </div>
      {isMobile&&<BottomNav page={page} setPage={setPage} taskCount={taskCount} moreOpen={moreOpen} setMoreOpen={setMoreOpen}/>}
      {isMobile&&moreOpen&&<MoreDrawer page={page} setPage={setPage} onClose={()=>setMoreOpen(false)} exportData={exportData} importData={importData} isOffline={isOffline} darkMode={darkMode} setDarkMode={setDarkMode}/>}
      {showFeedbackPrompt && <FeedbackPrompt onOpen={() => { setShowFeedbackPrompt(false); setPage("feedback"); }} onDismiss={() => { setShowFeedbackPrompt(false); try { markFeedbackDismissed(); } catch(e) { console.warn("Could not save feedback dismissal state:", e); } }}/>}
      <AIAssistant data={data} setData={setData}/>
    </>
  );
}

export default function App() {
  return <ErrorBoundary><AppInner/></ErrorBoundary>;
}

/* ═══════════════════════════════════════════
   FEEDBACK SURVEY — 4-question user feedback
   ═══════════════════════════════════════════ */
function FeedbackSurvey({ setPage }) {
  const [answers, setAnswers] = useState({ module: "", confusion: "", missing: "", pay: "" });
  const [submitted, setSubmitted] = useState(false);

  const modules = ["Dashboard","Tasks","Farm Layout","Farming","Seasonal Calendar","Livestock","Pantry","Financials","Manuals","Smart offline farm assistant"];

  const update = (key, val) => setAnswers(prev => ({ ...prev, [key]: val }));

  const handleSubmit = () => {
    const subject = encodeURIComponent("MyTerra App Feedback");
    const body = encodeURIComponent(
      `Most used module: ${answers.module || "Not answered"}\n\n` +
      `Confusing in first 5 minutes: ${answers.confusion || "Not answered"}\n\n` +
      `Missing feature: ${answers.missing || "Not answered"}\n\n` +
      `Willingness to pay: ${answers.pay || "Not answered"}`
    );
    window.open(`mailto:dervis.kanina@gmail.com?subject=${subject}&body=${body}`, "_blank");
    setSubmitted(true);
    // Mark survey as done so 7-day prompt won't show again
    try { markFeedbackDone(); } catch(e) {}
  };

  if (submitted) {
    return (
      <div className="page-enter" style={{maxWidth:560,margin:"0 auto",textAlign:"center",padding:"60px 20px"}}>
        <div style={{fontSize:56,marginBottom:16}}>🎉</div>
        <h2 style={{fontFamily:F.head,fontSize:24,fontWeight:800,color:C.green,marginBottom:8}}>Thank you!</h2>
        <p style={{color:C.t2,fontSize:15,lineHeight:1.6,marginBottom:24}}>Your feedback helps us build a better tool for farmers like you. We read every single response.</p>
        <Btn onClick={() => setPage("home")}>Back to Today</Btn>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{maxWidth:600,margin:"0 auto"}}>
      <div style={{marginBottom:28}}>
        <h1 style={{fontFamily:F.head,fontSize:26,fontWeight:800,color:C.text,letterSpacing:"-0.02em"}}>💬 Help Us Improve</h1>
        <p style={{color:C.t2,fontSize:14,marginTop:4}}>4 quick questions — takes about 1 minute</p>
      </div>

      {/* Q1: Most used module */}
      <div style={{background:C.card,borderRadius:C.r,padding:24,marginBottom:16,boxShadow:C.sh,border:`1px solid ${C.bdr}`}}>
        <div style={SX.sectionHead}>1. Which module do you use the most?</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {modules.map(m => (
            <button key={m} onClick={() => update("module", m)} style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${answers.module === m ? C.green : C.bdr}`,background:answers.module === m ? C.gp : C.bg,color:answers.module === m ? C.green : C.t2,fontSize:13,fontWeight:answers.module === m ? 600 : 500,cursor:"pointer",fontFamily:F.body,transition:"all .2s"}}>{m}</button>
          ))}
        </div>
      </div>

      {/* Q2: Confusion */}
      <div style={{background:C.card,borderRadius:C.r,padding:24,marginBottom:16,boxShadow:C.sh,border:`1px solid ${C.bdr}`}}>
        <div style={SX.sectionHead}>2. What confused you in the first 5 minutes?</div>
        <textarea value={answers.confusion} onChange={e => update("confusion", e.target.value)} placeholder="e.g. I didn't know where to start, the layout was unclear..." rows={3} style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${C.bdr}`,borderRadius:12,fontSize:13,fontFamily:F.body,resize:"vertical",outline:"none",background:C.bg,boxSizing:"border-box"}}/>
      </div>

      {/* Q3: Missing feature */}
      <div style={{background:C.card,borderRadius:C.r,padding:24,marginBottom:16,boxShadow:C.sh,border:`1px solid ${C.bdr}`}}>
        <div style={SX.sectionHead}>3. What feature is missing that you'd really want?</div>
        <textarea value={answers.missing} onChange={e => update("missing", e.target.value)} placeholder="e.g. Weather integration, community forum, export to PDF..." rows={3} style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${C.bdr}`,borderRadius:12,fontSize:13,fontFamily:F.body,resize:"vertical",outline:"none",background:C.bg,boxSizing:"border-box"}}/>
      </div>

      {/* Q4: Willingness to pay */}
      <div style={{background:C.card,borderRadius:C.r,padding:24,marginBottom:16,boxShadow:C.sh,border:`1px solid ${C.bdr}`}}>
        <div style={SX.sectionHead}>4. Would you pay for this app?</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {["No, must be free","Maybe, if it had more features","Yes, $4.99/mo sounds fair","Yes, I'd pay $9.99/mo for a pro version"].map(opt => (
            <button key={opt} onClick={() => update("pay", opt)} style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${answers.pay === opt ? C.green : C.bdr}`,background:answers.pay === opt ? C.gp : C.bg,color:answers.pay === opt ? C.green : C.t2,fontSize:13,fontWeight:answers.pay === opt ? 600 : 500,cursor:"pointer",fontFamily:F.body,transition:"all .2s",textAlign:"left"}}>{opt}</button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <Btn onClick={handleSubmit} style={{width:"100%",marginBottom:12}}>
        Send Feedback via Email
      </Btn>
      <p style={{color:C.t3,fontSize:12,textAlign:"center"}}>Opens your email app with the answers pre-filled. Just hit send!</p>
    </div>
  );
}

/* ═══════════════════════════════════════════
   FEEDBACK PROMPT — shows once after 7 days
   ═══════════════════════════════════════════ */
function FeedbackPrompt({ onOpen, onDismiss }) {
  return (
    <div style={{position:"fixed",bottom:92,left:"50%",transform:"translateX(-50%)",zIndex:1800,background:C.card,borderRadius:20,boxShadow:"0 12px 48px rgba(0,0,0,.18)",padding:"20px 24px",maxWidth:360,width:"calc(100% - 32px)",border:`1px solid ${C.bdr}`,animation:"fadeUp .4s ease both"}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
        <div style={{fontSize:32,lineHeight:1}}>💬</div>
        <div style={SX.flex1}>
          <div style={{fontSize:16,fontWeight:700,color:C.text,fontFamily:F.head,marginBottom:4}}>How's it going?</div>
          <p style={{fontSize:13,color:C.t2,lineHeight:1.5,margin:0}}>You've been using MyTerra for a week! We'd love your feedback — it takes just 1 minute.</p>
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <Btn onClick={onOpen} sm>Give Feedback</Btn>
            <Btn onClick={onDismiss} v="secondary" sm>Maybe Later</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function AIAssistant({data}) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([
    {role:"assistant", content:`Hi! I'm your farm assistant. I know everything about the ${rCR(data.region).length} crops and ${Object.keys(LDB).length} animals in your database — and I work offline!\n\nStart typing a crop or animal name and pick from the dropdown, or tap a quick prompt below.`}
  ]);
  const [input, setInput] = useState("");
  const [suggestionsHidden, setSuggestionsHidden] = useState(false);
  const [selIdx, setSelIdx] = useState(-1);
  const scrollRef = useRef(null);
  const sugRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, open]);

  // Score suggestions during render — derived, no setState-in-effect cascade.
  // The dropdown can be dismissed (Escape, Tab, send) via suggestionsHidden;
  // typing again sets suggestionsHidden=false in onChange and the dropdown
  // reappears against the next input value.
  // Region-scoped suggestion catalog — recomputed only when the user changes region.
  const aiCatalog = useMemo(() => buildAISuggestions(data.region), [data.region]);
  const scoredSuggestions = useMemo(() => {
    const q = input.trim().toLowerCase();
    if (q.length < 2) return [];
    const words = q.split(/\s+/);
    const scored = aiCatalog.map(s => {
      let score = 0;
      if (s.keys.some(k => k.startsWith(q))) score += 10;
      else if (s.keys.some(k => k.includes(q))) score += 6;
      else {
        words.forEach(w => {
          if (w.length < 2) return;
          s.keys.forEach(k => { if (k.includes(w)) score += 3; });
          if (s.q.toLowerCase().includes(w)) score += 2;
          if (s.cat.toLowerCase().includes(w)) score += 1;
        });
      }
      return {...s, score};
    }).filter(s => s.score > 0).sort((a,b) => b.score - a.score);
    const seen = new Set();
    const unique = [];
    for (const s of scored) {
      if (!seen.has(s.q) && unique.length < 8) { seen.add(s.q); unique.push(s); }
    }
    return unique;
  }, [input, aiCatalog]);
  const suggestions = suggestionsHidden ? [] : scoredSuggestions;

  const sendQuery = (text) => {
    if (!text.trim()) return;
    const reply = farmKnowledgeEngine(text, data);
    setMsgs(prev => [...prev, {role:"user", content: text}, {role:"assistant", content: reply}]);
    setInput("");
    setSuggestionsHidden(true);
    setSelIdx(-1);
  };

  const send = () => sendQuery(input.trim());

  const handleKeyDown = (e) => {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelIdx(i => Math.min(i + 1, suggestions.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelIdx(i => Math.max(i - 1, -1)); return; }
      if (e.key === "Enter" && !e.shiftKey && selIdx >= 0) { e.preventDefault(); sendQuery(suggestions[selIdx].q); return; }
      if (e.key === "Tab" && selIdx >= 0) { e.preventDefault(); setInput(suggestions[selIdx].q); setSuggestionsHidden(true); return; }
      if (e.key === "Escape") { setSuggestionsHidden(true); setSelIdx(-1); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const quickPrompts = [
    {e:"🌱", q:"What should I plant now?"},
    {e:"📋", q:"What should I do today?"},
    {e:"🌾", q:"My farm status"},
    {e:"🐔", q:"Chicken care guide"},
    {e:"🍅", q:"How to grow tomatoes"},
    {e:"🤝", q:"Companion planting tips"},
    {e:"💧", q:"Watering tips for my crops"},
    {e:"📚", q:"What can you help with?"},
  ];

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="emoji-bounce"
        style={{
          position:"fixed", bottom:24, right:24, zIndex:2000,
          width:56, height:56, borderRadius:28,
          background:C.grd,
          border:"none", cursor:"pointer",
          boxShadow:"0 4px 20px rgba(45,106,79,.5)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:24, color:"#fff",
          transition:"transform .2s, box-shadow .2s",
        }}
        title="Farm Assistant"
      >
        {open ? "\u2715" : "\uD83C\uDF3E"}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position:"fixed", bottom:92, right:24, zIndex:1999,
          width:380, maxWidth:"calc(100vw - 32px)",
          height:540, maxHeight:"calc(100vh - 120px)",
          background:C.card, borderRadius:20,
          boxShadow:"0 12px 48px rgba(0,0,0,.18)",
          display:"flex", flexDirection:"column",
          overflow:"hidden",
          border:`1px solid ${C.bdr}`,
          animation:"fadeUp .3s ease both",
        }}>
          {/* Header */}
          <div style={{background:C.grdHero,padding:"14px 18px",flexShrink:0}}>
            <div style={SX.rowCenterG10}>
              <div style={{width:36,height:36,borderRadius:18,background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center"}}><Leaf size={20} strokeWidth={2} color="#fff"/></div>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:"#fff",fontFamily:F.head}}>Farm Assistant</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>Offline · {rCR(data.region).length} crops · {Object.keys(LDB).length} animals</div>
              </div>
              <button onClick={()=>setOpen(false)} style={{marginLeft:"auto",background:"rgba(255,255,255,.2)",border:"none",borderRadius:16,width:28,height:28,cursor:"pointer",color:"#fff",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{flex:1,overflowY:"auto",padding:"14px 14px 8px",display:"flex",flexDirection:"column",gap:10}}>
            {msgs.map((m,i) => (
              <div key={i} style={{display:"flex",flexDirection:"column",alignItems:m.role==="user"?"flex-end":"flex-start",gap:4}}>
                <div style={{
                  maxWidth:"88%", padding:"10px 13px",
                  background:m.role==="user"?C.green:C.surface,
                  color:m.role==="user"?"#fff":C.text,
                  borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",
                  fontSize:13, lineHeight:1.6,
                  whiteSpace:"pre-wrap", fontFamily:F.body,
                }}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>

          {/* Quick prompts */}
          {msgs.length <= 1 && (
            <div style={{padding:"4px 12px 2px",flexShrink:0,display:"flex",gap:4,flexWrap:"wrap"}}>
              {quickPrompts.map((p,i)=>(
                <button key={i} onClick={()=>sendQuery(p.q)} style={{padding:"5px 10px",borderRadius:16,border:`1px solid ${C.bdr}`,background:C.bg,fontSize:11,cursor:"pointer",color:C.t2,fontFamily:F.body,transition:"all .15s"}}>{p.e} {p.q}</button>
              ))}
            </div>
          )}

          {/* Input area with autocomplete dropdown */}
          <div style={{padding:"10px 12px",borderTop:`1px solid ${C.bdr}`,flexShrink:0,background:C.bg,position:"relative"}}>
            {/* Autocomplete dropdown — appears above input */}
            {suggestions.length > 0 && (
              <div ref={sugRef} style={{
                position:"absolute", bottom:"100%", left:0, right:0,
                background:C.card, borderTop:`1px solid ${C.bdr}`,
                boxShadow:"0 -4px 16px rgba(0,0,0,.1)",
                maxHeight:280, overflowY:"auto",
                borderRadius:"12px 12px 0 0",
              }}>
                {suggestions.map((s,i) => (
                  <button key={i}
                    onClick={() => sendQuery(s.q)}
                    onMouseEnter={() => setSelIdx(i)}
                    style={{
                      display:"flex", alignItems:"center", gap:10,
                      width:"100%", padding:"10px 14px",
                      background: i === selIdx ? C.soft : "transparent",
                      border:"none", borderBottom:`1px solid ${C.bdr}`,
                      cursor:"pointer", textAlign:"left",
                      transition:"background .1s",
                    }}
                  >
                    <span style={{fontSize:18,flexShrink:0}}>{s.e}</span>
                    <div style={SX.flex1min0}>
                      <div style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:F.body,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.q}</div>
                      <div style={{fontSize:10,color:C.t3,fontFamily:F.body}}>{s.cat}</div>
                    </div>
                    <span style={{fontSize:10,color:C.t3,flexShrink:0}}>tap</span>
                  </button>
                ))}
              </div>
            )}
            <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
              <textarea
                value={input}
                onChange={e=>{setInput(e.target.value); setSuggestionsHidden(false); setSelIdx(-1);}}
                onKeyDown={handleKeyDown}
                placeholder="Type a crop or animal name..."
                rows={1}
                style={{
                  flex:1, padding:"8px 12px", border:`1.5px solid ${suggestions.length > 0 ? C.green : C.bdr}`,
                  borderRadius:18, fontSize:13, fontFamily:F.body,
                  outline:"none", resize:"none", background:C.card,color:C.text,
                  lineHeight:1.4, maxHeight:80, overflowY:"auto",
                  transition:"border-color .2s",
                }}
              />
              <button
                onClick={send}
                disabled={!input.trim()}
                style={{flexShrink:0,width:44,height:44,borderRadius:22,background:!input.trim()?C.bdr:C.green,border:"none",cursor:!input.trim()?"default":"pointer",color:"#fff",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",transition:"background .2s"}}
              >➤</button>
            </div>
            <div style={{fontSize:10,color:C.t3,textAlign:"center",marginTop:5}}>Type 2+ letters to see suggestions · Works offline</div>
          </div>
        </div>
      )}
    </>
  );
}
