import React, { useState, useEffect, useCallback, useMemo, useReducer } from "react";
import { createPortal } from "react-dom";
import {
  Download, Upload, Leaf, Moon, Sun, User, LogOut
} from "lucide-react";

import {
  loadFarm, saveFarm, flushFarm, exportFarm,
  loadFarmOwner, saveFarmOwner, clearFarm,
  loadPage, savePage,
  loadTheme, saveTheme,
  loadFeedbackDone,
  loadFeedbackDismissed, markFeedbackDismissed,
  loadFirstUse, saveFirstUse,
} from "./lib/storage";
import { C, F, SX } from "./lib/theme";
import { LDB } from "./data/livestock";
import { todayLocalKey } from "./lib/utils";
import { rCR } from "./lib/regional";
import { buildTaskQueue } from "./lib/task-queue";
import { migrateZones, migrateGamify, migrateCompletions, updateGamify } from "./lib/migrations";
import Pantry from "./features/pantry/Pantry";
import Financials from "./features/financials/Financials";
import Manuals, { SeasonalCalendar } from "./features/manuals/Manuals";
import Livestock from "./features/animals/Livestock";
import FarmTab from "./features/farm/Farm";
import TaskQueue from "./features/tasks/TaskQueue";
import TodayScreen from "./features/today/TodayScreen";
import AIAssistant from "./features/assistant/AIAssistant";
import FeedbackSurvey, { FeedbackPrompt } from "./features/feedback/FeedbackSurvey";
import { BadgeCelebration } from "./components/BadgeCelebration";
import Onboarding from "./features/onboarding/Onboarding";
import { NAV, BOTTOM_TABS, MORE_ITEMS } from "./app/navigation";
import { DEF, dataReducer } from "./app/state";
import { isSupabaseConfigured } from "./lib/db";
import { getSession, onAuthChange, signOut } from "./lib/auth";
import { pullFarm, pushFarm, flushPush, initSyncReconnect, pullIfRemoteNewer, noteAppliedUpdatedAt } from "./lib/sync";
import { SyncStatus } from "./components/SyncStatus";
import AuthScreen from "./features/auth/AuthScreen";
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
            <p style={{color:C.t2,fontSize:12,marginBottom:20,fontFamily:F.mono,background:C.soft,padding:8,borderRadius:8,textAlign:"left",wordBreak:"break-word"}}>{String(this.state.error)}</p>
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

const MoreDrawer = React.memo(function MoreDrawer({page, setPage, onClose, exportData, importData, darkMode, setDarkMode, onSignOut}) {
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
          {onSignOut&&<button onClick={onSignOut} style={{display:"flex",alignItems:"center",gap:14,width:"100%",padding:"12px 20px",border:"none",background:"transparent",color:C.t2,cursor:"pointer",fontSize:14,fontFamily:F.body,textAlign:"left"}}>
            <span style={{width:28,display:"flex",alignItems:"center",justifyContent:"center"}}><LogOut size={17} strokeWidth={1.8}/></span> Sign Out
          </button>}
        <div style={{padding:"4px 20px 10px"}}><SyncStatus/></div>
      </div>
    </>,
    document.body
  );
});

function AppInner({ cloudData, allowLocal, onSignOut }) {
  // Lazy initializer — loads data synchronously, no loading flash
  // Wrapped in try-catch: if storage is corrupt or migration throws, fall back to DEF
  // instead of crashing the reducer with undefined state.
  // Seed priority:
  //   1. cloudData (reconciled cloud farm from AuthGate) — always wins.
  //   2. local cache — ONLY when allowLocal is true (this browser's local
  //      farm belongs to the current user, or we're in local-only mode).
  //      When false (fresh account / different owner), local is ignored so
  //      one user never inherits another's cached farm.
  //   3. DEF — clean slate.
  const initData = () => {
    try {
      const local = allowLocal ? loadFarm() : null;
      const d = cloudData || local;
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
  const [showFeedbackPrompt,setShowFeedbackPrompt]=useState(false);
  // Phase 8.4 — queue of badge ids waiting to be shown in the celebration overlay
  const [badgeQueue,setBadgeQueue]=useState([]);

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
    const flush = () => { flushFarm(); flushPush(); };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, []);

  // Wire the reconnect handler once so a queued offline cloud-write drains
  // when connectivity returns.
  useEffect(() => { initSyncReconnect(); }, []);

  // Phase 6 — multi-device: when the tab regains focus/visibility, pull the
  // cloud row if another device wrote a newer copy. pullIfRemoteNewer no-ops
  // when offline, signed out, or when we have unpushed local edits (so an
  // in-progress edit is never clobbered — last-write-wins favours it). The
  // pulled blob runs the same migration chain as initData before dispatch.
  useEffect(() => {
    const maybePull = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      pullIfRemoteNewer().then((fresh) => {
        if (!fresh) return;
        try {
          let migrated = {...DEF, ...fresh, log: fresh.log||[], costs: fresh.costs||{items:[]}};
          if (!migrated.schemaVersion) migrated = {...migrated, schemaVersion: 7};
          migrated = migrateCompletions(migrateGamify(migrateZones(migrated)));
          dispatchData({ type: "SET_ALL", data: migrated });
          saveFarm(migrated); // keep local cache aligned; do NOT re-push
        } catch (e) { console.warn("[sync] hydrate from remote failed:", e); }
      }).catch(() => { /* network hiccup — local stays authoritative */ });
    };
    const onVis = () => { if (document.visibilityState === "visible") maybePull(); };
    window.addEventListener("focus", maybePull);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", maybePull);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // One-time initial cloud push on mount. Ensures the cloud row reflects the
  // seeded local state right away (covers the fresh-signup case where cloud
  // was empty and we seeded from local/DEF, and the offline-edit-then-login
  // case where local is authoritative). Ongoing changes push via setData.
  useEffect(() => {
    if (data) pushFarm(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // Phase 8.4 — extract transient _pendingCelebrations before persisting
    const { _pendingCelebrations, ...persistable } = withGamify;
    if (Array.isArray(_pendingCelebrations) && _pendingCelebrations.length > 0) {
      setBadgeQueue(q => [...q, ..._pendingCelebrations]);
    }
    dispatchData({type:'SET_ALL', data: persistable});
    saveFarm(persistable);
    pushFarm(persistable); // cloud backup (debounced, offline-aware, no-op when signed out)
    // silent save — no UI indicator
  }, []);

  // Phase 8.4 — when a badge is dismissed, mark it celebrated so it never
  // shows again, then pop it off the queue. The next updateGamify pass will
  // see this badge already in `badges` and produce no new _pendingCelebrations.
  const dismissBadge = useCallback((badgeId) => {
    setBadgeQueue(q => q.filter(id => id !== badgeId));
    setData({
      ...data,
      gamify: {
        ...data.gamify,
        celebratedBadges: [...(data.gamify.celebratedBadges || []), badgeId],
      },
    });
  }, [data, setData]);

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

  // Show onboarding on first visit AND after data reset
  // Condition: no zones and setupDone not set — same as old setup redirect but uses overlay now
  const showOnboarding = !!(data && !data.setupDone && Array.isArray(data.zones) && data.zones.length === 0);

  const handleOnboardingComplete = useCallback((updates) => {
    setData({ ...data, ...updates });
  }, [data, setData]);

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
          {onSignOut&&<button onClick={onSignOut} style={{display:"flex",alignItems:"center",gap:isTablet?0:8,padding:isTablet?"10px 0":"4px 20px 16px",border:"none",background:"transparent",color:C.t2,cursor:"pointer",fontSize:12,fontFamily:F.body,fontWeight:500,width:"100%",justifyContent:isTablet?"center":"flex-start"}} title="Sign out">
            <LogOut size={isTablet?20:14} strokeWidth={1.8}/>{!isTablet&&<span style={{marginLeft:2}}>Sign Out</span>}
          </button>}
          <div style={{padding:isTablet?"6px 0 12px":"6px 20px 12px",display:"flex",justifyContent:isTablet?"center":"flex-start"}}><SyncStatus compact={isTablet}/></div>
        </nav>
        <main style={{flex:1,overflow:"auto",padding:isMobile?"16px 16px calc(72px + env(safe-area-inset-bottom))":isTablet?"24px":"32px 36px",background:C.bg}}>
          {pg()}
        </main>
      </div>
      {isMobile&&<BottomNav page={page} setPage={setPage} taskCount={taskCount} moreOpen={moreOpen} setMoreOpen={setMoreOpen}/>}
      {isMobile&&moreOpen&&<MoreDrawer page={page} setPage={setPage} onClose={()=>setMoreOpen(false)} exportData={exportData} importData={importData} darkMode={darkMode} setDarkMode={setDarkMode} onSignOut={onSignOut}/>}
      {showFeedbackPrompt && <FeedbackPrompt onOpen={() => { setShowFeedbackPrompt(false); setPage("feedback"); }} onDismiss={() => { setShowFeedbackPrompt(false); try { markFeedbackDismissed(); } catch(e) { console.warn("Could not save feedback dismissal state:", e); } }}/>}
      <BadgeCelebration queue={badgeQueue} onDismiss={dismissBadge}/>
      <AIAssistant data={data} setData={setData}/>
      {showOnboarding && <Onboarding onComplete={handleOnboardingComplete}/>}
    </>
  );
}

/* ═══════════════════════════════════════════
   AUTH GATE — mandatory sign-in wall + cloud reconcile (Phase 5)

   Flow:
   1. On mount, check for an existing session (getSession) and subscribe
      to auth changes (onAuthChange) so sign-in/out swaps the view live.
   2. No session  → render <AuthScreen/>.
   3. Has session → run pullFarm() and reconcile cloud vs local BEFORE
      mounting AppInner (Option X), with a 3s timeout fallback to local
      so a slow/broken network never hangs the app forever.
   4. AppInner mounts once with the reconciled `cloudData` seed.

   If Supabase isn't configured (missing env vars), skip the wall
   entirely and run local-only — the app still works offline-first.
   ═══════════════════════════════════════════ */
function AuthGate() {
  const [phase, setPhase] = useState("checking"); // checking | signedout | reconciling | ready
  const [cloudData, setCloudData] = useState(null);
  // When true, AppInner's initData may seed from the local cache; when false
  // it ignores local and starts from DEF. Set per-account by reconcileAndReady
  // so a fresh user on a shared browser never inherits a prior user's farm.
  const [allowLocal, setAllowLocal] = useState(false);
  // bump remounts AppInner cleanly on each fresh sign-in so its reducer
  // re-seeds from the new user's reconciled data.
  const [sessionKey, setSessionKey] = useState(0);

  // Local-only escape hatch: if env vars are absent, never gate, and allow
  // the local cache (single-user, no accounts — original pre-Phase-5 behavior).
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAllowLocal(true);
      setPhase("ready");
    }
  }, []);

  // Reconcile cloud vs local for a freshly-detected session, then go ready.
  // Multi-account guard: the local farm cache is shared across everyone who
  // signs in on this browser. We stamp it with the owning user id. If the
  // current user differs from the stamp, local belongs to someone else and
  // must be ignored (and cleared) — otherwise user B would inherit user A's
  // cached farm.
  const reconcileAndReady = useCallback(async () => {
    setPhase("reconciling");
    let settled = false;
    // 3s timeout fallback — mount from local ONLY if it belongs to this user.
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        // We don't have the user id resolved here (pull timed out), so the
        // safest fallback is to honour the existing owner stamp: AppInner's
        // initData reads local only when allowLocal is true. On timeout we
        // can't verify ownership, so disallow local to avoid cross-account
        // leakage; AppInner seeds DEF and the user's next pull/edit syncs.
        setCloudData(null);
        setAllowLocal(false);
        setSessionKey(k => k + 1);
        setPhase("ready");
      }
    }, 3000);

    try {
      const session = await getSession();
      const userId = session && session.user ? session.user.id : null;

      // Owner check BEFORE deciding what to seed.
      let localBelongsToUser = false;
      try {
        const owner = loadFarmOwner();
        localBelongsToUser = !!userId && owner === userId;
      } catch (e) { localBelongsToUser = false; }

      // If local belongs to a different (or no) user, wipe it now so a stale
      // cache can't leak into this account or get pushed up under the wrong id.
      if (!localBelongsToUser) {
        try { clearFarm(); } catch (e) { /* ignore */ }
      }

      const pulled = await pullFarm(); // { data, source, updatedAt } | null
      if (settled) return; // timeout already won
      settled = true;
      clearTimeout(timer);

      // Stamp the cache as belonging to this user from here on.
      if (userId) { try { saveFarmOwner(userId); } catch (e) { /* ignore */ } }

      // Tell sync which cloud revision we now hold, so a later focus-pull
      // only hydrates when ANOTHER device has written something newer.
      noteAppliedUpdatedAt(pulled ? (pulled.updatedAt || 0) : 0);

      if (pulled && pulled.source === "cloud" && pulled.data) {
        // Cloud has a real saved farm — it's the source of truth. Use it.
        setCloudData(pulled.data);
        setAllowLocal(false);
      } else {
        // Cloud empty (fresh signup, or row exists but data === {}).
        // Seed from local ONLY if that local farm belongs to THIS user
        // (e.g. they built offline before their first successful push).
        // Otherwise start clean from DEF.
        setCloudData(null);
        setAllowLocal(localBelongsToUser);
      }
      setSessionKey(k => k + 1);
      setPhase("ready");
    } catch (e) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      console.warn("[auth] reconcile failed, starting clean:", e);
      setCloudData(null);
      setAllowLocal(false);
      setSessionKey(k => k + 1);
      setPhase("ready");
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;

    // Initial session check on load.
    getSession().then(session => {
      if (!active) return;
      if (session) {
        reconcileAndReady();
      } else {
        setPhase("signedout");
      }
    }).catch(() => {
      if (active) setPhase("signedout");
    });

    // Live auth-state subscription (sign-in, sign-out, token refresh).
    const unsub = onAuthChange((event, session) => {
      if (!active) return;
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        if (session) reconcileAndReady();
      } else if (event === "SIGNED_OUT") {
        setCloudData(null);
        setPhase("signedout");
      }
      // TOKEN_REFRESHED / USER_UPDATED: no view change needed.
    });

    return () => { active = false; unsub(); };
  }, [reconcileAndReady]);

  const handleSignOut = useCallback(async () => {
    try {
      flushFarm();
      await flushPush(); // push any pending change before dropping the session
      await signOut();
      // Wipe the local farm cache + owner stamp so the next account that
      // signs in on this browser starts clean instead of inheriting this
      // user's farm. (Cloud copy is already saved by the flush above.)
      clearFarm();
    } catch (e) {
      console.warn("[auth] sign-out error:", e);
    }
    // onAuthChange SIGNED_OUT will flip phase to "signedout".
  }, []);

  if (phase === "checking" || phase === "reconciling") {
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg,fontFamily:F.body,flexDirection:"column",gap:14}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,color:C.green,fontFamily:F.head,fontSize:22,fontWeight:800}}>
          <Leaf size={22} strokeWidth={2}/> MyTerra
        </div>
        <div style={{fontSize:13,color:C.t2}}>{phase === "reconciling" ? "Loading your farm…" : "…"}</div>
      </div>
    );
  }

  if (phase === "signedout") {
    return <AuthScreen/>;
  }

  // ready
  return <AppInner key={sessionKey} cloudData={cloudData} allowLocal={allowLocal} onSignOut={isSupabaseConfigured ? handleSignOut : null}/>;
}

export default function App() {
  return <ErrorBoundary><AuthGate/></ErrorBoundary>;
}
