/* ═══════════════════════════════════════════
   GROVE ZONE CARD — tap a field, its crops zoom up
   MARKER: GROVE_ZONE_CARD_V1

   Fullscreen dim + centered card that springs in
   (transform/opacity only — smooth on mobile).
   Plant zones: one row per crop with animated
   % completion bar + stage chip. Animal zones:
   species rows. Empty zones: plant CTA.
   z 5000 (above nav/drawer/FAB, below WalkOverlay).
   ═══════════════════════════════════════════ */

import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import { C, F } from "../../lib/theme";
import { rCM } from "../../lib/regional";
import FarmIcon from "../../components/FarmIcon";
import { localDateFromKey, todayLocalKey } from "../../lib/utils";
import { ZT_MAP } from "../../data/zones";
import { isPlantZone, zoneAnimalGroups } from "../farm/living/visuals";

const STAGE_CHIP = {
  just_planted: { label: "Planted", color: "#8a6a3e", bg: "rgba(176,141,87,.14)" },
  growing:      { label: "Growing", color: "#2e7a4b", bg: "rgba(63,143,95,.14)" },
  ready:        { label: "Ready",   color: "#9a5f14", bg: "rgba(224,138,46,.16)" },
};

export default function GroveZoneCard({ zone, data, onClose, onPlantInZone, onEditLayout }) {
  const today = todayLocalKey();
  const cropMap = useMemo(() => rCM(data.region), [data.region]);
  const zt = ZT_MAP.get(zone.type) || {};
  const plantable = isPlantZone(zone.type) || zone.type === "orchard";

  const rows = useMemo(() => {
    if (!plantable) return [];
    const todayMs = localDateFromKey(today).getTime();
    return (data.garden && data.garden.plots ? data.garden.plots : [])
      .filter(p => p.zone === zone.id && p.status !== "harvested")
      .map(p => {
        const crop = cropMap.get(p.crop);
        let growthPct = 0;
        let stage = "just_planted";
        if (p.plantDate && crop && crop.days > 0) {
          const elapsedDays = Math.max(0, (todayMs - localDateFromKey(p.plantDate).getTime()) / 864e5);
          growthPct = Math.max(0, Math.min(1, elapsedDays / crop.days));
          if (growthPct >= 0.85 || (p.harvestDate && p.harvestDate <= today)) stage = "ready";
          else if (growthPct >= 0.10) stage = "growing";
        } else if (p.harvestDate && p.harvestDate <= today) {
          growthPct = 1; stage = "ready";
        }
        if (stage === "ready") growthPct = 1;
        const daysLeft = crop && stage !== "ready"
          ? Math.max(1, Math.round(crop.days * (1 - growthPct)))
          : 0;
        return { plot: p, crop, growthPct, stage, daysLeft };
      })
      .sort((a, b) => b.growthPct - a.growthPct);
  }, [data.garden, zone.id, cropMap, today, plantable]);

  const groups = useMemo(
    () => zoneAnimalGroups(zone, data.livestock && data.livestock.animals),
    [zone, data.livestock]
  );

  const body = (
    <div data-grove-zone-card="root" style={{ position: "fixed", inset: 0, zIndex: 5000 }}>
      <div className="grove-fade" onClick={onClose} style={{
        position: "absolute", inset: 0, background: "rgba(10,16,12,.52)",
      }}/>
      <div className="grove-card-in" style={{
        position: "absolute", left: "50%", top: "50%",
        transform: "translate(-50%,-50%)",
        width: "min(430px, calc(100vw - 28px))",
        maxHeight: "min(78vh, 640px)",
        display: "flex", flexDirection: "column",
        background: C.card, border: `1px solid ${C.bdr}`, borderRadius: 22,
        boxShadow: "var(--shadow-xl)", overflow: "hidden",
        willChange: "transform, opacity",
      }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 16px 12px", borderBottom: `1px solid ${C.bdr}`, flexShrink: 0 }}>
          <span style={{ fontSize: 24 }}>{zt.icon || "📍"}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800, fontFamily: F.head, color: C.text, letterSpacing: "-0.01em" }}>{zone.name}</div>
            <div style={{ fontSize: 11.5, color: C.t3 }}>
              {zt.label || zone.type} · {zone.wM || 10}×{zone.hM || 8}m
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            width: 30, height: 30, borderRadius: 99, border: `1px solid ${C.bdr}`,
            background: C.bg, color: C.t2, fontSize: 15, fontWeight: 700,
            cursor: "pointer", minHeight: "unset", display: "flex", alignItems: "center", justifyContent: "center",
          }} data-icon="true">✕</button>
        </div>

        {/* scrollable content */}
        <div style={{ overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "6px 16px 14px", flex: 1 }}>
          {plantable && rows.length === 0 && groups.length === 0 && (
            <div className="grove-row-in" style={{ textAlign: "center", padding: "26px 8px 18px", color: C.t2 }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>🌱</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Nothing planted here yet</div>
              <div style={{ fontSize: 12, marginTop: 3 }}>This bed is ready when you are.</div>
            </div>
          )}

          {rows.map((r, i) => {
            const chip = STAGE_CHIP[r.stage];
            const pctLabel = Math.round(r.growthPct * 100) + "%";
            return (
              <div key={r.plot.id} className="grove-row-in" style={{
                animationDelay: (0.06 + Math.min(i, 8) * 0.05) + "s",
                display: "flex", alignItems: "center", gap: 12,
                padding: "11px 2px", borderBottom: `1px solid ${C.bdr}`,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                  background: r.stage === "ready" ? "rgba(224,138,46,.12)" : C.bg,
                  border: r.stage === "ready" ? "1.5px solid rgba(224,138,46,.55)" : `1px solid ${C.bdr}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span className="grove-sway" style={{ animationDelay: (i * 0.4) + "s" }}>
                    <FarmIcon name={r.plot.crop} emoji={(r.crop || {}).emoji || "🌱"} size={26}/>
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.plot.name || r.plot.crop}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: r.stage === "ready" ? "#c07a1a" : C.green, flexShrink: 0 }}>{pctLabel}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                    <div style={{ flex: 1, height: 6, borderRadius: 99, background: C.tProgress, border: `1px solid ${C.tProgressBd}`, overflow: "hidden" }}>
                      <div className="grove-bar-fill" style={{
                        height: "100%", borderRadius: 99,
                        background: r.stage === "ready" ? "linear-gradient(90deg,#e08a2e,#f0b45e)" : C.grd,
                        transform: `scaleX(${Math.max(0.03, r.growthPct)})`,
                        transformOrigin: "left center",
                        animationDelay: (0.15 + Math.min(i, 8) * 0.06) + "s",
                        willChange: "transform",
                      }}/>
                    </div>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: chip.color, background: chip.bg, borderRadius: 99, padding: "2px 7px", flexShrink: 0 }}>
                      {r.stage === "ready" ? "Ready" : chip.label + " · ~" + r.daysLeft + "d"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {groups.length > 0 && (
            <div style={{ marginTop: rows.length > 0 ? 12 : 4 }}>
              {rows.length > 0 && <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: C.t3, margin: "6px 0 2px" }}>Animals</div>}
              {groups.map((g, i) => (
                <div key={g.type} className="grove-row-in" style={{
                  animationDelay: (0.06 + (rows.length + i) * 0.05) + "s",
                  display: "flex", alignItems: "center", gap: 12, padding: "11px 2px",
                  borderBottom: `1px solid ${C.bdr}`,
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: C.bg, border: `1px solid ${C.bdr}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span className="grove-sway" style={{ animationDelay: (i * 0.5) + "s" }}>
                      <FarmIcon name={g.type} emoji="🐔" size={26}/>
                    </span>
                  </div>
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: C.text }}>{g.type}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.green }}>× {g.count}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* footer actions */}
        <div style={{ display: "flex", gap: 8, padding: "10px 16px 14px", borderTop: `1px solid ${C.bdr}`, flexShrink: 0 }}>
          {plantable && onPlantInZone && (
            <button onClick={() => { onClose(); onPlantInZone(zone.id); }} style={{
              flex: 1, background: C.grd, color: "#fff", border: "none", borderRadius: 12,
              padding: "11px 14px", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
            }}>+ Plant here</button>
          )}
          {onEditLayout && (
            <button onClick={() => { onClose(); onEditLayout(); }} style={{
              flex: plantable && onPlantInZone ? "0 0 auto" : 1,
              background: C.bg, color: C.t2, border: `1px solid ${C.bdr}`, borderRadius: 12,
              padding: "11px 14px", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
            }}>Edit layout</button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(body, document.body);
}
