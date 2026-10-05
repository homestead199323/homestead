/* ═══════════════════════════════════════════
   TOY KIT — the shared vocabulary of the rounded "toy farm" look of the 3D map.
   Every box is a rounded box, every post a capsule, every rim a torus; every
   surface is one flat matte colour from the palette below (no textures); the
   whole scene is lit bright and soft. The style rules live in docs/MAP_STYLE.md.
   MARKER: GROVE_TOY_KIT_V1
   ═══════════════════════════════════════════ */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export const HPI = Math.PI / 2;
export const UP = new THREE.Vector3(0, 1, 0);

/* ---------- palette (app-cohesive: cream page, pale sage ground, brand green as the one accent) ---------- */
export const PAL = {
  page: 0xeef3ec,                                   // canvas background and fog: the scene fades into the page
  meadow: 0xc4dfab, meadowB: 0xb3d297, meadowDry: 0xd6dfb0,
  lawn: 0xbddba1, pasture: 0xc0dda4, orchard: 0xb8d69c,
  path: 0xf2eee6, pathEdge: 0xe5e0d5, gravel: 0xe9e4d8, stonePath: 0xe2ded5, soilPath: 0xdccbb3,
  soil: 0x9e7a5e, soilDark: 0x8a684e, soilLight: 0xb39277, mulch: 0x8a6850, earth: 0xc8b291, floor: 0x9f8a73,
  wood: 0xddbf95, woodMid: 0xc7a277, woodDark: 0x8f6b4c, woodPale: 0xeadbc0,
  cream: 0xf8f3e9, white: 0xfdfcf9, trim: 0xffffff, panel: 0xf1ede4,
  terracotta: 0xde9072, slate: 0x7c8896, slateDark: 0x66727f, zinc: 0xd1d7d9, metal: 0xaab3b9, dark: 0x3b3f44, ink: 0x2a2d31,
  barn: 0xd5725f, barnDark: 0xbd5f4e,
  green: 0x128147, greenLight: 0x1fa35c, greenPale: 0xe7f3ec, greenDeep: 0x0c5e33,
  leaf: [0x7fc57d, 0x6fb873, 0x93d089, 0x64ac6c], leafOlive: 0xabbd96, leafCitrus: 0x4f9f61, leafDark: 0x5a9e64, hedge: 0x72b677,
  water: 0x8fd1e3, waterDeep: 0x78c0d7, ripple: 0xe6f6fb,
  glass: 0xdaf2ef,
  hay: 0xeed27f, hayDark: 0xdcb75e, straw: 0xf0dca0,
  stone: 0xdfdcd3, stoneDark: 0xcbc7bc, rock: 0xb9b7ae, rockDark: 0xa3a198, concrete: 0xe5e2da,
  compost: [0x9c7c5e, 0x816449, 0x6b523d],
  pot: 0xdb9470, potRim: 0xd08360,
  hive: [0xf8f3e7, 0xe4eef1, 0xf7ecca, 0xe7f1dd],
  solar: 0x2c3d5a, solarFrame: 0xe0e4e7,
  glow: 0xffd166, tagPole: 0xa48666,
  smoke: 0xf2f0ec, bee: 0xf2c53d, beeDark: 0x3a3127,
  flower: [0xf48fb1, 0xf6d46a, 0xffffff, 0xe8a0dd, 0xffa36e, 0x9fc5ff],
};
export const STAGE_COLOR = [0xc3cbc4, 0xdcca92, 0xa9dd8c, 0x5fb24d, 0xc1d44f, 0xf7c552];

/* ---------- materials: one flat matte material per colour, shared by the whole scene ---------- */
const mats = new Map();
export function flat(color, { rough = .88, metal = 0, side = THREE.FrontSide, transparent = false, opacity = 1, emissive = 0, ei = 0, vertexColors = false, depthWrite = true, physical = false, env = 1 } = {}) {
  const key = [color, rough, metal, side, transparent ? 1 : 0, opacity, emissive, ei, vertexColors ? 1 : 0, depthWrite ? 1 : 0, physical ? 1 : 0, env].join("|");
  let m = mats.get(key);
  if (!m) {
    const Mat = physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
    m = new Mat({ color, roughness: rough, metalness: metal, side, transparent, opacity, emissive, emissiveIntensity: ei, vertexColors, depthWrite, envMapIntensity: env });
    if (transparent) m.forceSinglePass = true;
    mats.set(key, m);
  }
  return m;
}
/* layered flat planes (paths, patches) sit on the ground with a polygon offset so they never z-fight */
export function layered(mat, n) { mat.polygonOffset = true; mat.polygonOffsetFactor = -1; mat.polygonOffsetUnits = -n; return mat; }

/* ---------- geometry cache: dimensions are quantised to 5 mm so repeated parts share one buffer ---------- */
const geos = new Map();
const q = (v) => Math.round(v * 200) / 200;
function cached(key, make) { let g = geos.get(key); if (!g) { g = make(); geos.set(key, g); } return g; }
export function rboxGeo(w, h, d, r, seg) {
  const mn = Math.min(w, h, d);
  const rr = Math.min(r ?? Math.min(mn * .24, .32), mn / 2 - .001), s = seg ?? (mn >= .28 ? 2 : 1);
  if (rr <= .004) return cached(`b|${q(w)}|${q(h)}|${q(d)}`, () => new THREE.BoxGeometry(w, h, d));
  return cached(`rb|${q(w)}|${q(h)}|${q(d)}|${q(rr)}|${s}`, () => new RoundedBoxGeometry(w, h, d, s, rr));
}
export function sphereGeo(seg = 14, rings = 10) { return cached(`s|${seg}|${rings}`, () => new THREE.SphereGeometry(1, seg, rings)); }
export function capsuleGeo(r, len, seg = 10, cap = 4) { return cached(`c|${q(r)}|${q(len)}|${seg}|${cap}`, () => new THREE.CapsuleGeometry(r, len, cap, seg)); }
export function cylGeo(rt, rb, h, seg = 16, open = false) { return cached(`y|${q(rt)}|${q(rb)}|${q(h)}|${seg}|${open ? 1 : 0}`, () => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open)); }
export function torusGeo(R, r, tube = 8, seg = 20, arc = Math.PI * 2) { return cached(`t|${q(R)}|${q(r)}|${tube}|${seg}|${arc.toFixed(2)}`, () => new THREE.TorusGeometry(R, r, tube, seg, arc)); }
export function coneGeo(r, h, seg = 12) { return cached(`k|${q(r)}|${q(h)}|${seg}`, () => new THREE.ConeGeometry(r, h, seg)); }
export function discGeo(r, seg = 24) { return cached(`d|${q(r)}|${seg}`, () => new THREE.CircleGeometry(r, seg)); }
export function planeGeo(w, h) { return cached(`p|${q(w)}|${q(h)}`, () => new THREE.PlaneGeometry(w, h)); }

/* ---------- mesh helpers: every one adds to a group and returns the mesh ---------- */
function place(m, x, y, z, { rx = 0, ry = 0, rz = 0, cast = true, receive = true, s = null } = {}) {
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz, "YXZ"); m.castShadow = cast; m.receiveShadow = receive;
  if (s != null) { if (Array.isArray(s)) m.scale.set(s[0], s[1], s[2]); else m.scale.setScalar(s); }
  return m;
}
export function rbox(g, w, h, d, mat, x, y, z, o = {}) { const m = place(new THREE.Mesh(rboxGeo(w, h, d, o.r, o.seg), mat), x, y, z, o); g.add(m); return m; }
export function box(g, w, h, d, mat, x, y, z, o = {}) { const m = place(new THREE.Mesh(rboxGeo(w, h, d, 0), mat), x, y, z, o); g.add(m); return m; }
export function ball(g, r, mat, x, y, z, o = {}) { const m = place(new THREE.Mesh(sphereGeo(o.seg, o.rings), mat), x, y, z, { ...o, s: Array.isArray(r) ? r : r }); g.add(m); return m; }
export function tube(g, rt, rb, h, mat, x, y, z, o = {}) { const m = place(new THREE.Mesh(cylGeo(rt, rb, h, o.seg, o.open), mat), x, y, z, o); g.add(m); return m; }
export function cone(g, r, h, mat, x, y, z, o = {}) { const m = place(new THREE.Mesh(coneGeo(r, h, o.seg), mat), x, y, z, o); g.add(m); return m; }
export function ring(g, R, r, mat, x, y, z, o = {}) { const m = place(new THREE.Mesh(torusGeo(R, r, o.tube, o.seg, o.arc), mat), x, y, z, { rx: HPI, ...o }); g.add(m); return m; }
export function disc(g, r, mat, x, y, z, o = {}) { const m = place(new THREE.Mesh(discGeo(r, o.seg), mat), x, y, z, { rx: -HPI, cast: false, ...o }); if (o.sx || o.sz) m.scale.set(o.sx || 1, o.sz || 1, 1); g.add(m); return m; }
export function plane(g, w, h, mat, x, y, z, o = {}) { const m = place(new THREE.Mesh(planeGeo(w, h), mat), x, y, z, { rx: -HPI, cast: false, ...o }); g.add(m); return m; }
/* a capsule from a to b (posts, rails, branches, pipes) */
export function pill(g, a, b, r, mat, { seg = 10, cap = 4, cast = true, receive = true } = {}) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = Math.max(.001, A.distanceTo(B) - 2 * r);
  const m = new THREE.Mesh(capsuleGeo(r, len, seg, cap), mat);
  m.position.copy(A).add(B).multiplyScalar(.5); m.quaternion.setFromUnitVectors(UP, B.clone().sub(A).normalize());
  m.castShadow = cast; m.receiveShadow = receive; g.add(m); return m;
}
/* a plain cylinder from a to b, for thin bars where capsule ends would not be seen */
export function bar(g, a, b, r, mat, { seg = 8, cast = true } = {}) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B);
  const m = new THREE.Mesh(cylGeo(r, r, len, seg), mat);
  m.position.copy(A).add(B).multiplyScalar(.5); m.quaternion.setFromUnitVectors(UP, B.clone().sub(A).normalize());
  m.castShadow = cast; g.add(m); return m;
}
export function instances(g, geo, mat, items, { cast = true, receive = true } = {}) {
  if (!items.length) return null;
  const im = new THREE.InstancedMesh(geo, mat, items.length), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(), E = new THREE.Euler();
  items.forEach((it, i) => { P.set(it.p[0], it.p[1], it.p[2]); E.set(it.rx || 0, it.ry || 0, it.rz || 0, "YXZ"); Q.setFromEuler(E); const s = it.s || 1; if (Array.isArray(s)) S.set(s[0], s[1], s[2]); else S.set(s, s, s); M.compose(P, Q, S); im.setMatrixAt(i, M); });
  im.instanceMatrix.needsUpdate = true; im.castShadow = cast; im.receiveShadow = receive; g.add(im); return im;
}

/* ---------- vertex-coloured part builder: merges coloured primitives into one geometry (crops, props) ---------- */
export class Parts {
  constructor() { this.geos = []; this.detail = 1; }
  seg(n, min = 5) { return Math.max(min, Math.round(n * this.detail)); }
  add(geo, color, { pos = [0, 0, 0], rot = [0, 0, 0], scale = 1, paint = null } = {}) {
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], "YXZ"));
    const S = Array.isArray(scale) ? new THREE.Vector3(...scale) : new THREE.Vector3(scale, scale, scale);
    M.compose(new THREE.Vector3(...pos), Q, S); geo.applyMatrix4(M);
    const n = geo.attributes.position.count, cA = new Float32Array(n * 3), P = geo.attributes.position, c0 = color.isColor ? color : new THREE.Color(color);
    for (let i = 0; i < n; i++) { const c = paint ? paint(P.getX(i), P.getY(i), P.getZ(i), c0) : c0; cA[i * 3] = c.r; cA[i * 3 + 1] = c.g; cA[i * 3 + 2] = c.b; }
    geo.setAttribute("color", new THREE.BufferAttribute(cA, 3)); geo.deleteAttribute("uv");
    this.geos.push(geo); return geo;
  }
  sphere(r, color, o = {}) { return this.add(new THREE.SphereGeometry(1, this.seg(o.seg || 12, 6), this.seg(o.rings || 9, 4)), color, { ...o, scale: Array.isArray(r) ? r : [r, r, r] }); }
  rbox(w, h, d, color, o = {}) { const mn = Math.min(w, h, d); return this.add(new RoundedBoxGeometry(w, h, d, o.seg || 1, Math.min(o.r ?? mn * .3, mn / 2 - .001)), color, o); }
  cyl(rt, rb, h, color, o = {}) { return this.add(new THREE.CylinderGeometry(rt, rb, h, this.seg(o.seg || 10), 1, !!o.open), color, o); }
  cone(r, h, color, o = {}) { return this.add(new THREE.ConeGeometry(r, h, o.seg || 8), color, o); }
  caps(r, len, color, o = {}) { return this.add(new THREE.CapsuleGeometry(r, len, Math.max(2, Math.round((o.cap || 3) * this.detail)), this.seg(o.seg || 9)), color, o); }
  torus(R, r, color, o = {}) { return this.add(new THREE.TorusGeometry(R, r, o.tube || 6, o.seg || 14, o.arc || Math.PI * 2), color, o); }
  /* a tapered limb / stem from a to b */
  stem(a, b, r0, r1, color, o = {}) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B), geo = new THREE.CylinderGeometry(r1, r0, len, this.seg(o.seg || 7, 4), 1);
    const qq = new THREE.Quaternion().setFromUnitVectors(UP, B.clone().sub(A).normalize()), M = new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5), qq, new THREE.Vector3(1, 1, 1));
    geo.applyMatrix4(M); return this.add(geo, color, { paint: o.paint });
  }
  build() { const g = mergeParts(this.geos); this.geos.forEach((x) => x.dispose()); return g; }
}
export function mergeParts(list) {
  // minimal merge (position / normal / color) so the toy kit does not pull in the whole utils module
  const hasIndex = list.every((g) => g.index), srcs = list.map((g) => (g.index && !hasIndex ? g.toNonIndexed() : g));
  let n = 0; srcs.forEach((g) => { n += g.attributes.position.count; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let off = 0;
  const idx = [];
  srcs.forEach((src) => {
    const p = src.attributes.position, c = src.attributes.color; if (!src.attributes.normal) src.computeVertexNormals();
    const nn = src.attributes.normal;
    pos.set(p.array, off * 3); nor.set(nn.array, off * 3); if (c) col.set(c.array, off * 3); else col.fill(1, off * 3, (off + p.count) * 3);
    if (hasIndex) { const ix = src.index.array; for (let i = 0; i < ix.length; i++) idx.push(ix[i] + off); }
    off += p.count;
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  if (hasIndex) geo.setIndex(idx); else geo.computeVertexNormals();
  return geo;
}

/* ---------- small maths ---------- */
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lerpColor = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);
