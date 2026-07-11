# Notification Data, Dispatch, and Scheduling

## Architectural Decision

Keep the user inbox contract (`notification_definitions` + `notification_deliveries`) stable and add an admin control-plane layer. Drafts and campaign lifecycle must not be represented as active definitions visible to inbox readers.

## Additive Data Model

Names are conceptual; final migration names/numbers follow the migration lease.

### `notification_campaigns`

- id, status, current_version, optimistic_lock_version;
- created/updated/reviewed/approved/published/cancelled/retracted actors and times;
- scheduled_for_utc, schedule_timezone, schedule_local_time, expires_at;
- future_user_policy, preference_policy, mandatory_reason;
- current audience rule revision and summary;
- latest run id, supersedes/superseded_by campaign id;
- created_at, updated_at.

### `notification_campaign_versions`

- campaign id + version composite key;
- typed kind/severity/surface/channel;
- title/body/action/release/priority/content payload;
- audience rule JSON + evaluator revision;
- schedule/expiry snapshot;
- immutable content/audience hash;
- created_by, created_at, review status.

### `notification_campaign_reviews`

Reviewer, verdict, campaign/version hash, validation summary, note, time. A changed hash invalidates approval.

### `notification_campaign_runs`

- idempotency key unique on campaign/version/logical schedule;
- status `queued|claimed|running|paused|partial|retry_wait|reconciling|completed|failed|cancelled|expired`;
- frozen rule revision/audience mode/counts;
- expected/claimed/materialized/excluded/failed/retried counts;
- started/completed/next-retry timestamps, lease owner/expiry, error class;
- definition id emitted on successful publish contract.

### `notification_campaign_recipients` authoritative ledger

Campaign run + canonical user id or privacy-preserving tombstone, eligibility status/reason, evaluator/source revision, chunk, materialization status, delivery id, attempt count, and timestamps. This ledger is mandatory for every logical run, including excluded and failed-before-materialization candidates; mutable source tables and inbox deliveries are not authoritative historical audience evidence. At larger scale, physical partitioning, compact reason codes, bounded retention, and post-retention anonymization may reduce cost, but an implementation may not replace the ledger with unreconstructable checkpoints. Legal hold preserves required evidence without retaining unnecessary recipient attributes.

### `notification_campaign_jobs` / outbox

Durable job kind, campaign/run/chunk, payload revision/hash, status, attempts, available/claimed/finished times, error class, idempotency key. The queue message is a wake-up pointer; D1 remains authoritative job state.

### `notification_campaign_events`

Immutable redacted lifecycle/audit facts. Keep operator audit and campaign state history linked but separately queryable.

### `notification_preferences`

User, kind/channel, enabled, quiet-hours/time zone, digest cadence, updated source/time. Mandatory override policy is not represented by silently rewriting preferences.

## Existing Tables

- published immutable content materializes into `notification_definitions` with stable campaign/version references in payload or additive columns;
- per-user inbox state remains in `notification_deliveries`;
- add retracted/suppressed semantics through additive status/timestamp rather than deleting rows;
- fix UUID generation and ensure all action paths accept produced IDs;
- indexes cover feed eligibility, campaign status/schedule, jobs due/lease, run progress, recipient reconciliation, and campaign/user engagement.

## Publish Transaction

One logical publish command validates expected campaign version/status/approval, freezes audience semantics, creates a unique run, emits definition content, and writes outbox/job state atomically or through a D1 transaction primitive with a verifiable equivalent. Queue publication occurs after commit; an outbox sweeper retries lost wake-ups.

The command returns accepted run identity, not a misleading sent count.

## Queue and Worker Contract

Current `UPLOAD_JOBS_QUEUE` is upload-specific. The default v1 topology is a dedicated notification queue, DLQ, binding, and consumer so upload retry/backpressure/ownership remain isolated. The implementation checkpoint verifies free-tier operations, binding limits, queue naming, deployment order, disabled-consumer rollback, and local fallback before creating resources. A generalized job queue is rejected unless that checkpoint proves a shared typed envelope, per-kind concurrency/retry/DLQ/metrics, a migration plan, and no upload regression; adopting it requires a recorded replacement decision. Do not inject campaign messages into upload payloads. Queue messages contain only job IDs/revisions, no recipient PII or content secrets.

Consumer behavior:

- claim D1 job lease;
- load frozen campaign/run/chunk;
- revalidate cancellation/version;
- materialize bounded deliveries idempotently;
- update exact progress and acknowledge successful messages individually;
- retry only recoverable failures with bounded backoff;
- record permanent failures and DLQ/reconciliation state;
- tolerate duplicate/out-of-order delivery.

## Scheduler Options

### Preferred

A small periodic Cron sweeper claims due campaigns and creates publish runs; queue performs fanout. This supports arbitrary future schedules and restart recovery. Frequency and daily operation cost must fit the free-tier posture.

V1 has one logical scheduled occurrence per campaign. The idempotency tuple retains `logical schedule` terminology so a later recurrence design can add occurrence identity without corrupting existing run history; no recurrence UI or implicit repeat behavior ships in this plan.

### Alternative

A dedicated Durable Object alarm per campaign/shard can schedule precise wake-ups but adds binding/state/operational complexity. Use only if Cron latency or scale requirements justify it.

### Rejected

- browser timers;
- request-time delayed promises;
- relying on `starts_at` alone while eagerly materializing all recipients;
- Cloudflare Queue delay as the sole arbitrary-future scheduler without proving its delay limits and rescheduling behavior;
- existing 3am crons for minute/hour scheduling.

## Idempotency and Concurrency

- stable command idempotency keys from campaign/version/logical occurrence;
- unique delivery `(notification_id,user_id)` remains final duplicate guard;
- optimistic campaign version on every edit/transition;
- run and job leases with expiry/steal rules;
- cancel/retract flags rechecked before every chunk;
- retries preserve frozen audience;
- reconciliation compares intended eligible set, recipient/checkpoint state, and actual deliveries;
- pause, resume, retry, and reconcile commands use expected run state/version plus stable idempotency keys; workers re-read state before every chunk;
- scheduler misfires distinguish late-valid from expired-before-start and never silently publish an expired campaign;
- audit/event sequence is append-only and ordered by stable `(created_at,id)`.

## Failure Model

Test crashes after campaign transition, run insert, definition insert, outbox insert, queue send, job claim, partial chunk, delivery insert, progress update, audit insert, cancellation, retraction, and final completion. Every crash has a deterministic recovery action and no false-success terminal state.

## Retention

Campaign definitions/audit/run aggregates may outlive individual recipient PII. Recipient/user identifiers require retention, erasure/anonymization, and legal-hold policy. Aggregate metrics must not permit re-identification. Retraction and cancellation evidence are retained according to audit policy.

## Migration and Rollback

- additive migrations first;
- dual-read/write compatibility only where required and time-bounded;
- backfill existing admin broadcasts into campaign history as `legacy_published` with honest missing schedule/audience/audit fields;
- do not rewrite active `0009` migration;
- rollback via feature flags/consumer disable and forward-fix migration; never drop delivery/audit evidence during incident rollback.

Local implementation may author schemas, queue adapters, `wrangler.jsonc` proposal, tests, and local-emulation configuration. Creating a new hosted notification Queue/DLQ or binding it to the deployed Worker is not covered by the standing authority for already-bound resources and remains `AUTH-005`/UNIT-017 work.
