# Cloudflare OAuth State-Mismatch Fallback Hardening

Generated: `2026-07-01T19:58:16Z`

Trigger: the user still reported the exact production URL `https://archestimator.com/?error=state_mismatch`.

## Change

- Redeployed `archestimator-auth-callback-normalizer` as version `efab385a-a0ca-4e8b-b382-e7cc0f469044`.
- The state-mismatch reset response now sends three independent browser recovery hints:
  - `Location: https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1`
  - `Refresh: 0; url=https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1`
  - HTML/JS fallback body with `window.location.replace(...)`
- The same fallback behavior was added to the main Worker route helper for source parity once the main Worker deploy path is repaired.

## Verification

- `bunx vitest run tests/vitest/auth-callback-normalizer-worker.test.ts tests/vitest/cloudflare-worker-route-optimizations.test.ts tests/vitest/auth-proxy.test.ts --maxWorkers=1`
  - Result: pass
  - Files: 3 passed
  - Tests: 52 passed
- Live `curl` to `https://archestimator.com/?error=state_mismatch`
  - Status: `302`
  - Location: `/login?next=%2Fworkshop&oauth_state_reset=1`
  - Refresh: `0; url=https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1`
  - Body contains the fallback redirect HTML.
- Live followed `curl -L`
  - Final status: `200`
  - Final URL: `https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1`
  - Final page: sign-in page.
- Fresh Chromium navigation
  - Final URL: `https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1`
  - Title: `Sign in - Archestimator - Archestimator`
  - Body contains no `state_mismatch`.

## Residual Risk

- The main `archestimator-proof` OpenNext Worker is still not source-current because the full Worker upload/deploy path is blocked. Keep this edge adapter active.
- Already-open stale browser pages still need a reload or new navigation to receive the new edge response.
