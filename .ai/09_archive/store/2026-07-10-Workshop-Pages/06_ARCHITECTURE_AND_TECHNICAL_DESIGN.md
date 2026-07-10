# 06 — Architecture and Technical Design

## Current-state architecture

```
… /workshop/layout.tsx  (auth/terms GATE; returns bare children; reads headers() → BLOCKS)
      └─ {loading.tsx OR page.tsx}   ← each independently renders full WorkshopPageShell (+MainSidebar)
```

There is **no chrome-owning layout** for top-level workshop routes. The chrome (`WorkshopPageShell` → `MainSidebar`, glass backdrop, title bar, footer) is mounted inside each `page.tsx` and each top-level `loading.tsx`. Consequence: the chrome is part of the *page segment*, so it is torn down and rebuilt on every cross-page navigation.

Only two subtrees do it right today:
- `projects/[projectId]/layout.tsx` renders `WorkshopPageShell` once → its sub-routes (data/activity/estimates/charts) keep a persistent shell.
- `library/layout.tsx` renders `WorkshopPageShell` once → its sub-routes (components/templates) keep a persistent shell.

## Target-state architecture

```
/workshop/layout.tsx
   ├─ does auth/terms gating (BEHAVIOR-PRESERVING)
   ├─ renders the persistent chrome once: <WorkshopShell>  (sidebar + glass + title-bar slot + footer)
   │     └─ <Suspense fallback={<WorkshopContentSkeleton/>}>{children}</Suspense>   ← only THIS swaps
   └─ keeps the react-complex-tree CSS import here (already here)
```

Each top-level workshop `page.tsx` then renders **only its content** (no `WorkshopPageShell` wrapper). Each top-level `loading.tsx` renders **only a content skeleton** (no `StaticWorkshopLoadingShell` wrapper). The sidebar/header/footer stay mounted for the whole `/workshop/*` session, exactly like they already do inside `projects/[projectId]/*` and `library/*`.

This is structurally the **same proven pattern already used twice in the repo** (`library/layout.tsx`, `projects/[projectId]/layout.tsx`) — not a novel abstraction.

## Why this fixes the perceived problem
- **RC-1 (remount):** eliminated — chrome lives in the layout, which the App Router keeps mounted and does not re-render on navigation (`…/03-layouts-and-pages.md:42-44`; `…/03-file-conventions/layout.md:152-154`).
- **RC-3 (parent skeleton flash):** the only thing that swaps during navigation is the content slot's nearest Suspense boundary, so a content-level skeleton (not the 9.3 KB dashboard skeleton) shows for the streaming page. On full page loads the layout renders immediately as the static shell and only the content streams (`…/02-guides/streaming.md:99,109-113`).
- **RC-2 (blocking gate):** addressed in Phase 2 by moving the uncached `headers()`/DB reads out of the layout's render path (or wrapping them in their own Suspense), per `layout.md:325-329`.

## Routing-shape decision (flat vs nested vs route groups)

| Option | Shared chrome? | SPA transitions from /workshop? | URL change | Doc basis | Verdict |
|---|---|---|---|---|---|
| **Nested (current)** `/workshop/proposals` | Yes (after Phase 1) | Yes | None | `03-layouts-and-pages.md`; `prefetching.md:191-193` | **Recommended** |
| Flat `/proposals` (separate root) | Only by duplicating layout | **No — full page load** between roots | yes (loses `/workshop`) | `route-groups.md:30-31` | Rejected (worse UX) |
| Route group `(workshop)` → `/proposals` | Yes (shared `(workshop)/layout`) | Yes if same root | yes (removes `/workshop` everywhere) | `route-groups.md:10-27` | Rejected (URL migration, not a perf fix) |

> Key doc quote (`prefetching.md:191-193`): "When navigating between sibling routes… it reuses the parent layout and only fetches the updated leaf page." Nesting *enables* the optimization the user wants; it does not prevent it.

**The nested structure is correct. The bug is that the chrome lives in the page, not the layout.**

## Design constraints / invariants to preserve
1. **Auth/terms gate behavior must be byte-for-byte equivalent** after restructuring (same redirects, same bypass paths, same headers). The gate can stay in `workshop/layout.tsx`; only the chrome rendering is added/moved.
2. The `react-complex-tree` CSS import must remain workshop-scoped (do not move it to root — public/marketing routes must not pay for it).
3. Pages that already manage their own shell via a nested layout (`library/*`, `projects/[projectId]/*`) must not double-wrap. Phase 1 must reconcile `WorkshopShell` (new shared chrome) vs the existing `library/layout.tsx`/`projects/[projectId]/layout.tsx` which render `WorkshopPageShell`. **Resolved (P0-3/P0-4):** see `11_IMPLEMENTATION_PLAN.md` "Core design decision: the child→layout slot contract" — the shell is split into **persistent `WorkshopShell`** (layout-owned: sidebar/glass/footer) + **page-owned `WorkshopRouteHeader`** (title/breadcrumbs/actions). Nested layouts stop rendering the full shell and render only `WorkshopRouteHeader` + (mini-sidebar for project) + children. **The original "structurally the same proven pattern as library/projects" claim is retracted** — those layouts own the shell for a *subtree*; this is cross-sibling sharing with per-page header variation, which requires the split contract.
4. `RouteLoadingOverlay` (global nav spinner) and `loading.tsx` (per-segment skeleton) are two different layers; both should remain. Phase 1 reduces reliance on the per-page `StaticWorkshopLoadingShell`.
5. `experimental.staleTimes` stays as-is (correct, deliberate).

## Component boundaries after Phase 1
- `WorkshopShell` (NEW, server component): persistent chrome — `MainSidebar` (+Suspense fallback), glass backdrop, title-bar slot, footer. Renders `{children}` in a content Suspense with a content-level skeleton fallback.
- `WorkshopPageShell` (existing, refactored): becomes the **content** wrapper a page uses inside the shared shell (title/breadcrumbs/actions + content), OR is removed in favor of pages rendering content directly. (Phase 1 decides; both are safe.)
- `StaticWorkshopLoadingShell` (existing): reduced to a **content skeleton** only (no sidebar) for top-level `loading.tsx`; library/project loading already render inline skeletons.

## Cache/freshness ownership (unchanged)
- Server data: fetched in Server Components / repository layer (unchanged).
- Client server-state: TanStack Query (unchanged; favorites query keeps its `initialData` seeding).
- URL state: unchanged.
- Client UI state: Zustand (`navigation-ui-store`, sidebar widths) — unchanged.
- No D1/R2/KV cache changes in scope.

## Not applicable (with reason)
- D1/R2/DO/Queue/Email: no data/provider surface touched → no provider-proof, no migration, no cost model. (Phase 4 cacheComponents eval, if pursued, is a build concern, not a provider concern.)
- Public/share/invite surfaces: untouched.

## Per-route App Router boundary/cache contract (resolves Improve-Prompt §4 requirement)

| Route segment | Files | Rendering mode | Server-owned data | Client-crossing props | Request-time API → dynamic? | Cache/revalidation | Mutation invalidation |
|---|---|---|---|---|---|---|---|
| `workshop/layout.tsx` | `src/app/workshop/layout.tsx` | **dynamic** | gate: `headers()`, `getCurrentUserContext()`, terms status; sidebar-width cookies | none (renders chrome) | YES (`headers()`, `cookies()`) → dynamic | no-store (auth/private) — unchanged | n/a (no mutation) |
| `workshop/page.tsx` (home) | `src/app/workshop/page.tsx` | dynamic | `getWorkshopHomebaseData`, `requireCurrentUserContext`, `ensureDefaultWorkspace`, favorites, library spotlight | `homebase`, `favoritesScope`, `librarySpotlight` → client components | YES (cookies/session) → dynamic | per `withPerfTraceRequest`; TanStack Query client cache (favorites) | existing repo invalidation (unchanged) |
| `workshop/proposals/page.tsx` | `proposals/page.tsx` | dynamic | `requireCurrentUserContext`, `listRecipientProposals` | `userEmail`, `initialResult` → `ProposalsPageClient` | YES (session) → dynamic | `<Suspense>` around `ProposalsData`; TanStack Query | unchanged |
| `workshop/projects/page.tsx` | `projects/page.tsx` | dynamic | project list repo | → client | YES (session) → dynamic | unchanged | unchanged |
| `workshop/library/layout.tsx` | `library/layout.tsx` | dynamic | (after P1: header only) | → `WorkshopRouteHeader` + tabs client | YES → dynamic | unchanged | unchanged |
| `workshop/projects/[projectId]/layout.tsx` | `[projectId]/layout.tsx` | dynamic | project title/metadata (after P1: header + mini-sidebar) | → `WorkshopRouteHeader`, `ProjectMiniSidebar` | YES (`params`, session) → dynamic | unchanged | unchanged |
| top-level `loading.tsx` files | `workshop/loading.tsx` etc. | static shell + dynamic content | none (content skeleton) | none | no | `staleTimes.dynamic:60` | n/a |

**Key contract decisions:**
- **Dynamic rendering is automatic** via `headers()`/`cookies()`/`params` — no `export const dynamic` needed (P2-3 resolved; see 18).
- **No Server Component calls a Route Handler for data it can fetch directly** (unchanged — pages use repository layer).
- **Read-your-own-writes:** unchanged — mutations use existing repo invalidation; the shell refactor adds no mutation path.
- **No new `"use client"` boundaries.** `WorkshopShell`/`WorkshopRouteHeader` are Server Components; client children (`MainSidebar`, action slots) unchanged.
- **Gate reads stay synchronous in the layout** (SEC-T1/T2) — NOT Suspense-wrapped. Chrome's own sub-components (e.g. `AuthenticatedMainSidebar`) keep their existing `<Suspense>` so the shell streams without blocking on the sidebar's favorites.
