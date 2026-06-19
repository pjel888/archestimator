# Pending-review migrations — Shared Link Improvement Plan (Track T5 / T4 [DB])

**2026-06-19 provider closeout:** Codex applied the reviewed safe subset directly
to linked Supabase project `ebxxqidacheyapmmzavr` with live preflight/post-check
evidence under `.ai/99_scratch/codex-provider-apply-20260619/` (ignored local
scratch). Applied: `AC-MOD-04`, `AC-MOD-06`, T4 `P3`, `P4`, `P5` (split into
single `CONCURRENTLY` statements for the Management API), `P6`, `P1`, `P7`, and
the existing `20260618184856_workspace_homebase_summary.sql` migration. T4 `P2`
was **not** applied because the mandatory zero-scan preflight failed:
`project_publications_token_hash_idx.idx_scan = 215` while
`shared_link_recipients_token_hash_idx.idx_scan = 0`. Leave `P2` gated until both
target indexes show zero scans and unique replacements remain present.

**These `.sql` files were originally REVIEWED but DELIBERATELY NOT APPLIED.** They live OUTSIDE
`supabase/migrations/` so the Supabase CLI will **not** auto-apply them on
`supabase db push`. They were authored by an agent without a DB write channel
(Docker absent + hosted SQL by agents denied), per the plan's
`No DB write channel` constraint
(`.ai/03_plans/2026-06-13-Shared-Link-Improvement-Plan/14_IMPLEMENTATION_HANDOFF_PROMPT.md` §2.2).

A human DBA/agent must: review each not-yet-applied file, run its **pre-flight**
checks, apply it in a maintenance window, and then record the provider evidence
and migration-history decision. Do **not** re-apply the 2026-06-19 applied subset
without first checking the live post-check evidence and object existence.

## Index

| File | AC | What it does | Risk |
|---|---|---|---|
| `AC-MOD-04_shared_link_responses_recipient_set_null.sql` | AC-MOD-04 | Make a recipient hard-delete preserve their locked decision row (`recipient_id` → `ON DELETE SET NULL`) instead of CASCADE-destroying it. | Low (additive nullability; mirrors the existing `shared_link_comments` behavior) |
| `AC-MOD-06_one_published_publication_per_project.sql` | AC-MOD-06 | Add a partial unique index so a project can never have two simultaneously-`published` publication rows (closes the rotate/create race window B). | Medium — requires de-duplicating any existing duplicates FIRST |
| `AC-MOD-T4-EXECUTION_ORDER.md` | Track T4 (DB pass) | Index hygiene (P2/P4/P5), RLS-on-events (P3), telemetry retention (P1, pg_cron), rate-limit GC (P7, pg_cron), snapshot-size guardrail (P6); split into independent units under `AC-MOD-T4-P*.sql`. OPT-7/OPT-10 noted as larger follow-ups. Each unit has its own pre-flight + rollback. | Low (additive) except the P2 index drops (gated on a verified-zero-scan pre-flight) |
| `AC-MOD-T4-P3_project_publication_events_manager_rls.sql` | Track T4 P3 | Manager-read RLS policy for `project_publication_events`. | Low |
| `AC-MOD-T4-P4_shared_link_comments_public_feed_index.sql` | Track T4 P4 | Covering index for public shared-link comment feed. | Low |
| `AC-MOD-T4-P5_fk_covering_indexes.sql` | Track T4 P5 | Covering indexes for unindexed FKs. | Low |
| `AC-MOD-T4-P6_snapshot_size_guardrail.sql` | Track T4 P6 | Generated `snapshot_size_bytes` column on `project_publications`. | Low |
| `AC-MOD-T4-P1_shared_link_telemetry_retention.sql` | Track T4 P1 | Telemetry retention deletes + commented `pg_cron` schedule. | Medium |
| `AC-MOD-T4-P7_security_rate_limit_gc.sql` | Track T4 P7 | Rate-limit event GC deletes + commented `pg_cron` schedule. | Medium |
| `AC-MOD-T4-P2_drop_redundant_token_hash_indexes.sql` | Track T4 P2 | Drop redundant token-hash indexes; zero-scan gated. | Medium |
| `deferred/20260528103341_ai_package_builder_memory.sql` | Database Migration Check | Package-builder memory table/RLS surface. | Deferred while `AI_PACKAGE_BUILDER_MEMORY_ENABLED` remains default-off and provider table is absent. |
| `deferred/20260614021500_get_project_chart_buckets_rpc.sql` | Database Migration Check | Future chart bucket push-down RPC. | Deferred while charts use the proven server-side JS reducer. Needs explicit public/anon execute revokes before apply. |
| `superseded/20260611031500_estimate_node_sibling_order_stored.sql` | Database Migration Check | Old sibling-order RPC rewrite. | Superseded by the live 9-argument tab-aware `create_estimate_node_with_history`; do not apply as-is. |

## Application order

`AC-MOD-04` and `AC-MOD-06` are independent and can be applied in either order.
Each is additive and backward-compatible with the application code already shipped
on `claude/2026-06-13-Shared-Link-Improvement-Plan`:

- The app already shows a **confirmation dialog** before removing a recipient with a
  decision (AC-MOD-04 UI half is live); applying the SQL makes the underlying delete
  **non-destructive** to the decision row.
- The app already **rotates links in place** (AC-MOD-02), which removes the common
  source of duplicate-published rows; the partial unique index (AC-MOD-06) is the
  belt-and-suspenders DB guarantee.

## Track T4 (deferred DB pass)

The broader Track T4 design-ready DDL (index hygiene, RLS-on-events, event
retention via `pg_cron`, rate-limit GC, snapshot row de-dup, activity UNION RPC)
is specified in `05_DATABASE_AUDIT.md §4-A` and is **execution-deferred** under the
same no-DB-channel constraint. Add those files here when authored.
