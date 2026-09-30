/* ═══════════════════════════════════════════
   CROP FAMILIES — for rotation (garden memory, 2026-09-30)

   ROTATE: families whose soil-borne pests/diseases build up when grown
   in the same bed year after year (RHS "Crop rotation": potato family,
   legumes, brassicas, onion family, roots — 3–4 year cycle; clubroot and
   onion white rot persist far longer). Cucurbits, lettuce, sweetcorn and
   perennials "can go anywhere" (RHS), so they are not warned about.
   ═══════════════════════════════════════════ */

const F = {
  solanaceae: { label: "potato family", crops: ["Tomato", "Potato", "Pepper (Sweet)", "Pepper (Hot)", "Eggplant"] },
  brassicaceae: { label: "cabbage family", crops: ["Cabbage", "Kale", "Broccoli", "Cauliflower", "Brussels Sprouts", "Turnip", "Radish"], note: "Clubroot can stay in the soil for 20 years — if it has ever shown up here, keep brassicas out." },
  alliaceae: { label: "onion family", crops: ["Onion", "Garlic", "Leek"], note: "White rot lasts 8+ years in the soil — if it has shown up here, keep onions and garlic out." },
  fabaceae: { label: "pea and bean family", crops: ["Pea", "Broad Bean", "Bean (Dry)", "Lentil", "Chickpea"] },
  apiaceae: { label: "carrot family", crops: ["Carrot", "Celery", "Celeriac", "Parsley", "Dill", "Fennel"] },
  amaranthaceae: { label: "beet family", crops: ["Beetroot", "Swiss Chard", "Spinach"] },
  cucurbitaceae: { label: "squash family", crops: ["Zucchini", "Cucumber", "Pumpkin", "Melon", "Watermelon"] },
  asteraceae: { label: "daisy family", crops: ["Lettuce", "Artichoke", "Sunflower", "Chamomile"] },
  poaceae: { label: "grass family", crops: ["Corn", "Wheat"] },
};

export const ROTATE = new Set(["solanaceae", "brassicaceae", "alliaceae", "fabaceae", "apiaceae", "amaranthaceae"]);
export const ROTATION_YEARS = 3;

const BY_CROP = new Map();
Object.keys(F).forEach((id) => F[id].crops.forEach((c) => BY_CROP.set(c, id)));

/** Family id for a crop name, or null (perennials, herbs, fruit). */
export function familyOf(crop) {
  return BY_CROP.get(crop) || null;
}
export function familyInfo(id) {
  return F[id] || null;
}
