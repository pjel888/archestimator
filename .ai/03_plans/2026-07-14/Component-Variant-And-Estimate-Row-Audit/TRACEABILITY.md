# Traceability And Readiness

## Source Index

| Source | Status | Artifact | Scope |
| --- | --- | --- | --- |
| `SRC-001` | `CURRENT` | `01-CURRENT-ARCHITECTURE-AND-EVIDENCE.md` | current private and public architecture/evidence |
| `SRC-002` | `CURRENT` | `02-MVP-REQUIREMENTS-AND-INVARIANTS.md` | accepted first-user requirements and domain invariants |
| `SRC-003` | `CURRENT` | `03-FINDINGS-RISK-SECURITY-PERFORMANCE.md` | ranked defects, threat boundaries, risks, performance budgets |
| `SRC-004` | `CURRENT` | `04-INTEROPERABILITY-AND-PUBLICATION-CONTRACT.md` | canonical identities, mutation/publication/access/decision design |
| `SRC-005` | `CURRENT` | `IMPLEMENTATION_PLAN.md` | dependency DAG, file ownership, proof and recovery |
| `SRC-006` | `CURRENT` | `05-ADD-EDIT-COMPONENT-MODAL-PRD-AND-AUDIT.md` | modal field inventory, Library/Project CRUD, row transfer, confirmed bugs, option-scoped fan-out |
| `SRC-007` | `CURRENT` | `06-CLOUDFLARE-COMPONENT-DATA-AND-STORAGE-SCHEMA.md` | exact component-related D1/R2/Queue schema, gaps, migration and cleanup contract |
| `SRC-008` | `CURRENT` | `07-BETA-FEATURE-PATH-CLEANUP-AND-SIMPLIFICATION.md` | one-path cleanup, no product V1/V2 or compatibility theater |

## Requirement Coverage

| Requirement | Acceptance criterion | Units | Primary source/evidence |
| --- | --- | --- | --- |
| `REQ-001` | `AC-001` | `UNIT-003`, `UNIT-007`, `UNIT-011` | area/tab load truth and issued hierarchy |
| `REQ-002` | `AC-002` | `UNIT-002`, `UNIT-011` | row move/insert/delete revision atomicity |
| `REQ-003` | `AC-003` | `UNIT-002`, `UNIT-003`, `UNIT-007`, `UNIT-011` | calculation/save/cache convergence |
| `REQ-004` | `AC-004` | `UNIT-001`, `UNIT-011` | Library shared fields/override preservation |
| `REQ-005` | `AC-005` | `UNIT-001`, `UNIT-004`, `UNIT-007`, `UNIT-011` | selected variants/media/attachments |
| `REQ-006` | `AC-006` | `UNIT-001`, `UNIT-011` | project scope and make-project-specific |
| `REQ-007` | `AC-007` | `UNIT-006`, `UNIT-007`, `UNIT-011` | bounded template trust at insert |
| `REQ-008` | `AC-008` | `UNIT-001`, `UNIT-004`, `UNIT-005`, `UNIT-011` | dock source families/lifecycle/concurrency |
| `REQ-009` | `AC-009` | `UNIT-007`, `UNIT-011` | issue consistency and opaque component projection |
| `REQ-010` | `AC-010` | `UNIT-007`, `UNIT-011` | scoped/reconciled financial sections |
| `REQ-011` | `AC-011` | `UNIT-009`, `UNIT-011` | area/row/component target authorization |
| `REQ-012` | `AC-012` | `UNIT-008`, `UNIT-011` | deliverable/revocable recipient access |
| `REQ-013` | `AC-013` | `UNIT-010`, `UNIT-011` | decision authority/receipts/issue state |
| `REQ-014` | `AC-014` | `UNIT-008`, `UNIT-009`, `UNIT-010`, `UNIT-011` | notifications/activity/supersession/mobile |
| `SEC-001` | `AC-015` | `UNIT-001`, `UNIT-002`, `UNIT-004`, `UNIT-006`, `UNIT-007`, `UNIT-008`, `UNIT-009`, `UNIT-010`, `UNIT-011` | tenant/recipient/target/asset fail-closed boundary |
| `PERF-001` | `AC-016` | `UNIT-003`, `UNIT-005`, `UNIT-006`, `UNIT-007`, `UNIT-011` | bounded row/template/public work |
| `UX-001` | `AC-017` | `UNIT-001`, `UNIT-005`, `UNIT-011` | one full Add/Edit Component authority |
| `REQ-015` | `AC-018` | `UNIT-001`, `UNIT-004`, `UNIT-005`, `UNIT-011` | complete Library/Project component and variant CRUD round-trip |
| `REQ-016` | `AC-019` | `UNIT-001`, `UNIT-011` | option-scoped Library/Project propagation |
| `REQ-017` | `AC-020` | `UNIT-001`, `UNIT-002`, `UNIT-003`, `UNIT-011` | component transfer into Estimate Sheet rows |
| `REQ-018` | `AC-021` | `UNIT-001`, `UNIT-003`, `UNIT-005`, `UNIT-011` | authoritative saved-state reconciliation |
| `DATA-001` | `AC-022` | `UNIT-001`, `UNIT-004`, `UNIT-011` | relational D1/R2/upload ownership and cleanup |
| `OPS-001` | `AC-023` | `UNIT-001`, `UNIT-004`, `UNIT-005`, `UNIT-007`, `UNIT-011` | direct beta replacement and superseded-path deletion |

## Acceptance Criteria

All criteria are `N/A` until their implementation units produce fresh evidence. `N/A` here means “not yet implemented/proven,” not “requirement optional.” Test requirement is `NOT_REQUIRED` under the current user-controlled test gate.

### `AC-001`

Every tab and area branch has correct membership/order/count/total, or is explicitly incomplete with unsafe mutations/issuance disabled; the issued tree matches the accepted source.

### `AC-002`

Row insert/edit/move/reorder/delete/bulk-delete/restore/replace/project-specific operations use real expected revisions and cannot partially persist.

### `AC-003`

Visible/history/issued totals use one minor-unit basis; save state and authoritative cache converge after valid, invalid, reverted, conflict, and remount paths.

### `AC-004`

Library component-shared changes reach eligible `linked-clean` rows only; local row fields and overridden/detached/unlinked values are preserved.

### `AC-005`

Selected variant, image, costs, and attachments survive create/edit/duplicate/reload without default collapse, ownership transfer, private URL promotion, or partial metadata.

### `AC-006`

Project component fan-out stays in one project, preserves selected variants, and make-project-specific changes one row without mutating the Library master.

### `AC-007`

Template browse is bounded; insert either resolves current usable source identity or explicitly creates from saved snapshot as unlinked/project-specific; insertion is atomic.

### `AC-008`

Library/Project/Templates tabs expose correct lifecycle/management/insertion behavior and cannot resolve editor/move/duplicate/prefetch requests out of order.

### `AC-009`

Issue build rejects torn source, has deterministic semantic hash/no-op behavior, and emits only immutable opaque client-safe component/variant receipts.

### `AC-010`

Every financial section honors declared scope/grouping/comparison and reconciles exactly to issued row totals; unsupported configuration blocks publish.

### `AC-011`

Estimate/tab/area/row/component discussions validate recipient-visible issued membership, derive labels server-side, enforce section policy on all operations, and use race-safe idempotency.

### `AC-012`

Invite/resend delivers a redeemable secret-safe link; redemption verifies atomically; recipient/password/access/version/status changes revoke stale access across every public route.

### `AC-013`

Approve/decline/request-changes uses correct capability/required-approver policy, binds exact issue hash/intent/idempotency, transitions issue state atomically, and returns/audits/notifies a receipt.

### `AC-014`

Threads, decisions, issues, recipients, and mentions produce correct-audience timely notifications/activity; supersession and mobile actions follow the same capability/issue rules.

### `AC-015`

Cross-workspace/project/portal/issue/section/target/asset attempts fail closed; public output contains no raw private IDs, costing inputs, source internals, or private storage paths.

### `AC-016`

Normal row work is row/branch scoped; list/detail/template/issue/thread/activity reads are bounded; large issue storage/read and tree aggregation follow explicit linear/page contracts.

### `AC-017`

Every advanced Library/Project component create or edit entry point opens the same full Add/Edit modal and no reduced drawer or second mutation authority remains; inline editing calls the same domain contract.

### `AC-018`

Library and Project create/read/update/duplicate/archive/delete/promotion/detach and variant add/reorder/default/delete/reload preserve exact stable identities and every supported field, with explicit in-use variant replacement.

### `AC-019`

Editing one option updates option-derived fields only for Library/Project instances selecting that option; component fields may fan out, while all unaffected selections, defaults, overrides, and row-local values remain unchanged.

### `AC-020`

Insert, replace, move, detach, promote, cross-project copy, and row delete carry or localize the correct component/option/version/link receipt and follow explicit row identity/quantity ownership without partial persistence.

### `AC-021`

Create/update/duplicate returns or rereads the authoritative component detail and changed row revisions; no label-matched or optimistic partial graph is presented as saved.

### `AC-022`

Component, option, cost, attachment, upload asset, and R2 ownership is relationally/transactionally valid; orphan and cleanup states are repaired without cross-workspace/project binding or premature object deletion.

### `AC-023`

The completed component path has one editor, mutation contract, duplicate path, propagation rule, and current storage shape, with no product V1/V2 path, compatibility adapter, dual write, or proof-cleared legacy fallback.

## Risk-to-Criterion Coverage

| Risk | Criteria | Units |
| --- | --- | --- |
| `RISK-001` | `AC-004`, `AC-005` | `UNIT-001` |
| `RISK-002` | `AC-004` | `UNIT-001` |
| `RISK-003` | `AC-005`, `AC-008`, `AC-015` | `UNIT-004` |
| `RISK-004` | `AC-002`, `AC-003`, `AC-015` | `UNIT-002` |
| `RISK-005` | `AC-001`, `AC-003`, `AC-016` | `UNIT-003` |
| `RISK-006` | `AC-007`, `AC-008`, `AC-016` | `UNIT-005`, `UNIT-006` |
| `RISK-007` | `AC-012`, `AC-015` | `UNIT-008` |
| `RISK-008` | `AC-012`, `AC-015` | `UNIT-008` |
| `RISK-009` | `AC-011`, `AC-015` | `UNIT-009` |
| `RISK-010` | `AC-009`, `AC-015` | `UNIT-007` |
| `RISK-011` | `AC-010`, `AC-013`, `AC-015` | `UNIT-007`, `UNIT-010` |
| `RISK-012` | `AC-014`, `AC-016` | `UNIT-003`, `UNIT-011` |
| `RISK-013` | all affected criteria | every unit |
| `RISK-014` | `AC-017`, `AC-018` | `UNIT-001`, `UNIT-005` |
| `RISK-015` | `AC-018`, `AC-019` | `UNIT-001` |
| `RISK-016` | `AC-019`, `AC-020` | `UNIT-001` |
| `RISK-017` | `AC-018`, `AC-021` | `UNIT-001`, `UNIT-003`, `UNIT-005` |
| `RISK-018` | `AC-018`, `AC-022` | `UNIT-004` |
| `RISK-019` | `AC-017`, `AC-023` | `UNIT-001`, `UNIT-005`, `UNIT-007`, `UNIT-011` |

## Criterion Challenge

### Hardest criterion

`AC-012` is the first-user launch gate because current personalized recipient access cannot reliably reach a verified, mutation-capable state and stale password sessions can survive rotation. It is dependency-heavy but internally resolvable with existing D1, Queue, Email, and security utilities. It is work, not a human authorization blocker.

### Most failure-prone data criterion

`AC-019` is the core component correctness gate: it must separate component fields, target-option fields, component default, per-row selection, and row-local overrides for both Library and Project component instances. `AC-022` then closes the D1/R2 attachment and cleanup ownership chain.

### Most likely false-completion criterion

`AC-009` can appear complete when a page renders. Completion additionally requires source consistency fencing, deterministic semantic hash, opaque component anchors, safe-field allowlisting, and no-op republish behavior.

### Performance criterion

`AC-016` does not require premature browser benchmarking. Static query bounds, payload byte/row thresholds, render subscription shape, and algorithmic indexing are the authorized initial evidence. Any unprovable runtime gap remains explicit until the user separately authorizes testing.

## Gap Analysis

No requirement is orphaned:

- every requirement has one acceptance criterion;
- every requirement maps to at least one unit;
- every P0/P1 finding maps to a risk and unit;
- every unit has source/current-state evidence and a stop condition in the canonical plan;
- public consumer work depends on the private identity/tree work it consumes;
- recipient access precedes interactive discussion/decision proof;
- modal/CRUD/schema/cleanup appendices close the previously implicit component implementation gaps;
- every component type and Estimate-row transfer operation has an explicit authority and acceptance criterion;
- the final unit reconciles scale, notification/activity, and pack completion.

No authorization boundary is active for local implementation. Actual deployment, production data mutation, paid services, credentials, or out-of-scope Cloudflare resources remain outside `IMPLEMENT_LOCAL`.

## Readiness Decision

`IMPLEMENTATION_READY` is justified because:

- current behavior and P0/P1 gaps are grounded in live source and separated from old `HEAD` claims;
- Add/Edit modal fields, Library/Project CRUD, row transfer, and option-scoped propagation are explicit;
- current Cloudflare component schema, relational defects, fix-forward migrations, and R2 cleanup are explicit;
- beta cleanup deletes superseded paths instead of preserving compatibility theater;
- entity/field ownership and public safe projection are explicit;
- dependencies and shared-file serialization are explicit;
- exact next unit and stop condition are explicit;
- security, performance, error, recovery, and pack reconciliation are included;
- no internally resolvable dependency is mislabeled as a human blocker; and
- the plan does not rely on unrequested tests/browser proof to begin.

Implementation remains `NOT_STARTED`; readiness is not completion.

## Evidence Receipts

| Evidence | Status | Artifact | Claims |
| --- | --- | --- | --- |
| `EVID-001` | `PASS` | `01-CURRENT-ARCHITECTURE-AND-EVIDENCE.md` | current private/public architecture and gaps; `UNIT-001` through `UNIT-010` readiness inputs |
| `EVID-002` | `PASS` | `03-FINDINGS-RISK-SECURITY-PERFORMANCE.md` | every risk and ranked implementation finding |
| `EVID-003` | `PASS` | `04-INTEROPERABILITY-AND-PUBLICATION-CONTRACT.md` | identity, propagation, template, issue, access, discussion, decision contracts |
| `EVID-004` | `PASS` | `IMPLEMENTATION_PLAN.md` | unit DAG, exact next unit, ownership, evidence, recovery |
| `EVID-005` | `PASS` | `TRACEABILITY.md` | requirement/unit/criterion/risk coverage and readiness challenge |
| `EVID-006` | `PASS` | `05-ADD-EDIT-COMPONENT-MODAL-PRD-AND-AUDIT.md` | Add/Edit modal PRD, Library/Project CRUD, row transfer, confirmed variant persistence/fan-out defects |
| `EVID-007` | `PASS` | `06-CLOUDFLARE-COMPONENT-DATA-AND-STORAGE-SCHEMA.md` | current D1/R2/Queue schema, attachment relation gaps, migration/cleanup invariants |
| `EVID-008` | `PASS` | `07-BETA-FEATURE-PATH-CLEANUP-AND-SIMPLIFICATION.md` | direct beta replacement, V1/V2 terminology cleanup, one-authority deletion matrix |

These receipts prove plan readiness and observed current-state claims only. They do not prove product implementation.

## Completion Audit Template

At `UNIT-011`, fill this table with fresh evidence rather than copying planned status:

| Requirement | Source complete | Static/type/lint complete | D1/runtime evidence | Test decision | Final status | Evidence ID |
| --- | --- | --- | --- | --- | --- | --- |
| `REQ-001`..`OPS-001` | pending | pending | pending | `NOT_REQUIRED` unless explicitly authorized | pending | pending |

Then update `plan-pack.json` statuses/hashes and rerun validators. Do not set `implementation_status=COMPLETE`, `terminal_status=ACHIEVED`, or archive readiness until every accepted requirement and criterion is truthfully closed.
