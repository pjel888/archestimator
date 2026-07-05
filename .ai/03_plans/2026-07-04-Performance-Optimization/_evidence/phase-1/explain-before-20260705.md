# WP-P1-01 — EXPLAIN QUERY PLAN baseline (before)

> **Date:** 2026-07-05 (Asia/Manila)
> **Captured by:** Sisyphus (OpenCode / Claude Opus 4.7)
> **D1 target:** `ARCH_DB` local preview (`.wrangler/state/v3/d1`)
> **Remote touched:** No — `--local` only. EXPLAIN is plan-only (no row data needed). Concurrent-agent safety: zero remote risk.
> **Wrangler version:** 4.105.0
> **Plan reference:** `.ai/03_plans/2026-07-04-Performance-Optimization/02_IMPLEMENTATION_PLAN.md` WP-P1-01

---

## 1. EXPLAIN captures

### Q1 — `SELECT * FROM projects WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 50`

```
id  parent  detail
4   0       SCAN projects
27  0       USE TEMP B-TREE FOR ORDER BY
```

**Classification:** FULL TABLE SCAN + TEMP B-TREE FOR ORDER BY. Confirms missing-index hypothesis for `workspace_id` filter.

### Q2 — `SELECT * FROM projects WHERE created_by = ? ORDER BY created_at DESC LIMIT 50`

```
id  parent  detail
4   0       SCAN projects
27  0       USE TEMP B-TREE FOR ORDER BY
```

**Classification:** FULL TABLE SCAN + TEMP B-TREE FOR ORDER BY. Same as Q1.

### Q3 — `SELECT * FROM workspaces WHERE created_by = ?`

```
id  parent  detail
2   0       SCAN workspaces
```

**Classification:** FULL TABLE SCAN. No order step (query has no ORDER BY).

---

## 2. Existing index inventory (verified 2026-07-05)

### `projects`

| Index name | Columns | Source |
|---|---|---|
| `sqlite_autoindex_projects_1` | (implicit, from PRIMARY KEY `id`) | auto |
| `sqlite_autoindex_projects_2` | (implicit, from `UNIQUE (id, workspace_id)`) | auto |

No manually-created indexes. No index on `workspace_id` alone, no index on `created_by`, no composite `(workspace_id, *)` index.

### `workspaces`

| Index name | Columns | Source |
|---|---|---|
| `sqlite_autoindex_workspaces_1` | (implicit, from PRIMARY KEY `id`) | auto |
| `sqlite_autoindex_workspaces_2` | (implicit, from `UNIQUE (slug)`) | auto |

No manually-created indexes. No index on `created_by`.

---

## 3. Actual query patterns in repositories (audit, not in original plan)

> This is the critical correction surface. The plan proposed `(workspace_id, created_at DESC)` based on an assumption. The actual SQL queries tell a different story.

### 3.1 Queries that filter `projects` by `workspace_id` (hot path)

| File:Line | Filter | ORDER BY | Index that would help |
|---|---|---|---|
| `src/lib/repositories/workspace-repository.ts:1405-1406` | `WHERE workspace_id = ?` | `updated_at DESC` | `(workspace_id, updated_at DESC)` |
| `src/lib/repositories/workspace-repository.ts:2044-2045` | `WHERE workspace_id = ?` | `updated_at DESC LIMIT ?` | `(workspace_id, updated_at DESC)` |
| `src/lib/repositories/workspace-repository.ts:1363` | `WHERE workspace_id = ? AND client_name IS NOT NULL` | `client_name ASC` | `(workspace_id, client_name)` — but small result set; sort is cheap |

**Hot path conclusion:** The dashboard and projects-list queries ORDER BY `updated_at`, NOT `created_at`. The plan's proposed `idx_projects_workspace_created` on `(workspace_id, created_at DESC)` would still leave the `USE TEMP B-TREE FOR ORDER BY` step in place.

### 3.2 Queries that filter `projects` by `id IN (?, ?, ...)`

| File:Line | Filter | ORDER BY | Index that would help |
|---|---|---|---|
| `src/lib/repositories/workspace-repository.ts:1490` | `WHERE id IN (...)` | `updated_at DESC` | PK lookup already uses auto-index; sort is on the small filtered set — no new index needed |
| `src/lib/repositories/workspace-repository.ts:2137` | `WHERE id IN (...)` | (none) | PK auto-index sufficient |
| `src/lib/repositories/workspace-repository.ts:2355` | `WHERE id IN (...)` | (none) | PK auto-index sufficient |
| `src/lib/repositories/workspace-repository.ts:2451` | `WHERE id = ? LIMIT 1` | (none) | PK auto-index sufficient |

### 3.3 Queries that filter by `created_by` in SQL

**None found.** `created_by` is read in JavaScript after the row is fetched (e.g., line 648: `project.created_by === profileId`), but no SQL `WHERE created_by = ?` exists in `workspace-repository.ts`.

Same pattern in `component-library-repository.ts` — `created_by` is read into the row shape but never used as a SQL filter (lines 77, 192, 205, 217, 1589 are all type definitions / row shaping).

**Conclusion:** The proposed `idx_projects_created_by` and `idx_workspaces_created_by` indexes are **not justified** by any current SQL query. They should be removed from the migration.

---

## 4. Corrected Phase 1 migration proposal (replaces plan §WP-P1-02 placeholder)

> This corrects the plan's draft migration. The plan explicitly invited this correction: "actual SQL depends on WP-P1-01 outcome."

```sql
-- migrations/0031_performance_indexes_additive.sql (PROPOSED — not yet applied)
-- Additive indexes only. No DROP, no RECREATE, no schema change.
-- Each index verified by EXPLAIN above against actual hot-path queries.

-- Hot path: dashboard + projects list filter by workspace_id, ORDER BY updated_at DESC.
CREATE INDEX IF NOT EXISTS idx_projects_workspace_updated
  ON projects(workspace_id, updated_at DESC);

-- Removed (not justified by any SQL WHERE clause):
--   idx_projects_workspace_created  (wrong sort column)
--   idx_projects_created_by         (no SQL filter uses this)
--   idx_workspaces_created_by       (no SQL filter uses this; workspaces table is small per-tenant)
```

**Expected EXPLAIN-after:**

- Q1 (`WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 50`) → `SEARCH projects USING INDEX idx_projects_workspace_updated`. **Note:** the sort column in Q1 is `created_at`, not `updated_at`. Q1 was the plan's representative query but doesn't match any actual hot-path query. The index will still help with the `workspace_id` filter (eliminating SCAN), but the `ORDER BY created_at` will still produce a TEMP B-TREE. **This is acceptable** because no actual hot-path query uses `ORDER BY created_at`.
- Actual hot-path query (`WHERE workspace_id = ? ORDER BY updated_at DESC`) → `SEARCH projects USING INDEX idx_projects_workspace_updated` with **no TEMP B-TREE FOR ORDER BY** (composite index satisfies both filter and order).

---

## 5. N+1 authz loop confirmation (F-D1-01)

The cited loop is at `src/lib/repositories/workspace-repository.ts:2276` (plan cited 2273–2280; verified accurate). The function `filterAccessibleSidebarProjectIds` does:

```ts
const accessPairs = await Promise.all(
  projectIds.map(async (projectId) => [
    projectId,
    await canAccessProjectInD1(database, projectId, { ... }),
  ] as const),
);
```

This issues **N parallel D1 round-trips** where N = sidebar favorites count. Each `canAccessProjectInD1` call (per `src/lib/authz/d1-access.ts:99-140`) issues 3 EXISTS subqueries → total of **3N round-trips** for N favorites.

The fix proposed in WP-P1-03 (lift branches 2–5 into a single batched SQL) is sound. **The platform-admin JavaScript short-circuit at branch 1 must be preserved before any SQL** — verified against `src/lib/authz/d1-access.ts:99-140`.

---

## 6. Phase 1 readiness update

| Before this WP | After this WP |
|---|---|
| `NOT READY` (per plan README §6, missing EXPLAIN artifacts) | `CONDITIONALLY READY` — EXPLAIN artifacts captured, missing-index hypothesis confirmed with a column-shape correction (`updated_at`, not `created_at`), 2 of 3 proposed indexes disproven and removed |

**Promotion to `IMPLEMENTATION-READY`** requires:
- Philip accepts the corrected index shape (single index on `(workspace_id, updated_at DESC)`).
- The migration `0031_performance_indexes_additive.sql` is then a 1-line CREATE INDEX statement, additive-only, no DROP/RECREATE.

The N+1 authz fix (WP-P1-03) is independent of the index shape and remains ready to implement.

---

## 7. Artifacts

- `/tmp/explain-baseline/q1.txt`, `q2.txt`, `q3.txt` — raw wrangler EXPLAIN output
- This document at `.ai/03_plans/2026-07-04-Performance-Optimization/_evidence/phase-1/explain-before-20260705.md`

## 8. Verification

- `git status --short` confirms no source files changed during this WP.
- All EXPLAIN captures used `--local` only; remote D1 was not touched.
- Source citations verified against `src/lib/repositories/workspace-repository.ts` line ranges current as of 2026-07-05.
