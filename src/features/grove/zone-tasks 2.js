import { LDB } from "../../data/livestock.js";
import { rCM } from "../../lib/regional.js";
import { animalZone } from "../quiet/farm-model.js";
import { isRecurringCrop } from "../../lib/perennial.js";

/** Tasks due today, grouped by the map area where they are done. */
export function tasksByZone(tasks, data) {
  const zones = data.zones || [],
    plots = data.garden?.plots || [],
    animals = data.livestock?.animals || [];
  const out = {};
  tasks
    .filter((t) => t.daysOut === 0 && !["forecast", "upcoming"].includes(t.type))
    .forEach((t) => {
      const plot = t.plotId && plots.find((p) => p.id === t.plotId);
      let id = plot?.zone || (!plot && t.zoneId) || null;
      if (!id) {
        const animal = animals.find((a) => a.id === t.animalId || (t.speciesType && a.type === t.speciesType));
        id = animal ? animalZone(animal, zones)?.id : null;
      }
      if (id && zones.some((z) => z.id === id)) (out[id] = out[id] || []).push(t);
    });
  // Produce to collect comes first, then the rest by priority.
  const rank = (t) => (["harvest", "eggs", "milk"].includes(t.type) ? -1 : (t.pri ?? 9));
  Object.values(out).forEach((list) => list.sort((a, b) => rank(a) - rank(b)));
  return out;
}

// What to do, shown as the task's badge/sticker. Crop emojis are not used here: many crops have
// placeholder dots (🟣, 🤎) instead of a real emoji; the crop itself is drawn with its own art.
const GLYPHS = {
  harvest: "🧺",
  eggs: "🥚",
  milk: "🥛",
  feed: "🌾",
  water: "💧",
  clean: "🧹",
  bedding: "🛏️",
  paddock: "🔄",
  health: "🩺",
  hoof: "🦶",
  hive: "🐝",
  step: "🌱",
  forecast: "📅",
  upcoming: "📅",
};
export function taskGlyph(task) {
  if (task.type === "seedling") return task.emoji || "🌱";
  return GLYPHS[task.type] || "✅";
}

const VERBS = {
  eggs: "Collect",
  milk: "Milk",
  harvest: "Harvest",
  feed: "Feed",
  water: "Water",
  clean: "Clean",
  bedding: "Change",
  paddock: "Move",
  health: "Checked",
  hoof: "Trimmed",
  hive: "Inspected",
  step: "Done",
  seedling: "Done",
};
const CHEERS = {
  feed: "Fed!",
  water: "Watered!",
  clean: "Sparkling!",
  bedding: "Fresh bed!",
  paddock: "Fresh grass!",
  health: "Healthy!",
  hoof: "Trimmed!",
  hive: "Buzzing!",
};

/**
 * How a task is played in the zone popup: the button verb, an optional amount to confirm
 * (eggs, milk, harvest go to the pantry), and the reward shown when it is done.
 */
export function taskAction(task, data) {
  const verb = VERBS[task.type] || "Done";
  if (task.type === "eggs") {
    const rate = LDB[task.speciesType]?.out?.Eggs?.p || 0.6;
    return { verb, amount: { value: Math.max(1, Math.round(rate * (task.headCount || 1))), step: 1, unit: "eggs", icon: "🥚" } };
  }
  if (task.type === "milk") {
    const value = task.expected || Math.round((LDB[task.speciesType]?.out?.Milk?.p || 1) * (task.headCount || 1) * 10) / 10;
    return { verb, amount: { value, step: 0.5, unit: "L", icon: "🥛" } };
  }
  if (task.type === "harvest") {
    const plot = data.garden?.plots.find((p) => p.id === task.plotId),
      crop = plot && rCM(data.region).get(plot.crop);
    return {
      verb,
      amount: { value: plot?.expectedYieldKg || crop?.yld || 3, step: 0.5, unit: "kg", icon: "🧺" },
      final: isRecurringCrop(crop) ? "Stays planted — due again next season." : "Marks the whole planting as harvested.",
    };
  }
  const seed = /^seed-(.+)-planted$/.exec(task.key || "");
  if (seed) {
    const batch = (data.nursery?.batches || []).find((b) => b.id === seed[1]);
    if (batch && !batch.plotId) return { verb: "Choose bed", open: true };
  }
  return { verb, cheer: CHEERS[task.type] || "Done!" };
}

/** Reward line shown when a task is completed from the popup. */
export function rewardText(task, action, value) {
  if (!action.amount) return action.cheer || "Done!";
  const n = Number(value) > 0 ? Number(value) : action.amount.value;
  return `+${n} ${action.amount.unit === "eggs" ? "" : action.amount.unit + " "}${action.amount.icon}`.replace("  ", " ");
}
