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
    expect(csp).toContain("connect-src 'self' https://*.supabase.co wss://*.supabase.co");
    expect(csp).toContain("img-src 'self' data: blob: https://*.supabase.co");
    expect(csp).not.toContain("img-src *");
    expect(csp).not.toContain("img-src https:");

    const shareApiHeaders = headers?.find((entry) => entry.source === "/api/share/:path*");
    expect(shareApiHeaders?.headers).toEqual(
      expect.arrayContaining([
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "no-referrer-when-downgrade" },
      ]),
    );
  });
});
