#!/usr/bin/env bun
/**
 * Automated route-transition benchmark evidence.
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:3039 NETWORK_PROFILE="Slow 3G" \
 *     OUTPUT_FILE=.ai/09_archive/store/.../route-transition-measurements.json \
 *     bun run scripts/measure-route-transitions.ts
 *
 * Authenticated workshop scenarios are skipped by default. Enable them only
 * when a valid Playwright storage state or dev-auth server is available:
 *   INCLUDE_AUTHENTICATED=1 PLAYWRIGHT_STORAGE_STATE=.auth/user.json ...
 */

import { writeFileSync } from "node:fs";

import { chromium, type Browser, type BrowserContext, type BrowserContextOptions, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const RUNS = Number.parseInt(process.env.RUNS ?? "3", 10);
const NETWORK_PROFILE = process.env.NETWORK_PROFILE ?? "No throttle";
const OUTPUT_FILE = process.env.OUTPUT_FILE;
const SCENARIO_FILTER = process.env.SCENARIO_FILTER?.toLowerCase();
const INCLUDE_AUTHENTICATED = process.env.INCLUDE_AUTHENTICATED === "1" || Boolean(process.env.PLAYWRIGHT_STORAGE_STATE);
const SKIP_AUTHENTICATED = process.env.SKIP_AUTHENTICATED === "1" || !INCLUDE_AUTHENTICATED;
const WAIT_FOR_NETWORK_IDLE = process.env.ROUTE_TRANSITION_WAIT_FOR_NETWORK_IDLE === "1";
const WARM_ROUTES_BEFORE_MEASURE = process.env.ROUTE_TRANSITION_SKIP_WARMUP !== "1";
const HERO_PROJECT_ID = process.env.HERO_PROJECT_ID ?? "22222222-2222-4222-8222-222222222222";
const HERO_ESTIMATE_NODE_ID =
  process.env.HERO_ESTIMATE_NODE_ID ?? process.env.HERO_ESTIMATE_ID ?? "bf254cbd-13d4-4dbf-b21a-84b171cdd6db";
const HERO_PROJECT_PATH = `/workshop/projects/${HERO_PROJECT_ID}`;
const HERO_ESTIMATES_PATH = `${HERO_PROJECT_PATH}/estimates`;
const HERO_ESTIMATE_PATH = `${HERO_ESTIMATES_PATH}/${HERO_ESTIMATE_NODE_ID}`;
const DEV_AUTH_BYPASS_COOKIE = "archestimator-dev-auth-bypass";
const DEV_AUTH_BYPASS_SECRET = process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET?.trim();
const DEV_AUTH_BYPASS_ENABLED = process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS === "1" && Boolean(DEV_AUTH_BYPASS_SECRET);
const LOCAL_DEV_AUTH_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);

type NetworkPreset = {
  download: number;
  upload: number;
  latency: number;
};

const NETWORK_PRESETS: Record<string, NetworkPreset> = {
  "No throttle": { download: -1, upload: -1, latency: 0 },
  "Fast 3G": { download: (1.5 * 1024 * 1024) / 8, upload: (750 * 1024) / 8, latency: 150 },
  "Slow 3G": { download: (400 * 1024) / 8, upload: (400 * 1024) / 8, latency: 400 },
};

type Scenario = {
  name: string;
  from: string;
  expectedPathname: string;
  requiresAuth?: boolean;
  clickPosition?: { x: number; y: number };
  beforeAction?: (page: Page) => Promise<void>;
  disableWarmup?: boolean;
  action: (page: Page) => Promise<void>;
};

type RouteTimelineSelectorRole = "parent-fallback" | "sheet-skeleton" | "overlay" | "sheet-content" | "shell";

type RouteTimelineSelector = {
  key: string;
  selector: string;
  role: RouteTimelineSelectorRole;
};

type RouteTimelineEntry = {
  key: string;
  selector: string;
  role: RouteTimelineSelectorRole;
  firstAttachedAtMs: number | null;
  firstVisibleAtMs: number | null;
  hiddenAtMs: number | null;
  detachedAtMs: number | null;
  durationMs: number;
  episodeCount: number;
  appearedAfterNavigationStart: boolean;
};

type ScenarioRun = {
  run: number;
  durationMs: number;
  overlayVisible: boolean;
  parentFallbackSeen: boolean;
  sheetSkeletonEpisodes: number;
  overlayDurationMs: number;
  sheetContentVisibleAtMs: number | null;
  skeletonTimeline: RouteTimelineEntry[];
  rscRequestCount: number;
  finalPathname: string;
};

type ScenarioResult = {
  scenario: string;
  from: string;
  expectedPathname: string;
  networkProfile: string;
  runs: ScenarioRun[];
  failures: Array<{ run: number; message: string }>;
  medianMs: number | null;
  overlayVisibilityRate: number;
  rscRequestCount: number;
};

const collapsedSidebarIconPosition = { x: 24, y: 16 };
const ROUTE_TIMELINE_SELECTORS: RouteTimelineSelector[] = [
  {
    key: "estimateSheetRouteSkeleton",
    selector: "[data-testid='estimate-sheet-route-skeleton']",
    role: "sheet-skeleton",
  },
  {
    key: "projectEstimatesListSkeleton",
    selector: "[data-testid='project-estimates-list-skeleton']",
    role: "parent-fallback",
  },
  {
    key: "projectWorkspaceFallback",
    selector: "[aria-label='Loading project workspace']",
    role: "parent-fallback",
  },
  {
    key: "projectDashboardFallback",
    selector: "[aria-label='Loading project dashboard']",
    role: "parent-fallback",
  },
  {
    key: "workshopFallback",
    selector: "[aria-label='Loading workspace']",
    role: "parent-fallback",
  },
  {
    key: "routeOverlay",
    selector: "[data-route-overlay]",
    role: "overlay",
  },
  {
    key: "sheetContent",
    selector: "[data-estimate-center-column='sheet']",
    role: "sheet-content",
  },
  {
    key: "workshopShell",
    selector: "[data-workshop-page-shell-root]",
    role: "shell",
  },
];

function getHrefSelector(href: string) {
  return `a[href="${href.replaceAll('"', '\\"')}"]`;
}

async function clickHref(page: Page, href: string, position?: { x: number; y: number }) {
  const selector = getHrefSelector(href);
  const link = page.locator(`${selector}:visible`).first();
  await link.waitFor({ state: "visible", timeout: 15_000 });
  await link.scrollIntoViewIfNeeded().catch(() => undefined);
  await link.click(position ? { position, noWaitAfter: true } : { noWaitAfter: true });
}

async function hoverHref(page: Page, href: string) {
  const selector = getHrefSelector(href);
  const link = page.locator(`${selector}:visible`).first();
  await link.waitFor({ state: "visible", timeout: 15_000 });
  await link.scrollIntoViewIfNeeded().catch(() => undefined);
  await link.hover();
  await page.waitForTimeout(300);
}

async function clickLibraryTab(page: Page, name: "Overview" | "Components" | "Templates") {
  const tab = page
    .getByRole("tablist", { name: "Library sections" })
    .getByRole("tab", { name, exact: true });
  await tab.waitFor({ state: "visible", timeout: 15_000 });
  await tab.scrollIntoViewIfNeeded().catch(() => undefined);
  await tab.click({ noWaitAfter: true });
}

async function warmRevisitTargetEstimate(page: Page) {
  await page.goto(new URL(HERO_ESTIMATE_PATH, BASE_URL).toString(), { waitUntil: "load" });
  await waitForRouteReady(page, HERO_ESTIMATE_PATH);
  await waitForEstimateSheetContent(page);
  await page.goto(new URL(HERO_ESTIMATES_PATH, BASE_URL).toString(), { waitUntil: "load" });
  await waitForRouteReady(page, HERO_ESTIMATES_PATH);
}

function targetsEstimateSheet(scenario: Scenario) {
  return scenario.expectedPathname === HERO_ESTIMATE_PATH;
}

async function waitForEstimateSheetContent(page: Page) {
  await page.locator("[data-estimate-center-column='sheet']").waitFor({ state: "visible", timeout: 15_000 });
}

const SCENARIOS: Scenario[] = [
  {
    name: "Public: Landing to Login",
    from: "/",
    expectedPathname: "/login",
    action: async (page) => {
      await page.locator('a[href="/login?next=/workshop/projects"]').first().click({ noWaitAfter: true });
    },
  },
  {
    name: "Public: About to Contact",
    from: "/about",
    expectedPathname: "/contact",
    action: async (page) => {
      await page.locator('a[href="/contact"]').first().click({ noWaitAfter: true });
    },
  },
  {
    name: "Public: Pricing to Contact",
    from: "/pricing",
    expectedPathname: "/contact",
    action: async (page) => {
      await page.locator('a[href="/contact"]').first().click({ noWaitAfter: true });
    },
  },
  {
    name: "Authenticated: Workshop to Projects",
    from: "/workshop",
    expectedPathname: "/workshop/projects",
    requiresAuth: true,
    clickPosition: collapsedSidebarIconPosition,
    action: async (page) => {
      await page.locator('a[href="/workshop/projects"]').first().click({ position: collapsedSidebarIconPosition, noWaitAfter: true });
    },
  },
  {
    name: "Authenticated: Workshop to Library",
    from: "/workshop",
    expectedPathname: "/workshop/library",
    requiresAuth: true,
    clickPosition: collapsedSidebarIconPosition,
    action: async (page) => {
      await page.locator('a[href="/workshop/library"]').first().click({ position: collapsedSidebarIconPosition, noWaitAfter: true });
    },
  },
  {
    name: "Authenticated Library: Overview to Components",
    from: "/workshop/library",
    expectedPathname: "/workshop/library/components",
    requiresAuth: true,
    action: async (page) => {
      await clickLibraryTab(page, "Components");
    },
  },
  {
    name: "Authenticated Library: Components to Templates",
    from: "/workshop/library/components",
    expectedPathname: "/workshop/library/templates",
    requiresAuth: true,
    action: async (page) => {
      await clickLibraryTab(page, "Templates");
    },
  },
  {
    name: "Authenticated Library: Templates to Overview",
    from: "/workshop/library/templates",
    expectedPathname: "/workshop/library",
    requiresAuth: true,
    action: async (page) => {
      await clickLibraryTab(page, "Overview");
    },
  },
  {
    name: "Authenticated: Workshop to Templates",
    from: "/workshop",
    expectedPathname: "/workshop/templates",
    requiresAuth: true,
    clickPosition: collapsedSidebarIconPosition,
    action: async (page) => {
      await page.locator('a[href="/workshop/templates"]').first().click({ position: collapsedSidebarIconPosition, noWaitAfter: true });
    },
  },
  {
    name: "Authenticated: Workshop to Settings",
    from: "/workshop",
    expectedPathname: "/workshop/settings",
    requiresAuth: true,
    clickPosition: collapsedSidebarIconPosition,
    action: async (page) => {
      await page.locator('a[href="/workshop/settings"]').first().click({ position: collapsedSidebarIconPosition, noWaitAfter: true });
    },
  },
  {
    name: "Authenticated Hero: Workshop to Projects",
    from: "/workshop",
    expectedPathname: "/workshop/projects",
    requiresAuth: true,
    clickPosition: collapsedSidebarIconPosition,
    action: async (page) => {
      await clickHref(page, "/workshop/projects", collapsedSidebarIconPosition);
    },
  },
  {
    name: "Authenticated Hero: Projects to Target Project",
    from: "/workshop/projects",
    expectedPathname: HERO_PROJECT_PATH,
    requiresAuth: true,
    action: async (page) => {
      await clickHref(page, HERO_PROJECT_PATH);
    },
  },
  {
    name: "Authenticated Hero: Target Project to Estimates",
    from: HERO_PROJECT_PATH,
    expectedPathname: HERO_ESTIMATES_PATH,
    requiresAuth: true,
    action: async (page) => {
      await clickHref(page, HERO_ESTIMATES_PATH);
    },
  },
  {
    name: "Authenticated Hero: Estimates to Target Estimate",
    from: HERO_ESTIMATES_PATH,
    expectedPathname: HERO_ESTIMATE_PATH,
    requiresAuth: true,
    action: async (page) => {
      await clickHref(page, HERO_ESTIMATE_PATH);
    },
  },
  {
    name: "Authenticated Target: Cold Direct Target Estimate",
    from: "/",
    expectedPathname: HERO_ESTIMATE_PATH,
    requiresAuth: true,
    disableWarmup: true,
    action: async (page) => {
      await page.goto(new URL(HERO_ESTIMATE_PATH, BASE_URL).toString(), { waitUntil: "domcontentloaded" });
    },
  },
  {
    name: "Authenticated Target: Estimates to Target Estimate No Hover",
    from: HERO_ESTIMATES_PATH,
    expectedPathname: HERO_ESTIMATE_PATH,
    requiresAuth: true,
    action: async (page) => {
      await clickHref(page, HERO_ESTIMATE_PATH);
    },
  },
  {
    name: "Authenticated Target: Estimates to Target Estimate Hover Prefetch",
    from: HERO_ESTIMATES_PATH,
    expectedPathname: HERO_ESTIMATE_PATH,
    requiresAuth: true,
    beforeAction: async (page) => {
      await hoverHref(page, HERO_ESTIMATE_PATH);
    },
    action: async (page) => {
      await clickHref(page, HERO_ESTIMATE_PATH);
    },
  },
  {
    name: "Authenticated Target: Estimates to Target Estimate Warm Revisit",
    from: HERO_ESTIMATES_PATH,
    expectedPathname: HERO_ESTIMATE_PATH,
    requiresAuth: true,
    beforeAction: async (page) => {
      await warmRevisitTargetEstimate(page);
    },
    action: async (page) => {
      await clickHref(page, HERO_ESTIMATE_PATH);
    },
  },
];

function getMedian(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? null;
}

async function emulateNetworkProfile(page: Page, preset: NetworkPreset) {
  if (preset.download <= 0) return null;

  const client = await page.context().newCDPSession(page);
  await client.send("Network.enable");
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    downloadThroughput: preset.download,
    uploadThroughput: preset.upload,
    latency: preset.latency,
  });
  return client;
}

function getAuthMode() {
  if (process.env.PLAYWRIGHT_STORAGE_STATE) return "storage-state";
  if (DEV_AUTH_BYPASS_ENABLED) return "dev-auth-bypass";
  return "none";
}

function assertDevAuthBypassLocalOnly() {
  if (!DEV_AUTH_BYPASS_ENABLED) return;
  const { hostname } = new URL(BASE_URL);
  if (LOCAL_DEV_AUTH_HOSTS.has(hostname.toLowerCase())) return;

  throw new Error(
    [
      "Refusing to attach the dev-auth bypass cookie to a non-local BASE_URL.",
      "Use PLAYWRIGHT_STORAGE_STATE for remote benchmarks, or run dev-auth bypass only against localhost/loopback.",
    ].join(" "),
  );
}

async function addDevAuthBypassCookie(context: BrowserContext) {
  if (!DEV_AUTH_BYPASS_ENABLED || !DEV_AUTH_BYPASS_SECRET) return;
  const baseUrl = new URL(BASE_URL);
  await context.addCookies([
    {
      name: DEV_AUTH_BYPASS_COOKIE,
      value: DEV_AUTH_BYPASS_SECRET,
      url: baseUrl.origin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

function installRouteTransitionTimelineCapture(selectors: RouteTimelineSelector[]) {
  type MutableTimelineEntry = RouteTimelineEntry & {
    attachedNow: boolean;
    visibleNow: boolean;
    visibleStartedAtMs: number | null;
    accumulatedVisibleMs: number;
  };
  type RouteTimelineController = {
    reset: () => void;
    read: () => RouteTimelineEntry[];
    stop: () => void;
  };
  type RouteTimelineWindow = Window & {
    __routeTransitionTimeline?: RouteTimelineController;
  };

  const routeWindow = window as RouteTimelineWindow;
  let startedAt = performance.now();
  let observer: MutationObserver | null = null;
  let intervalId: number | null = null;
  let entries = new Map<string, MutableTimelineEntry>();

  const nowMs = () => performance.now() - startedAt;

  const createEntry = (config: RouteTimelineSelector): MutableTimelineEntry => ({
    key: config.key,
    selector: config.selector,
    role: config.role,
    firstAttachedAtMs: null,
    firstVisibleAtMs: null,
    hiddenAtMs: null,
    detachedAtMs: null,
    durationMs: 0,
    episodeCount: 0,
    appearedAfterNavigationStart: false,
    attachedNow: false,
    visibleNow: false,
    visibleStartedAtMs: null,
    accumulatedVisibleMs: 0,
  });

  const isVisible = (element: Element) => {
    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  const toPublicEntry = (entry: MutableTimelineEntry): RouteTimelineEntry => {
    const durationMs =
      entry.visibleNow && entry.visibleStartedAtMs !== null
        ? entry.accumulatedVisibleMs + nowMs() - entry.visibleStartedAtMs
        : entry.accumulatedVisibleMs;
    return {
      key: entry.key,
      selector: entry.selector,
      role: entry.role,
      firstAttachedAtMs: entry.firstAttachedAtMs === null ? null : Math.round(entry.firstAttachedAtMs),
      firstVisibleAtMs: entry.firstVisibleAtMs === null ? null : Math.round(entry.firstVisibleAtMs),
      hiddenAtMs: entry.hiddenAtMs === null ? null : Math.round(entry.hiddenAtMs),
      detachedAtMs: entry.detachedAtMs === null ? null : Math.round(entry.detachedAtMs),
      durationMs: Math.round(durationMs),
      episodeCount: entry.episodeCount,
      appearedAfterNavigationStart: entry.appearedAfterNavigationStart,
    };
  };

  const scan = (treatCurrentDomAsBaseline = false) => {
    for (const config of selectors) {
      const entry = entries.get(config.key) ?? createEntry(config);
      const matches = Array.from(document.querySelectorAll(config.selector));
      const attachedNow = matches.length > 0;
      const visibleNow = matches.some((element) => isVisible(element));
      const elapsed = nowMs();

      if (treatCurrentDomAsBaseline) {
        entry.attachedNow = attachedNow;
        entry.visibleNow = visibleNow;
        entries.set(config.key, entry);
        continue;
      }

      if (attachedNow && !entry.attachedNow) {
        entry.firstAttachedAtMs ??= elapsed;
        entry.appearedAfterNavigationStart ||= elapsed > 0;
      }
      if (!attachedNow && entry.attachedNow) {
        entry.detachedAtMs = elapsed;
      }
      if (visibleNow && !entry.visibleNow) {
        entry.firstVisibleAtMs ??= elapsed;
        entry.visibleStartedAtMs = elapsed;
        entry.episodeCount += 1;
        entry.appearedAfterNavigationStart ||= elapsed > 0;
      }
      if (!visibleNow && entry.visibleNow) {
        entry.hiddenAtMs = elapsed;
        if (entry.visibleStartedAtMs !== null) {
          entry.accumulatedVisibleMs += elapsed - entry.visibleStartedAtMs;
        }
        entry.visibleStartedAtMs = null;
      }

      entry.attachedNow = attachedNow;
      entry.visibleNow = visibleNow;
      entries.set(config.key, entry);
    }
  };

  const stop = () => {
    observer?.disconnect();
    observer = null;
    if (intervalId !== null) window.clearInterval(intervalId);
    intervalId = null;
  };

  const reset = () => {
    stop();
    startedAt = performance.now();
    entries = new Map(selectors.map((selector) => [selector.key, createEntry(selector)]));
    scan(true);
    observer = new MutationObserver(() => scan());
    observer.observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["class", "style", "hidden", "aria-hidden", "aria-busy", "data-route-overlay"],
    });
    intervalId = window.setInterval(scan, 25);
  };

  routeWindow.__routeTransitionTimeline = {
    reset,
    read: () => {
      scan();
      return Array.from(entries.values()).map(toPublicEntry);
    },
    stop,
  };
  reset();
}

async function installRouteTransitionTimeline(context: BrowserContext) {
  await context.addInitScript({
    content: `(${installRouteTransitionTimelineCapture.toString()})(${JSON.stringify(ROUTE_TIMELINE_SELECTORS)});`,
  });
}

async function resetRouteTimeline(page: Page) {
  await page
    .evaluate(() => {
      const routeWindow = window as typeof window & {
        __routeTransitionTimeline?: { reset: () => void };
      };
      routeWindow.__routeTransitionTimeline?.reset();
    })
    .catch(() => undefined);
}

async function readRouteTimeline(page: Page): Promise<RouteTimelineEntry[]> {
  return page
    .evaluate(() => {
      const routeWindow = window as typeof window & {
        __routeTransitionTimeline?: { read: () => RouteTimelineEntry[]; stop: () => void };
      };
      const timeline = routeWindow.__routeTransitionTimeline?.read() ?? [];
      routeWindow.__routeTransitionTimeline?.stop();
      return timeline;
    })
    .catch(() => []);
}

function summarizeTimeline(skeletonTimeline: RouteTimelineEntry[]) {
  const parentFallbackSeen = skeletonTimeline.some(
    (entry) => entry.role === "parent-fallback" && entry.episodeCount > 0 && entry.appearedAfterNavigationStart,
  );
  const sheetSkeletonEpisodes = skeletonTimeline
    .filter((entry) => entry.role === "sheet-skeleton")
    .reduce((sum, entry) => sum + entry.episodeCount, 0);
  const overlayEntries = skeletonTimeline.filter((entry) => entry.role === "overlay");
  const overlayVisible = overlayEntries.some((entry) => entry.episodeCount > 0 && entry.appearedAfterNavigationStart);
  const overlayDurationMs = overlayEntries.reduce((sum, entry) => sum + entry.durationMs, 0);
  const sheetContentVisibleAtMs =
    skeletonTimeline
      .filter((entry) => entry.role === "sheet-content" && entry.firstVisibleAtMs !== null)
      .map((entry) => entry.firstVisibleAtMs as number)
      .sort((left, right) => left - right)[0] ?? null;

  return {
    overlayVisible,
    parentFallbackSeen,
    sheetSkeletonEpisodes,
    overlayDurationMs,
    sheetContentVisibleAtMs,
  };
}

export function sanitizeBenchmarkText(value: string) {
  const sanitized = value
    .replaceAll(HERO_PROJECT_ID, "{targetProjectId}")
    .replaceAll(HERO_ESTIMATE_NODE_ID, "{targetEstimateNodeId}")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, "{uuid}")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "{email}")
    .replace(
      /([?&](?:access_token|refresh_token|id_token|token|code|state|session|session_token|jwt|password|secret|apikey|api_key|key)=)[^&#\s)'"<>]+/gi,
      "$1{redacted}",
    )
    .replace(/\b(Authorization:\s*Bearer\s+)[^\s,;]+/gi, "$1{redacted}")
    .replace(/\b(Cookie|Set-Cookie):\s*[^;\n\r]+(?:;[^;\n\r=]+=[^;\n\r\s]+)*/gi, "$1: {redacted-cookie}")
    .replace(
      /\b(sb-[^=\s;]+|archestimator-dev-auth-bypass|supabase-auth-token|__Secure-[^=\s;]+|__Host-[^=\s;]+)=[^;\s]+/g,
      "$1={redacted-cookie}",
    )
    .replace(/\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, "{jwt}")
    .replace(/\/(?:private\/)?tmp\/[^\s"')<>]+/g, "/tmp/{redacted}")
    .replace(/\/var\/folders\/[^\s"')<>]+/g, "/var/folders/{redacted}")
    .replace(/\/Users\/[^\s"')<>]+/g, "/Users/{redacted}");
  return process.env.HERO_ESTIMATE_ID
    ? sanitized.replaceAll(process.env.HERO_ESTIMATE_ID, "{targetEstimateNodeId}")
    : sanitized;
}

function sanitizePathname(value: string) {
  const pathname = value.startsWith("http") ? new URL(value).pathname : value;
  return sanitizeBenchmarkText(pathname);
}

async function preflightBaseUrl() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7_500);
  try {
    await fetch(BASE_URL, { redirect: "manual", signal: controller.signal });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`BASE_URL preflight failed for ${BASE_URL}: ${message}`);
  } finally {
    clearTimeout(timeout);
  }
}

async function measureTransition(page: Page, scenario: Scenario, run: number): Promise<ScenarioRun> {
  await page.goto(new URL(scenario.from, BASE_URL).toString(), { waitUntil: "load" });
  await waitForRouteReady(page, scenario.from);
  await scenario.beforeAction?.(page);
  await resetRouteTimeline(page);

  const rscRequests = new Set<string>();
  const onRequest = (request: { url: () => string }) => {
    const url = request.url();
    if (url.includes("_rsc=")) rscRequests.add(url);
  };

  page.on("request", onRequest);

  const startedAt = Date.now();
  try {
    const targetPathReady = waitForPathname(page, scenario.expectedPathname);
    await Promise.all([targetPathReady, scenario.action(page)]);
    if (targetsEstimateSheet(scenario)) {
      await waitForEstimateSheetContent(page);
    }
    await settleAfterTransition(page);
    await page.waitForTimeout(100);
    const skeletonTimeline = await readRouteTimeline(page);
    const timelineSummary = summarizeTimeline(skeletonTimeline);

    return {
      run,
      durationMs: Date.now() - startedAt,
      ...timelineSummary,
      skeletonTimeline,
      rscRequestCount: rscRequests.size,
      finalPathname: sanitizePathname(new URL(page.url()).pathname),
    };
  } catch (error) {
    const message = sanitizeBenchmarkText(error instanceof Error ? error.message : String(error));
    throw new Error(`${message}; finalPathname=${sanitizePathname(new URL(page.url()).pathname)}`);
  } finally {
    page.off("request", onRequest);
  }
}

async function waitForPathname(page: Page, expectedPathname: string) {
  if (new URL(page.url()).pathname === expectedPathname) return;
  await page.waitForFunction((pathname) => window.location.pathname === pathname, expectedPathname, { timeout: 15_000 });
}

async function waitForRouteOverlayHidden(page: Page) {
  await page.locator("[data-route-overlay]").waitFor({ state: "hidden", timeout: 15_000 }).catch(() => undefined);
}

// Shared post-click readiness settle: waits for the route overlay to hide and,
// when enabled, for the network to go idle. Reused by both the measurement path
// and the warm-up so warm-up absorbs the exact same first-hit compilation tail.
async function settleAfterTransition(page: Page) {
  await waitForRouteOverlayHidden(page);
  if (WAIT_FOR_NETWORK_IDLE) {
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
  }
}

async function waitForRouteReady(page: Page, expectedPathname: string) {
  await waitForPathname(page, expectedPathname);
  await waitForRouteOverlayHidden(page);
}

function getContextOptions(): BrowserContextOptions {
  const contextOptions: BrowserContextOptions = {};
  if (process.env.PLAYWRIGHT_STORAGE_STATE) {
    contextOptions.storageState = process.env.PLAYWRIGHT_STORAGE_STATE;
  }
  return contextOptions;
}

async function createBenchmarkContext(browser: Browser) {
  const context = await browser.newContext(getContextOptions());
  await installRouteTransitionTimeline(context);
  await addDevAuthBypassCookie(context);
  return context;
}

async function warmScenario(browser: Browser, scenario: Scenario) {
  if (!WARM_ROUTES_BEFORE_MEASURE || scenario.disableWarmup) return;

  const context = await createBenchmarkContext(browser);
  const page = await context.newPage();
  try {
    await page.goto(new URL(scenario.from, BASE_URL).toString(), { waitUntil: "load" });
    await waitForRouteReady(page, scenario.from);
    await scenario.beforeAction?.(page);
    await Promise.all([waitForPathname(page, scenario.expectedPathname), scenario.action(page)]);
    if (targetsEstimateSheet(scenario)) {
      await waitForEstimateSheetContent(page);
    }
    await settleAfterTransition(page);
  } finally {
    await context.close();
  }
}

async function measureScenario(browser: Browser, scenario: Scenario, preset: NetworkPreset): Promise<ScenarioResult> {
  await warmScenario(browser, scenario);

  const context = await createBenchmarkContext(browser);
  const page = await context.newPage();
  const client = await emulateNetworkProfile(page, preset);
  const runs: ScenarioRun[] = [];
  const failures: ScenarioResult["failures"] = [];

  for (let run = 1; run <= RUNS; run += 1) {
    try {
      const result = await measureTransition(page, scenario, run);
      runs.push(result);
      console.log(
        [
          `   Run ${run}: ${result.durationMs}ms`,
          `overlay=${result.overlayVisible}`,
          `parentFallback=${result.parentFallbackSeen}`,
          `sheetEpisodes=${result.sheetSkeletonEpisodes}`,
          `overlayMs=${result.overlayDurationMs}`,
          `sheetContentMs=${result.sheetContentVisibleAtMs ?? "n/a"}`,
          `rsc=${result.rscRequestCount}`,
        ].join(", "),
      );
    } catch (error) {
      const message = sanitizeBenchmarkText(error instanceof Error ? error.message : String(error));
      failures.push({ run, message });
      console.error(`   Run ${run}: FAILED - ${message}`);
    }
  }

  await client?.detach().catch(() => undefined);
  await context.close();

  const durations = runs.map((result) => result.durationMs);
  const overlayVisibilityRate = runs.length === 0 ? 0 : runs.filter((result) => result.overlayVisible).length / runs.length;

  return {
    scenario: scenario.name,
    from: sanitizePathname(scenario.from),
    expectedPathname: sanitizePathname(scenario.expectedPathname),
    networkProfile: NETWORK_PROFILE,
    runs,
    failures,
    medianMs: getMedian(durations),
    overlayVisibilityRate,
    rscRequestCount: runs.reduce((sum, result) => sum + result.rscRequestCount, 0),
  };
}

async function main() {
  const preset = NETWORK_PRESETS[NETWORK_PROFILE];
  if (!preset) {
    console.error(`Unknown NETWORK_PROFILE: ${NETWORK_PROFILE}`);
    console.error(`Available: ${Object.keys(NETWORK_PRESETS).join(", ")}`);
    process.exit(1);
  }

  const filteredScenarios = SCENARIO_FILTER
    ? SCENARIOS.filter((scenario) => scenario.name.toLowerCase().includes(SCENARIO_FILTER))
    : SCENARIOS;
  const runnableScenarios = filteredScenarios.filter((scenario) => !scenario.requiresAuth || !SKIP_AUTHENTICATED);
  const skippedScenarios = filteredScenarios.filter((scenario) => scenario.requiresAuth && SKIP_AUTHENTICATED).map((scenario) => scenario.name);

  console.log("Archestimator route transition benchmark");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Network: ${NETWORK_PROFILE}`);
  console.log(`Runs per scenario: ${RUNS}`);
  console.log(`Warm routes before measure: ${WARM_ROUTES_BEFORE_MEASURE}`);
  if (SCENARIO_FILTER) {
    console.log(`Scenario filter: ${SCENARIO_FILTER}`);
  }
  if (skippedScenarios.length > 0) {
    console.log(`Skipping authenticated scenarios: ${skippedScenarios.join(", ")}`);
  }
  if (INCLUDE_AUTHENTICATED && skippedScenarios.some((name) => name.includes("Authenticated Hero") || name.includes("Authenticated Target"))) {
    console.error("Authenticated hero/target scenarios were skipped even though INCLUDE_AUTHENTICATED=1. Refusing misleading success.");
    process.exit(1);
  }
  if (runnableScenarios.length === 0) {
    console.error("No route-transition scenarios are runnable. Check SCENARIO_FILTER and authentication settings.");
    process.exit(1);
  }
  if (INCLUDE_AUTHENTICATED && getAuthMode() === "none") {
    console.warn("Authenticated scenarios requested without PLAYWRIGHT_STORAGE_STATE or dev-auth bypass secret; protected routes may fail.");
  }

  assertDevAuthBypassLocalOnly();
  await preflightBaseUrl();

  const browser = await chromium.launch({ headless: true });
  const results: ScenarioResult[] = [];

  try {
    for (const scenario of runnableScenarios) {
      console.log(`\nScenario: ${scenario.name}`);
      results.push(await measureScenario(browser, scenario, preset));
    }
  } finally {
    await browser.close();
  }

  console.log("\n| Scenario | Median (ms) | Overlay rate | RSC requests | Runs | Failures |");
  console.log("|----------|-------------|--------------|--------------|------|----------|");
  for (const result of results) {
    console.log(
      `| ${result.scenario} | ${result.medianMs ?? "n/a"} | ${result.overlayVisibilityRate.toFixed(2)} | ${result.rscRequestCount} | ${result.runs.length} | ${result.failures.length} |`,
    );
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    authMode: getAuthMode(),
    networkProfile: NETWORK_PROFILE,
    runsPerScenario: RUNS,
    waitForNetworkIdle: WAIT_FOR_NETWORK_IDLE,
    warmRoutesBeforeMeasure: WARM_ROUTES_BEFORE_MEASURE,
    scenarioFilter: SCENARIO_FILTER ?? null,
    skipAuthenticated: SKIP_AUTHENTICATED,
    skippedScenarios,
    targetPathClasses: {
      project: "targetProject",
      estimateNode: "targetEstimateNode",
      routes: [
        "/workshop",
        "/workshop/projects",
        sanitizePathname(HERO_PROJECT_PATH),
        sanitizePathname(HERO_ESTIMATES_PATH),
        sanitizePathname(HERO_ESTIMATE_PATH),
      ],
    },
    results,
  };

  if (OUTPUT_FILE) {
    writeFileSync(OUTPUT_FILE, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(`\nWrote benchmark JSON: ${OUTPUT_FILE}`);
  }

  console.log("\n--- JSON OUTPUT ---");
  console.log(JSON.stringify(payload, null, 2));

  if (results.some((result) => result.runs.length === 0 || result.failures.length > 0)) {
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
