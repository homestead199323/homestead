/* ═══════════════════════════════════════════
   LIVING FARM MAP — read-only Map view
   Phase 6: PNG-based Farm Map
   MARKER: LIVING_FARM_MAP_V1

   Replaces FarmMapHero. Shows background PNG +
   one zone PNG per data.zones entry, positioned by
   xM/yM/wM/hM as a percentage of farmW/farmH.

   Click a zone → opens ZoneOverlay.
   Edit Layout button → jumps to Setup subtab.

   Preserves the Phase 8.5 living-map behaviors:
     - time-of-day tint overlay
     - urgent-zone pulse class
     - watered-plot glisten class
   ═══════════════════════════════════════════ */

import React, { useState, useEffect, useMemo } from "react";
import { C, F } from "../../../lib/theme";
import { ZT_MAP } from "../../../data/zones";
import { todayLocalKey } from "../../../lib/utils";
import ZoneImage from "./ZoneImage";
import { BACKGROUND_PNG } from "./paths";
import ZoneOverlay from "./ZoneOverlay";

export default function LivingFarmMap({ data, onEditLayout, onPlantInZone }) {
  /* ── Phase 8.5: hour-of-day tint ── */
  const [mapHour, setMapHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const id = setInterval(() => setMapHour(new Date().getHours()), 60000);
    return () => clearInterval(id);
  }, []);

  const mapTintOverlay = useMemo(() => {
    const h = mapHour;
    if (h >= 8 && h <= 17) return null;
    if (h === 6 || h === 7) return "rgba(255,180,80,.10)";
    if (h === 18 || h === 19) return "rgba(255,140,60,.13)";
    return "rgba(15,30,60,.22)";
  }, [mapHour]);

  /* ── Background PNG with fallback to sage tint ── */
  const [bgErrored, setBgErrored] = useState(false);

  /* ── Selected zone (opens overlay) ── */
  const [selZoneId, setSelZoneId] = useState(null);
  const selZone = data.zones.find(z => z.id === selZoneId) || null;

  /* ── Urgent-zone detection (any plot ready to harvest) ── */
  const today = todayLocalKey();
  const urgentZoneIds = useMemo(() => {
    const set = new Set();
    (data.garden && data.garden.plots ? data.garden.plots : []).forEach(p => {
      if (p.harvestDate && p.harvestDate <= today && p.status !== "harvested") {
        if (p.zone) set.add(p.zone);
      }
    });
    return set;
  }, [data.garden, today]);

  /* ── Empty state ── */
  if (data.zones.length === 0) {
    return (
      <div data-living-zone-marker="empty" style={{
        padding: 40, textAlign: "center", color: C.t2,
        background: C.bg, borderRadius: 16, border: `1px dashed ${C.bdr}`,
      }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🗺️</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>No zones yet</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>Go to Layout tab to design your farm</div>
        <button onClick={onEditLayout} style={{
          marginTop: 14, padding: "8px 20px", background: C.green, color: "#fff",
          border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>Design Farm Layout</button>
      </div>
    );
  }

  const fW = data.farmW || 100;
  const fH = data.farmH || 60;

  return (
    <div data-living-zone-marker="map-root">
      <div style={{
        position: "relative",
        background: bgErrored ? "var(--farm-bg-fallback, #d9e7d6)" : "transparent",
        border: `1px solid ${C.bdr}`,
        borderRadius: 16,
        overflow: "hidden",
        aspectRatio: `${fW} / ${fH}`,
        width: "100%",
      }}>
        {/* Background PNG (falls back to sage tint) */}
        {!bgErrored && (
          <img
            src={BACKGROUND_PNG}
            alt=""
            draggable={false}
            onError={() => setBgErrored(true)}
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              objectFit: "cover", pointerEvents: "none", userSelect: "none",
            }}
          />
        )}

        {/* Faint grid overlay (only when no background image) */}
        {bgErrored && (
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "linear-gradient(to right, rgba(80,95,80,.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(80,95,80,.06) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}/>
        )}

        {/* Time-of-day tint */}
        {mapTintOverlay && (
          <div style={{
            position: "absolute", inset: 0,
            background: mapTintOverlay, zIndex: 20,
            pointerEvents: "none", transition: "background 2s ease",
          }}/>
        )}

        {/* Zones */}
        {data.zones.map(z => {
          const xPct = ((z.xM || 0) / fW * 100).toFixed(1);
          const yPct = ((z.yM || 0) / fH * 100).toFixed(1);
          const wPct = ((z.wM || 10) / fW * 100).toFixed(1);
          const hPct = ((z.hM || 8) / fH * 100).toFixed(1);
          const zt = ZT_MAP.get(z.type);
          const isUrgent = urgentZoneIds.has(z.id);

          return (
            <div
              key={z.id}
              className={isUrgent ? "urgent-zone-pulse" : ""}
              onClick={() => setSelZoneId(z.id)}
              style={{
                position: "absolute",
                left: `${xPct}%`, top: `${yPct}%`,
                width: `${wPct}%`, height: `${hPct}%`,
                cursor: "pointer",
                transition: "transform .15s ease, box-shadow .15s ease",
                borderRadius: 10,
                overflow: "hidden",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.18)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <ZoneImage type={z.type} name={z.name} rounded={10}/>
              {/* Name label — frosted pill at top */}
              <div style={{
                position: "absolute", top: 4, left: "50%", transform: "translateX(-50%)",
                padding: "2px 8px", borderRadius: 8,
                background: "rgba(255,255,255,.85)", backdropFilter: "blur(4px)",
                fontSize: 10, fontWeight: 700, color: "#1a2e1a",
                whiteSpace: "nowrap", maxWidth: "90%", overflow: "hidden", textOverflow: "ellipsis",
                pointerEvents: "none",
                boxShadow: "0 1px 3px rgba(0,0,0,.12)",
                zIndex: 3,
              }}>
                {(zt && zt.icon) ? zt.icon + " " : ""}{z.name}
              </div>
            </div>
          );
        })}

        {/* Edit Layout button */}
        <button
          onClick={onEditLayout}
          style={{
            position: "absolute", top: 8, right: 10,
            background: "rgba(255,255,255,.9)",
            border: `1px solid ${C.bdr}`,
            borderRadius: 8, padding: "5px 12px",
            fontSize: 11, fontWeight: 600, color: C.green,
            cursor: "pointer", zIndex: 25,
          }}
        >✏️ Edit Layout</button>

        {/* Helper text */}
        <div style={{
          position: "absolute", bottom: 6, left: 10,
          fontSize: 9, color: "rgba(80,95,80,.55)",
          fontFamily: F.mono, pointerEvents: "none",
          zIndex: 25,
        }}>Click a zone to open details</div>
      </div>

      {selZone && (
        <ZoneOverlay
          zone={selZone}
          data={data}
          onClose={() => setSelZoneId(null)}
          onEditLayout={onEditLayout}
          onPlantInZone={onPlantInZone}
        />
      )}
    </div>
  );
}
