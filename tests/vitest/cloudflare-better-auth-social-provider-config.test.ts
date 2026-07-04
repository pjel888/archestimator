import { describe, expect, it } from "vitest";

import { resolveCloudflareBetterAuthSocialProviders } from "@/lib/auth/better-auth-cloudflare";

describe("Cloudflare Better Auth social provider config", () => {
  it("forces Google account selection when Google OAuth is configured", () => {
    const providers = resolveCloudflareBetterAuthSocialProviders({
      BETTER_AUTH_GOOGLE_CLIENT_ID: " client-id ",
      BETTER_AUTH_GOOGLE_CLIENT_SECRET: " client-secret ",
    });

    expect(providers).toEqual({
      google: {
        clientId: "client-id",
        clientSecret: "client-secret",
        prompt: "select_account",
      },
    });
  });

  it("keeps the legacy Google env fallback on the same account-picker policy", () => {
    const providers = resolveCloudflareBetterAuthSocialProviders({
      GOOGLE_CLIENT_ID: "legacy-client-id",
      GOOGLE_CLIENT_SECRET: "legacy-client-secret",
    });

    expect(providers).toEqual({
      google: {
        clientId: "legacy-client-id",
        clientSecret: "legacy-client-secret",
        prompt: "select_account",
      },
    });
  });

  it("does not configure Google unless both credentials are present", () => {
    expect(
      resolveCloudflareBetterAuthSocialProviders({
        BETTER_AUTH_GOOGLE_CLIENT_ID: "client-id",
      }),
    ).toBeUndefined();
    expect(
      resolveCloudflareBetterAuthSocialProviders({
        BETTER_AUTH_GOOGLE_CLIENT_SECRET: "client-secret",
      }),
    ).toBeUndefined();
  });
});
