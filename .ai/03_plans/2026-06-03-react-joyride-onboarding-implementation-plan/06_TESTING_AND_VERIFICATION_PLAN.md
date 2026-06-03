# 06 — Testing & Verification Plan

**Date:** 2026-06-03 (refined)  
**Source:** Enhanced from `15_testing_and_qa_plan.md`  
**Full detail:** See `15_testing_and_qa_plan.md` for exhaustive test specifications (8 Vitest files, 4 Playwright specs, 17 edge cases)

---

## Existing Relevant Commands

```bash
bun run type-check          # tsc --noEmit
bun run lint                # ESLint
bun run lint:design-system  # Custom design-system enforcement
bun run test                # Bun unit tests (tests/unit/)
bun run test:dom            # Vitest DOM tests (tests/vitest/)
bun run test:e2e            # Playwright E2E (Chromium)
bun run build               # Next.js production build
bun run validate            # Full gate: type-check + lint + design-system + unit + dom
git diff --check            # Whitespace validation
```

---

## Test Plan Summary

### Unit Tests (Bun — `tests/unit/`)

| Test File | What It Tests | Phase |
|-----------|---------------|-------|
| `onboarding-tour-key-format.test.ts` | Tour key validation: format `{segment}.{name}.v{version}`, version increment detection | Phase 1 |
| `onboarding-target-constants.test.ts` | `tourTargets.ts` constants: no duplicates, valid `data-tour` attribute format | Phase 2 |

### DOM Tests (Vitest + jsdom — `tests/vitest/`)

| Test File | What It Tests | Phase | Approx. Tests |
|-----------|---------------|-------|---------------|
| `onboarding-tour-registry.test.ts` | Tour registry: key registration, route mapping, version isolation | Phase 1 | 8 |
| `onboarding-runtime.test.tsx` | `OnboardingRuntime`: renders behind flag, no-op when disabled, Joyride mounts when enabled | Phase 1/3 | 10 |
| `onboarding-tooltip.test.tsx` | `OnboardingTooltip`: design-system compliance (SF Pro, 12px max, 3px radius, Phosphor icons) | Phase 5 | 8 |
| `onboarding-tour-controller.test.ts` | `useOnboardingTourController`: step navigation, skip, complete, route detection, target timeout | Phase 3 | 12 |
| `onboarding-persistence.test.ts` | `onboardingPersistence`: read/write tour state, RLS isolation, unauthenticated rejection | Phase 4 | 10 |
| `onboarding-state-hook.test.ts` | `useOnboardingState`: TanStack Query lifecycle, cache invalidation, refetch on focus | Phase 4 | 8 |
| `onboarding-accessibility.test.tsx` | Keyboard navigation, Escape behavior, focus trap, ARIA attributes, screen reader announcements | Phase 5 | 7 |
| `onboarding-target-markers.test.tsx` | `data-tour` attributes rendered on correct workshop elements | Phase 2 | 6 |

**Total: ~69 Vitest tests across 8 files**

### E2E Tests (Playwright — `e2e/`)

| Spec File | What It Tests | Phase | Notes |
|-----------|---------------|-------|-------|
| `onboarding-workspace-orientation.spec.ts` | Full tour: start, step through 5 steps, complete, verify no restart on reload | Phase 6 | Requires flag=true, fresh account |
| `onboarding-skip-and-replay.spec.ts` | Skip tour, verify no auto-show, manually replay, verify restart | Phase 6 | Requires flag=true |
| `onboarding-public-route-exclusion.spec.ts` | Visit `/login`, `/share/[token]` — verify zero onboarding JS/UI | Phase 6 | Flag can be true or false |
| `onboarding-feature-flag.spec.ts` | Toggle flag, verify tour appears/disappears | Phase 7 | Requires deployment |

---

## Edge Cases (17 Identified)

| # | Edge Case | Test Method | Phase |
|---|-----------|-------------|-------|
| 1 | Tour target not in DOM when step advances | DOM: mock `MutationObserver`, assert skip after timeout | Phase 3 |
| 2 | User rapidly clicks "Next" 5 times | DOM: assert only one step transition per click | Phase 3 |
| 3 | User opens modal during tour | DOM: assert tour pauses, resumes on modal close | Phase 3 |
| 4 | User navigates away mid-tour | DOM: simulate route change, assert tour stopped | Phase 3 |
| 5 | User refreshes page mid-tour | DOM: assert tour resumes at last persisted step | Phase 4 |
| 6 | First login — no workspace yet | Manual QA: verify tour starts after workspace bootstrap | Phase 6 |
| 7 | Feature flag changed while user has active session | Manual QA: hard refresh, verify new flag state | Phase 7 |
| 8 | JavaScript disabled | Manual QA: verify app works without onboarding (graceful degradation) | Phase 6 |
| 9 | Mobile/tablet viewport (< 1024px) | DOM: assert tour does not start on narrow viewport | Phase 5 |
| 10 | `prefers-reduced-motion: reduce` | DOM: assert beacon animation disabled, instant transitions | Phase 5 |
| 11 | Two tabs complete same tour simultaneously | DOM: mock concurrent writes, assert no duplicate rows | Phase 4 |
| 12 | User completes v1, then v2 is released | DOM: assert v2 eligibility despite v1 completion | Phase 4 |
| 13 | Skip tour, sign out, sign in as different user | DOM: assert second user sees tour (own state) | Phase 4 |
| 14 | Tour step target in a collapsed sidebar section | Manual QA: sidebar navigation target visibility | Phase 6 |
| 15 | Joyride overlay blocks interaction with non-target elements | Manual QA: verify app elements outside tooltip are clickable | Phase 5 |
| 16 | Screen reader announces step content correctly | Manual QA: VoiceOver/NVDA test | Phase 5 |
| 17 | Console has zero errors during tour lifecycle | Manual QA: browser console check through complete flow | Phase 6 |

---

## Manual QA Checklists

### Phase 3: First Tour QA (flag=true, fresh account)
- [ ] Navigate to `/workshop` — tour auto-starts
- [ ] Verify 5 steps display correct targets
- [ ] Click "Next" through all steps
- [ ] Click "Back" — verify previous step
- [ ] Press Escape — tour dismisses
- [ ] Click "Skip tour" — tour dismisses
- [ ] Verify no console errors

### Phase 5: Accessibility QA
- [ ] Tab through tooltip controls (Next, Back, Skip)
- [ ] Press Enter/Space to activate controls
- [ ] Press Escape to dismiss
- [ ] Verify focus returns to last focused element after dismiss
- [ ] Test with VoiceOver (macOS) or NVDA (Windows)
- [ ] Test with `prefers-reduced-motion: reduce`
- [ ] Verify color contrast ≥ 4.5:1 for text

### Phase 6: Regression QA
- [ ] Full `bun run validate` passes
- [ ] `bun run build` passes
- [ ] `bun run test:e2e` passed (all 4 onboarding specs)
- [ ] Public routes work identically (landing, login, share)
- [ ] No performance regression (Lighthouse audit)

---

## Pass/Fail Definitions

| Test Type | Pass | Fail |
|-----------|------|------|
| Unit test | All assertions pass | Any assertion fails |
| DOM test | All assertions pass, no console errors | Any assertion fails or unexpected console error |
| E2E test | All steps pass, no timeouts | Any step fails or timeout |
| Build | Exit code 0, expected routes listed | Build error or warning |
| Design-system lint | Exit code 0, zero violations | Any violation |
| Type-check | Exit code 0, zero errors | Any type error |
| Manual QA | All checklist items pass | Any item fails |

---

## Test Fixtures / Data Requirements

- **Fresh Supabase account** (no existing `user_onboarding_tours` rows) for first-tour tests
- **Account with completed tour** for replay/skip tests
- **Account with skipped tour** for skip persistence tests
- **Two distinct accounts** for RLS isolation tests
- **Seed data:** Not required for onboarding tests. Tour state is per-user, no dependency on project/estimate data.

---

## CI/Local Validation Notes

- All Vitest tests run with `--maxWorkers=1` (project convention for jsdom isolation)
- E2E tests require `ARCHESTIMATOR_E2E_ONBOARDING=1` env flag (mutating spec pattern)
- RLS tests require local Supabase (`npx supabase start`)
- Design-system lint runs on all app source files — onboarding components included automatically
