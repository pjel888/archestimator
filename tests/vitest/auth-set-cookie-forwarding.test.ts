import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  parseForwardedSetCookie,
  splitSetCookieHeader,
} from "@/lib/auth/set-cookie-forwarding";

describe("Better Auth Set-Cookie forwarding", () => {
  it("forwards the Better Auth social sign-in state cookie before redirecting to Google", () => {
    const authActions = readFileSync(join(process.cwd(), "src/lib/auth/actions.ts"), "utf8");

    expect(authActions).toContain('path: "/api/auth/sign-in/social"');
    expect(authActions).toContain("forwardSetCookieHeaders(signInResponse.headers)");
    expect(authActions.indexOf("forwardSetCookieHeaders(signInResponse.headers)")).toBeLessThan(
      authActions.indexOf("redirect(redirectUrl)"),
    );
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
});
