import {useState} from 'react';
import {uid} from '../../lib/storage';
export default function MapLines({data,setData}) {
 const [form,setForm]=useState({kind:'path',x1:0,y1:0,x2:2,y2:2});
 const keys=[['x1','Start X'],['y1','Start Y'],['x2','End X'],['y2','End Y']];
 function add(){const p=(x,y)=>({xM:Math.max(0,Math.min(data.farmW||100,+x||0)),yM:Math.max(0,Math.min(data.farmH||60,+y||0))});setData({...data,mapLines:[...(data.mapLines||[]),{id:uid(),kind:form.kind,points:[p(form.x1,form.y1),p(form.x2,form.y2)]}]});}
 return <details className="q-inset"><summary>Paths, fences & gates</summary><p>Enter endpoints in metres from the top-left corner of the layout. Add connected segments for a bend.</p><label>Type<select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})}><option value="path">Path</option><option value="fence">Fence</option><option value="gate">Gate</option></select></label><div className="q-grid2">{keys.map(([key,label])=><label key={key}>{label} (m)<input type="number" min="0" step=".1" value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}</div><button className="q-secondary" onClick={add}>Add {form.kind}</button>{(data.mapLines||[]).map((l,i)=><div className="q-row q-between" key={l.id}><span>{l.kind} {i+1} · {l.points.map(p=>`${p.xM}, ${p.yM}`).join(' → ')}</span><button className="q-text-button" onClick={()=>setData({...data,mapLines:data.mapLines.filter(a=>a.id!==l.id)})}>Remove</button></div>)}</details>;
}
