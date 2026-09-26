import {useId,useState,useRef,useEffect} from 'react';
import {Plus,Minus,Maximize2} from 'lucide-react';
import {AerialDefs,CropCrown,Fence} from '../grove/AerialArtwork';
import {plantedRows,plantPosition} from '../grove/aerial-layout';
import {growthOf} from './farm-model';
import {todayLocalKey} from '../../lib/utils';
export default function BedPlan({zone,plots,crops,onPlot}){
 const id=useId().replace(/:/g,''),[zoom,setZoom]=useState(1),[pages,setPages]=useState({}),[width,setWidth]=useState(360),container=useRef(null);
 useEffect(()=>{const o=new ResizeObserver(e=>setWidth(e[0].contentRect.width));o.observe(container.current);return()=>o.disconnect();},[]);
 const rows=plantedRows(zone,plots).filter(r=>zone.type!=='orchard'||r.planting),vertical=zone.rowAxis==='vertical',orchard=zone.type==='orchard';
 const scatter=plots.filter(p=>p.zone===zone.id&&p.status!=='harvested'&&p.layout?.pattern==='scatter');
 const w=zone.wM,h=zone.hM,cross=vertical?w:h,along=vertical?h:w,gap=cross/Math.max(1,rows.length);
 const centers=rows.map((r,i)=>r.atM??(i+.5)*gap);
 const minGap=Math.max(.01,Math.min(gap,...centers.slice(1).map((at,i)=>at-centers[i]))),baseWidth=Math.max(width,Math.min(3000,w/minGap*20));
 const unit=w/baseWidth/zoom,font=unit*12,gutter=orchard?.1:unit*42;
 return <><div ref={container} className="q-bed-plan-scroll"><svg className="q-bed-plan" style={{width:baseWidth*zoom}} viewBox={`${-gutter} -.12 ${w+gutter+.12} ${h+(vertical?gutter:.12)}`} aria-label={`${zone.name}: ${w} by ${h} metres${orchard?'':`, ${rows.length} planting rows`}`}>
 <AerialDefs id={id}/><rect width={w} height={h} fill={`url(#${id}-${orchard?'meadow':'soil'})`} stroke={`url(#${id}-wood)`} strokeWidth=".1"/>
 {rows.map((row,i)=>{
  const p=row.planting,l=p?.layout,stage=p?growthOf(p,crops.get(p.crop),todayLocalKey()).index:0,at=row.atM??(i+.5)*gap;
  const page=Math.min(pages[row.number]||0,Math.max(0,Math.ceil(row.count/100)-1)),first=page*100,count=Math.min(100,row.count-first),edge=Math.min(.1,along*.05);
  const length=(along-edge*2)*row.fraction,size=row.pitch?Math.min(row.pitch*.95,orchard?4:.85):Math.min(gap*.9,length/Math.max(1,row.count),orchard?3:.85);
  const interactive=!!p&&!!onPlot;
  return <g key={row.number} role={interactive?'button':undefined} tabIndex={interactive?0:undefined} className={interactive?'q-bed-row-link':''} aria-label={`Row ${row.number}: ${p?.crop||'available'}, ${row.count} plants`} onClick={interactive?()=>onPlot(p.id):undefined} onKeyDown={interactive?e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onPlot(p.id);}}:undefined}>
   {!orchard&&<path d={vertical?`M${at} ${edge}v${along-edge*2}`:`M${edge} ${at}h${along-edge*2}`} stroke="#21150e" strokeOpacity=".2" strokeWidth={(row.gapM||gap)*.75} strokeLinecap="butt"/>}
   <rect x={vertical?at-(row.gapM||gap)/2:0} y={vertical?0:at-(row.gapM||gap)/2} width={vertical?(row.gapM||gap):w} height={vertical?h:(row.gapM||gap)} fill="transparent"/>
   {Array.from({length:count},(_,j)=>{const pos=row.pitch?plantPosition(row,first+j)*l.lengthM:edge+plantPosition(row,first+j)*length;return <CropCrown key={j} crop={p.crop} stage={stage} x={vertical?at:pos} y={vertical?pos:at} size={size} id={id} seed={i*103+first+j}/>;})}
   {!orchard&&<g transform={`translate(${vertical?at:-gutter/2} ${vertical?h+gutter/2:at})`} pointerEvents="none"><rect x={-font*1.35} y={-font*.85} width={font*2.7} height={font*1.7} rx={font*.4} fill="#fff" stroke="#bbc5b6" strokeWidth={unit}/><text className="q-row-number" textAnchor="middle" dominantBaseline="central" fill="#203e2b" fontSize={font} fontWeight="700" style={{direction:'ltr',unicodeBidi:'isolate',letterSpacing:0}}>{String(row.number)}</text></g>}
  </g>;
 })}
 {scatter.map(p=><g key={p.id} role={onPlot?'button':undefined} tabIndex={onPlot?0:undefined} aria-label={`${p.crop}, ${p.plantCount} scattered trees`} onClick={onPlot?()=>onPlot(p.id):undefined} onKeyDown={onPlot?e=>{if(e.key==='Enter')onPlot(p.id);}:undefined}>{p.layout.points.map((q,i)=><CropCrown key={i} crop={p.crop} stage={growthOf(p,crops.get(p.crop),todayLocalKey()).index} x={q.xM} y={q.yM} size={Math.min(4,p.layout.spacingCM/100*.8)} id={id}/>)}</g>)}
 {orchard&&<Fence w={w} h={h} id={id} gate pickets/>}
 </svg></div><div className="q-row q-between q-bed-plan-tools"><small>One {orchard?'tree':'plant'} per symbol · {w} × {h} m</small><div className="q-row"><button className="q-icon" aria-label="Zoom out bed" disabled={zoom===1} onClick={()=>setZoom(Math.max(1,zoom-.5))}><Minus size={15}/></button><button className="q-icon" aria-label="Reset bed zoom" onClick={()=>setZoom(1)}><Maximize2 size={15}/></button><button className="q-icon" aria-label="Zoom in bed" disabled={zoom===4} onClick={()=>setZoom(Math.min(4,zoom+.5))}><Plus size={15}/></button></div></div>
 {rows.filter(r=>r.count>100).map(r=>{const page=pages[r.number]||0;return <div className="q-bed-pagination" key={r.number}><small>Row {r.number} · plants {page*100+1}–{Math.min(r.count,(page+1)*100)} of {r.count}</small><div className="q-row"><button className="q-text-button" disabled={!page} onClick={()=>setPages({...pages,[r.number]:page-1})}>Previous plants</button><button className="q-text-button" disabled={(page+1)*100>=r.count} onClick={()=>setPages({...pages,[r.number]:page+1})}>Next plants</button></div></div>;})}</>;
}
