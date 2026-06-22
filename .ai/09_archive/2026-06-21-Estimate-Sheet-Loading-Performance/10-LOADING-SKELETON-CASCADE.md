# 10 — Loading-Skeleton Cascade (L1)

**Lane:** L1 Cascade
**Scope:** Every `loading.tsx` + in-layout `<Suspense>` fallback on the path
from `/workshop` down to `/workshop/projects/[projectId]/estimates/[nodeId]`
(the Estimate Sheet); the exact skeleton sequence; the missing
`[nodeId]/loading.tsx`; the mismatched list-skeleton-for-sheet.
**Mode:** READ-ONLY audit of `src/`. No source edits.
**Provenance:** Every claim cites `file:line`. Where a claim rests on Next.js
App Router framework semantics rather than repo code, it is marked
**[framework semantics]** with the canonical check.

---

## 1. Route-to-sheet segment tree

```
/                                            (root)
└── src/app/layout.tsx                       RootLayout (no Suspense) [src/app/layout.tsx:33-46]
    └── providers.tsx                        AppProviders (no Suspense) [src/app/providers.tsx:30-47]
        └── workshop/                        WorkshopLayout (async, no Suspense) [src/app/workshop/layout.tsx:17-34]
            ├── loading.tsx                  ★ route-level loading #1 — StaticWorkshopLoadingShell + WorkshopDashboardSkeleton
            └── projects/                    (segment; no layout.tsx)
                ├── loading.tsx              ★ route-level loading #2 — StaticWorkshopLoadingShell + ProjectsListSkeleton
                └── [projectId]/
                    ├── layout.tsx           ProjectLayout (async) — 2 in-layout <Suspense> ★★ [src/app/workshop/projects/[projectId]/layout.tsx:42-52]
                    ├── loading.tsx          ★ route-level loading #3 — ProjectDashboardLoading (5 Skeletons)
                    └── estimates/
                        ├── loading.tsx      ★ route-level loading #4 — ProjectEstimatesListSkeleton (~101 Skeleton DOM nodes)
                        ├── page.tsx         ProjectEstimatesPage (list)
                        └── [nodeId]/
                            ├── (NO loading.tsx)   ← ABSENT. Confirmed: only error.tsx + page.tsx in dir.
                            ├── error.tsx
                            └── page.tsx           ProjectEstimateNodePage (the Estimate Sheet)
```

**Key confirmations:**
- `estimates/[nodeId]/` contains only `error.tsx` + `page.tsx`. No
  `loading.tsx`. Verified via `ls` of
  `src/app/workshop/projects/[projectId]/estimates/[nodeId]/`.
- The only in-layout `<Suspense>` boundaries on the entire sheet path live in
  `[projectId]/layout.tsx` (lines 42 and 51). No Suspense in
  `src/app/layout.tsx`, `src/app/providers.tsx`, or
  `src/app/workshop/layout.tsx` (verified via `grep -rn "Suspense"` over those
  files).

---

## 2. Loading-boundary inventory

| # | Boundary | Source | Fallback component | Weight (Skeleton DOM nodes, approx.) | file:line |
|---|----------|--------|--------------------|---------------------------------------|-----------|
| L1 | `/workshop` loading | route-level `loading.tsx` | `StaticWorkshopLoadingShell` wrapping a bespoke dashboard bento skeleton | **~80–90** (29 literal `<Skeleton>` + loop-expanded: 2×`ContentTileSkeleton`=14, 3×`LedgerColumnSkeleton`=~56, 1×`SimpleTileSkeleton`=4, plus inline library card ~10) | `src/app/workshop/loading.tsx:125-214` |
| L2 | `/workshop/projects` loading | route-level `loading.tsx` | `StaticWorkshopLoadingShell` + `ProjectsListSkeleton` | **~68** (12 literal + 8-card loop × 7 per card = 56) | `src/app/workshop/projects/loading.tsx:4-14`; `src/components/workshop/ProjectsListSkeleton.tsx:9-46` |
| L3 | `/workshop/projects/[projectId]` loading | route-level `loading.tsx` | `ProjectDashboardLoading` (inline; sidebar + empty main) | **5** (light) | `src/app/workshop/projects/[projectId]/loading.tsx:7-30` |
| L4 | `/workshop/projects/[projectId]/estimates` loading | route-level `loading.tsx` | `ProjectEstimatesListSkeleton` (full estimates **list** table: 12 rows × 8 cols) | **~101** (5 literal + 8 header + 12×8 grid = 96) | `src/app/workshop/projects/[projectId]/estimates/loading.tsx:3-5`; `src/components/workshop/ProjectEstimatesListSkeleton.tsx:10-46` |
| **L5** | **`/workshop/projects/[projectId]/estimates/[nodeId]` loading** | **ABSENT** | **None — inherits parent segment's loading (L4)** per App Router semantics | n/a | `src/app/workshop/projects/[projectId]/estimates/[nodeId]/` (only `error.tsx`, `page.tsx`) |
| S1 | `[projectId]/layout.tsx` actions `<Suspense>` | in-layout `<Suspense>` | `ProjectHeaderChromeSkeleton` (toolbar button placeholders) | **4** (light) | `src/app/workshop/projects/[projectId]/layout.tsx:42-45`; `src/components/workshop/ProjectChromeAsync.tsx:90-104` |
| S2 | `[projectId]/layout.tsx` content `<Suspense>` (wraps `{children}`) | in-layout `<Suspense>` | `ProjectRouteContentFallback` (sidebar + empty main; same shape as L3) | **5** (light) | `src/app/workshop/projects/[projectId]/layout.tsx:51`; `src/components/workshop/ProjectRouteContentFallback.tsx:3-27` |

**Totals:** 4 route-level `loading.tsx` files + 2 in-layout `<Suspense>` on the
path = **6 distinct skeleton states** on the sheet path (one of which, L4, is
the list skeleton mis-shown for the sheet).

**Also relevant — client-side nav overlay (not a Suspense fallback):**
`RouteLoadingOverlay` renders a full-screen `fixed inset-0 z-[150]` white/blur
portal with a centered spinner whenever the `navigation-ui-store` says a
client navigation is in flight, and sets `aria-hidden=true` on
`[data-workshop-page-shell-root]` while navigating. This is a **separate,
global** loading indicator that masks the page during client-side route
transitions. `src/components/ui/route-loading-overlay.tsx:14-50`.

---

## 3. The cascade mechanism — hard-nav vs client-nav

### 3a. Hard navigation / first load (F5) to the sheet

On a full document request, Next.js App Router renders the route segment tree
top-down. Each layout renders as soon as its own async work finishes; each
route-level `loading.tsx` becomes the **fallback for its segment AND every
nested segment that lacks its own `loading.tsx`** [framework semantics —
canonical check: Next.js App Router `loading.js` convention; a loading file
applies to all nested layouts/pages until a deeper loading file overrides].

Because the segment chain has a `loading.tsx` at every level *except*
`estimates/[nodeId]`, and because `[projectId]/layout.tsx` additionally wraps
`{children}` in its own `<Suspense fallback={<ProjectRouteContentFallback />}>`,
the rendering behaves as follows for a hard load of
`/workshop/projects/[projectId]/estimates/[nodeId]`:

1. The shell streams: `RootLayout` → `AppProviders` → `WorkshopLayout` (which
   awaits `headers()` + `getCurrentUserContext()` + terms-gate at
   `src/app/workshop/layout.tsx:18-31`). While these awaits are pending, the
   nearest loading boundary is the **shallowest matching `loading.tsx`**, which
   for the `/workshop/...` tree is `/workshop/loading.tsx` →
   `StaticWorkshopLoadingShell` + the **dashboard bento skeleton (~80–90
   Skeleton nodes)** (L1). This paints first.

2. Once `WorkshopLayout` resolves and rendering descends into `projects/`,
   `projects/[projectId]/`, the next `loading.tsx` boundaries take over
   opportunistically — but because layouts render nested (the parent layout is
   *already* present in the streamed response and only the segment slot
   re-suspends), the user sees the **in-layout** `[projectId]/layout.tsx`
   shell render with its **own** `<Suspense>` fallbacks:
   - S1 (`ProjectHeaderChromeSkeleton`) for the actions slot
     (`[projectId]/layout.tsx:42`), and
   - S2 (`ProjectRouteContentFallback`) for the content slot
     (`[projectId]/layout.tsx:51`).
   These are the nearest Suspense boundaries wrapping the page, so they win
   over the route-level `estimates/loading.tsx` once the `[projectId]` layout
   has resolved. The route-level fallbacks (L1/L2/L3) only painted during the
   moments their parent layouts had not yet streamed in.

3. While the sheet `page.tsx` awaits its data
   (`src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx:36-71`,
   two sequential `Promise.all` blocks: route-context + current-user, then
   tabs + edit-capability), the **content slot is still suspended**. Its
   nearest Suspense boundary is S2 — `ProjectRouteContentFallback` — so that
   is what shows in the content area, *not* the list skeleton, once the layout
   has resolved.

**Why the user perceives "all skeletons flash":** the shallowest fallback
paints first, then resolves downward level by level as each layout's async
work completes and the next inner fallback takes over. Because there are four
`loading.tsx` files stacked above the sheet (L1 → L2 → L3 → L4) plus two
in-layout fallbacks (S1, S2), a slow first-load (where each layout await is
network-bound — see [[hero-path-perf-network-bound]]) makes each fallback
visible long enough to register as a distinct flash. The heavy weights of L1
(~80–90 nodes) and L2 (~68 nodes) make those flashes visually loud.

**Refinement on the "list skeleton for sheet" question (see §4):** during the
*descent* — after `[projectId]/layout.tsx` has resolved but before the sheet
page has — the nearest Suspense boundary is S2
(`ProjectRouteContentFallback`), **not** L4. L4 (`ProjectEstimatesListSkeleton`)
is shown only during the interval where `estimates/loading.tsx` is the active
fallback — i.e., when the request is matched to the `/estimates` segment but
the `[nodeId]` child has not yet taken over the slot. With streaming + nested
Suspense, L4 is *briefly* visible (a flash) as the renderer moves from the
`estimates` segment loading into the `[nodeId]` page's nearest in-layout
boundary (S2). The mismatch is real but its dominant visible artefact is the
flash of a list-shaped skeleton (search bar + 12×8 table grid) on a route that
renders no list.

### 3b. Client-side navigation (e.g. estimates list → sheet, or projects dashboard → sheet)

On a client navigation, App Router does **not** re-render the already-mounted
parent layouts; it only loads the new segment's code/data. The nearest
**unresolved** Suspense boundary's fallback is the one shown while the new
page resolves [framework semantics — React Suspense: only the nearest
unresolved ancestor boundary's fallback is revealed].

For a client nav from `/workshop/projects/[projectId]/estimates` (the list) to
`/workshop/projects/[projectId]/estimates/[nodeId]` (the sheet):
- The `[projectId]/layout.tsx` is already mounted; its two in-layout
  `<Suspense>` boundaries (S1, S2) stay mounted.
- The new `estimates/[nodeId]/page.tsx` and its async work sit inside S2's
  slot (because S2 wraps `{children}` at `[projectId]/layout.tsx:51`).
- Because there is **no `estimates/[nodeId]/loading.tsx`**, App Router falls
  back to the **nearest ancestor `loading.tsx`** for the navigation fallback
  — which is `estimates/loading.tsx` → `ProjectEstimatesListSkeleton` (L4)
  [framework semantics — Next.js "Nested loading.js": when a route segment
  has no loading.js, Next.js uses the parent segment's loading UI during
  navigation to that segment].

**So on a client nav to the sheet, the user sees L4 (`ProjectEstimatesListSkeleton`)
— the full estimates-list skeleton (search bar + toolbar + 12-row × 8-col
table grid, ~101 Skeleton nodes) — even though the destination renders no
list at all.** This is the mismatched-skeleton bug, confirmed.

Concurrently, the global `RouteLoadingOverlay`
(`src/components/ui/route-loading-overlay.tsx:14-50`) paints a full-screen
white/blur overlay + spinner on top (driven by the `navigation-ui-store`),
which partially masks the skeleton underneath but adds its own flash.

### 3c. Summary of which fallback wins, by scenario

| Scenario | Fallback(s) shown | Nearest boundary that catches the sheet page |
|----------|-------------------|----------------------------------------------|
| Hard load (F5), during layout descent | L1 → L2 → (L3/L4 briefly) → S1 + S2 | S2 (`ProjectRouteContentFallback`) once `[projectId]/layout.tsx` is resolved |
| Client nav (list → sheet) | L4 (`ProjectEstimatesListSkeleton`) + global `RouteLoadingOverlay` | L4 (route-level fallback — no `[nodeId]/loading.tsx`) |
| Client nav (projects dashboard → sheet) | L4 + global overlay; S2 may also flash if layout re-suspends | L4 primary |

---

## 4. The mismatched list-skeleton-for-sheet problem (missing `[nodeId]/loading.tsx`)

**Confirmed.** The `estimates/[nodeId]` segment has no `loading.tsx`
(verified: directory contains only `error.tsx` and `page.tsx`). The
consequences are:

1. **On client navigation to the sheet**, App Router uses the nearest
   ancestor segment's `loading.tsx` as the transition fallback
   [framework semantics] — that is `estimates/loading.tsx`
   (`src/app/workshop/projects/[projectId]/estimates/loading.tsx:3-5`),
   which returns `<ProjectEstimatesListSkeleton />`. That component renders a
   full estimates-**list** placeholder: a search bar, a toolbar strip, and a
   12-row × 8-column table grid
   (`src/components/workshop/ProjectEstimatesListSkeleton.tsx:7-44`,
   `SKELETON_ROW_COUNT = 12`, `SKELETON_COLUMN_COUNT = 8`). The Estimate
   Sheet renders no such list — it renders `EstimateWorkspaceClient`
   (`src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx:85-99`),
   a tree + sheet UI. So the user sees a list-shaped skeleton snap into a
   sheet-shaped page.

2. **Which boundary actually "wins" on a hard load** is S2
   (`ProjectRouteContentFallback`) — *not* L4 — because S2 is the nearest
   `<Suspense>` boundary wrapping `{children}` once `[projectId]/layout.tsx`
   has resolved (`[projectId]/layout.tsx:51`). L4 only shows during the
   brief descent interval (or as the fallback-of-record on client nav, per
   §3b). So the two claims are both partially true depending on nav type:
   - **Client nav → sheet:** L4 (list skeleton) wins.
   - **Hard load → sheet:** S2 (`ProjectRouteContentFallback`) wins once
     the project layout is resolved; L4 only flashes during descent.

3. The author of `ProjectEstimatesListSkeleton` already flagged the mismatch
   in a code comment: *"Replaces the node-route shaped
   `ProjectRouteContentFallback` (sidebar + 2-column grid + right rail) so
   first paint no longer flashes the wrong layout and then snaps (finding
   F4 / P0-6)."*
   (`src/components/workshop/ProjectEstimatesListSkeleton.tsx:3-6`). This
   documents that the team is aware L4 is shape-correct for the **list**
   route, and that the node route was previously falling back to a similarly
   misshaped `ProjectRouteContentFallback`. Adding a dedicated
   `[nodeId]/loading.tsx` that mirrors the real sheet shape is the canonical
   fix.

---

## 5. Root-cause summary — the verifiable mechanism behind "all skeletons flash"

- **Five stacked skeleton layers above the sheet.** Four route-level
  `loading.tsx` files (L1 `/workshop`, L2 `projects`, L3 `[projectId]`,
  L4 `estimates`) plus two in-layout `<Suspense>` fallbacks in
  `[projectId]/layout.tsx` (S1 header chrome, S2 content) sit on the path to
  the sheet (`src/app/workshop/projects/[projectId]/layout.tsx:42,51`). With
  React streaming, the shallowest fallback paints first and resolves
  level-by-level as each async layout completes; when layout awaits are
  network-bound (hosted-Supabase RTT, per [[hero-path-perf-network-bound]]),
  each layer is visible long enough to register as a distinct flash.
- **The two heaviest skeletons are at the shallowest segments.** L1
  (`workshop/loading.tsx`, ~80–90 Skeleton DOM nodes — the full dashboard
  bento) and L2 (`projects/loading.tsx`, ~68 nodes — 8 project cards) paint
  first and are the most visually loud, even though the destination is a
  single estimate sheet. These shallow skeletons are the dominant contributor
  to "all skeletons flash" on a hard load.
- **Missing `[nodeId]/loading.tsx` → list skeleton on the sheet route.** The
  `estimates/[nodeId]` segment has no `loading.tsx`
  (only `error.tsx` + `page.tsx`), so client navigations to the sheet fall
  back to `estimates/loading.tsx` = `ProjectEstimatesListSkeleton`
  (~101 nodes: search bar + 12×8 table grid) — a list-shaped skeleton for a
  sheet-shaped page (`src/components/workshop/ProjectEstimatesListSkeleton.tsx:7-44`).
  This is the "wrong skeleton" component of the owner's complaint.
- **Compounding overlay.** The global `RouteLoadingOverlay`
  (`src/components/ui/route-loading-overlay.tsx:14-50`) paints an additional
  full-screen white/blur + spinner on every client navigation and hides the
  shell via `aria-hidden`, adding its own flash on top of the segment
  fallback — so even a "single" client nav can show two loading layers
  simultaneously.

---

## 6. Open checks (carried forward)

- **[framework semantics]** claims above (loading-file inheritance, nearest
  Suspense on client nav) are standard Next.js App Router behavior. They can
  be empirically confirmed by L6 (browser trace / visual screenshot sequence)
  on the canonical URL in `00-PLAN.md` §1.
- The exact *visible duration* of each fallback layer depends on the
  layout/page await timings — owned by L2 (server waterfall) and L3
  (layouts/caching). This doc asserts only the *mechanism* (which fallback is
  eligible to show and in what order), not the timings.
- Whether S2 (`ProjectRouteContentFallback`) or L4
  (`ProjectEstimatesListSkeleton`) is more prominent on a real hard-load of
  the sheet should be confirmed visually; the analysis predicts S2 dominates
  post-layout-resolution and L4 flashes only during descent / on client nav.
