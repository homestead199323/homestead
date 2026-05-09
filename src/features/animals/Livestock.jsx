import React, { useState } from "react";
import { C, SX } from "../../lib/theme";
import { uid } from "../../lib/storage";
import { appendLog, todayLocalKey } from "../../lib/utils";
import { LDB } from "../../data/livestock";
import { BREEDS } from "../../data/breeds";
import { Btn, Card, Inp, Sel, Overlay, Stat } from "../../components/ui";
import AnimalOverlay from "./AnimalOverlay";

/* ═══════════════════════════════════════════
   LIVESTOCK
   ═══════════════════════════════════════════ */
function Livestock({data, setData}) {
  const [showAdd,setShowAdd]=useState(false);const [sel,setSel]=useState(null);const [showK,setShowK]=useState(null);const [kQ,setKQ]=useState("1");
  const [showCollect,setShowCollect]=useState(null); // {animal, produce}
  const [collectQty,setCollectQty]=useState("");
  const [form,setForm]=useState({name:"",type:"Chicken",breed:"",count:"1",cost:""});

  const breedOptions = BREEDS[form.type] || [];
  const selectedBreed = breedOptions.find(b => b.name === form.breed);

  const add=()=>{
    const nd={...data,livestock:{animals:[...data.livestock.animals,{...form,id:uid(),count:+form.count||1}]},log:appendLog(data.log,{text:`🐄 Added ${form.count} ${form.type}${form.breed?` (${form.breed})`:""}`})};
    if(form.cost&&+form.cost>0)nd.costs={items:[...(data.costs?.items||[]),{id:uid(),type:"expense",amount:+form.cost,label:`${form.type}${form.breed?` ${form.breed}`:""}`,date:todayLocalKey(),cat:"Animals"}]};
    setData(nd);setForm({name:"",type:"Chicken",breed:"",count:"1",cost:""});setShowAdd(false);
  };
  // del moved into AnimalOverlay component — no longer needed here

  const doCollect=(animal, produce, qty)=>{
    const db=LDB[animal.type];if(!db)return;
    const p=db.out[produce];if(!p)return;
    const finalQty = qty > 0 ? qty : Math.round(p.p*animal.count*10)/10;
    setData({...data,
      pantry:{items:[...data.pantry.items,{id:uid(),name:`${animal.type} ${produce}`,category:produce==="Eggs"?"Eggs":produce==="Meat"?"Meat":"Dairy",qty:finalQty,unit:produce==="Eggs"?"eggs":"kg",source:"livestock",addedDate:todayLocalKey(),storageNote:p.s}]},
      log:appendLog(data.log,{text:`Collected ${finalQty} ${produce==="Eggs"?"eggs":produce.toLowerCase()} from ${animal.name||animal.type}`})
    });
    setShowCollect(null);setCollectQty("");
  };

  const kill=a=>{const db=LDB[a.type];if(!db)return;const q=+kQ||1;if(q>a.count)return;const mp=db.out.Meat;if(!mp)return;const mq=Math.round(mp.p*q*10)/10;setData({...data,livestock:{animals:data.livestock.animals.map(x=>x.id===a.id?(x.count-q<=0?null:{...x,count:x.count-q}):x).filter(Boolean)},pantry:{items:[...data.pantry.items,{id:uid(),name:`${a.type} Meat`,category:"Meat",qty:mq,unit:"kg",source:"livestock",addedDate:todayLocalKey(),storageNote:mp.s}]},log:appendLog(data.log,{text:`🔪 ${q} ${a.type} → ${mq}kg`})});setShowK(null);};
  const sa=sel?data.livestock.animals.find(a=>a.id===sel):null;

  return (
    <div className="page-enter" style={SX.mw800}>
      <div style={SX.pageHead}><div><h2 style={SX.headerH2}>🐄 Livestock</h2><p style={SX.pageSubHead}>Manage your animals, collect produce, track care</p></div><Btn onClick={()=>setShowAdd(true)}>+ Add</Btn></div>
      <Stat label="Total" value={data.livestock.animals.reduce((s,a)=>s+a.count,0)}/>
      <div style={{marginTop:16,display:"grid",gap:8}}>{data.livestock.animals.length===0?<Card style={{textAlign:"center",padding:"56px 24px",background:C.grdLight}}><div style={SX.emptyIcon}>🐄</div><div style={SX.s15Bold}>No animals yet</div><div style={{color:C.t2,marginTop:6,fontSize:12.5}}>Add chickens, goats, or any livestock to track them</div></Card>:data.livestock.animals.map(a=>{const db=LDB[a.type];return (
        <Card key={a.id}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setSel(a.id)}>
            <span style={{fontSize:28}}>{db?.e}</span><div><strong style={{fontSize:15}}>{a.name||a.type}</strong>{a.breed?<span style={SX.t2_12}> ({a.breed})</span>:null}<div style={SX.t2_12}>×{a.count} · Tap for guide</div></div>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {db?.prod.includes("Eggs")&&<Btn sm v="secondary" onClick={()=>{setShowCollect({animal:a,produce:"Eggs"});setCollectQty(String(Math.round(a.count*0.7)))}}>🥚 Collect Eggs</Btn>}
            {db?.prod.includes("Milk")&&<Btn sm v="secondary" onClick={()=>{setShowCollect({animal:a,produce:"Milk"});setCollectQty(String(Math.round(a.count*2.5*10)/10))}}>🥛 Milk</Btn>}
            {db?.prod.includes("Honey")&&<Btn sm v="secondary" onClick={()=>{setShowCollect({animal:a,produce:"Honey"});setCollectQty(String(Math.round(a.count*0.5*10)/10))}}>🍯 Honey</Btn>}
            {db?.prod.includes("Wool")&&<Btn sm v="secondary" onClick={()=>{setShowCollect({animal:a,produce:"Wool"});setCollectQty(String(a.count*3))}}>🧶 Wool</Btn>}
            {db?.prod.includes("Meat")&&<Btn sm v="danger" onClick={()=>{setShowK(a);setKQ("1")}}>🔪</Btn>}
          </div>
        </div></Card>
      );})}</div>

      {/* Manual Collection Modal */}
      {showCollect&&<Overlay title={`Collect ${showCollect.produce}`} onClose={()=>setShowCollect(null)}>
        <div style={{textAlign:"center",marginBottom:16}}>
          <span style={{fontSize:48}}>{showCollect.produce==="Eggs"?"🥚":showCollect.produce==="Milk"?"🥛":showCollect.produce==="Honey"?"🍯":"🧶"}</span>
          <div style={{fontSize:15,fontWeight:600,marginTop:8}}>From {showCollect.animal.name||showCollect.animal.type} (×{showCollect.animal.count})</div>
        </div>
        <Inp label={`Quantity (${showCollect.produce==="Eggs"?"eggs":"kg"})`} type="number" min="0" step={showCollect.produce==="Eggs"?"1":"0.1"} value={collectQty} onChange={e=>setCollectQty(e.target.value)} />
        <div style={{fontSize:12,color:C.t2,marginBottom:12}}>Suggested daily: ~{LDB[showCollect.animal.type]?.out[showCollect.produce]?.p||0} {LDB[showCollect.animal.type]?.out[showCollect.produce]?.u||""} per animal</div>
        <div style={SX.btnRowEnd}>
          <Btn v="secondary" onClick={()=>setShowCollect(null)}>Cancel</Btn>
          <Btn v="success" onClick={()=>doCollect(showCollect.animal,showCollect.produce,+collectQty||0)}>Collect → Pantry</Btn>
        </div>
      </Overlay>}

      {/* Care Guide */}
      {sa && <AnimalOverlay animal={sa} data={data} setData={setData} onClose={()=>setSel(null)}/>}

      {/* Process/Kill Modal */}
      {showK&&<Overlay title={`🔪 Process ${showK.name||showK.type}`} onClose={()=>setShowK(null)}>
        <Inp label={`Qty (max ${showK.count})`} type="number" min="1" max={showK.count} value={kQ} onChange={e=>setKQ(e.target.value)}/>
        {LDB[showK.type]?.out.Meat&&<div style={{fontSize:13,marginBottom:12}}>Estimated: <strong>{Math.round(LDB[showK.type].out.Meat.p*(+kQ||1)*10)/10}kg</strong> meat</div>}
        <div style={SX.btnRowEnd}><Btn v="secondary" onClick={()=>setShowK(null)}>Cancel</Btn><Btn v="danger" onClick={()=>kill(showK)}>Process</Btn></div>
      </Overlay>}

      {/* Add Animal Modal — with breed dropdown */}
      {showAdd&&<Overlay title="🐄 Add Animal" onClose={()=>setShowAdd(false)}>
        <Sel label="Animal Type" value={form.type} onChange={e=>setForm({...form,type:e.target.value,breed:""})} options={Object.entries(LDB).map(([k,v])=>({value:k,label:`${v.e} ${k} — ${v.prod.join(", ")}`}))}/>
        {breedOptions.length > 0 && (
          <Sel label="Breed" value={form.breed} onChange={e=>setForm({...form,breed:e.target.value})} options={[{value:"",label:"— Select breed —"},...breedOptions.map(b=>({value:b.name,label:b.name}))]}/>
        )}
        {selectedBreed && <Card style={{marginBottom:12,background:"#e8f5e9",padding:12}}><div style={SX.lblGreen}>🧬 {selectedBreed.name}</div><div style={{fontSize:12,marginTop:4}}>{selectedBreed.note}</div></Card>}
        <Inp label="Name / Label" placeholder="e.g. Layer Flock A" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        <div style={SX.grid2}>
          <Inp label="Count" type="number" min="1" value={form.count} onChange={e=>setForm({...form,count:e.target.value})}/>
          <Inp label="Cost (€)" type="number" value={form.cost} onChange={e=>setForm({...form,cost:e.target.value})}/>
        </div>
        <div style={SX.btnRowEnd}><Btn v="secondary" onClick={()=>setShowAdd(false)}>Cancel</Btn><Btn onClick={add}>Add</Btn></div>
      </Overlay>}
    </div>
  );
}

export default Livestock;
