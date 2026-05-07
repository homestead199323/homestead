/* ═══════════════════════════════════════════
   THEME — colors, fonts, shared style presets
   Extracted from App.jsx (Phase A.1, 2026-05-07)
   ═══════════════════════════════════════════ */

export const C = {
  bg: "#f8faf9", card: "#ffffff", green: "#2d6a4f", gl: "#40916c", gp: "#e8f5e9",
  gm: "#95d5b2", text: "#1a2e1a", t2: "#6b7b6b", t3: "#b8c4b8", bdr: "#e8ece8",
  red: "#ef4444", orange: "#f59e0b", blue: "#3b82f6", yellow: "#eab308",
  sh: "0 1px 3px rgba(0,0,0,.04), 0 1px 2px rgba(0,0,0,.06)",
  shL: "0 10px 25px rgba(0,0,0,.06), 0 4px 10px rgba(0,0,0,.04)",
  shXL: "0 20px 40px rgba(0,0,0,.08), 0 8px 16px rgba(0,0,0,.04)",
  r: 16, rs: 12,
  // Gradient presets — viral apps always use gradients
  grd: "linear-gradient(135deg, #2d6a4f 0%, #40916c 100%)",
  grdLight: "linear-gradient(135deg, #f0faf4 0%, #e8f5e9 50%, #f0f9ff 100%)",
  grdWarm: "linear-gradient(135deg, #fef9ef 0%, #fff7ed 50%, #fef3c7 100%)",
  grdHero: "linear-gradient(160deg, #1a4731 0%, #2d6a4f 40%, #40916c 100%)",
};

export const F = {
  body: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  head: "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  mono: "'JetBrains Mono','SF Mono','Cascadia Code',monospace"
};

/* SHARED STYLE CONSTANTS
   Extracted from repeated inline style objects to reduce per-render allocations.
   Rule: if a pattern appears 4+ times, it belongs here. */
export const SX = {
  flex1: {flex:1},
  mb12: {marginBottom:12},
  mw800: {maxWidth:800},
  overflowHidden: {overflow:"hidden"},
  rowCenterG6: {display:"flex",alignItems:"center",gap:6},
  rowCenterG10: {display:"flex",alignItems:"center",gap:10},
  grid2: {display:"grid",gridTemplateColumns:"1fr 1fr",gap:8},
  btnRowEnd: {display:"flex",gap:8,justifyContent:"flex-end"},
  lblGreen: {fontSize:12,fontWeight:700,color:C.green},
  t2_10: {fontSize:10,color:C.t2},
  t2_11: {fontSize:11,color:C.t2},
  t2_12: {fontSize:12,color:C.t2},
  t2_12mt2: {fontSize:12,color:C.t2,marginTop:2},
  t2_11mt4: {fontSize:11,color:C.t2,marginTop:4},
  s13mt4: {fontSize:13,marginTop:4},
  capHeader: {fontSize:10,fontWeight:700,color:C.t3,textTransform:"uppercase",letterSpacing:"0.04em"},
  capHeaderT2: {fontSize:10,fontWeight:700,color:C.t2,textTransform:"uppercase"},
  headerH2: {fontFamily:F.head,fontSize:30,margin:0,letterSpacing:"-0.03em",fontWeight:800},
  emptyIcon: {fontSize:48,marginBottom:12,filter:"drop-shadow(0 2px 4px rgba(0,0,0,.1))"},
  s20: {fontSize:20},
  s13: {fontSize:13},
  s15Bold: {fontSize:15,fontWeight:700,color:C.text},
  sectionHead: {fontSize:15,fontWeight:700,color:C.text,marginBottom:12,fontFamily:F.head},
  t2_11mt2: {fontSize:11,color:C.t2,marginTop:2},
  t2_11b: {fontSize:11,color:C.t2,fontWeight:600},
  t3_10mt2: {fontSize:10,color:C.t3,marginTop:2},
  flex1min0: {flex:1,minWidth:0},
  pageHead: {display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24},
  pageSubHead: {color:C.t2,fontSize:12.5,margin:"4px 0 0",fontWeight:500},
  bodyText: {fontSize:13,lineHeight:1.65,color:C.text},
};
