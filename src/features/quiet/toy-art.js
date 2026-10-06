/* ═══════════════════════════════════════════
   TOY ART — the app's small pictures, rendered from the 3D map's own models
   (scripts/render-icons.mjs → src/assets/toy/), so every crop, animal and area
   looks the same in lists, cards and on the map. No three.js is loaded here.
   MARKER: TOY_ART_V1
   ═══════════════════════════════════════════ */
import { cropSlug, treeKey } from "../grove/crop-families";

// build-time imports keep the icons fingerprinted and cached for offline use
const assets = import.meta.glob("../../assets/toy/*.webp", { eager: true, import: "default", query: "?url" });
export function toyArt(name) { return assets[`../../assets/toy/${name}.webp`] || null; }

/* a crop at a growth stage: 0 planned, 1 sown, 2 seedling, 3 growing, 4 maturing, 5 harvest window */
export function cropIcon(crop = "", stage = 3) {
  const st = Math.max(0, Math.min(5, Math.round(stage)));
  if (st === 0) return toyArt("crop-planned");
  if (st === 1) return toyArt("crop-sown");
  const t = treeKey(crop);
  return toyArt(t ? `tree-${t}-${st}` : `crop-${cropSlug(crop)}-${st}`) || toyArt(`crop-greens-${st}`);
}
export function animalIcon(species = "") {
  if (species === "Bee") return toyArt("zone-beehive");
  return toyArt(`animal-${species.toLowerCase().replace(/ /g, "-")}`);
}
export function zoneIcon(type = "") { return toyArt(`zone-${type}`); }
