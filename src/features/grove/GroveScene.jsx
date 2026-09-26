import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {Pencil,Plus,Minus,Maximize2} from 'lucide-react';
import {rCM} from '../../lib/regional';
import {todayLocalKey} from '../../lib/utils';
import {resolveEnvironment} from '../../lib/environment';
import {isPlantZone} from '../farm/living/visuals';
import {zoneGeometry,growthOf,animalZone,bedRows} from '../quiet/farm-model';
import GroveZoneCard from './GroveZoneCard';
import {AerialDefs,Building,CropCrown,Fence,OverheadAnimal,Ornament,Canopy} from './AerialArtwork';
import {accessPaths,plantedRows,plantPosition,buildingScale} from './aerial-layout';
import {srand} from './sceneMath';

const points=ps=>ps.map(q=>`${q.xM},${q.yM}`).join(' ');
const buildings=new Set(['house','barn','storage','beehive','compost','greenhouse']);
function Plantings({z,plots,crops,id}) {
 const rows=plantedRows(z,plots),vertical=z.rowAxis==='vertical',orchard=z.type==='orchard';
 const cross=vertical?z.wM:z.hM,along=vertical?z.hM:z.wM;
 const gap=cross/rows.length, margin=Math.min(.14,along*.07);
 return <g pointerEvents="none">{rows.map((row,i)=>{
  const pos=row.atM??(i+.5)*gap, length=row.pitch?row.planting.layout.lengthM:(along-margin*2)*row.fraction;
  const stage=row.planting?growthOf(row.planting,crops.get(row.planting.crop),todayLocalKey()).index:0;
  const n=Math.min(orchard?12:24,row.count||(row.planting&&!row.planting.plantCount?4:0));
  const size=Math.min((row.pitch||gap)*.95,length/Math.max(1,n)*1.15,orchard?4:.85);
  return <g key={i}>
   {!orchard&&<path d={vertical?`M${pos} ${margin}v${along-margin*2}`:`M${margin} ${pos}h${along-margin*2}`} stroke="#271e14" strokeOpacity=".23" strokeWidth={gap*.74} strokeLinecap="butt"/>}
   {!orchard&&<path d={vertical?`M${pos-gap*.38} ${margin}v${along-margin*2}`:`M${margin} ${pos-gap*.38}h${along-margin*2}`} stroke="#c9b080" strokeOpacity=".16" strokeWidth=".025"/>}
   {Array.from({length:n},(_,j)=>{const at=(row.pitch?0:margin)+plantPosition(row,j,n)*length;return <CropCrown key={j} x={vertical?pos:at} y={vertical?at:pos} size={size} crop={row.planting.crop} stage={stage} id={id} seed={i*39+j}/>;})}
  </g>;
 })}{plots.filter(p=>p.zone===z.id&&p.status!=='harvested'&&p.layout?.pattern==='scatter').flatMap(p=>(p.layout.points||[]).map((q,i)=><CropCrown key={`${p.id}-${i}`} x={q.xM} y={q.yM} crop={p.crop} stage={growthOf(p,crops.get(p.crop),todayLocalKey()).index} size={Math.min(4,p.layout.spacingCM/100*.9)} id={id} seed={i}/>))}</g>;
}
function Area({z,data,crops,id,selected,interactive,onClick,onPointerDown,onKeyDown}) {
 const w=z.wM,h=z.hM,plant=isPlantZone(z.type),building=buildings.has(z.type),oval=z.shape==='oval'&&!plant&&!building;
 const material=z.material==='stone'?`url(#${id}-stone)`:z.material==='metal'?'#9ba7a0':z.color==='clay'?'#b09a76':'#bfb69b';
 const animals=(data.livestock?.animals||[]).filter(a=>animalZone(a,data.zones)?.id===z.id);
 const fill=z.type==='water'?`url(#${id}-water)`:plant&&z.type!=='orchard'?`url(#${id}-soil)`:`url(#${id}-meadow)`;
 const shapeProps={fill,stroke:z.type==='water'?'#b6b59b':plant?material:'#819267',strokeWidth:plant&&z.type!=='orchard'?.1:.04};
 return <g transform={`translate(${z.xM} ${z.yM})`} className="quiet-zone" role={interactive?'button':undefined} tabIndex={interactive?0:undefined} aria-label={`${z.name}, ${w} by ${h} metres${plant&&z.type!=='orchard'?`, ${bedRows(z)} rows`:''}. Open details`} onClick={onClick} onKeyDown={onKeyDown} onPointerDown={onPointerDown}>
   <rect x="-.06" y="-.06" width={w+.12} height={h+.12} fill="transparent"/>
   {!building&&<g filter={plant||z.type==='water'?`url(#${id}-shadow)`:undefined}>
    {oval?<ellipse cx={w/2} cy={h/2} rx={w/2} ry={h/2} {...shapeProps}/>:<rect width={w} height={h} rx={z.type==='water'?Math.min(w,h)*.1:.025} {...shapeProps}/>}
    {plant&&z.type!=='orchard'&&<><path d={`M.035 ${h-.045}V.045H${w-.035}`} stroke="#e6d8b5" strokeOpacity=".65" strokeWidth=".025" fill="none"/><path d={`M.065 ${h-.09}H${w-.08}V.07`} stroke="#362b1e" strokeOpacity=".45" strokeWidth=".04" fill="none"/></>}
    {z.type==='water'&&<path d={`M${w*.2} ${h*.3}q${w*.13} ${-h*.04} ${w*.26} 0m${-w*.12} ${h*.06}q${w*.13} ${-h*.04} ${w*.26} 0`} stroke="#d4e0c6" strokeWidth=".02" opacity=".5" fill="none"/>}
   </g>}
   {building?<Building type={z.type} w={w} h={h} id={id} clay={z.color==='clay'}><Plantings z={z} plots={data.garden?.plots||[]} crops={crops} id={id}/></Building>:plant?<Plantings z={z} plots={data.garden?.plots||[]} crops={crops} id={id}/>:null}
   {['pasture','orchard'].includes(z.type)&&<Fence w={w} h={h} id={id} gate pickets={z.type==='orchard'}/>}
   {animals.slice(0,5).map((a,i)=>Array.from({length:Math.min(9,a.count||1)},(_,j)=>{
    const bird=['Chicken','Duck','Goose','Turkey','Quail','Guinea Fowl','Bee'].includes(a.type);
    const front=buildingScale(w,h,'barn').front;const size=Math.min(1,(w*.7)/(bird?1:3),(z.type==='barn'?front:h*.7)/(bird?.7:2.1));
    const xx=w*(.16+srand(i*31+j+10)*.68),yy=z.type==='barn'?h-front*.5+(srand(i*29+j+5)-.5)*front*.2:h*(.18+srand(i*29+j+5)*.62);
    return <OverheadAnimal key={`${a.id}-${j}`} species={a.type} x={xx} y={yy} id={id} size={size} angle={srand(j+i*70)*270}/>;
   }))}
   {selected&&<rect x="-.15" y="-.15" width={w+.3} height={h+.3} rx=".1" fill="#e4f0d910" stroke="#f4f9e8" strokeWidth=".12" pointerEvents="none"/>}
   <rect className="q-area-focus" x="-.2" y="-.2" width={w+.4} height={h+.4} rx=".12" fill="none" stroke="#245f4b" strokeWidth=".07" pointerEvents="none"/>
 </g>;
}

export default function GroveScene({data,setData,tasksByZone={},onEditLayout,onPlantInZone,onShowCrops,onZoneClick,interactive=true,showEditButton=true,showHelperText=true,noBorder=false,edit=null,activeZoneId,route=[]}) {
 const id=useId().replace(/:/g,'');
 const svg=useRef(null),drag=useRef(null),moved=useRef(false);
 const [selected,setSelected]=useState(null),[zoom,setZoom]=useState(1),[screenWidth,setScreenWidth]=useState(800);
 useEffect(()=>{const observer=new ResizeObserver(entries=>setScreenWidth(entries[0].contentRect.width));observer.observe(svg.current.parentElement);return()=>observer.disconnect();},[]);
 const fW=Math.max(1,data.farmW||100),fH=Math.max(1,data.farmH||60),env=resolveEnvironment(data);
 const margin=Math.max(.4,Math.min(3,Math.min(fW,fH)*.065));
 const viewW=fW+margin*2,viewH=fH+margin*2;
 const labelUnit=viewW/Math.max(240,screenWidth)/zoom,selectedId=edit?.selectedId||activeZoneId;
 const zones=useMemo(()=>(data.zones||[]).map((z,i)=>zoneGeometry(z,fW,fH,i)),[data.zones,fW,fH]);
 const cropMap=useMemo(()=>rCM(data.region),[data.region]);
 const roads=useMemo(()=>data.roadsEnabled===false?[]:accessPaths(zones,fW,fH,data.mapLines),[zones,fW,fH,data.roadsEnabled,data.mapLines]);
 const roadWidth=Math.max(.25,Math.min(.75,Math.min(fW,fH)*.04));
 const style=data.mapStyle||{},ground=style.groundMaterial||(env==='balcony'?'stone':'meadow');
 const pathTexture=style.pathMaterial==='earth'?'soil':style.pathMaterial||'gravel';
 const pathColor=({light:'#cccac0',warm:'#b6a17c',dark:'#767b73'})[style.pathColor]||'#cccac0';
 const groundTint=({natural:'#567635',dry:'#c2ac65',deep:'#163e29'})[style.groundColor]||'#567635';
 const selectedZone=zones.find(z=>z.id===selected);
 const canInteract=interactive||!!edit;
 function coords(e){const matrix=svg.current.getScreenCTM();if(!matrix)return {xM:0,yM:0};const q=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());return {xM:q.x,yM:q.y};}
 function start(e,z,resize=false){if(!edit||edit.armed||edit.ornamentMode||e.button!==0)return;e.preventDefault();e.stopPropagation();moved.current=false;edit.onSelect(z.id);drag.current={id:z.id,resize,start:coords(e),orig:z};e.currentTarget.setPointerCapture(e.pointerId);}
 function startOrnament(e,o){if(!edit||edit.armed||e.button!==0)return;e.preventDefault();e.stopPropagation();moved.current=false;edit.onOrnamentSelect?.(o.id);drag.current={id:o.id,ornament:true,start:coords(e),orig:o};e.currentTarget.setPointerCapture(e.pointerId);}
 function move(e){if(!drag.current)return;const q=coords(e),d=drag.current,dx=q.xM-d.start.xM,dy=q.yM-d.start.yM;if(Math.abs(dx)+Math.abs(dy)>.03)moved.current=true;if(!moved.current)return;if(!d.begun){d.begun=true;edit.onBeginEdit?.();}if(d.ornament){edit.onOrnamentMove?.(d.id,d.orig.xM+dx,d.orig.yM+dy);return;}edit.onZoneGeom(d.id,d.resize?{...d.orig,wM:d.orig.wM+dx,hM:d.orig.hM+dy}:{...d.orig,xM:d.orig.xM+dx,yM:d.orig.yM+dy});}
 function end(){if(drag.current?.begun)edit?.onEndEdit?.();drag.current=null;}
 function open(e,z){e.stopPropagation();if(moved.current){moved.current=false;return;}if(edit){if(edit.armed){const q=e.detail===0?{xM:z.xM,yM:z.yM}:coords(e);edit.onPlaceAt(q.xM,q.yM);}else edit.onSelect(z.id);return;}if(!interactive)return;if(onZoneClick)onZoneClick(z);else setSelected(z.id);}
 function key(e,z){if(e.key==='Enter'||e.key===' '){e.preventDefault();open(e,z);}else if(edit&&!edit.armed&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();edit.onSelect(z.id);const step=e.shiftKey?1:.1;edit.onZoneGeom(z.id,{...z,xM:z.xM+(e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0),yM:z.yM+(e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0)});}}
 const scaleMetres=fW>=40?10:fW>=15?2:1;
 return <section className={`quiet-scene q-aerial-scene ${noBorder?'borderless':''}`} data-grove-scene="aerial">
 {!edit&&<div className="quiet-map-top"><span>{env==='balcony'?'Your balcony':env==='backyard'?'Your garden':'Your farm'} <small>{fW} × {fH} m</small></span>{showEditButton&&onEditLayout&&<button className="q-icon" aria-label="Edit farm layout" onClick={onEditLayout}><Pencil size={17}/></button>}</div>}
 <div className="quiet-map-scroll" data-zoom={zoom} style={{overflow:zoom>1?'auto':'hidden'}}>
 <svg ref={svg} viewBox={`${-margin} ${-margin} ${viewW} ${viewH}`} style={{width:`${zoom*100}%`,display:'block',touchAction:edit?'none':'auto',userSelect:'none',WebkitUserSelect:'none',WebkitTouchCallout:'none'}} aria-label="Interactive overhead farm map" onDragStart={e=>e.preventDefault()} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onClick={e=>{if(edit){if(moved.current){moved.current=false;return;}const q=coords(e);if(edit.armed)edit.onPlaceAt(q.xM,q.yM);else edit.onSelect(null);}}} onDragOver={e=>{if(edit)e.preventDefault();}} onDrop={e=>{if(edit){e.preventDefault();const q=coords(e);edit.onPlaceAt(q.xM,q.yM,e.dataTransfer.getData(edit.dragType));}}}>
  <AerialDefs id={id}/>
  <defs><clipPath id={`${id}-boundary`}><rect width={fW} height={fH}/></clipPath><linearGradient id={`${id}-sun`} x2="1" y2="1"><stop stopColor="#fff0b1" stopOpacity=".04"/><stop offset="1" stopColor="#183b2a" stopOpacity=".08"/></linearGradient></defs>
  <rect x={-margin} y={-margin} width={viewW} height={viewH} fill="#6e8640"/>
  <rect x={-margin} y={-margin} width={viewW} height={viewH} fill={`url(#${id}-${ground})`} opacity=".82"/>
  <rect x={-margin} y={-margin} width={viewW} height={viewH} fill={groundTint} opacity={style.groundColor&&style.groundColor!=='natural'?.22:.03}/><rect x={-margin} y={-margin} width={viewW} height={viewH} fill={`url(#${id}-lawn)`} opacity={ground==='meadow'?1:0}/>
  <rect x="-.10" y="-.1" width={fW+.2} height={fH+.2} rx=".08" fill="none" stroke="#384c2e" strokeWidth=".18" opacity=".15"/>
  <rect width={fW} height={fH} fill="none" stroke="#c0c4b1" strokeWidth=".12"/>
  {env!=='balcony'&&Array.from({length:Math.min(100,Math.ceil((fW+fH)/2))},(_,i)=>{
   const edge=i%4,t=srand(i+91),r=margin*(.48+srand(i+25)*.46);
   const x=edge===0?-margin*.83:edge===1?fW+margin*.83:t*fW;
   const y=edge===2?-margin*.82:edge===3?fH+margin*.88:t*fH;
   return <Canopy key={i} x={x} y={y} r={r} id={id}/>;
  })}

  <g clipPath={`url(#${id}-boundary)`}>
   <g fill="none" strokeLinejoin="round" strokeLinecap="round">{roads.map((line,i)=><polyline key={i} points={points(line)} stroke="#71825b" strokeWidth={roadWidth+.15}/>)}{roads.map((line,i)=><polyline key={i} points={points(line)} stroke={pathColor} strokeWidth={roadWidth}/>)}{roads.map((line,i)=><polyline key={i} points={points(line)} stroke={`url(#${id}-${pathTexture})`} strokeWidth={roadWidth-.06} opacity=".42"/>)}</g>
   {(data.mapLines||[]).filter(l=>l.kind==='path').map(l=><polyline key={l.id} points={points(l.points)} fill="none" stroke={pathColor} strokeWidth={roadWidth} strokeLinejoin="round"/>)}
   {zones.map(z=><Area key={z.id} z={z} data={data} crops={cropMap} id={id} selected={selectedId===z.id} interactive={canInteract} onClick={e=>open(e,z)} onPointerDown={e=>start(e,z)} onKeyDown={e=>key(e,z)}/>)}
   {(data.mapLines||[]).filter(l=>l.kind!=='path').map(l=><g key={l.id} filter={`url(#${id}-shadow)`}><polyline points={points(l.points)} fill="none" stroke="#6c7055" strokeWidth=".13"/><polyline points={points(l.points.map(p=>({...p,xM:p.xM-.02,yM:p.yM-.02})))} fill="none" stroke="#dbceb0" strokeWidth=".04"/>{l.points.map((p,i)=><rect key={i} x={p.xM-.08} y={p.yM-.08} width=".16" height=".16" fill="#e0d4b8"/>)}{l.kind==='gate'&&l.points.length>1&&<polyline points={points(l.points)} stroke="#687863" strokeWidth=".2" strokeDasharray=".06 .04" fill="none"/>}</g>)}
   {(data.ornaments||[]).map(o=><g key={o.id} role={edit?'button':undefined} tabIndex={edit?0:undefined} aria-label={`${o.type} decoration`} transform={`translate(${o.xM} ${o.yM})`} onPointerDown={e=>startOrnament(e,o)} onClick={e=>{e.stopPropagation();if(edit?.armed){const q=coords(e);edit.onPlaceAt(q.xM,q.yM);}else edit?.onOrnamentSelect?.(o.id);}} onKeyDown={e=>{if(edit&&(e.key==='Enter'||e.key===' ')){e.preventDefault();edit.onOrnamentSelect?.(o.id);}}}><Ornament o={o} id={id}/>{edit?.ornamentSelectedId===o.id&&<circle r=".65" fill="none" stroke="#f4f8e7" strokeWidth=".08"/>}</g>)}
  </g>
  <rect x={-margin} y={-margin} width={viewW} height={viewH} fill={`url(#${id}-sun)`} pointerEvents="none"/>
  {route.length>1&&<polyline points={points(route.map(s=>({xM:s.cx/100*fW,yM:s.cy/100*fH})))} fill="none" stroke="#f4f6df" strokeWidth=".065" strokeDasharray=".14 .14" pointerEvents="none"/>}
  {zones.map(z=>{const marks=tasksByZone[z.id],count=Array.isArray(marks)?marks.reduce((s,m)=>s+m.count,0):marks?1:0;const labelWidth=Math.min(140,z.name.length*5.7+20),cy=Math.min(fH-.18,z.yM+z.hM+.33);return <g key={z.id} transform={`translate(${z.xM+z.wM/2} ${cy}) scale(${labelUnit})`} className="q-map-label" onClick={e=>open(e,z)} style={{cursor:canInteract?'pointer':undefined}} aria-hidden="true"><rect x={-labelWidth/2} y="-9" width={labelWidth} height="21" rx="5" fill={selectedId===z.id?'#2b5948':'#fffffff0'}/><text textAnchor="middle" y="5" fontSize="10.5" fontWeight="600" fill={selectedId===z.id?'white':'#344337'}>{z.name.length>23?z.name.slice(0,22)+'…':z.name}</text>{count>0&&<g transform={`translate(${labelWidth/2-2} -9)`}><circle r="7.5" fill="#f5f1df" stroke="#93a47c" strokeWidth="1"/><text textAnchor="middle" y="3" fontSize="8.5" fill="#3d5b3e">{count}</text></g>}</g>;})}
  {edit&&zones.filter(z=>z.id===edit.selectedId).map(z=><g key={z.id}><g transform={`translate(${z.xM+z.wM} ${z.yM+z.hM}) scale(${labelUnit})`} onPointerDown={e=>start(e,z,true)} onClick={e=>e.stopPropagation()} style={{cursor:'nwse-resize'}}><circle r="22" fill="transparent"/><circle r="9" fill="#295f4c" stroke="white" strokeWidth="2"/><path d="M-4 4L4-4M-1-4H4V1M-4-1V4H1" fill="none" stroke="white" strokeWidth="1.2"/></g><text x={z.xM+z.wM/2} y={z.yM-.25} fontSize={11*labelUnit} textAnchor="middle" fill="#203f31" stroke="#eff3dc" strokeWidth={2*labelUnit} paintOrder="stroke">{z.wM} × {z.hM} m</text></g>)}
  <g transform={`translate(${margin*.45} ${fH+margin*.53})`} pointerEvents="none"><path d={`M0 -.08V.08M0 0H${scaleMetres}M${scaleMetres} -.08V.08`} stroke="#f8f7e5" strokeWidth=".035"/><text x={scaleMetres/2} y={-.14} textAnchor="middle" fontSize={8*labelUnit} fill="#354b35">{scaleMetres} m</text></g>
  <g transform={`translate(${fW/2} ${fH})`} pointerEvents="none"><path d="M-.45-.1V.12M.45-.1V.12M-.45 .03H.45" stroke="#e1d6b7" strokeWidth=".06"/><text y={Math.max(.3,10*labelUnit)} textAnchor="middle" fontSize={8*labelUnit} fill="#354b35">Entrance</text></g>
 </svg></div>
 <div className="quiet-map-bottom"><span>{edit?'Drag to move · corner to resize':showHelperText?'Tap an area to explore':'Growth stages are estimates'}</span><div className="q-row"><button className="q-icon" aria-label="Zoom out map" onClick={()=>setZoom(Math.max(1,zoom-.5))} disabled={zoom===1}><Minus size={16}/></button><button className="q-icon" aria-label="Reset map zoom" onClick={()=>setZoom(1)}><Maximize2 size={16}/></button><button className="q-icon" aria-label="Zoom in map" onClick={()=>setZoom(Math.min(3,zoom+.5))} disabled={zoom===3}><Plus size={16}/></button></div></div>
 {zones.length===0&&<p className="q-empty">Make this space yours. Add your first bed in Edit layout.</p>}
 {selectedZone&&<GroveZoneCard zone={selectedZone} data={data} setData={setData} onClose={()=>setSelected(null)} onPlantInZone={onPlantInZone} onEditLayout={onEditLayout} onShowCrops={onShowCrops}/>}
 </section>;
}
