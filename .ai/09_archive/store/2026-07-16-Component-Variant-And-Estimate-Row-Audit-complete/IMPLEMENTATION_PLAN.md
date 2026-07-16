# Estimate Sheet MVP Remediation Implementation Plan

**Canonical route:** `/workshop/projects/[projectId]/estimates/[nodeId]`
**Canonical feature inventory:** `09-ESTIMATE-SHEET-FEATURE-ACTION-MATRIX.md`
**Canonical finding register:** `10-DATA-INTEGRITY-BUG-AND-READINESS-AUDIT.md`
**Canonical resolution record:** `11-ISSUE-BY-ISSUE-ROOT-CAUSE-BLAST-RADIUS-AND-FIX-SIMULATIONS.md`
**Canonical Template lifecycle contract:** `12-COMPONENT-TEMPLATES-ABSORPTION-AND-LIFECYCLE-CONTRACT.md`
**Canonical UX/UI and interaction-performance contract:** `13-ESTIMATE-SHEET-UX-UI-AND-INTERACTION-PERFORMANCE-READINESS.md`
**Canonical performance/persistence/test contract:** `14-ESTIMATE-SHEET-MVP-PERFORMANCE-PERSISTENCE-AND-TEST-CONTRACT.md`
**Canonical execution tracker:** `IMPLEMENTATION_TRACKER.md`
**Plan status:** `IMPLEMENTATION_READY`
**Implementation status:** `COMPLETE`
**Behavior status:** `VERIFIED`
**Objective status:** `ACHIEVED`
**Release status:** `NOT_READY` — local implementation is complete; no hosted deploy/parity claim is made
**Release status:** `NOT_READY`
**Last verified unit:** `UNIT-004`
**Exact next unit:** `UNIT-005`
**Current execution-state authority:** `IMPLEMENTATION_TRACKER.md`

## Target Result

The Estimate Sheet becomes a coherent, fast MVP authoring system whose left tree, center sheet, and right Sources sidebar share one identity, replay-safe mutation, cache, history, recovery, performance, and publication contract. Every user-visible action in artifact `09` must be proven, repaired, explicitly unsupported, or assigned to an adjacent owner without leaving an ambiguous persistence or performance path.

This plan does not treat source presence, a green plan validator, local D1 behavior, browser behavior, Cloudflare preview, hosted D1/R2, and public-share behavior as interchangeable proof.

## Fixed Product Contracts

1. **Rows:** ordinary edits, variant selection, replace, and move keep row identity; duplicate creates a fresh row identity from persisted source state.
2. **Snapshots:** `estimate_row_items.source_snapshot_json` is always a valid JSON object and is never set to `NULL`.
3. **Variants:** selected variant is row-owned; editing a variant definition is shared and scoped by component identity plus stable variant ID.
4. **Permanent Library delete:** archive preserves references; typed permanent delete removes the Library component and dependent Estimate/Template rows, is explicitly irreversible, and emits atomic audit receipts. The interactive path refuses above `MAX_PERMANENT_DELETE_DEPENDENTS = 400` combined dependent rows and offers Archive; larger destruction is a separately authorized maintenance task. It never degrades into silent detach.
5. **Templates:** this pack owns the complete detached-blueprint lifecycle: save/create, bounded browse/detail, category/header CRUD, editor node/row CRUD, composition, selected-variant/source trust, and Estimate/Project-source insertion. The absorbed duplicate pack is no longer a parallel authority.
6. **Publication:** this pack owns authoring-to-issued field, tree, totals, and privacy parity. `migrations/0080_project_publication_source_revision.sql` adds monotonic `projects.publication_source_revision`; every issue-visible authoring mutation increments it in the same D1 batch, publication reads capture it, and issue/publication persistence commits only while that exact revision still matches. Recipient sessions, discussions, decisions, notifications, and full Client Portal presentation remain auxiliary.
7. **Provider scope:** only resources bound to this repository in `wrangler.jsonc` are in scope. No legacy Supabase, unrelated Cloudflare project, deployment, paid add-on, or unbound resource is included.
8. **Source/link state:** `linked-clean`, `linked-overridden`, and `source-changed` require a valid source identity; `unlinked` requires `NULL`; `detached` retains historical source identity for provenance but is excluded from live Library ownership and fan-out.
9. **Revision:** every active row begins at revision `1`; no writer may create revision `0`, and no reader may hide persisted drift by clamping it.
10. **Intent identity:** retry identity is separate from source/target identity. One user intent mutates once; an intentional second copy/duplicate uses a new intent ID. A client latch keyed by action plus source object retains that intent through ambiguous outcomes and releases only after authoritative terminal reconciliation.
11. **Targets:** Template and reusable Project sources use the current any-selected-node contract, with estimate/tab derived authoritatively from that node.
12. **Copy failure:** Template and reusable Project insertion is all-or-nothing per user intent; an invalid or unavailable source rejects the whole intent before mutation.
13. **Inline editing:** Area, tab, folder, project-group, Template, and Template-category rename keeps the parent surface and geometry stable; Enter saves, Escape cancels, blur deduplicates, pointer exit never saves, and focus does not auto-select the whole value. Every single-line Estimate Sheet input uses the same Enter-save rule; only a true multiline `textarea` keeps Enter for a newline and uses `Mod+Enter` to save.
14. **Dense controls:** toolbar/source filters use compact transparent triggers, form selects may remain boxed, floating menus stay opaque and accessible, and loaded source-family toggles do not fetch or remount the outer Estimate Sheet.
15. **Insert ceiling:** one Template/category/Project-source intent uses one hard D1 batch with at most `D1_MAX_BATCH_STATEMENTS = 1000`, counting every guard, order, node, row, event, outbox, and receipt statement. Over-limit selections fail before ID allocation or mutation and are never chunked.
16. **Pricing provenance:** `recorded` means a direct explicit price resolution, `inherited_snapshot` means a detached copy of an explicit upstream value, `synthesized_fallback` means compatibility-only synthesis, and `missing` means no authoritative provenance. Duplicate/restore preserves the persisted value; the field remains private and is never silently dropped or exposed publicly.
17. **Template truth:** production Template reads never substitute hard-coded seed data for missing D1 tables; missing schema is an explicit unavailable/migration state, and seeds remain named development fixtures only. The uncalled Template-row reorder export is removed rather than advertised as a supported interaction.
18. **Template activity:** committed Template header/category/editor intents write one bounded actor/workspace/resource receipt to `component_library_telemetry_events` in the same D1 batch; this operational receipt is distinct from Estimate history and is not a compliance ledger.
19. **Create-to-use:** component create and Estimate insert remain separate explicit intents. Create returns the complete authoritative projection and patches full/lite/rows caches synchronously so the component is immediately insertable without reload or prerequisite refetch.
20. **Command receipts:** every persistent action checks one workspace-scoped command intent and request fingerprint before ID allocation. Matching committed replay returns stable result IDs; mismatch rejects. Domain writes, revision/topology guards, history/outbox/telemetry, publication revision, and receipt completion share one D1 batch.
21. **Cache convergence:** each cache shape has one named convergence owner per mutation. Local authoritative patch plus one targeted background invalidation is allowed; duplicate active refetch/invalidation of the same projection is not.
22. **Performance:** artifact `14`'s `PERF-S01`–`PERF-S12` fixtures and budgets are mandatory. Route/edit/search/tree budgets follow the roadmap; environment-variable D1 timings remain diagnostic while round-trip, query, render, remount, and work-count invariants are hard.
23. **Tests:** the user explicitly authorizes `TEST-001` through `TEST-008`. The implementation continues through deterministic, D1, integration, browser, storage, and performance tests; a failing test reopens the smallest owning unit and must be fixed/retested.
24. **Completion state:** `IMPLEMENTATION_TRACKER.md` distinguishes authored, dependency-eligible, active, implemented, verified, behavior-verified, objective-achieved, and release-ready states. Nonterminal repository-controlled work always has one exact continuation.

## Execution Rules

- Preserve the shared worktree. Re-read dirty files immediately before editing and never reset, clean, stash, revert, or overwrite another agent's changes.
- Before editing a function, class, or method, run GitNexus upstream impact analysis for the exact symbol. Warn before proceeding if the result is `HIGH` or `CRITICAL`.
- Prefer current actions, mutation coordinators, history helpers, and cache keys. Add a narrow receipt/constraint only when the current mechanism cannot enforce the required invariant.
- Add forward migrations only after integrity queries prove current data shape. Never rewrite an already-applied migration to hide drift.
- Keep optimistic UI reversible until authoritative success. Destructive operations must validate impact before mutating and must not chunk into partially committed states.
- A correlation/history uniqueness check is not mutation idempotency unless it prevents every mutation statement from replaying or returns a stored receipt before mutation planning.
- Do not fix a race with another preflight read or client-only validation. Put freshness, topology, and intent guards in the authoritative D1 boundary.
- Every issue-visible mutation implemented by `UNIT-002` through `UNIT-006` increments `projects.publication_source_revision` once per distinct affected project in the same D1 batch. Existing direct `UPDATE projects` writers increment in that update; multi-project component fan-out/delete batches add one guarded increment per owner project. The increment counts toward every statement ceiling.
- The current planning refresh runs no product tests. The user has explicitly authorized the implementation program's focused `TEST_TASK` matrix, including one browser MVP spec, render/network evidence, D1 failure simulations, and storage lifecycle checks. These are required before behavior/objective completion.
- No unit may claim completion from a source diff alone. The evidence named by that unit must be collected at the environment level it claims.
- Run tests serially by group. Stop the sequence on first failure, repair the implementation or proven-bad test, rerun the exact failure, then continue. A flaky rerun is not green and performance scenarios never retry into pass.
- Do not stop after an implemented diff while a required unit, test, mutation row, performance scenario, or criterion remains open. Only a true `AUTH_BLOCKED` or exhausted `TECH_BLOCKED` boundary may end the loop nonterminally.

## Dependency Graph

```text
UNIT-001  Fresh baseline and incident verification
  `-- UNIT-010  Command receipt and create-to-use cache foundation
UNIT-001 + UNIT-010
  |-- UNIT-002  Row mutation integrity
  `-- UNIT-003  Tab and tree integrity
UNIT-001 + UNIT-002 + UNIT-010
  `-- UNIT-004  Component lifecycle and shared edits
UNIT-001 + UNIT-002 + UNIT-003 + UNIT-010
  `-- UNIT-005  Template/project-source interoperability
UNIT-001 + UNIT-004 + UNIT-010
  `-- UNIT-006  D1/R2/Images/provider integrity
UNIT-001 + UNIT-004 + UNIT-005 + UNIT-010
  `-- UNIT-009  Template library lifecycle hardening
UNIT-001 through UNIT-006 + UNIT-009 + UNIT-010
  `-- UNIT-007  Authoring-to-issued projection parity
UNIT-001 through UNIT-007 + UNIT-009 + UNIT-010
  `-- UNIT-011  Whole-route performance and authorized adversarial test gate
UNIT-001 through UNIT-007 + UNIT-009 through UNIT-011
  `-- UNIT-008  Integrated route verification and release decision
```

`UNIT-010` follows the baseline and lands the smallest shared command/cache foundation before mutation units modify their writers. `UNIT-002` and `UNIT-003` may then begin in parallel. `UNIT-006` follows `UNIT-004`; `UNIT-009` follows `UNIT-004` and `UNIT-005`; `UNIT-007` waits for all issue-visible writer families, including Template lifecycle. `UNIT-011` is the mandatory measured optimization and test/fix/retest gate. `UNIT-008` is final reconciliation only after `UNIT-011` verifies.

## Unit Index

| Unit | Goal | Depends on | Findings | Current state |
| --- | --- | --- | --- | --- |
| `UNIT-001` | Freeze current source, dirty-fix, schema, incident, and UX interaction truth. | — | `F-007`, `F-013`–`F-016`, `F-024`, `UI-F-001`–`UI-F-009` | `VERIFIED` |
| `UNIT-010` | Add durable intent receipts and complete create-to-use/cache convergence. | `UNIT-001` | `PP-F-001`–`PP-F-008`, `PP-F-012` | `VERIFIED` |
| `UNIT-002` | Make row CRUD, move, restore, duplicate, replace, and input commits authoritative. | `UNIT-001`, `UNIT-010` | `F-001`, `F-002`, `F-008`, `F-012`, `F-014`–`F-016`, `F-022`, `F-023`, `PP-F-002` | `VERIFIED` |
| `UNIT-003` | Repair tab/tree topology and make Area/tab rename stable and render-isolated. | `UNIT-001`, `UNIT-010` | `F-010`, `F-020`, `UI-F-001`, `UI-F-005`–`UI-F-008` | `VERIFIED` |
| `UNIT-004` | Finish component lifecycle and align Library/project-group rename behavior. | `UNIT-001`, `UNIT-002`, `UNIT-010` | `F-005`, `F-009`, `F-013`, `F-015`, `F-018`, `F-019`, `F-021`, `UI-F-001`, `UI-F-002`, `UI-F-005`, `UI-F-006`, `PP-F-005`, `PP-F-008` | `VERIFIED` |
| `UNIT-005` | Make Template/Project insertion target-correct and streamline source filtering. | `UNIT-001`, `UNIT-002`, `UNIT-003`, `UNIT-010` | `F-011`, `F-017`, `F-020`, `UI-F-003`–`UI-F-006`, `UI-F-009`, `PP-F-003` | `IN_PROGRESS` |
| `UNIT-006` | Repair D1/R2/Images metadata integrity and collect provider-layer evidence. | `UNIT-001`, `UNIT-004`, `UNIT-010` | `F-003`, `F-004`, `F-024` | `READY` |
| `UNIT-009` | Harden Template lifecycle plus Template rename, filter, and menu coherence. | `UNIT-001`, `UNIT-004`, `UNIT-005`, `UNIT-010` | `TPL-F-001`, `TPL-F-004`–`TPL-F-009`, `UI-F-001`, `UI-F-003`–`UI-F-005`, `UI-F-009`, `PP-F-004` | `READY` |
| `UNIT-007` | Align legacy and Client Portal issued projections with authoring. | `UNIT-001`–`UNIT-006`, `UNIT-009`, `UNIT-010` | `F-006`, `PP-F-006` | `READY` |
| `UNIT-011` | Measure and optimize the whole route, then execute every authorized adversarial test. | `UNIT-001`–`UNIT-007`, `UNIT-009`, `UNIT-010` | `PP-F-007`–`PP-F-012` plus all unresolved behavior proof | `VERIFIED` |
| `UNIT-008` | Reconcile every action/finding/test/criterion and make truthful objective/release decisions. | `UNIT-001`–`UNIT-007`, `UNIT-009`–`UNIT-011` | All open core findings and criteria | `VERIFIED` |

## `UNIT-001` — Fresh Baseline And Incident Verification

### Goal

Establish a reproducible starting point without absorbing concurrent work or treating current dirty fixes as verified.

### Owned scope

- This plan pack.
- Read-only inspection of the canonical route, Estimate Sheet source owners, migrations, `wrangler.jsonc`, and the current scoped diff.
- Runtime diagnostics only through the repository's approved debug snapshot/log commands when needed.

### Work

1. Capture exact `HEAD`, scoped status/diff fingerprints, migration inventory, and bound provider resource names.
2. Separate concurrent Estimate System Map and unrelated product work from Estimate Sheet-owned changes; treat artifact `12` as the retained Template authority.
3. Reconcile the action matrix against the rendered-route controls and current source owners; add a row only if a discoverable action is missing.
4. Preserve the corrected current statuses: active-variant rename, Enter-to-save, and the NOT NULL incident are source-fixed but runtime-unverified; duplicate row is partial; component permanent delete remains open under the history/idempotency contract.
5. Record exact reproduction state for the `source_snapshot_json` NOT NULL incident and any remaining user-visible failure without claiming a product test.
6. Store proof-class receipts with method, expected/actual signal, environment, source paths, source/diff fingerprint, observation time, and result; broad evidence cannot close unrelated claims.
7. Freeze the expected local D1 integrity queries and the local/preview/hosted evidence ladder before implementation starts.
8. Freeze artifact `13`'s observed rename/filter baseline, shared primitive owners, current deferred/bounded/virtualized strengths, and its exact local budgets: direct intent `<100ms` target/`<200ms` ceiling, zero unrelated visible-row rerenders, zero loaded-filter requests or outer-sheet remounts, zero-pixel geometry delta, and `0 KB` intended dependency/bundle impact.
9. Build the complete registry of issue-visible authoring writers that must increment `projects.publication_source_revision`; include row, tab/tree, adjustment/total, component/variant fan-out, Template/Project-source insertion, and any project metadata consumed by publication. A writer absent from this registry blocks `UNIT-007` rather than becoming an implicit exception.
10. Freeze artifact `14`'s `MUT-*`, `PERF-S*`, cache-flow, receipt, D1 ceiling, index activation, and adversarial scenario registries against current source; capture small/large/stress fixture identity and before-change work/query/render counts.
11. Initialize `IMPLEMENTATION_TRACKER.md` from current source: only `UNIT-001` is dependency-eligible, `TEST-001` through `TEST-008` are `PLANNED`, behavior is `NOT_EVALUATED`, and the objective is `NOT_ACHIEVED`.

### Acceptance

- Every visible action has exactly one `L-*`, `C-*`, `R-*`, or `S-*` owner.
- The scoped baseline excludes unrelated dirty files and does not modify product code.
- Each current dirty fix has an exact source receipt and an explicit verification state.
- `UNIT-002` through `UNIT-007` retain valid file owners, dependencies, and finding coverage after the refresh.
- `UI-F-001` through `UI-F-009` have one existing-unit owner, and the baseline distinguishes source-level risk from measured runtime behavior.
- `PP-F-001` through `PP-F-012`, `MUT-01` through `MUT-12`, and `PERF-S01` through `PERF-S12` have current source owners, named fixtures/evidence, and no inherited archive success claim.
- The tracker, manifest, and dependency graph name `UNIT-010` as the only successor before row/tree mutation work begins.

### Evidence and recovery

- Evidence: scoped Git receipt, current source references, migration/binding receipt, updated matrix/finding register.
- Recovery: documentation-only; if source moves during the unit, refresh the baseline and invalidate dependent receipts rather than guessing.

## `UNIT-010` — Durable Intent Receipts And Create-To-Use Cache Continuity

### Goal

Provide the narrow shared command and cache-convergence foundation required for replay-safe row, component, Template, storage, and publication mutations without introducing a new client framework.

### Primary source scope

- one forward migration, expected `migrations/0081_estimate_mutation_receipts.sql`, only after `UNIT-001` integrity preflight
- `src/lib/estimates/d1-action-client.ts`
- `src/lib/estimates/actions.ts`
- `src/lib/component-library/actions.ts`
- `src/lib/component-library/template-editor-actions.ts`
- `src/lib/component-library/query-keys.ts`
- `src/hooks/use-estimate-row-mutations.ts`
- `src/components/workshop/component-library-manager/AddComponentModal.tsx`
- `src/components/workshop/component-library/index.tsx`
- the smallest shared cache/result helpers already used by these owners

### Work

1. Freeze the command-family registry from `MUT-01` through `MUT-12`, including actor/workspace/resource scope, request fingerprint, result shape, side effects, and owning cache keys.
2. Add one durable command-receipt table keyed by `(workspace_id, command_kind, intent_id)` with request fingerprint, bounded status/result JSON, and timestamps. Do not store PII, raw snapshots unrelated to replay, or binary content.
3. Add one server helper that resolves an existing committed receipt before ID allocation; rejects fingerprint mismatch; and appends receipt completion to the same D1 batch as guards, domain writes, history/outbox/telemetry, and publication revision.
4. Keep existing action-specific D1 operations. Do not route all mutations through a generic command bus or replace current typed result/error shapes.
5. Make component creation return the complete authoritative component/options/attachment projection needed by full, lite, and rows caches. Patch applicable mounted caches synchronously before the modal closes so a second explicit insert intent can use the component immediately.
6. Define one convergence owner for every cache shape touched by row insert, shared component/variant edit, permanent delete, Template lifecycle, and source insertion. Remove duplicate active refetch/invalidation only when the recorded query flow proves the scopes overlap.
7. Record focused before-change query/refetch/round-trip counts for component create→insert, direct row edit, shared variant edit, Template insert, and permanent delete. Instrumentation must be test-only or deferred and must not add user-visible latency.
8. Run `EXPLAIN QUERY PLAN` for receipt lookup and measured fan-out/publication queries. Add only the receipt uniqueness index unconditionally; any other index requires the activation evidence in artifact `14`.

### Acceptance

- Matching replay returns the same committed IDs/revisions without executing domain statements again; mismatched replay writes nothing.
- No action allocates row/node/template/component IDs before resolving its retained intent.
- Component create→immediate insert works without reload or prerequisite refetch and exposes the complete option graph.
- One cache shape has one named convergence owner per mutation; authoritative returned state cannot be overwritten by a stale inactive cache.
- The receipt migration has integrity preflight, unique lookup, bounded payload semantics, and rollback/drop SQL.
- No command bus, second state store, new dependency, performance mode, evaluator, or evidence-runtime framework is added.

### Evidence and recovery

- Required: migration pre/post queries, same-intent/same-result and fingerprint-mismatch zero-write receipts, complete component projection/cache snapshot, create→insert read-back, per-cache query/refetch count, query plans, scoped type/static evidence, and `TEST-001`, `TEST-003`, and `TEST-004` focused cases.
- Recovery: receipt rows are append-only command facts. If a domain batch fails, no committed receipt exists. If reconciliation is ambiguous, retry the same intent and inspect the receipt; never invent a second intent to escape uncertainty.

## `UNIT-002` — Row Mutation Integrity

### Goal

Make row insert/update/replace/move/duplicate/delete/restore and inline commit semantics authoritative, revision-safe, history-complete, and cache-coherent.

### Primary source scope

- `src/lib/estimates/actions.ts`
- `src/lib/estimates/d1-action-client.ts`
- `src/hooks/use-estimate-row-mutations.ts`
- `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts`
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/estimate-sheet/rows/`
- one new forward migration only if `UNIT-001` integrity evidence justifies it

### Work

1. Count every active row below revision `1` and every invalid source/link pair; fix all revision-zero producers, backfill accepted rows, and apply the narrow forward default/check repair before trusting revision guards.
2. Enforce the fixed source/link-state matrix in every insert/patch/replace/duplicate/detach writer: linked states require ID, unlinked requires `NULL`, and detached retains historical ID while leaving live Library ownership/fan-out; add a CHECK only after current data is reconciled.
3. Validate move and restore destinations inside the authoritative D1 boundary: same workspace, project, estimate, accepted destination kind/tab state, and non-archived target.
4. Update source and destination ordering, actor attribution, history, and cache reconciliation as one mutation; reject cross-tab and stale/partial-tree destinations atomically.
5. Replace duplicate's generic-insert magic branch with a dedicated D1 operation that validates source revision and target, copies the complete persisted contract including pricing provenance, assigns authoritative order/revision `1`, writes `row_duplicated`, and returns one receipt. Acquire a synchronous latch keyed `duplicate-row:${sourceRowId}` before allocating the intent ID; retain that ID through timeout/unknown outcomes, retry/reconcile with the same ID, and release only after authoritative success, explicit non-committed rejection, or reconciliation proves no commit. A deliberate later duplicate starts only after terminal release and receives a new ID.
6. Bind replace to expected target-row revision plus Library item, selected option, current-cost, and lifecycle fingerprint in the same commit or fail with a refreshable conflict.
7. Keep `source_snapshot_json` object-shaped for blank, Library, duplicate, replace, restore, Template, and Project-source paths.
8. Preserve Enter as commit through the shared prevent/stop/blur helper, Escape as revert, and blur as one de-duplicated commit across every single-line input class. A true multiline `textarea` keeps Enter as newline and uses `Mod+Enter` for the same commit path; no single-line Estimate Sheet field may use Enter for row navigation or line insertion.
9. Reconcile optimistic state from authoritative results; loading must be row-scoped or component+variant-scoped, never globally applied to unrelated rows.

### Acceptance

- Invalid move/restore targets change no row, order, history, total, or cache projection.
- Duplicate copies every row-owned field, pricing provenance, and selected-source receipt from one persisted revision, creates one new revision-1 row/event per intent, blocks accidental pre-render double activation, safely reconciles ambiguous outcomes with the retained intent ID, and never emits a null snapshot.
- Replace cannot commit against a changed source or stale row.
- Enter commits once and never navigates to another row; Escape restores the last authoritative value; only true multiline fields accept an Enter newline and save with `Mod+Enter`.
- Single and bulk delete remain revision-qualified and their restore path cannot create orphan rows.
- No active row remains below revision `1`, no writer creates revision `0`, and every accepted source/link pair has the same meaning in writers and readers.

### Evidence and recovery

- Required: GitNexus change scope, focused static/type evidence, local D1 before/after queries, history/correlation receipts, and authoritative read-back.
- Required `TEST_TASK`: run `TEST-001`, `TEST-002`, and the applicable `TEST-007` row/keyboard scenarios; fix and rerun failures before this unit verifies.
- Recovery: failed optimistic writes roll back from authoritative cache; a migration includes a forward repair and explicit verification query, not a destructive rollback.

## `UNIT-003` — Tab And Tree Integrity

### Goal

Make tab and Area CRUD, duplicate, move/reorder, delete, and restore preserve topology and route selection under retries and partial trees.

### Primary source scope

- `src/components/workshop/EstimateSheetTree.tsx`
- `src/components/workshop/estimate-sheet/EstimateTabStrip.tsx`
- `src/components/workshop/estimate-tree/`
- `src/lib/estimates/actions.ts`
- `src/lib/estimates/d1-action-client.ts`

### Work

1. Preallocate every copied node ID, validate the complete parent graph, then build a two-pass identity/parent remap; copy rows only after every destination node exists.
2. Bind the copy to one accepted source fingerprint and return a stored receipt before generating IDs or executing statements on retry; reset copied row revisions to `1` and timestamps to copy time.
3. Derive and validate tab/estimate ownership for create, move, reorder, delete, and restore; reject cycles, cross-tab parenting, deleted parents, and no-op history.
4. Preserve deterministic sibling/root order and route fallback when the selected node/tab is removed.
5. Keep structural drag disabled during search, rename, incomplete lazy trees, pending create, or insufficient permission.
6. Centralize external drop dispatch in the versioned target-scoped acknowledged envelope selected by `F-020`.
7. Make delete/bulk-delete impact counts and restore collisions explicit without double-counting overlapping selected subtrees.
8. Apply artifact `13`'s stable-surface editor to Area and tab names: preserve fill, dimensions, indentation, selected/current cues, and label origin; focus at the caret end without whole-value auto-selection; Enter saves, Escape cancels, blur deduplicates, and pointer exit does not save.
9. Isolate the active Area rename draft and status from sibling tree rows so a keystroke does not invalidate every visible memoized row through a changing shared renderer prop.

### Acceptance

- Deep and irregular tab copies preserve every parent, row, order, and source snapshot with fresh identities, revision `1`, copy timestamps, and one retry-safe receipt.
- No node can be moved under itself/descendant, another estimate, or a mismatched tab.
- Delete and restore leave a valid selected route and no orphan rows/nodes.
- Rejected drag/drop leaves both visual and persisted topology unchanged.
- Area/tab edit entry, saving, error, cancel, and success keep stable bounds and parent styling; keyboard focus remains visible without using a new row/tab fill.
- One Area rename keystroke materially updates only the edited row/direct owner, not unrelated visible tree rows.

### Evidence and recovery

- Required: topology queries, source/target read-back, route fallback receipt, history receipt, scoped static evidence, and source/class/DOM ownership showing the active rename draft is row-local and geometry-stable.
- Required `TEST_TASK`: `TEST-001` deep-tree duplicate/cycle/restore/partial-tree cases plus `TEST-006`/`TEST-007` focus, geometry, and render-isolation scenarios.
- Recovery: refresh the affected tab from authoritative D1 on mutation failure; never locally synthesize missing parents.

## `UNIT-004` — Component Lifecycle And Shared Edits

### Goal

Finish Library/Project/express component lifecycle, active-variant editing, promotion, archive, duplicate, and the user-approved destructive permanent-delete contract.

### Primary source scope

- `src/lib/component-library/actions.ts`
- `src/lib/estimates/express-promotion-actions.ts`
- `src/components/workshop/component-library/index.tsx`
- `src/components/workshop/component-library/tree/`
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` only if the same action contract is shared
- Estimate row component/variant handlers touched by `UNIT-002`
- one narrow forward migration only for folder invariants proven necessary by current-data preflight

### Work

1. Preserve archive as the non-destructive option and permanent delete as typed, previewed, irreversible removal of the Library component plus dependent Estimate/Template rows.
2. Build preview identity from exact dependent row/template IDs and revisions, workspace scope, owner estimates/templates, and attachment impact; revalidate that exact set immediately before mutation.
3. Delete the exact guarded set plus component in one bounded D1 transaction only when combined dependent Estimate/Template rows are `<= 400`; above that explicit ceiling, fail before mutation and direct the user to Archive rather than chunking partial destruction.
4. Emit bounded per-estimate and per-template audit/outbox events plus one idempotent `mass_deletion_events` receipt in the same transaction, with actor, correlation, snapshots, component/version receipt, counts, and explicit non-restorable semantics.
5. Mark attachment/upload metadata before object cleanup, retain objects still referenced elsewhere, and enqueue/retry only safe post-commit cleanup.
6. Keep the existing promotion uniqueness constraint; guard expected row revision, recover the canonical winner on uniqueness conflict, emit the normal outbox, and durably reconcile loser-owned copied objects.
7. Preserve current shared component fan-out and active-variant stable-ID pending scope unless current-route evidence disproves it; never broaden to all component instances.
8. Add child-folder creation to the shared tree and make folder create/reorder one authoritative atomic server mutation that rejects cycles, missing parents, stale placement, and partial sibling shifts.
9. Delete the source-proven unreachable reduced `NewComponentForm`, dead state/refs/helpers, and local-only save/discard path.
10. Align Library-folder, project-group, and Manage Groups inline rename with artifact `13`: remove filled edit treatments and mouse-leave commit, preserve parent geometry, keep focus visible, and use the same Enter/Escape/deduplicated-blur contract.

### Auxiliary tail

After the core lifecycle acceptance is met, implement `UX-003`/`AC-018`: account/workspace-scoped idempotent favorite set/unset that atomically changes only `favorite_item_ids_json` in the existing preference row, preserves all other aggregate settings, returns authoritative state, and exposes item-scoped pending/error/retry. Do not add a favorites table. This auxiliary tail may ship with `UNIT-004` but does not gate its core completion or the MVP release decision.

### Acceptance

- Permanent delete cannot repeat, race a stale preview, partially delete, write a null snapshot, silently detach, omit audit/attachment handling, or accept more than `400` combined dependent rows in the interactive path.
- Archive leaves existing linked rows intact and blocks new insertion according to the established lifecycle rule.
- Concurrent promotion yields one Library component and one authoritative row link; the loser returns the canonical winner and leaves no untracked copied objects.
- Shared edits and skeletons affect exactly the intended component or component+variant instances.
- Component duplicate creates fresh component/variant identities and does not transfer attachment ownership.
- Library folder mutations cannot persist cycles or partial sibling order.
- Folder and project-group rename never saves from pointer exit, never repaints the parent surface, and never shifts sibling/action geometry on entry or completion.
- When the auxiliary favorite tail is implemented, concurrent set/unset operations merge without overwriting unrelated preferences and reconcile only the affected item.

### Evidence and recovery

- Required: impact preview/execute receipts, D1 before/after counts, audit-event reads, attachment-reference reads, cache invalidation receipt, and scoped static evidence.
- Required `TEST_TASK`: `TEST-003` and applicable `TEST-008` cases, including 400/401, stale-preview, injected failure, replay, concurrent promotion, and cache reconciliation.
- Recovery: permanent delete is explicitly irreversible; any failure before commit changes nothing, and post-commit object cleanup remains retryable from durable metadata.

## `UNIT-005` — Template And Project-Source Interoperability

### Goal

Make Template/category/node and reusable Project source insertion target-correct, correlation-idempotent, identity-fresh, and consistent across sidebar, tree, and center sheet.

### Primary source scope

- Estimate insertion actions in `src/lib/estimates/actions.ts` and `src/lib/estimates/d1-action-client.ts`
- `src/components/workshop/component-library/tree/TemplatesTree.tsx`
- `src/components/workshop/component-library/index.tsx`
- Estimate tree/sidebar event payload contracts
- artifact `12` as the Template insertion and variant-source contract

### Work

1. Use the current any-selected-node target contract in disabled copy, click insertion, drag/drop, command paths, and server validation; keep historical Area/Group semantics out of this local target rule.
2. Authoritatively derive target tab/estimate from the target parent; remove or reject any caller-supplied mismatch.
3. Pass one stable client intent ID. Return the existing committed receipt before source loading, ID generation, or copy statements on retry; an intentional second copy uses a new intent ID.
4. Allocate fresh tab/node/row identities, preserve parent topology and deterministic order, and localize source receipts/selected variants according to the accepted copy contract.
5. Resolve and validate the complete source set—workspace/project access, lifecycle, bounded payload, and partial-tree conditions—before allocating destination IDs. Compute the exact D1 statement count from that resolved graph, including guards, order shifts, nodes, rows, the project publication-revision bump, one history event, one outbox event, and one committed receipt. If the count exceeds `D1_MAX_BATCH_STATEMENTS = 1000`, return `selection_too_large` before ID allocation or mutation and instruct the user to narrow the selection; never chunk or partially succeed.
6. Allocate fresh identities only after the ceiling check, then execute the entire user intent in one hard D1 batch and return one authoritative copy receipt for cache replacement, history, totals, and source-set messaging.
7. Keep the browser-event bridge but centralize a versioned command envelope containing target estimate/tab/node, source kind/identity, intent ID, and acceptance callback; one listener must claim or reject the command.
8. Expose one lightweight target-scoped pending affordance while the authoritative insert runs. Do not clone the full Template subtree optimistically or place unrelated Template/component instances into loading state.
9. Preserve exact saved selected-option identity, current-price re-resolution, bounded active-option snapshots, and explicit saved-snapshot-unlinked confirmation; never substitute the default option silently.
10. Replace the full-width boxed Templates source-family field with artifact `13`'s compact transparent trigger and consistent `All sources`, `Custom templates`, and `Project sources` labels; keep the popup opaque, content-sized, keyboard-accessible, and selected by check/text weight rather than persistent fill.
11. Keep source-family toggles local to already loaded summaries: no new request, outer-sheet remount, scroll/expansion loss, or unrelated loading state; clear only incompatible preview/selection state with an explicit announcement.

### Acceptance

- Repeating one correlation inserts exactly one subtree.
- Target parent, tab, project, estimate, and workspace always agree.
- Every copied identity is fresh; topology, row snapshots, selected variants, and order survive authoritative reload.
- Mixed/unavailable sources are all-or-nothing per user intent: any invalid source rejects the whole intent before mutation and nothing silently duplicates.
- Every accepted intent uses one batch of at most `1000` statements inclusive; an over-limit intent allocates no destination IDs, writes nothing, returns `selection_too_large`, and is never chunked.
- The right-sidebar copy names the same target concept used by the action, and Project-source insertion no longer contradicts the server's target-kind rule.
- Unhandled or multiply claimed browser commands cannot report success or start duplicate mutations.
- The target shows immediate pending feedback that clears on success/failure without changing the authoritative reconcile path or unrelated instances.
- The Templates filter reads as a lightweight scope control rather than a form field, uses the same vocabulary as its tree sections, and retains keyboard focus/ARIA behavior.
- Toggling a loaded source family makes no new request and preserves left-tree, center-sheet, sidebar scroll, expansion, selected tab, and totals continuity.

### Evidence and recovery

- Required: copy receipt, retained-intent read-back, exact statement-count receipt, over-limit zero-write receipt, topology/source fingerprint comparison, history/cache receipt, and scoped static evidence.
- Required `TEST_TASK`: `TEST-004` retry/idempotency/mixed-source/limit cases and `TEST-006`/`TEST-007` loaded-filter network, continuity, focus, and geometry scenarios.
- Recovery: reject before mutation when source/target is invalid; after a committed success, reconcile from the returned destination subtree rather than replaying the request.

## `UNIT-006` — D1, R2, Images, And Provider Integrity

### Goal

Eliminate metadata/object drift and prove the repaired mutation contracts separately in local D1, Cloudflare preview, and the bound hosted resources.

### Primary source scope

- `src/lib/uploads/upload-records.ts`
- `src/lib/uploads/direct-upload-records.ts`
- `src/app/api/component-library/images/route.ts`
- `src/app/api/projects/images/route.ts`
- upload/attachment cleanup helpers and outbox consumers reached from those actions
- new forward migrations under `migrations/` only after preflight queries
- `wrangler.jsonc` as binding authority

### Work

1. Unify ordinary and direct upload lifecycle and batch each D1 session/asset/event transition so finalized sessions and active assets cannot diverge.
2. Add compatible session-to-asset uniqueness/foreign-key protection and reconciliation for finalized sessions without assets, assets without sessions, missing events, and missing deterministic objects.
3. Change project and component image deletion to an atomic D1 removal claim conditioned on zero accepted references; do not physically delete inside the user request.
4. Recheck references during delayed cleanup, record per-object results, and transition only fully handled assets to a terminal purged state; repeated cleanup must be safe.
5. Prevent component/row/template/history/version references from advertising removed or missing assets; retain an object while any accepted owner still references it.
6. Run the artifact `10` integrity-query set against local D1 and record counts before/after any forward migration.
7. Prove local mutation/read-back and preview fault cases first. Hosted `ARCH_DB`/`ARCH_UPLOADS_R2` begins with deployment/source SHA, migration checksum, binding identity, and live/dry-run flags, then one scoped lifecycle fixture with exact cleanup.
8. Record migration parity, provider binding, D1 query, R2 object, cleanup, and environment identity in separate receipts. Do not deploy or touch unbound resources.

### Acceptance

- Zero finalized upload sessions without a valid asset and zero active assets missing required storage metadata.
- A referenced object cannot be claimed or physically deleted; an unreferenced removed object can be cleaned repeatedly and reaches a terminal purged state without resurrecting metadata or failing the user mutation.
- Local, preview, and hosted evidence explicitly names its environment and does not overclaim another level.

### Evidence and recovery

- Required: migration pre/post queries, D1 batch receipts, provider identity, R2 head/list/delete receipts for scoped fixtures, cleanup confirmation, and `git diff --check`.
- Required `TEST_TASK`: `TEST-008` storage/provider lifecycle and the applicable `TEST-007` recovery scenarios. Provider queries remain operational evidence and do not substitute for browser behavior.
- Recovery: forward-fix metadata; never restore an object reference unless object existence and ownership are re-proven. Stop before hosted mutation if fixture cleanup cannot be guaranteed.

## `UNIT-007` — Authoring-To-Issued Projection Parity

### Goal

Make legacy share and Client Portal issuance consume one explicit authoring field contract without exposing private identities or mutating immutable issues.

### Primary source scope

- `src/lib/publication/actions.ts`
- `src/lib/publication/snapshot.ts`
- `src/lib/client-portal/publish-service.ts`
- `src/lib/client-portal/issue-builder.ts`
- `migrations/0080_project_publication_source_revision.sql`
- `src/lib/estimates/actions.ts`
- `src/lib/estimates/d1-action-client.ts`
- `src/lib/estimates/express-promotion-actions.ts`
- `src/lib/component-library/actions.ts`
- `src/lib/projects/actions.ts`
- `src/lib/projects/location-actions.ts`
- `src/lib/publisher/drawer-actions.ts`
- any additional issue-visible writer proven by `UNIT-001`'s registry; adding one requires updating the registry before `UNIT-007` can verify
- public share model/types only where authoring fields or privacy filters differ

### Work

1. Define one private authoring row projection containing material/component display, description, supplier/category, unit/cost inputs, selected variant receipt, component/link receipt, row revision, public asset descriptors from `UNIT-006`, and minor-unit totals.
2. Add monotonic `projects.publication_source_revision INTEGER NOT NULL DEFAULT 1`. Every registered issue-visible authoring mutation increments it in the same authoritative D1 batch as its data change; no client callback or post-commit best effort may own the increment.
3. Make legacy and Client Portal source readers capture that revision before loading, populate the private shape, reread the same revision after loading, and map through separate explicit channel-safe public serializers. A reread mismatch retries within the existing bounded policy or returns `source-changed`.
4. Persist a replacement publication/issue through one transactional D1 batch whose header insert is an `INSERT ... SELECT` guarded by workspace/project ownership and the captured revision. Every child row and active-pointer statement is conditional on that header existing. Inspect the guarded header result; zero inserted rows means the entire batch produced no issue, child, or pointer and returns `source-changed`. This commit-time fence, not the pre-commit reread, closes the final race.
5. Preserve active-tab/tree inclusion rules and deterministic Area/row order; omit excluded content deliberately.
6. Replace internal component/variant/row IDs and private R2/upload paths with issue-local opaque anchors/public asset descriptors; remove unused internal receipts from client rows.
7. Enforce supplier/category visibility at the section/group builder so a controlled field cannot reappear through a generic derived label.
8. Derive deterministic opaque anchors and a semantic content hash from accepted authoring meaning, excluding random token/delivery/issue IDs; keep legacy republish/rotate/revoke semantics explicit and fail/retry when the source fingerprint changes during projection.
9. Reconcile authoring totals with issued totals and represent stale/reissue state by comparing the issue's captured revision with the current project revision after later authoring changes.
10. Do not absorb recipient session, invitation, discussion, decision, notification, or financial-presentation implementation.

### Acceptance

- The same accepted source fingerprint yields equivalent legacy and Client Portal row/tree/component/variant/totals meaning through one private projection and channel-appropriate public fields.
- Repeated unchanged-source builds yield the same semantic hash and opaque anchors; a mid-read or post-reread/pre-commit source change retries or fails as `source-changed` without issuing any mixed-revision header, child, or active pointer.
- No private D1 identity, source snapshot, broker path, or unapproved attachment metadata crosses the public boundary.
- Hidden supplier/category values cannot reappear as unrestricted derived group labels.
- Later authoring edits do not mutate an immutable issued Client Portal snapshot.
- Every issue-visible writer increments one project publication revision in the same commit, and publication failure cannot create orphan issue rows or partially replace the active issue/publication pointer.

### Evidence and recovery

- Required: writer-registry completeness receipt, revision increment/read-back, forced post-reread revision-change zero-write receipt, field-level source/snapshot diff, content hash/fingerprint receipt, privacy field audit, totals comparison, and scoped static evidence.
- Required `TEST_TASK`: `TEST-005` publication revision-race, parity, privacy, and zero-write cases plus the applicable `TEST-007` publish/reload journey.
- Recovery: retain the prior valid publication/issue pointer until the replacement snapshot is fully built and accepted.

## `UNIT-009` — Component Template Library Lifecycle

### Goal

Make Template save/create, bounded browse, header/category lifecycle, editor node/row mutations, composition, and variant/provenance semantics atomic, detached, bounded, and truthful under the integrated Estimate Sheet contract.

### Primary source scope

- `src/lib/component-library/actions.ts`
- `src/lib/component-library/template-editor-actions.ts`
- `src/lib/repositories/component-library-repository.ts`
- `src/lib/repositories/estimate-health-repository.ts`
- `src/lib/component-library/estimate-templates.ts`
- `src/components/workshop/component-library/NewTemplateModal.tsx`
- `src/components/workshop/library/template-editor/*`
- Template-related row builders in `src/lib/estimates/d1-action-client.ts` only after `UNIT-005`
- active `migrations/*` only after read-only integrity evidence; never mutate legacy `supabase/migrations/*`

### Work

1. Replace the separate Template header insert plus node/row batch and compensating delete with one hard D1 batch containing header, nodes, and rows. Preserve post-commit read-back and cache revalidation.
2. Preserve detached by-value ownership: Template edits/deletes never mutate inserted Estimate rows, every duplicate/composition/insert identity is fresh, and attachments are not silently transferred.
3. Preserve bounded summary browse and selected graph hydration. After migration preflight, delete `getTemplateTableFallbackTemplates` from production repository paths and return an explicit Template-schema-unavailable/migration state when the active table is absent; keep seed templates only in named development fixtures.
4. Reconcile header/category/node/row/composition actions into one authoritative editor path. Validate workspace ownership, hierarchy, cycle/order, and all-or-nothing composition server-side. Delete the uncalled `reorderEstimateTemplateRowItems` export and stop advertising Template-row reorder until a real route intent exists; do not add a second editor path.
5. Make Template save and insert use one explicit contingency invariant so legacy contingency cannot be resurrected by one side of the round trip.
6. Apply the fixed `pricing_provenance_origin` contract across Estimate duplicate/restore, Template save/insert/composition, Project-source insert, health readers, and issued projection: direct explicit resolution is `recorded`; detached copy of explicit upstream provenance is `inherited_snapshot`; compatibility synthesis is `synthesized_fallback`; absent/legacy provenance is `missing`. Pure duplicate/restore preserves the persisted marker. Keep it private and remove no authoritative read in isolation.
7. Record one bounded operational activity row in existing `component_library_telemetry_events` for each committed Template header/category/editor intent, with actor, workspace, template/resource ID, action, intent/correlation ID, and non-sensitive result metadata in the same D1 batch. Do not emit fake Estimate history or treat this telemetry receipt as compliance audit; make cache reconciliation explicit.
8. Preserve `UNIT-005`'s exact selected-option/current-price/unavailable-source contract and the fixed source/link-state matrix. Do not substitute a default variant or write a null destination snapshot.
9. Keep current hand-written guards unless a concrete missed boundary is demonstrated; do not add zod or speculative D1 constraints for style parity.
10. Apply artifact `13`'s stable-surface rename and menu-purpose rules to Template names, categories, and editor groups/Areas; reuse the existing dropdown/context-menu substrate and do not introduce a parallel control system.

### Acceptance

- A failed save leaves no Template header, node, or row; successful save reads back one complete detached graph.
- Browse remains bounded and selected hydration cannot overwrite a newer edit with stale detail.
- Rename, duplicate, delete, category, node, row, and composition actions are workspace-scoped, topology-valid, cache-complete, and leave previously inserted Estimate rows unchanged; no unreachable row-reorder API remains.
- Template save/insert round-trips quantity, costs, adjustment, source/link state, exact selected variant, snapshots, and the accepted contingency/provenance contract without silent defaulting.
- Missing Template tables return an explicit unavailable/migration state and never masquerade synthetic fixtures as user-owned Templates.
- Every committed Template lifecycle intent has exactly one bounded same-batch operational receipt; Estimate history remains reserved for Estimate mutations.
- No action, requirement, finding, source unit, or evidence claim from the absorbed Template pack is orphaned after the source folder is removed.
- Template/category/editor rename and source filtering preserve surface geometry, focus, scroll/expansion, and detached Template semantics without persistent selected-option fills.

### Evidence and recovery

- Required: failed-create/no-shell D1 receipt, complete Template graph read-back, bounded summary/detail query receipt, editor topology/order/activity receipt, fallback-state receipt, row-field/variant/provenance diff, cache invalidation receipt, source/class/DOM ownership receipt, source-pack absence/path search, and canonical plan validation.
- Required `TEST_TASK`: `TEST-004` full Template lifecycle/failure/replay cases plus applicable `TEST-006`/`TEST-007` rename, filter, focus, geometry, and create→insert journeys.
- Recovery: all pre-commit validation failures change nothing; Template delete is explicitly irreversible for the Template graph but cannot affect prior Estimate copies; object cleanup remains metadata-driven and retryable.

## `UNIT-011` — Whole-Route Performance And Authorized Adversarial Test Gate

### Goal

Measure the completed Estimate Sheet MVP on named fixtures, make only the smallest evidence-backed performance fixes, and run the full authorized test/fix/retest sequence until all core behavior is verified.

### Primary source scope

- product paths changed by `UNIT-002` through `UNIT-007`, `UNIT-009`, and `UNIT-010`
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/estimate-sheet/rows/branch.tsx`
- `src/components/workshop/estimate-sheet/rows/row-table.tsx`
- `src/components/workshop/estimate-sheet/rows/virtual-branch-list.tsx`
- `src/components/workshop/estimate-sheet-render-probe.ts`
- `src/hooks/use-estimate-query.ts`
- `src/hooks/use-estimate-row-mutations.ts`
- focused existing `tests/vitest/**` files named below
- one focused new `e2e/estimate-sheet-mvp.spec.ts`
- one deterministic large Estimate fixture only if no current fixture can express `PERF-S11`

### Work

1. Reconcile `IMPLEMENTATION_TRACKER.md`: every implementation unit is `VERIFIED`, each `MUT-*` row has receipts, and no required test is falsely marked run before this gate begins.
2. Capture before-change and current measurements for `PERF-S01` through `PERF-S12`, including fixture identity, render/work/query/refetch/round-trip counts, timing environment, and expected budget.
3. Keep already-good indexed fan-out, row-level draft subscriptions, ancestor-delta totals, deferred search, bounded Template hydration, and thresholded virtualization. Do not rewrite those boundaries without a failing metric.
4. If shared-edit convergence exceeds its request/render budget, remove only proven duplicate active refreshes while preserving one background freshness owner.
5. If branch comparison dominates a named nested fixture, pass the smallest branch-local revision/slice needed by the comparator; do not redesign the store.
6. Change `refetchOnMount` only if warm-navigation evidence proves redundant cost and conflict/reconciliation tests prove cache freshness remains safe.
7. Add only missing focused tests required by `TEST-001` through `TEST-008`; reuse current fixtures and tests before creating new helpers.
8. Run the exact test groups below serially. Stop at the first failure, record it in the tracker, fix the smallest owning implementation, rerun the exact test, then resume the sequence.
9. Run `TEST-007` with one deterministic MVP journey covering Library component create→insert→edit→reload, Template create→insert→reload, duplicate, timeout/retry, stale conflict, failed bulk action, rename/filter continuity, and partial/lazy-tree safety.
10. Run scoped typecheck/lint/static/diff checks after tests. Run a build/bundle measurement only when the implementation changes a route-loading boundary or adds measurable client code; no build is used as a substitute for behavior tests.
11. Update every test, performance scenario, evidence dimension, reopened criterion, and continuation in the tracker and manifest from actual results.

### Acceptance

- `TEST-001` through `TEST-008` are `PASS`; there are no unexpected skips, retries-to-green, raised global timeouts, leaked fixtures, page/console errors, or orphan processes.
- `PERF-S01` through `PERF-S12` meet their target or hard invariant on the named fixture and environment.
- Component create is immediately insertable with complete options and no prerequisite refetch.
- Same-intent retries for row duplicate, Template/Project insertion, component lifecycle, and publication return one stable authoritative result.
- No row, Template, component, history/outbox/telemetry, receipt, publication pointer, or attachment mutation partially commits under the required failure simulations.
- No cancelled performance mode, evaluator, custom reporter, benchmark server, evidence-runtime pipeline, new performance dependency, or speculative index/state layer exists.
- A failed test or budget reopens one exact owning unit and the loop continues until it passes or a true terminal blocker is documented.

### Evidence and recovery

- Required: `TEST-001`–`TEST-008` command/result receipts, exact failing-name and rerun history, fixture cleanup, `PERF-S*` before/after table, cache/query/render/network counts, D1 read-back, scoped type/lint/diff output, and GitNexus `detect_changes()` for changed product symbols.
- Recovery: revert only the smallest failed optimization while preserving correctness fixes; keep the failing test and reopen its owner. Do not weaken assertions, budgets, fixtures, or timeouts to manufacture a pass.

## `UNIT-008` — Integrated Verification And Release Decision

### Goal

Reconcile every matrix action, finding, requirement, risk, evidence class, and adjacent boundary into a truthful MVP release decision.

### Owned scope

- `README.md`, artifacts `09` through `14`, `IMPLEMENTATION_TRACKER.md`, `TRACEABILITY.md`, `LOOP_LEDGER.md`, and `plan-pack.json`
- read-only reconciliation of product paths changed by `UNIT-002` through `UNIT-007` and `UNIT-009` through `UNIT-011`
- local/provider/public receipts already produced by preceding units; no new product behavior is implemented here

### Work

1. Re-run the full action inventory and mark each action `PASS`, accepted boundary, unsupported-by-design, or open gap with claim-level evidence.
2. Confirm every P0/P1 finding and every absorbed `TPL-F-*` disposition is fixed, explicitly accepted with owner/rationale, superseded by a stronger integrated finding, or removed by a product decision; P2/P3 items must have an owner and non-misleading state.
3. Re-run local D1 integrity and static gates after all units; compare expected changed symbols/flows through GitNexus `detect_changes()`.
4. Reconcile source/static ownership, D1 receipts, authoritative read-back, provider/public receipts, `TEST-001` through `TEST-008`, every `MUT-*` row, and every `PERF-S*` scenario; missing required behavior proof keeps implementation/objective nonterminal.
5. Confirm `UNIT-011` verified the exact MVP route across left tree, center sheet, and right Sources sidebar, including visual state, focus, geometry, render count, loaded-filter network, continuity, reduced motion, create-to-use, retry, failure, and reload behavior.
6. Reconcile preview/hosted provider receipts from `UNIT-006` and public projection receipts from `UNIT-007`; never convert missing evidence into PASS.
7. Refresh `README.md`, artifacts `09` through `14`, `IMPLEMENTATION_TRACKER.md`, `TRACEABILITY.md`, `LOOP_LEDGER.md`, and `plan-pack.json` from actual results.
8. Set implementation `COMPLETE`, behavior `VERIFIED`, and objective `ACHIEVED` only when every core unit, criterion, mutation row, performance scenario, and required test is verified. Set release `READY` only if all release evidence also passes; otherwise keep the exact truthful release boundary.

### Acceptance

- No orphan action, requirement, absorbed finding, unit, criterion, risk, decision, or evidence ID remains.
- No criterion uses blanket evidence unrelated to its claim.
- All required test and environment receipts are fresh and correctly scoped; no required evidence remains unevaluated at objective completion.
- Plan validation, scoped diff checks, and source-path checks pass, but are described only as planning/static proof.
- Every `UI-F-*` finding is fixed or explicitly accepted, and `AC-016`/`AC-017` distinguish stable visual behavior from render/network performance proof.
- Every `PP-F-*`, `MUT-*`, `PERF-S*`, and `TEST-*` record is terminal with decisive evidence; `AC-019` through `AC-021` pass.
- The final status tuple is internally coherent and names either a release-ready result or one exact continuation.

### Evidence and recovery

- Required: claim-level traceability, current hashes, validator receipt, scoped static/diff receipt, preceding units' D1/provider/public receipts, all test/performance receipts, tracker reconciliation, and an exact zero-open-core-work assertion or exact reopened continuation.
- Recovery: if any source changes after proof, mark dependent evidence stale and reopen the smallest affected unit.

## Authorized Test Tasks

The user explicitly authorized implementation testing for this pack. The executor must run these groups serially, repair any in-scope failure at the smallest owning unit, rerun the failed group, and continue until every group passes. A failing required group is implementation work, not a reason to stop. Provider-gated receipts remain truthful authorization or environment boundaries and never become fabricated PASS states.

| ID | Risk slice | Exact command |
| --- | --- | --- |
| `TEST-001` | D1 command topology, statement ceilings, atomicity, and large-data contracts | `bun x vitest run tests/vitest/estimate-row-atomic-d1-contracts.test.ts tests/vitest/estimate-sheet-center-atomic-contracts.test.ts tests/vitest/estimate-sheet-large-data-budgets.test.ts --maxWorkers=1` |
| `TEST-002` | Row CRUD, replay, retry, concurrency, restore, insert, and partial-failure behavior | `bun x vitest run tests/vitest/estimate-actions-d1-reorder-history.test.ts tests/vitest/estimate-actions-d1-row-restore-history.test.ts tests/vitest/estimate-mutation-revision-concurrency.test.ts tests/vitest/estimate-row-mutation-coordinator.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx --maxWorkers=1` |
| `TEST-003` | Component/variant CRUD, fan-out, attachment lifecycle, projection, and row-details behavior | `bun x vitest run tests/vitest/component-library-manager-concurrency.test.tsx tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/component-library-d1-store.test.ts tests/vitest/project-component-projection.test.ts tests/vitest/project-component-projection-d1.test.ts tests/vitest/estimate-component-fan-out.test.ts tests/vitest/estimate-sheet-row-details-crud.test.tsx --maxWorkers=1` |
| `TEST-004` | Template create/edit/browse/repository/insert/drop behavior | `bun x vitest run tests/vitest/new-template-modal.test.tsx tests/vitest/template-editor.test.tsx tests/vitest/template-browse-project-sources.test.tsx tests/vitest/component-library-templates-repository.test.ts tests/vitest/estimate-template-trusted-insert.test.ts tests/vitest/estimate-template-drop-zones.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx --maxWorkers=1` |
| `TEST-005` | Estimate integrity, revision facts, publication fence, and client-portal parity | `bun x vitest run tests/vitest/estimate-repository.test.ts tests/vitest/estimate-schema-compat.test.ts tests/vitest/estimate-revision-fact-producers.test.ts tests/vitest/estimate-unification-oracle.test.ts tests/vitest/client-portal-publish-service.test.ts tests/vitest/client-portal-issue-builder.test.ts tests/vitest/project-publication-snapshot.test.ts tests/vitest/client-portal-estimate-browser.test.ts --maxWorkers=1` |
| `TEST-006` | Lean render isolation, memoization, active-tab, virtualization, and Template/Library-tree budgets | `bun x vitest run tests/vitest/estimate-sheet-sidebar-render-isolation.test.tsx tests/vitest/perf/estimate-sheet-memoization.test.tsx tests/vitest/perf/estimate-right-sidebar-active-tab-renders.test.tsx tests/vitest/estimate-branch-virtualization.test.tsx tests/vitest/estimate-row-table-virtualization.test.tsx tests/vitest/templates-tree-performance.test.ts tests/vitest/library-tree-performance.test.ts --maxWorkers=1` |
| `TEST-007` | Exact-route browser behavior, continuity, keyboard/focus, failure/retry, reload, and measured scenario proof | `bun x playwright test e2e/estimate-sheet-mvp.spec.ts --project=chromium --workers=1 --retries=0` |
| `TEST-008` | Component image/attachment persistence, ownership, retention, and R2 provider contracts | `bun x vitest run tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/component-attachment-ownership-migration.test.ts tests/vitest/project-component-attachment-retention.test.ts tests/vitest/estimate-linked-library-image-upload.test.tsx tests/vitest/cloudflare-r2-storage-provider.test.ts tests/vitest/upload-component-attachment-client.test.ts --maxWorkers=1` |

After the focused groups pass, run `bun run type-check`, scoped `bun run lint -- <changed-files>`, and `git diff --check`. Run the project build only if the implementation changes route-loading or client-bundle boundaries; record that decision either way.

## Executor State Transitions

| Completed unit | Exact next state |
| --- | --- |
| `UNIT-001` | Open `UNIT-010` after freezing the writer registry, source baseline, tracker, and performance/mutation contract. |
| `UNIT-010` | Open `UNIT-002` and `UNIT-003` in parallel only after durable intent receipts and create-to-use cache continuity are verified. |
| `UNIT-002` | Open `UNIT-004`; keep `UNIT-003` active if unfinished, because `UNIT-005` also waits for it. |
| `UNIT-003` | When `UNIT-002` is also verified, open `UNIT-005`; `UNIT-004` may already be active from `UNIT-002`. |
| `UNIT-004` | Open `UNIT-006`; open `UNIT-009` after `UNIT-005` also verifies. `UX-003`/`AC-018` remains an optional auxiliary tail. |
| `UNIT-005` | Open `UNIT-009` after `UNIT-004`; preserve its receipts for `UNIT-007`. |
| `UNIT-006` | Open `UNIT-007` only after `UNIT-009` is also verified and all registered authoring writers are revision-aware. |
| `UNIT-009` | Open `UNIT-007` only after `UNIT-006` is also verified; otherwise continue the exact unfinished dependency. |
| `UNIT-007` | Open `UNIT-011` only after every implementation unit through `UNIT-010` is verified. |
| `UNIT-011` | Open `UNIT-008` only after all required tests, mutation contracts, and performance scenarios are terminal with decisive evidence. |
| `UNIT-008` | Set implementation, behavior, objective, and release status from evidence; if anything fails, reopen the smallest owning unit and continue rather than stopping at reconciliation. |

## Handoff And Stop Conditions

The implementer stops a unit only when its acceptance and evidence are reconciled. A failed optional tool is not a blocker if an equivalent repository-grounded check exists. `TECH_BLOCKED` is reserved for a core result that remains impossible after materially different local approaches fail.

The implementation program ends only when all eleven core units are `VERIFIED`, all twenty core criteria through `AC-021` are `PASS`, `TEST-001` through `TEST-008` pass, every `MUT-*` and `PERF-S*` row is terminal with decisive evidence, the action matrix reflects the current route and full component/variant/Template lifecycle, implementation is `COMPLETE`, behavior is `VERIFIED`, and the objective is `ACHIEVED`. Release remains separately truthful to provider/public evidence. Any failed in-scope check reopens the smallest owning unit and the executor continues. Auxiliary `UX-003`/`AC-018` remains separately visible and does not gate the core MVP status.
