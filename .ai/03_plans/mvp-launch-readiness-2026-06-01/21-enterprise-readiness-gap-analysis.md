# Enterprise Readiness Gap Analysis

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`
Decision: MVP is not enterprise-ready or beta-ready yet. The current codebase has credible foundations, but launch proof and several launch-visible contracts are missing.

## Readiness Findings

| Domain | What exists now | What is missing | MVP debt vs beta blocker |
| --- | --- | --- | --- |
| Product readiness | Workshop, projects, estimates, library, templates, share/invite foundations, export route. | AI hidden, first-run polish, professional export, demo data, zero-defect matrix. | AI/export/unlink/first-run are beta blockers. |
| Engineering readiness | Typecheck/build pass; lint passes with warnings; Supabase typed schema; CI exists. | `test:dom` green, release E2E proof, PR slicing, env manifest, branch/release hardening. | `test:dom`/env/E2E proof are blockers. |
| Security readiness | RLS migrations, public share security helpers, service-role isolation patterns. | Live RLS/storage denial, route matrix, threat model, secret scan, webhook proof. | Blocker. |
| Compliance readiness | Terms/Privacy placeholder routes. | Reviewed Terms/Privacy/Beta/AUP, data deletion/retention, subprocessors, support contact. | Blocker for public/beta/paid. |
| Data integrity | Row revision RPCs, history events, generated types. | Unlink/detach RPC/action/UI proof, backup/restore proof, linked schema verification. | Blocker. |
| Performance | Route perf work exists; build passes; TanStack/Zustand/Next patterns in use. | Export large fixture, staging/prod route proof, limiter thresholds, no-silent-skip E2E. | P1 unless demo/public abuse thresholds fail. |
| Onboarding | Login/callback/workshop redirect; onboarding route redirects to settings. | First-run empty states, hosted provider proof, journey QA. | Blocker. |
| Support | Contact page likely exists; logs available in Vercel/Supabase. | Support inbox, bug triage, SLA, alert owner, incident response. | Blocker for beta. |
| Deployment | Local build passes; CI workflow exists. | Vercel env, domain/SSL, Supabase callbacks, Resend DNS, rollback proof. | Blocker. |
| Investor/demo | Product surfaces exist. | Demo workspace, script, prevalidated export, fallback screenshots, FAQ. | Blocker for investor/incubator showing. |

## Before Showing Investors / Incubators

- Ask Flip hidden and AI routes disabled.
- Demo workspace contains realistic project, library, templates, estimate, detached row example, and validated Excel workbook.
- Legal/privacy copy is accurate for demo data and closed beta status.
- Export artifact opens cleanly and can be shown if the live app fails.
- Demo script explicitly states AI, billing, PDF, and bid tabulation are post-MVP.
- Auth, deploy, and rollback smoke have current proof.

## Before Inviting Beta Testers

- Hosted auth and first-run journey pass.
- Support inbox and feedback path live.
- Backup/DR proof complete before migrations.
- RLS/storage/share/invite/email proof complete for visible surfaces.
- Zero-defect matrix is green or beta remains no-go.
- Known limitations are included in onboarding email and in-app/legal copy.

## Before Charging Customers

- Legal copy reviewed for paid use.
- Pricing page does not promise unavailable features.
- Billing/payment decision made or invoice/manual commercial process documented outside app.
- Data deletion/export/support process is operational.
- Security and backup posture meets paid-customer expectations.

## Final Gap Table

| Domain | Current state | Gap | Required action | Launch blocker? | Evidence needed | Owner | Ticket ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Product core | Core routes build. | First-run/demo no proof. | Journey QA and empty states. | Yes | screenshots + smoke log | Product/Eng | `ONB-001` |
| Estimate editor | Functional foundation. | Zero-defect matrix incomplete. | Main feature tests/manual QA. | Yes | `33` sign-off | QA/Eng | `QA-002` |
| Component library | Usable route. | Trust/seed/empty states. | P1 polish. | Demo blocker if weak | screenshots/tests | Product/Eng | `LIB-001` |
| Templates | Usable route. | Preview/insertion clarity. | P1 polish. | Demo blocker if weak | screenshots/tests | Product/Eng | `TPL-001` |
| Unlink | Schema supports. | Flow not complete. | Detach RPC/action/UI. | Yes | SQL/tests/manual | Eng | `UNLINK-001` |
| Excel export | XLSX exists. | Not bid-form quality. | Workbook rewrite. | Yes | XLSX artifact + tests | Eng/Product | `EXP-001` |
| Auth/onboarding | Code path exists. | Hosted proof missing. | Provider/env smoke. | Yes | staging/prod log | Eng | `ONB-001` |
| Infrastructure | Build/CI local. | Env/deploy/rollback proof. | Config audit. | Yes | deploy checklist | Release | `INFRA-001` |
| Email | Code exists. | DNS/delivery/webhook proof. | Resend readiness. | If visible | dashboard/logs | Release | `INFRA-002` |
| Security | RLS migrations exist. | Live denial proof missing. | Threat/RLS audit. | Yes | SQL/API matrix | Security | `SEC-001` |
| Legal | Placeholders. | Reviewed copy absent. | Legal pack. | Yes | sign-off | Legal/Product | `LEGAL-001` |
| Performance | Plausible MVP path. | Baselines missing. | Export/route tests. | Threshold-based | perf logs | Eng | `PERF-001` |
| Observability | Logs/dev monitor. | Alerts/support missing. | Monitoring stack. | Yes | alert proof | Ops | `OBS-001` |
| Backup/DR | Not proven. | Restore plan missing. | Backup proof. | Yes | backup/drill note | Ops | `DATA-001` |
| Investor demo | Not packaged. | Demo data/script/fallback. | Demo pack. | Yes for demo | rehearsal log | Product | `DEMO-001` |
| Beta program | Not packaged. | Cohort/SLA/feedback. | Beta program. | Yes for beta | launch checklist | Product/Support | `BETA-001` |
