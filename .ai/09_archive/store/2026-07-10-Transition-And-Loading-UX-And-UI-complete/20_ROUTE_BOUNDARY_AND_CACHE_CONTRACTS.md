# Route Boundary and Cache Contracts

**Authority:** This document is the single source of truth for per-route App Router boundary, rendering, cache-finalization, and revalidation decisions. Required by the planning-suite Improve directive ("route-specific App Router boundary/cache contract for every affected route"). Cache Components is **OFF** (verified: zero `unstable_cache`/`revalidateTag`/`cacheTag`/`cacheLife` repo-wide).

All evidence is repo-current as of 2026-07-07 (read by `Explore` lane from `src/app/**`, `src/lib/**/actions.ts`, `src/proxy.ts`, `src/lib/auth/request-proxy.ts`).

## 1. Global revalidation mechanism inventory (what the whole app uses)

| Primitive | Count | Notes |
|---|---|---|
| `revalidatePath` | ~50 sites across 14 Server Action files | The **only** ISR-style server primitive in the repo. No `revalidateTag`. |
| `revalidateTag` / `cacheTag` / `cacheLife` / `use cache` | **0** | Cache Components off; tag-based caching absent. |
| `unstable_cache` | **0** | Repository calls are request-cached via React `cache()` (implicit), not `unstable_cache`. |
| `router.refresh()` | ~38 sites / 18 client files | Returns `void` (non-awaitable) — drives optimistic reconciliation. |
| `queryClient.invalidateQueries` | ~45 sites | Concentrated in `use-estimate-row-mutations.ts` (~40). |
| `fetch` cache directive | 1 site (`SharedLinkActivityFeed.tsx:148`, `cache:"no-store"`, client) | — |
| Segment config `dynamic` | 2 (`/` force-static, `/share/[token]` force-dynamic) | All `/workshop/*` routes have **none** → dynamic by default (read cookies/headers/params). |
| Segment config `runtime` | Only `src/app/api/**/route.ts` (`"nodejs"`) | No page sets `runtime`. Server Action files import `node:crypto` → pin Node runtime for transitively-importing routes. |
| Proxy `Cache-Control` | `request-proxy.ts:21` | Marketing: `s-maxage=31536000`. `/share` + protected + redirects: `private, no-cache, no-store, max-age=0, must-revalidate`. **Only CDN-cache directive in use.** |

## 2. Per-route contracts

Each row: rendering model, server-owned data, client-crossing DTO, dynamic trigger, cache finalization, revalidation mechanism, loading/error boundary.

### `/` (landing)
- **Rendering:** `force-static`, sync Server Component. No request-time data.
- **Server-owned:** none (presentational).
- **DTO to client:** `isLoggedIn={false}` (hardcoded). No user data.
- **Dynamic trigger:** none.
- **Cache finalization:** static at build; proxy `s-maxage=31536000`. Content change requires redeploy (no ISR window).
- **Revalidation:** none (static). 
- **Boundaries:** no `loading.tsx`, no `<Suspense>`, root `global-error` only. **Gap:** none for a static marketing page (acceptable).

### `/share/[token]`
- **Rendering:** `force-dynamic`, async Server Component awaits `params`+`searchParams`+`cookies()`+`headers()` + repository reads.
- **Server-owned:** publication access resolution, snapshot (sanitized), recipient identity.
- **DTO to client:** `token` (raw, already in URL), `viewToken` (HMAC-signed, tamper-proof, bound to snapshotVersion), `recipientEmail?`, sanitized `snapshot` (internal IDs remapped, location scrubbed per `locationVisibility`).
- **Dynamic trigger:** `params` + `cookies` + token-gated repository reads.
- **Cache finalization:** proxy `private, no-store`. **Never cached.** Correct for a token-bearing, per-recipient surface.
- **Revalidation:** n/a (force-dynamic + no-store).
- **Boundaries:** `loading.tsx` (skeleton) + `not-found.tsx`. No in-page `<Suspense>`. **Note:** Server Component redirects to `/api/share/[token]/session` when `recipient` present (cookie-setting boundary) — intentional; document.
- **Gap:** none blocking. **REL-01** applies (soft-404 noindex is current, acceptable; document).

### `/invite/[token]`
- **Rendering:** implicitly dynamic (no segment config), async Server Component awaits `params`+`headers()` + `resolveInviteEntryState` (rate-limit + hash + D1 lookup).
- **Server-owned:** invite resolution (state machine: invalid/expired/revoked/already_used/signed-out/wrong-account).
- **DTO to client:** `InviteResolutionRow` fields (project_name, inviter_label, role, scope, estimate_name, project_code, expires_at, invited_email [wrong-account state only], inviter_email [terminal only]). Raw token is reflected into `<form action="/invite/<rawToken>/accept">` URLs (already in URL).
- **Dynamic trigger:** `params` + token-gated D1 lookup.
- **Cache finalization:** proxy `private, no-store` (under `/invite` public prefix).
- **Revalidation:** n/a.
- **Boundaries:** **no `loading.tsx`, no `error.tsx`, no `<Suspense>`** → blank canvas on slow resolve. **Gap UX-01.**
- **`notFound()` before first await?** No — invalid token resolves to a terminal state UI, not `notFound()`. Acceptable; document (no soft-404 concern since it's an invite preview, not a crawlable resource).

### `/workshop` (dashboard)
- **Rendering:** dynamic (async, awaits `searchParams`+`cookies()` + parallel repository reads via `Promise.all`).
- **Server-owned:** homebase aggregate (`getWorkshopHomebaseData`), favorites, library spotlight, user context.
- **DTO to client:** `homebase`, `inviteBanner`, `removedProjectBanner`, `favoritesScope`, `favoriteProjects`, `librarySpotlight`.
- **Dynamic trigger:** `cookies`/`searchParams`.
- **Cache finalization:** proxy `no-store`. No page-level cache.
- **Revalidation:** `revalidatePath("/workshop")` from `group-actions.ts:90`, `actions.ts:81`, `account-actions.ts:93`, `projects/actions.ts:861`. **Also** client `router.refresh()` in `WorkshopHomebaseClient` → potential double-fetch after mutations. **Gap ARCH-06** (document and pick one path).
- **Boundaries:** `loading.tsx` (dashboard skeleton). No in-page `<Suspense>`. No `error.tsx` → escalates to `global-error`. **Gap UX-02.**

### `/workshop/projects`
- **Rendering:** sync shell; async child `ProjectsData()` in `<Suspense fallback={<ProjectsListSkeleton/>}>`. Deliberate double-avoid (skeleton shared with `loading.tsx`).
- **Server-owned:** `listCurrentWorkspaceProjects` (owned, filtered), favorites, groups.
- **DTO to client:** `projects`, `favoriteProjectIds`, `favoritesScope`, `projectGroups`, `googleMapsApiKey`, `googleMapsMapId`.
- **Dynamic trigger:** async child reads `searchParams`/context.
- **Cache finalization:** proxy `no-store`.
- **Revalidation:** `revalidatePath("/workshop/projects")` (`projects/actions.ts:829,862,1031,1184`, `group-actions.ts:91`, `actions.ts:82,101`). + heavy client `router.refresh()` (16 sites).
- **Boundaries:** `loading.tsx` + in-page `<Suspense>`. No `error.tsx`. **Gap UX-02.**

### `/workshop/projects/[projectId]` (+ layout)
- **Rendering:** layout wraps children in **three `<Suspense>`** (title `ProjectTitleAsync`, chrome `ProjectChromeAsync`, content `ProjectRouteContentFallback`) — streaming spine. Page async.
- **Server-owned:** project, estimate count, recent sheets, activity page, location, client names, edit capability.
- **DTO to client (`ProjectDashboardClient`):** `project`, `fallback`, `estimateCount`, `recentEstimateSheets`, `canEditProject`, `projectLocation`, `projectActivityPage`, `googleMapsApiKey/MapId`, `clientOptions`.
- **Cache finalization:** proxy `no-store`.
- **Revalidation:** `revalidatePath("/workshop/projects/${projectId}")` (`projects/actions.ts:864,1032,1185`, `publication/actions.ts:737`, `location-actions.ts:211,233`, `estimates/actions.ts:1948`).
- **Boundaries:** `loading.tsx` + layout Suspense. No page `error.tsx`. **Gap UX-02.**

### `/workshop/projects/[projectId]/activity`
- **Rendering:** sync shell + async child in `<Suspense fallback={<ProjectActivityLoading/>}>` (reused). Parallel reads.
- **Server-owned:** activity feed, estimates/members/recipients dropdowns, project, URL state parse.
- **DTO to client (`ProjectActivityClient`):** `projectId`, `projectName`, `currentUserId`, `canEdit`, `initialLoadFailed`, `initialState`, `initialData`, `estimates`, `members`, `recipients`.
- **Revalidation:** client `router.refresh()` (`ProjectActivityClient:409`). No `revalidatePath` targets this route.
- **Boundaries:** `loading.tsx` (hand-rolled divs — **Gap UX-04**) + `<Suspense>`. No `error.tsx`. **Gap UX-02.**

### `/workshop/projects/[projectId]/estimates`
- **Rendering:** sync shell + async child `ProjectEstimatesContent` in `<Suspense fallback={<ProjectEstimatesListRouteFallback/>}>`.
- **Server-owned:** `listProjectEstimates`, favorites, edit capabilities (D1-backed).
- **DTO to client (`ProjectEstimatesClient`):** enriched `estimates` (firstNodeId, nodeCount, rowItemCount, totalProjectCost, isFavorite), `parentProject`, `scope`, `canCreateEstimates`, `canEditEstimateById`.
- **Revalidation:** `revalidatePath("/workshop/projects/${projectId}/estimates")` (`projects/actions.ts:865`, `estimates/actions.ts:1949`, `express-promotion-actions.ts:264,297,507`) + client `router.refresh()` (`ProjectEstimatesClient:280`).
- **Boundaries:** **no `loading.tsx`** (only in-page Suspense; parent covers nav). **error.tsx present.** Asymmetric — **Gap UX-01** (add `loading.tsx`).

### `/workshop/projects/[projectId]/estimates/[nodeId]`
- **Rendering:** sync shell + async `EstimateRouteContent` in `<Suspense fallback={<EstimateSheetRouteSkeleton/>}>`. `notFound()` if node missing (called in async child → soft-404 noindex, acceptable for an authenticated route).
- **Server-owned:** `resolveEstimateTabRouteContext` (tree, tabs, budget, edit capability). **Library data is fetched via Server Action from the client** (comment line 67), not in the Server Component.
- **DTO to client (`EstimateWorkspaceClient`):** `EstimateWorkspaceResolved` (projectId, workspaceId, estimateId, nodes, estimateTabs, activeTabId, loadLimitState, sheetAdjustment, canEditEstimate, proposalExportMetadata, surfaceVariant="glass").
- **Revalidation:** heaviest route — `revalidatePath("/workshop/projects/${projectId}/estimates/${estimateId}")` (`estimates/actions.ts:2634`, `express-promotion-actions.ts:265,298,508`, `ai/package-builder/apply.ts:2200-2201,2632`). Estimate-row mutations use ~40 `queryClient.invalidateQueries` (optimistic). **`createEstimateNode` deliberately does NOT `revalidatePath`** (client reconciles).
- **Mount gap ARCH-02:** `EstimateWorkspaceClient.tsx:27,30` dynamic-imports `EstimateSheetTree` (2165 LOC) + `EstimateSheetContent` (2764 LOC) with **default SSR, no `loading`** → ~5k LOC hydrates on critical path despite `EstimateSheetRouteSkeleton` existing.
- **Boundaries:** `loading.tsx` + `<Suspense>` + `error.tsx`. Best-covered leaf.

### `/workshop/library` (+ layout)
- **Rendering:** layout sync (no data). Page async (awaits `searchParams` only for `assertRouteErrorSmoke`).
- **Server-owned:** **nothing active** — `<LibraryOverview/>` is an empty placeholder.
- **Revalidation:** `revalidatePath("/workshop/library")` from several actions — **wasted** (renders nothing).
- **Boundaries:** `loading.tsx` (client skeleton) + `error.tsx`. OK.

### `/workshop/library/components`
- **Rendering:** async; `LibraryComponentsRoute` awaits `getCurrentWorkspaceComponentRowsLibrary({includeDetailGraph:false, itemLimit:24})` — seeds client cache via `initialData`.
- **Server-owned:** first 24 component rows (no detail graph).
- **DTO to client (`LibraryPageClient`):** `initialLibrary`.
- **Revalidation:** **STALE** `revalidatePath("/workshop/components")` (`component-library/actions.ts:309`, `ai/package-builder/apply.ts:1896`) — **no such route**. Real route is `/workshop/library/components`. **Gap ARCH-07 (P1): these calls are no-ops; edits to components won't server-invalidate this route.** Currently masked by client `queryClient.invalidateQueries`.
- **Boundaries:** `loading.tsx` + `error.tsx`. OK.

### `/workshop/library/templates` and `/[templateId]`
- **Rendering:** async; seed reads.
- **Revalidation:** `revalidatePath("/workshop/library/templates")` + `/${templateId}` (correct). Client `invalidateQueries`.
- **Boundaries:** `loading.tsx` + `error.tsx`. OK.

### `/workshop/settings`
- **Rendering:** async (awaits user context).
- **Server-owned:** user role only.
- **DTO to client:** `canManagePlatform`.
- **Revalidation:** `revalidatePath("/workshop/settings")`, `/profile`, `/workspace`, `/feedback` (correct).
- **Boundaries:** single shared `loading.tsx` covers subtree. **No `error.tsx`** anywhere under settings. **Gap UX-02.**

### `/workshop/proposals`
- **Rendering:** sync shell + async child in `<Suspense fallback={<ProposalsListSkeleton/>}>`.
- **Server-owned:** `listRecipientProposals`.
- **DTO to client (`ProposalsPageClient`):** `userEmail`, `initialResult`.
- **Revalidation:** **NO `revalidatePath("/workshop/proposals")` anywhere.** Relies 100% on client `invalidateQueries`. **Gap ARCH-07 (P1): a Server Action mutating recipient proposals without a `revalidatePath` → hard refresh / new tab shows stale data.** Also the hand-rolled focus-refetch (`proposals-page-client.tsx:79`) — **Gap ARCH-03.**
- **Boundaries:** `loading.tsx` + `<Suspense>`. No `error.tsx`. **Gap UX-02.**

### `/workshop/publisher`
- **Rendering:** sync shell + async `PublisherData` in `<Suspense>` (two nested Suspense — slightly redundant; inner never renders).
- **Server-owned:** `readWorkspacePublicationsRoster`.
- **DTO to client (`PublisherRosterClient`):** `roster`, `filters`.
- **Revalidation:** **NO `revalidatePath("/workshop/publisher")` anywhere.** Client `invalidateQueries`/`router.refresh()` only. **Gap ARCH-07 (P1): same stale-on-refresh risk as proposals.**
- **Boundaries:** **no `loading.tsx`** (only `<Suspense>`). `error.tsx` present. **Gap UX-01.**

## 3. Invalidation gaps surfaced by this audit (new findings — must enter the plan)

| Gap ID | Finding | Severity | Fix location |
|---|---|---|---|
| **ARCH-06** | `/workshop` dashboard double-fetch: `revalidatePath("/workshop")` (server) + `WorkshopHomebaseClient.router.refresh()` (client) both fire after mutations | P2 (perf) | Decide one path in Phase 2 |
| **ARCH-07a** | **Stale `revalidatePath("/workshop/components")`** no-op in `component-library/actions.ts:309` + `ai/package-builder/apply.ts:1896`; real route is `/workshop/library/components` | **P1 (correctness)** | Phase 1 fix (rename path) |
| **ARCH-07b** | **`/workshop/proposals` has zero server-side revalidation** — stale on hard refresh/new tab if a Server Action mutates recipient proposals | **P1 (correctness)** | Phase 1 fix (add `revalidatePath`) |
| **ARCH-07c** | **`/workshop/publisher` has zero server-side revalidation** — same stale risk | **P1 (correctness)** | Phase 1 fix (add `revalidatePath`) |

These three ARCH-07 findings are **release-relevant correctness bugs** discovered during this improvement pass, not just UX polish. They are sequenced into Phase 1 (ARCH-07) before broad UX work per the directive's "release-blocking hardening before broad UX" rule.

## 4. Cache-Components / `unstable_instant` future mapping (owner-gated, ARCH-05)

If Cache Components is adopted (Future phase), each route must be reclassified static/dynamic/partial and every `use cache` boundary + `cacheLife`/`cacheTag` named. Today's contract (above) is the pre-migration baseline. `unstable_instant` **cannot** be used in Client Components and **requires** `cacheComponents` enabled (instant.md L19). Prerequisites before any adoption: audit every `cookies()`/`headers()`/uncached fetch (currently in `workshop/layout.tsx`, `/share`, `/invite`, all `/workshop/*` pages) and wrap in local `<Suspense>` + `"use cache"`; keep `/share`+`/invite`+auth+security/error responses no-store. This is a separate plan pack (F-INSTANT).
