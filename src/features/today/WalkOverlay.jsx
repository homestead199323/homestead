import {useEffect,useRef,useState} from 'react';
import {X,Footprints,Check,Camera,CloudOff,Sun,MapPin,Leaf,TriangleAlert,NotebookPen} from 'lucide-react';
import {uid,flushFarm} from '../../lib/storage';
import {todayLocalKey,appendLog} from '../../lib/utils';
import {rCM} from '../../lib/regional';
import {planRound,roundMinutes} from '../quiet/walk-model';
import {applyTaskCompletion} from '../quiet/complete-task';
import GroveScene from '../grove/GroveScene';
import BedDetail from '../quiet/BedDetail';
import PlantArt from '../quiet/PlantArt';
import AnimalArt from '../quiet/AnimalArt';
import {art} from '../quiet/art';
import {growthOf,animalZone} from '../quiet/farm-model';

function WalkStop({stop,session,data,setData,onAdvance}) {
 const draft=session.draft||{},checked=draft.checked||[],[error,setError]=useState(''),[photoBusy,setPhotoBusy]=useState(false);
 const zone=data.zones.find(z=>z.id===stop.zoneId),plant=['veg','herbs','orchard','greenhouse','raised','container'].includes(stop.type);
 const cropMap=rCM(data.region),plots=data.garden.plots.filter(p=>stop.plotIds.includes(p.id));
 const heroPlot=plots.find(p=>stop.tasks.some(t=>t.plotId===p.id))||plots[0];
 const animal=data.livestock.animals.find(a=>animalZone(a,data.zones)?.id===stop.zoneId);
 const [showNote,setShowNote]=useState(!!draft.note);
 const stage=heroPlot?growthOf(heroPlot,cropMap.get(heroPlot.crop),todayLocalKey()):null;
 const latest=useRef({data,session}),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{latest.current={data,session};},[data,session]);
 const update=patch=>setData({...data,walkSession:{...session,draft:{...draft,...patch}}});
 async function photo(e){const file=e.target.files?.[0];if(!file)return;if(!file.type.startsWith('image/')){setError('Choose an image file.');return;}setPhotoBusy(true);setError('');try{const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas'),scale=Math.min(1,800/Math.max(bitmap.width,bitmap.height));canvas.width=bitmap.width*scale;canvas.height=bitmap.height*scale;canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const photo=canvas.toDataURL('image/jpeg',.65);if(JSON.stringify(latest.current.data).length+photo.length>1800000){setError('This device’s photo journal is nearly full. Export a backup in Settings, then remove older photos from an area’s field journal to make space. Your text notes can still be saved.');return;}const current=latest.current;if(mounted.current&&current.session.id===session.id&&current.session.index===session.index)setData({...current.data,walkSession:{...current.session,draft:{...current.session.draft,photo}}});}catch{setError('This photo could not be read. Try a JPEG or PNG image.');}finally{setPhotoBusy(false);}}
 return <>
 <div className="q-walk-hero">
 {heroPlot?<PlantArt crop={heroPlot.crop} stage={stage.index} size={280}/>:animal?<AnimalArt species={animal.type} size={260}/>:art(stop.type)?<img src={art(stop.type)} alt={stop.label}/>:<img src={art('prop-bush')} alt="Garden foliage"/>}
 </div>
 <div className="q-walk-card"><div className="q-eyebrow">Stop {session.index+1} of {session.stops.length}</div><h2>{heroPlot?`Check your ${heroPlot.crop.toLowerCase()}`:stop.label}</h2><p className="q-walk-question">{heroPlot?"How do the leaves and soil look?":"How is everything looking today?"}</p><details className="q-inset"><summary>What to look for in {stop.label}</summary><p>{plant?'Compare leaves and growth with your previous notes. Look at the underside of leaves, check soil moisture and note wilting, damage or unusual spots. A change is a reason to look closer, not a diagnosis.':'Compare today with what is normal in this area. Check access, shelter and water, and note damage or unusual behaviour.'}</p>{plots.map(p=>{const c=cropMap.get(p.crop);return c?<div key={p.id}><strong>{p.name||p.crop}</strong><p>{c.waterNote||c.waterFreq} · {c.sun}</p></div>:null;})}</details>
 <div className="q-walk-tools">Bring: {stop.tasks.some(t=>t.type==='harvest')?'a harvest basket, ':''}{stop.tasks.some(t=>t.type==='water')?'watering can or hose, ':''}your usual care tools. Only water or harvest after checking what is needed.</div>

 <div className="q-walk-status">{[['healthy','Healthy'],['issue','Needs attention']].map(([key,label])=><button key={key} className="q-secondary" aria-pressed={draft.status===key} onClick={()=>update({status:key})}>{key==='healthy'?<Leaf size={22}/>:<TriangleAlert size={22}/>}<span>{label}</span></button>)}</div>
 <button className="q-text-button q-just-checked" aria-pressed={draft.status==='checked'} onClick={()=>update({status:'checked'})}>{draft.status==='checked'?'✓ Just checked':'Record a check without rating'}</button>
 <div className="q-walk-capture"><button className="q-secondary" onClick={()=>setShowNote(!showNote)} aria-expanded={showNote}><NotebookPen size={17}/> {draft.note?'Edit note':'Add note'}</button><label className="q-secondary q-photo-button"><Camera size={17}/>{photoBusy?'Preparing…':'Add photo'}<input type="file" accept="image/*" capture="environment" onChange={photo} disabled={photoBusy} aria-label="Add a photo"/></label></div>
 {showNote&&<label className="q-note-field">Notes for next time<textarea value={draft.note||''} maxLength={2000} placeholder="What did you notice?" onChange={e=>update({note:e.target.value})}/></label>}
 {draft.photo&&<div><img className="q-photo-preview" src={draft.photo} alt="Observation to save"/><button className="q-text-button" onClick={()=>update({photo:null})}>Remove photo</button></div>}
 {stop.tasks.length>0&&<details className="q-inset q-walk-task-list"><summary>Today’s care · {stop.tasks.length} tasks</summary> {stop.tasks.map(t=>{const done=(data.completions?.[todayLocalKey()]||[]).includes(t.key);return <div className="q-task-row" key={t.key}><input className="q-check" type="checkbox" checked={checked.includes(t.key)||done} disabled={done} aria-label={`Complete ${t.title}`} onChange={e=>update({checked:e.target.checked?[...checked,t.key]:checked.filter(k=>k!==t.key)})}/><div className="q-grow"><strong>{t.title}</strong><p>{t.desc}</p>{t.otherZones?.length>0&&<p className="q-warning">This task covers this species in {t.otherZones.join(', ')} too. Check every group before completing.</p>}{['harvest','eggs'].includes(t.type)&&!done&&<label>Actual {t.type==='harvest'?'harvest (kg)':'eggs collected'}<input style={{width:'100%',boxSizing:'border-box',padding:10,marginTop:5}} type="number" min="0" step={t.type==='eggs'?1:.1} value={draft.amounts?.[t.key]??''} placeholder="Enter the amount you collected" onChange={e=>update({amounts:{...draft.amounts,[t.key]:e.target.value}})}/></label>}</div></div>;})}</details>}
 <details className="q-inset q-walk-map"><summary>See this stop on your farm</summary><GroveScene data={data} interactive={false} showEditButton={false} showHelperText={false} activeZoneId={stop.zoneId} route={session.stops}/></details>
 {plant&&zone&&<details className="q-inset"><summary>Explore this bed & confirm growth stages</summary><BedDetail zone={zone} data={data} setData={setData}/></details>}
 {error&&<p role="alert" className="q-warning">{error}</p>}
 </div><div className="q-walk-footer"><button className="q-secondary" disabled={photoBusy} onClick={()=>onAdvance(false)}>Check later</button><button className="q-button" disabled={photoBusy} onClick={()=>{const invalid=stop.tasks.find(t=>checked.includes(t.key)&&['harvest','eggs'].includes(t.type)&&(!Number.isFinite(+draft.amounts?.[t.key])||+draft.amounts?.[t.key]<=0||(t.type==='eggs'&&!Number.isInteger(+draft.amounts?.[t.key]))));if(invalid){setError('Enter the actual positive quantity for each checked collection task. Leave it unchecked if you collected nothing.');return;}if(!draft.status){setError('Choose how this area is doing before saving your check.');return;}onAdvance(true);}}><Check size={17}/> Save & next</button></div></>;
}
export default function WalkOverlay({tasks,data,setData,onClose}) {
 const [mode,setMode]=useState('quick'),[place,setPlace]=useState('outside'),[startId,setStartId]=useState(''),[online,setOnline]=useState(navigator.onLine);
 const [saveStatus,setSaveStatus]=useState('saved');
 const dialog=useRef(null),close=useRef(onClose);
 useEffect(()=>{close.current=onClose;},[onClose]);
 const lock=useRef(false),session=data.walkSession,active=session?.status==='active',finished=session?.status==='complete';
 const stops=planRound(tasks,data,mode,startId),stop=active?session.stops[session.index]:null;
 useEffect(()=>{const prev=document.body.style.overflow;document.body.style.overflow='hidden';const update=()=>setOnline(navigator.onLine);const saved=e=>setSaveStatus(e.detail);window.addEventListener('farm-save-status',saved);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{flushFarm();window.removeEventListener('farm-save-status',saved);document.body.style.overflow=prev;window.removeEventListener('online',update);window.removeEventListener('offline',update);};},[]);
 useEffect(()=>{
  const previous=document.activeElement,root=dialog.current;
  root.querySelector('button')?.focus();
  function keydown(e){
   if(e.key==='Escape'){e.preventDefault();close.current();return;}
   if(e.key!=='Tab')return;
   const items=[...root.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]')].filter(el=>el.getClientRects().length);
   const first=items[0],last=items.at(-1);
   if(e.shiftKey&&(document.activeElement===first||!root.contains(document.activeElement))){e.preventDefault();last?.focus();}
   else if(!e.shiftKey&&(document.activeElement===last||!root.contains(document.activeElement))){e.preventDefault();first?.focus();}
  }
  root.addEventListener('keydown',keydown);
  return()=>{root.removeEventListener('keydown',keydown);previous?.focus();};
 },[]);
 useEffect(()=>{dialog.current?.scrollTo({top:0});},[session?.index,session?.status]);
 function begin(){setData({...data,walkSession:{id:uid(),status:'active',date:todayLocalKey(),startedAt:new Date().toISOString(),mode,place,stops,index:0,draft:{},visited:[],deferred:[]}});}
 function advance(save){if(lock.current||!stop)return;lock.current=true;let next=data;const draft=session.draft||{};if(save){const selected=stop.tasks.filter(t=>(draft.checked||[]).includes(t.key));selected.forEach(t=>{next=applyTaskCompletion(next,t,draft.amounts?.[t.key]);});const entry={id:uid(),walkId:session.id,at:new Date().toISOString(),zoneId:stop.zoneId,plotIds:stop.plotIds,status:draft.status,note:draft.note||'',photo:draft.photo||null,tasks:selected.map(t=>t.key)};next={...next,observations:[...(next.observations||[]),entry],log:appendLog(next.log,{text:`Walk: ${stop.label} — ${draft.status==='issue'?'needs attention':draft.status==='healthy'?'looking good':'checked'}${draft.note?': '+draft.note:''}`,zoneId:stop.zoneId,plotIds:stop.plotIds})};}
 const end=session.index+1>=session.stops.length;
 next.walkSession={...session,index:session.index+1,status:end?'complete':'active',draft:{},visited:save?[...session.visited,stop.id]:session.visited,deferred:save?session.deferred:[...session.deferred,stop.id],finishedAt:end?new Date().toISOString():null};
 setData(next);setTimeout(()=>{lock.current=false;},300);}
 return <div ref={dialog} className="q-walk" role="dialog" aria-modal="true" aria-label="Morning farm walk"><div className="q-walk-shell"><header className="q-walk-header"><div><h1>Morning walk</h1></div><button className="q-icon" aria-label={active?'Pause and close walk':'Close walk'} onClick={onClose}><X size={20}/></button></header>
 <div className="q-row q-between"><span className="q-pill">{saveStatus==='error'?'Could not save on this device':saveStatus==='saving'?'Saving…':online?'Saved on this device':'Offline · saved on this device'}</span>{!online&&<CloudOff size={18}/>} {active&&<small>{session.mode==='quick'?'Quick':'Full'} round</small>}</div>
 {saveStatus==='error'&&<p role="alert" className="q-warning">Device storage is full or unavailable. Keep this page open and export a backup from Settings before closing the app.</p>}
 {active&&session.date!==todayLocalKey()&&<p className="q-walk-resumed">Continuing your {session.date} round. New checks are logged for today.</p>}
 {active&&stop?<><div className="q-walk-progress" style={{marginTop:16}}><span style={{width:`${session.index/session.stops.length*100}%`}}/></div><div className="q-walk-route">{session.stops.map((s,i)=><span key={s.id} aria-current={i===session.index}>{i+1}. {s.label}</span>)}</div><WalkStop key={`${session.id}-${session.index}`} stop={stop} session={session} data={data} setData={setData} onAdvance={advance}/></>:finished?<div className="q-walk-card"><Sun size={36}/><h2>A little more in tune with your farm.</h2><p>{session.visited.length} areas checked. {session.deferred.length} left for later. Your notes are saved in each area’s field journal.</p><p>Unchecked tasks remain on your list. Growth and harvest dates are estimates; your observations tell the real story.</p><button className="q-button" onClick={()=>{setData({...data,walkSession:null});onClose();}}>Back to my farm</button></div>:<><h2>Start with a look around.</h2><p>A guided round of your own space, with practical checks and a journal that grows with you.</p><div className="q-walk-choices">{[['quick','Quick round','Today’s tasks and a check at each stop.'],['full','Full round','Every area, including those with no tasks.']].map(([key,title,desc])=><button className="q-walk-choice" key={key} aria-pressed={mode===key} onClick={()=>setMode(key)}><Footprints size={25}/><strong>{title}</strong><small>{desc}</small></button>)}</div><div className="q-inset"><div className="q-grid2"><label>Where are you?<select value={place} onChange={e=>setPlace(e.target.value)}><option value="outside">Walking outside</option><option value="desk">Checking from home</option></select></label><label>Start from<select value={startId} onChange={e=>setStartId(e.target.value)}><option value="">Entrance</option>{data.zones.map(z=><option value={z.id} key={z.id}>{z.name}</option>)}</select></label></div><p><MapPin size={14}/> {stops.length} stops · about {roundMinutes(stops,data)} min. Move between stops at your own pace.</p></div>{!stops.length&&<p className="q-warning">{mode==='quick'?'No tasks due. Choose a full round for a general check.':'Add your first farm area to start a walk.'}</p>}<button className="q-button" style={{width:'100%'}} disabled={!stops.length} onClick={begin}>{place==='outside'?'Begin my walk':'Begin my check-in'}</button><p>Open the app once online before heading out. Your saved farm, checks and photos remain available offline.</p></>}
 </div></div>;
}
