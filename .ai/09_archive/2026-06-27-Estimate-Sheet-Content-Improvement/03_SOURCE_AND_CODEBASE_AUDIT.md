# Source And Codebase Audit

## Route And Composition

| Surface | Evidence | Notes |
|---|---|---|
| Target route | `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx` | Route resolves estimate context and passes edit capability into the client workspace. |
| Main sheet client | `src/components/workshop/EstimateSheetContent.tsx:917-1057`, `1648-1938`, `2295-2520` | High-blast-radius component owns route/tab selection, tree query choice, editable rows, library events, row move dialog, proposal/export/activity/sidebar orchestration. |
| Tree | `src/components/workshop/EstimateSheetTree.tsx:601-639`, `840-1003`, `1005-1434` | Owns tree reorder, external drops, optimistic add/rename/delete/bulk delete, local-node reconciliation. |
| Row table | `src/components/workshop/estimate-sheet/rows/row-table.tsx:340-375`, `795-806`, `856-868`, `961-969` | Owns row drag payload, row-level drop, table drop-to-end, and row virtualization. |
| Drag store | `src/components/workshop/estimate-workshop-drag.ts:47-67` | Zustand active-drag state clears on window `dragend`/`drop`. |

## React Next Source Authority

| Source | Evidence | Planning Consequence |
|---|---|---|
| `package.json` | Next `16.2.6`, React `19.2.6`, TanStack Query `5.100.14`, Zustand `5.0.14`, Bun `1.3.14`; scripts include `type-check`, `lint`, `test:dom`, `test:e2e`, `validate`. | Future implementation must use current repo versions and targeted validation, not older Next assumptions. |
| `next.config.ts` | `experimental.staleTimes`, image `localPatterns` for `/api/projects/images`, Supabase/Google image remote patterns, share/workshop security headers. | Cache, route, image, and public/share/export behavior must respect existing config and headers. |
| `tsconfig.json` | Strict TypeScript, bundler module resolution, `jsx: "react-jsx"`, Next plugin. | Type/import-boundary proof should use repo TypeScript constraints. |
| `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` | Server Components fetch data/secrets server-side; Client Components handle state/events/browser APIs; `"use client"` defines client bundle boundary. | Route context and secrets stay server-owned; interactive sheet state stays client-owned through safe DTOs. |
| `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md` | Server Functions/Actions are async, direct-POST reachable, and require auth/authz inside every action. | Server Action direct-POST contracts are release blockers, not optional security review. |
| `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md` | Request-time APIs, cache keys, Suspense, and revalidation require explicit cache decisions. | The estimate route needs a mutation-class cache matrix rather than generic "invalidate cache" instructions. |
| `node_modules/next/dist/docs/01-app/02-guides/data-security.md` | DAL/DTO posture: server-only data access, auth checks, minimal DTOs, secrets only in server modules. | Public/export/history/action DTO minimization is required. |
| `DESIGN.md` and `src/components/ui/` | Repo design guidance and primitive reuse policy. | Dense sheet ergonomics and component reuse must guide UX changes before new custom UI. |

## Current Mutation Model

| Layer | Evidence | Current Behavior |
|---|---|---|
| Save state | `src/hooks/use-estimate-row-mutations.ts:280-330` | `idle`, `dirty`, `saving`, `saved`, `failed`; active mutation count tracks coarse global state. |
| Toast feedback | `src/components/workshop/EstimateSheetContent.tsx:953-973` | Routine row saving/saved/failure emits global toast `estimate-row-save`. |
| Per-row queue | `src/hooks/use-estimate-row-mutations.ts:742-779` | Scalar update, replace, detach, promote, delete are queued per row; insert, component move, row move, bulk delete, restore are not all unified. |
| Optimistic row edits | `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts:432-504` and `use-estimate-row-mutations.ts:631-690` | UI patches local editable/tree state, caches previous patch, rejects stale response by per-row operation id. |
| Insert | `use-estimate-row-handlers.ts:606-654`, `actions.ts:2883-2945` | Optimistic row append; express draft buffers edits during insert; RPC persists with history. |
| Delete/undo | `use-estimate-row-handlers.ts:1096-1240`, `actions.ts:3121-3133`, `3302-3327` | Optimistic removal, toast-bound Undo, restore RPC. |
| Component move | `use-estimate-row-handlers.ts:951-1016`, `actions.ts:3136-3169` | Swaps component payload between rows through history RPC. |
| Row move | `use-estimate-row-handlers.ts:1018-1080`, `actions.ts:3189-3229`, `estimate-row-tree-move.ts:237-315` | Optimistic tree move, persisted by `move_estimate_row_item_with_history`, success applies returned rows. |

## Data And RPC Evidence

| Surface | Evidence | Notes |
|---|---|---|
| Event history | `supabase/migrations/20260524033151_estimate_sheet_version_control.sql:19`, `238-258` | `estimate_sheet_events.correlation_id` plus `estimate_sheet_event_result` provide idempotency convention. |
| Row insert/update/replace/delete RPCs | `20260524033151_estimate_sheet_version_control.sql:278-787`, updated in `20260627103000_quantity_contingency_and_sheet_adjustments.sql:338-791` | Event-logged row mutations. |
| Row component move RPC | `20260627103000_quantity_contingency_and_sheet_adjustments.sql:1017-1212` | Moves component content between rows with expected revisions. |
| Row restore RPC | `20260627103000_quantity_contingency_and_sheet_adjustments.sql:1244-1480` | Restores deleted rows from history event. |
| Row item move RPC | `supabase/migrations/20260627090000_estimate_row_item_move_rpc.sql:10-412`, patched by `20260627115000_estimate_row_item_move_idempotency_recheck.sql` | Strongest current persistence path: estimate lock, node/tab validation, dense sort, revisions, event, returned rows. |
| Route-context cache | `src/lib/repositories/workspace-repository.ts:3492-3591` | Process cache keyed by session/project/route/load limits; `clearEstimateRouteContextProcessCache` exists. |
| Legacy direct repository writes | `src/lib/repositories/estimate-repository.ts:232-268` | Browser repository can upsert/delete `estimate_row_items` directly if reachable. |

## Reported Row Move Bug Hypotheses

These are hypotheses requiring proof, not confirmed root causes.

| Hypothesis | Evidence | Proof Required |
|---|---|---|
| Global save state blocks follow-up row movement after content-to-tree move. | `use-estimate-row-handlers.ts:1027-1029` blocks any row move while `saveState` is `dirty` or `saving`; `moveRowItemMutation` marks saving at `use-estimate-row-mutations.ts:486-494`. | Browser test: move row to tree, immediately reorder same target area and source area; assert no blocking toast when actions are independent. |
| Tree drop target index is computed from tree-local node state that may lag content state. | `EstimateSheetTree.tsx:963-970` uses `targetNode.estimateRowItems?.length ?? 0`, while content later applies move against `EstimateSheetContent` tree at `1923-1928`. | Unit/DOM test with stale tree localNodes vs content query tree; verify targetIndex is rederived or validated by content at submit time. |
| Move result reconciliation can no-op if returned rows are not present in current tree. | `estimate-row-tree-move.ts:212-234` returns original tree if `rowById.size === 0` after strip. | Unit test for refetch/virtualization/stale-tree divergence; require active refetch or authoritative server replacement when result rows are absent. |
| Global drag state may remain active after external tree drops in edge browsers. | `beginEstimateWorkshopDrag` relies on window `drop`/`dragend`; tree external drop dispatches custom event at `EstimateSheetTree.tsx:971`. | Browser test asserts no lingering row-drop affordances and `activeDrag` cleared after successful and cancelled tree drops. |

## Existing Test Evidence

| Area | Evidence |
|---|---|
| Row movement browser proof | `e2e/estimate-row-move.spec.ts:401-445` covers drag/drop persistence after reload when env-gated. |
| Tree DnD | `e2e/estimate-tree-dnd.spec.ts`, `tests/vitest/estimate-sheet-tree-dnd.test.tsx` cover tree order/reparent and stale prop protection. |
| Row render/perf | `tests/vitest/perf/estimate-sheet-render-baseline.test.tsx`, `estimate-sheet-render-relief.test.tsx`, `estimate-sheet-memoization.test.tsx`, `estimate-sheet-cursor-isolation.test.tsx`. |
| Virtualization | `tests/vitest/estimate-row-table-virtualization.test.tsx` proves bounded mounted rows but notes active express editor disables virtualization. |
| Static contracts | `tests/vitest/estimate-sheet-center-atomic-contracts.test.ts` checks key event/move wiring. |

## Spec Drift

| Document | Drift |
|---|---|
| `.ai/06_specs/current-project-estimates-component-library-spec.md` | Still references sample data route and older area-only row insertion, while current code uses live route context and single-node relaxed insertion. |
| `.ai/06_specs/mvp-ux-flow.md` | Mentions tree drag/drop behavior that conflicts with stale component-library spec language. |
| `.ai/06_specs/live-project-estimate-bootstrap.md` | Describes older route tree loaders instead of `resolveEstimateTabRouteContext`. |
| `.ai/08_prompts/IMPLEMENT-2026-06-25-Estimate-Sheet-Orchestration.md` | Mentions row-level save/failure chips, while current component-library spec says no save pills. This plan resolves the conflict by requiring quiet sheet/row status and failure-only interruptions. |
