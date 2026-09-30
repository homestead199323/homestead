/* ═══════════════════════════════════════════
   INSIGHTS — Pro analytics from the garden memory (top-10 #4, 2026-09-30)

   Pure, read-only. Sources:
     data.memory (lib/memory.js) — harvests per planting/bed, beds history,
       eggs/milk/meat per species per month
     data.pantry.moves — older harvests/collections logged before the memory
       existed (no bed info; used only for dates before the memory starts)
     data.costs.items  — expenses; `for: "species:<Type>" | "zone:<id>"` ties
       one to an animal group or bed (Money → Add entry → "For")
   Nothing here is estimated: a number shows only when its inputs exist.
   ═══════════════════════════════════════════ */

import { familyOf, familyInfo, ROTATE, ROTATION_YEARS } from "../data/families.js";
import { isAwaitingSowing } from "./sowing.js";

const r1 = (n) => Math.round(n * 10) / 10;
const r2 = (n) => Math.round(n * 100) / 100;
const yearOf = (d) => String(d || "").slice(0, 4);
const GROWING = new Set(["veg", "raised", "herbs", "orchard", "greenhouse", "container", "nursery"]);

function mem(data) {
  const m = (data && data.memory) || {};
  return { harvests: Array.isArray(m.harvests) ? m.harvests : [], beds: Array.isArray(m.beds) ? m.beds : [], produce: m.produce && typeof m.produce === "object" ? m.produce : {} };
}
function moves(data) {
  return (data && data.pantry && Array.isArray(data.pantry.moves) ? data.pantry.moves : []).filter((m) => m && m.kind === "in");
}

/** Every harvest: memory records, plus older pantry-logged ones (no bed) from before the memory began. */
export function harvestRecords(data) {
  const m = mem(data);
  const first = m.harvests.reduce((min, h) => (!min || h.d < min ? h.d : min), "");
  const legacy = moves(data)
    .filter((x) => x.source === "farm" && x.unit === "kg" && Number(x.qty) > 0 && (!first || String(x.date) < first))
    .map((x) => ({ d: x.date, crop: x.name, kg: Number(x.qty), zoneId: null, exp: null, legacy: true }));
  return [...legacy, ...m.harvests.filter((h) => h && h.d && Number(h.kg) >= 0)];
}

/** Animal produce per month and species: { "YYYY-MM": { Chicken: { eggs, milkL, meatKg } } }, with older pantry logs folded in. */
export function produceBuckets(data) {
  const m = mem(data);
  const out = JSON.parse(JSON.stringify(m.produce));
  const months = Object.keys(out).sort();
  const first = months[0] || "";
  moves(data).filter((x) => x.source === "livestock" && (!first || String(x.date).slice(0, 7) < first)).forEach((x) => {
    const name = String(x.name || "");
    const kind = /eggs?$/i.test(name) && x.unit === "pcs" ? "eggs" : x.unit === "L" && /milk$/i.test(name) ? "milkL" : /meat$/i.test(name) && x.unit === "kg" ? "meatKg" : null;
    if (!kind) return;
    const sp = name.replace(/\s*(eggs?|milk|meat)$/i, "").trim() || "Animals";
    const mo = String(x.date).slice(0, 7);
    out[mo] = out[mo] || {};
    out[mo][sp] = out[mo][sp] || {};
    out[mo][sp][kind] = r2((out[mo][sp][kind] || 0) + Number(x.qty));
  });
  return out;
}

/** Years with any record, newest first; always includes the current year. */
export function insightYears(data, todayKey) {
  const ys = new Set([yearOf(todayKey)]);
  harvestRecords(data).forEach((h) => ys.add(yearOf(h.d)));
  Object.keys(produceBuckets(data)).forEach((k) => ys.add(k.slice(0, 4)));
  bedHistoryRows(data).forEach((b) => { if (b.from) ys.add(yearOf(b.from)); });
  ((data.costs && data.costs.items) || []).forEach((c) => c && c.date && ys.add(yearOf(c.date)));
  return [...ys].filter((y) => /^\d{4}$/.test(y)).sort().reverse();
}

/** Harvest by crop for a year: [{ crop, kg, harvests, expKg, actualWithExp, pct }] — pct only where a per-planting estimate existed. */
export function cropYields(data, year) {
  const by = new Map();
  harvestRecords(data).filter((h) => yearOf(h.d) === String(year)).forEach((h) => {
    const c = by.get(h.crop) || { crop: h.crop, kg: 0, harvests: 0, expKg: 0, actualWithExp: 0 };
    c.kg += Number(h.kg) || 0; c.harvests += 1;
    if (h.exp) { c.expKg += Number(h.exp); c.actualWithExp += Number(h.kg) || 0; }
    by.set(h.crop, c);
  });
  return [...by.values()].map((c) => ({ ...c, kg: r1(c.kg), expKg: r1(c.expKg), actualWithExp: r1(c.actualWithExp), pct: c.expKg > 0 ? Math.round((c.actualWithExp / c.expKg) * 100) : null }))
    .sort((a, b) => b.kg - a.kg);
}

/** Harvest by bed for a year: [{ zoneId, name, type, kg, areaM2, kgPerM2, crops }]; unplaced (older) harvests are left out. */
export function bedYields(data, year) {
  const zones = new Map((data.zones || []).map((z) => [z.id, z]));
  const by = new Map();
  harvestRecords(data).filter((h) => h.zoneId && yearOf(h.d) === String(year)).forEach((h) => {
    const z = zones.get(h.zoneId);
    const b = by.get(h.zoneId) || { zoneId: h.zoneId, name: z ? z.name : "Removed area", type: z ? z.type : "", kg: 0, crops: new Set() };
    b.kg += Number(h.kg) || 0; b.crops.add(h.crop);
    by.set(h.zoneId, b);
  });
  return [...by.values()].map((b) => {
    const z = zones.get(b.zoneId);
    const area = z && z.wM && z.hM ? z.wM * z.hM : null;
    return { ...b, kg: r1(b.kg), crops: [...b.crops], areaM2: area ? r1(area) : null, kgPerM2: area ? r2(b.kg / area) : null };
  }).sort((a, b) => b.kg - a.kg);
}

/** Per species for a year: [{ species, head, eggs, milkL, meatKg, byMonth: [{ m, eggs, milkL }] (12), eggsPerHeadDay }] */
export function animalYields(data, year) {
  const buckets = produceBuckets(data);
  const head = {};
  ((data.livestock && data.livestock.animals) || []).forEach((a) => { head[a.type] = (head[a.type] || 0) + (Number(a.count) || 1); });
  const by = {};
  Object.keys(buckets).filter((k) => k.slice(0, 4) === String(year)).forEach((k) => {
    const mi = Number(k.slice(5, 7)) - 1;
    Object.keys(buckets[k]).forEach((sp) => {
      const v = buckets[k][sp];
      const s = by[sp] || (by[sp] = { species: sp, eggs: 0, milkL: 0, meatKg: 0, byMonth: Array.from({ length: 12 }, (_, i) => ({ m: i, eggs: 0, milkL: 0 })), activeDays: 0 });
      s.eggs += v.eggs || 0; s.milkL += v.milkL || 0; s.meatKg += v.meatKg || 0;
      s.byMonth[mi].eggs += v.eggs || 0; s.byMonth[mi].milkL += v.milkL || 0;
    });
  });
  return Object.values(by).map((s) => {
    const months = s.byMonth.filter((x) => x.eggs > 0).length;
    const h = head[s.species] || 0;
    return { ...s, head: h, eggs: Math.round(s.eggs), milkL: r1(s.milkL), meatKg: r1(s.meatKg),
      // Rough lay rate over the months that had eggs, per bird kept now (30-day months).
      eggsPerHeadDay: h > 0 && months > 0 ? r2(s.eggs / h / (months * 30)) : null };
  }).sort((a, b) => (b.eggs + b.milkL) - (a.eggs + a.milkL));
}

/** What an expense is for: "species:<Type>", "zone:<id>" or "" (general). */
export function costTarget(item) {
  return typeof (item && item.for) === "string" ? item.for : "";
}

/**
 * Cost per egg / litre / garden kg for a year.
 * Animals: expenses tagged to the species; when only one kind of animal is kept,
 * untagged Feed and Animals expenses count for it too (said in `notes`).
 * Garden: Seeds expenses plus anything tagged to a bed, over kg harvested.
 */
export function unitCosts(data, year) {
  const exp = ((data.costs && data.costs.items) || []).filter((c) => c && c.type === "expense" && yearOf(c.date) === String(year));
  const kept = [...new Set(((data.livestock && data.livestock.animals) || []).map((a) => a.type).filter((t) => t !== "Bee"))];
  const only = kept.length === 1 ? kept[0] : null;
  const notes = [];
  const perSpecies = {};
  let garden = 0;
  let usedFallback = false;
  exp.forEach((c) => {
    const t = costTarget(c);
    const amt = Number(c.amount) || 0;
    if (t.startsWith("species:")) { const sp = t.slice(8); perSpecies[sp] = (perSpecies[sp] || 0) + amt; }
    else if (t.startsWith("zone:") || (!t && c.cat === "Seeds")) garden += amt;
    else if (!t && only && (c.cat === "Feed" || c.cat === "Animals")) { perSpecies[only] = (perSpecies[only] || 0) + amt; usedFallback = true; }
  });
  if (usedFallback) notes.push(`Feed and animal costs without a "For" count toward your ${only.toLowerCase()}s, since that's the only animal you keep.`);
  const kg = harvestRecords(data).filter((h) => yearOf(h.d) === String(year)).reduce((n, h) => n + (Number(h.kg) || 0), 0);
  const animals = animalYields(data, year);
  const species = Object.keys(perSpecies).map((sp) => {
    const a = animals.find((x) => x.species === sp) || { eggs: 0, milkL: 0 };
    const spent = r2(perSpecies[sp]);
    return { species: sp, spent, eggs: a.eggs, milkL: a.milkL,
      perEgg: a.eggs > 0 && !(a.milkL > 0) ? r2(spent / a.eggs) : null,
      perDozen: a.eggs > 0 && !(a.milkL > 0) ? r2((spent / a.eggs) * 12) : null,
      perLitre: a.milkL > 0 && !(a.eggs > 0) ? r2(spent / a.milkL) : null };
  });
  return { garden: { spent: r2(garden), kg: r1(kg), perKg: kg > 0 && garden > 0 ? r2(garden / kg) : null }, species, notes };
}

/** Every planting that has been in the ground, newest first: [{ plotId, zoneId, crop, family, from, to, current }] */
export function bedHistoryRows(data) {
  const m = mem(data);
  const rows = new Map();
  m.beds.forEach((b) => { if (b && b.plotId) rows.set(b.plotId, { ...b, current: false }); });
  (((data.garden || {}).plots) || []).forEach((p) => {
    if (!p || !p.plantDate || isAwaitingSowing(p) || p.status === "planned") return;
    const prev = rows.get(p.id);
    rows.set(p.id, { plotId: p.id, zoneId: p.zone, crop: p.crop, variety: p.variety || (prev && prev.variety) || "", from: p.plantDate,
      to: p.status === "harvested" ? (prev && prev.to) || p.harvestDate || null : null, current: p.status !== "harvested" });
  });
  return [...rows.values()].map((r) => ({ ...r, family: familyOf(r.crop) })).sort((a, b) => String(b.from || "").localeCompare(String(a.from || "")));
}

/** Beds with their plantings grouped by year: [{ zoneId, name, years: [{ year, crops: [{ crop, family, current }] }] }] */
export function bedHistory(data) {
  const zones = (data.zones || []).filter((z) => GROWING.has(z.type));
  const rows = bedHistoryRows(data);
  return zones.map((z) => {
    const years = {};
    rows.filter((r) => r.zoneId === z.id).forEach((r) => {
      const y = yearOf(r.from) || "—";
      (years[y] = years[y] || []).push({ crop: r.crop, family: r.family, current: r.current });
    });
    return { zoneId: z.id, name: z.name, type: z.type, years: Object.keys(years).sort().reverse().map((y) => ({ year: y, crops: years[y] })) };
  }).filter((b) => b.years.length > 0);
}

/**
 * Rotation check before planting `crop` in a bed: the same rotating family in
 * this bed in any of the previous ROTATION_YEARS years → { family, label, crop, year, note }.
 * Same-season plantings don't count (a second sowing is not a rotation problem).
 */
export function rotationCheck(data, zoneId, crop, todayKey) {
  const fam = familyOf(crop);
  if (!zoneId || !fam || !ROTATE.has(fam)) return null;
  const y = Number(yearOf(todayKey));
  const hit = bedHistoryRows(data).find((r) => r.zoneId === zoneId && r.family === fam && Number(yearOf(r.from)) < y && Number(yearOf(r.to || r.from)) >= y - ROTATION_YEARS);
  if (!hit) return null;
  const info = familyInfo(fam);
  return { family: fam, label: info.label, crop: hit.crop, year: Number(yearOf(hit.to || hit.from)), note: info.note || "" };
}

/* ─── Spreadsheet export (CSV, opens in Excel / Numbers / Google Sheets) ─── */
function cell(v) {
  if (v == null) return "";
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s; // no formulas from user text
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCsv(rows) {
  return rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

export function harvestsCsv(data) {
  const zones = new Map((data.zones || []).map((z) => [z.id, z.name]));
  const rows = harvestRecords(data).slice().sort((a, b) => String(a.d).localeCompare(String(b.d)))
    .map((h) => [h.d, h.crop, h.variety || "", h.zoneId ? zones.get(h.zoneId) || "Removed area" : "", h.kg, h.exp ?? "", h.from || ""]);
  return toCsv([["Date", "Crop", "Variety", "Bed", "Harvested kg", "Expected kg", "Planted"], ...rows]);
}
export function animalCsv(data) {
  const b = produceBuckets(data);
  const rows = [];
  Object.keys(b).sort().forEach((mo) => Object.keys(b[mo]).sort().forEach((sp) => rows.push([mo, sp, Math.round(b[mo][sp].eggs || 0), b[mo][sp].milkL || 0, b[mo][sp].meatKg || 0])));
  return toCsv([["Month", "Animal", "Eggs", "Milk L", "Meat kg"], ...rows]);
}
export function bedsCsv(data) {
  const zones = new Map((data.zones || []).map((z) => [z.id, z.name]));
  const rows = bedHistoryRows(data).slice().reverse().map((r) => [zones.get(r.zoneId) || "Removed area", r.crop, r.variety || "", r.family ? familyInfo(r.family).label : "", r.from || "", r.current ? "growing" : r.to || ""]);
  return toCsv([["Bed", "Crop", "Variety", "Family", "Planted", "Ended"], ...rows]);
}
export function moneyCsv(data) {
  const zones = new Map((data.zones || []).map((z) => [z.id, z.name]));
  const forLabel = (c) => { const t = costTarget(c); return t.startsWith("species:") ? t.slice(8) : t.startsWith("zone:") ? zones.get(t.slice(5)) || "" : ""; };
  const rows = ((data.costs && data.costs.items) || []).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((c) => [c.date, c.type, c.cat || "", c.label || "", forLabel(c), c.type === "expense" ? -Math.abs(Number(c.amount) || 0) : Number(c.amount) || 0]);
  return toCsv([["Date", "Type", "Category", "Description", "For", "Amount"], ...rows]);
}
