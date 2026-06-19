import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

describe("project location map CSP", () => {
  it("allows only the approved map host on workshop Report-Only CSP", async () => {
    const headers = await nextConfig.headers?.();
    const workshopHeaders = headers?.find((entry) => entry.source === "/workshop/:path*");
    const workshopCsp = workshopHeaders?.headers.find((header) => header.key === "Content-Security-Policy-Report-Only")?.value;

    expect(workshopCsp).toBeDefined();
    expect(workshopCsp).toContain("https://tiles.openfreemap.org");
    expect(workshopCsp).toContain("worker-src 'self' blob:");
    expect(workshopCsp).toContain("child-src 'self' blob:");
    expect(workshopCsp).toContain("img-src 'self' data: blob:");
    expect(workshopCsp).toContain("connect-src 'self' https://*.supabase.co wss://*.supabase.co");
    expect(workshopCsp).not.toContain("img-src *");
    expect(workshopCsp).not.toContain("img-src https:");
    expect(workshopCsp).not.toContain("connect-src *");
    expect(workshopCsp).not.toContain("tile.openstreetmap.org");
    expect(workshopCsp).not.toContain("mapbox");

    const shareHeaders = headers?.find((entry) => entry.source === "/share/:path*");
    const shareCsp = shareHeaders?.headers.find((header) => header.key === "Content-Security-Policy")?.value;
    expect(shareCsp).not.toContain("tiles.openfreemap.org");
    expect(shareCsp).not.toContain("worker-src 'self' blob:");
  });
});
