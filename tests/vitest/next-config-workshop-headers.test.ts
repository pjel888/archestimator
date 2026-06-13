import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

// Source-level contract for the workshop security headers (F14 / P3-2). Read as
// text rather than importing next.config.ts (which pulls @next/bundle-analyzer +
// next at test time). The live header presence is confirmed in the browser
// Network tab per the plan.
const config = readFileSync(path.resolve(__dirname, "../../next.config.ts"), "utf8");

describe("workshop security headers (F14 / P3-2)", () => {
  it("adds a /workshop/:path* headers source", () => {
    expect(config).toContain('source: "/workshop/:path*"');
  });

  it("includes frame + nosniff hardening and a report-only CSP", () => {
    const workshopBlockStart = config.indexOf('source: "/workshop/:path*"');
    expect(workshopBlockStart).toBeGreaterThan(-1);
    const workshopBlock = config.slice(workshopBlockStart, workshopBlockStart + 600);
    expect(workshopBlock).toContain('key: "X-Frame-Options", value: "DENY"');
    expect(workshopBlock).toContain('key: "X-Content-Type-Options", value: "nosniff"');
    expect(workshopBlock).toContain('key: "Content-Security-Policy-Report-Only"');
    // Report-Only (not enforced) on the authenticated app — decision D6.
    expect(workshopBlock).not.toContain('key: "Content-Security-Policy",');
  });

  it("wires the workshop headers into the returned headers array", () => {
    expect(config).toContain("workshopHardeningHeaders");
    expect(config).toContain("...workshopHardeningHeaders");
  });
});
