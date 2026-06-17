# Project Groups — Blast-Radius / Impact Analysis (Lane C)

**Date:** 2026-06-16
**Lane:** C — Blast-radius / impact analysis
**Scope:** Analysis/readiness only. No app source edits. Knowledge-graph-driven enumeration of every code surface the "Project Groups" feature touches or could break, risk-ranked, with a concurrency-collision map and sequencing recommendation.

**Method:** code-review-graph MCP (`get_affected_flows`, `get_impact_radius`, `query_graph importers_of/tests_for`, `list_graph_stats`) confirmed against `Read`/`grep`. Graph freshness verified: last updated `2026-06-16T17:42` (today), 14,567 nodes / 169,416 edges. Live DB inventory verified read-only against project `ebxxqidacheyapmmzavr` (no `project_groups` table exists yet; `project_favorites` has 1 row).

---

## 0. TL;DR — what this feature really is, structurally

Project Groups is **not** a new page. It is a third "organize by" mode on the existing projects page that **reuses the date-grouping render path verbatim**. The entire feature decomposes into four structural deltas:

1. **A new "organize by" axis** (None / Date / Group) that currently does not exist as a concept — today grouping is implicitly derived from `isDateSortField(sortField)`. This is the single highest-leverage refactor and the root of most risk.
2. **A new persisted membership relation** (`project_groups` + `project_group_memberships`) mirroring `project_favorites` 1:1 (table shape, RLS, grants, indexes, repository fetch, server action with optimistic update).
3. **A widening of the server→client data contract** so each `ProjectListItem` carries its group membership, and `listCurrentWorkspaceProjects()` returns the group catalog.
4. **A grouping function** `groupProjectsByGroup(...)` that returns the **same `ProjectDateGroup`-shaped output** the flag renderer already consumes — so the JSX render path is untouched if the generalization is done right.

The dominant risk is **not** the DB or the action (those are mechanical clones of favorites). The dominant risk is the **`projects-page-client.tsx` grouping/sort coupling** and the **concurrency collision** with three in-flight efforts that all touch the same files.

---

## 1. Dependency map (verified)

```
src/app/workshop/projects/page.tsx                      ← server route (RSC, async)
  └─ listCurrentWorkspaceProjects()                      ← src/lib/repositories/workspace-repository.ts (L806)
       ├─ ensureDefaultWorkspace()  (cache())            ← same file (L745)
       ├─ Promise.all([...6 queries...])                 ← projects, project_favorites, estimate_favorites,
       │                                                     project_members, estimate_sheet_members, workspace_members
       └─ returns { workspace, projects: ProjectListItem[], favoriteProjectIds: string[] }
  └─ <WorkshopPageShell>                                 ← src/components/workshop/WorkshopPageShell.tsx
       └─ <MainSidebar favoriteProjects=…>               ← src/components/sidebar/MainSidebar.tsx
            └─ listMainSidebarFavoriteProjects()         ← workspace-repository.ts (L~1200)
  └─ <ProjectsPageClient projects favoriteProjectIds>    ← src/components/workshop/projects-page-client.tsx ("use client")
       ├─ normalizeProjectListItem / ProjectListItem     ← exported type (L49)
       ├─ sort logic: isDateSortField, compareProjectsBySort/ByDateOnly (L220-273)
       ├─ group logic: getProjectDateGroup, groupProjectsByDate, ProjectDateGroup (L100, L275-311)
       ├─ shouldGroupProjectsByDate + dateGroupedLiveProjects (L423-427)
       ├─ toolbar filterSlot: DropdownSelect ×3 (View / Sort field / Sort direction) (L651-691)
       ├─ horizontal-flag render: divider + <h3 data-project-date-group-label> + grid (L724-753)
       ├─ favorites optimistic: toggleProjectFavorite → setProjectFavorite (L483-493)
       ├─ bulk delete: preview/execute + BulkDestructivePreviewModal (L579-639, L815)
       └─ renders <LiveProjectCard> per item (L510-535)
            └─ src/components/workshop/LiveProjectCard.tsx (onToggleFavorite/onToggleSelected/onExpand)
       └─ <ProjectDetailsModal> (expand) ← src/components/workshop/ProjectDetailsModal.tsx
mutation: setProjectFavorite()                            ← src/lib/workshop/actions.ts (L25)  ← TEMPLATE for group mutations
```

**Affected execution flow (graph):** exactly **one** flow — `ProjectsPage` (id 1126), criticality **0.77**, 186 nodes across 54 files. That confirms the projects page is the single user-facing entry point this feature lives inside; there is no other flow to regress.

**`workspace-repository.ts` is a hub:** `importers_of` returns **29 importers** (routes, repositories, actions, 3 tests). This is why edits there are inherently medium-to-high risk: a careless change to shared helpers (`ensureDefaultWorkspace`, `Tables` imports, the `WorkshopProjectListItem` shape) ripples into the workshop homebase, project detail layout, estimates pages, component-library, publication, and AI package-builder. The **safe** move is to add a *new* exported query/type and a *new* field on the returned objects, not to alter existing signatures.

---

## 2. Per-file impact table (what changes, callers, tests, risk)

Legend: **R** = risk (low / medium / high / critical). Risk reflects blast radius × concurrency collision × test fragility.

| File | Change needed | Direct callers / consumers | Test coverage today | R |
|---|---|---|---|---|
| `src/components/workshop/projects-page-client.tsx` | Add "Organize" select (None/Date/Group); decouple grouping from `isDateSortField`; add `groupProjectsByGroup`; generalize `shouldGroupProjectsByDate`→`groupedLiveProjects`; thread group membership + group catalog props; add group assign/create UI + optimistic `setProjectGroup`. | Imported only by `page.tsx` (RSC) + 4 vitest suites. Graph `tests_for(file)` = 0 (RTL renders the component, not graph-linked tests). | `projects-page-sort-controls`, `projects-page-card-layout`, `projects-page-shared-access`, `projects-page-access-tabs`, `projects-page-view-mode` (all render `ProjectsPageClient`). | **HIGH** |
| `src/lib/repositories/workspace-repository.ts` | Add `project_groups` + `project_group_memberships` to the `Promise.all` in `listCurrentWorkspaceProjects` (L810); add `groupId`/`groupName` to each `WorkshopProjectListItem`; return `projectGroups` catalog. New exported `listProjectGroups()` if needed for a management surface. | **29 importers** (hub). But the *new* query/field is additive. | `projects-page-view-mode`, `projects-page-card-layout`, `workshop-pending-invite`, `workspace-repository-estimate-tree` import this module. | **HIGH** |
| `src/lib/workshop/actions.ts` | Add `setProjectGroup({projectId, groupId|null})` and optionally `createProjectGroup`/`renameProjectGroup`/`deleteProjectGroup`. Clone `setProjectFavorite` exactly (assertUuid → ensureDefaultWorkspace → workspace-scoped project check → upsert/delete → `revalidatePath("/workshop/projects")` + `/workshop`). | Imported by `projects-page-client.tsx` (and tests mock it). | Mocked in `projects-page-sort-controls.test.tsx` (`vi.mock("@/lib/workshop/actions")`); covered indirectly via the favorites optimistic test. | **MEDIUM** |
| `src/components/workshop/LiveProjectCard.tsx` | Likely a small "group" affordance (assign-to-group control or group chip) — mirror `onToggleFavorite` with `onAssignGroup?`. Card is otherwise group-agnostic (it renders one project). | Rendered by `projects-page-client.tsx`; imports `workspace-repository` types. | `projects-page-card-layout`, `projects-page-access-tabs`, view-mode tests assert card structure/`aria-label`. | **MEDIUM** |
| `src/app/workshop/projects/page.tsx` | Pass new props through (`projectGroups`, group membership already inside `ProjectListItem`). 22-line passthrough; trivial. | Next.js route. | Exercised by the `ProjectsPage` flow only; no direct unit test. | **LOW** |
| `src/components/workshop/ProjectDetailsModal.tsx` | Optional: add "Group" field/affordance in details (assign group from the modal). Not required for MVP. | Dynamic-imported by `projects-page-client.tsx`. | No direct test references group; `onDeleteProject` path is concurrency-hot (delete-modal plan). | **MEDIUM** |
| `src/components/workshop/WorkshopPageShell.tsx` | Only if groups surface in the sidebar. For MVP: **no change**. Already fetches `listMainSidebarFavoriteProjects()`. | Wraps every workshop page (`page.tsx`, homebase, project detail). | `main-sidebar-favorites.test.tsx` (new, concurrent). | **LOW** (MVP) / MEDIUM (if sidebar groups) |
| `src/components/sidebar/MainSidebar.tsx` + `sidebar-types.ts` | Only if groups appear in the sidebar nav (e.g. collapsible group list). For MVP: **no change**. | `WorkshopPageShell`. | `main-sidebar-favorites.test.tsx`, `sidebar-nav-item-row.test.tsx`. | **LOW** (MVP) |
| `src/components/workshop/BulkDestructivePreviewModal.tsx` | **No change.** Group membership rows cascade-delete with the project; group deletion (if added) is a *separate, non-destructive-to-projects* action and should NOT route through the bulk destructive modal. | `projects-page-client.tsx`. | `bulk-destructive-preview-modal.test.tsx` (new, concurrent). | **LOW** |
| `src/lib/supabase/types.ts` (generated) | Regenerate after migration so `Tables<"project_groups">` / `Tables<"project_group_memberships">` exist. Do **not** hand-edit. | Imported pervasively via `Tables<…>`. | Type-only; tsc is the gate. | **MEDIUM** |
| `supabase/migrations/<new>.sql` | New migration: 2 tables + FKs + RLS + grants + indexes, cloned from `20260526013617_workshop_favorites.sql`. | — | No SQL unit tests; schema tests are TS (`workshop-favorites-schema.test.ts` style). | **MEDIUM** (correctness-critical, but isolated) |

### HIGH/CRITICAL call-outs (explicit)

- **HIGH — `projects-page-client.tsx`:** This is the riskiest surface, not because of blast radius outward (only `page.tsx` imports it) but because of **internal coupling + test fragility + concurrency**. The grouping is currently *implicit* (`shouldGroupProjectsByDate = isDateSortField(sortField) && …`). Five vitest suites assert exact DOM (`data-project-date-group`, `data-project-date-group-label`, `aria-label="Live projects"`, `[data-project-view-mode]`, group label text like `"2026 · February"`, and the per-view flag-layout grid classes). Introducing an "organize by Group" axis means the date-group render must be generalized to a group-agnostic flag renderer **without changing the date assertions**. Any refactor that renames the date attributes or alters the `space-y-4 / projectLayoutClassName` structure breaks `projects-page-sort-controls.test.tsx` (lines 99-106, 164-167, 238-242) and `projects-page-card-layout`. Treat this as the integration linchpin; auth/RLS risk remains HIGH until provider proof exists.

- **HIGH — `workspace-repository.ts` (`listCurrentWorkspaceProjects`):** 29 importers make any *signature* change ripple widely. The mitigation is strict additivity: extend the `Promise.all` array and add fields; never reorder/rename the existing return keys (`projects`, `favoriteProjectIds`). The returned `WorkshopProjectListItem` is the contract that `ProjectListItem` (client) shadow-types — keep them in lockstep.

---

## 3. Server-action + repository surface (where new code lives)

Match the existing structure exactly. Two clean clones:

### 3a. Repository (read) — `src/lib/repositories/workspace-repository.ts`

- Extend the `Promise.all` in `listCurrentWorkspaceProjects` (L810-841) with two queries, keyed identically to favorites:
  ```ts
  supabase.from("project_group_memberships")
    .select("project_id, group_id")
    .eq("workspace_id", workspace.id)
    .eq("user_id", profile.id),                 // current user's membership only
  supabase.from("project_groups")
    .select("id, name, accent_id, position, created_at")
    .eq("workspace_id", workspace.id)
    .eq("user_id", profile.id)
    .order("position", { ascending: true }),    // the group catalog
  ```
- In `createProjectListItem` (L913), attach `groupId` (and resolved `groupName`) from a `Map<projectId, groupId>`, mirroring how `favoriteEstimateSheetsByProjectId` is attached (L919).
- Return a new top-level `projectGroups` array alongside `favoriteProjectIds` (L972) — additive, no breakage.
- Add `groupId?: string | null` to the exported `WorkshopProjectListItem` type and to the client `ProjectListItem` type (L49). **Type-boundary leak to watch:** the client type re-imports `ProjectFavoriteEstimateSheetSummary` / `WorkshopPendingInviteSummary` from the repository (projects-page-client.tsx L34-37). Add a `ProjectGroupSummary` export there and import it the same way — do **not** redefine the shape in the client file (that is the exact anti-pattern that causes drift).

### 3b. Server action (write) — `src/lib/workshop/actions.ts`

Clone `setProjectFavorite` (L25-70) precisely:
```ts
export async function setProjectGroup({ projectId, groupId }: { projectId: string; groupId: string | null }) {
  assertUuid(projectId, "Project");
  const { workspace, profile } = await ensureDefaultWorkspace();
  const supabase = await createSupabaseServerClient();
  // verify project belongs to this workspace, current user, and the "Your Projects" scope
  // if groupId === null → delete from project_group_memberships
  // else → assertUuid(groupId), verify group by id + workspace_id + user_id,
  // upsert membership (onConflict: "user_id,project_id")
  revalidatePath("/workshop");
  revalidatePath("/workshop/projects");
}
```
- `createProjectGroup({ name })` / `renameProjectGroup` / `deleteProjectGroup` follow the same skeleton and are **per-user, workspace-scoped** like favorites. Do not create shared workspace groups in v1.
- The **optimistic-update template** is `toggleProjectFavorite` (projects-page-client.tsx L483-493): set local override → `setProjectGroup(...)` → `router.refresh()` → revert on `.catch`. Reuse this pattern verbatim for group assignment so the UX matches favorites.

### 3c. Type-boundary leaks to police

- `Tables<"projects">` is used directly as the card/list payload (`ProjectListItem.project`, `expandedProject` state). Adding group columns **to `projects`** would ripple into every `Tables<"projects">` consumer (the project form, details modal, charts, exports). **Recommendation:** model groups as a **separate membership table** (like favorites), NOT a `group_id` column on `projects`. This keeps `Tables<"projects">` unchanged and contains the blast radius. (A column on `projects` would also force every other importer's generated type to change.)
- `WorkshopProjectListItem` (repo) ↔ `ProjectListItem` (client) duplication already exists for favorites/invites. Extend both, in the same commit, with the identical field.

---

## 4. Test surfaces

### Existing suites that WILL need updating

| Test | Why it breaks / needs work | Fragile anchors |
|---|---|---|
| `tests/vitest/projects-page-sort-controls.test.tsx` | Asserts the date-group flag renderer (`projectDateGroupLabels()`, `data-project-date-group-label`, group label classes `border-x border-b border-hairline bg-surfaceMuted`, per-view flag grid `minmax(132px,1fr)`). Generalizing the renderer must keep these green; new "Organize by Group" cases added here. | L99-106, L164-167, L184-198, L238-242, L262-266 |
| `tests/vitest/projects-page-card-layout.test.tsx` | Imports `ProjectsPageClient` + `workspace-repository`; asserts card layout. New group affordance on the card may shift assertions. | card structure / aria-labels |
| `tests/vitest/projects-page-access-tabs.test.tsx` | Asserts `data-project-view-mode` and `getAllByRole("article")` per group. A new organize axis interacts with the your/shared tabs. | L378-412 |
| `tests/vitest/projects-page-shared-access.test.tsx` | Shared-tab semantics: can you group a shared project? Membership write is owner/admin-gated like delete (`canSelectProjectForDeletion`). | L321 (`data-project-view-mode`) |
| `tests/vitest/projects-page-view-mode.test.tsx` | Imports `workspace-repository`; view-mode flag layout under grouping. | L86-142 |
| `tests/vitest/workshop-pending-invite.test.tsx` | Imports `workspace-repository`; if the repo return shape changes it must still construct. Keep additive. | repo return contract |
| `tests/vitest/main-sidebar-favorites.test.tsx` (new/concurrent) | Only if groups reach the sidebar (not MVP). | — |
| `tests/vitest/bulk-destructive-preview-modal.test.tsx` (new/concurrent) | Only if group deletion is (wrongly) routed through the destructive modal — **don't**. | — |

### New tests required

1. **`project-groups-schema.test.ts`** — mirror `workshop-favorites-schema.test.ts`: assert `project_groups` / `project_group_memberships` migration shape, FKs, unique constraints, RLS presence.
2. **`set-project-group-action.test.ts`** — mirror the favorites action coverage: UUID assertion, workspace scoping, upsert vs delete, revalidatePath calls.
3. **Group-grouping render cases inside `projects-page-sort-controls.test.tsx`** (or a new `projects-page-organize-groups.test.tsx`) — select "Organize by Group", assert flag headers carry group names, ungrouped bucket renders last, project order within group is preserved.
4. **`workspace-repository` group projection test** — assert `listCurrentWorkspaceProjects()` attaches `groupId`/`groupName` and returns the `projectGroups` catalog. Mirror `project-estimate-list-summaries-parity.test.ts` style.

---

## 5. Concurrency collision map (CRITICAL coordination)

Uncommitted working-tree files (from git status) and whether Project Groups must touch them:

| Uncommitted file | In-flight owner | Groups must also touch? | Collision severity |
|---|---|---|---|
| `src/components/workshop/projects-page-client.tsx` | (both plans touch it) | **YES — heavily** (organize axis, group render, group assign) | **HIGH — guaranteed conflict** |
| `src/lib/repositories/workspace-repository.ts` | Sidebar-Favorites plan (added `listMainSidebarFavoriteProjects`) | **YES** (new group queries in `listCurrentWorkspaceProjects`, new type) | **HIGH** |
| `src/components/workshop/LiveProjectCard.tsx` | Sidebar-Favorites + card polish | **LIKELY** (group chip/affordance) | **MEDIUM-HIGH** |
| `src/components/sidebar/MainSidebar.tsx` | Sidebar-Favorites plan | **NO (MVP)** | LOW (avoid for MVP) |
| `src/components/sidebar/sidebar-types.ts` | Sidebar-Favorites plan | **NO (MVP)** | LOW |
| `src/components/workshop/ProjectDetailsModal.tsx` | Delete-modal UX plan | **MAYBE** (group field in details) | **MEDIUM** — overlaps the delete-modal plan's hot path (`onDeleteProject`) |
| `src/components/workshop/WorkshopPageShell.tsx` | Sidebar-Favorites plan | **NO (MVP)** | LOW |
| `src/components/workshop/BulkDestructivePreviewModal.tsx` | Delete-modal UX plan | **NO** (keep group delete out of it) | LOW |
| `tests/vitest/projects-page-*.test.tsx` (3 modified) | both plans | **YES** (group cases) | **MEDIUM** — same files, mergeable if additive |
| `tests/vitest/main-sidebar-favorites.test.tsx` (new) | Sidebar-Favorites | NO (MVP) | LOW |
| `tests/vitest/bulk-destructive-preview-modal.test.tsx` (new) | Delete-modal | NO | LOW |

**Two named in-flight plans collide directly:**
- `.ai/03_plans/2026-06-16-Sidebar-Favorite-Projects-And-Estimates` — owns `listMainSidebarFavoriteProjects`, the sidebar files, and added the `favoriteEstimateSheets` plumbing through `workspace-repository.ts` + `LiveProjectCard.tsx` + `projects-page-client.tsx`. **Same three core files Groups needs.**
- `docs/plans/2026-06-16-003-delete-project-modal-ux-plan.md` — owns `ProjectDetailsModal.tsx` (`onDeleteProject`) and `BulkDestructivePreviewModal.tsx`.

### Sequencing recommendation (to avoid merge hell)

1. **Land the two in-flight plans first.** Do NOT start Project Groups implementation against the current dirty tree. The favorites and delete-modal branches are mid-flight in exactly the three files Groups needs most (`projects-page-client.tsx`, `workspace-repository.ts`, `LiveProjectCard.tsx`). Rebasing Groups onto a clean, merged `main` eliminates 80% of the conflict surface.
2. **Then do the DB + action lane first, in isolation** (migration + `setProjectGroup` + `listCurrentWorkspaceProjects` additive extension + regenerate types). These barely touch the contested UI files and can be reviewed/merged independently. This is the low-risk foundation.
3. **Then the client refactor as a single focused PR:** generalize the date-group renderer into a group-agnostic flag renderer and add the Organize axis. Doing the *generalization* and the *new group mode* in one PR (rather than two) avoids a second pass over the same fragile test anchors.
4. **Keep sidebar + details-modal out of MVP.** Every file you don't touch is a merge conflict you don't have. Add the sidebar group surface and the details-modal group field only after the core ships.
5. **Coordinate the shared `WorkshopProjectListItem` type edit** with the sidebar-favorites author — both lanes extend the same type; agree on one PR owning the type change.

---

## 6. Blast-radius summary table (sorted by risk)

| Rank | Surface | Risk | Primary reason |
|---|---|---|---|
| 1 | `projects-page-client.tsx` (organize axis + group render) | **HIGH** | Implicit date-grouping coupling; 5 fragile RTL suites; triple-plan concurrency on the same file |
| 2 | `workspace-repository.ts` `listCurrentWorkspaceProjects` + types | **HIGH** | 29 importers (hub); shared type with sidebar-favorites lane; must stay strictly additive |
| 3 | `LiveProjectCard.tsx` group affordance | **MEDIUM-HIGH** | Concurrency-hot; card-layout/access-tabs tests assert structure |
| 4 | `setProjectGroup` + group CRUD in `workshop/actions.ts` | **MEDIUM** | Mechanical clone of favorites, but membership/RLS semantics decision required |
| 5 | New migration (`project_groups`, `project_group_memberships`) | **MEDIUM** | Correctness-critical RLS/FK, but isolated; clone of `workshop_favorites` |
| 6 | `src/lib/supabase/types.ts` regen | **MEDIUM** | Must regenerate; pervasive `Tables<…>` consumers; never hand-edit |
| 7 | `ProjectDetailsModal.tsx` group field (optional) | **MEDIUM** | Overlaps delete-modal plan's hot path |
| 8 | `page.tsx` props passthrough | **LOW** | 22-line trivial passthrough |
| 9 | `WorkshopPageShell` / `MainSidebar` / `sidebar-types` | **LOW** | No change for MVP — defer |
| 10 | `BulkDestructivePreviewModal.tsx` | **LOW** | No change — keep group delete out of it |

**No CRITICAL business-operation surfaces.** There is no payment or destructive-project-data path. Auth/RLS and data-integrity remain HIGH until implementation proves anon denial, cross-user denial, shared-project denial, mixed bulk behavior, generated types, and advisor output against the Archestimator Supabase project.

---

## 7. Verification performed

- Graph freshness confirmed (`list_graph_stats`: updated today).
- `get_affected_flows` on `[projects-page-client, workspace-repository, page.tsx]` → single `ProjectsPage` flow (crit 0.77).
- `query_graph importers_of(workspace-repository)` → 29 importers enumerated (hub confirmation).
- `query_graph tests_for(projects-page-client)` → 0 (RTL coverage is render-based, not graph-edged) — so test impact was confirmed by `grep` over `tests/vitest/projects-page-*`.
- Read in full: `projects-page-client.tsx`, `page.tsx`, `workshop/actions.ts`, `MainSidebar.tsx`, `sidebar-types.ts`, `listCurrentWorkspaceProjects` (L806-974), `projects-page-sort-controls.test.tsx`, `20260526013617_workshop_favorites.sql`.
- Live DB read-only (`list_tables` on `ebxxqidacheyapmmzavr`): 51 RLS-enabled tables, **no `project_groups`**, `project_favorites` present (1 row) — template confirmed live.
- No source files were edited. This file is the only artifact written.
