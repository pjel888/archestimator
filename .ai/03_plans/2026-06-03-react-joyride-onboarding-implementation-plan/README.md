# Archestimator React Joyride Onboarding Implementation Plan

**Status:** Planning-only folder
**Created:** 2026-06-03
**Route/screen:** `/workshop/*` authenticated surfaces only (gated behind `WorkshopPageShell`)
**Current pass focus:** Sustainable first-login onboarding/tutorial system design using React Joyride. Guide users through the most important product path, show contextual tooltips, persist completion per authenticated user, support future versioned tours, and allow manual replay.

## Goal

Design a complete, sustainable onboarding system for ArchEstimator that introduces new authenticated users to the workspace through guided, route-scoped tours. The system must survive app evolution by supporting versioned tour keys, per-user completion persistence via Supabase, and replay capability so users can revisit tours later. All tours scoped exclusively to `/workshop` surfaces behind the existing `WorkshopPageShell`.

## Non-goals

- **NOT implementing** any code in this planning pass.
- **NOT installing** React Joyride or any new npm packages.
- **NOT modifying** source code, creating migrations, or touching the database.
- **NOT creating** tour step content, tooltip copy, or visual designs beyond architectural references.
- **NOT designing** tours for public routes (`/`, `/login`, `/share`, `/invite`, `/about`, `/pricing`, `/contact`, `/privacy`, `/terms`).
- **NOT integrating** with analytics, event tracking, or marketing attribution systems.
- **NOT building** a tour builder/admin UI or visual tour editor.
- **NOT evaluating** alternative tour libraries beyond the documented React Joyride recommendation.
- This is a **planning-only package**. Implementation happens after review and explicit approval.

## Recommended Implementation Direction

**Option C** — a registry supporting route-scoped tour segments:

- A shared `src/features/onboarding/` feature folder with a tour registry (`tourRegistry.ts`), target constants (`tourTargets.ts`), and individual tour definitions.
- Each tour is a route-scoped segment (e.g., `workspace.orientation`, `project.create`, `estimate.sheet`, `library.browse`) with a versioned key string.
- Workspace Orientation is the MVP first tour, followed by project creation, estimate sheet, and component library.
- The `OnboardingRuntime` component mounts inside `WorkshopPageShell` (client-only, lazy-loaded) and selects the active tour based on the current route.
- Completion is persisted per-user, per-tour, per-version in a `user_onboarding_tours` Supabase table with RLS.
- A `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED` feature flag gates the entire system, default `false`.
- Manual replay is triggered from a Settings or Help menu item that resets tour state.

## Implementation Sequence (Future)

Only after this planning package is reviewed and approved:

| Phase | Scope | Expected Work |
|-------|-------|--------------|
| **Phase 0** | Review & approve | Stakeholder review of this planning package. Go/no-go decision. |
| **Phase 1** | Package + skeleton | `bun add react-joyride`. Create `src/features/onboarding/` with no-op runtime behind `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=false`. Add type definitions and tour registry constants. Zero user-visible behavior. Fully reversible. |
| **Phase 2** | Target markers | Add `data-tour` attributes to key UI elements across `/workshop` surfaces. Define target constants in `tourTargets.ts`. |
| **Phase 3** | Runtime + controller | Implement `OnboardingRuntime`, `OnboardingProvider`, `OnboardingTooltip`, `useOnboardingTourController`. Wire the first tour (Workspace Orientation). |
| **Phase 4** | Persistence | Create `user_onboarding_tours` migration. Implement `onboardingPersistence` service with Supabase reads/writes. Add RLS. Mark tours complete on finish/skip. |
| **Phase 5** | UX polish | Custom tooltip styling (design-system compliant: SF Pro, 12px max, xs radius, neutral palette, Phosphor icons). Skip/dismiss behavior. Manual replay trigger. Accessibility audit. |
| **Phase 6** | Testing | Unit tests for tour registry, persistence, controller. DOM tests for runtime rendering, step progression, skip/complete flows. E2E smoke for first-tour completion. |
| **Phase 7** | Rollout | Enable flag in staging. QA full tour on fresh account. Deploy to production with flag off. Gradual enablement. |

## Quality Target

Every planning document in this folder must score **98+ on the quality scorecard** before finalizing. Scorecard criteria include: scope clarity, non-goal completeness, risk coverage, architecture specificity, reference accuracy, and deletion criteria.

## Key Verified Context

| Fact | Evidence |
|------|----------|
| Repository | `pjel888/archestimator` on branch `main` |
| Stack | Next.js 16.2.6, React 19.2.6, TypeScript, Tailwind v4, Supabase, TanStack Query 5, Zustand 5, Bun |
| Existing onboarding table | `user_onboarding_profiles` (for signup profile completion only — NOT related to tour system) |
| Feature flag pattern | `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` env var pattern used in `WorkshopPageShell` |
| Auth shell | `WorkshopPageShell` wraps all authenticated surfaces; `PublicPageShell` for public pages |
| Analytics | No existing app-level analytics framework (only landing page GA/Clarity with consent gate) |
| Design system | Strict 12px max font, xs-only radius (3px), neutral palette (`#292929`/`#5D5D5D`/`#7F7F7F`), SF Pro fonts, Phosphor icons |
| Current tour system | None. No existing `data-tour` attributes, no tour runtime, no tour persistence |
| React Joyride | Not yet installed. Compatible with React 19 (per documentation). Needs verification at Phase 1 skeleton. |

## Documents in This Folder

1. `00_executive_summary.md` — sharp executive summary: why React Joyride, why scoped to /workshop, recommended architecture, biggest risk, first safe slice.
2. `01_product_scope_and_non_goals.md` — detailed product scope, user jobs, tour sequencing, and explicit non-goals with reasoning.
3. `02_react_joyride_evaluation.md` — React Joyride library evaluation: API surface, React 19/Next.js 16 compatibility analysis, alternatives considered, and selection rationale.
4. `03_tour_registry_and_target_system.md` — tour key constants, versioning strategy, `data-tour` attribute system, target constant definitions, and route-scoped tour mapping.
5. `04_architecture_and_component_tree.md` — feature folder layout, component hierarchy (`OnboardingRuntime`, `OnboardingProvider`, `OnboardingTooltip`), hooks, services, and types.
6. `05_tour_definitions_and_step_sequences.md` — detailed step definitions for Workspace Orientation (MVP), project creation, estimate sheet, and component library tours.
7. `06_persistence_and_supabase_schema.md` — `user_onboarding_tours` table design, RLS policies, Supabase client integration, and migration strategy.
8. `07_feature_flag_and_lazy_loading.md` — `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED` flag, dynamic import strategy, client-only guard, and bundle-size impact analysis.
9. `08_custom_tooltip_and_design_system.md` — tooltip styling specification (design-system compliant), skip/dismiss UX, progress indicators, and accessibility requirements.
10. `09_replay_and_state_reset.md` — manual tour replay trigger, state reset flows, Settings/Help menu integration, and user-initiated restart behavior.
11. `10_route_scoping_and_public_boundary.md` — why onboarding runtime must NOT bundle into public routes, `WorkshopPageShell` integration point, and public-route safety analysis.
12. `11_security_and_rls_plan.md` — RLS design for `user_onboarding_tours`, server-authority over completion state, and protection against client-side state manipulation.
13. `12_performance_and_bundle_impact.md` — lazy-load analysis, Joyride bundle size, tooltip render cost, and performance budget for onboarding runtime.
14. `13_blast_radius_and_rollback.md` — affected source files, dependency graph analysis, risk assessment, and rollback strategy per phase.
15. `14_test_strategy.md` — unit, DOM, and E2E test strategy. Coverage targets, test fixtures, and Playwright integration for tour flows.
16. `15_accessibility_and_i18n_readiness.md` — WCAG compliance for tooltips, keyboard navigation, screen-reader announcements, and i18n extension points.
17. `16_migration_and_database_plan.md` — phased database migration plan, schema evolution strategy, and backward-compatibility for tour version changes.
18. `17_ux_edge_cases_and_error_states.md` — loading states, error boundaries, session expiry during tour, concurrent tab behavior, and mobile/tablet touch behavior.
19. `18_stakeholder_review_and_approval.md` — review checklist, go/no-go criteria, and approval record template.
20. `19_implementation_handoff_checklist.md` — agent-ready implementation checklist for each phase, validation gates, and verification commands.
21. `20_quality_scorecard.md` — per-document quality scoring rubric (98+ target) and final certification checklist.

## Recommended Next Action

**"Implement Phase 1 only after review."** Do not install packages, create source files, or write migrations before this planning package is reviewed and approved. Phase 0 is review and approval — nothing happens before explicit go.

## Deletion Criteria

If Philip rejects this direction, archive this entire folder to `.ai/09_archive/store/` as a scoped planning artifact. Do not preserve it as hidden active direction. Do not leave partial implementations in the source tree.

If the planning is approved but a specific document is flagged during quality scoring, revise that document in-place and re-score. Do not split the folder or move documents mid-review.
