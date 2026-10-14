/* ═══════════════════════════════════════════
   FAUNA FX — swallows looping high over the farm and butterflies over the flowers
   (spec §3). Real geometry (a capsule body with two swept wing boxes; two rounded wing
   boxes), one instanced mesh each, flight and wing beats in the motion material's vertex
   shader (anim 4 swallow, anim 5 butterfly). Hidden at night, in rain, and (butterflies)
   under 8 °C — Grove3D toggles `visible`.
   ═══════════════════════════════════════════ */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { rboxGeo } from "./toy";

const mulberry = (seed) => { let t = (Math.floor(seed * 1000003) ^ 0x5bd1e995) >>> 0; return () => { t = (t + 0x6d2b79f5) >>> 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; };
const paint = (geo, color) => { const n = geo.attributes.position.count, c = new Float32Array(n * 3), col = new THREE.Color(color); for (let i = 0; i < n; i++) c.set([col.r, col.g, col.b], i * 3); geo.setAttribute("color", new THREE.BufferAttribute(c, 3)); return geo; };
const BUTTERFLY_COLORS = [0xf7c552, 0xffffff, 0xf4a64c];

export function swallowCount({ mobile = false, reduced = false } = {}) { return reduced ? 0 : mobile ? 3 : 5; }
export function butterflyCount(spots, { mobile = false, reduced = false } = {}) { return reduced ? 0 : Math.min(spots, mobile ? 4 : 8); }

let swallowGeo = null;
function swallowGeometry() { // local: forward +z, wings along ±x; dark back, cream belly
  if (swallowGeo) return swallowGeo;
  const body = paint(new THREE.CapsuleGeometry(.045, .14, 3, 8).rotateX(Math.PI / 2), 0x3b4a5a);
  const belly = paint(new THREE.SphereGeometry(.04, 8, 6).scale(1, .6, 1.4).translate(0, -.02, .01), 0xf2ead8);
  const tail = paint(rboxGeo(.06, .01, .1, .004).clone().translate(0, 0, -.13), 0x3b4a5a);
  const wing = (s) => paint(rboxGeo(.2, .008, .07, .004).clone().rotateY(s * -.5).translate(s * .13, 0, -.01), 0x3b4a5a);
  swallowGeo = mergeGeometries([body, belly, tail, wing(1), wing(-1)], false); swallowGeo.userData.shared = true; return swallowGeo;
}
let butterflyGeo = null;
function butterflyGeometry() { // two rounded wing boxes either side of a tiny body
  if (butterflyGeo) return butterflyGeo;
  const w = (s) => rboxGeo(.06, .006, .05, .004).clone().translate(s * .035, 0, 0), body = new THREE.CapsuleGeometry(.006, .03, 2, 5).rotateX(Math.PI / 2);
  butterflyGeo = mergeGeometries([w(1), w(-1), body], false); butterflyGeo.userData.shared = true; return butterflyGeo;
}

/** swallows: `count` instances circling the farm centre; mat is a motion material with vertexColors */
export function buildSwallows(center, count, mat) {
  if (!count) return null;
  const geo = swallowGeometry().clone(), im = new THREE.InstancedMesh(geo, mat, count), M4 = new THREE.Matrix4(), r = mulberry(21);
  const an = new Float32Array(count).fill(4), ph = new Float32Array(count);
  for (let i = 0; i < count; i++) { M4.makeTranslation(center[0], 0, center[1]); im.setMatrixAt(i, M4); ph[i] = r(); }
  geo.setAttribute("g3anim", new THREE.InstancedBufferAttribute(an, 1)); geo.setAttribute("g3phase", new THREE.InstancedBufferAttribute(ph, 1));
  im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false; im.name = "g3swallows"; // static shadow map: no shadow from a moving bird
  return im;
}
/** butterflies: one per flower spot ([x, z]), fluttering in a .6 m sphere above it, in three palette colours */
export function buildButterflies(spots, count, mat) {
  if (!count) return null;
  const geo = butterflyGeometry().clone(), im = new THREE.InstancedMesh(geo, mat, count), M4 = new THREE.Matrix4(), r = mulberry(23), C = new THREE.Color();
  const an = new Float32Array(count).fill(5), ph = new Float32Array(count);
  for (let i = 0; i < count; i++) { const [x, z] = spots[i % spots.length]; M4.makeTranslation(x, .45, z); im.setMatrixAt(i, M4); ph[i] = r(); im.setColorAt(i, C.set(BUTTERFLY_COLORS[i % 3])); }
  geo.setAttribute("g3anim", new THREE.InstancedBufferAttribute(an, 1)); geo.setAttribute("g3phase", new THREE.InstancedBufferAttribute(ph, 1));
  im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false; im.name = "g3butterflies";
  return im;
}
