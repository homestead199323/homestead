import { bedLength, bedRows, layoutPlots, axisOf, modernRect } from "./farm-model";
import { crowdingFactor, spacingGuide } from "../../data/spacing.js";
const TREE_NAMES = new Set([
  "Apple",
  "Pear",
  "Olive",
  "Fig",
  "Peach",
  "Plum",
  "Cherry",
  "Apricot",
  "Walnut",
  "Almond",
  "Chestnut",
  "Quince",
  "Persimmon",
  "Lemon",
  "Orange",
  "Hazelnut",
  "Pomegranate",
  "Avocado",
  "Mango",
]);
export const isTreeCrop = (c) =>
  !!c && (TREE_NAMES.has(c.name) || ["Fruit Tree", "Nut Tree"].includes(c.cat));
export function cropFitsZone(c, z) {
  if (!c || !z) return false;
  if (z.type === "orchard") return ["Fruit", "Fruit Tree", "Nut Tree"].includes(c.cat);
  if (isTreeCrop(c)) return z.type === "container";
  if (z.type === "herbs") return c.cat === "Herb";
  return ["veg", "raised", "greenhouse", "container"].includes(z.type);
}
const EPS = 0.00001;
const overlaps = (a, b) => a.x0 < b.x1 - EPS && a.x1 > b.x0 + EPS && a.y0 < b.y1 - EPS && a.y1 > b.y0 + EPS;
/** Footprints of every other planting in a bed, as bed-local rectangles. */
export function occupiedRects(zone, plots, excludeId) {
  const rows = bedRows(zone),
    zoneVertical = zone.rowAxis === "vertical",
    gap = (zoneVertical ? zone.wM : zone.hM) / rows;
  return layoutPlots(zone, plots)
    .filter((p) => p.id !== excludeId)
    .flatMap((p) => {
      const l = p.layout;
      if (l.pattern === "scatter")
        return (l.points || []).map((q) => {
          const r = (l.spacingCM || 100) / 200;
          return { x0: q.xM - r, x1: q.xM + r, y0: q.yM - r, y1: q.yM + r, tree: true };
        });
      if (l.version === 2) return [modernRect(zone, l)];
      const c0 = (l.startRow - 1) * gap,
        c1 = (l.startRow - 1 + l.rowCount) * gap;
      return [
        zoneVertical ? { x0: c0, x1: c1, y0: 0, y1: l.lengthM } : { x0: 0, x1: l.lengthM, y0: c0, y1: c1 },
      ];
    });
}
/** Cross-axis bands used by plantings running in the bed's default direction (kept for older callers). */
export function occupiedBands(zone, plots, excludeId) {
  const vertical = zone.rowAxis === "vertical";
  return occupiedRects(zone, plots, excludeId)
    .filter((r) => !r.tree)
    .map((r) => (vertical ? [r.x0, r.x1] : [r.y0, r.y1]))
    .sort((a, b) => a[0] - b[0]);
}
export function gridCapacity(length, spacing, pattern, row) {
  return Math.max(
    0,
    Math.floor((length - 0.2 - (pattern === "offset" && row % 2 ? spacing / 2 : 0) + 1e-8) / spacing),
  );
}
export function planPlanting(zone, plots, input, crop, excludeId) {
  const fail = (error) => ({ error, count: 0, rows: 0 });
  if (!cropFitsZone(crop, zone))
    return fail(
      zone?.type === "orchard"
        ? "Choose a fruit or nut crop for an orchard."
        : "Choose a suitable growing area for this crop.",
    );
  const spacingCM = Number(input.spacingCM ?? crop.spacing),
    spacing = spacingCM / 100;
  const pattern = input.pattern || "rows",
    random = pattern === "scatter";
  const rowSpacingCM = Number(
      input.rowSpacingCM ?? Math.round(spacingCM * (pattern === "offset" ? Math.sqrt(3) / 2 : 1) * 10) / 10,
    ),
    rowGap = rowSpacingCM / 100;
  if (!(spacing > 0) || !Number.isFinite(spacing) || !(rowGap > 0) || !Number.isFinite(rowGap))
    return fail("Enter positive plant and row spacing.");
  const byRows = input.mode === "rows" && !random,
    value = Number(byRows ? input.rowCount : input.plantCount);
  if (!Number.isInteger(value) || value < 1)
    return fail(`Enter a whole number of ${byRows ? "rows" : "plants"} greater than zero.`);
  if (value > 100000 || (byRows && value > 1000)) return fail("Use a smaller planting group.");
  const yieldFactor = crowdingFactor(crop, spacingCM, random ? spacingCM : rowSpacingCM);
  if (random) {
    if (zone.type !== "orchard") return fail("Scattered planting is available in orchards.");
    const points = scatterTrees(zone, plots, value, spacing, excludeId, crop.name + (input.seed || ""));
    if (points.length !== value)
      return fail(
        `Only ${points.length} additional trees fit at this spacing. Use fewer trees or reduce spacing.`,
      );
    return {
      count: value,
      rows: 0,
      error: "",
      yieldFactor,
      layout: { version: 2, pattern, spacingCM, rowSpacingCM, points, seed: input.seed || "" },
    };
  }
  const axis = input.axis === "vertical" || input.axis === "horizontal" ? input.axis : axisOf(zone),
    vertical = axis === "vertical";
  const alongMax = vertical ? zone.hM : zone.wM,
    cross = vertical ? zone.wM : zone.hM;
  const placeRows = (length) => {
    if (!(length > 0.2) || length > alongMax + EPS) return fail(`Row length must fit within ${alongMax} m.`);
    const capacities = [];
    let count = 0;
    while ((byRows ? capacities.length < value : count < value) && capacities.length < 1000) {
      const capacity = gridCapacity(length, spacing, pattern, capacities.length);
      if (!capacity) return fail("The row is too short for this spacing and pattern.");
      capacities.push(capacity);
      count += capacity;
    }
    if (!byRows && count < value) return fail("This planting needs too many rows.");
    const rows = capacities.length,
      height = spacing + (rows - 1) * rowGap;
    const rectAt = (c, a) =>
      vertical
        ? { x0: c, x1: c + height, y0: a, y1: a + length }
        : { x0: a, x1: a + length, y0: c, y1: c + height };
    const taken = occupiedRects(zone, plots, excludeId);
    const fits = (c, a) =>
      c >= 0.1 - EPS && c + height <= cross - 0.1 + EPS && a >= -EPS && a + length <= alongMax + EPS;
    const tooWide = () => ({
      ...fail(
        `${rows} rows need ${height.toFixed(2)} m of free bed width at this spacing. Reduce plants/rows or spacing, or expand the bed.`,
      ),
      rows,
      count: byRows ? count : value,
      tooWide: true,
    });
    let start, alongStart;
    if (input.startM !== undefined && input.startM !== "") {
      start = Number(input.startM);
      alongStart = Number(input.alongStartM) || 0;
      if (!Number.isFinite(start) || !fits(start, alongStart)) return tooWide();
      if (taken.some((r) => overlaps(r, rectAt(start, alongStart))))
        return fail("This planting overlaps an existing crop. Choose free space.");
    } else {
      // First free spot, scanning across the bed, then along it. Plantings in either direction can share a bed.
      const crossStarts = [...new Set([0.1, ...taken.map((r) => (vertical ? r.x1 : r.y1) + 0.1)])].sort(
        (a, b) => a - b,
      );
      const alongStarts = [...new Set([0, ...taken.map((r) => (vertical ? r.y1 : r.x1))])].sort(
        (a, b) => a - b,
      );
      outer: for (const c of crossStarts)
        for (const a of alongStarts)
          if (fits(c, a) && !taken.some((r) => overlaps(r, rectAt(c, a)))) {
            start = c;
            alongStart = a;
            break outer;
          }
      if (start === undefined) return tooWide();
    }
    if (!byRows) count = value;
    const layout = {
      version: 2,
      pattern,
      across: axis !== axisOf(zone),
      spacingCM,
      rowSpacingCM,
      startM: start,
      alongStartM: alongStart,
      rowCount: rows,
      lengthM: length,
      mode: byRows ? "rows" : "plants",
    };
    if (zone.type === "orchard") {
      const existing = layoutPlots(zone, plots)
        .filter((p) => p.id !== excludeId && p.layout.pattern === "scatter")
        .flatMap((p) =>
          physicalPoints(zone, p).map((q) => ({ ...q, spacing: (p.layout.spacingCM || spacingCM) / 100 })),
        );
      if (
        existing.length &&
        physicalPoints(zone, { plantCount: count, layout }).some((q) =>
          existing.some((p) => Math.hypot(q.xM - p.xM, q.yM - p.yM) < Math.max(spacing, p.spacing) - EPS),
        )
      )
        return {
          ...fail("These rows would overlap scattered trees. Change spacing or use a scattered arrangement."),
          count,
          rows,
        };
    }
    return { count, rows, error: "", height, layout, yieldFactor, rect: rectAt(start, alongStart) };
  };
  const chosen = input.lengthM !== undefined && input.lengthM !== "" && input.lengthM !== null;
  const first = placeRows(chosen ? Number(input.lengthM) : alongMax);
  if (chosen || !first.error || !first.tooWide) return first;
  // No full-length spot: shorten rows in 10 cm steps until the planting fits the free space.
  for (
    let length = Math.floor((alongMax - 0.1) * 10) / 10;
    length > 0.25;
    length = Math.round((length - 0.1) * 10) / 10
  ) {
    const next = placeRows(length);
    if (!next.error) return { ...next, shortened: true };
    if (!next.tooWide) break;
  }
  return first;
}
// Stable, bounded best-candidate placement. Saved coordinates are never re-randomized on render.
export function scatterTrees(zone, plots, count, spacing, excludeId, seedText = "") {
  const occupied = layoutPlots(zone, plots)
    .filter((p) => p.id !== excludeId)
    .flatMap((p) => {
      const points = p.layout?.points || physicalPoints(zone, p);
      return points.map((q) => ({ ...q, spacing: (p.layout?.spacingCM || spacing * 100) / 100 }));
    });
  const margin = Math.max(0.2, Math.min(spacing / 2, 1)),
    w = zone.wM - margin * 2,
    h = zone.hM - margin * 2;
  if (w < 0 || h < 0) return [];
  const need = (p) => Math.max(spacing, p.spacing || spacing) - 0.00001;
  let best = [];
  // Best-candidate sampling: each tree goes to the most open of several random spots, which packs
  // well and still looks natural. A few deterministic restarts keep the attempt that fits the most.
  for (let attempt = 0; attempt < 8 && best.length < count; attempt++) {
    let seed = [...(zone.id + seedText + (attempt ? attempt : ""))].reduce(
      (n, c) => (n * 31 + c.charCodeAt(0)) >>> 0,
      7,
    );
    const rand = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const result = [];
    for (let i = 0; i < count; i++) {
      let pick = null,
        room = 0;
      for (let k = 0; k < 40; k++) {
        const q = { xM: margin + rand() * w, yM: margin + rand() * h };
        let slack = Infinity;
        for (const p of occupied.concat(result))
          slack = Math.min(slack, Math.hypot(q.xM - p.xM, q.yM - p.yM) - need(p));
        if (slack >= 0 && slack >= room) {
          room = slack;
          pick = q;
        }
      }
      if (!pick) break;
      result.push(pick);
    }
    if (result.length > best.length) best = result;
  }
  return best;
}
/** Plant rows of a planting in bed-local metres: [{ vertical, atM, fromM, toM, gapM, points }]. */
export function plantingRows(zone, plot) {
  const l = plot.layout || {};
  if (l.pattern === "scatter") return [];
  const modern = l.version === 2,
    vertical = modern ? axisOf(zone, l) === "vertical" : zone.rowAxis === "vertical",
    cross = vertical ? zone.wM : zone.hM,
    along = modern ? (vertical ? zone.hM : zone.wM) : bedLength(zone);
  const n = Math.max(0, Math.floor(plot.plantCount || 0)),
    num = l.rowCount || 1,
    spacing = (l.spacingCM || 30) / 100,
    a0 = modern ? Number(l.alongStartM) || 0 : 0,
    length = l.lengthM || along,
    rows = [];
  let remaining = n;
  for (let row = 0; row < num; row++) {
    const count = modern
      ? Math.min(remaining, gridCapacity(length, spacing, l.pattern, row))
      : Math.floor(n / num) + (row < n % num ? 1 : 0);
    const at = modern
      ? l.startM + spacing / 2 + (row * l.rowSpacingCM) / 100
      : (((l.startRow || 1) - 1 + row + 0.5) * cross) / bedRows(zone);
    const points = [];
    for (let col = 0; col < count; col++) {
      const pos = modern
        ? a0 + 0.1 + spacing / 2 + (col + (l.pattern === "offset" && row % 2 ? 0.5 : 0)) * spacing
        : ((col + 0.5) * length) / Math.max(1, count);
      points.push({ xM: vertical ? at : pos, yM: vertical ? pos : at });
    }
    rows.push({
      vertical,
      atM: at,
      fromM: a0 + (modern ? 0.1 : 0),
      toM: a0 + length - (modern ? 0.1 : 0),
      gapM: modern ? l.rowSpacingCM / 100 : cross / bedRows(zone),
      pitchM: modern ? spacing : length / Math.max(1, count),
      points,
    });
    remaining -= count;
  }
  return rows;
}
export function physicalPoints(zone, plot) {
  if (plot.layout?.points) return plot.layout.points;
  return plantingRows(zone, plot).flatMap((r) => r.points);
}
/** Centre of a planting in bed-local metres, for map pins and walk routing. */
export function plantingCentre(zone, plot) {
  const pts = physicalPoints(zone, plot);
  if (!pts.length) return { xM: zone.wM / 2, yM: zone.hM / 2 };
  const xs = pts.map((p) => p.xM),
    ys = pts.map((p) => p.yM);
  return { xM: (Math.min(...xs) + Math.max(...xs)) / 2, yM: (Math.min(...ys) + Math.max(...ys)) / 2 };
}
/** Bounding box of a planting's plants in bed-local metres, padded by half a plant space. */
export function plantingBounds(zone, plot) {
  const pts = physicalPoints(zone, plot);
  if (!pts.length) return { x0: 0, y0: 0, x1: zone.wM, y1: zone.hM };
  const pad = Math.max(0.08, (plot.layout?.spacingCM || 30) / 200);
  const xs = pts.map((p) => p.xM),
    ys = pts.map((p) => p.yM);
  return {
    x0: Math.max(0, Math.min(...xs) - pad),
    y0: Math.max(0, Math.min(...ys) - pad),
    x1: Math.min(zone.wM, Math.max(...xs) + pad),
    y1: Math.min(zone.hM, Math.max(...ys) + pad),
  };
}
/**
 * Fill a planting form with the grid defaults for its crop, pattern and bed:
 * orchards default to scattered trees; beds to straight rows in the bed's direction;
 * spacing comes from the row / biointensive guide until the grower edits it.
 */
export function plantingInput(form, crop, zone) {
  const pattern = form.pattern || (zone?.type === "orchard" ? "scatter" : "rows");
  const guide = spacingGuide(crop, pattern === "offset" ? "offset" : "rows");
  const spacingCM = form.spacingCM !== undefined && form.spacingCM !== "" ? form.spacingCM : guide.inRowCM;
  const rowSpacingCM =
    form.rowSpacingCM !== undefined && form.rowSpacingCM !== ""
      ? form.rowSpacingCM
      : pattern === "offset"
        ? Math.round(Number(spacingCM) * (Math.sqrt(3) / 2) * 10) / 10
        : guide.rowCM;
  return { ...form, pattern, spacingCM, rowSpacingCM, axis: form.axis || axisOf(zone, form) };
}
