# 00 — Executive Direction

## 1. Product thesis

Archestimator is currently operated by one person. That changes the correct admin product.

A conventional admin panel optimizes for departmental separation:

- support agents handle conversations;
- product managers handle feedback;
- engineers handle incidents;
- growth teams handle activation;
- finance teams handle costs;
- release managers handle deployment;
- security teams handle audit.

Archestimator has one operator performing all of those jobs.

The admin product must therefore optimize for **context switching, prioritization, and safe action**, not organizational boundaries.

The central object is not a user, campaign, incident, or metric. The central object is:

> **A founder obligation that has a source, business impact, affected entity, next action, and evidence of resolution.**

## 2. Four operating modes

### 30-second scan

The founder opens `/admin` and immediately sees:

- urgent user-impacting problems;
- overdue customer replies or follow-ups;
- failed jobs, deliveries, scans, or migrations;
- current release state;
- growth/activation pulse;
- capacity or cost warning;
- exact timestamp and source freshness.

### 5-minute triage

The founder can:

- accept an item into active work;
- resolve it;
- mark it duplicate;
- decline it with reason;
- snooze it;
- open the affected user/project/estimate/publication;
- start a support response;
- launch a known repair/runbook;
- record a follow-up.

### 30-minute operating session

The founder can:

- review a customer’s full context;
- investigate a production incident;
- prepare or evaluate a release;
- analyze activation/retention;
- cluster feedback;
- target outreach;
- inspect data-quality failures;
- review costs and limits.

### Weekly review

The founder can answer:

- What improved or regressed?
- Which users activated, stalled, or churned?
- Which feedback themes repeated?
- What shipped and what caused issues?
- Which operational work is recurring toil?
- Which feature flags or temporary controls should be removed?
- What is the next week’s highest-leverage product and customer work?

## 3. Binding product decisions

### DEC-001 — Home is an action system, not a metric gallery

Metrics support decisions. They do not occupy the dominant screen unless they change what the founder should do.

The first viewport prioritizes:

1. user-impacting incidents;
2. overdue customer obligations;
3. failed or blocked operations;
4. release risks;
5. data integrity;
6. growth/customer signals.

### DEC-002 — One cross-domain Action Inbox

Support, feedback, incidents, failed delivery, identity mismatch, upload scans, release blockers, and data integrity remain owned by their domains.

The Admin Action Inbox creates a normalized operational projection:

- source;
- priority;
- affected entity;
- current owner;
- next action;
- due/freshness;
- state;
- deep link.

It does not replace source records.

### DEC-003 — Search is a primary navigation primitive

The founder must be able to find:

- user by email or ID;
- account/workspace by name;
- project by name or code;
- estimate by name or sheet code;
- publication/share/portal by project, recipient, or token-safe identifier;
- support/feedback by phrase or requester;
- incident/job/campaign by ID or status.

A dashboard without global entity search is not an operator homebase.

### DEC-004 — Build Entity 360, not only User 360

User 360 is necessary but insufficient.

Operational questions frequently begin with:

- “What is wrong with this project?”
- “Why does this estimate not export?”
- “Which proposal did this client receive?”
- “Which workspace owns this data?”
- “Did this release create these errors?”

The homebase needs linked 360 views for the major domain entities.

### DEC-005 — Customer success is an explicit product surface

The customer domain includes:

- access/allowlist;
- signup and onboarding;
- activation stage;
- retained activity;
- support and feedback;
- projects/estimates/publications;
- notes and follow-ups;
- risk and next action.

This is not a full CRM. It is the operational context required to successfully serve early users.

### DEC-006 — Feedback is connected to product decisions

Feedback and support cannot end at “new / reviewing / resolved.”

A signal must be able to link to:

- affected user/account/project/estimate;
- related support/error/incident;
- duplicate or theme;
- product area;
- desired outcome;
- severity and reach;
- GitHub/Notion implementation record;
- follow-up communication.

### DEC-007 — Release readiness is a first-class admin workflow

A release record binds:

- commit/deployment;
- migrations;
- feature flags;
- change summary;
- known risks;
- checks/proofs;
- rollback path;
- post-deploy health window;
- related incidents.

The Admin should summarize or link to provider truth, not invent a parallel deployment platform.

### DEC-008 — Data quality is visible and repairable

Known integrity conditions must become findings:

- auth user/profile mismatch;
- orphaned membership or domain rows;
- stuck job/delivery;
- invalid publication/recipient state;
- migration drift;
- incomplete analytics identity;
- failed scan or upload cleanup;
- inconsistent aggregate.

Repairs use curated, idempotent commands with preview, reason, impact, and audit. No arbitrary SQL console.

### DEC-009 — Cost and capacity belong in operations

A solo founder needs early warning before limits create downtime or surprise cost.

Track or link:

- Workers requests/CPU/error rate;
- D1 storage/read/write and query health;
- R2 storage/operations;
- Queue backlog and operations;
- Email volume/failure;
- image processing;
- AI usage/cost;
- attachment/upload growth.

Use provider APIs only after credentials, quotas, and cost are approved. Until then, show truthful link-outs and locally known usage.

### DEC-010 — Founder-only now, capability-ready later

The implementation remains deny-by-default and action-capability based.

The product does not need a complex admin role editor today.

MVP operator model:

- primary founder/CEO;
- optional platform admin;
- break-glass recovery process;
- last-admin protection;
- fresh authentication for destructive/high-impact actions.

### DEC-011 — AI is read-only and assistive first

AI may:

- summarize changes;
- explain anomalies;
- cluster feedback;
- draft replies;
- draft release notes;
- propose next actions.

AI may not autonomously:

- ban users;
- publish campaigns;
- change flags;
- run repairs;
- deploy;
- delete data;
- close incidents.

Every answer names sources and freshness. Every mutation requires explicit human confirmation through the normal audited action.

### DEC-012 — Existing tools are consolidated through ownership, not copied

The current workshop settings already contain:

- access allowlist;
- feedback review;
- upload operations;
- scan overrides.

The Admin should initially link and surface their status.

Move a tool only when:

- Admin becomes the single mutation owner;
- redirect and authorization are defined;
- duplicated workflows are removed.

### DEC-013 — Advanced campaigns do not block the homebase

The existing plan dedicates four large units to a complete campaign platform.

Reprioritize:

- MVP communications: safe targeted outreach, templates, send history, delivery failure, audit.
- Later: recurring series, complex schedule revisions, digest orchestration, advanced cohort enrollment, multi-operator approvals.

### DEC-014 — Full-width, desktop-first, keyboard-fast

The current route constrains most pages to `max-w-6xl` and uses extremely small typography.

Target:

- full browser width;
- grouped navigation;
- global command bar;
- dense but readable tables;
- contextual side panel;
- persistent source/freshness labels;
- keyboard-first triage;
- mobile monitoring and emergency actions, not full administrative authoring.

## 4. Founder Homebase North Star

> From the first page, the founder can identify, investigate, act on, and close every important customer, product, release, and operational obligation without losing source truth.

## 5. Product principles

### Truth before convenience

No approximate metric appears as a live fact without a label, denominator, source, and as-of time.

### Actionability before completeness

A smaller view with clear next actions beats a comprehensive read-only warehouse.

### Context before navigation

Every action item links directly to the affected entity and source record.

### One mutation owner

Admin may aggregate reads. It must not create a second mutation path for a domain operation.

### Safe defaults

Dangerous actions require:

- exact scope;
- impact count;
- reason;
- fresh auth when appropriate;
- idempotency;
- durable audit;
- recovery path.

### Low noise

Only urgent, actionable, user-impacting items interrupt. Everything else stays in the dashboard or scheduled review.

### Founder time is the scarce resource

Every surface must justify itself by:

- preventing missed work;
- reducing investigation time;
- accelerating a decision;
- making a safe action faster;
- revealing a material trend.

## 6. Scope tiers

### P0 — Founder operating core

- current admin correctness/security;
- Admin shell and navigation;
- global search;
- action inbox;
- daily briefing;
- User/Account/Workspace 360;
- support/feedback triage;
- production/release/data-quality summary;
- recents/pins/notes/follow-ups;
- truthful product funnel.

### P1 — Complete operating system

- Project/Estimate/Publication 360;
- release center;
- incidents/runbooks;
- data repair;
- customer health and cohorts;
- product discovery/themes;
- cost/capacity;
- feature rollout lifecycle;
- business scorecard;
- weekly review.

### P2 — Scale and leverage

- advanced notification campaign lifecycle;
- experiments and early access;
- optional provider APIs;
- AI operator;
- multi-operator workload management;
- client/customer account inbox;
- billing/revenue once a system exists.

## 7. Non-negotiable outcomes

The consolidated implementation must not produce:

- a home page of disconnected cards;
- a second task manager;
- a second incident system;
- a second observability backend;
- a second CRM;
- an arbitrary SQL console;
- unsourced AI summaries;
- a notification platform that ships before basic founder triage;
- provider configuration claims based on environment variable presence;
- dangerous controls without affected-row proof.
