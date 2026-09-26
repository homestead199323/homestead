// How each crop is usually started, for the seedling nursery. Approximate guide values the grower
// can override per batch: days for seeds to sprout, weeks from sowing to planting out, and whether
// seedlings are usually moved ("potted on" / pricked out) into bigger cells on the way.
//   method "transplant" — normally raised in trays, then planted out
//   method "either"     — sown direct or raised in modules; the nursery is optional
//   method "direct"     — sown or planted straight into the bed (roots, legumes, tubers, cloves, canes, trees)
export const PROPAGATION = {
  Tomato: ["transplant", 7, 7, true],
  "Pepper (Sweet)": ["transplant", 10, 9, true],
  "Pepper (Hot)": ["transplant", 10, 9, true],
  Eggplant: ["transplant", 10, 9, true],
  Cabbage: ["transplant", 6, 5, true],
  Broccoli: ["transplant", 6, 5, true],
  Cauliflower: ["transplant", 6, 5, true],
  Kale: ["transplant", 6, 5, true],
  "Brussels Sprouts": ["transplant", 6, 5, true],
  Lettuce: ["transplant", 7, 4, false],
  Onion: ["transplant", 10, 9, false],
  Leek: ["transplant", 12, 10, false],
  Celery: ["transplant", 18, 10, true],
  Celeriac: ["transplant", 18, 10, true],
  Basil: ["transplant", 8, 6, true],
  Parsley: ["transplant", 21, 8, false],
  Cucumber: ["transplant", 6, 4, false],
  Zucchini: ["transplant", 6, 4, false],
  Pumpkin: ["transplant", 6, 4, false],
  Melon: ["transplant", 7, 4, false],
  Watermelon: ["transplant", 7, 4, false],
  Corn: ["transplant", 7, 3, false],
  "Swiss Chard": ["transplant", 8, 4, false],
  Sunflower: ["transplant", 8, 3, false],
  Artichoke: ["transplant", 14, 8, true],
  Okra: ["transplant", 10, 5, false],
  Fennel: ["transplant", 10, 4, false],
  Chamomile: ["transplant", 10, 6, false],
  Thyme: ["transplant", 14, 8, false],
  Oregano: ["transplant", 10, 8, false],
  Sage: ["transplant", 14, 8, false],
  Lavender: ["transplant", 21, 10, true],
  Rosemary: ["transplant", 21, 12, true],
  Beetroot: ["either", 8, 4, false],
  Spinach: ["either", 8, 3, false],
  Pea: ["either", 8, 3, false],
  "Broad Bean": ["either", 10, 4, false],
  Dill: ["either", 10, 4, false],
};

/** { method, germDays, weeks, potOn } for a crop; unknown crops are treated as direct-sown. */
export function propagationOf(crop) {
  const row = PROPAGATION[crop?.name || crop];
  if (!row) return { method: "direct", germDays: 0, weeks: 0, potOn: false };
  const [method, germDays, weeks, potOn] = row;
  return { method, germDays, weeks, potOn };
}
