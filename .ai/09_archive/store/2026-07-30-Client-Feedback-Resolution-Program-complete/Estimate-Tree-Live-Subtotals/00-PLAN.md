# Estimate Tree Live Subtotals — Canonical Execution Plan

## Status

CONDITIONALLY_READY / NOT_STARTED / NOT_EVALUATED / PLAN_ONLY / ACTIVE

- Package: PLAN-2026-07-28-estimate-tree-live-subtotals
- Quality profile: Q2_CRITICAL_CHANGE_GATE
- Baseline HEAD: 214fd2af3564c6c90d6bb46a7f2f7bd19faa811d
- Baseline observation: 2026-07-28, shared dirty worktree preserved
- Exact next unit: UNIT-001
- Ready slice: UNIT-001 only
- Dependency-bound units: UNIT-002 through UNIT-005 are PLANNED, not READY
- Migration posture: no tree migration is planned. Any discovered schema need must be justified against the existing editable-store bridge design and requires a pack refresh before a migration is allocated.

### Current-source refresh — 2026-07-30

Direct row totals, recursive node totals, and incremental ancestor propagation
already exist inside the Content-owned editable store. The missing behavior is
the immutable sibling bridge into Tree and the final contribution-aware oracle.
Tree production units remain dependency-bound on Variants, Commercial, and
Assemblies; no tree migration is needed.

## Task Contract

- Objective: show the live recursive subtotal for every Estimate Tree node, including the top-level main-area rollup, from the existing Content-owned editable-row totals without creating another calculator or lifting the full editable store.
- Result: EstimateSheetContent publishes immutable total snapshots keyed by estimateId plus tabId to a small client bridge; EstimateSheetTree subscribes to only its active scope and formats values with estimate/proposal metadata currency.
- Scope: the total bridge, Content publication, workspace currency plumbing, tree rendering and status semantics, focused integration/property/performance/browser evidence, and final parity with summary/export contribution semantics.
- Non-goals: no new tax, variant, optional-item, accessory, assembly, or export calculator; no server-formatted node.total authority; no whole-store lift; no D1 schema change; no new route, provider resource, upload path, feature flag, compatibility path, rollout phase, or hosted claim.
- Authority: AGENTS.md; current source; sanitized raw client input in Client-Feedback-Resolution-Program/evidence/client-feedback.md; the completed analyst attachment; the PP-D-R assignment and corrections; final Variants, Commercial, and Assemblies packs; BETA_QUALITY_ENGINEERING_PROTOCOL.md; VALIDATION_MATRIX.md; PERFORMANCE_LOADING_AND_MOUNT_PROTOCOL.md; and this plan.
- Owner: one implementation lead owns integration and the final evidence claim. One writer owns each path at a time. Independent reviewers are read-only.
- Stop condition: all requirements and acceptance criteria have fresh Q2 PASS evidence, final contribution semantics count every selected variant/option/accessory/tax exactly once, no partial or stale value is presented as final, and no required review or relevant suite remains missing.

## Authoritative Inputs

1. Sanitized raw client input:
   .ai/03_plans/2026-07-28/Client-Feedback-Resolution-Program/evidence/client-feedback.md
2. Completed analyst architecture attachment, used as analysis provenance rather than raw client feedback:
   C:/Users/phili/.codex/attachments/57fa19db-3389-45f8-9016-eae615c50ebe/pasted-text-1.txt
3. Client-Feedback-Resolution-Program:
   .ai/03_plans/2026-07-28/Client-Feedback-Resolution-Program/00-PLAN.md
4. Existing incident manifest shape:
   .ai/03_plans/2026-07-28/Estimate-Material-Insert-Autosave-Incident/plan-pack.json
5. Current source and the scoped shared-worktree diff observed at baseline HEAD.
6. Canonical planning policy, planning suite, execution directive, schema, BETA protocol, Validation Matrix, and performance protocol under .ai/00_system and .ai/08_prompts.
7. Canonical product performance budget:
   .ai/01_roadmap/27-performance-budget-and-regression-gates.md

## Current Architecture and Exact Anchors

Line anchors are current-source observations at the baseline and become stale if their files change.

### Sibling ownership is the root issue

- src/components/workshop/EstimateWorkspaceClient.tsx:209 renders EstimateSheetTree.
- src/components/workshop/EstimateWorkspaceClient.tsx:222 renders sibling EstimateSheetContent.
- src/components/workshop/EstimateWorkspaceClient.tsx:248 sends proposalExportMetadata only to Content; Tree receives neither canonical currency nor editable totals.
- src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx:174 resolves currency from estimate currency, then project currency, then the existing route fallback.
- src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx:224 passes proposal metadata into the workspace boundary.

### The correct calculator and incremental path already exist

- src/components/workshop/estimate-sheet/rows/editable-row-model.ts:391 computes one editable row total.
- src/components/workshop/estimate-sheet/rows/editable-row-model.ts:403 recursively computes the node-total map.
- src/components/workshop/estimate-sheet/rows/editable-row-store.ts:98 reduces top-level node totals to projectTotal.
- src/components/workshop/estimate-sheet/rows/editable-row-store.ts:172 applies an edited-row delta.
- src/components/workshop/estimate-sheet/rows/editable-row-store.ts:183 copy-on-writes the total Map only when the amount changes.
- src/components/workshop/estimate-sheet/rows/editable-row-store.ts:185 reads the row location from the existing tree index.
- src/components/workshop/estimate-sheet/rows/editable-row-store.ts:187 updates only the owning node and ancestors.
- src/lib/estimates/estimate-tree-index.ts:34 creates the existing index.
- src/lib/estimates/estimate-tree-index.ts:47 records the full ancestorNodeIds chain.
- src/components/workshop/estimate-sheet/rows/editable-row-store.ts:299 handles rejection.
- src/components/workshop/estimate-sheet/rows/editable-row-store.ts:306 distinguishes rollback from retained draft.
- src/components/workshop/estimate-sheet/rows/editable-row-store.ts:410 recalculates through the same existing calculator after tree replacement.
- src/components/workshop/estimate-sheet/rows/editable-row-store.ts:463 preserves protected optimistic drafts while syncing authoritative rows.

### Content owns the live state and completeness signals

- src/components/workshop/EstimateSheetContent.tsx:1308 creates the editable store.
- src/components/workshop/EstimateSheetContent.tsx:1319 synchronizes tree and authoritative rows into that store.
- src/components/workshop/EstimateSheetContent.tsx:1847 subscribes to nodeTotals and projectTotal for the center sheet.
- src/components/workshop/EstimateSheetContent.tsx:3608 preserves the explicit partial warning that loaded-data totals may be incomplete.
- src/components/workshop/EstimateSheetContent.tsx:3642 mounts the editable store provider.
- src/hooks/use-estimate-query.ts:79 defines the scope-aware estimate/tab area-tree query.
- src/hooks/use-estimate-query.ts:116 keeps initial data while refetching and exposes foreground/background query state.
- src/lib/estimates/estimate-tree-read-repository.ts:96 defines explicit node/row load-limit state.
- src/lib/estimates/estimate-tree-read-repository.ts:891 reports subtree completeness.
- src/lib/estimates/load-limits.ts:1 caps the current product at 1,500 nodes and 5,000 rows.

### Tree currently renders labels, not live totals

- src/components/workshop/EstimateSheetTree.tsx:76 defines props without a total snapshot or currency.
- src/components/workshop/EstimateSheetTree.tsx:381 owns its tree query lifecycle.
- src/components/workshop/EstimateSheetTree.tsx:1025 renders a node label with name/template/loading/error metadata but no subtotal.
- src/lib/estimates/types.ts:159 exposes server node.total as a formatted string.
- src/lib/estimates/estimate-tree-read-repository.ts:592 recursively maps server tree nodes.
- src/lib/estimates/estimate-tree-read-repository.ts:621 formats node.total with a PHP-oriented server path. That value is not the live tree authority.

### Current relevant diff

- The D1 product paths above had no scoped diff at observation time.
- The broader worktree contains unfamiliar edits and untracked dated packs/migrations; they remain untouched.
- Workshop-Readability-And-Accessibility plans later writes to EstimateSheetTree.tsx and EstimateSheetContent.tsx.
- Material-Image-Upload-Consistency plans later writes to EstimateSheetContent.tsx and editable-row-model.ts.
- Final implementation must serialize those overlapping writers, reread each shared file, and preserve their changes.
- GitNexus concept queries returned no usable flows because local FTS indexes were unavailable. Missing graph results are UNKNOWN risk, not LOW risk; implementation must run symbol impact when available or use current callers and focused tests as the documented degraded fallback.

## Scope

### Product paths

- New: src/components/workshop/estimate-sheet/live-total-snapshot-bridge.ts
- New: src/components/workshop/estimate-sheet/use-live-total-snapshot.ts
- Modify: src/components/workshop/EstimateWorkspaceClient.tsx
- Modify: src/components/workshop/EstimateSheetContent.tsx
- Modify: src/components/workshop/EstimateSheetTree.tsx
- Conditional, only after Money-Math ownership handoff: the existing shared currency formatter selected by the Money-Math pack; do not add a local formatter.

### Test and evidence paths

- New: tests/vitest/editable-row-live-total-bridge.test.ts
- New: tests/vitest/estimate-tree-live-subtotals.test.tsx
- New: tests/property/estimate-tree-live-subtotals.property.test.ts
- New: tests/vitest/perf/estimate-tree-live-subtotals.test.tsx
- New: e2e/estimate-sheet-live-subtotals.spec.ts
- Conditional focused updates:
  - tests/vitest/estimate-sheet-tree-dom.test.tsx
  - tests/vitest/estimate-tree-lazy-hydration-ui.test.tsx
  - tests/vitest/estimate-sheet-center-atomic-contracts.test.ts
  - tests/vitest/perf/estimate-sheet-render-baseline.test.tsx
  - tests/vitest/perf/estimate-sheet-memoization.test.tsx
  - e2e/estimate-sheet-mvp.spec.ts

### Resources

- Existing client memory only for the bridge.
- Existing ARCH_DB reads remain unchanged.
- No R2, Images, Queue, Durable Object, Email, Cron, new binding, or migration.
- No server endpoint and no external side effect.

## Requirements

| ID | Requirement | Decisive evidence |
| --- | --- | --- |
| DATA-001 | Publish one immutable snapshot per estimateId/tabId scope from the existing Content editable store. | Bridge contract, scope-switch, immutability, teardown, and cross-estimate isolation tests. |
| REQ-001 | Every tree node displays the existing recursive subtotal; each top-level node is its full main-area rollup. | Property fixtures compare bridge values to the existing store map and integrated center-sheet values. |
| OPS-001 | Distinguish no snapshot/loading, background update, partial loaded rows/subareas, stale-with-error, unavailable, optimistic unsaved, pending, retained rejection, and rollback states. | State-transition matrix plus browser failure injection. |
| DATA-002 | Currency comes from estimate/proposal metadata, never node.total or a tree-local fallback. | Prop contract and multi-currency formatting tests. |
| UX-001 | Each amount label names area, currency, and status without a live region per node/keystroke. | DOM, keyboard, screen-reader-name, zoom, and announcement-count evidence. |
| OPS-002 | Final contribution semantics count selected variants/options, included optional rows, same-area accessories/assemblies, and tax exactly once across tree, center sheet, summary, collaboration, and export. Tree consumes final contribution/tax semantics and never calculates or reattributes them. | Integrated hostile fixture, cross-area invalidity case, and export/summary parity. |
| PERF-001 | Meet canonical product budgets and benchmark the 1,500-node/5,000-row cap without replacing incremental ancestor updates. | Deterministic perf fixtures, browser timing, budget checker, and no-regression signal. |
| SEC-001 | The bridge contains only scope IDs, aggregate amounts, revisions, completeness, and safe statuses; no row text, supplier data, URLs, attachments, or auth material. | Static shape test and independent privacy/security review. |
| OPS-003 | Q2 red-before-green, property, browser, collaboration, mutation, 100% changed-branch coverage, full relevant suite, and independent reviews pass. | Machine-readable Q2 evidence; no fake PASS. |

## Decisions

### DEC-001 — Use a tiny external snapshot bridge

Content remains the only owner of editable rows and the existing Zustand vanilla store. It publishes a small snapshot to a module-level external store keyed by the ordered pair estimateId and normalized tabId. The scope key is constructed by one helper; callers never concatenate ambiguous strings ad hoc. The legacy tab normalizes to the existing legacy-main identity.

Tree subscribes with useSyncExternalStore through use-live-total-snapshot.ts. It never imports the editable store, never receives row values, and never causes EstimateWorkspaceClient to lift the full store.

### DEC-002 — Preserve the existing calculator and copy-on-write totals

The bridge wraps the existing ReadonlyMap in a frozen lookup facade whose closure is the store's copy-on-write Map. It exposes lookup/iteration but no mutator or raw Map. The snapshot object and nested status records are Object.freeze values.

No bridge or tree code calls computeNodeTotal, computeNodeTotals, computeEditableRowTotal, or performs a row reduction. Full recalculation remains only in the existing store paths for initialization, tree replacement, authoritative sync, cancellation, and rejection. Normal edits retain the current row-delta plus ancestor-index update.

### DEC-003 — Keep data and mutation state orthogonal

Snapshot shape:

    type LiveTotalSnapshot = Readonly<{
      scope: Readonly<{ estimateId: string; tabId: string }>;
      revision: number;
      totals: LiveTotalLookup;
      projectTotal: number;
      dataState: "loading" | "ready" | "updating" | "partial" | "stale-error" | "unavailable";
      mutationState: "authoritative" | "optimistic" | "pending" | "rejected-retained" | "rolled-back";
      completeness: Readonly<{
        nodes: "complete" | "partial";
        rows: "complete" | "partial";
        reasons: readonly ("node-limit" | "row-limit" | "subarea-not-loaded" | "rows-not-loaded")[];
      }>;
      safeErrorCode: string | null;
    }>;

Data-state semantics:

| State | Amount behavior | Required label |
| --- | --- | --- |
| loading/no snapshot | Render no amount; retain layout skeleton. | Loading subtotal. |
| ready | Render current store amount. | Currency amount. |
| updating | Keep current amount while query refetches. | Amount, updating. |
| partial | Render loaded-data amount only. | Amount, partial; preserve the existing explicit Content warning. |
| stale-error | Keep the last known amount only when its exact scope remains mounted. | Amount, stale after update error. |
| unavailable | Render no precise amount. | Subtotal unavailable. |

Mutation-state semantics:

| State | Store source | Required behavior |
| --- | --- | --- |
| authoritative | no protected draft/pending state | Normal value. |
| optimistic | dirty or awaiting confirmation | Immediate unsaved value; labelled unsaved. |
| pending | commit in flight or external component sync pending | Keep optimistic value; labelled saving. |
| rejected-retained | failed with retainDraft true | Keep draft value; labelled unsaved after rejection. |
| rolled-back | failed with retainDraft false or cancellation | Publish the recalculated authoritative value and one discrete rollback status. |

Status priority never hides partiality. For example, a partial optimistic amount is labelled both partial and unsaved.

### DEC-004 — Currency is metadata, not a total source

EstimateWorkspaceClient derives one canonical currencyCode from proposalExportMetadata.currency and passes it independently to both siblings. Tree never parses node.total and never hardcodes PHP. If currency metadata is absent or invalid, the amount is unavailable rather than formatted with a guessed currency. The final implementation uses the Money-Math pack's shared formatter after its ownership handoff.

### DEC-005 — Every node renders its recursive store value

EstimateSheetTree label rendering performs only totals.get(node.id) and formatting. All group/area nodes display a recursive subtotal. A top-level node therefore shows its own rows plus every descendant and is the requested main-area rollup. projectTotal remains available for parity checks but is not substituted for each top-level node.

### DEC-006 — Preserve explicit partial truth

Completeness combines:

- estimate-tree-read-repository loadLimitState node/row limits;
- rowItemsLoaded false;
- childrenLoaded false;
- background/stale query status.

The bridge does not hide or replace EstimateSheetContent's existing partial warning. Tree adds a compact per-node status token and accessible label; it does not claim an unloaded branch is zero.

### DEC-007 — Announce state transitions, not every amount

Each visible amount has an accessible name containing node/area name, formatted currency code and amount when available, and the combined data/mutation status. Amount text uses aria-live off. There is at most one pane-level polite status element for discrete loading, partial, unavailable, save-rejected, and rollback transitions; ordinary keystrokes and numeric changes do not enqueue announcements.

### DEC-008 — Final contribution contract is a hard integration dependency

UNIT-002 cannot start production wiring until the final handoffs from:

- Material-Variants-And-Value-Engineering, migration 0127;
- Commercial-Remarks-Quotations-And-VAT, migration 0128;
- Material-Assemblies-And-Accessories, migration 0129.

Those packs must expose one canonical payable-contribution contract consumed by the existing editable-row calculator/store. This tree pack consumes the final store total only. It must not independently select variants, include options, add accessories, or calculate/extract VAT.

The final Assemblies `0129` contract must reject cross-area edges and allow area movement only as one atomic root-plus-closure command. Therefore every direct accessory row stays in the same area as its root and contributes to that area's recursive subtotal exactly once. If a malformed or stale cross-area edge reaches the read model, the contribution contract returns typed invalidity and Tree renders subtotal unavailable/errored; Tree never moves the child's cost to the root's area or shows a partial precise amount.

Migration 0126 remains owned by Material-Brand-Supplier-Category-Governance. Tree does not claim 0126 through 0129.

## Dependency and Ownership Barriers

1. UNIT-001 is dependency-free and may create RED characterization tests only.
2. Before UNIT-002:
   - governance 0126 contract is final;
   - variants 0127, commercial 0128, and assemblies 0129 packs have final contribution semantics and path handoffs;
   - Money-Math has released formatter/domain paths;
   - Estimate Mutation Integrity has released any shared row/store paths;
   - Material Image Upload Consistency has released EstimateSheetContent.tsx and editable-row-model.ts;
   - Workshop Readability has either not started overlapping files or has released EstimateSheetTree.tsx and EstimateSheetContent.tsx.
3. One writer owns EstimateSheetContent.tsx and EstimateSheetTree.tsx at a time.
4. Reread every shared file, current diff, migration inventory, and sibling manifest immediately before editing.
5. A HIGH/CRITICAL GitNexus impact warning must be reported and reconciled before edits. Missing FTS uses current-source caller/test evidence and remains UNKNOWN.
6. No dependency is a human authorization blocker; downstream units remain PLANNED until their repository prerequisites are complete.

## Dependency DAG

    UNIT-001 RED characterization
        |
        | variants 0127 + commercial 0128 + assemblies 0129
        | Money-Math + Mutation Integrity + overlapping UI handoffs
        v
    UNIT-002 bridge contract
        v
    UNIT-003 Content publisher and currency plumbing
        v
    UNIT-004 Tree rendering and integrated states
        v
    UNIT-005 Q2 verification and reviews

## Unit Contracts

### UNIT-001 — Lock the RED contract

- Status: READY
- Depends on: none
- Owned paths:
  - tests/vitest/editable-row-live-total-bridge.test.ts
  - tests/vitest/estimate-tree-live-subtotals.test.tsx
  - tests/property/estimate-tree-live-subtotals.property.test.ts
  - tests/vitest/perf/estimate-tree-live-subtotals.test.tsx
- Work:
  1. Characterize the current sibling boundary and prove Tree has no live editable subtotal.
  2. Characterize the final same-area assembly contract and prove a malformed cross-area relation fails closed rather than shifting either area's subtotal.
  3. Add state-table fixtures for every required data/mutation combination.
  4. Add arbitrary-tree fixtures comparing expected node values to the existing store map.
  5. Add scope collision, unmount, immutable-facade, and cross-estimate isolation tests.
  6. Define canonical 500-node and cap 1,500-node/5,000-row benchmark fixtures.
- RED signal: tests fail only because the bridge, snapshot states, metadata currency prop, and tree subtotal rendering do not exist. Existing calculator tests stay green.
- Boundary: no production code, migrations, existing-pack edits, threshold changes, or generated PASS evidence.
- Recovery: delete or repair only new task-owned RED tests through apply_patch; never weaken assertions to make current behavior pass.

### UNIT-002 — Implement the immutable bridge

- Status: PLANNED
- Depends on: UNIT-001 and all contribution/ownership barriers.
- Owned paths:
  - src/components/workshop/estimate-sheet/live-total-snapshot-bridge.ts
  - src/components/workshop/estimate-sheet/use-live-total-snapshot.ts
  - tests/vitest/editable-row-live-total-bridge.test.ts
- Work:
  1. Implement pair-keyed publish/read/subscribe/clear operations.
  2. Freeze every published snapshot and expose the copy-on-write total Map only through a non-mutating facade.
  3. Make publish idempotent by scope/revision/status identity and clear exact scope on Content teardown.
  4. Fail closed for malformed scope, non-finite amount, revision regression, or currency-independent misuse.
- Acceptance: no scope leaks, no mutable object escapes, no calculator import exists, and subscription behavior is useSyncExternalStore-safe.
- Recovery: clear the affected scope and surface unavailable; never fall back to another scope or server node.total.

### UNIT-003 — Publish from Content and pass currency

- Status: PLANNED
- Depends on: UNIT-002.
- Owned paths:
  - src/components/workshop/EstimateWorkspaceClient.tsx
  - src/components/workshop/EstimateSheetContent.tsx
  - focused updates to tests/vitest/estimate-sheet-center-atomic-contracts.test.ts
- Work:
  1. Pass canonical metadata currency to both siblings.
  2. Subscribe once to the existing editable store's nodeTotals, projectTotal, revision, commit states, and external mutation state.
  3. Combine query/load completeness with store mutation status and publish one atomic snapshot.
  4. Keep last exact-scope snapshot during background refetch/stale error; publish no precise value when no exact-scope snapshot exists.
  5. Clear old scope before publishing a different estimate/tab.
- Acceptance: optimistic edits, pending commits, retained drafts, rejection rollback, authoritative sync, refetch, tab switch, and unmount publish the exact required state without lifting rows.
- Recovery: stop publication and clear the exact scope; Content remains functional and its existing warning remains visible.

### UNIT-004 — Render every recursive subtotal

- Status: PLANNED
- Depends on: UNIT-003.
- Owned paths:
  - src/components/workshop/EstimateSheetTree.tsx
  - tests/vitest/estimate-tree-live-subtotals.test.tsx
  - tests/vitest/estimate-sheet-tree-dom.test.tsx
  - tests/vitest/estimate-tree-lazy-hydration-ui.test.tsx
  - e2e/estimate-sheet-live-subtotals.spec.ts
- Work:
  1. Subscribe only to current estimate/tab.
  2. Render a formatted subtotal for every node using totals.get(node.id).
  3. Render partial/updating/stale/unavailable and mutation labels exactly.
  4. Add one pane-level discrete status announcer; keep numeric changes out of live regions.
  5. Verify top-level main-area rollup, descendants, collapse/expand, lazy hydration, keyboard focus, 200% zoom, and narrow viewport behavior.
- Acceptance: tree, center sheet, summary, and export converge on the integrated fixture; no stale precise value masquerades as final.
- Recovery: render explicit unavailable/partial status, never node.total.

### UNIT-005 — Complete Q2 evidence

- Status: PLANNED
- Depends on: UNIT-004.
- Owned paths:
  - task-owned tests and generated artifacts/quality evidence selected by the Q2 harness
  - no new product ownership except fix-forward repairs returned to the owning unit
- Work:
  1. Run focused, property, full relevant, browser/device, performance, coverage, mutation, build, and security commands sequentially.
  2. Exercise two-collaborator optimistic/authoritative convergence and export/summary parity.
  3. Obtain an independent read-only quality review and a distinct privacy/data-boundary review.
  4. Reconcile GitNexus detect_changes when available or current-source/diff fallback.
- Acceptance: every criterion has fresh machine-readable PASS evidence; no skipped/flaky/high-risk mutant/unowned change remains.
- Recovery: route failures to the owning unit; do not change budgets, exclusions, retries, or tests to manufacture green.

## Acceptance Criteria

### AC-001 — One scoped immutable source

For a mounted estimate/tab, Tree receives exactly the Content store's current node totals through one immutable pair-keyed bridge. A tab/estimate switch or unmount cannot expose another scope.

### AC-002 — Recursive exactness and no duplicate calculation

Every node amount equals the existing editable store value. Top-level nodes include descendants. Static analysis and tests prove Tree/bridge do not import or call calculation functions and do not reduce rows.

### AC-003 — Honest state behavior

All required loading, updating, partial, stale-error, unavailable, optimistic, pending, retained rejection, and rollback cases render the specified amount/status combination. Existing explicit partial warning remains.

### AC-004 — Currency and accessibility

Tree currency comes from metadata, never node.total. Accessible labels include area, currency/amount when available, and status. Keystrokes do not create one live announcement per node or value.

### AC-005 — Final contribution parity

The hostile integrated fixture containing one selected variant, one excluded option, required and optional same-area accessories, a whole-assembly area move, nested subareas, VAT, contingency, and sheet adjustment reconciles exactly across old/new area totals, tree, center sheet, summary, collaboration reload, and export. Each payable contribution appears once. A malformed cross-area relation produces typed invalid/unavailable state everywhere and no precise subtotal.

### AC-006 — Performance

- Canonical 500-node fixture: tree interaction-ready under 1,000 ms beta budget.
- Row edit to visible tree subtotal: under 200 ms beta budget, with the existing target under 100 ms recorded separately.
- Expanding 100 children: under 300 ms.
- Cap fixture: 1,500 nodes and 5,000 rows records p50/p95, heap, bridge notifications, mounted DOM, and edit-to-paint. It must satisfy the same 200 ms edit budget and cannot regress a checked-in baseline by more than the canonical 10 percent rule.
- No full-tree calculator call occurs on an ordinary row edit.

### AC-007 — Q2 closure

Focused/full relevant tests, browser matrix, performance, local build, changed and critical mutation, 100% changed statements/lines/functions/branches, independent quality review, and distinct privacy review pass. Local evidence is not hosted proof.

## Adversarial and Property Matrix

| ID | Scenario | Required result |
| --- | --- | --- |
| ADV-001 | Two estimates share the same tab ID or delimiter-like IDs | Pair-key helper isolates scopes; no collision or leak. |
| ADV-002 | No Content snapshot yet | Tree shows loading/no amount, not server node.total. |
| ADV-003 | Background refetch succeeds | Existing amount stays visible as updating, then atomically advances. |
| ADV-004 | Background refetch fails | Exact-scope last amount is labelled stale-error; a scope without a snapshot is unavailable. |
| ADV-005 | Node or row cap exceeded | Loaded-data subtotal is visibly partial and Content warning remains. |
| ADV-006 | Lazy child/rows not loaded | Parent/child status is partial; missing descendants are not treated as zero-final. |
| ADV-007 | Rapid optimistic edits | Ancestors and top-level rollup follow each store revision without a full recursive recompute. |
| ADV-008 | Commit rejected with retained draft | Draft amount remains, labelled rejected-unsaved. |
| ADV-009 | Commit rejected with rollback | Amount returns to authoritative value and one discrete rollback status is announced. |
| ADV-010 | Two collaborators race a row/variant/accessory change | Server revision wins, local optimistic state converges, no double contribution remains. |
| ADV-011 | Malformed cross-area accessory relation or partial closure move | Canonical contribution state is invalid; both affected area subtotals are unavailable/error, no cost is silently reassigned, and an atomic whole-assembly move restores exact old/new totals. |
| ADV-011 | Currency differs from PHP | Metadata currency formats correctly; server node.total cannot override it. |
| ADV-012 | Currency metadata missing/invalid | Tree reports unavailable, never guesses PHP. |
| ADV-013 | Attempt to mutate snapshot facade | Mutation is impossible through the public API and cannot change Content/store values. |
| ADV-014 | Integrated variant/option/accessory/VAT fixture | Tree, sheet, summary, and export totals match exactly and count once. |
| ADV-015 | 200% zoom, 320 px viewport, keyboard navigation | Labels remain readable/focusable with no overlap or focus loss. |
| ADV-016 | 5,000 keystrokes in perf fixture | No per-node live announcement storm and no listener/snapshot leak after teardown. |

Property tests generate bounded acyclic trees, arbitrary row placements, signed safe deltas accepted by the canonical row oracle, scope switches, and commit-state transitions. Assertions compare only against the existing store output; they do not implement a second expected-value calculator. Rounding assertions verify the bridge preserves the exact numeric store values and that formatting does not feed back into arithmetic.

## Verification Strategy and Exact Commands

All commands are planned and currently NOT RUN. Run one heavy command at a time and preserve unrelated artifacts.

### Red-before-green

    bun x vitest run tests/vitest/editable-row-live-total-bridge.test.ts tests/vitest/estimate-tree-live-subtotals.test.tsx tests/property/estimate-tree-live-subtotals.property.test.ts --maxWorkers=1

RED expected before implementation: failures name the missing bridge, missing subtotal/status labels, missing currency prop, and missing immutable/scope behavior. Existing editable-row calculation assertions remain green. After UNIT-004 the same command exits 0 with no skipped tests.

### Focused DOM and regression

    bun x vitest run tests/vitest/estimate-sheet-tree-dom.test.tsx tests/vitest/estimate-tree-lazy-hydration-ui.test.tsx tests/vitest/estimate-sheet-center-atomic-contracts.test.ts tests/vitest/estimate-tree-drag-over-perf.test.ts --maxWorkers=1

Expected: exact subtotal/status labels, lazy/partial behavior, drag/tree behavior, and center-sheet ownership remain green.

### Focused performance

    bun x vitest run tests/vitest/perf/estimate-tree-live-subtotals.test.tsx tests/vitest/perf/estimate-sheet-render-baseline.test.tsx tests/vitest/perf/estimate-sheet-memoization.test.tsx --maxWorkers=1

Expected: canonical and cap fixtures emit machine-readable timing/call-count data; fixed budgets pass; ordinary edits show zero full recursive recalculations and one scope notification per revision.

    bun run test:e2e:perf
    bun run quality:bundle-budget

Expected: route performance and checked-in budgets pass without threshold changes.

### Full relevant suites

    bun run test:unit
    bun run test:dom
    bun run test:workers

Expected: all relevant unit/DOM/Workers tests pass with zero skips or flakes. Workers coverage is required only for actually affected Worker paths; this pack plans no Worker production path.

### Authenticated browser and device matrix

    bun run test:e2e -- e2e/estimate-sheet-live-subtotals.spec.ts e2e/estimate-sheet-mvp.spec.ts --project=chromium

    $env:ARCHESTIMATOR_E2E_LIBRARY_BROWSER_MATRIX='1'; bun x playwright test e2e/estimate-sheet-live-subtotals.spec.ts; Remove-Item Env:ARCHESTIMATOR_E2E_LIBRARY_BROWSER_MATRIX

Expected: configured projects chromium, firefox, webkit, mobile-safari (iPhone 15), iphone-se, ipad, and pixel-8-chrome (Pixel fixture) prove edit/rollback/refetch/tab-switch/partial/collapse/reload/accessibility behavior. Failed requests or console errors fail the journey.

### Static, build, privacy, coverage, and mutation

    bun run type-check
    bun run lint
    bun run quality:security
    bun run build
    bun run quality:diff-coverage
    bun run test:mutation:changed
    bun run test:mutation:critical
    bun run quality:critical

Expected:

- type/lint/build exit 0;
- privacy checks find no row text, supplier, URL, attachment, token, or auth data in bridge snapshots;
- Q2 changed statements, lines, functions, and branches are each 100%;
- no surviving high-risk changed/critical mutant;
- quality aggregate has no missing, stale, malformed, skipped, or unowned evidence.

### Graph and diff reconciliation

Before every production symbol edit:

    GitNexus impact(target=<symbol>, direction=upstream)

Before completion:

    GitNexus detect_changes(scope=compare, base_ref=main)

Expected: only planned tree/content/bridge flows are affected. If FTS remains unavailable, record the degraded state and use current-source caller lists, scoped diff, and focused tests; never call missing graph evidence PASS.

### Independent reviews

1. Independent read-only Q2 quality reviewer: correctness, state coverage, performance, no duplicate calculator, and evidence integrity.
2. Distinct read-only privacy/data-boundary reviewer: scope isolation, snapshot payload minimization, safe errors, and absence of auth/upload/private commercial data.

The author cannot self-certify either review as independent.

## Migration, Upload, Authorization, Export, and Collaboration Boundaries

- Migration: no tree migration. Local migration inventory must still confirm 0126 governance, 0127 variants, 0128 commercial, and 0129 assemblies remain allocated in that order before integration. Any tree schema request is a stale trigger and requires explicit justification.
- Upload: no upload API, artifact, R2 object, scan status, or attachment descriptor enters the bridge.
- Authorization: no new authorization path. Tree and Content remain behind the existing authenticated estimate route. The bridge is process-local client memory and cannot broaden access.
- Privacy: aggregate amounts/status only; no material names beyond already-rendered tree node labels, no row/supplier/source/quotation detail in snapshots or logs.
- Export: Tree does not prepare exports. Integrated tests compare the final shared contribution output after the xlsx-export ownership handoff.
- Collaboration: existing row revision, optimistic commit, external mutation, and authoritative query sync remain the source. No Durable Object or collaboration protocol change.

## Risks

| ID | Risk | Control |
| --- | --- | --- |
| RISK-001 | Tree accidentally creates a second calculator. | Import prohibition, property comparison to store output, static review. |
| RISK-002 | Mutable Map escapes and changes after publication. | Copy-on-write characterization plus frozen non-mutating facade. |
| RISK-003 | Scope collision leaks another estimate/tab amount. | Pair-key helper, collision fixtures, exact teardown. |
| RISK-004 | Partial/stale value looks final. | Orthogonal completeness/freshness status and unavailable fail-closed behavior. |
| RISK-005 | Currency falls back to PHP or node.total. | Metadata-only prop contract and invalid-currency unavailable state. |
| RISK-006 | Every keystroke re-renders too much or announces excessively. | useSyncExternalStore selector, no numeric live region, cap benchmark. |
| RISK-007 | Variants/options/accessories/tax are double counted or accessory cost is attributed to the wrong area. | Hard same-area assembly/contribution-contract dependency; consume store totals only; cross-area states fail closed; whole-assembly move parity covers old/new areas. |
| RISK-008 | Concurrent readability/image work is overwritten. | One-writer barrier, reread/hashes, no reset/stash/clean. |
| RISK-009 | Missing GitNexus FTS hides blast radius. | Treat as UNKNOWN, current-source callers/focused tests, no low-risk inference. |
| RISK-010 | Snapshot listener survives unmount. | Exact-scope clear/unsubscribe and repeated mount property test. |

## Recovery and Fix-Forward

1. Bridge failure: clear only the exact scope and render unavailable; do not read node.total.
2. Partial/fetch failure: preserve exact-scope last value with explicit status or no amount; never silently downgrade the warning.
3. Rejection/rollback: rely on existing editable-store authoritative recalculation and publish the resulting revision.
4. Performance regression: profile notifications/renders and reduce subscription scope or object churn; do not replace incremental ancestor updates, weaken budgets, or debounce away correctness.
5. Contribution or area-attribution mismatch: stop at the owning Variants/Commercial/Assemblies contract and fix forward there; Tree remains a consumer and never reassigns a child's cost to an assembly root.
6. Concurrent edit: stop writing the shared file, preserve both diffs, reread, and resume only after ownership handoff.
7. No rollback migration exists because this pack owns no migration.

## Resume State

- Goal: render honest live recursive subtotals from the existing Content store.
- Next unit: UNIT-001.
- Ready units: UNIT-001 only.
- Planned units: UNIT-002 through UNIT-005.
- Internal prerequisites: final 0127 Variants, 0128 Commercial, 0129 Assemblies contribution contracts plus Money-Math, Mutation Integrity, Image Upload, and Readability path handoffs.
- External authorization blocker: none for local work.
- Current decision state: DEC-001 through DEC-008 active.
- Evidence state: all product tests/gates NOT RUN; plan validators are separate contract evidence only.

## Stale Triggers

Refresh this pack before implementation when any of the following occurs:

1. Migration inventory no longer allocates 0126 governance, 0127 variants, 0128 commercial, and 0129 assemblies in that exact order.
2. Any tree migration becomes necessary or another pack claims a migration for tree totals.
3. Variants, Commercial, or Assemblies changes its payable-contribution semantics, selected-state snapshot, same-area/whole-assembly-move contract, or completion status.
4. editable-row-model.ts recursive totals, editable-row-store.ts copy-on-write/incremental updates, or estimate-tree-index.ts ancestor chains change.
5. EstimateWorkspaceClient.tsx sibling composition or Content/Tree ownership changes.
6. Currency metadata precedence or the Money-Math formatter contract changes.
7. Estimate-tree load limits, partial-warning semantics, lazy hydration flags, or TanStack query state behavior changes.
8. Workshop Readability, Image Upload, or another writer changes an owned shared file after baseline.
9. Canonical performance budgets, 1,500-node/5,000-row caps, Q2 thresholds, or browser matrix changes.
10. GitNexus becomes current or returns HIGH/CRITICAL impact that contradicts this blast radius.

## Final Completion Audit

The pack can become ACHIEVED only when:

1. Every requirement maps to a completed unit and fresh evidence.
2. Every node, including top-level main areas, renders the existing recursive store subtotal.
3. The bridge is immutable, scope-isolated, minimal, and torn down exactly.
4. Currency comes only from metadata and missing currency fails closed.
5. Every required data and mutation state is honest and accessible.
6. Existing partial warnings remain and unloaded data is never presented as final zero.
7. Variants/options/accessories/tax contribute exactly once across all integrated surfaces; every assembly closure stays in one area, cross-area states fail closed, and whole-assembly moves reconcile old/new area totals.
8. Canonical and cap performance evidence passes without calculator duplication.
9. Q2 coverage, mutation, browser/device, full relevant suite, build, and both independent reviews pass.
10. The scoped diff contains only owned implementation/evidence changes and no external/hosted claim is made.
