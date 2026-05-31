# Graph And GitNexus Review After Hover Evidence Contract

## Code Review Graph

- Tool: `mcp__code_review_graph.get_review_context_tool`.
- Base: `HEAD`.
- Changed files: 44.
- Impacted nodes/files: 191 impacted nodes across 92 files.
- Risk: high.
- Test gaps reported: 191.

## GitNexus

- Command: `npx gitnexus detect-changes --repo archestimator`.
- Changed files: 44.
- Changed symbols: 91.
- Affected execution flows: 58.
- Risk level: critical.
- Representative affected flows include project dashboard, project charts, create estimate, and project estimates page flows through `getCurrentWorkspaceProject`.

## Interpretation

The route-transition branch has broad blast radius because it touches shared workshop shell, project route, provider, repository, proxy, chart, and navigation surfaces. This evidence does not indicate a specific failing test, but it blocks any production-readiness claim without broader smoke/manual review.
