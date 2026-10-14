import {art} from './art';
// One standalone transparent portrait per species. No atlas offsets or substitute animals.
export default function AnimalArt({species='Chicken',size=64}) {
 const source=art(species.toLowerCase().replaceAll(' ','-'));
 return <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={species} className="q-animal-art">
  {source?<image href={source} width="100" height="100" preserveAspectRatio="xMidYMax meet"/>:<text x="50" y="55" textAnchor="middle" fontSize="11" fill="currentColor">{species}</text>}
 </svg>;
}
