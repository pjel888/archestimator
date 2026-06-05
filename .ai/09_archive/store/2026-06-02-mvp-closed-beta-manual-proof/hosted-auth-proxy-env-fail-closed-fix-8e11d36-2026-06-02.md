# Hosted Auth Proxy Env Fail-Closed Fix at 8e11d36 - 2026-06-02

Status: local proxy fix and verification before redeploy; external closed beta remains **NO-GO**.

## Scope

- Baseline commit before fix: `8e11d369b74b953c42591ee241c1e9725ef1e051`.
- Latest observed Vercel preview before fix: `VERCEL_DEPLOYMENT_URL_PLACEHOLDER`, deployment `DEPLOYMENT_ID_PLACEHOLDER`, `READY`.
- Production mutations: none.

## Hosted Finding

- `vercel curl https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/api/health` returned app health JSON with `"ok": true`.
- `vercel curl https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/workshop -I` returned HTTP `500`.
- `vercel curl https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/workshop` also returned HTTP `500` with `Internal Server Error`, so the failure was not HEAD-only.
- `vercel logs VERCEL_DEPLOYMENT_URL_PLACEHOLDER --since 30m --non-interactive` showed `HEAD /workshop 500` and `GET /api/health 200`, but no stack trace.

## Root Cause

`src/proxy.ts` constructed the Supabase SSR client with `process.env.NEXT_PUBLIC_SUPABASE_URL!` and `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!` before it could redirect signed-out protected routes. With Vercel Supabase env absent, the proxy path could still fail before the server-component session guard ran.

## Fix

`src/proxy.ts` now checks for required Supabase env before calling `createServerClient()`. If env is missing:

- Protected `/workshop` routes redirect to `/login?next=...`.
- `/login` and other non-protected routes continue without creating the Supabase client.

This keeps the app fail-closed without changing public-route behavior or granting access.

## Verification

- GitNexus impact for `Function:src/proxy.ts:proxy`: low risk, zero upstream affected processes in the current graph.
- `bunx vitest run tests/vitest/auth-proxy.test.ts tests/vitest/auth-session-closed-beta.test.ts --maxWorkers=1` passed 2 files / 23 tests.
- `bun run type-check` passed.
- `bun run build` passed and generated the expected 32 static pages plus protected workshop routes.

## Launch Meaning

This fixes a second local fail-closed bug for missing hosted Supabase env. It does not prove launch readiness until committed, pushed, deployed, and rechecked on Vercel. Hosted allowed/denied/revoked/expired session proof, Vercel env values, linked allowlist data, custom-domain health, and rollback proof remain missing.
