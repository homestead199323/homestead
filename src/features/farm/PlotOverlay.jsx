import React, { useMemo } from "react";
import { C, F, SX } from "../../lib/theme";
import { Btn, Card, Overlay, Pill, StepChecklist, StorageCard, WaterCard } from "../../components/ui";
import { COMP } from "../../data/companions";
import { uid } from "../../lib/storage";
import { appendLog, todayLocalKey, localDateFromKey } from "../../lib/utils";
import { rCM } from "../../lib/regional";
import { plotAreaM2, buildZoneSpaceMap } from "../../lib/farm-calc";

/* ═══════════════════════════════════════════
   PLOT OVERLAY — shared popup used from Farming, TaskQueue, Dashboard
   ═══════════════════════════════════════════ */
function PlotOverlay({plot, data, setData, onClose, setPage=null}) {
  const layoutId = plot ? `crop-card-${plot.id}` : undefined;
  const crop = rCM(data.region).get(plot.crop);
  const zone = plot.zone ? data.zones.find(z => z.id === plot.zone) : null;
  const zoneSpace = useMemo(
    () => buildZoneSpaceMap(data.zones, data.garden.plots, data.farmW||100, data.farmH||60, data.region),
    [data.zones, data.garden.plots, data.farmW, data.farmH, data.region]
  );
  const zoneStats = plot.zone ? zoneSpace[plot.zone] : null;
  const zoneMyArea = plotAreaM2(plot, data.region);
  const zoneFill = zoneStats ? (zoneStats.pct >= 0.95 ? C.red : zoneStats.pct >= 0.7 ? C.orange : C.green) : C.green;

  const compZonePlots = plot.zone
    ? data.garden.plots.filter(p => p.zone === plot.zone && p.status !== "harvested" && p.id !== plot.id).map(p => p.crop)
    : [];
  const compObj = COMP[plot.crop];
  const compGood = compObj ? compZonePlots.filter(n => compObj.good.includes(n)) : [];
  const compBad  = compObj ? compZonePlots.filter(n => compObj.bad.includes(n)) : [];
  const showComp = plot.zone && compObj && compZonePlots.length > 0 && (compGood.length > 0 || compBad.length > 0);

  const togStep = (pid, si) => {
    const plots = data.garden.plots.map(p => {
      if (p.id === pid) { const st = [...p.steps]; st[si] = {...st[si], done: !st[si].done}; return {...p, steps: st}; }
      return p;
    });
    setData({...data, garden: {plots}});
  };
  const del = id => {
    setData({...data, garden: {plots: data.garden.plots.filter(p => p.id !== id)}});
    onClose();
  };
  const harv = (p) => {
    const c = rCM(data.region).get(p.crop);
    const qty = p.expectedYieldKg || (p.plantCount && c ? p.plantCount * (c.yld || 3) : c?.cat === "Herb" ? 0.5 : c?.cat === "Grain" ? 5 : c?.yld || 3);
    const item = {id: uid(), name: p.crop, category: "Fresh Produce", qty, unit: "kg", source: "farm", addedDate: todayLocalKey(), storageNote: c?.storage || ""};
    setData({
      ...data,
      garden: {plots: data.garden.plots.map(x => x.id === p.id ? {...x, status: "harvested"} : x)},
      pantry: {items: [...data.pantry.items, item]},
      log: appendLog(data.log, {text: `🧺 Harvested ${qty}kg ${p.crop}`}),
    });
    onClose();
  };

  if (!crop) {
    return (
      <Overlay title={`${plot.name || plot.crop}`} onClose={onClose} sheet layoutId={layoutId}>
        <div style={{padding:"24px 12px",color:C.t2,fontSize:13}}>Crop data not found for this plot.</div>
      </Overlay>
    );
  }

  return (
    <Overlay title={`${crop.emoji} ${plot.name || plot.crop}`} onClose={onClose} sheet layoutId={layoutId}>
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        <Pill>{plot.status}</Pill>
        <Pill>☀ {crop.sun}</Pill>
        <Pill>💧 {crop.waterFreq}</Pill>
        {zone && <Pill c={C.blue} bg={C.waterBg}>📍 {zone.name}</Pill>}
      </div>

      {(plot.plantCount || plot.qty || plot.expectedYieldKg) && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",gap:8,marginBottom:14}}>
          {plot.plantCount && <Card style={{background:C.soft,padding:"10px 14px"}}><div style={SX.capHeaderT2}>Plants</div><div style={{fontSize:20,fontWeight:700,color:C.green}}>{plot.plantCount}</div><div style={SX.t2_10}>estimated</div></Card>}
          {plot.qty && plot.measureType === "area" && <Card style={{background:C.waterBg,padding:"10px 14px"}}><div style={SX.capHeaderT2}>Area</div><div style={{fontSize:20,fontWeight:700,color:C.blue}}>{plot.qty}m²</div><div style={SX.t2_10}>bed size</div></Card>}
          {plot.qty && plot.measureType === "plants" && <Card style={{background:C.waterBg,padding:"10px 14px"}}><div style={SX.capHeaderT2}>Count</div><div style={{fontSize:20,fontWeight:700,color:C.blue}}>{plot.qty}</div><div style={SX.t2_10}>plants</div></Card>}
          {plot.expectedYieldKg && <Card style={{background:C.harvestBg,padding:"10px 14px"}}><div style={SX.capHeaderT2}>Est. Yield</div><div style={{fontSize:20,fontWeight:700,color:C.orange}}>~{plot.expectedYieldKg}kg</div><div style={SX.t2_10}>at harvest</div></Card>}
          {plot.plantCount && crop.spacing ? <Card style={{background:C.surface,padding:"10px 14px"}}><div style={SX.capHeaderT2}>Spacing</div><div style={{fontSize:20,fontWeight:700,color:C.text}}>{crop.spacing}cm</div><div style={SX.t2_10}>between plants</div></Card> : null}
        </div>
      )}

      {plot.zone && zone && zoneStats && zoneStats.totalM2 > 0 && (
        <Card style={{marginBottom:12, background: zoneStats.pct >= 0.95 ? C.dangerBg : zoneStats.pct >= 0.7 ? C.harvestBg : C.soft}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{fontSize:12,fontWeight:700,color:zoneFill}}>
              {zoneStats.pct >= 0.95 ? "🔴 Zone Full" : zoneStats.pct >= 0.7 ? "🟡 Zone Getting Full" : "🟢 Zone Space"}
            </div>
            <div style={{fontSize:11,color:C.t2,fontFamily:F.mono}}>{zone.name}</div>
          </div>
          <div style={{height:8,borderRadius:4,background:C.bdr,overflow:"hidden",marginBottom:6}}>
            <div style={{height:"100%",width:`${Math.min(100,zoneStats.pct*100).toFixed(0)}%`,background:zoneFill,borderRadius:4,transition:"width .4s"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.t2}}>
            <span>Used: <strong style={{color:C.text}}>{zoneStats.usedM2}m²</strong></span>
            {zoneMyArea > 0 && <span>This crop: <strong style={{color:zoneFill}}>{Math.round(zoneMyArea*10)/10}m²</strong></span>}
            <span>Free: <strong style={{color:zoneFill}}>{zoneStats.freeM2}m²</strong> of {zoneStats.totalM2.toFixed(0)}m²</span>
          </div>
        </Card>
      )}

      {showComp && (
        <Card style={{marginBottom:12,background:compBad.length > 0 ? C.dangerBg : C.soft}}>
          <div style={SX.lblGreen}>🌱 Companions in zone</div>
          {compGood.length > 0 && <div style={{fontSize:12,color:C.green,marginTop:4}}>✓ Good: {compGood.join(", ")}</div>}
          {compBad.length  > 0 && <div style={{fontSize:12,color:C.red,marginTop:4}}>✕ Bad: {compBad.join(", ")}</div>}
        </Card>
      )}

      <WaterCard waterNote={crop.waterNote}/>
      <div className="g2" style={{gap:8,marginBottom:16}}>
        <Card><div style={SX.t2_11b}>PLANTED</div><div style={{fontSize:15,fontWeight:700}}>{plot.plantDate || "—"}</div></Card>
        <Card><div style={SX.t2_11b}>HARVEST</div><div style={{fontSize:15,fontWeight:700}}>{plot.harvestDate || "—"}</div></Card>
      </div>

      <Card style={{marginBottom:12,background:C.soft,border:`1px solid ${C.gm}`}}><div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:4}}><span style={{fontSize:13,fontWeight:700,color:C.green}}>🌱 Crop Data</span>{crop.pH && <Pill c={C.text} bg={C.warm}>pH {crop.pH}</Pill>}</div></Card>
      {crop.fert && <Card style={{marginBottom:12,background:C.soft}}><div style={SX.lblGreen}>🧪 Fertilizer Schedule</div><div style={{fontSize:12,marginTop:4,lineHeight:1.5}}>{crop.fert}</div></Card>}
      {crop.pests && crop.pests.length > 0 && <Card style={{marginBottom:12,background:C.harvestBg}}><div style={{fontSize:12,fontWeight:700,color:C.orange}}>🐛 Pests & Solutions</div>{crop.pests.slice(0,3).map(function(pst,i){return <div key={i} style={{marginTop:4}}><strong style={{fontSize:11}}>{pst.n}</strong>{pst.t && <div style={SX.t2_11}>→ {pst.t}</div>}</div>;})}</Card>}

      <StepChecklist steps={plot.steps} plantDate={plot.plantDate} onToggle={togStep} plotId={plot.id}/>
      <StorageCard storage={crop.storage}/>
      <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(crop.name + " growing guide complete")}`} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,color:C.red,textDecoration:"none",fontWeight:600,padding:"8px 14px",background:C.dangerBg,borderRadius:C.rs,border:`1px solid ${C.bdr}`,marginBottom:8}}>▶ Watch: Complete {crop.name} Growing Guide</a>
      {setPage && (
        <button onClick={function(){onClose();setPage("manuals");}} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.green,fontWeight:600,padding:"8px 14px",background:C.gp,borderRadius:C.rs,border:`1px solid ${C.bdr}`,marginBottom:12,cursor:"pointer",width:"100%",textAlign:"left"}}>
          📖 Need help growing {crop.name}? See the Manuals →
        </button>
      )}

      <div style={SX.btnRowEnd}>
        <Btn v="danger" sm onClick={()=>del(plot.id)}>Delete</Btn>
        {plot.status !== "harvested" && plot.harvestDate && localDateFromKey(plot.harvestDate) <= localDateFromKey(todayLocalKey()) && <Btn v="success" onClick={()=>harv(plot)}>🧺 Harvest</Btn>}
      </div>
    </Overlay>
  );
}

export default PlotOverlay;
