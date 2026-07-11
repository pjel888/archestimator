# Requirements Traceability and Final Audit

## Functional Requirements

| ID | Requirement | Priority | Units | Primary proof |
| --- | --- | --- | --- | --- |
| REQ-001 | Current admin defects and placeholder claims are repaired and regression-locked | P0 | 001,002 | focused repository/action/DOM tests |
| REQ-002 | Every admin route/action/read uses exact server capability and truthful source/as-of semantics | P0 | 003,016 | denial matrix + DTO/source tests |
| REQ-003 | User list has canonical identity coverage, server search/filter/sort/cursor pagination, and mismatch state | P0 | 004,005 | seeded repository + DOM tests |
| REQ-004 | User 360 exposes summary, access, activity, sessions/security, product footprint, support, notifications, interventions | P0 | 004,005 | adapter/integration/cross-tenant tests |
| REQ-005 | Signup, profile provision, login, authenticated use, product activity, and online are separately defined and sourced | P0 | 004,005 | lifecycle fixture matrix |
| REQ-006 | Suspend/ban/reactivate and session revoke are row-proven, protected, idempotent, audited, and recoverable | P0 | 003,006 | action/failure/concurrency tests |
| REQ-007 | Notification campaigns support draft, review, approval, schedule, publish, fail, cancel, expire, retract, supersede with occurrence-level history | P0 | 007,009,010 | lifecycle/occurrence state-machine tests |
| REQ-008 | Composer supports typed content, versioned templates, preview, test send, immutable versions, safe action links, and validation parity | P0 | 007 | domain + DOM tests |
| REQ-009 | Audience builder supports typed user/activity/beta/corporate/workspace/project cohorts, reconciliation-state eligibility, canonical inbox keys, and reach exclusions | P0 | 008 | evaluator parity/reconciliation/denial tests |
| REQ-010 | One-time and recurring scheduling preserves immutable occurrences, UTC/IANA/local intent, DST policy, series edit/cancel history, next-attempt and scheduler freshness | P0 | 007,009,010 | recurrence/scheduler/date matrix |
| REQ-011 | Publication is asynchronous, idempotent, chunked, retryable, DLQ-visible, and reconcilable | P0 | 009 | fault injection + hosted queue proof |
| REQ-012 | Manager shows sent/scheduled/draft/failed/cancelled/expired/retracted history and complete campaign detail | P0 | 007,010 | repository/DOM tests |
| REQ-013 | Metrics state intended, eligible, excluded, materialized, pending, failed, retried, read, dismiss, ack denominators | P0 | 010 | exact aggregation fixtures |
| REQ-014 | Cancel/retract/replacement preserve evidence and converge user inbox visibility | P0 | 009,010 | race/reconciliation tests |
| REQ-015 | User-owned preference UI/actions, channel/surface defaults, quiet hours/deferred state, digest buckets/jobs, and mandatory overrides are complete and deterministic | P0 | 008,009,010 | action/DOM/scheduler/override tests |
| REQ-016 | Support adds assignment, priority/SLA, tags, notes, canned replies, escalation, attachment/email boundaries | P1 | 011 | support action/DO/retention tests |
| REQ-017 | Configuration registry is typed, audited, consumer-linked, and maintenance mode is enforced | P1 | 012 | flag consumer/mutation denial tests |
| REQ-018 | Audit/security operations use real immutable data, filters, sensitive-read audit, and durable actor history | P0 | 002,003,013 | repository/audit/erasure tests |
| REQ-019 | Operations exposes incidents, jobs/queue/DLQ, cron, errors, vitals, scheduler and hosted-proof readiness | P1 | 014 | local/hosted operational proof |
| REQ-020 | Product analytics covers activation, retention, collaboration, publication, estimate, AI, support, notifications | P1 | 014 | event-contract/aggregate tests |
| REQ-021 | Fragmented workshop operator tools are linked, migrated, shared, or explicitly deferred without duplicate mutations | P1 | 014 | inventory + route/action tests |

## UX and Accessibility Requirements

| ID | Requirement | Units | Proof |
| --- | --- | --- | --- |
| UX-001 | Dense scan-friendly admin IA with preserved routes and complete states | 005,007,010,014,015 | DOM + targeted browser |
| UX-002 | User 360 and campaign workflows are keyboard/focus/screen-reader operable | 005,007,010,015 | DOM/a11y + targeted browser |
| UX-003 | Wide-impact actions expose scope/count/reason and cannot be triggered accidentally | 003,006,007,010 | interaction tests |
| UX-004 | Responsive layouts avoid overlap and preserve access to controls from 360px to wide desktop | 015 | targeted browser/layout proof |
| UX-005 | Metrics/timelines/charts have semantic text equivalents and non-color status | 005,010,014,015 | DOM/a11y tests |

## Security and Privacy Requirements

| ID | Requirement | Units | Proof |
| --- | --- | --- | --- |
| SEC-001 | Deny-by-default exact capabilities on every route/action/read/export | 003,016 | role/capability denial matrix |
| SEC-002 | No raw token, OAuth secret, IP, UA, credential, or unrestricted payload reaches client/log/audit/export | 004,005,006,007,013 | static/runtime redaction scans |
| SEC-003 | High-risk actions require version-proven one-time fresh auth bound to actor/session/action, protected-account floor, reason, rate limit, idempotency, audit | 003,006,007,010 | adapter/action/replay tests |
| SEC-004 | User/activity/audience reads cannot leak cross-tenant or guessed-ID data | 005,008 | denial tests |
| SEC-005 | Notification content/rules/queue messages resist injection, tampering, replay, and abuse | 007,008,009 | fuzz/abuse/replay tests |
| SEC-006 | Admin/audit/user/notification/support data has retention, DSAR, erasure, anonymization, legal-hold contracts | 013 | lifecycle proof |

## Data Requirements

| ID | Requirement | Units | Proof |
| --- | --- | --- | --- |
| DATA-001 | Canonical auth identity/profile reconciliation and idempotent repair | 004 | mismatch/repair matrix |
| DATA-002 | Durable login, authenticated-use heartbeat, product-activity rollups with provenance | 004 | repository/rate-limit tests |
| DATA-003 | Normalized activity adapters retain source/scope/redaction/retention and cursor stability | 005 | adapter/cursor/partial tests |
| DATA-004 | Campaign/version/template/schedule-revision/occurrence/review/run/recipient/job/event/preference/digest schema enforces lifecycle integrity | 007,008,009 | migration/domain tests |
| DATA-005 | Existing definitions/deliveries remain inbox-compatible and legacy broadcasts import honestly | 002,007,010 | integration/backfill tests |
| DATA-006 | Migration lease, replay, indexes, orphan/invariant scans, fix-forward rollback are complete | 001,016 | migration receipts |

## Performance and Reliability Requirements

| ID | Requirement | Units | Proof |
| --- | --- | --- | --- |
| PERF-001 | Admin reads meet defined p95 budgets without N+1/page-wide failure | 005,014,015 | seeded benchmarks/query plans |
| PERF-002 | Publish acceptance is audience-size independent and fanout is bounded | 009,015 | scale/fault benchmark |
| PERF-003 | Scheduler/queue/retry/reconciliation meet lag and exactness budgets | 009,017 | local + hosted proof |
| PERF-004 | Admin-only code is bundle-isolated and responsive interactions remain stable | 015 | build/DOM/browser proof |

## Operations Requirements

| ID | Requirement | Units | Proof |
| --- | --- | --- | --- |
| OPS-001 | Typed kill switches allow safe staged rollout without hiding reconciliation/audit | 012,016 | flag/runbook tests |
| OPS-002 | Operator runbooks cover stall, partial fanout, wrong content, queue outage, suspect user, mismatch, audit failure | 016 | drill receipts |
| OPS-003 | Core hosted D1/Worker/Queue/Cron proof is source-matched and separate from local proof | 017 | hosted artifacts |
| OPS-004 | Optional Email/Access/GA4/Clarity/CF analytics slices remain disabled until credentialed hosted proof | 018 | provider artifacts/boundaries |
| OPS-005 | Final release/rollback/support/incident completion audit is independent and requirement-complete | 019 | verifier release receipt |

## Acceptance Criteria by Unit

`AC-001` through `AC-019` correspond one-to-one with `UNIT-001` through `UNIT-019`. Each criterion passes only when every requirement mapped to the unit has its specified evidence and no unclassified failure remains. Hosted units cannot pass from mocks/local evidence.

## Planning Completion Audit

| Objective item | Planning evidence | Verdict |
| --- | --- | --- |
| comprehensive `/admin` improvement | docs 01,04,09 and units 001–016 | covered |
| user activity history | doc 05 + Activity receipt in doc 13 | covered with semantic correction |
| signup and last use | docs 02/05 distinguish canonical milestones | covered |
| full notification manager | docs 06/07, units 007–010 | covered |
| sent notification history | docs 04/06, REQ-012 | covered |
| complete one-time and recurring scheduling | docs 06/07, REQ-010 | covered with occurrence, DST, series edit/cancel, and history contracts |
| whole-codebase tailored gaps | docs 03/09/13 and specialist evidence | covered |
| no coding during planning | target-scoped status/inventory and proof boundary show only this new plan folder was written by the planning lane | PASS |
| conditionally ready, validated pack | exact manifest hashes; one-unit ready slice; downstream packets; plan-pack/planning-suite validators; diff check; sequential architecture and critic repair loops | PASS |

Planning completion does not imply product implementation. The pack is honestly `CONDITIONALLY_READY`: UNIT-001 can execute now; downstream local units require its fresh overlap/lease receipts; hosted units retain authorization and provider boundaries.
