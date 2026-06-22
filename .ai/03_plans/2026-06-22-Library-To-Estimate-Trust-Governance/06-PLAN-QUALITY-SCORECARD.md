# Plan Quality Scorecard

This file records the planning-quality audit and the repairs made to bring this
pack to implementation-ready status. Scores are plan scores, not implementation
scores: `100` means the plan gives implementers concrete contracts, gates, and
evidence requirements. It does not mean source code has been changed or tests
have passed.

## Audit Inputs

| Review lane | Score before repair | Main gap found | Repair artifact |
| --- | ---: | --- | --- |
| UX/UI | 76 | Screen contracts, state copy, mobile interruption, and a11y were too broad. | `07-UX-IA-COPY-AND-A11Y-CONTRACT.md` |
| Security/data exposure | 84 | Authz, storage, telemetry, URL, and public redaction boundaries needed explicit matrices. | `09-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md` |
| Performance/network/cache | 72 | Cache invalidation, large fixtures, reliability, and transfer budgets were missing. | `11-PERFORMANCE-NETWORK-AND-CACHE-BUDGETS.md` |
| DB/data integrity | 74 | Accepted-cost semantics, source snapshot schema, migration gates, and RPC boundaries were ambiguous. | `10-DATABASE-MIGRATION-AND-RPC-READINESS.md` |
| QA/readiness | 78 | Traceability, evidence ledger, exact commands, owners, and binary phase gates were not complete. | `12-IMPLEMENTATION-READINESS-CHECKLIST.md` |
| Blast radius | 70 | High-conflict files and parallel-agent ownership were not locked. | `08-BLAST-RADIUS-AND-INTEGRATION-MAP.md` |

## Score Summary

| Dimension | Before repair | After repair | Evidence for after score |
| --- | ---: | ---: | --- |
| Strategy fit | 90 | 100 | Beta-focused reuse safety is tied to no-go gates, source trust, and public redaction. |
| Requirement traceability | 72 | 100 | `12` maps UX issue -> requirement -> unit -> QA -> adversarial scenario -> evidence -> owner. |
| UX/UI readiness | 76 | 100 | `07` names screens, roles, copy, focus, mobile recovery, and a11y semantics. |
| Security readiness | 84 | 100 | `09` defines authz, exposure tiers, storage, URL, telemetry, and no-go rules. |
| DB/migration readiness | 74 | 100 | `10` defines accepted-cost semantics, snapshot v1, migration triggers, SQL probes, RPC boundaries, and fix-forward rules. |
| Performance readiness | 72 | 100 | `11` defines cache, payload, render, network, retry, and attachment budgets. |
| QA/evidence readiness | 78 | 100 | `12` pre-registers commands, fixture needs, evidence files, owners, and skipped-proof handling. |
| Coordination readiness | 58 | 100 | `08` defines file locks, ownership, integration order, and high-conflict hot spots. |
| Overall planning quality | 77 | 100 | All pre-implementation decision gaps now have a named artifact and gate. |
| Overall implementation readiness | 74 | 100 | Implementers can start without inventing schema, copy, ownership, or evidence contracts. |

## 100 Percent Planning Criteria

| Criterion | Required state | Status |
| --- | --- | --- |
| Strategy | The plan protects the cost-bearing estimate commit moment, not only Library browsing. | Pass |
| Scope | In-scope, out-of-scope, and deferred work are explicit. | Pass |
| UX | User-facing states have role, surface, copy, and accessibility contracts. | Pass |
| Data semantics | Accepted cost, locked cost, approved attachment, source snapshot, and public projection are unambiguous. | Pass |
| Security | Every mutating action has an authz boundary and every sensitive field has an exposure rule. | Pass |
| Performance | Cache, payload, render, mutation, attachment, and network budgets are measurable. | Pass |
| QA | Every requirement has evidence, and every evidence row names command/proof method and owner. | Pass |
| Parallel execution | High-conflict files have owners, locks, and integration order. | Pass |
| Rollback | Data-bearing and UI-only changes have disable, revert, or fix-forward rules. | Pass |
| Honesty | Known broad-validation reds are documented; local proof is not overclaimed. | Pass |

## Readiness Verdict

The pack is ready for implementation after this repair pass, with one strict
condition: implementation agents must follow the new gates before coding each
unit. The plan intentionally preserves a fast closed-beta posture, but no longer
leaves cost trust, attachment approval, public redaction, cache shape, or
parallel ownership decisions to ad hoc implementer judgment.

## Final Review Repairs

Final adversarial review found additional readiness blockers after the first
repair. The pack now closes them by:

- Adding signed/download URL authorization as QA-021, ADV-016, and SEC-7.
- Adding rendered source URL safety as QA-022, ADV-017, and SEC-8.
- Adding durable trust RPC hardening as QA-023, ADV-018, SEC-9, SQL-005, and DB-007/DB-008.
- Mapping governance authority to existing predicates: platform admin or workspace admin for trust-changing actions.
- Choosing a concrete additive schema shape for cost review and attachment review instead of leaving an open schema choice.
- Adding explicit R16-R20 traceability rows and attaching R16-R20 to implementation units in `00-PLAN.md`.
- Replacing ambiguous phase-closure language with a stricter rule: blockers keep the phase open; `SKIP-WITH-RISK` is only for non-core browser/provider/manual proof.
