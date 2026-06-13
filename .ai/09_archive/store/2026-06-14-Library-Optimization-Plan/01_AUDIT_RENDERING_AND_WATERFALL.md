# 01 — Rendering Architecture & Navigation Waterfall

**Scope:** how `/workshop/library` renders and navigates, and why it feels like full page reloads. Sibling-route context: the same overlay was the #1 felt-latency defect on the Estimates list (see `../2026-06-14-Estimates-List-Page-Performance-Optimization/`).

---

## A. Rendering architecture summary

The Library is **four separate server route segments** sharing one segment layout:

| Route | File | Server fetch before paint |
|---|---|---|
| `/workshop/library` (Overview) | `src/app/workshop/library/page.tsx:17` | `await getLibraryOverview()` |
| `/workshop/library/components` | `src/app/workshop/library/components/page.tsx:11` → `LibraryComponentsRoute.tsx:9-21` | `await getCurrentWorkspaceComponentRowsLibrary()` |
| `/workshop/library/templates` | `src/app/workshop/library/templates/page.tsx:12` | `await getCurrentWorkspaceEstimateTemplates()` |
| `/workshop/library/templates/[templateId]` | `src/app/workshop/library/templates/[templateId]/page.tsx:16` | `await getEstimateTemplateById()` |

The layout (`src/app/workshop/library/layout.tsx`) wraps every segment in `WorkshopPageShell` (global chrome + a `<Suspense>` around `{children}`) plus `LibraryTabsLayoutClient` (the tab strip) and `LibraryTitleBarClient`. The tab strip renders **`<Link>` elements** (`LibraryTabsLayoutClient.tsx:50` → `src/components/ui/tab-strip.tsx`).

**Correction to a common assumption:** `LibraryComponentsRoute` is an **async server component** (`LibraryComponentsRoute.tsx:9`), not a client component. All three browse tabs fetch server-side and pass props down; the first `"use client"` leaf is `LibraryPageClient`/`ComponentLibraryManager`. So none of the browse tabs client-fetch their primary dataset — they re-render the server segment on every visit.

App Router **does not re-run a shared layout** when navigating between its children, so the chrome (sidebar/header) is preserved across tab switches and does not re-fetch. The cost is entirely in the **content segment**, which always blocks on a fresh server `await`.

---

## B. The navigation overlay — the dominant felt-latency cause (F1, F2)

This is verified by direct read, not inference.

- **Global click listener:** `NavigationListener` attaches a `document`-level `click` handler that resolves the closest `<a>` and calls `show(href)` for any internal link (`src/components/navigation-listener.tsx:26-43`, `show(href)` at line 38). It is mounted globally in `AppProviders` (`src/app/providers.tsx:38`).
- **Programmatic triggers:** `useNavigationRouter` wraps Next's router and calls `show(...)` on **every** `push` (line 15), `replace` (line 21), and `refresh` (line 27) — `src/hooks/use-navigation-router.ts`.
- **The overlay:** a `createPortal` full-viewport `fixed inset-0 z-[150] bg-white/25 backdrop-blur-md` with a spinner (`src/components/ui/route-loading-overlay.tsx:33-54`), mounted globally (`providers.tsx:40`). While active it sets `aria-hidden="true"` on `[data-workshop-page-shell-root]` (lines 17-29) — F26.
- **The 250 ms floor:** `show()` records `startTime`; `hide()` computes `remaining = max(0, 250 - elapsed)` and only clears after that delay (`src/stores/navigation-ui-store.ts:12,33-56`). So even a prefetched, instant transition holds the blur for ≥250 ms.

**Net felt behavior:** every Library tab click (a `<Link>`) and every post-mutation `router.refresh()` flashes a whole-app blur+spinner for at least a quarter second. This reads as a page reload — the core of "doesn't feel like a react app."

> Constraint: a `suppressOverlay` opt-out flag was previously implemented and **removed as flawed** (obs 4623). The fix in `07` scopes the *trigger* (don't fire for same-shell intra-Library nav; don't fire on `refresh()`) and lowers/removes the floor — not a per-call flag.

---

## C. Per-segment server waterfall (F18)

Every repository entry point runs a serial prefix before the actual data query:

1. `requireCurrentUserContext()` — `React.cache()`-deduped (`src/lib/auth/session.ts:31`), cheap after first call in a request.
2. `createSupabaseServerClient()`.
3. `ensureDefaultWorkspace()` — `src/lib/repositories/workspace-repository.ts:725-738` — runs `workspaces`/`profiles` queries **sequentially** and is **not** `cache()`-wrapped, so it re-issues its DB round-trips on every navigation.
4. The segment's data query.

So before any tab paints, there are ~2 sequential DB round-trips just to resolve the workspace, then the data fetch. The data fetches themselves are well-parallelized (`getLibraryOverview` batches 11 queries in one `Promise.all`, `component-library-repository.ts:877`; `getEstimateTemplateById` parallelizes nodes + row-items, `:1086`).

---

## D. Template-editor double-fetch + eager bundle (F17)

`templates/[templateId]/page.tsx:16` awaits `getEstimateTemplateById()` server-side. Then `TemplateEditorClient` immediately re-fetches the **entire** workspace component library client-side via `useQuery(["workspace-component-library"])` on mount (`TemplateEditorClient.tsx:121-125`), showing `TemplateEditorDockFallback` (lines 26-42) until it resolves — a visible *second* loading phase layered after the server render.

Additionally, the editor eagerly imports its heavy pieces (`TemplateStructureTree`, `TemplateEditorSheet`, `EstimateRightSidebar`) at the top of `TemplateEditorClient.tsx:16-24`, shipping them in the initial editor chunk (the Components tab, by contrast, lazy-loads its manager via `dynamic()` — `LibraryPageClient.tsx:11-17`).

---

## E. Streaming verdict (F5 partial)

`WorkshopPageShell.tsx:129` wraps `{children}` in `<Suspense>`, so the chrome paints first. But each `page.tsx` `await`s its full fetch **before returning**, so the page component suspends as a whole — content is all-or-nothing per tab, not split into a fast shell + streamed sections. There is no per-section Suspense inside any segment.

---

## F. Round-trip count per tab navigation

Cold (uncached) tab click, e.g. Overview → Templates:

| Step | Cost |
|---|---|
| Overlay `show()` fires immediately | blur paints, ≥250 ms floor |
| Next.js route transition → RSC request | 1 client→server RSC round-trip |
| `requireCurrentUserContext` | cached (0 extra DB after first) |
| `ensureDefaultWorkspace` | 1–2 sequential DB queries (not cached) |
| segment data query | 1+ DB query |
| `loading.tsx` shown until RSC resolves | — |

**≈ 1 RSC round-trip + 2–3 sequential DB round-trips per tab + a forced ≥250 ms blur.** The template editor adds a **second** client→server round-trip (the `useQuery` library fetch) after paint. `<Link>` prefetch often warms the RSC payload, but the 250 ms floor and the uncached `ensureDefaultWorkspace` prefix still apply.

---

## G. What's already good / not a problem (verified clean)

- **`<Link>` prefetch is on** — sibling-tab RSC payloads prefetch on hover/viewport (`tab-strip.tsx`). The architecture *can* be fast; the overlay masks it.
- **`getCurrentUserContext` is `React.cache()`-wrapped** (`session.ts:31`) — auth context deduped within a request.
- **Read fetches are well-parallelized** (`Promise.all` in `getLibraryOverview` `:877`, `getEstimateTemplateById` `:1086`). No N+1 in the read path.
- **Shared layout preserved across sibling tab nav** — chrome doesn't re-fetch.
- **No `force-dynamic`/`revalidate` storms on the read path**; `router.refresh()` only appears in mutation flows (see `04`).
- **`assertRouteErrorSmoke` is a no-op in production** (gated on an env flag) — not a latency source despite the `await searchParams`.
- **Components manager is already lazy** (`dynamic()`), keeping its tab's initial JS lean.

---

## H. Findings (this doc)

| # | Finding | Sev | Evidence |
|---|---------|-----|----------|
| F1 | Global overlay fires on every internal `<a>` click incl. tab `<Link>`s | 🔴 | `navigation-listener.tsx:38`, `route-loading-overlay.tsx:40`, `providers.tsx:38-40`, `tab-strip.tsx` |
| F2 | 250 ms overlay floor pads instant nav | 🔴 | `navigation-ui-store.ts:12,46` |
| F3 | Tabs are server segments → route transition + fetch + `loading.tsx` each click | 🔴 | `*/page.tsx`, `*/loading.tsx` |
| F17 | Editor double-fetch (server `getById` + client `useQuery`) + eager heavy imports | 🟠 | `templates/[templateId]/page.tsx:16`, `TemplateEditorClient.tsx:121-125,16-24` |
| F18 | `ensureDefaultWorkspace` not `cache()`-wrapped → re-runs per nav | 🟠 | `workspace-repository.ts:725-738` |
| F26 | Overlay `aria-hidden`s whole shell ≥250 ms per nav | 🟡 | `route-loading-overlay.tsx:17-29` |
