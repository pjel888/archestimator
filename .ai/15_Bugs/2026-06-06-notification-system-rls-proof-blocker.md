# Notification System RLS Proof Blocker Resolution

Date: 2026-06-06
Branch: `codex/notification-system`
Status: Resolved for implementation goal - no-Docker local PostgreSQL proof passed

## Summary

The original database-backed RLS proof blocker was resolved after the owner clarified Docker is not required for this goal and explicitly requested PostgreSQL binaries instead. PostgreSQL 16 was installed through Homebrew, a no-Docker local proof script was added, and `bun run prove:notification-rls` now applies the real notification migration to a temporary PostgreSQL cluster and proves the required allow/deny behavior.

## Evidence

- `npx supabase@2.98.2 --version` returned `2.98.2`.
- `docker --version` failed with `command not found`.
- `npx supabase@2.98.2 db reset` failed with:
  `Cannot connect to the Docker daemon at unix:///var/run/docker.sock`.
- Follow-up local binary audit found no `/Applications/Docker.app`, no Postgres app binaries, no Postgres binaries under `/opt/homebrew`, `/usr/local`, or `/Library/PostgreSQL`, and Homebrew reports `postgresql@16` and `postgresql@15` as `Not installed`.
- A fresh `npx supabase@2.98.2 db reset` attempt still failed with:
  `Cannot connect to the Docker daemon at unix:///var/run/docker.sock`.
- Owner clarified Docker is not part of the goal and requested PostgreSQL binaries instead.
- `brew install postgresql@16` installed PostgreSQL 16.14 under `/opt/homebrew/opt/postgresql@16/bin`.
- `bun run prove:notification-rls` passed against a temporary local PostgreSQL cluster using `supabase/migrations/20260606090000_notification_system.sql`.
- No branch-safe or linked Supabase target was mutated; linked/provider changes require explicit owner approval.

## Impact

The following claims are now proven by a real local PostgreSQL database for the implementation goal:

- User A can select a release definition only after User A has a delivery.
- User A cannot select a definition or delivery delivered only to User B.
- Authenticated users cannot directly insert, update, or delete notification rows.
- Anonymous users cannot read notification tables.

## Proof Closed

`bun run prove:notification-rls` starts a temporary PostgreSQL 16 cluster, stubs the Supabase auth roles/functions needed by the migration, applies the real notification migration, seeds deterministic User A/User B rows, runs the allow/deny checks, then tears the cluster down. Passing assertions:

- same-user delivery read succeeds
- same-user definition read succeeds
- cross-user delivery read denied
- cross-user definition read denied
- authenticated direct update denied
- authenticated direct definition insert denied
- anonymous delivery read denied

## Supporting Mitigation

- `tests/vitest/notification-schema.test.ts` statically proves the migration includes the required tables, RLS enablement, scoped policies, strict revokes/grants, no authenticated update policy, safe `/workshop` action link check, unique delivery constraint, and required indexes.
- Server-action tests prove state mutations use service-role only after current-user authentication and filter by both `id` and `user_id`.
- `tests/vitest/notification-rls-proof.test.ts` is a guarded executable proof harness for same-user reads, cross-user denial, direct authenticated write denial, and anonymous denial. It skips by default and only runs when `ARCHESTIMATOR_NOTIFICATION_RLS_PROOF=1` plus local Supabase or `ARCHESTIMATOR_NOTIFICATION_RLS_BRANCH_SAFE=1` are configured.

## Future Provider Readiness

Docker-backed Supabase reset/typegen is no longer required for the current implementation goal. Before linked/provider release, run one of:

1. If Docker-backed Supabase is later available:
   - `npx supabase@2.98.2 db reset`
   - `npx supabase@2.98.2 gen types typescript --local > src/lib/supabase/types.ts`
   - `ARCHESTIMATOR_NOTIFICATION_RLS_PROOF=1 bun run test:dom -- tests/vitest/notification-rls-proof.test.ts`
2. Use an owner-approved branch-safe Supabase database, apply only the notification migration, regenerate types from that branch-safe target, and run the same RLS probes.

Do not apply this migration to linked production without explicit owner approval.
