import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";
import { createServer } from "vite";

const repoRoot = process.cwd();
const componentPath = resolve(repoRoot, "src/components/workshop/ProjectLocationMap.tsx").replaceAll("\\", "/");
const globalsPath = resolve(repoRoot, "src/app/globals.css").replaceAll("\\", "/");
const maplibreCssPath = resolve(repoRoot, "node_modules/maplibre-gl/dist/maplibre-gl.css").replaceAll("\\", "/");
const nodeModulesPath = resolve(repoRoot, "node_modules");
const evidenceRoot = resolve(repoRoot, ".ai/03_plans/2026-06-19-Project-Dashboard-Command-Surface/evidence");
const stamp = new Date().toISOString().replaceAll(":", "").replace(/\.\d{3}Z$/, "Z");
const evidenceDir = join(evidenceRoot, `project-location-map-browser-${stamp}`);

function boxesOverlap(left, right) {
  if (!left || !right) return false;
  return !(
    left.x + left.width <= right.x ||
    right.x + right.width <= left.x ||
    left.y + left.height <= right.y ||
    right.y + right.height <= left.y
  );
}

async function createFixture(root) {
  await writeFile(
    join(root, "index.html"),
    '<!doctype html><html><head><meta charset="utf-8" /><title>Project Location Map Proof</title><style>body{margin:0;background:#f5f5f5;}[data-testid="project-location-map"]{display:block;height:176px;min-height:176px;width:100%;position:relative;}</style></head><body><div id="root"></div><script type="module" src="/src/App.tsx"></script></body></html>',
  );
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(
    join(root, "src/App.tsx"),
    `import React from "react";
import { createRoot } from "react-dom/client";
import "${maplibreCssPath}";
import "${globalsPath}";
import { ProjectLocationMap } from "${componentPath}";

const enabledConfig = {
  enabled: true,
  providerName: "OpenFreeMap",
  styleUrl: "https://tiles.openfreemap.org/styles/liberty",
  allowedHosts: ["tiles.openfreemap.org"],
  attribution: "OpenFreeMap, OpenMapTiles, and OpenStreetMap contributors",
  disabledReason: null,
};

const disabledConfig = {
  ...enabledConfig,
  enabled: false,
  disabledReason: "Map provider disabled",
};

function App() {
  const mode = new URLSearchParams(window.location.search).get("mode") ?? "enabled";
  const config = mode === "disabled" ? disabledConfig : enabledConfig;
  return (
    <main style={{ width: 460, padding: 24, fontFamily: "Arial, sans-serif" }}>
      <ProjectLocationMap
        latitude={14.599512}
        longitude={120.984222}
        addressLabel="Quezon City"
        config={config}
        onPinChange={(pin) => {
          window.__lastProjectLocationPin = pin;
        }}
      />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
`,
  );
}

async function collectPageErrors(page) {
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  return { consoleErrors, pageErrors };
}

async function proveEnabled(page, baseUrl) {
  const openFreeMapRequests = [];
  const forbiddenRequests = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("tiles.openfreemap.org")) openFreeMapRequests.push(url);
    if (/nominatim|tile\.openstreetmap\.org|mapbox/i.test(url)) forbiddenRequests.push(url);
  });

  await page.goto(`${baseUrl}/?mode=enabled`, { waitUntil: "domcontentloaded" });
  const map = page.getByTestId("project-location-map");
  await map.waitFor({ state: "visible", timeout: 10_000 });
  await page.waitForTimeout(2500);

  const externalAttribution = page.getByLabel("Map attribution");
  await externalAttribution.waitFor({ state: "visible", timeout: 10_000 });
  const mapLibreAttribution = page.locator(".maplibregl-ctrl-attrib").first();
  await mapLibreAttribution.waitFor({ state: "visible", timeout: 10_000 });
  const navControl = page.locator(".maplibregl-ctrl-top-right").first();
  await navControl.waitFor({ state: "visible", timeout: 10_000 });

  const mapBox = await map.boundingBox();
  const externalBox = await externalAttribution.boundingBox();
  const mapLibreAttributionBox = await mapLibreAttribution.boundingBox();
  const navBox = await navControl.boundingBox();
  const screenshot = join(evidenceDir, "enabled-map.png");
  await map.screenshot({ path: screenshot });

  return {
    mode: "enabled",
    mapBox,
    externalAttributionText: await externalAttribution.textContent(),
    mapLibreAttributionVisible: await mapLibreAttribution.isVisible(),
    navigationControlVisible: await navControl.isVisible(),
    openFreeMapRequestCount: openFreeMapRequests.length,
    forbiddenRequests,
    screenshot,
    checks: {
      mapHasStableSize: Boolean(mapBox && mapBox.width >= 300 && mapBox.height >= 150),
      providerRequested: openFreeMapRequests.length > 0,
      externalAttributionBelowMap: Boolean(externalBox && mapBox && externalBox.y >= mapBox.y + mapBox.height),
      controlsDoNotOverlapAttribution: !boxesOverlap(navBox, mapLibreAttributionBox),
    },
  };
}

async function proveDisabled(page, baseUrl) {
  const openFreeMapRequests = [];
  page.on("request", (request) => {
    if (request.url().includes("tiles.openfreemap.org")) openFreeMapRequests.push(request.url());
  });

  await page.goto(`${baseUrl}/?mode=disabled`, { waitUntil: "domcontentloaded" });
  await page.getByText("Map provider disabled").waitFor({ state: "visible", timeout: 10_000 });
  await page.getByText(/14\.599512, 120\.984222/).waitFor({ state: "visible", timeout: 10_000 });
  await page.waitForTimeout(500);

  const screenshot = join(evidenceDir, "disabled-map-fallback.png");
  await page.locator("main").screenshot({ path: screenshot });

  return {
    mode: "disabled",
    mapRendered: await page.getByTestId("project-location-map").count(),
    openFreeMapRequestCount: openFreeMapRequests.length,
    screenshot,
  };
}

async function proveNoWebGl(page, baseUrl) {
  const openFreeMapRequests = [];
  page.on("request", (request) => {
    if (request.url().includes("tiles.openfreemap.org")) openFreeMapRequests.push(request.url());
  });
  await page.addInitScript(() => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value(contextId, ...args) {
        if (contextId === "webgl" || contextId === "experimental-webgl") return null;
        return originalGetContext.call(this, contextId, ...args);
      },
    });
  });

  await page.goto(`${baseUrl}/?mode=enabled`, { waitUntil: "domcontentloaded" });
  await page.getByText("Map unavailable without WebGL").waitFor({ state: "visible", timeout: 10_000 });
  await page.getByText(/14\.599512, 120\.984222/).waitFor({ state: "visible", timeout: 10_000 });
  await page.waitForTimeout(500);

  const screenshot = join(evidenceDir, "no-webgl-map-fallback.png");
  await page.locator("main").screenshot({ path: screenshot });

  return {
    mode: "no-webgl",
    mapRendered: await page.getByTestId("project-location-map").count(),
    openFreeMapRequestCount: openFreeMapRequests.length,
    screenshot,
  };
}

const tempRoot = await mkdtemp(join(tmpdir(), "archestimator-location-map-proof-"));
let server;
let browser;

try {
  await mkdir(evidenceDir, { recursive: true });
  await createFixture(tempRoot);
  server = await createServer({
    root: tempRoot,
    configFile: false,
    envFile: false,
    logLevel: "error",
    resolve: {
      alias: [
        { find: "react/jsx-dev-runtime", replacement: resolve(nodeModulesPath, "react/jsx-dev-runtime.js") },
        { find: "react/jsx-runtime", replacement: resolve(nodeModulesPath, "react/jsx-runtime.js") },
        { find: "react-dom/client", replacement: resolve(nodeModulesPath, "react-dom/client.js") },
        { find: "maplibre-gl", replacement: resolve(nodeModulesPath, "maplibre-gl/dist/maplibre-gl.js") },
        { find: "react", replacement: resolve(nodeModulesPath, "react/index.js") },
        { find: "@", replacement: resolve(repoRoot, "src") },
      ],
    },
    server: {
      host: "127.0.0.1",
      port: 0,
      strictPort: false,
      fs: {
        allow: [repoRoot, tempRoot],
      },
    },
  });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === "string") throw new Error("Vite proof server did not expose a port.");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  browser = await chromium.launch();
  const enabledPage = await browser.newPage();
  const enabledErrors = await collectPageErrors(enabledPage);
  const enabled = await proveEnabled(enabledPage, baseUrl);
  const disabledPage = await browser.newPage();
  const disabledErrors = await collectPageErrors(disabledPage);
  const disabled = await proveDisabled(disabledPage, baseUrl);
  const noWebGlPage = await browser.newPage();
  const noWebGlErrors = await collectPageErrors(noWebGlPage);
  const noWebGl = await proveNoWebGl(noWebGlPage, baseUrl);

  const report = {
    proof: "project_location_map_browser",
    generatedAt: new Date().toISOString(),
    evidenceDir,
    assertions: [
      "enabled MapLibre map renders with stable dimensions",
      "OpenFreeMap provider host is requested only in enabled mode",
      "visible attribution is present",
      "navigation control and attribution do not overlap",
      "disabled provider fallback renders text coordinates without provider requests",
      "no-WebGL fallback renders text coordinates without provider requests",
      "no Nominatim, tile.openstreetmap.org, or Mapbox requests are made",
    ],
    enabled,
    disabled,
    noWebGl,
    errors: {
      enabled: enabledErrors,
      disabled: disabledErrors,
      noWebGl: noWebGlErrors,
    },
  };

  const failures = [];
  if (!enabled.checks.mapHasStableSize) failures.push("enabled map did not have stable dimensions");
  if (!enabled.checks.providerRequested) failures.push("enabled map did not request the OpenFreeMap host");
  if (!enabled.checks.externalAttributionBelowMap) failures.push("external attribution was not below the map");
  if (!enabled.checks.controlsDoNotOverlapAttribution) failures.push("map controls overlap attribution");
  if (enabled.forbiddenRequests.length > 0) failures.push("forbidden map/geocoder provider request detected");
  if (disabled.mapRendered !== 0) failures.push("disabled mode rendered the map");
  if (disabled.openFreeMapRequestCount !== 0) failures.push("disabled mode requested the provider");
  if (noWebGl.mapRendered !== 0) failures.push("no-WebGL mode rendered the map");
  if (noWebGl.openFreeMapRequestCount !== 0) failures.push("no-WebGL mode requested the provider");
  if (enabledErrors.pageErrors.length || disabledErrors.pageErrors.length || noWebGlErrors.pageErrors.length) {
    failures.push("page error detected");
  }

  await writeFile(join(evidenceDir, "project-location-map-browser-proof.json"), `${JSON.stringify(report, null, 2)}\n`);

  if (failures.length > 0) {
    console.error(JSON.stringify({ ...report, failures }, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
} finally {
  await browser?.close().catch(() => undefined);
  await server?.close().catch(() => undefined);
  await rm(tempRoot, { recursive: true, force: true }).catch(() => undefined);
}
