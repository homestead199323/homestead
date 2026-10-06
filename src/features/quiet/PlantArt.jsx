import { cropIcon } from './toy-art';
const stages = ['planned', 'sown', 'seedling', 'growing', 'maturing', 'harvest window'];
/* The crop as it looks on the 3D map at this growth stage (rendered from the same model). */
export default function PlantArt({ crop = '', stage = 3, size = 48 }) {
  const src = cropIcon(crop, stage);
  return <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${crop} · ${stages[stage] || ''}`} className="q-botanical-art">
    {src && <image href={src} width="100" height="100" preserveAspectRatio="xMidYMax meet"/>}
  </svg>;
}
