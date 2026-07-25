# React Complex Tree Compatibility — Archestimator

Use this payload only when current source directly touches
`react-complex-tree`. The installed version is `2.6.2`, confirmed by
`package.json`, `bun.lock`, and `node_modules`.

## Current Source Truth

- The estimate sheet tree no longer uses React Complex Tree. It uses
  `src/components/ui/tree.tsx`, wired by
  `src/components/workshop/EstimateSheetTree.tsx` and
  `src/components/workshop/estimate-tree/use-estimate-tree-reorder.ts`.
- Estimate-tree reorder planning lives in
  `src/lib/estimates/estimate-tree-reorder.ts`; persistence enters through
  `reorderEstimateTreeNodes` in `src/lib/estimates/actions.ts` and the current D1
  intent/repository path.
- At this snapshot, the remaining direct package import is the
  `TreeItemIndex` type used by
  `src/lib/component-library/library-folder-reorder.ts`. Search current source
  again before relying on this statement.

Do not reintroduce React Complex Tree into the estimate sheet merely because an
archived DnD plan used it.

## Workflow

1. Identify the current importing symbol. For broad, high-risk, or unfamiliar
   shared-symbol work, use available Code Review Graph or GitNexus impact
   analysis when configured; for a narrow reversible change, targeted source,
   `rg`, diff, and LSP inspection are sufficient.
2. Read the installed `react-complex-tree@2.6.2` declarations/source for API
   behavior instead of relying on this payload's memory.
3. Preserve the current domain hierarchy, cycle/no-op validation, optimistic
   reconciliation, accessibility, and atomic D1 mutation boundaries.
4. Prefer the existing project tree abstraction for estimate/workshop features.
5. Use source/diff/static evidence and run the unit, component, Playwright, and
   browser layers selected by the automatic `Q0_CONTRACT_ONLY` through
   `Q3_RELEASE_GATE` profile.

## Historical Reference

`.ai/09_archive/store/2026-05-21-estimate-tree-dnd-reorganization-complete/`
preserves the old React Complex Tree design and findings. Those findings are
non-authoritative unless current source independently confirms them. The former
`.ai/03_plans/estimate-tree-dnd-reorganization/` path no longer exists.
