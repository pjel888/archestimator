# 03 — Founder Jobs to Be Done and Product Requirements Document

## 1. Product overview

### Product name

**Archestimator Founder Homebase**

### Primary user

Philip Echavez Lewis — founder, architect, designer, engineer, product owner, support operator, growth operator, release manager, and administrator.

### Problem

Archestimator’s operational truth is distributed across:

- Admin routes;
- workshop settings;
- GitHub;
- Cloudflare;
- email;
- support conversations;
- feedback;
- project/activity pages;
- publication recipient activity;
- scripts and evidence artifacts.

The founder must remember where to look, manually correlate facts, and decide what matters.

This creates four risks:

1. missed customer obligations;
2. delayed incident or data-integrity response;
3. unsafe or slow releases;
4. product decisions made without joined evidence.

### Product objective

Create a single, trustworthy founder workspace that minimizes time from signal to safe action.

## 2. Jobs to be done

### JTBD-001 — Start the day

> When I begin working, I need one reliable briefing of everything that changed or needs action, so I can prioritize the day without checking many systems.

### JTBD-002 — Serve an early user

> When a user asks for help or appears stuck, I need their identity, activity, projects, estimates, shares, support, feedback, and previous follow-ups together, so I can respond with context.

### JTBD-003 — Investigate a product problem

> When something fails, I need to move from the error or complaint to the affected release, route, user, project, and source event, so I can diagnose without reconstructing the timeline manually.

### JTBD-004 — Ship safely

> When I am ready to release, I need one view of commit, checks, migrations, flags, known risks, rollback, support readiness, and post-deploy health, so I know whether to ship or stop.

### JTBD-005 — Understand product movement

> When I review Archestimator’s progress, I need defined activation, engagement, retention, publication, and decision metrics, so I can distinguish growth from activity noise.

### JTBD-006 — Decide what to build

> When feedback arrives, I need to see duplicates, themes, affected users, severity, product area, workarounds, and related errors, so I can prioritize evidence instead of anecdotes.

### JTBD-007 — Prevent infrastructure surprises

> When usage grows, I need early warning on capacity, queues, storage, email, AI usage, and cost, so I can act before downtime or spend.

### JTBD-008 — Repair data safely

> When an invariant fails, I need a previewed, bounded, audited repair path, so I do not use ad hoc SQL or silently corrupt records.

### JTBD-009 — Remember obligations

> When I promise a follow-up or defer an issue, I need it to return at the correct time with its original context, so I do not rely on memory.

### JTBD-010 — Use AI without losing control

> When the data is too broad to scan, I need a cited summary and proposed next action, while retaining human approval for every mutation.

## 3. User stories

### Home

- As founder, I see urgent action items before metrics.
- As founder, I see what changed since my last visit.
- As founder, I can snooze a non-urgent item without losing it.
- As founder, I can mark duplicate signals and preserve source evidence.
- As founder, I can open the exact affected entity.
- As founder, I see stale or unavailable data explicitly.

### Search

- As founder, I can enter an email, UUID, project code, estimate name, recipient, request ID, or phrase and receive grouped results.
- As founder, I can open recent and pinned entities without searching again.
- As founder, I can use keyboard navigation throughout.

### Customers

- As founder, I can see who signed up, activated, stalled, or needs follow-up.
- As founder, I can record notes and a follow-up date.
- As founder, I can see support and feedback alongside product activity.
- As founder, I can understand why an account is marked healthy, watch, or at risk.

### Product

- As founder, I can inspect a project/estimate/publication without entering the editing workflow.
- As founder, I can see missing pricing, failed exports, stale sources, or proposal decision state.
- As founder, I can connect customer signals to a product area and build record.

### Operations

- As founder, I see current user-impacting incidents and service symptoms.
- As founder, I see failed/stale jobs and a known safe next action.
- As founder, I see data integrity findings and preview repair impact.
- As founder, I see capacity thresholds and estimated cost trend.
- As founder, I can view the relevant Cloudflare/GitHub source of truth.

### Release

- As founder, I can create or import a release record.
- As founder, I can see blockers and make an explicit go/no-go decision.
- As founder, I can associate a later incident with the release.
- As founder, I can find the rollback procedure immediately.

### Communications

- As founder, I can send a safe one-time targeted message with preview and history.
- As founder, I can see delivery/materialization failures.
- As founder, I can draft a follow-up from User 360 or a feedback signal.

## 4. Success metrics

The feature is not judged by route count.

### Founder efficiency

| Metric | Target |
|---|---|
| Time to identify highest-priority issue after opening `/admin` | under 30 seconds |
| Time from action item to affected entity | one interaction |
| Time to find known user/project/estimate/publication | under 10 seconds |
| Number of core systems checked for daily triage | reduced to Admin plus linked provider details |
| Overdue founder follow-ups without explicit state | zero |
| Unclassified open action items older than seven days | zero |

### Customer operations

| Metric | Target |
|---|---|
| Open support items with no owner/next action | zero |
| High-severity feedback without product-area classification | zero |
| New design-partner signup without activation state after 48h | zero |
| Request-changes/decline decision without founder follow-up | zero |

### Product operations

| Metric | Target |
|---|---|
| Production release without release record and rollback reference | zero |
| Active feature flag without owner and review/expiry state | zero |
| Open data-quality finding without severity/next action | zero |
| Provider/health claim without source and as-of | zero |

### Product analytics

Initial canonical metrics:

- canonical signups;
- profile-provision completion;
- onboarding completion;
- first workspace;
- first project;
- first estimate;
- first priced row;
- first proposal/export;
- first shared publication;
- recipient verified open;
- recipient comment;
- recipient decision;
- weekly active product user;
- retained activated user;
- account/project collaboration activation.

Every metric defines:

- event/source;
- identity;
- denominator;
- window;
- deduplication;
- freshness;
- known blind spots.

## 5. Product requirements

### PRD-001 — Actionable Home

Home returns an ordered, deduplicated set of founder obligations with source, affected entity, reason, next action, age, and state.

### PRD-002 — Cross-domain search

Search is server-side, permission-aware, bounded, ranked, and URL-addressable.

### PRD-003 — Entity graph navigation

Major operational entities link to each other through safe summary DTOs.

### PRD-004 — Customer health

Health is rule-based and explainable. No opaque AI score.

Suggested dimensions:

- activation stage;
- meaningful activity freshness;
- unresolved support/feedback;
- publication/decision progress;
- data integrity;
- explicit founder relationship status.

### PRD-005 — Notes and follow-ups

Founder notes/follow-ups are:

- private admin records;
- entity-linked;
- auditable for mutation;
- searchable;
- due/snoozable;
- not mixed with client-visible comments.

### PRD-006 — Release record

Every production release can have a durable record with commit, deployment, change summary, migrations, flags, checks, risk, decision, and rollback.

### PRD-007 — Data-quality findings

Findings are generated by deterministic checks and have severity, evidence, source, first/last seen, status, repair capability, and resolution.

### PRD-008 — Provider truth

Admin distinguishes:

- locally inferred;
- locally measured;
- provider configured;
- provider read;
- provider hosted proof;
- unavailable.

### PRD-009 — Safe commands

Every admin command declares:

- capability;
- target;
- impact;
- preview if possible;
- reason;
- idempotency;
- audit;
- recovery.

### PRD-010 — Responsive operating surface

Desktop is primary. Mobile supports:

- scan;
- search;
- acknowledge/snooze;
- support reply;
- incident update;
- emergency flag/link.

Complex configuration and bulk operations may require desktop.

## 6. Assumptions

| Assumption | Plan response |
|---|---|
| One primary operator for the near term | Optimize UI and defaults for one founder |
| Current D1/domain data is sufficient for an MVP | Compose existing sources before adding providers |
| Early users need high-touch support | Prioritize customer context and follow-ups |
| Billing is not selected | Exclude billing mutation; define the read-adapter, metric definitions, integration health, reconciliation, and truthful unavailable scorecard state |
| Cloudflare remains active runtime | Use Cloudflare source links and future credentialed summaries |
| GitHub is source for code/release context | Link/import through bounded integration |
| Product instrumentation is incomplete | Display “not instrumented” and create event backlog |
| Admin must remain secure despite one operator | Keep exact capabilities and fresh-auth requirements |
| Founder time is more constrained than storage | Prefer precomputed summaries when proven useful |
| Scale is currently modest | Avoid premature enterprise workflow engines |

## 7. Open product questions with recommended defaults

| Question | Recommended default |
|---|---|
| Should Admin become a task manager? | No; only system/customer-generated obligations and founder follow-ups |
| Should all workshop settings tools move immediately? | No; link first, migrate once |
| Should health be one numeric score? | No; use status plus explicit reasons |
| Should support and feedback merge physically? | No; unify the signals read model, preserve source domains |
| Should Admin execute deployments? | Not MVP; show release record, checks, links, and rollback runbook |
| Should AI run repairs? | No; AI can propose, human runs normal audited command |
| Should notifications support recurrence in MVP? | No; one-time targeted messages first |
| Should recents/pins sync to D1? | Recents may start local; pins/follow-ups should be durable |
| Should provider dashboards be copied? | No; summarize only the operational facts needed for a decision |
| Should one operator still have capabilities? | Yes, server-side; hide role-management complexity |

## 8. Out of scope for the consolidated MVP

- full CRM pipeline;
- payment acceptance, subscription mutation, invoicing, accounting, tax, and revenue-recognition implementation;
- arbitrary BI/query builder;
- direct database console;
- autonomous agentic operations;
- custom workflow automation builder;
- full GitHub project/issue replacement;
- replacement for Cloudflare logs/traces;
- full incident paging service;
- full experimentation statistics platform;
- multi-language support operation;
- customer-facing status page;
- multi-tenant external admin.

## 9. Release criteria

The Founder Homebase MVP can be considered product-complete when:

- every first-viewport item is truthful and actionable;
- global search covers the primary entities;
- User/Account/Workspace 360 is usable;
- customer support/feedback/feed obligations enter the Action Inbox;
- operations, release, and data-quality blockers are visible;
- notes/follow-ups return when due;
- provider link-outs are accurate;
- destructive actions remain protected;
- advanced campaign features are not on the MVP critical path.
