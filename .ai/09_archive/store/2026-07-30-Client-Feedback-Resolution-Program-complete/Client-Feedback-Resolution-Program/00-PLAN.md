# Archestimator Client Feedback Resolution Program

## Status Tuple

- **Plan lifecycle:** ACTIVE
- **Package status:** CONDITIONALLY_READY
- **Implementation status:** NOT_STARTED
- **Quality floor:** Q2_CRITICAL_CHANGE_GATE across the program; each focused
  pack may select Q1 only when its actual changed surface remains noncritical.
- **First ready unit:** UNIT-001, loading diagnosis and instrumentation.
- **Incident continuation:** UNIT-002 is ready for its explicit browser-mount
  diagnostic; final authenticated proof remains blocked until that succeeds.

### Current-source refresh — 2026-07-30

The baseline commit is unchanged, but the shared worktree now contains active
estimate mutation, row rendering, upload, artifact, and export edits that were
not present in the original scoped hashes. Loading already has route Suspense,
dynamic fallbacks, skeletons, and server timing; the insert fail-closed repair
is present but lacks fresh browser/Q2 proof. Every child pack has been reread
against this state. Project catalogue category editing is now limited to
projections with a canonical Library item identity; project-only rows must use
an explicit Save to Library flow before they can be categorized.

## Outcome

Turn every client comment into a traceable, dependency-ordered delivery program
that fixes confirmed defects, makes hidden workflows discoverable, and adds the
new estimating capabilities without mixing variants, alternatives, optional
items, accessories, quotation state, remarks, or tax semantics.

This master pack coordinates focused Plan Packs. It does not duplicate their
implementation detail and it does not implement product code.

## Task Contract

### Objective and business intent

Make Archestimator easier to read, faster to enter, safer to edit, and more
useful for real-world value engineering and client quotation requirements. A
fresh executor must be able to select a focused pack, understand its dependency
boundary, and begin local implementation without reinterpreting the feedback.

### Scope

- Authenticated Workshop readability and accessibility.
- Estimate-route loading diagnosis and measured performance improvements.
- Material insertion incident closeout.
- Component variants and summary-level value engineering.
- Workspace brand and supplier catalogues, Project-tab brand projection, and
  category movement.
- Consistent inline and Edit Component image upload behavior.
- Material assemblies and accessories.
- Live recursive area subtotals in the Estimate Tree.
- Structured remarks, quotation state, and VAT treatment.
- Cross-pack calculation, export, collaboration, migration, and evidence
  integrity where these concerns intersect.

### Non-goals

- No product code, D1 migration, deployment, production mutation, branch,
  commit, push, feature flag, compatibility path, rollout, or hosted proof in
  this planning task.
- No global `110%` root-font shortcut.
- No use of `scopeStatus` as a value-engineering selector.
- No arbitrary Direct Category free text while folders remain category truth.
- No VAT, quotation, or attachment meaning encoded only in free-form remarks.
- No accessory pricing hidden in `miscCost` or represented as fake variants.
- No claim that intermittent loading is solely an internet or server problem
  before measured evidence identifies the hot path.

### Authoritative inputs

- `evidence/client-feedback.md`, which preserves the sanitized client wording,
  the final remarks/quotation/VAT comment, and the screenshot fingerprint.
- The production error screenshot, which proves the affected autosave surface
  and opaque Next Server Components message class but not the hidden exception.
- Current source and active diff in the shared worktree.
- `.ai/03_plans/2026-07-28/Estimate-Material-Insert-Autosave-Incident`.
- The eight focused Plan Packs in this dated program.
- `.ai/00_system/BETA_QUALITY_ENGINEERING_PROTOCOL.md` and
  `.ai/00_system/VALIDATION_MATRIX.md`.

### Authorization boundaries

Local repository planning, implementation, tests, browser checks, local D1
migrations, builds, and bound-resource dry runs inherit standing authorization.
Deployment, production/provider writes, paid services, secrets, remote Git
operations, and irreversible data loss remain outside this program unless the
user separately authorizes them. No current core requirement depends on an
external action.

### Stop condition

Finish only when every feedback item maps to one focused pack, every focused
pack validates, all dependency and data-model contradictions are resolved, and
the program exposes at least one ready implementation slice. Product execution
finishes later only when every child requirement has fresh profile-selected
PASS evidence and the existing incident browser gap is closed honestly.

## Current Evidence

1. The 110% zoom preference reflects a systemic density problem, while fixed
   pixel classes in `src/components/workshop/estimate-sheet/rows/cells.tsx`
   and `src/components/workshop/component-library-manager/AddComponentModal.tsx`
   prevent a root-font-only repair.
2. Estimate loading crosses route work in
   `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`,
   auth/D1 work in `src/lib/repositories/workspace-repository.ts`, and dynamic
   client chunks in `src/components/workshop/EstimateWorkspaceClient.tsx`.
   `readEstimateNodeRouteContextD1FastPath` currently returns `null`, so the
   named fast path provides no acceleration.
3. Variants already exist in
   `src/components/workshop/component-library-manager/AddComponentModal.tsx`,
   `src/components/workshop/estimate-sheet/rows/cells.tsx`, and
   `src/components/workshop/estimate-sheet/rows/row-commit-intent.ts`, but the
   controls are hidden and variant-level commercial identity is incomplete.
4. Workspace brand/supplier tables and UI suggestions are not a coherent
   canonical catalogue. Creatable values can be remembered in browser storage
   and persisted as free text.
5. `src/lib/component-library/project-component-projection.ts` reads supplier
   fields but omits brand from its authoritative Project-tab projection, which
   explains brand loss after refresh.
6. Direct Category is derived from the selected component-library folder; the
   missing capability is an explicit move-to-category workflow, not another
   writable text field.
7. Inline image upload in
   `src/components/workshop/estimate-sheet/rows/cells.tsx` and modal upload in
   `src/components/workshop/component-library-manager/AddComponentModal.tsx` enforce
   different size, preprocessing, persistence, and storage-scope contracts.
8. `src/lib/estimates/types.ts` and the estimate-row integrity migration have
   no parent-material or assembly relationship, so the user's sub-area is a
   workaround rather than a supported accessory model.
9. Recursive totals already exist in
   `src/components/workshop/estimate-sheet/rows/editable-row-model.ts`, while
   `src/components/workshop/EstimateSheetTree.tsx` does not render them.
10. `EstimateRowItem.notes` and proposal remarks already exist, but current D1
    row hydration does not consistently restore snapshot notes. Quotation state
    and per-material VAT treatment are not yet structured, and the current
    global included/percentage model cannot reconcile explicit pre-VAT, VAT,
    exempt, and grand-total outputs.
11. The add-material screenshot is already covered by the existing incident
    pack. A deterministic failed-insert/queued-edit defect is confirmed and is
    consistent with the screenshot message class, but the user's exact session
    is not correlated. Its required authenticated journey remains unproven
    because the Sources drawer does not mount in the current shared worktree.
12. GitNexus concept queries returned no flows because the local FTS layer is
    missing. The index must not be treated as evidence of no impact; current
    source, callers, focused tests, and later `detect_changes` remain decisive.

## Complete Concern-to-Pack Matrix

| Feedback ID | Classification | Product interpretation | Requirement | Focused Plan Pack | Program unit |
| --- | --- | --- | --- | --- | --- |
| FB-01 | Usability/accessibility | Use scoped semantic type and target sizing; do not globally scale the app to 110% | REQ-001 | `Workshop-Readability-And-Accessibility` | UNIT-009 |
| FB-02 | Unconfirmed performance signal | Measure server, network, RSC/chunk, hydration, and navigation stages before choosing a fix | REQ-002 | `Estimate-Loading-Performance` | UNIT-001 |
| FB-03A | Discoverability plus snapshot-integrity gap | Make V-1/V-2 selection obvious and restore the full selected variant atomically | REQ-003 | `Material-Variants-And-Value-Engineering` | UNIT-005 |
| FB-03B | Master-data governance gap | Reuse canonical workspace brand/supplier entities with authorized create/manage/select flows | REQ-004 | `Material-Brand-Supplier-Category-Governance` | UNIT-003 |
| FB-03C | Confirmed defect consistent with screenshot; exact session uncorrelated | Prevent an edit queued behind a failed insert and prove product-safe browser recovery | REQ-005 | `Estimate-Material-Insert-Autosave-Incident` | UNIT-002 |
| FB-03D | Confirmed cross-entry inconsistency | Use one admission, processing, ownership, descriptor, persistence, and retry contract | REQ-006 | `Material-Image-Upload-Consistency` | UNIT-004 |
| FB-03E | Confirmed projection defect | Preserve canonical brand ID/label through Project edit, refetch, and projection | REQ-007 | `Material-Brand-Supplier-Category-Governance` | UNIT-003 |
| FB-03F | Intentional rule with missing UX | Keep category folder-derived and add an explicit move-to-category workflow | REQ-008 | `Material-Brand-Supplier-Category-Governance` | UNIT-003 |
| FB-03G | Net-new estimating model | Add acyclic material assemblies/accessories instead of using fake sub-areas | REQ-009 | `Material-Assemblies-And-Accessories` | UNIT-007 |
| FB-04A | Value-engineering capability gap | Separate variants, mutually exclusive alternatives, and independent optional rows under one contribution oracle | REQ-010 | `Material-Variants-And-Value-Engineering` | UNIT-005 |
| FB-04B | Rollup visibility gap | Show live recursive main-area totals with explicit partial/stale states | REQ-011 | `Estimate-Tree-Live-Subtotals` | UNIT-008 |
| FB-05 | Commercial data/export capability | Keep remarks, quotation state/reference/attachment, VAT Inclusive, VAT Exclusive, and VAT Exempt structured and auditable | REQ-012 | `Commercial-Remarks-Quotations-And-VAT` | UNIT-006 |

Every feedback row has exactly one primary pack. Cross-pack dependencies do not
create a second owner.

## Requirements

### REQ-001 - Workshop readability

Raise legibility, hit targets, and usable control scale across the authenticated
Workshop without blindly magnifying the entire application or breaking dense
estimate workflows.

### REQ-002 - Measured loading performance

Identify whether delay comes from TTFB, cold Worker/D1 work, server sequencing,
chunk transfer, hydration, or client rendering, then optimize only the proven
hot path against the canonical performance budgets.

### REQ-003 - Understandable variant selection

Make variant creation, default meaning, meaningful labels, selection, and
existing-row behavior explicit.

### REQ-004 - Canonical brand and supplier catalogues

Provide workspace-scoped master data with canonical IDs, lifecycle management,
normalization, permissions, and migration away from fragmented free text and
browser-only suggestions.

### REQ-005 - Product-safe material insertion

Close the insertion/autosave failure path and prove that opaque framework text
does not reach the user while row mutation integrity remains intact.

### REQ-006 - One material image contract

Make Page 001 and Edit Component uploads apply the same accepted formats, size
and preprocessing rules, persistence prerequisites, storage scope, retry,
accessibility, and error semantics.

### REQ-007 - Durable Project-tab brand projection

Preserve authoritative brand identity and display through refresh, filtering,
grouping, editing, and projection refetch.

### REQ-008 - Explainable category movement

Keep the folder as category source of truth while exposing a clear category
picker or Move to category action wherever users edit a Library or Project
catalogue component. Estimate-row area movement remains a separately named
estimate-tree action and never changes Direct Category.

### REQ-009 - Material assemblies and accessories

Support required and optional additive child products with explicit quantity
rules, independent commercial data, same-area parent/child ownership, lifecycle
behavior, and correct rollups.

### REQ-010 - Value-engineering alternatives

Support summary comparison and selection with price deltas while preserving the
distinct semantics of mutually exclusive alternatives, include/exclude optional
items, and additive accessories.

### REQ-011 - Live recursive area subtotals

Show recursive main-area totals in the tree from live editable state, including
partial/loading/error signaling and no double counting.

### REQ-012 - Commercial remarks, quotation, and VAT

Add structured per-material remarks, quotation status/reference/attachment, and
VAT Inclusive, VAT Exclusive, and VAT Exempt semantics with defaults, overrides,
rounding, auditability, summaries, and exports.

## Product Decisions

### DEC-AUTO-001 - Measure before performance optimization

Instrumentation and hard-refresh versus client-navigation baselines precede any
loading refactor. Internet variability is a test dimension, not the diagnosis.

### DEC-AUTO-002 - Scope readability to Workshop primitives

Use a controlled typography/control-scale system and representative surface
audits. Do not apply a global 110% root font change.

### DEC-AUTO-003 - Preserve separate estimating semantics

- **Variant:** another specification/pricing state of one material row.
- **Alternative:** mutually exclusive candidate; exactly one contributes.
- **Optional item:** independent additive row included by checkbox.
- **Accessory:** additive child of a main material, required or optional.

`scopeStatus` remains publication/proposal scope and is not reused.

### DEC-AUTO-004 - Canonicalize commercial identity

Brand and supplier become workspace entities with canonical IDs. Variant-level
commercial identity references those entities rather than duplicating names.

### DEC-AUTO-005 - Keep folder category authority

Direct Category remains derived from the canonical Library item's
`library_folder_id`. Library items and Project catalogue projections that retain
that canonical item identity can use the explicit category workflow. A
project-only estimate row does not gain an independent category field; it must
be explicitly saved/promoted to Library before categorization. Moving an
estimate row to another area remains a distinct action.

### DEC-AUTO-006 - Unify image preprocessing and persistence

One shared upload contract serves both entry points. UI surfaces may differ, but
accepted source files, transformation, storage descriptors, and error states do
not.

### DEC-AUTO-007 - Treat VAT as structured calculation data

VAT Exclusive and VAT Exempt are separate. Estimate/project defaults may be
overridden by a row or a Commercial-owned `0128` VAT pair for the canonical
selected price option. Remarks and quotation facts remain row-owned and are
never copied from variant notes. Calculations retain tax-rate and rounding
provenance and expose pre-VAT, VAT, and grand totals.

### DEC-AUTO-008 - Use recursive live tree totals

Main-area subtotal means the area plus descendant areas. The tree consumes live
editable totals and marks partial data instead of presenting stale precision.

### DEC-AUTO-009 - Reuse the existing incident pack

The screenshot failure stays owned by
`Estimate-Material-Insert-Autosave-Incident`; this program does not create a
duplicate diagnosis or weaken its unresolved browser gate.

### DEC-AUTO-010 - Reserve one migration owner per dependency layer

At the observed migration baseline, governance owns `0126`, variants own
`0127`, commercial terms own `0128`, and assemblies own `0129`. The tree and
readability packs do not create schema migrations. Any newly allocated number
stales every later reservation and requires the program ledger and child packs
to be refreshed before implementation.

## Dependency-Ordered Program Units

### UNIT-001 - Diagnose and improve estimate loading

- **Status:** READY
- **Pack:** `Estimate-Loading-Performance`
- **Dependencies:** none.
- **Implementation boundary:** add staged timing evidence first, decide the hot
  path, then change only the measured server/client boundary.
- **Completion signal:** hard refresh and client navigation satisfy canonical
  budgets with route-stage, bundle, hydration, and regression evidence.
- **Recovery:** retain instrumentation and revert only an unhelpful optimization
  through ordinary fix-forward edits; never hide a missed budget.

### UNIT-002 - Close the add-material incident

- **Status:** READY for the child pack's browser-mount diagnostic; final Q2
  verification remains blocked until that diagnostic succeeds.
- **Pack:** `Estimate-Material-Insert-Autosave-Incident`
- **Dependencies:** none.
- **Implementation boundary:** preserve its focused coordinator repair and run
  the child's exact browser-mount continuation, then the authenticated
  create/insert/edit/reload journey once the Sources drawer can mount.
- **Completion signal:** the child pack reaches fresh Q2 PASS without exposing
  the opaque Server Components diagnostic.
- **Recovery:** continue from the child pack's evidence summary; do not recreate
  the incident or substitute local unit proof for browser proof.

### UNIT-003 - Establish material master-data governance

- **Status:** READY
- **Pack:** `Material-Brand-Supplier-Category-Governance`
- **Dependencies:** none.
- **Implementation boundary:** land the localized Project-tab brand projection
  regression first, then canonical entities/backfill/CRUD, then category move
  UX.
- **Completion signal:** multiple users see the same normalized catalogues,
  refresh preserves brand identity, and category changes move folders.
- **Recovery:** D1 changes use additive local migration plus tested fix-forward
  backfill; no dual browser/database source of truth remains.

### UNIT-004 - Unify material image uploads

- **Status:** PLANNED
- **Pack:** `Material-Image-Upload-Consistency`
- **Dependencies:** UNIT-003 for shared modal/row files. The child pack's
  server-policy and client-controller preparation may proceed earlier only when
  it does not claim those shared UI paths.
- **Implementation boundary:** characterize both entry points, extract the one
  shared preprocessing/upload contract, and preserve canonical asset metadata.
- **Completion signal:** the same fixtures succeed or fail identically inline
  and in Edit Component, with accessible actionable recovery.
- **Recovery:** keep existing asset references valid and fix forward incomplete
  sessions; do not introduce a second upload route.

### UNIT-005 - Deliver variants and value engineering

- **Status:** PLANNED
- **Pack:** `Material-Variants-And-Value-Engineering`
- **Dependencies:** UNIT-003.
- **Implementation boundary:** improve existing row variants first, then add
  summary comparison and explicit alternative/optional grouping only where one
  row cannot represent the requirement.
- **Completion signal:** meaningful options, brands/suppliers, deltas, and
  selected totals remain correct through reload, collaboration, and export.
- **Recovery:** preserve one selected payable state and reject ambiguous groups;
  never translate proposal scope into estimate inclusion.

### UNIT-006 - Add remarks, quotation state, and VAT

- **Status:** PLANNED
- **Pack:** `Commercial-Remarks-Quotations-And-VAT`
- **Dependencies:** UNIT-003 and UNIT-005.
- **Implementation boundary:** define structured types and money invariants,
  migrate project/estimate/row persistence plus canonical price-option VAT
  sidecars and row snapshots, update calculations, then expose configurable
  columns, attachments, summaries, and exports. Remarks and quotation stay on
  the row.
- **Completion signal:** inclusive, exclusive, and exempt fixtures reconcile to
  pre-VAT, VAT, and grand totals with stable rounding and audit provenance.
- **Recovery:** retain raw entered amount plus treatment/rate snapshot so faulty
  derived totals can be recomputed without destructive data loss.

### UNIT-007 - Add assemblies and accessories

- **Status:** PLANNED
- **Pack:** `Material-Assemblies-And-Accessories`
- **Dependencies:** UNIT-003, UNIT-005, and UNIT-006.
- **Implementation boundary:** add acyclic parent-child relationships and
  same-area quantity rules, then editing/copy/template/collaboration/export
  behavior; cross-area edges are rejected and whole assemblies move atomically.
- **Completion signal:** required and optional accessories price once, inherit
  no accidental variant semantics, and remain itemized everywhere.
- **Recovery:** reject cycles and orphaned writes transactionally; retain child
  rows and relationship provenance for fix-forward repair.

### UNIT-008 - Show live recursive tree subtotals

- **Status:** PLANNED
- **Pack:** `Estimate-Tree-Live-Subtotals`
- **Dependencies:** UNIT-005, UNIT-006, and UNIT-007.
- **Implementation boundary:** consume the final shared rollup semantics rather
  than create a second calculator in the tree.
- **Completion signal:** optimistic and authoritative totals match center-sheet,
  summary, and export totals while partial data remains visibly partial.
- **Recovery:** fall back to an explicit unavailable/partial state, never a
  precise stale number.

### UNIT-009 - Complete Workshop readability pass

- **Status:** PLANNED; its child baseline-only unit may run early, while product
  edits remain dependency-gated.
- **Pack:** `Workshop-Readability-And-Accessibility`
- **Dependencies:** UNIT-001, UNIT-004, UNIT-005, UNIT-006, UNIT-007, UNIT-008.
- **Implementation boundary:** tune the final representative Workshop surfaces
  after new columns, selectors, uploads, tree totals, and accessories exist.
- **Completion signal:** keyboard, zoom, responsive, truncation, hit-target,
  contrast, and cross-browser checks pass without destroying information
  density or performance budgets.
- **Recovery:** adjust scoped tokens/primitives and representative consumers;
  do not patch hundreds of unrelated classes blindly.

## Execution Waves

1. **Wave 0 - independent evidence and defects:** UNIT-001, UNIT-002, and
   UNIT-003. C2 server/controller preparation may run without shared UI files.
2. **Wave 1 - shared material foundations:** complete UNIT-004 after UNIT-003,
   then UNIT-005 and UNIT-006.
3. **Wave 2 - additive structure and rollups:** UNIT-007, then UNIT-008.
4. **Wave 3 - integrated usability:** UNIT-009.
5. **Closeout:** rerun each child profile, independent Q2 reviews, GitNexus
   `detect_changes`, final concern-to-evidence audit, and archive only achieved
   child packs.

No two concurrent writers may own the same production file. Before executing a
wave, child-unit path ownership must be reconciled against current source and
the active worktree.

## Acceptance Criteria

### AC-001

Workshop text, controls, dialogs, tables, and tree remain readable at supported
zoom and viewport combinations with no blind global scaling.

### AC-002

Measured estimate loading meets canonical budgets and identifies the dominant
server/client stage for both hard refresh and client navigation.

### AC-003

Users can create, understand, and select meaningful variants, including the
difference between a future default and an existing row selection.

### AC-004

Brand and supplier catalogues are canonical workspace data rather than
per-browser suggestions or ungoverned free text.

### AC-005

Material insertion never releases creation-dependent edits after insert failure
and never displays Next's opaque production diagnostic to the user.

### AC-006

Equivalent image files receive equivalent validation, preprocessing, storage,
retry, and error behavior in Page 001 and Edit Component.

### AC-007

Project-tab brand identity survives authoritative refresh and supports canonical
filtering, grouping, and editing.

### AC-008

Changing Direct Category moves the canonical Library item's folder through an
explicit, permission-checked workflow. Project catalogue projections may invoke
that workflow only when they retain the canonical Library item ID; project-only
rows expose Save to Library instead. Estimate-area movement is separate and
does not change category.

### AC-009

Required and optional accessories are itemized beneath a main material, use
defined quantity rules, share its estimate area, and roll up exactly once.

### AC-010

Value-engineering summaries compare alternatives and update project totals from
the selected alternative and included optional items only.

### AC-011

Estimate Tree shows live recursive main-area subtotals and labels partial or
unavailable totals honestly.

### AC-012

Rows store Remarks and quotation state/reference/attachment. Rows and canonical
price options can store Commercial-owned VAT treatment/rate pairs, with the
selected option's pair snapshotted on selection. Summaries and exports reconcile
pre-VAT, VAT, and grand totals without exposing variant notes as Remarks.

## Triggered Gates and Evidence Contract

- **GATE-UX-01:** keyboard/focus, zoom, responsive layout, column visibility,
  error feedback, hit targets, reduced motion, and accessibility semantics.
- **GATE-NEXT-01:** local Next 16 guidance for RSC boundaries, dynamic chunks,
  streaming, serialization, cache behavior, and route loading.
- **GATE-CONTRACT-01:** estimate-row, variant, assembly, upload, projection,
  summary, and export consumers.
- **GATE-DATA-01:** D1 invariants, tenant/workspace authorization, migrations,
  deduplication, idempotency, concurrency, and fix-forward recovery.
- **GATE-PERF-01:** named route hot paths, canonical budgets, evaluator, bundle
  impact, and regression signals.
- **GATE-VERIFY-01:** red-before-green defect proof, unit/component/integration,
  Workers/D1, browser, cross-device, accessibility, performance, mutation,
  changed-branch coverage, independent review, and final requirement audit.

Exact commands and expected signals live in each focused pack. At program
closeout, run at minimum:

- `bun run validate:plan-pack -- <each-focused-pack>`
- The selected Q1/Q2 commands from `.ai/00_system/VALIDATION_MATRIX.md`
- Focused and full relevant Vitest suites with one worker where resource safety
  requires serialization
- Applicable local D1 migration/fix-forward rehearsals
- Authenticated Playwright journeys for material creation, variant selection,
  image upload, category movement, quotation/VAT, accessories, subtotals, reload,
  and collaboration
- `bun run test:e2e:perf` and `node scripts/check-performance-budgets.mjs` for
  measured loading work
- GitNexus `impact` before each production symbol change and `detect_changes`
  before completion; current-source callers are the degraded fallback while the
  index remains stale or missing FTS
- Independent read-only Q2 quality review, plus distinct security/data-boundary
  review where a child pack changes authorization, uploads, or persisted data

No unrun command, focused-only result, stale artifact, skipped critical journey,
or local evidence may be reported as stronger proof.

## Program Adversarial QA Matrix

Each focused pack owns executable details. The integrated UltraQA pass must
retain these hostile and boundary scenarios rather than stopping at build,
lint, typecheck, or happy-path browser checks.

| ID | User/failure model | Scenario | Required signal |
| --- | --- | --- | --- |
| ADV-01 | Low-vision, keyboard, and narrow-screen user | Exercise 100%, 110%, 200%, responsive widths, long labels, focus order, and enlarged hit targets after all columns land | No clipped critical action, hidden focus, overlap, or unreadable 8-9px control remains on representative Workshop journeys |
| ADV-02 | Cold and degraded navigation | Compare cold/warm hard refresh and client navigation with delayed D1, delayed dynamic chunks, cache miss, and hydration pressure | Stage timings identify the delay; skeleton/partial UI is truthful; canonical budgets pass without duplicate loading surfaces |
| ADV-03 | Stale or malicious option selection | Select archived/unknown variants, race two collaborators, change the future default after an existing row is selected, and retry after conflict | Server rejects stale IDs, one payable alternative remains selected, existing rows do not silently follow a changed default, and totals converge |
| ADV-04 | Duplicate catalogue author | Create case, whitespace, punctuation, and Unicode-equivalent brand/supplier names; archive one still referenced; edit from two users | Normalization and uniqueness are deterministic, references remain valid, authorization is enforced, and no browser-local split brain remains |
| ADV-05 | Failed material creation | Reproduce insert rejection with immediate queued edits, opaque Server Components text, retry, and reload | Dependent edits never reach the server, rollback is canonical, safe recovery copy renders, and a retry creates exactly one row |
| ADV-06 | Hostile or interrupted image upload | Use spoofed MIME, malformed bytes, 12-20 MB sources, oversized dimensions, abort/retry, pending row, stale session, and equivalent inline/modal inputs | Both entry points apply the same decision and asset contract, no partial asset leaks, and error text is actionable and accessible |
| ADV-07 | Invalid category movement | Move into a missing/archived/unauthorized folder, race two moves, refresh Project/Library catalogue views, then move an estimate row to another area | The canonical `library_folder_id` wins transactionally, the separately labelled area move changes only estimate-tree placement, and Direct Category never diverges into free text |
| ADV-08 | Invalid assembly graph | Attempt self-parenting, a multi-row cycle, a cross-area edge, partial cross-area movement, invalid formulas, parent deletion, copy/template propagation, and optional-child toggles | Cycles, cross-area edges, partial closure moves, and orphan writes fail closed; whole-assembly moves preserve one area; every child contributes at most once |
| ADV-09 | Partial and rapidly changing tree | Load row-limited branches, edit several descendants optimistically, collapse/expand, switch variants/options, and inject a failed save | Tree, center sheet, summary, and export converge; partial totals are labeled; stale precise values never masquerade as final |
| ADV-10 | Tax and rounding boundary | Exercise VAT Inclusive, VAT Exclusive, VAT Exempt, zero/invalid rates, fractional minor units, negative/overflow attempts, variant switches, accessories, and exports | Invalid inputs fail closed; rate/treatment snapshots survive reload; pre-VAT + VAT equals grand total under one documented rounding contract |
| ADV-11 | Misleading quotation state | Mark Available without an attachment, attach then archive/reject/scan-fail it, use a missing reference, and test unauthorized download | Business status stays independent; an unusable retained link projects attachment state `unavailable`, downloads fail closed, client summaries/exports expose `hasAttachment=false`, and private supplier documents remain protected |
| ADV-12 | Integrated double-count challenge | Combine one selected alternative, one excluded optional row, required and optional accessories, recursive subareas, VAT, contingency, and a sheet adjustment | One shared calculation oracle reconciles row, area, project, summary, and workbook totals with no duplicate contribution |

Generated fixtures or temporary browser/upload harnesses must be recorded and
cleaned. A success-looking UI or log with a failed request/exit code is a failed
scenario, not a pass.

## Risks

### RISK-001 - Optimization before diagnosis

Changing RSC, D1, dynamic imports, or caching without staged timing can move the
delay or regress correctness. UNIT-001 owns the baseline and decision receipt.

### RISK-002 - Existing incident remains only partially proven

The mutation repair is strong, but the authenticated browser journey is still a
real missing Q2 layer. UNIT-002 remains blocked rather than falsely ready.

### RISK-003 - Cross-pack data-model overlap

Brand/supplier IDs, Commercial-owned price-option VAT, row commercial data,
accessories, totals, and exports intersect. The dependency DAG and one-writer
ownership prevent competing schemas and calculators.

### RISK-004 - Tax interpretation or rounding error

VAT Inclusive, VAT Exclusive, and VAT Exempt must remain distinct and preserve
rate/rounding provenance. Philippine tax assumptions require explicit domain
fixtures and owner confirmation before any jurisdiction-specific default.

### RISK-005 - Double counting

Selected variants, alternatives, optional rows, required/optional accessories,
area descendants, and tax can be counted more than once if each surface rolls
up independently. All summaries consume one shared calculation contract.

### RISK-006 - Sheet overcrowding and accessibility regression

Variants, quotation, VAT, remarks, images, and subtotals add controls and
columns. Column visibility, responsive modes, keyboard order, and the final
readability pass are required.

### RISK-007 - Stale graph or shared-worktree evidence

GitNexus FTS is unavailable and the shared worktree contains unrelated changes.
Executors must reconcile current source/diff, preserve unfamiliar work, and not
interpret absent graph results as low impact.

## Resume State

- **Goal:** execute the client-feedback program without losing concern coverage
  or mixing domain semantics.
- **Next unit:** UNIT-001.
- **Parallel ready companions:** UNIT-002 and UNIT-003.
- **Dependency-bound unit:** UNIT-004 follows UNIT-003 for shared UI ownership;
  its non-overlapping server/controller preparation may start earlier.
- **Decision state:** DEC-AUTO-001 through DEC-AUTO-010 are active.
- **External boundary:** none required for local implementation/evidence.
- **Cleanup:** preserve all unrelated shared-worktree changes; close every
  worker lane and remove only task-owned temporary evidence after use.
- **Stale triggers:** changes to child pack status, estimate money/row/variant
  types, component-library projections, upload APIs, tree calculation contract,
  route loading protocol/budgets, migration allocation `0126`-`0129`, or the
  incident evidence summary require this DAG and traceability matrix to be
  reviewed again.

## Final Completion Audit

The program may become ACHIEVED only when:

1. FB-01 through FB-05 all retain exactly one primary focused pack.
2. REQ-001 through REQ-012 each map to a completed child unit and fresh evidence.
3. Every child manifest validates and its actual quality profile passes.
4. UNIT-002's browser gap is resolved without weakening the journey.
5. Variants, alternatives, optional items, and accessories remain distinct in
   types, calculations, UI, persistence, collaboration, and exports.
6. Pre-VAT, VAT, grand totals, area totals, and project totals reconcile from
   one calculation contract with no double counting.
7. The final Workshop UI passes readability, accessibility, responsive, and
   performance evidence after all new controls are integrated.
8. GitNexus/current-source blast radius and final diff show only expected
   execution flows for task-owned changes.
9. No safe in-scope work, active ownership, orphan lane, or task-owned cleanup
   remains.
10. Local proof is not represented as deployment or production proof.
