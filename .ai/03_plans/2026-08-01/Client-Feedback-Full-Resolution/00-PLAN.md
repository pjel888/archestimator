# Client Feedback Full Resolution - Canonical Execution Plan

- Package: PLAN-2026-08-01-client-feedback-full-resolution
- Baseline: 3e9a2d1e0bc529ac89d98d16233c603886b7b038
- State: IMPLEMENTATION_READY / NOT_STARTED / ACTIVE
- Quality profile: Q2_CRITICAL_CHANGE_GATE
- Action ceiling: local repository implementation and local evidence only
- Next unit: UNIT-001
- Current dependency-eligible frontier: UNIT-001, UNIT-002, UNIT-003

## 1. Outcome and boundary

Reconcile all twelve client comments against current source, finish only the remaining gaps, and produce one warning-clean, task-scoped, machine-readable Q2 candidate. Existing working behavior is characterized and preserved; the plan does not rebuild variants, uploads, catalogue governance, contribution arithmetic, area totals, or commercial fields.

Completion means:

- AC-001 through AC-013 pass at one final task candidate.
- Every planned receipt is current, machine-readable, hash-bound to either its immutable owned scope or the final cumulative candidate as declared below, and free of skips/flakes/warnings. EVID-005 through EVID-007 bind the final cumulative candidate.
- The full client journey passes once in Chromium; focused critical subsets pass in Firefox, WebKit, and two compact/touch projects.
- Canonical transition, row-interaction, bundle, hard-refresh p95, and single-sample stall gates pass with no invalid, timed-out, or missing-stage sample.
- Independent quality and security/data reviews contain no unresolved high or critical finding.
- The plan pack is validated before source-candidate freeze and remains immutable during execution. After all gates pass, a gitignored closeout receipt records the final candidate, Q2/review hashes, validator result, and terminal tuple without changing the reviewed candidate.

This pack does not authorize deployment, paid services, provider mutations, destructive data loss, commits, pushes, branch changes, or edits outside the bounded task scope. No schema migration is expected. If characterization proves one necessary, stop the affected unit and add a dedicated migration unit under the D1 migration lifecycle; do not hide it in another unit.

## 2. Re-audit verdict and acceptance

The current-source audit remains the evidence-backed starting point: six comments are implemented and require integrated revalidation, five are partial, and loading remains unresolved. A unit test alone cannot change a client-facing status to resolved.

| ID | Client outcome | Current verdict | Acceptance criterion |
| --- | --- | --- | --- |
| REQ-001 / AC-001 | Native estimate text is comfortably readable without browser zoom. | Resolved; revalidate | Existing increased estimate role scale remains intact; 100%, 110%, and 200% browser zoom plus compact/touch viewports show no clipped critical text or controls, and keyboard/focus behavior remains usable. |
| REQ-002 / AC-002 | Estimate pages do not intermittently feel stuck. | Unresolved | Every applicable Beta gate in .ai/01_roadmap/27-performance-budget-and-regression-gates.md passes, including workshop transition, optimistic row interaction, bundle, normal/representative first-editable p95, and the single-sample stall ceiling. Seeded Next production and OpenNext runs retain p50/p95/max and every failed sample; no invalid, timeout, missing first-editable mark, or over-budget sample may pass. |
| REQ-003 / AC-003 | A user can select V-1, V-2, or V-3 and the selected option persists. | Resolved; revalidate | Create/name/select/reload preserves option ID, label, cost, totals, and proposal/export parity. |
| REQ-004 / AC-004 | Brand and supplier use accessible workspace master lists. | Partial | Page 001 supports filter/select/create/clear with permissions and retry. Label and canonical UUID persist atomically. Synthetic label-option IDs are never stored. A created entity is immediately visible with the same UUID/name in Page 001, PROJECT, and library management. |
| REQ-005 / AC-005 | Adding a material does not strand or lose work after an error. | Resolved; revalidate | Success, stale-revision failure, offline/error recovery, retry, delete-draft, idempotency, and reload all preserve a truthful state. |
| REQ-006 / AC-006 | Image upload works from Page 001 and Edit Component. | Resolved; revalidate | Both entry points pass success, abort, retry, wrong-MIME, oversize, permission denial, persisted readback, and reload using the existing private upload lifecycle. |
| REQ-007 / AC-007 | Brand/supplier changes converge in PROJECT. | Partial | Page 001 retains canonical IDs through unrelated edits and materialization. Existing workspace-scoped rename/merge propagation and query convergence update PROJECT. Active or merged IDs show the current active/survivor name; archived non-merged legacy rows retain the stored historical label. No cross-workspace entity resolves. |
| REQ-008 / AC-008 | Direct Category can be changed safely. | Partial | The derived field remains non-free-text. A linked library component moves through the existing folder coordinator. A project-only component promotes directly into the chosen folder. Same-intent replay is idempotent; replay with a different requested folder returns a typed conflict with the authoritative original folder. |
| REQ-009 / AC-009 | Accessories are discoverable under a main material and priced once. | Partial | Required/optional children show parent, effective quantity, inclusion state, and assembly rollup. The canonical contribution engine counts each child exactly once in row, area, project, and proposal totals. Cycles and invalid parents are rejected. |
| REQ-010 / AC-010 | VE options can be toggled and compared before selection. | Partial | An accessible summary shows options, selected state, option cost, and delta. Existing mutations select/toggle the contribution; area/project/proposal totals update immediately and persist after reload. |
| REQ-011 / AC-011 | Main areas show useful subtotals. | Resolved; revalidate | Area headers continue to show live direct/descendant/effective totals and truthful partial-load state across edits, accessories, alternatives, reload, and export. |
| REQ-012 / AC-012 | Remarks, quotation state, and VAT treatment are available. | Resolved; revalidate | Remarks, quotation status/link, VAT inclusive/exclusive treatment, validation, permissions, reload, and proposal/export parity pass. |
| REQ-013 / AC-013 | No feedback item is closed partially. | New closure rule | One seeded journey covers all twelve outcomes; focused receipts remain current for their immutable owned scopes and cumulative receipts bind the final candidate; console warnings are zero; reconciliation has no partial, unknown, skipped, stale, or unevidenced resolved claim. |

## 3. Source decisions

### Verified reuse boundaries

- component_brands/component_suppliers governance already owns create, rename, archive, merge, audit, and workspace-scoped label rewrites.
- Page 001 currently drops CreatableComboboxChange.id; EditableRowValue declares identity fields but initial/merge/materialization paths do not consistently preserve them.
- Label-only estimate values create synthetic option IDs such as brand:<slug> and supplier:<slug>; these are display/filter identities only.
- AddComponentModal already exposes componentEditScope and onMoveComponentCategory. Promotion already accepts libraryFolderId through the estimate-row mutation layer.
- Promotion replay currently returns before it can verify the requested folder and its result omits authoritative folder identity.
- resolveEffectiveContribution is the arithmetic authority. Tree totals and proposal export are separate consumers and must remain parity-tested; proposal does not need to consume a new tree-shaped adapter.
- Assembly graph, VE/optional mutations, variants, upload lifecycle, area subtotals, and commercial data already exist. Remaining work is identity preservation, presentation, integration, and proof.
- Catalogue rename/merge already rewrites estimate snapshots. Do not add PROJECT master joins unless a failing characterization test proves the existing propagation/fallback contract is insufficient.

### Decisions

| ID | Decision |
| --- | --- |
| DEC-AUTO-001 | Catalogue options carry explicit canonical-versus-fallback provenance. Only a current same-workspace entity UUID may populate brandId/supplierId. Legacy label-only options remain display-only until the user selects or creates a canonical entity. |
| DEC-AUTO-002 | Direct Category reuses the existing ComponentFolderMoveOutcome contract. Project promotion returns authoritative libraryFolderId; same correlation ID plus a different folder is a typed conflict, never silent success. |
| DEC-AUTO-003 | resolveEffectiveContribution remains the sole contribution/arithmetic truth. Assembly and VE work adds presentation/selectors and parity tests, not a parallel calculator or proposal rewrite. |
| DEC-AUTO-004 | Numeric performance acceptance comes only from the canonical roadmap budget file, including its closed-beta first-editable p95 and max-stall gates. This pack references those gates without duplicating their values. The Beta tier is the gate; stricter targets remain optimization north stars. |
| DEC-AUTO-005 | Evidence identity is the full Git revision plus a hash of the task-owned status/diff, relevant config/migrations, fixture, build, browser/runtime versions, and measurement settings. Inherited dirty paths are recorded and left unchanged. |

### Assumptions and deterministic response

| ID | Assumption | If false |
| --- | --- | --- |
| ASSUMP-001 | Current D1 schema already supports catalogue IDs, folders, variants, assemblies, contribution state, images, and commercial fields. | Stop the affected unit and add a dedicated migration unit with local apply/fix-forward proof. |
| ASSUMP-002 | Existing canonical actions can be extended without a second catalogue, category, upload, or contribution subsystem. | Prefer the nearest existing action/repository; a new abstraction requires a demonstrated second caller or isolation need. |
| ASSUMP-003 | A run-scoped local D1 fixture can bind both authenticated browser state and each measured runtime. | UNIT-001 remains failed until the runtime reads the exact seeded database; count-only fixture success is insufficient. |

### Principal risks

| ID | Risk | Control |
| --- | --- | --- |
| RISK-001 | A synthetic or cross-workspace catalogue ID is persisted. | Provenance type, server validation, tenant-negative tests, unrelated-edit/reload test. |
| RISK-002 | Accessories or VE are counted twice or diverge from proposal totals. | Canonical contribution engine, property tests, tree/proposal parity, cycle/invalid-parent cases. |
| RISK-003 | Performance evidence measures a shell, cold first sample, wrong D1, or stale candidate. | Authenticated first-editable selector, two uncounted warmups, run-manifest binding, failed-sample retention, complete provenance. |
| RISK-004 | New integration regresses the six already implemented comments. | Characterization first, UNIT-004 integration receipt, UNIT-006 all-outcome journey, warning gate. |
| RISK-005 | Shared-worktree changes contaminate or are overwritten by evidence/cleanup. | Exact task scope, one writer per file, task-scoped hashes, no generic cleanup/revert/stash/reset. |

## 4. Minimal DAG and execution frontier

    UNIT-001  Performance harness, authenticated fixtures, red baseline
    UNIT-002  Catalogue identity + category placement
    UNIT-003  Assembly presentation + VE summary
         |          |          |
         |      UNIT-002 + UNIT-003
         |              |
         |           UNIT-004  Single editor integration
         |              |
         +----------> UNIT-005  Measured optimization + final performance
                            |
                         UNIT-006  Full journey + resolved-feature revalidation
                            |
                         UNIT-007  Reviews + Q2 + reconciliation + closeout

Only UNIT-001, UNIT-002, and UNIT-003 are executable now. All units have READY contracts in the manifest because their work is fully specified; dependency barriers, not status labels, determine current eligibility. UNIT-001 is the exact next unit.

Implementation may use up to three initial file-disjoint lanes if host pressure remains healthy. The lead owns a two-slot heavy-command semaphore at the observed 63.82 GiB host tier; every Bun/Node/Vitest/build/browser/type-check/coverage/mutation/graph process acquires a slot, and no lane may start one implicitly. Do not scale above two slots until two fresh healthy samples show at least 24 GiB available with no swap growth; always retain at least 16 GiB. UNIT-004 through UNIT-007 are serialized. Every writer must reread a shared file immediately before editing it.

## 5. Common unit contract

Before a product-symbol edit, run GitNexus upstream impact for the exact symbol. The current index is one commit stale and symbol/FTS resolution is degraded; UNKNOWN is not low risk. If the tool remains degraded, record direct current-source callers, focused tests, and execution paths as fallback evidence. Warn before any HIGH or CRITICAL edit.

Each unit:

1. captures baseline HEAD plus task-scoped status/diff hash;
2. writes only its declared paths; any expansion is lead-issued and recorded before the edit;
3. starts with a failing characterization/acceptance case where behavior is incomplete;
4. runs the cheapest decisive focused command through scripts/quality/run-evidence-command.ts;
5. retries a failed command once after a concrete repair, then returns to lead triage instead of looping;
6. removes only its own obsolete code and never modifies inherited work;
7. returns the full handoff packet: unit/status and owner; criteria addressed; baseline and owned/cumulative candidate hashes; inspected resources and callers; files changed; incomplete work; assumptions, deviations, decisions, and unresolved core questions; red-before-green evidence; every exact command, exit status, duration, and output; evidence paths and SHA-256 hashes; coverage, mutation, security/data, accessibility, and performance findings as applicable; missing/skipped/flaky evidence; warnings; conflicts and cleanup; residual risks and confidence; next barrier, owner, and escalation.

Command timeout policy: focused tests get 10 minutes, builds and one browser/performance runtime get 20 minutes, and the canonical Q2 aggregate gets 60 minutes. On timeout, capture owned-process diagnostics, terminate only the owned job, make one evidence-backed repair attempt, and return to lead triage; do not silently extend, background, or orphan the command.

PowerShell orchestration starts each unit with the helpers below and calls `Assert-NativePass` immediately after every pass-required native command. UNIT-001 baseline measurements instead call `Assert-BaselineReceipt`, which accepts only exit 0 or the documented budget/contract exit 1, requires a fresh parseable PASS/FAIL artifact, and rejects crashes, missing artifacts, or any other exit. Native command failure is never masked by a later command.

    $script:UnitEvidenceStartedAtUtc = (Get-Date).ToUniversalTime()
    function Assert-NativePass([string]$Label) {
      if ($LASTEXITCODE -ne 0) { throw "$Label failed with exit $LASTEXITCODE." }
    }
    function Assert-BaselineReceipt([string]$Label, [string]$Path, [int]$ExitCode) {
      if ($ExitCode -notin @(0, 1)) { throw "$Label crashed with exit $ExitCode." }
      if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "$Label did not create $Path." }
      if ((Get-Item -LiteralPath $Path).LastWriteTimeUtc -lt $script:UnitEvidenceStartedAtUtc) { throw "$Label artifact is stale." }
      $receipt = Get-Content -LiteralPath $Path -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
      if ($receipt.status -notin @('PASS', 'FAIL')) { throw "$Label artifact lacks a PASS/FAIL status." }
      if (($ExitCode -eq 0) -ne ($receipt.status -eq 'PASS')) { throw "$Label exit and artifact status disagree." }
    }

No unit may claim PASS from skipped tests, a synthetic page.setContent browser contract, a stale receipt, a partial fixture, or a successful command that did not create its documented artifact.

## 6. Implementation units

### UNIT-001 - Performance harness, authenticated fixtures, and red baseline

- Depends on: none
- Capability owner: performance/test engineer
- Heavy-command policy: serial builds and browser runs only
- Evidence: EVID-001

Owned paths:

- scripts/measure-estimate-loading.ts
- scripts/lib/estimate-sheet-local-d1-prepare.ts
- new scripts/prepare-estimate-loading-fixtures.ts
- playwright.config.ts
- next.config.ts
- scripts/check-performance-budgets.mjs
- e2e/estimate-loading-performance.spec.ts
- e2e/route-transition-performance.spec.ts
- e2e/route-transition-performance-budgets.json
- tests/vitest/estimate-loading-instrumentation.test.ts
- new tests/vitest/estimate-loading-fixtures.test.ts
- new tests/vitest/estimate-loading-load-limit-smoke.test.ts
- new tests/vitest/canonical-performance-budget-source.test.ts
- new tests/vitest/bundle-performance-budget.test.ts

Contract:

- Keep executable fixture IDs small, large, and load-limit. The display label for large is representative.
- small is 10 areas/50 rows; large is 100 areas/500 rows. Both contain variants, canonical catalogue IDs, one valid assembly, one VE group, commercial fields, and safe image descriptors, with those invariants encoded in the manifest and asserted after seed.
- load-limit exactly matches current source load limits and is used for correctness/partial-state smoke only, not a percentile SLA.
- Each runtime-specific run manifest is created after its build and contains the completed build hash, run-scoped Wrangler persistence root, current migrations hash, fixture hash, authenticated storage-state path or preflighted local-auth contract, estimate routes, and runtime binding data. Its executable binding fields are exactly storageStatePath, wranglerPersistPath, and bindingsPersistPath. Both measured runtimes must read the seeded rows.
- For next-production only, after reading the installed Next 16 configuration guide, the runner sets ARCHESTIMATOR_LOCAL_NEXT_PRODUCTION_BINDINGS=1 on the loopback child process and passes bindingsPersistPath. next.config.ts treats that exact local-only flag as permission to initialize OpenNext local bindings in next start, always uses local wrangler.next-dev.jsonc with the declared persistence path, and rejects remote bindings or a non-loopback base URL. A seeded-row preflight must pass before sampling. If the installed Next/OpenNext versions cannot provide this binding, UNIT-001 fails; next dev may not be relabeled as production.
- The preparer supports a default performance profile and an explicit client-feedback profile used by UNIT-006; each profile declares and verifies its feature invariants rather than only row counts.
- playwright.config.ts honors explicit run-manifest overrides for Wrangler persistence and authenticated storage state instead of replacing them with its port-derived defaults.
- Add a supported --run-manifest argument and a supported --baseline argument. Reject unknown/missing modes, fixture mismatch, stale baseline, wrong build/fixture/runtime fingerprint, and a shell/skeleton that satisfies the selector before a real row is editable.
- Add an authenticated row-interaction cell that measures optimistic estimate-row edit feedback separately from navigation. Run two uncounted warmups before each warm cell, retain every attempted sample, require at least the existing minimum valid sample count, and record p50/p95/max. Any invalid/timeout/missing stage fails the receipt.
- Separate contractFailures from budgetFailures and make artifact PASS require both arrays to be empty. Each fail-closed budgetAssertion records canonical source section/digest, cell, metric, threshold, actual p95 or max, and status.
- Replace the loose route-transition and single 350 KB bundle thresholds with fail-closed adapters to the canonical roadmap. The authenticated workshop transition and optimistic row edit enforce the Beta target. The bundle command emits separate assertions for workshop-shell main JS, workshop-shell critical-path JS, estimate-route total JS, global main chunk, and global total JS, enforcing each applicable Beta limit rather than one permissive aggregate. The external JSON and script may materialize values only when a contract test proves they match the roadmap digest; missing/unparseable/drifted budget source fails.
- Synthetic page.setContent Playwright tests remain instrumentation contracts only.

Focused proof:

    bun scripts/quality/run-evidence-command.ts --artifact artifacts/quality/client-feedback/unit-001-contract.json --evidence-id client-feedback-unit-001-contract -- bunx vitest run tests/vitest/estimate-loading-instrumentation.test.ts tests/vitest/estimate-loading-fixtures.test.ts tests/vitest/estimate-loading-load-limit-smoke.test.ts tests/vitest/canonical-performance-budget-source.test.ts tests/vitest/bundle-performance-budget.test.ts --maxWorkers=1
    Assert-NativePass 'UNIT-001 contract'
    bun run build
    Assert-NativePass 'Next production build'
    bun run scripts/prepare-estimate-loading-fixtures.ts --runtime next-production --output artifacts/quality/client-feedback/performance-run-next.json
    Assert-NativePass 'Next run manifest and fixture preparation'
    bun run scripts/measure-estimate-loading.ts --run-manifest artifacts/quality/client-feedback/performance-run-next.json --runtime next-production --modes hard-refresh,no-hover,hover-prefetch,row-interaction --fixtures small,large --output artifacts/quality/client-feedback/performance-baseline-next.json
    $nextBaselineExit = $LASTEXITCODE
    Assert-BaselineReceipt 'Next red baseline' 'artifacts/quality/client-feedback/performance-baseline-next.json' $nextBaselineExit
    bun run cf:build
    Assert-NativePass 'OpenNext build'
    bun run scripts/prepare-estimate-loading-fixtures.ts --runtime opennext-preview --output artifacts/quality/client-feedback/performance-run-opennext.json
    Assert-NativePass 'OpenNext run manifest and fixture preparation'
    bun run scripts/measure-estimate-loading.ts --run-manifest artifacts/quality/client-feedback/performance-run-opennext.json --runtime opennext-preview --modes hard-refresh,no-hover,hover-prefetch,row-interaction --fixtures small,large --output artifacts/quality/client-feedback/performance-baseline-opennext.json
    $openNextBaselineExit = $LASTEXITCODE
    Assert-BaselineReceipt 'OpenNext red baseline' 'artifacts/quality/client-feedback/performance-baseline-opennext.json' $openNextBaselineExit

Acceptance: commands are executable after this unit; both runtimes read the exact seed; the baseline is expected to remain FAIL if a canonical budget or contract fails; failures are preserved rather than normalized away. Recovery removes only UNIT-001-owned additions or fixes forward in those paths.

### UNIT-002 - Canonical catalogue identity and Direct Category

- Depends on: none
- Capability owner: catalogue/data-integrity engineer
- Prohibited path: src/components/workshop/EstimateSheetContent.tsx
- Evidence: EVID-002

Owned paths:

- src/components/workshop/component-catalogue-combobox-options.ts
- src/components/workshop/estimate-sheet/rows/cells.tsx
- src/components/workshop/estimate-sheet/rows/editable-row-model.ts
- src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts
- src/components/workshop/component-library-manager/AddComponentModal.tsx
- src/lib/estimates/express-promotion-actions.ts
- src/lib/component-library/project-component-projection.ts only if characterization proves projection divergence
- tests/vitest/component-library-catalogue-governance.test.ts
- tests/vitest/project-component-projection.test.ts
- tests/vitest/express-promotion-action.test.ts
- tests/vitest/library-add-component-modal-a11y.test.tsx
- new tests/vitest/estimate-sheet-catalogue-category.test.tsx

Contract:

- Add explicit option provenance so a canonical entity UUID is distinguishable from brand:<slug>, supplier:<slug>, and other fallback/display IDs.
- Selecting or creating a canonical option commits label plus UUID atomically. Input/filter typing does not persist; clear writes label and ID null together. Map createComponentCatalogueEntity(...).entity into the combobox result rather than assuming the action signature matches.
- Preserve brandId/supplierId in initializers, partial merges, tree materialization, flattened rows, unrelated edits, optimistic state, server persistence, and reload.
- Characterize existing workspace-scoped rename/merge rewrites and PROJECT cache invalidation first. Active/merged IDs display the current canonical/survivor name. Archived non-merged or label-only rows retain the sanitized stored label. Never resolve across workspaces. Do not add a projection join if rewrite plus convergence already satisfies this contract.
- Keep onMoveComponentCategory and ComponentFolderMoveOutcome backward-compatible for library callers. For project scope, adapt the existing promise-returning promotion mutation with libraryFolderId.
- Extend promotion result/replay to expose authoritative libraryFolderId. Same mutation identity and same folder replays success; the same identity with a different folder returns a typed conflict and the original authoritative folder.
- Permission denial, duplicate normalized create, stale revision, retry, and concurrent/latest-wins outcomes remain truthful.

Focused proof:

    bun scripts/quality/run-evidence-command.ts --artifact artifacts/quality/client-feedback/catalogue-category.json --evidence-id client-feedback-catalogue-category -- bunx vitest run tests/vitest/component-library-catalogue-governance.test.ts tests/vitest/project-component-projection.test.ts tests/vitest/express-promotion-action.test.ts tests/vitest/library-add-component-modal-a11y.test.tsx tests/vitest/estimate-sheet-catalogue-category.test.tsx --maxWorkers=1
    Assert-NativePass 'UNIT-002 catalogue/category proof'

Acceptance: no fallback ID reaches brand_id/supplier_id; create/select/clear/unrelated-edit/reload is atomic; PROJECT and library management converge; linked move and project promotion have typed, folder-bound recovery. If the optional projection path activates, the handoff records the failing test and why existing rewrite convergence was insufficient.

### UNIT-003 - Accessory presentation and VE comparison

- Depends on: none
- Capability owner: estimate-domain/UI engineer
- Prohibited path: src/components/workshop/EstimateSheetContent.tsx
- Evidence: EVID-003

Owned paths:

- src/lib/estimates/effective-contribution.ts only for a proved invariant defect
- src/lib/estimates/assembly-graph.ts only for a proved invariant defect
- src/components/workshop/estimate-sheet/EstimateContributionBulkToolbar.tsx
- src/components/workshop/estimate-sheet/rows/row-table.tsx
- src/components/workshop/estimate-sheet/rows/branch.tsx
- new src/components/workshop/estimate-sheet/EstimateAssemblyValueEngineeringSummary.tsx
- tests/vitest/effective-contribution.test.ts
- tests/vitest/material-assembly-graph.test.ts
- tests/vitest/material-assembly-quantity-rule.test.ts
- tests/vitest/estimate-contribution-controls.test.tsx
- tests/vitest/estimate-contribution-bulk-toolbar.test.tsx
- tests/vitest/estimate-tree-live-subtotals.test.ts
- tests/property/material-assembly-quantity-rule.property.test.ts
- new tests/vitest/estimate-assembly-presentation.test.tsx
- new tests/vitest/estimate-value-engineering-summary.test.tsx

Contract:

- Do not create a parallel contribution calculator, tree-wide projection API, or proposal-export rewrite.
- Derive accessory parent/child labels, effective quantity, required/optional inclusion, and presentation rollup from existing assembly graph plus resolveEffectiveContribution.
- Show an assembly presentation total without adding it again to canonical row/area/project/proposal totals.
- Show VE groups/options with selected state, effective option cost, and delta. Use existing select/toggle mutations; do not add a second selection store.
- Preserve stable keys, virtualization, keyboard operation, accessible names/states, compact/touch layout, partial-load truth, and realtime convergence.
- Property cases cover reordering, optional exclusion, one selected alternative, nested areas, invalid parent, cycle rejection, and exactly-once totals. Tree and proposal adapters must agree on the same seeded contribution state.

Focused proof:

    bun scripts/quality/run-evidence-command.ts --artifact artifacts/quality/client-feedback/contribution-ve.json --evidence-id client-feedback-contribution-ve -- bunx vitest run tests/vitest/effective-contribution.test.ts tests/vitest/material-assembly-graph.test.ts tests/vitest/material-assembly-quantity-rule.test.ts tests/vitest/estimate-contribution-controls.test.tsx tests/vitest/estimate-contribution-bulk-toolbar.test.tsx tests/vitest/estimate-tree-live-subtotals.test.ts tests/property/material-assembly-quantity-rule.property.test.ts tests/vitest/estimate-assembly-presentation.test.tsx tests/vitest/estimate-value-engineering-summary.test.tsx --maxWorkers=1
    Assert-NativePass 'UNIT-003 assembly/VE proof'

Acceptance: the relationship and VE comparison are discoverable and operable; each contribution is counted once; area/project/proposal parity and partial-load state pass. Any arithmetic edit requires a failing invariant test and explicit source-impact warning in the handoff.

### UNIT-004 - Single estimate-editor integration and resolved-feature characterization

- Depends on: UNIT-002, UNIT-003
- Capability owner: integration engineer
- Sole product writer: src/components/workshop/EstimateSheetContent.tsx
- Evidence: EVID-004

Owned paths:

- src/components/workshop/EstimateSheetContent.tsx
- new tests/vitest/estimate-sheet-client-feedback-integration.test.tsx
- tests/vitest/estimate-sheet-library-insert.test.tsx
- tests/vitest/estimate-route-cache-finalization.test.tsx
- tests/vitest/estimate-row-table-virtualization.test.tsx
- tests/vitest/estimate-tree-live-subtotals.test.ts
- tests/vitest/commercial-column.test.tsx
- tests/vitest/commercial-terms-domain.test.ts
- tests/vitest/commercial-remarks-projection.test.ts
- new e2e/client-feedback-resolution.spec.ts
- new e2e/client-feedback-critical-matrix.spec.ts
- new e2e/support/browser-zoom-extension/manifest.json
- new e2e/support/browser-zoom-extension/service-worker.js

Contract:

- Consume canonical option provenance and preserve UUIDs in Page 001 options/callbacks.
- Pass canManageCatalogue and the existing category move/promotion adapters into AddComponentModal without forking modal state.
- Converge the exact affected TanStack Query caches after catalogue create/rename, promotion, folder move, and component update; avoid broad router refresh unless a characterized cache gap requires it.
- Wire the accessory/VE presentation into the editor without moving calculation ownership into this client component.
- Characterize and preserve font scale, variant selection, failed material draft recovery, both image-upload entry points, area subtotals, and commercial/VAT fields.
- Author the complete client-feedback journey and focused browser/device matrix specs against the accepted integration now, so all tracked E2E files are part of the source candidate before final performance evidence. The Chromium readability case launches a persistent bundled-Chromium context with the minimal test-only extension, calls chrome.tabs.setZoom at 1.0, 1.1, and 2.0, reads each factor back with chrome.tabs.getZoom, and fails if actual tab zoom is unavailable; CSS zoom, page-scale emulation, and viewport substitution are not acceptance evidence. UNIT-006 owns execution and evidence only.
- This unit owns no open-ended repair. A failure in UNIT-002 or UNIT-003 behavior reopens that owner; an integration-only failure remains here.

Focused proof:

    bun scripts/quality/run-evidence-command.ts --artifact artifacts/quality/client-feedback/integration.json --evidence-id client-feedback-integration -- bunx vitest run tests/vitest/estimate-sheet-client-feedback-integration.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-route-cache-finalization.test.tsx tests/vitest/estimate-row-table-virtualization.test.tsx tests/vitest/estimate-tree-live-subtotals.test.ts tests/vitest/commercial-column.test.tsx tests/vitest/commercial-terms-domain.test.ts tests/vitest/commercial-remarks-projection.test.ts --maxWorkers=1
    Assert-NativePass 'UNIT-004 integration proof'

Acceptance: one Page 001 flow exposes all remaining functionality and preserves all already implemented behavior with zero React act/key warnings. UNIT-004 releases EstimateSheetContent.tsx only after its evidence receipt is final.

### UNIT-005 - Measured optimization and final performance evidence

- Depends on: UNIT-001, UNIT-004
- Capability owner: performance engineer
- Heavy-command policy: serial
- Evidence: EVID-005

Bounded optional write set, activated only by the baseline and recorded before edit:

- src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx
- src/components/workshop/EstimateWorkspaceClient.tsx
- src/components/workshop/EstimateSheetContent.tsx after UNIT-004 releases ownership
- src/hooks/use-estimate-query.ts
- src/lib/repositories/workspace-repository.ts
- scripts/measure-estimate-loading.ts
- tests/vitest/estimate-loading-instrumentation.test.ts
- tests/vitest/estimate-loading-fixtures.test.ts
- tests/vitest/estimate-loading-load-limit-smoke.test.ts
- next.config.ts after UNIT-001 releases ownership and only after reading the matching Next 16 guide in node_modules/next/dist/docs

Decision order:

1. Identify the largest app-owned stage in the retained baseline.
2. Remove duplicate/serial reads, unnecessary blocking client work, or accidental initial-bundle imports using the nearest existing cache/query/dynamic boundary.
3. Use EXPLAIN QUERY PLAN before any index. Do not add a speculative D1 index or dependency.
4. Preserve denied/missing/load-limit/auth behavior and feature receipts.
5. After the last UNIT-005 product edit, rerun the exact UNIT-004 integration set and bind a fresh receipt to the cumulative candidate. A failure reopens the responsible feature owner before measurement.
6. Build each runtime first, create its runtime-specific run manifest from the completed build, then measure the final integrated candidate with identical fixtures, modes, warmup/sample policy, browser/runtime settings, and canonical budget source.

Final proof:

    bun scripts/quality/run-evidence-command.ts --artifact artifacts/quality/client-feedback/integration-final.json --evidence-id client-feedback-integration-final -- bunx vitest run tests/vitest/estimate-sheet-client-feedback-integration.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-route-cache-finalization.test.tsx tests/vitest/estimate-row-table-virtualization.test.tsx tests/vitest/estimate-tree-live-subtotals.test.ts tests/vitest/commercial-column.test.tsx tests/vitest/commercial-terms-domain.test.ts tests/vitest/commercial-remarks-projection.test.ts --maxWorkers=1
    Assert-NativePass 'Final integration refresh'
    bun run build
    Assert-NativePass 'Final Next production build'
    bun run scripts/prepare-estimate-loading-fixtures.ts --runtime next-production --output artifacts/quality/client-feedback/performance-final-run-next.json
    Assert-NativePass 'Final Next run manifest and fixture preparation'
    bun run scripts/measure-estimate-loading.ts --run-manifest artifacts/quality/client-feedback/performance-final-run-next.json --runtime next-production --modes hard-refresh,no-hover,hover-prefetch,row-interaction --fixtures small,large --baseline artifacts/quality/client-feedback/performance-baseline-next.json --output artifacts/quality/client-feedback/performance-final-next.json
    Assert-NativePass 'Final Next performance gates'
    $performanceRunNext = Get-Content -LiteralPath artifacts/quality/client-feedback/performance-final-run-next.json -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
    $env:PLAYWRIGHT_STORAGE_STATE = $performanceRunNext.storageStatePath
    $env:ARCHESTIMATOR_E2E_WRANGLER_PERSIST_PATH = $performanceRunNext.wranglerPersistPath
    $env:ARCHESTIMATOR_DEV_BINDINGS_PERSIST_PATH = $performanceRunNext.bindingsPersistPath
    try {
      bun scripts/quality/run-evidence-command.ts --artifact artifacts/quality/client-feedback/route-transition-final.json --evidence-id client-feedback-route-transition-final -- bun run test:e2e:perf
      Assert-NativePass 'Authenticated route-transition gates'
    } finally {
      Remove-Item Env:PLAYWRIGHT_STORAGE_STATE -ErrorAction SilentlyContinue
      Remove-Item Env:ARCHESTIMATOR_E2E_WRANGLER_PERSIST_PATH -ErrorAction SilentlyContinue
      Remove-Item Env:ARCHESTIMATOR_DEV_BINDINGS_PERSIST_PATH -ErrorAction SilentlyContinue
    }
    bun run quality:bundle-budget
    Assert-NativePass 'Canonical bundle gates'
    bun run cf:build
    Assert-NativePass 'Final OpenNext build'
    bun run scripts/prepare-estimate-loading-fixtures.ts --runtime opennext-preview --output artifacts/quality/client-feedback/performance-final-run-opennext.json
    Assert-NativePass 'Final OpenNext run manifest and fixture preparation'
    bun run scripts/measure-estimate-loading.ts --run-manifest artifacts/quality/client-feedback/performance-final-run-opennext.json --runtime opennext-preview --modes hard-refresh,no-hover,hover-prefetch,row-interaction --fixtures small,large --baseline artifacts/quality/client-feedback/performance-baseline-opennext.json --output artifacts/quality/client-feedback/performance-final-opennext.json
    Assert-NativePass 'Final OpenNext performance gates'
    bun scripts/quality/run-evidence-command.ts --artifact artifacts/quality/client-feedback/performance-final-contract.json --evidence-id client-feedback-performance-final -- bunx vitest run tests/vitest/estimate-loading-instrumentation.test.ts tests/vitest/estimate-loading-load-limit-smoke.test.ts --maxWorkers=1
    Assert-NativePass 'Final performance contract'

Acceptance: the final integration receipt passes after optimization; every canonical workshop transition, optimistic row-interaction, bundle, hard-refresh p95, and single-sample max gate passes; no invalid/failed sample is discarded; hard-refresh p50/p95/max and stage attribution are present; there is no unexplained app-owned stall; and the load-limit smoke remains correct. A failed feature receipt reopens its owner before another final measurement.

### UNIT-006 - Complete client journey and focused browser/device matrix

- Depends on: UNIT-005
- Capability owner: acceptance-test engineer
- Product-code writes: none
- Evidence: EVID-006

Owned paths:

- none; this unit writes evidence artifacts only and may not mutate tracked or untracked source-candidate files

Complete Chromium journey:

1. Open the seeded authenticated estimate and prove readable Page 001 text, text-spacing resilience, focus, and no critical overflow under actual Chromium tab zoom at 100%, 110%, and 200%, with extension API readback of each factor. Separately retain compact/touch viewport reflow coverage; it cannot substitute for browser zoom.
2. Create V-1/V-2/V-3, select V-2, reload, and verify cost/totals/export.
3. Create a brand and supplier, verify the same UUID/name in Page 001, PROJECT, and library management, then rename/merge and re-read PROJECT.
4. Edit an unrelated field and reload to prove catalogue IDs survive.
5. Add a material; inject a stale/error attempt; retry/delete as appropriate; reload without a ghost or lost row.
6. Upload an image through Page 001 and Edit Component; verify private readback; exercise abort/retry/invalid/denied cases in focused tests.
7. Move a linked component category; promote a project component into a chosen category; replay same and mismatched folders.
8. Attach required and optional accessories, verify relationship/effective quantities, toggle optional state, and prove exactly-once area/project/proposal totals.
9. Compare and select a VE option; verify immediate and reloaded totals plus export.
10. Verify main-area subtotal and truthful partial-load presentation.
11. Enter remarks, quotation state/link, VAT inclusive and VAT exclusive rows; reload and verify proposal/export.
12. Assert no browser/React warning, error, skip, flake, orphan upload, or leaked fixture state.

Matrix:

- Full journey: chromium only.
- Focused catalogue selection/category/VE/keyboard cases: firefox and webkit.
- Focused readability/reflow/touch/category/VE cases: iphone-se and pixel-8-chrome.
- Performance sampling remains Chromium-controlled and is not compared across engines.

Proof:

    bun run scripts/prepare-estimate-loading-fixtures.ts --profile client-feedback --runtime next-production --output artifacts/quality/client-feedback/journey-run.json
    Assert-NativePass 'Client-feedback journey fixture preparation'
    $journeyRun = Get-Content -LiteralPath artifacts/quality/client-feedback/journey-run.json -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
    $env:PLAYWRIGHT_STORAGE_STATE = $journeyRun.storageStatePath
    $env:ARCHESTIMATOR_E2E_WRANGLER_PERSIST_PATH = $journeyRun.wranglerPersistPath
    $env:ARCHESTIMATOR_DEV_BINDINGS_PERSIST_PATH = $journeyRun.bindingsPersistPath
    try {
      bun scripts/quality/run-evidence-command.ts --artifact artifacts/quality/client-feedback/journey-chromium.json --evidence-id client-feedback-journey-chromium -- bunx playwright test e2e/client-feedback-resolution.spec.ts --project=chromium
      Assert-NativePass 'Chromium client-feedback journey including actual tab zoom'
      $env:ARCHESTIMATOR_E2E_LIBRARY_BROWSER_MATRIX = '1'
      bun scripts/quality/run-evidence-command.ts --artifact artifacts/quality/client-feedback/journey-matrix.json --evidence-id client-feedback-journey-matrix -- bunx playwright test e2e/client-feedback-critical-matrix.spec.ts --project=firefox --project=webkit --project=iphone-se --project=pixel-8-chrome
      Assert-NativePass 'Alternate-engine and compact/touch matrix'
    } finally {
      Remove-Item Env:PLAYWRIGHT_STORAGE_STATE -ErrorAction SilentlyContinue
      Remove-Item Env:ARCHESTIMATOR_E2E_WRANGLER_PERSIST_PATH -ErrorAction SilentlyContinue
      Remove-Item Env:ARCHESTIMATOR_DEV_BINDINGS_PERSIST_PATH -ErrorAction SilentlyContinue
      Remove-Item Env:ARCHESTIMATOR_E2E_LIBRARY_BROWSER_MATRIX -ErrorAction SilentlyContinue
    }

Acceptance: both receipts pass with retries disabled and zero skips/flakes/warnings. A product failure reopens UNIT-002, UNIT-003, UNIT-004, or UNIT-005 with its exact failing evidence; UNIT-006 does not seize product ownership.

### UNIT-007 - Independent reviews, Q2 aggregate, reconciliation, and closeout

- Depends on: UNIT-006
- Capability owner: lead/verifier
- Source-candidate writes: none; the plan pack is immutable after UNIT-006 freezes the candidate
- Evidence: EVID-007

Sequence:

1. Confirm every UNIT-001 through UNIT-006 receipt binds the declared owned or cumulative scope. EVID-005 and EVID-006 must bind the same final cumulative source candidate; baseline performance receipts may bind the pre-change candidate but must match fixture/settings provenance. Materialize every source-package and implementation path as artifacts/quality/client-feedback/task-scope.txt. From this point onward, no tracked or untracked source-candidate file, including this plan pack, may change.
2. Run GitNexus detect_changes against main. If the degraded index cannot do so, record the failure and use the materialized task-scoped git diff, current-source callers, focused tests, and Q2 classification as fallback.
3. Reconcile REQ-001 through REQ-013 and AC-001 through AC-013 into a machine-readable reconciliation artifact. Run tracked/untracked whitespace, placeholder, and plan-pack validation before review; any failure reopens its owner.
4. Materialize the complete candidate implementation-author list from accepted handoffs as CANDIDATE_AUTHOR_IDS. Obtain the Q2-required pre-aggregate reviews from two distinct reviewers absent from that list: quality and security/data. Each review artifact carries its own reviewer_id, exact candidate hash, inspected paths, findings, and disposition; reviewer IDs are never passed as candidate author IDs.
5. Run the one canonical Q2 aggregate with those reviews; do not pre-run or duplicate its heavy suite.
6. Have the same two independent reviewer capabilities inspect the resulting canonical manifest, command log, skip/flake/warning counts, coverage/mutation outputs, security findings, and candidate binding. They write distinct final addenda and must not approve evidence they did not inspect.
7. Validate the final review addenda against the canonical Q2 candidate, then validate the canonical manifest and command log without rerunning the heavy suite. Rerun the read-only scope checks.
8. Write artifacts/quality/client-feedback/closeout.json with the immutable source-candidate hash, Q2 manifest/report and review hashes, reconciliation hash, plan-pack validator result, and terminal tuple COMPLETE / ACHIEVED / ARCHIVE_READY. Because artifacts/ is gitignored, prove with quality:candidate --expected that this receipt did not change the source candidate. The receipt, not a post-review plan mutation, is execution-state authority.

Exact aggregate:

    function Invoke-TaskScopeChecks([string[]]$Paths) {
      if ($Paths.Count -eq 0) { throw 'Task scope is empty.' }
      git -c core.safecrlf=false diff --check -- $Paths
      Assert-NativePass 'Tracked task-scope whitespace check'
      $untrackedTaskPaths = @(git ls-files --others --exclude-standard -- $Paths)
      Assert-NativePass 'Untracked task-scope inventory'
      $untrackedWhitespace = @()
      foreach ($path in $untrackedTaskPaths) {
        $checkOutput = @(git -c core.safecrlf=false diff --no-index --check -- NUL $path 2>&1)
        $checkExit = $LASTEXITCODE
        if ($checkExit -notin @(0, 1)) { throw "Untracked whitespace check failed to execute for $path with exit $checkExit." }
        if ($checkOutput.Count -gt 0) { $untrackedWhitespace += $checkOutput }
      }
      if ($untrackedWhitespace.Count -gt 0) { $untrackedWhitespace; throw 'Untracked task files contain whitespace errors.' }
      $placeholderHits = @(rg -n -- '\b(T[D]O|T[B]D|PLACEHOLD[E]R)\b|__[A-Z0-9_]+__' $Paths 2>&1)
      $placeholderExit = $LASTEXITCODE
      if ($placeholderExit -notin @(0, 1)) { $placeholderHits; throw "Placeholder scan failed with exit $placeholderExit." }
      if ($placeholderExit -eq 0) { $placeholderHits; throw 'Task scope contains unresolved placeholders.' }
    }
    $taskPaths = @(Get-Content -LiteralPath artifacts/quality/client-feedback/task-scope.txt -ErrorAction Stop | Where-Object { $_.Trim() })
    Invoke-TaskScopeChecks $taskPaths
    bun scripts/quality/run-evidence-command.ts --artifact artifacts/quality/client-feedback/plan-pack-validation.json --evidence-id client-feedback-plan-pack-validation -- node scripts/validate-plan-pack.mjs .ai/03_plans/2026-08-01/Client-Feedback-Full-Resolution
    Assert-NativePass 'Frozen plan-pack validation'
    $candidateAuthorIds = @($env:CANDIDATE_AUTHOR_IDS -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ } | Select-Object -Unique)
    if ($candidateAuthorIds.Count -eq 0) { throw 'CANDIDATE_AUTHOR_IDS must contain every implementation author from accepted unit handoffs.' }
    bun run lint:design-system
    Assert-NativePass 'Authenticated design-system lint'
    bun run quality:critical -- --base 3e9a2d1e0bc529ac89d98d16233c603886b7b038 --reviews artifacts/quality/client-feedback/reviews/quality.json,artifacts/quality/client-feedback/reviews/security-data.json --author-ids "$env:CANDIDATE_AUTHOR_IDS"
    Assert-NativePass 'Canonical Q2 aggregate'
    $qualityManifest = Get-Content -LiteralPath artifacts/quality/manifest.json -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
    $qualityCandidate = $qualityManifest.data.candidate.sha256
    if ($qualityCandidate -notmatch '^[a-f0-9]{64}$') { throw 'Canonical Q2 manifest candidate hash is missing or malformed.' }
    bun run quality:reviews -- --base 3e9a2d1e0bc529ac89d98d16233c603886b7b038 --base-sha 3e9a2d1e0bc529ac89d98d16233c603886b7b038 --expected $qualityCandidate --reviews artifacts/quality/client-feedback/reviews/quality-final.json,artifacts/quality/client-feedback/reviews/security-data-final.json --author-ids "$env:CANDIDATE_AUTHOR_IDS" --output artifacts/quality/client-feedback/final-reviews.json
    Assert-NativePass 'Post-aggregate independent review validation'
    bun run quality:report -- --manifest artifacts/quality/manifest.json --require-command-log --output artifacts/quality/client-feedback/q2-final-report.json
    Assert-NativePass 'Canonical Q2 report validation'
    Invoke-TaskScopeChecks $taskPaths
    $closeout = [ordered]@{
      schemaVersion = 'client-feedback-closeout.v1'
      status = 'PASS'
      sourceCandidateSha256 = $qualityCandidate
      candidateAuthorIds = $candidateAuthorIds
      q2ManifestSha256 = (Get-FileHash -Algorithm SHA256 artifacts/quality/manifest.json).Hash.ToLowerInvariant()
      q2ReportSha256 = (Get-FileHash -Algorithm SHA256 artifacts/quality/client-feedback/q2-final-report.json).Hash.ToLowerInvariant()
      finalReviewsSha256 = (Get-FileHash -Algorithm SHA256 artifacts/quality/client-feedback/final-reviews.json).Hash.ToLowerInvariant()
      qualityReviewSha256 = (Get-FileHash -Algorithm SHA256 artifacts/quality/client-feedback/reviews/quality.json).Hash.ToLowerInvariant()
      securityDataReviewSha256 = (Get-FileHash -Algorithm SHA256 artifacts/quality/client-feedback/reviews/security-data.json).Hash.ToLowerInvariant()
      qualityFinalReviewSha256 = (Get-FileHash -Algorithm SHA256 artifacts/quality/client-feedback/reviews/quality-final.json).Hash.ToLowerInvariant()
      securityDataFinalReviewSha256 = (Get-FileHash -Algorithm SHA256 artifacts/quality/client-feedback/reviews/security-data-final.json).Hash.ToLowerInvariant()
      reconciliationSha256 = (Get-FileHash -Algorithm SHA256 artifacts/quality/client-feedback/reconciliation.json).Hash.ToLowerInvariant()
      planPackSha256 = (Get-FileHash -Algorithm SHA256 .ai/03_plans/2026-08-01/Client-Feedback-Full-Resolution/plan-pack.json).Hash.ToLowerInvariant()
      planPackValidationSha256 = (Get-FileHash -Algorithm SHA256 artifacts/quality/client-feedback/plan-pack-validation.json).Hash.ToLowerInvariant()
      terminal = [ordered]@{ implementation_status = 'COMPLETE'; terminal_status = 'ACHIEVED'; plan_lifecycle = 'ARCHIVE_READY' }
    }
    $closeoutJson = $closeout | ConvertTo-Json -Depth 8
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText([System.IO.Path]::GetFullPath('artifacts/quality/client-feedback/closeout.json'), $closeoutJson, $utf8NoBom)
    bun run quality:candidate -- --base 3e9a2d1e0bc529ac89d98d16233c603886b7b038 --base-sha 3e9a2d1e0bc529ac89d98d16233c603886b7b038 --classification artifacts/quality/classification.json --expected $qualityCandidate --output artifacts/quality/client-feedback/candidate-after-closeout.json
    Assert-NativePass 'Post-closeout candidate immutability'

Acceptance: canonical artifacts/quality/manifest.json is PASS for Q2; both pre-aggregate reviews and both post-aggregate final addenda pass with distinct non-implementing authors and exact candidate binding; task-scoped diff contains only expected changes; tracked and untracked task files pass whitespace checks; inherited dirty paths are unchanged; no placeholder or stale hash remains; quality:candidate proves the closeout receipt did not change the candidate; and the Q2 manifest plus closeout receipt are final authority. UNIT-007 performs no generic cleanup or plan mutation after candidate freeze.

## 7. Evidence and gates

All focused commands produce receipts with scripts/quality/run-evidence-command.ts or the canonical quality runner. Planned manifest evidence points to this canonical artifact until implementation materializes the output.

| Evidence | Producer | Materialized output |
| --- | --- | --- |
| EVID-001 | UNIT-001 | unit-001-contract.json, performance-baseline-next.json, performance-baseline-opennext.json, performance-run-next.json, performance-run-opennext.json |
| EVID-002 | UNIT-002 | catalogue-category.json |
| EVID-003 | UNIT-003 | contribution-ve.json |
| EVID-004 | UNIT-004 | integration.json |
| EVID-005 | UNIT-005 | integration-final.json, performance-final-run-next.json, performance-final-run-opennext.json, performance-final-next.json, performance-final-opennext.json, route-transition-final.json, canonical bundle-budget.json, performance-final-contract.json |
| EVID-006 | UNIT-006 | journey-chromium.json, journey-matrix.json plus Playwright traces/screenshots on failure |
| EVID-007 | UNIT-007 | canonical artifacts/quality/manifest.json, pre-aggregate quality and security/data reviews, quality-final.json, security-data-final.json, final-reviews.json, q2-final-report.json, reconciliation.json, task-scope.txt, plan-pack validation receipt, closeout.json, candidate-after-closeout.json |

| Test group | Criteria |
| --- | --- |
| TEST-001 performance contract/baseline/final | AC-002 |
| TEST-002 catalogue identity/category | AC-004, AC-007, AC-008 |
| TEST-003 assembly/VE/totals | AC-009, AC-010, AC-011 |
| TEST-004 editor integration/resolved features | AC-001, AC-003, AC-004 through AC-012 |
| TEST-005 full journey and focused matrix | AC-001 through AC-013 |
| TEST-006 Q2 aggregate/reviews/reconciliation | AC-001 through AC-013 |

| Gate | Pass condition |
| --- | --- |
| GATE-FEATURES | EVID-002, EVID-003, and EVID-004 pass; EVID-005 refreshes the integration receipt after performance edits; EVID-006 passes the final journey with zero warning. |
| GATE-PERFORMANCE | EVID-001 and EVID-005 satisfy the contract and canonical budget source. |
| GATE-CLIENT-JOURNEY | EVID-006 passes the declared full/subset matrix with zero skip/flake/warning. |
| GATE-Q2 | EVID-007 canonical Q2 manifest, both pre-aggregate reviews, and both post-aggregate final addenda pass at the immutable candidate. |
| GATE-CLOSEOUT | All prior gates pass; task scope is cleanly attributed; the frozen plan pack validates; closeout.json is complete; and post-closeout candidate reconstruction matches the reviewed hash. |

Client-specific adversarial cases that must remain represented:

- fallback option ID, duplicate normalized create, cross-workspace UUID, archived and merged catalogue entities;
- unrelated edit after selection, stale revision, offline retry, rapid latest-wins selection, cache invalidation;
- same promotion replay, mismatched-folder replay, permission denial, deleted/invalid folder;
- required/optional accessory, alternative selection, invalid parent, cycle, partial tree, concurrent contribution revision;
- failed material insert recovery, image abort/wrong MIME/oversize/denial/private readback;
- shell falsely marked interactive, first-sample contamination, stale baseline, wrong fixture/runtime/build, missing stage, retained timeout;
- VAT inclusive/exclusive, quotation validation, remarks, reload, proposal/export parity.

## 8. Scope, freshness, recovery, and resume

The baseline task-owned product scope is the union of exact paths named by UNIT-001 through UNIT-005. UNIT-004 authors all tracked E2E specs/helpers before UNIT-005 freezes the cumulative candidate; UNIT-006 and UNIT-007 write gitignored evidence only. Source-package scope also includes this immutable plan pack and .ai/01_roadmap/27-performance-budget-and-regression-gates.md. At baseline the product paths have an empty task-scoped status/diff hash. Unrelated worktree changes are inherited, excluded from task receipts, and must remain byte-for-byte untouched.

Before each evidence run, hash:

- full Git revision and normalized task-scoped status/diff;
- package.json, bun.lock, wrangler.jsonc, migrations, quality profiles, canonical performance budget, and relevant Next config;
- fixture/run manifest and build output identity;
- browser/runtime/tool versions and measurement settings.

EVID-001 through EVID-004 may bind their immutable owned scopes while those path hashes remain unchanged. EVID-005 through EVID-007 bind the cumulative final source candidate. UNIT-005 must refresh the integration receipt after its last product edit; UNIT-006 and UNIT-007 evidence-only writes do not change that source hash. The plan manifest retains its authored IMPLEMENTATION_READY / NOT_STARTED state; actual terminal execution state lives in the hash-bound closeout receipt to avoid self-invalidating the whole-worktree Q2 candidate. A change to an owned source, migration/config, canonical budget, quality policy, fixture, or evidence producer invalidates downstream receipts and resumes from the earliest affected unit. A failed review or journey returns to the named owner; it does not authorize broad cleanup.

Resume protocol:

1. Run bun run supermemory:ensure; degraded memory is non-blocking.
2. Read the current-state FAST PATH and inspect host memory plus git status.
3. Validate this pack.
4. Confirm baseline/task-scope fingerprints and no ownership conflict.
5. Start next_unit if its dependencies pass; otherwise resume the earliest invalidated owner.
6. Preserve machine-readable evidence, keep this authored manifest immutable, and advance actual execution state only through accepted unit receipts and the final closeout receipt.

The package remains IMPLEMENTATION_READY / NOT_STARTED. No client comment is newly claimed resolved by this planning improvement alone.
