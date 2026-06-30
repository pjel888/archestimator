const CLOUDFLARE_BETTER_AUTH_PROVIDER_VALUES = new Set([
  "better-auth",
  "cloudflare-better-auth",
  "d1-better-auth",
]);

export function isCloudflareBetterAuthProviderValueEnabled(provider: string | null | undefined) {
  return CLOUDFLARE_BETTER_AUTH_PROVIDER_VALUES.has(provider?.trim().toLowerCase() ?? "");
}

export function isCloudflareBetterAuthProviderEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return isCloudflareBetterAuthProviderValueEnabled(env.ARCHESTIMATOR_AUTH_PROVIDER);
}
