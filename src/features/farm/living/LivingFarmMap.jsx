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
import { CROP_COLORS } from "../../../data/crops";
import { rCM } from "../../../lib/regional";
import { todayLocalKey } from "../../../lib/utils";
import ZoneImage from "./ZoneImage";
import { BACKGROUND_PNG } from "./paths";
import ZoneOverlay from "./ZoneOverlay";

/* Props
   ─────
   data           — full app data shape
   onEditLayout   — callback to jump to setup tab (omit to hide Edit Layout button)
   onPlantInZone  — callback for ZoneOverlay's "plant here"
   showCropPatches — if true, overlay per-crop colored rectangles inside plant zones
   onCropColorMap  — callback fired with Map<cropName, {r,g,b}> when patches change;
                     consumer can render a legend
   onZoneClick     — custom zone click handler. If provided, replaces the default
                     "open ZoneOverlay" behaviour (used by WalkOverlay to jump the
                     walker to a stop instead of opening details).
   fitMode        — "aspect" (default) preserves farm aspect ratio.
                    "fill" makes the map absolutely fill its parent container
                    (used by WalkOverlay where parent gives flex space).
   showTimeTint   — default true; pass false to suppress the dawn/dusk/night tint
   showEditButton — default true; pass false to hide the Edit Layout button
   showHelperText — default true; pass false to hide the "Click a zone…" hint
   interactive    — default true; if false zones don't hover-grow or accept clicks
                     (e.g. when WalkMap puts its own click layer on top)
   noBorder       — default false; pass true to drop the outer border+radius
                     (used when host already wraps the map in its own card)
*/
export default function LivingFarmMap({
  data,
  onEditLayout,
  onPlantInZone,
  showCropPatches = false,
  onCropColorMap,
  onZoneClick,
  fitMode = "aspect",
  showTimeTint = true,
  showEditButton = true,
  showHelperText = true,
  interactive = true,
  noBorder = false,
}) {
  /* ── Phase 8.5: hour-of-day tint ── */
  const [mapHour, setMapHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const id = setInterval(() => setMapHour(new Date().getHours()), 60000);
    return () => clearInterval(id);
  }, []);

  const mapTintOverlay = useMemo(() => {
    if (!showTimeTint) return null;
    const h = mapHour;
    if (h >= 8 && h <= 17) return null;
    if (h === 6 || h === 7) return "rgba(255,180,80,.10)";
    if (h === 18 || h === 19) return "rgba(255,140,60,.13)";
    return "rgba(15,30,60,.22)";
  }, [mapHour, showTimeTint]);

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

  /* ── Crop colour mapping (only when patches requested) ──
     Active (non-harvested) crops get an indexed colour from CROP_COLORS.
     Same crop in different zones → same colour, for legend consistency.
  */
  const cropColorMap = useMemo(() => {
    const m = new Map();
    if (!showCropPatches) return m;
    let i = 0;
    (data.garden && data.garden.plots ? data.garden.plots : []).forEach(p => {
      if (p.status !== "harvested" && !m.has(p.crop)) {
        m.set(p.crop, CROP_COLORS[i % CROP_COLORS.length]);
        i++;
      }
    });
    return m;
  }, [data.garden, showCropPatches]);

  useEffect(() => {
    if (showCropPatches && typeof onCropColorMap === "function") {
      onCropColorMap(cropColorMap);
    }
  }, [cropColorMap, showCropPatches, onCropColorMap]);

  /* Per-zone patch geometry: uses saved patch positions if present,
     otherwise auto-fills bottom-up by area share. Mirrors the previous
     dashboard logic so existing plots render the same patches. */
  const PLANT_ZONE_TYPES = new Set(["veg", "orchard", "herbs", "greenhouse"]);
  const cropMap = useMemo(() => rCM(data.region), [data.region]);

  function patchesForZone(z) {
    if (!showCropPatches) return [];
    if (!PLANT_ZONE_TYPES.has(z.type)) return [];
    const plots = (data.garden && data.garden.plots ? data.garden.plots : [])
      .filter(p => p.zone === z.id && p.status !== "harvested");
    if (plots.length === 0) return [];
    const zoneTotalM2 = (z.wM || 10) * (z.hM || 8);
    if (zoneTotalM2 <= 0) return [];

    const out = [];
    let autoFillY = 1;
    plots.forEach(p => {
      let area = 0;
      if (p.measureType === "area" && p.qty) area = +p.qty;
      else if (p.plantCount) {
        const crop = cropMap.get(p.crop);
        if (crop) { const sp = crop.spacing / 100; area = p.plantCount * sp * sp; }
      }
      if (area <= 0) return;
      const frac = Math.min(0.98, area / zoneTotalM2);
      const cc = cropColorMap.get(p.crop) || { r: 100, g: 140, b: 60 };
      let pw, ph, px, py;
      if (p.patchW !== undefined && p.patchH !== undefined) {
        pw = p.patchW; ph = p.patchH;
        px = p.patchX || 0.03; py = p.patchY || 0;
      } else {
        const side = Math.sqrt(frac);
        pw = Math.min(1, side * 1.2);
        ph = Math.min(1, frac / pw);
        px = 0.03;
        py = Math.max(0, autoFillY - ph);
        autoFillY -= ph + 0.02;
      }
      out.push({ crop: p.crop, name: p.name || p.crop, pctLabel: Math.round(frac * 100), cc, pw, ph, px, py });
    });
    out.sort((a, b) => b.pctLabel - a.pctLabel);
    return out;
  }

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

  /* Container style varies by fitMode. "fill" lets the host control size
     (e.g. WalkOverlay's flex column); "aspect" enforces farmW/farmH ratio. */
  const containerStyle = fitMode === "fill"
    ? {
        position: "absolute",
        inset: 0,
        background: bgErrored ? "var(--farm-bg-fallback, #d9e7d6)" : "transparent",
        border: noBorder ? "none" : `1px solid ${C.bdr}`,
        borderRadius: noBorder ? 0 : 16,
        overflow: "hidden",
      }
    : {
        position: "relative",
        background: bgErrored ? "var(--farm-bg-fallback, #d9e7d6)" : "transparent",
        border: noBorder ? "none" : `1px solid ${C.bdr}`,
        borderRadius: noBorder ? 0 : 16,
        overflow: "hidden",
        aspectRatio: `${fW} / ${fH}`,
        width: "100%",
      };

  /* Outer wrapper only needs to be a positioning root when in "aspect" mode.
     In "fill" mode the host already provides a positioned parent. */
  const Wrapper = fitMode === "fill" ? React.Fragment : "div";
  const wrapperProps = fitMode === "fill"
    ? {}
    : { "data-living-zone-marker": "map-root" };

  return (
    <Wrapper {...wrapperProps}>
      <div style={containerStyle} data-living-zone-marker={fitMode === "fill" ? "map-root" : undefined}>
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
          const patches = patchesForZone(z);

          /* Click behaviour:
             - if a custom onZoneClick is given, defer to it (Walk uses this to jump)
             - else if interactive, open ZoneOverlay
             - else: no-op (decorative only)
          */
          const handleClick = onZoneClick
            ? function() { onZoneClick(z); }
            : (interactive ? function() { setSelZoneId(z.id); } : undefined);

          return (
            <div
              key={z.id}
              className={isUrgent ? "urgent-zone-pulse" : ""}
              onClick={handleClick}
              style={{
                position: "absolute",
                left: `${xPct}%`, top: `${yPct}%`,
                width: `${wPct}%`, height: `${hPct}%`,
                cursor: handleClick ? "pointer" : "default",
                transition: "transform .15s ease, box-shadow .15s ease",
                borderRadius: 10,
                overflow: "hidden",
              }}
              onMouseEnter={interactive && handleClick ? function(e){ e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.18)"; } : undefined}
              onMouseLeave={interactive && handleClick ? function(e){ e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; } : undefined}
            >
              <ZoneImage type={z.type} name={z.name} rounded={10}/>

              {/* Crop colour patches (Dashboard mode only) — sit on top of the
                  zone artwork, beneath the name pill. */}
              {patches.map(function(cb, i) {
                return (
                  <div key={i} style={{
                    position: "absolute",
                    left: `${(cb.px * 100).toFixed(1)}%`,
                    top: `${(cb.py * 100).toFixed(1)}%`,
                    width: `${(cb.pw * 100).toFixed(1)}%`,
                    height: `${(cb.ph * 100).toFixed(1)}%`,
                    background: `rgba(${cb.cc.r},${cb.cc.g},${cb.cc.b},.42)`,
                    borderRadius: 4, overflow: "hidden",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    pointerEvents: "none",
                    zIndex: 2,
                  }}>
                    <div style={{ position: "absolute", inset: "10%", borderRadius: "50%",
                      background: `rgba(${cb.cc.r},${cb.cc.g},${cb.cc.b},.25)`,
                      filter: "blur(6px)", zIndex: 0 }}/>
                    <div style={{ position: "relative", zIndex: 1, textAlign: "center", lineHeight: 1.1 }}>
                      <div style={{ fontSize: 9, fontWeight: 900, color: "#fff",
                        textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>{cb.pctLabel}%</div>
                      <div style={{ fontSize: 7, fontWeight: 700, color: "rgba(255,255,255,.9)",
                        textShadow: "0 1px 2px rgba(0,0,0,.5)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        maxWidth: "100%", padding: "0 1px" }}>{cb.name}</div>
                    </div>
                  </div>
                );
              })}

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
        {showEditButton && onEditLayout && (
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
        )}

        {/* Helper text */}
        {showHelperText && (
          <div style={{
            position: "absolute", bottom: 6, left: 10,
            fontSize: 9, color: "rgba(80,95,80,.55)",
            fontFamily: F.mono, pointerEvents: "none",
            zIndex: 25,
          }}>Click a zone to open details</div>
        )}
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
    </Wrapper>
  );
}
