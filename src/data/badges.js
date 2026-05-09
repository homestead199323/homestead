/* BADGE DEFINITIONS — companion_planner uses COMP.
   Phase A Commit 5b, 2026-05-09 */

import { COMP } from "./companions";

export const BADGES = [
  { id: "first_harvest",     emoji: "🧺", name: "First Harvest",       desc: "Complete your first full crop cycle and harvest it.", check: (d) => d.gamify.totalHarvests >= 1 },
  { id: "green_thumb",       emoji: "🌱", name: "Green Thumb",         desc: "Plant 10 different crops on your homestead.",        check: (d) => { const unique = new Set(d.garden.plots.map(p=>p.crop)); return unique.size >= 10; } },
  { id: "companion_planner", emoji: "🤝", name: "Companion Planner",   desc: "Plant 3+ companion crops in the same zone.",         check: (d) => {
    return d.zones.some(z => {
      const zCrops = d.garden.plots.filter(p=>p.zone===z.id && p.status!=="harvested").map(p=>p.crop);
      if (zCrops.length < 3) return false;
      return zCrops.some(c => { const comp = COMP[c]; return comp && zCrops.filter(oc => oc!==c && comp.good.includes(oc)).length >= 2; });
    });
  }},
  { id: "week_warrior",      emoji: "🔥", name: "Week Warrior",        desc: "Maintain a 7-day activity streak.",                  check: (d) => d.gamify.streak >= 7 || d.gamify.bestStreak >= 7 },
  { id: "zone_master",       emoji: "🌍", name: "Zone Master",         desc: "Set up 5 or more zones on your farm map.",           check: (d) => d.zones.length >= 5 },
  { id: "record_keeper",     emoji: "📝", name: "Record Keeper",       desc: "Log 50 activities on your homestead.",               check: (d) => d.gamify.totalLogEntries >= 50 },
];
