# Report: T4 Shared-Link DB Hygiene

Status: 1st pass completed (local-prep; provider apply off)

## Goal

Split the monolithic pending T4 shared-link database hygiene pack into independent, reviewable units, each with preflight, rollback, post-check, and execution safety notes.

## Starting worktree

```text
 M package.json
 M supabase/migrations-pending-review/README.md
?? scripts/prove-t4-shared-link-db-hygiene-postgres.mjs
?? supabase/migrations-pending-review/AC-MOD-T4-EXECUTION_ORDER.md
?? supabase/migrations-pending-review/AC-MOD-T4-P1_shared_link_telemetry_retention.sql
?? supabase/migrations-pending-review/AC-MOD-T4-P2_drop_redundant_token_hash_indexes.sql
?? supabase/migrations-pending-review/AC-MOD-T4-P3_project_publication_events_manager_rls.sql
?? supabase/migrations-pending-review/AC-MOD-T4-P4_shared_link_comments_public_feed_index.sql
?? supabase/migrations-pending-review/AC-MOD-T4-P5_fk_covering_indexes.sql
?? supabase/migrations-pending-review/AC-MOD-T4-P6_snapshot_size_guardrail.sql
?? supabase/migrations-pending-review/AC-MOD-T4-P7_security_rate_limit_gc.sql
```

(Other unrelated changes in the checkout were preserved.)

## Unit plan

| Order | Unit | File | Status | Gating |
| --- | --- | --- | --- | --- |
| 1 | P3 — Manager-read RLS on `project_publication_events` | `AC-MOD-T4-P3_project_publication_events_manager_rls.sql` | Ready | Low risk; requires existing `can_manage_project_publication`. |
| 2 | P4 — Public comment feed covering index | `AC-MOD-T4-P4_shared_link_comments_public_feed_index.sql` | Ready | Additive partial index. |
| 3 | P5 — FK covering indexes | `AC-MOD-T4-P5_fk_covering_indexes.sql` | Ready | `CONCURRENTLY`; run outside a transaction. |
| 4 | P6 — Snapshot size guardrail | `AC-MOD-T4-P6_snapshot_size_guardrail.sql` | Ready | Additive generated column. |
| 5 | P1 — Shared-link telemetry retention | `AC-MOD-T4-P1_shared_link_telemetry_retention.sql` | Provider-gated | `pg_cron` schedule commented out; requires target confirmation + backup. |
| 6 | P7 — Rate-limit GC | `AC-MOD-T4-P7_security_rate_limit_gc.sql` | Provider-gated | `pg_cron` schedule commented out; requires target confirmation + backup. |
| 7 | P2 — Drop redundant token-hash indexes | `AC-MOD-T4-P2_drop_redundant_token_hash_indexes.sql` | Gated | Apply last; mandatory zero-scan preflight for both indexes. |

OPT-7 and OPT-10 remain design-only and out of scope.

## Changes

- `supabase/migrations-pending-review/AC-MOD-T4-EXECUTION_ORDER.md` (new)
  - Runbook describing order, risk, and gating for all units.
- `supabase/migrations-pending-review/AC-MOD-T4-P3_project_publication_events_manager_rls.sql` (new)
  - Manager-read RLS policy with preflight/post-check/rollback.
- `supabase/migrations-pending-review/AC-MOD-T4-P4_shared_link_comments_public_feed_index.sql` (new)
  - Public comment feed partial index.
- `supabase/migrations-pending-review/AC-MOD-T4-P5_fk_covering_indexes.sql` (new)
  - Four `CONCURRENTLY` FK covering indexes.
- `supabase/migrations-pending-review/AC-MOD-T4-P6_snapshot_size_guardrail.sql` (new)
  - Generated `snapshot_size_bytes` column.
- `supabase/migrations-pending-review/AC-MOD-T4-P1_shared_link_telemetry_retention.sql` (new)
  - Manual retention DELETE + commented `pg_cron` schedule.
- `supabase/migrations-pending-review/AC-MOD-T4-P7_security_rate_limit_gc.sql` (new)
  - Manual rate-limit GC DELETE + commented `pg_cron` schedule.
- `supabase/migrations-pending-review/AC-MOD-T4-P2_drop_redundant_token_hash_indexes.sql` (new)
  - Zero-scan-gated redundant index drops.
- `supabase/migrations-pending-review/README.md`
  - Replaced the single T4 row with a row pointing to the execution-order doc and rows for each unit.
- `scripts/prove-t4-shared-link-db-hygiene-postgres.mjs` (new)
  - Local Postgres proof harness applying every unit and asserting expected DDL/behavior.
- `package.json`
  - Added `prove:t4-shared-link-db-hygiene` script.

## Result

- T4 is no longer a monolithic ambiguous pack.
- Each unit has its own file, preflight, post-check, rollback, and risk label.
- `pg_cron` units are explicitly provider-gated (commented schedules).
- P2 index drops are gated on a zero-scan preflight and placed last.
- OPT-7/OPT-10 are documented as deferred design-only items.
- The local proof harness passes for all units.
- No provider SQL was applied.

## Residual risk

- A human DBA must apply units one at a time to project `ebxxqidacheyapmmzavr` in the documented order, run each preflight, and move applied files into `supabase/migrations/` with timestamp prefixes.
- P1/P7 require `pg_cron` to be enabled and a retention window agreed before uncommenting the schedule blocks.
- P2 requires a production preflight proving `idx_scan = 0` for both redundant indexes before dropping.
- After provider apply, regenerate `src/lib/supabase/types.ts` if generated columns or indexes affect the client contract.
