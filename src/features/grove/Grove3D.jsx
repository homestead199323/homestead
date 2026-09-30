/* ═══════════════════════════════════════════
   GROVE 3D — the farm map rendered with a real 3D engine (three.js).
   One camera, one sun, every object is lit geometry that casts and
   receives shadows on a textured ground. Buildings have plinths, tiled
   or standing-seam roofs with ridge caps, gutters, chimneys, framed
   windows with sills and shutters, doors with steps; the greenhouse is
   a framed glass house with rafters, a vent and benches; beds have
   boards, corner posts, soil and drip lines; the water reserve has a
   stone coping, a tap and a reflective surface; trees, fences, gates,
   compost bays, beehives, nursery benches, rocks, grass tufts and
   flowers are all geometry. The app's crop / animal / prop illustrations
   stand in the scene as lit, shadow-casting sprites. View-only: the
   designer keeps the flat SVG map.
   MARKER: GROVE_3D_ENGINE_V3
   ═══════════════════════════════════════════ */
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Plus, Minus, Compass, Maximize2, Minimize2, X, Sprout } from "lucide-react";
import { art, cropArtwork } from "../quiet/art";
import { growthOf, animalZone, bedRows, layoutPlots, STAGES } from "../quiet/farm-model";
import { plantingRows } from "../quiet/planting-plan";
import { plantedRows, plantPosition } from "./aerial-layout";
import { srand } from "./sceneMath";
import { todayLocalKey } from "../../lib/utils";
import { isPlantZone } from "../farm/living/visuals";
import { taskGlyph } from "./zone-tasks";
import { buildHerd } from "./animals3d";

const ASPECT = {"alpaca":1.33,"apple":1.074,"basil-2":.925,"basil-3":1.004,"basil-4":1.152,"basil-5":1.064,"bean":1.328,"bee":.934,"broccoli":.993,"cabbage":.905,"carrot-2":1.205,"carrot-3":.938,"carrot-4":.959,"carrot-5":.978,"chicken":1.199,"corn":1.089,"cow":.997,"cucumber":1.184,"donkey":1,"duck":1.29,"eggplant":1.101,"fig":1.064,"goat":1.184,"goose":1.413,"guinea-fowl":1,"horse":1,"lavender":.931,"lemon":1.056,"lettuce-2":.887,"lettuce-3":.817,"lettuce-4":.864,"lettuce-5":.848,"olive":1.099,"onion":1,"pepper":1.127,"pig":1.007,"prop-bench":1.076,"prop-bush":.997,"prop-flowers":1.136,"prop-gate":1.062,"prop-hangpot":1.75,"prop-haybale":.943,"prop-planter":1.02,"prop-pond":.914,"prop-pot":1.333,"prop-rock":.979,"prop-wateringcan":.883,"prop-woodpile":1.062,"pumpkin":.846,"quail":1.094,"rabbit":1.289,"rosemary":1.043,"sheep":1.112,"strawberry":1.021,"tomato-2":1.073,"tomato-3":.977,"tomato-4":1.072,"tomato-5":1.045,"turkey":1.275};
const aspectOf = (src) => { const m = /\/([a-z0-9-]+?)(?:-[A-Za-z0-9_-]{8})?\.webp/.exec(src || ""); return (m && ASPECT[m[1]]) || 1; };
const TREE_RE = /apple|pear|peach|plum|cherry|citrus|lemon|orange|fig|olive|walnut|almond|avocado/;
const CAM = { az: -22, el: 56, fov: 28 };
// growth stages (farm-model STAGES): Planned, Sown, Seedling, Growing, Maturing, Harvest window
const STAGE_COLOR = [0xb9c0bb, 0xd7c48c, 0xa9dd8c, 0x5aa846, 0xb9cf4d, 0xf7c552];
const STAGE_CSS = ["#b9c0bb", "#d7c48c", "#a9dd8c", "#5aa846", "#b9cf4d", "#f7c552"];
const dayNum = (key) => { const [y, m, d] = String(key || "").split("-").map(Number); return Date.UTC(y || 1970, (m || 1) - 1, d || 1) / 864e5; };
const addDays = (key, n) => { const t = new Date((dayNum(key) + n) * 864e5); return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`; };
const UP = new THREE.Vector3(0, 1, 0);
const HPI = Math.PI / 2;

/* ---------- textures ---------- */
const manager = new THREE.LoadingManager();
const loader = new THREE.TextureLoader(manager);
const cache = new Map();
const onTexturesLoaded = new Set(); // render callbacks of mounted scenes
manager.onLoad = () => onTexturesLoaded.forEach((f) => f());
function tex(url, { repeat, srgb = true, rot = 0 } = {}) {
  const key = url + "|" + (repeat ? repeat.join(",") : "") + "|" + rot;
  if (cache.has(key)) return cache.get(key);
  const t = loader.load(url);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  if (rot) { t.rotation = rot; t.center.set(.5, .5); }
  cache.set(key, t);
  return t;
}
function rng(seed) { let s = seed || 1; return () => ((s = (s * 16807) % 2147483647) & 0xffff) / 0xffff; }
const canvases = new Map();
function canvasOf(key, size, draw) {
  let c = canvases.get(key);
  if (!c) { c = document.createElement("canvas"); c.width = c.height = size; draw(c.getContext("2d"), size, rng(key.length * 7 + 3)); canvases.set(key, c); }
  return c;
}
function proc(key, draw, { size = 256, repeat = [1, 1], srgb = true, clamp = false, rot = 0 } = {}) {
  const k = "proc:" + key + "|" + repeat.join(",") + "|" + rot;
  if (cache.has(k)) return cache.get(k);
  const t = new THREE.CanvasTexture(canvasOf(key, size, draw));
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); t.anisotropy = 8;
  if (rot) { t.rotation = rot; t.center.set(.5, .5); }
  cache.set(k, t);
  return t;
}
const DRAW = {
  stucco(g, s, r) { g.fillStyle = "#e9e3d2"; g.fillRect(0, 0, s, s); for (let i = 0; i < 2600; i++) { g.fillStyle = r() < .5 ? "rgba(120,110,90,.10)" : "rgba(255,255,255,.14)"; const x = r() * s, y = r() * s, q = .6 + r() * 1.8; g.fillRect(x, y, q, q); } },
  planks(g, s, r) {
    const n = 8, bw = s / n;
    for (let i = 0; i < n; i++) {
      g.fillStyle = `hsl(34 30% ${76 + r() * 10}%)`; g.fillRect(i * bw, 0, bw, s);
      for (let k = 0; k < 14; k++) { g.strokeStyle = `rgba(90,60,30,${.06 + r() * .09})`; g.lineWidth = 1 + r(); const x = i * bw + 2 + r() * (bw - 4); g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - .5) * 4, s * .33, x + (r() - .5) * 4, s * .66, x + (r() - .5) * 3, s); g.stroke(); }
      g.fillStyle = "rgba(50,35,20,.55)"; g.fillRect(i * bw, 0, 2, s);
      g.fillStyle = "rgba(40,30,20,.5)"; [s * .08, s * .5, s * .92].forEach((y) => { g.beginPath(); g.arc(i * bw + bw * .5, y, 1.6, 0, 6.3); g.fill(); });
    }
  },
  brick(g, s, r) { g.fillStyle = "#cfc5b4"; g.fillRect(0, 0, s, s); const bh = s / 12, bw = s / 6; for (let row = 0; row < 12; row++) { const off = row % 2 ? bw / 2 : 0; for (let c = -1; c < 7; c++) { g.fillStyle = `hsl(${14 + r() * 8} 45% ${42 + r() * 12}%)`; g.fillRect(c * bw + off + 1.5, row * bh + 1.5, bw - 3, bh - 3); } } },
  tiles(g, s, r) {
    g.fillStyle = "#8f4a30"; g.fillRect(0, 0, s, s); const rows = 8, cols = 8, th = s / rows, tw = s / cols;
    for (let row = 0; row < rows; row++) for (let c = -1; c <= cols; c++) {
      const x = c * tw + (row % 2 ? tw / 2 : 0), y = row * th, l = 48 + r() * 10, grad = g.createLinearGradient(x, 0, x + tw, 0);
      grad.addColorStop(0, `hsl(16 55% ${l + 12}%)`); grad.addColorStop(.55, `hsl(16 55% ${l}%)`); grad.addColorStop(1, `hsl(14 50% ${l - 16}%)`);
      g.fillStyle = grad; g.beginPath(); g.moveTo(x, y + th); g.lineTo(x, y + 3); g.quadraticCurveTo(x + tw / 2, y - 3, x + tw, y + 3); g.lineTo(x + tw, y + th); g.closePath(); g.fill();
      g.fillStyle = "rgba(40,15,5,.35)"; g.fillRect(x, y + th - 2, tw, 2);
    }
  },
  slate(g, s, r) { g.fillStyle = "#4d5560"; g.fillRect(0, 0, s, s); const rows = 8, cols = 6, th = s / rows, tw = s / cols; for (let row = 0; row < rows; row++) for (let c = -1; c <= cols; c++) { const x = c * tw + (row % 2 ? tw / 2 : 0), y = row * th; g.fillStyle = `hsl(210 10% ${34 + r() * 12}%)`; g.fillRect(x + 1, y + 1, tw - 2, th - 1); g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(x, y + th - 2, tw, 2); } },
  slats(g, s, r) { g.clearRect(0, 0, s, s); const n = 6, h = s / n; for (let i = 0; i < n; i++) { g.fillStyle = `hsl(32 30% ${60 + r() * 10}%)`; g.fillRect(0, i * h + h * .12, s, h * .7); g.fillStyle = "rgba(60,40,20,.35)"; g.fillRect(0, i * h + h * .72, s, h * .1); } },
  mottle(g, s, r) { g.fillStyle = "#ffffff"; g.fillRect(0, 0, s, s); for (let i = 0; i < 8; i += 2) { g.fillStyle = "rgba(90,120,60,.045)"; g.fillRect(0, (i * s) / 8, s, s / 8); } for (let i = 0; i < 70; i++) { const x = r() * s, y = r() * s, rad = s * (.06 + r() * .16), grad = g.createRadialGradient(x, y, 0, x, y, rad); grad.addColorStop(0, r() < .6 ? "rgba(110,140,70,.28)" : "rgba(255,250,210,.22)"); grad.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = grad; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); } },
  tuft(g, s, r) { g.clearRect(0, 0, s, s); g.lineCap = "round"; for (let i = 0; i < 11; i++) { const x0 = s * .5 + (r() - .5) * s * .2, a = (r() - .5) * 1.5, len = s * (.45 + r() * .45), x1 = x0 + Math.sin(a) * len, y1 = s - Math.cos(a) * len; g.strokeStyle = `hsl(${95 + r() * 30} 45% ${30 + r() * 22}%)`; g.lineWidth = 2.5 + r() * 3; g.beginPath(); g.moveTo(x0, s); g.quadraticCurveTo(x0 + (x1 - x0) * .3, s - len * .6, x1, y1); g.stroke(); } },
  flower(g, s, r) { g.clearRect(0, 0, s, s); const cols = ["#f28ba8", "#f5d76e", "#ffffff", "#e98ad5", "#ff9f6e"]; for (let i = 0; i < 7; i++) { const x0 = s * .5 + (r() - .5) * s * .5, len = s * (.4 + r() * .4), x1 = x0 + (r() - .5) * s * .2, y1 = s - len; g.strokeStyle = "#4f7a3a"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x0, s); g.lineTo(x1, y1); g.stroke(); g.fillStyle = "#5f8f45"; g.beginPath(); g.ellipse(x0 + 4, s - len * .4, 7, 3.5, .6, 0, 6.3); g.fill(); g.fillStyle = cols[Math.floor(r() * cols.length)]; g.beginPath(); g.arc(x1, y1, s * .055 + r() * s * .03, 0, 6.3); g.fill(); g.fillStyle = "#f6d35a"; g.beginPath(); g.arc(x1, y1, s * .02, 0, 6.3); g.fill(); } },
  soilDisc(g, s) { g.clearRect(0, 0, s, s); const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); grad.addColorStop(0, "rgba(70,50,32,.95)"); grad.addColorStop(.75, "rgba(70,50,32,.85)"); grad.addColorStop(1, "rgba(70,50,32,0)"); g.fillStyle = grad; g.fillRect(0, 0, s, s); },
  shade(g, s) { g.clearRect(0, 0, s, s); g.fillStyle = "rgba(40,60,40,.5)"; g.fillRect(0, 0, s, s); g.strokeStyle = "rgba(20,30,20,.5)"; g.lineWidth = 1; for (let i = 0; i < s; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, s); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(s, i); g.stroke(); } },
  hay(g, s, r) { g.fillStyle = "#d8b45a"; g.fillRect(0, 0, s, s); g.lineWidth = 1; for (let i = 0; i < 900; i++) { g.strokeStyle = r() < .5 ? "rgba(120,80,20,.35)" : "rgba(255,240,180,.5)"; const x = r() * s, y = r() * s, a = (r() - .5) * .9, l = 6 + r() * 16; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } },
  hedge(g, s, r) { g.fillStyle = "#1f3a19"; g.fillRect(0, 0, s, s); const cols = ["#3a6328", "#467433", "#2f5522", "#527f3a", "#3e6a2c"]; for (let i = 0; i < 2200; i++) { g.fillStyle = cols[Math.floor(r() * cols.length)]; const x = r() * s, y = r() * s, q = 3 + r() * 6; g.beginPath(); g.ellipse(x, y, q, q * .6, r() * 3, 0, 6.3); g.fill(); } },
  halo(g, s) { g.clearRect(0, 0, s, s); const grad = g.createRadialGradient(s / 2, s / 2, s * .1, s / 2, s / 2, s / 2); grad.addColorStop(0, "rgba(255,205,80,.9)"); grad.addColorStop(.55, "rgba(255,205,80,.55)"); grad.addColorStop(1, "rgba(255,205,80,0)"); g.fillStyle = grad; g.fillRect(0, 0, s, s); },
  contact(g, s) { g.clearRect(0, 0, s, s); const grad = g.createRadialGradient(s / 2, s / 2, s * .28, s / 2, s / 2, s / 2); grad.addColorStop(0, "rgba(10,20,8,.55)"); grad.addColorStop(1, "rgba(10,20,8,0)"); g.fillStyle = grad; g.fillRect(0, 0, s, s); },
  solar(g, s) { g.fillStyle = "#16233d"; g.fillRect(0, 0, s, s); g.strokeStyle = "rgba(190,205,225,.55)"; g.lineWidth = 2; const n = 6; for (let i = 0; i <= n; i++) { const t = (i * s) / n; g.beginPath(); g.moveTo(t, 0); g.lineTo(t, s); g.stroke(); g.beginPath(); g.moveTo(0, t); g.lineTo(s, t); g.stroke(); } g.fillStyle = "rgba(255,255,255,.06)"; g.fillRect(0, 0, s, s / 3); },
  bark(g, s, r) { g.fillStyle = "#5a4634"; g.fillRect(0, 0, s, s); for (let i = 0; i < 260; i++) { g.strokeStyle = r() < .5 ? "rgba(30,20,10,.45)" : "rgba(150,120,90,.35)"; g.lineWidth = 1 + r() * 2; const x = r() * s; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (r() - .5) * 10, s); g.stroke(); } },
  puff(g, s, r) { g.clearRect(0, 0, s, s); for (let i = 0; i < 7; i++) { const x = s * (.35 + r() * .3), y = s * (.35 + r() * .3), rad = s * (.16 + r() * .14), grad = g.createRadialGradient(x, y, 0, x, y, rad); grad.addColorStop(0, "rgba(232,228,220,.9)"); grad.addColorStop(.5, "rgba(232,228,220,.5)"); grad.addColorStop(1, "rgba(232,228,220,0)"); g.fillStyle = grad; g.fillRect(0, 0, s, s); } },
  cloud(g, s, r) { g.fillStyle = "#ffffff"; g.fillRect(0, 0, s, s); for (let i = 0; i < 18; i++) { const x = r() * s, y = r() * s, rad = s * (.1 + r() * .24), grad = g.createRadialGradient(x, y, 0, x, y, rad); grad.addColorStop(0, "rgba(40,60,30,.14)"); grad.addColorStop(.6, "rgba(40,60,30,.07)"); grad.addColorStop(1, "rgba(40,60,30,0)"); g.fillStyle = grad; [[0, 0], [-s, 0], [s, 0], [0, -s], [0, s]].forEach(([ox, oy]) => { g.save(); g.translate(ox, oy); g.fillRect(x - rad, y - rad, rad * 2, rad * 2); g.restore(); }); } },
};

/* ---------- shader effects ----------
   The engine renders on demand, so motion has to be cheap: everything that moves does so in the
   vertex shader from one shared clock. Cut-out foliage also fades by view angle — a crossed sprite
   seen from straight above would otherwise draw as an X of thin lines, and a tree's leaf discs seen
   from a low angle as a stack of plates — using an ordered dither so no sorting is needed. */
const TIME = { value: 0 };                            // seconds, shared by every animated material
const UPV = { value: new THREE.Vector3(0, 1, 0) };    // world up in view space (for the view-angle fade)
const LEAN = { value: 0 };                            // how far camera-facing sprites lean back toward a high camera
const GLSL_BAYER = `float g3b2(int x, int y) { return (x == 0 && y == 0) ? 0. : (x == 1 && y == 0) ? 2. : (x == 0 && y == 1) ? 3. : 1.; }
float g3bayer(vec2 p) { ivec2 q = ivec2(mod(p, 4.)); return (4. * g3b2(q.x % 2, q.y % 2) + g3b2((q.x / 2) % 2, (q.y / 2) % 2) + .5) / 16.; }`;
const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
/* foliage(mat, { sway, by, freq, fade }) — sway: metres of wobble (in the sprite's own units for instanced
   sprites); by: "uv" (tips move most) or "height" (baked tree canopies); fade: [v0, v1, h0, h1] camera
   elevation in degrees where vertical planes fade out (v0 → v1) and horizontal planes fade in (h0 → h1). */
function foliage(mat, { sway = 0, by = "uv", freq = .9, fade = null } = {}) {
  const u = { uFadeV: { value: 1 }, uFadeH: { value: 1 } };
  mat.userData.fade = fade; mat.userData.u = u; mat.forceSinglePass = true;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u, { uTime: TIME, uUp: UPV, uSway: { value: sway } });
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime; uniform float uSway;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
#ifdef USE_INSTANCING
vec3 g3p = instanceMatrix[3].xyz;
#else
vec3 g3p = position;
#endif
float g3w = sin(uTime * 1.6 + g3p.x * ${freq.toFixed(2)} + g3p.z * ${(freq * .8).toFixed(2)}) + .5 * sin(uTime * 2.7 + g3p.z * ${(freq * 1.4).toFixed(2)} + g3p.x * ${(freq * .5).toFixed(2)});
${by === "uv" ? "float g3h = uv.y * uv.y;" : "float g3h = clamp((position.y - 1.2) * .35, 0., 1.);"}
transformed.x += g3w * g3h * uSway;`);
    if (fade) sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uFadeV; uniform float uFadeH; uniform vec3 uUp;\n" + GLSL_BAYER)
      .replace("#include <alphatest_fragment>", `vec3 g3n = normalize(vNormal); float g3ny = abs(dot(g3n, uUp));
float g3edge = smoothstep(.04, .2, abs(dot(g3n, normalize(vViewPosition)))); // a plane seen edge-on is a line: drop it
if (mix(uFadeV * g3edge, uFadeH, smoothstep(.3, .7, g3ny)) < g3bayer(gl_FragCoord.xy)) discard;
#include <alphatest_fragment>`);
  };
  mat.customProgramCacheKey = () => `g3f|${sway}|${by}|${freq}|${fade ? 1 : 0}`;
  return mat;
}
/* camera-facing instanced sprites: the instance matrix carries only the base position; the shader turns
   each quad toward the camera (leaning back when the camera is high), sizes it from per-instance
   attributes and, for bees, birds and chimney smoke, moves it on the shared clock. */
function billShader(sh, depth) {
  Object.assign(sh.uniforms, { uTime: TIME, uLean: depth ? { value: 0 } : LEAN });
  const setup = `vec3 g3c = instanceMatrix[3].xyz;
vec2 g3d = cameraPosition.xz - g3c.xz; float g3a = atan(g3d.x, g3d.y), g3s = sin(g3a), g3k = cos(g3a), g3cl = cos(uLean), g3sl = sin(uLean);`;
  const place = `vec3 g3l = vec3(position.x * g3size.x, position.y * g3size.y * g3cl, -position.y * g3size.y * g3sl);
transformed = vec3(g3l.x * g3k + g3l.z * g3s, g3l.y, -g3l.x * g3s + g3l.z * g3k);
g3va = 1.;
if (g3anim > 2.5) { float g3t = fract(uTime * .09 + g3phase); transformed *= .45 + g3t * 1.5; transformed.y += g3t * 2.6; transformed.x += g3t * g3t * 1.4 + sin(g3t * 5. + g3phase * 6.28) * .18; g3va = (1. - g3t) * smoothstep(0., .12, g3t) * .8; }
else if (g3anim > 1.5) { float g3t = fract(uTime * .28 + g3phase); transformed.y += smoothstep(0., .06, g3t) * (1. - smoothstep(.06, .14, g3t)) * .07; }
else if (g3anim > .5) { transformed.y += sin(uTime * 2.1 + g3phase * 6.28) * .05; transformed.x += cos(uTime * .9 + g3phase * 6.28) * .07; }`;
  sh.vertexShader = sh.vertexShader
    .replace("#include <common>", "#include <common>\nuniform float uTime; uniform float uLean; attribute vec2 g3size; attribute float g3anim; attribute float g3phase; varying float g3va;")
    .replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>\n${setup}\nobjectNormal = vec3(g3cl * g3s, g3sl, g3cl * g3k);`)
    .replace("#include <begin_vertex>", `#include <begin_vertex>\n${depth ? setup : ""}\n${place}`);
  sh.fragmentShader = sh.fragmentShader
    .replace("#include <common>", "#include <common>\nvarying float g3va;")
    .replace("#include <alphatest_fragment>", "diffuseColor.a *= g3va;\n#include <alphatest_fragment>");
}

/* ---------- materials ---------- */
function std(o) { return new THREE.MeshStandardMaterial({ roughness: .9, metalness: 0, ...o }); }
function layer(m, n) { m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -n; return m; }
function materials() {
  const memo = new Map();
  const keep = (key, make) => { let m = memo.get(key); if (!m) { m = make(); memo.set(key, m); } return m; };
  const k = (...a) => a.map((v) => (typeof v === "number" ? v.toFixed(2) : String(v))).join("|");
  return {
    grass: (rx, ry, color = 0xffffff) => keep(k("grass", rx, ry, color), () => std({ map: tex(art("aerial-grass"), { repeat: [rx, ry] }), color })),
    lawn: (rx, ry, color = 0xffffff) => keep(k("lawn", rx, ry, color), () => layer(std({ map: tex(art("texture-grass"), { repeat: [rx, ry] }), color, roughness: 1 }), 6)),
    soil: (rx, ry, color = 0xffffff) => keep(k("soil", rx, ry, color), () => layer(std({ map: tex(art("texture-soil"), { repeat: [rx, ry] }), color, roughness: 1 }), 6)),
    gravel: (rx, ry) => keep(k("gravel", rx, ry), () => layer(std({ map: tex(art("texture-gravel"), { repeat: [rx, ry] }) }), 6)),
    stone: (rx, ry, color = 0xffffff) => keep(k("stone", rx, ry, color), () => layer(std({ map: tex(art("texture-stone"), { repeat: [rx, ry] }), color }), 6)),
    wood: std({ map: tex(art("texture-wood")), color: 0xcdb08a }),
    woodDark: std({ map: tex(art("texture-wood")), color: 0x7a5c3e }),
    planks: (rx, ry, color = 0xd9c39c) => keep(k("planks", rx, ry, color), () => std({ map: proc("planks", DRAW.planks, { repeat: [rx, ry] }), color })),
    stucco: std({ map: proc("stucco", DRAW.stucco, { repeat: [2, 2] }) }),
    brick: (rx, ry) => keep(k("brick", rx, ry), () => std({ map: proc("brick", DRAW.brick, { repeat: [rx, ry] }) })),
    tiles: (rx, ry, rot = 0) => keep(k("tiles", rx, ry, rot), () => std({ map: proc("tiles", DRAW.tiles, { repeat: [rx, ry], rot }), roughness: .85 })),
    slate: (rx, ry, rot = 0) => keep(k("slate", rx, ry, rot), () => std({ map: proc("slate", DRAW.slate, { repeat: [rx, ry], rot }), roughness: .7, metalness: .05 })),
    metalRoof: (rx, ry, rot = 0) => keep(k("metalRoof", rx, ry, rot), () => std({ map: tex(art("aerial-roof"), { repeat: [rx, ry], rot }), roughness: .55, metalness: .3 })),
    slats: new THREE.MeshStandardMaterial({ map: proc("slats", DRAW.slats, { size: 128 }), transparent: true, alphaTest: .5, side: THREE.DoubleSide, roughness: .9, forceSinglePass: true }),
    frame: std({ color: 0xf1ece0, roughness: .6 }),
    frameGH: std({ color: 0xe6ece8, roughness: .45, metalness: .35 }),
    winGlass: new THREE.MeshPhysicalMaterial({ color: 0x35525e, roughness: .12, metalness: .2, envMapIntensity: 1.4 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xd7eef0, transparent: true, opacity: .3, roughness: .05, metalness: 0, envMapIntensity: 1.5, side: THREE.DoubleSide, depthWrite: false, forceSinglePass: true }),
    postWood: std({ map: tex(art("texture-wood")), color: 0x8a8060 }),
    railWood: std({ map: tex(art("texture-wood")), color: 0xd2c19a }),
    picketRail: std({ color: 0x8d7451 }),
    strip: std({ map: proc("hedge", DRAW.hedge, { repeat: [2, .5] }), color: 0xa9c986, roughness: 1 }),
    terracottaOpen: std({ color: 0xc07a55, roughness: .85, side: THREE.DoubleSide }),
    barrel: std({ color: 0x3f5a3f, roughness: .7 }),
    cloud: layer(new THREE.MeshBasicMaterial({ map: proc("cloud", DRAW.cloud, { size: 512 }), transparent: true, blending: THREE.MultiplyBlending, premultipliedAlpha: true, depthWrite: false, toneMapped: false }), 3), // multiply overlays must not be tone-mapped: white has to stay exactly 1 or the whole ground darkens
    water: new THREE.MeshPhysicalMaterial({ map: tex(art("texture-water"), { repeat: [2, 2] }), color: 0x8fbfc4, roughness: .08, metalness: .05, envMapIntensity: 1.3, transparent: true, opacity: .93 }),
    door: std({ color: 0x3e4a3c, roughness: .6 }),
    doorWood: std({ map: tex(art("texture-wood")), color: 0x8a6a48 }),
    shutter: std({ color: 0x4f6b53, roughness: .7 }),
    brass: std({ color: 0xc9a44a, roughness: .35, metalness: .8 }),
    metal: std({ color: 0x8c9196, roughness: .45, metalness: .6 }),
    zinc: std({ color: 0xb9bdb7, roughness: .5, metalness: .4 }),
    plinth: (rx) => keep(k("plinth", rx), () => std({ map: tex(art("texture-stone"), { repeat: [rx, .5] }), color: 0xb9b2a2 })),
    panel: std({ color: 0x4b5949, roughness: .6 }),
    batten: std({ color: 0xd8c4a0, roughness: .8 }),
    battenDark: std({ color: 0x6e5236, roughness: .85 }),
    solarFrame: std({ color: 0xd8dde0, roughness: .5, metalness: .4 }),
    red: std({ color: 0xb03a2e, roughness: .6 }),
    slot: std({ color: 0x1c1a16 }),
    concrete: layer(std({ color: 0xb8b4aa, roughness: .95 }), 6),
    rubber: std({ color: 0x2a2a2a, roughness: .9 }),
    terracotta: std({ color: 0xc07a55, roughness: .85 }),
    bark: std({ map: proc("bark", DRAW.bark, { size: 128, repeat: [2, 3] }), roughness: 1 }),
    ridgeClay: std({ color: 0x8e4a31, roughness: .8 }),
    ridgeSlate: std({ color: 0x3c434c, roughness: .7 }),
    hive: [0xf1e9d2, 0xdbe7ea, 0xf3e5b1, 0xe4efd6].map((c) => std({ color: c, roughness: .8 })),
    compost: [0x6b5340, 0x4f3b2b, 0x3c2e22].map((c) => std({ map: tex(art("texture-soil"), { repeat: [2, 2] }), color: c })),
    hay: std({ map: proc("hay", DRAW.hay, { size: 128, repeat: [2, 2] }) }),
    shade: new THREE.MeshStandardMaterial({ map: proc("shade", DRAW.shade, { size: 64, repeat: [6, 6] }), transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 1, forceSinglePass: true }),
    mulch: layer(new THREE.MeshStandardMaterial({ map: proc("soilDisc", DRAW.soilDisc, { size: 128, clamp: true }), transparent: true, depthWrite: false, roughness: 1 }), 13),
    rock: std({ map: tex(art("texture-stone")), color: 0x9d9a90, flatShading: true }),
    hedge: (rx, ry) => keep(k("hedge", rx, ry), () => std({ map: proc("hedge", DRAW.hedge, { repeat: [rx, ry] }), roughness: 1 })),
    pavers: (rx, ry) => keep(k("pavers", rx, ry), () => layer(std({ map: tex(art("texture-stone"), { repeat: [rx, ry] }), color: 0xd4cfc4 }), 5)),
    hit: new THREE.MeshBasicMaterial({ visible: false }),
    glow: layer(new THREE.MeshBasicMaterial({ map: proc("halo", DRAW.halo, { size: 128, clamp: true }), transparent: true, opacity: .75, depthWrite: false }), 11),
    stageTag: STAGE_COLOR.map((c, i) => std({ color: c, roughness: .6, emissive: i === 5 ? 0x8a6a10 : 0x000000 })),
    sprout: std({ color: 0x8fd47a, roughness: 1 }),
    fruit: (color) => keep(k("fruit", color), () => std({ color, roughness: .45, emissive: color, emissiveIntensity: .12 })),
    select: layer(new THREE.MeshBasicMaterial({ color: 0xf7c552, transparent: true, opacity: .22, depthWrite: false }), 14),
    selectEdge: layer(new THREE.MeshBasicMaterial({ color: 0xf7c552, transparent: true, opacity: .95, depthWrite: false }), 15),
    pick: layer(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .3, depthWrite: false }), 16),
    pickEdge: layer(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .95, depthWrite: false }), 17),
    contact: layer(new THREE.MeshBasicMaterial({ map: proc("contact", DRAW.contact, { size: 128, clamp: true }), transparent: true, depthWrite: false }), 12),
    solar: new THREE.MeshPhysicalMaterial({ map: proc("solar", DRAW.solar, { size: 64 }), roughness: .2, metalness: .5, envMapIntensity: 1.4 }),
    tuft: foliage(new THREE.MeshLambertMaterial({ map: proc("tuft", DRAW.tuft, { size: 128, clamp: true }), transparent: true, alphaTest: .35, side: THREE.DoubleSide }), { sway: .05, fade: [86, 70, 0, 1] }),
    flower: foliage(new THREE.MeshLambertMaterial({ map: proc("flower", DRAW.flower, { size: 128, clamp: true }), transparent: true, alphaTest: .35, side: THREE.DoubleSide }), { sway: .05, fade: [86, 70, 0, 1] }),
    // tree canopies: leaf discs and crossed planes fade by view angle, the solid core never does
    leaf: [0x82ab5e, 0x729d50, 0x8fb86b, 0x669247, 0x9aa886, 0x5f8f4a].map((c) => { // 4 random greens, 4 = silvery olive, 5 = deep glossy citrus/fig
      const map = tex(art("aerial-canopy")), make = () => new THREE.MeshLambertMaterial({ map, color: c, transparent: true, alphaTest: .12, side: THREE.DoubleSide, emissive: 0x16240f, emissiveMap: map, emissiveIntensity: .18 });
      return { mat: foliage(make(), { sway: .06, by: "height", freq: .25, fade: [80, 58, 30, 50] }), core: foliage(make(), { sway: .06, by: "height", freq: .25 }), depth: new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: .3 }) };
    }),
  };
}
const billMats = new Map();
function billMat(url) { // crossed crop sprites (instanced, fixed orientation)
  let m = billMats.get(url);
  if (!m) { const map = tex(url); m = { mat: foliage(new THREE.MeshLambertMaterial({ map, transparent: true, alphaTest: .12, side: THREE.DoubleSide, emissive: 0x2a2a2a, emissiveMap: map, emissiveIntensity: .35 }), { sway: .035, fade: [84, 64, 22, 42] }), depth: new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: .3 }) }; billMats.set(url, m); }
  return m;
}
const faceMats = new Map();
function faceMat(url) { // camera-facing sprites (animals, props, bees, smoke)
  let m = faceMats.get(url);
  if (!m) {
    const smoke = url === "proc:puff", map = smoke ? proc("puff", DRAW.puff, { size: 64, clamp: true }) : tex(url);
    const mat = new THREE.MeshLambertMaterial({ map, transparent: true, alphaTest: smoke ? .02 : .12, side: THREE.DoubleSide, forceSinglePass: true, depthWrite: !smoke, emissive: smoke ? 0x9a9893 : 0x2a2a2a, emissiveMap: map, emissiveIntensity: smoke ? 1 : .35 });
    mat.onBeforeCompile = (sh) => billShader(sh, false); mat.customProgramCacheKey = () => "g3bill";
    const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: .3 });
    depth.onBeforeCompile = (sh) => billShader(sh, true); depth.customProgramCacheKey = () => "g3billDepth";
    m = { mat, depth }; faceMats.set(url, m);
  }
  return m;
}

/* ---------- geometry helpers ---------- */
function box(g, w, h, d, mat, x, y, z, { cast = true, receive = true, rx = 0, ry = 0, rz = 0 } = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz, "YXZ"); m.castShadow = cast; m.receiveShadow = receive; g.add(m); return m;
}
function plane(g, w, h, mat, x, y, z, { rx = -HPI, ry = 0, rz = 0, cast = false, receive = true } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz, "YXZ"); m.castShadow = cast; m.receiveShadow = receive; g.add(m); return m;
}
function cyl(g, rt, rb, h, mat, x, y, z, { seg = 10, rx = 0, ry = 0, rz = 0, cast = true, receive = true, open = false } = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz, "YXZ"); m.castShadow = cast; m.receiveShadow = receive; g.add(m); return m;
}
function disc(g, r, mat, x, y, z, { seg = 24, cast = false, receive = true, sx = 1, sz = 1 } = {}) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, seg), mat);
  m.rotation.x = -HPI; m.position.set(x, y, z); m.scale.set(sx, sz, 1); m.castShadow = cast; m.receiveShadow = receive; g.add(m); return m;
}
function bar(g, a, b, r, mat, { seg = 6, cast = true } = {}) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  m.position.copy(A).add(B).multiplyScalar(.5); m.quaternion.setFromUnitVectors(UP, B.clone().sub(A).normalize());
  m.castShadow = cast; g.add(m); return m;
}
function instances(g, geo, mat, items, { cast = true, receive = true } = {}) {
  if (!items.length) return null;
  const im = new THREE.InstancedMesh(geo, mat, items.length), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(), E = new THREE.Euler();
  items.forEach((it, i) => { P.set(it.p[0], it.p[1], it.p[2]); E.set(it.rx || 0, it.ry || 0, it.rz || 0, "YXZ"); Q.setFromEuler(E); const s = it.s || 1; if (Array.isArray(s)) S.set(s[0], s[1], s[2]); else S.set(s, s, s); M.compose(P, Q, S); im.setMatrixAt(i, M); });
  im.instanceMatrix.needsUpdate = true; im.castShadow = cast; im.receiveShadow = receive; g.add(im); return im;
}
/* Camera-facing sprites are collected per artwork (world coordinates) and drawn as one instanced mesh
   each — anim: 0 still, 1 bee hover, 2 bird hop, 3 smoke puff. */
function billboard(ctx, url, w, x, y, z, { sink = .04, anim = 0, phase = 0 } = {}) {
  const h = w * aspectOf(url); let list = ctx.faces.get(url); if (!list) { list = []; ctx.faces.set(url, list); }
  list.push({ x, y: y - h * sink, z, w, h, anim, phase });
}
function faces(g, batches) {
  const M4 = new THREE.Matrix4();
  batches.forEach((list, url) => {
    const { mat, depth } = faceMat(url), geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, .5, 0);
    const im = new THREE.InstancedMesh(geo, mat, list.length), size = new Float32Array(list.length * 2), anim = new Float32Array(list.length), phase = new Float32Array(list.length);
    list.forEach((it, i) => { M4.makeTranslation(it.x, it.y, it.z); im.setMatrixAt(i, M4); size[i * 2] = it.w; size[i * 2 + 1] = it.h; anim[i] = it.anim; phase[i] = it.phase; });
    geo.setAttribute("g3size", new THREE.InstancedBufferAttribute(size, 2)); geo.setAttribute("g3anim", new THREE.InstancedBufferAttribute(anim, 1)); geo.setAttribute("g3phase", new THREE.InstancedBufferAttribute(phase, 1));
    im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; im.receiveShadow = false;
    const smoke = url === "proc:puff"; im.castShadow = !smoke; if (!smoke) im.customDepthMaterial = depth; if (smoke) im.renderOrder = 2;
    g.add(im);
  });
}
function spriteAdd(ctx, url, item) { let b = ctx.sprites.get(url); if (!b) { b = []; ctx.sprites.set(url, b); } b.push(item); }
const crossGeos = new Map();
function crossGeo(w, h, top = 0, topAsp = 1) { // two crossed quads standing on y = 0 (one draw call per batch), optionally a flat quad in the crown
  const key = `${w}|${h}|${top}|${topAsp}`; if (crossGeos.has(key)) return crossGeos.get(key);
  const a = new THREE.PlaneGeometry(w, h); a.translate(0, h / 2, 0); const b = a.clone(); b.rotateY(HPI); const parts = [a, b];
  if (top) { const c = new THREE.PlaneGeometry(w * .95, w * .95 * topAsp); c.rotateX(-HPI); c.translate(0, top, 0); parts.push(c); }
  const geo = mergeGeometries(parts, false); parts.forEach((p) => p.dispose()); crossGeos.set(key, geo); return geo;
}
function sprites(g, batches) { // dense crops: crossed planes plus a flat top-view plane per plant, instanced per artwork
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(), E = new THREE.Euler();
  batches.forEach((list, url) => {
    const { mat, depth } = billMat(url), asp = aspectOf(url);
    // artwork with no separate top view carries its flat quad in the same geometry
    const same = list.filter((it) => !it.top || it.top === url), other = list.filter((it) => it.top && it.top !== url);
    [[same, crossGeo(1, asp, asp * .6, asp)], [other, crossGeo(1, asp)]].forEach(([items, geo]) => {
      if (!items.length) return;
      const im = new THREE.InstancedMesh(geo, mat, items.length);
      items.forEach((it, i) => { P.set(it.x, it.y - it.w * asp * .08, it.z); E.set(0, it.r, 0); Q.setFromEuler(E); S.set(it.w, it.w, it.w); M4.compose(P, Q, S); im.setMatrixAt(i, M4); });
      im.instanceMatrix.needsUpdate = true; im.castShadow = true; im.receiveShadow = false; im.customDepthMaterial = depth; g.add(im);
    });
    // seen from above the crosses would read as thin lines, so a flat plane with the top-view artwork sits in the crown
    const tops = new Map();
    other.forEach((it) => { if (!tops.has(it.top)) tops.set(it.top, []); tops.get(it.top).push(it); });
    tops.forEach((items, turl) => {
      const tm = billMat(turl), tasp = aspectOf(turl), im = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), tm.mat, items.length);
      items.forEach((it, i) => { const h = it.w * asp; P.set(it.x, it.y + h * .6, it.z); E.set(-HPI, 0, it.r, "YXZ"); Q.setFromEuler(E); S.set(it.w * .95, it.w * .95 * tasp, 1); M4.compose(P, Q, S); im.setMatrixAt(i, M4); });
      im.instanceMatrix.needsUpdate = true; im.castShadow = false; im.receiveShadow = false; g.add(im);
    });
  });
}
function hipRoofGeo(w, d, rise, ov, hipIn) {
  const W = w + 2 * ov, D = d + 2 * ov, e = Math.min(W, D) / 2 * (hipIn ? 1 : 0), along = W >= D;
  const A = [-W / 2, 0, -D / 2], B = [W / 2, 0, -D / 2], C = [W / 2, 0, D / 2], Dd = [-W / 2, 0, D / 2];
  const R1 = along ? [-W / 2 + e, rise, 0] : [0, rise, -D / 2 + e], R2 = along ? [W / 2 - e, rise, 0] : [0, rise, D / 2 - e];
  // [triangle, uvSwap] — uv rows must run parallel to the eave of each face
  const faces = along
    ? [[[A, B, R2], 0], [[A, R2, R1], 0], [[C, Dd, R1], 0], [[C, R1, R2], 0], [[Dd, A, R1], 1], [[B, C, R2], 1]]
    : [[[A, B, R1], 0], [[B, C, R2], 1], [[B, R2, R1], 1], [[C, Dd, R2], 0], [[Dd, A, R1], 1], [[Dd, R1, R2], 1]];
  const pos = [], uv = [];
  faces.forEach(([tri, swap]) => {
    // wind every triangle counter-clockwise seen from above so the lit face points up
    const [a, b, c] = tri, ux = b[0] - a[0], uz = b[2] - a[2], vx = c[0] - a[0], vz = c[2] - a[2];
    const ny = uz * vx - ux * vz;
    (ny < 0 ? [a, c, b] : tri).forEach((p) => { pos.push(p[0], p[1], p[2]); uv.push((swap ? p[2] : p[0]) / 1.5, (swap ? p[0] : p[2]) / 1.5); });
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return { geo, corners: [A, B, C, Dd], ridge: [R1, R2], along, W, D };
}
function hipHeight(x, z, W, D, rise) { // height of a hip roof surface at (x, z) measured from its centre
  const along = W >= D, e = Math.min(W, D) / 2;
  const t1 = 1 - Math.abs(along ? z : x) / (Math.min(W, D) / 2);
  const t2 = 1 - Math.max(0, Math.abs(along ? x : z) - (Math.max(W, D) / 2 - e)) / e;
  return rise * Math.max(0, Math.min(t1, t2));
}
function ribbonGeo(pts, width) {
  const pos = [], uv = [], idx = []; let dist = 0;
  const hw = width / 2;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], prev = pts[Math.max(0, i - 1)], next = pts[Math.min(pts.length - 1, i + 1)];
    let dx = next.xM - prev.xM, dz = next.yM - prev.yM; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    if (i) dist += Math.hypot(p.xM - prev.xM, p.yM - prev.yM);
    pos.push(p.xM - dz * hw, 0, p.yM + dx * hw, p.xM + dz * hw, 0, p.yM - dx * hw);
    uv.push(dist / 1.2, 0, dist / 1.2, 1);
    if (i) { const b = (i - 1) * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  return geo;
}

/* ---------- reusable structures ---------- */
function tree(g, x, z, r, seed, M, y = 0, leafIdx = null) {
  if (y) { const tg = new THREE.Group(); tg.position.y = y; g.add(tg); g = tg; }
  const th = r * .55 + .3, leaf = M.leaf[leafIdx ?? Math.floor(srand(seed + 3) * 4)];
  const trunk = cyl(g, r * .1, r * .17, th + r * .7, M.bark, x, (th + r * .7) / 2, z, { seg: 7 });
  trunk.rotation.z = (srand(seed + 7) - .5) * .08;
  [-1, 1].forEach((s) => bar(g, [x, th * .75, z], [x + s * r * .45, th + r * .55, z + (srand(seed + 11) - .5) * r * .5], r * .045, M.bark));
  const s = 2 * r, top = th + r * .95;
  const canopy = (w, h, y, rx, ry, rz) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), leaf.mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz, "YXZ"); m.castShadow = true; m.customDepthMaterial = leaf.depth; g.add(m); return m; };
  const spin = srand(seed) * 6.28;
  // a lumpy solid crown (three overlapping spheres) carries the silhouette from every angle; leaf discs and
  // crossed planes soften it and fade out at the angles where they would read as plates or lines
  const blob = (rr, dx, dy, dz, sy) => { const m = new THREE.Mesh(new THREE.SphereGeometry(rr, 9, 7), leaf.core); m.position.set(x + dx, top - r * .12 + dy, z + dz); m.scale.set(1, sy, 1); m.rotation.y = spin + dx; m.castShadow = true; m.customDepthMaterial = leaf.depth; g.add(m); };
  blob(r * .8, 0, 0, 0, .82);
  blob(r * .58, Math.cos(spin) * r * .42, -r * .22, Math.sin(spin) * r * .42, .78);
  blob(r * .5, -Math.cos(spin + .9) * r * .4, -r * .1, -Math.sin(spin + .9) * r * .4, .8);
  canopy(s * .95, s * .95, top + r * .05, -HPI, spin, 0);
  canopy(s * .9, s * .9, top - r * .3, -HPI, spin + 1.3, 0);
  canopy(s * .8, s * .8, top - r * .55, -HPI, spin + .7, 0);
  [0, 1.05, 2.1].forEach((a, i) => canopy(s * (.8 + (i % 2) * .08), s * .8, top - r * .1, 0, a + srand(seed + i) * .3, 0));
}
/* Fruit trees are the decoration tree scaled by growth stage, plus fruit on the crown: small and green
   while maturing, full colour in the harvest window. Fruit is collected farm-wide, one instanced mesh per colour. */
const FRUIT = { apple: [0xd33a2e, .075], pear: [0xc9c95a, .07], peach: [0xe9905a, .07], plum: [0x5a3a7a, .055], cherry: [0xb3182a, .035], lemon: [0xf2d13a, .07], orange: [0xf08a2a, .08], citrus: [0xf08a2a, .075], fig: [0x5a3a5a, .06], olive: [0x3f5a33, .028], walnut: [0x6f8a48, .045], almond: [0x8fa85a, .04], avocado: [0x2f4a2a, .09] };
function fruitTree(g, ctx, x, z, size, stage, name, seed, M, off) {
  const grow = [0, 0, .3, .55, .82, 1][stage] || 0, r = Math.max(.32, Math.min(1.7, size * .42)) * grow;
  const key = Object.keys(FRUIT).find((k) => name.includes(k)) || "apple", [color, fr] = FRUIT[key];
  const leafIdx = key === "olive" ? 4 : /lemon|orange|citrus|fig|avocado/.test(key) ? 5 : null;
  tree(g, x, z, r, seed, M, 0, leafIdx);
  const mulch = disc(g, Math.min(1.1, r * .8 + .2), M.mulch, x, .015, z, { seg: 14 }); mulch.castShadow = false;
  if (stage < 4) bar(g, [x + .22, 0, z + .1], [x + .2, Math.min(1.5, r * 1.4 + .6), z + .08], .02, M.woodDark, { seg: 5 }); // stake for young trees
  // like the crop rows, a tree shows its harvest: fruit and a gold halo appear only in the harvest window
  if (stage < 5) return;
  ctx.growth.glows.push({ p: [off[0] + x, .012, off[1] + z], rx: -HPI, s: [r * 2.2 + 1.2, r * 2.2 + 1.2, 1] });
  const top = r * .55 + .3 + r * .95 - r * .12, n = Math.round(26 * Math.min(1, r / 1.2)), ripe = true;
  const fc = color, list = ctx.fruit.get(fc) || []; ctx.fruit.set(fc, list);
  for (let i = 0; i < n; i++) {
    const a = srand(seed * 7 + i * 3) * 6.283, b = (srand(seed * 11 + i * 5) - .5) * 2.4, rr = r * .8 * (.5 + srand(seed * 13 + i * 7) * .38);
    list.push({ p: [off[0] + x + Math.cos(a) * Math.cos(b) * rr, top + Math.sin(b) * rr * .82, off[1] + z + Math.sin(a) * Math.cos(b) * rr], s: (ripe ? fr : fr * .7) * Math.min(1, .55 + r * .4) });
  }
}
function buildFruit(g, ctx, M) {
  ctx.fruit.forEach((list, color) => instances(g, new THREE.SphereGeometry(1, 8, 6), M.fruit(color), list, { cast: false }));
}
/* Fences are collected in world coordinates and drawn as a handful of instanced meshes for the whole
   farm (posts, rails, pickets, caps) instead of a set per zone. */
function fence(ctx, segs, { pickets = false, post = 1.1, off = [0, 0] } = {}) {
  const F = pickets ? ctx.fences.picket : ctx.fences.plain, [ox, oz] = off;
  segs.forEach(([a, b]) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < .05) return;
    const ry = Math.atan2(-(b[1] - a[1]), b[0] - a[0]), n = Math.max(2, Math.ceil(len / (pickets ? .24 : 1.25)) + 1);
    for (let j = 0; j < n; j++) { const t = j / (n - 1), x = ox + a[0] + (b[0] - a[0]) * t, z = oz + a[1] + (b[1] - a[1]) * t; F.posts.push(pickets ? { p: [x, .41, z], ry } : { p: [x, post / 2, z], s: [1, post, 1] }); if (pickets) F.caps.push({ p: [x, .85, z], ry: HPI / 2 }); }
    (pickets ? [.28, .62] : [.5, .95]).forEach((h) => F.rails.push({ p: [ox + (a[0] + b[0]) / 2, h, oz + (a[1] + b[1]) / 2], ry, s: [len, 1, 1] }));
  });
}
function buildFences(g, ctx, M) {
  const P = ctx.fences.plain, K = ctx.fences.picket;
  instances(g, new THREE.CylinderGeometry(.05, .065, 1, 6), M.postWood, P.posts);
  instances(g, new THREE.BoxGeometry(1, .07, .05), M.railWood, P.rails);
  const pm = M.planks(.3, 1, 0xd8c39d);
  instances(g, new THREE.BoxGeometry(.07, .82, .025), pm, K.posts);
  instances(g, new THREE.ConeGeometry(.05, .06, 4), pm, K.caps, { cast: false });
  instances(g, new THREE.BoxGeometry(1, .05, .03), M.picketRail, K.rails);
}
function gate(g, x, z, width, ry, M, { pickets = false } = {}) {
  const gg = new THREE.Group(); gg.position.set(x, 0, z); gg.rotation.y = ry; g.add(gg);
  const pm = M.woodDark, fm = M.planks(.5, 1, 0xd2b98d);
  [-1, 1].forEach((s) => { box(gg, .13, 1.3, .13, pm, s * (width / 2 + .08), .65, 0); box(gg, .19, .05, .19, pm, s * (width / 2 + .08), 1.32, 0); });
  const inner = width - .04;
  [.3, 1.0].forEach((y) => box(gg, inner, .07, .05, fm, 0, y, 0));
  const n = pickets ? Math.max(3, Math.round(inner / .18)) : 3;
  for (let i = 0; i < n; i++) { const u = -inner / 2 + .06 + (i / (n - 1)) * (inner - .12); box(gg, pickets ? .06 : .05, pickets ? .95 : .85, .04, fm, u, pickets ? .62 : .63, .02); }
  bar(gg, [-inner / 2 + .05, .3, .03], [inner / 2 - .05, 1.0, .03], .025, fm);
  box(gg, .06, .08, .1, M.metal, inner / 2 + .06, .85, .05, { cast: false });
  return gg;
}
function contact(g, M, cx, cz, w, d, y = .0075) { // soft ambient-occlusion patch under a footprint
  const m = plane(g, w + 1.6, d + 1.6, M.contact, cx, y, cz); m.receiveShadow = false; return m;
}
function hedge(g, segs, M, { h = 1.5, t = .8 } = {}) {
  segs.forEach(([a, b]) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < .3) return;
    const m = box(g, len + t * .6, h, t, M.hedge(len / 1.6, h / 1.6), (a[0] + b[0]) / 2, h / 2, (a[1] + b[1]) / 2, { ry: Math.atan2(-(b[1] - a[1]), b[0] - a[0]) });
    m.position.y = h / 2 - .02;
  });
}
function shelter(g, x, z, w, d, M, ry = 0) { // open-sided field shelter: posts, plank back wall, mono-pitch metal roof
  const sg = new THREE.Group(); sg.position.set(x, 0, z); sg.rotation.y = ry; g.add(sg);
  const hi = 2.4, lo = 1.9;
  [[-w / 2, -d / 2, hi], [w / 2, -d / 2, hi], [-w / 2, d / 2, lo], [w / 2, d / 2, lo], [0, -d / 2, hi], [0, d / 2, lo]].forEach(([px, pz, ph]) => box(sg, .12, ph, .12, M.woodDark, px, ph / 2, pz));
  box(sg, w, hi - .3, .06, M.planks(w / 1.4, 1, 0xa88a62), 0, (hi - .3) / 2, -d / 2 + .05);
  const ang = Math.atan2(hi - lo, d), slope = Math.hypot(d + .5, hi - lo);
  box(sg, w + .5, .08, slope, M.metalRoof((w + .5) / 2.4, slope / 2.4), 0, (hi + lo) / 2 + .04, 0, { rx: ang });
  box(sg, w * .8, .35, d * .7, M.hay, 0, .18, .1);
  return sg;
}
function solarPanels(g, cx, cz, W, D, H, rise, M) { // a grid of panels on the roof slope that faces the camera
  const along = W >= D, e = Math.min(W, D) / 2;
  const slopeLen = Math.hypot(e, rise), ang = Math.atan2(rise, e), pw = .8, ph = 1.25;
  const across = (along ? W : D) - e - 1.2, n = Math.min(7, Math.floor(across / (pw + .06))); if (n < 2) return;
  const rows = slopeLen > 3.4 ? 2 : 1, items = [], frames = [], shift = Math.max(0, (across - n * (pw + .06)) / 2 - .2);
  for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) {
    const u = (i - (n - 1) / 2) * (pw + .06) - shift, t = rows === 1 ? .5 : .3 + r * .34; // t: fraction down the slope from the ridge
    const y = H + rise * (1 - t), off = e * t;
    if (along) { items.push({ p: [cx + u, y + .05, cz + off], rx: ang }); frames.push({ p: [cx + u, y + .03, cz + off], rx: ang }); }
    else { items.push({ p: [cx - off, y + .05, cz + u], rz: ang }); frames.push({ p: [cx - off, y + .03, cz + u], rz: ang }); }
  }
  instances(g, new THREE.BoxGeometry(along ? pw : ph, .03, along ? ph : pw), M.solar, items, { cast: false });
  instances(g, new THREE.BoxGeometry(along ? pw + .08 : ph + .08, .03, along ? ph + .08 : pw + .08), M.solarFrame, frames, { cast: false });
}
function smooth(pts, iterations = 2) { // Chaikin corner-cutting so paths turn on curves instead of right angles
  let out = pts;
  for (let k = 0; k < iterations; k++) {
    if (out.length < 3) return out;
    const next = [out[0]];
    for (let i = 0; i < out.length - 1; i++) {
      const a = out[i], b = out[i + 1], L = Math.hypot(b.xM - a.xM, b.yM - a.yM), f = Math.min(.25, 1.2 / Math.max(L, .01));
      next.push({ xM: a.xM + (b.xM - a.xM) * f, yM: a.yM + (b.yM - a.yM) * f }, { xM: a.xM + (b.xM - a.xM) * (1 - f), yM: a.yM + (b.yM - a.yM) * (1 - f) });
    }
    next.push(out[out.length - 1]); out = next;
  }
  return out;
}
function fixtures(w, d) {
  return (m, f, u, y, off = 0, { rx = 0, rz = 0 } = {}) => {
    const ry = f === "S" ? 0 : f === "N" ? Math.PI : f === "W" ? -HPI : HPI;
    if (f === "S") m.position.set(u, y, d / 2 + off);
    else if (f === "N") m.position.set(-u, y, -d / 2 - off);
    else if (f === "W") m.position.set(-w / 2 - off, y, u);
    else m.position.set(w / 2 + off, y, -u);
    m.rotation.set(rx, ry, rz, "YXZ"); m.castShadow = true; m.receiveShadow = true; return m;
  };
}
function mesh(geoArgs, mat, kind = "box") {
  const geo = kind === "box" ? new THREE.BoxGeometry(...geoArgs) : new THREE.PlaneGeometry(...geoArgs);
  return new THREE.Mesh(geo, mat);
}
function windowAt(dg, put, f, u, y, W, Hh, M, { shutters = false, sill = true } = {}) {
  dg.add(put(mesh([W + .16, Hh + .16, .06], M.frame), f, u, y, .03));
  dg.add(put(mesh([W, Hh], M.winGlass, "plane"), f, u, y, .065));
  dg.add(put(mesh([.035, Hh, .02], M.frame), f, u, y, .07));
  dg.add(put(mesh([W, .035, .02], M.frame), f, u, y, .07));
  if (sill) dg.add(put(mesh([W + .28, .06, .16], M.frame), f, u, y - Hh / 2 - .09, .08));
  if (shutters) [-1, 1].forEach((s) => dg.add(put(mesh([W * .45, Hh + .12, .035], M.shutter), f, u + s * (W / 2 + .1 + W * .225), y, .02)));
}
function doorAt(dg, put, f, u, W, Hh, kind, M, d) {
  dg.add(put(mesh([W + .18, Hh + .1, .07], kind === "house" ? M.frame : M.woodDark), f, u, Hh / 2 + .03, .035));
  if (kind === "barn") {
    dg.add(put(mesh([W * 1.9, .1, .08], M.metal), f, u, Hh + .16, .1, {}));
    [-1, 1].forEach((s) => { dg.add(put(mesh([.06, .12, .06], M.metal), f, u + s * W * .22, Hh + .09, .1)); });
    const pm = M.planks(1, 2, 0x8f4a30), bm = M.batten;
    [-1, 1].forEach((s) => {
      const pw = W / 2 - .03, pu = u + s * W / 4;
      dg.add(put(mesh([pw, Hh, .06], pm), f, pu, Hh / 2, .06));
      dg.add(put(mesh([pw, .09, .02], bm), f, pu, Hh - .1, .095)); dg.add(put(mesh([pw, .09, .02], bm), f, pu, .1, .095));
      dg.add(put(mesh([.09, Math.hypot(pw, Hh - .2) - .1, .02], bm), f, pu, Hh / 2, .095, { rz: Math.atan2(pw, Hh - .2) }));
      dg.add(put(mesh([.09, Math.hypot(pw, Hh - .2) - .1, .02], bm), f, pu, Hh / 2, .095, { rz: -Math.atan2(pw, Hh - .2) }));
    });
    dg.add(put(mesh([.05, .22, .04], M.metal), f, u - .08, Hh * .48, .11));
    return;
  }
  dg.add(put(mesh([W, Hh, .05], kind === "house" ? M.door : M.doorWood), f, u, Hh / 2, .05));
  if (kind === "house") {
    [[.22, -.32], [-.22, -.32], [.22, .28], [-.22, .28]].forEach(([dx, dy]) => dg.add(put(mesh([.3, kind === "house" ? .6 : .5, .012], M.panel), f, u + dx, Hh / 2 + dy, .08)));
    dg.add(put(new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), M.brass), f, u + W * .36, Hh * .48, .09));
    // two stone steps and a small canopy over the door
    dg.add(put(mesh([W + .6, .15, .42], M.concrete), f, u, .075, .21));
    dg.add(put(mesh([W + .9, .08, .4], M.concrete), f, u, .04, .62));
    dg.add(put(mesh([W + .9, .05, .62], M.slate(1, .4)), f, u, Hh + .34, .31, { rx: .28 }));
    if (f === "S") [-1, 1].forEach((s) => bar(dg, [u + s * (W / 2 + .05), Hh + .02, d / 2], [u + s * (W / 2 + .05), Hh + .27, d / 2 + .56], .022, M.metal));
  } else {
    const bm = M.battenDark;
    dg.add(put(mesh([W - .08, .08, .02], bm), f, u, Hh - .12, .08)); dg.add(put(mesh([W - .08, .08, .02], bm), f, u, .12, .08));
    dg.add(put(mesh([.08, Math.hypot(W - .1, Hh - .26) - .08, .02], bm), f, u, Hh / 2, .08, { rz: Math.atan2(W - .1, Hh - .26) }));
    dg.add(put(mesh([.05, .2, .03], M.metal), f, u + W * .36, Hh * .48, .09));
  }
}
function hipRoof(g, cx, cz, w, d, H, rise, ov, roofMat, capMat, M) {
  const { geo, corners, ridge, along, W, D } = hipRoofGeo(w, d, rise, ov, true);
  const roof = new THREE.Mesh(geo, roofMat); roof.position.set(cx, H, cz); roof.castShadow = true; roof.receiveShadow = true; g.add(roof);
  const at = (p) => [cx + p[0], H + p[1], cz + p[2]];
  if (Math.hypot(ridge[1][0] - ridge[0][0], ridge[1][2] - ridge[0][2]) > .05) bar(g, at(ridge[0]), at(ridge[1]), .07, capMat, { seg: 5 });
  corners.forEach((c, i) => { const r = along ? (i === 0 || i === 3 ? ridge[0] : ridge[1]) : (i < 2 ? ridge[0] : ridge[1]); bar(g, at(c), at(r), .055, capMat, { seg: 5 }); });
  // fascia boards, gutters on the two sunny eaves, downpipes
  box(g, W, .15, .05, M.frame, cx, H + .02, cz + D / 2, { cast: false }); box(g, W, .15, .05, M.frame, cx, H + .02, cz - D / 2, { cast: false });
  box(g, .05, .15, D, M.frame, cx - W / 2, H + .02, cz, { cast: false }); box(g, .05, .15, D, M.frame, cx + W / 2, H + .02, cz, { cast: false });
  bar(g, [cx - W / 2, H - .07, cz + D / 2 + .06], [cx + W / 2, H - .07, cz + D / 2 + .06], .05, M.zinc, { cast: false });
  bar(g, [cx - W / 2 - .06, H - .07, cz - D / 2], [cx - W / 2 - .06, H - .07, cz + D / 2], .05, M.zinc, { cast: false });
  [[cx - W / 2 + .12, cz + D / 2 + .06], [cx + W / 2 - .12, cz + D / 2 + .06]].forEach(([x, z]) => cyl(g, .035, .035, H - .2, M.zinc, x, (H - .2) / 2 + .1, z, { seg: 6, cast: false }));
  return roof;
}
function gableRoof(g, cx, cz, w, d, H, rise, ov, roofMat, wallMat, alongX, capMat, M, { thick = .1, gutters = true } = {}) {
  const L = alongX ? w + 2 * ov : d + 2 * ov, span = alongX ? d + 2 * ov : w + 2 * ov;
  const slope = Math.hypot(span / 2, rise), ang = Math.atan2(rise, span / 2);
  [-1, 1].forEach((side) => {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(alongX ? L : slope, thick, alongX ? slope : L), roofMat);
    const off = side * span / 4;
    slab.position.set(cx + (alongX ? 0 : off), H + rise / 2 + thick / 2, cz + (alongX ? off : 0));
    if (alongX) slab.rotation.x = side * ang; else slab.rotation.z = -side * ang;
    slab.castShadow = true; slab.receiveShadow = true; g.add(slab);
  });
  if (alongX) box(g, L + .1, .12, .24, capMat, cx, H + rise + thick / 2 + .02, cz); else box(g, .24, .12, L + .1, capMat, cx, H + rise + thick / 2 + .02, cz);
  const tri = new THREE.Shape(); tri.moveTo(-span / 2 + ov, 0); tri.lineTo(span / 2 - ov, 0); tri.lineTo(0, rise); tri.closePath();
  [-1, 1].forEach((side) => {
    const m = new THREE.Mesh(new THREE.ShapeGeometry(tri), wallMat);
    if (alongX) { m.position.set(cx + side * (w / 2 - .005), H, cz); m.rotation.y = side > 0 ? HPI : -HPI; }
    else { m.position.set(cx, H, cz + side * (d / 2 - .005)); m.rotation.y = side > 0 ? 0 : Math.PI; }
    m.castShadow = true; g.add(m);
    // barge boards along the gable edges
    [-1, 1].forEach((k) => {
      const a = alongX ? [cx + side * (w / 2 + .02), H, cz + k * span / 2] : [cx + k * span / 2, H, cz + side * (d / 2 + .02)];
      const b = alongX ? [cx + side * (w / 2 + .02), H + rise + thick, cz] : [cx, H + rise + thick, cz + side * (d / 2 + .02)];
      bar(g, a, b, .04, M.frame, { seg: 4, cast: false });
    });
  });
  // fascia + gutters along the two eaves, downpipes on the sunny one
  [-1, 1].forEach((side) => {
    if (alongX) { box(g, L, .14, .05, M.frame, cx, H + .04, cz + side * span / 2, { cast: false }); if (gutters) bar(g, [cx - L / 2, H - .06, cz + side * (span / 2 + .06)], [cx + L / 2, H - .06, cz + side * (span / 2 + .06)], .05, M.zinc, { cast: false }); }
    else { box(g, .05, .14, L, M.frame, cx + side * span / 2, H + .04, cz, { cast: false }); if (gutters) bar(g, [cx + side * (span / 2 + .06), H - .06, cz - L / 2], [cx + side * (span / 2 + .06), H - .06, cz + L / 2], .05, M.zinc, { cast: false }); }
  });
  if (gutters) {
    const pts = alongX ? [[cx - L / 2 + .15, cz + span / 2 + .06], [cx + L / 2 - .15, cz + span / 2 + .06]] : [[cx - span / 2 - .06, cz + L / 2 - .15], [cx - span / 2 - .06, cz - L / 2 + .15]];
    pts.forEach(([x, z]) => cyl(g, .035, .035, H - .2, M.zinc, x, (H - .2) / 2 + .1, z, { seg: 6, cast: false }));
  }
}
function building(g, w, d, kind, M, { clay = false, tag = (m) => m, ctx = null, off = [0, 0] } = {}) {
  const cx = w / 2, cz = d / 2, house = kind === "house", barn = kind === "barn", small = Math.min(w, d) < 4, alongX = w >= d;
  const bill = (url, bw, x, y, z, o) => ctx && billboard(ctx, url, bw, off[0] + x, y, off[1] + z, o);
  const H = house ? 3.0 : barn ? (small ? 2.4 : 4.0) : (small ? 2.3 : 2.6);
  const wallMat = house ? M.stucco : barn ? M.planks(w / 1.4, H / 2.6, 0xb0553a) : M.planks(w / 1.4, H / 2.6);
  contact(g, M, cx, cz, w, d);
  tag(box(g, w + .12, .32, d + .12, M.plinth(w / 1.5), cx, .16, cz));
  tag(box(g, w, H, d, wallMat, cx, H / 2, cz));
  const rise = Math.min(w, d) / 2 * (house ? .6 : barn ? .7 : .55);
  const dg = new THREE.Group(); dg.position.set(cx, 0, cz); g.add(dg);
  const put = fixtures(w, d);
  if (house) {
    const ov = .45, roofMat = clay ? M.tiles(1, 1) : M.slate(1, 1); // per-roof repeat lives in the geometry uv
    tag(hipRoof(g, cx, cz, w, d, H, rise, ov, roofMat, clay ? M.ridgeClay : M.ridgeSlate, M));
    // chimney
    const chx = w * .3 * (alongX ? 1 : .4), chz = -d * .18 * (alongX ? .4 : 1);
    const hh = hipHeight(chx, chz, w + 2 * ov, d + 2 * ov, rise);
    box(g, .55, 1.2, .55, M.brick(1.2, 2.2), cx + chx, H + hh - .2 + .6, cz + chz);
    box(g, .68, .08, .68, M.concrete, cx + chx, H + hh + .44, cz + chz, { cast: false });
    cyl(g, .09, .1, .3, M.terracotta, cx + chx + .12, H + hh + .62, cz + chz, { seg: 8 });
    cyl(g, .09, .1, .3, M.terracotta, cx + chx - .12, H + hh + .62, cz + chz, { seg: 8 });
    for (let i = 0; i < 6; i++) bill("proc:puff", .85, cx + chx, H + hh + .7, cz + chz, { sink: .5, anim: 3, phase: i / 6 }); // a thread of smoke
    // door, windows
    const door = .95, doorH = 2.05, wy = 1.5, ww = .9, wh = 1.1;
    doorAt(dg, put, "S", 0, door, doorH, "house", M, d);
    for (let k = 0; ; k++) { const u = door / 2 + .55 + ww / 2 + k * 1.9; if (u + ww / 2 + .9 > w / 2) break; windowAt(dg, put, "S", u, wy, ww, wh, M, { shutters: true }); windowAt(dg, put, "S", -u, wy, ww, wh, M, { shutters: true }); }
    const nE = Math.max(0, Math.floor((d - 1.0) / 2.0));
    for (let i = 0; i < nE; i++) { const u = (i - (nE - 1) / 2) * 2.0; windowAt(dg, put, "W", u, wy, ww, wh, M); windowAt(dg, put, "E", u, wy, ww, wh, M); }
    const nN = Math.max(0, Math.floor((w - 1.0) / 2.2));
    for (let i = 0; i < nN; i++) windowAt(dg, put, "N", (i - (nN - 1) / 2) * 2.2, wy, ww, wh, M);
    // a lamp beside the door
    dg.add(put(mesh([.08, .14, .08], M.brass), "S", door / 2 + .3, doorH - .2, .06));
    solarPanels(g, cx, cz, w + 2 * ov, d + 2 * ov, H, rise, M);
    // paved apron with a clipped hedge border, shrubs at the corners and flowers by the door
    const ap = 1.3;
    plane(g, w + 2 * ap, d + 2 * ap, M.pavers((w + 2 * ap) / 1.4, (d + 2 * ap) / 1.4), cx, .009, cz);
    const hx0 = -ap + .3, hx1 = w + ap - .3, hz0 = -ap + .3, hz1 = d + ap - .3, gapW = 2.2;
    hedge(g, [[[hx0, hz0], [hx1, hz0]], [[hx0, hz0], [hx0, hz1]], [[hx1, hz0], [hx1, hz1]], [[hx0, hz1], [cx - gapW / 2, hz1]], [[cx + gapW / 2, hz1], [hx1, hz1]]], M, { h: .55, t: .45 });
    [[hx0 + .7, hz0 + .7], [hx1 - .7, hz0 + .7], [hx0 + .7, hz1 - .7], [hx1 - .7, hz1 - .7]].forEach(([x, zz]) => bill(art("prop-bush"), 1.1, x, 0, zz, { sink: .06 }));
    bill(art("prop-flowers"), .8, cx - door / 2 - .9, 0, d + .55, { sink: .06 });
    bill(art("prop-flowers"), .8, cx + door / 2 + .9, 0, d + .55, { sink: .06 });
  } else {
    const rot = alongX ? 0 : HPI, L = alongX ? w : d, slope = Math.hypot((alongX ? d : w) / 2 + .35, rise);
    const roofMat = clay ? M.tiles(L / 1.5, slope / 1.5, rot) : M.metalRoof(L / 2.4, slope / 2.4, rot);
    gableRoof(g, cx, cz, w, d, H, rise, .35, roofMat, wallMat, alongX, clay ? M.ridgeClay : M.zinc, M);
    if (barn) {
      const dw = Math.min(2.8, w * .42), dh = Math.min(H * .78, 3.0);
      doorAt(dg, put, "S", 0, dw, dh, "barn", M, d);
      if (w > dw + 2.6) [-1, 1].forEach((s) => windowAt(dg, put, "S", s * (dw / 2 + 1.0), H * .6, .7, .7, M, { sill: false }));
      // hayloft door + hoist beam on the gable end that faces the camera
      const gf = alongX ? "W" : "S", gy = H + rise * .32;
      if (!small) {
        dg.add(put(mesh([1.0, 1.15, .06], M.woodDark), gf, 0, gy, .03));
        dg.add(put(mesh([.86, 1.0, .04], M.planks(1, 1, 0x7d4a33)), gf, 0, gy, .06));
        const bx = alongX ? -w / 2 : 0, bz = alongX ? 0 : d / 2;
        bar(dg, [bx, H + rise * .8, bz], [bx - (alongX ? .7 : 0), H + rise * .8, bz + (alongX ? 0 : .7)], .05, M.woodDark);
      }
      if (!small) {
        // cupola with louvres and a weather vane
        const cy = H + rise + .35;
        box(g, .7, .6, .7, M.planks(1, 1, 0xf0e8d6), cx, cy, cz);
        [-1, 1].forEach((s) => { for (let i = 0; i < 3; i++) box(g, .5, .04, .03, M.metal, cx, cy - .18 + i * .16, cz + s * .36, { cast: false }); });
        const cap = new THREE.Mesh(hipRoofGeo(.7, .7, .3, .1, true).geo, M.zinc); cap.position.set(cx, cy + .3, cz); cap.castShadow = true; g.add(cap);
        cyl(g, .015, .015, .5, M.metal, cx, cy + .85, cz, { seg: 5, cast: false });
        box(g, .32, .04, .015, M.metal, cx, cy + 1.02, cz, { cast: false, ry: .6 });
        box(g, .1, .1, .015, M.metal, cx + .16, cy + 1.02, cz, { cast: false, ry: .6 });
      }
      plane(g, w + 1.0, 2.2, M.concrete, cx, .008, d + 1.0);
      // water trough and hay by the door
      const tx = Math.min(w / 2 - .5, dw / 2 + 1.2);
      dg.add(put(mesh([1.2, .45, .5], M.zinc), "S", tx, .225, .35));
      dg.add(put(mesh([1.12, .42], M.water, "plane"), "S", tx, .43, .35, { rx: -HPI }));
      if (w > 4) { dg.add(put(mesh([.9, .5, .5], M.hay), "S", -tx, .25, .35)); dg.add(put(mesh([.9, .5, .5], M.hay), "S", -tx + .08, .75, .3)); }
    } else {
      const wide = w > 2.4;
      doorAt(dg, put, "S", wide ? -w * .18 : 0, .9, Math.min(1.95, H - .3), "shed", M, d);
      if (wide) windowAt(dg, put, "S", w * .25, H * .58, .7, .7, M, { sill: true });
      if (d > 2.6) windowAt(dg, put, "W", 0, H * .58, .7, .7, M, { sill: true });
      // crates and a barrel beside the shed
      dg.add(put(mesh([.6, .4, .6], M.planks(1, 1, 0xd0b78b)), "W", d / 2 - .55, .2, .45));
      dg.add(put(mesh([.5, .35, .5], M.planks(1, 1, 0xd0b78b)), "W", d / 2 - .55, .57, .45, { ry: .2 }));
      cyl(g, .28, .28, .75, M.barrel, w + .55, .375, d * .3, { seg: 12 });
    }
  }
  dg.traverse((m) => { if (m.isMesh) tag(m); });
  return { H, rise };
}

/* ---------- zones ---------- */
/* Every plant of a zone (position, size, crop, stage) plus one segment per planted row carrying the
   plot's growth state — the segments drive the stage markers, foliage lines, harvest glow and tooltips. */
function plantingsOf(z, plots, crops, today) {
  const out = [], rows = [], vertical = z.rowAxis === "vertical", orchard = z.type === "orchard";
  const push = (x, y, size, crop, stage) => out.push({ x, y, size, crop, stage });
  const info = (plot) => {
    const g = growthOf(plot, crops.get(plot.crop), today);
    const left = plot.harvestDate && !g.waiting ? Math.round(dayNum(plot.harvestDate) - dayNum(today)) : null;
    return { id: plot.id, crop: plot.crop, name: plot.name, count: plot.plantCount || plot.qty || 0, stage: g.index, progress: g.progress, estimated: g.estimated, left, status: plot.status };
  };
  layoutPlots(z, plots).filter((p) => p.layout.version === 2 && p.layout.pattern !== "scatter").forEach((plot) => {
    const pi = info(plot);
    plantingRows(z, plot).forEach((row) => {
      const n = Math.min(90, row.points.length), size = Math.min(row.gapM * .95, row.pitchM * 1.15 * (row.points.length / Math.max(1, n)), .85);
      for (let j = 0; j < n; j++) { const q = row.points[Math.floor(((j + .5) * row.points.length) / n)]; push(q.xM, q.yM, size, plot.crop, pi.stage); }
      if (row.points.length) {
        const al = row.points.map((q) => (vertical ? q.yM : q.xM)), cr = row.points.map((q) => (vertical ? q.xM : q.yM));
        rows.push({ ...pi, vertical, c: cr.reduce((a, b) => a + b, 0) / cr.length, a0: Math.min(...al) - row.pitchM * .4, a1: Math.max(...al) + row.pitchM * .4, gap: row.gapM, size });
      }
    });
  });
  const v1 = plantedRows(z, plots).filter((r) => r.planting?.layout.version !== 2);
  const cross = vertical ? z.wM : z.hM, along = vertical ? z.hM : z.wM;
  const gap = cross / bedRows(z), margin = Math.min(.14, along * .07);
  v1.forEach((row, i) => {
    if (!row.planting) return;
    const pos = row.atM ?? (i + .5) * gap, start = row.pitch ? 0 : margin, length = row.pitch ? row.planting.layout.lengthM : (along - margin * 2) * row.fraction;
    const pi = info(row.planting);
    const n = Math.min(orchard ? 12 : 90, row.count || (row.planting && !row.planting.plantCount ? 4 : 0));
    const size = Math.min((row.pitch || gap) * .95, (length / Math.max(1, n)) * 1.15, orchard ? 4 : .85);
    for (let j = 0; j < n; j++) { const at = start + plantPosition(row, j, n) * length; push(vertical ? pos : at, vertical ? at : pos, size, row.planting.crop, pi.stage); }
    rows.push({ ...pi, vertical, c: pos, a0: start, a1: start + length, gap: row.pitch || gap, size });
  });
  plots.filter((p) => p.zone === z.id && p.status !== "harvested" && p.layout?.pattern === "scatter").forEach((p) => {
    const pi = info(p), pts = p.layout.points || [];
    pts.forEach((q) => push(q.xM, q.yM, Math.min(4, (p.layout.spacingCM / 100) * .9), p.crop, pi.stage));
    if (pts.length) { const cx = pts.reduce((a, q) => a + q.xM, 0) / pts.length, cy = pts.reduce((a, q) => a + q.yM, 0) / pts.length; rows.push({ ...pi, vertical: false, c: cy, a0: cx, a1: cx, gap: .5, size: .5, scatter: true }); }
  });
  return { plants: out, rows };
}
function rowLines(z) { // centre lines of the bed rows, in zone-local metres
  const vertical = z.rowAxis === "vertical", cross = vertical ? z.wM : z.hM, along = vertical ? z.hM : z.wM, n = bedRows(z), gap = cross / n, out = [];
  for (let i = 0; i < n; i++) { const c = (i + .5) * gap; out.push(vertical ? { x: c, z: along / 2, len: along, ry: HPI, gap } : { x: along / 2, z: c, len: along, ry: 0, gap }); }
  return out;
}
function soilMound(w, d, h, mat) {
  const geo = new THREE.PlaneGeometry(w, d, 10, 8), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const u = p.getX(i) / w + .5, v = p.getY(i) / d + .5; p.setZ(i, h * Math.sin(Math.PI * u) * Math.sin(Math.PI * v)); }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat); m.rotation.x = -HPI; m.receiveShadow = true; return m;
}
function tuftsIn(ctx, count, seed, area, { y = 0, off = [0, 0] } = {}) { // area: () => [x, z]; collected farm-wide, drawn once
  for (let i = 0; i < count; i++) { const [x, z] = area(i); if (x == null) continue; const s = .7 + srand(seed + i) * .7, ry = srand(seed + i + 5) * 3; ctx.tufts.push({ p: [off[0] + x, y + .16 * s, off[1] + z], ry, s }); }
}
function buildTufts(g, ctx, M) { instances(g, crossGeo(.42, .34), M.tuft, ctx.tufts.map((t) => ({ ...t, p: [t.p[0], t.p[1] - .17 * t.s, t.p[2]] })), { cast: false, receive: false }); }
function pots(ctx, items, plantsList, off = [0, 0]) { // items: [{x, y, z}] — pot + soil + a small plant sprite, collected farm-wide
  items.forEach((it, i) => { const [crop, stage] = plantsList[i % plantsList.length]; ctx.pots.push({ x: off[0] + it.x, y: it.y, z: off[1] + it.z }); spriteAdd(ctx, cropArtwork(crop, stage, "side"), { x: off[0] + it.x, y: it.y + .19, z: off[1] + it.z, w: .28, r: (srand(i + 11) - .5) * .6, top: cropArtwork(crop, stage, "top") }); });
}
function buildPots(g, ctx, M) {
  const items = ctx.pots; if (!items.length) return;
  instances(g, new THREE.CylinderGeometry(.13, .1, .22, 9, 1, true), M.terracottaOpen, items.map((it) => ({ p: [it.x, it.y + .11, it.z] })));
  instances(g, new THREE.TorusGeometry(.13, .018, 5, 12), M.terracotta, items.map((it) => ({ p: [it.x, it.y + .215, it.z], rx: HPI })), { cast: false });
  instances(g, new THREE.CircleGeometry(.12, 9), M.soil(1, 1), items.map((it) => ({ p: [it.x, it.y + .19, it.z], rx: -HPI })), { cast: false });
}
function benchSlatted(g, M, bx, bz, bw, bd, y = .8) {
  const legs = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => ({ p: [bx + sx * (bw / 2 - .1), y / 2, bz + sz * (bd / 2 - .1)] }));
  instances(g, new THREE.BoxGeometry(.07, y, .07), M.woodDark, legs);
  box(g, bw, .06, .08, M.woodDark, bx, y - .06, bz - bd / 2 + .12, { cast: false }); box(g, bw, .06, .08, M.woodDark, bx, y - .06, bz + bd / 2 - .12, { cast: false });
  const n = Math.max(3, Math.round(bd / .11)), slats = [];
  for (let i = 0; i < n; i++) slats.push({ p: [bx, y, bz - bd / 2 + (i + .5) * (bd / n)], s: [bw, 1, .7] });
  instances(g, new THREE.BoxGeometry(1, .035, bd / n), M.wood, slats);
}

function buildZone(z, ctx) {
  const { data, crops, M } = ctx;
  const g = new THREE.Group(); g.position.set(z.xM, 0, z.yM);
  const w = z.wM, d = z.hM, cx = w / 2, cz = d / 2, plant = isPlantZone(z.type), oval = z.shape === "oval", off = [z.xM, z.yM];
  const bill = (url, bw, x, y, zz, o) => billboard(ctx, url, bw, z.xM + x, y, z.yM + zz, o); // farm-wide collectors take world coordinates
  const tag = (m) => { m.userData.zoneId = z.id; return m; }; // taps use the zone hit box, not the detail meshes
  const plots = data.garden?.plots || [];
  const grown = plant ? plantingsOf(z, plots, crops, ctx.todayKey) : { plants: [], rows: [] };
  let plants = grown.plants; const prows = grown.rows;
  let floor = 0;
  if (z.type === "raised" || z.type === "herbs" || z.type === "veg") {
    if (z.type === "raised") {
      const H = .38, t = .05, bm = M.planks(w / 1.2, 1, 0xd0b487);
      // two boards high on every side, corner posts, soil mound, drip lines
      [[cx, 0, w + .06, t, 0], [cx, d, w + .06, t, 0], [0, cz, t, d, HPI], [w, cz, t, d, HPI]].forEach(([x, zz, bw, bd]) => {
        tag(box(g, bw, H / 2 - .01, bd, bm, x, H / 4, zz)); tag(box(g, bw, H / 2 - .01, bd, bm, x, H * .75, zz));
      });
      [[0, 0], [w, 0], [0, d], [w, d]].forEach(([x, zz]) => tag(box(g, .1, H + .08, .1, M.woodDark, x, (H + .08) / 2, zz)));
      floor = H - .07;
      const soil = soilMound(w - .02, d - .02, .05, M.soil(w / 1.2, d / 1.2)); soil.position.set(cx, floor, cz); tag(soil); g.add(soil);
      const lines = rowLines(z); instances(g, new THREE.BoxGeometry(1, .02, .02), M.rubber, lines.map((l) => ({ p: [l.x, floor + .05, l.z], ry: l.ry, s: [l.len - .3, 1, 1] })), { cast: false });
    } else if (z.type === "herbs") {
      const H = .2, sm = M.stone(w / .8, .4, 0xd8d2c4);
      [[cx, 0, w + .22, .22], [cx, d, w + .22, .22], [0, cz, .22, d], [w, cz, .22, d]].forEach(([x, zz, bw, bd]) => tag(box(g, bw, H, bd, sm, x, H / 2, zz)));
      floor = H - .06;
      const soil = soilMound(w, d, .04, M.soil(w / 1.2, d / 1.2)); soil.position.set(cx, floor, cz); tag(soil); g.add(soil);
      // gravel strips between the rows
      const lines = rowLines(z), gm = M.gravel(1, 1);
      for (let i = 1; i < lines.length; i++) { const a = lines[i - 1], b = lines[i]; box(g, a.ry ? .16 : (a.len - .2), .015, a.ry ? (a.len - .2) : .16, gm, (a.x + b.x) / 2, floor + .04, (a.z + b.z) / 2, { cast: false }); }
    } else {
      // in-ground vegetable rows: ridges and furrows, a low board edge
      const soil = plane(g, w, d, M.soil(w / 1.2, d / 1.2, 0xd8cdbd), cx, .012, cz); tag(soil);
      const lines = rowLines(z), rh = .12;
      instances(g, new THREE.CylinderGeometry(1, 1, 1, 10, 1, false, 0, Math.PI), M.soil(3, 1), lines.map((l) => ({ p: [l.x, .01, l.z], ry: l.ry, rz: HPI, s: [rh, l.len - .2, Math.min(.34, l.gap * .42)] })));
      floor = rh - .02;
      [[cx, -.02, w + .08, .06], [cx, d + .02, w + .08, .06], [-.02, cz, .06, d], [w + .02, cz, .06, d]].forEach(([x, zz, bw, bd]) => tag(box(g, bw, .1, bd, M.woodDark, x, .05, zz, { cast: false })));
    }
  } else if (z.type === "container") {
    const patio = plane(g, w, d, M.stone(w / 1.1, d / 1.1, 0xd6d0c2), cx, .012, cz); tag(patio);
    plants = plants.slice(0, 30);
    const potted = plants.length ? plants : [];
    if (!potted.length) { const nx = Math.max(1, Math.floor(w / .8)), nz = Math.max(1, Math.floor(d / .8)); for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) potted.push({ x: ((i + .5) * w) / nx, y: ((j + .5) * d) / nz, size: .6 }); }
    potted.forEach((p) => {
      const r = Math.max(.16, Math.min(.34, (p.size || .6) * .42));
      tag(cyl(g, r, r * .78, .34, M.terracotta, p.x, .17, p.y, { seg: 12 }));
      cyl(g, r + .025, r + .025, .05, M.terracotta, p.x, .335, p.y, { seg: 12, cast: false });
      disc(g, r * .9, M.soil(1, 1), p.x, .34, p.y, { seg: 12 });
    });
    floor = .33;
  } else if (z.type === "orchard" || z.type === "pasture") {
    const pm = M.lawn(w / 2.6, d / 2.6, z.type === "orchard" ? 0xc0d0a6 : 0xc4d6a8);
    if (oval && z.type === "pasture") {
      tag(disc(g, 1, pm, cx, .01, cz, { seg: 40, sx: w / 2, sz: d / 2 }));
      const pts = []; for (let i = 0; i < 40; i++) { const a = (i / 40) * 6.283; pts.push([cx + Math.cos(a) * w / 2, cz + Math.sin(a) * d / 2]); }
      fence(ctx, pts.map((p, i) => [p, pts[(i + 1) % 40]]).filter((_, i) => i !== 10), { off });
    } else {
      tag(plane(g, w, d, pm, cx, .01, cz));
      const gw = Math.min(1.5, w * .28), segs = [[[0, 0], [w, 0]], [[0, 0], [0, d]], [[w, 0], [w, d]], [[0, d], [cx - gw / 2 - .1, d]], [[cx + gw / 2 + .1, d], [w, d]]];
      fence(ctx, segs, { pickets: z.type === "orchard", off });
      gate(g, cx, d, gw, 0, M, { pickets: z.type === "orchard" });
    }
    tuftsIn(ctx, Math.min(60, Math.round(w * d / 4)), z.id.length * 13, (i) => [.3 + srand(i * 7 + 1) * (w - .6), .3 + srand(i * 5 + 2) * (d - .6)], { off });
    if (z.type === "pasture" && w > 3 && d > 3) {
      tag(box(g, 1.3, .45, .55, M.zinc, w - 1.0, .225, .55)); plane(g, 1.22, .48, M.water, w - 1.0, .43, .55);
      if (w >= 7 && d >= 5) shelter(g, w - 2.9, 1.9, 4.2, 2.6, M);
      if (w * d > 60) { box(g, 1.2, .95, .8, M.planks(1, 1, 0x9b7a55), 1.0, .48, .7); box(g, 1.15, .5, .7, M.hay, 1.0, .35, .7); [-1, 1].forEach((s) => box(g, 1.24, .05, .05, M.woodDark, 1.0, .95, .7 + s * .4, { cast: false })); }
    }
  } else if (z.type === "water") {
    const rimH = .5, t = .32, sm = M.stone(1.2, .5, 0xc8c2b4), cm = M.stone(1, 1, 0xe0dbcf);
    contact(g, M, cx, cz, w + .3, d + .3);
    if (oval) {
      const wall = cyl(g, 1, 1, rimH, sm, cx, rimH / 2, cz, { seg: 40, open: true }); wall.scale.set(w / 2 + t, 1, d / 2 + t); wall.material = Object.assign(sm.clone(), { side: THREE.DoubleSide }); tag(wall);
      const inner = cyl(g, 1, 1, rimH, sm, cx, rimH / 2, cz, { seg: 40, open: true, cast: false }); inner.scale.set(w / 2, 1, d / 2); inner.material = wall.material;
      const cop = new THREE.Mesh(new THREE.RingGeometry(1, 1 + t / (w / 2), 40), cm); cop.rotation.x = -HPI; cop.position.set(cx, rimH, cz); cop.scale.set(w / 2, d / 2, 1); cop.receiveShadow = true; tag(cop); g.add(cop);
      tag(disc(g, 1, M.water, cx, rimH - .14, cz, { seg: 40, sx: w / 2, sz: d / 2 }));
    } else {
      [[cx, 0, w + t, t], [cx, d, w + t, t], [0, cz, t, d], [w, cz, t, d]].forEach(([x, zz, bw, bd]) => { tag(box(g, bw, rimH, bd, sm, x, rimH / 2, zz)); tag(box(g, bw + .08, .06, bd + .08, cm, x, rimH + .03, zz, { cast: false })); });
      tag(plane(g, w, d, M.water, cx, rimH - .14, cz));
      plane(g, w, d, M.soil(w / 2, d / 2, 0x7a8a7a), cx, .02, cz);
    }
    // inlet pipe with a tap wheel, and an overflow pipe on the far side
    bar(g, [w + t / 2 + .25, .05, cz], [w + t / 2 + .25, rimH + .32, cz], .045, M.zinc, { seg: 8 });
    bar(g, [w + t / 2 + .25, rimH + .32, cz], [w - .3, rimH + .32, cz], .045, M.zinc, { seg: 8 });
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(.11, .02, 6, 14), M.red); wheel.position.set(w + t / 2 + .25, rimH + .1, cz); wheel.rotation.x = HPI; wheel.castShadow = true; g.add(wheel);
    bar(g, [w + t / 2 + .25, rimH + .1, cz], [w + t / 2 + .25, rimH + .34, cz], .02, M.metal, { seg: 5 });
    bar(g, [-t / 2 - .1, rimH - .2, cz + d * .3], [-t / 2 - .5, rimH - .2, cz + d * .3], .05, M.zinc, { seg: 8 });
  } else if (z.type === "greenhouse") {
    const H = 2.25, kw = .45, alongX = w >= d, rise = Math.max(.6, Math.min(w, d) * .3), F = M.frameGH;
    contact(g, M, cx, cz, w, d, .006);
    tag(plane(g, w, d, M.soil(w / 1.2, d / 1.2), cx, .01, cz));
    box(g, alongX ? w - .2 : .9, .03, alongX ? .9 : d - .2, M.gravel(alongX ? w / 1.2 : 1, alongX ? 1 : d / 1.2), cx, .02, cz, { cast: false });
    // door on the gable end that faces the camera (W when the house runs along x, else S)
    const doorF = alongX ? "W" : "S", dw = .95;
    const km = M.planks(1, .4, 0xcdbb98);
    const kneeS = [[cx, 0, w + .1, .1], [cx, d, w + .1, .1], [0, cz, .1, d], [w, cz, .1, d]];
    kneeS.forEach(([x, zz, bw, bd], i) => {
      const isDoorWall = (doorF === "W" && i === 2) || (doorF === "S" && i === 1);
      if (!isDoorWall) { tag(box(g, bw, kw, bd, km, x, kw / 2, zz)); return; }
      if (doorF === "W") { const s = (d - dw) / 2; tag(box(g, .1, kw, s, km, 0, kw / 2, s / 2)); tag(box(g, .1, kw, s, km, 0, kw / 2, d - s / 2)); }
      else { const s = (w - dw) / 2; tag(box(g, s, kw, .1, km, s / 2, kw / 2, d)); tag(box(g, s, kw, .1, km, w - s / 2, kw / 2, d)); }
    });
    const gh = H - kw, gy = kw + gh / 2;
    const wallS = new THREE.Mesh(new THREE.BoxGeometry(w, gh, .02), M.glass); wallS.position.set(cx, gy, d); g.add(wallS); tag(wallS);
    const wallN = wallS.clone(); wallN.position.set(cx, gy, 0); g.add(wallN);
    const wallW = new THREE.Mesh(new THREE.BoxGeometry(.02, gh, d), M.glass); wallW.position.set(0, gy, cz); g.add(wallW); tag(wallW);
    const wallE = wallW.clone(); wallE.position.set(w, gy, cz); g.add(wallE);
    [[0, 0], [w, 0], [0, d], [w, d]].forEach(([x, zz]) => box(g, .09, H, .09, F, x, H / 2, zz));
    const nS = Math.max(1, Math.round(w / .95)), nW = Math.max(1, Math.round(d / .95)), posts = [];
    for (let i = 1; i < nS; i++) posts.push({ p: [(w * i) / nS, H / 2, d] }, { p: [(w * i) / nS, H / 2, 0] });
    for (let i = 1; i < nW; i++) posts.push({ p: [0, H / 2, (d * i) / nW] }, { p: [w, H / 2, (d * i) / nW] });
    instances(g, new THREE.BoxGeometry(.05, H, .05), F, posts, { cast: false });
    [kw, (kw + H) / 2 + .1, H].forEach((y) => { box(g, w + .06, .06, .06, F, cx, y, d, { cast: false }); box(g, w + .06, .06, .06, F, cx, y, 0, { cast: false }); box(g, .06, .06, d + .06, F, 0, y, cz, { cast: false }); box(g, .06, .06, d + .06, F, w, y, cz, { cast: false }); });
    const L = alongX ? w : d, span = alongX ? d : w, slope = Math.hypot(span / 2, rise), ang = Math.atan2(rise, span / 2), nR = Math.max(2, Math.round(L / .95));
    [-1, 1].forEach((side) => {
      const rx = alongX ? side * ang : 0, rz = alongX ? 0 : -side * ang;
      const px = alongX ? cx : cx + side * span / 4, pz = alongX ? cz + side * span / 4 : cz, py = H + rise / 2;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(alongX ? L + .1 : slope, .02, alongX ? slope : L + .1), M.glass);
      slab.position.set(px, py, pz); slab.rotation.set(rx, 0, rz, "YXZ"); g.add(slab); tag(slab);
      const rafters = []; for (let i = 0; i <= nR; i++) { const t = (i / nR) * L; rafters.push({ p: alongX ? [t, py, pz] : [px, py, t], rx, rz }); }
      instances(g, new THREE.BoxGeometry(alongX ? .05 : slope, .06, alongX ? slope : .05), F, rafters, { cast: false });
      box(g, alongX ? L + .1 : .05, .05, alongX ? .05 : L + .1, F, px, py, pz, { rx, rz, cast: false });
    });
    box(g, alongX ? L + .14 : .1, .1, alongX ? .1 : L + .14, F, cx, H + rise, cz);
    const tri = new THREE.Shape(); tri.moveTo(-span / 2, 0); tri.lineTo(span / 2, 0); tri.lineTo(0, rise); tri.closePath();
    [-1, 1].forEach((side) => {
      const m = new THREE.Mesh(new THREE.ShapeGeometry(tri), M.glass);
      if (alongX) { m.position.set(cx + side * w / 2, H, cz); m.rotation.y = side > 0 ? HPI : -HPI; } else { m.position.set(cx, H, cz + side * d / 2); m.rotation.y = side > 0 ? 0 : Math.PI; }
      g.add(m);
      box(g, .05, rise, .05, F, alongX ? cx + side * w / 2 : cx, H + rise / 2, alongX ? cz : cz + side * d / 2, { cast: false });
      [-1, 1].forEach((k) => { const a = alongX ? [cx + side * w / 2, H, cz + k * span / 2] : [cx + k * span / 2, H, cz + side * d / 2]; const b = alongX ? [cx + side * w / 2, H + rise, cz] : [cx, H + rise, cz + side * d / 2]; bar(g, a, b, .03, F, { cast: false }); });
    });
    // roof vent, propped open on the sunny slope
    { const a = ang + .5, vs = slope * .45, vl = Math.min(1.2, L * .3), hx = alongX ? cx - L * .2 : cx + Math.cos(a) * vs / 2, hz = alongX ? cz + Math.cos(a) * vs / 2 : cz - L * .2, hy = H + rise - Math.sin(a) * vs / 2;
      const pane = new THREE.Mesh(new THREE.BoxGeometry(alongX ? vl : vs, .02, alongX ? vs : vl), M.glass); pane.position.set(hx, hy, hz); pane.rotation.set(alongX ? a : 0, 0, alongX ? 0 : -a, "YXZ"); g.add(pane);
      box(g, alongX ? vl : .04, .04, alongX ? .04 : vl, F, hx, hy, hz, { rx: alongX ? a : 0, rz: alongX ? 0 : -a, cast: false });
      [-1, 1].forEach((k) => box(g, alongX ? .04 : vs, .04, alongX ? vs : .04, F, alongX ? hx + k * vl / 2 : hx, hy, alongX ? hz : hz + k * vl / 2, { rx: alongX ? a : 0, rz: alongX ? 0 : -a, cast: false }));
    }
    // door with a step
    { const dgg = new THREE.Group(); dgg.position.set(cx, 0, cz); g.add(dgg); const put = fixtures(w, d);
      dgg.add(put(mesh([dw + .14, 2.0, .06], F), doorF, 0, 1.0, .03)); dgg.add(put(mesh([dw - .02, 1.9, .015], M.glass), doorF, 0, 1.0, .06));
      dgg.add(put(mesh([dw - .02, .04, .03], F), doorF, 0, 1.0, .07)); dgg.add(put(mesh([.04, 1.9, .03], F), doorF, 0, 1.0, .07));
      dgg.add(put(mesh([.05, .18, .03], M.metal), doorF, dw * .36, .95, .085)); dgg.add(put(mesh([dw + .5, .1, .5], M.concrete), doorF, 0, .05, .25));
      dgg.traverse((m) => { if (m.isMesh) tag(m); }); }
    // benches along the long walls with potted seedlings, a water barrel in a corner
    const bl = L - 2.2, bw = .75;
    if (bl > 1.2 && span > 2.6) [-1, 1].forEach((side) => {
      const bx = alongX ? cx : cx + side * (span / 2 - .5), bz = alongX ? cz + side * (span / 2 - .5) : cz;
      benchSlatted(g, M, bx, bz, alongX ? bl : bw, alongX ? bw : bl, .8);
      const n = Math.min(12, Math.floor(bl / .42)), items = [];
      for (let i = 0; i < n; i++) { const t = -bl / 2 + (i + .5) * (bl / n); items.push({ x: alongX ? bx + t : bx + (srand(i + 3) - .5) * .3, y: .82, z: alongX ? bz + (srand(i + 3) - .5) * .3 : bz + t }); }
      pots(ctx, items, [["Basil", 2], ["Lettuce", 3], ["Tomato", 2], ["Pepper", 3], ["Basil", 3]], off);
    });
    cyl(g, .3, .3, .8, M.barrel, alongX ? w - .5 : .5, .4, alongX ? .55 : d - .55, { seg: 12 });
    floor = 0;
  } else if (z.type === "house" || z.type === "barn" || z.type === "storage") {
    building(g, w, d, z.type, M, { clay: z.color === "clay", tag, ctx, off });
  } else if (z.type === "compost") {
    const H = 1.05, bays = Math.max(1, Math.min(3, Math.floor(w / 1.1))), bw = w / bays;
    contact(g, M, cx, cz, w, d, .009);
    tag(plane(g, w + .4, d + .4, M.soil(w / 1.2, d / 1.2, 0xb9ad9c), cx, .012, cz));
    const slat = M.slats, post = M.woodDark;
    tag(box(g, w + .1, H, .05, slat, cx, H / 2, 0));
    for (let i = 0; i <= bays; i++) { tag(box(g, .05, H, d, slat, (w * i) / bays, H / 2, cz)); box(g, .1, H + .1, .1, post, (w * i) / bays, (H + .1) / 2, 0); box(g, .1, H + .1, .1, post, (w * i) / bays, (H + .1) / 2, d); }
    tag(box(g, w + .1, H * .5, .05, slat, cx, H * .25, d));
    for (let i = 0; i < bays; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 9), M.compost[Math.min(2, i)]); const rr = Math.min(bw, d) * .44, hh = .28 + (2 - Math.min(2, i)) * .16;
      m.position.set((i + .5) * bw, .04, cz); m.scale.set(rr, hh, Math.min(d * .44, rr)); m.castShadow = true; m.receiveShadow = true; tag(m); g.add(m);
    }
    // pitchfork leaning on the end wall
    bar(g, [w + .12, .02, d * .55], [w + .3, 1.55, d * .35], .02, M.wood);
    [-.06, 0, .06].forEach((o) => bar(g, [w + .12 + o, .02, d * .55 + o], [w + .13 + o, .3, d * .52 + o], .008, M.metal, { seg: 4 }));
  } else if (z.type === "beehive") {
    tag(plane(g, w, d, M.gravel(w / 1.2, d / 1.2), cx, .012, cz));
    const cols = Math.max(1, Math.min(6, Math.floor(Math.max(w, d) / .8))), rows = Math.min(2, Math.max(1, Math.floor(Math.min(w, d) / 1.4))), alongX = w >= d;
    let k = 0;
    for (let r = 0; r < rows; r++) for (let i = 0; i < cols; i++) {
      const u = ((i + .5) * Math.max(w, d)) / cols, v = ((r + .5) * Math.min(w, d)) / rows, x = alongX ? u : v, zz = alongX ? v : u, ry = alongX ? 0 : HPI, hm = M.hive[k++ % M.hive.length];
      const hg = new THREE.Group(); hg.position.set(x, 0, zz); hg.rotation.y = ry; g.add(hg);
      [[-.18, -.18], [.18, -.18], [-.18, .18], [.18, .18]].forEach(([a, b]) => box(hg, .05, .3, .05, M.woodDark, a, .15, b));
      box(hg, .5, .05, .5, M.woodDark, 0, .32, 0);
      box(hg, .46, .26, .46, hm, 0, .48, 0); box(hg, .48, .02, .48, M.woodDark, 0, .62, 0, { cast: false });
      box(hg, .46, .2, .46, hm, 0, .74, 0); box(hg, .52, .05, .52, M.zinc, 0, .87, 0);
      box(hg, .32, .025, .12, M.woodDark, 0, .35, .29); box(hg, .18, .022, .01, M.slot, 0, .37, .235, { cast: false });
      hg.traverse((m) => { if (m.isMesh) tag(m); });
    }
    for (let i = 0; i < Math.min(6, cols * 2); i++) bill(art("bee"), .11, .3 + srand(i * 3 + z.id.length) * (w - .6), .55 + srand(i * 5) * .7, .3 + srand(i * 7 + 1) * (d - .6), { sink: 0, anim: 1, phase: srand(i * 13 + 2) });
  } else if (z.type === "nursery") {
    tag(plane(g, w, d, M.gravel(w / 1.2, d / 1.2), cx, .012, cz));
    const long = w >= d, benches = Math.max(1, Math.floor((long ? d : w) / 1.3));
    for (let i = 0; i < benches; i++) {
      const c0 = ((i + .5) * (long ? d : w)) / benches, bx = long ? cx : c0, bz = long ? c0 : cz, bw = long ? w - .5 : .8, bd = long ? .8 : d - .5;
      benchSlatted(g, M, bx, bz, bw, bd, .8);
      const len = long ? bw : bd, n = Math.min(14, Math.floor(len / .36)), items = [];
      for (let j = 0; j < n; j++) { const t = -len / 2 + (j + .5) * (len / n), o = (srand(i * 9 + j) - .5) * .32; items.push({ x: long ? bx + t : bx + o, y: .82, z: long ? bz + o : bz + t }); }
      pots(ctx, items, [["Tomato", 2], ["Basil", 3], ["Lettuce", 2], ["Pepper", 2], ["Lavender", 4]], off);
    }
    if (Math.min(w, d) > 2.2) {
      const sh = 2.2; [[.2, .2], [w - .2, .2], [.2, d - .2], [w - .2, d - .2]].forEach(([x, zz]) => box(g, .07, sh, .07, M.metal, x, sh / 2, zz));
      box(g, w - .2, .05, .05, M.metal, cx, sh, .2, { cast: false }); box(g, w - .2, .05, .05, M.metal, cx, sh, d - .2, { cast: false }); box(g, .05, .05, d - .2, M.metal, .2, sh, cz, { cast: false }); box(g, .05, .05, d - .2, M.metal, w - .2, sh, cz, { cast: false });
      const net = plane(g, w - .3, d - .3, M.shade, cx, sh + .02, cz, { cast: true, receive: false }); net.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: M.shade.map, alphaTest: .3 });
    }
    // watering can by the corner
    bill(art("prop-wateringcan"), .5, w - .45, 0, d - .35, { sink: .06 });
  }
  // growth visualisation per planted row: a foliage line once the plants have filled in, a wooden
  // row marker with a tag in the stage colour at the row's head, a gold glow on rows in their
  // harvest window, and an invisible box per row that feeds the hover/tap tooltip
  const lift = floor > 0 ? floor + .02 : 0, G = ctx.growth, [ox, oz] = off;
  prows.forEach((r) => {
    const tree = TREE_RE.test((r.crop || "").toLowerCase());
    const len = Math.max(0, r.a1 - r.a0), mid = (r.a0 + r.a1) / 2, x = r.vertical ? r.c : mid, zz = r.vertical ? mid : r.c, ry = r.vertical ? HPI : 0;
    if (!tree && r.stage >= 3 && len > .6 && !r.scatter) { const sz = Math.min(.3, r.size * .7), h = r.stage >= 4 ? .07 : .05; G.strips.push({ p: [ox + x, lift + h / 2, oz + zz], ry, s: [len, h, sz] }); }
    // harvest window: a soft gold halo wider than the row, readable from far away
    if (r.stage === 5 && !tree) G.glows.push({ p: [ox + x, lift + .012, oz + zz], rx: -HPI, ry, s: [len + 1.0, clamp(r.gap * 1.3, .6, 1.6), 1] }); // trees get their own halo each
    // marker at the head of the row: west end of a horizontal row, south end of a vertical one
    const hx = r.vertical ? r.c : r.a0 - .16, hz = r.vertical ? r.a1 + .16 : r.c, big = r.stage === 5 ? 1.35 : 1;
    G.poles.push({ p: [ox + hx, lift + .26, oz + hz] });
    G.tags[r.stage].push({ p: [ox + hx, lift + .5, oz + hz], ry: r.vertical ? 0 : HPI, s: [big, big, 1] });
    const hit = new THREE.Mesh(new THREE.BoxGeometry(r.vertical ? Math.min(.6, r.gap) : len + .4, .5, r.vertical ? len + .4 : Math.min(.6, r.gap)), M.hit);
    hit.position.set(x, lift + .25, zz); hit.userData.plot = { ...r, zone: z.name, zoneId: z.id }; g.add(hit); ctx.plotHits.push(hit);
  });
  // crops
  const cap = 700;
  const capped = plants.length > cap ? plants.filter((_, i) => i % Math.ceil(plants.length / cap) === 0) : plants;
  capped.forEach((p, i) => {
    const name = p.crop.toLowerCase();
    if (p.stage < 1) return; // planned: the row marker alone says what is coming
    if (p.stage < 2) { G.sprouts.push({ p: [ox + p.x, lift + .012, oz + p.y], rx: -HPI, s: Math.max(.05, p.size * .1) }); return; }
    if (TREE_RE.test(name)) { fruitTree(g, ctx, p.x, p.y, p.size, p.stage, name, z.id.length * 31 + i * 7 + 1, M, off); return; }
    const grow = p.stage === 2 ? .5 : p.stage === 3 ? .78 : 1;
    const bw = Math.max(.26, Math.min(1.2, p.size * 1.5 * grow));
    spriteAdd(ctx, cropArtwork(p.crop, p.stage, "side"), { x: ox + p.x + (srand(i) - .5) * .05, y: lift, z: oz + p.y + (srand(i + 7) - .5) * .05, w: bw, r: (srand(i + 3) - .5) * .5, top: cropArtwork(p.crop, p.stage, "top") });
  });
  // animals: real geometry, collected farm-wide into one animated mesh (see animals3d.js). Each
  // zone offers an arena — the ground the herd may roam — clear of the shelter, trough and feeder.
  const animals = (data.livestock?.animals || []).filter((a) => animalZone(a, data.zones)?.id === z.id);
  if (animals.length) {
    let A;
    if (z.type === "barn") A = { x0: .3, x1: w - .3, z0: d + .5, z1: d + 2.6 };
    else if (z.type === "pasture") {
      const top = w >= 7 && d >= 5 ? 3.4 : w > 3 && d > 3 ? 1.3 : .35;
      A = oval ? { x0: cx - w * .3, x1: cx + w * .3, z0: Math.max(cz - d * .3, top), z1: cz + d * .3 } : { x0: .35, x1: w - .35, z0: top, z1: d - .35 };
      if (A.z1 - A.z0 < 1.5) A.z0 = oval ? cz - d * .3 : .35;
    } else A = { x0: .4, x1: w - .4, z0: .4, z1: d - .4 };
    const arena = { x0: z.xM + A.x0, x1: z.xM + A.x1, z0: z.yM + A.z0, z1: z.yM + A.z1 };
    animals.slice(0, 5).forEach((a, i) => {
      if (a.type === "Bee") return;
      const bird = /chicken|duck|goose|turkey|quail|guinea/i.test(a.type), n = Math.min(bird ? 12 : 9, a.count || 1);
      for (let j = 0; j < n; j++) {
        const x = arena.x0 + (arena.x1 - arena.x0) * (.08 + srand(i * 31 + j + 10) * .84);
        const zz = arena.z0 + (arena.z1 - arena.z0) * (.1 + srand(i * 29 + j + 5) * .8);
        ctx.herd.push({ type: a.type, x, z: zz, heading: srand(i * 17 + j * 3 + 1) * 6.283, arena, seed: z.id.length * 97 + i * 13 + j, variant: (i + j) % 4 });
      }
    });
  }
  return g;
}
function buildGrowth(g, ctx, M) { // stage markers, foliage lines, harvest halos and seedlings for the whole farm
  const G = ctx.growth;
  instances(g, new THREE.BoxGeometry(1, 1, 1), M.strip, G.strips);
  instances(g, new THREE.PlaneGeometry(1, 1), M.glow, G.glows, { cast: false, receive: false });
  instances(g, new THREE.CylinderGeometry(.018, .022, .52, 5), M.woodDark, G.poles, { cast: false });
  G.tags.forEach((list, st) => instances(g, new THREE.BoxGeometry(.2, .13, .025), M.stageTag[st], list, { cast: false }));
  instances(g, new THREE.CircleGeometry(1, 8), M.sprout, G.sprouts, { cast: false });
}

/* ---------- terrain ----------
   The farm sits on a flat apron; beyond it the land rolls away in low hills (only rising, so the flat
   overlay planes stay hidden under them). The grid is denser near the farm, coarse far away. */
function terrainHeightFn(fW, fH, margin) {
  const flat = Math.max(margin * 1.7, 4) + 30, ramp = 70; // wide flat apron, then a slow rise: no shaded ring around the fence
  return (x, z) => {
    const d = Math.max(0, -x - flat, x - fW - flat, -z - flat, z - fH - flat);
    if (d <= 0) return 0;
    const m = smoothstep(0, ramp, d), amp = 2.5 + Math.min(7, d * .05);
    const n = .5 * Math.sin(x * .041 + 1.7) * Math.cos(z * .036 + .4) + .3 * Math.sin(x * .097 - z * .071 + 2.1) + .2 * Math.sin((x + z) * .16 + .9) + .12 * Math.sin(x * .31) * Math.sin(z * .27 + 1.1);
    return m * amp * Math.pow(clamp01(n * .5 + .5), 1.35);
  };
}
function terrainGeo(fW, fH, E, height, N = 84) {
  const GW = fW + E * 2, GH = fH + E * 2, cx = fW / 2, cz = fH / 2, warp = (t) => .08 * t + .92 * t * t * t;
  const pos = [], uv = [], colr = [], idx = [];
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    const x = cx + warp((i / N) * 2 - 1) * (GW / 2), z = cz + warp((j / N) * 2 - 1) * (GH / 2), h = height(x, z);
    pos.push(x, h, z); uv.push(x / 2.6, z / 2.6);
    const k = clamp01(h / 4.5); colr.push(1 - k * .1, 1 - k * .06, 1 - k * .24); // higher ground a touch drier
  }
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.setAttribute("color", new THREE.Float32BufferAttribute(colr, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  return geo;
}
function buildWorld(ctx) {
  const { data, zones, roads, fW, fH, margin, env, M } = ctx;
  const world = new THREE.Group();
  const E = Math.max(fW, fH) * 16, GW = fW + E * 2, GH = fH + E * 2;
  const heightAt = terrainHeightFn(fW, fH, margin); ctx.heightAt = heightAt;
  const style = data.mapStyle || {}, gm = style.groundMaterial || (env === "balcony" ? "stone" : "meadow");
  const tint = { natural: 0xb9cc9e, dry: 0xdcd3a8, deep: 0x97b57e }[style.groundColor] || 0xb9cc9e;
  const groundMat = gm === "meadow" ? M.lawn(1, 1, tint) : gm === "soil" ? M.soil(1, 1) : gm === "gravel" ? M.gravel(1, 1) : M.stone(1, 1);
  groundMat.polygonOffset = false; groundMat.vertexColors = true; // the ground is the base layer; everything on it is offset toward the camera
  const ground = new THREE.Mesh(terrainGeo(fW, fH, E, heightAt), groundMat); // uv already in texture repeats
  ground.receiveShadow = true; world.add(ground); ctx.ground = ground;
  // tonal overlays share the terrain mesh (uv = metres / 2.6) so they cover hills and apron alike — a flat
  // overlay that stopped where the land rose used to leave a darker halo around the farm
  const mottle = new THREE.Mesh(ground.geometry, layer(new THREE.MeshBasicMaterial({ map: proc("mottle", DRAW.mottle, { size: 512, repeat: [2.6 / 42, 2.6 / 42] }), transparent: true, blending: THREE.MultiplyBlending, premultipliedAlpha: true, depthWrite: false, toneMapped: false }), 2));
  mottle.position.y = .004; mottle.receiveShadow = false; world.add(mottle);
  const vig = plane(world, GW, GH, layer(new THREE.MeshBasicMaterial({ map: proc("vignette", (g2, sz) => { const gr = g2.createRadialGradient(sz / 2, sz / 2, sz * .18, sz / 2, sz / 2, sz * .5); gr.addColorStop(0, "rgba(20,40,16,0)"); gr.addColorStop(1, "rgba(20,40,16,.55)"); g2.fillStyle = gr; g2.fillRect(0, 0, sz, sz); }, { size: 512, clamp: true }), transparent: true, depthWrite: false }), 4), fW / 2, .006, fH / 2);
  vig.receiveShadow = false;
  // drifting cloud shadows over the ground (the texture offset moves on the shared clock)
  M.cloud.map = proc("cloud", DRAW.cloud, { size: 512, repeat: [2.6 / 64, 2.6 / 64] });
  const cloud = new THREE.Mesh(ground.geometry, M.cloud); cloud.position.y = .005; cloud.receiveShadow = false; world.add(cloud); ctx.cloud = M.cloud.map;
  // farm boundary: post-and-rail fence, stone gate pillars, a gate
  const gap = 2.4;
  fence(ctx, [[[0, 0], [fW, 0]], [[0, 0], [0, fH]], [[fW, 0], [fW, fH]], [[0, fH], [fW / 2 - gap / 2 - .25, fH]], [[fW / 2 + gap / 2 + .25, fH], [fW, fH]]], { post: 1.0 });
  [-1, 1].forEach((s) => { const x = fW / 2 + s * (gap / 2 + .1); box(world, .45, 1.4, .45, M.stone(1, 1.5, 0xd2cbbc), x, .7, fH); box(world, .58, .1, .58, M.concrete, x, 1.45, fH, { cast: false }); });
  gate(world, fW / 2, fH, gap - .3, 0, M);
  if (env !== "balcony") {
    const ho = .75, hg = gap / 2 + 1.1;
    hedge(world, [[[-ho, -ho], [fW + ho, -ho]], [[-ho, -ho], [-ho, fH + ho]], [[fW + ho, -ho], [fW + ho, fH + ho]], [[-ho, fH + ho], [fW / 2 - hg, fH + ho]], [[fW / 2 + hg, fH + ho], [fW + ho, fH + ho]]], M, { h: 1.4, t: .7 });
  }
  const drive = [{ xM: fW / 2, yM: fH - .2 }, { xM: fW / 2, yM: fH + Math.max(margin * 1.6, 3) }];
  // roads with a soft soil edge
  const paved = ctx.pathTexture === "stone";
  const roadMat = layer(std({ map: tex(art("texture-" + (ctx.pathTexture || "gravel")), { repeat: [1, 1] }), color: paved ? 0xcdc8bd : ctx.pathTexture === "soil" ? 0xd8cdb8 : 0xd6d3cb, side: THREE.DoubleSide }), 10);
  const edgeMat = layer(paved ? std({ color: 0xe9e5dc, roughness: .8, side: THREE.DoubleSide }) : std({ color: ctx.pathTexture === "soil" ? 0xb9a98e : 0xb8b4aa, roughness: .9, side: THREE.DoubleSide }), 8);
  [...roads, drive].forEach((raw) => {
    if (raw.length < 2) return; const line = smooth(raw);
    const e = new THREE.Mesh(ribbonGeo(line, ctx.roadWidth + (paved ? .3 : .22)), edgeMat); e.position.y = paved ? .02 : .011; e.receiveShadow = true; world.add(e);
    const m = new THREE.Mesh(ribbonGeo(line, ctx.roadWidth), roadMat); m.position.y = paved ? .03 : .016; m.receiveShadow = true; world.add(m);
  });
  // zones — each one also gets an invisible hit box (its bounding box) for taps, so the detailed
  // geometry can be merged for speed without losing which area was tapped
  zones.forEach((z) => {
    const g = buildZone(z, ctx); world.add(g); g.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(g), size = new THREE.Vector3(), c = new THREE.Vector3();
    if (bb.isEmpty()) { bb.min.set(z.xM, 0, z.yM); bb.max.set(z.xM + z.wM, .5, z.yM + z.hM); }
    bb.min.y = Math.min(0, bb.min.y); bb.max.y = Math.max(bb.min.y + .6, bb.max.y);
    bb.getSize(size); bb.getCenter(c);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), M.hit); hit.position.copy(c); hit.userData.zoneId = z.id; hit.userData.bounds = { x0: bb.min.x, x1: bb.max.x, z0: bb.min.z, z1: bb.max.z, h: bb.max.y };
    world.add(hit); ctx.hits.push(hit);
  });
  // user-drawn fences and gates
  (data.mapLines || []).filter((l) => l.kind !== "path" && (l.points || []).length > 1).forEach((l) => {
    if (l.kind === "gate") { const a = l.points[0], b = l.points[l.points.length - 1], len = Math.hypot(b.xM - a.xM, b.yM - a.yM); gate(world, (a.xM + b.xM) / 2, (a.yM + b.yM) / 2, Math.max(.8, Math.min(3, len - .2)), Math.atan2(-(b.yM - a.yM), b.xM - a.xM), M); return; }
    fence(ctx, l.points.slice(1).map((p, i) => [[l.points[i].xM, l.points[i].yM], [p.xM, p.yM]]));
  });
  // ornaments
  const PROPS = { bush: ["prop-bush", 1.3], flowers: ["prop-flowers", 1.0], pond: ["prop-pond", 1.9], pot: ["prop-pot", .55], planter: ["prop-planter", 1.2], hangpot: ["prop-hangpot", .5], wateringcan: ["prop-wateringcan", .5], haybale: ["prop-haybale", 1.3], woodpile: ["prop-woodpile", 1.4], bench: ["prop-bench", 1.5] };
  (data.ornaments || []).forEach((o) => {
    if (o.type === "tree") { tree(world, o.xM, o.yM, .95, o.id ? o.id.length : 1, M); return; }
    if (o.type === "shed") { const g = new THREE.Group(); g.position.set(o.xM - .7, 0, o.yM - .55); building(g, 1.4, 1.1, "storage", M, { ctx, off: [o.xM - .7, o.yM - .55] }); world.add(g); return; }
    if (o.type === "rock") { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(.42, 0), M.rock); m.position.set(o.xM, .22, o.yM); m.scale.set(1.15, .7, .9); m.rotation.set(.3, (o.id ? o.id.length : 1) * .7, .2); m.castShadow = true; m.receiveShadow = true; world.add(m); return; }
    const spec = PROPS[o.type] || PROPS.bench;
    billboard(ctx, art(spec[0]), spec[1], o.xM, o.type === "hangpot" ? 1.5 : 0, o.yM, { sink: o.type === "pond" ? .5 : .06 });
  });
  // tree border, rocks and wild flowers outside the fence, grass tufts in the open ground
  if (env !== "balcony") {
    const n = Math.min(110, Math.ceil((fW + fH) / 1.8));
    for (let i = 0; i < n; i++) {
      const edge = i % 4, t = srand(i + 91), r = Math.max(1.05, margin * (.4 + srand(i + 25) * .42)), set = Math.max(margin * .83, r + .5) + 1.0;
      const x = edge === 0 ? -set : edge === 1 ? fW + set : t * fW;
      const y = edge === 2 ? -set : edge === 3 ? fH + set * 1.05 : t * fH;
      if ((edge === 3 || edge === 2) && Math.abs(x - fW / 2) < 2.2) continue; // keep the entrance clear
      tree(world, x, y, r, i, M);
    }
    const rocks = []; const nr = Math.min(28, Math.round((fW + fH) / 5));
    for (let i = 0; i < nr; i++) { const edge = i % 4, t = srand(i + 301), s = .2 + srand(i + 77) * .3; const x = edge === 0 ? -margin * .5 : edge === 1 ? fW + margin * .5 : t * fW, y = edge === 2 ? -margin * .45 : edge === 3 ? fH + margin * .5 : t * fH; rocks.push({ p: [x, s * .35, y], ry: t * 6, s: [s * 1.2, s * .7, s] }); }
    instances(world, new THREE.DodecahedronGeometry(1, 0), M.rock, rocks);
    // clumps of trees and boulders out on the hills, thinning with distance
    const far = [], nc = Math.min(64, 24 + Math.round((fW + fH) / 3));
    for (let i = 0; i < nc; i++) {
      const a = srand(i * 3 + 701) * 6.283, dist = margin * 2.2 + 9 + Math.pow(srand(i * 5 + 703), 1.4) * 70;
      const x = fW / 2 + Math.cos(a) * (dist + fW / 2), y = fH / 2 + Math.sin(a) * (dist + fH / 2);
      if (y > fH && Math.abs(x - fW / 2) < 4) continue; // the drive stays open
      const r = 1.1 + srand(i * 7 + 709) * 1.3;
      tree(world, x, y, r, i + 800, M, heightAt(x, y) - .05);
      if (srand(i * 11 + 713) < .35) { const s = .35 + srand(i * 13 + 717) * .5; far.push({ p: [x + 2.2, heightAt(x + 2.2, y + 1) + s * .3, y + 1], ry: srand(i) * 6, s: [s * 1.3, s * .75, s] }); }
    }
    instances(world, new THREE.DodecahedronGeometry(1, 0), M.rock, far);
  }
  const inZone = (x, y) => zones.some((z) => x > z.xM - .35 && x < z.xM + z.wM + .35 && y > z.yM - .35 && y < z.yM + z.hM + .35);
  const onRoad = (x, y) => roads.some((line) => line.some((p, i) => { if (!i) return false; const a = line[i - 1], dx = p.xM - a.xM, dy = p.yM - a.yM, L2 = dx * dx + dy * dy || 1; const t = Math.max(0, Math.min(1, ((x - a.xM) * dx + (y - a.yM) * dy) / L2)); return Math.hypot(x - a.xM - dx * t, y - a.yM - dy * t) < ctx.roadWidth / 2 + .3; }));
  const open = (i, seed) => { for (let k = 0; k < 6; k++) { const x = -margin * .6 + srand(seed + i * 3 + k) * (fW + margin * 1.2), y = -margin * .6 + srand(seed + i * 5 + k + 1) * (fH + margin * 1.2); if (!inZone(x, y) && !onRoad(x, y)) return [x, y]; } return [null, null]; };
  tuftsIn(ctx, Math.min(320, Math.round(fW * fH / 5)), 17, (i) => open(i, 500));
  const flowers = [], nf = Math.min(120, Math.round(fW * fH / 14));
  for (let i = 0; i < nf; i++) { const [x, y] = open(i, 900); if (x == null) continue; const s = .7 + srand(i + 41) * .6; flowers.push({ p: [x, -.01 * s, y], ry: srand(i + 43) * 3, s }); }
  instances(world, crossGeo(.5, .42), M.flower, flowers, { cast: false, receive: false });
  // everything collected across the zones is drawn once for the whole farm
  buildFences(world, ctx, M); buildTufts(world, ctx, M); buildPots(world, ctx, M); buildGrowth(world, ctx, M); buildFruit(world, ctx, M);
  sprites(world, ctx.sprites); faces(world, ctx.faces);
  bake(world, new Set([...ctx.hits, ...ctx.plotHits, ctx.ground])); // the terrain keeps its vertex colours
  const herd = buildHerd(ctx.herd, TIME); if (herd) world.add(herd); // every animal, one draw call, moving in the vertex shader
  return world;
}
/* Merge every static mesh that shares a material into one draw call. Instanced meshes, the
   camera-facing sprites and the hit boxes are left alone. Turns ~1,500 draw calls into ~200. */
function bake(world, keep) {
  world.updateMatrixWorld(true);
  const groups = new Map(), drop = [];
  world.traverse((m) => {
    if (!m.isMesh || m.isInstancedMesh || keep.has(m) || !m.geometry || !m.material || Array.isArray(m.material)) return;
    const key = m.material.uuid + "|" + (m.castShadow ? 1 : 0) + (m.receiveShadow ? 1 : 0) + "|" + (m.renderOrder || 0);
    let g = groups.get(key);
    if (!g) { g = { material: m.material, cast: m.castShadow, receive: m.receiveShadow, depth: m.customDepthMaterial, order: m.renderOrder || 0, geos: [] }; groups.set(key, g); }
    const geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    if (!geo.attributes.normal) geo.computeVertexNormals();
    if (!geo.attributes.uv) geo.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    Object.keys(geo.attributes).forEach((a) => { if (a !== "position" && a !== "normal" && a !== "uv") geo.deleteAttribute(a); });
    geo.applyMatrix4(m.matrixWorld);
    g.geos.push(geo); drop.push(m);
  });
  drop.forEach((m) => { m.parent.remove(m); m.geometry.dispose(); });
  groups.forEach((g) => {
    const merged = g.geos.length === 1 ? g.geos[0] : mergeGeometries(g.geos, false);
    if (!merged) return;
    if (g.geos.length > 1) g.geos.forEach((x) => x.dispose());
    const mesh = new THREE.Mesh(merged, g.material);
    mesh.castShadow = g.cast; mesh.receiveShadow = g.receive; mesh.renderOrder = g.order;
    if (g.depth) mesh.customDepthMaterial = g.depth;
    world.add(mesh);
  });
}

/* ---------- map-game camera controls ----------
   One finger / left mouse: drag the ground (with inertia). Two fingers: pinch to zoom, twist to
   rotate, drag up/down to tilt — all anchored to the point between the fingers. Wheel zooms toward
   the cursor; right-drag or shift/ctrl-drag orbits. Tap opens an area; double-tap on the ground
   zooms in. Arrow keys pan, +/- zoom. Everything is clamped to the farm. */
const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => 1 - Math.pow(1 - t, 3);
class FarmControls {
  constructor(camera, dom, hooks) {
    this.camera = camera; this.dom = dom; this.hooks = hooks; this.enabled = true;
    this.cooperative = false; // inline in a scrolling page: one finger scrolls the page, two fingers move the map, plain wheel scrolls
    this.target = new THREE.Vector3(); this.dist = 60; this.theta = CAM.az * DEG; this.phi = CAM.el * DEG;
    this.lim = { minDist: 3, maxDist: 200, minPhi: 26 * DEG, maxPhi: 82 * DEG, x0: -10, x1: 10, z0: -10, z1: 10 };
    this.size = { w: 1, h: 1 }; this.home = null;
    this.pointers = new Map(); this.pan = null; this.pinch = null; this.tapStart = null; this.lastTap = null; this.samples = [];
    this.raf = 0; this.anim = null; this.inertia = null; this.idleTimer = 0; this.interacting = false;
    this.ray = new THREE.Raycaster(); this.ndc = new THREE.Vector2(); this.tmp = new THREE.Vector3(); this.tmp2 = new THREE.Vector3();
    this.onDown = this.onDown.bind(this); this.onMove = this.onMove.bind(this); this.onUp = this.onUp.bind(this);
    this.onWheel = this.onWheel.bind(this); this.onKey = this.onKey.bind(this); this.onBlock = (e) => e.preventDefault();
    dom.addEventListener("pointerdown", this.onDown); dom.addEventListener("pointermove", this.onMove);
    dom.addEventListener("pointerup", this.onUp); dom.addEventListener("pointercancel", this.onUp);
    dom.addEventListener("wheel", this.onWheel, { passive: false }); dom.addEventListener("keydown", this.onKey);
    dom.addEventListener("contextmenu", this.onBlock); dom.addEventListener("gesturestart", this.onBlock);
    dom.tabIndex = 0; dom.style.outline = "none"; dom.style.cursor = "grab";
  }
  dispose() {
    const d = this.dom; cancelAnimationFrame(this.raf); clearTimeout(this.idleTimer);
    d.removeEventListener("pointerdown", this.onDown); d.removeEventListener("pointermove", this.onMove); d.removeEventListener("pointerup", this.onUp); d.removeEventListener("pointercancel", this.onUp);
    d.removeEventListener("wheel", this.onWheel); d.removeEventListener("keydown", this.onKey); d.removeEventListener("contextmenu", this.onBlock); d.removeEventListener("gesturestart", this.onBlock);
  }
  view() { return { target: this.target.toArray(), dist: this.dist, theta: this.theta, phi: this.phi }; }
  setCooperative(on) { this.cooperative = on; this.dom.style.touchAction = on ? "pan-y" : "none"; }
  update() {
    const { target, dist, theta, phi } = this;
    this.camera.position.set(target.x + Math.sin(theta) * Math.cos(phi) * dist, target.y + Math.sin(phi) * dist, target.z + Math.cos(theta) * Math.cos(phi) * dist);
    this.camera.lookAt(target); this.camera.updateMatrixWorld();
  }
  clampView() {
    const L = this.lim; this.dist = clamp(this.dist, L.minDist, L.maxDist); this.phi = clamp(this.phi, L.minPhi, L.maxPhi);
    this.target.x = clamp(this.target.x, L.x0, L.x1); this.target.z = clamp(this.target.z, L.z0, L.z1); this.target.y = 0;
  }
  local(e) { const r = this.dom.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  groundAt(x, y, out = this.tmp) {
    this.ndc.set((x / this.size.w) * 2 - 1, -(y / this.size.h) * 2 + 1); this.ray.setFromCamera(this.ndc, this.camera);
    const r = this.ray.ray, t = -r.origin.y / r.direction.y; if (!(t > 0) || t > 1e4) return null;
    return out.copy(r.direction).multiplyScalar(t).add(r.origin);
  }
  anchor(x, y, world) { // shift the view so that the ground point `world` sits under screen (x, y)
    this.update(); const p = this.groundAt(x, y, this.tmp2); if (!p) { this.clampView(); this.update(); return; }
    this.target.x += world.x - p.x; this.target.z += world.z - p.z; this.clampView(); this.update();
  }
  changed() { this.hooks.change(); }
  interact(on) {
    clearTimeout(this.idleTimer);
    if (on) { if (!this.interacting) { this.interacting = true; this.hooks.interact(true); } return; }
    this.idleTimer = setTimeout(() => { if (this.pointers.size || this.anim || this.inertia) return; this.interacting = false; this.hooks.interact(false); }, 150);
  }
  onDown(e) {
    if (!this.enabled || (e.button !== undefined && e.button > 2)) return;
    try { this.dom.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
    this.stopMotion(); this.hooks.first?.();
    const p = this.local(e), now = performance.now();
    this.pointers.set(e.pointerId, { x: p.x, y: p.y, btn: e.button, mods: !!(e.ctrlKey || e.metaKey || e.shiftKey), touch: e.pointerType === "touch", hinted: false });
    this.interact(true);
    if (this.pointers.size === 1) {
      this.tapStart = { x: p.x, y: p.y, t: now, moved: 0 };
      if (this.cooperative && e.pointerType === "touch") this.pan = null; // the page scrolls; two fingers move the map
      else { this.beginPan(p); this.dom.style.cursor = "grabbing"; }
    }
    else if (this.pointers.size === 2) { this.beginPinch(); this.tapStart = null; }
    else { this.pinch = null; this.pan = null; this.tapStart = null; }
    e.preventDefault();
  }
  beginPan(p) { this.update(); const a = this.groundAt(p.x, p.y, new THREE.Vector3()); this.pan = a ? { anchor: a } : null; this.samples = []; }
  beginPinch() {
    const [a, b] = [...this.pointers.values()]; this.update();
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    this.pinch = { d0: Math.hypot(b.x - a.x, b.y - a.y) || 1, a0: Math.atan2(b.y - a.y, b.x - a.x), mid0: mid, dist0: this.dist, theta0: this.theta, phi0: this.phi, anchor: this.groundAt(mid.x, mid.y, new THREE.Vector3()), rotating: false, rotOff: 0, tilting: false, tiltOff: 0 };
    this.pan = null;
  }
  onMove(e) {
    const P = this.pointers.get(e.pointerId); if (!P) return;
    const p = this.local(e), dx = p.x - P.x, dy = p.y - P.y; P.x = p.x; P.y = p.y;
    if (this.tapStart) this.tapStart.moved = Math.max(this.tapStart.moved, Math.hypot(p.x - this.tapStart.x, p.y - this.tapStart.y));
    if (this.pointers.size === 2 && this.pinch) this.movePinch();
    else if (this.pointers.size === 1) {
      if (this.cooperative && P.touch) { if (!P.hinted && this.tapStart && this.tapStart.moved > 12) { P.hinted = true; this.hooks.coop?.("touch"); } return; }
      if (P.btn === 2 || P.mods) { this.theta -= dx * .006; this.phi = clamp(this.phi + dy * .005, this.lim.minPhi, this.lim.maxPhi); this.update(); }
      else if (this.pan) {
        const g = this.groundAt(p.x, p.y, this.tmp2);
        if (g) { this.target.x += this.pan.anchor.x - g.x; this.target.z += this.pan.anchor.z - g.z; this.clampView(); this.update(); this.samples.push([performance.now(), this.target.x, this.target.z]); if (this.samples.length > 8) this.samples.shift(); }
      }
    }
    this.changed(); e.preventDefault();
  }
  movePinch() {
    const [a, b] = [...this.pointers.values()], S = this.pinch;
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1, ang = Math.atan2(b.y - a.y, b.x - a.x), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    this.dist = clamp((S.dist0 * S.d0) / d, this.lim.minDist, this.lim.maxDist);
    let da = ang - S.a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    if (!S.rotating && Math.abs(da) > 6 * DEG) { S.rotating = true; S.rotOff = da; }
    if (S.rotating) this.theta = S.theta0 + (da - S.rotOff);
    const dyMid = mid.y - S.mid0.y;
    if (!S.tilting && Math.abs(dyMid) > 16 && Math.abs(d - S.d0) < 40) { S.tilting = true; S.tiltOff = dyMid; }
    if (S.tilting) this.phi = clamp(S.phi0 + (dyMid - S.tiltOff) * .0045, this.lim.minPhi, this.lim.maxPhi);
    if (S.anchor) this.anchor(mid.x, mid.y, S.anchor); else { this.clampView(); this.update(); }
  }
  onUp(e) {
    const P = this.pointers.get(e.pointerId); if (!P) return;
    this.pointers.delete(e.pointerId); try { this.dom.releasePointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
    if (this.pointers.size === 1) { const [q] = [...this.pointers.values()]; this.pinch = null; this.beginPan(q); this.tapStart = null; }
    else if (this.pointers.size === 0) {
      this.dom.style.cursor = "grab";
      const ts = this.tapStart; this.tapStart = null; this.pinch = null; this.pan = null;
      if (ts && ts.moved < 8 && performance.now() - ts.t < 400 && e.type !== "pointercancel") this.tap(ts.x, ts.y, e);
      else this.startInertia();
      this.interact(false);
    }
    e.preventDefault();
  }
  tap(x, y, e) {
    const hit = this.hooks.tap(x, y, e), now = performance.now(), lt = this.lastTap;
    if (!hit && lt && now - lt.t < 320 && Math.hypot(x - lt.x, y - lt.y) < 30) { this.lastTap = null; this.zoomAt(x, y, .55, 380); }
    else this.lastTap = hit ? null : { x, y, t: now };
  }
  stopMotion() { this.anim = null; this.inertia = null; }
  startInertia() {
    const s = this.samples; if (s.length < 2) return;
    const now = performance.now(), last = s[s.length - 1]; let first = s[0];
    for (const q of s) if (now - q[0] <= 90) { first = q; break; }
    const dt = last[0] - first[0]; if (dt < 8 || now - last[0] > 100) return;
    let vx = (last[1] - first[1]) / dt, vz = (last[2] - first[2]) / dt; const v = Math.hypot(vx, vz), vmax = this.dist * .0014;
    if (v < .002) return; if (v > vmax) { vx *= vmax / v; vz *= vmax / v; }
    this.inertia = { vx, vz, t: now }; this.interact(true); this.tick();
  }
  tick() {
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => {
      const now = performance.now();
      if (this.inertia) {
        const I = this.inertia, dt = Math.min(48, now - I.t); I.t = now; const k = Math.exp(-dt / 260);
        this.target.x += I.vx * dt; this.target.z += I.vz * dt; I.vx *= k; I.vz *= k; this.clampView(); this.update();
        if (Math.hypot(I.vx, I.vz) < .0004) this.inertia = null;
      }
      if (this.anim) {
        const A = this.anim, t = clamp((now - A.t0) / A.ms, 0, 1), k = ease(t);
        this.target.lerpVectors(A.from.target, A.to.target, k); this.dist = A.from.dist + (A.to.dist - A.from.dist) * k;
        this.theta = A.from.theta + (A.to.theta - A.from.theta) * k; this.phi = A.from.phi + (A.to.phi - A.from.phi) * k;
        this.clampView(); this.update(); if (t >= 1) this.anim = null;
      }
      this.changed();
      if (this.inertia || this.anim) this.tick(); else this.interact(false);
    });
  }
  animateTo(to, ms = 450) {
    if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) ms = 1;
    let th = to.theta ?? this.theta; while (th - this.theta > Math.PI) th -= 2 * Math.PI; while (th - this.theta < -Math.PI) th += 2 * Math.PI;
    this.inertia = null;
    this.anim = { t0: performance.now(), ms, from: { target: this.target.clone(), dist: this.dist, theta: this.theta, phi: this.phi }, to: { target: (to.target || this.target).clone(), dist: to.dist ?? this.dist, theta: th, phi: to.phi ?? this.phi } };
    this.interact(true); this.tick();
  }
  zoomAt(x, y, factor, ms = 0) { // zoom keeping the ground point under (x, y) where it is
    this.update(); const a = this.groundAt(x, y, new THREE.Vector3()), dist = clamp(this.dist * factor, this.lim.minDist, this.lim.maxDist);
    if (!a) { if (ms) this.animateTo({ dist }, ms); else { this.dist = dist; this.update(); this.changed(); } return; }
    const saved = { target: this.target.clone(), dist: this.dist };
    this.dist = dist; this.anchor(x, y, a); const to = { target: this.target.clone(), dist };
    this.target.copy(saved.target); this.dist = saved.dist; this.update();
    if (ms) this.animateTo(to, ms); else { this.target.copy(to.target); this.dist = to.dist; this.clampView(); this.update(); this.changed(); }
  }
  zoomBy(factor, ms = 300) { this.zoomAt(this.size.w / 2, this.size.h / 2, factor, ms); }
  onWheel(e) {
    if (!this.enabled) return;
    if (this.cooperative && !e.ctrlKey && !e.metaKey) { this.hooks.coop?.("wheel"); return; } // plain scrolling keeps scrolling the page
    e.preventDefault(); this.hooks.first?.();
    const p = this.local(e), dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 200 : e.deltaY;
    this.stopMotion(); this.zoomAt(p.x, p.y, Math.exp(clamp(dy, -120, 120) * (e.ctrlKey ? .006 : .0016)), 0);
    this.interact(true); this.interact(false);
  }
  onKey(e) {
    if (!this.enabled) return;
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (dir) { // right = screen right, up = away from the viewer
      const step = this.dist * .12, c = Math.cos(this.theta), s = Math.sin(this.theta);
      this.stopMotion(); this.target.x += dir[0] * c * step + dir[1] * -s * step; this.target.z += dir[0] * -s * step + dir[1] * -c * step;
      this.clampView(); this.update(); this.changed(); e.preventDefault(); return;
    }
    if (e.key === "+" || e.key === "=") { this.zoomBy(.7); e.preventDefault(); }
    else if (e.key === "-" || e.key === "_") { this.zoomBy(1 / .7); e.preventDefault(); }
    else if (e.key === "Home" || e.key === "r") { this.hooks.reset?.(); e.preventDefault(); }
  }
  fit(fW, fH, margin, animate, zoom = 1) {
    const t = new THREE.Vector3(fW / 2, 0, fH / 2), theta = CAM.az * DEG, phi = CAM.el * DEG, mx = Math.max(margin * .6, 1.7), corners = [];
    [[-mx, -mx], [fW + mx, -mx], [fW + mx, fH + mx], [-mx, fH + mx]].forEach(([x, z]) => corners.push(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, 2.5, z)));
    const saved = { target: this.target.clone(), dist: this.dist, theta: this.theta, phi: this.phi };
    this.target.copy(t); this.theta = theta; this.phi = phi; let dist = Math.max(fW, fH) * 1.6;
    for (let k = 0; k < 6; k++) { this.dist = dist; this.update(); let m = 0; corners.forEach((c) => { const v = c.clone().project(this.camera); m = Math.max(m, Math.abs(v.x), Math.abs(v.y)); }); dist *= m / .985; }
    const pad = Math.max(margin, 2);
    this.lim = { minDist: Math.max(2.5, dist * .1), maxDist: dist * 1.35, minPhi: 26 * DEG, maxPhi: 82 * DEG, x0: -pad, x1: fW + pad, z0: -pad, z1: fH + pad };
    this.home = { target: t.clone(), dist: dist * zoom, theta, phi }; this.fitDist = dist;
    if (animate) { this.target.copy(saved.target); this.dist = saved.dist; this.theta = saved.theta; this.phi = saved.phi; this.clampView(); this.animateTo(this.home, 600); }
    else { this.dist = dist * zoom; this.clampView(); this.update(); }
  }
}

/* ---------- component ---------- */
export default function Grove3D(props) {
  const { data, zones, roads, crops, fW, fH, margin, env, pathTexture, roadWidth, tasksByZone = {}, selectedId, onZoneOpen, onBadge, onShowCrops } = props;
  const host = useRef(null), labels = useRef(null), tipRef = useRef(null), state = useRef(null), latest = useRef(props), fullRef = useRef(false);
  const [full, setFull] = useState(false);
  const [ahead, setAhead] = useState(0); // growth preview: days from today
  const [timeOpen, setTimeOpen] = useState(false);
  const todayKey = useMemo(() => addDays(todayLocalKey(), ahead), [ahead]);
  const [hint, setHint] = useState(() => { try { return !sessionStorage.getItem("g3-hint"); } catch { return true; } });
  const [busy, setBusy] = useState(true);
  const [coop, setCoop] = useState(null); // "touch" | "wheel" | null — short hint when a page gesture hit the inline map
  const sceneKey = useMemo(
    () => JSON.stringify([zones, data.garden?.plots, data.livestock?.animals, data.ornaments, data.mapLines, data.mapStyle, data.region, roads, fW, fH, margin, env, pathTexture, roadWidth, todayKey]),
    [zones, data.garden?.plots, data.livestock?.animals, data.ornaments, data.mapLines, data.mapStyle, data.region, roads, fW, fH, margin, env, pathTexture, roadWidth, todayKey],
  );
  // growth stages per zone (for the dots under the names) and a farm-wide summary for the time panel
  const stageInfo = useMemo(() => {
    const byZone = {}, totals = [0, 0, 0, 0, 0, 0];
    (data.garden?.plots || []).forEach((pl) => {
      if (pl.status === "harvested" || !pl.zone) return;
      const st = growthOf(pl, crops?.get?.(pl.crop), todayKey).index;
      (byZone[pl.zone] = byZone[pl.zone] || []).push(st); totals[st]++;
    });
    return { byZone, totals };
  }, [data.garden?.plots, crops, todayKey]);
  // tapped planted row → the crop card (top-left) + every row of that crop highlighted on the map
  const [picked, setPicked] = useState(null);
  const pickRow = (row) => { if (!row) { setPicked(null); return; } setPicked({ ...row, color: crops?.get?.(row.crop)?.color }); latest.current.showTip?.(null); };
  const pickInfo = useMemo(() => {
    if (!picked) return null;
    const c = crops?.get?.(picked.crop), rows = (data.garden?.plots || []).filter((p) => p.crop === picked.crop && p.status !== "harvested" && p.zone);
    let plants = 0, soonest = null; const stages = [0, 0, 0, 0, 0, 0], areas = [];
    rows.forEach((p) => {
      const g = growthOf(p, c, todayKey); stages[g.index]++; plants += p.plantCount || p.qty || 0;
      const zn = zones.find((z) => z.id === p.zone)?.name; if (zn && !areas.includes(zn)) areas.push(zn);
      if (p.harvestDate && !g.waiting) { const left = Math.round(dayNum(p.harvestDate) - dayNum(todayKey)); if (soonest == null || left < soonest) soonest = left; }
    });
    return { c, rows: rows.length, plants, areas, stages, soonest };
  }, [picked, data.garden?.plots, crops, zones, todayKey]);
  const showTip = (hit, x, y) => {
    const el = tipRef.current; if (!el) return;
    if (!hit) { el.style.display = "none"; return; }
    const r = hit.userData.plot, when = r.stage === 5 ? "in its harvest window" : r.left == null ? STAGES[r.stage] : r.left > 0 ? `${STAGES[r.stage]} · harvest in ${r.left} d` : `${STAGES[r.stage]} · past harvest date`;
    el.innerHTML = `<b>${r.crop}</b> <i style="background:${STAGE_CSS[r.stage]}"></i><br>${when}${r.count ? ` · ${r.count} plants` : ""}${r.estimated ? "" : " · observed"}<br><span style="opacity:.72">${r.zone} · tap for details</span>`;
    el.style.display = ""; const w = el.offsetWidth, hw = host.current ? host.current.clientWidth : 600;
    el.style.left = `${Math.max(4, Math.min(hw - w - 4, x + 14))}px`; el.style.top = `${Math.max(4, y - el.offsetHeight - 12)}px`;
  };
  const dismissHint = () => { setHint(false); try { sessionStorage.setItem("g3-hint", "1"); } catch { /* private mode */ } };
  const showCoop = (kind) => setCoop(kind);
  useEffect(() => { latest.current = { ...props, dismissHint, showCoop, showTip, pickRow, todayKey }; }); // the engine reads the newest props from here
  useEffect(() => { if (!coop) return; const t = setTimeout(() => setCoop(null), 1800); return () => clearTimeout(t); }, [coop]);
  // renderer, lights and controls: created once
  useEffect(() => {
    const el = host.current; if (!el) return;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" }); }
    catch (err) { void err; latest.current.onUnavailable?.(); return; }
    const mobile = (typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches) || Math.min(screen.width, screen.height) < 820;
    const DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2), LOW = Math.min(DPR, mobile ? 1.15 : 1.25);
    renderer.setPixelRatio(DPR);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false; // static scene: shadows render once
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.02;
    renderer.domElement.className = "g3-canvas"; renderer.domElement.setAttribute("aria-label", "3D farm map: drag to move, pinch or scroll to zoom, two fingers to rotate");
    el.insertBefore(renderer.domElement, el.firstChild);
    const lost = (e) => { e.preventDefault(); latest.current.onUnavailable?.(); };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .55; pmrem.dispose();
    const camera = new THREE.PerspectiveCamera(CAM.fov, 1, 1, 4000);
    scene.add(new THREE.HemisphereLight(0xdde8f5, 0x5c6b3a, .8));
    const sun = new THREE.DirectionalLight(0xfff0dc, 2.6); sun.castShadow = true;
    sun.shadow.mapSize.set(mobile ? 2048 : 3072, mobile ? 2048 : 3072); sun.shadow.radius = 2; sun.shadow.bias = -.0004; sun.shadow.normalBias = .03;
    scene.add(sun); scene.add(sun.target);
    const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), S = { W: 0, H: 0 };
    let queued = false, dirty = false, animOn = false, animRaf = 0, lastFrame = 0, inView = true;
    const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const IDLE_MS = mobile ? 1000 / 20 : 1000 / 30; // idle animation rate; gestures and camera moves render every frame
    const st = { renderer, scene, camera, sun, world: null, hits: [], plotHits: [], faders: [], dims: null, fitted: false, anchors: {}, highlight: null, pickGroup: null, picked: null, calls: 0, animating: false };
    state.current = st;
    if (import.meta.env?.DEV && typeof window !== "undefined") window.__g3 = st; // dev-only inspection hook
    const project = (x, y, z, out) => { const v = out.set(x, y, z).project(camera); return { x: ((v.x + 1) / 2) * S.W, y: ((1 - v.y) / 2) * S.H, on: v.z < 1 }; };
    const pv = new THREE.Vector3();
    st.render = (now = performance.now()) => {
      dirty = false;
      // shared clock and view-dependent uniforms for the shader effects
      if (animOn) TIME.value = now / 1000;
      UPV.value.set(0, 1, 0).transformDirection(camera.matrixWorldInverse);
      const elev = controls.phi / DEG; LEAN.value = clamp((elev - 40) * .5, 0, 28) * DEG;
      st.faders.forEach((m) => { const [v0, v1, h0, h1] = m.userData.fade, u = m.userData.u; u.uFadeV.value = smoothstep(v0, v1, elev); u.uFadeH.value = smoothstep(h0, h1, elev); });
      if (st.M) { const t = TIME.value; st.M.water.map.offset.set(t * .006, t * .004); st.M.glow.opacity = .62 + .2 * Math.sin(t * 2.2); if (st.cloud) st.cloud.offset.set(t * .008, t * .0045); }
      renderer.render(scene, camera); st.calls = renderer.info.render.calls;
      // zone names sit on the thing they name — the centre of its footprint at the height of its roof or
      // bed edge — so a row of narrow beds reads unambiguously; they shrink as the camera pulls back and
      // the biggest areas (and the selected one) win overlaps
      const ls = (controls.fitDist ? clamp(controls.fitDist / controls.dist, .68, 1.15) : 1) * (S.W < 520 ? .85 : 1), far = ls < .8;
      if (far !== st.far) { st.far = far; el.classList.toggle("g3-far", far); }
      const nodes = labels.current ? Array.from(labels.current.children) : [], placed = [], items = [];
      nodes.forEach((n) => {
        const a = st.anchors[n.dataset.zone]; if (!a) return;
        let minX = 1e9, maxX = -1e9; const c = project(a.cx, a.h || 0, a.cz, pv);
        a.corners.forEach(([x, z]) => { const q = project(x, 0, z, pv); minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x); });
        items.push({ n, a, x: c.x, y: c.y, on: c.on, px: maxX - minX });
      });
      items.sort((u, v) => (v.a.sel - u.a.sel) || (v.a.area - u.a.area)).forEach(({ n, a, x, y, on, px }) => {
        const w = a.w * ls, h = 20 * ls, badge = n.querySelector(".g3-badge") ? 24 * ls : 0, box = { x0: x - w / 2 - 3, x1: x + w / 2 + 3 + badge, y0: y - h / 2 - badge * .4, y1: y + h / 2 };
        const inside = x > -w && x < S.W + w && y > -h && y < S.H + h && (a.sel || px >= 28);
        const free = a.sel || !placed.some((q) => box.x0 < q.x1 && box.x1 > q.x0 && box.y0 < q.y1 && box.y1 > q.y0);
        if (free) placed.push(box);
        n.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(${ls.toFixed(3)})`; n.style.display = on && free && inside ? "" : "none";
      });
    };
    st.requestRender = () => { dirty = true; if (queued || animOn) return; queued = true; requestAnimationFrame(() => { queued = false; if (state.current === st && dirty) st.render(); }); };
    // the animation loop runs only while the map is on screen and the tab is visible; idle frames are
    // throttled, frames during gestures and camera moves are not
    const frame = (now) => {
      animRaf = 0; if (!animOn) return;
      if (dirty || controls.interacting || now - lastFrame >= IDLE_MS) { lastFrame = now; st.render(now); }
      animRaf = requestAnimationFrame(frame);
    };
    st.setAnim = () => {
      const want = !reduced && inView && !document.hidden && !!st.world;
      if (want === animOn) return;
      animOn = want; st.animating = want;
      if (want) { lastFrame = 0; animRaf = requestAnimationFrame(frame); } else { cancelAnimationFrame(animRaf); animRaf = 0; }
    };
    const onVis = () => st.setAnim();
    document.addEventListener("visibilitychange", onVis);
    const io = typeof IntersectionObserver === "function" ? new IntersectionObserver((es) => { inView = es.some((e) => e.isIntersecting); st.setAnim(); }, { threshold: 0 }) : null;
    io?.observe(el);
    const controls = new FarmControls(camera, renderer.domElement, {
      change: () => st.requestRender(),
      interact: (on) => { renderer.setPixelRatio(on ? LOW : DPR); st.requestRender(); },
      first: () => latest.current.dismissHint?.(),
      coop: (kind) => latest.current.showCoop?.(kind),
      reset: () => st.reset(true),
      tap: (x, y, e) => {
        const P = latest.current; if (!P.interactive || !P.onZoneOpen) return false;
        ptr.set((x / S.W) * 2 - 1, -(y / S.H) * 2 + 1); ray.setFromCamera(ptr, camera);
        const row = ray.intersectObjects(st.plotHits, false)[0];
        if (row) { P.pickRow?.(row.object.userData.plot); return true; }
        P.pickRow?.(null); // ground or a zone: the crop card closes
        const hit = ray.intersectObjects(st.hits, false)[0];
        if (!hit) return false;
        const z = P.zones.find((q) => q.id === hit.object.userData.zoneId); if (!z) return false;
        P.onZoneOpen(e, z); return true;
      },
    });
    st.controls = controls; controls.setCooperative(!fullRef.current);
    st.size = () => {
      const d = st.dims || { fW: 3, fH: 2, margin: 1 }, ratio = clamp((d.fH + 2 * d.margin) / (d.fW + 2 * d.margin), .62, .8);
      S.W = el.clientWidth || 600; S.H = fullRef.current ? (el.clientHeight || Math.round(S.W * ratio)) : Math.round(Math.min(S.W * ratio, Math.max(220, (window.innerHeight || 800) * .78)));
      renderer.setSize(S.W, S.H); camera.aspect = S.W / S.H; camera.updateProjectionMatrix(); controls.size = { w: S.W, h: S.H };
      if (!st.fitted && st.dims) { st.reset(false); st.fitted = true; } else controls.update();
      st.requestRender();
    };
    st.reset = (animate, zoom = 1) => {
      const { fW, fH, margin } = st.dims; controls.fit(fW, fH, margin, animate, zoom);
      const far = Math.min(controls.fitDist * 3.2, Math.max(fW, fH) * 16 * .9), near = Math.min(controls.fitDist * 1.5, far / 1.4);
      scene.fog = new THREE.Fog(0xd5dfc8, near, far); // haze starts beyond the farthest allowed zoom-out and hides the ground's edge
      st.requestRender();
    };
    st.setupSun = () => {
      const { fW, fH, margin } = st.dims, t = new THREE.Vector3(fW / 2, 0, fH / 2), big = Math.max(fW, fH);
      // afternoon sun, low enough that buildings and trees throw readable shadows
      sun.position.copy(t).add(new THREE.Vector3(.58, 1.0, -.3).normalize().multiplyScalar(big * 2)); sun.target.position.copy(t);
      const e = big * .85 + margin * 2, sc = sun.shadow.camera; sc.left = -e; sc.right = e; sc.top = e; sc.bottom = -e; sc.near = 1; sc.far = big * 6; sc.updateProjectionMatrix();
      renderer.shadowMap.needsUpdate = true;
    };
    st.select = (id) => {
      if (st.highlight) { scene.remove(st.highlight); st.highlight.traverse((m) => { if (m.geometry) m.geometry.dispose(); }); st.highlight = null; }
      const hit = id && st.hits.find((h) => h.userData.zoneId === id);
      if (hit) {
        const b = hit.userData.bounds, g = new THREE.Group(), w = b.x1 - b.x0 + .5, d = b.z1 - b.z0 + .5, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, M = { select: st.M.select, selectEdge: st.M.selectEdge };
        plane(g, w, d, M.select, cx, .03, cz, { receive: false });
        [[cx, cz - d / 2, w, .1], [cx, cz + d / 2, w, .1], [cx - w / 2, cz, .1, d], [cx + w / 2, cz, .1, d]].forEach(([x, z, bw, bd]) => box(g, bw, .05, bd, M.selectEdge, x, .04, z, { cast: false, receive: false }));
        scene.add(g); st.highlight = g;
      }
      Object.entries(st.anchors).forEach(([zid, a]) => { a.sel = zid === id ? 1 : 0; });
      st.requestRender();
    };
    // crop group: every planted row of the tapped crop lights up in the crop's colour, the tapped row with a thicker edge
    st.pick = (sel) => {
      if (st.pickGroup) { scene.remove(st.pickGroup); st.pickGroup.traverse((m) => { if (m.geometry) m.geometry.dispose(); }); st.pickMats?.forEach((m) => m.dispose()); st.pickGroup = null; st.pickMats = null; }
      st.picked = sel || null;
      if (sel && st.world) {
        st.world.updateMatrixWorld(true);
        const rows = st.plotHits.filter((h) => h.userData.plot.crop === sel.crop);
        if (rows.length) {
          const g = new THREE.Group(), col = new THREE.Color(sel.color || "#ffffff"), white = new THREE.Color(0xffffff), v = new THREE.Vector3();
          const fill = st.M.pick.clone(), edge = st.M.pickEdge.clone(); fill.color.copy(col).lerp(white, .3); edge.color.copy(col).lerp(white, .15); st.pickMats = [fill, edge];
          rows.forEach((h) => {
            const p = h.getWorldPosition(v), q = h.geometry.parameters, w = q.width + .3, d = q.depth + .3, y = p.y - q.height / 2, t = h.userData.plot.id === sel.id ? .14 : .07;
            plane(g, w, d, fill, p.x, y + .015, p.z, { receive: false });
            [[p.x, p.z - d / 2, w, t], [p.x, p.z + d / 2, w, t], [p.x - w / 2, p.z, t, d], [p.x + w / 2, p.z, t, d]].forEach(([x, z, bw, bd]) => box(g, bw, .04, bd, edge, x, y + .03, z, { cast: false, receive: false }));
          });
          scene.add(g); st.pickGroup = g;
        }
      }
      st.requestRender();
    };
    const onLoaded = () => { renderer.shadowMap.needsUpdate = true; st.requestRender(); };
    onTexturesLoaded.add(onLoaded);
    // hover tooltips for planted rows (mouse / trackpad only)
    let hoverAt = 0, hoverTimer = 0;
    const onHover = (e) => {
      if (e.pointerType === "touch" || controls.pointers.size) return;
      const now = performance.now(); if (now - hoverAt < 50) return; hoverAt = now;
      const r = renderer.domElement.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      ptr.set((x / S.W) * 2 - 1, -(y / S.H) * 2 + 1); ray.setFromCamera(ptr, camera);
      const hit = ray.intersectObjects(st.plotHits, false)[0];
      clearTimeout(hoverTimer); latest.current.showTip?.(hit ? hit.object : null, x, y);
    };
    const onLeave = () => { clearTimeout(hoverTimer); hoverTimer = setTimeout(() => latest.current.showTip?.(null), 80); };
    renderer.domElement.addEventListener("pointermove", onHover); renderer.domElement.addEventListener("pointerleave", onLeave); renderer.domElement.addEventListener("pointerdown", onLeave);
    const ro = new ResizeObserver(() => st.size()); ro.observe(el);
    return () => {
      animOn = false; cancelAnimationFrame(animRaf); io?.disconnect(); document.removeEventListener("visibilitychange", onVis);
      ro.disconnect(); onTexturesLoaded.delete(onLoaded); controls.dispose(); renderer.domElement.removeEventListener("webglcontextlost", lost);
      renderer.domElement.removeEventListener("pointermove", onHover); renderer.domElement.removeEventListener("pointerleave", onLeave); renderer.domElement.removeEventListener("pointerdown", onLeave); clearTimeout(hoverTimer);
      if (st.world) st.world.traverse((m) => { if (m.geometry) m.geometry.dispose(); });
      renderer.dispose(); if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement); state.current = null;
    };
  }, []);
  // (re)build the world only when something on the map changed
  useEffect(() => {
    const st = state.current; if (!st) return;
    const P = latest.current;
    if (st.world) { st.scene.remove(st.world); st.world.traverse((m) => { if (m.geometry) m.geometry.dispose(); }); }
    st.hits = []; st.plotHits = []; st.M = materials(); latest.current.showTip?.(null);
    const dimsChanged = !st.dims || st.dims.fW !== P.fW || st.dims.fH !== P.fH || st.dims.margin !== P.margin;
    st.dims = { fW: P.fW, fH: P.fH, margin: P.margin };
    const ctx = { data: P.data, zones: P.zones, roads: P.roads, crops: P.crops, fW: P.fW, fH: P.fH, margin: P.margin, env: P.env, pathTexture: P.pathTexture, roadWidth: P.roadWidth, todayKey: P.todayKey || todayLocalKey(), hits: st.hits, plotHits: st.plotHits, M: st.M,
      faces: new Map(), sprites: new Map(), tufts: [], pots: [], herd: [], fruit: new Map(), fences: { plain: { posts: [], rails: [] }, picket: { posts: [], caps: [], rails: [] } }, growth: { strips: [], glows: [], poles: [], tags: [[], [], [], [], [], []], sprouts: [] } };
    st.world = buildWorld(ctx); st.cloud = ctx.cloud; st.herd = ctx.herd;
    const faders = new Set(); st.world.traverse((m) => { const mat = m.material; if (mat && !Array.isArray(mat) && mat.userData.fade) faders.add(mat); }); st.faders = [...faders];
    st.scene.add(st.world);
    st.anchors = Object.fromEntries(P.zones.map((z) => [z.id, { cx: z.xM + z.wM / 2, cz: z.yM + z.hM / 2, h: 0, corners: [[z.xM, z.yM], [z.xM + z.wM, z.yM], [z.xM + z.wM, z.yM + z.hM], [z.xM, z.yM + z.hM]], area: z.wM * z.hM, sel: 0, w: Math.min(23, z.name.length) * 6 + 16 }]));
    st.hits.forEach((h) => { const a = st.anchors[h.userData.zoneId]; if (a) a.h = Math.min(6, h.userData.bounds.h); }); // label height: roof ridge, bed edge…
    st.setupSun();
    if (dimsChanged) st.fitted = false;
    st.size(); st.select(P.selectedId); setBusy(false); st.setAnim();
    const t = setTimeout(() => { st.renderer.shadowMap.needsUpdate = true; st.requestRender(); }, 600);
    return () => clearTimeout(t);
  }, [sceneKey]);
  useEffect(() => { state.current?.select(selectedId); }, [selectedId]);
  useEffect(() => { state.current?.pick?.(picked); }, [picked, sceneKey]);
  useEffect(() => { state.current?.requestRender(); }, [tasksByZone]);
  // full-screen mode: the map takes the whole viewport, page scroll locked, Escape closes
  useEffect(() => {
    fullRef.current = full; const st = state.current;
    st?.controls?.setCooperative(!full);
    const prev = document.body.style.overflow; if (full) document.body.style.overflow = "hidden";
    // Hide the bottom navigation and assistant button while the map owns the screen.
    document.body.classList.toggle("g3-full-open", full);
    const key = (e) => { if (e.key === "Escape" && full) setFull(false); };
    window.addEventListener("keydown", key);
    if (st) { st.size(); st.reset(true, full && host.current && host.current.clientWidth < host.current.clientHeight ? .78 : 1); }
    return () => { window.removeEventListener("keydown", key); if (full) { document.body.style.overflow = prev === "hidden" ? "" : prev; document.body.classList.remove("g3-full-open"); } };
  }, [full]);
  useEffect(() => { if (!hint) return; const t = setTimeout(() => latest.current.dismissHint?.(), 6000); return () => clearTimeout(t); }, [hint]);
  const ctl = (f) => { const st = state.current; if (st?.controls) f(st.controls, st); };
  const hostStyle = full
    ? { position: "fixed", inset: 0, zIndex: 6500, overflow: "hidden", touchAction: "none", background: "linear-gradient(180deg,#b9d0e6 0%,#d9e2d0 42%,#9fb28a 100%)" }
    : { position: "relative", width: "100%", overflow: "hidden", touchAction: "pan-y" };
  return (
    <div className={`g3-host${full ? " full" : ""}`} ref={host} style={hostStyle}>
      <div ref={labels} className="g3-labels" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}>
        {zones.map((z) => {
          const list = tasksByZone[z.id] || [];
          return (
            <div key={z.id} data-zone={z.id} className={`g3-label${selectedId === z.id ? " on" : ""}`} style={{ position: "absolute", left: 0, top: 0, display: "none", pointerEvents: "auto", whiteSpace: "nowrap" }}>
              <button type="button" className="g3-pill" onClick={(e) => onZoneOpen && onZoneOpen(e, z)}>{z.name.length > 23 ? z.name.slice(0, 22) + "…" : z.name}</button>
              {(stageInfo.byZone[z.id] || []).length > 0 && (
                <span className="g3-dots" aria-hidden="true">{(stageInfo.byZone[z.id] || []).slice(0, 8).map((st, i) => <i key={i} style={{ background: STAGE_CSS[st] }} />)}</span>
              )}
              {list.length > 0 && onBadge && !ahead && (
                <button type="button" className="g3-badge" aria-label={`${list.length} job${list.length === 1 ? "" : "s"} waiting at ${z.name}`} onClick={(e) => { e.stopPropagation(); onBadge(z.id); }}>
                  <span>{taskGlyph(list[0])}</span><b>{list.length}</b>
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div ref={tipRef} className="g3-tip" style={{ display: "none" }} role="tooltip" />
      {ahead > 0 && <div className="g3-preview" role="status">Preview · {new Date(todayKey + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" })} · in {ahead} days</div>}
      <div className="g3-ctl" role="group" aria-label="Map view controls">
        {/* Visible words under the icons (UX audit 2026-09-28: a calendar icon didn't say "growth preview"). */}
        <button type="button" className="g3-btn g3-lbl" aria-label="Growth preview and legend" title="See how your plants grow over the coming weeks" aria-pressed={timeOpen} onClick={() => setTimeOpen(!timeOpen)}><Sprout size={17} /><span aria-hidden="true">Growth</span></button>
        <button type="button" className="g3-btn g3-zoom" aria-label="Zoom in" title="Zoom in" onClick={() => ctl((c) => c.zoomBy(.66))}><Plus size={18} /></button>
        <button type="button" className="g3-btn g3-zoom" aria-label="Zoom out" title="Zoom out" onClick={() => ctl((c) => c.zoomBy(1 / .66))}><Minus size={18} /></button>
        <button type="button" className="g3-btn g3-lbl" aria-label="Reset view" title="Show the whole map again" onClick={() => ctl((c, st) => st.reset(true))}><Compass size={17} /><span aria-hidden="true">Reset</span></button>
        <button type="button" className="g3-btn g3-lbl" aria-label={full ? "Exit full screen" : "Full screen map"} title={full ? "Exit full screen" : "Open the map full screen"} aria-pressed={full} onClick={() => setFull(!full)}>{full ? <Minimize2 size={17} /> : <Maximize2 size={17} />}<span aria-hidden="true">{full ? "Exit" : "Expand"}</span></button>
      </div>
      {full && <button type="button" className="g3-btn g3-close" aria-label="Close full screen map" onClick={() => setFull(false)}><X size={20} /></button>}
      {timeOpen && (
        <div className="g3-time" role="group" aria-label="Growth preview">
          <div className="g3-time-row">
            <strong>{ahead ? `In ${ahead} days` : "Today"}</strong>
            {[[0, "Today"], [14, "+2 wk"], [30, "+1 mo"], [60, "+2 mo"], [90, "+3 mo"]].map(([d, l]) => (
              <button key={d} type="button" className={`g3-chip${ahead === d ? " on" : ""}`} onClick={() => setAhead(d)}>{l}</button>
            ))}
          </div>
          <input type="range" min="0" max="120" step="1" value={ahead} aria-label="Days from today" onChange={(e) => setAhead(Number(e.target.value))} />
          <div className="g3-legend">
            {STAGES.map((name, i) => (
              <span key={name}><i style={{ background: STAGE_CSS[i] }} />{name}{stageInfo.totals[i] ? ` ${stageInfo.totals[i]}` : ""}</span>
            ))}
          </div>
        </div>
      )}
      {picked && pickInfo && (
        <div className="g3-crop" role="dialog" aria-label={`${picked.crop} details`}>
          <div className="g3-crop-head">
            <span className="g3-crop-emoji" aria-hidden="true">{pickInfo.c?.emoji || "🌱"}</span>
            <div><strong>{picked.crop}</strong><small>{picked.zone}{picked.count ? ` · ${picked.count} plants` : ""}</small></div>
            <button type="button" className="g3-crop-x" aria-label="Close crop details" onClick={() => pickRow(null)}><X size={15} /></button>
          </div>
          <div className="g3-crop-stage"><i style={{ background: STAGE_CSS[picked.stage] }} />{picked.stage === 5 ? "In its harvest window" : picked.left == null ? STAGES[picked.stage] : picked.left > 0 ? `${STAGES[picked.stage]} · harvest in ${picked.left} d` : `${STAGES[picked.stage]} · past harvest date`}{picked.estimated ? "" : " · observed"}</div>
          <div className="g3-crop-group"><strong>{pickInfo.rows} row{pickInfo.rows === 1 ? "" : "s"} highlighted</strong>{pickInfo.plants ? ` · ${pickInfo.plants} plants` : ""}{pickInfo.areas.length ? ` · ${pickInfo.areas.join(", ")}` : ""}{pickInfo.soonest != null ? ` · first harvest ${pickInfo.soonest > 0 ? `in ${pickInfo.soonest} d` : "now"}` : ""}</div>
          {pickInfo.rows > 1 && <div className="g3-legend g3-crop-stages">{STAGES.map((n, i) => pickInfo.stages[i] ? <span key={n}><i style={{ background: STAGE_CSS[i] }} />{n} {pickInfo.stages[i]}</span> : null)}</div>}
          {pickInfo.c && (
            <dl className="g3-crop-facts">
              <div><dt>Sun</dt><dd>{pickInfo.c.sun}</dd></div>
              <div><dt>Water</dt><dd>{pickInfo.c.waterFreq}</dd></div>
              <div><dt>Spacing</dt><dd>{pickInfo.c.spacing} cm</dd></div>
              <div><dt>Harvest</dt><dd>{pickInfo.c.harvest}</dd></div>
            </dl>
          )}
          {onShowCrops && <button type="button" className="g3-chip" onClick={onShowCrops}>Open Crops →</button>}
        </div>
      )}
      {hint && !busy && !picked && <div className="g3-hint" aria-hidden="true">Drag to move · pinch or scroll to zoom · two fingers to turn</div>}
      {coop && <div className="g3-coop" role="status">{coop === "touch" ? "Use two fingers to move the map, or open it full screen" : "Hold ⌘ / Ctrl and scroll to zoom the map"}</div>}
      {busy && <div className="g3-busy" aria-live="polite">Building your farm…</div>}
    </div>
  );
}
