// Detailed region crops of the estimate-sheet "liquid glass" workspace (the live
// main estimate route), for fine-grained design critique. Reuses the
// WebBridge-extracted Supabase session in /tmp/sb-cookies.json (see shot-glass-newdesign.mjs).
//
//   node scripts/shot-glass-crops.mjs
import { readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const BASE = (process.env.SHOT_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const COOKIES_FILE = process.env.SHOT_COOKIES_FILE || "/tmp/sb-cookies.json";
const OUT = resolve(process.cwd(), ".design-shots", "crops");
const PROJECT = "22222222-2222-4222-8222-222222222222";
const NODE_ID = "bf254cbd-13d4-4dbf-b21a-84b171cdd6db";
const URL_GLASS = `${BASE}/workshop/projects/${PROJECT}/estimates/${NODE_ID}`;

function cookies() {
  const raw = JSON.parse(readFileSync(COOKIES_FILE, "utf8"));
  const inner = raw?.data?.value ?? raw;
  const pairs = typeof inner === "string" ? JSON.parse(inner) : inner;
  const host = new URL(BASE).hostname;
  return pairs.map(({ name, value }) => ({
    name, value: value.includes("%") ? value : encodeURIComponent(value),
    domain: host, path: "/", httpOnly: false, secure: false, sameSite: "Lax",
  }));
}

const CROPS = [
  { file: "crop-header.png", clip: { x: 0, y: 104, width: 1512, height: 140 } },
  { file: "crop-footer.png", clip: { x: 0, y: 904, width: 1512, height: 78 } },
  { file: "crop-tree.png", clip: { x: 0, y: 104, width: 440, height: 878 } },
  { file: "crop-center.png", clip: { x: 440, y: 104, width: 650, height: 878 } },
  { file: "crop-library.png", clip: { x: 1090, y: 104, width: 422, height: 878 } },
  { file: "crop-gutter-left.png", clip: { x: 392, y: 240, width: 130, height: 420 } },
  { file: "crop-node-top.png", clip: { x: 440, y: 240, width: 650, height: 360 } },
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1512, height: 982 }, deviceScaleFactor: 2 });
  await ctx.addCookies(cookies());
  const page = await ctx.newPage();
  await page.goto(URL_GLASS, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await page.waitForFunction(() => document.documentElement.dataset.glass === "ready", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(2200);

  const written = [];
  for (const c of CROPS) {
    const out = resolve(OUT, c.file);
    await page.screenshot({ path: out, clip: c.clip });
    written.push(out);
  }
  // Mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  const mob = resolve(OUT, "crop-mobile.png");
  await page.screenshot({ path: mob, fullPage: false });
  written.push(mob);

  console.log(JSON.stringify({ written }, null, 2));
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
