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
  return orderRoute([...stops.values()], fw / 2, fh, startId, zones);
}

/**
 * Beds laid out side by side form one "band" you walk along: plant areas whose long sides face each
 * other (overlapping by at least half) with no more than a path's width between them.
 * Returns zoneId → band id (the first bed's id) for beds that belong to a band.
 */
export function bedBands(zones) {
  const beds = (zones || []).filter((z) => PLANT_ZONES.has(z.type) && z.type !== "orchard" && z.type !== "greenhouse");
  const parent = new Map(beds.map((z) => [z.id, z.id]));
  const root = (id) => (parent.get(id) === id ? id : root(parent.get(id)));
  const overlap = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0);
  const GAP = 1.6;
  for (let i = 0; i < beds.length; i++)
    for (let j = i + 1; j < beds.length; j++) {
      const a = beds[i],
        b = beds[j];
      const oy = overlap(a.yM, a.yM + a.hM, b.yM, b.yM + b.hM),
        ox = overlap(a.xM, a.xM + a.wM, b.xM, b.xM + b.wM);
      const gapX = -ox,
        gapY = -oy;
      // Long sides must face each other: tall beds join left-right, wide beds join top-bottom.
      // (A row of tall beds is not joined to the row of beds above/below it — you walk one row, then the next.)
      const tall = a.hM >= a.wM && b.hM >= b.wM,
        wide = a.wM >= a.hM && b.wM >= b.hM;
      const sideBySide = tall && oy >= 0.5 * Math.min(a.hM, b.hM) && gapX >= -0.01 && gapX <= GAP;
      const stacked = wide && ox >= 0.5 * Math.min(a.wM, b.wM) && gapY >= -0.01 && gapY <= GAP;
      if (sideBySide || stacked) parent.set(root(b.id), root(a.id));
    }
  const out = new Map();
  beds.forEach((z) => {
    const r = root(z.id);
    if (beds.some((o) => o.id !== z.id && root(o.id) === r)) out.set(z.id, `band-${r}`);
  });
  return out;
}

// Paths on the farm run straight across and up/down, so walking distance is closer to
// Manhattan distance than to a straight line.
const walk = (a, b) => Math.abs(a.xM - b.xM) + Math.abs(a.yM - b.yM);

/**
 * Order stops the way you'd actually walk them:
 * 1. every area is finished in one visit — its plantings are swept in row order (1→6 or 6→1,
 *    whichever end is nearer when you arrive), so no bed is skipped and come back to later;
 * 2. the areas themselves are ordered for the shortest total walk from the entrance
 *    (nearest-neighbour start, then 2-opt improvement, choosing each area's sweep direction).
 */
export function orderRoute(list, startX, startY, startId = "", zones = []) {
  const band = bedBands(zones);
  const groups = new Map();
  list.forEach((s) => {
    const key = band.get(s.zoneId) || s.zoneId || s.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  });
  const blocks = [...groups.entries()].map(([key, stops]) => {
    const isBand = String(key).startsWith("band-");
    // In a band of beds every stop (bed or planting) is part of the sweep; in a single area a
    // whole-area stop (e.g. "check the nursery") is done on arrival, before the rows.
    const area = isBand ? [] : stops.filter((s) => !s.plotId),
      plots = isBand ? stops.slice() : stops.filter((s) => s.plotId);
    // In a band, sweep bed by bed (by each bed's centre); inside one area, row by row.
    const zc = new Map((zones || []).map((z) => [z.id, { xM: z.xM + z.wM / 2, yM: z.yM + z.hM / 2 }]));
    const at = (st) => (isBand && zc.get(st.zoneId)) || st;
    const xs = plots.map((st) => at(st).xM),
      ys = plots.map((st) => at(st).yM);
    const byX = xs.length && Math.max(...xs) - Math.min(...xs) >= Math.max(...ys) - Math.min(...ys);
    plots.sort((a, b) => {
      const pa = at(a),
        pb = at(b);
      return byX ? pa.xM - pb.xM || a.xM - b.xM || a.yM - b.yM : pa.yM - pb.yM || a.yM - b.yM || a.xM - b.xM;
    });
    return { fwd: [...area, ...plots], rev: [...area, ...plots.slice().reverse()] };
  });
  const seq = (b, reversed) => (reversed ? b.rev : b.fwd);
  const first = (b, r) => seq(b, r)[0],
    last = (b, r) => seq(b, r)[seq(b, r).length - 1];
  const inner = (b, r) => seq(b, r).slice(1).reduce((d, s, i) => d + walk(seq(b, r)[i], s), 0);
  const start = { xM: startX, yM: startY };

  // Forced first area when the walker chose where to start.
  let order = [];
  const rest = blocks.map((b, i) => i);
  if (startId) {
    const k = rest.findIndex((i) => blocks[i].fwd.some((s) => s.id === startId || s.zoneId === startId));
    if (k >= 0) order.push({ i: rest.splice(k, 1)[0], r: false });
  }
  // Nearest neighbour over areas, trying both sweep directions.
  let pos = order.length ? last(blocks[order[0].i], false) : start;
  while (rest.length) {
    let best = null;
    rest.forEach((i, k) =>
      [false, true].forEach((r) => {
        const d = walk(pos, first(blocks[i], r));
        if (!best || d < best.d - 1e-9) best = { k, i, r, d };
      }),
    );
    rest.splice(best.k, 1);
    order.push({ i: best.i, r: best.r });
    pos = last(blocks[best.i], best.r);
  }

  // Best sweep direction for every area given its neighbours (exact, left to right).
  const cost = (o) => {
    let d = 0,
      p = start;
    o.forEach(({ i, r }) => {
      d += walk(p, first(blocks[i], r)) + inner(blocks[i], r);
      p = last(blocks[i], r);
    });
    return d;
  };
  const orient = (o) => {
    // Dynamic programming over (area, direction).
    if (!o.length) return o;
    const n = o.length,
      dp = [],
      from = [];
    for (let k = 0; k < n; k++) {
      dp.push([Infinity, Infinity]);
      from.push([0, 0]);
      [false, true].forEach((r, ri) => {
        if (k === 0 && startId && o[0].fixed) {
          if (r) return;
        }
        const b = blocks[o[k].i],
          own = inner(b, r);
        if (k === 0) dp[0][ri] = walk(start, first(b, r)) + own;
        else
          [0, 1].forEach((pj) => {
            const d = dp[k - 1][pj] + walk(last(blocks[o[k - 1].i], pj === 1), first(b, r)) + own;
            if (d < dp[k][ri]) {
              dp[k][ri] = d;
              from[k][ri] = pj;
            }
          });
      });
    }
    let ri = dp[n - 1][0] <= dp[n - 1][1] ? 0 : 1;
    const out = new Array(n);
    for (let k = n - 1; k >= 0; k--) {
      out[k] = { ...o[k], r: ri === 1 };
      ri = from[k][ri];
    }
    return out;
  };
  if (order.length && startId && order[0]) order[0].fixed = true;
  order = orient(order);
  // 2-opt on the area order (the forced first area stays first).
  const lo = startId && order[0]?.fixed ? 1 : 0;
  let improved = true,
    guard = 0;
  while (improved && guard++ < 50) {
    improved = false;
    for (let a = lo; a < order.length - 1; a++)
      for (let b = a + 1; b < order.length; b++) {
        const trial = orient([...order.slice(0, a), ...order.slice(a, b + 1).reverse(), ...order.slice(b + 1)]);
        if (cost(trial) < cost(order) - 1e-6) {
          order = trial;
          improved = true;
        }
      }
  }
  return order.flatMap(({ i, r }) => seq(blocks[i], r));
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
