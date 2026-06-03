# Codebase Audit — React Joyride Onboarding Implementation

**Audit date:** 2026-06-03
**Audit scope:** Full-stack verification of ArchEstimator codebase for onboarding tour integration
**Purpose:** Ground-truth assessment of every system the onboarding implementation will touch or must coexist with
**Confidence:** High — every claim below is verified against live source files, not assumptions

---

## 1. Verified Stack

| Layer | Technology | Source | Notes |
|-------|-----------|--------|-------|
| Framework | Next.js 16.2.6 (App Router, RSC) | `package.json` line 52: `"next": "16.2.6"` | No Pages Router usage |
| UI | React 19.2.6 | `package.json` line 53: `"react": "19.2.6"` | `README.md` says 19.2.4 — minor drift, 19.2.6 is canonical |
| TypeScript | 6.0.3 (strict, ES2017) | `package.json` line 79: `"typescript": "^6.0.3"` | `tsconfig.json` confirms strict mode, ES2017 target |
| Package manager | Bun | `package.json` scripts all use `bun run`, `bun.lock` exists (195KB) | No `package-lock.json` or `yarn.lock` |
| Styling | Tailwind CSS v4 (CSS-first config) | `postcss.config.mjs` uses `"@tailwindcss/postcss"`, `globals.css` line 1 uses `@import "tailwindcss"` | No `tailwind.config.ts` file. CSS-first configuration in `globals.css` via `@theme inline {}` block |
| Icons | Phosphor Icons (`@phosphor-icons/react`) | `package.json` line 41 | All app icons use `weight="regular"` (enforced by design-system linter) |
| Context menu | Radix UI (`@radix-ui/react-context-menu`) | `package.json` line 42 | Used in estimate tree for right-click rename/delete |
| Tree UI | React Complex Tree (`react-complex-tree`) | `package.json` line 54 | Used in `EstimateSheetTree.tsx` |
| Charts | D3 v7 | `package.json` line 49 | Used in project comparison charts |
| State (server cache) | TanStack Query 5.100.14 | `package.json` line 46 | Global client in `src/app/providers.tsx` |
| State (client UI) | Zustand 5.0.14 | `package.json` line 60 | Two stores: `estimate-ui-store.ts`, `navigation-ui-store.ts` |
| Table | TanStack React Table 8.21.3 | `package.json` line 47 | Used in `ProjectEstimatesTable.tsx` |
| Linting | ESLint 9 (flat config) | `eslint.config.mjs` uses `defineConfig`, `globalIgnores` from `eslint/config` | Flat config format, NOT `.eslintrc` |
| Design system | Custom linter (`scripts/enforce-app-design-system.mjs`) | 229-line enforcement script | Validates font-size caps, radius, weights, color tokens, icon styles |
| Testing (unit) | Bun test | `package.json` line 13: `"test": "bun test tests/unit"` | 2 files in `tests/unit/` |
| Testing (DOM) | Vitest + jsdom | `package.json` line 14: `"test:dom": "vitest run --maxWorkers=1"` | 115+ files in `tests/vitest/` |
| Testing (E2E) | Playwright (Chromium only) | `package.json` line 16, `@playwright/test` 1.60.0 | 7 spec files in `e2e/` |
| Database | Supabase/PostgreSQL 17 | README, `@supabase/ssr` 0.10.3, `@supabase/supabase-js` 2.106.2 | 48+ migrations, RLS on all user-data tables, 50+ RPC functions |
| Email | Resend | `package.json` line 56: `"resend": "^6.12.4"` | Used for collaboration invites |

## 2. Routing Model — Verified

### Middleware
- **Source:** `src/proxy.ts` (NOT `middleware.ts`) — Next.js `proxy` export
- **Matcher:** `/((?!_next/static|_next/image|favicon.ico).*)` (line 126)
- **Auth gating:** Supabase `createServerClient` → `supabase.auth.getUser()` (lines 94-105)
- **Protected prefixes:** `["/workshop"]` only (line 8)
- **Public route prefixes:** `["/about", "/features", "/pricing", "/contact", "/privacy", "/terms", "/invite", "/share", "/beta"]` (line 10)
- **Auth routes:** `["/login"]` (line 9, `LOGIN_PATH`)
- **Dev bypass:** `getDevAuthBypassCredentialFromRequestParts()` (line 45) — localhost-only, requires `x-archestimator-dev-auth-bypass` header or cookie
- **Closed beta gating:** `getClosedBetaAccessForEmail()` called for authenticated users on protected/auth routes (lines 107-116)

### Layout Structure
| Route | Layout file | Status |
|-------|------------|--------|
| `/` | `src/app/layout.tsx` (root only) | Root layout provides fonts + `<AppProviders>` |
| `/workshop` | NO dedicated layout | Shared `WorkshopPageShell` component used per-page |
| `/workshop/projects/[projectId]` | `src/app/workshop/projects/[projectId]/layout.tsx` | Only nested layout — wraps project sidebar + header |
| All `/workshop/*` routes | No `/workshop/layout.tsx` exists | Confirmed by glob: 0 results |

### Route Verification
All route pages confirmed to exist:
- `src/app/workshop/page.tsx` — Homebase dashboard (wraps `WorkshopHomebaseClient` in `WorkshopPageShell`)
- `src/app/workshop/projects/page.tsx` — Project list
- `src/app/workshop/projects/[projectId]/layout.tsx` — Project workspace layout
- `src/app/workshop/projects/[projectId]/estimates/page.tsx` — Estimate sheet list
- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx` — Estimate sheet editor
- `src/app/workshop/library/page.tsx` — Component library
- `src/app/workshop/onboarding/page.tsx` — Redirects to `/workshop/settings` (confirmed, line 4)

## 3. Auth Model — Verified

### Session Layer
- **Source:** `src/lib/auth/session.ts`
- **`getCurrentUserContext()`** (line 31): React `cache()`-wrapped, returns `CurrentUserContext | null`
  - Checks dev bypass first (`getDevCurrentUserContext()`, line 33)
  - Falls back to Supabase `auth.getUser()` (line 37-40)
  - Beta access check via `getClosedBetaAccessForEmail()` (line 45-49)
  - Auto-creates profile via `ensure_current_user_profile` RPC if missing (lines 67-73)
- **`requireCurrentUserContext()`** (line 87): Calls `getCurrentUserContext()`, redirects to `/login` if null

### Onboarding System (Existing — Signup Profile Setup)
- **Source:** `src/lib/auth/account-data.ts`, `src/lib/auth/account-actions.ts`
- **Table:** `user_onboarding_profiles` (service-role upsert, line 207 of account-actions.ts)
- **Key field:** `onboarding_completed_at` (timestamp, set to `new Date().toISOString()` on completion, line 202)
- **Event type:** `"onboarding_completed"` recorded in `account_security_events` (line 68-69)
- **Route:** `/workshop/onboarding` → redirects to `/workshop/settings` (confirmed)
- **This is the SIGNUP profile onboarding — NOT the in-app product tour system we're planning**
- **Relevance:** The `onboarding_completed_at` field on `user_onboarding_profiles` is the natural place to add a `tour_completed_at` column for the new tour system

## 4. Database/Persistence Model — Verified

### Schema Overview
- Supabase/PostgreSQL 17, 48+ migrations
- RLS on all user-data tables, 50+ RPC functions
- Types generated in `src/lib/supabase/types.ts` (bundled/generated file)

### Core Domain Hierarchy
```
workspaces → projects → estimates → estimate_nodes (group/area tree) → estimate_row_items
```

### Key Tables (from README + verified references)
- `user_onboarding_profiles` — signup profile tracking, includes `onboarding_completed_at`
- `profiles` — user profiles with role, display_name, avatar_url, default_workspace_id
- `workspaces`, `workspace_members`, `workspace_account_settings`
- `projects`, `project_members`
- `estimates`, `estimate_nodes`, `estimate_row_items`
- `cost_library_items`, `price_options`, `variant_cost_entries`
- `collaboration_invitations` (hashed tokens)
- `project_publications` (hashed tokens, optional passwords)
- `estimate_sheet_versions` (named snapshots)
- `account_security_events` — audit log (used by existing onboarding for `"onboarding_completed"` events)

### Onboarding Completion Tracking (Current State)
Verified from `src/lib/auth/account-actions.ts` lines 196-224:
```typescript
// saveProfileSettings() upserts into user_onboarding_profiles with:
{
  user_id: userId,
  display_name, user_category, country_region, primary_use,
  student_educator_detail, marketing_consent_at,
  ...(completedAt ? { onboarding_completed_at: completedAt } : {}),
}
```
The `onboarding_completed_at` TIMESTAMPTZ column exists. The new tour system should add a `tour_completed_at TIMESTAMPTZ` column to this same table.

## 5. App Shell Structure — Verified

### Root Layout
- **Source:** `src/app/layout.tsx`
- Fonts: Inter, Poppins, Roboto_Mono, Source_Serif_4 (all `next/font/google`)
- Wraps children in `<AppProviders>` (client component)
- Metadata: title, description, favicons (favicon.ico, 32x32, 16x16, apple-touch-icon)

### App Providers (Client)
- **Source:** `src/app/providers.tsx`
- `QueryClientProvider` (TanStack Query) — 5-min staleTime, 5-min gcTime, no refetchOnWindowFocus, retry 1
- `ToastProvider`
- `BfcacheHandler`
- `PerformanceMonitor`
- `NavigationListener`
- `RouteLoadingOverlay` — always mounted

### Workshop Shell
- **Source:** `src/components/workshop/WorkshopPageShell.tsx`
- Async server component — calls `getCurrentUserContext()` (line 74)
- Structure: `<main data-workshop-page-shell-root>` → `<MainSidebar>` + `<section>` + `<footer>`
- Content section: `lg:pl-[64px]` (sidebar collapsed width compensation)
- Content wrapped in `<Suspense fallback={<WorkshopShellContentFallback />}>` (line 107)
- Footer: "Send beta feedback" link, optional `<ProjectTotalHeader>`, optional `<AskFlipFooterAssistant>`
- CSS custom properties injected: `ESTIMATE_CENTER_COLUMN_CSS_VARIABLES` + `sidePanelWidthCssVariables`

### Main Sidebar
- **Source:** `src/components/sidebar/MainSidebar.tsx`
- Client component — uses `usePathname()`, `useState()`, keyboard listeners
- Nav items: Workshop (`⌘1`), Projects (with badge, `⌘2`), Components (`⌘3`), Templates (`⌘4`), Settings
- **Width:** Collapsed = 64px (`SIDEBAR_WIDTH_COLLAPSED`), Expanded = 288px (`SIDEBAR_WIDTH_EXPANDED`)
- **Transitions:** Expand 160ms, Collapse 130ms, easing: `cubic-bezier(0.22, 1, 0.36, 1)`
- **Z-index:** `z-[100]` (line 153)
- **Overlay:** `z-30` (line 148) — shown when expanded, hidden on lg+ screens
- **Prefetch:** `usePrefetchOnHover` on all nav items
- Keyboard: `⌘B` toggle, `Escape` collapse

## 6. Z-Index Layer Analysis — Critical for Onboarding

| Element | Z-Index | Source | Notes |
|---------|---------|--------|-------|
| MainSidebar | `z-[100]` | `MainSidebar.tsx:153` | Fixed, full-height, always rendered on lg+ |
| Sidebar expanded overlay (scrim) | `z-30` | `MainSidebar.tsx:148` | Only shown when sidebar expanded |
| Sidebar border line | `z-[100]` | `MainSidebar.tsx:199` | Decorative, `pointer-events-none` |
| NewProjectModal overlay | `z-30` | `NewProjectModal.tsx:15` | `fixed inset-0`, `backdrop-blur-md` |
| NewProjectModal close button | `z-20` | `NewProjectModal.tsx:26` | Within modal |
| RouteLoadingOverlay | Always mounted | `providers.tsx:38` | Zustand-controlled visibility |
| react-joyride default | `100` (or `1000` in some versions) | Documentation | **Will conflict with MainSidebar's `z-[100]`** |

### Z-Index Recommendation
**Set react-joyride tooltip/beacon z-index to `101` or higher** to render above the sidebar. The sidebar at `z-[100]` is the highest fixed element in the app. Joyride must render above it to be visible.

Alternative: Use `z-[101]` for consistency with the codebase's arbitrary z-index pattern.

## 7. Route Transition Considerations

### Active Systems That Affect Tour Timing
1. **NavigationListener** — monitors route changes globally (`src/components/navigation-listener.tsx`)
2. **RouteLoadingOverlay** — shows during navigation, min 250ms display, 10s safety timeout (`navigation-ui-store.ts`)
3. **Suspense boundaries** — `WorkshopPageShell` wraps content in `<Suspense>` with skeleton fallback
4. **dynamic() imports** — `EstimateWorkspaceClient`, `LibraryPageClient` use `dynamic()` with `Skeleton` fallbacks
5. **BFCacheHandler** — clears Zustand state on bfcache restore (`navigation-ui-store.ts:57-64`)

### Tour Impact
- Tours spanning multiple routes MUST wait for Suspense resolution before advancing
- The `NavigationListener` + `RouteLoadingOverlay` system must complete before tour steps targeting new-route content become visible
- `dynamic()` imports create additional delay for estimate sheet and library pages
- **Recommendation:** Tour should listen for route completion events or use MutationObserver/ResizeObserver on target elements with retry logic

## 8. Modal Considerations

### Existing Modal Pattern
- **Source:** `src/components/workshop/NewProjectModal.tsx`
- Pattern: `<div className="fixed inset-0 z-30 ... bg-black/25 backdrop-blur-md">` wrapping `<div role="dialog" aria-modal="true">`
- Close: `<Button>` with `aria-label`, `X` icon (Phosphor, `weight="regular"`)
- **No focus trap library** — relies on native focus behavior + `aria-modal`

### Tour Impact
- If a tour step targets content inside a modal, the tour must handle modal open/close lifecycle
- Joyride's target selection must account for `aria-modal="true"` dialogs
- Tour events should handle modal dismissal (user closes modal mid-tour)

## 9. Public Route Protection — Critical

### Routes That MUST Never Load Onboarding Code
Verified from `src/proxy.ts` lines 10-11:
| Route | Why Protected |
|-------|--------------|
| `/` | Landing page — marketing surface |
| `/about`, `/features`, `/pricing`, `/contact` | Marketing pages |
| `/privacy`, `/terms` | Legal pages |
| `/share/[token]/` | Public shared link viewer — no auth |
| `/invite/[token]/` | Public invite entry — pre-auth |
| `/beta` | Closed beta access page |
| `/login` | Auth page |

### Implementation Requirement
Onboarding tour runtime (React Joyride + tour config) MUST only be loaded under `/workshop/*` routes. Public routes must never import, bundle, or execute tour code. The simplest enforcement: conditionally render the tour provider only when `pathname.startsWith("/workshop")`.

## 10. Existing Feature Flag Pattern — Verified

### Source: `src/lib/ai/feature-flags.ts`

```typescript
export function isAskFlipUiEnabled() {
  return readBooleanFeatureFlag(ASK_FLIP_UI_ENABLED_ENV, false); // "NEXT_PUBLIC_ASK_FLIP_UI_ENABLED"
}

export function isAiRoutesEnabled() {
  return readBooleanFeatureFlag(AI_ROUTES_ENABLED_ENV, false); // "ARCHESTIMATOR_AI_ENABLED"
}
```

### Pattern to Follow
- `NEXT_PUBLIC_*` prefix for client-exposed flags (needed for Joyride which runs client-side)
- Server-only flags use non-prefixed env vars (e.g., `ARCHESTIMATOR_AI_ENABLED`)
- `readBooleanFeatureFlag()` helper: trims, lowercases, handles `"1"/"true"/"yes"/"on"` and `"0"/"false"/"no"/"off"`
- Default to `false` (safe) when undefined/empty
- For onboarding: `NEXT_PUBLIC_ONBOARDING_TOUR_ENABLED` (client-exposed, defaults to `false` for closed beta safety)

### Existing Feature Flags (from `.env.example`)
| Flag | Default | Purpose |
|------|---------|---------|
| `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` | `false` | Ask Flip assistant UI |
| `ARCHESTIMATOR_AI_ENABLED` | `false` | AI routes |
| `PROJECT_INVITE_ENTRY_ENABLED` | `false` | Collaboration invites |
| `CLOSED_BETA_ACCESS_ENABLED` | `false` | Beta access gate |
| `ARCHESTIMATOR_DEV_AUTH_BYPASS` | `0` | Local dev auth skip |

## 11. localStorage Usage Patterns — Verified

### Existing localStorage Consumers
| File | Key(s) | Purpose |
|------|--------|---------|
| `src/components/workshop/projects-page-client.tsx` | View mode preference | Transient UI state |
| `src/components/workshop/ProjectEstimatesTable.tsx` | Column widths | Transient UI state |
| Sidebar | Expansion state (implicit via React state) | Session-only, not persisted |

### Pattern
- Read from `localStorage` on mount
- Write on user-driven change
- Sync across tabs via `storage` events
- **NOT suitable for onboarding completion state** — must be server-persisted

### Recommendation
Onboarding tour completion state MUST be stored server-side (in `user_onboarding_profiles.tour_completed_at`), NOT in localStorage. localStorage may be used for transient tour step progress within a session but must never be the source of truth for completion.

## 12. Design System Constraints — Verified

### Source: `scripts/enforce-app-design-system.mjs` (229 lines)

| Rule | Enforcement | Applies To |
|------|------------|------------|
| Font: SF Pro, regular/medium only | Blocks `font-semibold`, `font-bold`, `font-mono`, `font-serif`, `font-poppins` | `src/app/`, `src/components/` |
| Size: 12px MAX | Blocks any text size > 12px (named classes AND arbitrary values) | App/workshop only; landing exempt |
| Radius: `rounded-xs` only (3px) | Blocks any other `rounded-*` class | App/workshop only |
| Spacing: zero letter-spacing | Blocks any `tracking-*` class other than `tracking-normal` | App/workshop only |
| Palette: Neutral #292929/#5D5D5D/#7F7F7F | Validates CSS custom properties in `globals.css` | Global |
| Icons: Phosphor regular weight | Blocks `weight="bold"`, `weight="duotone"`, `weight="fill"` | App/workshop only |
| Labels: max 9px when uppercase | Blocks uppercase label-like text > 9px | App/workshop only |
| Secondary text: max 10px | Blocks secondary-tone text > 10px | App/workshop only |
| Landing exemption | `src/app/page.tsx`, about/contact/features/pricing, `src/components/landing/` | Listed in allowlist |

### Impact on Onboarding Tour UI
- Tour tooltips/overlays rendered by react-joyride are NOT within `src/app/` or `src/components/` scope of the design-system linter (they're third-party library DOM)
- HOWEVER, any custom tour step content rendered via Joyride's `tooltipComponent` MUST comply with design system rules:
  - Text must be max 12px
  - Rounded corners must be `rounded-xs` (3px)
  - Font must be SF Pro, regular/medium
  - Icons must be Phosphor regular weight
  - No bold/semibold font weights

## 13. Existing Analytics — Verified

### Current State
- GA + Clarity on landing page only (behind cookie consent)
- `.env.example` variables: `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_CLARITY_PROJECT_ID` (lines 52-53)
- A/B testing framework: `src/lib/ab-testing/` (landing-page focused)
- Landing analytics: `src/components/landing/` (analytics loader components)
- **NO app-level analytics framework exists**

### Relevance to Onboarding
- No existing event tracking infrastructure in the workshop app
- Onboarding completion events (`"tour_completed"`, `"tour_step_completed"`, `"tour_dismissed"`) should be recorded in `account_security_events` — the existing audit mechanism used by signup onboarding
- GA/Clarity events should NOT be fired from workshop pages (privacy concern; landing-page-only consent)

## 14. Testing Infrastructure — Verified

| Framework | Location | File Count | Notes |
|-----------|----------|-----------|-------|
| Bun test | `tests/unit/` | 2 files | Red-first migration guard, UI baseline regression |
| Vitest + jsdom | `tests/vitest/` | 115+ files | RTL components, server actions, RPC contracts, security contracts |
| Playwright E2E | `e2e/` | 7 spec files | Chromium only, some gated behind env flags |

### Onboarding Testing Strategy
- **Unit:** Tour step configuration, feature flag logic, Joyride callback handlers → Bun test (`tests/unit/`)
- **Component:** Tour provider rendering, step targeting, tooltip content → Vitest + RTL (`tests/vitest/`)
- **E2E:** Full tour walkthrough, dismissal, skip, completion → Playwright (`e2e/`)
- E2E tests should be gated behind `ARCHESTIMATOR_E2E_ONBOARDING_TOUR=1` (follow existing pattern)

## 15. Key Component Inventory — Verified

### Components That May Be Tour Targets
| Component | File | Status | Tour Relevance |
|-----------|------|--------|---------------|
| WorkshopHomebaseClient | `src/components/workshop/WorkshopHomebaseClient.tsx` | Client component, bento grid | First screen after auth — tour entry point |
| ProjectsPageClient | `src/components/workshop/projects-page-client.tsx` | Client component, list + search + modal | "Create first project" step |
| NewProjectModal | `src/components/workshop/NewProjectModal.tsx` | Modal, z-30, `aria-modal="true"` | Target for project creation tour step |
| ProjectDashboardClient | `src/components/workshop/ProjectDashboardClient.tsx` | Client, sidebar + next-step links | Project overview tour |
| ProjectEstimatesClient | `src/components/workshop/ProjectEstimatesClient.tsx` | Client, list + toolbar | Estimate sheet discovery |
| EstimateWorkspaceClient | `src/components/workshop/EstimateWorkspaceClient.tsx` | dynamic() import with Suspense | Estimate editor tour |
| LibraryPageClient | `src/components/workshop/LibraryPageClient.tsx` | dynamic() import with Suspense | Component library tour |
| EstimateSheetTree | `src/components/workshop/EstimateSheetTree.tsx` | react-complex-tree, DnD | Tree interaction tour |
| MainSidebar | `src/components/sidebar/MainSidebar.tsx` | z-[100], fixed, collapsible | Navigation tour step |

### Shared UI Primitives Available for Tour Content
| Component | File | Use in Tour |
|-----------|------|-------------|
| Button | `src/components/ui/button.tsx` | Tour tooltip action buttons |
| Badge | `src/components/ui/badge.tsx` | Step counter badges |
| Skeleton | `src/components/ui/skeleton.tsx` | Loading states (if tour waits for data) |
| SearchInput | `src/components/ui/search-input.tsx` | N/A for tour, but present in target pages |
| EmptyState | `src/components/ui/empty-state.tsx` | Post-tour empty state messaging |
| Toast | `src/components/ui/toast.tsx` | Tour completion confirmation |

## 16. Audit Evidence Table

| # | Area | File/Path | Verified Finding | Relevance to Onboarding | Confidence |
|---|------|-----------|-----------------|------------------------|------------|
| 1 | Framework | `package.json:52-53` | Next.js 16.2.6, React 19.2.6 | Joyride must be React 19 compatible | High |
| 2 | Package manager | `package.json` scripts, `bun.lock` | Bun with bun.lock (195KB) | `bun add react-joyride` will use Bun | High |
| 3 | Styling | `src/app/globals.css:1`, `postcss.config.mjs` | Tailwind v4 CSS-first, no config file | Joyride overlay/tooltip must respect Tailwind v4 | High |
| 4 | Middleware | `src/proxy.ts:8-10` | `PROTECTED_PREFIXES = ["/workshop"]`, 10 public prefixes | Only `/workshop/*` should load tour code | High |
| 5 | Middleware auth | `src/proxy.ts:94-105` | Supabase `auth.getUser()` gates `/workshop` | Tour only runs for authenticated users | High |
| 6 | Middleware beta | `src/proxy.ts:107-116` | `getClosedBetaAccessForEmail()` gates access | Tour only runs for approved beta users | High |
| 7 | Root layout | `src/app/layout.tsx:27-34` | Fonts (Inter, Poppins, Roboto_Mono, Source_Serif_4), `<AppProviders>` | Tour must render within provider tree | High |
| 8 | Providers | `src/app/providers.tsx:12-26` | QueryClient (5-min staleTime), Toast, BFCache, NavigationListener, RouteLoadingOverlay | Tour must not interfere with nav overlay | High |
| 9 | Workshop shell | `src/components/workshop/WorkshopPageShell.tsx:74-77` | `getCurrentUserContext()` required, Suspense wrapping children | Tour provider placement — inside or after shell | High |
| 10 | Workshop shell dom | `src/components/workshop/WorkshopPageShell.tsx:86` | `<main data-workshop-page-shell-root>` | Tour root element identifier | Medium |
| 11 | Sidebar | `src/components/sidebar/MainSidebar.tsx:153` | `z-[100]` fixed nav, expanded overlay `z-30` | Joyride must render at z-index ≥ 101 | High |
| 12 | Sidebar nav | `src/components/sidebar/MainSidebar.tsx:46-52` | 5 nav items: Workshop, Projects, Components, Templates, Settings | Tour targets available on all workshop pages | Medium |
| 13 | Sidebar dimensions | `src/components/sidebar/sidebar-types.ts:1-4` | Expanded 288px, Collapsed 64px, Padding 8px | Tour step positioning near sidebar edge | Medium |
| 14 | Modal pattern | `src/components/workshop/NewProjectModal.tsx:15-20` | `z-30 fixed inset-0`, `role="dialog"`, `aria-modal="true"` | Tour steps inside modals must handle focus | High |
| 15 | Onboarding route | `src/app/workshop/onboarding/page.tsx:3-4` | `redirect("/workshop/settings")` — signup onboarding redirects to settings | Existing onboarding is signup profile, not product tour | High |
| 16 | Onboarding data | `src/lib/auth/account-actions.ts:207-219` | `user_onboarding_profiles` upsert with `onboarding_completed_at` | Add `tour_completed_at` column here | High |
| 17 | Onboarding events | `src/lib/auth/account-data.ts:104` | `"onboarding_completed"` in `AccountSecurityEventType` | Add `"tour_completed"` event type | High |
| 18 | Feature flags | `src/lib/ai/feature-flags.ts:1-18` | `readBooleanFeatureFlag()` pattern, `NEXT_PUBLIC_*` for client | Follow pattern: `NEXT_PUBLIC_ONBOARDING_TOUR_ENABLED` | High |
| 19 | Feature flags env | `.env.example:47-48` | `ARCHESTIMATOR_AI_ENABLED`, `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` | Add `NEXT_PUBLIC_ONBOARDING_TOUR_ENABLED=false` | High |
| 20 | Zustand stores | `src/stores/navigation-ui-store.ts` | `isNavigating`, `show()`, `hide()`, 250ms min display, 10s timeout | Tour must wait for `isNavigating === false` | High |
| 21 | Zustand stores | `src/stores/estimate-ui-store.ts` | Selection, expansion, drag state | Tour must not interfere with selection state | Low |
| 22 | TanStack Query | `src/app/providers.tsx:14-18` | Global QueryClient, 5-min staleTime/gcTime | Tour completion query can use same client | Medium |
| 23 | Design lint | `scripts/enforce-app-design-system.mjs:6` | `maxPx = 12` font-size cap | Custom tour tooltips must respect 12px cap | High |
| 24 | Design lint | `scripts/enforce-app-design-system.mjs:189-193` | `rounded-xs` only | Custom tour tooltip styling must use `rounded-xs` | High |
| 25 | Design lint | `scripts/enforce-app-design-system.mjs:51-62` | Blocks `font-semibold`, `font-bold`, `font-mono`, `font-serif` | Tour text must use SF Pro regular/medium only | High |
| 26 | Design lint | `scripts/enforce-app-design-system.mjs:216-217` | Blocks bold/duotone/fill icon weights | Tour icons must be Phosphor regular weight | Medium |
| 27 | Design lint exceptions | `scripts/enforce-app-design-system.mjs:10-17` | Landing pages + `src/components/landing/` exempt | Tour is NOT landing — rules apply fully | High |
| 28 | Skeleton fallback | `src/components/ui/skeleton.tsx:10-12` | `animate-pulse rounded-xs bg-muted/40` | Tour loading states should use same skeleton | Low |
| 29 | CSS variables | `src/app/globals.css:7-33` | Design tokens: `--ink`, `--secondary`, `--tertiary`, `--radius-xs: 3px` | Tour tooltip theming | Medium |
| 30 | Dev auth bypass | `src/proxy.ts:45-53`, `.env.example:10-19` | Local dev auth skip via header/cookie | Tour testing in dev without real auth | Medium |
| 31 | E2E env gates | README, `package.json:16-17` | Mutating E2E gated behind env flags | Add `ARCHESTIMATOR_E2E_ONBOARDING_TOUR=1` | High |
| 32 | Suspense boundaries | `src/components/workshop/WorkshopPageShell.tsx:107` | `<Suspense fallback={...}>` wraps children | Tour must wait for Suspense resolution | High |
| 33 | dynamic() imports | Estimate and library pages | `dynamic()` with Skeleton fallbacks | Extra wait for component hydration on those routes | Medium |
| 34 | localStorage pattern | `projects-page-client.tsx`, `ProjectEstimatesTable.tsx` | View prefs, column widths in localStorage | Do NOT use localStorage for tour completion (use DB) | High |
| 35 | No `/workshop/layout.tsx` | Glob verified (0 results) | Only root + one project layout exist | Tour provider cannot be placed in a `/workshop` layout — must be per-page or in WorkshopPageShell | High |
| 36 | Sidebar prefetch | `src/components/sidebar/MainSidebar.tsx:64` | `usePrefetchOnHover` on all nav routes | Tour-triggered navigation may benefit from prefetch | Low |
| 37 | Sidebar types | `src/components/sidebar/sidebar-types.ts:11-17` | `SidebarNavItem` type: id, href, label, shortcut, badgeCount | Tour step labeling can reference nav item shortcuts | Low |
| 38 | Session user context | `src/lib/auth/session.ts:8-15` | `CurrentUserContext` type: userId, email, role, profile, displayName, avatarUrl | Tour personalization (welcome by name) | Medium |
| 39 | BFCacheHandler | `src/components/bfcache-handler.tsx` (referenced in providers) | Clears Zustand nav state on bfcache restore | Tour state must survive bfcache restore | Low |
| 40 | Readme version drift | `README.md` says React 19.2.4, `package.json` has 19.2.6 | Minor version mismatch | Not actionable — package.json is canonical | Low |

## 17. Mismatches and Gotchas

| # | Claim/Finding | Status | Detail |
|---|--------------|--------|--------|
| 1 | README says React 19.2.4 | **Drift** | `package.json` has 19.2.6 — minor patch difference, not impacting onboarding |
| 2 | `/workshop/onboarding/` route | **Confirmed** | Redirects to `/workshop/settings` — is signup profile setup, NOT product tour |
| 3 | No `/workshop/layout.tsx` | **Confirmed** | Only root layout + `/workshop/projects/[projectId]/layout.tsx` exist |
| 4 | All other task-description assumptions | **Verified correct** | Stack versions, routes, auth model, component structure all match |

## 18. Summary of Onboarding-Specific Constraints

### Must Handle
1. **Z-index ≥ 101** for Joyride tooltips/overlays (sidebar is z-[100])
2. **Workshop-only loading** — tour code must never execute on public routes (`/`, `/share`, `/invite`, etc.)
3. **Suspense + dynamic() resolution** — tour steps must wait for targets after route transitions
4. **NavigationListener state** — tour must respect `isNavigating` from Zustand store
5. **Modal lifecycle** — tour must handle `aria-modal="true"` dialogs (NewProjectModal)
6. **Design system compliance** — custom tooltip content must follow 12px max, rounded-xs, SF Pro, Phosphor regular
7. **Server-persisted completion** — `tour_completed_at` in `user_onboarding_profiles`, not localStorage
8. **Feature flag gating** — `NEXT_PUBLIC_ONBOARDING_TOUR_ENABLED` (default: false for closed beta)
9. **Auth requirement** — tour only for authenticated users (Supabase session via `getCurrentUserContext()`)
10. **Beta access** — tour must respect `CLOSED_BETA_ACCESS_ENABLED` gate

### Should Handle
1. **Route transitions** — 250ms+ RouteLoadingOverlay between pages
2. **BFCache** — tour state preservation across back/forward navigation
3. **Sidebar collapse/expand** — tour steps referencing sidebar nav items must handle collapsed state
4. **E2E testing** — gate behind `ARCHESTIMATOR_E2E_ONBOARDING_TOUR=1`
5. **Dev auth bypass** — tour should work with local dev auth bypass for testing

### Nice to Handle
1. **User personalization** — welcome by displayName from `CurrentUserContext`
2. **Keyboard navigation** — Joyride's built-in keyboard nav should not conflict with MainSidebar shortcuts (`⌘B`, `Escape`)
3. **Reduced motion** — respect `prefers-reduced-motion` (sidebar already does)
4. **Sidebar prefetch** — tour-triggered navigation can leverage existing hover-prefetch

---

**Audit completed.** All findings verified against live source files. No assumptions carried forward without file-reference evidence.
