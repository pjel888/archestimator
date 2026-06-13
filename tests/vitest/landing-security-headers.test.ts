import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

describe("landing security headers", () => {
  it("applies CSP Report-Only to public marketing pages without covering workshop routes", async () => {
    const headers = await nextConfig.headers?.();

    expect(headers).toBeDefined();

    const sources = headers?.map((entry) => entry.source) ?? [];
    // Library Optimization Plan P3 T18 (F20): /workshop now carries hardening headers
    // + a Report-Only CSP (previously it had none).
    expect(sources).toEqual([
      "/",
      "/about",
      "/features",
      "/pricing",
      "/contact",
      "/share/:path*",
      "/api/share/:path*",
      "/workshop/:path*",
    ]);

    for (const entry of headers?.filter((header) => ["/", "/about", "/features", "/pricing", "/contact"].includes(header.source)) ?? []) {
      const reportOnly = entry.headers.find((header) => header.key === "Content-Security-Policy-Report-Only");
      expect(reportOnly?.value).toContain("default-src 'self'");
      expect(reportOnly?.value).toContain("frame-ancestors 'none'");
      expect(reportOnly?.value).toContain("https://www.googletagmanager.com");
      expect(reportOnly?.value).toContain("https://www.clarity.ms");
    }

    const sharePage = headers?.find((entry) => entry.source === "/share/:path*");
    expect(sharePage?.headers.some((header) => header.key === "Content-Security-Policy")).toBe(true);

    const shareApi = headers?.find((entry) => entry.source === "/api/share/:path*");
    expect(shareApi?.headers.some((header) => header.key === "X-Content-Type-Options")).toBe(true);
  });

  it("hardens /workshop routes with nosniff, frame-deny, referrer-policy, and Report-Only CSP (T18)", async () => {
    const headers = await nextConfig.headers?.();
    const workshop = headers?.find((entry) => entry.source === "/workshop/:path*");
    expect(workshop).toBeDefined();
    const keys = workshop?.headers.map((header) => header.key) ?? [];
    expect(keys).toContain("X-Content-Type-Options");
    expect(keys).toContain("X-Frame-Options");
    expect(keys).toContain("Referrer-Policy");
    expect(keys).toContain("Content-Security-Policy-Report-Only");
    // Report-Only (not enforced) so dynamic Next chunks / user content cannot break.
    expect(keys).not.toContain("Content-Security-Policy");
    expect(workshop?.headers.find((h) => h.key === "X-Frame-Options")?.value).toBe("DENY");
    expect(workshop?.headers.find((h) => h.key === "Referrer-Policy")?.value).toBe("same-origin");
  });
});
