# Estimate Sheet MVP Implementation Tracker

**Tracker epoch:** `2026-07-15-MVP-PERFORMANCE-PERSISTENCE-HARDENING`  
**Package status:** `IMPLEMENTATION_READY`  
**Implementation status:** `COMPLETE`
**Behavior status:** `VERIFIED`
**Objective status:** `ACHIEVED`
**Release status:** `NOT_READY`  
**Active unit:** `NONE`
**Last verified unit:** `UNIT-008`
**Required next unit:** `NONE`
**Continuation reason:** none; every local core unit, criterion, mutation row, performance scenario, and authorized test is terminal. Release remains `NOT_READY` because no current-source deploy or current-revision hosted D1/R2/browser proof was requested or produced.

## Tracker Rules

1. This is the resumable execution state for the current epoch. `LOOP_LEDGER.md` remains append-only history.
2. Update this file and `plan-pack.json` if later source drift invalidates a receipt.
3. A product change after this terminal receipt reopens only the smallest affected unit, criterion, test, and evidence record.
4. `COMPLETE / VERIFIED / ACHIEVED` describes the locally implemented and verified objective; it does not imply deployment or hosted release proof.
5. `NOT_READY` release status is an environment-evidence boundary, not an open repository implementation unit.

## Unit Progress

| Done | Unit | State | Required result | Terminal evidence |
| --- | --- | --- | --- | --- |
| [x] | `UNIT-001` | `VERIFIED` | fresh baseline, writer/mutation registry, fixtures, budgets, and receipts | scoped Git, local D1, route inventory, writer registry |
| [x] | `UNIT-010` | `VERIFIED` | durable intent receipt plus create-to-use cache continuity | migrations, read-back, query plans, focused tests |
| [x] | `UNIT-002` | `VERIFIED` | row mutation integrity | `TEST-001`, `TEST-002`, `TEST-007` |
| [x] | `UNIT-003` | `VERIFIED` | tree/tab topology and rename isolation | `TEST-001`, `TEST-006`, `TEST-007` |
| [x] | `UNIT-004` | `VERIFIED` | component/variant lifecycle and bounded permanent delete | `TEST-003`, `TEST-008`, SQLite failure/replay receipts |
| [x] | `UNIT-005` | `VERIFIED` | replay-safe Template/Project insertion | `TEST-004`, `TEST-006`, `TEST-007` |
| [x] | `UNIT-006` | `VERIFIED` | D1/R2/Images integrity | `TEST-008` and environment-scoped provider receipts |
| [x] | `UNIT-009` | `VERIFIED` | atomic Template lifecycle | `TEST-004`, activity/fallback/replay receipts |
| [x] | `UNIT-007` | `VERIFIED` | guarded authoring-to-issued parity | `TEST-005`, zero-write stale-source receipts |
| [x] | `UNIT-011` | `VERIFIED` | whole-route performance plus authorized regression suite | `TEST-001`–`TEST-008`, `PERF-S01`–`PERF-S12` |
| [x] | `UNIT-008` | `VERIFIED` | final action/criterion/objective/release reconciliation | tracker, traceability, ledger, manifest, validators |

## Requirement Progress

| Done | Requirement | Role | Terminal evidence state |
| --- | --- | --- | --- |
| [x] | `REQ-001` | core | canonical action/source ownership and absorbed Template authority reconciled |
| [x] | `REQ-002` | core | tab CRUD, duplicate/delete retry, topology, and route fallback verified |
| [x] | `REQ-003` | core | Area CRUD/move/reorder/delete/restore topology and rename semantics verified |
| [x] | `REQ-004` | core | row CRUD, retry, revision, retained duplicate intent, and keyboard commits verified |
| [x] | `REQ-005` | core | receipt/cache, row ownership, fan-out, selected variant, and scoped pending verified |
| [x] | `REQ-006` | core | create/cache, promotion, archive/permanent delete, folder, and Project lifecycle verified |
| [x] | `REQ-007` | core | replay-safe arbitrary-target Template/Project-source insertion verified |
| [x] | `REQ-008` | core | shared projector, parity, opaque identity, revision fence, immutability, and privacy verified |
| [x] | `REQ-009` | core | atomic Template create/save/duplicate/header/category/editor/composition verified |
| [x] | `DATA-001` | core | row, tree, component, Template/source, provider, and publication mutations verified |
| [x] | `DATA-002` | core | attachment references, claims, delayed cleanup, replay, and terminal metadata verified |
| [x] | `DATA-003` | core | all persistent families prove retained intent, atomicity, replay, and convergence |
| [x] | `SEC-001` | core | scope authorization and compact privacy-safe public projections verified |
| [x] | `UX-001` | core | exact-object pending, retry, conflict, rollback, focus, and keyboard feedback verified |
| [x] | `UX-002` | core | stable-surface rename and transparent compact filtering verified |
| [x] | `PERF-001` | core | bounded fan-out, hydration, pending, filtering, and virtualization verified |
| [x] | `PERF-002` | core | rename/filter render, network, geometry, and continuity invariants verified |
| [x] | `PERF-003` | core | `PERF-S01`–`PERF-S12` pass their target or declared hard invariant |
| [x] | `OPS-001` | core | provider identity, activity receipts, evidence freshness, and boundaries recorded |
| [x] | `OPS-002` | core | terminal tracker/manifest/test/criterion reconciliation verified |
| [ ] | `UX-003` | auxiliary | favorite durability remains optional and does not gate the achieved core objective |

## Mutation Safety Checklist

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

| Done | Scenario | Terminal receipt | Budget/invariant | State |
| --- | --- | --- | --- | --- |
| [x] | `PERF-S01` warm route | `50.7ms`, zero document requests, shell preserved | target `<100ms` | `VERIFIED` |
| [x] | `PERF-S02` optimistic row insert | `31.3ms` optimistic response | target `<100ms` | `VERIFIED` |
| [x] | `PERF-S03` row render isolation | edited row/direct totals only; sibling material rows remain isolated | render-count invariant | `VERIFIED` |
| [x] | `PERF-S04` shared-edit convergence | one cache owner, no duplicate active-tree refetch, variant-scoped pending | convergence invariant | `VERIFIED` |
| [x] | `PERF-S05` create-to-use | zero prerequisite reload/refetch; complete option graph immediately usable | zero prerequisite request invariant | `VERIFIED` |
| [x] | `PERF-S06` 100-child expand | `101` nodes, `14` mounted, `31.8453ms` | target `<300ms` | `VERIFIED` |
| [x] | `PERF-S07` 500-node tree | `500` nodes, `14` mounted, `135.7836ms` | target `<500ms` | `VERIFIED` |
| [x] | `PERF-S08` 1,000-item search | `0.418834ms`, zero requests | target `<300ms` | `VERIFIED` |
| [x] | `PERF-S09` rename/filter | rename `67ms`; filter `105.1ms`; zero server actions; continuity preserved | rename target met; filter hard invariant `<200ms` met, `<100ms` target remains a watch item | `VERIFIED` |
| [x] | `PERF-S10` Template hydration | bounded summary query plus selected-detail hydration only | bounded-request invariant | `VERIFIED` |
| [x] | `PERF-S11` 1,500-node/5,000-row | `1,000` linked + `4,000` unrelated rows, zero unrelated reads, `3.425709ms` | locality/work-bound invariant | `VERIFIED` |
| [x] | `PERF-S12` D1 round trips | one mutation batch + one post-commit row readback; replay performs no second batch; browser p50 `285.84ms`, p95 `925.18ms` diagnostics | fixed round-trip invariant | `VERIFIED` |

No speculative production optimization was added for `PERF-S06`, `PERF-S07`, `PERF-S08`, or `PERF-S11`; existing boundaries passed deterministic fixtures.

## Authorized Test Progress

| Done | Test | State | Final serial result |
| --- | --- | --- | --- |
| [x] | `TEST-001` contract/topology/D1 guards | `PASS` | `3` files / `19` tests |
| [x] | `TEST-002` row CRUD/retry/concurrency | `PASS` | `6` files / `97` tests |
| [x] | `TEST-003` components/variants/delete | `PASS` | `7` files / `29` tests |
| [x] | `TEST-004` Templates/reusable sources | `PASS` | `7` files / `96` tests |
| [x] | `TEST-005` publication/D1 integrity | `PASS` | `8` files / `49` tests |
| [x] | `TEST-006` render/large-data performance | `PASS` | `7` files / `29` tests, including Library 1,000-item search |
| [x] | `TEST-007` browser Estimate Sheet MVP | `PASS` | exact Chromium journey, `1/1` passed with zero unexpected errors and zero cleanup errors |
| [x] | `TEST-008` storage/provider lifecycle | `PASS` | `6` files / `32` tests |

Final serial Vitest total: `44` files / `351` tests. Browser total: `1` exact journey.

## Evidence Dimensions

| Done | Dimension | Terminal signal |
| --- | --- | --- |
| [x] | source/static | `bun run type-check` passed; scoped ESLint passed with zero output; scoped and global `git diff --check` passed |
| [x] | local D1 | current through `0087`; integrity and ownership preflights clean; replay/rollback/read-back receipts pass |
| [x] | focused tests | all `TEST-001`–`TEST-006` and `TEST-008` pass serially: `44` files / `351` tests |
| [x] | browser | exact `TEST-007` Chromium journey passes with no unexpected console/page/request failures and no cleanup errors |
| [x] | performance | all `PERF-S01`–`PERF-S12` targets or declared hard invariants pass; raw metrics retained above |
| [x] | provider | local provider lifecycle verified; preview/hosted identity recorded without claiming current-source deployment |
| [x] | public projection | one guarded privacy-safe projector feeds legacy and Client Portal issuance with revision/hash fences |
| [x] | plan/trace | tracker, traceability, append-only ledger, manifest hashes, and canonical validators reconcile |

## Unit Verification Receipts

> Receipts through `UNIT-007` are preserved as point-in-time history. Later terminal receipts supersede their then-open continuation statements.

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

### `UNIT-011` — 2026-07-16T07:42:59Z

- Repaired duplicate-row client retained intent so one source-row-keyed command preserves row ID, mutation ID, source revision, target, active tab, and the exact optimistic item across ambiguous outcomes and retries.
- Preserved idempotent optimistic append, exact-row rollback, deliberate-rejection intent release, full authoritative result patching, and one D1 batch plus one post-commit readback.
- Ran the eight authorized groups serially: `44` Vitest files / `351` tests and the exact Chromium journey `1/1` passed with zero unexpected errors and zero cleanup errors.
- Captured `PERF-S01`–`PERF-S12`; every target or declared hard invariant passed. The `105.1ms` loaded filter result remains an explicit watch item against the preferred `<100ms` target while satisfying the `<200ms` completion invariant.
- `bun run type-check`, scoped ESLint, scoped/global `git diff --check`, attachment/provider regressions, and GitNexus affected-flow review passed.

### `UNIT-008` — 2026-07-16T07:42:59Z

- Reconciled all eleven units, twenty core requirements, twelve mutation rows, twelve performance scenarios, eight authorized tests, twenty core criteria, evidence records, tracker state, append-only ledger, and manifest.
- Core implementation is `COMPLETE`, behavior is `VERIFIED`, and the objective is `ACHIEVED`; auxiliary `UX-003` / `AC-018` remains non-gating.
- Release remains `NOT_READY` solely because no current-source deployment or current-revision hosted D1/R2/browser proof was requested or produced.

### Resume marker

`ACTIVE = NONE`

`LAST_VERIFIED = UNIT-008`

`NEXT = NONE`

`CONTINUATION_REQUIRED = false`
`STOP = objective achieved; reopen only on source drift or an explicit hosted-release task`

## Completion Reconciliation

- [x] Every core unit is `VERIFIED`.
- [x] Every core requirement and criterion is accepted/`PASS`; auxiliary `UX-003` / `AC-018` remains explicitly non-gating.
- [x] Every mutation row `MUT-01` through `MUT-12` is `VERIFIED`.
- [x] Every performance scenario `PERF-S01` through `PERF-S12` passes its target or declared hard invariant.
- [x] Every required test `TEST-001` through `TEST-008` is `PASS`; no unexpected skip or flaky-green result remains.
- [x] Static, local D1, attachment/provider, browser, performance, public-projection, and GitNexus evidence is recorded.
- [x] Tracker, ledger, traceability, manifest, artifact hashes, and validators agree on the terminal tuple.
- [x] No active unit, required next unit, repository blocker, or continuation remains.
- [x] Release remains separately and truthfully `NOT_READY` pending a future explicitly authorized current-source deploy/hosted-proof task.
