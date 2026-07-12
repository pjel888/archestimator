---
title: Cloudflare OAuth State Retry Cleanup
generatedAt: 2026-07-01T17:12:06Z
baseUrl: https://archestimator.com
status: live-callback-normalizer-active
---

# Cloudflare OAuth State Retry Cleanup

User-reported symptom: `https://archestimator.com/?error=state_mismatch`.

Root-cause model: after the earlier apex-origin and server-action cookie-forwarding fixes, a stale domain-scoped `__Secure-better-auth.state` cookie could still coexist with the fresh host-scoped cookie minted by Better Auth. Better Auth's cookie parser can select the wrong duplicate cookie on callback, so an otherwise-correct retry could still fail state validation.

## Live Cloudflare Cleanup Rule

Cloudflare HTTP Response Header Transform Rule `d4ce940ef82542f9b459865ad967cfd1` is active.

- Name: `Clear stale Better Auth OAuth state on retry`
- Current match: host `archestimator.com`, path `/`, and query containing `error=state_mismatch`
- Action: add `Clear-Site-Data: "cookies"`
- Action: add `Set-Cookie: __Secure-better-auth.state=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`

The rule was narrowed from login/signup surfaces to only the root retry-error URL. That avoids clearing a newly minted Better Auth state cookie during normal `/login` or `/signup` navigation.

## Live Callback Normalizer Worker

Because the full `archestimator-proof` Worker bundle upload is still hitting the known Cloudflare version-upload stall, a small path-specific Cloudflare Worker is now deployed as the live callback fix.

- Worker: `archestimator-auth-callback-normalizer`
- Version: `25c7f483-02e5-4bff-99c5-4f0804a68321`
- Deployed: `2026-07-01T17:09:49.288Z`
- Route: `archestimator.com/api/auth/callback/google*`
- Binding: `ARCH_APP` service binding to `archestimator-proof`
- Source: `cloudflare/auth-callback-normalizer.ts`
- Config: `wrangler.auth-callback-normalizer.jsonc`

The normalizer preserves the original `archestimator.com` callback request, rewrites only the `Cookie` header when it can identify the cookie whose state matches the callback `state` parameter, and then forwards to the main app Worker through the service binding.

## Verification

- `npx -y wrangler@4.106.0 deploy -c wrangler.auth-callback-normalizer.jsonc --dry-run --outdir /tmp/ae-auth-callback-normalizer-dryrun` passed with a `2.48 KiB` upload.
- `CI=1 npx -y wrangler@4.106.0 deploy -c wrangler.auth-callback-normalizer.jsonc` uploaded and deployed the callback route.
- `npx -y wrangler@4.106.0 deployments list --name archestimator-auth-callback-normalizer -c wrangler.auth-callback-normalizer.jsonc` read back version `25c7f483-02e5-4bff-99c5-4f0804a68321` at `100%`.
- `https://archestimator.com/?error=state_mismatch` returned `HTTP/2 200` with `Clear-Site-Data: "cookies"` and the state-cookie expiry header.
- `https://archestimator.com/login?next=/workshop` returned `HTTP/2 200` without the cleanup headers, confirming the rule no longer wipes normal login traffic.
- Headless Chromium seeded both a stale `.archestimator.com` state cookie and a fresh `archestimator.com` state cookie from a real Google OAuth start. The callback to `/api/auth/callback/google` with the fresh state and a fake code redirected to `/?error=invalid_code`, not `state_mismatch`. The fake-code failure is expected; the important signal is that state validation passed.

## Source Fix Status

The broader source fix remains built and tested locally, but the main app Worker version containing it is not live yet because full bundle upload/version creation still stalls. A direct Cloudflare API upload created version `76c1b259-1515-460b-9878-eccfdac0b3c7`, but deployment failed at the Cloudflare deployment endpoint. Follow-up uploads with `keep_assets: true` stalled on the upload endpoint.

Prepared source behavior:

- clear Better Auth OAuth state cookie variants before forwarding a fresh sign-in cookie;
- normalize duplicate Better Auth OAuth state cookies on Google callback requests so the cookie matching the callback `state` is evaluated last;
- map `state_mismatch` to the login retry/session-expired message;
- route OAuth callback errors back to `/login` instead of the generic root error URL.

Focused Vitest, typecheck, `git diff --check`, and `bun run cf:build` previously passed for the prepared source fix.

## Watch Items

- Recover the main `archestimator-proof` Worker script/version upload so the callback normalizer can be folded back into the main Worker source.
- Keep the path-specific normalizer route active until the main Worker source fix is live and verified.
- Continue tracking intermittent public-route connection/body-transfer timeouts separately from OAuth state validation.
