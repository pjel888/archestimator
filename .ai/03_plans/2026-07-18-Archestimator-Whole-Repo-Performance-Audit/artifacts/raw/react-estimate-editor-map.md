# React / Estimate-Editor Surface Map

Source: dispatched agent recon + lead verification against `HEAD = a41a07d0143abf72289a97cd8bd023cfa9986361`.

## Estimate Editor Data Path

### God component
- **`EstimateSheetContent`** at `src/components/workshop/EstimateSheetContent.tsx`, **3,803 lines** (lines 1085-3803). Owns the entire sheet state machine.
- `next/dynamic` loaded via `EstimateWorkspaceClient` at `EstimateWorkspaceClient.tsx:60-63` (`ssr: true`). `EstimateSheetTree` is `ssr: false` (`:56-59`).
- Single `useReducer` over a 25-field `EstimateSheetContentState` (`:678-705`, mounted at `:1228-1232`).
- `useEstimateRowMutations(...)` at `:1179-1185` returns insert/replace/move/promote/delete/restore/update + statuses + saveState.
- `createEditableRowStore(...)` held in `useState` at `:1279`, provided via `<EditableRowStoreContext.Provider>` at `:3573`.
- All field setters wrapped via `useStableCallback` (`:1281-1372`).
- `reportEstimateSheetContentRender()` on every render at `:1122` (null in production).

### Render tree
`EstimateSheetContent` (`:3562`) → `<EstimateSheetVirtualBranchList>` (`:3575`) → `<EstimateSheetBranch>` (memoized; `branch.tsx:604`) → `<EstimateRowItemsTable>` (memoized; `row-table.tsx:1011`).

- `EstimateSheetVirtualBranchList` (`virtual-branch-list.tsx:74`) is **NOT memoized**; recomputes visible-branch flatten on every render (`:80-92`); master-column virtualization gated by `WORKSHOP_ESTIMATE_MASTER_COLUMN_VIRTUALIZATION` flag with `minSections ?? 80` threshold (`:93-104`).
- `EstimateSheetBranch` memoized with custom comparator `areEstimateSheetBranchPropsEqual` (`branch.tsx:141-201`).
- `EstimateRowItemsTable` memoized with custom comparator `areEstimateRowItemsTablePropsEqual` (`row-table.tsx:120-156`).

### Editable-row state machine
- Zustand/vanilla store `createEditableRowStore` at `editable-row-store.ts`. Owns: `rows` (draft), `authoritativeRows` (server), `rowCommitStates`, `externalMutationStatuses`, `tree/treeIndex/nodeTotals/projectTotal/revision`.
- Commit phase: `EditableRowCommitPhase = "idle" | "dirty" | "awaiting-confirmation" | "pending" | "failed"` (`:22`).
- `stageRow(item, patch)` (`:419`) — optimistic draft; called on every keystroke from `row-table.tsx:489-572`.
- `commitRowFields(item, values)` (`:430`) — applies patch then `beginIntent(..., "commit")`; called on `onBlur`.
- `beginIntent` (`:216-366`) mints `activeCommitToken`, binds rows to phase pending, dispatches via registered adapter.

### Mutations → server actions
- All row mutations via server actions wrapped by React Query `useMutation`. Each action wrapped by `runEstimateRowServerAction` inside `startTransition` (`use-estimate-row-mutations.ts:524-530`).
- **Full per-estimate serialization** via `enqueueEstimateMutation` (`:1417-1440`): every mutation chained through `estimateMutationBarrierRef` + per-row `rowMutationQueueTailsRef`.
- Optimistic update on `updateRow.onMutate` (`:1244-1290`): cancels tree query, captures rollback patches, patches tree cache.
- Tree cache key: `estimateQueryKeys.areaTree` (legacy) or `tabTree(estimateId, tabId)` (`use-estimate-query.ts:9-17`).
- Revision-conflict recovery (`recoverAuthoritativeTreeAfterConflict` at `:1230-1236`) re-fetches the whole tree.
- **Pending-status escalation**: 5s interval walks `rowMutationStatusesRef` and fires telemetry for any pending > 15s (`:840-862`).

### Row-table virtualization
- `useVirtualizer` at `row-table.tsx:1062-1072` with `estimateSize: 96`, `overscan: 6`, `getItemKey: items[index]?.id`.
- `virtualEnabled = !hasActiveExpressEditor && virtualization.enabled && items.length >= (minRows ?? 75)` (`:1061`).
- **Inline `style` rebuilt per render at `:1309-1315`**: fresh object literal on every render, passed to `EstimateRowItemTableRow` which uses default `memo()` shallow compare (`:307`). Fresh identity re-renders every mounted virtual row on every parent render.
- `scrollMargin` tracked via passive scroll listener + ResizeObserver (`:1105-1141`); `scrollMarginReducer` no-ops on deltas <0.5 px (`:228-231`).
- Focused-cell effect (`:1095-1103`) calls `focusEstimateCellByRowId` + `requestAnimationFrame` retry.

### History / outbox / restore-replay
- Server intent layer in `src/lib/estimates/d1-intents/`. `rows.ts` is the largest (3,361 lines).
- `prepareHistoryEventInsert` (`history-events.ts:328-412`) appended in same D1 batch as mutation; paired with **outbox** insert into `activity_event_outbox` (`:401-410`). Idempotency via `correlation_id`.
- **Restore-replay flow** (`restoreDeletedEstimateRowsWithHistory`, `rows.ts:3104-3294`):
  1. Loads source delete event by `sourceEventId` (`:3133-3145`).
  2. Reconstructs rows from `old_snapshot.rows`; caps at `MAX_RESTORABLE_ROW_BATCH_SIZE = 100` (`:198,3112,3157`).
  3. **Idempotent replay path issues N parallel `readRowById` calls** (`:3187-3191`) — one `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND id = ?` per restored row, NOT one batched `WHERE id IN (...)`.
  4. Fresh-restore path uses batched collision check (`:3201-3206`) and batched re-read (`:3281-3285`).
- `readRowById` is single-row at `:1697-1704`.
- Many other batched `WHERE ... IN (placeholders(...))` reads exist in `rows.ts`: `:1446,1750,1776,1847,2688,2749,2821,2898,2906,2987,3078,3088,3203,3283`.

### Realtime echo / deduplication
- No Supabase realtime. Cloudflare DO room client `createCloudflareCollaborationRoomClient` (`collaboration-room-client.ts:269`), gated by `isRealtimeTransportEnabled()` feature flag.
- **Cursor broadcast** (`use-estimate-cursor-broadcast.ts`): opens `estimate:{estimateId}` room; receiver drops self-echo (`:301-303`), invalid signatures, out-of-bounds coords. Send-side throttle 80 ms + 6 px min-distance gate (`:142-143,472-515`). Idle cursor eviction every 1 s with 5 s staleness (`:440-455`).
- **Row-update broadcast** (`use-estimate-row-update-broadcast.ts`): subscribe-only sender. **No receive-side consumer exists in the codebase** — `shouldApplyEstimateRowUpdateBroadcast` (`:77`) is exported but unused. Dead code.
- Own-mutation echo handled by optimistic-update layer, not realtime.

### Selection / focus propagation
- Bulk selection is a `Set<string>` in `contentState.bulkSelectedRowIds` (`:682,727,1237`).
- `toggleRowSelection`/`toggleRowsSelection` are `useCallback`-stable (`:1789-1806`), but each toggle constructs a **new Set** → branch/row-table comparators walk every visible row on every toggle.
- `queueMicrotask`-deferred effect prunes selected ids no longer in `visibleSheetRowIds` (`:1774-1787`).
- Focus state held locally in `EstimateRowItemsTable` (`row-table.tsx:1046`); `requestFocusByRowId` → `scrollToIndex` + `setFocusedCell`.

## Client Providers & Global Mount Cost

### Composition (root layout → AppProviders)
- Root layout `src/app/layout.tsx:34-48` mounts `<AppProviders>{children}</AppProviders>` at `:39`. **Mounted for every route** including public marketing, auth, share.
- `AppProviders` at `src/app/providers.tsx:31-49` mounts (in order inside `QueryClientProvider > ToastProvider > NotificationProvider`):
  - `BfcacheHandler` (`:38`) — one `pageshow` listener; renders null.
  - `PerformanceMonitor` (`:39`) — dev-only timing log; renders null.
  - `NavigationListener` (`:40`) — pathname + document click + popstate listeners.
  - `RealtimeAuthBridge` (`:41`) — **returns null, no effects** (`realtime-auth-bridge.tsx:8-10`).
  - `WebVitalsCollector` (`:42`).
  - children (`:43`).
  - `RouteLoadingOverlay` (`:44`).
- `QueryClient` created once via `useState(createQueryClient)` (`:15-32`). Defaults: `staleTime: 5min`, `gcTime: 5min`, `refetchOnWindowFocus: false`, queries retry 1, mutations retry 0.

### Statically-imported modules shipped to every route
`@tanstack/react-query`, `ui/toast`, `ui/route-loading-overlay`, `notifications/{NotificationProvider,ReleaseAnnouncementModal}`, `notifications/hooks/useNotificationsQuery`, `bfcache-handler`, `performance-monitor`, `navigation-listener`, `realtime-auth-bridge`, `web-vitals-collector`, plus `useNavigationUiStore` zustand store.

- `NotificationProvider` short-circuits outside `/workshop` (render short-circuit at `NotificationProvider.tsx:16-18,32-37`), BUT `ReleaseAnnouncementModal` is statically imported (`:6`) so its JS module ships to every route regardless.

## Web-Vitals Collector (`web-vitals-collector.tsx`)
- No external web-vitals dependency — uses native `PerformanceObserver`.
- Posts to `POST /api/internal/web-vitals` via `navigator.sendBeacon` (fallback `fetch keepalive`).
- Endpoint at `src/app/api/internal/web-vitals/route.ts`: `force-dynamic`, same-origin check, ≤4 KB body, name in `{LCP,CLS,INP,FCP,TTFB}`, rating in `{good,needs-improvement,poor}`. Persists via `recordWebVitalEvent` (best-effort, failures swallowed). 1 D1 INSERT per POST.
- **LCP**: posts on every LCP entry — **no dedup**. Long-loading pages emit multiple POSTs.
- **CLS/INP**: `reportCls`/`reportInp` called from BOTH `visibilitychange(hidden)` AND `pagehide` → **duplicate POST when both fire** (common on mobile tab-switch).
- **FCP**: one POST on first paint entry.
- **TTFB**: computed once.
- **Cleanup leak**: `pagehide` listener added anonymously at `:157` is NEVER removed in the cleanup at `:162-168` (only `visibilitychange` is removed).

## Heavy Interaction Notes

### Rapid typing
- Per keystroke → `stageRow(item, values)` → `applyRowPatch` (`editable-row-store.ts:172-200`): rebuilds row map, recomputes `computeEditableRowTotal`, walks `ancestorNodeIds` updating `nodeTotals`, bumps `revision`.
- Every ancestor node total changes identity (`new Map(state.nodeTotals)`, `:183`), re-rendering every visible ancestor branch via `branch.tsx:180-182`.
- `onChange` also calls local `setState` 3 times per keystroke in addition to store update.
- Commit only on `onBlur` or `commitQuantityFields`.

### Scroll
- Per-frame cost: passive scroll listener + ResizeObserver on scroll parent (`row-table.tsx:1105-1141`); `getBoundingClientRect()` ×2 per event; `scrollMarginReducer` no-ops on <0.5 px deltas.
- Master-column `EstimateSheetVirtualBranchList` drives the same scroll parent.

### Row insert / move / restore / delete
- **Insert**: serialized via `enqueueEstimateMutation`. No optimistic tree patch — only editable-row store draft; tree patched on `onSuccess`.
- **Move**: `onSuccess` runs `reconcileEstimateRowItemMoveResultToTree`; **falls back to full tree re-fetch** if reconciliation status is `missing-rows` (`:1082-1106`).
- **Restore**: no optimistic update; on success invalidates tree query (`refetchType: "none"`). Server path includes the N-`readRowById` replay issue.
- **Delete**: no optimistic tree patch; on success invalidates projection caches + tree query.

### Expand / collapse tree
- `collapsedNodeIdsByScope` in `contentState` (`:681,1236`); per-toggle writes new `Set`.
- `flattenVisibleBranches` (`virtual-branch-list.tsx:44-72`) O(visible branches); recomputes on every toggle.
- `expandAll`/`collapseAll` rebuild whole collapsed set.

### Multi-row action / bulk selection
- Each toggle constructs a new `Set` → branch/row-table comparators walk every visible row on every toggle (O(rows × visible subtree) for "select all").
- Bulk toolbar gated by `bulkSelectedRowCount > 0`.

### Column resize (pointer drag)
- `useEstimateColumnResizeController` (`columns/use-estimate-column-resize-controller.ts`): raw `pointermove`/`pointerup`/`pointercancel` listeners; writes `surface.style.setProperty(estimateColumnCssVar(columnId), width)` per move. **No React state during drag** — cheapest hot path in the sheet.

## Static-Confirmed Observations
1. `EstimateSheetContent` is 3,803 lines — god component (`EstimateSheetContent.tsx:1085-3803`).
2. Render probes (`reportEstimateSheetContentRender`, etc.) null in production.
3. Inline `style` rebuilt per render for memoized row at `row-table.tsx:1309-1315`.
4. AppProviders ships 8 providers globally (`providers.tsx:35-46`).
5. `RealtimeAuthBridge` returns null (`realtime-auth-bridge.tsx:8-10`).
6. `WebVitalsCollector` double-posts CLS and INP; LCP posts on every entry with no dedup.
7. Editable-row store mutates node totals up the ancestor chain on every keystroke (`editable-row-store.ts:172-200`).
8. `stageRow` called on every keystroke (`row-table.tsx:491,518,524,561,569,927`).
9. Row mutations fully serialized per estimate (`use-estimate-row-mutations.ts:1417-1440`).
10. Revision-conflict recovery re-fetches the whole tree (`:1230-1236`).
11. Move success can fall back to full tree re-fetch (`:1082-1106`).
12. Restore-replay uses N serial `readRowById` (`rows.ts:3187-3191`); fresh-restore path uses batched `WHERE IN (...)`.
13. `useEstimateRowUpdateBroadcast` has no receive-side consumer — dead code.
14. Cursor broadcast dedup via self-echo drop + signature verification cache + 80 ms / 6 px throttle.
15. `NotificationProvider` short-circuits outside `/workshop` but its modal module still ships.
16. All row-table scroll work runs on a raw passive listener + ResizeObserver.
17. Column-resize drag is React-state-free during the drag.
18. `EstimateSheetVirtualBranchList` is not memoized.
19. Branch comparator walks descendants when `selectedRowIds` identity changes.
