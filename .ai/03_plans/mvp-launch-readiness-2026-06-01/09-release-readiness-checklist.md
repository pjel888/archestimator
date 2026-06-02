# Release Readiness Checklist

## Fourth-Pass Closed Beta Checklist - 2026-06-02

This checklist is now for closed beta, not public paid launch.

### Required Command Baseline

| Command | Status |
| --- | --- |
| `git status --short` | Dirty at validation refresh with unrelated skill/config churn plus intentionally untracked `.ai/08_prompts/mvp-launch-goal.md`; no launch evidence files were staged before the commands. |
| Evidence anchors | `02f7d13` for both `bun run validate` and `bun run build`. |
| `bun install --frozen-lockfile` | Pass |
| `bun run type-check` | Pass |
| `bun run lint` | Pass with 14 warnings |
| `bun run lint:design-system` | Pass |
| `bun run test` | Pass |
| `bun run test:dom` | Pass: 149 files / 1110 passed / 2 skipped through `bun run validate` |
| `bun run build` | Pass at `02f7d13`: Next.js 16.2.6 / Turbopack, 32 static pages |

### Closed Beta Gates

- [ ] `closed_beta_allowed_emails` migration exists and is applied after backup.
- [ ] `CLOSED_BETA_ACCESS_ENABLED=true` is configured in production when ready.
- [ ] `NEXT_PUBLIC_CLOSED_BETA_MODE=true` is configured for beta copy if used.
- [ ] Whitelisted Google user can enter `/workshop`.
- [ ] Non-whitelisted Google user cannot enter `/workshop`.
- [ ] Revoked user cannot enter `/workshop`.
- [ ] Public marketing pages remain public.
- [ ] Public share links remain accessible according to current sharing rules.
- [ ] `/pricing` is hidden or reframed as invite-only beta access.
- [ ] No payment setup is required.
- [ ] No checkout, subscriptions, invoices, paid plan UI, or billing enforcement is visible.
- [ ] Beta terms/privacy/AUP/disclaimers are visible.
- [ ] Feedback/support path is live and monitored. Protected `/workshop/feedback`, local contact/workshop links, and structured support email draft are implemented; linked migration, hosted smoke, inbox/table monitoring, and alert ownership proof remain open.
- [ ] Founder-led support process is ready.
- [ ] Production Google OAuth callback URLs are verified.
- [ ] Core project/estimate/component/template/unlink/export smoke passes.
- [ ] Runbook, rollback, and backup evidence exist.

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`
Current release state: **NO-GO**.

## Command Baseline

| Check | Priority | Owner | Required proof | Artifact | Status |
| --- | --- | --- | --- | --- | --- |
| `bun install --frozen-lockfile` | P0 | Eng | Install exits 0 without lockfile changes. | `14-evidence-index.md` | Pass |
| `bun run type-check` | P0 | Eng | TypeScript exits 0. | `14-evidence-index.md` | Pass |
| `bun run lint` | P0 | Eng | No lint errors; warnings triaged. | `14-evidence-index.md` | Pass with warnings |
| `bun run lint:design-system` | P0 | Design/Eng | Design-system lint exits 0. | `14-evidence-index.md` | Pass |
| `bun run test` | P0 | Eng | Bun tests pass. | `14-evidence-index.md` | Pass |
| `bun run test:dom` | P0 | Eng | Vitest DOM suite passes. | `14-evidence-index.md` | Pass |
| `bun run build` | P0 | Eng | Production build exits 0. | `14-evidence-index.md` | Pass |
| `bun run test:e2e` | P0 | QA | Safe E2E smoke passes or documented env block. | `14-evidence-index.md` | Local pass at `bb9006d`: `PLAYWRIGHT_PORT=3020 bun run test:e2e -- --project=chromium` passed 9 ungated checks with 24 env-gated specs skipped; hosted/manual smoke still required |
| CI parity | P0 | Eng | CI runs same or stricter gates. | `.github/workflows/ci.yml` | Partial; env-gated specs can skip |

## Launch Checklist

| Gate | Priority | Ticket | Owner | Required proof | Artifact path | Phase | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Hide/fail-close Ask Flip | P0 | `AI-001` | Eng | UI absent, routes disabled before handler, no provider calls. | `tests/vitest/*ai*`, route tests, screenshot | PR-1 | Local pass; production env proof pending |
| Env manifest complete | P0 | `INFRA-001` | Eng/Release | `.env.example` and Vercel env list cover all runtime vars. | `22-infrastructure...md`, `.env.example` diff | PR-1 | Local manifest pass; Vercel/provider proof pending |
| Hosted auth smoke | P0 | `ONB-001` | Eng/QA | Google, magic link, callback, workshop landing in staging/prod. | Manual QA log | PR-2 | Blocked |
| First-run UX | P0 | `ONB-001` | Product/UX | Empty workspace/project/estimate/library paths are understandable. | Screenshot set + DOM tests | PR-2 | Blocked |
| Component library credible | P1 | `LIB-001` | Product/Eng | Search/filter/empty/error/trust fields validated. | UI tests + screenshots | PR-3 | Local UI test and screenshot smoke pass; hosted/manual proof pending |
| Templates credible | P1 | `TPL-001` | Product/Eng | Preview/insertion/empty states verified. | UI tests + screenshots | PR-3 | Local UI test, screenshot smoke, and insertion smoke pass; hosted/manual proof pending |
| Project-specific unlink | P0 | `UNLINK-001` | Eng | Detached rows do not mutate library, history recorded. | RPC/action/UI tests + SQL proof | PR-4 | Local code/test pass; linked SQL/manual proof pending |
| Excel bid workbook | P0 | `EXP-001` | Eng/Product | Formula workbook opens in Excel and one secondary app. | XLSX artifact + ExcelJS tests | PR-5 | Local ExcelJS pass; cross-app open proof pending |
| RLS/security proof | P0 | `SEC-001` | Security/Eng | RLS denial, storage denial, route access matrix pass. | SQL output + test logs | PR-6 | Blocked |
| Resend delivery/webhook | P0 if email visible | `INFRA-002` | Release | Domain verified, inbox delivery, webhook receipt. | Resend dashboard + webhook log | PR-6 | Blocked |
| Legal pages approved | P0 | `LEGAL-001` | Legal/Product | Terms, Privacy, beta agreement, AUP approved or beta-limited copy accepted. | Legal sign-off note | PR-7 | Local beta copy pass; counsel/owner sign-off pending |
| Observability/support | P0 | `OBS-001` | Ops | Error tracking, uptime, alert owner, support inbox/table review. | Dashboard links/runbook | PR-7 | Local protected feedback path, honest support email draft, and health route pass; deployed monitor/alert proof pending |
| Backup/DR | P0 | `DATA-001` | Ops/Eng | Pre-migration backup, restore plan, RPO/RTO documented. | Backup proof + drill notes | PR-8 | Blocked |
| Zero-defect matrix | P0 | `QA-002` | QA/Eng | Main feature matrix passes or no-go remains. | `33-main-feature-zero-defect-test-matrix.md` | PR-8 | Blocked |
| Investor demo pack | P0 for demo | `DEMO-001` | Product | Demo workspace, script, export artifact, fallback. | Demo checklist/screenshots | PR-9 | Blocked |
| Beta program | P0 for beta | `BETA-001` | Product/Support | Cohort, email, feedback, SLA, known limits. | Beta readiness doc | PR-9 | Blocked |

## No-Go Summary

The release remains no-go because hosted/provider/manual P0 gates are not proven. Local command baseline is green and AI is hidden/fail-closed by default, but legal pages still need owner/counsel review; the export needs cross-app open proof; and RLS/Auth/Resend/deploy/rollback/backup evidence is missing.
