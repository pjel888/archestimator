# 07 — Support, Feedback, and Product Discovery

## 1. Product decision

Support and feedback remain distinct source domains but become one **Customer Signals** operating surface.

Support asks:

> What does the customer need now?

Product discovery asks:

> What should Archestimator learn or build from repeated evidence?

A single signal can participate in both.

## 2. Current foundation

Already implemented:

- support conversations/messages;
- unread state;
- status;
- admin replies;
- email/in-app channel;
- client message idempotency;
- authenticated feedback submissions;
- type/severity/message/page path;
- feedback status.

The missing layer is context, prioritization, theme synthesis, and close-the-loop.

## 3. Signals route

`/admin/signals`

Views:

- New
- Urgent
- Waiting on founder
- Waiting on customer
- Product review
- Linked to work
- Resolved
- Snoozed
- Duplicates
- Themes

Source filters:

- support;
- feedback;
- client comment/decision;
- client error;
- survey/interview;
- manual founder signal.

## 4. Signal data model

```ts
type AdminCustomerSignal = {
  id: string;
  sourceType: "support" | "feedback" | "client_comment" | "client_decision" | "error" | "interview" | "manual";
  sourceId: string;
  title: string;
  summary: string;
  status: "new" | "reviewing" | "waiting" | "linked" | "resolved" | "dismissed" | "duplicate";
  severity: "critical" | "high" | "medium" | "low";
  productArea: string | null;
  desiredOutcome: string | null;
  workaround: string | null;
  entityRefs: AdminEntityRef[];
  themeIds: string[];
  duplicateOf: string | null;
  githubUrl: string | null;
  notionUrl: string | null;
  followUpAt: string | null;
  closedLoopAt: string | null;
  sourceOccurredAt: string;
  updatedAt: string;
};
```

This can be a projection/annotation table over existing source records.

## 5. Triage actions

Borrow the strongest Triage pattern:

- **Accept** — confirms product/customer follow-up;
- **Duplicate** — attaches evidence to canonical signal;
- **Decline** — non-actionable/out of scope, with reason;
- **Snooze** — returns at time or new activity;
- **Ask for information** — reply and keep waiting;
- **Link to work** — GitHub issue/PR or Notion spec;
- **Resolve** — outcome and customer follow-up recorded.

## 6. Support inbox target

### List pane

- requester;
- account/workspace;
- subject;
- priority;
- status;
- unread;
- age;
- waiting side;
- related signal/theme;
- SLA/follow-up due.

For one operator, assignment is implicitly Philip but retained.

### Conversation pane

- full thread;
- reply composer;
- saved replies;
- internal note;
- status;
- priority;
- waiting state;
- entity links;
- source request/page;
- related errors/incidents/releases;
- follow-up.

### Customer context pane

- User 360 summary;
- activation stage;
- projects/estimates;
- recent errors;
- feedback;
- publication/client activity;
- notes.

## 7. Support statuses

Use clear states:

- New
- Open — working
- Waiting on customer
- Waiting on founder
- Resolved
- Archived
- Snoozed

Current `open/pending/resolved/archived` can be mapped without immediate schema rewrite:

- `pending` plus waiting-side annotation.

## 8. Support priority

Rule inputs:

- severity;
- user blocked;
- number affected;
- customer/design-partner importance;
- age;
- repeated issue;
- publication/decision deadline;
- security/data-integrity.

Priority remains explainable.

## 9. Service targets

For a solo founder, SLAs are internal targets, not contractual promises.

Suggested:

- Critical/blocking: acknowledge within 4 working hours;
- High: within 1 working day;
- Normal: within 2 working days;
- Low/product suggestion: triage within 7 days.

Admin shows overdue state. Do not advertise contractual SLA unless approved.

## 10. Internal notes and saved replies

Internal note:

- admin-only;
- separate action/component from customer reply;
- author/time;
- can create follow-up.

Saved replies:

- onboarding help;
- request diagnostics;
- proposal/share help;
- export issue;
- account/access;
- acknowledged bug;
- resolved/fixed follow-up.

Templates must be editable before send.

## 11. Feedback enrichment

Current feedback records gain annotations:

- product area;
- severity confirmation;
- desired outcome;
- affected workflow;
- affected entity;
- duplicate/theme;
- evidence;
- workaround;
- founder decision;
- implementation link;
- customer follow-up.

## 12. Theme model

A theme groups related signals.

Examples:

- proposal comparison;
- shared link approvals;
- component source freshness;
- export formatting;
- collaboration permissions;
- performance at scale;
- onboarding clarity;
- supplier/product data;
- mobile review.

Theme fields:

- title;
- description;
- product area;
- status;
- signal count;
- affected customer count;
- recency;
- severity mix;
- linked work;
- decision;
- owner;
- next review.

Do not use AI-only clustering as truth. AI may suggest; founder confirms.

## 13. Evidence-based prioritization

Use a transparent score or matrix:

- user count;
- account importance;
- severity;
- frequency;
- workflow criticality;
- strategic alignment;
- workaround quality;
- confidence;
- implementation cost — manually supplied;
- revenue impact only when real.

Display inputs, not only a composite number.

## 14. Product discovery views

### Repeated themes

Sorted by affected users and recency.

### Blockers

Signals preventing core estimating/proposal workflow.

### Requests from activated users

Higher-context product requests.

### Churn/inactivity reasons

Support/feedback linked to users who stopped using the product.

### Close-the-loop queue

Signals linked to shipped work but without customer update.

### Interview candidates

Users matching product question/cohort.

## 15. Link to build systems

Admin is not the engineering backlog.

A product signal can link to:

- GitHub issue;
- GitHub PR;
- Notion PRD;
- plan pack;
- release record.

The canonical implementation state remains in those systems.

Admin owns:

- evidence;
- customer impact;
- close-loop;
- founder decision.

## 16. Error-to-signal correlation

Client errors can propose signals when:

- repeated fingerprint;
- multiple users;
- release correlation;
- support/feedback phrase match;
- blocking route.

Do not automatically create noisy signals for every error.

A grouped error can link to:

- affected user/project;
- support conversation;
- incident;
- release;
- GitHub issue.

## 17. Close-the-loop workflow

When linked work ships:

1. release record references signal/theme;
2. signal moves to “Shipped — follow-up required”;
3. founder drafts customer update;
4. update sent/recorded;
5. `closedLoopAt` set;
6. theme impact reviewed after interval.

## 18. Metrics

- first response time;
- time waiting on founder;
- resolution time;
- reopen rate;
- support volume by product area;
- feedback triage age;
- duplicate ratio;
- themes by affected customers;
- signals linked to work;
- shipped signals without follow-up;
- close-loop time;
- blocked-user age;
- recurring issue after release.

## 19. AI assistance

Allowed:

- summarize long conversation;
- suggest product area/theme;
- suggest duplicates;
- draft reply;
- draft GitHub issue;
- extract desired outcome/workaround;
- identify related release/error.

Required:

- source links;
- confidence;
- human confirmation.

## 20. MVP boundary

MVP:

- customer context side panel;
- priority/waiting/age;
- internal notes;
- saved replies;
- signal annotations;
- duplicate/theme;
- GitHub/Notion link;
- follow-up and close-loop;
- Action Inbox integration.

Later:

- omnichannel integrations;
- contractual SLAs;
- team workload routing;
- automatic AI classification;
- attachments;
- advanced survey builder.
