# Master Codebase Architecture Deepening Plan Pack

- **Date:** 2026-07-16
- **Package:** `PLAN-2026-07-16-master-codebase-architecture-deepening`
- **Status:** `IMPLEMENTATION_READY`
- **Implementation:** `COMPLETE`
- **Release:** `NOT_EVALUATED`
- **Lifecycle:** `ARCHIVED`
- **Terminal:** `ACHIEVED`
- **Exact next unit:** none
- **Canonical execution artifact:** `IMPLEMENTATION_PLAN.md`

## Outcome

Deepen the highest-leverage Archestimator modules without turning file splitting, interface count, or static-advisor output into architecture goals of their own, while preserving the one verified correctness defect found during consolidation. The target state has fewer stringly and cross-domain seams, clearer ownership of D1 transactions and row-editing state, truthful per-asset upload-removal results, and no compatibility layers created only to preserve the abstractions being retired.

This completed archive is the sole canonical authority for the two superseded 2026-07-16 predecessors:

- `Codebase-Architecture-Deepening-Plan-Pack`
- `Codebase-Improve-Audit-Plan-Pack`

Their current-source-valid findings were re-audited, narrowed, merged, or rejected in `AUDIT-AND-DISPOSITION.md`. Historical files remain available only in their archive destinations.

## Completed Shape

All nine units are implemented and verified against baseline revision `0a2667db998607917932ad7832e9a6a5bd7e066a` plus their recorded worktree hashes. The standalone writer window held throughout implementation. Every unit has a fresh receipt under `evidence/`, every acceptance criterion and focused test is passing, all nine risks are mitigated, and no next unit or ready slice remains.

1. `UNIT-001` compiles the component-category folder resolver once per dataset.
2. `UNIT-002` centralizes the three production upload-route Bearer checks behind one timing-safe server boundary.
3. `UNIT-003` extracts cohesive Estimate-tree D1 reads without moving workspace or authorization orchestration.
4. `UNIT-004` gives component-folder move ordering and rollback one shared coordinator.
5. `UNIT-005` moves component and folder D1 statement graphs into two concrete deep modules.
6. `UNIT-006` moves durable public rate-limit mechanics into shared security infrastructure without policy drift.
7. `UNIT-007` deletes the stringly Estimate D1 façade and replaces it with typed intent modules.
8. `UNIT-008` makes the existing per-sheet row store the sole row-commit and rollback owner while preserving duplicate retry identity.
9. `UNIT-009` makes upload-removal eligibility and result classification truthful per asset.

`IMPLEMENTATION_PLAN.md`, `LOOP_LEDGER.md`, and `AUDIT-AND-DISPOSITION.md` preserve the frozen execution and authoring history, including their preterminal status prose. Terminal truth is carried by `plan-pack.json`, the nine unit receipts, and `evidence/FINAL-COMPLETION.md`; the frozen ledger is not a resume surface after completion.

## Deep-Module Contract

- Move cohesive implementation responsibility, not merely lines.
- Keep domain intent at callers and hide SQL, sequencing, rollback, and concurrency mechanics below the interface.
- Do not add a generic repository factory without a second implementation.
- Do not leave compatibility re-exports after all in-repo callers move.
- Preserve row-owned quantity and selected-variant state; shared component-definition edits remain shared mutations for both linked Library components and shared project component/variant definitions.
- Relocate security behavior byte-for-byte before changing policy semantics.
- Delete props, memo comparators, and helper seams only when a deeper interface makes them unnecessary.

## Artifact Map

| Artifact | Purpose |
|---|---|
| `README.md` | Entrypoint, package state, and execution boundary. |
| `AUDIT-AND-DISPOSITION.md` | Current-source evidence, blast radius, predecessor crosswalk, rejected findings, and exclusivity boundaries. |
| `IMPLEMENTATION_PLAN.md` | Canonical unit DAG with exact paths, changes, evidence, recovery, and next state. |
| `LOOP_LEDGER.md` | Requirement, acceptance, risk, unit, and resume traceability. |
| `plan-pack.json` | Validator-readable state, fingerprints, and exact next unit. |
| `evidence/UNIT-001.md` through `evidence/UNIT-009.md` | Fresh unit-level implementation and verification receipts. |
| `evidence/FINAL-COMPLETION.md` | Final requirement-to-evidence audit, adversarial QA matrix, degraded-tool reconciliation, and archive gate. |

## Validation Policy

The original authoring run was `PLAN_ONLY`. This implementation run is `IMPLEMENT_LOCAL`; the active goal explicitly authorizes the focused product tests, exact test-source maintenance, static checks, React Doctor regression scan, and final adversarial QA needed by this pack. Hosted D1 operations, deployments, provider mutations, and unrelated browser work remain outside scope.

Every focused product-test command in the canonical plan is now a `TEST_TASK` under the current implementation goal. The authorization remains limited to the plan's named behavior contracts and exact test-source maintenance; it does not invite unrelated suite expansion.

A unit whose acceptance criterion says static evidence is insufficient may become source-complete, but it remains `IN_PROGRESS` with its criterion failing until an explicitly authorized fresh test receipt proves the invariant. Static validators alone never promote this package to `COMPLETE / ACHIEVED`.

## Completion Result

Architecture implementation is `COMPLETE / ACHIEVED`: all core units and the auxiliary Bearer-security unit are `VERIFIED`, obsolete predecessor seams are absent, receipt hashes match the current worktree, scoped verification is green, and final independent reviews found no implementation defect. Release remains `NOT_EVALUATED`; no deployment, hosted D1/R2, production, or broad browser-readiness claim is implied.
