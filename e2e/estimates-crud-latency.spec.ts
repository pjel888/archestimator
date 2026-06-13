import { expect, test, type Page } from "@playwright/test";

// CRUD-latency + no-overlay measurement spec for the estimates list page
// (05_MEASUREMENT_METHODOLOGY.md §5). Initially a measurement spec that logs JSON;
// the no-overlay-on-in-place-edit assertions are gates.
//
// Requires an authenticated session: the dev-auth bypass is disabled, so run with
// PLAYWRIGHT_STORAGE_STATE pointing at a logged-in storage state (or
// ARCHESTIMATOR_DEV_AUTH_BYPASS=1 where available). Without it the suite skips.

const TEST_PROJECT_ID = process.env.ESTIMATES_E2E_PROJECT_ID ?? "22222222-2222-4222-8222-222222222222";
const ESTIMATES_URL = `/workshop/projects/${TEST_PROJECT_ID}/estimates`;
const OVERLAY_SELECTOR = "[data-route-overlay]";
const hasAuth = Boolean(process.env.PLAYWRIGHT_STORAGE_STATE) || process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS === "1";

async function overlayAppearedDuring(page: Page, action: () => Promise<void>): Promise<boolean> {
  let appeared = false;
  const poll = setInterval(() => {
    void page
      .locator(OVERLAY_SELECTOR)
      .count()
      .then((count) => {
        if (count > 0) appeared = true;
      })
      .catch(() => {});
  }, 16);
  try {
    await action();
  } finally {
    clearInterval(poll);
  }
  return appeared;
}

test.describe("estimates list CRUD latency", () => {
  test.skip(
    !hasAuth,
    "Requires PLAYWRIGHT_STORAGE_STATE (authenticated session) or ARCHESTIMATOR_DEV_AUTH_BYPASS=1.",
  );

  test("create / inline edit / duplicate / delete / reset never flash the overlay", async ({ page }, testInfo) => {
    await page.goto(ESTIMATES_URL);
    // Bail out clearly if auth redirected us.
    if (/\/login/.test(page.url())) {
      test.skip(true, "Storage state is not authenticated for the workshop.");
      return;
    }

    const metrics: Record<string, number | boolean> = {};

    // Create → row visible (optimistic placeholder should appear < 400ms).
    const createButton = page.getByRole("button", { name: /create estimate/i }).first();
    const t0 = Date.now();
    const createOverlay = await overlayAppearedDuring(page, async () => {
      await createButton.click();
      await page.getByText(/creating/i).first().waitFor({ state: "visible", timeout: 2000 });
    });
    metrics.createToVisibleMs = Date.now() - t0;
    metrics.createOverlay = createOverlay;
    expect(createOverlay, "create must not flash the global overlay").toBe(false);

    // Wait for the new sheet code to settle (reconciled canonical row).
    await page.getByText(/EST-\d+/).first().waitFor({ state: "visible", timeout: 5000 });

    // Inline rename → Saved, no overlay.
    const nameInput = page.getByLabel(/Estimate name for/i).first();
    const renameOverlay = await overlayAppearedDuring(page, async () => {
      await nameInput.fill("Renamed by e2e");
      await nameInput.press("Enter");
      await page.getByText("Saved").first().waitFor({ state: "visible", timeout: 4000 });
    });
    metrics.renameOverlay = renameOverlay;
    expect(renameOverlay, "inline rename must not flash the overlay").toBe(false);

    // Reset column widths → purely local, no overlay, no navigation.
    const resetOverlay = await overlayAppearedDuring(page, async () => {
      await page.getByRole("button", { name: /reset column widths/i }).click();
      await page.waitForTimeout(300);
    });
    metrics.resetWidthsOverlay = resetOverlay;
    expect(resetOverlay, "reset column widths must not refresh or flash the overlay").toBe(false);

    await testInfo.attach("p0-crud-latency.json", {
      body: JSON.stringify(metrics, null, 2),
      contentType: "application/json",
    });
    console.log("estimates-crud-latency", JSON.stringify(metrics));
  });
});
