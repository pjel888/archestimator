---
title: "perf: Memoization Risk Register and Rollout"
type: perf
date: 2026-06-15
execution: code
---

# perf: Memoization Risk Register and Rollout

## Summary

The main risk is stale UI from over-aggressive comparators. Rollout should be narrow, test-backed, and easy to reverse by removing memo boundaries or falling back to current total helpers.

---

## Risks

| Risk | Severity | Why It Matters | Mitigation |
|---|---|---|---|
| Stale branch totals | High | Estimators can trust wrong costs. | Compare `nodeTotals.get(node.id)` and assert visible totals after edits. |
| Stale row values | High | Keystrokes may not show or save as expected. | Preserve row-table comparator tests and visible input assertions. |
| Stale selection | Medium | Bulk actions could target unexpected rows. | Compare selected membership for owned row ids; test select and clear flows. |
| Stale proposal preview | Medium | Preview may not mark itself stale after edits. | Define stale policy in U2 and assert it directly. |
| Stale drag/drop handler | Medium | Inserts could target the wrong node. | Comparator fails open on handler identity changes; drag/drop tests run after memoization. |
| Comparator cost exceeds savings | Medium | Deep comparisons can become the new hot path. | Keep comparison slices small and measure count-based outcomes. |
| Incremental totals drift | High | A cache bug can silently corrupt totals. | Keep `computeNodeTotals` as oracle and add parity tests. |
| Shared tree churn over-optimization | Low | Changes can destabilize many consumers for little gain. | Gate shared tree memo changes on evidence. |
| Focus and virtual scroll regressions | Medium | Virtualized rows can unmount while focus logic expects them. | Run row virtualization focus scenarios after comparator changes. |

---

## Rollout Posture

This is a local code performance change. It should not require database changes, provider changes, or new dependencies. The existing virtualization flags remain the coarse rollback for DOM virtualization. Memoization changes should be reversible by removing comparators or falling back to the current helper path.

Recommended rollout order:

1. Land probes and characterization tests.
2. Land lazy proposal signature and selected-node presentation memoization.
3. Land branch comparator with strict tests.
4. Decide totals strategy from measured evidence.
5. Audit shared tree and sidebar churn.
6. Run review and UltraQA matrix.

---

## Rollback Criteria

Rollback the branch comparator if:

- a branch total or row selection can become stale;
- drag/drop handlers target stale nodes;
- comparator code becomes harder to reason about than the render work it saves;
- render probes show no measurable reduction.

Rollback incremental totals if:

- parity against `computeNodeTotals` fails for any structural edit;
- filtered views produce inconsistent totals;
- the cache requires broad invalidation so often that it no longer reduces work.

Rollback shared tree memo changes if:

- custom row labels break in any consumer;
- drag/drop or a11y attributes become stale;
- virtualization alone already satisfies the large-tree scenario.

---

## Deletion Criteria If Direction Is Rejected

If Philip rejects this memoization direction, delete only the new memoization probes, tests, comparators, and helper abstractions introduced by the implementation. Keep the existing virtualization implementation and row-table render-relief comparator unless a separate plan rejects them.

---

## Documentation and Evidence

When implemented, write a short run log under `.ai/05_logs/` that includes:

- changed files;
- probe count deltas;
- targeted tests and outcomes;
- whether totals stayed full-recompute, scoped, or incremental;
- residual risks and deferred follow-ups.

