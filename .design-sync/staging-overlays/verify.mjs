// VERIFY-ONLY — renders the staged overlays cards headlessly for visual review.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = here;
const OUT = path.join(here, "evidence");
fs.mkdirSync(OUT, { recursive: true });

const MIME = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml" };
const { chromium } = await import("playwright").catch(() => import("playwright-core"));

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split("?")[0]);
  const fp = path.join(ROOT, rel);
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); res.end("not found: " + rel); return; }
    res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" });
    res.end(data);
  });
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch();

async function shot(card, w, h, name) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push("console.error: " + m.text()); });
  page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  page.on("requestfailed", (r) => { const u = r.url(); if (!u.includes("fonts.googleapis")) errs.push("requestfailed: " + u); });
  await page.goto(`http://localhost:${port}/components/overlays/${card}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1500);
  const rootLen = await page.evaluate(() => document.getElementById("root")?.innerHTML.length ?? 0);
  const dsErrors = await page.evaluate(() => (window.ArchestimatorDesignSystem_3fbb6f?.__errors || []));
  await page.screenshot({ path: path.join(OUT, name) });
  console.log(`\n[${card}] rootLen=${rootLen}`);
  console.log("  dsErrors:", JSON.stringify(dsErrors));
  console.log("  pageErrors:", JSON.stringify(errs));
  await page.close();
}

await shot("overlays.card.html", 960, 680, "overlays-verify.png");
await shot("settings.card.html", 960, 680, "settings-verify.png");

await browser.close();
server.close();
console.log("\ndone");
