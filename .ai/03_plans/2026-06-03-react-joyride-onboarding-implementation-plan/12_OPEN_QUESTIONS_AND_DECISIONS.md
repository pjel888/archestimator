# 12 — Open Questions & Decisions

**Date:** 2026-06-03 (refined)  
**Source:** Enhanced from `17_risks_decisions_and_open_questions.md`

---

## Open Questions

### Blocking (Require Philip Before Implementation)

| # | Question | Context | Options | Recommendation | Status |
|---|----------|---------|---------|----------------|--------|
| Q1 | **Approve React Joyride as the onboarding library?** | Phase 1 installs the package. All three blocking questions approved together. | A) React Joyride ✅ | **RESOLVED — Philip approved 2026-06-03.** React Joyride selected. Phase 1 may proceed. | **✅ APPROVED** |
| Q2 | **Approve `src/features/onboarding/` folder structure?** | Sets precedent for future feature folders. | A) `src/features/onboarding/` ✅ | **RESOLVED — Philip approved 2026-06-03.** Feature folder structure confirmed. | **✅ APPROVED** |
| Q3 | **Approve `user_onboarding_tours` table schema?** | Must match before migration is created. | Dedicated table with versioned keys, RLS, UNIQUE constraint ✅ | **RESOLVED — Philip approved 2026-06-03.** Schema confirmed. Migration may be created at Phase 4. | **✅ APPROVED** |

### Non-Blocking (Implementation Agent May Decide)

| # | Question | Default Decision | Owner |
|---|----------|-----------------|-------|
| Q4 | Custom tooltip now (Phase 3) or later (Phase 5)? | **Later (Phase 5).** MVP uses Joyride `styles` prop overrides. Phase 5 builds full custom `OnboardingTooltip`. | Implementer |
| Q5 | One replay entry or per-tour replay? | **One entry in Settings/Help.** Lists completed tours, allows replay of any. | Implementer |
| Q6 | Toast notification on tour skip? ("Tour skipped. Replay anytime from Settings.") | **Yes, simple toast.** Helps users know replay is available. | Implementer |

---

## Decisions Made

| # | Decision | Rationale | Evidence |
|---|----------|-----------|----------|
| D1 | Use React Joyride (not Shepherd, Intro.js, React Tour, or custom) | React-native, controlled mode, custom tooltip support, 20k+ stars, battle-tested since 2016 | `02_onboarding_research_and_principles.md` |
| D2 | Feature folder: `src/features/onboarding/` | Clean isolation, co-located tests, follows feature-folder convention | `03_recommended_architecture.md` |
| D3 | Mount runtime in `WorkshopPageShell`, NOT `providers.tsx` | Scopes to authenticated workspace only. Public routes remain untouched. | `01_codebase_audit.md` |
| D4 | Route-scoped tours (Option C) with Workspace Orientation as MVP first slice | Registry supports multiple tours, but MVP implements one. Low risk, extensible. | `00_executive_summary.md` |
| D5 | Feature flag: `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=false` | Follows existing `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` pattern. Kill switch. | `WorkshopPageShell.tsx` precedent |
| D6 | Supabase persistence, NOT localStorage | Server-authoritative. Survives browser clear. RLS-enforced. | 48 existing RLS migrations prove pattern |
| D7 | `data-tour` attributes for targeting, NOT CSS classes | Stable, grep-able, centralized constants. Resistant to CSS refactoring. | `07_tour_registry_and_targeting_plan.md` |
| D8 | 5-second target timeout, skip on miss | Don't block the tour indefinitely if target isn't in DOM yet. | `17_risks_decisions_and_open_questions.md` |
| D9 | Joyride `zIndex: 101` | Above all current Archestimator UI layers (sidebar, modals, route overlay at ≤z-100) | `09_ui_ux_analysis.md` |
| D10 | Pause tour when modals open | Prevents z-index fights and confusing UX | `17_risks_decisions_and_open_questions.md` |
| D11 | Skip is permanent for that tour version | User is never forced to re-take a tour. Replay is opt-in only. | Product onboarding principles |
| D12 | No DELETE on `user_onboarding_tours` | Rows persist for audit. Replay updates existing row (UPSERT). | Standard RLS audit pattern |
| D13 | **All three blocking questions approved by Philip on 2026-06-03** | React Joyride selected, `src/features/onboarding/` folder confirmed, `user_onboarding_tours` schema confirmed. No blockers remain. | Owner approval — all recommendations accepted as-is. |

---

## Assumptions

| # | Assumption | Validation Method | Risk if Wrong |
|---|-----------|-------------------|---------------|
| A1 | React Joyride works with React 19.2 / Next 16.2 | Phase 1 skeleton: install, build, test | HIGH — would require alternative library |
| A2 | `WorkshopPageShell` remains the authenticated shell | Verify during implementation | MEDIUM — would need different integration point |
| A3 | Existing Supabase client works for new table | Vitest test during Phase 4 | LOW — 48 migrations prove pattern works |
| A4 | Users reach `/workshop` after authentication | `proxy.ts` enforces this | LOW — existing auth gate proven |
| A5 | Desktop-only for closed beta (≥1024px viewport) | Per owner decision in roadmap | LOW — onboarding skips on mobile |
| A6 | No concurrent conflicting changes to `WorkshopPageShell` | Git status check before Phase 1 | MEDIUM — would need merge resolution |

---

## Items Requiring Philip

1. ~~Approve React Joyride (Q1)~~ — **APPROVED 2026-06-03.** React Joyride selected.
2. ~~Approve feature folder location (Q2)~~ — **APPROVED 2026-06-03.** `src/features/onboarding/` confirmed.
3. ~~Approve persistence schema (Q3)~~ — **APPROVED 2026-06-03.** `user_onboarding_tours` table confirmed.
4. **Review tour copy** — content in `10_copywriting_and_step_content.md` needs product owner review (non-blocking, can proceed)
5. **Decide rollout timing** — when to enable in production (Phase 7, not blocking Phase 1)

## Items Implementation Agent May Decide

- Exact z-index value (within 100-110 range)
- Toast notification library/pattern for tour skip feedback
- Test assertion library specifics (Vitest `expect` is the standard)
- Exact tooltip pixel dimensions (within design-system constraints)
- TanStack Query `staleTime` for onboarding state (recommend: 5 minutes)
- Whether to use `requestAnimationFrame` polling or `MutationObserver` for target detection
