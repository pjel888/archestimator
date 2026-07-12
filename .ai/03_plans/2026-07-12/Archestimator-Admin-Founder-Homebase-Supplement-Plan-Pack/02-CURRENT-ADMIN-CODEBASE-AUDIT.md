# 02 — Current Admin Codebase Audit

## 0. Authority, baseline scope, and freshness

Current source, migrations, `wrangler.jsonc`, `AGENTS.md`, canonical `.ai/00_system` contracts, and the active pack outrank the archived predecessor. The implementation lead must recompute `PLAN-PACK-SCOPED-BASELINE-v1` before `UNIT-001` and after any stale trigger over this exact ordered, duplicate-free path list:

1. `src/app/admin`
2. `src/app/api/admin`
3. `src/components/admin`
4. `src/lib/admin`
5. `src/lib/auth`
6. `src/lib/notifications`
7. `src/features/notifications`
8. `src/lib/repositories`
9. `src/lib/activity`
10. `src/lib/compliance`
11. `src/lib/cloudflare`
12. `src/lib/email`
13. `src/app/workshop/settings`
14. `src/components/workshop`
15. `src/hooks`
16. `migrations`
17. `worker.ts`
18. `wrangler.jsonc`
19. `package.json`
20. `.ai/09_archive/store/2026-07-11-Activity-History-Mapping-complete`
21. `.ai/09_archive/store/2026-07-11-Corporate-Accounts-complete`
22. `.ai/09_archive/store/2026-07-11-Teamwork-Feature-Audit-And-Plan-complete`
23. `.ai/09_archive/store/2026-07-12-Admin-Feature-Improvement-superseded`
24. `.ai/10_state/current-state.md`

The baseline is a planning snapshot, not implementation or test authority. Stale triggers are any change to these paths, Better Auth contracts, active migration ordering, Admin route/repository behavior, notification semantics, Cloudflare bindings/schedules, or related producer manifests. On drift, re-audit only affected claims and refresh the manifest last.

## 1. Current route inventory

### `/admin`

Implemented:

- D1 health query;
- binding-presence checks;
- open incident count;
- 30-day signup count from `profiles`;
- recent signups;
- four overview cards;
- one-point signup chart;
- external analytics links.

Material gaps:

- “Active teams” is explicitly pending;
- signup is profile creation, not necessarily canonical auth signup;
- the trend chart is approximate;
- health checks mostly prove binding presence, not usable capability;
- no action inbox;
- no customer attention;
- no release readiness;
- no search;
- no recent/pinned entities;
- no last-visit/change summary;
- no data-quality status;
- no capacity or cost.

### `/admin/users`

Implemented:

- profile list;
- email/display-name search;
- account status;
- active-session count;
- most recent session timestamp;
- suspend/ban/reactivate;
- first-page table.

Material gaps:

- only first 50 profiles are loaded;
- filtering is client-side over the loaded page;
- repository search has a current binding-order defect;
- no canonical Better Auth user coverage;
- no cursor pagination;
- no cohort/activation/customer-health columns;
- no notes/follow-up;
- no bulk eligibility preview;
- inline destructive actions have insufficient context/reason/fresh-auth protection.

### `/admin/users/[userId]`

Implemented:

- profile identity/status;
- session count/timestamp;
- corporate memberships;
- audit events where the user was the admin actor.

Material gaps:

- the “activity” timeline is not the user’s product activity;
- no projects, estimates, publications, support, feedback, invites, security, notification, or intervention history;
- no notes or follow-up;
- no activation stage;
- no risk/health explanation;
- dates are semantically ambiguous.

### `/admin/accounts`

Implemented:

- corporate account creation;
- active/archived listing;
- member/workspace relationships in related routes/actions.

Material gaps for Founder Homebase:

- no account/workspace health;
- no activation or recent product use;
- no linked support/feedback;
- no projects/estimates/publications summary;
- no owner/follow-up;
- no risk reasons;
- no full Account 360.

### `/admin/support`

Implemented:

- D1 conversations/messages;
- unread fields;
- status;
- message loading;
- admin reply;
- idempotent `clientMessageId`;
- email delivery failure state.

Material gaps:

- no assignment/owner;
- no priority;
- no SLA/age;
- no tags;
- no internal notes;
- no customer/entity side panel;
- no feedback/incident/product link;
- no merge/duplicate;
- no snooze;
- no canned replies;
- no action-inbox integration;
- two-column layout is fixed and narrow;
- one generated client message ID changes with reply state rather than being explicitly created per send attempt.

### `/admin/notifications`

Implemented:

- kind;
- severity;
- surface;
- title/body;
- optional action;
- immediate all-active-profile materialization;
- audit.

Material defects/gaps:

- no preview or recipient count before send;
- no targeted audience;
- no draft/history;
- no schedule;
- no idempotency;
- definition and delivery are not atomic with audit;
- validation does not enforce typed kind/severity/surface;
- no cancel/retract/replacement;
- no delivery issue queue;
- no read/dismiss metrics;
- current success wording can overstate downstream delivery.

### `/admin/flags`

Implemented:

- D1-backed boolean flags;
- 15-second process cache;
- admin dashboard environment override;
- audit on update;
- maintenance toggle UI.

Material gaps:

- simple key/boolean/description only;
- no owner;
- no consumer paths;
- no expiry/review date;
- no rollout or cohort targeting;
- no exposure metric;
- no release link;
- no dependency;
- maintenance behavior is not a reliable shared mutation boundary;
- no stale/unused flag cleanup.

### `/admin/audit`

Implemented underneath:

- real `admin_audit_events` repository with write/list;
- count, action filter, paging.

Current UI:

- explicitly a placeholder table.

Material gaps:

- no actor/target/outcome/request/date search;
- no sensitive-read events;
- no safe before/after view;
- no entity deep links;
- no export policy;
- no retention/hold display.

### `/admin/observability`

Implemented:

- recent cron runs;
- client errors;
- web vitals;
- ops runs;
- provider docs links.

Material gaps:

- five-row snapshots only;
- no aggregation or trend;
- no errors grouped by fingerprint/release;
- no SLO/golden-signal model;
- no queue/DLQ or upload pipeline correlation;
- no incident detail or declaration controls;
- no release correlation;
- no black-box checks;
- stored row type currently includes user-agent data that should not be generally exposed;
- provider capabilities are not read.

### `/admin/analytics`

Implemented:

- Cloudflare Web Analytics, Clarity, and GA link-outs;
- configured/not-configured labels based on public IDs/tokens.

Material gaps:

- no first-party product funnel;
- no cohort/retention;
- no feature adoption;
- no publications/client decisions;
- no customer health;
- no support/feedback;
- configured does not mean data is readable or correct.

## 2. Existing reusable foundations

The current code already supplies valuable primitives:

- server-side admin gate and no-store headers;
- platform roles;
- D1 repositories;
- admin audit writer;
- support conversation/message persistence;
- current corporate-account domain;
- feature-flag cache and update action;
- incidents table/repository;
- cron/ops/client-error/web-vital events;
- notification definition/delivery tables;
- current workshop access allowlist;
- feedback review queue;
- upload operations dashboard;
- scan override review;
- publication/shared-link activity and recipient decisions;
- project/estimate/activity repositories;
- Cloudflare bindings and operational scripts.

The correct plan composes these before inventing replacements.

## 3. Fragmented founder tools

The workshop settings currently contain operational tools that belong in the founder’s mental Admin model:

| Current route | Function | Consolidation recommendation |
|---|---|---|
| `/workshop/settings/users` | Access allowlist | Link from Customers first; later move mutation ownership to Admin |
| `/workshop/settings/feedback` | Authenticated feedback triage | Integrate read model into Signals; retain source action until migrated |
| `/workshop/settings/upload-operations` | Upload throughput/backlog | Surface status in Operations; link to current route |
| `/workshop/settings/scan-overrides` | Failed scan review/override | Add Action Inbox source; link/migrate only once |
| Workshop activity views | Domain events | Reuse as entity timelines |
| Publisher/shared-link activity | Recipient engagement/decisions | Reuse in Publication/Client Portal 360 |

## 4. Current UX findings

### Strengths

- consistent dense product styling;
- server-rendered route pages;
- simple, direct navigation;
- reusable UI primitives;
- readable tables for small datasets;
- truthful placeholder copy in several routes.

### Weaknesses

- almost every page uses a centered `max-w-6xl`, wasting wide desktop space;
- typography frequently uses 9–10px for operational content;
- sidebar is a flat list, not grouped by operating domain;
- no count badges or action-state indicators;
- no global search;
- no keyboard command surface;
- no context drawer;
- no recent/pinned items;
- no saved filters/views;
- status, source, and as-of semantics are inconsistent;
- empty/error/degraded states vary;
- pages are route silos rather than workflows.

## 5. Current data-truth findings

### Signup

`countSignups()` counts `profiles.created_at`.

This is profile-provision evidence, not guaranteed canonical Better Auth account creation.

### Activity

`listAdminUserActivity()` queries `admin_audit_events` where `actor_user_id` equals the user.

This measures the user acting as an admin, not the user’s product activity.

### Health

Health probes currently prove:

- D1 answers `SELECT 1`;
- optional bindings exist.

They do not prove:

- R2 read/write;
- Queue enqueue/consumer;
- Email delivery;
- DO request;
- Images transform;
- end-user route health.

### Analytics

Public token presence is configuration evidence only.

### User action

The profile status update does not currently assert affected rows before reporting success.

### Notification delivery

A delivery row is materialization in D1, not proof the user saw a toast, center item, modal, email, or push.

## 6. Current security findings

The existing admin gate is a useful foundation, but high-impact action behavior is incomplete:

- self-target is blocked for user status;
- peer-admin/founder floor is not fully enforced;
- reason is missing;
- session revocation is not coupled;
- fresh-auth is absent;
- affected-row verification is absent;
- audit is separate from the status mutation;
- action capabilities are broad role checks;
- sensitive-read audit is absent.

## 7. Current architecture finding

The current route structure is viable.

The product does not need a rewrite of Next.js routing.

Recommended architecture:

- preserve route pages and Server Components;
- introduce grouped shell/navigation;
- create server-owned cross-domain read models;
- use independent Suspense/error boundaries on Home;
- add narrow actions for action-item state, notes, search, releases, and repairs;
- preserve each domain’s mutation owner.

## 8. Immediate defects to carry into consolidation

The consolidated plan must keep P0 remediation for:

- searched-user SQL binding order;
- affected-row verification;
- protected admin/founder floor;
- fake audit UI;
- user activity semantics;
- notification validation, ID, atomicity, and idempotency;
- maintenance-mode enforcement or removal;
- placeholder Admin APIs;
- misleading health/configuration claims;
- cross-source identity reconciliation.

## 9. Codebase conclusion

Archestimator already has enough operational data to build a useful Founder Homebase.

The biggest missing layer is not more raw data. It is:

- normalization;
- source provenance;
- entity linking;
- prioritization;
- safe action;
- operating cadence.

That layer should be built before expanding into a full campaign platform or third-party analytics ingestion.
