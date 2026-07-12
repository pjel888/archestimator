# 09 — Findings: Performance Budget Analysis (improve-stage pass)

This pass **corrects the create-stage round-trip count** and maps findings to
the project's numeric performance budgets. Evidence = `file:line` vs current
`main`. IDs: `PF-*`.

## Budgets (from `.ai/01_roadmap/27-performance-budget-and-regression-gates.md` + `.ai/00_system/PERFORMANCE_LOADING_AND_MOUNT_PROTOCOL.md`)

| Budget | Value | Source |
|---|---|---|
| Workshop route transition (Enterprise MVP / Beta acceptable) | **<100ms / <200ms** | roadmap L45, table L64-71 |
| `/workshop/*` main bundle chunk | **<80KB gz** | roadmap L68 |
| `/workshop/*` critical-path JS | **<120KB gz** | roadmap L68 |
| Initial public LCP | <2.0s (Enterprise) | roadmap L54 |
| Module Law (Rule 2) | Heavy modules **must** be `next/dynamic` + `ssr:false` | roadmap L19, protocol §3 |
| Bundle regression (Rule 9) | Flag any >10KB gz main-bundle addition | roadmap L26 |

**Critical gap:** there is **no explicit D1 round-trip or query-count budget** anywhere in the roadmap. The only DB language is qualitative ("identify query/index impact", "EXPLAIN evidence"). The closest numeric proxy is the <100ms workshop-transition budget — which on Cloudflare Workers is dominated by serial D1 round-trips (~5-15ms RTT each to remote D1), so round-trip count is the de-facto budget lever.

## Corrected D1 round-trip count: ~20, not 8

The create-stage pack counted only the 7 roster queries. The real cold load is
**~20 D1 round-trips across 4 serial waves**:

### Wave 1-2 — `listCurrentWorkspaceProjects` (in roster's outer `Promise.all`, `roster-repository.ts:635-638`)

`listCurrentWorkspaceProjectsAppPath` (`workspace-repository.ts:1486`) runs:
- **Wave 1 (8 parallel):** owned projects, project favorites, estimate favorites, project_members, estimate_sheet_members, workspace_members, project_groups, project_group_memberships (`:1499-1570`)
- **Wave 2 (3 parallel):** shared projects, favorite estimates, all project estimate sheets (`:1590-1624`)
- **Access probe (serial loop):** `readAccessibleEstimateIdSet` — 1 query per 90-estimate batch (`workspace-repository.ts:1279,1292`). A workspace with 300 estimates = **4 extra serial RTTs**.
- `ensureDefaultWorkspace` cache-miss: ~2 RTs (`readWorkspaceById` + `canUseWorkspaceAsDefault`)

**Subtotal: 11 + ceil(estimates/90) + 2 ≈ 13-14 RTs**, in 2 serial waves + serial access-probe loop.

### Wave 3-4 — roster fan-out (`roster-repository.ts:661-673`)

- **Wave 3 (4 parallel):** publications (`:486-508`), estimate updated_at (`:564-571`), estimate counts (`:584-591`), **correlated subquery latest-status** (`:602-617`)
- **Wave 4 (3 parallel):** recipient counts (`:516-524`), latest comment (`:532-539`), latest response (`:548-555`)

**Subtotal: 7 RTs in 2 serial waves.**

### Grand total: ~20 RTs / 4 serial waves

At ~5-15ms D1 RTT, 4 serial waves alone floor the server response at **~40-80ms+ of pure round-trip latency** before query execution — the dominant risk to the <100ms Enterprise budget. The create-stage pack's "8 round-trips" (PF-1/PERF-1) was an undercount because it missed `listCurrentWorkspaceProjects`'s 11-14 RTs upstream.

## PF-1 — No D1/query-count budget; ~20 RTs / 4 serial waves on a <100ms route [P1, corrected]

(See above.) The create-stage PERF-1 is upgraded: the cost is ~20 RTs, not 8.

**Fix (UNIT-1):** add a numeric budget to `27-performance-budget-and-regression-gates.md` ("authenticated workshop server render: ≤8 D1 round-trips, ≤3 serial waves") + a per-route query-count gate in `scripts/check-route-transition-readiness.ts`.

## PF-2 — `readAccessibleEstimateIdSet` is a serial loop of 1 RT per 90 estimates [P1, new]

**Evidence:** `workspace-repository.ts:1279,1292` — a `for` loop issuing one D1 query per 90-estimate batch, **serial**, paid on every publisher load even though `readEstimateUpdatedAtRows` (`roster-repository.ts:559`) only needs timestamps, not access-gated rows.

**Fix (UNIT-1):** (a) use `database.batch()` (supported per `d1.ts:22`) to fire all access-probe batches in one RT; (b) for the publisher roster specifically, skip per-estimate access gating — the roster already filters to `canReadPublicationRoster` projects.

## PF-3 — Correlated subquery is redundant; latest-status derivable from already-fetched rows [P1, confirmed]

**Evidence:** `roster-repository.ts:595-628`. `readRosterPublications` (`:480-508`) already fetches all publications ordered `published_at DESC` — the newest per project is the first row per `project_id`. The subquery re-derives "latest status per project" only to populate `shareProjectOptions[].status` (`:301-318`). It is restricted to `manageableProjectIds` (`:665`), whose publications are already in `publicationRows` (`:667`).

**Fix (UNIT-1):** delete the query; compute `statusByProjectId` in JS from `publicationRows` grouped by `project_id` (first row wins). Removes 1 RT + a quadratic self-scan.

## PF-4 — `ShareWizard` (+ 764-LOC `RecipientEmailComposer`) statically imported, user-gated [P1, new]

**Evidence:** `PublisherRosterClient.tsx:15` static `import { ShareWizard }`. `ShareWizard` is only rendered when `wizardRow !== null` (`:414`). It transitively pulls `RecipientEmailComposer` (764 LOC) + `SheetPickerList` + `UnsavedChangesDialog`. **Zero `next/dynamic`/`lazy` in the entire `src/components/workshop/publisher/` tree** (grep confirmed).

**Conflicts:** protocol §3 Mount Law; roadmap Rule 2; `/workshop/*` <80KB main budget.

**Fix (UNIT-11 — new, bundle):** `next/dynamic(() => import("./ShareWizard"), { ssr: false, loading: () => <Skeleton/> })`.

## PF-5 — `PublisherDrawer` and `PublisherProjectPicker` also statically imported, user-gated [P1, new]

**Evidence:** `PublisherRosterClient.tsx:10,13`. Drawer is the right pane (only when `selectedRow`); Picker is a modal. Both pull heavy transitive deps (Drawer → `PublisherActivityFeed` + `RecipientEmailComposer`; Picker re-implements modal chrome — see D-8).

**Fix (UNIT-11):** `next/dynamic` both with `ssr:false`. Drawer is right-pane so evaluate `ssr:true`+`loading` if LCP-relevant, but it's not first-paint when no row is selected.

## PF-6 — D1 round-trips invisible to perf tracing [P2, new]

**Evidence:** `server-timing.ts:98-139` — `traceDatabaseFetch`/`instrumentDatabaseFetch` only wrap the **Postgres REST** fetch path (parses `/rpc/` + `/rest/v1/` URLs). The D1 binding (`getCloudflareD1Database`, `d1.ts:35-44`) is **not instrumented** — `prepare().all()` goes straight to the binding with no timing wrapper. Even the existing `traced()` wrappers are no-ops unless `PERF_TRACE=1` (`server-timing.ts:32-34`), and no `Server-Timing` HTTP header is emitted (output is `console.log("[perf-json]…")` only).

**Impact:** The ~20 D1 RTs that dominate the cold load are **invisible** in the trace; `databaseRoundTrips` (`server-timing.ts:61`) undercounts. Cannot measure what you can't see.

**Fix (UNIT-1 / observability):** wrap `getCloudflareD1Database` so the returned `prepare()` is auto-timed (increment a per-request D1 RT counter via the existing `AsyncLocalStorage`); emit a real `Server-Timing` header. This unblocks measuring every other PF finding.

## PF-7 — Double `<Suspense>` wrapping a single async child [P2, new]

**Evidence:** `page.tsx:42-45` and `:58-60` — two `<Suspense fallback={<PublisherRosterSkeleton/>}>` boundaries wrap the same single async `PublisherData`, which does all DB work before returning the client. Streaming buys nothing; the skeleton shows for the full server duration.

**Fix (UNIT-11):** split `PublisherRosterClient` into a static shell (filters + empty list, outside Suspense) that streams immediately and a roster `Suspense` that resolves with rows; or accept the single boundary. Protocol §4 Streaming/Suspense Law (LCP outside Suspense).

## PF-8 — Mutations trigger full `router.refresh()` instead of optimistic patch [P2, new]

**Evidence:** `usePublisherDrawer.ts:24,36-40` — `staleTime: 10_000`; every mutation calls `invalidateQueries` + `router.refresh()` (a full server re-render of the roster) for any republish/rotate/revoke.

**Fix (UNIT-1):** for mutations that change one publication's status, prefer `setQueryData` optimistic patch over `router.refresh()`. Reduces server load + perceived latency (roadmap L45 row-edit <100ms).

## Highest-leverage sequence

**PF-6 (measure) → PF-3 + PF-2 (cut ~2-5 RTs) → PF-4/PF-5 (cut client bundle) → PF-1 (lock in budget).** PF-3 alone is the quickest win: one deleted query, no behavior change.
