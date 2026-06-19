// VERIFY-ONLY — renders the staged dashboard kit headlessly for visual review.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "staging");
const OUT = path.join(here, "evidence");
fs.mkdirSync(OUT, { recursive: true });

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".jsx": "text/babel",
  ".css": "text/css",
  ".svg": "image/svg+xml",
};

const { chromium } = await import("playwright").catch(() => import("playwright-core"));

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split("?")[0]);
  const fp = path.join(ROOT, rel);
  fs.readFile(fp, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("not found: " + rel);
      return;
    }
    res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" });
    res.end(data);
  });
});

await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const errs = [];
page.on("console", (m) => {
  if (m.type() === "error") errs.push("console.error: " + m.text());
});
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("requestfailed", (r) => errs.push("requestfailed: " + r.url() + " " + (r.failure()?.errorText ?? "")));

await page.goto(`http://localhost:${port}/ui_kits/dashboard/index.html`, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(2200); // babel transpile + mount + webfont swap

const rootHtmlLen = await page.evaluate(() => document.getElementById("root")?.innerHTML.length ?? 0);
await page.screenshot({ path: path.join(OUT, "dashboard-verify.png") });
// Detail crops for the two biggest reworks.
await page.screenshot({ path: path.join(OUT, "crop-header.png"), clip: { x: 64, y: 8, width: 760, height: 64 } });
await page.screenshot({ path: path.join(OUT, "crop-desk.png"), clip: { x: 1120, y: 40, width: 312, height: 460 } });

console.log("PORT", port);
console.log("ROOT_HTML_LEN", rootHtmlLen);
console.log("ERRORS", JSON.stringify(errs, null, 2));

await browser.close();
server.close();
