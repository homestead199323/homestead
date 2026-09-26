import {markTaskDone,todayLocalKey,appendLog} from "../../lib/utils";
import {uid} from "../../lib/storage";
import {rCM} from "../../lib/regional";
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
      const item = {
        id: uid(),
        name: plot.crop,
        category: "Fresh Produce",
        qty: kg,
        unit: "kg",
        source: "farm",
        addedDate: todayLocalKey(),
        storageNote: (crop && crop.storage) || "",
      };
      const next = {
        ...data,
        garden: { ...data.garden, plots: plots.map(function(x) { return x.id === plot.id ? { ...x, status: "harvested" } : x; }) },
        pantry: { items: [...((data.pantry && data.pantry.items) || []), item] },
        log: appendLog(data.log, { text: "🧺 Harvested " + kg + "kg " + plot.crop }),
      };
      return markTaskDone(next, task.key);
    }
  }

  // Eggs — add to pantry, log.
  if (task.type === "eggs") {
    const count = Number(logValue) > 0 ? Math.round(Number(logValue)) : 1;
    const item = {
      id: uid(),
      name: "Eggs",
      category: "Eggs",
      qty: count,
      unit: "count",
      source: "farm",
      addedDate: todayLocalKey(),
      storageNote: "Refrigerate within 2 hours of collection.",
    };
    const next = {
      ...data,
      pantry: { items: [...((data.pantry && data.pantry.items) || []), item] },
      log: appendLog(data.log, { text: "🥚 Collected " + count + " eggs" }),
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
      const newSteps = plot.steps.map(function(s, i) {
        return i === task.stepIdx ? { ...s, done: true } : s;
      });
      const next = {
        ...data,
        garden: {
          ...(data.garden || {}),
          plots: plots.map(function(x) { return x.id === plot.id ? { ...x, steps: newSteps } : x; }),
        },
      };
      return markTaskDone(next, task.key);
    }
  }

  // Everything else — pure check-off.
  return markTaskDone(data, task.key);
}

