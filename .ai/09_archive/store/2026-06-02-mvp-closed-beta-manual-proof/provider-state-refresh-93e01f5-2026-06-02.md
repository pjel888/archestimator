# Provider State Refresh at 93e01f5 - 2026-06-02

Status: read-only provider refresh; external closed beta remains **NO-GO**.

## Scope

- Repository HEAD: `93e01f5` / `93e01f5f801a087aa3da5f2923660ca0da1a82b4`.
- Environment: read-only Vercel CLI, Vercel health probes, and linked Supabase readiness checks.
- Production mutations: none.

## Vercel

- `vercel ls --non-interactive` showed latest preview `https://archestimator-irjs5qb0z-philipjonlewis-projects.vercel.app` as `Ready`.
- `vercel inspect archestimator-irjs5qb0z-philipjonlewis-projects.vercel.app --format=json --non-interactive` reported deployment `dpl_AV1RHNmGMptbRkEW6X8P2UGBv21x`, target `preview`, ready state `READY`, and alias `archestimator-git-main-philipjonlewis-projects.vercel.app`.
- `vercel curl https://archestimator-irjs5qb0z-philipjonlewis-projects.vercel.app/api/health` returned `{"ok":true,"service":"archestimator","timestamp":"2026-06-02T06:43:09.468Z"}`.
- `vercel curl https://archestimator-git-main-philipjonlewis-projects.vercel.app/api/health` returned `{"ok":true,"service":"archestimator","timestamp":"2026-06-02T06:43:09.508Z"}`.
- `vercel env ls --non-interactive` returned no environment variables for `philipjonlewis-projects/archestimator`.
- `vercel alias ls --non-interactive` showed the branch alias points to the latest preview, while `archestimator.com`, `www.archestimator.com`, and `archestimator.vercel.app` still point to `archestimator-3ser9ty2w-philipjonlewis-projects.vercel.app`.

## Repeatable Vercel Readiness Artifacts

- `vercel-env-readiness-93e01f5-2026-06-02.json`: `vercelEnvReady: false`; no core closed-beta runtime, Resend, or invite-delivery env names were discovered.
- `vercel-health-readiness-93e01f5-2026-06-02.json`: `vercelHealthReady: false`; plain branch-alias health returned HTTP `401`, `www.archestimator.com/api/health` and `archestimator.vercel.app/api/health` returned HTTP `404`, and apex `archestimator.com/api/health` returned HTTP `307` to `www`.
- `vercel-production-readiness-93e01f5-2026-06-02.json`: `vercelProductionReady: false`; current preview is `READY`, rollback candidates exist, but custom domains are not aliased to the current deployment and rollback drill proof was not provided.

## Supabase

- `supabase --version` returned `2.98.2`; the CLI also reported `v2.104.0` is available.
- `supabase migration list --linked` failed after temp-role retries with `failed SASL auth`, `ECIRCUITBREAKER`, and `SUPABASE_DB_PASSWORD` guidance. This retry did not prove migration history.
- `supabase-migration-readiness-93e01f5-2026-06-02.json`: `linkedMigrationsReady: false`; no migration rows were parsed from the blocked migration-list transcript, and all five required launch migrations are treated as missing remotely.
- The earlier read-only `bun run launch:supabase-readiness` command in this refresh returned 13 readiness rows and exited `0`; all rows failed readiness.
- `supabase-linked-readiness-93e01f5-2026-06-02.json`: `linkedSupabaseLaunchReady: false`; all five launch migrations are missing, `closed_beta_allowed_emails` and `beta_feedback_submissions` are missing, anon-select checks cannot pass because the tables are missing, `check_closed_beta_access` and `unlink_estimate_row_item_from_library_with_history` are missing, and `component-images` is public.
- A later retry to capture the linked SQL transcript to a temp file hung after the migration-list ECIRCUITBREAKER and was stopped locally; no production state was changed.

## Launch Meaning

The current `93e01f5` provider refresh confirms the pushed `main` preview is `READY` and protected health works through `vercel curl`. It does not close launch gates: Vercel env is empty, plain/public health is blocked, custom domains still target the older production deployment, rollback proof is absent, Supabase migration-list access is blocked, linked Supabase readiness is false, and hosted auth/manual proof is still missing.
