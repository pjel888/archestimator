# WP-P1-01 / WP-P1-02 — EXPLAIN-after artifacts

> **Date:** 2026-07-05 (Asia/Manila)
> **Migration applied:** `migrations/0031_performance_indexes_additive.sql` (local only at this point; remote application follows)
> **D1 target:** `ARCH_DB` local preview
> **Plan reference:** `.ai/03_plans/2026-07-04-Performance-Optimization/02_IMPLEMENTATION_PLAN.md` WP-P1-01 / WP-P1-02

---

## 1. EXPLAIN-after captures

### Q-actual-1 — `WHERE workspace_id = ? ORDER BY updated_at DESC LIMIT 50` (the real dashboard query)

```
id  parent  detail
5   0       SEARCH projects USING INDEX idx_projects_workspace_updated (workspace_id=?)
```

**Classification:** Index walk, **no sort step**. Composite index satisfies both filter (`workspace_id`) and sort (`updated_at DESC`). This is the optimal plan.

### Q-actual-2 — `WHERE workspace_id = ? ORDER BY updated_at DESC LIMIT 6` (dashboard list query)

```
id  parent  detail
5   0       SEARCH projects USING INDEX idx_projects_workspace_updated (workspace_id=?)
```

**Classification:** Same as Q-actual-1 — index walk, no sort. ✅

### Q-plan-rep — `WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 50` (plan's representative query, NOT a real hot-path)

```
id  parent  detail
5   0       SEARCH projects USING INDEX idx_projects_workspace_updated (workspace_id=?)
29  0       USE TEMP B-TREE FOR ORDER BY
```

**Classification:** Index walk on filter, but TEMP B-TREE for sort because the sort column (`created_at`) does not match the index's secondary column (`updated_at`). As predicted in `explain-before-20260705.md` §4. **This is acceptable** because no actual hot-path query uses `ORDER BY created_at`.

---

## 2. Before / after comparison

| Query | Before | After |
|---|---|---|
| Hot-path #1 (line 1398): `WHERE workspace_id = ? ORDER BY updated_at DESC` | SCAN projects + TEMP B-TREE FOR ORDER BY | **SEARCH USING INDEX** (single index walk, no sort) |
| Hot-path #2 (line 2034): `WHERE workspace_id = ? ORDER BY updated_at DESC LIMIT ?` | SCAN projects + TEMP B-TREE FOR ORDER BY | **SEARCH USING INDEX** (single index walk, no sort) |
| Plan's representative query (ORDER BY created_at) | SCAN projects + TEMP B-TREE FOR ORDER BY | SEARCH USING INDEX on filter + TEMP B-TREE for sort (sort column mismatch — acceptable, not a real query) |

**Result:** All actual hot-path queries now full-index-served. The migration achieves the WP-P1-01 stop condition: "Confirm SEARCH ... USING INDEX for each."

---

## 3. Verification commands

```bash
# Local application
wrangler d1 migrations apply ARCH_DB --local
# Result: ✅ 0031_performance_indexes_additive.sql applied successfully

# Index inventory check
wrangler d1 execute ARCH_DB --local --command "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='projects' AND name LIKE 'idx_%';"
# Result: idx_projects_workspace_updated (1 row)

# EXPLAIN-after captures (above)
wrangler d1 execute ARCH_DB --local --command "EXPLAIN QUERY PLAN SELECT * FROM projects WHERE workspace_id = ? ORDER BY updated_at DESC LIMIT 50;"
# Result: SEARCH projects USING INDEX idx_projects_workspace_updated (workspace_id=?)
```

---

## 4. Index inventory after migration

### `projects`

| Index name | Columns | Source |
|---|---|---|
| `sqlite_autoindex_projects_1` | (PRIMARY KEY `id`) | auto |
| `sqlite_autoindex_projects_2` | (UNIQUE `(id, workspace_id)`) | auto |
| `idx_projects_workspace_updated` | `(workspace_id, updated_at DESC)` | **0031 (new)** |

### `workspaces` (unchanged — no new index justified)

| Index name | Columns | Source |
|---|---|---|
| `sqlite_autoindex_workspaces_1` | (PRIMARY KEY `id`) | auto |
| `sqlite_autoindex_workspaces_2` | (UNIQUE `slug`) | auto |

---

## 5. Rollback path

If the migration causes a regression, rollback is:

```sql
DROP INDEX IF EXISTS idx_projects_workspace_updated;
```

D1 has no `DOWN` migration file, but the additive index is safe to leave in place even if unused. Dropping it would revert query plans to the `SCAN + TEMP B-TREE` baseline.

---

## 6. Phase 1 readiness update

| Before migration applied | After migration applied locally |
|---|---|
| EXPLAIN-before confirmed missing index but no fix applied | EXPLAIN-after confirms hot-path queries use the new index with no sort step |

**Promotion:** Phase 1 → `IMPLEMENTATION-READY` for the index portion. The N+1 authz fix (WP-P1-03) was implemented in parallel and verified by 11/11 passing vitest cases. Phase 1 ships as a single PR.

---

## 7. Verification

- `git status --short` confirms migration file added, source files modified as expected (workspace-repository.ts), test files added/updated.
- Local migration application succeeded; remote application pending.
- All EXPLAIN captures used `--local` only at this point; remote EXPLAIN-after will follow after remote application.
