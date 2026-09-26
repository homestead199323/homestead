// Drawing your own paths and fences on the farm map.
// A drawn line is stored in data.mapLines as {id, kind: "path" | "fence" | "gate", points: [{xM, yM}]}.
// Automatic access paths (aerial-layout accessPaths) join onto drawn paths.

const ALIGN_DEG = 12; // within this angle of level/plumb, a segment is straightened
const JOIN_M = 0.6; // this close to an existing corner, snap onto it so paths connect

const r1 = (n) => Math.round(n * 10) / 10;

/**
 * Where a tap lands.
 * Free (no grid): clamped to the farm, joined onto nearby existing corners, and straightened to
 * horizontal/vertical when it is nearly level with the previous point.
 * Snap (opts.grid in metres): lands on the grid and every segment is horizontal or vertical.
 */
export function snapPoint(prev, q, farmW, farmH, anchors = [], opts = {}) {
  const grid = Number(opts.grid) || 0;
  let p = { xM: Math.max(0, Math.min(farmW, q.xM)), yM: Math.max(0, Math.min(farmH, q.yM)) };
  let best = null,
    bestD = Math.max(JOIN_M, grid / 2);
  anchors.forEach((a) => {
    const d = Math.hypot(a.xM - p.xM, a.yM - p.yM);
    if (d < bestD) {
      best = a;
      bestD = d;
    }
  });
  if (best) return { xM: best.xM, yM: best.yM };
  if (grid > 0) {
    p = { xM: snapTo(p.xM, grid, farmW), yM: snapTo(p.yM, grid, farmH) };
    if (prev) {
      if (Math.abs(p.xM - prev.xM) >= Math.abs(p.yM - prev.yM)) p.yM = prev.yM;
      else p.xM = prev.xM;
    }
    return p;
  }
  if (prev) {
    const dx = p.xM - prev.xM,
      dy = p.yM - prev.yM;
    const angle = (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI;
    if (angle < ALIGN_DEG) p = { ...p, yM: prev.yM };
    else if (angle > 90 - ALIGN_DEG) p = { ...p, xM: prev.xM };
  }
  return { xM: r1(p.xM), yM: r1(p.yM) };
}

/** Round to the grid, staying inside 0…max. */
export function snapTo(v, grid, max = Infinity) {
  if (!(grid > 0)) return r1(v);
  return Math.round(Math.max(0, Math.min(max, Math.round(v / grid) * grid)) * 1000) / 1000;
}

/** A sensible default grid for the farm size. */
export function defaultGrid(farmW, farmH) {
  const m = Math.max(farmW || 0, farmH || 0);
  return m >= 200 ? 5 : m >= 60 ? 1 : m >= 15 ? 0.5 : 0.25;
}

/**
 * Snap a dragged zone. Moving: its edges land on the grid or line up with a neighbour's edge,
 * whichever is closer. Resizing: the right/bottom edge does the same; size never below one grid step.
 */
export function snapZone(g, others, grid, farmW, farmH, resize = false) {
  if (!(grid > 0)) return g;
  const tol = grid / 2;
  const xs = [0, farmW, ...others.flatMap((o) => [o.xM, o.xM + o.wM])];
  const ys = [0, farmH, ...others.flatMap((o) => [o.yM, o.yM + o.hM])];
  const nearest = (v, lines) => {
    let bestV = Math.round(v / grid) * grid,
      bestD = Math.abs(bestV - v);
    lines.forEach((l) => {
      const d = Math.abs(l - v);
      if (d < tol && d < bestD) {
        bestV = l;
        bestD = d;
      }
    });
    return bestV;
  };
  const r = (n) => Math.round(n * 1000) / 1000;
  if (resize) {
    const right = nearest(g.xM + g.wM, xs),
      bottom = nearest(g.yM + g.hM, ys);
    return { ...g, wM: r(Math.max(grid, right - g.xM)), hM: r(Math.max(grid, bottom - g.yM)) };
  }
  // Move: try aligning the left edge or the right edge, keep whichever needs the smaller shift.
  const pick = (start, size, lines) => {
    const a = nearest(start, lines),
      b = nearest(start + size, lines) - size;
    return Math.abs(a - start) <= Math.abs(b - start) ? a : b;
  };
  return { ...g, xM: r(pick(g.xM, g.wM, xs)), yM: r(pick(g.yM, g.hM, ys)) };
}

export function lineLength(points) {
  return (points || []).slice(1).reduce((s, p, i) => s + Math.hypot(p.xM - points[i].xM, p.yM - points[i].yM), 0);
}

/** Corners of every drawn line, for joining new paths onto them. */
export function lineAnchors(lines) {
  return (lines || []).flatMap((l) => l.points || []);
}

/** Add a tapped point to a draft. Tapping the last point again means "finish". */
export function addDraftPoint(draft, q, farmW, farmH, lines, opts = {}) {
  const pts = draft.points;
  const last = pts[pts.length - 1];
  if (last && pts.length >= 2 && Math.hypot(q.xM - last.xM, q.yM - last.yM) < 0.4) return { ...draft, finish: true };
  const p = snapPoint(last, q, farmW, farmH, lineAnchors(lines), opts);
  if (last && p.xM === last.xM && p.yM === last.yM) return draft;
  return { ...draft, points: [...pts, p] };
}
