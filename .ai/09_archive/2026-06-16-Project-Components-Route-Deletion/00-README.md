# Project Components Route Deletion

## User Job

Delete the standalone project-level Components page selected in the browser comment: `/workshop/projects/[projectId]/components`.

## Scope

- Remove the `Components` item from the project mini-sidebar.
- Delete the project route leaf at `src/app/workshop/projects/[projectId]/components/page.tsx`.
- Remove dead cache invalidation for `/workshop/projects/[projectId]/components`.
- Update row-detail copy that points users to the deleted project Components surface.
- Keep project component projection data and promotion behavior where it still feeds estimate-side and shared-library workflows.

## Non-Goals

- Do not delete `/workshop/library/components`.
- Do not delete `src/app/workshop/components/page.tsx`, which redirects to the shared library.
- Do not delete `LibraryPageClient`, `ComponentLibraryManager`, shared library components/templates, estimate-side component browsing, express component projection, or promotion to the shared library.
- Do not touch Supabase schema, RLS, RPCs, or provider data.

## Fallback-Like Inventory

The removable surface is a duplicate navigation/route surface, not a resilience fallback. Guard searches should check for stale project-route links and fallback-like phrases in touched files before completion:

- `/workshop/projects/${projectId}/components`
- `Project Components`
- `project Components surface`
- `fallback`, `temporary`, `workaround`, `bypass`, `swallowed`, `silent default`, `compatibility shim`

## Regression Lock

Flip the stale positive tests before deleting the route:

- `tests/vitest/project-dashboard-core-ui.test.ts` must assert the project mini-sidebar does not expose `Components`, `SquaresFour`, or `/workshop/projects/${projectId}/components`.
- `tests/vitest/project-component-projection.test.ts` must assert the project route file is absent while projection/shared library contracts remain.
- `tests/vitest/express-promotion-action.test.ts` must assert promotion no longer revalidates the deleted project route.

Expected red gate before implementation: those focused tests fail while the old route/link/revalidation still exist.

## Implementation Units

1. Test lock: add negative assertions for the deleted route and old cache invalidation.
2. Route/nav cleanup: remove the project mini-sidebar link and delete the project route leaf.
3. Reference cleanup: remove stale revalidation and update copy that names the deleted surface.
4. Verification: run focused tests, type-check, touched-file ESLint, diff check, stale-route search, and browser sidebar proof.

## Validation Gate

- `bunx vitest run tests/vitest/project-dashboard-core-ui.test.ts tests/vitest/project-dashboard-charts-ui.test.ts tests/vitest/project-component-projection.test.ts tests/vitest/express-promotion-action.test.ts --maxWorkers=1`
- `bunx vitest run tests/vitest/workshop-route-error-boundaries.test.tsx --maxWorkers=1`
- `bun run type-check`
- changed-file ESLint
- `git diff --check`
- `rg` proves no project-level Components route/link remains.
- Browser proof on `/workshop/projects/22222222-2222-4222-8222-222222222222/data`: project sidebar exposes Dashboard, Estimates, Data; Components is absent.

## Stop Condition

The deleted route is not reachable from project navigation, stale source/test references are removed or explicitly negative, the shared library component route still exists, and validation passes or any remaining gap is documented.
