# Test, Adversarial QA, and Evidence Plan

## Evidence Classes

1. Static/source contract.
2. Unit/domain state machine.
3. Repository/D1 fixture and migration replay.
4. Server Action/route authorization and failure behavior.
5. DOM/accessibility interaction.
6. Local HTTP/runtime with dev-auth and local D1.
7. Hosted bound-resource proof.
8. Production operator/manual evidence.

Use the smallest class that proves the claim. Do not substitute a lower class for a provider/runtime claim.

## Foundation Tests

- searched/unsearched user bind order, deterministic pagination, filters;
- affected-row proof and stale expected state;
- fake audit removal and repository pagination;
- notification bounds/enums/safe path/UUID contract;
- broadcast crash residue and idempotency characterization;
- identity reconciliation mismatch matrix;
- migration clean replay and index/query-plan assertions.

## User 360 Tests

- canonical signup versus profile provision;
- successful login retained after session deletion/expiry;
- heartbeat rate limit and failure non-interference;
- last product activity from each adapter;
- ordinary user activity is not admin-audit-only;
- partial/unavailable source labeling;
- cursor stability under same timestamps and concurrent inserts;
- cross-workspace/corporate/project denial;
- raw payload/token/IP/UA redaction;
- retention, anonymization, deletion, legal hold, DSAR export;
- protected admin/self/peer/last-admin intervention denials;
- session revoke one/all and status agreement;
- nonexistent target and audit failure never report success.

## Notification Lifecycle Tests

For every allowed and denied transition, assert expected version, actor capability, audit/event, and resulting state. Include concurrent editors, stale approvals, edit-after-approval, schedule/reschedule/cancel, publish/retract, and supersession.

## Audience Tests

- all active canonical identities including missing-profile policy;
- explicit users and invalid IDs;
- signup/use/onboarding/beta cohorts;
- corporate/workspace/project roles;
- suspended/banned/erased/deleted exclusion;
- preferences, quiet hours, mandatory override;
- preview/publish evaluator revision parity;
- snapshot versus future-user policy;
- cross-tenant and complexity/injection denial;
- audience changes between preview, approval, schedule, and run.

## Dispatch Fault Matrix

Inject failure after each durable step:

1. campaign version validation;
2. approval check;
3. run insert;
4. definition insert;
5. outbox/job insert;
6. transaction commit;
7. queue send;
8. job claim;
9. partial recipient chunk;
10. delivery insert;
11. progress update;
12. audit/event insert;
13. cancel/retract observation;
14. final status update.

After recovery, prove exact intended/eligible/materialized/failed counts, no duplicate delivery, frozen audience, and correct terminal/nonterminal state.

## Scheduling Tests

- past/near-future/far-future schedule;
- IANA zone and DST gap/ambiguity;
- scheduler duplicate invocation;
- scheduler downtime/backlog recovery;
- cancel just before/after claim;
- edit/reschedule invalidates approval as specified;
- expiry before/during/after run;
- clock skew and stale lease recovery.

## Metrics Tests

- exact denominators for materialized/read/dismiss/ack;
- no `seen` claim until real display instrumentation exists;
- action click via safe internal path only;
- legacy campaign missing data labeled unavailable;
- retraction/cancellation effects do not rewrite historical counts;
- aggregate query freshness and partial failure.

## Security and Abuse Tests

- direct action/route invocation by every role/capability;
- CSRF/origin and rate limits;
- notification content/link injection and Unicode/control characters;
- audience rule complexity and ID enumeration;
- bulk publish/revoke abuse;
- raw secret/personal-data scan;
- audit/log injection;
- queue replay/tampering/out-of-order;
- export limits and access audit;
- break-glass account safeguards.

## UX and Accessibility Tests

- keyboard navigation and focus restoration;
- form error summary/field association;
- publish confirmation cannot trigger accidentally;
- stale editor conflict;
- progress persistence and live-region restraint;
- table semantics/sort/filter/pagination;
- charts have text equivalents;
- responsive 360px through wide desktop without control/text overlap;
- loading/empty/unavailable/partial/error/retry states.

## Operations Tests

- maintenance enforcement across mutation boundaries;
- support assignment/SLA/reply failure/realtime duplication;
- incident/cron/ops/client error/vital query behavior;
- queue/DLQ/scheduler freshness and alerts;
- local observability gates;
- hosted provider proof commands only when credentials/authority exist.

## Validation Sequence

1. targeted red/green tests per unit;
2. touched-file type/LSP/lint/static checks;
3. D1 migration/repository tests;
4. focused admin/notifications/auth/support/activity suites;
5. `bun run validate:error-handling` for server/ops changes;
6. `bun run type-check` and broader `bun run validate` when shared/auth/data blast radius warrants it;
7. local route/auth smoke;
8. targeted browser proof only for browser-only claims;
9. hosted queue/cron/D1/Worker proof;
10. optional provider/email/access/analytics proof;
11. independent verifier completion audit.

## No-False-Green Rule

A campaign list screenshot does not prove scheduling, fanout, or metrics. A delivery row does not prove device display. A passing local queue mock does not prove hosted retries/DLQ. A user timeline with rows does not prove identity, scope, redaction, or completeness. Every completion claim names its matching evidence class.
