# CODEBASE AUDIT — Route Transition Performance

**Audit date:** 2026-05-30  
**Method:** Static inspection of live codebase, cross-referenced with plan documents

---

## Framework & Config

| Item | Value | Source |
|------|-------|--------|
| Next.js version | 16.2.6 | `package.json:33` |
| React version | 19.2.6 | `package.json:34` |
| Supabase SSR | 0.10.3 | `package.json:24` |
| TanStack Query | 5.100.14 | `package.json:26` |
| Zustand | 5.0.14 | `package.json:41` |
| TypeScript | 6.0.3 (strict) | `package.json:59` |
| Bundler | Turbopack (Next.js default) | `next.config.ts` |

### Middleware (proxy.ts)

| Attribute | Value | Source |
|-----------|-------|--------|
| File | `src/proxy.ts` (78 lines) | Verified |
| Function | `export async function proxy(request: NextRequest)` | Line 19 |
| Matcher | `["/((?!_next/static|_next/image|favicon.ico).*)"]` | Lines 76-78 |
| Auth method | `supabase.auth.getUser()` | Line 58 |
| Protected prefixes | `["/workshop"]` | Line 7 |
| Auth routes | `["/login"]` | Line 8 |
| Early-return paths | `.` files, `/_next`, `/api` | Lines 22-24 |
| Dev bypass | `ARCHESTIMATOR_DEV_AUTH_BYPASS` env flag, localhost only | Line 29 |
| Public routes checked | YES — `/`, `/about`, `/features`, `/pricing`, `/contact` all pass through to `getUser()` | Lines 22-58 |
| Cache headers | NONE | Verified |
| Redirect behavior | Unauthenticated + protected → `/login?next=...`; Authenticated + auth route → `/workshop` | Lines 60-71 |

### Config

| Item | Value |
|------|-------|
| `next.config.ts` | CSP headers, image patterns, `optimizePackageImports: ["@phosphor-icons/react"]`. No middleware/proxy config. |
| `tsconfig` | ES2017 target, strict mode, path aliases |
| Tests | `bun test tests/unit`, `vitest run`, `playwright test` |
| Validate gate | `type-check && lint && lint:design-system && test && test:dom` |

---

## Route-by-Route Audit

### Public Routes (No Auth Required)

| Route | Page Type | Dynamic Triggers | Data Fetching | Loading | Error | Bundle Risk |
|-------|-----------|-----------------|---------------|---------|-------|-------------|
| `/` | Server Component | `cookies()` (consent), `headers()` (A/B testing) | `getLandingAuthState()`, `getVariant()` | None | None | **HIGH** — Three.js (150KB), 32 landing components, 4 fonts |
| `/about` | Client Component | None | None | None | None | MEDIUM — shared landing barrel |
| `/features` | Client Component | None | None | None | None | MEDIUM |
| `/pricing` | Client Component | None | None | None | None | MEDIUM |
| `/contact` | Client Component | None | `ContactForm` client-side submit | None | None | MEDIUM |
| `/privacy` | Placeholder | None | None | None | None | LOW |
| `/terms` | Placeholder | None | None | None | None | LOW |

### Auth Routes

| Route | Page Type | Dynamic Triggers | Data Fetching | Loading | Error | Bundle Risk |
|-------|-----------|-----------------|---------------|---------|-------|-------------|
| `/login` | Client Component | `cookies()`, `headers()` (proxy redirects if authed) | Supabase Auth UI | None | None | LOW |
| `/auth/callback` | Route handler | Full server-side | OAuth code exchange | N/A | None | NONE |
| `/invite/[token]` | Server Component | `cookies()` | Invite validation, workspace lookup | None | None | LOW |
| `/share/[token]` | Server Component | `cookies()` (password access), `force-dynamic` | Publication validation, tree reconstruction | None | None | MEDIUM — D3 charts, comments, tabs |

### Workshop Routes (Auth Required)

| Route | Page Type | Dynamic Triggers | Data Fetching | Loading | Error | Bundle Risk |
|-------|-----------|-----------------|---------------|---------|-------|-------------|
| `/workshop` | Server Component | `cookies()` (WorkshopPageShell) | `getWorkshopHomebaseData()` | ✅ `loading.tsx` | None | MEDIUM |
| `/workshop/projects` | Server Component | Same | `listCurrentWorkspaceProjects()` | ✅ `loading.tsx` | None | MEDIUM — project cards |
| `/workshop/projects/[projectId]` | SC (layout + page) | Same | `getCurrentWorkspaceProject()` x2 (duplicate) | None | None | HIGH — project shell |
| `/workshop/projects/[projectId]/estimates` | Server Component | Same | `listProjectEstimates()` | None | None | MEDIUM |
| `/workshop/projects/[projectId]/estimates/[nodeId]` | Server Component | Same | `getProjectEstimateTreeByNode()`, `getCurrentWorkspaceComponentLibrary()` | None | None | **CRITICAL** — EstimateSheetContent (4,048 LOC), tree (1,365 LOC) |
| `/workshop/projects/[projectId]/charts` | Hybrid SC+CC | Same | `getProjectChartsData()` | None | None | HIGH — D3 (entire library) |
| `/workshop/library` | Server Component | Same | `getCurrentWorkspaceComponentRowsLibrary()` | ✅ `loading.tsx` | None | HIGH — ComponentLibraryManager (1,009 LOC), modals |
| `/workshop/templates` | Server Component | Same | `getCurrentWorkspaceEstimateTemplates()` | ✅ `loading.tsx` | None | MEDIUM |
| `/workshop/components` | Redirect | N/A | Redirects to `/workshop/library` | N/A | None | NONE |
| `/workshop/settings` | Redirect | Same | Redirects to `/workshop/settings/profile` | ✅ `loading.tsx` | None | LOW |
| `/workshop/settings/profile` | Client Component | Same | Profile form (client-side) | None | None | LOW |
| `/workshop/settings/workspace` | Client Component | Same | Workspace settings form (client-side) | None | None | LOW |
| `/workshop/onboarding` | Redirect | Same | Redirects to `/workshop/settings/profile` | ✅ `loading.tsx` | None | LOW |

### Key Observations

1. **ALL workshop routes are dynamic** — `WorkshopPageShell` calls `cookies()` + `getCurrentUserContext()` which forces `dynamic` rendering
2. **Only 6 routes have loading.tsx** — all under `/workshop/*`. No project-level loading for [projectId] or estimates.
3. **Zero error.tsx files exist** — any component error crashes the full page
4. **Zero Suspense boundaries exist** — all content blocks until data resolves
5. **The estimate workspace is the heaviest route** — 4,048-line EstimateSheetContent + 1,365-line tree + React Query hooks + tree operations

---

## Navigation & Loading Infrastructure

### State Management

| File | Purpose | Key Constants |
|------|---------|---------------|
| `src/stores/navigation-ui-store.ts` | Route transition overlay state | `MIN_DISPLAY_MS = 250`, `SAFETY_TIMEOUT_MS = 10_000` |
| `src/hooks/use-navigation-router.ts` | Router wrapper that triggers overlay on navigation | Wraps `push`, `replace`, `refresh` |

### Overlay Behavior

```
Click link → NavigationListener.show(href) → overlay appears IMMEDIATELY (0ms delay)
                                            → 10s safety timeout armed
                                             
Route commits → usePathname changes → NavigationListener calls hide()
                                       → waits max(0, 250 - elapsed)ms
                                       → overlay disappears
```

### Component Tree (providers.tsx)

```
QueryClientProvider
  → ToastProvider
    → BfcacheHandler (pageshow listener)
    → PerformanceMonitor (store subscriber, dev-only logging)
    → NavigationListener (click + popstate intercept)
    → {children} (page content)
    → RouteLoadingOverlay (portal, z-[150], after children in DOM order)
```

---

## Data & Caching

### React Query Keys (VERIFIED — only 3 exist)

| Key Pattern | Factory | Used By | staleTime |
|------------|---------|---------|-----------|
| `["estimate", id]` | `estimateQueryKeys.detail(id)` | `useEstimateQuery` | 30s (global) |
| `["estimate", id, "area-tree"]` | `estimateQueryKeys.areaTree(id)` | `useEstimateAreaTreeQuery` | 30s (overridden) |
| `["estimate", id, "area-tree", "revision"]` | (computed) | Internal revision tracking | N/A |

**No other React Query keys exist.** Projects, library, templates, homebase, settings, charts data is ALL fetched in Server Components.

### Server-Side Caching

| Mechanism | Usage | Location |
|-----------|-------|----------|
| `React.cache()` | 1 use — `getCurrentUserContext()` | `src/lib/auth/session.ts` |
| `unstable_cache` | 0 uses | — |
| `cacheTag` / `cacheLife` | 0 uses | — |
| `revalidatePath` | Used in server actions | `src/lib/estimates/actions.ts`, `src/lib/projects/actions.ts` |
| `"use cache"` directive | 0 uses | — |
| `force-static` / ISR | 0 uses | — |

### QueryClient Config (providers.tsx)

```typescript
staleTime: 30_000          // ← TOO SHORT for navigation patterns
gcTime: 5 * 60_000         // 5 min garbage collection
refetchOnWindowFocus: false
retry: 1
```

### Repository Double-Fetch (Verified)

`getCurrentWorkspaceProject(projectId)` is called in BOTH:
- `src/app/workshop/projects/[projectId]/layout.tsx:22`
- `src/app/workshop/projects/[projectId]/page.tsx:13`

Results in 2 identical Supabase queries per navigation. `React.cache()` would deduplicate.

---

## Component Audit

### High-Cost Components — Export & Split Status

| Component | LOC | Export Style | Currently Code-Split? | Should Split? | Safe for ssr:false? |
|-----------|-----|-------------|----------------------|---------------|---------------------|
| EstimateSheetContent | ~4,048 | `export function` (named) | ❌ No | ✅ Yes | ✅ Yes (client-only tree) |
| EstimateSheetTree | ~1,365 | `export function` (named) | ❌ No | ✅ Yes | ✅ Yes (client-only tree) |
| AddComponentModal | ~2,354 | `export function` (named) | ❌ No | ✅ Yes | ✅ Yes (modal, user-triggered) |
| LibraryFolderTree | ~1,172 | `export function` (named) | ❌ No | ✅ Yes | ✅ Yes |
| ComponentLibraryManager | ~1,009 | `export function` (named) | ❌ No | ✅ Yes | ⚠️ Mixed — has server data |
| ProjectEstimatesTable | ~846 | Named | ❌ No | ⚠️ After measurement | ⚠️ Mixed |
| LiveProjectCard | Unknown | Named | ❌ No | ⚠️ After measurement | ❌ No |
| WorkshopPageShell | 126 | `export async function` (named) | ❌ No | ❌ No | ❌ No (auth required) |
| MainSidebar | Unknown | Named + "use client" | ❌ No | ⚠️ After measurement | ❌ No (critical UX) |
| ProjectMiniSidebar | Unknown | Named | ❌ No | ⚠️ After measurement | ❌ No |

### Bundle-Heavy Dependencies

| Dependency | Where Used | Impact | Recommendation |
|-----------|-----------|--------|----------------|
| Three.js (150KB) | `NeatWireframeBackground` in HeroSection (above-fold) | 65% of landing page JS | Dynamic import with CSS placeholder; OR replace with CSS gradient |
| D3 (entire library) | `ProjectChartsClient` → `ProjectCostDonutChart`, `ProjectCostBubbleChart` | Heavy for charts-only route | Already isolated to 2 chart components. Use `ssr: false` on dynamic import. |
| @phosphor-icons/react | 47 files (correct SSR path), 3 files (wrong path) | Medium | `next.config.ts` has `optimizePackageImports`. Fix 3 runtime-import files. |
| @firecms/neat (Three.js wrapper) | `HeroSection` → `NeatWireframeBackground` | 150KB (patched with `paused` property) | Dynamic import + CSS placeholder |

### Phosphor Import Errors (3 Files)

| File | Icons | Fix |
|------|-------|-----|
| `ContactForm.tsx` | `EnvelopeOpen, Spinner` | Change to `@phosphor-icons/react/dist/ssr` |
| `ProjectChartsClient.tsx` | `Plus, X` | Change to `@phosphor-icons/react/dist/ssr` |
| `projects-page-client.tsx` | `Cards, GridFour, Plus, Rows, SquaresFour` | Change to `@phosphor-icons/react/dist/ssr` |

---

## Stale Plan Claims — Verified Corrections

| Plan Claim | Source Doc | Reality | Correction |
|-----------|-----------|---------|------------|
| "No loading.tsx files exist" | Doc 13 §4.4 | 6 loading.tsx exist | Fixed |
| "Zero Suspense imported" | Doc 13 §4.4 | Still true (0 Suspense) | No change |
| "proxy.ts does NOT guard routes" | Doc 13 §3.3 | Does guard /workshop | Fixed |
| "proxy.ts is dead code" | Doc 31 §2 | Active in Next 16 | Fixed |
| "Create middleware.ts" | Doc 04 Task 1.5.1, Doc 31 §4 | proxy.ts IS the middleware | Fixed |
| "getSession() for speed" | Doc 31 §5, Doc 06 ADR-013 | Security risk | Fixed |
| "150ms show delay" | Doc 12 §6, Doc 06 ADR-006 | Contradicts current behavior | Fixed |
| React Query keys for projects/library/templates | Doc 11 §1.3, Doc 04 Task 2.2 | Don't exist | Fixed |
| Static side-panel width cookie migration | Doc 30 §4.2 | Not ready — requires architectural change | Deferred |
| "5 useRouter() in estimates table" | Doc 05 §2.3 | Already migrated to useNavigationRouter | Fixed |
