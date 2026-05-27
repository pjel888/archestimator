import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

describe("project publication security headers", () => {
  it("applies the public CSP header policy to client publication pages", async () => {
    const headers = await nextConfig.headers?.();
    const shareHeaders = headers?.find((entry) => entry.source === "/share/:path*");

    expect(shareHeaders).toBeDefined();
    const csp = shareHeaders?.headers.find((header) => header.key === "Content-Security-Policy-Report-Only")?.value;
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("connect-src 'self' https://*.supabase.co wss://*.supabase.co");
    expect(csp).toContain("img-src 'self' data: blob: https://*.supabase.co");
    expect(csp).not.toContain("img-src *");
    expect(csp).not.toContain("img-src https:");
  });
});
