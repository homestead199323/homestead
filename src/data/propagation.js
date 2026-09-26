// How each crop is usually started, for the seedling nursery. Guide values the grower can override.
// Sources: Johnny's Selected Seeds seed-starting calculator (weeks indoors, transplant timing vs the
// frost-free date) and RHS guidance on planting out tender plants.
//
// [method, daysToSprout, weeksIndoors, potOn, plantOutWeeks]
//   method        "transplant" raised in trays · "either" direct or trays · (absent) = sown direct
//   plantOutWeeks weeks relative to the region's average last spring frost:
//                 negative = hardy, goes out before it; positive = tender, needs frost-free weeks first
export const PROPAGATION = {
  Tomato: ["transplant", 7, 7, true, 2],
  "Pepper (Sweet)": ["transplant", 10, 9, true, 2],
  "Pepper (Hot)": ["transplant", 10, 9, true, 2],
  Eggplant: ["transplant", 10, 8, true, 3],
  Cabbage: ["transplant", 5, 5, true, -3],
  Broccoli: ["transplant", 5, 5, true, -3],
  Cauliflower: ["transplant", 5, 5, true, -2],
  Kale: ["transplant", 5, 5, true, -3],
  "Brussels Sprouts": ["transplant", 5, 5, true, -2],
  Lettuce: ["transplant", 5, 4, false, -3],
  Onion: ["transplant", 10, 10, false, -4],
  Leek: ["transplant", 10, 9, false, -2],
  Celery: ["transplant", 18, 11, true, 1],
  Celeriac: ["transplant", 18, 11, true, 1],
  Basil: ["transplant", 7, 6, true, 3],
  Parsley: ["transplant", 21, 8, false, -2],
  Cucumber: ["transplant", 5, 4, false, 2],
  Zucchini: ["transplant", 6, 4, false, 1],
  Pumpkin: ["transplant", 6, 4, false, 1],
  Melon: ["transplant", 7, 4, false, 2],
  Watermelon: ["transplant", 7, 4, false, 2],
  Artichoke: ["transplant", 14, 10, true, 0],
  Okra: ["transplant", 10, 5, false, 3],
  Fennel: ["transplant", 10, 4, false, 0],
  Chamomile: ["transplant", 10, 6, false, 0],
  Thyme: ["transplant", 14, 8, false, 0],
  Oregano: ["transplant", 10, 8, false, 0],
  Sage: ["transplant", 14, 8, false, 0],
  Lavender: ["transplant", 21, 10, true, 0],
  Rosemary: ["transplant", 21, 12, true, 1],
  Corn: ["either", 7, 3, false, 1],
  Sunflower: ["either", 8, 3, false, 1],
  "Swiss Chard": ["either", 8, 4, false, -1],
  Beetroot: ["either", 8, 4, false, -2],
  Spinach: ["either", 8, 3, false, -4],
  Pea: ["either", 8, 3, false, -4],
  "Broad Bean": ["either", 10, 4, false, -6],
  Dill: ["either", 10, 4, false, 0],
};

/** Perennials: planted out to establish, not to mature in one season (need ~6 weeks before first frost). */
export const PERENNIALS = new Set([
  "Artichoke",
  "Thyme",
  "Oregano",
  "Sage",
  "Lavender",
  "Rosemary",
  "Asparagus",
  "Rhubarb",
]);
/** Crops that stand and keep being harvested through light frost, so they may mature after the first frost. */
export const FROST_HARDY_HARVEST = new Set([
  "Cabbage",
  "Broccoli",
  "Cauliflower",
  "Kale",
  "Brussels Sprouts",
  "Leek",
  "Onion",
  "Celery",
  "Celeriac",
  "Parsley",
  "Swiss Chard",
  "Beetroot",
  "Spinach",
  "Lettuce",
  "Pea",
  "Broad Bean",
]);

/** { method, germDays, weeks, potOn, frostWeeks, hardy } for a crop; unknown crops are sown direct. */
export function propagationOf(crop) {
  const row = PROPAGATION[crop?.name || crop];
  if (!row) return { method: "direct", germDays: 0, weeks: 0, potOn: false, frostWeeks: 0, hardy: false };
  const [method, germDays, weeks, potOn, frostWeeks] = row;
  return { method, germDays, weeks, potOn, frostWeeks, hardy: frostWeeks < 0 };
}
