/* ═══════════════════════════════════════════
   GARDEN MEMORY — what grew where, and what it gave (top-10 #4, 2026-09-30)

   data.memory:
     since:    "YYYY-MM-DD" — set by migrateMemory when older pantry logs were
               copied in (from then on Insights read only this block)
     harvests: [{ d, plotId, zoneId, crop, variety, kg, exp, from, est?, legacy? }]
               est    = the amount was MyTerra's estimate, not typed/weighed
               legacy = copied from the pantry log (no bed, no estimate)
     beds:     [{ plotId, zoneId, crop, variety, from, to, removed?, lastHarvest? }]
               one per planting that was in the ground; closed on harvest or removal
     produce:  { "YYYY-MM": { "<Species>": { eggs, milkL, meatKg, eggsEst, milkLEst, meatKgEst, d1 } } }
               *Est = the part logged at MyTerra's default amount; d1 = first logged day
     ticks:    { "<taskKey>": { d, kind, q, est, sp, item, move, prevPlot, hIdx } } — today's
               ticks only, so a "Done today → Undo" can take exactly that amount back out
   Written by complete-task.js, Livestock.jsx and PlotOverlay; read by lib/insights.js.
   ═══════════════════════════════════════════ */

import { isAwaitingSowing } from "./sowing.js";

export const HARVEST_CAP = 1500;
export const BED_CAP = 1500;
const KINDS = ["eggs", "milkL", "meatKg"];
const r2 = (n) => Math.round(n * 100) / 100;

function mem(data) {
  const m = (data && data.memory) || {};
  return {
    ...m,
    harvests: Array.isArray(m.harvests) ? m.harvests : [],
    beds: Array.isArray(m.beds) ? m.beds : [],
    produce: m.produce && typeof m.produce === "object" ? m.produce : {},
  };
}

function upsertBed(beds, plot, patch) {
  const i = beds.findIndex((b) => b.plotId === plot.id);
  const base = { plotId: plot.id, zoneId: plot.zone || null, crop: plot.crop, variety: plot.variety || "", from: plot.plantDate || null, to: null };
  if (i < 0) return [...beds, { ...base, ...patch }].slice(-BED_CAP);
  const next = beds.slice();
  next[i] = { ...next[i], zoneId: plot.zone || next[i].zoneId, crop: plot.crop, from: plot.plantDate || next[i].from, ...patch };
  return next;
}

/** A harvest from a planting. `final` = the planting is finished (annuals). `est` = amount not typed. */
export function recordHarvest(data, plot, kg, dateKey, expectedKg, final = true, est = false) {
  if (!plot) return data;
  const m = mem(data);
  const h = { d: dateKey, plotId: plot.id, zoneId: plot.zone || null, crop: plot.crop, variety: plot.variety || "", kg: r2(Number(kg) || 0), exp: expectedKg ? r2(Number(expectedKg)) : null, from: plot.plantDate || null };
  if (est) h.est = true;
  return {
    ...data,
    memory: { ...m, harvests: [...m.harvests, h].slice(-HARVEST_CAP), beds: upsertBed(m.beds, plot, final ? { to: dateKey } : { lastHarvest: dateKey }) },
  };
}

/** Take a harvest record back out (Done today → Undo). */
export function removeHarvest(data, plotId, dateKey) {
  const m = mem(data);
  let idx = -1;
  for (let i = m.harvests.length - 1; i >= 0; i--) if (m.harvests[i].plotId === plotId && m.harvests[i].d === dateKey) { idx = i; break; }
  if (idx < 0) return data;
  const beds = m.beds.map((b) => (b.plotId === plotId && (b.to === dateKey || b.lastHarvest === dateKey) ? { ...b, to: b.to === dateKey ? null : b.to, lastHarvest: b.lastHarvest === dateKey ? undefined : b.lastHarvest } : b));
  return { ...data, memory: { ...m, harvests: m.harvests.filter((_, i) => i !== idx), beds } };
}

const MIN_DAYS_REMEMBERED = 14; // a planting removed within two weeks was most likely a mistake

/** A planting removed from the map: remember that it grew there (if it really was in the ground). */
export function recordRemoval(data, plot, dateKey) {
  if (!plot || !plot.plantDate || isAwaitingSowing(plot) || plot.status === "planned") return data;
  const m = mem(data);
  if (plot.status === "harvested") {
    // Closed by its harvest — unless it was harvested before the memory existed.
    if (m.beds.some((b) => b.plotId === plot.id)) return data;
    return { ...data, memory: { ...m, beds: upsertBed(m.beds, plot, { to: plot.harvestDate || dateKey }) } };
  }
  const days = (Date.parse(dateKey) - Date.parse(plot.plantDate)) / 864e5;
  if (!(days >= MIN_DAYS_REMEMBERED)) return data;
  return { ...data, memory: { ...m, beds: upsertBed(m.beds, plot, { to: dateKey, removed: true }) } };
}

/** Eggs, milk or meat from an animal group, bucketed by month. kind: "eggs" | "milkL" | "meatKg". */
export function recordProduce(data, speciesType, kind, qty, dateKey, est = false) {
  const q = Number(qty) || 0;
  if (!speciesType || q <= 0 || !KINDS.includes(kind)) return data;
  const m = mem(data);
  const month = String(dateKey).slice(0, 7);
  const day = Number(String(dateKey).slice(8, 10)) || 1;
  const bucket = { ...(m.produce[month] || {}) };
  const sp = { ...(bucket[speciesType] || {}) };
  sp[kind] = r2((sp[kind] || 0) + q);
  if (est) sp[kind + "Est"] = r2((sp[kind + "Est"] || 0) + q);
  sp.d1 = sp.d1 ? Math.min(sp.d1, day) : day;
  bucket[speciesType] = sp;
  return { ...data, memory: { ...m, produce: { ...m.produce, [month]: bucket } } };
}

/** Take produce back out (Done today → Undo). */
export function subtractProduce(data, speciesType, kind, qty, dateKey, est = false) {
  const q = Number(qty) || 0;
  const m = mem(data);
  const month = String(dateKey).slice(0, 7);
  const sp0 = m.produce[month] && m.produce[month][speciesType];
  if (!sp0 || q <= 0) return data;
  const sp = { ...sp0, [kind]: r2(Math.max(0, (sp0[kind] || 0) - q)) };
  if (est) sp[kind + "Est"] = r2(Math.max(0, (sp0[kind + "Est"] || 0) - q));
  return { ...data, memory: { ...m, produce: { ...m.produce, [month]: { ...m.produce[month], [speciesType]: sp } } } };
}

/** Remember what a tick added today, so Undo can take exactly that back. Older ticks are dropped. */
export function rememberTick(data, key, tick) {
  const m = mem(data);
  const ticks = {};
  Object.keys(m.ticks || {}).forEach((k) => { if (m.ticks[k] && m.ticks[k].d === tick.d) ticks[k] = m.ticks[k]; });
  ticks[key] = tick;
  return { ...data, memory: { ...m, ticks } };
}
export function takeTick(data, key, dateKey) {
  const m = mem(data);
  const t = m.ticks && m.ticks[key];
  if (!t || t.d !== dateKey) return { data, tick: null };
  const ticks = { ...m.ticks };
  delete ticks[key];
  return { data: { ...data, memory: { ...m, ticks } }, tick: t };
}

/**
 * One-time backfill (runs in the migration chain). Before the memory existed,
 * harvests and collections were only logged as pantry "in" moves (capped at
 * 500, so they slowly fall off). Copy them in once, then Insights read only
 * data.memory. Every memory record written before this ran also has a pantry
 * move, so moves already in the memory are matched, not copied twice.
 */
export function migrateMemory(data, todayKey) {
  if (!data || (data.memory && data.memory.since)) return data;
  const m = mem(data);
  const moves = (data.pantry && Array.isArray(data.pantry.moves) ? data.pantry.moves : []).filter((x) => x && x.kind === "in" && Number(x.qty) > 0);

  // Harvests: pair each memory harvest with its move; unpaired moves are older harvests.
  const used = new Set();
  const legacy = [];
  moves.filter((x) => x.source === "farm" && x.unit === "kg").forEach((x) => {
    const i = m.harvests.findIndex((h, j) => !used.has(j) && h.d === x.date && h.crop === x.name && Math.abs((Number(h.kg) || 0) - Number(x.qty)) < 0.011);
    if (i >= 0) { used.add(i); return; }
    legacy.push({ d: x.date, crop: x.name, kg: r2(Number(x.qty)), zoneId: null, plotId: null, exp: null, legacy: true });
  });
  // Records written before estimates were flagged: an amount exactly equal to the estimate was the default.
  const flagged = m.harvests.map((h) => (h.exp && !h.est && Math.abs(h.kg - h.exp) < 0.011 ? { ...h, est: true } : h));
  const harvests = [...legacy, ...flagged].sort((a, b) => String(a.d).localeCompare(String(b.d))).slice(-HARVEST_CAP);

  // Produce: rebuild from the moves (a superset of what the memory holds); keep whichever is larger.
  const fromMoves = {};
  moves.filter((x) => x.source === "livestock").forEach((x) => {
    const name = String(x.name || "");
    const kind = /eggs?$/i.test(name) && x.unit === "pcs" ? "eggs" : x.unit === "L" && /milk$/i.test(name) ? "milkL" : /meat$/i.test(name) && x.unit === "kg" ? "meatKg" : null;
    if (!kind) return;
    const sp = name.replace(/\s*(eggs?|milk|meat)$/i, "").trim() || "Animals";
    const mo = String(x.date).slice(0, 7);
    const day = Number(String(x.date).slice(8, 10)) || 1;
    const b = (fromMoves[mo] = fromMoves[mo] || {});
    const s = (b[sp] = b[sp] || { d1: day });
    s[kind] = r2((s[kind] || 0) + Number(x.qty));
    s.d1 = Math.min(s.d1, day);
  });
  const produce = JSON.parse(JSON.stringify(m.produce));
  Object.keys(fromMoves).forEach((mo) => Object.keys(fromMoves[mo]).forEach((sp) => {
    const a = fromMoves[mo][sp];
    const cur = (produce[mo] = produce[mo] || {})[sp] || {};
    const merged = { ...cur, d1: Math.min(cur.d1 || 31, a.d1 || 31) };
    KINDS.forEach((k) => {
      const v = Math.max(cur[k] || 0, a[k] || 0);
      if (v > 0) {
        merged[k] = v;
        // Nothing logged before today says whether it was counted or the default: treat as unverified.
        merged[k + "Est"] = v;
      }
    });
    produce[mo][sp] = merged;
  }));
  return { ...data, memory: { ...m, since: todayKey, harvests, produce } };
}
