# Lane D — State Management & Data-Flow Analysis: Project Groups

> **LANE/ANALYSIS DOC — subordinate to `00` (decisions) and `07` (contracts). Where this doc conflicts, 00/07 win.** Reconciled 2026-06-16 for: `ProjectGroupSummary` shape now carries `accentId` (LD-4, conforms to `07` §3.1); action names conformed to `07` §4 (`createProjectGroup` / `renameProjectGroup` / `deleteProjectGroup` / `recolorProjectGroup` / `reorderProjectGroups` / `moveProjectToGroup` / `bulkAssignProjectsToGroup`); membership table has **no `position` column** (only `project_groups.position` orders groups — per `07`/`08`); D-8 optimistic-clear mechanism corrected for non-awaitable `router.refresh()` (LD-6).

**Feature:** User-defined Project Groups on `/workshop/projects`, rendered with the existing "horizontal flag" grouping treatment as a peer "organize by" mode (None / Date / Group).

**Scope of this lane:** Where group state lives, how data flows DB → UI, mutation surface, optimistic updates, and preference persistence. Analysis only — no source edits.

**Date:** 2026-06-16 · **Verification basis:** files read at analysis time on branch `codex/fix-project-delete`. Cite behavior, not line numbers — concurrent edits are in flight (see §9).

---

## 1. Current data flow (ground truth, verified)

### 1.1 The projects list is SSR-only — NOT TanStack Query

This is the single most important fact for the whole feature. The projects list does **not** flow through TanStack Query or Zustand. It is server-rendered and passed as props:

```
src/app/workshop/projects/page.tsx  (async Server Component)
  └─ listCurrentWorkspaceProjects()           [workspace-repository.ts]
       returns { workspace, projects, favoriteProjectIds }
  └─ <ProjectsPageClient projects={projects} favoriteProjectIds={favoriteProjectIds} />
       └─ normalizeProjectListItem(...) → ProjectListItem[]   (client-side memo)
       └─ tab filter → search → sort → (date-group) → render LiveProjectCard[]
```

- `page.tsx` destructures **only** `{ projects, favoriteProjectIds }` from the loader and forwards them as the two props.
- `ProjectsPageClient` is `"use client"` but is a **pure prop consumer** for data. All "freshness" comes from re-running the Server Component via `router.refresh()`.
- **TanStack Query exists in the app** (`src/app/providers.tsx` wraps everything in `QueryClientProvider`; staleTime/gcTime 5 min, `refetchOnWindowFocus: false`, query retry 1, **mutation retry 0**) but is used for *other* surfaces only: estimates (`use-estimate-query`, `use-estimate-row-mutations`), notifications (`useNotificationsQuery`), collaboration (`use-project-collaboration-query`), component library, templates. **The projects page uses none of these.**
- **Zustand stores exist** (`src/stores/`: `estimate-ui-store`, `estimate-column-widths-store`, `navigation-ui-store`, `project-estimates-store`) but **none touch the projects list**. They are estimate-workspace / navigation concerns.

**Decision (D-1): Keep Project Groups on the SSR + server-action + `router.refresh()` model. Do NOT introduce TanStack Query for the projects list.** Mixing a query cache into a page that is otherwise SSR-prop-driven would create two sources of truth for the same project rows (the SSR prop and the query cache) and double the invalidation surface. The existing favorites flow already proves the SSR+refresh model handles optimistic mutation cleanly. Reserve TanStack Query only if/when we later add infinite scroll or background polling — out of scope here.

### 1.2 `ProjectListItem` shape (client) vs `WorkshopProjectListItem` (repo)

- Client type `ProjectListItem` (in `projects-page-client.tsx`): `{ project: Tables<"projects">, accessKind, currentUserRole, ownerWorkspaceName?, pendingInvite?, pendingInviteCount?, publicationSummary?, sharedEstimateCount?, favoriteEstimateSheets? }`.
- Repo returns `WorkshopProjectListItem` (in `workspace-repository.ts`) which is structurally assignable to the client type. `page.tsx` passes them straight through; `normalizeProjectListItem` only kicks in for the bare-`projects` fallback (Storybook/sample path).
- **Group assignment must be added to BOTH** the repo return shape and the client `ProjectListItem` (see §4).

### 1.3 Existing client state inventory (what already lives in `ProjectsPageClient`)

| State | Type | Purpose | Persisted? |
|---|---|---|---|
| `isModalOpen` | bool | new-project modal | no |
| `expandedProject` | `Tables<"projects"> \| null` | details modal target | no |
| `searchQuery` | string | search box | no |
| `activeTab` | `"your-projects" \| "shared-to-you"` | access tabs | no (derived initial) |
| `projectViewMode` | `ProjectCardViewMode` | card density | **yes** (localStorage + `useSyncExternalStore`) |
| `favoriteOverrides` | `Record<string, boolean>` | optimistic favorite layer | no (transient) |
| `pendingFavoriteId` | `string \| null` | favorite busy indicator | no |
| `selectedProjectIds` | `Set<string>` | bulk-delete multi-select | no |
| `sortField` / `sortDirection` / `sortTouched` | enums/bool | sort controls | no |
| `deleteProject*` (4 states) | bulk-delete preview/execute machine | no |

**Key observation:** `sortField` drives date grouping today. `shouldGroupProjectsByDate = isDateSortField(sortField) && displayLiveProjects.length > 0`. The "horizontal flag" render is gated entirely on the *sort field being a date field*. There is **no explicit "organize by" mode variable yet** — date grouping is an implicit side-effect of choosing a date sort. Project Groups must introduce an explicit `organizeBy` axis (see §3) and decouple grouping from sort.

---

## 2. The favorites optimistic-update pattern — the exact template

This is the canonical pattern to mirror for **every** group mutation. From `toggleProjectFavorite` in `projects-page-client.tsx`:

```ts
function toggleProjectFavorite(projectId: string, nextFavorite: boolean) {
  const previousFavorite = favoriteIds.has(projectId);          // 1. snapshot prev
  setFavoriteOverrides((c) => ({ ...c, [projectId]: nextFavorite })); // 2. optimistic
  setPendingFavoriteId(projectId);                              // 3. busy flag
  startTransition(() => {
    void setProjectFavorite({ projectId, favorite: nextFavorite })   // 4. server action
      .then(() => router.refresh())                             // 5. revalidate SSR
      .catch(() => setFavoriteOverrides((c) => ({ ...c, [projectId]: previousFavorite }))) // 6. rollback
      .finally(() => setPendingFavoriteId(null));               // 7. clear busy
  });
}
```

And the **override-merge** read side (`favoriteIds` memo): start from the SSR `favoriteProjectIds` set, then apply per-id overrides on top:

```ts
const favoriteIds = useMemo(() => {
  const ids = new Set(favoriteProjectIds);
  for (const [id, fav] of Object.entries(favoriteOverrides)) {
    if (fav) ids.add(id); else ids.delete(id);
  }
  return ids;
}, [favoriteProjectIds, favoriteOverrides]);
```

**Why this shape matters for groups:**
- The override map is keyed and *layered over* the SSR truth, so when the `router.refresh()` payload lands, the override and the truth converge to the same value and the override becomes a harmless no-op. For favorites the overrides are **not cleared** explicitly — they self-heal because the value is a boolean. (Caveat for groups in §6.2: an assign override encodes *which* group, so it must be cleared once SSR confirms the move, otherwise a later server-side move from another tab can be masked by a stale override. Note `router.refresh()` is **not** awaitable/thenable, so this clear cannot hang off a refresh `.then()` — it is driven by a `useTransition` settle effect. See the corrected §6.2 / D-8 decision.)
- Server action (`setProjectFavorite`) does `revalidatePath("/workshop")` + `revalidatePath("/workshop/projects")`. The client *additionally* calls `router.refresh()`. Both are needed: `revalidatePath` busts the server cache; `router.refresh()` re-fetches the RSC payload for the current route. Group actions must replicate **both** halves.
- Errors roll back to the snapshot. No toast today (silent rollback). For groups, recommend adding a toast (`ToastProvider` is already in `providers.tsx`) because a silently-reverted "move to group" is more confusing than a silently-reverted star.

**Server-action revalidation reference (`setProjectFavorite`):** validates UUID → `ensureDefaultWorkspace()` → scoped Supabase mutation on `project_favorites` (delete for un-fav, upsert with `onConflict: "user_id,project_id"` for fav, after verifying the project belongs to the workspace) → `revalidatePath("/workshop")` + `revalidatePath("/workshop/projects")`. **Mirror this validation + workspace-scoping + revalidation skeleton exactly for group actions.**

---

## 3. Where "organize by" mode + collapse + selected-group state should live

### 3.1 The three new pieces of UI state

| State | Recommended home | Persisted? | Storage key |
|---|---|---|---|
| `organizeBy` mode (`"none" \| "date" \| "group"`) | `useSyncExternalStore` + localStorage (mirror view-mode) | **yes** | `archestimator_projects_organize_by_v1` |
| collapsed group keys (`Set<string>`) | local `useState<Set<string>>` first; promote to localStorage if users ask | optional | `archestimator_projects_collapsed_groups_v1` (per-key, scoped) |
| "active/selected group" filter (optional, if we add a "show only group X" affordance) | local `useState<string \| null>` | no | — |

**Decision (D-2): `organizeBy` is a persisted top-level preference, modeled exactly on the existing `PROJECT_VIEW_MODE_STORAGE_KEY` machinery.** Reuse the same four helpers pattern:
- `readProjectOrganizeByPreference()` (guarded `localStorage.getItem`, fallback `"none"` or `"date"`)
- `writeProjectOrganizeByPreference(mode)` (set fallback module var + `localStorage.setItem` + `dispatchEvent(new Event(CHANGE_EVENT))`)
- `subscribeProjectOrganizeByPreference(cb)` (listen to both the custom `CHANGE_EVENT` and the native `storage` event)
- `getProjectOrganizeByServerSnapshot()` returns a stable SSR default.

This gives free **cross-tab sync** (the native `storage` event already wired in the view-mode subscriber fires in *other* tabs) and SSR-safe hydration (the server snapshot avoids hydration mismatch — note the existing code returns a hardcoded `"large"` for view mode; do the same with a hardcoded default for organize-by).

**Default value (D-2a):** default `organizeBy` to `"date"` when the current/initial sort field is date-based, else `"none"`. This preserves today's implicit date grouping for date-sort users without forcing a non-date list into a date mode.

### 3.2 Decouple grouping from sort

Today `shouldGroupProjectsByDate` is derived purely from `isDateSortField(sortField)`. Introducing `organizeBy` means:

```
shouldGroupByDate  = organizeBy === "date"
shouldGroupByGroup = organizeBy === "group"
isGrouped          = shouldGroupByDate || shouldGroupByGroup
```

Sort still applies **within** each group (and to the flat list when `organizeBy === "none"`). When `organizeBy === "group"`, the group ordering comes from the group rows' own `position` column (server-defined, set by `reorderProjectGroups`), and projects **inside** a group use the existing `sortField`/`sortDirection` (there is no membership `position` column). This cleanly reuses `compareProjectsBySort` per-group.

**Migration note for the toolbar:** the current toolbar has View / Sort field / Sort direction. Add an **"Organize by"** `DropdownSelect` (None / Date / Group) as a peer control. Selecting "Date" organize mode coerces `sortField` to `updated_at` unless it is already `created_at` or `updated_at`; selecting "Group" leaves Sort visible because it still orders cards within each group.

### 3.3 A shared grouping abstraction

Today there is `ProjectDateGroup = { key, label, items }` and `groupProjectsByDate(items, field)`. Recommend generalizing to a `ProjectGroupSection = { key, label, items, kind: "date" | "group", groupId?: string }` and adding `groupProjectsByUserGroup(items, groups)` that:
- iterates the **server-ordered** group list (so empty groups render when there is no active search),
- buckets each project by its `groupId`,
- appends an "Ungrouped" trailing section for projects with `groupId === null`.

The render block (`dateGroupedLiveProjects.map(...)` → the `<section data-project-date-group>` flag header) is **mode-agnostic** once it consumes `ProjectGroupSection[]`. This is the cleanest reuse of the horizontal-flag treatment.

---

## 4. Server data shape — what page.tsx / repository must additionally return (no N+1)

### 4.1 New DB tables (DB lane owns the migration; this is the data-contract requirement)

Mirror `project_favorites`'s workspace/user scoping and per-user RLS shape. (The canonical DDL is owned by `07` §2.1/§2.2 and `08`; the block below is the data-contract requirement, conformed to that canonical shape — single-column `group_id` FK + RLS `exists()` IDOR backstop.)

```sql
-- project_groups: the user-defined group definitions
create table public.project_groups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade, -- see D-3 (ownership scope)
  name text not null,
  accent_id text,                             -- GroupAccentId | null (D13 accents ship in v1)
  position int not null default 0,            -- explicit GROUP ordering (reorderProjectGroups)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_groups_workspace_fkey
    foreign key (workspace_id) references public.workspaces(id) on delete cascade
  -- NOTE: case-insensitive name uniqueness ships as a UNIQUE INDEX on
  --   (user_id, workspace_id, lower(name)), not a table constraint — see 07/08.
);

-- project_group_memberships: which project is in which group (membership join).
-- Single-column group_id FK + RLS exists() IDOR backstop is canonical (07/08).
-- There is NO membership `position` column — only project_groups.position orders
-- groups; cards inside a group order by the existing sortField/sortDirection.
create table public.project_group_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.project_groups(id) on delete cascade,
  project_id uuid not null,
  created_at timestamptz not null default now(),
  constraint pgm_project_workspace_fkey
    foreign key (project_id, workspace_id)
    references public.projects(id, workspace_id) on delete cascade,
  constraint pgm_unique_user_project unique (user_id, project_id)  -- one group per project (D-4)
);
```

> The single-column `group_id` FK only proves the group *exists*; the cross-user IDOR
> is closed by the RLS `with check exists(... g.user_id = auth.uid())` backstop that
> `07` §2.3 / `08` ship. This is the canonical mechanism (LD-1) — `02`'s composite
> `(group_id, workspace_id, user_id)` FK is superseded.

**Decision (D-3): groups are PER-USER, not per-workspace-shared** — modeled on `project_favorites` (`user_id` scoped). This matches favorites (each user stars their own), avoids cross-user RLS-write complexity, and is the lower-risk v1. Shared/team groups are a future product, not an implementation-time option.

**Decision (D-4): one group per project (single-membership)** via `unique (user_id, project_id)` on `project_group_memberships`. This makes "organize by group" a clean partition (every project is in exactly zero or one group → no card duplication across sections). Multi-membership would force a project card to appear in multiple flag sections, which breaks bulk-select identity (`selectedProjectIds` is a `Set<string>` of project ids — a project in two sections would have ambiguous selection). Single-membership keeps the existing selection model intact. Tags are a separate future feature.

### 4.2 Repository changes — fetch in the existing `Promise.all`, zero N+1

`listCurrentWorkspaceProjects()` already does one batched `Promise.all` of 6 queries. Add **two more** to that same batch (still one round-trip):

```ts
supabase.from("project_groups")
  .select("id, name, accent_id, position")
  .eq("workspace_id", workspace.id)
  .eq("user_id", profile.id)
  .order("position", { ascending: true }),
supabase.from("project_group_memberships")
  .select("project_id, group_id")
  .eq("workspace_id", workspace.id)
  .eq("user_id", profile.id),
```

Then build a `Map<projectId, groupId>` once and stamp each `WorkshopProjectListItem` with `groupId` inside the existing `createProjectListItem` (exactly how `favoriteEstimateSheetsByProjectId.get(project.id)` is already done). **No per-project query — O(1) map lookups**, identical to the favorites-by-project pattern already in the loader.

### 4.3 New repository return shape

```ts
// listCurrentWorkspaceProjects() return — ADD these two:
return {
  workspace,
  projects: [ ...items with groupId stamped... ],
  favoriteProjectIds: [...],
  projectGroups: ProjectGroupSummary[],      // NEW: [{ id, name, accentId, position }]
};

// Canonical shape — `07` §3.1 owns this. `accentId` maps from `accent_id`
// (D13 ships accents in v1); `position` carries the manual group order.
export type ProjectGroupSummary = {
  id: string;
  name: string;
  accentId: string | null;
  position: number;
};
```

### 4.4 `ProjectListItem` / `WorkshopProjectListItem` field addition

Add a single optional field to both types:

```ts
groupId?: string | null;   // null/undefined = Ungrouped
```

This is additive and back-compat (the sample/Storybook path via `normalizeProjectListItem` just sets `groupId: null`). **Concurrency note:** both `ProjectListItem` (client) and `WorkshopProjectListItem` (repo) are being touched by concurrent sidebar-favorites and delete-modal work — coordinate the field addition (see §9).

### 4.5 New props into `ProjectsPageClient`

```ts
type ProjectsPageClientProps = {
  projects: Array<Tables<"projects"> | ProjectListItem>;
  favoriteProjectIds?: string[];
  projectGroups?: ProjectGroupSummary[];   // NEW
};
```

`page.tsx` destructures `projectGroups` from the loader and forwards it — a one-line change mirroring `favoriteProjectIds`.

---

## 5. Mutation surface — server actions + optimistic strategy

All actions live in a new `src/lib/workshop/group-actions.ts` (NOT appended to the churning `actions.ts`; see `07` §4), `"use server"`, each following the `setProjectFavorite` skeleton: UUID validation → `ensureDefaultWorkspace()` → `assertCanGroupProject` for assignment writes → workspace-scoped + user-scoped Supabase mutation → `revalidatePath("/workshop")` + `revalidatePath("/workshop/projects")`. The canonical action names are owned by `07` §4: `createProjectGroup`, `renameProjectGroup`, `recolorProjectGroup`, `deleteProjectGroup`, `reorderProjectGroups`, `moveProjectToGroup` (single assign incl. remove), `bulkAssignProjectsToGroup`.

`assertCanGroupProject` must verify all of these before insert/upsert/delete: project belongs to the current workspace, project belongs to the current user's `Your Projects` surface, the current user owns the grouping row, and any non-null group id exists for the same `(workspace_id, user_id)`. Shared projects, pending-invite projects, and project-member-only access are denied for v1 grouping even if the row is visible in another access tab.

| Action | Signature | Optimistic UI strategy | Revalidation |
|---|---|---|---|
| `createProjectGroup` | `({ name, accentId? }) → { id }` | Append a temp group section with a `temp-` id; on success just `router.refresh()` and let SSR replace it | `revalidatePath` ×2 + `router.refresh()` |
| `renameProjectGroup` | `({ groupId, name })` | Optimistically update label in a `groupNameOverrides` map; rollback on error | same |
| `recolorProjectGroup` | `({ groupId, accentId \| null })` | Optimistically update the accent in a `groupAccentOverrides` map; rollback on error | same |
| `deleteProjectGroup` | `({ groupId })` | Optimistically drop the section; its projects fall to "Ungrouped" (since members cascade-delete). Snapshot for rollback | same |
| `reorderProjectGroups` | `({ orderedGroupIds })` | Optimistically reorder a `groupOrderOverride` array; rollback on error | same |
| `moveProjectToGroup` | `({ projectId, groupId \| null })` | **Per-project override** `groupOverrides: Record<projectId, groupId\|null>` layered over SSR `groupId` (favorites pattern + clear-after-refresh, §6.2); `pendingGroupAssignId` for busy. `groupId: null` ⇒ remove from group | same |
| `bulkAssignProjectsToGroup` | `({ projectIds, groupId \| null })` | Apply override for every id in one `setGroupOverrides`; one server call; rollback ALL on error; clear all keys once SSR reflects the move (§6.2) | same |

**Decision (D-5): `moveProjectToGroup` is the close twin of `toggleProjectFavorite`** — same override-map + snapshot + `startTransition` + server-action + `router.refresh()` + rollback-on-error shape. The one deliberate divergence is the clear-after-refresh handling in §6.2 (an override encodes *which* group, not a self-converging boolean). The read side mirrors `favoriteIds`: a `groupIdByProjectId` memo that starts from SSR `item.groupId` and applies `groupOverrides` on top.

**Decision (D-6): bulk assign uses ONE server action call, not N.** `bulkAssignProjectsToGroup` takes an array and does a single upsert/delete batch server-side (the bulk-delete flow already proves the array-action pattern: `executeBulkDeleteProjects({ projectIds, ... })`). This keeps the optimistic apply/rollback atomic and avoids N refreshes.

**Decision (D-7): `createProjectGroup` resolves the temp-id problem by preferring `router.refresh()` over manual id-swapping.** Because the page is SSR, after `createProjectGroup` succeeds we `router.refresh()` and the real group arrives with its real id. The optimistic temp section is only to avoid a flash; once refresh lands it's replaced wholesale. Avoid trying to thread the returned real id into the override map — let SSR be the reconciler. (Same reasoning as favorites self-healing.)

**Cache invalidation summary:** Every group action does the **same two-part invalidation** as favorites: server `revalidatePath("/workshop")` + `revalidatePath("/workshop/projects")` (the sidebar shows favorites and could later show groups, so `/workshop` matters), and client `router.refresh()`. No TanStack Query cache to touch (per D-1).

---

## 6. Edge cases in state (the hard part)

### 6.1 Switching `organizeBy` mode mid multi-select
`selectedProjectIds: Set<string>` is keyed by **project id**, independent of how projects are visually grouped. Switching None↔Date↔Group **must not clear the selection** — the same project ids remain selected, they just re-bucket into different flag sections. **Action:** do NOT reset `selectedProjectIds` on `organizeBy` change. But: `selectableDisplayProjectIds` / `selectedVisibleProjectIds` are derived from `displayLiveProjects` (post-filter), so a project filtered out by search still drops from "visible selected" — that behavior is already correct and mode-agnostic. Verify the bulk toolbar's "select visible" respects the *current* grouped view's flattened visible set (it already iterates `selectableDisplayProjectIds`, which is computed from the flat `displayLiveProjects` regardless of grouping — correct).

### 6.2 Optimistic assign while a `router.refresh()` is in flight (the override-staleness trap)
Favorites tolerate this because the override is a boolean that converges. For **group assignment**, an override is "project X → group A". Sequence risk:
1. User moves X to A → override `{X: A}` set, server call fires, `router.refresh()` issued.
2. Refresh lands with SSR still showing X in old group B (race) — override wins, shows A. Good.
3. But if the override is **never cleared** and later SSR (from a *different* mutation) legitimately shows X in C, the stale `{X: A}` override masks C.

**The mechanism trap:** `router.refresh()` returns `void` — it is **not** a thenable, so the override cannot be cleared in a `.then()` chained off the refresh call. (This was the broken D14 mechanism the audit flagged.) The correct pattern mirrors the live favorites implementation's transition handling.

**Decision (D-8, corrected — LD-6): clear the per-project group override only once SSR is authoritative for that id, driven by `useTransition` + a settle effect — never early.** Concretely:
- Wrap the action call **and** `router.refresh()` together inside `startTransition` from `useTransition`. The transition's `isPending` flag tracks the RSC refresh completion (it stays `true` until the refreshed Server Component payload has rendered).
- Clear the override in a `useEffect` that fires when the transition has **settled** (`isPending` flips `false`) **and** the incoming SSR `item.groupId` for that id equals the override value — i.e. SSR now reflects the move. Equivalently, clear an id's override the moment the SSR prop for that id reflects the move (`item.groupId === groupOverrides[id]`), whichever the Phase-4 owner verifies against live code. Either way the **invariant** holds: the override is dropped only once SSR is the source of truth for that id, with **no early-clear flicker** back to a stale group.
- On failure (the action rejects): restore the previous override value (or delete the key if there was none) AND fire a failure toast (D-13). Rollback runs in the transition's error path, not on a refresh `.then()`.
- This is a *deliberate divergence* from the favorites pattern (which leaves booleans in place to self-heal) and must be called out in the Phase-4 plan. Add an **interleaving test**: a rapid re-assign issued while a prior refresh is still pending must not flicker the card to the stale SSR group. (Conforms to `07` §5.5; mirrored in `11` Task 6.1.)

### 6.3 Two tabs open — storage event
`organizeBy` persisted via the view-mode machinery gets **free cross-tab sync** (native `storage` event in `subscribe*`). Group *data* (names, membership) does **not** auto-sync across tabs — Tab A creating a group won't appear in Tab B until Tab B re-renders the Server Component. **Acceptable for v1** because favorites have the same limitation today. Defer any `BroadcastChannel("archestimator:project-groups")` refresh bridge unless implementation QA proves the parity behavior is confusing.

### 6.4 Group deleted server-side while UI shows it (cross-tab / concurrent)
- A project whose `groupId` points to a now-deleted group: because `project_group_memberships` cascade-deletes with the group, the next SSR load returns `groupId: null` for those projects → they fall to "Ungrouped" automatically. No client crash (the grouping function must treat an unknown `groupId` as Ungrouped — **defensive requirement**: `groupProjectsByUserGroup` buckets any project whose `groupId` isn't in the current `projectGroups` list into "Ungrouped", not into a phantom section).
- An optimistic `moveProjectToGroup({groupId})` targeting a group that was just deleted server-side: the server action's upsert will fail the FK (`group_id` references `project_groups`) → the transition's error path rolls back the override and fires a failure toast (exact copy is the Phase-4 owner's call per D-13; do not over-specify here). This is handled by the standard rollback path.
- `renameProjectGroup`/`reorderProjectGroups` on a deleted group: server action returns 0 rows affected or FK error → rollback. Treat "0 rows" as a soft no-op + refresh (the group is simply gone after refresh).

### 6.5 Empty groups under "organize by group"
Empty named groups render when there is no active search so users can create-then-fill. This requires `groupProjectsByUserGroup` to iterate the **server group list** (not just groups present in the data), already specified in §3.3. Under active search, empty groups hide.

### 6.6 Search + group interaction
Search filters `displayLiveProjects` *before* grouping (existing order: search → sort → group). A group whose every project is filtered out should **collapse to nothing** (don't render an empty flag for it during an active search) — i.e., empty-group rendering (§6.5) applies only when `!searchQuery.trim()`. This mirrors how date groups already vanish when search empties them.

### 6.7 Bulk-delete a project that's in a group
`executeBulkDeleteProjects` cascades `project_group_memberships` (the FK is `on delete cascade` via `projects`). After delete + `router.refresh()`, the project is gone from its group section automatically. The existing delete-success handler already prunes `selectedProjectIds` and clears `expandedProject` — no group-specific cleanup needed beyond letting SSR reflect the cascade.

---

## 7. Recommended new client state (final shape for `ProjectsPageClient`)

```ts
// Preference (persisted, useSyncExternalStore — mirror view-mode):
const organizeBy = useSyncExternalStore(subscribeOrganizeBy, readOrganizeBy, getOrganizeByServerSnapshot);

// Group data from SSR props:
//   projectGroups: ProjectGroupSummary[]   (prop)
//   each item.groupId: string | null       (prop, stamped by repo)

// Optimistic overlays (transient, mirror favoriteOverrides):
const [groupOverrides, setGroupOverrides] = useState<Record<string, string | null>>({});      // projectId -> groupId|null
const [groupNameOverrides, setGroupNameOverrides] = useState<Record<string, string>>({});       // groupId -> name
const [groupAccentOverrides, setGroupAccentOverrides] = useState<Record<string, string | null>>({}); // groupId -> accentId|null (D13)
const [groupOrderOverride, setGroupOrderOverride] = useState<string[] | null>(null);            // ordered groupIds
const [pendingGroupAssignId, setPendingGroupAssignId] = useState<string | null>(null);          // busy: which project
const [pendingGroupMutationId, setPendingGroupMutationId] = useState<string | null>(null);      // busy: which group (rename/delete/reorder)

// Local UI (transient):
const [collapsedGroupKeys, setCollapsedGroupKeys] = useState<Set<string>>(() => new Set());

// Derived (memo, mirror favoriteIds):
const groupIdByProjectId = useMemo(() => { /* SSR item.groupId, then apply groupOverrides */ }, [...]);
const resolvedGroups = useMemo(() => { /* projectGroups (incl. accentId) + name/accent/order overrides */ }, [...]);
```

**Why local `useState` for collapse (not a store):** collapse is ephemeral view state with no cross-component consumers and modest persistence value. Promoting to localStorage is a small follow-up (key `archestimator_projects_collapsed_groups_v1`) only if users report losing expansion on refresh. Start local. (Date-group collapse doesn't exist today, so this is net-new for both modes — apply uniformly.)

**Why NOT a Zustand store for any of this:** the only consumer is `ProjectsPageClient`. Zustand in this codebase is reserved for state shared across the estimate workspace tree (`estimate-ui-store`) or app-wide navigation (`navigation-ui-store`). A single-component concern stays in component state, consistent with how favorites/sort/select already live.

---

## 8. Data-flow diagram (target state)

```
[DB] project_groups, project_group_memberships (per-user)
   │  (one batched Promise.all, +2 queries, no N+1)
   ▼
listCurrentWorkspaceProjects()  ──►  { projects(+groupId), favoriteProjectIds, projectGroups }
   │
   ▼  (RSC props)
page.tsx  ──►  <ProjectsPageClient projects favoriteProjectIds projectGroups />
   │
   ▼  (client memos)
groupIdByProjectId = SSR groupId ⊕ groupOverrides
resolvedGroups     = projectGroups ⊕ name/accent/order overrides
   │
   ▼  organizeBy ∈ {none,date,group}
none → flat grid │ date → groupProjectsByDate │ group → groupProjectsByUserGroup
   │
   ▼  same horizontal-flag <section data-project-...-group> render
LiveProjectCard[]  (+ per-card "move to group" affordance → moveProjectToGroup)

MUTATIONS (all): optimistic override → startTransition(serverAction + router.refresh)
  → on reject: rollback override + failure toast
  → busy tracked via transition isPending
GROUP-ASSIGN clear: useEffect drops the override key only once isPending settles
  AND SSR item.groupId reflects the move (NEVER in a refresh .then — router.refresh
  is not thenable)
serverAction also: revalidatePath("/workshop") + revalidatePath("/workshop/projects")
```

---

## 9. Concurrency collisions (files other lanes/agents are touching NOW)

The working tree has **uncommitted** changes to files this feature must also edit. Treat as moving targets:

| File | Concurrent work in flight | Collision for Project Groups |
|---|---|---|
| `projects-page-client.tsx` | bulk-delete preview modal, card-layout, favorites | **HIGH** — we add `organizeBy` state, group overrides, new render branch. Will conflict on the toolbar `filterSlot`, the render block, and the state-declaration block. Coordinate ordering of state hooks. |
| `src/components/workshop/LiveProjectCard.tsx` | favorites + delete-modal UX | **MEDIUM** — we add a "move to group" affordance / group badge. New props (`groupId`, `onAssignGroup`). |
| `workspace-repository.ts` | sidebar-favorites + delete plan | **HIGH** — `listCurrentWorkspaceProjects` return shape and `WorkshopProjectListItem` type both change. The `Promise.all` batch and `createProjectListItem` are the exact merge points. |
| `MainSidebar.tsx` / `sidebar-types.ts` | Sidebar-Favorite-Projects-And-Estimates plan | **LOW–MEDIUM** — if groups later appear in the sidebar, `MainSidebarFavoriteProject` type and the favorites section are the integration point. Out of scope for v1 page work, but the `revalidatePath("/workshop")` we add will refresh the sidebar too. |
| `ProjectDetailsModal.tsx` | delete-modal UX plan | **LOW** — a "move to group" control could live in the details modal; coordinate with the delete-modal changes there. |
| tests: `projects-page-*.test.tsx` | being updated concurrently | **MEDIUM** — new tests for organize-by/group rendering must not clobber the in-flight card-layout/sort/shared-access test edits. |

**Recommendation:** land the **repository + type + page.tsx prop** changes (§4) first and in a tight, reviewable diff, because that's the shared dependency every UI lane builds on, and it's where the highest-churn concurrent edits are.

---

## 10. Resolved decisions and implementation follow-ups

- **Resolved:** default `organizeBy` uses the owner default in `00` (`date` when current/initial sort is date-based, else `none`).
- **Resolved:** groups are per-user and private in v1; shared/team groups are out of scope.
- **Resolved:** empty named groups are visible when not searching and hidden under active search if they have no matches.
- **Resolved:** one group per project; many-to-many belongs to a future Tags feature.
- **Resolved:** primary assignment surfaces are card kebab and bulk dock; details-modal assignment is fast-follow by default.
- **Implementation follow-up:** cross-tab data sync remains favorites parity; no `BroadcastChannel` in v1 unless the implementation discovers a user-visible stale-data regression that tests cannot cover.
