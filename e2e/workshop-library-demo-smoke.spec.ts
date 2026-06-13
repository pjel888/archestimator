import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Page, type TestInfo } from "@playwright/test";

const demoSmokeEnabled = process.env.ARCHESTIMATOR_E2E_LIBRARY_DEMO_SMOKE === "1";
const devAuthEnabled = process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS === "1";
const artifactDir = process.env.ARCHESTIMATOR_LIBRARY_DEMO_SMOKE_DIR;

type SmokeResult = {
  route: string;
  url: string;
  screenshot: string;
  checkedLabels: string[];
  capturedAt: string;
};

async function captureProof(page: Page, testInfo: TestInfo, name: string, result: Omit<SmokeResult, "screenshot" | "capturedAt">) {
  const screenshot = `${name}.png`;
  const body = await page.screenshot({ fullPage: true });

  if (artifactDir) {
    mkdirSync(artifactDir, { recursive: true });
    await page.screenshot({ fullPage: true, path: join(artifactDir, screenshot) });
    writeFileSync(
      join(artifactDir, `${name}.json`),
      JSON.stringify(
        {
          ...result,
          screenshot,
          capturedAt: new Date().toISOString(),
        } satisfies SmokeResult,
        null,
        2,
      ),
    );
  }

  await testInfo.attach(screenshot, {
    contentType: "image/png",
    body,
  });
}

test.describe("workshop component and template library demo smoke", () => {
  test.skip(!demoSmokeEnabled || !devAuthEnabled, "Requires ARCHESTIMATOR_E2E_LIBRARY_DEMO_SMOKE=1 and dev auth.");

  test("captures component library search, trust fields, and navigation tree proof", async ({ page }, testInfo) => {
    await page.goto("/workshop/library", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Component library workspace" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Component table" })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Search component table" })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Search component library tree" })).toBeVisible();
    await expect(page.getByLabel("Component table result count")).toContainText(/\d/);
    await expect(page.locator("[data-component-catalogue-card-id]").first()).toBeVisible();
    await expect(page.getByText(/^Source:/).first()).toBeVisible();
    await expect(page.getByText(/^Checked /).first()).toBeVisible();

    const search = page.getByRole("searchbox", { name: "Search component table" });
    await search.fill("wood");
    await expect(page.getByLabel("Component table result count")).toContainText(/\d/);
    await search.clear();

    await captureProof(page, testInfo, "component-library-demo-smoke-2026-06-02", {
      route: "/workshop/library",
      url: page.url(),
      checkedLabels: [
        "Library",
        "Component library workspace",
        "Search component table",
        "Search component library tree",
        "Component table result count",
        "Source",
        "Checked",
      ],
    });
  });

  test("captures template library preview and tree proof", async ({ page }, testInfo) => {
    await page.goto("/workshop/templates", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Templates" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Template library workspace" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Template content" })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Search template content" })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Search template library tree" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "All Templates" })).toBeVisible();
    await expect(page.getByText(/\d+ of \d+ templates/)).toBeVisible();
    await expect(page.getByText("Structure").first()).toBeVisible();
    await expect(page.getByText("Sample rows").first()).toBeVisible();

    const firstTemplate = page.locator("[data-template-library-tree-item-id]").first();
    await expect(firstTemplate).toBeVisible();
    await firstTemplate.click();
    await expect(page.locator("[aria-label$='template preview']").first()).toBeVisible();

    await captureProof(page, testInfo, "template-library-demo-smoke-2026-06-02", {
      route: "/workshop/templates",
      url: page.url(),
      checkedLabels: [
        "Templates",
        "Template library workspace",
        "Search template content",
        "Search template library tree",
        "All Templates",
        "Structure",
        "Sample rows",
      ],
    });
  });
});
