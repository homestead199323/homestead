import { isTreeCrop } from "../features/quiet/planting-plan.js";
import { PERENNIALS } from "../data/propagation.js";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const EXTRA = new Set(["Mint", "Chives"]);

/** Trees, soft fruit and perennial herbs stay in the ground and crop again every year. */
export function isRecurringCrop(crop) {
  return !!crop && (isTreeCrop(crop) || crop.cat === "Fruit" || PERENNIALS.has(crop.name) || EXTRA.has(crop.name));
}

const key = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Start of the next harvest season after `fromKey` (YYYY-MM-DD), from the crop's harvest months
 * ("Aug-Sep" → 1 August next time round). Falls back to one year later.
 */
export function nextHarvestDate(crop, fromKey) {
  const from = new Date(`${fromKey}T12:00:00`);
  const m = MONTHS.indexOf(String(crop?.harvest || "").trim().slice(0, 3).toLowerCase());
  if (m < 0) {
    const d = new Date(from);
    d.setFullYear(d.getFullYear() + 1);
    return key(d);
  }
  let d = new Date(from.getFullYear(), m, 1, 12);
  // Always the next season: at least ~2 months away so a late pick doesn't re-trigger this year.
  while (d.getTime() - from.getTime() < 60 * 864e5) d = new Date(d.getFullYear() + 1, m, 1, 12);
  return key(d);
}

/** A harvested perennial goes back to growing, due again next season. */
export function afterRecurringHarvest(plot, crop, todayKey) {
  return {
    ...plot,
    status: "planted",
    lastHarvest: todayKey,
    harvests: (plot.harvests || 0) + 1,
    harvestDate: nextHarvestDate(crop, todayKey),
    observedStage: null,
    steps: (plot.steps || []).map((s) => ({ ...s, done: true })),
  };
}

/** Repair perennials that were marked harvested (and so vanished) before they recurred. */
export function migratePerennials(data, cropMap, todayKey) {
  const plots = data?.garden?.plots;
  if (!Array.isArray(plots) || !plots.some((p) => p.status === "harvested")) return data;
  let changed = false;
  const next = plots.map((p) => {
    const crop = cropMap.get(p.crop);
    if (p.status !== "harvested" || !isRecurringCrop(crop)) return p;
    changed = true;
    return afterRecurringHarvest(p, crop, p.lastHarvest || todayKey);
  });
  return changed ? { ...data, garden: { ...data.garden, plots: next } } : data;
}
