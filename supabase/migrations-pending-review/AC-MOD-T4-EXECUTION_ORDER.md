# AC-MOD-T4 Shared-Link DB Hygiene — Execution Order

This document replaces the monolithic `T4-database-pass.sql` with independent, reviewable units. Each unit has its own preflight, rollback, and post-check in the file header.

**Provider apply is OFF by default.** A human DBA must review each unit, run its preflight, apply it in a maintenance window against project `ebxxqidacheyapmmzavr`, and then move the applied file into `supabase/migrations/` with a fresh timestamp prefix.

## Apply order

Run units in this order: additive/low-risk first, destructive/gated last.

| Order | Unit | File | Risk | Provider-gated notes |
| --- | --- | --- | --- | --- |
| 1 | P3 — Manager-read RLS on `project_publication_events` | `AC-MOD-T4-P3_project_publication_events_manager_rls.sql` | Low | Requires `can_manage_project_publication(project_id)` already present. |
| 2 | P4 — Public comment feed covering index | `AC-MOD-T4-P4_shared_link_comments_public_feed_index.sql` | Low | Additive partial index. |
| 3 | P5 — FK covering indexes | `AC-MOD-T4-P5_fk_covering_indexes.sql` | Low | `CONCURRENTLY`; run outside a transaction. |
| 4 | P6 — Snapshot size guardrail | `AC-MOD-T4-P6_snapshot_size_guardrail.sql` | Low | Additive generated column. |
| 5 | P1 — Shared-link telemetry retention | `AC-MOD-T4-P1_shared_link_telemetry_retention.sql` | Medium | `pg_cron` schedule is commented out; requires explicit target confirmation + backup. |
| 6 | P7 — Rate-limit GC | `AC-MOD-T4-P7_security_rate_limit_gc.sql` | Medium | `pg_cron` schedule is commented out; requires explicit target confirmation + backup. |
| 7 | P2 — Drop redundant token-hash indexes | `AC-MOD-T4-P2_drop_redundant_token_hash_indexes.sql` | Medium | **Apply last.** Mandatory zero-scan preflight for both indexes. |

## Deferred design-only items

- **OPT-7** — Snapshot row de-dup + `snapshot_hash` column. Larger table rewrite + app-side hash-on-publish; design separately.
- **OPT-10** — Unified activity RPC / `UNION ALL` view for `loadSharedLinkActivity`. Larger; design when the DB pass is opened.

Both are intentionally out of scope for this hygiene pass.

## Verification checklist per unit

- [ ] P3: `pg_policy` shows the new policy; RLS is enabled on `project_publication_events`.
- [ ] P4: `pg_indexes` shows `shared_link_comments_public_feed_idx` with `WHERE is_internal = false`.
- [ ] P5: all four indexes exist and are valid.
- [ ] P6: `snapshot_size_bytes` generated column exists and tracks `octet_length(snapshot_json::text)`.
- [ ] P1: no `project_publication_events` or `shared_link_events` rows older than 180 days remain; `pg_cron` schedule enabled only after target confirmation.
- [ ] P7: no expired `security_rate_limit_events` rows remain (`expires_at < now()`); `pg_cron` schedule enabled only after target confirmation.
- [ ] P2: `pg_stat_user_indexes` shows zero rows for `project_publications_token_hash_idx` and `shared_link_recipients_token_hash_idx`; unique token-hash indexes remain.
