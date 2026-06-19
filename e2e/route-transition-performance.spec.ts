import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Page, type TestInfo } from "@playwright/test";

type RouteTransitionBudgets = {
  publicRoute: {
    navigationDurationMs: number;
    resourceCount: number;
    scriptCount: number;
    nextAssetCount: number;
  };
  protectedRedirect: {
    navigationDurationMs: number;
    overlayCount: number;
  };
  slow3gPublicRoute: {
    navigationDurationMs: number;
  };
  slow3gPublicRouteTransition: {
    medianTransitionMs: number;
    overlayVisibilityRateMax: number;
  };
  publicRouteTransition: {
    medianTransitionMs: number;
    overlayVisibilityRateMax: number;
  };
  bfcache: {
    backForwardRestoreMs: number;
    overlayCount: number;
  };
  authenticatedWorkshopTransition: {
    transitionMs: number;
    prefetchRscRequestMin: number;
    overlayCount: number;
  };
};

type RouteMetricSnapshot = {
  href: string;
  navigation: {
    domContentLoaded: number;
    loadEventEnd: number;
    duration: number;
    transferSize: number;
    decodedBodySize: number;
  } | null;
  resources: {
    count: number;
    transferSize: number;
    scriptCount: number;
    rscCount: number;
    nextAssetCount: number;
    prefetchCount: number;
  };
};

type NetworkProfile = {
  downloadThroughput: number;
  uploadThroughput: number;
  latency: number;
};

const routeTransitionBudgets = JSON.parse(readFileSync(join(process.cwd(), "e2e/route-transition-performance-budgets.json"), "utf8")) as RouteTransitionBudgets;

const slow3gNetworkProfile: NetworkProfile = {
  downloadThroughput: (400 * 1024) / 8,
  uploadThroughput: (400 * 1024) / 8,
  latency: 400,
};

const hasDevAuthBypass = process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS === "1";
const hasDevAuthAdminDb = process.env.ARCHESTIMATOR_DEV_AUTH_ADMIN_DB === "1";
const hasStorageStateAuth = Boolean(process.env.PLAYWRIGHT_STORAGE_STATE);

async function collectRouteMetrics(page: Page): Promise<RouteMetricSnapshot> {
  return page.evaluate(() => {
    const [navigation] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];

    return {
      href: window.location.href,
      navigation: navigation
        ? {
            domContentLoaded: navigation.domContentLoadedEventEnd,
            loadEventEnd: navigation.loadEventEnd,
            duration: Math.max(navigation.duration, navigation.domContentLoadedEventEnd),
            transferSize: navigation.transferSize,
            decodedBodySize: navigation.decodedBodySize,
          }
        : null,
      resources: {
        count: resources.length,
        transferSize: resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
        scriptCount: resources.filter((entry) => entry.initiatorType === "script" || /\.m?js($|\?)/i.test(entry.name)).length,
        rscCount: resources.filter((entry) => entry.name.includes("_rsc=")).length,
        nextAssetCount: resources.filter((entry) => entry.name.includes("/_next/")).length,
        prefetchCount: resources.filter((entry) => entry.name.includes("prefetch") || entry.name.includes("_rsc=")).length,
      },
    };
  });
}

async function emulateNetworkProfile(page: Page, profile: NetworkProfile) {
  const client = await page.context().newCDPSession(page);
  await client.send("Network.enable");
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    downloadThroughput: profile.downloadThroughput,
    uploadThroughput: profile.uploadThroughput,
    latency: profile.latency,
  });
  return client;
}

async function attachMetrics(testInfo: TestInfo, name: string, metrics: unknown) {
  await testInfo.attach(name, {
    contentType: "application/json",
    body: Buffer.from(JSON.stringify(metrics, null, 2)),
  });
}

async function clickNamedLinkAndWaitForPath(page: Page, name: RegExp, targetPathname: string, timeout: number) {
  const link = page.getByRole("link", { name }).first();
  await expect(link).toBeVisible({ timeout: 15_000 });
  await Promise.all([
    page.waitForURL((url) => url.pathname === targetPathname, { timeout }),
    link.click(),
  ]);
}

function expectNavigationDuration(snapshot: RouteMetricSnapshot, budgetMs: number) {
  expect(snapshot.navigation).not.toBeNull();
  expect(snapshot.navigation?.duration ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(budgetMs);
}

function getMedian(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

test.describe("route transition performance evidence", () => {
  test.setTimeout(90_000);

  // Inject the dev-auth bypass cookie so the authed scenarios below reach
  // protected routes instead of redirecting to /login. The cookie is read by
  // src/proxy.ts (localhost only) and validated in src/lib/auth/dev-auth-gate.ts.
  test.beforeEach(async ({ page }) => {
    const bypassSecret = process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET;
    if (!hasDevAuthBypass || !bypassSecret) return;
    await page.context().addCookies([
      {
        name: "archestimator-dev-auth-bypass",
        value: bypassSecret,
        domain: "127.0.0.1",
        path: "/",
        httpOnly: false,
        sameSite: "Lax",
      },
    ]);
  });

  test("captures public route baseline metrics", async ({ page }, testInfo) => {
    const snapshots: RouteMetricSnapshot[] = [];

    for (const route of ["/", "/features", "/pricing"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(300);
      snapshots.push(await collectRouteMetrics(page));
      await page.evaluate(() => performance.clearResourceTimings());
    }

    await attachMetrics(testInfo, "public-route-baseline.json", snapshots);
    console.log("route-transition-public-baseline", JSON.stringify(snapshots));

    expect(snapshots).toHaveLength(3);
    for (const snapshot of snapshots) {
      expectNavigationDuration(snapshot, routeTransitionBudgets.publicRoute.navigationDurationMs);
      expect(snapshot.resources.count).toBeGreaterThan(0);
      expect(snapshot.resources.count).toBeLessThanOrEqual(routeTransitionBudgets.publicRoute.resourceCount);
      expect(snapshot.resources.scriptCount).toBeLessThanOrEqual(routeTransitionBudgets.publicRoute.scriptCount);
      expect(snapshot.resources.nextAssetCount).toBeLessThanOrEqual(routeTransitionBudgets.publicRoute.nextAssetCount);
    }
  });

  test("captures Slow 3G public-route budget evidence", async ({ page }, testInfo) => {
    const client = await emulateNetworkProfile(page, slow3gNetworkProfile);

    try {
      await page.goto("/features", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(300);

      const metrics = await collectRouteMetrics(page);
      await attachMetrics(testInfo, "slow-3g-public-route.json", metrics);
      console.log("route-transition-slow-3g-public", JSON.stringify(metrics));

      expectNavigationDuration(metrics, routeTransitionBudgets.slow3gPublicRoute.navigationDurationMs);
    } finally {
      await client.detach().catch(() => undefined);
    }
  });

  test("captures Slow 3G public link-transition medians and overlay visibility", async ({ page }, testInfo) => {
    const client = await emulateNetworkProfile(page, slow3gNetworkProfile);
    const transitionRuns: Array<{ from: string; to: string; durationMs: number; overlayVisible: boolean }> = [];

    try {
      for (let runIndex = 0; runIndex < 3; runIndex += 1) {
        await page.goto("/features", { waitUntil: "domcontentloaded" });
        const targetHref = "/pricing";
        const overlaySeen = page
          .locator("[data-route-overlay]")
          .waitFor({ state: "attached", timeout: 1000 })
          .then(() => true)
          .catch(() => false);
        const startedAt = Date.now();
        await clickNamedLinkAndWaitForPath(page, /^Pricing$/, targetHref, 30_000);
        await page.waitForTimeout(100);
        transitionRuns.push({
          from: "/features",
          to: targetHref,
          durationMs: Date.now() - startedAt,
          overlayVisible: await overlaySeen,
        });
      }

      const durations = transitionRuns.map((run) => run.durationMs);
      const evidence = {
        runs: transitionRuns,
        medianMs: getMedian(durations),
        overlayVisibilityRate: transitionRuns.filter((run) => run.overlayVisible).length / transitionRuns.length,
      };

      await attachMetrics(testInfo, "slow-3g-public-link-transition-medians.json", evidence);
      console.log("route-transition-slow-3g-public-link-medians", JSON.stringify(evidence));

      expect(evidence.medianMs).toBeLessThanOrEqual(routeTransitionBudgets.slow3gPublicRouteTransition.medianTransitionMs);
      expect(evidence.overlayVisibilityRate).toBeLessThanOrEqual(routeTransitionBudgets.slow3gPublicRouteTransition.overlayVisibilityRateMax);
    } finally {
      await client.detach().catch(() => undefined);
    }
  });

  test("captures Link-based public route transition medians and overlay visibility", async ({ page }, testInfo) => {
    const transitionRuns: Array<{ from: string; to: string; durationMs: number; overlayVisible: boolean }> = [];

    for (let runIndex = 0; runIndex < 5; runIndex += 1) {
      await page.goto("/features", { waitUntil: "domcontentloaded" });
      const targetHref = "/pricing";
      const overlaySeen = page
        .locator("[data-route-overlay]")
        .waitFor({ state: "attached", timeout: 1000 })
        .then(() => true)
        .catch(() => false);
      const startedAt = Date.now();
      await clickNamedLinkAndWaitForPath(page, /^Pricing$/, targetHref, 15_000);
      await page.waitForTimeout(100);
      const durationMs = Date.now() - startedAt;
      const overlayVisible = await overlaySeen;
      transitionRuns.push({
        from: "/features",
        to: targetHref,
        durationMs,
        overlayVisible,
      });
    }

    const durations = transitionRuns.map((run) => run.durationMs);
    const overlayVisibilityRate = transitionRuns.filter((run) => run.overlayVisible).length / transitionRuns.length;
    const evidence = {
      runs: transitionRuns,
      medianMs: getMedian(durations),
      overlayVisibilityRate,
    };

    await attachMetrics(testInfo, "public-link-transition-medians.json", evidence);
    console.log("route-transition-public-link-medians", JSON.stringify(evidence));

    expect(evidence.medianMs).toBeLessThanOrEqual(routeTransitionBudgets.publicRouteTransition.medianTransitionMs);
    expect(evidence.overlayVisibilityRate).toBeLessThanOrEqual(routeTransitionBudgets.publicRouteTransition.overlayVisibilityRateMax);
  });

  test("captures public back-forward cache restore evidence without stuck overlay", async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      const scopedWindow = window as Window & { __routeTransitionPageshowPersisted?: boolean[] };
      scopedWindow.__routeTransitionPageshowPersisted = [];
      window.addEventListener("pageshow", (event) => {
        const scopedWindow = window as Window & { __routeTransitionPageshowPersisted?: boolean[] };
        scopedWindow.__routeTransitionPageshowPersisted = [...(scopedWindow.__routeTransitionPageshowPersisted ?? []), event.persisted];
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.goto("/features", { waitUntil: "domcontentloaded" });
    const startedAt = Date.now();
    await page.goBack({ waitUntil: "domcontentloaded" });
    await page.waitForURL((url) => url.pathname === "/", { timeout: 5_000 }).catch(() => undefined);
    const restoreMs = Date.now() - startedAt;
    await page.waitForTimeout(100);

    const evidence = await page.evaluate(() => {
      const scopedWindow = window as Window & { __routeTransitionPageshowPersisted?: boolean[] };
      const navigationEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
      const pageshowPersisted = scopedWindow.__routeTransitionPageshowPersisted ?? [];
      return {
        href: window.location.href,
        navigationTypes: navigationEntries.map((entry) => entry.type),
        pageshowPersisted,
        bfcachePersisted: pageshowPersisted.some(Boolean),
        notRestoredReasons: navigationEntries.map((entry) => entry.notRestoredReasons ?? null),
      };
    });

    await expect(page.locator("[data-route-overlay]")).toHaveCount(routeTransitionBudgets.bfcache.overlayCount);
    await attachMetrics(testInfo, "public-bfcache-restore.json", { ...evidence, restoreMs });
    await testInfo.attach("public-bfcache-restore.png", {
      contentType: "image/png",
      body: await page.screenshot({ fullPage: false }),
    });
    console.log("route-transition-public-bfcache", JSON.stringify({ ...evidence, restoreMs }));

    expect(evidence.navigationTypes).toContain("back_forward");
    expect(restoreMs).toBeLessThanOrEqual(routeTransitionBudgets.bfcache.backForwardRestoreMs);
  });

  test("keeps protected redirect within the route performance budget", async ({ browser }, testInfo) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto("/workshop/projects", { waitUntil: "domcontentloaded" });

    try {
      await expect(page).toHaveURL(/\/login\?next=%2Fworkshop%2Fprojects/);
      await expect(page.locator("[data-route-overlay]")).toHaveCount(routeTransitionBudgets.protectedRedirect.overlayCount);

      const metrics = await collectRouteMetrics(page);
      await attachMetrics(testInfo, "protected-redirect-route-budget.json", metrics);
      console.log("route-transition-protected-redirect-budget", JSON.stringify(metrics));

      expectNavigationDuration(metrics, routeTransitionBudgets.protectedRedirect.navigationDurationMs);
    } finally {
      await context.close();
    }
  });

  test("captures authenticated transition budget and separates hover-prefetch evidence when auth is enabled", async ({ page }, testInfo) => {
    test.skip(
      !hasDevAuthBypass && !hasStorageStateAuth,
      "Requires ARCHESTIMATOR_DEV_AUTH_BYPASS=1 or PLAYWRIGHT_STORAGE_STATE with a real authenticated session.",
    );

    const rscRequests = new Set<string>();
    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("_rsc=")) rscRequests.add(url);
    });

    await page.goto("/workshop", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    await page.evaluate(() => performance.clearResourceTimings());
    rscRequests.clear();

    const projectsLink = page.locator('a[href="/workshop/projects"]').first();
    const collapsedSidebarIconPosition = { x: 24, y: 16 };
    await projectsLink.hover({ position: collapsedSidebarIconPosition });
    await page.waitForTimeout(250);
    const hoverRscRequests = [...rscRequests];
    const beforeClick = await collectRouteMetrics(page);
    rscRequests.clear();

    const transitionStartedAt = Date.now();
    await projectsLink.click({ position: collapsedSidebarIconPosition });
    await page.waitForURL(/\/workshop\/projects/);
    await page.waitForTimeout(300);
    const transitionMs = Date.now() - transitionStartedAt;
    const transitionRscRequests = [...rscRequests];
    const allRscRequests = [...new Set([...hoverRscRequests, ...transitionRscRequests])];

    await expect(page.locator("[data-route-overlay]")).toHaveCount(routeTransitionBudgets.authenticatedWorkshopTransition.overlayCount);
    const afterClick = await collectRouteMetrics(page);
    const hoverPrefetchNote = hoverRscRequests.length > 0
      ? "Hover prefetch RSC requests were observed before click."
      : "Hover prefetch RSC requests were not observed before click in this environment.";
    const evidence = {
      authMode: hasStorageStateAuth ? "storage-state" : "dev-auth",
      beforeClick,
      afterClick,
      hoverRscRequests,
      transitionRscRequests,
      allRscRequests,
      hoverPrefetchNote,
      transitionMs,
    };
    await attachMetrics(testInfo, "authenticated-hover-prefetch-and-transition-budget.json", evidence);
    console.log("route-transition-authenticated-hover-prefetch", JSON.stringify(evidence));

    expect(allRscRequests.length).toBeGreaterThanOrEqual(routeTransitionBudgets.authenticatedWorkshopTransition.prefetchRscRequestMin);
    expect(transitionMs).toBeLessThanOrEqual(routeTransitionBudgets.authenticatedWorkshopTransition.transitionMs);
  });

  test("records project-card and estimate-row hover-prefetch evidence when dev auth data is enabled", async ({ page }, testInfo) => {
    test.skip(
      !(hasDevAuthBypass && hasDevAuthAdminDb) && !hasStorageStateAuth,
      "Requires dev-auth admin data or PLAYWRIGHT_STORAGE_STATE with seeded project/estimate data.",
    );

    const rscRequests = new Set<string>();
    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("_rsc=")) rscRequests.add(url);
    });

    await page.goto("/workshop/projects", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    const projectCardLinkSelector = `section[aria-label="Live projects"] article[data-project-card-view] a[href^="/workshop/projects/"]`;
    const projectCardLink = page.locator(projectCardLinkSelector).first();
    await expect(projectCardLink).toBeVisible();
    const projectHref = await projectCardLink.getAttribute("href");
    expect(projectHref).not.toBeNull();
    if (!projectHref) throw new Error("Project card link did not expose an href.");

    await projectCardLink.scrollIntoViewIfNeeded();
    await page.evaluate(() => performance.clearResourceTimings());
    rscRequests.clear();
    await projectCardLink.hover();
    await page.waitForTimeout(300);
    const projectCardHoverRscRequests = [...rscRequests];
    const projectCardHoverMetrics = await collectRouteMetrics(page);

    await page.goto(`${projectHref}/estimates`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    const estimateRowLinkSelector = `a[aria-label^="Open "][href^="/workshop/projects/"][href*="/estimates/"]`;
    const estimateRowLink = page.locator(estimateRowLinkSelector).first();
    await expect(estimateRowLink).toBeVisible();
    const estimateHref = await estimateRowLink.getAttribute("href");
    expect(estimateHref).not.toBeNull();
    if (!estimateHref) throw new Error("Estimate row link did not expose an href.");

    await estimateRowLink.scrollIntoViewIfNeeded();
    await page.evaluate(() => performance.clearResourceTimings());
    rscRequests.clear();
    await estimateRowLink.hover();
    await page.waitForTimeout(300);
    const estimateRowHoverRscRequests = [...rscRequests];
    const estimateRowHoverMetrics = await collectRouteMetrics(page);

    const evidence = {
      authMode: hasStorageStateAuth ? "storage-state" : "dev-auth",
      projectHref,
      estimateHref,
      projectCardHoverRscRequests,
      estimateRowHoverRscRequests,
      projectCardHoverMetrics,
      estimateRowHoverMetrics,
      projectCardHoverPrefetchNote: projectCardHoverRscRequests.length > 0
        ? "Project-card hover prefetch RSC requests were observed before click."
        : "Project-card hover prefetch RSC requests were not observed before click in this environment.",
      estimateRowHoverPrefetchNote: estimateRowHoverRscRequests.length > 0
        ? "Estimate-row hover prefetch RSC requests were observed before click."
        : "Estimate-row hover prefetch RSC requests were not observed before click in this environment.",
    };

    await attachMetrics(testInfo, "authenticated-project-estimate-hover-prefetch-evidence.json", evidence);
    console.log("route-transition-project-estimate-hover-prefetch", JSON.stringify(evidence));
  });
});
