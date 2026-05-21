# shadcn Context Menu Integration — Complete

**Archived:** 2026-05-21 PHT
**Original path:** `.ai/03_plans/shadcn-context-menu-integration/`
**Target route:** `/workshop/projects/[projectId]/estimates/[nodeId]`
**Status:** Implemented and archived as the closeout source.

## Closeout Status

Implemented:

- `components.json` shadcn configuration for Tailwind v4 and local aliases.
- `@radix-ui/react-context-menu` dependency.
- Compact shadcn/Radix `ContextMenu` primitive in `src/components/ui/context-menu.tsx`.
- Reusable `ActionMenu` model in `src/components/ui/action-menu.tsx`.
- `src/lib/ui/index.ts` export for shadcn `cn` aliasing.
- Pure estimate tree edit helpers in `src/lib/estimates/estimate-tree-edit.ts`.
- Estimate tree Group/Area row right-click menu with `Rename` and `Delete`.
- Inline rename with orange editing treatment, Check control, Reset control, Enter/Escape/blur handling, empty-name validation, optimistic cache update, success reconcile, and failure rollback.
- Delete confirmation through the existing Modal, followed by optimistic subtree removal, selected-node fallback, route repair only when the current route is deleted, server reconciliation, and failure rollback.
- State-first area-tree cache shared by `EstimateSheetTree` and `EstimateSheetContent`.
- Scalar rename server action returning `{ nodeId, name }` with no active-route revalidation, no full-tree refetch/reapply, no redirect, and no `router.refresh()`.
- Rollback hardening so failed rename/row/tree mutations do not restore stale whole-tree snapshots over newer cache writes.
- Current-route delete repair from the client pathname before falling back to stale RSC props.
- UI primitive matrix/state/decision docs updated.

## Supersession

The historical implementation plan's Task 5 expected rename to return `{ tree, nodeId, name }` and call path revalidation. That is superseded.

Active architecture:

- Rename is a scalar patch: `{ nodeId, name }`.
- Rename does not refetch/reapply the full tree.
- Rename does not call `revalidatePath()` for the active estimate route.
- Rename/delete do not redirect and do not call `router.refresh()`.
- Delete/reorder remain structural mutations that may reconcile with a confirmed server tree.

## Deferred

- Future filter/icon-triggered menu adapters.
- Broader shadcn/ui rollout.
- Alert Dialog, Dropdown Menu, Popover, or Storybook setup.
- Supabase Realtime channels/triggers/RLS policy work; defer until collaboration or cross-device live sync becomes explicit MVP scope.

## Verification Evidence

Passed:

- `bun run test:dom -- tests/vitest/estimate-tree-context-menu.test.tsx` — 25 tests passed.
- `bun run test:dom -- tests/vitest/estimate-tree-context-menu.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx tests/vitest/live-estimate-node-route.test.ts` — 44 tests passed.
- `bun run test:dom -- tests/vitest/estimate-tree-context-menu.test.tsx tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-sheet-tree-rct-dom.test.tsx tests/vitest/estimate-tree-modal.test.tsx` — 44 tests passed.
- `bun run type-check` — passed.
- `bun run lint` — passed with one existing warning in `src/components/workshop/ProjectEstimatesTable.tsx:548` for TanStack Table and React Compiler.
- `bun run lint:font-size` — passed.
- `git diff --check` — passed.
- `bun run validate` — passed: 32 DOM files, 215 DOM tests, plus unit baseline.
- `bun run build` — passed.

Manual/browser smoke:

- Passed on 2026-05-21 PHT after `.env.local` was updated with `ARCHESTIMATOR_DEV_AUTH_EMAIL`.
- Route: `http://localhost:3000/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/77777777-7777-4777-8777-777777777729`
- Command shape: local Playwright smoke via `node <<'NODE' ... NODE`.
- Result: protected route returned `200 OK`, rendered 48 tree rows, opened the `Master Bedroom` row context menu, exposed `Rename` and `Delete`, kept the rename input active after pointer movement outside the input, showed Confirm/Reset controls, reset and cancelled rename without persisting, opened Delete confirmation, cancelled Delete, kept the route stable, and logged zero browser console errors.

## Documents

- `01-readiness-audit.md`
- `02-blast-radius-and-risk-analysis.md`
- `03-styling-and-shadcn-architecture.md`
- `04-implementation-plan.md`
- `05-ux-ui-interaction-spec.md`
