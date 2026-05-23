# 07 Test Spec

## Unit / DOM Test Targets

### `tests/vitest/component-library-manager-ui.test.tsx`

Update current route tests to assert:

- `Component library workspace` still renders.
- Sheet panel appears before right tree panel.
- Right tree panel still renders.
- Top/right label uses `Components`.
- No `Templates` tab is present.
- No `Library row collection` select is present.
- Text/options are absent:
  - `Estimate Row Items`
  - `Custom Row Items`
  - `Uncategorized`
  - `Supplier Row Items`
  - `All Templates`
  - shipped template names
- `View By: Default` is selected by default.
- `Suppliers` is available as the second view mode.
- Selecting `Details` folder updates sheet rows directly without a dropdown.
- A dynamic folder label such as `Administration` can render as a tree selection/context label, but no collection select exists and it is not exposed as a dropdown option.
- Supplier view:
  - selecting `Suppliers` switches tree to supplier nodes;
  - selecting `Database Supplier` updates the sheet to supplier rows;
  - unsourced rows are excluded.
- Folder context actions still open.
- Folder search still excludes rejected procurement scopes.

Remove or migrate tests that currently assert:

- `Templates` as a top-level tab inside `/workshop/library`.
- Static template behavior inside component route.
- Collection dropdown options.

### New template route/manager tests

Add a new test file or section, for example:

```txt
tests/vitest/template-library-manager-ui.test.tsx
```

Assert:

- `Template library workspace` renders.
- `Template library tree` renders.
- `Template sheet` renders.
- `All Templates` is selected by default.
- template categories render in the right tree.
- selecting a category filters the left sheet.
- template row summary is still visible.
- component row names do not render.
- no `Library row collection` select renders.

### `tests/vitest/workshop-library-consolidation-ui.test.tsx`

Update route-source assertions:

- `/workshop/library/page.tsx` loads component route client and does not pass templates into the component manager.
- `/workshop/components/page.tsx` still redirects to `/workshop/library`.
- `/workshop/templates/page.tsx` exists and loads template route client/manager.
- `/workshop/library` no longer mentions `Categories and templates`.

Update UI consolidation assertions:

- Library view tabs are no longer `Categories` and `Templates`.
- Component route label is `Components`.
- View-by controls are `View By: Default` and `Suppliers`.
- Dropdown expectations are removed/replaced by direct sheet scoping assertions.

### `tests/unit/reset-baseline.test.ts`

Update sidebar source assertions:

- contains `href: "/workshop/library"`;
- contains `label: "Components"`;
- contains `href: "/workshop/templates"`;
- contains `label: "Templates"`;
- still does not contain rejected broad nav labels like `Reports` or `Cost Library`.

## Repository Tests

Add/update `tests/vitest/component-library-templates-repository.test.ts` for `getCurrentWorkspaceEstimateTemplates()`:

- helper returns persisted templates from template tables;
- helper preserves static fallback only when table is missing;
- existing `getCurrentWorkspaceComponentLibrary()` behavior remains unchanged.

## Browser Smoke Assertions

Use Playwright or Browser plugin after dev server is running with dev auth bypass:

### `/workshop/library`

DOM assertions:

- URL ends with `/workshop/library`.
- `[data-component-library-sheet-panel="true"]` exists.
- right tree exists.
- sheet x-position is left of tree x-position.
- no select with `aria-label="Library row collection"`.
- no `Templates` tab.
- visible `Components`.
- visible `View By: Default`.
- visible `Suppliers`.

### `/workshop/templates`

DOM assertions:

- URL ends with `/workshop/templates`.
- template workspace exists.
- sheet x-position is left of tree x-position.
- visible `Templates`.
- visible `All Templates`.
- no component collection dropdown.

### `/workshop/components`

HTTP/browser assertion:

- redirects to `/workshop/library`.

## Validation Commands

Focused:

```bash
bunx vitest run tests/vitest/component-library-manager-ui.test.tsx tests/vitest/workshop-library-consolidation-ui.test.tsx
bun test tests/unit/reset-baseline.test.ts
```

Full:

```bash
bun run validate
git diff --check
```

Pre-commit graph:

```bash
gitnexus detect-changes -r /Users/philiplewis/archestimator --scope staged
```

Expected known warning:
- `bun run validate` may continue to report the existing TanStack Table React Compiler warning in `ProjectEstimatesTable.tsx`; this is not introduced by this plan.
