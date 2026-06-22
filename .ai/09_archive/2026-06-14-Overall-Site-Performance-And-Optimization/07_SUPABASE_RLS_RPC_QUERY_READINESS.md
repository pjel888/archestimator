# 07 — Supabase RLS / RPC / Query Readiness

> Purpose: audit the database security perimeter (RLS policies + helper chain), the new aggregation RPCs, and hot-path query/index coverage for performance readiness — separating what is proven, what is candidate-only, and what is owner-gated/irreversible.

**Status: AUDIT / PLANNING ONLY** — no source files modified. Documentation only.
**Date: 2026-06-14**

---

## 1. Dimension summary

RLS is the security perimeter on all 57 RLS-enabled `public` tables (verified via grep across 67 migrations) and the policy logic is sound and well-tested (three `prove-*` PG17 harnesses exist and assert access-decision parity for owner / collaborator / non-member). The team has genuinely done the documented Supabase initplan fix: the Teamspace migration (`20260614120100`) wrapped `auth.uid()` as `(select auth.uid())` in the collaboration helper chain, and the Estimates-List migration (`20260614162000`) completed it for `is_workspace_member` — both byte-identical body rewrites proven non-behavior-changing.

The two new aggregation RPCs (`project_estimate_list_summaries` SECURITY INVOKER, wired in; `get_project_chart_buckets` SECURITY INVOKER, NOT yet wired, ready-migration only) correctly preserve RLS.

The most material remaining RLS-overhead risk is `is_platform_admin()`: it still uses **BARE** `auth.uid()` + `auth.jwt()` (never initplan-wrapped) and is the **first OR-branch of nearly every access helper** (`can_access_estimate`, `can_edit_estimate`, `current_project_access_rank`, `can_access_project`), so it runs a `profiles` lookup on every helper evaluation. Because the helpers are `STABLE` and called with a constant `estimate_id` per query, the planner caches the result per statement, so this is **likely Medium not Critical** — but it is unwrapped and unmeasured at scale.

The `estimate_nodes` / `estimate_row_items` hot read paths are index-covered by left-prefix composites, but the database-indexing plan's candidate indexes (P1) and the shared-link T4 FK indexes remain **unapplied candidates** requiring EXPLAIN evidence that this blocked, no-DB-server session could not produce.

No RLS weakness was found and **no recommendation here weakens auth**. Every index/RLS rec must stay **staged + EXPLAIN-validated + reversible**, and the irreversible / owner-gated DB work (PITR-off index drops, pg_cron retention) must remain **human-DBA-applied** in a maintenance window.

**Honest posture:** all live timing / EXPLAIN measurement is **BLOCKED** this session — no dev server (ports 3000–3020 closed), dev-auth disabled, no Playwright storage state, no agent DB write/EXPLAIN channel. The prove-* harnesses prove access-decision **parity (correctness)**, never **latency**. No readiness claim below is asserted against live/production-like proof; every latency target is a measurement target, not a measured result.

---

## 2. Already implemented (do not re-recommend)

Reconciled against orchestrator GROUND TRUTH (verified @ HEAD `3070c46c`, 2026-06-14). These are **done** — do not list as gaps:

- **initplan `auth.uid()` wrap, collaboration helper chain** — `20260614120100_teamspace_rls_authuid_perf.sql` wraps `auth.uid()` as `(select auth.uid())` across `is_workspace_editor`, `current_project_access_rank`, `can_access_project`/`can_edit_project`, `can_access_estimate`/`can_edit_estimate`, `current_estimate_access_rank`, and the inline `profiles` SELECT policy. Applied (memory: applied to hosted `ebxxqidacheyapmmzavr`).
- **initplan wrap for `is_workspace_member`** — `20260614162000_rls_initplan_auth_uid.sql` (F10 completion); body byte-identical to core schema; proven by `prove:rls-initplan`.
- **`project_estimate_list_summaries` RPC (SECURITY INVOKER)** — per-estimate node/row/cost aggregation replacing a JS fold; **WIRED** (`workspace-repository.ts:1464`); RLS preserved. (Estimates-List optimization landed.)
- **`get_project_chart_buckets` RPC (SECURITY INVOKER) with `WITH RECURSIVE`** — exists, RLS-preserving, the `recursive` keyword fix made it clean-applyable. Treated below as ready-but-unwired (RLS03/RLS09); not yet wired/applied to hosted.
- **Three `prove-*` PG17 parity harnesses** — assert OLD===NEW access decisions for owner / collaborator / non-member. These prove correctness, not latency (see RLS08).
- **`getUser()` everywhere (never `getSession`)** — proxy/server-side auth uses `getUser()`. (Auth-correctness baseline.)
- **`proxy.ts` public-route early-return before Supabase client creation** — public routes skip client/auth cost entirely.
- **Estimate-tree unification corridor P0–P3** — reversible/no-op corridor merged; does not weaken RLS.
- **Teamspace presence/cursors RLS** — `20260614120100` also wraps `auth.uid()` for membership-floor triggers + presence; applied to hosted.
- **Shared-link overhaul** — `20260528220000_project_shared_link_overhaul.sql`: `shared_link_*` tables, token-hash indexes, default-deny + manager-read RLS, definer comment/response RPCs. Applied.

> Note on naming/measurement reconciliation: the JSON summary cites "57 RLS-enabled tables" (occurrence count of `enable row level security` across the 67-migration set). A files-level grep shows 27 migration **files** contain the statement — consistent, because a single migration enables RLS on multiple tables. The table-count figure (57) is the load-bearing one.

---

## 3. Findings

All findings from the completed audit pass are rendered below, IDs preserved.

### RLS01 — is_platform_admin() uses bare auth.uid()+jwt() and gates every access helper

Severity: Medium
Confidence: Verified
Bottleneck class: RLS_POLICY
Affected surface: Every RLS-protected read/write — estimates, estimate_nodes, estimate_row_items, projects, estimate_tabs, collaboration tables
User symptom: Authed surfaces (project estimates, estimate workspace, charts) feel slow under load; `perf:measure-routes` medians Projects 2325ms / Library 2675ms (no-throttle) include this RLS cost.
Technical cause: `public.is_platform_admin()` (`20260518100000_auth_profiles_ceo_access.sql:81-95`) selects from `public.profiles` using bare `auth.uid()` and reads `auth.jwt()->>'email'` WITHOUT the `(select ...)` initplan wrap. It is the first OR branch of `can_access_estimate`, `can_edit_estimate`, `current_project_access_rank`, `can_access_project`, `can_edit_project` (all in `20260526142913` / `20260614120100`), which are themselves the USING predicates re-evaluated by the planner. Helpers are `STABLE` so a constant-`estimate_id` query caches the result per-statement, limiting blast radius — but the function itself was never included in either initplan-rewrite migration.
Evidence:
- /Users/philiplewis/archestimator/supabase/migrations/20260518100000_auth_profiles_ceo_access.sql:81 (and `auth.uid()` at :91, `auth.jwt()` at :94 — verified this session)
- /Users/philiplewis/archestimator/supabase/migrations/20260526142913_project_sheet_collaboration_access.sql:365
- /Users/philiplewis/archestimator/supabase/migrations/20260614120100_teamspace_rls_authuid_perf.sql:142
- grep: 0 occurrences of `(select auth.uid())` in `is_platform_admin` body across all migrations
Current metric:
- is_platform_admin body: bare `auth.uid()` + `auth.jwt()`; profiles lookup per helper-arg-value (blocked: no EXPLAIN this session)
Target metric:
- `(select auth.uid())` / `(select auth.jwt())` initplan-cached; one profiles probe per query plan, EXPLAIN-confirmed InitPlan
Recommended action:
- Add a staged `CREATE OR REPLACE` migration that wraps `auth.uid()` and `auth.jwt()` in `(select ...)` inside `is_platform_admin` ONLY (body otherwise byte-identical, keep security definer/stable/search_path). Extend `scripts/prove-rls-initplan-postgres.mjs` to assert OLD===NEW decisions for a platform-admin principal AND a non-admin. Capture `EXPLAIN (ANALYZE)` on a seeded `estimate_row_items` read before/after on staging.
Validation gate:
- `prove:rls-initplan` extended to cover `is_platform_admin` parity passes; staging EXPLAIN shows the `is_platform_admin` profiles probe collapses from per-row to InitPlan; access decisions unchanged for admin and non-admin.
Risk:
- Touching the admin gate risks an auth regression if the rewrite changes semantics; mitigated by byte-identical body + parity harness.
Rollback/deletion criteria:
- Re-apply the prior `is_platform_admin` body from `20260518100000` (`CREATE OR REPLACE`) if any principal's access decision changes or EXPLAIN shows no improvement.

### RLS02 — Deep helper-chain RLS on estimate_nodes / estimate_row_items hot paths (nested EXISTS + inherits_project_access)

Severity: Medium
Confidence: Likely
Bottleneck class: RLS_POLICY
Affected surface: `estimate_nodes` + `estimate_row_items` SELECT/ALL policies — the estimate workspace render and chart fact loads
User symptom: Estimate workspace and charts are among the largest-initial-JS + slowest authed routes; server response time contributes (Lighthouse serverResponse 630ms after trim, ~2300ms before).
Technical cause: `estimate_nodes`/`estimate_row_items` policies call `can_access_estimate(estimate_id)` / `can_edit_estimate(estimate_id)` (`20260526142913:743-754`). `can_access_estimate` fans into `is_platform_admin()` OR an `estimate_sheet_members` EXISTS OR an `estimates` EXISTS that calls `estimate_inherits_project_access(e.id)` AND `current_project_access_rank(e.project_id)>0` — `current_project_access_rank` itself does two correlated `max()` subqueries over `projects ⋈ workspace_members` and `project_members`. For a single-estimate read `estimate_id` is constant so `STABLE` caching makes this ~one evaluation per plan, but the chain depth means the cached evaluation is itself several index probes.
Evidence:
- /Users/philiplewis/archestimator/supabase/migrations/20260526142913_project_sheet_collaboration_access.sql:365-410
- /Users/philiplewis/archestimator/supabase/migrations/20260526142913_project_sheet_collaboration_access.sql:743-754
- /Users/philiplewis/archestimator/supabase/migrations/20260614120100_teamspace_rls_authuid_perf.sql:142-187
- /Users/philiplewis/archestimator/src/lib/repositories/estimate-repository.ts:163-209
Current metric:
- `can_access_estimate` -> up to 3 nested EXISTS + `current_project_access_rank` (2 subqueries); evaluated once per single-estimate read plan (STABLE) — unmeasured at scale (blocked)
Target metric:
- EXPLAIN-confirmed single InitPlan eval per estimate read; helper subqueries each hit a covering index (`workspace_members` PK, `project_members(user_id)`, `estimate_sheet_members(user_id)` all present)
Recommended action:
- Do NOT restructure the policy (security-correct). Instead capture `EXPLAIN (ANALYZE, BUFFERS)` on staging for a realistic estimate (hundreds of nodes/rows) reading as owner vs sheet-collaborator, and confirm the helper evaluates once. Only if EXPLAIN shows per-row helper re-eval, consider a SECURITY DEFINER pre-resolved access cache — gated behind a prove harness. Keep as a monitoring item until volume justifies.
Validation gate:
- Staging EXPLAIN shows `can_access_estimate` appears as a one-time filter/InitPlan, not per-row; supporting membership indexes are used (no seq scan on members tables).
Risk:
- Any policy rewrite is a security-perimeter change; mitigate by EXPLAIN-first, no-code-change-unless-proven.
Rollback/deletion criteria:
- No change is shipped unless EXPLAIN proves a problem; if a definer cache is ever added, drop it and revert to the helper if the parity harness or any access decision diverges.

### RLS03 — get_project_chart_buckets RECURSIVE category climb scans the entire component_category_nodes table

Severity: Medium
Confidence: Verified
Bottleneck class: DATABASE_QUERY
Affected surface: Project charts (CATEGORY grouping) — only when the ready RPC is wired in (currently JS-only)
User symptom: Latent: would surface as slow category-grouped charts as the global taxonomy grows; not user-visible today because the RPC is not called.
Technical cause: In `20260614021500_get_project_chart_buckets_rpc.sql` the `cat_climb` recursive CTE seeds from `public.component_category_nodes cn` with NO WHERE filter (lines 70-76) — it walks the WHOLE category tree for every call, unlike `node_climb` which is bounded by `estimate_id = any(target_estimate_ids)`. `component_category_nodes` has a `(parent_id, sort_order)` index (`20260522064018:39`) but the recursive seed is a full-table scan of all categories regardless of which estimates were requested.
Evidence:
- /Users/philiplewis/archestimator/supabase/migrations/20260614021500_get_project_chart_buckets_rpc.sql:70-83
- /Users/philiplewis/archestimator/supabase/migrations/20260522064018_component_library_taxonomy_source.sql:39
- /Users/philiplewis/archestimator/src/lib/repositories/project-charts-repository.ts:113-128 (RPC noted as ready migration, NOT wired)
Current metric:
- `cat_climb` seeds full `component_category_nodes` table per call; RPC unused (JS reduce path active)
Target metric:
- Before wiring the RPC: `cat_climb` seeded only from categories reachable from the requested estimates' rows (`source_snapshot->>'categoryNodeId'`), EXPLAIN-validated
Recommended action:
- Treat the chart RPC as staging-only until (a) `cat_climb` is constrained to `categoryNodeId`s present in the target estimates' rows, and (b) EXPLAIN on a production-size taxonomy confirms it beats the JS reduce. Keep the deploy probe/fail-open posture noted in the migration header. Do not wire it in production without this evidence.
Validation gate:
- The golden-master oracle still byte-matches the JS reduce AND staging EXPLAIN shows bounded category recursion (no full `component_category_nodes` scan) before the repository opts in.
Risk:
- Wiring an unbounded recursive RPC could be slower than the current JS path at scale; mitigated by it being additive/unused and probe-on-deploy.
Rollback/deletion criteria:
- Repository keeps the JS reduce (`project-charts-repository.ts`) if EXPLAIN or oracle parity fails; the RPC stays dormant.

### RLS04 — database-indexing P1 candidate indexes still unapplied and EXPLAIN-unvalidated

Severity: Medium
Confidence: Verified
Bottleneck class: DATABASE_QUERY
Affected surface: estimate_nodes, estimate_row_items, cost_library_items, library_folders, component_suppliers/brands, collaboration_invitations
User symptom: Library 2675ms / Templates 1857ms / Settings 2725ms no-throttle medians; library/component browse and estimate render read paths.
Technical cause: The plan (`.ai/03_plans/database-indexing-and-query-performance/03-index-strategy-and-prioritization.md`) lists P1 candidate composites (e.g. `estimate_nodes(estimate_id,sort_order)`, `cost_library_items(workspace_id,category,name)`) explicitly marked "candidate only — requires EXPLAIN before/after". None are in `supabase/migrations`. `estimate_nodes`/`estimate_row_items` already have left-prefix composites (`(estimate_id,parent_id,sort_order)` and `(estimate_id,node_id,sort_order)`) that the plan itself flags as possibly redundant with the global-sort candidates. No live introspection (`pg_stat_user_indexes` / EXPLAIN) is possible this session.
Evidence:
- /Users/philiplewis/archestimator/.ai/03_plans/database-indexing-and-query-performance/03-index-strategy-and-prioritization.md:70-145
- /Users/philiplewis/archestimator/.ai/03_plans/database-indexing-and-query-performance/01-current-query-and-index-inventory.md:12-22
- /Users/philiplewis/archestimator/supabase/migrations/20260518090000_archestimator_core_schema.sql:120-126
Current metric:
- Existing left-prefix composites cover `estimate_id` reads; new candidates unapplied; index usage/`idx_scan` unknown (blocked)
Target metric:
- Each candidate either applied with EXPLAIN before/after proving benefit, or formally rejected as redundant; no duplicate subset indexes added
Recommended action:
- Run the plan's P0 read-only introspection SQL (`pg_stat_user_indexes`, unindexed-FK catalog query, `pg_stat_statements`) against staging first. For `estimate_nodes(estimate_id,sort_order)` / `estimate_row_items(estimate_id,sort_order)`, prove they are NOT redundant with the existing composites before adding (left-prefix already serves `estimate_id`-only filters). Apply `CONCURRENTLY` in staging, one batch, measure write overhead.
Validation gate:
- For every candidate: `EXPLAIN (ANALYZE)` before/after on staging shows a plan improvement AND the existing left-prefix composite is confirmed insufficient; otherwise reject the candidate.
Risk:
- Adding subset/duplicate indexes increases write amplification on `estimate_row_items` (high write during editing); mitigated by EXPLAIN-gate and `CONCURRENTLY`.
Rollback/deletion criteria:
- `DROP INDEX CONCURRENTLY` any index whose `idx_scan` stays 0 over a monitoring window or whose write overhead regresses editing latency.

### RLS05 — Advisor-flagged unindexed FKs (T4 shared-link + ai/audit/event tables) remain candidates

Severity: Low
Confidence: Likely
Bottleneck class: DATABASE_QUERY
Affected surface: project_publications(published_by/workspace_id), shared_link_events(recipient_id), shared_link_recipients(invited_by), and prior advisor hotspots (ai_data_access_events, ai_tool_calls, collaboration_invitations, estimate_sheet_events)
User symptom: Cascade-delete latency and reverse-lookup latency on owner activity/audit reads; not on the primary render hot path.
Technical cause: `supabase/migrations-pending-review/T4-database-pass.sql` P5 proposes four `CONCURRENTLY` FK covering indexes that are still pending-review (not in `supabase/migrations`). The indexing inventory (`01-...md:204-214`) lists multiple tables with 4-8 unindexed FKs from a prior external advisor snapshot that the doc itself says MUST be reconfirmed. Cannot reconfirm without a live catalog query (blocked).
Evidence:
- /Users/philiplewis/archestimator/supabase/migrations-pending-review/T4-database-pass.sql:44-56
- /Users/philiplewis/archestimator/.ai/03_plans/database-indexing-and-query-performance/01-current-query-and-index-inventory.md:204-214
Current metric:
- T4 P5 FK indexes pending-review; advisor unindexed-FK counts from a stale 2026-05-30 snapshot, unreconfirmed
Target metric:
- Re-run the FK left-prefix catalog query on staging, then apply only the must-index-now FKs (critical join / RLS-predicate / large-and-growing) `CONCURRENTLY`
Recommended action:
- Re-run the corrected unindexed-FK catalog query (`01-...md:62-104`) on staging to refresh the list, classify into must/monitor/skip per the plan's FK policy, then promote T4 P5 indexes (one at a time, `CONCURRENTLY`) into `supabase/migrations` with fresh timestamps. Skip FKs on tiny administrative tables.
Validation gate:
- FK catalog query confirms the target FK is genuinely uncovered (not a left-prefix of an existing composite) AND the table has join/delete pressure before applying.
Risk:
- Speculative FK indexes on write-heavy event/audit tables add write cost; mitigated by classify-first and skip-tiny-tables policy.
Rollback/deletion criteria:
- `DROP INDEX CONCURRENTLY` any FK index with `idx_scan=0` after a monitoring window.

### RLS06 — Owner-gated irreversible DB work (index drops, pg_cron retention) must stay human-DBA + maintenance-window

Severity: Medium
Confidence: Verified
Bottleneck class: GOVERNANCE_GAP
Affected surface: project_publications_token_hash_idx / shared_link_recipients_token_hash_idx drops; project_publication_events + shared_link_events + security_rate_limit_events retention
User symptom: N/A (governance) — premature application of these could cause a hard-to-reverse data/availability incident with PITR off.
Technical cause: `T4-database-pass.sql` P2 drops two plain `token_hash` indexes whose UNIQUE counterparts already serve lookups — but the header mandates a zero-`idx_scan` pre-flight before dropping (irreversible without recreate). P1/P7 introduce `pg_cron` DELETE retention (data loss if window mis-sized). The file is explicitly `STATUS: READY FOR REVIEW *** DO NOT AUTO-APPLY ***`, ordered additive-first / drops-last. Project memory confirms PITR is off and irreversible migrations are owner-gated.
Evidence:
- /Users/philiplewis/archestimator/supabase/migrations-pending-review/T4-database-pass.sql:1-11
- /Users/philiplewis/archestimator/supabase/migrations-pending-review/T4-database-pass.sql:110-122
- /Users/philiplewis/archestimator/supabase/migrations-pending-review/README.md (pending-review channel)
Current metric:
- Index drops + cron retention sit in `migrations-pending-review` (NOT `supabase/migrations`); zero applied
Target metric:
- Each section applied only after its documented pre-flight, in a maintenance window, by a human DBA, then moved to `supabase/migrations` with a fresh timestamp
Recommended action:
- Keep `token_hash` index drops and `pg_cron` retention OUT of the automated migration set. Require: (1) pre-flight showing `idx_scan=0` for both `token_hash` indexes; (2) event-growth-rate measurement (AC-DB-06) to size the retention window; (3) DBA application in a window. Treat additive items (P3 RLS-defense-in-depth, P4 public-comment covering index) as production-safe-after-EXPLAIN, separately from the drops.
Validation gate:
- Pre-flight `idx_scan=0` captured for both indexes; retention window justified by measured growth; each section validated independently before promotion.
Risk:
- Dropping a `token_hash` index that turns out to be used breaks `/share` lookups; mitigated by zero-scan pre-flight + `CONCURRENTLY` recreate rollback.
Rollback/deletion criteria:
- `CREATE INDEX CONCURRENTLY` to recreate any dropped index on regression; `cron.unschedule` to halt retention; restore is otherwise PITR-limited (off), reinforcing human gating.

### RLS07 — force row level security is enabled on ZERO of 67 migrations

Severity: Low
Confidence: Verified
Bottleneck class: GOVERNANCE_GAP
Affected surface: All 57 RLS-enabled public tables
User symptom: N/A (defense-in-depth gap, not perf) — table-owner / definer-context queries can bypass RLS; relevant to correctness of SECURITY DEFINER RPCs that set search_path but run as owner.
Technical cause: grep across all 67 migrations finds 57 `enable row level security` and 0 `force row level security` (re-verified this session: 0 files contain `force row level security`). Without FORCE, the table owner role bypasses RLS. The app relies on SECURITY DEFINER helpers/RPCs running as owner intentionally, so adding FORCE broadly could break those definer paths — this is a deliberate-tradeoff item, not a clear bug. Corroborated by prior audit observation 5072 ("force row level security inconsistently applied").
Evidence:
- grep: 0 `force row level security` vs 57 `enable row level security` across /Users/philiplewis/archestimator/supabase/migrations/
- /Users/philiplewis/archestimator/supabase/migrations/20260518090000_archestimator_core_schema.sql:196-202
- prior audit observation 5072 (RLS coverage audit)
Current metric:
- 0 tables with FORCE RLS; owner role bypasses RLS by default
Target metric:
- Documented decision: either accept owner-bypass (definer RPC reliance) explicitly, or selectively FORCE on tables with no definer-owner write path
Recommended action:
- Audit which tables are written ONLY through SECURITY DEFINER RPCs vs direct authenticated DML. For purely-direct-DML tables with no definer-owner dependency, consider FORCE RLS in a staged migration with the prove harnesses re-run. Do NOT blanket-apply FORCE (it would break definer-owner writes). This is a security-hardening planning item, not a perf rec.
Validation gate:
- All `prove-*` harnesses still pass after any FORCE addition; no SECURITY DEFINER RPC write path regresses on staging.
Risk:
- Blanket FORCE breaks owner-context definer writes and triggers; mitigated by per-table classification + harness re-run.
Rollback/deletion criteria:
- `ALTER TABLE ... NO FORCE ROW LEVEL SECURITY` immediately if any definer write or trigger fails.

### RLS08 — Live RLS/RPC timing + EXPLAIN measurement is fully BLOCKED this session

Severity: Medium
Confidence: Verified
Bottleneck class: TESTING_GAP
Affected surface: All readiness claims for RLS overhead, index benefit, and RPC latency
User symptom: N/A (measurement gap) — readiness cannot be asserted with field/production-like proof.
Technical cause: No dev server (ports 3000-3020 closed), dev-auth bypass disabled, no Playwright storage state, no agent DB write/EXPLAIN channel, and `bun run build`/`next dev` deliberately not run (shared `.next` contention). The `prove-*` harnesses prove access-decision PARITY (correctness) but not query LATENCY — they assert OLD===NEW decisions, not timing. No `pg_stat_statements` / `EXPLAIN ANALYZE` was captured.
Evidence:
- /Users/philiplewis/archestimator/scripts/prove-rls-initplan-postgres.mjs:380-441 (asserts decision parity, not latency)
- package.json `prove:*` scripts (parity harnesses only)
- session env: no DB server / no EXPLAIN channel
Current metric:
- RLS/index/RPC latency at scale: unmeasured (blocked); only access-decision parity proven
Target metric:
- Staging `EXPLAIN (ANALYZE, BUFFERS)` + `pg_stat_statements` captures for the hot RLS reads and the two new RPCs, on production-size seed data
Recommended action:
- Before any index/RLS change ships: stand up a staging or local PG17 instance with realistic seed volume, run the plan's P0 read-only introspection SQL and `EXPLAIN ANALYZE` on the estimate render reads, `project_estimate_list_summaries`, and `get_project_chart_buckets`. Treat the e2e route-transition budgets as legacy smoke budgets, not readiness budgets.
Validation gate:
- EXPLAIN/`pg_stat_statements` artifacts archived under `.ai` for each hot path before/after; readiness asserted only against those captures.
Risk:
- Shipping perf changes on inference alone risks regressions; this finding enforces measurement-before-claim.
Rollback/deletion criteria:
- Any perf change lacking before/after EXPLAIN evidence is not promoted to `supabase/migrations`.

### RLS09 — get_project_chart_buckets RPC is ready-but-unwired (RPC/JS dual maintenance + hosted apply drift)

Severity: Low
Confidence: Verified
Bottleneck class: GOVERNANCE_GAP
Affected surface: Project charts aggregation path
User symptom: N/A today (JS reduce serves charts); risk is divergence between RPC and JS reduce, and the RPC failing on hosted if applied without the WITH RECURSIVE fix.
Technical cause: `project-charts-repository.ts:113-128` explicitly aggregates in server-side JS and notes `get_project_chart_buckets` is "a ready migration for a future push-down". The RPC carries an inline comment (`20260614021500:37-40`) that `recursive` was required to avoid a clean-apply failure — i.e. an earlier form was a hosted deploy-breaker. Project memory confirms this charts RPC is NOT applied to hosted. Maintaining two aggregation implementations (RPC + JS) invites silent drift; the golden-master oracle mitigates but only if re-run on every change.
Evidence:
- /Users/philiplewis/archestimator/src/lib/repositories/project-charts-repository.ts:113-128
- /Users/philiplewis/archestimator/supabase/migrations/20260614021500_get_project_chart_buckets_rpc.sql:37-40
- project memory: charts RPC still not applied to hosted
Current metric:
- Two aggregation implementations (SQL RPC + JS reduce); RPC unwired and not on hosted
Target metric:
- Single source of truth chosen with EXPLAIN evidence; if RPC wins, it is applied to hosted via probe-and-fail-open and the JS path removed; oracle re-run gate enforced
Recommended action:
- Decide RPC-vs-JS based on RLS09/RLS03 EXPLAIN evidence. Until then, keep the RPC dormant and ensure the golden-master oracle runs in CI so the RPC and JS reduce cannot diverge. When applying to hosted, use the documented probe-and-fail-open deploy posture (partial-drift safe).
Validation gate:
- The golden-master oracle re-runs in CI and matches; if wired, the hosted apply probe confirms the function exists before the repository opts in.
Risk:
- Wiring the RPC without EXPLAIN could regress charts; leaving both paths invites drift. Mitigated by the oracle gate and dormant default.
Rollback/deletion criteria:
- Repository reverts to the JS reduce path if oracle parity or staging EXPLAIN fails.

### RLS10 — Font ships Roboto_Mono via next/font/google, not the SF Pro documented in the design system

Severity: Low
Confidence: Verified
Bottleneck class: FONT
Affected surface: Global app + marketing typography (`src/app/layout.tsx` root)
User symptom: Brand/typography mismatch vs design-system docs; Roboto Mono is a monospace face shipping app-wide; `next/font/google` fetches at build, not a self-hosted SF Pro.
Technical cause: `src/app/layout.tsx:2` imports `Roboto_Mono` from `next/font/google` and binds it to `--font-roboto-mono` (`layout.tsx:7`), while README/design-system says the font is "SF Pro". `next/font/google` self-hosts the fetched file at build, so there is no third-party runtime request, but the SHIPPED face is Roboto Mono, contradicting the documented SF Pro. (This is the discrepancy flagged in the brief; outside core RLS but verified here.)
Evidence:
- /Users/philiplewis/archestimator/src/app/layout.tsx:2 (verified: `import { Roboto_Mono } from "next/font/google";`)
- /Users/philiplewis/archestimator/src/app/layout.tsx:7 (verified: `Roboto_Mono({ variable: "--font-roboto-mono", ... })`)
Current metric:
- Shipped font: `Roboto_Mono` (next/font/google, build-time fetched, self-hosted output)
Target metric:
- Documented font == shipped font; if SF Pro is intended, self-host it via `next/font/local` and drop the Google fetch (or update docs to Roboto Mono)
Recommended action:
- Reconcile design-system docs with the actual `layout.tsx` font. If SF Pro is the brand intent, switch to `next/font/local` with self-hosted SF Pro files; otherwise update the README/design-system to state Roboto Mono. Confirm the marketing display face separately (this only covers the root layout mono binding).
Validation gate:
- Design-system doc and `src/app/layout.tsx` agree on the font family; visual diff of marketing + app surfaces confirms the intended face.
Risk:
- Swapping to self-hosted SF Pro changes metrics/licensing; verify licensing and CLS before swapping.
Rollback/deletion criteria:
- Revert the `layout.tsx` font import if the swap regresses CLS or licensing is not cleared.

---

## 4. Dimension tables / notes

### RLS helper-chain reconciliation matrix (verified by reading migration bodies)

| Helper | initplan-wrapped `(select auth.uid())`? | Wrapped in which migration | security | volatility | Notes |
|---|---|---|---|---|---|
| is_workspace_member | YES | 20260614162000_rls_initplan_auth_uid.sql:30 | definer | stable | F10 completion; body byte-identical to core schema |
| is_workspace_editor | YES | 20260614120100:28 | definer | stable | Teamspace migration |
| current_project_access_rank | YES | 20260614120100:53,59 | definer | stable | two correlated max() subqueries |
| can_access_project / can_edit_project | YES | 20260614120100:77-115 | definer | stable | |
| can_access_estimate / can_edit_estimate | YES | 20260614120100:142-187 | definer | stable | calls is_platform_admin first |
| current_estimate_access_rank | YES | 20260614120100:189-213 | definer | stable | |
| profiles SELECT inline policy | YES | 20260614120100:270-299 | (policy) | n/a | 3 self-join EXISTS over members tables |
| **is_platform_admin** | **NO (bare auth.uid()+auth.jwt())** | never | definer | stable | **RLS01** — first OR-branch of nearly every helper |
| is_workspace_admin | NO (bare auth.uid()) | never | definer | stable | only on workspaces/workspace_members policies (lower traffic) |

### Hot-path index coverage (verified against migration DDL)

| Hot read | Predicate / order | Covering index | Status |
|---|---|---|---|
| estimate_nodes by estimate | estimate_id [+ sort] | estimate_nodes_estimate_parent_sort_idx (estimate_id,parent_id,sort_order) | Covered (left-prefix); global-sort candidate is debatable redundancy |
| estimate_nodes by tab | estimate_tab_id,parent_id,sort_order | estimate_nodes_tab_parent_sort_idx | Covered (20260612094734:72) |
| estimate_row_items by node | node_id [+sort] | estimate_row_items_estimate_node_sort_idx (estimate_id,node_id,sort_order) | Covered for estimate_id-prefix; node_id-only NOT left-prefix (would seq/bitmap) |
| estimate_row_items by estimate | estimate_id | same composite (left-prefix) | Covered |
| project_members by user (RLS) | user_id | project_members_user_idx | Covered (20260526142913:113) |
| estimate_sheet_members by user (RLS) | user_id | estimate_sheet_members_user_idx | Covered (20260526142913:117) |
| workspace_members by user (RLS) | user_id | workspace_members_user_id_idx | Covered (core:121) |
| project_publications by token | token_hash | UNIQUE + plain project_publications_token_hash_idx (redundant) | Over-covered → T4 P2 drop candidate |
| shared_link_recipients by token | recipient_token_hash | UNIQUE + plain idx (redundant) | Over-covered → T4 P2 drop candidate |
| profiles (is_platform_admin) | id | PK | Covered |
| component_category_nodes recursive seed (chart RPC) | (none — full table) | parent_id index exists but seed is unfiltered | **RLS03 gap** |

### Migration / RPC inventory (the 5 most relevant to this dimension)

| Migration | What it does | security model | wired? |
|---|---|---|---|
| 20260614162000_rls_initplan_auth_uid.sql | wraps auth.uid() in is_workspace_member | definer | applied locally; proven by prove:rls-initplan |
| 20260614120100_teamspace_rls_authuid_perf.sql | wraps auth.uid() across collaboration helper chain + profiles policy | definer | applied (memory: applied to hosted ebxxqidacheyapmmzavr) |
| 20260614161500_project_estimate_list_summaries_rpc.sql | per-estimate node/row/cost aggregation, replaces JS fold | **SECURITY INVOKER** (RLS preserved) | WIRED (workspace-repository.ts:1464) |
| 20260614021500_get_project_chart_buckets_rpc.sql | WITH RECURSIVE space/category/supplier bucket aggregation | **SECURITY INVOKER** | NOT wired (ready-migration; not on hosted) |
| 20260528220000_project_shared_link_overhaul.sql | shared_link_* tables, token-hash indexes, definer comment/response RPCs, strict revoke + manager-read RLS | definer RPCs + default-deny | applied (memory: shared-link plan landed) |

### Budget critique

- `e2e/route-transition-performance-budgets.json` values (authenticated 10000ms, slow3g 30000ms) are smoke/regression budgets, NOT DB-readiness budgets — do NOT use them to claim RLS/query readiness.
- There is NO DB-side latency budget (e.g. p95 EXPLAIN time for an estimate render read, or RPC `mean_exec_time`). Recommend adding a staging `pg_stat_statements`-derived budget for the hot RLS reads and the two RPCs as part of the indexing plan's P0.

### Production-safe vs staging-only vs owner-gated (this dimension)

- **Production-safe after EXPLAIN:** `is_platform_admin` initplan wrap (RLS01, byte-identical + parity harness); T4 P3 RLS-defense-in-depth policy; T4 P4 public-comment covering index.
- **Staging-only until EXPLAIN+oracle:** P1 candidate composite indexes (RLS04); FK covering indexes (RLS05); wiring `get_project_chart_buckets` (RLS03/RLS09).
- **Owner-gated / human-DBA / maintenance-window (PITR off, irreversible):** `token_hash` index DROPs (T4 P2, zero-scan pre-flight), `pg_cron` retention (T4 P1/P7), any FORCE RLS change (RLS07). P5 SQL deliberately kept OUT of `supabase/migrations` (per memory).

### Blocked measurements (recorded, not fabricated)

- `EXPLAIN (ANALYZE)` for `estimate_nodes`/`estimate_row_items` RLS reads: **BLOCKED** (no DB server / EXPLAIN channel).
- `pg_stat_statements` hotspot capture: **BLOCKED**.
- `project_estimate_list_summaries` / `get_project_chart_buckets` `mean_exec_time`: **BLOCKED**.
- Live unindexed-FK catalog reconfirmation (the 2026-05-30 advisor snapshot): **BLOCKED** — must be re-run on staging.
- The `prove:*` harnesses prove access-decision PARITY only (correctness), never latency.

---

## 5. Cross-references

- **03_ROUTE_SPEED_MATRIX.md** — per-route authed timing medians (Projects 2325ms / Library 2675ms / Templates 1857ms / Settings 2725ms no-throttle; Slow3G figures) that incorporate the RLS read cost analyzed in RLS01/RLS02; estimate-workspace and charts route rows tie back to RLS02/RLS03.
- **12_OPTIMIZATION_BACKLOG.md** — backlog destination for the actionable items: RLS01 (initplan wrap), RLS03 (constrain `cat_climb`), RLS04 (P1 index EXPLAIN gate), RLS05 (FK index reconfirm), RLS08 (stand up staging EXPLAIN harness), RLS10 (font reconciliation).
- **13_RISK_REGISTER_AND_BLAST_RADIUS.md** — register the security-perimeter blast radius of RLS01/RLS02/RLS07 (auth-regression risk) and the irreversible PITR-off blast radius of RLS06 (index drops / `pg_cron` retention).
- **15_READINESS_DECISION.md** — gating input: this dimension is **NOT readiness-asserted** because RLS08 blocks all live latency proof; readiness for any RLS/index change is conditional on the staging EXPLAIN + `pg_stat_statements` captures listed in the Blocked measurements section.
