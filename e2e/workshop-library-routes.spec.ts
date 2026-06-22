import { randomUUID } from "node:crypto";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const devAuthEnabled = process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS === "1";
const devAdminDbEnabled = process.env.ARCHESTIMATOR_DEV_AUTH_ADMIN_DB === "1";
const devAuthSecret = process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET?.trim();
const devAuthEmail = process.env.ARCHESTIMATOR_DEV_AUTH_EMAIL?.trim().toLowerCase();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const denseBrowserProofEnabled = process.env.ARCHESTIMATOR_E2E_LIBRARY_DENSE_PROOF === "1";
const densePerfProofEnabled = process.env.ARCHESTIMATOR_E2E_LIBRARY_DENSE_PERF === "1";
const denseFixtureRowCount = readPositiveInteger(process.env.ARCHESTIMATOR_E2E_LIBRARY_DENSE_ROWS, 500);
const densePerfSampleCount = readPositiveInteger(process.env.ARCHESTIMATOR_E2E_LIBRARY_DENSE_PERF_SAMPLES, 3);
const densePerfBudgets = {
  denseToggleMedianMs: 500,
  searchNarrowMedianMs: 100,
  searchRestoreMedianMs: 500,
};

const devAuthReady = devAuthEnabled && Boolean(devAuthSecret);
const denseProofReady = Boolean(
  denseBrowserProofEnabled &&
    devAuthReady &&
    devAdminDbEnabled &&
    devAuthEmail &&
    supabaseUrl &&
    serviceRoleKey,
);
const denseEvidenceRoot = ".ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/_evidence/phase-5/dense-mode";
const glassEvidenceRoot = ".ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/_evidence/phase-1/glass-shell";
const denseFixtureMarker = "phase-5-dense-browser-proof";

type FixtureWorkspace = {
  workspaceId: string;
  userId: string;
};

type DenseFixtureRow = {
  id: string;
  name: string;
};

type NumericSummary = {
  samples: number[];
  median: number;
  p95: number;
  min: number;
  max: number;
};

type CapturedResponse = {
  url: string;
  method: string;
  resourceType: string;
  status: number;
  contentType: string | null;
  bodyBytes: number | null;
  error?: string;
};

function readPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function createAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase service-role env is required for dense browser proof.");
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function readBaseURL(testInfo: TestInfo) {
  const configuredBaseURL = testInfo.project.use.baseURL;
  if (typeof configuredBaseURL === "string") return configuredBaseURL;
  const port = process.env.PLAYWRIGHT_PORT ?? "3020";
  return `http://127.0.0.1:${port}`;
}

function getCookieUrls(baseURL: string) {
  const urls = [baseURL];
  const parsed = new URL(baseURL);
  if (parsed.hostname === "127.0.0.1") {
    urls.push(`${parsed.protocol}//localhost${parsed.port ? `:${parsed.port}` : ""}`);
  }
  if (parsed.hostname === "localhost") {
    urls.push(`${parsed.protocol}//127.0.0.1${parsed.port ? `:${parsed.port}` : ""}`);
  }
  return Array.from(new Set(urls));
}

async function installDevAuthCookie(page: Page, testInfo: TestInfo) {
  if (!devAuthSecret) return;
  await page.context().addCookies(
    getCookieUrls(readBaseURL(testInfo)).map((url) => ({
      name: "archestimator-dev-auth-bypass",
      value: devAuthSecret,
      url,
      httpOnly: true,
      sameSite: "Lax" as const,
      expires: Math.floor(Date.now() / 1000) + 60 * 60,
    })),
  );
}

async function ensureFixtureWorkspace(admin: SupabaseClient): Promise<FixtureWorkspace> {
  if (!devAuthEmail) throw new Error("ARCHESTIMATOR_DEV_AUTH_EMAIL is required for dense browser proof.");

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, email, default_workspace_id")
    .eq("email", devAuthEmail)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile) throw new Error(`No profile found for ${devAuthEmail}.`);
  if (profile.default_workspace_id) return { workspaceId: profile.default_workspace_id, userId: profile.id };

  const { data: workspace, error: workspaceError } = await admin
    .from("workspaces")
    .insert({ name: "Library dense proof workspace", slug: null, created_by: profile.id })
    .select("id")
    .single();
  if (workspaceError) throw workspaceError;

  const { error: profileUpdateError } = await admin
    .from("profiles")
    .update({ default_workspace_id: workspace.id })
    .eq("id", profile.id);
  if (profileUpdateError) throw profileUpdateError;

  return { workspaceId: workspace.id, userId: profile.id };
}

async function cleanupDenseFixtureRows(admin: SupabaseClient, workspaceId: string) {
  const { error } = await admin
    .from("cost_library_items")
    .delete()
    .eq("workspace_id", workspaceId)
    .contains("metadata", { e2eFixture: denseFixtureMarker });
  if (error) throw error;
}

async function seedDenseFixtureRows(admin: SupabaseClient, workspace: FixtureWorkspace, runId: string): Promise<DenseFixtureRow[]> {
  const rows = Array.from({ length: denseFixtureRowCount }, (_, index) => {
    const id = randomUUID();
    const rowNumber = String(index + 1).padStart(4, "0");
    const supplierIndex = (index % 5) + 1;
    const brandIndex = (index % 7) + 1;
    const lifecycleState = index % 11 === 0 ? "discontinued" : "available";
    return {
      id,
      workspace_id: workspace.workspaceId,
      name: `Dense Proof ${runId} Component ${rowNumber}`,
      description: `Disposable dense-mode proof row ${rowNumber}`,
      category: "Dense Proof",
      supplier: `Dense Supplier ${supplierIndex}`,
      brand: `Dense Brand ${brandIndex}`,
      unit: index % 2 === 0 ? "sqm" : "pc",
      unit_cost: 100 + index,
      misc_cost: index % 3 === 0 ? 12 : 0,
      pricing_source: `https://example.test/dense-proof/${rowNumber}`,
      pricing_date: "2026-06-22",
      confidence: index % 4 === 0 ? "quoted" : "catalog",
      lifecycle_state: lifecycleState,
      lifecycle_state_changed_at: "2026-06-22T00:00:00.000Z",
      lifecycle_state_changed_by: workspace.userId,
      current_version_number: 1,
      metadata: { e2eFixture: denseFixtureMarker, runId, rowNumber },
      created_by: workspace.userId,
    };
  });

  for (let start = 0; start < rows.length; start += 100) {
    const { error } = await admin.from("cost_library_items").insert(rows.slice(start, start + 100));
    if (error) throw error;
  }

  return rows.map((row) => ({ id: row.id, name: row.name }));
}

function readGitSha() {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function roundMs(value: number) {
  return Math.round(value * 100) / 100;
}

function summarizeDurations(values: number[]): NumericSummary {
  const sorted = [...values].sort((left, right) => left - right);
  const medianIndex = Math.floor(sorted.length / 2);
  const p95Index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  const median = sorted.length % 2 === 0
    ? ((sorted[medianIndex - 1] ?? 0) + (sorted[medianIndex] ?? 0)) / 2
    : (sorted[medianIndex] ?? 0);
  return {
    samples: values.map(roundMs),
    median: roundMs(median),
    p95: roundMs(sorted[p95Index] ?? 0),
    min: roundMs(sorted[0] ?? 0),
    max: roundMs(sorted[sorted.length - 1] ?? 0),
  };
}

async function writeJsonEvidence(
  page: Page,
  testInfo: TestInfo,
  name: string,
  metadata: Record<string, unknown>,
  evidenceRoot = denseEvidenceRoot,
) {
  const viewport = page.viewportSize();
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const baseName = `${name}-${testInfo.project.name}-${viewport?.width ?? "unknown"}x${viewport?.height ?? "unknown"}-${timestamp}`;
  const outputDir = join(process.cwd(), evidenceRoot);
  const metadataPath = join(outputDir, `${baseName}.json`);

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(
    metadataPath,
    `${JSON.stringify(
      {
        browser: testInfo.project.name,
        viewport,
        url: page.url(),
        flagState: {
          libraryDenseMode: process.env.NEXT_PUBLIC_LIBRARY_DENSE_MODE ?? null,
          libraryVirtualization: process.env.NEXT_PUBLIC_LIBRARY_VIRTUALIZATION_ENABLED ?? null,
        },
        captureHarness: "e2e/workshop-library-routes.spec.ts",
        gitCommit: readGitSha(),
        capturedAt: new Date().toISOString(),
        ...metadata,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  await testInfo.attach(`${baseName}.json`, {
    path: metadataPath,
    contentType: "application/json",
  });

  return {
    metadata: relative(process.cwd(), metadataPath),
  };
}

async function captureEvidence(
  page: Page,
  testInfo: TestInfo,
  name: string,
  metadata: Record<string, unknown>,
  evidenceRoot = denseEvidenceRoot,
) {
  const viewport = page.viewportSize();
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const baseName = `${name}-${testInfo.project.name}-${viewport?.width ?? "unknown"}x${viewport?.height ?? "unknown"}-${timestamp}`;
  const outputDir = join(process.cwd(), evidenceRoot);
  const screenshotPath = join(outputDir, `${baseName}.png`);
  const metadataPath = join(outputDir, `${baseName}.json`);

  mkdirSync(outputDir, { recursive: true });
  await page.screenshot({ path: screenshotPath, fullPage: false });
  writeFileSync(
    metadataPath,
    `${JSON.stringify(
      {
        browser: testInfo.project.name,
        viewport,
        url: page.url(),
        flagState: {
          libraryDenseMode: process.env.NEXT_PUBLIC_LIBRARY_DENSE_MODE ?? null,
          libraryVirtualization: process.env.NEXT_PUBLIC_LIBRARY_VIRTUALIZATION_ENABLED ?? null,
        },
        captureHarness: "e2e/workshop-library-routes.spec.ts",
        gitCommit: readGitSha(),
        capturedAt: new Date().toISOString(),
        ...metadata,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  await testInfo.attach(`${baseName}.png`, {
    path: screenshotPath,
    contentType: "image/png",
  });
  await testInfo.attach(`${baseName}.json`, {
    path: metadataPath,
    contentType: "application/json",
  });

  return {
    screenshot: relative(process.cwd(), screenshotPath),
    metadata: relative(process.cwd(), metadataPath),
  };
}

function shouldCaptureLibraryResponse(url: string, resourceType: string) {
  try {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith("/_next/static")) return false;
    if (/\.(?:css|js|map|png|jpg|jpeg|webp|gif|svg|ico|woff2?)$/i.test(parsed.pathname)) return false;
    return (
      parsed.pathname.includes("/workshop/library") ||
      parsed.searchParams.has("_rsc") ||
      resourceType === "fetch" ||
      resourceType === "xhr" ||
      resourceType === "document"
    );
  } catch {
    return false;
  }
}

function startLibraryResponseCapture(page: Page) {
  const responses: CapturedResponse[] = [];

  page.on("response", (response) => {
    const request = response.request();
    const resourceType = request.resourceType();
    if (!shouldCaptureLibraryResponse(response.url(), resourceType)) return;

    const contentLength = Number(response.headers()["content-length"]);
    responses.push({
      url: response.url(),
      method: request.method(),
      resourceType,
      status: response.status(),
      contentType: response.headers()["content-type"] ?? null,
      bodyBytes: Number.isFinite(contentLength) ? contentLength : null,
    });
  });

  return {
    async drain() {
      return responses;
    },
  };
}

async function waitForTwoAnimationFrames(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      }),
  );
}

async function waitForDenseRowDomCount(page: Page, count: number, timeoutMs = 15_000) {
  await page.waitForFunction(
    (expectedCount) => {
      const table = document.querySelector<HTMLElement>("[data-component-dense-table='true']");
      const domRowCount = document.querySelectorAll("[data-component-dense-row-id]").length;
      if (!table) return false;
      if (table.dataset.libraryVirtualizationActive === "true") {
        const totalCount = Number(table.dataset.libraryVirtualTotalCount ?? 0);
        const mountedCount = Number(table.dataset.libraryVirtualMountedCount ?? domRowCount);
        return totalCount === expectedCount && mountedCount > 0 && mountedCount <= expectedCount && domRowCount === mountedCount;
      }
      return domRowCount === expectedCount;
    },
    count,
    { timeout: timeoutMs },
  );
  await waitForTwoAnimationFrames(page);
}

async function readDenseTableState(page: Page) {
  return page.evaluate(() => {
    const table = document.querySelector<HTMLElement>("[data-component-dense-table='true']");
    const domRowCount = document.querySelectorAll("[data-component-dense-row-id]").length;
    const totalCount = Number(table?.dataset.libraryVirtualTotalCount ?? domRowCount);
    const mountedCount = Number(table?.dataset.libraryVirtualMountedCount ?? domRowCount);
    return {
      virtualActive: table?.dataset.libraryVirtualizationActive === "true",
      totalCount,
      mountedCount,
      domRowCount,
    };
  });
}

async function measurePageDuration(page: Page, name: string, action: () => Promise<void>, waitForStable: () => Promise<void>) {
  await page.evaluate((measureName) => {
    performance.clearMarks(`${measureName}:start`);
    performance.clearMarks(`${measureName}:end`);
    performance.clearMeasures(measureName);
    performance.mark(`${measureName}:start`);
  }, name);
  await action();
  await waitForStable();
  return page.evaluate((measureName) => {
    performance.mark(`${measureName}:end`);
    performance.measure(measureName, `${measureName}:start`, `${measureName}:end`);
    const measures = performance.getEntriesByName(measureName, "measure");
    return measures.at(-1)?.duration ?? 0;
  }, name);
}

async function collectDensePerfProof(page: Page, runId: string, initialDenseToggleMs: number | null) {
  const searchbox = page.getByRole("searchbox", { name: "Search components" });
  await expect(searchbox).toBeVisible({ timeout: 5_000 });

  const searchNarrowMs: number[] = [];
  const searchRestoreMs: number[] = [];

  for (let index = 0; index < densePerfSampleCount; index += 1) {
    searchNarrowMs.push(
      await measurePageDuration(
        page,
        `library-search-narrow-${index}`,
        async () => {
          await searchbox.fill(`Dense Proof ${runId} Component 0001`);
        },
        async () => {
          await waitForDenseRowDomCount(page, 1);
        },
      ),
    );

    searchRestoreMs.push(
      await measurePageDuration(
        page,
        `library-search-restore-${index}`,
        async () => {
          await searchbox.fill(`Dense Proof ${runId}`);
        },
        async () => {
          await waitForDenseRowDomCount(page, denseFixtureRowCount);
        },
      ),
    );
  }

  return {
    sampleCount: densePerfSampleCount,
    budgets: densePerfBudgets,
    denseToggleMs: initialDenseToggleMs === null ? null : summarizeDurations([initialDenseToggleMs]),
    searchNarrowMs: summarizeDurations(searchNarrowMs),
    searchRestoreMs: summarizeDurations(searchRestoreMs),
  };
}

test.describe("unified library routes", () => {
  test.skip(!devAuthReady, "Requires ARCHESTIMATOR_DEV_AUTH_BYPASS=1 and ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET for an authenticated session.");

  test.beforeEach(async ({ page }, testInfo) => {
    await installDevAuthCookie(page, testInfo);
  });

  test("redirects /workshop/templates to /workshop/library/templates", async ({ page }) => {
    await page.goto("/workshop/templates", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/workshop\/library\/templates$/);
  });

  test("redirects /workshop/components to /workshop/library", async ({ page }) => {
    await page.goto("/workshop/components", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/workshop\/library$/);
  });

  test("library tab strip navigates between components and templates", async ({ page }) => {
    await page.goto("/workshop/library", { waitUntil: "domcontentloaded" });

    const tablist = page.getByRole("tablist", { name: "Library sections" });
    await expect(tablist).toBeVisible();
    await expect(tablist.getByRole("tab", { name: /Overview/ })).toHaveAttribute("aria-selected", "true");

    await tablist.getByRole("tab", { name: /Components/ }).click();
    await expect(page).toHaveURL(/\/workshop\/library\/components$/);
    await expect(tablist.getByRole("tab", { name: /Components/ })).toHaveAttribute("aria-selected", "true");

    await tablist.getByRole("tab", { name: /Templates/ }).click();
    await expect(page).toHaveURL(/\/workshop\/library\/templates$/);
    await expect(tablist.getByRole("tab", { name: /Templates/ })).toHaveAttribute("aria-selected", "true");

    await page.goBack();
    await expect(page).toHaveURL(/\/workshop\/library\/components$/);
    await expect(tablist.getByRole("tab", { name: /Components/ })).toHaveAttribute("aria-selected", "true");
  });

  test("proves library glass shell arming and one-blur boundary", async ({ page }, testInfo) => {
    await page.goto("/workshop/library/components", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("region", { name: "Component library workspace" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator("[data-library-surface='glass']")).toBeVisible();
    await page.waitForFunction(() => document.documentElement.dataset.glass === "ready", null, {
      timeout: 3_000,
    });
    await page.waitForTimeout(260);

    const glassState = await page.evaluate(() => {
      const readFilter = (element: Element | null) => {
        if (!element) return null;
        const style = window.getComputedStyle(element);
        return style.backdropFilter || style.webkitBackdropFilter || "none";
      };
      const innerGlassSelectors = [
        ".estimate-glass-well",
        ".estimate-glass-rail",
        ".estimate-glass-paper",
        ".estimate-glass-chrome",
      ];
      const innerSurfaces = innerGlassSelectors.flatMap((selector) =>
        Array.from(document.querySelectorAll(selector)).map((element) => ({
          selector,
          filter: readFilter(element),
        })),
      );

      return {
        dataGlass: document.documentElement.dataset.glass ?? null,
        outerFilter: readFilter(document.querySelector("[data-workshop-workspace-surface]")),
        surfaceVariant: document.querySelector("[data-library-surface='glass']")?.getAttribute("data-library-surface") ?? null,
        innerSurfaces,
      };
    });

    expect(glassState.dataGlass).toBe("ready");
    expect(glassState.surfaceVariant).toBe("glass");
    expect(glassState.outerFilter).toMatch(/blur\(/);
    expect(
      glassState.innerSurfaces.filter((surface) => surface.filter && surface.filter !== "none"),
    ).toEqual([]);

    const evidence = await captureEvidence(
      page,
      testInfo,
      "library-phase1-glass-shell",
      {
        scenario: "ADV-VISUAL-GLASS Chromium shell arming and one-blur boundary",
        glassState,
        verdict: "pass",
      },
      glassEvidenceRoot,
    );

    console.log(JSON.stringify({ glassBrowserProof: evidence }, null, 2));
  });

  test("proves dense component table browser geometry and keyboard paths", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    test.skip(
      !denseProofReady,
      "Requires ARCHESTIMATOR_E2E_LIBRARY_DENSE_PROOF=1, dev auth admin DB bypass, service-role Supabase env, and dev auth email.",
    );

    const admin = createAdminClient();
    const workspace = await ensureFixtureWorkspace(admin);
    const runId = randomUUID().slice(0, 8);

    await cleanupDenseFixtureRows(admin, workspace.workspaceId);
    const fixtureRows = await seedDenseFixtureRows(admin, workspace, runId);
    const firstFixture = fixtureRows[0];
    if (!firstFixture) throw new Error("Dense fixture did not create any rows.");

    try {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto("/workshop/library/components", { waitUntil: "domcontentloaded" });

      await expect(page.getByRole("region", { name: "Component table" })).toBeVisible({ timeout: 20_000 });
      const searchToggle = page.getByRole("button", { name: "Show component table search" });
      await expect(searchToggle).toBeVisible({ timeout: 5_000 });
      await searchToggle.evaluate((button) => {
        (button as HTMLButtonElement).click();
      });
      const searchbox = page.getByRole("searchbox", { name: "Search components" });
      await expect(searchbox).toBeVisible({ timeout: 5_000 });
      await searchbox.fill(`Dense Proof ${runId}`);
      await page.keyboard.press("Escape");

      const table = page.getByRole("table", { name: "All Components dense component table" });
      const denseButton = page.getByRole("button", { name: "Dense", exact: true });
      await expect(denseButton).toBeVisible({ timeout: 5_000 });
      await denseButton.evaluate((button) => {
        (button as HTMLButtonElement).click();
      });
      await expect(table).toBeVisible({ timeout: 15_000 });
      await waitForDenseRowDomCount(page, denseFixtureRowCount);
      const denseTableState = await readDenseTableState(page);
      expect(denseTableState.totalCount).toBe(denseFixtureRowCount);
      expect(denseTableState.mountedCount).toBeGreaterThan(0);
      if (denseTableState.virtualActive) {
        expect(denseTableState.mountedCount).toBeLessThan(denseTableState.totalCount);
      } else {
        expect(denseTableState.mountedCount).toBe(denseFixtureRowCount);
      }

      for (const column of ["Select", "Actions"]) {
        await expect(table.getByRole("columnheader", { name: column })).toBeVisible();
      }
      for (const column of [
        "name",
        "folder",
        "supplier",
        "brand",
        "cost",
        "pricing source",
        "pricing date",
        "confidence",
        "lifecycle",
        "usage",
      ]) {
        await expect(table.getByRole("columnheader", { name: `Sort by ${column}` })).toBeVisible();
      }

      const scrollContainer = page.locator("[data-component-dense-scroll-container='true']");
      await expect(scrollContainer).toHaveAttribute("data-library-virtualization-source", "WORKSHOP_VIRTUALIZATION_FLAGS");
      await expect(scrollContainer).toHaveAttribute("data-library-virtualization-min-rows", "500");

      const firstRow = page.locator(`[data-component-dense-row-id="${firstFixture.id}"]`);
      await expect(firstRow).toBeVisible();
      await firstRow.focus();
      await page.keyboard.press("Space");
      await expect(firstRow.getByRole("checkbox", { name: `Select ${firstFixture.name} for archive` })).toBeChecked();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("region", { name: `Component details for ${firstFixture.name}` })).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`[?&]component=${firstFixture.id}`));

      const desktopEvidence = await captureEvidence(page, testInfo, "library-phase5-dense-table", {
        scenario: "ADV-DENSE-500 desktop dense table with keyboard Space/Enter path",
        rowCount: denseFixtureRowCount,
        denseTableState,
        verdict: "pass",
      });

      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.getByRole("region", { name: `Component details for ${firstFixture.name}` })).toBeVisible();

      const geometry = await page.evaluate(() => {
        const scroll = document.querySelector<HTMLElement>("[data-component-dense-scroll-container='true']");
        const dock = document.querySelector<HTMLElement>("[data-component-inspector-dock='true']");
        const scrollRect = scroll?.getBoundingClientRect();
        const dockRect = dock?.getBoundingClientRect();
        return {
          viewportWidth: window.innerWidth,
          documentScrollWidth: document.documentElement.scrollWidth,
          denseClientWidth: scroll?.clientWidth ?? null,
          denseScrollWidth: scroll?.scrollWidth ?? null,
          denseLeft: scrollRect?.left ?? null,
          denseRight: scrollRect?.right ?? null,
          dockLeft: dockRect?.left ?? null,
          dockRight: dockRect?.right ?? null,
        };
      });

      expect(geometry.documentScrollWidth).toBeLessThanOrEqual(geometry.viewportWidth + 2);
      expect(geometry.denseClientWidth).not.toBeNull();
      expect(geometry.denseScrollWidth).not.toBeNull();
      expect(geometry.denseScrollWidth ?? 0).toBeGreaterThan(geometry.denseClientWidth ?? 0);
      expect(geometry.denseLeft ?? -1).toBeGreaterThanOrEqual(0);
      expect(geometry.denseRight ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(geometry.viewportWidth + 2);
      expect(geometry.dockLeft ?? -1).toBeGreaterThanOrEqual(0);
      expect(geometry.dockRight ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(geometry.viewportWidth + 2);

      const mobileEvidence = await captureEvidence(page, testInfo, "library-phase5-dense-mobile", {
        scenario: "ADV-MOBILE-BROWSE mobile dense scroll containment and inspector geometry",
        rowCount: denseFixtureRowCount,
        geometry,
        verdict: "pass",
      });

      console.log(
        JSON.stringify(
          {
            denseBrowserProof: {
              desktopEvidence,
              mobileEvidence,
              rowCount: denseFixtureRowCount,
            },
          },
          null,
          2,
        ),
      );
    } finally {
      await cleanupDenseFixtureRows(admin, workspace.workspaceId);
    }
  });

  test("measures dense component table provider timing budgets", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    test.skip(
      !denseProofReady || !densePerfProofEnabled,
      "Requires dense browser proof env plus ARCHESTIMATOR_E2E_LIBRARY_DENSE_PERF=1.",
    );

    const admin = createAdminClient();
    const workspace = await ensureFixtureWorkspace(admin);
    const runId = randomUUID().slice(0, 8);
    const responseCapture = startLibraryResponseCapture(page);

    await cleanupDenseFixtureRows(admin, workspace.workspaceId);
    await seedDenseFixtureRows(admin, workspace, runId);

    try {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto("/workshop/library/components", { waitUntil: "domcontentloaded" });

      await expect(page.getByRole("region", { name: "Component table" })).toBeVisible({ timeout: 20_000 });
      const searchToggle = page.getByRole("button", { name: "Show component table search" });
      await expect(searchToggle).toBeVisible({ timeout: 5_000 });
      await searchToggle.evaluate((button) => {
        (button as HTMLButtonElement).click();
      });
      const searchbox = page.getByRole("searchbox", { name: "Search components" });
      await expect(searchbox).toBeVisible({ timeout: 5_000 });
      await searchbox.fill(`Dense Proof ${runId}`);

      const table = page.getByRole("table", { name: "All Components dense component table" });
      const denseButton = page.getByRole("button", { name: "Dense", exact: true });
      await expect(denseButton).toBeVisible({ timeout: 5_000 });
      const initialDenseToggleMs = await measurePageDuration(
        page,
        "library-dense-toggle-initial",
        async () => {
          await denseButton.evaluate((button) => {
            (button as HTMLButtonElement).click();
          });
        },
        async () => {
          await expect(table).toBeVisible({ timeout: 15_000 });
          await waitForDenseRowDomCount(page, denseFixtureRowCount);
        },
      );
      await expect(table).toBeVisible({ timeout: 15_000 });
      await waitForDenseRowDomCount(page, denseFixtureRowCount);

      const perfProof = await collectDensePerfProof(page, runId, initialDenseToggleMs);
      const capturedResponses = await responseCapture.drain();
      const resourceSummary = await page.evaluate(() => {
        const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
        return {
          count: resources.length,
          transferSize: resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
          decodedBodySize: resources.reduce((sum, entry) => sum + (entry.decodedBodySize || 0), 0),
          rscCount: resources.filter((entry) => entry.name.includes("_rsc=")).length,
          fetchCount: resources.filter((entry) => entry.initiatorType === "fetch").length,
        };
      });
      const budgetStatus = {
        denseToggleMedian: (perfProof.denseToggleMs?.median ?? Number.POSITIVE_INFINITY) <= densePerfBudgets.denseToggleMedianMs,
        searchNarrowMedian: perfProof.searchNarrowMs.median <= densePerfBudgets.searchNarrowMedianMs,
        searchRestoreMedian: perfProof.searchRestoreMs.median <= densePerfBudgets.searchRestoreMedianMs,
      };
      const perfEvidence = await writeJsonEvidence(page, testInfo, "library-phase5-dense-perf", {
        scenario: "ADV-DENSE-500 provider-backed Chromium dense timing proof",
        rowCount: denseFixtureRowCount,
        perfProof,
        resourceSummary,
        capturedResponses,
        budgetStatus,
        verdict: Object.values(budgetStatus).every(Boolean) ? "pass" : "fail",
      });

      expect(perfProof.denseToggleMs?.median ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(densePerfBudgets.denseToggleMedianMs);
      expect(perfProof.searchNarrowMs.median).toBeLessThanOrEqual(densePerfBudgets.searchNarrowMedianMs);
      expect(perfProof.searchRestoreMs.median).toBeLessThanOrEqual(densePerfBudgets.searchRestoreMedianMs);

      console.log(JSON.stringify({ densePerfProof: { ...perfEvidence, perfProof, rowCount: denseFixtureRowCount } }, null, 2));
    } finally {
      await cleanupDenseFixtureRows(admin, workspace.workspaceId);
    }
  });
});
