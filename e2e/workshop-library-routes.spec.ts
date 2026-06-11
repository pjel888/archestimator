import { expect, test } from "@playwright/test";

const devAuthEnabled = process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS === "1";

test.describe("unified library routes", () => {
  test.skip(!devAuthEnabled, "Requires ARCHESTIMATOR_DEV_AUTH_BYPASS=1 for an authenticated session.");

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
    await expect(tablist.getByRole("tab", { name: /Components/ })).toHaveAttribute("aria-selected", "true");

    await tablist.getByRole("tab", { name: /Templates/ }).click();
    await expect(page).toHaveURL(/\/workshop\/library\/templates$/);
    await expect(tablist.getByRole("tab", { name: /Templates/ })).toHaveAttribute("aria-selected", "true");

    await page.goBack();
    await expect(page).toHaveURL(/\/workshop\/library$/);
    await expect(tablist.getByRole("tab", { name: /Components/ })).toHaveAttribute("aria-selected", "true");
  });
});
