# Current State

**Date:** 2026-05-18
**Canonical reset audit:** `.ai/02_audits/2026-05-17-reset-cleanup-audit.md`
**Active restart guardrails:** `.ai/06_specs/restart-guardrails.md`
**Agent recovery protocol:** `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`

## Project

Archestimator is a pre-MVP construction estimating product being rebuilt after Philip rejected the earlier app/workshop prototype UX and UI.

The reset remains the baseline quality principle: do not blindly restore the deleted prototype. However, the repository has moved beyond the completely blank `/workshop` reset state and now contains a small post-reset workshop route slice.

## Repository / branch

- Repository folder: `/Users/philiplewis/archestimator`.
- Current live branch observed by git: `feat/estimate-sheet-header`.
- Current working tree note: docs and estimate-sheet/header-related code are modified at the time of this update; classify and stage by logical scope before committing.
- Stack: Next.js 16.2.6, React 19.2.4, Bun, TypeScript, Tailwind CSS v4.
- Backend: no Supabase/Postgres connection.

## Active mode

The project is in post-reset MVP exploration. Work must stay small, route-scoped, and easy to revise or delete. Agents must not treat historical prototype docs as active instructions unless this file, `decisions.md`, or a current plan explicitly reactivates that scope.

If Philip reports degraded agent performance, stale behavior, or repeated mistakes, agents must stop normal execution and run `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md` before planning or coding.

## Current live surfaces observed in `src/app`

```txt
/                                                     -> preserved landing page
/workshop                                             -> workshop entry page
/workshop/projects                                    -> post-reset project list/cards route
/workshop/projects/[projectId]                        -> post-reset project dashboard/detail route
/workshop/projects/[projectId]/estimates              -> post-reset estimates shell/list route
/workshop/projects/[projectId]/estimates/[nodeId]     -> post-reset estimate node route
/workshop/components                                  -> post-reset component/library surface
```

These routes exist in the repo, but their presence does not reapprove the entire deleted prototype. Treat them as the current implemented slice only. Before expanding them, read the relevant active plan/spec and verify the route scope against Philip's latest direction.

## Superseded prototype direction

The previous local-first MVP implementation remains rejected as a default direction. Do not restore these from old handoffs without fresh approval:

- broad project dashboard route family beyond the current approved slice;
- full estimate editor/workspace;
- full estimate hierarchy tree;
- right-sidebar component picker;
- full component library manager/admin system;
- proposal snapshot pages;
- revision/versioning UI;
- broad local JSON repository and mutation layer;
- large app shells/project shells;
- grid spike and drag/drop surfaces;
- login/signup visual prototype pages;
- legacy redirect routes.

Historical docs may remain for context, but they are not active instructions unless linked by current-state, decisions, or a current plan.

## Active product direction

Proceed from the current small post-reset workshop slice, not from the deleted prototype. Future work must:

1. begin with a narrow screen/workflow brief or an existing active plan;
2. state exact user job, route scope, non-goals, and deletion criteria;
3. avoid fake SaaS maturity and broad module restoration;
4. preserve the density correction: compact app/workshop UI, with 12px as the maximum non-landing font size unless Philip explicitly approves an exception;
5. use the shared UI primitives first; if no reusable primitive exists for a repeated UI pattern, create or extend a shared primitive before adding feature-local controls;
6. keep data/persistence minimal until the UX earns a stable data boundary.

## Current feature specs

- `.ai/06_specs/current-project-estimates-component-library-spec.md` is the canonical current-state feature spec for the implemented project estimate workspace and connected Component Library sidebar. Read it before expanding `/workshop/projects/[projectId]/estimates/[nodeId]`, `EstimateSheetContent`, `EstimateSheetTree`, or `src/components/workshop/component-library/*`.
- `.ai/03_plans/project-estimates-component-library-improvement-plan.md` is the research-backed UX/UI improvement plan for that feature. Its immediate recommended next slice is target-aware insert + insert-and-edit + keyboard editing baseline.
- `.ai/03_plans/ui-componentization-and-storybook-plan.md` is the active reusable UI primitive matrix and Storybook organization plan. Read it before creating app/workshop controls, component-library controls, toolbars, cards, filters, panels, or stories.

Read before implementation:

1. `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`
2. `.ai/03_plans/current-post-reset-workshop-slice.md`
3. `.ai/02_audits/2026-05-17-reset-cleanup-audit.md`
4. `.ai/06_specs/restart-guardrails.md`
5. `.ai/10_state/decisions.md`
6. `.ai/10_state/known-issues.md`
7. `DESIGN.md`
8. `.ai/03_plans/ui-componentization-and-storybook-plan.md`

## Validation baseline

For documentation-only changes:

```bash
git diff --check
```

For code changes in the current app baseline:

```bash
bun run validate
bun run build
git diff --check
```

`bun run validate` currently includes type-check, lint, app font-size lint, Bun unit tests, and Vitest DOM tests.

E2E route coverage should only be added for currently approved behavior. Do not recreate E2E coverage for deleted prototype routes unless those routes are explicitly reapproved.

## Agent quality controls

- Read live files before product claims.
- Check git branch/status before editing.
- Inspect existing uncommitted changes before touching a file.
- Patch canonical `.ai` docs when reality changes.
- Report skipped validation and remaining uncertainty plainly.
