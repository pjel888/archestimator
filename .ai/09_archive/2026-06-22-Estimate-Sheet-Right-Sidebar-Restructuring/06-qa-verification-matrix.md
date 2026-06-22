# QA Verification Matrix

## Verification Policy For This Change

Use code and focused tests as the main proof. Browser/visual proof is intentionally skipped for this planning pass and should remain optional until implementation needs to prove a browser-only claim such as real drag/drop or responsive tab fit.

Known repo context: full `bun run validate` has unrelated baseline reds/hangs in current state. Prefer targeted Vitest/DOM tests for this feature.

## Scenario Matrix

| ID | Scenario | Proof Path |
| --- | --- | --- |
| S1 | Sidebar renders `Library`, `Project`, `Templates` in order. | `component-library-ui.test.tsx` DOM test. |
| S2 | Existing stored `components`/`templates` prefs still hydrate safely. | DOM/unit test around prefs parsing. |
| S3 | New stored `project` pref hydrates safely. | DOM/unit test around prefs parsing. |
| S4 | Project tab shows express rows. | `project-component-projection.test.ts` and DOM tree test. |
| S5 | Project tab shows detached/project-specific rows. | Projection and DOM tree tests. |
| S6 | Project tab excludes clean linked library rows. | Projection fail-closed test. |
| S7 | Project tab excludes fake project-folder rows without projection metadata. | Hostile fixture helper test. |
| S8 | Library tab excludes project-owned rows. | DOM test against Library tab. |
| S9 | Supplier/brand/custom Library views also exclude project-owned rows. | Helper/unit test for prefiltered item arrays. |
| S10 | Search is scoped by active tab. | DOM tests for Library and Project search. |
| S11 | Tab switch clears search, preview, menus, template filter, and bulk selection. | DOM state test based on current `handleTabChange` contract. |
| S12 | Project tab toolbar does not show Add folder/delete controls. | DOM test. |
| S13 | Project tab row add uses component insert path. | DOM/integration test. |
| S14 | Project tab drag uses component payload, not template/project-source payload. | DOM drag payload test if drag remains enabled. |
| S15 | Templates project-derived sources remain in Templates. | Existing Templates tests with label updates. |
| S16 | Making a linked row project-specific refreshes Project projection. | `estimate-sheet-library-insert.test.tsx` or adjacent integration test. |
| S17 | Insert failure does not mark recents or mutate projection state. | Existing insert failure pattern plus Project-tab path. |
| S18 | Malformed metadata fails closed. | Projection/helper unit test. |

## Targeted Test Files

### `tests/vitest/project-component-projection.test.ts`

Add/keep:

- projects express rows with project metadata
- projects detached rows with estimate folder metadata
- returns `null` for linked rows
- returns `null` for rows that only fake a project folder
- tolerates malformed metadata/source snapshots

### `tests/vitest/component-library-helpers.test.ts`

Add/update:

- builds a Project tab tree from project projection folders
- excludes project projection rows from Library tree input
- proves project rows do not leak through supplier/brand/custom modes
- dedupes malformed duplicate folder assignments

### `tests/vitest/component-library-ui.test.tsx`

Add/update:

- renders three sidebar tabs
- keeps Templates behavior intact
- switches to Project and shows project rows only
- scoped search per tab
- Project toolbar action suppression
- bulk selection resets across tabs

### `tests/vitest/estimate-sheet-library-lazy-load.test.tsx`

Add/update only if needed:

- lazy load still uses `loadProjectComponentLibraryLite(projectId)`
- cache key remains workspace/project scoped
- Project tab does not force a new fetch path in v1

### `tests/vitest/estimate-sheet-library-insert.test.tsx`

Add if Project tab insertion is enabled:

- inserts Project-tab component into selected Area
- refreshes projection after make-project-specific succeeds
- does not refresh/mutate projection after failed insert

## Browser-Proof Deferral

No browser proof is required for this planning pack.

Future implementation may use browser/manual proof only for:

- real drag/drop behavior
- responsive fit of three tabs in the sidebar
- keyboard focus behavior across actual browser controls
- authenticated real-data sanity check

Everything else should be proven through code and targeted tests.

