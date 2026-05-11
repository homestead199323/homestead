import React, { useState, useMemo } from "react";
import { C, F, SX } from "../../lib/theme";
import { rCR, rCM, getRegionalCalendar } from "../../lib/regional";
import { todayLocalKey, daysBetweenLocalKeys } from "../../lib/utils";
import { parseSowMonths, parseHarvestMonths, getCropDifficulty, MN_ABR, MN_FULL } from "../../lib/calendar";
import { COMP } from "../../data/companions";
import { LDB } from "../../data/livestock";
import { REGION_MAP } from "../../data/regions";
import { PRESERVATION } from "../../data/preservation";
import { PROJECT_GUIDES, BLUEPRINT_IMAGES } from "../../data/projects";
import { Btn, Card, Inp, Overlay, Pill, Stat } from "../../components/ui";

/* ═══════════════════════════════════════════
   ENCYCLOPEDIA
   ═══════════════════════════════════════════ */
function Manuals({data}) {
  const [s,setS]=useState("");const [sel,setSel]=useState(null);const [tab,setTab]=useState("crops");
  const rgCrops = rCR(data && data.region);
  const curRegion = REGION_MAP.get((data && data.region) || "western_europe");
  const fil=rgCrops.filter(c=>!s||c.name.toLowerCase().includes(s.toLowerCase()));
  const mn=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const TABS=[{id:"crops",l:"🌱 Crops"},{id:"animals",l:"🐄 Animals"},{id:"preserving",l:"🫙 Preserving"},{id:"projects",l:"🔨 Projects"}];
  return (
    <div className="page-enter" style={{maxWidth:960}}>
      <h2 style={{fontFamily:F.head,fontSize:30,margin:"0 0 4px",letterSpacing:"-0.03em",fontWeight:800}}>📖 MyTerra Manuals</h2>
      <p style={{color:C.t2,fontSize:13,margin:"0 0 16px",fontWeight:500}}>Everything you need to know — crops, animals, preservation, and DIY builds</p>
      <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>{TABS.map(t=><button key={t.id} onClick={()=>{setTab(t.id);setSel(null);setS("");}} style={{padding:"8px 20px",borderRadius:20,border:"none",background:tab===t.id?C.green:C.card,color:tab===t.id?"#fff":C.t2,fontSize:13,fontWeight:600,cursor:"pointer",boxShadow:tab===t.id?"none":C.sh}}>{t.l}</button>)}</div>

      {tab==="crops"&&<>
        <Inp placeholder="Search crops..." value={s} onChange={e=>setS(e.target.value)}/>
        <div style={{display:"grid",gap:6,marginTop:12}}>{fil.map(c=><Card key={c.name} onClick={()=>setSel(c)} style={{borderLeft:`4px solid ${c.color}`}}><div style={SX.rowCenterG10}><span style={{fontSize:24}}>{c.emoji}</span><div style={SX.flex1}><strong>{c.name}</strong> <Pill>{c.cat}</Pill><div style={SX.t2_12mt2}>{c.sowIn} · {c.harvest} · {c.days}d</div></div><span style={{color:C.t3}}>›</span></div></Card>)}</div>
        {sel&&<Overlay title={`${sel.emoji} ${sel.name}`} onClose={()=>setSel(null)} wide>
          {sel && <div style={{background:C.tGreen2,borderRadius:C.rs,padding:10,marginBottom:12,border:`1px solid ${C.tGreenBandBd}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:4}}><span style={{fontSize:13,fontWeight:700,color:C.green}}>🌱 Crop Data</span>{sel.pH&&<Pill>pH {sel.pH}</Pill>}</div></div>}
          <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}><Pill c="#fff" bg={sel.color}>{sel.cat}</Pill><Pill>☀ {sel.sun}</Pill><Pill>💧 {sel.waterFreq}</Pill>{sel?.pH ? <Pill>pH {sel.pH}</Pill> : null}</div>
          <div style={{marginBottom:16}}><div style={{fontSize:11,fontFamily:F.mono,color:C.t2,marginBottom:4}}>CALENDAR</div><div style={{display:"flex",gap:2}}>{mn.map(m=>{const iS=sel.sowIn.toLowerCase().includes(m.toLowerCase());const iH=sel.harvest.toLowerCase().includes(m.toLowerCase());return <div key={m} style={{flex:1,textAlign:"center"}}><div style={{fontSize:8,color:C.t2,fontFamily:F.mono}}>{m}</div><div style={{height:14,borderRadius:3,background:iS&&iH?`linear-gradient(135deg,${C.green} 50%,${C.orange} 50%)`:iS?C.green:iH?C.orange:C.bdr,opacity:(iS||iH)?1:.25}}/></div>})}</div><div style={{display:"flex",gap:12,marginTop:4}}><span style={{fontSize:10,color:C.green}}>■ Sow</span><span style={{fontSize:10,color:C.orange}}>■ Harvest</span></div></div>
          {sel.regionNote && <Card style={{marginBottom:12,background:C.tGreenBand,border:`1.5px solid ${C.tGreenBandBd}`}}><div style={SX.lblGreen}>{curRegion ? curRegion.emoji + " " : "🌍 "}Regional Note — {curRegion ? curRegion.name : "Your Region"}</div><div style={{fontSize:12,marginTop:4,lineHeight:1.5,color:C.text}}>{sel.regionNote}</div></Card>}
          {COMP[sel.name]&&<Card style={{marginBottom:12,background:C.tGreen}}><div style={SX.lblGreen}>🌱 Companions</div><div style={{fontSize:12,marginTop:4}}>✓ {COMP[sel.name].good.join(", ")||"—"}{COMP[sel.name].bad.length>0?<span style={{color:C.red}}> · ✕ {COMP[sel.name].bad.join(", ")}</span>:""}</div></Card>}
          <Card style={{marginBottom:12,background:C.tBlue}}><div style={{fontSize:12,fontWeight:700,color:C.blue}}>💧 Water</div><div style={SX.s13mt4}>{sel.waterNote}</div></Card>
          {sel.steps?.length>0&&<div style={SX.mb12}><div style={{fontSize:12,fontWeight:700,color:C.green,marginBottom:8}}>Step-by-Step Guide</div>{sel.steps.map((s,i)=><Card key={i} style={{marginBottom:4,padding:10}}><div style={{display:"flex",justifyContent:"space-between"}}><strong style={SX.s13}>{s.l}</strong><span style={{fontSize:10,color:C.t2,fontFamily:F.mono}}>Day {s.d}</span></div><div style={SX.t2_12mt2}>{s.t}</div></Card>)}</div>}
          {sel?.fert && <Card style={{marginBottom:12,background:C.tGreen}}><div style={SX.lblGreen}>🧪 Fertilizer</div><div style={{fontSize:12,marginTop:4,lineHeight:1.6}}>{sel.fert}</div></Card>}
          {sel?.pests&&sel.pests.length>0 && <Card style={{marginBottom:12,background:C.tOrange}}><div style={{fontSize:12,fontWeight:700,color:C.orange}}>🐛 Pests & Disease</div>{sel.pests.map(function(p,i){return <div key={i} style={{fontSize:12,marginTop:6}}><strong>{p.n}</strong>{p.t&&<div style={SX.t2_11mt2}>→ {p.t}</div>}</div>;})}</Card>}
          {sel.storage&&<Card style={{marginBottom:12,background:C.tYellow}}><div style={{fontSize:12,fontWeight:700,color:C.yellow}}>📦 Storage</div><div style={SX.s13mt4}>{sel.storage}</div></Card>}
          <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(sel.name+" growing guide complete")}`} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,color:C.red,textDecoration:"none",fontWeight:600,padding:"8px 14px",background:C.tPink,borderRadius:C.rs,border:`1px solid ${C.bdr}`,marginBottom:12}}>▶ Watch: Complete {sel.name} Growing Guide</a>
        </Overlay>}
      </>}

      {tab==="animals"&&<>
        <div style={{display:"grid",gap:8}}>{Object.entries(LDB).map(([n,db])=><Card key={n} onClick={()=>setSel({...db,name:n})} style={{cursor:"pointer"}}><div style={SX.rowCenterG10}><span style={{fontSize:28}}>{db.e}</span><div style={SX.flex1}><strong style={{fontSize:15}}>{n}</strong><div style={SX.t2_12}>Produces: {db.prod.join(", ")}</div></div><span style={{color:C.t3}}>›</span></div></Card>)}</div>
        {sel?.feed&&<Overlay title={`${sel.e} ${sel.name}`} onClose={()=>setSel(null)} wide>
          {[{i:"🍽",t:"Feeding",v:sel.feed},{i:"🏠",t:"Housing",v:sel.house},{i:"😴",t:"Sleep",v:sel.sleep},{i:"💕",t:"Breeding",v:sel.breed}].map(s=><Card key={s.t} style={{marginBottom:8}}><div style={SX.lblGreen}>{s.i} {s.t}</div><div style={{fontSize:13,lineHeight:1.7,marginTop:4}}>{s.v}</div></Card>)}
          <Card style={{background:C.tPink,marginBottom:8}}><div style={{fontSize:12,fontWeight:700,color:C.red}}>🩹 Injuries</div>{sel.inj.map((j,i)=><div key={i} style={{marginTop:6}}><strong>{j.n}</strong><div style={SX.t2_12}>{j.t}</div></div>)}</Card>
          {getRegionalCalendar(sel.name, data.region)&&<Card style={{marginBottom:8}}><div style={{fontSize:12,fontWeight:700,color:C.blue,marginBottom:8}}>📅 Monthly Calendar</div>{Object.entries(getRegionalCalendar(sel.name, data.region)).map(([m,t])=><div key={m} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.bdr}`}}><span style={{fontSize:11,fontWeight:700,color:C.green,width:28,flexShrink:0,fontFamily:F.mono}}>{m}</span><span style={{fontSize:11,color:C.t2,lineHeight:1.4}}>{t}</span></div>)}</Card>}
        </Overlay>}
      </>}

      {tab==="preserving"&&<Preserving embedded/>}
      {tab==="projects"&&<Projects embedded/>}
    </div>
  );
}


/* ═══════════════════════════════════════════
   PRESERVATION MANUAL PAGE
   ═══════════════════════════════════════════ */
function Preserving({embedded}) {
  const [sel, setSel] = useState(null);
  const [catFilter, setCatFilter] = useState("All");

  const items = Object.entries(PRESERVATION);
  const cats = ["All", ...new Set(items.map(([, r]) => r.cat))];
  const filtered = catFilter === "All" ? items : items.filter(([, r]) => r.cat === catFilter);

  const CAT_COLOR = {
    "Fermentation":             { bg: "#e8f5e9", c: "#2d6a4f", accent: "#52b788" },
    "Pickling":                 { bg: "#e3f2fd", c: "#1565c0", accent: "#42a5f5" },
    "Canning":                  { bg: "#fff8e1", c: "#e65100", accent: "#ffa726" },
    "Drying":                   { bg: "#fffde7", c: "#f57f17", accent: "#fdd835" },
    "Freezing":                 { bg: "#e8eaf6", c: "#3949ab", accent: "#7986cb" },
    "Cold Storage":             { bg: "#eceff1", c: "#37474f", accent: "#78909c" },
    "Oil Preservation":         { bg: "#f9fbe7", c: "#558b2f", accent: "#9ccc65" },
    "Dairy & Fermentation":     { bg: "#f3e5f5", c: "#6a1b9a", accent: "#ab47bc" },
    "Curing & Smoking":         { bg: "#fbe9e7", c: "#bf360c", accent: "#ff7043" },
    "Fermentation & Distilling":{ bg: "#fce4ec", c: "#880e4f", accent: "#ec407a" },
    "Apiary":                   { bg: "#fff8e1", c: "#f57f17", accent: "#ffca28" },
  };

  const DIFF_COLOR = { Easy: C.green, Intermediate: C.orange, Advanced: C.red, "Easy (once set up)": C.green, "Easy (with hive access)": C.green, "Intermediate–Advanced": C.orange, "Easy–Intermediate": "#27ae60" };

  const InfoBlock = ({ label, color, bg, children }) => (
    <div style={{ background: bg || "#f5f5f5", borderRadius: C.rs, padding: "12px 14px", marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: color || C.green, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>
      <div style={SX.bodyText}>{children}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 960 }}>
      {!embedded && <>
        <h2 style={{ fontFamily: F.head, fontSize: 28, margin: "0 0 4px" }}>🫙 Preservation Manual</h2>
        <p style={{ color: C.t2, fontSize: 14, margin: "0 0 16px" }}>
          Complete guide to every preservation method — ratios, science, safety, and troubleshooting
        </p>
      </>}

      {/* Category filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {cats.map(c => {
          const cc = CAT_COLOR[c] || { bg: C.gp, c: C.green };
          return (
            <button key={c} onClick={() => setCatFilter(c)} style={{
              padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
              background: catFilter === c ? (cc.accent || C.green) : C.card,
              color: catFilter === c ? "#fff" : C.t2,
              fontSize: 12, fontWeight: 600, boxShadow: catFilter === c ? "none" : C.sh,
              transition: "all .15s"
            }}>{c}</button>
          );
        })}
      </div>

      {/* Method cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 24 }}>
        {filtered.map(([key, r]) => {
          const cc = CAT_COLOR[r.cat] || { bg: "#f5f5f5", c: C.t2, accent: C.t3 };
          const dc = DIFF_COLOR[r.difficulty] || C.t2;
          return (
            <div key={key} onClick={() => setSel(r)} style={{
              background: C.card, borderRadius: C.r, boxShadow: C.sh, cursor: "pointer",
              borderLeft: `5px solid ${cc.accent}`, overflow: "hidden", transition: "box-shadow .15s",
              padding: "16px 16px 14px"
            }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}>{r.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{r.name}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap", alignItems: "center" }}>
                    <Pill sm c={cc.c} bg={cc.bg}>{r.cat}</Pill>
                    <Pill sm bg="#f5f5f5" c={dc}>{r.difficulty}</Pill>
                  </div>
                </div>
              </div>
              {/* Shelf life + teaser */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: C.t2 }}>📦 {r.shelf}</span>
                <span style={{ fontSize: 11, color: cc.c, fontWeight: 600 }}>Read manual →</span>
              </div>
              <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.5 }}>{r.overview.slice(0, 110)}…</div>
            </div>
          );
        })}
      </div>

      {/* Detail overlay — full manual page */}
      {sel && (() => {
        const cc = CAT_COLOR[sel.cat] || { bg: "#f5f5f5", c: C.t2, accent: C.t3 };
        const dc = DIFF_COLOR[sel.difficulty] || C.t2;
        return (
          <Overlay title="" onClose={() => setSel(null)} wide>
            {/* Hero header */}
            <div style={{ background: `linear-gradient(135deg, ${cc.accent}22, ${cc.bg})`, borderRadius: C.rs, padding: "20px 20px 16px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 44 }}>{sel.icon}</span>
                <div>
                  <h2 style={{ margin: 0, fontFamily: F.head, fontSize: 22, lineHeight: 1.2 }}>{sel.name}</h2>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <Pill c={cc.c} bg={cc.bg}>{sel.cat}</Pill>
                    <Pill bg={C.card} c={dc} border={dc}>{sel.difficulty === "Easy" || sel.difficulty.startsWith("Easy") ? "✓ " : sel.difficulty.startsWith("Advanced") ? "⚠ " : "◎ "}{sel.difficulty}</Pill>
                    <Pill bg={C.card} c={C.t2}>📦 {sel.shelf}</Pill>
                  </div>
                </div>
              </div>
            </div>

            {/* Overview */}
            <InfoBlock label="📖 Overview" color={cc.c} bg={cc.bg}>
              {sel.overview}
            </InfoBlock>

            {/* Ratio */}
            {sel.ratio && (
              <InfoBlock label="📏 Ratios & Quantities" color="#1565c0" bg="#e3f2fd">
                {sel.ratio}
              </InfoBlock>
            )}

            {/* What you need */}
            {sel.what_you_need && (
              <InfoBlock label="🛠 What You Need" color="#37474f" bg="#eceff1">
                {sel.what_you_need}
              </InfoBlock>
            )}

            {/* Method — full step-by-step */}
            <div style={{ background: C.card, border: `1px solid ${C.bdr}`, borderRadius: C.rs, padding: "14px 16px", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".04em" }}>
                👨‍🍳 Step-by-Step Method
              </div>
              {sel.method.split(/(?=\d+\. |SUN DRYING:|DEHYDRATOR:|OVEN:|BLANCHING:|FRESH WHITE|RICOTTA:|EQUILIBRIUM|COLD SMOKING|REST:|WINE:|VINEGAR:|POTATOES:|CARROTS|ONIONS|CABBAGE:|SQUASH|APPLES:|SAFE ITEMS|UNSAFE)/).map((step, i) => (
                step.trim() ? (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.bdr}` }}>
                    <div style={{ flex: 1, fontSize: 13, lineHeight: 1.65, color: C.text }}>{step.trim()}</div>
                  </div>
                ) : null
              ))}
            </div>

            {/* Best for */}
            {sel.best_for && (
              <InfoBlock label="✅ Best For" color={C.green} bg="#e8f5e9">
                {sel.best_for}
              </InfoBlock>
            )}

            {/* Storage */}
            <InfoBlock label="📦 Storage & Shelf Life" color="#6a1b9a" bg="#f3e5f5">
              {sel.storage}
            </InfoBlock>

            {/* Troubleshooting */}
            {sel.troubleshooting && (
              <InfoBlock label="🔧 Troubleshooting" color={C.orange} bg="#fff3e0">
                {sel.troubleshooting}
              </InfoBlock>
            )}

            {/* Science */}
            {sel.science && (
              <InfoBlock label="🔬 The Science" color="#1565c0" bg="#e3f2fd">
                {sel.science}
              </InfoBlock>
            )}

            {/* Tip */}
            {sel.tip && (
              <div style={{ background: "#f0f7f4", border: `1px solid ${C.gm}`, borderRadius: C.rs, padding: "12px 14px", marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 4 }}>💡 PRO TIP</div>
                <div style={SX.bodyText}>{sel.tip}</div>
              </div>
            )}

            {/* Video link */}
            <div style={{ marginTop: 6 }}>
            </div>
          </Overlay>
        );
      })()}
    </div>
  );
}


/* ═══════════════════════════════════════════
   SEASONAL PLANTING CALENDAR
   Location-aware "what to plant this month"
   ═══════════════════════════════════════════ */
export function SeasonalCalendar({data, setPage}) {
  const [month, setMonth] = useState(new Date().getMonth());
  const [filter, setFilter] = useState("sow"); // sow | harvest | all
  const [catFilter, setCatFilter] = useState("all");

  const isCurrentMonth = month === new Date().getMonth();
  const alreadyPlanted = data.garden.plots.filter(p => p.status !== "harvested").map(p => p.crop);

  const results = useMemo(() => {
    const sow = [], harvest = [], maintain = [];
    rCR(data.region).forEach(c => {
      const sowM = parseSowMonths(c.sowIn);
      const harM = parseHarvestMonths(c.harvest);
      const diff = getCropDifficulty(c.name);
      const planted = alreadyPlanted.includes(c.name);
      if (sowM.includes(month)) sow.push({...c, diff, planted, action: "sow"});
      if (harM.includes(month)) harvest.push({...c, diff, planted, action: "harvest"});
    });
    // Maintenance: crops planted that are growing during this month
    data.garden.plots.filter(p => p.status !== "harvested" && p.plantDate).forEach(p => {
      const crop = rCM(data.region).get(p.crop);
      if (!crop) return;
      const ds = daysBetweenLocalKeys(p.plantDate, new Date());
      const pendingSteps = (p.steps||[]).filter(s => !s.done && Math.abs(s.d - ds) <= 14);
      if (pendingSteps.length > 0) maintain.push({...crop, plot: p, pendingSteps, action: "maintain"});
    });
    return {sow, harvest, maintain};
  }, [month, data, alreadyPlanted]);

  const cats = useMemo(() => {
    const all = [...results.sow, ...results.harvest];
    return [...new Set(all.map(c => c.cat))].sort();
  }, [results]);

  const filtered = useMemo(() => {
    let items = filter === "sow" ? results.sow : filter === "harvest" ? results.harvest : [...results.sow, ...results.harvest];
    if (catFilter !== "all") items = items.filter(c => c.cat === catFilter);
    // Deduplicate by name for "all" view
    if (filter === "all") { const seen = new Set(); items = items.filter(c => { if (seen.has(c.name)) return false; seen.add(c.name); return true; }); }
    return items;
  }, [results, filter, catFilter]);

  const CropRow = ({c}) => (
    <Card style={{marginBottom:6, borderLeft:`4px solid ${c.color}`, opacity: c.planted ? 0.65 : 1}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:28}}>{c.emoji}</span>
        <div style={SX.flex1}>
          <div style={SX.rowCenterG6}>
            <span style={{fontSize:15,fontWeight:600}}>{c.name}</span>
            {c.planted && <Pill c={C.blue} bg="#e3f2fd">Already planted</Pill>}
          </div>
          <div style={SX.t2_12mt2}>{c.cat} · {c.days}d to harvest · {c.spacing}cm spacing</div>
          <div style={{display:"flex",gap:4,marginTop:4,flexWrap:"wrap"}}>
            <Pill sm c={c.diff.c} bg={c.diff.bg}>{c.diff.e} {c.diff.l}</Pill>
            <Pill sm c={C.blue} bg="#e3f2fd">☀ {c.sun}</Pill>
            <Pill sm c={C.green} bg="#e8f5e9">💧 {c.waterFreq}</Pill>
          </div>
        </div>
        {!c.planted && <Btn sm onClick={() => setPage("farm", {crop: c.name, plantDate: todayLocalKey()})}>+ Plant</Btn>}
      </div>
    </Card>
  );

  return (
    <div className="page-enter" style={SX.mw800}>
      <h2 style={{fontFamily:F.head,fontSize:30,margin:"0 0 4px",letterSpacing:"-0.03em",fontWeight:800}}>🗓 Seasonal Calendar</h2>
      <p style={{color:C.t2,fontSize:13,margin:"0 0 16px",fontWeight:500}}>What to plant and harvest each month — tailored to your farm</p>

      {/* Month selector */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
        <button onClick={() => setMonth(m => m === 0 ? 11 : m-1)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.t2}}>‹</button>
        <div style={{display:"flex",gap:4,flex:1,justifyContent:"center",flexWrap:"wrap"}}>
          {MN_ABR.map((m,i) => (
            <button key={i} onClick={() => setMonth(i)} style={{
              padding:"6px 10px",borderRadius:20,border:"none",fontSize:12,fontWeight:month===i?700:500,cursor:"pointer",
              background:month===i?C.green:i===new Date().getMonth()?"#d8f3dc":"transparent",
              color:month===i?"#fff":C.text,
            }}>{m}</button>
          ))}
        </div>
        <button onClick={() => setMonth(m => m === 11 ? 0 : m+1)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.t2}}>›</button>
      </div>

      {/* Summary stats */}
      <div className="g3" style={{gap:10,marginBottom:16}}>
        <Stat label="Sow This Month" value={results.sow.length} sub={`${results.sow.filter(c=>!c.planted).length} new options`} color={C.green}/>
        <Stat label="Harvest" value={results.harvest.length} sub="crops in season" color={C.orange}/>
        <Stat label="Maintain" value={results.maintain.length} sub="steps due" color={C.blue}/>
      </div>

      {/* Filter tabs */}
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {[{id:"sow",l:"🌱 Sow",n:results.sow.length},{id:"harvest",l:"🧺 Harvest",n:results.harvest.length},{id:"all",l:"📋 All",n:0}].map(t => (
          <button key={t.id} onClick={() => setFilter(t.id)} style={{
            padding:"7px 16px",borderRadius:20,border:filter===t.id?"none":`1.5px solid ${C.bdr}`,
            background:filter===t.id?C.green:C.card,color:filter===t.id?"#fff":C.t2,
            fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:F.body
          }}>{t.l}{t.n > 0 ? ` (${t.n})` : ""}</button>
        ))}
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{marginLeft:"auto",padding:"6px 12px",borderRadius:20,border:`1.5px solid ${C.bdr}`,fontSize:12,fontFamily:F.body,color:C.t2,background:C.card}}>
          <option value="all">All categories</option>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Beginner tip */}
      {isCurrentMonth && filter === "sow" && (
        <Card style={{marginBottom:12,background:C.tGreen2,border:`1px solid ${C.gm}`}}>
          <div style={{fontSize:12,fontWeight:700,color:C.green,marginBottom:4}}>💡 New to farming?</div>
          <div style={{fontSize:13,lineHeight:1.6}}>Start with 🟢 Easy crops this month. They're forgiving, grow fast, and build your confidence. Radishes are ready in 25 days — plant a row today and you'll be harvesting in less than a month.</div>
        </Card>
      )}

      {/* Crop list */}
      {filtered.length === 0
        ? <Card style={{textAlign:"center",padding:"56px 24px",background:C.grdWarm}}><div style={SX.emptyIcon}>🌾</div><div style={SX.s15Bold}>Quiet month</div><div style={{color:C.t2,marginTop:6,fontSize:12.5}}>Nothing to {filter} in {MN_FULL[month]} — try a different filter</div></Card>
        : filtered.map(c => <CropRow key={c.name + c.action} c={c}/>)
      }

      {/* Maintenance section */}
      {filter === "sow" && results.maintain.length > 0 && (
        <div style={{marginTop:20}}>
          <div style={{fontSize:15,fontWeight:700,fontFamily:F.head,marginBottom:10}}>🔧 Maintenance Due This Month</div>
          {results.maintain.map((c, i) => (
            <Card key={i} style={{marginBottom:6,borderLeft:`3px solid ${C.blue}`}}>
              <div style={SX.rowCenterG10}>
                <span style={SX.s20}>{c.emoji}</span>
                <div style={SX.flex1}>
                  <div style={{fontSize:14,fontWeight:600}}>{c.plot.name || c.name}</div>
                  {c.pendingSteps.map((s,j) => <div key={j} style={SX.t2_12mt2}>→ {s.l}: {s.t}</div>)}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   DIY PROJECTS & INFRASTRUCTURE
   Track builds, materials, costs, maintenance
   ═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   BLUEPRINT — full-image manual page per project
   Each manual is a single illustrated PNG in /public/manuals/.
   ═══════════════════════════════════════════ */

function Blueprint({type}) {
  const src = BLUEPRINT_IMAGES[type];
  if (!src) return null;
  return (
    <div style={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:C.rs,padding:"12px",marginBottom:12}}>
      <div style={{fontSize:10,fontWeight:700,color:C.t2,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>📐 Step-by-Step Blueprint</div>
      <img
        src={src}
        alt={`${type} build manual`}
        loading="lazy"
        style={{width:"100%",height:"auto",display:"block",borderRadius:C.rs}}
      />
    </div>
  );
}

function Projects({embedded}) {
  const [selKey, setSelKey] = useState(null);
  const [catFilter, setCatFilter] = useState("all");
  const items = Object.entries(PROJECT_GUIDES);
  const cats = [...new Set(items.map(([,r]) => r.cat))].sort();
  const filtered = catFilter === "all" ? items : items.filter(([,r]) => r.cat === catFilter);
  const sel = selKey ? PROJECT_GUIDES[selKey] : null;

  const CAT_COLOR = {
    "Growing":        { bg: "#e8f5e9", c: "#2e7d32", accent: "#66bb6a" },
    "Animals":        { bg: "#fff3e0", c: "#e65100", accent: "#ffa726" },
    "Soil":           { bg: "#efebe9", c: "#4e342e", accent: "#8d6e63" },
    "Water":          { bg: "#e3f2fd", c: "#1565c0", accent: "#42a5f5" },
    "Infrastructure": { bg: "#eceff1", c: "#37474f", accent: "#78909c" },
  };
  const DIFF_COLOR = { Easy: C.green, Intermediate: C.orange, Advanced: C.red };

  const InfoBlock = ({ label, color, bg, children }) => (
    <div style={{ background: bg || "#f5f5f5", borderRadius: C.rs, padding: "12px 14px", marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: color || C.green, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>
      <div style={SX.bodyText}>{children}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 960 }}>
      {!embedded && <>
        <h2 style={{ fontFamily: F.head, fontSize: 28, margin: "0 0 4px" }}>🔨 DIY Project Guides</h2>
        <p style={{ color: C.t2, fontSize: 14, margin: "0 0 16px" }}>
          Step-by-step build manuals with materials, methods, and maintenance — sourced from proven homesteading guides
        </p>
      </>}

      {/* Category filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={() => setCatFilter("all")} style={{ padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", background: catFilter === "all" ? C.green : C.card, color: catFilter === "all" ? "#fff" : C.t2, fontSize: 12, fontWeight: 600, boxShadow: catFilter === "all" ? "none" : C.sh }}>All</button>
        {cats.map(c => {
          const cc = CAT_COLOR[c] || { accent: C.green };
          return <button key={c} onClick={() => setCatFilter(c)} style={{ padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", background: catFilter === c ? (cc.accent) : C.card, color: catFilter === c ? "#fff" : C.t2, fontSize: 12, fontWeight: 600, boxShadow: catFilter === c ? "none" : C.sh }}>{c}</button>;
        })}
      </div>

      {/* Project cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 24 }}>
        {filtered.map(([key, r]) => {
          const cc = CAT_COLOR[r.cat] || { bg: "#f5f5f5", c: C.t2, accent: C.t3 };
          const dc = DIFF_COLOR[r.difficulty] || C.t2;
          return (
            <div key={key} onClick={() => setSelKey(key)} style={{ background: C.card, borderRadius: C.r, boxShadow: C.sh, cursor: "pointer", borderLeft: `5px solid ${cc.accent}`, padding: "16px 16px 14px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}>{r.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{r.name}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                    <Pill sm c={cc.c} bg={cc.bg}>{r.cat}</Pill>
                    <Pill sm bg="#f5f5f5" c={dc}>{r.difficulty}</Pill>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: C.t2 }}>⏱ {r.time} · 💰 {r.cost}</span>
                <span style={{ fontSize: 11, color: cc.c, fontWeight: 600 }}>Read guide →</span>
              </div>
              <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.5 }}>{r.overview.slice(0, 120)}…</div>
            </div>
          );
        })}
      </div>

      {/* Detail overlay — full manual page */}
      {sel && (() => {
        const cc = CAT_COLOR[sel.cat] || { bg: "#f5f5f5", c: C.t2, accent: C.t3 };
        const dc = DIFF_COLOR[sel.difficulty] || C.t2;
        return (
          <Overlay title="" onClose={() => setSelKey(null)} wide>
            <div style={{ background: `linear-gradient(135deg, ${cc.accent}22, ${cc.bg})`, borderRadius: C.rs, padding: "20px 20px 16px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 44 }}>{sel.icon}</span>
                <div>
                  <h2 style={{ margin: 0, fontFamily: F.head, fontSize: 22, lineHeight: 1.2 }}>{sel.name}</h2>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <Pill c={cc.c} bg={cc.bg}>{sel.cat}</Pill>
                    <Pill bg={C.card} c={dc} border={dc}>{sel.difficulty === "Easy" ? "✓ " : "◎ "}{sel.difficulty}</Pill>
                    <Pill bg={C.card} c={C.t2}>⏱ {sel.time}</Pill>
                    <Pill bg={C.card} c={C.t2}>💰 {sel.cost}</Pill>
                  </div>
                </div>
              </div>
              {sel.ref && <div style={{ fontSize: 11, color: cc.c, marginTop: 10, fontStyle: "italic", opacity: 0.7 }}>📚 {sel.ref}</div>}
            </div>

            <InfoBlock label="📖 Overview" color={cc.c} bg={cc.bg}>{sel.overview}</InfoBlock>
            <Blueprint type={selKey}/>
            <InfoBlock label="🛠 Materials & Tools" color="#37474f" bg="#eceff1">{sel.materials}</InfoBlock>

            <div style={{ background: C.card, border: `1px solid ${C.bdr}`, borderRadius: C.rs, padding: "14px 16px", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".04em" }}>🔧 Step-by-Step Method</div>
              {sel.method.split(/(?=\d+\. )/).map((step, i) => (
                step.trim() ? <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.bdr}` }}><div style={{ flex: 1, fontSize: 13, lineHeight: 1.65, color: C.text }}>{step.trim()}</div></div> : null
              ))}
            </div>

            <InfoBlock label="🔧 Ongoing Maintenance" color={C.orange} bg="#fff3e0">{sel.maintenance}</InfoBlock>

            {sel.tip && (
              <div style={{ background: "#f0f7f4", border: `1px solid ${C.gm}`, borderRadius: C.rs, padding: "12px 14px", marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 4 }}>💡 PRO TIP</div>
                <div style={SX.bodyText}>{sel.tip}</div>
              </div>
            )}
          </Overlay>
        );
      })()}
    </div>
  );
}

export default Manuals;
