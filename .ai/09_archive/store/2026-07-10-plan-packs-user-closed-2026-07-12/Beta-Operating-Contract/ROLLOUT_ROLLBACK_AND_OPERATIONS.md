# Rollout, Rollback, And Operations

## Authority And Scope

This is the operations review artifact for `REQ-004`, `REQ-007`, `RISK-003`,
`RISK-006`, `UNIT-003`, `UNIT-006..009`, `GATE-001..004`, and `AUTH-001..003`.
It sequences evidence and recovery contracts but does not supersede the unit DAG
or authorize any external action.

## Staged Rollout

| Stage | Preconditions | Action | Go signal | Stop/rollback signal |
| --- | --- | --- | --- | --- |
| 1. Local privacy/metrics | Current source audit; `UNIT-001` ready | Land no-global-injection regression, consent path, and metric registry behind disabled production flags | `TEST-001/002` pass | Any forbidden load/event, invalid population, or sensitive field. |
| 2. Operator truth | Stage 1 contract stable | Replace remaining placeholders and approximations with server-backed real/unavailable aggregation, including the activation-cohort contract | `TEST-003` passes including partial/stale/denied states | Sample or approximate fallback, tenant leak, unbounded query, or unavailable shown as zero. |
| 3. Local operations/auth/legal | Disjoint leases for Units 003/004/005 | Land the frozen proposed incident/support fixture plus session-risk and legal gate schemas/tests | `TEST-004..006` pass | Swallowed failure, missing denial, undefined policy, or conflated boundary. |
| 4. Local composition | Units 001..005 pass | Emit local operating and maintainability receipts | `TEST-007`, `GATE-001`, and strict consumers pass | Missing/stale/contradictory receipt or hidden external side effect. |
| 5. Owner policy/cohort/legal decision | Current Unit 003 policy and Unit 005 legal schemas; `AUTH-003` | Record the exact policy digest, support primary/backup/window, limited-cohort decision, and distinct counsel scope | `TEST-010` and immutable decision receipt current | Missing, expired, wrong-scope, policy mismatch, missing support coverage, or substituted evidence. |
| 6. Hosted operations | Current local, Recovery, and Unit 009 policy-decision receipts; `AUTH-001` | Run exact hosted consent/alert/support/synthetic proof window against the receipt-bound policy | `TEST-008` and cleanup current | Unauthorized scope, policy mismatch, user impact, failed delivery/acknowledgment, or cleanup gap. |
| 7. Auth-risk decision | Current local, Recovery, and hosted receipts; `AUTH-002` | Record the separate auth-risk receipt | `TEST-009` current | Missing, expired, self-referential, mismatched, or substituted evidence. |
| 8. Release composition | Exact release/SHA/environment and all applicable receipts | Release pack evaluates the named limited cohort | Every required receipt current; broader scope separately authorized | Any stale identity, boundary, failed gate, or unsupported scope. |

## Rollback And Fix-Forward Matrix

| Failure | Immediate safe action | Recovery/proof before resume |
| --- | --- | --- |
| Analytics consent/route defect | Disable/remove provider injection; preserve only redacted diagnostics | Rerun route/consent/withdrawal matrix and hosted proof if production was touched. |
| Metric/operator defect | Render `Unavailable`; stop decision use of affected metric | Repair producer/consumer, rerun registry/query/DOM and cardinality checks. |
| Incident/support delivery or coverage gap | Use documented manual escalation; keep release red | Prove named coverage, primary/backup delivery and acknowledgment, then refresh receipt. |
| Session/auth defect | Revoke affected sessions, rotate scoped credentials, restrict D1/backup access, open incident | Row absence, replay denial, failure propagation, Recovery receipt, and hosted canary current. |
| Legal/cohort mismatch | Stop new invitations/expansion; retain obligations for admitted cohort | New exact-scope/version decision receipt. |
| Receipt mismatch/staleness | Reject composition; do not rerun another pack implicitly | Producer reruns its own proof and emits a new immutable receipt. |
| Cleanup failure | Treat as incident/blocker; do not mark hosted gate complete | Independent absence/readback for every synthetic resource and credential. |

## Operational Signals And Ownership

Required signals are structured redacted metric availability, consent/provider
status, support queue age, incident severity/state/deadlines, alert delivery and
acknowledgment, session revocation outcomes, receipt validity/freshness, and
cleanup status. Alert threshold fixtures use the proposed incident/support
deadlines until the `AUTH-003` owner-confirmed digest makes them binding;
missing owner/coverage is a failing readiness requirement, not an informational
warning.

`UNIT-003` owns local runbook/policy. `UNIT-006` owns local artifact composition.
`UNIT-009` owns the policy/cohort/legal decision receipt before hosted proof;
`UNIT-007` owns authorized hosted proof and cleanup against that receipt, and
`UNIT-008` owns only the separate auth-risk decision receipt. The Release pack alone composes
release truth, while the Program pack owns cross-pack receipt orchestration.

## Handback And Stop Condition

Handback consists of immutable versioned receipts with producer/schema version,
release/SHA/environment, evidence identities/freshness, result, owner, blocker,
next action, and cleanup status. Planning is complete when the adaptive pack is
semantic-clean; implementation stops only when all internal tests pass and each
external boundary is either resolved by current evidence or remains explicitly
`BOUNDARY`. No plan text, local script inventory, or agent summary can promote a
hosted or human gate.
