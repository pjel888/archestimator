# Provider State Refresh at 0b4628d - 2026-06-02

Status: read-only provider evidence refresh; external closed beta remains **NO-GO**.

## Scope

Read-only Vercel and linked Supabase checks only. No deploy, promote, alias, rollback, env, migration, repair, policy, storage, DNS, auth-provider, Resend, production data, or legal/manual QA state was changed.

## Git / Deployment Anchor

- Local `main` / `origin/main`: `0b4628d413e0c17725e7a092af2fdec17de5ee84`.
- Latest Vercel preview inspected: `VERCEL_DEPLOYMENT_URL_PLACEHOLDER`.
- Vercel deployment id: `DEPLOYMENT_ID_PLACEHOLDER`.
- Vercel deployment commit: `0b4628d413e0c17725e7a092af2fdec17de5ee84`.
- Vercel deployment status: Ready.
- Vercel branch alias: `VERCEL_DEPLOYMENT_URL_PLACEHOLDER`.

## Commands

```bash
vercel list --format json --non-interactive
vercel env ls --non-interactive
vercel alias ls --non-interactive
vercel domains ls --non-interactive
vercel inspect VERCEL_DEPLOYMENT_URL_PLACEHOLDER --non-interactive
vercel curl https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/api/health
vercel curl https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/api/health
curl -I -L --max-time 20 https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/api/health
curl -I -L --max-time 20 https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/api/health
curl -I -L --max-time 20 https://www.archestimator.com/api/health
curl -I -L --max-time 20 https://archestimator.com/api/health
curl -I -L --max-time 20 https://archestimator.vercel.app/api/health
vercel inspect VERCEL_DEPLOYMENT_URL_PLACEHOLDER --non-interactive
supabase --version
supabase projects list -o json
supabase migration list --linked
bun run launch:supabase-readiness
```

## Vercel Result

- `vercel list --format json --non-interactive` first reported the current `main` deployment for commit `0b4628d413e0c17725e7a092af2fdec17de5ee84` as `BUILDING`; `vercel inspect` then reported it as Ready.
- `vercel inspect VERCEL_DEPLOYMENT_URL_PLACEHOLDER --non-interactive` reported deployment id `DEPLOYMENT_ID_PLACEHOLDER`, target `preview`, status Ready, and branch alias `VERCEL_DEPLOYMENT_URL_PLACEHOLDER`.
- `vercel env ls --non-interactive` still returned `No Environment Variables found for VERCEL_SCOPE_PLACEHOLDER/archestimator`.
- `vercel alias ls --non-interactive` showed `VERCEL_DEPLOYMENT_URL_PLACEHOLDER` mapped to the previous Ready `792076e` preview during the initial list, then `vercel inspect` showed the branch alias on the current Ready `0b4628d` deployment.
- Authenticated `vercel curl` returned `{"ok":true,"service":"archestimator"}` with timestamps for both the latest preview and the branch alias `/api/health`.
- Plain public `curl -I -L` to the latest preview and branch alias `/api/health` returned HTTP `401` with Vercel SSO protection headers.
- `vercel domains ls --non-interactive` found `archestimator.com`.
- `vercel alias ls --non-interactive` still showed `archestimator.com`, `www.archestimator.com`, `archestimator.vercel.app`, and related production aliases mapped to `VERCEL_DEPLOYMENT_URL_PLACEHOLDER`.
- `vercel inspect VERCEL_DEPLOYMENT_URL_PLACEHOLDER --non-interactive` reported production deployment `DEPLOYMENT_ID_PLACEHOLDER`, created May 30, 2026, status Ready.
- `https://www.archestimator.com/api/health` returned HTTP `404`.
- `https://archestimator.com/api/health` redirected to `www` and then returned HTTP `404`.
- `https://archestimator.vercel.app/api/health` returned HTTP `404`.

## Supabase Result

- Supabase CLI version used: `2.98.2`; CLI reported update `2.104.0` available.
- `supabase projects list -o json` showed linked project `Archestimator` / `ebxxqidacheyapmmzavr`, region `ap-southeast-2`, status `ACTIVE_HEALTHY`, Postgres `17.6.1.121`.
- `supabase migration list --linked` succeeded and still showed the launch-critical local migrations absent on remote:
  - `20260601182522`
  - `20260601184343`
  - `20260602005649`
  - `20260602083000`
  - `20260602084500`
- `bun run launch:supabase-readiness` failed after repeated temp-role connection retries, ending with Supabase pooler `ECIRCUITBREAKER` and `SUPABASE_DB_PASSWORD` guidance. The reusable SQL helper therefore remains blocked through this CLI path even though `supabase migration list --linked` is currently readable.

## Launch Meaning

This refresh improves provider freshness:

- Latest `main` preview for `0b4628d` is Ready.
- Protected preview and branch-alias health work through `vercel curl`.
- Supabase migration list remains readable and confirms the five launch migrations are still not applied remotely.
- The deeper linked Supabase readiness SQL helper is blocked by the temp-role pooler circuit breaker.

It does not approve launch. Remaining blockers include Vercel env, public preview/custom-domain app health, production promotion/rollback, hosted auth allowlist smoke, linked Supabase backup/PITR and migration/RLS/storage/RPC proof, Resend proof before email workflows, spreadsheet-app compatibility, legal sign-off, monitored support/alerts, and hosted/manual E2E.
