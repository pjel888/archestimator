import { readFileSync } from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLandingAuthState } from "@/lib/landing/get-landing-auth-state";

const cookiesMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

function withCookies(all: Array<{ name: string; value: string }>) {
  cookiesMock.mockResolvedValue({ getAll: () => all });
}

describe("landing auth state (display-only cookie hint)", () => {
  beforeEach(() => {
    cookiesMock.mockReset();
  });

  it("returns true when a Better Auth session cookie is present", async () => {
    withCookies([{ name: "better-auth.session_token", value: "signed-session" }]);
    await expect(getLandingAuthState()).resolves.toBe(true);
  });

  it("returns true for secure Better Auth session cookies", async () => {
    withCookies([{ name: "__Secure-better-auth.session_token", value: "signed-session" }]);
    await expect(getLandingAuthState()).resolves.toBe(true);
  });

  it("returns false for anonymous visitors with no auth cookie", async () => {
    withCookies([{ name: "archestimator_cookie_consent", value: "{}" }]);
    await expect(getLandingAuthState()).resolves.toBe(false);
  });

  it("ignores empty auth cookie values", async () => {
    withCookies([{ name: "better-auth.session_token", value: "" }]);
    await expect(getLandingAuthState()).resolves.toBe(false);
  });

  it("ignores Better Auth OAuth state cookies without a session", async () => {
    withCookies([
      { name: "__Secure-better-auth.state", value: "oauth-state" },
      { name: "better-auth.oauth_state", value: "oauth-state" },
    ]);
    await expect(getLandingAuthState()).resolves.toBe(false);
  });

  it("fails closed to logged-out state when cookie access throws", async () => {
    cookiesMock.mockRejectedValue(new Error("outside request scope"));
    await expect(getLandingAuthState()).resolves.toBe(false);
  });

  it("performs no Better Auth D1/network validation round-trip", () => {
    // Display-only contract: the helper must not import the Better Auth route
    // gate. Protected routes keep fail-closed server-side validation.
    const source = readFileSync(path.join(process.cwd(), "src/lib/landing/get-landing-auth-state.ts"), "utf8");
    expect(source).not.toContain("createCloudflareBetterAuthForRequest");
    expect(source).not.toContain("getCloudflareBetterAuthIdentityFromRequest");
    expect(source).not.toContain("@/lib/auth/cloudflare-better-auth-runtime");
  });
});
