import React, { useState, useEffect, useCallback, useMemo, useReducer } from "react";
import { createPortal } from "react-dom";
import { MotionConfig } from "framer-motion";
import {
  Download, Upload, Leaf, Moon, Sun, User
} from "lucide-react";

import {
  loadFarm, saveFarm, flushFarm, exportFarm,
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
import { NAV, BOTTOM_TABS, MORE_ITEMS } from "./app/navigation";
import { DEF, dataReducer } from "./app/state";
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
        {isOffline&&<div style={{padding:"8px 20px",fontSize:11,fontWeight:600,color:C.orange,background:C.tWarmBand,textAlign:"center",borderRadius:8,margin:"0 10px 8px"}}>📡 Offline — data saved locally</div>}
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
    // Phase 8.4 — extract transient _pendingCelebrations before persisting
    const { _pendingCelebrations, ...persistable } = withGamify;
    if (Array.isArray(_pendingCelebrations) && _pendingCelebrations.length > 0) {
      setBadgeQueue(q => [...q, ..._pendingCelebrations]);
    }
    dispatchData({type:'SET_ALL', data: persistable});
    saveFarm(persistable);
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
    <MotionConfig reducedMotion="user">
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
          {isOffline&&!isTablet&&<div style={{padding:"8px 20px",fontSize:11,fontWeight:600,color:C.orange,background:C.tWarmBand,textAlign:"center",borderRadius:8,margin:"0 10px 10px"}}>📡 Offline — data saved locally</div>}
        </nav>
        <main style={{flex:1,overflow:"auto",padding:isMobile?"16px 16px calc(72px + env(safe-area-inset-bottom))":isTablet?"24px":"32px 36px",background:C.bg}}>
          {pg()}
        </main>
      </div>
      {isMobile&&<BottomNav page={page} setPage={setPage} taskCount={taskCount} moreOpen={moreOpen} setMoreOpen={setMoreOpen}/>}
      {isMobile&&moreOpen&&<MoreDrawer page={page} setPage={setPage} onClose={()=>setMoreOpen(false)} exportData={exportData} importData={importData} isOffline={isOffline} darkMode={darkMode} setDarkMode={setDarkMode}/>}
      {showFeedbackPrompt && <FeedbackPrompt onOpen={() => { setShowFeedbackPrompt(false); setPage("feedback"); }} onDismiss={() => { setShowFeedbackPrompt(false); try { markFeedbackDismissed(); } catch(e) { console.warn("Could not save feedback dismissal state:", e); } }}/>}
      <BadgeCelebration queue={badgeQueue} onDismiss={dismissBadge}/>
      <AIAssistant data={data} setData={setData}/>
    </>
    </MotionConfig>
  );
}

export default function App() {
  return <ErrorBoundary><AppInner/></ErrorBoundary>;
}
