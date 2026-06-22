# 11 — Server-Side Data-Fetching Waterfall (Estimate Sheet)

**Lane:** L2 (server waterfall) · **Status:** COMPLETE · **Read-only on `src/`.**
**Route:** `/workshop/projects/[projectId]/estimates/[nodeId]`
**Entry:** `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`

All citations are `file:line`. "RTT" = one Supabase HTTP round-trip (dev →
hosted Supabase = 0.3–5 s each per [[hero-path-perf-network-bound]]).

---

## 1. Page await structure (the two blocks)

The page body has exactly two `await withPerfTraceRequest(...)` blocks.

### Block 1 (`page.tsx:36-41`) — "route context + current user" (parallel pair)

```ts
const [estimateTreeResult, currentUser] = await withPerfTraceRequest("workshop.estimate-sheet", () =>
  Promise.all([
    traced("estimate-sheet.route-context", () => resolveEstimateTabRouteContext(projectId, nodeId, ESTIMATE_SHEET_TREE_LOAD_LIMITS)),
    traced("estimate-sheet.current-user", () => requireCurrentUserContext()),
  ]),
);
```

Resolves two values concurrently in one `Promise.all`:
- `estimateTreeResult` → `{ project, estimate, selectedNodeId, tree, tab, tabs, loadLimitState }` via `resolveEstimateTabRouteContext` (`workspace-repository.ts:2780`).
- `currentUser` → `CurrentUserContext` via `requireCurrentUserContext` (`session.ts:87`), which delegates to the `React.cache`-wrapped `getCurrentUserContext` (`session.ts:31`).

Note: `requireCurrentUserContext` is **also called inside** `ensureDefaultWorkspace` (via `getCurrentWorkspaceProject` → `ensureDefaultWorkspace`, `workspace-repository.ts:823`) which is itself called by `resolveEstimateTabRouteContext`. Because both `getCurrentUserContext` and `ensureDefaultWorkspace` are wrapped in `React.cache()`, the second call is a deduped memo hit — **not** a second RTT.

### Block 2 (`page.tsx:64-71`) — "tabs tail + edit capability" (parallel pair, **after** Block 1)

```ts
const [estimateTabs, canEditEstimate] = await withPerfTraceRequest("workshop.estimate-sheet-tail", () =>
  Promise.all([
    traced("estimate-sheet.tabs", async () => tabs ?? (tab ? await getEstimateTabs(project.id, estimate.id) : [])),
    traced("estimate-sheet.edit-capability", async () => tab ? await resolveEstimateEditCapability(estimate.id) : false),
  ]),
);
```

- **`estimateTabs`** falls back to `getEstimateTabs` ONLY when Block 1 didn't already return `tabs`. In the common tab-present path (node has `estimate_tab_id`), `resolveEstimateTabRouteContext` already attached `tabs` (`workspace-repository.ts:2809-2817`), so this branch is a no-op (`tabs ?? …` short-circuits).
- **`canEditEstimate`** calls `resolveEstimateEditCapability` only when `tab` is truthy; on the legacy/no-tab path it resolves to `false` with no RTT.

### Why Block 2 is after Block 1

Both branches of Block 2 need `estimate.id`, which is only known after Block 1's `resolveEstimateTabRouteContext` resolves (it comes from the `estimate_nodes → estimates!inner(*)` join, `workspace-repository.ts:2789-2794`, or from the `estimates` lookup at `workspace-repository.ts:2821`). The comment at `page.tsx:58-63` documents this precisely and confirms: **"it adds no new sequential first-paint hop"** — i.e. Block 2 is not on the first-paint critical path for the common path because (a) `tabs` is already present, and (b) `canEditEstimate` only gates UI affordances.

**Important nuance:** On the **tab-present common path**, Block 2 issues at most ONE RTT (`resolveEstimateEditCapability` → `can_edit_estimate` RPC). On the **legacy/no-tab path** (`tab` is null), Block 2 issues **zero** RTTs (both branches short-circuit).

---

## 2. `resolveEstimateTabRouteContext` query inventory

`resolveEstimateTabRouteContext` (`workspace-repository.ts:2780-2852`) branches by the shape of the `nodeId` route segment. Three paths exist; the common one (the canonical sheet URL — a node id with `estimate_tab_id`) is **Path A**.

### Shared preamble (every path)

| # | Query | Table / RPC | Seq or parallel | File:line |
|---|-------|-------------|-----------------|-----------|
| P0 | `ensureDefaultWorkspace()` (memoized) | see `ensureDefaultWorkspace` inventory below | memo hit if already called | `workspace-repository.ts:2785` → `:822-881` |
| P1 | `createSupabaseServerClient()` (memoized) | none (constructs client; reads cookies/headers) | memo hit after first call | `workspace-repository.ts:2788` → `supabase/server.ts:29` |
| P2 | `estimate_nodes` select w/ `estimates!inner(*)` join | `estimate_nodes` (joined to `estimates`) | — | `workspace-repository.ts:2789-2794` |

`P2` is the first real DB hop. It returns the node + its parent estimate in **one** RTT (PostgREST inner join).

### Path A — node has `estimate_tab_id` (COMMON; canonical sheet URL)

After `P2` returns a node with `estimate_tab_id` (`workspace-repository.ts:2805`):

| # | Query | Table / RPC | Seq or parallel | File:line |
|---|-------|-------------|-----------------|-----------|
| A1a | tab tree load (nodes + rows for this tab) | `estimate_nodes`, `estimate_row_items` | **parallel pair** inside `getEstimateTabTreeForResolvedEstimateTab` | `workspace-repository.ts:2810` → `:2582-2639` |
| A1b | tab list read | `estimate_tabs` | **parallel with A1a** in the outer `Promise.all` | `workspace-repository.ts:2811` → `readEstimateTabsForEstimate :2465-2483` |

Inside A1a (`getEstimateTabTreeForResolvedEstimateTab`): the nodes query runs first, then rows are fetched with `.in("node_id", nodeIds)` (`workspace-repository.ts:2598-2613`). So **nodes → rows IS sequential** within A1a (rows depend on node ids), but A1a-as-a-whole runs in parallel with A1b.

**Path A total DB/RPC hops after P0/P1/P2:** 3 sequential layers — `P2` → `Promise.all(A1a(nodes-then-rows) ∥ A1b)` → done. Effective serial depth = `P2` + `nodes` + `rows` = **3 RTTs** (A1b hides under the nodes RTT).

### Path B — `P2` returns a node WITHOUT `estimate_tab_id` (legacy data), or `estimate_tabs` schema missing

Falls through to `workspace-repository.ts:2820-2848`. It re-fetches the estimate by id, reads tabs, finds the default tab, loads its tree. Then falls back to `getProjectEstimateTreeByEstimate` (`workspace-repository.ts:2850` → `:2757`) which itself calls `getDefaultEstimateTab` + `getEstimateTabTree`.

| # | Query | Table / RPC | Seq or parallel | File:line |
|---|-------|-------------|-----------------|-----------|
| B1 | `estimates` by id | `estimates` | sequential (after P2) | `:2821-2826` |
| B2 | tab list | `estimate_tabs` | sequential (after B1) | `:2835` → `readEstimateTabsForEstimate` |
| B3 | default-tab tree (nodes + rows) | `estimate_nodes`, `estimate_row_items` | nodes→rows sequential; runs after B2 | `:2838-2844` → `getEstimateTabTreeForResolvedEstimateTab` |

**Path B total:** P2 + B1 + B2 + nodes + rows = **5 RTTs** serial depth. Rarely hit on canonical URLs.

### Path C — `P2` errors with "estimate_tabs schema missing"

`workspace-repository.ts:2796-2802` → `getProjectEstimateTreeByNode` (`:2854`) → legacy whole-estimate nodes+rows parallel pair (`:2870-2873`). Not the common path.

### N+1 / fan-out check

- **No per-node loop.** Tree loading is a single nodes query scoped by `estimate_id` (+ `estimate_tab_id` filter on Path A) with a `LIMIT maxNodeCount+1` guard (`load-limits.ts`: `maxNodeCount: 1500`, `maxRowItemCount: 5000`).
- **No per-tab loop on the page path.** `resolveEstimateTabRouteContext` loads exactly the one tab the route points at. The per-tab fan-out lives only in `getEstimateTreesForTabs` (`workspace-repository.ts:2689`, used by export), which is **not** on this route.
- Rows are fetched with one `.in("node_id", nodeIds)` query (single RTT) — not one-per-node.
- The `can_edit_estimate` RPC in Block 2 is one call per request, not per-row.

### How the tree is loaded

Single bounded query per table (nodes, then rows). `ESTIMATE_SHEET_TREE_LOAD_LIMITS = { maxNodeCount: 1500, maxRowItemCount: 5000 }` (`load-limits.ts:1-4`). The loader over-fetches by 1 (`limit(maxNodeCount + 1)`, `workspace-repository.ts:2598`) to detect "exceeded limit" for `loadLimitState`. No pagination, no recursive CTE, no server-side cursor.

---

## 3. Numbered server critical-path sequence (the waterfall)

Common path (Path A) — the canonical `/estimates/<nodeId>` URL. Steps marked **seq** wait for the prior step; **par** runs concurrently.

| Step | Function | Query / RPC | Table / RPC | Depends on | File:line |
|------|----------|-------------|-------------|------------|-----------|
| 1 | `requireCurrentUserContext` (Block 1 right branch) → `getCurrentUserContext` | dev-bypass? if not: `supabase.auth.getUser()` | Supabase Auth `getUser` | — (kicks off in parallel with Step 4) | `session.ts:31-49` |
| 2 | (same) `getClosedBetaAccessForEmail` (only if `CLOSED_BETA_ACCESS_ENABLED=true`) | RPC `check_closed_beta_access` | RPC | Step 1 | `session.ts:45-49` → `closed-beta-access.ts` |
| 3 | (same) `profiles` select (user profile) | `profiles` | `profiles` | Step 1 | `session.ts:54` |
| 4 | `resolveEstimateTabRouteContext` (Block 1 left branch) → `ensureDefaultWorkspace` → `requireCurrentUserContext` (memo hit from Step 1) | — (memo) | — | Step 1 (deduped via `cache()`) | `workspace-repository.ts:2785` → `:823` |
| 5 | (same) `ensureDefaultWorkspace` body | `workspaces` select by `profile.default_workspace_id` | `workspaces` | Step 3 | `workspace-repository.ts:827-831` |
| 6 | `resolveEstimateTabRouteContext` body — node + estimate join | `estimate_nodes` select with `estimates!inner(*)` | `estimate_nodes` (+ join `estimates`) | Step 5 | `workspace-repository.ts:2789-2794` |
| 7 | **par-A** `getEstimateTabTreeForResolvedEstimateTab` — nodes for tab | `estimate_nodes` select w/ `estimate_tab_id` filter, `LIMIT maxNodeCount+1` | `estimate_nodes` | Step 6 | `workspace-repository.ts:2810` → `:2591-2598` |
| 8 | **par-A** (cont.) rows for tab nodes | `estimate_row_items` select `.in("node_id", nodeIds)`, `LIMIT maxRowItemCount+1` | `estimate_row_items` | Step 7 (needs node ids) | `workspace-repository.ts:2606-2613` |
| 9 | **par-B** `readEstimateTabsForEstimate` (tab list) | `estimate_tabs` select | `estimate_tabs` | Step 6 (runs concurrently with 7) | `workspace-repository.ts:2811` → `:2465-2483` |
| 10 | Block 1 resolves; `notFound()` gate | — | — | Steps 1-9 | `page.tsx:42-44` |
| 11 | Block 2 — `estimateTabs` branch | short-circuits (`tabs` already set from Step 9) | — none — | Step 10 | `page.tsx:66` |
| 12 | Block 2 — `resolveEstimateEditCapability` | RPC `can_edit_estimate` | RPC | Step 10 (needs `estimate.id`) | `page.tsx:69` → `workspace-repository.ts:2493-2500` |
| 13 | Render `<EstimateWorkspaceClient>` (RSC payload streamed to client) | — | — | Steps 11-12 | `page.tsx:82-101` |

### Serial depth (common path, closed-beta OFF)

Counting only the steps that cannot overlap:

`Step 1 (auth.getUser)` ∥ `Step 4-5 (workspace)` → `Step 6 (node+estimate)` → `Step 7 (tab nodes)` → `Step 8 (tab rows)` → `Step 12 (can_edit_estimate)`

- `Step 1` and `Step 5` overlap (Block 1's two `Promise.all` branches + `cache()` dedup).
- `Step 9` hides under `Step 7`.
- `Step 8` depends on `Step 7`'s node ids (sequential within the tab loader).
- `Step 12` is strictly after Block 1.

**Effective critical path ≈ 5 RTTs**: auth.getUser ∥ workspace → node+estimate → tab nodes → tab rows → can_edit_estimate.

With closed-beta ON, add 1 RTT for `check_closed_beta_access` (Step 2, after `getUser`, before the rest — strictly serial, since the redirect gate must clear before any further work is meaningful). With `profile.default_workspace_id` NULL and no workspace membership, `ensureDefaultWorkspace` adds a workspace insert + profiles update (2 more RTTs) — but this is first-request-only and memoized for the session.

### Pre-page layering (not in `page.tsx`, but they block first paint)

Above the page, two async layouts also `await` before the sheet can render:
- `src/app/workshop/layout.tsx:25-28` — `getCurrentUserContext` (memo hit), then `getCurrentUserTermsAcceptanceStatus` (additional RTT).
- `src/app/workshop/projects/[projectId]/layout.tsx:22` — `getCurrentWorkspaceProject(projectId)` (memo hit from Block 1's `ensureDefaultWorkspace` chain, but the `projects` select at `workspace-repository.ts:1740` is its own RTT — deduped with Block 1's `getCurrentWorkspaceProject` call via `React.cache`).

These are owned by L3 (layouts/caching lane) — flagged here only because they sit **above** Block 1 in the render tree.

---

## 4. Parallelization opportunities

### OPP-1 (HIGH IMPACT, low risk): parallelize tab nodes ↔ tab rows in `getEstimateTabTreeForResolvedEstimateTab`

Currently nodes are fetched first, then rows are fetched with `.in("node_id", nodeIds)` (`workspace-repository.ts:2598-2613`) because the row query needs the node ids. This is **inherent** if rows are filtered by `node_id`, **but** on the tab path the nodes are already scoped by `estimate_tab_id` — so rows could be scoped by `estimate_id` + `estimate_tab_id` (via the node's tab, assuming rows inherit tab affiliation through their node) in a parallel `Promise.all`, removing one serial RTT from the critical path. Needs schema check that `estimate_row_items` can be tab-scoped without the node-id list (currently no `estimate_tab_id` column on rows — **UNVERIFIED**; if absent, this requires a migration or a join). See also the same pattern in `getProjectEstimateTreeByNodeLegacy` (`:2870-2873`) and `getEstimateTreesForTabs` (`:2712-2734`).

### OPP-2 (MEDIUM IMPACT, low risk): hoist `resolveEstimateEditCapability` to Block 1

`canEditEstimate` only needs `estimate.id`, which is known as soon as Step 6 (`estimate_nodes` join) resolves — well before Steps 7-9 finish. Today it waits for all of Block 1 (including the tree) to complete because it lives in Block 2. If the tree load were non-blocking (streamed via Suspense — see OPP-4), `can_edit_estimate` could fire in parallel with the tree load rather than after it. Even without Suspense, restructuring Block 1 to a three-way `Promise.all` that includes `resolveEstimateEditCapability` (kicking it off after Step 6 but before Steps 7-9 settle) would save ~1 RTT on the critical path.

### OPP-3 (MEDIUM IMPACT, moderate risk): co-locate node lookup + tab tree as a single RPC

Steps 6, 7, and 9 could all be replaced by one PostgREST RPC that takes `(project_id, node_id)` and returns `{ estimate_id, tab_id, nodes[], rows[], tabs[] }`. This collapses 3 RTTs to 1. Pattern already exists in the codebase (`workspace_homebase_summary`, `project_estimate_list_summaries`). Risk: a new RPC + RLS parity.

### OPP-4 (HIGH IMPACT, Next-idiomatic, owned by L1/L7): stream the tree behind a Suspense boundary

The tree (Steps 7-8) is the heaviest part and the part the user looks at last (the chrome — tabs, metadata strip, collaboration — renders first conceptually). If the page returned the shell + `node+estimate+tabs+canEdit` and wrapped `<EstimateWorkspaceClient nodes={...}>` in `<Suspense>`, the heaviest RTTs (tree nodes/rows) would not block first paint of the shell. This is the canonical Next App Router PPR / streaming pattern — defer to L1/L7 docs. `page.tsx` today is fully `await`-gated.

### OPP-5 (LOW IMPACT): skip `getClosedBetaAccessForEmail` after the redirect gate has cleared once

If closed-beta is on, `check_closed_beta_access` runs on every request (`session.ts:45-49`). It's memoized per-request via `getCurrentUserContext`'s `cache()`, but not across requests. `unstable_cache` with a short TTL keyed by email would remove this RTT entirely from the in-region hot path. (Security review needed — the beta allow-list changes must invalidate promptly.)

---

## 5. Inherently sequential dependencies (cannot be parallelized without schema/RPC changes)

1. **`getCurrentUserContext` chain** (Steps 1 → 2 → 3): `auth.getUser()` must resolve before the email is known; email is needed for closed-beta; closed-beta must clear before the profile lookup is meaningful (redirect gate). Cannot be parallelized. Memoized per-request only.
2. **`ensureDefaultWorkspace` after `getCurrentUserContext`** (Step 4 → Step 5): needs `profile.default_workspace_id` from Step 3. Already memoized via `cache()` so the cost is paid once per request.
3. **`estimate_nodes` join (Step 6) before tree/tab list (Steps 7, 9)**: the tab id (and `estimate.id`) come from Step 6. Nothing downstream can start without it.
4. **Tab nodes (Step 7) before tab rows (Step 8)**: rows are filtered by `.in("node_id", nodeIds)` — the node ids are only known after Step 7. Inherent unless a tab-scoped row query is added (see OPP-1).
5. **Block 2 after Block 1**: `estimate.id` is produced by Block 1. Already documented in `page.tsx:58-63`. Only movable behind Suspense (OPP-4) or an RPC merge (OPP-3).

These can only be: (a) moved behind a Suspense boundary so they don't block first paint (OPP-4), (b) prefetched on link hover (client concern — L4/L7), or (c) merged into fewer RPCs (OPP-3).

---

## 6. Network-bound caveat + RLS notes

### Network-bound locally

Per [[hero-path-perf-network-bound]], local dev talks to **hosted Supabase** with **0.3-5 s RTT per call**. The common-path critical path is ~5 RTTs after the auth preamble — that is **1.5-25 s of pure network wait locally**, essentially all of it serial. **This is the dominant local-dev cost.** In-region (Vercel ↔ co-located Supabase) the same 5 RTTs are single-digit milliseconds each and the page becomes compute-bound. Measure on Vercel before claiming the server path is slow in production.

Perf trace logging is instrumented: `withPerfTraceRequest` (`server-timing.ts:65-84`) and `traced` (`:86-96`) emit `[perf-json]` snapshots gated on `PERF_TRACE=1`. The Supabase fetch wrapper `instrumentSupabaseFetch` (`:132-139`) records per-relation round-trips. Labels emitted on this path: `estimate-sheet.route-context`, `estimate-sheet.current-user`, `estimate-sheet.tabs`, `estimate-sheet.edit-capability` (plus nested `traced` labels in the repository). Live capture is L6's scope. Real HTTP `Server-Timing` headers are not assumed by this pack unless a later implementation phase adds them.

### RLS-heavy patterns

- **`can_edit_estimate` RPC** (`workspace-repository.ts:2497`, Step 12): one call per request, not per row. This is the same RPC RLS and `assertCanEditEstimate` use (comment at `:2486-2491`) — server-authoritative, UX-gating only. Safe pattern.
- **No per-row `can_edit_*` loop** anywhere on this path.
- **No per-node auth check.** The `estimate_nodes` join at Step 6 (`estimates!inner(*)`) + `.eq("estimates.project_id", project.id)` is a single RLS-evaluated query — the join enforces the project scope.
- Optional-collaboration tables (`project_members`, `estimate_sheet_members`, `collaboration_invitations`, `project_publications`, `estimate_tabs`) all use the `isMissingOptionalCollaborationTable` / `isEstimateTabsSchemaMissing` fallback pattern (e.g. `workspace-repository.ts:329-334`, `2315-2318`). On the sheet path only `estimate_tabs` is touched (Path A's `readEstimateTabsForEstimate`), and it is NOT in the optional-fallback list — it throws on real errors and only falls back on the specific "schema missing" signal.
- `createSupabaseServerClient` (`supabase/server.ts:29`) has a dev-admin bypass path (`createDevSupabaseAdminClient`) that skips RLS entirely when `isDevAdminDatabaseBypassRequest` is true — service-role key. `resolveEstimateEditCapability` short-circuits to `true` under this bypass (`workspace-repository.ts:2494`). Production traffic never takes this branch.

### Cross-lane handoffs

- Layout awaits above the page (`workshop/layout.tsx`, `[projectId]/layout.tsx`) — **L3** owns whether they re-run on navigation.
- `[nodeId]/` segment has **no `loading.tsx`** (confirmed via `ls` of the segment dir — only `error.tsx` and `page.tsx`) — **L1** owns the skeleton cascade.
- Client hydration of `<EstimateWorkspaceClient>` + TanStack Query fan-out — **L4**.
