/* ═══════════════════════════════════════════
   ZONE PALETTE — draggable + tap-to-arm zone-type palette
   Phase 6: PNG-based Farm Map
   MARKER: ZONE_PALETTE_LIVING_V1

   Right sidebar (desktop) / top strip (mobile)
   showing all 10 zone types.

   Two placement modes coexist:
   - Desktop: HTML5 drag-and-drop (draggable tiles → canvas onDrop)
   - Mobile/touch: tap a tile to "arm" it, then tap the canvas to place
     (HTML5 DnD does not fire from touch on iOS Safari)

   Drag data is the zone type id (string). Setup
   handles the actual zone creation in both paths.

   Props:
     zones      — current list, used for count badges
     armedType  — string|null, id of currently armed type (or null)
     onArm(id)  — called when a tile is tapped; toggles arm-state.
                  Passing the same id twice clears it.

   Orientation is driven by CSS class .lf-palette
   defined in src/index.css (column on desktop, row on mobile).
   ═══════════════════════════════════════════ */

import React from "react";
import { C, F } from "../../../lib/theme";
import { ZT } from "../../../data/zones";
import ZoneSurface from "./ZoneSurface";
import { zoneRadius } from "./visuals";

export const PALETTE_DRAG_TYPE = "application/x-myterra-zone-type";

export default function ZonePalette({ zones, armedType, onArm }) {
  /* Count how many zones of each type already placed */
  const counts = (zones || []).reduce((acc, z) => {
    acc[z.type] = (acc[z.type] || 0) + 1;
    return acc;
  }, {});

  function handleDragStart(e, typeId) {
    e.dataTransfer.setData(PALETTE_DRAG_TYPE, typeId);
    e.dataTransfer.setData("text/plain", typeId);
    e.dataTransfer.effectAllowed = "copy";
    /* Clear any tap-arm so the two paths don't conflict */
    if (onArm && armedType) onArm(null);
  }

  function handleTap(typeId) {
    if (!onArm) return;
    /* Tap the same tile twice → cancel. Otherwise arm this type. */
    onArm(armedType === typeId ? null : typeId);
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
        {armedType ? "Tap map to place" : "Tap or drag"}
      </div>

      {ZT.map(t => {
        const count = counts[t.id] || 0;
        const isArmed = armedType === t.id;
        const isDimmed = armedType && !isArmed;
        return (
          <button
            key={t.id}
            type="button"
            draggable
            onDragStart={e => handleDragStart(e, t.id)}
            onClick={() => handleTap(t.id)}
            title={isArmed ? `Tap map to place ${t.label} (tap again to cancel)` : `Tap to arm ${t.label}, then tap map`}
            style={{
              position: "relative",
              width: 76, height: 64,
              borderRadius: 10,
              border: isArmed ? `2.5px solid ${C.green}` : `1px solid ${C.bdr}`,
              cursor: isArmed ? "crosshair" : "grab",
              flexShrink: 0,
              overflow: "hidden",
              padding: 0,
              background: t.fill + "22",
              transition: "transform .12s ease, box-shadow .12s ease, opacity .12s ease",
              transform: isArmed ? "scale(1.08)" : "scale(1)",
              boxShadow: isArmed ? `0 0 0 3px rgba(45,106,79,.25), 0 4px 12px rgba(0,0,0,.18)` : "none",
              opacity: isDimmed ? 0.45 : 1,
              outline: "none",
              WebkitTapHighlightColor: "transparent",
            }}
            onMouseEnter={e => { if (!isArmed) { e.currentTarget.style.transform = "scale(1.04)"; e.currentTarget.style.boxShadow = "0 3px 10px rgba(0,0,0,.12)"; } }}
            onMouseLeave={e => { if (!isArmed) { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; } }}
          >
            <ZoneSurface type={t.id} rounded={zoneRadius(t.id)} style={{ opacity: 0.92 }}/>
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
            {/* Armed checkmark */}
            {isArmed && (
              <div style={{
                position: "absolute", top: 2, left: 2,
                background: C.green, color: "#fff",
                fontSize: 10, fontWeight: 900,
                width: 16, height: 16, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                lineHeight: 1,
                pointerEvents: "none",
                boxShadow: "0 1px 3px rgba(0,0,0,.3)",
              }}>✓</div>
            )}
          </button>
        );
      })}
    </div>
  );
}
