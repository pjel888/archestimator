# Test and Validation Plan

Related but separate workstream. This plan does not supersede, replace, or modify `.ai/03_plans/2026-06-03-mass-deletion-projects-estimate-sheets-library-components.md`.

## Existing Tests To Preserve

| File | Existing Coverage | Required Preservation |
|---|---|---|
| `tests/vitest/estimate-sheet-tree-dnd.test.tsx` | RCT drag/drop config, app guards, optimistic reorder, rollback, stale-cache safety. | Must still pass after handle/checkbox slots. |
| `tests/vitest/estimate-sheet-tree-rct-dom.test.tsx` | DOM-level RCT tree rendering and drag props. | Extend for row slots and no invalid markup. |
| `tests/vitest/estimate-tree-context-menu.test.tsx` | Right-click rename/delete, delete modal, route fallback, rollback, left-click navigation. | Context menu and navigation must survive checkbox UI. |
| `tests/vitest/estimate-tree-edit.test.ts` | Delete planning helpers. | Extend or pair with bulk selection utility tests. |
| `tests/vitest/estimate-tree-reorder.test.ts` | Reorder validation. | Must still pass after drag affordance. |
| `tests/vitest/project-estimates-table-inline-edit.test.tsx` | Table inline edit conventions. | Preserve edit behavior after checkbox/header additions. |
| `tests/vitest/project-estimates-client-create.test.tsx` | Estimate sheet creation client behavior. | Preserve create flow. |
| `tests/vitest/library-folder-reorder.test.ts` | Folder reorder, cycle/no-op rejection, delete-lift behavior. | Preserve while adding bulk selection/delete. |
| `tests/vitest/component-library-manager-ui.test.tsx` | Library manager UI. | Extend for catalogue selection/archive. |
| `tests/vitest/component-library-ui.test.tsx` | Current component library UI assumptions. | Update intentionally when new bulk controls ship. |
| `tests/vitest/projects-page-shared-access.test.tsx` | Owned/shared/sheet-only/pending card access states. | Extend for disabled selection. |
| `tests/vitest/projects-page-view-mode.test.tsx` | Project list/card view behavior. | Preserve when bulk selection appears. |
| `e2e/estimate-tree-dnd.spec.ts` | Mutating DnD fixture gated by env vars. | Preserve; do not reuse for bulk destructive tests unless fixtures are safe. |
| `e2e/workshop-library-demo-smoke.spec.ts` | Library route smoke. | Preserve route smoke after catalogue changes. |

There is no live file named `tests/vitest/project-estimates-table.test.tsx`; use `tests/vitest/project-estimates-table-inline-edit.test.tsx` and new bulk-specific tests instead.

## New Unit Tests

| File | Scenarios |
|---|---|
| `tests/unit/tree-selection.test.ts` | descendant lookup, selectable descendant filtering, parent checked/unchecked/indeterminate, select-visible excludes hidden/disabled IDs, dedupe parent/child selections, stale selection cleanup. |
| `tests/vitest/estimate-tree-edit.test.ts` additions | bulk delete preview root dedupe, descendant count, row impact count, fallback target when active node is included. |
| `tests/vitest/library-folder-reorder.test.ts` additions | bulk folder delete plan preserves child lift and item unassignment semantics. |

## New Vitest DOM Tests

| File | Scenarios |
|---|---|
| `tests/vitest/workshop-tree-row-affordances.test.tsx` | row slots force non-button markup, checkbox and inline actions are not nested inside a native button, toolbar role/label, drag handle decorative contract, checkbox click/key propagation isolation. |
| `tests/vitest/estimate-tree-bulk-selection.test.tsx` | checkbox click does not navigate, expand/collapse, open context menu, or start drag; parent indeterminate state; selected route row distinct from checked row; clear selection; modal cancel/confirm; failure rollback/safe refresh. |
| `tests/vitest/library-folder-tree-selection.test.tsx` | synthetic root disabled, folder checkbox cascade, reorder preserved, bulk delete modal preview, active folder fallback. |
| `tests/vitest/project-estimates-table-bulk-delete.test.tsx` | header select-visible, indeterminate header, checkbox event isolation, typed confirmation, active sheet fallback. |
| `tests/vitest/projects-page-bulk-delete.test.tsx` | owned cards selectable, shared/sheet-only/pending disabled, typed `DELETE PROJECTS`, active project redirect, storage cleanup result messaging. |
| `tests/vitest/component-library-bulk-archive.test.tsx` | selected component cards, archive default, referenced component hard delete disabled, selection cleanup after archive. |
| `tests/vitest/component-library-bulk-delete.test.tsx` | zero-reference hard delete gate, referenced component rejection, storage path safe cleanup behavior. |

## New Server Action Tests

| File | Scenarios |
|---|---|
| `tests/vitest/bulk-delete-server-actions.test.ts` | project bulk validation, estimate sheet bulk validation, estimate node bulk validation/dedupe, library folder bulk validation, component archive/hard-delete validation, unauthorized/cross-workspace rejection, all-or-nothing failure. |

Server action tests must mock or use safe fixtures. Do not run destructive linked-db tests against real user data.

## New Playwright Tests

Use top-level `e2e/*.spec.ts` naming. Add only when safe fixtures and env vars exist.

| File | Scenarios |
|---|---|
| `e2e/estimate-tree-bulk-select.spec.ts` | visible handle on hover/focus, checkbox does not start drag, right-click menu still works, modal cancel/confirm on safe fixture. |
| `e2e/project-estimates-bulk-delete.spec.ts` | filtered select-visible, typed confirmation, route fallback. |
| `e2e/projects-page-bulk-delete.spec.ts` | owned-card selection, non-editable disabled cards, typed confirmation, `/workshop/projects` fallback. |
| `e2e/component-library-bulk-archive.spec.ts` | archive selected components and verify catalogue refresh. |

## Manual QA Matrix

| Scenario | Expected Result |
|---|---|
| Checkbox click does not navigate | Route stays unchanged; selected count updates. |
| Checkbox click does not expand/collapse | Branch open state stays unchanged. |
| Checkbox click does not start drag | No drag overlay/drop operation starts. |
| Drag handle visible on hover/focus | Grip appears without layout shift. |
| Right-click context menu still works | Existing rename/delete menu opens for row. |
| Selected route row and checked row visually distinct | User can identify current route and bulk selection separately. |
| Parent checkbox indeterminate state | Parent shows mixed state when only some descendants selected. |
| Select visible under search filtering | Only rendered filtered rows/items selected. |
| Clear selection | Checked set clears; active route/current row unchanged. |
| Bulk toolbar visibility | Toolbar appears only with selected IDs and does not cover controls. |
| Disabled selection for protected rows | Synthetic/shared/pending/protected rows cannot be checked. |
| Typed confirmation | Top-level project/sheet delete blocks until exact phrase entered. |
| Modal cancel | No data changes; selection preserved; focus returns. |
| Modal confirm | Server action runs once; selection clears on success. |
| Optimistic rollback or safe refresh after failure | UI returns to consistent state and reports error. |
| Active route fallback after deleting current object | App routes/focuses to documented fallback. |

## Accessibility QA Matrix

| Area | Expected Result |
|---|---|
| Native checkbox | Screen reader announces checked/unchecked/mixed/disabled. |
| Bulk toolbar | Has `role="toolbar"` and accessible label. |
| Modal | Has dialog role, heading, description, Escape/cancel path, initial focus, focus return. |
| Keyboard tree navigation | Arrow/Enter behavior preserved. |
| Checkbox Space | Toggles checkbox only. |
| Disabled controls | Reason is perceivable. |
| Focus visibility | Row, checkbox, toolbar, modal controls show visible focus. |
| No nested interactive markup | DOM has no checkbox/button inside native button row. |

## Data Safety QA Matrix

| Scenario | Expected Result |
|---|---|
| Cross-workspace delete rejection | Server returns unauthorized/validation error; no mutation. |
| Unauthorized delete rejection | Server rejects even if client control is forced. |
| Project dependent cleanup | Cascades/set-null behavior matches migrations. |
| Estimate sheet dependent cleanup | Nodes/rows/favorites/members/settings removed by cascade. |
| Estimate node history | Bulk delete preserves coherent history/audit behavior. |
| Library folder delete | Child folders lifted and items unassigned; components remain. |
| Archive referenced library components | Archive succeeds if permitted. |
| Hard delete referenced library components | Rejects with reference message. |
| Hard delete zero-reference gate | Only zero-reference components delete. |
| Storage path cleanup | Only safe, owned paths removed. |
| Partial storage failure | Result reports repair details. |

## Commands After Each Phase

| Phase | Commands |
|---|---|
| 1 | `bunx vitest run tests/vitest/workshop-tree-row-affordances.test.tsx --maxWorkers=1`; `bun run lint:design-system` |
| 2 | `bunx vitest run tests/unit/tree-selection.test.ts --maxWorkers=1` |
| 3 | `bunx vitest run tests/vitest/estimate-tree-bulk-selection.test.tsx tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-tree-context-menu.test.tsx --maxWorkers=1` |
| 4 | `bunx vitest run tests/vitest/estimate-tree-bulk-selection.test.tsx tests/vitest/bulk-delete-server-actions.test.ts --maxWorkers=1` |
| 5 | `bunx vitest run tests/vitest/library-folder-tree-selection.test.tsx tests/vitest/library-folder-reorder.test.ts --maxWorkers=1` |
| 6 | `bunx vitest run tests/vitest/project-estimates-table-bulk-delete.test.tsx tests/vitest/project-estimates-table-inline-edit.test.tsx tests/vitest/project-estimates-client-create.test.tsx --maxWorkers=1` |
| 7 | `bunx vitest run tests/vitest/projects-page-bulk-delete.test.tsx tests/vitest/projects-page-shared-access.test.tsx tests/vitest/bulk-delete-server-actions.test.ts --maxWorkers=1` |
| 8 | `bunx vitest run tests/vitest/component-library-bulk-archive.test.tsx tests/vitest/component-library-bulk-delete.test.tsx tests/vitest/component-library-manager-ui.test.tsx --maxWorkers=1` |
| 9 | `bun run lint:design-system`; `bun run test:dom` |
| 10 | Full final commands below. |

## Final Validation Commands

```bash
bun run type-check
bun run lint
bun run lint:design-system
bun run test
bun run test:dom
bun run validate
bun run build
bun run test:e2e
git diff --check
```

If an e2e or linked-db command is skipped because credentials/env vars are unavailable, report the exact missing env var or fixture constraint.

## Regression Watchlist

- Right-click rename/delete disappears or changes target.
- RCT drag/drop stops working.
- Checkbox click navigates or expands.
- Route-selected styling becomes indistinguishable from checked styling.
- Header select-all selects hidden rows.
- Disabled shared/project cards become selectable.
- Bulk server actions trust client-provided IDs.
- Hard delete removes referenced library components.
- Storage cleanup deletes unsafe paths.
- Modal focus is lost after cancel/delete.
- Design-system lint failures from ad hoc button/card styles.

## Markdown / Docs Validation

No `markdownlint`, `remark`, or package-level docs validation script was found in `package.json`. Planning-package validation relies on `git diff --check`, file presence checks, scope checks, and content searches.
