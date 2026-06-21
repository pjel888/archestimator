# 24 - Execution Evidence Ledger

> These items are the OUTPUTS of implementation, not gaps in this plan. Each is
> fully specified here — exact command, concrete pass criterion, owning
> doc/section, and the phase gate it unblocks — so the planning pack accounts for
> 100% of what successful implementation must prove and nothing is left
> unplanned. Producing this evidence is the build phase; pre-registering it is a
> planning property. A plan is implementation-READY when every execution-only
> proof is named like this in advance — it is NOT made un-ready by the fact that
> the proof has not been produced yet (no code has changed in this pack).

All scenario IDs, file paths, query keys, enums, columns, action/RPC names, and
test commands here bind to `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md`
(keystone). When this doc and the keystone disagree, the keystone wins. Phase
labels follow the canonical phase map (0A Contract Lock -> 0B Overlay &
Route-State Reliability -> 1 Findability & Applied Filters -> 2 Source Trust at
Decision Points -> 3 Add/Edit Component Flow Split (Quick Add) -> 4 Templates
Browse/Insert/Editor Clarity -> 5 Dense Maintenance Mode & Browser-Proven
Polish).

This ledger cross-references and does not restate:

| Doc | This ledger pulls from it |
|-----|---------------------------|
| `06-QA-AND-VALIDATION-PLAN.md` | the `ADV-*` matrix, per-test run commands, the `bun test` vs `vitest run` rule, browser-proof criteria |
| `16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md` | the Phase 0A seed+measure task, the no-go thresholds, the browse-payload lever |
| `17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md` | the per-phase release gates and the migration-gate (DB rollback) section |
| `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md` | the canonical `ADV-*` IDs, severities, and the completion / no-go gates |

How to read the columns:

- **Evidence item** — the concrete artifact implementation must produce.
- **Exact command or proof method** — copy-paste runnable, or the exact manual
  proof method. Run commands are `vitest run tests/vitest/<file>` (one jsdom
  suite), `bun run test:dom` (all jsdom suites), `bun run test:e2e`
  (Playwright), or `bun run validate` (full gate). Never `bun test
  tests/vitest/<f>` — `bun test` is bound to `tests/unit` (`package.json:21`)
  and silently ignores the vitest suites (keystone "Test Commands").
- **Pass criterion (concrete)** — the observable result that counts as proof. No
  "looks right".
- **Owning doc/section** — where the requirement is specified.
- **Phase gate it unblocks** — what cannot be called done until this evidence
  exists.

Net-new test files are marked `(net-new)`; files to extend are marked
`(extend)`. A `(net-new)` suite must be authored before its `ADV-*` row can pass
— authoring it is itself part of the owning phase, not a precondition assumed to
exist.

## Standing harness facts (apply to every row)

- There is **no axe / jest-axe a11y harness** in this repo. Every a11y row below
  is a manual ARIA / focus / keyboard assertion in Testing Library. If automated
  axe coverage is ever wanted, adding `jest-axe` (dev dependency + a wrapper
  under `tests/vitest/`) is itself a net-new Phase 0A prerequisite task, listed
  here so it is not assumed to exist (keystone "Test Commands"; doc 06
  Accessibility note).
- `bun run validate` =
  `type-check && lint && lint:design-system && lint:design && test && test:dom`
  (`package.json:57`). It is the full gate for every phase; the per-phase rows
  below name the NARROW suites to run first.
- The two migration-gated items (`last_reviewed`/`reviewed_at`; controlled-vocab
  `confidence`) are **out of scope** for Phases 0A-5 (keystone "Data Layer";
  doc 17 "Database / RLS Rollback"). Their evidence rows are pre-registered in
  the dedicated table at the end so the pack is complete, with the explicit gate
  that they must NOT be smuggled into a UI-polish PR.

## Phase 0A — Contract Lock (test/contract scaffolding + seed baseline)

No flag (test/contract only). These scaffold the invariants every later phase
leans on; the four P0 security/cache suites and the perf baseline are authored
here even though the behavior they guard ships later.

| Evidence item | Exact command or proof method | Pass criterion (concrete) | Owning doc/section | Phase gate it unblocks |
| --- | --- | --- | --- | --- |
| Cross-workspace `?component=<id>` IDOR test (`ADV-XWS-COMPONENT-PARAM`) | `vitest run tests/vitest/library-route-state-authz.test.tsx` (net-new) | A foreign-workspace `cost_library_items.id` in `?component=<id>` yields a permission-safe not-found/denied state; no object detail (name/cost/source) rendered or returned. | doc 18 ADV-XWS-COMPONENT-PARAM; doc 06 matrix | 0A contract lock; gates 0B/1 deep-link work |
| Estimate insert-target authz test (`ADV-XWS-ESTIMATE-ACTION`) | `vitest run tests/vitest/estimate-insert-target-authz.test.tsx` (net-new) | `resolveEstimateTemplateInsertTarget` called with a stale/foreign estimate ID is rejected via `rpc("can_edit_estimate",{target_estimate_id})`; no mutation occurs and no target node id is returned. | doc 18 ADV-XWS-ESTIMATE-ACTION; doc 17 "Authz/RLS" | 0A; gates Phase 4 insert |
| Workspace-switch cache-bleed test (`ADV-WS-SWITCH-CACHE`) | `vitest run tests/vitest/library-workspace-switch-cache.test.tsx` (net-new) | After a workspace switch with the inspector dock open, the cache entry `["workspace-component-library"]` clears/refetches; assert the test reads the SAME inline-literal entry that `TemplateEditorClient.tsx:160` (`useQuery({ queryKey: ["workspace-component-library"] })`) subscribes to — no prior-workspace detail is observable. | doc 06 / doc 18 ADV-WS-SWITCH-CACHE; keystone "Query Keys" | 0A; gates the doc 13 key-scoping change |
| Public/share snapshot redaction test (`ADV-PUBLIC-REDACTION`) | `vitest run tests/vitest/share-snapshot-redaction.test.tsx` (net-new) | The snapshot builder field-selection (`src/lib/publication/actions.ts`, which writes `snapshot_json` at `:566` and `:636`) excludes `pricing_source`, free-text `confidence`, and price history from `project_publications.snapshot_json`; assertion is on the serialized snapshot object, NOT a live library endpoint. | doc 18 ADV-PUBLIC-REDACTION; doc 14 | 0A; gates any trust-metadata work that could enter the snapshot |
| Viewer-role mutation denial test (`ADV-VIEWER-MUTATION`) | `vitest run tests/vitest/library-viewer-authz.test.tsx` (net-new) | A `viewer`-role actor sees Quick Add / mutation controls hidden or disabled in the UI AND the server denies the action via `rpc("is_workspace_editor",{target_workspace_id})` (role in owner/admin/member; only `viewer` read-only). | doc 18 ADV-VIEWER-MUTATION; doc 17 "Authz/RLS" | 0A; gates Phase 3 Quick Add |
| Perf seed extension for `cost_library_items` | Extend `scripts/seed-performance-test-data.ts` to seed N `cost_library_items` (folder + supplier/brand spread). Confirm the gap first: `rg -n "cost_library_items" scripts/seed-performance-test-data.ts` returns ZERO before the edit. | The script seeds at the four tiers (100 / 500 / 5,000 / 10,000) against Supabase project `ebxxqidacheyapmmzavr`; a post-edit `rg -n "cost_library_items" scripts/seed-performance-test-data.ts` now returns non-zero. | doc 16 "Phase 0A Seed + Measure"; doc 18 Evidence Requirements (perf) | 0A; PREREQUISITE for every budget number in doc 16 and the `ADV-DENSE-500` gate |
| Perf baseline measurement note | `bun run test:e2e` against the seeded workspace for render/interaction timing; one-off measurement run for browse payload size. Record card-grid/dense initial render ms per tier (React Profiler commit duration or marked `performance.measure`), keystroke re-filter ms at 500 & 5,000 rows, and `loadCurrentWorkspaceComponentRowsLibrary` transfer KB + parse ms for `includeDetailGraph` true vs false. | A written Phase 0A measurement note records all three metrics at the four tiers; no 100/500/5,000/10,000 budget is claimed elsewhere without this note as its reference. | doc 16 "Phase 0A Seed + Measure" + "Performance No-Go Conditions" | 0A; converts doc 16's PROVISIONAL budgets into committed thresholds; gates Phase 5 |
| Route-state parse/idempotency scaffold | `vitest run tests/vitest/<route-state>.test.tsx` then `bun run test:dom` | `?component=<id>` parse is idempotent (parse(serialize(x)) == x), params are additive, and the components-only `?component=<id>` vs templates segment-route distinction (keystone "Verified File Paths" ruling) holds; flag-on and flag-off both pass. | doc 17 "Route-state" gate; doc 21 cache/route invariants | 0A; gates 0B/1 route-state work |

## Phase 0B — Overlay & Route-State Reliability

Flags: `library_folder_dialogs`, `library_component_deep_link` (doc 21). The
native-prompt grep reaching zero on its 0B targets is a hard completion gate.

| Evidence item | Exact command or proof method | Pass criterion (concrete) | Owning doc/section | Phase gate it unblocks |
| --- | --- | --- | --- | --- |
| Native-prompt removal (folder create/rename/delete) | `rg -n "window\.(prompt\|confirm)" src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` | ZERO hits at `:1493` (create), `:1515` (rename), `:1534` (delete) — replaced by the inline `ConfirmDialog`+`<input>` text-prompt pattern copied from `TemplatesBrowseManager.tsx:531-883`. | doc 06 Static Guards; doc 18 Completion Gates | 0B done-gate (P0 no-go if any 0B target remains) |
| Native-prompt removal (Add dirty-discard) | `rg -n "Discard this component draft" src/components/workshop/component-library-manager/AddComponentModal.tsx` then `rg -n "window\.(prompt\|confirm)" .../AddComponentModal.tsx` | ZERO `window.confirm` at `:963`; dirty close routes through the text-prompt `ConfirmDialog` instead. | doc 06 Static Guards; doc 18 ADV-DIRTY-ADD-NESTED | 0B; shared with Phase 3 Quick Add a11y |
| Folder actions behavior test (`ADV-FOLDER-DELETE-FAIL`, `ADV-CONCURRENT-RENAME`) | `vitest run tests/vitest/component-library-folder-actions.test.ts` (extend) | Create/rename/delete cover success, validation failure, server failure; `deleteLibraryFolder` failure keeps the error visible (folder NOT treated as deleted); concurrent rename/delete yields conflict/retry with no silent overwrite; copy never conflates folder with category; focus returns to the invoking folder action. | doc 06 "Component folder actions"; doc 18 ADV-FOLDER-DELETE-FAIL / ADV-CONCURRENT-RENAME | 0B; folder-dialog release gate (doc 17) |
| Add Component modal a11y test (`ADV-DIRTY-ADD-NESTED`, a11y of `ADV-QUICKADD-UNSAFE`) | `vitest run tests/vitest/library-add-component-modal-a11y.test.tsx` (net-new) | Initial focus lands in the modal; Escape closes the `z-[1050]` nested listbox before the `z-[1000]` modal; dirty close opens the `ConfirmDialog` (not `window.confirm`); confirm/cancel return focus to the invoking control; required-field errors set `aria-invalid` on `name`/`category`/`unit`/`unit_cost`. Manual ARIA/focus only (no axe). | doc 06 "Add Component modal accessibility"; doc 18 ADV-DIRTY-ADD-NESTED | 0B/3 |
| Bulk-archive copy test (`ADV-BULK-COPY`) | `vitest run tests/vitest/bulk-destructive-preview-modal.test.tsx` (extend) | `confirmationHint` (`BulkDestructivePreviewModal.tsx:107`, rendering the "This action cannot be undone." string at the span on `:169`) branches on `actionCopy.verb`, NOT blanket `canExecute` — archive does not claim irreversibility (`archived` lifecycle is recoverable); irreversible copy remains for true delete flows. | doc 06 "Bulk archive copy"; doc 18 ADV-BULK-COPY | 0B; bulk-archive release gate |
| Bulk-archive copy static guard | `rg -n "cannot be undone\|reversible\|archive" src/components/workshop/BulkDestructivePreviewModal.tsx src/components/workshop/component-library-manager` | Confirms the hint branches on `actionCopy.verb`, not blanket `canExecute`. | doc 06 Static Guards | 0B |
| Browse payload reduction proof (PRIMARY perf lever) | Manual payload-size measurement (KB) on `loadCurrentWorkspaceComponentRowsLibrary` with `includeDetailGraph: false` vs the `true` default; assert detail graph (versions/price history/state history/attachments) is deferred to inspector-dock open. | Browse payload is measurably smaller than the `includeDetailGraph: true` baseline recorded in the Phase 0A note; the per-item detail graph loads only when `ComponentInspectorDock.tsx` opens, keyed off `?component=<id>`; mirrors the proven `getProjectComponentRowsLibrary(... { includeDetailGraph: false })` projection. | doc 16 "Browse Payload Reduction"; doc 17 "Large-list rendering" | 0B; relieves the Phase 5 density/virtualization no-go |
| Deep-link route-state e2e (browser) | `bun run test:e2e` (`e2e/workshop-library-routes.spec.ts`) | Real route navigation and back/forward across Library tabs and `?component=<id>` behave correctly; a `library_component_deep_link` flag flip-off drops the param without stranding the URL (existing tab shows the broad view, not an error). | doc 06 Browser-Proof Criteria; doc 17 0B rollback | 0B; browser claim cannot be asserted without this run |

## Phase 1 — Findability & Applied Filters

Flag: `library_component_deep_link` (doc 21).

| Evidence item | Exact command or proof method | Pass criterion (concrete) | Owning doc/section | Phase gate it unblocks |
| --- | --- | --- | --- | --- |
| Overview selection / deep-link test (`ADV-DELETED-RESULT`) | `vitest run tests/vitest/library-overview-navigation.test.tsx` (net-new) | Component search result click AND Enter route to Components with `?component=<id>` (owned by `LibraryPageClient.tsx`); recent-component card uses the same route-state; template results still open `/workshop/library/templates/[templateId]`; a deleted/foreign result yields a recoverable not-found; selection + result count announced once (ARIA); active tab/panel semantics correct. | doc 06 "Library overview selection"; doc 18 ADV-DELETED-RESULT | Phase 1; deep-link release gate |
| Applied-filter chips test (`ADV-STALE-URL-PARAMS`) | `vitest run tests/vitest/library-applied-filters.test.tsx` (net-new) — or extend `tests/vitest/workshop-library-consolidation-ui.test.tsx` | Visible chips for supplier, brand, lifecycle (the five `component_lifecycle_state` values), confidence (free text), pricing freshness via `getComponentPricingFreshness(item, now)` (`"any"\|"fresh"\|"stale"\|"missing"`); individual chip removal updates state + URL params; clear-all resets; filtered count and no-results states update; stale URL params resolve to a handled empty/correct state. | doc 06 "Applied filters"; doc 18 ADV-STALE-URL-PARAMS | Phase 1; applied-filters release gate |
| Route navigation/back-forward e2e (browser) | `bun run test:e2e` (`e2e/workshop-library-routes.spec.ts`) | Back/forward across the deep-link continuity and applied-filter URL state behaves correctly in a real browser (jsdom cannot prove router history). | doc 06 Browser-Proof Criteria | Phase 1 browser claim |

## Phase 2 — Source Trust at Decision Points

Flag: `library_trust_chips` (doc 21).

| Evidence item | Exact command or proof method | Pass criterion (concrete) | Owning doc/section | Phase gate it unblocks |
| --- | --- | --- | --- | --- |
| Trust chip rendering test | `vitest run tests/vitest/library-overview.test.tsx` (extend) + the touched chip-surface suite | Trust chips render over REAL columns/helpers: pricing freshness via `getStalenessTone`/`getStalenessLabel` and `getComponentPricingFreshness`; free-text `confidence` (no fixed enum assumed); `updated_at` for "last touched" (NOT a non-existent `last_reviewed`); source via `pricing_source` with app-side URL validation. | doc 18 Completion Gates (trust chips); keystone "Confidence and Freshness Models" | Phase 2; trust-chip release gate |
| 90-day single-source-of-truth guard | `rg -n "COMPONENT_FACET_STALE_DAYS = 90" src/components/workshop/library/component-facet-filter.tsx` ; `rg -n "LIBRARY_OVERVIEW_STALE_PRICING_DAYS = 90" src/lib/repositories/component-library-repository.ts` ; `rg -n "older than 90 days" src/components/workshop/library/overview/LibraryOverview.tsx` | If any freshness threshold or "very stale" tier changes, all THREE locations (`component-facet-filter.tsx:12`, `component-library-repository.ts:827`, `LibraryOverview.tsx:114`) change in lockstep — no fourth source of truth introduced. | keystone "Confidence and Freshness Models" | Phase 2; guards against threshold drift |
| Snapshot redaction holds with trust metadata live | Re-run `vitest run tests/vitest/share-snapshot-redaction.test.tsx` after trust-chip work | After trust chips exist, `pricing_source` / `confidence` / price history still never enter `project_publications.snapshot_json`. | doc 18 ADV-PUBLIC-REDACTION; doc 14 | Phase 2; re-asserts the 0A redaction gate against new surfaces |

## Phase 3 — Add/Edit Component Flow Split (Quick Add)

Flag: `library_quick_add` (doc 21).

| Evidence item | Exact command or proof method | Pass criterion (concrete) | Owning doc/section | Phase gate it unblocks |
| --- | --- | --- | --- | --- |
| Quick Add required-field validation (`ADV-QUICKADD-UNSAFE`) | `vitest run tests/vitest/library-add-component-modal-a11y.test.tsx` (net-new) | Required = `name`/`category`/`unit`/`unit_cost` (CANONICAL QUICK ADD CONTRACT) cannot be saved when malformed; formula-like text and invalid `pricing_source` URLs are validated/sanitized app-side over free text; required-field errors set `aria-invalid`; on network failure the form data is preserved and retry is available. No schema change (all columns exist). | doc 18 ADV-QUICKADD-UNSAFE; keystone "Canonical Quick Add Contract" | Phase 3; quick-add release gate |
| Viewer cannot save Quick Add (`ADV-VIEWER-MUTATION`) | `vitest run tests/vitest/library-viewer-authz.test.tsx` (net-new, shared with 0A) | Quick Add trigger hidden/disabled for `viewer`; server denies via `is_workspace_editor`. | doc 18 ADV-VIEWER-MUTATION | Phase 3; P0 no-go if a viewer can save |
| Add/Edit source-field normalization | `vitest run tests/vitest/library-add-component-modal-a11y.test.tsx` + the Edit-form suite if separate | Add and Edit forms write the SAME columns (`pricing_date`/`pricing_source`/`confidence`/supplier/brand); advanced fields appear progressively after the required four. | keystone "Canonical Quick Add Contract" | Phase 3 |

## Phase 4 — Templates Browse/Insert/Editor Clarity

No new flag (reuses `library_trust_chips` for the summary layer) (doc 21).

| Evidence item | Exact command or proof method | Pass criterion (concrete) | Owning doc/section | Phase gate it unblocks |
| --- | --- | --- | --- | --- |
| Insert-picker target test (`ADV-XWS-ESTIMATE-TARGET`) | `vitest run tests/vitest/library-template-insert-picker.test.tsx` (net-new) | `InsertIntoEstimatePicker.tsx` (a `Modal`) over `listEstimateInsertTargets` + `resolveEstimateTemplateInsertTarget`: no-projects empty state; no-estimates empty state; no-resolvable-target error; submit disabled until a valid target; target disclosure visible before submit; submit failure stays inline and does not close. Resolver (`resolveEstimateTemplateInsertTarget`) returns `targetParentNodeId`; the actual insert is `insertEstimateTemplateIntoEstimate` — do not conflate. | doc 06 "Insert template picker"; doc 18 ADV-XWS-ESTIMATE-TARGET | Phase 4; insert release gate |
| Stale/foreign target server rejection (`ADV-XWS-ESTIMATE-ACTION`) | `vitest run tests/vitest/estimate-insert-target-authz.test.tsx` (net-new, shared with 0A) | Server rejects a stale/foreign/deleted target via `can_edit_estimate`; no wrong-estimate mutation. | doc 18 ADV-XWS-ESTIMATE-TARGET / ADV-XWS-ESTIMATE-ACTION | Phase 4; P0 no-go if wrong estimate mutates |
| Template dependency-health test (`ADV-TEMPLATE-DEP`) | `vitest run tests/vitest/library-template-insert-picker.test.tsx` (net-new) | Preview warns/blocks/allows-override over the COMPUTED-JOIN trust counts (over `source_library_item_id`/`link_state`, not a stored column) when a dependency is `discontinued`/`archived`/missing-source; lifecycle gating uses the five `component_lifecycle_state` values; "missing source" is the derived deleted-source UI state, not an enum value; partial failure reports recovery, no silent success. | doc 18 ADV-TEMPLATE-DEP; keystone "Enums" / "Data Layer" | Phase 4 |
| Creatable-combobox move proof | `vitest run` the template-move suite + `bun run test:e2e` (`e2e/workshop-template-insert-smoke.spec.ts`) for the Supabase-backed insert smoke | The Phase 4 template-move control uses the existing `ui/creatable-combobox.tsx` (NOT a parallel combobox); Supabase-backed insertion smoke passes where provider state matters. | keystone "New Docs / Overlay primitives"; doc 06 Browser-Proof Criteria | Phase 4 |

## Phase 5 — Dense Maintenance Mode & Browser-Proven Polish (LAST)

Flag: `library_dense_mode` (doc 21). Every budget number here references the
Phase 0A measurement note; none may be claimed without it.

| Evidence item | Exact command or proof method | Pass criterion (concrete) | Owning doc/section | Phase gate it unblocks |
| --- | --- | --- | --- | --- |
| 500-row dense-mode budget (`ADV-DENSE-500`) | `bun run test:e2e` perf smoke against the Phase 0A seeded workspace (500-row tier); React Profiler commit duration | Initial render <= 200 ms AND keystroke re-filter <= 100 ms at 500 seeded rows, OR a documented `WORKSHOP_VIRTUALIZATION_FLAGS` fallback (reuse `@tanstack/react-virtual`; do NOT add a parallel virtualizer); plus an a11y review. | doc 16 "Performance No-Go Conditions"; doc 18 ADV-DENSE-500 | Phase 5; P0/P2 no-go on dense lockup |
| 5,000-row keystroke budget | `bun run test:e2e` + Phase 0A measurement note (5,000-row tier) | Keystroke re-filter <= 150 ms at 5,000 seeded rows, OR a committed server-search follow-up is scheduled (server/FTS is FUTURE; no FTS/trigram index exists today). | doc 16 "Performance No-Go Conditions" | Phase 5; gates the "no server path planned" no-go |
| Mobile inspector-dock geometry (`ADV-MOBILE-BROWSE`) | `bun run test:e2e` (`e2e/workshop-library-routes.spec.ts`) at narrow viewport | `ComponentInspectorDock.tsx` drawer does not overlap controls/content; toolbar/cards do not overlap at target responsive widths; scroll containment holds (jsdom cannot prove viewport geometry). | doc 06 Browser-Proof Criteria; doc 18 ADV-MOBILE-BROWSE | Phase 5 browser claim |
| Sticky/scroll + portal/z-index proof | `bun run test:e2e` (`e2e/workshop-library-routes.spec.ts`) | Sticky-header/scroll-containment claims hold; portal clipping / z-index tiers correct (`z-[1000]` modal / `z-[1050]` menu/popover / `z-[1100]` tooltip). | doc 06 Browser-Proof Criteria; keystone z-index tiers | Phase 5 browser claim |
| Cross-portal focus-trap proof (`ADV-KEYBOARD-MGMT`) | `vitest run tests/vitest/component-library-folder-actions.test.ts` + `vitest run tests/vitest/library-add-component-modal-a11y.test.tsx` first; `bun run test:e2e` only if a portal/trap changes | Manual ARIA/focus assertions pass (no axe harness); focus returns to the invoking control; full cross-portal focus trapping proven in a real browser only when a portal/trap actually changes. | doc 06 Browser-Proof Criteria; doc 18 ADV-KEYBOARD-MGMT | Phase 5 |
| Server-search out-of-order (`ADV-OUT-OF-ORDER`) | `vitest run tests/vitest/library-server-search.test.tsx` — ONLY if a server/FTS search is built | N/A today: components-tab search is 100% client-side synchronous (`ComponentLibraryManager.tsx:876-882`), so no async race exists. Stays N/A until a server/FTS path ships. | doc 16 "Out-Of-Order Responses"; doc 18 ADV-OUT-OF-ORDER | Phase 5; explicitly N/A, not a gap |

## Cross-cutting evidence (any phase that touches the surface)

| Evidence item | Exact command or proof method | Pass criterion (concrete) | Owning doc/section | Phase gate it unblocks |
| --- | --- | --- | --- | --- |
| Cache-invalidation exact-key proof (`ADV-WS-SWITCH-CACHE`) | `vitest run tests/vitest/library-workspace-switch-cache.test.tsx` (net-new) + existing `tests/vitest/library-components-cache.test.tsx` / `library-templates-cache.test.tsx` | The un-scoped `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` (`["workspace-component-library"]`) is scoped by `workspaceId` (mirroring the rows-library key); the scoping change migrates ALL call sites — the reader at `TemplateEditorClient.tsx:160` and the writers at `LibraryPageClient.tsx:126`, `use-estimate-row-mutations.ts:335`, `EstimateSheetContent.tsx:1238/1241`; each mutation names the EXACT key(s) it invalidates (no "invalidate the library cache" abstractly). | doc 18 Completion Gates (cache); keystone "Query Keys" | Any cache-touching phase; P0 no-go if bleed reproducible |
| Full validation gate | `bun run validate` | `type-check && lint && lint:design-system && lint:design && test && test:dom` all pass before any phase is called done. | doc 17 Release Gates; doc 18 Completion Gates | Every phase done-gate |
| Native-prompt full-surface guard | `rg -n "window\.(prompt\|confirm)" src/components/workshop/component-library-manager src/components/workshop/library src/components/workshop/component-library/index.tsx` | 0B targets reach ZERO (`ComponentLibraryManager.tsx:1493/1515/1534`, `AddComponentModal.tsx:963`); the Phase-later estimate-page panel (`component-library/index.tsx:939/1428`) is a TRACKED residual, not a silent miss; matches in `TemplateEditorClient.tsx` / `TemplatesBrowseManager.tsx` are comments — do not re-flag. | doc 06 Static Guards; doc 18 Completion Gates | 0B done-gate; tracks Phase-later residual |
| Whitespace/diff hygiene | `git diff --check` | No trailing whitespace or conflict markers in the diff. | doc 06 Static Guards | Every phase |
| Evidence-status crosswalk | Inspect doc 18 matrix + doc 06 matrix | Every `ADV-*` row carries a pass / skip-with-risk / no-go status for implemented scenarios; doc 06 and doc 18 use IDENTICAL IDs (no drift). | doc 18 Completion Gates | Release gate |
| Rendered-UI screenshots | `bun run test:e2e` artifact capture, or manual browser capture per the screenshot harness, for each shipped phase's visible surface | A screenshot exists for each phase's rendered surface (deep-link selection, applied-filter chips, trust chips, Quick Add, insert picker, dense toggle). These are EXECUTION OUTPUTS — their absence is not a planning gap; the final report attaches them or lists them as not-yet-captured with the owning command. | doc 06 Browser-Proof Criteria; doc 18 Evidence Requirements | Release readiness presentation; never blocks the PLAN's readiness |

## Migration-gated evidence (DEFERRED — out of scope for Phases 0A-5)

These two items require a migration and sit behind the Data Migration Gate
(keystone "Data Layer"; doc 17 "Database / RLS Rollback"). They are pre-registered
here so the pack is complete, with an explicit guard that they MUST NOT be
smuggled into a UI-polish PR. Until they land, the corresponding trust cues bind
to `updated_at` (not "last reviewed") and to free-text `confidence` (not a
controlled vocabulary).

| Evidence item | Exact command or proof method | Pass criterion (concrete) | Owning doc/section | Phase gate it unblocks |
| --- | --- | --- | --- | --- |
| `last_reviewed` / `reviewed_at` column (does NOT exist) | Pre-migration guard: `rg -n "last_reviewed\|reviewed_at" supabase/migrations` returns ZERO today. If pursued: additive column migration against Supabase project `ebxxqidacheyapmmzavr`, then regenerate types ADDITIVELY (splice columns; never raw `gen:types` — it breaks the build), then reconcile the ledger via `supabase migration repair --status applied <version>` (a `supabase db query --file` writes NO `schema_migrations` row). | A real `last_reviewed` timestamp exists and a "Last reviewed" trust cue reads it; until then doc 11's "Last reviewed" re-scopes to `updated_at`. The migration is its OWN task, never inside a UI-polish PR. | keystone "Data Layer"; doc 17 "Database / RLS Rollback"; doc 11 | Out of scope for 0A-5; gates any real "last reviewed" cue |
| Controlled-vocabulary `confidence` (enum/CHECK) (does NOT exist) | `rg -n` confirms `confidence` is free text today. If pursued: additive enum/CHECK migration against `ebxxqidacheyapmmzavr`; additive type regen; ledger repair as above; UI updated from free-text rendering to the controlled set. | `confidence` is constrained to a controlled vocabulary and trust chips render the fixed set; until then chips render over free text and assume no fixed set. The migration is its OWN task, never inside a UI-polish PR. | keystone "Confidence and Freshness Models"; doc 17 "Database / RLS Rollback" | Out of scope for 0A-5; gates a fixed-set confidence chip |

## How this ledger reaches 100% accountability

Every `ADV-*` scenario in doc 18 maps to a row above; every browser-only claim in
doc 06's Browser-Proof Criteria has a `bun run test:e2e` row; every budget number
in doc 16 traces back to the Phase 0A seed+measure rows; the un-scoped query-key
and the snapshot-redaction surfaces each have an exact-key / exact-field proof
row; and the two migration-gated cues are pre-registered as out-of-scope with
their guard. Nothing in the pack defers an execution proof that is not named here
with a command, a concrete pass criterion, an owning section, and the gate it
unblocks. Producing these artifacts is the build phase — pre-registering them is
the planning property that makes the pack 100% complete.
