# 06 — Decision Register

Future agents should treat these as the current plan contract unless Philip explicitly changes them.
Decisions marked **(revised 2026-06-16 audit-2)** were changed by the second adversarial audit pass;
the prior wording and why it changed are noted inline so the audit trail stays honest.

---

## D1 — Reactive store

**Decision:** Use TanStack Query for sidebar favorites.

**Rejected:** Dedicated Zustand store. It duplicates server-state cache semantics and conflicts with
`.ai/06_specs/state-and-supabase-foundation.md`.

## D2 — Query scope and scope sourcing **(revised 2026-06-16 audit-2)**

**Decision:** Key sidebar favorites as `["favorites", "sidebar", workspaceId, userId]`, built by a single
shared `buildSidebarFavoritesScopeKey({ workspaceId, userId })` helper used identically on the server
(to seed `initialData`) and on the client (in `MainSidebar` and both toggle hooks). If server and client
build the key differently, optimistic patches land on a different cache entry than the sidebar reads and
the feature silently no-ops.

**Scope sourcing (new — closes audit-2 blocker):** `getCurrentUserContext()` returns `userId` but **not**
`workspaceId` (verified: `src/lib/auth/session.ts`). `WorkshopPageShell` must obtain `workspace.id` via
`ensureDefaultWorkspace()` (the same call `listMainSidebarFavoriteProjects()` already makes internally) and
pass `{ workspaceId, userId }` as explicit props to `MainSidebar`; the toggle hooks read the same scope.
See `13-security-and-cache-contract.md` for eviction on scope change and logout.

**Why:** Favorites are per-user and workspace-scoped. The app-level `QueryClientProvider` can survive route
changes and browser account changes, so unscoped keys are unsafe.

## D3 — Client loader is a Server Action, not a Route Handler **(revised 2026-06-16 audit-2)**

**Decision:** Add a `"use server"` async function (e.g. `fetchSidebarFavoriteProjects()` in
`src/lib/favorites/sidebar-favorites-actions.ts`) that calls `listMainSidebarFavoriteProjects()` and return
it directly. Use it as the `queryFn` of `useSidebarFavoritesQuery`. `initialData` alone is not enough — a
real `queryFn` is required so `invalidateQueries` can reconcile with server truth.

**Rejected (was the prior decision):** A dedicated Route Handler at `src/app/workshop/favorites/sidebar/route.ts`
plus a separate client `fetch()` fetcher. Rejected because **every** existing client-callable query in this
codebase uses a `"use server"` function as its `queryFn` (`fetchProjectCollaborationSummary`,
`fetchEstimateTree`, `loadProjectComponentRowsLibrary`) — none uses a route handler, and all route handlers
live under `src/app/api/`. The route-handler path also added an avoidable HTTP surface that, as originally
specified, lacked an auth guard, `Cache-Control: no-store`, and `export const dynamic = "force-dynamic"`, and
mis-handled the `redirect()`-on-unauth case (it returns HTML the client fetcher would mis-parse). The Server
Action pattern is POST-only (not CDN-cacheable), authenticates server-side via the existing
`requireCurrentUserContext()` call chain, and matches the house convention — dissolving those gaps. See `13`.

**Why:** Match the codebase's own established server-state pattern; minimize new surface; remove the
caching/auth foot-guns the route handler introduced.

## D4 — Freshness: initialData + staleTime 0, no bespoke reconcile **(revised 2026-06-16 audit-2)**

**Decision:** Seed the query with SSR `initialData` (instant paint) and set **`staleTime: 0` on the favorites
query specifically** (overriding the global 5-minute default in `src/app/providers.tsx`). With `staleTime: 0`
plus the always-mounted `MainSidebar` observer, `onSettled` invalidation refetches after every mutation, and
each per-route remount of `WorkshopPageShell` re-seeds + background-refetches to server truth. **Do not add a
bespoke reconcile-on-mount `useEffect`.**

**Rejected (was the prior decision):** "Reconcile fresh SSR `initialData` into the scoped cache on mount" via
a custom effect. Verified against `@tanstack/react-query@5.100.14`: with `initialData` and no
`initialDataUpdatedAt`, the entry is stamped `dataUpdatedAt = Date.now()` and treated as **fresh** under the
global 5-min `staleTime`, so the queryFn would **not** run on mount and a pre-existing fresh entry would
**ignore** newer SSR `initialData` — i.e. the bespoke reconcile silently would not fire and cross-route
navigation would show stale favorites for up to 5 minutes. Setting `staleTime: 0` makes the library-native
mechanics do the reconciliation correctly with no custom effect. (If a future need arises to keep a higher
`staleTime`, pass a server `initialDataUpdatedAt` so staleness is computed correctly — documented in `13`.)

**Rejected:** Cache-wins-forever. Simpler but preserves stale route data longer than today's server-prop behavior.

## D5 — Estimate under non-favorited project: behavior + required legibility cue **(revised 2026-06-16 audit-2)**

**Decision (behavior):** Mirror server behavior for MVP. Favoriting the estimate updates the row star only;
the sidebar updates only when the parent project is a visible sidebar favorite project within the top-8
project cap.

**Decision (legibility — promoted from optional to REQUIRED):** Because this is the **common** case (the
server query only returns sheets under already-favorited projects — verified `workspace-repository.ts:1215`),
a silent no-op reads as "favorite is broken." The polite live-status cue
`Estimate favorited. Favorite the project to pin it in the sidebar.` (defined in `08`) is **mandatory** for
the non-favorited / hidden-parent case, not optional. The no-op is acceptable **only because** the cue makes
it legible.

**Rejected:** Auto-promote the parent project when a sheet is favorited. That is a larger product change
(its own caps/ordering questions) and stays deferred (`03` §7). The cheaper middle path (an inline
"Pin project too?" affordance at the toggle site) is noted as a future option, not MVP.

## D6 — Shared/non-owned favorites

**Decision:** Preserve the 2026-06-03 access decision suppressing non-owned shared favorites until a
dedicated shared-favorite model and authorization design exists.

## D7 — Next 16 cache backstop **(reinforced 2026-06-16 audit-2)**

**Decision:** Keep existing `revalidatePath` for MVP unless implementation creates a valid Next 16
taggable cache boundary.

**Rejected:** `revalidateTag("favorites")` (one-argument form). Verified against installed `next@16.2.6`:
the one-arg form is deprecated **and** the TypeScript signature now **requires** a second argument
(`revalidateTag(tag, "max")`), so a one-arg call is a compile error, not just a warning. If tags are ever
adopted, attach them to real cached data and use `revalidateTag(tag, "max")`. Note: `updateTag` **throws if
called outside a Server Action** (it errors inside Route Handlers), so any tag invalidation reachable from
non-action code must use `revalidateTag(tag, "max")`.

## D8 — Homebase scope **(corrected 2026-06-16 audit-2)**

**Decision:** Route the `WorkshopHomebaseClient.tsx` removed-project favorite action
(`removeRemovedProjectFavorite`, verified at `WorkshopHomebaseClient.tsx:73-84`) through the shared
`useToggleProjectFavorite` hook so it patches the sidebar cache like every other project toggle.

**Correction:** The action currently calls `setProjectFavorite({ favorite: false })` then
**`router.replace("/workshop", { scroll: false })`** — a navigation, **not** `router.refresh()` as earlier
docs implied. Preserve the post-success navigation (it dismisses the removed-project banner and returns to
the workshop home) as a separate concern from the cache update; the shared hook handles the optimistic
sidebar patch + rollback, the component keeps its `router.replace`. The earlier "only scope it out if a
fresh source check proves the action no longer exists" hedge is dropped — the action exists and is live.

## D9 — UX state line **(expanded 2026-06-16 audit-2)**

**Decision:** Empty, loading/hydration (skeleton), overflow, pending, error, rollback, **focus management on
item removal**, **live-region architecture (polite advisory vs assertive error)**, **optimistic insert
position + animation**, **unfavorite-the-active-route**, collapsed, and mobile/tablet boundaries are defined
in the expanded `08` and are not left to implementation taste.

## D10 — Sequencing and cross-plan convention **(expanded 2026-06-16 audit-2)**

**Decision:** Sidebar Favorites lands before Project Groups extends the same project/sidebar surfaces. This
is corroborated by the Project Groups package's own concurrency doc (`.ai/03_plans/2026-06-16-Project-Groups-Implementation/06-prior-art-and-concurrency-watch.md` §C1), which independently sequences Groups after the
in-flight branches.

**Convention contract (new):** Landing Favorites first establishes the **reactive-cache** mutation pattern.
Project Groups currently plans to "mirror favorites" while describing the **old** `router.refresh()` pattern
this package is retiring. Groups must adopt the post-fix query-cache hook for shared sidebar surfaces (or
consciously diverge for its SSR projects-list grouping), but must stop cloning the convention being deleted.
Full file-ownership matrix and the uncommitted-baseline reality are in `12-cross-plan-coordination.md`.

## D11 — Optimistic timestamp synthesis **(new 2026-06-16 audit-2)**

**Decision:** Sidebar DTO `favoriteCreatedAt` is non-null (`string`) at shaping time. On an optimistic
insert (the prior favorite state is `null`), the toggle hook synthesizes `favoriteCreatedAt =
new Date().toISOString()` so the new favorite sorts to the **top** under `favoriteCreatedAt DESC`. This
mirrors the existing precedent `ProjectEstimateFavoriteButton.tsx:50`
(`patchFavorite(next, next ? new Date().toISOString() : null)`). `onSettled` reconciliation replaces the
synthetic timestamp with the server value. Mutation **inputs** type `favoriteCreatedAt: string | null` (the
prior-state value); the hook is responsible for the synthesis, not the caller.

**Why:** Without this, a just-favorited item has a `null` timestamp and either fails the non-null DTO type or
sorts to the bottom instead of appearing instantly at the top — a concrete "looks done, fails on demo" gap.

## D12 — Cache eviction on scope change AND logout **(new 2026-06-16 audit-2)**

**Decision:** Old scoped favorites must be **explicitly** removed via
`queryClient.removeQueries({ queryKey: favoritesQueryKeys.sidebar(previousScope) })` on workspace/user scope
change (a key change alone does not evict — the old entry lingers for `gcTime`, 5 min), **and** on logout the
`signOut` flow (or the `SIGNED_OUT` handler in `RealtimeAuthBridge`) must call
`queryClient.removeQueries({ queryKey: favoritesQueryKeys.all() })`. Verified: `signOut`
(`src/lib/auth/actions.ts`) and `RealtimeAuthBridge` do **not** currently clear the QueryClient, so per-user
favorite names/hrefs would otherwise survive a sign-out for up to 5 min in a shared browser. Full contract in
`13-security-and-cache-contract.md`.

## D13 — Two mutation hooks sharing a helper, not one unified module **(new 2026-06-16 audit-2)**

**Decision:** Implement `useToggleProjectFavorite` and `useToggleEstimateFavorite` as **separate** hooks
(parallel to how `useEstimateAreaTreeQuery` and `useProjectCollaborationQuery` are separate). Extract only the
genuinely shared lifecycle — the scoped-cache `onMutate` snapshot/patch, the single-snapshot `onError`
rollback, and the `onSettled` invalidate — into a small internal helper (`patchSidebarFavoritesCache` /
`rollbackSidebarFavoritesCache`). 

**Rejected (was the prior decision):** A single `use-toggle-favorite.ts` module covering both flows. The two
inputs are materially different (`ToggleProjectFavoriteInput` vs `ToggleEstimateFavoriteInput`), the optimistic
targets differ (project card override vs per-mount estimates Zustand store), and the estimate flow must also
read `project.isSidebarFavorite`. Pre-unifying before the two implementations exist is speculative; merge only
if they genuinely converge after implementation.

## D14 — Server-action hygiene: scope which fixes ride along **(new 2026-06-16 audit-2)**

**Decision:** While touching `src/lib/workshop/actions.ts`, fold in (kept in scope):
- **Runtime boolean validation** with an exact shape: `if (typeof favorite !== "boolean") throw new Error("Invalid input.")` in both server actions (a `"use server"` action is POST-invocable, so the TS type is not a runtime guarantee).
- **`workspace_id` on the project-favorite delete filter** — framed as **authorization** (the delete currently acts on a broader scope than the caller's workspace authorizes), not merely consistency. Verified: project delete filters only `user_id` + `project_id` (`actions.ts:32-36`); estimate delete already includes `workspace_id` (`actions.ts:112-117`).

**Deferred (out of this task's scope unless a test forces it):** Aligning the estimate upsert's
`ignoreDuplicates: true` (`actions.ts:107`) with the project upsert. This is a behavior change to a
production write path unrelated to sidebar reactivity; defer to a separate follow-up unless the Phase-4 test
proves the asymmetry is incorrect, in which case it is escalated to a blocker and called out explicitly.
