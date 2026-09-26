import { propagationOf } from "../../data/propagation.js";
import { SEEDLING_STAGES } from "../../lib/seedling-stage.js";
import { addDaysToLocalKey, localDateFromKey } from "../../lib/utils.js";

export const STAGE_LABELS = {
  sown: "Sown",
  sprouted: "Sprouted",
  potted: "Potted on",
  hardening: "Hardening off",
  planted: "Planted out",
};
/** Extra seeds sown to cover germination and seedling losses. */
export const SOW_EXTRA = 0.2;

export const activeBatches = (data) => (data.nursery?.batches || []).filter((b) => b.stage !== "planted");
export const nurseryZones = (data) => (data.zones || []).filter((z) => z.type === "nursery");

/** Stages this batch goes through (potting on only for crops that need it). */
export function stagesOf(batch) {
  return SEEDLING_STAGES.filter((s) => s !== "potted" || batch.potOn);
}

/** Planned or actual date for every stage. Actual dates shift the ones that follow. */
export function scheduleOf(batch) {
  const d = batch.stageDates || {};
  const sown = d.sown || batch.sowDate;
  const sprouted = d.sprouted || addDaysToLocalKey(sown, batch.germDays || 7);
  const potted = batch.potOn ? d.potted || addDaysToLocalKey(sprouted, 14) : null;
  const hardening = d.hardening || addDaysToLocalKey(batch.plantOutDate, -7);
  const planted = d.planted || batch.plantOutDate;
  return { sown, sprouted, potted, hardening, planted };
}

export function nextStage(batch) {
  const stages = stagesOf(batch),
    at = batch.stage ? stages.indexOf(batch.stage) : -1;
  return stages[at + 1] || null;
}

const days = (from, to) => Math.round((localDateFromKey(to) - localDateFromKey(from)) / 864e5);

/**
 * Plan a seedling batch. Counts back from the planting-out date using the crop's weeks in the
 * nursery, and sows ~20% extra. Returns { batch, warning } — warning when the sow date is past.
 */
export function planBatch({
  crop,
  variety = "",
  zoneId,
  plants,
  plantOutDate,
  plotId = null,
  targetZoneId = null,
  id,
  today,
}) {
  const prop = propagationOf(crop);
  const weeks = prop.weeks || 4;
  const sowDate = addDaysToLocalKey(plantOutDate, -weeks * 7);
  const cells = Math.max(1, Math.ceil(Number(plants) * (1 + SOW_EXTRA)));
  const late = today && sowDate < today ? days(sowDate, today) : 0;
  return {
    batch: {
      id,
      crop: crop.name,
      variety,
      zoneId,
      plotId,
      targetZoneId,
      plants: Number(plants),
      cells,
      sowDate: late ? today : sowDate,
      plantOutDate,
      germDays: prop.germDays || 7,
      potOn: !!prop.potOn,
      weeks,
      stage: null,
      stageDates: {},
      createdAt: today,
    },
    warning: late
      ? `The ideal sowing date was ${late} day${late === 1 ? "" : "s"} ago. Sow today — seedlings may be smaller at planting out, or plant out a little later.`
      : "",
  };
}

const TEXT = {
  sown: (b) => [
    `Sow ${b.crop} seeds`,
    `${b.cells} cells. Press seeds in lightly, label the tray, water from below.`,
  ],
  sprouted: (b) => [
    `Check ${b.crop} for sprouts`,
    "Tick when most cells have seedlings. Move them into full light straight away.",
  ],
  potted: (b) => [
    `Pot on ${b.crop} seedlings`,
    "Move the strongest into bigger cells once the first true leaves show. Hold them by a leaf, not the stem.",
  ],
  hardening: (b) => [
    `Start hardening off ${b.crop}`,
    "Put the tray outside a few hours a day, longer each day, for about a week. Bring in if frost is forecast.",
  ],
  planted: (b, bed) => [
    `Plant out ${b.crop}${bed ? ` into ${bed}` : ""}`,
    "Water the tray first. Plant at the grid spacing and water in well.",
  ],
};

/** Today's and upcoming nursery tasks, shaped like the rest of the task queue. */
export function nurseryTasks(data, todayKey) {
  const zones = new Map((data.zones || []).map((z) => [z.id, z]));
  const tasks = [],
    busy = new Set();
  activeBatches(data).forEach((b) => {
    const nursery = zones.get(b.zoneId),
      loc = nursery?.name || "Nursery";
    const bed = zones.get(b.targetZoneId)?.name;
    if (b.stage) busy.add(b.zoneId);
    const next = nextStage(b);
    if (next) {
      const due = scheduleOf(b)[next],
        out = days(todayKey, due);
      if (out <= 3) {
        const [title, desc] = TEXT[next](b, bed);
        tasks.push({
          key: `seed-${b.id}-${next}`,
          pri: out <= 0 ? 1 : 3,
          type: out <= 0 ? "seedling" : "upcoming",
          emoji: "🌱",
          cropName: b.crop,
          title,
          desc,
          loc,
          zoneId: b.zoneId,
          batchId: b.id,
          daysOut: Math.max(0, out),
        });
      }
    }
    const prep = days(todayKey, b.plantOutDate);
    if (b.plotId && !b.bedPrepped && prep <= 7 && prep >= -3)
      tasks.push({
        key: `seed-${b.id}-bedprep`,
        pri: 2,
        type: "seedling",
        emoji: "🪏",
        cropName: b.crop,
        title: `Prepare ${bed || "the bed"} for ${b.crop}`,
        desc: "Loosen the soil, add compost and rake level before planting out.",
        loc: bed || loc,
        zoneId: b.targetZoneId || b.zoneId,
        batchId: b.id,
        daysOut: 0,
      });
  });
  busy.forEach((zoneId) =>
    tasks.push({
      key: `nursery-${zoneId}-check`,
      pri: 2,
      type: "water",
      emoji: "💧",
      title: `Check seedlings in ${zones.get(zoneId)?.name || "the nursery"}`,
      desc: "Water from below when the surface is dry. Look for damping off (seedlings collapsing at soil level).",
      loc: zones.get(zoneId)?.name || "Nursery",
      zoneId,
      daysOut: 0,
      routine: true,
    }),
  );
  return tasks;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Month numbers (0–11) in a crop's sowing window, e.g. "Feb-Apr, Sep" or "Nov-Feb". */
export function sowMonths(sowIn = "") {
  const out = new Set();
  String(sowIn)
    .split(",")
    .forEach((part) => {
      const [a, b] = part.split("-").map((s) => MONTHS.indexOf(s.trim().slice(0, 3)));
      if (a < 0) return;
      const end = b >= 0 ? b : a;
      for (let m = a; ; m = (m + 1) % 12) {
        out.add(m);
        if (m === end) break;
      }
    });
  return out;
}
/**
 * Default dates for raising a crop from seed: sow today if we're in its sowing window, otherwise on
 * the 1st of the next window month; plant out after its weeks in the nursery.
 */
export function suggestDates(crop, today) {
  const months = sowMonths(crop?.sowIn),
    weeks = propagationOf(crop).weeks || 4;
  let sow = today;
  if (months.size && !months.has(localDateFromKey(today).getMonth())) {
    const d = localDateFromKey(today);
    for (let i = 1; i <= 12; i++) {
      const m = new Date(d.getFullYear(), d.getMonth() + i, 1);
      if (months.has(m.getMonth())) {
        sow = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}-01`;
        break;
      }
    }
  }
  return { sowDate: sow, plantOutDate: addDaysToLocalKey(sow, weeks * 7) };
}
/** Warning text when a sow date falls outside the crop's usual sowing window, else "". */
export function seasonNote(crop, sowDate) {
  const months = sowMonths(crop?.sowIn);
  if (!months.size || !sowDate || months.has(localDateFromKey(sowDate).getMonth())) return "";
  return `That means sowing outside the usual window for ${crop.name} (${crop.sowIn}). Fine under cover with heat and light; otherwise pick a later date.`;
}
