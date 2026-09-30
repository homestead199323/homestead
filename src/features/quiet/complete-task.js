import {markTaskDone,todayLocalKey,appendLog} from "../../lib/utils";
import {addStock} from "../../lib/inventory";
import {rCM} from "../../lib/regional";
import {isRecurringCrop, afterRecurringHarvest} from "../../lib/perennial";
import {toggleStep, isAwaitingSowing, firstStepIdx, sowVerb} from "../../lib/sowing";
import {recordHarvest, recordProduce} from "../../lib/memory";
export function applyTaskCompletion(data, task, logValue) {
  if (!task) return data;
  if ((data.completions?.[todayLocalKey()] || []).includes(task.key)) return data;
  if(task.type === "harvest" && data.garden?.plots.find(p=>p.id===task.plotId)?.status === "harvested") return data;

  // Harvest — move plot to harvested, push yield to pantry, log.
  if (task.type === "harvest" && task.plotId) {
    const plots = (data.garden && data.garden.plots) || [];
    const plot = plots.find(function(p) { return p.id === task.plotId; });
    if (plot) {
      const crop = rCM(data.region).get(plot.crop);
      const kg = Number(logValue) > 0 ? Number(logValue) : (plot.expectedYieldKg || (crop && crop.yld) || 3);
      // Trees, soft fruit and perennial herbs stay planted and are due again next season.
      const recurring = isRecurringCrop(crop);
      const expected = plot.expectedYieldKg || null; // only a real per-planting estimate is compared
      const remembered = recordHarvest(data, plot, kg, todayLocalKey(), expected, !recurring);
      const stocked = addStock(remembered, { name: plot.crop, category: "Fresh Produce", qty: kg, unit: "kg", source: "farm", storageNote: (crop && crop.storage) || "" }, todayLocalKey());
      const next = {
        ...stocked,
        garden: { ...stocked.garden, plots: plots.map(function(x) { return x.id === plot.id ? (recurring ? afterRecurringHarvest(x, crop, todayLocalKey()) : { ...x, status: "harvested" }) : x; }) },
        log: appendLog(data.log, { text: "🧺 Harvested " + kg + "kg " + plot.crop }),
      };
      return markTaskDone(next, task.key);
    }
  }

  // Eggs — add to pantry, log.
  if (task.type === "eggs") {
    const count = Number(logValue) > 0 ? Math.round(Number(logValue)) : 1;
    const next = {
      ...addStock(recordProduce(data, task.speciesType, "eggs", count, todayLocalKey()), { name: (task.speciesType ? task.speciesType + " " : "") + "Eggs", category: "Eggs", qty: count, unit: "pcs", source: "livestock", storageNote: "Refrigerate within 2 hours of collection." }, todayLocalKey()),
      log: appendLog(data.log, { text: "🥚 Collected " + count + " eggs" }),
    };
    return markTaskDone(next, task.key);
  }

  // Milk — add litres to the pantry, log.
  if (task.type === "milk") {
    const litres = Number(logValue) > 0 ? Math.round(Number(logValue) * 10) / 10 : (task.expected || 1);
    const next = {
      ...addStock(recordProduce(data, task.speciesType, "milkL", litres, todayLocalKey()), { name: (task.speciesType ? task.speciesType + " " : "") + "Milk", category: "Dairy", qty: litres, unit: "L", source: "livestock", storageNote: "Strain and chill below 4°C within 2 hours. Use within 3–5 days, or make cheese." }, todayLocalKey()),
      log: appendLog(data.log, { text: "🥛 Milked " + litres + "L" + (task.speciesType ? " from the " + task.speciesType.toLowerCase() + "s" : "") }),
    };
    return markTaskDone(next, task.key);
  }

  // Water — log the amount only.
  if (task.type === "water") {
    const litres = Number(logValue) > 0 ? Number(logValue) : null;
    const text = litres ? ("💧 " + task.title + " (~" + litres + "L)") : ("💧 " + task.title);
    const next = { ...data, log: appendLog(data.log, { text: text }) };
    return markTaskDone(next, task.key);
  }

  // Step task — set the plot's persistent steps[i].done flag, so the step
  // doesn't reappear on next reload. (task-queue tracks step completion via
  // this flag, NOT via the daily completions map; we must update both.)
  if (task.type === "step" && task.plotId && task.stepIdx != null) {
    const plots = (data.garden && data.garden.plots) || [];
    const plot = plots.find(function(p) { return p.id === task.plotId; });
    if (plot && plot.steps && plot.steps[task.stepIdx]) {
      // Ticking the first step of a plot that is still waiting to be sown starts
      // its growing clock today (see lib/sowing.js).
      const sowing = isAwaitingSowing(plot) && task.stepIdx === firstStepIdx(plot.steps);
      const crop = rCM(data.region).get(plot.crop);
      const updated = plot.steps[task.stepIdx].done ? plot : toggleStep(plot, task.stepIdx, todayLocalKey(), crop && crop.days);
      const next = {
        ...data,
        garden: {
          ...(data.garden || {}),
          plots: plots.map(function(x) { return x.id === plot.id ? updated : x; }),
        },
      };
      if (sowing) next.log = appendLog(data.log, { text: "🌱 " + (sowVerb(plot.steps) === "Plant" ? "Planted " : "Sowed ") + (plot.name || plot.crop) });
      return markTaskDone(next, task.key);
    }
  }

  // Everything else — pure check-off.
  return markTaskDone(data, task.key);
}

