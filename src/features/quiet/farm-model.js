import { POULTRY_SPECIES } from "../../data/livestock.js";
import { COMP } from "../../data/companions.js";
export const STAGES = ["Planned", "Sown", "Seedling", "Growing", "Maturing", "Harvest window"];
const day = (v) => {
  const [y, m, d] = String(v || "")
    .split("-")
    .map(Number);
  return y && m && d ? Date.UTC(y, m - 1, d) / 864e5 : NaN;
};
export function growthOf(plot, crop, today = new Date().toLocaleDateString("en-CA")) {
  const observed = Number.isInteger(plot.observedStage) && plot.observedStage >= 1 && plot.observedStage <= 5;
  if (!observed && (!plot.plantDate || plot.status === "planned"))
    return { index: 0, progress: 0, label: STAGES[0], estimated: true };
  const duration = day(plot.harvestDate) - day(plot.plantDate);
  const progress =
    Math.min(
      1,
      Math.max(0, (day(today) - day(plot.plantDate)) / (duration > 0 ? duration : crop?.days || 90)),
    ) || 0;
  const index = observed
    ? plot.observedStage
    : progress >= 1
      ? 5
      : progress >= 0.72
        ? 4
        : progress >= 0.3
          ? 3
          : progress >= 0.08
            ? 2
            : 1;
  return { index, progress, label: STAGES[index], estimated: !observed };
}
export function relation(a, b) {
  if (a === b) return "same";
  if (COMP[a]?.bad.includes(b) || COMP[b]?.bad.includes(a)) return "avoid";
  if (COMP[a]?.good.includes(b) || COMP[b]?.good.includes(a)) return "good";
  return "unknown";
}
export function companionsFor(crop, zoneId, plots, available) {
  const neighbours = [
    ...new Set(plots.filter((p) => p.zone === zoneId && p.status !== "harvested").map((p) => p.crop)),
  ];
  return {
    neighbours,
    conflicts: neighbours.filter((n) => relation(crop, n) === "avoid"),
    matches: neighbours.filter((n) => relation(crop, n) === "good"),
    suggestions: available
      .map((c) => (typeof c === "string" ? c : c.name))
      .filter(
        (n) =>
          n !== crop &&
          !neighbours.includes(n) &&
          relation(crop, n) === "good" &&
          !neighbours.some((o) => relation(n, o) === "avoid"),
      )
      .map((name) => ({ name, matches: neighbours.filter((n) => relation(name, n) === "good") }))
      .sort((a, b) => b.matches.length - a.matches.length || a.name.localeCompare(b.name)),
  };
}
export function zoneGeometry(z, farmW = 100, farmH = 60, index = 0) {
  const area = Math.max(0.04, +z.areaM2 || 6);
  return {
    ...z,
    xM: z.xM ?? (z.x != null ? (z.x / 100) * farmW : 0.5),
    yM: z.yM ?? (z.y != null ? (z.y / 100) * farmH : 0.5 + index * 3),
    wM: Math.max(0.2, z.wM ?? (z.w != null ? (z.w / 100) * farmW : Math.sqrt(area * 1.5))),
    hM: Math.max(0.2, z.hM ?? (z.h != null ? (z.h / 100) * farmH : Math.sqrt(area / 1.5))),
  };
}
/**
 * Row direction of a planting on the map. Saved relative to the bed (`across` = perpendicular to the
 * bed's own row direction), so rotating a bed rotates its plantings with it.
 */
export function axisOf(zone, layout) {
  const base = zone?.rowAxis === "vertical" ? "vertical" : "horizontal";
  return layout?.across ? (base === "vertical" ? "horizontal" : "vertical") : base;
}
/** Footprint (bed-local metres) of a modern row planting: rows across `startM`, plants along from `alongStartM`. */
export function modernRect(zone, l) {
  const vertical = axisOf(zone, l) === "vertical",
    s = Number(l.spacingCM) / 100,
    g = Number(l.rowSpacingCM) / 100;
  const c0 = Number(l.startM) || 0,
    c1 = c0 + s + (Math.max(1, l.rowCount) - 1) * g;
  const a0 = Number(l.alongStartM) || 0,
    a1 = a0 + Number(l.lengthM);
  return vertical ? { x0: c0, x1: c1, y0: a0, y1: a1, vertical } : { x0: a0, x1: a1, y0: c0, y1: c1, vertical };
}
export function outsideZone(zone, r) {
  const e = 1e-6;
  return r.x0 < -e || r.y0 < -e || r.x1 > zone.wM + e || r.y1 > zone.hM + e;
}
export function bedLength(z) {
  return z.rowAxis === "vertical" ? z.hM : z.wM;
}
export function bedRows(z) {
  return Math.max(
    1,
    Math.min(
      100,
      Math.floor(+z.rowCount || Math.max(1, Math.floor((z.rowAxis === "vertical" ? z.wM : z.hM) / 0.6))),
    ),
  );
}
export function layoutPlots(zone, plots) {
  let cursor = 1;
  return plots
    .filter((p) => p.zone === zone.id && p.status !== "harvested")
    .map((p) => {
      const startRow = p.layout?.startRow || cursor,
        rowCount = Math.max(1, p.layout?.rowCount || 1);
      cursor = Math.max(cursor, startRow + rowCount);
      return {
        ...p,
        layout: {
          ...p.layout,
          pattern: p.layout?.pattern || p.plantingPattern || "rows",
          startRow,
          rowCount,
          lengthM: p.layout?.lengthM || bedLength(zone),
          plantCount: p.plantCount || 0,
        },
        inferred: !p.layout,
        outside:
          p.layout?.pattern === "scatter"
            ? (p.layout.points || []).some((q) => q.xM < 0 || q.yM < 0 || q.xM > zone.wM || q.yM > zone.hM)
            : p.layout?.version === 2
              ? outsideZone(zone, modernRect(zone, { ...p.layout, rowCount }))
              : startRow + rowCount - 1 > bedRows(zone) ||
                (p.layout?.lengthM || bedLength(zone)) > bedLength(zone),
      };
    });
}
export function freePlantingRows(zone, plots) {
  const occupied = layoutPlots(zone, plots),
    rows = bedRows(zone);
  let start = 1,
    best = { startRow: 1, rowCount: 0 };
  for (let row = 1; row <= rows + 1; row++) {
    const used =
      row > rows ||
      occupied.some((p) => row >= p.layout.startRow && row < p.layout.startRow + p.layout.rowCount);
    if (used) {
      if (row - start > best.rowCount) best = { startRow: start, rowCount: row - start };
      start = row + 1;
    }
  }
  return { ...best, lengthM: bedLength(zone) };
}
export function validatePlantingLayout(zone, plots, layout, count, spacingCM = 30, excludeId) {
  if (!zone) return "Choose a bed first.";
  const rows = bedRows(zone),
    start = +layout.startRow,
    num = +layout.rowCount,
    length = +layout.lengthM;
  if (!Number.isInteger(start) || !Number.isInteger(num) || start < 1 || num < 1 || start + num - 1 > rows)
    return `Choose rows within this bed’s ${rows} rows.`;
  if (layout.pattern === "offset" && num < 2) return "Choose at least two rows for an offset grid.";
  if (!(length > 0) || length > bedLength(zone))
    return `Row length must be between 0.1 and ${bedLength(zone)} m.`;
  if (!Number.isInteger(count) || count < 1) return "Enter a whole number of plants greater than zero.";
  if (
    layoutPlots(zone, plots).some(
      (p) =>
        p.id !== excludeId &&
        start < p.layout.startRow + p.layout.rowCount &&
        start + num > p.layout.startRow,
    )
  )
    return "These rows already have a crop. Choose free rows or edit the existing planting.";
  const spacing = Math.max(0.01, Number(spacingCM) || 30) / 100;
  const capacity =
    layout.pattern === "offset"
      ? Math.max(0, Math.floor((length - 2 * Math.min(0.1, bedLength(zone) * 0.05)) / spacing - 0.5)) * num
      : Math.max(1, Math.floor(length / spacing)) * num;
  if (layout.pattern === "offset") {
    const across = (zone.rowAxis === "vertical" ? zone.wM : zone.hM) / rows;
    const pitch = (length - 2 * Math.min(0.1, bedLength(zone) * 0.05)) / (Math.ceil(count / num) + 0.5);
    if ((num > 2 && across * 2 < spacing) || Math.hypot(across, pitch / 2) < spacing)
      return `These rows are too close for the database spacing of ${spacingCM} cm. Adjust the bed’s row count or use fewer plants.`;
  }
  if (count > capacity)
    return `This layout fits about ${capacity} plants at the database spacing of ${spacingCM} cm. Use more rows or fewer plants.`;
  return "";
}
export function animalZone(animal, zones) {
  if (animal.zone) return zones.find((z) => z.id === animal.zone);
  const type =
    animal.type === "Bee"
      ? "beehive"
      : POULTRY_SPECIES.has(animal.type) || animal.type === "Rabbit"
        ? "barn"
        : "pasture";
  return zones.find((z) => z.type === type);
}
