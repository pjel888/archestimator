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

1. `README.md` — this file: project overview, scope, non-goals, implementation sequence, and document index.
2. `00_executive_summary.md` — sharp executive summary: what should be built, why React Joyride, scoped to /workshop, recommended architecture, biggest risk, first safe slice.
3. `01_codebase_audit.md` — verified stack, routing model, auth model, database, app shell, all key components inspected, design system constraints, z-index layer analysis, 40-row audit evidence table.
4. `02_onboarding_research_and_principles.md` — research-backed onboarding principles, React Joyride planning notes, anti-patterns table, ArchEstimator onboarding philosophy, principles-to-rules mapping.
5. `03_recommended_architecture.md` — feature folder structure (`src/features/onboarding/`), provider/runtime placement, tour registry, target strategy, persistence, SSR/CSR boundary, lazy-loading, feature flag, replay mechanism.
6. `04_implementation_matrix.md` — 14-surface matrix with columns for route, user objective, existing file, tour key, data-tour targets, source changes, risk level, and MVP/Later decisions.
7. `05_file_change_map.md` — 48 files mapped across 7 phases: every new and modified file with path, purpose, dependencies, risk level, and test coverage needs.
8. `06_onboarding_flow_spec.md` — 11-state machine (idle → loadingUser → ... → completed/skipped/errored), 14 behavior specs, persistence status values, versioned tour behavior.
9. `07_tour_registry_and_targeting_plan.md` — 4 tour keys, 29 data-tour target constants with component ownership, route-aware registration, target availability rules, selector drift prevention.
10. `08_database_and_persistence_plan.md` — `user_onboarding_tours` table schema, RLS policies, server actions, TanStack Query strategy, migration naming plan, security implications.
11. `09_ui_ux_analysis.md` — first-run journey map, UI decision matrix (tooltip style, overlay, beacon, segmentation), z-index strategy, mobile/modal/empty-state integration, replay strategy.
12. `10_copywriting_and_step_content.md` — 4 tour segments (Workspace Orientation, Project Creation, Estimate Sheet, Component Library), 18 steps with title, body, target selector, placement, route.
13. `11_accessibility_plan.md` — keyboard navigation, Escape/skip behavior, focus trap/restoration, screen reader announcements, reduced motion, WCAG AA compliance, 25 acceptance criteria.
14. `12_security_and_privacy_analysis.md` — data stored/not stored, RLS policy checklist, cross-user access prevention, server action authorization, abuse cases, public/share route exclusion.
15. `13_performance_and_bundle_analysis.md` — React Joyride bundle impact (~20-25KB gzipped), lazy-loading strategy, client-only import, hydration, Suspense coordination, TanStack Query caching, performance acceptance criteria.
16. `14_blast_radius_analysis.md` — all files/routes/DB/auth flows touched, severity/likelihood/mitigation table per area, 7 safe implementation slices, rollback strategy.
17. `15_testing_and_qa_plan.md` — 8 Vitest files (~63 tests), 4 Playwright specs, 17 edge cases, manual QA checklists, accessibility/mobile/regression checklists.
18. `16_rollout_and_readiness_plan.md` — readiness checklist, 7-phase rollout (weeks 1-4), feature flag spec, closed beta integration, monitoring, 3-tier rollback, launch criteria.
19. `17_risks_decisions_and_open_questions.md` — 13 risks with severity/likelihood/mitigation, 6 open questions (3 blocking, 3 non-blocking), decision log.
20. `18_phase_backlog_for_future_implementation.md` — 7 implementation phases (Phase 0-7) with entry criteria, file lists, task sequences, acceptance criteria, tests, risks, and rollback per phase.
21. `19_quality_review_scorecard.md` — self-scoring of all 21 docs across 10 criteria (codebase specificity, implementation readiness, accuracy, strategic clarity, UX, security, performance, accessibility, testability, maintainability).
22. `FINAL_REPORT.md` — task summary, folder path, files created, branch/commit/push status, major findings, quality score table, unresolved questions, next action.

## Recommended Next Action

**"Implement Phase 1 only after review."** Do not install packages, create source files, or write migrations before this planning package is reviewed and approved. Phase 0 is review and approval — nothing happens before explicit go.

## Deletion Criteria

If Philip rejects this direction, archive this entire folder to `.ai/09_archive/store/` as a scoped planning artifact. Do not preserve it as hidden active direction. Do not leave partial implementations in the source tree.

If the planning is approved but a specific document is flagged during quality scoring, revise that document in-place and re-score. Do not split the folder or move documents mid-review.
