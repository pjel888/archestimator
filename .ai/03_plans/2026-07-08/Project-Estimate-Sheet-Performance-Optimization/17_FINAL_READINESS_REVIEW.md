# 17 - Final Readiness Review

## Current Verdict

| Axis | Status | Meaning |
|---|---|---|
| Plan package | `IMPLEMENTATION_READY` | One canonical artifact, manifest-backed traceability, resolved decisions, dependency-closed ready units, and an exact next unit exist. |
| Implementation | `NOT_STARTED` | No product source optimization from this plan has been executed. |
| Release | `NOT_EVALUATED` | Local/browser/D1/hosted runtime proof must be produced by the implementation units. |
| Lifecycle / terminal | `ACTIVE` / `ACTIVE` | `UNIT-001` is the next unit. |

This verdict is about plan executability, not current product performance. Browser and hosted proof are runtime acceptance evidence owned by later units; they do not cap planning readiness.

## Readiness Basis

- `plan-pack.json` is the machine-readable authority and validates hashes, IDs, reciprocal links, DAG closure, ready slices, and `next_unit`.
- `IMPLEMENTATION_PLAN.md` maps all 66 accepted legacy obligations to stable normalized IDs and exact unit packets.
- `UNIT-001` is runnable without choosing files, tests, evidence paths, or product behavior.
- `UNIT-004` converts measurements into deterministic branch activation or supersession receipts, preventing speculative optimization.
- `DEC-AUTO-001` through `DEC-AUTO-015` resolve the former owner decisions and architecture ambiguities.
- The interop contract has 19 unique IDs, not 17.
- Deployment rollback uses server-resolved, deployment-scoped modes; no `NEXT_PUBLIC_*` live-toggle claim remains.
- Hosted cleanup uses unique exact IDs and per-table reconciliation against the active D1 schema.
- Current test inventory includes bulk-delete partial failure, row-update broadcast, and tree DnD coverage; stale missing-test claims are corrected.

## Exact Handoff

Start `UNIT-001` in `IMPLEMENTATION_PLAN.md`.

Its stop condition is deterministic fixtures, strict evaluator validation, current characterization coverage, repaired stale contract tests, and green focused type/test checks. It is test/evaluator work only; it does not change product behavior.

`UNIT-002` and `UNIT-003` then run in parallel. No route/index/graph optimization starts until their evidence feeds the `UNIT-004` bottleneck decision.

## Runtime Evidence Still Required

The following are deliberately `PLANNED`, not present-tense proof:

- Browser Event Timing, Long Animation Frame, scroll, focus, responsive, and 19-scenario interop results.
- Estimate-specific local D1 query counts, plans, rows metrics, and cleanup proof.
- Route, bundle, RSC, memory, and 5,000-row before/after budgets.
- Graph/selector/property parity if that branch activates.
- Entity rollback/realtime concurrency proof if that branch activates.
- Hosted D1 evidence against bound `ARCH_DB` and a release evaluation.

No local-only check may be reported as hosted/provider or production proof.

## Residual Risks And Replan Triggers

| Risk | Trigger | Owner unit |
|---|---|---|
| Current test timing noise masks regressions. | Unwrapped-`act` warnings or inconsistent raw samples. | `UNIT-001`, `UNIT-002` |
| Route/D1 is the primary bottleneck. | Route/query thresholds fail or rank top three. | `UNIT-005` |
| Graph complexity adds cost without benefit. | Graph branch is not activated or memory/parity fails. | `UNIT-004`, `UNIT-006` |
| Server component fan-out exceeds scale budget. | Match/statement counts fail at 100/1000. | `UNIT-003`, `UNIT-009` |
| Express editing disables row virtualization at scale. | Mounted-row or scroll threshold fails with editor open. | `UNIT-008` |
| Session/auth state changes during long edits. | Current denial/integration scenario fails. | `UNIT-009` |
| Collaboration revisions race optimistic rollback. | Concurrent event sequence produces stale overwrite. | `UNIT-009` |
| Hosted cleanup is incomplete. | Any per-table count mismatch or remaining exact ID. | `UNIT-011`; fail closed before another seed |
| Real estimates exceed supported ceiling. | Sanitized first-user telemetry exceeds 1,500/5,000. | New planning decision; not silent scope expansion |

## Final Planning Acceptance

The plan is ready when fresh validation passes and the independent architect/critic re-review reports no unresolved P0/P1 plan defect. Runtime tests remain planned until implementation begins.
