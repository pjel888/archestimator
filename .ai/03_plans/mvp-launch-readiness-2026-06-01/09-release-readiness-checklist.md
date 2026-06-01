# Release Readiness Checklist

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
| `bun run test:dom` | P0 | Eng | Vitest DOM suite passes. | `14-evidence-index.md` | **Fail** |
| `bun run build` | P0 | Eng | Production build exits 0. | `14-evidence-index.md` | Pass |
| `bun run test:e2e` | P0 | QA | Safe E2E smoke passes or documented env block. | `14-evidence-index.md` | Blocked by port collision |
| CI parity | P0 | Eng | CI runs same or stricter gates. | `.github/workflows/ci.yml` | Partial; env-gated specs can skip |

## Launch Checklist

| Gate | Priority | Ticket | Owner | Required proof | Artifact path | Phase | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Hide/fail-close Ask Flip | P0 | `AI-001` | Eng | UI absent, routes disabled before handler, no provider calls. | `tests/vitest/*ai*`, route tests, screenshot | PR-1 | Blocked |
| Env manifest complete | P0 | `INFRA-001` | Eng/Release | `.env.example` and Vercel env list cover all runtime vars. | `22-infrastructure...md`, `.env.example` diff | PR-1 | Blocked |
| Hosted auth smoke | P0 | `ONB-001` | Eng/QA | Google, magic link, callback, workshop landing in staging/prod. | Manual QA log | PR-2 | Blocked |
| First-run UX | P0 | `ONB-001` | Product/UX | Empty workspace/project/estimate/library paths are understandable. | Screenshot set + DOM tests | PR-2 | Blocked |
| Component library credible | P1 | `LIB-001` | Product/Eng | Search/filter/empty/error/trust fields validated. | UI tests + screenshots | PR-3 | Not started |
| Templates credible | P1 | `TPL-001` | Product/Eng | Preview/insertion/empty states verified. | UI tests + screenshots | PR-3 | Not started |
| Project-specific unlink | P0 | `UNLINK-001` | Eng | Detached rows do not mutate library, history recorded. | RPC/action/UI tests + SQL proof | PR-4 | Blocked |
| Excel bid workbook | P0 | `EXP-001` | Eng/Product | Formula workbook opens in Excel and one secondary app. | XLSX artifact + ExcelJS tests | PR-5 | Blocked |
| RLS/security proof | P0 | `SEC-001` | Security/Eng | RLS denial, storage denial, route access matrix pass. | SQL output + test logs | PR-6 | Blocked |
| Resend delivery/webhook | P0 if email visible | `INFRA-002` | Release | Domain verified, inbox delivery, webhook receipt. | Resend dashboard + webhook log | PR-6 | Blocked |
| Legal pages approved | P0 | `LEGAL-001` | Legal/Product | Terms, Privacy, beta agreement, AUP approved or beta-limited copy accepted. | Legal sign-off note | PR-7 | Blocked |
| Observability/support | P0 | `OBS-001` | Ops | Error tracking, uptime, alert owner, support inbox. | Dashboard links/runbook | PR-7 | Blocked |
| Backup/DR | P0 | `DATA-001` | Ops/Eng | Pre-migration backup, restore plan, RPO/RTO documented. | Backup proof + drill notes | PR-8 | Blocked |
| Zero-defect matrix | P0 | `QA-002` | QA/Eng | Main feature matrix passes or no-go remains. | `33-main-feature-zero-defect-test-matrix.md` | PR-8 | Blocked |
| Investor demo pack | P0 for demo | `DEMO-001` | Product | Demo workspace, script, export artifact, fallback. | Demo checklist/screenshots | PR-9 | Blocked |
| Beta program | P0 for beta | `BETA-001` | Product/Support | Cohort, email, feedback, SLA, known limits. | Beta readiness doc | PR-9 | Blocked |

## No-Go Summary

The release remains no-go because P0 gates are planned, not proven. `test:dom` is red; AI is visible/callable; legal pages are not reviewed; export is not launch-grade; RLS/Auth/Resend/deploy/rollback evidence is missing.
