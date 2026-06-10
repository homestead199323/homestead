/* ═══════════════════════════════════════════
   ONBOARDING — Phase 7 (2026-05-15)
   4-screen story intro. Shows on first visit and after data reset.
   Trigger: !data.setupDone && data.zones.length === 0
   ═══════════════════════════════════════════ */
import { useState, useMemo } from "react";
import { C, F } from "../../lib/theme";
import { REGIONS } from "../../data/regions";
import { CROPS } from "../../data/crops";
import { CROP_DIFFICULTY, parseSowMonths } from "../../lib/calendar";
import { getRegionalCrop } from "../../lib/regional";
import { uid } from "../../lib/storage";
import { todayLocalKey, addDaysToLocalKey } from "../../lib/utils";

/* ─── Constants ─────────────────────────────────────────── */
const ZONE_TYPES = [
  { id:"veg",     label:"Vegetable Bed",  emoji:"🌿", desc:"Great for crops that grow in soil",     areaM2:{ small:2, medium:6, large:12 } },
  { id:"raised",  label:"Raised Bed",     emoji:"🪴", desc:"Controlled soil, good drainage",        areaM2:{ small:1, medium:2, large:4  } },
  { id:"contain", label:"Containers",     emoji:"🪣", desc:"Pots and planters on patios/balconies", areaM2:{ small:0.5, medium:1, large:2 } },
  { id:"orchard", label:"Orchard/Trees",  emoji:"🍎", desc:"Fruit trees and perennial shrubs",      areaM2:{ small:4, medium:12, large:24 } },
];

const SIZES = [
  { id:"small",  label:"Small",  sub:"Just getting started" },
  { id:"medium", label:"Medium", sub:"Room to experiment"   },
  { id:"large",  label:"Large",  sub:"Serious growing space" },
];

const CONTAINER_FRIENDLY = ["Basil","Mint","Radish","Lettuce","Spinach","Strawberry","Tomato","Pepper (Sweet)","Swiss Chard"];
const BEGINNER_PRIORITY  = ["Radish","Lettuce","Spinach","Basil","Mint","Kale","Pea","Zucchini","Strawberry","Swiss Chard","Bean (Dry)","Broad Bean"];

/* ─── Shared styles ──────────────────────────────────────── */
const S = {
  overlay: {
    position:"fixed", inset:0, zIndex:1000,
    background:C.bg, display:"flex", flexDirection:"column",
    fontFamily:F.body, overflowY:"auto",
  },
  inner: {
    flex:1, display:"flex", flexDirection:"column",
    maxWidth:520, width:"100%", margin:"0 auto",
    padding:"32px 24px 48px", minHeight:"100vh", boxSizing:"border-box",
  },
  progress: { display:"flex", gap:6, marginBottom:32 },
  dot: function(active, done) {
    return {
      flex:1, height:4, borderRadius:2,
      background: done ? C.green : active ? C.green : C.bdr,
      opacity: done ? 0.5 : 1, transition:"background .3s, opacity .3s",
    };
  },
  heading: {
    fontFamily:F.head, fontSize:28, fontWeight:800,
    color:C.text, letterSpacing:"-0.03em", margin:"0 0 8px",
  },
  sub: { fontSize:15, color:C.t2, margin:"0 0 24px", lineHeight:1.5 },
  selCard: function(active) {
    return {
      display:"flex", alignItems:"flex-start", gap:14,
      padding:"14px 16px", borderRadius:14,
      border:"2px solid " + (active ? C.green : C.bdr),
      background: active ? C.gp : C.card,
      cursor:"pointer", transition:"all .15s",
      marginBottom:10, textAlign:"left",
      width:"100%", boxSizing:"border-box",
    };
  },
  cardEmoji: { fontSize:24, lineHeight:1, flexShrink:0, marginTop:2 },
  cardLabel: { fontSize:15, fontWeight:700, color:C.text, marginBottom:2 },
  cardDesc:  { fontSize:12, color:C.t2 },
  chip: function(active) {
    return {
      flex:1, padding:"10px 0", borderRadius:12, textAlign:"center",
      border:"2px solid " + (active ? C.green : C.bdr),
      background: active ? C.gp : C.card,
      color: active ? C.green : C.text,
      fontWeight: active ? 700 : 500,
      fontSize:14, cursor:"pointer", transition:"all .15s",
    };
  },
  inp: {
    width:"100%", padding:"12px 14px", borderRadius:10,
    border:"1.5px solid " + C.bdr, background:C.card,
    fontSize:15, fontFamily:F.body, color:C.text,
    outline:"none", boxSizing:"border-box", marginTop:6,
  },
  label: { fontSize:11, fontWeight:700, color:C.t2, textTransform:"uppercase", letterSpacing:"0.07em" },
  btnPrimary: function(enabled) {
    return {
      width:"100%", padding:"15px 0", borderRadius:14,
      background: enabled ? C.green : C.bdr,
      color:"#fff", border:"none",
      fontSize:16, fontWeight:700, fontFamily:F.body,
      cursor: enabled ? "pointer" : "default",
      marginTop:8, letterSpacing:"0.01em",
      transition:"background .2s",
    };
  },
  btnBack: {
    background:"transparent", border:"none", color:C.t2,
    fontSize:13, cursor:"pointer", padding:"10px 0",
    fontFamily:F.body, width:"100%", marginTop:4,
  },
  cropCard: function(active) {
    return {
      display:"flex", flexDirection:"column", alignItems:"center",
      padding:"14px 8px 12px", borderRadius:14,
      border:"2px solid " + (active ? C.green : C.bdr),
      background: active ? C.gp : C.card,
      cursor:"pointer", transition:"all .15s", position:"relative",
      textAlign:"center",
    };
  },
  checkBadge: {
    position:"absolute", top:6, right:6,
    width:18, height:18, borderRadius:9,
    background:C.green, color:"#fff",
    fontSize:10, fontWeight:800,
    display:"flex", alignItems:"center", justifyContent:"center",
  },
};

/* ─── Screen 1 — Welcome ─────────────────────────────────── */
function ScreenWelcome({ onNext, onSkip }) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",paddingTop:24}}>
      <div style={{fontSize:72,marginBottom:24}}>🌱</div>
      <h1 style={{...S.heading, fontSize:32, textAlign:"center", marginBottom:12}}>Welcome to MyTerra</h1>
      <p style={{...S.sub, textAlign:"center", fontSize:16, maxWidth:340, marginBottom:40}}>
        A farm game simulator running on real life.<br/>
        Let's set up your farm in under 60 seconds.
      </p>
      <button style={S.btnPrimary(true)} onClick={onNext}>Get started</button>
      <button style={S.btnBack} onClick={onSkip}>Skip — I'll set up manually</button>
    </div>
  );
}

/* ─── Screen 2 — Region + city ───────────────────────────── */
function ScreenRegion({ region, setRegion, city, setCity, onNext, onBack }) {
  return (
    <>
      <h2 style={S.heading}>Where do you grow?</h2>
      <p style={S.sub}>This shapes your crop calendar, planting windows, and advice.</p>
      <div style={{marginBottom:20}}>
        {REGIONS.map(function(r) {
          var active = region === r.id;
          return (
            <button key={r.id} style={S.selCard(active)} onClick={function(){ setRegion(r.id); }}>
              <span style={S.cardEmoji}>{r.emoji}</span>
              <div>
                <div style={S.cardLabel}>{r.name}</div>
                <div style={S.cardDesc}>{r.examples}</div>
              </div>
            </button>
          );
        })}
      </div>
      <div style={{marginBottom:28}}>
        <div style={S.label}>Your nearest town or city <span style={{textTransform:"none",fontWeight:400,opacity:.7}}>(optional)</span></div>
        <input
          style={S.inp}
          placeholder="e.g. Bristol, Amsterdam, Portland…"
          value={city}
          onChange={function(e){ setCity(e.target.value); }}
        />
        <div style={{fontSize:11,color:C.t3,marginTop:4}}>Used for weather forecasts only. Never shared.</div>
      </div>
      <button style={S.btnPrimary(true)} onClick={onNext}>Continue</button>
      <button style={S.btnBack} onClick={onBack}>← Back</button>
    </>
  );
}

/* ─── Screen 3 — Farm sketch ─────────────────────────────── */
function ScreenFarm({ zoneType, setZoneType, zoneSize, setZoneSize, onNext, onBack }) {
  var activeZT = ZONE_TYPES.find(function(z){ return z.id === zoneType; }) || ZONE_TYPES[0];
  return (
    <>
      <h2 style={S.heading}>Your growing space</h2>
      <p style={S.sub}>Pick your main area. You can add more zones later from the Map (Edit Layout).</p>
      <div style={{marginBottom:4}}>
        <div style={S.label}>What kind of space?</div>
        <div style={{marginTop:8}}>
          {ZONE_TYPES.map(function(z) {
            var active = zoneType === z.id;
            return (
              <button key={z.id} style={S.selCard(active)} onClick={function(){ setZoneType(z.id); }}>
                <span style={S.cardEmoji}>{z.emoji}</span>
                <div>
                  <div style={S.cardLabel}>{z.label}</div>
                  <div style={S.cardDesc}>{z.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div style={{marginBottom:28}}>
        <div style={S.label}>Roughly how big?</div>
        <div style={{display:"flex",gap:8,marginTop:8}}>
          {SIZES.map(function(sz) {
            var active = zoneSize === sz.id;
            var m2 = activeZT.areaM2[sz.id];
            return (
              <button key={sz.id} style={S.chip(active)} onClick={function(){ setZoneSize(sz.id); }}>
                <div>{sz.label}</div>
                <div style={{fontSize:11,color:active?C.green:C.t3,fontWeight:400,marginTop:2}}>{m2} m²</div>
              </button>
            );
          })}
        </div>
      </div>
      <button style={S.btnPrimary(true)} onClick={onNext}>Continue</button>
      <button style={S.btnBack} onClick={onBack}>← Back</button>
    </>
  );
}

/* ─── Screen 4 — Pick first plants ──────────────────────── */
function ScreenPlants({ region, zoneType, selected, setSelected, onFinish, onBack }) {
  var currentMonth = new Date().getMonth();

  var list = useMemo(function() {
    var easyNames = CROP_DIFFICULTY.easy;
    var candidates = CROPS
      .filter(function(c) {
        if (!easyNames.includes(c.name)) return false;
        var regional = getRegionalCrop(c, region);
        if (!regional) return false;
        var sowMonths = parseSowMonths(regional.sowIn || c.sowIn);
        var inWindow = sowMonths.some(function(m) {
          var diff = Math.abs(m - currentMonth);
          return diff <= 2 || diff >= 10;
        });
        if (!inWindow) return false;
        if (zoneType === "contain" && !CONTAINER_FRIENDLY.includes(c.name)) return false;
        return true;
      })
      .sort(function(a, b) {
        var ai = BEGINNER_PRIORITY.indexOf(a.name);
        var bi = BEGINNER_PRIORITY.indexOf(b.name);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      })
      .slice(0, 9);

    // Fallback if off-season — show top easy crops regardless
    if (candidates.length < 3) {
      return CROPS
        .filter(function(c){ return CROP_DIFFICULTY.easy.includes(c.name); })
        .sort(function(a, b) {
          var ai = BEGINNER_PRIORITY.indexOf(a.name);
          var bi = BEGINNER_PRIORITY.indexOf(b.name);
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        })
        .slice(0, 6);
    }
    return candidates;
  }, [region, zoneType, currentMonth]);

  function toggle(name) {
    setSelected(function(prev) {
      if (prev.includes(name)) return prev.filter(function(n){ return n !== name; });
      if (prev.length >= 3) return prev;
      return [...prev, name];
    });
  }

  var canFinish = selected.length > 0;

  return (
    <>
      <h2 style={S.heading}>Pick your first plants</h2>
      <p style={S.sub}>Forgiving choices for your region and the time of year. Pick up to 3.</p>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
        {list.map(function(c) {
          var active = selected.includes(c.name);
          return (
            <button key={c.name} style={S.cropCard(active)} onClick={function(){ toggle(c.name); }}>
              {active && <span style={S.checkBadge}>✓</span>}
              <span style={{fontSize:28,marginBottom:6,display:"block"}}>{c.emoji}</span>
              <span style={{fontSize:12,fontWeight:700,color:C.text,lineHeight:1.3,display:"block"}}>{c.name}</span>
              <span style={{fontSize:10,color:C.t3,marginTop:2,display:"block"}}>{c.days}d</span>
            </button>
          );
        })}
      </div>

      {selected.length === 3 && (
        <div style={{fontSize:12,color:C.green,fontWeight:600,textAlign:"center",marginBottom:8}}>
          3 selected — deselect one to swap
        </div>
      )}

      <button style={S.btnPrimary(canFinish)} onClick={canFinish ? onFinish : undefined}>
        {canFinish ? "Start farming 🌱" : "Select at least one plant"}
      </button>
      <button style={S.btnBack} onClick={onBack}>← Back</button>
    </>
  );
}

/* ─── Main export ────────────────────────────────────────── */
export default function Onboarding({ onComplete }) {
  var [step, setStep] = useState(0);
  var [region, setRegion] = useState("western_europe");
  var [city, setCity] = useState("");
  var [zoneType, setZoneType] = useState("veg");
  var [zoneSize, setZoneSize] = useState("medium");
  var [selected, setSelected] = useState([]);

  function handleSkip() {
    onComplete({ region:"western_europe", city:"", zones:[], garden:{plots:[]}, setupDone:false });
  }

  function handleFinish() {
    var zt = ZONE_TYPES.find(function(z){ return z.id === zoneType; }) || ZONE_TYPES[0];
    var areaM2 = zt.areaM2[zoneSize];
    var today = todayLocalKey();
    var zoneId = uid();

    // Derive map-placement dimensions from areaM2 so Setup can render the zone
    // on the canvas. Without xM/yM/wM/hM the zone exists in data but is
    // invisible on the farm map (0m × 0m). Shape is slightly rectangular
    // (1.5:1 aspect), placed near the top-left of the default 100×60m farm.
    var wM = Math.max(1, Math.round(Math.sqrt(areaM2 * 1.5) * 10) / 10);
    var hM = Math.max(1, Math.round((areaM2 / wM) * 10) / 10);
    var xM = 4; // 4m in from left edge of default 100m farm (clear of safe inset)
    var yM = 4; // 4m down from top edge of default 60m farm

    var zone = {
      id:zoneId, name:zt.label, emoji:zt.emoji,
      type:zoneType, areaM2:areaM2, soilType:"loam", notes:"",
      xM:xM, yM:yM, wM:wM, hM:hM,
    };

    var plots = selected.map(function(cropName) {
      var crop = CROPS.find(function(c){ return c.name === cropName; });
      var rc   = getRegionalCrop(crop, region) || crop;
      var sp   = (rc.spacing || 30) / 100;
      var plotShare = areaM2 / selected.length;
      var plantCount = Math.min(Math.max(1, Math.floor(plotShare / (sp * sp))), 20);
      // Field names MUST match the canonical plot shape created in
      // Farm.jsx (crop / plantDate / zone / status / plantCount / qty /
      // measureType). The original onboarding wrote cropName / plantedDate /
      // zoneId / plants, which no consumer (task-queue, TodayScreen, Farm)
      // recognised — plots existed but generated no tasks, no growth, no yield.
      return {
        id: uid(),
        zone: zoneId,
        crop: cropName,
        variety: "",
        name: cropName,
        plantDate: today,
        harvestDate: addDaysToLocalKey(today, rc.days || crop.days || 60),
        status: "planted",
        plantCount: plantCount,
        qty: plantCount,
        measureType: "plants",
        expectedYieldKg: Math.round((rc.yld || crop.yld || 1) * plantCount / 4 * 10) / 10,
        varietyNote: "",
        notes: "",
        steps: (rc.steps || crop.steps || []).map(function(s){ return {...s, done:false}; }),
      };
    });

    onComplete({
      region,
      city: city.trim(),
      zones: [zone],
      garden: { plots },
      // Starter canvas sized to the zone (resizable later in Map › Edit
      // Layout). Without this the map falls back to the 100×60 m default
      // and a 6 m² starter bed renders as a barely-visible speck.
      farmW: Math.max(16, Math.ceil(xM + wM + 8)),
      farmH: Math.max(10, Math.ceil(yM + hM + 6)),
      setupDone: true,
    });
  }

  var screens = [
    <ScreenWelcome  key="w" onNext={function(){ setStep(1); }} onSkip={handleSkip}/>,
    <ScreenRegion   key="r" region={region} setRegion={setRegion} city={city} setCity={setCity}
                    onNext={function(){ setStep(2); }} onBack={function(){ setStep(0); }}/>,
    <ScreenFarm     key="f" zoneType={zoneType} setZoneType={setZoneType}
                    zoneSize={zoneSize} setZoneSize={setZoneSize}
                    onNext={function(){ setStep(3); }} onBack={function(){ setStep(1); }}/>,
    <ScreenPlants   key="p" region={region} zoneType={zoneType}
                    selected={selected} setSelected={setSelected}
                    onFinish={handleFinish} onBack={function(){ setStep(2); }}/>,
  ];

  return (
    <div style={S.overlay}>
      <div style={S.inner}>
        {step > 0 && (
          <div style={S.progress}>
            {[1,2,3].map(function(i){
              return <div key={i} style={S.dot(step===i, step>i)}/>;
            })}
          </div>
        )}
        {screens[step]}
      </div>
    </div>
  );
}
