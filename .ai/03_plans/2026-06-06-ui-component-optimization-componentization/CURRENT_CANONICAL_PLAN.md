# Current Canonical Plan

**Status:** Canonical planning source as of 2026-06-06.
**Supersedes:** Any earlier statement in this folder claiming 92-96 percent implementation readiness without measurement or blast-radius evidence.
**Implementation status:** Not implemented. This folder is a future implementation handoff only.

## Canonical Thesis

Archestimator should not introduce a broad generic design system or a single all-purpose tree component. The safe direction is a layered extraction around existing tree and sheet surfaces:

1. Pure tree utilities first.
2. Headless hooks second.
3. Thin render shells third.
4. Read-only share tree adoption before editable estimate tree adoption.

## Canonical MVP Slice

The MVP implementation slice is **Phase 0 through Phase 3**:

- Phase 0: collect baseline evidence and lock existing behavior tests.
- Phase 1: create pure tree utilities and utility tests.
- Phase 2: create headless tree hooks and shell contracts without changing editable estimate behavior.
- Phase 3: unify read-only share tree rendering.

This slice is shippable independently because share surfaces are read-only and have GitNexus `LOW` direct blast radius for `ShareEstimateTreePanel` and `ShareEstimateTreeView`. It must still respect `WorkshopTree`'s `HIGH` file-level blast radius.

## Canonical Gates

| Gate | Required before |
| --- | --- |
| GitNexus/code-review graph impact checked and recorded | Editing any target symbol |
| Existing tests listed as existing vs aspirational | Writing new tests |
| Profiler and row-count baseline collected | Claiming performance improvement |
| Route-transition plan reconciled | Adding React.memo, dynamic imports, Suspense, or bundle work |
| Owner sign-off recorded | Applying tree-core to editable estimate tree or adding virtualization dependency |
| Rollback path documented | Merging any phase |

## Canonical Deconfliction Rules

- React.memo decisions defer to `.ai/03_plans/route-transition-performance-optimization/19-react-memo-strategy.md`.
- `next/dynamic` named-export syntax defers to `.ai/03_plans/route-transition-performance-optimization/14-code-splitting-named-exports.md`.
- Virtualization is not part of the MVP. It remains a decision gate after row counts and Profiler data.
- `react-complex-tree` stays in place for editable estimate-tree behavior.
- `WorkshopTree` is not a low-risk primitive; GitNexus reports `HIGH` upstream risk because it is shared by workshop, library, template, and share surfaces.

## Current Readiness

| Scope | Readiness | Reason |
| --- | ---: | --- |
| Architecture strategy | 96/100 | Layering and rejected alternatives are clear and codebase-compatible. |
| MVP Phases 0-3 planning handoff | 92/100 | Impact and file/test inventories are now documented; implementation still needs fresh baseline commands at start. |
| Full editable-tree plan | 74/100 | Measurement data and owner smoke gates are still missing. |
| Full performance-claim readiness | 45/100 | No React Profiler traces or bundle measurements are recorded yet. |

Do not quote a single high readiness number without scope. The old 96 percent claim is retired.
