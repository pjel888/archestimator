# Cloudflare OAuth Normalizer Recovery Hotfix

Captured: 2026-07-01T23:44:38Z

## Deployment

- Worker: `archestimator-auth-callback-normalizer`
- Version: `54de3fb5-9f04-4bb0-a3d8-ad11a6ae3ed0`
- Deployment: 100% traffic on `archestimator.com/*` and `archestimator.com/api/auth/callback/google*`
- Created: 2026-07-01T23:43:04Z

## Change

- Expanded OAuth state cleanup coverage to include `Path=/login`.
- Added main Worker source hardening for direct Google callback state mismatch recovery and downstream `state_mismatch` redirect normalization. The main Worker bundle passed build/dry-run, but Wrangler full-app publish hung after upload; the deployed production recovery layer is currently the normalizer Worker.

## Verification

- `bunx vitest run tests/vitest/auth-callback-normalizer-worker.test.ts tests/vitest/cloudflare-worker-route-optimizations.test.ts --maxWorkers=1` passed: 2 files, 29 tests.
- Broader focused suite passed before deploy: `tests/vitest/cloudflare-worker-route-optimizations.test.ts`, `tests/vitest/auth-callback-normalizer-worker.test.ts`, `tests/vitest/cloudflare-better-auth-route.test.ts`, `tests/vitest/auth-proxy.test.ts`: 4 files, 66 tests.
- `NODE_OPTIONS=--max-old-space-size=8192 bun run type-check` passed.
- `git diff --check` passed.
- `OPEN_NEXT_DEPLOY=true CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false NODE_OPTIONS='--max-old-space-size=8192' bun run cf:build` passed; `/login` remained dynamic.
- Production curl for `https://archestimator.com/?error=state_mismatch` returned `302` to `/login?next=%2Fworkshop&oauth_state_reset=1`, `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`, fallback HTML, `Clear-Site-Data`, and OAuth cleanup cookies including `Path=/login`.
- Production curl for a stale callback `https://archestimator.com/api/auth/callback/google?state=fresh-state&code=fake` with cookie `__Secure-better-auth.state=old-state.signature` returned the same clean login reset before app handling.
- Fresh Chromium from the exact bad URL landed at `https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset_done=1`; clicking Google reached `accounts.google.com`, and Google `state=ZlrNCbL3gftp8W0iEdJ9xjjB6BqPMU3q` matched the fresh `__Secure-better-auth.state` cookie.
- Desktop Chrome active tab was already authenticated at `https://archestimator.com/workshop/projects/bd9a8e68-4e24-49d8-aeed-e4651b7cab0b/estimates`.
