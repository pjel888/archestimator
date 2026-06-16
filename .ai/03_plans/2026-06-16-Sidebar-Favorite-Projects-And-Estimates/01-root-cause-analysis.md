# 01 — Root Cause Analysis

**Question:** Why doesn't a freshly-favorited project or estimate appear in the sidebar Favorites
section without a manual reload?

**Answer (short):** The sidebar favorites list is **server-rendered and prop-fed with zero client
reactivity**, and the two toggle flows use **two different, both-insufficient** propagation
mechanisms. There are actually **two distinct bugs**, not one.

---

## 1. The read path — how the sidebar gets its data

```
WorkshopPageShell.tsx  (server component, async)
  └─ line ~89:  const sidebarFavoriteProjects = currentUser
                  ? await listMainSidebarFavoriteProjects()   // src/lib/repositories/workspace-repository.ts ~1205
                  : [];
  └─ line ~110: <MainSidebar favoriteProjects={sidebarFavoriteProjects} ... />

MainSidebar.tsx  ("use client", line 1)
  └─ receives favoriteProjects as a READ-ONLY PROP (line ~84)
  └─ renders Favorites section from that prop (lines ~238–294)
```

Key facts:
- `listMainSidebarFavoriteProjects()` is wrapped in React `cache()` (`workspace-repository.ts:1205`) —
  **per-request** memoization only. It queries `project_favorites` then `estimate_favorites`
  directly via Supabase. **No TanStack Query. No query key. No store. No subscription.**
- `MainSidebar` is a client component but has **no mechanism to re-fetch, subscribe, or invalidate**.
  It re-renders only when its `favoriteProjects` prop changes — which only happens when
  `WorkshopPageShell` re-runs on the server.
- Limits: **8 favorite projects**, **5 favorite sheets/project**, ordered `created_at DESC`
  (`MAIN_SIDEBAR_FAVORITE_PROJECT_LIMIT = 8`, `MAIN_SIDEBAR_FAVORITE_SHEET_LIMIT = 5`).

**Conclusion:** The sidebar can only update when the server re-renders `WorkshopPageShell`. Nothing
on the client can push a new favorite into it.

---

## 2. The write path — two divergent flows

### 2a. Project favorite toggle
`src/components/workshop/projects-page-client.tsx` **line 508** (drifted from ~483; the file is dirty from
unrelated project-grouping/delete-modal work — verify before editing):

```ts
function toggleProjectFavorite(projectId, nextFavorite) {
  setFavoriteOverrides((c) => ({ ...c, [projectId]: nextFavorite }));   // optimistic LOCAL state
  startTransition(() => {
    void setProjectFavorite({ projectId, favorite: nextFavorite })       // server action
      .then(() => router.refresh())                                      // <-- attempts refresh
      .catch(() => /* revert override */)
      .finally(() => setPendingFavoriteId(null));
  });
}
```
- Server action `setProjectFavorite` (`src/lib/workshop/actions.ts:25`) writes the join table and
  calls `revalidatePath("/workshop")` + `revalidatePath("/workshop/projects")`.
- The optimistic `favoriteOverrides` updates **the project card star**, not the sidebar.
- `router.refresh()` is the *only* thing meant to update the sidebar. **It is unreliable here** — see §4.

### 2b. Estimate favorite toggle
`src/components/workshop/ProjectEstimateFavoriteButton.tsx` ~line 42:

```ts
function toggleFavorite() {
  setFavoriteOverride({ estimateId, value: nextFavorite });             // optimistic local
  patchFavorite(nextFavorite, ...);                                     // patches per-mount Zustand store
  startTransition(() => {
    void setEstimateFavorite({ estimateId, favorite: nextFavorite })    // server action
      .catch(/* rollback both */);
  });
  // NOTE: no router.refresh(), no invalidation on success
}
```
- `patchFavorite` mutates the **per-mount `ProjectEstimatesStore`** (a vanilla Zustand store scoped to
  the estimates table on that page). This updates **the estimates table row star only**.
- Server action `setEstimateFavorite` (`actions.ts:72`) writes the join table and calls
  `revalidatePath("/workshop")` + `revalidatePath("/workshop/projects/{id}/estimates")`.
- **There is no `router.refresh()` and no client-side channel to the sidebar at all.**

---

## 3. The two distinct bugs

| | Project favorite | Estimate favorite |
|---|---|---|
| Optimistic update reaches | The project card | The estimates table row |
| Sidebar update mechanism | `router.refresh()` (unreliable — §4) | **None** |
| Server cache invalidated | `/workshop`, `/workshop/projects` | `/workshop`, `/workshop/projects/{id}/estimates` |
| Result for the user | Sidebar stale until reload/nav | Sidebar stale until reload/nav |

- **Bug A (project flow):** relies entirely on `router.refresh()`, which this codebase has
  already found unreliable and deliberately stopped using elsewhere (§4).
- **Bug B (estimate flow):** has **no sidebar propagation whatsoever** — even if `router.refresh()`
  worked perfectly, the estimate toggle never calls it. This is the more clear-cut defect.

Both share the same **structural root cause**: the sidebar has no reactive client source of truth,
so every flow has to reach it the hard way (a full server re-render), and they don't.

---

## 4. The project-flow contradiction, resolved

**Apparent contradiction:** the project flow *does* call `router.refresh()`, which in theory
re-renders the server tree (including `WorkshopPageShell` → the sidebar). So why does the user
still see staleness?

Evidence gathered:
- **Route structure:** `src/app/workshop/layout.tsx` only does auth gating and returns `children`.
  Each `page.tsx` (e.g. `src/app/workshop/projects/page.tsx`) **renders its own `WorkshopPageShell`**,
  which renders the sidebar. So the sidebar *is* part of the route `router.refresh()` targets —
  it *should* update.
- **But the codebase itself distrusts `router.refresh()` for exactly this.** Two independent precedents:
  - `src/stores/project-estimates-store.ts` header comment: the per-mount store exists so
    create/duplicate/delete/inline-edit *"mutate the store synchronously … **replacing the global
    blur overlay + full `router.refresh()`**"* — they removed `router.refresh()` on purpose.
  - `src/components/workshop/LibraryPageClient.tsx`: *"Mutations patch this same cache entry …
    **instead of `router.refresh()`**"*.
- **Timing of the refresh call:** `router.refresh()` fires **inside `startTransition`, after an
  awaited server action** (`projects-page-client.tsx:~489`), concurrently with the optimistic
  `favoriteOverrides` transition. The refresh re-runs the server tree (including
  `WorkshopPageShell:89`) and *should* repaint the sidebar, but it races/coalesces with the optimistic
  transition and the per-request `cache()` memo around `listMainSidebarFavoriteProjects()`.

> **Correction (after adversarial review):** an earlier draft of this section blamed
> `next.config.ts` `experimental.staleTimes = { dynamic: 60, static: 180 }` for `router.refresh()`
> being unreliable. **That attribution is wrong** and is retracted: `staleTimes` governs *implicit*
> Router Cache reuse on `Link` / back-forward navigation (the config's own comment says so), **not**
> an explicit `router.refresh()` call, which always invalidates the Router Cache and refetches. So
> `staleTimes` is **not** why the sidebar stays stale after an explicit refresh.

**Verdict:** The honest framing is not "`router.refresh()` is broken by `staleTimes`" — it is that
the project flow leans on a **full-tree server re-render** to update one small list, a pattern this
codebase has **deliberately moved away from** (decisions D2/D10): the per-mount estimates store and
`LibraryPageClient` both replaced `router.refresh()` with targeted client-cache patching precisely
because full-refresh-for-a-mutation proved fragile and heavy. The project favorite flow is the last
holdout still using it.

> Honesty note (per planning standard): the exact Next.js-internal reason the sidebar doesn't repaint
> in-place for the user was **not** pinned with a stepped-through repro — candidates are the
> optimistic-transition race and the `cache()` memo, not `staleTimes`. This does **not** change the
> recommendation: the fix **removes the dependency on `router.refresh()` entirely** and patches a
> targeted cache instead (the same client-cache-patch pattern proven by the per-mount estimates store and
> `LibraryPageClient`), so the solution is correct regardless of which timing factor dominates. We justify
> removing the full refresh on **consistency-with-that-pattern** grounds (recorded as D1 + the D2/D10
> direction), not on an unproven Next-internals claim.
>
> **Audit-2 (2026-06-16):** This residual is now discharged rigorously in
> `11-root-cause-confirmation-and-race-safety.md`, which (a) gives repro steps for the implementation phase,
> (b) shows the fix neutralizes **both** candidate causes (the `cache()` memo is cold in a fresh server-action
> reconcile request; `router.refresh()` is deleted so there is no full-tree re-render to race), and (c) proves
> Route A's own design has no equivalent race (latest-intent-wins via `cancelQueries`). The unpinned exact
> Next internal remains an accepted residual because the fix removes the dependency on it.

---

## 5. Why the user's instinct ("we need a store") is right

A reactive client source of truth — whether a TanStack Query cache entry or a Zustand store —
solves **both** bugs at once and removes the dependency on the unreliable `router.refresh()` path:

- Toggle anywhere → patch the shared reactive source → sidebar (a subscriber) repaints instantly.
- Server action still persists + invalidates for correctness on next load (reconciliation).

The architecture decision — **which** reactive source, and how to wire it to honor the project's
documented three-layer state model — is made in `03-implementation-plan.md`.

---

## 6. User outcome / acceptance criteria

The fix is successful only when these user-visible outcomes are true:

1. Toggling a project favorite updates the project card and sidebar in the same interaction without
   `router.refresh()`.
2. Toggling an estimate favorite updates the estimates table row and, when the parent project is a
   visible sidebar favorite project within the top-8 project cap, the nested sidebar sheet in the
   same interaction.
3. Toggling an estimate favorite under a non-favorited project updates the row star only; the sidebar
   remains unchanged and reload matches.
4. A server-action failure rolls back every optimistic surface from one error signal and exposes a
   quiet accessible error.
5. Navigation, reload, or a scoped cache mismatch cannot show another user or workspace's favorite
   names or hrefs.
