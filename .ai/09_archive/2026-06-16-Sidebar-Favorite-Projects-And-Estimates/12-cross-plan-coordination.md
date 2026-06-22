# 12 — Cross-Plan Coordination

**Date:** 2026-06-16
**Branch context:** `codex/fix-project-delete` (working tree is dirty; graph built on `main`).
**Status:** Active coordination contract. Treat as binding for any agent editing the five HIGH-collision files until Sidebar Favorites lands.

> This document is the **single shared sequencing + file-ownership contract** between the
> Sidebar Favorites package and the concurrent plans touching the same files. Where this doc
> and an individual plan disagree on ownership or order, **this doc wins** — that is the whole
> point of having one reconciliation surface instead of each plan asserting its own.

---

## 1. Purpose

Philip is running **multiple coding agents** in this repo at once. Several in-flight plans edit
the same handful of project/sidebar files, and each plan currently states its own sequencing in
isolation. This document reconciles them so agents do not clobber each other:

- One **working-tree truth table** (§2) so no agent trusts a stale "nothing shipped yet" framing.
- One **shared-file ownership matrix** (§3) for the five HIGH-collision files, cross-linked to
  Project Groups' own `06 §E` vigilance map so the two packages cite the same boundaries.
- One **sequencing contract** (§4): Favorites lands first, and — critically — establishes the
  mutation convention the other plans must adopt.
- A concrete **concurrency protocol for agents** (§5).
- The **open questions** (§6) the two packages must jointly resolve before either commits.

The two packages this reconciles:
- **This package** — `.ai/03_plans/2026-06-16-Sidebar-Favorite-Projects-And-Estimates/`
- **Project Groups** — `.ai/03_plans/2026-06-16-Project-Groups-Implementation/` (its `README.md`,
  `06-prior-art-and-concurrency-watch.md` §C1 + §E, and `04-state-data-flow-analysis.md`).

---

## 2. Working-tree reality (as of this writing)

**Correction to this package's own framing.** `00-README.md` line 4 says *"no code shipped from
this package — it is the plan that authorizes the code."* That is **half true and now misleading.**
The **READ / RENDER half of Favorites is already built and sitting UNCOMMITTED** on
`codex/fix-project-delete` (it is **not** on `main`). The reactive half this package specifies must
be built **on top of that uncommitted baseline**, not from a clean slate. Any agent that resets the
working tree, or branches fresh from `main`, will silently delete the read/render baseline.

What is **already built but uncommitted** (the Favorites read/render baseline):

| File | Change (verified) | Belongs to | Committed? |
|------|-------------------|------------|------------|
| `src/lib/repositories/workspace-repository.ts` | +~85 lines: the whole `listMainSidebarFavoriteProjects` (`cache()`-wrapped, confirmed at L1205) + the `MAIN_SIDEBAR_FAVORITE_PROJECT_LIMIT = 8` (L126) / `MAIN_SIDEBAR_FAVORITE_SHEET_LIMIT = 5` (L127) constants | **Favorites** (read half) | No — uncommitted |
| `src/components/sidebar/sidebar-types.ts` | +~16 lines: `MainSidebarFavoriteProject` (L28) + `MainSidebarFavoriteEstimateSheet` (L20) types. **`favoriteCreatedAt` is NOT present** (verified) — the reactive plan must add it (`03` §2, `00` hardening item 7) | **Favorites** (read half) | No — uncommitted |
| `src/components/sidebar/MainSidebar.tsx` | +~116 lines: the entire Favorites render section + `getFavoriteLinkClassName` + `createFavoritePrefetchRoutes` | **Favorites** (read half) | No — uncommitted |
| `src/components/workshop/WorkshopPageShell.tsx` | +~4 lines: `listMainSidebarFavoriteProjects()` awaited + passed as `favoriteProjects` prop to `<MainSidebar>` | **Favorites** (read half) | No — uncommitted |
| `tests/vitest/main-sidebar-favorites.test.tsx` | New file (untracked) | **Favorites** (read half) | No — untracked |

What is **NOT yet built** (the reactive half — this package's actual remaining work):

- Scoped TanStack Query cache for the sidebar list (`["favorites","sidebar",workspaceId,userId]`).
- The client-callable loader / route handler (`/workshop/favorites/sidebar`).
- `useSidebarFavoritesQuery` + reconcile-on-mount.
- `useToggleFavorite` (shared project/estimate mutation lifecycle with optimistic cache patch).
- Adding `favoriteCreatedAt` to the sidebar DTOs.
- **Removing `router.refresh()` as the sidebar propagation mechanism** (currently at
  `projects-page-client.tsx` L514 and L657).

Other dirty files in the same worktree from **UNRELATED** in-flight work:

| File | Change | Belongs to | Touches favorite wiring? |
|------|--------|------------|--------------------------|
| `src/components/workshop/projects-page-client.tsx` | +~89 lines: project grouping by `client_name` + delete-modal UX + card polish. Drifted `toggleProjectFavorite` from L483 → **L508** (verified) | C2 delete-modal UX + card polish (unrelated) | **No** — does not change favorite wiring; only moves it |
| `src/components/workshop/LiveProjectCard.tsx` | +~49 lines: card layout polish, date band | C3 card favorite links / polish | **No** — no favorite-wiring change |
| `src/components/workshop/ProjectEstimatesClient.tsx` | +~? lines: adds a "Favorites" filter + sort scaffolding | unrelated (estimates page polish) | **Not yet wired** — scaffolding only |
| `src/components/workshop/BulkDestructivePreviewModal.tsx` | +~92 lines: delete-modal copy rewrite | C2 delete-modal UX | No |
| `src/components/workshop/ProjectDetailsModal.tsx`, `ProjectMiniSidebar.tsx`, `ProjectDashboardClient.tsx`, `SidebarHeader.tsx` | Misc polish | unrelated | No |
| `tests/vitest/projects-page-*.test.tsx`, `workshop-reset.test.tsx`, `bulk-destructive-preview-modal.test.tsx` | Test churn for C2 / card polish | C2 / unrelated | No |

**Not dirty (safe to assume baseline):** `ProjectEstimatesTable.tsx` and `WorkshopHomebaseClient.tsx`
are **NOT** modified in this worktree — the reactive plan's edits to them (`03` §3) start from clean.

---

## 3. Shared-file ownership matrix

Five files are HIGH-collision between Favorites and Project Groups. Project Groups independently
flags the same five in its `06 §E` vigilance map (rows for `workspace-repository.ts`,
`projects-page-client.tsx`, `MainSidebar.tsx` + `sidebar-types.ts`, `WorkshopPageShell.tsx`); the
ownership below is the reconciled version. **Merge order is always: Favorites region first, then
Project Groups appends.**

| File | Favorites owns / changes | Project Groups owns / changes | Merge order | Project Groups §E cross-link |
|------|--------------------------|-------------------------------|-------------|------------------------------|
| `src/lib/repositories/workspace-repository.ts` | The `listMainSidebarFavoriteProjects` reader + the two `*_LIMIT` consts (already uncommitted); reactive plan returns `favoriteCreatedAt` from the join rows | Adds a `project_group_memberships` + `project_groups` fetch to the `listCurrentWorkspaceProjects` `Promise.all`; a new `cache()` group reader **mirroring** the favorites reader convention | **Favorites first.** Groups appends a reader + extends the `Promise.all` array — does not restructure the return | §E row 1: *"Land C1 first. Append a new reader + extend the `Promise.all` array (don't restructure the return). Mirror the `cache()` + `*_LIMIT` + `.in()` batch convention C1 introduced."* |
| `src/components/sidebar/sidebar-types.ts` | The `MainSidebarFavoriteProject` / `MainSidebarFavoriteEstimateSheet` types; reactive plan **adds `favoriteCreatedAt`** to both levels | Only if groups get a sidebar surface (a fast-follow, deferred); then a `MainSidebarProject`-shaped group type **mirroring** favorites | **Favorites first.** Groups extends `MainSidebarProps` additively | §E row 7 (MainSidebar + sidebar-types): *"Defer any sidebar-groups surface until C1 lands. Then extend `MainSidebarProps` additively, mirroring `MainSidebarFavoriteProject`."* |
| `src/components/sidebar/MainSidebar.tsx` | The entire Favorites render section + prefetch helpers; reactive plan swaps the static prop for live query data + UX states | Only a deferred sidebar-groups section (fast-follow) | **Favorites first.** | §E row 7: ownership = C1; **HIGH if sidebar in scope, NONE if not** |
| `src/components/workshop/WorkshopPageShell.tsx` | The `listMainSidebarFavoriteProjects()` await + prop pass; reactive plan also passes `initialData` + `{ workspaceId, userId }` | Only if the shell must load group data for a sidebar surface (deferred) | **Favorites first.** Groups adds a second awaited reader next to C1's | §E row 8: *"If needed, add a second awaited reader next to C1's; don't reorder the existing `Promise.all`."* |
| `src/components/workshop/projects-page-client.tsx` | The `toggleProjectFavorite` handler (now at **L508**); reactive plan **replaces** the `router.refresh()` path (L514, L657) with the shared mutation hook | New `organizeBy` state + toolbar `DropdownSelect` (~L651-691 region) + generalized grouping render (~L724-753) + group-membership optimistic handlers | **Favorites first** for the favorite-handler region; C2 (delete strings) and Groups (toolbar/grouping) edit **different regions** | §E row 2: *"Different regions ... Mergeable but re-run all `projects-page-*` tests after merge."* |

Note on `projects-page-client.tsx`: three plans share this file (Favorites favorite-handler region,
C2 delete-strings region ~L443-445, Project Groups toolbar/grouping regions). They are non-overlapping
regions, but **every merge into this file must re-run the full `projects-page-*` suite**, per §E.

---

## 4. Sequencing contract

**Favorites lands FIRST.** This is independently corroborated by Project Groups:

- Project Groups `06 §C1`: *"Let the sidebar-favorites work **land first**. It establishes the
  `MainSidebarProps` shape and the `cache()`-reader convention; Project Groups should append, not
  re-architect."*
- Project Groups `06 §E` "Recommended global sequencing": *"**C1 (sidebar favorites)** lands →
  freezes `MainSidebarProps` + `workspace-repository` reader convention."*
- Project Groups `README` ⚠️ section lists C1 as the first of three in-flight branches to land
  before Groups starts.
- This package's own `06 D10`: *"Sidebar Favorites should land before Project Groups extends the
  same project/sidebar surfaces."*

### Why it matters technically — and the convention-drift conflict to resolve

Favorites does more than freeze file shapes: **it retires the `router.refresh()` mutation convention
in favor of a TanStack Query reactive cache.** This package's whole thesis (`00` Recommended
direction, `03` Route A, `06 D1`) is that the sidebar favorites list is *server state*, so toggles
must patch one scoped query cache (`setQueryData` optimistic + invalidate-on-settle) — **and
`router.refresh()` is explicitly removed as the propagation mechanism** (`03` goal line 5, Phase 3).

**The conflict:** Project Groups currently plans to **mirror the favorites mutation pattern**, but it
is mirroring the **OLD** pattern, not the post-fix one. Two places in the Groups package bind to the
pre-fix convention:

- `06 §B1`: *"Project Groups membership mutations should use this identical override-map +
  `startTransition` + `router.refresh()` + catch-rollback shape"* — i.e. it copies the **current
  uncommitted** favorites code, including `router.refresh()`.
- `04 §D-1` goes further and makes it a **decision**: *"Keep Project Groups on the SSR + server-action
  + `router.refresh()` model. Do NOT introduce TanStack Query for the projects list,"* with `04 §6.2
  D-8` / `D-7` and the README spine (item 6) building "clear-after-refresh" override semantics on top
  of `router.refresh()`.

So if Groups copies the favorites code **as it exists in the working tree today**, it propagates the
**wrong convention** — the very `router.refresh()` path this package is deleting from
`projects-page-client.tsx`. After Favorites lands, the favorites flow will *no longer be* an
override-map + `router.refresh()` template; it will be a shared `useToggleFavorite` query-cache hook.

> **⚠️ ACTION ITEM FOR THE PROJECT GROUPS PLAN (convention drift):**
> Project Groups must decide, *with Philip*, one of:
> 1. **Adopt the post-fix convention** for any **sidebar-facing** group surface — i.e. mirror the
>    landed `useToggleFavorite` query-cache hook, not the retired `router.refresh()` code. The
>    sidebar list is server state; the same argument that moved favorites applies. **OR**
> 2. **Consciously diverge** for the *projects-list grouping* surface only, on the explicit grounds
>    `04 §D-1` gives (the projects **list** is SSR-prop-driven, not Query-backed, so mixing a query
>    cache there would create two sources of truth for project rows). This is a *defensible*
>    divergence **for the projects-list page**, but it must NOT be described as "mirroring favorites"
>    once favorites no longer uses `router.refresh()`.
>
> Either way, Project Groups `06 §B1`, `04 §D-1`, and `README` item 6 should be updated to reference
> the **landed** favorites pattern, and to state explicitly that the sidebar surface (if/when built)
> uses the query-cache convention while the projects-list grouping may stay on SSR+refresh. The
> current wording "mirror favorites" is ambiguous precisely because favorites is mid-migration.

The technical reason Favorites must go first is therefore not just file-shape stability: it is so the
*convention* Project Groups copies is the final one. Building Groups against the current code freezes a
pattern Favorites is about to delete.

---

## 5. Concurrency protocol for coding agents

Concrete rules for any agent editing the HIGH/MEDIUM-collision files. These extend Project Groups'
`06 §E` "Rebase-before-edit checklist" — follow both.

1. **Re-run `git status` and re-confirm line numbers before every edit.** Line refs in all plan docs
   are stale snapshots. Verified drift example: `toggleProjectFavorite` is now at **L508, not L483**
   (and its `router.refresh()` calls at L514 / L657). Use `rg`/graph against the **live** file; never
   trust a line number from a plan.
2. **Never revert or discard unrelated dirty files.** The working tree holds at least three plans'
   worth of uncommitted work (Favorites read-half, C2 delete-modal, card polish). A blanket
   `git checkout .` / `git restore .` / fresh branch from `main` **destroys the Favorites read/render
   baseline** that the reactive work depends on. Stage and commit *only* your own regions.
3. **If a target file has already been modified by other in-flight work, rebase your edit ONTO it —
   do not overwrite.** Read the live file first, find the current region, and insert. Especially for
   `workspace-repository.ts` (append a reader; do not restructure the `Promise.all` return) and
   `projects-page-client.tsx` (edit only your region; leave the C2 delete-strings and any grouping
   regions intact).
4. **Announce ownership before large edits to `MainSidebar.tsx`, `sidebar-types.ts`, and
   `workspace-repository.ts`.** These are the three files where Favorites and Project Groups collide
   hardest. State which file + region you are taking before a big diff so a second agent does not
   start the same edit.
5. **Build the reactive half ON the uncommitted read half — do not rebuild it.** `listMainSidebarFavoriteProjects`,
   the two `*_LIMIT` consts, the `MainSidebarFavorite*` types, and the `MainSidebar` render section
   already exist. The reactive work *adds* `favoriteCreatedAt`, the query hook, the loader, and the
   mutation; it does not re-author the reader or the render block.
6. **After any merge into a shared file, re-run the affected suites** before claiming done:
   `bunx vitest run tests/vitest/projects-page-*.test.tsx tests/vitest/bulk-destructive-preview-modal.test.tsx tests/vitest/main-sidebar-favorites.test.tsx` + `bun run type-check` + `git diff --check`
   (per Project Groups `06 §E` step 6).

---

## 6. Open coordination questions (joint resolution required)

These must be resolved between the two packages (and with Philip) before either commits the shared
files:

1. **Does the uncommitted Favorites read/render half get committed as its own PR first?**
   Recommendation: **yes.** Committing the read/render baseline (workspace-repository reader, sidebar
   types, MainSidebar render, WorkshopPageShell wiring, the new test) as a standalone commit/PR (a)
   makes the "Favorites lands first" sequencing real instead of theoretical, (b) freezes
   `MainSidebarProps` + the `cache()`-reader convention that Project Groups `06 §C1`/`§E` waits on,
   and (c) lets the reactive half land as a clean follow-up diff. If it stays uncommitted, every other
   agent risks reverting it (see §5 rule 2).

2. **Convention drift — which mutation pattern does Project Groups mirror?** (See §4 action item.)
   Joint decision needed: does any **sidebar-facing** group surface adopt the landed query-cache
   `useToggleFavorite` convention, while the **projects-list grouping** stays on SSR+`router.refresh()`
   per Groups `04 §D-1`? This must be settled before Groups writes optimistic handlers, because the
   two patterns are not interchangeable and "mirror favorites" is currently ambiguous.

3. **Should the `sidebar-types.ts` `favoriteCreatedAt` addition be coordinated with any Project Groups
   type changes?** This package adds `favoriteCreatedAt` to `MainSidebarFavoriteProject` /
   `MainSidebarFavoriteEstimateSheet` (`03` §2). Project Groups, if it adds a sidebar-groups surface,
   adds a sibling `MainSidebar*` group type to the **same file**. Agreement: **Favorites adds
   `favoriteCreatedAt` first**; Groups appends its type below, additively, mirroring the favorites
   DTO shape — never reorders or reshapes the favorites types. If both land near-simultaneously,
   coordinate a single edit window for `sidebar-types.ts` per §5 rule 4.

4. **Who owns the `WorkshopPageShell` `Promise.all` / await order?** Favorites adds `initialData` +
   `{ workspaceId, userId }` to the existing await. Groups (if it touches the shell) adds a second
   awaited reader. Agreement (per Groups `06 §E` row 8): **do not reorder** the existing await;
   Favorites' wiring is the anchor, Groups appends.

5. **Test-file ownership for `projects-page-*` and `main-sidebar-favorites`.** Favorites owns
   `main-sidebar-favorites.test.tsx` (and adds new mutation/helper test files). Project Groups should
   add **new** test files (`projects-page-group-mode.test.tsx`) rather than editing the churning
   `projects-page-*` suites C2 already modified (Groups `06 §E` row "tests"). Confirm no two agents
   edit the same test file in the same window.

---

## Appendix — Observed git status (this writing)

```
On branch codex/fix-project-delete
 M src/components/sidebar/MainSidebar.tsx
 M src/components/sidebar/SidebarHeader.tsx
 M src/components/sidebar/sidebar-types.ts
 M src/components/workshop/BulkDestructivePreviewModal.tsx
 M src/components/workshop/LiveProjectCard.tsx
 M src/components/workshop/ProjectDashboardClient.tsx
 M src/components/workshop/ProjectDetailsModal.tsx
 M src/components/workshop/ProjectEstimatesClient.tsx
 M src/components/workshop/ProjectMiniSidebar.tsx
 M src/components/workshop/WorkshopPageShell.tsx
 M src/components/workshop/projects-page-client.tsx
 M src/lib/repositories/workspace-repository.ts
 D .ai/08_prompts/IMPLEMENT-2026-06-16-Sequential-Plan-Pack-Goal.md
 M .commandcode/taste/taste.md
 M tests/vitest/projects-page-card-layout.test.tsx
 M tests/vitest/projects-page-shared-access.test.tsx
 M tests/vitest/projects-page-sort-controls.test.tsx
 M tests/vitest/projects-page-view-mode.test.tsx
 M tests/vitest/workshop-reset.test.tsx
?? .ai/03_plans/2026-06-16-Project-Groups-Implementation/
?? .ai/03_plans/2026-06-16-Sidebar-Favorite-Projects-And-Estimates/
?? .ai/09_archive/IMPLEMENT-2026-06-16-Sequential-Plan-Pack-Goal.md
?? docs/plans/2026-06-16-003-delete-project-modal-ux-plan.md
?? tests/vitest/bulk-destructive-preview-modal.test.tsx
?? tests/vitest/main-sidebar-favorites.test.tsx
```

`git diff --stat HEAD` totals: **19 files changed, 626 insertions(+), 317 deletions(-)** — including
`MainSidebar.tsx +116`, `workspace-repository.ts +85`, `sidebar-types.ts +16`,
`WorkshopPageShell.tsx +4` (the Favorites read/render baseline), alongside the unrelated
`projects-page-client.tsx +89`, `BulkDestructivePreviewModal.tsx +92`, and `LiveProjectCard.tsx`
churn.
