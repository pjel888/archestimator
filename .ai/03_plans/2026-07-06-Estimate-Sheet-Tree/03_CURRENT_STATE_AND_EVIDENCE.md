# Current State And Evidence

## Live Production Bug (added 2026-07-06, verified)

The user-reported error **"Could not reorder estimate tree: Estimate history event workspace could not be resolved."** fires on every reorder attempt (flat or nested). Root cause and call chain are documented in `04_ROOT_CAUSE_AND_DEBUG_PLAN.md` (RC0).

## Estimate Component

- `EstimateSheetTree` uses the shared custom `Tree`, not React Complex Tree, for the active sidebar (`src/components/workshop/EstimateSheetTree.tsx:1997-2041`).
- It enables row dragging, selection, inside drops on leaves, custom drag MIME, domain can-drop checks, external drops, and bottom root drop zone (`src/components/workshop/EstimateSheetTree.tsx:2008-2021`).
- Reorder is blocked while mutation save, inline rename, search, or optimistic create is active (`src/components/workshop/EstimateSheetTree.tsx:825-831`).
- Hover validation uses `validateEstimateTreeDrop`, not the full planner (`src/components/workshop/EstimateSheetTree.tsx:833-841`).
- Drop uses `evaluateEstimateTreeDrop`, optimistically writes `freshResult.plan.nextNodes`, then calls `reorderEstimateTreeNodes` (`src/components/workshop/EstimateSheetTree.tsx:847-908`).
- Successful settle merges confirmed tree structure into current cached nodes (`src/components/workshop/EstimateSheetTree.tsx:888-896`).
- `useEffectEvent` is imported from React (`src/components/workshop/EstimateSheetTree.tsx:4`) and used at line 601 for `reportReorderStatus` — this is React 19's effect-event API.
- Optimistic node id resolution uses two refs: `pendingNodeCreatesRef` (Map<optimisticId, Promise<serverId>>) and `resolvedNodeIdsRef` (Map<optimisticId, serverId>) — see lines 463-468.
- Context menu, inline rename, optimistic create, delete, bulk delete, restore Undo, search/filter, lazy subtree hydration, active-tab routing, status/toast, and external-drop states are all current component state. The canonical inventory is `20_STATE_INVENTORY_AND_SHADOW_PATHS.md`.

## Shared Tree

- Drop intent is based on vertical row bands: with inside allowed, top 25 percent is before, bottom 25 percent is after, middle 50 percent is inside (`src/components/ui/tree.tsx:399-415`, verified).
- Selected, focus, and drop visuals are class-based on the same row.
- Drag rail width and margin transition on hover/focus.
- Drag handler is installed on the row, while the grip span only stops click propagation (R7 finding).
- Keyboard navigation supports arrows, Home/End, typeahead, F2, Shift+F10, Enter, and Space, but there are no keyboard move commands in the shared tree (RC4 finding).

## Planner

- The planner rejects unknown nodes, self-drop, cycles, multi-drag, and no-ops (`src/lib/estimates/estimate-tree-reorder.ts:95`).
- P6 single-node model verified at `estimate-tree-reorder.ts:353-360`: any node may parent any node. The only structural rules are self-drop and cycle.
- Drops are intended to land exactly where the user releases, with no kind-based sibling sorting.
- Sparse reorder updates use persisted sibling `sortOrder` when safe (`src/lib/estimates/estimate-tree-reorder.ts:210`).
- `mergeEstimateTreeStructureWithCachedNodes` does not adopt `sortOrder`, `name`, `total`, or `childrenLoaded` from confirmed structure (`src/lib/estimates/estimate-tree-reorder.ts:304-333`, verified).

## Server And Readback

- Server action validates auth, estimate ownership, edit capability, optimistic ids, non-negative sort order, parent ownership, tab isolation, and supported kind (`src/lib/estimates/actions.ts:2170-2244`, verified).
- **It does NOT delegate projected cycle detection to a DB RPC.** The planner comment at `estimate-tree-reorder.ts:357` mentions "the relaxed DB reorder RPC", but no such RPC runs in the active D1 path (RC5 residual).
- The D1 action-client adapter only batch-updates parent and sort order and writes a history event (`src/lib/estimates/d1-action-client.ts:1343-1361`, verified).
- The D1 reorder adapter omits projected-tree validation (RC5 residual).
- **The reorder RPC payload omits `target_project_id`** (`src/lib/estimates/actions.ts:2252-2257`, verified). This is RC0.
- `restoreDeletedEstimateNodes` action wrapper passes `target_project_id` (`src/lib/estimates/actions.ts:3667-3674`), but active D1 adapter calls for `restore_deleted_estimate_rows_with_history` and `restore_deleted_estimate_nodes_with_history` currently throw (`src/lib/estimates/d1-action-client.ts:2014-2019`). Treat restore as UI/action-tested but provider-unproven until a D1 proof or product decision closes the gap.
- Repository reads estimate nodes ordered by `sort_order ASC, id ASC` via `buildEstimateTree` in `workspace-repository.ts`.
- `buildEstimateTree` explicitly preserves stored sibling order and warns against display-side kind sorting.

## Existing Tests (verified present)

- `tests/vitest/estimate-tree-reorder.test.ts` — pure planner coverage.
- `tests/vitest/estimate-sheet-tree-dnd.test.tsx` — rendered optimistic DnD coverage.
- `tests/vitest/estimate-sheet-tree-dom.test.tsx` — DOM coverage.
- `tests/vitest/estimate-tree-context-menu.test.tsx` — Move dialog coverage (only inside today).
- `tests/vitest/estimate-node-reorder-action.test.ts` — action-wrapper coverage (target for Phase 0 payload tests; not D1 history-row proof by itself).
- `tests/vitest/ui-tree.test.tsx` — shared tree DnD and keyboard mechanics.
- `tests/vitest/estimate-tree-drag-over-perf.test.ts` — hover perf coverage.

Additional related test files present:

- `tests/vitest/estimate-tree-bulk-selection.test.tsx`
- `tests/vitest/estimate-tree-edit.test.ts`
- `tests/vitest/estimate-tree-filter.test.tsx`
- `tests/vitest/estimate-tree-lazy-hydration-ui.test.tsx`
- `tests/vitest/estimate-tree-lazy-subtree.test.ts`
- `tests/vitest/estimate-tree-modal.test.tsx`
- `tests/vitest/estimate-tree-node-icon.test.tsx`
- `tests/vitest/estimate-tree-refetch-on-mount.test.tsx`
- `tests/vitest/estimate-row-tree-patch.test.ts`
- `tests/vitest/estimate-sheet-create-empty-tree.test.ts`
- `tests/vitest/estimate-sheet-tree-query-error.test.tsx`
- `tests/vitest/estimate-node-route-context-rpc-contract.test.ts`
- `tests/vitest/workspace-repository-estimate-tree.test.ts`
- `tests/vitest/share-estimate-tree-panel-a11y.test.tsx`
- `tests/vitest/share-estimate-tree-view-performance.test.tsx`

## Coverage Corrections From 2026-07-06 State-Matrix Revision

- Context-menu CRUD basics, inline rename lifecycle, delete optimistic/rollback/Undo success, bulk selection/delete/restore success, pointer DnD optimistic success/rollback, shared-tree keyboard navigation, filter pruning, and lazy hydration are existing coverage, not broad gaps.
- Precise remaining gaps: existing reorder action expectations assert the old payload shape; mocked action tests do not prove D1 history insertion; Move dialog before/after/root is unimplemented; disabled reasons are not reliably accessible; permission-gated tree controls are missing; restore failure/provider support is unproven; search/filter empty copy is misleading; optimistic-id reorder gate needs reason coverage.

## Concurrency Model (added 2026-07-06)

- Reorder is **last-write-wins**. No version field, etag, or CAS check.
- `pendingReordersRef` (`EstimateSheetTree.tsx:460`) is a counter, not a queue — two overlapping drops are not serialized client-side.
- Optimistic-id resolution uses two refs to coordinate creates that fire before the server confirms the node id.
- This is acceptable pre-first-user; multi-user concurrency is a follow-up.

## Stack Verification (2026-07-06)

From `package.json`:

- `next@16.2.6`
- `react@19.2.6`, `react-dom@19.2.6`
- `better-auth@1.6.22`
- `react-complex-tree@^2.6.1` — installed but unused by active EstimateSheetTree (verifiable in component imports).
- `zustand@5.0.14`
- `wrangler@^4.105.0`
- `@opennextjs/cloudflare@^1.20.1`
