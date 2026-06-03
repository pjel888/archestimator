# 15 Testing and QA Plan

**Status:** Planning
**Created:** 2026-06-03
**Route/surface:** `/workshop/*` authenticated surfaces behind `WorkshopPageShell`
**References:**
- `vitest.config.ts` — Vitest config: jsdom, `tests/vitest/**/*.test.{ts,tsx}`, 15s timeout, no parallelism
- `playwright.config.ts` — Playwright config: `e2e/`, chromium only, 30s timeout, `baseURL=http://127.0.0.1:3020`
- `package.json` scripts — `bun run test` (Bun), `bun run test:dom` (Vitest), `bun run test:e2e` (Playwright)
- `07_tour_registry_and_targeting_plan.md` — Tour registry, target constants, state machine design
- `08_database_and_persistence_plan.md` — `user_onboarding_tours` table schema, server actions, RLS
- `03_recommended_architecture.md` — Runtime flow, component hierarchy, provider integration
- `10_copywriting_and_step_content.md` — Step definitions for Workspace Orientation tour
- `04_implementation_matrix.md` — 14 surfaces, phase assignments, trigger timing
- `05_file_change_map.md` — Exact file paths, risk levels, required test coverage per file

## Purpose

Define the complete testing strategy for the React Joyride onboarding system across three layers: Vitest unit/component tests (161 existing test files), Bun unit tests (2 existing files), and Playwright E2E (12 existing specs). Every test target references a specific source file, a specific expected behavior, and a specific test file. This document also includes manual QA checklists, edge case tables, and regression gates calibrated to ArchEstimator's existing validation matrix.

---

## 1. Unit Test Plan (Bun test + Vitest)

All new tests live under `tests/vitest/onboarding/`. Bun tests are reserved for migration guards and baseline assertions (matching existing `tests/unit/` pattern). New feature tests go in Vitest with jsdom, matching the existing 161-test-file convention.

### 1.1 Tour Registry Tests

**File:** `tests/vitest/onboarding/tourRegistry.test.ts`
**Vitest config:** Included via `include: ["tests/vitest/**/*.test.{ts,tsx}"]` in `vitest.config.ts:9`
**Source under test:** `src/features/onboarding/config/tourRegistry.ts` (see `07_tour_registry_and_targeting_plan.md` § Tour Registry, lines 357–429)

| Test | Expected Behavior | Source Reference |
|------|------------------|------------------|
| All tours have unique keys | `new Set(tourRegistry.map(t => t.key)).size === tourRegistry.length` | `07_tour_registry_and_targeting_plan.md:367` — `tourRegistry: TourDefinition[]` |
| Tour keys follow naming convention (`{descriptive_name}_v{version}`) | Every `tour.key` matches `/^[a-z_]+_v\d+$/` | `03_recommended_architecture.md:359` — naming convention, `07:18` — `TOUR_KEYS` naming |
| Route matching works for exact routes | `getTourForRoute('/workshop')` returns the workspace orientation tour | `04_implementation_matrix.md:84` — surface #1 route `/workshop` |
| Route matching works for pattern routes | `getTourForRoute('/workshop/projects/proj-123/estimates/node-1')` matches estimate sheet tour via `routePattern` | `04_implementation_matrix.md:191` — dynamic route `/workshop/projects/[projectId]/estimates/[nodeId]` |
| `getTourForRoute` returns correct tour for each route | One test per registered route surfaces 1–12 | `04_implementation_matrix.md:52–361` — full implementation matrix |
| No duplicate step target selectors within a tour | For each tour, `new Set(steps.map(s => s.target)).size === steps.length` | `07_tour_registry_and_targeting_plan.md:617–639` — duplicate target prevention |
| Each tour has 2–6 steps | Every `tour.steps.length` is between 2 and 6 inclusive | `07_tour_registry_and_targeting_plan.md:460` — segment design principle "Short segments. 4-6 steps" |
| Each step has required fields | Every step has non-empty `id`, `title`, `body`, `target`, `placement` | `03_recommended_architecture.md:315–331` — `TourStep` type, `10_copywriting_and_step_content.md` — step field table per segment |
| Prerequisites reference valid tour keys | Every `tour.prerequisites?` entry exists in `tourRegistry` | `07_tour_registry_and_targeting_plan.md:343–344` — `prerequisites?: TourKey[]` |

### 1.2 Tour Target Tests

**File:** `tests/vitest/onboarding/tourTargets.test.ts`
**Vitest config:** Same as above
**Source under test:** `src/features/onboarding/config/tourTargets.ts` (see `07_tour_registry_and_targeting_plan.md` § Centralized Target Constants, lines 40–265)

| Test | Expected Behavior | Source Reference |
|------|------------------|------------------|
| All target constants are unique (no duplicates) | `new Set(Object.values(TOUR_TARGETS)).size === Object.keys(TOUR_TARGETS).length` | `07:617–639` — TypeScript + value uniqueness enforcement |
| Target naming follows `ae-tour-{surface}-{element}` convention | Every value matches `/^ae-tour-[a-z]+(-[a-z]+)*$/` | `07:47` — format spec: `ae-tour-{surface}-{element}` |
| All targets are lowercase with hyphens | No uppercase, no underscores, no camelCase in values | `07:508–516` — targeting naming rules (lowercase, hyphens) |
| Each target has a documented owning component | Export a `TARGET_OWNER_MAP` mapping each target to its owning file path. Assert all targets have an entry and the referenced file exists on disk. | `07:270–303` — component ownership reference table |
| No target value uses a CSS class name or element ID | No value contains `.` or `#` prefix | `07:514` — "No CSS class names" rule |

### 1.3 State Machine Tests

**File:** `tests/vitest/onboarding/tourStateMachine.test.ts`
**Vitest config:** Same as above
**Source under test:** `src/features/onboarding/hooks/useOnboardingTourController.ts` (see `03_recommended_architecture.md:48` — tour lifecycle management)

The state machine states (from `06_onboarding_flow_spec.md` and `03_recommended_architecture.md` § Runtime flow): `idle`, `loadingUser`, `loadingTourState`, `waitingForRoute`, `waitingForTargets`, `ready`, `running`, `paused`, `completed`, `skipped`, `errored`.

| Transition | Expected Behavior | Source Reference |
|-----------|------------------|------------------|
| `idle → loadingUser` | Valid. Triggers on `useOnboardingTourController` mount when feature flag enabled. | `03_recommended_architecture.md:59–66` — Runtime flow step 2 |
| `loadingUser → loadingTourState` | Valid. Triggers when user context resolves. Fetches `user_onboarding_tours` rows. | `03:64` — "calls `useOnboardingState(userId)`" |
| `loadingTourState → waitingForRoute` | Valid. Triggers when persistence fetch completes. Waits for route match. | `03:65` — "selects active tour from `tourRegistry` based on current route" |
| `waitingForRoute → waitingForTargets` | Valid. Triggers when a matching tour is found and is not already completed. Starts target detection. | `07:496–498` — target availability rules (MutationObserver + polling) |
| `waitingForTargets → ready` | Valid. Triggered when all step targets resolve in DOM within 5s timeout. | `07:498–500` — detection method + timeout |
| `waitingForTargets → errored` | Valid. Triggered when target detection timeout (5s) expires with unresolved targets. | `07:500` — "Timeout behavior: 5s" |
| `ready → running` | Valid. Either auto-start (for tours with `disableAutoStart: false`) or after user-triggered replay. | `03:66` — "renders `<Joyride>` in controlled mode" |
| `running → completed` | Valid. Triggered when all steps complete (user clicks "Done" on final step). Calls `upsertOnboardingTourState({ status: 'completed' })`. | `08:214–248` — upsert server action, `03:67` — "on finish or skip, calls `onboardingPersistence.markComplete()`" |
| `running → skipped` | Valid. Triggered when user clicks "Skip" button or presses Escape. Calls `upsertOnboardingTourState({ status: 'skipped' })`. | `08:214–248` — same upsert, status = `'skipped'` |
| `running → paused` | Valid. Triggered when: (a) modal opens over tour target, (b) route changes away from tour's route. Tour state preserved in context. | `04_implementation_matrix.md:145–147` — modal spotlight + focus management; `07` § Route-scoped segments |
| `paused → running` | Valid. Triggered when: (a) modal closes and tour route is current, (b) user returns to tour route. Resumes at last step index. | `04:164–166` — route transition handling, step resumption |
| `paused → skipped` | Valid. Triggered when tour is paused for >30s (configurable timeout). Auto-skips to prevent stale overlays. | Design decision — prevent orphaned tour overlays |
| `running → errored` | Valid. Triggered on unrecoverable error: (a) Joyride import fails, (b) `upsertOnboardingTourState` fails after 3 retries, (c) all targets unmapped simultaneously. | `03:345–351` — failure modes table |
| `errored → idle` | Valid. Triggered by manual reset via replay action or page reload. | `07` § Replay — "replaying does NOT delete or reset the server-side completion record" |
| Invalid transitions throw | Calling `transition(from: 'completed', to: 'running')` throws an error. No state can transition to itself (except `loadingTourState → loadingTourState` for retry). | Standard state machine contract |

### 1.4 Server Action Tests

**File:** `tests/vitest/onboarding/onboardingPersistence.test.ts`
**Vitest config:** Same as above. Mock Supabase client using `vi.mock("@/lib/supabase/server")` pattern from existing tests (see `tests/vitest/auth-session-closed-beta.test.ts` for `vi.hoisted()` mock pattern).
**Source under test:** `src/lib/onboarding/actions.ts` (see `08_database_and_persistence_plan.md` § Server Actions, lines 178–271)

| Test | Expected Behavior | Source Reference |
|------|------------------|------------------|
| `getUserOnboardingTours` returns empty array for new user | Mock Supabase `.select()` returns `{ data: [], error: null }`. Assert result is `[]`. | `08:196–208` — `getUserOnboardingTours` server action |
| `upsertOnboardingTourState` creates new row with status `'started'` | Mock upsert with no existing row. Assert returned row has `status === 'started'`, `started_at` non-null, `user_id` matches. | `08:214–248` — upsert creates new row |
| `upsertOnboardingTourState` updates existing row (upsert) | Mock upsert with existing row for same `(user_id, tour_key, tour_version)`. Assert returned row has updated `current_step`, `last_seen_at`. | `08:238–246` — `upsert()` with `onConflict` |
| Upsert with status `'completed'` sets `completed_at` | Call with `{ status: 'completed' }`. Assert `completed_at` is a timestamp string, `skipped_at` is null. | `08:229–230` — `completed_at` assignment on status change |
| Upsert with status `'skipped'` sets `skipped_at` | Call with `{ status: 'skipped' }`. Assert `skipped_at` is a timestamp string, `completed_at` is null. | `08:231` — `skipped_at` assignment |
| Concurrent upserts don't corrupt data | Two parallel upserts for same `tour_key` with different `current_step` values. `ON CONFLICT (user_id, tour_key, tour_version) DO UPDATE` handles deduplication at DB level. Assert final row is consistent (no partial update). | `08:81` — UNIQUE constraint, `08:241` — `onConflict` column list |
| Unauthorized user cannot read another user's tours (RLS) | Mock `requireCurrentUserContext()` with User-A. Call `getUserOnboardingTours`. Supabase RLS filter `auth.uid() = user_id` is enforced. Test verifies server action only queries with `currentUser.userId`. | `08:122–126` — SELECT RLS policy, `12_security_and_privacy_analysis.md:83–99` — `requireCurrentUserContext` pattern |
| Unauthorized user cannot write another user's tours (RLS) | Mock `requireCurrentUserContext()` with User-A. Call `upsertOnboardingTourState`. Test verifies `insert.user_id === currentUser.userId`. | `08:134–139` — UPDATE RLS with `auth.uid() = user_id` checks |
| `getOnboardingTourState` returns null for never-seen tour | Mock `.maybeSingle()` returns `{ data: null, error: null }`. Assert result is `null`. | `08:254–271` — `getOnboardingTourState` with `maybeSingle()` |
| Server action follows `"use server"` pattern | Import from `"@/lib/onboarding/actions"` works in test (verified via module resolution). File starts with `"use server"` directive. | `08:183` — `"use server"` directive, follows pattern from `src/lib/estimates/actions.ts:1` |

### 1.5 Hook Tests

**File:** `tests/vitest/onboarding/useOnboardingState.test.ts`
**Vitest config:** Same as above. Use React Testing Library for hook testing (`@testing-library/react` pattern — already in devDependencies, used by existing 161 vitest files).
**Source under test:** `src/features/onboarding/hooks/useOnboardingState.ts` (see `08_database_and_persistence_plan.md` § Client-Side Strategy § TanStack Query Integration, lines 327–362)

| Test | Expected Behavior | Source Reference |
|------|------------------|------------------|
| `useOnboardingState` returns null for new user | Mock `getUserOnboardingTours` returns `[]`. Hook returns `{ data: [], isLoading: false, isError: false }`. | `08:333–339` — `useQuery` with `tourQueryKey` |
| `useOnboardingState` returns tour state after fetch | Mock returns one row: `{ tour_key: 'first_workspace_orientation_v1', status: 'completed' }`. Hook returns data array with the row. | `08:333–339` — same query |
| `useOnboardingState` updates after upsert | Call mutation to mark tour complete. Assert `queryClient.invalidateQueries` is called (matching `onSettled` pattern). Assert cached data updates (optimistic or post-settled). | `08:341–361` — `useMutation` with optimistic update + `onSettled` invalidation |
| Loading state handled correctly | Assert `isLoading: true` during initial fetch, `isLoading: false` after resolve. | `08:317` — TanStack Query 5-min `staleTime`/`gcTime` from `AppProviders` |
| Error state handled correctly | Mock `getUserOnboardingTours` throws. Assert `isError: true`. Assert no crash (error boundary catches). | `03:348` — "Supabase unavailable → Use cached completion state" |
| `useOnboardingState` does not fetch when feature flag is off | Mock `useOnboardingEnabled()` returns `false`. Assert `useQuery` is not called (skip query). | `07:454–488` — feature flag gates all onboarding, `05_file_change_map.md:73` — `useOnboardingEnabled` hook |

### 1.6 Component Tests

**File:** `tests/vitest/onboarding/OnboardingRuntime.test.tsx`
**Vitest config:** Same as above. Use `@testing-library/react` render + screen queries.
**Source under test:** `src/features/onboarding/components/OnboardingRuntime.tsx` (see `03_recommended_architecture.md:299–319` — SSR/Client Boundary)

| Test | Expected Behavior | Source Reference |
|------|------------------|------------------|
| Renders nothing when feature flag is off | Mock `useOnboardingEnabled()` returns `false`. Assert `container.children.length === 0` or `queryByTestId('onboarding-runtime')` is null. | `03:299–316` — dynamic import only fires when enabled |
| Renders nothing when user not authenticated | Mock user session as null. Assert component returns null. | `03:329` — "User is authenticated — checked via `useOnboardingState`" |
| Renders Joyride when all conditions met | Mock feature flag ON, user authenticated, tour state shows not-completed for workspace orientation. Assert Joyride renders (verify a `data-joyride` or spotlight overlay element exists in DOM). | `03:66` — "renders `<Joyride>` in controlled mode" |
| Handles Joyride import failure gracefully (error boundary) | Mock `next/dynamic` to reject. Assert error boundary catches, component renders fallback (null or error message), no uncaught rejection in console. | `03:345–346` — "Joyride dynamic import failure → Catch error boundary" |
| Cleanup on unmount | Render component, verify Joyride renders, unmount component. Assert no orphaned DOM nodes, no active timers, no memory leaks (via `vi.useFakeTimers`). | `04_implementation_matrix.md:165` — "Joyride instance is torn down and rebuilt" on route change |
| Does not render if all registered tours are completed | Mock `useOnboardingState` returns all tours as `status: 'completed'`. Assert component returns null. | `07:437–438` — "completed or skipped → skip this tour" |

### 1.7 Tooltip Tests

**File:** `tests/vitest/onboarding/OnboardingTooltip.test.tsx`
**Vitest config:** Same as above. RTL render + screen queries + visual snapshot via `toMatchSnapshot()`.
**Source under test:** `src/features/onboarding/components/OnboardingTooltip.tsx` (see `03_recommended_architecture.md:28` — "Custom tooltip: SF Pro, 12px max, xs radius, Phosphor icons", `10_copywriting_and_step_content.md:23–33` — typography spec)

| Test | Expected Behavior | Source Reference |
|------|------------------|------------------|
| Renders step title and body | Pass `step={{ title: 'Your Workshop', content: 'This is your estimating workspace...' }}`. Assert title text appears, body text appears. | `10:47–59` — Step 1 fields |
| Renders step counter ("Step 2 of 5") | Pass `step={{ index: 1 }}` and `size={5}`. Assert rendered text contains "Step 2 of 5". | `10:29` — step counter typography spec |
| Skip button works | Click "Skip" button. Assert `onSkip` callback fires, tooltip unmounts. | `03:67` — "on skip → calls onboardingPersistence.markComplete()" |
| Previous button not shown on first step | Pass `stepIndex={0}`. Assert no Previous button rendered. | Standard Joyride behavior (first step = no back) |
| Next button shown on non-last step | Pass `stepIndex={2}`, `size={5}`. Assert Next button visible. | Standard Joyride behavior |
| Done/Finish button on last step | Pass `stepIndex={4}`, `size={5}`, `isLastStep={true}`. Assert button text is "Done" (or equivalent), not "Next". | `04:87` — "On tour completion (last step Next/Done)" |
| Matches design system — fonts | Assert title element uses `SF Pro` font-family, title font-size ≤ 12px, body font-size ≤ 12px. | `10:25–31` — typography table, `DESIGN.md` § Typography |
| Matches design system — colors | Assert colors use neutral palette tokens (`#292929`, `#5D5D5D`, `#7F7F7F`), not arbitrary hex values. | `10:33` — color tokens, `DESIGN.md` § Colors |
| Matches design system — radius | Assert tooltip container border-radius = 3px (`xs` radius token). | `03` § Design system: "xs-only (3px) border radius" |
| Phosphor icon renders for close button | Assert an `<X>` or close icon from `@phosphor-icons/react` renders. Not plain text "×". | `03_recommended_architecture.md:428` — "Phosphor Icons for UI" |

### 1.8 Provider Tests

**File:** `tests/vitest/onboarding/OnboardingProvider.test.tsx`
**Vitest config:** Same as above.
**Source under test:** `src/features/onboarding/components/OnboardingProvider.tsx` (see `03_recommended_architecture.md:38` — context provider)

| Test | Expected Behavior |
|------|------------------|
| Renders children | Child `<div data-testid="child">Content</div>` is rendered. |
| Provides context to descendants | `useContext(OnboardingContext)` in a child component returns a non-null value with `state` and `actions` objects. |
| No state leak between providers | Two sibling `OnboardingProvider` instances have independent state. Updating one does not affect the other. |

---

## 2. Playwright E2E Test Plan

All E2E tests live under `e2e/`. Run with `bun run test:e2e` (Chromium only, matches `playwright.config.ts:27`). E2E tests that require an authenticated state use `storageState` per `playwright.config.ts:16`.

### 2.1 Workspace Orientation E2E

**File:** `e2e/onboarding-workspace-orientation.spec.ts`
**Prerequisites:** Authenticated user (via `PLAYWRIGHT_STORAGE_STATE`), `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=true`, no prior tour completion for workspace orientation tour. Requires a fresh test user or a pre-seeded DB state with no `user_onboarding_tours` rows for the test user.

| # | Test | Steps | Expected Result | Source Reference |
|---|------|-------|----------------|------------------|
| 1 | Tour auto-starts on first `/workshop` visit | 1. Navigate to `/workshop`. 2. Wait for Joyride spotlight overlay to appear. | Spotlight overlay visible. First step tooltip contains title "Your Workshop". | `04_implementation_matrix.md:86` — "Triggered by detecting no existing row for workspace orientation" |
| 2 | All 5 steps display with correct content | 1. Advance through each step with "Next". 2. Assert each step's title matches expected. | Steps 1–5: "Your Workshop", "Main navigation", "Projects", "Homebase Shortcuts", "Component Library" (per `10_copywriting_and_step_content.md:46–233`). | `10:46–233` — Workspace Orientation step definitions |
| 3 | Skip button dismisses tour | 1. On any step during the tour. 2. Click "Skip" button. | Tour overlay disappears. No error in console. | `03:67` — "on skip → calls markComplete" |
| 4 | Complete all steps and verify completion persisted | 1. Click "Next" through all steps. 2. Click "Done" on final step. 3. Navigate away and back to `/workshop`. | Tour does NOT re-appear on revisit. | `08:229–230` — upsert sets `completed_at` on completion |
| 5 | Second visit does NOT re-show completed tour | 1. After test #4, reload `/workshop`. | No tour overlay appears. Page renders normally. | `08:308` — "completed/skipped → skip this tour" |
| 6 | Replay from settings works | 1. Navigate to `/workshop/settings`. 2. Click "Replay" for Workspace Orientation. 3. Verify tour restarts. | Tour begins from step 1. | `07` § Replay — "replaying starts a fresh tour instance" |
| 7 | Escape key dismisses tour | 1. During active tour. 2. Press Escape. | Tour overlay disappears immediately. | `10` — skip behavior (Escape = skip) |

### 2.2 Project Creation E2E (Phase 6)

**File:** `e2e/onboarding-project-creation.spec.ts`
**Prerequisites:** Workspace orientation tour marked complete for test user. `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=true`.

| # | Test | Expected Result | Source Reference |
|---|------|----------------|------------------|
| 1 | Tour starts on `/workshop/projects` after workspace orientation complete | Navigate to `/workshop/projects`. Project creation tour auto-starts. | `04:124` — trigger timing: "after workspace orientation complete" |
| 2 | Modal steps display when NewProjectModal opens | Click "New Project" CTA. Tour step transitions to modal targets. Spotlight highlights name input field. | `04:143–147` — modal step continuation |
| 3 | Tour completes after project creation | Fill project name, submit. Tour advances to project dashboard steps, then completes. | `04:163–166` — dashboard steps + persistence |

### 2.3 Estimate Sheet E2E (Phase 6)

**File:** `e2e/onboarding-estimate-sheet.spec.ts`
**Prerequisites:** Project creation tour marked complete. Project exists with at least one estimate node.

| # | Test | Expected Result | Source Reference |
|---|------|----------------|------------------|
| 1 | Tour starts on estimate editor route | Navigate to `/workshop/projects/[projectId]/estimates/[nodeId]`. Tour auto-starts. | `04:200–204` — trigger timing, dynamic import wait |
| 2 | Tree panel and sheet panel steps display | Advance through steps. Spotlight highlights tree panel, then sheet table. | `04:199–204` — targets 8 (tree) and 9 (table) |
| 3 | Component library sidebar step displays | Advance to sidebar step. Spotlight highlights sidebar toggle button. | `04:247–261` — target 10 (component right sidebar) |

### 2.4 Regression Guard E2E (Phase 6)

**File:** `e2e/onboarding-regression.spec.ts`

| # | Test | Expected Result |
|---|------|----------------|
| 1 | All existing E2E tests pass with feature flag ON | Run `bun run test:e2e` with flag enabled. All 12 existing specs pass. |
| 2 | All existing E2E tests pass with feature flag OFF | Run `bun run test:e2e` with flag disabled. All 12 existing specs pass. |
| 3 | No Joyride JS loaded on public routes | Navigate to `/`, `/about`, `/pricing`, `/login`, `/share/test-token`. Verify `react-joyride` code is NOT present in page source or network requests. | `04:398` — bundle analysis verification |
| 4 | No `data-tour` attributes on public routes | Inspect DOM on `/`, `/share/test-token`. Verify zero `[data-tour]` elements. | `04:396` — grep exclusion check |

---

## 3. Manual QA Checklist

### 3.1 MVP Checklist

To be executed on staging with `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=true` and a fresh test account (no `user_onboarding_tours` rows).

- [ ] **Fresh signup:** Tour auto-starts on first `/workshop` visit after Google OAuth or magic link sign-in. No delay >1s after shell renders.
- [ ] **Tour steps display in order with correct content:** Steps 1–5 appear sequentially. Title and body match `10_copywriting_and_step_content.md` § Segment 1.
- [ ] **Spotlight highlights correct elements:** Each step's spotlight overlay frames the correct DOM element. No misalignment, no scroll-jank, no clipped spotlight.
- [ ] **Skip button works (Escape key also):** Clicking "Skip" on any step dismisses the tour. Pressing Escape does the same. No residual overlay.
- [ ] **After skipping:** Close tab, reopen, navigate to `/workshop`. Tour does NOT re-appear. Confirms skip persisted to `user_onboarding_tours` with `status='skipped'`.
- [ ] **After completing:** Complete all 5 steps. Close tab, reopen, navigate to `/workshop`. Tour does NOT re-appear. Confirms completion persisted.
- [ ] **Tour does NOT start on public routes:** Navigate to `/`, `/about`, `/pricing`, `/contact`, `/login`, `/privacy`, `/terms`. No Joyride overlay appears on any public route.
- [ ] **Tour does NOT start on `/share/[token]`:** Open a valid shared link. No tour overlay. No onboarding JS loaded.
- [ ] **Replay from Settings works:** Navigate to `/workshop/settings`. Locate replay entry. Click replay. Navigate to `/workshop`. Tour restarts from step 1.
- [ ] **Sidebar remains interactive during tour:** While tour is active, click sidebar nav items. Sidebar highlights correctly. Navigation does not break tour (tour pauses on route change, resumes on return).
- [ ] **Route loading overlay does not break tour:** Navigate between `/workshop` routes during active tour. The existing `RouteLoadingOverlay` (from `src/app/providers.tsx:82`) does not overlap or interfere with Joyride spotlight z-index (Joyride uses `z-index: 100`, per `07:501`).
- [ ] **Tab/Shift+Tab navigates tooltip buttons:** Focus on tooltip body. Tab moves focus through buttons (Previous, Next, Skip). Shift+Tab reverses. Enter/Space activates focused button.
- [ ] **Focus returns to page after tour:** After tour completes or is skipped, focus returns to the main page content or the element that was focused before the tour started.
- [ ] **Reduced motion:** Set OS-level "Reduce motion" preference. Tour steps disable scroll animation (`scrollToFirstStep: false`). Spotlight transitions are instant (no animation).
- [ ] **Mobile:** Tour on viewports <1024px (Tailwind `lg` breakpoint). Sidebar steps (targeting `MainSidebar`) are skipped. Tooltip placement adjusts to auto/center. Tour is usable on touch screens.

### 3.2 Accessibility QA Checklist

- [ ] **Keyboard-only navigation through entire tour:** Start tour, complete all steps using only Tab, Enter, Shift+Tab, and Escape. No mouse/touch required.
- [ ] **Screen reader announcements for each step:** Using VoiceOver (macOS) or NVDA (Windows), verify that each step's title and body are announced when the step advances. Verify the step counter is announced.
- [ ] **Focus trap in tooltip:** While a tooltip is visible, Tab cycles only through tooltip buttons (not page content behind the overlay). Confirmed focus does not escape tooltip.
- [ ] **Focus restoration after tour:** After tour dismisses (skip or complete), focus returns to the page. `document.activeElement` is on the page, not a detached element.
- [ ] **WCAG AA contrast (4.5:1):** Tooltip text (`#292929` on tooltip background) meets 4.5:1 ratio. Buttons meet 3:1 ratio for UI components. Run axe-core (already in devDependencies, used in existing tests) on tours.
- [ ] **Skip/close buttons have accessible labels:** "Skip" button has `aria-label="Skip tour"` or visible text. Close (×) button has `aria-label="Close tour"`.
- [ ] **Reduced motion respected:** Per §3.1 above, `prefers-reduced-motion` disables spotlight and scroll animations. Verify `@media (prefers-reduced-motion: reduce)` is applied.

### 3.3 Regression Checklist

Run the full validation matrix from `package.json`:

```bash
bun run validate          # type-check + lint + lint:design-system + bun test + vitest
bun run build             # Next.js production build
bun run test:e2e          # Playwright E2E (all 12 specs)
```

- [ ] **All existing Vitest tests pass:** 161 test files, `bun run test:dom` exits 0. No new failures introduced.
- [ ] **All existing Bun tests pass:** 2 test files, `bun run test` exits 0.
- [ ] **All existing Playwright tests pass:** 12 spec files, `bun run test:e2e` exits 0.
- [ ] **`bun run type-check` passes:** `tsc --noEmit` exits 0. No new type errors.
- [ ] **`bun run lint` passes:** ESLint flat config exits 0. Existing 14 warnings acceptable (no new warnings from onboarding code).
- [ ] **`bun run lint:design-system` passes:** Design-system linter exits 0. Onboarding tooltip complies with SF Pro, 12px max, xs radius, neutral palette rules.
- [ ] **`bun run build` succeeds:** Next.js production build exits 0. Zero build errors from `next/dynamic` or Joyride SSR.
- [ ] **Bundle analyzer confirms zero Joyride in public route chunks:** `ANALYZE=true bun run build` shows `react-joyride` only in `/workshop` page chunks. Zero Joyride code in `/`, `/login`, `/share`, `/about`, `/pricing` chunks.

---

## 4. Edge Cases Checklist

| # | Edge Case | Expected Behavior | Test Method |
|---|-----------|------------------|-------------|
| 1 | New authenticated user visits `/workshop` for the first time | Tour auto-starts from step 1 after shell renders and all targets detect. Loading spinner shown during target detection. | Manual + E2E (§2.1, test #1) |
| 2 | Existing user who completed the tour visits `/workshop` | No tour appears. Page loads normally. | Manual |
| 3 | Existing user who skipped the tour visits `/workshop` | No tour appears. Skip is permanent until replay is triggered. | Manual |
| 4 | User triggers replay from Settings and visits tour route | Tour restarts from step 1. Existing completion/skip record is not deleted; a fresh runtime tour instance begins. | Manual + E2E (§2.1, test #6) |
| 5 | Target DOM element is missing at step time (component not yet rendered) | Step waits up to 5s (MutationObserver + 100ms poll). If timeout, step is skipped, `onboardingEvents.targetMissing()` fires. Tour continues to next step. | Unit test (§1.3, `waitingForTargets → errored` for all-missing; step skip for single missing) |
| 6 | User changes route mid-tour (`/workshop` → `/workshop/projects`) | Tour pauses. State (current step index, tour key) preserved in `useOnboardingTourController` context/Zustand. When user returns to `/workshop`, tour resumes if paused <30s. After 30s, auto-skips. | E2E (§2.2, test #1 — implicit route change) |
| 7 | User logs out mid-tour | Tour runtime cleans up: Joyride unmounts, context resets. No tour residue on next login (tour state was either persisted to step index before logout, or resumed if user logs back in). | Manual |
| 8 | Slow Supabase response (network latency >3s) | `useOnboardingState` shows loading indicator. Tour does not start until fetch resolves. If fetch fails (timeout), tour uses cached state from last successful read or defaults to "show tour" (fail-open for new users). | Unit test (§1.5, loading + error states) |
| 9 | Supabase write fails (network error on completion) | `upsertOnboardingTourState` retries up to 3 times with exponential backoff. If all retries fail, logs `onboardingEvents.error()`, shows toast "Failed to save tour progress. Please try again.", transitions state machine to `errored`. | Unit test (§1.4, concurrent upserts + error handling) |
| 10 | Route loading overlay active (from `RouteLoadingOverlay` in `AppProviders`) | Tour waits for route transition to complete before starting target detection. Tour does not render spotlight while loading overlay is visible. | Manual |
| 11 | Sidebar collapsed state on mobile | Sidebar targets (`ae-tour-main-nav-*`) set `showOnMobile: false` in step definition. Steps are skipped on mobile viewports. Tour continues normally without sidebar steps. | Manual |
| 12 | Modal opens during tour (e.g., `NewProjectModal` on projects page) | Tour transitions to `paused` state. When modal opens, Joyride spotlight does not conflict with modal backdrop (z-index: Joyride 100, modal 50 per `07:501`). Tour resumes when modal closes. | E2E (§2.2, test #2) |
| 13 | Mobile viewport (<1024px, Tailwind `lg` breakpoint) | Sidebar steps skipped. Tooltip placement uses `center` or `auto` positioning. Touch targets for Next/Previous/Skip are ≥44px (WCAG touch target). | Manual |
| 14 | Reduced motion OS preference (`prefers-reduced-motion: reduce`) | All Joyride animations disabled. `scrollToFirstStep: false`. `disableScrolling: true`. `floaterProps` options set for no animation. Spotlight appears instantly. | Manual + Unit (assert `step.showWithReducedMotion` is `false` for all steps when preference set) |
| 15 | Public shared link route (`/share/[token]`) | Zero onboarding code loaded in page bundle. `WorkshopPageShell` is not rendered (share routes use their own shell or no shell). | Bundle analysis (see §3.3 regression) |
| 16 | Marketing route (landing, pricing, etc.) | Zero onboarding code loaded. `PublicPageShell` does not import any onboarding module. | Bundle analysis (see §3.3 regression) |
| 17 | New tour version added (e.g., `first_workspace_orientation_v2`) | Existing users with `v1` completed see `v2` because `tour_key` changed. `v1` completion row does not block `v2` auto-start. `v2` is a new UNIQUE row per `(user_id, tour_key, tour_version)`. | Unit test (§1.4 — `tour_key` + `tour_version` unique constraint) |

---

## 5. Bundle and Performance Verification

### 5.1 Bundle Analysis

Run: `ANALYZE=true bun run build`

| Check | Pass Criteria | Source Reference |
|-------|-------------|------------------|
| `react-joyride` only in `/workshop` chunks | Joyride module appears only in page chunks for `/workshop` routes. Zero Joyride code in `/`, `/login`, `/share`, `/about`, `/pricing`, `/contact`, `/privacy`, `/terms`, `/invite` chunks. | `03_recommended_architecture.md:336–339` — lazy-loading strategy, `04:396–400` — exclusion verification grep commands |
| Joyride gzipped size <30KB in `/workshop` | The Joyride package plus custom tooltip adds ≤30KB gzipped to the `/workshop` page bundle. | `00_executive_summary.md:28` — "~30KB gzipped" |
| Feature flag OFF → zero Joyride loaded | With `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=false`, the `next/dynamic` import is tree-shaken. Zero Joyride code in ANY bundle. | `03:146` — "At false, the next/dynamic import is tree-shaken" |

### 5.2 Lighthouse Verification

Run Lighthouse (desktop, simulated throttling) on `/workshop` with tour feature flag ON (but tour NOT active — user has already completed tours).

| Metric | Pass Criteria |
|--------|-------------|
| Performance score | Unchanged from baseline (±2 points). No regression from Joyride dynamic import presence. |
| First Contentful Paint (FCP) | Unaffected. Joyride is lazy-loaded and does not block initial render. |
| Largest Contentful Paint (LCP) | Unaffected. |
| Total Blocking Time (TBT) | No new long tasks introduced by Joyride initialization. |
| Cumulative Layout Shift (CLS) | Zero. Tooltips render in fixed position overlays, do not shift page content. |

### 5.3 Cross-Browser Verification

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome (primary) | Target — Playwright config uses Chromium `playwright.config.ts:27` | Primary development and E2E browser |
| Firefox | Verify tour renders and functions identically. Pay attention to `MutationObserver` behavior (Firefox has slightly different timing). | Manual QA only |
| Safari | Verify on Safari 18+. Check for `:focus-visible` tooltip behavior, reduced motion support. | Manual QA only |
| Edge | Verify. Edge Chromium should match Chrome behavior identically. | Manual QA only |

---

## 6. Test File Inventory

| Test File | Layer | Target Source | Expected Test Count | Phase |
|-----------|-------|--------------|---------------------|-------|
| `tests/vitest/onboarding/tourRegistry.test.ts` | Vitest | `src/features/onboarding/config/tourRegistry.ts`, `tourKeys.ts` | 8–10 tests | Phase 6 |
| `tests/vitest/onboarding/tourTargets.test.ts` | Vitest | `src/features/onboarding/config/tourTargets.ts` | 5 tests | Phase 2 (can be written immediately after `tourTargets.ts` exists) |
| `tests/vitest/onboarding/tourStateMachine.test.ts` | Vitest | `src/features/onboarding/hooks/useOnboardingTourController.ts` | 15 tests | Phase 6 |
| `tests/vitest/onboarding/onboardingPersistence.test.ts` | Vitest | `src/lib/onboarding/actions.ts` | 9 tests | Phase 4 (can be written when server actions exist) |
| `tests/vitest/onboarding/useOnboardingState.test.ts` | Vitest | `src/features/onboarding/hooks/useOnboardingState.ts` | 6 tests | Phase 6 |
| `tests/vitest/onboarding/OnboardingRuntime.test.tsx` | Vitest | `src/features/onboarding/components/OnboardingRuntime.tsx` | 6 tests | Phase 3 (when runtime wired) |
| `tests/vitest/onboarding/OnboardingTooltip.test.tsx` | Vitest | `src/features/onboarding/components/OnboardingTooltip.tsx` | 9 tests | Phase 5 (when tooltip styled) |
| `tests/vitest/onboarding/OnboardingProvider.test.tsx` | Vitest | `src/features/onboarding/components/OnboardingProvider.tsx` | 3 tests | Phase 3 |
| `e2e/onboarding-workspace-orientation.spec.ts` | Playwright | All MVP components | 7 tests | Phase 6 |
| `e2e/onboarding-project-creation.spec.ts` | Playwright | Project creation tour surfaces | 3 tests | Phase 6 |
| `e2e/onboarding-estimate-sheet.spec.ts` | Playwright | Estimate sheet tour surfaces | 3 tests | Phase 6 |
| `e2e/onboarding-regression.spec.ts` | Playwright | Regression guard across all routes | 4 tests | Phase 6 |

**Total planned tests:** ~78 unit/component + 17 E2E = **95 tests**

---

## 7. Test Execution Order per Phase

| Phase | When to Write | When to Run |
|-------|--------------|-------------|
| Phase 1 (skeleton) | No tests yet — types-only | — |
| Phase 2 (target markers) | `tourTargets.test.ts` (target uniqueness, naming, ownership) | `bun run test:dom` |
| Phase 3 (runtime) | `tourRegistry.test.ts`, `tourStateMachine.test.ts`, `OnboardingRuntime.test.tsx`, `OnboardingProvider.test.tsx` | `bun run test:dom` |
| Phase 4 (persistence) | `onboardingPersistence.test.ts` | `bun run test:dom` |
| Phase 5 (UX polish) | `OnboardingTooltip.test.tsx` | `bun run test:dom` |
| Phase 6 (testing) | `useOnboardingState.test.ts`, all E2E specs | `bun run test:dom && bun run test:e2e` |

---

## 8. Validation Gate

Before declaring onboarding implementation complete, the following must all pass:

```bash
# Full validation matrix
bun run validate          # type-check + lint + lint:design-system + bun test + vitest (161+8=169 test files)
bun run build             # Next.js production build
ANALYZE=true bun run build  # Bundle analysis verification (zero Joyride in public chunks)
bun run test:e2e          # Playwright E2E (12+4=16 spec files)

# Manual verification
# - MVP checklist all checked
# - Edge cases all verified
# - Accessibility audit pass
# - Cross-browser pass (Chrome/Firefox/Safari/Edge)
# - Lighthouse score unchanged
```

---

## 9. Quality Scorecard Self-Check

| Criterion | Status | Evidence |
|-----------|--------|----------|
| All test files target specific source files | ✅ Pass | Every test section references exact source file path and plan document section |
| Test file paths match existing conventions | ✅ Pass | `tests/vitest/onboarding/` for Vitest, `e2e/` for Playwright — matches existing layout |
| Test patterns match existing codebase | ✅ Pass | `vi.mock` / `vi.hoisted()` from `auth-onboarding-guard.test.ts`, `@testing-library/react` from existing 161 files, Playwright `storageState` from `playwright.config.ts:16` |
| State machine tests are exhaustive | ✅ Pass | 14 transitions explicitly tested, invalid transitions throw |
| RLS security tests included | ✅ Pass | §1.4: unauthorized read/write tests |
| Edge cases table is comprehensive | ✅ Pass | 17 edge cases covering auth, persistence, routing, mobile, accessibility, bundle |
| Manual QA checklist is actionable | ✅ Pass | Each checkbox is a single observable behavior |
| Regression gates include existing test suites | ✅ Pass | §3.3 references exact counts: 161 vitest, 2 bun, 12 e2e |
| Bundle analysis integrated | ✅ Pass | §5.1 references `ANALYZE=true bun run build` |
| Phase-to-test mapping provided | ✅ Pass | §7 maps each phase to test files |
