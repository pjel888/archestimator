# Closed Beta Readiness Scorecard

## Scoring Rule

Closed beta can launch only if all P0 domains are 95+ or have a documented no-go resolution. Payment/pricing readiness is deferred and not applicable to closed beta. Public launch readiness is separate from this scorecard.

## Current Fourth-Pass Score

| Domain | P0? | Score | Status | Reason |
| --- | --- | ---: | --- | --- |
| Closed beta access control | Yes | 82 | Local pass; linked proof pending | Allowlist migration/helper/proxy/callback/session/access-required UX exist locally; linked Supabase apply and hosted allowed/denied smoke are missing. |
| Auth/onboarding | Yes | 82 | Needs hosted smoke | Google Sign-In and workspace flow exist with local beta gate coverage; hosted callback and first-run smoke are missing. |
| Core estimating workflow | Yes | 84 | Needs smoke proof | Core app exists and local DOM baseline is green; protected route/manual smoke remains required. |
| Component library | Yes | 86 | Local polish pass | Search/count/trust fields are locally tested; screenshot/manual demo smoke remains required. |
| Templates | Yes | 86 | Local polish pass | Preview/count/sample rows are locally tested; screenshot/manual insertion smoke remains required. |
| Project-specific unlink | Yes | 86 | Local pass; linked proof pending | RPC/action/hook/UI coverage exists; linked SQL verification and manual detach/edit proof remain required. |
| Excel export | Yes | 88 | Local workbook pass | Professional workbook and ExcelJS tests pass; Excel/secondary-app open and print proof remain required. |
| Design polish | Yes | 84 | Local pass; manual review pending | Access-required, pricing, legal, feedback, library/template/export surfaces have local coverage; screenshot/manual review remains required. |
| Feedback loop | Yes | 78 | Minimum local path; external proof pending | Workshop feedback mailto and support copy exist; monitored inbox/form proof remains required. |
| Vercel/Supabase deployment | Yes | 78 | Needs provider proof | Env manifest/runbook exist; Vercel env, OAuth callback, linked migrations, deployment, and rollback proof are missing. |
| Resend/email readiness | Conditional | 65 | P1 unless visible flows require it | Required for share/invite email workflows if exposed, not required for manual beta invites. |
| Security/RLS | Yes | 78 | Local model pass; live proof pending | Existing RLS work plus allowlist RLS migration exists locally; linked allow/deny/storage proof is missing. |
| Legal/beta terms | Yes | 82 | Local copy pass; review pending | Beta-specific terms/privacy copy exists; counsel/owner sign-off is missing. |
| Observability/support | Yes | 78 | Local minimum pass; alerts pending | Feedback link, support/runbook, and `/api/health` exist; deployed uptime/error alert proof is missing. |
| Investor demo readiness | Yes | 68 | Needs seeded path | Demo script/data and pricing explanation required. |
| Data backup/rollback | Yes | 76 | Checklist ready; proof missing | Backup/restore template and migration procedure exist; Supabase backup/PITR and restore drill proof are missing. |
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
