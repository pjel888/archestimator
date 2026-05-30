# Codebase AI Implementation Prompts

**Date:** 2026-05-30

Each prompt below is atomic and self-contained. Run one at a time. Do not chain.

---

## Prompt 1: Read-Only Query/Index Audit

```
GOAL: Execute CODEX-P0-DBIDX-001 — Database Index & Query Plan Audit.

You are performing a read-only audit. Do NOT create indexes, run DDL, or modify migrations.

Steps:
1. Read all migration files in supabase/migrations/ and catalog every CREATE INDEX statement.
2. Read src/lib/repositories/ and src/lib/publication/, src/lib/collaboration/, src/lib/ai/ — map every query method to the tables and columns it accesses.
3. **Repo-only audit is independent of live metrics.** If you have live Supabase access, run the read-only SQL queries from 01-current-query-and-index-inventory.md. If not, record "live metrics unavailable" — do NOT fabricate results.
4. **Use the corrected FK coverage query** (WITH fk_cols / fk_index_match) from doc 01. Do NOT use the old weak query.
5. Classify unindexed foreign keys into: must-index-now, monitor-until-grows, not-worth-indexing-yet, already-covered.
6. Save inventory to .ai/09_archive/store/YYYY-MM-DD-CODEX-P0-DBIDX-001/. Output MUST produce four separate, clearly labeled sections:

   **Output 1: repo-derived query map** — Every query method found in src/ mapped to tables/columns accessed.
   **Output 2: migration-derived index inventory** — Every CREATE INDEX found in supabase/migrations/.
   **Output 3: live metrics** — Supabase advisor output, pg_stat_statements snapshot, unindexed FK query results (ONLY if live DB access exists).
   **Output 4: live-metrics-unavailable note** — Explicit statement if Supabase access is missing; no fabricated data permitted.

SAFETY RULES — VIOLATIONS ARE BLOCKERS:
- Do not block repo-only audit if Supabase access is missing.
- Do not fabricate Supabase advisor output, pg_stat_statements snapshots, or live schema data.
- If using live DB, all SQL must be read-only (SELECT, EXPLAIN only). No DDL, no CREATE, no ALTER, no DROP.
- Do not run DDL of any kind.
- Do not create or modify migration files.

NON-GOALS: Creating indexes, running DDL, modifying migrations, changing app code.
```

---

## Prompt 2: Migration Parity Check

```
GOAL: Execute CODEX-P0-DBIDX-002 — Migration Parity & Shared-Link Schema Reconciliation.

You are performing a read-only reconciliation. Do NOT apply migrations or modify schema.

Steps:
1. List all local migration files in supabase/migrations/.
2. Query the live Supabase schema for all table names in the public schema (run both `information_schema.tables` and `supabase_migrations.schema_migrations` queries from doc 01).
3. Compare: list missing tables and missing migration versions **separately**.
4. Specifically check: shared_link_recipients, shared_link_comments, shared_link_responses, shared_link_events.
5. **Shared-link table parity is a hard blocker** for shared-link recipient indexing.
6. Document any mismatch as a blocker.
7. Save report to .ai/09_archive/store/YYYY-MM-DD-CODEX-P0-DBIDX-002/.

NON-GOALS: Applying migrations, creating indexes, modifying schema.
```

---

## Prompt 3: EXPLAIN Protocol Generation

```
GOAL: Execute CODEX-P0-DBIDX-003 — EXPLAIN Protocol for Critical Queries.

You are generating EXPLAIN templates. Do NOT create indexes or run DDL.

Steps:
1. For each critical flow (homebase, estimate editor, component library, publication, invite, AI audit), use the concrete EXPLAIN templates from doc 05.
2. For each query, produce an EXPLAIN template with before-index baseline format.
3. Document representative seed-size assumptions (10 projects, 50 estimates, 500 nodes, 1000 row items, 5000 library items, 1000 events).
4. If staging Supabase is accessible, run EXPLAIN (without ANALYZE) on each query. Do NOT run EXPLAIN ANALYZE on production.
5. Run `ANALYZE table_name` on staging after seed load if allowed.
6. Save templates and results to .ai/09_archive/store/YYYY-MM-DD-CODEX-P0-DBIDX-003/.

NON-GOALS: Creating indexes, running DDL, creating seed data scripts.
```

---

## Prompt 4: Candidate Index Migration Draft

```
GOAL: Execute CODEX-P1-DBIDX-004 — Candidate Index Migration Draft for Staging.

PREREQUISITES: DBIDX-001 (audit), DBIDX-002 (parity), DBIDX-003 (EXPLAIN evidence) must all be complete. **Philip must approve the candidate index shortlist before drafting.**

You are drafting a candidate migration. Do NOT apply it to production. Do NOT place it in supabase/migrations/.

Steps:
1. Review audit findings and EXPLAIN evidence from DBIDX-001/002/003.
2. Select only evidence-backed candidate indexes from the owner-approved shortlist.
3. Draft a SQL file with CREATE INDEX IF NOT EXISTS statements. **Save inside the plan folder**, not supabase/migrations/.
4. For each index, include a comment with the rationale and matching query.
5. Include a duplicate-index analysis table (check against existing pg_indexes output).
6. Include a rollback/drop-index section.
7. Do NOT use CREATE INDEX CONCURRENTLY inside a normal Supabase migration draft.

NON-GOALS: Applying to production, creating indexes without EXPLAIN evidence, placing in migration folder.
```

---

## Prompt 5: Search Indexing Strategy

```
GOAL: Execute CODEX-P1-DBIDX-005 — Database Search Index Strategy.

PREREQUISITES: Server-side search decision must be made before this card executes.

You are planning a search index strategy. Do NOT create indexes.

Steps:
1. List all current and planned search use cases in the UI.
2. For each use case, recommend: B-tree (exact), pg_trgm + GIN (fuzzy), or tsvector + GIN (full-text).
3. Document which Postgres extensions need to be enabled.
4. Do NOT propose vector/RAG indexes unless separately approved.
5. Save strategy to .ai/09_archive/store/YYYY-MM-DD-CODEX-P1-DBIDX-005/.

NON-GOALS: Creating indexes, enabling extensions, implementing search UI.
```

---

## Prompt 6: Post-Beta Unused Index Review

```
GOAL: Review and clean up unused indexes after beta period.

PREREQUISITES: Beta must be active with real user data.

Steps:
1. Query pg_stat_user_indexes for indexes with idx_scan = 0.
2. Cross-reference with pg_stat_statements to confirm no query uses them.
3. **Do NOT drop indexes that enforce unique/primary constraints.** Verify each index is not constraint-backed before classifying as safe-to-drop.
4. Classify each unused index: safe-to-drop, keep-for-RLS, keep-for-constraint, investigate.
5. For safe-to-drop indexes, draft DROP INDEX statements.
6. **Require at least 30 days of beta traffic** or owner-approved shorter review window. Do not drop based on one short observation window.
7. Save review to .ai/09_archive/store/YYYY-MM-DD-post-beta-index-review/.

NON-GOALS: Dropping indexes without owner approval, modifying constraints.
```
