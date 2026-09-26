import PlantingPattern from './PlantingPattern';
export default function PlantingControls({value,onChange,plan,crop,zone,yieldKg}){
 const orchard=zone?.type==='orchard',scatter=value.pattern==='scatter',mode=value.mode||'plants';
 const update=patch=>onChange({...value,...patch});
 return <section className="q-inset q-planting-controls">
 {orchard?<label>Orchard arrangement<select value={value.pattern||'rows'} onChange={e=>update({pattern:e.target.value,mode:'plants',startM:undefined})}><option value="rows">Regular rows</option><option value="scatter">Natural / scattered trees</option></select></label>:<PlantingPattern value={value.pattern||'rows'} onChange={pattern=>update({pattern,rowSpacingCM:undefined,startM:undefined})}/>}
 <div className="q-row" role="group" aria-label="Planting quantity mode"><button type="button" className="q-secondary" aria-pressed={mode==='plants'||scatter} onClick={()=>update({mode:'plants',plantCount:plan?.count||value.plantCount})}>By plant count</button>{!scatter&&<button type="button" className="q-secondary" aria-pressed={mode==='rows'} onClick={()=>update({mode:'rows',rowCount:plan?.rows||value.rowCount})}>By row count</button>}</div>
 <div className="q-grid2">
 <label>{mode==='rows'&&!scatter?'Number of rows':orchard?'Number of trees':'Number of plants'}<input type="number" min="1" step="1" value={mode==='rows'&&!scatter?value.rowCount||'':value.plantCount||''} onChange={e=>update({[mode==='rows'&&!scatter?'rowCount':'plantCount']:e.target.value})}/></label>
 <label>Plant spacing (cm)<input type="number" min="1" step="1" value={value.spacingCM??crop?.spacing??30} onChange={e=>update({spacingCM:e.target.value,rowSpacingCM:undefined})}/></label>
 {!scatter&&<><label>Row spacing (cm)<input type="number" min="1" step="0.1" value={value.rowSpacingCM??Math.round(Number(value.spacingCM??crop?.spacing??30)*(value.pattern==='offset'?Math.sqrt(3)/2:1)*10)/10} onChange={e=>update({rowSpacingCM:e.target.value})}/></label><label>Length of rows (m)<input type="number" min="0.3" step="0.1" value={value.lengthM??(zone?(zone.rowAxis==='vertical'?zone.hM:zone.wM):'')} onChange={e=>update({lengthM:e.target.value})}/></label></>}
 </div>
 <div role="status" className="q-planting-summary"><strong>{plan?.count||0} {orchard?'trees':'plants'}{!scatter&&` · ${plan?.rows||0} rows`}</strong>{yieldKg!=null&&<span>Estimated harvest: ~{yieldKg} kg</span>}</div>
 {plan?.error&&<p className="q-warning">{plan.error}</p>}
 <small>Database spacing: {crop?.spacing||30} cm. {scatter?'Trees keep your chosen minimum spacing, including from existing trees.':'Rows and plant positions use your chosen spacing.'} Yield is an estimate based on plant count and the selected variety; closer spacing does not guarantee a higher harvest per plant.</small>
 </section>;
}
