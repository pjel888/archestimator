# 06 Implementation Sequence

## Preflight

1. Check dirty worktree:
   - `git status --short`
   - identify unrelated proposal/export files and do not stage them.
2. Run impact checks before editing:
   - `gitnexus impact ComponentLibraryManager -r /Users/philiplewis/archestimator -d upstream --depth 3 --include-tests`
   - `gitnexus impact LibraryPageClient -r /Users/philiplewis/archestimator -d upstream --depth 3 --include-tests`
   - `gitnexus impact TemplateLibrarySheet -r /Users/philiplewis/archestimator -d upstream --depth 3 --include-tests`
3. Read the current source around:
   - `ComponentLibraryManager`;
   - `LibraryPageClient`;
   - `MainSidebar`;
   - `component-library-repository`;
   - existing focused tests.

## Phase 1 - Tests First

Update or add tests before product code:

1. Component route tests should fail because:
   - no dropdown should exist;
   - `Templates` tab should not exist;
   - `Components` label should exist;
   - `View By: Default` and `Suppliers` should exist.
2. Supplier/default tests should fail until sheet rows are derived directly from sidebar selection.
3. Route consolidation tests should fail until `/workshop/templates` exists.
4. Sidebar baseline should fail until `Templates` nav item exists.

Rollback point:
- No product code changed yet; revert test edits if the target contract changes.

## Phase 2 - Component Route Cleanup

In `ComponentLibraryManager`:

1. Rename `LIBRARY_TABS` / active route label from `Categories` to `Components`.
2. Remove `Templates` from component route tab state.
3. Replace `CategoryOrganizeMode` copy with route-specific `ComponentViewMode`.
4. Change visible control copy to `View By: Default` and `Suppliers`.
5. Remove `RowCollectionSelect`.
6. Remove collection-specific state and handlers.
7. Delete or narrow `ComponentLibrarySheetPanel` so it no longer switches between component and template sheets.
8. Change `ComponentLibrarySheet` so rows come from selected folder/supplier context directly.
9. Keep folder CRUD/reorder behavior intact.
10. Keep supplier tree behavior intact.

Expected tests after phase:
- Component route manager tests pass except template route tests.

Rollback point:
- Revert only `ComponentLibraryManager` if folder/supplier browsing breaks.

## Phase 3 - Extract Template Route

1. Move template-specific sheet/tree logic into a dedicated `TemplateLibraryManager`.
2. Create `TemplatesPageClient`.
3. Add `src/app/workshop/templates/page.tsx`.
4. Add and use `getCurrentWorkspaceEstimateTemplates()` in `component-library-repository.ts`.
5. Reuse the existing private template query/build logic; do not duplicate normalization.

Expected tests after phase:
- `/workshop/templates` route source test passes.
- Template manager UI test passes.
- Component route does not expose template UI.

Rollback point:
- Keep component route cleanup and revert only new template route/client if needed.

## Phase 4 - Sidebar Navigation

1. Update `MainSidebar` Library group:
   - `Components` -> `/workshop/library`
   - `Templates` -> `/workshop/templates`
2. Update reset baseline test.

Expected tests after phase:
- Unit reset baseline passes.
- Sidebar active-state behavior should work through existing `isActiveHref`.

## Phase 5 - Documentation Updates

After implementation only:

1. Update `.ai/10_state/current-state.md`.
2. Update `.ai/10_state/decisions.md`.
3. If needed, update `.ai/06_specs/current-project-estimates-component-library-spec.md` for current route truth.

Do not update these during plan-only phase beyond this plan pack.

## Phase 6 - Validation and Commit

Run:

```bash
bunx vitest run tests/vitest/component-library-manager-ui.test.tsx tests/vitest/workshop-library-consolidation-ui.test.tsx tests/unit/reset-baseline.test.ts
bun run validate
git diff --check
gitnexus detect-changes -r /Users/philiplewis/archestimator --scope staged
```

Browser smoke:

```bash
ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 bun run dev -- --webpack -p <available-port>
```

Smoke:
- `/workshop/library`
- `/workshop/templates`
- `/workshop/components` redirect

Commit hygiene:
- stage only files from this plan;
- use Lore protocol;
- include verification evidence in commit trailers.
