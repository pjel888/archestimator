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

### C-005 resolved — canonical test commands

> **NEVER use bare `bun test` for vitest suites.** `package.json:21` binds
> `"test": "bun test tests/unit"`, so `bun test <path>` points the Bun runner at
> the wrong suite and silently ignores anything under `tests/vitest/`. The
> canonical jsdom command is `bun run test:dom`; the canonical E2E command is
> `bun run test:e2e`. See
> [26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md) C-005.

The jsdom suites live in `tests/vitest/*.test.tsx` and run under the `test:dom`
script (`vitest run --maxWorkers=1`). Use one of:

| Goal | Command |
| --- | --- |
| Run one jsdom suite | `vitest run tests/vitest/<file>` |
| Run all jsdom suites | `bun run test:dom` |
| Run the full gate | `bun run validate` (`type-check && lint && lint:design-system && lint:design && test && test:dom`) |
| E2E / browser smoke | `bun run test:e2e` (Playwright) |

### C-014 resolved — axe harness status

> **Axe / jest-axe is NOT currently configured.** Until Phase 0A, every a11y
> check in this doc is a **manual ARIA / focus / keyboard assertion** written in
> Testing Library. The axe harness is a **Phase 0A deliverable**: configure
> `jest-axe` for jsdom + `@axe-core/playwright` for Playwright during Phase 0A.
> Post-0A, every Library component must pass
> `expect(await axe(page)).toHaveNoViolations()`. See
> [31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md](31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md) §3
> and [26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md) C-014.

### 12-dimension row template for test scenarios

Every test scenario row below satisfies the
[34-ROW-LEVEL-COMPLETENESS-MATRIX.md](34-ROW-LEVEL-COMPLETENESS-MATRIX.md)
standard. The compact inline form is:

```
Owner: <role> | Phase: <phase> | Flag: <flag> | Rollback: <behavior> | Evidence: EV-<n> | Telemetry: <event> | Copy: <key> | A11y: <criterion> | Perf: <budget> | Browser-proof: <boundary> | i18n: <rule> | Binding: <file:line>
```

For dimensions delegated to a companion doc, use `see <doc> §<section>`. For
truly not-applicable dimensions use `n/a` with a one-line justification.

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

### Cluster gating and rollback decision rules (closes doc-25 §3 gaps for this doc)

> Doc 25 §3 names five gaps for this doc. The per-row `Flag:` and `Rollback:`
> values in the matrix below carry `n/a` for many rows; this section is the
> auditor's justification so those `n/a`s are deliberate, not silent. Owner
> roles from doc 27 §2; flags from doc 21; rollback mechanics from doc 17.

**Gap 1 — feature-flag/rollout gating per test cluster.** The flag that gates a
cluster is the flag that gates the phase the cluster belongs to (doc 21 §4 is
canonical). The map:

| Test cluster (by phase) | Phase flag(s) | Why rows in this cluster carry the `Flag:` values they do |
|-------------------------|---------------|-----------------------------------------------------------|
| Phase 0A (contract-lock suites) | n/a (test/contract only — no shipped behavior) | Every 0A row carries `Flag: n/a` because 0A scaffolds invariants; the SUITES ship without a behavior change behind a flag |
| Phase 0B (overlay + route-state) | `library_folder_dialogs`, `library_component_deep_link` (doc 21 §4) | Folder-action + Add-modal rows carry `Flag: n/a` because the dialog pattern is unconditional once shipped (no user-facing toggle); the deep-link e2e row carries `library_component_deep_link` because the `?component=<id>` param CAN be dropped without stranding the URL |
| Phase 1 (findability + filters) | `library_component_deep_link`, glass-shell flag per doc 21 §4 (C-022) | Filter + overview rows carry `Flag: n/a` (unconditional); route-navigation e2e carries `library_component_deep_link` |
| Phase 2 (trust chips) | `library_trust_chips` (doc 21 §4) | Trust-chip rows carry `Flag: n/a` at the test level (the chip renders when `library_trust_chips` is on, but the test does not flip the flag — the e2e row does); the 90-day-guard row is a static `rg`, flag-agnostic |
| Phase 3 (Quick Add) | `library_quick_add` (doc 21 §4) | Validation rows carry `Flag: n/a`; the `ADV-VIEWER-MUTATION` row carries `Flag: n/a` because `is_workspace_editor` denial is server-side and unconditional |
| Phase 4 (templates) | reuses `library_trust_chips` (doc 21 §4) | All Phase 4 rows carry `Flag: n/a` (no Phase-4-specific flag) |
| Phase 5 (dense mode + browser polish) | `library_dense_mode`, `library_virtualization_enabled` (doc 21 §4) | Dense + mobile + visual rows carry the Phase-5 flags explicitly (these rows MUST flip the flag in the test harness) |

**Gap 2 — rollback/fix-forward criterion per ADV row.** Decision rule:

- If the row's owning phase has a flag (table above), rollback = **redeploy
  flag=false** (fix-forward, ~5 min per C-010). The row carries `Rollback:
  redeploy flag=false`.
- If the row's owning phase has no flag (0A test/contract; 0B/3 unconditional
  dialog/validation; 4 trust-summary reuses 2's flag), rollback = **`git revert`
  the phase commit + redeploy**. The row carries `Rollback: n/a (no flag —
  revert the phase commit)` — this is the `n/a` with justification the matrix
  uses.
- The cache-bleed stop condition (doc 17) is the canonical re-plan trigger: if
  `ADV-WS-SWITCH-CACHE` cannot close with the key scoped by `workspaceId`
  across all 6 call sites, the phase is NO-GO and re-plans, not "rolls back."

**Gap 3 — telemetry/event assertions tied to user-visible flows.** Every row in
the matrix whose `Telemetry:` value names a `library_*` / `trust_*` /
`quick_add_*` / `insert_*` / `overlay_*` / `bulk_*` event MUST assert in the test
that the event fires exactly once with the documented payload (doc 20 is
canonical for the payload). The spy is on `console.warn` (the closed-beta sink
per C-009). Rows whose `Telemetry:` value is `n/a` have no user-visible flow to
instrument (static guards, copy-only assertions, server-action authz denial
where the event is named on the adjacent `ADV-TELEMETRY-EMITS` row instead).

**Gap 5 — browser-proof evidence versioned per scenario.** Every row whose
`Browser-proof:` value is `Playwright` or `Playwright for <reason>` MUST capture
a screenshot + companion `.json` metadata per doc 29 §4 into the doc-24 evidence
path `_evidence/<phase>/<scenario>/<browser>-<viewport>-<timestamp>.png`. The
timestamp + harness fields in the `.json` ARE the versioning — a re-run after a
layout change produces a new timestamped artifact, and the old one is retained
for regression diffing. Rows whose `Browser-proof:` value is `jsdom` do not
produce a browser artifact (their evidence is the vitest pass/fail recorded in
doc 24).

**Gap 4 — copy/a11y/RTL coverage explicit.** Closed by the "Copy / a11y / RTL
checklist" section below (cross-cutting rows every relevant scenario must
satisfy) PLUS the per-row `Copy:` / `A11y:` / `i18n:` 12-dim metadata. The two
are complementary: the checklist is the shared pass condition; the per-row
metadata is the delegation pointer to the owning companion doc (22/31/28).



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

Crosswalk to doc 18 rows: doc 18 now carries the shared `ADV-*` IDs directly on
every row (verified 2026-06-21 — the prior "doc 18 labels rows by prose only"
state is resolved), so the two matrices no longer drift and the prose-only
crosswalk that lived here is retired. The historical mapping was: doc 18
"Low-confidence insert" and "Discontinued insert" -> `ADV-TEMPLATE-DEP` plus the
insert-picker lifecycle gating; "Source changed after insert picker" and "Target
estimate deleted" -> `ADV-XWS-ESTIMATE-TARGET`; "Cross-workspace folder mutation"
-> `ADV-CONCURRENT-RENAME` / `ADV-FOLDER-DELETE-FAIL` server-side coverage;
"Bulk action partial invalid IDs", "Screen reader route open", "Template partial
failure", and "Import/export future path" -> `ADV-BULK-COPY`, `ADV-DELETED-RESULT`,
`ADV-XWS-ESTIMATE-TARGET`, and `ADV-PUBLIC-REDACTION` respectively. The
Completion Gate at the end of this doc still requires doc 18 and doc 06 to use
IDENTICAL IDs.

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

**Shared net-new files (one authorship closes multiple ADV rows):** several
net-new files discharge more than one ADV row, so authoring them is shared work
across phases:

| Net-new file | Discharges ADV IDs |
| --- | --- |
| `library-add-component-modal-a11y.test.tsx` | `ADV-DIRTY-ADD-NESTED`, `ADV-QUICKADD-UNSAFE`, `ADV-KEYBOARD-MGMT` (a11y portions) |
| `library-template-insert-picker.test.tsx` | `ADV-XWS-ESTIMATE-TARGET`, `ADV-TEMPLATE-DEP` |
| `component-library-folder-actions.test.ts` (extend) | `ADV-FOLDER-DELETE-FAIL`, `ADV-CONCURRENT-RENAME`, `ADV-KEYBOARD-MGMT` (folder portions) |
| `library-overview-navigation.test.tsx` | `ADV-DELETED-RESULT` |
| `library-applied-filters.test.tsx` | `ADV-STALE-URL-PARAMS` |

An implementer authoring one of these files should know up front which other ADV
rows it closes, so a single authorship is not mistaken for a single-row
deliverable.

| ID | Scenario | Risk | Phase | Owning test + command | Evidence needed | 12-dim metadata |
| --- | --- | --- | --- | --- | --- | --- |
| ADV-DELETED-RESULT | Overview search/recent result opens a deleted/foreign component | User loses exact item; not-found leak | 1 | `vitest run tests/vitest/library-overview-navigation.test.tsx` (net-new) | DOM route-state test into `?component=<id>`; recoverable not-found; later browser route proof only if router behavior changes | Owner: QA lead \| Phase: 1 \| Flag: n/a \| Rollback: n/a \| Evidence: EV-06-001 \| Telemetry: `library_search_executed`, `library_component_selected` \| Copy: see 22 §search/result \| A11y: see 31 §4 Library overview \| Perf: n/a \| Browser-proof: jsdom (route-state DOM); Playwright for real navigation \| i18n: n/a \| Binding: LibraryOverviewSearch.tsx:258; LibraryPageClient.tsx route state (doc 19) |
| ADV-DIRTY-ADD-NESTED | Dirty Add Component close with nested listbox open | Wrong overlay closes or draft lost | 0B/3 | `vitest run tests/vitest/library-add-component-modal-a11y.test.tsx` (net-new) | DOM keyboard test (Escape closes `z-[1050]` listbox before `z-[1000]` modal; dirty close opens `ConfirmDialog`, not `window.confirm`); browser proof only if portal/focus trap changes | Owner: QA lead \| Phase: 0B/3 \| Flag: n/a \| Rollback: n/a \| Evidence: EV-06-002 \| Telemetry: `overlay_opened`, `overlay_closed` \| Copy: see 22 §discard-confirm \| A11y: see 31 §4 Quick add form + Overlay/modal \| Perf: n/a \| Browser-proof: jsdom; Playwright for portal focus if changed \| i18n: n/a \| Binding: AddComponentModal.tsx:963 (doc 19) |
| ADV-FOLDER-DELETE-FAIL | Folder delete server failure | User thinks folder was deleted | 0B | `vitest run tests/vitest/component-library-folder-actions.test.ts` | DOM `deleteLibraryFolder` failure test; error stays visible | Owner: QA lead \| Phase: 0B \| Flag: n/a \| Rollback: n/a \| Evidence: EV-06-003 \| Telemetry: `folder_deleted` (attempt), `folder_delete_failed` \| Copy: see 22 §folder-delete \| A11y: see 31 §4 Folder management \| Perf: n/a \| Browser-proof: jsdom \| i18n: n/a \| Binding: ComponentLibraryManager.tsx:1534 (doc 19) |
| ADV-STALE-URL-PARAMS | Filtered catalogue with stale URL params | Empty or incorrect state | 1 | `vitest run tests/vitest/library-applied-filters.test.tsx` (net-new) | DOM URL-param + no-results tests over `getComponentPricingFreshness` facet state | Owner: QA lead \| Phase: 1 \| Flag: n/a \| Rollback: n/a \| Evidence: EV-06-004 \| Telemetry: `filter_applied`, `filter_reset` \| Copy: see 22 §filter \| A11y: see 31 §4 Search/filter \| Perf: n/a \| Browser-proof: jsdom \| i18n: n/a \| Binding: component-facet-filter.tsx:12,61 (doc 19) |
| ADV-XWS-ESTIMATE-TARGET | Template insert with no valid / stale / foreign target | Rows inserted somewhere unexpected; wrong-estimate mutation | 4 | `vitest run tests/vitest/library-template-insert-picker.test.tsx` (net-new) + action test (below) | Insert-picker disabled/error state from `resolveEstimateTemplateInsertTarget`; server action rejects stale/foreign target via `can_edit_estimate` | Owner: QA lead \| Phase: 4 \| Flag: n/a \| Rollback: n/a \| Evidence: EV-06-005 \| Telemetry: `insert_target_resolved`, `insert_target_failed` \| Copy: see 22 §insert-target \| A11y: see 31 §4 Template preview \| Perf: n/a \| Browser-proof: jsdom; Playwright for route transition \| i18n: n/a \| Binding: resolveEstimateTemplateInsertTarget + can_edit_estimate (doc 19) |
| ADV-BULK-COPY | Bulk archive copy claims irreversibility | User mistrusts action | 0B | `vitest run tests/vitest/bulk-destructive-preview-modal.test.tsx` | Copy unit test on `confirmationHint` branching on `actionCopy.verb` | Owner: QA lead \| Phase: 0B \| Flag: n/a \| Rollback: n/a \| Evidence: EV-06-006 \| Telemetry: `bulk_action_previewed` \| Copy: see 22 §bulk-archive \| A11y: see 31 §4 Overlay/modal \| Perf: n/a \| Browser-proof: jsdom \| i18n: n/a \| Binding: BulkDestructivePreviewModal.tsx:107-108 (doc 19) |
| ADV-MOBILE-BROWSE | Mobile component browse / inspector-dock drawer overlap | Controls overlap or scroll traps fail | 5 | Playwright `e2e/workshop-library-routes.spec.ts` (manual/browser) | Browser/manual proof after layout changes (jsdom cannot prove geometry) | Owner: QA lead \| Phase: 5 \| Flag: `library_dense_mode` (resolves C-004 — doc 21 §4 registers `library_dense_mode` + independent `library_virtualization_enabled`; there is NO `library_overlays_v2` flag anywhere — that was a phantom reference) \| Rollback: redeploy flag=false (fix-forward, ~5 min, C-010) \| Evidence: EV-06-007 (screenshot `phase-5/mobile-browse/...`) \| Telemetry: n/a \| Copy: n/a \| A11y: see 31 §4 Component inspector \| Perf: see 30 §dense mobile (PROVISIONAL until Phase 0A baseline per C-015) \| Browser-proof: Playwright (e2e/workshop-library-routes.spec.ts) \| i18n: n/a \| Binding: ComponentInspectorDock.tsx (doc 19) |
| ADV-KEYBOARD-MGMT | Keyboard-only library management | Accessibility regression | 0B/5 | `vitest run tests/vitest/component-library-folder-actions.test.ts` + `...modal-a11y.test.tsx` | Manual ARIA/focus DOM tests first (no axe harness); browser proof for portal focus if needed | Owner: QA lead \| Phase: 0B/5 \| Flag: n/a \| Rollback: n/a \| Evidence: EV-06-008 \| Telemetry: `overlay_opened`, `overlay_closed` \| Copy: n/a \| A11y: see 31 §4 all surfaces \| Perf: n/a \| Browser-proof: jsdom; Playwright for cross-portal focus \| i18n: n/a \| Binding: ComponentLibraryManager.tsx; AddComponentModal.tsx (doc 19) |
| ADV-XWS-COMPONENT-PARAM | Cross-workspace `?component=<id>` param | IDOR / data leak | 0A | `vitest run tests/vitest/library-route-state-authz.test.tsx` (net-new, Phase 0A scaffold) | Permission-safe not-found/denied test, no object detail leaked | Owner: Security lead \| Phase: 0A \| Flag: n/a \| Rollback: n/a \| Evidence: EV-06-009 \| Telemetry: `route_state_authz_denied` \| Copy: see 22 §permission-denied \| A11y: see 31 §4 Public snapshot \| Perf: n/a \| Browser-proof: jsdom \| i18n: n/a \| Binding: LibraryPageClient.tsx route state (doc 19) |
| ADV-XWS-ESTIMATE-ACTION | Cross-workspace estimate insert target (server) | Wrong estimate mutation | 0A | `vitest run tests/vitest/estimate-insert-target-authz.test.tsx` (net-new) | Server-action test that `resolveEstimateTemplateInsertTarget` rejects stale/foreign target | Owner: Security lead \| Phase: 0A \| Flag: n/a \| Rollback: n/a \| Evidence: EV-06-010 \| Telemetry: `insert_target_authz_denied` \| Copy: see 22 §permission-denied \| A11y: n/a \| Perf: n/a \| Browser-proof: jsdom (server action) \| i18n: n/a \| Binding: resolveEstimateTemplateInsertTarget + can_edit_estimate (doc 19) |
| ADV-WS-SWITCH-CACHE | Workspace switch with inspector dock open | Prior-workspace cache bleed | 0A | `vitest run tests/vitest/library-workspace-switch-cache.test.tsx` (net-new) | Query/cache test proving `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` (currently un-scoped `["workspace-component-library"]`) clears/refetches on switch | Owner: Backend lead \| Phase: 0A \| Flag: n/a \| Rollback: n/a \| Evidence: EV-06-011 \| Telemetry: `workspace_switched`, `cache_invalidated` \| Copy: n/a \| A11y: n/a \| Perf: n/a \| Browser-proof: jsdom \| i18n: n/a \| Binding: WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY (doc 19) |
| ADV-PUBLIC-REDACTION | Public/shared snapshot includes private source metadata | Private data leak | 0A | `vitest run tests/vitest/share-snapshot-redaction.test.tsx` (net-new) | Redaction assertions on the snapshot builder field selection (snapshot builder `src/lib/publication/actions.ts`, writes `snapshot_json` at `:653`; the `p_snapshot_json` RPC params at `:577` and `:716`; helper context `activity-helpers.ts`; verified 2026-06-21) for `pricing_source`, `confidence`, price history into `project_publications.snapshot_json` — NOT a live library endpoint | Owner: Security lead \| Phase: 0A \| Flag: n/a \| Rollback: n/a (no flag — revert the phase commit) \| Evidence: EV-06-012 \| Telemetry: `snapshot_redaction_verified` (console.warn sink for closed beta per C-009) \| Copy: see 22 §public-snapshot \| A11y: see 31 §4 Public snapshot \| Perf: n/a \| Browser-proof: jsdom \| i18n: n/a \| Binding: src/lib/publication/actions.ts snapshot_json :653, p_snapshot_json :577/:716 (doc 19) |
| ADV-VIEWER-MUTATION | Viewer opens Quick Add or submits a mutation | Unauthorized mutation | 0A/3 | `vitest run tests/vitest/library-viewer-authz.test.tsx` (net-new) | UI hidden/disabled assertion + server denial via `is_workspace_editor` (role in owner/admin/member; viewer read-only) | Owner: Security lead \| Phase: 0A/3 \| Flag: n/a \| Rollback: n/a \| Evidence: EV-06-013 \| Telemetry: `mutation_authz_denied` \| Copy: see 22 §permission-denied \| A11y: n/a \| Perf: n/a \| Browser-proof: jsdom \| i18n: n/a \| Binding: is_workspace_editor RPC (doc 19) |
| ADV-QUICKADD-UNSAFE | Formula-like text or invalid `pricing_source` URL | Unsafe stored source / export data | 3 | `vitest run tests/vitest/library-add-component-modal-a11y.test.tsx` (net-new) | Field validation/sanitization test (app-side URL validation over free-text `pricing_source`) | Owner: QA lead \| Phase: 3 \| Flag: n/a \| Rollback: n/a \| Evidence: EV-06-014 \| Telemetry: `quick_add_validation_failed` \| Copy: see 22 §quick-add \| A11y: see 31 §4 Quick add form \| Perf: n/a \| Browser-proof: jsdom \| i18n: n/a \| Binding: AddComponentModal.tsx (doc 19) |
| ADV-CONCURRENT-RENAME | Folder renamed/deleted concurrently | Silent overwrite or wrong route state | 0B | `vitest run tests/vitest/component-library-folder-actions.test.ts` | Conflict/retry test; no silent overwrite | Owner: QA lead \| Phase: 0B \| Flag: n/a \| Rollback: n/a \| Evidence: EV-06-015 \| Telemetry: `folder_renamed`, `folder_rename_failed` \| Copy: see 22 §folder-rename \| A11y: see 31 §4 Folder management \| Perf: n/a \| Browser-proof: jsdom \| i18n: n/a \| Binding: ComponentLibraryManager.tsx:1515 (doc 19) |
| ADV-TEMPLATE-DEP | Template dependency archived/discontinued | Unsafe reuse | 4 | `vitest run tests/vitest/library-template-insert-picker.test.tsx` (net-new) | Preview warning/block/override test over the computed-JOIN trust counts | Owner: QA lead \| Phase: 4 \| Flag: n/a \| Rollback: n/a \| Evidence: EV-06-016 \| Telemetry: `template_dependency_warning` \| Copy: see 22 §template-dep \| A11y: see 31 §4 Template preview \| Perf: n/a \| Browser-proof: jsdom; Playwright for insert flow \| i18n: n/a \| Binding: library-template-insert-picker + lifecycle enum (doc 19) |
| ADV-OUT-OF-ORDER | Slow old search returns after newer query | Stale results replace current intent | 5 (FUTURE) | `vitest run tests/vitest/library-server-search.test.tsx` (only if server-side search is built) | Out-of-order handling test — NOT applicable today (search is client-side synchronous); scope only if a server/FTS search is added | Owner: QA lead \| Phase: 5 (FUTURE) \| Flag: n/a \| Rollback: n/a \| Evidence: EV-06-017 \| Telemetry: n/a \| Copy: n/a \| A11y: n/a \| Perf: n/a \| Browser-proof: n/a (future) \| i18n: n/a \| Binding: ComponentLibraryManager.tsx:877 (doc 19) |
| ADV-DENSE-500 | 500-row dense view | UI stalls or keyboard path breaks | 5 | `bun run test:e2e` perf smoke + Phase 0A seed (`scripts/seed-performance-test-data.ts`, extended to seed N `cost_library_items`) | Measured budget against seeded rows, or documented `WORKSHOP_VIRTUALIZATION_FLAGS` fallback, plus a11y review | Owner: Perf lead \| Phase: 5 \| Flag: `library_dense_mode`, `library_virtualization_enabled` \| Rollback: redeploy flag=false \| Evidence: EV-06-018 (screenshot `phase-5b/dense-mode/...`) \| Telemetry: `dense_mode_rendered` \| Copy: n/a \| A11y: see 31 §4 Dense mode row \| Perf: see 30 §dense-500 (provisional until Phase 0A baseline) \| Browser-proof: Playwright (e2e perf smoke) + Phase 0A seed \| i18n: n/a \| Binding: WORKSHOP_VIRTUALIZATION_FLAGS (doc 19) |

## Browser-proof evidence artifacts

Every browser-only claim in this plan is bound to an evidence artifact in
[24-EXECUTION-EVIDENCE-LEDGER.md](24-EXECUTION-EVIDENCE-LEDGER.md) and a
screenshot convention in
[29-BROWSER-PROOF-AND-VISUAL-QA-MATRIX.md](29-BROWSER-PROOF-AND-VISUAL-QA-MATRIX.md) §4.

| Browser-only claim | Evidence ID | Screenshot path convention | Required browsers / viewports | Pass condition |
| --- | --- | --- | --- | --- |
| Real route navigation/back-forward across Library tabs + `?component=<id>` | EV-06-019 | `phase-1/library-route-state/back-forward-<browser>-<viewport>.png` | Chrome macOS 1280, Safari iOS iPhone 15 | No 404s; back restores prior tab + param |
| Inspector-dock drawer overlap on narrow screens | EV-06-020 | `phase-5/mobile-browse/inspector-overlap-<browser>-<viewport>.png` | Safari iOS iPhone 15, Chrome Android Pixel 8 | Toolbar/actions do not overlap content; scrollable |
| Portal clipping / z-index (`z-[1000]`/`z-[1050]`/`z-[1100]`) | EV-06-021 | `phase-0B/overlay/z-index-stack-<browser>-<viewport>.png` | Chrome macOS 1280, Safari macOS 1280 | Menu renders above modal; tooltip renders above menu |
| Drag/drop folder reorder pointer behavior | EV-06-022 | `phase-0B/folder-tree/dnd-reorder-<browser>-<viewport>.png` | Chrome macOS 1280 | Drop target highlights; order persists after drop |
| Cross-portal focus trap | EV-06-023 | `phase-0B/overlay/focus-trap-<browser>-<viewport>.png` | Chrome macOS 1280, Safari macOS 1280 | Tab cycles within top overlay; Esc closes top overlay |
| Dense-mode 500-row render + scroll | EV-06-024 | `phase-5b/dense-mode/row-500-<browser>-<viewport>.png` | Chrome macOS 1280, Safari macOS 1280 | No visible stall; rows render within perf budget |
| Mobile dense-mode chip wrap / truncation | EV-06-025 | `phase-5b/dense-mode/chip-wrap-<browser>-<viewport>.png` | Safari iOS iPhone 15, Safari iOS iPhone SE | Chips wrap without truncation; touch targets ≥44×44px |

> Screenshot storage: `.ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/evidence/screenshots/`. Every `.png` must have a companion `.json` metadata file per 29 §4.

## Copy / a11y / RTL checklist

Every test scenario must discharge the following cross-cutting rows. They are
not alternatives to the per-ADV metadata above; they are shared acceptance
criteria that every relevant scenario must satisfy.

| Check | Owner | Phase | Applies to ADV IDs | Pass condition |
| --- | --- | --- | --- | --- |
| Copy keys render for every user-visible error/denial/empty state | Copy lead | 0A–5 | all | Each rendered string matches [22-COPY-DECK-AND-MICROCOPY.md](22-COPY-DECK-AND-MICROCOPY.md) key; no raw hardcoded strings in test assertions except where 22 delegates |
| ARIA labels live-region announcements for search/filter/state changes | A11y lead | 0A–5 | ADV-DELETED-RESULT, ADV-STALE-URL-PARAMS, ADV-KEYBOARD-MGMT, ADV-DENSE-500 | `aria-live="polite"` announces results/filters/state; `aria-live="assertive"` announces errors/destructive actions (see [31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md](31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md) §5) |
| Keyboard-only management of overlays, lists, and forms | A11y lead | 0B/5 | ADV-DIRTY-ADD-NESTED, ADV-FOLDER-DELETE-FAIL, ADV-CONCURRENT-RENAME, ADV-KEYBOARD-MGMT, ADV-DENSE-500 | Tab/Shift+Tab/Enter/Esc/Arrow keys reach every action; focus returns to trigger on close (manual pre-0A; axe post-0A) |
| RTL-safe layout for chips, filter rows, and inspector fields | i18n lead | 1–5 | ADV-STALE-URL-PARAMS, ADV-MOBILE-BROWSE, ADV-DENSE-500 | Logical CSS properties (`inline-start/end`, `text-start/end`) or documented RTL exception; no left/right absolute positioning for reversible UI |
| Focus indicator visibility ≥2px contrast ≥3:1 | Design lead | 0B–5 | all interactive ADV rows | Manual screenshot review or axe contrast pass post-0A |

## Completion Gate For Future Implementation

**0A-sequencing clause (binding):** the five contract-lock ADV cases —
`ADV-XWS-COMPONENT-PARAM`, `ADV-VIEWER-MUTATION`, `ADV-PUBLIC-REDACTION`,
`ADV-WS-SWITCH-CACHE`, `ADV-XWS-ESTIMATE-ACTION` — are ALL Phase 0A net-new
suites (see `05-IMPLEMENTATION-ROADMAP.md` Seq 1-2: `LIB-P0A-01`/`LIB-P0A-02`).
They MUST land in Phase 0A before any Phase 0B merge; they are NOT gates a later
phase may satisfy retroactively, and 0B/1 deep-link work is blocked on them
(see the doc 05 LIB-P0A-01 dependency edge). The protected-flow clause below
inherits this sequencing.

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
