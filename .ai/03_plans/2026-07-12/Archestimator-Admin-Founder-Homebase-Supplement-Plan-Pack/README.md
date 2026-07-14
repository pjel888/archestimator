# Archestimator Admin Founder Homebase and Control Plane

**Plan date:** 2026-07-12  
**Verified against current source:** 2026-07-14  
**Repository:** `pjel888/archestimator`  
**Target:** `/admin/**`  
**Superseded predecessor:** `.ai/09_archive/store/2026-07-12-Admin-Feature-Improvement-superseded`  
**Purpose:** Canonical consolidated Admin implementation plan for the solo-founder operating system and the retained control-plane foundations  
**Package status:** Conditionally ready; `UNIT-001` is the dependency-closed ready slice in `13-IMPLEMENTATION-ROADMAP.md`  
**Implementation status:** Not started  
**Tests, builds, browser automation, deployments, and provider mutations performed:** None

## Executive position

The archived Admin Feature Improvement predecessor was technically serious and broad. Its User 360, identity reconciliation, privileged account operations, notification durability, support, feature-flag, audit, privacy, retention, migration, and provider-proof contracts are retained here.

Its remaining weakness is product orientation.

It primarily asks:

> How should a future administration control plane safely manage users, campaigns, support, configuration, and operations?

Philip’s actual requirement is sharper:

> As the solo founder, what must `/admin` show and let me do every day so I can operate Archestimator without missing a customer, a production problem, a launch risk, a data defect, or the next business decision?

Those are not the same product.

The consolidated target is a **Founder Homebase**: a high-signal operating system that answers six questions within thirty seconds:

1. What needs my attention now?
2. Which users, customers, projects, or proposals need follow-up?
3. What changed since my last visit?
4. Is production healthy and is anything approaching a limit?
5. Is the next release safe to ship or should it be stopped?
6. Which product or business action has the highest leverage today?

## What this pack contributes

This consolidated pack adds the missing cross-domain layer and is now the sole execution authority:

- Founder Command Center and daily briefing
- Unified Action Inbox with accept, resolve, duplicate, decline, and snooze
- Global entity search and keyboard command palette
- Recent items, pinned entities, saved views, and follow-ups
- Customer success and cohort operations
- User, account, workspace, project, estimate, and publication 360 views
- Unified support, feedback, product discovery, and close-the-loop workflow
- Release, launch, deployment, migration, feature rollout, and rollback center
- Data quality, reconciliation, repair, backup, and restore center
- Reliability, incidents, jobs, queues, uploads, cost, capacity, and quota operations
- Founder metrics, business cadence, and weekly review
- Read-only, source-grounded AI operator assistant
- A reprioritized implementation roadmap that prevents the notification-manager program from blocking the founder’s daily homebase

## Binding product decision

`/admin` is not primarily:

- a dashboard of decorative metrics;
- an enterprise admin panel;
- a notification campaign product;
- a second project-management system;
- a raw database console;
- a replica of Cloudflare, GitHub, or analytics providers.

It is:

> **The place where Archestimator’s founder sees system truth, customer truth, product truth, and the next required action in one operational workflow.**

## Consolidated information architecture

```text
Home
  Today
  Weekly Review
  Action Inbox

Customers
  Users
  Accounts & Workspaces
  Cohorts
  Support
  Feedback & Signals

Product
  Projects
  Estimates
  Publications / Client Portals
  Product Analytics
  Acquisition & Traffic
  Business & Financials
  Feature Delivery

Operations
  Health
  Incidents
  Jobs & Queues
  Uploads & Scans
  Data Quality
  Releases
  Cost & Capacity

Communications
  Outreach
  Campaigns
  Templates
  Delivery Issues

Governance
  Feature Flags
  Audit & Security
  Privacy Requests
  Configuration
```

Existing routes remain valid during rollout. The navigation model changes before route ownership changes.

## Read order

| File | Purpose |
|---|---|
| `00-EXECUTIVE-DIRECTION.md` | Product thesis and binding decisions |
| `01-EXISTING-PLAN-GAP-AND-CONSOLIDATION-AUDIT.md` | What the current plan covers, misses, and should reprioritize |
| `02-CURRENT-ADMIN-CODEBASE-AUDIT.md` | Current routes, features, defects, and reusable foundations |
| `03-FOUNDER-JOBS-TO-BE-DONE-AND-PRD.md` | World-class PRD, jobs, outcomes, metrics, assumptions |
| `04-INFORMATION-ARCHITECTURE-UX-AND-NAVIGATION.md` | Full product structure and interaction system |
| `05-COMMAND-CENTER-ACTION-INBOX-AND-SEARCH.md` | Founder homepage, action model, search, recents, pins |
| `06-CUSTOMER-SUCCESS-AND-ENTITY-360.md` | Users, accounts, workspaces, projects, estimates, publications |
| `07-SUPPORT-FEEDBACK-AND-PRODUCT-DISCOVERY.md` | Unified customer signals and product feedback workflow |
| `08-RELEASE-LAUNCH-AND-FEATURE-DELIVERY.md` | Release readiness, deployments, flags, experiments, rollback |
| `09-OPERATIONS-DATA-QUALITY-COST-AND-CAPACITY.md` | Reliability, jobs, incidents, repair, backups, spend, quotas |
| `10-ANALYTICS-BUSINESS-SCORECARD-AND-CADENCE.md` | Product/business metrics and founder operating rhythm |
| `11-AI-OPERATOR-COPILOT.md` | Safe, cited, human-controlled AI operations |
| `12-DATA-MODEL-API-SECURITY-AND-ARCHITECTURE.md` | Technical architecture and additive schema proposals |
| `13-IMPLEMENTATION-ROADMAP.md` | Dependency-ordered product slices and unit packets |
| `14-QUALITY-RELEASE-AND-OPERATIONS.md` | Minimum sufficient evidence, rollout, rollback, support |
| `15-RISKS-DECISIONS-AND-NON-GOALS.md` | Risk register and scope controls |
| `16-INDUSTRY-RESEARCH-AND-BENCHMARKS.md` | Stripe, Linear, Sentry, PostHog, Intercom, SRE, Cloudflare, Vercel |
| `17-CONSOLIDATION-MAP-AND-TRACEABILITY.md` | Exact merger map with the existing Admin plan |
| `18-SOURCE-REGISTRY.md` | Repository and external source registry |
| `LOOP_LEDGER.md` | Lean append-only execution log |
| `PACK-MANIFEST.md` | Human-readable package inventory and authority map |
| `plan-pack.json` | Machine-readable status, traceability, hashes, DAG, and readiness |

## Consolidation rule

The completed consolidation uses these precedence rules:

1. The predecessor’s current-source defects, identity definitions, security requirements, durable notification semantics, privacy/retention boundaries, migration safety, and provider-proof honesty remain binding.
2. This pack governs founder-facing product hierarchy, action prioritization, cross-domain workflows, daily operating cadence, search, entity navigation, release management, customer success, product discovery, data quality, cost, capacity, and implementation priority.
3. Resolve conflicts in favor of the **smallest founder-useful release**, not the broadest theoretical control plane.
4. Advanced recurring campaigns, multi-operator assignment systems, and optional provider integrations cannot block the Founder Homebase MVP.
5. Financial and traffic readiness is core, but unavailable provider data remains explicitly unavailable; Admin never fabricates billing, revenue, attribution, or provider health.

The archived predecessor is historical provenance, not a second execution authority. If wording conflicts, `13-IMPLEMENTATION-ROADMAP.md`, `17-CONSOLIDATION-MAP-AND-TRACEABILITY.md`, and `plan-pack.json` govern.

## Founder Homebase MVP

The first coherent release contains:

- truthful current-source admin fixes;
- secure founder-only access;
- full-width grouped admin shell;
- global search;
- Today / Action Inbox;
- customer attention queue;
- improved User 360 plus Account/Workspace 360;
- support and feedback triage;
- production health and incident summary;
- release-readiness summary;
- data-quality findings;
- provider integration health and reconciliation exceptions;
- aggregate traffic/acquisition movement with explicit capability/privacy limits;
- financial-readiness cards that remain unavailable until a real source is connected;
- privacy requests with durable owner/status/due date;
- recent/pinned entities;
- direct links to existing upload, scan, feedback, allowlist, Cloudflare, and GitHub operations;
- simple, audited notes and follow-ups.

It deliberately does **not** require:

- complex recurring campaign scheduling;
- a full internal CRM;
- a new billing platform;
- arbitrary SQL;
- custom workflow builders;
- autonomous AI actions;
- multi-team on-call or workload routing;
- duplicating provider dashboards.

## Success definition

The Founder Homebase succeeds when Philip can begin the day in `/admin` and, without opening five unrelated systems:

- identify every urgent or overdue item;
- understand the affected customer or product object;
- take or launch the next safe action;
- know whether production and the next release are healthy;
- see the product funnel and customer movement;
- understand traffic/acquisition movement and the current financial-data boundary;
- record a follow-up or decision;
- leave with an empty or intentionally snoozed action inbox.

The success metric is not “number of admin pages implemented.” It is **reduced founder operating latency and fewer missed obligations**.
