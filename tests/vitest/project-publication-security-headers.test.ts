import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

describe("project publication security headers (Shared Link V2)", () => {
  it("applies the public CSP header policy to client publication pages", async () => {
    const headers = await nextConfig.headers?.();
    const shareHeaders = headers?.find((entry) => entry.source === "/share/:path*");

    expect(shareHeaders).toBeDefined();
    const csp = shareHeaders?.headers.find((header) => header.key === "Content-Security-Policy")?.value;
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain(
      "connect-src 'self' https://cloudflareinsights.com https://*.cloudflareinsights.com https://www.google-analytics.com https://region1.google-analytics.com https://www.clarity.ms https://*.clarity.ms",
    );
    expect(csp).toContain("img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com https://*.clarity.ms");
    expect(csp).not.toContain("supabase.co");
    expect(csp).not.toContain("img-src *");
    expect(csp).not.toContain("img-src https:");
    expect(shareHeaders?.headers).toContainEqual({ key: "Cache-Control", value: "no-store" });

    // SEC-01/SEC-05: hardening headers on BOTH the share page and the share API.
    const expectedHardening = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "no-referrer" }, // SEC-01: no Referer leak of ?recipient=
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }, // SEC-05 HSTS
      { key: "X-Robots-Tag", value: "noindex, nofollow" }, // SEC-05 noindex
    ];

    expect(shareHeaders?.headers).toEqual(expect.arrayContaining(expectedHardening));

    const shareApiHeaders = headers?.find((entry) => entry.source === "/api/share/:path*");
    expect(shareApiHeaders?.headers).toEqual(expect.arrayContaining(expectedHardening));

    // SEC-01: the recipient token must never leak via Referer.
    expect(shareHeaders?.headers).not.toContainEqual({ key: "Referrer-Policy", value: "no-referrer-when-downgrade" });
    expect(shareApiHeaders?.headers).not.toContainEqual({ key: "Referrer-Policy", value: "no-referrer-when-downgrade" });
  });

  it("applies no-referrer hardening to workshop routes including Publisher", async () => {
    const headers = await nextConfig.headers?.();
    const workshopHeaders = headers?.find((entry) => entry.source === "/workshop/:path*");

    expect(workshopHeaders).toBeDefined();
    expect(workshopHeaders?.headers).toEqual(
      expect.arrayContaining([
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
      ]),
    );
    expect(workshopHeaders?.headers.find((header) => header.key === "Content-Security-Policy-Report-Only")?.value).toContain(
      "default-src 'self'",
    );
  });
});
