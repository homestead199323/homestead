/* Zone-name pills on the 3D map: who gets a label and where it sits.

   Each item is one zone already projected to the screen: (x, y) is the midpoint
   of the zone's front edge (the footprint edge nearest the viewer), the pill
   hangs above that point. Placement order is selected → has pending jobs →
   biggest footprint; a placed pill rejects any later pill that would overlap
   it, so names never pile up. Far out on phones a zone must be at least 64 px
   wide on screen to earn a name (28 px otherwise), unless it is selected or
   has jobs. Pure: no DOM, no three.js. */

export const LABEL = { minPx: 28, minPxFarMobile: 64, pad: 3, edge: 4 };

/** items: [{ id, x, y, w, h, badge, px, area, sel, jobs, on }]; opts: { W, H, far, mobile }.
    Returns one { id, x, y, show } per item, in the input order; x/y are the clamped anchor. */
export function placeLabels(items, { W, H, far = false, mobile = false }) {
  const minPx = far && mobile ? LABEL.minPxFarMobile : LABEL.minPx;
  const order = items.map((it, i) => ({ it, i })).sort((u, v) => (v.it.sel - u.it.sel) || ((v.it.jobs ? 1 : 0) - (u.it.jobs ? 1 : 0)) || (v.it.area - u.it.area));
  const placed = [], out = new Array(items.length);
  for (const { it, i } of order) {
    const { w, h, badge = 0 } = it;
    const inside = it.x > 0 && it.x < W && it.y > 0 && it.y < H && (it.sel || it.jobs || it.px >= minPx);
    const x = clamp(it.x, w / 2 + LABEL.edge, W - w / 2 - badge - LABEL.edge), y = clamp(it.y, h + badge * .4 + LABEL.edge, H - LABEL.edge);
    const box = { x0: x - w / 2 - LABEL.pad, x1: x + w / 2 + LABEL.pad + badge, y0: y - h - badge * .4, y1: y };
    const free = it.sel || !placed.some((q) => box.x0 < q.x1 && box.x1 > q.x0 && box.y0 < q.y1 && box.y1 > q.y0);
    const show = !!(it.on && inside && free);
    if (show) placed.push(box);
    out[i] = { id: it.id, x, y, show };
  }
  return out;
}

const clamp = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
