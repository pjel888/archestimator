import { expect, test } from "@playwright/test";

import { getEstimatePerformanceRouteConfig } from "./helpers/estimate-sheet-performance";

const routeConfig = getEstimatePerformanceRouteConfig();
const hasAuth = Boolean(process.env.PLAYWRIGHT_STORAGE_STATE) || process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS === "1";
const enabled = hasAuth && routeConfig !== null;

test.describe("activity history accessibility", () => {
  test.skip(!enabled, "Requires authenticated estimate route IDs for dialog focus and reflow proof.");
  test.describe.configure({ mode: "serial", retries: 0 });

  test.beforeEach(async ({ page }) => {
    const bypassSecret = process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET;
    if (process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS !== "1" || !bypassSecret) return;

    await page.context().addCookies([
      {
        name: "archestimator-dev-auth-bypass",
        value: bypassSecret,
        domain: "127.0.0.1",
        path: "/",
        httpOnly: false,
        sameSite: "Lax",
      },
    ]);
  });

  for (const width of [320, 375, 768, 1280]) {
    test(`opens, returns focus, and reflows at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(routeConfig!.pathname, { waitUntil: "domcontentloaded" });
      if (/\/login(?:[/?#]|$)/u.test(new URL(page.url()).pathname)) {
        test.skip(true, "The reused local server does not have the authenticated fixture enabled.");
        return;
      }
      const opener = page.getByRole("button", { name: "Activity" });
      await expect(opener).toBeVisible();
      await opener.focus();
      await opener.click();

      const dialog = page.getByRole("dialog", { name: "Activity History" });
      await expect(dialog).toBeVisible();
      await expect(page.getByRole("button", { name: "Close Activity History" })).toBeFocused();
      await expect(dialog).toHaveCSS("overflow", "hidden");

      const viewport = page.viewportSize();
      const box = await dialog.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual((viewport?.width ?? width) + 1);

      const treeItems = dialog.getByRole("treeitem");
      if (await treeItems.count() > 1) {
        await treeItems.first().focus();
        await treeItems.first().press("ArrowDown");
        await expect(treeItems.nth(1)).toBeFocused();
      }

      await page.getByRole("button", { name: "Close Activity History" }).click();
      await expect(dialog).toHaveCount(0);
      await expect(opener).toBeFocused();
    });
  }
});
