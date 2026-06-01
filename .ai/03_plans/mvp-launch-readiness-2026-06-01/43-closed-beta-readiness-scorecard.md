# Closed Beta Readiness Scorecard

## Final Report Artifact

Final implementation report: `final-codex-implementation-report.md`. It summarizes the local-safe implementation baseline through `8084908`, records report publication/correction commits `80f806d` and `579cef0`, records post-report validation/build/completion-audit/proof-template evidence through `9d71239`, records Supabase read-only provider evidence in `.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/supabase-read-only-cli-2026-06-02.md`, and keeps the external closed beta recommendation at **NO-GO** until hosted/provider/manual proof gates are complete.

Manual proof matrix: `46-manual-proof-matrix.md`. It is the required checklist for collecting the remaining hosted/provider/manual evidence before any external closed-beta go/no-go review.

Goal completion audit: `47-goal-completion-audit.md`. It keeps the active goal open until the manual/provider proof packet is filled and linked.

## Scoring Rule

Closed beta can launch only if all P0 domains are 95+ or have a documented no-go resolution. Payment/pricing readiness is deferred and not applicable to closed beta. Public launch readiness is separate from this scorecard.

## Current Fourth-Pass Score

| Domain | P0? | Score | Status | Reason |
| --- | --- | ---: | --- | --- |
| Closed beta access control | Yes | 82 | Local pass; linked proof pending | Allowlist migration/helper/proxy/callback/session/access-required UX exist locally; linked Supabase apply and hosted allowed/denied smoke are missing. |
| Auth/onboarding | Yes | 82 | Needs hosted smoke | Google Sign-In and workspace flow exist with local beta gate coverage; local signed-out redirect/login UI E2E passes; hosted callback, allowed/denied/revoked, and first-run smoke are missing. |
| Core estimating workflow | Yes | 84 | Needs smoke proof | Core app exists and local DOM baseline is green; protected route/manual smoke remains required. |
| Component library | Yes | 86 | Local polish pass | Search/count/trust fields are locally tested; screenshot/manual demo smoke remains required. |
| Templates | Yes | 86 | Local polish pass | Preview/count/sample rows are locally tested; screenshot/manual insertion smoke remains required. |
| Project-specific unlink | Yes | 86 | Local pass; linked proof pending | RPC/action/hook/UI coverage exists; linked SQL verification and manual detach/edit proof remain required. |
| Excel export | Yes | 88 | Local workbook pass | Professional workbook and ExcelJS tests pass; Excel/secondary-app open and print proof remain required. |
| Design polish | Yes | 84 | Local pass; manual review pending | Access-required, pricing, legal, feedback, library/template/export surfaces have local coverage; screenshot/manual review remains required. |
| Feedback loop | Yes | 78 | Minimum local path; external proof pending | Workshop feedback mailto and support copy exist; monitored inbox/form proof remains required. |
| Vercel/Supabase deployment | Yes | 74 | Needs provider proof | Env manifest/runbook exist; Vercel env, OAuth callback, deployment, and rollback proof are missing; linked Supabase migration CLI proof is blocked by the temp-role pooler circuit breaker. |
| Resend/email readiness | Conditional | 65 | P1 unless visible flows require it | Required for share/invite email workflows if exposed, not required for manual beta invites. |
| Security/RLS | Yes | 70 | Live advisor warns | Existing RLS work plus allowlist RLS migration exists locally, but linked security advisor returned WARN findings and linked allow/deny/storage proof is still missing. |
| Legal/beta terms | Yes | 82 | Local copy pass; review pending | Beta-specific terms/privacy copy exists; counsel/owner sign-off is missing. |
| Observability/support | Yes | 78 | Local minimum pass; alerts pending | Feedback link, support/runbook, and `/api/health` exist; deployed uptime/error alert proof is missing. |
| Investor demo readiness | Yes | 76 | Local seed anchored; rehearsal pending | `supabase/seed.sql` now anchors demo workspace/project/estimate/rows and the demo plan names the path; live rehearsal, screenshots, and workbook artifact proof remain required. |
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
