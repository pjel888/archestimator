# Notification Manager: Product and Operator Workflows

## Product Outcome

The admin must know what has been authored, approved, scheduled, sent, cancelled, expired, failed, or retracted; who was intended and eligible; how publication progressed; and how users engaged. The current one-shot broadcast form becomes a campaign management system while the existing user inbox remains backward-compatible.

## Campaign Lifecycle

Primary transitions:

`draft -> in_review -> approved -> scheduled -> publishing -> published`

Terminal/alternate transitions:

- `draft|in_review|approved|scheduled -> cancelled`;
- `scheduled -> approved` when unscheduled;
- `publishing -> paused|partially_published|failed|published` after a chunk boundary and exact progress write;
- `paused -> publishing|cancelled` only after a fresh capability check, expected-version match, and durable resume command;
- `partially_published -> publishing|failed|cancelled` through reconciliation or an operator-authorized retry that preserves the run and recipient snapshot;
- `failed -> publishing|cancelled` only through a new idempotent retry attempt on the same logical run and frozen audience;
- a due schedule that is discovered after its expiry becomes `expired` without publication; a late but still valid schedule records misfire/lag evidence before `publishing`;
- `published -> expired` by time policy;
- `published|expired -> retracted` through durable suppression;
- any editable content/audience/schedule change after approval creates a new version and returns to `draft` or `in_review`.

Campaign state describes operator intent; run state describes execution. Run states are `queued|claimed|running|paused|partial|retry_wait|reconciling|completed|failed|cancelled|expired`. No UI field edit may bypass transition validation. Every transition records actor, time, expected campaign/version/run identity, stable command idempotency key, reason, and audit/outbox state. Pause is cooperative at chunk boundaries, not an unsafe promise to interrupt an in-flight D1 transaction.

## Content Model

- typed kind, severity, surface, and channel;
- title/body bounds identical across UI, server validation, DTO, and D1 CHECK;
- safe internal action label/path;
- release version, priority, expiry, mandatory-policy classification;
- template origin and content version;
- preview fixtures for center, modal, and any proven toast surface;
- localization is deferred but schema must not make it impossible;
- no HTML unless a separately sanitized, tested renderer is approved.

## Authoring Workflow

1. Create draft or duplicate an existing campaign.
2. Compose content and select surface/channel policy.
3. Define audience using typed rules.
4. Preview eligible/excluded reach with freshness and exclusions.
5. Set schedule, IANA time zone, expiry, future-user policy, quiet-hours policy.
6. Preview exact UI and send to a bounded test audience.
7. Review validation, immutable diff from prior version, and risk summary.
8. Approve/publish according to capability policy.
9. Observe durable run/job progress.
10. Inspect sent history and engagement; cancel, retract, retry, reconcile, or supersede as allowed.

Compose, review, and publish are separate capabilities. Under DEC-AUTO-019, exactly one eligible operator may explicitly self-review only in recorded single-operator mode with fresh auth, a reach/risk summary, and a 60-second cancellable grace window. With two or more eligible reviewers, mandatory or wide campaigns require a different reviewer. The UI never self-labels an unreviewed draft as approved.

## Audience Rules

Supported v1 selectors:

- all active canonical users with healthy profile projection;
- explicit user IDs;
- signup range;
- last authenticated/product activity range;
- onboarding/closed-beta stage;
- platform role/account status;
- corporate account and corporate role;
- workspace membership/role;
- project/estimate membership/role;
- users with/without a prior campaign delivery or engagement;
- user notification preferences and mandatory override policy.

Rules are AND/OR only through a bounded, typed grammar; no raw SQL. Preview and publish share the exact evaluator revision. The campaign records intended rule, eligible/excluded counts, exclusion reasons, and whether recipients are snapshot or dynamic-at-run. Every logical run persists an authoritative recipient ledger, including excluded and failed-before-materialization recipients, so historical reach and reconciliation do not depend on reconstructing mutable source tables.

## Future-User Policy

Each campaign declares one:

- `snapshot_only`: only recipients frozen at publish;
- `eligible_until_expiry`: new users who become eligible before expiry may be materialized by reconciliation;
- `on_signup_until_expiry`: explicitly intended onboarding/release notice for new signups.

The default is `snapshot_only`. Retrying a failed run never silently expands a frozen audience.

`eligible_until_expiry` and `on_signup_until_expiry` do not mutate a completed run. They create append-only enrollment occurrences on a bounded scheduler sweep. Each occurrence has a campaign/policy-window identity, evaluator revision, high-water mark, frozen recipient delta, run/jobs, and unique `(campaign_id, policy_window_id, user_id)` guard. A retry can only revisit the frozen delta for its occurrence. Cancellation closes future enrollment before the next claim; retraction applies to every materialized occurrence; expiry closes enrollment and allows the campaign to become terminal. History and metrics show the initial occurrence, later enrollment occurrences, per-occurrence denominators, and campaign totals separately.

## Reconciliation-State Eligibility

Audience preview and publication use the canonical Better Auth user ID mapped to the inbox delivery key through one versioned identity adapter. Selector type never bypasses reconciliation policy:

| Reconciliation state | Preview | Materialize | Required reason/action |
| --- | --- | --- | --- |
| `matched` | eligible subject to rules/preferences | yes | none |
| `auth_user_missing_profile` | excluded | no | `profile_required`; repair before send |
| `profile_missing_auth_user` | excluded | no | `canonical_user_missing` |
| `email_mismatch` | excluded | no | `identity_mismatch`; repair before send |
| `duplicate_or_ambiguous` | excluded | no | `identity_ambiguous`; manual repair |
| `synthetic_runtime_profile_observed` | excluded | no | `synthetic_identity`; never target |
| `erased_or_tombstoned` | excluded | no | `privacy_tombstone` |

Explicit user IDs, imported lists, and cohort rules all apply this matrix. Preview retains aggregate exclusion reasons; the recipient ledger retains only the minimum repair/reconciliation evidence permitted by retention policy.

## Scheduling

- scheduling supports one-time and recurring campaigns; recurrence uses a bounded RFC 5545-compatible subset (daily, weekly, monthly-by-date/day, interval, selected weekdays, start, optional count/end) stored as a typed rule rather than free-form RRULE input;
- store UTC execution time, original IANA time zone, and entered local time;
- validate past times, DST gaps/ambiguity, expiry-before-start, and approval freshness;
- every recurrence produces an immutable logical occurrence with scheduled local/UTC time, rule revision, audience policy, status, and unique `(campaign_id, schedule_revision, occurrence_key)`; scheduler creates/claims an idempotent run and never performs unbounded fanout inline;
- editing a recurrence creates a new schedule revision and never rewrites completed occurrence history; the operator chooses whether already-created pending occurrences are cancelled or retained, and the choice is audited;
- pausing a recurring campaign prevents future occurrence claims without hiding completed history; cancelling can target one occurrence or the remaining series; retraction targets explicit occurrence(s) or all materialized occurrences with a scope preview;
- DST policy is explicit per schedule (`preserve_local_time` by default, or `preserve_utc_interval` where valid); gaps use a configured skip-or-next-valid rule and ambiguous times record the selected offset;
- display `next_attempt_at`, scheduler freshness, and stalled state;
- reschedule creates an auditable transition and invalidates stale approvals when policy requires it;
- cancellation wins through version/claim checks and prevents new chunks while preserving completed materialization.

## History and Search

Lists for All, Drafts, In Review, Scheduled, Publishing, Published, Failed, Cancelled, Expired, Retracted. Search by title, campaign ID, release version, creator, audience summary, and date. Detail page includes content version, state timeline, audience, schedule, runs/chunks, metrics, audit, failures, and replacements.

## Metrics Semantics

Required counts:

- intended;
- eligible;
- excluded by reason;
- materialized to inbox;
- pending;
- failed;
- retried;
- seen;
- read;
- dismissed;
- modal acknowledged;
- action clicked only after a safe click event exists.

Rates always state denominator. `materialized` is not called device delivery. `seen` requires a real display contract; current read/dismiss/ack writes do not prove passive display. Until instrumentation exists, show `read`, `dismissed`, and `acknowledged`, not invented impressions.

## Preferences and Mandatory Notices

Preferences may cover kind/channel, digest cadence, quiet hours/time zone, and non-mandatory opt-out. Security, legal, or critical operational notices can override preferences only through a documented policy with visible operator warning and user-facing classification. Transactional auth, invite, and publication emails remain outside campaigns unless a reviewed channel contract explicitly joins them.

The user-facing owner is `/settings/notifications`, backed by typed current-user reads/actions rather than admin mutation. Defaults are enabled in-app immediate delivery, no quiet hours, and no digest until the user opts in. Center-only materialization may occur during quiet hours without a toast/modal interruption; interruptive surfaces are deferred to `deliver_after`. Digest-enabled non-mandatory items enter a per-user/channel/time-zone bucket with a deadline, occurrence IDs, and idempotent digest job. Mandatory notices bypass opt-out, quiet hours, and digest only when their policy class and reason are recorded; the UI explains the override without exposing internal operator notes. DST, time-zone changes, disabled channels, expiry-before-delivery, digest failure/retry, and preference changes after audience approval have deterministic recipient reason/state transitions.

## Cancellation, Retraction, and Replacement

- cancelling a draft/scheduled campaign stops future runs;
- cancelling during publish stops unclaimed chunks and records partial completion;
- retracting sets durable suppression/tombstone state for materialized deliveries; it never deletes campaign/audit evidence;
- replacement creates a new campaign linked by `supersedes_campaign_id`;
- incorrect content uses retract + corrected replacement, with recipient messaging policy;
- reconciliation reports any recipient whose inbox state could not be updated.

## Operator Runbooks

1. Schedule a release notice.
2. Send an urgent security notice with mandatory-policy review.
3. Test a campaign to the operator only.
4. Cancel a scheduled campaign.
5. Pause a publishing campaign and reconcile partial fanout.
6. Retract incorrect content and publish a correction.
7. Investigate zero/low materialization.
8. Investigate high dismiss/low read.
9. Retry failed chunks without expanding the audience.
10. Prove what was sent during an incident or support request.

## Acceptance Summary

The manager is complete only when an operator can recover the full campaign history, scheduling and audience intent, durable publish progress, recipient materialization, engagement, failures, retries, cancellations/retractions, and audit evidence without querying D1 manually.
