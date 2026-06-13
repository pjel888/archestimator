# Estimate Tabs Implementation Completion Audit

Date: 2026-06-13 (Asia/Manila)
Branch/worktree: `feat/estimate-tabs-phase5-templates-panel` at `/Users/philiplewis/archestimator.omx-worktrees/launch-codex-projects-auto-added-to-templates`
Source implementation prompt: `.ai/08_prompts/IMPLEMENT-2026-06-12-Projects-Auto-Added-To-Templates.md`
Archived plan path after closeout: `.ai/09_archive/store/2026-06-12-Projects-Auto-Added-To-Templates/`

## Verdict

**LOCAL_IMPLEMENTATION_COMPLETE_FOR_MERGE.** The repo-local implementation, tests, documentation, and release-boundary proof are complete enough for the requested branch push/merge. Provider-mutating, hosted, production, spreadsheet-app, and two-browser manual proof remains explicitly outside this local closeout and is listed below as `provider-proof-open` / `manual-proof-pending`.

## Stop-condition checklist

| # | Requirement | Status | Proof |
|---|---|---|---|
| 1 | Phases 0–8 in `10_IMPLEMENTATION_PHASES.md` meet their local DoD | ✅ local-only | Phase logs under `.ai/05_logs/2026-06-12-estimate-tabs-phase0-implementation-run.md`, phase1–phase6 logs, and 2026-06-13 closeout logs; final validation commands below passed. |
| 2 | Every non-deferred RTM row implemented and verified | ✅ local-only | `13_REQUIREMENTS_TRACEABILITY_MATRIX.md` has no remaining non-legend `planned` rows; rows R1.7/R7.4 remain explicit deferred/follow-up boundaries. |
| 3 | Zero new local failures vs Phase 0 baseline across validate/build/RLS/perf/export/targeted Playwright | ✅ local-only | Final logs: `bun-run-validate-final-closeout-rerun-after-team-cleanup.log`, `bun-run-build-final-closeout-rerun.log`, `estimate-tabs-local-postgres-proof-final.log`, `vitest-perf-final.log`, `vitest-export-regression-final.log`, `playwright-targeted-env-gated.log`. |
| 4 | Edge-case catalog covered by automated or logged manual/provider boundary entries | ✅ local-only + pending external | Coverage is distributed through targeted Vitest, local Postgres harness, env-gated Playwright smoke, and UltraQA report `.ai/05_logs/2026-06-13-estimate-tabs-ultraqa-local-closeout.md`; external/browser/manual items are enumerated below. |
| 5 | Denial scenarios 1–9 proven | ✅ local-only | `POSTGRES_BIN_DIR=/opt/homebrew/bin node scripts/prove-estimate-tabs-postgres.mjs` passed; RTM rows R7.1–R7.3 and `08_ACCESS_SECURITY_RLS_PLAN.md` §7 map the 9 scenarios. |
| 6 | Perf budgets met | ✅ local-only | `bunx vitest run tests/vitest/perf --maxWorkers=1` passed 4 files / 14 tests; RTM R1.6/R8.6/R13.1-R13.2 record 5×500 export benchmark 443.59 ms / 0.39 MiB. |
| 7 | D-15 honored | ✅ local-only | Export parity is implemented before user-visible multi-tab creation; R10.6 and Phase 6 proof show all-tabs and `?tab=` export support plus preview scope chips. |
| 8 | Final audit updates truth surfaces | ✅ | This file plus `.ai/10_state/current-state.md` and `.ai/10_state/decisions.md` top entries updated on 2026-06-13. |
| 9 | Plan pack archived only after audit | ✅ after git mv | Final closeout moves the former active plan pack into `.ai/09_archive/store/2026-06-12-Projects-Auto-Added-To-Templates/` and updates archive README/current-state pointers. |

## Per-phase outcomes

| Phase | Outcome | One-line evidence |
|---|---|---|
| 0 baseline | Baseline captured and later rerun stayed green locally | `.ai/05_logs/2026-06-12-estimate-tabs-phase0-implementation-run.md`; final `bun run validate`/`bun run build` passed. |
| 1 database tab foundation | `estimate_tabs`, node tab ownership, tab lifecycle RPCs, RLS/policy/harness implemented locally | `supabase/migrations/20260612094734_estimate_tabs_foundation.sql`; `estimate-tabs-local-postgres-proof-final.log`. |
| 2 domain/repository | Tab-aware loaders/actions/query keys, route fallback, package-builder targeting implemented locally | RTM R1.3/R9.1/R11.1-R11.2; targeted Vitest logs in phase2 and 2026-06-13 AI logs. |
| 3 editor UI | Tab strip, per-tab selection/expansion, a11y/focus, D-15 lifecycle gate implemented locally | `EstimateTabStrip` tests, `vitest-perf-final.log`, `2026-06-13-estimate-tabs-r1-7-cross-tab-rejection-run.md`. |
| 4 terminology | User-facing sheet→estimate/tab copy rebrand applied while internal keep-list preserved | phase4 logs plus `2026-06-13-estimate-tabs-r2-4-owner-review-copy-alignment.md`. |
| 5 templates panel | Custom templates + virtual project sources, lazy browse, preview/search/save-as-template seams implemented locally | `2026-06-13-estimate-tabs-r4-template-source-local-proof-refresh.md`; final env-gated Playwright smoke exists. |
| 6 XLSX export | Multi-tab workbook/export route/preview scope chips implemented; single-tab regression preserved | `2026-06-12-estimate-tabs-phase6-xlsx-tabs-export-implementation-run.md`; `vitest-export-regression-final.log`; `2026-06-13-estimate-tabs-r8-5-preview-scope-chips-run.md`. |
| 7 hardening | Activity, presence, publication, invite/share, AI read context, perf/a11y, local UltraQA refreshed | 2026-06-13 R9/R10/R11/R13 logs and `2026-06-13-estimate-tabs-ultraqa-local-closeout.md`. |
| 8 docs/rollout/cleanup | RTM/current-state/decisions/completion audit/archive updated; shim deletion remains deferred by gate | This audit, current-state/decisions top entries, and archive move. |

## Final validation commands

| Command | Result | Log |
|---|---:|---|
| `git diff --check` | 0 | `.ai/05_logs/2026-06-13-estimate-tabs-closeout/git-diff-check-before-final-audit.log` |
| `bun run validate` | 0 | `.ai/05_logs/2026-06-13-estimate-tabs-closeout/bun-run-validate-final-closeout-rerun-after-team-cleanup.log` — type-check passed; ESLint 0 errors / 549 warnings; design-system passed; design lint passed; unit 9 passed; DOM Vitest 243 files passed / 1 skipped, 1808 tests passed / 3 skipped. |
| `bun run build` | 0 | `.ai/05_logs/2026-06-13-estimate-tabs-closeout/bun-run-build-final-closeout-rerun.log` — Next.js 16.2.6 build passed; 35 static pages generated. |
| `POSTGRES_BIN_DIR=/opt/homebrew/bin node scripts/prove-estimate-tabs-postgres.mjs` | 0 | `.ai/05_logs/2026-06-13-estimate-tabs-closeout/estimate-tabs-local-postgres-proof-final.log` — estimate-tabs local Postgres proof passed. |
| `bunx vitest run tests/vitest/perf --maxWorkers=1` | 0 | `.ai/05_logs/2026-06-13-estimate-tabs-closeout/vitest-perf-final.log` — 4 files / 14 tests passed. |
| `bunx vitest run tests/vitest/proposal-workbook.test.ts tests/vitest/proposal-export-model.test.ts tests/vitest/proposal-export-route.test.ts tests/vitest/proposal-export-route-workbook.test.ts --maxWorkers=1` | 0 | `.ai/05_logs/2026-06-13-estimate-tabs-closeout/vitest-export-regression-final.log` — 4 files / 22 tests passed. |
| `bunx playwright test e2e/estimate-tabs.spec.ts e2e/workshop-template-insert-smoke.spec.ts e2e/workshop-project-specific-unlink-smoke.spec.ts --reporter=list` | 0 | `.ai/05_logs/2026-06-13-estimate-tabs-closeout/playwright-targeted-env-gated.log` — 3 tests discovered and skipped by env gates; no provider mutation. |

## RTM flip table summary

Every row in `13_REQUIREMENTS_TRACEABILITY_MATRIX.md` now has one of these non-`planned` statuses:

- `implemented (local-only)` / `implemented locally`: R1.1-R1.6, R2.1-R2.5, R3.1-R3.3, R4.1-R4.6, R5.1-R5.3, R6.1-R6.3, R7.1-R7.3, R8.1-R8.6, R9.1-R9.3, R10.1-R10.6, R11.1-R11.3, R12.1-R12.3, R13.1-R13.4.
- `deferred`: R1.7 true cross-tab move RPC semantics and R7.4 tab-level ACLs.
- Explicit proof-open labels remain for linked/provider/hosted/manual proof, not for unimplemented local code.

## Edge-case catalog proof map

- **Tabs/data:** tab CRUD/state/tree isolation/backfill/rollback paths — schema tests, local Postgres proof, `estimate-tab-strip` and tree/reorder DOM/action suites, R1.7 rejection log.
- **Routing/URLs:** node/estimate fallback, invite/share links, Ask route regex — RTM R9/R11 and R9.3/R13 local proof log.
- **Rebrand:** copy table, mass-delete phrase flip, keep-list guard, AI regexes — phase4 logs and R2.4 owner/product-review log.
- **Templates panel:** unreadable/pending source exclusion, lazy read path, preview/search/refresh, save-as-template, bulk/keyboard insertion — phase5 logs, R4 refresh log, local Postgres/action proof.
- **Export:** sanitizer, dedupe, reserved names, single-tab byte-shape, multi-tab summary refs, `?tab=` 404s, 413/benchmark — phase6 log, R8.5 log, final export/perf logs.
- **Collaboration/snapshots:** cursor tabId, presence active tab, v1.2 publication snapshots and v1.1 compatibility, tab activity events — R10.1-R10.5 logs.

## Denial scenarios 1–9

| Scenario | Local proof |
|---|---|
| 1 restricted estimate absent/direct outline denied | RTM R7.1; local RLS harness and reusable-source action suites. |
| 2 sheet-member-only user sees exactly their estimate | RTM R7.1/R9.3; local access suites and harness. |
| 3 project owner/admin restricted estimate source absent | RTM R7.1; local RLS harness restricted-estimate checks. |
| 4 viewer forged insert rejected/no rows/no event | RTM R7.2; local action/RPC contract and harness. |
| 5 unreadable source rejected/no write | RTM R7.2; local action/RPC contract. |
| 6 cross-workspace source rejected | RTM R7.2 and `08_ACCESS_SECURITY_RLS_PLAN.md` §7; local RPC guard proof. |
| 7 deleted source between browse and insert typed error | R4/R7 local stale-source/action proof logs. |
| 8 anonymous export login redirect unchanged | export route auth chain plus final export route regression suite; hosted smoke remains pending. |
| 9 `estimate_tabs` RLS allow/deny/write-deny | `estimate-tabs-local-postgres-proof-final.log`. |

## Proof-boundary ledger

### Local-only / merge-ready

- Source, migration, generated-type contract patch, tab UI, template panel virtual sources, XLSX export, publication/activity/presence/AI tab handling.
- Full local validation/build/export/perf/Postgres proof listed above.
- Targeted Playwright specs are present and env-gated; final discovery run skipped safely without provider mutation.

### Provider-proof-open

- Linked Supabase migration apply/typegen (`npx supabase@2.98.2 db push`, linked `migration list`, linked typegen).
- Supabase advisor re-check.
- Hosted export verification (`bun run launch:verify-hosted-export`) and Vercel deploy/promote.
- Hosted invite/share/publication/route smoke.

### Manual-proof-pending

- Spreadsheet-app workbook inspection.
- Two-browser collaboration/cursor QA.
- 375px responsive/browser pass.
- Old-bookmark export link verification in a real browser session.
- Storybook/visual a11y pass.

## Baseline-vs-final comparison

- Phase 0 baseline captured the repo-specific validation state; later local changes did not add failing tests.
- Final `bun run validate` passed with the same known warning class (ESLint warnings, no errors) and 1808 DOM tests passed / 3 skipped.
- Final `bun run build` passed after restoring tracked route-type churn when necessary.

## Deferred follow-ups

- **D-5 / R7.4:** tab-level ACLs remain deferred.
- **D-7 / R1.7:** true cross-tab node moves remain deferred pending a new move RPC/product semantics; v1 rejects cross-tab tree-node drops with a workaround message.
- **D-8:** template editor stays template-only; broader project-source editing remains out of scope.
- **Provider/manual proof:** linked Supabase, hosted/Vercel, spreadsheet/browser/manual gates remain queued for owner-authorized provider/manual sessions.

## Archive completion note

This audit is intentionally written before the final archive move. The closeout commit includes the audit, truth-surface updates, target Playwright spec/fixture fixes, and the `git mv` archive of the plan pack.
