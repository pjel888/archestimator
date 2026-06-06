# Notification System RLS Proof Blocker

Date: 2026-06-06
Branch: `codex/notification-system`
Status: Open verification blocker

## Summary

The notification system migration and static RLS tests are implemented, but actual database-backed RLS behavior proof cannot run in this local worktree because neither Docker-backed Supabase local nor local PostgreSQL binaries are available.

## Evidence

- `npx supabase@2.98.2 --version` returned `2.98.2`.
- `docker --version` failed with `command not found`.
- `npx supabase@2.98.2 db reset` failed with:
  `Cannot connect to the Docker daemon at unix:///var/run/docker.sock`.
- `postgres`, `initdb`, `pg_ctl`, and `psql` are not available on PATH.
- Follow-up local binary audit found no `/Applications/Docker.app`, no Postgres app binaries, no Postgres binaries under `/opt/homebrew`, `/usr/local`, or `/Library/PostgreSQL`, and Homebrew reports `postgresql@16` and `postgresql@15` as `Not installed`.
- A fresh `npx supabase@2.98.2 db reset` attempt still failed with:
  `Cannot connect to the Docker daemon at unix:///var/run/docker.sock`.
- No branch-safe or linked Supabase target was mutated; linked/provider changes require explicit owner approval.

## Impact

The following claims remain unproven by a real database:

- User A can select a release definition only after User A has a delivery.
- User A cannot select a definition or delivery delivered only to User B.
- Authenticated users cannot directly insert, update, or delete notification rows.
- Anonymous users cannot read notification tables.

## Current Mitigation

- `tests/vitest/notification-schema.test.ts` statically proves the migration includes the required tables, RLS enablement, scoped policies, strict revokes/grants, no authenticated update policy, safe `/workshop` action link check, unique delivery constraint, and required indexes.
- Server-action tests prove state mutations use service-role only after current-user authentication and filter by both `id` and `user_id`.
- `tests/vitest/notification-rls-proof.test.ts` is a guarded executable proof harness for same-user reads, cross-user denial, direct authenticated write denial, and anonymous denial. It skips by default and only runs when `ARCHESTIMATOR_NOTIFICATION_RLS_PROOF=1` plus local Supabase or `ARCHESTIMATOR_NOTIFICATION_RLS_BRANCH_SAFE=1` are configured.

## Resolution Path

Run one of:

1. Install/start Docker Desktop, then run:
   - `npx supabase@2.98.2 db reset`
   - `npx supabase@2.98.2 gen types typescript --local > src/lib/supabase/types.ts`
   - `ARCHESTIMATOR_NOTIFICATION_RLS_PROOF=1 bun run test:dom -- tests/vitest/notification-rls-proof.test.ts`
2. Use an owner-approved branch-safe Supabase database, apply only the notification migration, regenerate types from that branch-safe target, and run the same RLS probes.

Do not apply this migration to linked production without explicit owner approval.
