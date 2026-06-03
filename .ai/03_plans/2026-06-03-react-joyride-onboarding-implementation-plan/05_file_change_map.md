# 05 File Change Map

## Purpose

This document maps every file that must be created or modified to implement the React Joyride onboarding system. It serves as the implementation agent's canonical checklist — no file should be created or edited that is not listed here. Each entry includes: exact file path, new/modified status, purpose, dependencies, risk level, required test coverage, and implementation notes.

**Implementers: read this document BEFORE touching any source file.** Cross-reference against `04_implementation_matrix.md` for the specific `data-tour` targets each surface requires.

---

## Phase-by-Phase File Breakdown

### Phase 0: Review & Approval (Zero Code Changes)

**No files created or modified.** This phase is stakeholder review of the planning package. All documents in this folder must score 98+ on the quality scorecard.

---

### Phase 1: Package Installation + Feature Folder Skeleton

#### Package Installation

| Proposed File Path | New/Modified | Purpose | Depends On | Risk Level | Test Coverage Needed | Notes |
|--------------------|--------------|---------|------------|------------|----------------------|-------|
| `package.json` | **Modified** | Add `react-joyride` dependency | None | **Low** | None — package audit is sufficient | Command: `bun add react-joyride`. Verify install with `bun install --frozen-lockfile`. Check `bun.lock` for expected entry. Confirm version compatibility with React 19.2.x (react-joyride latest supports React 18+; verify no peer dependency conflicts at install time). If conflicts arise, pin a specific compatible version and document here. |

#### Feature Folder — Types

| Proposed File Path | New/Modified | Purpose | Depends On | Risk Level | Test Coverage Needed | Notes |
|--------------------|--------------|---------|------------|------------|----------------------|-------|
| `src/features/onboarding/types/onboarding.ts` | **New** | Type definitions: `TourKey`, `TourStep`, `TourDefinition`, `TourCompletionState`, `OnboardingProviderState`, `OnboardingProviderActions` | None | **Low** | Type-level tests (TypeScript compilation is sufficient for type definitions) | Define `TourKey` as a string literal union of all tour keys. Define `TourStep` extending react-joyride's `Step` type (add custom `dataTourTarget` field). Define `OnboardingProviderState`: `{ activeTour: TourKey \| null, currentStepIndex: number, isRunning: boolean, isCompleted: boolean }`. Define `OnboardingProviderActions`: `{ startTour, skipTour, completeTour, nextStep, prevStep, resetTour }`. Export all types from barrel `src/features/onboarding/types/index.ts`. |

#### Feature Folder — Barrel Exports

| Proposed File Path | New/Modified | Purpose | Depends On | Risk Level | Test Coverage Needed | Notes |
|--------------------|--------------|---------|------------|------------|----------------------|-------|
| `src/features/onboarding/index.ts` | **New** | Barrel re-export for public API surface | `types/onboarding.ts`, `components/OnboardingRuntime.tsx` | **Low** | None | Export: `OnboardingRuntime`, `OnboardingProvider`, tour key constants, feature flag check helper. This is the ONLY import path other files should use (no deep imports into `src/features/onboarding/` internals). |

#### Config — Tour Targets

| Proposed File Path | New/Modified | Purpose | Depends On | Risk Level | Test Coverage Needed | Notes |
|--------------------|--------------|---------|------------|------------|----------------------|-------|
| `src/features/onboarding/config/tourTargets.ts` | **New** | Single source of truth for all `data-tour` attribute string constants. Export as `const` object: `TOUR_TARGETS = { MAIN_NAV_WORKSHOP: 'ae-tour-main-nav-workshop', ... }` | None | **Low** | Unit test: verify no duplicate values, verify all keys are unique, verify all values match `ae-tour-` prefix pattern, verify no reserved or conflicting HTML attribute names | This file is the canonical registry for `data-tour` attribute values. Any component that renders a `data-tour` attribute MUST import the constant from here — no raw string literals. Format: `ae-tour-{surface}-{element}`. Example: `ae-tour-main-nav-workshop`, `ae-tour-homebase-projects-card`. |

#### Config — Tour Registry (Empty Shell)

| Proposed File Path | New/Modified | Purpose | Depends On | Risk Level | Test Coverage Needed | Notes |
|--------------------|--------------|---------|------------|------------|----------------------|-------|
| `src/features/onboarding/config/tourRegistry.ts` | **New** | Tour registry map: `Map<TourKey, TourDefinition>`. In Phase 1, register zero tours (empty map or commented-out placeholder). Filled in Phase 3 when runtime is wired. | `types/onboarding.ts`, `tourTargets.ts` | **Low** | Unit test: verify registry shape, verify all registered tours have unique keys, verify each tour has a `route` and `steps` array | Export `tourRegistry: Map<TourKey, TourDefinition>` and `getTourByRoute(route: string): TourDefinition[]` helper. Each `TourDefinition`: `{ key: TourKey, version: number, route: string, steps: TourStep[] }`. |

#### Config — First Tour (Placeholder)

| Proposed File Path | New/Modified | Purpose | Depends On | Risk Level | Test Coverage Needed | Notes |
|--------------------|--------------|---------|------------|------------|----------------------|-------|
| `src/features/onboarding/config/firstWorkspaceOrientationTour.ts` | **New** | Workspace Orientation tour step definitions (MVP tour). In Phase 1: skeleton/placeholder. Filled in Phase 3 when runtime is wired. | `tourTargets.ts`, `types/onboarding.ts` | **Low** | Unit test: verify correct number of steps, verify each step has `target` matching a `TOUR_TARGETS` constant, verify no step targets an element not in the `/workshop` route | Export `firstWorkspaceOrientationTour: TourDefinition`. Steps: Workspace shell, MainSidebar nav (Workshop, Projects), Homebase cards (Projects entry point). 4-6 steps total. |

#### Components — OnboardingRuntime (No-Op)

| Proposed File Path | New/Modified | Purpose | Depends On | Risk Level | Test Coverage Needed | Notes |
|--------------------|--------------|---------|------------|------------|----------------------|-------|
| `src/features/onboarding/components/OnboardingRuntime.tsx` | **New** | Main Joyride wrapper component. In Phase 1: render nothing (return `null` or a `<div data-onboarding-placeholder />`) when `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED !== 'true'`. Wired in Phase 3. | `tourRegistry.ts`, `hooks/useOnboardingTourController.ts` (Phase 3) | **Medium** (when wired) | Component test: verify renders null when flag is off, verify renders Joyride when flag is on and tour is active, verify cleanup on unmount | Must be a client component (`"use client"`). Marked with `"use client"` directive. Uses `next/dynamic` for lazy loading the actual Joyride import to keep it out of the initial bundle. Signature: `<OnboardingRuntime />` — no props; reads tour state from context. |

#### Components — OnboardingProvider (Context Shell)

| Proposed File Path | New/Modified | Purpose | Depends On | Risk Level | Test Coverage Needed | Notes |
|--------------------|--------------|---------|------------|------------|----------------------|-------|
| `src/features/onboarding/components/OnboardingProvider.tsx` | **New** | React context provider wrapping `WorkshopPageShell` children. Provides tour state and control functions to all descendants. In Phase 1: pass-through wrapper (renders children, provides no-op context). Wired in Phase 3. | `types/onboarding.ts`, `hooks/useOnboardingState.ts` (Phase 4) | **Medium** (when wired) | Component test: verify children render, verify context is accessible, verify no state leak between providers | Client component. Wraps children in `OnboardingContext.Provider`. Context value: `{ state: OnboardingProviderState, actions: OnboardingProviderActions }`. Created via `createContext` with a default no-op value. |

#### Hooks — Feature Flag Helper

| Proposed File Path | New/Modified | Purpose | Depends On | Risk Level | Test Coverage Needed | Notes |
|--------------------|--------------|---------|------------|------------|----------------------|-------|
| `src/features/onboarding/hooks/useOnboardingEnabled.ts` | **New** | Simple hook that reads `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED` env var. Returns `boolean`. | None | **Low** | Unit test: verify returns false when env is unset/'false'/'0', true when 'true'/'1' | Follows pattern from `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` usage in `WorkshopPageShell`. Single-line: `return process.env.NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED === 'true'`. |

#### Environment Variable

| Proposed File Path | New/Modified | Purpose | Depends On | Risk Level | Test Coverage Needed | Notes |
|--------------------|--------------|---------|------------|------------|----------------------|-------|
| `.env.example` | **Modified** | Add `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=false` entry | None | **Low** | None | Add under existing feature flags section. Default `false`. Comment: `# Enable React Joyride onboarding tours (Phase 1: no-op skeleton, Phase 3+: live tours). Set to "true" to activate.` |
| `.env.local` (per-developer) | **Modified** (manual, not committed) | Add `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=false` | `.env.example` | **Low** | None | Developers set this locally. Never commit `.env.local`. |

---

### Phase 2: Target Markers (`data-tour` Attributes)

**No new files created.** All changes are additive modifications to existing components.

#### Existing Component Modifications — Shared Sidebar

| Proposed File Path | New/Modified | Purpose | Depends On | Risk Level | Test Coverage Needed | Notes |
|--------------------|--------------|---------|------------|------------|----------------------|-------|
| `src/components/sidebar/SidebarNavItemRow.tsx` | **Modified** | Accept optional `tourTarget?: string` prop. Render `data-tour={tourTarget}` on the root wrapper element when prop is provided. | `src/features/onboarding/config/tourTargets.ts` (Phase 1) | **Low** | DOM test: verify `data-tour` attribute is rendered when prop is provided, verify absent when prop is undefined, verify no rendering change when prop is undefined (backward-compatible) | Additive change. Prop is typed as `string | undefined`. Default `undefined` means existing callers are unaffected. The attribute renders on the outermost `<li>` or `<button>` inside `SidebarNavItemRow`. |
| `src/components/sidebar/MainSidebar.tsx` | **Modified** | Import `TOUR_TARGETS` from tour targets config. Pass `tourTarget` prop to each `SidebarNavItemRow`: Workshop → `ae-tour-main-nav-workshop`, Projects → `ae-tour-main-nav-projects`, Library → `ae-tour-main-nav-components`, Templates → `ae-tour-main-nav-templates`, Settings → `ae-tour-main-nav-settings`. | `SidebarNavItemRow.tsx` (tourTarget prop), `src/features/onboarding/config/tourTargets.ts` (Phase 1) | **Low** | DOM test: verify each nav item has correct `data-tour` attribute | Purely additive: import + prop pass. No conditional logic. No behavior change. |

#### Existing Component Modifications — Workshop Shell

| Proposed File Path | New/Modified | Purpose | Depends On | Risk Level | Test Coverage Needed | Notes |
|--------------------|--------------|---------|------------|------------|----------------------|-------|
| `src/components/workshop/WorkshopPageShell.tsx` | **Modified** | 1. Add `data-tour="ae-tour-workshop-shell"` to the shell root wrapper div. 2. Import and conditionally mount `<OnboardingRuntime>` (behind `useOnboardingEnabled()` check). 3. Wrap children in `<OnboardingProvider>` (behind feature flag). | `src/features/onboarding/` (Phase 1), `MainSidebar.tsx` (modified) | **Medium** | DOM test: verify `data-tour` attribute on shell root, verify `OnboardingRuntime` not mounted when flag is off, verify `OnboardingRuntime` mounted when flag is on, verify `OnboardingProvider` wraps children when flag is on | **Critical integration point.** This is the ONLY file that mounts `OnboardingRuntime` and `OnboardingProvider`. Public routes (`PublicPageShell`) must NEVER import onboarding code. Use `next/dynamic` for lazy import: `const OnboardingRuntime = dynamic(() => import('@/features/onboarding/components/OnboardingRuntime'), { ssr: false })`. Feature flag gates the entire dynamic import so it tree-shakes when flag is off. |

#### Existing Component Modifications — Homebase

| Proposed File Path | New/Modified | Purpose | Depends On | Risk Level | Test Coverage Needed | Notes |
|--------------------|--------------|---------|------------|------------|----------------------|-------|
| `src/components/workshop/WorkshopHomebaseClient.tsx` | **Modified** | Add `data-tour` attributes to each `DestinationTile` in the bento grid: Projects card → `ae-tour-homebase-projects-card`, Library card → `ae-tour-homebase-library-card`, Templates card → `ae-tour-homebase-templates-card`. | `src/features/onboarding/config/tourTargets.ts` (Phase 1) | **Low** | DOM test: verify each DestinationTile has correct `data-tour` attribute | Additive change. Import `TOUR_TARGETS` and add `data-tour={TOUR_TARGETS.HOMEBASE_PROJECTS_CARD}` etc. to each card wrapper. |

---

### Phase 3: Runtime + Controller (Wire First Tour)

#### Tour Config (Fill In)

| Proposed File Path | New/Modified | Purpose | Depends On | Risk Level | Test Coverage Needed | Notes |
|--------------------|--------------|---------|------------|------------|----------------------|-------|
| `src/features/onboarding/config/tourRegistry.ts` | **Modified** (fill from Phase 1 skeleton) | Register `first_workspace_orientation_v1` tour definition. Map route `/workshop` to this tour. | `firstWorkspaceOrientationTour.ts` | **Low** | Unit test: verify `getTourByRoute('/workshop')` returns the correct tour, verify registry has exactly 1 tour in MVP | Add: `tourRegistry.set('first_workspace_orientation_v1', firstWorkspaceOrientationTour)`. |
| `src/features/onboarding/config/firstWorkspaceOrientationTour.ts` | **Modified** (fill from Phase 1 placeholder) | Full tour step definitions with `target`, `content`, `placement`, `disableBeacon` per step | `tourTargets.ts`, `types/onboarding.ts` | **Low** | Unit test: verify each step has valid `target` from `TOUR_TARGETS`, verify step count is 4-6, verify placement values are valid Joyride placements | Steps: 1. Workshop shell overview (`ae-tour-workspace-shell`, placement `center`). 2. Main nav — Workshop (`ae-tour-main-nav-workshop`, placement `right`). 3. Main nav — Projects (`ae-tour-main-nav-projects`, placement `right`). 4. Homebase Projects card (`ae-tour-homebase-projects-card`, placement `top`). Optional: 5. Homebase Library card. 6. Homebase Templates card. `disableBeacon: true` for step 1, `spotlightClicks: true` to allow interaction with highlighted elements. |

#### Hooks

| Proposed File Path | New/Modified | Purpose | Depends On | Risk Level | Test Coverage Needed | Notes |
|--------------------|--------------|---------|------------|------------|----------------------|-------|
| `src/features/onboarding/hooks/useMountedTourTargets.ts` | **New** | Hook that polls the DOM for required `data-tour` targets. Returns `{ allMounted: boolean, missingTargets: string[] }`. Used by `useOnboardingTourController` to delay tour start until all targets exist. | None (DOM-only) | **Low** | Hook test: verify returns `allMounted: false` when targets missing, `true` when all present, verify polling stops after all mounted, verify cleanup on unmount | Implementation: `useEffect` + `MutationObserver` or `requestAnimationFrame` polling. Check `document.querySelector('[data-tour="..."]')` for each required target. Export with configurable `intervalMs` (default 100ms) and `timeoutMs` (default 5000ms — after which tour starts anyway with a warning). |
| `src/features/onboarding/hooks/useOnboardingTourController.ts` | **New** | Tour lifecycle controller. Manages: detecting active tour by route, starting/stopping Joyride, advancing steps, handling skip/complete. Returns `{ isRunning, currentStepIndex, startTour, skipTour, completeTour, handleJoyrideCallback }`. | `tourRegistry.ts`, `useOnboardingState.ts` (Phase 4), `useMountedTourTargets.ts` | **Medium** | Hook test: verify starts tour when route matches and no completion row, verify skips tour when completion row exists, verify handles skip callback, verify handles complete callback, verify advances step index | The core orchestration hook. Uses `useRouter` or `usePathname` to detect current route. Calls `getTourByRoute(pathname)`. Integrates with react-joyride's `callback` prop — maps Joyride events (`STEP_AFTER`, `TOUR_END`, `STOP`) to internal actions. Handles route transition edge case: if user navigates away mid-tour, persist current step and resume on return. |
| `src/features/onboarding/hooks/useOnboardingState.ts` | **New** (skeleton — wired in Phase 4) | Hook that fetches tour completion state from Supabase. In Phase 3: returns hardcoded "no tours completed" (always triggers tour). Wired to `onboardingPersistence` in Phase 4. | `onboardingPersistence.ts` (Phase 4) | **Medium** (when wired) | Hook test: verify returns empty completion map in Phase 3, verify returns correct completion state in Phase 4, verify loading/error states | Phase 3 stub: `return { completedTours: new Map(), isLoading: false, error: null }`. Phase 4: fetches from Supabase `user_onboarding_tours` table via `onboardingPersistence.getCompletedTours()`. |

#### Components (Wire)

| Proposed File Path | New/Modified | Purpose | Depends On | Risk Level | Test Coverage Needed | Notes |
|--------------------|--------------|---------|------------|------------|----------------------|-------|
| `src/features/onboarding/components/OnboardingRuntime.tsx` | **Modified** (wire from Phase 1 no-op) | Render react-joyride `<Joyride>` component with tour steps, custom tooltip, and callbacks. Read active tour from `useOnboardingTourController`. | `react-joyride`, `useOnboardingTourController.ts`, `OnboardingTooltip.tsx` | **Medium** | Component test: verify Joyride renders with correct steps, verify callback prop fires, verify tooltip renders, verify cleanup on unmount | Import Joyride as: `import Joyride from 'react-joyride'`. Pass `steps`, `run`, `stepIndex`, `callback`, `tooltipComponent`, `styles`, `continuous`, `showProgress`, `showSkipButton`, `disableOverlayClose`, `spotlightClicks`. Use `disableOverlayClose={true}` to prevent accidental dismissal. Use `spotlightClicks={true}` on steps where user should interact with the highlighted element. |
| `src/features/onboarding/components/OnboardingProvider.tsx` | **Modified** (wire from Phase 1 pass-through) | Provide `OnboardingContext` with live state and actions from `useOnboardingTourController`. | `useOnboardingTourController.ts`, `useOnboardingState.ts` | **Medium** | Component test: verify context value updates when tour starts/stops/completes, verify children re-render correctly | Wire the context value to the controller hook. |
| `src/features/onboarding/components/OnboardingTooltip.tsx` | **New** | Custom react-joyride tooltip component rendering design-system-compliant tooltips: SF Pro, 12px max, xs radius (3px), neutral palette (#292929/#5D5D5D/#7F7F7F), Phosphor icons for prev/next/close. | Design system tokens from `src/lib/ui/` | **Medium** (UX polish) | Component test: verify tooltip renders step content, verify prev/next/skip buttons work, verify close button works, verify design tokens match spec, verify Phosphor icons render | Implements react-joyride's `tooltipComponent` prop interface. Receives `step`, `primaryProps`, `tooltipProps`, `skipProps`, `backProps`, `closeProps`. Renders: step title, step content, progress indicator ("Step X of Y"), back button (CareLeft icon), skip button, next/complete button (primary). Close button (X icon) in top-right corner. |

---

### Phase 4: Persistence (Database + Server Actions)

#### Database Migration

| Proposed File Path | New/Modified | Purpose | Depends On | Risk Level | Test Coverage Needed | Notes |
|--------------------|--------------|---------|------------|------------|----------------------|-------|
| `supabase/migrations/XXXXXXXXXXXXXX_user_onboarding_tours.sql` | **New** | Create `user_onboarding_tours` table with columns: `id` (uuid, PK, default gen_random_uuid()), `user_id` (uuid, FK → auth.users, NOT NULL), `tour_key` (text, NOT NULL), `version` (integer, NOT NULL, default 1), `completed_at` (timestamptz, NOT NULL, default now()), `skipped` (boolean, NOT NULL, default false), `step_index_reached` (integer, nullable — last step reached if incomplete), `created_at` (timestamptz, default now()). Unique constraint on `(user_id, tour_key, version)`. RLS policies: SELECT (user can read own rows), INSERT (user can insert own rows), UPDATE (user can update own rows), DELETE (user can delete own rows — for replay). | Supabase CLI, existing migration numbering | **Medium** | Migration test: verify table exists, verify columns and types, verify unique constraint, verify RLS policies, verify FK to auth.users | Run `supabase migration new user_onboarding_tours` to generate the timestamped filename. Follow existing migration patterns in `supabase/migrations/`. RLS policy: `CREATE POLICY "Users can read own onboarding tours" ON user_onboarding_tours FOR SELECT USING (auth.uid() = user_id);` — replicate for INSERT, UPDATE, DELETE. Add `ALTER TABLE user_onboarding_tours ENABLE ROW LEVEL SECURITY;`. |
| `src/lib/supabase/types.ts` | **Modified** (auto-generated) | Regenerated Supabase types to include `user_onboarding_tours` table shape in the `Database` type | Migration applied to Supabase, `supabase gen types typescript` | **Low** | Type check: verify `user_onboarding_tours` is in generated types, verify column types are correct | Run `supabase gen types typescript --local > src/lib/supabase/types.ts` after migration is applied. This file is auto-generated — do NOT hand-edit. |

#### Server Actions + Repository

| Proposed File Path | New/Modified | Purpose | Depends On | Risk Level | Test Coverage Needed | Notes |
|--------------------|--------------|---------|------------|------------|----------------------|-------|
| `src/lib/onboarding/repository.ts` | **New** | Database query layer for `user_onboarding_tours`. Functions: `getCompletedTours(userId: string): Promise<TourCompletionRecord[]>`, `getTourCompletion(userId: string, tourKey: TourKey, version: number): Promise<TourCompletionRecord | null>`, `upsertTourCompletion(userId: string, tourKey: TourKey, version: number, data: Partial<TourCompletionRecord>): Promise<void>`, `deleteTourCompletion(userId: string, tourKey: TourKey, version: number): Promise<void>`. | Database migration, Supabase client | **Medium** | Repository test: verify `getCompletedTours` returns correct rows, verify `upsertTourCompletion` creates/updates, verify `deleteTourCompletion` removes row, verify RLS enforcement (test as different user) | Follows pattern from `src/lib/repositories/`. Uses `supabase.from('user_onboarding_tours').select/upsert/delete`. All functions receive `userId` as parameter (NEVER derive from client-side state — always server-authoritative). Uses `camelCase` column mapping via Supabase client config. |
| `src/lib/onboarding/actions.ts` | **New** | Server actions wrapping the repository. Functions: `markTourComplete(tourKey: TourKey, version: number): Promise<ActionResult>`, `markTourSkipped(tourKey: TourKey, version: number): Promise<ActionResult>`, `markTourStepReached(tourKey: TourKey, version: number, stepIndex: number): Promise<ActionResult>`, `resetTour(tourKey: TourKey, version: number): Promise<ActionResult>`. All use `requireCurrentUserContext()` for server-authority auth check. | `src/lib/onboarding/repository.ts`, `src/lib/auth/` (for `requireCurrentUserContext`) | **Medium** | Server action test: verify `markTourComplete` persists row, verify `markTourSkipped` sets skipped=true, verify `resetTour` deletes row, verify unauthorized access is rejected, verify revalidation | Follows pattern from `src/lib/*/actions.ts`. Uses `"use server"` directive. Calls `requireCurrentUserContext()` to get validated user ID. Wraps in try/catch returning `{ success: true }` or `{ error: string }`. Includes `revalidatePath` for any cache invalidation (though tours are not cached, this is future-proofing). |
| `src/features/onboarding/services/onboardingPersistence.ts` | **New** | Client-side service wrapping server actions. Provides a clean async interface for hooks/components: `saveTourCompletion(tourKey, version, completed)`, `saveTourSkipped(tourKey, version)`, `resetTourCompletion(tourKey, version)`, `getCompletedTours()`. | `src/lib/onboarding/actions.ts` | **Medium** | Service test: verify calls correct server action, verify handles success/error responses, verify error propagation | This is the ONLY file that imports server actions. Hooks and components import from here, not from `src/lib/onboarding/actions.ts` directly. This indirection allows mocking in tests and future analytics injection. |

#### Hook Wiring

| Proposed File Path | New/Modified | Purpose | Depends On | Risk Level | Test Coverage Needed | Notes |
|--------------------|--------------|---------|------------|------------|----------------------|-------|
| `src/features/onboarding/hooks/useOnboardingState.ts` | **Modified** (wire from Phase 3 skeleton) | Replace Phase 3 hardcoded stub with live Supabase query via `onboardingPersistence.getCompletedTours()`. Returns `{ completedTours: Map<TourKey, boolean>, isLoading, error, refetch }`. | `onboardingPersistence.ts` | **Medium** | Hook test: verify fetches on mount, verify returns correct completion state, verify loading state renders, verify error state renders, verify refetch works | Uses `useEffect` + `useState` (or TanStack `useQuery`). On mount, calls `onboardingPersistence.getCompletedTours()` and maps results to `Map<TourKey, boolean>`. Handles loading and error states. Provides `refetch` function for replay use case. |
| `src/features/onboarding/hooks/useOnboardingTourController.ts` | **Modified** (wire persistence) | Integrate `useOnboardingState` to check completion status before starting a tour. Call `onboardingPersistence.saveTourCompletion()` on tour end/skip. | `useOnboardingState.ts`, `onboardingPersistence.ts` | **Medium** | Hook test: verify does NOT start tour when completion row exists, verify calls `saveTourCompletion` on complete, verify calls `saveTourSkipped` on skip | Add guard: `if (completedTours.has(tourKey)) return;` before starting tour. On Joyride `callback` with `type === 'TOUR_END'` or `status === 'finished'`: call `onboardingPersistence.saveTourCompletion()`. On `action === 'skip'`: call `onboardingPersistence.saveTourSkipped()`. |

---

### Phase 5: UX Polish + Replay

#### Components

| Proposed File Path | New/Modified | Purpose | Depends On | Risk Level | Test Coverage Needed | Notes |
|--------------------|--------------|---------|------------|------------|----------------------|-------|
| `src/features/onboarding/components/OnboardingTooltip.tsx` | **Modified** (polish from Phase 3) | Final styling: SF Pro fonts (regular 11px body, medium 12px heading), xs radius (3px), neutral palette, Phosphor icons (regular weight, 16px), smooth transitions, responsive on mobile (max-width constraint), keyboard navigation support, ARIA labels | Design system spec (`src/lib/ui/` tokens) | **Medium** | Component test: verify visual snapshot, verify keyboard navigation (Tab through buttons, Enter to activate, Escape to dismiss), verify ARIA labels, verify mobile layout | Polish pass on the Phase 3 implementation. Add `role="dialog"`, `aria-label`, `aria-describedby` for accessibility. Ensure focus trap within tooltip (Tab cycles through back/skip/next/close). Add `transition` for tooltip entry/exit animation. |
| `src/features/onboarding/components/OnboardingReplayMenuItem.tsx` | **New** | Replay UI component. Renders a settings card or dropdown listing completed/skipped tours with a "Replay" button per tour. On click: calls `onboardingPersistence.resetTourCompletion(tourKey, version)` and navigates to the tour's route. | `onboardingPersistence.ts`, `tourRegistry.ts` | **Low** | Component test: verify renders list of completed tours, verify replay button calls reset and navigates, verify empty state when no tours completed, verify error state | Client component. Uses `useOnboardingState` to get completed tours list. Maps each to a row with tour name, completion date, and "Replay" button. Uses `useRouter` from `next/navigation` to navigate after reset. |

#### Settings Page Integration

| Proposed File Path | New/Modified | Purpose | Depends On | Risk Level | Test Coverage Needed | Notes |
|--------------------|--------------|---------|------------|------------|----------------------|-------|
| `src/app/workshop/settings/page.tsx` | **Modified** | Add "Onboarding Tours" settings card that renders `<OnboardingReplayMenuItem>`. | `OnboardingReplayMenuItem.tsx` | **Low** | DOM test: verify settings card renders, verify replay component inside card | Add a new settings card section. Place after existing settings entries. Guard behind feature flag: `if (!useOnboardingEnabled()) return null`. Title: "Onboarding Tours", description: "Replay guided tours to refamiliarize yourself with the workspace." |
| `src/app/workshop/settings/profile/page.tsx` | **Modified** (optional) | Alternative or additional replay entry point on the Profile page. | `OnboardingReplayMenuItem.tsx` | **Low** | DOM test: verify entry renders | If Settings hub is not the right place, Profile page is the fallback. Only ONE of these two pages should host the replay UI. Decision: Settings hub is preferred (it's the "configuration" surface); Profile is fallback. |

---

### Phase 6: Testing

#### Unit Tests

| Proposed File Path | New/Modified | Purpose | Depends On | Risk Level | Test Coverage Needed | Notes |
|--------------------|--------------|---------|------------|------------|----------------------|-------|
| `tests/vitest/onboarding/tourRegistry.test.ts` | **New** | Test: registry shape, unique keys, `getTourByRoute` returns correct tours, all registered tours have valid route/version/steps | `tourRegistry.ts` | **Low** | All registry functions tested, edge cases (unknown route, empty registry) | Vitest + jsdom. |
| `tests/vitest/onboarding/tourTargets.test.ts` | **New** | Test: all target constants are unique values, all match `ae-tour-` prefix, no reserved attribute names | `tourTargets.ts` | **Low** | 100% coverage of target constants | |
| `tests/vitest/onboarding/onboardingRoutes.test.ts` | **New** | Test: route-to-tour mapping is correct, no route maps to multiple tours unintentionally, public routes excluded | `tourRegistry.ts`, route definitions | **Low** | All route mappings verified | |
| `tests/vitest/onboarding/onboardingPersistence.test.ts` | **New** | Test: server actions create/update/delete rows, RLS enforcement, error handling, revalidation | `src/lib/onboarding/actions.ts`, `src/lib/onboarding/repository.ts` | **Medium** | Full CRUD coverage, RLS tests, error case tests | Requires Supabase test instance or mocked client. Use existing test patterns from `tests/vitest/` for server action testing (e.g., how project actions are tested). |
| `tests/vitest/onboarding/OnboardingRuntime.test.tsx` | **New** | Test: renders Joyride when flag on, renders null when flag off, renders correct steps, handles callbacks, cleanup on unmount | `OnboardingRuntime.tsx`, mock Joyride | **Medium** | All component states tested: loading, active, completed, error | Mock react-joyride. Test the wrapper behavior, not Joyride internals. |
| `tests/vitest/onboarding/OnboardingTooltip.test.tsx` | **New** | Test: renders step content, buttons work, close button works, design tokens match, Phosphor icons render, keyboard navigation | `OnboardingTooltip.tsx` | **Medium** | Visual structure tests, interaction tests, accessibility tests | Use React Testing Library. Test each button's onClick. Test keyboard events. Snapshot test for visual structure. |
| `tests/vitest/onboarding/useOnboardingState.test.ts` | **New** | Test: fetches completion state, loading state, error state, refetch | `useOnboardingState.ts`, mock `onboardingPersistence` | **Medium** | All hook states tested | Use `renderHook` from RTL. Mock the persistence layer. |
| `tests/vitest/onboarding/tourStateMachine.test.ts` | **New** | Test: tour lifecycle states (idle → running → step_advancing → completed/skipped), transition guards, invalid transition rejection | `useOnboardingTourController.ts` | **Medium** | All valid transitions, all invalid transitions rejected | Test the state machine logic in isolation. |

#### E2E Tests

| Proposed File Path | New/Modified | Purpose | Depends On | Risk Level | Test Coverage Needed | Notes |
|--------------------|--------------|---------|------------|------------|----------------------|-------|
| `e2e/onboarding-workspace-orientation.spec.ts` | **New** | E2E: Fresh account → login → see workspace orientation tour → complete all steps → verify tour marked complete → navigate away and back → verify tour does not re-trigger | Full MVP implementation, Playwright, Supabase test user, `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=true` | **Medium** | Happy path: complete tour. Skip path: skip tour. Verify: tour does not re-trigger. Verify: `user_onboarding_tours` row exists. | Use Playwright with a dedicated test user. Create user via Supabase auth helpers. Verify Joyride tooltips appear in correct order. Verify spotlight highlights correct elements. |
| `e2e/onboarding-project-creation.spec.ts` | **New** | E2E: After workspace orientation → navigate to projects → project creation tour → create project → verify tour completes → verify project exists | Phase 2 implementation, Playwright | **Medium** | Full project creation tour flow including modal interaction | Phase 6 (testing for Phase 2 features). |
| `e2e/onboarding-estimate-sheet.spec.ts` | **New** | E2E: After project creation → navigate to estimates → estimate sheet tour → interact with tree/table/sidebar → verify tour completes | Phase 3 implementation, Playwright | **Medium-High** | Full estimate sheet tour flow including dynamic import wait | Phase 6 (testing for Phase 3 features). Tough test: must wait for dynamic imports and React Complex Tree rendering. Use generous timeouts. |

---

### Phase 7: Rollout + Documentation

| Proposed File Path | New/Modified | Purpose | Depends On | Risk Level | Test Coverage Needed | Notes |
|--------------------|--------------|---------|------------|------------|----------------------|-------|
| `README.md` | **Modified** | Add "Onboarding Tours" entry to the features table in the project README. Status: "Available (feature-flagged)" after rollout. | All implementation complete | **Low** | None | Add row: `\| Guided onboarding tours (React Joyride) \| Available (behind NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED) \|` |

---

## Complete File Inventory by Phase

### Phase 1: 10 files (7 new, 3 modified)

| # | File | Action |
|---|------|--------|
| 1 | `package.json` | Modified |
| 2 | `src/features/onboarding/types/onboarding.ts` | New |
| 3 | `src/features/onboarding/types/index.ts` | New |
| 4 | `src/features/onboarding/index.ts` | New |
| 5 | `src/features/onboarding/config/tourTargets.ts` | New |
| 6 | `src/features/onboarding/config/tourRegistry.ts` | New |
| 7 | `src/features/onboarding/config/firstWorkspaceOrientationTour.ts` | New |
| 8 | `src/features/onboarding/components/OnboardingRuntime.tsx` | New (no-op) |
| 9 | `src/features/onboarding/components/OnboardingProvider.tsx` | New (pass-through) |
| 10 | `src/features/onboarding/hooks/useOnboardingEnabled.ts` | New |
| 11 | `.env.example` | Modified |

### Phase 2: 4 files (0 new, 4 modified)

| # | File | Action |
|---|------|--------|
| 1 | `src/components/sidebar/SidebarNavItemRow.tsx` | Modified |
| 2 | `src/components/sidebar/MainSidebar.tsx` | Modified |
| 3 | `src/components/workshop/WorkshopPageShell.tsx` | Modified |
| 4 | `src/components/workshop/WorkshopHomebaseClient.tsx` | Modified |

### Phase 3: 8 files (3 new, 5 modified)

| # | File | Action |
|---|------|--------|
| 1 | `src/features/onboarding/hooks/useMountedTourTargets.ts` | New |
| 2 | `src/features/onboarding/hooks/useOnboardingTourController.ts` | New |
| 3 | `src/features/onboarding/hooks/useOnboardingState.ts` | New (stub) |
| 4 | `src/features/onboarding/components/OnboardingTooltip.tsx` | New |
| 5 | `src/features/onboarding/config/tourRegistry.ts` | Modified (fill) |
| 6 | `src/features/onboarding/config/firstWorkspaceOrientationTour.ts` | Modified (fill) |
| 7 | `src/features/onboarding/components/OnboardingRuntime.tsx` | Modified (wire) |
| 8 | `src/features/onboarding/components/OnboardingProvider.tsx` | Modified (wire) |

### Phase 4: 5 files (3 new, 2 modified)

| # | File | Action |
|---|------|--------|
| 1 | `supabase/migrations/XXXXXXXXXXXXXX_user_onboarding_tours.sql` | New |
| 2 | `src/lib/onboarding/repository.ts` | New |
| 3 | `src/lib/onboarding/actions.ts` | New |
| 4 | `src/features/onboarding/services/onboardingPersistence.ts` | New |
| 5 | `src/lib/supabase/types.ts` | Modified (auto) |
| 6 | `src/features/onboarding/hooks/useOnboardingState.ts` | Modified (wire) |
| 7 | `src/features/onboarding/hooks/useOnboardingTourController.ts` | Modified (wire persistence) |

### Phase 5: 3 files (1 new, 2 modified)

| # | File | Action |
|---|------|--------|
| 1 | `src/features/onboarding/components/OnboardingReplayMenuItem.tsx` | New |
| 2 | `src/features/onboarding/components/OnboardingTooltip.tsx` | Modified (polish) |
| 3 | `src/app/workshop/settings/page.tsx` | Modified |

### Phase 2+ (Later Phases): 9 files (0 new, 9 modified)

| # | File | Action | Phase |
|---|------|--------|-------|
| 1 | `src/components/workshop/projects-page-client.tsx` | Modified | Phase 2 |
| 2 | `src/components/workshop/LiveProjectCard.tsx` | Modified | Phase 2 |
| 3 | `src/components/workshop/NewProjectModal.tsx` | Modified | Phase 2 |
| 4 | `src/components/workshop/NewProjectFormSections.tsx` | Modified | Phase 2 |
| 5 | `src/components/workshop/ProjectDashboardClient.tsx` | Modified | Phase 2 |
| 6 | `src/components/workshop/ProjectEstimatesClient.tsx` | Modified | Phase 3 |
| 7 | `src/components/workshop/ProjectEstimatesTable.tsx` | Modified | Phase 3 |
| 8 | `src/components/workshop/EstimateSheetTree.tsx` | Modified | Phase 3 |
| 9 | `src/components/workshop/EstimateSheetContent.tsx` | Modified | Phase 3 |
| 10 | `src/components/workshop/LibraryPageClient.tsx` | Modified | Phase 4 |

### Phase 6 (Tests): 11 files (all new)

| # | File | Action |
|---|------|--------|
| 1 | `tests/vitest/onboarding/tourRegistry.test.ts` | New |
| 2 | `tests/vitest/onboarding/tourTargets.test.ts` | New |
| 3 | `tests/vitest/onboarding/onboardingRoutes.test.ts` | New |
| 4 | `tests/vitest/onboarding/onboardingPersistence.test.ts` | New |
| 5 | `tests/vitest/onboarding/OnboardingRuntime.test.tsx` | New |
| 6 | `tests/vitest/onboarding/OnboardingTooltip.test.tsx` | New |
| 7 | `tests/vitest/onboarding/useOnboardingState.test.ts` | New |
| 8 | `tests/vitest/onboarding/tourStateMachine.test.ts` | New |
| 9 | `e2e/onboarding-workspace-orientation.spec.ts` | New |
| 10 | `e2e/onboarding-project-creation.spec.ts` | New |
| 11 | `e2e/onboarding-estimate-sheet.spec.ts` | New |

### Phase 7 (Documentation): 1 file (1 modified)

| # | File | Action |
|---|------|--------|
| 1 | `README.md` | Modified |

### Grand Total

| Category | Count |
|----------|-------|
| New files (all phases) | 24 |
| Modified files — existing components (Phase 2-4) | 14 |
| Modified files — onboarding feature (Phase 3-5) | 7 |
| Modified files — config/package/env | 3 |
| **Total files touched** | **48** |
| **Total new files** | **24** |
| **Total modified files** | **19** (14 existing + 5 onboarding feature fill-ins) |

---

## File Creation Order (Implementation Agent Checklist)

### Phase 1 (Must create in this order)

1. `bun add react-joyride` — package install
2. `src/features/onboarding/types/onboarding.ts` — types first (everything depends on types)
3. `src/features/onboarding/types/index.ts` — type barrel
4. `src/features/onboarding/hooks/useOnboardingEnabled.ts` — simple hook, no dependencies
5. `src/features/onboarding/config/tourTargets.ts` — target constants (depends on nothing)
6. `src/features/onboarding/config/tourRegistry.ts` — registry (depends on types)
7. `src/features/onboarding/config/firstWorkspaceOrientationTour.ts` — tour steps (depends on targets + types)
8. `src/features/onboarding/components/OnboardingRuntime.tsx` — runtime (no-op, depends on nothing)
9. `src/features/onboarding/components/OnboardingProvider.tsx` — provider (pass-through, depends on types)
10. `src/features/onboarding/index.ts` — barrel (depends on everything above)
11. `.env.example` — add flag

### Phase 2 (Must modify in this order — target markers)

1. `SidebarNavItemRow.tsx` — add `tourTarget` prop first (other sidebar items depend on it)
2. `MainSidebar.tsx` — pass targets to nav items
3. `WorkshopHomebaseClient.tsx` — add targets to homebase cards
4. `WorkshopPageShell.tsx` — add shell target + mount OnboardingRuntime (LAST — only after all targets exist)

### Phase 3 (Must create/modify in this order — wire the tour)

1. `useMountedTourTargets.ts` — target detection hook (dependency for controller)
2. `useOnboardingTourController.ts` — controller hook (depends on target detection)
3. `useOnboardingState.ts` — state hook (stub, needed by controller)
4. `OnboardingTooltip.tsx` — tooltip component (needed by runtime)
5. `tourRegistry.ts` — fill with tour registration
6. `firstWorkspaceOrientationTour.ts` — fill with step definitions
7. `OnboardingRuntime.tsx` — wire Joyride rendering
8. `OnboardingProvider.tsx` — wire context

### Phase 4 (Must create in this order — persistence)

1. Migration SQL — database table (everything depends on the table existing)
2. `src/lib/onboarding/repository.ts` — data access (depends on table)
3. `src/lib/onboarding/actions.ts` — server actions (depends on repository)
4. `src/lib/supabase/types.ts` — regenerate types
5. `src/features/onboarding/services/onboardingPersistence.ts` — client service (depends on actions)
6. `useOnboardingState.ts` — wire from stub to live (depends on persistence service)
7. `useOnboardingTourController.ts` — wire persistence (depends on state hook + persistence service)

---

## Risk Summary by File

| Risk Level | Files |
|------------|-------|
| **None** | `package.json`, `.env.example`, `src/features/onboarding/types/*`, `src/features/onboarding/index.ts`, `useOnboardingEnabled.ts`, `SidebarNavItemRow.tsx`, `MainSidebar.tsx`, `README.md` |
| **Low** | `tourTargets.ts`, `tourRegistry.ts`, `firstWorkspaceOrientationTour.ts`, `useMountedTourTargets.ts`, `OnboardingReplayMenuItem.tsx`, all test files, settings page modifications |
| **Medium** | `OnboardingRuntime.tsx`, `OnboardingProvider.tsx`, `OnboardingTooltip.tsx`, `useOnboardingTourController.ts`, `useOnboardingState.ts`, `onboardingPersistence.ts`, `WorkshopPageShell.tsx`, `WorkshopHomebaseClient.tsx`, migration SQL, repository, server actions, `supabase/types.ts`, all later-phase existing component modifications |
| **Medium-High** | None at file level (risk is at the surface/behavior level — see `04_implementation_matrix.md` for surfaces 7-10) |

---

## Verification Gate Per Phase

### Phase 1 Verification

```bash
# Verify no build breakage
bun run build

# Verify feature folder structure
ls src/features/onboarding/types/onboarding.ts
ls src/features/onboarding/config/tourTargets.ts
ls src/features/onboarding/components/OnboardingRuntime.tsx

# Verify no onboarding code in public routes
grep -r "onboarding\|data-tour\|react-joyride" src/app/\(page\|about\|features\|pricing\|contact\|privacy\|terms\|login\|share\|invite\|auth\)/ && echo "FAIL: onboarding code leaked to public routes" || echo "PASS"

# Verify feature flag default is off
grep "NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED" .env.example | grep "false"
```

### Phase 2-3 Verification

```bash
# Type check
bun run type-check

# Lint
bun run lint

# DOM tests
bun run test:dom

# Build (verify no Joyride in public chunks)
bun run build

# Verify all data-tour targets in Phase 2 are additive (no removed elements)
git diff main -- src/components/ | grep "^-" | grep -v "import\|//" | grep -v "^---" | grep -v "^$"
```

### Phase 4 Verification

```bash
# Apply migration
supabase migration up

# Verify table
supabase db dump --data-only | grep user_onboarding_tours

# Run persistence tests
bun run test:dom -- onboardingPersistence

# Verify RLS
# (Manual test: create user A, insert row as user A, try to read as user B — should fail)
```

### Phase 5-7 Verification

```bash
# Full gate
bun run validate
bun run build
bun run test:e2e -- onboarding
```

---

## Related Documents

- `04_implementation_matrix.md` — what surfaces get tours and why
- `03_tour_registry_and_target_system.md` — tour key constants and data-tour system design
- `04_architecture_and_component_tree.md` — component hierarchy and data flow
- `06_persistence_and_supabase_schema.md` — database schema details and RLS policies
- `07_feature_flag_and_lazy_loading.md` — feature flag and dynamic import strategy
- `13_blast_radius_and_rollback.md` — risk assessment and rollback plan per phase
- `14_test_strategy.md` — detailed test strategy and coverage targets
