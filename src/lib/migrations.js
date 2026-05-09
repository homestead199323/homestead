// Data migrations — run on every app load to ensure schema compatibility.
// Also contains updateGamify, which runs after every data-mutating action.

import { BADGES } from "../data/badges";
import { todayLocalKey, toLocalDateKey } from "./utils";

// Mirrors DEF.gamify — kept here to avoid a circular import with App.jsx.
const DEFAULT_GAMIFY = {
  streak:          0,
  bestStreak:      0,
  lastActiveDate:  null,
  badges:          [],
  totalHarvests:   0,
  totalPlants:     0,
  totalLogEntries: 0,
};

// ---------------------------------------------------------------------------
// migrateZones — convert legacy percent coords → metres (run once per device)
// ---------------------------------------------------------------------------
export function migrateZones(data) {
  const farmW = data.farmW || 100;
  const farmH = data.farmH || 60;
  let changed = false;
  const zones = data.zones.map(z => {
    if (z.xM !== undefined) return z;
    changed = true;
    return { ...z, xM: z.x/100*farmW, yM: z.y/100*farmH, wM: z.w/100*farmW, hM: z.h/100*farmH };
  });
  if (changed) return { ...data, zones };
  return data;
}

// ---------------------------------------------------------------------------
// migrateGamify — bootstrap gamification state for users who predate it
// ---------------------------------------------------------------------------
export function migrateGamify(data) {
  if (data.gamify) return data;
  // Derive counts from existing data defensively
  const totalHarvests    = (data.garden?.plots || []).filter(p => p.status === "harvested").length;
  const totalPlants      = (data.garden?.plots || []).length;
  const totalLogEntries  = (data.log || []).length;
  return {
    ...data,
    gamify: {
      ...DEFAULT_GAMIFY,
      totalHarvests,
      totalPlants,
      totalLogEntries,
      lastActiveDate: totalLogEntries > 0 ? todayLocalKey() : null,
    },
  };
}

// ---------------------------------------------------------------------------
// migrateCompletions — ensure data.completions exists; prune entries > 30 days
// ---------------------------------------------------------------------------
export function migrateCompletions(data) {
  const out = data.completions ? { ...data.completions } : {};
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  cutoff.setHours(0, 0, 0, 0);
  Object.keys(out).forEach(k => {
    const d = new Date(k + "T00:00:00");
    if (isNaN(d.getTime()) || d < cutoff) delete out[k];
  });
  return { ...data, completions: out };
}

// ---------------------------------------------------------------------------
// updateGamify — update streak + badge state after any data-mutating action
// ---------------------------------------------------------------------------
export function updateGamify(data) {
  const g           = data.gamify || DEFAULT_GAMIFY;
  const today       = todayLocalKey();
  let streak        = g.streak;
  let bestStreak    = g.bestStreak;
  const totalLogEntries  = (data.log || []).length;
  const totalHarvests    = (data.garden?.plots || []).filter(p => p.status === "harvested").length;
  const totalPlants      = (data.garden?.plots || []).length;

  // Update streak only when the date has changed since last activity
  if (g.lastActiveDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = toLocalDateKey(yesterday);
    if (g.lastActiveDate === yStr) {
      streak = streak + 1;           // consecutive day
    } else if (g.lastActiveDate && g.lastActiveDate < yStr) {
      streak = 1;                    // hard reset — missed a day
    } else if (!g.lastActiveDate) {
      streak = 1;                    // first ever activity
    }
    bestStreak = Math.max(bestStreak, streak);
  }

  const newG = { ...g, streak, bestStreak, lastActiveDate: today, totalHarvests, totalPlants, totalLogEntries };

  // Check for newly earned badges
  const testData  = { ...data, gamify: newG };
  const earned    = new Set(newG.badges.map(b => b.id));
  const newBadges = [...newG.badges];
  BADGES.forEach(b => {
    if (!earned.has(b.id) && b.check(testData)) {
      newBadges.push({ id: b.id, unlockedAt: today });
    }
  });
  newG.badges = newBadges;

  return { ...data, gamify: newG };
}
