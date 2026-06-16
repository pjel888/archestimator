---
title: Implementation Roadmap
date: 2026-06-15
status: implementation-ready
type: execution-plan
scope: /workshop/projects
---

# Implementation Roadmap

## Guardrails

- U0: before coding the View control, confirm the product decision: use the lower-interaction-cost `SegmentedControl` UX recommendation, or keep the requested single collapsed `DropdownSelect` as a product override. Do not begin U2 until this is resolved. U1, U3, U4, and tests remain useful either way.
- Do not edit `src/components/ui/header-icon-toolbar.tsx`.
- Do not edit `src/components/ui/tree-panel-header.tsx`.
- Do not edit `src/components/ui/dropdown-select.tsx`.
- Do not edit `src/lib/repositories/workspace-repository.ts`.
- Do not add database migrations or generated type updates.
- Do not add a sort localStorage key in v1.
- Do not add a Filter button in v1.
- Keep implementation source edits to:
  - `src/components/workshop/projects-page-client.tsx`
  - `src/components/workshop/WorkshopCollectionLayout.tsx`
  - `src/components/workshop/LiveProjectCard.tsx`

## Unit U1: Thread the toolbar slot

File: `src/components/workshop/WorkshopCollectionLayout.tsx`

Tasks:

1. Import/use `ReactNode` as needed.
2. Add `filterSlot?: ReactNode` to the props.
3. Destructure `filterSlot`.
4. Pass `filterSlot` into `TreePanelHeader`.

Acceptance:

- Existing behavior is unchanged when no slot is passed.
- Projects page can provide custom controls without touching shared toolbar primitives.

## Unit U2: Replace four view buttons with one View selector

File: `src/components/workshop/projects-page-client.tsx`

Tasks (RD1):

1. Remove the rendered four-button `projectViewModeActions` usage.
2. Keep `PROJECT_VIEW_MODE_OPTIONS`, `ProjectCardViewMode`, the storage key `archestimator_projects_view_mode_v1`, the change event, and read/write helpers UNCHANGED (storage/values/governance depend on them). Do NOT rename their labels (`Small thumbnails` etc.).
3. Add a SEPARATE page-local option array for the selector, e.g. `VIEW_SELECT_OPTIONS = [{value:'list',label:'View: List'},{value:'small',label:'View: Small'},{value:'medium',label:'View: Medium'},{value:'large',label:'View: Large'}]`. The `View:` prefix lives in these labels because the `DropdownSelect` trigger renders the selected option's label verbatim (no prefix prop, no icon field). Do NOT reuse `PROJECT_VIEW_MODE_OPTIONS` labels for the trigger.
4. Render a View `DropdownSelect` in the `filterSlot` wrapper with `options={VIEW_SELECT_OPTIONS}`, `value={viewMode}`, `onValueChange` calling `writeProjectViewModePreference(next as ProjectCardViewMode)`.
5. Pass `aria-label="View"` (the `DropdownSelect` has NO default accessible name; the visible `View:` prefix matches it, satisfying WCAG 2.5.3; the density is the announced value).
6. Disable the control for zero-real-project and sample fallback states (RD4: View DISABLED, never hidden).

Acceptance:

- All four densities still update `data-project-view-mode` and card `data-project-card-view`.
- The View combobox is a named combobox (`aria-label="View"`); named-combobox a11y tests pass.
- Existing localStorage persistence still works.
- Cross-tab view-mode event behavior is preserved.

## Unit U3: Add page-local sort

File: `src/components/workshop/projects-page-client.tsx`

Tasks:

1. Add in-memory `sortField`, `sortDirection`, and `sortTouched` state. `sortTouched` is internal-only (drives RD5), never the trigger label.
2. (RD2) Sort field = a `DropdownSelect` with `aria-label="Sort field"` and options `[{value:'updated_at',label:'Sort: Last updated'},{value:'created_at',label:'Sort: Date created'},{value:'client_name',label:'Sort: Client'},{value:'name',label:'Sort: Project name'}]`. The trigger ALWAYS reflects the selected field (default reads `Sort: Last updated`); a bare `Sort` label while untouched is NOT buildable with this primitive — drop that behavior.
3. (RD3) Direction = a SEPARATE compact `ToolbarIconButton`-styled toggle button rendering icon + visible text (never icon-only, given the 38px row), NOT part of the `DropdownSelect`.
   - NO `aria-pressed` (it flips direction; it is not a persistent two-state control).
   - Accessible name = the CURRENT direction, field-aware: date fields `Newest first`/`Oldest first`; text fields `A to Z`/`Z to A`. The `aria-label` updates with the current direction so SR announces current state on focus.
   - `onClick` flips `sortDirection` and sets `sortTouched = true`.
   - Minimum 24x24px target with >=24px clear spacing from adjacent controls (WCAG 2.5.8), unless the toolbar buttons already carry that documented exception.
4. Implement a local comparator near `displayProjects`. (RD5) When `sortTouched === false`, do NOT invoke the comparator at all; render the search-filtered `activeBaseProjects` unchanged so the order is byte-for-byte today's repository order (`updated_at` desc within tab). The comparator — including the name-ascending tiebreak — runs ONLY after the user explicitly changes field or direction. Never apply the name-asc tiebreak on the untouched default path.
5. Change the display derivation to active tab -> search -> (sortTouched ? copied sort : unchanged) -> render.
6. Keep sort ENABLED on search miss if the active tab has real projects.
7. (RD4) Single hide/disable rule — Sort is HIDDEN (not disabled) whenever there are no real projects in the active tab or samples are shown; View stays DISABLED in those same states. A disabled Sort with a tooltip would falsely imply sortable content exists.

Acceptance:

- Default visible order matches current Last updated, newest first behavior, byte-for-byte (untouched-skip path, no comparator).
- With >=2 projects sharing an identical `updated_at`, the untouched default view preserves received-array order, not name order (RD5).
- The name-asc tiebreak applies ONLY to user-selected sorts.
- Sort field combobox is named (`aria-label="Sort field"`); direction toggle exposes the current field-aware direction as its accessible name.
- Sort applies within the active access tab only.
- Search and sort compose in both interaction orders.
- Null/missing values sort last in both directions.
- Text sorting is numeric and case-insensitive.
- Sort does not persist across reloads.

## Unit U4: Add created date to the large card

File: `src/components/workshop/LiveProjectCard.tsx`

Tasks (RD7):

1. Reuse `formatUpdatedAt(project.created_at)` for the visible `Created {date}` (month/day register). `formatUpdatedAt` is month/day only and cannot produce a full date.
2. Add a SEPARATE full-date formatter for the `title` attribute, e.g. `Intl.DateTimeFormat('en', { dateStyle: 'long' })` -> `June 15, 2026`.
3. Insert as a NEW secondary-meta line under the existing Updated line, gated by `showSecondaryMeta` (`viewMode === 'large'`), for live projects only.
4. Use secondary text color `#5D5D5D` (not tertiary — this is load-bearing meta, must pass AA).
5. Leave list, small, medium, pending invite, and shared badge behavior intact.

Acceptance:

- Created date is visible where Date created sort is most likely inspected.
- Visible text reuses `formatUpdatedAt`; the `title` carries the full `dateStyle: 'long'` date.
- Compact card density is not made noisier (line is gated by `showSecondaryMeta`).
- Existing expiration/updated labels still pass tests.

## Unit U5: Tests

Update these tests:

- `tests/vitest/projects-page-view-mode.test.tsx`
- `tests/vitest/projects-page-access-tabs.test.tsx`
- `tests/vitest/projects-page-shared-access.test.tsx`
- `tests/vitest/project-creation-ui.test.ts`

Add:

- `tests/vitest/projects-page-sort-controls.test.tsx`

Re-sync `project-creation-ui.test.ts` governance strings (it is a static `readFileSync` test):

- Update the view-mode strings the View selector changes (the templated `label: \`View projects as ${option.label}\`` and `label: "Small thumbnails"` assertions).
- KEEP/intentionally update `PROJECT_VIEW_MODE_STORAGE_KEY`, `data-project-view-mode`, `viewMode`, the Add-action wiring (`toolbarPrefix="projects"`, `Add projects`, `onClick`) and the grid-class assertion.
- RE-SYNC the favorite pressed-class string (test asserts `aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white` but source now uses `aria-pressed:border-tertiary/40 aria-pressed:bg-surfaceMuted aria-pressed:text-ink`); this drift breaks independently if untouched.
- Add the sample-mode caveat: in zero-live/sample states only the wrapper `data-project-view-mode` exists; the sample `ProjectCard` does NOT set `data-project-card-view`. Assert accordingly.

Required test coverage:

- View combobox defaults to Large.
- View combobox exposes all four values.
- View combobox is a named combobox (`aria-label="View"`).
- Selecting each density updates page and card data attributes (live grid only; sample state has only the wrapper attribute).
- Existing view storage key still restores the stored value.
- Escape closes the View popup without an unintended density change.
- Default sort preserves current order; with >=2 projects sharing an identical `updated_at`, the untouched default view preserves received-array order, not name order (RD5).
- Sort by created date asc/desc.
- Sort by client asc/desc with nulls last.
- Sort by project name with numeric/case-insensitive ordering.
- Direction toggle uses date/text-appropriate field-aware labels and exposes the current direction as its accessible name (no `aria-pressed`).
- Search then sort and sort then search both work.
- Sort is scoped to the active access tab.
- `filterSlot` View+Sort render alongside the Add action, covered in `tests/vitest/projects-page-sort-controls.test.tsx` (header-icon-toolbar-ui.test.tsx proves `filterSlot`+Group coexistence only, NOT `filterSlot`+Add/leadingActions; this is the new required coexistence test).
- Sort while a bulk selection is active -> selected IDs persist; checkboxes follow their rows (RD6).
- Empty/sample states: View DISABLED, Sort HIDDEN (RD4 single rule — no "or" fork).
- Large card shows created date with full-date title.

## Unit U6: Browser and visual QA

Run a focused browser/manual smoke after implementation:

- desktop width: Search, View, Sort, direction, Add, and tabs all fit
- narrow width: toolbar does not wrap or horizontally overflow
- Add remains reachable
- dropdown popups are not clipped
- keyboard can open/select/close View and Sort
- sample fallback does not present active sorting controls

Use the app's available dev-auth or local auth setup. If authenticated smoke cannot run, record it as a validation gap; do not claim browser proof from unit tests alone.

## F11 performance tripwire

Do not implement pagination/server-side sort in this MVP. Do record this future boundary in the implementation notes: if `/workshop/projects` returns 200 or more live projects for the workspace across owned and shared tabs, excluding sample fallback cards, or browser profiling shows Sort plus list re-render above 100ms p75 on a representative desktop, future work must move list ordering behind a paginated/server-side read boundary before adding group/filter/favorites-first layers.

## Verification commands

Run after implementation:

```bash
bunx vitest run tests/vitest/projects-page-view-mode.test.tsx tests/vitest/projects-page-access-tabs.test.tsx tests/vitest/projects-page-shared-access.test.tsx tests/vitest/projects-page-sort-controls.test.tsx tests/vitest/project-creation-ui.test.ts --maxWorkers=1
bun run type-check
git diff --check
```

Add a focused browser smoke command only after confirming the available auth path.

## Definition of done

- Source edits stay within the three expected source files.
- Tests cover the changed view, sort, access-tab, shared-card, static governance, and created-date behavior.
- Verification commands pass.
- Browser/manual smoke either passes or is explicitly reported as blocked by missing auth state.
- No absolute local paths, stale `leadingActions` implementation instructions, `DropdownMenu` value-picker instructions, or sort-persistence instructions remain in the plan or implementation notes.
