import { expect, test, type Page } from "@playwright/test";

const targetedProjects = new Set(["chromium", "iphone-se", "pixel-8-chrome"]);

function captureBrowserErrors(page: Page) {
  const unexpectedErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      unexpectedErrors.push(`console: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    unexpectedErrors.push(`pageerror: ${error.message}`);
  });
  return unexpectedErrors;
}

test.describe("Kimi3d quality smoke", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      !targetedProjects.has(testInfo.project.name),
      "Targeted desktop and mobile quality projects only.",
    );
  });

  test("renders its main content without browser errors or horizontal overflow", async ({
    page,
  }) => {
    const unexpectedErrors = captureBrowserErrors(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const response = await page.goto("/kimi3d", {
      waitUntil: "domcontentloaded",
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
    expect(unexpectedErrors).toEqual([]);
  });
});
