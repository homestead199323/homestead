import {useState} from 'react';
import {Overlay,Inp,Sel,Btn} from '../../components/ui';
import {rCR,rCM,getRegionalVarieties} from '../../lib/regional';
import {uid} from '../../lib/storage';
import {appendLog,todayLocalKey,addDaysToLocalKey} from '../../lib/utils';
import {expectedYield} from '../../lib/farm-calc';
import {zoneGeometry} from './farm-model';
import {cropFitsZone,planPlanting} from './planting-plan';
import PlantingControls from './PlantingControls';
import CompanionPanel from './CompanionPanel';
import FarmIcon from '../../components/FarmIcon';
const empty={crop:'',zone:'',variety:'',name:'',plantDate:'',cost:'',mode:'plants',pattern:'rows',plantCount:'',rowCount:''};
export default function PlantingForm({data,setData,initial={},onClose}){
 const [form,setForm]=useState({...empty,...initial}),[query,setQuery]=useState(''),[browse,setBrowse]=useState(!initial.crop),[companion,setCompanion]=useState(''),[error,setError]=useState('');
 const crops=rCR(data.region),crop=rCM(data.region).get(form.crop),rawZone=data.zones.find(z=>z.id===form.zone),zone=rawZone?zoneGeometry(rawZone,data.farmW,data.farmH):null;
 const availableZones=data.zones.filter(z=>crop?cropFitsZone(crop,z):['veg','raised','greenhouse','container','herbs','orchard'].includes(z.type));
 const choices=crops.filter(c=>(!zone||cropFitsZone(c,zone))&&c.name.toLowerCase().includes(query.toLowerCase()));
 const varieties=crop?getRegionalVarieties(crop.name,data.region):[],variety=varieties.find(v=>v.name===form.variety);
 const plan=crop&&zone?planPlanting(zone,data.garden.plots,form,crop):null;
 const yieldKg=crop&&plan?.count?expectedYield(crop.name,plan.count,'plants',variety?.yld,data.region):null;
 function update(next){setForm(next);setError('');}
 function save(){
  if(!crop||!zone){setError('Choose a crop and its growing area.');return;}
  if(plan.error){setError(plan.error);return;}
  const name=form.name||(form.variety?`${crop.name} (${form.variety})`:crop.name),plot={id:uid(),crop:crop.name,variety:form.variety,varietyNote:variety?.note||'',name,zone:zone.id,layout:plan.layout,plantingPattern:form.pattern,plantCount:plan.count,qty:plan.count,measureType:'plants',expectedYieldKg:yieldKg,plantDate:form.plantDate,harvestDate:form.plantDate?addDaysToLocalKey(form.plantDate,variety?.days||crop.days):'',status:form.plantDate?'planted':'planned',steps:crop.steps.map(s=>({...s,done:false}))};
  const next={...data,garden:{...data.garden,plots:[...data.garden.plots,plot]},log:appendLog(data.log,{text:`🌱 ${form.plantDate?'Planted':'Planned'} ${name} (${plan.count} plants)`})};
  if(+form.cost>0)next.costs={...data.costs,items:[...(data.costs?.items||[]),{id:uid(),type:'expense',amount:+form.cost,label:`Seeds: ${name}`,date:todayLocalKey(),cat:'Seeds'}]};
  setData(next);
  if(companion){setForm({...empty,crop:companion,zone:form.zone,plantDate:form.plantDate});setCompanion('');setQuery('');setBrowse(false);}else onClose();
 }
 return <Overlay title="Plant a crop" onClose={onClose}>
 <div className="q-crop-picker"><label htmlFor="crop-choice">Crop</label><input id="crop-choice" value={browse?query:form.crop} placeholder="Find a crop…" onFocus={()=>{setBrowse(true);setQuery('');}} onChange={e=>{setQuery(e.target.value);setBrowse(true);}}/>
 {browse&&<div className="q-crop-options">{choices.map(c=><button type="button" key={c.name} onClick={()=>{update({...form,crop:c.name,variety:'',spacingCM:undefined,rowSpacingCM:undefined,startM:undefined,lengthM:undefined});setCompanion('');setBrowse(false);}}><FarmIcon name={c.name} emoji={c.emoji} size={30} harvest/><span>{c.name}</span></button>)}{!choices.length&&<p>No matching crops for this area.</p>}</div>}</div>
 <Sel label="Growing area" value={form.zone} onChange={e=>{update({...form,zone:e.target.value,startM:undefined,lengthM:undefined,pattern:'rows'});setCompanion('');}} options={[{value:'',label:'Choose an area…'},...availableZones.map(z=>({value:z.id,label:z.name}))]}/>
 {crop&&<><div className="q-row" style={{margin:'12px 0'}}><FarmIcon name={crop.name} emoji={crop.emoji} size={48} harvest/><div><strong>{crop.name}</strong><p style={{margin:0,fontSize:12}}>Harvest estimate: {variety?.days||crop.days} days · {crop.sun} sun</p></div></div>{varieties.length>0&&<Sel label="Variety" value={form.variety} onChange={e=>update({...form,variety:e.target.value})} options={[{value:'',label:'General variety'},...varieties.map(v=>({value:v.name,label:v.name}))]}/>}</>}
 {crop&&zone&&<><PlantingControls value={form} onChange={update} plan={plan} crop={crop} zone={zone} yieldKg={yieldKg}/><CompanionPanel crop={form.crop} zone={zone} plots={data.garden.plots} available={crops.filter(c=>cropFitsZone(c,zone))} onChoose={setCompanion}/>{companion&&<p className="q-success">Next planting: {companion}. <button className="q-text-button" onClick={()=>setCompanion('')}>Remove</button></p>}</>}
 <Inp label="Name (optional)" value={form.name} onChange={e=>update({...form,name:e.target.value})}/><Inp label="Plant date (leave blank to plan)" type="date" max={todayLocalKey()} value={form.plantDate} onChange={e=>update({...form,plantDate:e.target.value})}/><Inp label="Seed cost (€)" type="number" min="0" value={form.cost} onChange={e=>update({...form,cost:e.target.value})}/>
 {error&&<p role="alert" className="q-warning">{error}</p>}<div className="q-row"><Btn v="secondary" onClick={onClose}>Cancel</Btn><Btn onClick={save} dis={!crop||!zone}>Save planting</Btn></div>
 </Overlay>;
}
