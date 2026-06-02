# Final Executive Launch Brief

## Fourth-Pass Closed Beta Executive Brief - 2026-06-02

### Launch Thesis

Archestimator should launch next as a closed beta MVP: invite-only, Google-authenticated, whitelist-gated, no-payment, and feedback-led. The goal is to prove real estimating workflow value with beta testers, investors, and incubator reviewers before public commercial launch.

### Closed Beta Scope

- Google Sign-In plus `closed_beta_allowed_emails`.
- Founder-managed cohort.
- Working project, estimate, component library, template, unlink, and Excel export workflows.
- Visible `/workshop/feedback` plus support email path.
- Beta legal/privacy/AUP/disclaimers.
- Vercel/Supabase production deployment with rollback and smoke evidence.

### No Payments

No Stripe, checkout, subscriptions, billing UI, invoices, paid tiers, pricing enforcement, or revenue collection are in closed beta P0.

### Command Evidence

- Full local implementation baseline: `c5ca065` after demo seed row repair.
- Final report baseline: `8084908` after canonical state/decision/roadmap truth sync.
- Final report indexed in launch docs: `3e8d7a0`.
- Current local validation refresh: `2587f80`, `bun run validate` passed with DOM at 133 files / 1034 passed / 2 skipped.
- Current local app build refresh: `2587f80`, `bun run build` passed with Next.js 16.2.6 / Turbopack and 29 static pages.
- Resend guardrail refresh: `fd5d4b3` fails unconfigured production-like email sends closed; `61160ee` disables shared-link recipient entry/send/resend controls while server email readiness is false; local Teamspaces invite controls now disable while project invite delivery readiness is false.
- Install, type-check, lint, design-system lint, unit tests, full DOM tests, and build passed locally.
- Local signed-out auth E2E passed: `PLAYWRIGHT_PORT=3037 bun run test:e2e -- e2e/auth.spec.ts --project=chromium`, 2 tests in 9.9s.
- Launch validation still lacks hosted/manual E2E, provider dashboard, backup/restore, deployment rollback, and spreadsheet-open proof. Local template insertion proof exists only for a throwaway estimate under the local smoke path.

### P0 Blockers

- Hosted allowed/denied/revoked auth smoke missing; local signed-out redirect/login UI E2E now passes.
- Linked Supabase RLS/storage/migration proof missing.
- Supabase backup/PITR and restore drill proof missing.
- Vercel deployment/rollback proof missing.
- Resend delivery/webhook proof missing before share/invite email workflows can be re-enabled for launch.
- Excel/secondary spreadsheet open proof missing.
- Owner/counsel review of beta legal copy missing.

### Next Proof Recommendation

Run the provider-backed proof lane next: linked Supabase backup/migration/RLS checks, hosted auth smoke, Vercel preview/prod deploy and rollback, and spreadsheet-open QA. Keep the app closed-beta/no-payment/AI-off while collecting that evidence.

Use `46-manual-proof-matrix.md` as the operator checklist for the next proof lane and link all dated artifacts back to `14-evidence-index.md`.

Use `47-goal-completion-audit.md` to check whether the active launch goal can be completed after those artifacts are captured.

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`
Current decision: **NO-GO**.

### Final Report Artifact

The final Codex implementation report is `final-codex-implementation-report.md`. It summarizes the local-safe implementation baseline through `8084908`, records the report publication/correction commits `80f806d` and `579cef0`, and recommends **NO-GO for external beta testers today** until hosted/provider/manual proof is collected.

## Launch Thesis

Archestimator can be a credible MVP if it ships a reliable structured estimating workflow: project -> estimate -> library/template insert -> project-specific row adjustments -> professional Excel bid/BOQ export. Credibility comes from data integrity, export quality, auth reliability, and operational/legal readiness. AI is deferred.

## What Ships

- Protected workshop with projects and estimates after hosted auth smoke.
- Component library and templates with local polish complete and manual demo smoke still required.
- Project-specific detached estimate rows with local tests complete and linked/manual proof still required.
- Professional Excel bid/BOQ workbook with local ExcelJS tests complete and cross-app open proof still required.
- Share/invite/email automation only after security, provider, and Resend proof; manual link sharing/manual beta invites remain the fallback while recipient email and Teamspaces invite delivery controls are disabled.
- Legal/support/observability/backup posture for closed beta.

## What Is Deferred

Ask Flip/AI, billing, PDF proposals, bid tabulation, advanced collaboration/teamspaces, broad Redis/job queues unless thresholds require.

## Why The MVP Is Credible

- It matches how construction teams already work: structured data in app, Excel as trusted output.
- The component library/template workflow can become a proprietary estimating system over time.
- Project-specific detach preserves library integrity while allowing estimate-level reality.

## P0 Blockers

Hosted auth/RLS/Resend/deployment proof missing, E2E/manual smoke unproven, spreadsheet open proof missing, owner/counsel legal review missing, and backup/restore/rollback proof missing. Local code now hides/fail-closes AI by default, fails unconfigured email delivery closed, disables recipient email controls while server readiness is false, disables Teamspaces invite controls while invite delivery readiness is false, has a green DOM baseline, implements project-specific unlink locally, and generates a professional workbook under ExcelJS tests.

## Implementation Sequence

1. Linked Supabase backup/PITR, migration, RLS, and storage proof.
2. Hosted auth/onboarding first-run smoke.
3. Vercel deployment, env, health, and rollback proof.
4. Spreadsheet open/print QA for the workbook.
5. Resend delivery/webhook proof before email-dependent workflows are re-enabled.
6. Owner/counsel review of beta legal copy and monitored support inbox/table proof.
7. Demo workspace/script rehearsal, hosted screenshots, and spreadsheet-app validated workbook fallback artifact. Local component/template screenshots, workbook artifact, and template insertion smoke proof now exist, but they do not prove the hosted demo.

## Readiness Scorecard

| Domain | Score |
| --- | ---: |
| Product core | 84 |
| Estimate editor | 84 |
| Component library | 90 |
| Templates | 91 |
| Project-specific unlink | 86 |
| Excel export | 88 |
| Auth/onboarding | 82 |
| Infrastructure/deployment | 78 |
| Email/Resend | 70 |
| Security/RLS | 78 |
| Legal/privacy | 82 |
| Performance/caching | 65 |
| Observability/support | 82 |
| QA/test coverage | 82 |
| Investor demo readiness | 82 |
| Beta readiness | 40 |

Anything below 90 is not beta-ready. Any P0 domain below 95 blocks launch. No domain is 100 because launch evidence is incomplete.

## Beta Readiness Requirements

Legal copy, support path, backup/restore proof, hosted auth, RLS/storage proof, zero-defect matrix, first-run UX, no AI, professional export.

## Investor Readiness Requirements

Demo workspace, demo script, validated export artifact, fallback screenshots, FAQ answers, no unfinished AI/legal placeholders shown.

## Infrastructure Requirements

Vercel env/deploy/rollback, Supabase auth/RLS/storage/backups, Resend DNS/webhook/delivery before re-enabling email workflows, monitoring/alerts, CI release parity.

## Final Risk Posture

The codebase has stronger local foundations now, and the contact flow no longer pretends to submit support messages without a backend. Protected `/workshop/feedback` can persist beta feedback after migration apply. Launch risk remains high because the trust surfaces that require external proof are not yet proven: hosted auth/security, provider backups, deployment rollback, monitored support/alerts, feedback-table review, and spreadsheet-app compatibility.

## Go / No-Go Rule

Launch only when every P0 in `12-final-mvp-launch-gate.md` is green and has evidence in `14-evidence-index.md`. Planned work is no-go.
