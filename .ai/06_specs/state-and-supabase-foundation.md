# Archestimator State and Supabase Foundation

**Date:** 2026-05-18
**Status:** Approved direction / schema foundation added

## Decision

Archestimator will use a three-layer state model:

1. **Supabase/Postgres** for canonical persisted data.
2. **TanStack Query** for server state, caching, optimistic mutations, retries, and invalidation.
3. **Zustand** for high-frequency UI/interaction state: selected node, focused cell, selected rows, expanded tree nodes, drag state, panel state, search/filter state.

Drag/drop and editing must go through domain mutations, not feature-local array rewrites.

## Security note: TanStack package incident

A package-advisory check was run before adopting TanStack Query.

- `@tanstack/react-query`: no known OSV vulnerabilities found during the check.
- `@tanstack/query-core`: no known OSV vulnerabilities found during the check.
- The recent malicious package advisories affected TanStack Router/Start-related packages such as `@tanstack/react-router`, `@tanstack/router-core`, `@tanstack/react-start`, and related plugin/devtool packages.

Archestimator may use `@tanstack/react-query`, but must avoid TanStack Router/Start unless a fresh security review explicitly approves them. Next.js App Router remains the routing layer.

## Package policy

New state/data packages should be pinned to exact versions where practical:

- `@tanstack/react-query`
- `@supabase/supabase-js`
- `@supabase/ssr`
- `zustand`
- `@dnd-kit/core`
- `@dnd-kit/sortable`

## Supabase project boundary

Archestimator must use its own Supabase project and must not share the SlateCamp database.

Current Archestimator project reference:

```txt
ebxxqidacheyapmmzavr
```

Public app env values belong in `.env.local`; service-role keys, personal access tokens, and real database passwords must not be committed or pasted into tracked docs.

## Canonical estimate model

Use a tree plus rows, not spreadsheet-cell persistence:

```txt
workspace
  project
    estimate
      estimate_node
        estimate_row_item
```

`estimate_node.kind` supports:

```txt
lot | structure | level | area | group | assembly
```

Only `area` nodes may receive estimate row items unless Philip explicitly approves a broader receiving rule.

## Migration files

The first schema foundation is tracked in:

- `supabase/migrations/20260518090000_archestimator_core_schema.sql`
- `supabase/seed.sql`

The schema includes:

- `workspaces`
- `workspace_members`
- `projects`
- `estimates`
- `cost_library_items`
- `estimate_nodes`
- `estimate_row_items`

RLS is enabled on all app tables from the first migration. Anonymous users should not receive application rows. Authenticated users can access records only through workspace membership policies. Workspace creation automatically inserts an owner membership for the creator through an insert trigger.

## Generated/type boundary

`src/lib/supabase/types.ts` mirrors the current migration schema until live type generation can be run against the linked Supabase database. After the migration is applied to the remote project, replace or confirm this file with generated Supabase types.

## Repository boundary

The estimate repository now has two implementations behind one public interface:

- in-memory fallback when Supabase public env vars are missing;
- Supabase-backed reads/writes when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present.

Screens/hooks should continue to call repository functions, not raw Supabase queries directly.

## Mutation boundary

Domain mutations are the only legal path for structural changes:

- `moveEstimateNode`
- `moveEstimateRowItem`
- `insertLibraryItemIntoEstimate`
- `replaceEstimateRowSource`
- `updateEstimateRowValues`

UI can optimistically update through TanStack Query, but persistence must be committed through repository/domain functions.

## Next steps

1. Apply the migration to the linked Supabase project once the database password or Supabase PAT/MCP path is available.
2. Generate official Supabase TypeScript types from the remote schema.
3. Add authenticated workspace/project creation flows.
4. Expand repository functions for insert/update/delete row items and cost-library operations.
5. Add tests around authenticated data access and RLS expectations.
