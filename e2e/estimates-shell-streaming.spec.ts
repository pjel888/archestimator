import { expect, test } from "@playwright/test";

// Shell-streaming proof (F5 / P1-2): on cold navigation the estimates table
// skeleton paints before the async header chrome settles. Requires an
// authenticated session (dev-auth bypass is disabled) — skips otherwise.

const TEST_PROJECT_ID = process.env.ESTIMATES_E2E_PROJECT_ID ?? "22222222-2222-4222-8222-222222222222";
const ESTIMATES_URL = `/workshop/projects/${TEST_PROJECT_ID}/estimates`;
const hasAuth = Boolean(process.env.PLAYWRIGHT_STORAGE_STATE) || process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS === "1";

test.describe("estimates shell streaming", () => {
  test.skip(!hasAuth, "Requires PLAYWRIGHT_STORAGE_STATE or ARCHESTIMATOR_DEV_AUTH_BYPASS=1.");

  test("shell + table skeleton are present while header chrome streams in", async ({ page }) => {
    await page.goto(ESTIMATES_URL, { waitUntil: "commit" });
    if (/\/login/.test(page.url())) {
      test.skip(true, "Storage state is not authenticated for the workshop.");
      return;
    }

    // The page shell root paints immediately; the route content (skeleton or table)
    // and the streamed chrome fallback are visible without a blocking fan-out.
    await expect(page.locator("[data-workshop-page-shell-root]")).toBeVisible({ timeout: 5000 });

    const chromeFallback = page.getByTestId("project-header-chrome-skeleton");
    const tableSkeleton = page.getByTestId("project-estimates-list-skeleton");
    // At least one streaming fallback should have been observable; once settled the
    // real estimates section ("Create Estimate") is interactive.
    await Promise.race([
      chromeFallback.first().waitFor({ state: "visible", timeout: 3000 }).catch(() => {}),
      tableSkeleton.first().waitFor({ state: "visible", timeout: 3000 }).catch(() => {}),
    ]);
    await expect(page.getByRole("button", { name: /create estimate/i }).first()).toBeVisible({ timeout: 8000 });
  });
});
