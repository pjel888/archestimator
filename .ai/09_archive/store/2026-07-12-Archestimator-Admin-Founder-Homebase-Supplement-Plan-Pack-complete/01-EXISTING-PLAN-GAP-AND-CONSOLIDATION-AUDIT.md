# 01 — Existing Plan Gap and Consolidation Audit

## 1. Assessment

The archived `Admin-Feature-Improvement` predecessor is comprehensive in breadth but uneven in product priority. This audit records how its useful contracts were absorbed into the canonical consolidated pack.

It is strongest in:

- identity correctness;
- User 360 source definitions;
- privileged action safety;
- notification lifecycle depth;
- queue/idempotency/reconciliation thinking;
- support expansion;
- feature-flag governance;
- audit/privacy/retention;
- provider-proof honesty.

It is weakest in:

- solo-founder daily use;
- cross-domain prioritization;
- global entity navigation;
- customer success;
- product feedback synthesis;
- release management as a daily surface;
- data quality and repair;
- cost/capacity;
- business cadence;
- explicit implementation prioritization by founder leverage.

## 2. The current plan’s hidden assumption

The plan implicitly models a future organization with separate operators:

- admin;
- support;
- campaign manager;
- incident operator;
- analytics user;
- security/privacy operator.

That assumption produces a route-first control plane.

Philip needs an obligation-first homebase.

A solo-founder operating model cannot require the founder to separately inspect:

- support;
- feedback;
- users;
- observability;
- incidents;
- analytics;
- uploads;
- scans;
- flags;
- release readiness;
- provider dashboards.

The home page must aggregate those sources into one triage system.

## 3. Coverage assessment

| Domain | Existing plan | Supplement assessment |
|---|---|---|
| User list and User 360 | Strong | Keep; connect to customer health, notes, follow-ups, projects, publications |
| Account/session interventions | Strong security direction | Keep; simplify role UI for solo-founder |
| Corporate accounts | Covered through overlap pack | Expand to Account/Workspace 360 and customer-success state |
| Notifications | Extremely detailed | Reprioritize; simple targeted outreach first, advanced recurrence later |
| Support | Good P1 expansion | Keep; integrate into unified customer signals and action inbox |
| Feature flags | Good typed-registry direction | Expand into feature-delivery lifecycle, cohorts, exposure, expiry, release linkage |
| Audit/security | Strong | Keep; add security posture and data-quality repair linkages |
| Observability/incidents | Broad but route-level | Expand into action-oriented health, release correlation, runbooks, cost/capacity |
| Product analytics | Funnel list only | Add operational scorecard, cohort/customer views, metric definitions and cadence |
| Fragmented tools | Inventoried | Define actual consolidation target and route sequence |
| Release/launch | Treated as execution/release gates | Missing as user-facing founder product |
| Global search | Missing | P0 |
| Action inbox | Mentioned as attention queue, not modeled | P0 |
| Saved views/pins/recents | Mostly absent | P0/P1 |
| Customer success | Missing | P0/P1 |
| Feedback/product discovery | Status queue only | P0/P1 |
| Project/Estimate/Publication 360 | User footprint only | P1 |
| Data quality/reconciliation UI | Scattered | P1 |
| Cost/capacity | Numeric budget in implementation only | P1 |
| Founder cadence | Missing | P0/P1 |
| AI operator | Missing | P2 |

## 4. Structural plan problem

The current plan has nineteen units and puts a full notification campaign platform across Units 007–010 before support, operations, analytics, and final integration.

That order is wrong for a one-person company.

A four-unit campaign engine can consume months while the founder still lacks:

- a unified customer queue;
- global search;
- a release dashboard;
- a data-quality queue;
- cost warnings;
- a weekly operating review.

The consolidated sequence must deliver the Founder Homebase before advanced campaign scheduling.

## 5. What to retain unchanged

### Identity semantics

Keep the existing distinctions:

- Better Auth canonical user;
- profile projection;
- signup;
- profile provision;
- successful login;
- authenticated use;
- product activity;
- online presence.

Do not relabel session timestamps as user activity.

### User lifecycle safety

Keep:

- exact server authorization;
- protected-account floor;
- no self-target;
- fresh auth for high-risk actions;
- supported session revocation;
- idempotency;
- reason;
- affected-row proof;
- audit.

### Notification durability

Keep the underlying long-term model:

- definition/version;
- audience;
- occurrence;
- run;
- recipient delivery;
- retry/DLQ;
- retraction;
- replacement;
- metrics with denominators.

But ship a reduced first slice.

### Privacy and audit

Keep:

- redaction;
- no raw tokens/IP/user agent in general UI;
- sensitive-read events;
- retention and legal-hold semantics;
- no fake completeness.

### Provider boundary

Keep:

- local truth versus hosted truth;
- link-outs until credentialed reads exist;
- no paid add-on without approval.

## 6. What to change

### Change A — Reframe Overview

Current: health cards, signup count, incidents, approximate trend.

Target:

- Today;
- Action Inbox;
- Customer attention;
- Release readiness;
- Production health;
- Data quality;
- Growth pulse;
- recent changes;
- quick actions.

### Change B — Make attention items durable and actionable

Current plan names an “attention queue” but does not define:

- item identity;
- source/dedupe;
- states;
- snooze;
- resolution;
- deep link;
- next action;
- recurrence;
- source reconciliation.

The consolidated pack defines the model.

### Change C — Add search as a top-level capability

Current plan defines filters within routes but no cross-domain search.

Add:

- `⌘K`;
- search by email/name/code/ID;
- grouped results;
- recents and pins;
- safe operators;
- role-aware results;
- entity preview.

### Change D — Expand 360 views

Current plan centers User 360.

Add:

- Account/Workspace 360;
- Project 360;
- Estimate 360;
- Publication/Client Portal 360;
- incident/release/campaign detail relationships.

### Change E — Integrate customer success

Add:

- activation stage;
- health/risk reasons;
- cohort;
- last meaningful product activity;
- support/feedback;
- notes;
- follow-up date;
- next best action;
- outreach history.

### Change F — Connect feedback to build decisions

Add:

- signal triage;
- duplicate/theme;
- affected entity;
- user impact;
- evidence;
- GitHub/Notion links;
- close-the-loop status.

### Change G — Productize release readiness

Add a real route/product surface rather than leaving release only in implementation runbooks.

### Change H — Productize data quality

Add findings and curated repair runs instead of relying solely on scripts and tests.

### Change I — Add cost and capacity

The founder needs thresholds before free-tier or resource limits cause an incident.

### Change J — Add operating cadence

Admin should retain:

- daily last-visit checkpoint;
- weekly review snapshot;
- unresolved/snoozed obligations;
- decisions and follow-ups.

## 7. What to defer

Defer from the first consolidated release:

- recurring notification series with complex DST revisions;
- visual workflow builder;
- digest orchestration;
- campaign approval roles for multiple operators;
- multi-admin assignment/workload balancing;
- provider analytics APIs without demonstrated need;
- AI autonomous actions;
- custom payment, accounting, tax, or revenue-recognition operations beyond the provider read-adapter boundary;
- broad data warehouse.

## 8. Consolidated priority reset

### Phase 0 — Truth and safety

Absorb old Units 001–006:

- current defects;
- exact admin capabilities;
- canonical identity;
- User 360;
- safe user/session interventions.

### Phase 1 — Founder homebase

New priority:

- shell/IA;
- global search;
- Action Inbox;
- Today briefing;
- recents/pins;
- customer attention;
- support/feedback integration;
- release/health/data-quality summaries.

### Phase 2 — Complete entity and operating views

- Account/Workspace 360;
- Project/Estimate/Publication 360;
- customer health/cohorts;
- feedback themes;
- releases/incidents/runbooks;
- data repair;
- cost/capacity;
- product analytics.

### Phase 3 — Communications and feature delivery

- safe targeted outreach;
- templates;
- delivery history;
- feature flag lifecycle;
- early access/cohorts;
- simple one-time scheduling.

### Phase 4 — Scale features

- recurring campaign engine;
- queue fanout at larger cohort sizes;
- optional provider APIs;
- experiments;
- AI operator;
- multi-operator controls.

## 9. Consolidation acceptance audit

The merged plan is wrong if:

- notification campaigns remain the longest critical-path dependency before Home;
- Overview still has no durable action model;
- only users get a 360 view;
- customer support and feedback remain separate dead-end queues;
- release and data-quality work exist only in scripts/runbooks;
- global search is absent;
- provider status is inferred from binding presence;
- the founder must navigate more than three routes to understand one customer problem;
- advanced enterprise concepts delay the first founder-useful release.

## 10. Final status of the predecessor

The predecessor is preserved in the archive as:

> **Admin Control-Plane Foundation and Advanced Operations Specification**

This active pack is the canonical:

> **Founder Homebase and Admin Control Plane**

Its useful contracts are integrated into `13-IMPLEMENTATION-ROADMAP.md`, `15-RISKS-DECISIONS-AND-NON-GOALS.md`, and `17-CONSOLIDATION-MAP-AND-TRACEABILITY.md`. The archived predecessor is not an execution dependency or second ledger.
