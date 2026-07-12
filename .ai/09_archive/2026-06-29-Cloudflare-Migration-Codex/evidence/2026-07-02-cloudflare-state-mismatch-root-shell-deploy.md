# Cloudflare State-Mismatch Root-Shell Deploy

Date: 2026-07-02T02:33:54Z

## Production deploy

- Uploaded Worker version: `2ce56c43-ad18-44de-9905-59a46d10817b`
- Version tag: `state-mismatch-root-fallback-20260702022402`
- Deployed at: `2026-07-02T02:30:56.672Z`
- Deployment message: `Deploy root-shell OAuth state mismatch recovery`
- Traffic split: `100%` to `2ce56c43-ad18-44de-9905-59a46d10817b`
- `wrangler triggers deploy` refreshed:
  - `https://archestimator-proof.philipjonlewis.workers.dev`
  - `archestimator.com`
  - `www.archestimator.com`
  - cron schedules
  - `archestimator-upload-jobs` producer and consumer

## Exact reported URL

Command:

```bash
curl -sS -D /tmp/arch-state-live.headers -o /tmp/arch-state-live.body 'https://archestimator.com/?error=state_mismatch'
```

Result:

- First hop: `HTTP/2 302`
- Location: `https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1`
- Cache policy: `private, no-cache, no-store, max-age=0, must-revalidate`
- Clear-site-data: `"cache", "cookies", "storage"` and `"cookies"`
- Body contains fallback `location.replace` to the reset URL.

Followed result:

```text
EFFECTIVE_URL=https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset_done=1
HTTP_CODE=200
Title=Sign in - Archestimator - Archestimator
H1=Sign in
recovery marker count=2
raw ?error=state_mismatch query count=0
```

## Browser proof

Fresh headless Chromium context visited:

```text
https://archestimator.com/?error=state_mismatch
```

Observed:

```json
{
  "finalUrl": "https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset_done=1",
  "title": "Sign in — Archestimator — Archestimator",
  "h1": "Sign in",
  "markerCount": 1,
  "bodyHasVisibleStateMismatch": false,
  "cookies": ["cf_clearance"]
}
```

Relevant response chain:

```text
302 https://archestimator.com/?error=state_mismatch
302 https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1
200 https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset_done=1
```

## Google OAuth start proof

From the clean reset login page, starting Google sign-in without completing Google login produced:

```json
{
  "finalHost": "accounts.google.com",
  "redirectUri": "https://archestimator.com/api/auth/callback/google",
  "googleStateLength": 32,
  "stateCookieNamesBefore": [],
  "stateCookieNamesAfter": ["__Secure-better-auth.state"],
  "secureStateCookieLength": 81
}
```

This proves the live app now clears the stale state path, lands on a clean login page, and generates a fresh Better Auth state cookie before Google OAuth handoff.

## Source contract check

```text
bunx vitest run tests/vitest/auth-entry-ui-contract.test.ts --maxWorkers=1
Test Files  1 passed (1)
Tests       6 passed (6)
```
