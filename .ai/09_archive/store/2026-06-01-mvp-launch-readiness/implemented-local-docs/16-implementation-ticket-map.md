# Implementation Ticket Map

## Fourth-Pass Closed Beta Ticket Reprioritization - 2026-06-02

New P0/P1 tickets:

- `BETA-AUTH-001` Add closed beta allowlist schema/RLS.
- `BETA-AUTH-002` Add server-side beta access check helper.
- `BETA-AUTH-003` Gate workshop access for non-whitelisted authenticated users.
- `BETA-AUTH-004` Add access denied / pending beta UX.
- `BETA-AUTH-005` Add tests for whitelist access states.
- `BETA-AUTH-006` Update `.env.example` and deployment runbook for closed beta mode.
- `BETA-COPY-001` Closed beta landing/pricing copy update.
- `BETA-LEGAL-001` Beta terms/privacy/AUP/disclaimer route update.
- `BETA-FEEDBACK-001` Feedback capture path.
- `BETA-OPS-001` Closed beta runbook and manual whitelist process.
- `BETA-DEMO-001` Closed beta demo workspace/data.
- `BETA-QA-001` Whitelist/auth/onboarding smoke tests.

Payment/billing tickets move to deferred/post-beta:

- Stripe setup.
- Checkout.
- Subscription plans.
- Paid entitlements.
- Invoices.
- Billing portal.
- Public pricing enforcement.

All tickets are PR-ready planning units. Before editing code for any ticket, run targeted graph impact analysis for listed symbols and update `15-blast-radius-register.md`.

## PR Sequence

| PR | Tickets | Stop/go gate |
| --- | --- | --- |
| PR-1 | `AI-001`, `INFRA-001` env slice, `QA-002` AI tests | AI invisible and routes fail closed by default. |
| PR-2 | `ONB-001`, `AUTH-001` | Hosted auth and first-run smoke pass. |
| PR-3 | `LIB-001`, `TPL-001` | Library/template demo quality and tests pass. |
| PR-4 | `UNLINK-001`, `SEC-001` unlink slice | Detached rows safe, no library mutation. |
| PR-5 | `EXP-001`, `PERF-001` export slice | Professional workbook + formula/perf proof. |
| PR-6 | `INFRA-002`, `SEC-001` platform slice | RLS/storage/Resend proof green. |
| PR-7 | `LEGAL-001`, `OBS-001` | Legal/support/monitoring ready. |
| PR-8 | `DATA-001`, `QA-002` full matrix | Backup/DR and zero-defect matrix pass. |
| PR-9 | `DEMO-001`, `BETA-001` | Investor demo and beta program ready. |

## Tickets

### AI-001 — Disable Ask Flip / AI for MVP

- Phase: PR-1
- Priority: P0
- Owner: Engineering
- Goal: No AI UI is visible and no AI route can call provider/tools/audit/write paths unless explicit post-MVP flags re-enable it.
- Exact files/symbols: `src/components/workshop/WorkshopPageShell.tsx`, `src/components/workshop/EstimateCopilotFloatingButton.tsx`, `src/app/api/ai/ask/route.ts`, `src/app/api/ai/package-builder/route.ts`, `src/lib/ai/feature-flags.ts`, `.env.example`.
- Implementation steps: add `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED=false` and `ARCHESTIMATOR_AI_ENABLED=false`; gate UI before rendering; gate route handlers before importing/calling provider-capable work; keep existing subflags inert while global flag is false; document reactivation conditions.
- Data/schema changes: none.
- Env/config changes: add production defaults false to env manifest.
- Tests: UI absence test, route disabled status test, provider mock not called, package-builder Apply/Draft not reached.
- Manual QA: `/workshop` footer has no Ask Flip affordance; direct POSTs to AI routes fail closed.
- Acceptance criteria: no provider call, no audit/tool/memory/write path when disabled.
- Rollback: set flags true only after ADR reactivation and tests; revert UI gate if AI formally returns.
- Dependencies: none.
- Risk: high if incomplete.
- Evidence artifact required: test output plus screenshot.

### INFRA-001 — Vercel / Supabase / Resend Production Config Audit

- Phase: PR-1 and PR-6
- Priority: P0
- Owner: Release Engineering
- Goal: Complete env, deployment, callback, storage, migration, rollback, and provider configuration plan/proof.
- Exact files/symbols: `.env.example`, `.github/workflows/ci.yml`, `next.config.ts`, `src/lib/auth/redirects.ts`, Supabase project settings, Vercel env dashboard.
- Implementation steps: inventory all env vars; update `.env.example`; pin release env values in Vercel; verify preview/staging/prod separation; verify Supabase auth callback URLs; document rollback.
- Data/schema changes: none unless migration proof discovers drift.
- Env/config changes: all runtime/provider variables in `22-infrastructure...md`.
- Tests: build, deploy smoke, auth callback smoke.
- Manual QA: Vercel preview/prod deploy and rollback drill.
- Acceptance criteria: no required runtime var undocumented; deploy and rollback proven.
- Rollback: Vercel previous deployment + env rollback.
- Dependencies: AI flags, legal domain decision.
- Risk: high.
- Evidence artifact required: deploy log, env checklist, smoke log.

### INFRA-002 — Resend Email Domain + Webhook Readiness

- Phase: PR-6
- Priority: P0 if invite/share email is visible
- Owner: Release Engineering
- Goal: Prove invite/share emails are deliverable and webhook events are verified.
- Exact files/symbols: `src/lib/email/resend-client.ts`, `src/app/api/webhooks/resend/route.ts`, `src/lib/email/resend-webhooks.ts`, share/invite email actions.
- Implementation steps: add env docs; configure sender domain; verify DKIM/SPF/DMARC; configure webhook secret; make production missing-key behavior fail loudly if a user-visible email action depends on it.
- Data/schema changes: none.
- Env/config changes: `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_REPLY_TO`, `RESEND_WEBHOOK_SECRET`.
- Tests: webhook verification, send fallback behavior, delivery-status update.
- Manual QA: send invite/share email to test inbox, receive webhook delivered/bounced/complained.
- Acceptance criteria: no mock-success in launch evidence.
- Rollback: hide email send UI or disable invite/share email path.
- Dependencies: domain/DNS access.
- Risk: high if email visible.
- Evidence artifact required: Resend dashboard and webhook log.

### PERF-001 — Redis / Caching Decision and Performance Baseline

- Phase: PR-5
- Priority: P1, P0 if public abuse/export thresholds fail
- Owner: Engineering
- Goal: Decide MVP caching/limiting approach and prove route/export performance thresholds.
- Exact files/symbols: `src/lib/publication/public-repository.ts`, `src/lib/collaboration/invite-entry.ts`, AI routes, export route, TanStack Query usage, Zustand stores.
- Implementation steps: baseline route transitions and XLSX large fixture; keep no-store on sensitive public flows; use current Postgres durable rate ledger for MVP if thresholds pass; add Upstash/Vercel KV only for hot-path atomic limiter if needed.
- Data/schema changes: none for defer; provider config if adopting Redis.
- Env/config changes: Redis provider env only if adopted.
- Tests: route perf, export large fixture, rate-limit unit/integration.
- Manual QA: investor demo routes under cold start and warm navigation.
- Acceptance criteria: thresholds in `23-performance...md` met.
- Rollback: disable public share/invite/AI throttled paths or revert Redis helper.
- Dependencies: export workbook shape.
- Risk: medium/high.
- Evidence artifact required: perf log.

### SEC-001 — RLS / Threat-Model Verification

- Phase: PR-4 and PR-6
- Priority: P0
- Owner: Security/Engineering
- Goal: Prove workspace/project/estimate/library/share/invite/storage boundaries.
- Exact files/symbols: Supabase migrations, `src/lib/supabase/types.ts`, share/invite APIs, upload/image APIs, row RPCs.
- Implementation steps: write RLS verification SQL; run linked/staging allow/deny queries; verify storage policies; test CSRF/same-origin; scan service-role usage; document route matrix.
- Data/schema changes: possible policy migration only if proof fails.
- Env/config changes: service-role remains server-only.
- Tests: SQL allow/deny, API auth/CSRF, storage denial, secret scan.
- Manual QA: cross-workspace attempts and expired/revoked token flows.
- Acceptance criteria: every public/protected route has an owner and proof.
- Rollback: disable share/invite/upload surfaces or revert policy migration.
- Dependencies: Supabase staging access.
- Risk: high.
- Evidence artifact required: SQL output and route matrix.

### OBS-001 — Observability / Error Tracking Setup

- Phase: PR-7
- Priority: P0
- Owner: Ops/Engineering
- Goal: Beta-visible errors, auth failures, export failures, and email delivery problems alert an owner.
- Exact files/symbols: `src/app/providers.tsx`, `src/components/performance-monitor.tsx`, route handlers, Vercel/Supabase/Resend dashboards.
- Implementation steps: select Sentry or equivalent; add release/env tagging; define alert thresholds; scrub PII; wire support inbox and bug-report path.
- Data/schema changes: optional event table only if not using vendor.
- Env/config changes: monitoring DSN/tokens.
- Tests: error capture smoke, no PII in logs, alert route.
- Manual QA: trigger known test error in staging; verify alert and support workflow.
- Acceptance criteria: owner receives actionable alert.
- Rollback: disable SDK via env; rely on Vercel logs temporarily.
- Dependencies: legal/privacy notice.
- Risk: high.
- Evidence artifact required: dashboard screenshots/links and incident drill note.

### ONB-001 — First-Run Onboarding and Empty Workspace Path

- Phase: PR-2
- Priority: P0
- Owner: Product/Engineering
- Goal: New users can land in `/workshop`, understand empty states, create a first project/estimate, and export without confusion.
- Exact files/symbols: `/login`, `/auth/callback`, `/workshop`, project list/create modal, estimate create/open, library/template empty states.
- Implementation steps: map first-run screens; add clear empty/error/loading copy; ensure workspace membership creation; add analytics events.
- Data/schema changes: none expected.
- Env/config changes: app origin vars.
- Tests: auth callback, empty workspace DOM tests, E2E first-run smoke.
- Manual QA: eight journey maps in `24-onboarding...md`.
- Acceptance criteria: no dead end for empty account.
- Rollback: revert copy/UI changes; keep protected auth path.
- Dependencies: auth provider config.
- Risk: high for beta.
- Evidence artifact required: screenshot/manual QA log.

### LEGAL-001 — Terms / Privacy / Beta Agreement Copy and Routes

- Phase: PR-7
- Priority: P0
- Owner: Product/Legal
- Goal: Public legal routes are accurate for closed beta and investor demos.
- Exact files/symbols: `src/app/terms/page.tsx`, `src/app/privacy/page.tsx`, `src/app/login/page.tsx`, `src/app/pricing/page.tsx`, `src/app/contact/page.tsx`.
- Implementation steps: draft legal copy from `25-legal...md`; add beta agreement/AUP route or section; update login footer and pricing disclaimers; get review.
- Data/schema changes: none.
- Env/config changes: support contact.
- Tests: route render/accessibility.
- Manual QA: legal links visible from login/footer/settings.
- Acceptance criteria: no misleading pending-review public launch page.
- Rollback: restrict public access/beta invites until reviewed.
- Dependencies: legal reviewer.
- Risk: high.
- Evidence artifact required: legal sign-off note.

### DEMO-001 — Investor / Incubator Demo Workspace and Script

- Phase: PR-9
- Priority: P0 for investor demo
- Owner: Product
- Goal: Demo the core promise without exposing unfinished AI or fragile data.
- Exact files/symbols: seed scripts/fixtures if added, demo account/workspace, export artifact.
- Implementation steps: create resettable demo data; script 8-minute path; prepare screenshots/export fallback; write FAQ answers.
- Data/schema changes: seed data only.
- Env/config changes: demo account secrets outside repo.
- Tests: seed smoke, demo route smoke.
- Manual QA: full demo rehearsal and fallback rehearsal.
- Acceptance criteria: demo can complete without touching live customer data.
- Rollback: delete/reset demo workspace.
- Dependencies: export, onboarding, legal.
- Risk: medium/high.
- Evidence artifact required: demo checklist and export file.

### BETA-001 — Beta Tester Onboarding / Support Program

- Phase: PR-9
- Priority: P0 for beta
- Owner: Product/Support
- Goal: Controlled beta cohort with clear onboarding, feedback, SLA, known limits, and data handling.
- Exact files/symbols: email copy, support docs, invite flow, feedback form.
- Implementation steps: define target profiles; write onboarding email; set support SLA; weekly feedback loop; bug severity; data loss protocol.
- Data/schema changes: none expected.
- Env/config changes: support inbox/tool.
- Tests: invite/email/support link smoke.
- Manual QA: invite one internal tester through the whole path.
- Acceptance criteria: tester has a clear support and feedback channel.
- Rollback: pause invites and notify cohort.
- Dependencies: legal/support/observability.
- Risk: high.
- Evidence artifact required: beta launch checklist.

### QA-002 — Zero-Defect Main Feature Regression Matrix

- Phase: PR-1 through PR-8
- Priority: P0
- Owner: QA/Engineering
- Goal: Every launch-visible main feature has automated, manual, and smoke coverage.
- Exact files/symbols: `tests/vitest/*`, `tests/unit/*`, `e2e/*`, Playwright config, CI workflow.
- Implementation steps: fix red DOM tests; add/adjust missing feature tests; prevent critical E2E silent skips on release; publish matrix in `33-main-feature-zero-defect-test-matrix.md`.
- Data/schema changes: test fixtures only.
- Env/config changes: E2E flags/credentials for staging.
- Tests: full command baseline.
- Manual QA: core smoke plus feature-specific matrix.
- Acceptance criteria: all P0 rows pass or release is no-go.
- Rollback: do not launch.
- Dependencies: all feature PRs.
- Risk: high.
- Evidence artifact required: command log and matrix sign-off.

### DATA-001 — Backup / Disaster Recovery Pre-Launch Proof

- Phase: PR-8
- Priority: P0
- Owner: Ops/Engineering
- Goal: Prevent data loss during beta migrations and launch operations.
- Exact files/symbols: Supabase dashboard/CLI, migrations, storage buckets, launch runbook.
- Implementation steps: verify backup/PITR; snapshot before migrations; document table restore; verify storage bucket backup; define RPO/RTO and incident owner.
- Data/schema changes: none unless adding audit marker.
- Env/config changes: backup access credentials outside repo.
- Tests: restore drill on staging or documented dry run.
- Manual QA: migration rollback rehearsal.
- Acceptance criteria: data loss response is documented and owner-approved.
- Rollback: restore backup, revert migration, disable affected feature.
- Dependencies: Supabase project plan.
- Risk: high.
- Evidence artifact required: backup proof and DR drill note.

### LIB-001 — Component Library MVP Polish

- Phase: PR-3
- Priority: P1
- Owner: Product/Engineering
- Goal: Library feels trustworthy for beta/demo.
- Exact files/symbols: `LibraryPageClient`, `component-library/*`, `component-library-manager/*`, seed data helpers.
- Steps/tests/manual QA/rollback: see `05-component-library-polish-plan.md`.
- Evidence artifact required: screenshots plus tests.

### TPL-001 — Template MVP Polish

- Phase: PR-3
- Priority: P1
- Owner: Product/Engineering
- Goal: Template discovery/insertion is understandable and reliable.
- Exact files/symbols: `TemplatesPageClient`, template sidebar/components/actions.
- Steps/tests/manual QA/rollback: see `06-template-polish-plan.md`.
- Evidence artifact required: screenshots plus tests.

### UNLINK-001 — Project-Specific Detached Row Flow

- Phase: PR-4
- Priority: P0
- Owner: Engineering/Product
- Goal: Users can detach a linked estimate row into project-specific state without mutating library data.
- Exact files/symbols: `estimate_row_items`, row RPCs, `src/lib/estimates/actions.ts`, `useEstimateRowMutations`, `EstimateSheetContent`, row details modal, publication DTOs.
- Steps/tests/manual QA/rollback: see `07-project-specific-unlink-components-plan.md`.
- Evidence artifact required: SQL/test/manual proof.

### EXP-001 — Professional Excel Bid / BOQ Workbook

- Phase: PR-5
- Priority: P0
- Owner: Engineering/Product
- Goal: Export workbook matches construction bid-form expectations.
- Exact files/symbols: `src/lib/proposal-export/types.ts`, `buildProposalExportModel`, `createProposalWorkbook`, export route, `ProposalExportPreviewDialog`.
- Steps/tests/manual QA/rollback: see `08-excel-export-industry-standard-plan.md` and `18-excel-reference-analysis.md`.
- Evidence artifact required: workbook artifact and cross-app manual QA log.
