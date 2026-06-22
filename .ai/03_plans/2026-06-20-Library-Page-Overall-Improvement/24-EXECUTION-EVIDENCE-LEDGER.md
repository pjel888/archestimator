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
| `06-QA-AND-VALIDATION-PLAN.md` | the `ADV-*` matrix, per-test run commands, the canonical command `bun run test:dom` (NEVER `bun test` for vitest — C-005), browser-proof criteria |
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
- **Telemetry sink (resolves C-009):** for closed beta the sufficient telemetry
  sink is `console.warn` via `src/lib/component-library/library-telemetry.ts`
  (events named in doc 20 use this beta sink until a production telemetry sink
  is wired). A production sink is Phase-later; do NOT block a phase on a prod
  sink existing. 2026-06-22 focused proof:
  `tests/vitest/library-telemetry-emit.test.ts`.
- **Perf budgets are PROVISIONAL (resolves C-015):** every perf number in this
  ledger (Phase 0A baseline, ADV-DENSE-500, the 5,000-row keystroke budget)
  remains PROVISIONAL for browser/provider release purposes until the Phase 0A
  browser/provider measurement note lands. A 2026-06-22 deterministic local
  synthetic baseline now exists under `_evidence/phase-0a/`, but it does not
  convert doc 30 release budgets into committed browser thresholds. Final
  committed thresholds live in `30-PERF-BUDGET-AND-REGRESSION-GATES.md`; this
  ledger records the measurement, doc 30 owns the threshold.

## Pre-code errata evidence-id registry

These IDs are canonical aliases consumed by docs 12, 29, 30, 31, and 36. They
do not prove execution by themselves; they define the exact proof row a phase
must populate before claiming the related behavior.

| Evidence ID | Command or proof method | Pass criterion | Owner | Phase | Artifact path |
| --- | --- | --- | --- | --- | --- |
| `EV-0A-AXE-HARNESS` | If automated a11y is adopted: add the dependency decision plus `jest-axe` / `@axe-core/playwright` harness; otherwise record N/A-beta and keep manual ARIA/focus assertions active. | Either harness commands pass, or the phase explicitly records that axe rows remain inactive with manual assertions substituted. | A11y lead | 0A | `_evidence/phase-0a/a11y-harness/` |
| `EV-0B-FOCUS-TRAP` | `vitest run tests/vitest/component-library-folder-actions.test.ts` and `vitest run tests/vitest/library-add-component-modal-a11y.test.tsx`; browser proof only if a real portal/trap behavior changes. | Focus returns to invoking controls; Escape closes the top overlay first; no standalone `FocusTrap` primitive is assumed. | Frontend lead | 0B | `_evidence/phase-0b/overlay-focus/` |
| `EV-HARNESS-SCREENSHOTS` | Create the `_evidence/` structure and capture screenshot + companion `.json` metadata for each browser-only claim. | Every `.png` has a sibling `.json` with browser, viewport, URL, flag state, capture harness, git commit, and verdict. | QA lead | 0A+ | `_evidence/<phase>/<scenario>/` |
| `EV-TELEMETRY-ROUTE` | Test spies or log capture around `recordLibraryEvent` / `console.warn` for component route-state, template segment-route, and workspace-switch recovery events. | Route-state events emit once with ID-only, workspace-scoped payloads and no translated labels or free text. | Telemetry lead | 0A-4 | `_evidence/phase-0a/telemetry-route/` |
| `EV-TELEMETRY-INPUT` | Test spies or log capture for trust-gate, Quick Add validation, formula/upload/import/export, bulk archive hash mismatch, and trust-state tamper events. | Payloads use field/rule/tier/hash metadata only; no raw user-entered text, cell contents, or pricing source values. | Telemetry lead | 2-3 / Phase-later | `_evidence/phase-3/telemetry-input/` |
| `EV-0A-PERF-BASELINE` | Extend `scripts/seed-performance-test-data.ts` for `cost_library_items`, then run the Phase 0A browser/perf measurement at 100 / 500 / 5,000 / 10,000 seeded rows. | A baseline note records run count, median, p95, variance, browse payload KB, parse ms, and re-filter ms before any budget is claimed. | Perf lead | 0A | `_evidence/phase-0a/perf-baseline-<date>.md` |

## Artifact storage, naming, and measurement rules

These rules apply to every evidence row below. They are stated once here so each
row does not repeat them.

**Artifact storage path:** all execution artifacts live under
`.ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/_evidence/`:

| Artifact | Path convention |
| --- | --- |
| Screenshot (visual proof) | `_evidence/<phase>/<scenario>/<browser>-<viewport>-<timestamp>.png` (e.g. `_evidence/phase-1/library-route-state/chrome-mac1280-20260621T1453.png`) |
| Screenshot metadata | a companion `<same-name>.json` per doc 29 §4 (browser, viewport, URL, flag state, capture harness) |
| Perf note | `_evidence/<phase>/perf-baseline-<date>.md` (e.g. `_evidence/phase-0a/perf-baseline-20260621.md`) |
| Playwright trace | `_evidence/<phase>/<scenario>/trace-<timestamp>.zip` |

**Naming convention:** `library-phase<ph>-<surface>-<viewport>.png` is an
acceptable shorthand inside the path above; viewports come from the doc 29
matrix.

**Browser matrix for visual proof (binds to doc 29):**

| Surface class | Required browsers / viewports |
| --- | --- |
| Desktop route/navigation, z-index, focus trap | Chrome macOS 1280, Safari macOS 1280 |
| Mobile responsive / inspector-dock overlap | Safari iOS iPhone 15, Chrome Android Pixel 8 (or iPhone SE for chip-wrap) |
| Dense-mode render + scroll | Chrome macOS 1280, Safari macOS 1280 |
| Drag/drop folder reorder | Chrome macOS 1280 |

**Timing-variance / confidence-interval rules (perf rows):** each perf metric
is the **median of >=3 runs** with the **p95 recorded**; any single-run
variance >25% is flagged for re-measurement before the number is committed to
doc 30. Record the run count, median, p95, and any flagged variance in the perf
note.

**Named human owner per row:** every evidence row below carries an Owner role
from `27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md` (added as a column to each phase
table). The role is accountable for producing the artifact; a named individual
is assigned at phase kickoff (recorded in doc 27).

**Failure-remediation loop:** if an evidence row's command FAILS or is
SKIP-WITH-RISK, the owning role MUST, before the phase can be called done:

1. record the failure (command + output + date) in this ledger under the row,
2. file the failure as a doc 18 `ADV-*` no-go or skip-with-risk with a root-cause
   hypothesis,
3. either (a) fix and re-run within the phase, or (b) escalate to the owner per
   doc 27 with a re-plan proposal (the cache-bleed stop condition in doc 17 is
   the canonical example of a re-plan trigger),
4. the phase done-gate does NOT close until the row is PASS or the no-go is
   accepted by the release lead with a documented residual.

## Phase 0A — Contract Lock (test/contract scaffolding + seed baseline)

No flag (test/contract only). These scaffold the invariants every later phase
leans on; the four P0 security/cache suites and the perf baseline are authored
here even though the behavior they guard ships later.

**Owner assignment (per-row accountability, doc 27):** the `ADV-XWS-*` and
`ADV-VIEWER-MUTATION` rows -> **Security lead**; the `ADV-WS-SWITCH-CACHE` row
-> **Backend lead**; the `ADV-PUBLIC-REDACTION` row -> **Security lead**; the
perf seed + perf baseline rows -> **Perf lead**; the route-state scaffold row
-> **Frontend lead**. A named individual per role is assigned at phase kickoff
and recorded in doc 27.

**2026-06-22 focused status:** P0 authz/telemetry proof passed with
`bunx vitest run tests/vitest/workshop-library-consolidation-ui.test.tsx
tests/vitest/library-telemetry-emit.test.ts
tests/vitest/library-route-state-authz.test.tsx
tests/vitest/estimate-insert-target-authz.test.tsx
tests/vitest/library-viewer-authz.test.tsx
tests/vitest/library-workspace-switch-cache.test.ts
tests/vitest/share-snapshot-redaction.test.tsx --maxWorkers=1`
(7 files / 30 tests). `bun run type-check` passed. Touched-file ESLint passed
for the telemetry, authz, modal, perf-baseline, and test files.

**2026-06-22 full local validation status:** full `bun run validate` now passes;
see `_evidence/phase-final/validate-pass-20260622T075913Z.md`. The command
passed `type-check`, `lint`, `lint:design-system`, `lint:design`, unit tests
(25 tests), and the full DOM suite (415 files / 3024 tests passed; 1 file
skipped, 4 tests skipped, 5 todo). Release ADV status export is
`_evidence/phase-final/adv-release-status-20260622T075913Z.md` and remains
NO-GO only because Safari/iOS/Android/RTL visual coverage, full glass
matrix/paint-time proof, React Profiler/provider timing budgets, cross-browser
portal/focus, and manual copy-deck rows remain partial or unproven, not because
local validation is red.

| Evidence item | Exact command or proof method | Pass criterion (concrete) | Owning doc/section | Phase gate it unblocks |
| --- | --- | --- | --- | --- |
| Cross-workspace `?component=<id>` IDOR test (`ADV-XWS-COMPONENT-PARAM`) | `vitest run tests/vitest/library-route-state-authz.test.tsx` (net-new) | A foreign-workspace `cost_library_items.id` in `?component=<id>` yields a permission-safe not-found/denied state; no object detail (name/cost/source) rendered or returned. | doc 18 ADV-XWS-COMPONENT-PARAM; doc 06 matrix | 0A contract lock; gates 0B/1 deep-link work |
| Estimate insert-target authz test (`ADV-XWS-ESTIMATE-ACTION`) | `vitest run tests/vitest/estimate-insert-target-authz.test.tsx` (net-new) | `resolveEstimateTemplateInsertTarget` called with a stale/foreign estimate ID is rejected via `rpc("can_edit_estimate",{target_estimate_id})`; no mutation occurs and no target node id is returned. | doc 18 ADV-XWS-ESTIMATE-ACTION; doc 17 "Authz/RLS" | 0A; gates Phase 4 insert |
| Workspace-switch cache-bleed test (`ADV-WS-SWITCH-CACHE`) | `vitest run tests/vitest/library-workspace-switch-cache.test.tsx` (net-new) | After a workspace switch with the inspector dock open, the scoped cache entry (the migrated `workspaceComponentLibraryQueryKey(workspaceId)`; until migration, the un-scoped `["workspace-component-library"]`) clears/refetches; the assertion covers ALL SIX call sites — the reader `TemplateEditorClient.tsx:160` (`useQuery({ queryKey: ["workspace-component-library"] })`), the template-editor self-invalidate at `TemplateEditorClient.tsx:166` (`void queryClient.invalidateQueries({ queryKey: ["workspace-component-library"] })`), and the four writers `LibraryPageClient.tsx:126`, `use-estimate-row-mutations.ts:432`, `EstimateSheetContent.tsx:1299` AND `:1302` (verified 2026-06-21; line numbers drift on host-file edit — re-verify with the keystone's provenance command #2) — so no prior-workspace detail is observable. A test that mocks only the four commonly-cited sites misses the `:166` self-invalidate and the `:1302` second writer. | doc 06 / doc 18 ADV-WS-SWITCH-CACHE; keystone "Query Keys" | 0A; gates the doc 13 key-scoping change |
| Public/share snapshot redaction test (`ADV-PUBLIC-REDACTION`) | `vitest run tests/vitest/share-snapshot-redaction.test.tsx` (net-new) | The snapshot builder field-selection (`src/lib/publication/actions.ts`, which writes `snapshot_json` at `:653` and `p_snapshot_json` RPC params at `:577` and `:716`; verified 2026-06-21) excludes `pricing_source`, free-text `confidence`, and price history from `project_publications.snapshot_json`; assertion is on the serialized snapshot object, NOT a live library endpoint. | doc 18 ADV-PUBLIC-REDACTION; doc 14 | 0A; gates any trust-metadata work that could enter the snapshot |
| Viewer-role mutation denial test (`ADV-VIEWER-MUTATION`) | `vitest run tests/vitest/library-viewer-authz.test.tsx` (net-new) | A `viewer`-role actor sees Quick Add / mutation controls hidden or disabled in the UI AND the server denies the action via `rpc("is_workspace_editor",{target_workspace_id})` (role in owner/admin/member; only `viewer` read-only). | doc 18 ADV-VIEWER-MUTATION; doc 17 "Authz/RLS" | 0A; gates Phase 3 Quick Add |
| Telemetry substrate and payload redaction (`ADV-TELEMETRY-EMITS`) | `bunx vitest run tests/vitest/library-telemetry-emit.test.ts --maxWorkers=1` plus the 7-file focused matrix above | `recordLibraryEvent` emits schema-versioned beta records through the sink; route-state payloads are ID-only/workspace-scoped; sanitizer drops raw/free-text/private fields such as name/query/price/pricing source/confidence; public share surfaces do not import or emit Library telemetry. | doc 20 event registry; doc 18 ADV-TELEMETRY-EMITS; C-009 | 0A; gates route-state and Quick Add telemetry work |
| Perf seed extension for `cost_library_items` | Extend `scripts/seed-performance-test-data.ts` to model N `cost_library_items` (folder + supplier/brand spread). Confirm the gap first: `rg -n "cost_library_items" scripts/seed-performance-test-data.ts` returns ZERO before the edit. | 2026-06-22 status: the script now includes non-destructive manifest-only `cost_library_items` tiers (100 / 500 / 5,000 / 10,000) with folder/supplier/brand spread; `rg -n "cost_library_items" scripts/seed-performance-test-data.ts` returns non-zero; smoke output stored at `_evidence/phase-0a/performance-seed-manifest-smoke.json`. Provider import/apply and timing baseline remain separate work before any numeric budget is claimed. | doc 16 "Phase 0A Seed + Measure"; doc 18 Evidence Requirements (perf) | 0A; PREREQUISITE for every budget number in doc 16 and the `ADV-DENSE-500` gate |
| Perf baseline measurement note | `bun run perf:library-baseline` for deterministic local synthetic model; browser/provider measurement remains `bun run test:e2e` against seeded workspace when release budgets are claimed. | 2026-06-22 status: `_evidence/phase-0a/library-phase0a-perf-baseline-20260622T062635Z.{md,json}` records 5-run median/p95 model timings, parse/stringify payload KB, and re-filter timing at 100 / 500 / 5,000 / 10,000 rows. This is local synthetic evidence only, not React Profiler/browser/provider proof; no 100/500/5,000/10,000 release budget is final without the browser/provider note. | doc 16 "Phase 0A Seed + Measure" + "Performance No-Go Conditions" | 0A partial; gates local budget discussion, not final Phase 5 release budgets |
| Route-state parse/idempotency scaffold | `vitest run tests/vitest/<route-state>.test.tsx` then `bun run test:dom` | `?component=<id>` parse is idempotent (parse(serialize(x)) == x), params are additive, and the components-only `?component=<id>` vs templates segment-route distinction (keystone "Verified File Paths" ruling) holds; flag-on and flag-off both pass. | doc 17 "Route-state" gate; doc 21 cache/route invariants | 0A; gates 0B/1 route-state work |

## Phase 0B — Overlay & Route-State Reliability

Flags: `library_folder_dialogs`, `library_component_deep_link` (doc 21). The
native-prompt grep reaching zero on its 0B targets is a hard completion gate.

**Owner assignment (per-row accountability, doc 27):** all Phase 0B rows ->
**Frontend lead** (native-prompt removal, folder-actions behavior, Add-modal
a11y, bulk-archive copy, deep-link e2e). The browse-payload-reduction proof row
is shared Frontend lead + Perf lead.

| Evidence item | Exact command or proof method | Pass criterion (concrete) | Owning doc/section | Phase gate it unblocks |
| --- | --- | --- | --- | --- |
| Native-prompt removal (folder create/rename/delete) | `rg -n "window\.(prompt\|confirm)" src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` | ZERO hits at `:1493` (create), `:1515` (rename), `:1534` (delete) — replaced by the inline `ConfirmDialog`+`<input>` text-prompt pattern copied from `TemplatesBrowseManager.tsx:531-883`. | doc 06 Static Guards; doc 18 Completion Gates | 0B done-gate (P0 no-go if any 0B target remains) |
| Native-prompt removal (Add dirty-discard) | `rg -n "Discard this component draft" src/components/workshop/component-library-manager/AddComponentModal.tsx` then `rg -n "window\.(prompt\|confirm)" .../AddComponentModal.tsx` | ZERO `window.confirm` at `:963`; dirty close routes through the text-prompt `ConfirmDialog` instead. | doc 06 Static Guards; doc 18 ADV-DIRTY-ADD-NESTED | 0B; shared with Phase 3 Quick Add a11y |
| Folder actions behavior test (`ADV-FOLDER-DELETE-FAIL`, `ADV-CONCURRENT-RENAME`) | `vitest run tests/vitest/component-library-manager-ui.test.tsx tests/vitest/component-library-folder-actions.test.ts --maxWorkers=1` | Create/rename/delete cover success, validation failure, server failure; `deleteLibraryFolder` failure keeps the error visible (folder NOT treated as deleted); concurrent rename/delete yields conflict/retry with no silent overwrite; copy never conflates folder with category; focus returns to the invoking folder action. | doc 06 "Component folder actions"; doc 18 ADV-FOLDER-DELETE-FAIL / ADV-CONCURRENT-RENAME | 0B; folder-dialog release gate (doc 17) |
| Add Component modal a11y test (`ADV-DIRTY-ADD-NESTED`, a11y of `ADV-QUICKADD-UNSAFE`) | `vitest run tests/vitest/library-add-component-modal-a11y.test.tsx` (net-new) | Initial focus lands in the modal; Escape closes the `z-[1050]` nested listbox before the `z-[1000]` modal; dirty close opens the `ConfirmDialog` (not `window.confirm`); confirm/cancel return focus to the invoking control; required-field errors set `aria-invalid` on `name`/`category`/`unit`/`unit_cost`. Manual ARIA/focus only (no axe). | doc 06 "Add Component modal accessibility"; doc 18 ADV-DIRTY-ADD-NESTED | 0B/3 |

2026-06-22 status: `bunx vitest run
tests/vitest/library-add-component-modal-a11y.test.tsx
tests/vitest/library-quick-add-validation.test.ts
tests/vitest/component-library-folder-actions.test.ts --maxWorkers=1` passed 3
files / 11 tests. `ADV-DIRTY-ADD-NESTED` is proven in jsdom, and
`ADV-QUICKADD-UNSAFE` is proven for required fields, invalid URL/future date,
formula-prefix rejection, and network-failure input preservation. Folder action
coverage was extended with `bunx vitest run
tests/vitest/component-library-manager-ui.test.tsx
tests/vitest/component-library-folder-actions.test.ts --maxWorkers=1`, which
passed 2 files / 26 tests. That discharges `ADV-FOLDER-DELETE-FAIL` and
`ADV-CONCURRENT-RENAME` in jsdom: server failures stay visible, folders are not
silently removed, rename conflicts do not optimistically overwrite state, and
the scoped server-action boundaries remain covered.
| Bulk-archive copy test (`ADV-BULK-COPY`) | `vitest run tests/vitest/bulk-destructive-preview-modal.test.tsx` (extend) | `confirmationHint` (`BulkDestructivePreviewModal.tsx:107`, rendering the "This action cannot be undone." string at the span on `:169`) branches on `actionCopy.verb`, NOT blanket `canExecute` — archive does not claim irreversibility (`archived` lifecycle is recoverable); irreversible copy remains for true delete flows. | doc 06 "Bulk archive copy"; doc 18 ADV-BULK-COPY | 0B; bulk-archive release gate |

2026-06-22 bulk/applied-filter/insert proof:
`bunx vitest run tests/vitest/bulk-destructive-preview-modal.test.tsx
tests/vitest/library-applied-filters.test.tsx
tests/vitest/library-template-insert-picker.test.tsx
tests/vitest/template-gallery.test.tsx
tests/vitest/library-templates-cache.test.tsx
tests/vitest/library-source-trust.test.ts --maxWorkers=1` passed 6 files / 32
tests. This discharges `ADV-BULK-COPY`, `ADV-STALE-URL-PARAMS`,
`ADV-XWS-ESTIMATE-TARGET`, and `ADV-TEMPLATE-DEP` for the jsdom/unit surfaces
named by their rows.

2026-06-22 copy-contract proof: focused ESLint passed for
`ComponentLibraryManager.tsx`, `AddComponentModal.tsx`,
`BulkDestructivePreviewModal.tsx`, `source-trust-model.ts`, and the affected
tests. `bunx vitest run tests/vitest/component-library-manager-ui.test.tsx
tests/vitest/workshop-library-consolidation-ui.test.tsx
tests/vitest/library-add-component-modal-a11y.test.tsx
tests/vitest/bulk-destructive-preview-modal.test.tsx
tests/vitest/library-source-trust.test.ts
tests/vitest/library-copy-contract.test.ts
tests/vitest/library-quick-add-validation.test.ts
tests/vitest/library-template-insert-picker.test.tsx --maxWorkers=1` passed 8
files / 58 tests. A follow-up copy-deck drift closure run
`bunx vitest run tests/vitest/library-copy-contract.test.ts
tests/vitest/library-source-trust.test.ts tests/vitest/library-overview.test.tsx
tests/vitest/template-gallery.test.tsx tests/vitest/component-library-manager.test.tsx
tests/vitest/workshop-library-consolidation-ui.test.tsx --maxWorkers=1` passed 6
files / 54 tests and is summarized at
`_evidence/phase-final/copy-contract-pass-20260622T082151Z.md`. Source-only
stale-copy scan returned zero hits for the audited old destructive/trust/empty
state strings outside the negative contract assertions. This closes the known 0B
destructive-dialog, trust-label, and empty-state drift for
`ADV-COPY-MICROCOPY`; final release still needs the all-flow manual copy review
and browser/provider rows.
| Bulk-archive copy static guard | `rg -n "cannot be undone\|reversible\|archive" src/components/workshop/BulkDestructivePreviewModal.tsx src/components/workshop/component-library-manager` | Confirms the hint branches on `actionCopy.verb`, not blanket `canExecute`. | doc 06 Static Guards | 0B |
| Browse payload reduction proof (PRIMARY perf lever) | Manual payload-size measurement (KB) on `loadCurrentWorkspaceComponentRowsLibrary` with `includeDetailGraph: false` vs the `true` default; assert detail graph (versions/price history/state history/attachments) is deferred to inspector-dock open. | Browse payload is measurably smaller than the `includeDetailGraph: true` baseline recorded in the Phase 0A note; the per-item detail graph loads only when `ComponentInspectorDock.tsx` opens, keyed off `?component=<id>`; mirrors the proven `getProjectComponentRowsLibrary(... { includeDetailGraph: false })` projection. | doc 16 "Browse Payload Reduction"; doc 17 "Large-list rendering" | 0B; relieves the Phase 5 density/virtualization no-go |
| Deep-link route-state e2e (browser) | `bun run test:e2e` (`e2e/workshop-library-routes.spec.ts`) | Real route navigation and back/forward across Library tabs and `?component=<id>` behave correctly; a `library_component_deep_link` flag flip-off drops the param without stranding the URL (existing tab shows the broad view, not an error). | doc 06 Browser-Proof Criteria; doc 17 0B rollback | 0B; browser claim cannot be asserted without this run |

## Phase 1 — Findability & Applied Filters

Flag: `library_component_deep_link` (doc 21).

**Owner assignment (per-row accountability, doc 27):** all Phase 1 rows ->
**Frontend lead** (overview selection/deep-link, applied-filter chips,
route-navigation e2e).

| Evidence item | Exact command or proof method | Pass criterion (concrete) | Owning doc/section | Phase gate it unblocks |
| --- | --- | --- | --- | --- |
| Overview selection / deep-link test (`ADV-DELETED-RESULT`) | `vitest run tests/vitest/library-overview-navigation.test.tsx` (net-new) | Component search result click AND Enter route to Components with `?component=<id>` (owned by `LibraryPageClient.tsx`); recent-component card uses the same route-state; template results still open `/workshop/library/templates/[templateId]`; a deleted/foreign result yields a recoverable not-found; selection + result count announced once (ARIA); active tab/panel semantics correct. | doc 06 "Library overview selection"; doc 18 ADV-DELETED-RESULT | Phase 1; deep-link release gate |
| Applied-filter chips test (`ADV-STALE-URL-PARAMS`) | `vitest run tests/vitest/library-applied-filters.test.tsx` (net-new) — or extend `tests/vitest/workshop-library-consolidation-ui.test.tsx` | Visible chips for supplier, brand, lifecycle (the five `component_lifecycle_state` values), confidence (free text), pricing freshness via `getComponentPricingFreshness(item, now)` (`"any"\|"fresh"\|"stale"\|"missing"`); individual chip removal updates state + URL params; clear-all resets; filtered count and no-results states update; stale URL params resolve to a handled empty/correct state. | doc 06 "Applied filters"; doc 18 ADV-STALE-URL-PARAMS | Phase 1; applied-filters release gate |

2026-06-22 overview proof: `bunx vitest run
tests/vitest/library-overview.test.tsx tests/vitest/library-tab-a11y.test.tsx
tests/vitest/library-tabs-layout.test.tsx
tests/vitest/library-overview-skeleton.test.tsx
tests/vitest/workshop-library-consolidation-ui.test.tsx --maxWorkers=1`
passed 5 files / 33 tests. This covers recent component links, component
search-result click and Enter routing to `?component=<id>`, template result
routing, no-results recovery, tab a11y, and stale/foreign component route-state
recovery.
| Route navigation/back-forward e2e (browser) | `bun run test:e2e` (`e2e/workshop-library-routes.spec.ts`) | Back/forward across the deep-link continuity and applied-filter URL state behaves correctly in a real browser (jsdom cannot prove router history). | doc 06 Browser-Proof Criteria | Phase 1 browser claim |

## Phase 2 — Source Trust at Decision Points

Flag: `library_trust_chips` (doc 21).

**Owner assignment (per-row accountability, doc 27):** trust chip rendering +
90-day guard -> **Frontend lead**; the snapshot-redaction-holds row ->
**Security lead**.

| Evidence item | Exact command or proof method | Pass criterion (concrete) | Owning doc/section | Phase gate it unblocks |
| --- | --- | --- | --- | --- |
| Trust chip rendering test | `vitest run tests/vitest/library-overview.test.tsx` (extend) + the touched chip-surface suite | Trust chips render over REAL columns/helpers: pricing freshness via `getStalenessTone`/`getStalenessLabel` and `getComponentPricingFreshness`; free-text `confidence` (no fixed enum assumed); `updated_at` for "last touched" (NOT a non-existent `last_reviewed`); source via `pricing_source` with app-side URL validation. | doc 18 Completion Gates (trust chips); keystone "Confidence and Freshness Models" | Phase 2; trust-chip release gate |
| 90-day single-source-of-truth guard | `rg -n "COMPONENT_FACET_STALE_DAYS = 90" src/components/workshop/library/component-facet-filter.tsx` ; `rg -n "LIBRARY_OVERVIEW_STALE_PRICING_DAYS = 90" src/lib/repositories/component-library-repository.ts` ; `rg -n "older than 90 days" src/components/workshop/library/overview/LibraryOverview.tsx` | If any freshness threshold or "very stale" tier changes, all THREE locations (`component-facet-filter.tsx:12`, `component-library-repository.ts:827`, `LibraryOverview.tsx:114`) change in lockstep — no fourth source of truth introduced. Additionally (Phase 2 "very stale" tier): `getComponentPricingFreshness` (`component-facet-filter.tsx:61`), `getStalenessTone`, and `getStalenessLabel` (`component-library/helpers.ts:667/675`) all agree on tier boundaries for any `{fresh,stale,very stale,missing}` partition; a unit test asserts helper-output consistency, not just a grep on the three constants. | keystone "Confidence and Freshness Models" | Phase 2; guards against threshold drift |
| Snapshot redaction holds with trust metadata live | Re-run `vitest run tests/vitest/share-snapshot-redaction.test.tsx` after trust-chip work | After trust chips exist, `pricing_source` / `confidence` / price history still never enter `project_publications.snapshot_json`. | doc 18 ADV-PUBLIC-REDACTION; doc 14 | Phase 2; re-asserts the 0A redaction gate against new surfaces |

## Phase 3 — Add/Edit Component Flow Split (Quick Add)

Flag: `library_quick_add` (doc 21).

**Owner assignment (per-row accountability, doc 27):** Quick Add validation +
Add/Edit normalization -> **Frontend lead**; the `ADV-VIEWER-MUTATION` row ->
**Security lead**.

| Evidence item | Exact command or proof method | Pass criterion (concrete) | Owning doc/section | Phase gate it unblocks |
| --- | --- | --- | --- | --- |
| Quick Add required-field validation (`ADV-QUICKADD-UNSAFE`) | `bunx vitest run tests/vitest/library-add-component-modal-a11y.test.tsx tests/vitest/library-quick-add-validation.test.ts --maxWorkers=1` | Required = `name`/`category`/`unit`/`unit_cost` (CANONICAL QUICK ADD CONTRACT) cannot be saved when malformed; formula-like text and invalid `pricing_source` URLs are validated/sanitized app-side over free text; required-field errors set `aria-invalid`; on network failure the form data is preserved and retry is available. No schema change (all columns exist). | doc 18 ADV-QUICKADD-UNSAFE; keystone "Canonical Quick Add Contract" | Phase 3; quick-add release gate |
| Viewer cannot save Quick Add (`ADV-VIEWER-MUTATION`) | `bunx vitest run tests/vitest/library-viewer-authz.test.tsx --maxWorkers=1` (net-new, shared with 0A) | Quick Add trigger hidden/disabled for `viewer`; server denies via `is_workspace_editor`. | doc 18 ADV-VIEWER-MUTATION | Phase 3; P0 no-go if a viewer can save |
| Add/Edit source-field normalization | `bunx vitest run tests/vitest/library-add-component-modal-a11y.test.tsx tests/vitest/library-quick-add-validation.test.ts tests/vitest/component-library-manager-ui.test.tsx tests/vitest/workshop-library-consolidation-ui.test.tsx --maxWorkers=1` | Add and Edit forms write the SAME columns (`pricing_date`/`pricing_source`/`confidence`/supplier/brand); advanced fields appear progressively after the required four. | keystone "Canonical Quick Add Contract" | Phase 3 |

## Phase 4 — Templates Browse/Insert/Editor Clarity

No new flag (reuses `library_trust_chips` for the summary layer) (doc 21).

**Owner assignment (per-row accountability, doc 27):** insert-picker target +
stale/foreign target rejection + dependency-health -> **Backend lead**;
creatable-combobox move -> **Frontend lead**.

| Evidence item | Exact command or proof method | Pass criterion (concrete) | Owning doc/section | Phase gate it unblocks |
| --- | --- | --- | --- | --- |
| Insert-picker target test (`ADV-XWS-ESTIMATE-TARGET`) | `bunx vitest run tests/vitest/library-template-insert-picker.test.tsx --maxWorkers=1` (net-new) | `InsertIntoEstimatePicker.tsx` (a `Modal`) over `listEstimateInsertTargets` + `resolveEstimateTemplateInsertTarget`: project, estimate, and resolved target group/area are visible before submit; submit re-resolves; stale submit-time target blocks insert with recovery copy; resolver returns `targetParentNodeId` plus display metadata; the actual insert remains `insertEstimateTemplateIntoEstimate` — do not conflate. | doc 06 "Insert template picker"; doc 18 ADV-XWS-ESTIMATE-TARGET | Phase 4; insert release gate |
| Stale/foreign target server rejection (`ADV-XWS-ESTIMATE-ACTION`) | `bunx vitest run tests/vitest/estimate-insert-target-authz.test.tsx --maxWorkers=1` (net-new, shared with 0A) | Server-side insert action rejects a viewer via `can_edit_estimate`; unreadable resolver target stops before node lookup; no wrong-estimate mutation. | doc 18 ADV-XWS-ESTIMATE-TARGET / ADV-XWS-ESTIMATE-ACTION | Phase 4; P0 no-go if wrong estimate mutates |
| Template dependency-health test (`ADV-TEMPLATE-DEP`) | `bunx vitest run tests/vitest/library-template-insert-picker.test.tsx --maxWorkers=1` (net-new) | Picker computes dependency health from template rows: archived dependencies block insert; discontinued dependencies require explicit confirmation; stale target/partial failure copy stays inline and does not silently succeed. Missing-source remains a derived state that requires computed source resolution when available. | doc 18 ADV-TEMPLATE-DEP; keystone "Enums" / "Data Layer" | Phase 4 |
| Creatable-combobox move proof | `bunx vitest run tests/vitest/template-gallery.test.tsx tests/vitest/library-templates-cache.test.tsx --maxWorkers=1` | The Phase 4 template-move control uses existing `ui/creatable-combobox.tsx` for existing groups plus create-new, and successful moves invalidate the scoped templates query. Provider-backed insert smoke was not run in this local pass because no live Supabase/RLS claim was made beyond the server-action authz unit proof. | keystone "New Docs / Overlay primitives"; doc 06 Browser-Proof Criteria | Phase 4 |

## Phase 5 — Dense Maintenance Mode & Browser-Proven Polish (LAST)

Flag: `library_dense_mode` (doc 21). Every budget number here references the
Phase 0A measurement note; none may be claimed without it. **All Phase 5 perf
budgets are PROVISIONAL (C-015) until the Phase 0A baseline lands; final
thresholds in doc 30.**

**Owner assignment (per-row accountability, doc 27):** the 500-row and 5,000-row
budget rows -> **Perf lead**; mobile inspector-dock geometry, sticky/scroll +
portal/z-index, cross-portal focus-trap -> **QA lead**; the `ADV-OUT-OF-ORDER`
N/A row -> **Perf lead** (re-opens only if a server/FTS search ships).

**Implementation status (2026-06-22):** Dense mode implementation is complete
behind `NEXT_PUBLIC_LIBRARY_DENSE_MODE`; rollback remains the flag-off card grid
path. Local proof passed:
`bunx vitest run tests/vitest/workshop-library-consolidation-ui.test.tsx
tests/vitest/library-tab-a11y.test.tsx
tests/vitest/estimate-sheet-column-resize-flag.test.ts --maxWorkers=1` (3 files
/ 17 tests), `bun run type-check`, and touched-file `git diff --check`.
Chromium browser/provider proof passed again with fresh artifacts:
`ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1
ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET=<local-dev-auth-bypass-secret>
ARCHESTIMATOR_E2E_LIBRARY_DENSE_PROOF=1 NEXT_PUBLIC_LIBRARY_DENSE_MODE=1
NEXT_PUBLIC_LIBRARY_VIRTUALIZATION_ENABLED=1 bun run test:e2e --
e2e/workshop-library-routes.spec.ts --project=chromium -g "proves
dense component table"` (1 passed / 500 disposable rows). Artifacts:
`_evidence/phase-5/dense-mode/library-phase5-dense-table-chromium-1280x900-20260622T091251Z.{png,json}`
and
`_evidence/phase-5/dense-mode/library-phase5-dense-mobile-chromium-390x844-20260622T091251Z.{png,json}`.
Cleanup proof: `cost_library_items` fixture rows tagged
`phase-5-dense-browser-proof` returned to 0, and no `next dev`/`next-server`
process remained. The documented `WORKSHOP_VIRTUALIZATION_FLAGS` fallback was
exercised for the 500-row dense table: desktop metadata records
`virtualActive=true`, `totalCount=500`, `mountedCount=25`, `domRowCount=25`.
500-row timing proof also passed:
`ARCHESTIMATOR_E2E_LIBRARY_DENSE_PERF=1 ... bun run test:e2e --
e2e/workshop-library-routes.spec.ts --project=chromium -g "measures dense
component table"` produced
`_evidence/phase-5/dense-mode/library-phase5-dense-perf-chromium-1280x900-20260622T091332Z.json`
with dense-toggle median `146.5ms` (budget `<=500ms`), search-narrow median
`80.4ms` (budget `<=100ms`), search-restore median `87.9ms` (budget
`<=500ms`), p95 recorded, browser transfer size `1,742,995`, decoded body size
`10,059,710`, and fixture cleanup at 0. Companion summaries:
`_evidence/phase-5/dense-mode/provider-browser-proof-20260622T080629Z.md` and
`_evidence/phase-5/dense-mode/provider-virtualized-perf-proof-20260622T091332Z.md`.
The separate 5,000-row keystroke tier remains open.

| Evidence item | Exact command or proof method | Pass criterion (concrete) | Owning doc/section | Phase gate it unblocks |
| --- | --- | --- | --- | --- |
| Dense toggle / columns / action parity local proof | `bunx vitest run tests/vitest/workshop-library-consolidation-ui.test.tsx tests/vitest/library-tab-a11y.test.tsx tests/vitest/estimate-sheet-column-resize-flag.test.ts --maxWorkers=1`; `bun run type-check`; touched-file `git diff --check` | `NEXT_PUBLIC_LIBRARY_DENSE_MODE` gates the toggle; the persisted `cards`/`dense` preference writes to `localStorage`; dense mode uses a native table with name, folder, supplier, brand, cost, pricing source, pricing date, confidence, lifecycle, usage, and actions; column sort works; selection/inspect/promote parity is preserved; row `Space` selects and `Enter` opens the inspector; the shared `WORKSHOP_VIRTUALIZATION_FLAGS` / `WORKSHOP_LIBRARY_COMPONENTS_VIRTUALIZATION` surface is used without adding a parallel virtualizer. | doc 05 Phase 5; doc 10 Dense Component Row; doc 12 A11y; doc 21 feature flags | Phase 5 local implementation gate |
| 500-row dense-mode functional + timing proof (`ADV-DENSE-500`) | `ARCHESTIMATOR_E2E_LIBRARY_DENSE_PROOF=1 ... bun run test:e2e -- e2e/workshop-library-routes.spec.ts --project=chromium -g "proves dense component table"` and `ARCHESTIMATOR_E2E_LIBRARY_DENSE_PERF=1 ... -g "measures dense component table"`; disposable provider rows tagged `phase-5-dense-browser-proof` | 2026-06-22 status: Chromium route loads 500 seeded rows without the prior PostgREST Bad Request; dense table virtualizes via `WORKSHOP_VIRTUALIZATION_FLAGS` (`virtualActive=true`, `totalCount=500`, `mountedCount=25`); required headers/actions render; `Space` selects and `Enter` opens the inspector with `?component=<id>` via shallow History API; cleanup returns fixture rows to 0. Timing budgets pass: dense toggle median `146.5ms` <= `500ms`, search narrow median `80.4ms` <= `100ms`, search restore median `87.9ms` <= `500ms`; p95 and resource transfer/decoded sizes recorded in the timing JSON. | doc 16 "Performance No-Go Conditions"; doc 18 ADV-DENSE-500 | Phase 5 functional + 500-row perf browser gate |
| 5,000-row keystroke budget | `bun run test:e2e` + Phase 0A measurement note (5,000-row tier) | Keystroke re-filter <= 150 ms at 5,000 seeded rows, OR a committed server-search follow-up is scheduled (server/FTS is FUTURE; no FTS/trigram index exists today). | doc 16 "Performance No-Go Conditions" | Phase 5; gates the "no server path planned" no-go |
| Mobile inspector-dock geometry (`ADV-MOBILE-BROWSE`) | Same Chromium dense proof at 390x844 viewport | 2026-06-22 status: mobile artifact records `documentScrollWidth=390`, dense scroll containment (`denseClientWidth=334`, `denseScrollWidth=1166`, `denseLeft=27`, `denseRight=363`), and inspector dock inside viewport (`dockLeft=18`, `dockRight=372`). Evidence: `_evidence/phase-5/dense-mode/library-phase5-dense-mobile-chromium-390x844-20260622T091251Z.{png,json}`. | doc 06 Browser-Proof Criteria; doc 18 ADV-MOBILE-BROWSE | Phase 5 browser claim |
| Glass shell browser proof (`ADV-VISUAL-GLASS`, shell subset) | `bun run test:e2e -- e2e/workshop-library-routes.spec.ts --project=chromium -g "proves library glass shell"` with dev auth bypass/admin DB env | 2026-06-22 status: Chromium desktop route renders `data-library-surface="glass"`, arms `data-glass="ready"`, applies one outer shell blur, and keeps nested Library slots unblurred. Evidence: `_evidence/phase-1/glass-shell/glass-shell-browser-proof-20260622T081457Z.md`. Full glass card/template/overlay/mobile/contrast/paint-time matrix remains open. | doc 18 ADV-VISUAL-GLASS; doc 35 one-blur contract | Phase 1 partial browser claim |
| Sticky/scroll + portal/z-index proof | Same Chromium dense proof for sticky/scroll; portal/z-index only if a portal surface changes | 2026-06-22 status: dense native table/sticky header and horizontal scroll containment were proven in Chromium by the dense proof above. Portal/z-index tiers were not changed in Phase 5 and remain governed by existing overlay tests; no new portal browser claim is made here. | doc 06 Browser-Proof Criteria; keystone z-index tiers | Phase 5 browser claim |
| Cross-portal focus-trap proof (`ADV-KEYBOARD-MGMT`) | `vitest run tests/vitest/component-library-folder-actions.test.ts` + `vitest run tests/vitest/library-add-component-modal-a11y.test.tsx` first; `bun run test:e2e` only if a portal/trap changes | Manual ARIA/focus assertions pass (no axe harness); focus returns to the invoking control; full cross-portal focus trapping proven in a real browser only when a portal/trap actually changes. | doc 06 Browser-Proof Criteria; doc 18 ADV-KEYBOARD-MGMT | Phase 5 |
| Server-search out-of-order (`ADV-OUT-OF-ORDER`) | `vitest run tests/vitest/library-server-search.test.tsx` — ONLY if a server/FTS search is built | N/A today: components-tab search is 100% client-side synchronous (`ComponentLibraryManager.tsx:876-882`), so no async race exists. Stays N/A until a server/FTS path ships. | doc 16 "Out-Of-Order Responses"; doc 18 ADV-OUT-OF-ORDER | Phase 5; explicitly N/A, not a gap |

## Cross-cutting evidence (any phase that touches the surface)

**Owner assignment (per-row accountability, doc 27):** cache-invalidation exact-key
proof -> **Backend lead**; full validation gate + whitespace/diff hygiene +
evidence-status crosswalk -> **Release lead**; native-prompt full-surface guard
-> **Frontend lead**; rendered-UI screenshots -> **QA lead**.

| Evidence item | Exact command or proof method | Pass criterion (concrete) | Owning doc/section | Phase gate it unblocks |
| --- | --- | --- | --- | --- |
| Cache-invalidation exact-key proof (`ADV-WS-SWITCH-CACHE`) | `vitest run tests/vitest/library-workspace-switch-cache.test.tsx` (net-new) + existing `tests/vitest/library-components-cache.test.tsx` / `library-templates-cache.test.tsx` | The un-scoped `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` (`["workspace-component-library"]`) is scoped by `workspaceId` via the factory `workspaceComponentLibraryQueryKey(workspaceId)` (mirroring the rows-library key; resolves C-007); the scoping change migrates ALL SIX call sites — the reader at `TemplateEditorClient.tsx:160`, the template-editor self-invalidate at `TemplateEditorClient.tsx:166`, and the four writers at `LibraryPageClient.tsx:126`, `use-estimate-row-mutations.ts:432`, `EstimateSheetContent.tsx:1299` AND `:1302` (line numbers verified 2026-06-21; re-verify with the keystone provenance command before relying on them); each mutation names the EXACT key(s) it invalidates (no "invalidate the library cache" abstractly). A test that mocks only the four commonly-cited sites misses the `:166` self-invalidate and the `:1302` second writer. | doc 18 Completion Gates (cache); keystone "Query Keys" | Any cache-touching phase; P0 no-go if bleed reproducible |
| Full validation gate | `bun run validate` | `type-check && lint && lint:design-system && lint:design && test && test:dom` all pass before any phase is called done. | doc 17 Release Gates; doc 18 Completion Gates | Every phase done-gate |
| Native-prompt full-surface guard | `rg -n "window\.(prompt\|confirm)" src/components/workshop/component-library-manager src/components/workshop/library src/components/workshop/component-library/index.tsx` | 0B targets reach ZERO (`ComponentLibraryManager.tsx:1493/1515/1534`, `AddComponentModal.tsx:963`); the Phase-later estimate-page panel (`component-library/index.tsx:939/1428`) is a TRACKED residual, not a silent miss; matches in `TemplateEditorClient.tsx` / `TemplatesBrowseManager.tsx` are comments — do not re-flag. | doc 06 Static Guards; doc 18 Completion Gates | 0B done-gate; tracks Phase-later residual |
| Whitespace/diff hygiene | `git diff --check` | No trailing whitespace or conflict markers in the diff. | doc 06 Static Guards | Every phase |
| Evidence-status crosswalk | Inspect doc 18 matrix + doc 06 matrix | Every `ADV-*` row carries a pass / skip-with-risk / no-go status for implemented scenarios; doc 06 and doc 18 use IDENTICAL IDs (no drift). | doc 18 Completion Gates | Release gate |
| Rendered-UI screenshots | `bun run test:e2e` artifact capture, or manual browser capture per the screenshot harness, for each shipped phase's visible surface | A screenshot exists for each phase's rendered surface (deep-link selection, applied-filter chips, trust chips, Quick Add, insert picker, dense toggle). **Naming/storage:** `library-phase<ph>-<surface>-<viewport>.png` under `_evidence/<phase>/<scenario>/` per the "Artifact storage and naming" rules above; a companion `.json` metadata file per doc 29 §4; browser/viewport matrix per doc 29 (see the matrix in "Artifact storage and naming" above). These are EXECUTION OUTPUTS — their absence is not a planning gap; the final report attaches them or lists them as not-yet-captured with the owning command. | doc 06 Browser-Proof Criteria; doc 29; doc 18 Evidence Requirements | Release readiness presentation; never blocks the PLAN's readiness |

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
