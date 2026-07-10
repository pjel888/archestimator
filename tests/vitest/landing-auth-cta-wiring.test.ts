import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  hasBetterAuthSessionCookie,
  LANDING_AUTH_HINT_PATH,
} from "@/lib/landing/landing-auth-session-cookie";

const root = process.cwd();

describe("landing auth CTA wiring (AUTH-LAND / AUTH-ADV)", () => {
  it("AUTH-ADV-003: homepage stays force-static and does not hardcode logged-out CTAs", () => {
    const page = readFileSync(join(root, "src/app/page.tsx"), "utf8");

    expect(page).toContain('export const dynamic = "force-static"');
    expect(page).not.toContain("isLoggedIn={false}");
    expect(page).not.toContain("getLandingAuthState");
    expect(page).not.toMatch(/\bcookies\(\)/);
  });

  it("AUTH-LAND-002: landing-v3 detects session via client auth hint instead of a frozen false prop", () => {
    const landing = readFileSync(
      join(root, "src/components/landing-v3/ArchestimatorLandingPage.tsx"),
      "utf8",
    );

    expect(landing).toContain("useLandingAuthHint");
    expect(landing).toMatch(/isLoggedIn\s*=/);
  });

  it("AUTH-ADV-001/002: cookie helper fails closed for missing/empty/non-session cookies", () => {
    expect(hasBetterAuthSessionCookie([])).toBe(false);
    expect(hasBetterAuthSessionCookie([{ name: "better-auth.session_token", value: "" }])).toBe(false);
    expect(hasBetterAuthSessionCookie([{ name: "better-auth.state", value: "oauth" }])).toBe(false);
    expect(
      hasBetterAuthSessionCookie([{ name: "better-auth.session_token", value: "signed-session" }]),
    ).toBe(true);
    expect(
      hasBetterAuthSessionCookie([
        { name: "__Secure-better-auth.session_token", value: "signed-session" },
      ]),
    ).toBe(true);
  });

  it("exposes a private no-store landing auth-hint route for CDN-safe CTA upgrades", () => {
    const route = readFileSync(join(root, "src/app/api/landing/auth-hint/route.ts"), "utf8");

    expect(LANDING_AUTH_HINT_PATH).toBe("/api/landing/auth-hint");
    expect(route).toContain('Cache-Control": "private, no-cache, no-store');
    expect(route).toContain("hasBetterAuthSessionCookie");
    expect(route).not.toContain("createCloudflareBetterAuthForRequest");
    expect(route).not.toContain("getSession");
  });
});
