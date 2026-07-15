# Estimate Sheet MVP Implementation Tracker

**Tracker epoch:** `2026-07-15-MVP-PERFORMANCE-PERSISTENCE-HARDENING`  
**Package status:** `IMPLEMENTATION_READY`  
**Implementation status:** `NOT_STARTED`  
**Behavior status:** `NOT_EVALUATED`  
**Objective status:** `NOT_ACHIEVED`  
**Release status:** `NOT_READY`  
**Active unit:** `NONE`  
**Last verified unit:** `NONE`  
**Required next unit:** `UNIT-001`  
**Continuation reason:** implementation, mandatory tests, behavior proof, and release evaluation have not started

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
| [ ] | `UNIT-001` | `READY` | `YES` | fresh baseline, writer/mutation registry, fixtures, budgets, and receipts frozen | source/static baseline |
| [ ] | `UNIT-010` | `READY` | `NO — UNIT-001` | durable intent receipt plus complete create-to-use cache continuity | `TEST-001`, `TEST-003`, `TEST-004` |
| [ ] | `UNIT-002` | `READY` | `NO — UNIT-001, UNIT-010` | row mutation integrity | `TEST-001`, `TEST-002` |
| [ ] | `UNIT-003` | `READY` | `NO — UNIT-001, UNIT-010` | tree/tab topology and rename isolation | `TEST-001`, `TEST-006` |
| [ ] | `UNIT-004` | `READY` | `NO — UNIT-002, UNIT-010` | component/variant lifecycle and bounded permanent delete | `TEST-003`, `TEST-008` |
| [ ] | `UNIT-005` | `READY` | `NO — UNIT-002, UNIT-003, UNIT-010` | replay-safe Template/Project insertion | `TEST-004` |
| [ ] | `UNIT-006` | `READY` | `NO — UNIT-004, UNIT-010` | D1/R2/Images integrity | `TEST-008` plus provider receipts |
| [ ] | `UNIT-009` | `READY` | `NO — UNIT-004, UNIT-005, UNIT-010` | atomic Template lifecycle | `TEST-004` |
| [ ] | `UNIT-007` | `READY` | `NO — UNIT-002–006, UNIT-009, UNIT-010` | guarded authoring-to-issued parity | `TEST-005` |
| [ ] | `UNIT-011` | `READY` | `NO — all implementation units` | whole-route optimization plus all authorized tests | `TEST-001`–`TEST-008` |
| [ ] | `UNIT-008` | `READY` | `NO — UNIT-011` | final action/criterion/objective/release reconciliation | all prior evidence |

## Requirement Progress

| Done | Requirement | Role | Owner | Current evidence state |
| --- | --- | --- | --- | --- |
| [ ] | `REQ-001` | core | `UNIT-001`, `UNIT-008`, `UNIT-009` | planning only |
| [ ] | `REQ-002` | core | `UNIT-003`, `UNIT-008` | planning only |
| [ ] | `REQ-003` | core | `UNIT-003`, `UNIT-008` | planning only |
| [ ] | `REQ-004` | core | `UNIT-002`, `UNIT-008` | planning only |
| [ ] | `REQ-005` | core | `UNIT-002`, `UNIT-004`, `UNIT-010`, `UNIT-008` | planning only |
| [ ] | `REQ-006` | core | `UNIT-004`, `UNIT-010`, `UNIT-008` | planning only |
| [ ] | `REQ-007` | core | `UNIT-005`, `UNIT-010`, `UNIT-008` | planning only |
| [ ] | `REQ-008` | core | `UNIT-007`, `UNIT-008` | planning only |
| [ ] | `REQ-009` | core | `UNIT-009`, `UNIT-010`, `UNIT-008` | planning only |
| [ ] | `DATA-001` | core | mutation units | planning only |
| [ ] | `DATA-002` | core | `UNIT-004`, `UNIT-006`, `UNIT-008` | planning only |
| [ ] | `DATA-003` | core | `UNIT-010`, mutation units, `UNIT-011`, `UNIT-008` | planning only |
| [ ] | `SEC-001` | core | all persistent units | planning only |
| [ ] | `UX-001` | core | interaction units | planning only |
| [ ] | `UX-002` | core | `UNIT-003`–`UNIT-005`, `UNIT-009`, `UNIT-011`, `UNIT-008` | planning only |
| [ ] | `PERF-001` | core | row/tree/source units | planning only |
| [ ] | `PERF-002` | core | rename/filter units | planning only |
| [ ] | `PERF-003` | core | `UNIT-001`, `UNIT-010`, `UNIT-011`, `UNIT-008` | planning only |
| [ ] | `OPS-001` | core | `UNIT-001`, `UNIT-006`, `UNIT-009`, `UNIT-008` | planning only |
| [ ] | `OPS-002` | core | `UNIT-001`, `UNIT-010`, `UNIT-011`, `UNIT-008` | planning only |
| [ ] | `UX-003` | auxiliary | optional `UNIT-004` tail | planning only; does not gate core |

## Mutation Safety Checklist

For each row, change `OPEN` only after the linked implementation, failure simulations, authoritative read-back, and cache receipt are complete.

| Done | ID | Mutation family | Ownership | Atomicity | Intent replay | Revision/fingerprint | History/outbox/receipt | Read-back/cache | State |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [ ] | `MUT-01` | blank/Library insert | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | `OPEN` |
| [ ] | `MUT-02` | row update/replace/variant | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | `OPEN` |
| [ ] | `MUT-03` | row move/restore/reorder | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | `OPEN` |
| [ ] | `MUT-04` | row duplicate | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | `OPEN` |
| [ ] | `MUT-05` | row/bulk delete/restore | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | `OPEN` |
| [ ] | `MUT-06` | component create/update/fan-out | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | `OPEN` |
| [ ] | `MUT-07` | permanent component delete | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | `OPEN` |
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
| [ ] | `PERF-S04` shared-edit convergence | [ ] | — | — | [ ] | — | `OPEN` |
| [ ] | `PERF-S05` create-to-use | [ ] | — | — | [ ] | — | `OPEN` |
| [ ] | `PERF-S06` 100-child expand | [ ] | — | — | [ ] | — | `OPEN` |
| [ ] | `PERF-S07` 500-node tree | [ ] | — | — | [ ] | — | `OPEN` |
| [ ] | `PERF-S08` 1,000-item search | [ ] | — | — | [ ] | — | `OPEN` |
| [ ] | `PERF-S09` rename/filter | [ ] | — | — | [ ] | — | `OPEN` |
| [ ] | `PERF-S10` Template hydration | [ ] | — | — | [ ] | — | `OPEN` |
| [ ] | `PERF-S11` 1,500-node/5,000-row behavior | [ ] | — | — | [ ] | — | `OPEN` |
| [ ] | `PERF-S12` D1 round trips | [ ] | — | — | [ ] | — | `OPEN` |

## Authorized Test Progress

| Done | Test | State | Exact owner | First failing case | Fix receipt | Rerun result |
| --- | --- | --- | --- | --- | --- | --- |
| [ ] | `TEST-001` contract/topology/D1 guards | `PLANNED` | `UNIT-002`, `UNIT-003`, `UNIT-010` | — | — | — |
| [ ] | `TEST-002` row CRUD/retry/concurrency | `PLANNED` | `UNIT-002`, `UNIT-011` | — | — | — |
| [ ] | `TEST-003` components/variants/delete | `PLANNED` | `UNIT-004`, `UNIT-010`, `UNIT-011` | — | — | — |
| [ ] | `TEST-004` Templates/reusable sources | `PLANNED` | `UNIT-005`, `UNIT-009`, `UNIT-010`, `UNIT-011` | — | — | — |
| [ ] | `TEST-005` publication/D1 integrity | `PLANNED` | `UNIT-007`, `UNIT-011` | — | — | — |
| [ ] | `TEST-006` render/large-data performance | `PLANNED` | `UNIT-003`, `UNIT-011` | — | — | — |
| [ ] | `TEST-007` browser Estimate Sheet MVP | `PLANNED` | `UNIT-011` | — | — | — |
| [ ] | `TEST-008` storage/provider lifecycle | `PLANNED` | `UNIT-006`, `UNIT-011` | — | — | — |

## Evidence Dimensions

| Done | Dimension | Required signal | Current state |
| --- | --- | --- | --- |
| [ ] | source/static | exact owners, types, query/cache paths, diff hygiene | planning only |
| [ ] | local D1 | before/after, zero-write failures, receipts, authoritative read-back | not evaluated |
| [ ] | focused tests | all `TEST-001`–`TEST-006`, `TEST-008` pass | not run |
| [ ] | browser | `TEST-007` passes with no console/page errors | not run |
| [ ] | performance | all `PERF-S*` budgets/invariants pass | not measured |
| [ ] | provider | scoped preview/hosted D1 and R2 evidence where applicable | not evaluated |
| [ ] | public projection | guarded issue/publication parity and privacy | not evaluated |
| [ ] | plan/trace | manifest, tracker, ledger, hashes, paths, and validator agree | planning refresh in progress |

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
