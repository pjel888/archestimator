# Provider State Refresh at 87f603e - 2026-06-02

Status: read-only provider evidence; closed beta remains **NO-GO**.

## Scope

- Repository HEAD: `87f603e` / `87f603e8e11a8eb5f40a9f26fe0b6014b565c0d7`.
- Commands are read-only Vercel/Supabase CLI reads plus HTTP health requests.
- No Vercel env values were changed, no aliases were changed, no deployment was promoted, no Supabase migrations were applied or repaired, no storage policy was mutated, and no database rows were written.

## Vercel Deployment

- Latest deployment URL parsed from `vercel ls --non-interactive`: `https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER`.
- Deployment id from `vercel inspect`: `DEPLOYMENT_ID_PLACEHOLDER`.
- Deployment state from `vercel inspect`: `READY`.
- Inspected GitHub commit metadata: `not-parsed`.
- Protected preview health via `vercel curl`: returned `{"ok":true,"service":"archestimator",...}`.
- Protected branch-alias health via `vercel curl`: returned `{"ok":true,"service":"archestimator",...}`.
- Plain public latest preview health HTTP code: `401`.
- Plain public branch-alias health HTTP code: `401`.

## Vercel Env, Alias, And Custom Domain Reads

- `vercel env ls --non-interactive`: `Vercel CLI 54.6.1 (Node.js 25.8.0) Retrieving project… > No Environment Variables found for VERCEL_SCOPE_PLACEHOLDER/archestimator [258ms] Common next commands: - 'vercel env add' - 'vercel env rm' - 'vercel env pull'`.
- Custom-domain alias summary from `vercel alias ls --non-interactive`: ` VERCEL_DEPLOYMENT_URL_PLACEHOLDER archestimator.com 3d ; VERCEL_DEPLOYMENT_URL_PLACEHOLDER www.archestimator.com 3d   VERCEL_DEPLOYMENT_URL_PLACEHOLDER archestimator.vercel.app 3d `.
- Custom-domain health HTTP codes: `www.archestimator.com/api/health=404`, `archestimator.com/api/health=307`, `archestimator.vercel.app/api/health=404`.
- This does not prove env secret values, production promotion, alias parity to the current deployment, rollback rehearsal, hosted auth, or public/custom-domain app health.

## Supabase Linked Reads

- Supabase CLI version: `2.98.2`.
- `supabase migration list --linked` launch-migration rows: ` 20260601182522 | | 2026-06-01 18:25:22 ; 20260601184343 | | 2026-06-01 18:43:43   20260602005649 | | 2026-06-02 00:56:49 ; 20260602083000 | | 2026-06-02 08:30:00   20260602084500 | | 2026-06-02 08:45:00 `.
- `bun run launch:supabase-readiness` exit status: `0`.
- `bun run launch:check-supabase-linked-readiness` exit status: `1`.
- Linked SQL parser result summary: `totalChecks=13; failedChecks=13; summaryPassed=false; linkedSupabaseLaunchReady=false`.
- This does not apply migrations, repair migration history, mutate storage, perform RLS/browser allow-deny checks, prove backup/PITR, or run a restore.

## Launch Meaning

The current `87f603e` provider refresh is stronger current-head evidence only. It confirms protected preview health is reachable through Vercel for the current pushed commit, while Vercel env/custom-domain/public-health/rollback and linked Supabase migration/RPC/storage readiness remain **NO-GO**. Do not mark the MVP launch goal complete from this artifact.
