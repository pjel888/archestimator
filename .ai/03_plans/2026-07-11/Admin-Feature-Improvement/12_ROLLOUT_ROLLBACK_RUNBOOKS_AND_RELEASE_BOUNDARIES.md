# Rollout, Rollback, Runbooks, and Release Boundaries

## Rollout Principles

- correctness repairs precede feature expansion;
- schema before writers, writers before readers, readers before UI exposure;
- manager read/history may ship before compose/publish;
- draft authoring may ship before scheduling/fanout;
- publishing remains behind independent kill switches;
- wide audiences require proven chunking/reconciliation;
- hosted proof and release readiness remain separate from local implementation.

## Feature Gates

Conceptual gates, registered in the typed configuration system:

- `admin_user_360_enabled`;
- `admin_user_interventions_enabled`;
- `admin_notification_manager_enabled`;
- `admin_notification_publish_enabled`;
- `admin_notification_scheduler_enabled`;
- `admin_notification_consumer_enabled`;
- `admin_notification_retraction_enabled`;
- `admin_notification_email_channel_enabled`;
- `admin_support_operations_v2_enabled`;
- `admin_operations_v2_enabled`.

Kill switches may stop new work but may not hide in-progress/failed work or disable reconciliation/audit.

## Rollout Stages

1. **Foundation repair:** existing routes only; no new schema-dependent UI claims.
2. **Read-only User 360:** identity/milestones/source labels; no interventions.
3. **Safe interventions:** bounded operator-only canary.
4. **Notification history/import:** legacy broadcasts visible, no publishing.
5. **Draft/preview/test:** operator-only test audience.
6. **Scheduled small-cohort publish:** hard audience cap and manual observation.
7. **All-user in-app publish:** after failure/retry/reconciliation proof.
8. **Preferences/retraction/metrics:** after semantic proof.
9. **Support/operations/analytics consolidation.**
10. **Optional email/provider slices:** separately enabled and hosted-proved.

## Rollback Strategy

- disable compose/publish/scheduler/consumer independently;
- stop claiming new jobs while allowing claimed jobs to reach a known state;
- reconcile partial runs; do not delete definitions/deliveries/audit;
- retract incorrect user-visible campaigns, then publish a replacement;
- revert readers to legacy notification inbox behavior through compatible schema;
- roll forward D1 fixes; never edit applied migration files;
- preserve campaign/job/audit evidence through rollback;
- account action rollback is a new idempotent transition, not direct row repair;
- maintenance rollback restores mutation access through the audited break-glass path.

## Operator Runbooks

### Stalled Scheduled Campaign

Check scheduler freshness, due campaign state, run/outbox/job presence, queue binding, lease expiry, retry/DLQ, cancellation/version. Claim or reconcile through supported commands; never manually insert deliveries without a recorded run.

### Partial Fanout

Freeze new claims, inspect intended/eligible/materialized counts and failed chunks, verify frozen audience hash, repair cause, retry idempotently, run reconciliation, and record incident/campaign evidence.

### Incorrect Notification

Pause/cancel remaining jobs, assess materialized scope, retract with reason, issue corrected replacement when needed, verify inbox suppression and campaign history, notify support/incident owners.

### Scheduler or Queue Outage

Disable new schedules if backlog threatens cost/latency, preserve due state, restore binding/consumer, process with bounded concurrency, monitor retries/DLQ, and confirm no audience expansion.

### Suspect Account

Open User 360, review identity/security/session/activity provenance, record case reason, suspend or revoke sessions under capability policy, verify affected rows and current access denial, send approved security notice, and preserve audit.

### Identity/Profile Mismatch

Classify mismatch, verify canonical identity and current authorization status, run idempotent repair or tombstone action, re-read User 360 and notification eligibility, and record evidence.

### Audit Persistence Failure

Fail closed for high-risk commands where possible. If a business mutation committed before audit, create a reconciliation incident, reconstruct from command/outbox state, persist a marked recovery event, and verify no hidden successful action remains.

## Hosted Proof Units

### Required Core Hosted Proof

- source-matched Worker version/deployment;
- D1 migrations applied/readable;
- scheduler creates exactly one logical run;
- Queue retry/DLQ behavior and reconciliation;
- cancellation/retraction during live processing;
- notification inbox materialization/engagement;
- account action/session revocation against Better Auth D1;
- operator routes/auth denial;
- production incident/alert/support monitoring, named ownership, and escalation readiness.

### Optional Hosted Proof

- Cloudflare Email campaign channel;
- email-to-ticket;
- Cloudflare Access;
- Cloudflare/GA4/Clarity reads;

Unavailable optional proof leaves that slice disabled/boundary-marked; it does not block core in-app manager readiness.

Before final cutover, each optional slice receives an applicability record: `enabled_and_required`, `disabled_not_applicable`, or `blocked_required`. The record names owner, configuration/credential presence without values, requirement IDs, evidence artifact, and re-evaluation trigger. `disabled_not_applicable` is a valid local/core release outcome only when the feature flag and user/operator claims are disabled and a verifier records `N/A`; `blocked_required` blocks release. Optional providers are assessed independently, so one missing integration cannot obscure the status of another. Incident, alert, support-monitoring, and named-ownership proof is never optional for production cutover.

### New Notification Queue Provisioning Boundary

Local code, migrations, queue adapters, tests, and a proposed binding remain achievable. Creating the new hosted notification Queue/DLQ, binding it to the deployed Worker, or changing production routing requires `AUTH-005`: explicit owner authorization because these resources are not currently among the bindings named in `wrangler.jsonc`. The unblock packet records proposed names, free-tier/cost calculation, account/resource boundary, deployment/rollback order, DLQ retention, and post-provision smoke evidence without secret values.

## Release Gate

Production release requires fresh source/baseline/manifest receipts, complete local evidence, applicable hosted proof, free-tier/cost review, migration/rollback rehearsal, support/incident runbooks, observability readiness, no critical unresolved risk, and a requirement-by-requirement verifier audit. Implementation complete alone does not mean release ready.
