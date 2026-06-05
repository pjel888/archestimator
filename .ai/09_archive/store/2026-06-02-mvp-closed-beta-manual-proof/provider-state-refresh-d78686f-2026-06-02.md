# Provider State Refresh at d78686f - 2026-06-02

Status: read-only provider evidence refresh; external closed beta remains **NO-GO**.

## Scope

Read-only Vercel and linked Supabase checks only. No deploy, promote, alias, rollback, env, migration, repair, policy, storage, DNS, auth-provider, Resend, production data, or legal/manual QA state was changed.

## Git / Deployment Anchor

- Local `main` / `origin/main`: `d78686f`
- Latest Vercel preview inspected: `VERCEL_DEPLOYMENT_URL_PLACEHOLDER`
- Vercel deployment id: `DEPLOYMENT_ID_PLACEHOLDER`
- Vercel deployment commit: `d78686f259b07349220aefd9eb64f5a86c752456`
- Vercel deployment status: Ready
- Vercel branch alias: `VERCEL_DEPLOYMENT_URL_PLACEHOLDER`

## Commands

```bash
vercel list --format json --non-interactive
vercel env ls --non-interactive
vercel project ls --non-interactive
vercel inspect VERCEL_DEPLOYMENT_URL_PLACEHOLDER --non-interactive
vercel curl https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/api/health
vercel curl https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/api/health
curl -I -L --max-time 20 https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/api/health
curl -I -L --max-time 20 https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/api/health
curl -I -L --max-time 20 https://www.archestimator.com/api/health
curl -I -L --max-time 20 https://archestimator.com/api/health
supabase --version
supabase projects list -o json
supabase migration list --linked
```

## Vercel Result

- `vercel list --format json --non-interactive` reported the latest `main` deployment for commit `d78686f259b07349220aefd9eb64f5a86c752456` as `READY`.
- `vercel inspect VERCEL_DEPLOYMENT_URL_PLACEHOLDER --non-interactive` reported deployment id `DEPLOYMENT_ID_PLACEHOLDER`, target `preview`, status Ready, and branch alias `VERCEL_DEPLOYMENT_URL_PLACEHOLDER`.
- `vercel env ls --non-interactive` still returned `No Environment Variables found for VERCEL_SCOPE_PLACEHOLDER/archestimator`.
- `vercel project ls --non-interactive` listed `archestimator` with latest production URL `https://www.archestimator.com` and Node version `24.x`.
- Authenticated `vercel curl` returned `{"ok":true,"service":"archestimator"}` for both the latest preview and the branch alias `/api/health`.
- Plain public `curl -I -L` to the latest preview and branch alias `/api/health` returned HTTP `401` with Vercel SSO protection headers.
- `https://www.archestimator.com/api/health` returned HTTP `404`.
- `https://archestimator.com/api/health` redirected to `www` and then returned HTTP `404`.

## Supabase Result

- Supabase CLI version used: `2.98.2`; CLI reported update `2.104.0` available.
- `supabase projects list -o json` showed linked project `Archestimator` / `ebxxqidacheyapmmzavr`, region `ap-southeast-2`, status `ACTIVE_HEALTHY`, Postgres `17.6.1.121`.
- `supabase migration list --linked` succeeded and still showed the launch-critical local migrations absent on remote:
  - `20260601182522`
  - `20260601184343`
  - `20260602005649`
  - `20260602083000`
  - `20260602084500`

The output also still shows other local/remote divergence outside this launch slice, so linked schema remains unsuitable for hosted beta proof until migration/repair strategy is approved and backup/PITR/restore evidence exists.

## Launch Meaning

This refresh improves provider freshness:

- Latest `main` preview for `d78686f` is Ready.
- Protected preview and branch-alias health work through `vercel curl`.
- Supabase migration list remains readable and confirms the five launch migrations are still not applied remotely.

It does not approve launch. Remaining blockers include Vercel env, public preview/custom-domain app health, production promotion/rollback, hosted auth allowlist smoke, linked Supabase backup/PITR and migration/RLS/storage/RPC proof, Resend proof before email workflows, spreadsheet-app compatibility, legal sign-off, monitored support/alerts, and hosted/manual E2E.
