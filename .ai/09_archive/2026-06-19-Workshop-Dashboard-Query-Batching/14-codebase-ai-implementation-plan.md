# 14 - Codebase AI Implementation Plan

**Purpose:** Single execution guide for the codebase AI that implements the Workshop Dashboard Query Batching pack.

**Status:** Planning and implementation handoff only. This document does not implement source changes, migrations, RPCs, provider changes, or measurement runs.

**Canonical scope:** `.ai/03_plans/2026-06-19-Workshop-Dashboard-Query-Batching/` owns the `/workshop` dashboard query-batching work and the candidate `workspace_homebase_summary` contract. Older Performance-Refactor docs remain useful for broad DB/RLS practices, but stale homebase anchors or pending-collab-in-RPC output shapes must not be reused.

**Stop condition for this guide:** The implementing AI stops only when the current phase has fresh proof, the ledger is updated, and the next phase is either explicitly unlocked or explicitly rejected with evidence.

## 1. Target Result

Make `/workshop` dashboard server-side data fetching faster by reducing sequential Supabase latency waves and unnecessary dashboard-only query work while preserving the current user-visible dashboard contract.

The target is not "fewer queries everywhere." The target is:

- Branch A, `getWorkshopHomebaseData`, should spend fewer dependent latency waves on the critical path.
- Branch C, the dashboard library spotlight, should stop paying the full Library page overview cost when the dashboard renders only a small subset.
- Phase 3 RPC work should happen only if measured residual latency justifies the added DB/security surface.
- RLS, role behavior, favorites, pending-invite visibility, optional publication degradation, loading states, empty states, and mobile/a11y states must remain unchanged.

## 2. Source Documents To Read

Read these before editing. Do not skim only this guide if the implementation touches a detailed contract.

| Source | Use it for |
|---|---|
| `README.md` | Pack purpose, warnings, existing-pack relationship. |
| `00-executive-brief-and-scope.md` | Honest answer to whether batching will help, scope, non-goals. |
| `01-current-query-and-round-trip-inventory.md` | Current H1-H8 homebase and Branch A-C query map. |
| `02-batching-opportunities-and-strategy.md` | Ranked opportunities and rejected alternatives. |
| `03-rpc-and-lean-fetch-design.md` | Candidate RPC design and dashboard-lean library fetch. |
| `04-implementation-phases-and-goal-cards.md` | Phase 0-3 goals, with corrections from this guide for wave-vs-request wording. |
| `05-validation-and-measurement-protocol.md` | Measurement thresholds and proof artifacts. |
| `06-risk-rollback-and-maintenance.md` | RISK-20, RISK-22, rollback, `types.ts` constraints. |
| `07-codebase-ai-implementation-prompts.md` | Phase prompts; this guide supersedes ambiguous wording. |
| `08-phase-0-instrumentation-and-measurement-harness.md` | Phase 0 harness contract. |
| `09-phase-1-query-shape-and-dataflow-contract.md` | Binding Phase 1 dataflow, limits, parity cases. |
| `10-ux-perceived-performance-and-state-contract.md` | UX, loading, degraded, mobile, and a11y gates. |
| `11-security-threat-model-and-rpc-authz.md` | RPC authz, privacy, branch DB, logging rules. |
| `12-phase-3-ownership-cutover-and-rollout.md` | Phase 3 decision tree, rollout, rollback. |
| `13-test-proof-matrix-and-readiness-scorecard.md` | Test/proof matrix and readiness boundary. |
| `LOOP_LEDGER.md` | Durable proof ledger; update after every implementation phase. |

Related references:

- `.ai/03_plans/2026-06-17-Performance-Refactor/10_PHASE_4_DATA_AND_CACHE_PLAN.md`
- `.ai/03_plans/2026-06-17-Performance-Refactor/14_PHASE_8_SUPABASE_DB_PLAN.md`
- `.ai/03_plans/2026-06-17-Performance-Refactor/15_VALIDATION_MATRIX.md`
- `.ai/03_plans/2026-06-17-Performance-Refactor/18_EXECUTION_PROMPTS.md`
- `.ai/03_plans/2026-06-17-Performance-Refactor/22_SECURITY_AND_RLS_THREAT_PLAN.md`
- `.ai/03_plans/2026-06-17-Performance-Refactor/23_NETWORK_AND_DATA_FLOW_PLAN.md`
- `.ai/03_plans/2026-06-17-Performance-Refactor/28_BEHAVIOR_PRESERVATION_AND_SAFETY_NET.md`
- `.ai/03_plans/database-indexing-and-query-performance/`

## 3. Implementation Boundaries

Non-goals:

- No deliberate UI/UX redesign.
- No page-level ISR, route revalidation, or cross-request cache for user-specific dashboard data.
- No new package dependency.
- No new index DDL in this pack unless a later measured Phase 3 proof explicitly creates a separate DB/index plan.
- No React Server Component boundary change.
- No production DB or provider mutation from planning alone.
- No monolithic dashboard RPC.
- No RPC that absorbs publications or pending-invite summary.
- No raw `src/lib/supabase/types.ts` regeneration overwrite.
- No secrets, raw SQL URLs, auth headers, provider tokens, tenant/user ids, emails, names, or exact production counts in logs, traces, `.ai`, `.omx`, screenshots, or scorecards.

Allowed work by phase:

- Phase 0 may add permanent test/support infrastructure and guarded local/dev instrumentation.
- Phase 1 may change app-only repository dataflow in `src/lib/repositories/workspace-repository.ts`.
- Phase 2 may add a dashboard-specific library repository read and switch the dashboard to it.
- Phase 3 may add a branch-DB-tested RPC and caller flag only after the go/no-go gate passes.

Provider boundary:

- Supabase scope is Archestimator project `ebxxqidacheyapmmzavr` only.
- Phase 3 starts on a Supabase branch DB, not production.
- Production rollout, direct production migrations, destructive operations, unrelated-provider changes, paid-cost changes, and policy overrides require explicit owner authority at the time of that action.

## 4. Current Code Map

Primary files:

- `src/app/workshop/page.tsx`
  - Current page-level dashboard fetch uses a top-level `Promise.all`.
  - Current dashboard library shim still calls `getLibraryOverview`.
  - Current comment says all repository calls are React-cached; this is stale and should be fixed when touching the page path.
  - Pending-invite cookie redirect happens before dashboard data fetch; exclude this redirect path from dashboard query-count measurements and keep a separate "redirect path unchanged" check.
- `src/lib/repositories/workspace-repository.ts`
  - `getWorkshopHomebaseData` is the Branch A hot path.
  - H1 initial reads already run together.
  - H3/H4 estimate reads, project backfill, publications, pending-invite summary, and estimate-node reads still form serial tail work.
  - This is a hot shared file. Re-read and check `git status` immediately before editing.
- `src/lib/repositories/component-library-repository.ts`
  - `getLibraryOverview` is still the full Library page overview path.
  - Dashboard currently pays this cost through `page.tsx`.
  - Phase 2 adds `getLibraryDashboardSpotlight` or equivalent dashboard-lean function here.
- `src/components/workshop/dashboard/lib.ts`
  - `DashboardLibrarySpotlight` shape is the dashboard contract Phase 2 should return.
- `src/lib/perf/server-timing.ts`
  - Current `traced` helper is only a simple `PERF_TRACE` timer.
  - Phase 0 must create request-correlated measurement and actual Supabase request counting before optimization claims.
- `src/lib/supabase/server.ts`
  - Preferred seam for request-local Supabase fetch counting if the existing client factory can accept a guarded fetch wrapper without changing auth/session behavior.
- `src/lib/supabase/types.ts`
  - Hand-augmented generated types. Add Phase 3 RPC typing by additive splice only.

Existing tests and patterns to reuse:

- `tests/unit/reset-baseline.test.ts`
- `tests/vitest/workshop-favorites-schema.test.ts`
- `tests/vitest/workshop-homebase-visibility.test.ts`
- `tests/vitest/workshop-library-consolidation-ui.test.tsx`
- `tests/vitest/performance-query-inventory.test.ts`
- `tests/vitest/library-overview.test.tsx`
- `tests/vitest/workshop-route-error-boundaries.test.tsx`
- `tests/vitest/workshop-pending-invite.test.tsx`
- `scripts/build-performance-query-inventory.*`
- `scripts/prove-estimate-list-summaries-postgres.mjs`
- `scripts/explain-estimate-list-summaries.mjs`

## 5. Global Invariants

These hold for every phase.

1. Measurement precedes optimization claims.
2. "Latency-wave count" and "request count" are different metrics. Phase 1's default H3/H4 change should reduce latency waves without necessarily reducing request count.
3. Top-level `Promise.all` branches are already concurrent. Do not report wins from "batching" branches that were already in the same top-level wave.
4. Behavior and DTO shape must remain stable unless this guide explicitly names a behavior-tightening.
5. RLS remains the source of truth. Client-side filtering is not an authz boundary.
6. Optional publications and pending-invite summary remain app-side best-effort reads.
7. `estimate_nodes` currently fails hard. Preserve that behavior unless a separate owner-approved behavior change is written and tested.
8. Deterministic order is `updated_at DESC, id DESC` wherever tied rows can affect visible dashboard ordering or parity comparisons.
9. `recentTemplates: []` is acceptable in Phase 2 only while `WorkshopDashboard` does not render template detail; add a guard test that fails if dashboard UI begins consuming template detail.
10. Phase 3 RPC uses `security invoker`, not `SECURITY DEFINER`, unless a fresh owner/security exception is recorded.
11. The canonical Phase 3 server-only flag is `WORKSHOP_HOMEBASE_SUMMARY_RPC_ENABLED`, default OFF.
12. The Phase 1 app path remains the permanent fallback even if Phase 3 ships.
13. If validation cannot prove a claim, record the gap. Do not turn local-only synthetic evidence into final performance proof.

## 6. SWOT Analysis

| Category | Details |
|---|---|
| Strengths | The plan starts with app-only changes before DB surface area; the current code already has clear repository boundaries; existing RLS policies remain active; dashboard library data is already narrowed by a shared type; branch-DB proof gates are documented; rollback can be flag-first for Phase 3. |
| Weaknesses | No dashboard-specific baseline exists yet; `server-timing.ts` is not request-correlated; existing homebase tests are mostly source-contract tests, not behavioral parity tests; `workspace-repository.ts` is a hot file; readiness score is planning-only; Strategy docs are absent in this repo snapshot. |
| Opportunities | Phase 1 can remove real serial latency without migrations; Phase 2 can lower DB load and payload size; the query-count harness can become shared perf infrastructure; Phase 3 can be explicitly rejected if app-only wins are enough, reducing long-term maintenance. |
| Threats | Cross-tenant leakage from a broad RPC; same-workspace favorite leakage; false performance wins from counting static call sites instead of network requests; p95 improvement hiding p99/429 regression; stale Performance-Refactor anchors causing duplicate or wrong RPC ownership; parallel agents editing the same repository file. |

## 7. Alternatives, Pros, And Cons

| Alternative | Pros | Cons | Decision |
|---|---|---|---|
| Do nothing beyond measurement | Safest behaviorally; establishes truth before work. | Does not improve user latency. | Phase 0 is mandatory but not sufficient if measurements confirm the issue. |
| Phase 1 app-only wave merge | No migration; preserves RLS; attacks known serial tail; reversible. | Can increase concurrent request pressure; parity cases are easy to drift. | Default first optimization after baseline. |
| Single OR estimate query | May reduce actual request count by one. | Risky per-arm limits, URL/filter complexity, favorite preservation, ordering, and PostgREST escaping. | Rejected as default. Only consider after written proof beats two bounded arms. |
| Two bounded estimate reads in one `Promise.all` wave | Preserves separate recent/favorite semantics; easier parity. | Keeps request count the same. | Preferred Phase 1 approach. |
| Merged project backfill | Removes duplicate project reads and keeps RLS-filtered rows authoritative. | Requires careful dedupe and ordering tests. | Preferred Phase 1 approach. |
| Tail `Promise.all` for publications, pending invites, and estimate nodes | Reduces serial waves while preserving app-side ownership. | Must preserve current failure semantics; `estimate_nodes` is fail-hard today. | Preferred Phase 1 approach, with explicit per-read error behavior. |
| Phase 2 dashboard-lean library fetch | Big request/payload reduction for Branch C; leaves Library page full path untouched. | May not improve page p95 if Branch C is not critical; exact counts can still be expensive. | Implement if Branch C or DB load remains relevant; independently shippable if measured DB-load win matters. |
| Library aggregate RPC | Could reduce dashboard library requests further. | Adds DB surface for an already parallel branch; lower upside than simpler lean fetch. | Reject for this pack. |
| Phase 3 `workspace_homebase_summary` RPC | Highest ceiling for core homebase chain; one DB-owned shape can reduce network overhead. | High RLS/security/type/rollback surface; can be slower on Small/Medium if SQL plan is fat. | Optional only after Phase 1/2 evidence. |
| Monolithic dashboard RPC | One call in theory. | Loses top-level branch parallelism, error isolation, and clear ownership; broad authz blast radius. | Reject. |
| Page-level ISR/revalidate | Can hide server latency. | Wrong freshness model for user-specific recent/favorite dashboard data. | Reject. |
| PostgREST embedding for full homebase | Uses existing Supabase API features. | Does not fit favorites/recents dedupe, pending invite summary, and branch-specific failure behavior cleanly. | Reject for this pack. |

## 8. Agent Execution Model

Use a lead AI for integration and phase ownership. Spawn parallel subagents only for independent lanes with disjoint write scopes or read-only review:

- Explorer lane: re-check current source anchors and dirty worktree before each phase.
- Test lane: design and implement targeted parity/proof tests.
- Security/DB lane: Phase 3 SQL, RLS, grants, advisors, and proof harness.
- Performance lane: measurement harness, branch fixture evidence, thresholds, and ledger tables.
- Reviewer lane: adversarial review of the phase diff before claiming completion.

Coordination rules:

- Do not let two agents edit `src/lib/repositories/workspace-repository.ts` at the same time.
- Do not let Phase 3 SQL and caller switch happen in the same unreviewed patch.
- Run `git status --short --branch` before editing and before final reporting.
- Re-read the exact files to be edited immediately before editing; the plan pack is not proof that source has not drifted.
- If another agent has changed a target file, inspect and integrate; never revert user or peer changes without explicit instruction.

## 9. Phase Decision Table

| Phase | Required? | Unlocks | Stop / reject condition |
|---|---:|---|---|
| Phase 0 - Measurement harness and baseline | Yes | App-only Phase 1 and Phase 2 development. | Block optimization claims until at least minimum viable baseline exists. Branch/provider proof is still required for final perf claims and Phase 3. |
| Phase 1 - Homebase app-only wave merge | Yes if baseline confirms Branch A serial tail is relevant. | Possible ship without DB work; Phase 3 decision input. | Revert or hold if parity fails, error semantics drift, Small/Medium regress beyond tolerance, Large misses threshold and no DB-load/resilience reason remains. |
| Phase 2 - Dashboard-lean library fetch | Conditional but recommended if Branch C or DB load is decision-relevant. | Lower dashboard DB load and payload; cleaner page data contract. | Mark optional if Branch C is not critical and DB-load reduction is not an accepted goal. Do not call it a dashboard speed win without Branch C evidence. |
| Phase 3 - `workspace_homebase_summary` RPC | Optional and gated. | Further Branch A network/wave reduction if app-only is insufficient. | Explicitly reject and record if Phase 1/2 meet threshold or EXPLAIN/security/parity gates fail. |
| Phase 4 - Final review, cleanup, docs | Yes for any implementation branch. | Completion claim. | Do not complete with unrecorded evidence, open validation gaps, or known source/test errors. |

## 10. Phase 0 - Measurement Harness And Baseline

Goal: produce request-correlated, privacy-safe proof of current dashboard branch timing, latency waves, actual Supabase request counts, payload estimates, and concurrency behavior.

Preferred implementation seams:

1. Add request-local measurement context, likely through `AsyncLocalStorage`, scoped to server-side dashboard measurement only.
2. Wrap the Supabase server client fetch path in `src/lib/supabase/server.ts` only when the measurement flag is enabled.
3. Keep auth/session behavior unchanged. Do not replace cookies, headers, or client lifecycle semantics.
4. Use `src/lib/perf/server-timing.ts` for safe labels and elapsed timings, or extend it with request-local support.
5. Emit local/dev JSONL or structured console events only under an env flag. Do not emit identifiers or raw URLs.

New or updated files expected:

- `src/lib/perf/server-timing.ts`
- `src/lib/supabase/server.ts` if fetch counting is added there
- `scripts/measure-workshop-dashboard-query-count.ts`
- `scripts/seed-workshop-dashboard-benchmark.ts`
- `scripts/explain-workshop-homebase-queries.mjs`
- `package.json` script: `perf:dashboard-query-count`
- Tests under `tests/vitest/` for safe labels/request correlation if feasible with local mocks

Minimum viable baseline for Phase 1/2 development:

- Branch labels: auth/workspace, Branch A homebase, Branch B sidebar favorites, Branch C library spotlight, route assembly.
- Wave labels inside Branch A: H1 initial wave, H3/H4 estimates, project backfill, publications, pending invites, estimate nodes.
- Actual Supabase network request count, not static call-site count.
- Fixture class recorded: Small, Medium, Large, or clearly marked synthetic/local.
- N recorded. Use N >= 30 for branch/provider latency claims.
- Median, p95, p99 recorded.
- Error rate and 429 count recorded for 20/50 concurrency checks when provider/branch DB is available.

Final performance proof requirements:

- Branch/deployed environment preferred over localhost.
- `pg_stat_statements` reset/run/top-query summary.
- `EXPLAIN (ANALYZE, BUFFERS)` summaries for changed hot queries.
- Payload row/byte estimates.
- Transport note: HTTP/2 multiplexing vs HTTP/1.1/pool behavior.
- Ledger row with before table.

Phase 0 tests/checks:

- `bun run type-check`
- Targeted vitest for measurement helpers if added.
- `git diff --check`
- Manual review that logs contain no tenant/user IDs, emails, raw URLs, auth headers, cookies, tokens, raw SQL, or exact production counts.

Phase 0 completion gate:

- `LOOP_LEDGER.md` has fixture descriptions, environment, N, branch/wave timing table, request counts, concurrency status, payload estimates, and validation gaps.
- Phase 1 is unlocked only for app-only work. Phase 3 remains blocked until branch DB proof exists.

## 11. Fixture And Seed Matrix

Use synthetic or explicitly approved beta/dev data only. Do not copy production tenant data into branch fixtures.

Minimum fixtures:

| Fixture | Required state |
|---|---|
| Small | First-run workspace or low-data workspace; no favorites; no recent estimates; no pending invites. |
| Medium | Several projects, recent estimates, favorite projects, favorite estimates, publications present if table exists, pending invites present. |
| Large | More than 12 candidate projects/estimates, tied `updated_at` rows, favorites outside the recent window, missing/deleted/invisible favorite targets, project backfill needed. |
| Role matrix | Owner, editor, viewer/non-manager, project member, sheet collaborator, workspace member, non-member. |
| Failure/degrade | `project_publications` optional failure, pending-invite summary optional failure, library table empty/missing optional detail. |
| Redirect path | Pending-invite cookie redirect path remains unchanged and excluded from normal dashboard query timing. |

## 12. Phase 1 - Homebase App-Only Wave Merge

Goal: reduce Branch A latency waves without DB schema/RPC changes.

Default query-shape decisions:

- Keep recent estimates and favorite estimates as two bounded reads.
- Run those two reads in the same `Promise.all` wave.
- Do not use a single OR estimate query unless a written proof shows it preserves per-arm limits, URL safety, favorites outside recent, ordering, and lower actual cost.
- Merge project backfill ids into one RLS-filtered project read.
- Run publications, pending-invite summary, and estimate-node reads in a tail `Promise.all` only after required project/estimate ids are known.
- Preserve current error semantics:
  - Publications remain optional/best-effort.
  - Pending-invite summary remains optional/best-effort.
  - `estimate_nodes` remains fail-hard because current source throws on errors.

Expected edit files:

- `src/lib/repositories/workspace-repository.ts`
- `tests/vitest/workshop-homebase-query-batching.test.ts`
- Possibly `tests/vitest/workshop-homebase-visibility.test.ts` if source anchors shift.
- Possibly `tests/vitest/performance-query-inventory.test.ts` if query inventory assertions are expanded.

Parity cases the test suite must cover:

- No favorites and no recent estimates.
- Favorite estimate outside recent window appears once.
- More than 12 estimates share identical `updated_at`; visible order is `updated_at DESC, id DESC`.
- Favorite project deleted/invisible does not leak a project name and does not crash.
- Estimate references a visible project missing from recent/favorite project rows; merged backfill resolves it.
- Viewer/non-manager project is excluded from pending-invite input.
- Optional publication failure still yields the rest of the dashboard data.
- Pending-invite summary failure still yields the rest of the dashboard data.
- `estimate_nodes` failure remains fail-hard unless a separate approved change says otherwise.

Phase 1 acceptance thresholds:

- Branch A latency-wave count drops for the planned serial sections.
- Request count does not increase. It may stay the same for H3/H4.
- DTO output is byte-identical after the deterministic `updated_at DESC, id DESC` tie-break rule.
- Small/Medium no regression beyond `<=5%` or `<=25ms`, whichever is larger.
- Large improves by `>=20%` or `>=200ms`, whichever is easier to observe, unless the ledger records an explicit "not worth shipping" decision.
- 20/50 concurrency evidence shows no 429s, no sustained pool saturation, and no p99 collapse before calling it a performance win.

Commands:

- `bunx vitest run tests/vitest/workshop-homebase-query-batching.test.ts --maxWorkers=1`
- `bunx vitest run tests/vitest/workshop-homebase-visibility.test.ts tests/vitest/workshop-pending-invite.test.tsx --maxWorkers=1`
- `bun run type-check`
- `bun run build` when source changes touch Next server/page exports or async server boundaries.
- `bun run perf:dashboard-query-count` after Phase 0 creates it.
- `git diff --check`

Phase 1 stop rules:

- Stop and fix if parity fails.
- Stop and fix if optional-read error behavior changes.
- Stop and record no-ship if performance misses threshold and there is no measured DB-load, reliability, or maintainability reason to keep the change.
- If Phase 1 meets the dashboard goal, explicitly record whether Phase 2 is still needed for DB-load reduction and whether Phase 3 is rejected.

## 13. Phase 2 - Dashboard-Lean Library Fetch

Goal: keep the Library page full overview intact while the dashboard fetches only rendered spotlight data.

Expected design:

- Add `getLibraryDashboardSpotlight` in `src/lib/repositories/component-library-repository.ts`, or a similarly named function if local naming prefers another pattern.
- Return the existing `DashboardLibrarySpotlight` shape from `src/components/workshop/dashboard/lib.ts`.
- Switch `src/app/workshop/page.tsx` dashboard shim to call the lean function.
- Keep Library route/page consumers on `getLibraryOverview`.
- Fix the stale page comment that claims all repository calls are React-cached.

Dashboard spotlight shape:

- `componentCount`: exact count needed by dashboard.
- `recentComponents`: projected fields needed by dashboard cards only.
- `templateCount`: exact count needed by dashboard.
- `recentTemplates`: `[]` only while dashboard does not render template details.

Column projection for recent components should be explicit and minimal. Include only ids, workspace/library ownership fields needed by the repository mapper, names/titles, kind/category, unit/cost fields actually displayed, timestamps, and any status fields required by existing dashboard card rendering.

Expected files:

- `src/lib/repositories/component-library-repository.ts`
- `src/app/workshop/page.tsx`
- `tests/vitest/library-dashboard-spotlight.test.ts`
- Existing Library page tests, likely `tests/vitest/library-overview.test.tsx` and `tests/vitest/workshop-library-consolidation-ui.test.tsx`

Phase 2 tests:

- Dashboard lean function returns `DashboardLibrarySpotlight`.
- Empty/null library state degrades safely.
- Dashboard does not consume template details. The guard should fail if future UI starts reading `recentTemplates` detail while the lean path still returns an empty array.
- Library page still imports/calls `getLibraryOverview` and remains behaviorally unchanged.
- Query count for Branch C drops from 11(+conditional) to `<=3` for current rendered fields.

Commands:

- `bunx vitest run tests/vitest/library-dashboard-spotlight.test.ts tests/vitest/library-overview.test.tsx tests/vitest/workshop-library-consolidation-ui.test.tsx --maxWorkers=1`
- `bun run type-check`
- `bun run build`
- `bun run perf:dashboard-query-count`
- `git diff --check`

Phase 2 stop rules:

- Do not call Phase 2 a dashboard latency win unless Branch C was on or near the critical path or p95 improves.
- It can still ship as a DB-load/payload win if the ledger records that as the accepted goal and query/payload proof supports it.
- If exact counts are unexpectedly hot, run `EXPLAIN` for the count queries and either tune within scope or reject the change.

## 14. Phase 3 - Optional `workspace_homebase_summary` RPC

Phase 3 is not automatic. It starts only if the Phase 1/2 ledger proves residual Branch A latency remains material.

Go criteria:

- Branch A remains the slowest branch on Medium/Large after Phase 1/2.
- Predicted additional p95 gain is `>=15%` or `>=150ms`.
- Branch DB is available.
- Security reviewer or DB lane is assigned.
- Owner/runtime authority exists for any live production deployment step.

No-go criteria:

- Phase 1/2 already meet latency threshold.
- Small/Medium would regress.
- `EXPLAIN` shows high-buffer seq scans or expensive aggregate plans.
- Cross-tenant or same-workspace favorite isolation proof fails.
- RPC would need publications or pending invites to be in scope.
- A Performance-Refactor lane is already implementing a conflicting homebase RPC.

RPC contract:

- Function name: `workspace_homebase_summary`.
- SQL must be `language sql stable security invoker`.
- Set `search_path = public`.
- Clamp `recent_limit`.
- Apply deterministic `updated_at DESC, id DESC` ordering.
- Every subquery re-asserts tenant access through workspace/project/estimate membership joins.
- User-specific favorites filter with `(select auth.uid())`.
- Return JSONB or typed shape that is then normalized to the existing app DTO.
- Exclude publications and pending-invite summary; those stay app-side best-effort.
- Revoke execute from `public` and `anon`; grant execute only to `authenticated`.

Expected files:

- `supabase/migrations/**` for additive function/grants only.
- `src/lib/supabase/types.ts` additive splice only.
- `src/lib/repositories/workspace-repository.ts` for optional RPC caller and fallback.
- `src/app/workshop/page.tsx` only if flag or comment wiring requires it.
- `scripts/prove-workshop-homebase-summary-postgres.mjs`
- `package.json` script: `prove:workspace-homebase-summary`
- Static migration/security tests under `tests/vitest/` if matching current project patterns.

Two-deploy model:

1. Deploy N: additive function and grants exist; app does not call the RPC.
2. Branch/proof gate: parity, denial, advisors, `EXPLAIN`, and fixture measurements pass.
3. Deploy N+1: caller switch behind server-only `WORKSHOP_HOMEBASE_SUMMARY_RPC_ENABLED`, default OFF.
4. Rollback: turn flag OFF first, confirm app-only path serves, then revert caller code if needed. Drop function later only after no deployed app calls it.

Phase 3 proof harness must prove:

- Authenticated non-member guessing another `workspace_id` gets empty/denied output.
- Same-workspace User A cannot observe User B favorites.
- Owner/editor/member/project-member/sheet-collaborator/non-member matrix matches current app behavior.
- Anonymous callers cannot execute.
- RPC output normalizes byte-identically to the Phase 1 app path.
- RPC failure falls back to app path or fails closed without leaking partial payload.

Commands:

- `bun run prove:workspace-homebase-summary`
- `bun run prove:rls-initplan`
- Supabase security/performance advisors for project `ebxxqidacheyapmmzavr` branch DB.
- `EXPLAIN (ANALYZE, BUFFERS)` on Small/Medium/Large fixtures, 3-5 runs.
- `bun run type-check`
- `bun run build`
- Targeted vitest for flag/fallback behavior.
- `git diff --check`

## 15. UX, Loading, Empty, Degraded, Mobile, And A11y Gates

Implementation must preserve:

- Existing loading shell behavior.
- Empty first-run workspace behavior.
- Degraded optional-publication behavior.
- Degraded pending-invite-summary behavior.
- Fail-hard behavior for non-optional estimate-node errors unless separately approved.
- Mobile layout and focus order.
- Visible copy, headings, landmarks, and card ordering except deterministic tie-break tightening.
- First meaningful dashboard content timing should not regress.

Browser proof is not automatically required. Use the fastest proof that establishes the claim:

- Source/unit/DOM tests for unchanged data and state contracts.
- Focused DOM tests for loading/degraded/empty/a11y states.
- Browser/manual proof only if the change affects responsive layout, interaction, auth/data state on a real route, accessibility semantics not covered by tests, or if the implementation claims user-perceived visual speed.

## 16. Test And Proof Matrix

| Area | New or existing proof | Commands / evidence |
|---|---|---|
| Phase 0 safe instrumentation | Request id correlation, safe labels, no secret/PII logging, actual Supabase request count. | Helper tests if added, manual log review, `bun run type-check`, `git diff --check`. |
| Phase 0 baseline | Small/Medium/Large branch/wave timings, request counts, payload rows/bytes, concurrency, `pg_stat_statements`, `EXPLAIN`. | `bun run perf:dashboard-query-count`, seed/explain scripts, ledger before table. |
| Phase 1 parity | `WorkshopHomebaseData` normalized DTO identical; favorites/out-of-recent/tie cases. | `bunx vitest run tests/vitest/workshop-homebase-query-batching.test.ts --maxWorkers=1`. |
| Phase 1 visibility | Pending-invite role input unchanged; sidebar badge unchanged. | `bunx vitest run tests/vitest/workshop-homebase-visibility.test.ts tests/vitest/workshop-pending-invite.test.tsx --maxWorkers=1`. |
| Phase 2 spotlight | Dashboard lean shape, null degrade, template guard, Library page still full overview. | `bunx vitest run tests/vitest/library-dashboard-spotlight.test.ts tests/vitest/library-overview.test.tsx tests/vitest/workshop-library-consolidation-ui.test.tsx --maxWorkers=1`. |
| UX states | Loading, degraded, empty, mobile/a11y state matrix. | Focused DOM tests; browser proof only for browser-only claims. |
| Next/TS integrity | Server exports, async boundaries, type safety. | `bun run type-check`; `bun run build` when source changed. |
| Phase 3 SQL/RLS | Security invoker, grants, no anon, tenant/user isolation, parity. | `bun run prove:workspace-homebase-summary`; advisors; `bun run prove:rls-initplan`; migration static tests. |
| Final docs | Durable evidence and decisions recorded. | `LOOP_LEDGER.md` updated; stale Performance-Refactor anchors back-pointed if touched. |

Avoid broad `bun run validate` unless the diff touches shared logic, auth/security, DB, release paths, or the current branch wants a release-level gate. If broad validation is skipped, record why.

## 17. UltraQA Scenario Matrix

Use these adversarial scenarios before completion:

- Favorite estimate outside recent window remains visible and appears once.
- More than 12 estimates share identical `updated_at`; final order is deterministic.
- Favorite project is deleted or invisible; no project name leaks and dashboard does not crash.
- Estimate references a visible project missing from recent/favorite project rows; backfill resolves it.
- Viewer/non-manager project is excluded from pending-invite input.
- `project_publications` fails while pending invites and estimate nodes still follow their current semantics.
- Pending-invite summary fails while publications and estimate nodes still follow their current semantics.
- `estimate_nodes` fails and still fails hard unless a new behavior decision exists.
- `estimate_templates` or template detail is unavailable; dashboard spotlight degrades safely and Library page remains unchanged.
- 20/50 concurrent dashboard renders on branch DB produce no 429s or sustained pool saturation.
- Phase 3 guessed workspace id by authenticated non-member returns empty/denied.
- Same-workspace User A cannot see User B favorite projects/estimates through RPC.
- RPC flag OFF uses app-only path.
- RPC expected failure falls back or fails closed without partial leak.
- Stale Performance-Refactor prompt tries to include pending-invite summary in RPC; implementation rejects it.
- Dirty worktree or parallel agent edit appears in `workspace-repository.ts`; implementation stops, reads, and integrates instead of overwriting.
- Measurement script times out or sees noisy traffic; implementation records invalid proof instead of forcing a pass.

## 18. Rollback And Maintenance

Phase 1 rollback:

- Revert app-only repository dataflow if parity or error semantics fail.
- If performance misses but code is still cleaner, keep only with explicit ledger rationale and reviewer pass.

Phase 2 rollback:

- Switch dashboard shim back to `getLibraryOverview`.
- Keep Library page tests as guard.
- Remove or leave unused lean function based on reviewer judgment; avoid dead code.

Phase 3 rollback:

- Turn `WORKSHOP_HOMEBASE_SUMMARY_RPC_ENABLED` OFF.
- Confirm app-only path serves dashboard.
- Revert caller code if needed.
- Drop function later only after no deployed app version calls it.
- Keep Phase 1 app path as permanent fallback.

Maintenance:

- Keep query inventory docs current if source shape changes.
- Update `.ai/10_state/current-state.md` only when project reality changes, such as measured outcome/provider facts or shipped implementation status.
- If Phase 3 is rejected, write the rejection math in `LOOP_LEDGER.md` so future agents do not re-open it without new evidence.
- If Performance-Refactor docs still include stale homebase/pending-collab RPC anchors when Phase 3 starts, update those back-pointers in the same planning/doc pass.

## 19. Final Completion Criteria For Implementers

Do not claim the feature implementation is complete until all applicable items are true:

- Phase 0 proof exists and is recorded.
- Implemented phases have targeted tests passing.
- `bun run type-check` passes.
- `bun run build` passes for source changes that touch Next server/page boundaries.
- `git diff --check` passes.
- Branch/provider performance evidence supports any performance claim.
- UX/a11y state proof matches the claim being made.
- Phase 3, if implemented, has branch DB security/advisor/proof-harness evidence.
- `LOOP_LEDGER.md` contains before/after metrics, environment, fixture, commands, results, rejected alternatives, and next decision.
- There are no known source/test errors hidden behind "planning readiness."
