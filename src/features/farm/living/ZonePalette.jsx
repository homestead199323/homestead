/* ═══════════════════════════════════════════
   ZONE PALETTE — draggable zone-type palette
   Phase 6: PNG-based Farm Map
   MARKER: ZONE_PALETTE_LIVING_V1

   Right sidebar (desktop) / top strip (mobile)
   showing all 10 zone types as draggable PNGs.
   Orientation is driven by CSS class .lf-palette
   defined in src/index.css (column on desktop,
   row on mobile).

   Drag data is the zone type id (string). Setup
   handles the actual zone creation.
   ═══════════════════════════════════════════ */

import React from "react";
import { C, F } from "../../../lib/theme";
import { ZT } from "../../../data/zones";
import ZoneImage from "./ZoneImage";

export const PALETTE_DRAG_TYPE = "application/x-myterra-zone-type";

export default function ZonePalette({ zones }) {
  /* Count how many zones of each type already placed */
  const counts = (zones || []).reduce((acc, z) => {
    acc[z.type] = (acc[z.type] || 0) + 1;
    return acc;
  }, {});

  function handleDragStart(e, typeId) {
    e.dataTransfer.setData(PALETTE_DRAG_TYPE, typeId);
    e.dataTransfer.setData("text/plain", typeId);
    e.dataTransfer.effectAllowed = "copy";
  }

  return (
    <div
      className="lf-palette"
      data-zone-palette-marker="v1"
      style={{
        gap: 8,
        padding: 10,
        background: C.card,
        border: `1px solid ${C.bdr}`,
        borderRadius: 12,
      }}
    >
      <div className="lf-palette-title" style={{
        fontSize: 10, fontWeight: 700, color: C.t2,
        textTransform: "uppercase", letterSpacing: "0.05em",
        padding: "2px 4px 6px",
        flexShrink: 0,
      }}>
        Drag to place
      </div>

      {ZT.map(t => {
        const count = counts[t.id] || 0;
        return (
          <div
            key={t.id}
            draggable
            onDragStart={e => handleDragStart(e, t.id)}
            title={`Drag to place a ${t.label}`}
            style={{
              position: "relative",
              width: 76, height: 64,
              borderRadius: 10,
              border: `1px solid ${C.bdr}`,
              cursor: "grab",
              flexShrink: 0,
              overflow: "hidden",
              background: t.fill + "22",
              transition: "transform .12s ease, box-shadow .12s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; e.currentTarget.style.boxShadow = "0 3px 10px rgba(0,0,0,.12)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <ZoneImage type={t.id} name={t.label} rounded={10}/>
            {/* Label */}
            <div style={{
              position: "absolute", bottom: 2, left: 2, right: 2,
              padding: "1px 4px", borderRadius: 5,
              background: "rgba(255,255,255,.85)",
              fontSize: 9, fontWeight: 700, color: "#1a2e1a",
              textAlign: "center",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              fontFamily: F.body,
              pointerEvents: "none",
            }}>{t.label}</div>
            {/* Count badge */}
            {count > 0 && (
              <div style={{
                position: "absolute", top: 2, right: 2,
                background: C.green, color: "#fff",
                fontSize: 9, fontWeight: 800, fontFamily: F.mono,
                padding: "1px 5px", borderRadius: 8,
                lineHeight: 1.3,
                pointerEvents: "none",
              }}>{count}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
