# Master Codebase Architecture Deepening Loop Ledger

## Package State

| Field | Value |
|---|---|
| Package | `PLAN-2026-07-16-master-codebase-architecture-deepening` |
| Mode | plan pack / plan-only consolidation |
| Package status | `CONDITIONALLY_READY` |
| Implementation status | `NOT_STARTED` |
| Release status | `NOT_EVALUATED` |
| Plan lifecycle | `ACTIVE` |
| Terminal status | `ACTIVE` |
| Current-source baseline | `68b869c8f42c6894af7e6379be98b84013650916` |
| Exact next unit | `UNIT-001` |
| Ready slice | `UNIT-001`, `UNIT-002`, `UNIT-005` |

## Requirements

| ID | Role | Requirement | Unit | Criterion | Status |
|---|---|---|---|---|---|
| `REQ-001` | Core | Compile one component-category resolver per folder dataset without output drift. | `UNIT-001` | `AC-001` | Accepted; ready. |
| `SEC-001` | Auxiliary | Centralize production upload-route Bearer authorization with timing-safe comparison and identical responses. | `UNIT-002` | `AC-002` | Accepted; ready. |
| `DATA-001` | Core | Make upload-removal eligibility per asset and return truthful claimed, blocked, and already-removed path sets. | `UNIT-009` | `AC-009` | Accepted; test-source authorization planned. |
| `REQ-002` | Core | Move concrete Estimate-tree D1 reads/builders out of the workspace repository without moving workspace/auth orchestration. | `UNIT-003` | `AC-003` | Accepted; test-source authorization planned. |
| `REQ-003` | Core | Give component-folder move serialization and stale-result rules one narrow coordinator shared by both adapters. | `UNIT-004` | `AC-004` | Accepted; test-source authorization planned. |
| `REQ-004` | Core | Put component and folder D1 statement graphs behind two concrete deep modules while actions retain their public boundary. | `UNIT-005` | `AC-005` | Accepted; ready. |
| `SEC-002` | Core | Move durable public rate-limit storage/engine mechanics to shared security infrastructure while policies stay domain-owned. | `UNIT-006` | `AC-006` | Accepted; test-source authorization planned. |
| `REQ-005` | Core | Delete the stringly Estimate D1 façade and replace every caller with typed intent modules. | `UNIT-007` | `AC-007` | Accepted; test-source authorization planned; exact Admin pointer retarget owned. |
| `REQ-006` | Core | Deepen the existing per-sheet editable-row store into the single owner of row commit and rollback state. | `UNIT-008` | `AC-008` | Accepted; comparator/reconciliation test-source authorization planned. |

## Acceptance Criteria

| ID | Pass condition | Status | Test decision |
|---|---|---|---|
| `AC-001` | Batch folder datasets build one resolver; all current fallback/path outputs remain identical. | `FAIL` | `TEST_PROPOSAL`; focused category-folder contract only. |
| `AC-002` | Three upload routes use one timing-safe helper and preserve missing/invalid response contracts. | `FAIL` | `TEST_PROPOSAL`; three focused route files. |
| `AC-003` | D1 tree implementation is extracted without a workspace-repository cycle, re-export, query, auth, or output drift. | `FAIL` | `TEST_PROPOSAL`; tree/group/tab focused files. |
| `AC-004` | Both component UIs share one framework-free move coordinator with correct latest-intent rollback semantics. | `FAIL` | `TEST_PROPOSAL`; retarget the focused queue test. |
| `AC-005` | Component/folder SQL, fanout, receipts, and atomicity move to two concrete modules; action boundaries remain. | `FAIL` | `TEST_PROPOSAL`; focused atomicity/folder/revalidation files. |
| `AC-006` | Shared engine/store and domain policy modules replace publication-owned mechanics with no policy drift. | `FAIL` | `TEST_PROPOSAL`; focused public rate-limit/lockout files. |
| `AC-007` | No faux query, string dispatcher, façade class, old file, or Admin map reference to that file remains; every operation maps once to its fixed typed export. | `FAIL` | `TEST_PROPOSAL`; nineteen exact retarget/run files are frozen in the canonical plan. |
| `AC-008` | Existing per-sheet store owns row commit/dirty/pending/rollback state and preserves row-owned/shared-definition plus duplicate-retry semantics. | `FAIL` | `TEST_PROPOSAL`; exact source-contract retarget plus existing library-insert behavior contract. |
| `AC-009` | Each upload asset is classified independently and routes report only actually claimed paths as removed. | `FAIL` | `TEST_PROPOSAL`; one focused removal-claim contract, route assertions only if authorized. |

## Gates

| Gate | Status | Meaning |
|---|---|---|
| `GATE-TEST-SOURCE-001` | `FAIL` | `UNIT-003`, `UNIT-004`, `UNIT-006`, `UNIT-007`, `UNIT-008`, and `UNIT-009` require the exact import/mock/source-contract maintenance listed in the canonical plan. Each remains planned until those edits are explicitly authorized. Test-source edit authorization does not authorize execution or unrelated assertion expansion. |
| `GATE-EXCLUSIVE-001` | `PASS` | All previously active codebase-agent owners are terminal and the worktree is clean at the frozen revision. Implementation must remain standalone; another write-capable agent or dirty owned path makes this gate fail for the affected unit. |
| `GATE-ADMIN-MAP-001` | `PASS` | The completed Admin program no longer contests the file. `UNIT-007` owns only the exact `sources.persistence` retarget to `d1-intents/database.ts`; no other Admin content is in scope. |
| `GATE-COMPLETION-001` | `FAIL` | Core implementation has not started; all core units, including `UNIT-009`, must verify before completion. |

## Risk Register

| ID | Risk | Unit(s) | Fixed mitigation | Status |
|---|---|---|---|---|
| `RISK-001` | Category fallback/path semantics drift during resolver compilation. | `UNIT-001` | Delegate current function to compiled resolver; preserve every guard. | Open. |
| `RISK-002` | Auth status/message or secret handling changes. | `UNIT-002` | Three-route scope, exact response parity, no credential logging. | Open. |
| `RISK-003` | Tree extraction creates a cycle or changes tab/query/access behavior. | `UNIT-003` | D1 implementation only; workspace/auth orchestration stays; no re-export. | Open. |
| `RISK-004` | Stale move completion overwrites a newer optimistic target. | `UNIT-004` | Coordinator owns generation and confirmed target; adapters keep UI only. | Open. |
| `RISK-005` | Component mutation relocation breaks statement order, receipts, or fanout atomicity. | `UNIT-005` | Move transaction-coupled behavior together; two concrete aggregate modules. | Open. |
| `RISK-006` | Rate-limit relocation changes consumption, clearing, key, or window behavior. | `UNIT-006` | Source-level policy matrix and behavior-identical relocation before semantics. | Open. |
| `RISK-007` | Estimate façade retirement changes high-risk row/history/revision behavior or leaves the Admin knowledge map pointing at a deleted file. | `UNIT-007` | Fixed function map, fixed family checkpoints, one implementation per operation, and the exact Admin pointer retarget before deletion. | Open. |
| `RISK-008` | Store deepening causes render storms, focus loss, duplicate-retry drift, wrong shared mutation routing, or a server/client boundary violation. | `UNIT-008` | Existing vanilla store, selector ownership, explicit four-intent model, preserved duplicate identity contract, and client-safe Server Action adapters only. | Open. |
| `RISK-009` | Per-asset upload classification creates overlapping result sets or weakens final reference protection. | `UNIT-009` | Correlated claim predicate, disjoint result sets, unchanged cleanup-job backstop, no migration. | Open. |

## Decisions

| ID | Decision | Affected work | Status |
|---|---|---|---|
| `DEC-AUTO-001` | One master supersedes both predecessor packs; no concatenated backlog survives without current-source proof. | All units | Active. |
| `DEC-AUTO-002` | Deep modules hide cohesive implementation; generic factories, compatibility re-exports, and pass-through wrappers are prohibited. | `UNIT-003`, `UNIT-005`, `UNIT-007` | Active. |
| `DEC-AUTO-003` | Package is conditionally ready: `UNIT-001`, `UNIT-002`, and `UNIT-005` are advertised, and only the manifest's exact `next_unit` may start. | Package state | Active. |
| `DEC-AUTO-004` | Implementation runs in one standalone write window. Historical leases are cleared; `UNIT-003`, `UNIT-004`, `UNIT-006`, `UNIT-007`, `UNIT-008`, and `UNIT-009` retain exact test-source authorization boundaries. | `UNIT-003` through `UNIT-009` | Active. |
| `DEC-AUTO-005` | Quantity and selected variant remain row-owned; shared component-definition edits remain shared for linked Library and shared project component/variant definitions. | `UNIT-007`, `UNIT-008` | Active. |
| `DEC-AUTO-006` | Rate-limit behavior relocates before any semantic convergence with other domains. | `UNIT-006` | Active. |
| `DEC-AUTO-007` | Applied migrations remain immutable; Admin feature/content work, Legacy Cleanup, import, hosted proof, and unmeasured performance findings stay outside core scope; preserved valid findings have stable follow-up IDs; upload-removal correctness is core. | Disposition register | Active. |
| `DEC-AUTO-008` | Product test commands are proposals only; this authoring run executes none. A criterion declaring static evidence insufficient cannot pass without an authorized fresh test receipt. | All criteria | Active. |
| `DEC-AUTO-009` | Admin Estimate System feature/content work stays excluded; `UNIT-007` owns one exact `sources.persistence` retarget before deleting the façade that entry names. | `UNIT-007`, `AC-007`, `GATE-ADMIN-MAP-001` | Active. |

## Unit Resume Table

| Unit | Status | Dependencies | Resume instruction |
|---|---|---|---|
| `UNIT-001` | `READY` | none | Exact next unit; compile resolver and update four batch surfaces. |
| `UNIT-002` | `READY` | none | Implement only the three production upload routes and shared helper after an explicit `next_unit` update. |
| `UNIT-005` | `READY` | none | Extract exactly two concrete D1 modules; existing helper/type modules remain read-only unless this pack is refreshed first. |
| `UNIT-009` | `PLANNED` | none | Promote only with its one-file test-source contract update authorization; no index or reference table. Core completion requires it. |
| `UNIT-003` | `PLANNED` | none | Promote only with explicit four-file test-source maintenance authorization; leave workspace/auth orchestration and deferred dead seams in place. |
| `UNIT-004` | `PLANNED` | none | Promote only with one-file test-source contract/import retarget authorization; narrow move coordinator only. |
| `UNIT-006` | `PLANNED` | none | Promote only with exact rate-limit test mock/import retarget authorization. |
| `UNIT-007` | `PLANNED` | none | Promote only with nineteen-file test-source retarget authorization; follow the fixed dispatcher/table-family mapping and retarget the one Admin source entry before deleting the old file. |
| `UNIT-008` | `PLANNED` | none | Promote only with exact comparator/reconciliation source-contract retarget authorization; preserve landed duplicate retry identity and isolated rollback. |

## Resume Rule

Read `plan-pack.json`, execute only `next_unit`, and recheck the standalone write window plus the unit's owned-path status. If that unit's baseline drifted or it is blocked, record the evidence and explicitly update `next_unit` in both the manifest and this ledger before starting another advertised ready unit; do not silently switch or revive a rejected predecessor finding.
