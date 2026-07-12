# Cloudflare OAuth State Mismatch Global Recovery

Generated: `2026-07-01T19:48:17Z` / `2026-07-02 03:48:17 PST`

Production hotfix deployed to `archestimator-auth-callback-normalizer` version `8dfcb2eb-5571-4938-8b81-d9bc54a4faa5`.

## Result

PASS. `state_mismatch` URLs no longer strand the browser at the reported error URL. The edge adapter now:

- redirects any app-path `?error=state_mismatch` request to `/login?next=%2Fworkshop&oauth_state_reset=1`;
- clears Better Auth OAuth state cookies across root/auth/callback paths and apex/domain variants;
- rewrites downstream `3xx` redirects whose `Location` still contains `error=state_mismatch`;
- keeps a future main-Worker middleware fallback in source so marketing pages cannot cache/render auth-error query responses after the full Worker deploy path is repaired.

## Evidence

- Focused tests: `bunx vitest run tests/vitest/auth-callback-normalizer-worker.test.ts tests/vitest/cloudflare-worker-route-optimizations.test.ts tests/vitest/auth-proxy.test.ts --maxWorkers=1` passed `3` files / `52` tests.
- Deploy: `bunx wrangler deploy --config wrangler.auth-callback-normalizer.jsonc` uploaded `8.26 KiB` and deployed version `8dfcb2eb-5571-4938-8b81-d9bc54a4faa5`.
- Live `curl` checks passed for:
  - `https://archestimator.com/?error=state_mismatch`
  - `https://archestimator.com/workshop?error=state_mismatch`
  - `https://archestimator.com/api/auth/error?error=state_mismatch`
  - `https://archestimator.com/login?next=%2Fworkshop&error=state_mismatch`
  - missing-cookie callback to `/api/auth/callback/google`
- Fresh Google-start plus fake-code callback with a matching state cookie reached `invalid_code`, not `state_mismatch`, which is expected for a fake code.

## Residual Risk

The Codex in-app browser window could not be inspected directly by Computer Use. Production HTTP behavior is fixed, and Chrome remains signed into the Cloudflare-hosted app; the wider full-app QA ledger stays active for upload/publication/realtime and main Worker deploy consolidation.
