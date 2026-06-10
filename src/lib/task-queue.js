import { toLocalDateKey, daysBetweenLocalKeys, localDateFromKey, addDaysToLocalKey } from "./utils";
import { rCM } from "./regional";
import { LDB, POULTRY_SPECIES, HOOFED_SPECIES, GRAZER_SPECIES, animalPlural } from "../data/livestock";

export function buildTaskQueue(data) {
  const now = new Date(); now.setHours(0,0,0,0);
  const todayKey = toLocalDateKey(now);
  const doneToday = new Set((data.completions && data.completions[todayKey]) || []);
  const tasks = [];

  // O(1) zone lookup — built once per call instead of linear .find per plot
  const zoneById = new Map((data.zones || []).map(z => [z.id, z]));

  data.garden.plots.forEach(p => {
    if (!p.plantDate || p.status === "harvested") return;
    const crop = rCM(data.region).get(p.crop);
    if (!crop || !crop.days) return;
    const dSince = daysBetweenLocalKeys(p.plantDate, now);
    const zone = zoneById.get(p.zone);
    const loc = zone ? zone.name : "Farm";
    const dLeft = crop.days - dSince;

    // Harvest ready
    if (dSince >= crop.days) {
      tasks.push({ key: `plot-${p.id}-harvest`, pri: 0, type: "harvest", emoji: crop.emoji, cropName: p.crop, title: `Harvest ${p.name || p.crop}`, desc: `Ready! Est. yield available.`, loc, plotId: p.id, daysOut: 0 });
    }

    // Steps due — tracked via p.steps[i].done (persistent), NOT completions map
    if (p.steps) p.steps.forEach((s, i) => {
      if (s.done) return;
      const due = dSince - s.d;
      if (due >= 0 && due <= 3) {
        tasks.push({ key: `plot-${p.id}-step-${i}`, pri: 1, type: "step", emoji: crop.emoji, cropName: p.crop, title: `${p.name || p.crop}: ${s.l}`, desc: s.t, loc, plotId: p.id, stepIdx: i, daysOut: 0 });
      } else if (due >= -3 && due < 0) {
        tasks.push({ key: `plot-${p.id}-step-${i}`, pri: 3, type: "upcoming", emoji: crop.emoji, cropName: p.crop, title: `${p.name || p.crop}: ${s.l}`, desc: s.t, loc, plotId: p.id, stepIdx: i, daysOut: Math.abs(due) });
      }
    });

    // Watering
    if (crop.waterFreq) {
      const m = crop.waterFreq.match(/(\d+)/);
      if (m && dSince > 0 && dSince % parseInt(m[1]) === 0) {
        tasks.push({ key: `plot-${p.id}-water`, pri: 2, type: "water", emoji: "💧", title: `Water ${p.name || p.crop}`, desc: crop.waterNote, loc, plotId: p.id, daysOut: 0, routine: true });
      }
    }

    // Harvest forecast (upcoming) — info-only, no Done button
    if (dLeft > 0 && dLeft <= 14) {
      const hDate = localDateFromKey(addDaysToLocalKey(p.plantDate, crop.days));
      const estYld = p.expectedYieldKg || crop.yld || 3;
      tasks.push({ key: `plot-${p.id}-forecast`, pri: 4, type: "forecast", emoji: "📅", title: `${p.name || p.crop} harvest in ${dLeft}d`, desc: `Expected: ${hDate.toLocaleDateString("en-GB",{day:"numeric",month:"short"})}. ~${estYld}kg yield.`, loc, plotId: p.id, daysOut: dLeft });
    }
  });

  // ─── Animal tasks ───
  // Species-grouped: feed, water, eggs, clean, bedding, paddock (one task per species)
  // Per-animal:      health, hoof, hive inspection (one task per individual)
  const dayNum = Math.floor(now.getTime() / 864e5);
  const curMonth = now.getMonth() + 1; // 1-12
  const animalZone = data.zones.find(z => ["barn","pasture"].includes(z.type));
  const animalLoc = animalZone ? animalZone.name : "Farm";

  // Build species summary: count, total head, first animal-id (stable hash seed), db ref
  const speciesMap = new Map();
  (data.livestock?.animals || []).forEach(a => {
    const db = LDB[a.type];
    if (!db) return;
    if (!speciesMap.has(a.type)) {
      speciesMap.set(a.type, { type: a.type, db, groupCount: 0, headCount: 0, firstId: a.id });
    }
    const s = speciesMap.get(a.type);
    s.groupCount += 1;
    s.headCount += (a.count || 1);
  });

  // Hash a string deterministically (used for species-level stagger)
  const hashStr = (str) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  };

  // Species-grouped tasks
  speciesMap.forEach(s => {
    const { type, db, headCount } = s;
    const e = db.e;
    const speciesLabel = animalPlural(type, headCount);
    const sHash = hashStr(type);

    if (type !== "Bee") {
      tasks.push({ key: `species-${type}-feed`,  pri: 1, type: "feed",  emoji: e,    title: `Feed ${speciesLabel}`,  desc: db.feed, loc: animalLoc, speciesType: type, headCount, daysOut: 0, routine: true });
      tasks.push({ key: `species-${type}-water`, pri: 1, type: "water", emoji: "💧", title: `Water ${speciesLabel}`, desc: `Fresh water — refill and clean trough.`, loc: animalLoc, speciesType: type, headCount, daysOut: 0, routine: true });
    }
    if (POULTRY_SPECIES.has(type)) {
      const eggNote = db.out?.Eggs?.s || "";
      tasks.push({ key: `species-${type}-eggs`, pri: 1, type: "eggs", emoji: "🥚", title: `Collect eggs — ${speciesLabel}`, desc: `Check nests daily. ${eggNote}`, loc: animalLoc, speciesType: type, headCount, daysOut: 0, routine: true });
    }
    if (type !== "Bee" && (dayNum + sHash) % 7 === 0) {
      tasks.push({ key: `species-${type}-clean`, pri: 2, type: "clean", emoji: "🧹", title: `Clean housing — ${speciesLabel}`, desc: `Remove soiled bedding, refresh straw, check for damp.`, loc: animalLoc, speciesType: type, headCount, daysOut: 0 });
    }
    if (type !== "Bee" && (dayNum + sHash) % 30 === 0) {
      tasks.push({ key: `species-${type}-bedding`, pri: 2, type: "bedding", emoji: "🛏️", title: `Full bedding change — ${speciesLabel}`, desc: `Strip everything, disinfect surfaces, fresh straw or shavings.`, loc: animalLoc, speciesType: type, headCount, daysOut: 0 });
    }
    if (GRAZER_SPECIES.has(type) && (dayNum + sHash) % 21 === 0) {
      tasks.push({ key: `species-${type}-paddock`, pri: 2, type: "paddock", emoji: "🔄", title: `Rotate paddock — ${speciesLabel}`, desc: `Move to fresh pasture. Rest current section 21+ days to break parasite cycle.`, loc: animalLoc, speciesType: type, headCount, daysOut: 0 });
    }
  });

  // Per-animal tasks (health, hoof, hive)
  (data.livestock?.animals || []).forEach(a => {
    const db = LDB[a.type];
    if (!db) return;
    // For per-animal tasks: use the animal's own name if given, else "Chicken #3"
    const label = a.name ? `${a.name} (${a.type})` : a.type;
    const aHash = hashStr(a.id);

    // Weekly: health check (per animal, offset 3d from cleaning cycle)
    if (a.type !== "Bee" && (dayNum + aHash + 3) % 7 === 0) {
      const commonIssue = db.inj?.[0]?.n || "injury or parasites";
      tasks.push({ key: `animal-${a.id}-health`, pri: 2, type: "health", emoji: "🩺", title: `Health check — ${label}`, desc: `Inspect body condition, eyes, coat. Watch for: ${commonIssue}.`, loc: animalLoc, animalId: a.id, daysOut: 0 });
    }
    // Bi-weekly: hoof check (per animal, hoofed species only)
    if (HOOFED_SPECIES.has(a.type) && (dayNum + aHash) % 14 === 0) {
      tasks.push({ key: `animal-${a.id}-hoof`, pri: 2, type: "hoof", emoji: "🦶", title: `Hoof check — ${label}`, desc: `Trim overgrowth, check for rot, stones, cracks.`, loc: animalLoc, animalId: a.id, daysOut: 0 });
    }
    // 10d: hive inspection (per hive, March–September only)
    if (a.type === "Bee" && curMonth >= 3 && curMonth <= 9 && (dayNum + aHash) % 10 === 0) {
      tasks.push({ key: `animal-${a.id}-hive`, pri: 2, type: "hive", emoji: "🐝", title: `Hive inspection — ${label}`, desc: `Check brood pattern, honey stores, queen presence. Look for varroa mites.`, loc: animalLoc, animalId: a.id, daysOut: 0 });
    }
  });

  // Filter out tasks that have been marked done today via the completions map.
  // Step tasks are filtered by p.steps[i].done above (persistent), not here.
  // Forecast tasks are info-only, no Done button exposed.
  const filtered = tasks.filter(t => {
    if (t.type === "step" || t.type === "upcoming" || t.type === "forecast") return true;
    return !doneToday.has(t.key);
  });

  filtered.sort((a, b) => a.pri - b.pri || a.daysOut - b.daysOut);
  return filtered;
}
