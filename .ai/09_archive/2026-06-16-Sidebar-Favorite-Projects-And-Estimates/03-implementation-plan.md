# 03 — Implementation Plan

**Goal:** Toggling favorite on a project or estimate updates every relevant local surface and the
sidebar Favorites section optimistically, stays correct after reload/navigation, and removes
`router.refresh()` as the sidebar propagation mechanism.

> **Audit-2 note (2026-06-16):** A second adversarial audit (7 persona reviewers + 2 code-verification
> agents, all reading real source) revised several contracts in this doc. The biggest changes: the
> client loader is a **Server Action, not a Route Handler** (D3); the query uses **`staleTime: 0`** and
> **no bespoke reconcile-on-mount** (D4); optimistic inserts **synthesize a timestamp** (D11); `workspaceId`
> must be **explicitly sourced and threaded** (D2); and there are **two mutation hooks**, not one (D13). The
> read/render half of this feature is **already built uncommitted in the worktree** — see
> `12-cross-plan-coordination.md`. Verify line numbers before editing; the repo is dirty.

---

## 1. Recommended route

### Route A — Scoped TanStack Query reactive sidebar favorites

Convert the sidebar favorites list into a TanStack Query cache entry seeded from SSR `initialData`.
Both project and estimate favorite mutations patch that one scoped cache optimistically, then
reconcile via a `"use server"` loader used as the `queryFn`.

**Decision:** Route A is mandatory for this task.

**Why:** It is the only route that satisfies immediate in-page reactivity and the project state
mandate: Supabase/Postgres is persisted truth, TanStack Query owns server state, Zustand is for
interaction state.

### Rejected route B — Dedicated Zustand favorites store

Rejected because sidebar favorites are server state. Zustand would create a second server-state
cache and hand-roll invalidation, retries, and rollback semantics.

### Rejected route C — Server invalidation only

`revalidatePath`, `updateTag`, or `revalidateTag(tag, "max")` can improve server-cache correctness
for subsequent visits, but they do not give immediate in-place sidebar reactivity. Route C is a
backstop, not the feature.

### Rejected mechanism — Route Handler loader **(audit-2)**

An earlier draft fetched the loader through a Route Handler at
`src/app/workshop/favorites/sidebar/route.ts` + a client `fetch()` fetcher. Rejected (D3): every
existing client-callable query in this codebase uses a `"use server"` function as its `queryFn`
(`fetchProjectCollaborationSummary`, `fetchEstimateTree`, `loadProjectComponentRowsLibrary`); none
uses a route handler. The route handler also added auth/`Cache-Control`/`force-dynamic` foot-guns the
Server Action avoids. Use a Server Action (below).

---

## 2. Concrete contracts

### Query key (scoped, single builder)

```ts
// src/lib/favorites/query-keys.ts
export const favoritesQueryKeys = {
  all: () => ["favorites"] as const,
  sidebar: (scope: { workspaceId: string; userId: string }) =>
    [...favoritesQueryKeys.all(), "sidebar", scope.workspaceId, scope.userId] as const,
};
```

Server and client must build this key with the **same** helper. Do not use `["favorites", "sidebar"]`
for this user-specific data (D2).

### Scope sourcing (closes the audit-2 blocker)

`getCurrentUserContext()` returns `userId` but **not** `workspaceId` (verified `src/lib/auth/session.ts`).
`WorkshopPageShell` must obtain `workspace.id` via `ensureDefaultWorkspace()` (the call
`listMainSidebarFavoriteProjects()` already makes internally) and pass `{ workspaceId, userId }` as
explicit new props to `MainSidebar`. The toggle hooks receive the same scope (via props or a tiny
context). All three sites build the key through `favoritesQueryKeys.sidebar(scope)`; a mismatch means
optimistic patches write to a different cache entry than the sidebar reads, and the feature silently fails.

### Client-callable loader (Server Action, not a route handler)

```ts
// src/lib/favorites/sidebar-favorites-actions.ts
"use server";
import { listMainSidebarFavoriteProjects } from "@/lib/repositories/workspace-repository";
import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";

export async function fetchSidebarFavoriteProjects(): Promise<MainSidebarFavoriteProject[]> {
  // listMainSidebarFavoriteProjects() calls ensureDefaultWorkspace() -> requireCurrentUserContext(),
  // which authenticates server-side. In a Server Action context redirect() behaves correctly.
  return listMainSidebarFavoriteProjects();
}
```

Used directly as the `queryFn` (matches `fetchProjectCollaborationSummary`). `initialData` alone is not
enough — `invalidateQueries` needs a real loader to reconcile (D3). Server-side auth and the absence of a
CDN-cacheable GET surface are covered in `13-security-and-cache-contract.md`.

### Sidebar DTO (timestamp-bearing, non-null at shaping)

```ts
type MainSidebarFavoriteProject = {
  id: string;
  name: string;
  projectCode: string | null;
  href: string;
  favoriteCreatedAt: string;            // non-null at shaping time (D11)
  favoriteEstimateSheets: MainSidebarFavoriteEstimateSheet[];
};

type MainSidebarFavoriteEstimateSheet = {
  id: string;
  projectId: string;
  name: string;
  sheetCode: string | null;
  href: string;
  favoriteCreatedAt: string;            // non-null at shaping time (D11)
};
```

`listMainSidebarFavoriteProjects()` already **selects** `created_at` (`workspace-repository.ts:1211,1230`)
but currently **drops** it during shaping (`:1259-1265`, `:1276-1282`). Add `favoriteCreatedAt` at **both**
the type site (`sidebar-types.ts`) **and** the two shaping sites — not just the type.

### Optimistic timestamp (D11)

On an optimistic insert the prior favorite state is `null`, so the toggle hook synthesizes
`favoriteCreatedAt = new Date().toISOString()` so the new favorite sorts to the **top** under
`favoriteCreatedAt DESC` (mirrors `ProjectEstimateFavoriteButton.tsx:50`). `onSettled` reconciliation
replaces it with the server timestamp. Mutation **inputs** type the field `string | null` (the prior value);
the hook synthesizes, the caller does not.

### Mutation inputs

Mutation inputs must be fat enough for optimistic UI, but metadata is UI-only and non-authoritative.
Server actions still accept only validated ids plus a runtime-validated boolean and derive
workspace/user authority server-side (D14).

```ts
type ToggleProjectFavoriteInput = {
  project: {
    id: string;
    name: string;
    projectCode: string | null;
    href: string;
    favoriteCreatedAt: string | null;  // prior-state value; hook synthesizes on insert
  };
  favorite: boolean;
};

type ToggleEstimateFavoriteInput = {
  estimate: {
    id: string;
    projectId: string;
    name: string;
    sheetCode: string | null;
    href: string;
    favoriteCreatedAt: string | null;
  };
  project: {
    id: string;
    name: string;
    projectCode: string | null;
    href: string;
    isSidebarFavorite: boolean;
  };
  favorite: boolean;
};
```

Optimistic hrefs must be constructed from authorized DTO ids, not treated as server authority.

### Query lifecycle (two hooks + shared helper, D13)

- `useSidebarFavoritesQuery({ scope, initialData })` reads `favoritesQueryKeys.sidebar(scope)` and sets
  **`staleTime: 0`** (overriding the global 5-min default) so invalidation and per-route remount actually
  refetch (D4). `initialData` seeds first paint. **No bespoke reconcile-on-mount `useEffect`** — the
  always-mounted observer + `staleTime: 0` reconcile natively.
- On scope change, explicitly `queryClient.removeQueries({ queryKey: favoritesQueryKeys.sidebar(previousScope) })`
  before rendering favorite links or registering hover/focus prefetch routes (D12; key change alone does not
  evict). On logout, clear `favoritesQueryKeys.all()` (D12, `13`).
- `useToggleProjectFavorite` and `useToggleEstimateFavorite` are **separate** hooks sharing a small internal
  helper (`patchSidebarFavoritesCache` / `rollbackSidebarFavoritesCache`):
  - `onMutate` cancels the scoped query (`cancelQueries`), snapshots previous sidebar data **and** previous
    local-surface state, then writes the optimistic state (synthesizing the timestamp per D11).
  - `onError` rolls back sidebar **and** local surface from the **same** snapshot (one error signal).
  - `onSettled` invalidates the scoped key so the loader refetches; a stale in-flight refetch cannot win
    because the next `onMutate` cancels it (race-safety proof in `11-root-cause-confirmation-and-race-safety.md`).

---

## 3. Files to modify

New files (5):

- `src/lib/favorites/query-keys.ts` — scoped key factory + `buildSidebarFavoritesScopeKey`.
- `src/lib/favorites/sidebar-favorites.ts` — pure shaping/sort/trim helpers + DTO-building.
- `src/lib/favorites/sidebar-favorites-actions.ts` — `"use server"` loader used as the queryFn.
- `src/hooks/use-sidebar-favorites-query.ts` — query hook (`staleTime: 0`, scope eviction).
- `src/hooks/use-toggle-project-favorite.ts` **and** `src/hooks/use-toggle-estimate-favorite.ts` —
  two mutation hooks sharing an internal cache-patch/rollback helper (D13). (Counts as the mutation surface;
  the shared helper may live in `sidebar-favorites.ts` or a `use-toggle-favorite-internals.ts`.)

> Removed vs the prior draft: `src/app/workshop/favorites/sidebar/route.ts` and
> `src/lib/favorites/sidebar-favorites-client.ts` are **gone** (D3 — Server Action replaces them).

Existing files to edit:

- `src/components/sidebar/sidebar-types.ts` — add `favoriteCreatedAt` to both DTO levels (already dirty).
- `src/components/sidebar/MainSidebar.tsx` — consume live query data; build the empty/loading/overflow/focus/
  live-region states from `08`; **the empty state does not exist today and must be built** (currently renders
  `null` when empty). Already dirty; rebase onto the uncommitted render baseline (`12`).
- `src/components/workshop/WorkshopPageShell.tsx` — source `workspace.id` via `ensureDefaultWorkspace()`; pass
  `initialData` + `{ workspaceId, userId }` to `MainSidebar`. Already dirty.
- `src/components/workshop/projects-page-client.tsx` — replace the `router.refresh()` path in
  `toggleProjectFavorite` (verified at **line 508**, not 483 — file is dirty from unrelated grouping work).
- `src/components/workshop/WorkshopHomebaseClient.tsx` — route `removeRemovedProjectFavorite` (`:73-84`)
  through `useToggleProjectFavorite`; **preserve** its `router.replace("/workshop", { scroll: false })`
  navigation (D8). Not currently dirty.
- `src/app/workshop/projects/[projectId]/estimates/page.tsx` — thread parent-project sidebar metadata.
- `src/components/workshop/ProjectEstimatesClient.tsx` — pass parent-project metadata (already dirty: it has
  unrelated favorites-filter scaffolding — do not regress it; see `12`).
- `src/components/workshop/ProjectEstimatesTable.tsx` — pass metadata to the favorite button (not dirty).
- `src/components/workshop/ProjectEstimateFavoriteButton.tsx` — use the shared estimate mutation lifecycle;
  it already synthesizes the optimistic timestamp at `:50` — keep that behavior.
- `src/lib/workshop/actions.ts` — runtime-validate `favorite` (exact shape, D14), add `workspace_id` to the
  project-favorite delete filter (authz), preserve server-side authority. **Defer** the `ignoreDuplicates`
  alignment unless a test forces it (D14).

Tests (see `07` for exact names and `09` for ordering):

- `tests/vitest/main-sidebar-favorites.test.tsx` — **already exists (untracked)** with the current
  no-timestamp, prop-fed DTO. **Update**, do not create: add `favoriteCreatedAt` to fixtures, wrap the render
  in a `QueryClientProvider` (the query-wired `MainSidebar` needs one), and adapt to query-driven rendering.
- `tests/vitest/sidebar-favorites-shaping.test.ts` — new pure-helper test (sort/trim/caps, timestamp synth).
- `tests/vitest/project-favorite-sidebar-mutation.test.tsx` — new project mutation/component test.
- `tests/vitest/estimate-favorite-sidebar-mutation.test.tsx` — new estimate mutation/component test.
- Optional Playwright sidebar reactivity spec when authenticated state is available.

---

## 4. Phased plan

### Phase 0 — Safety net and scope lock
- Run `git status --short --branch` and `git diff --stat HEAD`; read `12-cross-plan-coordination.md`.
- Re-read every required file (the worktree is dirty and line numbers have drifted; the read/render half is
  already built uncommitted — build **on** it, do not re-create it).
- Add/adjust failing tests for current stale-sidebar behavior where practical.

Gate: file ownership understood; the uncommitted read baseline is reconciled with this plan.

### Phase 1 — Scoped read layer
- Add scoped query keys + shared key builder.
- Add `favoriteCreatedAt` to sidebar DTOs **and** to the two shaping sites in the repository reader.
- Add the `"use server"` loader and use it as the `queryFn`.
- Source `workspace.id` in `WorkshopPageShell`; pass `initialData` + `{ workspaceId, userId }`.
- Add `useSidebarFavoritesQuery` with `staleTime: 0` and explicit scope-change eviction.
- Update `MainSidebar` to render query data + the loading/empty states from `08`.

Gate: first paint has no flash; per-route navigation reconciles fresh SSR data (verify the queryFn actually
refetches — `staleTime: 0`); a scope change removes the previous scope's entry before any favorite link or
prefetch renders.

### Phase 2 — Estimate favorite mutation
- Add `useToggleEstimateFavorite` (shared internal helper).
- Keep `ProjectEstimatesStore` for the table row, driven from the same mutation lifecycle.
- If the parent project is visible in the scoped sidebar favorites within the top-8 cap, insert/remove the
  nested sheet; otherwise leave the sidebar unchanged and fire the **required** legibility cue (D5, `08`).

Gate: estimate-under-visible-favorited-parent updates row + sidebar; estimate under a non-favorited or hidden
parent updates row only **and** announces the cue; rollback reverts all touched surfaces from one snapshot.

### Phase 3 — Project favorite mutation
- Add `useToggleProjectFavorite` (shared internal helper).
- Replace the `projects-page-client.tsx` `router.refresh()` dependency.
- Route `WorkshopHomebaseClient.tsx`'s removed-project favorite action through the same hook while keeping its
  `router.replace` navigation (D8).

Gate: project card/sidebar update optimistically; homebase is not a divergent path; no `router.refresh()`
remains for favorite propagation.

### Phase 4 — Server action hygiene
- Runtime-validate `favorite`: `if (typeof favorite !== "boolean") throw new Error("Invalid input.")` in both
  actions (D14).
- Derive workspace/user server-side and validate ids as today.
- Add `workspace_id` to the project-favorite delete filter (authz, not just consistency — `13`).
- Keep existing `revalidatePath`. Do **not** add one-arg `revalidateTag` (compile error in Next 16; D7).
- **Defer** `ignoreDuplicates` alignment unless the test below proves it wrong (then escalate to blocker).

Gate: invalid UUID, non-boolean favorite, unauthorized project id, and cross-workspace estimate id fail closed
with client-safe errors.

### Phase 5 — UX states, security, and verification
- Implement the expanded UX states in `08` (loading/skeleton, focus management, live regions, insert animation).
- Apply the cache/security contract in `13` (logout clear, scope eviction, no-store posture, input validation).
- Add focused tests for helper shape/sort/limit/timestamp-synth, rollback, rapid toggles, scope mismatch,
  logout cache clear, focus survival, and security negatives.
- Run the repro + rapid-toggle scenarios in `11` and the QA matrix in `10`; record evidence.
- Run focused validation from `07` and `09`.
- Update `.ai/10_state/decisions.md` only after implementation evidence exists.

---

## 5. Edge cases

1. 9th project favorite: helper trims visible sidebar to 8 by `favoriteCreatedAt DESC`.
2. 6th sheet favorite: helper trims visible sheets to 5 by `favoriteCreatedAt DESC`.
3. Estimate under non-favorited project: row star updates; sidebar no-ops **and** the required cue fires (D5).
4. Estimate under a favorited parent outside the visible top-8: row star updates; sidebar unchanged + cue.
5. Rapid double-toggle: `cancelQueries` in `onMutate` discards stale refetches; latest intent wins (`11` §4).
6. Mutation error: rollback restores previous sidebar, project override, and/or table row from one snapshot.
7. Scope mismatch / logout: old user/workspace favorites are explicitly removed before render/prefetch (`13`).
8. Long/unicode/instruction-like names: render as text/`title` only, never HTML (React escapes; verify `title`).
9. Empty favorites: expanded sidebar shows the `08` empty hint (net-new — no empty element exists today).
10. Optimistic insert with a just-synthesized timestamp sorts to top; `onSettled` swaps in the server value.

---

## 6. Rollback

Phase 1 is not a no-op; it changes the sidebar read source. Rollback by reverting the query boundary and
returning `MainSidebar` to prop-fed rendering (the uncommitted prop-fed baseline is the natural fallback).

If Phase 2 or 3 misbehaves, revert hook usage in the toggle component while keeping the tests that document
expected final behavior. The app degrades to the non-reactive sidebar rather than a wrong optimistic one.

Use a `REACTIVE_SIDEBAR_FAVORITES_ENABLED` flag only if concurrent Project Groups work makes a one-commit
rollout risky (the preflight dirty-file check in `09`/`12` decides this); do not add a permanent flag for this
narrow fix.

---

## 7. Out of scope

- Supabase Realtime/multi-device live sync.
- Parent-project auto-promotion when a sheet is favorited (the cheaper inline "Pin project too?" affordance is
  noted as a future option, not MVP — D5).
- Dedicated shared/non-owned favorites data model.
- New `/favorites` route (the overflow "go to Projects" line is its future hook — `08`).
- Full mobile favorites drawer.
- Schema/RLS changes.
- `ignoreDuplicates` upsert alignment (deferred follow-up unless a test forces it — D14).
