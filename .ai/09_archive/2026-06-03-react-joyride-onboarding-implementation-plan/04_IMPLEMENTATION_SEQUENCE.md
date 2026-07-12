# 04 — Implementation Sequence

**Date:** 2026-06-03 (refined)
**Source:** Enhanced from `18_phase_backlog_for_future_implementation.md` + `04_implementation_matrix.md`

---

## Critical Rule

**DO NOT combine database, UI, runtime, and full tour content in one giant step.** Each phase is independently verifiable and reversible. Implement one phase, verify, commit, then proceed.

---

## Phase 0: Review & Approve Plan

**Goal:** Stakeholder reviews this planning package. Go/no-go decision.

**Tasks:**
1. Read `00_INDEX.md` and `11_READINESS_SCORECARD.md`
2. Review all 13 canonical documents
3. Answer open questions in `12_OPEN_QUESTIONS_AND_DECISIONS.md`
4. Explicit go/no-go decision

**Acceptance Criteria:**
- [ ] All open questions answered or explicitly deferred
- [ ] Go decision recorded

**Tests:** None (planning phase)

**Risks:** Stakeholder rejects React Joyride, requires alternative

**Rollback:** N/A — no code written

---

## Phase 1: Package & Architecture Skeleton

**Goal:** Install react-joyride, create no-op feature folder behind feature flag. Zero user-visible behavior. Fully reversible.

**Files Created:**
- `src/features/onboarding/types.ts`
- `src/features/onboarding/config/tourRegistry.ts` (empty, documented)
- `src/features/onboarding/config/tourTargets.ts` (empty, documented)
- `src/features/onboarding/components/OnboardingRuntime.tsx` (`'use client'`, `<Joyride steps={[]} run={false} />`)
- `src/features/onboarding/index.ts`

**Files Modified:**
- `src/app/workshop/page.tsx` — add `next/dynamic` import of `OnboardingRuntime` behind feature flag
- `package.json` — `react-joyride` added as dependency
- `bun.lock` — updated by `bun add`

**Tasks:**
1. `bun add react-joyride`
2. Create `src/features/onboarding/` folder structure with empty config files and types
3. Implement no-op `OnboardingRuntime` component
4. Wire into `WorkshopPageShell` via `next/dynamic({ ssr: false })`
5. Gate import behind `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=false` check
6. Add `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=false` to `.env.example`

**Acceptance Criteria:**
- [ ] `bun run type-check` passes
- [ ] `bun run lint` passes (no new warnings)
- [ ] `bun run build` succeeds
- [ ] `bun run validate` passes
- [ ] Bundle analysis: Joyride NOT in public page chunks when flag is `false`
- [ ] Dev server: `/workshop` renders identically with flag `false`
- [ ] Dev server: `/workshop` renders with `<Joyride steps={[]} />` when flag `true` (no visible UI)

**Tests:**
- Unit: `tourRegistry.test.ts` — validates key format
- Unit: `tourTargets.test.ts` — validates constant naming

**Risks:** React Joyride incompatible with React 19.2/Next 16.2 — **BLOCKING**. If build fails or hydration errors occur, evaluate alternatives before proceeding.

**Rollback:** Revert the commit. App works identically.

---

## Phase 2: Target Markers

**Goal:** Add `data-tour` attributes to key workshop UI elements for MVP Workspace Orientation tour.

**Files Modified:**
- `src/components/sidebar/MainSidebar.tsx` — add `data-tour` to nav items
- `src/components/workshop/WorkshopHomebaseClient.tsx` — add `data-tour` to destination cards
- `src/components/ui/header-icon-toolbar.tsx` — add `data-tour` to shell

**Files Created:**
- `src/features/onboarding/config/tourTargets.ts` — populated with MVP target constants

**MVP Targets (Workspace Orientation only):**
| Target Constant | Attribute | Component |
|----------------|-----------|-----------|
| `TOUR_WORKSHOP_SHELL` | `data-tour="ae-tour-workshop-shell"` | HeaderIconToolbar |
| `TOUR_MAIN_NAV_WORKSHOP` | `data-tour="ae-tour-main-nav-workshop"` | MainSidebar (Workshop nav item) |
| `TOUR_MAIN_NAV_PROJECTS` | `data-tour="ae-tour-main-nav-projects"` | MainSidebar (Projects nav item) |
| `TOUR_MAIN_NAV_COMPONENTS` | `data-tour="ae-tour-main-nav-components"` | MainSidebar (Library nav item) |
| `TOUR_HOMEBASE_PROJECTS` | `data-tour="ae-tour-homebase-projects-card"` | WorkshopHomebaseClient (Projects card) |
| `TOUR_HOMEBASE_COMPONENTS` | `data-tour="ae-tour-homebase-components-card"` | WorkshopHomebaseClient (Library card) |

**Acceptance Criteria:**
- [ ] `bun run validate` passes
- [ ] `bun run lint:design-system` passes (data attributes are not visual)
- [ ] `git grep "data-tour" src/` returns expected 6 files/sections
- [ ] Manual: inspect rendered HTML at `/workshop`, confirm attributes on correct elements
- [ ] Targets use `data-tour` NOT `data-testid`

**Tests:**
- DOM: `tourTargets.test.tsx` — verify target constants map to elements rendered in WorkshopHomebaseClient + MainSidebar

**Risks:** Selector drift if component markup changes. Mitigation: centralized constants file, grep-able attribute names.

**Rollback:** Remove `data-tour` attributes. App works identically.

---

## Phase 3: Runtime & Route-Aware Tour Controller

**Goal:** Implement `OnboardingRuntime`, `OnboardingProvider`, `OnboardingTooltip`, `useOnboardingTourController`. Wire first Workspace Orientation tour.

**Files Created:**
- `src/features/onboarding/components/OnboardingProvider.tsx`
- `src/features/onboarding/components/OnboardingTooltip.tsx`
- `src/features/onboarding/hooks/useOnboardingTourController.ts`
- `src/features/onboarding/config/tour.workspace-orientation.ts`

**Files Modified:**
- `src/features/onboarding/config/tourRegistry.ts` — populate with `workspace.orientation.v1`
- `src/features/onboarding/components/OnboardingRuntime.tsx` — full controlled Joyride

**First Tour: Workspace Orientation (5 steps)**
1. Welcome — target: workshop shell
2. Navigation sidebar — target: main-nav-workshop
3. Projects destination — target: homebase-projects-card
4. Component Library — target: homebase-components-card
5. You're ready — target: workshop shell (summary step)

**Acceptance Criteria:**
- [ ] Tour starts automatically on first `/workshop` visit (flag enabled, no persistence yet)
- [ ] Step navigation works: Next, Back, Skip
- [ ] Skip button visible on every step
- [ ] Escape key dismisses tour
- [ ] Navigating away stops tour gracefully
- [ ] Target-not-found: 5-second timeout, skip step, log warning
- [ ] Tour pauses when modal opens
- [ ] `bun run validate` passes

**Tests:**
- DOM: `OnboardingRuntime.test.tsx` — renders Joyride, step progression, skip
- DOM: `useOnboardingTourController.test.ts` — state transitions, route detection
- DOM: `OnboardingTooltip.test.tsx` — design system compliance

**Risks:** Z-index conflicts, target-not-found during render. Mitigation: `zIndex: 101`, target timeout.

**Rollback:** Delete tour definition from registry. App works without tour content.

---

## Phase 4: Persistence

**Goal:** Create `user_onboarding_tours` table with RLS, implement persistence service.

**Files Created:**
- `supabase/migrations/YYYYMMDDHHMMSS_user_onboarding_tours.sql`
- `src/features/onboarding/services/onboardingPersistence.ts`
- `src/features/onboarding/hooks/useOnboardingState.ts`

**Files Modified:**
- `src/features/onboarding/components/OnboardingRuntime.tsx` — wire persistence into tour lifecycle

**Acceptance Criteria:**
- [ ] Migration applies cleanly: `npx supabase db push`
- [ ] RLS: user A cannot read user B's rows (Vitest proof)
- [ ] Unauthenticated requests rejected
- [ ] Complete tour → refresh → tour does not restart
- [ ] Skip tour → sign out → sign in → tour does not auto-show
- [ ] Two tabs: complete in tab 1, refresh tab 2 → consistent state
- [ ] `bun run validate` passes

**Tests:**
- Vitest: RLS denial tests (user isolation, unauthenticated rejection)
- DOM: `useOnboardingState.test.ts` — query/mutation lifecycle
- DOM: persistence integration — complete tour, remount, verify no restart

**Risks:** Migration conflicts with linked Supabase. Mitigation: test locally first, verify migration list.

**Rollback:** Drop `user_onboarding_tours` table. Revert migration.

---

## Phase 5: UX Polish

**Goal:** Custom tooltip styling, skip/dismiss behavior polish, manual replay trigger, accessibility audit.

**Files Modified:**
- `src/features/onboarding/components/OnboardingTooltip.tsx` — full custom styling

**Files Potentially Modified:**
- `src/app/workshop/settings/` — add "Replay tour" action

**Acceptance Criteria:**
- [ ] `bun run lint:design-system` passes on all onboarding components
- [ ] Tooltip: SF Pro font, ≤12px text, 3px border radius, neutral colors
- [ ] Phosphor regular outline icons for prev/next/skip/close
- [ ] "Replay tour" accessible from Settings/Help
- [ ] Replay resets state, starts from step 1
- [ ] `prefers-reduced-motion: reduce` disables beacon animation
- [ ] Focus trap works: Tab cycles within tooltip
- [ ] Screen reader announces step changes

**Tests:**
- DOM: `OnboardingTooltip.test.tsx` — design system assertions
- Accessibility: keyboard navigation, Escape behavior (Vitest + manual)
- Visual: manual QA screenshots

**Risks:** Design-system linter blocks build. Mitigation: iterate on `styles` prop until clean.

**Rollback:** Revert tooltip to Joyride defaults (Phase 3 state).

---

## Phase 6: Testing & Hardening

**Goal:** Comprehensive test coverage, edge case handling, performance verification.

**Test Plan:**
- 8 Vitest files (~63 tests) — full detail in `06_TESTING_AND_VERIFICATION_PLAN.md`
- 4 Playwright E2E specs (Phase 7 readiness)
- 17 edge cases covered
- Manual QA checklists: accessibility, mobile, regression

**Acceptance Criteria:**
- [ ] All Vitest tests pass: `bun run test:dom`
- [ ] All Bun unit tests pass: `bun run test`
- [ ] Full gate passes: `bun run validate`
- [ ] Build passes: `bun run build`
- [ ] Lighthouse TBT < +50ms regression on `/workshop`
- [ ] Bundle size within budget (~30KB Joyride chunk)
- [ ] All 61 acceptance criteria from traceability matrix verified

**Risks:** Flaky E2E tests due to Joyride animation timing. Mitigation: disable animations in test environment.

**Rollback:** N/A — this phase adds tests, not features.

---

## Phase 7: Rollout

**Goal:** Enable in staging, QA on fresh account, deploy to production with flag off, gradual enablement.

**Acceptance Criteria:**
- [ ] Staging: `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=true`, QA full Workspace Orientation tour on fresh account
- [ ] Production: deploy with flag `false`, verify zero impact
- [ ] Gradual rollout: enable for subset, monitor, expand
- [ ] Rollback tested: set flag `false`, confirm tours disappear

**See:** `09_DEPLOYMENT_MIGRATION_AND_ROLLBACK_PLAN.md` for full rollout procedure.

---

## Implementation Matrix (MVP Surfaces)

| Surface / Route | User Objective | Existing File | Tour Key | MVP? |
|----------------|----------------|---------------|----------|------|
| `/workshop` | Understand workspace destinations | `WorkshopHomebaseClient.tsx` | `workspace.orientation.v1` | **MVP** |
| MainSidebar | Navigate between sections | `MainSidebar.tsx` | (part of workspace.orientation) | **MVP** |
| `/workshop/projects` | Create first project | `projects-page-client.tsx` | `project.create.v1` | Later |
| New Project modal | Name, image, submit | `NewProjectModal.tsx` | (part of project.create) | Later |
| `/workshop/projects/[projectId]` | Project dashboard | `ProjectDashboardClient.tsx` | `project.dashboard.v1` | Later |
| `/workshop/projects/[projectId]/estimates/[nodeId]` | Estimate tree + sheet | `EstimateWorkspaceClient.tsx` | `estimate.sheet.v1` | Later |
| `/workshop/library` | Browse component catalog | `LibraryPageClient.tsx` | `library.browse.v1` | Later |
| Settings/Help | Replay tours | Settings page | `replay.entry` | Phase 5 |

**MVP Strategy: Option C** — Registry supports route-scoped tours, but MVP implements Workspace Orientation only (Option A as first slice).
