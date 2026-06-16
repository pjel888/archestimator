import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

const routeErrorSmokeEnabled = process.env.ARCHESTIMATOR_E2E_ROUTE_ERROR_SMOKE === "1";
const devAuthEnabled = process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS === "1";
const devAuthAdminEnabled = process.env.ARCHESTIMATOR_DEV_AUTH_ADMIN_DB === "1";

async function expectSanitizedErrorState(page: import("@playwright/test").Page, routeLabel: string) {
  const alert = page.getByRole("alert").filter({ hasText: routeLabel }).first();

  await expect(alert).toBeVisible();
  await expect(alert).toContainText(routeLabel);
  await expect(page.getByRole("heading", { name: "This view could not load" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  await expect(alert).not.toContainText(/SQL|token|\/Users|private_tokens|stack/i);
}

async function captureRouteErrorScreenshot(page: import("@playwright/test").Page, testInfo: import("@playwright/test").TestInfo, name: string) {
  const body = await page.screenshot({ fullPage: false });
  const screenshotDir = process.env.ARCHESTIMATOR_ROUTE_ERROR_SCREENSHOT_DIR;

  if (screenshotDir) {
    mkdirSync(screenshotDir, { recursive: true });
    await page.screenshot({ fullPage: false, path: join(screenshotDir, name) });
  }

  await testInfo.attach(name, {
    contentType: "image/png",
    body,
  });
}

test.describe("workshop route error boundary smoke", () => {
  test.skip(!routeErrorSmokeEnabled || !devAuthEnabled, "Requires ARCHESTIMATOR_E2E_ROUTE_ERROR_SMOKE=1 and dev auth.");

  test("captures live library route error boundary screenshot", async ({ page }, testInfo) => {
    await page.goto("/workshop/library?routeErrorSmoke=1", { waitUntil: "domcontentloaded" });

    await expectSanitizedErrorState(page, "Library");
    await captureRouteErrorScreenshot(page, testInfo, "library-route-error-boundary.png");
  });

  test("captures live data and estimate route error boundary screenshots", async ({ page }, testInfo) => {
    test.skip(!devAuthAdminEnabled, "Requires ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 to use seeded project and estimate data.");

    await page.goto("/workshop/projects", { waitUntil: "domcontentloaded" });
    const projectCardLink = page.locator('section[aria-label="Live projects"] article[data-project-card-view] a[href^="/workshop/projects/"]').first();
    await expect(projectCardLink).toBeVisible();
    const projectHref = await projectCardLink.getAttribute("href");
    expect(projectHref).not.toBeNull();
    if (!projectHref) throw new Error("Project card link did not expose an href.");

    await page.goto(`${projectHref}/data?routeErrorSmoke=1`, { waitUntil: "domcontentloaded" });
    await expectSanitizedErrorState(page, "Project data");
    await captureRouteErrorScreenshot(page, testInfo, "project-data-route-error-boundary.png");

    await page.goto(`${projectHref}/estimates`, { waitUntil: "domcontentloaded" });
    const estimateRowLink = page.locator('a[aria-label^="Open "][href^="/workshop/projects/"][href*="/estimates/"]').first();
    await expect(estimateRowLink).toBeVisible();
    const estimateHref = await estimateRowLink.getAttribute("href");
    expect(estimateHref).not.toBeNull();
    if (!estimateHref) throw new Error("Estimate row link did not expose an href.");

    await page.goto(`${estimateHref}?routeErrorSmoke=1`, { waitUntil: "domcontentloaded" });
    await expectSanitizedErrorState(page, "Estimate workspace");
    await captureRouteErrorScreenshot(page, testInfo, "estimate-workspace-route-error-boundary.png");
  });
});
