# Test And Adversarial QA

## Authority And Proof Boundary

This artifact provides independently reviewable setup, denial, cleanup, and
failure-response detail for `TEST-001..010`. Stable IDs and scenario baselines
remain documented in `VERIFICATION_ROLLOUT_AND_FINAL_AUDIT.md`; current live
status remains solely in `plan-pack.json`.
Every scenario below is planned; none is evidence until its producer writes the
named artifact and the manifest is refreshed by the lead.

## Applicability Review

| Frontier gate | Applicability | Required proof focus |
| --- | --- | --- |
| `GATE-UX-01` | Applies | Admin states, semantics, keyboard/focus, reflow, and unavailable/denied recovery. |
| `GATE-NEXT-01` | Applies | Provider placement, RSC/server aggregation, client island and route/cache ownership. |
| `GATE-CONTRACT-01` | Applies | Metric, aggregation, operating, hosted, auth-risk, legal, and receipt schemas/consumers. |
| `GATE-DATA-01` | Applies | D1 event/session/incident/support lifecycle, dedupe, retention, deletion, and tenant isolation. |
| `GATE-SEC-01` | Applies | Consent, session credential taxonomy, revocation/replay denial, redaction, and least privilege. |
| `GATE-VERIFY-01` | Applies | Regression-first behavior, injected failures, safe errors, retries, and cleanup. |
| `GATE-PERF-01` | Applies | Operator aggregation/cardinality evaluator, source timeouts, and degraded behavior. |
| `GATE-OPS-01` | Applies | Hosted delivery, coverage, release composition, rollback, support, and incident proof. |
| `GATE-AGENT-01` | `N/A` | This pack does not change prompts, skills, payloads, routing, memory, or orchestration contracts. A lead/integrator and operator are ordinary execution roles; the Program pack owns cross-pack orchestration. |
| `GATE-CLEAN-01` | Applies | Remove superseded global injection and synthetic proof state without unrelated cleanup. |

## Local Test Matrix

| Test | Setup and command surface | Expected signal | Evidence/cleanup | Failure response |
| --- | --- | --- | --- | --- |
| `TEST-001` | Typed registry/query fixtures for duplicate, bot, test, anonymous, missing denominator, stale, cross-workspace, retry, and deletion cases | Invalid definitions/records rejected; clean aggregates stable | Focused Vitest output in the Operating verification artifact; delete fixture rows | Keep `AC-001` failed; repair registry/query contract. |
| `TEST-002` | Source/DOM tests plus bounded provider-request interception across route/consent/withdrawal states | No global, pre-consent, withdrawn, or forbidden-surface load/event | DOM/network fixture output; reset consent/flags | Disable provider path and keep release red. |
| `TEST-003` | Repository/DOM fixtures for searched/unsearched placeholder order, pagination/session aggregation, flag-audit before/after shape, corporate-role/platform-admin separation, cross-workspace denial, and real, zero, empty, partial, stale, denied, timeout, and error inputs | SQL bind order matches placeholder order independently of the mock; corporate `owner`/`team_leader`/`member`/`viewer` roles cannot satisfy platform-admin authorization or cross workspace boundaries; audit shape is versioned; real value or explicit `Unavailable`; no sample fallback | Targeted test output; deterministic clock reset | Keep `AC-003` failed, repair the query/test contract, render unavailable, and isolate the failing source. |
| `TEST-004` | Policy/schema and S-01..S-07 local scenarios, delivery-failure fixtures, concurrent same-`clientMessageId` failed-reply retries, injected post-email sent-state null/error, support acknowledgment clock, rollback tabletop | Every frozen proposed deadline/channel/template/review fixture is enforced without hosted claim; exactly one retry attempt sends, stale `send_failed` state never returns success, and uncertain delivery blocks resend until deterministic reconciliation | Temp incident/support rows and fake provider message IDs by run ID; remove after reconciliation assertions | Keep local gate failed; open a redacted ledger recurrence; never mask or automatically resend an uncertain delivery. |
| `TEST-005` | Separate current/specific/other/all-session fixtures, row readback, replay, foreign/expired, injected D1 deletion failure, recovery-receipt consumer | Exact targeted rows absent and replay denied; failure propagates with rows preserved | Temp users/sessions and keyed digests only; delete by run ID | Treat success-with-row or swallowed deletion as security failure. |
| `TEST-006` | Missing/expired/version/scope/cohort-overflow legal fixtures | Limited and broader decisions cannot satisfy one another | Schema fixture output; no privileged content | Keep `AC-006` failed and invitations gated. |
| `TEST-007` | Operating/release consumer fixtures for missing, stale, malformed, contradictory, wrong release/SHA/environment, or dirty cleanup | Every invalid receipt rejected; current complete fixture accepted | Fixture report; remove generated temp files | Keep local artifact/release red. |

## Boundary Test Matrix

| Test | Authorized setup | Expected signal and evidence | Cleanup/denial |
| --- | --- | --- | --- |
| `TEST-008` | Exact `AUTH-001` hosted packet with approved flags, recipients, synthetic account/session, release ID, and time window | Consent/provider, alert/support/incident delivery and acknowledgment, backup failover, rollback, and synthetic auth canary produce `OPERATING-HOSTED-PROOF-RECEIPT-v1` | Remove flags, events, incidents, support rows, synthetic sessions/credentials; any missing authorization or cleanup remains `BOUNDARY`. |
| `TEST-009` | Current local, recovery, and hosted receipts plus `AUTH-002` | Scoped, expiring `AUTH-RISK-DECISION-RECEIPT-v1`; stale/self-referential/missing evidence rejected | No provider/session/recovery action; unresolved human decision remains `BOUNDARY`. |
| `TEST-010` | Current incident-policy confirmation and legal schema/artifact versions plus `AUTH-003` | `LIMITED-COHORT-LEGAL-DECISION-RECEIPT-v1` binds the exact owner-confirmed policy digest, support window/primary/backup, and keeps limited and broader/counsel scope distinct | No hosted/invitation/release/provider action; missing/mismatched policy or unresolved/wrong-scope decision remains `BOUNDARY`. |

## Determinism And Evidence Rules

Use deterministic clocks, IDs, random sources, and temp
`ARCHESTIMATOR_DEV_LOG_PATH` for logger tests. Capture commands, exit status,
stable pass/fail labels, source revision, and artifact path; never raw logs,
tokens, emails, webhooks, private URLs, or customer rows. A changed source,
schema, provider route, auth contract, legal version, incident policy, or release
identity invalidates the related result and requires rerun by a distinct
verifier before status elevation.
