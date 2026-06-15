---
title: "perf: Memoization Code Review Checklist"
type: perf
date: 2026-06-15
execution: code
---

# perf: Memoization Code Review Checklist

## Summary

The review should assume memoization bugs are subtle. Findings should prioritize stale props, stale derived data, comparator blind spots, and tests that count renders without asserting visible correctness.

---

## Code Reviewer Lane

### Correctness

- Check every comparator for stale UI risk.
- Confirm broad maps and sets are compared by owned ids, not by whole-object identity.
- Confirm handlers fail open on identity change.
- Confirm node totals are compared for any branch that displays a total.
- Confirm row edits, row deletes, row moves, and inserted blank rows update totals.
- Confirm filtered displayed nodes do not reuse stale unfiltered totals.
- Confirm proposal-preview stale state is explicitly defined and tested.

### Performance

- Check that comparator work is smaller than the render or computation it avoids.
- Check that probe tests measure CPU-side derived work, not only DOM mount counts.
- Check that `computeNodeTotals` is not accidentally called twice for normal unfiltered edits.
- Check that selected-node path/code helpers are not called during row edits.
- Check that shared tree changes are evidence-gated.

### Maintainability

- Keep probe APIs tiny, local, and test-only.
- Avoid adding new global state for memoization unless needed for totals.
- Avoid extracting abstractions that obscure simple comparator rules.
- Keep `computeNodeTotals` available as an oracle if an incremental path is added.

---

## Architect Lane

### Boundary Review

- Does the plan keep presentation memoization separate from financial total semantics?
- Does the totals strategy preserve a clear source of truth?
- Does branch memoization interact safely with virtualization's `renderChildBranches=false` path?
- Does the shared `Tree` remain a generic primitive rather than absorbing estimate-sheet-specific assumptions?
- Is the implementation reversible if metrics show weak gains?

### Strongest Counterarguments

- A branch comparator may be too easy to get wrong compared with the measured savings.
- Incremental totals may introduce cache invalidation complexity that is not justified before real profiling.
- Shared tree row memoization may distract from the bigger `EstimateSheetContent` derived-data costs.

The review should accept these counterarguments only if the implementation provides probe evidence and parity tests.

---

## Required Approval Evidence

A clean review should cite:

- render and compute probe results;
- visible UI assertions for totals, rows, selection, and stale preview state;
- affected tests passing;
- confirmation that no unrelated worktree changes were reverted;
- no new dependencies;
- no database or provider mutations.

---

## Blocking Findings

Treat any of these as request-changes:

- comparator ignores displayed branch total;
- comparator ignores selected state for owned rows;
- proposal preview can silently show stale current data as fresh;
- totals cache lacks oracle parity tests;
- tests assert only render counts while skipping visible value assertions;
- handler identity changes are ignored;
- shared tree changes break custom row label consumers.

