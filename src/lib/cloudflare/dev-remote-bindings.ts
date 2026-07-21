/**
 * Opt-in local Next.js remote Cloudflare bindings.
 *
 * When ARCH_DEV_USE_REMOTE_BINDINGS=1 (exact), bun dev uses production D1 + R2
 * via wrangler.next-dev.remote.jsonc. Local edits then mutate live data.
 * Default remains isolated Miniflare (wrangler.next-dev.jsonc).
 */
export const DEV_REMOTE_BINDINGS_FLAG = "ARCH_DEV_USE_REMOTE_BINDINGS";
export const DEV_REMOTE_BINDINGS_LOCAL_CONFIG = "wrangler.next-dev.jsonc";
export const DEV_REMOTE_BINDINGS_REMOTE_CONFIG = "wrangler.next-dev.remote.jsonc";

export function isDevRemoteBindingsEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env[DEV_REMOTE_BINDINGS_FLAG] === "1";
}

export function getDevCloudflareBindingsConfigPath(
  env: NodeJS.ProcessEnv = process.env,
): typeof DEV_REMOTE_BINDINGS_LOCAL_CONFIG | typeof DEV_REMOTE_BINDINGS_REMOTE_CONFIG {
  return isDevRemoteBindingsEnabled(env)
    ? DEV_REMOTE_BINDINGS_REMOTE_CONFIG
    : DEV_REMOTE_BINDINGS_LOCAL_CONFIG;
}
