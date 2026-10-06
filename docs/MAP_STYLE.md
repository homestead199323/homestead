# MyTerra 3D map — the visual style, locked

**Decided 2026-10-05.** The 3D farm map is a *toy diorama*: rounded, flat-coloured, brightly and softly lit, in the app's own palette. This file is the single source of truth for how anything on the map should look. Read it before touching `src/features/grove/`. Do not re-open the style question in a session — change this file first if the style changes.

Reference that set the direction: Dilum Sanjaya's "WareTrack" warehouse dashboard (X, 3 Oct 2026) — rounded boxes, one brand colour, white/pale ground, soft shadows, floating white UI cards.

## 1. Shape
- **Every box is a rounded box.** `rbox()` from `toy.js`, bevel radius ≈ 24 % of the smallest side, capped at 32 cm. Hard-edged `BoxGeometry` only for pieces under ~6 cm (trims, mullions).
- **Every post is a capsule, every rim a torus, every crown a sphere.** No cones for trees, no flat cut-outs, no planes standing in for objects.
- **Chunky proportions.** Fatter posts and rails than life, thick roofs with rounded ridge caps (`pill()`), oversized doors, big round tree crowns, plump animals with big heads and short legs.
- **Smooth surfaces.** High segment counts (spheres 14×10+, cylinders 16+). The only faceted thing allowed is nothing.
- **Real geometry for everything that is a thing.** Crops (`crops3d.js`), animals (`animals3d.js`), props (`props3d.js`). No sprites, no billboards, no camera-facing quads.

## 2. Surface
- **Flat matte colour only.** `flat(color)` — `MeshStandardMaterial`, roughness ≈ 0.88, metalness 0. No photo textures, no procedural textures, no alpha-gradient masks (retired 2026-10-05: the blurred contact patches and the soft mulch disc looked photoreal next to the flat shapes). Objects are grounded by the sun's soft shadow; the mulch under a tree is a crisp flat disc with a lighter rim.
- Glass (greenhouse, windows, tractor cab) and water are the only glossy materials: `MeshPhysicalMaterial`, low roughness, env map.
- Vertex colours carry variety inside one mesh (crop leaves lighter toward the tip, animal coats, ground patches) — never a texture.

## 2b. Environments (the boundary and the props follow `profile.environment`)
- **Farm:** clipped hedge, post-and-rail fence, stone gate pillars and a green gate, a drive, mailbox, tree border, scarecrow, tractor by the barn.
- **Garden (backyard):** the same hedge, fence and gate — no scarecrow, no tractor.
- **Balcony:** a stone slab against the building's cream wall (green glazed door, white-framed windows) with a slim rounded railing — capsule posts, thin balusters, a chunky white handrail — on the three open sides. No hedge, fence, gate, pillars, drive, mailbox, wheelbarrow, grass or wild flowers.

## 3. Palette (`TOY` in `palette.js` — the one source for both views; `toy.js` turns it into `PAL` numbers for three.js)
- **Backdrop / fog:** sage `#b4c69d` — the land fades into it far away (fog starts well beyond the farm); the canvas background is the same colour.
- **Ground:** meadow green `#6d8f49` with softer patches `#5f7f3e` (set 2026-10-06 so the lit render ≈ `#779849`, close to the old photo map's `#5f7136`); the property inside the hedge a shade lighter `#75984f` with soft irregular lusher/drier patches painted into the vertices (no stripes); pasture / orchard / lawn close variants.
- **Paths:** warm off-white `#ebe5d8` with a `#d9d2c3` edge, round ends. Settings → Path color: *Warm sand* `#e8d8b9` / *Slate* `#bfc4be` override the material's own tone.
- **Soil:** `#886347` (raised beds, rows), lighter `#a07e5e` for in-ground beds, `#b69f82` trampled earth.
- **Buildings:** cream walls `#f2ebdd`, white trims; roofs terracotta `#cf8260` or slate `#6b7784`; barn red `#c7624f` with white boards; coop and sheds warm wood `#cfae82`.
- **Wood:** `#cfae82` / `#b68e63` / `#7c5a3d`. Stone `#d3cfc5`. Zinc `#c6cdd0`.
- **Water** `#7cc0d6`, **glass** `#daf2ef`, **hay** `#e4c66f`, **smoke** `#f2f0ec`.
- **Foliage:** four greens `#4b9150 #3f8446 #5b9f58 #357a3c`, silvery olive `#7d916a`, deep citrus `#33733d`, hedge `#427c41`.
- **The one accent is the brand green `#128147`** (with `#1fa35c` light and `#0c5e33` deep): every door, every gate, the greenhouse door, the tractor, the wheelbarrow, the watering can, the mailbox, the tap wheel, the drinker base. Nothing else is saturated green-blue. Attention stays with `#f7c552` gold (harvest frames, stage tags) and the app's orange (job badges).

## 4. Light
- Hemisphere light: white sky, pale green bounce, intensity 0.85. One warm sun (`#fff3e4`, 2.1) high in the afternoon sky so shadows are short.
- **Shadows are soft and faint**: PCF radius 4, shadow intensity 0.62. Shadows show volume; they never darken the scene.
- RoomEnvironment at 0.22 for a gentle gradient on matte surfaces. ACES, exposure 0.92. Hemisphere ground bounce `#9fb48a`.
- No vignette, no mottle, no cloud-shadow layers, no darkening of the ground anywhere.

## 5. Motion (all in the vertex shader, one shared clock)
- Tree crowns and hedges sway (tops only). Crops sway above 40 cm. Smoke rises, grows and fades. Bees hover. Animals walk, graze, swish and peck. Harvest frames breathe.

## 6. Growth and status
- Crops are modelled per family and **per stage**: sprout (sown) → seedling → growing → maturing with small green fruit → harvest window with ripe fruit in full colour. Fruit colour appears only in the harvest window; so does the gold frame round a row and the gold ring round a tree.
- Row markers: a wooden pole with a rounded tag in the stage colour.
- Selection: a gold rounded frame. Crop pick: the crop's own colour, lighter.

## 6b. Detail pass (2026-10-06) — what every object carries now
- **Trees:** five-blob crowns with a lighter sunlit top blob and two branch forks. **Hedge:** flowering bushes and wild-flower clumps along the outside.
- **House:** window boxes with flowers under the front windows, a doormat, a downpipe at the front corner (plus the existing porch canopy, lamp, chimney smoke, solar panels, clipped hedge and corner bushes).
- **Barn:** a round zinc feed silo with a slate dome behind the back corner (barns ≥ 7 m). **Shed:** woodpile and a rake against the side wall, a green water butt at the back.
- **Pond:** lily pads with pink flowers, reed clumps at the rim, a plank jetty on ponds ≥ 4 × 3 m. **Pasture:** loose hay round the feeder. **Apiary:** wild flowers. **Greenhouse:** a hose reel by the door.
- **Raised beds:** white cloche hoops with a pale cover while every row is still at seedling stage or younger. **Orchard:** at harvest, a ladder against the first ripe tree and a crate of its fruit.

## 7. UI over the map (`.g3-*` in `quiet.css`)
- Floating panels (growth preview, crop card) never run under the control column; zone labels are clamped inside the view and drop out when their area's centre leaves it.
- The same white cards as the rest of the app: `var(--color-card)`, hairline `var(--color-border)`, `var(--shadow)`-style soft shadow, brand green for selected / pressed, orange job badges. Dark mode follows the tokens. Never dark translucent pills.

## 8. Performance rules that keep the look affordable
- Everything static is merged per material (`bake()`); repeated parts are instanced (fences, pots, tufts, crops, fruit, bees, smoke).
- Crop models have three levels of detail chosen farm-wide by plant count (>350 plants, >900 plants).
- Budget at the home view: ≤ 200 draw calls, ≤ 700 k triangles on the all-zones harness (every zone type at once, the worst case). Verified 2026-10-06 after the detail pass: 171 calls / 662 k all-zones; 136 / 530 k on 36 numbered beds.

## 8b. The flat view and the layout editor (`AerialArtwork.jsx`, `GroveScene.jsx`)
- The same toy style seen straight from above, reading the same `palette.js` colours: flat fills, rounded corners, no photo textures or image sprites, no texture overlays, no sun-tint layer.
- Shadows are soft and faint and fall to the bottom-left, the way the 3D sun's do (`dx < 0, dy > 0`, opacity ≤ 0.2).
- Ground and the property apron, hedge, boundary fence with a green gate and stone pillars, paths with an edge, zone surfaces (soil, pale soil rows, gravel, water with a stone rim, orchard and pasture greens), crops as rounded blobs with fruit only in the harvest window, pots under container plants, animals in the 3D coat colours.
- Labels are the 3D map's white card pills (brand green when selected), job badges are orange with a white rim, selection is a gold frame, edit handles and the grid are brand green.
- SVG text is drawn at real pixel sizes inside a scaled group — never a sub-1 font size (Chrome mis-measures it).

## 8c. Small pictures everywhere else in the app (`src/assets/toy/`, `toy-art.js`)
- Every crop, fruit tree, animal and area picture in lists, cards, popups and the morning walk is **rendered from the 3D map's own models** — same shapes, colours and light — by `scripts/render-icons.mjs` (dev server + Playwright). Re-run it after any change to the models or palette; never hand-draw or import outside artwork.
- Crops: `crop-<family>-<stage>.webp` for stages 2–5 on a soil board sized to the plant; young stages are framed tighter so they still read at 32 px but stay visibly smaller. `crop-planned` / `crop-sown` for stages 0–1. Fruit trees: `tree-<fruit>-<stage>`. Animals: `animal-<species>` (standing, head up). Areas: `zone-<type>` on a rounded meadow tile. Bees use the beehive tile.
- 192 px transparent WebP, kept out of the JS bundle (`assetsInlineLimit` in `vite.config.js`); `tests/artwork.test.js` checks every crop and species has its icons.
- The flat produce icons in `FarmIcon.jsx` use the palette's leaf greens.

## 9. Harnesses (run with Vite, screenshot with Playwright)
`tests/g3-all.html` (every zone type), `tests/g3-zoo.html` (every animal, coop and barn), `tests/g3-beds.html` (36 narrow numbered beds), `tests/g3-crops.html` (every crop family at growing and harvest stage), `tests/g3-balcony.html` (balcony environment).
