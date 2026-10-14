/* ═══════════════════════════════════════════
   GROVE SCENE MATH — top-down projection
   Phase 12. Meters → screen units (y-down).
   Flat bird's-eye camera (reference-art style);
   replaced the Phase 11 isometric projector.
   Same API: p / invert / invertDelta / unit / vbW / vbH.
   `pad` reserves a world band around the farm for
   the tree border + gate. elev lifts overlay items
   straight up (markers, tags) — no perspective.
   MARKER: GROVE_SCENE_MATH_V2_TOPDOWN
   ═══════════════════════════════════════════ */

export function makeProjector(fW, fH, vbW = 1000, pad = 46) {
  const scale = (vbW - pad * 2) / (fW || 1);
  let vbH = (fH || 1) * scale + pad * 2;
  let yOff = pad;
  // squat farms: enforce a minimum height ratio so the scene keeps hero presence
  const minH = vbW * 0.6;
  if (vbH < minH) { yOff += (minH - vbH) / 2; vbH = minH; }
  function p(xM, yM, elev = 0) {
    return [xM * scale + pad, yM * scale + yOff - elev];
  }
  function invert(sx, sy) {
    return { xM: (sx - pad) / scale, yM: (sy - yOff) / scale };
  }
  function invertDelta(dsx, dsy) {
    return { dxM: dsx / scale, dyM: dsy / scale };
  }
  return { p, invert, invertDelta, unit: scale, vbW, vbH: Math.round(vbH), pad, yOff };
}

export function polyPoints(pts) {
  return pts.map(pt => pt[0].toFixed(1) + "," + pt[1].toFixed(1)).join(" ");
}

/* Stable paint order: top-left → bottom-right (ties broken by id) */
export function depthOf(z) {
  return (z.yM || 0) * 1000 + (z.xM || 0);
}

/* Deterministic pseudo-random in [0,1) from an integer seed */
export function srand(i) {
  const t = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return t - Math.floor(t);
}
