export const ORNAMENT_TYPES = [
  { id: "tree",        label: "Tree",           icon: "🌳", envs: ["farm", "backyard"] },
  { id: "bush",        label: "Bush",           icon: "🌿", envs: ["farm", "backyard"] },
  { id: "flowers",     label: "Flowers",        icon: "🌼", envs: ["farm", "backyard", "balcony"] },
  { id: "rock",        label: "Rocks",          icon: "🪨", envs: ["farm", "backyard"] },
  { id: "pond",        label: "Mini pond",      icon: "💧", envs: ["farm", "backyard"] },
  { id: "haybale",     label: "Hay bale",       icon: "🌾", envs: ["farm"] },
  { id: "woodpile",    label: "Wood pile",      icon: "🪵", envs: ["farm", "backyard"] },
  { id: "bench",       label: "Bench",          icon: "🪑", envs: ["farm", "backyard", "balcony"] },
  /* Stage 4b (brief §6): environment-specific decor */
  { id: "shed",        label: "Shed",           icon: "🏚️", envs: ["backyard"] },
  { id: "pot",         label: "Pot",            icon: "🪴", envs: ["balcony", "backyard"] },
  { id: "planter",     label: "Planter box",    icon: "🧺", envs: ["balcony"] },
  { id: "hangpot",     label: "Hanging plant",  icon: "🌸", envs: ["balcony"] },
  { id: "wateringcan", label: "Watering can",   icon: "🚿", envs: ["balcony", "backyard"] },
];
/* Palette shown in the Farm Designer decor tray for a given environment.
   Brief §7: no farm elements on balcony maps. Placed ornaments of any type
   still render everywhere (superset lookup) so env switches never break. */
export function ornamentTypesFor(env) {
  return ORNAMENT_TYPES.filter(function(o) { return o.envs.includes(env); });
}
export const MAX_ORNAMENTS = 10;
