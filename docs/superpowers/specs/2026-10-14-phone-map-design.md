# Phone map — preview tile, portrait camera, calm labels, pinch lock

**Date:** 2026-10-14 · **Scope:** `src/features/grove/Grove3D.jsx` (+ two new pure modules), `quiet.css`, harness pages. Desktop behaviour unchanged except where stated.

## Why

Rendered at iPhone 14 size (390×844) from `tests/g3-all.html`:

- Inline on the home screen the map is a 330×203 px strip. The farm is a thumbnail, nine name pills cover it, and one-finger drag scrolls the page (cooperative mode) which reads as "the map doesn't move".
- Full screen in portrait fits the farm by width: it fills ~40 % of the screen with empty lawn above and below. Five 58×50 px buttons stack in the bottom-right corner (~290 px tall). Pills sit on roofs.
- Pinching to zoom rotates and tilts the camera by accident: rotation engages at 6° with no gesture lock, tilt engages when the two fingers drift 16 px vertically.

Dervis's choices (2026-10-14): on phones the inline map becomes a **live preview tile** that opens the full-screen map (option A — same canvas, no snapshot); full screen is the real phone map; labels are **zoom-aware and never overlap**; pinch must **not** rotate or tilt by accident.

## Non-goals

Crop readability at the home zoom, object detail, performance tiers, landscape-phone layouts beyond what the rules below give for free, the flat designer map.

## 1. Preview tile (coarse pointer, inline)

`mobile` is the existing flag in `Grove3D` (`(pointer: coarse)` or shorter screen side < 820). **Preview mode = `mobile && !full`.** Nothing changes for fine pointers or for full screen.

In preview mode:

- **Canvas** keeps rendering (live sky, animals, weather) exactly as now; one WebGL context; idle rate unchanged (20 fps).
- **Size:** `st.size()` uses `ratio = clamp((fH+2m)/(fW+2m), .72, .8)` instead of `.62–.8`, so the tile is at least 4:3 and the farm fills it. Height cap `innerHeight × .78` stays.
- **Camera:** home fit as today (`st.reset`), zoom 1. No fog/light changes.
- **Interaction:** `FarmControls.enabled = false`; the tile is one tap target — `pointerup` without movement (< 8 px, < 400 ms) on the host calls `setFull(true)`. No pan, no pinch, no wheel handling, no cooperative hint, no `g3-hint`, no hover tooltips. `touch-action: pan-y` stays so the page scrolls over the tile.
- **Overlays hidden:** `.g3-labels`, `.g3-ctl`, `.g3-time`, `.g3-crop`, `.g3-tip`, `.g3-preview` (growth preview is reset to 0 when entering preview mode).
- **Overlays shown:** one pill bottom-right `Open map` (Maximize2 icon + text, 36 px tall, `.g3-open`), and, when `Σ tasksByZone[*].length > 0`, a job badge on its left `.g3-open-badge` ("3 jobs") that opens full screen too. Aria: the host gets `role="button"` `aria-label="Open the farm map"`.
- **Selection** (`selectedId`) still draws the highlight on the canvas; the zone card opens as before from other UI.

Exiting full screen returns to preview mode and calls `st.reset(false)` so the tile shows the whole farm again.

## 2. Full screen on phones

### 2a. Portrait camera

`FarmControls.fit(fW, fH, margin, animate, zoom)` gains one rule before the corner fit:

```
const portrait = this.size.h > this.size.w;
const turn = portrait !== (fH > fW);          // farm's long axis ≠ screen's long axis
theta = (CAM.az + (turn ? -90 : 0)) * DEG;    // −90° keeps the south-west faces in view
```

`this.home.theta` takes the same value, so Reset returns to it. Nothing else in `fit` changes; the existing six-iteration corner fit then fills the screen. The `.78` portrait zoom hack in the `[full]` effect is removed. Expected on the `g3-all` farm (46×26 m) at 390×844: farm height ≥ 70 % of the viewport (measured in the harness by projecting the four farm corners; recorded in the commit message).

Desktop: a wide farm on a wide window → `turn=false` → identical to today. A tall farm on a wide window → `turn=true` → it is turned to lie along the window. That is a deliberate behaviour change for tall farms on desktop (they fit better); verified in the harness by swapping `farmW/farmH` at 1200×760.

### 2b. Controls become a bottom bar

CSS only, `@media (pointer: coarse)` and `.g3-host.full`:

- `.g3-ctl`: `flex-direction: row; left: 50%; transform: translateX(-50%); right: auto; bottom: calc(14px + env(safe-area-inset-bottom)); gap: 8px`. Buttons 48×48 (`.g3-lbl` keep their caption, min-height 48, width 60). Order unchanged: Growth · + · − · Reset · Exit. The separate top-right `.g3-close` X stays.
- `.g3-time` (growth preview panel) moves above the bar: `bottom: calc(80px + env(safe-area-inset-bottom))`, `left: 14px; right: 14px; max-width: none`.
- `.g3-crop` card: unchanged (top-left), width `calc(100% - 28px)` on phones.
- Desktop `.full` keeps the vertical column.

## 3. Labels: zoom-aware, no overlaps, off the roofs

The render loop already rejects overlapping pills (sorted selected → area, greedy AABB). Changes:

- **Anchor at the front edge, not the roof.** For each zone, project the four footprint corners at ground height; the anchor is the midpoint of the two corners with the greatest screen `y` (the edge nearest the viewer); the pill is placed with its bottom 2 px above that edge (`translate(-50%, -100%)`). Dots/badge keep their relative places. `a.h` (roof height) is no longer used for the label; keep it on the anchor for the tooltip code. Applies on all devices.
- **Priority:** sort key becomes `(sel, hasJobs, area)` — zones with pending jobs win over bigger idle zones.
- **Zoom-aware density on coarse pointers:** the "too small to label" threshold `px >= 28` becomes `px >= (mobile ? 64 : 28)` when `far` (`ls < .8`), and `px >= 28` otherwise; zones with `sel` or jobs ignore the threshold. Zooming in grows `px` → names appear.
- **Compact far style on phones:** `.g3-host.g3-far .g3-pill` → `font-size: 9.5px; padding: 4px 7px` under `(pointer: coarse)`.
- Extract the placement decision into `src/features/grove/labels.js`: `placeLabels(items, { W, H, far, mobile }) → Array<{ id, x, y, show }>` where `items = [{ id, x, y, w, h, badge, px, sel, jobs }]`. Pure, no DOM; the loop builds `items` and applies the result. Unit tests: priority order, overlap rejection, threshold by `far/mobile`, edge clamping, jobs beating area.

## 4. Pinch intent lock

New `src/features/grove/gestures.js`:

```
export function pinchIntent(s0, s1, { dt })  // s = { d, ang, midY } at pinch start and now
  → 'zoom' | 'rotate' | 'tilt' | null         // null = undecided
```

Rules, evaluated on every `movePinch` until a non-null answer, then **locked** for the pinch (reset on `beginPinch`):

- scale = `|s1.d − s0.d| / s0.d`; rot = unwrapped `|s1.ang − s0.ang|`; drift = `|s1.midY − s0.midY|`.
- `rotate` if rot ≥ 15° and scale < 0.08.
- `tilt` if drift ≥ 24 px and scale < 0.08 and rot < 8°.
- `zoom` if scale ≥ 0.08, or if `dt ≥ 180 ms` and neither of the above fired (undecided pinches become zoom).
- otherwise `null` (keep waiting; nothing moves yet except zoom, which is always applied — zoom never waits).

`movePinch` applies: zoom always (as today); `theta` only when intent is `rotate` (offset from the lock moment so there is no jump); `phi` only when intent is `tilt`. Rotation with a locked `rotate` intent still zooms (map apps do), but a `zoom` lock never rotates or tilts. `onWheel`, mouse orbit and keyboard are untouched.

Unit tests with synthetic finger paths: pure pinch (scale .3, rot 4°) → zoom and never rotate; twist (rot 30°, scale .02) → rotate; parallel vertical drag → tilt; slow ambiguous pinch (scale .03, rot 5°, dt 200 ms) → zoom; once `zoom`, a later 40° twist is ignored.

## 5. Harness and verification

- `tests/g3-all-preview.jsx`: `?full=1` mounts with full screen open; `?coarse=1` forces `mobile=true` (Grove3D reads `window.__g3coarse` when present, dev only) so Playwright at 390×844 exercises the phone branches without device emulation.
- Screenshots recorded under `tmp/` (git-ignored): `phone-tile-{before,after}.png`, `phone-full-{before,after}.png`, plus `?hour=23` full screen.
- Checks per commit: `npx eslint src tests`, `npm test`, `npm run build` on the Mac; after deploy, live bundle markers: `"Open the farm map"` (tile), `"g3-open"` (CSS/JSX), `pinchIntent` tests pass; CSP header unchanged.
- Dervis checks on the iPhone: tile opens full screen on tap; portrait farm fills the screen; pinch zooms without turning; names stay readable and uncovered; bottom bar reachable with a thumb.

## Commits (one feature each)

1. `feat(map): phone preview tile — tap opens the full-screen map`
2. `feat(map): portrait camera turn + bottom control bar on phones`
3. `feat(map): labels at the front edge, job-first priority, zoom-aware density`
4. `feat(map): pinch intent lock — zoom never rotates or tilts by accident`
5. `docs: LAUNCH_PLAN + MAP_STYLE entries`
