/* ═══════════════════════════════════════════
   YOUR OWN JOBS — one-off and repeating tasks the user adds (top-10 #6, 2026-09-30)

   data.customTasks: [{ id, title, note, emoji, zoneId, start: "YYYY-MM-DD",
     repeat: "once" | "daily" | "weekly" | "fortnightly" | "monthly" | "every",
     every: n (days, repeat "every"), minutes, paused, doneOn (once only), createdAt }]

   They join the generated queue as type "own" (key "own-<id>"): due today,
   or "upcoming" when the next one is 1–7 days away. A one-off job stays due
   (and says how late it is) until it's ticked; ticking stores doneOn so it
   doesn't come back after the 30-day completions window. Repeating jobs are
   ticked per day through the normal completions map.
   ═══════════════════════════════════════════ */

import { addDaysToLocalKey, localDateFromKey } from "./utils.js";

export const REPEATS = [
  { id: "once", label: "Just once" },
  { id: "daily", label: "Every day" },
  { id: "weekly", label: "Every week" },
  { id: "fortnightly", label: "Every 2 weeks" },
  { id: "monthly", label: "Every month" },
  { id: "every", label: "Every … days" },
];
const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function diffDays(fromKey, toKey) {
  const a = localDateFromKey(fromKey), b = localDateFromKey(toKey);
  if (!a || !b) return NaN;
  return Math.round((b - a) / 864e5);
}

function everyN(t) {
  const n = Math.round(Number(t.every));
  return n >= 1 && n <= 365 ? n : 7;
}

/** Does a (non-paused) job fall on this day? One-offs: only on their start day. */
export function isDueOn(t, dateKey) {
  if (!t || t.paused || !t.start) return false;
  const d = diffDays(t.start, dateKey);
  if (!(d >= 0)) return false;
  switch (t.repeat) {
    case "daily": return true;
    case "weekly": return d % 7 === 0;
    case "fortnightly": return d % 14 === 0;
    case "every": return d % everyN(t) === 0;
    case "monthly": {
      const s = localDateFromKey(t.start), x = localDateFromKey(dateKey);
      const last = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
      return x.getDate() === Math.min(s.getDate(), last); // the 31st falls on the month's last day
    }
    default: return d === 0;
  }
}

/** Days until the next occurrence on or after `fromKey` (0 = that day), within `max` days; -1 if none. */
export function nextIn(t, fromKey, max = 60) {
  for (let i = 0; i <= max; i++) if (isDueOn(t, addDaysToLocalKey(fromKey, i))) return i;
  return -1;
}

/** "Every week on Sat", "Every 3 days", "Once, 12 Oct" */
export function repeatText(t) {
  const s = localDateFromKey(t.start);
  const day = s ? s.toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "";
  switch (t.repeat) {
    case "daily": return "Every day";
    case "weekly": return `Every week on ${s ? WEEKDAY[s.getDay()] : "the same day"}`;
    case "fortnightly": return `Every 2 weeks on ${s ? WEEKDAY[s.getDay()] : "the same day"}`;
    case "monthly": return `Every month on the ${s ? ordinal(s.getDate()) : "same day"}`;
    case "every": return `Every ${everyN(t)} days`;
    default: return `Once, ${day}`;
  }
}
function ordinal(n) {
  const v = n % 100;
  return n + (v >= 11 && v <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th");
}

/** Average minutes per week a job costs (for the time budget and "make it less often"). */
export function weeklyMinutes(t) {
  if (!t || t.paused) return 0;
  const m = Number(t.minutes) > 0 ? Number(t.minutes) : 10;
  switch (t.repeat) {
    case "daily": return m * 7;
    case "weekly": return m;
    case "fortnightly": return m / 2;
    case "monthly": return (m * 12) / 52;
    case "every": return (m * 7) / everyN(t);
    default: return 0;
  }
}

/** The same job, less often (one step down), or null when it can't go lower. */
export function lessOften(t) {
  if (t.repeat === "daily") return { repeat: "every", every: 2 };
  if (t.repeat === "every" && everyN(t) < 7) return { repeat: "every", every: Math.min(7, everyN(t) * 2) };
  if (t.repeat === "every" && everyN(t) < 14) return { repeat: "fortnightly" };
  if (t.repeat === "weekly") return { repeat: "fortnightly" };
  if (t.repeat === "fortnightly") return { repeat: "monthly" };
  return null;
}

/** Queue entries for today: due jobs (daysOut 0) and the next one within 7 days as "upcoming". */
export function ownTasks(data, todayKey) {
  const zones = new Map((data.zones || []).map((z) => [z.id, z]));
  const out = [];
  (Array.isArray(data.customTasks) ? data.customTasks : []).forEach((t) => {
    if (!t || !t.id || !t.title || t.paused) return;
    const zone = t.zoneId ? zones.get(t.zoneId) : null;
    const base = {
      key: `own-${t.id}`, type: "own", ownId: t.id, pri: 2, emoji: t.emoji || "📝", title: t.title,
      desc: t.note || "", loc: zone ? zone.name : "Around your space", zoneId: zone ? zone.id : undefined,
      minutes: Number(t.minutes) > 0 ? Number(t.minutes) : 10, once: t.repeat === "once" || !t.repeat,
      routine: t.repeat === "daily",
    };
    if (base.once) {
      if (t.doneOn) return;
      const d = diffDays(t.start, todayKey);
      if (d >= 0) out.push({ ...base, daysOut: 0, late: d, desc: [d > 0 ? `${d} day${d === 1 ? "" : "s"} late — still worth doing` : "", t.note || ""].filter(Boolean).join(". ") });
      else if (d >= -7) out.push({ ...base, type: "upcoming", pri: 3, daysOut: -d });
      return;
    }
    if (isDueOn(t, todayKey)) out.push({ ...base, daysOut: 0 });
    else {
      const n = nextIn(t, addDaysToLocalKey(todayKey, 1), 6);
      if (n >= 0) out.push({ ...base, type: "upcoming", pri: 3, daysOut: n + 1, routine: false });
    }
  });
  return out;
}

/** Tick a one-off job for good (repeating jobs use the daily completions map). */
export function markOwnDone(data, ownId, todayKey) {
  const list = Array.isArray(data.customTasks) ? data.customTasks : [];
  const t = list.find((x) => x.id === ownId);
  if (!t || !(t.repeat === "once" || !t.repeat)) return data;
  return { ...data, customTasks: list.map((x) => (x.id === ownId ? { ...x, doneOn: todayKey } : x)) };
}

/** Undo a one-off tick made today. */
export function unmarkOwnDone(data, ownId, todayKey) {
  const list = Array.isArray(data.customTasks) ? data.customTasks : [];
  if (!list.some((x) => x.id === ownId && x.doneOn === todayKey)) return data;
  return { ...data, customTasks: list.map((x) => (x.id === ownId ? { ...x, doneOn: undefined } : x)) };
}

export function saveOwnTask(data, task) {
  const list = Array.isArray(data.customTasks) ? data.customTasks : [];
  const exists = list.some((x) => x.id === task.id);
  return { ...data, customTasks: exists ? list.map((x) => (x.id === task.id ? { ...x, ...task } : x)) : [...list, task] };
}
export function deleteOwnTask(data, id) {
  return { ...data, customTasks: (Array.isArray(data.customTasks) ? data.customTasks : []).filter((x) => x.id !== id) };
}

/** Quick picks for a beginner, based on what's on the map. */
export function ownTaskIdeas(data) {
  const types = new Set((data.zones || []).map((z) => z.type));
  const animals = (data.livestock && data.livestock.animals) || [];
  const ideas = [];
  if (types.has("compost")) ideas.push({ title: "Turn the compost", emoji: "♻️", repeat: "fortnightly", minutes: 15, zoneType: "compost" });
  if (types.has("water")) ideas.push({ title: "Check the water butt and pond", emoji: "💧", repeat: "weekly", minutes: 5, zoneType: "water" });
  if (types.has("greenhouse")) ideas.push({ title: "Clean greenhouse glass and gutters", emoji: "🧽", repeat: "monthly", minutes: 30, zoneType: "greenhouse" });
  if (animals.some((a) => a.type !== "Bee")) ideas.push({ title: "Walk the fence line", emoji: "🪵", repeat: "weekly", minutes: 10 });
  ideas.push({ title: "Weed the beds", emoji: "🌿", repeat: "weekly", minutes: 20 });
  ideas.push({ title: "Clean and oil tools", emoji: "🧰", repeat: "monthly", minutes: 20 });
  ideas.push({ title: "Buy seeds and compost", emoji: "🛒", repeat: "once", minutes: 30 });
  return ideas.slice(0, 5);
}
