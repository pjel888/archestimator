# Research and Specialist Evidence

## Research Method

The planning research used current repository source/tests first, then official primary documentation for version-sensitive auth, queue, and security behavior. External facts are implementation inputs, not authority over repository policy.

## Official Sources

### Better Auth Admin Plugin

Source: <https://better-auth.com/docs/plugins/admin>

Current official capabilities include list/get users, roles, ban/unban, list/revoke sessions, revoke all sessions, impersonation, and custom access control. The plugin adds ban and impersonation schema fields. Plan impact:

- evaluate supported session revocation/admin APIs before writing custom Better Auth table mutations;
- do not adopt plugin roles wholesale because Archestimator has `ceo|admin|member`, a separate profile projection, closed-beta gating, and custom account status;
- impersonation remains out of scope unless separately threat-modeled and explicitly requested.

### Better Auth Session Security

Sources: <https://better-auth.com/docs/reference/security> and <https://better-auth.com/docs/concepts/session-management>

Sessions are stored and renewable; revocation is supported. Plan impact: session existence/update is not durable product activity; successful-login and authenticated-use facts require explicit semantics, and status interventions should revoke relevant sessions through supported APIs.

### Cloudflare Queues

Sources:

- <https://developers.cloudflare.com/queues/>
- <https://developers.cloudflare.com/queues/configuration/batching-retries/>
- <https://developers.cloudflare.com/queues/reference/how-queues-works/>
- <https://developers.cloudflare.com/queues/platform/pricing/>

Queues provide batching, retry, delay, DLQ, and at-least-once-style duplicate/out-of-order realities; batch failure can retry multiple messages unless individually acknowledged. Operations count per message and retries add cost. Plan impact:

- D1 job state and idempotency remain authoritative;
- consumer tolerates duplicates/out-of-order messages;
- individual acknowledgements, bounded retries, DLQ/reconciliation, and cost budgets are required;
- a queue is dispatch, not the sole arbitrary-future campaign scheduler.

### OWASP Authorization

Source: <https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html>

OWASP recommends least privilege, deny by default, validation on every request, logging, and tests. Plan impact: exact admin capabilities, per-action server checks, protected privileged accounts, and denial matrix.

### OWASP Logging

Source: <https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html>

OWASP distinguishes audit/security/transaction logs, recommends sanitization and restricted access, and warns against recording tokens/secrets/sensitive personal data. Plan impact: separate operator/domain/operational facts, redacted structured audit, sensitive-read logging, access/retention controls, and no raw session/IP/UA/token values.

## Specialist Audit: Admin Surface

Independent read-only exploration identified the route/repository/migration/test inventory; confirmed searched-user binding, affected-row, privileged-target, fake-audit, notification validation/atomicity, maintenance, placeholder API, activity semantics, and overview gaps; and found 24/26 focused admin tests passing with two classified failures.

## Specialist Audit: Identity and Activity

Independent read-only exploration established:

- Better Auth user/profile/onboarding separation;
- canonical signup and incorrect current labels;
- session update is not last use;
- incomplete successful-login evidence;
- User 360 activity currently equals admin-actor events only;
- available product sources and differing retention/deletion semantics;
- status/session/audit risks;
- notification audience omission when auth user lacks profile.

Focused evidence: 13 passes, one known searched-user failure.

## Specialist Audit: Notifications and Overlaps

Independent read-only exploration established:

- current inbox and release-modal behavior;
- current immediate all-profile broadcast;
- likely invalid delivery ID integration;
- non-atomic and non-idempotent fanout;
- validation/schema drift;
- starts/expiry and toast semantic gaps;
- absence of campaigns, history, schedule, targeting, metrics, preferences, cancel/retract, jobs/retry;
- upload-only queue boundary;
- Activity, Beta, Corporate, Teamwork, observability ownership.

Focused notification suites passed 30 tests; admin broadcast lacked focused integration coverage.

## Research Decisions Changed

- use supported Better Auth session revocation where compatible rather than direct token-table deletion;
- represent publish as durable command/job, not synchronous request;
- retain D1 idempotency/reconciliation because Queue retries may duplicate/out-of-order;
- explicitly budget operations/retries under free-tier posture;
- separate audit/security logs from product activity and protect sensitive log access;
- use capability/relationship checks rather than broad role-only admin access.

## Not Proven / Deferred

- exact hosted Queue/Cron/D1 limits and current account usage at implementation time;
- whether a dedicated queue or generalized jobs queue is operationally best;
- whether DO alarms outperform Cron sweep for required precision;
- provider credentials/configuration for GA4, Clarity, Access, Email Routing;
- legal approval of retention/consent periods;
- hosted delivery, analytics, alert, or production behavior.

These remain implementation/release evidence items, not planning omissions.
