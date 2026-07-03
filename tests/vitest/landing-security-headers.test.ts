import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

describe("landing security headers", () => {
  it("applies CSP Report-Only to public marketing pages", async () => {
    const headers = await nextConfig.headers?.();

    expect(headers).toBeDefined();

    const sources = headers?.map((entry) => entry.source) ?? [];
    expect(sources).toEqual([
      "/",
      "/about",
      "/features",
      "/pricing",
      "/contact",
      "/share/:path*",
      "/api/share/:path*",
      "/workshop/:path*",
      "/invite/:path*",
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

  // T1.5 (finding F8 / gap G4): authed /workshop/* and token-bearing /invite/* now carry
  // the four hardening headers immediately; CSP is Report-Only first (D-9), not enforced yet.
  it("applies hardening headers to /workshop and /invite, with CSP Report-Only (not enforced)", async () => {
    const headers = await nextConfig.headers?.();

    expect(headers).toBeDefined();

    const sources = headers?.map((entry) => entry.source) ?? [];
    expect(sources).toContain("/workshop/:path*");
    expect(sources).toContain("/invite/:path*");

    for (const source of ["/workshop/:path*", "/invite/:path*"]) {
      const entry = headers?.find((header) => header.source === source);
      expect(entry, `${source} should have a header entry`).toBeDefined();

      const find = (key: string) => entry?.headers.find((header) => header.key === key)?.value;

      // Four mandatory hardening headers enforced immediately.
      expect(find("X-Frame-Options")).toBe("DENY");
      expect(find("Referrer-Policy")).toBe("no-referrer");
      expect(find("X-Content-Type-Options")).toBe("nosniff");
      expect(find("Strict-Transport-Security")).toBeDefined();
    }

    // CSP must be Report-Only on the app (NOT enforced) until the observation window passes (D-9).
    const workshop = headers?.find((entry) => entry.source === "/workshop/:path*");
    expect(workshop?.headers.some((header) => header.key === "Content-Security-Policy-Report-Only")).toBe(true);
    expect(workshop?.headers.some((header) => header.key === "Content-Security-Policy")).toBe(false);

    // Durable Object collaboration connects through same-origin Worker routes;
    // the Cloudflare-only app must not keep legacy Supabase Realtime allowances.
    const workshopCsp = workshop?.headers.find((header) => header.key === "Content-Security-Policy-Report-Only")?.value;
    expect(workshopCsp).toContain("connect-src 'self'");
    expect(workshopCsp).not.toContain("supabase.co");
  });
});
