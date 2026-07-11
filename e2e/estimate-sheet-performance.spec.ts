import { expect, test } from "@playwright/test";

import {
  attachEstimateSnapshot,
  collectEstimateBrowserSnapshot,
  getEstimatePerformanceRouteConfig,
  openEstimateSheet,
} from "./helpers/estimate-sheet-performance";

const routeConfig = getEstimatePerformanceRouteConfig();
const enabled = process.env.ESTIMATE_PERF_E2E === "1" && routeConfig !== null;

test.describe("estimate-sheet performance baseline", () => {
  test.skip(!enabled, "Set ESTIMATE_PERF_E2E=1 with ESTIMATE_PERF_PROJECT_ID and ESTIMATE_PERF_NODE_ID for the authenticated baseline");
  test.describe.configure({ mode: "serial", retries: 0 });

  test("captures a cold route and sheet-ready baseline", async ({ page }, testInfo) => {
    const snapshot = await openEstimateSheet(page, routeConfig!);
    await attachEstimateSnapshot(testInfo, "estimate-sheet-cold-baseline.json", snapshot);
    expect(snapshot.sheetVisible).toBe(true);
    expect(snapshot.treeReady).toBe(true);
    expect(snapshot.navigationMs).not.toBeNull();
  });

  test("captures a warm route baseline without arbitrary sleeps", async ({ page }, testInfo) => {
    await openEstimateSheet(page, routeConfig!);
    await page.reload({ waitUntil: "domcontentloaded" });
    const snapshot = await collectEstimateBrowserSnapshot(page);
    await attachEstimateSnapshot(testInfo, "estimate-sheet-warm-baseline.json", snapshot);
    expect(snapshot.sheetVisible).toBe(true);
    expect(snapshot.treeReady).toBe(true);
  });

  test("records mounted-row and mounted-branch census for the active window", async ({ page }, testInfo) => {
    const snapshot = await openEstimateSheet(page, routeConfig!);
    await attachEstimateSnapshot(testInfo, "estimate-sheet-mounted-census.json", snapshot);
    expect(snapshot.mountedRows).toBeGreaterThanOrEqual(0);
    expect(snapshot.mountedBranches).toBeGreaterThanOrEqual(0);
  });
});

