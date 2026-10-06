/* Renders every crop, tree, animal and area icon from the 3D map's models into src/assets/toy/.
   Needs the dev server running (npx vite --port 5179) and Playwright. Run after changing the map style:
     node scripts/render-icons.mjs [http://127.0.0.1:5179] [filter]
   MARKER: RENDER_ICONS_V1 */
import { writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";
const pw = await import(process.env.PLAYWRIGHT_PATH || "playwright");
const base = process.argv[2] || "http://127.0.0.1:5179", only = process.argv[3] || "";
const out = new URL("../src/assets/toy/", import.meta.url);
await mkdir(out, { recursive: true });
const browser = await pw.chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("page error:", e.message));
await page.goto(`${base}/tests/icons-render.html`, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__icons, null, { timeout: 60000 });
const jobs = (await page.evaluate(() => window.__icons.jobs)).filter((j) => !only || `${j.kind}-${j.slug}`.includes(only));
let n = 0, bytes = 0;
for (const job of jobs) {
  const files = await page.evaluate((j) => window.__icons.render(j), job);
  for (const f of files) {
    const png = Buffer.from(f.url.split(",")[1], "base64");
    const clear = { r: 0, g: 0, b: 0, alpha: 0 }, fitted = /^(animal|zone)-/.test(f.file); // crops keep one frame per crop so the stages show growth
    const img = fitted ? sharp(await sharp(png).trim({ threshold: 0 }).toBuffer()).extend({ top: 6, bottom: 6, left: 6, right: 6, background: clear }).resize(192, 192, { fit: "contain", position: "bottom", background: clear }) : sharp(png);
    const webp = await img.webp({ quality: 86, alphaQuality: 90 }).toBuffer();
    await writeFile(new URL(f.file, out), webp); n++; bytes += webp.length;
  }
}
await browser.close();
console.log(`${n} icons, ${(bytes / 1024).toFixed(0)} KB`);
