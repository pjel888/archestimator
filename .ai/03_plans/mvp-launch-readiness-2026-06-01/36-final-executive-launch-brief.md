# Final Executive Launch Brief

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`
Current decision: **NO-GO**.

## Launch Thesis

Archestimator can be a credible MVP if it ships a reliable structured estimating workflow: project -> estimate -> library/template insert -> project-specific row adjustments -> professional Excel bid/BOQ export. Credibility comes from data integrity, export quality, auth reliability, and operational/legal readiness. AI is deferred.

## What Ships

- Protected workshop with projects and estimates.
- Component library and templates after polish.
- Project-specific detached estimate rows after `UNLINK-001`.
- Professional Excel bid/BOQ workbook after `EXP-001`.
- Share/invite/email only after security and Resend proof.
- Legal/support/observability/backup posture for closed beta.

## What Is Deferred

Ask Flip/AI, billing, PDF proposals, bid tabulation, advanced collaboration/teamspaces, broad Redis/job queues unless thresholds require.

## Why The MVP Is Credible

- It matches how construction teams already work: structured data in app, Excel as trusted output.
- The component library/template workflow can become a proprietary estimating system over time.
- Project-specific detach preserves library integrity while allowing estimate-level reality.

## P0 Blockers

AI visible/callable, `test:dom` red, E2E unproven, export not bid-form quality, unlink not implemented/proven, hosted auth/RLS/Resend/deployment proof missing, legal placeholders, no backup/observability/support proof.

## Implementation Sequence

1. `AI-001` + env manifest.
2. Auth/onboarding first-run proof.
3. Library/template polish.
4. Detached row implementation.
5. Excel workbook implementation.
6. Security/RLS/Resend/deploy proof.
7. Legal/observability/support.
8. Backup/DR and zero-defect matrix.
9. Demo and beta program readiness.

## Readiness Scorecard

| Domain | Score |
| --- | ---: |
| Product core | 78 |
| Estimate editor | 82 |
| Component library | 80 |
| Templates | 74 |
| Project-specific unlink | 35 |
| Excel export | 45 |
| Auth/onboarding | 78 |
| Infrastructure/deployment | 55 |
| Email/Resend | 50 |
| Security/RLS | 62 |
| Legal/privacy | 25 |
| Performance/caching | 65 |
| Observability/support | 35 |
| QA/test coverage | 58 |
| Investor demo readiness | 45 |
| Beta readiness | 40 |

Anything below 90 is not beta-ready. Any P0 domain below 95 blocks launch. No domain is 100 because launch evidence is incomplete.

## Beta Readiness Requirements

Legal copy, support path, backup/restore proof, hosted auth, RLS/storage proof, zero-defect matrix, first-run UX, no AI, professional export.

## Investor Readiness Requirements

Demo workspace, demo script, validated export artifact, fallback screenshots, FAQ answers, no unfinished AI/legal placeholders shown.

## Infrastructure Requirements

Vercel env/deploy/rollback, Supabase auth/RLS/storage/backups, Resend DNS/webhook/delivery, monitoring/alerts, CI release parity.

## Final Risk Posture

The codebase has strong foundations, but launch risk remains high because the most externally visible trust surfaces are not yet proven: AI off, Excel quality, auth/security, legal/support, and backup/ops.

## First PR Recommendation

Start with `AI-001` plus the env-manifest slice of `INFRA-001`. It removes the highest-embarrassment unfinished surface and gives every later PR a safe production default.

## Go / No-Go Rule

Launch only when every P0 in `12-final-mvp-launch-gate.md` is green and has evidence in `14-evidence-index.md`. Planned work is no-go.
