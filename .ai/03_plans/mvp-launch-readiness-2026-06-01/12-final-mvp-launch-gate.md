# Final MVP Launch Gate

## Fourth-Pass Closed Beta Launch Gate - 2026-06-02

This gate is now the closed beta launch gate. It is not a public paid-launch gate.

### Command Evidence

- HEAD audited: `811362ac70d84cf20101f83258ae22c4e8b2c11f`.
- `bun install --frozen-lockfile`: pass.
- `bun run type-check`: pass.
- `bun run lint`: pass with 14 warnings.
- `bun run lint:design-system`: pass.
- `bun run test`: pass.
- `bun run test:dom`: fail, 3 existing static-contract assertions.
- `bun run build`: pass.

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

Closed beta launch is blocked until the allowlist/auth P0 and beta legal/feedback P0 are implemented and smoked.

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`
Gate owner: Philip / Launch lead
Current decision: **NO-GO**.

## Final Go / No-Go Table

| Gate | P0? | Required evidence | Current status | Decision |
| --- | --- | --- | --- | --- |
| Ask Flip hidden and AI routes disabled by default | Yes | UI test, route test, no provider-call test, production env false. | Not implemented. | No-go |
| Core commands green | Yes | Install, typecheck, lint, design lint, unit, DOM, build, E2E. | `test:dom` fails; E2E blocked by local port collision. | No-go |
| Auth works in production | Yes | Hosted Google and magic-link callback smoke, logout/session expiry. | Local/code evidence only. | No-go |
| RLS/migrations verified | Yes | Linked/staging SQL denial/allow queries, migration history, generated types. | Local migrations/types only. | No-go |
| Component unlink cannot mutate library data | Yes | RPC/action/UI tests and manual library unchanged proof. | Planned only. | No-go |
| Detached rows are clear to users | Yes | Row details copy/screenshot/manual QA. | Planned only. | No-go |
| Excel export is professional bid/BOQ workbook | Yes | Formula tests, reference contract, Excel + secondary app open proof. | Current workbook is insufficient. | No-go |
| Resend delivery/webhook verified if visible | Yes | Domain DNS, delivery, webhook, bounce/complaint test. | Missing. | No-go |
| Legal pages accurate | Yes | Reviewed or closed-beta approved copy. | Pending-review placeholders. | No-go |
| Support/feedback path exists | Yes | Contact/support inbox and beta bug report route. | Partial public contact only. | No-go |
| Observability/alerts configured | Yes | Error tracking, uptime, alert owner, export/auth/email alerts. | Missing external stack. | No-go |
| Backup/rollback plan proven | Yes | Backup proof, migration rollback, Vercel rollback, restore plan. | Planned only. | No-go |
| Investor demo pack ready | Yes for demo | Demo workspace, script, screenshots, export artifact, fallback. | Planned only. | No-go |
| Beta program ready | Yes for beta | Cohort, onboarding email, SLA, feedback loop, known limits. | Planned only. | No-go |

## Readiness Scorecard

Rules: below 90 cannot be called beta-ready; P0 below 95 blocks launch; 100 requires completed proof.

| Domain | Score | Reason |
| --- | ---: | --- |
| Product core | 78 | Core app exists but launch proof and UX polish gaps remain. |
| Estimate editor | 82 | Strongest area, but DOM failures and manual smoke gaps remain. |
| Component library | 80 | Functional, but trust fields, empty states, and demo data need proof. |
| Templates | 74 | Functional path exists; preview/discovery/seed quality gaps remain. |
| Project-specific unlink | 35 | Schema foundation exists; product flow not complete. |
| Excel export | 45 | XLSX route exists; bid workbook contract not implemented. |
| Auth/onboarding | 78 | Code path exists; hosted proof and first-run polish missing. |
| Infrastructure/deployment | 55 | Build passes; live env/deploy/rollback proof missing. |
| Email/Resend | 50 | Code exists; DNS/delivery/webhook proof missing; mock-success risk. |
| Security/RLS | 62 | RLS migrations exist; threat-model proof and live denial tests missing. |
| Legal/privacy | 25 | Public pages are placeholders. |
| Performance/caching | 65 | Current architecture plausible; export/route/load proof missing. |
| Observability/support | 35 | Mostly logs/dev monitor; no alerting/support operations. |
| QA/test coverage | 58 | Important coverage exists but `test:dom` fails and E2E is gated/blocked. |
| Investor demo readiness | 45 | No reliable demo workspace/export/fallback pack yet. |
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
- Resend email delivery/webhook is unverified for invite/share paths if those paths are visible.
- Legal pages are misleading.
- No support/feedback path exists.
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
| Resend | Domain DNS, DKIM/SPF/DMARC, webhook secret, delivery proof. |
| Observability | Error tracking, uptime, slow route/export/auth/email alerts. |
| CI | Release branch cannot pass while critical E2E specs silently skip. |

## Unresolved Debt

Redis decision can remain MVP debt if public abuse surfaces are disabled or low-volume and durable Postgres rate limits pass smoke. It becomes launch-blocking if share/invite/email/AI public routes remain visible without reliable hot-path throttling. Billing, PDF export, bid tabulation, and full AI can remain deferred if product copy is honest.

## Owner Signature

Launch owner must add a dated sign-off only after every P0 row above has a linked proof artifact in `14-evidence-index.md`.
