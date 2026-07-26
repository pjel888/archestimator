import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

const requireRuntime = createRequire(import.meta.url);

type OAuthTokenContext = {
  options: { account: { encryptOAuthTokens: true } };
  secretConfig: string;
};

type OAuthTokenUtilities = {
  decryptOAuthToken(token: string, context: OAuthTokenContext): Promise<string>;
  setTokenUtil(token: string, context: OAuthTokenContext): Promise<string>;
};

async function loadOAuthTokenUtilities() {
  const packageRoot = dirname(dirname(requireRuntime.resolve("better-auth")));
  const moduleUrl = pathToFileURL(join(packageRoot, "dist/oauth2/utils.mjs")).href;
  return import(moduleUrl) as Promise<OAuthTokenUtilities>;
}

describe("Better Auth OAuth token encryption", () => {
  it("enables token encryption in the Cloudflare production config", () => {
    const source = readFileSync("src/lib/auth/better-auth-cloudflare.ts", "utf8");
    expect(source).toMatch(/account:\s*\{\s*encryptOAuthTokens:\s*true,/);
  });

  it("persists ciphertext that Better Auth can decrypt for provider refreshes", async () => {
    const { decryptOAuthToken, setTokenUtil } = await loadOAuthTokenUtilities();
    const context: OAuthTokenContext = {
      options: { account: { encryptOAuthTokens: true } },
      secretConfig: "test-only-better-auth-secret-with-at-least-32-characters",
    };
    const plaintext = "google-provider-bearer-token";

    const persisted = await setTokenUtil(plaintext, context);

    expect(persisted).not.toBe(plaintext);
    expect(persisted).toMatch(/^[0-9a-f]+$/);
    await expect(decryptOAuthToken(persisted, context)).resolves.toBe(plaintext);
  });
});
