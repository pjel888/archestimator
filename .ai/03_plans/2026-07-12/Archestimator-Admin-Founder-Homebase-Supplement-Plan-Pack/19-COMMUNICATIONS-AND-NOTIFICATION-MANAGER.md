# 19 — Communications and Notification Manager

## 1. Outcome

Replace the current immediate all-user broadcast form with a founder-safe manager for product updates, release announcements, maintenance, incident warnings and resolutions, security/account notices, targeted customer follow-up, and feedback requests.

The manager must answer before publish:

1. Why are we communicating?
2. Which exact revision will recipients receive?
3. Who is eligible, excluded, and targeted?
4. Which channel and in-app surface will be used?
5. When does it publish and expire?
6. What does each delivery status actually prove?
7. How can the communication be corrected, retracted, or superseded?

It is a focused founder control, not a marketing-automation suite.

## 2. Current foundation and repair boundary

The existing implementation already provides notification definitions, D1 inbox deliveries, active windows, per-user materialization uniqueness, seen/read/dismiss/archive/modal acknowledgement, and an all-active-user Admin broadcast action.

The implementation slice must reuse those foundations and repair these concrete gaps:

- composer title validation is `200` characters while `migrations/0009_notifications.sql` allows `120`;
- `release_version` exists in the action/schema but is not exposed in the composer;
- `starts_at`/`expires_at` are visibility windows, not a publish scheduler;
- definition, materialization, and audit writes are not one atomic command;
- current success copy can call D1 materialization “sent”;
- no draft/version/run lifecycle, frozen audience, issue reconciliation, or correction workflow exists;
- the current user-facing implementation is in-app only; email, push, and SMS are not implemented channels.

Do not rebuild existing dedupe, delivery-state, or inbox primitives.

## 3. Vocabulary and truth contract

| Term | Meaning |
|---|---|
| Communication | Founder intent, content, audience, channel policy, source context, and lifecycle. |
| Notification | A communication materialized into Archestimator's in-app notification system. |
| Revision | Immutable content, classification, action, surfaces, channel policy, and audience rule version. |
| Audience snapshot | Frozen intended, eligible, and excluded recipient set for one publish run. |
| Publish run | One accepted immediate or scheduled attempt for one revision and audience snapshot. |
| Materialized | The in-app delivery row exists; it does not prove display, read, acknowledgement, email acceptance, or inbox placement. |
| Provider accepted | An external provider accepted the request; it does not prove inbox placement or reading. |
| Seen / read / acknowledged | Separate user interactions with separate timestamps. |
| Mandatory notice | A narrowly classified legal, security, service-continuity, or account-access message that may override preferences with an audited reason. |

UI, server validation, schema constraints, analytics, and audit language use the same terms.

## 4. Source-linked entry points

Every source entry creates a draft; none auto-publishes.

| Source | Prefilled context | Default audience |
|---|---|---|
| Manual composer | message class and founder reason | none; founder must select |
| Release Center | release ID/version, change summary, known limitations, action link | affected cohort or explicitly selected active users |
| Incident / maintenance | incident ID, current status, impact, resolution/maintenance window | known affected users/accounts; otherwise deliberate all-active choice |
| Security/account action | event reference, required action, deadline | exact affected identities |
| User or Account 360 | user/account identity and context link | exact user/account |
| Signal / feedback close-loop | shipped/fixed change and source signal | linked reporters or explicit cohort |
| Support conversation | response context and customer promise | exact conversation user/account |

A source revision change after a draft is prepared marks the draft stale. Publishing requires refresh or an explicit audited decision to keep the current snapshot.

## 5. Message classes and channel policy

MVP classes:

- release/update announcement;
- planned maintenance;
- incident warning, update, and resolution;
- security or account action required;
- targeted customer follow-up;
- feedback/research request;
- general system notice.

Channel rules:

- **In-app center** is the implemented default channel and durable receipt surface.
- **Toast** is for timely, non-blocking awareness and expires.
- **Modal** is reserved for imperative, time-sensitive notices and requires an explicit acknowledgement contract.
- **Email** remains disabled until an authenticated provider, consent/unsubscribe rules, sender-domain health, idempotent provider request identity, delivery-event ingestion, and reconciliation are implemented.
- **Push and SMS** are out of scope until a separate measured need and consent/provider plan exist.
- Existing auth, invitation, support-reply, and client-portal transactional email flows remain owned by their domains; this manager does not absorb them.

Use polite accessible announcements by default. Assertive interruption or modal focus is allowed only for an imperative classification and must not trap keyboard or assistive-technology users.

## 6. Composer contract

Required or governed fields:

- internal name;
- message class;
- founder purpose/reason;
- source type and source ID;
- title, maximum `120` characters everywhere;
- body, maximum `2,000` characters everywhere;
- action label and allowlisted internal or approved external URL;
- release version when applicable;
- severity;
- in-app surface;
- enabled channels;
- mandatory-notice classification and justification;
- audience rule/revision;
- immediate or one future publish time;
- visibility start, expiry, and modal acknowledgement policy;
- template source and template revision when used.

Composer behavior:

- preview the exact notification-center, toast, modal, and enabled email rendering;
- show truncation, missing-action, unsafe-link, stale-source, and expiry conflicts inline;
- support “test to self” as a distinct non-production run;
- save drafts without materializing deliveries;
- lock an immutable revision when moved to ready;
- create a new revision for edits after ready, scheduled, or published.

## 7. Audience and safety

MVP audience selectors:

- explicit user;
- account/workspace members;
- explicit saved cohort from current product/customer data;
- activation/health cohort using allowlisted predicates;
- source-derived affected users/accounts;
- all active users as a deliberate high-impact selection.

Audience rules:

- resolve from canonical Better Auth identity through the current inbox recipient mapping;
- preview and publish use the same immutable revision and audience predicate;
- freeze intended, eligible, and excluded recipients before a publish run is accepted;
- record exclusion reason: inactive, missing channel address, preference, unsubscribe, hard bounce, spam complaint, duplicate/canonical mismatch, or policy;
- show exact counts and a reviewable sample before publish;
- use explicit AND/OR grouping and make negative-rule behavior visible;
- require a second high-impact confirmation for all-active, modal, or mandatory notices, including the frozen recipient count and founder reason;
- never silently broaden a source-derived audience when identity or source data is incomplete.

MVP audiences are fixed snapshots. Dynamic future enrollment and recurring audiences belong to the conditional advanced slice.

## 8. Lifecycle and scheduling

Communication lifecycle:

```text
draft
→ ready
→ scheduled | publishing
→ published | partial | failed | cancelled
→ expired | retracted | superseded
```

Rules:

- ready freezes an immutable revision;
- scheduled means a one-time UTC publish instant with stored IANA/local intent;
- cancel is allowed before publish and preserves evidence;
- scheduled execution uses a periodic due-work sweep, not one Cron trigger per communication;
- a missed schedule uses an explicit misfire policy: publish within bounded grace or mark failed/needs decision;
- `starts_at` and `expires_at` continue to control recipient visibility, not dispatch;
- no recurrence, series editing, quiet-hour engine, or digest orchestration in MVP.

## 9. Publish and delivery architecture

The authoritative D1 command atomically records:

1. immutable revision;
2. frozen audience snapshot and denominator counts;
3. publish run with stable idempotency key;
4. audit event;
5. bounded in-app materialization or outbox work.

For the current founder-scale in-app channel, bounded synchronous materialization is acceptable when the implementation proves limits and atomic recovery. A new Queue binding is not required to ship the MVP.

If a Queue becomes necessary later:

- D1 remains authoritative and the Queue is wake-up/transport only;
- delivery is assumed at-least-once, so every command, run, recipient, and provider attempt is idempotent;
- partial batch acknowledgement avoids retrying successful recipients;
- retry exhaustion routes to an existing suitable DLQ only when ownership and monitoring are explicit, otherwise to durable D1 issue state;
- replay is bounded and preserves attempt history;
- periodic reconciliation detects accepted-but-unmaterialized, stuck, missing, and contradictory states.

Publish returns the accepted run identity and frozen counts. It never returns “sent to N users” unless the displayed denominator is explicitly named.

## 10. Denominators and status model

Every run detail reports separately:

- intended;
- eligible;
- excluded by reason;
- materialized;
- pending;
- provider accepted;
- provider rejected;
- failed;
- retried;
- reconciled;
- seen;
- read;
- dismissed;
- acknowledged.

Rates name their denominator and as-of time. Unknown, unavailable, and not instrumented never render as zero.

## 11. Retraction, correction, and replacement

- Retraction prevents future display/delivery where the channel supports it and records what could not be recalled.
- Replacement creates a new revision/run linked to the superseded communication.
- Correction is a replacement explicitly marked as correcting prior content.
- Published content, audience snapshots, provider attempts, and audit evidence are append-only; retraction never deletes proof.
- In-app recipients converge through the current inbox state without erasing read/acknowledgement history.

## 12. Manager information architecture

`/admin/notifications` becomes **Notification Manager** with tabs or saved views:

- Drafts;
- Scheduled;
- Published;
- Issues;
- Templates;
- All history.

List rows show class, title, source, audience, channels/surfaces, state, scheduled/published time, materialized/failed counts, author, and last revision.

Run detail shows the frozen revision, audience rule and snapshot, denominator funnel, per-recipient issue list, retries/reconciliation, source context, audit timeline, and retract/replace actions.

Templates are governed starting points, not mutable shared content. A communication stores the template revision it copied.

## 13. Preferences, consent, and deliverability

- Store per-user preference by communication class and channel when that channel exists.
- Preserve unsubscribe, hard-bounce, spam-complaint, and provider-suppression facts as explicit exclusions.
- Mandatory-notice override is narrow, reasoned, auditable, and unavailable for product marketing or research.
- If email is enabled, show SPF, DKIM, DMARC, TLS/DNS readiness, sender identity, provider connection/readability/freshness, bounce/complaint rate, unsubscribe handling, and reconciliation status.
- Provider acceptance, delivery event, inbox placement, open, and click remain different claims.
- Grow external send volume gradually and stop/limit on authentication, reputation, or complaint thresholds.

## 14. Cross-domain operating loops

- Release readiness includes a communication draft/status but never blocks a technical hotfix on marketing copy; customer-impacting changes require an explicit communicate-or-waive decision.
- Incident and maintenance detail can create status-specific drafts while the founder chooses whether to notify.
- User/Account 360 opens a pre-targeted draft and returns to the entity after publish.
- Feedback close-loop creates a targeted shipped/fixed draft linked to the release and source signal.
- Failed, partial, stuck, overdue scheduled, stale-source, reconciliation, and required-correction states project into the Action Inbox.
- Resolving an Action Inbox projection requires the canonical notification-domain state to be resolved.

## 15. Metrics and founder monitoring

Operational metrics:

- draft-to-publish time;
- scheduled-on-time rate;
- publish partial/failure rate;
- stuck/reconciliation issue age;
- duplicate prevention/retry count;
- provider rejection, hard-bounce, complaint, and unsubscribe rate when email exists.

Product metrics:

- eligible, materialized, seen, read, acknowledged, dismissed, and action-click counts with exact denominators;
- release/incident communications linked to the originating source;
- response or follow-up outcome for targeted customer messages.

Metrics are decision aids, not success theater. Opens/clicks do not prove comprehension or customer value.

## 16. Security, privacy, and audit

- Exact Admin capability is required to draft, publish, retract, replace, or classify a notice as mandatory.
- High-impact publish requires fresh auth, frozen revision/audience, exact counts, founder reason, idempotency key, and audit.
- Recipient exports, raw provider payloads, email addresses, and security notice details are minimized and access-audited.
- Preview/test runs cannot reach production audiences.
- Action URLs are allowlisted and rendered safely.
- Audit captures actor, command, reason, source, revision, audience hash/counts, run, result, affected rows, provider attempt identity, and correction/retraction lineage.

## 17. Acceptance and stop condition

UNIT-010 is accepted only when:

- a source-linked or manual draft can be created without sending;
- UI, server, and schema validation agree, including the `120`-character title limit;
- founder can preview exact rendering and a frozen eligible/excluded audience;
- immediate and one future publish are duplicate-safe and truthfully named;
- all-active, modal, and mandatory sends have explicit high-impact confirmation;
- in-app run detail separates materialized, seen, read, dismissed, and acknowledged;
- failures/partial/stuck states are actionable and reconciliable;
- cancel, retract, correct, and replace preserve evidence;
- User/Account 360, releases, incidents/maintenance, support/signals, and Action Inbox use source-linked drafts rather than parallel send paths;
- email remains visibly unavailable until its provider, consent, authentication, suppression, event, and reconciliation contract is implemented;
- no recurring-campaign, generalized queue, multichannel journey, or multi-operator approval platform is introduced.

Stop when one founder can safely compose, target, publish, observe, and correct one-time communications with truthful evidence. Move recurrence, dynamic enrollment, digests, journeys, push/SMS, and team approvals to UNIT-011 only after measured demand.

## 18. Research basis

This contract adapts:

- Cloudflare Queues at-least-once delivery, batching/retry, acknowledgement, and DLQ boundaries;
- Cloudflare Cron UTC scheduling and propagation behavior;
- Intercom fixed-versus-dynamic audiences, audience preview, exclusions, and message scheduling patterns;
- Atlassian Statuspage incident/maintenance templates, affected-component targeting, explicit send-notification choice, and subscriber preferences;
- Gmail sender authentication, unsubscribe, complaint/reputation, and gradual-volume guidance;
- WAI-ARIA guidance to prefer polite live announcements and reserve assertive interruption for imperative messages.

See `16-INDUSTRY-RESEARCH-AND-BENCHMARKS.md` and `18-SOURCE-REGISTRY.md` for the source links and adaptation boundaries.
