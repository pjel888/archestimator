# 13 — Verified Codebase Facts: Canonical Reference for Implementation

> ⚠️ **TWO CLAIMS NOW STALE** (corrected in `CODEBASE_AUDIT.md`): (1) "Zero loading.tsx files anywhere" — 6 now exist. (2) "proxy.ts does NOT guard routes" — it does guard /workshop routes and IS the active Next.js 16 middleware. All other claims remain verified against the May 2026 codebase.

**Status:** Mostly valid, two corrections  
**Created:** 2026-05-29

---

## Table of Contents

1. [Export Patterns (Code Splitting Critical)](#1-export-patterns-code-splitting-critical)
2. [React Query Keys (Prefetch Critical)](#2-react-query-keys-prefetch-critical)
3. [Dynamic Rendering Triggers](#3-dynamic-rendering-triggers)
4. [Data Fetching Patterns](#4-data-fetching-patterns)
5. [Component Sizes (Verified)](#5-component-sizes-verified)
6. [Phosphor Icon Imports](#6-phosphor-icon-imports)
7. [bfcache Compatibility](#7-bfcache-compatibility)
8. [Overlay / Navigation Implementation](#8-overlay--navigation-implementation)
9. [Landing Page Architecture](#9-landing-page-architecture)
10. [Caching Infrastructure](#10-caching-infrastructure)

---

## 1. Export Patterns (Code Splitting Critical)

**All 5 proposed code-splitting targets use NAMED exports. None have default exports.**

| Component | Export Style | File:Line | `dynamic()` Safe? |
|-----------|-------------|-----------|-------------------|
| `EstimateSheetContent` | `export function` | `EstimateSheetContent.tsx:3278` | ❌ Default import fails. Must use `.then(mod => mod.EstimateSheetContent)` |
| `EstimateSheetTree` | `export function` | `EstimateSheetTree.tsx:204` | ❌ Same |
| `AddComponentModal` | `export function` | `AddComponentModal.tsx:679` | ❌ Same |
| `LibraryFolderTree` | `export function` | `LibraryFolderTree.tsx:334` | ❌ Same |
| `ComponentLibraryManager` | `export function` | `ComponentLibraryManager.tsx:786` | ❌ Same |

**Correct `next/dynamic` pattern for named exports:**

```typescript
// WRONG (will fail at build — no default export):
const EstimateSheetContent = dynamic(() => import("@/components/workshop/EstimateSheetContent"));

// CORRECT:
const EstimateSheetContent = dynamic(
  () => import("@/components/workshop/EstimateSheetContent").then(mod => mod.EstimateSheetContent),
  { loading: () => <EstimateWorkspaceSkeleton /> }
);
```

**Import sites for each target:**

| Target | Imported by (files) | Import style |
|--------|---------------------|-------------|
| `EstimateSheetContent` | `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx:4` | Named: `import { EstimateSheetContent } from "..."` |
| `EstimateSheetTree` | Same file | Named |
| `AddComponentModal` | `ComponentLibraryManager.tsx` | Named |
| `LibraryFolderTree` | `ComponentLibraryManager.tsx` | Named |
| `ComponentLibraryManager` | `src/app/workshop/library/page.tsx` | Named |

**Re-export risk:** `EstimateSheetContent` re-exports 15+ functions from `./component-library/helpers`. The component also has:
- 12+ embedded sub-components (ActivityFilterDropdown, AuditComponentSnapshotCard, etc.)
- Custom event listeners: `window.addEventListener("keydown", ...)` at lines 3620, 3633, 3837, 3846
- These listeners are cleaned up via useEffect returns — verify after dynamic import

**Impact on documents:** ALL code examples in `04-implementation-plan.md` (Tasks 1.3, 2.3), `10-skeleton-design-system.md` (§4, §5.3), and `06-strategy-adrs.md` (ADR-005) that show `dynamic(() => import(...))` without `.then(mod => mod.ComponentName)` are **incorrect** and will fail at build time.

---

## 2. React Query Keys (Prefetch Critical)

**The ONLY React Query keys in the entire codebase are estimate-related:**

| Key Pattern | Factory | File:Line | Used By |
|------------|---------|-----------|---------|
| `["estimate", estimateId]` | `estimateQueryKeys.detail(id)` | `use-estimate-query.ts:10` | `useEstimateQuery` |
| `["estimate", estimateId, "area-tree"]` | `estimateQueryKeys.areaTree(id)` | `use-estimate-query.ts:11` | `useEstimateAreaTreeQuery` |
| `["estimate", estimateId, "area-tree", "revision"]` | (computed) | `use-estimate-query.ts:34` | Tree revision tracking |

**The following keys listed in `11-prefetch-wiring-map.md` DO NOT EXIST:**

| Claimed Key | Reality |
|-------------|---------|
| `["projects"]` | **Does not exist.** Project list is fetched in Server Component via `listCurrentWorkspaceProjects()`. No React Query hook. |
| `["homebase"]` | **Does not exist.** Homebase data fetched via `getWorkshopHomebaseData()` in Server Component. Client component `WorkshopHomebaseClient` fetches favorites/recent via React Query, but these use per-item keys, not a `["homebase"]` key. |
| `["library"]` | **Does not exist.** Library data fetched via `getCurrentWorkspaceComponentRowsLibrary()` in Server Component. |
| `["templates"]` | **Does not exist.** Templates fetched via `getCurrentWorkspaceEstimateTemplates()` in Server Component. |
| `["project", projectId]` | **Does not exist.** Project detail fetched via `getCurrentWorkspaceProject()` in Server Component (layout + page). |
| `["project", projectId, "estimates"]` | **Does not exist.** Estimates list fetched via `listProjectEstimates()` in Server Component. |
| `["project", projectId, "charts"]` | **Does not exist.** Charts data fetched via `getProjectChartsData()` in Server Component. |

**What this means for prefetching:**

1. **RSC payload prefetch** (`router.prefetch(href)`) — WORKS for all routes. This is the primary prefetch mechanism for Server Component data.
2. **React Query data prefetch** (`queryClient.prefetchQuery()`) — ONLY works for the estimate workspace (`["estimate", id]`, `["estimate", id, "area-tree"]`). These are the only routes that use React Query for data fetching.
3. **For all other routes** (projects, library, templates, settings, homebase, charts): there are no React Query hooks to prefill. The prefetch strategy must focus on `router.prefetch()` and server-side caching (`React.cache()` + `unstable_cache`).

**Query usage inventory:**

| Hook | File | `staleTime` | Notes |
|------|------|-------------|-------|
| `useEstimateQuery` | `use-estimate-query.ts:14` | Global default (30s) | Fetches estimate tree via `estimateRepository.getEstimateTree()` |
| `useEstimateAreaTreeQuery` | `use-estimate-query.ts:21` | **30,000 (explicit override at line 41)** | Fetches area tree via `fetchEstimateTree()` |
| `useEstimateRowMutations` | `use-estimate-row-mutations.ts` | N/A (mutations) | Optimistic updates with snapshot/restore pattern |

**Zero `useSuspenseQuery` calls exist** — all use standard `useQuery`.

---

## 3. Dynamic Rendering Triggers

### 3.1 `cookies()` calls that force dynamic rendering

| File | Line | Purpose | Can Be Moved Client-Side? |
|------|------|---------|--------------------------|
| `WorkshopPageShell.tsx` | 33 | `getSidePanelWidthCssVariables()` reads side-panel width cookies | **YES.** The `side-panel-widths.ts` already has `storageKey` concept. Cookies are named `archestimator_panel_width_{storageKey}`. The `ResizableSidePanel.tsx` already stores widths to cookies via client-side JS. The CSS variables could be injected client-side via a `<style>` tag or CSS custom property mutation. |
| `workshop/page.tsx` | 49 | `cookies()` — purpose unclear from brief read (likely same side-panel pattern or auth) | **Needs investigation.** |
| `app/page.tsx` (landing) | 25 | Cookie consent check (`archestimator_cookie_consent`) | **No.** This gates A/B testing cookie creation server-side. Moving client-side could flash wrong variant. Keep server-side. |
| `share/[token]/page.tsx` | 150, 172, 192 | Password access cookies for shared content | **No.** Security-sensitive — must be validated server-side. |

### 3.2 Auth chain that forces dynamic rendering

Workshop routes call `requireCurrentUserContext()` → `createSupabaseServerClient()` → `cookies()` + `headers()`. This is the primary reason ALL workshop pages are dynamic. There is **no `middleware.ts`** file.

**Key architectural constraint:** Auth is at the data-fetching layer (repository functions), not at a middleware layer. Moving auth to middleware would:
- ✅ Unlock partial static generation for workshop data (if side-panel cookies also moved)
- ❌ Require significant architectural rework
- ⚠️ Risk: middleware runs on every request at the edge — must be fast

### 3.3 No middleware.ts

Confirmed: `src/middleware.ts` does not exist. `src/app/proxy.ts` handles Supabase session cookie refresh but does NOT guard routes.

---

## 4. Data Fetching Patterns

### 4.1 `getCurrentWorkspaceProject()` — Confirmed Double-Fetch

**Layout** (`layout.tsx:22`): `const { project: liveProject } = await getCurrentWorkspaceProject(projectId);`
**Page** (`page.tsx:13`): `const { project } = await getCurrentWorkspaceProject(projectId);`

Both execute on every navigation to `/workshop/projects/[projectId]`. This results in **2 identical Supabase queries** per navigation. `React.cache()` would deduplicate this to 1 query.

### 4.2 Project Layout Query Pattern

```
layout.tsx:
  1. getCurrentWorkspaceProject(projectId) — SEQUENTIAL (awaited before Promise.all)
  2. Promise.all([
       getProjectCollaborationSummary(projectId),
       getProjectPublicationSummary(projectId),
       listProjectEstimateSheets(projectId),
     ]) — PARALLEL (after step 1)
```

The sequential step 1 → step 2 is a **waterfall**. Could be restructured to: fire all 4 in parallel, handle the `liveProject` null case in the catch/fallback.

### 4.3 All workshop `page.tsx` files are Server Components

| Route | Page Type | Data Fetched |
|-------|-----------|-------------|
| `/workshop` | Server Component (redirect check + homebase data) | `getWorkshopHomebaseData()` |
| `/workshop/projects` | Server Component | `listCurrentWorkspaceProjects()` |
| `/workshop/projects/[projectId]` | Server Component | `getCurrentWorkspaceProject()` (re-fetch from layout) |
| `/workshop/projects/[projectId]/estimates` | Server Component | `listProjectEstimates()` |
| `/workshop/projects/[projectId]/estimates/[nodeId]` | Server Component | `Promise.all([getProjectEstimateTreeByNode(), getCurrentWorkspaceComponentLibrary(), requireCurrentUserContext()])` |
| `/workshop/projects/[projectId]/charts` | Hybrid (SC page + CC charts) | `getProjectChartsData()` |
| `/workshop/library` | Server Component | `getCurrentWorkspaceComponentRowsLibrary()` |
| `/workshop/templates` | Server Component | `getCurrentWorkspaceEstimateTemplates()` |

### 4.4 Existing `loading.tsx` / `error.tsx` / Suspense

- **Zero** `loading.tsx` files anywhere in `src/app/` — confirmed
- **Zero** `error.tsx` files anywhere — confirmed
- **Suspense is imported by 0 files** — searched `import { Suspense` and `from "react"` patterns across all `.tsx` files

---

## 5. Component Sizes (Verified)

Line counts verified from file offsets (not just claimed):

| Component | File | Approx. Lines | Verified |
|-----------|------|--------------|----------|
| `EstimateSheetContent` | `EstimateSheetContent.tsx` | ~4,048 | ✅ Last line is 4047 |
| `AddComponentModal` | `AddComponentModal.tsx` | ~2,354 | Component starts at line 679 of a large file |
| `EstimateSheetTree` | `EstimateSheetTree.tsx` | ~1,365 | Component starts at line 204 |
| `LibraryFolderTree` | `LibraryFolderTree.tsx` | ~1,172 | Component starts at line 334 (also exports `LibraryFolderTreeSurface` at 766, `LibraryFolderTreePicker` at 1062) |
| `ComponentLibraryManager` | `ComponentLibraryManager.tsx` | ~1,009 | Component starts at line 786 |
| `ProjectEstimatesTable` | `ProjectEstimatesTable.tsx` | ~846 | Verified |
| `WorkshopPageShell` | `WorkshopPageShell.tsx` | 110 | Verified (smaller than expected) |

Total for top 5: ~9,948 lines of client code eligible for code splitting.

**Note:** `LibraryFolderTree.tsx` exports 3 components (LibraryFolderTree, LibraryFolderTreeSurface, LibraryFolderTreePicker) — only LibraryFolderTree is the primary import target.

---

## 6. Phosphor Icon Imports

### Wrong import path (7 files, 3 with runtime impact):

| File | Icons Imported | Runtime Impact |
|------|---------------|----------------|
| `ContactForm.tsx` | `EnvelopeOpen, Spinner` | **YES** — runtime icon imports |
| `ProjectChartsClient.tsx` | `Plus, X` | **YES** — runtime icon imports |
| `projects-page-client.tsx` | `Cards, GridFour, Plus, Rows, SquaresFour` | **YES** — runtime icon imports |
| `SecondaryClaimSection.tsx` | `type { Icon }` | No — type-only import, erased at compile |
| `ProjectMiniSidebar.tsx` | `type { Icon as PhosphorIcon }` | No — type-only |
| `SidebarNavItemRow.tsx` | `type { Icon as PhosphorIcon }` | No — type-only |
| `MainSidebar.tsx` | `type { Icon as PhosphorIcon }` | No — type-only |

### Correct import path (47 files):

All 47 use `@phosphor-icons/react/dist/ssr`. Names confirmed via `grep` count.

### `next.config.ts` configuration:

The `experimental.optimizePackageImports: ["@phosphor-icons/react"]` helps tree-shaking but doesn't guarantee the SSR path is used for the 3 runtime-import offender files.

---

## 7. bfcache Compatibility

### Confirmed: Zero `beforeunload` / `unload` listeners anywhere

Search pattern `(beforeunload|unload)` across all `.tsx` and `.ts` files in `src/` returned **0 results**. The codebase is clean.

### Confirmed: Zero `Cache-Control: no-store` on workshop pages

Search pattern `no-store` across all `.tsx` and `.ts` files in `src/` returned **0 results**. (The previous plan's note about `/api/share/*` routes having `no-store` was not verified in this audit — but workshop pages are confirmed clean.)

### AddEventListener inventory (bfcache-relevant):

| Event | File(s) | bfcache Blocker? |
|-------|---------|-----------------|
| `popstate` | `navigation-listener.tsx:49` | **No** — popstate is bfcache-safe |
| `click` | `navigation-listener.tsx:41` | **No** |
| `keydown` | `EstimateSheetContent.tsx:3620,3633,3837`, `MainSidebar.tsx:85`, `modal.tsx:42`, `component-library/index.tsx:445` | **No** |
| `scroll` | `NeatWireframeBackground.tsx:80`, `SharePageTabs.tsx:133`, `toolbar-tooltip.tsx:39` | **No** |
| `resize` | `SharePageTabs.tsx:134`, `ResizableSidePanel.tsx:86`, `toolbar-tooltip.tsx:38` | **No** |
| `mousemove`, `mouseup` | `ResizableSidePanel.tsx:138,139` | **No** |
| `mousedown` | `creatable-combobox.tsx:104` | **No** |
| `storage` | `projects-page-client.tsx:98`, `component-library/index.tsx:459` | **No** |
| `online` | `SharePageComments.tsx:92` | **No** |
| `change` (MediaQueryList) | `MainSidebar.tsx:69`, `ResizableSidePanel.tsx:86`, `LandingSmoothScrollProvider.tsx:28` | **No** |
| Custom events | Various | **No** |

### Missing: `pageshow` handler

No file in the codebase contains a `pageshow` event listener. The NavigationListener currently has popstate but NOT pageshow. This is the gap to fill for bfcache restore.

### What the navigation-listener ACTUALLY contains (verified):

```typescript
// src/components/navigation-listener.tsx (actual code)
// NO pageshow handler exists
// Has: popstate handler (line 49)
// Has: click handler (line 41)
// Has: hide() on pathname change (line 23)
```

---

## 8. Overlay / Navigation Implementation

### Current store timing (verified):

```typescript
// src/stores/navigation-ui-store.ts (actual constants)
const MIN_DISPLAY_MS = 250;       // Line 11 — overlay stays for at least 250ms
const SAFETY_TIMEOUT_MS = 10_000; // Line 12 — 10s safety net
// NO SHOW_DELAY_MS — show() fires immediately (line 32-34)
```

### Current overlay behavior:

1. `show()` fires immediately (0ms delay) → overlay appears
2. `hide()` enforces `MIN_DISPLAY_MS (250ms)` → overlay stays visible at least 250ms
3. 10s safety timeout auto-hides if stuck

### Proposed changes vs. current state — VERIFIED MATCH:

- ✅ Add `SHOW_DELAY_MS = 150` — does not currently exist
- ✅ Remove `MIN_DISPLAY_MS` — currently exists at 250ms
- ✅ Keep `SAFETY_TIMEOUT_MS` — currently exists at 10s
- ✅ `NavigationListener` needs `pageshow` handler — confirmed gap

### Providers.tsx order (verified):

```
QueryClientProvider
  → ToastProvider
    → NavigationListener       (before children)
    → {children}                (the page)
    → RouteLoadingOverlay       (after children, portals to body)
```

---

## 9. Landing Page Architecture

### Page type:
`src/app/page.tsx` is a **Server Component** (no `"use client"` directive).

### Data fetching:
- `getLandingAuthState()` — checks if user is logged in (reads cookies)
- `cookies().get("archestimator_cookie_consent")` — consent check
- `getVariant("hero-cta-copy", ...)` — A/B testing variant

### Barrel export count:
`src/components/landing/index.ts` exports **26** components (the plan says 32 — minor discrepancy).

### Components imported by landing page:
18 components imported from the barrel (lines 5-19 of `page.tsx`):
CompanyProofCarouselSection, FAQSection, FinalCTASection, HeroSection, ProductShowcaseSection, SecondaryClaimSection, PricingSection, SolutionSection, PublicPageShell, LandingHeader, LandingFooter, LandingSmoothScrollProvider, ABExperimentProvider

The remaining 8 barrel exports (FeaturesSection, EstimatorEngineSection, PartnerSection, TestimonialSection, CtaLink, PlaceholderMedia, ProductPreview, SectionIntro, ContactForm, ClarityScript, LandingAnalyticsLoader, CookieConsentBanner) are used in landing sub-pages (`/features`, `/pricing`, `/contact`, etc.) or are utility components.

### Below-fold code-splitting candidates:
The landing page renders ALL sections in a single page. Sections below the fold that could be dynamically imported:
- FAQSection
- FinalCTASection
- PricingSection
- PartnerSection
- TestimonialSection

---

## 10. Caching Infrastructure

### What exists (zero):
- ❌ No `"use cache"` directive anywhere
- ❌ No `unstable_cache` usage anywhere
- ❌ No `cacheLife` / `cacheTag` usage anywhere
- ❌ No `generateStaticParams` anywhere
- ❌ No `loading.tsx` anywhere (5 to be created)
- ❌ No `error.tsx` anywhere
- ❌ No `Suspense` imported anywhere (searched `from "react"` patterns)
- ❌ No `useSuspenseQuery` anywhere

### What exists (minimal):
- ✅ `React.cache()` used ONCE — `src/lib/auth/session.ts` wraps `getCurrentUserContext`
- ✅ `staleTime` and `gcTime` in `providers.tsx` (need increase)
- ✅ `revalidatePath()` used in server actions (`src/lib/estimates/actions.ts`, `src/lib/projects/actions.ts`)

### Deduplication gap:
`React.cache()` is applied to `getCurrentUserContext()` but NOT to any repository function. The following repository functions are called multiple times within the same request and would benefit from wrapping:
1. `getCurrentWorkspaceProject()` — called in layout AND page (2 calls per request)
2. `getProjectCollaborationSummary()` — called once but if other components import it, they'd duplicate
3. `getProjectPublicationSummary()` — same
4. `listProjectEstimateSheets()` — same

---

## Summary: Documents vs. Reality

| Plan Document | Claim | Reality | Action |
|--------------|-------|---------|--------|
| 04 §Task 1.3 | `dynamic(() => import("@/.../EstimateSheetContent"))` | Named export — needs `.then()` | **FIX CODE EXAMPLES** |
| 04 §Task 1.3 | `dynamic(() => import("@/.../EstimateSheetTree"))` | Named export — needs `.then()` | **FIX CODE EXAMPLES** |
| 06 ADR-005 | Same pattern | Named exports | **FIX CODE EXAMPLES** |
| 10 §4 | Same pattern | Named exports | **FIX CODE EXAMPLES** |
| 10 §5.3 | Same pattern | Named exports | **FIX CODE EXAMPLES** |
| 11 §1.3 | `["projects"]`, `["homebase"]`, `["library"]` keys | Do not exist | **REWRITE PREFETCH STRATEGY** |
| 11 §2 | `queryClient.prefetchQuery` for sidebar links | Won't work — no hooks with those keys | **REWRITE PREFETCH STRATEGY** |
| 01 §3.8 | Auth forces dynamic rendering | Verified correct | No change needed |
| 02 §2.4 | "Missing exports" risk | Confirmed more severe — ALL are named exports | **UPGRADE RISK** |
| 03 §1.4 | No middleware | Verified correct | No change needed |
| 05 §2.3 | "5 useRouter()" | Already migrated to `useNavigationRouter()` | **FIX STALE REFERENCE** |
| 08 R16 | "Verify default export exists" | Confirmed: ALL are named exports | **UPDATE RISK** |
| All docs | Cookies force dynamic | Verified correct; side-panel path identified | **ADD MIGRATION PATH** |

---

**Next:** See `14-code-splitting-named-exports.md` for the correct `next/dynamic` pattern and `15-server-component-prefetch-reality.md` for the corrected prefetch strategy.
