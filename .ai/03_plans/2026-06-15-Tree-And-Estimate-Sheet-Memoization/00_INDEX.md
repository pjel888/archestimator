---
title: "perf: Tree and Estimate Sheet Memoization"
type: perf
date: 2026-06-15
execution: code
---

# perf: Tree and Estimate Sheet Memoization

## Summary

This plan pack studies where memoization should follow the React/TanStack Virtual work for large estimate trees, the shared tree primitive, `EstimateSheetContent`, and the components inside the estimate master column. The goal is not to wrap everything in `memo`; it is to remove full-tree recomputation from row edits, then add comparator boundaries only where tests can prove they do not create stale totals, stale selections, stale collapsed state, or stale drag/drop handlers.

---

## User Job

Philip wants confirmation that the virtualized tree and estimate sheet will stay fast with thousands of nested nodes and row items, and wants a thorough memoization strategy before implementation starts.

Affected screen: the estimate workspace, especially the left tree, middle estimate sheet content column, row tables, row items, and right-sidebar interactions that receive sheet-derived props.

---

## Plan Pack

| File | Purpose |
|---|---|
| `00_INDEX.md` | Navigation, stop condition, and artifact map. |
| `01_strategy_and_success_criteria.md` | Problem frame, requirements, decisions, and success metrics. |
| `02_current_state_audit.md` | Fresh repo audit of current virtualization, memoization, and hot spots. |
| `03_memoization_architecture.md` | Proposed architecture for memo boundaries, derived-data caches, and comparator safety. |
| `04_implementation_plan.md` | Ordered implementation units with files, tests, and verification outcomes. |
| `05_test_and_probe_plan.md` | Characterization, render-count, compute-count, and large-fixture perf plan. |
| `06_ultraqa_matrix.md` | Adversarial QA matrix for memoization and virtualization interactions. |
| `07_risk_register_and_rollout.md` | Risks, rollout posture, rollback criteria, and deferred work. |
| `08_code_review_checklist.md` | Independent review checklist for React performance and stale-prop safety. |
| `09_execution_goal_and_prompt.md` | Copy-pasteable AI execution goal, route analysis, recommended path, and testing gates. |

---

## Current Answer

Yes, the current work should improve large trees and estimate sheets because the shared tree, estimate branch stream, and row tables now have virtualized rendering paths with default-on flags. The important caveat is that virtualization reduces mounted DOM and rendered React rows; it does not automatically eliminate whole-tree derived computations in `EstimateSheetContent` or full-model construction in component/template tree consumers.

The shared-tree consumers checked in this plan are already wired to the default-on `WORKSHOP_TREE_VIRTUALIZATION` config: `EstimateSheetTree`, `LibraryTree`, `TemplatesTree`, `TemplatesBrowseManager`, `LibraryFolderTree`, and `TemplateStructureTree`. That means expanded trees above the threshold should mount only visible rows plus overscan.

The biggest remaining opportunities are:

- avoid computing proposal-preview signatures over the full editable tree when the proposal preview is closed;
- memoize selected-node presentation data before passing it into `EstimateSheetVirtualBranchList`;
- memoize `EstimateSheetBranch` with a slice-aware comparator so row edits do not rerender unaffected branches;
- measure and likely replace full `computeNodeTotals` recomputation on every edit with a scoped or incremental totals strategy;
- treat component/template trees as high-cardinality first-class targets because tens of thousands of nodes can still make filtering, grouping, sorting, and UI-node construction expensive before virtualization starts;
- keep generic shared `Tree` row-level memoization secondary unless profiler evidence shows it is still a bottleneck after consumer-side data shaping is fixed.

---

## Loop Surface Selection

Recommended execution surface: `ultragoal` for durable implementation with checkpoints, using `ultrawork` lanes only for independent evidence work such as render-probe tests and reviewer checks. `ultraqa` should run after implementation because stale memoization defects can pass typecheck and basic unit tests while failing real interaction sequences.

Durable evidence path:

- implementation log under `.ai/05_logs/`;
- focused perf tests under `tests/vitest/perf/`;
- regression tests next to the affected estimate-sheet and tree test suites;
- optional browser evidence only if the implementation changes visible behavior or focus/scroll behavior.

---

## Stop Condition

This planning task is complete when the plan pack exists, uses repo-relative paths, captures the current audit, identifies memoization units, and includes a QA and code-review gate. Implementation is intentionally not started by this plan pack.
