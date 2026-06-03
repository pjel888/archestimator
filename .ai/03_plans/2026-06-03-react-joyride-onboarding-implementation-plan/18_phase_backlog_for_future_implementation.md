# 18 — Phase Backlog for Future Implementation

> React Joyride onboarding tours for Archestimator workspace
> Status: implementation-ready after Phase 0 review
> Date: 2026-06-03

---

## How To Use This Backlog

Each phase is a self-contained implementation unit with explicit entry criteria (what must be true before starting), file lists, task sequences, acceptance criteria, tests, risks, and rollback instructions. Phases are sequential — each depends on the previous phase being complete and verified.

**Before starting ANY phase:** Verify `git status --short --branch` confirms `main` branch. Read `.ai/10_state/current-state.md` for any project state changes since this plan was written.

**At end of each phase:** Run `bun run validate` (type-check + lint + design-system + unit + dom). Run `bun run build`. Commit with the phase number and summary in the commit message.

---

## Phase 0: Review and Approve Plan

**Entry criteria:** All 20 planning documents drafted in `2026-06-03-react-joyride-onboarding-implementation-plan/` folder.

**Goal:** Human stakeholders review all planning docs, make decisions on open questions, and give explicit go/no-go for Phase 1.

### Tasks

- [ ] Product owner reads executive summary (`00_executive_summary.md`), UX analysis (`09_ui_ux_analysis.md`), and copywriting plan (`10_copywriting_and_step_content.md`)
- [ ] Product owner decides MVP tour scope: Workspace Orientation only, or multi-tour (Q1 in `17_risks_decisions_and_open_questions.md`)
- [ ] Design + Product Owner decide custom tooltip timing: Phase 5 vs Phase 3 (Q2)
- [ ] Product Owner decides mobile tour strategy: defer or conditionally support (Q3)
- [ ] Product Owner approves feature flag name: `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED`
- [ ] Product Owner approves persistence schema: `user_onboarding_tours` table (per `08_database_and_persistence_plan.md`)
- [ ] Product Owner reviews and approves tour copy (per `10_copywriting_and_step_content.md`)
- [ ] Architect reviews blast radius analysis (`14_blast_radius_analysis.md`) and confirms no architectural concerns
- [ ] Security lead reviews `12_security_and_privacy_analysis.md` and approves RLS design
- [ ] Record all decisions in the Decision Log (`17_risks_decisions_and_open_questions.md`)

### Acceptance Criteria

- [ ] All blocking open questions have recorded answers
- [ ] MVP scope locked and documented
- [ ] Explicit "go" recorded for Phase 1 start
- [ ] Decision Log populated with D01-D08 entries
- [ ] No unresolved HIGH-severity risks with unverified mitigation

### Risks

- Decision paralysis (too many choices, no owner)
- Scope creep ("let's do all four tours in MVP")
- Missing stakeholder availability (construction professionals have day jobs)

### Rollback

N/A — no code changes. If plan is rejected, archive this entire planning folder to `.ai/09_archive/store/`.

---

## Phase 1: Package and Architecture Skeleton

**Entry criteria:** Phase 0 complete. All blocking decisions recorded. Explicit "go" from Product Owner.

**Goal:** Install `react-joyride`, create `src/features/onboarding/` folder structure, add no-op runtime. Zero user-visible behavior. Fully reversible.

### Files to Create

| File | Purpose |
|------|---------|
| `src/features/onboarding/types/onboarding.ts` | TypeScript types: `TourStep`, `TourDefinition`, `OnboardingState`, `TourStatus`, `TourKey` |
| `src/features/onboarding/config/tourTargets.ts` | Centralized `data-tour` attribute string constants (see `07_tour_registry_and_targeting_plan.md` for full list) |
| `src/features/onboarding/config/tourRegistry.ts` | Route → tour mapping, feature flag check, tour lookup by route |
| `src/features/onboarding/components/OnboardingRuntime.tsx` | Client-only wrapper: dynamic import of Joyride, feature flag gate, renders `null` when flag is off |
| `src/features/onboarding/services/onboardingEvents.ts` | No-op analytics abstraction: structured event signatures, `console.log` in dev, silent in prod |

### Files to Modify

| File | Change | Rationale |
|------|--------|-----------|
| `package.json` | Add `react-joyride` dependency | Core library for tour system |
| `bun.lock` | Auto-updated by `bun add` | Lockfile consistency |
| `.env.example` | Add `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=false` | Document the feature flag for future developers |

### Tasks

1. **Install Joyride:** `bun add react-joyride`
2. **Create folder structure:**
   ```bash
   mkdir -p src/features/onboarding/{components,config,hooks,services,types}
   ```
3. **Define TypeScript types** in `src/features/onboarding/types/onboarding.ts`:
   - `TourKey` — branded string type with version suffix (e.g., `"workspace.orientation.v1"`)
   - `TourStep` — Joyride step shape extended with `requiresMount?: boolean`
   - `TourDefinition` — tour key, version, route pattern, steps array, metadata
   - `OnboardingState` — per-user tour state: status, current step, timestamps
   - `TourStatus` — `'not_started' | 'started' | 'completed' | 'skipped'`
4. **Define tour target constants** in `src/features/onboarding/config/tourTargets.ts`:
   - `SIDEBAR_WORKSHOP = "sidebar.workshop"`
   - `SIDEBAR_PROJECTS = "sidebar.projects"`
   - `SIDEBAR_LIBRARY = "sidebar.library"`
   - `SIDEBAR_TEMPLATES = "sidebar.templates"`
   - `SIDEBAR_SETTINGS = "sidebar.settings"`
   - `HOMEBASE_DESTINATIONS = "homebase.destinations"`
   - `HOMEBASE_PROJECTS_TILE = "homebase.projects"`
   - `HOMEBASE_LIBRARY_TILE = "homebase.library"`
   - `HOMEBASE_TEMPLATES_TILE = "homebase.templates"`
   - `WORKSHOP_SHELL_TITLE = "workshop.shell.title"`
   - `WORKSHOP_CONTENT_AREA = "workshop.shell.content"`
   - Export as a `const` object for type-safe usage.
5. **Create tour registry** in `src/features/onboarding/config/tourRegistry.ts`:
   - `isOnboardingEnabled(): boolean` — reads `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED` env var
   - `getTourForRoute(route: string): TourDefinition | null` — maps route patterns to tours
   - Empty tour map initially (no tours registered until Phase 2)
6. **Create no-op OnboardingRuntime** in `src/features/onboarding/components/OnboardingRuntime.tsx`:
   ```tsx
   "use client";
   import dynamic from "next/dynamic";
   import { isOnboardingEnabled } from "../config/tourRegistry";

   const JoyrideRuntime = dynamic(
     () => import("./JoyrideRuntimeInner"),
     { ssr: false }
   );

   export function OnboardingRuntime() {
     if (!isOnboardingEnabled()) return null;
     // Phase 3: return <JoyrideRuntime />;
     return null;
   }
   ```
7. **Create no-op onboardingEvents** in `src/features/onboarding/services/onboardingEvents.ts`:
   - Structured event signatures: `tourStarted`, `stepAdvanced`, `stepSkipped`, `tourCompleted`, `tourSkipped`, `targetNotFound`
   - `console.log` in development (`process.env.NODE_ENV === 'development'`)
   - Silent in production
8. **Update `.env.example`:** Add line `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=false`
9. **Verify:**
   ```bash
   bun run type-check     # Must pass — catch any TypeScript errors in new files
   bun run build          # Must succeed — Joyride should not be in bundle
   ANALYZE=true bun run build  # Verify Joyride NOT in public route bundles
   ```

### Acceptance Criteria

- [ ] `bun add react-joyride` completes without errors
- [ ] `bun run type-check` passes with zero errors in new files
- [ ] `bun run build` succeeds with no warnings
- [ ] `ANALYZE=true bun run build` confirms `react-joyride` does NOT appear in public route bundles (landing, login, about, pricing, contact)
- [ ] No runtime behavior changes — app runs identically to before Phase 1
- [ ] No test failures (`bun run test && bun run test:dom`)
- [ ] `src/features/onboarding/` folder structure matches the architecture plan (`03_recommended_architecture.md`)

### Tests

- `bun run type-check` — validates all new type definitions
- No runtime tests needed (all components are no-ops)

### Risks

- **Package compatibility** (Risk 1 in `17_risks_decisions_and_open_questions.md`): If `react-joyride` fails to install or causes build errors in React 19.2 / Next.js 16.2, stop Phase 1 here. Evaluate alternatives before proceeding.
- **Bundle leak**: If Joyride appears in public bundles despite `dynamic` import, investigate Next.js tree-shaking configuration.

### Rollback

```bash
bun remove react-joyride       # Remove package
rm -rf src/features/onboarding/  # Delete feature folder
git checkout .env.example        # Revert env example
git checkout package.json        # Revert dependency change
```

---

## Phase 2: Target Markers (MVP)

**Entry criteria:** Phase 1 complete. Phase 0 decisions recorded (especially MVP tour scope). `react-joyride` confirmed compatible.

**Goal:** Add stable `data-tour` attributes to MVP workspace surfaces. Zero behavior change. Attributes are inert data annotations only.

### Files to Modify

| File | Change |
|------|--------|
| `src/components/sidebar/MainSidebar.tsx` | Add `data-tour` attributes to each `SidebarNavItemRow` (lines 46-52) using the `tourTarget` prop pattern |
| `src/components/sidebar/SidebarNavItemRow.tsx` | Add optional `tourTarget?: string` prop, spread `data-tour={tourTarget}` onto the `<Link>` element (line 39) |
| `src/components/sidebar/sidebar-types.ts` | Add `tourTarget?: string` to the `SidebarNavItem` type |
| `src/components/workshop/WorkshopPageShell.tsx` | Add `data-tour={TOUR_TARGETS.WORKSHOP_CONTENT_AREA}` to the main content wrapper (line ~105 area) |
| `src/components/workshop/WorkshopHomebaseClient.tsx` | Add `data-tour` attributes to destination tile elements (the `destinations` array at line 55, rendered in the bento grid) |
| `src/features/onboarding/config/tourTargets.ts` | Finalize all target constants (may add homebase-specific targets) |
| `src/features/onboarding/config/firstWorkspaceOrientationTour.ts` | Create tour step definitions for Workspace Orientation (5 steps, using targets from `tourTargets.ts`) |

### Task Sequence

1. **Extend `SidebarNavItem` type** in `src/components/sidebar/sidebar-types.ts`:
   ```ts
   export type SidebarNavItem = {
     // ... existing fields
     tourTarget?: string;
   };
   ```
2. **Update `SidebarNavItemRow`** (`src/components/sidebar/SidebarNavItemRow.tsx`):
   - Add `tourTarget?: string` to the component props type
   - Spread `data-tour={tourTarget}` on the outer `<Link>` element (line 39 area)
   - Only render the attribute if `tourTarget` is defined
3. **Add tour targets to `MainSidebar`** (`src/components/sidebar/MainSidebar.tsx`):
   - Import `TOUR_TARGETS` from `@/features/onboarding/config/tourTargets`
   - Add `tourTarget` to each nav item definition (lines 31-52):
     - Workshop: `tourTarget: TOUR_TARGETS.SIDEBAR_WORKSHOP`
     - Projects: `tourTarget: TOUR_TARGETS.SIDEBAR_PROJECTS`
     - Library: `tourTarget: TOUR_TARGETS.SIDEBAR_LIBRARY`
     - Templates: `tourTarget: TOUR_TARGETS.SIDEBAR_TEMPLATES`
     - Settings: `tourTarget: TOUR_TARGETS.SIDEBAR_SETTINGS`
4. **Add tour target to `WorkshopPageShell`** (`src/components/workshop/WorkshopPageShell.tsx`):
   - Import `TOUR_TARGETS`
   - Add `data-tour={TOUR_TARGETS.WORKSHOP_SHELL_TITLE}` to the `WorkshopTitleHeader` area
   - Add `data-tour={TOUR_TARGETS.WORKSHOP_CONTENT_AREA}` to the main content `<main>` element
5. **Add tour targets to `WorkshopHomebaseClient`** (`src/components/workshop/WorkshopHomebaseClient.tsx`):
   - Import `TOUR_TARGETS`
   - Add `data-tour` to the destination tile wrapper (lines 55-64 `destinations` array render)
   - Individual tile targets: `TOUR_TARGETS.HOMEBASE_PROJECTS_TILE`, `TOUR_TARGETS.HOMEBASE_LIBRARY_TILE`, `TOUR_TARGETS.HOMEBASE_TEMPLATES_TILE`
6. **Create tour definition** in `src/features/onboarding/config/firstWorkspaceOrientationTour.ts`:
   - 5 steps covering: (1) Page title/overview, (2) Sidebar navigation, (3) Homebase tiles, (4) Projects destination, (5) Content area
   - Each step references a `target` from `TOUR_TARGETS`
   - Each step has `content` (title + body placeholder — real copy in Phase 5)
   - Step `placement` values (e.g., `"right"` for sidebar, `"bottom"` for tiles, `"center"` for shell)
7. **Verify:**
   ```bash
   bun run type-check    # Catches invalid tourTarget references
   bun run build         # No build errors from new attributes
   bun run dev           # Visual check: inspect element, confirm data-tour attributes appear
   ```

### Acceptance Criteria

- [ ] All MVP targets have `data-tour` attributes in the DOM (verify via DevTools)
- [ ] No visual changes — `data-tour` attributes are invisible to users
- [ ] No TypeScript errors — invalid `tourTarget` values caught by compiler
- [ ] `SidebarNavItemRow` gracefully handles `tourTarget` being `undefined` (no attribute rendered)
- [ ] `bun run build` succeeds
- [ ] No test failures from existing component tests (attributes are inert)

### Tests

- **TypeScript compilation test:** Attempt to pass an invalid string to `tourTarget` — should fail at type-check
- **DOM snapshot test:** Render `MainSidebar` in Vitest jsdom, verify `data-tour` attributes on expected elements
- **Tour target uniqueness test:** Verify no two targets share the same string value (static analysis of `tourTargets.ts`)

### Risks

- **VERY LOW.** Attributes are inert HTML data attributes. No runtime behavior. No visual changes. The only risk is accidentally placing a `data-tour` attribute that breaks an existing CSS selector, which is extremely unlikely (Archestimator doesn't use `data-*` selectors in styles).

### Rollback

```bash
git checkout src/components/sidebar/MainSidebar.tsx
git checkout src/components/sidebar/SidebarNavItemRow.tsx
git checkout src/components/sidebar/sidebar-types.ts
git checkout src/components/workshop/WorkshopPageShell.tsx
git checkout src/components/workshop/WorkshopHomebaseClient.tsx
rm src/features/onboarding/config/firstWorkspaceOrientationTour.ts
```

---

## Phase 3: Runtime and Route-Aware Tour Controller

**Entry criteria:** Phase 2 complete. All targets placed. Tour definition written.

**Goal:** Implement the client-only Joyride runtime. Workspace Orientation tour is playable behind the feature flag. Handles route changes, missing targets, skip, and complete.

### Files to Create

| File | Purpose |
|------|---------|
| `src/features/onboarding/components/OnboardingProvider.tsx` | React context providing tour state + control methods to children |
| `src/features/onboarding/components/JoyrideRuntimeInner.tsx` | The actual Joyride renderer (separate from `OnboardingRuntime` for clean dynamic import boundary) |
| `src/features/onboarding/hooks/useOnboardingTourController.ts` | State machine: not_started → started → (completed | skipped). Controls step progression, skip, dismiss. |
| `src/features/onboarding/hooks/useMountedTourTargets.ts` | Watches for target DOM availability via MutationObserver or RAF polling. Returns list of found/missing targets. Configurable timeout. |

### Files to Modify

| File | Change |
|------|--------|
| `src/features/onboarding/components/OnboardingRuntime.tsx` | Activate the dynamic Joyride import (uncomment line from Phase 1 skeleton). Add auth check (only render for authenticated users). |
| `src/features/onboarding/config/tourRegistry.ts` | Wire up actual tour lookup — `getTourForRoute()` now returns `firstWorkspaceOrientationTour`. |
| `src/components/workshop/WorkshopPageShell.tsx` | Import and render `<OnboardingRuntime />` inside the client boundary (inside the `Suspense` wrapper, after the main content). |

### Task Sequence

1. **Implement `useMountedTourTargets` hook** (`src/features/onboarding/hooks/useMountedTourTargets.ts`):
   - Accept: array of target selector strings, timeout (ms)
   - Return: `{ ready: boolean, missingTargets: string[], allReady: boolean }`
   - Use `MutationObserver` to detect when targets appear in DOM
   - Fallback: `requestAnimationFrame` polling every 100ms
   - After timeout (default 5000ms): resolve with `allReady: false`, log missing targets
   - Clean up observer on unmount
2. **Implement `useOnboardingTourController` hook** (`src/features/onboarding/hooks/useOnboardingTourController.ts`):
   - Manages tour lifecycle: init → step progression → skip → complete
   - Handles state transitions: `not_started → started → (completed | skipped)`
   - Exposes: `startTour()`, `nextStep()`, `prevStep()`, `skipTour()`, `dismissTour()`
   - Integrates with `useMountedTourTargets` — pauses if targets not ready
   - Handles route change: if `usePathname()` no longer matches the tour's route pattern, pause the tour
3. **Implement `OnboardingProvider`** (`src/features/onboarding/components/OnboardingProvider.tsx`):
   - Wraps children in React Context providing controller methods and tour state
   - Reads initial state from `useOnboardingTourController`
   - Handles reduced motion preference detection (match `MainSidebar.tsx` lines 74-76 pattern):
     ```ts
     const prefersReducedMotion = typeof window !== "undefined"
       ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
       : false;
     ```
4. **Implement `JoyrideRuntimeInner`** (`src/features/onboarding/components/JoyrideRuntimeInner.tsx`):
   - Imports `Joyride` from `react-joyride`
   - Reads current tour from registry based on route
   - Uses `OnboardingProvider` context for state
   - Applies style overrides for Archestimator design system:
     - `fontFamily: "SF Pro, -apple-system, sans-serif"`
     - `textColor: "#292929"` (neutral primary)
     - `borderRadius: 3` (xs radius)
     - `zIndex: 101` (above sidebar z-100)
     - `overlayColor: "rgba(41, 41, 41, 0.5)"` (neutral overlay)
   - Handles Joyride callbacks:
     - `callback({ action, index, type, status })` → delegate to controller
     - On `action: "skip"` → `controller.skipTour()`
     - On `status: "finished"` → `controller.completeTour()`
     - On `type: "step:after"` → advance step, log event
   - Handles `prefersReducedMotion` — disable spotlight animation, beacon pulse
   - Handles missing target callback — if `useMountedTourTargets` reports missing, skip step gracefully
5. **Activate `OnboardingRuntime`** (`src/features/onboarding/components/OnboardingRuntime.tsx`):
   - Add auth check: import `useAuthUser` or equivalent from Supabase auth helpers
   - Only render JoyrideRuntimeInner if: flag ON + user authenticated + on a tour-mapped route
   - Wrap in ErrorBoundary: if Joyride crashes, catch the error and render nothing (don't break workspace)
6. **Wire into `WorkshopPageShell`** (`src/components/workshop/WorkshopPageShell.tsx`):
   - Inside the `Suspense` boundary (after children), add:
     ```tsx
     {isAskFlipUiEnabled() ? <AskFlipFooterAssistant /> : null}
     {/* ADD: */}
     <OnboardingRuntime />
     ```
   - The `OnboardingRuntime` component handles its own auth + flag checks
7. **Style Joyride tooltip** (basic pass):
   - Override `button` styles: use Archestimator's neutral palette for Next/Back/Skip buttons
   - Override `beacon` styles: smaller, neutral color, no animation if reduced motion
   - Override `overlay` styles: neutral dark overlay matching Archestimator's surface colors
8. **Verify:**
   ```bash
   bun run type-check
   bun run build
   ```
   Then manual test:
   - Set `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=true`
   - Log in as fresh user → navigate to `/workshop`
   - Tour should auto-start → verify all 5 steps show correct targets
   - Click "Skip" → tour dismisses
   - Refresh → tour does NOT restart (if persistence wired, Phase 4)
   - Log in as different user → tour starts fresh (if persistence wired)
   - Set flag to `false` → tour does NOT appear

### Acceptance Criteria

- [ ] Workspace Orientation tour runs on `/workshop` when flag is `true` AND user is authenticated
- [ ] All 5 steps display with correct targets highlighted
- [ ] Skip button dismisses tour immediately
- [ ] Tour only runs when authenticated + on `/workshop` route
- [ ] Tour does NOT run on public routes (`/`, `/login`, `/about`, etc.)
- [ ] Route change (e.g., `/workshop/projects`) pauses/dismisses tour gracefully
- [ ] Target not found after 5s timeout: skip step, log warning, continue
- [ ] `prefers-reduced-motion`: no spotlight animations, no beacon pulse, instant step transitions
- [ ] Joyride crash (if any) does not crash `WorkshopPageShell`
- [ ] `bun run build` succeeds with flag ON and OFF

### Tests

- **Vitest component tests:** Render `OnboardingRuntime` with different flag/auth states; assert it renders `null` when conditions not met
- **Vitest DOM tests:** Render `OnboardingProvider` + `JoyrideRuntimeInner` with mock Joyride; test step transitions
- **Hook tests:** `useOnboardingTourController` state machine transitions; `useMountedTourTargets` timeout behavior; route change detection
- **Integration tests:** Full tour flow with mocked targets; verify skip/complete callbacks fire correctly

### Risks

- **Joyride integration issues** — unexpected React 19 behavior, callback timing, or DOM manipulation conflicts
- **Z-index conflicts** — sidebar (z-100) overlaps Joyride tooltip (z-101) on edge cases (expanded sidebar on mobile overlay)
- **Route change race condition** — user navigates mid-step, Joyride tries to highlight unmounted target

### Rollback

Set `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=false`. Remove `<OnboardingRuntime />` from `WorkshopPageShell.tsx`. Revert `OnboardingRuntime.tsx` to no-op state. All other files remain inert.

---

## Phase 4: Persistence

**Entry criteria:** Phase 3 complete. Tour is playable. Need persistence to prevent re-show.

**Goal:** Persist tour completion/skip state to Supabase so users don't see tours they've already completed.

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/XXXXXXXXXXXXXX_user_onboarding_tours.sql` | Migration: create `user_onboarding_tours` table with RLS policies |
| `src/lib/onboarding/actions.ts` | Server actions: `getUserOnboardingTours`, `upsertOnboardingTourState` |
| `src/lib/onboarding/repository.ts` | Data access layer for tour state (wraps Supabase queries) |
| `src/features/onboarding/hooks/useOnboardingState.ts` | TanStack Query hook: fetch tour state, provide mutation for upsert |

### Files to Modify

| File | Change |
|------|--------|
| `src/features/onboarding/components/OnboardingRuntime.tsx` | Wire `useOnboardingState` hook — on mount, check if tour is completed/skipped; on skip/complete, persist |
| `src/features/onboarding/hooks/useOnboardingTourController.ts` | Accept persistence callbacks: `onComplete(tourKey)`, `onSkip(tourKey)` |

### Task Sequence

1. **Create migration** (`supabase/migrations/XXXXXXXXXXXXXX_user_onboarding_tours.sql`):
   ```sql
   CREATE TABLE user_onboarding_tours (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     tour_key TEXT NOT NULL,
     tour_version INTEGER NOT NULL DEFAULT 1,
     status TEXT NOT NULL DEFAULT 'not_started'
       CHECK (status IN ('not_started', 'started', 'completed', 'skipped')),
     current_step INTEGER,
     started_at TIMESTAMPTZ,
     completed_at TIMESTAMPTZ,
     skipped_at TIMESTAMPTZ,
     last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     metadata JSONB NOT NULL DEFAULT '{}',
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     UNIQUE(user_id, tour_key)
   );

   ALTER TABLE user_onboarding_tours ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Users can read own tour state"
     ON user_onboarding_tours FOR SELECT
     USING (auth.uid() = user_id);

   CREATE POLICY "Users can upsert own tour state"
     ON user_onboarding_tours FOR INSERT
     WITH CHECK (auth.uid() = user_id);

   CREATE POLICY "Users can update own tour state"
     ON user_onboarding_tours FOR UPDATE
     USING (auth.uid() = user_id);

   CREATE POLICY "Users can delete own tour state"
     ON user_onboarding_tours FOR DELETE
     USING (auth.uid() = user_id);
   ```
2. **Apply migration:** `npx supabase migration up` (local Supabase)
3. **Run type generation:** `npx supabase gen types typescript --local > src/lib/supabase/generated-types.ts` (or the project's actual types path — verify from `08_database_and_persistence_plan.md`)
4. **Implement repository** (`src/lib/onboarding/repository.ts`):
   - `getUserTourStates(userId: string): Promise<OnboardingState[]>` — fetch all tour states for user
   - `getUserTourState(userId: string, tourKey: TourKey): Promise<OnboardingState | null>` — fetch single tour state
   - `upsertTourState(userId: string, tourKey: TourKey, state: Partial<OnboardingState>): Promise<void>` — upsert tour state
5. **Implement server actions** (`src/lib/onboarding/actions.ts`):
   - Use `requireCurrentUserContext()` from `src/lib/auth/session.ts` for authorization
   - `getOnboardingTourStates()` — returns all tour states for authenticated user
   - `saveOnboardingTourState(tourKey: string, status: TourStatus, currentStep?: number)` — persists tour state
   - Return typed responses (not raw Supabase data)
6. **Implement `useOnboardingState` hook** (`src/features/onboarding/hooks/useOnboardingState.ts`):
   - Use TanStack Query `useQuery` to fetch tour states on mount (matching Archestimator's 30s staleTime pattern)
   - Use `useMutation` for upsert (optimistic update with rollback, matching `use-estimate-query.ts` pattern from `src/hooks/`)
   - Expose: `tourStates`, `isLoading`, `saveTourState(tourKey, status, step?)`
   - Handle loading state: show nothing while fetching (don't flash tour then dismiss)
7. **Wire persistence into `OnboardingRuntime`** (`src/features/onboarding/components/OnboardingRuntime.tsx`):
   - On mount: fetch tour states via `useOnboardingState`
   - If current tour's state is `completed` or `skipped`: do NOT render Joyride (return null)
   - On tour start: call `saveTourState(tourKey, 'started')`
   - On tour complete: call `saveTourState(tourKey, 'completed')`
   - On tour skip: call `saveTourState(tourKey, 'skipped')`
8. **Wire persistence into `useOnboardingTourController`**:
   - Accept `onComplete` and `onSkip` callbacks
   - Call them on state transitions
9. **Verify RLS** (Vitest):
   - Test: user A cannot read user B's tour rows
   - Test: unauthenticated requests rejected
   - Test: authenticated user can upsert own row
   - Test: authenticated user can delete own row
10. **Verify E2E:**
    - Log in as fresh user, complete tour, log out, log back in → tour does NOT restart
    - Log in as fresh user, skip tour, log out, log back in → tour does NOT restart
    - Log in as different user → tour starts fresh (their own state)

### Acceptance Criteria

- [ ] Migration applies without errors on local Supabase (`npx supabase migration up`)
- [ ] `npx supabase gen types` updates type definitions with `user_onboarding_tours` row type
- [ ] RLS tested: user A cannot read/write user B's tour data
- [ ] Tour completion persists across browser sessions (login/logout cycle)
- [ ] Tour skip persists across browser sessions
- [ ] Completed tours never auto-show again for that user (until version bump)
- [ ] Skipped tours never auto-show again for that user (until version bump)
- [ ] `bun run build` succeeds

### Tests

- **Migration schema test:** Verify table columns, constraints, default values
- **RLS policy tests (Vitest + Supabase local):**
  - User isolation: user A cannot SELECT user B's rows
  - Auth gate: anon request to `getOnboardingTourStates` returns error
  - CRUD: authenticated user can insert, update, delete own rows
- **Server action tests:** `getOnboardingTourStates` returns correct data; `saveOnboardingTourState` upserts correctly
- **Hook tests:** `useOnboardingState` query/mutation behavior
- **Integration test:** Full tour → complete → refresh → tour hidden

### Risks

- **Migration failure** on linked Supabase (staging/production) — test locally first
- **RLS misconfiguration** — policies must be EXACTLY right. Follow Archestimator's existing RLS patterns from other migrations
- **Race condition** — user closes browser during upsert. Graceful: next fetch gets latest state from DB

### Rollback

```bash
npx supabase migration repair --status reverted <migration_id>
# OR: manually DROP TABLE user_onboarding_tours;
```
Revert `WorkshopPageShell.tsx` to remove `OnboardingRuntime`. Set flag OFF.

---

## Phase 5: UX Polish

**Entry criteria:** Phase 4 complete. Tour persists correctly. Need design system compliance and replay entry.

**Goal:** Design system compliance, replay entry in Settings, copy refinement, animation tuning.

### Files to Create or Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/features/onboarding/components/OnboardingTooltip.tsx` | CREATE or MODIFY | Custom Joyride tooltip matching Archestimator design system |
| `src/features/onboarding/components/OnboardingReplayMenuItem.tsx` | CREATE | Settings menu item to manually replay tours |
| `src/app/workshop/settings/page.tsx` | MODIFY | Add replay card/button in Settings hub |
| `src/features/onboarding/config/firstWorkspaceOrientationTour.ts` | MODIFY | Refine tour copy based on internal review |
| `src/features/onboarding/config/tourRegistry.ts` | MODIFY | Add replay support: `resetTourState()` function |

### Tasks

1. **Design System Compliant Custom Tooltip** (choose one):
   - **Option A (recommended):** Build `OnboardingTooltip.tsx` using:
     - Archestimator `Button` primitive from `src/components/ui/button.tsx` for Next/Back/Skip
     - Phosphor icons (`ArrowRight`, `ArrowLeft`, `X`) for navigation controls
     - SF Pro font family, max 12px body text, xs (3px) border radius
     - Neutral palette: `#292929` text, `#5D5D5D` secondary, `#7F7F7F` muted
     - Tailwind v4 utility classes (no custom CSS)
     - Pass to Joyride via `tooltipComponent` prop
   - **Option B:** Refine existing Joyride `styles` overrides for full compliance
2. **Build OnboardingReplayMenuItem** (`src/features/onboarding/components/OnboardingReplayMenuItem.tsx`):
   - Renders a button or menu item that triggers `resetTourState(tourKey)`
   - Shows available tours with their status (Completed, Skipped, Available)
   - Uses TanStack Query mutation to reset via `saveOnboardingTourState(tourKey, 'not_started')`
   - Confirmation dialog: "Replay tour? This will show the Workspace Orientation guide again."
3. **Update Settings page** (`src/app/workshop/settings/page.tsx`):
   - Add an "Onboarding Tours" card/section in the Settings hub
   - List available tours with status badges: ✓ Completed, ✗ Skipped, → Available
   - "Replay" button next to completed/skipped tours
   - Only visible when `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=true`
4. **Refine tour copy** (`src/features/onboarding/config/firstWorkspaceOrientationTour.ts`):
   - Review all 5 step titles and body text for clarity, tone, and accuracy
   - Ensure copy reflects current Archestimator UI (sidebar labels, homebase terminology)
   - Match Archestimator's brand voice: professional, construction-domain-aware, concise
   - Product Owner review required (per `10_copywriting_and_step_content.md`)
5. **Z-index tuning:**
   - Test Joyride tooltip against all Archestimator overlays:
     - Sidebar expanded overlay (mobile/tablet)
     - Modal dialogs (`NewProjectModal`, `ProjectDetailsModal`, `ProposalExportPreviewDialog`)
     - Route-loading overlay (`useNavigationRouter`)
     - Toast notifications (`src/components/ui/`)
   - If conflicts found, adjust zIndex or pause tour during modals
6. **Animation refinement:**
   - Smooth spotlight transition between steps (respect `prefers-reduced-motion`)
   - Beacon animation: subtle pulse, neutral color
   - Step transition: fade or slide (subtle, professional)
7. **Verify:**
   ```bash
   bun run lint:design-system  # Custom design system linter — must pass
   bun run build
   bun run dev  # Manual visual QA
   ```

### Acceptance Criteria

- [ ] Tooltip matches Archestimator design system (SF Pro, 12px max, xs radius, neutral palette, Phosphor icons)
- [ ] Replay entry visible in Settings page when flag is ON
- [ ] All tours replayable via Settings → "Replay" button
- [ ] Tour copy reviewed and approved by Product Owner
- [ ] No z-index conflicts with sidebar, modals, toasts, or loading overlays
- [ ] `bun run lint:design-system` passes on modified files
- [ ] `prefers-reduced-motion` respected (no animations, instant transitions)

### Tests

- **Tooltip rendering test:** Render `OnboardingTooltip` with mock Joyride props; verify correct DOM structure, classes, icons
- **Replay menu test:** Click "Replay" → verify mutation fires → verify tour state resets
- **Design system compliance:** Run `bun run lint:design-system` on modified files
- **Visual regression:** Manual QA checklist covering all z-index scenarios

### Risks

- Design review feedback may require multiple iterations
- Custom tooltip complexity — Joyride's `tooltipComponent` API surface may have limitations

### Rollback

Revert custom tooltip to styled Joyride `styles` overrides. Remove replay section from Settings. Revert tour copy to Phase 3 placeholders.

---

## Phase 6: Testing and Hardening

**Entry criteria:** Phase 5 complete. All functionality implemented. Ready for comprehensive testing.

**Goal:** Full test coverage. Bug fixes. Accessibility and browser compatibility verification.

### Files to Create

| File | Purpose |
|------|---------|
| `tests/vitest/onboarding/tourRegistry.test.ts` | Tour registry lookup, route matching, feature flag gating |
| `tests/vitest/onboarding/tourTargets.test.ts` | Target uniqueness, valid DOM selectors |
| `tests/vitest/onboarding/OnboardingRuntime.test.tsx` | Runtime rendering under all flag/auth/route conditions |
| `tests/vitest/onboarding/useOnboardingTourController.test.ts` | State machine transitions, edge cases |
| `tests/vitest/onboarding/useMountedTourTargets.test.ts` | Target detection, timeout, missing target handling |
| `tests/vitest/onboarding/useOnboardingState.test.ts` | TanStack Query hooks, cache behavior |
| `tests/vitest/onboarding/onboardingActions.test.ts` | Server action authorization, CRUD operations |
| `tests/vitest/onboarding/onboardingRepository.test.ts` | Repository layer tests with mock Supabase client |
| `tests/vitest/onboarding/rls.test.ts` | RLS policy verification (user isolation, auth gate) |
| `tests/vitest/onboarding/OnboardingTooltip.test.tsx` | Custom tooltip rendering, design system compliance |
| `e2e/onboarding-workspace-orientation.spec.ts` | Full E2E: login → tour starts → complete all steps → persist → replay |

### Tasks

1. **Write unit tests** following Archestimator's Vitest patterns (see `tests/vitest/` for conventions):
   - Tour registry tests: verify route mapping, feature flag gating, unknown routes return null
   - Tour target tests: verify all targets are unique, all are valid CSS selectors
   - State machine tests: verify all transitions, edge cases (double-skip, navigate mid-tour)
   - Target detection tests: DOM availability, timeout, MutationObserver fallback
   - Persistence hook tests: mock TanStack Query, verify cache behavior
   - Server action tests: auth guard, CRUD, error states
2. **Write RLS tests** matching Archestimator's existing RLS test patterns:
   - User A cannot read user B's onboarding state
   - Anonymous requests fail
   - Authenticated user can read/write own state
3. **Write Playwright E2E test** (`e2e/onboarding-workspace-orientation.spec.ts`):
   - Set up: fresh test user, `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=true`
   - Flow: login → land on `/workshop` → verify tour auto-starts → click through all 5 steps → verify "complete" callback → refresh → verify tour does NOT restart
   - Test skip flow: skip tour → refresh → verify tour does NOT restart
   - Test replay flow: go to Settings → click "Replay" → tour restarts
   - Use Playwright fixtures and auth helpers from existing E2E tests (`e2e/` directory)
4. **Run full test suite:**
   ```bash
   bun run test          # Bun unit tests
   bun run test:dom      # Vitest DOM tests (includes new onboarding tests)
   bun run validate      # type-check + lint + design-system + unit + dom
   bun run build         # Production build
   bun run test:e2e      # Playwright E2E (Chromium)
   ```
5. **Manual QA pass:**
   - Fresh account: complete tour, verify no re-show
   - Return user: tour does NOT show (skipped/completed)
   - Sidebar navigation: all 5 steps render correctly
   - Reduced motion: verify no animations
   - Mobile viewport: verify tour does not render (or shows content-only, depending on Phase 0 decision)
   - Multi-tab: open two tabs, complete tour in one → second tab should not show tour (if real-time, or on next mount)
   - Error state: if Joyride crashes, verify workspace shell is unaffected
6. **Accessibility QA:**
   - Keyboard-only: Tab through tooltip buttons, Escape to dismiss
   - Screen reader: macOS VoiceOver, verify step content is announced, focus moves to tooltip
   - Color contrast: tooltip text vs background, buttons vs background
7. **Browser compatibility:**
   - Chrome (latest) — primary target
   - Firefox (latest)
   - Safari (latest)
   - Edge (latest)
8. **Bundle size verification:**
   ```bash
   ANALYZE=true bun run build
   ```
   Verify Joyride stays within workshop chunks only. Total onboarding feature size (all new files) should be under 40KB gzipped.
9. **Bug fixes** — fix any issues found in testing. Re-test after fixes.

### Acceptance Criteria

- [ ] All new onboarding tests pass (`tests/vitest/onboarding/*`)
- [ ] All existing tests still pass (no regressions)
- [ ] `bun run validate` passes (full gate)
- [ ] `bun run build` succeeds
- [ ] Playwright E2E test passes (tour completion, skip, replay)
- [ ] Manual QA checklist complete with sign-off
- [ ] Accessibility acceptance criteria met (keyboard, screen reader, contrast)
- [ ] Bundle size within limits (< 40KB gzipped total onboarding feature)
- [ ] 0 P0 (blocking) bugs
- [ ] 0 P1 (critical) bugs

### Tests

All tests listed above. Coverage target: >85% for onboarding feature code (types, config, hooks, components, services).

### Risks

- Test flakiness from Joyride animations or timing (mitigate with `prefers-reduced-motion` in test fixtures)
- E2E auth setup complexity (follow existing Playwright auth patterns from `e2e/`)
- Browser-specific Joyride rendering differences

### Rollback

Flag OFF. All tests should still pass (tests are feature-isolated). Fix bugs offline.

---

## Phase 7: Rollout

**Entry criteria:** Phase 6 complete. All tests pass. Manual QA signed off. 0 blocking bugs.

**Goal:** Enable onboarding for closed beta users. Monitor and iterate.

### Files to Modify

| File | Change |
|------|--------|
| Vercel environment variables | Set `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=true` in staging, then production |
| `README.md` | Add "Onboarding Tours" to the Key Features table (optional — depends on team preference) |

### Tasks

1. **Staging deployment:**
   - Deploy Phase 6 code to Vercel staging
   - Set `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=true` in staging env
   - Verify: tour works on staging with fresh account
2. **Internal team testing:**
   - All team members: log in to staging with fresh accounts
   - Complete the tour and provide feedback
   - Test on different browsers, devices
   - Record any issues
3. **Monitor for 24 hours:**
   - Check error logs (Vercel Logs, Supabase logs)
   - Verify no unexpected errors from onboarding code
   - Check completion rates: `SELECT status, count(*) FROM user_onboarding_tours GROUP BY status;`
4. **Production deployment:**
   - If 24-hour monitoring is clean: deploy to production
   - Set `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=true` in production env
   - Keep flag as a kill switch — if anything goes wrong, set to `false` immediately
5. **Monitor production:**
   - Error rates, tour completion rates, user feedback
   - Watch for: Joyride crashes, RLS errors, unexpected tour re-shows
   - First 48 hours: check logs every 4 hours
6. **Collect beta feedback:**
   - Direct user feedback channels (support email, feedback form)
   - Watch for complaints: "tour is annoying", "tour won't go away", "can't find X after tour"
7. **Update documentation:**
   - Add onboarding feature to `README.md` Key Features table (if team decides)
   - Close this planning folder (mark as "IMPLEMENTED" in README)

### Acceptance Criteria

- [ ] 0 critical errors in first 48 hours of production
- [ ] Tour completion rate > 50% (more than half of new users finish the tour)
- [ ] No negative feedback specifically about onboarding
- [ ] No public route leakage (tour only on `/workshop` authenticated surfaces)
- [ ] Feature flag confirmed as functional kill switch (set to `false` → tour disappears)

### Tests

- Production monitoring and user feedback (no automated tests in prod)

### Risks

- Undetected edge cases from production traffic patterns
- User frustration if tour targets break due to UI deployment after tour release

### Rollback

**Immediate:** Set `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=false` in Vercel production. Tour disappears instantly.

**Full rollback:** Redeploy previous production build. Remove `user_onboarding_tours` table via migration (optional — or leave table, it's inert without flag). Revert `README.md` if changed.

---

## Phase Dependency Diagram

```
Phase 0  (Review & Approve)
   │
   ▼
Phase 1  (Package + Skeleton)
   │
   ▼
Phase 2  (Target Markers)
   │
   ▼
Phase 3  (Runtime + Controller)
   │
   ▼
Phase 4  (Persistence)
   │
   ▼
Phase 5  (UX Polish)
   │
   ▼
Phase 6  (Testing + Hardening)
   │
   ▼
Phase 7  (Rollout)
```

All phases are sequential. Each phase must be complete and verified before starting the next. The only exception: if Phase 1 reveals `react-joyride` incompatibility, the implementer selects an alternative library and restarts Phase 1.

---

## Validation Gates (Per Phase)

| Phase | Commands to Run |
|-------|----------------|
| Phase 1 | `bun run type-check` + `bun run build` + `ANALYZE=true bun run build` |
| Phase 2 | `bun run type-check` + `bun run build` |
| Phase 3 | `bun run type-check` + `bun run build` + manual tour walkthrough |
| Phase 4 | `bun run type-check` + `bun run build` + RLS Vitest tests + manual persistence check |
| Phase 5 | `bun run lint:design-system` + `bun run build` + manual visual QA |
| Phase 6 | `bun run validate` + `bun run build` + `bun run test:e2e` |
| Phase 7 | Production monitoring (no CLI validation) |

**Blocking rule:** If any validation gate fails, do NOT proceed to the next phase. Fix issues in the current phase and re-validate.

---

## Total File Change Summary

| Phase | Create | Modify | Total |
|-------|--------|--------|-------|
| Phase 1 | 5 | 2 | 7 |
| Phase 2 | 1 | 5 | 6 |
| Phase 3 | 4 | 3 | 7 |
| Phase 4 | 4 | 2 | 6 |
| Phase 5 | 1 | 3 | 4 |
| Phase 6 | 10 | 0 | 10 |
| Phase 7 | 0 | 2 | 2 |
| **Total** | **25** | **17** | **42** |

Source files (non-test): ~25 new, ~17 modified = ~42 file touches across the entire implementation. Test files: ~10 new test files in Phase 6.
