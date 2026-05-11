import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { C, F, SX } from "../lib/theme";
import { localDateFromKey, addDaysToLocalKey } from "../lib/utils";
import { useSwipe } from "../lib/use-swipe";

/* ═══════════════════════════════════════════
   UI COMPONENTS
   ═══════════════════════════════════════════ */
export const Btn = React.memo(function Btn({children,onClick,v="primary",sm,dis,style:s}) {
  const st={
    primary:{bg:C.grd,c:"#fff",shadow:"0 2px 8px rgba(45,106,79,.25)"},
    secondary:{bg:"transparent",c:C.green,border:`1.5px solid ${C.bdr}`,shadow:"none"},
    danger:{bg:"linear-gradient(135deg, #ef4444, #dc2626)",c:"#fff",shadow:"0 2px 8px rgba(239,68,68,.25)"},
    ghost:{bg:"transparent",c:C.t2,shadow:"none"},
    success:{bg:"linear-gradient(135deg, #22c55e, #16a34a)",c:"#fff",shadow:"0 2px 8px rgba(34,197,94,.25)"},
    orange:{bg:"linear-gradient(135deg, #f59e0b, #d97706)",c:"#fff",shadow:"0 2px 8px rgba(245,158,11,.25)"}
  };
  const b=st[v]||st.primary;
  return <button onClick={dis?undefined:onClick} style={{background:b.bg,color:b.c,border:b.border||"none",borderRadius:C.rs,fontFamily:F.body,fontWeight:600,fontSize:sm?12:13,padding:sm?"7px 14px":"11px 22px",cursor:dis?"not-allowed":"pointer",opacity:dis?0.4:1,display:"inline-flex",alignItems:"center",gap:7,transition:"all .2s cubic-bezier(.25,.46,.45,.94)",boxShadow:dis?"none":b.shadow,letterSpacing:"0.01em",...s}}>{children}</button>;
});

export const Card = React.memo(function Card({children,onClick,active,style:s,p=true,className=""}) {
  return <div onClick={onClick} className={`${onClick?"card-hover":""} ${className}`} style={{background:C.card,borderRadius:C.r,boxShadow:active?`0 0 0 2px ${C.green}, ${C.sh}`:C.sh,padding:p?"18px":0,cursor:onClick?"pointer":"default",transition:"all .25s cubic-bezier(.25,.46,.45,.94)",border:`1px solid ${active?C.green:"rgba(0,0,0,.04)"}`,...s}}>{children}</div>;
});

export const Inp = React.memo(function Inp({label,...p}) {
  return <div style={SX.mb12}>
    {label&&<label style={{display:"block",fontSize:12,fontWeight:600,color:C.t2,marginBottom:5,fontFamily:F.body}}>{label}</label>}
    <input {...p} style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${C.bdr}`,borderRadius:C.rs,background:C.card,fontSize:14,fontFamily:F.body,color:C.text,outline:"none",boxSizing:"border-box",...p.style}}/>
  </div>;
});

export const Sel = React.memo(function Sel({label,options,...p}) {
  return <div style={SX.mb12}>
    {label&&<label style={{display:"block",fontSize:12,fontWeight:600,color:C.t2,marginBottom:5,fontFamily:F.body}}>{label}</label>}
    <select {...p} style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${C.bdr}`,borderRadius:C.rs,background:C.card,fontSize:14,fontFamily:F.body,color:C.text,outline:"none",boxSizing:"border-box"}}>{options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}</select>
  </div>;
});

export const Txt = React.memo(function Txt({label,...p}) {
  return <div style={SX.mb12}>
    {label&&<label style={{display:"block",fontSize:12,fontWeight:600,color:C.t2,marginBottom:5,fontFamily:F.body}}>{label}</label>}
    <textarea {...p} style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${C.bdr}`,borderRadius:C.rs,background:C.card,fontSize:14,fontFamily:F.body,color:C.text,outline:"none",resize:"vertical",minHeight:60,boxSizing:"border-box"}}/>
  </div>;
});

export const Overlay = React.memo(function Overlay({title,onClose,children,wide}) {
  return createPortal(
    <div className="overlay-backdrop" style={{position:"fixed",top:0,left:0,width:"100vw",height:"100vh",background:"rgba(0,0,0,.35)",backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16,boxSizing:"border-box"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className="overlay-sheet page-enter" style={{background:C.card,borderRadius:C.r+4,maxWidth:wide?720:520,width:"100%",maxHeight:"85vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.2), 0 8px 20px rgba(0,0,0,.1)"}}>
        <div className="overlay-handle-row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 24px 0",position:"sticky",top:0,background:C.card,zIndex:1,borderRadius:`${C.r+4}px ${C.r+4}px 0 0`}}>
          <h3 style={{margin:0,fontSize:20,fontFamily:F.head,fontWeight:700}}>{title}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.t2,width:44,height:44,borderRadius:22,display:"flex",alignItems:"center",justifyContent:"center"}}><X size={18} strokeWidth={2}/></button>
        </div>
        <div style={{padding:"16px 24px 24px"}}>{children}</div>
      </div>
    </div>,
    document.body
  );
});

export const Pill = React.memo(function Pill({children,c=C.green,bg=C.gp,sm=false,border=null}) {
  return <span style={{fontSize:sm?10:11,padding:sm?"2px 8px":"3px 10px",borderRadius:20,background:bg,color:c,fontWeight:600,fontFamily:F.body,whiteSpace:"nowrap",...(border?{border:`1px solid ${border}`}:{})}}>{children}</span>;
});

// Hover tooltip — shows a floating info card on mouse enter, hides on leave
export const Tooltip = React.memo(function Tooltip({children, content, width=220}) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({x:0, y:0});
  const ref = useRef(null);
  const handleEnter = (e) => {
    const rect = (ref.current || e.currentTarget).getBoundingClientRect();
    setPos({ x: rect.left + rect.width/2, y: rect.top });
    setShow(true);
  };
  return (
    <div ref={ref} onMouseEnter={handleEnter} onMouseLeave={()=>setShow(false)} style={{position:"relative",display:"inline-block"}}>
      {children}
      {show && (
        <div style={{
          position:"fixed", left: Math.min(pos.x - width/2, window.innerWidth - width - 12), top: Math.max(8, pos.y - 8),
          transform:"translateY(-100%)", width, zIndex:9999, pointerEvents:"none",
        }}>
          <div style={{
            background:"#1d1d1f", color:"#fff", borderRadius:10, padding:"10px 14px",
            fontSize:12, lineHeight:1.5, fontFamily:F.body, boxShadow:"0 8px 24px rgba(0,0,0,.25)",
          }}>
            {content}
          </div>
          <div style={{width:0,height:0,borderLeft:"6px solid transparent",borderRight:"6px solid transparent",borderTop:"6px solid #1d1d1f",margin:"0 auto"}}/>
        </div>
      )}
    </div>
  );
});

export const Ring = React.memo(function Ring({pct,size=44,sw=3.5,color=C.green,children}) {
  const r=(size-sw)/2,ci=2*Math.PI*r,off=ci*(1-Math.min(1,pct));
  return <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
    <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.bdr} strokeWidth={sw}/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={ci} strokeDashoffset={off} strokeLinecap="round" style={{transition:"stroke-dashoffset .6s ease"}}/></svg>
    <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.32}}>{children}</div>
  </div>;
});

export const Stat = React.memo(function Stat({label,value,sub,color=C.green}) {
  return <Card><div style={{fontSize:11,fontWeight:600,color:C.t2,textTransform:"uppercase",letterSpacing:".03em"}}>{label}</div><div style={{fontSize:26,fontWeight:700,fontFamily:F.head,marginTop:4,lineHeight:1}}>{value}</div>{sub&&<div style={{fontSize:12,color,marginTop:4,fontWeight:500}}>{sub}</div>}</Card>;
});

/* ═══════════════════════════════════════════
   SHARED CROP DETAIL COMPONENTS
   Used in both FarmMap zoomed view & Farming overlay
   ═══════════════════════════════════════════ */
export const StepChecklist = React.memo(function StepChecklist({steps, plantDate, onToggle, plotId}) {
  if (!steps || steps.length === 0) return null;
  return (
    <div style={SX.mb12}>
      <div style={{fontSize:13,fontWeight:700,color:C.green,marginBottom:8}}>Growing Steps</div>
      {steps.map((s, i) => {
        const stepDate = localDateFromKey(addDaysToLocalKey(plantDate, s.d));
        const sd = stepDate ? stepDate.toLocaleDateString("en-GB",{day:"numeric",month:"short"}) : "";
        return (
          <div key={i} onClick={e => {e.stopPropagation(); onToggle?.(plotId, i);}} style={{display:"flex",gap:10,padding:"10px 12px",background:s.done?"#f0faf0":C.card,border:`1px solid ${s.done?C.gm:C.bdr}`,borderRadius:C.rs,marginBottom:4,cursor:"pointer"}}>
            <div style={{width:22,height:22,borderRadius:22,border:`2px solid ${s.done?C.green:C.bdr}`,background:s.done?C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,flexShrink:0}}>{s.done?"✓":""}</div>
            <div style={SX.flex1}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <strong style={{fontSize:13,textDecoration:s.done?"line-through":"none"}}>{s.l}</strong>
                <span style={{fontSize:10,color:C.t2,fontFamily:F.mono}}>Day {s.d}{sd ? ` (${sd})` : ""}</span>
              </div>
              <div style={SX.t2_12mt2}>{s.t}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

export const WaterCard = React.memo(function WaterCard({waterNote}) {
  if (!waterNote) return null;
  return <Card style={{marginBottom:12,background:"#e3f2fd"}}><div style={{fontSize:12,fontWeight:700,color:C.blue}}>💧 Watering</div><div style={SX.s13mt4}>{waterNote}</div></Card>;
});

export const StorageCard = React.memo(function StorageCard({storage}) {
  if (!storage) return null;
  return <Card style={{marginBottom:12,background:"#fffde7"}}><div style={{fontSize:12,fontWeight:700,color:"#f57f17"}}>📦 Storage</div><div style={SX.s13mt4}>{storage}</div></Card>;
});

/* ═══════════════════════════════════════════
   SwipeableRow — touch swipe wrapper for list rows

   Wraps any row content. On touch devices, horizontal swipes reveal
   an action and (past threshold) commit it. Desktop is unaffected —
   mouse interactions on the children keep working as normal.

   Props:
     onSwipeRight        callback for swipe-right (e.g. mark done)
     onSwipeLeft         callback for swipe-left (e.g. delete)
     rightActionLabel    label shown in the right-reveal background (default "✓ Done")
     rightActionBg       background color of the right reveal (default sage green)
     leftActionLabel     label shown in the left-reveal background (default "🗑 Delete")
     leftActionBg        background color of the left reveal (default red)
     disabled            if true, behaves like a passthrough wrapper
     style               passed through to the outer container

   Pass only the handler(s) you need. A missing handler disables that direction.
   ═══════════════════════════════════════════ */
export const SwipeableRow = React.memo(function SwipeableRow({
  children,
  onSwipeRight,
  onSwipeLeft,
  rightActionLabel,
  rightActionBg = "#34c759",
  leftActionLabel,
  leftActionBg = "#ef4444",
  disabled = false,
  style: outerStyle,
}) {
  const { bind, offset, dragging, committed } = useSwipe({ onSwipeRight, onSwipeLeft, disabled });

  const showingRight = offset > 4 && !!onSwipeRight;
  const showingLeft = offset < -4 && !!onSwipeLeft;
  const pastRight = offset >= 80;
  const pastLeft = offset <= -80;

  // Transition rules:
  //   while dragging → no transition (track the finger exactly)
  //   during commit → 220ms slide-off
  //   on release without commit → 150ms snap-back
  const tx = dragging
    ? "transform 0ms"
    : committed
    ? "transform 220ms ease-out"
    : "transform 150ms ease-out";

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 10, ...outerStyle }}>
      {onSwipeRight && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            paddingLeft: 18,
            background: rightActionBg,
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            fontFamily: F.body,
            opacity: showingRight ? 1 : 0,
            transform: pastRight ? "scale(1.06)" : "scale(1)",
            transformOrigin: "left center",
            transition: "opacity 120ms, transform 120ms",
            pointerEvents: "none",
          }}
        >
          {rightActionLabel || "✓ Done"}
        </div>
      )}
      {onSwipeLeft && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingRight: 18,
            background: leftActionBg,
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            fontFamily: F.body,
            opacity: showingLeft ? 1 : 0,
            transform: pastLeft ? "scale(1.06)" : "scale(1)",
            transformOrigin: "right center",
            transition: "opacity 120ms, transform 120ms",
            pointerEvents: "none",
          }}
        >
          {leftActionLabel || "🗑 Delete"}
        </div>
      )}
      <div
        {...bind}
        style={{
          position: "relative",
          transform: `translateX(${offset}px)`,
          transition: tx,
          touchAction: "pan-y",
        }}
      >
        {children}
      </div>
    </div>
  );
});
