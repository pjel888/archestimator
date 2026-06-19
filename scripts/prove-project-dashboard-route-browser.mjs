import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { chromium } from "@playwright/test";

const repoRoot = process.cwd();
const artifactRoot = resolve(repoRoot, ".omx/artifacts/project-dashboard-command-surface/phase-1");
const stamp = new Date().toISOString().replaceAll(":", "").replace(/\.\d{3}Z$/, "Z");
const artifactDir = join(artifactRoot, `project-dashboard-route-browser-${stamp}`);
const projectId = process.env.PROJECT_DASHBOARD_PROOF_PROJECT_ID ?? "22222222-2222-4222-8222-222222222222";
const routePath = `/workshop/projects/${projectId}`;
const externalBaseUrl = process.env.PROJECT_DASHBOARD_PROOF_BASE_URL;
const bypassSecret = process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET?.trim()
  || `project-dashboard-route-proof-${randomUUID()}-local`;
const bypassHeaders = { "x-archestimator-dev-auth-bypass": bypassSecret };

const viewports = [
  { name: "desktop", width: 1440, height: 960 },
  { name: "mobile", width: 390, height: 844 },
];

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return null;
  const index = trimmed.indexOf("=");
  const key = trimmed.slice(0, index).trim();
  let value = trimmed.slice(index + 1).trim();
  if (!/^[A-Z0-9_]+$/.test(key)) return null;
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return [key, value];
}

async function readLocalEnv() {
  const result = {};
  for (const name of [".env", ".env.local", ".env.development", ".env.development.local"]) {
    const file = resolve(repoRoot, name);
    if (!existsSync(file)) continue;
    const text = await readFile(file, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (!parsed) continue;
      const [key, value] = parsed;
      if (result[key] === undefined && process.env[key] === undefined) result[key] = value;
    }
  }
  return result;
}

function redactEnvPresence(env, keys) {
  return Object.fromEntries(keys.map((key) => [key, Boolean(env[key]?.trim())]));
}

async function getFreePort() {
  const server = createServer();
  await new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolvePromise);
  });
  const address = server.address();
  await new Promise((resolvePromise) => server.close(resolvePromise));
  if (!address || typeof address === "string") throw new Error("Could not allocate a local proof port.");
  return address.port;
}

async function waitForServer(baseUrl, child) {
  const deadline = Date.now() + 90_000;
  let lastError = null;
  while (Date.now() < deadline) {
    if (child?.exitCode !== null && child?.exitCode !== undefined) {
      const tail = child.logs?.join("").split(/\r?\n/).slice(-40).join("\n");
      throw new Error(`Next dev server exited early with code ${child.exitCode}.${tail ? `\n${tail}` : ""}`);
    }
    try {
      const response = await fetch(baseUrl, { redirect: "manual" });
      if (response.status < 500) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 750));
  }
  throw new Error(`Timed out waiting for ${baseUrl}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

async function startDevServer(env) {
  if (externalBaseUrl) return { baseUrl: externalBaseUrl.replace(/\/$/, ""), child: null, owned: false };

  const port = await getFreePort();
  const childEnv = {
    ...process.env,
    ...env,
    NODE_ENV: "development",
    PORT: String(port),
    ARCHESTIMATOR_DEV_AUTH_BYPASS: "1",
    ARCHESTIMATOR_DEV_AUTH_ADMIN_DB: "1",
    ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET: bypassSecret,
    NEXT_PUBLIC_PROJECT_LOCATION_MAP_ENABLED: process.env.NEXT_PUBLIC_PROJECT_LOCATION_MAP_ENABLED ?? "0",
  };
  const child = spawn("bun", ["run", "dev", "--", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: repoRoot,
    env: childEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const logs = [];
  child.stdout.on("data", (chunk) => logs.push(chunk.toString()));
  child.stderr.on("data", (chunk) => logs.push(chunk.toString()));
  child.logs = logs;
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await waitForServer(baseUrl, child);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Another next dev server is already running")) {
      return {
        baseUrl: "http://localhost:3000",
        child: null,
        owned: false,
        logs,
        startupBlocker: message,
      };
    }
    throw error;
  }
  return { baseUrl, child, owned: true, logs };
}

async function collectViewportProof(context, baseUrl, viewport) {
  const page = await context.newPage();
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const response = await page.goto(`${baseUrl}${routePath}`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(500);

  const screenshot = join(artifactDir, `${viewport.name}-route.png`);
  await page.screenshot({ path: screenshot, fullPage: true });

  const metrics = await page.evaluate(() => {
    const readBox = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    };
    const byLabel = (label) => {
      const element = document.querySelector(`[aria-label="${label}"]`);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    };
    const focusables = Array.from(document.querySelectorAll('a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])'))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const label = element.getAttribute("aria-label") || element.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) || element.getAttribute("name") || element.tagName.toLowerCase();
        return {
          label,
          tag: element.tagName.toLowerCase(),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          x: Math.round(rect.x),
          y: Math.round(rect.y),
        };
      });
    const modules = ["Recent sheets", "Published link", "Estimate activity", "Location"].map((label) => ({
      label,
      box: byLabel(label),
    }));
    return {
      title: document.title,
      pathname: window.location.pathname,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      bodyClientWidth: document.body.clientWidth,
      shellBox: readBox("[data-workshop-page-shell-root]"),
      canvasBox: readBox("[data-workshop-page-shell-canvas]"),
      surfaceBox: readBox("[data-workshop-workspace-surface]"),
      projectIdentityBox: byLabel("Project identity"),
      projectDashboardBox: byLabel("Project dashboard"),
      commandSurfaceBox: byLabel("Project command surface"),
      modules,
      focusables,
      activeElementBeforeTab: document.activeElement?.tagName ?? null,
      visibleTextSample: document.body.innerText.slice(0, 1500),
    };
  });

  await page.keyboard.press("Tab");
  const firstFocus = await page.evaluate(() => {
    const element = document.activeElement;
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return {
      label: element.getAttribute("aria-label") || element.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) || element.getAttribute("name") || element.tagName.toLowerCase(),
      tag: element.tagName.toLowerCase(),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
    };
  });

  const finalUrl = page.url();
  await page.close();
  return {
    viewport,
    status: response?.status() ?? null,
    finalUrl,
    screenshot,
    metrics,
    firstFocus,
    consoleErrors,
    pageErrors,
  };
}

function evaluateProof(viewportProofs) {
  const failures = [];
  for (const proof of viewportProofs) {
    const name = proof.viewport.name;
    const metrics = proof.metrics;
    if (metrics.pathname !== routePath) failures.push(`${name}: expected ${routePath}, got ${metrics.pathname}`);
    if (metrics.scrollWidth > metrics.clientWidth + 1 || metrics.bodyScrollWidth > metrics.bodyClientWidth + 1) {
      failures.push(`${name}: horizontal overflow detected`);
    }
    if (!metrics.shellBox || !metrics.surfaceBox || !metrics.commandSurfaceBox) {
      failures.push(`${name}: route shell or command surface missing`);
    }
    for (const module of metrics.modules) {
      if (!module.box) failures.push(`${name}: ${module.label} module missing`);
    }
    if (name === "desktop" && metrics.projectIdentityBox && metrics.projectDashboardBox) {
      const beside = metrics.projectDashboardBox.x > metrics.projectIdentityBox.x + metrics.projectIdentityBox.width - 2;
      if (!beside) failures.push("desktop: project dashboard does not sit beside identity rail");
    }
    if (name === "mobile" && metrics.projectIdentityBox && metrics.projectDashboardBox) {
      const stacked = metrics.projectDashboardBox.y >= metrics.projectIdentityBox.y + metrics.projectIdentityBox.height - 2;
      if (!stacked) failures.push("mobile: project dashboard does not stack below identity rail");
    }
    const undersized = metrics.focusables.filter((item) => item.width < 32 || item.height < 32);
    if (undersized.length > 0) {
      failures.push(`${name}: ${undersized.length} visible focus/tap targets below 32px`);
    }
    const hasVisibleFocus = proof.firstFocus && (proof.firstFocus.outlineStyle !== "none" || proof.firstFocus.outlineWidth !== "0px" || proof.firstFocus.boxShadow !== "none");
    if (!hasVisibleFocus) failures.push(`${name}: first tab stop did not expose a visible focus style`);
    if (proof.pageErrors.length > 0) failures.push(`${name}: page error detected`);
  }
  return failures;
}

async function writeJson(name, value) {
  await writeFile(join(artifactDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

await mkdir(artifactDir, { recursive: true });

const localEnv = await readLocalEnv();
const effectiveEnv = { ...localEnv, ...process.env };
const requiredKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ARCHESTIMATOR_DEV_AUTH_EMAIL",
];
const envPresence = redactEnvPresence(effectiveEnv, requiredKeys);
const missingKeys = requiredKeys.filter((key) => !effectiveEnv[key]?.trim());

if (missingKeys.length > 0) {
  const blocker = {
    proof: "project_dashboard_route_browser",
    status: "blocked",
    generatedAt: new Date().toISOString(),
    routePath,
    artifactDir,
    envPresence,
    blocker: `Missing local env keys required for local dev-auth/admin-db route proof: ${missingKeys.join(", ")}`,
    instructions: [
      "Set the missing keys in the shell or local env files, then run: node scripts/prove-project-dashboard-route-browser.mjs",
      "The script starts its own localhost Next dev server on a free port and sends a throwaway x-archestimator-dev-auth-bypass header.",
      "It does not mutate Supabase and does not apply migrations.",
    ],
  };
  await writeJson("project-dashboard-route-browser-blocker.json", blocker);
  console.error(JSON.stringify(blocker, null, 2));
  process.exit(1);
}

let server;
let browser;

try {
  server = await startDevServer(localEnv);
  browser = await chromium.launch();
  const context = await browser.newContext({ extraHTTPHeaders: bypassHeaders });
  const proofs = [];
  for (const viewport of viewports) {
    proofs.push(await collectViewportProof(context, server.baseUrl, viewport));
  }
  await context.close();

  const failures = evaluateProof(proofs);
  const blockedByUnownedServer = Boolean(server.startupBlocker) && proofs.some((proof) => proof.metrics.pathname !== routePath);
  const report = {
    proof: "project_dashboard_route_browser",
    status: blockedByUnownedServer ? "blocked" : failures.length > 0 ? "failed" : "passed",
    generatedAt: new Date().toISOString(),
    routePath,
    projectId,
    baseUrl: server.baseUrl,
    serverOwnedByScript: server.owned,
    startupBlocker: server.startupBlocker ?? null,
    artifactDir,
    envPresence,
    assertions: [
      "protected route resolves to the project dashboard instead of login or terms redirect",
      "workshop shell, continuous workspace surface, and project command surface are present",
      "desktop keeps the identity rail beside the dashboard",
      "mobile stacks the dashboard below the identity rail",
      "desktop and mobile avoid horizontal document overflow",
      "visible interactive controls meet a 32px minimum proof threshold",
      "first keyboard tab stop exposes a visible focus style",
    ],
    proofs,
    failures,
    blocker: blockedByUnownedServer
      ? "A different Next dev server already owns this repo and redirected the protected dashboard route to /login. The script did not kill that unrelated process."
      : null,
  };
  await writeJson("project-dashboard-route-browser-proof.json", report);
  if (failures.length > 0) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
} catch (error) {
  const blocker = {
    proof: "project_dashboard_route_browser",
    status: "blocked",
    generatedAt: new Date().toISOString(),
    routePath,
    artifactDir,
    envPresence,
    blocker: error instanceof Error ? error.message : String(error),
    serverLogTail: server?.logs?.join("").split(/\r?\n/).slice(-80).join("\n") ?? null,
  };
  await writeJson("project-dashboard-route-browser-blocker.json", blocker);
  console.error(JSON.stringify(blocker, null, 2));
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => undefined);
  if (server?.child) {
    server.child.kill("SIGTERM");
    await new Promise((resolvePromise) => {
      const timeout = setTimeout(resolvePromise, 5000);
      server.child.once("exit", () => {
        clearTimeout(timeout);
        resolvePromise();
      });
    });
    if (server.child.exitCode === null) server.child.kill("SIGKILL");
  }
}
