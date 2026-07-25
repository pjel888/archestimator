import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

const axeSource = readFileSync(
  path.join(process.cwd(), "node_modules/axe-core/axe.min.js"),
  "utf8",
);

const expectedWebKitReportOnlyCspDiagnostics = new Set([
  "The Content Security Policy directive 'frame-ancestors' is ignored when delivered in a report-only policy.",
  "The Content Security Policy 'default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms http://localhost:8400; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com https://*.clarity.ms; font-src 'self' data:; connect-src 'self' https://cloudflareinsights.com https://*.cloudflareinsights.com https://www.google-analytics.com https://region1.google-analytics.com https://www.clarity.ms https://*.clarity.ms http://localhost:8400' was delivered in report-only mode, but does not specify a 'report-to'; the policy will have no effect. Please either add a 'report-to' directive, or deliver the policy via the 'Content-Security-Policy' header.",
]);

function captureBrowserErrors(page: Page, browserName: string) {
  const expectedDiagnostics: string[] = [];
  const unexpectedErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() !== "error") return;

    const text = message.text();
    const formattedMessage = `console: ${text}`;
    if (
      browserName === "webkit" &&
      expectedWebKitReportOnlyCspDiagnostics.has(text)
    ) {
      expectedDiagnostics.push(formattedMessage);
      return;
    }
    unexpectedErrors.push(formattedMessage);
  });
  page.on("pageerror", (error) => {
    unexpectedErrors.push(`pageerror: ${error.message}`);
  });
  return { expectedDiagnostics, unexpectedErrors };
}

test.describe("root quality smoke", () => {
  test("renders the real product promise with no browser errors", async ({
    page,
    browserName,
  }) => {
    const browserErrors = captureBrowserErrors(page, browserName);
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });

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
    await page.goto("/", { waitUntil: "domcontentloaded" });
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
