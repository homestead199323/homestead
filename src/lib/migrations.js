// Data migrations — run on every app load to ensure schema compatibility.
// Also contains updateGamify, which runs after every data-mutating action.

import { BADGES } from "../data/badges";
import { todayLocalKey, toLocalDateKey } from "./utils";

// Mirrors DEF.gamify — kept here to avoid a circular import with App.jsx.
const DEFAULT_GAMIFY = {
  streak:            0,
  bestStreak:        0,
  lastActiveDate:    null,
  badges:            [],
  celebratedBadges:  [],  // Phase 8.4 — badge ids already shown in a celebration overlay
  totalHarvests:     0,
  totalPlants:       0,
  totalLogEntries:   0,
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
// migratePlotSchema — fix plots written by the original onboarding wizard
// (2026-05-15 → 2026-06-10), which used cropName / plantedDate / zoneId /
// plants instead of the canonical crop / plantDate / zone / plantCount and
// omitted `status`. No consumer recognised those fields, so the plots were
// invisible: no tasks, no growth tracking, no yield. Both real production
// users were affected. Renames in place, preserves any already-correct keys.
// ---------------------------------------------------------------------------
export function migratePlotSchema(data) {
  const plots = data?.garden?.plots;
  if (!Array.isArray(plots) || plots.length === 0) return data;
  let changed = false;
  const fixed = plots.map(p => {
    if (!p || typeof p !== "object") return p;
    const legacy = ("cropName" in p) || ("plantedDate" in p) || ("zoneId" in p) || ("plants" in p);
    if (!legacy) return p;
    changed = true;
    const np = { ...p };
    if (np.crop === undefined && np.cropName !== undefined) np.crop = np.cropName;
    if (np.plantDate === undefined && np.plantedDate !== undefined) np.plantDate = np.plantedDate;
    if (np.zone === undefined && np.zoneId !== undefined) np.zone = np.zoneId;
    if (np.plantCount === undefined && np.plants !== undefined) np.plantCount = np.plants;
    if (np.qty === undefined && np.plants !== undefined) np.qty = np.plants;
    if (np.measureType === undefined) np.measureType = "plants";
    if (np.status === undefined) np.status = np.plantDate ? "planted" : "planned";
    if (np.name === undefined && np.crop) np.name = np.crop;
    if (np.variety === undefined) np.variety = "";
    if (np.varietyNote === undefined) np.varietyNote = "";
    delete np.cropName;
    delete np.plantedDate;
    delete np.zoneId;
    delete np.plants;
    return np;
  });
  return changed ? { ...data, garden: { ...data.garden, plots: fixed } } : data;
}

// ---------------------------------------------------------------------------
// migrateGamify — bootstrap gamification state for users who predate it
// Also backfills `celebratedBadges` (Phase 8.4) for users who earned badges
// before the celebration overlay existed — they should not see a surprise
// overlay on their next action.
// ---------------------------------------------------------------------------
export function migrateGamify(data) {
  if (data.gamify) {
    // Backfill: any badge already in `badges` is treated as already celebrated.
    if (!Array.isArray(data.gamify.celebratedBadges)) {
      return {
        ...data,
        gamify: {
          ...data.gamify,
          celebratedBadges: (data.gamify.badges || []).map(b => b.id),
        },
      };
    }
    return data;
  }
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
  const justEarnedIds = [];
  BADGES.forEach(b => {
    if (!earned.has(b.id) && b.check(testData)) {
      newBadges.push({ id: b.id, unlockedAt: today });
      justEarnedIds.push(b.id);
    }
  });
  newG.badges = newBadges;

  // Phase 8.4 — flag badges that have never been celebrated yet so the app
  // shell can render the overlay. `celebratedBadges` is persisted, but
  // `_pendingCelebrations` is a transient field App.jsx strips before saving.
  const celebrated = new Set(newG.celebratedBadges || []);
  const pending = justEarnedIds.filter(id => !celebrated.has(id));

  return { ...data, gamify: newG, _pendingCelebrations: pending };
}
