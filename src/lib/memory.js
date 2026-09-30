/* ═══════════════════════════════════════════
   GARDEN MEMORY — what grew where, and what it gave (top-10 #4, 2026-09-30)

   data.memory (optional; old farms simply don't have it yet):
     harvests: [{ d, plotId, zoneId, crop, variety, kg, exp, from }]   one per harvest
     beds:     [{ plotId, zoneId, crop, variety, from, to }]           one per planting, closed on
                                                                          harvest/removal (perennials: to = last harvest)
     produce:  { "YYYY-MM": { "<Species>": { eggs, milkL, meatKg } } }  monthly buckets
   Written by complete-task.js (harvest / eggs / milk), Livestock.jsx
   (collect, slaughter) and PlotOverlay (remove a planting). Read by
   lib/insights.js. Capped so the farm document stays small.
   ═══════════════════════════════════════════ */

import { isAwaitingSowing } from "./sowing.js";

export const HARVEST_CAP = 1500;
export const BED_CAP = 1500;
const r2 = (n) => Math.round(n * 100) / 100;

function mem(data) {
  const m = data.memory || {};
  return { harvests: Array.isArray(m.harvests) ? m.harvests : [], beds: Array.isArray(m.beds) ? m.beds : [], produce: m.produce && typeof m.produce === "object" ? m.produce : {} };
}

function upsertBed(beds, plot, patch) {
  const i = beds.findIndex((b) => b.plotId === plot.id);
  const base = { plotId: plot.id, zoneId: plot.zone || null, crop: plot.crop, variety: plot.variety || "", from: plot.plantDate || null, to: null };
  if (i < 0) return [...beds, { ...base, ...patch }].slice(-BED_CAP);
  const next = beds.slice();
  next[i] = { ...next[i], zoneId: plot.zone || next[i].zoneId, crop: plot.crop, from: plot.plantDate || next[i].from, ...patch };
  return next;
}

/** A harvest from a planting. `final` = the planting is finished (annuals). */
export function recordHarvest(data, plot, kg, dateKey, expectedKg, final = true) {
  if (!plot) return data;
  const m = mem(data);
  const h = { d: dateKey, plotId: plot.id, zoneId: plot.zone || null, crop: plot.crop, variety: plot.variety || "", kg: r2(Number(kg) || 0), exp: expectedKg ? r2(Number(expectedKg)) : null, from: plot.plantDate || null };
  return {
    ...data,
    memory: { ...m, harvests: [...m.harvests, h].slice(-HARVEST_CAP), beds: upsertBed(m.beds, plot, final ? { to: dateKey } : { lastHarvest: dateKey }) },
  };
}

/** A planting removed before harvest: remember that it grew there (if it was ever in the ground). */
export function recordRemoval(data, plot, dateKey) {
  if (!plot || !plot.plantDate || isAwaitingSowing(plot) || plot.status === "planned") return data;
  if (plot.status === "harvested") return data; // already closed by its harvest
  const m = mem(data);
  return { ...data, memory: { ...m, beds: upsertBed(m.beds, plot, { to: dateKey, removed: true }) } };
}

/** Eggs, milk or meat from an animal group, bucketed by month. kind: "eggs" | "milkL" | "meatKg". */
export function recordProduce(data, speciesType, kind, qty, dateKey) {
  const q = Number(qty) || 0;
  if (!speciesType || q <= 0 || !["eggs", "milkL", "meatKg"].includes(kind)) return data;
  const m = mem(data);
  const month = String(dateKey).slice(0, 7);
  const bucket = { ...(m.produce[month] || {}) };
  const sp = { ...(bucket[speciesType] || {}) };
  sp[kind] = r2((sp[kind] || 0) + q);
  bucket[speciesType] = sp;
  return { ...data, memory: { ...m, produce: { ...m.produce, [month]: bucket } } };
}
