# MyTerra Minimal Living Map Design Brief

Date: 2026-05-20

## Goal

Redesign the existing farm map into a **minimal living planner**: warm, polished, and visually special, but still clearly an editable planning tool.

Do **not** rebuild the farm map. Improve the existing system around `LivingFarmMap`, `ZoneOverlay`, `ZonePalette`, and the Layout editor.

The map should avoid two extremes:

- Not an Excel/grid planner with flat rectangles.
- Not a decorative illustrated farm scene with roofs, emojis, props, or visual clutter.

The target is: **simple editable zones + subtle living texture + automatic roads + crop-stage fills + clean bottom-sheet details.**

## Current App Reality

The app already has:

- Farm Map / Crops / Layout tabs.
- Meter-based zone layout data: `xM`, `yM`, `wM`, `hM`.
- Add, rename, delete, drag, and resize zones.
- Crop patch placement data on plots: `patchX`, `patchY`, `patchW`, `patchH`.
- `LivingFarmMap` read-only map.
- `ZoneOverlay` zone details.
- `ZonePalette` for zone type selection.
- LocalStorage persistence through app state.

The next work should improve the existing editable system, not replace it.

## Design Principles

### 1. Zones Are Editable Data Objects

Zones should not be static artwork. They should be rendered from data and remain easy to move, resize, select, and inspect.

Visual identity should come from:

- color
- border radius
- subtle texture
- fill pattern
- shape family
- selected state

Avoid:

- emoji markers inside zones
- decorative roof drawings
- small prop illustrations
- zone art that looks like a pasted sticker
- finished PNG tiles as the source of truth

### 2. The Map Is Overview, Not Detail

The map should show only what helps the user understand the farm at a glance:

- zone position
- zone name
- percent planted/full
- selected zone handles
- urgent/ready indicator when useful
- crop-stage coverage inside plant zones
- generated roads connecting zones

Exact details belong in the bottom sheet:

- crop names
- crop percentages
- growth stages
- actions like Plant, Edit, Rename, Delete
- animal or storage details

### 3. Minimal But Special

The design should feel premium and alive through restraint:

- warm natural palette
- soft shadows
- organic road curves or rounded connectors
- gentle stage texture
- subtle motion for living crop areas
- polished selection and edit states

Do not make the map busy to make it feel alive.

## Zone Visual System

Use CSS/SVG/procedural styles rather than relying on painted WebP zone assets.

Recommended zone styles:

| Zone type | Visual direction |
|---|---|
| Vegetable bed | Warm soil base, subtle bed grid, crop-stage overlays only when planted |
| Orchard | Organic rounded green area, soft canopy-dot texture, no individual tree icons |
| Herbs | Smaller lush green texture, rounded rectangle / pill shape |
| Greenhouse | Pale translucent green-gray fill with subtle grid lines |
| House | Warm simple solid block, softer radius, no roof drawing |
| Coop/Barn | Muted earthy utility block, different hue from house, subtle stripe or material texture |
| Storage | Neutral gray-brown block, tighter radius, subtle linear texture |
| Water | Organic rounded blue shape, very subtle shimmer |
| Compost | Muted earthy brown/olive block, low visual priority |
| Pasture | Soft grass green area, open and quiet |

House, coop, and storage must be distinguishable, but not by drawing roofs or inserting icons. They should differ by material, color temperature, radius, and texture.

## Crop Stage Rendering

Only plant zones should show crop-stage visuals.

Use existing plot data where possible:

- `status`
- `plantDate`
- `harvestDate`
- crop duration from regional crop data
- planted area / plant count calculations already used by farm-calc
- saved patch geometry: `patchX`, `patchY`, `patchW`, `patchH`

Stages:

| Stage | Map treatment |
|---|---|
| Just planted | Soil-tinted patch with tiny sparse sprout texture |
| Flourishing | Lush green patch with very subtle motion |
| Ready to harvest | Produce/warm-color cue or small urgent badge; should catch attention first |
| Empty | Unfilled zone base remains visible |

Avoid putting all crop names on the map if it gets crowded. Names and exact percentages belong in `ZoneOverlay`.

## Automatic Roads

Roads should be generated after zones are placed or moved.

Initial behavior:

- Roads are background connectors, not editable objects.
- Roads sit behind zones.
- Roads update when zones move or resize.
- Roads should connect major zone centers to a simple path network.
- Roads should be visually quiet: soft beige, rounded, low contrast.

Good first implementation:

- Compute each zone center from `xM/yM/wM/hM`.
- Choose a simple central horizontal/vertical spine or nearest-neighbor connector strategy.
- Draw roads as absolute-positioned rounded divs or SVG paths behind zones.
- Keep the algorithm simple and predictable before adding user customization.

Do not ask users to manually drag roads in the first version.

## Interaction Requirements

Claude is already working on pointer events. Preserve and build on that.

The map must support:

- mouse, touch, and pen via pointer events
- zone drag
- zone resize
- crop patch drag/resize
- selected zone state
- edit handles
- mobile-friendly hit targets
- no accidental page scrolling while dragging the map

## Component Guidance

Keep these components intact conceptually:

- `LivingFarmMap`
- `ZoneOverlay`
- `ZonePalette`
- `Setup` / Layout editor in `Farm.jsx`

Recommended internal additions:

- `ZoneSurface` or equivalent helper for rendering zone visual styles.
- `RoadLayer` for generated road rendering.
- `CropStagePatch` for stage-aware crop overlays.
- Shared `getZoneVisualStyle(type)` function or map.

Avoid a broad rewrite of farm data or navigation.

## Implementation Order

1. Finish pointer-events mobile editing.
2. Add the procedural zone visual system behind a small helper/component.
3. Replace `ZoneImage` usage with procedural zone rendering, or keep `ZoneImage` only as a fallback/deprecated path.
4. Add `RoadLayer` behind zones.
5. Add stage-aware crop patches for plant zones.
6. Polish `ZoneOverlay` into a cleaner mobile bottom sheet.
7. Verify desktop and mobile layouts visually.

## Acceptance Criteria

The redesign is successful if:

- The map feels warmer and more premium than the current flat planner.
- It does not look like a game scene or sticker collage.
- House, coop, and storage are distinguishable without icons or roof drawings.
- The user can understand planted/empty/ready areas at a glance.
- Roads appear automatically after zones are placed.
- The existing data model still drives the layout.
- Mobile editing works.
- The map remains readable on a phone.

## Claude Prompt

Use this prompt to start the implementation:

```text
Improve the existing MyTerra farm map. Do not rebuild it.

Direction: minimal living planner.

Keep:
- LivingFarmMap
- ZoneOverlay
- ZonePalette
- existing Farm tabs
- existing zone data model with xM/yM/wM/hM
- existing plot patch data with patchX/patchY/patchW/patchH

Do:
1. Finish pointer-event support for map editing if not already complete.
2. Replace painted/WebP-looking zone rendering with procedural CSS/SVG zone surfaces.
3. Make each zone type visually distinct using shape, color, subtle texture, and border radius.
4. Do not use emojis, roof drawings, prop illustrations, or sticker-like objects inside zones.
5. Add an automatic RoadLayer behind zones that connects placed zones with quiet rounded paths.
6. Add crop-stage fills inside plant zones:
   - just planted
   - flourishing
   - ready to harvest
   - empty/unfilled base
7. Keep exact crop details in ZoneOverlay/bottom sheet, not crowded on the map.

The final look should be simple, minimal, warm, premium, and editable. It should not look like an Excel grid, and it should not look like a busy game scene.
```

