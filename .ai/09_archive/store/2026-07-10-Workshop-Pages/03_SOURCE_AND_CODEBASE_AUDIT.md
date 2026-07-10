# 03 — Source and Codebase Audit

Stack baseline confirmed from `package.json`: `next` **16.2.10**, `react`/`react-dom` **19.2.7**, `@tanstack/react-query` **5.100.14**, `zustand` **5.0.14**. `cacheComponents` is **OFF** (`next.config.ts` experimental block lines **93-106** — only `experimental.staleTimes` and `optimizePackageImports`). No `template.tsx` anywhere in `src/app`.

> **Corrected this improvement cycle (see `08_SECURITY_PRIVACY_THREAT_MODEL.md`):** the original audit understated the auth gate. Verified from source: the `workshop/layout.tsx` gate is the **sole production auth+terms verifier** (middleware only checks cookie presence + does no terms check in prod). This does not change the RC-1/RC-2/RC-3 routing diagnosis, but it changes how Phase 2 must treat the gate — see `11_IMPLEMENTATION_PLAN.md` Phase 2 (rewritten).

---

## 1. Current `/workshop` route tree

```
src/app/workshop/
├─ layout.tsx                         [AUTH/TERMS GATE — renders bare children; NO shell/sidebar]
├─ loading.tsx                        [9.3 KB full dashboard skeleton via StaticWorkshopLoadingShell]
├─ page.tsx                           [dashboard: WorkshopPageShell + WorkshopDashboard]
├─ proposals/
│  ├─ loading.tsx                     [475 B via StaticWorkshopLoadingShell + ProposalsListSkeleton]
│  └─ page.tsx                        [WorkshopPageShell + <Suspense> ProposalsData]
├─ projects/
│  ├─ loading.tsx                     [StaticWorkshopLoadingShell]
│  ├─ page.tsx                        [WorkshopPageShell]
│  └─ [projectId]/
│     ├─ layout.tsx                   [★ renders WorkshopPageShell ONCE — shell persists for sub-routes]
│     ├─ loading.tsx / page.tsx
│     ├─ charts/page.tsx              [no loading.tsx]
│     ├─ data/{loading,page,error}.tsx
│     ├─ activity/{loading,page}.tsx
│     └─ estimates/{page,error}.tsx → [nodeId]/{loading,page,error}.tsx
├─ library/
│  ├─ layout.tsx                      [WorkshopPageShell with library tabs]
│  ├─ loading.tsx / page.tsx / error.tsx
│  ├─ components/{loading,page,error}.tsx
│  └─ templates/{loading,page,error}.tsx → [templateId]/{loading,page,error}.tsx
├─ publisher/{page,error}.tsx         [NO loading.tsx]
├─ settings/
│  ├─ loading.tsx / page.tsx          [parent loading covers sub-pages]
│  └─ {profile,workspace,users,feedback,upload-operations,scan-overrides}/page.tsx  [no per-sub loading]
├─ onboarding/{loading,page}.tsx
├─ {components,feedback,templates,terms}/page.tsx   [no loading.tsx]
├─ pending-invite/route.ts            [route handler]
```

**13 `loading.tsx` files under workshop.** Sub-pages WITHOUT their own `loading.tsx`: `publisher`, `components`, `feedback`, `templates`, `terms`, `projects/[projectId]/charts`, `projects/[projectId]/estimates` (list), all `settings/*`.

---

## 2. The three layouts

| File | Type | Responsibility | Renders shell/sidebar? |
|---|---|---|---|
| `src/app/layout.tsx` | Server | `<html><body>`, `AppProviders`, scripts | No workshop chrome |
| `src/app/workshop/layout.tsx` | Server (async) | **Auth + terms gate ONLY.** Reads `AUTH_REQUEST_PATH_HEADER`; if `isProtectedRouteGateSatisfied` → return children; else `getCurrentUserContext()` (redirect `/login` if none) + terms check. **Returns bare `children`.** | **NO** |
| `src/app/workshop/library/layout.tsx` | Server | Wraps children in `WorkshopPageShell` (library tabs) | Yes (library subtree only) |
| `src/app/workshop/projects/[projectId]/layout.tsx` | Server (async) | Wraps children in `WorkshopPageShell` once | Yes (project subtree only) |

**Critical gap:** there is **no intermediate layout** between `workshop/layout.tsx` and the top-level workshop leaf pages (`proposals`, `projects` list, `publisher`, `settings`, `onboarding`, `feedback`, `components`, `templates`, `terms`, and the `workshop/page.tsx` home). Each of those renders its own `WorkshopPageShell`.

---

## 3. `WorkshopPageShell` — the per-page shell (the cost center)

`src/components/workshop/WorkshopPageShell.tsx` — **async Server Component** (no `"use client"`; line 32 comment). Renders, in order:
- `<main data-workshop-page-shell-root>` (line 171)
- `WebVitalsProbe`, `WorkshopGlassBackdrop` (176–177)
- **`<MainSidebar />`** via `AuthenticatedMainSidebar` inside `<Suspense fallback={<MainSidebarShellFallback>}>` (178–180)
- A workspace-surface card with `WorkshopTitleHeader` (breadcrumbs, actions incl. `WorkshopNotificationEntry` + `WorkshopSettingsModal`)
- `<Suspense fallback={<WorkshopShellContentFallback/>}>{children}</Suspense>` (line 211)
- Footer (`WorkshopFeedbackModal`, optional `ProjectTotalFooterOverlay`, flag-gated `AskFlipFooterAssistant`)
- Reads sidebar-width cookies server-side (`getSidePanelWidthCssVariables`, 57–64).

It is imported by **every** top-level workshop page (workshop home, proposals, projects list, publisher, settings, …).

## 4. `StaticWorkshopLoadingShell` — the loading-state shell (also mounts a sidebar)

`src/components/workshop/StaticWorkshopLoadingShell.tsx` — **static (no `"use client"`)**. Renders the same chrome scaffold as `WorkshopPageShell`:
- `<main data-workshop-page-shell-root>` (33)
- `WorkshopGlassBackdrop` (38)
- **`<MainSidebar />`** (39) ← its OWN sidebar instance, with no favorites props (empty fallback)
- `WorkshopTitleHeader` + content skeleton + footer.

Used by: `workshop/loading.tsx`, `proposals/loading.tsx`, `projects/loading.tsx`, `onboarding/loading.tsx`, `settings/loading.tsx`. (Library + project-nested loading files render inline skeletons WITHOUT this shell.)

## 5. `MainSidebar` — the client chrome

`src/components/sidebar/MainSidebar.tsx` — **`"use client"`** (line 1), ~500 lines. Heavy: hover-prefetch (`usePrefetchOnHover`), favorites query (`useSidebarFavoritesQuery`), `useSidebarFavoritesAnnouncer`, ⌘B / ⌘1–5 keyboard shortcuts, `usePathname`, focus-rescue, layout effects. Internal React state (e.g. `expanded`) is component-instance-local.

**Because both the real shell and the loading shell render `<MainSidebar />`, the sidebar's component identity changes across page → loading → page.** During the brief loading state, a fresh `MainSidebar` mounts with empty favorites (mitigated by server `initialData` seeding + lazy hydration, but the component tree still remounts).

---

## 6. Root layout & providers

- `src/app/layout.tsx` (server): wraps children in `<AppProviders>` + `AuthStateMismatchRecoveryScript`.
- `src/app/providers.tsx` (`"use client"`): `QueryClientProvider` (TanStack Query; staleTime/gcTime 5 min, `refetchOnWindowFocus:false`, `retry:1`), `ToastProvider`, `NotificationProvider`, plus mounted-once clients: `BfcacheHandler`, `PerformanceMonitor`, `NavigationListener`, `RealtimeAuthBridge`, **`RouteLoadingOverlay`**.
- `src/components/ui/route-loading-overlay.tsx`: a client portal overlay that, while navigating, `aria-hidden`s the `[data-workshop-page-shell-root]` element and shows a centered spinner over a blurred backdrop. It is a **global full-route overlay**, not per-segment.

## 7. Middleware / proxy

- `src/middleware.ts` (11 lines): delegates to `proxy()` in `src/lib/auth/request-proxy.ts`. Matcher skips `_next/static`, `_next/image`, `favicon`.
- `request-proxy.ts`: `PROTECTED_PREFIXES=["/workshop"]`. Sets `AUTH_REQUEST_PATH_HEADER` on every request. Auth gate: if Better Auth enabled and a protected route lacks a session cookie → redirect `/login?next=<path>` (228–235). Marks `authVerified`/`termsAccepted` headers under dev bypass. Public routes get long `s-maxage`.
- **Out of scope to change.** The gate must keep working identically.

---

## 8. Root-cause analysis — WHY the workshop skeleton appears for `/workshop/proposals`

This is the heart of the audit. Three doc-cited mechanisms, in order of impact:

### RC-1 (DOMINANT): The chrome is rendered per-page, so the whole shell remounts on navigation.
There is no shared layout rendering `WorkshopPageShell`/`MainSidebar` for the top-level workshop routes. Navigating `/workshop` → `/workshop/proposals` unmounts the source page's `WorkshopPageShell` (and its `MainSidebar`) and mounts the destination's. During the transition, `proposals/loading.tsx` mounts `StaticWorkshopLoadingShell` with its own `MainSidebar`. The sidebar component instance changes identity twice (page→loading→page). This is a React remount cost (re-running hooks, re-subscribing, re-rendering the tree), **independent of the URL shape**. Flattening to `/proposals` would not fix this and would lose the only thing nesting currently *does* give — the shared `workshop/layout.tsx` (auth/terms gate + the `react-complex-tree` CSS import).

> Why nesting does NOT cause the remount: App Router layouts are NOT re-rendered on navigation and preserve state (`node_modules/next/dist/docs/.../03-layouts-and-pages.md:42-44`: "A layout is UI that is shared between multiple pages. On navigation, layouts preserve state, remain interactive, and do not rerender"). The problem is that the chrome lives *below* the layout (inside each page's shell), not *in* the layout.

### RC-2: `workshop/layout.tsx` reads uncached request data, which blocks navigation and suppresses its own loading fallback.
`workshop/layout.tsx:19` calls `await headers()`, and conditionally `getCurrentUserContext()` + `getCurrentUserTermsAcceptanceStatus()` (DB). With `cacheComponents` OFF, the installed docs are explicit:

> `…/03-file-conventions/loading.md` (lines 90-95, "Good to know"): "If the layout accesses uncached or runtime data (e.g. `cookies()`, `headers()`, or uncached fetches), `loading.js` will not show a fallback for it. **Without Cache Components:** Navigation blocks until the layout finishes rendering."

> `…/03-file-conventions/layout.md` (lines 316-323): "Because `loading.js` sits below `layout.js`… it cannot show a fallback for uncached or runtime data access in the layout itself… **Without Cache Components:** The navigation will block until the layout finishes rendering, and the `loading.js` fallback will not be shown."

So the gate layout's request-time reads make the route transition *blocking* and *hide the loading fallback for the layout's own work*. Combined with RC-1's remount, this is why the perceived transition drags.

### RC-3: Full page loads can surface the parent (`workshop/loading.tsx`, 9.3 KB) skeleton.
On a client `<Link>` navigation to `/workshop/proposals`, the shared `workshop` layout stays mounted and only the leaf re-renders, showing `proposals/loading.tsx` (475 B) — **NOT** `workshop/loading.tsx` (`…/02-guides/instant-navigation.md:99-107`; `loading.md:44-48`). 

But on a **full page load / hard refresh / direct URL entry**, the whole tree renders from the document root and the parent Suspense boundary is in scope, so the 9.3 KB `workshop/loading.tsx` can appear as the fallback while the deeper page resolves:

> `…/02-guides/streaming.md` (381-382): "A `loading.js` high in the tree is a valid boundary, so the framework finds it and stops, but now the entire page falls back to a full-page skeleton instead of streaming granularly."

If the user is reproducing by refreshing `/workshop/proposals` or entering the URL directly, RC-3 is the direct cause of "the workshop skeleton shows." On a true in-app link click, RC-1 and RC-2 dominate.

---

## 9. Routing-shape question — flat `/proposals` vs nested `/workshop/proposals` vs route groups

Grounded in installed docs (full citations in `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md`):

- **Nested (current):** shares `workshop/layout.tsx`; layout RSC payload is cached client-side and reused on sibling nav; SPA transitions preserved; prefetch reuses the shared layout chunk. The "cost" of nesting is marginal (more render work server-side) and is framed as a *benefit* by the docs (sharing + partial prefetch + payload reuse).
- **Flat `/proposals`:** a separate top-level route. To share the same chrome you must duplicate the layout (or factor chrome into a component). Per `route-groups.md:30-31`, navigating between different root layouts triggers a **full page load** — so a flat `/proposals` with its own root layout loses the SPA transition from `/workshop`. **Net effect: flat is worse for the user's goal.**
- **Route groups `(workshop)`:** can share a layout WITHOUT adding a URL segment (`route-groups.md:10-27`). `app/(workshop)/proposals/page.tsx` → URL `/proposals` while sharing `app/(workshop)/layout.tsx`. This gives "flat URLs + shared chrome" but **removes `/workshop` from ALL those URLs** — a product/URL-migration decision, not a perf fix, and out of proportion to the actual problem.

**Verdict:** The URL shape is the wrong lever. Keep nested `/workshop/*`. Fix RC-1 (shared chrome) and RC-2 (unblock layout). See `15_DECISIONS…md` DEC-01.

---

## 10. Performance-relevant config today
- `next.config.ts:102-105` → `experimental.staleTimes = { dynamic: 60, static: 180 }`. The comment (94-101) says this deliberately lets the client Router Cache reuse a recently-rendered dynamic segment on Link/back-forward so a warm tab revisit does not re-suspend + re-fire `loading.tsx`. This is correct and should be preserved.
- Prefetching is **production-only** (`link.md:298`). In `next dev` there is no prefetching — a common reason perf observations differ between dev and prod.
- `RouteLoadingOverlay` provides a global spinner overlay during navigation (per `useNavigationUiStore.isNavigating`). This is a separate UX layer from the per-segment `loading.tsx` skeletons.

---

## Evidence file/symbol map (for implementation)

| Area | Path:line | Role | Fix lever |
|---|---|---|---|
| Workshop gate layout | `src/app/workshop/layout.tsx:18-40` | auth/terms gate; `await headers()` | RC-2 (Phase 2) |
| Per-page shell | `src/components/workshop/WorkshopPageShell.tsx:171-211` | mounts MainSidebar + content Suspense | RC-1 (Phase 1 — extract shared chrome into a layout component) |
| Loading shell | `src/components/workshop/StaticWorkshopLoadingShell.tsx:32-76` | mounts its own MainSidebar | RC-1 (Phase 1 — loading state reuses shared chrome; only content skeleton swaps) |
| Sidebar | `src/components/sidebar/MainSidebar.tsx:1` | `"use client"`, heavy | RC-1 (remount avoidance is the win) |
| Proposals page | `src/app/workshop/proposals/page.tsx:19-34` | WorkshopPageShell + Suspense | unchanged structurally after Phase 1 |
| Proposals loading | `src/app/workshop/proposals/loading.tsx:4-15` | StaticWorkshopLoadingShell | simplify after Phase 1 |
| Route overlay | `src/components/ui/route-loading-overlay.tsx:14-50` | global nav spinner | unaffected |
| Config | `next.config.ts:92-106` | staleTimes, cacheComponents OFF | Phase 4 (optional) |
