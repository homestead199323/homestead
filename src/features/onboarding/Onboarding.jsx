/* ═══════════════════════════════════════════
   ONBOARDING — Launch Stage 3 (2026-07-14)
   12-step flow (+ welcome). Every answer is written to data.profile
   (onboardingVersion 2) and consumed by suggestion logic (src/lib/suggest.js)
   and starter-map generation. Finishes on a populated Today screen —
   plots created here generate tasks via buildTaskQueue.
   Trigger: !data.setupDone && data.zones.length === 0
   ═══════════════════════════════════════════ */
import { useState, useMemo } from "react";
import { C, F } from "../../lib/theme";
import { REGIONS } from "../../data/regions";
import { CROPS } from "../../data/crops";
import { getRegionalCrop } from "../../lib/regional";
import { uid } from "../../lib/storage";
import FarmIcon from "../../components/FarmIcon";
import { todayLocalKey, addDaysToLocalKey } from "../../lib/utils";
import { suggestCrops, buildStarterZone, buildSevenDayPlan, toNum, ftToM, r1 } from "../../lib/suggest";

/* ─── Option constants ──────────────────────────────────── */
const ENVIRONMENTS = [
  { id:"balcony",  label:"Balcony / Patio", emoji:"🏙️", desc:"Pots and planters on a balcony, terrace or patio" },
  { id:"backyard", label:"Backyard / Garden", emoji:"🏡", desc:"A yard or garden with soil or raised beds" },
  { id:"farm",     label:"Smallholding / Farm", emoji:"🌾", desc:"A field, allotment or larger piece of land" },
];

const COVERED_OPTS = [
  { id:"no",     label:"Open sky" },
  { id:"partly", label:"Partly covered" },
  { id:"yes",    label:"Fully covered" },
];

const SUN_HOURS = [
  { id:"lt3",    label:"Under 3h",  sub:"Mostly shade" },
  { id:"3to5",   label:"3–5h",      sub:"Part sun" },
  { id:"5to7",   label:"5–7h",      sub:"Good sun" },
  { id:"gt7",    label:"7h+",       sub:"Full sun" },
  { id:"unsure", label:"Not sure",  sub:"We'll assume average" },
];

const SUN_DIRS = [
  { id:"morning",   label:"Morning" },
  { id:"afternoon", label:"Afternoon" },
  { id:"allday",    label:"All day" },
  { id:null,        label:"Not sure" },
];

const GOALS = [
  { id:"fresh_food",       label:"Fresh food on the table", emoji:"🥗" },
  { id:"save_money",       label:"Save money on groceries", emoji:"💶" },
  { id:"relax",            label:"Hobby & relaxation",      emoji:"🧘" },
  { id:"kids",             label:"Grow with my kids",       emoji:"🧒" },
  { id:"self_sufficiency", label:"Self-sufficiency",        emoji:"🏕️" },
  { id:"sustainability",   label:"Live more sustainably",   emoji:"♻️" },
];

const EXPERIENCE_LEVELS = [
  { id:"beginner",  label:"Total beginner",   emoji:"🌱", desc:"Never grown anything (or it died)" },
  { id:"some",      label:"Some experience",  emoji:"🌿", desc:"Kept a few plants or herbs alive" },
  { id:"confident", label:"Confident grower", emoji:"🌳", desc:"Grown food successfully before" },
  { id:"expert",    label:"Very experienced", emoji:"🚜", desc:"I know my way around a garden" },
];

const TIME_BUDGETS = [
  { id:"min5",      label:"5 min a day",      emoji:"⏱️", desc:"Quick daily check-ins" },
  { id:"min15",     label:"15 min a day",     emoji:"⏲️", desc:"A short daily routine" },
  { id:"weekly",    label:"Weekends only",    emoji:"📅", desc:"One or two longer sessions a week" },
  { id:"daily",     label:"30–60 min a day",  emoji:"🕐", desc:"Gardening is part of my day" },
  { id:"unlimited", label:"As much as it takes", emoji:"🌞", desc:"This is my main project" },
];

const PEOPLE_OPTS = [
  { id:1, label:"1" }, { id:2, label:"2" }, { id:3, label:"3" },
  { id:4, label:"4" }, { id:5, label:"5+" },
];

const USE_OPTS = [
  { id:"cook",     label:"Cook it fresh",    emoji:"🍳" },
  { id:"preserve", label:"Preserve & store", emoji:"🫙" },
  { id:"share",    label:"Share & give away",emoji:"🎁" },
];

const DISLIKE_OPTS = [
  "Tomato","Kale","Spinach","Radish","Beetroot","Zucchini",
  "Cabbage","Onion","Broccoli","Eggplant","Mint","Strawberry",
];

const ASSET_OPTS = [
  { id:"containers",  label:"Pots & containers", emoji:"🪣" },
  { id:"raised_bed",  label:"Raised bed(s)",     emoji:"🪴" },
  { id:"greenhouse",  label:"Greenhouse",        emoji:"🏠" },
  { id:"fruit_trees", label:"Fruit trees",       emoji:"🍎" },
  { id:"coop",        label:"Chicken coop",      emoji:"🐔" },
  { id:"compost",     label:"Compost bin",       emoji:"🪱" },
  { id:"tools",       label:"Basic tools",       emoji:"🧰" },
  { id:"none",        label:"None yet",          emoji:"🙌" },
];

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
  progress: { display:"flex", gap:4, marginBottom:28 },
  dot: function(active, done) {
    return {
      flex:1, height:4, borderRadius:2,
      background: done ? C.green : active ? C.green : C.bdr,
      opacity: done ? 0.5 : 1, transition:"background .3s, opacity .3s",
    };
  },
  heading: {
    fontFamily:F.head, fontSize:26, fontWeight:800,
    color:C.text, letterSpacing:"-0.03em", margin:"0 0 8px",
  },
  sub: { fontSize:15, color:C.t2, margin:"0 0 22px", lineHeight:1.5 },
  selCard: function(active) {
    return {
      display:"flex", alignItems:"flex-start", gap:14,
      padding:"13px 16px", borderRadius:14,
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
      flex:1, padding:"10px 4px", borderRadius:12, textAlign:"center",
      border:"2px solid " + (active ? C.green : C.bdr),
      background: active ? C.gp : C.card,
      color: active ? C.green : C.text,
      fontWeight: active ? 700 : 500,
      fontSize:13, cursor:"pointer", transition:"all .15s",
    };
  },
  chipSmall: function(active) {
    return {
      padding:"8px 13px", borderRadius:20,
      border:"1.5px solid " + (active ? C.green : C.bdr),
      background: active ? C.gp : C.card,
      color: active ? C.green : C.text,
      fontWeight: active ? 700 : 500,
      fontSize:13, cursor:"pointer", transition:"all .15s",
    };
  },
  chipRow: { display:"flex", gap:8, marginTop:8 },
  chipWrap: { display:"flex", flexWrap:"wrap", gap:8, marginTop:8 },
  inp: {
    width:"100%", padding:"12px 14px", borderRadius:10,
    border:"1.5px solid " + C.bdr, background:C.card,
    fontSize:15, fontFamily:F.body, color:C.text,
    outline:"none", boxSizing:"border-box", marginTop:6,
  },
  label: { fontSize:11, fontWeight:700, color:C.t2, textTransform:"uppercase", letterSpacing:"0.07em" },
  hint: { fontSize:11, color:C.t3, marginTop:4 },
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
  previewCard: {
    border:"1.5px solid " + C.bdr, borderRadius:16, background:C.card,
    padding:"16px 18px", marginBottom:12,
  },
  planDay: {
    display:"flex", gap:12, padding:"10px 0",
    borderBottom:"1px solid " + C.bdr, alignItems:"flex-start",
  },
  planDayLabel: {
    fontSize:11, fontWeight:800, color:C.green, minWidth:52,
    textTransform:"uppercase", letterSpacing:"0.05em", paddingTop:2,
  },
};

/* ─── Screen 0 — Welcome ─────────────────────────────────── */
function ScreenWelcome({ onNext, onSkip }) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",paddingTop:24}}>
      <div style={{fontSize:72,marginBottom:24}}>🌱</div>
      <h1 style={{...S.heading, fontSize:32, textAlign:"center", marginBottom:12}}>Welcome to MyTerra</h1>
      <p style={{...S.sub, textAlign:"center", fontSize:16, maxWidth:340, marginBottom:40}}>
        A farm game simulator running on real life.<br/>
        Answer a few quick questions and we'll build your farm, pick your first
        plants and plan your first week.
      </p>
      <button style={S.btnPrimary(true)} onClick={onNext}>Get started</button>
      <button style={S.btnBack} onClick={onSkip}>Skip — I'll set up manually</button>
    </div>
  );
}

/* ─── Screen 1 — Environment ─────────────────────────────── */
function ScreenEnvironment({ value, onChange, onNext, onBack }) {
  return (
    <>
      <h2 style={S.heading}>Where will you grow?</h2>
      <p style={S.sub}>This shapes your map, your plant suggestions and how we schedule your tasks.</p>
      {ENVIRONMENTS.map(function(e) {
        var active = value === e.id;
        return (
          <button key={e.id} style={S.selCard(active)} onClick={function(){ onChange(e.id); }}>
            <span style={S.cardEmoji}>{e.emoji}</span>
            <div>
              <div style={S.cardLabel}>{e.label}</div>
              <div style={S.cardDesc}>{e.desc}</div>
            </div>
          </button>
        );
      })}
      <button style={S.btnPrimary(!!value)} onClick={value ? onNext : undefined}>Continue</button>
      <button style={S.btnBack} onClick={onBack}>← Back</button>
    </>
  );
}

/* ─── Screen 2 — Dimensions ──────────────────────────────── */
function ScreenDimensions({ environment, unit, setUnit, lenStr, setLenStr, widStr, setWidStr, covered, setCovered, onNext, onBack }) {
  var uLabel = unit === "imperial" ? "ft" : "m";
  var len = toNum(lenStr), wid = toNum(widStr);
  var lenM = unit === "imperial" ? ftToM(len) : len;
  var widM = unit === "imperial" ? ftToM(wid) : wid;
  var areaM2 = r1(lenM * widM);
  var needCovered = environment === "balcony";
  var ok = len > 0 && wid > 0 && (!needCovered || !!covered);
  var envName = environment === "balcony" ? "balcony" : environment === "backyard" ? "garden" : "land";
  return (
    <>
      <h2 style={S.heading}>How big is your space?</h2>
      <p style={S.sub}>A rough estimate is fine — pace it out if you're not sure. You can change it later.</p>
      <div style={{marginBottom:16}}>
        <div style={S.label}>Units</div>
        <div style={{...S.chipRow, maxWidth:200}}>
          <button style={S.chip(unit === "metric")} onClick={function(){ setUnit("metric"); }}>metres</button>
          <button style={S.chip(unit === "imperial")} onClick={function(){ setUnit("imperial"); }}>feet</button>
        </div>
      </div>
      <div style={{display:"flex", gap:12, marginBottom:8}}>
        <div style={{flex:1}}>
          <div style={S.label}>Length ({uLabel})</div>
          <input style={S.inp} inputMode="decimal" placeholder={unit === "imperial" ? "e.g. 20" : "e.g. 6"}
            value={lenStr} onChange={function(e){ setLenStr(e.target.value); }}/>
        </div>
        <div style={{flex:1}}>
          <div style={S.label}>Width ({uLabel})</div>
          <input style={S.inp} inputMode="decimal" placeholder={unit === "imperial" ? "e.g. 10" : "e.g. 3"}
            value={widStr} onChange={function(e){ setWidStr(e.target.value); }}/>
        </div>
      </div>
      <div style={{...S.hint, marginBottom:16}}>
        {areaM2 > 0 ? "That's about " + areaM2 + " m² of " + envName + "." : "We'll size your map from this."}
      </div>
      {needCovered && (
        <div style={{marginBottom:20}}>
          <div style={S.label}>Is it covered overhead?</div>
          <div style={S.chipRow}>
            {COVERED_OPTS.map(function(o) {
              return (
                <button key={o.id} style={S.chip(covered === o.id)} onClick={function(){ setCovered(o.id); }}>{o.label}</button>
              );
            })}
          </div>
          <div style={S.hint}>Covered balconies get less rain — we'll remind you to water more often.</div>
        </div>
      )}
      <button style={S.btnPrimary(ok)} onClick={ok ? onNext : undefined}>Continue</button>
      <button style={S.btnBack} onClick={onBack}>← Back</button>
    </>
  );
}

/* ─── Screen 3 — Region + city ───────────────────────────── */
function ScreenRegion({ region, setRegion, city, setCity, onNext, onBack }) {
  return (
    <>
      <h2 style={S.heading}>Where in the world?</h2>
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
        <div style={S.hint}>Used for weather forecasts only. Never shared.</div>
      </div>
      <button style={S.btnPrimary(true)} onClick={onNext}>Continue</button>
      <button style={S.btnBack} onClick={onBack}>← Back</button>
    </>
  );
}

/* ─── Screen 4 — Sunlight ────────────────────────────────── */
function ScreenSun({ sunlight, setSunlight, sunDirection, setSunDirection, onNext, onBack }) {
  return (
    <>
      <h2 style={S.heading}>How much sun does it get?</h2>
      <p style={S.sub}>Direct sunlight on a clear summer day. Shade-tolerant plants exist — we'll match them to your light.</p>
      <div style={{marginBottom:20}}>
        <div style={S.label}>Hours of direct sun</div>
        <div style={S.chipWrap}>
          {SUN_HOURS.map(function(o) {
            var active = sunlight === o.id;
            return (
              <button key={o.id} style={{...S.chipSmall(active), minWidth:88, textAlign:"center"}} onClick={function(){ setSunlight(o.id); }}>
                <div>{o.label}</div>
                <div style={{fontSize:10, fontWeight:400, color: active ? C.green : C.t3, marginTop:1}}>{o.sub}</div>
              </button>
            );
          })}
        </div>
      </div>
      <div style={{marginBottom:28}}>
        <div style={S.label}>When does the sun hit it?</div>
        <div style={S.chipRow}>
          {SUN_DIRS.map(function(o, i) {
            var active = sunDirection === o.id;
            return (
              <button key={i} style={S.chip(active)} onClick={function(){ setSunDirection(o.id); }}>{o.label}</button>
            );
          })}
        </div>
      </div>
      <button style={S.btnPrimary(!!sunlight)} onClick={sunlight ? onNext : undefined}>Continue</button>
      <button style={S.btnBack} onClick={onBack}>← Back</button>
    </>
  );
}

/* ─── Screen 5 — Goals ───────────────────────────────────── */
function ScreenGoals({ goals, setGoals, onNext, onBack }) {
  function toggle(id) {
    setGoals(function(prev) {
      if (prev.includes(id)) return prev.filter(function(g){ return g !== id; });
      return [...prev, id];
    });
  }
  var ok = goals.length > 0;
  return (
    <>
      <h2 style={S.heading}>What are you growing for?</h2>
      <p style={S.sub}>Pick everything that applies.</p>
      {GOALS.map(function(g) {
        var active = goals.includes(g.id);
        return (
          <button key={g.id} style={S.selCard(active)} onClick={function(){ toggle(g.id); }}>
            <span style={S.cardEmoji}>{g.emoji}</span>
            <div style={{display:"flex", alignItems:"center", minHeight:26}}>
              <div style={S.cardLabel}>{g.label}</div>
            </div>
          </button>
        );
      })}
      <button style={S.btnPrimary(ok)} onClick={ok ? onNext : undefined}>Continue</button>
      <button style={S.btnBack} onClick={onBack}>← Back</button>
    </>
  );
}

/* ─── Screen 6 — Experience ──────────────────────────────── */
function ScreenExperience({ value, onChange, onNext, onBack }) {
  return (
    <>
      <h2 style={S.heading}>How much have you grown before?</h2>
      <p style={S.sub}>Honest answers get better suggestions — beginners get the forgiving plants.</p>
      {EXPERIENCE_LEVELS.map(function(e) {
        var active = value === e.id;
        return (
          <button key={e.id} style={S.selCard(active)} onClick={function(){ onChange(e.id); }}>
            <span style={S.cardEmoji}>{e.emoji}</span>
            <div>
              <div style={S.cardLabel}>{e.label}</div>
              <div style={S.cardDesc}>{e.desc}</div>
            </div>
          </button>
        );
      })}
      <button style={S.btnPrimary(!!value)} onClick={value ? onNext : undefined}>Continue</button>
      <button style={S.btnBack} onClick={onBack}>← Back</button>
    </>
  );
}

/* ─── Screen 7 — Time budget ─────────────────────────────── */
function ScreenTime({ value, onChange, onNext, onBack }) {
  return (
    <>
      <h2 style={S.heading}>How much time can you give it?</h2>
      <p style={S.sub}>We'll size your first planting so it fits your life, not the other way round.</p>
      {TIME_BUDGETS.map(function(t) {
        var active = value === t.id;
        return (
          <button key={t.id} style={S.selCard(active)} onClick={function(){ onChange(t.id); }}>
            <span style={S.cardEmoji}>{t.emoji}</span>
            <div>
              <div style={S.cardLabel}>{t.label}</div>
              <div style={S.cardDesc}>{t.desc}</div>
            </div>
          </button>
        );
      })}
      <button style={S.btnPrimary(!!value)} onClick={value ? onNext : undefined}>Continue</button>
      <button style={S.btnBack} onClick={onBack}>← Back</button>
    </>
  );
}

/* ─── Screen 8 — Household ───────────────────────────────── */
function ScreenHousehold({ people, setPeople, use, setUse, dislikes, setDislikes, onNext, onBack }) {
  function toggleDislike(name) {
    setDislikes(function(prev) {
      if (prev.includes(name)) return prev.filter(function(n){ return n !== name; });
      return [...prev, name];
    });
  }
  var ok = !!people && !!use;
  return (
    <>
      <h2 style={S.heading}>Who's eating the harvest?</h2>
      <p style={S.sub}>Helps us size your planting and skip things nobody will eat.</p>
      <div style={{marginBottom:18}}>
        <div style={S.label}>People in your household</div>
        <div style={S.chipRow}>
          {PEOPLE_OPTS.map(function(o) {
            return (
              <button key={o.id} style={S.chip(people === o.id)} onClick={function(){ setPeople(o.id); }}>{o.label}</button>
            );
          })}
        </div>
      </div>
      <div style={{marginBottom:18}}>
        <div style={S.label}>What will you mostly do with it?</div>
        <div style={S.chipRow}>
          {USE_OPTS.map(function(o) {
            var active = use === o.id;
            return (
              <button key={o.id} style={S.chip(active)} onClick={function(){ setUse(o.id); }}>
                <div>{o.emoji}</div>
                <div style={{marginTop:2}}>{o.label}</div>
              </button>
            );
          })}
        </div>
      </div>
      <div style={{marginBottom:24}}>
        <div style={S.label}>Anything you don't eat? <span style={{textTransform:"none",fontWeight:400,opacity:.7}}>(optional)</span></div>
        <div style={S.chipWrap}>
          {DISLIKE_OPTS.map(function(name) {
            var active = dislikes.includes(name);
            return (
              <button key={name} style={S.chipSmall(active)} onClick={function(){ toggleDislike(name); }}>
                {active ? "🚫 " + name : name}
              </button>
            );
          })}
        </div>
      </div>
      <button style={S.btnPrimary(ok)} onClick={ok ? onNext : undefined}>Continue</button>
      <button style={S.btnBack} onClick={onBack}>← Back</button>
    </>
  );
}

/* ─── Screen 9 — Assets ──────────────────────────────────── */
function ScreenAssets({ assets, setAssets, onNext, onBack }) {
  function toggle(id) {
    setAssets(function(prev) {
      if (id === "none") return prev.includes("none") ? [] : ["none"];
      var next = prev.filter(function(a){ return a !== "none"; });
      if (next.includes(id)) return next.filter(function(a){ return a !== id; });
      return [...next, id];
    });
  }
  var ok = assets.length > 0;
  return (
    <>
      <h2 style={S.heading}>What do you already have?</h2>
      <p style={S.sub}>Pick everything you own. We'll factor it into your plan — and you can add these to your map later.</p>
      <div style={{display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10, marginBottom:20}}>
        {ASSET_OPTS.map(function(a) {
          var active = assets.includes(a.id);
          return (
            <button key={a.id} style={{...S.selCard(active), marginBottom:0, alignItems:"center"}} onClick={function(){ toggle(a.id); }}>
              <span style={{...S.cardEmoji, marginTop:0}}>{a.emoji}</span>
              <div style={{...S.cardLabel, marginBottom:0, fontSize:13}}>{a.label}</div>
            </button>
          );
        })}
      </div>
      <button style={S.btnPrimary(ok)} onClick={ok ? onNext : undefined}>Continue</button>
      <button style={S.btnBack} onClick={onBack}>← Back</button>
    </>
  );
}

/* ─── Screen 10 — Plant suggestions ─────────────────────── */
function ScreenPlants({ profileDraft, region, maxPicks, selected, setSelected, onNext, onBack }) {
  var list = useMemo(function() {
    return suggestCrops(profileDraft, region, { limit: 9 });
  }, [profileDraft, region]);

  // Prune selections invalidated by back-navigation (changed environment,
  // dislikes, or a smaller time budget) so stale picks can't reach the farm.
  var listNames = list.map(function(c){ return c.name; });
  var pruned = selected.filter(function(n){ return listNames.includes(n); }).slice(0, maxPicks);

  function toggle(name) {
    setSelected(function(prev) {
      var cur = prev.filter(function(n){ return listNames.includes(n); }).slice(0, maxPicks);
      if (cur.includes(name)) return cur.filter(function(n){ return n !== name; });
      if (cur.length >= maxPicks) return cur;
      return [...cur, name];
    });
  }

  var ok = pruned.length > 0;
  return (
    <>
      <h2 style={S.heading}>Your matched plants</h2>
      <p style={S.sub}>
        Picked for your space, light, experience and the time of year.
        Choose up to {maxPicks} — fewer plants, better habits.
      </p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
        {list.map(function(c) {
          var active = pruned.includes(c.name);
          return (
            <button key={c.name} style={S.cropCard(active)} onClick={function(){ toggle(c.name); }}>
              {active && <span style={S.checkBadge}>✓</span>}
              <span style={{marginBottom:6,display:"flex",justifyContent:"center"}}><FarmIcon name={c.name} emoji={c.emoji} size={28}/></span>
              <span style={{fontSize:12,fontWeight:700,color:C.text,lineHeight:1.3,display:"block"}}>{c.name}</span>
              <span style={{fontSize:10,color:C.t3,marginTop:2,display:"block"}}>{c.days}d</span>
            </button>
          );
        })}
      </div>
      {pruned.length === maxPicks && (
        <div style={{fontSize:12,color:C.green,fontWeight:600,textAlign:"center",marginBottom:8}}>
          {maxPicks} selected — deselect one to swap
        </div>
      )}
      <button style={S.btnPrimary(ok)} onClick={ok ? function(){ setSelected(pruned); onNext(); } : undefined}>Continue</button>
      <button style={S.btnBack} onClick={onBack}>← Back</button>
    </>
  );
}

/* ─── Screen 11 — Initial map ────────────────────────────── */
function ScreenMap({ environment, zonePlan, selected, onNext, onBack }) {
  var sp = zonePlan.spec;
  return (
    <>
      <h2 style={S.heading}>Here's your starter map</h2>
      <p style={S.sub}>We've laid out your first growing zone. Resize it, move it, or add more zones any time in Map → Edit Layout.</p>
      <div style={S.previewCard}>
        <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:10}}>
          <span style={{fontSize:32}}>{sp.emoji}</span>
          <div>
            <div style={{fontSize:16, fontWeight:800, color:C.text}}>{sp.label}</div>
            <div style={{fontSize:12, color:C.t2}}>{zonePlan.areaM2} m² of growing space</div>
          </div>
        </div>
        <div style={{fontSize:13, color:C.t2, lineHeight:1.6}}>
          <div>🗺️ Map canvas: {zonePlan.farmW} × {zonePlan.farmH} m ({environment === "farm" ? "with room to expand" : "your real space"})</div>
          <div>🌱 Planted with: {selected.join(", ")}</div>
        </div>
      </div>
      <div style={{...S.hint, marginBottom:20}}>
        Your equipment (greenhouse, coop, trees…) can be added as zones from the map editor whenever you're ready.
      </div>
      <button style={S.btnPrimary(true)} onClick={onNext}>Looks good</button>
      <button style={S.btnBack} onClick={onBack}>← Back</button>
    </>
  );
}

/* ─── Screen 12 — 7-day plan ─────────────────────────────── */
function ScreenPlan({ selected, region, onFinish, onBack }) {
  var plan = useMemo(function() {
    return buildSevenDayPlan(selected, region);
  }, [selected, region]);
  return (
    <>
      <h2 style={S.heading}>Your first week</h2>
      <p style={S.sub}>These tasks will show up on your Today screen, one day at a time. Tick them off to build your streak.</p>
      <div style={{...S.previewCard, paddingTop:6, paddingBottom:6, marginBottom:20}}>
        {plan.map(function(d) {
          return (
            <div key={d.day} style={{...S.planDay, borderBottom: d.day === 7 ? "none" : S.planDay.borderBottom}}>
              <div style={S.planDayLabel}>Day {d.day}</div>
              <div style={{flex:1}}>
                {d.items.length === 0 && <div style={{fontSize:13, color:C.t3}}>Rest day 😌</div>}
                {d.items.map(function(it, i) {
                  return <div key={i} style={{fontSize:13, color:C.text, lineHeight:1.5}}>{it}</div>;
                })}
              </div>
            </div>
          );
        })}
      </div>
      <button style={S.btnPrimary(true)} onClick={onFinish}>Start farming 🌱</button>
      <button style={S.btnBack} onClick={onBack}>← Back</button>
    </>
  );
}

/* ─── Main export ────────────────────────────────────────── */
export default function Onboarding({ onComplete }) {
  var [step, setStep] = useState(0);
  // Step answers
  var [environment, setEnvironment] = useState(null);
  var [unit, setUnit] = useState("metric");
  var [lenStr, setLenStr] = useState("");
  var [widStr, setWidStr] = useState("");
  var [covered, setCovered] = useState(null);
  var [region, setRegion] = useState("western_europe");
  var [city, setCity] = useState("");
  var [sunlight, setSunlight] = useState(null);
  var [sunDirection, setSunDirection] = useState(null);
  var [goals, setGoals] = useState([]);
  var [experience, setExperience] = useState(null);
  var [timeBudget, setTimeBudget] = useState(null);
  var [people, setPeople] = useState(null);
  var [use, setUse] = useState(null);
  var [dislikes, setDislikes] = useState([]);
  var [assets, setAssets] = useState([]);
  var [selected, setSelected] = useState([]);

  // Normalised metric dimensions
  var lenM = unit === "imperial" ? ftToM(toNum(lenStr)) : toNum(lenStr);
  var widM = unit === "imperial" ? ftToM(toNum(widStr)) : toNum(widStr);

  var maxPicks = timeBudget === "min5" ? 2 : timeBudget === "min15" ? 3 : 5;

  // Draft profile fed to the suggestion engine mid-flow
  var profileDraft = useMemo(function() {
    return {
      environment: environment,
      sunlight: sunlight,
      experience: experience,
      household: { people: people, use: use, likes: [], dislikes: dislikes },
      assets: assets,
    };
  }, [environment, sunlight, experience, people, use, dislikes, assets]);

  var zonePlan = useMemo(function() {
    if (!environment || !(lenM > 0) || !(widM > 0)) return null;
    return buildStarterZone(environment, lenM, widM);
  }, [environment, lenM, widM]);

  function next() { setStep(step + 1); }
  function back() { setStep(step - 1); }

  function handleSkip() {
    // setupDone must flip to true or the onboarding gate re-fires instantly
    // (the legacy skip passed setupDone:false and looped — fixed in Stage 3).
    onComplete({
      setupDone: true,
      region: "western_europe",
      profile: {
        environment: null,
        dimensions: { lengthM: null, widthM: null, areaM2: null, unit: "metric", covered: null },
        sunlight: null, sunDirection: null,
        goals: [], experience: null, timeBudget: null,
        household: { people: null, use: null, likes: [], dislikes: [] },
        assets: [],
        onboardingVersion: 0,
      },
    });
  }

  function handleFinish() {
    var zp = zonePlan || buildStarterZone(environment || "farm", lenM || 6, widM || 4);
    var today = todayLocalKey();
    var zoneId = uid();

    var zone = {
      id: zoneId, name: zp.spec.label, emoji: zp.spec.emoji,
      type: zp.spec.type, areaM2: zp.areaM2, soilType: "loam", notes: "",
      xM: zp.xM, yM: zp.yM, wM: zp.wM, hM: zp.hM,
    };

    var plots = selected.map(function(cropName) {
      var crop = CROPS.find(function(c){ return c.name === cropName; });
      var rc   = getRegionalCrop(crop, region) || crop;
      var sp   = (rc.spacing || 30) / 100;
      var plotShare = zp.areaM2 / selected.length;
      var plantCount = Math.min(Math.max(1, Math.floor(plotShare / (sp * sp))), 20);
      // Field names MUST match the canonical plot shape created in Farm.jsx
      // (crop / plantDate / zone / status / plantCount / qty / measureType).
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
      region: region,
      city: city.trim(),
      zones: [zone],
      garden: { plots: plots },
      farmW: zp.farmW,
      farmH: zp.farmH,
      setupDone: true,
      profile: {
        environment: environment,
        dimensions: {
          lengthM: r1(lenM), widthM: r1(widM), areaM2: r1(lenM * widM),
          unit: unit, covered: environment === "balcony" ? covered : null,
        },
        sunlight: sunlight,
        sunDirection: sunDirection,
        goals: goals,
        experience: experience,
        timeBudget: timeBudget,
        household: { people: people, use: use, likes: [], dislikes: dislikes },
        assets: assets,
        onboardingVersion: 2,
      },
    });
  }

  var screens = [
    <ScreenWelcome     key="w"  onNext={next} onSkip={handleSkip}/>,
    <ScreenEnvironment key="e"  value={environment} onChange={setEnvironment} onNext={next} onBack={back}/>,
    <ScreenDimensions  key="d"  environment={environment} unit={unit} setUnit={setUnit}
                       lenStr={lenStr} setLenStr={setLenStr} widStr={widStr} setWidStr={setWidStr}
                       covered={covered} setCovered={setCovered} onNext={next} onBack={back}/>,
    <ScreenRegion      key="r"  region={region} setRegion={setRegion} city={city} setCity={setCity}
                       onNext={next} onBack={back}/>,
    <ScreenSun         key="s"  sunlight={sunlight} setSunlight={setSunlight}
                       sunDirection={sunDirection} setSunDirection={setSunDirection}
                       onNext={next} onBack={back}/>,
    <ScreenGoals       key="g"  goals={goals} setGoals={setGoals} onNext={next} onBack={back}/>,
    <ScreenExperience  key="x"  value={experience} onChange={setExperience} onNext={next} onBack={back}/>,
    <ScreenTime        key="t"  value={timeBudget} onChange={setTimeBudget} onNext={next} onBack={back}/>,
    <ScreenHousehold   key="h"  people={people} setPeople={setPeople} use={use} setUse={setUse}
                       dislikes={dislikes} setDislikes={setDislikes} onNext={next} onBack={back}/>,
    <ScreenAssets      key="a"  assets={assets} setAssets={setAssets} onNext={next} onBack={back}/>,
    <ScreenPlants      key="p"  profileDraft={profileDraft} region={region} maxPicks={maxPicks}
                       selected={selected} setSelected={setSelected} onNext={next} onBack={back}/>,
    <ScreenMap         key="m"  environment={environment} zonePlan={zonePlan || buildStarterZone(environment || "farm", lenM || 6, widM || 4)}
                       selected={selected} onNext={next} onBack={back}/>,
    <ScreenPlan        key="7"  selected={selected} region={region} onFinish={handleFinish} onBack={back}/>,
  ];

  var totalSteps = screens.length - 1; // 12 answer steps after welcome

  return (
    <div style={S.overlay}>
      <div style={S.inner}>
        {step > 0 && (
          <div style={S.progress}>
            {Array.from({length: totalSteps}, function(_, i){ return i + 1; }).map(function(i) {
              return <div key={i} style={S.dot(step === i, step > i)}/>;
            })}
          </div>
        )}
        {screens[step]}
      </div>
    </div>
  );
}
