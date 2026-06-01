# Closed Beta Readiness Scorecard

## Scoring Rule

Closed beta can launch only if all P0 domains are 95+ or have a documented no-go resolution. Payment/pricing readiness is deferred and not applicable to closed beta. Public launch readiness is separate from this scorecard.

## Current Fourth-Pass Score

| Domain | P0? | Score | Status | Reason |
| --- | --- | ---: | --- | --- |
| Closed beta access control | Yes | 35 | Blocked | No allowlist table or enforcement exists yet. |
| Auth/onboarding | Yes | 70 | Needs beta gate | Google Sign-In and workspace flow exist; allowlist and access-denied UX missing. |
| Core estimating workflow | Yes | 80 | Needs smoke proof | Core app exists but closed-beta smoke evidence still required. |
| Component library | Yes | 78 | Needs polish | Must be workable, not exhaustive. |
| Templates | Yes | 76 | Needs polish | Enough templates needed for beta value and investor demo. |
| Project-specific unlink | Yes | 75 | P0 feature | Must prevent shared-library corruption. |
| Excel export | Yes | 82 | P0 feature | Build includes export route; professional workbook QA still required. |
| Design polish | Yes | 78 | Needs focused pass | Access-denied, onboarding, feedback, pricing copy need polish. |
| Feedback loop | Yes | 45 | Blocked | Public contact form exists, but durable beta feedback path is not proven. |
| Vercel/Supabase deployment | Yes | 72 | Needs env/runbook | Deployment shape exists; closed-beta env and OAuth smoke missing. |
| Resend/email readiness | Conditional | 65 | P1 unless visible flows require it | Required for share/invite email workflows if exposed, not required for manual beta invites. |
| Security/RLS | Yes | 70 | Needs allowlist threat fixes | Existing RLS work exists; allowlist RLS absent. |
| Legal/beta terms | Yes | 40 | Blocked | Beta-specific terms/privacy/AUP not yet implemented. |
| Observability/support | Yes | 60 | Needs beta support setup | Logs exist by platform; feedback/support process needs launch-ready path. |
| Investor demo readiness | Yes | 68 | Needs seeded path | Demo script/data and pricing explanation required. |
| Data backup/rollback | Yes | 70 | Needs pre-migration backup proof | Runbook exists conceptually; backup before new migrations required. |
| Payment/pricing readiness | No | N/A | Deferred | Not applicable to closed beta. |

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
