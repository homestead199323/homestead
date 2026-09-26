# Quiet artwork provenance

Final project assets: `src/assets/quiet/` (94 independent WebP files). Generation used the built-in image generation tool; no API/CLI fallback was used. Transparent alpha was preserved during WebP export. Native map structures and overhead animal/crop geometry live in `src/features/grove/AerialArtwork.jsx` and are designed directly in SVG.

The earlier generation set contains primary crop stages (Tomato, Carrot, Lettuce, Basil), overhead versions of those stages, secondary crops, animals, building portraits, textures and props. Its design brief was naturalistic botanical/animal artwork with restrained morning light and earth colors, isolated subjects for portraits, and coherent materials for ground textures. The original complete prompt text for that earlier set is not retained here. Those sheets were separated by subject boundaries into independent files; the app never uses sheet offsets.

The final three additions were generated individually with the following exact prompt template, substituting Horse, Donkey and Guinea fowl for `${species}`:

> Use case: game-asset. Asset type: one standalone species portrait for the MyTerra farm care app. Subject: exactly ONE ${species}, anatomically accurate adult, full body including every foot, ears, tail, beak as applicable. Natural relaxed standing pose, facing right in a gentle three-quarter side view. Style: realistic detailed natural history illustration with photographic fur or feather detail, soft morning light from upper left, restrained warm earth colors. Composition: centered, entirely within a square frame, 12 percent empty margin around every extremity. Background: genuinely transparent alpha, no floor, no ground disc, no scenery, no rectangular background. No labels, no other animals, no grid, no sprite sheet, no neighboring subjects, no decorative objects. This is a single isolated care-screen animal portrait, not a map or a mockup.

Final files: `horse.webp`, `donkey.webp`, `guinea-fowl.webp` in the asset directory above. Each is exported at a maximum dimension of 480 pixels. Automated checks verify separate transparent portraits for all supported animal species and all primary crop stages, including overhead views.

The aerial refinement adds seven independently generated overhead/material assets. Exact prompts, rendering details and validation are recorded in [aerial-artwork-update.md](aerial-artwork-update.md).
