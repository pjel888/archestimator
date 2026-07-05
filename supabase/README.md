# Supabase Migration Archaeology

**DO NOT RUN, APPLY, OR EXTEND any file in this folder.**

This folder is retained as historical migration evidence of the pre-Cloudflare
stack. The active runtime uses Cloudflare D1 (`ARCH_DB`), R2 (`ARCH_UPLOADS_R2`),
Durable Objects (`COLLAB_ROOMS`), Queues (`UPLOAD_JOBS_QUEUE`), and Email (`EMAIL`).

## What lives here

| Path | Purpose |
|---|---|
| `config.toml` | Legacy Supabase CLI config (historical) |
| `migrations/` | 182 SQL files — legacy Postgres schema (historical) |
| `migrations-pending-review/` | 14 SQL files that were never applied (historical) |
| `seed.sql` | Legacy seed data (historical) |
| `migration-evidence/` | One-shot D1 backfill scripts + provider-parity proof scripts (post-migration cleanup archive) |

## Where the active schema lives

- Active D1 migrations: `./migrations/` (repo root, NOT this folder)
- Active data layer: `src/lib/repositories/`
- Active auth: `src/lib/auth/better-auth-cloudflare.ts`

## Why this is retained

Per `AGENTS.md`: Supabase project `ebxxqidacheyapmmzavr` is historical
provider-exit evidence only. This folder is the on-disk archaeological record
of the legacy schema and the migration tooling that moved data from Postgres
to D1. It is intentionally preserved for audit and rollback-comparison.

## Related plans

- Original migration: `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/`
- Cleanup plan that formalized this status: `.ai/09_archive/store/2026-07-05-Vercel-Supabase-Cleanup-complete/`
