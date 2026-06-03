# 13 — Traceability Matrix

**Purpose:** Map every requirement to its acceptance criterion, affected files, implementation phase, test method, risk, and current status.  
**Date:** 2026-06-03 (refined)

---

## Matrix Columns

| Column | Description |
|--------|-------------|
| **Req ID** | Requirement identifier from `01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md` |
| **Acceptance Criterion** | Binary pass/fail check |
| **Files/Modules Likely Affected** | Exact source files modified/created during implementation |
| **Implementation Phase** | Phase 1-7 from `04_IMPLEMENTATION_SEQUENCE.md` |
| **Test/Verification Method** | How to prove this works (unit, DOM, E2E, manual QA, linter) |
| **Risk/Rollback Note** | What could go wrong and how to undo |
| **Status** | NOT_STARTED / IN_PROGRESS / VERIFIED / BLOCKED |

---

## Traceability Table

### FR-1: Route-Scoped Tour Segments

| Req ID | Acceptance Criterion | Files Affected | Phase | Test Method | Risk/Rollback | Status |
|--------|---------------------|----------------|-------|-------------|---------------|--------|
| FR-1 | AC-FR1-1: `/workshop` → Workspace Orientation activates | `src/features/onboarding/config/tourRegistry.ts`, `src/features/onboarding/hooks/useOnboardingTourController.ts`, `src/app/workshop/page.tsx` | Phase 3 | DOM test: render WorkshopPageShell, verify tour starts. E2E: navigate to /workshop, verify tooltip visible. | Risk: route detection fails. Rollback: revert tourRegistry entry. | NOT_STARTED |
| FR-1 | AC-FR1-2: `/workshop/projects` → Project Creation activates | `src/features/onboarding/config/tour.project-create.ts`, `src/app/workshop/projects/page.tsx` | Phase 3+ | DOM test: render projects page, verify correct tour selected. | Risk: route mismatch. Rollback: remove tour registration. | NOT_STARTED |
| FR-1 | AC-FR1-3: Navigating away gracefully terminates tour | `src/features/onboarding/components/OnboardingRuntime.tsx` | Phase 3 | DOM test: start tour, simulate route change, verify tour stopped. | Risk: tour leaks across routes. Rollback: add route-change cleanup in useEffect. | NOT_STARTED |
| FR-1 | AC-FR1-4: Each tour independently completable | `src/features/onboarding/services/onboardingPersistence.ts` | Phase 4 | DOM test: complete tour A, verify tour B still eligible. | Risk: shared state between tours. Rollback: ensure per-tour-key isolation. | NOT_STARTED |

### FR-2: Versioned Tour Keys

| Req ID | Acceptance Criterion | Files Affected | Phase | Test Method | Risk/Rollback | Status |
|--------|---------------------|----------------|-------|-------------|---------------|--------|
| FR-2 | AC-FR2-1: Keys follow `{segment}.{name}.v{version}` pattern | `src/features/onboarding/config/tourRegistry.ts` | Phase 1 | Unit test: validate key format. | Low risk. Rollback: fix key string. | NOT_STARTED |
| FR-2 | AC-FR2-2: Changing step content increments version | `src/features/onboarding/config/tour.*.ts` | Phase 3 | Code review: verify version bump on content change. | Low risk. Rollback: revert version. | NOT_STARTED |
| FR-2 | AC-FR2-3: Completed v1 not shown again | `src/features/onboarding/services/onboardingPersistence.ts` | Phase 4 | DOM test: mark tour complete, reload, verify tour does not start. | Risk: version comparison bug. Rollback: fix query filter. | NOT_STARTED |
| FR-2 | AC-FR2-4: Completed v1 eligible for v2 | `src/features/onboarding/services/onboardingPersistence.ts` | Phase 4 | DOM test: mark v1 complete, release v2, verify v2 eligible. | Risk: version matching too broad. Rollback: fix version filter. | NOT_STARTED |

### FR-3: Per-User Completion Persistence

| Req ID | Acceptance Criterion | Files Affected | Phase | Test Method | Risk/Rollback | Status |
|--------|---------------------|----------------|-------|-------------|---------------|--------|
| FR-3 | AC-FR3-1: Refresh does not restart completed tour | `src/features/onboarding/hooks/useOnboardingState.ts`, `src/features/onboarding/services/onboardingPersistence.ts`, `supabase/migrations/*_user_onboarding_tours.sql` | Phase 4 | DOM test: complete tour, remount component, verify tour does not start. | Risk: TanStack Query cache returns stale null. Rollback: invalidate query on completion. | NOT_STARTED |
| FR-3 | AC-FR3-2: Skipped tour not auto-shown on subsequent logins | Same as above | Phase 4 | E2E: skip tour, sign out, sign in, verify no tour. | Risk: status check incorrectly filters. Rollback: verify status column check. | NOT_STARTED |
| FR-3 | AC-FR3-3: Completion survives browser close/device change | `supabase/migrations/*_user_onboarding_tours.sql` | Phase 4 | Manual QA: complete tour on device A, sign in on device B, verify no tour. | Risk: client-side fallback overrides server state. Rollback: remove localStorage fallback. | NOT_STARTED |
| FR-3 | AC-FR3-4: Two tabs see consistent state | `src/features/onboarding/hooks/useOnboardingState.ts` | Phase 4 | Manual QA: open two tabs, complete tour in tab 1, refresh tab 2, verify consistent. | Risk: stale client cache. Rollback: add TanStack Query refetchOnWindowFocus. | NOT_STARTED |

### FR-4: Manual Replay

| Req ID | Acceptance Criterion | Files Affected | Phase | Test Method | Risk/Rollback | Status |
|--------|---------------------|----------------|-------|-------------|---------------|--------|
| FR-4 | AC-FR4-1: "Replay tour" in Settings/Help | `src/app/workshop/settings/`, `src/features/onboarding/components/`, `src/features/onboarding/hooks/useOnboardingTourController.ts` | Phase 5 | DOM test: click replay, verify tour restarts. | Risk: no UI for replay. Rollback: add menu item. | NOT_STARTED |
| FR-4 | AC-FR4-2: Replay resets state, starts from step 1 | Same as above | Phase 5 | DOM test: complete step 3, replay, verify at step 1. | Risk: stale step state persists. Rollback: reset step index on replay. | NOT_STARTED |
| FR-4 | AC-FR4-3: Replay updates existing persistence row | `src/features/onboarding/services/onboardingPersistence.ts` | Phase 5 | DOM test: replay completed tour, verify UPSERT not INSERT. | Risk: duplicate rows created. Rollback: use ON CONFLICT upsert. | NOT_STARTED |

### FR-5: Skip & Dismiss

| Req ID | Acceptance Criterion | Files Affected | Phase | Test Method | Risk/Rollback | Status |
|--------|---------------------|----------------|-------|-------------|---------------|--------|
| FR-5 | AC-FR5-1: "Skip tour" visible on every step | `src/features/onboarding/components/OnboardingTooltip.tsx` | Phase 3 | DOM test: render each step, assert skip button present. | Risk: button hidden by styling. Rollback: fix tooltip layout. | NOT_STARTED |
| FR-5 | AC-FR5-2: Skip persists `status: 'skipped'` | `src/features/onboarding/services/onboardingPersistence.ts` | Phase 4 | DOM test: skip tour, verify DB row has status='skipped'. | Risk: skip writes wrong status. Rollback: fix status enum. | NOT_STARTED |
| FR-5 | AC-FR5-3: Escape key skips tour | `src/features/onboarding/components/OnboardingRuntime.tsx` | Phase 3 | DOM test: press Escape during tour, verify tour dismissed. | Risk: Escape conflicts with modal close. Rollback: check active element context. | NOT_STARTED |
| FR-5 | AC-FR5-4: Skipped tours not auto-shown again | Same as AC-FR3-2 | Phase 4 | E2E: skip, sign out/in, verify no tour. | Same as FR-3. | NOT_STARTED |

### FR-6: Feature Flag Gating

| Req ID | Acceptance Criterion | Files Affected | Phase | Test Method | Risk/Rollback | Status |
|--------|---------------------|----------------|-------|-------------|---------------|--------|
| FR-6 | AC-FR6-1: Flag `false` → app identical | `src/app/workshop/page.tsx`, `src/features/onboarding/components/OnboardingRuntime.tsx` | Phase 1 | Manual QA: compare before/after screenshots. Build: verify no Joyride in bundle. | Risk: conditional import still loads code. Rollback: check dynamic import gating. | NOT_STARTED |
| FR-6 | AC-FR6-2: Flag `false` → Joyride not in bundle | `src/app/workshop/page.tsx` | Phase 1 | Build: `ANALYZE=true bun run build`, verify Joyride absent. | Risk: static import instead of dynamic. Rollback: fix to `next/dynamic`. | NOT_STARTED |
| FR-6 | AC-FR6-3: Flag `true` → onboarding activates | Same as AC-FR6-1 | Phase 3 | Manual QA: set flag true, sign in, verify tour appears. | Low risk. | NOT_STARTED |
| FR-6 | AC-FR6-4: Flag change takes effect next page load | N/A (Next.js env behavior) | Phase 1 | Manual QA: change flag, hard refresh, verify. | Low risk — standard Next.js behavior. | NOT_STARTED |

### FR-7: Workspace-Only Scope

| Req ID | Acceptance Criterion | Files Affected | Phase | Test Method | Risk/Rollback | Status |
|--------|---------------------|----------------|-------|-------------|---------------|--------|
| FR-7 | AC-FR7-1: Public routes don't bundle Joyride | `src/app/layout.tsx`, `src/app/workshop/page.tsx` | Phase 1 | Build: `ANALYZE=true bun run build`, verify Joyride only in workspace chunks. | Risk: Joyride imported in shared provider. Rollback: move import to workshop-only. | NOT_STARTED |
| FR-7 | AC-FR7-2: `/login` loads zero onboarding JS | `src/app/login/page.tsx` (no change expected) | Phase 3 | Build + manual: verify login page bundle. | Risk: global provider includes onboarding. Rollback: scope to WorkshopPageShell. | NOT_STARTED |
| FR-7 | AC-FR7-3: `/share/[token]` loads zero onboarding JS | `src/app/share/[token]/page.tsx` (no change expected) | Phase 3 | Build + manual: verify share page bundle. | Same as above. | NOT_STARTED |
| FR-7 | AC-FR7-4: `/workshop` loads onboarding (flag=true) | `src/app/workshop/page.tsx` | Phase 3 | Manual QA: navigate to /workshop, verify onboarding runtime active. | Low risk. | NOT_STARTED |

### NFR-1: Bundle Size

| Req ID | Acceptance Criterion | Files Affected | Phase | Test Method | Risk/Rollback | Status |
|--------|---------------------|----------------|-------|-------------|---------------|--------|
| NFR-1 | AC-NFR1-1: Joyride only in workspace chunks | `src/app/workshop/page.tsx` | Phase 1 | `ANALYZE=true bun run build`, inspect chunk map. | Risk: Joyride bundled globally. Rollback: verify dynamic import path. | NOT_STARTED |
| NFR-1 | AC-NFR1-2: Joyride chunk ~25-30KB gzipped | `node_modules/react-joyride/` | Phase 1 | Build analyzer + `du -sh` on output. | Risk: larger than expected. Rollback: evaluate tree-shaking. | NOT_STARTED |
| NFR-1 | AC-NFR1-3: Flag `false` → zero additional bytes | `src/app/workshop/page.tsx` | Phase 1 | Build analyzer comparison before/after. | Risk: conditional import still included. Rollback: verify gate logic. | NOT_STARTED |

### NFR-2: Lazy Loading

| Req ID | Acceptance Criterion | Files Affected | Phase | Test Method | Risk/Rollback | Status |
|--------|---------------------|----------------|-------|-------------|---------------|--------|
| NFR-2 | AC-NFR2-1: `next/dynamic` with `ssr: false` | `src/app/workshop/page.tsx` | Phase 1 | Code review: verify import pattern. | Low risk — proven pattern in codebase (Copilot button). | NOT_STARTED |
| NFR-2 | AC-NFR2-2: No onboarding markup in SSR HTML | `src/app/workshop/page.tsx` | Phase 1 | `curl localhost:3000/workshop | grep -i joyride` → empty. | Risk: SSR leak. Rollback: verify `ssr: false`. | NOT_STARTED |
| NFR-2 | AC-NFR2-3: Lighthouse TBT +<50ms on /workshop | N/A (perf measurement) | Phase 6 | Lighthouse audit before/after. | Risk: Joyride initialization blocks main thread. Rollback: defer initialization. | NOT_STARTED |

### NFR-3: RLS Enforcement

| Req ID | Acceptance Criterion | Files Affected | Phase | Test Method | Risk/Rollback | Status |
|--------|---------------------|----------------|-------|-------------|---------------|--------|
| NFR-3 | AC-NFR3-1: RLS policy `auth.uid() = user_id` | `supabase/migrations/*_user_onboarding_tours.sql` | Phase 4 | Vitest: RLS denial test. SQL: `EXPLAIN` policy. | Risk: policy misconfigured. Rollback: drop and recreate policy. | NOT_STARTED |
| NFR-3 | AC-NFR3-2: No DELETE policy | `supabase/migrations/*_user_onboarding_tours.sql` | Phase 4 | Vitest: attempt DELETE, verify rejected. | Low risk. Rollback: add policy if needed later. | NOT_STARTED |
| NFR-3 | AC-NFR3-3: User A cannot read user B's rows | `tests/vitest/onboarding-persistence.test.ts` | Phase 4 | Vitest: insert as user A, query as user B, verify empty. | Risk: overly permissive policy. Rollback: tighten USING clause. | NOT_STARTED |
| NFR-3 | AC-NFR3-4: Unauthenticated rejected | `tests/vitest/onboarding-persistence.test.ts` | Phase 4 | Vitest: anonymous query, verify 401/error. | Low risk. | NOT_STARTED |

### UX-3: Design System Compliance

| Req ID | Acceptance Criterion | Files Affected | Phase | Test Method | Risk/Rollback | Status |
|--------|---------------------|----------------|-------|-------------|---------------|--------|
| UX-3 | AC-UX3-1: `bun run lint:design-system` passes | `src/features/onboarding/components/OnboardingTooltip.tsx` | Phase 5 | Run linter on onboarding components. | Risk: Joyride default styles violate system. Rollback: override via `styles` prop. | NOT_STARTED |
| UX-3 | AC-UX3-2: Tooltip text ≤ 12px | `src/features/onboarding/components/OnboardingTooltip.tsx` | Phase 5 | Design-system linter + visual check. | Risk: inline style overrides. Rollback: use Tailwind classes. | NOT_STARTED |
| UX-3 | AC-UX3-3: 3px border radius | `src/features/onboarding/components/OnboardingTooltip.tsx` | Phase 5 | Design-system linter + visual check. | Low risk. Rollback: override Joyride `styles` prop. | NOT_STARTED |
| UX-3 | AC-UX3-4: Phosphor regular outline icons | `src/features/onboarding/components/OnboardingTooltip.tsx` | Phase 5 | Design-system linter + visual check. | Low risk. | NOT_STARTED |

---

## Implementation Phase → Requirement Cross-Reference

| Phase | Requirements Addressed |
|-------|----------------------|
| Phase 1 | FR-6 (feature flag), NFR-1 (bundle size), NFR-2 (lazy loading), NFR-4 (compatibility) |
| Phase 2 | FR-2 (target constants), FR-7 (workshop scope) |
| Phase 3 | FR-1 (route-scoped tours), FR-2 (versioned keys), FR-5 (skip/dismiss), UX-4 (non-intrusive) |
| Phase 4 | FR-3 (persistence), DATA-1 (schema), DATA-2 (server authority), NFR-3 (RLS) |
| Phase 5 | UX-3 (design system), UX-5 (task-based), FR-4 (replay), A11Y-1 through A11Y-5 |
| Phase 6 | All verification — tests for all MUST requirements |
| Phase 7 | FR-6 (flag gating in production), UX-2 (progressive disclosure rollout) |

---

## Coverage Summary

| Category | Total Reqs | With ACs | With Tests | With Risk Notes |
|----------|-----------|----------|------------|-----------------|
| Functional (FR) | 7 | 28 ACs | 28 test methods | 28 risk notes |
| Non-Functional (NFR) | 4 | 14 ACs | 14 test methods | 14 risk notes |
| UX/UI (UX) | 5 | 12 ACs | 12 test methods | 12 risk notes |
| Accessibility (A11Y) | 5 | 5 ACs (detailed in 07) | 5 test methods | 5 risk notes |
| Data (DATA) | 2 | 2 ACs | 2 test methods | 2 risk notes |
| **TOTAL** | **23** | **61 ACs** | **61 test methods** | **61 risk notes** |

**Status:** All requirements: NOT_STARTED (planning phase — no implementation yet)
