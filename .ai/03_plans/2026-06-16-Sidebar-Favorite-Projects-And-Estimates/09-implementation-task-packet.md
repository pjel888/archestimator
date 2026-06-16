# 09 — Implementation Task Packet

File-level coding handoff. Phase labels map to `03` §4. Decisions referenced as D#; security/cache contract in
`13`; cross-plan/working-tree reality in `12`.

## Preflight (Phase 0)

1. Run `git status --short --branch` and `git diff --stat HEAD`.
2. Read `12-cross-plan-coordination.md`. **The read/render half of this feature is already built uncommitted**
   (`workspace-repository.ts`, `sidebar-types.ts`, `MainSidebar.tsx`, `WorkshopPageShell.tsx`) — build **on**
   it, do not re-create it.
3. Re-read live versions of every file in `03` §3; re-confirm line numbers (they have drifted, e.g.
   `toggleProjectFavorite` is at **508**).
4. Check whether Project Groups or delete-modal work has changed the same project/sidebar files; if so, rebase
   the favorites edits onto them. Decide here whether a temporary `REACTIVE_SIDEBAR_FAVORITES_ENABLED` flag is
   warranted (only if concurrent work makes a one-commit rollout risky).
5. Do not revert unrelated dirty files.

## Ordered tasks

1. **[Phase 1]** Add scoped query keys + shared `buildSidebarFavoritesScopeKey` (D2) and pure helper tests.
2. **[Phase 1]** Add non-null `favoriteCreatedAt` to sidebar DTOs **and** to the two shaping sites in
   `listMainSidebarFavoriteProjects()` (`:1259-1282`) (D11).
3. **[Phase 1]** Add the `"use server"` loader `fetchSidebarFavoriteProjects()` and use it directly as the
   `queryFn` (D3). **Do not** create a route handler.
4. **[Phase 1]** Add `useSidebarFavoritesQuery` with **`staleTime: 0`** (D4) and explicit scope-change
   `removeQueries` (D12, `13` C4); **no** bespoke reconcile-on-mount effect.
5. **[Phase 1]** Source `workspace.id` via `ensureDefaultWorkspace()` in `WorkshopPageShell`; pass
   `initialData` + `{ workspaceId, userId }` to `MainSidebar` (D2).
6. **[Phase 1]** Update `MainSidebar` to render query data and the states from `08` — including the **net-new**
   empty hint, loading/skeleton, focus management, and live regions (none exist today).
7. **[Phase 2]** Add `useToggleEstimateFavorite` (shared internal helper, D13); drive the table-row Zustand
   patch from the same lifecycle; insert/remove the nested sheet only when the parent is a visible sidebar
   favorite within the top-8 cap; otherwise fire the **required** legibility cue (D5).
8. **[Phase 3]** Add `useToggleProjectFavorite` (shared helper); replace the `projects-page-client.tsx`
   `router.refresh()` path.
9. **[Phase 3]** Route `WorkshopHomebaseClient.tsx`'s `removeRemovedProjectFavorite` through the shared project
   hook while **preserving** its `router.replace("/workshop", { scroll: false })` navigation (D8).
10. **[Phase 4]** Harden server actions: boolean validation (exact shape), `workspace_id` on the project-favorite
    delete (authz). **Defer** `ignoreDuplicates` alignment unless a test forces it (D14).
11. **[Phase 5]** Wire logout cache clear (`favoritesQueryKeys.all()`) (D12, `13` C5); implement the remaining
    `08` UX states; run the `11` repro/rapid-toggle scenarios and the `10` QA matrix; record evidence.
12. **[Phase 5]** **Update** (not create) `tests/vitest/main-sidebar-favorites.test.tsx`: add `favoriteCreatedAt`
    to fixtures and wrap in a `QueryClientProvider`. Add the three new tests named in `07`. Run focused
    validation; record evidence.

## Do not do

- Do not add a route handler for the loader (use a Server Action — D3).
- Do not add a global unscoped favorites store.
- Do not add a bespoke reconcile-on-mount effect (use `staleTime: 0` — D4).
- Do not add one-arg `revalidateTag("favorites")` (compile error in Next 16 — D7).
- Do not auto-promote parent projects from sheet favorites.
- Do not create a mobile drawer or full favorites route.
- Do not modify schema/RLS for this task.
- Do not align the estimate `ignoreDuplicates` upsert unless a test forces it (D14).
- Do not revert unrelated dirty files (`12`).

## Completion evidence

Implementation handoff must name:

- files changed (and that the uncommitted read baseline was built on, not re-created);
- tests/commands run with exit codes;
- whether authenticated browser proof / the `11` repro ran, and their results;
- whether logout cache-clear and scope-change eviction were verified;
- any residual validation gap;
- confirmation that unrelated dirty files were preserved.
