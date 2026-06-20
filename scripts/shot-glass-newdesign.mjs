// Screenshot-capture infra for the estimate-sheet "liquid glass" redesign and
// its reference pages. Drives Playwright (chromium) against the ALREADY-RUNNING
// dev server on http://localhost:3000 at the project's established desktop size.
//
// Auth: the running dev server has the dev-auth-bypass DISABLED, so we reuse the
// REAL authenticated Supabase session from the user's browser. The non-httpOnly
// `sb-<ref>-auth-token.*` cookies were extracted via the Kimi WebBridge daemon
// into /tmp/sb-cookies.json and are injected into the Playwright context here.
//
// Usage: node scripts/shot-glass-newdesign.mjs
// Optional env: SHOT_BASE_URL (default http://localhost:3000)
//               SHOT_COOKIES_FILE (default /tmp/sb-cookies.json)

import { readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const BASE = (process.env.SHOT_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const COOKIES_FILE = process.env.SHOT_COOKIES_FILE || "/tmp/sb-cookies.json";
const OUT_DIR = resolve(process.cwd(), ".design-shots");
const VIEWPORT = { width: 1512, height: 982 };

const PROJECT = "22222222-2222-4222-8222-222222222222";
const NODE_ID = "bf254cbd-13d4-4dbf-b21a-84b171cdd6db";
const EST = `/workshop/projects/${PROJECT}/estimates/${NODE_ID}`;

const TARGETS = [
  { file: "01-glass-newdesign", path: `${EST}/newdesign`, full: true },
  { file: "02-live-paper", path: EST, full: false },
  { file: "03-ref-estimates-list", path: `/workshop/projects/${PROJECT}/estimates`, full: true },
  { file: "04-ref-project-dashboard", path: `/workshop/projects/${PROJECT}`, full: false },
  { file: "05-ref-workshop", path: "/workshop", full: false },
];

function loadAuthCookies() {
  const raw = JSON.parse(readFileSync(COOKIES_FILE, "utf8"));
  // File is the WebBridge envelope: { ok, data: { type, value: "<json-string>" } }
  const inner = raw?.data?.value ?? raw;
  const pairs = typeof inner === "string" ? JSON.parse(inner) : inner;
  const host = new URL(BASE).hostname;
  const cookies = [];
  for (const { name, value } of pairs) {
    // document.cookie returns URL-decoded values; Supabase stores them
    // URL-encoded, so re-encode to faithfully reproduce the stored cookie.
    const encoded = value.includes("%") ? value : encodeURIComponent(value);
    cookies.push({ name, value: encoded, domain: host, path: "/", httpOnly: false, secure: false, sameSite: "Lax" });
  }
  return cookies;
}

async function capture(page, target) {
  const url = `${BASE}${target.path}`;
  const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  // Arm the deferred glass blur: app sets <html data-glass="ready"> after first paint+idle.
  await page
    .waitForFunction(() => document.documentElement.dataset.glass === "ready", { timeout: 8000 })
    .catch(() => {});
  await page.waitForTimeout(2000);

  const info = await page.evaluate(() => ({
    pathname: location.pathname,
    glass: document.documentElement.dataset.glass ?? null,
    title: document.title,
    scrollHeight: document.documentElement.scrollHeight,
  }));

  const viewportShot = resolve(OUT_DIR, `${target.file}.png`);
  await page.screenshot({ path: viewportShot, fullPage: false });
  const written = [viewportShot];

  if (target.full) {
    const fullShot = resolve(OUT_DIR, `${target.file}-full.png`);
    await page.screenshot({ path: fullShot, fullPage: true });
    written.push(fullShot);
  }

  const status = resp?.status() ?? null;
  const finalUrl = page.url();
  const redirectedToLogin = info.pathname.startsWith("/login") || finalUrl.includes("/login");
  return { ...target, status, finalUrl, ...info, redirectedToLogin, written };
}

(async () => {
  mkdirSync(OUT_DIR, { recursive: true });
  const cookies = loadAuthCookies();
  console.log(`Injecting ${cookies.length} auth cookies: ${cookies.map((c) => c.name).join(", ")}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
  });
  await context.addCookies(cookies);

  const results = [];
  const page = await context.newPage();
  for (const target of TARGETS) {
    try {
      const r = await capture(page, target);
      results.push(r);
      console.log(
        `[${r.redirectedToLogin ? "LOGIN-REDIRECT" : "OK"}] ${target.file} ` +
          `status=${r.status} path=${r.pathname} glass=${r.glass} -> ${r.written.length} file(s)`,
      );
    } catch (e) {
      results.push({ ...target, error: String(e?.message || e) });
      console.error(`[ERROR] ${target.file}: ${e?.message || e}`);
    }
  }

  await context.close();
  await browser.close();

  console.log("\n=== RESULT ===");
  console.log(JSON.stringify({ base: BASE, viewport: VIEWPORT, outDir: OUT_DIR, results }, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
