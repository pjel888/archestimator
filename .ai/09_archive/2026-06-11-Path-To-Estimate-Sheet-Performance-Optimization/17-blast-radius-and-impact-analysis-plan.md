# 17 - Blast Radius and Impact Analysis Plan

**Date**: 2026-06-11
**Purpose**: Define the impact-analysis gates required before changing the landing-to-estimate-sheet performance path.
**Status**: Planning only; future implementation must rerun on the code-bearing branch.

---

## Why This Exists

The performance path crosses public landing UI, auth/proxy behavior, protected App Router pages, Supabase repositories, collaboration/cursor state, component-library data, estimate-tree mutation flows, and optional database migrations. A narrow test can go green while breaking a neighboring workflow. Every implementation unit needs a blast-radius check before edit and after diff.

---

## Required Pre-Edit Impact Workflow

Before changing any production source file:

1. Record `git status --short --branch` and preserve unrelated dirty work.
2. Use code-review graph first when available:
   - `get_architecture_overview`
   - `semantic_search_nodes` for target files/symbols
   - `get_impact_radius` for touched symbols
   - `query_graph` for callers/callees/imports/tests
3. Use GitNexus impact tools if available and healthy.
4. If graph/GitNexus tooling fails, record the failure and run manual source tracing with `rg`, `sed`, and targeted tests.
5. Identify callers, consumers, tests, data contracts, routes, and provider surfaces.
6. Select verification commands that cover the blast radius.
7. Only then edit.

---

## Impact Matrix by Implementation Unit

| Unit | Likely files | High-risk dependents | Required impact proof | Minimum verification |
|------|--------------|----------------------|-----------------------|----------------------|
| U0 Baseline/harness | `tests/vitest/*`, `e2e/*`, `.ai/09_archive/store/*` | None if test-only; fixture scripts may affect local DB | Confirm fixtures are local/dev only and do not mutate linked provider without authority | Targeted test/harness run plus dirty-worktree snapshot |
| U1 Render relief | `EstimateSheetContent.tsx` | Cost inputs, totals, row detail modals, proposal preview, activity scope, drag/drop, cursor overlay | Callers/children of row table and total derivation; callback identity and mutable prop check | Cost-input DOM tests, render-count harness, browser typing trace |
| U2 Column selection | `workspace-repository.ts`, type mappers | Sheet page props, project metadata strip, publication/collaboration summaries, linked-row image/source display | Repository return-shape diff and all consumers of narrowed fields | Repository shape tests, estimate-sheet browser smoke, TypeScript |
| U3 Estimate-list aggregate | `workspace-repository.ts`, migrations/RPC/view | Project estimates page, table sorting/filtering, counts/totals, RLS | Old JS aggregate vs new SQL/RPC parity and RLS policy impact | SQL parity tests, estimate-list browser smoke, EXPLAIN |
| U4 Library lazy load | Estimate page, `EstimateWorkspaceClient`, component-library client/actions | Sidebar, template insert, component drag/drop, library manager expectations | Initial props removal impact, sidebar open data flow, cache invalidation after edits | Network request log, sidebar first-open/reopen QA, drag/drop tests |
| U5 Index/migration | `supabase/migrations/*`, generated types if needed | Local and linked DB schema, migration order, RLS policies | EXPLAIN before/after and migration idempotence | Local migration test, EXPLAIN artifact, provider authority record |
| U6 Landing/CSS/auth | `src/app/layout.tsx`, workshop layout, landing components, auth helpers, `src/proxy.ts` | Landing CTA, closed-beta gates, protected route auth, workshop tree styling | Route/layout import graph and auth/proxy branch proof | Anonymous landing browser trace, signed-in workshop entry, auth route tests |
| U7 Scheduling/optimistic state | `EstimateSheetContent.tsx`, row mutation hooks | Blur commit, rollback, revision guards, server actions, proposal preview, activity scope | Mutation state-machine and server-action caller analysis | Rapid typing, tab-away, failed mutation rollback, preview/activity tests |
| U8 Cursor isolation | Cursor hook, overlay subtree, sheet content | Realtime channels, focus, row renders, collaborator presence | Cursor state consumers and render boundaries | Mocked realtime/cursor tests, render-count trace |
| U9 Component split | `EstimateSheetContent.tsx`, new child files | Import cycles, stale prop drilling, design-system consistency | Extracted boundary import graph and changed prop contracts | Existing sheet suite after each extraction batch |
| U10 Virtualization | New body/grid component, package files | Keyboard navigation, focus retention, drag/drop zones, cursor coordinates, print/export | DOM recycling effects on every row interaction and off-screen selection | 500/1000-row browser QA, drag/drop QA, cursor QA |
| Package/cache/image decisions | `package.json`, `next.config.ts`, image components, cache helpers | Bundle chunks, provider cost, env vars, stale data, auth/privacy | ADR plus before/after bundle/network/cache metrics | Bundle analyzer, route trace, cache invalidation tests |

---

## Cross-Cutting Regression Surfaces

Every implementation wave must consider:

- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/EstimateSheetTree.tsx`
- `src/components/workshop/EstimateWorkspaceClient.tsx`
- `src/components/workshop/component-library/index.tsx`
- `src/components/workshop/component-library/ComponentCard.tsx`
- `src/lib/repositories/workspace-repository.ts`
- `src/lib/repositories/component-library-repository.ts`
- `src/lib/estimates/actions.ts`
- `src/hooks/use-estimate-query.ts`
- `src/hooks/use-estimate-row-mutations.ts`
- `src/hooks/use-estimate-cursor-broadcast.ts`
- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
- `src/app/layout.tsx`
- `src/proxy.ts`
- Supabase migrations and RLS policies when database shape changes.

---

## Required Post-Diff Impact Workflow

After each coherent implementation unit:

1. Run graph `detect_changes` if available.
2. Inspect the actual diff, not just worker summaries.
3. Confirm every changed file is expected for the unit.
4. Run LSP/typecheck for changed TypeScript files.
5. Run targeted tests mapped to the impact matrix.
6. Run at least one real browser/manual QA scenario for user-facing behavior.
7. Record evidence path in the active plan pack.
8. If impact exceeds the planned unit, stop and revise the plan before continuing.

---

## Red Flags That Require Plan Revision

- A package install adds client bundle weight without route-level proof.
- A cache proposal touches user-specific data without invalidation and permission-change tests.
- A `next/image` migration changes layout, alt text, or private image loading.
- A repository column-selection change requires `as any` or type suppression.
- A virtualization change breaks focus, drag/drop, cursor coordinates, print/export, or off-screen selection.
- A CSS import move breaks workshop tree styling or landing visual layout.
- A database migration needs linked-provider access that has not been explicitly approved.
- A performance metric improves locally while a QA matrix row fails.

---

## Evidence Receipt Template

```markdown
## Blast Radius Receipt - <unit>

**Branch/commit**:
**Files changed**:
**Graph/GitNexus command(s)**:
**Manual fallback if graph unavailable**:
**Known callers/consumers**:
**Tests run**:
**Browser/manual QA run**:
**Metric artifacts**:
**Unexpected impact**:
**Plan updates required**:
```

