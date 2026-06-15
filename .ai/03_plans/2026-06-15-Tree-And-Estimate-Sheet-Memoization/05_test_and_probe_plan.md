---
title: "perf: Memoization Test and Probe Plan"
type: perf
date: 2026-06-15
execution: code
---

# perf: Memoization Test and Probe Plan

## Summary

The test plan adds narrow probes that detect the failures memoization usually hides: stale branch totals, stale selected state, stale preview signatures, and false greens where a component skips render but the UI is wrong.

---

## Probe Inventory

| Probe | Target | Expected Use |
|---|---|---|
| Branch render probe | `EstimateSheetBranch` | Counts branch renders by node id. |
| Proposal signature probe | Proposal preview signature helper | Counts full-tree signature generation. |
| Node totals probe | `computeNodeTotals` or wrapper | Counts full-tree total computations and scoped recomputes. |
| Selected presentation probe | Selected node path/code helpers | Counts path/code derivation during row edits. |
| Tree data-shaping probe | Component/template tree builders and filters | Counts category grouping, project-source grouping, folder maps, search filters, and UI-node construction. |
| Tree row render probe | Shared `Tree` row labels | Counts visible row churn for default and custom row consumers. |

Probes should be test-only callbacks with null defaults. They should not import test utilities into production modules.

---

## Large Fixtures

Create deterministic fixtures rather than random data:

- many shallow sibling nodes with no rows;
- many nested nodes with one row each;
- one node with many rows to exercise row-table virtualization;
- many nodes with moderate row counts to exercise both branch and row virtualization;
- mixed-content nodes with own rows plus children;
- filtered display copies from search, facets, and group mode.
- component/template fixtures with thousands and tens of thousands of library rows, category folders, template nodes, project-source nodes, and row-item leaves.

Fixture row values should produce distinct totals so stale header bugs are obvious.

---

## Required Test Scenarios

### TS1. Row Edit With Preview Never Opened

- **Setup:** Large tree, selected node visible, preview model null.
- **Action:** Change one quantity field several times.
- **Expected:** Edited row and owning table update. Proposal signature probe remains zero. Unrelated branch render count remains zero or bounded to visible affected ancestors according to implementation.

### TS2. Row Edit After Preview Built

- **Setup:** Open proposal preview once, close it or leave it open according to the chosen stale policy.
- **Action:** Edit a row that affects export totals.
- **Expected:** Existing stale-preview behavior remains visible. Signature calls are bounded to the stale-state policy. Refresh rebuilds the model with current values.

### TS3. Selected Node Metadata Stability

- **Setup:** Select a deep nested node with breadcrumbs.
- **Action:** Edit rows without changing selected node.
- **Expected:** Node code and ancestor path helpers do not rerun. Breadcrumb text remains correct. Switching selected node reruns helpers and updates breadcrumbs.

### TS4. Branch Comparator Correctness

- **Setup:** Three sibling branches with distinct totals and row ids.
- **Action:** Edit branch A row, select branch B row, collapse branch C, then clear selection.
- **Expected:** Each branch rerenders only when its own rows, selected membership, total, or context state requires it.

### TS5. Totals Parity

- **Setup:** Nested mixed-content tree with editable row overrides.
- **Action:** Edit, insert, delete, and move rows in test-level helpers or UI flows.
- **Expected:** New totals strategy exactly matches `computeNodeTotals` oracle.

### TS6. Filtered View Safety

- **Setup:** Search/facet/group mode produces a displayed subtree copy.
- **Action:** Edit a visible row and an offscreen row.
- **Expected:** Displayed totals and visible rows update correctly; unfiltered project totals remain correct; memoization does not reuse stale filtered copies.

### TS7. Virtualization and Memoization Interaction

- **Setup:** Branch count and row count exceed virtual thresholds.
- **Action:** Scroll enough to mount different virtual branches and rows, then edit a mounted row.
- **Expected:** Mounted counts remain bounded. Edited row remains focusable. Offscreen branch totals are correct when mounted later.

### TS8. Shared Tree Consumer Churn

- **Setup:** Large tree consumer with custom row label and virtualization enabled.
- **Action:** Select, expand, collapse, drag-over, and context-menu rows.
- **Expected:** Visible rows update correctly. Memoization changes, if any, do not break a11y attributes, drag/drop state, or custom labels.

### TS9. Component and Template Tree Data Shaping

- **Setup:** Tens-of-thousands component/template fixture across categories, folders, templates, project sources, and row-item leaves.
- **Action:** Search, clear search, expand/collapse, select rows, rename one item, duplicate one item, delete one item, and change one category.
- **Expected:** Mounted row count remains bounded by shared tree virtualization. Expensive grouping/filtering/index builders rerun only for the data slice that changed. Search results and totals stay correct after local mutations.

---

## Verification Ladder

1. Characterization tests prove current hot spots.
2. Focused unit and DOM tests prove each unit's correctness.
3. Existing virtualization tests prove mounted-count behavior still works.
4. Existing render-relief and cursor-isolation tests prove no regression.
5. Typecheck and changed-file lint prove implementation consistency.
6. Build or browser smoke is reserved for changes that alter runtime integration, focus, scroll behavior, or visible UI.

---

## Passing Evidence

The implementation report should record:

- probe counts before and after the change;
- which derived computations were eliminated or bounded;
- which scenarios ran and passed;
- which scenarios were skipped and why;
- any residual risk around total computation or shared tree row churn.
