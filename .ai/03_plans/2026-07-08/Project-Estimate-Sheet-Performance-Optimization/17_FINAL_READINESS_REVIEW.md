# 17 - Final Readiness Review

## Current Verdict

| Axis | Status | Meaning |
|---|---|---|
| Plan package | `NOT_READY` | The re-admission candidate is internally consistent and fail-closed while same-hash architect, critic, and fingerprint review is repeated. |
| Implementation | `NOT_STARTED` | No product source optimization from this plan has been executed. |
| Release | `NOT_EVALUATED` | Local/browser/D1/hosted runtime proof must be produced by the implementation units. |
| Lifecycle / terminal | `ACTIVE` / `ACTIVE` | No unit is executable until `AC-012`, `GATE-VERIFY-001`, `GATE-CLEAN-001`, `EVID-012`, `ready_slices`, and `next_unit` are mechanically promoted after clean review. |

This verdict is about planning readiness, not current product performance. Browser and hosted proof are runtime acceptance evidence owned by later units; they do not cap planning readiness.

## Readiness Basis

- `plan-pack.json` is the machine-readable authority and validates hashes, IDs, reciprocal links, DAG closure, ready slices, and `next_unit`.
- `IMPLEMENTATION_PLAN.md` maps all 66 accepted legacy obligations to stable normalized IDs and exact unit packets.
- `UNIT-001` is fully specified, but remains `PLANNED` until the manifest publishes it as `READY` in `SLICE-001`.
- `UNIT-004` converts measurements into deterministic branch activation or supersession receipts, preventing speculative optimization.
- `DEC-AUTO-001` through `DEC-AUTO-015` resolve the former owner decisions and architecture ambiguities.
- The interop contract has 19 unique IDs, not 17.
- Deployment rollback uses server-resolved, deployment-scoped modes; no `NEXT_PUBLIC_*` live-toggle claim remains.
- Hosted cleanup uses unique exact IDs and per-table reconciliation against the active D1 schema.
- The frozen v2 planning fingerprint is pre-edit admission only; runtime evidence uses separate application/producer digests, immutable run artifacts, and index-owned current projections.
- Fixture, cleanup, attempt, integration, hosted-recovery, decision, supersession, release, and index outputs have executable non-cyclic schemas and fail-closed eligibility rules.
- Current test inventory includes bulk-delete partial failure, row-update broadcast, and tree DnD coverage; stale missing-test claims are corrected.

## Exact Handoff

`AC-012=FAIL` and the manifest intentionally leaves `next_unit=null`; do not start implementation from this document. After fresh same-hash architect, critic, and fingerprint reviews are clean, perform only the mechanical authoritative promotion described in `IMPLEMENTATION_PLAN.md` and `plan-pack.json`.

Its first command verifies the frozen plan admission before any edit. It then bootstraps the complete frozen evaluator/tool/E2E surface, creates the server-only mode resolver without changing default product behavior, proves reference/typed current dual-fingerprint equality, and produces deterministic linked fixture/jsdom evidence under immutable paths.

`UNIT-002` then `UNIT-003` execute the toolchain frozen by `UNIT-001` serially; neither may edit producer/package inputs. Their evidence and the UNIT-001 jsdom evidence share one application/producer cohort and feed the `UNIT-004` decision. No route/index/graph optimization starts until that immutable decision is indexed.

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
| Route/D1 is the primary bottleneck. | The explicit `UNIT-005` route/D1 predicate fails; ranking cannot activate a passing branch. | `UNIT-004`, `UNIT-005` |
| Graph complexity adds cost without benefit. | Graph branch is not activated or memory/parity fails. | `UNIT-004`, `UNIT-006` |
| Server component fan-out exceeds scale budget. | Match/statement counts fail at 100/1000. | `UNIT-003`, `UNIT-009` |
| Express editing disables row virtualization at scale. | Mounted-row or scroll threshold fails with editor open. | `UNIT-008` |
| Session/auth state changes during long edits. | Current denial/integration scenario fails. | `UNIT-009` |
| Collaboration revisions race optimistic rollback. | Concurrent event sequence produces stale overwrite. | `UNIT-009` |
| Hosted cleanup is incomplete. | Any per-table count mismatch or remaining exact ID. | `UNIT-011`; fail closed before another seed |
| Evidence lineage is stale or ambiguous. | Either digest breaks the predecessor chain, producer digest changes inside Units 001-004 or outside an activated unit's owned product-test paths, Units 010-011 differ, an immutable run collides, or a current projection lacks an indexed immutable source. | Reopen earliest owning unit; index writer fails closed |
| Real estimates exceed supported ceiling. | Sanitized first-user telemetry exceeds 1,500/5,000. | New planning decision; not silent scope expansion |

## Final Planning Acceptance

The plan is not yet implementation-ready. Fresh validation and source-fingerprint proof pass for the re-admission candidate, but the independent same-hash review gate must close cleanly before the manifest can publish `IMPLEMENTATION_READY`, `SLICE-001`, and `next_unit=UNIT-001`. Runtime tests remain planned until implementation begins.
