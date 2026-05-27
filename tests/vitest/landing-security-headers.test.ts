import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

describe("landing security headers", () => {
  it("applies CSP Report-Only to public marketing pages without covering workshop routes", async () => {
    const headers = await nextConfig.headers?.();

    expect(headers).toBeDefined();

    const sources = headers?.map((entry) => entry.source) ?? [];
    expect(sources).toEqual(["/", "/about", "/features", "/pricing", "/contact", "/share/:path*"]);
    expect(sources).not.toContain("/workshop/:path*");

    for (const entry of headers ?? []) {
      const reportOnly = entry.headers.find((header) => header.key === "Content-Security-Policy-Report-Only");
      expect(reportOnly?.value).toContain("default-src 'self'");
      expect(reportOnly?.value).toContain("frame-ancestors 'none'");
      expect(reportOnly?.value).toContain("https://www.googletagmanager.com");
      expect(reportOnly?.value).toContain("https://www.clarity.ms");
    }
  });
});
