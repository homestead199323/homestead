/* ═══════════════════════════════════════════
   BACKUP — read and describe an exported farm file (JSON)
   Pure helpers so Settings can show what a backup holds BEFORE it
   replaces anything (UX audit 2026-09-28: Import used to overwrite the
   whole farm the moment a file was picked). The migration chain is
   passed in by App.jsx — the same chain as the local and cloud loads.
   ═══════════════════════════════════════════ */

const RESERVED = ["__proto__", "constructor", "prototype"];

/** What a farm holds, for the confirm step: areas, plantings (not yet harvested), animals, pantry items. */
export function farmSummary(d) {
  const zones = d && Array.isArray(d.zones) ? d.zones.length : 0;
  const plots = d && d.garden && Array.isArray(d.garden.plots)
    ? d.garden.plots.filter(function (p) { return p && p.status !== "harvested"; }).length
    : 0;
  const animals = d && d.livestock && Array.isArray(d.livestock.animals) ? d.livestock.animals.length : 0;
  const pantry = d && d.pantry && Array.isArray(d.pantry.items) ? d.pantry.items.length : 0;
  return { areas: zones, plantings: plots, animals: animals, pantry: pantry };
}

function count(n, one, many) {
  return n + " " + (n === 1 ? one : many);
}

/** "3 areas · 12 plantings · 4 animals" — animals and pantry only when there are any. */
export function describeSummary(s) {
  if (!s) return "";
  const bits = [count(s.areas, "area", "areas"), count(s.plantings, "planting", "plantings")];
  if (s.animals) bits.push(count(s.animals, "animal", "animals"));
  if (s.pantry) bits.push(count(s.pantry, "pantry item", "pantry items"));
  return bits.join(" · ");
}

/**
 * Parse the text of a backup file. Throws an Error with a plain-language
 * message when the file isn't a MyTerra backup, so nothing is replaced.
 * `migrate(raw)` turns the raw object into current-shape farm data.
 * Returns { data, summary }.
 */
export function parseBackup(text, migrate) {
  let d;
  try {
    d = JSON.parse(text);
  } catch {
    throw new Error("This file isn't a MyTerra backup. Use a file made with “Export Backup”.");
  }
  if (!d || typeof d !== "object" || Array.isArray(d)) {
    throw new Error("This file isn't a MyTerra backup. Use a file made with “Export Backup”.");
  }
  // Defensive: reject prototype-pollution payloads (JSON.parse makes these own keys).
  if (RESERVED.some(function (k) { return Object.prototype.hasOwnProperty.call(d, k); })) {
    throw new Error("This backup file contains reserved keys and can't be imported safely.");
  }
  const looksLikeFarm = Array.isArray(d.zones)
    || (d.garden && typeof d.garden === "object" && Array.isArray(d.garden.plots))
    || typeof d.schemaVersion === "number";
  if (!looksLikeFarm) {
    throw new Error("This file isn't a MyTerra backup. Use a file made with “Export Backup”.");
  }
  const data = typeof migrate === "function" ? migrate(d) : d;
  return { data: data, summary: farmSummary(data) };
}
