# 00 Index — Projects Page Access Tabs

**Task slug:** `projects-page-access-tabs`  
**Plan folder:** `.ai/03_plans/2026-06-03-projects-page-access-tabs/`  
**Repo:** `pjel888/archestimator`  
**Base branch:** `main`  
**Date source:** `date +%F` returned `2026-06-03`  
**Current status:** `READY_FOR_IMPLEMENTATION` for code execution; repository write/push was not performed in this planning environment.

## Executive summary

Implement a two-tab information architecture on `/workshop/projects`: **Your Projects** and **Projects shared to you**. The repo already has an access filter in `src/components/workshop/projects-page-client.tsx`, but it is the wrong product shape: `All / Owned / Shared`, conditionally rendered only when shared records exist, and positioned inside the scroll body. This plan replaces that with the requested two primary tabs, keeps the existing server data source, and defines the exact UI, data, accessibility, test, and rollback path.

## Start here for the implementation agent

1. Read `02_CODEBASE_RESEARCH.md` to understand verified repository evidence and the existing partial implementation.
2. Read `03_ARCHITECTURE_AND_DESIGN_PLAN.md` for the target shape and affected files.
3. Execute `04_IMPLEMENTATION_SEQUENCE.md` step by step.
4. Run the verification matrix in `06_TESTING_AND_VERIFICATION_PLAN.md`.
5. Address the bug plan in `.ai/15_Bugs/2026-06-03-shared-project-favorite-action-rejects-visible-shared-projects.md` either in the same task or by intentionally suppressing the favorite control for shared cards.

## Scope

In scope:

- Replace the current access filter with two first-class tabs: `Your Projects` and `Projects shared to you`.
- Keep the route at `src/app/workshop/projects/page.tsx` and continue using `listCurrentWorkspaceProjects()` as the server data source.
- Categorize owned records as `accessKind === "owned"`.
- Categorize shared records as `accessKind !== "owned"`, including `project-member`, `sheet-member`, and `pending-invite`.
- Preserve search, view-mode persistence, project creation, project details modal, pending invite acceptance, and project card display behavior.
- Add focused DOM tests for tab rendering, switching, filtering, counts, and empty states.
- Fix or safely suppress the currently broken shared-project favorite control.

Out of scope:

- Database schema changes.
- New collaboration invitation flows.
- New roles beyond existing `owner | admin | editor | viewer`.
- Reworking project card layout, project details modal, invite acceptance, publication badges, or shared-link behavior.
- Adding an `All` tab; the product request is two tabs.

## Recommended implementation sequence

1. Add a tab model and split `projectItems` into `ownedProjectItems` and `sharedProjectItems` in `src/components/workshop/projects-page-client.tsx`.
2. Move tabs into `WorkshopCollectionLayout.toolbarPanel` so tabs stay above the scrollable card grid.
3. Replace `PROJECT_ACCESS_FILTER_OPTIONS` and `accessFilter` with a `ProjectAccessTab` state using `your-projects` / `shared-to-you`.
4. Make search operate within the active tab only.
5. Add tab-aware empty states and counts.
6. Fix the shared-card favorite bug by hiding/disabling favorite controls for non-owned cards or by explicitly changing the favorite data model with tests. The low-risk recommendation is to suppress favorite controls for `accessKind !== "owned"` in this task.
7. Add focused Vitest DOM tests.
8. Run validation commands.
9. Update `.ai` task/log/state files and archive the plan only after implementation is merged.

## Required verification commands

Run these from the real repository root after implementation:

```bash
bun run type-check
bun run lint
bun run lint:design-system
bun run test:dom -- tests/vitest/projects-page-access-tabs.test.tsx --maxWorkers=1
bun run test:dom --maxWorkers=1
bun run validate
```

Optional but recommended when the implementation agent has browser auth/dev seed coverage:

```bash
PLAYWRIGHT_PORT=3020 bun run test:e2e -- --project=chromium
```

GitNexus / code-review-graph verification is required by repo instructions if those tools are available in the implementing environment:

```bash
npx gitnexus analyze # only if the index is stale
# then run the available impact/detect-changes commands before commit
```

## Risks summary

| Risk | Severity | Mitigation |
|---|---:|---|
| Existing shared-project favorite UI calls `setProjectFavorite`, which rejects projects outside the current workspace. | High | Suppress favorite controls for shared cards in this task or explicitly rework the favorite model with tests. Bug plan created. |
| Current filter is already a `role=tablist` but lacks full tab semantics and keyboard support. | Medium | Implement proper tab IDs, `aria-controls`, `aria-selected`, `tabpanel`, and Left/Right/Home/End handling. |
| Users with only shared projects may land on an empty `Your Projects` tab. | Medium | Default to `Projects shared to you` when owned count is zero and shared count is greater than zero. |
| Search + active tab can hide all results and look like missing access. | Medium | Use tab-aware empty copy that distinguishes search misses from no shared access. |
| Changing `LiveProjectCard` favorite rendering may affect other cards. | Medium | Gate favorite button on explicit handler or add a dedicated `favoriteEnabled` prop and test no-op behavior. |

## Readiness score table

| Document | Score |
|---|---:|
| `00_INDEX.md` | 99 |
| `01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md` | 99 |
| `02_CODEBASE_RESEARCH.md` | 98 |
| `03_ARCHITECTURE_AND_DESIGN_PLAN.md` | 99 |
| `04_IMPLEMENTATION_SEQUENCE.md` | 99 |
| `05_BLAST_RADIUS_AND_RISK_ANALYSIS.md` | 99 |
| `06_TESTING_AND_VERIFICATION_PLAN.md` | 99 |
| `07_UI_UX_AND_ACCESSIBILITY_PLAN.md` | 99 |
| `08_SECURITY_PERFORMANCE_AND_DATA_PLAN.md` | 98 |
| `09_DEPLOYMENT_MIGRATION_AND_ROLLBACK_PLAN.md` | 99 |
| `10_IMPLEMENTATION_PROMPT_DRAFT.md` | 99 |
| `11_READINESS_SCORECARD.md` | 99 |
| `12_OPEN_QUESTIONS_AND_DECISIONS.md` | 99 |
| **Overall implementation readiness** | **98.8** |

## Repository-write limitation

This plan was generated from GitHub connector and local artifact tooling. The available GitHub connector exposed read/search/fetch tools but no create/update/commit tool, and direct `git clone` from the container failed because DNS could not resolve `github.com`. Therefore, this package is implementation-ready but was not committed or pushed from this environment. A future implementation agent with local repo access must copy/apply these docs into `.ai/`, then commit and push them before coding if strict process compliance is required.
