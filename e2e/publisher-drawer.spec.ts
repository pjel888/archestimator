import { expect, test } from "@playwright/test";

import {
  createPublisherFixture,
  deletePublisherFixture,
  expectDrawerTab,
  hasPublisherFixturePrerequisites,
  installDevAuthCookie,
  openPublisherFixtureDrawer,
  publisherE2EEnabled,
  readFixtureAccountSecurityEvents,
  readFixtureClientLinkPath,
  type PublisherE2EFixture,
} from "./publisher-e2e-helpers";

test.describe("Publisher drawer", () => {
  test.setTimeout(120_000);
  test.skip(!publisherE2EEnabled, "Set ARCHESTIMATOR_E2E_PUBLISHER=1 to run Publisher drawer e2e.");
  test.skip(
    !hasPublisherFixturePrerequisites(),
    "Requires dev-auth or storage state plus ARCHESTIMATOR_DEV_AUTH_EMAIL and service-role Supabase env.",
  );

  test.beforeEach(async ({ page }, testInfo) => {
    await installDevAuthCookie(page, testInfo);
  });

  test("opens the seeded publication drawer and rotates the shared link with audit evidence", async ({ page }) => {
    let fixture: PublisherE2EFixture | null = null;

    try {
      fixture = await createPublisherFixture("publisher-drawer-e2e");
      const { dialog, row } = await openPublisherFixtureDrawer(page, fixture);

      await expect(row.getByRole("link", { name: `Open shared link for ${fixture.projectName}` })).toHaveAttribute(
        "href",
        fixture.oldClientLinkPath,
      );
      for (const tabName of ["Overview", "Recipients", "Sheets", "Access", "Settings", "Activity"]) {
        await expectDrawerTab(dialog, tabName);
      }

      await dialog.getByRole("tab", { name: "Settings" }).click();
      const newLinkButton = dialog.getByRole("button", { name: "New link" });
      await expect(newLinkButton).toBeEnabled({ timeout: 25_000 });
      await newLinkButton.click();
      await page
        .getByRole("dialog", { name: "Create a new shared link?" })
        .getByRole("button", { name: "Create new link" })
        .click();

      await expect.poll(() => readFixtureClientLinkPath(fixture!), { timeout: 30_000 }).not.toBe(fixture.oldClientLinkPath);
      await expect
        .poll(async () => (await readFixtureAccountSecurityEvents(fixture!)).length, { timeout: 30_000 })
        .toBeGreaterThan(0);

      await page.goto(fixture.oldClientLinkPath, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("main", { name: "Shared proposal unavailable" })).toBeVisible({ timeout: 20_000 });
    } finally {
      await deletePublisherFixture(fixture);
    }
  });
});
