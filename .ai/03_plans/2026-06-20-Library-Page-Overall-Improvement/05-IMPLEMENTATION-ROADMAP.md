# 05 - Implementation Roadmap

Phase labels and order are canonical per
`19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` ("Canonical Phase Map"):
**0A -> 0B -> 1 -> 2 -> 3 -> 4 -> 5**. Every file path, table, column, enum,
query key, server action, RPC, and test command below is the verified on-disk
name from doc 19; this roadmap does not restate the full binding tables — it
references them. The old `P0` reliability bucket splits into **Phase 0A**
(contract lock, tests-first) and **Phase 0B** (overlay + route-state work).
Folder-prompt replacement lands in **Phase 0B (early)**, and Quick Add is
**Phase 3** — this resolves the prior `17` slice ordering, where folder work was
listed after Quick Add.

Each item carries a `Seq` (global build order) and `Depends on` edge so an
implementer can schedule without re-deriving the graph. Test commands use
`bun run test:dom` (all jsdom suites) or `vitest run tests/vitest/<file>` (one);
`bun test` is bound to `tests/unit` and will NOT run the vitest suites
(doc 19 "Test Commands").

**Evidence-recording rule (applies to EVERY Validation block below):** for each
`Run:` command in this roadmap, the implementer records the command + pass/fail +
date in `24-EXECUTION-EVIDENCE-LEDGER.md` under the matching `LIB-*`/`ADV-*` row
before that Seq item is treated as done. Doc 24 is the single home for execution
evidence (green test runs, rendered UI, applied migration); a phase is not
"done" per the Phase Gate Matrix until its doc-24 rows are populated. This keeps
the loop closed — every named command has a pre-registered place to record its
result.

## Phase 0A - Contract Lock (tests-first, no UI)

Phase 0A locks docs 13/14/15/16/17 + the doc 19 keystone bindings and scaffolds
the route-state / authz / cache / stale-target tests plus the perf baseline
**before** any Phase 0B UI lands. `LIB-P0A-01..03` are the Seq 1-3 prerequisites
for 0B; they are tests-first (no UI change).

### LIB-P0A-01 - Route, payload, and cache contracts

Seq: 1. Depends on: doc 13 locked.

Target:

- Lock `?component=<id>` behavior and the `/workshop/library/templates/[templateId]`
  segment-route navigation (template selection uses the shipped segment route, NOT a
  `?template=<id>` query param — doc 19 / doc 13), invalid-param recovery,
  overview payload additions, insert-target re-resolution, and mutation cache
  invalidation against the EXACT query keys (doc 13 / doc 19). Close the only
  cache-bleed surface: `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY =
  ["workspace-component-library"]` is UN-SCOPED. Its PRIMARY READER is
  `TemplateEditorClient.tsx:160` (`useQuery` for the editor library dock) via the
  inline literal `["workspace-component-library"]` (so a symbol grep misses it —
  same cache entry); it is also invalidated by `LibraryPageClient.tsx:126`,
  `use-estimate-row-mutations.ts:335`, and `EstimateSheetContent.tsx` (the
  in-estimate dock). Scope it by `workspaceId`, mirroring
  `workspaceComponentRowsLibraryQueryKey(workspaceId, projectId?)`, and migrate
  ALL of those call sites — especially the editor's `useQuery` read — or the bleed stays open.

Validation:

- Route-state tests for valid / invalid / deleted / permission-denied selected
  objects (the same 4 cases LIB-P0B-01 implements against).
- Cache tests that include workspace identity (workspace-switch must not bleed)
  and name the exact key(s) each mutation invalidates — no abstract "invalidate
  the library cache". Extend `tests/vitest/library-components-cache.test.tsx`
  and `tests/vitest/library-templates-cache.test.tsx`.
- Insert-target tests proving a stale target cannot mutate the wrong estimate
  (the contract LIB-P4-01 enforces via `resolveEstimateTemplateInsertTarget`).
- Run: `bun run test:dom`.

### LIB-P0A-02 - Security and data-exposure contracts

Seq: 2. Depends on: doc 14 locked.

Target:

- Lock actor capability, object-level authz, RLS expectations, cross-workspace
  IDOR behavior, public/shared redaction, and workspace-switch cache behavior.
  Cross-workspace authz is ALREADY strong (doc 19 RLS/Authz) — the real gaps are
  TESTS, the un-scoped key (LIB-P0A-01), and snapshot redaction. Reframe
  "public leak": the live public surface is `src/app/share/[token]` +
  `src/app/api/share/[token]/route.ts`, which renders a FROZEN
  `project_publications.snapshot_json` (not a live Library query). Redaction is
  about what the snapshot builder `src/lib/publication/actions.ts` puts into
  `snapshot_json` (written at `:566` and `:636`; helper context in
  `activity-helpers.ts`), not a leaking live endpoint. This matches doc 18's
  `ADV-PUBLIC-REDACTION` row exactly.

Validation:

- Viewer / member / admin / owner / public / unauthenticated actor-matrix cases
  asserting `is_workspace_editor` = role in (`owner`,`admin`,`member`) and only
  `viewer` is read-only; `can_edit_estimate` for insert.
- Cross-workspace IDOR tests for component / folder / template / estimate /
  project / file ids (extend
  `tests/vitest/security-findings-library-tooling-contracts.test.ts` and
  `tests/vitest/template-editor-actions-authz.test.ts`).
- Snapshot-builder field-selection assertions: `pricing_source` (source URLs),
  free-text `confidence`, and workspace-only `cost_library_item_price_history`
  are NOT placed into `snapshot_json`.
- Run: `bun run test:dom`.

### LIB-P0A-03 - Performance, network, and concurrency contracts

Seq: 3. Depends on: doc 16 locked.

Target:

- Lock large-list budgets, fallback thresholds, slow/failing network states, and
  concurrent-edit behavior. The REAL perf risk is that
  `loadCurrentWorkspaceComponentRowsLibrary` eagerly loads the FULL nested detail
  graph (versions, price history, state history, attachments) per item — target
  shrinking the browse payload / lazy inspector-scoped detail. Components-tab
  filtering is client-side synchronous (the
  `sheetItems.filter((item) => componentMatchesFacets(item, facetFilters))` call
  at `ComponentLibraryManager.tsx:877`), so there is NO out-of-order/stale-response
  race today; scope server-search /
  FTS / trigram / out-of-order handling as FUTURE-if-budget-exceeded. No Postgres
  FTS/trigram index exists yet.

Validation:

- Extend `scripts/seed-performance-test-data.ts` (today it does NOT seed
  `cost_library_items`) to seed N components, then MEASURE before claiming any
  budget number — no budget is asserted before measurement.
- Dense-mode budget: a measured target (proposed: 500 seeded rows render with a
  steady-state frame <16ms) OR the documented virtualization/pagination fallback
  (reuse `WORKSHOP_VIRTUALIZATION_FLAGS`). The <16ms target is PROVISIONAL until
  the measurement below lands and is recorded.
- Measurement instrument (named, so no clarifying question is needed): measure
  the steady-state frame via either (a) a Playwright trace over the seeded
  dataset — `bun run test:e2e` with `--trace on` against
  `e2e/workshop-library-routes.spec.ts`, reading the trace's frame/commit timing
  — or (b) a `performance.now()` / React Profiler `onRender` commit-duration
  harness placed under `scripts/` driving the seeded rows; record the MEDIAN
  steady-state frame (and the keystroke re-filter ms at 500 and 5,000 rows) in
  `24-EXECUTION-EVIDENCE-LEDGER.md` under the "Perf baseline measurement note"
  row (doc 24, Phase 0A). No 100/500/5,000/10,000 budget number may be asserted
  anywhere in the pack before this doc-24 row is populated.
- Concurrent edit/delete/insert cases return conflict or refetch states (not a
  silent overwrite).
- Run: `bun run test:dom`; perf measurement is recorded in doc 24 (above), not
  jsdom-asserted.

## Phase 0B - Overlay And Route-State Reliability

### LIB-P0B-01 - Add component selection route state (`?component=<id>`)

Seq: 4. Depends on: LIB-P0A-01 (route-state contract + tests scaffolded).

Target:

- Overview search and recent-component cards route to `?component=<id>`; the
  Components route reads the param, opens the inspector dock on that item, and
  highlights its card without losing focus.
- Invalid / deleted / permission-denied `component` param fails safe per the
  doc 13 contract (no crash, dock stays closed, param cleared).

Files (verified paths):

- `src/components/workshop/LibraryPageClient.tsx` (route-state owner for
  `?component=<id>`).
- `src/components/workshop/library/overview/LibraryOverviewSearch.tsx` and
  `src/components/workshop/library/overview/RecentComponentCard.tsx` (emit the
  param).
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
  (reads param, selects card; client-side search already in-memory at the
  `sheetItems.filter(...)` call at `:877`).
- `src/components/workshop/library/ComponentInspectorDock.tsx` (the inspector
  dock that opens on the selected item; 315 lines).

Validation:

- New focused test: Overview search result -> Components selected item opens the
  inspector dock (assert dock visible + focused card).
- New focused test: direct URL `?component=<id>` selects on mount; invalid /
  deleted / denied id falls safe (4 cases per doc 13).
- Existing `library-components-cache.test.tsx`, `library-tabs-layout.test.tsx`,
  and `library-tab-a11y.test.tsx` still green.
- Run: `bun run test:dom` (or `vitest run tests/vitest/library-components-cache.test.tsx`).

### LIB-P0B-02 - Replace component folder native prompts

Seq: 5. Depends on: LIB-P0A-01. Lands EARLY in 0B (before Quick Add, Phase 3).

Target:

- Folder create / rename / delete in `ComponentLibraryManager` use the inline
  text-prompt dialog (the `ConfirmDialog` + child `<input>` + local prompt-state
  pattern from `TemplatesBrowseManager.tsx:531-883`) instead of native
  `window.prompt` / `window.confirm`. There is NO shared `PromptDialog`
  primitive — reuse that inline pattern (doc 19 glossary "text-prompt dialog").
- Inline validation and server errors keep the dialog open; the dialog only
  closes on success or explicit cancel.

Files + actions (verified):

- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
  — replace `window.prompt("Folder name")` at `:1493` (create) and `:1515`
  (rename), and `window.confirm` delete at `:1534`.
- Server actions wired (no new actions): `createLibraryFolder`,
  `renameLibraryFolder`, `deleteLibraryFolder` (in
  `src/lib/component-library/actions.ts`; `deleteLibraryFolder` calls RPC
  `delete_library_folder`).
- Reuse, do not extract a new primitive:
  `src/components/ui/overlays/confirm-dialog.tsx` (`ConfirmDialog`).

Validation:

- Extend `tests/vitest/component-library-folder-actions.test.ts` with
  create / rename / delete via the dialog: blank-name and server-error cases
  keep the dialog open; success closes it.
- Static grep guard: zero `window.prompt` / `window.confirm` in
  `ComponentLibraryManager.tsx` after the change (the in-estimate panel at
  `src/components/workshop/component-library/index.tsx:1428/:939` is tracked
  separately as Phase-later — see LIB-LATER-01, do not silently drop it).
- Run: `vitest run tests/vitest/component-library-folder-actions.test.ts`.

### LIB-P0B-03 - Replace Add Component dirty-discard native confirm

Seq: 6. Depends on: LIB-P0A-01.

Target:

- Closing a dirty Add Component modal shows a design-system `ConfirmDialog`
  instead of the native `window.confirm("Discard this component draft?")`.
- Nested popup close order stays predictable: the discard `ConfirmDialog`
  (`z-[1000]` modal tier) sits above the Add modal; menus/popovers are
  `z-[1050]`, tooltips `z-[1100]` (doc 19 / doc 23 z-index tiers).

Files (verified):

- `src/components/workshop/component-library-manager/AddComponentModal.tsx` —
  replace `window.confirm("Discard this component draft?")` at `:963`.
- `src/components/ui/overlays/confirm-dialog.tsx` (`ConfirmDialog` +
  `ConfirmDialogMessage`).

Validation:

- New dirty-close test in the Add-modal suite: editing a field then closing
  raises the `ConfirmDialog`; Cancel keeps the draft; Discard closes and clears.
- Focus-return assertion: after discard, focus returns to the Add Component
  trigger button.
- Run: `bun run test:dom`.

### LIB-P0B-04 - Fix bulk archive confirmation copy

Seq: 7. Depends on: none (independent overlay fix; can land in parallel with
LIB-P0B-02/03).

Target:

- Archive confirmation copy accurately describes reversibility. The hint must
  NOT say "This action cannot be undone." for the archive verb (archive is
  recoverable; `archived` is a `component_lifecycle_state` value, not a deletion
  — doc 19 Enums).

Exact fix (named):

- `src/components/workshop/BulkDestructivePreviewModal.tsx:107-108` — the
  `confirmationHint` ternary is gated on `canExecute`, NOT on the verb, so the
  archive flow currently emits "This action cannot be undone." Branch the
  `canExecute` arm on `actionCopy.verb` (already derived from
  `getActionCopy(executeLabel)` at `:84`): when
  `actionCopy.verb === "archive"`, use reversible copy
  (e.g. "Archived items can be restored later." — final string per
  `22-COPY-DECK-AND-MICROCOPY.md`); keep "This action cannot be undone." for
  irreversible verbs (delete).
- No change to `ComponentLibraryManager.tsx` is required for the copy fix;
  the modal owns the hint.

Validation:

- Extend `tests/vitest/bulk-destructive-preview-modal.test.tsx`: with
  `executeLabel` = "Archive", assert the hint does NOT contain "cannot be
  undone" and DOES contain the restore copy; with a delete verb, assert it still
  contains "cannot be undone".
- Run: `vitest run tests/vitest/bulk-destructive-preview-modal.test.tsx`.

## Phase 1 - Findability And Applied Filters

### LIB-P1-01 - Visible applied filters

Seq: 8. Depends on: LIB-P0B-01 (the Components route reads URL params).

Target:

- Active facet filters are visible as removable chips outside the filter
  popover; users can remove an individual filter and clear all.
- "stale" in the freshness facet means PRICING freshness only (driven by
  `getComponentPricingFreshness`, `ComponentPricingFreshness =
  "any"|"fresh"|"stale"|"missing"`); never reuse "stale" for link/snapshot
  state (doc 19 glossary).

Files (verified):

- `src/components/workshop/library/component-facet-filter.tsx` (exports
  `COMPONENT_FACET_STALE_DAYS=90` at `:12`,
  `getComponentPricingFreshness(item, now)` at `:61`).
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
  (owns the facet state and the client-side filtered set).
- Reuse an existing chip/badge primitive; do not add a new one without scoping.

Validation:

- DOM tests for chip render, single-chip remove, clear-all, and URL-param
  round-trip (each active facet -> chip -> removed param).
- Run: `bun run test:dom`.

### LIB-P1-02 - Overview search result continuity

Seq: 9. Depends on: LIB-P0B-01.

Target:

- Component search results route to `?component=<id>` and preserve selection
  (continuity into Phase 0B route state); template results continue to open the
  template editor; empty / no-results states stay clear.

Files + action (verified):

- `src/components/workshop/library/overview/LibraryOverviewSearch.tsx`.
- Overview search is server-side via `searchLibraryOverview`
  (`src/lib/component-library/actions.ts`); component-tab filtering is separate
  and client-side (no async race — doc 19 Performance Reality).

Validation:

- Extend `tests/vitest/library-overview.test.tsx`: keyboard Enter, click, and
  Escape on a component result route to `?component=<id>`; a template result
  opens the editor; no-results renders the empty state.
- Run: `vitest run tests/vitest/library-overview.test.tsx`.

### LIB-P1-03 - Result count and scope clarity

Seq: 10. Depends on: LIB-P1-01 (chips), LIB-P1-02 (search continuity).

Target:

- The Components view shows one compact strip with: result count (visible vs
  total after client-side filtering), active scope (folder + category), and the
  active-filter chips from LIB-P1-01.

Files (verified):

- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
  (count is the length of the in-memory filtered array produced by the
  `sheetItems.filter(...)` call at `:877`).
- `src/components/workshop/BulkActionToolbar.tsx` only if selected-count display
  overlaps the strip (shared primitive at
  `src/components/ui/bulk-action-toolbar.tsx`).

Validation:

- DOM tests for filtered (e.g. "12 of 240") vs unfiltered ("240 components")
  counts and for scope label = folder name + category.
- Run: `bun run test:dom`.

## Phase 2 - Source Trust At Decision Points

### LIB-P2-01 - Trust chips on overview and recent cards

Seq: 11. Depends on: LIB-P0B-01 (so a trust chip can deep-link into the
inspector).

Target:

- Recent / overview component cards show pricing freshness, confidence, and
  source/supplier where data exists. Bind to real columns only:
  freshness from `pricing_date` via `getStalenessTone`/`getStalenessLabel`
  (`component-library/helpers.ts:667/:675` -> `success|warning|danger`);
  confidence is FREE TEXT (`confidence text|null`) — render the label over free
  text, do not assume an enum; source from `pricing_source` (the "source URL",
  validated app-side); supplier from `supplier`/`supplier_id`. "Last touched"
  falls back to `updated_at` — there is NO `last_reviewed` column (migration-
  gated; doc 19 Data Layer).

Files (verified):

- `src/components/workshop/library/overview/RecentComponentCard.tsx`.
- `src/components/workshop/library/overview/LibraryOverview.tsx` (hardcoded
  "90 days" string at `:114` — keep in lockstep with the three 90-day constants
  if the window ever changes).
- Repository mapping in `src/lib/repositories/component-library-repository.ts`
  (`LIBRARY_OVERVIEW_STALE_PRICING_DAYS=90` at `:827`) only if a field is not
  already in the overview payload.

Validation:

- Extend `tests/vitest/library-overview.test.tsx`: a card with `pricing_date`,
  `confidence`, `pricing_source`, `supplier` renders each chip; a card with
  those null renders the missing-data fallback (no crash, no empty chip).
- Run: `vitest run tests/vitest/library-overview.test.tsx`.

### LIB-P2-02 - Template trust summary

Seq: 12. Depends on: LIB-P2-01 (shared trust-chip rendering).

Target:

- Template gallery / preview / editor surfaces summarize source freshness and
  confidence for component-backed rows. Counts are a COMPUTED JOIN over
  `estimate_template_row_items.source_library_item_id` /
  `link_state` (enum `estimate_row_link_state` =
  `unlinked|linked-clean|linked-overridden|detached|source-changed`), NOT a
  stored column. A row whose source was deleted is the DERIVED "missing source"
  UI state, not an enum value (doc 19 Enums).

Files (verified):

- `src/components/workshop/library/templates-browse/TemplateGallery.tsx`
- `src/components/workshop/library/templates-browse/TemplatePreviewDock.tsx`
- `src/components/workshop/library/template-editor/TemplateEditorSheet.tsx`
- Repository mapping only if the join is not already exposed.

Validation:

- `tests/vitest/template-gallery.test.tsx` and
  `tests/vitest/template-editor.test.tsx`: a template with N `linked-clean`,
  M `source-changed`, and 1 deleted-source row renders the correct counts and
  the "missing source" derived state.
- Run: `vitest run tests/vitest/template-gallery.test.tsx` then
  `vitest run tests/vitest/template-editor.test.tsx`.

### LIB-P2-03 - Normalize create/edit source fields

Seq: 13. Depends on: LIB-P2-01.

Target:

- Add and Edit write the SAME columns with consistent confidence/source/
  freshness language and validation: `pricing_date`, `pricing_source`
  (free-text URL, app-side validity check), `confidence` (free text). No schema
  change — all columns exist.

Files + actions (verified):

- `src/components/workshop/component-library-manager/AddComponentModal.tsx`
  (writes via `createCostLibraryComponent` -> RPC
  `create_cost_library_component`).
- `src/components/workshop/library/EditComponentDrawer.tsx` (writes via
  `updateCostLibraryComponent` -> RPC `update_cost_library_component`).
- Shared field helpers only if duplication becomes meaningful.

Validation:

- Payload tests asserting Add and Edit emit identical
  `pricing_date`/`pricing_source`/`confidence` shapes; error-display test for an
  invalid `pricing_source` URL.
- Run: `bun run test:dom`.

## Phase 3 - Add/Edit Component Flow Split (Quick Add)

### LIB-P3-01 - Quick-add default path

Seq: 14. Depends on: LIB-P0B-03 (dirty-discard `ConfirmDialog`),
LIB-P2-03 (normalized source fields).

Target:

- Add Component opens in a short quick-add mode whose required fields are exactly
  the Canonical Quick Add Contract (doc 19): `name`, `category` (text),
  `unit`, `unit_cost`. Optional: supplier/brand, `pricing_date`,
  `pricing_source`, `confidence` (free text), `library_folder_id` (defaults to
  the currently selected folder). All columns exist -> NO schema change, so this
  does NOT violate the `00-PLAN.md` "no schema changes" non-goal.
- Advanced details are progressive (revealed after the required four) and do not
  block the common save.

Files + action (verified):

- `src/components/workshop/component-library-manager/AddComponentModal.tsx`
  (2359 lines — extract quick-add as an internal subcomponent rather than
  extending the mega-form).
- Save path: `createCostLibraryComponent` -> RPC
  `create_cost_library_component`; write guarded by
  `rpc("is_workspace_editor",{target_workspace_id})` (viewer is blocked).

Validation:

- New focused test (not an extension of the current mega-test): submitting only
  the four required fields succeeds; omitting any one blocks save with an inline
  error; a `viewer`-role actor is blocked at the action.
- Run: `bun run test:dom`.

### LIB-P3-02 - Advanced catalog record mode

Seq: 15. Depends on: LIB-P3-01.

Target:

- Variants, cost entries, attachments, measurements, activity, and lifecycle
  remain available behind the progressive disclosure; switching quick <-> advanced
  preserves entered data.
- Lifecycle control offers all FIVE `component_lifecycle_state` values:
  `draft | in_production | available | discontinued | archived` (doc 19 Enums;
  "Active" is `available`, there is no "Deleted" value). Price options write via
  `upsertCostLibraryComponentPriceOption` and lifecycle via
  `changeCostLibraryComponentLifecycleState` ->
  `set_cost_library_component_lifecycle_state`.

Files (verified):

- `src/components/workshop/component-library-manager/AddComponentModal.tsx`
  plus extracted form sections under
  `src/components/workshop/component-library-manager/`.

Validation:

- Tests for variant/section switching, a price-option entry, folder picker
  default = selected folder, submit payload shape, and failure recovery
  (server error keeps the modal open and data intact).
- Run: `bun run test:dom`.

## Phase 4 - Templates Browse/Insert/Editor Clarity

### LIB-P4-01 - Explicit insert target

Seq: 16. Depends on: LIB-P2-02 (template trust summary so the picker can show
dependency health before insert).

Target:

- The insert picker displays / lets the user select project, estimate, and
  target group/area, and RE-RESOLVES the target immediately before mutation so a
  stale target cannot mutate the wrong estimate.

Files + actions (verified):

- `src/components/workshop/.../InsertIntoEstimatePicker.tsx` (already a `Modal`,
  not native).
- Target listing: `listEstimateInsertTargets`. THE resolver before mutation:
  `resolveEstimateTemplateInsertTarget` (both in
  `src/lib/component-library/actions.ts`; this is the Flow 7 resolver named in
  docs 02/13). Write guarded by
  `rpc("can_edit_estimate",{target_estimate_id})`.

Validation:

- New `tests/vitest/library-template-insert-picker.test.tsx`: the picker lists
  targets; a stale target (changed since selection) is re-resolved and either
  refetches or returns a conflict instead of mutating the old estimate; a
  `viewer`/non-editor on the target estimate is blocked.
- Run: `vitest run tests/vitest/library-template-insert-picker.test.tsx`.

### LIB-P4-02 - Scalable template move control

Seq: 17. Depends on: none within Phase 4 (independent of LIB-P4-01).

Target:

- Template move uses a creatable combobox for existing groups plus create-new,
  replacing any small inline control that does not scale.

Files (verified):

- `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx`.
- Use `src/components/ui/creatable-combobox.tsx` (the canonical primitive for
  this — doc 19/23). Move/list keys: `WORKSPACE_ESTIMATE_TEMPLATES_QUERY_KEY` /
  `workspaceEstimateTemplatesQueryKey({userId, workspaceId})` (scoped) must be
  invalidated on a successful move.

Validation:

- Update `tests/vitest/template-gallery.test.tsx` move flow: selecting an
  existing group and creating a new group both move the template and invalidate
  the scoped templates key.
- Run: `vitest run tests/vitest/template-gallery.test.tsx`.

## Phase 5 - Dense Maintenance Mode And Browser-Proven Polish

### LIB-P5-01 - Component table/dense mode

Seq: 18. Depends on: LIB-P1-03 (count/scope strip), LIB-P2-01 (trust chips
to render in dense rows), and LIB-P0A-03 (measured perf budget).

Target:

- A net-new card/dense (table-vs-grid) toggle — it does NOT exist yet — lets
  catalog stewards scan by name, folder, supplier, brand, cost, `pricing_source`,
  `pricing_date`, confidence, `lifecycle_state`, usage, and actions. Table-vs-grid
  spec per `12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md`.
- Reuse the existing virtualization infra
  (`src/lib/workshop/virtualization-flags.ts`:
  `WORKSHOP_VIRTUALIZATION_FLAGS` + `@tanstack/react-virtual`, tree `minRows`
  wired) for the dense fallback — do NOT add a parallel virtualizer (doc 19
  Performance Reality).

Files (verified):

- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
  plus new compact row/list subcomponents.
- Usage column data from `getCostLibraryComponentUsage`.

Validation:

- DOM tests for grid<->dense toggle, column sort, selection parity, and action
  parity (every action available in grid is available in dense).
- Perf: dense mode renders the seeded N-component dataset within the measured
  Phase 0A budget (e.g. <16ms steady-state frame at the dataset size proven in
  LIB-P0A-03 via the named instrument — Playwright `--trace on` or the
  `scripts/` `performance.now()`/React Profiler harness, recorded in doc 24);
  else use the documented virtualization/pagination fallback.
- Run: `bun run test:dom`; browser proof only for sticky-column/header behavior.

### LIB-P5-02 - Browser verification pass

Seq: 19. Depends on: all prior phases (proves real viewport behavior after the
layout/overlay changes land). LAST item in the pack.

Target:

- Prove real viewport behavior only after layout/overlay implementation changes;
  do not assert browser-only claims from jsdom.

Scenarios:

- Desktop and mobile `/workshop/library` overview.
- Component select from Overview -> `?component=<id>` -> inspector dock.
- Add Component with nested popups and the `ConfirmDialog` dirty-close.
- Component folder create/rename/delete via the text-prompt dialog.
- Template insert picker with target disclosure + re-resolution.
- Keyboard-only top tasks (focus order, Escape semantics, z-index stacking
  `z-[1000]`/`z-[1050]`/`z-[1100]`).

Validation:

- `bun run test:e2e` (playwright) and/or manual proof, recorded only for the
  browser-only claims. There is NO axe/jest-axe harness; a11y checks are manual
  ARIA/focus assertions unless `jest-axe` is added as an explicit prerequisite
  (doc 19 Test Commands).

## Phase-Later (Tracked, Out Of The Phase 0A-5 Critical Path)

### LIB-LATER-01 - Estimate-page component panel native overlays

Seq: deferred. Depends on: LIB-P0B-02/03 (reuse the same text-prompt and
discard-confirm patterns).

Target:

- The in-estimate component panel still uses native overlays:
  `window.confirm("Discard component changes?")` at
  `src/components/workshop/component-library/index.tsx:939` and
  `window.prompt("Folder name")` at the same file `:1428`. It is in
  `00-PLAN.md` scope; migrate it to the same inline `ConfirmDialog`+input pattern
  used in Phase 0B. Listed here so it is not silently dropped, not on the
  0A-5 critical path.

Validation:

- Static grep guard: zero `window.prompt` / `window.confirm` in
  `src/components/workshop/component-library/index.tsx` once migrated.

## Phase Gate Matrix

Gate IDs align to the Canonical Phase Map (0A/0B/1-5).

| Gate | Required Before Merge |
| --- | --- |
| 0A | Contracts + targeted security/route/cache tests exist or are explicitly scoped; the un-scoped `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` is scoped; perf seed extended and baseline measured. |
| 0B | Zero `window.prompt`/`window.confirm` in `ComponentLibraryManager.tsx` + `AddComponentModal.tsx`; `?component=<id>` route state works with safe invalid-param recovery; bulk-archive copy no longer says "cannot be undone" for archive; focus/error behavior tested via `bun run test:dom`. |
| 1 | Overview search opens the exact item via `?component=<id>`, invalid selected params fail safely, applied-filter chips + count/scope strip render, context preserved. |
| 2 | Trust metadata renders in card/row/inspector-dock/template decision points bound to real columns (`pricing_date`/`pricing_source`/`confidence`/`updated_at`); missing-data fallback covered; no private field leaked. |
| 3 | Quick Add validates the four required fields (`name`/`category`/`unit`/`unit_cost`), preserves data on failure, blocks `viewer` actors, uses the `ConfirmDialog` discard; advanced mode exposes all five `lifecycle_state` values. |
| 4 | Insert picker names target + dependency health and re-resolves via `resolveEstimateTemplateInsertTarget`; creatable-combobox move invalidates the scoped templates key. |
| 5 | Dense mode meets the measured Phase 0A budget or uses the documented virtualization fallback; toggle/sort/selection/action parity tested. |
| Phase-later | LIB-LATER-01 may remain unmigrated at beta release: it is an accepted-residual item tracked in `24-EXECUTION-EVIDENCE-LEDGER.md`, NOT a regression. The native-prompt static grep on `src/components/workshop/component-library/index.tsx` is expected to still hit `:939` (`window.confirm`) and `:1428` (`window.prompt`); those two hits are allowlisted as the known Phase-later residual and do not block beta. The deferral is acceptable only while the in-estimate panel is out of the 0A-5 critical path; it is not silently dropped. |
| Final | `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md` has pass/skipped-risk entries and no no-go release condition remains; AND every Seq item (1-19) has its pre-registered evidence row in `24-EXECUTION-EVIDENCE-LEDGER.md` populated (command + pass/fail + date) before merge, with LIB-LATER-01 recorded there as an accepted residual. |

## Build Order Summary

| Seq | Item | Phase | Depends on |
| --- | --- | --- | --- |
| 1 | LIB-P0A-01 route/payload/cache contracts | 0A | doc 13 |
| 2 | LIB-P0A-02 security/exposure contracts | 0A | doc 14 |
| 3 | LIB-P0A-03 perf/network/concurrency contracts | 0A | doc 16 |
| 4 | LIB-P0B-01 `?component=<id>` route state | 0B | LIB-P0A-01 |
| 5 | LIB-P0B-02 folder text-prompt dialog | 0B | LIB-P0A-01 |
| 6 | LIB-P0B-03 Add dirty-discard `ConfirmDialog` | 0B | LIB-P0A-01 |
| 7 | LIB-P0B-04 bulk-archive copy fix | 0B | none |
| 8 | LIB-P1-01 visible applied filters | 1 | LIB-P0B-01 |
| 9 | LIB-P1-02 overview search continuity | 1 | LIB-P0B-01 |
| 10 | LIB-P1-03 result count/scope strip | 1 | LIB-P1-01, LIB-P1-02 |
| 11 | LIB-P2-01 trust chips on cards | 2 | LIB-P0B-01 |
| 12 | LIB-P2-02 template trust summary | 2 | LIB-P2-01 |
| 13 | LIB-P2-03 normalize create/edit source fields | 2 | LIB-P2-01 |
| 14 | LIB-P3-01 quick-add default path | 3 | LIB-P0B-03, LIB-P2-03 |
| 15 | LIB-P3-02 advanced catalog record mode | 3 | LIB-P3-01 |
| 16 | LIB-P4-01 explicit insert target | 4 | LIB-P2-02 |
| 17 | LIB-P4-02 scalable template move | 4 | none |
| 18 | LIB-P5-01 component table/dense mode | 5 | LIB-P1-03, LIB-P2-01, LIB-P0A-03 |
| 19 | LIB-P5-02 browser verification pass | 5 | all prior |
| deferred | LIB-LATER-01 estimate-page panel overlays | Phase-later | LIB-P0B-02/03 |

Final note: every Seq item above has a pre-registered evidence row in
`24-EXECUTION-EVIDENCE-LEDGER.md` (command + pass criterion + owning phase) that
must be populated with the run result before merge. LIB-LATER-01 is recorded
there as an accepted-residual Phase-later item, so its native-prompt grep hit on
`component-library/index.tsx:939`/`:1428` is an allowlisted residual, not an
unplanned gap.
