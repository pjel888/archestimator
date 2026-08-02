import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { captureBrowserErrors } from "./browser-errors";

const axeSource = readFileSync(
  path.join(process.cwd(), "node_modules/axe-core/axe.min.js"),
  "utf8",
);

test.describe("root quality smoke", () => {
  test("renders the real product promise with no browser errors", async ({
    page,
    browserName,
  }) => {
    const browserErrors = captureBrowserErrors(page, browserName);
    const response = await page.goto("/", { waitUntil: "networkidle" });

    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { level: 1, name: /build with/i }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "Primary" })
        .or(page.getByRole("button", { name: "Menu" })),
    ).toBeVisible();
    await expect(page.locator("main#main")).toBeVisible();
    expect(
      browserErrors.unexpectedErrors,
      `Expected diagnostics: ${browserErrors.expectedDiagnostics.join("\n")}`,
    ).toEqual([]);
  });

  test("has no serious or critical automated accessibility violations and exposes a keyboard skip link", async ({
    page,
    browserName,
    isMobile,
  }) => {
    const browserErrors = captureBrowserErrors(page, browserName);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { level: 1, name: /build with/i }),
    ).toBeVisible();

    const skipLink = page.getByRole("link", { name: "Skip to content" });
    const supportsRealTabProof =
      !isMobile && (browserName === "chromium" || browserName === "firefox");
    if (supportsRealTabProof) {
      await page.keyboard.press("Tab");
    } else {
      await expect(skipLink).toHaveCount(1);
      await skipLink.focus();
    }
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toHaveAttribute("href", "#main");

    await page.addScriptTag({ content: axeSource });
    const violations = await page.evaluate(async () => {
      const axe = (
        window as unknown as {
          axe: {
            run(
              root: Document,
              options: {
                runOnly: {
                  type: "tag";
                  values: string[];
                };
              },
            ): Promise<{
              violations: Array<{
                id: string;
                impact: string | null;
                help: string;
                nodes: Array<{ target: string[] }>;
              }>;
            }>;
          };
        }
      ).axe;
      const results = await axe.run(document, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
        },
      });
      return results.violations
        .filter(
          (violation) =>
            violation.impact === "serious" || violation.impact === "critical",
        )
        .map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          help: violation.help,
          targets: violation.nodes.flatMap((node) => node.target),
        }));
    });

    expect(violations).toEqual([]);
    expect(
      browserErrors.unexpectedErrors,
      `Expected diagnostics: ${browserErrors.expectedDiagnostics.join("\n")}`,
    ).toEqual([]);
  });
});
