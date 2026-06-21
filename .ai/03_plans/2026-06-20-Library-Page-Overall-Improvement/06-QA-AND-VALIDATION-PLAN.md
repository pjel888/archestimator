# 06 - QA And Validation Plan

All test commands, file paths, query keys, enums, columns, and action/RPC names
in this doc bind to `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` (keystone).
When this doc and the keystone disagree, the keystone wins. Phase labels follow
the canonical phase map (0A Contract Lock -> 0B Overlay & Route-State Reliability
-> 1 Findability & Applied Filters -> 2 Source Trust at Decision Points ->
3 Add/Edit Component Flow Split (Quick Add) -> 4 Templates Browse/Insert/Editor
Clarity -> 5 Dense Maintenance Mode & Browser-Proven Polish). The adversarial
scenario IDs (`ADV-*`) used in the matrix below are the single source of truth,
shared with `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md`.

## Verification Strategy

Use targeted tests first. Use browser proof only for claims that jsdom/source inspection cannot prove: real route navigation/back-forward behavior, viewport geometry, portal clipping, sticky/scroll containment, drag/drop pointer behavior, and full focus trapping across portals.

This is a planning pack: no application code changed, so no test run is part of
it. That is by design, not a gap — every test/command this plan depends on is
PRE-REGISTERED below (exact `vitest run` / `bun run` command, the code surface
under test, and the `ADV-*` ID it discharges) with its result slot reserved in
`24-EXECUTION-EVIDENCE-LEDGER.md`. The run output (pass / skip-with-risk / no-go
+ date) lands in those doc-24 rows during the implementation pass; nothing about
verification is left unspecified here.

### How to run the jsdom suites (read this before quoting any command)

The jsdom suites live in `tests/vitest/*.test.tsx` and run under the `test:dom`
script (`vitest run --maxWorkers=1`). They do **not** run under `bun test`:
`package.json:21` binds `"test": "bun test tests/unit"`, so `bun test <path>`
points the Bun runner at the wrong suite and silently ignores anything under
`tests/vitest/`. Use one of:

| Goal | Command |
| --- | --- |
| Run one jsdom suite | `vitest run tests/vitest/<file>` |
| Run all jsdom suites | `bun run test:dom` |
| Run the full gate | `bun run validate` (`type-check && lint && lint:design-system && lint:design && test && test:dom`) |
| E2E / browser smoke | `bun run test:e2e` (Playwright) |

Accessibility note: there is **no axe / jest-axe harness** in this repo. Every
a11y check below is a manual ARIA / focus / keyboard assertion written in
Testing Library. If automated axe coverage is wanted, adding `jest-axe` (dev
dependency + a wrapper in `tests/vitest/`) is a net-new prerequisite task that
must be scheduled in Phase 0A before any "axe" assertion is written, not assumed
to already exist.

## Existing Useful Coverage

| Area | Existing tests |
| --- | --- |
| Overview | `tests/vitest/library-overview.test.tsx` |
| Library route tabs | `tests/vitest/library-tabs-layout.test.tsx`, `tests/vitest/library-tab-a11y.test.tsx` |
| Components route/cache | `tests/vitest/library-components-cache.test.tsx` |
| Templates route/cache | `tests/vitest/library-templates-cache.test.tsx` |
| Broad Library DOM coverage | `tests/vitest/workshop-library-consolidation-ui.test.tsx` |
| Folder tree | `tests/vitest/library-folder-tree-selection.test.tsx`, `tests/vitest/library-folder-reorder.test.ts` |
| Template browse | `tests/vitest/template-gallery.test.tsx` |
| Template editor | `tests/vitest/template-editor.test.tsx` |
| New template modal | `tests/vitest/new-template-modal.test.tsx` |
| Bulk destructive modal | `tests/vitest/bulk-destructive-preview-modal.test.tsx` |
| Shared overlays | `tests/vitest/ui-modal-tooltip.test.tsx`, `tests/vitest/ui-dropdown-popup-core.test.tsx`, `tests/vitest/ui-dropdown-select.test.tsx`, `tests/vitest/ui-tabs.test.tsx` |
| Browser smoke | `e2e/workshop-library-routes.spec.ts`, `e2e/workshop-template-insert-smoke.spec.ts` |

## New Focused Tests To Add

Each subsection names its phase, owning test file, exact run command, the code
surface under test, and the `ADV-*` scenario IDs it discharges (see matrix
below). Run commands are `vitest run`, never `bun test` (see "How to run the
jsdom suites").

### Library overview selection (Phase 1)

Add `tests/vitest/library-overview-navigation.test.tsx` (net-new — file does not
exist yet; create it before the first run).
Run: `vitest run tests/vitest/library-overview-navigation.test.tsx`.
Under test: `LibraryOverviewSearch.tsx` + `LibraryOverview.tsx` route-state
emission into `?component=<id>` owned by `LibraryPageClient.tsx`.
Discharges: `ADV-DELETED-RESULT` (covers the screen-reader route-open case,
which doc 18 folds into this ID).

Should verify:

- Component search result click routes to Components with the `?component=<id>` param.
- Component search result Enter key does the same.
- Recent component card uses the same route-state behavior.
- Template results still open the template detail route (`/workshop/library/templates/[templateId]`).
- The active tab and tab panel semantics remain correct.

### Add Component modal accessibility (Phase 0B / Phase 3)

Add `tests/vitest/library-add-component-modal-a11y.test.tsx` (net-new — file does
not exist yet; create it before the first run).
Run: `vitest run tests/vitest/library-add-component-modal-a11y.test.tsx`.
Under test: `component-library-manager/AddComponentModal.tsx` — specifically
replacing the native `window.confirm("Discard this component draft?")` at
`AddComponentModal.tsx:963` with the inline `ConfirmDialog`+`<input>`
text-prompt pattern (copy from
`library/templates-browse/TemplatesBrowseManager.tsx:531-883`).
Manual ARIA/focus only — no axe harness exists.
Discharges: `ADV-DIRTY-ADD-NESTED`, `ADV-QUICKADD-UNSAFE` (a11y portions).

Should verify:

- Initial focus lands inside the modal.
- Required-field errors set `aria-invalid` on `name`, `category`, `unit`, `unit_cost`.
- Nested listbox/combobox Escape closes the listbox before the modal (z-tier `z-[1050]` menu over `z-[1000]` modal).
- Dirty close opens the `ConfirmDialog` text-prompt dialog, not `window.confirm`.
- Confirm/cancel return focus to the invoking control.

### Component folder actions (Phase 0B)

Extend the existing `tests/vitest/component-library-folder-actions.test.ts`.
Run: `vitest run tests/vitest/component-library-folder-actions.test.ts`.
Under test: `component-library-manager/ComponentLibraryManager.tsx` create
`:1493`, rename `:1515`, delete `:1534` — replacing `window.prompt`/
`window.confirm` with the inline `ConfirmDialog`+`<input>` pattern, driving
`createLibraryFolder` / `renameLibraryFolder` / `deleteLibraryFolder` actions
(RPCs `delete_library_folder`, `reorder_library_folders`).
Discharges: `ADV-FOLDER-DELETE-FAIL`, `ADV-CONCURRENT-RENAME`.

Should verify:

- Create success, validation failure, and server failure.
- Rename success, validation failure, and server failure.
- Delete confirmation cancel/confirm (folder vs category never conflated in copy).
- Delete failure message remains visible.
- Focus returns to the invoking folder action.
- Empty selected folder state remains stable.

### Applied filters (Phase 1)

Extend `tests/vitest/workshop-library-consolidation-ui.test.tsx` (the existing
broad component-manager DOM suite), or add
`tests/vitest/library-applied-filters.test.tsx` (net-new — this file does not
exist yet; create it first if you take the add-a-file path rather than extending
the consolidation suite).
Run: `vitest run tests/vitest/library-applied-filters.test.tsx` (or the
consolidation suite).
Under test: the applied-filter chips/reset/count strip in
`ComponentLibraryManager.tsx` driven by the facet model in
`component-facet-filter.tsx` (`ComponentPricingFreshness = "any"|"fresh"|"stale"|"missing"`,
`getComponentPricingFreshness(item, now)`).
Discharges: `ADV-STALE-URL-PARAMS` (see matrix; folded into filter-state cases).

Should verify:

- Visible chips for supplier, brand, lifecycle (`component_lifecycle_state`: `draft`/`in_production`/`available`/`discontinued`/`archived`), confidence (free text), and pricing freshness.
- Individual chip removal updates state and URL params.
- Clear-all resets all filters.
- Filtered count and no-results state update.

### Insert template picker (Phase 4)

Add `tests/vitest/library-template-insert-picker.test.tsx` (net-new — file does
not exist yet; create it before the first run).
Run: `vitest run tests/vitest/library-template-insert-picker.test.tsx`.
Under test: `InsertIntoEstimatePicker.tsx` (a `Modal`) driving
`listEstimateInsertTargets` and `resolveEstimateTemplateInsertTarget` (the
insert-target resolver; this is Flow 7 in doc 02). Server-side rejection of
stale/foreign targets is also covered by an action test below.
Discharges: `ADV-XWS-ESTIMATE-TARGET` (doc 18 folds both the target-deleted and
source-changed-after-picker cases into this ID), `ADV-TEMPLATE-DEP`.

Should verify:

- No projects empty state.
- Project with no estimates empty state.
- Estimate with no resolvable target (group/area) error state from `resolveEstimateTemplateInsertTarget`.
- Submit disabled until a valid target exists.
- Target disclosure text is visible before submit.
- Submit failure stays inline and does not close.
- Success exposes "Open estimate" if implemented.

### Bulk archive copy (Phase 0B)

Extend `tests/vitest/bulk-destructive-preview-modal.test.tsx`.
Run: `vitest run tests/vitest/bulk-destructive-preview-modal.test.tsx`.
Under test: `BulkDestructivePreviewModal.tsx` `confirmationHint` at `:107-108`
(currently `canExecute ? "This action cannot be undone." : ...`, gated on
`canExecute`, NOT on the verb). The archive-copy fix branches the hint on
`actionCopy.verb` so archive does not claim irreversibility. Backing actions:
`previewBulkArchiveLibraryComponents` / `executeBulkArchiveLibraryComponents`
(RPCs `preview_bulk_archive_library_components` /
`execute_bulk_archive_library_components`).
Discharges: `ADV-BULK-COPY` (doc 18 folds the bulk partial-invalid-IDs case into
this ID via the preview path).

Should verify:

- Archive copy does not claim irreversibility (archive is restorable: lifecycle `archived` is recoverable, not row removal).
- Irreversible copy remains available for true delete flows if the modal stays generic.

## Static Guards

Add or run these checks during implementation. The native-prompt grep must
cover all three in-scope surfaces: the components-tab manager
(`component-library-manager/`), the inspector-dock surfaces (`library/`), and
the estimate-page panel (`component-library/index.tsx`) — the last is in
`00-PLAN.md` scope (Phase-later) but still holds `window.confirm` at
`component-library/index.tsx:939` and `window.prompt` at `:1428`, so it must not
be silently dropped from the guard.

- `rg -n "window\\.(prompt|confirm)" src/components/workshop/component-library-manager src/components/workshop/library src/components/workshop/component-library/index.tsx`
  - Phase 0B target (must reach zero): `ComponentLibraryManager.tsx:1493` (create), `:1515` (rename), `:1534` (delete); `AddComponentModal.tsx:963` (discard draft).
  - Phase-later target (tracked, may remain after 0B): `component-library/index.tsx:939`, `:1428`.
  - Note: matches in `library/template-editor/TemplateEditorClient.tsx` and `library/templates-browse/TemplatesBrowseManager.tsx` are comments, not calls — already migrated; do not re-flag.
- `rg -n "cannot be undone|reversible|archive" src/components/workshop/BulkDestructivePreviewModal.tsx src/components/workshop/component-library-manager` — confirm the bulk-archive `confirmationHint` (`BulkDestructivePreviewModal.tsx:107-108`) branches on `actionCopy.verb`, not blanket `canExecute`.
- `git diff --check`

## Suggested Command Pattern

Run the narrowest relevant commands first. Use `vitest run <file>` for single
jsdom suites — `bun test <path>` would silently skip them (it is bound to
`tests/unit`, see "How to run the jsdom suites").

```bash
vitest run tests/vitest/library-overview.test.tsx
vitest run tests/vitest/library-overview-navigation.test.tsx
vitest run tests/vitest/component-library-folder-actions.test.ts
vitest run tests/vitest/library-add-component-modal-a11y.test.tsx
vitest run tests/vitest/library-template-insert-picker.test.tsx
git diff --check
```

Then widen only if the touched surface justifies it:

```bash
vitest run tests/vitest/workshop-library-consolidation-ui.test.tsx
vitest run tests/vitest/template-gallery.test.tsx tests/vitest/template-editor.test.tsx
bun run test:dom   # all jsdom suites
bun run validate   # full gate: type-check && lint && lint:design-system && lint:design && test && test:dom
```

## Browser-Proof Criteria

Use Playwright/manual browser proof only for (default harness:
`e2e/workshop-library-routes.spec.ts` / `e2e/workshop-template-insert-smoke.spec.ts`,
run via `bun run test:e2e`):

- Real route navigation/back-forward behavior across Library tabs and `?component=<id>`.
- Mobile/responsive Library layout, including inspector-dock (`ComponentInspectorDock.tsx`) drawer overlap on narrow screens.
- Sticky header or scroll containment claims.
- Portal clipping or z-index claims (`z-[1000]` modal / `z-[1050]` menu/popover / `z-[1100]` tooltip).
- Drag/drop pointer behavior (folder reorder).
- Actual focus trapping across portals.
- Supabase-backed insertion smoke (`resolveEstimateTemplateInsertTarget`) where provider state matters.

Skip browser automation for:

- Copy-only changes.
- Pure source redirects.
- Cache key changes.
- Server-action payload construction.
- Static ARIA attributes already provable in Vitest.
- Component-level modal content that Testing Library can verify.

## UltraQA Scenario Matrix

These `ADV-*` IDs are the shared single source of truth across this doc and
`18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md`: each row in doc 18's "Adversarial
Scenario Matrix" maps onto one of these IDs (crosswalk below), and the
completion gate at the end of this doc requires doc 18 to be relabelled with
these exact IDs so the two matrices never drift. Each row here names the owning
test file/command (run via `vitest run`, never `bun test`) so an implementer can
discharge it directly. Bound to the keystone: lifecycle uses the five
`component_lifecycle_state` values; link/snapshot divergence is `source-changed`
(never "stale", which is pricing-only); the out-of-order case is FUTURE because
components-tab search is 100% client-side synchronous today (the
`sheetItems.filter((item) => componentMatchesFacets(...))` call at
`ComponentLibraryManager.tsx:877`).

Crosswalk to doc 18 rows (doc 18 currently labels rows by prose only): the doc 18
"Low-confidence insert" and "Discontinued insert" rows fold into `ADV-TEMPLATE-DEP`
plus the insert-picker lifecycle gating; "Source changed after insert picker" and
"Target estimate deleted" fold into `ADV-XWS-ESTIMATE-TARGET`; "Cross-workspace
folder mutation" folds into `ADV-CONCURRENT-RENAME` / `ADV-FOLDER-DELETE-FAIL`
server-side coverage; "Bulk action partial invalid IDs", "Screen reader route
open", "Template partial failure", and "Import/export future path" map to
`ADV-BULK-COPY`, `ADV-DELETED-RESULT`, `ADV-XWS-ESTIMATE-TARGET`, and
`ADV-PUBLIC-REDACTION` respectively. When doc 18 is updated, give every doc 18 row
its `ADV-*` ID directly so this crosswalk paragraph can be deleted.

Rows tagged `(net-new)` require CREATING the owning test file first — it does not
exist under `tests/vitest/` yet, so the first `vitest run` will fail with "no
such file" until the file is authored. Untagged rows extend an existing suite
from "Existing Useful Coverage". The nine net-new files in this pack are
`library-route-state-authz.test.tsx`, `estimate-insert-target-authz.test.tsx`,
`library-workspace-switch-cache.test.tsx`, `share-snapshot-redaction.test.tsx`,
`library-viewer-authz.test.tsx`, `library-add-component-modal-a11y.test.tsx`,
`library-template-insert-picker.test.tsx`, `library-applied-filters.test.tsx`,
and `library-overview-navigation.test.tsx`; this mirrors how doc 18 tags
`(net-new)` vs `(extend existing)`.

| ID | Scenario | Risk | Phase | Owning test + command | Evidence needed |
| --- | --- | --- | --- | --- | --- |
| ADV-DELETED-RESULT | Overview search/recent result opens a deleted/foreign component | User loses exact item; not-found leak | 1 | `vitest run tests/vitest/library-overview-navigation.test.tsx` (net-new) | DOM route-state test into `?component=<id>`; recoverable not-found; later browser route proof only if router behavior changes |
| ADV-DIRTY-ADD-NESTED | Dirty Add Component close with nested listbox open | Wrong overlay closes or draft lost | 0B/3 | `vitest run tests/vitest/library-add-component-modal-a11y.test.tsx` (net-new) | DOM keyboard test (Escape closes `z-[1050]` listbox before `z-[1000]` modal; dirty close opens `ConfirmDialog`, not `window.confirm`); browser proof only if portal/focus trap changes |
| ADV-FOLDER-DELETE-FAIL | Folder delete server failure | User thinks folder was deleted | 0B | `vitest run tests/vitest/component-library-folder-actions.test.ts` | DOM `deleteLibraryFolder` failure test; error stays visible |
| ADV-STALE-URL-PARAMS | Filtered catalogue with stale URL params | Empty or incorrect state | 1 | `vitest run tests/vitest/library-applied-filters.test.tsx` (net-new) | DOM URL-param + no-results tests over `getComponentPricingFreshness` facet state |
| ADV-XWS-ESTIMATE-TARGET | Template insert with no valid / stale / foreign target | Rows inserted somewhere unexpected; wrong-estimate mutation | 4 | `vitest run tests/vitest/library-template-insert-picker.test.tsx` (net-new) + action test (below) | Insert-picker disabled/error state from `resolveEstimateTemplateInsertTarget`; server action rejects stale/foreign target via `can_edit_estimate` |
| ADV-BULK-COPY | Bulk archive copy claims irreversibility | User mistrusts action | 0B | `vitest run tests/vitest/bulk-destructive-preview-modal.test.tsx` | Copy unit test on `confirmationHint` branching on `actionCopy.verb` |
| ADV-MOBILE-BROWSE | Mobile component browse / inspector-dock drawer overlap | Controls overlap or scroll traps fail | 5 | Playwright `e2e/workshop-library-routes.spec.ts` (manual/browser) | Browser/manual proof after layout changes (jsdom cannot prove geometry) |
| ADV-KEYBOARD-MGMT | Keyboard-only library management | Accessibility regression | 0B/5 | `vitest run tests/vitest/component-library-folder-actions.test.ts` + `...modal-a11y.test.tsx` | Manual ARIA/focus DOM tests first (no axe harness); browser proof for portal focus if needed |
| ADV-XWS-COMPONENT-PARAM | Cross-workspace `?component=<id>` param | IDOR / data leak | 0A | `vitest run tests/vitest/library-route-state-authz.test.tsx` (net-new, Phase 0A scaffold) | Permission-safe not-found/denied test, no object detail leaked |
| ADV-XWS-ESTIMATE-ACTION | Cross-workspace estimate insert target (server) | Wrong estimate mutation | 0A | `vitest run tests/vitest/estimate-insert-target-authz.test.tsx` (net-new) | Server-action test that `resolveEstimateTemplateInsertTarget` rejects stale/foreign target |
| ADV-WS-SWITCH-CACHE | Workspace switch with inspector dock open | Prior-workspace cache bleed | 0A | `vitest run tests/vitest/library-workspace-switch-cache.test.tsx` (net-new) | Query/cache test proving `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` (currently un-scoped `["workspace-component-library"]`) clears/refetches on switch |
| ADV-PUBLIC-REDACTION | Public/shared snapshot includes private source metadata | Private data leak | 0A | `vitest run tests/vitest/share-snapshot-redaction.test.tsx` (net-new) | Redaction assertions on the snapshot builder field selection (snapshot builder `src/lib/publication/actions.ts`, writes `snapshot_json` at `:566`/`:636`; helper context `activity-helpers.ts`) for `pricing_source`, `confidence`, price history into `project_publications.snapshot_json` — NOT a live library endpoint |
| ADV-VIEWER-MUTATION | Viewer opens Quick Add or submits a mutation | Unauthorized mutation | 0A/3 | `vitest run tests/vitest/library-viewer-authz.test.tsx` (net-new) | UI hidden/disabled assertion + server denial via `is_workspace_editor` (role in owner/admin/member; viewer read-only) |
| ADV-QUICKADD-UNSAFE | Formula-like text or invalid `pricing_source` URL | Unsafe stored source / export data | 3 | `vitest run tests/vitest/library-add-component-modal-a11y.test.tsx` (net-new) | Field validation/sanitization test (app-side URL validation over free-text `pricing_source`) |
| ADV-CONCURRENT-RENAME | Folder renamed/deleted concurrently | Silent overwrite or wrong route state | 0B | `vitest run tests/vitest/component-library-folder-actions.test.ts` | Conflict/retry test; no silent overwrite |
| ADV-TEMPLATE-DEP | Template dependency archived/discontinued | Unsafe reuse | 4 | `vitest run tests/vitest/library-template-insert-picker.test.tsx` (net-new) | Preview warning/block/override test over the computed-JOIN trust counts |
| ADV-OUT-OF-ORDER | Slow old search returns after newer query | Stale results replace current intent | 5 (FUTURE) | `vitest run tests/vitest/library-server-search.test.tsx` (only if server-side search is built) | Out-of-order handling test — NOT applicable today (search is client-side synchronous); scope only if a server/FTS search is added |
| ADV-DENSE-500 | 500-row dense view | UI stalls or keyboard path breaks | 5 | `bun run test:e2e` perf smoke + Phase 0A seed (`scripts/seed-performance-test-data.ts`, extended to seed N `cost_library_items`) | Measured budget against seeded rows, or documented `WORKSHOP_VIRTUALIZATION_FLAGS` fallback, plus a11y review |

## Completion Gate For Future Implementation

A future implementation should not be marked complete until:

- Targeted tests for changed behavior pass (run via `vitest run <file>` / `bun run test:dom`, never `bun test`).
- Static grep (`rg -n "window\\.(prompt|confirm)" ...` over the three in-scope surfaces) confirms the Phase 0B targets reach zero; any remaining hit is a tracked Phase-later item (`component-library/index.tsx:939`, `:1428`), not a silent miss.
- `git diff --check` passes.
- Browser-only claims have browser evidence (`bun run test:e2e` or manual) or are explicitly listed as not tested.
- Remaining risks are written in the implementation handoff or final report.
- Actor/authz (`is_workspace_editor`), cross-workspace IDOR (`?component=<id>`), public/private snapshot redaction (`snapshot_json`), workspace-switch cache (un-scoped `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY`), and stale insert target (`resolveEstimateTemplateInsertTarget` + `can_edit_estimate`) cases pass for any touched protected flow — these are `ADV-XWS-COMPONENT-PARAM`, `ADV-VIEWER-MUTATION`, `ADV-PUBLIC-REDACTION`, `ADV-WS-SWITCH-CACHE`, `ADV-XWS-ESTIMATE-ACTION`.
- Performance/concurrency evidence exists for dense mode (`ADV-DENSE-500`, measured against `scripts/seed-performance-test-data.ts` extended for `cost_library_items`, or `WORKSHOP_VIRTUALIZATION_FLAGS` fallback). The server-search out-of-order case (`ADV-OUT-OF-ORDER`) is N/A until a server/FTS search ships.
- Each `ADV-*` run result (command + pass / skip-with-risk / no-go + date) is recorded in `24-EXECUTION-EVIDENCE-LEDGER.md` under the matching `ADV-*` row; doc 18's per-ID status mirrors that ledger (the QA plan owns the run commands, doc 24 is the single home for the recorded result, so nothing is left unplanned).
- `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md` has been relabelled with the shared `ADV-*` IDs and carries a pass / skip-with-risk / no-go status per ID for implemented scenarios (so the two matrices cannot drift).
