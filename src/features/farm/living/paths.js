/* ═══════════════════════════════════════════
   ZONE PATHS — shared URL helpers for /zones/*.png
   Split out of ZoneImage.jsx so the component file
   only exports a React component (satisfies the
   react-refresh/only-export-components rule).
   ═══════════════════════════════════════════ */

export const ZONE_PNG_BASE = "/zones";
export const BACKGROUND_PNG = ZONE_PNG_BASE + "/background.png";

export function zonePngPath(type) {
  return ZONE_PNG_BASE + "/" + (type || "veg") + ".png";
}
