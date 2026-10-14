import {useState,useEffect} from 'react';
import {createPortal} from 'react-dom';
import {ArrowRight,Leaf,Sun,Pencil,ChevronRight} from 'lucide-react';
import {fetchWeather} from '../../lib/weather';
import {resolveEnvironment} from '../../lib/environment';
import WalkOverlay from '../today/WalkOverlay';
import GroveScene from './GroveScene';
import PlantArt from '../quiet/PlantArt';
import AnimalArt from '../quiet/AnimalArt';
import {tasksByZone} from './zone-tasks';
export default function GroveHome({data,setData,setPage,tasks}) {
  const [walk,setWalk]=useState(false),[weather,setWeather]=useState(null),[taskZone,setTaskZone]=useState(null);
  useEffect(()=>{let active=true;if(data.city)fetchWeather(data.city).then(w=>{if(active)setWeather(w);});return()=>{active=false;};},[data.city]);
  const due=tasks.filter(t=>t.daysOut===0&&!['forecast','upcoming'].includes(t.type));
  const markers=tasksByZone(tasks,data);
  const zoneOf=t=>Object.keys(markers).find(id=>markers[id].some(x=>x.key===t.key));
  const issues=(data.observations||[]).filter(e=>e.status==='issue').filter(e=>!(data.observations||[]).some(n=>n.zoneId===e.zoneId&&n.at>e.at)).length;
  const environment=resolveEnvironment(data),title=data.profile?.farmName||(environment==='balcony'?'My balcony':environment==='backyard'?'My garden':'My farm');
  return <div className="q-home page-enter">
    <section className="q-garden-hero">
      <header className="q-greeting">
        <div><h1>{title}</h1><p>{weather?.ok?<><Sun size={13}/> {weather.temp}°C · {data.city}</>:new Date().toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'})}</p></div>
        <div className="q-row"><span className="q-streak"><Leaf size={13}/>{data.gamify?.streak||0} day streak</span><button className="q-edit-button" aria-label="Edit farm layout" onClick={()=>setPage('map',{edit:true})}><Pencil size={17}/></button></div>
      </header>
      <GroveScene data={data} setData={setData} tasksByZone={markers} onOpenTasks={()=>setPage('tasks')} taskZoneId={taskZone} onTaskZone={setTaskZone} showEditButton={false} showHelperText={false} noBorder onPlantInZone={zone=>setPage('crops',{zone})} onShowCrops={()=>setPage('crops')}/>
      <section className="q-today-dock">
        <button className="q-today-link" onClick={()=>setPage('tasks')}><span><strong>Today</strong><small>{due.length} tasks{issues?` · ${issues} areas to revisit`:' · A little care goes a long way'}</small></span><ChevronRight size={18}/></button>
        <button className="q-button" onClick={()=>setWalk(true)}><Leaf size={17}/>{data.walkSession?.status==='active'?'Resume morning walk':'Start morning walk'}<ArrowRight size={16}/></button>
      </section>
    </section>
    <section className="q-home-section"><div className="q-row q-between"><h2>Around your garden</h2><span className="q-eyebrow">Today’s care</span></div>
      {issues>0&&<p className="q-warning">{issues} area{issues===1?'':'s'} flagged on your last checks. Revisit them on a full round.</p>}
      {due.length===0?<p className="q-empty">Nothing scheduled. A look around is still a good habit.</p>:due.slice(0,5).map(t=><button type="button" className="q-task-row q-task-row-button" key={t.key} onClick={()=>{const z=zoneOf(t);if(z)setTaskZone(z);else setPage('tasks');}}>
        {t.speciesType?<AnimalArt species={t.speciesType} size={48}/>:<PlantArt crop={t.cropName||data.garden.plots.find(p=>p.id===t.plotId)?.crop||'Basil'} stage={t.type==='harvest'?5:3} size={48}/>}
        <span className="q-grow"><strong>{t.title}</strong><small>{t.loc} · {t.type==='harvest'?'Estimated harvest window':t.routine?'Daily care':'Worth a look'}</small></span><span className="q-task-go" aria-hidden="true">{t.emoji}<ChevronRight size={17}/></span>
      </button>)}<button className="q-text-button" onClick={()=>setPage('tasks')}>View all tasks →</button>
    </section>
    {walk&&createPortal(<WalkOverlay tasks={tasks} data={data} setData={setData} onClose={()=>setWalk(false)}/>,document.body)}
  </div>;
}
