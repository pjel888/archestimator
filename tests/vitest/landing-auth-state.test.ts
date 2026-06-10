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

  it("returns true when a Supabase auth cookie is present", async () => {
    withCookies([{ name: "sb-abcdefghijklmnop-auth-token", value: "base64-session" }]);
    await expect(getLandingAuthState()).resolves.toBe(true);
  });

  it("returns true for chunked Supabase auth cookies", async () => {
    withCookies([
      { name: "sb-abcdefghijklmnop-auth-token.0", value: "chunk-a" },
      { name: "sb-abcdefghijklmnop-auth-token.1", value: "chunk-b" },
    ]);
    await expect(getLandingAuthState()).resolves.toBe(true);
  });

  it("returns false for anonymous visitors with no auth cookie", async () => {
    withCookies([{ name: "archestimator_cookie_consent", value: "{}" }]);
    await expect(getLandingAuthState()).resolves.toBe(false);
  });

  it("ignores empty auth cookie values", async () => {
    withCookies([{ name: "sb-abcdefghijklmnop-auth-token", value: "" }]);
    await expect(getLandingAuthState()).resolves.toBe(false);
  });

  it("fails closed to logged-out state when cookie access throws", async () => {
    cookiesMock.mockRejectedValue(new Error("outside request scope"));
    await expect(getLandingAuthState()).resolves.toBe(false);
  });

  it("performs no Supabase auth network round-trip", () => {
    // Display-only contract: the helper must not import the Supabase server
    // client. Protected routes keep fail-closed getUser() validation.
    const source = require("node:fs").readFileSync(
      require("node:path").join(process.cwd(), "src/lib/landing/get-landing-auth-state.ts"),
      "utf8",
    );
    expect(source).not.toContain("createSupabaseServerClient");
    expect(source).not.toContain("@/lib/supabase/server");
    expect(source).not.toContain("supabase.auth.getUser(");
  });
});
