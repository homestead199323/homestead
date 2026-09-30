/* ═══════════════════════════════════════════
   TASK TIME — rough minutes per job, so Today can answer
   "how long will this take?" (brief §8/§9). Deliberately coarse:
   a first-timer's pace, rounded to friendly numbers.
   ═══════════════════════════════════════════ */
const BY_TYPE = {
  harvest: 10, water: 3, feed: 5, eggs: 3, milk: 15, clean: 20, bedding: 40,
  paddock: 20, health: 5, hoof: 10, hive: 20, seedling: 5, weather: 10,
};

export function taskMinutes(task) {
  if (!task) return 5;
  if (task.ownId) return Number(task.minutes) > 0 ? Number(task.minutes) : 10;
  if (task.type === "step" || task.type === "upcoming") {
    const l = String(task.title || "").toLowerCase();
    if (/sow|plant|transplant|set out|prepare soil|dig/.test(l)) return 10;
    if (/mulch|stake|support|prune|earth up|net|cover/.test(l)) return 10;
    if (/harvest|pick|cut/.test(l)) return 10;
    return 5;
  }
  if (task.type === "milk") return Math.max(10, Math.min(60, 8 * (task.headCount || 1)));
  return BY_TYPE[task.type] || 5;
}

/** "~10 min" */
export function minutesLabel(task) {
  return "~" + taskMinutes(task) + " min";
}
