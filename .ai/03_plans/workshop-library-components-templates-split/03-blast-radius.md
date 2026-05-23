# 03 Blast Radius

## Summary

Risk is **moderate** despite LOW symbol impact because the change removes active UI state, splits a route, and rewrites tests around a recently changed Library surface.

The highest-risk file is `ComponentLibraryManager.tsx`, not because external callers are broad, but because it currently combines route IA, tree state, sheet filtering, folder mutations, supplier organization, and template browsing in one large component.

## GitNexus Evidence

GitNexus index status:

- Repository: `/Users/philiplewis/archestimator`
- Indexed commit: `f4afe70`
- Current commit: `f4afe70`
- Status: up to date

Impact checks:

- `ComponentLibraryManager`
  - Risk: LOW
  - Direct caller: `LibraryPageClient`
  - Affected route flow: `LibraryPage`
  - Focused tests: `component-library-manager-ui.test.tsx`, `workshop-library-consolidation-ui.test.tsx`
- `LibraryPageClient`
  - Risk: LOW
  - Direct callers: `/workshop/library`, focused UI tests
- `TemplateLibrarySheet`
  - Risk: LOW
  - Direct caller: `ComponentLibrarySheetPanel`
  - Indirect route flow: `LibraryPage`

Interpretation:
- Graph impact is narrow, but UI behavior within that narrow surface is meaningful.
- Test-first implementation is required because several current tests encode the soon-to-be-removed behavior.

## File-Level Blast Radius

### Product Code

#### `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`

Expected changes:
- Remove `Templates` from the component route.
- Rename `Categories` to `Components`.
- Rename organize controls.
- Delete `RowCollectionSelect`.
- Delete or narrow `RowCollectionId`.
- Remove `folderCollectionId`, `supplierCollectionId`, `collectionOptions`, and `changeCollection`.
- Remove `ComponentLibrarySheet` collection branching.
- Make component sheet derive rows from current right-sidebar state:
  - default view: selected folder node;
  - suppliers view: selected supplier node, with `All Suppliers` showing supplier-backed rows.
- Remove template state and branch paths from component manager.

Risk:
- Accidentally breaking folder select -> sheet update.
- Accidentally breaking supplier select -> sheet update.
- Leaving dropdown behavior in hidden state.
- Removing template helper code before it is reused by `/workshop/templates`.

#### `src/components/workshop/LibraryPageClient.tsx`

Expected changes:
- Remove `templates` prop from component route client.
- Optionally rename or introduce `ComponentLibraryPageClient`.

Risk:
- Test imports currently use `LibraryPageClient`.
- Route and tests may need a migration period or re-export.

#### `src/app/workshop/library/page.tsx`

Expected changes:
- Use a component-only route data helper, not the combined component/template dataset.
- Stop loading and passing templates to the component route.
- Update shell copy: footer should not say `Categories and templates`.
- Shift visible title and breadcrumb from `Library` to `Components`.

Risk:
- Branding/route name mismatch. Recommended visible title: `Components`; route remains `/workshop/library`.

#### `src/app/workshop/templates/page.tsx`

Expected new file:
- Protected route in `WorkshopPageShell`.
- Loads templates from repository.
- Renders template-specific client/manager.

Risk:
- Accidentally bypassing the template-only helper and loading the full component dataset in the template route.
- Auth/bootstrap behavior must match `/workshop/library`.

#### `src/components/sidebar/MainSidebar.tsx`

Expected changes:
- Replace Library nav item label with `Components`.
- Add Templates nav item under Library group.
- Use an appropriate icon from the existing Phosphor set.

Risk:
- Existing unit test expects `label: "Library"`.
- Active state should work for `/workshop/templates`.

#### `src/lib/repositories/component-library-repository.ts`

Expected changes:
- Add `getCurrentWorkspaceComponentRowsLibrary()` or an equivalently named component-only helper for `/workshop/library`.
- Add `getCurrentWorkspaceEstimateTemplates()` as the single template-only helper name.
- Keep existing `getCurrentWorkspaceComponentLibrary()` for estimate-route consumers that still need the combined component/template dataset.
- Do not duplicate template row normalization.

Risk:
- Route split should not affect estimate sidebar, which still needs both component data and templates.
- Static fallback behavior must remain: static seed templates only when template tables are missing.
- `/workshop/library` should not retain accidental template coupling by continuing to call the combined helper.

### Test Code

#### `tests/vitest/component-library-manager-ui.test.tsx`

Rewrite component route expectations:
- `Components` is visible.
- no `Templates` top-level tab.
- no `Library row collection` dropdown.
- no `Estimate Row Items`, `Custom Row Items`, `Uncategorized`, or `Supplier Row Items` dropdown options.
- dynamic folder labels such as `Administration` may still render in the tree or sheet context, but never as dropdown options or collection-select state.
- folder selection changes sheet rows directly.
- supplier view changes sheet rows directly.
- source assertions prove `RowCollectionSelect`, `changeCollection`, `collectionOptions`, `activeCollectionId`, and dropdown-only `RowCollectionId` modes are gone from the component route.

Add/import template manager tests separately.

#### `tests/vitest/workshop-library-consolidation-ui.test.tsx`

Rewrite consolidation expectations:
- `/workshop/library` remains canonical.
- `/workshop/components` redirects.
- `/workshop/templates` exists and loads template route/client.
- main component route no longer passes `templates`.
- templates are not top-level tabs in component route.

#### `tests/unit/reset-baseline.test.ts`

Update sidebar baseline:
- expect `/workshop/library`;
- expect `/workshop/templates`;
- expect `label: "Components"` and `label: "Templates"`.

## Unrelated Dirty Worktree Risk

Current unrelated dirty/untracked files include proposal/export work under:

- `.ai/03_plans/industry-standard-excel-proposal-export/`
- `src/app/api/`
- `src/components/workshop/ProposalExportPreviewDialog.tsx`
- `src/lib/proposal-export/`
- proposal-export tests
- related package/bun lock and estimate page/content edits

Implementation must:
- inspect `git status --short` before editing;
- never stage unrelated files;
- run scoped `git diff --check` before commit;
- commit only files from this plan.

## Rollback Points

1. After tests are updated but before product changes: failing tests should describe the new contract.
2. After component route cleanup: focused manager tests should pass.
3. After template route creation: template route tests should pass.
4. After sidebar nav update: reset baseline should pass.
5. Before commit: `git diff --cached --name-only` must show only intended files.
