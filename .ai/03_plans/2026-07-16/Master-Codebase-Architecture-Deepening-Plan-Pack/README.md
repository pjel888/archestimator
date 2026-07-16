# Master Codebase Architecture Deepening Plan Pack

- **Date:** 2026-07-16
- **Package:** `PLAN-2026-07-16-master-codebase-architecture-deepening`
- **Status:** `CONDITIONALLY_READY`
- **Implementation:** `NOT_STARTED`
- **Exact next unit:** `UNIT-001`
- **Canonical execution artifact:** `IMPLEMENTATION_PLAN.md`

## Outcome

Deepen the highest-leverage Archestimator modules without turning file splitting, interface count, or static-advisor output into architecture goals of their own, while preserving the one verified correctness defect found during consolidation. The target state has fewer stringly and cross-domain seams, clearer ownership of D1 transactions and row-editing state, truthful per-asset upload-removal results, and no compatibility layers created only to preserve the abstractions being retired.

This pack is the sole active authority for the two superseded 2026-07-16 predecessors:

- `Codebase-Architecture-Deepening-Plan-Pack`
- `Codebase-Improve-Audit-Plan-Pack`

Their current-source-valid findings were re-audited, narrowed, merged, or rejected in `AUDIT-AND-DISPOSITION.md`. Historical files remain available only in their archive destinations.

## Ready Shape

The package is conditionally ready because three clean, dependency-free units can start now while the Estimate-tree test-source move and the component, security, and Estimate surfaces retain explicit gates.

1. `UNIT-001` compiles the component-category folder resolver once per dataset.
2. `UNIT-002` centralizes the three production upload-route Bearer checks behind one timing-safe server boundary.
3. `UNIT-009` makes upload removal per-asset and returns truthful removed, blocked, and already-removed path sets.

`UNIT-003` is specified but remains `PLANNED` until its required import-only test-source maintenance is explicitly authorized. `UNIT-004` through `UNIT-008` remain `PLANNED` until their named single-writer lease gates clear. A lease is an internal coordination condition, not a request for product direction or external authorization.

## Deep-Module Contract

- Move cohesive implementation responsibility, not merely lines.
- Keep domain intent at callers and hide SQL, sequencing, rollback, and concurrency mechanics below the interface.
- Do not add a generic repository factory without a second implementation.
- Do not leave compatibility re-exports after all in-repo callers move.
- Preserve row-owned quantity and selected-variant state; variant-definition edits remain shared mutations.
- Relocate security behavior byte-for-byte before changing policy semantics.
- Delete props, memo comparators, and helper seams only when a deeper interface makes them unnecessary.

## Artifact Map

| Artifact | Purpose |
|---|---|
| `README.md` | Entrypoint, package state, and execution boundary. |
| `AUDIT-AND-DISPOSITION.md` | Current-source evidence, blast radius, predecessor crosswalk, rejected findings, and leases. |
| `IMPLEMENTATION_PLAN.md` | Canonical unit DAG with exact paths, changes, evidence, recovery, and next state. |
| `LOOP_LEDGER.md` | Requirement, acceptance, risk, unit, and resume traceability. |
| `plan-pack.json` | Validator-readable state, fingerprints, and exact next unit. |

## Validation Policy

This authoring run is `PLAN_ONLY`. No product tests, builds, browser automation, screenshots, hosted D1 operations, deployments, or provider mutations were run. Static plan validators, current-source inspection, GitNexus directional impact analysis, React Doctor diagnostics, hashing, JSON validation, scoped diff checks, and `git diff --check` are allowed.

Every future product-test command in the canonical plan is a `TEST_PROPOSAL`, not standing authorization. An implementation executor must follow the repo's user-controlled test gate for that execution task.

## Stop Condition

Architecture implementation is complete only when all core units are `VERIFIED`, the auxiliary security and upload-correctness units are either verified or explicitly deferred without blocking the core result, obsolete predecessor seams are absent, every receipt identifies the exact source revision, scoped validators are green, and this pack can truthfully transition to `COMPLETE / ACHIEVED`. No hosted or release-readiness claim is implied.
