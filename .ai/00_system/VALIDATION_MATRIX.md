# Validation Matrix

**Last updated:** 2026-05-18

## Active code-change gate

For current Archestimator app/workshop code changes, run:

```bash
bun run validate
bun run build
bun run test:e2e
git diff --check
```

`bun run validate` covers:

- TypeScript type-check
- ESLint
- app/workshop font-size lint, enforcing no non-landing typography above 12px
- Bun unit tests
- Vitest DOM/helper tests

`bun run test:e2e` currently covers signed-out protected-route auth behavior and login UI rendering.

## Current active route surface

```txt
/
/login
/auth/callback
/workshop
/workshop/projects
/workshop/projects/[projectId]
/workshop/projects/[projectId]/estimates
/workshop/projects/[projectId]/estimates/[nodeId]
/workshop/components
```

Do not use the old reset-era assumption that `/workshop` is intentionally blank or that `/workshop/projects` is deleted. The authenticated Supabase-backed workshop path is now active.

## Required checks for app/workshop UI changes

- No `text-[13px]` or larger outside landing-approved surfaces.
- Shared primitives must be used or extended before creating repeated local controls:
  - `Button`
  - `ButtonLink`
  - `ControlInput`
  - `SearchInput`
  - `ControlSelect`
  - `Badge`
  - `Chip`
  - `EmptyState`
- Add or update tests when a feature adds a new reusable-control pattern.
- Do not create raw feature-local button/search/icon-button class strings.

## Required checks for Supabase/Auth changes

- Never touch SlateCamp Supabase resources.
- Use project `ebxxqidacheyapmmzavr` only.
- Run migrations/types when schema changes:

```bash
npx supabase@2.98.2 db push
npx supabase@2.98.2 gen types typescript --project-id ebxxqidacheyapmmzavr > src/lib/supabase/types.ts
npx supabase@2.98.2 migration list
```

- Confirm RLS stays enabled on public app tables.
- Do not commit secrets or service-role keys.
- Hosted Supabase Auth redirect URLs require Dashboard verification before broader tester rollout.

## Documentation-only changes

- Verify referenced paths exist.
- Ensure new files are in the correct `.ai` folder.
- Update feature specs and roadmap when implementation state changes.
- Run `git diff --check` before finalizing.

If the documentation change is meant to fix agent drift, degraded performance, stale context, or repeated mistakes, also verify:

- `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md` exists and is linked from `.ai/README.md` and `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`;
- the change identifies the active source of truth rather than adding another parallel instruction set;
- the final report states what remains unverified.

## Manual browser QA

For the current authenticated MVP path:

1. `/workshop/projects` redirects signed-out users to `/login?next=/workshop/projects`.
2. `/login` renders compact magic-link UI.
3. After magic-link sign-in, `/workshop/projects` renders the live project form.
4. Creating a project redirects to `/workshop/projects/{projectId}`.
5. Opening estimates shows `/workshop/projects/{projectId}/estimates`.
6. Creating an estimate redirects to `/workshop/projects/{projectId}/estimates/{areaNodeId}`.
7. Opening `/workshop/projects/{projectId}/estimates/{nodeId}` renders only a node from an estimate owned by that project; mismatched project/node pairs return 404.
8. Tree items change the URL with `aria-current="page"` on the selected node, and content uses the route-loaded tree/rows.
9. Adding, replacing, deleting, or editing an estimate row persists the `estimate_row_items` record through TanStack Query mutation hooks and shows compact save state.

## Estimation-domain claims

For cost, materials, labor, code, tax, or professional-practice claims:

- cite source and date;
- separate assumptions from verified facts;
- preserve calculation inputs and formulas;
- record uncertainty ranges when exact values are not reliable.
