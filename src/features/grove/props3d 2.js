/* ═══════════════════════════════════════════
   PROPS 3D — every ornament on the map is rounded geometry in the toy palette (no
   cut-out artwork): bushes, flower beds, a pond, pots and planters, a hanging pot,
   a watering can, hay bales, a woodpile, a bench, rocks — plus the farm's detail
   props placed around the areas: wheelbarrow, rain barrel, produce crates, bird bath,
   mailbox, scarecrow and a small green tractor. Every function adds meshes to a
   group at world (x, z); the engine merges them per material afterwards.
   MARKER: GROVE_PROPS_3D_V1
   ═══════════════════════════════════════════ */
import * as THREE from "three";
import { PAL, flat, rbox, box, ball, tube, ring, disc, pill, cone, HPI } from "./toy";

const F = (c, o) => flat(c, o);
const srnd = (seed) => { const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
function at(g, x, z, ry = 0) { const h = new THREE.Group(); h.position.set(x, 0, z); h.rotation.y = ry; g.add(h); return h; }

export function bush(g, x, z, { seed = 1, s = 1 } = {}) {
  const h = at(g, x, z, srnd(seed) * 6.28), L = PAL.leaf;
  ball(h, [.56 * s, .5 * s, .56 * s], F(L[seed % 4]), 0, .42 * s, 0, { seg: 16, rings: 12 });
  ball(h, [.4 * s, .36 * s, .4 * s], F(L[(seed + 1) % 4]), .38 * s, .3 * s, .1 * s, { seg: 14, rings: 10 });
  ball(h, [.34 * s, .3 * s, .34 * s], F(L[(seed + 2) % 4]), -.3 * s, .26 * s, -.22 * s, { seg: 14, rings: 10 });
}
export function flowers(g, x, z, { seed = 1, s = 1 } = {}) {
  const h = at(g, x, z, srnd(seed) * 6.28);
  ball(h, [.5 * s, .17 * s, .42 * s], F(PAL.leafDark), 0, .1 * s, 0, { seg: 16, rings: 10 });
  for (let i = 0; i < 13; i++) {
    const a = srnd(seed * 3 + i) * 6.28, d = Math.sqrt(srnd(seed * 5 + i)) * .4 * s, px = Math.cos(a) * d, pz = Math.sin(a) * d * .85, hh = .22 * s + srnd(seed * 7 + i) * .14 * s;
    pill(h, [px, .05 * s, pz], [px, hh, pz], .012 * s, F(0x5f9a4a), { seg: 5, cap: 2, cast: false });
    ball(h, .055 * s, F(PAL.flower[i % PAL.flower.length]), px, hh + .02 * s, pz, { seg: 9, rings: 7 });
  }
}
export function pond(g, x, z, { seed = 1, s = 1 } = {}) {
  const h = at(g, x, z, srnd(seed) * 6.28), R = .95 * s;
  disc(h, R * 1.18, F(PAL.earth), 0, .006, 0, { seg: 32 });
  disc(h, R, F(PAL.water, { rough: .15, physical: true, env: 1.4 }), 0, .018, 0, { seg: 32 });
  ring(h, R + .05, .11, F(PAL.stone), 0, .06, 0, { tube: 10, seg: 32 });
  ring(h, R * .45, .012, F(PAL.ripple, { transparent: true, opacity: .55, depthWrite: false }), 0, .025, R * .15, { tube: 4, seg: 24, cast: false });
  [[-.3, .2], [.35, -.1]].forEach(([a, b], i) => { disc(h, .13 * s, F(PAL.leafDark), a * R, .03, b * R, { seg: 14 }); if (!i) ball(h, .05, F(PAL.flower[0]), a * R, .05, b * R, { seg: 8, rings: 6 }); });
  for (let i = 0; i < 4; i++) { const a = 1.2 + i * .35; pill(h, [Math.cos(a) * R * .9, .02, Math.sin(a) * R * .9], [Math.cos(a) * R * .92, .55 + i * .08, Math.sin(a) * R * .92], .018, F(0x6fa05a), { seg: 5, cap: 2 }); ball(h, [.03, .09, .03], F(0x8f6b4c), Math.cos(a) * R * .92, .6 + i * .08, Math.sin(a) * R * .92, { seg: 6, rings: 5 }); }
}
export function pot(g, x, z, { s = 1, addPlant = null, crop = "Basil", stage = 4 } = {}) {
  const h = at(g, x, z, 0), r = .24 * s, H = .38 * s;
  tube(h, r, r * .78, H, F(PAL.pot), 0, H / 2, 0, { seg: 20 });
  ring(h, r, .03 * s, F(PAL.potRim), 0, H, 0, { tube: 8, seg: 24 });
  disc(h, r * .9, F(PAL.soilDark), 0, H - .02, 0, { seg: 16 });
  addPlant && addPlant(crop, stage, x, z, H - .01, .42 * s);
}
export function planter(g, x, z, { seed = 1, addPlant = null } = {}) {
  const h = at(g, x, z, srnd(seed) < .5 ? 0 : HPI), w = 1.3, d = .5, H = .42;
  rbox(h, w, H, d, F(PAL.wood), 0, H / 2, 0, { r: .05 });
  box(h, w - .1, .02, d - .1, F(PAL.soilDark), 0, H - .03, 0, { cast: false });
  [[-.4, "Lettuce"], [0, "Basil"], [.4, "Strawberry"]].forEach(([u, c]) => addPlant && addPlant(c, 4, x + Math.cos(h.rotation.y) * u, z - Math.sin(h.rotation.y) * u, H - .02, .36));
}
export function hangpot(g, x, z, { seed = 1, addPlant = null } = {}) {
  const h = at(g, x, z, srnd(seed) * 6.28), W = F(PAL.woodDark);
  pill(h, [0, 0, 0], [0, 1.75, 0], .045, W, { seg: 8 });
  pill(h, [0, 1.7, 0], [.45, 1.7, 0], .03, W, { seg: 7 });
  pill(h, [.45, 1.7, 0], [.45, 1.42, 0], .006, F(PAL.metal), { seg: 4, cap: 1 });
  tube(h, .16, .12, .2, F(PAL.pot), .45, 1.32, 0, { seg: 16 });
  ring(h, .16, .02, F(PAL.potRim), .45, 1.42, 0, { tube: 6, seg: 18 });
  addPlant && addPlant("Strawberry", 5, x + Math.cos(h.rotation.y) * .45, z - Math.sin(h.rotation.y) * .45, 1.41, .36);
}
export function wateringcan(g, x, z, { seed = 1 } = {}) {
  const h = at(g, x, z, srnd(seed) * 6.28), G = F(PAL.green);
  tube(h, .13, .15, .3, G, 0, .15, 0, { seg: 18 });
  ring(h, .13, .02, G, 0, .3, 0, { tube: 6, seg: 18 });
  pill(h, [.1, .1, 0], [.36, .36, 0], .02, G, { seg: 7 });
  cone(h, .05, .06, F(PAL.greenLight), .38, .38, 0, { rz: -1.2, seg: 10 });
  ring(h, .11, .018, G, -.1, .32, 0, { rx: 0, rz: 0, tube: 6, seg: 14, arc: Math.PI });
}
export function haybale(g, x, z, { seed = 1, s = 1 } = {}) {
  const h = at(g, x, z, srnd(seed) * 6.28), r = .55 * s, L = .9 * s;
  tube(h, r, r, L, F(PAL.hay), 0, r, 0, { rx: HPI, seg: 24 });
  [-.28, .28].forEach((u) => ring(h, r + .01, .018, F(PAL.hayDark), 0, r, u * L, { rx: 0, tube: 5, seg: 28, cast: false }));
  disc(h, r * .55, F(PAL.hayDark), 0, r, L / 2 + .002, { rx: 0, seg: 20 }); disc(h, r * .55, F(PAL.hayDark), 0, r, -L / 2 - .002, { rx: Math.PI, seg: 20 });
}
export function woodpile(g, x, z, { seed = 1 } = {}) {
  const h = at(g, x, z, srnd(seed) * 6.28), W = F(PAL.woodDark), E = F(PAL.woodPale), r = .11;
  [[4, r], [3, r * 2.75], [2, r * 4.5]].forEach(([n, y]) => { for (let i = 0; i < n; i++) { const u = (i - (n - 1) / 2) * r * 2.1; tube(h, r, r, 1.0, W, u, y, 0, { rx: HPI, seg: 12 }); disc(h, r * .96, E, u, y, .502, { rx: 0, seg: 12 }); disc(h, r * .96, E, u, y, -.502, { rx: Math.PI, seg: 12 }); } });
  [-1, 1].forEach((k) => pill(h, [k * .55, 0, 0], [k * .55, .95, 0], .035, W, { seg: 7 }));
}
export function bench(g, x, z, { seed = 1 } = {}) {
  const h = at(g, x, z, srnd(seed) * 6.28), W = F(PAL.wood), D = F(PAL.woodDark);
  [-.1, .1].forEach((u) => rbox(h, 1.5, .06, .17, W, 0, .46, u, { r: .025 }));
  [-.6, .6].forEach((u) => { rbox(h, .09, .46, .4, D, u, .23, 0, { r: .03 }); rbox(h, .09, .5, .07, D, u, .72, -.2, { r: .03, rx: -.15 }); });
  rbox(h, 1.5, .09, .05, W, 0, .72, -.25, { r: .02, rx: -.15 }); rbox(h, 1.5, .09, .05, W, 0, .86, -.27, { r: .02, rx: -.15 });
}
export function rock(g, x, z, { seed = 1, s = 1 } = {}) {
  const h = at(g, x, z, srnd(seed) * 6.28);
  ball(h, [.48 * s, .3 * s, .38 * s], F(PAL.rock), 0, .2 * s, 0, { seg: 12, rings: 9, rz: .12 });
  ball(h, [.24 * s, .17 * s, .22 * s], F(PAL.rockDark), .4 * s, .1 * s, .14 * s, { seg: 10, rings: 7 });
}
/* ---------- detail props ---------- */
export function wheelbarrow(g, x, z, { ry = 0 } = {}) {
  const h = at(g, x, z, ry), G = F(PAL.green), D = F(PAL.ink), W = F(PAL.woodMid);
  rbox(h, .62, .32, .9, G, 0, .42, 0, { r: .08, rx: -.08 });
  box(h, .5, .02, .78, F(PAL.greenDeep), 0, .5, 0, { cast: false, rx: -.08 });
  ring(h, .2, .05, D, 0, .22, .55, { rx: 0, ry: HPI, tube: 8, seg: 20 }); disc(h, .16, F(PAL.zinc), .055, .22, .55, { rx: 0, ry: HPI, seg: 14 }); disc(h, .16, F(PAL.zinc), -.055, .22, .55, { rx: 0, ry: -HPI, seg: 14 });
  [-1, 1].forEach((k) => { pill(h, [k * .26, .3, -.1], [k * .28, .5, -.85], .03, W, { seg: 7 }); pill(h, [k * .22, .02, -.3], [k * .24, .3, -.25], .025, D, { seg: 6 }); });
  for (let i = 0; i < 5; i++) ball(h, .11, F(PAL.soilLight), (srnd(i * 3) - .5) * .32, .58, (srnd(i * 5) - .5) * .5, { seg: 8, rings: 6, cast: false });
}
export function barrel(g, x, z, { ry = 0 } = {}) {
  const h = at(g, x, z, ry), r = .36, H = .95;
  tube(h, r * .95, r * .95, H, F(PAL.woodMid), 0, H / 2, 0, { seg: 20 });
  [.18, .5, .82].forEach((t) => ring(h, r, .03, F(PAL.dark), 0, H * t, 0, { tube: 6, seg: 24, cast: false }));
  disc(h, r * .9, F(PAL.woodDark), 0, H + .005, 0, { seg: 20 });
  tube(h, .035, .035, .18, F(PAL.metal), 0, .18, r * .92, { rx: HPI, seg: 8 }); ball(h, .04, F(PAL.green), 0, .18, r * 1.02, { seg: 8, rings: 6 });
}
export function crates(g, x, z, { ry = 0, n = 3 } = {}) {
  const h = at(g, x, z, ry), W = F(PAL.woodPale), T = F(PAL.woodMid), produce = [PAL.terracotta, PAL.hayDark, 0xe3493a];
  const spots = [[0, .18, 0, 0], [.52, .18, .1, .3], [.1, .54, .04, -.2]];
  for (let i = 0; i < Math.min(n, 3); i++) { const [px, py, pz, r] = spots[i]; rbox(h, .5, .36, .36, W, px, py, pz, { r: .04, ry: r }); box(h, .44, .03, .3, T, px, py + .17, pz, { ry: r, cast: false }); for (let k = 0; k < 4; k++) ball(h, .06, F(produce[i % 3]), px + (srnd(i * 7 + k) - .5) * .3, py + .2, pz + (srnd(i * 11 + k) - .5) * .2, { seg: 8, rings: 6, cast: false }); }
}
export function birdbath(g, x, z) {
  const h = at(g, x, z, 0), S = F(PAL.stone);
  disc(h, .3, F(PAL.stoneDark), 0, .006, 0, { seg: 20 });
  tube(h, .09, .14, .62, S, 0, .31, 0, { seg: 14 });
  tube(h, .42, .3, .1, S, 0, .67, 0, { seg: 24 });
  disc(h, .37, F(PAL.water, { rough: .15, physical: true, env: 1.4 }), 0, .715, 0, { seg: 24 });
  ball(h, [.06, .05, .09], F(PAL.slate), .22, .76, .1, { seg: 8, rings: 6 }); ball(h, .035, F(PAL.slate), .28, .82, .14, { seg: 7, rings: 5 });
}
export function mailbox(g, x, z, { ry = 0 } = {}) {
  const h = at(g, x, z, ry);
  pill(h, [0, 0, 0], [0, 1.05, 0], .04, F(PAL.woodDark), { seg: 8 });
  rbox(h, .26, .22, .4, F(PAL.green), 0, 1.15, 0, { r: .09 });
  box(h, .2, .14, .012, F(PAL.greenDeep), 0, 1.13, .2, { cast: false });
  box(h, .03, .15, .05, F(PAL.glow), .15, 1.22, -.08, { cast: false });
}
export function scarecrow(g, x, z, { ry = 0 } = {}) {
  const h = at(g, x, z, ry), W = F(PAL.woodDark), S = F(PAL.straw);
  pill(h, [0, 0, 0], [0, 1.9, 0], .035, W, { seg: 7 });
  pill(h, [-.55, 1.45, 0], [.55, 1.45, 0], .03, W, { seg: 7 });
  rbox(h, .4, .62, .26, F(0x7fa1c9), 0, 1.25, 0, { r: .09 });
  [-1, 1].forEach((k) => { rbox(h, .4, .14, .14, F(0x7fa1c9), k * .35, 1.45, 0, { r: .05 }); ball(h, [.08, .06, .06], S, k * .58, 1.45, 0, { seg: 8, rings: 6 }); });
  ball(h, .16, S, 0, 1.78, 0, { seg: 14, rings: 10 });
  disc(h, .26, W, 0, 1.9, 0, { seg: 16, cast: true }); cone(h, .15, .2, W, 0, 1.99, 0, { seg: 14 });
  [-1, 1].forEach((k) => ball(h, .022, F(PAL.ink), k * .06, 1.8, .14, { seg: 6, rings: 4, cast: false }));
}
export function tractor(g, x, z, { ry = 0 } = {}) {
  const h = at(g, x, z, ry), G = F(PAL.green), Gd = F(PAL.greenDeep), I = F(PAL.ink), Z = F(PAL.zinc);
  rbox(h, 1.0, .5, 1.35, G, 0, .72, .5, { r: .1 });            // bonnet
  rbox(h, 1.25, .34, .9, G, 0, .62, -.45, { r: .08 });          // chassis under the seat
  rbox(h, .86, .1, .96, Gd, 0, .98, .55, { r: .04, cast: false }); // bonnet top line
  rbox(h, 1.05, .18, .12, I, 0, .62, 1.2, { r: .04 });          // grille
  tube(h, .035, .035, .55, Z, .36, 1.22, .55, { seg: 8 });       // exhaust
  rbox(h, .46, .1, .5, I, 0, .9, -.5, { r: .04 }); rbox(h, .46, .42, .1, I, 0, 1.14, -.75, { r: .04 }); // seat
  [[-.44, -.3], [.44, -.3], [-.44, .7], [.44, .7]].forEach(([px, pz]) => pill(h, [px, .9, pz], [px, 1.7, pz], .03, Z, { seg: 7 }));
  rbox(h, 1.1, .08, 1.25, Gd, 0, 1.72, .2, { r: .03 });         // roof
  rbox(h, .9, .55, .02, F(PAL.glass, { transparent: true, opacity: .45, rough: .2, physical: true, env: 1.3, depthWrite: false }), 0, 1.35, .72, { r: 0, cast: false });
  pill(h, [-.5, .95, -.25], [.5, .95, -.25], .03, Z, { seg: 7 }); ring(h, .2, .025, I, .3, 1.1, -.2, { rx: -.9, tube: 6, seg: 16 }); // axle + wheel
  const wheel = (px, pz, R, w) => { ring(h, R, w, I, px, R + .02, pz, { rx: 0, ry: HPI, tube: 10, seg: 24 }); disc(h, R * .8, Z, px + w * 1.02, R + .02, pz, { rx: 0, ry: HPI, seg: 16 }); disc(h, R * .8, Z, px - w * 1.02, R + .02, pz, { rx: 0, ry: -HPI, seg: 16 }); };
  wheel(-.62, -.45, .42, .16); wheel(.62, -.45, .42, .16); wheel(-.52, .75, .26, .12); wheel(.52, .75, .26, .12);
  [-.3, .3].forEach((px) => ball(h, .06, F(PAL.glow), px, .78, 1.27, { seg: 8, rings: 6, cast: false }));
}
export const ORNAMENTS = { bush, flowers, pond, pot, planter, hangpot, wateringcan, haybale, woodpile, bench, rock };
