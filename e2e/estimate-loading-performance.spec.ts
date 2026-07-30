import { expect, test, type Page, type TestInfo } from "@playwright/test";

import {
  ESTIMATE_LOADING_STAGE_NAMES,
  cellKey,
  collectEstimateBrowserSnapshot,
  type EstimateLoadingDimensions,
} from "../scripts/measure-estimate-loading";

const CLIENT_STAGES = ESTIMATE_LOADING_STAGE_NAMES.filter((stage) => stage.startsWith("estimate.client."));

async function installClientStageMarks(page: Page, offset: number) {
  await page.evaluate(
    ({ stages, startOffset }) => {
      performance.clearMarks();
      performance.clearMeasures();
      stages.forEach((stage, index) => performance.mark(stage, { startTime: startOffset + index + 1 }));
    },
    { stages: CLIENT_STAGES, startOffset: offset },
  );
}

async function attachJson(testInfo: TestInfo, name: string, value: unknown) {
  await testInfo.attach(name, {
    contentType: "application/json",
    body: Buffer.from(JSON.stringify(value, null, 2)),
  });
}

test.describe("estimate-loading browser measurement contract", () => {
  test("collects fixed client stages and navigation/resource bytes on a hard document load", async ({ page }, testInfo) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.setContent(
      "<main data-estimate-center-column='sheet'><button type='button'>Edit synthetic row</button></main>",
    );
    await expect(page.locator("[data-estimate-center-column='sheet'] button:enabled")).toBeVisible();
    await installClientStageMarks(page, 10);

    const snapshot = await collectEstimateBrowserSnapshot(page);
    const hardRefresh: EstimateLoadingDimensions = {
      runtime: "next-production",
      fixtureClass: "small",
      navigationKind: "hard-refresh",
      cacheState: "warm",
      prefetchState: "not-applicable",
    };
    const evidence = { dimensions: hardRefresh, cellKey: cellKey(hardRefresh), snapshot };
    await attachJson(testInfo, "estimate-loading-hard-refresh-contract.json", evidence);

    expect(snapshot.ttfbMs).not.toBeNull();
    expect(snapshot.jsBytes).toBeGreaterThanOrEqual(0);
    expect(Object.keys(snapshot.browserStages).sort()).toEqual([...CLIENT_STAGES].sort());
    expect(snapshot.browserStages["estimate.client.interactive"]).toBeGreaterThan(0);
    expect(evidence.cellKey).toContain(":hard-refresh:warm:not-applicable");
  });

  test("keeps client navigation/no-hover evidence in a distinct cell and rejects missing fixed marks", async ({ page }, testInfo) => {
    await page.goto("/features", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      performance.clearMarks();
      performance.clearMeasures();
      performance.clearResourceTimings();
      history.pushState({}, "", "/workshop/projects/synthetic/estimates/synthetic");
    });
    await page.setContent(
      "<main data-estimate-center-column='sheet'><input aria-label='Synthetic quantity' value='1'></main>",
    );
    await expect(page.locator("[data-estimate-center-column='sheet'] input:enabled")).toBeVisible();

    await page.evaluate((stages) => {
      stages
        .filter((stage) => stage !== "estimate.client.hydration")
        .forEach((stage, index) => performance.mark(stage, { startTime: index + 1 }));
    }, CLIENT_STAGES);
    const snapshot = await collectEstimateBrowserSnapshot(page);
    const clientNavigation: EstimateLoadingDimensions = {
      runtime: "next-production",
      fixtureClass: "small",
      navigationKind: "client-navigation",
      cacheState: "warm",
      prefetchState: "no-hover",
    };
    const missingStages = CLIENT_STAGES.filter((stage) => snapshot.browserStages[stage] === undefined);
    const evidence = { dimensions: clientNavigation, cellKey: cellKey(clientNavigation), missingStages, snapshot };
    await attachJson(testInfo, "estimate-loading-client-navigation-contract.json", evidence);

    expect(evidence.cellKey).toContain(":client-navigation:warm:no-hover");
    expect(evidence.cellKey).not.toContain(":hard-refresh:");
    expect(missingStages).toEqual(["estimate.client.hydration"]);
  });
});
