/* ═══════════════════════════════════════════
   UTILS — pure, non-React app helpers
   Extracted from App.jsx (Phase A.7, 2026-05-09)
   ═══════════════════════════════════════════ */

// Append an entry to the activity log, capped at 200 entries to prevent localStorage overflow.
export const appendLog = (logArr, entry) => [...(logArr || []), entry].slice(-200);

// Local-time YYYY-MM-DD key. Replaces .toISOString().slice(0,10) which is UTC
// and can be off by one day in non-UTC timezones (e.g. Albania UTC+1/+2).
export const toLocalDateKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const todayLocalKey = () => toLocalDateKey(new Date());

export const localDateFromKey = (key) => {
  if (!key) return null;
  const [y, m, d] = String(key).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

export const addDaysToLocalKey = (key, days) => {
  const d = localDateFromKey(key);
  if (!d) return "";
  d.setDate(d.getDate() + days);
  return toLocalDateKey(d);
};

export const daysBetweenLocalKeys = (fromKey, toDate) => {
  const from = localDateFromKey(fromKey);
  if (!from) return 0;
  const to = new Date(toDate);
  to.setHours(0, 0, 0, 0);
  return Math.floor((to - from) / 864e5);
};

// Append a task key to today's completions list (no-op if already present).
// Returns a new data object — does NOT mutate.
export const markTaskDone = (data, taskKey) => {
  if (!taskKey) return data;
  const todayKey = todayLocalKey();
  const existing = (data.completions && data.completions[todayKey]) || [];
  if (existing.includes(taskKey)) return data;
  return {
    ...data,
    completions: {
      ...(data.completions || {}),
      [todayKey]: [...existing, taskKey],
    },
  };
};
