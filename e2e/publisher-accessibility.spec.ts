import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import {
  createPublisherFixture,
  deletePublisherFixture,
  hasPublisherFixturePrerequisites,
  installDevAuthCookie,
  publisherE2EEnabled,
  type PublisherE2EFixture,
} from "./publisher-e2e-helpers";

const axeSourcePath = path.join(process.cwd(), "node_modules", "axe-core", "axe.min.js");

type AxeViolation = {
  id: string;
  impact: "minor" | "moderate" | "serious" | "critical" | null;
  help: string;
  nodes: Array<{
    failureSummary?: string;
    target: string[];
  }>;
};

type AxeResult = {
  violations: AxeViolation[];
};

declare global {
  interface Window {
    axe?: {
      run: (context?: unknown, options?: unknown) => Promise<AxeResult>;
    };
  }
}

async function readCriticalAxeViolations(page: Page) {
  await page.addScriptTag({ path: axeSourcePath });

  return page.evaluate(async () => {
    if (!window.axe) throw new Error("axe-core did not load.");

    const result = await window.axe.run(document, {
      resultTypes: ["violations"],
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
      },
    });

    return result.violations
      .filter((violation) => violation.impact === "critical")
      .map((violation) => ({
        help: violation.help,
        id: violation.id,
        nodes: violation.nodes.map((node) => ({
          failureSummary: node.failureSummary,
          target: node.target,
        })),
      }));
  });
}

test.describe("Publisher accessibility smoke", () => {
  test.setTimeout(120_000);
  test.skip(!publisherE2EEnabled, "Set ARCHESTIMATOR_E2E_PUBLISHER=1 to run Publisher accessibility e2e.");
  test.skip(
    !hasPublisherFixturePrerequisites(),
    "Requires dev-auth or storage state plus ARCHESTIMATOR_DEV_AUTH_EMAIL and service-role Supabase env.",
  );

  test.beforeEach(async ({ page }, testInfo) => {
    await installDevAuthCookie(page, testInfo);
  });

  test("has no critical axe violations and supports keyboard drawer open/close", async ({ page }) => {
    let fixture: PublisherE2EFixture | null = null;

    try {
      fixture = await createPublisherFixture("publisher-accessibility-e2e");
      await page.goto(`/workshop/publisher?project=${fixture.projectId}`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "Publisher" })).toBeVisible();

      const row = page.locator(`[data-publisher-roster-row="${fixture.projectId}"]`);
      await expect(row, "Publisher fixture row should appear in the filtered roster.").toBeVisible({ timeout: 20_000 });
      await expect(await readCriticalAxeViolations(page)).toEqual([]);

      const manageButton = row.getByRole("button", { name: `Manage publication for ${fixture.projectName}` });
      await manageButton.focus();
      await expect(manageButton).toBeFocused();
      await page.keyboard.press("Enter");

      const dialog = page.getByRole("dialog", { name: fixture.projectName });
      await expect(dialog).toBeVisible({ timeout: 20_000 });
      await expect(await readCriticalAxeViolations(page)).toEqual([]);
      await expect
        .poll(() => page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]'))))
        .toBe(true);

      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden({ timeout: 10_000 });
      await expect(manageButton).toBeFocused();
    } finally {
      await deletePublisherFixture(fixture);
    }
  });
});
