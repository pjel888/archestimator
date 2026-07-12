# 18 — Source Registry

## 1. Repository

**Repository:** `pjel888/archestimator`  
**Branch audited:** local `main` worktree; current source remains authoritative  
**Audit date:** 2026-07-12

The user-supplied predecessor was archived after consolidation at:

`.ai/09_archive/store/2026-07-12-Admin-Feature-Improvement-superseded`

## 2. Archived predecessor Admin plan

- `.ai/09_archive/store/2026-07-12-Admin-Feature-Improvement-superseded/README.md`
- `IMPLEMENTATION_PLAN.md`
- `01_EXECUTIVE_SUMMARY_AND_TARGET_STATE.md`
- `02_SCOPE_NON_GOALS_AND_TERMINOLOGY.md`
- `03_SOURCE_CODEBASE_AND_STALENESS_AUDIT.md`
- `04_ADMIN_INFORMATION_ARCHITECTURE_UX_AND_ACCESSIBILITY.md`
- `09_OPERATIONS_SUPPORT_FLAGS_OBSERVABILITY_AND_ANALYTICS.md`
- `15_REQUIREMENTS_TRACEABILITY_AND_FINAL_AUDIT.md`
- `16_RESEARCH_AND_SPECIALIST_EVIDENCE.md`
- related numbered docs, manifest, and ledger

## 3. Repository governance

- `AGENTS.md`
- `.agents/skills/archestimator-plan-pack/SKILL.md` when present; otherwise the canonical planning prompt suite
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
- `.ai/00_system/VALIDATION_MATRIX.md`
- `.ai/00_system/PERFORMANCE_LOADING_AND_MOUNT_PROTOCOL.md`

Key repository rules applied:

- lean, proportional planning;
- tests/browser/builds user-gated;
- plan pack only for high-blast-radius/exhaustive work;
- one loop: discover → plan → execute → verify → record → decide;
- minimum durable artifacts;
- no provider claims beyond evidence;
- Cloudflare is active runtime;
- no paid add-ons without approval.

## 4. Current Admin route/source audit

### Shell

- `src/app/admin/layout.tsx`
- `src/app/admin/page.tsx`
- `src/components/admin/AdminShell.tsx`
- `src/components/admin/AdminSidebar.tsx`
- `src/components/admin/AdminHeader.tsx`

### Users

- `src/app/admin/users/page.tsx`
- `src/app/admin/users/[userId]/page.tsx`
- `src/components/admin/AdminUsersTable.tsx`
- `src/lib/admin/users-repository.ts`
- `src/lib/admin/user-actions.ts`
- `src/app/api/admin/users/route.ts`

### Accounts

- `src/app/admin/accounts/page.tsx`
- corporate account repositories/actions/components referenced by route

### Support

- `src/app/admin/support/page.tsx`
- `src/components/admin/AdminSupportInbox.tsx`
- `src/lib/repositories/support-conversations-repository.ts`
- support Admin actions/routes

### Notifications

- `src/app/admin/notifications/page.tsx`
- `src/components/admin/AdminNotificationBroadcast.tsx`
- `src/lib/admin/notification-actions.ts`

### Flags

- `src/app/admin/flags/page.tsx`
- `src/lib/admin/feature-flags.ts`
- `src/lib/admin/flag-actions.ts`

### Audit

- `src/app/admin/audit/page.tsx`
- `src/lib/admin/audit-repository.ts`

### Observability/incidents/health

- `src/app/admin/observability/page.tsx`
- `src/lib/admin/observability-repository.ts`
- `src/lib/admin/incidents-repository.ts`
- `src/lib/admin/health-probes.ts`

### Analytics

- `src/app/admin/analytics/page.tsx`

## 5. Fragmented current operator tools

- `src/app/workshop/settings/users/page.tsx`
- `src/app/workshop/settings/feedback/page.tsx`
- `src/app/workshop/settings/upload-operations/page.tsx`
- `src/app/workshop/settings/scan-overrides/page.tsx`
- `src/components/workshop/WorkshopSettingsModalContentView.tsx`
- upload operations and scan override repositories/components
- feedback and allowlist admin actions/repositories

## 6. Related domains to reuse during implementation

- Better Auth/session/current-user modules
- roles and authorization
- account/workspace/project/estimate repositories
- project/estimate activity
- publication/shared-link repositories/actions/activity
- component-library and estimate data-quality helpers
- uploads/scans/storage
- notification definitions/deliveries
- support conversations/messages
- operational incidents/events
- cron/queue/outbox scripts and tables
- migrations
- current release/restore/readiness scripts
- current product analytics event producers

These must be re-read immediately before implementation because repository state is active.

## 7. Official external sources

### Dashboard/search/entity operations

- [Stripe Dashboard basics](https://docs.stripe.com/dashboard/basics)
- [Stripe Dashboard search](https://docs.stripe.com/dashboard/search)

### Triage/inbox

- [Linear Triage](https://linear.app/docs/triage)
- [Linear Inbox](https://linear.app/docs/inbox)

### Observability/release health/jobs

- [Sentry product walkthroughs](https://docs.sentry.io/product/)
- [Cloudflare Workers Observability](https://developers.cloudflare.com/workers/observability/)
- [Vercel deployments](https://vercel.com/docs/deployments)
- [Vercel Observability](https://vercel.com/docs/observability)

### Product analytics/flags/feedback

- [PostHog product analytics](https://posthog.com/docs/product-analytics)
- [PostHog feature flags](https://posthog.com/docs/feature-flags)
- [PostHog surveys](https://posthog.com/docs/surveys)

### Customer support

- [Intercom Inbox](https://www.intercom.com/helpdesk/inbox)

### Reliability/incident practice

- [Google SRE — Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- [Atlassian incident response](https://www.atlassian.com/incident-management/incident-response)

### PRD structure

- [Atlassian product requirements template](https://www.atlassian.com/software/confluence/templates/product-requirements)

### Security sources already used by existing plan

- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- Better Auth Admin/session documentation referenced by existing plan
- current Next.js documentation referenced by existing plan

## 8. Evidence not produced

- visual screenshot audit of `/admin`;
- browser interaction audit;
- current hosted Admin proof;
- current D1 row/query counts;
- provider API usage/cost data;
- current GitHub Actions/deployment state inside the application;
- data-quality check execution;
- tests/build;
- migration design review;
- legal/privacy approval;
- user interviews beyond founder context.

These are implementation/release evidence, not hidden planning claims.
