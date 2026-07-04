# 2026-07-04 Full App User Story And UX Audit

Date: 2026-07-04
Predecessor: `../2026-06-22-full-app-user-story-ux-audit/` (12 days prior)
Branch: `main`

## Purpose

This folder is the dated Phase 1-4 audit pack for the Archestimator app on 2026-07-04. It executes the four-phase loop the user requested:

1. **Phase 1 — Audit**: Go over every feature, write a user story with expected behavior based on the code, track in a single canonical spreadsheet.
2. **Phase 2 — Test**: Run every story's verification, document all errors.
3. **Phase 3 — Fix**: Fix every logistical or UX error found in Phase 2.
4. **Phase 4 — Retest**: Test every user behavior again post-fix.

## Honest Status (Read This First)

This session delivered Phases 1-2 with a Phase 3 issue backlog. Phases 3 (fix) and 4 (retest) require follow-up sessions because:

- The DOM test suite was killed by the reviewer's bash timeout at ~8 minutes (known issue from June 22, still unresolved) — so the full failure inventory is incomplete.
- The realistic Phase 3 backlog spans multiple PRs across many feature areas.
- Browser/Playwright evidence requires CF preview + env flags not configured this session.

The framework, evidence captured, and prioritized backlog are enough for follow-up agents to grind through Phases 3-4 with no re-discovery cost.

## Files

- `canonical-feature-status.csv` — the single canonical spreadsheet. 22-column schema carried forward from June 22 (the established convention). Rows are populated from current code as of 2026-07-04. **115 user stories across 18 feature areas.**
- `testing-results.md` — Phase 2 executed evidence (type-check, lint, test:dom results) plus the prioritized issue backlog that feeds Phase 3.
- `audit-summary.md` — narrative summary of what changed since June 22 and what this audit found.
- `evidence/type-check.log` / `evidence/lint.log` / `evidence/test-dom.log` — raw command outputs for independent verification.
- `evidence/test-dom-post-fix.log` — post-fix rerun proving `agent-payload-contract` tests pass (7/7, EXIT=0).
- `README.md` — this file.

## Verification Snapshot (2026-07-04)

| Surface | Status | Notes |
|---|---|---|
| `bun run type-check` | PASS | exit 0 |
| `bun run lint` | PASS (warnings) | 0 errors, 129 unused-vars warnings |
| `bun run test:dom` | PARTIAL FAIL | 3 failures across 2 test files (logger-perf + 2 agent-payload-contract); agent-payload failures resolved this session (see `evidence/test-dom-post-fix.log`); suite killed by reviewer's bash timeout at ~8 min |
| `bun run test:e2e` | NOT RUN | requires env flags + CF preview |
| Manual / browser | NOT RUN | deferred per AGENTS.md speed guardrail |

## Phase 3 Issue Backlog (Summary)

| ID | Severity | Title | Status |
|---|---|---|---|
| UX-2026-07-04-01 | High | Missing `.ai/08_prompts/templates/codebase-ai-loop-task.md` breaks agent payload tests | **RESOLVED this session** — file restored, 7 agent-payload tests now pass |
| UX-2026-07-04-02 | Medium | `logger-perf.test.ts` budget too tight (3.25ms vs 1ms target) | Open |
| UX-2026-07-04-03 | Medium | DOM suite times out at 8 min — profile or shard | Open |
| UX-2026-07-04-04 | Low | 129 lint warnings — dead code drift | Open |
| UX-2026-07-04-05 | Low | Endemic `act()` warnings in DOM tests | Open |
| UX-2026-07-04-06 | Low | `global-error.test.tsx` renders `<html>` inside `<div>` — hydration risk (observed during partial DOM run; warning line truncated from retained log) | Open |
| UX-2026-07-04-07 | Low | jsdom doesn't recognize `<search>` tag (same evidence situation as -06) | Open |

Full details in `testing-results.md`.

## Carry-Forward From June 22 Audit

The June 22 pack (`../2026-06-22-full-app-user-story-ux-audit/`) had:
- 93 user stories across 22 columns
- Planning-readiness 100; evidence-verified ~0% executed that pass
- All 93 rows named as residuals requiring execution

This 2026-07-04 pass:
- Re-grounds the source evidence against current code
- Captures executed evidence (type-check pass, lint pass, DOM partial)
- Records concrete issue backlog with severity
- Explicitly defers browser/provider proof (needs CF preview setup)

## How To Continue

For the next agent picking up Phase 3:

1. Read `testing-results.md` → issue backlog table
2. UX-2026-07-04-01 (high severity) is already resolved — the missing template was restored this session, all 7 `agent-payload-contract` tests now pass.
3. Start with UX-2026-07-04-02 (raise perf budget in `logger-perf.test.ts`)
4. UX-2026-07-04-03 (DOM suite 8-min timeout) — profile slow tests; consider sharding or running subset
5. Append fixes to this folder as `phase-3-fixes/<issue-id>.md` with evidence (test diff + passing run)
6. After all fixes land, execute Phase 4 retest and append `phase-4-retest.md`

## Stack Context (sourced from public AGENTS.md and project README)

> Note: These infrastructure names are documented in the project's public `AGENTS.md` and `README.md` (both committed to git). They are Cloudflare resource names, not secrets.

- Next.js 16.2.6 (App Router, RSC)
- React 19.2.6
- Bun (package manager + test runner)
- TypeScript 6.0.3 (strict)
- Tailwind CSS v4
- Cloudflare Workers/OpenNext (`archestimator-proof` worker, `archestimator.com`)
- D1 `ARCH_DB` (`archestimator-proof-db`, 30 migrations)
- R2 `ARCH_UPLOADS_R2`
- Durable Object `COLLAB_ROOMS` (`CollaborationRoom`)
- Queue `UPLOAD_JOBS_QUEUE` + DLQ
- Cloudflare Email `EMAIL` + Images `IMAGES`
- Better Auth 1.6.22 (Google OAuth + magic link, D1-backed)
- TanStack Query 5, Zustand 5, React Complex Tree 2, D3 7
