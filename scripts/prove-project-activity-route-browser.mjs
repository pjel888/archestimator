import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const repoRoot = process.cwd();
const expectedProjectRef = "ebxxqidacheyapmmzavr";
const artifactRoot = resolve(repoRoot, ".omx/artifacts/project-activity-page");
const stamp = new Date().toISOString().replaceAll(":", "").replace(/\.\d{3}Z$/, "Z");
const artifactDir = join(artifactRoot, `project-activity-route-browser-${stamp}`);
const projectId = process.env.PROJECT_ACTIVITY_PROOF_PROJECT_ID ?? "0139e1e5-951d-4f2f-9081-6c953d288d8a";
const dashboardPath = `/workshop/projects/${projectId}`;
const routePath = `${dashboardPath}/activity`;
const invalidParamsPath = `${routePath}?scope=estimate:not-a-uuid&action=created&action=%3Cscript%3E&actor=not-a-uuid&client=not-a-uuid`;
const externalBaseUrl = process.env.PROJECT_ACTIVITY_PROOF_BASE_URL;
const requestedServerMode = process.env.PROJECT_ACTIVITY_PROOF_SERVER_MODE;
const runCount = Number.parseInt(process.env.PROJECT_ACTIVITY_PROOF_RUNS ?? "20", 10);
const serverMode = externalBaseUrl ? "external" : requestedServerMode ?? "start";
const tempAuthEnabled = process.env.PROJECT_ACTIVITY_PROOF_TEMP_AUTH !== "0";
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
  return [key, value.replace(/\s+#.*$/, "").trim()];
}

async function readLocalEnv() {
  const result = {};
  for (const name of [".env", ".env.local", ".env.development", ".env.development.local", ".env.production.local"]) {
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

function projectRefFromUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    if (!hostname.endsWith(".supabase.co")) return "";
    return hostname.split(".")[0] ?? "";
  } catch {
    return "";
  }
}

function sanitizedSupabaseUrl(url) {
  const projectRef = projectRefFromUrl(url);
  return projectRef ? `https://${projectRef}.supabase.co` : "invalid-supabase-url";
}

function readStringProperty(source, propertyName, label) {
  const match = source.match(new RegExp(`${propertyName}:\\s*"([^"]+)"`));
  if (!match?.[1]) throw new Error(`Could not read ${label} from terms-content.ts.`);
  return match[1];
}

async function readCurrentTermsMetadata() {
  const source = await readFile(resolve(repoRoot, "src/lib/legal/terms-content.ts"), "utf8");
  const termsStart = source.indexOf("export const CURRENT_TERMS");
  const privacyStart = source.indexOf("export const CURRENT_PRIVACY_NOTICE");
  if (termsStart === -1 || privacyStart === -1) throw new Error("Could not find current legal metadata in terms-content.ts.");
  const termsSource = source.slice(termsStart);
  const privacySource = source.slice(privacyStart, termsStart);
  return {
    key: readStringProperty(termsSource, "key", "CURRENT_TERMS.key"),
    version: readStringProperty(termsSource, "version", "CURRENT_TERMS.version"),
    effectiveDate: readStringProperty(termsSource, "effectiveDate", "CURRENT_TERMS.effectiveDate"),
    contentHash: readStringProperty(termsSource, "contentHash", "CURRENT_TERMS.contentHash"),
    privacyPolicyVersion: readStringProperty(privacySource, "version", "CURRENT_PRIVACY_NOTICE.version"),
  };
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

async function waitForServer(baseUrl, child, label) {
  const deadline = Date.now() + 90_000;
  let lastError = null;
  while (Date.now() < deadline) {
    if (child?.exitCode !== null && child?.exitCode !== undefined) {
      const tail = child.logs?.join("").split(/\r?\n/).slice(-60).join("\n");
      throw new Error(`${label} server exited early with code ${child.exitCode}.${tail ? `\n${tail}` : ""}`);
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

async function startServer(env, mode) {
  if (mode === "external") return { baseUrl: externalBaseUrl.replace(/\/$/, ""), child: null, owned: false, mode };

  if (mode === "start" && !existsSync(resolve(repoRoot, ".next/BUILD_ID"))) {
    throw new Error("Production proof requires an existing .next build. Run `bun run build` first.");
  }

  const port = await getFreePort();
  const childEnv = {
    ...process.env,
    ...env,
    PORT: String(port),
    NEXT_PUBLIC_PROJECT_LOCATION_MAP_ENABLED: process.env.NEXT_PUBLIC_PROJECT_LOCATION_MAP_ENABLED ?? "0",
  };
  const command = mode === "dev"
    ? ["run", "dev", "--", "-p", String(port), "-H", "127.0.0.1"]
    : ["run", "start", "--", "-p", String(port), "-H", "127.0.0.1"];

  if (mode === "dev") {
    const bypassSecret = childEnv.ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET?.trim()
      || `project-activity-route-proof-${randomUUID()}-local`;
    childEnv.NODE_ENV = "development";
    childEnv.ARCHESTIMATOR_DEV_AUTH_BYPASS = "1";
    childEnv.ARCHESTIMATOR_DEV_AUTH_ADMIN_DB = "1";
    childEnv.ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET = bypassSecret;
  } else {
    childEnv.NODE_ENV = "production";
  }

  const child = spawn("bun", command, {
    cwd: repoRoot,
    env: childEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const logs = [];
  child.stdout.on("data", (chunk) => logs.push(chunk.toString()));
  child.stderr.on("data", (chunk) => logs.push(chunk.toString()));
  child.logs = logs;
  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForServer(baseUrl, child, mode === "dev" ? "Next dev" : "Next start");
  return {
    baseUrl,
    child,
    owned: true,
    mode,
    logs,
    devBypassSecret: childEnv.ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET,
  };
}

function createCookieChunks(key, value, chunkSize = 3180) {
  const encodedValue = encodeURIComponent(value);
  if (encodedValue.length <= chunkSize) return [{ name: key, value }];

  const chunks = [];
  let remaining = encodedValue;
  while (remaining.length > 0) {
    let encodedHead = remaining.slice(0, chunkSize);
    const lastEscapePos = encodedHead.lastIndexOf("%");
    if (lastEscapePos > chunkSize - 3) encodedHead = encodedHead.slice(0, lastEscapePos);

    let head = "";
    while (encodedHead.length > 0) {
      try {
        head = decodeURIComponent(encodedHead);
        break;
      } catch (error) {
        if (error instanceof URIError && encodedHead.at(-3) === "%" && encodedHead.length > 3) {
          encodedHead = encodedHead.slice(0, encodedHead.length - 3);
        } else {
          throw error;
        }
      }
    }
    chunks.push(head);
    remaining = remaining.slice(encodedHead.length);
  }
  return chunks.map((valuePart, index) => ({ name: `${key}.${index}`, value: valuePart }));
}

function storageCookiesForSession({ baseUrl, supabaseUrl, session }) {
  const projectRef = projectRefFromUrl(supabaseUrl);
  const storageKey = `sb-${projectRef}-auth-token`;
  const encodedSession = `base64-${Buffer.from(JSON.stringify(session), "utf8").toString("base64url")}`;
  return createCookieChunks(storageKey, encodedSession).map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    url: baseUrl,
    sameSite: "Lax",
    httpOnly: false,
    secure: false,
  }));
}

async function createTemporaryProofSession({ effectiveEnv }) {
  const url = effectiveEnv.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = effectiveEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = effectiveEnv.SUPABASE_SERVICE_ROLE_KEY;
  const serviceClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const anonClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: project, error: projectError } = await serviceClient
    .from("projects")
    .select("id, workspace_id, name")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) throw projectError;
  if (!project) throw new Error(`Proof project ${projectId} does not exist in ${sanitizedSupabaseUrl(url)}.`);

  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const email = `project-activity-proof-${suffix}@example.com`;
  const password = `Proof-${suffix}-Aa1!`;

  let temporaryUserDeleted = false;
  let allowlistInserted = false;
  let termsAcceptanceInserted = false;
  const createResult = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: "Project Activity Proof" },
  });
  const userId = createResult.data?.user?.id ?? "";
  if (createResult.error || !userId) {
    throw new Error(`Temporary auth user create failed: ${createResult.error?.message ?? "missing user id"}`);
  }

  try {
    const existingAllowlist = await serviceClient
      .from("closed_beta_allowed_emails")
      .select("id, status")
      .eq("normalized_email", email)
      .maybeSingle();
    if (!existingAllowlist.data && !existingAllowlist.error) {
      const allowlistResult = await serviceClient
        .from("closed_beta_allowed_emails")
        .insert({
          normalized_email: email,
          status: "active",
          notes: "Temporary project activity route browser proof user",
          metadata: { proof: "project-activity-route-browser", generatedAt: new Date().toISOString() },
        });
      if (allowlistResult.error) throw allowlistResult.error;
      allowlistInserted = true;
    }

    const profileResult = await serviceClient
      .from("profiles")
      .update({
        default_workspace_id: project.workspace_id,
        display_name: "Project Activity Proof",
      })
      .eq("id", userId);
    if (profileResult.error) throw profileResult.error;

    const membershipResult = await serviceClient
      .from("workspace_members")
      .upsert({
        workspace_id: project.workspace_id,
        user_id: userId,
        role: "member",
      }, { onConflict: "workspace_id,user_id" });
    if (membershipResult.error) throw membershipResult.error;

    const currentTerms = await readCurrentTermsMetadata();
    const termsResult = await serviceClient
      .from("legal_terms_acceptances")
      .insert({
        user_id: userId,
        terms_key: currentTerms.key,
        terms_version: currentTerms.version,
        terms_effective_date: currentTerms.effectiveDate,
        terms_content_hash: currentTerms.contentHash,
        privacy_policy_version: currentTerms.privacyPolicyVersion,
        acceptance_method: "authenticated_clickwrap",
        acceptance_context: "workshop_terms_gate",
        metadata_json: {
          source: "project_activity_route_browser_proof",
          generatedAt: new Date().toISOString(),
        },
      });
    if (termsResult.error && termsResult.error.code !== "23505") throw termsResult.error;
    termsAcceptanceInserted = !termsResult.error;

    const signInResult = await anonClient.auth.signInWithPassword({ email, password });
    const session = signInResult.data?.session ?? null;
    if (signInResult.error || !session) {
      throw new Error(`Temporary auth user sign-in failed: ${signInResult.error?.message ?? "missing session"}`);
    }

    return {
      strategy: "temporary-supabase-user",
      email,
      userId,
      projectId: project.id,
      workspaceId: project.workspace_id,
      session,
      cleanup: async () => {
        const cleanupErrors = [];
        if (allowlistInserted) {
          const deleteAllowlist = await serviceClient
            .from("closed_beta_allowed_emails")
            .delete()
            .eq("normalized_email", email);
          if (deleteAllowlist.error) cleanupErrors.push(`allowlist: ${deleteAllowlist.error.message}`);
        }
        if (termsAcceptanceInserted) {
          const deleteTerms = await serviceClient
            .from("legal_terms_acceptances")
            .delete()
            .eq("user_id", userId)
            .eq("terms_key", currentTerms.key)
            .eq("terms_version", currentTerms.version);
          if (deleteTerms.error) cleanupErrors.push(`terms-acceptance: ${deleteTerms.error.message}`);
        }
        const deleteUser = await serviceClient.auth.admin.deleteUser(userId);
        temporaryUserDeleted = !deleteUser.error;
        if (deleteUser.error) cleanupErrors.push(`auth-user: ${deleteUser.error.message}`);
        return { temporaryUserDeleted, allowlistInserted, termsAcceptanceInserted, cleanupErrors };
      },
    };
  } catch (error) {
    await serviceClient.auth.admin.deleteUser(userId).catch(() => undefined);
    if (allowlistInserted) {
      await serviceClient.from("closed_beta_allowed_emails").delete().eq("normalized_email", email).catch(() => undefined);
    }
    if (termsAcceptanceInserted) {
      await serviceClient.from("legal_terms_acceptances").delete().eq("user_id", userId).catch(() => undefined);
    }
    throw error;
  }
}

async function writeJson(name, value) {
  await writeFile(join(artifactDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

function readBox(selector) {
  const element = document.querySelector(selector);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
}

function byLabel(label) {
  const element = document.querySelector(`[aria-label="${label}"]`);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
}

async function collectRouteMetrics(page) {
  return page.evaluate(({ readBoxSource, byLabelSource }) => {
    const readBox = eval(`(${readBoxSource})`);
    const byLabel = eval(`(${byLabelSource})`);
    const visibleText = document.body.innerText;
    const controls = Array.from(document.querySelectorAll("button, a[href], input, select, textarea"))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          label: element.getAttribute("aria-label") || element.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) || element.tagName.toLowerCase(),
          tag: element.tagName.toLowerCase(),
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      });
    const navigationEntries = performance.getEntriesByType("navigation");
    const navigation = navigationEntries[0];
    return {
      title: document.title,
      pathname: window.location.pathname,
      search: window.location.search,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      bodyClientWidth: document.body.clientWidth,
      shellBox: readBox("[data-workshop-page-shell-root]"),
      canvasBox: readBox("[data-workshop-page-shell-canvas]"),
      surfaceBox: readBox("[data-workshop-workspace-surface]"),
      projectNavigationBox: byLabel("Project navigation"),
      projectSectionsBox: byLabel("Project sections"),
      activityBox: byLabel("Project activity"),
      filterBox: byLabel("Filter project activity"),
      actionFiltersBox: byLabel("Action filters"),
      timelineBox: byLabel("Activity timeline"),
      visibleTextSample: visibleText.slice(0, 2000),
      hasRawScriptText: visibleText.includes("<script>"),
      hasEditorOnly: visibleText.includes("Activity is editor-only"),
      hasInitialLoadError: visibleText.includes("Activity could not be loaded"),
      hasNoActivityState: visibleText.includes("No activity yet"),
      hasNoMatchesState: visibleText.includes("No activity matches these filters"),
      hasLoadMore: controls.some((control) => control.label === "Load more"),
      controls,
      navigationTiming: navigation
        ? {
            responseStartMs: Math.round(navigation.responseStart),
            requestStartMs: Math.round(navigation.requestStart),
            ttfbMs: Math.round(navigation.responseStart - navigation.requestStart),
            domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd - navigation.startTime),
            loadEventMs: Math.round(navigation.loadEventEnd - navigation.startTime),
          }
        : null,
    };
  }, { readBoxSource: readBox.toString(), byLabelSource: byLabel.toString() });
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

  const dashboardResponse = await page.goto(`${baseUrl}${dashboardPath}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
  const dashboardScreenshot = join(artifactDir, `${viewport.name}-dashboard.png`);
  await page.screenshot({ path: dashboardScreenshot, fullPage: true });

  if (viewport.name === "desktop") {
    const activityLink = page.getByRole("link", { name: "Activity", exact: true });
    await activityLink.waitFor({ state: "visible", timeout: 15_000 });
    await activityLink.click();
    await page.waitForURL((url) => url.pathname === routePath, { timeout: 15_000 });
  } else {
    await page.goto(`${baseUrl}${routePath}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  }

  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
  await page.getByRole("region", { name: "Project activity" }).waitFor({ state: "visible", timeout: 15_000 });
  const activityScreenshot = join(artifactDir, `${viewport.name}-activity.png`);
  await page.screenshot({ path: activityScreenshot, fullPage: true });

  const interactions = [];
  await page.getByRole("button", { name: "Edited by me" }).click();
  await page.waitForURL((url) => url.pathname === routePath && url.searchParams.get("actor") === "me", { timeout: 10_000 });
  interactions.push({ action: "edited-by-me", pathname: new URL(page.url()).pathname, search: new URL(page.url()).search });

  await page.getByRole("button", { name: "Clear" }).click();
  await page.waitForURL((url) => url.pathname === routePath && !url.searchParams.has("actor"), { timeout: 10_000 });
  interactions.push({ action: "clear-filters", pathname: new URL(page.url()).pathname, search: new URL(page.url()).search });

  await page.getByRole("button", { name: "Created" }).click();
  await page.waitForURL((url) => url.pathname === routePath && url.searchParams.getAll("action").includes("created"), { timeout: 10_000 });
  interactions.push({ action: "created-chip", pathname: new URL(page.url()).pathname, search: new URL(page.url()).search });

  const loadMore = page.getByRole("button", { name: "Load more" });
  if (await loadMore.isVisible().catch(() => false)) {
    await loadMore.click();
    await page.waitForTimeout(500);
    interactions.push({ action: "load-more", available: true, urlUnchanged: new URL(page.url()).pathname === routePath });
  } else {
    interactions.push({ action: "load-more", available: false });
  }

  await page.getByRole("button", { name: "Refresh" }).click();
  await page.waitForTimeout(500);
  interactions.push({ action: "refresh", pathname: new URL(page.url()).pathname, search: new URL(page.url()).search });

  await page.goto(`${baseUrl}${invalidParamsPath}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
  await page.getByRole("region", { name: "Project activity" }).waitFor({ state: "visible", timeout: 15_000 });
  const invalidParamsScreenshot = join(artifactDir, `${viewport.name}-invalid-params.png`);
  await page.screenshot({ path: invalidParamsScreenshot, fullPage: true });
  const invalidParamsMetrics = await collectRouteMetrics(page);

  await page.goto(`${baseUrl}${routePath}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
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
  const metrics = await collectRouteMetrics(page);
  await page.close();

  return {
    viewport,
    dashboardStatus: dashboardResponse?.status() ?? null,
    finalUrl: `${baseUrl}${routePath}`,
    screenshots: {
      dashboard: dashboardScreenshot,
      activity: activityScreenshot,
      invalidParams: invalidParamsScreenshot,
    },
    interactions,
    metrics,
    invalidParamsMetrics,
    firstFocus,
    consoleErrors,
    pageErrors,
  };
}

function percentile(values, percentileValue) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil((percentileValue / 100) * sorted.length) - 1);
  return sorted[index] ?? null;
}

async function measureAuthenticatedRoute(context, baseUrl) {
  const samples = [];
  const failures = [];
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}${routePath}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
    for (let run = 1; run <= runCount; run += 1) {
      const measuredUrl = `${baseUrl}${routePath}?proofRun=${run}`;
      const startedAt = performance.now();
      try {
        const response = await page.goto(measuredUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
        await page.getByRole("region", { name: "Project activity" }).waitFor({ state: "visible", timeout: 15_000 });
        const durationMs = Math.round(performance.now() - startedAt);
        const timing = await page.evaluate(() => {
          const entry = performance.getEntriesByType("navigation")[0];
          return entry
            ? {
                responseStartMs: Math.round(entry.responseStart),
                requestStartMs: Math.round(entry.requestStart),
                ttfbMs: Math.round(entry.responseStart - entry.requestStart),
                domContentLoadedMs: Math.round(entry.domContentLoadedEventEnd - entry.startTime),
                loadEventMs: Math.round(entry.loadEventEnd - entry.startTime),
              }
            : null;
        });
        samples.push({
          run,
          status: response?.status() ?? null,
          durationMs,
          ttfbMs: timing?.ttfbMs ?? null,
          domContentLoadedMs: timing?.domContentLoadedMs ?? null,
          finalPathname: new URL(page.url()).pathname,
        });
      } catch (error) {
        failures.push({ run, message: error instanceof Error ? error.message : String(error) });
      }
    }
  } finally {
    await page.close().catch(() => undefined);
  }

  const ttfbValues = samples.map((sample) => sample.ttfbMs).filter((value) => typeof value === "number");
  const durationValues = samples.map((sample) => sample.durationMs);
  return {
    requestedRuns: runCount,
    completedRuns: samples.length,
    samples,
    failures,
    ttfb: {
      p50Ms: percentile(ttfbValues, 50),
      p95Ms: percentile(ttfbValues, 95),
    },
    duration: {
      p50Ms: percentile(durationValues, 50),
      p95Ms: percentile(durationValues, 95),
    },
    thresholds: {
      ttfbP50Ms: 300,
      ttfbP95Ms: 600,
    },
  };
}

function evaluateProof({ viewportProofs, timingProof, authMode, server }) {
  const failures = [];
  const warnings = [];

  if (server.mode !== "start") {
    warnings.push(`WP-12 production start proof not used; serverMode=${server.mode}.`);
  }
  if (authMode !== "storage-state" && authMode !== "temporary-supabase-user") {
    failures.push(`authenticated proof did not use a production-compatible auth mode; authMode=${authMode}`);
  }
  if (timingProof.completedRuns !== runCount) failures.push(`timing completed ${timingProof.completedRuns}/${runCount} runs`);
  if (timingProof.failures.length > 0) failures.push(`timing had ${timingProof.failures.length} failures`);
  if ((timingProof.ttfb.p50Ms ?? Number.POSITIVE_INFINITY) > timingProof.thresholds.ttfbP50Ms) {
    failures.push(`TTFB p50 ${timingProof.ttfb.p50Ms}ms exceeds ${timingProof.thresholds.ttfbP50Ms}ms`);
  }
  if ((timingProof.ttfb.p95Ms ?? Number.POSITIVE_INFINITY) > timingProof.thresholds.ttfbP95Ms) {
    failures.push(`TTFB p95 ${timingProof.ttfb.p95Ms}ms exceeds ${timingProof.thresholds.ttfbP95Ms}ms`);
  }

  for (const proof of viewportProofs) {
    const name = proof.viewport.name;
    const metrics = proof.metrics;
    const invalidMetrics = proof.invalidParamsMetrics;
    if (metrics.pathname !== routePath) failures.push(`${name}: expected ${routePath}, got ${metrics.pathname}`);
    if (metrics.scrollWidth > metrics.clientWidth + 1 || metrics.bodyScrollWidth > metrics.bodyClientWidth + 1) {
      failures.push(`${name}: horizontal overflow detected`);
    }
    if (!metrics.shellBox || !metrics.surfaceBox || !metrics.activityBox) {
      failures.push(`${name}: route shell, surface, or activity region missing`);
    }
    if (!metrics.filterBox || !metrics.actionFiltersBox) failures.push(`${name}: filter controls missing`);
    if (metrics.hasEditorOnly) failures.push(`${name}: authenticated proof saw editor-only denial`);
    if (metrics.hasInitialLoadError) failures.push(`${name}: initial activity load failed`);
    if (!metrics.timelineBox && !metrics.hasNoActivityState && !metrics.hasNoMatchesState) {
      failures.push(`${name}: no timeline or expected empty state visible`);
    }
    if (invalidMetrics.pathname !== routePath) failures.push(`${name}: invalid-param route did not stay on activity page`);
    if (invalidMetrics.hasRawScriptText) failures.push(`${name}: invalid action value rendered as raw script text`);
    const controlLabels = new Set(metrics.controls.map((control) => control.label));
    for (const expected of ["Activity scope", "Actor filter", "Client filter", "Edited by me", "Refresh", "Clear", "Created"]) {
      if (!controlLabels.has(expected)) failures.push(`${name}: missing control ${expected}`);
    }
    const hasVisibleFocus = proof.firstFocus && (proof.firstFocus.outlineStyle !== "none" || proof.firstFocus.outlineWidth !== "0px" || proof.firstFocus.boxShadow !== "none");
    if (!hasVisibleFocus) failures.push(`${name}: first tab stop did not expose visible focus`);
    if (proof.pageErrors.length > 0) failures.push(`${name}: page error detected`);
    if (proof.consoleErrors.length > 0) warnings.push(`${name}: console errors captured (${proof.consoleErrors.length})`);
  }

  return { failures, warnings };
}

function readServerLogTail(server, lineCount = 120) {
  return server?.logs?.join("").split(/\r?\n/).slice(-lineCount).join("\n") ?? null;
}

function readPerfTraceSnapshots(server) {
  const lines = server?.logs?.join("").split(/\r?\n/) ?? [];
  return lines.flatMap((line) => {
    const marker = "[perf-json] ";
    const index = line.indexOf(marker);
    if (index === -1) return [];
    try {
      return [JSON.parse(line.slice(index + marker.length))];
    } catch {
      return [];
    }
  });
}

await mkdir(artifactDir, { recursive: true });

const localEnv = await readLocalEnv();
const effectiveEnv = { ...localEnv, ...process.env };
const requiredKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];
const envPresence = redactEnvPresence(effectiveEnv, requiredKeys);
const missingKeys = requiredKeys.filter((key) => !effectiveEnv[key]?.trim());
const projectRef = projectRefFromUrl(effectiveEnv.NEXT_PUBLIC_SUPABASE_URL ?? "");

if (missingKeys.length > 0) {
  const blocker = {
    proof: "project_activity_route_browser",
    status: "blocked",
    generatedAt: new Date().toISOString(),
    routePath,
    artifactDir,
    envPresence,
    blocker: `Missing local env keys required for provider-backed route proof: ${missingKeys.join(", ")}`,
  };
  await writeJson("project-activity-route-browser-blocker.json", blocker);
  console.error(JSON.stringify(blocker, null, 2));
  process.exit(1);
}

if (projectRef !== expectedProjectRef) {
  const blocker = {
    proof: "project_activity_route_browser",
    status: "blocked",
    generatedAt: new Date().toISOString(),
    routePath,
    artifactDir,
    envPresence,
    blocker: "Refusing provider-backed proof for unexpected Supabase project.",
    expectedProjectRef,
    projectRef: projectRef || null,
    projectUrl: sanitizedSupabaseUrl(effectiveEnv.NEXT_PUBLIC_SUPABASE_URL),
  };
  await writeJson("project-activity-route-browser-blocker.json", blocker);
  console.error(JSON.stringify(blocker, null, 2));
  process.exit(1);
}

let server;
let browser;
let proofSession = null;

try {
  server = await startServer(localEnv, serverMode);
  browser = await chromium.launch({ headless: true });
  const authMode = process.env.PLAYWRIGHT_STORAGE_STATE
    ? "storage-state"
    : server.mode === "dev"
      ? "dev-auth-bypass"
      : tempAuthEnabled
        ? "temporary-supabase-user"
        : "none";
  const contextOptions = process.env.PLAYWRIGHT_STORAGE_STATE
    ? { storageState: process.env.PLAYWRIGHT_STORAGE_STATE }
    : server.mode === "dev"
      ? { extraHTTPHeaders: { "x-archestimator-dev-auth-bypass": server.devBypassSecret } }
      : {};
  const context = await browser.newContext(contextOptions);

  if (authMode === "temporary-supabase-user") {
    proofSession = await createTemporaryProofSession({ effectiveEnv });
    await context.addCookies(storageCookiesForSession({
      baseUrl: server.baseUrl,
      supabaseUrl: effectiveEnv.NEXT_PUBLIC_SUPABASE_URL,
      session: proofSession.session,
    }));
  }

  const viewportProofs = [];
  for (const viewport of viewports) {
    viewportProofs.push(await collectViewportProof(context, server.baseUrl, viewport));
  }
  const timingProof = await measureAuthenticatedRoute(context, server.baseUrl);
  await context.close();

  const evaluation = evaluateProof({ viewportProofs, timingProof, authMode, server });
  const cleanup = proofSession ? await proofSession.cleanup() : null;
  const report = {
    proof: "project_activity_route_browser",
    status: evaluation.failures.length > 0 ? "failed" : "passed",
    generatedAt: new Date().toISOString(),
    routePath,
    dashboardPath,
    projectId,
    baseUrl: server.baseUrl,
    serverMode: server.mode,
    serverOwnedByScript: server.owned,
    authMode,
    temporaryAuth: proofSession
      ? {
          strategy: proofSession.strategy,
          userId: proofSession.userId,
          workspaceId: proofSession.workspaceId,
          cleanup,
        }
      : null,
    artifactDir,
    envPresence,
    assertions: [
      "production-compatible authenticated route resolves to the activity page",
      "desktop navigation reaches Activity through the existing project mini-sidebar link",
      "dashboard and activity screenshots are captured for side-by-side visual review",
      "desktop and mobile avoid horizontal document overflow",
      "scope, actor, client, action, refresh, clear, and edited-by-me controls are visible",
      "filter URL state updates without cursor state",
      "invalid query params are tolerated without rendering raw input",
      "Load more is exercised when available and recorded as skipped when no cursor exists",
      "Refresh remains available after filter interactions",
      "20 authenticated timing samples are collected and checked against TTFB p50/p95 budgets",
    ],
    viewportProofs,
    timingProof,
    perfTraceSnapshots: readPerfTraceSnapshots(server),
    serverLogTail: readServerLogTail(server),
    failures: evaluation.failures,
    warnings: evaluation.warnings,
  };
  await writeJson("project-activity-route-browser-proof.json", report);
  if (report.status !== "passed") {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
} catch (error) {
  const cleanup = proofSession ? await proofSession.cleanup().catch((cleanupError) => ({
    temporaryUserDeleted: false,
    allowlistInserted: null,
    cleanupErrors: [cleanupError instanceof Error ? cleanupError.message : String(cleanupError)],
  })) : null;
  const blocker = {
    proof: "project_activity_route_browser",
    status: "blocked",
    generatedAt: new Date().toISOString(),
    routePath,
    artifactDir,
    envPresence,
    blocker: error instanceof Error ? error.message : String(error),
    cleanup,
    serverMode,
    serverLogTail: readServerLogTail(server, 100),
  };
  await writeJson("project-activity-route-browser-blocker.json", blocker);
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
