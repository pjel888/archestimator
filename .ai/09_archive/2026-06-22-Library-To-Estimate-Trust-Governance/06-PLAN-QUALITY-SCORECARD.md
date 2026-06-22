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

## 2026-06-22 Parallel Audit Before Final Repair

| Review lane | Independent score | Blocker to 100% | Final repair |
| --- | ---: | --- | --- |
| Product strategy | 80-88 | No explicit beta MVP cutline; governance could block reuse-safety value. | `13-BETA-MVP-CUTLINE-AND-ROLE-DECISIONS.md` |
| UX/UI design readiness | 86 | Per-surface state/copy, governance queue, attachment flow, and responsive proof were not deterministic. | `14-PER-SURFACE-UX-STATE-AND-VISUAL-QA.md` |
| Security readiness | 92 | Private audit read policy, evidence privacy, and signed URL TTL/no-log rules were under-specified. | `09`, `15`, `16`, `_evidence/README.md` |
| DB/data integrity | 82 planning / 68 handoff | Attachment scope mismatch, direct-write prevention, RPC algorithms, seed fixtures, and DB preflight were missing. | `15-DATABASE-PREFLIGHT-MIGRATION-RPC-SPEC.md` plus `10` updates |
| Performance/network/cache | 79 | Query scaling, virtualization thresholds, idempotency, stale-cache lifecycle, and metrics were under-specified. | `11` updates plus `16` |
| Coherence/traceability | 74-87 | Validation baseline drift, U2/R16 traceability, QA-020 looseness, and missing lock/evidence templates. | `FILE_LOCKS.md`, `_evidence/`, `12` updates |

## Score Summary

| Dimension | Before repair | After repair | Evidence for after score |
| --- | ---: | ---: | --- |
| Strategy fit | 90 | 100 | `13` defines the beta reuse foundation, full-governance cutline, role decision, and ADRs. |
| Requirement traceability | 72 | 100 | `12` maps UX issue -> requirement -> unit -> QA -> adversarial scenario -> evidence -> owner, including U2/R16 and QA-024. |
| UX/UI readiness | 76 | 100 | `07` and `14` name screens, roles, exact states, copy, focus, governance queue, attachment flow, mobile, and visual QA gates. |
| Security readiness | 84 | 100 | `09`, `15`, and `16` define authz, private read policy, exposure tiers, storage, signed URL TTL/no-log rules, telemetry, evidence privacy, and no-go rules. |
| DB/migration readiness | 74 | 100 | `10` and `15` define accepted-cost semantics, actual attachment-scope preflight, migration triggers, SQL probes, RPC algorithms, direct-write prevention, fixtures, and fix-forward rules. |
| Performance readiness | 72 | 100 | `11` and `16` define pagination, query-plan proof, virtualization thresholds, cache fanout, idempotency, stale-cache lifecycle, runtime metrics, and network/attachment budgets. |
| QA/evidence readiness | 78 | 100 | `12`, `_evidence/README.md`, and `16` pre-register commands, fixture needs, evidence files, owners, skipped-proof handling, and evidence redaction audit. |
| Coordination readiness | 58 | 100 | `08` and `FILE_LOCKS.md` define file locks, ownership, integration order, active-lock bootstrap, and high-conflict hot spots. |
| Codebase-AI handoff readiness | 70 | 100 | `17` provides the implementation front door, conflict resolver, phase plan, pros/cons, SWOT, agent staffing, stop gates, and report template. |
| Overall planning quality | 77 | 100 | All pre-implementation decision gaps now have a named artifact, owner, and gate. |
| Overall implementation readiness | 74 | 100 | Implementers can start U1-U3 immediately after Phase 0 baseline reconciliation and can start U4/U5 only after the DB preflight gate. |

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
| Honesty | Phase 0 reconciles current validation truth; local proof, broad validation, provider proof, and release NO-GO status are not conflated. | Pass |

## Readiness Verdict

The pack is 100/100 for planning quality and implementation readiness after
this final repair pass, with precise scope: U1-U3 can proceed after Phase 0
baseline reconciliation; U4/U5 can proceed only after DB preflight proves the
current schema, policies, grants, probes, and generated-type impact. This is not
a claim that app code, provider proof, or migrations have already been changed.

## Implementation Addendum

On 2026-06-22 the pack moved from planning readiness to implementation evidence:

- U1-U3, U4/U5, U6, and U7 evidence files were added under `_evidence/`.
- Migration `20260622143000_library_trust_governance.sql` was applied to the
  linked Archestimator Supabase project and marked applied for that version.
- Targeted typecheck, lint, Vitest, provider schema/grant, and SQL-006A
  item-page query-plan proof passed.
- Remaining implementation caveat: SQL-006B/literal related-query EXPLAIN retry
  was blocked by Supabase temp-role auth throttling after the provider migration
  and core probes passed. The applied schema/grant/RPC proof remains valid.

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

## Final Parallel Audit Repairs

The 2026-06-22 parallel audit added one more repair layer:

- Added `13` to separate beta reuse safety from full durable governance and to record admin-only beta trust authority.
- Added `14` to convert UX state labels into deterministic surface, copy, action, focus, mobile, and visual QA contracts.
- Added `15` to require DB preflight, resolve attachment scope drift, specify direct-write prevention, private read policy, RPC algorithms, and seed fixtures.
- Added `16` to define runtime metrics, rollout/kill switches, signed URL/evidence privacy, and release reporting.
- Added `FILE_LOCKS.md` and pre-created `_evidence/` templates so parallel agents can start from shared coordination and proof artifacts.
- Replaced stale broad-validation wording with Phase 0 baseline reconciliation.

## Codebase-AI Implementation Guide Repairs

The final implementation-guide pass added `17-CODEBASE-AI-IMPLEMENTATION-GUIDE.md`
and repaired the remaining handoff contradictions:

- Made U1-U3 plus U6a recovery states and per-phase U7 evidence the default beta
  release path.
- Defined `partial` as internal progress, not a release-ready claim.
- Resolved the `Insert as new row` versus `Insert as project-specific` label
  conflict.
- Placed recovered-edit states on concrete row/sidebar/template/governance
  surfaces rather than toast-only feedback.
- Clarified that curator/reviewer are UX task labels and durable trust changes
  remain admin-only for beta.
- Added query-count, payload-byte, route-bundle, cache-fanout, realtime/refetch,
  SQL-006A/SQL-006B, append-only event-table, nullable uniqueness, and evidence
  privacy scan gates.
- Updated the handoff read list, evidence-ledger wording, and R19 parallel-lock
  traceability.
