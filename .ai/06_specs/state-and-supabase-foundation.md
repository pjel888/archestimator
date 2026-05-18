# Archestimator State and Supabase Foundation

**Date:** 2026-05-18
**Status:** Approved direction / implementation foundation started

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

`estimate_node.kind` should support:

```txt
lot | structure | level | area | group | assembly
```

Only `area` nodes may receive estimate row items unless Philip explicitly approves a broader receiving rule.

## Mutation boundary

Domain mutations are the only legal path for structural changes:

- `moveEstimateNode`
- `moveEstimateRowItem`
- `insertLibraryItemIntoEstimate`
- `replaceEstimateRowSource`
- `updateEstimateRowValues`

UI can optimistically update through TanStack Query, but persistence must be committed through repository/domain functions.
