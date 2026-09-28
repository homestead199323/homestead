/* ═══════════════════════════════════════════
   PLAN — what to grow next, and when (Launch Stage 5, 2026-09-28)
   Pure helpers behind the Plan screen. Everything here is a view of
   existing data: suggestions come from suggest.js (same engine as
   onboarding), waiting plantings from sowing.js. Nothing is written.
   ═══════════════════════════════════════════ */
import { CROPS } from "../data/crops";
import { MN_ABR } from "./calendar";
import { suggestCrops, describeSuggestion } from "./suggest";
import { isAwaitingSowing, sowWindowOpen, waitingLabel, sowVerb } from "./sowing";
import { localDateFromKey } from "./utils";

const CROP_BY_NAME = new Map(CROPS.map(function (c) { return [c.name, c]; }));

function activePlots(data) {
  return ((data && data.garden && data.garden.plots) || []).filter(function (p) { return p && p.status !== "harvested"; });
}

/** Crops already growing or planned, so suggestions don't repeat them. */
export function cropsInPlay(data) {
  return new Set(activePlots(data).map(function (p) { return p.crop; }));
}

/**
 * Plantings that are planned but not in the ground yet (onboarding picks,
 * "Sow from <month>" plans): { plot, label, open, verb, zone }.
 * Open ones come first; then by the month their window opens.
 */
export function waitingPlantings(data, todayKey) {
  const zones = new Map(((data && data.zones) || []).map(function (z) { return [z.id, z]; }));
  return activePlots(data)
    .filter(isAwaitingSowing)
    .map(function (p) {
      const open = sowWindowOpen(p, todayKey);
      return { plot: p, open: open, label: waitingLabel(p, todayKey), verb: sowVerb(p.steps), zone: zones.get(p.zone) || null };
    })
    .sort(function (a, b) {
      if (a.open !== b.open) return a.open ? -1 : 1;
      return String(a.plot.sowFrom || "").localeCompare(String(b.plot.sowFrom || ""));
    });
}

/** Suggestions that can go in now (window open or opening within ~2 weeks), minus crops already in play. */
export function sowNowSuggestions(data, date, limit) {
  const d = date || new Date();
  const taken = cropsInPlay(data);
  const profile = (data && data.profile) || {};
  return suggestCrops(profile, data && data.region, { date: d, limit: 24, relaxIfEmpty: false })
    .filter(function (c) { return !taken.has(c.name); })
    .map(function (c) { return { crop: c, info: describeSuggestion(c, profile, data && data.region, d) }; })
    .filter(function (s) { return s.info.now; })
    .slice(0, limit || 6);
}

/**
 * Crops whose window opens in each of the next `months` months (and not
 * this one): [{ month, label, crops: [crop] }]. Same profile filters as the
 * suggestions (experience, balcony pots, sun, dislikes).
 */
export function comingUp(data, date, months, perMonth) {
  const d = date || new Date();
  const n = months || 3;
  const per = perMonth || 5;
  const profile = (data && data.profile) || {};
  const region = data && data.region;
  const seen = cropsInPlay(data);
  sowNowSuggestions(data, d, 24).forEach(function (s) { seen.add(s.crop.name); });
  const out = [];
  for (let k = 1; k <= n; k++) {
    const at = new Date(d.getFullYear(), d.getMonth() + k, 10);
    const crops = suggestCrops(profile, region, { date: at, limit: 24, relaxIfEmpty: false })
      .filter(function (c) {
        if (seen.has(c.name)) return false;
        return describeSuggestion(c, profile, region, at).now;
      })
      .slice(0, per);
    crops.forEach(function (c) { seen.add(c.name); });
    if (crops.length) out.push({ month: at.getMonth(), label: MN_ABR[at.getMonth()], crops: crops });
  }
  return out;
}

/**
 * A six-month strip of the plantings: where each one sits between planting
 * and harvest. { start, today, months: [{label}], rows: [{ id, name, crop,
 * zone, from, to, harvestKey, waiting, label }] } with today/from/to as 0–1
 * fractions of the strip.
 */
export function seasonTimeline(data, todayKey, monthCount) {
  const count = monthCount || 6;
  const today = localDateFromKey(todayKey) || new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + count, 1);
  const span = end - start;
  const frac = function (t) { return Math.max(0, Math.min(1, (t - start) / span)); };
  const zones = new Map(((data && data.zones) || []).map(function (z) { return [z.id, z]; }));
  const months = [];
  for (let k = 0; k < count; k++) months.push({ label: MN_ABR[(start.getMonth() + k) % 12] });
  const rows = activePlots(data).map(function (p) {
    const zone = zones.get(p.zone);
    const name = p.name || p.crop;
    if (isAwaitingSowing(p)) {
      return { id: p.id, name: name, crop: p.crop, zone: zone ? zone.name : "", from: 0, to: 0, harvestKey: null, waiting: true, label: waitingLabel(p, todayKey) };
    }
    const planted = p.plantDate ? localDateFromKey(p.plantDate) : null;
    const harvest = p.harvestDate ? localDateFromKey(p.harvestDate) : null;
    if (!harvest) return null;
    const from = frac(planted || start);
    const to = frac(harvest);
    if (harvest < start) {
      return { id: p.id, name: name, crop: p.crop, zone: zone ? zone.name : "", from: 0, to: 0.02, harvestKey: p.harvestDate, waiting: false, label: "Ready to pick" };
    }
    return { id: p.id, name: name, crop: p.crop, zone: zone ? zone.name : "", from: from, to: Math.max(to, from + 0.02), harvestKey: p.harvestDate, waiting: false, label: harvest >= end ? "Harvest later" : "" };
  }).filter(Boolean).sort(function (a, b) {
    if (a.waiting !== b.waiting) return a.waiting ? 1 : -1;
    return String(a.harvestKey || "").localeCompare(String(b.harvestKey || ""));
  });
  return { start: start, months: months, rows: rows, today: frac(today) };
}

/** The crop record for a name (for icons), or null. */
export function cropByName(name) {
  return CROP_BY_NAME.get(name) || null;
}
