# Plan Pack — Material Variants and Value Engineering

## Status Tuple

- Profile: `Q2_CRITICAL_CHANGE_GATE` / high blast radius.
- Run scope: `PLAN_ONLY`; this pack changes no product code, tests, or migrations.
- Package status: `CONDITIONALLY_READY`.
- Implementation status: `NOT_STARTED`.
- Ready work: `UNIT-001` only. It may establish the red baseline and reconcile prerequisites; it may not implement product behavior.
- Hard prerequisite: `.ai/03_plans/2026-07-28/Material-Brand-Supplier-Category-Governance` must reach implementation `COMPLETE` with fresh Q2 evidence before `UNIT-002` can become `READY`.
- Reserved migration after that prerequisite: `migrations/0127_material_variants_value_engineering.sql`.
- Sequenced sibling ownership: governance owns `0126`, this pack owns `0127`, Commercial owns `0128`, and Assemblies owns `0129` at the observed baseline.
- First unit: `UNIT-001`.

### Current-source refresh — 2026-07-30

Stable price-option IDs and partial selection snapshots already exist, but rows
still lack typed selected-option identity and the selection intent omits several
option-owned non-VAT fields. The snapshot contract is explicitly the complete
pre-tax option-owned material/pricing state; Commercial `0128` alone owns VAT,
Remarks, and quotation data. Active edits overlap the mutation hook and must be
integrated rather than replaced.

## Outcome

Make one canonical material option selectable as an explicit row variant, restore its complete material-and-pricing snapshot atomically without overwriting row-owned estimating inputs, and persist alternatives and optional items as distinct value-engineering concepts. Every live total and export must consume one pure pre-tax effective-contribution resolver that remains ready for Commercial tax treatment and later assembly/accessory edges without duplicating either model.

## Task Contract

### Objective

Deliver an executable implementation plan for material variants, alternative groups, optional items, their D1 mutations, copy/template semantics, collaboration convergence, user controls, totals, and exports.

### In scope

- Extend and reuse `ComponentPriceOption`; do not introduce another option/variant object.
- Add `brandId` and `brand` to the canonical option and persist them at the option boundary after governance lands.
- Persist an explicit selected option for every linked row that exposes variants.
- Restore the complete selected-option material-and-pricing snapshot in one revision-checked row mutation.
- Preserve row-owned quantity, quantity contingency, money contingency, adjustment, and instance notes on variant changes.
- Persist alternative groups and optional-item inclusion independently from `scopeStatus`.
- Introduce the one pure effective-contribution resolver and route live totals and exports through it.
- Preserve graph/value-engineering identity across tab duplication, template authoring/insertion/propagation, history, receipts, collaboration, deletion, and moves.
- Add accessible authenticated-sheet controls and performance evidence.

### Non-goals

- No accessory edge persistence, assembly mutation, or BOM quantity-rule evaluator; `Material-Assemblies-And-Accessories` owns those in `0129`.
- No remarks, quotation state, VAT field, VAT rate, tax rounding, or tax total; `Commercial-Remarks-Quotations-And-VAT` owns those in `0128`.
- No replacement brand/supplier master model; the governance pack and existing `component_brands` / `component_suppliers` remain canonical.
- No repurposing of `scopeStatus`, which remains proposal/publication scope.
- No deployment, remote D1 application, feature flag, dual-write compatibility layer, rollout ceremony, or hosted claim.

### Authoritative inputs

- The assignment and migration corrections in this task.
- Root `AGENTS.md`, `.ai/AGENTS.md`, and the canonical Plan Pack suite/schema.
- `.ai/00_system/BETA_QUALITY_ENGINEERING_PROTOCOL.md` and `.ai/00_system/VALIDATION_MATRIX.md`.
- `.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md`.
- Sanitized raw client input: `.ai/03_plans/2026-07-28/Client-Feedback-Resolution-Program/evidence/client-feedback.md:1`, with material-editing feedback at `:20`, accessory feedback at `:28`, value-engineering feedback at `:33`, and the Commercial remarks/VAT boundary at `:41`; per `:8`, it is product input rather than technical root-cause proof.
- Current source, current migration inventory, current diff, and the validated incident-pack manifest shape.

### Constraints and authority

- Preserve all unfamiliar work. `src/hooks/use-estimate-row-mutations.ts:600` currently has unrelated incident changes; reread and merge around them rather than overwriting them.
- Run GitNexus upstream impact before editing each existing function/class during execution. A stale/unavailable index requires current-source callers and focused tests, not guessed impact.
- Local implementation and local D1 fixture work are authorized. Remote apply, deployment, destructive data loss, and unrelated resources are not.
- Before any implementation unit, inspect physical memory, active heavy jobs, `git status --short --branch`, current HEAD, the scoped diff, and migration inventory.

### Acceptance and stop

- Successful stop requires all units `VERIFIED`, every criterion/test/gate fresh `PASS`, the Q2 aggregate `PASS`, one independent read-only quality approval, one distinct security/data-boundary approval, and no unresolved high/critical finding.
- Missing, skipped, flaky, malformed, stale, or inherited-but-unattributed evidence fails closed.
- Stop before `UNIT-002` while governance is incomplete or migration ownership is ambiguous. Do not make downstream units ready merely because validator syntax permits it.

## Current Source Evidence

1. `src/lib/estimates/types.ts:49` defines `ComponentPriceOption`, including SKU, description, unit, unit cost, misc cost, currency, pricing provenance, source URL, notes, `supplierId`, cost history, package/dimensions/mass, images, attachments, metadata, lifecycle/default state, and timestamps through `:84`; it has no `brandId` or `brand`.
2. `src/lib/estimates/types.ts:96` defines row data. Quantity and contingency are at `:108`-`:115`, misc cost at `:116`, brand/supplier identity at `:126`-`:128`, option identity at `:140`-`:142`, instance notes at `:146`, pricing provenance at `:152`-`:153`, and `scopeStatus` at `:156`.
3. `src/components/workshop/estimate-sheet/rows/row-commit-intent.ts:159` builds selected-variant updates, but `:168`-`:180` currently restores only description, unit, unit cost, image, SKU, source/pricing, catalogue identity, and option IDs.
4. `src/lib/estimates/source-snapshot-price-options.ts:143`-`:218` already sanitizes the richer canonical option surface. This is the serialization boundary to extend, not replace.
5. `src/lib/repositories/component-library-repository.ts:164`-`:200` and `:727`-`:777` map D1 option rows; supplier identity exists, while option-level brand identity does not.
6. `src/lib/component-library/component-mutation-d1.ts:1552`-`:1672` preserves a selected option during linked-row sync and uses the default only when selection is absent. Its snapshot projection is narrower than `ComponentPriceOption`.
7. `src/lib/estimates/d1-intents/rows.ts:522`-`:540`, `:634`-`:650`, and `:715`-`:735` use narrow option signatures/projections and therefore cannot prove complete snapshot restoration.
8. `src/components/workshop/estimate-sheet/rows/cells.tsx:330`-`:355` currently falls back to a default/first option when an existing row lacks an explicit active ID. Persisted rows must instead surface a repair-required state.
9. `src/components/workshop/EstimateSheetContent.tsx:2609`-`:2643` and `src/hooks/use-estimate-row-mutations.ts:1248` onward form the optimistic-to-authoritative selection path.
10. `src/components/workshop/estimate-sheet/rows/editable-row-model.ts:391`-`:423` and `src/lib/estimates/estimate-row-total.ts:266`-`:305` sum flat rows directly. No value-engineering inclusion resolver exists.
11. `src/lib/proposal-export/build-proposal-export-model.ts:92`-`:151` and `src/lib/proposal-export/create-proposal-workbook.ts:334`-`:415` independently project/sum rows. `src/lib/proposal-export/types.ts:6` keeps `alternate` inside proposal scope vocabulary; that vocabulary must not become the estimate alternative-group model.
12. `src/lib/estimates/d1-intents/tabs.ts:521`-`:689` already creates `nodeIdBySource` and `rowIdBySource`, source guards, history/outbox entries, and one receipt for tab duplication.
13. `src/lib/estimates/d1-intents/templates.ts:499`-`:735` and `:983`-`:1453` already use template/estimate row maps and atomic insertion. `src/lib/component-library/template-editor-actions.ts:866` owns template-row writes and `src/lib/component-library/template-propagation-d1.ts:347` owns linked-row mapping.
14. `src/lib/estimates/estimate-tree-read-repository.ts:949`-`:978` loads flat rows by tab. Value-engineering relations should be a sidecar on that flat tree, not new area nodes.
15. `src/lib/collaboration/estimate-tree-realtime-contract.ts:3` declares realtime contract v2; `src/hooks/use-estimate-row-update-broadcast.ts:91` handles row broadcasts but not contribution-graph revisions.
16. `migrations/0026_component_promotion_support.sql:77` creates option persistence; `migrations/0028_component_library_action_support.sql:9` and `:27` create canonical supplier/brand masters; `migrations/0081_estimate_mutation_receipts.sql:4` supplies reusable receipts.
17. The active migration inventory ends at unfamiliar `0125_client_portal_cutover_barrier_lease.sql`. The governance pack reserves `migrations/0126_material_catalogue_governance.sql`; line-number anchors must be resolved from current source rather than the original planning line.
18. Current relevant diff includes `src/hooks/use-estimate-row-mutations.ts`, row-table/handler files, and estimate tests. The pending-row creation ordering and performance changes are outside this pack and must survive integration.

## Integrated Architecture Decisions

### `DEC-AUTO-001` — One canonical option model

`ComponentPriceOption` remains the only rich option type. Add nullable `brandId` and `brand`; do not create `MaterialVariant`, `VariantOption`, or a transport-specific duplicate. Narrow UI aliases must be direct picks/aliases of this type, never independently declared fields.

### `DEC-AUTO-002` — Explicit selection, future-only default

The component default is consulted only while creating a future row. The insert transaction stores the chosen option ID and complete snapshot. Reads, edits, component-default changes, and refetches never switch an existing row implicitly. A row with multiple options and no valid explicit selection fails closed as `selection_required`; it does not fall back to the current default.

### `DEC-AUTO-003` — Variant-owned versus row-owned data

The atomic selected-option snapshot includes option ID/label, variant description, SKU, unit, unit cost, misc cost, currency, pricing source/date, source URL, supplier ID, governance-resolved supplier display, brand ID/display, active cost-entry ID and cost history, package quantity/unit, dimensions, mass, image paths/metadata, attachment descriptors, variant notes, variant metadata, active/default state, sort order, and option timestamps.

The mutation must not change row quantity, quantity base/contingency amount, row contingency percentage/value, adjustment percentage/value, or row instance notes. Variant notes remain inside the selected-option snapshot and never overwrite `EstimateRowItem.notes`.

### `DEC-AUTO-004` — Separate persisted concepts

| Concept | Persisted meaning | Inclusion rule |
| --- | --- | --- |
| Variant | One canonical option explicitly selected for one row | Replaces the row's material-and-pricing snapshot; it is not additive |
| Alternative | A group of root rows with exactly one selected member | Only the selected root and its future descendants contribute |
| Optional item | A top-level root with an include/exclude checkbox | Exclusion zeros that root and its future descendants |
| Accessory | Later `0129` additive parent-child edge | Not persisted by this pack |
| `scopeStatus` | Proposal/publication scope | Remains independent from estimate inclusion |

An alternative member cannot simultaneously be an optional item. Group create/update/delete is atomic, so no committed group is empty or lacks exactly one selected member. Before `0129`, every row is an assembly root; `0129` adds the durable no-parent guard.

### `DEC-AUTO-005` — Scoped D1 sidecars and one revision

`migrations/0127_material_variants_value_engineering.sql` owns:

- Option-level brand columns consistent with completed governance schema.
- Typed explicit selected-option identity for estimate and template rows, with deterministic backfill from source snapshots.
- `estimate_contribution_scopes`, one revision row per workspace/project/estimate/tab.
- `estimate_alternative_groups` and `estimate_alternative_members`.
- `estimate_optional_items`.
- Template equivalents for alternative groups/members and optional items.
- Scope/uniqueness/index/trigger constraints needed for same-workspace/estimate/tab membership and mutually exclusive root roles.

The pack reuses `estimate_mutation_receipts`, `estimate_sheet_events`, history outbox, project publication revision, and existing row revisions. It creates no second receipt/history system.

### `DEC-AUTO-006` — Deterministic backfill

For linked rows with variant arrays, backfill explicit selection from the existing `priceOptionId`; if absent, choose only a unique option whose material-and-pricing signature matches the stored row snapshot. Ambiguous or invalid linked rows are reported by the migration characterization and remain blocked for explicit repair; they are never rebound to the current default. Unlinked/project-specific rows without an option graph remain valid with no selected option.

This pack supplies canonical selected-option identity only. Commercial `0128` may attach an option VAT sidecar and capture that pair during selection; it remains the sole owner of all VAT fields, row Remarks, and quotation facts.

### `DEC-AUTO-007` — One pure pre-tax contribution resolver

Create `src/lib/estimates/effective-contribution.ts:1` with a deterministic, side-effect-free resolver. Inputs are canonical row direct-cost results, alternative groups, optional items, and a generic list of already-evaluated additive edges reserved for `0129`. Outputs identify each row's effective direct contribution, effective quantity, root, inclusion reason, and presentation rollup.

- Direct cost contributes at most once.
- Presentation rollup may sum a root and descendants but is never added as another cost.
- An unselected alternative root or excluded optional root zeros its descendants.
- Malformed groups, duplicate membership, duplicate parents, missing rows, or cycles return a typed invalid result; callers cannot silently total partial data.
- `scopeStatus` filtering remains a separate proposal/publication stage.
- Output is pre-tax. Commercial may consume it in `0128`; this pack defines no tax property.

### `DEC-AUTO-008` — Atomic mutation and collaboration

Every selection, alternative, or optional mutation supplies stable intent identity, expected row/group/scope revision, and request fingerprint. One D1 batch performs guards, domain writes, scope revision increment, history, outbox, publication revision, and receipt. Realtime broadcasts carry tab ID, new contribution-scope revision, changed row IDs, and mutation ID; a revision gap triggers authoritative refetch.

### `DEC-AUTO-009` — Copy, template, delete, and move semantics

- Tab duplication and template authoring/insertion/propagation remap every group/member/optional row ID through existing maps in the same atomic mutation.
- A single-row duplicate creates a standalone root with no alternative/optional membership; a future explicit group/assembly duplicate command owns relation copying.
- Deleting a selected alternative requires an explicit replacement member or atomic deletion of the group; deleting the final member deletes the group.
- Deleting an optional row deletes its optional record in the same receipt/history batch.
- Existing within-tab row moves preserve value-engineering identity. Existing cross-tab moves remain rejected.

### `DEC-AUTO-010` — Migration serialization

Governance owns `0126`, Variants owns `0127`, Commercial owns `0128`, and Assemblies owns `0129`. Immediately before execution, list active migrations and active plan reservations. Any inventory drift makes this pack stale: rebaseline all four owners before editing a migration. Never take `0126`, `0128`, or `0129` opportunistically.

## Requirements

### `DATA-001` — Canonical option and migration

Governance is complete; `0127` extends the same option/master identities, adds explicit row/template selection and value-engineering sidecars, and passes empty/legacy/idempotency fixtures without rewriting immutable history.

### `REQ-001` — Complete atomic variant selection

Selecting a variant restores every variant-owned commercial field and preserves every row-owned estimating field across optimistic state, D1 commit, receipt replay, refetch, and collaboration.

### `REQ-002` — Future-only defaults

Component defaults choose future inserts only. Existing rows keep explicit IDs through default edits, option reorder/archive, template insertion, copy, and reload; unavailable selected options require explicit replacement.

### `REQ-003` — Alternatives and optional items

Persist and mutate alternative groups and optional roots independently, with exactly-one selection, top-level/mutual-exclusion rules, revisions, history, receipts, and denial of wrong-scope/stale requests.

### `REQ-004` — Effective-contribution parity

One pure pre-tax resolver drives editable totals, area/tab/project summaries, proposal models, and workbook totals with no duplicate direct cost and clear invalid-state refusal.

### `REQ-005` — Lifecycle integration

Tab copy, template authoring/insertion/propagation, row duplicate/delete/move, optimistic rollback, cache invalidation, and collaboration preserve or intentionally clear IDs according to `DEC-AUTO-009`.

### `UX-001` — Accessible controls

Authenticated sheet controls expose current variant, required-selection repair, exactly-one alternative selection, and optional include/exclude with keyboard, focus, screen-reader, responsive, and failure-state coverage.

### `OPS-001` — Q2 evidence

Red-before-green migration, unit, property, mutation, collaboration, browser, accessibility, performance, full relevant suite, and two independent reviews bind the exact final candidate.

## Acceptance Criteria

### `AC-001` — Migration and canonical option

`0127` applies to empty and representative pre-`0127` fixtures, backfills only deterministic selections, rejects cross-scope/ambiguous corruption, persists brand identity from governance, and passes migration inventory checks.

### `AC-002` — Selection snapshot and default semantics

A variant switch changes every variant-owned field in one committed revision while byte-for-byte preserving row quantity/contingency/adjustment/instance-note fields. Changing a component default changes no existing selected row.

### `AC-003` — Value-engineering persistence

Alternative and optional mutations are authorized, idempotent, revision checked, atomic with history/outbox/receipt, survive reload/copy/template/collaboration, and never reuse `scopeStatus`.

### `AC-004` — Calculation and export parity

For generated and hand-authored fixtures, the resolver includes one selected alternative, excludes optional roots when unchecked, counts each direct cost once, refuses malformed topology, and reconciles live, proposal, and XLSX pre-tax totals.

### `AC-005` — UI, accessibility, collaboration, performance

Controls work with keyboard and screen readers, optimistic failures restore prior state, revision gaps refetch, no stale default is displayed as selected, and resolver/UI measurements remain within the repository's current performance budgets.

### `AC-006` — Exact-candidate Q2 closeout

All focused and full relevant commands pass without skips/flakes, changed critical coverage and mutation gates pass, independent quality and distinct security/data reviewers approve the same candidate hash, and `quality:critical` reports `PASS`.

## Dependency DAG

```text
UNIT-001 Baseline, prerequisites, red contracts
    -> governance pack COMPLETE + 0126 validated
        -> UNIT-002 Canonical option + 0127 migration
            -> UNIT-003 Atomic selection path
            -> UNIT-004 Alternatives/optional lifecycle
                -> UNIT-005 Resolver, UI, collaboration, exports
                    -> UNIT-006 Q2 reconciliation and reviews
```

Only `UNIT-001` is currently `READY`. `UNIT-002` through `UNIT-006` remain `PLANNED`. After `UNIT-001`, an executor may mark `UNIT-002` ready only when the governance manifest and exact evidence say `COMPLETE`/`PASS`, `0126` is present and validated, migration inventory still assigns `0127` here, and current-source anchors are refreshed.

## Execution Units

### `UNIT-001` — Reconcile prerequisites and establish red evidence

- Status: `READY`.
- Depends on: none.
- Exact ownership during execution: new tests only — `tests/vitest/material-variants-value-engineering-migration.test.ts:1`, `tests/vitest/material-variant-selection-snapshot.test.ts:1`, `tests/vitest/estimate-value-engineering-d1.test.ts:1`, `tests/vitest/effective-contribution-resolver.test.ts:1`, `tests/property/effective-contribution.property.test.ts:1`, and `e2e/material-value-engineering.spec.ts:1`.
- Work: capture HEAD/status/diff/migration reservations; reread governance manifest/evidence; write focused tests first; run them to produce expected behavioral failures caused by missing `0127`/implementation, not syntax, fixture, or environment errors.
- Dependency gate: do not edit migration or product source. If governance is not complete/fresh, retain downstream `PLANNED` status and stop at the gate.
- Evidence: `TEST-001`; JSON shows only named missing behavior failing and zero skipped tests.
- Recovery: repair malformed red tests with `apply_patch`; never weaken assertions to manufacture the expected red state.

### `UNIT-002` — Extend canonical options and author `0127`

- Status: `PLANNED`.
- Depends on: `UNIT-001` plus completed governance pack.
- Exact ownership: `migrations/0127_material_variants_value_engineering.sql:1`, `src/lib/estimates/types.ts:49`, `src/lib/estimates/source-snapshot-price-options.ts:143`, `src/lib/repositories/component-library-repository.ts:164`, `src/lib/repositories/component-library-repository.ts:727`, `src/lib/component-library/component-mutation-d1.ts:925`, `src/lib/component-library/template-editor-actions.ts:866`, and the migration test from `UNIT-001`.
- Work: add brand fields to `ComponentPriceOption` and D1 mappings; add explicit row/template selected option; create scoped alternative/optional tables and indexes/triggers; implement deterministic backfill and characterization.
- Migration boundary: re-resolve migration inventory immediately before edit. Before any bound apply, repair `0127` in place. After any apply, never edit it; use the next free fix-forward migration after rebaselining all owners. Never claim `0126`, `0128`, or `0129`.
- Evidence: empty, representative legacy, ambiguous, cross-workspace, duplicate-membership, idempotency, and migration-check fixtures turn green.
- Recovery: a failed local fixture leaves no external state; patch forward. A bound-apply defect requires a new fix-forward migration and plan refresh.

### `UNIT-003` — Complete the atomic variant-selection path

- Status: `PLANNED`.
- Depends on: `UNIT-002`.
- Exact ownership: `src/components/workshop/estimate-sheet/rows/row-commit-intent.ts:54`, `src/components/workshop/estimate-sheet/rows/row-commit-intent.ts:159`, `src/components/workshop/estimate-sheet/rows/editable-row-store.ts:444`, `src/components/workshop/EstimateSheetContent.tsx:2609`, `src/lib/estimates/d1-intents/rows.ts:522`, `src/lib/estimates/d1-intents/rows.ts:634`, `src/lib/estimates/d1-intents/rows.ts:715`, `src/hooks/use-estimate-row-mutations.ts:600`, and selection tests from `UNIT-001`.
- Work: project the complete pre-tax option-owned material/pricing snapshot; keep variant notes nested; preserve row-owned fields; add explicit-selection repair; update optimistic rollback, source signatures, row receipts, linked component propagation, and removed-option replacement. Do not add VAT, Remarks, or quotation fields.
- Evidence: selected-option tests cover all fields, stale revisions, receipt replay, default changes, archive/replacement, optimistic failure, refetch, and preservation assertions.
- Recovery: failed optimistic state restores the entire prior row; retry uses the same coordinator/intent identity. Reread the incident-owned hook diff immediately before patching.

### `UNIT-004` — Add alternative and optional lifecycle integration

- Status: `PLANNED`.
- Depends on: `UNIT-002`.
- Exact ownership: new `src/lib/estimates/value-engineering.ts:1`, new `src/lib/estimates/d1-intents/value-engineering.ts:1`, `src/lib/estimates/actions.ts:1`, `src/lib/estimates/estimate-tree-read-repository.ts:949`, `src/lib/estimates/d1-intents/rows.ts:2079`, `src/lib/estimates/d1-intents/rows.ts:2537`, `src/lib/estimates/d1-intents/rows.ts:2647`, `src/lib/estimates/d1-intents/rows.ts:2764`, `src/lib/estimates/d1-intents/tabs.ts:521`, `src/lib/estimates/d1-intents/templates.ts:499`, `src/lib/component-library/template-editor-actions.ts:866`, and `src/lib/component-library/template-propagation-d1.ts:347`.
- Work: implement authorized CAS mutations; read sidecars with flat rows; history/outbox/receipt; explicit delete/duplicate/move behavior; tab and template ID remap; linked-template propagation; project publication revision.
- Evidence: wrong workspace/estimate/tab, stale revision, replay, exactly-one selection, role collision, copy/remap, template propagation, deletion replacement, and move cases pass with zero partial writes.
- Recovery: every mutation is one guarded D1 batch. On ambiguous failure, read the committed receipt; otherwise refetch the scope revision before retry.

### `UNIT-005` — Integrate the resolver, UI, collaboration, and exports

- Status: `PLANNED`.
- Depends on: `UNIT-003`, `UNIT-004`.
- Exact ownership: new `src/lib/estimates/effective-contribution.ts:1`, `src/lib/estimates/estimate-row-total.ts:199`, `src/components/workshop/estimate-sheet/rows/editable-row-model.ts:289`, `src/components/workshop/estimate-sheet/rows/cells.tsx:330`, new `src/components/workshop/estimate-sheet/value-engineering-controls.tsx:1`, `src/components/workshop/EstimateSheetContent.tsx:2609`, `src/lib/collaboration/estimate-tree-realtime-contract.ts:3`, `src/hooks/use-estimate-row-update-broadcast.ts:91`, `src/lib/proposal-export/build-proposal-export-model.ts:92`, `src/lib/proposal-export/create-proposal-workbook.ts:334`, and `src/lib/proposal-export/types.ts:6`.
- Work: implement pure resolver and invalid-state contract; route all totals through it; add pre-tax Commercial and additive-edge extension points; add accessible controls; broadcast scope revisions; render/export selected/unselected/optional state without changing proposal scope semantics.
- Evidence: example/property no-double-count tests, calculation-output parity, collaboration gap/refetch, component/a11y tests, browser journey, workbook formula/value inspection, and benchmark comparison pass.
- Recovery: resolver invalidity blocks totals/exports with a typed error; no caller falls back to flat summation. UI failures restore authoritative state and focus.

### `UNIT-006` — Reconcile exact-candidate Q2 evidence

- Status: `PLANNED`.
- Depends on: `UNIT-005`.
- Exact ownership: implementation-created machine-readable files under `artifacts/quality/`; no product edits except repairs proven necessary by failed evidence.
- Work: run focused-to-broad evidence serially, inspect artifacts, run changed mutation and critical mutation where calculation branches are selected, run browser/a11y/performance, obtain independent read-only quality and distinct security/data reviews, run GitNexus/diff reconciliation, then run Q2 aggregate.
- Evidence: `TEST-006` and `GATE-Q2` become `PASS` only from fresh exact-candidate artifacts.
- Recovery: repair only task-owned failures, rerun the narrow invalidated command, then rerun aggregate/reviews if candidate hash changed. Unrelated failures remain attributed and block only when required by Q2.

## Adversarial Evidence Matrix

| Challenge | Required signal |
| --- | --- |
| Default changes after row insert | Existing row keeps its explicit option ID and snapshot; only a new insert receives the new default |
| Variant switch with customized quantity/notes | All option-owned fields change; quantity, contingencies, adjustment, and instance notes remain identical |
| Removed selected option | Mutation rejects without explicit replacement; no implicit default fallback |
| Alternative race | One CAS winner, one stale conflict, exactly one selected member, one history/receipt per committed intent |
| Optional versus `scopeStatus` | Toggling optional inclusion changes working contribution only; proposal scope remains unchanged |
| Copy/template remap | Every copied relation points only to newly mapped in-scope rows; no source IDs leak |
| Malformed topology | Resolver returns typed invalidity and totals/exports fail closed |
| Additive synthetic edge | Parent rollup displays descendants while aggregate counts each row direct cost once |
| Collaboration gap | Noncontiguous graph revision triggers refetch rather than last-write-wins merge |
| Export parity | Live, proposal, and XLSX pre-tax totals and inclusion reasons reconcile exactly |

## Tests and Exact Evidence Commands

Run serially from the repository root after confirming no other heavy command is active.

### `TEST-001` — Red baseline and migration

```powershell
bun x vitest run tests/vitest/material-variants-value-engineering-migration.test.ts tests/vitest/material-variant-selection-snapshot.test.ts tests/vitest/estimate-value-engineering-d1.test.ts tests/vitest/effective-contribution-resolver.test.ts --maxWorkers=1 --reporter=json --outputFile=artifacts/quality/material-variants-red.json
```

Expected before green: nonzero exit caused only by named absent variant/value-engineering behavior, with zero skipped/malformed tests. After `UNIT-002`-`UNIT-005`: exit `0`, zero failed/skipped tests.

### `TEST-002` — Canonical snapshot and D1 mutation

```powershell
bun x vitest run tests/vitest/source-snapshot-price-options.test.ts tests/vitest/material-variant-selection-snapshot.test.ts tests/vitest/estimate-value-engineering-d1.test.ts tests/vitest/estimate-actions-d1-reorder-history.test.ts tests/vitest/estimate-template-trusted-insert.test.ts --maxWorkers=1 --reporter=json --outputFile=artifacts/quality/material-variants-d1.json
bun run dev:check-d1-migrations
```

Expected: exit `0`; complete snapshot/preservation/default/replay/copy/template assertions pass; migration inventory recognizes `0127_material_variants_value_engineering.sql` after governance `0126` and before Commercial `0128`.

### `TEST-003` — Calculation and property evidence

```powershell
bun x vitest run tests/vitest/effective-contribution-resolver.test.ts tests/vitest/estimate-row-total.test.ts tests/vitest/calculation-output-parity.test.ts tests/vitest/proposal-value-engineering-parity.test.ts --maxWorkers=1 --reporter=json --outputFile=artifacts/quality/material-value-engineering-calculation.json
bun run test:property
```

Expected: exit `0`; property artifact includes generated alternatives/optionals/synthetic additive edges, no duplicate direct contribution, deterministic order invariance, descendant zeroing, and fail-closed malformed graphs.

### `TEST-004` — Collaboration, UI, and accessibility

```powershell
bun x vitest run tests/vitest/project-collaboration-tree-contract.test.ts tests/vitest/estimate-row-update-broadcast.test.ts tests/vitest/estimate-value-engineering-ui.test.tsx tests/vitest/activity-accessibility.test.tsx --maxWorkers=1 --reporter=json --outputFile=artifacts/quality/material-value-engineering-ui.json
bun run test:a11y
```

Expected: exit `0`; stale/gapped revisions refetch, keyboard/focus/labels/announcements pass, and no inaccessible hidden inclusion state remains.

### `TEST-005` — Browser and performance

```powershell
bun x playwright test e2e/material-value-engineering.spec.ts --workers=1 --reporter=json > artifacts/quality/material-value-engineering-playwright.json
bun run perf:profile-peak-load
bun run test:e2e:perf
bun run quality:bundle-budget
```

Expected: configured browser journeys pass without retries/skips; save/reload/copy/template/export flows preserve state; current repository route, interaction, and bundle budgets remain green.

### `TEST-006` — Full relevant Q2 candidate

```powershell
bun run type-check
bun run lint -- src/lib/estimates/types.ts src/lib/estimates/source-snapshot-price-options.ts src/lib/repositories/component-library-repository.ts src/lib/component-library/component-mutation-d1.ts src/lib/component-library/template-editor-actions.ts src/lib/component-library/template-propagation-d1.ts src/lib/estimates/value-engineering.ts src/lib/estimates/effective-contribution.ts src/lib/estimates/d1-intents/value-engineering.ts src/lib/estimates/d1-intents/rows.ts src/lib/estimates/d1-intents/tabs.ts src/lib/estimates/d1-intents/templates.ts src/lib/estimates/estimate-tree-read-repository.ts src/lib/estimates/estimate-row-total.ts src/lib/estimates/actions.ts src/components/workshop/estimate-sheet/rows/row-commit-intent.ts src/components/workshop/estimate-sheet/rows/editable-row-store.ts src/components/workshop/estimate-sheet/rows/editable-row-model.ts src/components/workshop/estimate-sheet/rows/cells.tsx src/components/workshop/estimate-sheet/value-engineering-controls.tsx src/components/workshop/EstimateSheetContent.tsx src/hooks/use-estimate-row-mutations.ts src/lib/collaboration/estimate-tree-realtime-contract.ts src/hooks/use-estimate-row-update-broadcast.ts src/lib/proposal-export/build-proposal-export-model.ts src/lib/proposal-export/create-proposal-workbook.ts src/lib/proposal-export/types.ts
bun run build
bun run quality:diff-coverage
bun run test:mutation:changed
bun run test:mutation:critical
bun run test:e2e:smoke
bun run test:e2e:matrix
bun run quality:reviews
bun run quality:security
bun run quality:critical
git diff --check
```

Expected: every command exits `0`; machine-readable artifacts name `Q2_CRITICAL_CHANGE_GATE`; changed critical branches have required coverage and no surviving high-risk mutant; independent quality and distinct security/data reviews approve the same candidate; aggregate status is `PASS`; diff check is empty.

Before each existing-symbol edit run its upstream impact. Before closeout run `detect_changes({scope: "compare", base_ref: "main"})`; only planned variant/value-engineering, migration, UI, export, and evidence flows may appear.

## Risks

| ID | Risk | Mitigation |
| --- | --- | --- |
| `RISK-001` | Migration ownership drifts | Re-list files and active reservations immediately before execution; stale/rebaseline rather than taking another pack's number |
| `RISK-002` | Governance schema differs from planned option brand mapping | Require governance completion and reread final `0126`, repository types, and evidence before making `UNIT-002` ready |
| `RISK-003` | Snapshot restoration overwrites estimator-owned work | Central field-ownership projector plus byte-preservation tests across optimistic, D1, replay, and refetch paths |
| `RISK-004` | Existing rows silently follow a new default | Typed explicit selection, deterministic migration, no read-time fallback, explicit repair/replacement UX |
| `RISK-005` | Alternative/optional semantics collide with proposal scope | Separate tables/types/events; no `scopeStatus` write from value-engineering commands |
| `RISK-006` | Totals or exports double count | One resolver, presentation-only rollups, property/mutation/parity evidence, fail-closed invalid graphs |
| `RISK-007` | Shared hook edits are lost | Reread current diff before patching and preserve incident-owned queue/error changes |
| `RISK-008` | Copy/template leaves source IDs or partial relations | Existing row maps extended in the same guarded batch with source drift fingerprints and receipts |
| `RISK-009` | Realtime out-of-order state appears authoritative | Monotonic contribution-scope revision; gaps trigger refetch |

## Recovery and Resume

1. Resume at `UNIT-001`; record HEAD, status, scoped diff hashes, migration inventory, governance manifest/evidence hashes, and host health.
2. Run red tests first. A syntax/import/fixture failure is not acceptable red evidence; repair it until failures name missing behavior.
3. If governance is incomplete, stale, or its final schema differs, leave `UNIT-002`-`UNIT-006` `PLANNED` and return the exact dependency finding. Do not bypass it.
4. After governance completes, refresh this plan/manifest hashes and current line anchors, then promote only `UNIT-002` to `READY`.
5. Before local/bound apply, `0127` may be repaired. After any bound apply, use a new fix-forward migration; never edit issued SQL.
6. On D1 ambiguity, read the mutation receipt before retry. On revision conflict, refetch scope/row state and require a new explicit user action.
7. After any candidate change, invalidate affected test/review/aggregate artifacts and rerun from the narrowest failed layer.

## Stale Triggers

1. Migration inventory or active reservations no longer serialize governance `0126`, variants `0127`, Commercial `0128`, assemblies `0129`.
2. `migrations/0127_material_variants_value_engineering.sql` already exists from another owner.
3. Governance's final `0126`, canonical master schema, package status, or evidence hash changes.
4. `ComponentPriceOption`, selected-option projection, row mutation coordinator, receipt/history schema, read repository, totals, export, template, or collaboration contracts change.
5. The unfamiliar `src/hooks/use-estimate-row-mutations.ts` diff changes before integration.
6. Commercial introduces tax fields into the contribution input rather than consuming the pre-tax output.
7. Assembly work begins to persist edges before this resolver/value-engineering contract lands.
8. Current source, HEAD, or scoped diff no longer matches the recorded baseline.

On any trigger, stop, reread current source/diff and all four migration owners, re-resolve numbering immediately, refresh anchors/DAG/evidence, regenerate manifest hashes, and revalidate. Do not silently continue with stale numbers.

## Stop Condition

Stop only when one canonical option model carries governance brand identity; every linked row selection is explicit; complete option-owned snapshots restore atomically without touching estimator-owned fields; alternatives and optional roots persist separately from proposal scope; one pre-tax resolver reconciles live and export totals without double counting; copy/template/history/receipts/collaboration are coherent; and fresh Q2 evidence plus both independent reviews pass. Do not deploy or claim hosted behavior.
