---
title: Data Database API Network Plan
plan_id: 2026-06-29-cloudflare-migration-codex
document: 07
---

# Data Database API Network Plan

## Database Stance

Keep Supabase Postgres as the system of record during initial Cloudflare adoption.

Reason:

- The app relies on RLS everywhere.
- It has many RPC functions and Postgres-specific behavior.
- It uses generated Supabase types.
- It has service-role paths.
- It has provider-readback proof scripts.
- It has realtime collaboration on Supabase channels.
- Current migrations count is 181 SQL files, making behavioral drift likely in a direct port.

## D1 Compatibility Concerns

Cloudflare D1 is SQLite-based. Official docs describe SQLite conventions, D1 bindings, prepared statements, `batch()`, `exec()`, sessions, and Time Travel. That does not provide Postgres parity.

Gates before D1 can hold core Archestimator data:

- Map every table, column, index, constraint, trigger, policy, and RPC.
- Classify every Postgres feature as D1-native, emulatable in application code, replaceable, or blocker.
- Replace RLS with an explicit authorization layer and prove cross-workspace isolation.
- Rewrite RPC behavior or prove equivalent transactional boundaries.
- Decide generated type strategy.
- Decide migration and rollback tooling.
- Decide backup/restore tooling and destructive restore implications.
- Decide realtime replacement.
- Prove query performance at current, 10x, 100x, and 1000x estimates/projects/rows.

Recommended D1 uses before core migration:

- New low-risk metadata tables.
- Read-mostly feature flag snapshots.
- Public marketing or non-sensitive operational metadata.
- Per-tenant small datasets if the data model can be designed for D1 from scratch.

## API Plan

Current API shape:

- Next.js route handlers under `src/app/api`.
- Server Actions under `src/lib/*/actions.ts`.
- Repositories and RPC calls under `src/lib/*`.
- Supabase client access in server, browser, service-role, and proxy contexts.

Future migration must classify each route/action:

- Unaffected by provider migration.
- Can stay origin-side.
- Can move to Worker sidecar.
- Requires Hyperdrive to external Postgres.
- Requires D1 redesign.
- Requires R2 object access.
- Requires Queue producer/consumer behavior.
- Requires a Cloudflare binding, service binding, environment variable, secret, compatibility flag, or generated Worker type.

High-priority route/action families:

- Auth callback and protected route gates.
- Workshop data reads/writes.
- Project and estimate actions.
- Publication/share actions.
- Upload routes.
- Internal scan/cleanup routes.
- Resend webhook route.
- Export route.

## Network Plan

Phase 1 front-door network:

- Browser to Cloudflare DNS/CDN/WAF.
- Cloudflare to existing origin.
- Existing origin to Supabase and Resend.
- No data-path provider replacement.

Phase 2 sidecar network:

- Existing origin to Worker sidecars for bounded tasks.
- Worker sidecars to R2, Queues, KV.
- Worker sidecars to Supabase Postgres only through approved client path or Hyperdrive when appropriate.
- Worker sidecar dependencies represented as bindings, secrets, and environment-scoped config, with no Cloudflare account token exposed to runtime code.

Phase 3 hosting proof:

- Browser to Cloudflare Workers-hosted Next.js app.
- Workers to Supabase/Hyperdrive, R2, Queues, Email Service, KV, or D1 depending on slice.

## Data Integrity Requirements

- Every write path has idempotency.
- Every queue consumer is duplicate-safe.
- Every storage mutation has database consistency strategy.
- Every auth-protected read is checked at the authoritative layer.
- Every public share path remains token/password safe.
- Every rollback preserves canonical data.
