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

## 3. Palette (`PAL` in `toy.js`)
- **Page / fog:** `#eef3ec` — the scene fades into the page; the canvas background is the same colour.
- **Ground:** pale sage meadow `#c4dfab` with softer patches `#b3d297`; the property inside the hedge a shade lighter; pasture / orchard / lawn close variants. Light enough that objects pop, green enough to read as grass.
- **Paths:** warm off-white `#f2eee6` with a `#e5e0d5` edge, round ends. Settings → Path color: *Warm sand* `#e8d8b9` / *Slate* `#bfc4be` override the material's own tone.
- **Soil:** `#9e7a5e` (raised beds, rows), lighter `#b39277` for in-ground beds, `#c8b291` trampled earth.
- **Buildings:** cream walls `#f8f3e9`, white trims; roofs soft terracotta `#de9072` or slate `#7c8896`; barn muted red `#d5725f` with white boards; coop and sheds warm wood `#ddbf95`.
- **Wood:** `#ddbf95` / `#c7a277` / `#8f6b4c`. Stone `#dfdcd3`. Zinc `#d1d7d9`.
- **Water** `#8fd1e3`, **glass** `#daf2ef`, **hay** `#eed27f`, **smoke** `#f2f0ec`.
- **Foliage:** four greens `#7fc57d #6fb873 #93d089 #64ac6c`, silvery olive `#abbd96`, deep citrus `#4f9f61`, hedge `#72b677`.
- **The one accent is the brand green `#128147`** (with `#1fa35c` light and `#0c5e33` deep): every door, every gate, the greenhouse door, the tractor, the wheelbarrow, the watering can, the mailbox, the tap wheel, the drinker base. Nothing else is saturated green-blue. Attention stays with `#f7c552` gold (harvest frames, stage tags) and the app's orange (job badges).

## 4. Light
- Hemisphere light: white sky, pale green bounce, intensity 0.85. One warm sun (`#fff3e4`, 2.1) high in the afternoon sky so shadows are short.
- **Shadows are soft and faint**: PCF radius 4, shadow intensity 0.62. Shadows show volume; they never darken the scene.
- RoomEnvironment at 0.22 for a gentle gradient on matte surfaces. ACES, exposure 1.0.
- No vignette, no mottle, no cloud-shadow layers, no darkening of the ground anywhere.

## 5. Motion (all in the vertex shader, one shared clock)
- Tree crowns and hedges sway (tops only). Crops sway above 40 cm. Smoke rises, grows and fades. Bees hover. Animals walk, graze, swish and peck. Harvest frames breathe.

## 6. Growth and status
- Crops are modelled per family and **per stage**: sprout (sown) → seedling → growing → maturing with small green fruit → harvest window with ripe fruit in full colour. Fruit colour appears only in the harvest window; so does the gold frame round a row and the gold ring round a tree.
- Row markers: a wooden pole with a rounded tag in the stage colour.
- Selection: a gold rounded frame. Crop pick: the crop's own colour, lighter.

## 7. UI over the map (`.g3-*` in `quiet.css`)
- Floating panels (growth preview, crop card) never run under the control column; zone labels are clamped inside the view and drop out when their area's centre leaves it.
- The same white cards as the rest of the app: `var(--color-card)`, hairline `var(--color-border)`, `var(--shadow)`-style soft shadow, brand green for selected / pressed, orange job badges. Dark mode follows the tokens. Never dark translucent pills.

## 8. Performance rules that keep the look affordable
- Everything static is merged per material (`bake()`); repeated parts are instanced (fences, pots, tufts, crops, fruit, bees, smoke).
- Crop models have three levels of detail chosen farm-wide by plant count (>350 plants, >900 plants).
- Budget at the home view: ≤ 200 draw calls, ≤ 650 k triangles (verified 2026-10-05 after the standardisation pass: 157 calls / 570 k on the all-zones harness; 118 / 450 k on 36 numbered beds; 32 / 70 k on the balcony).

## 9. Harnesses (run with Vite, screenshot with Playwright)
`tests/g3-all.html` (every zone type), `tests/g3-zoo.html` (every animal, coop and barn), `tests/g3-beds.html` (36 narrow numbered beds), `tests/g3-crops.html` (every crop family at growing and harvest stage), `tests/g3-balcony.html` (balcony environment).
