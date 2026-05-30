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
3. If you have access to the live Supabase project, run the read-only SQL queries from 01-current-query-and-index-inventory.md.
4. Classify unindexed foreign keys into: must-index-now, monitor-until-grows, not-worth-indexing-yet, already-covered.
5. Save inventory to .ai/09_archive/store/YYYY-MM-DD-CODEX-P0-DBIDX-001/.

NON-GOALS: Creating indexes, running DDL, modifying migrations, changing app code.
```

---

## Prompt 2: Migration Parity Check

```
GOAL: Execute CODEX-P0-DBIDX-002 — Migration Parity & Shared-Link Schema Reconciliation.

You are performing a read-only reconciliation. Do NOT apply migrations or modify schema.

Steps:
1. List all local migration files in supabase/migrations/.
2. Query the live Supabase schema for all table names in the public schema.
3. Compare: list any local migrations not applied, any live tables not in local migrations.
4. Specifically check: shared_link_recipients, shared_link_comments, shared_link_responses, shared_link_events.
5. Document any mismatch as a blocker.
6. Save report to .ai/09_archive/store/YYYY-MM-DD-CODEX-P0-DBIDX-002/.

NON-GOALS: Applying migrations, creating indexes, modifying schema.
```

---

## Prompt 3: EXPLAIN Protocol Generation

```
GOAL: Execute CODEX-P0-DBIDX-003 — EXPLAIN Protocol for Critical Queries.

You are generating EXPLAIN templates. Do NOT create indexes or run DDL.

Steps:
1. For each critical flow (homebase, estimate editor, component library, publication, invite, AI audit), write the exact parameterized SELECT query that the app executes.
2. For each query, produce an EXPLAIN template with before-index baseline format.
3. Document representative seed-size assumptions (10 projects, 50 estimates, 500 nodes, 1000 row items, 5000 library items, 1000 events).
4. If staging Supabase is accessible, run EXPLAIN (without ANALYZE) on each query.
5. Save templates and results to .ai/09_archive/store/YYYY-MM-DD-CODEX-P0-DBIDX-003/.

NON-GOALS: Creating indexes, running DDL, creating seed data scripts.
```

---

## Prompt 4: Candidate Index Migration Draft

```
GOAL: Execute CODEX-P1-DBIDX-004 — Candidate Index Migration Draft for Staging.

PREREQUISITES: DBIDX-001 (audit), DBIDX-002 (parity), DBIDX-003 (EXPLAIN evidence) must all be complete.

You are drafting a candidate migration. Do NOT apply it to production.

Steps:
1. Review audit findings and EXPLAIN evidence from DBIDX-001/002/003.
2. Select only evidence-backed candidate indexes.
3. Draft a Supabase migration file with CREATE INDEX IF NOT EXISTS statements.
4. For each index, include a comment with the rationale and matching query.
5. Include a rollback migration with DROP INDEX IF NOT EXISTS.
6. Check against existing indexes to avoid duplicates.
7. Save draft as a candidate migration in the plan folder. Do NOT place in supabase/migrations/ until owner approves.

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
3. Classify each unused index: safe-to-drop, keep-for-RLS, keep-for-constraint, investigate.
4. For safe-to-drop indexes, draft DROP INDEX statements.
5. Do NOT drop indexes used by RLS policies, unique constraints, or foreign keys.
6. Save review to .ai/09_archive/store/YYYY-MM-DD-post-beta-index-review/.

NON-GOALS: Dropping indexes without owner approval, modifying constraints.
```
