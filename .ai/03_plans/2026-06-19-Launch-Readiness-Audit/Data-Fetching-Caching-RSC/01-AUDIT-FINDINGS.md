# 01 — Audit Findings: Data Fetching, Caching & RSC Architecture

**Date:** 2026-06-19 · **Auditor lane:** Domain 8 (Data Fetching / Caching / RSC)
**Verdict:** This domain is **mature and well-engineered**. It has already absorbed multiple
dedicated perf/architecture passes (Performance-Refactor, Workshop-Dashboard-Query-Batching,
Projects-Page-Performance, sidebar-favorites-reactivity, workshop-dashboard-rsc). **No critical
or high launch blocker found.** One MEDIUM defense-in-depth note + a few LOW/INFO observations.

## Scope & coverage

**Read in full:** `src/app/providers.tsx`; `workspace-repository.ts` homebase/projects/project-data/
collaboration paths (L802–2010 sampled deeply); `project-charts-repository.ts`; `use-estimate-query.ts`;
`use-toggle-project-favorite.ts`; `use-sidebar-favorites-query.ts`; `realtime-auth-bridge.tsx`;
`favorites/query-keys.ts`; `component-library/query-keys.ts`; `useNotificationsQuery.ts`;
`LiveProjectCard.tsx`; `projects-page-client.tsx` (favorite/group flow); `workshop/page.tsx`;
`workshop/projects/page.tsx`; dashboard component tree + every `page.tsx`/`"use client"` in `src/app/workshop/`.

**Spot-checked:** `use-estimate-row-mutations.ts` (invalidation lines), `LibraryPageClient.tsx`
(initialData seeding), `auth/session.ts` (React `cache()` wrapping), `auth/actions.ts` (signOut nav).

**Deferred / not in lane:** RLS/RPC SQL correctness (domain 2), index coverage for the fetch shapes
(domain 3), server-action authz (domain 4), virtualization/render perf (domain 5).

## Reconciliation vs prior packs

| Prior pack / memory | Relationship to this audit |
|---|---|
| `09_archive/2026-06-19-Workshop-Dashboard-Query-Batching` | **Implemented & archived.** Owns the homebase serial-tail + `workspace_homebase_summary` RPC contract. RPC is env-gated (`WORKSHOP_HOMEBASE_SUMMARY_RPC_ENABLED`), default OFF; app path is the live path. Confirmed not regressed. |
| `03_plans/2026-06-17-Performance-Refactor` (A-23, Phase 4 data/cache) | Broad strategy. A-23 homebase work is now operationalized by the batching pack above. Its A-23 anchors (`workspace-repository.ts:1126-1222`) are stale per that pack's reconciliation; current homebase shape is L1393+. |
| `.ai/09_archive/2026-06-19-Projects-Page-Performance/` | Projects list fetch + RSC streaming (Suspense + `loading.tsx`) confirmed implemented in `workshop/projects/page.tsx`; archived context, not an active launch gate. |
| memory `workshop-dashboard-rsc` | Confirmed: `WorkshopDashboard` has NO `"use client"`; only 5 leaves hydrate. Boundary intact. |
| memory `sidebar-favorites-reactivity` | Confirmed: scoped TanStack key + optimistic patch + rollback + gcTime eviction all present and correct. |

---

## Findings

### DATA-FETCH-01 — Signed-out cache eviction only clears favorites, not the rest of the warm QueryClient
- **Severity:** medium · **launch_blocker:** false · **confidence:** high
- **Files:** `src/components/realtime-auth-bridge.tsx:55-60`, `src/app/providers.tsx:14-31`, `src/lib/auth/actions.ts`
- **Evidence:** The app uses ONE long-lived `QueryClient` created once at `AppProviders` mount
  (`providers.tsx:31`, `useState(createQueryClient)`) with `gcTime: 5*60_000`. On `SIGNED_OUT`,
  `realtime-auth-bridge.tsx:58` evicts **only** `favoritesQueryKeys.all()`. signOut is a server
  action that `redirect()`s to `/login` (`auth/actions.ts`), which the App Router resolves as a
  **soft navigation** — `AppProviders` does NOT remount, so the QueryClient (and every non-favorites
  entry) survives in memory for up to `gcTime`. Surviving keys include `["workspace-component-library"]`,
  `workspaceComponentRowsLibraryQueryKey(...)`, `workspaceEstimateTemplatesQueryKey(...)`,
  `["estimate", estimateId, ...]` trees, `projectCollaborationQueryKey`, and `["notifications", ...]`.
- **Impact:** Mostly memory hygiene + defense-in-depth, NOT a confirmed cross-user data leak:
  (a) the sensitive library/template/rows keys are tenant-scoped by `userId`+`workspaceId`, so a
  *different* login uses *different* keys and cannot read the prior login's entry by key;
  (b) estimate-tree keys are UUID-scoped, so cross-user key collision is effectively impossible;
  (c) notification keys (`["notifications","unread-count"]`, `feed`, `release-modal`) are NOT
  user-scoped — a fast same-tab sign-out → sign-in could momentarily surface the prior user's
  cached unread count / feed before the staleTime (30–60s) triggers a refetch. That is the only
  realistic residual-read path, and only on the rare same-process account switch.
- **Recommendation:** On `SIGNED_OUT`, broaden eviction to a full `queryClient.clear()` (simplest,
  reversible) OR at minimum also `removeQueries({ queryKey: ["notifications"] })` and the
  library/estimate prefixes. `queryClient.clear()` is the defense-in-depth choice and removes the
  need to enumerate keys as new caches are added. Single-file edit.
- **Effort:** S
- **existing_plan_overlap:** none (the realtime-auth-bridge comment cites "13 C5 / QA-17" for the
  favorites-only eviction; that decision predates the later library/notification caches and did not
  account for them — partial, scope-limited prior decision).

### DATA-FETCH-02 — Homebase app path runs 4 sequential round-trip waves (RPC collapse exists but is flagged off)
- **Severity:** low · **launch_blocker:** false · **confidence:** high
- **Files:** `src/lib/repositories/workspace-repository.ts:1393-1561`, `:1119-1124`
- **Evidence:** `getWorkshopHomebaseDataAppPath` issues wave-1 (6 parallel, L1404), wave-2 estimates
  (2 parallel, L1492), wave-3 backfill projects (1 dependent, L1512), wave-4 H6/H7/H8 tail (3
  parallel, L1553) — 4 serial DB round-trips by data dependency. The single-round-trip
  `workspace_homebase_summary` RPC exists (`getWorkshopHomebaseDataRpcPath`, gated at L1120 by
  `WORKSHOP_HOMEBASE_SUMMARY_RPC_ENABLED`); env var is unset in repo → app path is live.
- **Impact:** The dashboard's server render waits on ~4 serial Supabase hops. Bounded by per-user
  `WORKSHOP_HOMEBASE_ITEM_LIMIT` row caps, so latency is small at beta scale; not a blocker.
- **Recommendation:** No action for launch. This is exactly the work the archived batching pack
  scoped; enabling the RPC requires applying its migration to prod (PITR/branch-DB caveats apply)
  and measuring per its protocol — out of scope for this lane and not needed for closed beta.
- **Effort:** L (if ever pursued)
- **existing_plan_overlap:** covered-by:2026-06-19-Workshop-Dashboard-Query-Batching

### DATA-FETCH-03 — Projects list favorite toggle never reconciles server-rendered `favoriteProjectIds` (client-override-only)
- **Severity:** low · **launch_blocker:** false · **confidence:** high
- **Files:** `src/components/workshop/projects-page-client.tsx:1085-1108`, `:656,706-712`
- **Evidence:** `toggleProjectFavorite` updates the shared sidebar TanStack cache (via the hook) and
  a local `favoriteOverrides` map that is layered over server `favoriteProjectIds` (L706-712), but
  does NOT call `router.refresh()` and `favoriteOverrides` is never cleared. The server-rendered
  `favoriteProjectIds` therefore stays stale for the session; correctness is held entirely by the
  client override map.
- **Impact:** Within a tab this is correct and flicker-free (deliberate per D11/D14 design). The
  only divergence is multi-tab / multi-device: a favorite toggled in tab B is not reflected in tab
  A's already-server-rendered list until a real navigation/refresh. Acceptable for single-user MVP.
- **Recommendation:** Accept for launch. If desired later, broadcast via a `storage` event or
  TanStack `broadcastQueryClient`, or drive the card star off the same sidebar-favorites query the
  hook already maintains rather than a separate override map. Not needed for beta.
- **Effort:** M (if ever pursued)
- **existing_plan_overlap:** partial:2026-06-16-Sidebar-Favorite-Projects-And-Estimates (the override
  reconciliation is that pack's D11/D14 design; this is a noted, accepted limitation, not a defect).

### DATA-FETCH-04 — `ProjectsData` awaits look serial but are React-cache hits (no real waterfall) — INFO
- **Severity:** info · **launch_blocker:** false · **confidence:** high
- **Files:** `src/app/workshop/projects/page.tsx:13-20`, `workspace-repository.ts:863-864,802`, `auth/session.ts:31,87`
- **Evidence:** `ProjectsData` awaits `listCurrentWorkspaceProjects()` (L14), then
  `requireCurrentUserContext()` (L18), then `ensureDefaultWorkspace()` (L19) sequentially. All three
  underlying fns are `cache()`-wrapped (React request-scoped): `ensureDefaultWorkspace`
  (`:802`), `getCurrentUserContext` (`session.ts:31`), `listCurrentWorkspaceProjects` (`:863`, which
  itself calls `ensureDefaultWorkspace` first). So the L18/L19 awaits resolve from the request cache —
  no extra DB round-trip. Verified, not a waterfall.
- **Impact:** None. Recorded so a future reader does not "fix" a non-bug by re-parallelizing.
- **Recommendation:** No action.
- **Effort:** S
- **existing_plan_overlap:** covered-by archived `.ai/09_archive/2026-06-19-Projects-Page-Performance/`

### DATA-FETCH-05 — RSC/client boundary is clean; no accidental `"use client"` on heavy server trees — INFO
- **Severity:** info · **launch_blocker:** false · **confidence:** high
- **Files:** `src/components/workshop/dashboard/WorkshopDashboard.tsx:1-30`, all `src/app/workshop/**/page.tsx`
- **Evidence:** No `page.tsx` route segment is a client component. The only `"use client"` files in
  `src/app/workshop/` are `error.tsx` boundaries (mandatory) + one small `AdminStatusSelect` leaf.
  `WorkshopDashboard` is a Server Component; only 5 dashboard leaves carry `"use client"`
  (CreateActions, FavoritesTree, DashboardHero, DashboardEmptyState, LibraryHubCard). Matches the
  `workshop-dashboard-rsc` memory.
- **Impact:** None — confirms the streaming/hydration architecture is intact. A regression here
  (re-adding `"use client"` to `WorkshopDashboard` or a page) would be a real perf regression to watch.
- **Recommendation:** No action. Consider a lightweight test/lint guard asserting `WorkshopDashboard`
  stays a server component (nice-to-have, not launch).
- **Effort:** S
- **existing_plan_overlap:** covered-by memory `workshop-dashboard-rsc`

### DATA-FETCH-06 — Client query hooks correctly seed from RSC `initialData` (no server+client double-fetch) — INFO
- **Severity:** info · **launch_blocker:** false · **confidence:** high
- **Files:** `src/hooks/use-estimate-query.ts:25-165`, `src/components/workshop/LibraryPageClient.tsx:101-105`
- **Evidence:** Estimate tree/tab/tabs hooks and the library page client pass server-fetched data as
  `initialData` with `staleTime: 5*60_000` and `enabled` gates, so hydration reuses the SSR payload
  rather than immediately re-fetching. Query keys are tenant/UUID-scoped and the lite-vs-full library
  datasets are partitioned under distinct keys (`component-library/query-keys.ts`) with documented
  shared-prefix invalidation. No double-fetch pattern found.
- **Impact:** None — this is the desired pattern; recorded as positive evidence.
- **Recommendation:** No action.
- **Effort:** S
- **existing_plan_overlap:** covered-by:2026-06-17-Performance-Refactor (Phase 4 data/cache)

### DATA-FETCH-07 — TanStack defaults + mutation invalidation are coherent — INFO
- **Severity:** info · **launch_blocker:** false · **confidence:** high
- **Files:** `src/app/providers.tsx:14-28`, `use-toggle-project-favorite.ts`, `useNotificationsQuery.ts`, `use-estimate-row-mutations.ts:212-401`
- **Evidence:** Global defaults are sane for an app shell (`staleTime`/`gcTime` 5min,
  `refetchOnWindowFocus:false`, `retry:1`, mutations `retry:0`). Mutations consistently use
  onMutate-cancel → optimistic setQueryData → onError-rollback → onSettled-invalidate, with
  deliberate `refetchType:"none"|"active"` choices in the estimate-row mutations to avoid stampedes.
  No missing-invalidation defect found across the audited mutation hooks.
- **Impact:** None — positive evidence.
- **Recommendation:** No action.
- **Effort:** S
- **existing_plan_overlap:** none

---

## Cross-domain notes (route to owners)

- **Auth & Session Security (domain 1):** DATA-FETCH-01's residual-cache-on-signout is partly an
  auth-session concern. If domain 1 already mandates a hard cache reset / full reload on signout,
  fold DATA-FETCH-01 into it. The cleanest fix (full reload on signout, e.g. `window.location` to
  `/login` instead of a soft `redirect()`) lives in the auth lane.
- **DB Schema / Indexing (domain 3):** The homebase 4-wave fetch shapes (`workspace-repository.ts`
  :1404,:1492,:1512,:1553) and the projects-list 8+2 wave (`:867,:971`) define the `.in(...)` /
  `.eq(workspace_id,user_id)` access patterns those waves rely on — confirm composite-index
  coverage there (favorites by (workspace_id,user_id,created_at); estimates by project_id; nodes by
  estimate_id). Out of this lane.
- **Observability (domain 9):** `withPerfTraceRequest` / `traced(...)` server-timing labels exist on
  the homebase path; domain 9 should confirm they're actually surfaced (Server-Timing header / RUM)
  rather than dropped.

## Reconciliation summary

Nothing in this domain is a launch blocker. The single actionable item (DATA-FETCH-01) is a
LOW-effort, reversible defense-in-depth hardening best owned jointly with the Auth lane. Everything
else is either already covered by an implemented prior pack or is correct-as-designed and recorded
as INFO so future agents don't regress it.
