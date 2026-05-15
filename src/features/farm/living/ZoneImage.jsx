/* ═══════════════════════════════════════════
   ZONE IMAGE — shared <img> with placeholder fallback
   Phase 6: PNG-based Farm Map
   MARKER: ZONE_IMAGE_LIVING_V1

   Renders /zones/{type}.png when present.
   On 404 or load error, falls back to a colored
   div with the zone-type icon. The day a real PNG
   lands in public/zones/, every tile updates on
   next page load. Zero code changes needed.
   ═══════════════════════════════════════════ */

import React, { useState } from "react";
import { ZT_MAP } from "../../../data/zones";
import { zonePngPath } from "./paths";

/* ZoneImage — fills its parent (which should be position:relative).
   Shows <img> on top; on error swaps to a tinted placeholder
   with the zone-type icon overlaid. */
export default function ZoneImage({ type, name, rounded = 8, showLabel = false }) {
  const [errored, setErrored] = useState(false);
  const zt = ZT_MAP.get(type);
  const fill = zt && zt.fill ? zt.fill : "#e5e5e5";
  const icon = zt && zt.icon ? zt.icon : "📦";
  const label = name || (zt && zt.label) || "";

  if (errored) {
    return (
      <div
        data-zone-img-placeholder="true"
        style={{
          position: "absolute", inset: 0,
          background: fill + "55",
          border: "1px dashed " + fill,
          borderRadius: rounded,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 4,
          color: "rgba(20,30,20,.55)",
          fontSize: 11, fontWeight: 600,
          textAlign: "center",
          overflow: "hidden",
        }}>
        <div style={{ fontSize: 24, lineHeight: 1 }}>{icon}</div>
        {showLabel && label && (
          <div style={{ fontSize: 10, padding: "0 6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{label}</div>
        )}
      </div>
    );
  }

  return (
    <img
      src={zonePngPath(type)}
      alt={label}
      onError={() => setErrored(true)}
      draggable={false}
      style={{
        position: "absolute", inset: 0,
        width: "100%", height: "100%",
        objectFit: "cover",
        borderRadius: rounded,
        pointerEvents: "none",
        userSelect: "none",
      }}
    />
  );
}
