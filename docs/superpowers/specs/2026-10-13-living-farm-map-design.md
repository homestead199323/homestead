# Living farm map — sky, weather, animals, polish (design)

**Date:** 2026-10-13 · **Status:** approved in chat, awaiting spec review · **Owner:** Dervis
**Scope chosen:** "Scene quality & motion" slice of the 3D map. Crop readability at the home view is a separate, later slice.

Everything here obeys `docs/MAP_STYLE.md` (toy diorama: rounded, flat matte colour, real geometry, only objects cast shadows, nothing darkens the ground). Where this spec adds a rule, it is written back into MAP_STYLE.md in the same commit.

## 0. Goals and non-goals

Goals
- The map reflects the real world outside the window: time of day, today's weather, the wind.
- Animals behave like animals (wander, graze, rest, react), not like toys on a rail.
- Small living details (birds, butterflies, ripples, falling fruit) without breaking the draw-call budget.
- Works on phones at the current idle frame rate (20 fps idle, every frame during gestures).
- The user can turn the live sky off and get today's fixed afternoon look.

Non-goals (this slice)
- Bigger / more legible crop models at the home view.
- Cloud shadows, puddles, snow cover on roofs, lightning flashes, seasons changing tree colour.
- Point lights at night (cost on phones); lit windows are emissive only.
- A time scrubber in the product UI. Preview is via the harness query string.

## 1. Sky module — `src/features/grove/sky.js` (new, pure, unit-tested)

Inputs: `Date`, latitude (deg), optional weather `{ code, windKmh, windDeg, isDay }`, `liveSky` flag.
Output: a `SkyState` the renderer applies:
`{ sunDir: [x,y,z], sunColor, sunIntensity, hemiSky, hemiGround, hemiIntensity, fog, exposure, shadowIntensity, envIntensity, night: 0..1, windDir: [x,z], windStrength: 0..1, precip: 'none'|'rain'|'snow', cloud: 0..1 }`.

Sun position: standard solar geometry (declination from day of year, hour angle from local clock time via the browser's local time, latitude). Azimuth is mapped into the scene so that noon sun comes from the camera's right-front, matching today's fixed afternoon direction at ~15:00. The fixed look (`liveSky` off) = the state for 15:00 on 21 June at 50° N, clear, calm — this must reproduce the current render (verified by a harness screenshot diff before/after the refactor).

Presets by solar elevation, linearly blended between neighbours:
| elevation | name | sun colour / intensity | hemisphere | fog/backdrop | notes |
|---|---|---|---|---|---|
| ≥ 35° | high | `#fff3e4` / 2.1 | white sky, `#9fb48a` ground, 0.85 | sage `#b4c69d` | today's look |
| 12° | low | `#ffe2bd` / 1.8 | warm white, 0.8 | `#bcc9a4` | long soft shadows |
| 0° | dusk/dawn | `#ffb876` / 1.1 | `#d9c2b2` sky, 0.7 | `#b9b2a6` | windows start to glow at ≤ 3° |
| ≤ −6° | night | `#9fb3d6` / 0.5 (the "moon": azimuth of the sun mirrored through north, elevation fixed at 40°) | `#5b6a86` sky, `#3f4a40` ground, 0.6 | `#56627a` | exposure 0.8, windows + porch lamp emissive 1.0 |

Night never goes darker than the table: the diorama stays readable. Shadow intensity drops with elevation (0.62 → 0.35 at night).

Latitude: taken from the geocode the weather module already performs. `fetchForecast` / `fetchWeather` write `{ lat, lng }` into their cached result; `App.jsx` stores it as `data.cityGeo` the first time it sees one (one new optional field on the farm record, synced like any other field). Fallback 50° N.

Settings: a "Live sky" switch under Map, next to the existing Path colour control, stored as `data.mapStyle.liveSky` (default `true` when undefined).

Renderer changes (`Grove3D.jsx`): the lights are no longer constants; `applySky(state)` sets them. While `liveSky` is on, a 60 s interval recomputes the state and sets `renderer.shadowMap.needsUpdate = true` (shadows are otherwise static, as today). Switching the toggle re-applies immediately. Weather changes (new fetch) re-apply immediately.

Lit windows: window glass is currently merged into the building bake under `M.glass`. It stays merged but `M.glass` becomes a single material with a `uNight` uniform (0..1) that lerps emissive from 0 to warm `#ffd27a`. The porch lamp sphere uses the same uniform. No new draw calls.

## 2. Weather and wind

Data: `fetchWeather` already receives Open-Meteo `current_weather`; it now also returns `windKmh`, `windDeg`, `isDay` (fields exist in the response; no new request). `GroveHome` already fetches it; it passes `weather` down through `GroveScene` to `Grove3D` as a prop. No weather or no city → clear, calm, `windStrength 0.15` (the sway we have today).

Weather-code mapping (WMO codes Open-Meteo uses):
- 0–1 clear/mainly clear → `cloud 0`, full sun.
- 2 partly cloudy → `cloud 0.4`, 3 cloudy → `cloud 0.85`, 45/48 fog → `cloud 1`, hemisphere +0.25, sun ×0.45, shadows ×0.6, fog distance pulled in.
- 51–67 drizzle/rain, 80–82 showers, 95–99 thunder → `precip rain`, cloud 0.9.
- 71–77 snow, 85–86 snow showers → `precip snow`, cloud 0.9.

Clouds: when `cloud > 0.3`, 3–6 toy clouds (each 4–6 merged rounded spheres, flat white `#f6f5f1`, roughness 0.9) at y 16–20 m, drifting downwind at 0.3–0.6 m/s and wrapping around the farm extent. `castShadow = false` (rule: nothing darkens the ground). One merged mesh, one draw call; position offset is a uniform, not a per-frame transform.

Rain / snow: one `InstancedMesh` in the existing motion material (anim id 6 rain, 7 snow). Rain: 400 desktop / 200 phone capsules 0.03 × 0.22 m, falling 9 m/s with slight downwind lean; snow: 260 / 130 spheres r 0.05, falling 1.2 m/s with sinusoidal drift. Both wrap with `fract(uTime·speed + phase)` between y 14 and 0 over a box centred on the camera target (the box follows the target through a uniform). Rain increases pond ripple amplitude ×3 (see §4).

Wind uniform `uWind = vec3(dirX, dirZ, strength)` shared by foliage, crop, smoke and the new rain/snow/cloud code. `strength` = clamp(windKmh / 45, 0.15, 1). Sway amplitude = base × (0.5 + strength); gusts become a travelling wave: `phase = dot(position.xz, dir) × 0.35 − uTime × (1.2 + strength × 1.8)`, so a gust moves across the farm downwind instead of every tree wobbling in sync. Smoke drifts: x/z offset grows with height × dir × strength. The barn cupola vane is split out of the bake into its own tiny mesh (2 boxes) and rotated to `windDeg` on each weather apply.

## 3. Animal behaviour — `src/features/grove/herd-brain.js` (new, pure, unit-tested) + `animals3d.js`

Keep: one merged herd mesh, pose in the vertex shader, per-vertex instance attributes. Replace the ellipse loop with **legs**.

Per animal, two new vec4 attributes carry the leg; `g3a` keeps `(x0, z0, heading, kind)` as the rest pose and `g3b` keeps `(phase, speedMul, 0, 0)`:
- `g3l1 = (fromX, fromZ, toX, toZ)`, `g3l2 = (t0, t1, mode, modeParam)`.
- Shader: `u = smoothstep(t0, t1, uTime)`; position = `mix(from, to, u)`; heading = direction of `to − from` while walking, else the stored heading; `walking = step(t0, uTime) × step(uTime, t1)`.
- Modes: `0 stand`, `1 graze/peck` (head down, existing nibble), `2 walk`, `3 lie` (body lowered by `0.35·H`, legs scaled to 0.25 and folded, head up, slow chew), `4 swim` (y = water level, no leg swing, slow bob, heading = leg direction), `5 scatter` (walk at 2.5× speed, head up, tail up), `6 inside` (scaled to 0 — the hen is in the house).

Brain (`herdBrain.tick(now, herd, env)` — pure: returns the list of animals whose leg changed). Runs 4×/s from the animation loop (skipped when the loop is off). Each animal has `{ idx, species, arena, home, state, until }`. On `now ≥ until` pick the next action by species weights:
- Grazers: walk (40 %) to a random arena point 1–4 L away → graze 4–12 s (40 %) → stand 2–5 s (12 %) → lie 20–60 s (8 %; cows, sheep, pigs, goats only).
- Birds: walk short hops (45 %) → peck 3–8 s (45 %) → stand (10 %).
- Ducks/geese with a `water` zone adjacent to or inside their arena: 50 % of walks target the pond; on reaching it, mode `swim` for 10–30 s on the water surface, then walk off.
- Rabbits: hop-walk (50 %) → sit (50 %).
- Night (sky `night > 0.5`): chickens, ducks, geese, turkeys, quail walk to the coop pop door and switch to `inside` until dawn (`night < 0.5`). Grazers lie more (40 %).
- Scatter: `Grove3D` calls `herdBrain.scatter(zoneId, x, z)` on a coop tap; every bird in that coop gets a `scatter` leg 1.5–2.5 L directly away from the tap point for ~1.5 s, then resumes.

Buffer updates: each animal owns a contiguous vertex range; a changed leg writes its two vec4s for that range and marks `attribute.addUpdateRange(start, count)` + `needsUpdate`. Worst case 60 animals × ~600 vertices × 8 floats = cheap; typically 2–6 animals change per tick.

Arena stays the existing per-zone rectangle minus shelter/trough/feeder. Pond surface for swimming: the `water` zone rectangle inset by 0.4 m, y = rim height − 0.14 (the water plane).

Swallows and butterflies (`buildMotion`, motion shader anim 4 / 5):
- Swallows: 4–6 (phone 3) small bodies (capsule 0.18 m + two swept wing boxes, merged, `#3b4a5a` with cream belly) on a Lissajous loop over the farm centre at y 9–14 m, period 25–40 s each, wings flap ±35° at 6 Hz, body banks into turns. Hidden at night and in rain.
- Butterflies: 6–10 (phone 4) pairs of 0.06 m rounded wing boxes (palette gold / white / pale orange) over flower clumps and the apiary, fluttering in a 0.6 m sphere, wings flap at 9 Hz. Hidden at night, in rain and below 8 °C.
- Both are one instanced mesh each: +2 draw calls.

## 4. Polish

- Pond ripple: the water disc/plane material gets a vertex wave (`y += 0.012·sin(…)` two overlapping waves, TIME-driven; ×3 under rain). The two static ripple rings are removed.
- Fruit drop: for trees at stage 5, 1 extra fruit instance per tree with anim id 8: falls from the crown over 0.6 s, lands on the mulch disc, rests 6–10 s, fades, repeats from a different crown point (phase from the tree seed). +0 draw calls (same fruit instanced mesh, per-colour).
- New zone type `yard` ("Yard / parking", `src/data/zones.js`): a pale gravel slab (`#d9d2c3` rounded box 6 cm, rim `#c9c2b3`) with white rounded bay lines every 2.6 m along the long side when the zone is ≥ 5 m, no props. Drawn in the flat map (`AerialArtwork.jsx`) and the editor, icon added to `scripts/render-icons.mjs` and `tests/artwork.test.js`. No tasks, no plantings.
- Dervis's farm data: the 25-point `mapLines[1]` strip (x 46–79, y 46–50) is replaced by a `yard` zone of the same footprint via a one-off migration in `src/lib/migrations.js` keyed on that exact point list (so no other user is affected).

## 5. Budget and phones

- Home view on the all-zones harness: ≤ 200 draw calls, ≤ 700 k triangles — the new work adds at most 5 calls (clouds, rain/snow, swallows, butterflies, vane).
- Brain tick ≤ 0.3 ms (measured with `performance.now()` in the harness).
- Shadow map re-renders once per minute (live sky) and on weather change only.
- Phones (`pointer: coarse` or short side < 820 px): halve rain/snow/cloud/bird counts.
- `prefers-reduced-motion`: no rain, snow, birds, butterflies, falling fruit; animals stand; sky still follows the clock.
- Idle frame rate unchanged (20 fps phone, 30 desktop).

## 6. Verification

Unit (`scripts/test.mjs` suite): sun elevation for London 21 Jun 12:00 local ≈ 62° (±1.5°), 21 Dec ≈ 15°; night at 23:00; preset blend monotonic; code → preset table; wind mapping; brain: legs stay inside the arena, birds go inside at night and out at dawn, scatter moves away from the tap point, no animal is given two overlapping legs.

Visual: harness pages (`tests/g3-all.html`, `g3-zoo.html`) accept `?hour=HH&wx=clear|overcast|rain|snow&wind=KMH`. Playwright on the Mac screenshots hour 6 / 13 / 19 / 23 × clear / overcast / rain and the zoo at day + night. I review the sheet and send it to Dervis before the first push.

Regression: the `liveSky` off render must match today's render (pixel diff on the all-zones harness < 0.5 % after the light refactor, before any preset is introduced).

Ship: four commits — (1) sky + toggle, (2) weather + wind + clouds + precipitation, (3) animals + birds, (4) polish + yard + migration. Each: ESLint, `npm test`, Vite build, push with token redaction, Vercel READY, bundle grep for a string marker unique to that commit (`"Live sky"`, `"g3rain"`, `"herd-brain"`, `"Yard / parking"`), CSP header unchanged, Playwright mobile emulation on the live `/app`.
