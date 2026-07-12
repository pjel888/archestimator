---
title: Cloudflare OAuth Root Retry Edge Adapter Proof
generated_at: 2026-07-01T17:59:57Z
status: pass
---

# Cloudflare OAuth Root Retry Edge Adapter Proof

## Summary

The user still reached `https://archestimator.com/?error=state_mismatch` after the callback-only hardening. Live checks showed the callback normalizer was working, but the main `archestimator-proof` Worker still served the root error URL as a `200` because the full OpenNext Worker deployment path continued to stall during large script upload/publish.

To unblock production immediately, `archestimator-auth-callback-normalizer` was extended as a small edge adapter and deployed at version `86426890-2751-4e11-a20b-e23d74c7bc03`.

## Deployed Behavior

- Route `archestimator.com/*` now reaches the adapter Worker first.
- Exact `GET /?error=state_mismatch` redirects to `https://archestimator.com/login?next=%2Fworkshop&error=state_mismatch`.
- Exact `GET /api/auth/error?error=state_mismatch` redirects to the same login retry URL.
- Google callback handling still normalizes or rejects missing/stale/non-matching OAuth state cookies.
- All other requests are forwarded unchanged to the main `archestimator-proof` Worker through the `ARCH_APP` service binding.

## Verification

- Focused Vitest: `4` files / `23` tests passed.
- TypeScript: `NODE_OPTIONS=--max-old-space-size=8192 bunx tsc --noEmit --pretty false` exited `0`.
- Small adapter deploy succeeded with Wrangler and installed routes:
  - `archestimator.com/*`
  - `archestimator.com/api/auth/callback/google*`
- Live root retry URL returned `302` to `/login?next=%2Fworkshop&error=state_mismatch` with no-store and broad Better Auth OAuth state-cookie expiry headers.
- Live `/api/auth/error?error=state_mismatch` returned the same login retry redirect.
- Live `/login?next=%2Fworkshop` returned `200` with the Google and magic-link controls.
- Live `/api/health` returned `200` JSON from the main app Worker.
- Headless Chromium clicked the production Google button, reached `accounts.google.com`, confirmed `redirect_uri=https://archestimator.com/api/auth/callback/google`, found a matching `__Secure-better-auth.state` cookie on `archestimator.com`, and a fake-code callback ended at `https://archestimator.com/?error=invalid_code`, not `state_mismatch`.
- A matching-prefix but invalid signed state cookie first reached Better Auth's `/api/auth/error?error=state_mismatch`, then the adapter redirected to `/login?next=%2Fworkshop&error=state_mismatch`.

## Remaining Watch

The main Worker source also contains the root retry redirect and canonical-host guards, but the active `archestimator-proof` deployment is still the older `b909ac54-1a72-47f0-9a70-f6c70f7c6fb6` because full Worker deploy/version upload attempts continued to hang after bundle upload. Keep the adapter active until the large main Worker deployment path is reliable again and the same behavior is verified inside `archestimator-proof`.
