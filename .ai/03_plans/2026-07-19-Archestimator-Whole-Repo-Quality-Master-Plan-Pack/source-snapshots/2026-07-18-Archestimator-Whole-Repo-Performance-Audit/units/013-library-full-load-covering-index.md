# UNIT-013 — Library Full-Load Paginated Scan Has No Covering Index For `ORDER BY category, name` · PERF-D1-003

**Finding:** PERF-D1-003 · **Priority:** P2 · **Wave:** 3 (W3-7) · **Effort:** S (path) / M (index) · **Risk:** Low (path) / Medium (index)
**Roadmap item:** W3-7 · **Test decision:** `NOT_REQUIRED`
**local_implementation:** `NOT_STARTED` · **external_lifecycle:** `AUTH_BLOCKED` (hosted EXPLAIN gate)

## Outcome

The legacy library full-load path (when `itemLimit` and `itemIds` are both
undefined) no longer triggers a full workspace scan + sort per 1,000-row page.
Either the path is migrated to use the existing cursor index from migration
0083, or — only if `EXPLAIN QUERY PLAN` proves it justified — a new compound
index `(workspace_id, lifecycle_state, category, name)` is added. Large-tier
(10,000-item) page latency drops accordingly.

## Affected surface

- `src/lib/repositories/component-library-repository.ts:542,555,561-575,293` —
  the legacy full-load while-loop paginating 1,000 rows/page ordered by
  `(category ASC, name ASC) LIMIT ? OFFSET ?`
- `migrations/0026_cost_library_indexes.sql:67-73` — existing indexes (do not
  cover `ORDER BY category, name`)
- `migrations/0083_component_library_browse_cursor_index.sql:1-3` — partial
  `(workspace_id, created_at DESC, id ASC) WHERE lifecycle_state <> 'archived'`
  cursor index (used by the browse path; **not** the legacy full-load path)

## Dependencies

- **`EXPLAIN QUERY PLAN` against representative data (W0-6)** — required to
  decide between path migration (option 1) and a new index (option 3). The
  finding explicitly says "Do not add the index speculatively — needs EXPLAIN
  before/after per AGENTS.md." This is a hard prerequisite for option 3, and
  the recommended validation for option 1.
- Hosted credentials gate the EXPLAIN campaign (BLOCKED W0-6). Until that
  opens, `external_lifecycle` stays `AUTH_BLOCKED` against the EXPLAIN gate.
- No AUTH_BOUNDARY violation — local migration + source only.

## Implementation intent

From PERF-D1-003 "Recommendation" (do (1) always; (2) is the likely outcome;
(3) only if EXPLAIN proves it):

1. **Confirm with `EXPLAIN QUERY PLAN`** whether the existing cursor index
   (0083) is used or bypassed by the legacy full-load path. **Do not skip
   this** even for the path-migration option — it confirms the diagnosis.
2. **If bypassed, migrate the legacy load path** at `:561-575` to use the
   cursor index (rewrite the while-loop to keyset-paginate on
   `(created_at DESC, id ASC)` instead of `OFFSET` on `(category, name)`).
   This is option 2 — preferred because it adds no migration.
3. **Only if EXPLAIN proves a new index is justified**, add
   `(workspace_id, lifecycle_state, category, name)` via a new migration with
   a write-plan. **Do not add speculatively.** This is option 3 — higher
   write/storage cost.

Constraints (from finding): preserve exact ordering semantics; preserve
workspace scoping; preserve lifecycle filter. If option 2 changes the
ordering (cursor vs `(category, name)`), confirm the consumer tolerates the
new order or keep `(category, name)` ordering with option 3.

## Expected evidence

Verification command from PERF-D1-003 "Verification":

```
# EXPLAIN QUERY PLAN before/after; query latency p50/p95 at Large tier
# (10,000 items)
wrangler d1 execute ARCH_DB --remote --command \
  "EXPLAIN QUERY PLAN SELECT * FROM cost_library_items WHERE workspace_id='w' ORDER BY category ASC, name ASC LIMIT 1000 OFFSET 0"
```

Evidence class: `NOT_REQUIRED` for the static change *only after EXPLAIN is
collected* — the diff plus the EXPLAIN before/after is the decisive non-test
signal. Without EXPLAIN, the change cannot be validated per the finding's
explicit constraint. The Large-tier p50/p95 latency probe is hosted-gated
follow-up.

## Completion signal

- `EXPLAIN QUERY PLAN` artifacts under `artifacts/query-plans/` (W0-6 output)
  show the diagnosis.
- Either the legacy load path is rewritten to use the cursor index (option 2),
  OR a new migration adds `(workspace_id, lifecycle_state, category, name)`
  with EXPLAIN before/after proving the index is used (option 3).
- `external_lifecycle` flips from `AUTH_BLOCKED` to `ACHIEVED` only after
  EXPLAIN validates the fix.

## Recovery path

**Required for option 3 (Risk: Medium — new index has write/storage cost).**
If the new index degrades write throughput measurably, drop it via a revert
migration and fall back to option 2 (path migration). Option 2 is preferred
exactly because it has no migration to revert.

**Not required for option 2 (Risk: Low).** Revert the path rewrite — the
legacy `OFFSET` scan returns as the worst case.
