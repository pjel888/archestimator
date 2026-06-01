# MVP Launch Readiness Command Center

## Fourth-Pass Closed Beta Revision - 2026-06-02

This folder is now the source of truth for a closed beta MVP launch, not a public paid launch. Any older public-commercial launch wording below is superseded by this fourth-pass decision.

- Launch type: closed beta MVP.
- Audience: invited beta testers, founder-led prospects, investors, and startup incubator reviewers.
- Access: Google Sign-In plus server-side email whitelist.
- Beta cohort: manually approved and managed by Philip.
- Payments: no Stripe, checkout, subscriptions, billing UI, invoices, paid plans, or plan enforcement.
- Pricing: hidden or reframed as invitation-only beta access; future pricing only.
- Ask Flip: deferred/hidden for closed beta unless separately made safe and explicit.
- Core product: project, estimate, component library, template, unlink, and Excel export workflows must still be useful and production-grade enough for beta.
- First implementation PR recommendation: `BETA-AUTH-001` through `BETA-AUTH-006` for closed beta access control.
- Go/no-go rule: closed beta cannot launch until allowlist enforcement, whitelisted first-run access, feedback/support, beta legal/privacy, rollback, and core workflow smoke evidence pass.

New fourth-pass documents:

- `37-closed-beta-access-whitelist-plan.md`
- `38-closed-beta-scope-and-nonpayment-plan.md`
- `39-closed-beta-onboarding-and-feedback-plan.md`
- `40-closed-beta-operations-runbook.md`
- `41-beta-access-security-threat-model.md`
- `42-closed-beta-copy-and-legal-pack.md`
- `43-closed-beta-readiness-scorecard.md`
- `44-beta-user-management-implementation-spec.md`
- `45-fourth-pass-closed-beta-council-review.md`
- `46-manual-proof-matrix.md`
- `47-goal-completion-audit.md`

Third-pass audit date: 2026-06-02
Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`
Status: **NO-GO for closed beta and investor demo until all closed-beta P0 gates have hosted/provider/manual proof. Public paid launch remains a separate post-beta gate.**

Final local implementation report: `final-codex-implementation-report.md`.
Stable full local baseline: `c5ca065`.
Final report baseline: `8084908`.
Current local validation refresh: `a65b34b` (`bun run validate` pass; DOM 131 files / 1022 passed / 2 skipped).
Current local app build refresh: `e6cf52b` (`bun run build` pass; Next.js 16.2.6 / Turbopack; 29 static pages).

This folder is the single launch execution package for the MVP readiness push. Do not create a competing MVP folder. Local-safe product and documentation slices are now implemented and recorded here; hosted/provider/manual proof gates remain the launch blocker.

## Scope Lock

Ships in MVP:

- Structured project estimating with protected workspace/project/estimate routes.
- Component library browse/create/insert path.
- Estimate template browse/preview/insert path.
- Project-specific estimate rows using `estimate_row_items` as the source of truth.
- Professional Excel bid/BOQ export after workbook contract implementation.
- Clean auth/onboarding path into `/workshop`.
- Safe share/invite foundations only if email, token, RLS, and legal proof pass.
- Vercel + Supabase launch stack with documented rollback; Resend is required only for visible email-dependent flows.
- Legal/privacy/support/monitoring posture appropriate for closed beta and investor review.

Deferred from MVP:

- Ask Flip / AI assistant UI and callable AI routes.
- AI package-builder write flows.
- Billing/payment implementation, fully deferred until after closed beta.
- PDF proposal generation.
- Contractor bid tabulation.
- Redis-backed queue/export workers unless the performance gate fails.

## What Changed From Second Pass

| Area | Third-pass correction |
| --- | --- |
| Evidence | Local baseline is green through `c5ca065`; current validation refresh at `a65b34b` passes `bun run validate`; current app build refresh at `e6cf52b` passes `bun run build`. Hosted/provider/manual proof remains open. |
| AI deferral | Upgraded from "defer AI" intent to a concrete global flag, UI-hide, route-fail-closed, provider-call-prevention contract. |
| Unlinked components | Corrected the contract: project-specific components are `estimate_row_items`, not reusable `cost_library_items`; `detached` is the final state for rows separated from a real library source. |
| Excel export | Reframed current export as insufficient for launch; added bid-form workbook contract, formula gates, and cross-spreadsheet manual QA. |
| Infrastructure | Added Vercel/Supabase/Resend env, DNS, callback, webhook, storage, preview/staging/prod, and rollback requirements. |
| Performance | Added Redis decision criteria and MVP caching matrix; Redis is not a broad cache requirement, but hot-path limiter adoption remains a P1/P0 decision if public abuse surfaces stay visible. |
| Security | Added STRIDE, RLS verification, API route matrix, service-role, token, webhook, CSRF, XSS, and logging risks. |
| Legal/support | Added Terms, Privacy, beta agreement, AUP, data deletion, support inbox, incident response, and no-go conditions. |
| Ticketing | Converted launch work into PR-ready tickets with files, symbols, tests, rollback, and evidence artifacts. |

## P0 Blockers

| ID | Blocker | Required proof |
| --- | --- | --- |
| AI-001 | Ask Flip visible / AI callable risk. | Locally implemented: AI UI hidden by default, `/api/ai/*` fail closed before handler/provider/session/tool work, no handler calls in route tests. Production env proof still required. |
| EXP-001 | Excel export cross-app proof missing. | Local professional workbook and ExcelJS tests pass; Excel plus at least one secondary spreadsheet app open/print proof remains required. |
| UNLINK-001 | Project-specific unlink linked/manual proof missing. | Local RPC/action/hook/UI/tests prove library data cannot be mutated; linked SQL verification and manual detach/edit proof remain required. |
| AUTH-001 | Hosted auth path lacks production proof. | Google OAuth, magic link, callback, first workspace, and logout/session-expiry smoke on staging/prod. |
| INFRA-001 | Vercel/Supabase/Resend env and rollback proof missing. | Env manifest, callback URLs, DNS, webhooks, storage policies, deploy/rollback runbook proof. |
| SEC-001 | RLS/security threat model proof missing. | RLS denial queries, route access matrix, storage denial, CSRF/share/invite token tests. |
| LEGAL-001 | Legal review proof missing. | Local closed-beta Terms/Privacy copy exists; owner/counsel review remains required. |
| OBS-001 | Monitoring/support proof missing. | Local feedback link, runbook, and `/api/health` exist; monitored inbox, uptime alert, and error alert proof remain required. |
| DATA-001 | Backup/DR proof missing. | Backup/PITR/storage/migration rollback proof before beta data or linked migration apply. |
| QA-002 | External/manual smoke incomplete. | Local type/lint/design/unit/full DOM/build baseline is green; hosted/manual E2E and provider proof remain required. |

## P1 Polish / Non-Blocking Debt After P0

- Component library search/filter trust fields, empty/loading/error copy, and seed data quality.
- Template discovery/preview/insertion feedback.
- Route-transition performance production benchmark and manual Chrome proof.
- Redis/Upstash limiter if public share/invite/AI/email abuse thresholds are exceeded.
- Sentry/Web Vitals dashboards beyond minimum launch alerts.
- Investor demo reset tooling and screenshot/export artifact pack.

## Readiness Scorecard Summary

Rules: below 90 is not beta-ready; P0 domains below 95 block launch; 100 requires complete evidence, not a plan.

| Domain | Score | Launch posture |
| --- | ---: | --- |
| Product core | 84 | Local pass; manual smoke gap |
| Estimate editor | 84 | Local pass; linked/manual proof gap |
| Component library | 86 | Local polish pass; screenshot/manual proof gap |
| Templates | 86 | Local polish pass; screenshot/manual proof gap |
| Project-specific unlink | 86 | Local pass; linked/manual proof gap |
| Excel export | 88 | Local workbook pass; cross-app proof gap |
| Auth/onboarding | 82 | Hosted smoke gap |
| Infrastructure/deployment | 78 | Provider/deploy proof gap |
| Email/Resend | 50 | P0 if visible share/invite email ships |
| Security/RLS | 78 | Linked proof gap |
| Legal/privacy | 82 | Review proof gap |
| Performance/caching | 65 | P1 unless thresholds fail |
| Observability/support | 78 | Alert/inbox proof gap |
| QA/test coverage | 82 | Hosted/manual proof gap |
| Investor demo readiness | 76 | Rehearsal/artifact proof gap |
| Beta readiness | 40 | P0 blocker |

## Document Index

| Doc | Purpose |
| --- | --- |
| `01-codebase-audit.md` | Current route/code/schema/test/CI evidence and command results. |
| `02-mvp-scope-cutline.md` | Visible MVP yes/no cutline for routes, APIs, navigation, and flags. |
| `03-deferred-features-plan.md` | Ask Flip / AI deferral and reactivation contract. |
| `04-mvp-feature-completion-plan.md` | Master feature gap matrix tied to ticket IDs. |
| `05`-`08` | Component library, templates, project-specific unlink, Excel workbook plans. |
| `09`-`12` | Evidence checklist, risk register, implementation phases, final gate. |
| `13`-`20` | Quality audit, evidence index, blast radius, ticket map, data contracts, Excel references, tests, runbook. |
| `21`-`36` | Third-pass enterprise/legal/security/infra/performance/demo/beta/DR/UX/ADR/council/executive package. |
| `37`-`46` | Fourth-pass closed-beta access, nonpayment, onboarding, operations, threat model, legal pack, scorecard, user management, council review, and manual proof matrix. |
| `47` | Completion audit mapping the active goal criteria to current evidence and missing proof. |

## First Implementation PR Recommendation

Start with **PR-1: MVP hard-disable AI and complete env manifest**.

Tickets: `AI-001`, `INFRA-001` env-manifest slice only, `QA-002` targeted AI disable tests. This has the highest risk reduction per line changed because it removes an unfinished visible feature and prevents provider/write calls by default.

## Final Go / No-Go Rule

Do not launch beta, show an investor demo, or charge a customer until every P0 gate in `12-final-mvp-launch-gate.md` has a pass artifact in `14-evidence-index.md`. A planned fix is not evidence.
