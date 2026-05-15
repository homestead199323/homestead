import { useState } from "react";
import { Trash2 } from "lucide-react";
import { uid } from "../../lib/storage";
import { appendLog, todayLocalKey } from "../../lib/utils";
import { rCM } from "../../lib/regional";
import { LDB } from "../../data/livestock";
import { C, SX } from "../../lib/theme";
import { Btn, Card, Inp, Sel, Overlay, Pill, SwipeableRow } from "../../components/ui";

/* ═══════════════════════════════════════════
   PANTRY
   ═══════════════════════════════════════════ */
export default function Pantry({data, setData}) {
  const [showAdd,setShowAdd]=useState(false);const [cat,setCat]=useState("All");
  const [showEat,setShowEat]=useState(null);const [eatQty,setEatQty]=useState("1");
  const [form,setForm]=useState({name:"",category:"Other",qty:"",unit:"kg"});
  const add=()=>{if(!form.name)return;setData({...data,pantry:{items:[...data.pantry.items,{...form,id:uid(),qty:+form.qty||0,source:"manual",addedDate:todayLocalKey()}]}});setForm({name:"",category:"Other",qty:"",unit:"kg"});setShowAdd(false);};
  const del=id=>setData({...data,pantry:{items:data.pantry.items.filter(i=>i.id!==id)}});
  const eat=(item,q)=>{setData({...data,pantry:{items:data.pantry.items.map(i=>i.id===item.id?(i.qty-q<=0?null:{...i,qty:Math.round((i.qty-q)*10)/10}):i).filter(Boolean)},log:appendLog(data.log,{text:`Ate ${q}${item.unit} ${item.name}`})});};
  const cats=["All","Fresh Produce","Meat","Eggs","Dairy","Preserved","Grain","Other"];
  const fil=cat==="All"?data.pantry.items:data.pantry.items.filter(i=>i.category===cat);

  // 6.5.1 — hero tile data, pre-computed (no IIFE in render path)
  const _totalKg = Math.round(data.pantry.items.filter(i=>i.unit==="kg").reduce((s,i)=>s+i.qty,0));
  const _freshKg = Math.round(data.pantry.items.filter(i=>i.source==="harvest" && i.unit==="kg").reduce((s,i)=>s+i.qty,0));
  const pantryHero = {
    itemCount: data.pantry.items.length,
    totalKg: _totalKg,
    tagline:
      data.pantry.items.length === 0
        ? "Your harvest will live here"
        : _freshKg > 0
          ? `${_freshKg} kg fresh from your farm — your shelf is starting to fill`
          : "Stocked and ready",
  };
  const itemIcon = (item) => {
    if (item.source === "farm") {
      const crop = rCM(data.region).get(item.name);
      return crop?.emoji || "🌱";
    }
    if (item.source === "livestock") {
      // Item names are like "Chicken Eggs", "Goat Milk", "Duck Meat"
      const animalType = Object.keys(LDB).find(k => item.name.startsWith(k));
      if (animalType) return LDB[animalType].e;
      // Category fallback
      if (item.category === "Eggs") return "🥚";
      if (item.category === "Meat") return "🥩";
      if (item.category === "Dairy") return "🧀";
      return "🐄";
    }
    if (item.category === "Eggs") return "🥚";
    if (item.category === "Meat") return "🥩";
    if (item.category === "Dairy") return "🧀";
    if (item.category === "Preserved") return "🫙";
    if (item.category === "Grain") return "🌾";
    if (item.category === "Fresh Produce") return "🥬";
    return "📦";
  };

  return (
    <div className="page-enter" style={SX.mw800}>
      <div style={SX.pageHead}><div><h2 style={SX.headerH2}>📦 Pantry</h2><p style={SX.pageSubHead}>Everything you've harvested and stored</p></div><Btn v="secondary" onClick={()=>setShowAdd(true)}>+ Manual</Btn></div>
      {/* 6.5.1 — hero count tile (replaces the two equal Stat tiles) */}
      {pantryHero.itemCount > 0 && (
        <Card style={{background:`linear-gradient(135deg, ${C.tGreen2}, ${C.card})`,border:`1px solid ${C.gm}`,marginBottom:16}}>
          <div style={SX.rowCenterG10}>
            <div style={{fontSize:40,lineHeight:1}}>🫙</div>
            <div style={SX.flex1}>
              <div style={{fontSize:20,fontWeight:800,letterSpacing:"-0.02em"}}>{pantryHero.itemCount} {pantryHero.itemCount === 1 ? "item" : "items"}{pantryHero.totalKg > 0 ? `, ${pantryHero.totalKg} kg total` : ""}</div>
              <div style={{fontSize:13,color:C.t2,marginTop:2}}>{pantryHero.tagline}</div>
            </div>
          </div>
        </Card>
      )}
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>{cats.map(c=><button key={c} onClick={()=>setCat(c)} style={{padding:"6px 14px",borderRadius:20,border:"none",background:cat===c?C.green:C.card,color:cat===c?"#fff":C.t2,fontSize:12,fontWeight:600,cursor:"pointer",boxShadow:cat===c?"none":C.sh}}>{c}</button>)}</div>
      {fil.length===0?<Card style={{textAlign:"center",padding:"64px 24px",background:C.grdWarm}}>
        <div style={{fontSize:72,marginBottom:12,lineHeight:1}}>🫙</div>
        <div style={SX.s15Bold}>{data.pantry.items.length === 0 ? "Your shelf is bare" : `No ${cat.toLowerCase()} yet`}</div>
        <div style={{color:C.t2,marginTop:8,fontSize:13,maxWidth:300,marginLeft:"auto",marginRight:"auto",lineHeight:1.5}}>
          {data.pantry.items.length === 0
            ? "Your harvest will live here — plant something or add an item manually to get started."
            : `Switch the filter above or harvest some ${cat.toLowerCase()} from your farm.`}
        </div>
      </Card>:
      <div style={{display:"grid",gap:6}}>{fil.map(item=>(
        <SwipeableRow key={item.id} onSwipeLeft={function(){del(item.id);}} leftActionLabel="🗑 Remove">
        <Card><div style={SX.rowCenterG10}>
          <span style={SX.s20}>{itemIcon(item)}</span>
          <div style={SX.flex1}><div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><strong style={{fontSize:14}}>{item.name}</strong><Pill>{item.category}</Pill><span style={{fontSize:15,fontWeight:700}}>{item.qty} {item.unit}</span></div>
          {item.storageNote&&<div style={SX.t2_11mt2}>💡 {item.storageNote.slice(0,80)}</div>}</div>
          <div style={{display:"flex",gap:4}}><Btn sm v="secondary" onClick={()=>{setShowEat(item);setEatQty(item.unit==="eggs"?"1":"0.5")}}>Eat</Btn><Btn sm v="ghost" onClick={()=>del(item.id)}><Trash2 size={14} strokeWidth={1.8}/></Btn></div>
        </div></Card>
        </SwipeableRow>
      ))}</div>}
      {/* Eat / Take Modal */}
      {showEat&&<Overlay title={`🍽 Use ${showEat.name}`} onClose={()=>setShowEat(null)}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:48,marginBottom:8}}>{showEat.category==="Eggs"?"🥚":showEat.category==="Meat"?"🥩":showEat.category==="Dairy"?"🧀":"🍽"}</div>
          <div style={{fontSize:16,fontWeight:600}}>{showEat.name}</div>
          <div style={{fontSize:14,color:C.t2,marginTop:4}}>In stock: <strong style={{color:C.text}}>{showEat.qty} {showEat.unit}</strong></div>
        </div>
        <Inp label={`How many ${showEat.unit} to take?`} type="number" min="0.1" max={showEat.qty} step={showEat.unit==="eggs"?"1":"0.1"} value={eatQty} onChange={e=>setEatQty(e.target.value)} />
        {/* Quick buttons */}
        <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
          {[1,2,5,10].filter(n=>n<=showEat.qty).map(n=>(
            <button key={n} onClick={()=>setEatQty(String(n))} style={{padding:"8px 16px",borderRadius:20,border:eatQty===String(n)?`2px solid ${C.green}`:`1px solid ${C.bdr}`,background:eatQty===String(n)?C.gp:C.card,fontSize:13,fontWeight:600,cursor:"pointer",color:eatQty===String(n)?C.green:C.text}}>{n}</button>
          ))}
          <button onClick={()=>setEatQty(String(showEat.qty))} style={{padding:"8px 16px",borderRadius:20,border:`1px solid ${C.bdr}`,background:C.card,fontSize:13,fontWeight:600,cursor:"pointer",color:C.orange}}>All ({showEat.qty})</button>
        </div>
        <div style={{fontSize:13,color:C.t2,marginBottom:16}}>
          After: <strong style={{color:C.text}}>{Math.max(0,Math.round((showEat.qty-(+eatQty||0))*10)/10)} {showEat.unit}</strong> remaining in stock
        </div>
        <div style={SX.btnRowEnd}>
          <Btn v="secondary" onClick={()=>setShowEat(null)}>Cancel</Btn>
          <Btn v="success" dis={!eatQty||+eatQty<=0||+eatQty>showEat.qty} onClick={()=>{eat(showEat,+eatQty);setShowEat(null)}}>Take {eatQty} {showEat.unit}</Btn>
        </div>
      </Overlay>}

      {showAdd&&<Overlay title="Add Item" onClose={()=>setShowAdd(false)}>
        <Inp label="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        <Sel label="Category" options={["Fresh Produce","Meat","Eggs","Dairy","Preserved","Grain","Other"]} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:8}}><Inp label="Qty" type="number" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})}/><Sel label="Unit" options={["kg","lbs","L","units","eggs","jars"]} value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}/></div>
        <div style={SX.btnRowEnd}><Btn v="secondary" onClick={()=>setShowAdd(false)}>Cancel</Btn><Btn onClick={add}>Add</Btn></div>
      </Overlay>}
    </div>
  );
}
