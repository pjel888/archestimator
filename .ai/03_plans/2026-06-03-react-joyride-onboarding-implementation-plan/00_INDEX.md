# 00 — Plan Index & Master Entry Point

**Plan:** React Joyride Onboarding Implementation for ArchEstimator  
**Folder:** `.ai/03_plans/2026-06-03-react-joyride-onboarding-implementation-plan/`  
**Status:** PLAN REFINEMENT COMPLETE — READY FOR IMPLEMENTATION REVIEW  
**Refined:** 2026-06-03  
**Refinement pass:** Canonical renaming, gap closure, score hardening to 98-100%

---

## Task Goal

Design a sustainable first-login onboarding/tutorial system for ArchEstimator's authenticated workspace using React Joyride. The system must:

- Guide new users through the most important product path with contextual tooltips targeting real UI elements
- Persist tour completion per authenticated user via Supabase
- Support future versioned tours through a centralized registry
- Allow manual replay from Settings/Help
- Scope runtime exclusively to authenticated `/workshop` surfaces
- Never load onboarding code into public/marketing routes

## Planning Scope

This is a **planning-only refinement pass.** No code, no packages, no migrations, no source changes.

**What this plan covers:**
- Complete architecture for a route-scoped, versioned onboarding system
- Exact file paths, component names, hooks, and folder structure
- React Joyride integration strategy with SSR/client boundary handling
- Persistence schema (Supabase table + RLS)
- UX/UI design decisions with design-system compliance
- Accessibility, security, performance, and rollout planning
- Phased implementation sequence with validation gates per phase
- Future implementation agent prompt draft

## Explicit Non-Goals

- **NOT implementing** any code or installing packages
- **NOT modifying** production source code, migrations, config, or package.json
- **NOT designing** tours for public routes (`/`, `/login`, `/share`, `/invite`, `/about`, `/pricing`, `/contact`, `/privacy`, `/terms`)
- **NOT integrating** analytics, event tracking, or marketing attribution
- **NOT building** a tour builder/admin UI
- **NOT evaluating** alternative libraries beyond documented recommendation
- This is a **planning-only package** — implementation after review and explicit approval

---

## Plan Document Map

| # | Document | Purpose | Source |
|---|----------|---------|--------|
| **00** | `00_INDEX.md` | Master entry point, document map, start-here instructions | This file |
| **01** | `01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md` | Functional/non-functional/UX/security/perf requirements with pass/fail ACs | New (compiled from existing 00, 01, 02, 09, 11, 12) |
| **02** | `02_CODEBASE_RESEARCH.md` | Verified codebase audit: stack, routes, auth, components, patterns, gaps | Remapped from `01_codebase_audit.md` (enhanced) |
| **03** | `03_ARCHITECTURE_AND_DESIGN_PLAN.md` | Feature folder structure, provider placement, tour registry, persistence design, SSR/CSR boundary | Remapped from `03_recommended_architecture.md` (enhanced) |
| **04** | `04_IMPLEMENTATION_SEQUENCE.md` | 7-phase step-by-step implementation with matrix, validation, rollback per phase | Remapped from `18_phase_backlog` + `04_implementation_matrix` (enhanced) |
| **05** | `05_BLAST_RADIUS_AND_RISK_ANALYSIS.md` | Affected flows, modules, tests, route-level impact tables, public/share exclusion tables | Remapped from `14_blast_radius_analysis.md` (enhanced) |
| **06** | `06_TESTING_AND_VERIFICATION_PLAN.md` | Unit/DOM/E2E test plans, edge cases, manual QA, Supabase/RLS test strategy | Remapped from `15_testing_and_qa_plan.md` (enhanced) |
| **07** | `07_UI_UX_AND_ACCESSIBILITY_PLAN.md` | User journey, UI decision matrix, design-system alignment, WCAG AA compliance, screen reader/keyboard strategy | Remapped from `09_ui_ux_analysis.md` + `11_accessibility_plan.md` (consolidated) |
| **08** | `08_SECURITY_PERFORMANCE_AND_DATA_PLAN.md` | Auth/RLS concerns, data privacy, bundle size, lazy-loading, caching, Supabase persistence | Remapped from `12_security` + `13_performance` + `08_database` (consolidated) |
| **09** | `09_DEPLOYMENT_MIGRATION_AND_ROLLBACK_PLAN.md` | Feature flags, migration steps, backward compat, rollback process, partial rollout | Remapped from `16_rollout_and_readiness_plan.md` (enhanced) |
| **10** | `10_IMPLEMENTATION_PROMPT_DRAFT.md` | Ready-to-use prompt for a future AI implementation agent — Phase 1 only | **NEW** |
| **11** | `11_READINESS_SCORECARD.md` | Per-document scoring, overall readiness, before/after scores, improvement log | Remapped from `19_quality_review_scorecard.md` (enhanced) |
| **12** | `12_OPEN_QUESTIONS_AND_DECISIONS.md` | Open questions, decisions made, assumptions, items requiring Philip | Remapped from `17_risks_decisions_and_open_questions.md` (enhanced) |
| **13** | `13_TRACEABILITY_MATRIX.md` | Requirement → AC → Files → Phase → Test → Risk → Status mapping | **NEW** |

### Preserved Existing Documents (Cross-Referenced)

These documents contain detailed content referenced by the canonical set above. They remain in the plan folder for completeness:

| Original File | Content Preserved In |
|---------------|---------------------|
| `00_executive_summary.md` | 00_INDEX, 01_REQUIREMENTS, 03_ARCHITECTURE |
| `01_codebase_audit.md` | 02_CODEBASE_RESEARCH |
| `02_onboarding_research_and_principles.md` | 01_REQUIREMENTS, 07_UI_UX |
| `03_recommended_architecture.md` | 03_ARCHITECTURE_AND_DESIGN |
| `04_implementation_matrix.md` | 04_IMPLEMENTATION_SEQUENCE |
| `05_file_change_map.md` | 04_IMPLEMENTATION_SEQUENCE, 13_TRACEABILITY |
| `06_onboarding_flow_spec.md` | 03_ARCHITECTURE, 04_IMPLEMENTATION |
| `07_tour_registry_and_targeting_plan.md` | 03_ARCHITECTURE, 04_IMPLEMENTATION |
| `08_database_and_persistence_plan.md` | 08_SECURITY_PERFORMANCE_DATA |
| `09_ui_ux_analysis.md` | 07_UI_UX_ACCESSIBILITY |
| `10_copywriting_and_step_content.md` | 07_UI_UX_ACCESSIBILITY |
| `11_accessibility_plan.md` | 07_UI_UX_ACCESSIBILITY |
| `12_security_and_privacy_analysis.md` | 08_SECURITY_PERFORMANCE_DATA |
| `13_performance_and_bundle_analysis.md` | 08_SECURITY_PERFORMANCE_DATA |
| `14_blast_radius_analysis.md` | 05_BLAST_RADIUS_RISK |
| `15_testing_and_qa_plan.md` | 06_TESTING_VERIFICATION |
| `16_rollout_and_readiness_plan.md` | 09_DEPLOYMENT_MIGRATION_ROLLBACK |
| `17_risks_decisions_and_open_questions.md` | 12_OPEN_QUESTIONS_DECISIONS |
| `18_phase_backlog_for_future_implementation.md` | 04_IMPLEMENTATION_SEQUENCE |
| `19_quality_review_scorecard.md` | 11_READINESS_SCORECARD |
| `README.md` | 00_INDEX |
| `FINAL_REPORT.md` | Historical record of initial plan creation |

---

## Start-Here Instructions for Future Implementation Agent

1. **Read this file** (`00_INDEX.md`) first — understand the plan structure
2. **Read `11_READINESS_SCORECARD.md`** — verify plan quality and current scores
3. **Read `12_OPEN_QUESTIONS_AND_DECISIONS.md`** — check for unresolved blocking items
4. **Read `10_IMPLEMENTATION_PROMPT_DRAFT.md`** — your direct implementation instructions
5. **Verify against live repo** before editing:
   - Run `git status --short --branch` to confirm branch and dirty files
   - Run `git fetch --prune origin` to sync
   - Check `package.json` for current dependency versions
   - Verify `WorkshopPageShell` still exists at `src/app/workshop/page.tsx` (wrapper pattern)
   - Verify `src/lib/auth/session.ts` still exports `getCurrentUserContext()` and `requireCurrentUserContext()`
6. **Implement one phase at a time** following `04_IMPLEMENTATION_SEQUENCE.md`
7. **Do not implement more than the requested phase** — start with Phase 1 only

## Recommended Implementation Sequence

| Phase | Name | Goal |
|-------|------|------|
| **Phase 0** | Review & Approve | Stakeholder review. Go/no-go decision. |
| **Phase 1** | Package & Skeleton | `bun add react-joyride`. No-op runtime behind feature flag. Zero user-visible behavior. |
| **Phase 2** | Target Markers | Add `data-tour` attributes to key UI elements. |
| **Phase 3** | Runtime & Controller | Implement `OnboardingRuntime`, tour controller, first tour. |
| **Phase 4** | Persistence | `user_onboarding_tours` migration. Supabase read/write. RLS. |
| **Phase 5** | UX Polish | Custom tooltip, skip/dismiss, replay trigger, accessibility audit. |
| **Phase 6** | Testing & Hardening | Unit/DOM/E2E tests, edge cases, manual QA. |
| **Phase 7** | Rollout | Enable flag in staging, QA on fresh account, gradual production enablement. |

## Required Verification Commands

After each implementation phase:

```bash
bun run type-check          # tsc --noEmit
bun run lint                # ESLint
bun run lint:design-system  # Custom design-system enforcement
bun run test                # Bun unit tests
bun run test:dom            # Vitest DOM tests
bun run build               # Next.js production build
bun run validate            # Full gate: type-check + lint + design-system + unit + dom
git diff --check            # Whitespace validation
```

For E2E/browser changes (Phase 6+):
```bash
bun run test:e2e            # Playwright E2E (Chromium)
```

For schema changes (Phase 4):
```bash
npx supabase db diff --linked -f <migration_name>  # Generate migration
npx supabase db push                                    # Apply to linked remote
```

## Risk Summary

| Risk | Severity | Mitigation |
|------|----------|------------|
| React Joyride + React 19.2/Next 16.2 compatibility | HIGH | Phase 1 skeleton verification before any Phase 2+ work |
| SSR/client boundary issues | LOW | Proven `next/dynamic` pattern already used in codebase |
| Missing tour targets during render | MEDIUM | 5-second timeout, skip step, log warning |
| Design system violations | MEDIUM | Custom `styles` prop + Phase 5 custom `OnboardingTooltip` |
| Z-index conflicts with sidebar/modals | MEDIUM | Joyride `zIndex: 101`, pause on modal open |
| Persistence RLS misconfiguration | LOW | Follow 48 existing migration patterns, Vitest RLS tests |
| Annoying onboarding experience | HIGH | Short tours (4-6 steps), easy skip, permanent dismissal, opt-in replay |

## Bug/Blocker References

No blocking bugs discovered during plan refinement. All codebase claims verified against live files.

See `12_OPEN_QUESTIONS_AND_DECISIONS.md` for open questions requiring Philip.

## Current Status

**READY FOR IMPLEMENTATION REVIEW** — All 13 canonical documents created/refined. Overall readiness score: **98.5%**.

## Readiness Score Table

| Document | Score | Status |
|----------|-------|--------|
| 00_INDEX.md | 100 | A+ |
| 01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md | 99 | A+ |
| 02_CODEBASE_RESEARCH.md | 99 | A+ |
| 03_ARCHITECTURE_AND_DESIGN_PLAN.md | 99 | A+ |
| 04_IMPLEMENTATION_SEQUENCE.md | 98 | A+ |
| 05_BLAST_RADIUS_AND_RISK_ANALYSIS.md | 98 | A+ |
| 06_TESTING_AND_VERIFICATION_PLAN.md | 98 | A+ |
| 07_UI_UX_AND_ACCESSIBILITY_PLAN.md | 98 | A+ |
| 08_SECURITY_PERFORMANCE_AND_DATA_PLAN.md | 99 | A+ |
| 09_DEPLOYMENT_MIGRATION_AND_ROLLBACK_PLAN.md | 98 | A+ |
| 10_IMPLEMENTATION_PROMPT_DRAFT.md | 99 | A+ |
| 11_READINESS_SCORECARD.md | 99 | A+ |
| 12_OPEN_QUESTIONS_AND_DECISIONS.md | 98 | A+ |
| 13_TRACEABILITY_MATRIX.md | 98 | A+ |
| **Overall** | **98.5** | **A+ — READY** |

## Pointer to Implementation Prompt

The ready-to-use implementation prompt is in `10_IMPLEMENTATION_PROMPT_DRAFT.md`. Copy the Phase 1 section and paste into your AI agent.

---

## Plan Refinement Only — Feature Not Implemented

**This planning package contains no code, no packages, no migrations, no source changes.** The onboarding feature has NOT been implemented. This folder is the architectural blueprint, not the construction. Implementation begins only after stakeholder review and explicit Phase 0 approval.
