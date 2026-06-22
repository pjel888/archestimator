# Sidebar Favorite Projects & Estimates — Master Implementation Guide

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This is the single executable guide; docs `00`–`13` in this folder are its source of truth and are cited inline as `(03 §2)`, `(D4)`, `(13 C5)`, `(QA-17)`, etc.

**Goal:** Make the sidebar Favorites section update optimistically and reactively when a user toggles favorite on a project or an estimate — without `router.refresh()` — staying correct after reload/navigation, scoped per user+workspace, with full rollback and accessibility.

**Architecture:** Convert the prop-fed `MainSidebar` favorites list into a scoped TanStack Query cache (`["favorites","sidebar",workspaceId,userId]`) seeded by SSR `initialData`, loaded by a `"use server"` action used as the `queryFn`, with `staleTime: 0`. Two mutation hooks (`useToggleProjectFavorite`, `useToggleEstimateFavorite`) sharing one cache-patch helper drive optimistic `setQueryData` + single-snapshot rollback + invalidate-on-settle. Server actions are hardened; logout and scope-change clear the cache.

**Tech Stack:** Next.js 16.2.6 (App Router, Server Actions), React 19.2.6, @tanstack/react-query 5.100.14, Supabase, Zustand (per-mount estimates store), Vitest (`bunx vitest run <file> --maxWorkers=1`), `bun run type-check`.

---

## 1. How to use this guide

1. **Read the source docs once** (map in §2). This guide synthesizes them; when in doubt, the cited doc wins.
2. **Do Phase 0 first** — the working tree is dirty and the read/render half of this feature is *already built uncommitted*. You build **on** it, you do not re-create it (`12`).
3. **Execute phases in order (0 → 5).** Each phase has a verbatim exit gate; do not start the next phase until the gate is green.
4. **Every task is TDD:** write the failing test → run it (expect FAIL) → minimal implementation → run it (expect PASS) → `bun run type-check` where types changed → commit. Steps are 2–5 minutes each.
5. **Honor the contract pinboard (§5).** All phases use the *same* names/signatures. Three deliberate harmonizations are noted in §5.3 — follow them so the phases stay consistent.
6. **`⚠️ confirm against <file:line>`** markers mean: the drafted code is grounded in real source but the exact existing signature must be verified at implementation time (the tree is dirty / line refs drift). Do not invent — verify. All such markers are also collected in the appendix (§13).
7. **Record QA evidence** (Phase 5 / §11) before declaring done.

## 2. Source-document map

| Doc | Role in implementation |
|---|---|
| `00-README.md` | Orientation, recommended direction, success criteria. |
| `01-root-cause-analysis.md` | Why it's broken (two distinct bugs); the read/write paths. |
| `02-current-architecture-map.md` | Ground-truth file/line map; verified corrections (no empty state, workspaceId gap, Homebase `router.replace`). |
| `03-implementation-plan.md` | The canonical contracts, file list, phases, gates, rollback. **This guide operationalizes `03`.** |
| `04-code-review-findings.md` | Severity-ranked findings (P0/P1/P2) the phases close. |
| `05-scorecard-and-readiness-audit.md` | Honest scores + the audit-2 findings→resolutions table. |
| `06-decision-register.md` | Decisions **D1–D14** — the binding choices cited throughout. |
| `07-requirements-traceability.md` | Requirements **R1–R20** → units/files/tests/QA. |
| `08-ux-interaction-state-spec.md` | All UX states: loading, empty, overflow, pending, error, focus, live regions, animation. |
| `09-implementation-task-packet.md` | Ordered tasks with phase labels (this guide expands them into TDD steps). |
| `10-ultraqa-adversarial-scenarios.md` | QA matrix **QA-01–QA-22** + evidence report shape. |
| `11-root-cause-confirmation-and-race-safety.md` | Repro guidance + proof Route A has no equivalent race; residual register. |
| `12-cross-plan-coordination.md` | Working-tree reality + shared-file ownership with the sibling Project Groups plan. |
| `13-security-and-cache-contract.md` | Loader auth posture, scope eviction, logout clear, input validation, threat model. |

## 3. SWOT analysis (the chosen approach — Route A)

**Strengths**
- Fits the documented three-layer state mandate (TanStack Query owns server state); the sidebar list *is* server state (`02 §3`).
- Uses the codebase's own established `"use server"`-action-as-`queryFn` precedent (`fetchProjectCollaborationSummary`) — no new abstraction, minimal surface (D3).
- One optimistic lifecycle (snapshot → patch → settle/invalidate) gives instant reactivity, single-snapshot rollback, and latest-intent-wins race-safety (`11 §4`).
- Removes the fragile `router.refresh()` dependency that both candidate root causes hinge on (`11 §3`).
- Read/render half already exists uncommitted, so Phase 1 is largely wiring, not greenfield (`12`).

**Weaknesses**
- Correctness depends on `staleTime: 0` on *this* query (the global 5-min default silently defeats reconciliation — verified, D4). A regression here is invisible until cross-route navigation goes stale.
- Scope (`workspaceId`) is not where the plan first assumed — must be sourced via `ensureDefaultWorkspace()` and threaded to three client surfaces; a mismatch silently no-ops the feature (D2).
- Per-mount Zustand estimates store must be driven from the mutation lifecycle without entering the shared cache — a coupling the estimate hook must handle.

**Opportunities**
- Establishes the reactive-cache mutation convention the sibling Project Groups plan should then adopt (instead of cloning the `router.refresh()` pattern it currently plans) (`12 §4`, D10).
- The overflow "go to Projects" line is a natural future hook for a `/favorites` management surface (`08`).
- The shared cache-patch helper is reusable for any future favorites surface.

**Threats**
- Concurrent agents editing the same five high-collision files (MainSidebar, sidebar-types, workspace-repository, WorkshopPageShell, projects-page-client) (`12 §3`).
- The exact Next-internal repaint cause was never reproduced — accepted residual; the fix removes the dependency, but confirm via Repro A/B (`11 §5`).
- A future edit reintroducing `router.refresh()` or inheriting the global `staleTime` would silently regress reactivity (guarded by grep + tests).

## 4. Route comparison — pros & cons

| Route | Pros | Cons | Verdict |
|---|---|---|---|
| **A — Scoped TanStack Query (chosen)** | Matches state mandate + house convention; instant reactivity; one rollback snapshot; removes `router.refresh()`. | Requires `staleTime:0` discipline + scope threading. | **Mandatory (D1/D3/D4).** |
| B — Dedicated Zustand favorites store | Simple mental model ("a store"). | Duplicates server-state cache semantics; hand-rolls invalidation/retry/rollback; violates the three-layer mandate. | Rejected (D1). |
| C — Server invalidation only (`revalidatePath`/tags) | Improves next-visit correctness. | No immediate in-place reactivity — does not solve the bug. | Backstop only. |
| (mechanism) Route Handler loader | A GET endpoint. | Deviates from convention; needs explicit auth + `no-store` + `force-dynamic`; mis-parses `redirect()`-on-unauth. | Rejected for a `"use server"` action (D3, `13 C1`). |

## 5. Global contract pinboard

All phases MUST use these exact names/signatures. (Pulled from `03 §2` + D2/D3/D4/D11/D13/D14.)

### 5.1 Types & keys
```ts
// src/lib/favorites/query-keys.ts
export const favoritesQueryKeys = {
  all: () => ["favorites"] as const,
  sidebar: (scope: { workspaceId: string; userId: string }) =>
    [...favoritesQueryKeys.all(), "sidebar", scope.workspaceId, scope.userId] as const,
};

// src/components/sidebar/sidebar-types.ts — favoriteCreatedAt is NON-NULL at shaping time (D11)
type MainSidebarFavoriteEstimateSheet = { id: string; projectId: string; name: string; sheetCode: string | null; href: string; favoriteCreatedAt: string };
type MainSidebarFavoriteProject = { id: string; name: string; projectCode: string | null; href: string; favoriteCreatedAt: string; favoriteEstimateSheets: MainSidebarFavoriteEstimateSheet[] };

type SidebarFavoritesScope = { workspaceId: string; userId: string };
```

### 5.2 Functions & hooks
```ts
// src/lib/favorites/sidebar-favorites.ts (pure)
export function sortByFavoriteCreatedAtDesc<T extends { favoriteCreatedAt: string }>(items: T[]): T[];
export function trimSidebarFavorites(projects: MainSidebarFavoriteProject[]): MainSidebarFavoriteProject[]; // 8 projects, 5 sheets each

// src/lib/favorites/sidebar-favorites-cache.ts (pure) — the CANONICAL op union (harmonized, see 5.3)
export type SidebarFavoriteCacheOp =
  | { kind: "project-insert"; project: { id: string; name: string; projectCode: string | null; href: string; favoriteCreatedAt: string } }
  | { kind: "project-remove"; projectId: string }
  | { kind: "estimate-insert"; parentId: string; sheet: Omit<MainSidebarFavoriteEstimateSheet, "favoriteCreatedAt">; createdAt: string }
  | { kind: "estimate-remove"; parentId: string; sheetId: string };
export function patchSidebarFavoritesCache(prev: MainSidebarFavoriteProject[] | undefined, op: SidebarFavoriteCacheOp): MainSidebarFavoriteProject[];

// src/lib/favorites/sidebar-favorites-actions.ts
"use server"; export async function fetchSidebarFavoriteProjects(): Promise<MainSidebarFavoriteProject[]>;

// src/hooks/use-sidebar-favorites-query.ts
export function useSidebarFavoritesQuery(args: { scope: SidebarFavoritesScope; initialData: MainSidebarFavoriteProject[] }): UseQueryResult<MainSidebarFavoriteProject[]>;
//   useQuery({ queryKey: favoritesQueryKeys.sidebar(scope), queryFn: fetchSidebarFavoriteProjects, initialData, staleTime: 0 }) + removeQueries on scope change

// src/hooks/use-toggle-project-favorite.ts
export type ToggleProjectFavoriteInput = { project: { id: string; name: string; projectCode: string | null; href: string; favoriteCreatedAt: string | null }; favorite: boolean };
export function useToggleProjectFavorite(scope: SidebarFavoritesScope): { toggle: (input: ToggleProjectFavoriteInput, options?: ToggleCallbacks) => void; isPending: boolean };

// src/hooks/use-toggle-estimate-favorite.ts
export type ToggleEstimateFavoriteInput = {
  estimate: { id: string; projectId: string; name: string; sheetCode: string | null; href: string; favoriteCreatedAt: string | null };
  project: { id: string; name: string; projectCode: string | null; href: string; isSidebarFavorite: boolean };
  favorite: boolean;
  store?: ProjectEstimatesStore; // per-mount row surface; NEVER serialized into the shared cache
};
export function useToggleEstimateFavorite(scope: SidebarFavoritesScope, announceCue?: () => void): { toggle: (input: ToggleEstimateFavoriteInput, options?: ToggleCallbacks) => void; isPending: boolean };

// shared per-call callbacks (D13 parity — lets callers roll back LOCAL surfaces from the same error signal)
type ToggleCallbacks = { onSuccess?: () => void; onError?: () => void; onSettled?: () => void };
```

Existing server actions (DO NOT rename): `setProjectFavorite({ projectId, favorite })`, `setEstimateFavorite({ estimateId, favorite })` in `src/lib/workshop/actions.ts`. Constants `MAIN_SIDEBAR_FAVORITE_PROJECT_LIMIT = 8`, `MAIN_SIDEBAR_FAVORITE_SHEET_LIMIT = 5` (`workspace-repository.ts:126-127`).

### 5.3 Three harmonizations (resolve drafting drift — follow these exactly)
1. **Canonical op union (above):** use `project-insert` / `project-remove` / `estimate-insert` / `estimate-remove` — a single discriminated union in `sidebar-favorites-cache.ts`. (The phase drafts briefly used a `{kind:"project",favorite,project}` variant; do **not** — use the four-arm union.) The project/estimate hooks pick the arm from the `favorite` boolean and synthesize `favoriteCreatedAt` (D11) before building the op.
2. **`toggle(input, options?)` for BOTH hooks:** `toggle: (input, options?) => mutation.mutate(input, options)`. Hook-level `onError` rolls back the **shared cache** from the one snapshot; the caller's call-level `options.onError` rolls back **its local surface** (card override / pending id / banner) — both fire on the one error signal (TanStack runs hook-level then call-level). This is how the project card override, the `pendingFavoriteId`, and the Homebase `router.replace`-on-success are wired without leaking React state into the hooks.
3. **Per-mount Zustand `store`** travels on `ToggleEstimateFavoriteInput.store` (a non-serialized field), never inside `setQueryData`. The estimate hook snapshots the row's pre-patch `{isFavorite, favoriteCreatedAt}` in mutation `context` alongside the sidebar snapshot, so one `onError` restores both.

## 6. Concurrency & vigilance protocol (`12`)

- **Five high-collision files** are shared with the sibling Project Groups plan: `MainSidebar.tsx`, `sidebar-types.ts`, `workspace-repository.ts`, `WorkshopPageShell.tsx`, `projects-page-client.tsx`. Re-run `git status` before editing each; rebase your edit onto in-flight changes rather than overwrite.
- **Line refs drift** — the tree is dirty (e.g. `toggleProjectFavorite` is at `:508`/`:510`, not 483). Re-confirm every line anchor with `rg` before editing.
- **Never revert unrelated dirty files** (project-grouping, delete-modal, card polish, favorites-filter scaffolding in `ProjectEstimatesClient`).
- **Announce ownership** of the five files before large edits if other agents are active.
- The read/render baseline (`listMainSidebarFavoriteProjects`, sidebar DTO types, the `MainSidebar` Favorites block, the shell wiring) is **uncommitted** — build on it; consider committing it as its own PR first (`12 §6`).

---

## Phase 0 — Preflight & scope lock

**Goal:** Understand the dirty working tree, confirm the uncommitted read/render baseline, and lock line anchors before any edit. **No production code changes.**

**Exit gate (`03 §4 Phase 0`):** file ownership understood; the uncommitted read baseline is reconciled with this plan.

- [ ] **Step 1: Capture working-tree state.**
```bash
cd /Users/philiplewis/Documents/archestimator
git status --short --branch
git diff --stat HEAD
```
Expected: the favorites read/render files (`workspace-repository.ts`, `sidebar-types.ts`, `MainSidebar.tsx`, `WorkshopPageShell.tsx`) are modified/uncommitted; unrelated files (`projects-page-client.tsx`, `LiveProjectCard.tsx`, `ProjectEstimatesClient.tsx`, several tests) are also dirty. Read `12` and confirm which dirty changes are *not* yours.

- [ ] **Step 2: Confirm the read baseline exists.**
```bash
rg -n "listMainSidebarFavoriteProjects|MAIN_SIDEBAR_FAVORITE_(PROJECT|SHEET)_LIMIT" src/lib/repositories/workspace-repository.ts
rg -n "favoriteProjects" src/components/sidebar/MainSidebar.tsx src/components/sidebar/sidebar-types.ts src/components/workshop/WorkshopPageShell.tsx
```
Expected: the function + constants exist (~`:1205`, `:126-127`); `MainSidebar` is prop-fed (no `useQuery`); DTO types lack `favoriteCreatedAt`.

- [ ] **Step 3: Lock the moving anchors.**
```bash
rg -n "function toggleProjectFavorite|router.refresh|favoriteOverrides" src/components/workshop/projects-page-client.tsx
rg -n "removeRemovedProjectFavorite|router.replace|setProjectFavorite" src/components/workshop/WorkshopHomebaseClient.tsx
rg -n "ignoreDuplicates|workspace_id|assertUuid|revalidatePath" src/lib/workshop/actions.ts
```
Record the real line numbers you find; the guide's anchors are snapshots.

- [ ] **Step 4: Confirm the existing test that you will UPDATE (not create).**
```bash
rg -n "favoriteCreatedAt|QueryClientProvider" tests/vitest/main-sidebar-favorites.test.tsx || echo "neither present — fixtures lack timestamps + no provider, as expected"
```

- [ ] **Step 5: Decide the rollout-flag question.** If concurrent Project Groups work makes a one-commit rollout risky, plan a temporary `REACTIVE_SIDEBAR_FAVORITES_ENABLED` flag (do not add a permanent flag). Otherwise skip (`03 §6`, `09`). No commit in Phase 0.

---

## Phase 1 — Scoped Read Layer

Convert the sidebar Favorites list from a static SSR prop into a **scoped TanStack Query cache** keyed by `["favorites","sidebar",workspaceId,userId]`, seeded by SSR `initialData`, with a `"use server"` loader as the `queryFn`, timestamp-bearing DTOs, and `staleTime: 0` so every per-route remount and future `invalidateQueries` reconciles to server truth. **No mutations in this phase.**

**Exit gate (verbatim, `03 §4 Phase 1`):**
> Gate: first paint has no flash; per-route navigation reconciles fresh SSR data (verify the queryFn actually refetches — `staleTime: 0`); a scope change removes the previous scope's entry before any favorite link or prefetch renders.

### Pros / cons (Phase 1)
- **`staleTime: 0` (override global 5-min, `providers.tsx:18`)** — Pro: always-mounted observer + `staleTime:0` make per-route remount re-seed + background-refetch, and `onSettled` invalidation (Phase 2/3) actually refetch — no bespoke reconcile effect (D4). Con: one background refetch per shell remount; invisible because `initialData` paints first.
- **Server-action loader (not Route Handler)** — Pro: matches the only repo precedent; POST-only, not CDN-cacheable, authenticates server-side (`13 C1`). Con: marginally heavier than a GET, but dissolves the auth/no-store/redirect foot-guns.
- **Native reconcile (no `useEffect`)** — Pro: less code, library-correct staleness. Con: depends on `staleTime:0` surviving on this query — verification greps for it.

### Task 1.1 — Query keys + pure shaping helpers (sort/trim)

**Files:** Create `src/lib/favorites/query-keys.ts`, `src/lib/favorites/sidebar-favorites.ts`; Test `tests/vitest/sidebar-favorites-shaping.test.ts`.

- [ ] **Step 1: Write the failing test** — `tests/vitest/sidebar-favorites-shaping.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { favoritesQueryKeys } from "@/lib/favorites/query-keys";
import { sortByFavoriteCreatedAtDesc, trimSidebarFavorites } from "@/lib/favorites/sidebar-favorites";

describe("favoritesQueryKeys", () => {
  it("builds a scoped, stable sidebar key", () => {
    expect(favoritesQueryKeys.all()).toEqual(["favorites"]);
    expect(favoritesQueryKeys.sidebar({ workspaceId: "ws-1", userId: "u-1" })).toEqual([
      "favorites", "sidebar", "ws-1", "u-1",
    ]);
  });
});

describe("sortByFavoriteCreatedAtDesc", () => {
  it("orders newest first without mutating input", () => {
    const input = [
      { id: "a", favoriteCreatedAt: "2026-06-10T00:00:00.000Z" },
      { id: "b", favoriteCreatedAt: "2026-06-16T00:00:00.000Z" },
      { id: "c", favoriteCreatedAt: "2026-06-12T00:00:00.000Z" },
    ];
    expect(sortByFavoriteCreatedAtDesc(input).map((i) => i.id)).toEqual(["b", "c", "a"]);
    expect(input.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });
});

describe("trimSidebarFavorites", () => {
  const project = (id: string, createdAt: string, sheetCount: number) => ({
    id, name: `Project ${id}`, projectCode: null, href: `/workshop/projects/${id}`,
    favoriteCreatedAt: createdAt,
    favoriteEstimateSheets: Array.from({ length: sheetCount }, (_, index) => ({
      id: `${id}-sheet-${index}`, projectId: id, name: `Sheet ${index}`, sheetCode: null,
      href: `/workshop/projects/${id}/estimates/${id}-sheet-${index}`,
      favoriteCreatedAt: `2026-06-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
    })),
  });
  it("caps to 8 projects + 5 sheets, newest first", () => {
    const projects = Array.from({ length: 9 }, (_, i) =>
      project(`p${i}`, `2026-06-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`, 6));
    const trimmed = trimSidebarFavorites(projects);
    expect(trimmed).toHaveLength(8);
    expect(trimmed[0]?.id).toBe("p8");
    expect(trimmed.some((p) => p.id === "p0")).toBe(false);
    for (const p of trimmed) {
      expect(p.favoriteEstimateSheets).toHaveLength(5);
      const times = p.favoriteEstimateSheets.map((s) => s.favoriteCreatedAt);
      expect([...times].sort().reverse()).toEqual(times);
    }
  });
});
```
- [ ] **Step 2: Run — expect FAIL** (`Cannot find module '@/lib/favorites/query-keys'`):
```bash
bunx vitest run tests/vitest/sidebar-favorites-shaping.test.ts --maxWorkers=1
```
- [ ] **Step 3: Implement `src/lib/favorites/query-keys.ts`:**
```ts
export const favoritesQueryKeys = {
  all: () => ["favorites"] as const,
  sidebar: (scope: { workspaceId: string; userId: string }) =>
    [...favoritesQueryKeys.all(), "sidebar", scope.workspaceId, scope.userId] as const,
};
```
- [ ] **Step 4: Implement `src/lib/favorites/sidebar-favorites.ts`:**
```ts
import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";

const MAIN_SIDEBAR_FAVORITE_PROJECT_LIMIT = 8;
const MAIN_SIDEBAR_FAVORITE_SHEET_LIMIT = 5;

/** Newest favorite first. Pure: returns a new array, does not mutate `items`. */
export function sortByFavoriteCreatedAtDesc<T extends { favoriteCreatedAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.favoriteCreatedAt < b.favoriteCreatedAt ? 1 : -1));
}

/** Cap to the visible window: 8 projects, 5 sheets each, both newest-first. Trim BEFORE optimistic insert (08). */
export function trimSidebarFavorites(projects: MainSidebarFavoriteProject[]): MainSidebarFavoriteProject[] {
  return sortByFavoriteCreatedAtDesc(projects)
    .slice(0, MAIN_SIDEBAR_FAVORITE_PROJECT_LIMIT)
    .map((project) => ({
      ...project,
      favoriteEstimateSheets: sortByFavoriteCreatedAtDesc(project.favoriteEstimateSheets).slice(
        0, MAIN_SIDEBAR_FAVORITE_SHEET_LIMIT,
      ),
    }));
}
```
- [ ] **Step 5: Run — expect PASS:**
```bash
bunx vitest run tests/vitest/sidebar-favorites-shaping.test.ts --maxWorkers=1
```
- [ ] **Step 6: Type-check + commit:**
```bash
bun run type-check
git add src/lib/favorites/query-keys.ts src/lib/favorites/sidebar-favorites.ts tests/vitest/sidebar-favorites-shaping.test.ts
git commit -m "feat(favorites): scoped query keys + pure sidebar shaping helpers"
```

### Task 1.2 — Add `favoriteCreatedAt` to DTOs + the two repository shaping sites

**Files:** Modify `src/components/sidebar/sidebar-types.ts` (both DTOs); Modify `src/lib/repositories/workspace-repository.ts` (sheet shaping `~:1259-1265`, project shaping `~:1276-1282`). Gated by `bun run type-check`.

- [ ] **Step 1: Update `sidebar-types.ts`** — add the non-null field to both DTOs (D11):
```ts
export type MainSidebarFavoriteEstimateSheet = {
  href: string; id: string; name: string; projectId: string; sheetCode: string | null;
  favoriteCreatedAt: string;
};
export type MainSidebarFavoriteProject = {
  favoriteEstimateSheets: MainSidebarFavoriteEstimateSheet[];
  href: string; id: string; name: string; projectCode: string | null;
  favoriteCreatedAt: string;
};
```
- [ ] **Step 2: Run type-check — expect FAIL** (the two shaping sites now omit a required field):
```bash
bun run type-check
```
Expected: `Property 'favoriteCreatedAt' is missing` at `workspace-repository.ts` sheet + project shaping. ⚠️ confirm against `workspace-repository.ts:1259-1265` and `:1276-1282`.
- [ ] **Step 3: Patch sheet shaping** (`favorite.created_at` is in scope from the `:1230` select):
```ts
    sheets.push({
      href: `/workshop/projects/${estimate.project_id}/estimates/${estimate.id}`,
      id: estimate.id, name: estimate.name, projectId: estimate.project_id,
      sheetCode: estimate.sheet_code,
      favoriteCreatedAt: favorite.created_at,
    });
```
- [ ] **Step 4: Patch project shaping** (`favorite.created_at` from the `:1211` select):
```ts
      {
        favoriteEstimateSheets: sheetsByProjectId.get(project.id) ?? [],
        href: `/workshop/projects/${project.id}`,
        id: project.id, name: project.name, projectCode: project.project_code,
        favoriteCreatedAt: favorite.created_at,
      },
```
⚠️ confirm `created_at` is non-null in the select rows; if nullable in generated types, coerce at the select or assert non-null (`workspace-repository.ts:1211,:1230`).
- [ ] **Step 5: Run type-check + the 1.1 test — expect PASS; commit:**
```bash
bun run type-check
bunx vitest run tests/vitest/sidebar-favorites-shaping.test.ts --maxWorkers=1
git add src/components/sidebar/sidebar-types.ts src/lib/repositories/workspace-repository.ts
git commit -m "feat(favorites): carry favoriteCreatedAt through sidebar DTOs + repository shaping"
```

### Task 1.3 — The `"use server"` loader

**Files:** Create `src/lib/favorites/sidebar-favorites-actions.ts`. Gated by `bun run type-check` (mirrors `summary-actions.ts`; the precedent has no standalone unit test).

- [ ] **Step 1: Implement** (D3, `13 C1`):
```ts
"use server";
import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";
import { listMainSidebarFavoriteProjects } from "@/lib/repositories/workspace-repository";

/**
 * Client-callable read of the sidebar favorite projects (Route A / D3 / D4).
 * Used directly as the queryFn of useSidebarFavoritesQuery; initialData seeds
 * first paint and this reconciles on every staleTime:0 remount + onSettled
 * invalidate. listMainSidebarFavoriteProjects() authenticates server-side via
 * ensureDefaultWorkspace() -> requireCurrentUserContext() (13 C1).
 */
export async function fetchSidebarFavoriteProjects(): Promise<MainSidebarFavoriteProject[]> {
  return listMainSidebarFavoriteProjects();
}
```
⚠️ confirm `listMainSidebarFavoriteProjects` is exported from `@/lib/repositories/workspace-repository` (`:1205`).
- [ ] **Step 2: Type-check + commit:**
```bash
bun run type-check
git add src/lib/favorites/sidebar-favorites-actions.ts
git commit -m "feat(favorites): use-server loader for sidebar favorites query"
```

### Task 1.4 — `useSidebarFavoritesQuery` (`staleTime: 0` + scope-change eviction)

**Files:** Create `src/hooks/use-sidebar-favorites-query.ts`; Test `tests/vitest/use-sidebar-favorites-query.test.tsx`.

- [ ] **Step 1: Write the failing test:**
```ts
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { favoritesQueryKeys } from "@/lib/favorites/query-keys";
import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";
import { useSidebarFavoritesQuery } from "@/hooks/use-sidebar-favorites-query";

vi.mock("@/lib/favorites/sidebar-favorites-actions", () => ({
  fetchSidebarFavoriteProjects: vi.fn(async () => [] as MainSidebarFavoriteProject[]),
}));
const project = (id: string): MainSidebarFavoriteProject => ({
  id, name: `Project ${id}`, projectCode: null, href: `/workshop/projects/${id}`,
  favoriteCreatedAt: "2026-06-16T00:00:00.000Z", favoriteEstimateSheets: [],
});
const wrap = (client: QueryClient) => ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

describe("useSidebarFavoritesQuery", () => {
  it("paints initialData synchronously", () => {
    const client = new QueryClient();
    const initialData = [project("p1")];
    const { result } = renderHook(
      () => useSidebarFavoritesQuery({ scope: { workspaceId: "ws-1", userId: "u-1" }, initialData }),
      { wrapper: wrap(client) });
    expect(result.current.data).toEqual(initialData);
  });
  it("removeQueries-evicts the previous scope on scope change", async () => {
    const client = new QueryClient();
    const removeSpy = vi.spyOn(client, "removeQueries");
    const { rerender } = renderHook(
      ({ workspaceId, userId }: { workspaceId: string; userId: string }) =>
        useSidebarFavoritesQuery({ scope: { workspaceId, userId }, initialData: [project("p1")] }),
      { wrapper: wrap(client), initialProps: { workspaceId: "ws-1", userId: "u-1" } });
    rerender({ workspaceId: "ws-2", userId: "u-1" });
    await waitFor(() => expect(removeSpy).toHaveBeenCalledWith({
      queryKey: favoritesQueryKeys.sidebar({ workspaceId: "ws-1", userId: "u-1" }),
    }));
  });
});
```
- [ ] **Step 2: Run — expect FAIL** (`Cannot find module '@/hooks/use-sidebar-favorites-query'`):
```bash
bunx vitest run tests/vitest/use-sidebar-favorites-query.test.tsx --maxWorkers=1
```
- [ ] **Step 3: Implement** (D4 staleTime:0; D12/C4 explicit eviction):
```ts
"use client";
import { useEffect, useRef } from "react";
import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";
import { favoritesQueryKeys } from "@/lib/favorites/query-keys";
import { fetchSidebarFavoriteProjects } from "@/lib/favorites/sidebar-favorites-actions";

type SidebarFavoritesScope = { workspaceId: string; userId: string };

export function useSidebarFavoritesQuery(args: {
  scope: SidebarFavoritesScope; initialData: MainSidebarFavoriteProject[];
}): UseQueryResult<MainSidebarFavoriteProject[]> {
  const { scope, initialData } = args;
  const queryClient = useQueryClient();

  // D12 / C4: a key change alone does NOT evict the old entry (lingers gcTime, 5 min).
  const previousScopeRef = useRef(scope);
  useEffect(() => {
    const previous = previousScopeRef.current;
    if (previous.workspaceId !== scope.workspaceId || previous.userId !== scope.userId) {
      queryClient.removeQueries({ queryKey: favoritesQueryKeys.sidebar(previous) });
      previousScopeRef.current = scope;
    }
  }, [queryClient, scope.workspaceId, scope.userId, scope]);

  return useQuery({
    queryKey: favoritesQueryKeys.sidebar(scope),
    queryFn: fetchSidebarFavoriteProjects,
    initialData,
    staleTime: 0, // D4: override global 5-min so remount + onSettled invalidation refetch
  });
}
```
- [ ] **Step 4: Run — expect PASS; type-check; commit:**
```bash
bunx vitest run tests/vitest/use-sidebar-favorites-query.test.tsx --maxWorkers=1
bun run type-check
git add src/hooks/use-sidebar-favorites-query.ts tests/vitest/use-sidebar-favorites-query.test.tsx
git commit -m "feat(favorites): useSidebarFavoritesQuery with staleTime 0 + scope eviction"
```

### Task 1.5 — `WorkshopPageShell` sources `workspace.id` and threads scope + initialData

**Files:** Modify `src/components/workshop/WorkshopPageShell.tsx` (fetch `~:89`, render `~:110`, import `~:13`). Type-gated; committed with 1.6 (the prop contract becomes required there).

`getCurrentUserContext()` returns `userId` but NOT `workspaceId` (D2). `listMainSidebarFavoriteProjects()` already calls `ensureDefaultWorkspace()`; the shell calls it too for `workspace.id`.

- [ ] **Step 1: Add import** (`:13`):
```ts
import { ensureDefaultWorkspace, listMainSidebarFavoriteProjects } from "@/lib/repositories/workspace-repository";
```
- [ ] **Step 2: Source scope + initialData** (replace the `:89` fetch; favorites only when authed):
```ts
  const sidebarFavoriteScope = currentUser
    ? { workspaceId: (await ensureDefaultWorkspace()).workspace.id, userId: currentUser.id }
    : null;
  const sidebarFavoriteProjects = sidebarFavoriteScope ? await listMainSidebarFavoriteProjects() : [];
```
⚠️ confirm `currentUser.id` vs `currentUser.userId` (`src/lib/auth/session.ts`); ⚠️ confirm `ensureDefaultWorkspace()` returns `{ workspace: { id } }` (used at `workspace-repository.ts:1206`).
- [ ] **Step 3: Thread props** (`:110`):
```tsx
      <MainSidebar
        favoriteProjects={sidebarFavoriteProjects}
        favoritesScope={sidebarFavoriteScope}
        status={sidebarStatus}
        user={sidebarUser}
      />
```
- [ ] **Step 4:** type-check will FAIL until 1.6 adds `favoritesScope` to `MainSidebarProps` — commit folded into 1.6.

### Task 1.6 — `MainSidebar` renders query data + empty hint + loading skeleton

**Files:** Modify `src/components/sidebar/MainSidebar.tsx` (props `~:33-37`, body `~:84`, render `~:238-294`, header `~:222-236`); UPDATE `tests/vitest/main-sidebar-favorites.test.tsx` (existing — add `favoriteCreatedAt` fixtures + `QueryClientProvider`).

Makes `MainSidebar` consume `useSidebarFavoritesQuery` (prop arrives as `initialData`). Net-new: the **empty hint** (component renders `null` when empty today, `:294`) and the **loading skeleton** (`08`). Live regions + focus JS land in Phase 5; Phase 1 adds the empty hint, skeleton, and the `data-sidebar-favorites-header` `tabIndex={-1}` rescue target.

- [ ] **Step 1: Update the failing test** — `tests/vitest/main-sidebar-favorites.test.tsx` (preserve any unrelated logo-width assertions already in the file):
```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { MainSidebar } from "@/components/sidebar/MainSidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/projects/project-1/estimates/sheet-1",
  useRouter: () => ({ prefetch: vi.fn() }),
}));
vi.mock("@/lib/favorites/sidebar-favorites-actions", () => ({
  fetchSidebarFavoriteProjects: vi.fn(async () => []),
}));
function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}
const scope = { workspaceId: "ws-1", userId: "user-1" };

describe("MainSidebar favorites", () => {
  it("renders favorite projects with nested favorite sheets", async () => {
    renderWithClient(
      <MainSidebar favoritesScope={scope}
        favoriteProjects={[{
          favoriteCreatedAt: "2026-06-16T00:00:00.000Z",
          favoriteEstimateSheets: [{
            href: "/workshop/projects/project-1/estimates/sheet-1", id: "sheet-1",
            name: "Concept Budget", projectId: "project-1", sheetCode: "ES-001",
            favoriteCreatedAt: "2026-06-16T00:00:00.000Z",
          }],
          href: "/workshop/projects/project-1", id: "project-1",
          name: "Lewis Residence", projectCode: "AE-LR-001",
        }]}
        user={{ displayName: "Philip Lewis", email: "philip@example.com" }} />);
    await userEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(within(nav).getByText("Favorites")).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Lewis Residence" })).toHaveAttribute("href", "/workshop/projects/project-1");
    const sheet = within(nav).getByRole("link", { name: "Concept Budget" });
    expect(sheet).toHaveAttribute("href", "/workshop/projects/project-1/estimates/sheet-1");
    expect(sheet).toHaveAttribute("aria-current", "page");
  });
  it("shows the empty hint once the query settles with zero favorites", async () => {
    renderWithClient(
      <MainSidebar favoritesScope={scope} favoriteProjects={[]}
        user={{ displayName: "Philip Lewis", email: "philip@example.com" }} />);
    await userEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(await within(nav).findByText("Star a project to pin it here.")).toBeInTheDocument();
  });
});
```
- [ ] **Step 2: Run — expect FAIL** (no `favoritesScope` prop, no empty hint, not query-wired):
```bash
bunx vitest run tests/vitest/main-sidebar-favorites.test.tsx --maxWorkers=1
```
- [ ] **Step 3: Extend `MainSidebarProps`** (`:33-37`):
```ts
type MainSidebarProps = {
  favoriteProjects?: MainSidebarFavoriteProject[];
  favoritesScope?: { workspaceId: string; userId: string } | null;
  status?: MainSidebarStatus;
  user?: MainSidebarUser;
};
```
- [ ] **Step 4: Wire the query** (`:84`); add `import { useSidebarFavoritesQuery } from "@/hooks/use-sidebar-favorites-query";`:
```tsx
export function MainSidebar({ favoriteProjects = [], favoritesScope, status, user }: MainSidebarProps) {
  const pathname = usePathname();
  const favoritesQuery = useSidebarFavoritesQuery({
    scope: favoritesScope ?? { workspaceId: "none", userId: "none" }, // hook always called; null scope reads initialData
    initialData: favoriteProjects,
  });
  const liveFavoriteProjects = favoritesScope ? favoritesQuery.data ?? [] : favoriteProjects;
  const showEmptyHint = !favoritesQuery.isPending && liveFavoriteProjects.length === 0;
```
⚠️ confirm `isPending` vs `isLoading` semantics with `initialData` present (`@tanstack/react-query@5.100.14`) — pick the flag that is `false` when seeded so no skeleton paints over seeded data.
- [ ] **Step 5: Replace `favoriteProjects` reads** in the render block (`~:86`, `:238`, `:246`) with `liveFavoriteProjects`; add the focus-rescue target on the header (`:222-236`):
```tsx
            <div data-sidebar-favorites-header tabIndex={-1}
              className="grid h-10 w-full grid-cols-[48px_minmax(0,1fr)] items-center gap-1 overflow-hidden rounded-xs outline-none">
```
- [ ] **Step 6: Add the empty hint** where the render returns `null` (after `:294`, inside the `expanded` section, `08`):
```tsx
            {showEmptyHint && expanded ? (
              <p data-sidebar-favorites-empty
                className="pb-2 pl-3 text-[9px] font-normal leading-none text-tertiary">
                Star a project to pin it here.
              </p>
            ) : null}
```
- [ ] **Step 7: Run — expect PASS; type-check (1.5 + 1.6 together); commit:**
```bash
bunx vitest run tests/vitest/main-sidebar-favorites.test.tsx --maxWorkers=1
bun run type-check
git add src/components/sidebar/MainSidebar.tsx src/components/workshop/WorkshopPageShell.tsx tests/vitest/main-sidebar-favorites.test.tsx
git commit -m "feat(favorites): wire MainSidebar to scoped query + empty/skeleton states; thread scope from shell"
```

### Phase 1 verification checklist
- [ ] All three tests green: `bunx vitest run tests/vitest/sidebar-favorites-shaping.test.ts tests/vitest/use-sidebar-favorites-query.test.tsx tests/vitest/main-sidebar-favorites.test.tsx --maxWorkers=1`
- [ ] `bun run type-check` clean (favoriteCreatedAt flows through both DTOs + both shaping sites; `favoritesScope` accepted).
- [ ] No staleTime regression: `grep -n "staleTime: 0" src/hooks/use-sidebar-favorites-query.ts` → one match (else cross-route goes stale — the D4 failure mode).
- [ ] Gate — no first-paint flash (initialData paints real data); per-route reconcile (staleTime:0 + observer); scope eviction asserted by the hook test (C4/D12).
- [ ] Optional authed smoke: `bun run dev`, load `/workshop`, confirm favorites paint with no flash and don't go stale across navigation.

### Phase 1 rollback
Revert the query boundary and return `MainSidebar` to prop-fed rendering (drop the hook call, read `favoriteProjects` directly). The DTO additions (1.2) and the helpers/loader/key files (1.1, 1.3) are inert without the hook and can stay. Only add `REACTIVE_SIDEBAR_FAVORITES_ENABLED` if concurrent work makes a one-commit rollout risky (`03 §6`).

## Phase 2 — Estimate Favorite Mutation

Add `useToggleEstimateFavorite` so one optimistic lifecycle drives BOTH the estimates-table row star (the per-mount Zustand `ProjectEstimatesStore.patch`, `project-estimates-store.ts:97`) AND the scoped sidebar cache. The nested sheet is inserted/removed in the sidebar **only** when the parent project is a *visible* sidebar favorite within the top-8 cap; otherwise the sidebar is untouched and the **required** polite cue fires (D5, `08`). Depends on Phase 1.

**Exit gate (verbatim, `03 §4 Phase 2`):**
> Gate: estimate-under-visible-favorited-parent updates row + sidebar; estimate under a non-favorited or hidden parent updates row only **and** announces the cue; rollback reverts all touched surfaces from one snapshot.

### Pros / cons (Phase 2)
- **One lifecycle, two surfaces** — Pro: one `onMutate` snapshot covers the Zustand pre-patch values *and* the sidebar cache; `onError` restores both from the same context (closes cross-surface desync, `11 §4.3`); `cancelQueries` gives the row star the same latest-intent-wins safety the sidebar gets. Con: the per-mount store isn't a TanStack cache, so its snapshot lives in mutation `context`; the hook must receive a `store` reference (on the input, §5.3).
- **Required cue (D5)** — Benefit: the non-favorited-parent case is the *common* one (the server only returns sheets under already-favorited projects); a silent no-op reads as broken, so the polite cue is what makes it legible. Con: wires the hook to a DOM live region it doesn't own (handled in 2.4).

### Task 2.1 — Shared `patchSidebarFavoritesCache` helper (pure) + test

**Files:** Create `src/lib/favorites/sidebar-favorites-cache.ts`; Test `tests/vitest/sidebar-favorites-cache.test.ts`. (Phase 3 reuses this helper; it implements the full canonical op union from §5.2.)

- [ ] **Step 1: Write the failing test** (deterministic — timestamps injected, not `new Date()` inside the helper):
```ts
import { describe, expect, it } from "vitest";
import { patchSidebarFavoritesCache } from "@/lib/favorites/sidebar-favorites-cache";
import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";

const NOW = "2026-06-16T12:00:00.000Z";
const project = (id: string, createdAt: string, sheets: MainSidebarFavoriteProject["favoriteEstimateSheets"] = []): MainSidebarFavoriteProject => ({
  id, name: `Project ${id}`, projectCode: null, href: `/workshop/projects/${id}`,
  favoriteCreatedAt: createdAt, favoriteEstimateSheets: sheets,
});

describe("patchSidebarFavoritesCache — estimate ops", () => {
  it("inserts the sheet at top of a visible favorited parent with the synthesized timestamp", () => {
    const prev = [project("p1", "2026-06-10T00:00:00.000Z", [
      { id: "s-old", projectId: "p1", name: "Old", sheetCode: "ES-1", href: "/workshop/projects/p1/estimates/s-old", favoriteCreatedAt: "2026-06-09T00:00:00.000Z" }])];
    const next = patchSidebarFavoritesCache(prev, { kind: "estimate-insert", parentId: "p1",
      sheet: { id: "s-new", projectId: "p1", name: "New", sheetCode: "ES-2", href: "/workshop/projects/p1/estimates/s-new" }, createdAt: NOW });
    expect(next[0].favoriteEstimateSheets.map((s) => s.id)).toEqual(["s-new", "s-old"]);
    expect(next[0].favoriteEstimateSheets[0].favoriteCreatedAt).toBe(NOW);
    expect(prev[0].favoriteEstimateSheets).toHaveLength(1); // prev not mutated
  });
  it("trims the parent's sheets to 5 (DESC) before inserting", () => {
    const sheets = Array.from({ length: 5 }, (_, i) => ({ id: `s${i}`, projectId: "p1", name: `S${i}`, sheetCode: null,
      href: `/workshop/projects/p1/estimates/s${i}`, favoriteCreatedAt: `2026-06-1${i}T00:00:00.000Z` }));
    const next = patchSidebarFavoritesCache([project("p1", "2026-06-10T00:00:00.000Z", sheets)], { kind: "estimate-insert", parentId: "p1",
      sheet: { id: "s-new", projectId: "p1", name: "New", sheetCode: null, href: "/workshop/projects/p1/estimates/s-new" }, createdAt: NOW });
    expect(next[0].favoriteEstimateSheets).toHaveLength(5);
    expect(next[0].favoriteEstimateSheets[0].id).toBe("s-new");
    expect(next[0].favoriteEstimateSheets.map((s) => s.id)).not.toContain("s0");
  });
  it("removes the sheet from its parent", () => {
    const prev = [project("p1", "2026-06-10T00:00:00.000Z", [{ id: "s1", projectId: "p1", name: "S1", sheetCode: null, href: "/workshop/projects/p1/estimates/s1", favoriteCreatedAt: NOW }])];
    expect(patchSidebarFavoritesCache(prev, { kind: "estimate-remove", parentId: "p1", sheetId: "s1" })[0].favoriteEstimateSheets).toHaveLength(0);
  });
  it("no-ops when the parent is not a sidebar favorite", () => {
    const prev = [project("p1", "2026-06-10T00:00:00.000Z")];
    expect(patchSidebarFavoritesCache(prev, { kind: "estimate-insert", parentId: "absent",
      sheet: { id: "s", projectId: "absent", name: "N", sheetCode: null, href: "/x" }, createdAt: NOW })).toEqual(prev);
  });
  it("no-ops when the parent exists but is outside the visible top-8", () => {
    const prev = Array.from({ length: 9 }, (_, i) => project(`p${i}`, `2026-06-0${i}T00:00:00.000Z`)); // p0 oldest -> hidden at index 8 when DESC
    expect(patchSidebarFavoritesCache(prev, { kind: "estimate-insert", parentId: "p0",
      sheet: { id: "s", projectId: "p0", name: "N", sheetCode: null, href: "/x" }, createdAt: NOW })).toEqual(prev);
  });
});
```
- [ ] **Step 2: Run — expect FAIL** (module missing): `bunx vitest run tests/vitest/sidebar-favorites-cache.test.ts --maxWorkers=1`
- [ ] **Step 3: Implement** the canonical op union (§5.2). Project arms are included now so Phase 3 reuses without editing the union:
```ts
import type { MainSidebarFavoriteEstimateSheet, MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";
import { sortByFavoriteCreatedAtDesc, trimSidebarFavorites } from "@/lib/favorites/sidebar-favorites";

const VISIBLE_PROJECT_CAP = 8;
const VISIBLE_SHEET_CAP = 5;

export type SidebarFavoriteCacheOp =
  | { kind: "project-insert"; project: { id: string; name: string; projectCode: string | null; href: string; favoriteCreatedAt: string } }
  | { kind: "project-remove"; projectId: string }
  | { kind: "estimate-insert"; parentId: string; sheet: Omit<MainSidebarFavoriteEstimateSheet, "favoriteCreatedAt">; createdAt: string }
  | { kind: "estimate-remove"; parentId: string; sheetId: string };

/** Index of `parentId` within the visible top-8 window, or -1 if hidden/absent. */
function visibleParentIndex(prev: MainSidebarFavoriteProject[], parentId: string): number {
  return sortByFavoriteCreatedAtDesc(prev).slice(0, VISIBLE_PROJECT_CAP).findIndex((p) => p.id === parentId);
}

export function patchSidebarFavoritesCache(
  prev: MainSidebarFavoriteProject[] | undefined,
  op: SidebarFavoriteCacheOp,
): MainSidebarFavoriteProject[] {
  const list = prev ?? [];
  switch (op.kind) {
    case "project-insert": {
      const deduped = list.filter((p) => p.id !== op.project.id);
      const inserted: MainSidebarFavoriteProject = { ...op.project, favoriteEstimateSheets: [] };
      return trimSidebarFavorites([inserted, ...deduped]); // trim to 8 BEFORE returning (08)
    }
    case "project-remove":
      return list.filter((p) => p.id !== op.projectId);
    case "estimate-insert":
    case "estimate-remove": {
      if (visibleParentIndex(list, op.parentId) === -1) return list; // hidden/non-favorited -> no-op (D5)
      return list.map((project) => {
        if (project.id !== op.parentId) return project;
        if (op.kind === "estimate-remove") {
          return { ...project, favoriteEstimateSheets: project.favoriteEstimateSheets.filter((s) => s.id !== op.sheetId) };
        }
        const inserted: MainSidebarFavoriteEstimateSheet = { ...op.sheet, favoriteCreatedAt: op.createdAt };
        const deduped = project.favoriteEstimateSheets.filter((s) => s.id !== inserted.id);
        return { ...project, favoriteEstimateSheets: sortByFavoriteCreatedAtDesc([inserted, ...deduped]).slice(0, VISIBLE_SHEET_CAP) };
      });
    }
  }
}
```
- [ ] **Step 4: Run — expect PASS; type-check; commit:**
```bash
bunx vitest run tests/vitest/sidebar-favorites-cache.test.ts --maxWorkers=1
bun run type-check
git add src/lib/favorites/sidebar-favorites-cache.ts tests/vitest/sidebar-favorites-cache.test.ts
git commit -m "feat(favorites): shared sidebar-favorites cache patch helper (canonical op union)"
```

### Task 2.2 — `useToggleEstimateFavorite` lifecycle + race-safety test

**Files:** Create `src/hooks/use-toggle-estimate-favorite.ts`; Test `tests/vitest/estimate-favorite-sidebar-mutation.test.tsx`.

- [ ] **Step 1: Write the failing test** (mock `@/lib/workshop/actions` via `vi.hoisted`+`vi.mock`, real `QueryClient`, real `ProjectEstimatesStore`):
```tsx
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { favoritesQueryKeys } from "@/lib/favorites/query-keys";
import { useToggleEstimateFavorite } from "@/hooks/use-toggle-estimate-favorite";
import { createProjectEstimatesStore } from "@/stores/project-estimates-store";
import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";

const actions = vi.hoisted(() => ({ setEstimateFavorite: vi.fn() }));
vi.mock("@/lib/workshop/actions", () => actions);
const SCOPE = { workspaceId: "ws-1", userId: "user-1" };
const makeRow = (o = {}) => ({ id: "est-1", project_id: "p1", name: "Concept Budget", sheet_code: "ES-001",
  currency_code: "PHP", notes: null, project_budget: null, created_at: "2026-06-01T00:00:00.000Z",
  updated_at: "2026-06-01T00:00:00.000Z", firstNodeId: null, nodeCount: 0, rowItemCount: 0,
  totalProjectCost: 0, isFavorite: false, favoriteCreatedAt: null, ...o });
const favoritedParent = (): MainSidebarFavoriteProject => ({ id: "p1", name: "Lewis Residence", projectCode: "AE-LR-001",
  href: "/workshop/projects/p1", favoriteCreatedAt: "2026-06-05T00:00:00.000Z", favoriteEstimateSheets: [] });
const wrap = (qc: QueryClient) => ({ children }: { children: ReactNode }) => (<QueryClientProvider client={qc}>{children}</QueryClientProvider>);
const baseInput = {
  estimate: { id: "est-1", projectId: "p1", name: "Concept Budget", sheetCode: "ES-001", href: "/workshop/projects/p1/estimates/est-1", favoriteCreatedAt: null },
  project: { id: "p1", name: "Lewis Residence", projectCode: "AE-LR-001", href: "/workshop/projects/p1", isSidebarFavorite: true },
  favorite: true,
};
let qc: QueryClient;
beforeEach(() => { vi.clearAllMocks(); qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }); });

describe("useToggleEstimateFavorite", () => {
  it("optimistically inserts the sheet under a visible favorited parent AND patches the row store", async () => {
    actions.setEstimateFavorite.mockResolvedValue(undefined);
    qc.setQueryData(favoritesQueryKeys.sidebar(SCOPE), [favoritedParent()]);
    const store = createProjectEstimatesStore([makeRow()]);
    const { result } = renderHook(() => useToggleEstimateFavorite(SCOPE), { wrapper: wrap(qc) });
    act(() => result.current.toggle({ ...baseInput, store }));
    const cache = qc.getQueryData<MainSidebarFavoriteProject[]>(favoritesQueryKeys.sidebar(SCOPE))!;
    expect(cache[0].favoriteEstimateSheets[0].id).toBe("est-1");
    expect(cache[0].favoriteEstimateSheets[0].favoriteCreatedAt).toBeTypeOf("string");
    expect(store.getState().estimates.find((e) => e.id === "est-1")!.isFavorite).toBe(true);
    await waitFor(() => expect(actions.setEstimateFavorite).toHaveBeenCalledWith({ estimateId: "est-1", favorite: true }));
  });
  it("does NOT touch the sidebar when the parent is not a favorite, but patches the row", async () => {
    actions.setEstimateFavorite.mockResolvedValue(undefined);
    qc.setQueryData(favoritesQueryKeys.sidebar(SCOPE), []);
    const store = createProjectEstimatesStore([makeRow()]);
    const { result } = renderHook(() => useToggleEstimateFavorite(SCOPE), { wrapper: wrap(qc) });
    act(() => result.current.toggle({ ...baseInput, store, project: { ...baseInput.project, isSidebarFavorite: false } }));
    expect(qc.getQueryData(favoritesQueryKeys.sidebar(SCOPE))).toEqual([]);
    expect(store.getState().estimates[0].isFavorite).toBe(true);
  });
  it("rolls back BOTH surfaces from one snapshot on error", async () => {
    actions.setEstimateFavorite.mockRejectedValue(new Error("nope"));
    qc.setQueryData(favoritesQueryKeys.sidebar(SCOPE), [favoritedParent()]);
    const store = createProjectEstimatesStore([makeRow()]);
    const { result } = renderHook(() => useToggleEstimateFavorite(SCOPE), { wrapper: wrap(qc) });
    act(() => result.current.toggle({ ...baseInput, store }));
    await waitFor(() => {
      expect(qc.getQueryData<MainSidebarFavoriteProject[]>(favoritesQueryKeys.sidebar(SCOPE))![0].favoriteEstimateSheets).toHaveLength(0);
      expect(store.getState().estimates[0].isFavorite).toBe(false);
    });
  });
  it("is race-safe: a stale settle from M1 cannot clobber M2's newer state (cancelQueries)", async () => {
    let resolveM1!: () => void;
    actions.setEstimateFavorite
      .mockImplementationOnce(() => new Promise<void>((r) => { resolveM1 = () => r(); }))
      .mockResolvedValueOnce(undefined);
    qc.setQueryData(favoritesQueryKeys.sidebar(SCOPE), [favoritedParent()]);
    const store = createProjectEstimatesStore([makeRow()]);
    const { result } = renderHook(() => useToggleEstimateFavorite(SCOPE), { wrapper: wrap(qc) });
    act(() => result.current.toggle({ ...baseInput, store }));
    act(() => result.current.toggle({ ...baseInput, store, favorite: false, estimate: { ...baseInput.estimate, favoriteCreatedAt: new Date().toISOString() } }));
    act(() => resolveM1());
    await waitFor(() => expect(qc.getQueryData<MainSidebarFavoriteProject[]>(favoritesQueryKeys.sidebar(SCOPE))![0].favoriteEstimateSheets).toHaveLength(0));
  });
});
```
- [ ] **Step 2: Run — expect FAIL** (hook missing): `bunx vitest run tests/vitest/estimate-favorite-sidebar-mutation.test.tsx --maxWorkers=1`
- [ ] **Step 3: Implement** (D11 synth; one-snapshot rollback; cancelQueries; cue fires only when the parent is NOT a sidebar favorite — the favorited-but-hidden case is silent per `08`):
```ts
"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setEstimateFavorite } from "@/lib/workshop/actions";
import { favoritesQueryKeys } from "@/lib/favorites/query-keys";
import { patchSidebarFavoritesCache } from "@/lib/favorites/sidebar-favorites-cache";
import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";
import type { ProjectEstimatesStore } from "@/stores/project-estimates-store";

export type ToggleEstimateFavoriteInput = {
  estimate: { id: string; projectId: string; name: string; sheetCode: string | null; href: string; favoriteCreatedAt: string | null };
  project: { id: string; name: string; projectCode: string | null; href: string; isSidebarFavorite: boolean };
  favorite: boolean;
  store?: ProjectEstimatesStore;
};
type Scope = { workspaceId: string; userId: string };
type Ctx = { previousSidebar: MainSidebarFavoriteProject[] | undefined; previousRow: { isFavorite: boolean; favoriteCreatedAt: string | null } | null };
type ToggleCallbacks = { onSuccess?: () => void; onError?: () => void; onSettled?: () => void };

export function useToggleEstimateFavorite(scope: Scope, announceCue?: () => void) {
  const queryClient = useQueryClient();
  const key = favoritesQueryKeys.sidebar(scope);
  const mutation = useMutation<void, unknown, ToggleEstimateFavoriteInput, Ctx>({
    mutationFn: (input) => setEstimateFavorite({ estimateId: input.estimate.id, favorite: input.favorite }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previousSidebar = queryClient.getQueryData<MainSidebarFavoriteProject[]>(key);
      const row = input.store?.getState().estimates.find((e) => e.id === input.estimate.id);
      const previousRow = row ? { isFavorite: row.isFavorite, favoriteCreatedAt: row.favoriteCreatedAt } : null;
      const synthesizedAt = new Date().toISOString(); // D11
      if (previousSidebar) {
        queryClient.setQueryData<MainSidebarFavoriteProject[]>(key, patchSidebarFavoritesCache(previousSidebar,
          input.favorite
            ? { kind: "estimate-insert", parentId: input.project.id,
                sheet: { id: input.estimate.id, projectId: input.estimate.projectId, name: input.estimate.name, sheetCode: input.estimate.sheetCode, href: input.estimate.href },
                createdAt: synthesizedAt }
            : { kind: "estimate-remove", parentId: input.project.id, sheetId: input.estimate.id }));
      }
      // 08: cue ONLY for the non-favorited parent; favorited-but-hidden is silent.
      if (!input.project.isSidebarFavorite) announceCue?.();
      input.store?.getState().patch(input.estimate.id, { isFavorite: input.favorite, favoriteCreatedAt: input.favorite ? synthesizedAt : null });
      return { previousSidebar, previousRow };
    },
    onError: (_e, input, ctx) => {
      if (ctx?.previousSidebar !== undefined) queryClient.setQueryData(key, ctx.previousSidebar);
      if (ctx?.previousRow) input.store?.getState().patch(input.estimate.id, { isFavorite: ctx.previousRow.isFavorite, favoriteCreatedAt: ctx.previousRow.favoriteCreatedAt });
    },
    onSettled: () => { void queryClient.invalidateQueries({ queryKey: key }); },
  });
  return { toggle: (input: ToggleEstimateFavoriteInput, options?: ToggleCallbacks) => mutation.mutate(input, options), isPending: mutation.isPending };
}
```
⚠️ confirm `createProjectEstimatesStore` / `ProjectEstimatesStore` export names + `patch(id, partial)` signature against `src/stores/project-estimates-store.ts:97`.
- [ ] **Step 4: Run — expect PASS; type-check; commit:**
```bash
bunx vitest run tests/vitest/estimate-favorite-sidebar-mutation.test.tsx --maxWorkers=1
bun run type-check
git add src/hooks/use-toggle-estimate-favorite.ts tests/vitest/estimate-favorite-sidebar-mutation.test.tsx
git commit -m "feat(favorites): useToggleEstimateFavorite optimistic lifecycle"
```

### Task 2.3 — Thread parent-project sidebar metadata + switch the button to the hook

**Files:** Modify `src/app/workshop/projects/[projectId]/estimates/page.tsx`, `ProjectEstimatesClient.tsx`, `ProjectEstimatesTable.tsx`, `ProjectEstimateFavoriteButton.tsx`; extend `tests/vitest/project-estimates-table-inline-edit.test.tsx`.

- [ ] **Step 1: Write the failing test** — render `ProjectEstimatesTable` inside a `QueryClientProvider` with new `parentProject` + `scope` props, seed the sidebar cache, click the favorite star, assert `setEstimateFavorite` called with `{ estimateId, favorite: true }` AND the seeded cache gained the sheet (proves the button drives the hook, not its own `useTransition`). Fails because the table/button don't accept/thread those props yet.
- [ ] **Step 2: Run — expect FAIL:** `bunx vitest run tests/vitest/project-estimates-table-inline-edit.test.tsx --maxWorkers=1`
- [ ] **Step 3: Implement the threading:**
  - `page.tsx`: build `parentProject = { id, name, projectCode, href, isSidebarFavorite }` + `scope = { workspaceId, userId }`. ⚠️ `isSidebarFavorite` source — reuse `listMainSidebarFavoriteProjects()` membership or add a scalar `isProjectSidebarFavorite(projectId)` reader; ⚠️ `projectCode` field name on the page's `project` (page reads only `project.name` today `~:29`); ⚠️ `workspaceId` via `ensureDefaultWorkspace()` (not in `getCurrentUserContext`).
  - `ProjectEstimatesClient.tsx`: add `parentProject` + `scope` props, forward to the table. **Do not regress** the unrelated favorites-filter scaffolding already in this dirty file (`12`).
  - `ProjectEstimatesTable.tsx`: add the props to `ProjectEstimatesTableProps`; thread through row actions → `ProjectEstimateFavoriteButton`.
  - `ProjectEstimateFavoriteButton.tsx`: replace the local `useTransition` + `setEstimateFavorite` path (`toggleFavorite` `:42-60`) with `useToggleEstimateFavorite(scope, announceCue)`; build the input from `estimate` + `parentProject` + `store`; keep `aria-pressed`/`aria-busy` driven by `isFavorite`/`isPending`. ⚠️ confirm nothing else reads the old `favoriteOverride` local state (`:28,:31`).
- [ ] **Step 4: Run — expect PASS; type-check; commit:**
```bash
bunx vitest run tests/vitest/project-estimates-table-inline-edit.test.tsx tests/vitest/estimate-favorite-sidebar-mutation.test.tsx --maxWorkers=1
bun run type-check
git add src/app/workshop/projects/[projectId]/estimates/page.tsx src/components/workshop/ProjectEstimatesClient.tsx src/components/workshop/ProjectEstimatesTable.tsx src/components/workshop/ProjectEstimateFavoriteButton.tsx tests/vitest/project-estimates-table-inline-edit.test.tsx
git commit -m "feat(favorites): thread parent-project sidebar metadata to estimate favorite button"
```

### Task 2.4 — Required legibility cue wired to the polite live region (D5, `08`)

**Files:** Modify `src/components/sidebar/MainSidebar.tsx` (two live regions, `08` markup); add the announce bridge (`src/hooks/use-sidebar-favorites-announcer.ts` or a shell-provided context); Modify `ProjectEstimateFavoriteButton.tsx` (pass `announceCue`); update `tests/vitest/main-sidebar-favorites.test.tsx`.

- [ ] **Step 1: Write the failing test** in `main-sidebar-favorites.test.tsx` — after a favorite-estimate toggle whose parent is NOT a sidebar favorite, `[data-sidebar-favorites-status]` receives `Estimate favorited. Favorite the project to pin it in the sidebar.`; on a rapid second toggle the prior polite text is cleared before the new write (no stacking, QA-20); region is `role="status"`, `aria-live="polite"`, `aria-atomic="true"`, `sr-only`, always mounted.
- [ ] **Step 2: Run — expect FAIL:** `bunx vitest run tests/vitest/main-sidebar-favorites.test.tsx --maxWorkers=1`
- [ ] **Step 3: Implement:** add the two always-mounted `sr-only` regions (`data-sidebar-favorites-status` polite, `data-sidebar-favorites-alert` assertive, `aria-atomic="true"`) to the Favorites section per `08`. Expose a small announce API (`useSidebarFavoritesAnnouncer()` or a shell-provided context) that writes the polite text, clears prior text first (08 rapid-toggle rule), and clears after ~6s; the button gets `announceCue` from it and passes it to `useToggleEstimateFavorite`. Wire the assertive copy `Could not update favorite. Try again.` from `onError` now too. ⚠️ confirm whether MainSidebar + the estimates button share a provider; if not, a module-scoped event/ref the region subscribes to is the minimal bridge.
- [ ] **Step 4: Run — expect PASS; type-check; commit:**
```bash
bunx vitest run tests/vitest/main-sidebar-favorites.test.tsx --maxWorkers=1
bun run type-check
git add src/components/sidebar/MainSidebar.tsx src/hooks/use-sidebar-favorites-announcer.ts src/components/workshop/ProjectEstimateFavoriteButton.tsx tests/vitest/main-sidebar-favorites.test.tsx
git commit -m "feat(favorites): wire required estimate-favorite legibility cue to polite live region"
```

### Phase 2 verification checklist
- [ ] `bunx vitest run tests/vitest/sidebar-favorites-cache.test.ts tests/vitest/estimate-favorite-sidebar-mutation.test.tsx tests/vitest/project-estimates-table-inline-edit.test.tsx tests/vitest/main-sidebar-favorites.test.tsx --maxWorkers=1` — green.
- [ ] `bun run type-check` — clean.
- [ ] Manual (Repro B, `11 §2`): favorite an estimate under a sidebar-favorite parent → row + nested sidebar sheet update, no reload.
- [ ] Manual: favorite under a non-favorited parent → row updates, sidebar unchanged, SR hears the cue. Under a favorited-but-hidden (outside top-8) parent → row updates, sidebar unchanged, **no** announcement (`08`).
- [ ] Rapid double-toggle: latest intent wins both surfaces (QA-08/09). Forced error: both surfaces revert from one snapshot; assertive region announces failure.
- [ ] Grep: no new `router.refresh()` on the estimate path.

### Phase 2 rollback
Revert the hook usage in `ProjectEstimateFavoriteButton.tsx` (restore the local `useTransition` + `setEstimateFavorite` + `store.patch` path at `:42-60`) while keeping the Phase 2 tests. The estimate flow degrades to the pre-fix non-reactive sidebar (row star still works). The new helper/hook can stay on disk unused. No server-action/schema change in Phase 2, so rollback is purely client-side.

## Phase 3 — Project Favorite Mutation

Add `useToggleProjectFavorite`, which patches the project-card override **and** the scoped sidebar cache from one lifecycle, deleting the `router.refresh()` propagation in `projects-page-client.tsx` (`toggleProjectFavorite`, verified `~:508-520`, `router.refresh()` `~:514-516`). Then route `WorkshopHomebaseClient.removeRemovedProjectFavorite` (`:73-84`) through the same hook while **preserving** its `router.replace("/workshop", { scroll: false })` navigation as a separate concern (D8). Reuses Phase 1 (`favoritesQueryKeys.sidebar`) + the Phase 2 helper (`patchSidebarFavoritesCache`).

**Exit gate (verbatim, `03 §4 Phase 3`):**
> Gate: project card/sidebar update optimistically; homebase is not a divergent path; no `router.refresh()` remains for favorite propagation.

### Pros / cons (Phase 3)
- **Removing `router.refresh()`** deletes the full-tree re-render both candidate root causes depend on (`11 §3`); propagation becomes `cancelQueries → setQueryData → server action → invalidate`, latest-intent-wins (`11 §4`).
- **One snapshot, atomic rollback** of card star + sidebar (`11 §4.3`) via the `toggle(input, options?)` parity (§5.3): hook rolls back the cache, the caller's `options.onError` rolls back `favoriteOverrides`.
- **Con / risk:** `ProjectsPageClient` and `WorkshopHomebaseClient` do **not** receive scope today — both need a new `{ workspaceId, userId }` prop threaded from their server parents. A key mismatch silently no-ops (D2).
- **Con:** Homebase `router.replace` must stay (it dismisses the banner + returns home) — it is navigation, not favorite propagation, so it survives the "no `router.refresh()`" rule (D8).

### Task 3.1 — `useToggleProjectFavorite` lifecycle

**Files:** Create `src/hooks/use-toggle-project-favorite.ts`; Test `tests/vitest/project-favorite-sidebar-mutation.test.tsx`. Reuses `query-keys.ts` (P1), `sidebar-favorites-cache.ts` (P2), `setProjectFavorite` (`actions.ts:25-70`).

- [ ] **Step 1: Write the failing test:**
```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { favoritesQueryKeys } from "@/lib/favorites/query-keys";
import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";

const actions = vi.hoisted(() => ({ setProjectFavorite: vi.fn() }));
vi.mock("@/lib/workshop/actions", () => actions);
const scope = { workspaceId: "ws-1", userId: "user-1" };
const qcFactory = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const wrap = (qc: QueryClient) => ({ children }: { children: ReactNode }) => (<QueryClientProvider client={qc}>{children}</QueryClientProvider>);
const existing = (): MainSidebarFavoriteProject => ({ id: "p-existing", name: "Existing", projectCode: "EX-1",
  href: "/workshop/projects/p-existing/estimates", favoriteCreatedAt: "2026-06-01T00:00:00.000Z", favoriteEstimateSheets: [] });
const newInput = { project: { id: "p-new", name: "Harbor Tower", projectCode: "HT-9", href: "/workshop/projects/p-new/estimates", favoriteCreatedAt: null }, favorite: true } as const;
beforeEach(() => { vi.clearAllMocks(); actions.setProjectFavorite.mockResolvedValue(undefined); });

describe("useToggleProjectFavorite", () => {
  it("optimistically inserts into the scoped cache with a synthesized timestamp (sorts to top)", async () => {
    const qc = qcFactory(); qc.setQueryData(favoritesQueryKeys.sidebar(scope), [existing()]);
    const { useToggleProjectFavorite } = await import("@/hooks/use-toggle-project-favorite");
    const { result } = renderHook(() => useToggleProjectFavorite(scope), { wrapper: wrap(qc) });
    result.current.toggle(newInput);
    await waitFor(() => {
      const data = qc.getQueryData<MainSidebarFavoriteProject[]>(favoritesQueryKeys.sidebar(scope));
      expect(data?.[0]?.id).toBe("p-new");
      expect(data?.[0]?.favoriteCreatedAt).toEqual(expect.any(String));
    });
    expect(actions.setProjectFavorite).toHaveBeenCalledWith({ projectId: "p-new", favorite: true });
  });
  it("cancels in-flight refetches in onMutate", async () => {
    const qc = qcFactory(); qc.setQueryData(favoritesQueryKeys.sidebar(scope), [existing()]);
    const cancelSpy = vi.spyOn(qc, "cancelQueries");
    const { useToggleProjectFavorite } = await import("@/hooks/use-toggle-project-favorite");
    const { result } = renderHook(() => useToggleProjectFavorite(scope), { wrapper: wrap(qc) });
    result.current.toggle(newInput);
    await waitFor(() => expect(cancelSpy).toHaveBeenCalledWith({ queryKey: favoritesQueryKeys.sidebar(scope) }));
  });
  it("rolls the cache back to the snapshot on error", async () => {
    const qc = qcFactory(); qc.setQueryData(favoritesQueryKeys.sidebar(scope), [existing()]);
    actions.setProjectFavorite.mockRejectedValueOnce(new Error("boom"));
    const { useToggleProjectFavorite } = await import("@/hooks/use-toggle-project-favorite");
    const { result } = renderHook(() => useToggleProjectFavorite(scope), { wrapper: wrap(qc) });
    result.current.toggle(newInput);
    await waitFor(() => {
      const data = qc.getQueryData<MainSidebarFavoriteProject[]>(favoritesQueryKeys.sidebar(scope));
      expect(data).toHaveLength(1); expect(data?.[0]?.id).toBe("p-existing");
    });
  });
  it("invalidates the scoped key on settle", async () => {
    const qc = qcFactory(); qc.setQueryData(favoritesQueryKeys.sidebar(scope), [existing()]);
    const invSpy = vi.spyOn(qc, "invalidateQueries");
    const { useToggleProjectFavorite } = await import("@/hooks/use-toggle-project-favorite");
    const { result } = renderHook(() => useToggleProjectFavorite(scope), { wrapper: wrap(qc) });
    result.current.toggle(newInput);
    await waitFor(() => expect(invSpy).toHaveBeenCalledWith({ queryKey: favoritesQueryKeys.sidebar(scope) }));
  });
  it("never references router.refresh", async () => {
    const { readFileSync } = await import("node:fs");
    expect(readFileSync("src/hooks/use-toggle-project-favorite.ts", "utf8")).not.toContain("router.refresh");
  });
});
```
- [ ] **Step 2: Run — expect FAIL** (hook missing): `bunx vitest run tests/vitest/project-favorite-sidebar-mutation.test.tsx --maxWorkers=1`
- [ ] **Step 3: Implement** (canonical op union; D11 synth; `toggle(input, options?)` per §5.3):
```ts
"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { favoritesQueryKeys } from "@/lib/favorites/query-keys";
import { patchSidebarFavoritesCache } from "@/lib/favorites/sidebar-favorites-cache";
import { setProjectFavorite } from "@/lib/workshop/actions";
import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";

export type ToggleProjectFavoriteInput = {
  project: { id: string; name: string; projectCode: string | null; href: string; favoriteCreatedAt: string | null };
  favorite: boolean;
};
type Scope = { workspaceId: string; userId: string };
type Snapshot = { previousSidebar: MainSidebarFavoriteProject[] | undefined };
type ToggleCallbacks = { onSuccess?: () => void; onError?: () => void; onSettled?: () => void };

export function useToggleProjectFavorite(scope: Scope) {
  const queryClient = useQueryClient();
  const key = favoritesQueryKeys.sidebar(scope);
  const mutation = useMutation<void, unknown, ToggleProjectFavoriteInput, Snapshot>({
    mutationFn: ({ project, favorite }) => setProjectFavorite({ projectId: project.id, favorite }),
    onMutate: async ({ project, favorite }) => {
      await queryClient.cancelQueries({ queryKey: key }); // 11 §4.2
      const previousSidebar = queryClient.getQueryData<MainSidebarFavoriteProject[]>(key);
      queryClient.setQueryData<MainSidebarFavoriteProject[]>(key, (prev) =>
        patchSidebarFavoritesCache(prev, favorite
          ? { kind: "project-insert", project: {
              id: project.id, name: project.name, projectCode: project.projectCode, href: project.href,
              favoriteCreatedAt: project.favoriteCreatedAt ?? new Date().toISOString() } } // D11
          : { kind: "project-remove", projectId: project.id }));
      return { previousSidebar };
    },
    onError: (_e, _input, ctx) => { if (ctx) queryClient.setQueryData(key, ctx.previousSidebar); }, // 11 §4.3 (sidebar half)
    onSettled: () => { void queryClient.invalidateQueries({ queryKey: key }); },
  });
  return { toggle: (input: ToggleProjectFavoriteInput, options?: ToggleCallbacks) => mutation.mutate(input, options), isPending: mutation.isPending };
}
```
- [ ] **Step 4: Run — expect PASS; type-check; commit:**
```bash
bunx vitest run tests/vitest/project-favorite-sidebar-mutation.test.tsx --maxWorkers=1
bun run type-check
git add src/hooks/use-toggle-project-favorite.ts tests/vitest/project-favorite-sidebar-mutation.test.tsx
git commit -m "feat(favorites): useToggleProjectFavorite optimistic lifecycle (no router.refresh)"
```

### Task 3.2 — Replace `router.refresh()` in `projects-page-client.tsx` + thread scope

**Files:** Modify `src/components/workshop/projects-page-client.tsx` (`toggleProjectFavorite` `~:508-520`, props `~:44-47,:367-370`); Modify `src/app/workshop/projects/page.tsx` (`~:16-19`). Extend `tests/vitest/project-favorite-sidebar-mutation.test.tsx` with a source-grep guard.

- [ ] **Step 1: Add the failing grep guard test** (to the file from 3.1):
```tsx
it("projects-page-client no longer calls router.refresh on favorite toggle", async () => {
  const { readFileSync } = await import("node:fs");
  expect(readFileSync("src/components/workshop/projects-page-client.tsx", "utf8")).not.toContain("router.refresh");
});
```
⚠️ confirm the only `router.refresh()` in this file is on the favorite path (`~:514-516`) before asserting whole-file.
- [ ] **Step 2: Run — expect FAIL** (string still present): `bunx vitest run tests/vitest/project-favorite-sidebar-mutation.test.tsx --maxWorkers=1`
- [ ] **Step 3: Implement.** Add `import { useToggleProjectFavorite } from "@/hooks/use-toggle-project-favorite";`, add `favoritesScope` to props, and rewrite the function. **Before** (verbatim current `~:508-520`):
```ts
  function toggleProjectFavorite(projectId: string, nextFavorite: boolean) {
    const previousFavorite = favoriteIds.has(projectId);
    setFavoriteOverrides((current) => ({ ...current, [projectId]: nextFavorite }));
    setPendingFavoriteId(projectId);
    startTransition(() => {
      void setProjectFavorite({ projectId, favorite: nextFavorite })
        .then(() => router.refresh())
        .catch(() => setFavoriteOverrides((current) => ({ ...current, [projectId]: previousFavorite })))
        .finally(() => setPendingFavoriteId(null));
    });
  }
```
**After** (card override stays local; sidebar via the hook; one error signal rolls back both — §5.3):
```ts
  function toggleProjectFavorite(projectId: string, nextFavorite: boolean) {
    const item = projectItems.find((entry) => entry.project.id === projectId);
    const previousFavorite = favoriteIds.has(projectId);
    setFavoriteOverrides((current) => ({ ...current, [projectId]: nextFavorite }));
    setPendingFavoriteId(projectId);
    toggleProjectFavoriteMutation.toggle(
      { project: { id: projectId, name: item?.project.name ?? "", projectCode: item?.project.project_code ?? null,
          href: `/workshop/projects/${projectId}/estimates`, favoriteCreatedAt: null }, favorite: nextFavorite },
      { onError: () => setFavoriteOverrides((current) => ({ ...current, [projectId]: previousFavorite })),
        onSettled: () => setPendingFavoriteId(null) },
    );
  }
```
Add at the top of the component body: `const toggleProjectFavoriteMutation = useToggleProjectFavorite(favoritesScope);`. Remove the now-unused direct `setProjectFavorite` import on this path. ⚠️ `router` is still used elsewhere; `startTransition` is used by `openProjectDeletePreview` (`~:614`) — keep both. ⚠️ confirm `projectItems`/`item.project.project_code` field names.
- [ ] **Step 4: Thread scope from the server parent** `src/app/workshop/projects/page.tsx` (`~:16-19`):
```tsx
      <ProjectsPageClient projects={projects} favoriteProjectIds={favoriteProjectIds}
        favoritesScope={{ workspaceId, userId }} />
```
⚠️ source `workspaceId`/`userId` the SAME way Phase 1 does in the shell (`ensureDefaultWorkspace()` + `getCurrentUserContext`) so server + client build the key identically (D2). If `listCurrentWorkspaceProjects()` already resolves the workspace, return the scope from there. ⚠️ confirm its return shape.
- [ ] **Step 5: Run — expect PASS; type-check (catches the new required prop at every call site); commit:**
```bash
bunx vitest run tests/vitest/project-favorite-sidebar-mutation.test.tsx --maxWorkers=1
bun run type-check
git add src/components/workshop/projects-page-client.tsx src/app/workshop/projects/page.tsx
git commit -m "feat(favorites): replace project favorite router.refresh with reactive cache hook"
```

### Task 3.3 — Route Homebase through the hook, preserving `router.replace`

**Files:** Modify `src/components/workshop/WorkshopHomebaseClient.tsx` (`removeRemovedProjectFavorite` `:73-84`, props `~:19-24`); Modify the `/workshop` server page that renders it; extend `tests/vitest/main-sidebar-favorites.test.tsx` or a focused homebase test.

- [ ] **Step 1: Add the failing grep guard test:**
```tsx
it("homebase keeps router.replace but stops calling setProjectFavorite directly", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync("src/components/workshop/WorkshopHomebaseClient.tsx", "utf8");
  expect(src).toContain('router.replace("/workshop", { scroll: false })'); // D8 navigation preserved
  expect(src).not.toContain("router.refresh");
  expect(src).toContain("useToggleProjectFavorite");
});
```
- [ ] **Step 2: Run — expect FAIL:** `bunx vitest run tests/vitest/main-sidebar-favorites.test.tsx --maxWorkers=1`
- [ ] **Step 3: Implement.** **Before** (`:73-84`, verbatim):
```ts
  function removeRemovedProjectFavorite(projectId: string) {
    setPendingFavoriteKey(`removed-project:${projectId}`);
    startTransition(() => {
      void setProjectFavorite({ projectId, favorite: false })
        .then(() => {
          setDismissedRemovedProjectIds((current) => ({ ...current, [projectId]: true }));
          router.replace("/workshop", { scroll: false });
        })
        .catch(() => undefined)
        .finally(() => setPendingFavoriteKey(null));
    });
  }
```
**After** (sidebar via the shared hook; navigation preserved on success — D8):
```ts
  function removeRemovedProjectFavorite(projectId: string) {
    const notice = removedProjectNotice;
    setPendingFavoriteKey(`removed-project:${projectId}`);
    toggleProjectFavoriteMutation.toggle(
      { project: { id: projectId, name: notice?.projectName ?? "", projectCode: notice?.projectCode ?? null,
          href: `/workshop/projects/${projectId}/estimates`, favoriteCreatedAt: null }, favorite: false },
      { onSuccess: () => {
          setDismissedRemovedProjectIds((current) => ({ ...current, [projectId]: true }));
          router.replace("/workshop", { scroll: false }); // D8: navigation, separate from cache propagation
        },
        onSettled: () => setPendingFavoriteKey(null) },
    );
  }
```
Add `const toggleProjectFavoriteMutation = useToggleProjectFavorite(props.favoritesScope);` + the import; add `favoritesScope: { workspaceId: string; userId: string }` to `WorkshopHomebaseClientProps`; remove the now-unused direct `setProjectFavorite` import if no other usage. ⚠️ confirm `removedProjectNotice`/`projectName`/`projectCode` field names. The `/workshop` server page must pass `favoritesScope={{ workspaceId, userId }}` from the same source (D2). ⚠️ confirm that render site.
- [ ] **Step 4: Run — expect PASS; type-check; commit:**
```bash
bunx vitest run tests/vitest/main-sidebar-favorites.test.tsx tests/vitest/project-favorite-sidebar-mutation.test.tsx --maxWorkers=1
bun run type-check
git add src/components/workshop/WorkshopHomebaseClient.tsx src/app/workshop/page.tsx
git commit -m "feat(favorites): route homebase removed-project unfavorite through shared hook, keep router.replace"
```

### Phase 3 verification checklist
- [ ] No `router.refresh()` on any favorite path:
```bash
grep -rn "router.refresh" src/hooks/use-toggle-project-favorite.ts src/components/workshop/projects-page-client.tsx src/components/workshop/WorkshopHomebaseClient.tsx
# Expected: no output.
```
- [ ] Homebase still navigates: `grep -n 'router.replace("/workshop", { scroll: false })' src/components/workshop/WorkshopHomebaseClient.tsx` → one match (D8).
- [ ] `bunx vitest run tests/vitest/project-favorite-sidebar-mutation.test.tsx tests/vitest/main-sidebar-favorites.test.tsx --maxWorkers=1` — green.
- [ ] `bun run type-check` clean (verifies `favoritesScope` threaded to `ProjectsPageClient` + `WorkshopHomebaseClient` — a missing prop fails the build, surfacing unthreaded scope, D2).
- [ ] `cancelQueries` runs in `onMutate` (3.1 test); single-snapshot rollback covers card + sidebar (§5.3).
- [ ] Scope built identically on server + client (spot-check the scope passed to `ProjectsPageClient`, `WorkshopHomebaseClient`, `MainSidebar` all derive from one server-side source — D2).

### Phase 3 rollback
Revert hook usage in the two toggle components while keeping the tests. The app degrades to the non-reactive sidebar (`router.refresh()`/`router.replace` repaint). The hook + threaded prop can stay unused or be reverted with the server-page edits (`03 §6`).

## Phase 4 — Server Action Hygiene

Harden both favorite server actions against POST-invocable abuse: a `"use server"` action is reachable directly via POST, so the TypeScript `boolean` type is not a runtime guarantee, and the project-favorite delete currently acts on a broader scope than the caller's workspace authorizes. Fold in the runtime boolean guard and the missing `workspace_id` authz filter (D14, `13 C2`) — no reactivity changes.

**Exit gate (verbatim, `03 §4 Phase 4`):**
> Gate: invalid UUID, non-boolean favorite, unauthorized project id, and cross-workspace estimate id fail closed with client-safe errors.

### Pros / cons (Phase 4)
- Pro: closes a real authz hole (`project_favorites` unique key has no workspace dimension, so a workspace-less delete can act outside the caller's workspace, C2); tiny, mechanical, fully unit-testable; lands independently of Phases 1–3.
- Con: touches a production write path — mitigated because behavior is identical for valid callers; only malformed/cross-workspace input changes outcome. The `ignoreDuplicates` upsert asymmetry (`actions.ts:107`) is **deferred** (D14), not touched.

### Task 4.1 — Runtime boolean validation in BOTH actions (QA-13)

**Files:** Modify `src/lib/workshop/actions.ts` (top of `setProjectFavorite` `~:25`, `setEstimateFavorite` `~:72`); Test `tests/vitest/workshop-favorite-actions-hygiene.test.ts`.

- [ ] **Step 1: Write the failing test** (mock `ensureDefaultWorkspace` → `{ workspace, profile }`, `createSupabaseServerClient`, `next/cache`); assert non-boolean throws `Invalid input.` **before** any `from()`:
```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const ESTIMATE_ID = "33333333-3333-4333-8333-333333333333";
const WORKSPACE_ID = "ws-1";
const USER_ID = "11111111-1111-4111-8111-111111111111";
const ensureDefaultWorkspace = vi.hoisted(() => vi.fn());
const fromSpy = vi.hoisted(() => vi.fn());
vi.mock("@/lib/repositories/workspace-repository", () => ({ ensureDefaultWorkspace }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn(async () => ({ from: fromSpy })) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { setEstimateFavorite, setProjectFavorite } from "@/lib/workshop/actions";
beforeEach(() => { fromSpy.mockReset(); ensureDefaultWorkspace.mockResolvedValue({ workspace: { id: WORKSPACE_ID }, profile: { id: USER_ID } }); });

describe("favorite actions — boolean hygiene (D14 / 13 C2 / QA-13)", () => {
  it("setProjectFavorite rejects a non-boolean favorite before touching Supabase", async () => {
    // @ts-expect-error — simulating a raw POST payload that bypasses the TS type
    await expect(setProjectFavorite({ projectId: PROJECT_ID, favorite: "true" })).rejects.toThrow(/invalid input/i);
    expect(fromSpy).not.toHaveBeenCalled();
  });
  it("setEstimateFavorite rejects a non-boolean favorite before touching Supabase", async () => {
    // @ts-expect-error
    await expect(setEstimateFavorite({ estimateId: ESTIMATE_ID, favorite: 1 })).rejects.toThrow(/invalid input/i);
    expect(fromSpy).not.toHaveBeenCalled();
  });
});
```
- [ ] **Step 2: Run — expect FAIL:** `bunx vitest run tests/vitest/workshop-favorite-actions-hygiene.test.ts --maxWorkers=1`
- [ ] **Step 3: Implement** — add the guard as the FIRST statement in both actions (before `assertUuid` and `ensureDefaultWorkspace()`):
```ts
export async function setProjectFavorite({ projectId, favorite }: ProjectFavoriteInput) {
  if (typeof favorite !== "boolean") throw new Error("Invalid input.");
  assertUuid(projectId, "Project");
  // ...unchanged
```
```ts
export async function setEstimateFavorite({ estimateId, favorite }: EstimateFavoriteInput) {
  if (typeof favorite !== "boolean") throw new Error("Invalid input.");
  assertUuid(estimateId, "Estimate");
  // ...unchanged
```
> **Deferred (D14):** leave the estimate upsert `{ ignoreDuplicates: true, onConflict: "user_id,estimate_id" }` (`:107`) unchanged; no Phase-4 test forces it.
- [ ] **Step 4: Run — expect PASS; type-check; commit:**
```bash
bunx vitest run tests/vitest/workshop-favorite-actions-hygiene.test.ts --maxWorkers=1
bun run type-check
git add src/lib/workshop/actions.ts tests/vitest/workshop-favorite-actions-hygiene.test.ts
git commit -m "fix(favorites): runtime boolean validation in favorite server actions"
```

### Task 4.2 — `workspace_id` on the project-favorite DELETE filter (QA-14, authz)

**Files:** Modify `src/lib/workshop/actions.ts` (delete block `~:32-36`); extend the 4.1 test file.

- [ ] **Step 1: Add the failing test** (recording chain asserts the actual `.eq` filters applied):
```ts
function recordingChain() {
  const eqCalls: Array<[string, unknown]> = [];
  const chain: Record<string, unknown> = { __eqCalls: eqCalls };
  chain.delete = () => chain;
  chain.eq = (col: string, val: unknown) => { eqCalls.push([col, val]); return chain; };
  chain.then = (resolve: (v: { error: null }) => unknown) => resolve({ error: null });
  return chain as typeof chain & { __eqCalls: Array<[string, unknown]> };
}
describe("setProjectFavorite delete — workspace authz (D14 / 13 C2 / QA-14)", () => {
  it("scopes the unfavorite delete by workspace_id, user_id, project_id", async () => {
    const projectFavorites = recordingChain();
    fromSpy.mockImplementation((t: string) => (t === "project_favorites" ? projectFavorites : recordingChain()));
    await setProjectFavorite({ projectId: PROJECT_ID, favorite: false });
    expect(projectFavorites.__eqCalls).toEqual(expect.arrayContaining([
      ["workspace_id", WORKSPACE_ID], ["user_id", USER_ID], ["project_id", PROJECT_ID]]));
  });
});
```
- [ ] **Step 2: Run — expect FAIL** (`workspace_id` not among `.eq` calls): `bunx vitest run tests/vitest/workshop-favorite-actions-hygiene.test.ts --maxWorkers=1`
- [ ] **Step 3: Implement** — add `.eq("workspace_id", workspace.id)` as the first filter in the delete (`~:32-36`):
```ts
    const { error } = await supabase
      .from("project_favorites")
      .delete()
      .eq("workspace_id", workspace.id)
      .eq("user_id", profile.id)
      .eq("project_id", projectId);
```
⚠️ confirm `workspace`/`profile` variable names in scope at this point (`actions.ts:25-43`).
- [ ] **Step 4: Run — expect PASS; type-check; guard no `revalidateTag`; commit:**
```bash
bunx vitest run tests/vitest/workshop-favorite-actions-hygiene.test.ts --maxWorkers=1
bun run type-check
grep -n "revalidateTag" src/lib/workshop/actions.ts   # expect: no matches (D7)
git add src/lib/workshop/actions.ts tests/vitest/workshop-favorite-actions-hygiene.test.ts
git commit -m "fix(favorites): scope project-favorite delete by workspace_id (authz)"
```

### Phase 4 verification checklist
| Check | Command / inspection | Expect |
|---|---|---|
| Non-boolean fails closed (QA-13) | run the hygiene suite | PASS; `fromSpy` not called on bad input |
| Project delete scoped by `workspace_id` (QA-14) | same suite | `__eqCalls` contains `["workspace_id","ws-1"]` |
| Estimate delete unchanged | inspect `actions.ts:112-117` | still `.eq("workspace_id", …)` |
| `ignoreDuplicates` deferred | `git diff src/lib/workshop/actions.ts` | `:107` unchanged |
| No one-arg `revalidateTag` (D7) | `grep -n "revalidateTag" src/lib/workshop/actions.ts` | no matches |
| Types | `bun run type-check` | clean |

---

## Phase 5 — UX States, Security & Verification

Land the remaining `08` UX (focus rescue, polite/assertive live regions with dedup, insert/remove fade respecting `prefers-reduced-motion`), close the C4/C5 cache-security contract (explicit scope eviction + logout clear), then run the full QA matrix (QA-01..QA-22) + Repro A/B and record evidence.

**Exit gate (`03 §4 Phase 5` = success criteria + QA evidence):** every QA scenario PASS or an explicitly recorded gap (QA-16 permits a browser-auth gap); every command shows its exit code; residual risks from `11 §6` restated; temporary harnesses cleaned up; `.ai/10_state/decisions.md` updated only after evidence exists.

### Pros / cons (Phase 5)
- Pro: discharges the empirical owner-action `11 §5` demands (QA-08/09 + Repro A/B under auth); C5 logout clear closes a real residue exploit (`13` threat #2); focus/live-region work makes the required D5 no-op legible.
- Con: QA-12/14/17 + Repro A/B want real authenticated browser state — mitigated by deterministic unit/component coverage; QA-16 permits recording a gap rather than faking a PASS.

### Task 5.1 — Logout clears the favorites cache (QA-17, `13 C5`, R17)

**Files:** Modify `src/components/realtime-auth-bridge.tsx` (`SIGNED_OUT` handler `~:51-53`, effect deps `~:60`); Test `tests/vitest/realtime-auth-bridge-favorites-clear.test.tsx`. ⚠️ confirm `RealtimeAuthBridge` is mounted inside `QueryClientProvider` in `src/app/providers.tsx`; if not, attach the clear to the sign-out flow instead.

- [ ] **Step 1: Write the failing test** — render the bridge in a `QueryClientProvider`, pre-seed `favoritesQueryKeys.sidebar(scope)`, fire `SIGNED_OUT` via the mocked `onAuthStateChange`, assert the favorites entry is gone:
```tsx
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { favoritesQueryKeys } from "@/lib/favorites/query-keys";
let authCallback: ((event: string, session: unknown) => void) | undefined;
vi.mock("@/lib/supabase/client", () => ({ createSupabaseBrowserClient: () => ({
  auth: { getSession: vi.fn(async () => ({ data: { session: null } })),
    onAuthStateChange: (cb: (e: string, s: unknown) => void) => { authCallback = cb; return { data: { subscription: { unsubscribe: vi.fn() } } }; } },
  realtime: { setAuth: vi.fn(async () => undefined) } }) }));
vi.mock("@/lib/collaboration/realtime-telemetry", () => ({ reportRealtimeEvent: vi.fn() }));
import { RealtimeAuthBridge } from "@/components/realtime-auth-bridge";
afterEach(() => { authCallback = undefined; });

describe("RealtimeAuthBridge favorites clear on logout (13 C5 / QA-17)", () => {
  it("removes favorites cache entries when SIGNED_OUT fires", async () => {
    const queryClient = new QueryClient();
    const scope = { workspaceId: "ws-1", userId: "user-1" };
    queryClient.setQueryData(favoritesQueryKeys.sidebar(scope), [{ id: "p1", name: "Lewis Residence", projectCode: "AE-LR-001", href: "/workshop/projects/p1", favoriteCreatedAt: "2026-06-16T00:00:00Z", favoriteEstimateSheets: [] }]);
    render(<QueryClientProvider client={queryClient}><RealtimeAuthBridge /></QueryClientProvider>);
    expect(authCallback).toBeTypeOf("function");
    authCallback?.("SIGNED_OUT", null);
    expect(queryClient.getQueryData(favoritesQueryKeys.sidebar(scope))).toBeUndefined();
    expect(queryClient.getQueryCache().findAll({ queryKey: favoritesQueryKeys.all() }).length).toBe(0);
  });
});
```
- [ ] **Step 2: Run — expect FAIL:** `bunx vitest run tests/vitest/realtime-auth-bridge-favorites-clear.test.tsx --maxWorkers=1`
- [ ] **Step 3: Implement** — import `useQueryClient` + `favoritesQueryKeys`, capture the client, clear in the `SIGNED_OUT` branch, add `queryClient` to the effect deps:
```tsx
const queryClient = useQueryClient();
// ...
} else if (event === "SIGNED_OUT") {
  queryClient.removeQueries({ queryKey: favoritesQueryKeys.all() }); // 13 C5
  void applyAuth(undefined);
}
```
- [ ] **Step 4: Run — expect PASS; type-check; commit:**
```bash
bunx vitest run tests/vitest/realtime-auth-bridge-favorites-clear.test.tsx --maxWorkers=1
bun run type-check
git add src/components/realtime-auth-bridge.tsx tests/vitest/realtime-auth-bridge-favorites-clear.test.tsx
git commit -m "fix(favorites): clear favorites cache on logout (SIGNED_OUT)"
```
> Scope-change eviction (C4) already lives in `useSidebarFavoritesQuery` (Phase 1). Phase 5 only verifies it (QA-12).

### Task 5.2 — Focus rescue on item removal (QA-18 / QA-21, R20)

**Files:** Modify `src/components/sidebar/MainSidebar.tsx` (header `tabIndex={-1}` already added in 1.6; add the rescue effect); Test `tests/vitest/main-sidebar-favorites-focus.test.tsx`.

- [ ] **Step 1: Write the failing test** — render the query-wired sidebar with ≥2 favorites, focus the second link, drive an unfavorite that removes it, assert focus landed on a remaining link (not `<body>`); a second case removes the only project and asserts focus on `[data-sidebar-favorites-header]`:
```tsx
// load-bearing assertions (full render harness mirrors main-sidebar-favorites.test.tsx)
const p2 = within(nav).getByRole("link", { name: "Second Project" });
p2.focus();
// remove p2 optimistically (drive the wired toggle or setQueryData to drop p2)
await waitFor(() => {
  expect(document.activeElement).not.toBe(document.body);
  expect(document.activeElement).toBe(within(nav).getByRole("link", { name: "Lewis Residence" }));
});
// empty case: remove the last project
await waitFor(() => { expect(document.activeElement).toBe(nav.querySelector("[data-sidebar-favorites-header]")); });
```
- [ ] **Step 2: Run — expect FAIL** (focus falls to `<body>`): `bunx vitest run tests/vitest/main-sidebar-favorites-focus.test.tsx --maxWorkers=1`
- [ ] **Step 3: Implement** — capture whether the removed link held focus; in a layout effect after the list updates, scan `[data-sidebar-favorite-project], [data-sidebar-favorite-sheet]` in DOM order and focus nearest-above → else nearest-below → else `[data-sidebar-favorites-header]` (`08` Focus management). Rows already carry `data-sidebar-favorite-project` (`:249`) / `data-sidebar-favorite-sheet` (`:281`).
- [ ] **Step 4: Run — expect PASS; type-check; commit:**
```bash
bunx vitest run tests/vitest/main-sidebar-favorites-focus.test.tsx --maxWorkers=1
bun run type-check
git add src/components/sidebar/MainSidebar.tsx tests/vitest/main-sidebar-favorites-focus.test.tsx
git commit -m "feat(favorites): focus rescue when a favorite link is removed"
```

### Task 5.3 — Live regions: polite/assertive + dedup (QA-20, R3/R12)

**Files:** Modify `src/components/sidebar/MainSidebar.tsx` (two `sr-only` regions added in 2.4 — finalize dedup + 6s clear); Test `tests/vitest/main-sidebar-favorites-live-region.test.tsx`.

- [ ] **Step 1: Write the failing test** — both regions render always-mounted; `data-sidebar-favorites-status` is `aria-live="polite"`, `data-sidebar-favorites-alert` is `aria-live="assertive"`; D5 cue copy appears in polite; failure copy in assertive; a second cue clears the polite region to `""` before writing (use `vi.useFakeTimers()` for the ~6s clear):
```tsx
const polite = nav.querySelector("[data-sidebar-favorites-status]");
const alertRegion = nav.querySelector("[data-sidebar-favorites-alert]");
expect(polite).toHaveAttribute("aria-live", "polite");
expect(alertRegion).toHaveAttribute("aria-live", "assertive");
expect(polite).toHaveTextContent("Estimate favorited. Favorite the project to pin it in the sidebar.");
expect(alertRegion).toHaveTextContent("Could not update favorite. Try again.");
```
- [ ] **Step 2: Run — expect FAIL** (regions/dedup incomplete): `bunx vitest run tests/vitest/main-sidebar-favorites-live-region.test.tsx --maxWorkers=1`
- [ ] **Step 3: Implement** — finalize the announcer state: clear polite text to `""` immediately before each write (no stacking, `08`), `setTimeout(..., 6000)` clears both; assertive copy driven by the hooks' `onError`.
- [ ] **Step 4: Run — expect PASS; type-check; commit:**
```bash
bunx vitest run tests/vitest/main-sidebar-favorites-live-region.test.tsx --maxWorkers=1
bun run type-check
git add src/components/sidebar/MainSidebar.tsx src/hooks/use-sidebar-favorites-announcer.ts tests/vitest/main-sidebar-favorites-live-region.test.tsx
git commit -m "feat(favorites): polite/assertive live regions with dedup"
```

### Task 5.4 — Insert/remove fade + `prefers-reduced-motion` (R12)

**Files:** Modify `src/components/sidebar/MainSidebar.tsx` (project/sheet row wrappers); Test `tests/vitest/main-sidebar-favorites-animation.test.tsx`.

- [ ] **Step 1: Write the failing test** (class/structure proxy for animation):
```tsx
const row = nav.querySelector("[data-sidebar-favorite-project]");
expect(row?.className).toContain("motion-reduce:transition-none");
expect(row?.className).toMatch(/transition-\[opacity\]|transition-opacity/);
expect(within(nav).getByRole("link", { name: /Lewis Residence/ })).toHaveClass("h-7");
```
- [ ] **Step 2: Run — expect FAIL:** `bunx vitest run tests/vitest/main-sidebar-favorites-animation.test.tsx --maxWorkers=1`
- [ ] **Step 3: Implement** — add `transition-[opacity] duration-[120ms] ease-out motion-reduce:transition-none` to the row wrapper + an opacity class keyed to optimistic-insert; keep `h-7` pre-allocated (no layout shift). No JS animation; reuse the existing `prefersReducedMotion` plumbing (`MainSidebar.tsx:98-100`).
- [ ] **Step 4: Run — expect PASS; type-check; commit:**
```bash
bunx vitest run tests/vitest/main-sidebar-favorites-animation.test.tsx --maxWorkers=1
bun run type-check
git add src/components/sidebar/MainSidebar.tsx tests/vitest/main-sidebar-favorites-animation.test.tsx
git commit -m "feat(favorites): insert/remove fade with prefers-reduced-motion safety"
```

### Task 5.5 — Final QA evidence sweep (`07` validation + QA-01..22 + Repro A/B → `10` report)

- [ ] **Step 1: Run the full focused suite, capture exit codes:**
```bash
bunx vitest run tests/vitest/main-sidebar-favorites.test.tsx tests/vitest/sidebar-favorites-shaping.test.ts tests/vitest/sidebar-favorites-cache.test.ts tests/vitest/use-sidebar-favorites-query.test.tsx --maxWorkers=1
bunx vitest run tests/vitest/project-favorite-sidebar-mutation.test.tsx tests/vitest/estimate-favorite-sidebar-mutation.test.tsx --maxWorkers=1
bunx vitest run tests/vitest/workshop-favorite-actions-hygiene.test.ts tests/vitest/realtime-auth-bridge-favorites-clear.test.tsx tests/vitest/main-sidebar-favorites-focus.test.tsx tests/vitest/main-sidebar-favorites-live-region.test.tsx tests/vitest/main-sidebar-favorites-animation.test.tsx --maxWorkers=1
bun run type-check
git diff --check
```
- [ ] **Step 2: Walk QA-01..QA-22 + Repro A/B** (`10`, `11 §2`), mapping each to a test, code proof, or manual note. Run QA-08/09 + Repro A/B under authenticated state (`11 §5`); if browser/auth is unavailable, record the gap under QA-16 — do not fake a PASS.
- [ ] **Step 3: Fill the evidence table below; restate residual risks (`11 §6`); confirm temporary harnesses removed.**
- [ ] **Step 4: Only after evidence exists, update `.ai/10_state/decisions.md`** (`03 §4` final bullet) and commit.

### Phase 5 — Final QA Evidence Table (`10` report shape)
```md
## Sidebar Favorites QA Evidence
| Scenario | Status | Evidence |
|---|---|---|
| QA-01 Favorite project → card + sidebar, no router.refresh | PASS/FAIL | project-favorite-sidebar-mutation.test.tsx + grep guard |
| QA-02 Unfavorite project w/ nested sheets | PASS/FAIL | mutation test + reload-parity note |
| QA-03 Estimate under visible favorite parent | PASS/FAIL | estimate-favorite-sidebar-mutation.test.tsx |
| QA-04 Estimate under non-favorited parent | PASS/FAIL | row updates; polite cue (5.3); sidebar no-op |
| QA-05 9th project trims to top 8 | PASS/FAIL | sidebar-favorites-shaping.test.ts |
| QA-06 6th sheet trims to top 5 | PASS/FAIL | sidebar-favorites-shaping.test.ts |
| QA-07 Estimate under favorited parent outside top-8 | PASS/FAIL | cache no-op test; no cue |
| QA-08 Rapid project favorite→unfavorite→favorite | PASS/FAIL/GAP | rapid-toggle test; auth-browser if available |
| QA-09 Rapid estimate toggle w/ in-flight refetch | PASS/FAIL/GAP | cancelQueries lifecycle test (11 §4.2) |
| QA-10 Project action rejects → rollback + a11y error | PASS/FAIL | mocked-rejection test; assertive region |
| QA-11 Estimate action rejects → rollback + a11y error | PASS/FAIL | mocked-rejection test |
| QA-12 Scope change evicts old | PASS/FAIL | use-sidebar-favorites-query.test.tsx (C4) |
| QA-13 Non-boolean/invalid UUID fails closed | PASS | workshop-favorite-actions-hygiene.test.ts |
| QA-14 Cross-workspace id → no leakage | PASS | delete workspace_id authz test |
| QA-15 Long/unicode/instruction-like names | PASS/FAIL | render-as-text component test (C6) |
| QA-16 Browser/auth proof unavailable | GAP/N/A | record gap; component/type evidence still run |
| QA-17 Sign out then different user → no residue | PASS | realtime-auth-bridge-favorites-clear.test.tsx |
| QA-18 Focused link removed → focus rescued | PASS | main-sidebar-favorites-focus.test.tsx |
| QA-19 Navigate routes → refetch (staleTime 0) | PASS/FAIL | staleTime:0 grep + hook proof |
| QA-20 Rapid toggles + SR → no stacking | PASS | live-region dedup test |
| QA-21 Unfavorite active route → removed, focus rescued | PASS | focus test active-route case |
| QA-22 No favorite string → dangerouslySetInnerHTML | PASS | grep proof + render-as-text test (C6) |
| Repro A (project flow) | PASS/GAP | auth-browser (11 §2) |
| Repro B (estimate flow) | PASS/GAP | auth-browser (11 §2) |

Commands: [exit code] <command>  (one per command above)
Residual risks (11 §6): exact Next-internal cause unpinned (accepted; Route A removes the dependency); §4 race args design-only until QA-08/09 + Repro A/B run under auth.
Cleanup: temporary harnesses removed; decisions.md updated only after evidence.
```

---

## 7. Cross-cutting risk register

| Risk | Likelihood | Mitigation | Phase / owner |
|---|---|---|---|
| `staleTime` reverts to global 5-min default → silent cross-route staleness (D4) | Low | grep guard in Phase 1 checklist; hook unit test | Phase 1 |
| Server vs client build the scope key differently → silent no-op (D2) | Med | one shared `favoritesQueryKeys.sidebar` builder; type-check forces the prop at every call site | Phases 1/3 |
| `router.refresh()` reintroduced for favorites | Low | grep guards in Phase 3 checklist + tests | Phase 3 |
| Concurrent Project Groups edits to the 5 shared files | Med | `12` ownership matrix; rebase, don't overwrite; re-confirm line refs | All |
| Per-mount Zustand store leaks into shared cache | Low | `store` only on the input, never in `setQueryData` (§5.3) | Phase 2 |
| Exact Next-internal repaint cause never reproduced | Accepted | fix removes the dependency (`11 §3`); confirm via Repro A/B | Phase 5 |
| Logout/scope cache residue | Low | C4 eviction (P1) + C5 logout clear (P5) | Phases 1/5 |

## 8. Definition of Done

- [ ] All phase exit gates green (0 → 5).
- [ ] Full focused suite passes under `--maxWorkers=1`; `bun run type-check` clean; `git diff --check` clean.
- [ ] No `router.refresh()` on any favorite path (grep proof). `staleTime: 0` present on the favorites query (grep proof).
- [ ] QA-01..QA-22 each PASS or an explicitly recorded gap (QA-16); Repro A/B run under auth or gap recorded (`11 §5`).
- [ ] Logout clears the favorites cache; scope change evicts the previous scope (QA-17, QA-12).
- [ ] Unrelated dirty files preserved (`12`); the five shared files merged without clobbering concurrent work.
- [ ] Residual-risk register restated (`11 §6`); `.ai/10_state/decisions.md` updated only after evidence.
- [ ] Completion handoff names: files changed, commands + exit codes, browser-proof status, residual gaps, dirty-file preservation (`09`).

## 9. Implementation-time confirmations (consolidated `⚠️` list — verify against source, do not invent)

1. `getCurrentUserContext()` user-id field — `currentUser.id` vs `currentUser.userId` (`src/lib/auth/session.ts`). Used in scope sourcing (1.5, 3.2, 3.3).
2. `ensureDefaultWorkspace()` export + return shape `{ workspace: { id }, profile: { id } }` (used at `workspace-repository.ts:1206`).
3. `created_at` non-null in the `project_favorites`/`estimate_favorites` select rows (`workspace-repository.ts:1211,:1230`); coerce/assert if generated types say nullable (1.2).
4. `@tanstack/react-query@5.100.14` `isPending` vs `isLoading` with `initialData` present — pick the flag that is `false` when seeded (1.6).
5. `createProjectEstimatesStore` / `ProjectEstimatesStore` export names + `patch(id, partial)` signature (`project-estimates-store.ts:97`) (Phase 2).
6. Phase-2 cue: only the *non-favorited* parent announces; *favorited-but-hidden (outside top-8)* is silent (`08`) (2.2/2.4).
7. `page.tsx` (estimates) `projectCode` field name + `isSidebarFavorite` source + `workspaceId` via `ensureDefaultWorkspace()` (2.3).
8. `projects-page-client.tsx`: the sole `router.refresh()` is on the favorite path (`~:514-516`); `projectItems`/`item.project.project_code` field names; `router`/`startTransition` still needed elsewhere (3.2).
9. `src/app/workshop/projects/page.tsx` + the `/workshop` page: how `workspaceId`/`userId` are sourced; reuse the shell's exact source for an identical key (D2) (3.2/3.3).
10. `WorkshopHomebaseClient` `removedProjectNotice`/`projectName`/`projectCode` field names (3.3).
11. `RealtimeAuthBridge` is mounted inside `QueryClientProvider` (`src/app/providers.tsx`) — decides in-bridge vs sign-out-path logout clear (5.1).
12. Announce bridge: whether `MainSidebar` + the estimates button share a provider; if not, use a module-scoped event/ref (2.4/5.3).

## 10. Self-review (per writing-plans)

- **Spec coverage:** every requirement R1–R20 (`07`) maps to a task — R1/R8→3.1-3.2, R2/R3→2.x, R4/R16→1.4, R5→1.3, R6/R19→1.2/2.1, R7→1.1, R9/R15→4.x, R10→4.2 guard, R11→3.3, R12/R20→5.2-5.4, R13→Phase 0, R14→1.3, R17→5.1, R18→1.4. Decisions D1–D14 are each operationalized (see §5 + per-task citations).
- **Placeholder scan:** every code step shows real code; every `⚠️` marks a verify-don't-invent point (consolidated §9), not a TODO.
- **Type consistency:** names/signatures are pinned once in §5 and reused verbatim across phases; the three drafting-drift points are harmonized in §5.3 (canonical op union, `toggle(input, options?)`, `store` on the input).
- This guide is executable top-to-bottom; docs `00`–`13` remain the authority for any detail not reproduced here.
