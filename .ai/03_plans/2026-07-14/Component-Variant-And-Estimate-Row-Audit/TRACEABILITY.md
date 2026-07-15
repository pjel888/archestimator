# Estimate Sheet MVP Traceability And Evidence Model

**Current decision:** the remediation plan is implementation-ready, implementation has not started, behavior is not evaluated, the objective is not achieved, and release is not ready. Every criterion below is `FAIL` until its named evidence is collected after implementation. A manifest `READY` unit is fully authored; dependency eligibility is tracked separately in `IMPLEMENTATION_TRACKER.md`.

## Status Vocabulary

| Record | Current meaning |
| --- | --- |
| Requirement `ACCEPTED` | The product/data/UX/operations contract is fixed and owned. |
| Unit `READY` | Goal, dependencies, paths, acceptance, evidence, and recovery are executable. |
| Criterion `FAIL` | Required implementation or decisive evidence is still missing. |
| Evidence `COLLECTED` | Current planning/source evidence exists; it is not implementation or release proof. |
| `TEST_TASK` | The user explicitly authorized the linked focused test; it is required implementation work and must pass before its criterion can pass. |
| Behavior `NOT_EVALUATED` | Source may be authored, but the required product and performance behavior has not been executed. |
| Objective `NOT_ACHIEVED` | At least one core unit, criterion, mutation row, performance scenario, or required test remains nonterminal. |
| Release `NOT_READY` | One or more core criteria remain `FAIL` or an environment layer is unproved. |

## Current Source Authority

| Source | Authority | Requirements informed |
| --- | --- | --- |
| `SRC-001` | `09-ESTIMATE-SHEET-FEATURE-ACTION-MATRIX.md` — current action inventory and status. | `REQ-001`–`REQ-007`, `UX-001`–`UX-003`, `PERF-001`–`PERF-003`, `DATA-003`, `SEC-001` |
| `SRC-002` | `10-DATA-INTEGRITY-BUG-AND-READINESS-AUDIT.md` — mutation findings, D1/R2 risks, and publication gap. | `REQ-004`–`REQ-008`, `DATA-001`–`DATA-003`, `SEC-001`, `UX-001`, `UX-003`, `PERF-001`, `OPS-001` |
| `SRC-003` | `README.md` — goal, product decisions, scope boundaries, test authorization, and stop condition. | `REQ-001`, `REQ-006`–`REQ-009`, `DATA-003`, `SEC-001`, `UX-002`, `PERF-002`, `PERF-003`, `OPS-001`, `OPS-002` |
| `SRC-004` | `IMPLEMENTATION_PLAN.md` — dependency-closed implementation and evidence sequence. | all requirements |
| `SRC-005` | `11-ISSUE-BY-ISSUE-ROOT-CAUSE-BLAST-RADIUS-AND-FIX-SIMULATIONS.md` — corrected premises, failure/race/partial-failure simulations, alternatives, selected fixes, and residual risks for `F-001`–`F-024`. | `REQ-001`–`REQ-008`, `DATA-001`, `DATA-002`, `SEC-001`, `UX-001`, `PERF-001`, `OPS-001` |
| `SRC-006` | `12-COMPONENT-TEMPLATES-ABSORPTION-AND-LIFECYCLE-CONTRACT.md` — retained Template architecture, create/browse/editor/insert flows, variant/source trust, ten-finding disposition, source-unit crosswalk, and source-pack removal proof. | `REQ-001`, `REQ-005`, `REQ-007`, `REQ-009`, `DATA-001`, `SEC-001`, `UX-001`, `PERF-001`, `OPS-001` |
| `SRC-007` | `13-ESTIMATE-SHEET-UX-UI-AND-INTERACTION-PERFORMANCE-READINESS.md` — read-only live-route baseline, stable-surface rename contract, compact-filter/menu contract, broader UX streamlining, render isolation, and continuity evidence requirements. | `REQ-001`, `REQ-003`, `REQ-006`, `REQ-007`, `REQ-009`, `UX-001`, `UX-002`, `PERF-001`, `PERF-002` |
| `SRC-008` | `14-ESTIMATE-SHEET-MVP-PERFORMANCE-PERSISTENCE-AND-TEST-CONTRACT.md` — whole-route budgets, create-to-use cache flow, mutation safety, durable intent receipts, D1 limits, failure simulations, and authorized tests. | `DATA-003`, `PERF-003`, `OPS-002` |
| `SRC-009` | `IMPLEMENTATION_TRACKER.md` — current epoch, dependency eligibility, units, requirements, mutation/performance/test checklists, evidence dimensions, and continuation state. | `OPS-002` |

Artifacts `01` through `08` are dated baseline/deep-dive sources only. They cannot close a current criterion without a fresh receipt in this trace.

## Requirement Coverage

| ID | Role | Accepted requirement | Capability coverage | Findings | Owner units | Criterion |
| --- | --- | --- | --- | --- | --- | --- |
| `REQ-001` | `CORE` | Maintain one canonical inventory and source owner for every Estimate Sheet and Component Template click, context action, keyboard action, bulk action, drag/drop path, loading state, retry, recovery path, and dense interaction-state contract. | `L-01`–`L-22`, `C-01`–`C-50`, `R-01`–`R-44`, `S-01`–`S-19` | `F-007`, absorbed-pack authority drift, `UI-F-001`–`UI-F-009`, `PP-F-012` | `UNIT-001`, `UNIT-008`, `UNIT-009`, `UNIT-011` | `AC-001` |
| `REQ-002` | `CORE` | Left tree Area CRUD, search/filter, lazy loading, move/reorder, delete/bulk delete, restore, and external drops preserve estimate/tab topology and route selection. | `L-01`–`L-22` | `F-001`, `F-002`, `F-020` | `UNIT-003`, `UNIT-008` | `AC-002` |
| `REQ-003` | `CORE` | Tabs and center-sheet shell create, rename, duplicate, delete, reorder, select, filter/group, expand, resize, total, and recover without cross-tab or partial-tree corruption. | `C-01`–`C-14`, `C-43`–`C-50` | `F-010` | `UNIT-003`, `UNIT-008` | `AC-003` |
| `REQ-004` | `CORE` | Row insert/edit/replace/move/duplicate/delete/bulk delete/restore and Enter/Escape commits preserve row ownership, revisions, object snapshots, history, totals, and authoritative reconciliation. | `C-15`–`C-19`, `C-23`–`C-25`, `C-32`–`C-42`, `L-17`–`L-19`, `R-18`, `R-20`–`R-22` | `F-001`, `F-002`, `F-008`, `F-012`, `F-014`–`F-016`, `F-022`, `F-023` | `UNIT-002`, `UNIT-008` | `AC-004` |
| `REQ-005` | `CORE` | Component and variant edits obey Library/Project/express ownership; selected variant is row-owned, definition edits are stable-ID shared mutations, and pending UI uses the same scope key. | `C-20`–`C-30`, `R-23`, `R-24`, `S-10` | `F-009`, `F-012`, `F-013`, `F-022` | `UNIT-002`, `UNIT-004`, `UNIT-008` | `AC-005` |
| `REQ-006` | `CORE` | Right-sidebar Library/folder lifecycle supports create/read/update/duplicate/archive/permanent delete/bulk actions and drag/drop with explicit nesting, attachment, audit, cache, and the `400`-dependent interactive delete ceiling. | `R-01`–`R-24`, `S-10`, `S-13` | `F-005`, `F-009`, `F-015`, `F-019`, `F-021` | `UNIT-004`, `UNIT-008` | `AC-006` |
| `REQ-007` | `CORE` | Template and reusable Project sources insert all-or-nothing per intent into one selected node target with fresh identities, parent-derived tab scope, deterministic order, source localization, idempotency, and acknowledged routing. | `L-16`, `L-19`, `C-17`, `C-18`, `R-25`–`R-30`, `S-11` | `F-011`, `F-017`, `F-020` | `UNIT-005`, `UNIT-008` | `AC-007` |
| `REQ-008` | `CORE` | Legacy share and Client Portal issue builders project equivalent authoring tree/row/component/variant/totals meaning from one accepted source fingerprint and deterministic semantic identity while preserving immutable issue and privacy rules. | `C-44`, `C-47`, `S-01`–`S-09` | `F-006` | `UNIT-007`, `UNIT-008` | `AC-008` |
| `REQ-009` | `CORE` | Component Templates are detached, workspace-scoped blueprints whose save/create, bounded browse/detail, header/category lifecycle, editor node/row CRUD, composition, variant/source trust, and deletion are atomic, topology-valid, and non-propagating to prior Estimate copies. | `L-16`, `R-25`, `R-34`–`R-44`, `S-11` | `TPL-F-001`–`TPL-F-009` | `UNIT-009`, `UNIT-008` | `AC-015` |
| `DATA-001` | `CORE` | D1 mutations enforce workspace/project/estimate/tab/node/template ownership, non-null object snapshots, revision/idempotency, atomic order/history/outbox, and valid restore/delete semantics. | All persistent `L-*`, `C-*`, `R-*`, `S-08`, `S-11`, `S-13`, `S-18` | `F-001`, `F-002`, `F-005`, `F-008`–`F-012`, `F-015`, `F-016`, `F-022`, `F-023`, `TPL-F-001`, `TPL-F-004`, `TPL-F-005`, `TPL-F-009` | `UNIT-002`–`UNIT-006`, `UNIT-009`, `UNIT-010`, `UNIT-008` | `AC-009` |
| `DATA-002` | `CORE` | Upload session, asset, attachment, Images/R2 object, and cleanup state remain ownership-valid and recoverable across component/row/template lifecycle. | `C-31`, `R-10`, `R-12`, `R-13`, `R-16`, `S-10`, `S-12` | `F-003`, `F-004`, `F-005`, `F-024` | `UNIT-004`, `UNIT-006`, `UNIT-008` | `AC-010` |
| `DATA-003` | `CORE` | Every persistent command resolves one intent before ID allocation, commits all applicable guards/domain writes/history/outbox/telemetry/receipt/publication revision atomically, returns stable replay-safe results, and reconciles one owner per cache shape. | all persistent actions plus `S-13`, `S-18` | `PP-F-001`–`PP-F-008`, `PP-F-012` | `UNIT-010`, `UNIT-002`–`UNIT-007`, `UNIT-009`, `UNIT-011`, `UNIT-008` | `AC-019` |
| `SEC-001` | `CORE` | Every action authorizes workspace/project/estimate/template/resource scope server-side, view-only roles cannot mutate, and issued/public data exposes no private D1 IDs, snapshots, or private storage paths. | `L-21`, `C-50`, `R-32`, `R-34`–`R-44`, `S-01`–`S-07`, `S-11`, `S-12`, `S-15` | `F-001`–`F-006`, `F-011`, `F-020`, `F-024`, absorbed Template authorization findings | `UNIT-002`–`UNIT-009` | `AC-011` |
| `UX-001` | `CORE` | Inputs, drag/drop, destructive confirmations, skeletons, pending/conflict/offline states, retries, focus, and rollback identify the exact affected object and never imply a false success. | Loading/error/retry and mutation feedback rows across all four matrix sections | `F-013`, `F-014`, `F-017`–`F-020`, `TPL-F-002`, `TPL-F-003` | `UNIT-002`–`UNIT-005`, `UNIT-009`, `UNIT-008` | `AC-012` |
| `UX-002` | `CORE` | Dense inline rename preserves the parent surface, geometry, selection meaning, and keyboard focus; Enter saves, Escape cancels, blur deduplicates, pointer exit never saves, and compact source filters use transparent triggers with consistent labels and opaque accessible menus. | `L-09`, `C-04`, `R-02`, `R-06`, `R-25`, `R-26`, `R-37`, `R-41`, `R-42`, `S-16` | `UI-F-001`–`UI-F-007` | `UNIT-001`, `UNIT-003`, `UNIT-004`, `UNIT-005`, `UNIT-009`, `UNIT-008` | `AC-016` |
| `UX-003` | `AUXILIARY` | Favorite set/unset is account/workspace-scoped, idempotent, item-reconciled, and changes only `favorite_item_ids_json` without overwriting unrelated preferences. | `R-03`, `R-04` | `F-018` | `UNIT-004` auxiliary tail | `AC-018` |
| `PERF-001` | `CORE` | Tree/sidebar/Template loading, fan-out, bulk operations, copy, and history remain bounded; partial data is labeled and no global rerender/loading state substitutes for object scope. | `L-01`, `L-05`, `L-06`, `C-01`, `C-11`, `C-42`–`C-44`, `R-02`–`R-04`, `R-18`, `R-19`, `R-25`, `R-31`, `R-34`–`R-44` | `F-005`, `F-011`, `F-013`, `F-020`, `TPL-F-002`, `TPL-F-008` | `UNIT-001`–`UNIT-005`, `UNIT-009`, `UNIT-008` | `AC-013` |
| `PERF-002` | `CORE` | Rename drafts and loaded source-family toggles stay render-, network-, and layout-local; they preserve scroll, expansion, selection, focus, deferred search, bounded detail hydration, and existing virtualization without speculative dependencies. | `L-09`, `C-04`, `R-02`, `R-25`, `R-37`, `R-41`, `S-17` | `UI-F-008`, `UI-F-009` | `UNIT-001`, `UNIT-003`, `UNIT-005`, `UNIT-009`, `UNIT-008` | `AC-017` |
| `PERF-003` | `CORE` | Warm route, row edit, shared update, create-to-use, tree expand/render, 1,000-item search, Template hydration, 1,500-node/5,000-row behavior, and D1 round trips meet named budgets/invariants without speculative infrastructure. | `S-17`, `S-19`, `PERF-S01`–`PERF-S12` | `PP-F-007`–`PP-F-012` | `UNIT-001`, `UNIT-010`, owned mutation units, `UNIT-011`, `UNIT-008` | `AC-020` |
| `OPS-001` | `CORE` | Cache invalidation, history/outbox, Template-library audit policy, local/preview/hosted environment identity, migration parity, scoped fixture cleanup, source fingerprints, and evidence freshness are explicit and non-substitutable. | `C-42`, `C-46`, `R-34`–`R-44`, `S-08`, `S-11`–`S-13`, `S-15` | `F-004`, `F-006`, `F-007`, `F-024`, `TPL-F-006`, `TPL-F-008` | `UNIT-001`, `UNIT-006`, `UNIT-009`, `UNIT-008` | `AC-014` |
| `OPS-002` | `CORE` | Execution remains resumable and nonterminal until every core unit, required test, mutation row, performance scenario, and criterion is verified; the tracker always names the exact continuation or true blocker. | `S-19`, implementation tracker | `PP-F-012` | `UNIT-001`, `UNIT-010`, `UNIT-011`, `UNIT-008` | `AC-021` |

## Acceptance Criteria

All criteria start `FAIL`. The named evidence and any linked `TEST_TASK` must exist before status changes; an implementation diff alone cannot pass a criterion.

| Criterion | Pass condition | Decisive evidence | Test decision | Current result |
| --- | --- | --- | --- | --- |
| `AC-001` | Inventory, trace, tracker, and manifest have one current owner and no orphan ID or stale authority. | route/source inventory, path checks, tracker/manifest validation | `NOT_REQUIRED` | `FAIL` — implementation baseline not frozen. |
| `AC-002` | Area/tree CRUD, DnD, delete/restore, and route fallback reject invalid topology and reconcile authoritative state. | D1 topology/history/read-back | `TEST_TASK` — `TEST-001`, `TEST-007` | `FAIL` |
| `AC-003` | Tab CRUD/duplicate/reorder and shell preserve deep topology, selection, order, and partial-tree meaning. | deep-tree read-back and route proof | `TEST_TASK` — `TEST-001`, `TEST-007` | `FAIL` |
| `AC-004` | Row CRUD, duplicate, move, replace, delete/restore, and keyboard commits are revision-safe, replay-safe, history-complete, snapshot-valid, and authoritative. | D1 receipts, latch/intent state, read-back | `TEST_TASK` — `TEST-001`, `TEST-002`, `TEST-007` | `FAIL` |
| `AC-005` | Component/variant edits fan out only to accepted stable scopes and reconcile selected variants and pending state. | affected-row/source/cache receipts | `TEST_TASK` — `TEST-003`, `TEST-007` | `FAIL` |
| `AC-006` | Archive preserves links; bounded permanent delete uses exact preview, same-batch guard/audit, attachment safety, and complete cache removal. | 400/401, stale-preview, atomic-failure, read-back | `TEST_TASK` — `TEST-003`, `TEST-007`, `TEST-008` | `FAIL` |
| `AC-007` | Template/Project insert is one complete replay-safe target-valid subtree or zero writes within fixed statement limits. | replay/limit/topology/receipt/read-back | `TEST_TASK` — `TEST-004`, `TEST-007` | `FAIL` |
| `AC-008` | Legacy and Client Portal issuance agree on one guarded source revision and private/public meaning. | writer registry, revision fence, zero-write race, parity/privacy | `TEST_TASK` — `TEST-005`, `TEST-007` | `FAIL` |
| `AC-009` | D1 integrity is valid and destructive/shared mutations preserve ownership, revisions, history/outbox, receipts, and read-back. | pre/post queries and mutation receipts | `TEST_TASK` — `TEST-001`–`TEST-005` | `FAIL` |
| `AC-010` | Upload metadata and stored objects cannot drift or delete referenced content. | D1/R2 lifecycle evidence | `TEST_TASK` — `TEST-008` | `FAIL` |
| `AC-011` | Server authorization blocks cross-scope/view-only mutation and public projections contain no private identities/paths. | scope reads and privacy audit | `TEST_TASK` — `TEST-001`, `TEST-005`, `TEST-007`, `TEST-008` | `FAIL` |
| `AC-012` | Enter/Escape, focus, DnD, loading, conflict/offline, retry, and rollback show exact object state with no false success. | route behavior plus authoritative read-back | `TEST_TASK` — `TEST-002`–`TEST-004`, `TEST-007` | `FAIL` |
| `AC-013` | Lazy/partial loading and bulk/shared fan-out stay bounded with correct totals and object-scoped loading. | query/work/render counts and read-back | `TEST_TASK` — `TEST-006`, `TEST-007` | `FAIL` |
| `AC-014` | Source, D1, tests, browser, performance, provider, and public evidence are fresh, labeled, and non-substitutable. | evidence ledger, test receipts, provider identity, validator | `TEST_TASK` — `TEST-007` | `FAIL` |
| `AC-015` | Template graph lifecycle is atomic, bounded, topology-valid, replay-safe, truthful, detached, and provenance-complete. | failure injection, graph/activity/cache read-back | `TEST_TASK` — `TEST-004`, `TEST-007` | `FAIL` |
| `AC-016` | Dense rename/menu states preserve surface, geometry, focus, and consistent keyboard/pointer behavior. | DOM/class ownership and browser behavior | `TEST_TASK` — `TEST-007` | `FAIL` |
| `AC-017` | Rename/filter transitions meet local latency, rerender, request, remount, geometry, continuity, and dependency budgets. | render/network/layout receipts | `TEST_TASK` — `TEST-006`, `TEST-007` | `FAIL` |
| `AC-018` | Favorite set/unset changes only intended preference membership and reconciles item state. | preference-row and cache read-back | `NOT_REQUIRED` — auxiliary | `FAIL` — does not gate core. |
| `AC-019` | Every `MUT-01`–`MUT-12` row proves applicable ownership, atomicity, intent replay, revision/fingerprint guard, side effects, authoritative read-back, cache convergence, and recovery. | mutation matrix plus D1/cache/failure receipts | `TEST_TASK` — `TEST-001`–`TEST-005`, `TEST-008` | `FAIL` |
| `AC-020` | Every `PERF-S01`–`PERF-S12` budget/invariant passes on its named fixture; conditional optimizations are metric-backed and retired machinery stays absent. | before/after work, render, network, route, and D1 receipts | `TEST_TASK` — `TEST-006`, `TEST-007` | `FAIL` |
| `AC-021` | Tracker and manifest always name current epoch, active/next unit, last verified unit, open criteria/tests, continuation, and true blocker; no nonterminal program closes. | tracker/manifest/ledger reconciliation | `NOT_REQUIRED` — document/static proof is decisive | `FAIL` |

No product test was run by this planning refresh. The user has explicitly authorized the implementation program to create, repair, and run `TEST-001` through `TEST-008`; those tests are now mandatory, not proposals.

## Finding Disposition Map

| Finding | Requirement/criterion | Primary unit | Current disposition |
| --- | --- | --- | --- |
| `F-001`, `F-002` | `REQ-002`, `REQ-004`, `DATA-001`; `AC-002`, `AC-004`, `AC-009` | `UNIT-002`, `UNIT-003` | Repair target ownership/tab validation and restore policy. |
| `F-003`, `F-004` | `DATA-002`, `OPS-001`; `AC-010`, `AC-014` | `UNIT-006` | Metadata-first object lifecycle and atomic upload records. |
| `F-005` | `REQ-006`, `DATA-001`, `DATA-002`; `AC-006`, `AC-009`, `AC-010` | `UNIT-004` | Preserve destructive rule; exact-set audit/idempotency and hard `400`-dependent interactive ceiling. |
| `F-006` | `REQ-008`, `SEC-001`; `AC-008`, `AC-011` | `UNIT-007` | Monotonic project publication revision, complete same-batch writer increments, bounded read/reread, guarded zero-write issue commit, deterministic semantic identity, privacy-safe serializers, and atomic pointer replacement. |
| `F-007` | `REQ-001`, `OPS-001`; `AC-001`, `AC-014` | `UNIT-001`, `UNIT-008` | Old blanket PASS is superseded, but evidence still needs method/actual-signal and executable source/diff freshness. |
| `F-008` | `REQ-004`, `DATA-001`; `AC-004`, `AC-009` | `UNIT-002` | Put duplicate source revision/idempotency in mutation boundary. |
| `F-009` | `REQ-005`, `REQ-006`, `DATA-001`; `AC-005`, `AC-006`, `AC-009` | `UNIT-004` | Keep existing uniqueness; revision-guard promotion, recover the canonical winner, and reconcile copied objects/outbox. |
| `F-010` | `REQ-003`, `DATA-001`; `AC-003`, `AC-009` | `UNIT-003` | Two-pass topology, source fingerprint, true retry receipt, and revision-1 copied rows. |
| `F-011` | `REQ-007`, `DATA-001`; `AC-007`, `AC-009` | `UNIT-005` | Correlation receipt and target-derived tab. |
| `F-012` | `REQ-004`, `REQ-005`; `AC-004`, `AC-005` | `UNIT-002` | Bind source fingerprint and row revision to replace commit. |
| `F-013` | `REQ-005`, `UX-001`; `AC-005`, `AC-012` | `UNIT-001`, `UNIT-004` | Preserve source-verified stable-ID rename/pending scope and collect runtime proof. |
| `F-014` | `REQ-004`, `UX-001`; `AC-004`, `AC-012` | `UNIT-001`, `UNIT-002` | Preserve source-verified Enter/blur fix and verify every input/multiline class. |
| `F-015` | `REQ-006`, `DATA-001`; `AC-006`, `AC-009` | `UNIT-001`, `UNIT-004` | Preserve source-verified no-null destructive path and complete `F-005`. |
| `F-016` | `REQ-004`; `AC-004` | `UNIT-001`, `UNIT-002` | Replace partial generic-insert duplication with the atomic `F-008` contract and a source-row-keyed latch that retains one intent through ambiguous outcomes. |
| `F-017` | `REQ-007`, `UX-001`; `AC-007`, `AC-012` | `UNIT-005` | Resolve functional target-kind contradiction with one any-selected-node contract and per-intent copy. |
| `F-018` | `UX-003`; `AC-018` | `UNIT-004` auxiliary tail | Mutate only `favorite_item_ids_json` in the existing preference row with idempotent set/unset and visible retry; no new table and no core release gate. |
| `F-019` | `REQ-006`, `DATA-001`, `UX-001`; `AC-006`, `AC-009`, `AC-012` | `UNIT-004` | Add child creation and authoritative atomic cycle-safe folder mutation. |
| `F-020` | `REQ-002`, `REQ-007`, `SEC-001`; `AC-002`, `AC-007`, `AC-011` | `UNIT-003`, `UNIT-005` | Keep typed events but add target scope, acknowledgement, version, and intent identity. |
| `F-021` | `REQ-006`, `UX-001`; `AC-006`, `AC-012` | `UNIT-004` | Delete the source-proven unreachable reduced editor and local-only save path. |
| `F-022`, `F-023` | `REQ-004`, `REQ-005`, `DATA-001`; `AC-004`, `AC-005`, `AC-009` | `UNIT-002` | Enforce linked-ID/unlinked-NULL/detached-provenance matrix, fix revision-zero producers, audit/backfill, then apply narrow checks. |
| `F-024` | `DATA-002`, `OPS-001`; `AC-010`, `AC-014` | `UNIT-001`, `UNIT-006`, `UNIT-008` | Collect environment-scoped Cloudflare evidence. |
| `TPL-F-001`, `TPL-F-004` | `REQ-009`, `DATA-001`; `AC-009`, `AC-015` | `UNIT-009` | One hard create batch and one explicit contingency field invariant. |
| `TPL-F-002` | `REQ-007`, `UX-001`; `AC-007`, `AC-012` | `UNIT-005` | Add target-scoped pending feedback without full optimistic subtree cloning. |
| `TPL-F-003`, `TPL-F-010` | `REQ-007`, `SEC-001`; `AC-007`, `AC-011` | `UNIT-003`, `UNIT-005` | Superseded by stricter `F-020`/`F-011` acknowledged-routing and committed-receipt fixes. |
| `TPL-F-005` | `REQ-009`, `DATA-001`; `AC-009`, `AC-015` | `UNIT-009` | Keep alpha app guards, collect topology evidence, and defer speculative D1 constraints. |
| `TPL-F-006`, `TPL-F-008` | `REQ-009`, `OPS-001`, `PERF-001`; `AC-013`–`AC-015` | `UNIT-009` | Use existing telemetry for one bounded same-batch operational receipt; remove production seed fallback and return explicit schema-unavailable state. |
| `TPL-F-007` | `REQ-009`; `AC-015` | `UNIT-009` guardrail | Accepted without a new dependency; add schema validation only for a demonstrated boundary defect. |
| `TPL-F-009` | `REQ-004`, `REQ-009`, `DATA-001`; `AC-004`, `AC-009`, `AC-015` | `UNIT-002`, `UNIT-009` | Apply the fixed four-value provenance contract, preserve it on duplicate/restore, and keep it private. |
| `UI-F-001`, `UI-F-002` | `UX-002`; `AC-016` | `UNIT-003`, `UNIT-004`, `UNIT-009` | Use one stable-surface rename model, remove whole-value auto-selection and mouse-leave save, and preserve parent geometry/focus. |
| `UI-F-003`–`UI-F-007` | `UX-002`; `AC-016` | `UNIT-003`–`UNIT-005`, `UNIT-009`, integrated by `UNIT-008` | Make source filters compact/transparent, unify vocabulary and state meaning, reserve action geometry, and retain non-color keyboard focus. |
| `UI-F-008`, `UI-F-009` | `PERF-002`; `AC-017` | `UNIT-003`, `UNIT-005`, `UNIT-009`, integrated by `UNIT-008` | Isolate rename draft rendering and prove loaded filtering adds no fetch, remount, layout shift, or continuity loss. |
| `PP-F-001`–`PP-F-006` | `DATA-003`; `AC-019` | `UNIT-010` plus owning mutation units | Add durable pre-ID intent receipts and one same-batch correctness boundary; preserve zero-write failure and stable replay results. |
| `PP-F-007`, `PP-F-008` | `DATA-003`, `PERF-003`; `AC-019`, `AC-020` | `UNIT-004`, `UNIT-010`, `UNIT-011` | Return complete create projections and name one cache convergence owner without duplicate active refresh. |
| `PP-F-009`–`PP-F-011` | `PERF-003`; `AC-020` | `UNIT-011` | Measure branch comparison, mount refetch, and large-fixture behavior; activate only the smallest proven optimization. |
| `PP-F-012` | `OPS-002`; `AC-021` | `UNIT-011`, `UNIT-008` | Require tracker and test completion before behavior/objective status can close. |

## Evidence Index

| Evidence | Artifact | What it currently proves | Status |
| --- | --- | --- | --- |
| `EVID-001` | `09-ESTIMATE-SHEET-FEATURE-ACTION-MATRIX.md` | The current discoverable action inventory and open-status classification. | `COLLECTED` |
| `EVID-002` | `10-DATA-INTEGRITY-BUG-AND-READINESS-AUDIT.md` | Current source/migration/binding findings and evidence gaps. | `COLLECTED` |
| `EVID-003` | `IMPLEMENTATION_PLAN.md` | Dependency-closed unit scopes, acceptance, evidence, and recovery are specified. | `COLLECTED` |
| `EVID-004` | `TRACEABILITY.md` | Twenty-one requirements/criteria, eleven units, eight tests, findings, and current evidence are reciprocally mapped, with `UX-003`/`AC-018` explicitly auxiliary. | `COLLECTED` |
| `EVID-005` | `11-ISSUE-BY-ISSUE-ROOT-CAUSE-BLAST-RADIUS-AND-FIX-SIMULATIONS.md` | Every finding has a current-source disposition, failure/race/partial-failure simulation, alternatives, selected minimal resolution, and residual risk. | `COLLECTED` |
| `EVID-006` | `12-COMPONENT-TEMPLATES-ABSORPTION-AND-LIFECYCLE-CONTRACT.md` | All eight source requirements, ten findings, four units, eight evidence claims, architecture/flow/variant contracts, conflicts, and source-pack removal gates are retained under current authority. | `COLLECTED` |
| `EVID-007` | `13-ESTIMATE-SHEET-UX-UI-AND-INTERACTION-PERFORMANCE-READINESS.md` | The live/source baseline, nine UX findings, exact rename/filter budgets, interaction contracts, existing strengths, unit owners, and required test evidence are current. | `COLLECTED` |
| `EVID-008` | `14-ESTIMATE-SHEET-MVP-PERFORMANCE-PERSISTENCE-AND-TEST-CONTRACT.md` | Twelve current performance/persistence findings, twelve mutation rows, twelve performance scenarios, cache/receipt/D1/index contracts, fifteen failure simulations, and the authorized test policy are current. | `COLLECTED` |
| `EVID-009` | `IMPLEMENTATION_TRACKER.md` | Current epoch, dependency eligibility, units, requirements, mutation/performance/test checklists, evidence dimensions, and completion reconciliation are explicit. | `COLLECTED` |
| `EVID-010` | `IMPLEMENTATION_PLAN.md` | Exact `TEST-001`–`TEST-008` commands and expected signals are authored but unrun. | `PLANNED` |

These records prove plan readiness only. `EVID-007` and `EVID-008` prove observed/source baselines and planned contracts, not corrected behavior. `EVID-010` is planned evidence, not a test result. None proves product implementation, local D1 mutations, preview/hosted provider behavior, or public-share behavior.

## Release And Resume Decision

- Package: `IMPLEMENTATION_READY`
- Implementation: `NOT_STARTED`
- Behavior: `NOT_EVALUATED`
- Objective: `NOT_ACHIEVED`
- Release: `NOT_READY`
- Lifecycle: `ACTIVE`
- Terminal: `ACTIVE`
- Exact next unit: `UNIT-001`
- Ready slice: all eleven fully authored units; only `UNIT-001` is dependency-eligible now, `UNIT-011` is the required test/performance gate, and `UNIT-008` is final reconciliation
- Required tests: `TEST-001` through `TEST-008`, all `PLANNED`
- Current blocker: none; all missing implementation, testing, and proof is repository-controlled planned work

If source changes before `UNIT-001` freezes a baseline, mark the affected source/evidence stale and refresh the smallest impacted requirement/unit mapping. Never preserve a PASS by updating only a hash.
