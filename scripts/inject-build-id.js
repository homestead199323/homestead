// Fill the build placeholders in dist/sw.js: a unique build id plus the two
// precache lists (entry chunks that must be cached for the app to open
// offline, and the best-effort rest). Runs after `vite build` (package.json
// postbuild). Fails loudly if a placeholder is missing — that means a
// previous step already mangled sw.js.
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";

const SW_PATH = "dist/sw.js";
const PLACEHOLDER = "__BUILD_ID__";
const CRITICAL_MARK = "/* __PRECACHE_CRITICAL__ */";
const OPTIONAL_MARK = "/* __PRECACHE_ASSETS__ */";
const SHELL_MARK = "/* __PRECACHE_SHELL__ */";

if (!existsSync(SW_PATH)) {
  console.error(`[inject-build-id] ${SW_PATH} not found — did vite build run?`);
  process.exit(1);
}

const src = readFileSync(SW_PATH, "utf8");
for (const needle of [PLACEHOLDER, CRITICAL_MARK, OPTIONAL_MARK, SHELL_MARK]) {
  if (!src.includes(needle)) {
    console.error(`[inject-build-id] placeholder ${needle} not found in ${SW_PATH}`);
    process.exit(1);
  }
}

const buildId = String(Date.now());
const assetFiles = readdirSync("dist/assets");
// Entry JS/CSS and the lazily loaded map chunk: without them the app shell is
// an empty page, so they are required at install time.
const critical = assetFiles
  .filter((name) => /^(index|Grove3D)-[\w-]+\.(js|css)$/.test(name))
  .map((name) => "/assets/" + name);
const optional = assetFiles.filter((name) => !critical.includes("/assets/" + name)).map((name) => "/assets/" + name);
const optionalShell = existsSync("dist/manuals")
  ? readdirSync("dist/manuals").filter((name) => name.endsWith(".webp")).map((name) => "/manuals/" + name)
  : [];
if (critical.length < 2) {
  console.error(`[inject-build-id] expected the entry js+css in dist/assets, found: ${critical.join(", ") || "none"}`);
  process.exit(1);
}

const list = (paths) => paths.map((p) => JSON.stringify(p)).join(",") + ",";
const out = src
  .replaceAll(PLACEHOLDER, buildId)
  .replace(CRITICAL_MARK, list(critical))
  .replace(OPTIONAL_MARK, list(optional))
  .replace(SHELL_MARK, list(optionalShell));
writeFileSync(SW_PATH, out);
console.log(`[inject-build-id] sw.js cache key = myterra-shell-${buildId}; ${critical.length} required + ${optional.length} optional assets + ${optionalShell.length} manual pages`);
