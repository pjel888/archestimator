# 17 — Consolidation Map and Requirements Traceability

## 1. Consolidation objective

The predecessor has been combined with the Founder Homebase supplement into this one executable plan without:

- duplicate units;
- conflicting route ownership;
- duplicate requirements;
- two ledgers;
- notification work blocking founder core;
- losing existing security/detail.

The archived predecessor at `.ai/09_archive/store/2026-07-12-Admin-Feature-Improvement-superseded` is provenance only. `13-IMPLEMENTATION-ROADMAP.md` is the sole execution authority, `LOOP_LEDGER.md` is the sole durable execution ledger, and `plan-pack.json` is the sole machine-readable status/traceability authority.

## 2. Existing plan unit map

| Existing unit | Keep/change | Consolidated interpretation |
|---|---|---|
| UNIT-001 Reconcile current state | Keep | Foundation F0 |
| UNIT-002 Correctness repairs | Keep | Foundation F0 |
| UNIT-003 Capabilities/security | Keep | Foundation F0 |
| UNIT-004 Identity reconciliation | Keep | Foundation F0 |
| UNIT-005 User 360 | Keep and expand | F3 Customer 360 |
| UNIT-006 Account/session operations | Keep | F0/F3 |
| UNIT-007 Notification schema/lifecycle | Reprioritize | F9 Communications; implement reduced MVP first |
| UNIT-008 Campaign authoring | Reprioritize | F9 after Founder core |
| UNIT-009 Scheduler/recurrence | Defer | F10 advanced scale |
| UNIT-010 Fanout/metrics/preferences | Split | Basic run/delivery in F9; advanced queue/digests later |
| UNIT-011 Support | Keep and expand | F4 Support & Signals |
| UNIT-012 Flags/maintenance | Keep and expand | F5 Feature Delivery; maintenance requires real boundary |
| UNIT-013 Audit/privacy/retention | Keep | F0/F6 governance |
| UNIT-014 Operations/incidents/analytics | Split/expand | F6 + F8 |
| UNIT-015 Hardening | Keep | Per-slice integration/final |
| UNIT-016 Local release evaluation | Keep | Final milestone |
| UNIT-017 Provider proof | Conditional | After local founder value |
| UNIT-018 Optional providers | Defer | F10 |
| UNIT-019 Production cutover | Keep | Final release |

## 3. New slices to add

| New slice | Why existing pack is insufficient |
|---|---|
| F1 Shell/Search/Recents/Pins | No cross-domain navigation/search |
| F2 Today/Action Inbox | Attention queue is not a modeled workflow |
| F3 Customer Success/Account 360 | User 360 lacks founder follow-up and health |
| F4 Signals/Product Discovery | Feedback ends at review status |
| F5 Release Center | Release exists only as implementation proof |
| F6 Data Quality/Repair/Cost | Operations lacks integrated findings and capacity |
| F7 Project/Estimate/Publication 360 | No object-level operating context |
| F8 Founder Scorecard/Weekly Review | Analytics lacks cadence/definitions |
| F9 Communications MVP reprioritization | Advanced campaign design too early |
| F10 AI/Providers/Scale | Conditional leverage |

## 4. Requirement traceability

The manifest groups the detailed `FH-*` requirements into executable slices without discarding the detail:

| Manifest requirement | Unit | Detailed requirement range |
|---|---|---|
| REQ-001 Foundation truth/security | UNIT-001 / F0 | FH-005, FH-010, FH-050, FH-052, FH-053, FH-056, FH-060 |
| REQ-002 Shell/search/recents | UNIT-002 / F1 | FH-001, FH-006–009, FH-055 |
| REQ-003 Today/Action Inbox | UNIT-003 / F2 | FH-002–004, FH-014–015 |
| REQ-004 Customer success/360 | UNIT-004 / F3 | FH-010–015 |
| REQ-005 Support/signals | UNIT-005 / F4 | FH-020–024 |
| REQ-006 Release/feature delivery | UNIT-006 / F5 | FH-024–030 |
| REQ-007 Operations/data quality | UNIT-007 / F6 | FH-031–039, FH-051, FH-064, FH-067–068 |
| REQ-008 Project/estimate/publication 360 | UNIT-008 / F7 | FH-016–019 |
| REQ-009 Analytics/cadence/cost | UNIT-009 / F8 | FH-038, FH-040–044, FH-061–066 |
| REQ-010 Communications MVP | UNIT-010 / F9 | FH-045–047 |
| REQ-011 Conditional scale/AI/providers | UNIT-011 / F10 | FH-048–049, FH-057 |

| ID | Requirement | Source | Primary slice |
|---|---|---|---|
| FH-001 | Admin is founder homebase | User context | F1/F2 |
| FH-002 | Urgent work visible within 30 seconds | Founder PRD | F2 |
| FH-003 | Unified cross-domain Action Inbox | Gap audit | F2 |
| FH-004 | Accept/duplicate/decline/snooze | Linear benchmark | F2/F4 |
| FH-005 | Source remains canonical | Architecture principle | All |
| FH-006 | Global entity search | Stripe benchmark/current gap | F1 |
| FH-007 | Exact ID/email/code search | Operator need | F1 |
| FH-008 | Recents/pins/saved views | Stripe/current gap | F1 |
| FH-009 | Grouped full-width shell | Current UX gap | F1 |
| FH-010 | User 360 truthful identity/activity | Existing plan | F0/F3 |
| FH-011 | Account/Workspace 360 | Gap audit | F3 |
| FH-012 | Customer activation stage | Founder need | F3/F8 |
| FH-013 | Explainable customer health | Customer success | F3 |
| FH-014 | Founder notes/follow-ups | Solo-founder need | F2/F3 |
| FH-015 | Customer attention queue | Founder need | F2/F3 |
| FH-016 | Project 360 | Current gap | F7 |
| FH-017 | Estimate 360 | Current gap | F7 |
| FH-018 | Publication/Client Portal 360 | Product strategy | F7 |
| FH-019 | Recipient funnel and decisions | Current publication domain | F7/F8 |
| FH-020 | Support customer context | Intercom benchmark | F4 |
| FH-021 | Internal note separated from reply | Security | F4 |
| FH-022 | Feedback themes/duplicates | Product discovery | F4 |
| FH-023 | Link signals to GitHub/Notion | Build-system boundary | F4 |
| FH-024 | Close-the-loop workflow | Customer success | F4/F5 |
| FH-025 | Release records | Current gap/Vercel benchmark | F5 |
| FH-026 | Go/no-go/check evidence | Release safety | F5 |
| FH-027 | Commit/deployment/migration/flag linkage | Release context | F5 |
| FH-028 | Rollback reference | Release safety | F5 |
| FH-029 | Post-deploy health | Sentry/Vercel pattern | F5/F6 |
| FH-030 | Feature owner/review/expiry | Flag governance | F5 |
| FH-031 | Incidents durable lifecycle | Ops need | F6 |
| FH-032 | Golden signals and product symptoms | Google SRE | F6 |
| FH-033 | Jobs/queues/backlog/DLQ | Current stack | F6 |
| FH-034 | Upload/scan integration | Current tools | F6 |
| FH-035 | Data-quality findings | Current gaps | F6 |
| FH-036 | Curated dry-run repair commands | Data integrity | F6 |
| FH-037 | Migration/backup/restore freshness | Release/resilience | F6 |
| FH-038 | Cost/capacity thresholds | Solo-founder need | F6/F8 |
| FH-039 | Provider evidence levels | Existing plan | F6 |
| FH-040 | Canonical activation/funnel | Analytics need | F8 |
| FH-041 | Retained professional use | Product metric | F8 |
| FH-042 | Publication conversion metrics | Product differentiation | F8 |
| FH-043 | Weekly founder review | Solo operating cadence | F8 |
| FH-044 | Not-instrumented is explicit | Truth | F8 |
| FH-045 | One-time targeted outreach MVP | Reprioritized campaigns | F9 |
| FH-046 | Audience preview/count | Communication safety | F9 |
| FH-047 | Idempotent publish/history/failure | Existing plan | F9 |
| FH-048 | Recurring campaigns deferred | Priority decision | F10 |
| FH-049 | AI source-cited/read-only | AI safety | F10 |
| FH-050 | High-risk actions human-confirmed | Security | All |
| FH-051 | No arbitrary SQL | Existing plan | F6 |
| FH-052 | Last founder/admin protection | Security | F0 |
| FH-053 | Fresh auth/reason/affected rows | Security | F0/all writes |
| FH-054 | Fragmented settings consolidate once | Architecture | Cross-slice |
| FH-055 | Mobile triage, desktop authoring | UX | F1 |
| FH-056 | Partial/stale/unavailable states | Truth | All |
| FH-057 | Advanced providers cannot block local value | Priority | All |
| FH-058 | One consolidated ledger | Repo planning discipline | Execution |
| FH-059 | Tests/browser are user-gated | Repo policy | Quality |
| FH-060 | No duplicate domain mutation owners | Architecture | All |
| FH-061 | Financial scorecard is integration-ready before a provider exists | Founder requirement | F8 |
| FH-062 | Billing customer/subscription/invoice/payment state maps to canonical accounts | Stripe research/future integration | F8 |
| FH-063 | Failed payments, refunds, disputes, and recurring-revenue movement are actionable when connected | Financial operations | F8 |
| FH-064 | Provider pull/webhook delivery, freshness, lag, replay, and reconciliation are visible | Integration operations | F6/F8 |
| FH-065 | Landing path/referrer/traffic movement is visible without pretending provider capabilities | Cloudflare Web Analytics research | F8 |
| FH-066 | Traffic-to-signup/activation attribution is privacy-safe and certainty-labeled | Analytics/privacy | F8 |
| FH-067 | Runtime errors distinguish invocation status, HTTP outcome, log evidence, release, and affected customer | Cloudflare/OWASP research | F5/F6 |
| FH-068 | Privacy requests have durable owner, status, due date, and canonical export/delete workflow | Governance requirement | F3/F6 |

## 5. Conflicts and resolutions

### Conflict: campaign priority

Existing plan: major central mission.  
Supplement: valuable but not founder core.

**Resolution:** retain deep design; move full recurrence/scheduler after Home, customers, releases, operations. Implement one-time targeted outreach first.

### Conflict: information architecture

Existing plan: route list oriented around control-plane domains.  
Supplement: founder jobs and grouped domains.

**Resolution:** use supplement IA; preserve existing paths through aliases.

### Conflict: “attention queue”

Existing plan: conceptual overview widget.  
Supplement: durable derived action system.

**Resolution:** adopt explicit action contract and state.

### Conflict: User 360 scope

Existing plan: user-centric source aggregation.  
Supplement: customer success plus linked entity 360.

**Resolution:** keep canonical identity; add health, activation, notes, follow-ups, account/project/estimate/publication links.

### Conflict: operations

Existing plan: route-level support/flags/audit/observability/analytics.  
Supplement: cross-domain operations, releases, data quality, cost, capacity.

**Resolution:** split old Unit 014 across F5/F6/F8.

### Conflict: plan ceremony

Existing plan: manifest/receipt-heavy execution.  
Repo policy: minimum durable artifacts.

**Resolution:** consolidated plan uses one implementation plan, one lean ledger, and proportional evidence.

## 6. Canonical merged plan title

**Admin Founder Homebase and Control Plane**

## 7. Canonical merged mission

> Build a secure, truthful, action-oriented Founder Homebase that lets Archestimator’s solo operator manage customer success, product feedback, releases, communications, data integrity, and production operations from one context-rich control plane.

## 8. Final consolidation checklist

- [x] Existing P0 defects retained in F0/UNIT-001.
- [x] Identity/event semantics retained.
- [x] High-risk security retained.
- [x] New founder mission adopted.
- [x] Navigation grouped.
- [x] Search added.
- [x] Action contract added.
- [x] Customer success added.
- [x] Account/Workspace/Project/Estimate/Publication 360 added.
- [x] Support and Signals integrated.
- [x] Release Center added.
- [x] Data Quality/Repair added.
- [x] Cost/Capacity added.
- [x] Founder scorecard/cadence added.
- [x] Financial-readiness and provider reconciliation added without inventing a billing platform.
- [x] Traffic/acquisition capability and privacy limits added.
- [x] Provider integration health, error/log truth, and privacy-request operations added.
- [x] Notification program reprioritized without losing durable semantics.
- [x] AI deferred/read-only.
- [x] Fragmented tools migration staged.
- [x] One implementation plan (`13-IMPLEMENTATION-ROADMAP.md`).
- [x] One ledger (`LOOP_LEDGER.md`).
- [x] Test authorization and `NOT_REQUIRED` default preserved.
- [x] Conditional provider work separated.
- [x] Predecessor archived with no active copy.

## 9. Supersession receipt

No old requirement is silently deleted:

- predecessor Units 001–006 map into F0/F3;
- Units 007–010 map into F9/F10, with one-time targeted outreach in core and recurrence/scale conditional;
- Units 011–014 map into F4/F5/F6/F8;
- Unit 015 is applied per slice rather than retained as a broad hardening phase;
- Units 016–019 remain local-release, hosted-proof, optional-provider, and production-cutover boundaries after the product slices;
- old fixed test commands and staffing counts are superseded by the lean evidence contract, not carried forward as standing work.
