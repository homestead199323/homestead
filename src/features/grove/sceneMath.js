/* ═══════════════════════════════════════════
   GROVE SCENE MATH — isometric projection
   Phase 11.2. Meters → screen units (y-down).
   iso(x,y) = ((x−y)·k, (x+y)·k/2). One projector
   per farm, fitted into a fixed-width viewBox.
   MARKER: GROVE_SCENE_MATH_V1
   ═══════════════════════════════════════════ */

const K = 10; // base scale before fitting (arbitrary; fit normalizes)

function rawIso(xM, yM) {
  return { x: (xM - yM) * K, y: (xM + yM) * K * 0.5 };
}

/* Build a projector for a farm of fW×fH meters into a viewBox of
   width vbW. Height derives from the projected bounding box + padding.
   Returns:
     p(xM, yM, elev=0) → [sx, sy]  (elev in viewBox units, lifts up)
     unit  — viewBox units per meter along an iso axis (for sizing)
     vbW/vbH — viewBox dimensions
*/
export function makeProjector(fW, fH, vbW = 1000, pad = 56) {
  const corners = [rawIso(0, 0), rawIso(fW, 0), rawIso(fW, fH), rawIso(0, fH)];
  const minX = Math.min(...corners.map(c => c.x));
  const maxX = Math.max(...corners.map(c => c.x));
  const minY = Math.min(...corners.map(c => c.y));
  const maxY = Math.max(...corners.map(c => c.y));
  const scale = (vbW - pad * 2) / (maxX - minX || 1);
  let vbH = (maxY - minY) * scale + pad * 2;
  // squat farms: enforce a minimum height ratio so the scene keeps hero presence
  let yOff = pad;
  const minH = vbW * 0.72;
  if (vbH < minH) { yOff += (minH - vbH) / 2; vbH = minH; }
  function p(xM, yM, elev = 0) {
    const r = rawIso(xM, yM);
    return [(r.x - minX) * scale + pad, (r.y - minY) * scale + yOff - elev];
  }
  // unit: projected length of 1m along the x iso axis
  const a = p(0, 0); const b = p(1, 0);
  const unit = Math.hypot(b[0] - a[0], b[1] - a[1]);

  /* Inverse projection (elev=0): viewBox coords → meters.
     sx = ((x−y)K − minX)·scale + pad ; sy = ((x+y)K/2 − minY)·scale + pad */
  function invert(sx, sy) {
    const rx = (sx - pad) / scale + minX;
    const ry = (sy - yOff) / scale + minY;
    const A = rx / K;          // x − y
    const B = (2 * ry) / K;    // x + y
    return { xM: (A + B) / 2, yM: (B - A) / 2 };
  }
  /* Delta-only inverse: screen-space delta (viewBox units) → meter delta */
  function invertDelta(dsx, dsy) {
    const A = dsx / scale / K;
    const B = (2 * (dsy / scale)) / K;
    return { dxM: (A + B) / 2, dyM: (B - A) / 2 };
  }
  return { p, invert, invertDelta, unit, vbW, vbH: Math.round(vbH) };
}

export function polyPoints(pts) {
  return pts.map(pt => pt[0].toFixed(1) + "," + pt[1].toFixed(1)).join(" ");
}

/* Painter's order: back-to-front by the zone's front corner depth */
export function depthOf(z) {
  return (z.xM || 0) + (z.wM || 10) + (z.yM || 0) + (z.hM || 8);
}
