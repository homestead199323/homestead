/* ═══════════════════════════════════════════
   walk-stops.js — pure helpers for the map-guided walk.

   Takes the task-queue output and the current data object, returns an
   ordered list of map "stops". Each stop represents one physical location
   on the farm and carries one or more tasks to perform there.

   Stop shape:
     {
       stopKey:   string  — unique id (zone-XXX | anim-zone-XXX | anim-auto-XXX)
       label:     string  — visible name ("Vegetable Bed", "Sheep · Pasture")
       cx, cy:    number  — center position as percent of farm width/height
       zoneId:    string? — when the stop is bound to a real zone (for highlight)
       kind:      "plot" | "animal-zone" | "animal-virtual" | "misc"
       icon:      string? — fallback emoji for virtual stops
       speciesType: string? — animal species when applicable
       tasks:     Task[]  — at least one task, in task-queue insertion order
     }

   Order:
     The walk visits EVERY today task, ordered purely by where it sits on
     the farm — not by urgency or priority. We do one greedy nearest-
     neighbour pass starting from the gate (0, 50, the left edge), so the
     route reflects "walk into the farm and visit each section in turn".

   Filter parity with task-queue:
     We MUST mirror buildTaskQueue's step-task semantics — step completion
     is tracked via plot.steps[i].done (persistent), NOT the daily
     completions map. If we filtered steps by completions here we'd hide
     a step the moment the user clicks Done in the walk, even though
     TaskQueue still shows it. (That mismatch was the original "Nothing
     for today" bug.)
   ═══════════════════════════════════════════ */

const AUTO_PLACE = {
  Chicken: { cx: 88, cy: 12, icon: "🐔" },
  Duck:    { cx: 88, cy: 22, icon: "🦆" },
  Goose:   { cx: 88, cy: 32, icon: "🪿" },
  Turkey:  { cx: 88, cy: 17, icon: "🦃" },
  Quail:   { cx: 88, cy: 27, icon: "🐦" },
  Sheep:   { cx: 90, cy: 72, icon: "🐑" },
  Goat:    { cx: 90, cy: 82, icon: "🐐" },
  Cow:     { cx: 90, cy: 92, icon: "🐄" },
  Pig:     { cx: 78, cy: 88, icon: "🐖" },
  Llama:   { cx: 80, cy: 75, icon: "🦙" },
  Alpaca:  { cx: 80, cy: 82, icon: "🦙" },
  Donkey:  { cx: 76, cy: 78, icon: "🫏" },
  Bee:     { cx: 12, cy: 88, icon: "🐝" },
  Rabbit:  { cx: 22, cy: 92, icon: "🐇" },
};
const DEFAULT_AUTO_PLACE = { cx: 92, cy: 50, icon: "🐾" };

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + dd;
}

export function buildWalkStops(tasks, data) {
  if (!tasks || tasks.length === 0) return [];
  const tKey = todayKey();
  const doneToday = new Set((data.completions && data.completions[tKey]) || []);

  // Same filter as buildTaskQueue: include every today-due actionable task,
  // skip the info-only upcoming/forecast, and only filter completed keys
  // for NON-step tasks (step completion is tracked persistently on the plot).
  const todayTasks = tasks.filter(function(t) {
    if (t.daysOut !== 0) return false;
    if (t.type === "upcoming" || t.type === "forecast") return false;
    if (t.type !== "step" && t.key && doneToday.has(t.key)) return false;
    return true;
  });
  if (todayTasks.length === 0) return [];

  const plotById = new Map((data.garden && data.garden.plots ? data.garden.plots : []).map(function(p) { return [p.id, p]; }));
  const zoneById = new Map((data.zones || []).map(function(z) { return [z.id, z]; }));
  const zoneByName = new Map((data.zones || []).map(function(z) { return [z.name, z]; }));
  const animals = (data.livestock && data.livestock.animals) || [];
  const animalById = new Map(animals.map(function(a) { return [a.id, a]; }));

  const farmW = data.farmW || 100;
  const farmH = data.farmH || 60;

  function zoneCenter(z) {
    const cx = ((z.xM || 0) + (z.wM || 10) / 2) / farmW * 100;
    const cy = ((z.yM || 0) + (z.hM || 8) / 2) / farmH * 100;
    return { cx: Math.max(2, Math.min(98, cx)), cy: Math.max(4, Math.min(96, cy)) };
  }

  function stopMetaForTask(task) {
    if (task.plotId) {
      const plot = plotById.get(task.plotId);
      if (plot) {
        const zone = zoneById.get(plot.zone);
        if (zone) {
          const c = zoneCenter(zone);
          return {
            stopKey: "zone-" + zone.id,
            label: zone.name,
            cx: c.cx, cy: c.cy,
            zoneId: zone.id,
            kind: "plot",
          };
        }
      }
      return { stopKey: "orphan-plot", label: "Farm", cx: 50, cy: 50, kind: "misc" };
    }
    if (task.speciesType || task.animalId) {
      let species = task.speciesType;
      if (!species && task.animalId) {
        const a = animalById.get(task.animalId);
        if (a) species = a.type;
      }
      if (!species) {
        return { stopKey: "anim-misc", label: "Animals", cx: 92, cy: 50, kind: "animal-virtual", icon: "🐾" };
      }
      const zoneByLoc = zoneByName.get(task.loc);
      if (zoneByLoc) {
        const c = zoneCenter(zoneByLoc);
        return {
          stopKey: "anim-zone-" + species,
          label: zoneByLoc.name + " · " + species,
          cx: c.cx, cy: c.cy,
          zoneId: zoneByLoc.id,
          kind: "animal-zone",
          speciesType: species,
        };
      }
      const pl = AUTO_PLACE[species] || DEFAULT_AUTO_PLACE;
      return {
        stopKey: "anim-auto-" + species,
        label: species,
        cx: pl.cx, cy: pl.cy,
        kind: "animal-virtual",
        speciesType: species,
        icon: pl.icon,
      };
    }
    return { stopKey: "misc", label: task.loc || "Farm", cx: 50, cy: 50, kind: "misc" };
  }

  // Group tasks by physical stop. Insertion order within each stop is
  // task-queue order (already pri-sorted) — we deliberately do NOT re-sort
  // by urgency, because the walk's design is "visit by location, do whatever
  // needs doing there".
  const stopMap = new Map();
  todayTasks.forEach(function(task) {
    const meta = stopMetaForTask(task);
    if (!stopMap.has(meta.stopKey)) {
      stopMap.set(meta.stopKey, Object.assign({}, meta, { tasks: [] }));
    }
    stopMap.get(meta.stopKey).tasks.push(task);
  });

  // Single geographic order: greedy nearest-neighbour from the gate.
  // No attention-vs-routine split — every today task is visited in the
  // order it sits on the map.
  const all = Array.from(stopMap.values());

  function nearestNeighbour(stops, startX, startY) {
    if (stops.length === 0) return [];
    const remaining = stops.slice();
    const out = [];
    let cx = startX, cy = startY;
    while (remaining.length > 0) {
      let bestIdx = 0, bestD = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const dx = remaining[i].cx - cx;
        const dy = remaining[i].cy - cy;
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; bestIdx = i; }
      }
      const next = remaining.splice(bestIdx, 1)[0];
      out.push(next);
      cx = next.cx; cy = next.cy;
    }
    return out;
  }

  return nearestNeighbour(all, 0, 50);
}

/**
 * Build the full path the walker traces, including a gate start point.
 * Returns an array of {x, y} points in percent.
 */
export function buildWalkPath(stops) {
  const path = [{ x: 0, y: 50 }];
  stops.forEach(function(s) { path.push({ x: s.cx, y: s.cy }); });
  return path;
}
