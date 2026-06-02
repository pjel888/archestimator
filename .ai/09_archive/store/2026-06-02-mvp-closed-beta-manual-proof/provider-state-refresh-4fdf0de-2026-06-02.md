# Provider State Refresh at 4fdf0de - 2026-06-02

Status: read-only provider refresh; external closed beta remains **NO-GO**.

## Scope

- Repository HEAD: `4fdf0de` / `4fdf0de3f589d63ec9e2790b8c7c917c02dc0d07`.
- Environment: read-only Vercel CLI, Vercel health probes, and linked Supabase readiness checks.
- Production mutations: none.

## Vercel

- `vercel ls --non-interactive` showed latest preview `https://archestimator-lr6t14h58-philipjonlewis-projects.vercel.app` as `Ready`.
- `vercel inspect archestimator-lr6t14h58-philipjonlewis-projects.vercel.app --format=json --non-interactive` reported deployment `dpl_Fj4vLSMVm9iUqUFxcYe7fjsYmT4G`, target `preview`, ready state `READY`, and alias `archestimator-git-main-philipjonlewis-projects.vercel.app`.
- `vercel curl https://archestimator-lr6t14h58-philipjonlewis-projects.vercel.app/api/health` returned `{"ok":true,"service":"archestimator","timestamp":"2026-06-02T07:00:41.635Z"}`.
- `vercel curl https://archestimator-git-main-philipjonlewis-projects.vercel.app/api/health` returned `{"ok":true,"service":"archestimator","timestamp":"2026-06-02T07:00:41.408Z"}`.
- `vercel env ls --non-interactive` returned no environment variables for `philipjonlewis-projects/archestimator`.
- `vercel alias ls --non-interactive` showed the branch alias points to the latest preview, while `archestimator.com`, `www.archestimator.com`, and `archestimator.vercel.app` still point to `archestimator-3ser9ty2w-philipjonlewis-projects.vercel.app`.

## Repeatable Vercel Readiness Artifacts

- `vercel-env-readiness-4fdf0de-2026-06-02.json`: `vercelEnvReady: false`; no core closed-beta runtime, Resend, or invite-delivery env names were discovered.
- `vercel-health-readiness-4fdf0de-2026-06-02.json`: `vercelHealthReady: false`; plain branch-alias health returned HTTP `401`, `www.archestimator.com/api/health` and `archestimator.vercel.app/api/health` returned HTTP `404`, and apex `archestimator.com/api/health` returned HTTP `307` to `www`.
- `vercel-production-readiness-4fdf0de-2026-06-02.json`: `vercelProductionReady: false`; current preview is `READY`, rollback candidates exist, but custom domains are not aliased to the current deployment and rollback drill proof was not provided.

## Supabase

- `supabase --version` returned `2.98.2`; the CLI also reported `v2.104.0` is available.
- `supabase migration list --linked` succeeded and parsed 71 rows.
- `supabase-migration-readiness-4fdf0de-2026-06-02.json`: `linkedMigrationsReady: false`; all five required launch migrations are present locally but missing remotely: `20260601182522`, `20260601184343`, `20260602005649`, `20260602083000`, and `20260602084500`.
- `bun run launch:supabase-readiness` failed before JSON with linked database SASL authentication errors and was stopped after retry 4/8.
- `supabase-linked-readiness-4fdf0de-2026-06-02.json`: `linkedSupabaseLaunchReady: false`; the parser found no JSON rows, records `blockedReason: "Supabase linked database SASL authentication failed."`, and marks all readiness categories missing.

## Launch Meaning

The current `4fdf0de` provider refresh confirms the pushed `main` preview is `READY` and protected health works through `vercel curl`. It does not close launch gates: Vercel env is empty, plain/public health is blocked, custom domains still target the older production deployment, rollback proof is absent, linked Supabase migration history still lacks all five launch migrations, and the deeper linked SQL readiness query is blocked by linked database SASL auth. Hosted auth/manual proof is still missing.
