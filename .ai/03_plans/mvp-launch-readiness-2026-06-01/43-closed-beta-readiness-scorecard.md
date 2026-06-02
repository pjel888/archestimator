# Closed Beta Readiness Scorecard

## Final Report Artifact

Final implementation report: `final-codex-implementation-report.md`. It summarizes the local-safe implementation baseline through `8084908`, records report publication/correction commits `80f806d` and `579cef0`, records post-report validation/build/completion-audit/proof-template evidence through `9d71239`, records provider/manual proof evidence through `61160ee`, records Supabase, Vercel, spreadsheet artifact, local component/template demo, local template insertion evidence, and Resend fail-closed/disabled-controls guardrails, plus Teamspaces invite disabled-controls guardrails, and keeps the external closed beta recommendation at **NO-GO** until hosted/provider/manual proof gates are complete.

Manual proof matrix: `46-manual-proof-matrix.md`. It is the required checklist for collecting the remaining hosted/provider/manual evidence before any external closed-beta go/no-go review.

Goal completion audit: `47-goal-completion-audit.md`. It keeps the active goal open until the manual/provider proof packet is filled and linked.

## Scoring Rule

Closed beta can launch only if all P0 domains are 95+ or have a documented no-go resolution. Payment/pricing readiness is deferred and not applicable to closed beta. Public launch readiness is separate from this scorecard.

## Current Fourth-Pass Score

| Domain | P0? | Score | Status | Reason |
| --- | --- | ---: | --- | --- |
| Closed beta access control | Yes | 84 | Local pass plus admin queue; linked proof pending | Allowlist migration/helper/proxy/callback/session/access-required UX and platform-admin `/workshop/settings/beta-users` management exist locally; linked Supabase apply and hosted allowed/denied/revoked smoke are missing. |
| Auth/onboarding | Yes | 78 | Needs env and hosted smoke | Google Sign-In and workspace flow exist with local beta gate coverage; local signed-out redirect/login UI E2E passes; Vercel env list is empty, so hosted callback, allowed/denied/revoked, and first-run smoke are blocked. |
| Core estimating workflow | Yes | 84 | Needs smoke proof | Core app exists and local DOM baseline is green; protected route/manual smoke remains required. |
| Component library | Yes | 90 | Local screenshot pass; hosted proof pending | Search/count/trust fields are locally tested and screenshot-smoked; hosted/manual E2E remains required. |
| Templates | Yes | 91 | Local insertion pass; hosted proof pending | Preview/count/sample rows are locally tested and screenshot-smoked; local insertion into a throwaway estimate is proven; hosted/manual core journey proof remains required. |
| Project-specific unlink | Yes | 86 | Local pass; linked proof pending | RPC/action/hook/UI coverage exists; linked SQL verification and manual detach/edit proof remain required. |
| Excel export | Yes | 90 | Local artifact pass; app proof pending | Professional workbook, ExcelJS tests, ZIP integrity, and no-blank-total artifact proof pass; Excel/secondary-app open and print proof remain required. |
| Design polish | Yes | 86 | Local pass; manual review pending | Access-required, pricing, legal, feedback, library/template/export surfaces have local coverage; library/template screenshots exist; hosted/manual review remains required. |
| Feedback loop | Yes | 85 | Local in-app path and review queue; external proof pending | Protected `/workshop/feedback`, insert-only local feedback table migration, platform-admin `/workshop/settings/feedback` status queue, support copy, and structured public contact email draft exist; linked migrations, hosted smoke, monitored review workflow, and alert owner proof remain required. |
| Vercel/Supabase deployment | Yes | 76 | Partial preview proof | Vercel preview for `2e5b38d` reached READY and protected `/api/health` works through `vercel curl`; Vercel env list is empty, public health is protected, rollback proof is missing, and linked Supabase migration CLI proof is blocked by the temp-role pooler circuit breaker. |
| Resend/email readiness | Conditional | 70 | Disabled until provider proof | Shared-link recipient email controls disable while server readiness is false, Teamspaces invite controls disable while invite delivery readiness is false, and unconfigured sends fail closed; delivery/webhook/provider proof is required before re-enabling email workflows, but manual beta invites can proceed outside Resend/app invite delivery. |
| Security/RLS | Yes | 70 | Live advisor warns | Existing RLS work plus allowlist RLS migration exists locally, but linked security advisor returned WARN findings and linked allow/deny/storage proof is still missing. |
| Legal/beta terms | Yes | 82 | Local copy pass; review pending | Beta-specific terms/privacy copy exists; counsel/owner sign-off is missing. |
| Observability/support | Yes | 79 | Protected health only | Feedback link, honest support email draft, support/runbook, and `/api/health` exist; Vercel protected health works through `vercel curl`, but public uptime/error alert proof is missing. |
| Investor demo readiness | Yes | 82 | Local seed, screenshots, workbook, and insertion proof anchored; rehearsal pending | `supabase/seed.sql` anchors demo workspace/project/estimate/rows, a generated fallback workbook artifact exists, and local library/template screenshots plus local template insertion proof exist; live rehearsal and hosted account proof remain required. |
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
