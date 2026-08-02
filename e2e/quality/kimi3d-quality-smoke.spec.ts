import { expect, test } from "@playwright/test";

import { captureBrowserErrors } from "./browser-errors";

test.describe("Kimi3d quality smoke", () => {
  test("renders its main content without browser errors or horizontal overflow", async ({
    page,
    browserName,
  }) => {
    const browserErrors = captureBrowserErrors(page, browserName);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const response = await page.goto("/kimi3d", {
      waitUntil: "networkidle",
    });

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: /build with/i })).toBeVisible();
    await expect(page.locator("main#main")).toBeVisible();

    const widths = await page.evaluate(() => ({
      content: Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
      ),
      viewport: document.documentElement.clientWidth,
    }));
    expect(widths.content).toBeLessThanOrEqual(widths.viewport + 1);
    expect(
      browserErrors.unexpectedErrors,
      `Expected diagnostics: ${browserErrors.expectedDiagnostics.join("\n")}`,
    ).toEqual([]);
  });
});
