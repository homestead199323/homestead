# Quiet farm redesign

## Visual direction

The farm uses one overhead camera and a continuous metric coordinate system. Beds, greenhouse bays, roofs, pens, hives, paths and planting rows are native SVG geometry. Expanding a greenhouse adds structural bays; expanding a bed extends its soil and frame. Building portraits are reserved for care screens, so they do not appear pasted onto the map. Grass, soil and path textures share restrained colors and consistent shadows.

Recorded bed dimensions, row direction, row count and planting lengths drive both the overview and detailed bed plan. The overview limits repeated plants for readability. The detailed view distributes every recorded plant across its assigned rows, with pagination for long rows. Inferred legacy positions are labelled and can be corrected. Growth stages use planting dates and saved harvest dates, with an observed-stage override.

Plant and animal portraits are separate transparent WebP files; no UI crops a shared image sheet. See artwork-provenance.md for asset details. The calm visual system carries through navigation, cards, forms, the journal and morning walks.

## Working features

- Move, resize, rotate and duplicate areas; limited materials and colors; undo/redo; existing paths, fences, gates and decorative objects; beehives.
- Exact row and plant-count editing, growth-stage editing, bed zoom and crop care details.
- Companion suggestions from the existing database, checked against the selected bed's crops. A selected companion prepares the next planting form after the first crop is saved. Changing the crop or bed, or cancelling, clears that choice.
- Species portraits, animal naming and area assignment.
- Quick/full morning rounds with manual progression, guidance, checks, notes, photos, task completion, defer/pause/resume and area journals. Actual harvest and egg quantities feed inventory once.
- Offline app assets and local persistence, including compressed observation photos.

## Validation

Latest local checks: 23 tests passed; ESLint passed; production build passed; diff whitespace check passed. Tests cover companion conflicts, growth dates, row validation/rotation, animal assignment, quick/full rounds, duplicate task completion, exact row distribution, paths avoiding footprints, greenhouse resizing and standalone artwork.

Browser checks include greenhouse resize with undo/redo, crop and bed detail screens, isolated lettuce artwork, the overhead scene across area types, and the companion planting sequence (Tomato saved to Salad bed; Carrot prepared in the same bed). The production build was tested with its HTTP server stopped: the app reloaded, a check with a note and photo was saved, and both remained in the area's journal after another reload.

## Review boundaries

This is an illustrated overhead map, not a photorealistic 3D simulation. Four primary crops have dedicated multi-stage overhead and portrait artwork; other crops use species portraits where available and shared botanical forms for remaining families. Automatically routed paths are visual access paths, not surveyed routes. Morning-round ordering is not GPS navigation.

Authentication and cloud synchronization were not exercised because the local preview has no cloud credentials. Existing large manual images were not downloaded into this snapshot and are preserved in the remote base tree. The production build still reports a large main JavaScript chunk (about 300 KB gzip); code splitting remains a separate performance improvement. No production deployment is part of this review build.

## Aerial imagery and offset grids

The September 23 refinement adds detailed overhead tree/animal artwork and photographic grass/roof materials while retaining editable geometry. Planting and row editing now offer straight rows or offset grids, with saved patterns shared by the overview and close-up. See [aerial-artwork-update.md](aerial-artwork-update.md). Phone browser checks verified switching an existing planting between both patterns, then restoring the offset grid and reloading: all 15 plants and the observed stage persisted.
