# 07 — Data, Database, API, Network Plan

## D1 boundary (evidence: `wrangler.jsonc`)

- Binding `ARCH_DB` → database `archestimator-proof-db` (id `9bdb29bb-687e-4f51-ae81-7659c426ea5f`).
- Preview binding `363c756a-7c4d-42fe-908f-6d328bfa4acb`.
- All P1/P2 work stays inside this binding. No other D1 database, no other provider project.

## Migration sequence

Active migrations run to `0036_cost_library_component_drafts.sql`. P1 adds:

- `0037_favorites_user_indexes_additive.sql` — gaps G1 + G2.
- `0038_responses_and_adjustments_indexes_additive.sql` — gaps G3 + G4.

Numbering to be re-confirmed at execution (README checklist step 5 — sibling pack `2026-07-07-d1-migration-state-and-schema-integrity` may claim a number). Both are additive; order between them is arbitrary but `0037` then `0038` is the canonical sequence.

## Database Change Blueprints

### Blueprint DB-CHG-001 — `0037_favorites_user_indexes_additive.sql` (G1 + G2)

- **Tables/indexes affected:** `estimate_favorites`, `project_favorites`. New indexes only; no column changes.
- **SQL sketch:**
  ```sql
  -- G1: HP-1/HP-2 estimate_favorites by user_id with created_at DESC for LIMIT reads
  CREATE INDEX IF NOT EXISTS idx_estimate_favorites_user_created
    ON estimate_favorites (user_id, created_at DESC);

  -- G2: HP-1/HP-2 project_favorites by user_id with created_at DESC for LIMIT reads
  CREATE INDEX IF NOT EXISTS idx_project_favorites_user_created
    ON project_favorites (user_id, created_at DESC);
  ```
- **Why additive:** `CREATE INDEX IF NOT EXISTS`. Coexists with the implicit `UNIQUE(user_id, estimate_id)` / `UNIQUE(user_id, project_id)` indexes. The explicit index guarantees the `(user_id, created_at DESC)` covering path used by `workspace-repository.ts:2056-2072`, `:2379-2394`, `:1418-1422` without relying on SQLite's implicit constraint-index column order.
- **Backfill:** none (index build on existing rows; D1 online).
- **Data-volume assumptions:** at 1× first-user volume, <100 rows per workspace in each table; at 100×, <10k. Index build is sub-second.
- **Concurrency/locks:** D1 CREATE INDEX is online; no app downtime.
- **Expected query count per route:** unchanged (HP-1/HP-2 still issue the same number of statements); the win is per-statement latency + TEMP B-TREE elimination.
- **Cardinality:** user_id is high-cardinality; selectivity excellent.
- **Pagination/filter:** directly serves `ORDER BY created_at DESC LIMIT ?`.
- **Cost:** two narrow indexes; negligible storage on free-tier.
- **Generated type impact:** none (no binding/env change). No `cf:typegen`.
- **Rollback:** `DROP INDEX IF EXISTS idx_estimate_favorites_user_created; DROP INDEX IF EXISTS idx_project_favorites_user_created;` Safe; reads fall back to the implicit UNIQUE index.
- **Local proof:** `bun run cf:d1-runtime-proof` after apply; `EXPLAIN QUERY PLAN` on `SELECT … FROM estimate_favorites WHERE user_id=? ORDER BY created_at DESC LIMIT ?` confirms index use.
- **Linked-provider proof boundary:** hosted D1 `EXPLAIN` is the authoritative gate (P4 `T-P4-03`); local sqlite3 plan is a proxy.
- **EXPLAIN expectation:** `SEARCH estimate_favorites USING INDEX idx_estimate_favorites_user_created` with no `TEMP B-TREE FOR ORDER BY`.

### Blueprint DB-CHG-002 — `0038_responses_and_adjustments_indexes_additive.sql` (G3 + G4)

- **Tables/indexes affected:** `shared_link_responses`, `estimate_sheet_adjustments`.
- **G3 SQL sketch:**
  ```sql
  CREATE INDEX IF NOT EXISTS idx_shared_link_responses_publication_recipient
    ON shared_link_responses (publication_id, recipient_id, created_at DESC);
  ```
  Serves the HP-7 correlated subquery `WHERE publication_id=? AND recipient_id=? ORDER BY created_at DESC LIMIT 1` (`recipient-proposals-repository.ts:139-146`).
- **G4 SQL sketch (conditional on column confirmation — DISCOVERY step in `T-P1-02`):**
  ```sql
  -- Only if idx_estimate_sheet_adjustments_updated does NOT lead on estimate_id:
  CREATE INDEX IF NOT EXISTS idx_estimate_sheet_adjustments_estimate
    ON estimate_sheet_adjustments (estimate_id);
  ```
  Serves HP-4 `WHERE estimate_id=? LIMIT 1` (`workspace-repository.ts:3276-3286`).
- **Why additive:** same rationale as DB-CHG-001.
- **Backfill:** none.
- **Data-volume assumptions:** `shared_link_responses` grows with recipient engagement; at 100×, low thousands per publication. The `(publication_id, recipient_id, …)` composite pins the per-recipient lookup to a single index probe.
- **Concurrency/locks:** online.
- **Expected query count per route:** unchanged.
- **Cardinality:** `(publication_id, recipient_id)` is near-unique; excellent selectivity.
- **Cost:** two narrow indexes.
- **Generated type impact:** none.
- **Rollback:** `DROP INDEX IF EXISTS …` for each.
- **Local proof:** `EXPLAIN QUERY PLAN` on the HP-7 correlated subquery confirms `USING INDEX idx_shared_link_responses_publication_recipient`.
- **EXPLAIN expectation:** single-row probe, no scan.

### Blueprint DB-CHG-003 — G5 category cache (no migration)

G5 (`component_category_nodes` global scan) is resolved by an app-layer TTL cache in `component-library-repository.ts` (`T-P2-03`), not an index, because no index helps a full-taxonomy `ORDER BY sort_order, label` scan over a small static table. Rationale recorded in `15`.

## Repository query-count expectations (post-P2)

| HP | Route | Queries before | Queries after P2 | Rationale |
|---|---|---|---|---|
| HP-1 | workshop home | ~13–15 | ~13–15 (no count change; latency win from indexes) | Indexes reduce per-statement cost, not count |
| HP-2 | projects list | ~11 | ~11 | Same |
| HP-3 | project view | ~6–8 | ~6–8 | Same |
| HP-5 | estimates list | ~4 + N×1 (N+1) | ~5 (batched) | **`T-P2-01` kills the N+1** |
| HP-6 | library | ~5–9 | ~4–8 (category cache removes 1 scan) | `T-P2-03` |
| HP-7 | proposals | 1 | 1 | Index win only |

The headline query-count reduction is HP-5 (from `4 + N` to `~5`).

## API / network behavior

- No new public API. The `/__cloudflare/d1-performance-proof` route is extended (P4) but remains `CRON_SECRET`-gated and is not a user API.
- No versioning, pagination, rate-limit, or retry changes to user-facing APIs.
- The hosted proof endpoint already handles `Bearer CRON_SECRET`; P4 reuses that auth, adds no new credential.

## Data integrity, retention, recovery

- No data retention or deletion changes.
- No backup/restore changes (sibling pack owns D1/R2 backup ops).
- P1 migrations are reversible via `DROP INDEX`; the daily D1 backup + `cf:d1-restore-rehearsal` script is the recovery path if an index build degrades a query (defensive — not expected).

## Transaction boundaries

Unchanged. The N+1 fix (`T-P2-01`) is a read-path batching change; it does not introduce a new transaction. The batched capability check is a single `SELECT` (read-only), no transaction needed.

## D1 cost / free-tier posture

- 4 new indexes (2 in `0037`, up to 2 in `0038`). Storage impact negligible.
- No paid features (PERF-008).
- Hosted proof runs read-only SQL; no write amplification.
