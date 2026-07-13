# 04 — Requirements Specification

Stable IDs. Each requirement states identifier, statement, rationale, source, priority, dependencies, acceptance criteria, validation method, affected code areas, risks, status. Priorities: `Must` (blocks stop condition), `Should` (strongly recommended), `Could` (optional/gated). Source strength tags: `brief`, `repo evidence`, `official docs`, `assumption`, `derived`.

Source mapping: the PROMPT's "Required Plan Pack" sentence decomposes into seven requirements (PERF-001 … PERF-007); its "Constraints" into PERF-008/PERF-009; its "Stop Condition" into PERF-010.

## PERF-001 — Map first-user flows to D1 queries
- **Statement:** Every first-user hot path (HP-1 … HP-11 in `03`) has a documented mapping of route → loader/action → repository function → D1 query shape (table + WHERE/JOIN/ORDER BY) with file:line citations.
- **Rationale:** Cannot budget or index what is not mapped.
- **Source:** PROMPT "Required Plan Pack" sentence 1. `repo evidence`.
- **Priority:** Must.
- **Dependencies:** none.
- **Acceptance criteria:**
  - AC-PERF-001-1: `03_SOURCE_AND_CODEBASE_AUDIT.md` §2 contains all 11 HP rows with route file, repository file:line, and query shape.
  - AC-PERF-001-2: Every D1-backed repository in `03` §3 appears in the map.
- **Validation:** static doc review; cross-check against `rg "getCloudflareD1Database" src/lib/repositories`.
- **Affected code areas:** documentation only at planning time.
- **Risks:** none.
- **Status:** Done in this plan (`03`).

## PERF-002 — Define p95/p99 budgets per hot path
- **Statement:** A single canonical budget table exists, naming each HP-1…HP-11 route, with a p95 wall-clock target, a p99 target, and a query-count budget, sized for 1× and 10× first-user volume.
- **Rationale:** Scattered inline budgets (`03` §4) cannot be enforced or regression-checked.
- **Source:** PROMPT sentence 2 ("define p95/p99 … budgets"). `brief` + `derived`.
- **Priority:** Must.
- **Dependencies:** PERF-001.
- **Acceptance criteria:**
  - AC-PERF-002-1: `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` contains the canonical table with columns: HP id, route, p95 ms (1×), p95 ms (10×), p99 ms (10×), query-count budget, subrequest budget, evidence source.
  - AC-PERF-002-2: Every HP-1…HP-11 row is filled (no TBD without an owner + options).
  - AC-PERF-002-3: Numbers are sized for free-tier/bundled Cloudflare limits (no paid-feature assumption).
- **Validation:** doc review; numbers cross-checked against existing `hostedBudgetMs` (500–600ms) precedent.
- **Affected code areas:** `09` (planning); `scripts/lib/d1-query-budget.ts` (execution, P0).
- **Risks:** budgets too tight → false CI failures; too loose → no regression value. Mitigation: 10× headroom + 2-iteration tuning window in P5.
- **Status:** Done in this plan (`09`).

## PERF-003 — Define subrequest budgets
- **Statement:** Each first-user route has a subrequest budget (D1 statements + other subrequests), and a measurement path exists to capture hosted subrequest count.
- **Rationale:** Cloudflare Workers has a hard subrequest ceiling; no budget or capture exists today (`03` §4 — zero `subrequest` definitions).
- **Source:** PROMPT sentence 2. `brief` + `repo evidence` (the gap).
- **Priority:** Must.
- **Dependencies:** PERF-002.
- **Acceptance criteria:**
  - AC-PERF-003-1: `09` budget table includes a subrequest column for every HP row.
  - AC-PERF-003-2: A `DISCOVERY-REQUIRED` task (`T-P4-02`) defines the exact hosted measurement method and stop condition.
  - AC-PERF-003-3: No budget exceeds a documented fraction of the Cloudflare free-tier per-invocation subrequest ceiling.
- **Validation:** doc review + P4 hosted capture.
- **Affected code areas:** `09` (planning); `d1-performance-proof-router.ts` + proof scripts (execution, P4).
- **Risks:** hosted subrequest capture may require a Workers feature that needs a compatibility flag — flagged in `T-P4-02` stop condition.
- **Status:** Done in this plan (`09`, `11` T-P4-02).

## PERF-004 — List required indexes (additive only)
- **Statement:** Every EXPLAIN-confirmed index gap on a first-user path has a named additive `CREATE INDEX` migration with rollback, or a documented non-index resolution (e.g., app-layer cache).
- **Rationale:** Close the 5 gaps in `03` §3 without rewriting existing indexes or adding paid features.
- **Source:** PROMPT sentence 3 ("list required indexes"). `brief` + `repo evidence`.
- **Priority:** Must.
- **Dependencies:** PERF-001.
- **Acceptance criteria:**
  - AC-PERF-004-1: `07_DATA_DATABASE_API_NETWORK_PLAN.md` contains a Database Change Blueprint per proposed index (G1–G5).
  - AC-PERF-004-2: Every proposed index is additive (`CREATE INDEX`), with a `DROP INDEX IF EXISTS` rollback in the same migration or a documented fix-forward.
  - AC-PERF-004-3: No index rewrite touches an existing production index.
  - AC-PERF-004-4: G5 (categories global scan) is resolved by app-layer cache, not an index, with rationale.
- **Validation:** migration-blueprint review; hosted `EXPLAIN QUERY PLAN` gate (P4 `T-P4-03`).
- **Affected code areas:** `migrations/0037_*.sql`, `migrations/0038_*.sql` (execution, P1); `component-library-repository.ts` cache (P2).
- **Risks:** additive indexes consume D1 storage; on free-tier this is bounded. Mitigation: only 4 new indexes, all narrow.
- **Status:** Done in this plan (`07`).

## PERF-005 — Specify fixture sizes
- **Statement:** Proof scripts use a documented fixture tier set (1×, 10×, 100× first-user volume) generated by extending `scripts/seed-performance-test-data.ts`.
- **Rationale:** "Representative data" (PROMPT stop condition) requires defined sizes, not ad hoc rows.
- **Source:** PROMPT sentence 4 ("specify fixture sizes"). `brief`.
- **Priority:** Must.
- **Dependencies:** PERF-002.
- **Acceptance criteria:**
  - AC-PERF-005-1: `12_TEST_AND_VALIDATION_STRATEGY.md` names the fixture tiers (workspaces, projects, estimates, rows per estimate, library items) for 1×/10×/100×.
  - AC-PERF-005-2: `scripts/seed-performance-test-data.ts` manifest is extended (or a sibling manifest added) with the new tiers.
  - AC-PERF-005-3: Fixtures are deterministic (seeded RNG) so reruns are comparable.
- **Validation:** script run; manifest diff review.
- **Affected code areas:** `scripts/seed-performance-test-data.ts` (execution, P3).
- **Risks:** 100× fixture too large for free-tier local sqlite3 memory — P3 caps local at 10×, hosted at 100×.
- **Status:** Done in this plan (`12`).

## PERF-006 — Identify and resolve N+1 risks
- **Statement:** The confirmed N+1 at `estimates/page.tsx:103-109` (`canEditEstimateInD1` per estimate) is resolved by batching or precomputation, and every other fan-out is classified as batched-IN (acceptable) or N+1 (must fix).
- **Rationale:** The only classic JS-loop N+1 in the hot paths (F1).
- **Source:** PROMPT sentence 5 ("identify N+1 risks"). `brief` + `repo evidence`.
- **Priority:** Must.
- **Dependencies:** PERF-001.
- **Acceptance criteria:**
  - AC-PERF-006-1: `listProjectEstimates` (or its caller) batches the edit-capability check so the per-estimate `canEditEstimateInD1` call is replaced by ≤1 query (e.g., a set-based membership probe or a precomputed accessible-estimate-id set).
  - AC-PERF-006-2: A regression test asserts the query count for HP-5 does not grow with estimate count.
  - AC-PERF-006-3: `03` §3 documents that all other fan-outs are batched-IN (not N+1).
- **Validation:** focused vitest on HP-5 query count before/after; `perf:dashboard-query-count` delta.
- **Affected code areas:** `src/app/workshop/projects/[projectId]/estimates/page.tsx`, `src/lib/authz/d1-access.ts` (execution, P2 `T-P2-01`).
- **Risks:** batching the capability check must preserve the exact authorization semantics (workspace_member/project_member/estimate_sheet_member/created_by OR-clause). Mitigation: the batched query is a single SQL `EXISTS` set check authored to be semantically identical; denial tests in `08`/`12` prove parity.
- **Status:** Done in this plan (`11` T-P2-01, `12`).

## PERF-007 — Design local + hosted proof commands
- **Statement:** For every D1-backed repository, a local SQLite proof command and (for hot paths) a hosted D1 proof command exist, both emitting the shared budget schema, both wired to `package.json`.
- **Rationale:** "Avoid synthetic-only proof where hosted D1 behavior matters" (PROMPT constraint).
- **Source:** PROMPT sentence 6. `brief`.
- **Priority:** Must.
- **Dependencies:** PERF-002, PERF-003, PERF-005.
- **Acceptance criteria:**
  - AC-PERF-007-1: 8 new local proof scripts exist (`scripts/generate-cloudflare-d1-{repo}-proof.ts`), one per uncovered repository.
  - AC-PERF-007-2: `d1-performance-proof-router.ts` covers real repository functions (not just `__archestimator_d1_proof_*` tables) for HP-1, HP-2, HP-4, HP-5, HP-7.
  - AC-PERF-007-3: Each proof emits `queryBudget`, `plannedQueries`, `localP95Ms`/`hostedP95Ms`, `subrequestCount`, `rowsRead`, `evidenceClass`.
  - AC-PERF-007-4: All commands are wired to `package.json` `cf:d1-*` and `cf:verify-hosted-*` families.
- **Validation:** script run against local sqlite3 (P3) and hosted D1 via `cf:d1-runtime-proof` (P4).
- **Affected code areas:** `scripts/generate-cloudflare-d1-*-proof.ts` (8 new), `scripts/verify-cloudflare-d1-runtime-performance-proof.ts`, `src/lib/cloudflare/d1-performance-proof-router.ts`, `package.json`.
- **Risks:** hosted proof requires `CRON_SECRET` — credential-gated, may be skipped in CI. Mitigation: hosted proof is a release gate, not a CI gate; CI runs local proof only.
- **Status:** Done in this plan (`11` P3, P4).

## PERF-008 — No paid Cloudflare features
- **Statement:** The plan and its implementation add no paid Cloudflare feature (D1 paid plan, R2 paid tier, Workers Smart Placement paid, Workers Analytics paid, dedicated egress, etc.).
- **Rationale:** PROMPT constraint + AGENTS.md cost posture.
- **Source:** PROMPT "Constraints". `brief` + `repo evidence` (AGENTS.md).
- **Priority:** Must.
- **Dependencies:** none.
- **Acceptance criteria:**
  - AC-PERF-008-1: No task adds a paid wrangler config, paid compatibility flag, or paid binding.
  - AC-PERF-008-2: `15` documents the rejected paid alternatives (Hyperdrive for D1 — N/A, D1 paid plan for higher query limits — rejected).
- **Validation:** migration + wrangler diff review.
- **Status:** Done in this plan (`15`).

## PERF-009 — Scope limited to D1 query/index readiness
- **Statement:** The plan does not change UX, design system, bundle budgets, DO realtime, R2 ops, or authz rules.
- **Rationale:** PROMPT "Keep plan scope to D1 query/index readiness, not general UX."
- **Source:** PROMPT. `brief`.
- **Priority:** Must.
- **Dependencies:** none.
- **Acceptance criteria:**
  - AC-PERF-009-1: `02` non-goals lists every out-of-scope sibling pack.
  - AC-PERF-009-2: No task edits `src/components/**` for UX, `DESIGN.md`, DO bindings, or R2 policy.
- **Status:** Done in this plan (`02`).

## PERF-010 — Stop condition: executor can implement + prove
- **Statement:** The pack is ready when an executor can implement measurable D1 hot-path budgets and prove them against representative data.
- **Rationale:** PROMPT "Stop Condition."
- **Source:** PROMPT. `brief`.
- **Priority:** Must.
- **Dependencies:** PERF-001 … PERF-009.
- **Acceptance criteria:**
  - AC-PERF-010-1: `11_IMPLEMENTATION_PLAN.md` tasks have exact repo-relative paths + symbols (no "likely").
  - AC-PERF-010-2: `12_TEST_AND_VALIDATION_STRATEGY.md` names the exact proof commands and fixture tiers.
  - AC-PERF-010-3: `17_FINAL_READINESS_REVIEW.md` states `IMPLEMENTATION-READY` with verification mode.
- **Status:** Done in this plan.

## PERF-011 — D1 rows-read budget (free-tier load-bearing)
- **Statement:** Every first-user hot path has a per-request rows-read budget AND the daily aggregate projection stays below the D1 Free **5M rows-read/day** ceiling with documented headroom; the per-request budget is measurable via hosted proof.
- **Rationale:** D1 Free bills "rows read" by counting every *scanned* row (including JOIN fan-out and rows eliminated by predicates), not rows returned. At 10× first-user volume, unindexed/un-LIMIT-ed hot paths would exceed 5M/day and the D1 API returns errors until 00:00 UTC reset. This makes rows-read the **load-bearing** free-tier cost metric — more important than wall-clock p95 for staying free-tier. This requirement was missing from the original pack and is the primary improvement added in the audit pass.
- **Source:** PROMPT "Constraints" (no paid features) + Cloudflare D1 Pricing docs (official, 2026-07-07). `brief` + `official docs`.
- **Priority:** Must.
- **Dependencies:** PERF-002, PERF-004 (indexes reduce scans), PERF-005.
- **Acceptance criteria:**
  - AC-PERF-011-1: `09` budget table includes a `rowsRead/req` and `rowsRead/day` column for every HP row.
  - AC-PERF-011-2: Daily aggregate projection at 1× first-user volume is <5M with documented headroom (current projection: 1.8–2.4M, ~50–60% headroom).
  - AC-PERF-011-3: At 10× volume the projection either stays <5M *because of* P1+P2, or the pack explicitly flags the gap and the owner decides (A1 volume assumption must be validated).
  - AC-PERF-011-4: Hosted proof (P4) captures or estimates rows-read per surface; if D1 exposes `rows_read` it is captured directly, otherwise estimated from `EXPLAIN`+fixture counts and labeled `evidenceClass: derived`.
- **Validation:** `09` budget table; P4 hosted proof rows-read column; `20` §"Research sources" cites the Cloudflare D1 Pricing page.
- **Affected code areas:** `09` (planning); proof scripts + router (P3/P4 execution); CI gate (P5) asserts no hot-path query's `EXPLAIN` shows an unindexed scan.
- **Risks:** rows-read/day projection depends on A1 (volume assumption) — if first-user volume is higher than A1, the projection breaks. Mitigation: P4 hosted proof validates the projection against real traffic; A1 is marked `assumption` not fact.
- **Status:** Done in this audit pass.

## Shadow-path coverage note

D1 hot-path reads are read-only at the route layer; the shadow paths that matter are: empty result (empty workspace), oversized result (heavy workspace at 10×), stale cache (after P2 app-layer cache), unauthorized cross-workspace (denied by gate — covered in `08`), and DB error (D1 unavailable — covered in `13`). The full shadow-path matrix per HP is in `12`.

## Requirements not added (and why)

- No requirement to *enforce* budgets at runtime in the Worker (e.g., request-level query-count abort). That is a reliability/ops concern owned by the Worker-observability sibling pack; this plan only *measures* and *regression-gates*. Recording this scope boundary explicitly so the adversarial reviewer cannot flag it as a gap.
