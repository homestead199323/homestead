import {useState,useEffect} from 'react';
import {createPortal} from 'react-dom';
import {ArrowRight,Leaf,Sun,Pencil,ChevronRight} from 'lucide-react';
import {fetchWeather,describeWeatherCode} from '../../lib/weather';
import {todayLocalKey} from '../../lib/utils';
import {spaceTitle,defaultSpaceTitle} from '../../lib/environment';
import {minutesLabel} from '../../lib/task-time';
import WalkOverlay from '../today/WalkOverlay';
import GroveScene from './GroveScene';
import PlantArt from '../quiet/PlantArt';
import AnimalArt from '../quiet/AnimalArt';
import FarmIcon from '../../components/FarmIcon';
import {tasksByZone,taskGlyph} from './zone-tasks';
import {RemindersPrompt} from '../settings/Reminders';

// What the row says under a job: where, how long, and — only when it matters — why now.
function rowNote(t) {
  const parts = [t.loc];
  if (t.type === 'harvest') parts.push('Ready to pick');
  else if (t.routine) parts.push('Daily care');
  parts.push(minutesLabel(t));
  if (t.sowing) parts.push('whenever you’re ready');
  return parts.join(' · ');
}

/** Shopping list from onboarding: ticked off here, gone once everything is bought. */
function StarterKit({data,setData}) {
  const kit = data.starterKit;
  if (!kit || kit.dismissed || !Array.isArray(kit.items) || kit.items.length === 0) return null;
  const done = kit.items.filter(i => i.done).length, all = done === kit.items.length;
  const toggle = id => setData({...data, starterKit: {...kit, items: kit.items.map(i => i.id === id ? {...i, done: !i.done} : i)}});
  return <section className="mt-kit" aria-label="Starter kit">
    <div className="mt-kit-head">
      <span><strong>🛒 Your starter kit</strong><small>{all ? 'All set. Time to sow!' : `${done} of ${kit.items.length} ready · tick things off as you get them`}</small></span>
      {all && <button type="button" className="q-text-button" onClick={() => setData({...data, starterKit: {...kit, dismissed: true}})}>Hide</button>}
    </div>
    {kit.items.map(function(i) {
      return <label key={i.id} className={`mt-kit-item${i.done ? ' done' : ''}`}>
        <input type="checkbox" checked={!!i.done} onChange={function(){ toggle(i.id); }}/>
        <span><b>{i.label}</b>{i.detail && <small>{i.detail}</small>}</span>
      </label>;
    })}
  </section>;
}

/** Next 7 days + what the weather means for this farm (lib/weather-alerts.js). */
function WeatherWeek({forecast,alerts,onOpenTasks}) {
  const today=todayLocalKey();
  const days=(forecast?.days||[]).filter(d=>d.date>=today).slice(0,7);
  if(!days.length) return null;
  const alertDays=new Set((alerts||[]).map(a=>a.date));
  const round=n=>n==null?'–':Math.round(n);
  return <section className="mt-wx" aria-label="Weather this week">
    <div className="q-row q-between"><h2>Next 7 days</h2><span className="q-eyebrow">{forecast.location||''}</span></div>
    {(alerts||[]).length>0?<ul className="mt-wx-alerts">{alerts.map(function(a){
      return <li key={a.kind+a.date}><button type="button" className={`mt-wx-alert ${a.severity||'warn'}`} onClick={onOpenTasks}><span aria-hidden="true">{a.emoji}</span><span>{a.short||a.title}</span></button></li>;
    })}</ul>:<p className="mt-wx-calm">No frost, storms or heat ahead for what you grow.</p>}
    <div className="mt-wx-days" role="list">{days.map(function(d){
      const w=describeWeatherCode(d.code);
      return <div role="listitem" key={d.date} className={`mt-wx-day${alertDays.has(d.date)?' flag':''}`} title={w.desc}>
        <small>{d.date===today?'Today':new Date(d.date+'T12:00').toLocaleDateString(undefined,{weekday:'short'})}</small><span aria-hidden="true">{w.emoji}</span>
        <b>{round(d.tMax)}°</b><small>{round(d.tMin)}°</small>
      </div>;
    })}</div>
  </section>;
}

export default function GroveHome({data,setData,setPage,tasks,forecast,alerts}) {
  const [walk,setWalk]=useState(false),[weather,setWeather]=useState(null),[taskZone,setTaskZone]=useState(null);
  useEffect(()=>{let active=true;if(data.city)fetchWeather(data.city).then(w=>{if(active)setWeather(w);});return()=>{active=false;};},[data.city]);
  const due=tasks.filter(t=>t.daysOut===0&&!['forecast','upcoming'].includes(t.type));
  const markers=tasksByZone(tasks,data);
  const zoneOf=t=>Object.keys(markers).find(id=>markers[id].some(x=>x.key===t.key));
  const issues=(data.observations||[]).filter(e=>e.status==='issue').filter(e=>!(data.observations||[]).some(n=>n.zoneId===e.zoneId&&n.at>e.at)).length;
  const title=spaceTitle(data);
  const empty=!(data.zones||[]).length;
  return <div className="q-home page-enter">
    <section className="q-garden-hero">
      <header className="q-greeting">
        <div><h1>{title}</h1><p>{weather?.ok?<><Sun size={13}/> {weather.temp}°C · {data.city}</>:new Date().toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'})}</p></div>
        <div className="q-row"><span className="q-streak"><Leaf size={13}/>{data.gamify?.streak||0} day streak</span><button className="q-edit-button" aria-label="Edit farm layout" title="Edit layout" onClick={()=>setPage('map',{edit:true})}><Pencil size={17}/></button></div>
      </header>
      <GroveScene data={data} setData={setData} tasksByZone={markers} onOpenTasks={()=>setPage('tasks')} taskZoneId={taskZone} onTaskZone={setTaskZone} showEditButton={false} showHelperText={false} noBorder onPlantInZone={zone=>setPage('crops',{zone})} onShowCrops={()=>setPage('crops')}
        onEditLayout={()=>setPage('map',{edit:true})} onStartGuide={()=>setData({...data,setupDone:false})}/>
      {!empty&&<section className="q-today-dock">
        <button className="q-today-link" onClick={()=>setPage('tasks')}><span><strong>Today</strong><small>{due.length===0?'Nothing due':due.length===1?'1 job':`${due.length} jobs`}{issues?` · ${issues} areas to revisit`:due.length?' · a little care goes a long way':''}</small></span><ChevronRight size={18}/></button>
        {due.length>0&&<button className="q-button" onClick={()=>setWalk(true)}><Leaf size={17}/>{data.walkSession?.status==='active'?'Resume morning walk':'Start morning walk'}<ArrowRight size={16}/></button>}
      </section>}
    </section>
    {!empty&&<WeatherWeek forecast={forecast} alerts={alerts} onOpenTasks={()=>setPage('tasks')}/>}
    {!empty&&<RemindersPrompt/>}
    <StarterKit data={data} setData={setData}/>
    {!empty&&<section className="q-home-section"><div className="q-row q-between"><h2>Around your {defaultSpaceTitle(data).replace(/^My /,'')}</h2><span className="q-eyebrow">Today’s care</span></div>
      {issues>0&&<p className="q-warning">{issues} area{issues===1?'':'s'} flagged on your last checks. Revisit them on a full round.</p>}
      {due.length===0?<p className="q-empty">Nothing due today. A look around is still a good habit.</p>:due.slice(0,5).map(t=><button type="button" className="q-task-row q-task-row-button" key={t.key} onClick={()=>{const z=zoneOf(t);if(z)setTaskZone(z);else setPage('tasks');}}>
        {t.type==='weather'?<span className="mt-wx-icon" aria-hidden="true">{t.emoji}</span>:t.speciesType?<AnimalArt species={t.speciesType} size={48}/>:t.sowing?<span style={{width:48,height:48,display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><FarmIcon name={t.cropName} emoji={t.emoji} size={40} harvest/></span>:<PlantArt crop={t.cropName||data.garden.plots.find(p=>p.id===t.plotId)?.crop||'Basil'} stage={t.type==='harvest'?5:3} size={48}/>}
        <span className="q-grow"><strong>{t.title}</strong><small>{rowNote(t)}</small></span><span className="q-task-go" aria-hidden="true">{taskGlyph(t)}<ChevronRight size={17}/></span>
      </button>)}{due.length>5&&<p className="q-empty" style={{padding:'8px 0 0',fontSize:12}}>+{due.length-5} more on the Tasks screen</p>}<button className="q-text-button" onClick={()=>setPage('tasks')}>View all tasks →</button>
    </section>}
    {walk&&createPortal(<WalkOverlay tasks={tasks} data={data} setData={setData} onClose={()=>setWalk(false)}/>,document.body)}
  </div>;
}
