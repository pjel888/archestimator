import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  clearBetterAuthOAuthStateCookies,
  normalizeBetterAuthOAuthStateCookieHeader,
  parseForwardedSetCookie,
  splitSetCookieHeader,
} from "@/lib/auth/set-cookie-forwarding";

describe("Better Auth Set-Cookie forwarding", () => {
  it("forwards the Better Auth social sign-in state cookie before redirecting to Google", () => {
    const authActions = readFileSync(join(process.cwd(), "src/lib/auth/actions.ts"), "utf8");

    expect(authActions).toContain('path: "/api/auth/sign-in/social"');
    expect(authActions).toContain("clearBetterAuthOAuthStateCookies(origin)");
    expect(authActions).toContain("forwardSetCookieHeaders(signInResponse.headers)");
    expect(authActions.indexOf("clearBetterAuthOAuthStateCookies(origin)")).toBeLessThan(
      authActions.indexOf("forwardSetCookieHeaders(signInResponse.headers)"),
    );
    expect(authActions.indexOf("forwardSetCookieHeaders(signInResponse.headers)")).toBeLessThan(
      authActions.indexOf("redirect(redirectUrl)"),
    );
  });

  it("routes Better Auth OAuth callback failures back to the login surface", () => {
    const authActions = readFileSync(join(process.cwd(), "src/lib/auth/actions.ts"), "utf8");

    expect(authActions).toContain("buildOAuthErrorCallbackUrl(origin, next)");
    expect(authActions).toContain("url.searchParams.set(\"next\", next)");
  });

  it("decodes Better Auth state cookie values before Next re-serializes them", () => {
    const parsed = parseForwardedSetCookie(
      "__Secure-better-auth.state=state-token.signature%2Fwith%3Dencoding; Max-Age=300; Path=/; HttpOnly; Secure; SameSite=Lax",
    );

    expect(parsed).toMatchObject({
      name: "__Secure-better-auth.state",
      value: "state-token.signature/with=encoding",
      options: {
        httpOnly: true,
        maxAge: 300,
        path: "/",
        sameSite: "lax",
        secure: true,
      },
    });
  });

  it("splits combined Set-Cookie headers without breaking Expires commas", () => {
    const headers = splitSetCookieHeader(
      "first=value; Expires=Wed, 21 Oct 2030 07:28:00 GMT; Path=/, second=another; Path=/; HttpOnly",
    );

    expect(headers).toEqual([
      "first=value; Expires=Wed, 21 Oct 2030 07:28:00 GMT; Path=/",
      "second=another; Path=/; HttpOnly",
    ]);
  });

  it("keeps only the OAuth state cookie matching the callback state when stale duplicates exist", () => {
    const headers = new Headers({
      cookie:
        "theme=light; __Secure-better-auth.state=old-state.old-signature; "
        + "better-auth.session_token=session; __Secure-better-auth.state=fresh-state.fresh%2Fsignature",
    });

    const normalized = normalizeBetterAuthOAuthStateCookieHeader(headers, "fresh-state");

    expect(normalized).not.toBe(headers);
    expect(normalized.get("cookie")).toBe(
      "theme=light; better-auth.session_token=session; __Secure-better-auth.state=fresh-state.fresh%2Fsignature",
    );
  });

  it("leaves callback cookies unchanged when no state cookie matches the callback state", () => {
    const headers = new Headers({
      cookie: "theme=light; __Secure-better-auth.state=old-state.old-signature",
    });

    expect(normalizeBetterAuthOAuthStateCookieHeader(headers, "fresh-state")).toBe(headers);
  });

  it("exports an explicit stale OAuth state cookie cleanup helper", () => {
    expect(clearBetterAuthOAuthStateCookies).toBeTypeOf("function");
  });
});
