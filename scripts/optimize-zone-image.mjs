#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   optimize-zone-image.mjs

   Converts a source PNG/JPEG into the WebP format used by the Living Farm
   Map (public/zones/*.webp). Run this on every zone tile you generate.

   Recipes:
     - background.webp        → 1200×900, quality 80, target ~150 KB
     - {type}.webp (zones)    → 800×600,  quality 80, target ~50–90 KB

   Usage:
     node scripts/optimize-zone-image.mjs <input-file> [background|zone]

   Examples:
     node scripts/optimize-zone-image.mjs ~/Downloads/bg.png background
     node scripts/optimize-zone-image.mjs ~/Downloads/veg.png          # zone

   The output filename is derived from the input basename, lowercased, with
   .webp extension, written to public/zones/.

   Dependencies:
     - sharp (npm devDependency, includes a native WebP encoder)
       If missing, run:  npm install sharp --save-dev
   ═══════════════════════════════════════════════════════════════════════ */

import { fileURLToPath } from "node:url";
import { dirname, basename, extname, join } from "node:path";
import { existsSync, mkdirSync, statSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = dirname(__dirname);
const outDir = join(repoRoot, "public", "zones");

const [, , srcArg, kindArg = "zone"] = process.argv;

if (!srcArg) {
  console.error("Usage: node scripts/optimize-zone-image.mjs <input-file> [background|zone]");
  process.exit(1);
}

if (!existsSync(srcArg)) {
  console.error(`Error: input file not found: ${srcArg}`);
  process.exit(1);
}

const RECIPES = {
  background: { maxW: 1200, maxH: 900, quality: 80, outName: "background.webp" },
  zone:       { maxW: 800,  maxH: 600, quality: 80, outName: null /* derived */ },
};

const recipe = RECIPES[kindArg];
if (!recipe) {
  console.error(`Error: kind must be 'background' or 'zone', got: ${kindArg}`);
  process.exit(1);
}

const outName = recipe.outName ?? basename(srcArg, extname(srcArg)).toLowerCase() + ".webp";
const outPath = join(outDir, outName);

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error(`
Error: 'sharp' is not installed. Run once:

    npm install sharp --save-dev

Then re-run this script.
`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const srcSize = statSync(srcArg).size;
const info = await sharp(srcArg)
  .resize(recipe.maxW, recipe.maxH, { fit: "inside", withoutEnlargement: true })
  .webp({ quality: recipe.quality, effort: 6 })
  .toFile(outPath);

const outSize = statSync(outPath).size;
const pct = (outSize * 100 / srcSize).toFixed(1);

console.log(`
  ✓ ${outPath}
    ${srcSize.toLocaleString()} → ${outSize.toLocaleString()} bytes  (${pct}% of original)
    dims: ${info.width}×${info.height} · quality: ${recipe.quality} · effort: 6
`);
