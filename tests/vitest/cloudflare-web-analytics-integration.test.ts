import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const loader = readFileSync("src/components/landing/LandingAnalyticsLoader.tsx", "utf8");
const cloudflareComponent = readFileSync("src/components/landing/CloudflareWebAnalytics.tsx", "utf8");
const publicPageShell = readFileSync("src/components/landing/PublicPageShell.tsx", "utf8");
const rootLayout = readFileSync("src/app/layout.tsx", "utf8");
const sharePage = readFileSync("src/app/share/[token]/page.tsx", "utf8");
const nextConfig = readFileSync("next.config.ts", "utf8");

describe("Cloudflare Web Analytics integration", () => {
  it("loads Cloudflare Web Analytics only through the consent-gated public-page loader", () => {
    expect(loader).toContain('import { CloudflareWebAnalytics } from "./CloudflareWebAnalytics";');
    expect(loader).toContain("useLandingCookieConsent()");
    expect(loader).toContain("isBetaTelemetryProductionEnabled");
    expect(loader).toContain("process.env.NEXT_PUBLIC_BETA_TELEMETRY_ENABLED");
    expect(loader).toContain("if (!consent.analytics || !telemetryEnabled)");
    expect(loader).toContain("process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN");
    expect(loader).toContain("<CloudflareWebAnalytics token={cloudflareWebAnalyticsToken} />");
    expect(publicPageShell).toContain("<LandingAnalyticsLoader />");
  });

  it("uses the Cloudflare beacon snippet shape without hard-coding the public token", () => {
    expect(cloudflareComponent).toContain('src="https://static.cloudflareinsights.com/beacon.min.js"');
    expect(cloudflareComponent).toContain('strategy="afterInteractive"');
    expect(cloudflareComponent).toContain("data-cf-beacon={JSON.stringify({ token: trimmedToken })}");
    expect(cloudflareComponent).not.toContain("0e1181131e76497d9d75a03cfcc461b4");
  });

  it("does not load Cloudflare Web Analytics globally or on tokenized share pages", () => {
    expect(rootLayout).not.toContain("CloudflareWebAnalytics");
    expect(rootLayout).not.toContain("static.cloudflareinsights.com");
    expect(sharePage).not.toContain("CloudflareWebAnalytics");
    expect(sharePage).not.toContain("static.cloudflareinsights.com");
    expect(sharePage).not.toContain("NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN");
  });

  it("keeps CSP source lists ready for the Cloudflare beacon endpoint", () => {
    expect(nextConfig).toContain("https://static.cloudflareinsights.com");
    expect(nextConfig).toContain("https://cloudflareinsights.com");
    expect(nextConfig).toContain("https://*.cloudflareinsights.com");
  });
});
