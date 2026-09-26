// Drawing your own paths and fences on the farm map.
// A drawn line is stored in data.mapLines as {id, kind: "path" | "fence" | "gate", points: [{xM, yM}]}.
// Automatic access paths (aerial-layout accessPaths) join onto drawn paths.

const ALIGN_DEG = 12; // within this angle of level/plumb, a segment is straightened
const JOIN_M = 0.6; // this close to an existing corner, snap onto it so paths connect

const r1 = (n) => Math.round(n * 10) / 10;

/**
 * Where a tap lands: clamped to the farm, snapped onto nearby existing corners, and straightened
 * to horizontal/vertical when it is nearly level with the previous point.
 */
export function snapPoint(prev, q, farmW, farmH, anchors = []) {
  let p = { xM: Math.max(0, Math.min(farmW, q.xM)), yM: Math.max(0, Math.min(farmH, q.yM)) };
  let best = null,
    bestD = JOIN_M;
  anchors.forEach((a) => {
    const d = Math.hypot(a.xM - p.xM, a.yM - p.yM);
    if (d < bestD) {
      best = a;
      bestD = d;
    }
  });
  if (best) return { xM: best.xM, yM: best.yM };
  if (prev) {
    const dx = p.xM - prev.xM,
      dy = p.yM - prev.yM;
    const angle = (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI;
    if (angle < ALIGN_DEG) p = { ...p, yM: prev.yM };
    else if (angle > 90 - ALIGN_DEG) p = { ...p, xM: prev.xM };
  }
  return { xM: r1(p.xM), yM: r1(p.yM) };
}

export function lineLength(points) {
  return (points || []).slice(1).reduce((s, p, i) => s + Math.hypot(p.xM - points[i].xM, p.yM - points[i].yM), 0);
}

/** Corners of every drawn line, for joining new paths onto them. */
export function lineAnchors(lines) {
  return (lines || []).flatMap((l) => l.points || []);
}

/** Add a tapped point to a draft. Tapping the last point again means "finish". */
export function addDraftPoint(draft, q, farmW, farmH, lines) {
  const pts = draft.points;
  const last = pts[pts.length - 1];
  if (last && pts.length >= 2 && Math.hypot(q.xM - last.xM, q.yM - last.yM) < 0.4) return { ...draft, finish: true };
  const p = snapPoint(last, q, farmW, farmH, lineAnchors(lines));
  if (last && p.xM === last.xM && p.yM === last.yM) return draft;
  return { ...draft, points: [...pts, p] };
}
