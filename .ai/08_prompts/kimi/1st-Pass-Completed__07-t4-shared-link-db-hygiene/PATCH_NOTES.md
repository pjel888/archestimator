# Patch Notes: T4 Shared-Link DB Hygiene

## Files added

- `supabase/migrations-pending-review/AC-MOD-T4-EXECUTION_ORDER.md`
- `supabase/migrations-pending-review/AC-MOD-T4-P3_project_publication_events_manager_rls.sql`
- `supabase/migrations-pending-review/AC-MOD-T4-P4_shared_link_comments_public_feed_index.sql`
- `supabase/migrations-pending-review/AC-MOD-T4-P5_fk_covering_indexes.sql`
- `supabase/migrations-pending-review/AC-MOD-T4-P6_snapshot_size_guardrail.sql`
- `supabase/migrations-pending-review/AC-MOD-T4-P1_shared_link_telemetry_retention.sql`
- `supabase/migrations-pending-review/AC-MOD-T4-P7_security_rate_limit_gc.sql`
- `supabase/migrations-pending-review/AC-MOD-T4-P2_drop_redundant_token_hash_indexes.sql`
- `scripts/prove-t4-shared-link-db-hygiene-postgres.mjs`

## Files changed

- `supabase/migrations-pending-review/README.md` — replaced the single T4 row with rows for the execution-order doc and each split unit.
- `package.json` — added `prove:t4-shared-link-db-hygiene` script.

## What is NOT changed

- The original `supabase/migrations-pending-review/T4-database-pass.sql` is left in place as reference; the split files supersede it.
- No provider SQL was applied.
- No application source code was changed.
- OPT-7 and OPT-10 remain design-only and are not implemented.

## Apply runbook (for human DBA)

1. Open `supabase/migrations-pending-review/AC-MOD-T4-EXECUTION_ORDER.md`.
2. Apply units in order P3 → P4 → P5 → P6 → P1 → P7 → P2 against project `ebxxqidacheyapmmzavr`.
3. For each unit, run the preflight query, apply the SQL, run the post-check query.
4. For P1/P7, enable `pg_cron` and uncomment the schedule block only after target confirmation and backup.
5. For P2, confirm `idx_scan = 0` for both redundant indexes before dropping.
6. Move each applied file into `supabase/migrations/` with a fresh timestamp prefix.
7. Regenerate types if needed: `bun run gen:types`.
