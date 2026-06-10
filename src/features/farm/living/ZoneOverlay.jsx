/* ═══════════════════════════════════════════
   ZONE OVERLAY — click-zone details panel
   Phase 6: PNG-based Farm Map
   MARKER: ZONE_OVERLAY_LIVING_V1

   Shown when a zone is clicked on the read-only
   map (LivingFarmMap). Read-only summary +
   shortcuts to plant a crop or jump to Layout.

   Uses the shared Overlay component (which provides
   its own card, title bar, and close button) and
   renders only the body content inside.
   ═══════════════════════════════════════════ */

import React, { useMemo } from "react";
import { C, F } from "../../../lib/theme";
import { Overlay, Btn } from "../../../components/ui";
import { ZT_MAP } from "../../../data/zones";
import { LDB } from "../../../data/livestock";
import { CROP_MAP } from "../../../data/crops";
import FarmIcon from "../../../components/FarmIcon";
import { zoneAnimalGroups } from "./visuals";
import { buildZoneSpaceMap } from "../../../lib/farm-calc";

const PLANT_TYPES = ["veg", "orchard", "herbs", "greenhouse"];
const ANIMAL_TYPES = ["barn", "pasture"];

export default function ZoneOverlay({ zone, data, onClose, onEditLayout, onPlantInZone }) {
  const zt = ZT_MAP.get(zone.type);
  const wM = (zone.wM || 10).toFixed(0);
  const hM = (zone.hM || 8).toFixed(0);
  const area = ((zone.wM || 10) * (zone.hM || 8)).toFixed(0);

  const zoneSpace = useMemo(
    () => buildZoneSpaceMap(
      data.zones,
      data.garden.plots,
      data.farmW || 100,
      data.farmH || 60,
      data.region
    ),
    [data.zones, data.garden.plots, data.farmW, data.farmH, data.region]
  );
  const sp = zoneSpace[zone.id] || { totalM2: 0, usedM2: 0, freeM2: 0, pct: 0 };

  const isPlant = PLANT_TYPES.includes(zone.type);
  const isAnimal = ANIMAL_TYPES.includes(zone.type);

  const zPlots = isPlant
    ? data.garden.plots.filter(p => p.zone === zone.id && p.status !== "harvested")
    : [];

  const zAnimalGroups = isAnimal ? zoneAnimalGroups(zone, data.livestock && data.livestock.animals) : [];
  const zAnimalTotal = zAnimalGroups.reduce((s, g) => s + g.count, 0);

  const fillPct = Math.round((sp.pct || 0) * 100);
  const fillColor = fillPct >= 95 ? C.red : fillPct >= 70 ? C.orange : C.green;
  const iconStr = zt ? zt.icon : "📦";
  const labelStr = zt ? zt.label : zone.type;

  return (
    <Overlay title={iconStr + "  " + zone.name} onClose={onClose}>
      <div data-zone-overlay-marker="v1">
        <div style={{ fontSize: 12, color: C.t2, marginTop: -4, marginBottom: 12 }}>{labelStr}</div>

        {/* Size strip */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1, background: C.bg, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 17, fontWeight: 800, fontFamily: F.mono, color: C.text }}>{wM}×{hM}</div>
            <div style={{ fontSize: 10, color: C.t2, marginTop: 2 }}>metres</div>
          </div>
          <div style={{ flex: 1, background: C.bg, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 17, fontWeight: 800, fontFamily: F.mono, color: C.text }}>{area}</div>
            <div style={{ fontSize: 10, color: C.t2, marginTop: 2 }}>m²</div>
          </div>
          {isPlant && (
            <div style={{ flex: 1, background: C.bg, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 17, fontWeight: 800, fontFamily: F.mono, color: fillColor }}>{fillPct}%</div>
              <div style={{ fontSize: 10, color: C.t2, marginTop: 2 }}>full</div>
            </div>
          )}
        </div>

        {/* Fill bar (planting zones only) */}
        {isPlant && (
          <div style={{ marginBottom: 14 }}>
            <div style={{
              height: 6, background: C.bg, borderRadius: 3, overflow: "hidden",
              border: `1px solid ${C.bdr}`,
            }}>
              <div style={{
                height: "100%", width: `${Math.min(100, fillPct)}%`,
                background: fillColor, transition: "width .3s ease",
              }}/>
            </div>
            <div style={{ fontSize: 10, color: C.t2, marginTop: 4, fontFamily: F.mono }}>
              {sp.usedM2.toFixed(1)} m² used · {sp.freeM2.toFixed(1)} m² free
            </div>
          </div>
        )}

        {/* Crop list (planting zones) */}
        {isPlant && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.t2, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              Crops · {zPlots.length}
            </div>
            {zPlots.length === 0 ? (
              <div style={{ fontSize: 12, color: C.t3, fontStyle: "italic" }}>No crops planted yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {zPlots.slice(0, 6).map(p => (
                  <div key={p.id} style={{
                    fontSize: 12, color: C.text,
                    padding: "5px 8px", background: C.bg, borderRadius: 6,
                    display: "flex", justifyContent: "space-between", gap: 8,
                  }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <FarmIcon name={p.crop} emoji={(CROP_MAP.get(p.crop) || {}).emoji} size={15}/>
                      {p.name || p.crop}
                    </span>
                    <span style={{ color: C.t2, fontSize: 11 }}>
                      {p.status === "ready" ? "ready!" : p.status === "growing" ? "growing" : p.status}
                    </span>
                  </div>
                ))}
                {zPlots.length > 6 && (
                  <div style={{ fontSize: 11, color: C.t3, paddingLeft: 8 }}>+{zPlots.length - 6} more</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Animal list (barn/pasture) */}
        {isAnimal && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.t2, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              Animals · {zAnimalTotal}
            </div>
            {zAnimalGroups.length === 0 ? (
              <div style={{ fontSize: 12, color: C.t3, fontStyle: "italic" }}>
                No animals housed here yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {zAnimalGroups.slice(0, 6).map(g => {
                  const k = LDB[g.type];
                  return (
                    <div key={g.type} style={{
                      fontSize: 12, color: C.text,
                      padding: "5px 8px", background: C.bg, borderRadius: 6,
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      <FarmIcon name={g.type} emoji={k ? k.e : "🐾"} size={15}/>
                      <span style={{ flex: 1 }}>{g.type}</span>
                      <span style={{ color: C.t2, fontSize: 11 }}>×{g.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          {isPlant && onPlantInZone && (
            <Btn v="primary" onClick={() => { onPlantInZone(zone.id); onClose(); }} style={{ flex: 1 }}>
              + Plant in {zone.name}
            </Btn>
          )}
          <Btn v="secondary" onClick={() => { onClose(); onEditLayout && onEditLayout(); }} style={{ flex: isPlant ? "0 0 auto" : 1 }}>
            ✏️ Edit in Layout
          </Btn>
        </div>
      </div>
    </Overlay>
  );
}
