/* ═══════════════════════════════════════════
   MAP PALETTE — the one set of colours for every map view: the 3D toy diorama (toy.js turns
   these into numbers) and the flat overhead / layout editor (AerialArtwork + GroveScene use the
   strings directly). Change a colour here and both views change. No three.js import, so the
   flat map stays light. Style rules: docs/MAP_STYLE.md.
   MARKER: MAP_PALETTE_V1
   ═══════════════════════════════════════════ */
export const TOY = {
  page: "#cfdcbf",
  meadow: "#8fb466", meadowB: "#7fa659", meadowDry: "#b9bf84", apron: "#99bd6f",
  lawn: "#94b86a", pasture: "#97ba6e", orchard: "#8cb063",
  path: "#ebe5d8", pathEdge: "#d9d2c3", gravel: "#dfd9ca", stonePath: "#d8d3c8", soilPath: "#cfbca2",
  soil: "#886347", soilDark: "#71513a", soilLight: "#a07e5e", mulch: "#6f4f3a", earth: "#b69f82", floor: "#8e7861",
  wood: "#cfae82", woodMid: "#b68e63", woodDark: "#7c5a3d", woodPale: "#e2cfae",
  cream: "#f2ebdd", white: "#fbfaf6", trim: "#ffffff", panel: "#ebe5d8",
  terracotta: "#cf8260", slate: "#6b7784", slateDark: "#55606c", zinc: "#c6cdd0", metal: "#9ea8ae", dark: "#3b3f44", ink: "#2a2d31",
  barn: "#c7624f", barnDark: "#ad5041",
  green: "#128147", greenLight: "#1fa35c", greenPale: "#e7f3ec", greenDeep: "#0c5e33",
  leaf: ["#5ea75e", "#509b55", "#71b56b", "#47904d"], leafOlive: "#8fa37c", leafCitrus: "#3d8547", leafDark: "#45884e", hedge: "#519150",
  water: "#7cc0d6", waterDeep: "#66afc9", ripple: "#dff2f8",
  glass: "#daf2ef", winGlass: "#9fc9dc",
  hay: "#e4c66f", hayDark: "#cfa94f", straw: "#e8d393",
  stone: "#d3cfc5", stoneDark: "#bdb8ac", rock: "#aaa89e", rockDark: "#94928a", concrete: "#dbd7cd",
  compost: ["#8a6b4f", "#70563d", "#5a4532"],
  pot: "#cf8862", potRim: "#c27753",
  hive: ["#f8f3e7", "#e4eef1", "#f7ecca", "#e7f1dd"],
  solar: "#2c3d5a", solarFrame: "#e0e4e7",
  glow: "#ffd166", tagPole: "#947757",
  smoke: "#f2f0ec", bee: "#f2c53d", beeDark: "#3a3127",
  flower: ["#f48fb1", "#f6d46a", "#ffffff", "#e8a0dd", "#ffa36e", "#9fc5ff"],
  gold: "#f7c552", orange: "#c97f17", shadow: "#3d5a3a",
};
/* growth stages: planned, sown, seedling, growing, maturing, harvest window */
export const STAGE_HEX = ["#c3cbc4", "#dcca92", "#a9dd8c", "#5fb24d", "#c1d44f", "#f7c552"];
/* Settings → Ground material / colour: [base, patch, dry] */
export const GROUND_TONES = {
  meadow: { natural: ["#8fb466", "#7fa659", "#b9bf84"], dry: ["#c9cc9c", "#bcc08f", "#d4d2a4"], deep: ["#7dab5f", "#6f9c54", "#adbd84"] },
  soil: ["#bda583", "#b09876", "#cab596"], gravel: ["#dcd6c8", "#d0c9ba", "#e3ded1"], stone: ["#d6d2c8", "#cac5ba", "#dfdbd2"],
};
/* Settings → Path material / colour: [surface, edge] */
export function pathTones(material, colour) {
  if (colour === "warm") return ["#ddcaa6", "#ccb78f"];
  if (colour === "dark") return ["#b0b6b0", "#9aa19a"];
  if (material === "stone") return [TOY.stonePath, "#d6d2c9"];
  if (material === "soil") return [TOY.soilPath, "#cdbaa0"];
  return [TOY.path, TOY.pathEdge];
}
/* fruit colour when a tree is in its harvest window */
export const FRUIT_HEX = { apple: "#e0453a", pear: "#d1cf5e", peach: "#f09a62", plum: "#6a4690", cherry: "#c8202f", apricot: "#f4a64c", lemon: "#f6d93c", orange: "#f5922e", citrus: "#f5922e", fig: "#6a4468", olive: "#4a6a3e", walnut: "#7f9a55", almond: "#9bb067", hazelnut: "#b08a5a", chestnut: "#8f6b4c", quince: "#e8d25a", persimmon: "#f07a2e", pomegranate: "#c83a3a", avocado: "#3f5f33" };
