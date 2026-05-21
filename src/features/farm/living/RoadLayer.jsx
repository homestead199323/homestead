import React, { useMemo } from "react";

function median(values) {
  if (values.length === 0) return 50;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function zoneCenterPercent(zone, farmW, farmH) {
  const x = ((zone.xM || 0) + (zone.wM || 10) / 2) / farmW * 100;
  const y = ((zone.yM || 0) + (zone.hM || 8) / 2) / farmH * 100;
  return { x, y };
}

function roadStyle(base) {
  return {
    position: "absolute",
    zIndex: 2,
    background: "rgba(222,209,173,.92)",
    borderRadius: 999,
    boxShadow: "inset 0 1px rgba(255,255,255,.35), 0 1px 1px rgba(93,76,42,.11)",
    pointerEvents: "none",
    ...base,
  };
}

export default function RoadLayer({ zones, farmW, farmH }) {
  const roads = useMemo(() => {
    const placed = (zones || []).filter(z => z && z.xM != null && z.yM != null);
    if (placed.length < 2) return [];

    const centers = placed.map(z => ({ id: z.id, ...zoneCenterPercent(z, farmW, farmH) }));
    const spineX = median(centers.map(c => c.x));
    const spineY = median(centers.map(c => c.y));
    const minX = Math.max(3, Math.min(...centers.map(c => c.x)) - 4);
    const maxX = Math.min(97, Math.max(...centers.map(c => c.x)) + 4);
    const minY = Math.max(3, Math.min(...centers.map(c => c.y)) - 4);
    const maxY = Math.min(97, Math.max(...centers.map(c => c.y)) + 4);
    const out = [
      { key: "spine-h", type: "h", x: minX, y: spineY, w: maxX - minX },
      { key: "spine-v", type: "v", x: spineX, y: minY, h: maxY - minY },
    ];

    centers.forEach(c => {
      if (Math.abs(c.y - spineY) > 5) {
        out.push({
          key: "branch-v-" + c.id,
          type: "v",
          x: c.x,
          y: Math.min(c.y, spineY),
          h: Math.abs(c.y - spineY),
        });
      }
      if (Math.abs(c.x - spineX) > 5) {
        out.push({
          key: "branch-h-" + c.id,
          type: "h",
          x: Math.min(c.x, spineX),
          y: c.y,
          w: Math.abs(c.x - spineX),
        });
      }
    });

    return out;
  }, [zones, farmW, farmH]);

  if (roads.length === 0) return null;

  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }}>
      {roads.map(r => {
        if (r.type === "h") {
          return <div key={r.key} style={roadStyle({ left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: 14, transform: "translateY(-50%)" })}/>;
        }
        return <div key={r.key} style={roadStyle({ left: `${r.x}%`, top: `${r.y}%`, height: `${r.h}%`, width: 14, transform: "translateX(-50%)" })}/>;
      })}
    </div>
  );
}
