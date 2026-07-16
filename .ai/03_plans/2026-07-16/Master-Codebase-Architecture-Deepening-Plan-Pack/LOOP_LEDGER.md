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
| Exact next unit | `UNIT-001` |
| Ready slice | `UNIT-001`, `UNIT-002`, `UNIT-009` |

## Requirements

| ID | Role | Requirement | Unit | Criterion | Status |
|---|---|---|---|---|---|
| `REQ-001` | Core | Compile one component-category resolver per folder dataset without output drift. | `UNIT-001` | `AC-001` | Accepted; ready. |
| `SEC-001` | Auxiliary | Centralize production upload-route Bearer authorization with timing-safe comparison and identical responses. | `UNIT-002` | `AC-002` | Accepted; ready. |
| `DATA-001` | Auxiliary | Make upload-removal eligibility per asset and return truthful claimed, blocked, and already-removed path sets. | `UNIT-009` | `AC-009` | Accepted; ready. |
| `REQ-002` | Core | Move concrete Estimate-tree D1 reads/builders out of the workspace repository without moving workspace/auth orchestration. | `UNIT-003` | `AC-003` | Accepted; test-source authorization planned. |
| `REQ-003` | Core | Give component-folder move serialization and stale-result rules one narrow coordinator shared by both adapters. | `UNIT-004` | `AC-004` | Accepted; lease-planned. |
| `REQ-004` | Core | Put component and folder D1 statement graphs behind two concrete deep modules while actions retain their public boundary. | `UNIT-005` | `AC-005` | Accepted; lease-planned. |
| `SEC-002` | Core | Move durable public rate-limit storage/engine mechanics to shared security infrastructure while policies stay domain-owned. | `UNIT-006` | `AC-006` | Accepted; lease-planned. |
| `REQ-005` | Core | Delete the stringly Estimate D1 façade and replace every caller with typed intent modules. | `UNIT-007` | `AC-007` | Accepted; lease-planned. |
| `REQ-006` | Core | Deepen the existing per-sheet editable-row store into the single owner of row commit and rollback state. | `UNIT-008` | `AC-008` | Accepted; UI-lease-planned. |

## Acceptance Criteria

| ID | Pass condition | Status | Test decision |
|---|---|---|---|
| `AC-001` | Batch folder datasets build one resolver; all current fallback/path outputs remain identical. | `FAIL` | `TEST_PROPOSAL`; focused category-folder contract only. |
| `AC-002` | Three upload routes use one timing-safe helper and preserve missing/invalid response contracts. | `FAIL` | `TEST_PROPOSAL`; three focused route files. |
| `AC-003` | D1 tree implementation is extracted without a workspace-repository cycle, re-export, query, auth, or output drift. | `FAIL` | `TEST_PROPOSAL`; tree/group/tab focused files. |
| `AC-004` | Both component UIs share one framework-free move coordinator with correct latest-intent rollback semantics. | `FAIL` | `TEST_PROPOSAL`; retarget the focused queue test. |
| `AC-005` | Component/folder SQL, fanout, receipts, and atomicity move to two concrete modules; action boundaries remain. | `FAIL` | `TEST_PROPOSAL`; focused atomicity/folder/revalidation files. |
| `AC-006` | Shared engine/store and domain policy modules replace publication-owned mechanics with no policy drift. | `FAIL` | `TEST_PROPOSAL`; focused public rate-limit/lockout files. |
| `AC-007` | No faux query, string dispatcher, façade class, or old file remains; every operation maps once to a typed intent. | `FAIL` | `TEST_PROPOSAL`; exact focused file list refreshed after lease. |
| `AC-008` | Existing per-sheet store owns row commit/dirty/pending/rollback state and preserves row-owned/shared-definition semantics. | `FAIL` | `TEST_PROPOSAL`; one focused row-editing contract, optional render probe. |
| `AC-009` | Each upload asset is classified independently and routes report only actually claimed paths as removed. | `FAIL` | `TEST_PROPOSAL`; one focused removal-claim contract, route assertions only if authorized. |

## Gates

| Gate | Status | Meaning |
|---|---|---|
| `GATE-TEST-SOURCE-001` | `FAIL` | `UNIT-003` remains planned until its two test imports and two source-contract assertions are explicitly authorized for narrow maintenance; execution/expansion remains unauthorized. |
| `GATE-LEASE-001` | `FAIL` | Component UI/action, security, and Estimate source leases must clear before `UNIT-004`, `UNIT-005`, `UNIT-006`, `UNIT-007`, or `UNIT-008` is promoted to ready. |
| `GATE-COMPLETION-001` | `FAIL` | Core implementation has not started; all core units must verify before completion. |

## Risk Register

| ID | Risk | Unit(s) | Fixed mitigation | Status |
|---|---|---|---|---|
| `RISK-001` | Category fallback/path semantics drift during resolver compilation. | `UNIT-001` | Delegate current function to compiled resolver; preserve every guard. | Open. |
| `RISK-002` | Auth status/message or secret handling changes. | `UNIT-002` | Three-route scope, exact response parity, no credential logging. | Open. |
| `RISK-003` | Tree extraction creates a cycle or changes tab/query/access behavior. | `UNIT-003` | D1 implementation only; workspace/auth orchestration stays; no re-export. | Open. |
| `RISK-004` | Stale move completion overwrites a newer optimistic target. | `UNIT-004` | Coordinator owns generation and confirmed target; adapters keep UI only. | Open. |
| `RISK-005` | Component mutation relocation breaks statement order, receipts, or fanout atomicity. | `UNIT-005` | Move transaction-coupled behavior together; two concrete aggregate modules. | Open. |
| `RISK-006` | Rate-limit relocation changes consumption, clearing, key, or window behavior. | `UNIT-006` | Source-level policy matrix and byte-equivalent relocation before semantics. | Open. |
| `RISK-007` | Estimate façade retirement changes high-risk row/history/revision behavior. | `UNIT-007` | Active-owner gate, fixed family checkpoints, one implementation per operation. | Open. |
| `RISK-008` | Store deepening causes render storms, focus loss, wrong shared mutation routing, or a server/client boundary violation. | `UNIT-008` | Existing vanilla store, selector ownership, explicit four-intent model, and client-safe Server Action adapters only. | Open. |
| `RISK-009` | Per-asset upload classification creates overlapping result sets or weakens final reference protection. | `UNIT-009` | Correlated claim predicate, disjoint result sets, unchanged cleanup-job backstop, no migration. | Open. |

## Decisions

| ID | Decision | Affected work | Status |
|---|---|---|---|
| `DEC-AUTO-001` | One master supersedes both predecessor packs; no concatenated backlog survives without current-source proof. | All units | Active. |
| `DEC-AUTO-002` | Deep modules hide cohesive implementation; generic factories, compatibility re-exports, and pass-through wrappers are prohibited. | `UNIT-003`, `UNIT-005`, `UNIT-007` | Active. |
| `DEC-AUTO-003` | Package is conditionally ready: only `UNIT-001`, `UNIT-002`, and `UNIT-009` are advertised now. | Package state | Active. |
| `DEC-AUTO-004` | Component, security, and Estimate work use single-writer lease gates; `UNIT-003` has a separate explicit test-source authorization boundary. | `UNIT-003` through `UNIT-008` | Active. |
| `DEC-AUTO-005` | Quantity and selected variant remain row-owned; variant-definition edits remain shared mutations. | `UNIT-007`, `UNIT-008` | Active. |
| `DEC-AUTO-006` | Rate-limit behavior relocates before any semantic convergence with other domains. | `UNIT-006` | Active. |
| `DEC-AUTO-007` | Applied migrations remain immutable; pagehide, admin, Legacy Cleanup, import, hosted proof, and unmeasured performance findings stay outside core scope; verified upload-removal correctness remains auxiliary scope. | Disposition register | Active. |
| `DEC-AUTO-008` | Product test commands are proposals only; this authoring run executes none. | All criteria | Active. |

## Unit Resume Table

| Unit | Status | Dependencies | Resume instruction |
|---|---|---|---|
| `UNIT-001` | `READY` | none | Exact next unit; compile resolver and update four batch surfaces. |
| `UNIT-002` | `READY` | none | Implement only the three production upload routes and shared helper. |
| `UNIT-009` | `READY` | none | Make claim eligibility per asset and return disjoint truthful result sets; no index or reference table. |
| `UNIT-003` | `PLANNED` | none | Promote only with explicit four-file test-source maintenance authorization; leave workspace/auth orchestration. |
| `UNIT-004` | `PLANNED` | none | Refresh after component UI lease clears; narrow move coordinator only. |
| `UNIT-005` | `PLANNED` | none | Refresh after component action lease clears; two concrete D1 modules. |
| `UNIT-006` | `PLANNED` | none | Confirm security single writer; relocate behavior without policy change. |
| `UNIT-007` | `PLANNED` | none | Wait for Estimate owner; replace all façade families and delete old file. |
| `UNIT-008` | `PLANNED` | none | Deepen the existing per-sheet store with client-safe action adapters after its independent UI lease clears. |

## Resume Rule

Read `plan-pack.json`, execute `next_unit`, and recheck its owned-path status. If that unit's baseline drifted, mark its source stale and refresh it; do not silently switch to a leased unit or revive a rejected predecessor finding.
