# Final MVP Launch Gate

## Fourth-Pass Closed Beta Launch Gate - 2026-06-02

This gate is now the closed beta launch gate. It is not a public paid-launch gate.

### Command Evidence

- Full local implementation baseline: `c5ca065` after demo seed row repair.
- Repo-local implementation freeze: `6ab5b38`; no further local implementation is planned for this deferred-provider launch pass unless a new repo-local defect is discovered.
- Final report baseline: `8084908` after canonical state/decision/roadmap truth sync.
- Final report indexed in launch docs: `3e8d7a0`.
- Current local validation refresh: `353dd48`, `bun run validate` pass.
- Current local app build refresh: `353dd48`, `bun run build` pass.
- Latest read-only provider refresh: `4fdf0de`, Ready preview deployment `DEPLOYMENT_ID_PLACEHOLDER` at `VERCEL_DEPLOYMENT_URL_PLACEHOLDER`; protected `/api/health` works through `vercel curl`, but Vercel env vars remain absent, public preview and branch-alias health return HTTP 401, custom domains still return 404/307/404 for `/api/health`, rollback proof is missing, Supabase migration-list access succeeds but all five launch migrations remain local-only/missing remotely, and linked SQL readiness is currently blocked by linked database SASL auth before JSON output.
- Latest app-runtime Vercel preview refresh: `638f681`, Ready preview deployment `DEPLOYMENT_ID_PLACEHOLDER` at `VERCEL_DEPLOYMENT_URL_PLACEHOLDER`; protected `/api/health` works through `vercel curl`, but Vercel env vars remain absent, public preview health returns HTTP 401, custom domains still point at old production deployment `DEPLOYMENT_ID_PLACEHOLDER`, and rollback proof is missing.
- Current linked Supabase readiness refresh: `08a58dd`, read-only SQL found linked migrations `20260601182522`, `20260601184343`, `20260602005649`, `20260602083000`, and `20260602084500` absent; `closed_beta_allowed_emails`, `beta_feedback_submissions`, `check_closed_beta_access`, and `unlink_estimate_row_item_from_library_with_history` absent; `component-images` still public; migration list and performance advisors hit temp-role pooler `ECIRCUITBREAKER`; security advisor WARN findings remain.
- Resend guardrail refresh: `fd5d4b3` fails unconfigured production-like email sends closed with `EMAIL_NOT_CONFIGURED`; `61160ee` disables shared-link recipient entry/send/resend controls while server email readiness is false; local Teamspaces invite controls now disable when project invite delivery readiness is false.
- `bun install --frozen-lockfile`: pass.
- `bun run type-check`: pass.
- `bun run lint`: pass with 14 warnings.
- `bun run lint:design-system`: pass.
- `bun run test`: pass, 4 unit tests / 129 expectations.
- `bun run test:dom`: historical baseline pass, 131 files / 1021 tests with 2 skips; current validation refresh pass, 151 files / 1119 passed / 2 skipped.
- `bunx vitest run tests/vitest/workshop-reset.test.tsx tests/vitest/template-library-manager-ui.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx --maxWorkers=1`: pass, 4 files / 52 tests for final repo-local surface proof.
- `PLAYWRIGHT_PORT=3037 bun run test:e2e -- e2e/auth.spec.ts --project=chromium`: pass, 2 tests in 9.9s for local signed-out workshop redirect and login UI.
- `ARCHESTIMATOR_E2E_LIBRARY_DEMO_SMOKE=1 ... PLAYWRIGHT_PORT=3038 bun run test:e2e e2e/workshop-library-demo-smoke.spec.ts --project=chromium`: pass, 2 tests in 14.9s for local component/template demo screenshots.
- `ARCHESTIMATOR_E2E_TEMPLATE_INSERT_SMOKE=1 ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1 ARCHESTIMATOR_TEMPLATE_INSERT_SMOKE_DIR=.ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof PLAYWRIGHT_PORT=3039 bun run test:e2e e2e/workshop-template-insert-smoke.spec.ts --project=chromium`: pass, 1 test in 46.1s for local template insertion into a throwaway estimate, with node count `51 -> 56`, row count `0 -> 8`, one `template_inserted` event, screenshot/JSON artifacts, and zero fixture residue.
- `bun run build`: historical baseline pass; current build refresh pass at `353dd48`, Next.js 16.2.6 / Turbopack, 32 static pages.

### Closed Beta No-Go

- No whitelist enforcement.
- Non-whitelisted users can access `/workshop`.
- Whitelisted users cannot access `/workshop`.
- Google OAuth fails in production.
- App creates profile/workspace incorrectly for whitelisted users.
- Ask Flip is visible while AI is deferred.
- AI routes are active by default.
- Pricing/payment copy implies paid launch.
- Checkout, subscriptions, paid plans, or billing UI are visible.
- No feedback/support path exists.
- No beta terms/privacy/AUP/disclaimer path exists.
- No backup exists before new migrations.
- No rollback path exists.
- Component unlink can corrupt library data.
- Excel export is unprofessional or formulas are untested.
- Core project/component/template workflows are broken.

Repo-local implementation is frozen at `6ab5b38`. Closed beta launch is still blocked until hosted auth/RLS/storage, provider dashboards, manual smoke, backup/restore, deployment/rollback, and spreadsheet-open proof are collected and linked from `14-evidence-index.md`.

Use `46-manual-proof-matrix.md` as the required evidence checklist for those remaining hosted/provider/manual gates.

Use `47-goal-completion-audit.md` before any claim that the active MVP launch goal is complete.

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`
Gate owner: OWNER_NAME_PLACEHOLDER / Launch lead
Current decision: **NO-GO**.

### Final Report Artifact

- Final implementation report: `final-codex-implementation-report.md`.
- Stable implementation baseline before the report: `8084908`.
- Report publication/correction commits: `80f806d`, `579cef0`.
- The final report keeps this gate at **NO-GO for external beta testers today** because hosted/provider/manual proof gates remain incomplete.

## Final Go / No-Go Table

| Gate | P0? | Required evidence | Current status | Decision |
| --- | --- | --- | --- | --- |
| Ask Flip hidden and AI routes disabled by default | Yes | UI test, route test, no provider-call test, production env false. | Local pass; production env proof pending. | No-go |
| Core commands green | Yes | Install, typecheck, lint, design lint, unit, DOM, build, E2E. | Local type/lint/unit/DOM/build pass; hosted/manual E2E not current. | No-go |
| Auth works in production | Yes | Hosted Google and magic-link callback smoke, logout/session expiry. | Local signed-out redirect/login UI E2E pass; hosted owner allowed, denied, revoked, logout, and synthetic stale-cookie expired-session fail-closed proof captured. | Partial-go |
| RLS/migrations verified | Yes | Linked/staging SQL denial/allow queries, migration history, generated types. | Local migrations/types only. | No-go |
| Component unlink cannot mutate library data | Yes | RPC/action/UI tests and manual library unchanged proof. | Local code/tests pass; linked/manual proof pending. | No-go |
| Detached rows are clear to users | Yes | Row details copy/screenshot/manual QA. | Local UI coverage exists; screenshot/manual QA pending. | No-go |
| Excel export is professional bid/BOQ workbook | Yes | Formula tests, reference contract, route-handler proof, large-fixture benchmark, Excel + secondary app open proof, hosted route timing. | Local ExcelJS/workbook tests, local route-handler workbook proof, hosted authenticated export proof, real downloaded DEMO_PROJECT_PLACEHOLDER workbook structural/Quick Look proof, synthetic 2,500-row benchmark pass, and synthetic Google Sheets import/open/recalc/print-preview pass; native Excel/Numbers/LibreOffice app proof and hosted route timing remain pending. | Partial-go |
| Resend delivery/webhook verified before visible email workflows are re-enabled | Yes | Domain DNS, delivery, webhook, bounce/complaint test. | Provider DNS/domain/send/inbox/clickthrough and signed delivered-event webhook reconciliation now pass for the real shared-link email; bounce/complaint events were not manufactured for the owner-only beta proof. | Partial-go |
| Legal pages accurate | Yes | Reviewed or closed-beta approved copy. | Local beta copy pass; owner/counsel sign-off pending. | No-go |
| Support/feedback path exists | Yes | Contact/support inbox and beta bug report route. | Protected `/workshop/feedback` exists and can persist to `beta_feedback_submissions` after migration apply; public contact form opens a structured support email draft; monitored inbox/table proof pending. | No-go |
| Observability/alerts configured | Yes | Error tracking, uptime, alert owner, export/auth/email alerts. | Local `/api/health` and runbook exist; deployed monitor/alert proof pending. | No-go |
| Backup/rollback plan proven | Yes | Backup proof, migration rollback, Vercel rollback, restore plan. | Backup/restore checklist exists; provider proof pending. | No-go |
| Investor demo pack ready | Yes for demo | Demo workspace, script, screenshots, sanitized export readback, fallback. | Local seed/demo script anchors, component/template screenshots, sanitized workbook readback, and template insertion proof exist; raw workbook artifacts are not retained in git; rehearsal and hosted proof pending. | No-go |
| Beta program ready | Yes for beta | Cohort, onboarding email, SLA, feedback loop, known limits. | Partial/docs: `40-closed-beta-operations-runbook.md` and `29-beta-program-readiness-plan.md` document add/revoke/manual invite/access verification/feedback triage/pause/rollback/24-72h monitoring procedures; hosted ops proof, monitoring ownership, legal sign-off, and live beta evidence remain missing. | No-go |

Local update 2026-06-02: visible pricing/payment copy is no longer a local no-go. `/pricing`, landing pricing, and FAQ now state closed beta / invite-only / no payment required / pricing after beta, with `closed-beta-pricing-copy` test coverage. Overall launch remains **NO-GO** because the other P0 rows above are still unproven.

## Readiness Scorecard

Rules: below 90 cannot be called beta-ready; P0 below 95 blocks launch; 100 requires completed proof.

| Domain | Score | Reason |
| --- | ---: | --- |
| Product core | 84 | Local DOM baseline is green; protected route/manual smoke gaps remain. |
| Estimate editor | 84 | Strong area; manual smoke and linked DB proof remain. |
| Component library | 90 | Local polish tests and screenshot smoke pass; hosted/manual proof remains. |
| Templates | 91 | Local preview tests, screenshot smoke, and insertion smoke pass; hosted/manual proof remains. |
| Project-specific unlink | 86 | Local RPC/action/hook/UI tests pass; linked/manual proof remains. |
| Excel export | 96 | Professional workbook tests, generated XLSX artifact, ZIP integrity, no-blank-total scan, local route-handler workbook proof, hosted authenticated export proof, real downloaded workbook structural/Quick Look proof, synthetic 2,500-row benchmark pass, and synthetic Google Sheets import/open/recalc/print-preview pass; native Excel/Numbers/LibreOffice app proof and hosted route timing remain. |
| Auth/onboarding | 78 | Local beta gate coverage and signed-out redirect/login UI E2E pass; Vercel env is empty, so hosted callback and first-run smoke are blocked. |
| Infrastructure/deployment | 76 | Latest app-runtime preview deploy `DEPLOYMENT_ID_PLACEHOLDER` is Ready and protected health works through `vercel curl`; env, public health, custom-domain app health, rollback, and linked Supabase proof remain blocked. |
| Email/Resend | 88 | Code fails closed when unconfigured; provider DNS/domain/send/inbox/clickthrough and signed delivered-event webhook reconciliation now pass for the real shared-link email. Bounce/complaint events were not manufactured for the owner-only beta proof. |
| Security/RLS | 70 | Local RLS/allowlist model exists; linked security advisor warns and linked denial/storage tests are missing. |
| Legal/privacy | 82 | Local beta terms/privacy copy exists; owner/counsel review missing. |
| Performance/caching | 65 | Current architecture plausible; export/route/load proof missing. |
| Observability/support | 82 | Local health route, support runbook, and protected feedback-table path exist; external alert/monitoring proof missing. |
| QA/test coverage | 82 | Local type/lint/unit/DOM/build pass; hosted/manual E2E proof missing. |
| Investor demo readiness | 82 | Local seed/demo plan anchors, sanitized fallback workbook readback, library/template screenshots, and insertion smoke proof exist; rehearsal proof remains missing. |
| Beta readiness | 40 | P0 legal/security/ops/product gates are unproven. |

## Explicit Launch No-Go Rules

Do not launch beta if:

- Ask Flip is visible while AI is deferred.
- AI routes are callable by default.
- Component unlink can mutate library data.
- Detached/project-specific rows are ambiguous to users.
- Excel export still looks like a raw data dump.
- Export formulas are untested.
- Export cannot open cleanly in Excel and at least one secondary spreadsheet app.
- Auth fails in production.
- RLS/migrations are not verified.
- Resend email delivery/webhook is unverified before invite/share email workflows are re-enabled, except the current owner-only beta proof now covers provider DNS/domain/send/inbox/clickthrough and signed delivered-event webhook reconciliation for the real shared-link email.
- Legal pages are misleading.
- No monitored support/feedback path exists. Local contact/support links, protected `/workshop/feedback`, and structured email draft handoff are not enough without linked migration, hosted smoke, inbox/table monitoring, and alert-owner proof.
- No rollback plan exists.
- No backup plan exists before migration.
- No core smoke test is completed.

## Beta Gates

| Gate | Required state |
| --- | --- |
| Closed beta legal | Terms/Privacy/Beta Agreement approved for limited beta or accurate pending-review copy with explicit access limitation. |
| Support loop | Support inbox, bug severity definitions, first 24/72-hour monitoring owner. |
| Data safety | Backup before migrations, RPO/RTO, restore owner, beta data retention terms. |
| Core workflow | Login -> workshop -> project -> estimate -> library/template insert -> export smoke passes. |
| Known limitations | AI deferred, billing deferred, PDF/bid tabulation post-MVP, no hidden prototype claims. |

## Investor Demo Gates

| Gate | Required state |
| --- | --- |
| Demo account | Seeded, resettable, non-production-client data only. |
| Demo script | Core promise in under 8 minutes; no AI or unfinished pages shown. |
| Export artifact | Pre-validated workbook opens in Excel and secondary app. |
| FAQ answers | Why AI deferred, why Excel first, data protection, scale, library moat, revenue path. |
| Fallback | Screenshots and validated workbook if live app fails. |

## Production Gates

| Gate | Required state |
| --- | --- |
| Vercel | Env vars, custom domain/SSL, preview/prod separation, rollback tested. |
| Supabase | Auth callback URLs, migrations, RLS/storage proof, backup/PITR plan. |
| Resend | Domain DNS, DKIM/SPF/DMARC, webhook secret, delivery proof, and unforced bounce/complaint incident-path handling. |
| Observability | Error tracking, uptime, slow route/export/auth/email alerts. |
| CI | Release branch cannot pass while critical E2E specs silently skip. |

## Unresolved Debt

Redis decision can remain MVP debt if public abuse surfaces are disabled or low-volume and durable Postgres rate limits pass smoke. It becomes launch-blocking if share/invite/email/AI public routes remain visible without reliable hot-path throttling. Billing, PDF export, bid tabulation, and full AI can remain deferred if product copy is honest.

## Owner Signature

Launch owner must add a dated sign-off only after every P0 row above has a linked proof artifact in `14-evidence-index.md`.
