# Estimate Sheet MVP Implementation Tracker

**Tracker epoch:** `2026-07-15-MVP-PERFORMANCE-PERSISTENCE-HARDENING`  
**Package status:** `IMPLEMENTATION_READY`  
**Implementation status:** `IN_PROGRESS`
**Behavior status:** `NOT_EVALUATED`  
**Objective status:** `NOT_ACHIEVED`  
**Release status:** `NOT_READY`  
**Active unit:** `UNIT-005`
**Last verified unit:** `UNIT-004`
**Required next unit:** `UNIT-005`
**Continuation reason:** component/variant lifecycle, bounded permanent delete, retained update intent, atomic fan-out receipts, promotion recovery, folder integrity, and stable Library/project-group rename are verified; replay-safe Template/Project-source insertion and transparent source filtering are the next dependency-ordered unit

## Tracker Rules

1. This is the resumable execution state for the current epoch. `LOOP_LEDGER.md` remains append-only history.
2. Update this file and `plan-pack.json` at every unit transition, test-group result, reopened criterion, or real blocker.
3. `READY` in the manifest means the unit is fully authored. The `Eligible now` column below determines dependency eligibility.
4. Only one unit is `ACTIVE` unless the dependency graph explicitly permits independent scopes and the tracker names both owners.
5. A failed required test reopens its owning unit. The executor fixes and reruns it; failure is not a handoff or completion state.
6. Repository-controlled work cannot be left as `BLOCKED`. Use `TECH_BLOCKED` only after materially different recovery approaches fail; use `AUTH_BLOCKED` only for a true external authorization boundary.
7. Implementation is complete only when every core unit is `VERIFIED`. Objective completion additionally requires every core criterion and required test to be `PASS`.
8. `NOT_EVALUATED`, `IMPLEMENTED_UNVERIFIED`, and a planning validator pass never equal behavior or objective completion.

## Unit Progress

| Done | Unit | State | Eligible now | Required result | Evidence/test gate |
| --- | --- | --- | --- | --- | --- |
| [x] | `UNIT-001` | `VERIFIED` | `DONE` | fresh baseline, writer/mutation registry, fixtures, budgets, and receipts frozen | clean scoped Git receipt; local D1 parity/integrity; clean canonical-route reload; 135-action inventory; publication-writer registry |
| [x] | `UNIT-010` | `VERIFIED` | `DONE` | durable intent receipt plus complete create-to-use cache continuity | migration/read-back/query-plan receipts; 31 focused tests; exact-route create→insert with zero prerequisite reload/refetch |
| [x] | `UNIT-002` | `VERIFIED` | `DONE` | row mutation integrity | `TEST-001`, `TEST-002`, applicable `TEST-007` row/keyboard scenarios |
| [x] | `UNIT-003` | `VERIFIED` | `DONE` | tree/tab topology and rename isolation | `TEST-001`, `TEST-006`, applicable `TEST-007` tree/tab/rename scenarios |
| [x] | `UNIT-004` | `VERIFIED` | `DONE` | component/variant lifecycle and bounded permanent delete | `TEST-003`, applicable `TEST-008`, real SQLite commit/replay/rollback receipts |
| [ ] | `UNIT-005` | `IN_PROGRESS` | `YES` | replay-safe Template/Project insertion | `TEST-004` |
| [ ] | `UNIT-006` | `READY` | `YES — queued behind active UNIT-005` | D1/R2/Images integrity | `TEST-008` plus provider receipts |
| [ ] | `UNIT-009` | `READY` | `NO — UNIT-004, UNIT-005, UNIT-010` | atomic Template lifecycle | `TEST-004` |
| [ ] | `UNIT-007` | `READY` | `NO — UNIT-002–006, UNIT-009, UNIT-010` | guarded authoring-to-issued parity | `TEST-005` |
| [ ] | `UNIT-011` | `READY` | `NO — all implementation units` | whole-route optimization plus all authorized tests | `TEST-001`–`TEST-008` |
| [ ] | `UNIT-008` | `READY` | `NO — UNIT-011` | final action/criterion/objective/release reconciliation | all prior evidence |

## Requirement Progress

| Done | Requirement | Role | Owner | Current evidence state |
| --- | --- | --- | --- | --- |
| [ ] | `REQ-001` | core | `UNIT-001`, `UNIT-008`, `UNIT-009` | planning only |
| [ ] | `REQ-002` | core | `UNIT-003`, `UNIT-008` | tab CRUD/duplicate/delete retry, topology, and route fallback verified; final reconciliation remains |
| [ ] | `REQ-003` | core | `UNIT-003`, `UNIT-008` | Area CRUD/move/reorder/delete/restore topology and rename semantics verified; final reconciliation remains |
| [ ] | `REQ-004` | core | `UNIT-002`, `UNIT-008` | UNIT-002 row CRUD/retry/revision/keyboard slice verified; final reconciliation remains |
| [ ] | `REQ-005` | core | `UNIT-002`, `UNIT-004`, `UNIT-010`, `UNIT-008` | receipt/cache, row ownership, component/variant fan-out, and scoped loading verified; final reconciliation remains |
| [ ] | `REQ-006` | core | `UNIT-004`, `UNIT-010`, `UNIT-008` | create projection/cache continuity, promotion, archive/permanent delete, folder integrity, and Project-component lifecycle verified; final reconciliation remains |
| [ ] | `REQ-007` | core | `UNIT-005`, `UNIT-010`, `UNIT-008` | reusable-source receipt/cache foundation verified; source insertion remains |
| [ ] | `REQ-008` | core | `UNIT-007`, `UNIT-008` | planning only |
| [ ] | `REQ-009` | core | `UNIT-009`, `UNIT-010`, `UNIT-008` | planning only |
| [ ] | `DATA-001` | core | mutation units | row, tab/tree, component update, promotion, folder, and permanent-delete contracts verified; Template/source units remain |
| [ ] | `DATA-002` | core | `UNIT-004`, `UNIT-006`, `UNIT-008` | component-delete attachment reference handling verified; provider upload/image lifecycle remains |
| [ ] | `DATA-003` | core | `UNIT-010`, mutation units, `UNIT-011`, `UNIT-008` | durable receipt foundation plus row, tab, component update/fan-out, and permanent-delete replay verified; remaining mutation families open |
| [ ] | `SEC-001` | core | all persistent units | row, tab/tree, component, folder, promotion, delete, and attachment ownership boundaries verified; remaining persistent units open |
| [ ] | `UX-001` | core | interaction units | row, Area/tab, active-variant, Library-folder, project-group, and Manage Groups commit/loading behavior verified; Template/source interactions remain |
| [ ] | `UX-002` | core | `UNIT-003`–`UNIT-005`, `UNIT-009`, `UNIT-011`, `UNIT-008` | Area/tab/Library-folder/project-group stable-surface rename verified; Template rename and source filtering remain |
| [ ] | `PERF-001` | core | row/tree/source units | overlap-aware row coordination, authoritative tab/tree recovery, bounded component fan-out, and object-scoped pending verified; source units remain |
| [ ] | `PERF-002` | core | rename/filter units | Area/tab/folder/group rename geometry and local draft isolation verified; Template/filter surfaces remain |
| [ ] | `PERF-003` | core | `UNIT-001`, `UNIT-010`, `UNIT-011`, `UNIT-008` | create-to-use plus same-intent shared-update convergence verified; whole-route budgets remain |
| [ ] | `OPS-001` | core | `UNIT-001`, `UNIT-006`, `UNIT-009`, `UNIT-008` | planning only |
| [ ] | `OPS-002` | core | `UNIT-001`, `UNIT-010`, `UNIT-011`, `UNIT-008` | retained-intent replay and mismatch zero-write proof verified for component create/update, row duplicate, and permanent delete; remaining command families open |
| [ ] | `UX-003` | auxiliary | optional `UNIT-004` tail | planning only; does not gate core |

## Mutation Safety Checklist

For each row, change `OPEN` only after the linked implementation, failure simulations, authoritative read-back, and cache receipt are complete.

| Done | ID | Mutation family | Ownership | Atomicity | Intent replay | Revision/fingerprint | History/outbox/receipt | Read-back/cache | State |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [x] | `MUT-01` | blank/Library insert | [x] | [x] | [x] | [x] | [x] | [x] | `VERIFIED` |
| [x] | `MUT-02` | row update/replace/variant | [x] | [x] | [x] | [x] | [x] | [x] | `VERIFIED` |
| [x] | `MUT-03` | row move/restore/reorder | [x] | [x] | [x] | [x] | [x] | [x] | `VERIFIED` |
| [x] | `MUT-04` | row duplicate | [x] | [x] | [x] | [x] | [x] | [x] | `VERIFIED` |
| [x] | `MUT-05` | row/bulk delete/restore | [x] | [x] | [x] | [x] | [x] | [x] | `VERIFIED` |
| [x] | `MUT-06` | component create/update/fan-out | [x] | [x] | [x] | [x] | [x] | [x] | `VERIFIED` |
| [x] | `MUT-07` | permanent component delete | [x] | [x] | [x] | [x] | [x] | [x] | `VERIFIED` |
| [ ] | `MUT-08` | Template CRUD | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | `OPEN` |
| [ ] | `MUT-09` | Template create/composition | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | `OPEN` |
| [ ] | `MUT-10` | Template/Project insert | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | `OPEN` |
| [ ] | `MUT-11` | upload/image/attachment | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | `OPEN` |
| [ ] | `MUT-12` | publication replacement | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | `OPEN` |

## Performance Scenario Checklist

| Done | Scenario | Fixture captured | Before | After | Budget/invariant | Conditional optimization decision | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [ ] | `PERF-S01` warm route | [ ] | — | — | [ ] | — | `OPEN` |
| [ ] | `PERF-S02` optimistic row edit | [ ] | — | — | [ ] | — | `OPEN` |
| [ ] | `PERF-S03` row render isolation | [ ] | — | — | [ ] | — | `OPEN` |
| [ ] | `PERF-S04` shared-edit convergence | [x] UNIT-004 scope | duplicate active refresh path plus broad pending risk | retained update intent, one same-batch receipt, variant-scoped pending, authoritative convergence | [ ] whole-route measurement remains | preserve scoped fan-out; no new state framework | `PARTIAL — UNIT-004 behavior verified` |
| [x] | `PERF-S05` create-to-use | [x] | invalidation/refetch-dependent cache path | `0` prerequisite reload/refetch; complete option graph available | [x] | synchronous full/lite/rows cache convergence; no broader framework | `VERIFIED` |
| [ ] | `PERF-S06` 100-child expand | [ ] | — | — | [ ] | — | `OPEN` |
| [ ] | `PERF-S07` 500-node tree | [ ] | — | — | [ ] | — | `OPEN` |
| [ ] | `PERF-S08` 1,000-item search | [ ] | — | — | [ ] | — | `OPEN` |
| [ ] | `PERF-S09` rename/filter | [x] Area/tab/folder/group | background-shifting controlled inputs, pointer-exit saves, and shared rename state | transparent stable geometry, caret-end focus, pointer-exit no-save, local drafts | [ ] Template/filter owners remain | reuse local inputs and existing menu substrate; no new dependency | `PARTIAL — UNIT-003/004 rename slices verified` |
| [ ] | `PERF-S10` Template hydration | [ ] | — | — | [ ] | — | `OPEN` |
| [ ] | `PERF-S11` 1,500-node/5,000-row behavior | [ ] | — | — | [ ] | — | `OPEN` |
| [ ] | `PERF-S12` D1 round trips | [ ] | — | — | [ ] | — | `OPEN` |

## Authorized Test Progress

| Done | Test | State | Exact owner | First failing case | Fix receipt | Rerun result |
| --- | --- | --- | --- | --- | --- | --- |
| [x] | `TEST-001` contract/topology/D1 guards | `PASS` | `UNIT-002`, `UNIT-003`, `UNIT-010` | stale component guard ignored version mismatch | timestamp+version component guard, migration `0082`, two-pass tab copy, parent/cycle/destination guards, authoritative recovery | exact group rerun: `3` files / `17` tests passed |
| [ ] | `TEST-002` row CRUD/retry/concurrency | `PARTIAL_PASS` | `UNIT-002`, `UNIT-011` | duplicate used generic insert without source-revision/replay guarantees | dedicated duplicate operation, retained intent, overlap-aware coordinator, authoritative read-back | UNIT-002 exact group: `6` files / `91` tests passed; UNIT-011 full rerun remains |
| [x] | `TEST-003` components/variants/delete | `PASS` | `UNIT-004`, `UNIT-010`, `UNIT-011` | missing update/fan-out receipt and bounded delete atomicity | retained update intent, same-batch fan-out/audit/publication receipt, exact permanent-delete set/ceiling, promotion/folder recovery | exact group: `7` files / `27` tests passed; UNIT-011 must rerun as the final regression gate |
| [ ] | `TEST-004` Templates/reusable sources | `PARTIAL_PASS` | `UNIT-005`, `UNIT-009`, `UNIT-010`, `UNIT-011` | — | generic receipt and cache-convergence foundation covered | UNIT-010 focused slice passed; Template/source cases remain |
| [ ] | `TEST-005` publication/D1 integrity | `PLANNED` | `UNIT-007`, `UNIT-011` | — | — | — |
| [x] | `TEST-006` render/large-data performance | `PASS` | `UNIT-003`, `UNIT-011` | production demo seed removal and editable-row-store centralization left stale test harnesses | test-only library fixture, required store providers, and incremental-total expectation | exact group: `6` files / `26` tests passed; UNIT-011 must rerun as the final regression gate |
| [ ] | `TEST-007` browser Estimate Sheet MVP | `PARTIAL_PASS` | `UNIT-011` | stale Turbopack chunk prevented client hydration during the first receipt attempt | graceful local restart, copied-tab server hydration, stable Area rename, Enter commit, delete fallback, and exact fixture cleanup | applicable UNIT-002 row/keyboard and UNIT-003 tree/tab/rename scenarios passed with no page exception; full UNIT-011 suite remains |
| [ ] | `TEST-008` storage/provider lifecycle | `PARTIAL_PASS` | `UNIT-004`, `UNIT-006`, `UNIT-011` | — | UNIT-004 attachment ownership/delete-retention slice | exact current group: `6` files / `32` tests passed; UNIT-006 provider lifecycle and final UNIT-011 rerun remain |

## Evidence Dimensions

| Done | Dimension | Required signal | Current state |
| --- | --- | --- | --- |
| [ ] | source/static | exact owners, types, query/cache paths, diff hygiene | repository type-check and `git diff --check` passed through UNIT-004; scoped UNIT-004 ESLint has `0` errors and `7` known warnings |
| [ ] | local D1 | before/after, zero-write failures, receipts, authoritative read-back | migrations current through owned `0082`; real SQLite proves component update commit/replay and injected full rollback, while tab/tree integrity counts remain zero |
| [ ] | focused tests | all `TEST-001`–`TEST-006`, `TEST-008` pass | prior UNIT receipts plus UNIT-004 exact `TEST-003` `27`, current `TEST-008` `32`, focused aggregate `10` files / `113`, and real SQLite `2`; remaining groups open |
| [ ] | browser | `TEST-007` passes with no console/page errors | UNIT-003 copied tab hydrated without reload, Area rename kept `318×28` transparent bounds and ignored pointer exit, Enter persisted once, and tab delete selected the surviving route with zero residue; full TEST-007 remains open |
| [ ] | performance | all `PERF-S*` budgets/invariants pass | PERF-S05 verified; PERF-S04 component-update and PERF-S09 Area/tab/folder/group slices verified behaviorally; integrated measurements remain open |
| [ ] | provider | scoped preview/hosted D1 and R2 evidence where applicable | not evaluated |
| [ ] | public projection | guarded issue/publication parity and privacy | not evaluated |
| [ ] | plan/trace | manifest, tracker, ledger, hashes, paths, and validator agree | transitions through UNIT-004 recorded with UNIT-005 active; terminal reconciliation remains open |

## Unit Verification Receipts

### `UNIT-010` — 2026-07-15T09:11:26Z

- Added schema-only migrations `0080_project_publication_source_revision.sql` and `0081_estimate_mutation_receipts.sql`; local D1 is current through `0081`, the receipt uniqueness lookup uses its index, invalid payload/revision counts are zero, and the disposable component/row cleanup left one valid append-only receipt.
- Added canonical fingerprint, retained-intent replay, mismatch rejection, bounded receipt, same-batch completion, and `1000`-statement ceiling helpers; component create resolves receipts before ID allocation and returns authoritative state.
- Added synchronous full/lite/rows cache convergence owned by `EstimateSheetContent`; focused QueryClient proof records zero invalidation/refetch and preserves the complete option/attachment projection.
- Exact-route browser proof created `UNIT-010 Create Use Proof`, inserted it immediately into the active Estimate without reload, read back matching component/option/row provenance from D1, then permanently deleted the fixture and linked row.
- Focused result: `5` files, `31` tests passed; scoped ESLint returned `0` errors; `git diff --check` passed; GitNexus detected `14` changed symbols, `3` expected affected processes, and `MEDIUM` aggregate risk.
- The broader `TEST-001`, `TEST-003`, and `TEST-004` groups remain nonterminal because their downstream owners have not run; this receipt verifies only the UNIT-010 slices.

### `UNIT-002` — 2026-07-15T10:32:48Z

- Added migration `0082_estimate_row_integrity_constraints.sql`; preflight and postflight counts are zero for revision-floor, object-JSON, source/link-matrix, and pricing-provenance violations, and `PRAGMA foreign_key_check` is empty.
- Made insert/update/replace/move/reorder/delete/restore operations atomic with active-tab/destination/revision guards, authoritative read-back, history/outbox/publication statements, and overlap-aware client mutation coordination.
- Replaced generic duplicate insertion with a dedicated source-revision-guarded operation that copies every persisted row-owned field, emits revision `1`, writes one `row_duplicated` event and durable receipt, replays the same intent, rejects changed payloads, and performs zero writes for stale source or invalid target.
- Preserved single-line Enter as prevent/stop/blur commit, multiline Enter as newline, `Mod+Enter` as multiline commit, and Escape as revert; focused duplicate/keyboard coverage passed `48` tests.
- Exact required groups passed: `TEST-001` UNIT-002 slice `3` files / `17` tests and `TEST-002` UNIT-002 slice `6` files / `91` tests; repository type-check and `git diff --check` passed, while scoped ESLint reported `0` errors and `4` known warnings.
- Exact-route proof duplicated row `28bc4cf4-d3d6-411c-9a66-ffd14e2a1428` into disposable row `e785cae6-35c3-4d8b-b3e7-4ba1f5baaa2b`, read back `0` copied-field mismatches, revision `1`, object JSON, one committed receipt, then used Enter to persist quantity `26` at revision `2` and deleted the exact fixture.
- Cleanup left `0` fixture rows, `1` valid append-only duplicate receipt, duplicate/update/delete history intact, and no foreign-key defects; full `TEST-001`, `TEST-002`, and `TEST-007` remain nonterminal for their later owners.

### `UNIT-003` — 2026-07-15T12:15:44Z

- Added two-pass tab copy with preallocated node/row IDs, complete source-parent validation, source fingerprint and retained-intent receipt before allocation, revision-`1` copied rows, deterministic order, same-batch history/outbox/publication statements, and authoritative replay/read-back.
- Guarded tab and Area create/move/reorder/delete/restore against workspace, active tab, destination, incomplete-tree, and cycle violations; rejected operations now refresh the affected tab from authoritative D1 instead of synthesizing parents or retaining stale selection.
- Added a versioned, target-scoped external-drop envelope and disabled unsafe drag while search, rename, pending create, permission, or lazy-tree completeness makes the target ambiguous.
- Kept Area and tab rename bounds/background stable, focused the caret at the value end, deduplicated Enter/blur saves, preserved Escape revert, removed pointer-exit save, and isolated Area draft/status from sibling rows.
- Fixed copied-tab hydration by supplying query initial data only for the server-rendered initial tab; a non-initial copied tab now fetches authoritative nodes instead of caching a fresh empty array.
- Exact required gates passed: `TEST-001` `3` files / `17` tests and `TEST-006` `6` files / `26` tests; an additional topology/UI regression slice passed `11` files / `179` tests.
- Repository type-check and `git diff --check` passed; scoped ESLint returned `0` errors and `3` pre-existing unused-fixture warnings in `estimate-sheet-tree-dom.test.tsx`.
- Exact-route proof duplicated `Page 001` into tab `0955a821-34ee-4c1a-a409-91159bad25ff`, hydrated `4` copied nodes / `5` copied rows without reload, renamed the root to `UNIT-003 Area Proof` with stable `318×28` transparent geometry and no pointer-exit save, persisted once on Enter, then deleted the tab and fell back to the surviving original route.
- Cleanup removed the copied tab, all copied nodes, and all copied rows; foreign-key, orphan-node, orphan-row, cross-estimate, self-parent, cross-tab-parent, and cycle checks remained zero.
- A noncanonical fixture-consumer sweep exposed unrelated stale styling/action expectations in legacy UI tests; those failures are not used as UNIT-003 evidence and remain with their later `TEST-003`/`TEST-004` owners.

### `UNIT-004` — 2026-07-15T13:41:38Z

- Completed archive/permanent-delete behavior with exact dependent-set preview and revalidation, an interactive `400`-row ceiling with `401` refusal, same-batch component/dependent deletion, per-estimate/template audit/outbox receipts, one durable mass-deletion receipt, attachment-reference cleanup, and zero `source_snapshot_json = NULL` writes.
- Completed component update/fan-out replay safety with a retained client intent, request fingerprint, receipt-before-allocation replay, stable affected row revisions, one grouped event/outbox per estimate, one publication-source revision increment per affected project, and full same-batch rollback on injected receipt failure.
- Preserved stable-ID active-variant fan-out and skeleton scope; concurrent promotion now returns the canonical winner, child-folder create/reorder is atomic and cycle-safe, and the unreachable reduced component editor was removed.
- Aligned Library folder, project group, and Manage Groups rename with the stable transparent surface contract: Enter saves, Escape cancels, blur deduplicates, pointer exit does not save, and sibling/action geometry does not repaint.
- Exact required slices passed: `TEST-003` `7` files / `27` tests and the current `TEST-008` group `6` files / `32` tests; the focused UNIT-004 aggregate passed `10` files / `113` tests, and real in-memory SQLite commit/replay plus injected rollback passed `2` tests.
- Repository type-check and `git diff --check` passed. Scoped UNIT-004 ESLint returned `0` errors and `7` known warnings: three pre-existing memo dependency warnings in `EstimateSheetContent.tsx`, three pre-existing unused telemetry destructures, and one pre-existing unused D1 row type in `component-library/actions.ts`.
- Full provider lifecycle remains owned by `UNIT-006`, and the integrated route/performance rerun remains owned by `UNIT-011`; neither is claimed by this receipt.

## Completion Reconciliation

Before changing any terminal status, answer all of the following from fresh evidence:

- [ ] Every core unit is `VERIFIED`.
- [ ] Every core criterion `AC-001` through `AC-021`, excluding auxiliary `AC-018`, is `PASS`.
- [ ] Every required test `TEST-001` through `TEST-008` is `PASS`; no unexpected skip or flaky-green result remains.
- [ ] Every `MUT-*` row is complete.
- [ ] Every `PERF-S*` row meets its budget/invariant.
- [ ] `behavior_status` is `VERIFIED`, not merely implemented.
- [ ] `objective_status` is `ACHIEVED` only after all preceding checks.
- [ ] `release_status` reflects environment/public evidence truthfully.
- [ ] `next_unit` and `required_next_unit` are null only at a true terminal state.
