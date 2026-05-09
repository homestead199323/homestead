import { useState, useMemo } from "react";
import { Trash2 } from "lucide-react";
import { uid } from "../../lib/storage";
import { todayLocalKey } from "../../lib/utils";
import { C, F, SX } from "../../lib/theme";
import { Btn, Card, Inp, Sel, Overlay, Stat } from "../../components/ui";

/* ═══════════════════════════════════════════
   FINANCIALS
   ═══════════════════════════════════════════ */
export default function Financials({data, setData}) {
  const E = "\u20ac";
  const [showAdd,setShowAdd]=useState(false);
  const [chartMode,setChartMode]=useState("monthly");
  const [chartM,setChartM]=useState(new Date().getMonth());
  const [form,setForm]=useState({type:"expense",amount:"",label:"",cat:"Seeds",date:todayLocalKey()});
  const items = useMemo(() => data.costs?.items || [], [data.costs?.items]);
  const add=()=>{if(!form.amount||!form.label||+form.amount<=0)return;setData({...data,costs:{items:[...items,{...form,id:uid(),amount:Math.abs(+form.amount)}]}});setForm({type:"expense",amount:"",label:"",cat:"Seeds",date:todayLocalKey()});setShowAdd(false);};
  const del=id=>setData({...data,costs:{items:items.filter(i=>i.id!==id)}});
  const {exp,inc,net,catT}=useMemo(()=>{let e=0,r=0;const ct={};items.forEach(i=>{if(i.type==="expense"){e+=i.amount;ct[i.cat]=(ct[i.cat]||0)+i.amount;}else r+=i.amount;});return{exp:e,inc:r,net:r-e,catT:ct};},[items]);
  const mN=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const mData=useMemo(()=>{const acc=Array.from({length:12},()=>({e:0,r:0}));items.forEach(i=>{const m=new Date(i.date).getMonth();if(i.type==="expense")acc[m].e+=i.amount;else acc[m].r+=i.amount;});return acc;},[items]);
  const maxM=Math.max(1,...mData.map(d=>Math.max(d.e,d.r)));
  const dim=new Date(new Date().getFullYear(),chartM+1,0).getDate();
  const dData=useMemo(()=>{const acc=Array.from({length:dim},()=>({e:0,r:0}));const pfx=new Date().getFullYear()+"-"+String(chartM+1).padStart(2,"0")+"-";items.forEach(i=>{if(!i.date.startsWith(pfx))return;const d=parseInt(i.date.slice(-2),10)-1;if(d>=0&&d<dim){if(i.type==="expense")acc[d].e+=i.amount;else acc[d].r+=i.amount;}});return acc;},[items,chartM,dim]);
  const maxD=Math.max(1,...dData.map(d=>Math.max(d.e,d.r)));
  // catT computed in useMemo above
  const last5=items.slice(-5).reverse();

  return (
    <div className="page-enter" style={SX.mw800}>
      <div style={SX.pageHead}>
        <div><h2 style={SX.headerH2}>💰 Financials</h2><p style={SX.pageSubHead}>Income, expenses, and profitability</p></div>
        <Btn onClick={()=>setShowAdd(true)}>+ Add Entry</Btn>
      </div>
      <div className="g3" style={{gap:10,marginBottom:20}}>
        <Stat label="Spent" value={E+exp.toFixed(0)} color={C.red}/>
        <Stat label="Revenue" value={E+inc.toFixed(0)} color={C.green}/>
        <Stat label="Net" value={E+Math.abs(net).toFixed(0)} sub={net>=0?"Profit":"Loss"} color={net>=0?C.green:C.red}/>
      </div>
      <Card style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontSize:15,fontWeight:700,fontFamily:F.head}}>{chartMode==="monthly"?"Monthly Overview":mN[chartM]+" Daily"}</div>
          <div style={{display:"flex",gap:6}}>
            {["monthly","daily"].map(m=><button key={m} onClick={()=>setChartMode(m)} style={{padding:"4px 12px",borderRadius:16,border:"none",background:chartMode===m?C.green:C.card,color:chartMode===m?"#fff":C.t2,fontSize:11,fontWeight:600,cursor:"pointer"}}>{m==="monthly"?"Monthly":"Daily"}</button>)}
          </div>
        </div>
        {chartMode==="daily"&&<div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:12}}><button onClick={()=>setChartM(Math.max(0,chartM-1))} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.t2}}>{"<"}</button><span style={{fontSize:13,fontWeight:600}}>{mN[chartM]}</span><button onClick={()=>setChartM(Math.min(11,chartM+1))} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.t2}}>{">"}</button></div>}
        <div style={{overflowX:"auto"}}>
          <svg viewBox={"0 0 "+(chartMode==="monthly"?360:Math.max(360,dim*14))+" 140"} style={{width:"100%",display:"block"}}>
            {(chartMode==="monthly"?mData:dData).map((d,i)=>{const bw=chartMode==="monthly"?22:8;const gap=chartMode==="monthly"?8:6;const x=i*(bw*2+gap)+20;const mv=chartMode==="monthly"?maxM:maxD;const eH=(d.e/mv)*100;const rH=(d.r/mv)*100;return(
              <g key={i} onClick={()=>{if(chartMode==="monthly"){setChartMode("daily");setChartM(i);}}} style={{cursor:chartMode==="monthly"?"pointer":"default"}}>
                <rect x={x} y={120-eH} width={bw} height={Math.max(0,eH)} rx={3} fill={C.red} opacity=".7"/>
                <rect x={x+bw+2} y={120-rH} width={bw} height={Math.max(0,rH)} rx={3} fill={C.green} opacity=".7"/>
                <text x={x+bw} y={133} textAnchor="middle" fontSize="7" fill={C.t2} fontFamily={F.mono}>{chartMode==="monthly"?mN[i]:(i+1)}</text>
              </g>
            );})}
            <line x1="16" y1="120" x2={chartMode==="monthly"?"350":String(dim*14+10)} y2="120" stroke={C.bdr} strokeWidth="1"/>
          </svg>
        </div>
        <div style={{display:"flex",gap:12,marginTop:8,justifyContent:"center"}}><span style={{fontSize:10,color:C.red}}>{"■"} Expenses</span><span style={{fontSize:10,color:C.green}}>{"■"} Income</span></div>
      </Card>
      {Object.keys(catT).length>0&&<Card style={{marginBottom:16}}><div style={{fontSize:13,fontWeight:700,marginBottom:12}}>Expense Breakdown</div>{Object.entries(catT).sort((a,b)=>b[1]-a[1]).map(([cat,amt])=><div key={cat} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}><div style={{flex:1,fontSize:13}}>{cat}</div><div style={{width:100,height:6,background:C.bdr,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:(amt/exp*100)+"%",background:C.green,borderRadius:3}}/></div><div style={{fontSize:13,fontWeight:600,fontFamily:F.mono,width:60,textAlign:"right"}}>{E}{amt.toFixed(0)}</div></div>)}</Card>}
      <div style={{fontSize:15,fontWeight:700,fontFamily:F.head,marginBottom:10}}>Recent Transactions</div>
      {last5.length===0?<Card style={{textAlign:"center",padding:32}}><div style={{color:C.t2}}>No transactions yet</div></Card>:
      <div style={{display:"grid",gap:6}}>{last5.map(i=>(
        <Card key={i.id}><div style={SX.rowCenterG10}>
          <div style={{width:36,height:36,borderRadius:18,background:i.type==="expense"?"#fce4ec":"#e8f5e9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{i.type==="expense"?"📤":"📥"}</div>
          <div style={SX.flex1}><div style={{fontSize:14,fontWeight:600}}>{i.label}</div><div style={SX.t2_12}>{i.date} {" "} {i.cat}</div></div>
          <div style={{fontSize:16,fontWeight:700,color:i.type==="expense"?C.red:C.green,fontFamily:F.mono}}>{i.type==="expense"?"-":"+"}{E}{i.amount.toFixed(2)}</div>
          <Btn sm v="ghost" onClick={()=>del(i.id)}><Trash2 size={14} strokeWidth={1.8}/></Btn>
        </div></Card>
      ))}</div>}
      {showAdd&&<Overlay title="Add Entry" onClose={()=>setShowAdd(false)}>
        <div style={{display:"flex",gap:8,marginBottom:14}}>{["expense","income"].map(t=><Card key={t} onClick={()=>setForm({...form,type:t})} active={form.type===t} style={{flex:1,textAlign:"center",cursor:"pointer"}}><div style={SX.s20}>{t==="expense"?"📤":"📥"}</div><div style={{fontSize:13,fontWeight:600,marginTop:4}}>{t==="expense"?"Expense":"Income"}</div></Card>)}</div>
        <Inp label="Amount" type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/>
        <Inp label="Description" value={form.label} onChange={e=>setForm({...form,label:e.target.value})}/>
        <div style={SX.grid2}><Sel label="Category" value={form.cat} onChange={e=>setForm({...form,cat:e.target.value})} options={["Seeds","Tools","Feed","Animals","Fuel","Infrastructure","Produce Sales","Other"]}/><Inp label="Date" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></div>
        <div style={SX.btnRowEnd}><Btn v="secondary" onClick={()=>setShowAdd(false)}>Cancel</Btn><Btn onClick={add}>Add</Btn></div>
      </Overlay>}
    </div>
  );
}
