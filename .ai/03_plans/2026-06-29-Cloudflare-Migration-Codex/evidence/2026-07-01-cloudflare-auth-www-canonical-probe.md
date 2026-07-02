# Cloudflare Auth WWW Canonical Probe

Generated: `2026-07-01T14:41:42Z`

Result: **PASS with watch items**

## Production Change

Created an active Cloudflare Single Redirect rule:

| Field | Value |
| --- | --- |
| Rule ID | `89820871a81c4e68aaa18b573e5af606` |
| Name | `Redirect from WWW to root [Template]` |
| Match | `URI Full wildcard r"https://www.*"` |
| Action | `308 redirect to wildcard_replace(http.request.full_uri, r"https://www.*", r"https://${1}")` |
| Preserve query string | `true` |

## Live Proof

| Check | Result |
| --- | --- |
| `GET https://www.archestimator.com/login?next=/workshop` | `308` to `https://archestimator.com/login?next=/workshop` |
| `GET https://www.archestimator.com/` | `308` to `https://archestimator.com/` |
| `POST https://www.archestimator.com/api/auth/sign-in/social` | `308` to `https://archestimator.com/api/auth/sign-in/social` |
| `POST https://archestimator.com/api/auth/sign-in/social` | `200`, sets `__Secure-better-auth.state`, returns Google URL with `redirect_uri=https://archestimator.com/api/auth/callback/google` |
| Browser `https://archestimator.com/login?next=/workshop` then `Continue with Google` | Login page rendered, Google button visible, landed on `accounts.google.com`, state cookie on `archestimator.com`, no `state_mismatch` |

Cookie values and OAuth state values were redacted.

## Fresh Browser Auth Start

At `2026-07-01T14:49:22Z`, a fresh headless Chromium context loaded `https://archestimator.com/login?next=/workshop`, found `Continue with Google`, clicked it, and observed:

- final host: `accounts.google.com`;
- callback URI: `https://archestimator.com/api/auth/callback/google`;
- OAuth `state` parameter present;
- `__Secure-better-auth.state` cookie scoped to `archestimator.com`;
- `state_mismatch`: `false`.

## Root Cause

Better Auth's OAuth state cookie is host-scoped unless cross-subdomain cookies are configured. If OAuth starts on `www.archestimator.com` or the Worker subdomain and the Google callback returns to `archestimator.com`, the callback cannot see the original state cookie and Better Auth reports `state_mismatch`.

The live fix is to canonicalize `www.archestimator.com` to apex before login or auth-start traffic can run.

## Watch Items

- A Worker-level canonical host guard is implemented and covered by focused tests, but it is not live yet because Wrangler deploys hung at Cloudflare's upload/version endpoints during this run.
- `curl -4` to `www` returns the 308 redirect on reachable attempts; a three-attempt sample returned two 308 redirects and one SSL connection timeout from this machine.
- `curl -6` to `www` timed out from this machine, and apex GET probes also showed slow or partial body completion. Track this as edge/page response reliability, not as redirect-rule correctness.
- Users already on `https://archestimator.com/?error=state_mismatch` should start a fresh sign-in from `/login` or `/workshop` after the old failed callback URL is cleared.

## Verification

- `bunx vitest run tests/vitest/cloudflare-worker-route-optimizations.test.ts tests/vitest/auth-set-cookie-forwarding.test.ts tests/vitest/auth-entry-ui-contract.test.ts tests/vitest/auth-callback-route.test.ts tests/vitest/auth-error-mapping.test.ts tests/vitest/cloudflare-better-auth-proof-router.test.ts tests/vitest/cloudflare-better-auth-proof-script.test.ts`
  - Result: `7` files passed, `30` tests passed.
- Prior typecheck in this auth-fix loop:
  - `NODE_OPTIONS=--max-old-space-size=8192 bunx tsc --noEmit --pretty false`
  - Result: pass.
