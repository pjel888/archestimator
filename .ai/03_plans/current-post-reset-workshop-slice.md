# Current Post-Reset Workshop Slice Plan

**Date:** 2026-05-18
**Status:** Active orientation plan for the current implemented slice. Keep this narrow.

## Purpose

Give future agents one current plan to follow for the post-reset workshop work, so they do not infer product direction from stale pre-reset plans or from the mere existence of route files.

Canonical state still lives in `.ai/10_state/current-state.md`. This plan only describes the current route slice and the safe next boundaries.

## Goal

Stabilize a small, compact workshop navigation slice that lets a user:

1. enter the workshop;
2. view sample project cards;
3. open a sample project dashboard placeholder;
4. navigate into a sample estimate-tree route;
5. see a placeholder component-library shell.

The goal is orientation and UX calibration, not production estimating.

## Non-goals

Do not use this slice to add:

- authentication;
- Supabase/Postgres;
- broad local-first repositories or mutation layers;
- production project creation;
- production estimate editing or persistence;
- proposal snapshots/exports;
- revision/versioning workflows;
- supplier bidding or marketplace features;
- full component-library administration;
- broad dashboard modules;
- legacy redirects for removed routes;
- spreadsheet/grid package migration.

## Current route scope

```txt
/                                                     preserved landing page
/workshop                                             workshop entry page with main sidebar and empty canvas
/workshop/projects                                    sample project card list
/workshop/projects/[projectId]                        project dashboard placeholder with sample metrics
/workshop/projects/[projectId]/estimates              redirect to first sample estimate node
/workshop/projects/[projectId]/estimates/[nodeId]     sample estimate-tree workspace route
/workshop/components                                  component/library shell placeholder
```

## Current implementation references

- `src/app/workshop/page.tsx`
- `src/app/workshop/projects/page.tsx`
- `src/app/workshop/projects/[projectId]/page.tsx`
- `src/app/workshop/projects/[projectId]/estimates/page.tsx`
- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
- `src/app/workshop/components/page.tsx`
- `src/components/workshop/WorkshopPageShell.tsx`
- `src/components/workshop/ProjectCard.tsx`
- `src/components/workshop/EstimateSheetTree.tsx`
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/ui/button.tsx`

## Product/UX constraints

- Keep the slice compact and app-like, not marketing-like.
- Outside the landing page, follow the enforced SF Pro product design system: compact `12px` maximum with normal app controls around `10px`, regular/medium weights, xs-only radius, zero tracking, neutral reference colors, and regular-outline icons.
- Use shared UI primitives before adding feature-local raw button/card/input patterns.
- Keep page chrome pinned where possible; prefer independently scrollable panels over document/body scrolling for workshop surfaces.
- Do not add navigation labels or modules for features that do not exist.
- Treat sample data as UX scaffolding only, not a data-model decision.

## Safe next steps

A future agent may do these if they stay within this plan:

1. Fix density, spacing, visual hierarchy, and button consistency on the current routes.
2. Make the current sample routes more coherent as a clickable orientation flow.
3. Add minimal tests for the current route behavior if the behavior is accepted enough to preserve.
4. Improve empty-state copy so it clearly says what is sample/placeholder.
5. Update `.ai/10_state/current-state.md` if live route scope changes.

## Requires fresh approval or a new plan

Create a new plan before doing any of these:

- real project creation;
- saved mutable project data;
- production estimate row editing;
- component library CRUD;
- proposal/export generation;
- revision history;
- AI estimating/generation;
- broad route-family expansion;
- installing or migrating to a grid/drag-drop package.

## Validation gate

For documentation-only updates:

```bash
git diff --check
```

For code changes within this slice:

```bash
bun run validate
bun run build
git diff --check
```

If route behavior becomes stable enough to preserve, add focused tests for the approved routes only. Do not recreate tests for deleted prototype routes.

## Deletion criteria

Delete or rewrite this slice instead of extending it if Philip rejects:

- the current sidebar/workshop layout direction;
- project cards as the first workshop view;
- the project-dashboard placeholder as the first project detail route;
- the current estimate-tree route shape;
- the component-library shell route.

## Agent quality rule

If an agent is unsure whether this plan is still current, it must run `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`, then read `.ai/10_state/current-state.md` before editing code or docs.
