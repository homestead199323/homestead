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
import { CROP_COLORS } from "../../../data/crops";
import { ZT_MAP } from "../../../data/zones";
import { LDB } from "../../../data/livestock";
import { rCM } from "../../../lib/regional";
import { buildZoneSpaceMap } from "../../../lib/farm-calc";
import FarmIcon from "../../../components/FarmIcon";
import { localDateFromKey, todayLocalKey } from "../../../lib/utils";
import CropStagePatch from "./CropStagePatch";
import RoadLayer from "./RoadLayer";
import ZoneSurface from "./ZoneSurface";
import ZoneOverlay from "./ZoneOverlay";
import { isPlantZone, mapBackgroundStyle, mapVignetteStyle, zoneRadius, zoneAnimalGroups, zoneFillColor } from "./visuals";

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

  /* ── Selected zone (opens overlay) ── */
  const [selZoneId, setSelZoneId] = useState(null);
  const [selPatch, setSelPatch] = useState(null);
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

  /* Zone fill % (plant zones) for the map pill */
  const zoneSpace = useMemo(
    () => buildZoneSpaceMap(data.zones, data.garden && data.garden.plots ? data.garden.plots : [], data.farmW || 100, data.farmH || 60, data.region),
    [data.zones, data.garden, data.farmW, data.farmH, data.region]
  );

  /* Per-zone patch geometry: uses saved patch positions if present,
     otherwise auto-fills bottom-up by area share. Mirrors the previous
     dashboard logic so existing plots render the same patches. */
  const cropMap = useMemo(() => rCM(data.region), [data.region]);

  function patchesForZone(z) {
    if (!showCropPatches) return [];
    if (!isPlantZone(z.type)) return [];
    const plots = (data.garden && data.garden.plots ? data.garden.plots : [])
      .filter(function(p) { return p.zone === z.id && p.status !== "harvested"; });
    if (plots.length === 0) return [];
    const zoneTotalM2 = (z.wM || 10) * (z.hM || 8);
    if (zoneTotalM2 <= 0) return [];
    const todayMs = localDateFromKey(today).getTime();

    // Step 1: frac + growth stage — identical to Farm Designer (Setup)
    const raw = [];
    plots.forEach(function(p) {
      let area = 0;
      const crop = cropMap.get(p.crop);
      if (p.measureType === "area" && p.qty) area = +p.qty;
      else if (p.plantCount && crop) { const sp = crop.spacing / 100; area = p.plantCount * sp * sp; }
      if (area <= 0) return;
      const frac = Math.min(1, area / zoneTotalM2);
      const cc = cropColorMap.get(p.crop) || { r: 100, g: 140, b: 60 };
      let growthPct = 0;
      let stage = "just_planted";
      if (p.plantDate && crop && crop.days > 0) {
        const plantedMs = localDateFromKey(p.plantDate).getTime();
        const elapsedDays = Math.max(0, (todayMs - plantedMs) / 864e5);
        growthPct = Math.max(0, Math.min(1, elapsedDays / crop.days));
        if (growthPct >= 0.85 || (p.harvestDate && p.harvestDate <= today)) stage = "ready";
        else if (growthPct >= 0.10) stage = "growing";
      } else if (p.harvestDate && p.harvestDate <= today) {
        growthPct = 1; stage = "ready";
      }
      raw.push({
        plotId: p.id, crop: p.crop, variety: p.variety || "",
        name: p.name || p.crop, frac,
        pctLabel: Math.round(frac * 100), cc,
        growthPct, stage,
        plantDate: p.plantDate || "", harvestDate: p.harvestDate || "",
        zoneName: z.name,
      });
    });

    // Step 2: sort desc, greedy row-pack at width budget 1.0 — identical to Farm Designer
    raw.sort(function(a, b) { return b.frac - a.frac; });
    const sumFrac = raw.reduce(function(s, r) { return s + r.frac; }, 0);
    const scale = sumFrac > 1 ? 1 / sumFrac : 1;
    const rows = [];
    let cur = []; let curW = 0;
    raw.forEach(function(r) {
      const pw = r.frac * scale;
      if (curW + pw > 1.0001 && cur.length > 0) { rows.push(cur); cur = []; curW = 0; }
      cur.push({ ...r, pw });
      curW += pw;
    });
    if (cur.length > 0) rows.push(cur);

    // Step 3: equal-height rows — identical to Farm Designer
    const rowH = rows.length > 0 ? 1 / rows.length : 1;
    const out = [];
    rows.forEach(function(row, ri) {
      let x = 0;
      row.forEach(function(p) {
        out.push({ ...p, ph: rowH, px: x, py: ri * rowH });
        x += p.pw;
      });
    });
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
        <div style={{ fontSize: 12, marginTop: 4 }}>Tap "Design Farm Layout" below to get started</div>
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
        ...mapBackgroundStyle(),
        border: noBorder ? "none" : `1px solid ${C.bdr}`,
        borderRadius: noBorder ? 0 : 16,
        overflow: "hidden",
      }
    : {
        position: "relative",
        ...mapBackgroundStyle(),
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
        <div style={mapVignetteStyle()}/>
        <RoadLayer zones={data.zones} farmW={fW} farmH={fH}/>

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
          const isUrgent = urgentZoneIds.has(z.id);
          const patches = patchesForZone(z);
          const zt = ZT_MAP.get(z.type);
          const plantZone = isPlantZone(z.type);
          const sp = plantZone ? zoneSpace[z.id] : null;
          const fillPct = sp && sp.totalM2 > 0 ? Math.round((sp.pct || 0) * 100) : null;
          const animalGroups = zoneAnimalGroups(z, data.livestock && data.livestock.animals);
          const shownGroups = animalGroups.slice(0, 3);
          const extraGroups = animalGroups.length - shownGroups.length;
          const animalTotal = animalGroups.reduce(function(s, g) { return s + g.count; }, 0);
          const pillAtBottom = patches.length > 0 || shownGroups.length > 0;

          /* Click behaviour:
             - if a custom onZoneClick is given, defer to it (Walk uses this to jump)
             - else if interactive, open ZoneOverlay
             - else: no-op (decorative only)
          */
          const handleClick = onZoneClick
            ? function() { setSelPatch(null); onZoneClick(z); }
            : (interactive ? function() { setSelPatch(null); setSelZoneId(z.id); } : undefined);

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
                borderRadius: zoneRadius(z.type),
                overflow: "hidden",
                zIndex: 5,
              }}
              onMouseEnter={interactive && handleClick ? function(e){ e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.18)"; } : undefined}
              onMouseLeave={interactive && handleClick ? function(e){ e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; } : undefined}
            >
              <ZoneSurface type={z.type} rounded={zoneRadius(z.type)}/>

              {/* Crop-stage patches — useful overview only; details stay in the sheet. */}
              {patches.map(function(cb, i) {
                return (
                  <CropStagePatch
                    key={i}
                    patch={cb}
                    compact={!showHelperText}
                    showText={!showHelperText || patches.length <= 4}
                    interactive={interactive}
                    selected={selPatch && selPatch.plotId === cb.plotId}
                    onClick={function(e) {
                      e.stopPropagation();
                      setSelZoneId(null);
                      setSelPatch(cb);
                    }}
                  />
                );
              })}

              {/* Animal tokens — species chips for barn/pasture zones */}
              {shownGroups.length > 0 && (
                <div style={{
                  position: "absolute", left: 4, top: 4,
                  display: "flex", flexWrap: "wrap", gap: 3,
                  maxWidth: "92%",
                  pointerEvents: "none", zIndex: 6,
                }}>
                  {shownGroups.map(function(gr) {
                    const db = LDB[gr.type];
                    return (
                      <span key={gr.type} style={{
                        display: "inline-flex", alignItems: "center", gap: 3,
                        padding: "2px 6px", borderRadius: 999,
                        background: "rgba(255,253,247,.9)",
                        border: "1px solid rgba(43,58,46,.12)",
                        boxShadow: "0 1px 3px rgba(38,50,30,.12)",
                        fontSize: 9, fontWeight: 800, color: "#4a3b28",
                      }}>
                        <FarmIcon name={gr.type} emoji={db ? db.e : "🐾"} size={11}/>
                        {gr.count}
                      </span>
                    );
                  })}
                  {extraGroups > 0 && (
                    <span style={{
                      display: "inline-flex", alignItems: "center",
                      padding: "2px 6px", borderRadius: 999,
                      background: "rgba(255,253,247,.8)",
                      border: "1px solid rgba(43,58,46,.12)",
                      fontSize: 9, fontWeight: 800, color: "#6b5d49",
                    }}>+{extraGroups}</span>
                  )}
                </div>
              )}

              {/* Zone pill — type icon + name + fill % / head count */}
              <div data-zone-pill="v2" style={{
                position: "absolute",
                top: pillAtBottom ? "auto" : "50%",
                bottom: pillAtBottom ? 3 : "auto",
                left: "50%",
                transform: pillAtBottom ? "translateX(-50%)" : "translate(-50%, -50%)",
                display: "flex", alignItems: "center", gap: 4,
                padding: "3px 8px", borderRadius: 999,
                background: "rgba(252,250,243,.9)", backdropFilter: "blur(4px)",
                border: "1px solid rgba(43,58,46,.14)",
                boxShadow: "0 1px 4px rgba(38,50,30,.16)",
                fontSize: 10, fontWeight: 800, color: "#2b3a2e",
                whiteSpace: "nowrap", maxWidth: "92%", overflow: "hidden",
                pointerEvents: "none",
                zIndex: 8,
              }}>
                {zt && <span style={{ fontSize: 9, lineHeight: 1 }}>{zt.icon}</span>}
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{z.name}</span>
                {fillPct != null && (
                  <span style={{ color: zoneFillColor(fillPct), fontFamily: F.mono, fontWeight: 800 }}>{fillPct}%</span>
                )}
                {!plantZone && animalTotal > 0 && (
                  <span style={{ color: "#6b5635", fontFamily: F.mono, fontWeight: 800 }}>{animalTotal}</span>
                )}
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

        {selPatch && interactive && (
          <div
            onClick={function(e) { e.stopPropagation(); }}
            style={{
              position: "absolute",
              left: 12,
              right: 12,
              bottom: 12,
              zIndex: 28,
              padding: 14,
              borderRadius: 16,
              background: "rgba(255,252,245,.95)",
              border: `1px solid ${C.bdr}`,
              boxShadow: "0 16px 34px rgba(47,55,34,.17)",
              backdropFilter: "blur(10px)",
            }}
          >
            <button
              type="button"
              onClick={function() { setSelPatch(null); }}
              aria-label="Close crop details"
              style={{
                position: "absolute",
                top: 9,
                right: 10,
                border: "none",
                background: "transparent",
                color: C.t2,
                fontSize: 18,
                fontWeight: 800,
                cursor: "pointer",
                lineHeight: 1,
              }}
            >×</button>
            <div style={{ paddingRight: 22 }}>
              <div style={{ fontSize: 17, fontWeight: 850, color: C.text }}>
                {selPatch.crop}{selPatch.variety ? ` · ${selPatch.variety}` : ""}
              </div>
              <div style={{ fontSize: 12, color: C.t2, marginTop: 3 }}>
                {selPatch.zoneName} · {selPatch.pctLabel}% of zone
              </div>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 8,
              marginTop: 12,
            }}>
              <div style={{ padding: 8, borderRadius: 11, background: C.bg }}>
                <div style={{ fontSize: 10, fontWeight: 850, color: C.t2, textTransform: "uppercase" }}>Planted</div>
                <div style={{ fontSize: 12, fontWeight: 800, marginTop: 2 }}>{selPatch.plantDate || "—"}</div>
              </div>
              <div style={{ padding: 8, borderRadius: 11, background: C.bg }}>
                <div style={{ fontSize: 10, fontWeight: 850, color: C.t2, textTransform: "uppercase" }}>Harvest</div>
                <div style={{ fontSize: 12, fontWeight: 800, marginTop: 2 }}>{selPatch.harvestDate || "—"}</div>
              </div>
              <div style={{ padding: 8, borderRadius: 11, background: C.bg }}>
                <div style={{ fontSize: 10, fontWeight: 850, color: C.t2, textTransform: "uppercase" }}>Stage</div>
                <div style={{ fontSize: 12, fontWeight: 800, marginTop: 2 }}>
                  {selPatch.stage === "ready" ? "Ready" : selPatch.stage === "growing" ? "Growing" : "Just planted"}
                </div>
              </div>
            </div>
          </div>
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
