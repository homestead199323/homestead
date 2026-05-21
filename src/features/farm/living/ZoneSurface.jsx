import React from "react";
import { zoneRadius, zoneSurfaceStyle } from "./visuals";

export default function ZoneSurface({ type, rounded, children, style }) {
  const radius = rounded ?? zoneRadius(type);
  return (
    <div
      data-zone-surface="minimal-living"
      style={{
        ...zoneSurfaceStyle(type),
        borderRadius: radius,
        pointerEvents: "none",
        userSelect: "none",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
