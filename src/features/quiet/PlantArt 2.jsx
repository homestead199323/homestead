import {cropArtwork} from './art';
const stages = ['planned', 'sown', 'seedling', 'growing', 'maturing', 'harvest window'];
export default function PlantArt({crop = '', stage = 3, size = 48, view = 'side'}) {
  return <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${crop} · ${stages[stage]}`} className="q-botanical-art">
    {stage < 2 ? <>
      <ellipse cx="50" cy="85" rx="20" ry="7" fill="#5b4430" opacity=".28"/>
      {[38, 51, 62].map((x, i) => <ellipse key={x} cx={x} cy={82 + i % 2 * 3} rx="4" ry="2.5" fill="#c5a979" transform={`rotate(-25 ${x} 82)`}/>)}
      {stage === 0 && <path d="M30 70h40" stroke="#889787" strokeWidth="2" strokeDasharray="3 5"/>}
    </> : <image href={cropArtwork(crop, stage, view)} x={stage === 2 ? 18 : 0} y={stage === 2 ? 24 : 0} width={stage === 2 ? 64 : 100} height={stage === 2 ? 76 : 100} preserveAspectRatio="xMidYMax meet"/>}
  </svg>;
}
