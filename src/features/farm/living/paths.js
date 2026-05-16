/* ═══════════════════════════════════════════
   ZONE PATHS — shared URL helpers for /zones/*.webp
   Split out of ZoneImage.jsx so the component file
   only exports a React component (satisfies the
   react-refresh/only-export-components rule).

   Format: WebP (visually identical to JPEG/PNG at
   higher quality settings, ~25% smaller than JPEG,
   ~85% smaller than lossless PNG). Universal browser
   support since 2020 (Safari 14+, all Chromium,
   Firefox 65+).

   Helper script for converting source PNGs from
   ChatGPT or any other tool into the right WebP:
       scripts/optimize-zone-image.sh
   ═══════════════════════════════════════════ */

export const ZONE_PNG_BASE = "/zones";
export const BACKGROUND_PNG = ZONE_PNG_BASE + "/background.webp";

export function zonePngPath(type) {
  return ZONE_PNG_BASE + "/" + (type || "veg") + ".webp";
}
