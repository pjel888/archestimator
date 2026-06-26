import { expect, test } from "@playwright/test";

import {
  createPublisherFixture,
  deletePublisherFixture,
  hasPublisherFixturePrerequisites,
  installDevAuthCookie,
  openPublisherFixtureDrawer,
  publisherE2EEnabled,
  type PublisherE2EFixture,
} from "./publisher-e2e-helpers";

test.describe("Publisher access mode", () => {
  test.setTimeout(120_000);
  test.skip(!publisherE2EEnabled, "Set ARCHESTIMATOR_E2E_PUBLISHER=1 to run Publisher access-mode e2e.");
  test.skip(
    !hasPublisherFixturePrerequisites(),
    "Requires dev-auth or storage state plus ARCHESTIMATOR_DEV_AUTH_EMAIL and service-role Supabase env.",
  );

  test.beforeEach(async ({ page }, testInfo) => {
    await installDevAuthCookie(page, testInfo);
  });

  test("restricts a seeded estimate through the Publisher access drawer and restores inheritance", async ({ page }) => {
    let fixture: PublisherE2EFixture | null = null;

    try {
      fixture = await createPublisherFixture("publisher-access-mode-e2e");
      const { dialog } = await openPublisherFixtureDrawer(page, fixture);

      await dialog.getByRole("tab", { name: "Access" }).click();
      await expect(dialog.getByText("Project members", { exact: true })).toBeVisible({ timeout: 25_000 });
      await expect(dialog.getByText("Estimate access", { exact: true })).toBeVisible({ timeout: 25_000 });

      const accessMode = dialog.getByRole("combobox", { name: `Access mode for ${fixture.estimateName}` });
      await expect(accessMode).toBeEnabled({ timeout: 25_000 });
      await expect(accessMode).toContainText("Inherited", { timeout: 25_000 });

      await accessMode.click();
      await page.getByRole("option", { name: "Restricted" }).click();

      const confirmDialog = page.getByRole("dialog", { name: `Restrict ${fixture.estimateName}?` });
      await expect(confirmDialog).toBeVisible();
      await expect(confirmDialog).toContainText("Project members will stop inheriting access");
      await confirmDialog.getByRole("button", { name: "Restrict" }).click();

      await expect(dialog.getByText("Estimate access is now restricted.", { exact: true })).toBeVisible({ timeout: 20_000 });
      await expect(accessMode).toContainText("Restricted", { timeout: 20_000 });

      await accessMode.click();
      await page.getByRole("option", { name: "Inherited" }).click();

      await expect(dialog.getByText("Estimate now inherits project access.", { exact: true })).toBeVisible({ timeout: 20_000 });
      await expect(accessMode).toContainText("Inherited", { timeout: 20_000 });
    } finally {
      await deletePublisherFixture(fixture);
    }
  });
});
