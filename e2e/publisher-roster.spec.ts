import { expect, test } from "@playwright/test";

import {
  hasPublisherAuthPrerequisites,
  installDevAuthCookie,
  publisherE2EEnabled,
} from "./publisher-e2e-helpers";

test.skip(!publisherE2EEnabled, "Set ARCHESTIMATOR_E2E_PUBLISHER=1 to run Publisher roster e2e.");
test.skip(!hasPublisherAuthPrerequisites(), "Provide dev-auth bypass or PLAYWRIGHT_STORAGE_STATE for an admin workspace user.");

test.beforeEach(async ({ page }, testInfo) => {
  await installDevAuthCookie(page, testInfo);
});

test("opens the Publisher roster and persists a status filter", async ({ page }) => {
  await page.goto("/workshop/publisher", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("heading", { name: "Publisher" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Publisher roster" })).toBeVisible();

  const staleTab = page.getByRole("tab", { name: "Stale" });
  await expect(staleTab).toBeVisible();
  await expect(async () => {
    await staleTab.click();
    await expect(page).toHaveURL(/\/workshop\/publisher\?status=stale/, { timeout: 2_500 });
  }).toPass({ timeout: 20_000 });
});
