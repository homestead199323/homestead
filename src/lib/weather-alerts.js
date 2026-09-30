/* ═══════════════════════════════════════════
   WEATHER ALERTS THAT KNOW THE PLAN (top-10 #1, 2026-09-30)

   Pure: (farm data, 7-day forecast, today) → alerts + a reshaped task list.
   Only warns about what is actually growing or living on this farm, and
   moves jobs when the weather says so:
     - frost → protect named tender crops; hold sowing / planting out of
       tender crops; pull "harvest in N days" forward to "pick before frost"
     - rain today → drop outdoor watering jobs (one note instead)
     - heat, gales, heavy rain, freezing water troughs → prep jobs
     - blight weather (Hutton criteria: two consecutive days with min ≥10°C
       and ≥6 h of relative humidity ≥90%, AHDB 2017) → leaf checks on
       outdoor tomatoes / potatoes

   Thresholds (air temperature at 2 m, as forecast):
     FROST_C 2   → ground frost likely on a clear night (Met Office: grass
                   temperature runs several degrees below air)
     HARD_C −4   → damages half-hardy crops in the open and unheated glass
     HEAT_C 30, GALE_KMH 65 (Beaufort 8), HEAVY_MM 20, RAIN_MM 4

   Weather task keys: "weather-<kind>-<YYYYMMDD>" (event day). Ticking one
   hides it for that event, whichever day it was ticked (see isWeatherDone).
   ═══════════════════════════════════════════ */

import { rCM } from "./regional";
import { addDaysToLocalKey, localDateFromKey } from "./utils";
import { isAwaitingSowing } from "./sowing.js";
import { hardiness, BLOSSOM, PICK_BEFORE_FROST, TALL, BLIGHT_HOSTS } from "../data/frost.js";

export const FROST_C = 2;
export const HARD_C = -4;
export const FREEZE_WATER_C = -2;
export const HEAT_C = 30;
export const GALE_KMH = 65;
export const HEAVY_MM = 20;
export const RAIN_MM = 4;

const COVERED_ZONES = new Set(["greenhouse", "nursery", "house", "storage", "barn"]);
const OPEN_GROWING = new Set(["veg", "raised", "herbs", "orchard", "container"]);
const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const compact = (key) => String(key).replace(/-/g, "");
const round = (n) => Math.round(n);
const deg = (n) => `${round(n) < 0 ? "−" : ""}${Math.abs(round(n))}°C`;

function listNames(names, max = 3) {
  const u = [...new Set(names)];
  if (u.length <= max) return u.length > 1 ? u.slice(0, -1).join(", ") + " and " + u[u.length - 1] : (u[0] || "");
  return u.slice(0, max).join(", ") + ` and ${u.length - max} more`;
}

function dayOffset(todayKey, dateKey) {
  const a = localDateFromKey(todayKey), b = localDateFromKey(dateKey);
  if (!a || !b) return NaN;
  return Math.round((b - a) / 864e5);
}

/** "today" / "tomorrow" / "Fri" */
export function dayName(todayKey, dateKey) {
  const n = dayOffset(todayKey, dateKey);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  const d = localDateFromKey(dateKey);
  return d ? WEEKDAY[d.getDay()] : dateKey;
}

/** A day's minimum comes around dawn: tomorrow's minimum is "tonight", later ones "early Fri". */
function frostWhen(todayKey, dateKey) {
  const n = dayOffset(todayKey, dateKey);
  if (n <= 1) return "tonight";
  return `early ${dayName(todayKey, dateKey)}`;
}

/** When to put the cover on: the evening before the frost morning. */
function coverWhen(todayKey, dateKey) {
  const n = dayOffset(todayKey, dateKey);
  if (n <= 1) return "before dark today";
  if (n === 2) return "tomorrow evening";
  return `${dayName(todayKey, addDaysToLocalKey(dateKey, -1))} evening`;
}

/** Has this weather task been ticked on any day (completions are kept ~30 days)? */
export function isWeatherDone(data, key) {
  const c = data.completions || {};
  return Object.keys(c).some((d) => Array.isArray(c[d]) && c[d].includes(key));
}

function zoneCovered(zone) {
  return !!zone && COVERED_ZONES.has(zone.type);
}

function rainReaches(zone, data) {
  if (!zone || !OPEN_GROWING.has(zone.type)) return false;
  if (zone.type === "container" && data.profile?.dimensions?.covered) return false;
  return true;
}

/** Plants in the ground now (not harvested, not still waiting to be sown). */
function growingPlots(data) {
  return (data.garden?.plots || []).filter((p) => p.status !== "harvested" && p.plantDate && !isAwaitingSowing(p));
}

/**
 * Main entry. `tasks` is buildTaskQueue's list before its done-filter.
 * Returns { alerts, tasks }. Without a usable forecast, returns tasks unchanged.
 */
export function applyWeather(data, forecast, todayKey, tasks) {
  const days = (forecast && Array.isArray(forecast.days) ? forecast.days : []).filter((d) => d && d.date >= todayKey);
  if (days.length === 0) return { alerts: [], tasks };

  const zoneById = new Map((data.zones || []).map((z) => [z.id, z]));
  const cm = rCM(data.region);
  const plots = growingPlots(data);
  const plotById = new Map((data.garden?.plots || []).map((p) => [p.id, p]));
  const label = (p) => p.name || p.crop;
  const animals = (data.livestock?.animals || []).filter((a) => a.type !== "Bee");
  const hasHive = (data.livestock?.animals || []).some((a) => a.type === "Bee") || (data.zones || []).some((z) => z.type === "beehive");
  const hasGlass = (data.zones || []).some((z) => z.type === "greenhouse");
  const month = (localDateFromKey(todayKey) || new Date()).getMonth(); // 0–11
  const spring = month >= 2 && month <= 4;

  const alerts = [];
  const extra = [];
  const push = (a, taskWindow) => {
    alerts.push(a);
    const n = dayOffset(todayKey, a.date);
    if (n <= taskWindow) {
      extra.push({
        key: `weather-${a.kind}-${compact(a.date)}`, pri: a.pri, type: "weather", weather: a.kind,
        emoji: a.emoji, title: a.title, desc: a.detail, loc: a.loc || "Around your space",
        daysOut: 0, routine: !!a.routine, plotIds: a.plotIds || [],
        // First affected bed: puts the job on the map and on the walk (none → Home and Tasks only).
        zoneId: (a.plotIds || []).map((id) => plotById.get(id)?.zone).find((z) => zoneById.has(z)) || undefined,
      });
    }
  };

  // ── Frost (days 1..6: a day's minimum is at dawn, today's has passed) ──
  const frostDays = days.filter((d) => d.tMin != null && d.tMin <= FROST_C && dayOffset(todayKey, d.date) >= 1);
  frostDays.forEach((d) => {
    const hard = d.tMin <= HARD_C;
    const hit = plots.filter((p) => {
      const zone = zoneById.get(p.zone);
      const h = hardiness(p.crop);
      if (zoneCovered(zone)) return hard && h === "tender" && zone?.type === "greenhouse";
      if (h === "tender") return true;
      if (h === "halfHardy") return hard;
      return spring && BLOSSOM.has(p.crop);
    });
    const freezeWater = d.tMin <= FREEZE_WATER_C && animals.length > 0;
    if (hit.length === 0 && !freezeWater) return;
    const when = frostWhen(todayKey, d.date);
    const names = hit.map(label);
    const pots = hit.some((p) => zoneById.get(p.zone)?.type === "container");
    const blossom = hit.some((p) => BLOSSOM.has(p.crop));
    const parts = [];
    if (hit.length) {
      parts.push(`Cover ${listNames(names)} with fleece (or an old sheet) ${coverWhen(todayKey, d.date)}, and take it off in the morning.`);
      if (pots) parts.push("Move pots against the house wall or indoors.");
      if (blossom) parts.push("Blossom killed by frost means no fruit this year — fleece small trees.");
      if (hit.some((p) => zoneById.get(p.zone)?.type === "greenhouse")) parts.push("Close the greenhouse early; add a second layer of fleece inside.");
    }
    if (freezeWater) parts.push("Animal water will freeze: take out fresh water first thing and check it again at midday.");
    const zones = [...new Set(hit.map((p) => zoneById.get(p.zone)?.name).filter(Boolean))];
    push({
      kind: "frost", date: d.date, tMin: d.tMin, emoji: "❄️", pri: 0,
      severity: hard || d.tMin <= 0 ? "danger" : "warn",
      title: `${hard ? "Hard frost" : d.tMin <= 0 ? "Frost" : "Frost risk"} ${when} (${deg(d.tMin)})${hit.length ? `: protect ${hit.length === 1 ? names[0] : `${hit.length} crops`}` : ""}`,
      short: `${hard ? "Hard frost" : "Frost"} ${when} · ${deg(d.tMin)}`,
      detail: parts.join(" "),
      loc: zones.length ? listNames(zones, 2) : (freezeWater ? "Animal water" : undefined),
      plotIds: hit.map((p) => p.id),
    }, 2);
  });
  const pickFrost = frostDays.find((d) => d.tMin <= 1 && dayOffset(todayKey, d.date) <= 4) || null;
  const lastFrostSoon = frostDays.filter((d) => dayOffset(todayKey, d.date) <= 3).pop() || null;

  // ── Heat (today..+2) ──
  days.filter((d) => d.tMax != null && d.tMax >= HEAT_C && dayOffset(todayKey, d.date) <= 2).slice(0, 1).forEach((d) => {
    if (plots.length === 0 && animals.length === 0) return;
    const parts = [];
    if (plots.length) parts.push("Water early morning or evening, not at midday. Shade lettuce and seedlings.");
    if (hasGlass) parts.push("Open greenhouse vents and door; damp down the floor.");
    if (animals.length) parts.push("Animals need shade and extra cool water — hens pant and stop laying above 30°C.");
    push({ kind: "heat", date: d.date, emoji: "🌡️", pri: 1, severity: "warn",
      title: `Hot ${dayName(todayKey, d.date)} (${deg(d.tMax)})`, short: `Hot ${dayName(todayKey, d.date)} · ${deg(d.tMax)}`,
      detail: parts.join(" ") }, 2);
  });

  // ── Gales (today..+2) ──
  days.filter((d) => d.gustKmh != null && d.gustKmh >= GALE_KMH && dayOffset(todayKey, d.date) <= 2).slice(0, 1).forEach((d) => {
    const tall = plots.filter((p) => TALL.has(p.crop));
    const parts = [];
    if (tall.length) parts.push(`Stake or tie in ${listNames(tall.map(label))}.`);
    if (hasGlass) parts.push("Shut greenhouse vents and doors.");
    if (plots.length) parts.push("Weigh down fleece and netting.");
    if (animals.length) parts.push("Check coop and shed roofs and doors.");
    if (hasHive) parts.push("Strap hive roofs down.");
    if (!parts.length) return;
    push({ kind: "wind", date: d.date, emoji: "💨", pri: 1, severity: "warn",
      title: `Gales ${dayName(todayKey, d.date)} (gusts ${round(d.gustKmh)} km/h)`, short: `Gales ${dayName(todayKey, d.date)} · ${round(d.gustKmh)} km/h`,
      detail: parts.join(" ") }, 2);
  });

  // ── Heavy rain (today..+2) ──
  days.filter((d) => d.rainMm >= HEAVY_MM && dayOffset(todayKey, d.date) <= 2).slice(0, 1).forEach((d) => {
    if (plots.length === 0 && animals.length === 0) return;
    const ripe = tasks.filter((t) => t.type === "harvest").map((t) => plotById.get(t.plotId)).filter(Boolean);
    const parts = [];
    if (ripe.length) parts.push(`Pick ${listNames(ripe.map(label))} first — ripe fruit splits in heavy rain.`);
    parts.push("Clear drains and gutters, and keep off wet soil (it compacts).");
    if (animals.length) parts.push("Check shelters for leaks and move bedding off wet ground.");
    push({ kind: "downpour", date: d.date, emoji: "🌧️", pri: 1, severity: "warn",
      title: `Heavy rain ${dayName(todayKey, d.date)} (~${round(d.rainMm)} mm)`, short: `Heavy rain ${dayName(todayKey, d.date)} · ${round(d.rainMm)} mm`,
      detail: parts.join(" ") }, 2);
  });

  // ── Blight weather: Hutton period (2 consecutive days, min ≥10°C, ≥6 h RH ≥90%) ──
  const hosts = plots.filter((p) => BLIGHT_HOSTS.has(p.crop) && (p.crop === "Potato" || !zoneCovered(zoneById.get(p.zone))));
  if (hosts.length) {
    const ok = (d) => d.tMin != null && d.tMin >= 10 && d.humidHours >= 6;
    for (let i = 0; i + 1 < days.length; i++) {
      if (ok(days[i]) && ok(days[i + 1])) {
        const d = days[i];
        const potatoes = hosts.some((p) => p.crop === "Potato");
        push({ kind: "blight", date: d.date, emoji: "🍂", pri: 1, severity: "warn",
          title: `Blight weather from ${dayName(todayKey, d.date)}: check ${listNames(hosts.map(label))}`,
          short: `Blight weather from ${dayName(todayKey, d.date)}`,
          detail: "Warm, very humid days spread late blight. Look under the leaves every day for brown patches with a pale edge; pick off affected leaves and bin them (not the compost). Water at the base only."
            + (potatoes ? " If potato leaves blacken, cut the stems off at ground level so the tubers stay clean; dig them 2–3 weeks later." : ""),
          plotIds: hosts.map((p) => p.id) }, 2);
        break;
      }
    }
  }

  // ── Reshape the day's jobs ──
  const today = days.find((d) => d.date === todayKey) || null;
  const rainyToday = !!(today && today.rainMm >= RAIN_MM && (today.rainProb == null || today.rainProb >= 60));
  const skipped = [];
  let out = [];
  tasks.forEach((t) => {
    const plot = t.plotId ? plotById.get(t.plotId) : null;
    const zone = plot ? zoneById.get(plot.zone) : null;

    // Rain waters outdoor beds: no watering job today.
    if (rainyToday && t.type === "water" && plot && rainReaches(zone, data)) { skipped.push(label(plot)); return; }

    // Frost soon: hold sowing / planting out of tender crops in the open.
    if (lastFrostSoon) {
      const crop = plot ? plot.crop : t.cropName;
      const stepLabel = plot && t.stepIdx != null ? plot.steps?.[t.stepIdx]?.l || "" : "";
      const isPlanting = (t.type === "step" || t.type === "upcoming") && plot && /sow|plant|transplant/i.test(stepLabel) && !/prepare/i.test(stepLabel)
        && !zoneCovered(zone);
      const isPlantOut = /^seed-.+-(hardening|planted)$/.test(t.key || "");
      if ((isPlanting || isPlantOut) && hardiness(crop) === "tender") {
        const until = dayOffset(todayKey, lastFrostSoon.date) + 1;
        const from = dayName(todayKey, addDaysToLocalKey(todayKey, until));
        out.push({ ...t, type: "upcoming", pri: 3, daysOut: until, held: true, sowing: false,
          desc: `Wait: frost ${frostWhen(todayKey, lastFrostSoon.date)} (${deg(lastFrostSoon.tMin)}). Do it from ${from}. ${t.desc || ""}`.trim() });
        return;
      }
    }

    // Frost within 4 days: pick tender crops before it.
    if (pickFrost && plot && PICK_BEFORE_FROST.has(plot.crop) && !zoneCovered(zone)) {
      const when = frostWhen(todayKey, pickFrost.date);
      const tip = PICK_TIP[plot.crop] || "Pick everything usable now.";
      if (t.type === "forecast") {
        out.push({ ...t, key: `plot-${plot.id}-harvest`, type: "harvest", pri: 0, daysOut: 0, emoji: cm.get(plot.crop)?.emoji || t.emoji,
          cropName: plot.crop, title: `Pick ${label(plot)} before the frost`, desc: `Frost ${when} (${deg(pickFrost.tMin)}). ${tip}`, frostPick: true });
        return;
      }
      if (t.type === "harvest") { out.push({ ...t, desc: `Frost ${when} — pick it all before then. ${tip}` }); return; }
    }
    out.push(t);
  });
  // A forecast and a converted harvest must not both exist for one plot.
  const seen = new Set();
  out = out.filter((t) => (seen.has(t.key) ? false : (seen.add(t.key), true)));

  if (skipped.length) {
    extra.push({ key: `weather-rain-${compact(todayKey)}`, pri: 3, type: "weather", weather: "rain", emoji: "🌦️",
      title: `Rain today (~${round(today.rainMm)} mm): no watering needed`, desc: `The rain waters ${listNames(skipped)}. Check pots under cover.`,
      loc: "Outdoor beds", daysOut: 0, routine: true, plotIds: [] });
    alerts.push({ kind: "rain", date: todayKey, emoji: "🌦️", severity: "info", short: `Rain today · skip watering`, title: `Rain today (~${round(today.rainMm)} mm)` });
  }

  alerts.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { alerts, tasks: [...extra, ...out] };
}

const PICK_TIP = {
  Tomato: "Green tomatoes ripen indoors in a drawer with a banana, or make green-tomato chutney.",
  "Pepper (Sweet)": "Green peppers are fine to eat; they keep 2 weeks in the fridge.",
  "Pepper (Hot)": "Pick green or red; string them up to dry.",
  Pumpkin: "Cut with a long stalk and cure 10 days somewhere warm.",
  Zucchini: "Pick every fruit, even small ones — frost turns them to mush.",
  Basil: "Pick every leaf; freeze as pesto or in ice cubes.",
  "Sweet Potato": "Lift the tubers carefully and cure 10 days somewhere warm.",
  "Bean (Dry)": "Pull whole plants and hang them indoors to finish drying.",
};
