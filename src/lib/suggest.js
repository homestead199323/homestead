/* ═══════════════════════════════════════════
   SUGGEST — profile-aware crop suggestions (Launch Stage 3, 2026-07-14)
   Single source for "what should this person plant right now".
   Consumed by onboarding (plant picker) and reusable by the future
   Plan screen (Stage 5/6). Pure function of (profile, region, date).
   ═══════════════════════════════════════════ */
import { CROPS } from "../data/crops";
import { CROP_DIFFICULTY, parseSowMonths } from "./calendar";
import { getRegionalCrop } from "./regional";

// Crops that thrive in pots/planters — used when environment is "balcony"
// or the grower's only asset is containers.
export const CONTAINER_FRIENDLY = [
  "Basil","Mint","Radish","Lettuce","Spinach","Strawberry","Tomato",
  "Pepper (Sweet)","Swiss Chard","Parsley","Thyme","Oregano","Rosemary","Kale",
];

// Beginner-friendly ranking — earlier = suggested first.
export const BEGINNER_PRIORITY = [
  "Radish","Lettuce","Spinach","Basil","Mint","Kale","Pea","Zucchini",
  "Strawberry","Swiss Chard","Bean (Dry)","Broad Bean","Turnip","Tomato",
];

function difficultyRank(name) {
  if (CROP_DIFFICULTY.easy.includes(name)) return 0;
  if (CROP_DIFFICULTY.medium.includes(name)) return 1;
  return 2;
}

function sunOk(crop, sunlight) {
  // sunlight: "lt3" | "3to5" | "5to7" | "gt7" | "unsure" | null
  if (!sunlight || sunlight === "unsure" || sunlight === "gt7" || sunlight === "5to7") return true;
  var sun = crop.sun || "Full";
  if (sunlight === "lt3") return sun === "Partial";          // deep shade: partial-sun crops only
  return sun !== "Full";                                     // 3to5: partial or full-partial
}

function inSowWindow(crop, region, monthIdx) {
  var regional = getRegionalCrop(crop, region);
  if (!regional) return false;
  var sowMonths = parseSowMonths(regional.sowIn || crop.sowIn);
  return sowMonths.some(function(m) {
    var diff = Math.abs(m - monthIdx);
    return diff <= 2 || diff >= 10;
  });
}

/**
 * suggestCrops(profile, region, opts) → ranked CROPS subset.
 * Consumes: environment, sunlight, experience, household.dislikes, assets.
 * opts: { limit (default 9), month (0-11, default now), relaxIfEmpty (default true) }
 */
export function suggestCrops(profile, region, opts) {
  var o = opts || {};
  var limit = o.limit || 9;
  var monthIdx = typeof o.month === "number" ? o.month : new Date().getMonth();
  var p = profile || {};
  var dislikes = (p.household && p.household.dislikes) || [];
  var exp = p.experience || "beginner";
  var containersOnly = p.environment === "balcony";

  var allowedDifficulty;
  if (exp === "beginner") allowedDifficulty = ["easy"];
  else if (exp === "some") allowedDifficulty = ["easy", "medium"];
  else allowedDifficulty = ["easy", "medium", "hard"];

  function passes(c, strict) {
    if (dislikes.includes(c.name)) return false;
    if (containersOnly && !CONTAINER_FRIENDLY.includes(c.name)) return false;
    var dr = difficultyRank(c.name);
    if (dr === 0 && !allowedDifficulty.includes("easy")) return false;
    if (dr === 1 && !allowedDifficulty.includes("medium")) return false;
    if (dr === 2 && !allowedDifficulty.includes("hard")) return false;
    if (strict) {
      if (!sunOk(c, p.sunlight)) return false;
      if (!inSowWindow(c, region, monthIdx)) return false;
    }
    return true;
  }

  function rank(a, b) {
    var da = difficultyRank(a.name), db = difficultyRank(b.name);
    if (da !== db) return da - db;
    var ai = BEGINNER_PRIORITY.indexOf(a.name), bi = BEGINNER_PRIORITY.indexOf(b.name);
    ai = ai === -1 ? 99 : ai; bi = bi === -1 ? 99 : bi;
    if (ai !== bi) return ai - bi;
    return (a.days || 999) - (b.days || 999);
  }

  var strictList = CROPS.filter(function(c){ return passes(c, true); }).sort(rank);
  if (strictList.length >= 3 || o.relaxIfEmpty === false) return strictList.slice(0, limit);
  // Off-season / over-filtered fallback: drop sun + sow-window constraints,
  // keep experience/dislikes/container constraints.
  var relaxed = CROPS.filter(function(c){ return passes(c, false); }).sort(function(a, b) {
    // In low light, shade-tolerant crops always outrank full-sun crops.
    // Graded: Partial (0) < Full-Partial (1) < Full (2).
    var shadeScore = function(c){ return c.sun === "Partial" ? 0 : c.sun === "Full-Partial" ? 1 : 2; };
    var sa = shadeScore(a), sb = shadeScore(b);
    if (sa !== sb) return sa - sb;
    return rank(a, b);
  });
  return relaxed.slice(0, limit);
}

/* ─── Onboarding starter-map + first-week plan (Stage 3) ── */
// Starter zone spec per environment. share = fraction of the space that
// becomes the first growing zone (rest is walkway/lawn/etc). Assets do NOT
// auto-create zones — the Basic zone-cap decision is still open; assets are
// stored in profile.assets for later stages.
const ENV_ZONE = {
  balcony:  { type:"container", label:"Balcony Containers", emoji:"🪣", share:0.5,  minA:0.5, maxA:6,  inset:0.25, minW:3,  minH:2 },
  backyard: { type:"raised",  label:"Raised Bed",         emoji:"🪴", share:0.25, minA:1,   maxA:12, inset:1,    minW:6,  minH:4 },
  farm:     { type:"veg",     label:"Vegetable Bed",      emoji:"🌿", share:0.1,  minA:4,   maxA:24, inset:4,    minW:16, minH:10 },
};


export function toNum(v) {
  var n = parseFloat(String(v).replace(",", "."));
  return isFinite(n) && n > 0 ? n : 0;
}
export function ftToM(ft) { return Math.round(ft * 0.3048 * 10) / 10; }
export function r1(n) { return Math.round(n * 10) / 10; }

// Starter zone + canvas from environment and space dimensions.
export function buildStarterZone(environment, lengthM, widthM) {
  var spec = ENV_ZONE[environment] || ENV_ZONE.farm;
  var areaM2 = r1(lengthM * widthM);
  var usable = Math.min(Math.max(areaM2 * spec.share, spec.minA), spec.maxA);
  usable = Math.min(usable, Math.max(areaM2 * 0.8, spec.minA));
  usable = r1(usable);

  var farmW, farmH, xM, yM;
  if (environment === "farm") {
    // Larger canvas with breathing room (matches legacy behaviour)
    var wM0 = Math.max(1, r1(Math.sqrt(usable * 1.5)));
    var hM0 = Math.max(1, r1(usable / wM0));
    xM = spec.inset; yM = spec.inset;
    farmW = Math.max(spec.minW, Math.ceil(xM + wM0 + 8));
    farmH = Math.max(spec.minH, Math.ceil(yM + hM0 + 6));
    return { spec:spec, areaM2:usable, wM:wM0, hM:hM0, xM:xM, yM:yM, farmW:farmW, farmH:farmH };
  }

  // Balcony/backyard: canvas is the real space itself
  farmW = Math.max(spec.minW, Math.ceil(Math.max(lengthM, widthM)));
  farmH = Math.max(spec.minH, Math.ceil(Math.min(lengthM, widthM)));
  xM = spec.inset; yM = spec.inset;
  var maxW = farmW - spec.inset * 2;
  var maxH = farmH - spec.inset * 2;
  var wM = Math.min(r1(Math.sqrt(usable * 1.5)), maxW);
  wM = Math.max(wM, 0.5);
  var hM = r1(usable / wM);
  if (hM > maxH) { hM = r1(maxH); usable = r1(wM * hM); }
  hM = Math.max(hM, 0.5);
  return { spec:spec, areaM2:usable, wM:wM, hM:hM, xM:xM, yM:yM, farmW:farmW, farmH:farmH };
}

function waterIntervalDays(freq) {
  if (!freq) return 3;
  if (/daily/i.test(freq)) return 1;
  var m = String(freq).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 3;
}

// 7-day preview from the selected crops. Display-only — real tasks come
// from buildTaskQueue once plots exist.
export function buildSevenDayPlan(pickNames, region) {
  var picks = pickNames.map(function(name) {
    var crop = CROPS.find(function(c){ return c.name === name; });
    var rc = crop ? (getRegionalCrop(crop, region) || crop) : null;
    return { name:name, interval: waterIntervalDays(rc && rc.waterFreq ? rc.waterFreq : (crop && crop.waterFreq)) };
  });
  var hasPicks = pickNames.length > 0;
  var days = [];
  for (var d = 1; d <= 7; d++) {
    var items = [];
    if (d === 1) {
      if (hasPicks) items.push("Sow / plant: " + pickNames.join(", "));
      else items.push("Explore your map and get to know the app");
    }
    var waterNames = picks.filter(function(pk) {
      if (d === 1) return false;
      return (d - 1) % pk.interval === 0;
    }).map(function(pk){ return pk.name; });
    if (waterNames.length) items.push("Water: " + waterNames.join(", "));
    if (d === 3) {
      if (hasPicks) items.push("Check seedlings — look for germination, thin crowded spots");
      else items.push("Browse the crop library — pick your first plant when you're ready");
    }
    if (d === 7) items.push("Weekly check-in — log progress on your Today screen");
    days.push({ day:d, items:items });
  }
  return days;
}

