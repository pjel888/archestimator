# 04 — Code Review & Audit Findings

Findings beyond the core reactivity bug. Severity: **P0** drives the failure, **P1** blocks a safe
implementation, **P2** should be folded in while touching the same code, and **P3** is follow-up
polish.

> **Audit-2 (2026-06-16):** A second adversarial pass (7 personas + 2 code-verification agents) added the
> P1 findings marked **(audit-2)**. They were verified against real source on `codex/fix-project-delete`.

---

## MVP blockers

### P0 — Sidebar has no reactive client source of truth
- **Where:** `MainSidebar.tsx` is prop-fed from `WorkshopPageShell.tsx` and
  `listMainSidebarFavoriteProjects()`.
- **Issue:** The sidebar can only change when the server tree provides a new prop.
- **Fix:** Route A in `03`.

### P0 — Estimate favorite toggle has zero sidebar propagation
- **Where:** `ProjectEstimateFavoriteButton.tsx` patches only the estimates table store.
- **Issue:** Even a perfect project `router.refresh()` path would not fix estimate toggles.
- **Fix:** Phase 2 in `03`.

### P1 — `workspaceId` is not available where the scope key needs it **(audit-2)**
- **Where:** `WorkshopPageShell.tsx`; the scope key `["favorites","sidebar",workspaceId,userId]` (D2).
- **Issue:** `getCurrentUserContext()` returns `userId` but **not** `workspaceId` (`src/lib/auth/session.ts`).
  No client surface currently holds `workspaceId` either. The headline correctness fix assumes both are in
  hand; if server and client build the key from different values, optimistic patches miss the entry the
  sidebar reads and the feature silently no-ops.
- **Fix:** Source `workspace.id` via `ensureDefaultWorkspace()` in the shell; thread `{ workspaceId, userId }`
  as explicit props; one shared `favoritesQueryKeys.sidebar(scope)` builder (D2, `03` §2).

### P1 — Optimistic `favoriteCreatedAt` is null but the DTO/sort require non-null **(audit-2)**
- **Where:** sidebar DTOs vs mutation inputs; edge cases #1/#2; `08` sort rule.
- **Issue:** A just-favorited item has no server timestamp. The DTO types `favoriteCreatedAt` non-null and the
  list sorts `DESC`; a `null` optimistic value sorts to the bottom or fails the type. The codebase already
  solves this (`ProjectEstimateFavoriteButton.tsx:50` synthesizes `new Date().toISOString()`) — the prior plan
  ignored its own precedent.
- **Fix:** D11 — synthesize the timestamp on optimistic insert; reconcile on `onSettled`.

### P1 — `staleTime: 5min` silently defeats reconcile-on-mount and invalidation **(audit-2)**
- **Where:** `useSidebarFavoritesQuery` under the global `providers.tsx` defaults.
- **Issue:** Verified against `query-core@5.100.14`: `initialData` without `initialDataUpdatedAt` is stamped
  fresh (`dataUpdatedAt = Date.now()`), so under the global 5-min `staleTime` the queryFn does **not** run on
  mount and a pre-existing fresh entry ignores newer SSR `initialData`. The prior "reconcile-on-mount" would
  silently not fire; cross-route navigation would show stale favorites for up to 5 min.
- **Fix:** D4 — set `staleTime: 0` on the favorites query; drop the bespoke reconcile effect.

### P1 — Route-handler loader deviated from convention and had auth/cache foot-guns **(audit-2)**
- **Where:** the prior `src/app/workshop/favorites/sidebar/route.ts` + client fetcher.
- **Issue:** Every existing client-callable query uses a `"use server"` function as its `queryFn`; none uses a
  route handler. As specified the handler had no auth guard, no `Cache-Control: no-store`, no
  `force-dynamic`, and its `redirect()`-on-unauth returned HTML the `response.ok`-only fetcher would mis-parse.
- **Fix:** D3 — replace with a `"use server"` loader; see `13` for the full security posture.

### P1 — Logout does not clear the favorites cache **(audit-2)**
- **Where:** `signOut` (`src/lib/auth/actions.ts`), `RealtimeAuthBridge`.
- **Issue:** Neither clears the QueryClient; per-user favorite names/hrefs survive logout for `gcTime` (5 min)
  in a shared browser.
- **Fix:** D12 / `13` C5 — `removeQueries({ queryKey: favoritesQueryKeys.all() })` on logout.

### P1 — Unscoped query key would leak user/workspace favorites
- **Where:** first draft proposed `["favorites","sidebar"]`.
- **Issue:** `QueryClientProvider` is app-root state. A shared session or workspace switch could retain old
  favorite names/hrefs.
- **Fix:** Scoped key + explicit scope-change eviction (`removeQueries`, not key-change-alone) + negative
  cache/prefetch tests (D2, D12, `13` C4).

### P1 — Missing client refetch contract
- **Where:** first draft invalidated a query but did not define a `queryFn`.
- **Issue:** `useQuery` cannot refetch server-only repository code by implication.
- **Fix:** The `"use server"` loader as `queryFn` (D3).

### P1 — Next cache tag plan was mechanically invalid
- **Where:** first draft said `revalidateTag("favorites")`.
- **Issue:** Verified `next@16.2.6`: the one-arg form is deprecated **and** the type signature now requires a
  second argument, so a one-arg call is a compile error. `updateTag` throws outside Server Actions.
- **Fix:** Keep `revalidatePath` for MVP; if tags are adopted, `revalidateTag(tag, "max")` on real cached data
  (D7).

### P1 — Favorite timestamps are missing from sidebar DTOs
- **Where:** `MainSidebarFavoriteProject` / `MainSidebarFavoriteEstimateSheet`.
- **Issue:** The optimistic helper cannot sort by recency without `favoriteCreatedAt`; the reader selects
  `created_at` but drops it during shaping (`workspace-repository.ts:1259-1282`).
- **Fix:** Add timestamps to DTOs **and** both shaping sites (D11).

---

## Same-touch fold-ins

### P2 — Project flow depends on `router.refresh()`
- **Where:** `projects-page-client.tsx:508` (drifted from 483 — file is dirty from unrelated grouping work).
- **Evidence:** The repo's newer mutation patterns use targeted client cache/store patches instead of full
  route refresh. This is a pattern/UX reason, not a `staleTimes` causality claim.
- **Fix:** Phase 3 removes the dependency.

### P2 — Project delete omits `workspace_id` (authorization, not just hygiene)
- **Where:** `setProjectFavorite` delete path (`actions.ts:32-36`).
- **Issue:** Delete filters only `user_id` + `project_id`; the unique constraint has no workspace dimension, so
  the delete can act beyond the caller's current workspace scope. (Estimate delete already includes it.)
- **Fix:** Add `.eq("workspace_id", ...)` (D14, `13` C2).

### P2 — Runtime input validation is incomplete
- **Where:** favorite server actions.
- **Fix:** `if (typeof favorite !== "boolean") throw new Error("Invalid input.")`; generic client-safe errors
  (D14, `13` C2).

### P2 — Two/three optimistic mechanisms can desync
- **Where:** project card local override, estimate table Zustand patch, new sidebar query cache.
- **Fix:** Drive all optimistic state from one mutation lifecycle and roll back from one snapshot (`03` §2; race
  proof in `11`).

### P2 — Homebase removed-project action mischaracterized **(audit-2)**
- **Where:** `WorkshopHomebaseClient.tsx:73-84`.
- **Issue:** It uses `router.replace("/workshop", { scroll: false })` on success, **not** `router.refresh()`.
  Earlier docs implied a refresh path.
- **Fix:** D8 — route through the shared project mutation; preserve the `router.replace` navigation.

### Deferred — `ignoreDuplicates: true` on estimate upsert is asymmetric
- **Where:** `src/lib/workshop/actions.ts:107`.
- **Issue:** It is a behavior change to a production write path unrelated to sidebar reactivity.
- **Fix:** **Deferred** (D14) — align only if a Phase-4 test proves the asymmetry incorrect, then escalate.

---

## Deferred product/design follow-ups

### P3 — Full overflow management route
- **Issue:** The MVP helper trims to 8/5; a "Show all favorites" route is not required. The overflow
  "go to Projects" line (`08`) is its future hook.
- **Follow-up:** Add a full favorites-management surface if users need more than sidebar pins.

### P3 — Mobile favorites drawer
- **Issue:** Current sidebar is desktop-only below `lg`.
- **Follow-up:** Design a mobile drawer only if mobile users need sidebar favorite navigation.

### P3 — Motion polish
- **Issue:** Favorite state uses subtle transitions (insert/remove fade in `08`).
- **Follow-up:** Keep motion quiet and `prefers-reduced-motion` safe.

---

## Suggested implementation split

- **Must ship in this task:** P0s and P1s.
- **Fold in if touched:** P2s (except the deferred `ignoreDuplicates` alignment).
- **Do not block MVP:** P3s.
