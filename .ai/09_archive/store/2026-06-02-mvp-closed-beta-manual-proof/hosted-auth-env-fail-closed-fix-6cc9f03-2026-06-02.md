# Hosted Auth Env Fail-Closed Fix at 6cc9f03 - 2026-06-02

Status: local code fix and verification before redeploy; external closed beta remains **NO-GO**.

## Scope

- Repository HEAD before fix: `6cc9f03fbfe92dfcfeea79de3610682630a4068f`.
- Latest Vercel preview observed: `VERCEL_DEPLOYMENT_URL_PLACEHOLDER`, deployment `DEPLOYMENT_ID_PLACEHOLDER`, `READY`.
- Production mutations: none.

## Hosted Finding

- `vercel curl https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/api/health` returned app health JSON with `"ok": true`.
- `vercel curl https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/workshop -I` returned HTTP `500`.
- `HOSTED_AUTH_BASE_URL=https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER OUTPUT_FILE=/tmp/hosted-auth-no-cookies-6cc9f03.json bun run launch:verify-hosted-auth` wrote sanitized fail-closed JSON and exited `1`: plain hosted fetch hit Vercel HTTP `401`, and allowed/denied/revoked/expired session cookies were missing.
- `vercel logs VERCEL_DEPLOYMENT_URL_PLACEHOLDER --since 30m --non-interactive` returned no log rows.

## Root Cause

`getCurrentUserContext()` created the Supabase server client before it could determine whether a request was signed out. Because the current Vercel env list has no `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `createSupabaseServerClient()` threw and protected `/workshop` rendered HTTP `500` instead of failing closed to the login flow.

## Fix

`src/lib/auth/session.ts` now checks for required Supabase server env before constructing the server client. When the env is missing and no dev-auth context exists, `getCurrentUserContext()` returns `null`; `requireCurrentUserContext()` then redirects to `/login`. This preserves fail-closed access semantics without changing the shared Supabase server client contract for other callers.

## Verification

- Graph impact before edit: `src/lib/auth/session.ts` reported high risk because it is shared across protected routes; the edit stayed narrowly in session resolution.
- `bunx vitest run tests/vitest/auth-session-closed-beta.test.ts tests/vitest/auth-callback-route.test.ts tests/vitest/auth-proxy.test.ts --maxWorkers=1` passed 3 files / 25 tests.
- `bun run type-check` passed.
- `bunx eslint src/lib/auth/session.ts tests/vitest/auth-session-closed-beta.test.ts` passed.

## Launch Meaning

This fixes a hosted fail-closed bug locally. It does not prove launch readiness until the fix is committed, pushed, deployed, and rechecked on Vercel. Allowed/denied/revoked/expired hosted session proof still requires real hosted session cookies and linked Supabase allowlist data; Vercel env is still absent; closed beta remains **NO-GO**.
