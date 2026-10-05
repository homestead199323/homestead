/* ═══════════════════════════════════════════
   MAP PALETTE — the one set of colours for every map view: the 3D toy diorama (toy.js turns
   these into numbers) and the flat overhead / layout editor (AerialArtwork + GroveScene use the
   strings directly). Change a colour here and both views change. No three.js import, so the
   flat map stays light. Style rules: docs/MAP_STYLE.md.
   MARKER: MAP_PALETTE_V1
   ═══════════════════════════════════════════ */
export const TOY = {
  page: "#eef3ec",
  meadow: "#c4dfab", meadowB: "#b3d297", meadowDry: "#d6dfb0", apron: "#cbe2b1",
  lawn: "#bddba1", pasture: "#c0dda4", orchard: "#b8d69c",
  path: "#f2eee6", pathEdge: "#e5e0d5", gravel: "#e9e4d8", stonePath: "#e2ded5", soilPath: "#dccbb3",
  soil: "#9e7a5e", soilDark: "#8a684e", soilLight: "#b39277", mulch: "#8a6850", earth: "#c8b291", floor: "#9f8a73",
  wood: "#ddbf95", woodMid: "#c7a277", woodDark: "#8f6b4c", woodPale: "#eadbc0",
  cream: "#f8f3e9", white: "#fdfcf9", trim: "#ffffff", panel: "#f1ede4",
  terracotta: "#de9072", slate: "#7c8896", slateDark: "#66727f", zinc: "#d1d7d9", metal: "#aab3b9", dark: "#3b3f44", ink: "#2a2d31",
  barn: "#d5725f", barnDark: "#bd5f4e",
  green: "#128147", greenLight: "#1fa35c", greenPale: "#e7f3ec", greenDeep: "#0c5e33",
  leaf: ["#7fc57d", "#6fb873", "#93d089", "#64ac6c"], leafOlive: "#abbd96", leafCitrus: "#4f9f61", leafDark: "#5a9e64", hedge: "#72b677",
  water: "#8fd1e3", waterDeep: "#78c0d7", ripple: "#e6f6fb",
  glass: "#daf2ef", winGlass: "#9fc9dc",
  hay: "#eed27f", hayDark: "#dcb75e", straw: "#f0dca0",
  stone: "#dfdcd3", stoneDark: "#cbc7bc", rock: "#b9b7ae", rockDark: "#a3a198", concrete: "#e5e2da",
  compost: ["#9c7c5e", "#816449", "#6b523d"],
  pot: "#db9470", potRim: "#d08360",
  hive: ["#f8f3e7", "#e4eef1", "#f7ecca", "#e7f1dd"],
  solar: "#2c3d5a", solarFrame: "#e0e4e7",
  glow: "#ffd166", tagPole: "#a48666",
  smoke: "#f2f0ec", bee: "#f2c53d", beeDark: "#3a3127",
  flower: ["#f48fb1", "#f6d46a", "#ffffff", "#e8a0dd", "#ffa36e", "#9fc5ff"],
  gold: "#f7c552", orange: "#c97f17", shadow: "#3d5a3a",
};
/* growth stages: planned, sown, seedling, growing, maturing, harvest window */
export const STAGE_HEX = ["#c3cbc4", "#dcca92", "#a9dd8c", "#5fb24d", "#c1d44f", "#f7c552"];
/* Settings → Ground material / colour: [base, patch, dry] */
export const GROUND_TONES = {
  meadow: { natural: ["#c4dfab", "#b3d297", "#d6dfb0"], dry: ["#e0e3c1", "#d4d9b4", "#e8e5c6"], deep: ["#c2dcb0", "#b4d1a0", "#d3dfb6"] },
  soil: ["#cdb79b", "#c2ab8e", "#d9c7aa"], gravel: ["#e6e1d5", "#dcd6c8", "#ece7dc"], stone: ["#e1ddd4", "#d6d1c7", "#e8e4dc"],
};
/* Settings → Path material / colour: [surface, edge] */
export function pathTones(material, colour) {
  if (colour === "warm") return ["#e8d8b9", "#d9c6a2"];
  if (colour === "dark") return ["#bfc4be", "#aab0aa"];
  if (material === "stone") return [TOY.stonePath, "#d6d2c9"];
  if (material === "soil") return [TOY.soilPath, "#cdbaa0"];
  return [TOY.path, TOY.pathEdge];
}
/* fruit colour when a tree is in its harvest window */
export const FRUIT_HEX = { apple: "#e0453a", pear: "#d1cf5e", peach: "#f09a62", plum: "#6a4690", cherry: "#c8202f", apricot: "#f4a64c", lemon: "#f6d93c", orange: "#f5922e", citrus: "#f5922e", fig: "#6a4468", olive: "#4a6a3e", walnut: "#7f9a55", almond: "#9bb067", hazelnut: "#b08a5a", chestnut: "#8f6b4c", quince: "#e8d25a", persimmon: "#f07a2e", pomegranate: "#c83a3a", avocado: "#3f5f33" };
