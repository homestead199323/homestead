# Living Farm Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The 3D farm map follows the real sky (time of day, weather, wind), animals wander and react, plus pond ripples, falling fruit and a new Yard zone type.

**Architecture:** Pure, unit-tested modules compute state (`sky.js` → SkyState, `herd-brain.js` → animal legs); `Grove3D.jsx` applies that state to lights, uniforms and attribute ranges. All motion stays in vertex shaders driven by the shared `TIME` uniform; the CPU only writes when something changes (a leg ends, a minute passes, the forecast changes).

**Tech Stack:** React 19, Vite 8, three.js 0.186 (custom `onBeforeCompile` shaders), node:test via `scripts/test.mjs` (rolldown bundle), Playwright on the Mac for harness screenshots.

**Spec:** `docs/superpowers/specs/2026-10-13-living-farm-map-design.md`

## Global Constraints

- `docs/MAP_STYLE.md` rules: rounded geometry, flat matte colour, no textures/sprites/planes, only objects cast shadows, nothing darkens the ground, no cloud shadows.
- Home-view budget on `tests/g3-all.html`: ≤ 200 draw calls, ≤ 700 k triangles; this work adds ≤ 5 calls.
- `liveSky` off must reproduce today's render (< 0.5 % pixel diff on the all-zones harness).
- Phones (`pointer: coarse` or short side < 820): halve rain/snow/cloud/bird counts. `prefers-reduced-motion`: no rain/snow/birds/butterflies/falling fruit, animals stand.
- Unique string markers per commit for bundle verification: `"Live sky"`, `"g3rain"`, `"herd-brain"`, `"Yard / parking"`.
- JSX rules from the project instructions (no conditional spread, literal UTF-8, `function()` inside `.map()` for interactive elements).
- Deploy: ESLint clean, `npm test` green, `NODE_ENV=development npm run build`, push with token redaction, Vercel READY, bundle grep, CSP header unchanged.

## Review Focus

1. A farm with no city (no forecast, no lat): sky must still follow the clock at 50° N and weather must be calm/clear — never throw. (Task 1 test `sky: no weather → clear calm`.)
2. Polar/odd dates: 21 Dec at 60° N has a sun that barely rises; elevation must stay finite and presets must not NaN. (Task 1 test `sky: high latitude winter is finite`.)
3. The tab left open across midnight / DST: the 60 s tick uses `new Date()` each time, never a cached day. (Task 2 Step 4.)
4. A herd whose arena is smaller than the animal (narrow coop run): every leg must stay inside the arena or the animal stands. (Task 4 test `brain: tiny arena → stand`.)
5. Weather fetch failing after a success: the map keeps the last good weather, never flips to none mid-session. (Task 2 Step 5: GroveHome only replaces `weather` with an `ok:true` result.)

---

### Task 1: `sky.js` — pure sky state

**Files:**
- Create: `src/features/grove/sky.js`
- Create: `tests/sky.test.js`; Modify: `tests/domain.test.js` (add `import './sky.test.js';`)

**Interfaces:**
- Produces: `sunPosition(date: Date, latDeg: number) → { elevation: deg, azimuth: deg (0 = N, clockwise) }`
- Produces: `skyState({ date, lat = 50, weather = null, liveSky = true, reduced = false }) → SkyState` with fields from spec §1: `sunDir [x,y,z] (unit, scene space), sunColor hex, sunIntensity, hemiSky, hemiGround, hemiIntensity, fog hex, exposure, shadowIntensity, envIntensity, night 0..1, windDir [x,z] (unit), windStrength 0..1, precip 'none'|'rain'|'snow', cloud 0..1, tempC`.
- Produces: `FIXED_SKY` — the `liveSky:false` state (21 Jun, 15:00, 50° N, clear, calm) whose `sunDir` equals today's hard-coded `(.55, 1.25, -.35).normalize()`.
- Produces: `weatherOf(weather|null) → { cloud, precip, windDir, windStrength, tempC }` (spec §2 table; `windStrength = clamp(windKmh/45, .15, 1)`; null → `{cloud:0, precip:'none', windDir:[.72,-.69], windStrength:.15, tempC: 15}`); `windToScene(deg) → [x,z]`.

- [ ] **Step 1: Write the failing tests** (`tests/sky.test.js`, node:test):
  - `sky: London noon midsummer ≈ 62°`: `sunPosition(new Date(2026,5,21,12,0), 51.5).elevation` within ±1.5 of 62.
  - `sky: London noon midwinter ≈ 15°`: 2026-12-21 12:00 → within ±1.5 of 15.
  - `sky: night at 23:00`: `skyState({date: new Date(2026,5,21,23), lat:51.5}).night === 1`.
  - `sky: fixed look matches today's sun`: `FIXED_SKY.sunDir` ≈ `[.55,1.25,-.35]/|…|` (each ±0.01), `sunIntensity 2.1`, `fog '#b4c69d'`.
  - `sky: no weather → clear calm`: `precip 'none'`, `cloud 0`, `windStrength .15`.
  - `sky: high latitude winter is finite`: 2026-12-21 12:00 at lat 60 → `Number.isFinite(elevation)` and every numeric SkyState field finite.
  - `sky: weather table`: code 3 → cloud .85; 61 → rain; 73 → snow; 45 → cloud 1; wind 90 km/h → strength 1.
  - `sky: preset blend monotonic`: sunIntensity at elevations 40, 20, 5, −10 is non-increasing.
- [ ] **Step 2: Run** `npm test` → FAIL (module missing).
- [ ] **Step 3: Implement `sky.js`.** Solar: declination `23.44·sin(2π(284+doy)/365)`, hour angle from local clock hour (`getHours()+minutes/60`, treated as solar time — no equation-of-time, no longitude), elevation/azimuth by the standard spherical formula. Scene mapping: scene azimuth = solar azimuth + a constant offset computed once so that 15:00 on 21 Jun at 50° N yields exactly today's vector. Presets as spec §1 table; blend linearly by elevation between neighbours; `night = clamp(−elev/6, 0, 1)`. Moon: azimuth mirrored through north, elevation 40°.
- [ ] **Step 4: Run** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(map): sky state module (sun position, light presets, weather table)`.

### Task 2: Apply the sky in `Grove3D.jsx` + Settings toggle

**Files:**
- Modify: `src/features/grove/Grove3D.jsx` (renderer effect ~L1466–1500, fit/sun placement ~L1573–1580, materials ~L85 `glass`, `winGlass`, `brass`)
- Modify: `src/features/farm/Farm.jsx:714-721` (Ground & paths list)
- Modify: `src/features/grove/GroveScene.jsx:661` (pass `weather`), `src/features/grove/GroveHome.jsx` (pass `weather` to GroveScene), `src/App.jsx:513-525` (store `data.cityGeo`), `src/lib/weather.js:188-206` (return `lat, lng, windKmh, windDeg, isDay`)
- Modify: `tests/g3-all-preview.jsx`, `tests/g3-zoo-preview.jsx` (read `?hour=&wx=&wind=` → `skyOverride` prop)

**Interfaces:**
- Consumes: `skyState`, `FIXED_SKY` from Task 1.
- Produces: `Grove3D` props `weather` (`fetchWeather` result or null) and `skyOverride` (`{ hour, wx: 'clear'|'overcast'|'rain'|'snow', windKmh }` — harness only); `st.applySky(state)`; `data.mapStyle.liveSky` (`'on'|'off'`, default on); `data.cityGeo = { lat, lng }`.
- Produces: `NIGHT = { value: 0 }` uniform exported from `toy.js`, read by `M.glass` / `M.winGlass` / `M.brass` (emissive lerps to `#ffd27a`).

- [ ] **Step 1: Baseline screenshot.** `npx vite --port 5179` on the Mac; Playwright screenshot of `/tests/g3-all.html` at 1200×760 → `tmp/g3-before.png`.
- [ ] **Step 2: Refactor lights to `applySky`.** Replace the constant hemisphere/sun/fog/exposure/shadow-intensity values with `st.applySky(state)`; call it with `FIXED_SKY` where the lights are created and in the fit code (sun direction = `state.sunDir`, same `big*2` distance). Add `uNight` to the three materials via `onBeforeCompile` (`totalEmissiveRadiance += uNight * vec3(1., .82, .48) * .9`).
- [ ] **Step 3: Verify no regression.** Screenshot again → `tmp/g3-after.png`; pixel diff (node script with `pngjs` + `pixelmatch`, threshold .1) < 0.5 %. Record the number in the commit message.
- [ ] **Step 4: Live tick.** `tick = () => { st.applySky(skyState({ date: new Date(), lat: latest.current.lat, weather: latest.current.weather, liveSky: latest.current.liveSky, reduced })); renderer.shadowMap.needsUpdate = true; st.requestRender(); }`; run on mount, on `weather`/`liveSky`/`skyOverride` change, and `setInterval(tick, 60000)` cleared on unmount. `skyOverride` builds a Date at that hour today and a fake weather object.
- [ ] **Step 5: Plumbing.** `weather.js`: add `lat, lng, windKmh: cw.windspeed, windDeg: cw.winddirection, isDay: cw.is_day` to `fetchWeather`'s result and `lat/lng` to `fetchForecast`'s. `App.jsx`: when a forecast result has `lat` and `data.cityGeo` differs, `setData({...data, cityGeo:{lat,lng}})` once. `GroveHome` keeps the last `ok:true` weather in state → `GroveScene` → `Grove3D`. `Farm.jsx` list: add `['liveSky','Live sky',[['on','On — clock and weather'],['off','Off — fixed afternoon']]]`.
- [ ] **Step 6: Harness overrides.** Both preview files parse `location.search`; `?hour=23` → night, `?wx=rain` → code 61, `overcast` → 3, `snow` → 73; `?wind=40`.
- [ ] **Step 7: Verify.** `npx eslint src tests`, `npm test`, build. Playwright screenshots hour 6/13/19/23 (clear) → `tmp/sky-*.png`; night shows lit windows and readable ground.
- [ ] **Step 8: Commit** `feat(map): live sky — sun follows the clock, night with lit windows, Live sky setting` (marker `"Live sky"`).

### Task 3: Weather — clouds, rain/snow, wind gusts, vane

**Files:**
- Modify: `src/features/grove/Grove3D.jsx` (`foliage` L44–55, `motionShader` L57–68, `buildMotion` L947–957, barn cupola L555–560), `src/features/grove/crops3d.js` (`cropMaterials` sway), `src/features/grove/toy.js` (export `WIND`)
- Create: `src/features/grove/weather-fx.js`

**Interfaces:**
- Consumes: `SkyState.windDir/windStrength/precip/cloud` via `st.applySky`.
- Produces: `WIND = { value: new THREE.Vector3(dx, dz, strength) }` from `toy.js`, read by `foliage`, `cropMaterials`, `motionShader`.
- Produces: `buildClouds(fW, fH, count, mat) → Mesh` (`userData.drift` uniform), `buildPrecip(kind, count, mat) → InstancedMesh` (anim 6 rain, 7 snow), `precipCount(kind, { mobile, reduced })` (400/200 rain, 260/130 snow, 0 reduced); `st.setWeatherFx(state)` adds/removes them without rebuilding the world.
- Produces: `st.vane` — the cupola vane as its own Group, `rotation.y = windDeg·DEG`.

- [ ] **Step 1: Failing test** in `tests/sky.test.js`: `precipCount('rain', {mobile:true, reduced:false}) === 200`, `precipCount('snow', {mobile:false, reduced:true}) === 0`; `windToScene(180)` is a unit vector.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Gust wave in `foliage`/crop sway: `float g3ph = dot(position.xz, uWind.xy) * .35 - uTime * (1.2 + uWind.z * 1.8);` and amplitude `× (.5 + uWind.z)`; smoke `transformed.xz += uWind.xy * uWind.z * g3t * 1.6`. `weather-fx.js`: clouds (merged 4–6 spheres r 1.2–2.4, `#f6f5f1`, `castShadow=false`, y 16–20; drift advanced in `st.render` by `dt·(0.3 + .3·strength)`, wrap at ±(fW+30)); rain capsule .03×.22 falling 9 m/s with downwind lean `(1−t)·1.5`; snow sphere r .05, 1.2 m/s, sinusoidal drift; both wrap y 14→0 around the camera target via a `uCenter` uniform. Vane: not tagged/baked; rotated on apply.
- [ ] **Step 4: Run** tests → PASS; harness `?wx=rain|overcast|snow`, `?wind=50` screenshots; `window.__g3.calls` ≤ 200 on `g3-all`.
- [ ] **Step 5: Commit** `feat(map): weather — toy clouds, rain and snow, wind gusts and vane` (marker `"g3rain"`).

### Task 4: `herd-brain.js` — pure behaviour

**Files:**
- Create: `src/features/grove/herd-brain.js`
- Create: `tests/herd-brain.test.js`; Modify `tests/domain.test.js` import.

**Interfaces:**
- Produces: `createBrain(animals: [{ idx, species, kind: 'grazer'|'bird'|'hopper', L, walk, x, z, arena: {x0,x1,z0,z1}|null, home: {x,z}|null, water: {x0,x1,z0,z1,y}|null, seed }]) → Brain`.
- Produces: `brain.tick(now: seconds, env: { night: 0..1, reduced: boolean }) → Leg[]`, `Leg = { idx, from:[x,z], to:[x,z], t0, t1, mode, param, heading }`.
- Produces: `brain.scatter(idxs: number[], x, z, now) → Leg[]`.
- Produces: `MODE = { stand:0, graze:1, walk:2, lie:3, swim:4, scatter:5, inside:6 }`.

- [ ] **Step 1: Failing tests** (seeded `rng(seed)` = mulberry32 as in `animals3d.js`, exported from `herd-brain.js`):
  - `brain: legs stay inside the arena` — 500 ticks (0.25 s apart) of a goat in a 6×4 arena: every `to` inside the arena inset by `L·.55`.
  - `brain: tiny arena → stand` — arena .4×.4 for a cow: every leg mode ∈ {stand, graze} and `from` equals `to`.
  - `brain: birds go inside at night and out at dawn` — chicken with `home`: after 200 ticks with `night:1` latest mode is 6 and `to ≈ home`; after 200 more with `night:0` a leg has mode ≠ 6.
  - `brain: scatter moves away from the tap` — hen at (2,2), `scatter([0], 1, 1, now)`: `dot(to−from, (1,1)) > 0`, `t1−t0` within [1.3, 1.7].
  - `brain: no overlapping legs` — consecutive legs per animal satisfy `next.t0 ≥ prev.t1 − 1e-6`.
  - `brain: ducks swim` — duck with reachable `water`: within 400 ticks a leg has mode 4 with `to` inside the water rect.
  - `brain: reduced motion → stand only`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** per spec §3 weights and durations; walk time = distance / `walk`; lie only for Cow/Sheep/Pig/Goat.
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `feat(map): herd brain — wander, graze, lie, swim, scatter, roost`.

### Task 5: Wire the brain into `animals3d.js` + swallows and butterflies

**Files:**
- Modify: `src/features/grove/animals3d.js` (GLSL_HEAD L216–243, `buildHerd` L267–292), `src/features/grove/Grove3D.jsx` (animal collection ~L909–934, `buildMotion`, coop tap handler, `frame` loop)
- Create: `src/features/grove/fauna-fx.js`

**Interfaces:**
- Consumes: `createBrain`, `MODE` (Task 4); `WIND`, `TIME`, `NIGHT`.
- Produces: `buildHerd(items, TIME) → { mesh, ranges: [{ idx, start, count }], l1: BufferAttribute, l2: BufferAttribute }` (`mesh.name = "herd-brain"`); `applyLegs(herd, legs)` writes `g3l1/g3l2` per range + `addUpdateRange`.
- Produces: `buildSwallows(center, count, mat)`, `buildButterflies(points, count, mat)` — instanced meshes, motion anim 4 / 5; `visible` toggled by `st.setWeatherFx` (night, rain, tempC < 8).

- [ ] **Step 1: Shader.** Replace the ellipse block in `g3pose` with the leg block (`u = smoothstep(t0,t1,uTime)`, `mix`, heading from `to−from` while walking); modes: lie (body y −.35·H, legs scaled .25), swim (y = param, no swing, slow bob), scatter (gait ×2.5, head and tail up), inside (scale 0).
- [ ] **Step 2: `buildHerd`** returns ranges; initial legs = stand. `Grove3D`: after a world build `st.brain = createBrain(...)` (arena from the zone, `home` = coop pop door, `water` = a `water` zone touching the arena inset .4, y = rim−.14). In `frame`, every 250 ms: `applyLegs(st.herd, st.brain.tick(TIME.value, { night: st.sky.night, reduced }))`. Coop tap: before `onZoneOpen`, `applyLegs(st.herd, st.brain.scatter(idxsInZone, hit.point.x, hit.point.z, TIME.value))`.
- [ ] **Step 3: Fauna.** Swallow = capsule .18 + two swept rounded wing boxes, `#3b4a5a`/cream; butterfly = two .06 rounded boxes in palette gold/white/pale orange. Anim 4: Lissajous `x = A sin(ω₁t+φ), z = B sin(ω₂t)`, y 9–14, bank from the derivative; anim 5: flutter in a .6 m sphere. Wing flap in the vertex shader rotates wing vertices about the body axis (left/right by the sign of `position.x`): 6 Hz ±35° swallows, 9 Hz butterflies.
- [ ] **Step 4: Verify.** `npm test`; `g3-zoo.html` at `?hour=13` and `?hour=23` (hens inside at 23); `__g3.calls` ≤ 200 on `g3-all`; brain tick ≤ 0.3 ms measured in the harness console.
- [ ] **Step 5: Commit** `feat(map): living animals — wandering herd, roosting hens, swallows and butterflies` (marker `"herd-brain"`).

### Task 6: Polish — pond ripple, fruit drop, Yard zone, migration

**Files:**
- Modify: `src/features/grove/Grove3D.jsx` (`M.water` L87, pond L742–765, `fruitTree` L162–177, `buildFruit` L178, new `yard` branch in `buildZone`), `src/data/zones.js` (`{ id:"yard", label:"Yard / parking", fill:"#e4ddd0", stroke:"#b8b0a2", icon:"🅿️" }`), `src/features/grove/GroveScene.jsx` + `AerialArtwork.jsx` (flat `yard`), `src/features/grove/palette.js` (yard tones `#d9d2c3`/`#c9c2b3`), `src/lib/migrations.js` (`migrateYardLine`), wherever `migrateProfile` is called on load, `scripts/render-icons.mjs`, `tests/artwork.test.js:25` (add `'yard'`), `docs/MAP_STYLE.md`
- Test: `tests/launch-fixes.test.js`

**Interfaces:**
- Produces: `migrateYardLine(data) → data` — if `data.mapLines` has a `path` whose points equal the spec's 25-point list, remove it and append zone `{ id:"yard-ws", type:"yard", name:"Parking", xM:46, yM:46, wM:33, hM:4 }` (skip if `yard-ws` exists).

- [ ] **Step 1: Failing test** `migration: the workshop zig-zag becomes a yard` — exact line → zone added, line removed, idempotent; a line with one point changed is left alone.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** migration, `yard` type, 3D branch (rounded slab .06 `#d9d2c3`, rim `#c9c2b3`, white bay lines .08 wide every 2.6 m along the long side when it is ≥ 5 m), flat-map rect, icon render, MAP_STYLE additions (live sky, weather, animals, yard).
- [ ] **Step 4: Pond ripple + fruit drop.** `M.water` `onBeforeCompile`: `transformed.y += uRipple * (sin(position.x*3.1+uTime*1.7) + sin(position.z*2.7-uTime*1.3)) * .012`, `uRipple` 1 or 3 (rain); delete the two `ring(..M.ripple..)` calls. `fruitTree` pushes one `{p, s, phase, ground}` per ripe tree into `ctx.fruitDrop`; `buildFruit` draws them with a motion-shader fruit material (anim 8: fall .6 s, rest 6–10 s, fade .5 s, repeat).
- [ ] **Step 5: Verify.** `node scripts/render-icons.mjs` then `npm test`; `g3-all` harness with a `yard` zone added to its preview data; after deploy, Dervis's live farm shows the parking slab.
- [ ] **Step 6: Commit** `feat(map): pond ripple, falling fruit, Yard zone type, workshop parking migration` (marker `"Yard / parking"`).

### Task 7: Ship and verify each commit

- [ ] Before the first push: send Dervis the contact sheet (sky hours, weather, zoo day/night).
- [ ] After each of Tasks 2, 3, 5, 6: push with `| sed -E 's/(ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]+/[REDACTED]/g'`; wait ~80 s; `Vercel:list_deployments` (projectId `prj_dd0KcC0rdq3iyrsvPCY8WXOAJTHq`, teamId `team_WuJbStzvlAdS2GE7a0X2gfma`) until READY; fetch `/app`, extract index + Grove3D chunk, grep the marker; `curl -sI` confirms `content-security-policy` unchanged; Playwright iPhone-13 emulation of `/app` loads with zero console errors.
- [ ] After the last push: `LAUNCH_PLAN.md` entry listing the four commits and what was verified; commit `docs: LAUNCH_PLAN living map entry`.
