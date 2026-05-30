# Implementation Phases & Goal Cards

**Date:** 2026-05-30

## Phased Execution Order

1. **Phase 1 — Audit** (CODEX-P0-DBIDX-001): Read-only inventory. No DDL.
2. **Phase 2 — Parity** (CODEX-P0-DBIDX-002): Migration/schema reconciliation. No DDL.
3. **Phase 3 — EXPLAIN** (CODEX-P0-DBIDX-003): Query plan evidence with representative seed data. No DDL.
4. **Phase 4 — Candidate Indexes** (CODEX-P1-DBIDX-004): Draft migration for staging only. Requires audit + EXPLAIN evidence.
5. **Phase 5 — Search Strategy** (CODEX-P1-DBIDX-005): Search index plan. PLANNED only.

---

## CODEX-P0-DBIDX-001 — Database Index & Query Plan Audit

| Field | Value |
|-------|-------|
| Wave | 2 (after staging exists) |
| Lane | BETA P0 |
| Status | READY FOR CODEX (repo-only audit). Live Supabase metrics: READY ONLY IF staging access exists. |
| Owner | Codex |
| Dependencies | None for repo inspection and migration file audit. Staging preferred for live metrics. |
| Explicit non-goals | Creating indexes, running DDL, modifying migrations. Do NOT fabricate live metrics if Supabase access is unavailable. |

### Outcome
Complete index/query inventory and critical flow query map. All results documented, no DDL executed. Output MUST separate: (a) repo-derived query map, (b) migration-derived index inventory, (c) live Supabase metrics (if available), (d) gaps requiring DB access.

### Why Now
Must understand current index coverage and query patterns before beta. Prevents reactive/speculative indexing under scale pressure.

### Acceptance Criteria
1. Existing indexes inventoried from migrations and/or live schema
2. Query hotspots mapped from codebase against critical user flows
3. Supabase advisor findings summarized
4. Unindexed FK inventory classified into priority buckets
5. Critical user flows mapped to query shapes
6. No DDL executed

### Likely Files Touched
`supabase/migrations/*.sql` (read-only), `src/lib/repositories/` (read-only), plan documents in this folder

### Evidence Artifact
`.ai/09_archive/store/YYYY-MM-DD-CODEX-P0-DBIDX-001/`

---

## CODEX-P0-DBIDX-002 — Supabase Migration Parity & Shared-Link Schema Reconciliation

| Field | Value |
|-------|-------|
| Wave | 2 |
| Lane | BETA P0 |
| Status | READY FOR CODEX AFTER STAGING TARGET CONFIRMED. If staging unavailable, linked-dev read-only parity check only if explicitly allowed. Never apply migrations. |
| Owner | Codex |
| Dependencies | Staging Supabase target |
| Explicit non-goals | Creating indexes, applying migrations, modifying schema |

### Outcome
Prove local migrations, linked dev/staging schema, and code expectations match. Any drift documented as blocker.

### Why Now
Migration parity must be verified before designing indexes. Shared-link tables may not exist in the live schema despite code references.

### Acceptance Criteria
1. Local migrations list captured
2. Live schema table list captured
3. Shared-link tables checked: `shared_link_recipients`, `shared_link_comments`, `shared_link_responses`, `shared_link_events`
4. Any mismatch documented as blocker
5. No schema changes applied

### Evidence Artifact
`.ai/09_archive/store/YYYY-MM-DD-CODEX-P0-DBIDX-002/`

---

## CODEX-P0-DBIDX-003 — EXPLAIN Protocol for Critical Queries

| Field | Value |
|-------|-------|
| Wave | 2 |
| Lane | BETA P0 |
| Status | READY FOR CODEX AFTER STAGING TARGET CONFIRMED. Requires representative seed data or documented limitation. If staging data too small, EXPLAIN evidence is directional only. |
| Owner | Codex |
| Dependencies | Staging with representative seed data |
| Explicit non-goals | Creating indexes, running DDL |

### Outcome
EXPLAIN/ANALYZE protocol for estimate, library, homebase, publication, invite, and AI audit queries. Before-index baseline format defined.

### Why Now
Must have query plan evidence before any index can be proposed. Prevents speculative indexing.

### Acceptance Criteria
1. EXPLAIN templates written for all critical flows
2. Representative seed-size assumptions documented: 10 projects, 50 estimates, 500 nodes, 1,000 row items, 5,000 library items, 1,000 publication/audit events
3. Before-index baseline format defined
4. No DDL executed

### Evidence Artifact
`.ai/09_archive/store/YYYY-MM-DD-CODEX-P0-DBIDX-003/`

---

## CODEX-P1-DBIDX-004 — Candidate Index Migration Draft for Staging

| Field | Value |
|-------|-------|
| Wave | 3 (after audit + EXPLAIN) |
| Lane | BETA P1 |
| Status | READY FOR CODEX AFTER DBIDX-001/002/003 + OWNER APPROVAL |
| Owner | Codex |
| Dependencies | DBIDX-001 complete, DBIDX-002 complete, DBIDX-003 complete, Philip approval of candidate index shortlist, staging target confirmed |
| Explicit non-goals | Applying to production, creating indexes without EXPLAIN evidence. Do NOT place migration into `supabase/migrations/` unless Philip explicitly approves. Do NOT create production DDL. |

### Outcome
Draft a candidate migration for staging review only. Includes only evidence-backed indexes with rationale.

### Why Now
After audit and EXPLAIN evidence exists, draft the migration for staging testing. Do not apply to production until staging-validated.

### Acceptance Criteria
1. Migration draft includes only evidence-backed indexes
2. Each index has rationale and matching query
3. Redundant indexes avoided
4. Rollback/drop plan written
5. No production application

### ⚠️ Important
This card may create a draft migration only after owner approval of the EXPLAIN evidence. Until then, keep SQL in the plan document.

### Evidence Artifact
`.ai/09_archive/store/YYYY-MM-DD-CODEX-P1-DBIDX-004/`

---

## CODEX-P1-DBIDX-005 — Database Search Index Strategy

| Field | Value |
|-------|-------|
| Wave | 6 (enterprise MVP) |
| Lane | BETA P1 / ENTERPRISE MVP |
| Status | PLANNED. Blocked until server-side search is approved. |
| Owner | Codex |
| Dependencies | Server-side search decision |
| Explicit non-goals | Creating search indexes before search moves server-side, vector/RAG indexes. No `pg_trgm`, `tsvector`, or vector index implementation in this card. |

### Outcome
Define pg_trgm/full-text strategy if and when search moves server-side. No indexes created unless use cases are approved.

### Why Now
Search indexing must be planned before it becomes an emergency, but it must not be implemented before the product actually moves search server-side.

### Acceptance Criteria
1. Search use cases listed
2. pg_trgm vs tsvector decision documented
3. No vector/RAG index included unless explicitly approved
4. Search index candidates tied to UI search surfaces

### Evidence Artifact
`.ai/09_archive/store/YYYY-MM-DD-CODEX-P1-DBIDX-005/`
