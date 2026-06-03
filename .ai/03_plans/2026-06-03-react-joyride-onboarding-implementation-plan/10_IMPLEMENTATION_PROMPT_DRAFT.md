# 10 — Implementation Prompt Draft

**Purpose:** Ready-to-use prompt for a future AI implementation agent to execute Phase 1 of the ArchEstimator React Joyride onboarding system.
**Plan folder:** `.ai/03_plans/2026-06-03-react-joyride-onboarding-implementation-plan/`
**Status:** DRAFT — use after stakeholder Phase 0 review and approval

---

## Instructions for the Implementation Agent

### Before You Begin

1. **Verify plan against current repo reality.** Re-read this entire plan folder. Check that files referenced still exist. Run `git status --short --branch`. Confirm `package.json` versions. If anything has drifted, report it — do not proceed blindly.

2. **Implement ONE PHASE AT A TIME.** Do not implement more than the requested phase. Phase 1 is safe, reversible, and zero-risk. Later phases depend on Phase 1 success.

3. **Do not implement more than requested.** If told "implement Phase 1", do ONLY Phase 1. Do not place target markers, create the runtime, or write tour content.

4. **Add/update tests** for every phase. Follow the existing test patterns (`tests/vitest/` for DOM, `tests/unit/` for Bun). See `06_TESTING_AND_VERIFICATION_PLAN.md` for specific test requirements.

5. **Update .ai docs** after each phase: record progress in `.ai/10_state/current-state.md`, log decisions in `.ai/10_state/decisions.md`, and add dated entries to `.ai/05_logs/`.

6. **Create bug plans** in `.ai/15_Bugs/` if issues are discovered during implementation.

7. **Archive the plan** after successful implementation to `.ai/09_archive/store/`.

8. **Commit and push** after each phase with clear commit messages. Use feature branches; do NOT merge to `main` automatically.

### Merge Policy

- Default repo policy (`.ai/10_state/decisions.md`): feature branches/PRs, no automatic `main` merge
- Only merge to `main` if Philip's implementation prompt explicitly authorizes it

---

## Recommended First Implementation Prompt: Phase 1 Only

Copy the prompt below and provide it to your implementation AI agent:

---

```
IMPLEMENTATION TASK: ArchEstimator React Joyride Onboarding — Phase 1 (Package & Skeleton)

PLAN FOLDER: .ai/03_plans/2026-06-03-react-joyride-onboarding-implementation-plan/
MUST READ: 00_INDEX.md, 03_ARCHITECTURE_AND_DESIGN_PLAN.md, 04_IMPLEMENTATION_SEQUENCE.md (Phase 1 section)

PHASE 1 GOAL: Install react-joyride, create a no-op onboarding feature folder behind a feature flag. Zero user-visible behavior. Fully reversible.

SCOPE:
- Install react-joyride via `bun add react-joyride`
- Create `src/features/onboarding/` with the following files:
  - `types.ts` — Tour, TourStep, TourCompletion interfaces
  - `config/tourRegistry.ts` — empty tour registry with documented constants
  - `config/tourTargets.ts` — empty target constants file
  - `components/OnboardingRuntime.tsx` — `'use client'` component that renders `<Joyride steps={[]} run={false} />` behind feature flag
  - `index.ts` — barrel export
- Wire `OnboardingRuntime` into `WorkshopPageShell` via `next/dynamic` with `ssr: false`
- Set `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=false` in `.env.example` (default off)
- Gate the dynamic import: if flag is `false`, do not even execute `dynamic(() => import(...))`

WHAT NOT TO TOUCH:
- Do NOT modify any existing workshop components
- Do NOT add `data-tour` attributes (Phase 2)
- Do NOT create Supabase migrations (Phase 4)
- Do NOT create tour content or copy (Phase 5)
- Do NOT modify public routes or `PublicPageShell`
- Do NOT modify `package.json` beyond the `bun add` (lockfile changes expected and acceptable)
- Do NOT modify `src/app/layout.tsx` or `src/app/providers.tsx`

VERIFICATION (run after implementation):
1. `bun run type-check` — must pass with zero new errors
2. `bun run lint` — must pass with no new warnings
3. `bun run lint:design-system` — must pass (no UI changes)
4. `bun run build` — must produce a successful build
5. `bun run validate` — full gate must pass
6. Manual: start dev server (`bun run dev`), navigate to `/workshop`, verify no visible onboarding UI, no console errors
7. Manual: set `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=true`, restart dev, navigate to `/workshop`, verify Joyride renders but shows no steps (empty array)
8. Verify `next/dynamic` with `ssr: false` does not cause hydration mismatches

REVERSIBILITY: Revert the commit. The app must work identically. The only residue is `react-joyride` in `node_modules` (harmless).

AFTER COMPLETION:
- Commit with message: `feat(onboarding): add react-joyride package and no-op runtime skeleton behind feature flag`
- Push to feature branch
- Update `.ai/10_state/current-state.md` with Phase 1 completion note
- Report build size impact: run `ANALYZE=true bun run build` to confirm Joyride does not appear in initial bundle when flag is off

DO NOT PROCEED TO PHASE 2. This is Phase 1 ONLY.
```

---

## Future Phase Prompts (Use After Phase 1 Success)

### Phase 2 Prompt (Target Markers)

```
IMPLEMENTATION TASK: ArchEstimator React Joyride Onboarding — Phase 2 (Target Markers)

PLAN FOLDER: .ai/03_plans/2026-06-03-react-joyride-onboarding-implementation-plan/

PHASE 2 GOAL: Add stable `data-tour` attributes to key workshop UI elements for Joyride targeting.

SCOPE:
- Populate `src/features/onboarding/config/tourTargets.ts` with target constants (see `07_tour_registry_and_targeting_plan.md` for canonical names)
- Add `data-tour` attributes to MVP targets only (Workspace Orientation tour):
  - `MainSidebar` nav items: `data-tour="ae-tour-main-nav-workshop"`, `data-tour="ae-tour-main-nav-projects"`, `data-tour="ae-tour-main-nav-components"`
  - `WorkshopHomebaseClient` destination cards: `data-tour="ae-tour-homebase-projects-card"`, `data-tour="ae-tour-homebase-components-card"`
  - `HeaderIconToolbar` (if present on homebase): `data-tour="ae-tour-workshop-shell"`
- Use `data-tour` attributes ONLY (NOT `data-testid`)
- Target stable wrapper elements, not fragile CSS classes
- Do NOT modify generic UI primitives in `src/components/ui/`

WHAT NOT TO TOUCH:
- Do NOT add runtime/tour controller logic
- Do NOT create tour step content
- Do NOT modify public routes

VERIFICATION:
1. `bun run validate` must pass
2. `bun run lint:design-system` must pass
3. Manual: inspect rendered HTML at `/workshop`, confirm `data-tour` attributes appear on correct elements
4. `git grep "data-tour" src/` should return the expected files
```

### Phase 3 Prompt (Runtime & Controller)

```
IMPLEMENTATION TASK: ArchEstimator React Joyride Onboarding — Phase 3 (Runtime & Controller)

PLAN FOLDER: .ai/03_plans/2026-06-03-react-joyride-onboarding-implementation-plan/

PHASE 3 GOAL: Implement the OnboardingRuntime, tour controller, and first Workspace Orientation tour.

SCOPE:
- Implement `OnboardingProvider.tsx` — context for active tour, step state, completion state
- Implement `useOnboardingTourController.ts` — Joyride controlled-mode state, step navigation, finish/skip
- Populate `tourRegistry.ts` with `workspace.orientation.v1` tour definition (5 steps)
- Implement `OnboardingRuntime.tsx` — full controlled-mode Joyride with route-aware tour selection
- Implement `OnboardingTooltip.tsx` — custom tooltip with design-system compliance (SF Pro, 12px max, xs radius, Phosphor icons)
- Wire route detection: `/workshop` → `workspace.orientation.v1`
- Handle target-not-found: 5-second timeout, skip step, log warning, continue tour
- Pause tour when modals open

DO NOT:
- Do NOT create persistence (Phase 4)
- Do NOT add other tour segments (future phases)
- Do NOT add manual replay trigger (Phase 5)

VERIFICATION:
1. `bun run validate` must pass
2. Manual QA: fresh account → `/workshop` → tour starts automatically
3. Test skip button, step navigation, tour completion
4. Test target-not-found scenario (remove a `data-tour` attribute and verify graceful skip)
5. Test z-index: sidebar collapsed/expanded, modal open during tour
```

### Phase 4 Prompt (Persistence)

```
IMPLEMENTATION TASK: ArchEstimator React Joyride Onboarding — Phase 4 (Persistence)

PHASE 4 GOAL: Create `user_onboarding_tours` table with RLS, implement persistence service.

SCOPE:
- Create Supabase migration: `YYYYMMDDHHMMSS_user_onboarding_tours.sql`
- Table schema: id (uuid PK), user_id (uuid FK → auth.users), workspace_id (uuid FK nullable), tour_key (text), tour_version (integer default 1), status (text check: not_started/started/completed/skipped), current_step (integer nullable), started_at/completed_at/skipped_at/last_seen_at (timestamptz), metadata (jsonb default '{}'), created_at/updated_at (timestamptz default now())
- UNIQUE constraint: (user_id, workspace_id, tour_key, tour_version)
- RLS: enable, policy for authenticated SELECT/INSERT/UPDATE own rows only
- Implement `onboardingPersistence.ts` — read/write tour completion via Supabase server actions
- Wire persistence into tour controller: on finish → markComplete(), on skip → markSkipped()
- Integrate with `getCurrentUserContext()` for user_id extraction

VERIFICATION:
1. `npx supabase db diff --linked -f test_migration` to verify schema
2. Vitest RLS tests: unauthenticated rejection, user A cannot read user B's rows
3. `bun run validate` must pass
4. Manual: complete tour, refresh, verify tour does not auto-start again
```

---

## Implementation Agent Handoff Checklist

Before you declare any phase complete, confirm:

- [ ] All verification commands pass (type-check, lint, design-system, build, validate)
- [ ] No new ESLint warnings introduced
- [ ] No design-system violations
- [ ] No production files modified outside scope
- [ ] No public routes affected
- [ ] `.ai/10_state/current-state.md` updated with phase completion
- [ ] `.ai/05_logs/` updated with dated entry
- [ ] Git commit with descriptive message pushed to feature branch
- [ ] Feature flag remains `false` by default (Phases 1-6)
- [ ] Reversibility confirmed (can revert commit, app works identically)

---

## Full Implementation Prompt (All Phases)

For reference, the complete implementation sequence is documented in `04_IMPLEMENTATION_SEQUENCE.md`. Each phase has:

- Entry criteria (what must be done before starting)
- File list (new and modified)
- Task sequence (ordered steps)
- Acceptance criteria (pass/fail checks)
- Test requirements
- Risk notes
- Rollback procedure

**Do not attempt all phases at once.** Implement one phase, verify, commit, then proceed to the next.
