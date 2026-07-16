# Estimate Sheet MVP Implementation Tracker

**Tracker epoch:** `2026-07-15-MVP-PERFORMANCE-PERSISTENCE-HARDENING`  
**Package status:** `IMPLEMENTATION_READY`  
**Implementation status:** `IN_PROGRESS`
**Behavior status:** `NOT_EVALUATED`  
**Objective status:** `NOT_ACHIEVED`  
**Release status:** `NOT_READY`  
**Active unit:** `UNIT-011`
**Last verified unit:** `UNIT-007`
**Required next unit:** `UNIT-011`
**Continuation reason:** legacy share and Client Portal issuance now use one guarded authoring projection with revision/hash parity, privacy-safe deterministic identities, zero-write stale-source behavior, and exact `TEST-005` proof; whole-route performance measurement plus the final serial `TEST-001`–`TEST-008` gate is next

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
| [x] | `UNIT-005` | `VERIFIED` | `DONE` | replay-safe Template/Project insertion | `TEST-004`, applicable `TEST-006`, focused `TEST-007` DOM/network contracts |
| [x] | `UNIT-006` | `VERIFIED` | `DONE` | D1/R2/Images integrity | `TEST-008` plus local/preview/hosted environment receipts |
| [x] | `UNIT-009` | `VERIFIED` | `DONE` | atomic Template lifecycle | `TEST-004`, replay/failure/activity/fallback receipts |
| [x] | `UNIT-007` | `VERIFIED` | `DONE` | guarded authoring-to-issued parity | `TEST-005`; legacy/client zero-write and revision-read-back receipts |
| [ ] | `UNIT-011` | `IN_PROGRESS` | `YES` | whole-route optimization plus all authorized tests | `TEST-001`–`TEST-008` |
| [ ] | `UNIT-008` | `READY` | `NO — UNIT-011` | final action/criterion/objective/release reconciliation | all prior evidence |

## Requirement Progress

| Done | Requirement | Role | Owner | Current evidence state |
| --- | --- | --- | --- | --- |
| [ ] | `REQ-001` | core | `UNIT-001`, `UNIT-008`, `UNIT-009` | Template lifecycle and source-pack absorption contracts are implemented; final reconciliation remains |
| [ ] | `REQ-002` | core | `UNIT-003`, `UNIT-008` | tab CRUD/duplicate/delete retry, topology, and route fallback verified; final reconciliation remains |
| [ ] | `REQ-003` | core | `UNIT-003`, `UNIT-008` | Area CRUD/move/reorder/delete/restore topology and rename semantics verified; final reconciliation remains |
| [ ] | `REQ-004` | core | `UNIT-002`, `UNIT-008` | UNIT-002 row CRUD/retry/revision/keyboard slice verified; final reconciliation remains |
| [ ] | `REQ-005` | core | `UNIT-002`, `UNIT-004`, `UNIT-010`, `UNIT-008` | receipt/cache, row ownership, component/variant fan-out, and scoped loading verified; final reconciliation remains |
| [ ] | `REQ-006` | core | `UNIT-004`, `UNIT-010`, `UNIT-008` | create projection/cache continuity, promotion, archive/permanent delete, folder integrity, and Project-component lifecycle verified; final reconciliation remains |
| [ ] | `REQ-007` | core | `UNIT-005`, `UNIT-010`, `UNIT-008` | retained-intent receipt/cache foundation plus arbitrary-target Template/Project-source insertion verified; final reconciliation remains |
| [ ] | `REQ-008` | core | `UNIT-007`, `UNIT-008` | shared authoring projection, legacy/client field parity, deterministic opaque identity, revision fence, immutable issue, and privacy contracts are verified; final reconciliation remains |
| [ ] | `REQ-009` | core | `UNIT-009`, `UNIT-010`, `UNIT-008` | atomic Template create/save/duplicate/header/category/editor/composition, truthful browse fallback, and retained intent are verified; final reconciliation remains |
| [ ] | `DATA-001` | core | mutation units | row, tab/tree, component, Template/source, provider, and guarded publication-replacement mutation contracts are verified; final reconciliation remains |
| [ ] | `DATA-002` | core | `UNIT-004`, `UNIT-006`, `UNIT-008` | attachment references, removal claims, delayed cleanup, replay, and terminal metadata transitions are verified; final reconciliation remains |
| [ ] | `DATA-003` | core | `UNIT-010`, mutation units, `UNIT-011`, `UNIT-008` | durable replay/atomicity coverage includes row, tree, component, Template/source, Template lifecycle, upload, and guarded publication families; integrated final gates remain |
| [ ] | `SEC-001` | core | all persistent units | ownership boundaries, compact issued fields, deterministic opaque IDs, and publication privacy/revision guards are verified; final reconciliation remains |
| [ ] | `UX-001` | core | interaction units | row, tree, component, source, and Template lifecycle feedback contracts are verified; publication and whole-route reconciliation remain |
| [ ] | `UX-002` | core | `UNIT-003`–`UNIT-005`, `UNIT-009`, `UNIT-011`, `UNIT-008` | Area/tab/folder/group/Template stable-surface rename and transparent filtering are verified; integrated whole-route proof remains |
| [ ] | `PERF-001` | core | row/tree/source units | overlap coordination, bounded fan-out/hydration, target pending, local filtering, and Template summary/detail boundaries are verified; whole-route measurements remain |
| [ ] | `PERF-002` | core | rename/filter units | Area/tab/folder/group/Template rename geometry, local draft isolation, and filter continuity are verified; integrated measurements remain |
| [ ] | `PERF-003` | core | `UNIT-001`, `UNIT-010`, `UNIT-011`, `UNIT-008` | create-to-use plus same-intent shared-update convergence verified; whole-route budgets remain |
| [ ] | `OPS-001` | core | `UNIT-001`, `UNIT-006`, `UNIT-009`, `UNIT-008` | provider environment identity and Template operational activity receipts are verified; final reconciliation remains |
| [ ] | `OPS-002` | core | `UNIT-001`, `UNIT-010`, `UNIT-011`, `UNIT-008` | retained-intent replay and mismatch zero-write proof covers component, row, Template/source, Template lifecycle, and upload commands; publication and final sweep remain |
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
| [x] | `MUT-08` | Template CRUD | [x] | [x] | [x] | [x] | [x] | [x] | `VERIFIED` |
| [x] | `MUT-09` | Template create/composition | [x] | [x] | [x] | [x] | [x] | [x] | `VERIFIED` |
| [x] | `MUT-10` | Template/Project insert | [x] | [x] | [x] | [x] | [x] | [x] | `VERIFIED` |
| [x] | `MUT-11` | upload/image/attachment | [x] | [x] | [x] | [x] | [x] | [x] | `VERIFIED` |
| [x] | `MUT-12` | publication replacement | [x] | [x] | [x] | [x] | [x] | [x] | `VERIFIED` |

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
| [ ] | `PERF-S09` rename/filter | [x] Area/tab/folder/group/Template/filter | background-shifting controlled inputs, pointer-exit saves, shared rename state, and filter-driven selection/reset risk | transparent stable geometry, caret-end focus, pointer-exit no-save, local drafts, and filter continuity without request/remount | [ ] integrated route measurement remains | reuse local inputs and existing menu substrate; keep filter state local; no new dependency | `PARTIAL — behavior verified through UNIT-009` |
| [ ] | `PERF-S10` Template hydration | [x] | per-item insertion, synthetic fallback, split lifecycle writes, and ambiguous retry risk | bounded summary/detail hydration, explicit unavailable state, one-batch lifecycle, retained intents, authoritative subtree, and target-only pending | [ ] integrated route measurement remains | preserve one hard D1 batch and local cache/event convergence | `PARTIAL — lifecycle behavior verified` |
| [ ] | `PERF-S11` 1,500-node/5,000-row behavior | [ ] | — | — | [ ] | — | `OPEN` |
| [ ] | `PERF-S12` D1 round trips | [ ] | — | — | [ ] | — | `OPEN` |

## Authorized Test Progress

| Done | Test | State | Exact owner | First failing case | Fix receipt | Rerun result |
| --- | --- | --- | --- | --- | --- | --- |
| [x] | `TEST-001` contract/topology/D1 guards | `PASS` | `UNIT-002`, `UNIT-003`, `UNIT-010` | stale component guard ignored version mismatch | timestamp+version component guard, migration `0082`, two-pass tab copy, parent/cycle/destination guards, authoritative recovery | exact group rerun: `3` files / `17` tests passed |
| [ ] | `TEST-002` row CRUD/retry/concurrency | `PARTIAL_PASS` | `UNIT-002`, `UNIT-011` | duplicate used generic insert without source-revision/replay guarantees | dedicated duplicate operation, retained intent, overlap-aware coordinator, authoritative read-back | UNIT-002 exact group: `6` files / `91` tests passed; UNIT-011 full rerun remains |
| [x] | `TEST-003` components/variants/delete | `PASS` | `UNIT-004`, `UNIT-010`, `UNIT-011` | missing update/fan-out receipt and bounded delete atomicity | retained update intent, same-batch fan-out/audit/publication receipt, exact permanent-delete set/ceiling, promotion/folder recovery | exact group: `7` files / `27` tests passed; UNIT-011 must rerun as the final regression gate |
| [x] | `TEST-004` Templates/reusable sources | `PASS` | `UNIT-005`, `UNIT-009`, `UNIT-010`, `UNIT-011` | reusable-source insertion and Template lifecycle lacked one retained atomic command path, complete provenance, and truthful schema fallback | retained intents, authoritative source/target validation, one-batch Template lifecycle/activity receipts, fresh identities, contingency/provenance canonicalization, and explicit unavailable state | exact current group: `7` files / `95` tests passed; lifecycle/action group `3` files / `34`; gallery `14`; UNIT-011 must rerun as final regression gate |
| [x] | `TEST-005` publication/D1 integrity | `PASS` | `UNIT-007`, `UNIT-011` | legacy and Client Portal used divergent projection/fingerprint paths without one exact source-revision commit fence | shared authoring projector/hash/opaque namespace, revision-aware writer registry, guarded batch commit, zero-write stale-source handling, revision-first stale summary with legacy fallback | exact group: `8` files / `49` tests passed; UNIT-011 must rerun as the final regression gate |
| [x] | `TEST-006` render/large-data performance | `PASS` | `UNIT-003`, `UNIT-005`, `UNIT-011` | production demo seed removal and editable-row-store centralization left stale test harnesses | test-only library fixture, required store providers, incremental-total expectation, and target-scoped insertion pending isolation | exact group: `6` files / `27` tests passed; UNIT-011 must rerun as the final regression gate |
| [ ] | `TEST-007` browser Estimate Sheet MVP | `PARTIAL_PASS` | `UNIT-011` | stale Turbopack chunk prevented client hydration during the first receipt attempt; the planned `e2e/estimate-sheet-mvp.spec.ts` is not yet present | graceful local restart, copied-tab server hydration, stable Area rename, Enter commit, delete fallback, exact fixture cleanup, and focused UNIT-005 DOM/network/focus/geometry contracts | applicable UNIT-002 row/keyboard, UNIT-003 tree/tab/rename, and UNIT-005 insertion/filter contracts passed without browser overclaim; UNIT-011 owns creation and execution of the exact full suite |
| [x] | `TEST-008` storage/provider lifecycle | `PASS` | `UNIT-004`, `UNIT-006`, `UNIT-011` | session/asset/event writes and request-time object deletion could diverge metadata from R2 | one atomic D1 lifecycle, guarded zero-reference removal claims, delayed recheck/terminal cleanup, retained objects, and replay-safe reconciliation | exact current group: `6` files / `32` tests passed; broader provider group `16` files / `185`; UNIT-011 must rerun as final regression gate |

## Evidence Dimensions

| Done | Dimension | Required signal | Current state |
| --- | --- | --- | --- |
| [ ] | source/static | exact owners, types, query/cache paths, diff hygiene | `git diff --check` passed; scoped UNIT-007 ESLint has `0` errors and `7` untouched workspace-repository warnings; typecheck reaches only two stale generated admin-route imports and three unrelated missing admin `KnowledgeStatusBadge` references |
| [ ] | local D1 | before/after, zero-write failures, receipts, authoritative read-back | local D1 is current through `0087`; copied/live migration proof has `integrity_check=ok`, zero folder/default/policy/component violations, and zero upload-lifecycle preflight defects |
| [ ] | focused tests | all `TEST-001`–`TEST-006`, `TEST-008` pass | exact `TEST-005` `8` files / `49`; legacy publication `4` files / `35`; client issuance `2` files / `11`; revision-summary/drawer slice `6` files / `25`; final UNIT-011 serial reruns remain |
| [ ] | browser | `TEST-007` passes with no console/page errors | UNIT-003 copied tab hydrated without reload, Area rename kept `318×28` transparent bounds and ignored pointer exit, Enter persisted once, and tab delete selected the surviving route with zero residue; full TEST-007 remains open |
| [ ] | performance | all `PERF-S*` budgets/invariants pass | PERF-S05 verified; PERF-S04 component-update, PERF-S09 rename/filter, and PERF-S10 insertion slices verified behaviorally; integrated measurements remain open |
| [x] | provider | scoped preview/hosted D1 and R2 evidence where applicable | bound resources and environment parity were audited: local is current through `0087`, preview is empty, hosted D1 is through `0074`, and the hosted Worker predates current source; no deploy or hosted mutation was performed or claimed |
| [x] | public projection | guarded issue/publication parity and privacy | one canonical authoring projector feeds legacy and Client Portal snapshots; revision/hash fences reject changed source with zero publication writes, issue snapshots remain immutable, IDs are deterministic opaque values, compact fields exclude private source JSON, and revision-aware stale state preserves the timestamp fallback for legacy snapshots |
| [ ] | plan/trace | manifest, tracker, ledger, hashes, paths, and validator agree | transitions through UNIT-007 are recorded with UNIT-011 active; terminal reconciliation remains open |

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

### `UNIT-005` — 2026-07-15T14:51:15Z

- Made Template and Project-source insertion target-correct for any selected Area/group node, derived tab and estimate ownership authoritatively from that target, and rejected caller target/tab mismatch before writes.
- Retained one client intent across ambiguous retry, resolved receipts before source load or ID allocation, validated the complete source graph first, rebuilt fresh IDs/topology/order, and committed guard, nodes, rows, publication/history/outbox, and receipt in one bounded D1 batch.
- Enforced the inclusive `1000`-statement limit without chunking; oversized, invalid-source, invalid-target, and mismatched-tab requests allocate nothing and write nothing.
- Preserved row-owned selected variant, current canonical pricing, non-null source snapshots/provenance, revision `1`, and authoritative result/event envelopes with a single claimant.
- Scoped pending feedback to only the insertion target and kept source filtering local, transparent, compact, focus-stable, and selection/expansion/scroll preserving; category insertion now awaits one batch command.
- Exact `TEST-004` passed `7` files / `90` tests; project-source action passed `1` file / `11` tests; insert authorization/action guards passed `2` files / `37` tests; exact `TEST-006` passed `6` files / `27` tests; scoped ESLint and `git diff --check` passed.
- Focused DOM/network/focus/geometry tests prove UNIT-005 interaction contracts; the planned `e2e/estimate-sheet-mvp.spec.ts` does not yet exist, so no full `TEST-007` pass is claimed and `UNIT-011` remains its owner.

### `UNIT-006` — 2026-07-15T17:48:56Z

- Unified ordinary/direct upload session, asset, event, replay, reconciliation, and cleanup metadata changes under one atomic D1 batch helper; migrations `0084` and `0087` fail closed on invalid lifecycle, actor, session, storage, and removal-state relationships.
- Replaced request-time R2 deletion with a zero-reference D1 removal claim, delayed reference recheck, per-object cleanup result, and terminal purged transition; component/project deletes queue cleanup and preserve shared objects.
- Applied local migrations through `0087` only after synthetic and copied-real-D1 proof; local postflight reports zero default-folder, component-folder, policy-folder, and parent-folder violations with `integrity_check=ok`.
- Exact `TEST-008` passed `6` files / `32` tests; the broader upload/provider lifecycle group passed `16` files / `185` tests; scoped lint had `0` errors and `git diff --check` passed.
- Provider identity is explicit: `archestimator-proof`, `ARCH_DB`, `ARCH_UPLOADS_R2`, and `IMAGES`; preview is empty, hosted D1 is through `0074`, and the hosted Worker predates current source, so no hosted mutation, fixture, deploy, or hosted parity claim was made.

### `UNIT-009` — 2026-07-15T17:48:56Z

- Replaced split Template header/graph writes and compensating cleanup with one mandatory D1 batch for create/save/duplicate/header/category/editor/composition intents, including bounded same-batch telemetry and durable replay receipts.
- Preserved source-workspace authorization, detached fresh identities, authoritative read-back, selected variant and pricing provenance, contingency canonicalization, and one `1000`-statement ceiling; failed batches leave no shell or partial graph.
- Removed production synthetic Template fallback and the unreachable Template-row reorder export; missing tables now return an explicit schema-unavailable/migration state.
- Exact `TEST-004` passed `7` files / `95` tests; lifecycle/action tests passed `3` files / `34`, gallery tests `14`, focused intent tests `3`, and new-template/editor tests `3` files / `25`.
- Scoped lint had `0` errors and only `4` untouched warnings; `git diff --check` passed; typecheck reached only two stale generated admin-route imports and three unrelated missing admin badge references.
- A broad non-gating component-library UI sweep still contains unrelated stale category-label/summary expectations; exact Template lifecycle gates are green and UNIT-011 owns the final integrated rerun.

### `UNIT-007` — 2026-07-15T18:40:15Z

- Added one canonical authoring-row projector, semantic hash, and project-scoped opaque namespace shared by legacy publication and Client Portal issuance; snapshots now carry schema `1.6`, exact source revision, category/supplier/variant/pricing/totals fields, and privacy-safe deterministic IDs.
- Added bounded capture/reread loops plus same-batch commit fences. Legacy replacement/rotation and Client Portal issue writes are conditional on the exact project publication revision; a changed source commits no publication header, child rows, audit/outbox, pointer, revoke, activation, or recipient invalidation writes.
- Completed the issue-visible writer registry for estimate details/bulk deletion and project image/details/location/client-name mutations, with one same-batch `publication_source_revision` increment per affected project; an exact producer registry rejects missing, unknown, or duplicate writer facts.
- Added revision-first stale/reissue metadata without expanding the CRITICAL shared project reader or changing the CRITICAL timestamp helper; legacy snapshots retain the previous timestamp fallback, and the Publisher drawer renders both warning shapes safely.
- Exact `TEST-005` passed `8` files / `49` tests. Focused legacy publication passed `4` files / `35`, client publish/issue passed `2` files / `11`, and revision summary plus drawer coverage passed `6` files / `25`.
- Scoped UNIT-007 ESLint returned `0` errors with `7` untouched workspace-repository warnings; `git diff --check` passed. Typecheck now reaches only two stale generated admin-route imports and three unrelated missing admin `KnowledgeStatusBadge` references.
- A broader non-gating publication sweep passed `114/115`; its sole stale `SharePageSessionBanner` source assertion also fails against `HEAD` and is unrelated to the UNIT-007 diff, so it was not used as parity evidence or weakened.

### Resume marker

`LAST_VERIFIED = UNIT-007`
`ACTIVE = UNIT-011`
`NEXT = RUN_WHOLE_ROUTE_PERFORMANCE_AND_SERIAL_TEST_GATE`
`STOP = TEST-001 through TEST-008, PERF-S01 through PERF-S12, scoped static checks, fixture cleanup, and GitNexus change detection are terminal with decisive evidence`

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
