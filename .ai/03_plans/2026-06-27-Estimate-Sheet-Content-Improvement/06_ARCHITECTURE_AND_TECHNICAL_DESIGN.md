# Architecture And Technical Design

## Current Architecture

The current implementation has three strong foundations and one key fragility.

| Layer | Current Shape | Evidence |
|---|---|---|
| Route hydration | Server route resolves estimate tree/tab context and seeds client props. | `page.tsx`; route-context process cache in `workspace-repository.ts:3492-3591`. |
| Client tree/cache | `useEstimateAreaTreeQuery` / `useEstimateTabTreeQuery` hold live tree in TanStack Query. | `EstimateSheetContent.tsx:1034-1057`. |
| Row mutations | `useEstimateRowMutations` patches cache and tracks global save state. | `use-estimate-row-mutations.ts:280-779`. |
| Row move persistence | Dedicated move helper/action/RPC path with dense source/target rows. | `estimate-row-tree-move.ts`, `actions.ts:3189-3229`, row move RPC migration. |

Fragility: tree-side row drops are transported through a window event into content-owned row handlers, while both tree and content share a live tree object graph and a coarse global `saveState`. Tree prop sync uses a content signature that does not encode row identity/order. This can leave row/table branches with stale references or sheet-wide move locks after a row appears to move successfully.

## Target Architecture

Introduce a first-class estimate mutation coordinator with scoped pending state.

```text
User action
  -> action adapter (row/table/tree/dialog/component)
  -> mutation coordinator
      -> validate local preconditions
      -> assign stable mutation id
      -> apply optimistic patch to source-owned cache slices
      -> record scoped pending state
      -> call server action/RPC
      -> reconcile server result by row/node/action id
      -> finalize route/query cache
      -> clear scoped pending or expose scoped failure
```

## App Router Boundary, Dynamic Rendering, And Cache Finalization

The target route is `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`. The route-level contract must stay explicit because this plan touches server data, client interactivity, cache invalidation, and public/export surfaces.

| Concern | Contract |
|---|---|
| Route ownership | The page remains a Server Component route shell that resolves authenticated project/estimate/tab/node context and passes serializable DTOs into the client workspace. |
| Client boundary | Interactive estimate sheet state stays behind the existing client boundary; do not move database fetches, secrets, or server-only authorization state into Client Components. |
| Serializable props | Server-to-client props are DTOs only: no Supabase clients, secret values, raw signed URLs, unbounded snapshots, class instances, or functions except explicit Server Action references supported by Next. |
| Dynamic rendering | `params`, `searchParams`, cookies/session, and auth-sensitive route context mean the implementation should assume dynamic rendering for the estimate sheet route unless a future source audit proves otherwise. |
| Server Components | Server route/context reads directly from repositories/DAL; do not call same-app Route Handlers from Server Components for data that is already available server-side. |
| Client data | TanStack Query owns live tree/row cache after hydration; client invalidation is enough for routine row edits when the server route context is not part of the visible stale state. |
| `revalidatePath` / route cache | Use route/process-cache clearing and `revalidatePath` only for mutations that affect route-level server context, public/export snapshots, tab/node route identity, or other RSC-visible data. Routine scalar row edits should prefer client cache patch/invalidation. |
| Suspense/loading/error/not-found | Keep loading/error/no-selected-node behavior route-specific: parent shell should not mask sheet-level loading; missing/forbidden estimate/node states get explicit recoverable UI or route error handling. |
| Bundle impact | New coordinator/status UI must not pull server-only modules or heavy public/export dependencies into the client bundle; verify import direction and bundle-sensitive dependencies before broad refactor. |

Local source authority used for this contract:

- `package.json`: Next `16.2.6`, React `19.2.6`, TanStack Query `5.100.14`, Zustand `5.0.14`, Bun `1.3.14`.
- `next.config.ts`: `experimental.staleTimes`, image local/remote patterns, share/workshop security headers, route redirects.
- `tsconfig.json`: strict TypeScript, `moduleResolution: "bundler"`, React JSX transform, Next plugin.
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`: Server Components fetch close to data/secrets; Client Components handle state/events/browser APIs; `"use client"` defines the client bundle boundary.
- `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`: Server Functions/Actions are async, direct-POST reachable, and need auth/authz inside every action.
- `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`: cache keys, request-time APIs, Suspense, and revalidation require explicit route/cache decisions.
- `node_modules/next/dist/docs/01-app/02-guides/data-security.md`: use a server-only DAL/DTO posture and avoid passing sensitive raw data to Client Components.

## Ownership Boundaries

| Concern | Owner |
|---|---|
| Mutation ID, ordering, retry, stale-success rejection | New mutation coordinator or extracted hook/store |
| Row scalar patching | Row mutation slice, keyed by row id |
| Row order/move patching | Row move coordinator, keyed by source node and target node |
| Tree structure | Tree structure cache, keyed by tab/estimate/node identity |
| Tree-local UI state | `EstimateSheetTree` local state only for expansion, rename, search, reorder pending |
| Persistence | Server actions and DB RPCs only; no browser direct table writes |
| Status UI | UX components that subscribe to scoped pending/failure state |
| Cache finalization | Shared server/client finalization helper |

## React State Placement Contract

| State | Target Owner | Reason |
|---|---|---|
| Auth, project/estimate permission, route context | Server route/repository/DAL | Server-only data and secrets; DTO boundary before hydration. |
| Selected tab/node URL intent | Existing workspace selection plus route params/search params | Needs reload/shareable route behavior without over-fetching. |
| Live row/tree data after hydration | TanStack Query plus optimistic coordinator patches | Existing repo pattern and cache invalidation surface. |
| Drag state | Existing `estimate-workshop-drag` Zustand store | Browser-only transient state already isolated. |
| Mutation pending/failure/retry | New/extracted estimate mutation coordinator | Needs scoped cross-row/node status and conflict keys. |
| Column widths/preferences | Existing local preference store plus debounced server action | User preference state should not block core row edits. |
| Public/export snapshot data | Server-only DTO builders | Must remain redacted and cache-controlled. |

## Minimal Mutation Coordinator Contract

The implementation may extend `useEstimateRowMutations` if the contract below stays small and row-centric. It should introduce a separate store/hook only if cross-row/node state creates unreadable dependencies or if non-row surfaces need to subscribe without prop drilling.

Coordinator state shape:

```ts
type EstimateMutationScope =
  | { type: "row"; rowId: string }
  | { type: "node"; nodeId: string }
  | { type: "node-row-order"; sourceNodeId: string; targetNodeId: string }
  | { type: "component-move"; sourceRowId: string; targetRowId: string }
  | { type: "tab"; tabId: string }
  | { type: "sheet"; estimateId: string };

type EstimateMutationStatus = {
  mutationId: string;
  kind: "insert-row" | "update-row" | "delete-row" | "restore-row" | "move-row" | "replace-component" | "move-component" | "tree" | "tab" | "sheet-adjustment";
  scope: EstimateMutationScope;
  conflictKeys: string[];
  status: "pending" | "degraded" | "failed";
  createdAt: number;
  lastAttemptAt: number;
  retryCount: number;
  error?: string;
};
```

Mutation identity fields:

- `mutationId` / `correlationId`
- `estimateId`
- `tabId` when scoped
- `rowItemId`, `sourceRowItemId`, `targetRowItemId` when row/component-scoped
- `sourceNodeId`, `targetNodeId`, and `targetIndex` for row moves
- expected row/sheet/tree revision fields where the server supports them
- `originSurface`: table, tree, dialog, keyboard, library, template, recovery

Conflict-key rules:

- same row updates serialize by `row:<rowId>`
- cross-row component move locks `row:<sourceRowId>` and `row:<targetRowId>`
- row move locks `node:<sourceNodeId>`, `node:<targetNodeId>`, and `row:<rowItemId>`
- tree reorder locks `tree:<tabId>`
- tab lifecycle locks `tabs:<estimateId>`
- unrelated scopes must not block each other

Queue ordering rules:

- preserve user order within a conflict key,
- allow unrelated conflict keys to proceed concurrently,
- reject stale successes when a newer mutation for the same conflict key has already committed,
- expose `degraded` if local pending age exceeds 5s or network/offline state is detected,
- expose `failed` within 500ms after a terminal server/client error.

Retry/revert callbacks:

- every queue entry carries `retry()`, `revertLocal()`, and optional `deleteDraft()` callbacks,
- destructive actions must carry a durable restore reference when server history created one,
- retry reuses the original mutation ID unless the server explicitly returns a typed conflict requiring a new user decision.

New-store threshold:

- stay inside `useEstimateRowMutations` for row-only retry/status,
- extract `useEstimateMutationCoordinator` when tree, tab, component, and sheet-adjustment subscribers need the same status model,
- do not add a DB-backed queue unless product explicitly requires cross-session offline draining.

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Do not use global save state as a sheet-wide action lock. | Slow or failed persistence in one row should not freeze unrelated rows or branches. |
| Make row movement first-class rather than an incidental row mutation. | Row movement touches two node row lists, drag state, focus, sort order, cache, and RPC reconciliation. |
| Keep existing row move RPC as durable path. | Audit found the RPC is comparatively strong; client ownership/reconciliation is the fragile layer. |
| Use a default-off feature flag for the new coordinator if implementation is broad. | Allows local/staging proof without destabilizing first-user paths. |
| Keep durable queue local-first unless offline persistence across reload is required. | A DB-backed queue adds migrations/RLS/telemetry risk and should only be adopted if product requires cross-session offline draining. |

## Cache Model Options

| Option | Pros | Cons | Recommendation |
|---|---|---|---|
| Keep single tree query, patch source/target only | Smallest migration from current code | Requires careful row-order signatures and stale result handling | Start here if tests can prove target bug fixed. |
| Split structure from row-item state | Clearer ownership, row changes no longer confuse tree structure sync | Larger refactor; more selectors and query keys | Preferred target if single-tree patch remains brittle. |
| Full local command/event store | Strong queue/retry/history model | High scope; may duplicate DB event history | Use only after proving simpler coordinator insufficient. |
| DB-backed offline mutation queue | Survives reload/device changes | Requires new tables/RLS/grants/conflict policy | Defer unless first-user requirements include offline reload persistence. |

## Row Move Coordinator Contract

Inputs:

- `estimateId`, `tabId`, `rowItemId`, `sourceNodeId`, `targetNodeId`, `targetIndex`
- current source/target row snapshots and row revisions
- stable mutation ID
- origin surface: table, tree, dialog

Preconditions:

- row and target node are persisted IDs,
- full tree loaded for row movement,
- source/target row lists are current enough to compute dense order,
- specific source/target nodes are not already in a conflicting move.

Optimistic result:

- remove row from source node,
- insert row into target node,
- normalize source/target sort orders,
- set pending state for source/target nodes and moved row,
- retain drag handles and keyboard move path.

Server result:

- apply returned rows by row id and node id,
- if returned rows are absent from current cache, trigger active refetch and preserve local pending/failure state,
- never no-op silently.

## Compatibility Requirements

- Preserve `move_estimate_row_item_with_history` and row-revision semantics.
- Preserve load-limited guard: row movement remains disabled if initial tree is truncated.
- Preserve current keyboard/touch Move row dialog.
- Preserve library projection invalidation after row/component changes.
- Preserve route-context process cache clearing after content mutations.
- Preserve existing tests while updating assertions that currently expect routine save toasts.
