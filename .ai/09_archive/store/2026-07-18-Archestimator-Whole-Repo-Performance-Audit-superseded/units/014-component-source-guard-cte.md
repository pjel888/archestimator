# UNIT-014 — Component-Source Guard Issues 15+ `json_extract` Correlations Per Propagation Job · PERF-D1-004

**Finding:** PERF-D1-004 · **Priority:** P3 · **Wave:** 3 (W3-8) · **Effort:** M · **Risk:** Medium
**Roadmap item:** W3-8 · **Test decision:** `TEST_PROPOSAL` (mutation correctness surface benefits from a guard test)
**local_implementation:** `NOT_STARTED` · **external_lifecycle:** `AUTH_BLOCKED` (hosted EXPLAIN + fanout-proof gates)

## Outcome

Each linked-Template propagation job's component-source and row-revision
guards scan each joined table once (via a `WITH expected(...) AS (SELECT ...
FROM json_each(?))` CTE) instead of ~15 `json_extract` correlations per
table. Propagation job wall-time drops at large component counts without
weakening guard correctness.

## Affected surface

- `src/lib/component-library/template-propagation-d1.ts:472-502` — component-source guard
- `src/lib/component-library/template-propagation-d1.ts:503-519` — row-revision guard
- Both run inside `applyClaimedJob`'s atomic batch

## Dependencies

- **`EXPLAIN QUERY PLAN` (W0-6)** — required to confirm the guard is hot and
  to validate the CTE refactor before/after. The finding explicitly says
  "Confirm with EXPLAIN (BLOCKED)."
- **K-10 linked-Template fanout hosted proof (W3-2)** — required to measure
  propagation convergence time at 500-instance / 100-row-template tier. The
  static change can ship without it; `external_lifecycle` ACHIEVED needs the
  fanout measurement.
- This finding is a **sub-finding of K-10** (per the register) — coordinate
  with the broader fanout-proof work.
- No AUTH_BOUNDARY violation — local source only.

## Implementation intent

From PERF-D1-004 "Recommendation" (do (1); (2) is the precondition):

1. **Confirm with EXPLAIN** that the guard is hot. If EXPLAIN shows the guard
   is cheap (e.g. the array is small in practice), **defer this unit** — the
   refactor is not justified without a measured cost.
2. **If the guard is hot**, pre-resolve the expected array into a CTE so each
   table scans once:
   ```sql
   WITH expected(itemId, ...) AS (
     SELECT json_extract(value, '$.itemId'), ...
     FROM json_each(?)
   )
   SELECT ... FROM cost_library_items item
   JOIN expected ON expected.itemId = item.id
   ...
   ```
   Apply the same CTE shape to both guards (`:472-502` and `:503-519`).

Constraints (from finding): preserve guard correctness — the guard **must
catch missing/drifted component sources**. The CTE refactor is a performance
rewrite of the same logical check; do not weaken the predicate set.

## Variants

This unit is in the same domain as the variant-handling note from the
memory prompt. The propagation guards at `:472-519` join
`cost_library_item_variant_cost_entries` (one of the three joined tables) and
exist precisely to validate variant drift. The CTE refactor must preserve
the variant-cost-entry join predicate-by-predicate. **No additional variant
accommodation is required** — the existing guard already covers variant
correctness; this unit only restructures how the join is computed.

## Expected evidence

Verification command from PERF-D1-004 "Verification":

```
# EXPLAIN before/after; propagation convergence time at 500-instance /
# 100-row-template tier
wrangler d1 execute ARCH_DB --remote --command \
  "EXPLAIN QUERY PLAN <refactored guard query>"
```

Evidence class: `TEST_PROPOSAL` — mutation correctness surface (the guard
protects propagation integrity). Proposed test: a template with a drifted
component source still fails propagation after the CTE refactor (proves the
guard still catches drift). Do NOT execute without explicit user
authorization. The static change (diff + EXPLAIN before/after) is the
non-test decisive signal for implementation completion.

## Completion signal

- EXPLAIN artifacts (W0-6) confirm the guard was hot.
- Both guards at `:472-502` and `:503-519` use the `WITH expected(...) AS
  (SELECT ... FROM json_each(?))` CTE shape.
- EXPLAIN after the refactor shows each table scanned once per guard.
- A drift-catching test exists OR a `TEST_PROPOSAL` is recorded with the
  exact command.

## Recovery path

**Required (Risk: Medium — mutation correctness surface).** If the CTE
refactor surfaces a guard bypass (a drifted component source passes
propagation), revert to the per-field `json_extract` correlations
immediately. The guard's correctness is load-bearing for propagation
integrity; a faster-but-leaky guard is worse than the status quo. Before
re-attempting, re-audit the CTE predicate set against the original
`json_extract` predicates one-for-one.
