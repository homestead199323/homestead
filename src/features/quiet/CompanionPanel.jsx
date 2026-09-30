import {companionsFor} from './farm-model';
import FarmIcon from '../../components/FarmIcon';
export default function CompanionPanel({crop,zone,plots,available,onChoose,rotation}) {
 if(!crop)return null;
 const result=companionsFor(crop,zone?.id,plots,available);
 return <section className="q-companions" aria-label="Companion planting"><div className="q-eyebrow">Better together</div><h3>Companions for {crop}</h3><p>{zone?`Suggestions for ${zone.name}, using your crop database.`:'Choose a bed to check its existing neighbours.'}</p>
 {zone&&rotation&&<p className="q-warning" role="status">{rotation.crop} ({rotation.label}) grew in {zone.name} in {rotation.year}. Moving the {rotation.label} to a different bed each year keeps soil pests and diseases down (the RHS suggests a 3–4 year gap). Pick another bed if you can.{rotation.note?' '+rotation.note:''}</p>}
 {zone&&result.conflicts.length>0&&<p className="q-warning" role="status">Give these some space: {result.conflicts.join(', ')} already {result.conflicts.length===1?'grows':'grow'} here. The database advises keeping them apart from {crop}.</p>}
 {zone&&result.matches.length>0&&<p className="q-success">A good neighbour for {result.matches.join(', ')} already in this bed.</p>}
 <div className="q-companion-list">{result.suggestions.slice(0,4).map(s=><button type="button" className="q-companion" key={s.name} onClick={()=>onChoose(s.name)}><FarmIcon name={s.name} emoji={available.find(c=>c.name===s.name)?.emoji} size={36} harvest/><span><strong>{s.name}</strong><small>Also plan this companion →</small></span></button>)}</div>
 {!result.suggestions.length&&<p>No suitable additional companions are recorded for this combination.</p>}
 <small>Suggestions support planning; they do not guarantee growth or pest control. Keep each crop’s spacing and care needs. Choosing one prepares your next planting after saving this crop.</small></section>;
}
