import {animalZone,zoneGeometry} from './farm-model.js';
export function planRound(tasks,data,mode='quick',startId='') {
 const fw=data.farmW||100,fh=data.farmH||60,groups=new Map();
 const zones=(data.zones||[]).map((z,i)=>zoneGeometry(z,fw,fh,i));
 function addZone(z){if(!groups.has(z.id))groups.set(z.id,{id:z.id,zoneId:z.id,label:z.name,type:z.type,cx:(z.xM+z.wM/2)/fw*100,cy:(z.yM+z.hM/2)/fh*100,tasks:[],plotIds:(data.garden?.plots||[]).filter(p=>p.zone===z.id&&p.status!=='harvested').map(p=>p.id)});return groups.get(z.id);}
 if(mode==='full')zones.forEach(addZone);
 tasks.filter(t=>t.daysOut===0&&!['forecast','upcoming'].includes(t.type)).forEach(task=>{
  const plot=data.garden?.plots.find(p=>p.id===task.plotId),animal=data.livestock?.animals.find(a=>a.id===task.animalId);
  const matches=task.speciesType?(data.livestock?.animals||[]).filter(a=>a.type===task.speciesType):animal?[animal]:[];
  const ids=[...new Set(matches.map(a=>animalZone(a,zones)?.id).filter(Boolean))];
  const z=zones.find(z=>z.id===plot?.zone||z.id===ids[0]);
  if(z){addZone(z).tasks.push({...task,otherZones:ids.slice(1).map(id=>zones.find(z=>z.id===id)?.name)});return;}
  const key=plot?'unplaced-crops':'unplaced-animals';
  if(!groups.has(key))groups.set(key,{id:key,label:plot?'Unassigned crops':'Unassigned animals',type:plot?'veg':'barn',cx:50,cy:100,tasks:[],plotIds:[]});
  const group=groups.get(key);group.tasks.push(task);if(plot&&!group.plotIds.includes(plot.id))group.plotIds.push(plot.id);
 });
 const remaining=[...groups.values()],result=[];let x=fw/2,y=fh;
 if(startId){const idx=remaining.findIndex(s=>s.id===startId);if(idx>=0){const s=remaining.splice(idx,1)[0];result.push(s);x=s.cx/100*fw;y=s.cy/100*fh;}}
 while(remaining.length){let best=0,dist=Infinity;remaining.forEach((s,i)=>{const d=Math.hypot(s.cx/100*fw-x,s.cy/100*fh-y);if(d<dist){dist=d;best=i;}});const s=remaining.splice(best,1)[0];result.push(s);x=s.cx/100*fw;y=s.cy/100*fh;}
 return result;
}
export function roundMinutes(stops,data){let x=(data.farmW||100)/2,y=data.farmH||60,metres=0;stops.forEach(s=>{const nx=s.cx/100*(data.farmW||100),ny=s.cy/100*(data.farmH||60);metres+=Math.hypot(nx-x,ny-y);x=nx;y=ny;});return Math.max(1,Math.ceil(metres/50+stops.length*.75+stops.reduce((n,s)=>n+s.tasks.length*1.5,0)));}
