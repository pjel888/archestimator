import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

// Source-level contract for the workshop security headers (F14 / P3-2). The
// Teamspace plan's `appAndInviteHardening` block (which also covers /invite and
// HSTS via the shared hardening set) satisfies this finding; this test guards
// that /workshop keeps frame + sniff protection and a Report-Only (not enforced)
// CSP. Read as text rather than importing next.config.ts (which pulls
// @next/bundle-analyzer + next at test time).
const config = readFileSync(path.resolve(__dirname, "../../next.config.ts"), "utf8");

describe("workshop security headers (F14 / P3-2)", () => {
  it("adds a /workshop/:path* headers source", () => {
    expect(config).toContain('source: "/workshop/:path*"');
  });

  it("applies frame + nosniff hardening and a report-only (not enforced) CSP to /workshop", () => {
    const workshopBlockStart = config.indexOf('source: "/workshop/:path*"');
    expect(workshopBlockStart).toBeGreaterThan(-1);
    const workshopBlock = config.slice(workshopBlockStart, workshopBlockStart + 400);
    // Hardening (nosniff + DENY) rides in via the shared hardening header set.
    expect(workshopBlock).toContain("Content-Security-Policy-Report-Only");
    expect(workshopBlock).toContain("...shareHardeningHeaders");
    // The shared hardening set provides X-Frame-Options DENY + nosniff.
    expect(config).toContain('key: "X-Frame-Options", value: "DENY"');
    expect(config).toContain('key: "X-Content-Type-Options", value: "nosniff"');
  });

  it("wires the workshop/invite hardening into the returned headers array", () => {
    expect(config).toContain("appAndInviteHardening");
    expect(config).toContain("...appAndInviteHardening");
  });
});

describe("local next/image optimizer sources", () => {
  it("allows the project image API route to carry its dynamic storage path query", () => {
    expect(config).toContain("localPatterns: localImagePatterns");
    expect(config).toContain('pathname: "/api/projects/images"');
    expect(config).toContain("src/app/api/projects/images/route.ts");
  });

  it("keeps existing static local image folders queryless", () => {
    expect(config).toContain('pathname: "/component-thumbnails/**", search: ""');
    expect(config).toContain('pathname: "/landing/**", search: ""');
  });
});
