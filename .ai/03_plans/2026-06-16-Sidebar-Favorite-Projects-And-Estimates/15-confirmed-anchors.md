# Confirmed Anchors — Phase 0 Ground Truth (verify-don't-invent resolved)

> Produced by 4 parallel read-only recon agents on 2026-06-16 against the **dirty** working
> tree (branch `codex/fix-project-delete`). These supersede the guide's snapshot line numbers
> in `14-master-implementation-guide.md`. Where a row says **⚠️ DRIFT**, the guide's drafted
> code is wrong for the current tree — follow THIS sheet. Re-`rg` before editing; the tree is
> shared with concurrent work.

## 🔴 Material drifts (MUST honor — these break the feature if missed)

1. **Scope userId field — use `currentUser.userId` (NOT `currentUser.id`).**
   `getCurrentUserContext()` → `src/lib/auth/session.ts:8-15,31-85` returns
   `{ userId: string; email; role; profile: Tables<"profiles">; displayName; avatarUrl }`.
   `requireCurrentUserContext()` returns the same non-null shape.
   **Canonical scope everywhere (shell 1.5, projects/page 3.2, /workshop 3.3):**
   ```ts
   const { workspace } = await ensureDefaultWorkspace();
   const favoritesScope = { workspaceId: workspace.id, userId: currentUser.userId };
   ```
   Server pages each compute scope independently, so all three MUST use this exact formula (D2).

2. **`projects-page-client.tsx` has `router.refresh()` on TWO paths.**
   - `:516` — inside `toggleProjectFavorite` (the favorite path → REMOVE in Task 3.2).
   - `:659` — inside `executeProjectDeletePreview` (delete-modal feature, **unrelated dirty work — DO NOT TOUCH**, §6).
   **➜ Task 3.2 Step 1 grep-guard MUST be narrowed.** Do NOT assert whole-file
   `not.toContain("router.refresh")`. Instead assert the favorite path specifically, e.g. extract
   the `toggleProjectFavorite` function body and assert it omits `router.refresh`, or assert the
   exact removed line is gone while line 659 remains. The whole-file assertion as written in the
   guide will FAIL and must not be used verbatim.

3. **`created_at` is non-nullable (`string`).** Both favorite selects fetch it and Supabase types
   give `string`. **Task 1.2 needs no `?? ""` / non-null assertion** — use `favorite.created_at`
   directly. (Confirm the actual loop variable name at edit time.)

## Phase 1 — read layer

| Anchor | Ground truth | vs guide |
|---|---|---|
| `getCurrentUserContext()` id field | `.userId` (session.ts:8-15) | ⚠️ DRIFT (guide used `.id`) |
| `ensureDefaultWorkspace()` | exported `cache(...)` at workspace-repository.ts:745; returns `{ workspace: Tables<"workspaces">, profile: Tables<"profiles"> }` (both have `.id`) | ✅ |
| `listMainSidebarFavoriteProjects` | exported `cache(...)` at workspace-repository.ts:1205 (UNCOMMITTED baseline — build on it) | ✅ |
| project_favorites select | `:1211 .select("project_id, created_at")` — `created_at: string` non-null | ✅ (non-null) |
| estimate_favorites select | `:1230 .select("estimate_id, project_id, created_at")` — `created_at: string` non-null | ✅ (non-null) |
| sheet shaping site | `:1259-1265` pushes `{ href, id, name, projectId, sheetCode }` — NO favoriteCreatedAt yet → add it | needs edit (1.2) |
| project shaping site | `:1276-1282` `{ favoriteEstimateSheets, href, id, name, projectCode }` — NO favoriteCreatedAt yet → add it | needs edit (1.2) |
| `MAIN_SIDEBAR_FAVORITE_PROJECT_LIMIT` / `_SHEET_LIMIT` | `8` / `5` at workspace-repository.ts:126/127 | ✅ |
| `sidebar-types.ts` DTOs | `MainSidebarFavoriteEstimateSheet` (`:20-26`: href,id,name,projectId,sheetCode) + `MainSidebarFavoriteProject` (`:28-34`: favoriteEstimateSheets,href,id,name,projectCode). **NEITHER has favoriteCreatedAt** | needs edit (1.2) |
| `MainSidebar.tsx` props | `MainSidebarProps` `:33-37` = `{ favoriteProjects?, status?, user? }` — **no favoritesScope** | needs edit (1.6) |
| `MainSidebar` wiring | **PROP-FED**, signature `:84` `({ favoriteProjects = [], status, user })` — **no useQuery yet** | needs edit (1.6) |
| empty state | renders `null` when `favoriteProjects.length === 0` (`:238` ternary) — no empty hint | needs edit (1.6) |
| favorites header block | `:222-236`, grid `grid h-10 w-full grid-cols-[48px_minmax(0,1fr)] items-center gap-1 overflow-hidden rounded-xs` → add `data-sidebar-favorites-header tabIndex={-1} outline-none` | needs edit (1.6) |
| data attrs | `data-sidebar-favorite-project` `:249`, `data-sidebar-favorite-sheet` `:281` | ✅ present |
| reduced-motion | `prefersReducedMotion` state + listener `MainSidebar.tsx:98-118` | ✅ present |
| live regions | NONE yet (`data-sidebar-favorites-status/alert` absent) | needs edit (2.4/5.3) |
| `WorkshopPageShell.tsx` | import `:13` (only `listMainSidebarFavoriteProjects` — ADD `ensureDefaultWorkspace`); `currentUser = getCurrentUserContext()`; fetch `:89` `const sidebarFavoriteProjects = currentUser ? await listMainSidebarFavoriteProjects() : []`; render `:110` `<MainSidebar favoriteProjects={…} status={…} user={…} />` | needs edit (1.5) |

## Phase 2 — estimate mutation

| Anchor | Ground truth | vs guide |
|---|---|---|
| store factory/type | `createProjectEstimatesStore(initial)` + `type ProjectEstimatesStore = ReturnType<…>` at project-estimates-store.ts:33-35 | ✅ |
| `patch` | `:97-100` `patch: (id, patch) => set(s => ({ estimates: s.estimates.map(e => e.id===id ? {...e,...patch} : e) }))` — i.e. `patch(id, Partial<row>)` | ✅ |
| row fields | `project-estimate-list-row.ts:17-36` has `isFavorite: boolean`, `favoriteCreatedAt: string\|null`, `id`, `project_id`, `name`, `sheet_code` | ✅ |
| estimates `page.tsx` | reads only `project.name` (`:29`); **no `projectCode`** read; workspace resolved internally via `getCurrentWorkspaceProject()` (not exposed); user via `requireCurrentUserContext()` (`:58`) | ⚠️ must source projectCode + workspaceId + isSidebarFavorite (2.3) |
| `ProjectEstimateFavoriteButton.tsx` | props `{ estimate, disabled, optimistic, store? }` (`:11-16`); local `favoriteOverride` (`:28-32`); `toggleFavorite` (`:42-60`) = setFavoriteOverride + patchFavorite + `startTransition`→`setEstimateFavorite`→rollback; `aria-pressed={isFavorite}` `:76`, `aria-busy={isPending}` `:77` | switch to hook (2.3) |
| `ProjectEstimatesClient.tsx` | **DIRTY +92: favorites-FILTER scaffolding to PRESERVE** — `ESTIMATE_FILTER_OPTIONS` `:38-42`, state `filter/sortField/sortDirection` `:99-101`, `isEstimateFilter` guard `:59-61`, DropdownSelect UI `:190-226`. **NOT yet wired** (filter value unused). Props `:71-77` = `{ canCreateEstimates, canEditEstimateById, estimates, projectId, projectName }` | add `parentProject`+`scope`, DON'T regress (2.3) |
| `ProjectEstimatesTable.tsx` | props `:42-58` `{ canEditEstimateById?, estimates, projectId, emptyMessage?, store?, optimistic? }`; renders `<ProjectEstimateFavoriteButton estimate disabled optimistic store />` at `:275-280` | thread parentProject+scope (2.3) |

## Phase 3 — project mutation

| Anchor | Ground truth | vs guide |
|---|---|---|
| `toggleProjectFavorite` | `projects-page-client.tsx:510-520` verbatim as guide's "before"; `router.refresh()` at `:516` | ✅ (but see drift #2) |
| 2nd `router.refresh()` | `:659` in `executeProjectDeletePreview` — unrelated delete feature, **leave it** | ⚠️ DRIFT #2 |
| props / fields | props `:44-47` `{ projects, favoriteProjectIds? }` (no scope); `item.project.project_code` exists `:421`; `projectItems` `:376`; `router` `:371`, `startTransition` `:403` used by delete too — keep both | thread `favoritesScope` (3.2) |
| `projects/page.tsx` | `const { projects, favoriteProjectIds } = await listCurrentWorkspaceProjects();` → `<ProjectsPageClient projects favoriteProjectIds />` (`:5-22`); no scope sourced yet | add scope via formula above (3.2) |
| `WorkshopHomebaseClient.tsx` | `removeRemovedProjectFavorite` `:73-84` verbatim; `router.replace("/workshop", { scroll: false })` `:79`; props `:19-24` = `{ homebase, inviteBanner?, removedProjectBanner?, userDisplayName? }` | ⚠️ notice is `removedProjectBanner` (type WorkshopRemovedProjectBannerState), NOT `removedProjectNotice` — confirm `projectName`/`projectCode` fields on it before use (3.3) |
| `/workshop` `page.tsx` | renders `<WorkshopHomebaseClient homebase inviteBanner removedProjectBanner userDisplayName={currentUser.displayName} />`; `currentUser = requireCurrentUserContext()` available `:81` | add `favoritesScope` (3.3) |

## Phase 4 — server-action hygiene (independent; only touches actions.ts)

| Anchor | Ground truth | vs guide |
|---|---|---|
| `setProjectFavorite` | actions.ts:25-70; `assertUuid` helper `:21-23`; project DELETE `:32-36` = `.eq("user_id", profile.id).eq("project_id", projectId)` — **MISSING `workspace_id`** (the authz hole 4.2 fixes); vars in scope: `workspace`, `profile` | ✅ confirms 4.1/4.2 targets |
| `setEstimateFavorite` | actions.ts:72-124; estimate upsert `{ ignoreDuplicates: true, onConflict: "user_id,estimate_id" }` `:107` (DEFER, D14); estimate DELETE `:112-117` already has `.eq("workspace_id", workspace.id)` | ✅ |
| revalidate | uses `revalidatePath` only, NO `revalidateTag` (D7 satisfied) | ✅ |

## Phase 5 — logout clear

| Anchor | Ground truth | vs guide |
|---|---|---|
| `realtime-auth-bridge.tsx` | `onAuthStateChange` `:47-54`; `SIGNED_OUT` branch `:51-52` `void applyAuth(undefined)`; effect deps `[]` `:60` | add `useQueryClient()` + `removeQueries({ queryKey: favoritesQueryKeys.all() })`, add `queryClient` to deps (5.1) |
| providers nesting | `RealtimeAuthBridge` IS inside `QueryClientProvider` (providers.tsx:40) | ✅ in-bridge clear is valid |

## Dirty-tree preservation (§6/§12 — do NOT clobber)

Unrelated in-flight work on this branch: delete-project-modal (`BulkDestructivePreviewModal`,
`ProjectDetailsModal`, delete migration, `executeProjectDeletePreview` + its `:659` router.refresh),
card-layout polish (`LiveProjectCard`, projects-page card/sort/view tests), `ProjectEstimatesClient`
favorites-filter scaffolding, `SidebarHeader`/`ProjectMiniSidebar`/`ProjectDashboardClient` tweaks,
Project Groups plan docs. Use scoped `git add <specific files>` per commit; re-run `git status`
before each edit; rebase onto in-flight changes, never overwrite.
