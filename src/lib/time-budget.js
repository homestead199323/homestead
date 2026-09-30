/* ═══════════════════════════════════════════
   TIME BUDGET — this week's jobs vs the time the user said they have
   (top-10 #7, 2026-09-30)

   Load = the real task engine run for each of the next 7 days (the same
   buildTaskPlan the Today list and the push digest use), summed with the
   per-job minutes from lib/task-time.js. Budget = onboarding's answer
   (profile.timeBudget). Over budget → say by how much, show where the time
   goes, and offer trims that are real: your own repeating jobs less often,
   or a different budget. Generated care (feeding animals, harvests) is never
   silently dropped — the tips say how to make it quicker instead.
   ═══════════════════════════════════════════ */

import { buildTaskPlan } from "./task-queue.js";
import { taskMinutes } from "./task-time.js";
import { addDaysToLocalKey, localDateFromKey } from "./utils.js";
import { weeklyMinutes, lessOften } from "./own-tasks.js";

/** Minutes per week each onboarding answer means. "Weekends only" = two ~1½ h sessions. */
export const BUDGET_MIN = { min5: 35, min15: 105, weekly: 180, daily: 315, unlimited: null };
export const BUDGET_LABEL = { min5: "5 min a day", min15: "15 min a day", weekly: "Weekends only", daily: "30–60 min a day", unlimited: "As much as it takes" };

const DUE = (t) => t.daysOut === 0 && t.type !== "forecast" && t.type !== "upcoming";

function groupOf(t) {
  if (t.ownId) return { id: `own-${t.ownId}`, label: t.title, kind: "own" };
  if (t.speciesType) return { id: `sp-${t.speciesType}`, label: t.speciesType, kind: "animals" };
  if (t.animalId) return { id: `an-${t.animalId}`, label: (t.title || "").split(" — ").pop() || "Animals", kind: "animals" };
  if (t.plotId) {
    const kind = t.type === "water" ? "watering" : "crops";
    const name = t.cropName || (t.title || "").replace(/^(Water|Harvest) /, "").split(":")[0];
    return { id: `pl-${t.plotId}-${kind}`, label: kind === "watering" ? `Watering ${name}` : name, kind };
  }
  if (t.batchId || /^seed-|^nursery-/.test(t.key || "")) return { id: "nursery", label: "Seedlings", kind: "crops" };
  if (t.type === "weather") return { id: "weather", label: "Weather prep", kind: "weather" };
  return { id: "other", label: "Other jobs", kind: "other" };
}

/** { total, days: [{ date, minutes }], groups: [{ id, label, kind, minutes }] } for the 7 days from startKey. */
export function weekLoad(data, forecast, startKey) {
  const days = [];
  const groups = new Map();
  let total = 0;
  // A harvest or a late step stays on the list every day until it's done: count it once.
  // Routine care (feeding, watering, eggs) really is every day, so it counts each time.
  const once = new Set();
  for (let i = 0; i < 7; i++) {
    const key = addDaysToLocalKey(startKey, i);
    const due = buildTaskPlan(data, { forecast, now: localDateFromKey(key) }).tasks.filter(DUE).filter((t) => {
      if (t.routine || (t.ownId && !t.once)) return true; // repeating own jobs are separate visits too
      if (once.has(t.key)) return false;
      once.add(t.key);
      return true;
    });
    let m = 0;
    due.forEach((t) => {
      const mins = taskMinutes(t);
      m += mins;
      const g = groupOf(t);
      const cur = groups.get(g.id) || { ...g, minutes: 0 };
      cur.minutes += mins;
      groups.set(g.id, cur);
    });
    days.push({ date: key, minutes: m });
    total += m;
  }
  return { total, days, groups: [...groups.values()].sort((a, b) => b.minutes - a.minutes) };
}

/** "1 h 20 min", "45 min" */
export function hm(min) {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

/**
 * The week vs the budget → { status: "none" | "ok" | "tight" | "over", load, budget, over, trims, tips }
 * none = no budget answered or "as much as it takes".
 */
export function budgetCheck(data, forecast, startKey) {
  const load = weekLoad(data, forecast, startKey);
  const tb = data.profile && data.profile.timeBudget;
  const budget = tb ? BUDGET_MIN[tb] : null;
  if (!budget) return { status: "none", load, budget: null, over: 0, trims: [], tips: [] };
  const ratio = load.total / budget;
  const status = ratio <= 1 ? "ok" : ratio <= 1.25 ? "tight" : "over";
  const over = Math.max(0, load.total - budget);
  // Real trims: the user's own repeating jobs, biggest weekly cost first.
  const trims = (Array.isArray(data.customTasks) ? data.customTasks : [])
    .filter((t) => t && !t.paused && t.repeat !== "once")
    .map((t) => { const next = lessOften(t); if (!next) return null; const saves = Math.round(weeklyMinutes(t) - weeklyMinutes({ ...t, ...next })); return saves > 0 ? { id: t.id, title: t.title, change: next, saves } : null; })
    .filter(Boolean).sort((a, b) => b.saves - a.saves).slice(0, 3);
  const kinds = new Set(load.groups.slice(0, 4).map((g) => g.kind));
  const tips = [];
  if (kinds.has("watering")) tips.push("Mulch beds 5–8 cm deep and water less often but deeper; a drip line or seep hose on a timer turns watering into a check.");
  if (kinds.has("animals")) tips.push("A large hanging feeder and an automatic drinker turn daily animal care into a quick look; collect eggs once a day.");
  if (kinds.has("crops")) tips.push("Next time, plant fewer high-care crops (tomatoes, cucumbers) and more easy ones (kale, chard, potatoes, herbs).");
  return { status, load, budget, over, trims, tips };
}
