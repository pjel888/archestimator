# Code Review Graph Context After Matrix Refresh

## Graph Stats

- Status: ok.
- Files: 356.
- Total nodes: 3,206.
- Total edges: 45,350.
- Languages: javascript, typescript, tsx, sql.
- Last updated: 2026-05-31T18:32:45.
- Nodes by kind: 11 classes, 356 files, 1,987 functions, 852 tests.
- Edges by kind: 26,750 calls, 2,980 contains, 1,532 imports, 126 references, 13,962 tested-by.

## Review Context

- Status: ok.
- Base: `HEAD`.
- Changed files: 44.
- Impacted nodes/files: 191 impacted nodes in 92 files.
- Risk: high.
- Key entities: `e2e/auth.spec.ts`, `src/app/providers.tsx`, `AppProviders`, auth route tests.
- Test gaps reported by graph: 191.
- Follow-up suggestions from graph: `detect_changes`, `get_affected_flows`, `get_impact_radius`.

## Interpretation

The graph review classifies the current branch as high risk because this is a broad route-transition branch touching shared providers, auth/proxy tests, workshop shells, route components, and E2E coverage. This does not supersede command validation; it is an additional risk signal for release review.
