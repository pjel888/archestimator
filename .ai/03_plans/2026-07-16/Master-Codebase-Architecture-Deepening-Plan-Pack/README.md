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

The package is conditionally ready against clean repository revision `68b869c8f42c6894af7e6379be98b84013650916`. All previously recorded codebase-agent owners are terminal, the worktree is clean, and the former Component, Estimate, and Admin handoff gates are cleared. Three dependency-free units are implementation-ready; six units require explicit test-source maintenance authorization. `UNIT-001` is the only authorized start. `UNIT-002` and `UNIT-005` are fallback inventory that require a recorded `next_unit` update before use.

1. `UNIT-001` compiles the component-category folder resolver once per dataset.
2. `UNIT-002` centralizes the three production upload-route Bearer checks behind one timing-safe server boundary.
3. `UNIT-005` moves component and folder D1 statement graphs into two concrete deep modules.

`UNIT-003`, `UNIT-004`, `UNIT-006`, `UNIT-007`, `UNIT-008`, and core correctness `UNIT-009` remain `PLANNED` until their exact test-source import/mock/contract maintenance is authorized. Test-source edit authorization does not authorize test execution or broad assertion expansion. The later implementation run must be standalone: if another write-capable codebase agent starts or any owned path becomes dirty, execution pauses and the affected unit is rebaselined before further edits. No broader Admin Estimate System feature or content work enters this pack; `UNIT-007` owns only the exact `sources.persistence` retarget made necessary by deleting the old façade.

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

## Validation Policy

This authoring run is `PLAN_ONLY`. No product tests, builds, browser automation, screenshots, hosted D1 operations, deployments, or provider mutations were run. Static plan validators, current-source inspection, GitNexus directional impact analysis, React Doctor diagnostics, hashing, JSON validation, scoped diff checks, and `git diff --check` are allowed.

Every future product-test command in the canonical plan is a `TEST_PROPOSAL`, not standing authorization. An implementation executor must follow the repo's user-controlled test gate for that execution task.

A unit whose acceptance criterion says static evidence is insufficient may become source-complete, but it remains `IN_PROGRESS` with its criterion failing until an explicitly authorized fresh test receipt proves the invariant. Static validators alone never promote this package to `COMPLETE / ACHIEVED`.

## Stop Condition

Architecture implementation is complete only when all core units, including per-asset upload-removal correctness, are `VERIFIED`; the auxiliary Bearer-security unit is verified or explicitly deferred; obsolete predecessor seams are absent; every receipt identifies the exact source revision; scoped validators are green; and this pack can truthfully transition to `COMPLETE / ACHIEVED`. No hosted or release-readiness claim is implied.
