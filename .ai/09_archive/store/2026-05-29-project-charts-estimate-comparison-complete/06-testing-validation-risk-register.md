# Testing, Validation, And Risk Register

## Test Matrix

### Pure Unit Tests

File:

```txt
tests/vitest/project-charts-aggregation.test.ts
```

Required cases:

- `calculates row totals from quantity, unit_cost, misc_cost`.
- `groups by top-level estimate tree space`.
- `groups component subcategories under reporting categories using node_type`.
- `does not report organizer taxonomy nodes as categories`.
- `groups suppliers by supplier_id before fallback supplier text`.
- `scopes supplier labels to the current workspace`.
- `uses fallback Uncategorized and No supplier buckets`.
- `keeps bucket colors stable across both selected sheets`.
- `rolls low-rank chart buckets into Other while preserving all comparison-table buckets`.
- `handles zero totals and zero baseline deltas`.

### Repository Tests

If practical with existing mocks:

- loader returns `project: null` for inaccessible/missing project;
- loader scopes estimates to project id;
- loader selects category/supplier dimensions;
- loader does not fetch unrelated component library rows;
- loader explicitly constrains `component_suppliers.workspace_id`.

At least one project/workspace scoping check is required before implementation closeout. If repository mocks cannot support it, record the gap and run a protected-route smoke using the local dev auth setup.

### Component Tests

File:

```txt
tests/vitest/project-charts-ui.test.tsx
```

Cases:

- renders no-estimates empty state.
- renders one-estimate empty state.
- defaults to two different estimates.
- changing grouping mode updates visible bucket labels.
- selecting the same estimate is prevented or corrected.
- comparison table exposes numeric values independent of chart SVG.
- comparison table exposes every bucket amount, share, and delta in text.

### Governance Tests

Update or add tests covering:

- `ProjectMiniSidebar` includes Dashboard, Estimates, Charts.
- mini-sidebar remains hidden on estimate detail routes.
- Charts route follows project layout and does not affect estimate workspace header metadata.
- Charts page root uses a single intentional scroll boundary inside the locked project shell.
- chart imports do not appear in `layout.tsx`, `ProjectMiniSidebar`, `ProjectWorkspaceHeaderRow`, or shared UI primitive files.

### Browser Smoke

Route:

```txt
http://localhost:3000/workshop/projects/22222222-2222-4222-8222-222222222222/charts
```

Checks:

- page returns 200 under dev auth setup;
- Charts nav item active;
- two donut charts visible when two sheets exist;
- if seeded data has fewer than two populated estimates, the empty state is correct instead of forcing a false two-donut expectation;
- no blank chart containers;
- no obvious text overlap;
- no obvious text/control overlap at a narrow viewport;
- mode select works;
- selectors remain compact and readable.

## Validation Commands

Focused:

```bash
bunx vitest run --maxWorkers=1 tests/vitest/project-charts-aggregation.test.ts
bunx vitest run --maxWorkers=1 tests/vitest/project-charts-ui.test.tsx
git diff --check
```

Full:

```bash
bun run validate
bun run build
git diff --check
```

## Risk Register

### R1: Donut Charts Hide Precise Differences

Risk: users cannot compare exact cost differences by visual slices alone.

Mitigation:

- include compact comparison table;
- show totals and deltas;
- keep shared bucket order/colors.

### R2: Category Taxonomy Has Organizer Nodes

Risk: component category grouping incorrectly reports top-level organizer folders instead of categories.

Mitigation:

- implement taxonomy ancestry helper that maps subcategories to category-level reporting buckets;
- add tests with organizer -> category -> subcategory tree.

### R3: Missing Row Dimensions

Risk: manual or older rows lack category/supplier ids.

Mitigation:

- fallback to source snapshot and row supplier text;
- render `Uncategorized` and `No supplier` rather than dropping rows.

### R4: Chart Dependency Adds Bundle Weight

Risk: adding a chart library increases app JS.

Mitigation:

- default to focused `@nivo/pie` instead of broader chart suites;
- isolate chart imports to the Charts client component;
- avoid importing chart code in shared shell;
- consider dynamic import if bundle impact is visible.
- verify chart import isolation with `rg -n "@nivo|recharts" src`.

### R5: Dirty Worktree Conflicts

Risk: unrelated export work is currently dirty and may overlap build/test results.

Mitigation:

- keep Charts files isolated;
- do not edit export files;
- report unrelated validation failures plainly.

### R6: Project Estimate Count Grows

Risk: loading all row facts for every estimate becomes heavy.

Mitigation:

- v1 all-facts loading is capped at 20 estimates and 5,000 row items;
- aggregate only the selected pair server-side through URL search params when the cap is exceeded;
- repository boundary must keep selected-pair server aggregation possible without changing chart UI props;
- avoid returning full rendered tree objects.

### R9: Responsive Chart Testing In JSDOM

Risk: Nivo responsive charts depend on measured parent dimensions, while jsdom has no real layout.

Mitigation:

- mock `ResponsivePie` in component tests; or
- add a focused `ResizeObserver` shim for the chart UI test;
- rely on browser smoke for actual rendered chart sizing.

### R7: Visual Text Overlap

Risk: donut labels or legends break compact UI constraints.

Mitigation:

- avoid labels around the donut;
- use center total and legend/table;
- test at desktop, laptop, and narrow stacked widths.

### R8: Wrong Category Field Name

Risk: implementation follows stale `kind` wording and fails against the current `component_category_nodes.node_type` schema.

Mitigation:

- use generated Supabase types before coding;
- add an aggregation test whose fixture uses `node_type`;
- avoid introducing a parallel local taxonomy field name.

## Release Readiness Checklist

- [ ] Aggregation tests pass.
- [ ] UI/component tests pass.
- [ ] Project navigation governance updated.
- [ ] Browser smoke confirms charts render.
- [ ] `bun run validate` passes or unrelated failures are documented.
- [ ] `bun run build` passes or unrelated failures are documented.
- [ ] `git diff --check` passes.
- [ ] `.ai/10_state/current-state.md` and `.ai/10_state/decisions.md` updated after implementation, if the feature ships.
