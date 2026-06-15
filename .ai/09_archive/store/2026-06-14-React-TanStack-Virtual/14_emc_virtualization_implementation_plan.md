# EMC Virtualization Implementation Plan

Status: planning-only correction, added 2026-06-15. No source code, dependency, lockfile, runtime flag, migration, or provider setting is changed by this document.

## Correction

EMC must be included in the virtualization strategy.

EMC means the center Estimate Master Column: the recursive estimate branch hierarchy rendered by `EstimateSheetBranch`, plus each node's own row table. It is tree-shaped and can become large for real BOQs. It does not use `src/components/ui/tree.tsx`, so shared Tree virtualization will not automatically solve EMC scale.

The correct plan is:

1. Virtualize shared sidebar/library/template `Tree` surfaces.
2. Virtualize the EMC branch/section hierarchy when it improves center-sheet speed.
3. Virtualize EMC row-table bodies when individual nodes contain many rows.
4. Keep all paths default-off until interaction proof passes.

## Scope

Primary files:

- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/estimate-sheet/rows/branch.tsx`
- `src/components/workshop/estimate-sheet/rows/row-table.tsx`
- `src/components/workshop/estimate-sheet/rows/cells.tsx`
- `src/components/workshop/estimate-sheet/rows/expansion.ts`
- `src/components/workshop/estimate-sheet-render-probe.ts`

Primary test surfaces:

- `tests/vitest/estimate-mixed-content.test.tsx`
- `tests/vitest/estimate-sheet-cost-inputs.test.tsx`
- `tests/vitest/perf/estimate-sheet-render-baseline.test.tsx`
- `tests/vitest/perf/estimate-sheet-render-relief.test.tsx`
- `tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx`

Out of scope:

- database schema changes
- changing estimate node identity
- removing the recursive non-virtual path before closed-beta proof
- making EMC virtualization default-on in the first implementation pass

## Why EMC Needs Its Own Track

Shared `Tree` virtualization limits mounted rows in sidebars and library/template trees. EMC has a different shape:

- recursive `EstimateSheetBranch` sections
- dynamic section heights
- rows-first mixed-content layout
- sticky displayed-node header
- template and component drop targets
- add-row strips
- editable row tables
- cursor/focus anchoring

A production BOQ can be expensive in two different EMC ways:

| Shape | Bottleneck | Planned route |
| --- | --- | --- |
| many nested nodes, few rows per node | too many branch sections mounted | EMC branch/section virtualization |
| fewer nodes, many rows in a node | too many table rows mounted | EMC row-table virtualization |
| many nodes and many rows | both | hybrid EMC virtualization |

## Feature Flags

Use separate flags so shared Tree and EMC can ship or roll back independently:

```ts
export const ENABLE_TREE_VIRTUALIZATION =
  process.env.NEXT_PUBLIC_TREE_VIRTUALIZATION === "true";

export const ENABLE_EMC_VIRTUALIZATION =
  process.env.NEXT_PUBLIC_EMC_VIRTUALIZATION === "true";

export const ENABLE_ESTIMATE_ROW_VIRTUALIZATION =
  process.env.NEXT_PUBLIC_ESTIMATE_ROW_VIRTUALIZATION === "true";
```

`ENABLE_EMC_VIRTUALIZATION` controls branch/section virtualization.

`ENABLE_ESTIMATE_ROW_VIRTUALIZATION` controls row-table body virtualization inside EMC.

## Phase E0 - Tests And Fixtures

Add failing tests before implementation for:

- virtual EMC path activation
- virtual EMC section mounted count is bounded below logical section count
- non-virtual EMC path still renders recursively
- mixed-content rows-first order is preserved
- rows-only nodes still collapse/expand
- search suppresses disclosure carets and force-reveals results
- component/template drop targets resolve to the correct node
- add-row pending focus works after scrolling to an offscreen node
- row edit focus survives virtual boundary crossings
- sticky displayed-node header does not collide with virtual sections

Fixtures should include:

- `1000+` visible EMC nodes where practical
- nested mixed-content nodes
- rows-only nodes
- empty nodes
- one node with `200+` row items for the row-table sub-route

## Phase E1 - Branch/Section Virtualization

Design:

1. Build a logical stream of visible EMC sections from the expanded estimate tree.
2. Preserve node identity with stable `node.id` keys.
3. Preserve depth and ancestor path in each stream item.
4. Render each virtual item as one node section: header, breadcrumbs, own rows, add-row/drop affordances, and total.
5. Children are not recursively rendered inside the parent section; they appear as later logical stream items with deeper depth.
6. Use dynamic measurement because section heights vary.
7. Keep recursive `EstimateSheetBranch` as the non-virtual fallback.

Required behavior:

- rows-first order remains visible and accessible
- collapse removes descendants from the logical stream
- search force-reveals matches without stale collapse state
- template/component drops target the logical node under the pointer
- root edge auto-scroll still resolves the center scroll container
- single sticky displayed-node header remains the only sticky node header

## Phase E2 - Row-Table Body Virtualization

Use this when a node owns many row items.

Design:

- add a default-off `virtualization` prop to `EstimateRowItemsTable`
- use stable row IDs for virtual keys
- preserve `data-estimate-row-id`, `data-estimate-row-index`, and `data-estimate-cell-index`
- move keyboard focus by row ID, not mounted row index
- scroll to offscreen row before focusing
- keep selection state as logical row IDs independent of mounted DOM
- keep non-virtual table body for small tables and fallback

The native table structure is a known risk. The implementation should spike whether the virtual path stays table-like or uses a grid-like rowgroup with table accessibility.

## Phase E3 - Hybrid EMC Route

Use both branch/section and row-table virtualization when fixtures show both shapes:

- many visible EMC sections
- at least one large row table

Hybrid rules:

- branch virtualization decides which node sections mount
- row-table virtualization decides which rows inside a mounted large table mount
- each path has its own activation marker
- tests must fail if only one virtual path is active when both are expected

## Rollout

Rollout order:

1. code path present, flags off
2. branch/section tests pass
3. row-table spike passes
4. branch/section local enablement
5. row-table local enablement only on large tables
6. browser proof on large fixture
7. closed-beta dogfood
8. default-on only after before/after evidence improves the failing metric

Rollback:

```bash
NEXT_PUBLIC_EMC_VIRTUALIZATION=false
NEXT_PUBLIC_ESTIMATE_ROW_VIRTUALIZATION=false
```

## Required Verification

Minimum verification when implementation starts:

```bash
bunx vitest run tests/vitest/estimate-mixed-content.test.tsx --maxWorkers=1
bunx vitest run tests/vitest/estimate-sheet-cost-inputs.test.tsx --maxWorkers=1
bunx vitest run tests/vitest/perf/estimate-sheet-render-baseline.test.tsx tests/vitest/perf/estimate-sheet-render-relief.test.tsx tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx --maxWorkers=1
bun run type-check
bunx eslint src/components/workshop/EstimateSheetContent.tsx src/components/workshop/estimate-sheet/rows/branch.tsx src/components/workshop/estimate-sheet/rows/row-table.tsx src/components/workshop/estimate-sheet/rows/cells.tsx
git diff --check
```

Browser proof must include:

- fast center scroll with no blank gaps
- collapse/expand on rows-only and mixed nodes
- top/middle/bottom row edit
- add blank row near bottom
- drag component from right panel into EMC
- drag template/project-source into EMC
- context row/details open after scroll
- remote cursor fallback does not force local scroll

## Decision Boundary

EMC virtualization is now planned work.

What remains gated:

- default-on rollout
- row-table body implementation without a table/focus spike
- replacing recursive rendering without fallback
- claiming speed improvement without large-fixture browser proof

This matches the product reality: if EMC will be the surface users push hardest with huge BOQs, it must be part of the virtualization plan.
