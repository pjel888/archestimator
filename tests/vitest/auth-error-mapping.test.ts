import { describe, expect, it } from "vitest";

import {
  getPublicAuthError,
  mapAuthErrorToCode,
} from "@/lib/auth/error-mapping";

describe("auth error mapping", () => {
  it("returns stable public copy for known auth errors", () => {
    expect(getPublicAuthError("email_required")).toEqual({
      code: "email_required",
      message: "Enter an email address to receive a sign-in link.",
    });
    expect(getPublicAuthError("callback_exchange_failed").message).toBe(
      "We could not finish signing you in. Request a new link or try Google again.",
    );
  });

  it("does not expose raw provider or callback failure details", () => {
    const code = mapAuthErrorToCode({
      fallbackCode: "callback_exchange_failed",
      rawError:
        "invalid_grant: auth code expired for provider=google refresh_token=secret",
    });

    expect(code).toBe("callback_exchange_failed");
    expect(getPublicAuthError(code).message).not.toMatch(
      /invalid_grant|refresh_token|provider=google|secret/i,
    );
  });

  it("normalizes unknown query-string errors to a generic public failure", () => {
    expect(getPublicAuthError("unexpected raw database error")).toEqual({
      code: "auth_request_failed",
      message: "We could not start sign-in. Try again in a moment.",
    });
  });
});
