---
title: Cloudflare OAuth Stale Callback Hardening
generatedAt: 2026-07-01T17:39:35Z
baseUrl: https://archestimator.com
status: live-stale-callback-hardening-active
---

# Cloudflare OAuth Stale Callback Hardening

User-reported symptom: `https://archestimator.com/?error=state_mismatch` after the earlier callback-normalizer deployment.

Root-cause refinement: the first route-specific callback normalizer only fixed duplicate state-cookie callbacks when at least one Better Auth OAuth state cookie matched the Google callback `state`. If a browser reached the callback with only stale state cookies, or no OAuth state cookie at all, the request could still fall through to Better Auth and strand the user at a generic root `state_mismatch` URL.

## Live Callback Normalizer Worker

- Worker: `archestimator-auth-callback-normalizer`
- Version: `a2830bd5-d6da-47ac-8e45-f394963dde6f`
- Deployed: `2026-07-01T17:38:22.126Z`
- Route: `archestimator.com/api/auth/callback/google*`
- Binding: `ARCH_APP` service binding to `archestimator-proof`
- Source: `cloudflare/auth-callback-normalizer.ts`
- Config: `wrangler.auth-callback-normalizer.jsonc`

The Worker still forwards valid Google callbacks when the browser has a Better Auth OAuth state cookie matching the callback `state`. It now fails fast for callback requests that include `state` but have no matching OAuth state cookie, redirecting to `/login?next=/workshop&error=state_mismatch` while expiring all Better Auth OAuth state-cookie variants across host-only/domain and likely callback paths.

## Verification

- `bunx vitest run tests/vitest/auth-callback-normalizer-worker.test.ts tests/vitest/auth-set-cookie-forwarding.test.ts tests/vitest/cloudflare-better-auth-route.test.ts` passed with `3` files / `13` tests.
- `bunx wrangler deploy -c wrangler.auth-callback-normalizer.jsonc` uploaded and deployed version `a2830bd5-d6da-47ac-8e45-f394963dde6f`.
- `bunx wrangler deployments list --name archestimator-auth-callback-normalizer -c wrangler.auth-callback-normalizer.jsonc --json` read back version `a2830bd5-d6da-47ac-8e45-f394963dde6f` at `100%`.
- A missing-cookie callback probe returned `302` to `https://archestimator.com/login?next=%2Fworkshop&error=state_mismatch` with targeted `Set-Cookie` expiry headers for Better Auth OAuth state cookie variants.
- A stale-cookie callback probe with `__Secure-better-auth.state=old-state.old-signature` returned the same retry redirect and cleanup headers.
- A clean Playwright production login-button proof loaded `/login?next=/workshop`, clicked `Continue with Google`, observed Google OAuth with `redirect_uri=https://archestimator.com/api/auth/callback/google`, found a signed `__Secure-better-auth.state` cookie on `archestimator.com`, and called the callback with the real state plus a fake code. The final URL was `https://archestimator.com/?error=invalid_code`, not `state_mismatch`.
- The exact root retry URL `https://archestimator.com/?error=state_mismatch` still returns the main app response with the existing Cloudflare cleanup headers (`Clear-Site-Data: "cookies"` and state-cookie expiry). An automatic root-query redirect was not installed because the current Wrangler OAuth token has `zone:read` but not the zone-write permission needed for Cloudflare Redirect Rules.
- `HOSTED_AUTH_BASE_URL=https://archestimator.com bun run launch:verify-hosted-auth` partially passed: signed-out `/workshop` redirected to `/login?next=%2Fworkshop` with private no-store headers. Allowed/denied/revoked/expired cases were skipped by the harness because `HOSTED_AUTH_*_COOKIE` fixtures were not present.
- `git diff --check` passed.

## Watch Items

- Keep the route-specific callback normalizer active until the main `archestimator-proof` Worker upload/deploy path is reliable enough to carry the same behavior inline.
- Complete a real Google account-selection browser proof again after the user retries from the cleaned login surface.
- Add a Cloudflare Redirect Rule for root `?error=state_mismatch` only after a token/session with zone-write permission is available, if the owner wants the root cleanup URL to redirect automatically.
- Add or refresh hosted auth cookie fixtures if `launch:verify-hosted-auth` should cover allowed/denied/revoked/expired sessions without a browser.
