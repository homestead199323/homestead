// Module (plug) trays by number of cells. Cell size is approximate, for a standard ~53 × 31 cm tray.
export const TRAYS = [
  { cells: 15, cols: 5, use: "Big seeds or potting on" },
  { cells: 24, cols: 6, use: "Squash, cucumber, beans, potting on" },
  { cells: 40, cols: 8, use: "Potting on tomatoes, peppers, brassicas" },
  { cells: 60, cols: 10, use: "Lettuce, chard, brassicas" },
  { cells: 77, cols: 11, use: "Lettuce, beet, spinach" },
  { cells: 104, cols: 13, use: "Tomato, pepper, onion, leek, herbs" },
  { cells: 150, cols: 15, use: "Small herbs and flowers" },
  { cells: 200, cols: 20, use: "Onion and leek plugs" },
  { cells: 288, cols: 24, use: "Tiny seeds, plugs" },
].map((t) => {
  const rows = t.cells / t.cols;
  return { ...t, rows, cellCM: Math.round(Math.min(53 / t.cols, 31 / rows) * 10) / 10 };
});
export const trayOf = (cells) =>
  TRAYS.find((t) => t.cells === Number(cells)) || TRAYS.find((t) => t.cells === 60);

const BIG = /cucumber|zucchini|pumpkin|melon|squash|corn|sunflower|bean|pea|okra/i;
const FRUITING = /tomato|pepper|eggplant|artichoke/i;
const SMALL =
  /onion|leek|parsley|thyme|oregano|basil|chamomile|celery|celeriac|lavender|rosemary|sage|dill|fennel/i;
// Cell size (cm) each crop group grows well in: sowing, and the bigger cells it is potted on into.
// The crop sets the range; the number of cells picks the tray in that range with the fewest empty cells.
const GROUPS = [
  { test: BIG, label: "large seeds", sow: [5, 8.5], pot: null, sowDefault: 24, potDefault: null },
  {
    test: FRUITING,
    label: "tomato-family",
    sow: [3.5, 4.5],
    pot: [5.5, 10.5],
    sowDefault: 104,
    potDefault: 24,
  },
  { test: SMALL, label: "small-seeded", sow: [2.5, 4], pot: [4, 6.5], sowDefault: 104, potDefault: 40 },
  { test: /./, label: "leafy and brassica", sow: [3.5, 5.5], pot: [5, 8], sowDefault: 77, potDefault: 40 },
];
function best(range, fallback, cells) {
  const fits = TRAYS.filter((t) => t.cellCM >= range[0] && t.cellCM <= range[1]);
  if (!cells || !fits.length) return fallback;
  // Fewest trays first, then fewest empty cells, then the crop's usual tray.
  const score = (t) => [
    Math.ceil(cells / t.cells),
    Math.ceil(cells / t.cells) * t.cells - cells,
    t.cells === fallback ? 0 : 1,
  ];
  return fits
    .map((t) => ({ t, s: score(t) }))
    .sort((a, b) => a.s[0] - b.s[0] || a.s[1] - b.s[1] || a.s[2] - b.s[2])[0].t.cells;
}
const rangeText = (r) => `${r[0]}–${r[1]} cm`;
/**
 * Suggested sowing tray and (for crops potted on) the bigger tray they move into.
 * The crop decides the cell-size range; with a cell count, the tray in range needing the fewest trays,
 * then leaving the fewest empty cells, is suggested. Returns a short reason too.
 */
export function suggestTrays(crop, cells) {
  const name = crop?.name || "",
    g = GROUPS.find((x) => x.test.test(name));
  const tray = best(g.sow, g.sowDefault, cells),
    potTray = g.pot ? best(g.pot, g.potDefault, cells) : null;
  return {
    tray,
    potTray,
    sowReason: `${name || "This crop"} grows well from ${rangeText(g.sow)} cells${cells ? `; for ${cells} cells, ${tray} needs the fewest trays with the least left empty` : ""}.`,
    potReason: g.pot
      ? `Potting on needs ${rangeText(g.pot)} cells${cells ? `; for ${cells} seedlings, ${potTray} needs the fewest trays with the least left empty` : ""}.`
      : "",
  };
}
