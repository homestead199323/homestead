/* ═══════════════════════════════════════════
   THEME — JS bridge to CSS tokens
   Colors/shadows reference CSS custom properties (→ dark mode ready).
   Radius stays numeric because C.r is used arithmetically (C.r+4).
   Phase 1: tokenized 2026-05-07.
   ═══════════════════════════════════════════ */

export const C = {
  /* surfaces */
  bg:   "var(--color-bg)",
  card: "var(--color-card)",

  /* brand green */
  green: "var(--color-green)",
  gl:    "var(--color-green-light)",
  gp:    "var(--color-green-pale)",
  gm:    "var(--color-green-mid)",

  /* text */
  text: "var(--color-text)",
  t2:   "var(--color-text-2)",
  t3:   "var(--color-text-3)",

  /* border */
  bdr: "var(--color-border)",

  /* feedback */
  red:    "var(--color-red)",
  orange: "var(--color-orange)",
  blue:   "var(--color-blue)",
  yellow: "var(--color-yellow)",

  /* shadows */
  sh:   "var(--shadow)",
  shL:  "var(--shadow-l)",
  shXL: "var(--shadow-xl)",

  /* radius — kept numeric: C.r is used as C.r+4 in Overlay */
  r:  16,
  rs: 12,

  /* gradients — hardcoded because CSS vars in gradient strings
     are valid CSS but lose IntelliSense; update if tokens change */
  grd:     "linear-gradient(135deg, #2e6b52 0%, #3d9970 100%)",
  grdLight:"linear-gradient(135deg, #f0faf4 0%, #e8f5ee 50%, #f0f9ff 100%)",
  grdWarm: "linear-gradient(135deg, #fef9ef 0%, #fff7ed 50%, #fef3c7 100%)",
  grdHero: "linear-gradient(160deg, #1a4731 0%, #2e6b52 40%, #3d9970 100%)",
};

export const F = {
  body: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  head: "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  mono: "'JetBrains Mono','SF Mono','Cascadia Code',monospace",
};

/* Type scale — mirrors --text-* CSS vars. Use TS.sm, TS.base etc in inline styles. */
export const TS = {
  xs:   "var(--text-xs)",    /* 12px */
  sm:   "var(--text-sm)",    /* 14px */
  base: "var(--text-base)",  /* 16px */
  md:   "var(--text-md)",    /* 18px */
  lg:   "var(--text-lg)",    /* 22px */
  xl:   "var(--text-xl)",    /* 28px */
};

/* SHARED STYLE CONSTANTS
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
