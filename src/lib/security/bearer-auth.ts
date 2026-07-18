import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

const BEARER_PREFIX = "Bearer ";

export type BearerAuthorizationResult =
  | { status: "authorized" }
  | { status: "missing-secret" }
  | { status: "invalid-secret" };

function digestSecret(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

export function authorizeBearerRequest(
  request: Request,
  configuredSecrets: readonly (string | null | undefined)[],
): BearerAuthorizationResult {
  const secrets = Array.from(new Set(configuredSecrets
    .map((secret) => secret?.trim())
    .filter((secret): secret is string => Boolean(secret))));
  if (secrets.length === 0) return { status: "missing-secret" };

  const authorization = request.headers.get("authorization");
  const hasBearerScheme = authorization?.startsWith(BEARER_PREFIX) === true;
  const suppliedDigest = digestSecret(hasBearerScheme ? authorization.slice(BEARER_PREFIX.length) : "");
  let matched = false;

  for (const secret of secrets) {
    const currentMatch = timingSafeEqual(suppliedDigest, digestSecret(secret));
    matched = currentMatch || matched;
  }

  return matched && hasBearerScheme
    ? { status: "authorized" }
    : { status: "invalid-secret" };
}
