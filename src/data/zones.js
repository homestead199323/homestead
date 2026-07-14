/* ═══════════════════════════════════════════
   ZONE TYPES — categories of farm zones (beds, pasture, barn, etc.)
   Extracted from App.jsx (Phase A Commit 2, 2026-05-07)
   ═══════════════════════════════════════════ */

export const ZT = [
  { id: "veg", label: "Vegetable Bed", fill: "#52b788", stroke: "#2d6a4f", icon: "🥬" },
  { id: "orchard", label: "Orchard", fill: "#a7c957", stroke: "#6a994e", icon: "🍎" },
  { id: "herbs", label: "Herb Garden", fill: "#b7e4c7", stroke: "#52b788", icon: "🌿" },
  { id: "pasture", label: "Pasture", fill: "#d8f3dc", stroke: "#74c69d", icon: "🐄" },
  { id: "greenhouse", label: "Greenhouse", fill: "#c8e6c9", stroke: "#81c784", icon: "🏡" },
  { id: "barn", label: "Barn/Coop", fill: "#d4a373", stroke: "#a0522d", icon: "🏚" },
  { id: "water", label: "Water", fill: "#90caf9", stroke: "#42a5f5", icon: "💧" },
  { id: "house", label: "House", fill: "#ffe0b2", stroke: "#ffa726", icon: "🏠" },
  { id: "compost", label: "Compost", fill: "#a1887f", stroke: "#6d4c41", icon: "♻" },
  { id: "storage", label: "Storage", fill: "#b39ddb", stroke: "#7e57c2", icon: "📦" },
  { id: "raised", label: "Raised Bed", fill: "#c9a97b", stroke: "#8a6a45", icon: "🪴" },
  { id: "container", label: "Containers", fill: "#d9a17b", stroke: "#b5623f", icon: "🪣" },
];

export const ZT_MAP = new Map(ZT.map(t => [t.id, t]));
