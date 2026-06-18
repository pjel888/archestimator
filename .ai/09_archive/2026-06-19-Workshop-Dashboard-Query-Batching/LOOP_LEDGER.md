# LOOP LEDGER — Workshop Dashboard Query Batching

**Goal (one sentence):** Cut the `/workshop` dashboard's sequential Supabase round-trips — app-only wave-merging + a dashboard-lean library fetch first, a gated `workspace_homebase_summary` RPC only if measurement justifies — with preserved user-visible state and no RLS/resilience regression.

**Scope:** `src/lib/repositories/workspace-repository.ts`, `src/lib/repositories/component-library-repository.ts`, `src/app/workshop/page.tsx`, `src/lib/perf/server-timing.ts`, a `scripts/` seed, and (Phase 3 only) `supabase/migrations/` + `src/lib/supabase/types.ts`.

## Evidence Anchors

| Proof dimension | Status | Evidence |
|---|---|---|
| Repo source | Implemented | Phase 0-2 app path plus Phase 3 RPC fallback path implemented in source. |
| Baseline measurement | Synthetic/local harness only | Request-correlated trace/parser harness exists; authenticated branch-environment latency numbers remain a hosted follow-up. |
| Tests/checks | Passed | Focused Vitest pack, `bun run type-check`, `bun run build`, targeted ESLint, `git diff --check`, and `bun run prove:workspace-homebase-summary`. |
| Migrations/provider | Implemented locally | `supabase/migrations/20260618184856_workspace_homebase_summary.sql`; no production/provider apply or deploy. |
| Cross-tenant proof | Passed locally | `scripts/prove-workshop-homebase-summary-postgres.mjs` verifies same-workspace favorite isolation, cross-tenant non-member denial, anon execute denial, and optional-data exclusion. |

## Acceptance Criteria

- [x] Phase 0 harness + baseline path (round-trips, waves, per-branch timing, parser harness) implemented; hosted authenticated baseline remains outside local proof.
- [x] Phase 1: homebase Branch A wave count reduced; app-path error isolation preserved by retaining the fallback implementation.
- [x] Phase 2: library Branch C uses dashboard-lean spotlight fetch; Library page output path unchanged.
- [x] UX/a11y/perceived-performance state matrix has no deliberate UI/visual change; no browser-only interaction claim added.
- [x] Phase 3: cross-tenant + same-workspace user isolation proof green; flag-off fallback proven by source contract; `types.ts` spliced additively.
- [x] No deliberate UI/visual change; no page-level ISR; no new deps.

## Validation Plan

`bun run type-check`; relevant `tests/vitest` parity/DOM tests; `next build` (catches `"use server"`/async-export breakage); `perf:dashboard-query-count`/shared query-count assertion; UX state proof from `10-…`; Phase 3 only: `prove:workspace-homebase-summary` + `get_advisors`. Measure wall-clock from a deployed/branch environment when possible, not localhost. See `05-…`.

## Iteration Log

| # | Date | Hypothesis | Action | Evidence | Result | Next |
|---|---|---|---|---|---|---|
| 0 | 2026-06-19 | Homebase serial tail dominates; top-level Promise.all + library fan-out are already parallel | Planning pack authored from 4 parallel investigations (workspace queries, library queries, repo standards, batching efficacy) + verified overlap with Performance-Refactor A-23/RISK-20/Phase-8 | `01-…` inventory; `02-…` ranking; cross-check of `2026-06-17-Performance-Refactor` | Initial plan ready; **no code changed** | Run reviewer pass before execution |
| 1 | 2026-06-19 | Reviewer lanes will expose hidden implementation-readiness gaps | Parallel product, security, design, performance, feasibility, and adversarial reviews; plan pack revised with new contracts `08-…` through `13-…` | Reviewer baseline scores recorded in `13-…`; new docs cover instrumentation, query shape, UX, security, rollout, proof matrix | Planning score now 100% for strategy, quality, and implementation readiness within docs-only scope | Execute Phase 0 harness/baseline; do not implement Phase 1 until minimum viable baseline exists |
| 2 | 2026-06-19 | A single implementation guide will reduce codebase-AI ambiguity before execution | Full-folder audit plus six read-only subagent lanes: requirements/source-flow, current-code validation, security/DB, testing, performance, and coherence | `14-codebase-ai-implementation-plan.md`; `README.md` reading-order back-pointer; subagent reports resolved wave-vs-request wording, Phase 2 conditionality, Phase 3 RPC scope, and `estimate_nodes` error semantics | Comprehensive codebase-AI execution guide added; **no source, migration, RPC, or provider action performed** | Start Phase 0 only; record baseline in this ledger before optimization |
| 3 | 2026-06-19 | App-only batching can reduce server render waves without schema or UI changes once request-correlated measurement exists | Added dormant `PERF_TRACE=1` request-scoped timing/Supabase round-trip trace, `perf:dashboard-query-count` parser, Phase 1 homebase wave merges, and Phase 2 dashboard-lean library spotlight fetch | `bunx vitest run tests/vitest/workshop-dashboard-perf-tracing.test.ts tests/vitest/workshop-dashboard-query-batching-source.test.ts tests/vitest/workshop-dashboard-query-batching-plan-red.test.ts tests/vitest/workshop-dashboard-query-count-script.test.ts --maxWorkers=1` (10 passed); `bun run type-check`; `bun run build`; targeted `bunx eslint ...changed files...`; `git diff --check`; synthetic `PERF_TRACE_INPUT` parser run produced 2 samples / median 1 round-trip | Phase 0 harness implemented; Phase 1 and Phase 2 app-only code implemented; no migration/RPC/provider mutation; UX output shape intentionally unchanged except dashboard spotlight no longer fetches unused template details | Phase 3 remains gated: capture real branch/authenticated `/workshop` baseline and only open RPC work if measured app-only result still justifies DB consolidation |
| 4 | 2026-06-19 | Owner-directed gate resolution can safely implement the Phase 3 RPC while preserving a flag-off app fallback | Added security-invoker `workspace_homebase_summary`, typed the RPC, added `WORKSHOP_HOMEBASE_SUMMARY_RPC_ENABLED=1` opt-in caller with sanitized fallback, and added static + local Postgres proof coverage | `bunx vitest run tests/vitest/workshop-homebase-summary-rpc-contract.test.ts tests/vitest/workshop-dashboard-query-batching-plan-red.test.ts tests/vitest/workshop-dashboard-query-batching-source.test.ts tests/vitest/workshop-dashboard-perf-tracing.test.ts tests/vitest/workshop-dashboard-query-count-script.test.ts --maxWorkers=1`; `bun run type-check`; `bun run build`; targeted ESLint; `git diff --check`; `bun run prove:workspace-homebase-summary` | Phase 3 implemented locally with same-workspace favorite isolation, cross-tenant non-member denial, anon execute denial, and optional publication/pending-invite exclusion proven | Archive this plan pack in `.ai/09_archive` after commit/push |

## Proof Boundary

**Implementation through Phase 3.** Source, tests, local proof harness, migration, and additive Supabase types changed. No linked Supabase provider apply, production deploy, or hosted browser proof was performed. Local validation proves compilation, source contracts, feature-flag fallback shape, and RPC authorization/isolation behavior; real latency figures still require authenticated branch-environment measurement.

## Remaining Risks / Open Decisions

- **OD-1:** Phase 3 ownership is decided by `12-…`: one authoritative RPC contract only. Recommendation remains app-only here unless evidence justifies RPC and no Performance-Refactor owner is already implementing it.
- **OD-2:** Is a Supabase branch DB available for the Phase-0 fixtures, or must Phase 1/2 start from a recorded minimum viable baseline? Branch DB absence blocks Phase 3, not necessarily app-only measurement/harness work.
- **OD-3:** Acceptable staleness for *counts only* if a future cross-request cache lane is opened (deferred to Performance-Refactor RISK-23; this pack rejects page-level ISR for freshness).
