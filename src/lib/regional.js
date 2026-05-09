/* ═══════════════════════════════════════════
   REGIONAL HELPERS — region-aware crop, variety, and calendar lookups
   Extracted from App.jsx (Phase A.7, 2026-05-09)

   HISTORY: getRegionalVarieties and getRegionalCalendar caused regressions
   when extracted previously (befd4da, b8e887c). Both must stay in this module
   together — never split them out separately.
   ═══════════════════════════════════════════ */

import { CROPS, CROP_MAP } from "../data/crops";
import { RO, LDB_RO } from "../data/regional-overrides";
import { VARIETIES } from "../data/varieties";
import { LIVESTOCK_CALENDAR } from "../data/livestock-calendar";

export function getRegionalCrop(baseCrop, region) {
  if (!region || region === "western_europe") return baseCrop;
  const regionOverrides = RO[region];
  if (!regionOverrides) return baseCrop;
  const ov = regionOverrides[baseCrop.name];
  if (!ov) return baseCrop;
  if (ov._na) return null;
  const merged = {};
  const keys = Object.keys(baseCrop);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    merged[k] = ov[k] !== undefined ? ov[k] : baseCrop[k];
  }
  if (ov.regionNote) merged.regionNote = ov.regionNote;
  if (ov.pests) merged.pests = ov.pests;
  return merged;
}

export function getRegionalCrops(region) {
  if (!region || region === "western_europe") return CROPS;
  const result = [];
  for (let i = 0; i < CROPS.length; i++) {
    const rc = getRegionalCrop(CROPS[i], region);
    if (rc) result.push(rc);
  }
  return result;
}

export function getRegionalCropMap(region) {
  if (!region || region === "western_europe") return CROP_MAP;
  return new Map(getRegionalCrops(region).map(function(c) { return [c.name, c]; }));
}

// Cached region helpers — cheap way to avoid recomputing on every render
let _rCacheId = null, _rCacheMap = null, _rCacheCrops = null;
export function rCM(region) {
  const r = region || "western_europe";
  if (r !== _rCacheId) { _rCacheId = r; _rCacheMap = getRegionalCropMap(r); _rCacheCrops = getRegionalCrops(r); }
  return _rCacheMap;
}
export function rCR(region) {
  const r = region || "western_europe";
  if (r !== _rCacheId) { _rCacheId = r; _rCacheMap = getRegionalCropMap(r); _rCacheCrops = getRegionalCrops(r); }
  return _rCacheCrops;
}

export function getRegionalVarieties(cropName) {
  if (!cropName) return [];
  return VARIETIES[cropName] || [];
}

export function getRegionalCalendar(animalName, region) {
  const base = LIVESTOCK_CALENDAR[animalName];
  if (!base) return null;
  if (!region || region === "western_europe") return base;
  const overrides = LDB_RO[region] && LDB_RO[region][animalName];
  if (!overrides) return base;
  return Object.assign({}, base, overrides);
}
