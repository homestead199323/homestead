/* ═══════════════════════════════════════════
   DIGEST — the morning notification text (pure; used by lib/push.js)
   Built from the real task engine for each of the next mornings.
   ═══════════════════════════════════════════ */
import { buildTaskPlan } from "./task-queue.js";
import { taskMinutes } from "./task-time.js";
import { addDaysToLocalKey, localDateFromKey, todayLocalKey } from "./utils.js";

const DUE = (t) => t.daysOut === 0 && t.type !== "forecast" && t.type !== "upcoming";

/** One morning's notification from that day's jobs, or null when nothing is due. */
export function digestFor(tasks) {
  const due = (tasks || []).filter(DUE);
  if (due.length === 0) return null;
  const minutes = due.reduce((n, t) => n + taskMinutes(t), 0);
  const urgent = due.find((t) => t.type === "weather" && t.pri === 0);
  const harvest = due.filter((t) => t.type === "harvest");
  const jobs = `${due.length} job${due.length === 1 ? "" : "s"} today · ~${minutes} min`;
  let title;
  if (urgent) title = `${urgent.emoji || "⚠️"} ${urgent.title}`;
  else if (harvest.length === 1) title = `🧺 ${harvest[0].frostPick ? harvest[0].title : harvest[0].title.replace(/^Harvest /, "") + " is ready to pick"}`;
  else if (harvest.length) title = `🧺 ${harvest.length} harvests ready to pick`;
  else title = `🌱 ${jobs}`;
  const named = due.filter((t) => !t.routine && t !== urgent).map((t) => t.title);
  const routine = due.filter((t) => t.routine).length;
  const parts = [];
  if (title.indexOf(jobs) < 0) parts.push(jobs);
  if (named.length) parts.push(named.slice(0, 3).join(" · ") + (named.length > 3 ? ` +${named.length - 3} more` : ""));
  if (routine) parts.push(`${routine} daily care job${routine === 1 ? "" : "s"}`);
  const body = parts.join(". ");
  return { title: title.slice(0, 120), body: body.slice(0, 240), count: due.length, minutes };
}

/** The next `days` mornings, keyed by local date. */
export function buildDigests(data, forecast, startKey = todayLocalKey(), days = 7) {
  const out = {};
  for (let i = 0; i < days; i++) {
    const key = addDaysToLocalKey(startKey, i);
    const d = digestFor(buildTaskPlan(data, { forecast, now: localDateFromKey(key) }).tasks);
    if (d) out[key] = d;
  }
  return out;
}

