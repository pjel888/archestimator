---
title: Remediation Checklist
date: 2026-06-21
status: implementation-checklist
---

# Remediation Checklist

## Stage 0: Canonicalize Component Taxonomy

- [x] Use `Library Component` and `Project Component` in estimate-sheet
  user-facing row-card/detail copy.
- [x] Update affected estimate-sheet tests for the source-copy revision.
- [ ] Decide whether sidebar project-source/library surfaces should adopt the
  same labels in a future copy revision.
- [ ] Keep internal provenance terms in source until a separate migration plan
  covers compatibility and history implications.

Verification:

```bash
bunx vitest run tests/vitest/estimate-component-drag.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-sheet-row-details-crud.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx --maxWorkers=1
rg -n "Express component replaceable estimate component|Project-specific component|Make component project-specific|Make project-specific|Customized library component" src/components/workshop/EstimateSheetContent.tsx src/components/workshop/estimate-sheet tests/vitest
```

## Stage 1: Lock Correctness P1s

- [ ] Make bulk row delete rollback row-scoped or atomic.
- [ ] Replace component move's replace-then-clear sequence with a row-pair
  operation or explicit source/target reconciliation.
- [ ] Make tree reorder/single-delete/bulk-delete refresh the committed tab,
  not the default tab.
- [ ] Replace multi-root tree delete loops with one transactional bulk RPC.
- [ ] Replace template-node subtree copy loops by calling the existing
  `insert_estimate_subtree_into_estimate_with_history` RPC.
- [ ] Split cheap drag-over validation from full drop planning.
- [ ] Harden membership-gated write RPCs to use the estimate edit gate.

Verification:

```bash
bunx vitest run tests/vitest/estimate-node-reorder-action.test.ts tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-tree-bulk-selection.test.tsx tests/vitest/estimate-component-drag.test.tsx --maxWorkers=1
```

## Stage 2: Make Failure States Trustworthy

- [ ] Return and patch canonical rows for replace-row and replace-style clear
  paths so `rowRevision`, metadata, source snapshot, and link state are fresh.
- [ ] Serialize or operation-guard non-scalar same-row mutations, not only
  scalar updates.
- [ ] Add retryable active-tab and legacy-tree query error states.
- [ ] Add a row mutation error presenter for rollback/failure paths.
- [ ] Count active row mutations before showing saved state.
- [ ] Map row revision conflicts to typed stale-data copy and refetch guidance.

Verification:

```bash
bunx vitest run tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx tests/vitest/estimate-sheet-version-control-actions.test.ts --maxWorkers=1
```

## Stage 3: Bound Project-Source And Large-Data Work

- [ ] Serialize, merge, or batch project-source inserts so out-of-order
  responses cannot clobber visible tree state.
- [ ] Show "adding/inserting" while source/template/project-source operations are
  pending, and show "added" only after persistence succeeds.
- [ ] Add route and lazy-library payload budgets plus visible truncation states.
- [ ] Cap reusable-source search fan-out across projects, estimates, tabs, nodes,
  and rows; load full outlines only on explicit expand.

Verification:

```bash
bunx vitest run tests/vitest/project-source-insert-action.test.ts tests/vitest/reusable-source-drag.test.ts tests/vitest/template-browse-project-sources.test.tsx tests/vitest/component-library-ui.test.tsx --maxWorkers=1
```

## Stage 4: UI Clarity Polish

- [ ] Relabel sidebar edit/duplicate/delete as local-view operations, or make
  them persisted library CRUD.
- [ ] Add a sheet-shaped
  `src/app/workshop/projects/[projectId]/estimates/[nodeId]/loading.tsx`.
- [ ] Keep visual changes minimal; prefer copy/status clarity over redesign.

Verification:

```bash
git diff --check
rg -n "local view|Project Component|Library Component|loading.tsx" .ai/03_plans/2026-06-21-Estimate-Sheet-Audit-And-Improvement src/components/workshop src/app/workshop/projects
```
