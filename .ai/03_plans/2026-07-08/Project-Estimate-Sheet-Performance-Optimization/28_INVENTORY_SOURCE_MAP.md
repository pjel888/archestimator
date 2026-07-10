# 28 - Inventory, Source Map, And Freshness Register

Machine-readable artifact hashes and `SRC-*` links live in `plan-pack.json`. `IMPLEMENTATION_PLAN.md` is the sole canonical execution artifact.

## Authority Inventory

| Role | Artifact | Status |
|---|---|---|
| Entrypoint | `README.md` | Current |
| Manifest | `plan-pack.json` | Current after final validation |
| Canonical execution | `IMPLEMENTATION_PLAN.md` | Current |
| Original requirements | `04_REQUIREMENTS_SPECIFICATION.md` | Current alias source; normalized IDs are canonical |
| Decisions | `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | Current |
| Evaluator contract | `20_PERFORMANCE_EVALUATOR_SPEC.md` | Current |
| Interop contract | `22_COMPONENT_INTEROPERABILITY_SPEC.md` | Current, 19 unique IDs |
| Plan readiness | `17_FINAL_READINESS_REVIEW.md`, `23_FINAL_SCORECARD_AND_READINESS.md` | Current |
| Planning evidence | `evidence/2026-07-10-frontier-plan-readiness.md` | Current after final frozen-state review |
| Durable loop | `LOOP_LEDGER.md` | Current |
| Earlier phase plan | `11_IMPLEMENTATION_PLAN.md`, `21_EXECUTION_HANDOFF.md` | Superseded for execution |
| Other numbered docs | `00`-`10`, `12`-`14`, `16`, `18`-`19`, `24`-`27`, `29` | Supporting context; canonical plan wins on conflict |

## Current Source Map

| Surface | Current path/symbol | Fresh finding |
|---|---|---|
| Estimate route | `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx` | Suspense route resolves the selected estimate/tab tree before passing it to the client. |
| Route repository | `src/lib/repositories/workspace-repository.ts` / `resolveEstimateTabRouteContext` | D1 fast-path helper is still a null stub; fallback performs current access/read flow. |
| Load ceiling | `src/lib/estimates/load-limits.ts` / `ESTIMATE_SHEET_TREE_LOAD_LIMITS` | 1,500 nodes / 5,000 rows. |
| Client shell | `src/components/workshop/EstimateWorkspaceClient.tsx` | Full nested nodes enter both lazy panes. |
| Hot sheet | `src/components/workshop/EstimateSheetContent.tsx` | Large reducer plus recursive search/facet/group/totals work. |
| Tree | `src/components/workshop/EstimateSheetTree.tsx` | Repeated content signatures and lazy subtree merge. |
| Virtual rows/branches | `estimate-sheet/rows/row-table.tsx`, `virtual-branch-list.tsx` | DOM is windowed, but express editing disables row virtualization. |
| Client mutations | `use-estimate-row-mutations.ts`, `use-estimate-row-handlers.ts`, `estimate-row-tree-patch.ts` | Nested snapshots/patches and O(N) client component fan-out remain. |
| D1 writes | `src/lib/estimates/actions.ts`, `src/lib/estimates/d1-action-client.ts` | Server fan-out uses JSON identity filtering plus per-match batched updates; it is not presumed O(1). |
| Active schema | `migrations/` | `metadata_json` is used by rows/nodes; `metadata` by tabs/estimates. |

## Current Test Corrections

- `tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx` exists.
- `tests/vitest/estimate-row-update-broadcast.test.ts` exists.
- `tests/vitest/estimate-sheet-tree-dnd.test.tsx` is the correct tree DnD filename.
- `tests/vitest/estimate-node-route-context-rpc-contract.test.ts` and `tests/vitest/estimate-route-server-concurrency.test.ts` contain stale expectations that `UNIT-001` must repair without weakening access/order behavior.
- Existing performance tests reach 500 rows; source-constant tests do not prove a 5,000-row runtime budget.

## Freshness Classes

| Evidence | Status | Use |
|---|---|---|
| 2026-07-10 source/test audit | `CURRENT` | Planning and exact first-unit scope |
| Installed Next 16 docs | `CURRENT` | Suspense/lazy/env semantics |
| Current Cloudflare D1 official guidance | `CURRENT` at planning time | Metrics/index/free-tier method; recheck before hosted proof |
| 2026-06-26 route benchmark | `STALE` | Scenario design only |
| Generic old `estimate_rows` D1 fixture | `STALE` for estimate-sheet proof | Cannot pass current D1 gates |
| Runtime artifacts under `evidence/runtime/` | `PLANNED` | Created by `UNIT-001` through `UNIT-011` |

## Resolved Assumptions

- Search scope, move UX, scale ceiling, proposal completeness, master editing, promotion/detach, and tablet/mobile behavior are resolved in `DEC-AUTO-*` records.
- The existing bundle analyzer is active in `next.config.ts`; no dependency decision remains.
- Feature rollback is deployment-scoped and server-resolved; no per-estimate instant-toggle promise remains.
- Hosted cleanup uses exact generated IDs; no cross-table metadata predicate remains.

## Freshness Invalidators

Re-audit and refresh the manifest when any of these changes:

- the planning suite or validator;
- a canonical plan artifact;
- the route/client/repository/mutation symbols listed above;
- active D1 migrations or bindings;
- package scripts, Next version, or test filenames used by the unit packets;
- the shared worktree diff on a unit-owned path before its lease begins.
