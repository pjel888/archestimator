# 05 — Command Center, Action Inbox, and Search

## 1. Purpose

The Action Inbox is the missing keystone.

Without it, Home is a dashboard. With it, Home becomes an operating system.

## 2. Action item definition

An action item is a normalized founder obligation derived from a canonical source.

Examples:

- Sev 1 incident open;
- support conversation unread for 18 hours;
- feedback marked critical and unreviewed;
- user signed up but failed activation;
- client requested changes on a publication;
- notification run partially failed;
- upload scan requires review;
- D1 restore rehearsal overdue;
- migration check failed;
- production release health degraded;
- feature flag expired;
- account has identity mismatch;
- provider limit near threshold;
- promised founder follow-up due.

## 3. Source ownership

The Action Inbox does not replace source records.

| Source | Canonical owner | Action projection |
|---|---|---|
| Support conversation | support domain | reply/resolve obligation |
| Feedback submission | feedback domain | triage/follow-up obligation |
| Incident | incident domain | investigate/contain/resolve obligation |
| Notification run | notification domain | retry/retract/investigate |
| Upload scan | upload domain | review/override/reject |
| Identity mismatch | auth/admin reconciliation | reconcile |
| Publication decision | publication domain | respond/republish/follow-up |
| Release check | release domain | satisfy/waive/stop |
| Data-quality finding | integrity domain | repair/accept risk |
| Founder note | admin notes domain | follow-up |
| Capacity threshold | provider/local metric | investigate/scale/clean up |

## 4. Action item data contract

```ts
type AdminActionItem = {
  id: string;
  sourceDomain:
    | "support"
    | "feedback"
    | "incident"
    | "notification"
    | "upload"
    | "identity"
    | "publication"
    | "release"
    | "data_quality"
    | "capacity"
    | "founder_follow_up";
  sourceId: string;
  dedupeKey: string;
  kind: string;
  priority: "critical" | "urgent" | "review" | "monitor";
  state: "new" | "active" | "waiting" | "snoozed" | "resolved" | "dismissed" | "duplicate";
  title: string;
  summary: string;
  entityRefs: AdminEntityRef[];
  occurredAt: string;
  dueAt: string | null;
  snoozedUntil: string | null;
  sourceUpdatedAt: string;
  nextActions: AdminActionDescriptor[];
  reasonCodes: string[];
  deepLink: string;
  assignedTo: string | null;
};
```

For one operator, `assignedTo` defaults to Philip but remains structurally present.

## 5. Derived versus persisted action items

### Derived items

Use query-time or scheduled deterministic rules for states fully represented in the source:

- open incident;
- unread support;
- failed job;
- pending scan;
- expired flag;
- release blocker.

### Persisted founder state

Persist only operator-specific workflow:

- accepted/active;
- snoozed;
- dismissed with reason;
- duplicate link;
- resolved acknowledgement;
- custom priority;
- follow-up.

This prevents duplicating source truth.

## 6. Dedupe and reconciliation

An item has a stable `dedupeKey`.

Examples:

```text
support:<conversationId>:waiting_on_admin
incident:<incidentId>:open
release:<releaseId>:check:<checkKey>
user:<userId>:activation_stalled
publication:<publicationId>:decision:<responseId>
data_quality:<checkKey>:<entityId>
```

Rules:

- source update can reopen a resolved or snoozed item;
- a duplicate item links to the canonical item;
- source resolution auto-resolves projections unless founder follow-up remains;
- manual dismissal never changes source state;
- stale projections are removed or marked reconciled.

## 7. Priority model

Priority must be deterministic and explainable.

### Critical

- active user-facing outage;
- cross-tenant/privacy/security risk;
- data-loss/corruption risk;
- current production release rollback required;
- founder/admin lockout risk.

### Urgent

- multiple users blocked;
- high-severity customer issue;
- failed decision/outreach with deadline;
- queue/backlog threatens service;
- restore/backup failure;
- severe capacity threshold.

### Review

- new feedback;
- stalled activation;
- support awaiting response;
- flag review;
- data-quality finding without immediate impact.

### Monitor

- trend warning;
- planned follow-up;
- low-severity anomaly;
- optional optimization.

No opaque priority score is shown without reasons.

## 8. Action operations

### Accept

Moves `new` to `active`.

### Resolve

Requires:

- source state compatible or explicit acknowledgement;
- resolution code;
- optional note;
- audit.

### Duplicate

Requires canonical item. Source records remain.

### Dismiss / decline

Requires reason. Use for non-actionable signal.

### Snooze

Options:

- later today;
- tomorrow;
- next week;
- custom;
- until source changes.

### Waiting

Use when waiting for:

- customer;
- provider;
- deployment;
- legal/owner decision;
- background job.

### Launch action

Examples:

- open support reply;
- open user/account;
- retry eligible job;
- preview repair;
- create release;
- open Cloudflare logs;
- draft outreach.

## 9. Home Today view

Sections:

### Now

Critical and urgent items.

### Customer promises

Due follow-ups, support, publication decisions.

### Ship / do not ship

Current release blockers and post-deploy health.

### System work

Jobs, data quality, uploads, capacity.

### Review when time permits

Feedback, adoption, stale flags, trends.

### Snoozed return

Items whose snooze expired.

## 10. “Since last visit”

Store a founder checkpoint:

- last completed Home review time;
- last weekly review time.

Show:

- new users;
- newly activated users;
- new support/feedback;
- new/changed incidents;
- releases/deployments;
- flag changes;
- data-quality findings;
- client decisions;
- failed deliveries.

Checkpoint updates explicitly when the founder completes review, not merely on page load.

## 11. Notes and follow-ups

Founder notes are private.

```ts
type AdminFounderNote = {
  id: string;
  entityType: AdminEntityKind;
  entityId: string;
  body: string;
  state: "note" | "follow_up_open" | "follow_up_done";
  followUpAt: string | null;
  createdAt: string;
  updatedAt: string;
};
```

Capabilities:

- add from any context drawer;
- convert to follow-up;
- link multiple entities;
- search;
- complete;
- snooze;
- visible in User/Account/Project 360.

Do not expose these notes to customers.

## 12. Global search

### MVP entity coverage

- user/profile;
- corporate account;
- workspace;
- project;
- estimate;
- publication/client portal;
- support conversation;
- feedback signal;
- incident;
- release;
- campaign/notification;
- feature flag.

### Query recognition

- UUID → exact ID lookup first;
- email → user/recipient/support;
- project code/sheet code → exact/prefix;
- request ID → audit/error/incident;
- natural phrase → names/titles/subjects;
- token-like input → never echo or log raw secret token; use safe hash lookup only in privileged explicit flow.

### Results

Grouped by entity kind:

```text
Users
Projects
Estimates
Publications
Support & Feedback
Operations
Governance
```

Each result includes:

- primary label;
- secondary context;
- status;
- source;
- last meaningful activity;
- safe ID;
- quick actions;
- reason it matched.

### Ranking

1. exact ID/code/email;
2. prefix;
3. name;
4. text;
5. recent/pinned boost.

### Search URL

Search state appears in URL so views are bookmarkable.

## 13. Search architecture options

### Phase 1 — Federated bounded search

Parallel bounded repository queries with exact/prefix matching.

Benefits:

- fastest implementation;
- no projection sync;
- current source authority.

Limits:

- more queries;
- ranking across domains;
- body text search limited.

### Phase 2 — Search projection

`admin_search_documents` updated by domain mutations/outbox.

Use only when:

- scale or latency justifies it;
- synchronization and deletion are specified;
- sensitive fields are excluded;
- reindex/reconcile exists.

No arbitrary SQL search console.

## 14. Command palette

The command palette combines navigation and safe actions.

Categories:

- Go to;
- Search entities;
- Recent;
- Pinned;
- Create;
- Run;
- External provider.

Safe commands:

- create note/follow-up;
- create incident;
- create release draft;
- compose outreach draft;
- open logs;
- open migration status;
- run read-only data check.

Dangerous commands do not execute immediately. They open a confirmation/detail flow.

## 15. Recents, pins, and saved views

### Recents

May begin in local storage:

- entity type/id;
- label snapshot;
- last visited.

Avoid sensitive content.

### Pins

Store durably:

- entity or saved view;
- ordering;
- optional label.

### Saved views

MVP for:

- Users;
- Action Inbox;
- Support;
- Feedback;
- Data Quality;
- Releases.

A saved view stores validated filter schema, not raw SQL.

## 16. Performance requirements

- Home independent panels load in parallel/Suspense.
- Urgent action lane is first.
- Search starts after a short debounce and cancels stale requests.
- Exact ID lookup returns before broad text results where possible.
- No route loads complete entity graphs for list rows.
- Context drawer lazy-loads detail.
- Action counts use indexed/summary queries.
- Provider calls cannot block Home; use cached snapshot/link-out/degraded state.

## 17. Security requirements

- search results respect current admin capability;
- raw tokens/secrets never searchable in general bar;
- sensitive entities require fresh auth for action, not necessarily read;
- searches and sensitive reads can be audit-recorded;
- notes are founder-private;
- no cross-workspace leakage;
- action deep links reauthorize;
- safe errors reveal no hidden entity existence to unauthorized roles.
