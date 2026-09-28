/* ═══════════════════════════════════════════
   PROGRESS — what the space has given so far (Launch Stage 5, 2026-09-28)
   Pure helpers behind the Progress screen. Read-only views of existing
   data: pantry moves (every harvest / collection is logged as an "in"
   move), plots, costs and gamify. Nothing is written.
   ═══════════════════════════════════════════ */
import { BADGES } from "../data/badges";
import { localDateFromKey } from "./utils";
import { MN_ABR } from "./calendar";
import { isAwaitingSowing } from "./sowing";

// A portion of fruit or vegetables is 80 g (NHS "5 A Day").
export const PORTION_G = 80;

const r1 = function (n) { return Math.round(n * 10) / 10; };

function movesIn(data) {
  const moves = (data && data.pantry && Array.isArray(data.pantry.moves)) ? data.pantry.moves : [];
  return moves.filter(function (m) { return m && m.kind === "in" && (m.source === "farm" || m.source === "livestock"); });
}

/**
 * Food produced, from the pantry's intake log (falls back to what's in the
 * pantry now when an old farm has no log yet).
 * → { kg, eggs, milkL, harvests, portions, byMonth: [{ key, label, kg }] }
 */
export function produceTotals(data, todayKey, monthCount) {
  let list = movesIn(data);
  if (!list.length) {
    const items = (data && data.pantry && data.pantry.items) || [];
    list = items.filter(function (it) { return it && (it.source === "farm" || it.source === "livestock"); })
      .map(function (it) { return { date: it.addedDate, name: it.name, unit: it.unit, qty: it.qty, source: it.source }; });
  }
  let kg = 0, eggs = 0, milkL = 0, harvests = 0;
  const perMonth = {};
  list.forEach(function (m) {
    const q = Number(m.qty) || 0;
    if (q <= 0) return;
    if (m.source === "farm" && m.unit === "kg") {
      kg += q; harvests += 1;
      const key = String(m.date || "").slice(0, 7);
      if (key) perMonth[key] = (perMonth[key] || 0) + q;
    } else if (m.unit === "pcs" && /egg/i.test(m.name || "")) eggs += q;
    else if (m.unit === "L") milkL += q;
  });
  const today = localDateFromKey(todayKey) || new Date();
  const n = monthCount || 6;
  const byMonth = [];
  for (let k = n - 1; k >= 0; k--) {
    const d = new Date(today.getFullYear(), today.getMonth() - k, 1);
    const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    byMonth.push({ key: key, label: MN_ABR[d.getMonth()], kg: r1(perMonth[key] || 0) });
  }
  return { kg: r1(kg), eggs: Math.round(eggs), milkL: r1(milkL), harvests: harvests, portions: Math.floor((kg * 1000) / PORTION_G), byMonth: byMonth };
}

/** Money in and out from Financials: { spent, earned, net, entries }. */
export function moneyTotals(data) {
  const items = (data && data.costs && data.costs.items) || [];
  let spent = 0, earned = 0;
  items.forEach(function (i) {
    const a = Number(i && i.amount) || 0;
    if (i.type === "expense") spent += a; else if (i.type === "income") earned += a;
  });
  return { spent: Math.round(spent * 100) / 100, earned: Math.round(earned * 100) / 100, net: Math.round((earned - spent) * 100) / 100, entries: items.length };
}

/** Every badge with whether it's earned (and when), earned first. */
export function badgeList(data) {
  const got = new Map((((data && data.gamify) || {}).badges || []).map(function (b) { return [b.id, b.unlockedAt]; }));
  return BADGES.map(function (b) {
    return { id: b.id, emoji: b.emoji, name: b.name, desc: b.desc, earned: got.has(b.id), unlockedAt: got.get(b.id) || null };
  }).sort(function (a, b) { return (a.earned === b.earned) ? 0 : a.earned ? -1 : 1; });
}

/**
 * The next thing to look forward to: the soonest harvest among plantings in
 * the ground → { name, crop, harvestKey, inDays } or null.
 */
export function nextHarvest(data, todayKey) {
  const today = localDateFromKey(todayKey) || new Date();
  let best = null;
  (((data && data.garden) || {}).plots || []).forEach(function (p) {
    if (!p || p.status === "harvested" || p.sowPending || p.status === "planned" || !p.harvestDate) return;
    const h = localDateFromKey(p.harvestDate);
    if (!h) return;
    const inDays = Math.round((h - today) / 864e5);
    if (!best || inDays < best.inDays) best = { name: p.name || p.crop, crop: p.crop, harvestKey: p.harvestDate, inDays: inDays };
  });
  return best;
}

/** Plantings by state: { growing, waiting, ready }. */
export function plantingCounts(data, todayKey) {
  const today = localDateFromKey(todayKey) || new Date();
  let growing = 0, waiting = 0, ready = 0;
  (((data && data.garden) || {}).plots || []).forEach(function (p) {
    if (!p || p.status === "harvested") return;
    if (isAwaitingSowing(p) || p.status === "planned") { waiting += 1; return; }
    growing += 1;
    const h = p.harvestDate ? localDateFromKey(p.harvestDate) : null;
    if (h && h <= today) ready += 1;
  });
  return { growing: growing, waiting: waiting, ready: ready };
}

/** An emoji for a pantry line or crop name when no drawn icon exists. */
export function produceEmoji(name, crop) {
  if (crop && crop.emoji) return crop.emoji;
  const n = String(name || "");
  if (/egg/i.test(n)) return "🥚";
  if (/milk/i.test(n)) return "🥛";
  if (/honey/i.test(n)) return "🍯";
  if (/cheese/i.test(n)) return "🧀";
  return "🧺";
}
