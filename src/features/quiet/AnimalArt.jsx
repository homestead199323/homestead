import { animalIcon } from './toy-art';
/* The animal as it looks on the 3D map (rendered from the same model). */
export default function AnimalArt({ species = 'Chicken', size = 64 }) {
  const src = animalIcon(species);
  return <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={species} className="q-animal-art">
    {src ? <image href={src} width="100" height="100" preserveAspectRatio="xMidYMax meet"/> : <text x="50" y="55" textAnchor="middle" fontSize="11" fill="currentColor">{species}</text>}
  </svg>;
}
