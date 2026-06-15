---
title: "perf: Memoization UltraQA Matrix"
type: perf
date: 2026-06-15
execution: code
---

# perf: Memoization UltraQA Matrix

## Summary

Memoization can create false confidence: tests may pass while UI state is stale because a comparator skipped a render. This matrix defines adversarial scenarios for implementation QA.

---

## Scenario Matrix

| ID | User or Attacker Model | Scenario | Expected Signal | Cleanup |
|---|---|---|---|---|
| UQA-MEMO-001 | Estimator editing a huge estimate | Type repeatedly in one row in a large nested sheet. | Edited row, owning branch total, ancestor totals, and project total update; unrelated branches and row tables do not rerender. | Probe callbacks reset after test. |
| UQA-MEMO-002 | Estimator who never exports | Edit rows without opening proposal preview. | Proposal signature generation stays at zero; export controls remain available. | No generated artifacts. |
| UQA-MEMO-003 | Estimator with stale preview | Build preview, edit rows, refresh preview. | Stale state policy is visible and refresh produces current totals. | Dialog state resets between tests. |
| UQA-MEMO-004 | Heavy search user | Activate search/facets/group, edit visible and hidden rows. | Displayed filtered rows and totals update; clearing filters restores correct unfiltered tree. | Filter state cleared. |
| UQA-MEMO-005 | Nested-tree power user | Collapse and expand branches after edits. | Collapsed branch totals update before and after expansion. No stale child rows appear. | Collapse state reset. |
| UQA-MEMO-006 | Bulk-selection user | Select and deselect rows across branches after memoization. | Header checkboxes and selected row states update only where relevant. No stale checked state remains offscreen. | Selection cleared. |
| UQA-MEMO-007 | Drag/drop user | Drag a template or component after parent state and editable rows changed. | Drop target handlers use current target ids and current mutation callbacks. | Drag store reset. |
| UQA-MEMO-008 | Virtualized scroll user | Scroll a large virtualized branch list, edit a mounted row, scroll away and back. | Mounted counts stay bounded; edited value and branch totals persist. | Scroll container reset. |
| UQA-MEMO-009 | Shared tree user | Expand, select, drag-over, and context-menu large trees with custom labels. | A11y attributes, custom labels, and drag/drop state stay current. | Tree test fixture unmounted. |
| UQA-MEMO-010 | Rollback operator | Disable virtualization flags while memoization remains active. | Non-virtual path stays correct and render-relief tests still pass. | Environment restored. |
| UQA-MEMO-011 | Dirty worktree condition | Run tests with unrelated worktree changes present. | Implementation does not revert or hide unrelated changes. | Worktree status recorded. |
| UQA-MEMO-012 | Misleading green output | A probe test must fail if a stale comparator skips an update. | Test asserts visible UI values, not only render counts. | Failed harness fixed before completion. |

---

## Hostile Edge Classes Covered

- Malformed or unusual input: row values that parse to zero, empty strings, high quantities, and unusual row names in fixtures.
- Repeated interruptions: rerun probe suites after partial implementation and after comparator changes.
- Stale state: preview signatures, collapsed branches, selected rows, and virtualized offscreen rows.
- Dirty worktree: record status before and after generated probes or temporary fixtures.
- Misleading success output: require visible-value assertions alongside render-count assertions.
- Flaky tests: rerun any count-based test that fails once before diagnosing; count tests should use deterministic fixtures, not timing.

---

## QA Completion Rule

The implementation is not done until each matrix row has a passed test, a documented safe substitute, or a clear residual risk. A green typecheck or build is not sufficient for memoization correctness.

