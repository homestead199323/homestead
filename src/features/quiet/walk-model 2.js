import { animalZone, zoneGeometry, layoutPlots, axisOf } from "./farm-model.js";
import { plantingCentre } from "./planting-plan.js";

const PLANT_ZONES = new Set(["veg", "herbs", "orchard", "greenhouse", "raised", "container"]);

function plantingSummary(zone, plot) {
  const l = plot.layout || {};
  if (l.pattern === "scatter") return `${plot.plantCount || ""} trees`.trim();
  if (l.version === 2) return `${l.rowCount} ${axisOf(zone, l)} row${l.rowCount === 1 ? "" : "s"}`;
  if (l.startRow) return l.rowCount > 1 ? `rows ${l.startRow}–${l.startRow + l.rowCount - 1}` : `row ${l.startRow}`;
  return "";
}

/**
 * A walk visits each crop planting where it actually grows (so notes and photos belong to that crop),
 * and each animal or other area as a whole. Stops are ordered by walking to the nearest next one,
 * starting from the entrance or a chosen area.
 */
export function planRound(tasks, data, mode = "quick", startId = "") {
  const fw = data.farmW || 100,
    fh = data.farmH || 60,
    stops = new Map();
  const zones = (data.zones || []).map((z, i) => zoneGeometry(z, fw, fh, i));
  const plots = data.garden?.plots || [];
  const at = (xM, yM) => ({ xM, yM, cx: (xM / fw) * 100, cy: (yM / fh) * 100 });
  function plotStop(zone, plot) {
    const key = `plot-${plot.id}`;
    if (!stops.has(key)) {
      const c = plantingCentre(zone, layoutPlots(zone, [plot])[0] || plot);
      stops.set(key, {
        id: key,
        zoneId: zone.id,
        plotId: plot.id,
        plotIds: [plot.id],
        label: plot.name || plot.crop,
        crop: plot.crop,
        sub: [zone.name, plantingSummary(zone, plot)].filter(Boolean).join(" · "),
        type: zone.type,
        tasks: [],
        ...at(zone.xM + c.xM, zone.yM + c.yM),
      });
    }
    return stops.get(key);
  }
  function zoneStop(zone) {
    if (!stops.has(zone.id))
      stops.set(zone.id, {
        id: zone.id,
        zoneId: zone.id,
        plotId: null,
        plotIds: [],
        label: zone.name,
        sub: "",
        type: zone.type,
        tasks: [],
        ...at(zone.xM + zone.wM / 2, zone.yM + zone.hM / 2),
      });
    return stops.get(zone.id);
  }
  if (mode === "full")
    zones.forEach((z) => {
      const active = plots.filter((p) => p.zone === z.id && p.status !== "harvested");
      if (PLANT_ZONES.has(z.type) && active.length) active.forEach((p) => plotStop(z, p));
      else if (z.type !== "house") zoneStop(z);
    });
  tasks
    .filter((t) => t.daysOut === 0 && !["forecast", "upcoming"].includes(t.type))
    .forEach((task) => {
      const plot = plots.find((p) => p.id === task.plotId),
        animal = data.livestock?.animals.find((a) => a.id === task.animalId);
      const matches = task.speciesType
        ? (data.livestock?.animals || []).filter((a) => a.type === task.speciesType)
        : animal
          ? [animal]
          : [];
      const ids = [...new Set(matches.map((a) => animalZone(a, zones)?.id).filter(Boolean))];
      const plotZone = plot && zones.find((z) => z.id === plot.zone);
      if (plotZone) {
        plotStop(plotZone, plot).tasks.push(task);
        return;
      }
      const taskZone = !plot && task.zoneId && zones.find((z) => z.id === task.zoneId);
      if (taskZone) {
        zoneStop(taskZone).tasks.push(task);
        return;
      }
      const z = zones.find((z) => z.id === ids[0]);
      if (z) {
        zoneStop(z).tasks.push({ ...task, otherZones: ids.slice(1).map((id) => zones.find((z) => z.id === id)?.name) });
        return;
      }
      const key = plot ? "unplaced-crops" : "unplaced-animals";
      if (!stops.has(key))
        stops.set(key, {
          id: key,
          zoneId: null,
          plotId: null,
          label: plot ? "Unassigned crops" : "Unassigned animals",
          sub: "Not placed on your map yet",
          type: plot ? "veg" : "barn",
          tasks: [],
          plotIds: [],
          ...at(fw / 2, fh),
        });
      const group = stops.get(key);
      group.tasks.push(task);
      if (plot && !group.plotIds.includes(plot.id)) group.plotIds.push(plot.id);
    });
  const remaining = [...stops.values()],
    result = [];
  let x = fw / 2,
    y = fh;
  if (startId) {
    const idx = remaining.findIndex((s) => s.id === startId || s.zoneId === startId);
    if (idx >= 0) {
      const s = remaining.splice(idx, 1)[0];
      result.push(s);
      x = s.xM;
      y = s.yM;
    }
  }
  while (remaining.length) {
    let best = 0,
      dist = Infinity;
    remaining.forEach((s, i) => {
      // Finish an area before leaving it: other stops in the same area count as half the distance.
      const same = result.length && s.zoneId && s.zoneId === result[result.length - 1].zoneId;
      const d = Math.hypot(s.xM - x, s.yM - y) * (same ? 0.5 : 1);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    const s = remaining.splice(best, 1)[0];
    result.push(s);
    x = s.xM;
    y = s.yM;
  }
  return result;
}
export function roundMinutes(stops, data) {
  let x = (data.farmW || 100) / 2,
    y = data.farmH || 60,
    metres = 0;
  stops.forEach((s) => {
    const nx = s.xM ?? (s.cx / 100) * (data.farmW || 100),
      ny = s.yM ?? (s.cy / 100) * (data.farmH || 60);
    metres += Math.hypot(nx - x, ny - y);
    x = nx;
    y = ny;
  });
  return Math.max(
    1,
    Math.ceil(metres / 50 + stops.length * 0.75 + stops.reduce((n, s) => n + s.tasks.length * 1.5, 0)),
  );
}
