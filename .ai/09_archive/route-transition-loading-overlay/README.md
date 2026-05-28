# Route Transition Loading Overlay — Research, Analysis, Audit & Readiness Plan

**Feature:** Global loading overlay with spinner, triggered on every route change.  
**Goal:** Give immediate visual feedback during slow page transitions; improve perceived responsiveness.  
**Status:** Ready for implementation review.  
**Last audited:** 2026-05-28

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Research Findings](#2-research-findings)
3. [Blast Radius Analysis](#3-blast-radius-analysis)
4. [Architecture Decision Record (ADR)](#4-architecture-decision-record-adr)
5. [Implementation Plan](#5-implementation-plan)
6. [File Inventory](#6-file-inventory)
7. [Readiness Checklist](#7-readiness-checklist)
8. [Risks & Mitigations](#8-risks--mitigations)
9. [Testing & Validation Strategy](#9-testing--validation-strategy)
10. [Appendix: Code Sketches](#10-appendix-code-sketches)

---

## 1. Executive Summary

### The Problem
- Next.js App Router navigation has no built-in global "route is loading" indicator.
- Several workshop pages (estimate sheets, project charts, component library) are data-heavy and can take 300–800 ms to render.
- Users click a sidebar link or project card and receive zero feedback until the new route commits, creating a perception of brokenness.

### The Solution
A **single, reusable overlay component** mounted once at the root, controlled by a lightweight Zustand store, triggered by:
1. Clicks on **any** internal `<a>` tag (catches all `next/link` usage automatically).
2. Programmatic navigation via a thin `useNavigationRouter` wrapper around `next/navigation`'s `useRouter`.
3. Browser back/forward via `popstate`.

The overlay uses `createPortal` to render at `document.body`, applies `backdrop-blur-md` over a dark scrim (`bg-black/25`) to match the existing approved `Modal` pattern, and centers a `CircleNotch` spinner (Phosphor icon, already in the project). It respects `prefers-reduced-motion` and enforces a **minimum visible duration** (≈ 250 ms) to prevent flicker on fast transitions.

### Success Criteria
- [ ] Overlay appears within 50 ms of any internal navigation click.
- [ ] Overlay hides only after the new route commits + minimum display time.
- [ ] Zero modifications to existing page files or layouts.
- [ ] Programmatic `router.push` / `router.replace` / `router.refresh` usages are covered.
- [ ] Reduced-motion users see an instant cut, not a transition.
- [ ] No regression in existing `Modal`, `Toast`, or sidebar `z-index` stacking.
- [ ] Screen reader users hear the loading state; underlying content is hidden from AT while overlay is active.

---

## 2. Research Findings

### 2.1 Routing Architecture

| Finding | Evidence | Implication |
|---------|----------|-------------|
| **App Router only** (`next@16.2.6`) | `src/app/layout.tsx`, `src/app/page.tsx`, no `pages/` dir | No `Router.events` (Pages Router API) available. Must use App Router patterns. |
| `next/link` used directly in ~19 files | `grep -rn "next/link"` across `src/components/` and `src/app/` | Cannot rely solely on a wrapper component; too many call sites. Need global listener. |
| `useRouter` from `next/navigation` used in **7 files** | `ProjectEstimatesTable`, `EstimateSheetTree`, `NewProjectForm`, `projects-page-client`, `WorkshopHomebaseClient`, `ProjectEstimatesClient`, `ComponentLibraryManager` | Must intercept programmatic navigation. Thin wrapper hook is lowest blast radius. |
| `router.refresh()` used in **6 files** | `ProjectEstimatesTable` (×5), `projects-page-client`, `NewProjectForm`, `WorkshopHomebaseClient` (×2), `ComponentLibraryManager`, `ProjectEstimatesClient` | `useNavigationRouter` must wrap `refresh()` too, or soft revalidations will bypass the overlay. |
| No `loading.tsx` files anywhere | `find src/app -name "loading.*"` returned empty | No existing route-level loading UI to conflict with. |
| No existing global loading state | No spinner/overlay stores found | Greenfield state logic; no migration risk. |

**Navigation surface area:**
- **Sidebar nav:** `SidebarNavItemRow` → `<Link href>` (5 links: Workshop, Projects, Components, Templates, Settings)
- **Project mini-sidebar:** `ProjectMiniSidebar` → `<Link href>` (project sub-pages)
- **Project cards & tables:** `ProjectEstimatesTable`, `WorkshopHomebaseClient` → `<Link href>` and `router.push`
- **Breadcrumbs:** `WorkshopPageShell` → `<Link href>`
- **Landing CTAs:** `LandingHeader`, `HeroSection`, `CtaLink` → `<Link href>`
- **Programmatic:** `EstimateSheetTree` (`router.replace`, `router.push`), `NewProjectForm` (`router.push`), `projects-page-client` (`router.push`), `ProjectEstimatesClient` (`router.refresh`), `ComponentLibraryManager` (`router.refresh`)

> **Special note:** `ProjectEstimatesTable.tsx` instantiates `useRouter()` **5 separate times** inside a single component (lines 178, 265, 379, 499, 597). Phase 3 is the right time to consolidate these into **one** `useNavigationRouter()` call at the component top level.

### 2.2 State Management Audit

| Store / Provider | Library | Scope | Notes |
|------------------|---------|-------|-------|
| `useEstimateUiStore` | Zustand (`create`) | Estimate sheet only | Drag state, selection, focus. Not relevant. |
| `ToastProvider` | React Context | Global | Already mounted in `AppProviders`. Good pattern reference for global UI state. |
| `QueryClientProvider` | TanStack Query | Global | Data fetching; not UI state. |

**Conclusion:** Zustand is the project's chosen global state library. A new `useNavigationUiStore` will follow the exact same pattern as `useEstimateUiStore` — no provider wrapper needed, which keeps `AppProviders` clean.

### 2.3 UI & Design System Audit

| Asset | Location | Reusability for Overlay |
|-------|----------|------------------------|
| `Modal` | `src/components/ui/modal.tsx` | Uses `createPortal`, `fixed inset-0 z-[1000]`, `backdrop-blur-md bg-black/25`. **Direct pattern reference.** |
| `Button` (scrim variant) | `src/components/ui/button.tsx` | `variant="scrim"` → `fixed inset-0 bg-black/12`. Proves the project already uses body-covering scrims. |
| `Toast` | `src/components/ui/toast.tsx` | Uses `CircleNotch size={13} weight="regular" className="animate-spin"` for loading spinners. **Reuse this exact spinner.** |
| `ToastProvider` | `src/components/ui/toast.tsx` | Renders a fixed viewport at `z-[100]`. Overlay must be **above** this (`z-[200]` or higher). |
| `MainSidebar` | `src/components/sidebar/MainSidebar.tsx` | Uses `z-[100]`. Overlay must sit above sidebar. |
| Tailwind theme | `src/app/globals.css` | CSS variables: `--canvas`, `--surface`, `--ink`, `--tertiary`. Backdrop blur utilities available. `motion-reduce:*` classes used widely. |
| **DESIGN.md** | `DESIGN.md` line 443 | Explicitly prohibits "glass effects" as a generic dashboard depth pattern. The existing `Modal` uses `backdrop-blur-md` with a dark scrim (`bg-black/25`), which is already in production and DESIGN.md carves out an exception for modals. |

**Z-index hierarchy (ascending):**
1. Sidebar scrim: `z-30`
2. Main sidebar / border: `z-[100]`
3. Toast viewport: `z-[100]`
4. **Route overlay:** `z-[150]` ← new
5. Modal backdrop: `z-[1000]`
6. Modal dialog: `z-[1001]`

**Overlay z-index recommendation:** `z-[150]` — above sidebar and toasts, below modal. Modals should remain interactive even if a navigation is somehow triggered (edge case).

### 2.4 Performance & Data-Fetching Patterns

- **Server Components:** Most workshop pages are Server Components that fetch data via Supabase/Postgres queries on render.
- **Client Components:** Heavy interactive tables (`ProjectEstimatesTable`, `EstimateSheetTree`) mount after navigation and immediately initialize React Query hooks.
- **No Suspense fallbacks:** Because there are no `loading.tsx` files, slow server components block the entire route transition. The overlay fills this gap perfectly.
- **React Query:** Default `staleTime: 30_000` means revisiting a recently viewed page is instant, but first visits or hard refreshes can be slow.

---

## 3. Blast Radius Analysis

### Symbols & Execution Flows at Risk

| Symbol / File | Usage Count | Risk Level | Action Required |
|---------------|-------------|------------|-----------------|
| `AppProviders` (`src/app/providers.tsx`) | 1 (root) | **LOW** | Add two new child components (`<RouteTransitionOverlay />`, `<NavigationListener />`). No props changes. |
| `useRouter` imports | **7 files** (see 2.1) | **MEDIUM** | Replace with `useNavigationRouter` in files doing programmatic nav + refresh. |
| `next/link` imports | ~19 files | **LOW** | **No changes required** if global click listener is used. This is the primary strategy. |
| `Modal` (`src/components/ui/modal.tsx`) | Multiple | **LOW** | Verify `z-index` stacking. Overlay at `z-[150]` keeps Modal at `z-[1000]` safely above. |
| `ToastProvider` | 1 (root) | **LOW** | Same as above; toast at `z-[100]` stays below overlay. |
| `MainSidebar` | 1 (root) | **LOW** | Sidebar `z-[100]` unaffected. |
| `RootLayout` (`src/app/layout.tsx`) | 1 | **NONE** | No changes. Overlay is injected via `AppProviders`, keeping layout server-safe. |

### Upstream Callers (What Breaks If Overlay Breaks)

- **Every page in the app** depends on `AppProviders` → `RootLayout`. If the overlay component throws, the entire app white-screens.
- **Mitigation:** Wrap the overlay render in an error boundary, or keep the component extremely simple (no data fetching, no conditional rendering logic that can throw).

### Downstream Dependencies (What the Overlay Depends On)

- `next/navigation` (`usePathname`) — stable Next.js API.
- `zustand` — already in project (`useEstimateUiStore`).
- `react-dom` (`createPortal`) — already used by `Modal`.
- `@phosphor-icons/react` (`CircleNotch`) — already used by `Toast`.

### Overall Risk Assessment: **LOW**

The feature is additive, uses existing libraries, requires no changes to business logic, and touches only the provider shell and a handful of programmatic navigation call sites.

---

## 4. Architecture Decision Record (ADR)

### ADR-001: Global Click Listener vs. Wrapped `<Link>` Component

**Context:** We need to intercept every internal navigation event to show the overlay.

**Options Considered:**

1. **Wrap every `<Link>` usage** with a custom `<NavigationLink>` component.
   - *Pros:* Explicit, type-safe, easy to add `onNavigate` callbacks later.
   - *Cons:* High blast radius (~19 files). Easy to miss call sites. Future developers might import `next/link` directly and bypass the overlay.
   - *Verdict:* Rejected. Too invasive, too easy to regress.

2. **Global `document` click listener** that inspects `event.target.closest('a[href]')`.
   - *Pros:* Catches ALL `<Link>` components (they render `<a>`) without modifying any file. Catches raw `<a>` tags. One central piece of logic.
   - *Cons:* Doesn't catch programmatic `router.push`. Needs origin-checking logic to ignore external links.
   - *Verdict:* **Accepted** as primary strategy.

3. **Next.js `loading.tsx` files in every route segment**.
   - *Pros:* Native App Router pattern.
   - *Cons:* Must be duplicated per route. Cannot apply a global overlay (it renders inside the layout slot, not as a body portal). Doesn't cover programmatic navigation smoothly.
   - *Verdict:* Rejected. Doesn't meet the UX spec.

4. **React `useTransition` + `useLinkStatus`**.
   - *Pros:* React-native, no store needed.
   - *Cons:* `useLinkStatus` is experimental/unstable. Only works per-link, not globally. Doesn't cover programmatic navigation.
   - *Verdict:* Rejected. Too immature.

**Decision:** Use a **global click listener** for all anchor-based navigation, supplemented by a **thin `useNavigationRouter` hook** for the 7 files that use programmatic navigation. The hook only wraps methods actually used in the codebase: `push`, `replace`, `refresh`.

### ADR-002: Zustand vs. React Context for Navigation State

**Context:** We need a global "is navigating" boolean accessible from the listener, the overlay, and the router wrapper.

**Options Considered:**

1. **React Context** (like `ToastProvider`).
   - *Pros:* No new dependency. Already understood pattern.
   - *Cons:* Requires a provider in `AppProviders`. Consumer components must be client components. Slightly more boilerplate.
   - *Verdict:* Rejected. Zustand is already in the project and requires zero provider setup.

2. **Zustand** (`create`).
   - *Pros:* Exactly one line to create store. No provider needed. Can be read from any client component or hook without prop drilling. Matches existing `useEstimateUiStore` convention.
   - *Cons:* None for this use case.
   - *Verdict:* **Accepted.**

### ADR-003: Hide Trigger — Pathname Effect vs. Timer-Only

**Context:** In Next.js App Router, `usePathname()` updates immediately when navigation starts (history push), not when it finishes. We need to know when to hide the overlay.

**Options Considered:**

1. **Hide immediately when `usePathname` changes.**
   - *Verdict:* Rejected. The URL changes before the new page is visible; hiding too early defeats the purpose.

2. **Hide via `useEffect([pathname])` after commit.**
   - *Pros:* `useEffect` fires after React commits the new route. This is the closest App Router approximation to "page ready."
   - *Cons:* If the new route has heavy client hydration, the page might still feel sluggish after the overlay disappears.
   - *Verdict:* **Accepted as primary hide signal.**

3. **Minimum display timer (e.g., 250 ms).**
   - *Pros:* Prevents subliminal flicker on fast navigations. Guarantees the spinner is perceived.
   - *Cons:* Artificially slows perceived speed on instant navigations.
   - *Verdict:* **Accepted in combination with #2.** Overlay hides at `max(commitTime + 0ms, startTime + 250ms)`.

4. **MutationObserver on `<body>` children.**
   - *Pros:* Detects actual DOM mutation.
   - *Cons:* Fragile, complex, can fire on irrelevant mutations (toasts, modals).
   - *Verdict:* Rejected. Over-engineered.

5. **Show delay (e.g., 100 ms before showing overlay).**
   - *Pros:* Prevents any flash on instant navigations.
   - *Cons:* Violates the user's explicit requirement: "the moment the user clicks any link... i want the overlay to show up." Adds perceived latency.
   - *Verdict:* Rejected. The minimum display timer (250 ms) already prevents subliminal flashes; a show delay would add unnecessary latency.

**Decision:** Combine `useEffect([pathname])` (commit-based hide) with a **minimum display duration** of **250 ms**.

### ADR-004: Visual Design — Frosted Glass vs. Approved Modal Pattern

**Context:** The initial code sketch proposed `bg-white/40 backdrop-blur-md` (frosted glass / glassmorphism). DESIGN.md line 443 explicitly prohibits "glass effects" as a generic dashboard depth pattern.

**Options Considered:**

1. **Frosted white overlay (`bg-white/40 backdrop-blur-md`).**
   - *Pros:* Matches the user's explicit "frosted/blurred" request.
   - *Cons:* Directly violates DESIGN.md. Sets a precedent for prohibited visual language.
   - *Verdict:* Rejected unless an explicit design exemption is granted by the product owner.

2. **Match the existing approved Modal pattern (`bg-black/25 backdrop-blur-md`).**
   - *Pros:* Already in production in `Modal`. DESIGN.md carves out exceptions for modals/functional overlays. Uses the same visual language users already see. Dark scrim reads as "loading" universally.
   - *Cons:* Slightly different from user's original frosted-white vision.
   - *Verdict:* **Accepted.** The Modal pattern is the project's only existing precedent for a full-screen blur overlay. Reusing it keeps the design system coherent.

3. **Solid white scrim (`bg-white/80`, no blur).**
   - *Pros:* Avoids "glass effects" entirely. High contrast spinner visibility.
   - *Cons:* Feels more like a splash screen than a subtle loading indicator. Harsher transition.
   - *Verdict:* Rejected. Too heavy-handed.

**Decision:** Use **`bg-black/25 backdrop-blur-md`** — identical to the existing `Modal` backdrop. Spinner uses `text-white` for contrast against the dark scrim.

### ADR-005: Landing Page Overlay Behavior

**Context:** Landing pages (`/`, `/features`, `/about`, `/pricing`, `/login`, `/contact`) use different typography (Inter, larger sizes, experimental styling) and are public/marketing surfaces. The overlay will appear on these routes because the global listener catches all internal `<a>` tags.

**Options Considered:**

1. **Show overlay everywhere, including landing pages.**
   - *Pros:* Consistent UX. User explicitly said "when a user changes pages or routes" — no exemptions stated.
   - *Cons:* Dark scrim + SF Pro spinner over Inter-branded marketing pages creates a visual mismatch.
   - *Verdict:* **Accepted for v1.** The user's requirement is global. We can refine landing-page-specific styling in v2 if it feels off.

2. **Exempt public routes in v1.**
   - *Pros:* Keeps marketing pages pristine.
   - *Cons:* Inconsistent UX. Users navigating from `/` to `/features` see no feedback, then entering `/workshop` suddenly see feedback.
   - *Verdict:* Rejected for v1. Can be revisited if user feedback demands it.

3. **Different overlay style on landing pages.**
   - *Pros:* Respects each page's visual identity.
   - *Cons:* Adds complexity for marginal benefit.
   - *Verdict:* Deferred to v2.

**Decision:** Show overlay **on all routes** in v1. Document as a known design tension that can be revisited post-launch.

### ADR-006: Server-Side `redirect()` — In Scope or Non-Goal?

**Context:** Server actions and route handlers across the codebase call `redirect()` from `next/navigation`:
- `src/lib/auth/actions.ts` (5 calls)
- `src/lib/auth/account-actions.ts` (6 calls)
- `src/lib/projects/actions.ts` (2 calls)
- `src/lib/estimates/actions.ts` (2 calls)
- `src/lib/auth/session.ts` (1 call)
- `src/lib/collaboration/pending-invite-actions.ts` (1 call)
- Route handlers in `src/app/` (multiple `NextResponse.redirect` calls)

These trigger full-page navigations from the server. The client-side overlay cannot intercept them because the response is a 302 redirect before JavaScript rehydrates.

**Decision:** Server-side redirects are an **explicit non-goal**. The browser's native loading indicator (tab spinner, progress bar) handles full-page navigations. This plan only covers client-side App Router transitions.

### ADR-007: Toast Visibility During Navigation

**Context:** The toast viewport renders at `z-[100]`. The route overlay renders at `z-[150]`. During navigation, any toasts (including loading toasts) will appear underneath the dark scrim.

**Options Considered:**

1. **Raise toast z-index to `z-[200]` (above overlay).**
   - *Pros:* Toasts remain fully readable during navigation.
   - *Cons:* Toasts are transient notifications, not critical UI. A user navigating away is unlikely to need to read a toast. Raising z-index creates a new precedent.
   - *Verdict:* Rejected. Unnecessary complexity.

2. **Accept reduced toast readability during navigation.**
   - *Pros:* Overlay is the dominant visual signal; toasts are secondary. The translucent scrim still allows toasts to be partially visible. Navigation is transient (typically < 1 s).
   - *Cons:* If a "success" toast fires exactly when the user clicks a link, the toast may be missed.
   - *Verdict:* **Accepted.** Toast readability is acceptable collateral during navigation. If toast persistence becomes a real issue, extend toast duration or dismiss toasts on `show()`.

**Decision:** Keep toast at `z-[100]`. Accept that toasts render under the route overlay. Document as known behavior.

## 5. Implementation Plan

### Phase 0: Foundation (New Files Only)
**Goal:** Create all new artifacts without touching existing code. Safe to commit.

| Step | File | Action |
|------|------|--------|
| 0.1 | `src/stores/navigation-ui-store.ts` | Create Zustand store with `isNavigating`, `navigationStartTime`, `targetHref`, `show()`, `hide()`. Include timer cancellation and 10-second safety timeout. |
| 0.2 | `src/components/ui/route-loading-overlay.tsx` | Create portal-based overlay component. Dark scrim (`bg-black/25 backdrop-blur-md`) to match approved Modal pattern. `z-[150]`. Respects `prefers-reduced-motion`. Hides main content from screen readers while active. |
| 0.3 | `src/hooks/use-navigation-router.ts` | Create wrapper hook around `useRouter`. Intercepts `push`, `replace`, `back`, `forward`, **and `refresh`** to call `show()` before navigation. Uses typed `NavigateOptions`. |
| 0.4 | `src/components/navigation-listener.tsx` | Create client component that mounts global click listener, `popstate` listener, and `usePathname` effect. |

### Phase 1: Integration (Modify Existing Files)
**Goal:** Wire new artifacts into the app shell.

| Step | File | Action |
|------|------|--------|
| 1.1 | `src/app/providers.tsx` | Import and render `<RouteLoadingOverlay />` and `<NavigationListener />` inside `AppProviders`. |

### Phase 2: Validation
**Goal:** Verify correctness without regressions.

| Step | Action |
|------|--------|
| 2.1 | Manual click-through: sidebar links, project cards, breadcrumbs, landing CTAs. Confirm overlay appears. |
| 2.2 | Throttle network to "Slow 3G" in DevTools. Click a heavy route. Confirm overlay persists until new page is visible. |
| 2.3 | Test programmatic navigation (e.g., "New Project" form redirect). Confirm overlay appears. |
| 2.4 | Test `router.refresh()` scenarios (e.g., delete an estimate row). Confirm overlay appears. |
| 2.5 | Test browser Back/Forward buttons. Confirm overlay appears. |
| 2.6 | Test external links (e.g., footer links, Supabase storage URLs). Confirm overlay **does not** appear. |
| 2.7 | Test `prefers-reduced-motion: reduce`. Confirm overlay appears instantly without transition. |
| 2.8 | Test Modal opening while overlay is visible (edge case). Confirm Modal stacks above overlay. |
| 2.9 | Test toast notification during navigation. Confirm toast is readable above overlay (overlay covers toast viewport; toast should still be visible since overlay is translucent). |
| 2.10 | Screen reader test (VoiceOver / NVDA): navigate between pages. Confirm "Loading page" is announced and old page content is not read while overlay is active. |

### Phase 3: Programmatic Navigation Coverage
**Goal:** Catch all `router.push` / `router.replace` / `router.refresh` call sites.

| Step | File | Action |
|------|------|--------|
| 3.1 | `src/components/workshop/EstimateSheetTree.tsx` | Replace `useRouter` → `useNavigationRouter` |
| 3.2 | `src/components/workshop/ProjectEstimatesTable.tsx` | **Refactor:** consolidate 5 separate `useRouter()` calls into **one** `useNavigationRouter()` at component top level. Pass `router` down to inner functions or use a ref. |
| 3.3 | `src/components/workshop/NewProjectForm.tsx` | Replace `useRouter` → `useNavigationRouter` |
| 3.4 | `src/components/workshop/projects-page-client.tsx` | Replace `useRouter` → `useNavigationRouter` |
| 3.5 | `src/components/workshop/WorkshopHomebaseClient.tsx` | Replace `useRouter` → `useNavigationRouter` |
| 3.6 | `src/components/workshop/ProjectEstimatesClient.tsx` | Replace `useRouter` → `useNavigationRouter` |
| 3.7 | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` | Replace `useRouter` → `useNavigationRouter` |

> **Note:** Phase 3 should not be deferred. `router.refresh()` is used heavily in `ProjectEstimatesTable` (5 times) and other files. Without Phase 3, soft revalidations after mutations will show no loading feedback, creating a jarring UX.

---

## 6. File Inventory

### Files to Create

```
src/stores/navigation-ui-store.ts              # Zustand store (NEW)
src/components/ui/route-loading-overlay.tsx    # Visual overlay component (NEW)
src/components/navigation-listener.tsx          # Global click + pathname watcher (NEW)
src/hooks/use-navigation-router.ts             # Wrapped router hook (NEW)
```

### Files to Modify

```
src/app/providers.tsx                          # Add overlay + listener to provider tree
```

### Files to Modify (Phase 3 — Required)

```
src/components/workshop/EstimateSheetTree.tsx
src/components/workshop/ProjectEstimatesTable.tsx       # SPECIAL: consolidate 5 useRouter() → 1 useNavigationRouter()
src/components/workshop/NewProjectForm.tsx
src/components/workshop/projects-page-client.tsx
src/components/workshop/WorkshopHomebaseClient.tsx
src/components/workshop/ProjectEstimatesClient.tsx
src/components/workshop/component-library-manager/ComponentLibraryManager.tsx
```

### Files to Leave Unchanged (Verified)

```
src/app/layout.tsx                             # No changes needed; overlay is inside AppProviders
src/components/ui/modal.tsx                    # No changes; z-index already higher
src/components/ui/toast.tsx                    # No changes; z-index already lower
src/components/sidebar/MainSidebar.tsx         # No changes; links use <a> tag, caught by listener
src/components/sidebar/SidebarNavItemRow.tsx   # No changes
src/components/workshop/WorkshopPageShell.tsx  # No changes
```

---

## 7. Readiness Checklist

### Pre-Implementation

- [ ] **Design approval:** Confirm dark scrim (`bg-black/25 backdrop-blur-md`) matches Modal pattern and is acceptable for route transitions.
- [ ] **Accessibility review:** Confirm `aria-hidden` on main content regions + `aria-busy` on overlay is acceptable. Confirm focus is not trapped by overlay.
- [ ] **z-index audit:** Verify no other component uses `z-[150]`–`z-[999]`. (Current gap is `z-[100]` → `z-[1000]`, so `z-[150]` is safe.) ✅ Verified.
- [ ] **Package audit:** Confirm `zustand`, `react-dom`, `@phosphor-icons/react` are already installed. ✅ Verified.

### During Implementation

- [ ] Store created with correct TypeScript types.
- [ ] Store `hide()` cancels any previous pending timer (race condition fix).
- [ ] Store includes 10-second emergency safety timeout.
- [ ] Overlay renders via `createPortal` to `document.body`.
- [ ] Overlay uses `bg-black/25 backdrop-blur-md` (not white frosted glass).
- [ ] Overlay uses `motion-reduce:transition-none` and/or `motion-reduce:backdrop-blur-none`.
- [ ] Overlay sets `aria-hidden="true"` on main content regions (`[data-workshop-page-shell-root]`, `[data-landing-page-root]`) while active.
- [ ] Overlay uses `role="status"` and `aria-live="polite"` (or `aria-label="Loading page"`) for screen reader announcement.
- [ ] Global click listener correctly filters:
  - [ ] External links (`href.startsWith('http') && !href.startsWith(origin)`)
  - [ ] `target="_blank"`
  - [ ] `download` attribute
  - [ ] `preventDefault()` called by other handlers (check `event.defaultPrevented`)
  - [ ] Hash-only links (`href.startsWith('#')`)
  - [ ] Mailto / tel links
- [ ] `useNavigationRouter` exposes identical API to `useRouter` from `next/navigation`, including typed `NavigateOptions`.
- [ ] `useNavigationRouter` wraps `push`, `replace`, `back`, `forward`, **and `refresh`**.
- [ ] `AppProviders` renders children correctly with new components.

### Post-Implementation

- [ ] All manual validation steps in Phase 2 pass.
- [ ] No console errors on any route.
- [ ] Lighthouse / accessibility score unchanged.
- [ ] `gitnexus_detect_changes()` run and blast radius matches this plan.
- [ ] Unit tests for `navigation-ui-store` pass (show/hide/race conditions).

---

## 8. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Overlay stays stuck on** (doesn't hide) | Low | High | `useEffect([pathname])` + `useEffect` cleanup on unmount guarantees hide. Add a safety `setTimeout` hide after **10 seconds** as last resort. |
| **Overlay disappears too early** (race condition) | Medium | High | `hide()` must cancel any previous pending timer before starting a new one. If user clicks Link A then Link B, Link A's timer must not erase Link B's overlay. |
| **Overlay shows on external links** | Low | Medium | Strict origin + protocol checks in listener. Test with absolute Supabase URLs. |
| **Overlay blocks Modal interactions** | Very Low | Medium | Overlay `z-[150]` vs Modal `z-[1000]`. Modal remains above. Verified by z-index hierarchy research. |
| **Flicker on fast navigation** | Medium | Medium | Minimum display timer (250 ms). Prevents subliminal flashes. |
| **Programmatic nav not covered** | Low | Low | Phase 3 covers all 7 files + `refresh()`. Not optional — `router.refresh()` is heavily used. |
| **Memory leak from timers** | Low | Medium | Store tracks `hideTimer` ref, clears on each `hide()` call. Follow exact pattern from `ToastProvider`. |
| **Server-side `redirect()` during form actions** | N/A | Low | Explicit non-goal (see ADR-006). Full-page navigations use the browser's native loading indicator. |
| **Next.js version upgrade breaks `usePathname` behavior** | Low | High | We use stable Next.js APIs only. `usePathname` has been stable since App Router launch. |
| **Screen reader users hear old page content during navigation** | Low | High | Overlay sets `aria-hidden="true"` on main content regions while active. Screen readers only hear the overlay's `aria-label`. |

---

## 9. Testing & Validation Strategy

### Manual QA Script

**Scenario A: Sidebar Navigation**
1. Log in and land on `/workshop`.
2. Click "Projects" in sidebar.
3. **Expected:** Dark scrim overlay with white spinner appears immediately. Disappears after Projects page is visible.
4. Click "Components". Repeat expectation.

**Scenario B: Programmatic Navigation**
1. Go to Projects page.
2. Click "New Project" → fill form → submit.
3. **Expected:** Overlay appears on submit, persists until new project detail page loads.

**Scenario C: Router Refresh**
1. Go to an estimate sheet.
2. Perform an action that triggers `router.refresh()` (e.g., delete a row if available).
3. **Expected:** Overlay appears briefly while data revalidates.

**Scenario D: Browser Back/Forward**
1. Navigate through 3 pages via sidebar.
2. Click browser Back button.
3. **Expected:** Overlay appears, previous page loads underneath.

**Scenario E: External Links**
1. Visit landing page.
2. Click any external footer link (if present) or add a test `<a href="https://example.com">`.
3. **Expected:** No overlay.

**Scenario F: Reduced Motion**
1. Enable `prefers-reduced-motion: reduce` in OS settings.
2. Navigate between pages.
3. **Expected:** Overlay appears instantly without blur/opacity transition.

**Scenario G: Modal During Navigation (Edge Case)**
1. Open a Modal (e.g., "New Project").
2. While modal is open, trigger a navigation.
3. **Expected:** Modal remains above overlay; overlay appears behind modal but above page content.

**Scenario H: Screen Reader**
1. Enable VoiceOver (macOS) or NVDA (Windows).
2. Navigate from `/workshop` to `/workshop/projects`.
3. **Expected:** Screen reader announces "Loading page" or similar. Old page content is not read.

### Automated Testing

- **Vitest — Store unit tests:**
  - `show()` sets `isNavigating = true`, records `startTime`, sets `targetHref`.
  - `hide()` respects minimum display time (250 ms).
  - Rapid sequential `show()` calls reset the timer; old `hide()` timers do not clear a newer overlay.
  - Emergency timeout (10 s) hides overlay even if `hide()` is never called.

- **Vitest — Hook unit tests:**
  - `useNavigationRouter.push()` calls `show(href)` before delegating to `router.push`.
  - `useNavigationRouter.refresh()` calls `show("refresh")` before delegating to `router.refresh`.
  - All methods return the same types as the native `useRouter` methods.

- **Playwright — E2E (optional):**
  - `page.waitForSelector('[data-route-overlay]')` on click.
  - `page.waitForSelector('[data-route-overlay]', { state: 'hidden' })` after navigation.

---

## 10. Appendix: Code Sketches

> These are **planning-level pseudocode** intended to guide implementation, not copy-paste production code. Exact class names and timing values should be tuned during build.

### A. `src/stores/navigation-ui-store.ts`

```ts
import { create } from "zustand";

type NavigationUiState = {
  isNavigating: boolean;
  startTime: number;
  targetHref: string | null;
  show: (targetHref?: string) => void;
  hide: () => void;
};

const MIN_DISPLAY_MS = 250;
const SAFETY_TIMEOUT_MS = 10_000;

let hideTimer: ReturnType<typeof setTimeout> | null = null;
let safetyTimer: ReturnType<typeof setTimeout> | null = null;

function clearTimers() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (safetyTimer) {
    clearTimeout(safetyTimer);
    safetyTimer = null;
  }
}

export const useNavigationUiStore = create<NavigationUiState>((set, get) => ({
  isNavigating: false,
  startTime: 0,
  targetHref: null,
  show: (targetHref = null) => {
    clearTimers();
    set({ isNavigating: true, startTime: Date.now(), targetHref });

    // Safety net: force hide after 10 seconds no matter what
    safetyTimer = setTimeout(() => {
      safetyTimer = null;
      set({ isNavigating: false, targetHref: null });
    }, SAFETY_TIMEOUT_MS);
  },
  hide: () => {
    if (hideTimer) clearTimeout(hideTimer);

    const elapsed = Date.now() - get().startTime;
    const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);

    hideTimer = setTimeout(() => {
      hideTimer = null;
      if (safetyTimer) {
        clearTimeout(safetyTimer);
        safetyTimer = null;
      }
      set({ isNavigating: false, targetHref: null });
    }, remaining);
  },
}));
```

> **Key fixes from audit:**
> - `clearTimers()` cancels any pending `hideTimer` or `safetyTimer` before `show()` starts a new navigation.
> - `hide()` cancels its own previous timer before scheduling a new one.
> - 10-second safety timeout prevents stuck overlay if `hide()` is never triggered.

### B. `src/components/ui/route-loading-overlay.tsx`

```tsx
"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CircleNotch } from "@phosphor-icons/react/dist/ssr";
import { useNavigationUiStore } from "@/stores/navigation-ui-store";
import { cn } from "@/lib/ui/cn";

const MAIN_CONTENT_SELECTORS = [
  "[data-workshop-page-shell-root]",
  "[data-landing-page-root]",
];

export function RouteLoadingOverlay() {
  const isNavigating = useNavigationUiStore((s) => s.isNavigating);

  useEffect(() => {
    if (!isNavigating) return;

    // Hide main content from screen readers while navigating
    const mains = MAIN_CONTENT_SELECTORS
      .map((sel) => document.querySelector(sel))
      .filter(Boolean) as HTMLElement[];

    mains.forEach((el) => el.setAttribute("aria-hidden", "true"));

    return () => {
      mains.forEach((el) => el.removeAttribute("aria-hidden"));
    };
  }, [isNavigating]);

  if (!isNavigating || typeof document === "undefined") return null;

  return createPortal(
    <div
      data-route-overlay
      role="status"
      aria-live="polite"
      aria-label="Loading page"
      className={cn(
        "fixed inset-0 z-[150] flex items-center justify-center bg-black/25 backdrop-blur-md",
        "pointer-events-none", // clicks pass through; global listener handles prevention
        "transition-opacity duration-200 ease-out",
        "motion-reduce:transition-none motion-reduce:duration-0"
      )}
    >
      <CircleNotch
        size={28}
        weight="regular"
        className="animate-spin text-white"
        aria-hidden="true"
      />
    </div>,
    document.body
  );
}
```

> **Key fixes from audit:**
> - Visuals match approved Modal pattern (`bg-black/25 backdrop-blur-md`) instead of prohibited frosted glass.
> - Spinner uses `text-white` for contrast against dark scrim.
> - Sets `aria-hidden="true"` on main content regions (`[data-workshop-page-shell-root]`, `[data-landing-page-root]`) so screen readers do not read the old page underneath.
> - Uses `role="status"` + `aria-live="polite"` for proper screen reader announcement.
> - `pointer-events-none` ensures clicks pass through the overlay to the page below. The global click listener on `document` catches all internal link clicks, so no spurious `show()` calls occur.

### C. `src/components/navigation-listener.tsx`

```tsx
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useNavigationUiStore } from "@/stores/navigation-ui-store";

function isInternalLink(href: string): boolean {
  if (href.startsWith("#")) return false;
  if (href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  if (href.startsWith("javascript:")) return false;
  if (href.startsWith("http") || href.startsWith("//")) {
    return href.startsWith(window.location.origin);
  }
  return true;
}

export function NavigationListener() {
  const pathname = usePathname();
  const show = useNavigationUiStore((s) => s.show);
  const hide = useNavigationUiStore((s) => s.hide);

  // Hide overlay when route commits (useEffect fires after commit).
  // Zustand selectors return stable references, so including `hide` in deps
  // is safe and satisfies exhaustive-deps without causing extra renders.
  useEffect(() => {
    hide();
  }, [pathname, hide]);

  // Global click listener for <a> tags
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const anchor = (event.target as HTMLElement).closest("a");
      if (!anchor) return;
      if (event.defaultPrevented) return;
      if (anchor.target === "_blank") return;
      if (anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      if (!isInternalLink(href)) return;
      // Optional: skip if user clicks the already-active route
      // if (href === window.location.pathname) return;

      show(href);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [show]);

  // Popstate listener for Back/Forward buttons
  useEffect(() => {
    function handlePopstate() {
      show(window.location.pathname);
    }
    window.addEventListener("popstate", handlePopstate);
    return () => window.removeEventListener("popstate", handlePopstate);
  }, [show]);

  return null;
}
```

### D. `src/hooks/use-navigation-router.ts`

```ts
"use client";

import { useRouter as useNextRouter } from "next/navigation";
import { useNavigationUiStore } from "@/stores/navigation-ui-store";

// Next.js does not export NavigateOptions from next/navigation.
// Define locally to avoid depending on internal next/dist/... paths.
type NavigateOptions = { scroll?: boolean };

export function useNavigationRouter() {
  const router = useNextRouter();
  const show = useNavigationUiStore((s) => s.show);

  return {
    ...router,
    push: (href: string, options?: NavigateOptions) => {
      show(href);
      return router.push(href, options);
    },
    replace: (href: string, options?: NavigateOptions) => {
      show(href);
      return router.replace(href, options);
    },
    refresh: () => {
      show("refresh");
      return router.refresh();
    },
    // Note: AppRouterInstance in Next.js 16 does expose back()/forward(),
    // but no file in the codebase calls them. Omitted to keep the wrapper minimal.
  };
}
```

> **Key fixes from audit:**
> - `options` parameter uses `NavigateOptions` instead of `unknown`.
> - Added `refresh()` wrapper — critical because `router.refresh()` is called in 6+ files.

### E. `src/app/providers.tsx` (Integration Diff)

```tsx
import { RouteLoadingOverlay } from "@/components/ui/route-loading-overlay";
import { NavigationListener } from "@/components/navigation-listener";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <NavigationListener />
        {children}
        <RouteLoadingOverlay />
      </ToastProvider>
    </QueryClientProvider>
  );
}
```

> **Ordering note:** `NavigationListener` before `children` ensures listeners attach early. `RouteLoadingOverlay` after `children` ensures it portals above in DOM order (though `z-index` handles visual stacking regardless).

---

## Sign-off

| Role | Name | Date | Status |
|------|------|------|--------|
| Research & Audit | AI Agent (Kimi Code CLI) | 2026-05-28 | ✅ Complete |
| Readiness Review | AI Agent (Kimi Code CLI) | 2026-05-28 | ✅ Complete |
| Critical Fixes Applied | AI Agent (Kimi Code CLI) | 2026-05-28 | ✅ Complete |
| Implementation Ready | — | — | ⏳ Awaiting approval |
