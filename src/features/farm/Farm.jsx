import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { C, F, SX } from "../../lib/theme";
import { Btn, Card, Inp, Sel, Overlay, Pill, Ring, Stat } from "../../components/ui";
import { LAYOUT_SPRING } from "../../lib/use-spring-drag";
import { COMP } from "../../data/companions";
import { CROP_COLORS } from "../../data/crops";
import { LDB } from "../../data/livestock";
import { REGIONS, REGION_MAP } from "../../data/regions";
import { ZT, ZT_MAP } from "../../data/zones";
import { searchCity } from "../../data/cities";
import { uid } from "../../lib/storage";
import { appendLog, todayLocalKey, localDateFromKey, addDaysToLocalKey } from "../../lib/utils";
import { getRegionalCrops, getRegionalVarieties, rCM, rCR } from "../../lib/regional";
import { cropMeasureType, plantsFromArea, expectedYield, buildZoneSpaceMap } from "../../lib/farm-calc";
import PlotOverlay from "./PlotOverlay";
import LivingFarmMap from "./living/LivingFarmMap";
import CropStagePatch from "./living/CropStagePatch";
import RoadLayer from "./living/RoadLayer";
import ZoneSurface from "./living/ZoneSurface";
import ZonePalette, { PALETTE_DRAG_TYPE } from "./living/ZonePalette";
import { mapBackgroundStyle, mapVignetteStyle, zoneRadius } from "./living/visuals";

const MotionDiv = motion.div;

function BackgroundLayer() {
  return (
    <div
      aria-hidden="true"
      style={{
        position:"absolute", inset:0,
        ...mapBackgroundStyle(),
        pointerEvents:"none",
        zIndex:0,
      }}
    >
      <div style={mapVignetteStyle()}/>
    </div>
  );
}

/* ═══════════════════════════════════════════
   FARM SETUP — simplified editing
   ═══════════════════════════════════════════ */
function Setup({data, setData, onPlantInZone}) {
  /* Living Map: keep zones inside an 8% inset so they don't collide
     with background scenery painted around the edges. */
  const SAFE_INSET = 0.08;
  const [showAdd, setShowAdd] = useState(false);
  const [sel, setSel] = useState(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({name:"", type:"veg", wM:"10", hM:"8"});
  const [farmW, setFarmW] = useState(data.farmW || 100); // total farm width in meters
  const [farmH, setFarmH] = useState(data.farmH || 60);  // total farm height in meters
  const [dragging, setDragging] = useState(null); // {id, startX, startY, origXM, origYM}
  const [zoneResize, setZoneResize] = useState(null); // {id, edge, startX, startY, origXM, origYM, origWM, origHM}
  const [hoverInfo, setHoverInfo] = useState(null); // zone hover tooltip
  const [tutorialDismissed, setTutorialDismissed] = useState(!!data.designerTutorialSeen);
  const [armedType, setArmedType] = useState(null); // tap-to-place: id of armed palette type, or null
  const svgRef = useRef(null);
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
              style={{width:70,padding:"4px 8px",border:`1px solid ${C.bdr}`,borderRadius:6,fontSize:16,fontFamily:F.mono}}/>
            <span style={SX.t2_12}>m</span>
          </div>
          <div style={SX.rowCenterG6}>
            <label style={SX.t2_12}>Height</label>
            <input type="number" min="10" max="2000" value={farmH}
              onChange={e => { const v = +e.target.value||60; setFarmH(v); setData({...data, farmH:v}); }}
              style={{width:70,padding:"4px 8px",border:`1px solid ${C.bdr}`,borderRadius:6,fontSize:16,fontFamily:F.mono}}/>
            <span style={SX.t2_12}>m</span>
          </div>
          <span style={{fontSize:11,color:C.t3,fontFamily:F.mono}}>{farmW}m × {farmH}m = {(farmW*farmH).toLocaleString()} m²</span>
        </div>
      </Card>

      {/* Draggable Farm Map — clean light style (matches Dashboard) */}
      <div className="lf-wrap">
      <div ref={svgRef} className="lf-canvas" style={{
        position:"relative",
        background:C.tMap,
        border:`1px solid ${C.bdr}`,borderRadius:16,overflow:"hidden",
        minHeight:440,userSelect:"none",
        touchAction:"none",
        cursor: dragging ? "grabbing" : (armedType ? "crosshair" : "default"),
      }}
        onClick={e => {
          /* Tap-to-place: if a palette type is armed, drop a zone at the tap point */
          if (armedType && e.target === svgRef.current) {
            const t = armedType;
            if (!ZT_MAP.get(t)) { setArmedType(null); return; }
            const rect = svgRef.current.getBoundingClientRect();
            const cxPct = ((e.clientX - rect.left) / rect.width);
            const cyPct = ((e.clientY - rect.top)  / rect.height);
            const defaultWM = 10, defaultHM = 8;
            const dropXM = Math.round(cxPct * farmW - defaultWM/2);
            const dropYM = Math.round(cyPct * farmH - defaultHM/2);
            const safeMinX = farmW * SAFE_INSET;
            const safeMinY = farmH * SAFE_INSET;
            const safeMaxX = farmW * (1 - SAFE_INSET) - defaultWM;
            const safeMaxY = farmH * (1 - SAFE_INSET) - defaultHM;
            const xM = Math.max(safeMinX, Math.min(Math.max(safeMinX, safeMaxX), dropXM));
            const yM = Math.max(safeMinY, Math.min(Math.max(safeMinY, safeMaxY), dropYM));
            const zt2 = ZT_MAP.get(t);
            const baseName = zt2 ? zt2.label : t;
            const existing = data.zones.filter(z => z.type === t).length;
            const newZone = {
              id: uid(),
              name: existing > 0 ? `${baseName} ${existing+1}` : baseName,
              type: t,
              xM, yM, wM: defaultWM, hM: defaultHM,
            };
            setData({...data, zones: [...data.zones, newZone]});
            setSel(newZone.id);
            setArmedType(null);
            return;
          }
          if (e.target === svgRef.current) setSel(null);
        }}
        onDragOver={e => {
          if (e.dataTransfer && Array.from(e.dataTransfer.types||[]).includes(PALETTE_DRAG_TYPE)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }
        }}
        onDrop={e => {
          const t = e.dataTransfer.getData(PALETTE_DRAG_TYPE) || e.dataTransfer.getData("text/plain");
          if (!t || !ZT_MAP.get(t)) return;
          e.preventDefault();
          const rect = svgRef.current.getBoundingClientRect();
          const cxPct = ((e.clientX - rect.left) / rect.width);
          const cyPct = ((e.clientY - rect.top)  / rect.height);
          // Default new-zone size (in meters), then snap & clamp with safe-area
          const defaultWM = 10, defaultHM = 8;
          const dropXM = Math.round(cxPct * farmW - defaultWM/2);
          const dropYM = Math.round(cyPct * farmH - defaultHM/2);
          const safeMinX = farmW * SAFE_INSET;
          const safeMinY = farmH * SAFE_INSET;
          const safeMaxX = farmW * (1 - SAFE_INSET) - defaultWM;
          const safeMaxY = farmH * (1 - SAFE_INSET) - defaultHM;
          const xM = Math.max(safeMinX, Math.min(Math.max(safeMinX, safeMaxX), dropXM));
          const yM = Math.max(safeMinY, Math.min(Math.max(safeMinY, safeMaxY), dropYM));
          const zt2 = ZT_MAP.get(t);
          const baseName = zt2 ? zt2.label : t;
          const existing = data.zones.filter(z => z.type === t).length;
          const newZone = {
            id: uid(),
            name: existing > 0 ? `${baseName} ${existing+1}` : baseName,
            type: t,
            xM, yM, wM: defaultWM, hM: defaultHM,
          };
          setData({...data, zones: [...data.zones, newZone]});
          setSel(newZone.id);
          setArmedType(null);
        }}
        onPointerMove={e => {
          const rect = svgRef.current.getBoundingClientRect();
          const curX = e.clientX - rect.left;
          const curY = e.clientY - rect.top;
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
          const safeMinXd = farmW * SAFE_INSET;
          const safeMinYd = farmH * SAFE_INSET;
          const safeMaxXd = farmW * (1 - SAFE_INSET) - (z.wM||10);
          const safeMaxYd = farmH * (1 - SAFE_INSET) - (z.hM||8);
          const newXM = Math.max(safeMinXd, Math.min(Math.max(safeMinXd, safeMaxXd), dragging.origXM + dxM));
          const newYM = Math.max(safeMinYd, Math.min(Math.max(safeMinYd, safeMaxYd), dragging.origYM + dyM));
          upZ(dragging.id, {xM: newXM, yM: newYM, x: newXM/farmW*100, y: newYM/farmH*100});
        }}
        onPointerUp={() => { setDragging(null); setZoneResize(null); }}
        onPointerCancel={() => { setDragging(null); setZoneResize(null); setHoverInfo(null); }}
        onMouseLeave={() => setHoverInfo(null)}>

        {/* Minimal living planner background */}
        <BackgroundLayer/>
        <RoadLayer zones={zones} farmW={farmW} farmH={farmH}/>

        {/* Measurement grid stays very faint in edit mode only */}
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(to right, rgba(80,95,80,.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(80,95,80,.045) 1px, transparent 1px)",backgroundSize:"24px 24px",pointerEvents:"none",zIndex:3}}/>

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
              <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>{hoverInfo.name}</div>
              <div style={{opacity:.7,fontSize:11,marginBottom:2}}>{hoverInfo.typeLabel}</div>
              <div style={{opacity:.7,fontSize:11}}>{hoverInfo.wM}×{hoverInfo.hM}m · {hoverInfo.area} m²</div>
              {hoverInfo.cropCount > 0 && <div style={{marginTop:4,fontSize:11,color:"#95d5b2"}}>{hoverInfo.cropCount} crop{hoverInfo.cropCount>1?"s":""} planted</div>}
              {hoverInfo.animalCount > 0 && <div style={{fontSize:11,color:"#ffcc00"}}>{hoverInfo.animalCount} animal{hoverInfo.animalCount>1?"s":""}</div>}
            </div>
            <div style={{width:0,height:0,borderLeft:"6px solid transparent",borderRight:"6px solid transparent",borderTop:"6px solid #1d1d1f",margin:"0 auto"}}/>
          </div>
        )}

        {/* Tap-to-place hint banner — shown when a palette type is armed */}
        {armedType && (
            <div style={{
              position: "absolute", top: 8, left: 8, right: 8,
              padding: "8px 12px",
              background: C.green,
              color: "#fff",
              borderRadius: 10,
              fontSize: 12, fontWeight: 700,
              boxShadow: "0 4px 12px rgba(0,0,0,.25)",
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              pointerEvents: "auto",
            }}
              onClick={e => e.stopPropagation()}
            >
              <span style={{flex: 1, lineHeight: 1.3}}>
                Tap map to place <strong>{ZT_MAP.get(armedType) ? ZT_MAP.get(armedType).label : armedType}</strong>
              </span>
              <button
                type="button"
                onClick={() => setArmedType(null)}
                style={{
                  background: "rgba(255,255,255,.25)",
                  border: "none",
                  color: "#fff",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                }}
              >Cancel</button>
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

            // Build crop patches — row-packed auto-layout (no manual positioning)
            const zoneTotalM2 = (z.wM||10)*(z.hM||8);
            const cropPatches = [];
            if (isPlant && zPlots.length > 0 && zoneTotalM2 > 0) {
              // Step 1: compute frac + growth stage for each plot
              const raw = [];
              const todayMs = localDateFromKey(todayLocalKey()).getTime();
              zPlots.forEach(p => {
                let area = 0;
                const cr = rCM(data.region).get(p.crop);
                if (p.measureType==="area"&&p.qty) area=+p.qty;
                else if (p.plantCount && cr) { const sp=cr.spacing/100; area=p.plantCount*sp*sp; }
                if (area>0) {
                  const frac=Math.min(1,area/zoneTotalM2);
                  const cc=setupColorMap.get(p.crop)||{r:100,g:140,b:60};
                  // Growth stage from plantDate + crop's `days` to harvest
                  let growthPct = 0;
                  let stage = "just_planted";
                  if (p.plantDate && cr && cr.days > 0) {
                    const plantedMs = localDateFromKey(p.plantDate).getTime();
                    const elapsedDays = Math.max(0, (todayMs - plantedMs) / 864e5);
                    growthPct = Math.max(0, Math.min(1, elapsedDays / cr.days));
                    if (growthPct >= 0.85) stage = "ready";
                    else if (growthPct >= 0.10) stage = "growing";
                    else stage = "just_planted";
                  }
                  raw.push({plotId:p.id,crop:p.crop,name:p.name||p.crop,frac,pctLabel:Math.round(frac*100),cc,growthPct,stage});
                }
              });
              // Step 2: sort desc by frac, then row-pack with width budget 1.0
              raw.sort((a,b)=>b.frac-a.frac);
              const sumFrac = raw.reduce((s,r)=>s+r.frac,0);
              const scale = sumFrac > 1 ? 1/sumFrac : 1;
              const rows = [];
              let cur = []; let curW = 0;
              raw.forEach(r => {
                const pw = r.frac * scale;
                if (curW + pw > 1.0001 && cur.length > 0) { rows.push(cur); cur = []; curW = 0; }
                cur.push({...r, pw});
                curW += pw;
              });
              if (cur.length > 0) rows.push(cur);
              // Step 3: assign px/py/ph (equal-height rows)
              const rowH = rows.length > 0 ? 1 / rows.length : 1;
              rows.forEach((row, ri) => {
                let x = 0;
                row.forEach(p => {
                  cropPatches.push({...p, ph: rowH, px: x, py: ri * rowH});
                  x += p.pw;
                });
              });
            }

            return (
              <div key={z.id} id={`zone-${z.id}`}
                onPointerDown={e => {
                  // Only start zone drag if not clicking a crop patch
                  if (e.target.closest('[data-crop-patch]')) return;
                  e.stopPropagation();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  const rect = svgRef.current.getBoundingClientRect();
                  const z2 = zones.find(zz => zz.id === z.id);
                  setDragging({id:z.id,startX:e.clientX-rect.left,startY:e.clientY-rect.top,origXM:z2.xM||0,origYM:z2.yM||0,rect});
                  setSel(z.id);
                }}
                onPointerMove={e => {
                  if (e.pointerType !== "mouse") return; // hover tooltips only on desktop
                  if (!dragging && !zoneResize) {
                    const rect = svgRef.current.getBoundingClientRect();
                    setHoverInfo({x:e.clientX-rect.left,y:e.clientY-rect.top,name:z.name,typeLabel:zt?.label||z.type,wM:(z.wM||10).toFixed(0),hM:(z.hM||8).toFixed(0),area:((z.wM||10)*(z.hM||8)).toFixed(0),cropCount:zPlots.length,animalCount});
                  }
                }}
                onMouseLeave={() => setHoverInfo(null)}
                onClick={() => { if (!dragging && !zoneResize) setSel(z.id); }}
                style={{
                  position:"absolute",
                  left:`${xPct}%`,top:`${yPct}%`,width:`${wPct}%`,height:`${hPct}%`,
                  borderRadius:zoneRadius(z.type),
                  border:`1px solid ${isSel ? "rgba(241,223,69,.96)" : "rgba(24,44,27,.13)"}`,
                  boxShadow: isSel ? `0 0 0 3px rgba(255,255,255,.96), 0 0 0 6px rgba(241,223,69,.96), 0 10px 24px rgba(35,45,26,.2)` : "0 8px 18px rgba(40,60,30,.13)",
                  background: "transparent",
                  cursor: isDraggingThis ? "grabbing" : "pointer",
                  opacity: isDraggingThis ? 0.75 : 1,
                  transition: dragging ? "none" : "all .2s ease",
                  transform: isSel && !isDraggingThis ? "scale(1.02)" : "scale(1)",
                  overflow:"hidden",
                  zIndex:5,
                }}>
                <ZoneSurface type={z.type} rounded={zoneRadius(z.type)}/>
                {/* Zone name */}
                <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%, -50%)",padding:"4px 8px",fontSize:10,fontWeight:850,color:"#fff",background:"rgba(25,35,25,.37)",borderRadius:9,textAlign:"center",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"88%",zIndex:8,pointerEvents:"none",textShadow:"0 1px 3px rgba(0,0,0,.38)",backdropFilter:"blur(3px)"}}>{z.name}</div>
                {/* Crop patches — auto-laid-out, stage-aware (purely visual, no manipulation) */}
                {cropPatches.map((cb) => {
                  return <CropStagePatch key={cb.plotId} patch={cb} showText={cropPatches.length <= 4}/>;
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
                      onPointerDown={e => {
                        e.stopPropagation();
                        e.currentTarget.setPointerCapture(e.pointerId);
                        const rect2 = svgRef.current.getBoundingClientRect();
                        setZoneResize({id:z.id, edge, startX:e.clientX-rect2.left, startY:e.clientY-rect2.top,
                          origXM:z.xM||0, origYM:z.yM||0, origWM:z.wM||10, origHM:z.hM||8});
                      }}
                      style={{position:"absolute",...pos, width:sz3, height:sz3,
                        background:"#fff", border:`2px solid ${C.green}`, borderRadius:isCorner?2:1,
                        cursor:cursors[edge], zIndex:10,
                        touchAction: "none",
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
                  <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.08em",color:"rgba(255,255,255,.45)",textTransform:"uppercase"}}>{zt2?.label || sz2.type}</div>
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
                {onPlantInZone && ["veg","orchard","herbs","greenhouse"].includes(sz2.type) && (
                  <button onClick={function(e){e.stopPropagation();onPlantInZone(sz2.id);}}
                    style={{marginTop:10,width:"100%",padding:"7px 0",background:C.green,color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:"0.01em"}}>
                    + Plant in {sz2.name}
                  </button>
                )}
                <div style={{marginTop:6,fontSize:10,color:"rgba(255,255,255,.3)",textAlign:"center",fontStyle:"italic"}}>Click zone to edit below ↓</div>
              </div>
            </div>
          );
        })()}

      {/* First-visit tutorial — shown until dismissed */}
      {!tutorialDismissed && (
        <div style={{
          position:"absolute",inset:0,zIndex:80,
          background:"rgba(0,0,0,.55)",backdropFilter:"blur(3px)",
          display:"flex",alignItems:"center",justifyContent:"center",
          borderRadius:16,
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
                {n:"1",icon:"➕",label:"Add a zone","sub":"Hit \"+ Zone\" or pick a template below"},
                {n:"2",icon:"✋",label:"Drag to position","sub":"Move zones around the map to match your real farm"},
                {n:"3",icon:"📐",label:"Set real measurements","sub":"Enter actual metres so spacing and yield estimates are accurate"},
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
              style={{width:"100%",padding:"12px 0",background:C.green,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",letterSpacing:"0.01em"}}>
              Got it — let me design my farm
            </button>
          </div>
        </div>
      )}

        {/* Helper text */}
        <div style={{position:"absolute",bottom:6,left:10,fontSize:9,color:"rgba(80,95,80,.45)",fontFamily:F.mono,pointerEvents:"none"}}>Tap palette then tap map · Or drag zones from palette · Tap to select</div>
      </div>
      {/* Palette — Living Map */}
      <ZonePalette zones={data.zones} armedType={armedType} onArm={setArmedType}/>
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
        {zones.map(z=>{const zt=ZT.find(t=>t.id===z.type);const isPlantZone=["veg","orchard","herbs","greenhouse"].includes(z.type);return(
          <Card key={z.id} onClick={()=>setSel(z.id)} active={sel===z.id} style={{borderLeft:`4px solid ${zt?.fill||C.bdr}`}}>
            <div style={{fontSize:13,fontWeight:600}}>{zt?.icon} {z.name}</div>
            <div style={SX.t2_11}>{zt?.label}</div>
            <div style={{fontSize:10,color:C.t3,fontFamily:F.mono,marginTop:2}}>{(z.wM||0).toFixed(0)}m × {(z.hM||0).toFixed(0)}m</div>
            {isPlantZone && onPlantInZone && (
              <button onClick={function(e){e.stopPropagation();onPlantInZone(z.id);}}
                style={{marginTop:8,width:"100%",padding:"5px 0",background:C.green,color:"#fff",border:"none",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                + Plant
              </button>
            )}
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
          <MotionDiv key={p.id} layoutId={`crop-card-${p.id}`} transition={LAYOUT_SPRING}>
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
          </MotionDiv>
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

/* ═══════════════════════════════════════════
   FARM TAB — merges Map + Crops + Layout
   ═══════════════════════════════════════════ */
function FarmTab({data, setData, pageData, clearPageData}) {
  const [subTab, setSubTab] = useState(function() {
    return (pageData && pageData.tab) ? pageData.tab : "map";
  });
  const [plantZoneId, setPlantZoneId] = useState(null);

  useEffect(function() { clearPageData(); }, [clearPageData]);

  const farmPageData = (pageData && !pageData.tab) ? pageData : null;

  function handlePlantInZone(zoneId) {
    setPlantZoneId(zoneId);
    setSubTab("crops");
  }

  const cropPageData = plantZoneId ? {zone: plantZoneId, ...(farmPageData || {})} : farmPageData;
  function clearCropPageData() { setPlantZoneId(null); }

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
      {subTab==="map"   && <LivingFarmMap data={data} showCropPatches onEditLayout={function(){setSubTab("setup");}} onPlantInZone={handlePlantInZone}/>}
      {subTab==="crops" && <Farming data={data} setData={setData} pageData={cropPageData} clearPageData={clearCropPageData}/>}
      {subTab==="setup" && <Setup data={data} setData={setData} onPlantInZone={handlePlantInZone}/>}
    </div>
  );
}

export default FarmTab;
