// Replace the __BUILD_ID__ placeholder in dist/sw.js with a unique build ID.
// Runs after `vite build` (via package.json postbuild). Fails loudly if the
// placeholder is missing — that means a previous step already mangled sw.js.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const SW_PATH = "dist/sw.js";
const PLACEHOLDER = "__BUILD_ID__";

if (!existsSync(SW_PATH)) {
  console.error(`[inject-build-id] ${SW_PATH} not found — did vite build run?`);
  process.exit(1);
}

const src = readFileSync(SW_PATH, "utf8");
if (!src.includes(PLACEHOLDER)) {
  console.error(`[inject-build-id] placeholder ${PLACEHOLDER} not found in ${SW_PATH}`);
  process.exit(1);
}

const buildId = String(Date.now());
const out = src.replaceAll(PLACEHOLDER, buildId);
writeFileSync(SW_PATH, out);
console.log(`[inject-build-id] sw.js cache key = myterra-${buildId}`);
