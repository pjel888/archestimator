# 03 — Source And Codebase Audit

This audit synthesizes three read-only exploration lanes (see `00`). All citations are repo-relative `file:line`. Evidence strength is marked per block.

## 1. Stack and provider state (evidence: repo config)

- **Worker:** `archestimator-proof`, custom domain `archestimator.com` (`wrangler.jsonc:3,6-14`).
- **D1 binding:** `ARCH_DB` → `archestimator-proof-db`, id `9bdb29bb-687e-4f51-ae81-7659c426ea5f` (`wrangler.jsonc:31-37`).
- **Preview D1:** `363c756a-7c4d-42fe-908f-6d328bfa4acb`.
- **Other bindings:** R2 `ARCH_UPLOADS_R2`, DO `COLLAB_ROOMS` (class `CollaborationRoom`), Queue `UPLOAD_JOBS_QUEUE` (+ DLQ), Images `IMAGES`, Email `EMAIL` (`wrangler.jsonc:39-69`).
- **Cron:** `0 3 * * *`, `15 3 * * *`, `30 3 * * *` (`wrangler.jsonc:54-60`). NOTE: the AGENTS.md Fast Path mentions two crons; `wrangler.jsonc` shows three. The third (`30 3`) was added after the AGENTS.md snapshot. Out of scope for this plan (Queue/Cron ops pack owns it) but flagged for the migration-state pack.
- **Observability:** enabled, head-sampled (logs 0.1, traces 0.05) (`wrangler.jsonc:71-89`). Sufficient for proof but head-sampling means rare slow queries may not be captured — relevant to P4 hosted-proof design.
- **Upload hosted budgets** are already defined as vars (`wrangler.jsonc:91-97`): memory 128MB, body 4MB, route 30s, concurrency 3, storage p95 250ms. These are a precedent for "budgets as vars" — P0 may follow the same pattern for D1 budgets.
- **Migrations:** 36 active SQL files in `migrations/`, latest `0036_cost_library_component_drafts.sql`. The next free numbers are `0037` and `0038` (to be re-confirmed at execution per README checklist). Legacy `supabase/migrations/` (182 files) is archaeology — never run.

## 2. First-user hot-path map (evidence: route + repository source)

Eleven first-user hot paths identified. The marketing surface (`/`, `/login`, `/pricing`, `/about`) is static/SSR with no D1 reads and is excluded.

| ID | Route file | Loader / entry | Repository calls | Approx. D1 reads | Notes |
|---|---|---|---|---|---|
| HP-1 | `src/app/workshop/page.tsx:92` | `getWorkshopHomebaseData` | `workspace-repository.ts:2044` (6-query wave + dependent fan-out) + `component-library-repository.ts:1903` + `workspace-repository.ts:2301` | ~13–15 | **Heaviest read path.** 4 dependent waves. |
| HP-2 | `src/app/workshop/projects/page.tsx:14` | `listCurrentWorkspaceProjects` | `workspace-repository.ts:1394` (8-query wave + 3-query wave) | ~11 | Unbounded `projects WHERE workspace_id` (no LIMIT). |
| HP-3 | `src/app/workshop/projects/[projectId]/page.tsx:38` | `getCurrentWorkspaceProject` + estimate-sheets + activity | `workspace-repository.ts:2526`, `project-estimate-sheets-repository.ts`, `project-activity-repository.ts:242`, `d1-access.ts:99` | ~6–8 | `canAccessProjectInD1` is a 3-EXISTS probe. |
| HP-4 | `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx:63` | `resolveEstimateTabRouteContext` | `workspace-repository.ts:3973`, `:3097`, `:3772`, `:3793`, `:3276`, `:3546` | ~7 | Sheet editor; lazy client actions re-run `canEditEstimateInD1` (3-EXISTS + 2-creator probe, `d1-access.ts:271`). |
| HP-5 | `src/app/workshop/projects/[projectId]/estimates/page.tsx:25` | `listProjectEstimates` | `workspace-repository.ts:2867` + `d1-access.ts:271` per estimate | ~4 + N×1 | **Classic N+1** at `:103-109` (3-EXISTS + 2-creator probe). |
| HP-6 | `src/app/workshop/library/components/page.tsx:8` | `loadCurrentWorkspaceComponentRowsLibraryAppPath` | `component-library-repository.ts:1098` | ~5–9 | Global `component_category_nodes` scan. |
| HP-7 | `src/app/workshop/proposals/page.tsx:10` | `listRecipientProposals` | `recipient-proposals-repository.ts:86` | 1 (wide join) | Correlated subquery for latest response. |
| HP-8 | `src/app/share/[token]/page.tsx:128` | `resolveProjectPublicationAccessByToken` + snapshot | `src/lib/publication/public-repository.ts`, `d1-store.ts:219` | ~3 + 2 deferred writes | `cache()`-memoised access row. Unauthenticated. |
| HP-9 | `src/app/invite/[token]/page.tsx:200` | `resolveCollaborationInvitationFromCloudflareD1` | `collaboration/invitation-d1-store.ts` | ~1–2 | Single read by token hash. |
| HP-10 | `src/app/invite/[token]/accept/route.ts:83` | `acceptInvitationTokenForUser` | `collaboration/invitation-acceptance.ts:41` + rate-limit + 3 auth reads | ~5 | Write path (RPC-routed). |
| HP-11 | `src/app/invite/[token]/continue/route.ts:39` | rate-limit read only | rate-limit store | ~1 | No business-data read. |

### Per-request auth floor (evidence: `src/lib/auth/`)

Every `/workshop/*` request unconditionally issues **3 D1 reads** before any route logic:

| # | File:line | Query |
|---|---|---|
| A1 | `src/lib/auth/better-auth-cloudflare.ts:260` | Better Auth `getSession` → `session` table by token. `disableCookieCache: true` forces the round-trip. |
| A2 | `src/lib/auth/closed-beta-d1-store.ts:60` | `SELECT normalized_email, status FROM closed_beta_allowed_emails WHERE normalized_email = ?` |
| A3 | `src/lib/auth/profile-d1-store.ts:51` | `SELECT … FROM profiles WHERE email = ?` |

This is the **floor cost** for every authenticated first-user navigation. Budgets must account for it (it is not eliminable without changing auth posture, which is the OWASP/authz pack's call). `account_security_events` writes are **not** per-request (only at auth boundaries and publication actions — `src/lib/auth/account-audit-d1-store.ts:27`).

## 3. Repository-layer query and index inventory (evidence: `src/lib/repositories/` + `migrations/`)

### Repositories with D1 queries (12 total)

| Repository | D1? | Hot paths | Proof script today? |
|---|---|---|---|
| `workspace-repository.ts` | yes (`getCloudflareD1Database` :38) | HP-1, HP-2, HP-3, HP-4, HP-5 | partial — covered by generic `d1-performance-proof` surfaces only |
| `component-library-repository.ts` | yes | HP-1, HP-6 | yes — `cf:d1-component-library-proof` (local only) |
| `project-activity-feed-repository.ts` | yes (:18) | HP-3 activity tab, `/api/projects/[id]/activity` | **NO** |
| `project-estimate-sheets-repository.ts` | yes (:1) | HP-3, HP-5 | **NO** |
| `project-activity-repository.ts` | yes | HP-3 | **NO** |
| `project-charts-repository.ts` | yes | HP-3 charts | **NO** (only a payload fixture helper in `scripts/lib/`) |
| `project-data-repository.ts` | orchestrator only | HP-3 `/data` route | **NO** (cost is sum of callees) |
| `project-location-repository.ts` | yes (`cache`d) | HP-3 | **NO** |
| `recipient-proposals-repository.ts` | yes | HP-7 | **NO** |
| `estimate-favorites-repository.ts` | yes | HP-1, HP-2, HP-5 | **NO** |
| `estimate-repository.ts` | **no** (in-memory `Map`) | — | n/a |
| `estimate-schema-compat.ts` | **no** (error sniffers) | — | n/a |

**8 repositories with D1 hot paths lack dedicated proof.** This is Gap F2.

### Current index coverage (high-signal subset; full inventory in lane-2 output)

Index coverage is **mostly strong**. Migration `0031_performance_indexes_additive.sql` added `idx_projects_workspace_updated (workspace_id, updated_at DESC)`, which EXPLAIN-confirmed killed the FULL SCAN + TEMP B-TREE on the two hottest project-list queries (`workspace-repository.ts:1408-1415` and `:2074-2081`).

Five residual gaps on first-user paths:

| Gap | Table / query | WHERE / ORDER BY | Current index | Proposed index (P1) |
|---|---|---|---|---|
| G1 | `estimate_favorites` (HP-1, HP-2) | `WHERE user_id = ? ORDER BY created_at DESC LIMIT ?` | implicit `UNIQUE(user_id, estimate_id)` only | `idx_estimate_favorites_user_created (user_id, created_at DESC)` |
| G2 | `project_favorites` (HP-1, HP-2) | `WHERE user_id = ?` / `ORDER BY created_at DESC LIMIT ?` | implicit `UNIQUE(user_id, project_id)` only | `idx_project_favorites_user_created (user_id, created_at DESC)` |
| G3 | `shared_link_responses` (HP-7 correlated subquery) | `WHERE publication_id = ? AND recipient_id = ? ORDER BY created_at DESC LIMIT 1` | `(publication_id, created_at DESC)` — recipient_id residual scan | `idx_shared_link_responses_publication_recipient (publication_id, recipient_id, created_at DESC)` |
| G4 | `estimate_sheet_adjustments` (HP-4 `:3276`) | `WHERE estimate_id = ? LIMIT 1` | `idx_estimate_sheet_adjustments_updated (updated_at DESC, estimate_id)` — **leads on `updated_at`, not `estimate_id`** (verified `migrations/0029_estimate_actions_d1_support.sql:24-25`) | `idx_estimate_sheet_adjustments_estimate (estimate_id)` — confirmed needed |
| G5 | `component_category_nodes` (HP-6, charts) | global `ORDER BY sort_order, label` (no WHERE) | `(parent_id, sort_order)` — wrong leading column for global scan | no index helps a full-taxonomy scan; **cache at app layer** instead (P2 `T-P2-03`) |

### N+1 patterns (evidence: route source)

- **F1 / HP-5 N+1 (confirmed):** `src/app/workshop/projects/[projectId]/estimates/page.tsx:103-109` runs `Promise.all(estimateIds.map(async estimateId => [estimateId, await canEditEstimateInD1(...)] as const))` (wrapped by `resolveEstimateListEditCapabilities` at `:90`). `canEditEstimateInD1` is at `src/lib/authz/d1-access.ts:271` and evaluates **3 `EXISTS` subqueries** (`estimate_sheet_members` `:290`, `workspace_members` `:302`, `project_members` `:309`) plus 2 `created_by` short-circuit branches (`estimate.created_by` / `project.created_by`) and a `COALESCE(access.inherit_project_access…)` gate. Cost: 1 statement × N estimates. For a project with 20 estimates that is 20 extra round-trips on top of the `listProjectEstimates` aggregate. *(Plan pack audit correction, 2026-07-07: earlier draft mis-described this as "6-way EXISTS"; verified count is 3 EXISTS + 2 creator-shortcuts.)*
- **Correlated-subquery equivalent cost (not JS N+1):** `workspace-repository.ts:2930-2944` (`listProjectEstimates`) runs 3 correlated subqueries (node COUNT, row COUNT, row SUM) per estimate. Each is index-covered but O(estimates × rows). Optimization candidate (`T-P2-04`), not a correctness bug.
- **Breadth-heavy (not N+1):** `project-activity-feed-repository.ts:1024-1089` issues up to 12 `COUNT(*)` queries (6 tables × 2 scope variants) plus 5 source reads plus 2 label batches ≈ **19 statements per feed page**. Highest statement-count path. Budget must allow for it.

### Unbounded `SELECT *` / missing LIMIT (evidence: repository source)

| File:line | Query | Risk |
|---|---|---|
| `workspace-repository.ts:1408-1415` | `projects WHERE workspace_id` (no LIMIT) | HP-2 sidebar; grows with workspace |
| `workspace-repository.ts:2884-2889` | `estimates WHERE project_id` (no LIMIT) | HP-5; grows with project |
| `workspace-repository.ts:2951-2955` | `estimate_nodes WHERE estimate_id IN (...)` (no LIMIT) | HP-5; loads full trees |
| `workspace-repository.ts:2214-2222` | favorite estimate nodes (no LIMIT) | HP-1 |
| `workspace-repository.ts:1373-1381` | `client_name` dropdown (no LIMIT) | HP-3 |
| `project-activity-feed-repository.ts:514-527` | `project_publications WHERE project_id` (no LIMIT) | feed |
| `project-activity-feed-repository.ts:1228-1235` | estimates dropdown (no LIMIT) | feed dropdowns |
| `component-library-repository.ts:362-366` | `collectComponentLibraryRowsForSelectedItems` `SELECT *` per detail table (no LIMIT) | HP-6 detail graph |
| `component-library-repository.ts:391-398` | `cost_library_items` no-itemIds path (no LIMIT) | HP-6 |
| `component-library-repository.ts:1114-1117` | global categories (no LIMIT) | HP-6 |
| `component-library-repository.ts:1797-1800` | discontinued items scan (no LIMIT) | library overview |

P2 (`T-P2-02`) adds explicit LIMITs (parameterized by a budget var) to each.

### Cross-workspace / tenant filtering (evidence: repository source)

**Every project-scoped query routes through `getCurrentWorkspaceProject(projectId)`** (`workspace-repository.ts:2526`), which validates membership before returning. This is the enforced tenant boundary. Repositories that rely on it: project-location, project-charts, project-activity(-feed), project-data, project-estimate-sheets. Their queries scope by `project_id` alone because the gate already proved membership. This is correct and not a leak.

- `estimate_favorites WHERE user_id` — user-scoped by design, no workspace filter needed.
- `recipient-proposals WHERE lower(email)` — recipient-side tenant model (a recipient may receive from multiple workspaces); correct.
- `component_category_nodes` — global taxonomy, documented `using(true)` RLS; intentionally unscoped; not a leak.
- **No query was found that reads another workspace's data without the membership gate.**

## 4. Performance proof-script inventory (evidence: `scripts/`, `package.json`, `src/lib/cloudflare/`)

### Active scripts (18)

| package.json script | What it measures | Fixture | Local/Hosted | Output |
|---|---|---|---|---|
| `cf:d1-performance-proof` | 5 generic surfaces; query-count + local p95 | ~130 rows synthetic | local sqlite3 (+ optional hosted merge) | JSON+MD under `2026-06-29-Cloudflare-Migration-Codex/evidence/` |
| `cf:d1-runtime-proof` | hosted p95 + query-count via `/__cloudflare/d1-performance-proof` | server-side fixture | **hosted** | JSON+MD |
| `cf:d1-component-library-proof` | 4 component-library surfaces | local budgets 30ms | local only (`localOnly:true`) | JSON+MD |
| `cf:d1-estimate-history-proof` | 4 estimate-history surfaces | local budgets 45ms | local only | JSON+MD |
| `cf:d1-collaboration-invitation-proof` | 4 invitation surfaces | local budgets 100ms | local only | JSON+MD |
| `cf:d1-closed-beta-proof` | 4 beta surfaces | 3 allowlist rows | local only | JSON+MD |
| `cf:d1-rpc-proof` | transaction commit/rollback/idempotency | tiny | local only | JSON+MD |
| `cf:verify-hosted-performance` | public-route TTFB p95 | real routes | hosted (credential-free) | JSON+MD |
| `cf:verify-hosted-estimate-history` | functional correctness | — | hosted | JSON+MD (no query-count/p95) |
| `cf:verify-hosted-collaboration-invitation` | functional correctness | — | hosted | JSON+MD (no query-count/p95) |
| `dbidx:audit-repo` | static query map + index inventory | source scan | local | MD |
| `perf:dashboard-query-count` | parses `PERF_TRACE=1` logs → p50/p95/p99 round-trips | dev logs | local (dev only) | console |
| `perf:seed-fixture` | seed **manifest** (no DB writes) | 50p×30e×200r, lib tiers 100/500/5k/10k | local | JSON manifest |
| `perf:library-baseline` | card-model build, JSON parse | tiers 100/500/5k/10k | local CPU | JSON+MD |
| `perf:collect-live-evidence` | orchestrator; optional Supabase linked SQL | — | local (+ linked opt) | MD + artifacts |

**Not wired to package.json:** `check-performance-budgets.mjs` (bundle budget; wired into `.github/workflows/ci.yml` directly), `measure-shared-link-perf-budgets.ts`, `prove-shared-link-provider-perf.ts` (Supabase-linked, legacy), `build-performance-query-inventory.ts` (P0 will wire it).

### Current budget definitions (scattered — no central table)

- **D1 query-count budgets:** inlined per-proof as `queryBudget`/`plannedQueries` (typically 1–3).
- **Hosted D1 p95 budgets:** `src/lib/cloudflare/d1-performance-proof-router.ts:148-223` — `hostedBudgetMs` 500–600ms for **5 generic surfaces only**.
- **Hosted route TTFB budgets:** `scripts/verify-cloudflare-hosted-performance.ts:93-110` — public/credential-free routes only (home 200ms, login 300ms, etc.).
- **Bundle budget:** `scripts/check-performance-budgets.mjs:18` — `PERF_BUDGET_KB=350` gzipped first-load JS.
- **Shared-link budgets:** `scripts/measure-shared-link-perf-budgets.ts:126-136`, `scripts/prove-shared-link-provider-perf.ts:445-451`.
- **p99:** only in `scripts/measure-workshop-dashboard-query-count.ts` (parses `PERF_TRACE=1` dev logs — not hosted).
- **Subrequest budget:** `rg "subrequest"` returns **zero definitions anywhere**. Gap F3.
- **Tier targets (Beta/Enterprise/Launch):** `.ai/01_roadmap/27-performance-budget-and-regression-gates.md` — route-transition/bundle oriented, not D1 query-count oriented.

### Proof coverage gaps (Gap F2)

The hosted D1 runtime proof endpoint benchmarks **5 surfaces (4 QUERY + 1 MUTATION)** against `__archestimator_d1_proof_*` synthetic tables (`d1-performance-proof-router.ts:146-229` — `QUERY_SPECS` at `:146-216`, `MUTATION_SPECS` extending through `:229`) — **not the real repository functions**. The 6 synthetic tables are `__archestimator_d1_proof_{estimate_rows,estimates,projects,library_components,workspace_members,workspaces}` (`:71-124`). The 8 repositories in §3 with no proof have **no hosted query-count or p95 evidence** at all. The hosted verifiers for estimate-history and collaboration-invitation verify functional correctness but contain **zero** `queryBudget`/`queryCount`/`p95`/`subrequest`/`rowsRead` fields. *(Audit correction, 2026-07-07: earlier draft cited line range 148-223 and "5 surfaces" without distinguishing the 4-read/1-write split; corrected after source verification.)*

### Shared-helper gap

`scripts/lib/` contains exactly one file (`project-charts-payload-fixture.ts`). There is **no shared `d1-query-budget.ts`** — each proof script reimplements `percentile()`, `runSqlite()`, `measureQuery()`, and `QUERY_SPECS` inline. P0 fixes this.

## 5. Similar existing features / prior art in repo

- Migration `0031` is the precedent for "additive index + EXPLAIN-confirmed gap closure." P1 follows the same shape.
- `cf:d1-closed-beta-proof` / `cf:d1-component-library-proof` / `cf:d1-estimate-history-proof` / `cf:d1-collaboration-invitation-proof` are the precedent for "one local SQLite proof script per repository domain, emitting JSON+MD with `queryBudget`/`plannedQueries`/`localP95Ms`/`localOnly`." P3 follows this exact shape for the 8 uncovered repositories.
- `d1-performance-proof-router.ts` is the precedent for a hosted `CRON_SECRET`-gated proof endpoint. P4 extends it.
- The `wrangler.jsonc` upload-budget vars are the precedent for "budgets as wrangler vars." P0 may mirror this.

## 6. Documentation impact (evidence: doc scan)

- `.ai/01_roadmap/27-performance-budget-and-regression-gates.md` — currently route-transition/bundle oriented. P5 should add a D1 query-count/subrequest section or cross-link to the new central budget table.
- `AGENTS.md` Fast Path mentions "two cron triggers" but `wrangler.jsonc` shows three. Out of scope to fix here (Queue/Cron pack), but flagged.
- No ADR exists for the D1 budget contract. P5 may add `.ai/10_state/decisions.md` entry.
