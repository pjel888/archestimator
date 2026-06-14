# 06 — Database / API / Server Action Performance Audit

One-line purpose: audit the Postgres / RPC / Supabase-client / API-route / server-action layer for latency, over-fetch, serial-waterfall, RLS, and export bottlenecks, and reconcile the live code against the pre-existing DB performance plans.

**Status:** AUDIT / PLANNING ONLY
**Date:** 2026-06-14
**Repo:** `/Users/philiplewis/archestimator` @ HEAD `3070c46c` (`main`)
**Dimension:** Database / API / Server Action Performance

---

## 1. Dimension summary (honest posture)

The DB/API layer is materially more mature than the dimension prompt's prior findings suggest: the two highest-leverage server-side aggregations have landed as `security invoker` RPCs (`project_estimate_list_summaries` for the estimates list, replacing an all-rows JS fold) and the project-charts repository now reduces raw facts to a buckets-only wire payload (the old O(rows×nodes) map-per-row bug is fixed — lookups are hoisted in `aggregate-project-charts.ts`). Request-scoped `React.cache()` correctly dedupes the auth/workspace/project fan-out (`ensureDefaultWorkspace`, `getCurrentWorkspaceProject`, `getCachedProjectMembers`) so the project-layout's three summary fans share one project read.

The biggest verified gaps:

1. The estimate editor tree is fetched through the **browser** Supabase client (`estimate-repository.ts`), so full estimate rows — qty, unit_cost, supplier, source_snapshot — cross the wire to the client, matching the prior infosec over-fetch finding.
2. The `get_project_chart_buckets` RPC migration exists but is **NOT** called anywhere in `src/` — charts still load all raw rows/nodes/categories/suppliers into the server and fold in JS, so the SQL push-down the migration was written for is dormant.
3. The entire database-indexing-and-query-performance plan is audit-only (P0) with no composite indexes applied beyond the pre-existing core ones, and ~152 bare `auth.uid()` RLS call sites remain (the two 2026-06-14 fix migrations wrapped only the shared security-definer helper functions plus `is_workspace_member`).

The `proposal.xlsx` export buffers the entire workbook in memory (`writeBuffer`) with no streaming, and the component-library full loader runs a multi-wave serial query graph (items → price options/cost entries → 4 audit/attachment tables) and is not request-cached.

**Measurement honesty:** all latency numbers here are from prior archive evidence only; no live measurement was possible this session (no dev server, dev-auth disabled) — those are recorded as `blocked`. `@vercel/speed-insights` is confirmed absent from `package.json` (verified — only `@vercel/analytics ^2.0.1` is present), so field Web Vitals RUM is not wired.

---

## 2. Already implemented (do not re-recommend)

Reconciled against the orchestrator-verified GROUND TRUTH (HEAD `3070c46c`) and re-verified read-only this session. These are working today and must NOT be re-proposed as missing:

- **Estimates-list summaries RPC** — `project_estimate_list_summaries` (`security invoker`, server-side SUM/COUNT, revoked from anon) in migration `20260614161500`, called at `workspace-repository.ts:1464`. Replaced the prior all-rows JS fold. (verified)
- **Charts buckets-only WIRE payload + O(rows×nodes) bug fix** — `aggregate-project-charts.ts:29-35` hoists `nodeById`/`categoryById`/`supplierById` lookups out of the row loop; the server ships pre-bucketed series only. (verified — note: the WIRE trim is done; the SQL push-down is NOT — see DB02.)
- **Request-scoped `React.cache()` auth dedupe** — `ensureDefaultWorkspace` (`workspace-repository.ts:732`), `getCurrentWorkspaceProject` (`:1153`), `getCachedProjectMembers` (`:1186`) are all `cache()`-wrapped; collaboration + publication summaries reuse them, so the project-layout fan-out shares one project read. (verified)
- **RLS `auth.uid()` InitPlan wrap — helpers only** — migrations `20260614120100` (teamspace helpers) + `20260614162000` (`is_workspace_member`) wrap `auth.uid()` as `(select auth.uid())` inside the shared security-definer helpers. This is real but PARTIAL — direct-table policies still carry ~152 bare sites (see DB04).
- **Library lite loader** — `includeDetailGraph:false` path (`component-library-repository.ts:615`) correctly skips the wave-3 versions/price_history/state_history/attachments graph for the in-estimate Templates panel. (verified)
- **proposal.xlsx export guards** — node/row caps 1200/3000 → 413, `maxDuration 60s`, per-user+IP rate limit, batched `getEstimateTreesForTabs` (no per-tab fan-out). These bound the worst case (the streaming gap in DB05 is the only remaining concern, not correctness).
- **AI read-context intent gating** — `/api/ai/ask` runs an intent classifier that loads exactly one read-context branch per request, preventing library over-fetch.
- **proxy.ts / providers.tsx / next.config baseline** — proxy public-route early-return before Supabase client creation, marketing Cache-Control bfcache mitigation, `getUser()` (never `getSession`), QueryClient staleTime/gcTime 5min, `optimizePackageImports`, `experimental.staleTimes`. (orchestrator-verified; not DB-layer but reconciled here so the DB plan does not double-count them.)

---

## 3. Findings

### DB01 — Estimate editor tree fetched via browser Supabase client ships full row payload to client

Severity: High
Confidence: Verified
Bottleneck class: DATABASE_QUERY
Affected surface: `/workshop/projects/[projectId]/estimates/[estimateId]` (estimate workspace editor)
User symptom: Estimate workspace is among the largest remaining initial-JS routes; full per-row pricing/supplier data lands in the client where it can be inspected.
Technical cause: `src/lib/repositories/estimate-repository.ts:45` builds a `supabaseEstimateRepository` on `createSupabaseBrowserClient()` and `getEstimateTree()` selects `ESTIMATE_ROW_ITEM_SELECT` (id, material, supplier, unit_cost, quantity, contingency_percentage, misc_cost, source_snapshot, ...) directly in the browser. Every editor read/mutation re-fetches the entire estimate's nodes + rows over the wire to the client, and the columns include cost/supplier/source_snapshot — the prior infosec "full estimate rows shipped to client" finding. Mutations (insert/update/move/delete) each call `getEstimateTree()` again, re-shipping the whole tree.
Evidence:
- `src/lib/repositories/estimate-repository.ts:45` (`ESTIMATE_ROW_ITEM_SELECT` — verified includes `source_snapshot, supplier, unit_cost, quantity, misc_cost`)
- `src/lib/repositories/estimate-repository.ts:158-216` (`supabaseEstimateRepository` browser-client reads — `createSupabaseBrowserClient()` at :159, verified)
- `src/lib/repositories/estimate-repository.ts:231-255` (each mutation re-calls `getEstimateTree`)
- `src/lib/repositories/estimate-repository.ts:258` (`hasSupabaseBrowserEnv()` selects the browser repo — verified)
Current metric:
- blocked — no live payload byte measurement this session; structurally the entire estimate row set (qty/unit_cost/supplier/source_snapshot) crosses to client per read
Target metric:
- Server-rendered tree via `getEstimateTabTree`/`getProjectEstimateTreeByEstimate` (server client) with cost-bearing fields reduced/computed server-side; client receives only render-needed fields
Recommended action:
- Plan a migration of the editor read path from the browser repository to the existing server-side tree loaders in `workspace-repository.ts` (`getEstimateTabTree` already runs server-side with limits), shipping a reduced row projection; cross-reference the estimate-tree unification corridor so the kind/value-space changes land together. Keep optimistic mutations but reconcile against a narrower server payload.
Validation gate:
- Network-tab payload of an estimate open shows no raw `unit_cost`/`supplier`/`source_snapshot` for fields the UI does not render; server-timing shows tree assembled server-side; existing estimate editor tests stay green
Risk:
- Editor is the most interactive surface; moving reads server-side risks regressing optimistic CRUD latency and realtime reconciliation
Rollback/deletion criteria:
- Revert to browser repository if editor interaction latency regresses beyond the 10000ms authenticated-transition smoke budget or optimistic reconciliation breaks

### DB02 — get_project_chart_buckets RPC exists in migrations but is never called — charts still fold raw facts in server JS

Severity: Medium
Confidence: Verified
Bottleneck class: SERVER_WATERFALL
Affected surface: `/workshop/projects/[projectId]/charts`
User symptom: Charts page is a large initial-JS route; server still loads up to 5000 rows + 1500 nodes + 1000 categories + 1000 suppliers before producing buckets.
Technical cause: `supabase/migrations/20260614021500_get_project_chart_buckets_rpc.sql` defines the push-down RPC, but grep of `src/` finds zero call sites — the only reference is a comment in `project-charts-repository.ts:117` (verified). `getProjectChartsData()` instead runs four parallel raw-fact loaders (`loadRowFacts`/`loadNodeFacts`/`loadCategoryFacts`/`loadSupplierFacts`) up to large caps and folds them via `buildSeriesByEstimate` in JS on the server. The "buckets-only payload" that landed is the WIRE shape (client gets buckets), not a DB-side aggregation; the planned SQL push-down is dormant.
Evidence:
- `supabase/migrations/20260614021500_get_project_chart_buckets_rpc.sql` (RPC defined — verified present)
- `src/lib/repositories/project-charts-repository.ts:88-128` (parallel raw-fact loaders + JS `buildSeriesByEstimate`)
- `src/lib/repositories/project-charts-repository.ts:113-118` (comment: RPC is "a ready migration for a future push-down" — verified verbatim)
- `src/lib/project-charts/aggregate-project-charts.ts:29-35` (JS bucket lookups)
- grep `get_project_chart_buckets` in `src/`: only the `:117` comment, zero call sites (verified)
Current metric:
- blocked — no live measure; structurally up to 5000 rows + 1500 nodes loaded to server per charts render then folded in JS (`ESTIMATE_ROW_LIMIT`/`ESTIMATE_NODE_LIMIT`)
Target metric:
- Charts series produced by a single RPC returning O(buckets) rows; raw facts never leave Postgres
Recommended action:
- Reconcile the migration with the code: either wire `getProjectChartsData` to call `get_project_chart_buckets` (after confirming the golden-master oracle parity referenced in the comment AND confirming the RPC is applied to hosted — project memory says the charts RPC is NOT applied to hosted), or formally defer and remove the dead migration from the applied set. Treat as planned-not-implemented in the reconciliation matrix.
Validation gate:
- Oracle test proves RPC buckets == JS buckets byte-for-byte; charts render issues 1 RPC instead of 4 fact queries; server-timing for charts drops
Risk:
- RPC parity drift vs JS fold could silently change displayed totals; hosted DB may not have the RPC applied (deploy-breaker per memory)
Rollback/deletion criteria:
- Revert to JS fold if oracle parity fails or hosted RPC is missing/throws

### DB03 — Database indexing plan is audit-only (P0) — no plan-recommended composite indexes applied

Severity: Medium
Confidence: Verified
Bottleneck class: DATABASE_QUERY
Affected surface: Estimate tree render, component library browse, supplier/brand/folder lists (RLS-filtered list queries)
User symptom: List/tree queries rely on whatever indexes shipped in core schema; plan-flagged hot patterns (global `estimate_id` sort, workspace+category+name library browse) have no dedicated covering index.
Technical cause: The database-indexing-and-query-performance plan (01/03 docs) is explicitly "audit and evidence only (P0), no DDL" and requires live `EXPLAIN` before applying any candidate. Migrations DO contain core indexes (`estimate_nodes(estimate_id,parent_id,sort_order)`, `estimate_row_items(estimate_id,node_id,sort_order)`, `projects(workspace_id,updated_at)` via `20260519190958`), but the plan's Layer-A candidates — `estimate_*(estimate_id, sort_order)` for global sort, `cost_library_items(workspace_id,category,name)`, `library_folders`/`component_suppliers`/`component_brands (workspace_id,sort_order,name)` — are not present. The repository often orders by `sort_order` globally (`estimate-repository.ts:166,171`) which the existing `(estimate_id,node_id,sort_order)` index may not fully serve.
Evidence:
- `.ai/03_plans/database-indexing-and-query-performance/03-index-strategy-and-prioritization.md:55-99` (P0 audit-only, candidates listed)
- `supabase/migrations/20260518090000_archestimator_core_schema.sql:122-126` (core indexes only — migration verified present)
- `supabase/migrations/20260519190958_optimize_workspace_estimate_list_indexes.sql:2` (projects workspace+updated_at — verified present)
- `src/lib/repositories/estimate-repository.ts:164-171` (global `.order('sort_order')` reads — verified)
Current metric:
- blocked — no `EXPLAIN`/`pg_stat` access this session; plan snapshot reports cache hit ~99.98% on small tables
Target metric:
- Each P1 candidate index has before/after `EXPLAIN` evidence; redundant subset indexes rejected; FK-coverage gaps (`estimate_row_items`, `ai_*`, `cost_library_*`) triaged into must/monitor/skip
Recommended action:
- Keep this gated until live Supabase introspection is authorized (memory notes owner-authorized hosted MCP works). Run the P0 inventory SQL against `ebxxqidacheyapmmzavr`, then apply only `EXPLAIN`-justified P1 indexes. Note current table volumes are small per the snapshot, so this is not urgent — prioritize behind DB01/DB02.
Validation gate:
- P0 inventory captured (`pg_stat_statements`, index usage, FK coverage); each applied index shows plan improvement and no duplicate of an existing left-prefix index
Risk:
- Speculative indexes add write overhead on edit-heavy tables (`estimate_row_items`); duplicates waste storage
Rollback/deletion criteria:
- `DROP` any index whose `idx_scan` stays 0 over a monitoring window or that regresses write latency

### DB04 — ~152 bare auth.uid() RLS call sites remain after the 2026-06-14 initplan fix (helpers only)

Severity: Medium
Confidence: Verified
Bottleneck class: RLS_POLICY
Affected surface: All RLS-protected tenant tables (per-row policy evaluation)
User symptom: Per-row `auth.uid()` re-evaluation on large scans (`estimate_row_items`, `cost_library_items`) adds latency that grows with row count rather than being computed once per query.
Technical cause: Two migrations on 2026-06-14 (`20260614120100_teamspace_rls_authuid_perf.sql`, `20260614162000_rls_initplan_auth_uid.sql`) wrapped `auth.uid()` as `(select auth.uid())` — but only inside the shared security-definer helper functions (`can_access_estimate`, `current_project_access_rank`, `is_workspace_member`) plus collaboration helpers. Direct table policies still contain ~152 bare `auth.uid()` occurrences (182 total minus the wrapped helpers). For policies that call the wrapped helpers the initplan benefit propagates; standalone bare call sites do not get it.
Evidence:
- `supabase/migrations/20260614162000_rls_initplan_auth_uid.sql` (scope note: only `is_workspace_member` completed; helpers covered by teamspace migration)
- `supabase/migrations/20260614120100_teamspace_rls_authuid_perf.sql` (helper wraps)
- grep across `supabase/migrations`: 182 bare `auth.uid()` vs 33 `(select auth.uid())` (verified this session: bare=182, wrapped=33); ~152 bare remain excluding the two fix migrations
- project memory observation 5787 (142 bare `auth.uid()` in RLS policies)
Current metric:
- blocked — no `EXPLAIN`; structurally per-row vs per-query `auth.uid()` on policy-scanned tables
Target metric:
- All hot-table RLS predicates evaluate `auth.uid()` once per query (InitPlan); proven access-identical via prove-rls-initplan harness
Recommended action:
- Plan a follow-up RLS rewrite pass over the remaining direct-policy bare `auth.uid()` sites on the highest-volume tables (`estimate_row_items`, `estimate_nodes`, `cost_library_items`, project/sheet members), reusing the existing `scripts/prove-rls-initplan-postgres.mjs` parity harness. Sequence behind/with DB03 `EXPLAIN` evidence so wraps are validated against real plans.
Validation gate:
- prove-rls-initplan harness shows identical access decisions; `EXPLAIN` shows `auth.uid()` as an InitPlan not a per-row filter on the rewritten tables
Risk:
- Mass policy rewrites can subtly change access semantics; security-definer vs invoker context differences
Rollback/deletion criteria:
- Revert the policy rewrite if the parity harness flags any access-decision divergence

### DB05 — proposal.xlsx export buffers the entire workbook in memory with no streaming/progress

Severity: Medium
Confidence: Verified
Bottleneck class: EXPORT_HEAVY_OPERATION
Affected surface: `GET /api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx`
User symptom: On large multi-tab estimates the client waits with no progress for the whole build + DB fan-out before any bytes arrive; memory spike on the serverless function.
Technical cause: `create-proposal-workbook.ts:716-718` calls `workbook.xlsx.writeBuffer()` producing a full `Buffer`, then `route.ts:127` returns it via `createXlsxResponse` in one shot. There is no ExcelJS streaming writer and no chunked/Transfer-Encoding response. The route does have sound guards (node/row caps 1200/3000 → 413, `maxDuration 60s`, per-user+IP rate limit, batched `getEstimateTreesForTabs` instead of per-tab fan-out), so the risk is bounded, but the whole workbook lives in memory and the user gets no streaming feedback.
Evidence:
- `src/lib/proposal-export/create-proposal-workbook.ts:716-718` (`writeBuffer` → `Buffer`)
- `src/app/api/.../export/proposal.xlsx/route.ts:126-138` (`createXlsxResponse` single `Buffer`)
- `src/app/api/.../export/proposal.xlsx/route.ts:21-22` (node/row caps), `:293-300` (batched all-tabs fetch)
- project memory: spreadsheet-export-audit (tabs→worksheets works)
Current metric:
- blocked — no live export timing; bounded by 1200 nodes / 3000 rows caps and 60s `maxDuration`
Target metric:
- Streaming workbook writer (ExcelJS `stream.xlsx.WorkbookWriter`) or chunked response so first byte arrives before full build; client progress affordance
Recommended action:
- Plan an evaluation of ExcelJS streaming writer for the multi-tab path (single-tab is small enough to keep buffered), plus a client-side progress/spinner contract on the fetch-then-blob path. Keep the existing 413/rate-limit guards. Lower priority since caps bound the worst case.
Validation gate:
- Large estimate export streams (TTFB before full build) or stays under a documented memory ceiling; existing limit/413 and filename tests stay green
Risk:
- Streaming writer changes worksheet construction order and could alter byte output vs the workbook test fixtures
Rollback/deletion criteria:
- Revert to `writeBuffer` if streamed output diverges from golden workbook fixtures or destabilizes the 60s ceiling

### DB06 — Component library full loader is a multi-wave serial query graph and is not request-cached

Severity: Medium
Confidence: Verified
Bottleneck class: SERVER_WATERFALL
Affected surface: `/workshop/library` (Components management), in-estimate Templates panel, AI read-context library search
User symptom: Cold library/components load issues several sequential network waves; prior measure showed Library ~2675ms no-throttle median (archive evidence).
Technical cause: `component-library-repository.ts` `loadCurrentWorkspaceComponentRowsLibrary` runs wave 1 (categories/suppliers/brands/items in parallel), then wave 2 (`price_options` + `cost_entries` keyed by item ids), then wave 3 (versions/price_history/state_history/attachments) — at least 3 serial round-trips gated on item ids, 10 queries total for the full graph (matches memory obs 5787 "4 serial hops, 10 queries"). `getCurrentWorkspaceComponentLibrary` (line 1111) is a plain async function, NOT `cache()`-wrapped, so if the library layout fan-out resolves it more than once per request it re-runs the whole waterfall. The lite path (`includeDetailGraph:false`) correctly skips wave 3 for the in-estimate panel.
Evidence:
- `src/lib/repositories/component-library-repository.ts:531-552` (wave 1), `:587-610` (wave 2 price options/cost entries), `:615-639` (wave 3 audit/attachment graph)
- `src/lib/repositories/component-library-repository.ts:1111-1123` (`getCurrentWorkspaceComponentLibrary` — plain async, no `cache()`)
- project memory observation 5787 (4 serial hops / 10 queries)
- archive: `perf:measure-routes` Library 2675ms no-throttle median
Current metric:
- observed (archive): Library route ~2675ms no-throttle median; structurally 3 serial DB waves / up to 10 queries
Target metric:
- Fewer serial waves (e.g. push item-keyed joins into a view/RPC) and request-cached loader so a single render never re-runs the graph
Recommended action:
- Plan two things: (1) wrap `getCurrentWorkspaceComponentLibrary` / `getCurrentWorkspaceComponentRowsLibrary` in `React.cache()` to dedupe within a request (same pattern already proven for `ensureDefaultWorkspace`/`getCurrentWorkspaceProject`); (2) evaluate a server-side view/RPC that joins items + default price option + current cost entry so the cost-bearing wave collapses. This is the Library Optimization P2 DB work that memory notes is still owner-gated.
Validation gate:
- server-timing shows library cold load issues fewer round-trips; a single render calls the loader once; lite vs full datasets stay byte-identical per existing contract tests
Risk:
- Collapsing waves into a view can change cost-derivation precedence (default price option vs denormalized columns) and break byte-parity the lite/full contract guarantees
Rollback/deletion criteria:
- Revert if lite/full byte-parity test fails or cost values diverge

### DB07 — Per-row estimate mutation pre-reads the row (nested-join SELECT) before each write RPC

Severity: Low
Confidence: Verified
Bottleneck class: SERVER_WATERFALL
Affected surface: Estimate row update/replace/unlink/delete server actions
User symptom: Each row edit incurs an extra validation SELECT round-trip before the write; under rapid editing this doubles round-trips per keystroke-batch.
Technical cause: `getValidatedEstimateRow` (`estimates/actions.ts:677`) runs a SELECT with a two-level inner join (`estimate_row_items → estimate_nodes!inner → estimates!inner`) to validate project ownership, then the mutation calls `requireCurrentUserContext()` and a `*_with_history` RPC which itself re-validates via RLS/`can_edit`. So each mutation is: `getCurrentWorkspaceProject` (cached) + validation SELECT + auth context + write RPC — serial. The validation SELECT largely duplicates what the RPC + RLS already enforce.
Evidence:
- `src/lib/estimates/actions.ts:677-695` (`getValidatedEstimateRow` nested-join SELECT)
- `src/lib/estimates/actions.ts:2599-2622` (`updateEstimateRowItem`: validated read → `requireCurrentUserContext` → RPC, serial)
- `src/lib/estimates/actions.ts:351-364` (`assertCanEditEstimate`/`Project` separate RPC guards)
Current metric:
- blocked — no live per-mutation timing; structurally +1 SELECT round-trip per row mutation
Target metric:
- Validation folded into the write RPC (RPC returns row_revision conflict / not-found) so the pre-SELECT is removed where the RPC already guards ownership
Recommended action:
- Plan to evaluate whether the `*_with_history` RPCs can return enough (current revision, ownership failure code) to drop the separate `getValidatedEstimateRow` SELECT for mutations that don't need the pre-image. Low priority — correctness-first optimistic-concurrency code; measure first.
Validation gate:
- Row mutation issues one fewer round-trip with identical conflict/not-found behavior; optimistic-concurrency tests (`expectedRowRevision`) stay green
Risk:
- Removing the pre-read could change error semantics (404 vs revision-conflict) the client relies on
Rollback/deletion criteria:
- Restore the pre-read if any optimistic-concurrency or error-mapping test regresses

### DB08 — Public share GET re-resolves token twice and records an event synchronously on the hot read path

Severity: Low
Confidence: Verified
Bottleneck class: DATABASE_QUERY
Affected surface: `GET /api/share/[token]` (public client viewer)
User symptom: Every public share open does an access read, a separate snapshot read, and a synchronous analytics insert before responding.
Technical cause: `route.ts` calls `resolveProjectPublicationAccessByToken(token)` then `resolveProjectPublicationSnapshotByToken(token)` — two reads of `project_publications` (the code comments at `public-repository.ts:91-93` and `:585-589` explicitly accept this as "1 access read + 1 snapshot read", the snapshot reader being per-request memoised). It then `await`s `recordProjectPublicationEvent` (an insert) before returning the snapshot. The rate-limit check is also a counting query + insert. For an anonymous high-fanout link these are all on the critical response path.
Evidence:
- `src/app/api/share/[token]/route.ts:29` (access read), `:52` (snapshot read), `:57-62` (await event insert before response)
- `src/lib/publication/public-repository.ts:91-115` (two distinct readers by design), `:585-597` (memoised snapshot reader)
Current metric:
- blocked — no live share timing; structurally 2 publication reads + 1 event insert + rate-limit count/insert per open
Target metric:
- Event recording made fire-and-forget (after response or via `waitUntil`) so the open analytics insert is off the response critical path; reads already minimized to 2 by design
Recommended action:
- Plan to move `recordProjectPublicationEvent` off the critical path (Next.js `after()`/`waitUntil`) so the snapshot returns without awaiting the analytics insert. The two reads are an accepted design tradeoff (lightweight access columns vs heavy `snapshot_json`) — leave as-is. Low priority.
Validation gate:
- Share open returns before the event insert completes; event still recorded; `no-store` headers and password/423 gates unchanged
Risk:
- Fire-and-forget inserts can be dropped on serverless function freeze, undercounting opens
Rollback/deletion criteria:
- Restore synchronous `await` if open-event counts drop materially vs prior baseline

### DB09 — Vercel Speed Insights not wired — no field Web Vitals RUM despite readiness script

Severity: Low
Confidence: Verified
Bottleneck class: GOVERNANCE_GAP
Affected surface: All routes (production field telemetry)
User symptom: No production field data to confirm whether the lab Lighthouse numbers (LCP ~3865ms authed projects) reflect real users; readiness claims stay lab-only.
Technical cause: `package.json` depends on `@vercel/analytics ^2.0.1` but NOT `@vercel/speed-insights`, even though `scripts/check-vercel-speed-insights-readiness.ts` (wired as `perf:check-speed-insights`) exists. Without the Speed Insights package/component, Core Web Vitals RUM is not collected, so all the captured Lighthouse/measure-route numbers remain lab measurements.
Evidence:
- `package.json` (`@vercel/analytics` present — verified `"@vercel/analytics": "^2.0.1"`)
- `package.json` (`perf:check-speed-insights` script exists — verified)
- grep: no `@vercel/speed-insights` dependency in `package.json` (verified absent this session)
- archive: `route-transition-lighthouse-after-project-list-trim` (lab-only LCP 3865ms)
Current metric:
- blocked — no field RUM exists; all perf numbers are lab/archive
Target metric:
- Speed Insights collecting field LCP/INP/CLS so readiness budgets can be set from real users
Recommended action:
- Plan to add `@vercel/speed-insights` and mount `<SpeedInsights/>` in the app shell (`providers.tsx` tree), then run the existing readiness script. This converts lab-only evidence into field data — a prerequisite for any production-readiness claim. Lowest implementation cost of the findings.
Validation gate:
- Speed Insights dashboard shows field LCP/INP/CLS samples for authed and public routes; readiness script passes
Risk:
- Adds a third-party script to the client bundle/critical path (small) and another analytics beacon
Rollback/deletion criteria:
- Remove the component if it measurably regresses TBT/script-transfer beyond budget

---

## 4. Dimension tables & notes

### 4.1 Reconciliation Matrix — Planned vs Implemented (verified this session)

| Item | Plan/Memory claim | Code reality (verified) | Status |
|------|-------------------|--------------------------|--------|
| Estimates-list summaries RPC | Landed (b0dec7fc) | `project_estimate_list_summaries` RPC migration present (20260614161500), called at workspace-repository.ts:1464, server-side SUM/COUNT, `security invoker`, revoked from anon | IMPLEMENTED (verified) |
| Charts buckets-only payload | Landed (083e07ce) | Wire payload IS buckets-only (server reduces via buildSeriesByEstimate); but `get_project_chart_buckets` RPC migration (20260614021500) is NEVER called in src/ — raw facts still folded in server JS | PARTIAL — wire-trim landed, SQL push-down dormant (DB02) |
| Charts O(rows×nodes) map-per-row bug | Verify status | FIXED — aggregate-project-charts.ts:29-35 hoists nodeById/categoryById/supplierById lookups out of the row loop | IMPLEMENTED (verified) |
| React.cache auth dedupe | ensureDefaultWorkspace / getCurrentWorkspaceProject cached | Both `cache()`-wrapped (workspace-repository.ts:732, 1153); getCachedProjectMembers also cached (1186); collab+publication summaries reuse them | IMPLEMENTED (verified) |
| RLS auth.uid() initplan | Teamspace migration applied | Helpers wrapped (20260614120100 + 20260614162000 for is_workspace_member); ~152 bare auth.uid() direct-policy sites remain | PARTIAL (DB04) |
| Database indexing plan | NOT implemented | P0 audit-only; core indexes exist, plan's Layer-A composites do not | NOT IMPLEMENTED — as expected (DB03) |
| Library lite loader (skip detail graph) | Library Opt P0/P1 | includeDetailGraph:false path verified (repo:615); skips versions/price_history/state_history/attachments | IMPLEMENTED (verified) |
| Library full loader request-cache | Library Opt P2 (DB, gated) | getCurrentWorkspaceComponentLibrary is plain async, NOT cache() | NOT IMPLEMENTED (DB06) |
| Estimate editor server-side reads | infosec: full rows to client | Editor read path still uses BROWSER Supabase client (estimate-repository.ts) | NOT IMPLEMENTED (DB01) |
| Speed Insights RUM | scripts exist | @vercel/speed-insights absent from package.json | NOT WIRED (DB09) |

### 4.2 API Route Inventory (`src/app/api/*`)

| Route | Method | Queries / payload | Payload-size risk | Notes |
|-------|--------|-------------------|-------------------|-------|
| /api/share/[token] | GET | access read + snapshot read + event insert + rate-limit count/insert | snapshot_json blob (sanitized) | no-store; event insert on critical path (DB08) |
| /api/share/[token]/comment | GET/POST | access read + session verify + rate-limit + load/insert comment | small | dynamic import of digest action on POST |
| /api/share/[token]/decision, /activity, /events, /session, /password, /unsubscribe | mixed | token resolve + scoped read/insert + rate-limit | small | SSE for /events (realtime) |
| /api/projects/.../export/proposal.xlsx | GET | auth + rate-limit + batched estimate+nodes+rows fetch (caps 1200/3000) | full XLSX Buffer in memory | no streaming (DB05); 413 guard; maxDuration 60s |
| /api/ai/ask | POST | flag gate → dynamic import handler → intent-gated read-context (1 branch/request) + DeepSeek + audit insert | bounded context | intent classifier prevents over-fetch; serial audit inserts |
| /api/ai/package-builder | POST | flag gate → handler; apply.ts uses *_with_history RPCs + 11 revalidatePath calls | bounded | heaviest mutation fan-out (revalidation, below) |
| /api/component-library/images, /attachments; /api/projects/images | mixed | storage-backed | image bytes | images.remotePatterns limited to supabase /component-images/** |
| /api/health | GET | trivial | none | |
| /api/webhooks/resend | POST | webhook ingest | small | |

### 4.3 revalidatePath breadth (over-invalidation review)

- Heaviest fan-out: `src/lib/ai/package-builder/apply.ts` (11 calls) and `src/lib/projects/actions.ts` (11). `apply.ts` revalidates `/workshop/projects`, project, estimates, charts, and a per-updated-node loop (`for (const nodeId of updatedNodeIds) revalidatePath(.../estimates/${nodeId})`) — the loop can issue many path invalidations per AI apply.
- `estimates/actions.ts` mutation block (1140-1142) invalidates project + estimates + charts together — charts revalidation on every estimate edit is broad but defensible (charts derive from rows).
- Most are specific-path (good); the AI apply per-node loop is the main candidate to review for over-broad invalidation. Not a blocking finding — folded into DB context.
- This sits inside the orchestrator-noted churn surface (23 `router.refresh` + 57 `revalidatePath` call sites repo-wide); see 13_RISK_REGISTER for the cache-churn blast-radius treatment.

### 4.4 Server-side aggregation vs JS fold scorecard

| Surface | Aggregation location | Verdict |
|---------|---------------------|---------|
| Estimates list node/row/total | SQL RPC (project_estimate_list_summaries) | GOOD — server-side |
| Project charts buckets | server JS fold (RPC dormant) | SUBOPTIMAL — DB02 |
| firstNodeId (estimates list) | JS oracle (selectFirstEstimateNodeIds) over narrow nodes query | INTENTIONAL — RPC returns null first_node_id by design (depth-first/area-first must stay in JS) |
| Library overview counts | SQL count(exact, head) per metric in one Promise.all | GOOD |
| Estimate row totals (editor) | JS per-row (toUiRow) | acceptable — needed for editing |

### 4.5 Measurement status (this session)

- Live authed measure-route-transitions: **BLOCKED** (no dev server, dev-auth disabled, no Playwright storage state).
- `EXPLAIN` / `pg_stat_statements`: **BLOCKED** (no DB execution; hosted MCP not invoked this session).
- All latency figures cited are from `.ai/09_archive` artifacts (lab) — recorded as observed(archive), never fabricated.
- Hosted-applied status of `get_project_chart_buckets`: per project memory it is NOT applied to hosted (deploy-breaker fixed but unapplied) — relevant to DB02 if wiring it.
- Budget context: `e2e/route-transition-performance-budgets.json` budgets are LOOSE smoke budgets (publicRoute 15000ms, slow3g 30000ms, bfcache 1500ms, authed transition 10000ms) labelled "legacy smoke budget, not readiness budget". No DB validation gate here should be read as a readiness budget until DB09 (RUM) lands.

### 4.6 Note (cross-dimension, not a DB finding): font discrepancy

README/design-system says "SF Pro" but `src/app/layout.tsx` loads `next/font/google` `Roboto_Mono` — flagged for the typography/asset dimension; out of scope for DB/API but recorded per prompt instruction.

---

## 5. Cross-references

- **03_ROUTE_SPEED_MATRIX.md** — DB01 (estimate editor), DB02 (charts), DB06 (library) map onto the slowest authed routes; the archive medians cited here (Library ~2675ms, Projects ~2325ms) feed that matrix's per-route columns.
- **12_OPTIMIZATION_BACKLOG.md** — all DB01–DB09 findings should land as backlog items with the recommended-action + validation-gate as the acceptance criteria. Suggested priority order: DB09 (lowest cost, unblocks RUM) → DB01 (highest severity, infosec overlap) → DB02 (reconcile dormant RPC) → DB06 (cache + view) → DB03/DB04 (gated on live DB introspection) → DB05/DB07/DB08 (low).
- **13_RISK_REGISTER_AND_BLAST_RADIUS.md** — DB01 (editor optimistic-CRUD regression), DB02 (hosted-RPC-missing deploy-breaker + total-value parity drift), DB04 (mass RLS-policy rewrite access-semantics risk), DB06 (cost-derivation precedence / byte-parity), and the §4.3 revalidatePath churn surface are the high-blast-radius items.
- **15_READINESS_DECISION.md** — DB09 is a hard precondition for any production-readiness claim (no field RUM today); DB01 carries an infosec dimension; DB03/DB04 are explicitly gated on authorized live Supabase introspection. No readiness claim should be made from the lab/archive numbers alone.
