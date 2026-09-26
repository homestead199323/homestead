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
export const trayOf = (cells) => TRAYS.find((t) => t.cells === Number(cells)) || TRAYS.find((t) => t.cells === 60);

const BIG = /cucumber|zucchini|pumpkin|melon|squash|corn|sunflower|bean|pea|okra/i;
const FRUITING = /tomato|pepper|eggplant|artichoke/i;
const SMALL = /onion|leek|parsley|thyme|oregano|basil|chamomile|celery|celeriac|lavender|rosemary|sage|dill|fennel/i;
/** Suggested sowing tray and (for crops potted on) the bigger tray they move into. */
export function suggestTrays(crop) {
  const name = crop?.name || "";
  if (BIG.test(name)) return { tray: 24, potTray: null };
  if (FRUITING.test(name)) return { tray: 104, potTray: 24 };
  if (SMALL.test(name)) return { tray: 104, potTray: 40 };
  return { tray: 77, potTray: 40 };
}
