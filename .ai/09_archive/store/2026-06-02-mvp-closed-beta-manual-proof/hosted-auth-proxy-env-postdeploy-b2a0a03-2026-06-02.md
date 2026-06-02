# Hosted Auth Proxy Env Postdeploy Recheck at b2a0a03 - 2026-06-02

Status: signed-out missing-env fail-closed behavior passes on the protected Vercel preview; external closed beta remains **NO-GO**.

## Scope

- Commit tested: `b2a0a03`.
- Vercel preview: `archestimator-opxqsyo4t-philipjonlewis-projects.vercel.app`.
- Deployment state: `READY` in `vercel ls --non-interactive`.
- Production mutations: none.

## Commands

- `vercel ls --non-interactive`
- `vercel curl https://archestimator-opxqsyo4t-philipjonlewis-projects.vercel.app/api/health`
- `vercel curl https://archestimator-opxqsyo4t-philipjonlewis-projects.vercel.app/workshop -I`

## Results

- `/api/health` returned app health JSON:
  - `{"ok":true,"service":"archestimator","timestamp":"2026-06-02T07:47:54.307Z"}`
- `HEAD /workshop` returned HTTP `307`.
- `location` was `/login?next=%2Fworkshop`.

## Launch Meaning

This proves the previously failing signed-out protected-route path no longer returns HTTP `500` when hosted Supabase env is absent on the protected Vercel preview. It closes only the missing-env fail-closed recheck for the proxy fix.

It does not prove hosted Google OAuth, callback URLs, allowed/denied/revoked/expired hosted sessions, real linked allowlist data, Vercel env values, production/custom-domain health, rollback, first-run workspace, or hosted manual E2E. Closed beta remains **NO-GO** until those proof rows pass or receive explicit owner acceptance.
