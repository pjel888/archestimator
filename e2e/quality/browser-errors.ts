import type { Page } from "@playwright/test";

const expectedWebKitReportOnlyCspDiagnostics = new Set([
  "The Content Security Policy directive 'frame-ancestors' is ignored when delivered in a report-only policy.",
  "The Content Security Policy 'default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms http://localhost:8400; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com https://*.clarity.ms; font-src 'self' data:; connect-src 'self' https://cloudflareinsights.com https://*.cloudflareinsights.com https://www.google-analytics.com https://region1.google-analytics.com https://www.clarity.ms https://*.clarity.ms http://localhost:8400' was delivered in report-only mode, but does not specify a 'report-to'; the policy will have no effect. Please either add a 'report-to' directive, or deliver the policy via the 'Content-Security-Policy' header.",
]);

export function captureBrowserErrors(page: Page, browserName: string) {
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
