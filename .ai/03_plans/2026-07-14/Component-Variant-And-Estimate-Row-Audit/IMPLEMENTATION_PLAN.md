# Canonical Implementation Plan

## Status

- Package: `IMPLEMENTATION_READY`
- Implementation: `NOT_STARTED`
- Exact next unit: `UNIT-001`
- Ready slice: `SLICE-001 = [UNIT-001..UNIT-011]`; dependencies still control execution order.
- Current mode: plan pack; no product implementation performed by this run.

## Execution Rules

1. Run startup/current-state checks and reread shared dirty files before each unit.
2. Run GitNexus upstream impact before editing every indexed function/class/method. Warn before any HIGH/CRITICAL edit.
3. Use one writer per shared file family. Never have two units edit `EstimateSheetContent.tsx`, component actions, or the D1 adapter concurrently.
4. Preserve unrelated dirty work; no reset, stash, revert, clean, branch, commit, push, or worktree changes.
5. Use `apply_patch` for edits.
6. Default evidence is source/diff/TypeScript-LSP/lint/static/D1 dry-run or narrow runtime diagnostics.
7. Do not create/run automated product tests, builds-as-gates, browser automation, screenshots, Storybook, or visual QA without a new explicit test task.
8. After each unit: reconcile its requirements/risks/evidence, update `LOOP_LEDGER.md`, reread the next unit's shared files, and stop if the unit cannot be truthfully closed.

## Dependency DAG

```text
UNIT-001 Canonical component/variant identity and fan-out
  -> UNIT-004 Shared images and attachments
  -> UNIT-005 Component dock lifecycle/concurrency
  -> UNIT-006 Template trust and bounded hydration

UNIT-002 Atomic row mutations and concurrency
  -> UNIT-003 Area/tab truth, save reconciliation, render containment

UNIT-001 + UNIT-003 + UNIT-004 + UNIT-006
  -> UNIT-007 Consistent issued projection and financial scope

UNIT-007
  -> UNIT-008 Recipient access and session lifecycle

UNIT-007 + UNIT-008
  -> UNIT-009 Scoped issued-target discussions
  -> UNIT-010 Formal decisions and issue state

UNIT-002..UNIT-010
  -> UNIT-011 Scale, delivery/activity, cross-pack completion audit
```

`UNIT-002` may run in a separate native executor lane after `UNIT-001` ownership is established because its primary files overlap in the D1 adapter. `UNIT-008` is logically downstream of issued identity for final proof but can be researched/prepared in parallel; do not integrate its route/session patch until the issue contract is stable.

## `UNIT-001` — Canonical Add/Edit Component, Variant Identity, And Fan-Out

**Status:** `READY`  
**Requirements:** `UX-001`, `REQ-004`, `REQ-005`, `REQ-006`, `REQ-008`, `REQ-015`, `REQ-016`, `REQ-017`, `REQ-018`, `DATA-001`, `OPS-001`, `SEC-001`  
**Risks:** `RISK-001`, `RISK-002`, `RISK-013`, `RISK-014`, `RISK-015`, `RISK-016`, `RISK-017`, `RISK-019`

### Target result

Make the full Add/Edit modal and one domain mutation the sole component graph authority, then ensure Library/Project CRUD and Estimate-row transfer preserve component identity, target variant identity, every unaffected selection, and row-local values in one guarded all-or-nothing write.

### Files/symbols

- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/component-library-manager/AddComponentModal.tsx`
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
- `src/components/workshop/library/EditComponentDrawer.tsx` (delete after redirect)
- `src/components/workshop/component-library/index.tsx`
- `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts`
- `src/hooks/use-estimate-row-mutations.ts`
- `src/lib/component-library/actions.ts`
- `src/lib/component-library/project-component-projection.ts`
- `src/lib/estimates/actions.ts`
- `src/lib/estimates/d1-action-client.ts`
- row patch/source snapshot helpers

Before changing `buildLinkedEstimateRowsSyncStatement`, report its existing HIGH blast radius. Run impact for every other edited indexed symbol.

### Steps

1. inventory the current Add/Edit modal, reduced drawer, inline editor, duplicate, promotion/detach, and Estimate-row insert/replace/move/delete paths against the audit matrix.
2. redirect every advanced edit to the full modal and delete the reduced drawer; retain the current compact UI.
3. replace the OpenDesign-specific input and flat/full mutations with one component + ordered stable-ID option graph contract.
4. separate initiating row selection from explicit component default; opening/saving from Option 2 cannot set default.
5. split component-level, target-variant, and row-local write masks and require target `priceOptionId` for variant edits.
6. make affected-row fingerprint include row IDs/revisions and component/option revision facts needed to reject a changed impact set.
7. replace blanket Library default-option fan-out with per-target selected-option derivation and preserve override masks.
8. apply the same option-scoped rule to Project component groups inside one project; adding/defaulting an option never reselects instances.
9. define used-variant deletion as guarded explicit replacement; unused deletion remains direct.
10. preserve atomic make-project-specific, promotion, and foreign-project localization with the complete option graph.
11. return/reread authoritative component detail and changed row revisions; delete label-based optimistic ID reconciliation.

### Acceptance

- editing Option 2 changes Option 2 only and no row using Default/Option 3 is reselected;
- every advanced surface opens the same full modal and no reduced drawer caller remains;
- save without explicit **Set default** preserves the component default;
- component name/description change reaches eligible instances without changing their option selection;
- overridden rows are not overwritten or reset clean;
- a stale component/row/impact fingerprint writes nothing;
- project fan-out cannot cross project boundary;
- make-project-specific changes one row only and leaves Library master untouched.
- create/edit/duplicate/reload returns the exact authoritative ordered option graph and IDs.

### Evidence

- source/diff inspection of option IDs and update masks;
- static TypeScript/LSP and targeted lint for touched files;
- D1 statement/batch shape inspection showing guards precede writes and no partial branch;
- change-scope analysis for affected flows.

### Stop condition

All acceptance bullets are evidenced or the unit remains incomplete. Attachment persistence is not started inside this unit.

## `UNIT-002` — Atomic Row Mutations And Concurrency

**Status:** `READY`  
**Requirements:** `REQ-002`, `REQ-003`, `SEC-001`  
**Risks:** `RISK-004`, `RISK-013`

### Target result

Eliminate partial move, insert/edit, and stale bulk-delete behavior while preserving optimistic responsiveness and history.

### Steps

1. make source/target component move one guarded D1 operation with one correlation/history receipt;
2. serialize/merge row edit behind normal Library/Project insert exactly as express insert already does;
3. send and enforce every bulk-delete row revision;
4. return explicit conflict/authoritative rows for reconciliation;
5. use canonical minor-unit delta in history path;
6. verify delete/restore and move do not corrupt tab/node sort or component receipts.

### Acceptance

- injected target/source/revision failure leaves all rows unchanged;
- immediate Qty edit persists after insert with correct revision;
- stale bulk delete conflicts without deleting any row;
- history/outbox has one coherent event per atomic operation;
- visible and history totals use the same calculation basis.

### Evidence

Source/D1 static proof plus targeted runtime dry-run/diagnostic if available without creating/running a product test suite.

## `UNIT-003` — Area/Tab Truth, Save Reconciliation, Render Containment

**Status:** `READY`  
**Depends on:** `UNIT-002`  
**Requirements:** `REQ-001`, `REQ-003`, `PERF-001`  
**Risks:** `RISK-005`, `RISK-012`, `RISK-013`

### Steps

1. propagate load-limit/sentinel state for every tab;
2. mark incomplete branch totals and disable completeness-dependent moves/issue actions;
3. reconcile authoritative insert/mutation results even when local revision changed;
4. repair initialData/remount freshness and first-prop reconciliation;
5. clear dirty state for invalid/reverted drafts;
6. fix branch memo comparison to use affected-row status only;
7. keep column-width persistence retryable/observable.

### Acceptance

- no partial tab appears complete;
- save state returns clean after revert/invalid blur;
- server-authoritative data wins after mutation/remount;
- one row mutation does not rerender unaffected branches;
- branch/estimate totals remain exact and scoped feedback does not shift numeric columns.

## `UNIT-004` — Shared Images And Variant Attachments

**Status:** `READY`  
**Depends on:** `UNIT-001`  
**Requirements:** `REQ-005`, `REQ-008`, `REQ-015`, `DATA-001`, `OPS-001`, `SEC-001`  
**Risks:** `RISK-003`, `RISK-013`, `RISK-018`

### Steps

1. route shared image edits through component/workspace ownership and persist selected component/variant descriptor;
2. rebuild attachment item/option relations to the current foreign-key target and add insert/update/remove persistence to the authoritative option write;
3. validate finalized asset, scan/ownership, option/item/workspace, and unique path;
4. make metadata and component/option/version changes atomic/recoverable;
5. exclude attachments from duplicate unless R2 object is copied to a fresh path;
6. ensure list/detail/editor round-trip returns persisted attachment metadata;
7. retain review/supersession state and cleanup unclaimed uploads.

### Acceptance

- create/edit/reload preserves selected variant image and attachments;
- another workspace/project cannot bind/read the asset;
- duplicate leaves original attachment ownership unchanged;
- removed attachment has explicit metadata/asset lifecycle;
- failure creates no false saved state and no ownership transfer.

## `UNIT-005` — Component Dock Lifecycle And Concurrency

**Status:** `READY`  
**Depends on:** `UNIT-001`  
**Requirements:** `UX-001`, `REQ-008`, `REQ-015`, `REQ-018`, `OPS-001`, `PERF-001`  
**Risks:** `RISK-006`, `RISK-013`, `RISK-014`, `RISK-017`, `RISK-019`

### Steps

1. enforce insertability (`available`) separately from management visibility;
2. add request identity/cancellation for editor hydration;
3. serialize per-item folder moves;
4. hydrate duplicate variants before exposing it as fully usable;
5. route duplicate through the one authoritative full-detail duplicate action with fresh IDs;
6. remove the reduced drawer and any superseded surface-specific mutation callers;
7. guard template hover/expand prefetch with synchronous in-flight refs;
8. preserve compact loading/error/empty states, keyboard semantics, and Qty focus after project drop.

## `UNIT-006` — Template Trust And Bounded Hydration

**Status:** `READY`  
**Depends on:** `UNIT-001`  
**Requirements:** `REQ-007`, `SEC-001`, `PERF-001`  
**Risks:** `RISK-006`, `RISK-013`

### Steps

1. replace all-template graph load with bounded summaries and one selected graph;
2. persist/resolve referenced component and selected option identity;
3. validate current workspace/lifecycle/variant at insert;
4. use current source data for valid linked inserts;
5. require explicit saved-snapshot-as-unlinked or cancel for unavailable source;
6. preserve fresh node/row/project identities and atomic D1 insert limit.

## `UNIT-007` — Consistent Issued Projection And Financial Scope

**Status:** `READY`  
**Depends on:** `UNIT-001`, `UNIT-003`, `UNIT-004`, `UNIT-006`  
**Requirements:** `REQ-009`, `REQ-010`, `SEC-001`, `PERF-001`  
**Risks:** `RISK-010`, `RISK-011`, `RISK-012`, `RISK-013`

### Steps

1. extend private publication read with row revision and safe component/variant receipt inputs;
2. add bounded consistency fingerprint/recheck;
3. calculate semantic hash before delivery/random identity material and define no-op republish;
4. extend snapshot/public ID mapping with issue-local `component` anchors;
5. emit client-safe row projection and optional safe image only;
6. honor per-section data scope/comparison/grouping or reject unsupported configuration;
7. reconcile all bucket totals from issued minor units;
8. choose D1/R2/server-page storage by explicit bounds.

### Acceptance

- concurrent source change cannot yield a mixed issue;
- unchanged semantic source dedupes according to policy;
- repeated component rows share an opaque issue component anchor;
- raw IDs/private costs/source/paths are absent;
- area and financial totals exactly match issued rows;
- unsupported financial configuration blocks publish with a precise error.

## `UNIT-008` — Recipient Access And Session Lifecycle

**Status:** `READY`  
**Depends on:** `UNIT-007`  
**Requirements:** `REQ-012`, `REQ-014`, `SEC-001`  
**Risks:** `RISK-007`, `RISK-008`, `RISK-013`

### Steps

1. produce valid `outbox_*` records and a deliverable secret-safe bootstrap link payload;
2. preserve recipient token through password unlock;
3. atomically verify first valid redemption and mint session;
4. bind session to recipient and portal access credential versions;
5. enforce both versions on manifest/section/thread/activity/decision routes;
6. map revoke/resend/password/access-off/withdraw/expiry to explicit invalidation;
7. expose truthful owner-side queued/delivered/dead state.

### Acceptance

One invited recipient can receive, password-unlock, redeem, view, comment, and decide; every rotation/revocation path invalidates prior access as specified; secrets do not enter logs/plaintext D1.

## `UNIT-009` — Scoped Issued-Target Discussions

**Status:** `READY`  
**Depends on:** `UNIT-007`, `UNIT-008`  
**Requirements:** `REQ-011`, `REQ-014`, `SEC-001`  
**Risks:** `RISK-009`, `RISK-013`

### Steps

1. define shared issued target resolver/index for estimate/tab/area/row/component;
2. add component and area comment kinds where missing; split legacy decision target type from comment type;
3. validate target membership and derive labels server-side;
4. filter thread list/message/read/reply/resolve/reopen by issue/section policy;
5. make create idempotency race-safe;
6. implement mark-read use and correct notification outbox writes;
7. define historical/stale/carry-forward behavior with semantic target re-resolution.

## `UNIT-010` — Formal Decisions And Issue State

**Status:** `READY`  
**Depends on:** `UNIT-007`, `UNIT-008`  
**Requirements:** `REQ-013`, `REQ-014`, `SEC-001`  
**Risks:** `RISK-011`, `RISK-013`

### Steps

1. separate request-changes from formal approve/decline authorization;
2. evaluate decision policy/required approvers from the issued snapshot;
3. bind idempotency and intent to issue content hash;
4. insert receipt, aggregate decision state, transition issue, audit, and notify owner-side audience atomically;
5. expose recipient-visible decision summary/receipt under capability;
6. reject stale/superseded/withdrawn/expired decisions;
7. restore capability-aware mobile decision action.

## `UNIT-011` — Scale, Delivery/Activity, And Completion Audit

**Status:** `READY`  
**Depends on:** `UNIT-002`, `UNIT-003`, `UNIT-004`, `UNIT-005`, `UNIT-006`, `UNIT-007`, `UNIT-008`, `UNIT-009`, `UNIT-010`  
**Requirements:** all 23 requirements  
**Risks:** `RISK-012`, `RISK-013`, `RISK-019`

### Steps

1. replace client-only pagination with bounded storage/read paging where thresholds require;
2. build tree/row indexes once and aggregate linearly;
3. add bounded discussion/activity reads and correct delivery cadence/audience;
4. replace empty Activity issue payload with client-safe live issued activity service where policy permits;
5. restore capability-aware mobile Discuss/Decision actions;
6. run source/diff/static/D1 contract evidence for every requirement;
7. update all unit/criterion/evidence statuses and hashes;
8. reconcile `Shared-Link-Page` and `Workshop-Library-Audit` status/references without archiving unless proof permits;
9. run plan/static validators and GitNexus change detection;
10. prove one editor/mutation/duplicate/variant-authority path and remove every proof-cleared compatibility-only artifact;
11. record remaining real risks; do not label hosted/production readiness from local evidence.

## Parallel Execution Map

Use native role-specialized subagents only when the coordination gain is real:

| Phase | Lane | Role | File ownership |
| --- | --- | --- | --- |
| A | component identity | `executor` | component actions + inline component handlers |
| A | row atomicity | `executor` | row mutation service/D1 functions, serialized if shared adapter overlaps |
| B | recipient access | `debugger` then `executor` | recipient/session/notification queue |
| B | template/dock | `executor` | template repository/dock after Unit 1 shared ownership clears |
| C | issuance/financial | `architect` review then `executor` | snapshot/publish/financial/issue builder |
| D | discussions | `executor` | thread/comment target resolvers and routes |
| D | decisions | `executor` | decision service/routes/UI |
| E | verifier | `verifier` | read-only requirement/evidence reconciliation |

The leader owns integration, shared-file serialization, final validation, and every completion claim. `worker` is not used outside active OMX team runtime.

## Test Boundary

No product test workstream is part of this pack. Acceptance scenarios describe current-beta correctness, not backward compatibility. Product tests, builds, browser automation, screenshots, and visual QA remain user-controlled and require a separate explicit test task.

## Resume And Recovery

At resume:

1. run startup protocol;
2. read `plan-pack.json`, this file, and the last `LOOP_LEDGER.md` entry;
3. inspect scoped `git status` and compare against baseline hashes;
4. reread current unit files and recompute GitNexus impact;
5. if source drift invalidates a finding or completed unit, mark its evidence stale and repair the DAG before editing;
6. continue the exact `next_unit` only when its dependencies are verified.

Never repair a conflict with reset/stash/revert. Narrowly reapply the intended patch on top of current shared source.
