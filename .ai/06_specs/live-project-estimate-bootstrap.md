# Live Project + Estimate Bootstrap Spec

**Status:** Active implementation slice  
**Last updated:** 2026-05-18  
**Routes:** `/workshop/projects`, `/workshop/projects/[projectId]`, `/workshop/projects/[projectId]/estimates`

## Purpose

This feature turns the protected workshop from sample-only project cards into a live Supabase-backed project and estimate bootstrap flow.

The current goal is intentionally narrow:

1. authenticated user enters `/workshop/projects`;
2. app ensures a default workspace exists;
3. user creates a project;
4. user opens the project dashboard;
5. user creates a draft estimate;
6. app creates the first durable hierarchy nodes: lot → structure → level → area;
7. user lands in the estimate workspace route for the first area node.

## Implemented behavior

### `/workshop/projects`

- Protected by `src/proxy.ts`.
- Calls `listCurrentWorkspaceProjects()`.
- Shows `NewProjectForm`.
- Creates project through `createProject` server action.
- Shows live Supabase project cards with `LiveProjectCard`.
- Shows sample references only when no live projects exist.

### `/workshop/projects/[projectId]`

- Calls `getCurrentWorkspaceProject(projectId)`.
- Shows live project status, code, and source.
- Provides a compact `ButtonLink` action to `/workshop/projects/[projectId]/estimates`.
- Keeps sample fallback only for current reset-era sample routes.

### `/workshop/projects/[projectId]/estimates`

- Calls `listProjectEstimates(projectId)`.
- Shows `NewEstimateForm`.
- Creates estimates through `createEstimate(projectId, formData)`.
- Estimate creation inserts:
  - one `estimates` row;
  - one `lot` node;
  - one `structure` node;
  - one `level` node;
  - one `area` node named `Project-wide`.
- Redirects to `/workshop/projects/{projectId}/estimates/{areaNodeId}` after creation.
- Shows `EstimateListCard` for live estimates.

## Data boundaries

- Screens do not call Supabase directly.
- Reads go through `src/lib/repositories/workspace-repository.ts`.
- Mutations go through server actions:
  - `src/lib/projects/actions.ts`
  - `src/lib/estimates/actions.ts`
- Estimate-tree editing still remains a later slice; this feature only bootstraps an initial hierarchy.

## Shared UI primitives

Mandatory primitives used:

- `Button`
- `ButtonLink`
- `ControlInput`

No feature-local raw search input/button/icon-button pattern should be introduced for this flow. Any repeated action link should reuse `ButtonLink` or extend it.

## Typography and density

This is app/workshop UI, not landing-page UI.

- Strong titles: max `text-[12px]`.
- Body/control text: around `text-[10px]`.
- Eyebrows/meta: `text-[8px]` to `text-[9px]`.
- Buttons/links styled as buttons: forced `!text-[10px] !font-bold` through shared primitives.

## Tests and gates

Current coverage:

- `tests/vitest/project-creation-ui.test.ts`
  - verifies project creation UI uses shared primitives.
  - verifies live project card wiring.
- Estimate bootstrap tests should verify `NewEstimateForm`, `EstimateListCard`, and `ButtonLink` primitive usage.
- `e2e/auth.spec.ts`
  - verifies signed-out protected-route redirect to login.
  - verifies compact login form renders.

Required gates after edits:

- `bun run validate`
- `bun run build`
- `bun run test:e2e`
- `git diff --check`

## Known limitations

- Hosted Supabase redirect URLs still require Dashboard verification.
- Estimate detail route currently uses existing estimate workspace shell/data patterns; full live tree rendering/editing remains a follow-up slice.
- Estimate totals, proposal exports, recent activity, and estimate row CRUD UI are not in this slice.

## Next slice

Wire `/workshop/projects/[projectId]/estimates/[nodeId]` to live Supabase estimate nodes and rows, replacing sample-node assumptions with project-scoped data from the repository.
