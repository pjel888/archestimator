# Cloudflare WWW State-Mismatch Redirect Rule

Captured: 2026-07-02 00:30 UTC

## Finding

The apex recovery path was already working, but the remaining bad user-visible path could start on `www`. Cloudflare Single Redirects run before Worker routes, so the existing `Redirect from WWW to root [Template]` rule produced a first-hop `308` to:

`https://archestimator.com/?error=state_mismatch`

That preserved the stale error query before the normalizer could clean it.

## Fix

Added Cloudflare Redirect Rule `Recover www Google state mismatch` at order `1`:

- Match: `https://www.archestimator.com/*error=state_mismatch*`
- Action: `302` to `https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1`
- Preserve query string: off

The existing generic `Redirect from WWW to root [Template]` remains active at order `2` for ordinary `www` traffic.

Also redeployed `archestimator-auth-callback-normalizer` as version `aaee7b3f-a120-4e5e-ada2-5950c57831df` with a `www.archestimator.com/*` route as defense in depth. The redirect rule owns the first-hop fix because Single Redirects execute before Workers.

## Hosted Proof

`curl` from a fresh client:

| URL | First hop | Final URL | State text |
| --- | --- | --- | --- |
| `https://archestimator.com/?error=state_mismatch` | `302` to `/login?next=%2Fworkshop&oauth_state_reset=1` | `/login?next=%2Fworkshop&oauth_state_reset_done=1` | `0` |
| `https://www.archestimator.com/?error=state_mismatch` | `302` to apex `/login?next=%2Fworkshop&oauth_state_reset=1` | `/login?next=%2Fworkshop&oauth_state_reset_done=1` | `0` |
| `https://www.archestimator.com/workshop?error=state_mismatch` | `302` to apex `/login?next=%2Fworkshop&oauth_state_reset=1` | `/login?next=%2Fworkshop&oauth_state_reset_done=1` | `0` |

Fresh Playwright context:

- `https://archestimator.com/?error=state_mismatch` ends at the clean login reset page with no visible `state_mismatch`.
- `https://www.archestimator.com/?error=state_mismatch` ends at the same clean login reset page with no visible `state_mismatch`.
- Clicking `Continue with Google` reaches `https://accounts.google.com` with `redirect_uri=https://archestimator.com/api/auth/callback/google`.
- The Google `state` is 32 characters and matches the freshly written `__Secure-better-auth.state` cookie.

## Local Verification

Passed:

```bash
bunx vitest run tests/vitest/auth-callback-normalizer-worker.test.ts tests/vitest/cloudflare-worker-route-optimizations.test.ts tests/vitest/auth-proxy.test.ts --maxWorkers=1
```

Result: `3` files, `65` tests passed.
