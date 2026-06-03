# 00 Index — Projects Page Access Tabs

**Task slug:** `projects-page-access-tabs`
**Plan folder:** `.ai/03_plans/2026-06-03-projects-page-access-tabs-plan/`
**Repo:** `pjel888/archestimator`
**Base branch:** `main`
**Date:** 2026-06-03
**Current status:** `READY_FOR_IMPLEMENTATION`
**Refinement:** Plan refined 2026-06-03 — stale refs fixed, missing docs created, code drift reconciled, bulk-delete risk addressed.

## Executive summary

Implement a two-tab information architecture on `/workshop/projects`: **Your Projects** and **Projects shared to you**. The repo already has an access filter in `src/components/workshop/projects-page-client.tsx`, but it is the wrong product shape: `All / Owned / Shared`, conditionally rendered only when shared records exist, and positioned inside the scroll body. This plan replaces that with the requested two primary tabs, keeps the existing server data source, and defines the exact UI, data, accessibility, test, and rollback path.

## Plan document map

| # | Document | Purpose | Status |
|---|---|---|---|
| 00 | `00_INDEX.md` | Entry point, map, risk summary, commands | Refined |
| 01 | `01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md` | Functional/non-functional requirements, acceptance criteria | Existing |
| 02 | `02_CODEBASE_RESEARCH.md` | Codebase evidence, patterns, current behavior | Refined |
| 03 | `03_ARCHITECTURE_AND_DESIGN_PLAN.md` | Architecture, file changes, data flow, alternatives | Existing |
| 04 | `04_IMPLEMENTATION_SEQUENCE.md` | Step-by-step implementation with bulk-delete reconciliation | Refined |
| 05 | `05_BLAST_RADIUS_AND_RISK_ANALYSIS.md` | User flows, modules, regressions, edge cases, bulk-delete risks | Refined |
| 06 | `06_TESTING_AND_VERIFICATION_PLAN.md` | Test fixtures, DOM tests, verification commands | Existing |
| 07 | `07_UI_UX_AND_ACCESSIBILITY_PLAN.md` | User journey, responsive, keyboard, a11y, design-system | Existing |
| 08 | `08_SECURITY_PERFORMANCE_AND_DATA_PLAN.md` | Auth, RLS, privacy, performance, caching | Existing |
| 09 | `09_DEPLOYMENT_MIGRATION_AND_ROLLBACK_PLAN.md` | No-migration, rollback, post-deploy checks | Existing |
| 10 | `10_IMPLEMENTATION_PROMPT_DRAFT.md` | Future agent implementation prompt (fixed path refs) | Refined |
| 11 | `11_READINESS_SCORECARD.md` | Honest per-doc scores, pre/post refinement comparison | Rewritten |
| 12 | `12_OPEN_QUESTIONS_AND_DECISIONS.md` | Decisions, assumptions, non-blocking follow-ups | Existing |
| 13 | `13_TRACEABILITY_MATRIX.md` | Requirement→Implementation→Test traceability | **Created** |
| 14 | `14_CODE_DRIFT_AND_RECONCILIATION_PLAN.md` | Drift findings, stale refs fixed, source shape confirmation | **Created** |
| 18 | `18_IMPLEMENTATION_AGENT_HANDOFF_CHECKLIST.md` | Pre-edit, milestones, verification, archive, merge policy | **Created** |

**Not created (deemed unnecessary — content covered in required docs):**
- `15_FRONTEND_COMPONENT_INTEGRATION_PLAN.md` — covered in 03_ARCHITECTURE and 07_UI_UX
- `16_TEST_FIXTURE_AND_MOCKING_PLAN.md` — covered in 06_TESTING
- `17_GITNEXUS_AND_MERGE_SAFETY_PLAN.md` — covered in 18_IMPLEMENTATION_AGENT_HANDOFF_CHECKLIST

## Start here for the implementation agent

1. Read `00_INDEX.md` (this file) — overview and document map.
2. Read `14_CODE_DRIFT_AND_RECONCILIATION_PLAN.md` — understand what was reconciled during refinement.
3. Read `04_IMPLEMENTATION_SEQUENCE.md` — exact step-by-step with bulk-delete reconciliation.
4. Read `18_IMPLEMENTATION_AGENT_HANDOFF_CHECKLIST.md` — pre-edit checks, milestones, verification, merge policy.
5. Read `13_TRACEABILITY_MATRIX.md` — requirement→implementation→test mapping.
6. Execute `04_IMPLEMENTATION_SEQUENCE.md` step by step.
7. Run the verification matrix in `06_TESTING_AND_VERIFICATION_PLAN.md`.
8. Address the bug plan in `.ai/15_Bugs/2026-06-03-shared-project-favorite-action-rejects-visible-shared-projects.md` by suppressing favorite controls for shared cards.

## Scope

**In scope:**
- Replace the current access filter with two first-class tabs: `Your Projects` and `Projects shared to you`.
- Keep the route at `src/app/workshop/projects/page.tsx` and continue using `listCurrentWorkspaceProjects()` as the server data source.
- Categorize owned records as `accessKind === "owned"`.
- Categorize shared records as `accessKind !== "owned"`, including `project-member`, `sheet-member`, and `pending-invite`.
- Preserve search, view-mode persistence, project creation, project details modal, pending invite acceptance, and project card display behavior.
- Preserve existing bulk deletion/selection behavior, reconciled with active tab visibility.
- Add focused DOM tests for tab rendering, switching, filtering, counts, empty states, and bulk-delete interaction.
- Fix or safely suppress the currently broken shared-project favorite control.

**Out of scope:**
- Database schema changes.
- New collaboration invitation flows.
- New roles beyond existing `owner | admin | editor | viewer`.
- Reworking project card layout, project details modal, invite acceptance, publication badges, or shared-link behavior.
- Adding an `All` tab; the product request is two tabs.
- Shared project favorites as a data model change.

## Recommended implementation sequence

1. Baseline reconnaissance — verify plan against current source.
2. Replace filter model with tab model in `projects-page-client.tsx`.
3. Move tabs into `WorkshopCollectionLayout.toolbarPanel`.
4. Render active tab content and empty states.
5. Reconcile bulk-delete selection with tab filtering (Step 4.5).
6. Fix/suppress shared favorite behavior.
7. Preserve existing bulk delete machinery (Step 6.5).
8. Add focused Vitest DOM tests.
9. Full verification.
10. Documentation and git finalization.

See `04_IMPLEMENTATION_SEQUENCE.md` for detailed instructions per step.

## Required verification commands

```bash
bun run type-check
bun run lint
bun run lint:design-system
bun run test:dom -- tests/vitest/projects-page-access-tabs.test.tsx --maxWorkers=1
bun run test:dom --maxWorkers=1
bun run validate
bun run build
```

Optional when browser auth/dev seed coverage exists:
```bash
PLAYWRIGHT_PORT=3020 bun run test:e2e -- --project=chromium
```

GitNexus / code-review-graph (if available):
```bash
npx gitnexus analyze  # only if index is stale
npx gitnexus detect-changes  # before commit
```

## Risks summary

| Risk | Severity | Mitigation |
|---|---|---|
| Existing shared-project favorite UI calls `setProjectFavorite`, which rejects projects outside the current workspace. | High | Suppress favorite controls for shared cards. Bug plan exists. |
| Current filter is already a `role=tablist` but lacks full tab semantics and keyboard support. | Medium | Implement proper tab IDs, `aria-controls`, `aria-selected`, `tabpanel`, and Left/Right/Home/End handling. |
| Users with only shared projects may land on an empty `Your Projects` tab. | Medium | Default to `Projects shared to you` when owned count is zero and shared > 0. |
| Search + active tab can hide all results and look like missing access. | Medium | Use tab-aware empty copy that distinguishes search misses from no shared access. |
| Changing `LiveProjectCard` favorite rendering may affect other cards. | Medium | Gate favorite button on explicit handler; only pass handler for owned cards. |
| Bulk delete selection crossing tab boundaries. | Medium | `selectedProjectIds` Set persists globally; `selectedVisibleProjectIds` scoped to active tab. Delete preview uses full `projectItems`, not `displayProjects`. |
| Bulk delete preview uses tab-filtered list instead of full list. | High | Verified in Step 6.5. `openProjectDeletePreview()` must use `projectItems`, not `displayProjects`. |

## Bug/blocker references

| Bug | Status | Blocks implementation? |
|---|---|---|
| `.ai/15_Bugs/2026-06-03-shared-project-favorite-action-rejects-visible-shared-projects.md` | `OPEN_PLANNED_FOR_SUPPRESSION_OR_FIX` | No if favorite suppressed |

## Readiness score table

| Document | Score |
|---|---|
| `00_INDEX.md` | 99 |
| `01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md` | 99 |
| `02_CODEBASE_RESEARCH.md` | 98 |
| `03_ARCHITECTURE_AND_DESIGN_PLAN.md` | 99 |
| `04_IMPLEMENTATION_SEQUENCE.md` | 98 |
| `05_BLAST_RADIUS_AND_RISK_ANALYSIS.md` | 98 |
| `06_TESTING_AND_VERIFICATION_PLAN.md` | 98 |
| `07_UI_UX_AND_ACCESSIBILITY_PLAN.md` | 98 |
| `08_SECURITY_PERFORMANCE_AND_DATA_PLAN.md` | 98 |
| `09_DEPLOYMENT_MIGRATION_AND_ROLLBACK_PLAN.md` | 99 |
| `10_IMPLEMENTATION_PROMPT_DRAFT.md` | 99 |
| `11_READINESS_SCORECARD.md` | 99 |
| `12_OPEN_QUESTIONS_AND_DECISIONS.md` | 99 |
| `13_TRACEABILITY_MATRIX.md` | 98 |
| `14_CODE_DRIFT_AND_RECONCILIATION_PLAN.md` | 99 |
| `18_IMPLEMENTATION_AGENT_HANDOFF_CHECKLIST.md` | 99 |
| **Overall implementation readiness** | **98** |

## Known stale refs fixed

During 2026-06-03 refinement, the following stale references were corrected:
- `00_INDEX.md`: plan folder path corrected from `/tabs/` to `/tabs-plan/`
- `10_IMPLEMENTATION_PROMPT_DRAFT.md`: plan folder path corrected from `/tabs/` to `/tabs-plan/`
- `.ai/15_Bugs/2026-06-03-shared-project-favorite-action-rejects-visible-shared-projects.md`: plan folder path corrected
- `02_CODEBASE_RESEARCH.md`: claim about `.ai/15_Bugs` not existing corrected — folder exists with 6 files
- `FINAL_REPORT_LOCAL_ONLY.md`: removed (stray agent report, not a plan document)

## Notes

- This is a plan package, not implemented behavior.
- Source code was inspected but not modified during this refinement.
- Bulk-delete reconciliation steps (4.5, 6.5) were added during refinement after local source inspection.
- `13_TRACEABILITY_MATRIX.md`, `14_CODE_DRIFT_AND_RECONCILIATION_PLAN.md`, and `18_IMPLEMENTATION_AGENT_HANDOFF_CHECKLIST.md` were created during refinement.
- Implementation agent must re-verify plan against current source before editing.
