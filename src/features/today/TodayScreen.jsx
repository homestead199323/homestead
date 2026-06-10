import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

import { C, F, SX } from "../../lib/theme";
import { ZT_MAP } from "../../data/zones";
import { CROPS } from "../../data/crops";
import { BADGES } from "../../data/badges";
import { toLocalDateKey, todayLocalKey, localDateFromKey, addDaysToLocalKey, daysBetweenLocalKeys, markTaskDone } from "../../lib/utils";
import { rCM } from "../../lib/regional";
import { buildZoneSpaceMap } from "../../lib/farm-calc";
import { fetchWeather } from "../../lib/weather";
import { DEF } from "../../app/state";
import { Card, Pill, Tooltip, Ring, SwipeableRow, TaskCheckbox } from "../../components/ui";
import AnimalOverlay from "../animals/AnimalOverlay";
import PlotOverlay from "../farm/PlotOverlay";
import WalkOverlay from "./WalkOverlay";
import LivingFarmMap from "../farm/living/LivingFarmMap";
import FarmIcon from "../../components/FarmIcon";
import { STAGE_STYLE } from "../farm/living/visuals";

/* ═══════════════════════════════════════════
   TODAY TASK ROW — compact row used in the home-screen Task Pipeline.

   This is the mobile-first task list (visible immediately on app open).
   Visually denser than TaskQueue's TaskRow: priority-as-dot instead of
   left-border, single-line truncated title, no date label, zone Pill on
   the right edge. Phase 6.1 pattern still applies though — tap the
   left-side TaskCheckbox to complete with the same 280ms fade + 8px
   slide + 0.97 scale + strikethrough animation, swipe-right uses the
   same path, prefers-reduced-motion skips the delay. Harvest tasks
   keep their right-side 🧺 button (goto Farm/PlotOverlay), no checkbox.
   ═══════════════════════════════════════════ */
const TodayTaskRow = React.memo(function TodayTaskRow({
  t, isActive, zoneInitials, priColor, priBg,
  onOpenContext, onToggleStep, onMarkDone, onHarvest,
}) {
  const [completing, setCompleting] = useState(false);
  const canOpen = !!(t.plotId || t.animalId);
  const canMarkDone = t.type !== "step" && t.type !== "upcoming" && t.type !== "forecast" && t.type !== "harvest";
  const isStep = t.stepIdx != null;
  const completeAction = (isStep && t.plotId)
    ? function() { onToggleStep(t.plotId, t.stepIdx); }
    : (canMarkDone && t.key)
    ? function() { onMarkDone(t.key); }
    : null;
  const handleComplete = () => {
    if (!completeAction || completing) return;
    const reduce = typeof window !== "undefined"
      && window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { completeAction(); return; }
    setCompleting(true);
    setTimeout(completeAction, 280);
  };
  const swipeRightAction = completeAction ? handleComplete : undefined;
  const strikethrough = completing ? "line-through" : "none";
  const cols = completeAction ? "auto auto 1fr auto" : "auto 1fr auto";
  return (
    <SwipeableRow onSwipeRight={swipeRightAction} style={{marginBottom:4,borderRadius:12}}>
      <div
        onClick={canOpen && !completing ? onOpenContext : (t.zoneId && !completing ? onOpenContext : undefined)}
        style={{
          display:"grid",gridTemplateColumns:cols,gap:10,alignItems:"center",
          padding:"10px 12px",
          border:`1px solid ${isActive ? C.gm : C.bdr}`,
          borderRadius:12,background:isActive ? C.soft : C.raised,
          cursor: (canOpen || t.zoneId) && !completing ? "pointer" : "default",
          opacity: completing ? 0 : 1,
          transform: completing ? "translateY(8px) scale(0.97)" : "translateY(0) scale(1)",
          transition: "opacity 280ms ease-out, transform 280ms ease-out",
        }}>
        {completeAction && (
          <TaskCheckbox checked={completing} onToggle={handleComplete} />
        )}
        <span style={{width:9,height:9,borderRadius:"50%",background:priColor(t.pri),flexShrink:0}}/>
        <div style={{minWidth:0}}>
          <div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textDecoration:strikethrough}}>{t.emoji} {t.title}</div>
          <div style={{fontSize:11,color:C.t2,marginTop:1}}>{t.loc}{t.daysOut > 0 ? ` · in ${t.daysOut}d` : t.daysOut === 0 && t.type !== "water" ? " · now" : ""}</div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
          {t.type === "harvest" && (
            <button onClick={(e)=>{e.stopPropagation();onHarvest();}} style={{background:C.orange,color:"#fff",border:"none",borderRadius:6,padding:"3px 7px",fontSize:10,fontWeight:700,cursor:"pointer",minHeight:0}}>Harvest</button>
          )}
          <Pill c={priColor(t.pri)} bg={priBg(t.pri)}>{zoneInitials}</Pill>
        </div>
      </div>
    </SwipeableRow>
  );
});

export default function TodayScreen({data, setData, setPage, tasks}) {
  const [selZone,setSelZone]=useState(null);
  const [openPlotId,setOpenPlotId]=useState(null);
  const [openAnimalId,setOpenAnimalId]=useState(null);
  const [walkOpen,setWalkOpen]=useState(false);
  const [wide,setWide]=useState(typeof window!=="undefined"&&window.innerWidth>=800);  useEffect(()=>{const h=()=>setWide(window.innerWidth>=800);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  // ── Hero block: time-of-day greeting + live weather ──
  const [weather, setWeather] = useState(null);
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 6) return "Quiet hours";
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);
  useEffect(() => {
    let mounted = true;
    if (!data.city) { setWeather(null); return; }
    fetchWeather(data.city).then(w => { if (mounted) setWeather(w); });
    return () => { mounted = false; };
  }, [data.city]);
  // ── Week-strip data: last 7 days, active=true when there's a completion on that date ──
  const last7Days = useMemo(() => {
    const days = [];
    const today = new Date();
    const dayLetters = ["S","M","T","W","T","F","S"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = toLocalDateKey(d);
      const entries = (data.completions && data.completions[key]) || [];
      days.push({
        key,
        dayLetter: dayLetters[d.getDay()],
        active: entries.length > 0,
        isToday: i === 0,
      });
    }
    return days;
  }, [data.completions]);
  // ── Contextual suggestions derived from current data state (not log history) ──
  // Each suggestion is a concrete, immediately-actionable CTA. New ones can be
  // added as data signals become available. Returns [] when nothing applies.
  const suggestions = useMemo(() => {
    const out = [];
    // Fresh harvest in Pantry → cross-link to preservation methods in Manuals.
    // This is the only place in the app that bridges Pantry items to the 13
    // preservation methods documented in Manuals.
    const sevenDaysAgo = addDaysToLocalKey(todayLocalKey(), -7);
    const freshHarvest = (data.pantry.items || []).filter(function(item) {
      return item.source === "harvest"
        && item.addedDate
        && item.addedDate >= sevenDaysAgo
        && item.unit === "kg"
        && item.qty > 0;
    });
    if (freshHarvest.length > 0) {
      const totalKg = freshHarvest.reduce(function(s, i) { return s + i.qty; }, 0);
      const names = freshHarvest.slice(0, 2).map(function(i) { return i.name; }).join(", ");
      const more = freshHarvest.length > 2 ? ` +${freshHarvest.length - 2} more` : "";
      out.push({
        id: "preserve-fresh",
        emoji: "🏺",
        text: `${totalKg.toFixed(1)}kg fresh ${names}${more} won't last forever`,
        ctaLabel: "How to preserve →",
        ctaTarget: "manuals",
      });
    }
    return out;
  }, [data.pantry.items]);
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
        return { name: p.name || p.crop, crop: p.crop, pct, emoji: crop.emoji };
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
                <div><span style={{display:"inline-block",width:8,height:8,borderRadius:4,background:"#34c759",marginRight:5}}/>Steps <strong>{ringData.doneSteps}/{ringData.totalSteps}</strong></div>
                <div><span style={{display:"inline-block",width:8,height:8,borderRadius:4,background:C.blue,marginRight:5}}/>Growing <strong>{ringData.plantedCount}</strong></div>
                <div><span style={{display:"inline-block",width:8,height:8,borderRadius:4,background:C.orange,marginRight:5}}/>Harvest <strong>{ringData.readyCount}</strong></div>
              </div>
              <div style={SX.flex1}>
                <h2 style={{fontFamily:F.head,fontSize:24,margin:0,letterSpacing:"-0.03em",fontWeight:800,color:C.text}}>{greeting}</h2>
                <p style={{color:C.t2,fontSize:12,margin:"2px 0 0",fontWeight:500}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</p>
                {weather && weather.ok && (
                  <p style={{color:C.t2,fontSize:12,margin:"3px 0 0",fontWeight:500}}>
                    <span style={{marginRight:5}}>{weather.emoji}</span>
                    <span style={{color:C.text,fontWeight:600}}>{weather.temp}°C</span>
                    <span> · {weather.desc} in {weather.location}</span>
                    <span style={{color:C.green,fontWeight:600}}> — {weather.hint}</span>
                  </p>
                )}
                {weather && !weather.ok && data.city && (
                  <p style={{color:C.t2,fontSize:11,margin:"3px 0 0",fontWeight:500,opacity:.7}}>
                    weather unavailable
                  </p>
                )}
                {!weather && data.city && (
                  <div className="skeleton" style={{height:14,width:200,marginTop:4,borderRadius:6}}/>
                )}
                {!data.city && (
                  <p style={{color:C.t2,fontSize:11,margin:"3px 0 0",fontWeight:500,opacity:.75}}>
                    set your city for weather → Map › Edit Layout
                  </p>
                )}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
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

            {/* ── Streak band: hero-sized streak + last-7-days strip ── */}
            <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:C.surface,borderRadius:C.rs,border:`1px solid ${C.bdr}`,marginBottom:16,flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                <span style={{fontSize:26,lineHeight:1}}>{g.streak >= 7 ? "🔥" : "🌱"}</span>
                <div>
                  <div style={{fontSize:18,fontWeight:800,fontFamily:F.head,color:g.streak >= 7 ? C.orange : C.green,lineHeight:1.05}}>
                    {g.streak === 0 ? "Start your streak" : `${g.streak} day${g.streak === 1 ? "" : "s"}`}
                  </div>
                  <div style={{fontSize:10,color:C.t2,fontWeight:500,marginTop:2}}>
                    {g.streak === 0
                      ? "Touch any task today to begin"
                      : g.bestStreak > g.streak
                        ? `Best ${g.bestStreak} days`
                        : "Personal best 🎉"}
                  </div>
                </div>
              </div>
              <div style={{flex:1,minWidth:170,display:"flex",justifyContent:"flex-end",gap:6}}>
                {last7Days.map(function(d) {
                  return (
                    <div key={d.key} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                      <div style={{
                        width:24,height:24,borderRadius:"50%",
                        background:d.active ? C.green : "transparent",
                        border:d.active ? "none" : `1.5px solid ${C.bdr}`,
                        boxShadow:d.isToday ? `0 0 0 2px ${C.gp}` : "none",
                        display:"flex",alignItems:"center",justifyContent:"center",
                        color:d.active ? "#fff" : C.t2,
                        fontSize:12,fontWeight:700,
                      }}>{d.active ? "✓" : ""}</div>
                      <div style={{fontSize:9,color:d.isToday ? C.green : C.t2,fontWeight:d.isToday ? 700 : 500}}>{d.dayLetter}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* "Start your walk" CTA — primary action of the day. Hidden when nothing to do. */}
            {enrichedTasks.length > 0 && (
              <button
                onClick={function(){setWalkOpen(true);}}
                style={{
                  width:"100%",
                  padding:"14px 18px",
                  borderRadius:C.rs,
                  background:C.green,
                  border:"none",
                  color:"#fff",
                  fontSize:15,
                  fontWeight:700,
                  fontFamily:F.body,
                  cursor:"pointer",
                  marginBottom:16,
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"center",
                  gap:10,
                  boxShadow:"0 2px 8px rgba(45,106,79,.25)",
                }}
              >
                <span style={{fontSize:18,lineHeight:1}}>🌿</span>
                <span>Start your walk</span>
                <span style={{opacity:.8}}>→</span>
              </button>
            )}

            {/* Info boxes — what a farmer reads first */}
            <div className="bento" style={{gap:10}}>
              {/* TODAY'S WORK */}
              <Card className="bento-wide" onClick={function(){setPage("tasks");}} style={{padding:"14px 16px",background:_durgent>0?C.grdTask:C.grdCrops,border:_durgent>0?`1px solid ${C.orange}`:`1px solid ${C.bdr}`}}>
                <div style={SX.capHeader}>Today's Work</div>
                <div style={{fontSize:28,fontWeight:800,fontFamily:F.head,color:_durgent>0?C.orange:C.text,lineHeight:1,marginTop:4}}>{enrichedTasks.length}</div>
                <div style={SX.t2_11mt4}>
                  {enrichedTasks.length === 0 ? <span style={{color:C.green,fontWeight:600}}>a quiet day 🌿</span> : _durgent > 0 ? <span style={{color:C.orange,fontWeight:700}}>{_durgent} need attention</span> : "on your walk today"}
                </div>
                <div style={SX.t3_10mt2}>
                  <span style={{display:"inline-block",width:6,height:6,borderRadius:3,background:"#34c759",marginRight:4}}/>{ringData.doneSteps}/{ringData.totalSteps} steps done
                </div>
              </Card>

              {/* CROPS */}
              <Card onClick={function(){setPage("crops");}} style={{padding:"14px 16px",background:C.tCrop,border:`1px solid ${C.tCropBd}`}}>
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
              <Card onClick={function(){setPage("live");}} style={{padding:"14px 16px",background:C.tAnimal,border:`1px solid ${C.tAnimalBd}`}}>
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
              <Card className="bento-wide" style={{padding:"14px 16px",background:C.tGrow,border:`1px solid ${C.tCropBd}`}}>
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
              <Card className="bento-wide" style={{padding:"14px 16px",background:_dnet>=0?C.tMoneyPos:C.tMoneyNeg,border:_dnet>=0?`1px solid ${C.tCropBd}`:`1px solid ${C.tMoneyNegBd}`}}>
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
              const zoneInitials = t.zoneId
                ? (data.zones.find(z=>z.id===t.zoneId)?.name?.split(" ").map(w=>w[0]).join("").slice(0,3) || "—")
                : "Farm";
              return (
                <TodayTaskRow
                  key={t.key || i}
                  t={t}
                  isActive={isActive}
                  zoneInitials={zoneInitials}
                  priColor={priColor}
                  priBg={priBg}
                  onOpenContext={() => {
                    if (t.zoneId) setSelZone(t.zoneId);
                    if (t.plotId) setOpenPlotId(t.plotId);
                    else if (t.animalId) setOpenAnimalId(t.animalId);
                  }}
                  onToggleStep={togStep}
                  onMarkDone={(key) => setData(markTaskDone(data, key))}
                  onHarvest={() => {
                    if (t.plotId) setOpenPlotId(t.plotId);
                    else setPage("crops");
                  }}
                />
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
                    <div style={{border:`1px solid ${C.bdr}`,borderRadius:12,padding:"10px 12px",background:C.card}}>
                      <div style={SX.t2_11b}>Task Load</div>
                      <div style={{fontSize:22,fontWeight:800,fontFamily:F.head}}>{azData.taskCount}</div>
                      {azData.urgentCount > 0 && <div style={{fontSize:10,color:C.red,fontWeight:600,marginTop:2}}>{azData.urgentCount} urgent</div>}
                    </div>
                    <div style={{border:`1px solid ${C.bdr}`,borderRadius:12,padding:"10px 12px",background:C.card}}>
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
                                <circle cx={r} cy={r} r={r-stroke} fill="none" stroke={C.tProgress} strokeWidth={stroke}/>
                                <circle cx={r} cy={r} r={r-stroke} fill="none" stroke={gaugeColor} strokeWidth={stroke}
                                  strokeDasharray={circ} strokeDashoffset={offset}
                                  strokeLinecap="round" style={{transition:"stroke-dashoffset .6s ease"}}/>
                              </svg>
                              <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                                <div style={{fontSize:14,fontWeight:800,color:C.text,fontFamily:F.mono}}>{pct}%</div>
                              </div>
                            </div>
                            <div style={{fontSize:11,fontWeight:600,color:C.text,marginTop:4,display:"flex",alignItems:"center",justifyContent:"center",gap:4}}><FarmIcon name={cp.crop} emoji={cp.emoji} size={13}/>{cp.name}</div>
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
                        <span style={{color:C.text}}>Zone Capacity</span>
                        <strong style={{color: azData.sp.pct >= 0.95 ? C.red : azData.sp.pct >= 0.7 ? C.orange : C.green, fontFamily:F.mono}}>
                          {azData.sp.pct >= 0.95 ? "FULL" : `${azData.sp.freeM2}m² free`}
                        </strong>
                      </div>
                      <div style={{height:7,borderRadius:20,background:C.tProgress,overflow:"hidden",border:`1px solid ${C.tProgressBd}`}}>
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
                              background:isSel ? C.gp : C.card,color:isSel ? C.green : C.t2,
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
            <LivingFarmMap
              data={data}
              showCropPatches
              showHelperText={false}
              showEditButton={false}
              onZoneClick={function(z){ setSelZone(z.id); }}
            />
            <button onClick={function(){setPage("map",{edit:true});}} style={{marginTop:8,background:C.gp,border:`1px solid ${C.bdr}`,borderRadius:8,padding:"5px 12px",fontSize:11,fontWeight:600,color:C.green,cursor:"pointer"}}>✏️ Edit Map</button>
            {/* Growth-stage legend — matches CropStagePatch v3 */}
            {data.garden.plots.some(function(p){return p.status!=="harvested";}) && (
              <div style={{display:"flex",flexWrap:"wrap",gap:"4px 12px",padding:"6px 0 0",alignItems:"center"}}>
                {Object.entries(STAGE_STYLE).map(function([key,st]){return (
                  <div key={key} style={{display:"flex",alignItems:"center",gap:4}}>
                    <span style={{width:8,height:8,borderRadius:"50%",background:st.ring}}/>
                    <span style={{fontSize:10,color:C.t2,fontWeight:600}}>{st.label}</span>
                  </div>
                );})}
              </div>
            )}
          </div>
        )}
      </div>



      {/* Suggestions — contextual CTAs derived from current data state */}
      {suggestions.length > 0 && (
        <div style={{marginTop:20}}>
          <div style={{fontSize:14,fontWeight:700,fontFamily:F.head,marginBottom:8}}>Suggestions</div>
          {suggestions.map(function(s) {
            return (
              <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:C.surface,borderRadius:C.rs,marginBottom:6,border:`1px solid ${C.bdr}`,flexWrap:"wrap"}}>
                <span style={{fontSize:22,flexShrink:0,lineHeight:1}}>{s.emoji}</span>
                <div style={{flex:1,minWidth:160,fontSize:13,color:C.text,fontWeight:500,lineHeight:1.3}}>{s.text}</div>
                <button onClick={function(){setPage(s.ctaTarget);}} style={{background:C.green,color:"#fff",border:"none",borderRadius:7,padding:"6px 12px",fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0}}>{s.ctaLabel}</button>
              </div>
            );
          })}
        </div>
      )}

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
      {walkOpen && createPortal(<WalkOverlay tasks={tasks} data={data} setData={setData} onClose={()=>setWalkOpen(false)}/>, document.body)}
    </div>
  );
}
