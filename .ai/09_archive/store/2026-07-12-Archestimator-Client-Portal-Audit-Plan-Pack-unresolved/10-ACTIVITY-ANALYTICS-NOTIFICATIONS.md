# 10 — Activity, Analytics, and Notifications

## 1. Separate three ledgers

The current product uses related event tables for activity and telemetry. The portal should make the distinction explicit.

### Audit events

Append-only, attributable business/security facts used for accountability:

- portal created;
- access policy changed;
- issue published/withdrawn/superseded;
- recipient invited/revoked/role changed;
- thread/message moderated;
- decision submitted/voided;
- link rotated;
- data exported.

### Client-safe activity

A policy-filtered collaboration timeline that an owner may expose to recipients.

### Product analytics

Privacy-governed engagement measurement:

- delivered;
- verified view;
- section view;
- meaningful interaction;
- print/download;
- comment;
- decision.

Analytics is not the legal/audit record.

## 2. Canonical recipient funnel

```text
Portal draft created
  → Issue issued
  → Recipient invited
  → Delivery sent
  → Delivered
  → Identity verified
  → Viewed
  → Engaged
  → Commented
  → Action required
  → Decided
```

Definitions:

- **Viewed:** first verified, non-bot view of an issue by recipient.
- **Anonymous view:** valid portal view without verified recipient identity.
- **Engaged:** comment/reply, meaningful section interaction, print/download, or formal response.
- **Action required:** unresolved thread waiting on owner, revision request, failed delivery, expiring access, stale draft, or no required decision after threshold.
- **Decided:** valid current-issue formal response.

Counts are issue-aware and recipient-aware. Do not collapse every browser render into “open count.”

## 3. Recipient matrix

| Recipient | Role | Delivery | Verified | First/last view | Sections viewed | Open threads | Decision | Next action |
|---|---|---|---|---|---|---|---|---|

Use this as the primary follow-up surface.

Recommended next-action states:

- send invitation;
- fix delivery;
- verify access;
- no view;
- remind;
- reply;
- resolve;
- republish requested changes;
- decision pending;
- follow-up complete;
- no action.

## 4. Event taxonomy

### Portal/issue

- `portal_created`
- `portal_configuration_changed`
- `portal_access_changed`
- `portal_url_rotated`
- `portal_access_revoked`
- `issue_published`
- `issue_superseded`
- `issue_withdrawn`
- `issue_viewed`

### Recipient/delivery

- `recipient_invited`
- `recipient_role_changed`
- `recipient_revoked`
- `recipient_verified`
- `invitation_sent`
- `invitation_delivered`
- `invitation_bounced`
- `reminder_sent`
- `recipient_unsubscribed`

### Engagement

- `section_viewed`
- `target_selected`
- `print_started`
- `download_completed`
- `thread_created`
- `message_created`
- `thread_resolved`
- `thread_reopened`

### Decision

- `decision_requested`
- `decision_submitted`
- `decision_voided`
- `decision_rule_satisfied`

### Security/operations — owner only

- `password_attempt_succeeded`
- `password_attempt_failed`
- `rate_limited`
- `authorization_denied`
- `snapshot_generation_failed`
- `notification_failed`

Do not expose security/operations events to the client activity projection.

## 5. Event envelope

```ts
type PortalEvent = {
  id: string;
  schemaVersion: number;
  eventType: string;
  occurredAt: string;
  requestId?: string;
  idempotencyKey?: string;
  workspaceId: string;
  projectId?: string;
  portalId: string;
  issueId?: string;
  sectionKey?: string;
  recipientId?: string;
  actorType: "internal_user" | "recipient" | "anonymous" | "system";
  actorId?: string;
  targetKind?: string;
  targetId?: string;
  visibility: "owner" | "client_safe" | "security";
  metadata: Record<string, unknown>;
};
```

Raw tokens, passwords, raw IPs, raw user-agent strings, private storage keys, message bodies, and hidden row values are not general event metadata.

## 6. Client-safe Activity modes

### None

No Activity section.

### Collaboration only — recommended default when enabled

- issue published/superseded;
- visible thread/message activity;
- thread resolution;
- formal decision;
- visible document update.

### Full client-safe

Adds:

- invitation/reminder milestones;
- visible access expiry;
- recipient's own verified view/print/download;
- selected portal status changes.

It still excludes other recipients' private view telemetry and all internal/security events.

## 7. Activity sharing configuration

Owner can choose:

- Activity section enabled;
- mode;
- whether recipient display names are shown;
- whether historic issues are included;
- whether print/export includes activity;
- whether only current recipient's events are shown.

The issue snapshots the policy, while immediate safety revocation can narrow it.

## 8. Notifications

### Owner

- immediate mention/assignment;
- batched discussion digest;
- formal decision immediate;
- delivery failure immediate;
- daily action-required digest;
- expiring portal warning;
- stale source/republish warning.

### Recipient

- invitation;
- verification;
- owner reply/mention;
- reminder;
- new issue;
- thread resolution/reopen;
- decision confirmation;
- portal expiry/withdrawal.

### Delivery architecture

Domain mutation and notification intent must be atomic through an outbox. Queues handle delivery, retries, and dead-letter state.

Do not send email first and then attempt to persist the business event.

## 9. Reminder policy

- owner-initiated or configured schedule;
- per-recipient cooldown;
- suppress after decision/revocation/unsubscribe;
- show last reminder;
- no automatic harassment loop;
- every send owner-audited;
- delivery failures create action-required state.

## 10. Bot and preview separation

- owner/manager preview never counts as recipient engagement;
- known link-preview agents are classified;
- password-gate fetch is not a view;
- anonymous render and verified view are separate;
- section dwell is coarse and privacy-reviewed;
- do not claim exact human engagement when identity is uncertain.

## 11. Analytics privacy

Before production enablement define:

- lawful/product purpose;
- disclosure;
- identity and anonymous treatment;
- bot treatment;
- retention;
- deletion;
- export;
- access roles;
- coarse location policy;
- cookies/session disclosure.

Archestimator's current Notion product truth correctly treats telemetry policy as a release gate.

## 12. Materialized summaries

To keep Publisher fast, maintain or query bounded summaries:

- recipient funnel state;
- latest human activity;
- open/waiting thread count;
- decision state;
- delivery state;
- next action;
- issue freshness.

Update through transactional writes/outbox consumers or a deterministic query. Rebuild summaries from the ledger if needed.

## 13. Exports

Owner exports:

- recipient matrix CSV;
- client-safe activity PDF/JSON;
- owner audit JSON/CSV;
- decision record;
- issue package.

Recipient export is limited to explicitly allowed issue/decision/activity records.

## 14. Acceptance criteria

- Owner sees reliable recipient funnel and next action.
- Bot/preview renders do not inflate verified-view metrics.
- Activity tab shows only configured client-safe events.
- Security/internal events never enter client activity.
- Notifications are idempotent and retryable.
- Revoked/unsubscribed recipients stop receiving reminders.
- Every formal decision produces owner and recipient confirmation.
- Event records answer when, where, who, what, and exact issue.
