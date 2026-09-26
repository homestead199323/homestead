# Aerial artwork update — 23 September 2026

Final assets are saved in `src/assets/quiet/`. All seven assets were generated with the built-in image generation tool, then exported as independent WebP files. No API/CLI fallback was used. Tree and animal transparency is preserved. The renderer supplies consistent scene shadows; no asset includes a rectangular ground tile around a subject.

The new grass and metal materials are tiled at a physical scale. Roof geometry, greenhouse structure and area dimensions remain editable. Tree crowns and four common farm animals now have dedicated detailed overhead images. Other map species retain their existing overhead artwork. This remains an interactive 2D aerial renderer with depth cues, not a free-camera 3D engine.

## Final prompt set

### aerial-canopy.webp

Use case: stylized-concept. Production asset for a realistic high-detail aerial farm map. Generate exactly ONE mature broadleaf fruit tree canopy viewed from directly overhead (nadir orthographic, no horizon). Photorealistic 3D architectural landscape visualization quality: hundreds of small richly detailed leaves, irregular lobed organic crown, dark cool green interior and sunlit olive green upper-left leaves. Soft directional morning sunlight from upper left, deep ambient occlusion between leaf clusters, realistic volumetric density. Entire tree fits centered inside square frame with 8 percent empty margin. Genuinely transparent alpha background, NO ground patch, NO grass, NO trunk sticking out below, NO baked ground shadow, no labels, no UI, no other trees, no grid. One isolated reusable tree crown asset, sharp at 1024px.

### aerial-roof.webp

Use case: photorealistic-natural. Production seamless material texture for the roofs of a realistic aerial farm simulator. Exactly square edge-to-edge orthographic top view of weathered blue charcoal grey standing-seam zinc roofing. Narrow regularly spaced vertical ridges every ~8 percent of width, subtle fine metal grain, gentle weathering, tiny fastener details. Sunlight from upper left, realistic but restrained ridge highlights and dark creases. Uniform diffuse overall exposure, no broad gradient or vignette. Tile seamlessly on all edges. No building outline, no perspective, no roof hip/ridge crossing horizontally, no gutter, no text, no objects, no sky, no border. This is a reusable flat material map, not a building illustration.

### aerial-grass.webp

Use case: photorealistic-natural. Production seamless ground texture for a high-detail realistic aerial farm simulator. Square edge-to-edge directly overhead photograph of healthy mixed short meadow grass viewed from roughly 15 metres up: fine dense green grass with subtle natural olive and yellow green variation, tiny dry blades, rich but believable late-spring green. Natural sunlight, even exposure and consistent scale. No visible repeating pattern, no checkerboard, no lawn stripes, no large blotches, no trees, bushes, flowers, objects, soil paths, text or borders. Tile seamlessly on all edges. High detail landscape visualization material, not a flat color illustration.

### aerial-cow.webp

Use case: stylized-concept. Production asset for a photorealistic architectural aerial farm visualization. Exactly ONE black and white Holstein cow, full body, viewed from directly overhead (nadir orthographic, camera straight down). Head pointing toward the TOP of the image, visible back and natural standing legs, no side elevation, no perspective horizon. Anatomically correct, fine fur or feather detail, convincing volumetric lighting and ambient occlusion. Sunlight from upper left. True transparent alpha background. No floor, no grass, no ground patch, no baked ground shadow, no border, no labels, no other animals, no grid. Animal entirely inside a square canvas with 12 percent empty margin. Realistic farm animal, NOT cartoon, NOT vector icon.

### aerial-goat.webp

Use case: stylized-concept. Production asset for a photorealistic architectural aerial farm visualization. Exactly ONE cream and brown domestic goat, full body, viewed from directly overhead (nadir orthographic, camera straight down). Head pointing toward the TOP of the image, visible back and natural standing legs, no side elevation, no perspective horizon. Anatomically correct, fine fur or feather detail, convincing volumetric lighting and ambient occlusion. Sunlight from upper left. True transparent alpha background. No floor, no grass, no ground patch, no baked ground shadow, no border, no labels, no other animals, no grid. Animal entirely inside a square canvas with 12 percent empty margin. Realistic farm animal, NOT cartoon, NOT vector icon.

### aerial-sheep.webp

Use case: stylized-concept. Production asset for a photorealistic architectural aerial farm visualization. Exactly ONE white woolly sheep, full body, viewed from directly overhead (nadir orthographic, camera straight down). Head pointing toward the TOP of the image, visible back and natural standing legs, no side elevation, no perspective horizon. Anatomically correct, fine fur or feather detail, convincing volumetric lighting and ambient occlusion. Sunlight from upper left. True transparent alpha background. No floor, no grass, no ground patch, no baked ground shadow, no border, no labels, no other animals, no grid. Animal entirely inside a square canvas with 12 percent empty margin. Realistic farm animal, NOT cartoon, NOT vector icon.

### aerial-chicken.webp

Use case: stylized-concept. Production asset for a photorealistic architectural aerial farm visualization. Exactly ONE brown laying hen, full body, viewed from directly overhead (nadir orthographic, camera straight down). Head pointing toward the TOP of the image, visible back and natural standing legs, no side elevation, no perspective horizon. Anatomically correct, fine fur or feather detail, convincing volumetric lighting and ambient occlusion. Sunlight from upper left. True transparent alpha background. No floor, no grass, no ground patch, no baked ground shadow, no border, no labels, no other animals, no grid. Animal entirely inside a square canvas with 12 percent empty margin. Realistic farm animal, NOT cartoon, NOT vector icon.

## Planting behavior

The planting form and row editor offer Straight rows and Offset grid. Offset grids shift alternate rows by half a shared plant pitch, preserve the total count, and reserve the half-step at the bed edge. They require at least two rows. Row suggestions use free contiguous rows; the user can adjust their start, length and count. Validation accounts for the database plant spacing. Existing plantings default to straight rows. The same layout model drives the overview and close-up plan, including vertical rows and long-row pagination. Companion recommendations stay available in the same planting form.

Validation: 23 tests, lint and production build passed. Browser verification saved an offset lettuce planting of 15 plants over three greenhouse rows and verified the saved pattern in the detailed bed plan. An observed growth stage now also works when a planting date is unknown.

