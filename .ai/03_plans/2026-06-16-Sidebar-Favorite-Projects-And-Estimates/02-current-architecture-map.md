# 02 — Current Architecture Map (ground truth)

Reference map of the favorites feature as it exists today. Verify line numbers before editing
(repo on `codex/fix-project-delete`; graph built on `main`).

> **Working-tree reality (audit-2, 2026-06-16):** The **read/render half** of this feature is already built
> but **uncommitted** in this worktree (not on `main`): `listMainSidebarFavoriteProjects()` and the 8/5
> constants in `workspace-repository.ts`, the sidebar DTO types in `sidebar-types.ts` (without
> `favoriteCreatedAt`), the entire Favorites render block in `MainSidebar.tsx`, and the fetch/prop wiring in
> `WorkshopPageShell.tsx`. The **reactive half** is unbuilt. Line numbers below are from this dirty branch and
> have drifted from any `main`-built graph. Full file-by-file reality + cross-plan ownership:
> `12-cross-plan-coordination.md`.

---

## 1. Data layer

### Tables (migration `supabase/migrations/20260526013617_workshop_favorites.sql`)

Both favorites are **per-user, workspace-scoped JOIN tables** — there are **no boolean columns** on
`projects`/`estimates`.

```sql
create table public.project_favorites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null,
  created_at timestamptz not null default now(),
  constraint project_favorites_unique_user_project unique (user_id, project_id)
);

create table public.estimate_favorites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null,
  estimate_id uuid not null,
  created_at timestamptz not null default now(),
  constraint estimate_favorites_unique_user_estimate unique (user_id, estimate_id)
);
```

### Read functions
| Function | File | Purpose |
|---|---|---|
| `listMainSidebarFavoriteProjects()` | `src/lib/repositories/workspace-repository.ts:1205` (React `cache()`; constants `MAIN_SIDEBAR_FAVORITE_PROJECT_LIMIT = 8` / `..._SHEET_LIMIT = 5` at `:126-127`) | **The sidebar's data source.** Reads `project_favorites` (limit 8, `created_at DESC`) → projects → their `estimate_favorites` (limit 5/project) → estimates. Returns nested favorite projects+sheets. **Selects `created_at` (`:1211,:1230`) but drops it during shaping (`:1259-1265`, `:1276-1282`)** — the fix must emit it as `favoriteCreatedAt` (D11). |
| `listCurrentUserEstimateFavoriteCreatedAtById(ids)` | `src/lib/repositories/estimate-favorites-repository.ts:5` | Map estimate_id → created_at, used by the estimates list page. |
| inline queries in `listCurrentWorkspaceProjects()` / `getWorkshopHomebaseData()` | `workspace-repository.ts:~806 / ~992` | Populate `isFavorite` / `favoriteCreatedAt` on project & estimate summaries. |

### Write functions (server actions, `src/lib/workshop/actions.ts`)
| Action | Lines | Behavior | Revalidates |
|---|---|---|---|
| `setProjectFavorite({projectId, favorite})` | 25–70 | upsert/delete `project_favorites` | `/workshop`, `/workshop/projects` |
| `setEstimateFavorite({estimateId, favorite})` | 72–124 | upsert/delete `estimate_favorites` | `/workshop`, `/workshop/projects/{id}/estimates` |

### DTO fields
`WorkshopProjectSummary`, `WorkshopEstimateSummary` (`workspace-repository.ts:47–71`) and
`ProjectEstimateListRow` (`src/lib/estimates/project-estimate-list-row.ts:17`) all carry
`isFavorite: boolean` + `favoriteCreatedAt: string | null`.

---

## 2. UI / component map

| Concern | Component / file | Notes |
|---|---|---|
| Sidebar shell (server) | `src/components/workshop/WorkshopPageShell.tsx:~69,89,110` | Fetches `listMainSidebarFavoriteProjects()`, passes prop to `MainSidebar` |
| Sidebar (client) | `src/components/sidebar/MainSidebar.tsx:84` (prop), render block `~238–294`, `getFavoriteLinkClassName()` `~68–82` | Renders Favorites from prop. **There is NO empty state today** — `:238` renders `null` when `favoriteProjects.length === 0`. The `08` empty hint is **net-new to build**, not "wire". |
| Sidebar types | `src/components/sidebar/sidebar-types.ts` | Favorite project/sheet prop types |
| Project toggle | `src/components/workshop/projects-page-client.tsx:508` `toggleProjectFavorite` (drifted from 483; `favoriteOverrides` decl `:391`, `router.refresh()` `:514`) | optimistic `favoriteOverrides` + `router.refresh()` |
| Project card star UI | `src/components/workshop/LiveProjectCard.tsx:~228` | click → `toggleProjectFavorite` |
| Estimate toggle | `src/components/workshop/ProjectEstimateFavoriteButton.tsx:42` `toggleFavorite` | optimistic store patch, **no refresh** |
| Estimate table star UI | `src/components/workshop/ProjectEstimatesTable.tsx:~275` | click → `toggleFavorite` |
| Estimate list client | `src/components/workshop/ProjectEstimatesClient.tsx` | owns the per-mount `ProjectEstimatesStore` |
| Homebase favorites | `src/components/workshop/WorkshopHomebaseClient.tsx:73-84` `removeRemovedProjectFavorite` | calls `setProjectFavorite({favorite:false})` then **`router.replace("/workshop", {scroll:false})`** — a navigation, **not** `router.refresh()`. Not currently dirty. |
| Estimates page (server) | `src/app/workshop/projects/[projectId]/estimates/page.tsx:13–46` | composes favorites into list rows |
| Projects page (server) | `src/app/workshop/projects/page.tsx` | renders `WorkshopPageShell` |
| Workshop layout | `src/app/workshop/layout.tsx:17–34` | auth gate only; returns `children` |

---

## 3. State architecture conventions (the rules the fix must honor)

### Documented mandate — `.ai/06_specs/state-and-supabase-foundation.md` (approved 2026-05-18)
Three-layer model:
1. **Supabase/Postgres** — canonical persisted data.
2. **TanStack Query** — *server state*: caching, optimistic mutations, retries, invalidation.
3. **Zustand** — *high-frequency UI/interaction state only*: selection, focus, expanded nodes, panels.

> The sidebar favorites list is **server state** → it belongs in **TanStack Query**, not Zustand,
> under this mandate. (See `03` for the recommendation that follows from this.)

### TanStack Query setup — `src/app/providers.tsx:14–47`
- One `QueryClient` in `AppProviders`. Defaults: `staleTime: 5min`, `gcTime: 5min`,
  `refetchOnWindowFocus: false`, query `retry: 1`, mutation `retry: 0`.

### Query-key convention
- Const tuples, hierarchical, centralized in factory modules
  (`src/lib/component-library/query-keys.ts`; per-hook factories like `estimateQueryKeys` in
  `src/hooks/use-estimate-query.ts:10`). Prefix-matching enables broad invalidation.
- **No favorites query key exists yet** — the fix introduces one.

### SSR → client hydration convention
- Server component fetches → passes as prop → client `useQuery({ initialData })`.
  Examples: `use-estimate-query.ts:25` (`initialNodes`), `use-project-collaboration-query.ts:20`
  (`initialSummary`). **This is the exact pattern the sidebar fix should follow.**

### Mutation propagation conventions (in tension — this is the bug's habitat)
- Older convention: `revalidatePath()` (server) + sometimes `router.refresh()` (client).
- Newer, preferred convention (decisions D2/D10, `.ai/10_state/decisions.md`, 2026-06-14):
  **patch a client cache/store synchronously and avoid `router.refresh()`** — proven with the
  per-mount `ProjectEstimatesStore` and `LibraryPageClient`.
- The favorites feature is **stuck on the old convention** and hasn't adopted the new one for the
  cross-route sidebar case. The fix completes that migration for favorites.

### Next config
- `next.config.ts:64`: `experimental.staleTimes = { dynamic: 60, static: 180 }` affects implicit
  Router Cache reuse on navigation and prefetch. It is **not** evidence that explicit
  `router.refresh()` is broken; `01` retracts that older claim. It remains relevant to the
  cross-route query seeding policy because client navigation can otherwise preserve warm route/query
  state longer than a user expects.

### Next 16 cache invalidation boundary
- Installed docs mark the one-argument `revalidateTag(tag)` form deprecated.
- Tags must be attached to actual cached data via `fetch(..., { next: { tags } })` or `cacheTag()`
  inside a supported cache scope.
- The current sidebar reader is React `cache()` plus Supabase, so "tag the reads" is **not** a
  mechanical edit. The MVP should keep existing `revalidatePath` unless implementation deliberately
  creates a valid taggable read boundary.

### Policy boundaries
- `.ai/10_state/decisions.md` (2026-06-03) intentionally suppresses non-owned shared favorites until
  a dedicated shared-favorite model and authorization design exists.
- Favorites remain first-class per-user rows (`project_favorites`, `estimate_favorites`) and must not
  be represented as project/estimate metadata booleans.
- Any client query cache must be scoped by both workspace and authenticated user to avoid leaking
  favorite names or hrefs across account/workspace changes.
- **Scope sourcing caveat (audit-2):** `getCurrentUserContext()` (`src/lib/auth/session.ts`) returns `userId`
  but **not** `workspaceId`. `WorkshopPageShell` must call `ensureDefaultWorkspace()` to obtain `workspace.id`
  for the scope key, and thread `{ workspaceId, userId }` to `MainSidebar` and the toggle hooks (D2). No
  client surface currently holds `workspaceId`.
- **Logout cache hygiene (audit-2):** `signOut` (`src/lib/auth/actions.ts`) and `RealtimeAuthBridge` do **not**
  clear the QueryClient, so any per-user cache survives logout for `gcTime` (5 min). The favorites cache must
  be cleared on logout (D12, `13` C5).

---

## 4. Asymmetries between project & estimate favoriting (pre-existing)

| Aspect | Project | Estimate |
|---|---|---|
| Upsert flags | `onConflict: "user_id,project_id"` | `ignoreDuplicates: true, onConflict: "user_id,estimate_id"` |
| Delete filter | `user_id, project_id` | `workspace_id, user_id, estimate_id` |
| Client refresh | `router.refresh()` | none |
| Optimistic target | local React state (card) | per-mount Zustand store (table row) |
| Revalidated paths | `/workshop`, `/workshop/projects` | `/workshop`, `/workshop/projects/{id}/estimates` |

These inconsistencies are catalogued and severity-ranked in `04-code-review-findings.md`.
