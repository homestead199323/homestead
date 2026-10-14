// Pure, import-free so lib/utils (markTaskDone) can use it without a circular import.
// Moves a nursery seedling batch to a stage; planting out also turns its linked bed planting live.
export const SEEDLING_STAGES = ["sown", "sprouted", "potted", "hardening", "planted"];

function toDate(key) {
  const [y, m, d] = String(key).split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDays(key, days) {
  const [y, m, d] = String(key).split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function applySeedlingStage(data, batchId, stage, dateKey) {
  const batches = data.nursery?.batches || [];
  const batch = batches.find((b) => b.id === batchId);
  if (!batch || !SEEDLING_STAGES.includes(stage)) return data;
  const order = SEEDLING_STAGES.indexOf(stage);
  const stageDates = { ...(batch.stageDates || {}) };
  // Reaching a stage implies the earlier ones happened; keep their real dates, fill gaps with today.
  SEEDLING_STAGES.slice(0, order + 1).forEach((s) => {
    if (!stageDates[s] && (s !== "potted" || batch.potOn)) stageDates[s] = dateKey;
  });
  // Sown on a different day than planned: move the plant-out date (and the reserved bed date) with it.
  let moved = {};
  if (stage === "sown" && batch.sowDate && batch.plantOutDate && dateKey !== batch.sowDate) {
    const shift = Math.round((toDate(dateKey) - toDate(batch.sowDate)) / 864e5);
    moved = { sowDate: dateKey, plantOutDate: addDays(batch.plantOutDate, shift) };
  }
  const next = {
    ...data,
    nursery: {
      ...(data.nursery || {}),
      batches: batches.map((b) => (b.id === batchId ? { ...b, ...moved, stage, stageDates } : b)),
    },
  };
  if (moved.plantOutDate && batch.plotId)
    next.garden = {
      ...data.garden,
      plots: (data.garden?.plots || []).map((p) =>
        p.id === batch.plotId && p.status === "planned" ? { ...p, plannedDate: moved.plantOutDate } : p,
      ),
    };
  if (stage === "planted" && batch.plotId) {
    next.garden = {
      ...data.garden,
      plots: (data.garden?.plots || []).map((p) =>
        p.id === batch.plotId && p.status !== "harvested"
          ? {
              ...p,
              status: "planted",
              plantDate: dateKey,
              harvestDate: p.growDays ? addDays(dateKey, p.growDays) : p.harvestDate,
            }
          : p,
      ),
    };
  }
  return next;
}

export function markBedPrepared(data, batchId) {
  const batches = data.nursery?.batches || [];
  if (!batches.some((b) => b.id === batchId)) return data;
  return {
    ...data,
    nursery: { ...data.nursery, batches: batches.map((b) => (b.id === batchId ? { ...b, bedPrepped: true } : b)) },
  };
}
