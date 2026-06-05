# Closed Beta Readiness Scorecard

## Final Report Artifact

Final implementation report: `final-codex-implementation-report.md`. It summarizes the local-safe implementation baseline through `8084908`, records report publication/correction commits `80f806d` and `579cef0`, records current local validation/build evidence through `353dd48`, records app-runtime provider/manual proof evidence through `638f681`, evidence-only provider-risk docs through `13f5acb`, and latest read-only provider refresh evidence through `4fdf0de`, records linked Supabase readiness refresh evidence through `08a58dd`, records Supabase, Vercel, spreadsheet artifact/app-availability, local component/template demo, local template insertion evidence, beta operations runbook readiness, and Resend fail-closed/disabled-controls guardrails, plus Teamspaces invite disabled-controls guardrails, and keeps the external closed beta recommendation at **NO-GO** until hosted/provider/manual proof gates are complete.

Manual proof matrix: `46-manual-proof-matrix.md`. It is the required checklist for collecting the remaining hosted/provider/manual evidence before any external closed-beta go/no-go review.

Goal completion audit: `47-goal-completion-audit.md`. It keeps the active goal open until the manual/provider proof packet is filled and linked.

## Scoring Rule

Closed beta can launch only if all P0 domains are 95+ or have a documented no-go resolution. Payment/pricing readiness is deferred and not applicable to closed beta. Public launch readiness is separate from this scorecard.

## Current Fourth-Pass Score

| Domain | P0? | Score | Status | Reason |
| --- | --- | ---: | --- | --- |
| Closed beta access control | Yes | 89 | Hosted owner/edge proof plus synthetic expired-session and Google Sheets proof; widening still pending | Allowlist migration/helper/proxy/callback/session/access-required UX and platform-admin `/workshop/settings/beta-users` management exist locally; linked owner-only allowlist readback plus hosted owner, denied, revoked, logout, synthetic stale-cookie expired-session fail-closed proof, and synthetic Google Sheets workbook proof exist; project-specific unlink lacks separate hosted-production proof and native app workbook proof still blocks a fully green widened-beta claim. |
| Auth/onboarding | Yes | 84 | Hosted auth edge proof captured; first-run still pending | Google Sign-In and workspace flow exist with local beta gate coverage; local signed-out redirect/login UI E2E passes; hosted owner callback, denied/revoked access-required paths, logout proof, and synthetic stale-cookie expired-session fail-closed route proof exist; first-run fresh-user smoke remains blocked. |
| Core estimating workflow | Yes | 84 | Needs smoke proof | Core app exists and local DOM baseline is green; protected route/manual smoke remains required. |
| Component library | Yes | 90 | Local screenshot pass; hosted proof pending | Search/count/trust fields are locally tested and screenshot-smoked; hosted/manual E2E remains required. |
| Templates | Yes | 91 | Local insertion pass; hosted proof pending | Preview/count/sample rows are locally tested and screenshot-smoked; local insertion into a throwaway estimate is proven; hosted/manual core journey proof remains required. |
| Project-specific unlink | Yes | 86 | Local pass; linked proof pending | RPC/action/hook/UI coverage exists; linked SQL verification and manual detach/edit proof remain required. |
| Excel export | Yes | 96 | Local, hosted export, real downloaded workbook structural/Quick Look, and synthetic Google Sheets proof pass; native app proof pending | Professional workbook, ExcelJS tests, ZIP integrity, no-blank-total artifact proof, local route-handler workbook proof, hosted authenticated export proof, real downloaded Lewis Residence workbook structural/Quick Look proof, synthetic 500 / 1,000 / 2,500-row local benchmark pass, benchmark-fixture regression coverage, and synthetic Google Sheets import/open/recalc/print-preview proof exist; native Excel/Numbers/LibreOffice app open/recalc/print proof and Vercel export-route timing remain unproven. |
| Design polish | Yes | 86 | Local pass; manual review pending | Access-required, pricing, legal, feedback, library/template/export surfaces have local coverage; library/template screenshots exist; hosted/manual review remains required. |
| Feedback loop | Yes | 85 | Local in-app path and review queue; external proof pending | Protected `/workshop/feedback`, insert-only local feedback table migration, platform-admin `/workshop/settings/feedback` status queue, support copy, and structured public contact email draft exist; linked migrations, hosted smoke, monitored review workflow, and alert owner proof remain required. |
| Vercel/Supabase deployment | Yes | 76 | Partial preview proof; linked schema negative | Latest app-runtime preview for `638f681` reached Ready at deployment `dpl_8cpgQgEtrAgo6P5gX1fn3LwBJzdS` and protected `/api/health` works through `vercel curl`; Vercel env list is empty, public preview health returns 401, custom domains still point at old production deployment `dpl_FwfHexBsB1xSHDqHqFwHSYpCYTVH`, rollback proof is missing, and linked Supabase readiness refresh at `08a58dd` found five launch migrations plus allowlist/feedback/unlink objects absent while migration/performance reads hit the temp-role pooler circuit breaker. |
| Resend/email readiness | Conditional | 70 | Disabled until provider proof | Shared-link recipient email controls disable while server readiness is false, Teamspaces invite controls disable while invite delivery readiness is false, and unconfigured sends fail closed; delivery/webhook/provider proof is required before re-enabling email workflows, but manual beta invites can proceed outside Resend/app invite delivery. |
| Security/RLS | Yes | 70 | Live advisor warns | Existing RLS work plus allowlist RLS migration exists locally, but linked security advisor returned WARN findings and linked allow/deny/storage proof is still missing. |
| Legal/beta terms | Yes | 82 | Local copy pass; review pending | Beta-specific terms/privacy copy exists; counsel/owner sign-off is missing. |
| Observability/support | Yes | 79 | Protected health only | Feedback link, honest support email draft, support/runbook, and `/api/health` exist; Vercel protected health works through `vercel curl`, but public uptime/error alert proof is missing. |
| Investor demo readiness | Yes | 82 | Local seed, screenshots, sanitized workbook readback, and insertion proof anchored; rehearsal pending | `supabase/seed.sql` anchors demo workspace/project/estimate/rows, sanitized fallback workbook readback exists, raw workbook artifacts are not retained in git, and local library/template screenshots plus local template insertion proof exist; live rehearsal and hosted account proof remain required. |
| Beta operations | Yes | 82 | Procedures documented; live ops proof pending | `40-closed-beta-operations-runbook.md` and `29-beta-program-readiness-plan.md` cover add/revoke/manual invite/access verification/feedback triage/pause/rollback/24-72h monitoring procedures; hosted smoke, linked migrations, monitored support/feedback ownership, alert ownership, legal sign-off, and live beta operation proof remain required. |
| Data backup/rollback | Yes | 60 | Provider evidence negative | Backup/restore template and migration procedure exist; Supabase CLI readback shows PITR disabled and no listed backups, and restore drill proof is missing. |
| Payment/pricing readiness | No | N/A | Deferred | Not applicable to closed beta. |
| AI deferral | No | N/A | Locally gated | `AI-001` hides Ask Flip and disables AI routes by default; keep deferred until a future ADR explicitly reactivates. |

## P0 Launch Threshold

Before inviting external beta users:

- Closed beta access control: 95+.
- Auth/onboarding: 95+.
- Feedback loop: 95+.
- Legal/beta terms: 95+.
- Security/RLS: 95+.
- Core estimate/export/unlink workflows: 95+ or documented no-go resolution.

## Public Launch Separation

Public launch still requires pricing, payment, public support scale, commercial terms, stronger onboarding automation, and broader observability. Those are intentionally outside closed beta P0.
