# 13 — Client Hydration & Bundle Weight (LANE L4)

**Scope:** what happens AFTER the server paints `/workshop/projects/[projectId]/estimates/[nodeId]` — the `EstimateWorkspaceClient` hydration critical path, the glass sheet subtree, the TanStack Query fan-out, the lazy component-library server action, and the client JS that has to ship for the route to become interactive.
**Method:** read-only trace of `page.tsx` → `EstimateWorkspaceClient` → the two `next/dynamic` chunks (`EstimateSheetTree`, `EstimateSheetContent`) → their hooks, imports, and subtree components. Every claim cites `file:line` or is marked **UNVERIFIED**.
**Date:** 2026-06-21.

---

## 1. EstimateWorkspaceClient surface map (props-from-server vs self-fetched)

### Server Component pass-through (GOOD — no double-fetch on the tree/tabs)

The server page `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx` is an async Server Component that resolves all first-paint data and passes it as props. It explicitly keeps the component-library dataset out of the first `Promise.all` so first paint isn't gated on library queries (page.tsx:33-35):

| Prop (`page.tsx:85-99`) | Source | Re-fetched client-side? |
|---|---|---|
| `projectId`, `estimateId`, `projectName` | route params / server join | No |
| `selectedNodeId` | `resolveEstimateTabRouteContext` (server) | No — used as initial value only |
| `nodes` (tree) | `resolveEstimateTabRouteContext` (server) | **Partially.** Seeded as `initialData` / `initialNodes` into `useEstimateTabTreeQuery`/`useEstimateAreaTreeQuery`; `refetchOnMount: false` + `staleTime: 5min` suppress an immediate re-fetch (`use-estimate-query.ts:46-48`, `108-111`). A background refetch only fires after 5 min or on mutation. **No first-paint double-fetch.** |
| `estimateTabs`, `activeTabId` | `getEstimateTabs` (server) | **Partially.** Seeded into `useEstimateTabsQuery` as `initialTabs`, `refetchOnMount: false`, `staleTime: 5min` (`use-estimate-query.ts:159-168`). `enabled: Boolean(activeTabId)` (`EstimateWorkspaceClient.tsx:90-96`). **No first-paint double-fetch** on the tab-present path. |
| `canEditEstimate` | `resolveEstimateEditCapability` (server) | No |
| `collaborationUserId`, `collaborationDisplayName` | `requireCurrentUserContext` (server) | No — but they are consumed by the cursor-collaboration hook which opens a Realtime channel (see §2). |
| `proposalExportMetadata` | server-assembled | No |
| `surfaceVariant="glass"` | literal | No |

### Props the server DOES NOT pass (self-fetched — second-phase)

`EstimateWorkspaceClientProps` declares six library props (`libraryItems`, `libraryTemplates`, `libraryCategoryTree`, `librarySuppliers`, `libraryBrands`, `libraryFolders` — `EstimateWorkspaceClient.tsx:54-59`). The server page **passes none of them** (page.tsx:85-99 omits every one). They flow through to `EstimateSheetContent` as `undefined`, where they trigger the lazy server-action path (§3). This is the intentional design (page.tsx:33-35 comment), but it is the single biggest contributor to the post-paint second phase.

---

## 2. Hydration point inventory

### Top-level structure

`EstimateWorkspaceClient` (`EstimateWorkspaceClient.tsx:68`) is itself `"use client"` (line 1). It does NOT render any sheet UI directly — it only sets up the `EstimateSurfaceVariantProvider`, the tab query, and the active-tab state, then mounts two `next/dynamic` chunks:

```tsx
// EstimateWorkspaceClient.tsx:26-38
const EstimateSheetTree = dynamic(() => import("./EstimateSheetTree"), { loading: () => <EstimateTreeFallback /> });
const EstimateSheetContent = dynamic(() => import("./EstimateSheetContent"), { loading: () => <EstimateContentFallback /> });
```

So first paint shows the glass shell + two **skeleton chunks** (`EstimateTreeFallback` / `EstimateContentFallback`, `EstimateWorkspaceClient.tsx:174-212`), then each chunk's JS is fetched and hydrated. This is itself a **second visual phase** — the two skeleton blocks are the sheet's own first-paint loading state, layered on top of whatever route-level Suspense already showed (L1's cascade).

### `"use client"` components that hydrate on the sheet

17 `"use client"` module boundaries hydrate (rg over the sheet subtree):

| Component | Lines | Hydration cost notes |
|---|---|---|
| `EstimateWorkspaceClient.tsx` | 213 | Root. Owns tab query + 1 `useEffect`. |
| `EstimateSheetContent.tsx` | 3134 | **HEAVIEST.** ~30 `useState`, 12+ `useEffect`, ~25 `useMemo`, 6 TanStack Query hooks (see §3). Hydration cost is dominated by this file. |
| `EstimateSheetTree.tsx` | 1595 | Heavy. ~20 `useState`, 9 `useEffect`, 2 TanStack Query hooks, drag/drop machinery. |
| `component-library/index.tsx` (`EstimateRightSidebar`) | 2586 | **HEAVY — RIGHT RAIL.** 25+ `useState` (lines 815-876+), 30+ `useEffect`, multiple `useMemo`, its own `useQuery` for project sources. **Static import** in `EstimateSheetContent.tsx:39` — not code-split. Mounts in the initial bundle when `renderSidebar` is true (default). |
| `component-library/CommandPalette.tsx` | 188 | Code-split (`dynamic`, `ssr:false`, `EstimateSheetContent.tsx:47-50`). No first-paint cost. |
| `component-library/ComponentCard.tsx` | — | Inside sidebar chunk. |
| `component-library/NewComponentForm.tsx` | — | Inside sidebar chunk (interaction-gated render in practice). |
| `component-library/NewTemplateModal.tsx` | — | Inside sidebar chunk (interaction-gated). |
| `component-library/tree/LibraryTree.tsx` | 521 | Static import inside sidebar; mounts with sidebar. |
| `component-library/tree/TemplatesTree.tsx` | 1252 | Static import inside sidebar; mounts with sidebar. |
| `estimate-sheet/EstimateTabStrip.tsx` | 679 | Inside content chunk; always mounts with content. |
| `estimate-sheet/rows/branch.tsx` | 485 | Inside content chunk. |
| `estimate-sheet/rows/cells.tsx` | 667 | Inside content chunk. |
| `estimate-sheet/rows/row-table.tsx` | 805 | Inside content chunk; pulls `@tanstack/react-virtual`. |
| `estimate-sheet/rows/virtual-branch-list.tsx` | 165 | Inside content chunk; pulls `@tanstack/react-virtual`. |
| `estimate-sheet/rows/drop-zones.tsx` | — | Inside content chunk. |
| `estimate-sheet/columns/EstimateColumnRuler.tsx` | — | Inside content chunk. |
| `estimate-sheet/activity-history.tsx` | 1708 | **Code-split partially.** The module-level helpers are statically imported (`EstimateSheetContent.tsx:75-93`), but the two modals (`ActivityHistoryModal`, `RowDetailsModal`) are dynamic + `ssr:false` (`EstimateSheetContent.tsx:98-105`). |
| `ProposalExportPreviewDialog.tsx` | — | Code-split (`dynamic`, `ssr:false`, `EstimateSheetContent.tsx:70-73`). No first-paint cost. |

**Interaction-gated overlays done right:** `CommandPalette`, `ProposalExportPreviewDialog`, `ActivityHistoryModal`, `RowDetailsModal` are all `dynamic(... { ssr: false })`. These four are the correct pattern and contribute nothing to first paint (`EstimateSheetContent.tsx:45-105`).

**The hydration cost concentration:** roughly **13,800 lines** of client TSX across the sheet subtree ship on this route. The single biggest contributor is `EstimateSheetContent` (3134) + `EstimateRightSidebar` (2586) + `EstimateSheetTree` (1595) + `activity-history` (1708). All four are in the initial-hydrate set; only the four modals/palettes above are split out.

### Other first-paint work

- **Realtime cursor channel opens on mount.** `EstimateSheetCursorLayer` mounts at two places in the content (`EstimateSheetContent.tsx:2988`, `3047`) and calls `useEstimateCursorCollaboration`, whose `useEffect` (`use-estimate-cursor-broadcast.ts:36-37`: `if (!enabled || !estimateId) return;` then `client.channel(...)` at line 53) opens a Supabase Realtime websocket on first paint. `enabled` is `Boolean(estimateId && userId)` — i.e. always true on the signed-in sheet. This is a post-paint network round-trip (websocket handshake + auth) that adds to the hydration-phase work.
- **Column-widths store hydration effect** (`EstimateSheetContent.tsx:1216-1219`) — runs on mount, reads from `localStorage` via the Zustand persist layer in `useEstimateColumnWidthsStore`.
- **~12 effects in `EstimateSheetContent`** fire on first paint (signature compute, `dispatchProjectTotalChange`, editable-row sync, activity-scope sync, etc.).

---

## 3. TanStack Query fan-out (sheet subtree)

### Inventory

| # | Hook | Key | Fetches | `enabled` gate | File:line |
|---|---|---|---|---|---|
| 1 | `useEstimateTabsQuery` | `["estimate", estimateId, "tabs"]` | `fetchEstimateTabs` (server action) | `Boolean(activeTabId)` (the `tabQueriesEnabled` flag) | `EstimateWorkspaceClient.tsx:91-96` |
| 2 | `useEstimateAreaTreeQuery` (legacy) | `["estimate", estimateId, "area-tree"]` | `fetchEstimateTree` (server action) | `!activeTabId` (only on the no-tab path) | `EstimateSheetTree.tsx:281`; also in `EstimateSheetContent.tsx:1156-1161` |
| 3 | `useEstimateTabTreeQuery` (tab) | `["estimate", estimateId, "tab", tabId, "area-tree"]` | `fetchEstimateTabTree` (server action) | `Boolean(activeTabId)` | `EstimateSheetTree.tsx:282`; also in `EstimateSheetContent.tsx:1162-1168` |
| 4 | **Lazy library (lite)** | `workspaceComponentLibraryLiteQueryKey(projectId)` → `["workspace-component-library", "lite", projectId]` (per `query-keys.ts` **UNVERIFIED** — not read in this lane) | `loadProjectComponentLibraryLite` (server action → DB) | `shouldLoadLibraryLazily && (renderSidebar || showCommandPalette)` — i.e. **on mount when the sidebar renders** | `EstimateSheetContent.tsx:1272-1285` |

Mutations present but not first-paint: `useEstimateRowMutations` (`EstimateSheetContent.tsx:1141-1152`), `useMoveEstimateRowItem` (`use-estimate-query.ts:173`). These are not queries and do not affect hydration.

### Waterfall analysis

**No query-on-query waterfall.** Queries 1-3 are gated only on `activeTabId` (a prop, available at first render). Query 4 (lazy library) is gated on `shouldLoadLibraryLazily && renderSidebar` — also known at first render. None of them waits on another query's data. The `enabled: !!someOtherQuery.data` anti-pattern is not present anywhere in the sheet subtree.

**But there is a STRUCTURAL waterfall — it's at the dynamic-import layer, not the query layer:**

1. Server paints → `EstimateWorkspaceClient` hydrates with two `next/dynamic` skeletons.
2. Client fetches `EstimateSheetTree` + `EstimateSheetContent` chunks (parallel).
3. When `EstimateSheetContent` mounts, query 4 (`lazy library`) fires for the first time, because the `useQuery` only exists *inside* the dynamically-imported component. The lazy server action cannot even start until step 2 finishes. This is the worst waterfall on the sheet and it is **architectural**, not query-config: the fetch is gated behind the chunk download.

**Duplicate hydration of the tree query.** Both `EstimateSheetTree` and `EstimateSheetContent` instantiate the tree query independently (`EstimateSheetTree.tsx:281-282` and `EstimateSheetContent.tsx:1156-1168`). TanStack dedupes them by key, so only one network request fires — **not** a double-fetch. But both components subscribe, so both re-render on tree cache changes.

### `refetchOnMount: false` discipline (GOOD)

All three tree/tab queries set `refetchOnMount: false` + `staleTime: 5 * 60_000` + `initialData: initialNodes` (`use-estimate-query.ts:46-48, 108-111, 165-167`). This correctly suppresses a wasteful first-paint refetch of data the server already passed. **No double-fetch of tree/tabs data.**

### The lazy library query — `staleTime` / `gcTime`

`EstimateSheetContent.tsx:1281-1284`:
- `staleTime: 5 * 60 * 1000` (5 min)
- `gcTime: 30 * 60 * 1000` (30 min) — comment notes this is deliberate so a return-to-estimate doesn't re-cold-load.

These are reasonable. The query is not the problem; its placement behind a dynamic chunk is.

---

## 4. Lazy server action — second-phase analysis

### What it is

`loadProjectComponentLibraryLite(projectId)` — `src/lib/component-library/actions.ts:426-440`. It is a `"use server"` action that does:

```ts
await requireCurrentUserContext();
const [componentRows, templates] = await Promise.all([
  getProjectComponentRowsLibrary(projectId, { includeDetailGraph: false }),
  getCurrentWorkspaceEstimateTemplates(),
]);
return { ...componentRows, templates };
```

It loads the project-scoped component rows + workspace templates in parallel — no server-side waterfall.

### What triggers it, and when

- **Trigger:** the `useQuery` at `EstimateSheetContent.tsx:1272-1285`, whose `enabled` is `shouldLoadLibraryLazily && (renderSidebar || showCommandPalette)`.
- `shouldLoadLibraryLazily = !hasServerProvidedLibrary && Boolean(projectId && estimateId)` (`EstimateSheetContent.tsx:1268`) — always true in production because the page never passes library props (§1).
- `renderSidebar` defaults to `true` (`EstimateSheetContent.tsx:1129`).
- **So the query fires on the first render of `EstimateSheetContent` after its dynamic chunk loads.**

### Does it cause a visible second loading state?

**Yes — this is the most visible second-phase skeleton on the sheet.**

`EstimateSheetContent.tsx:3077-3103`:

```tsx
{renderSidebar ? (
  shouldLoadLibraryLazily && !lazyLibrary ? (
    <ComponentLibrarySidebarFallback isError={libraryQuery.isError} onRetry={() => libraryQuery.refetch()} />
  ) : (
    <EstimateRightSidebar ... />
  )
) : null}
```

While `libraryQuery.data` is undefined (the cold-load window), the right rail paints `ComponentLibrarySidebarFallback` — a `<Skeleton>` rail (`EstimateSheetContent.tsx:3111-3133`, 12 row skeletons + a header skeleton, role="status", `aria-label="Loading component library"`). Once the action resolves, the skeleton is swapped for the real `EstimateRightSidebar`.

**Sequence a user sees on a cold load:**
1. Route-level Suspense fallback (whatever L1 catalogues) — server work.
2. Server paint: glass shell + `EstimateTreeFallback` + `EstimateContentFallback` (the two `next/dynamic` skeletons).
3. Tree + content chunks hydrate. `EstimateContentFallback` is replaced by the real `<section>` — but the right rail now shows `ComponentLibrarySidebarFallback` because `libraryQuery` is still pending.
4. `loadProjectComponentLibraryLite` resolves → `ComponentLibrarySidebarFallback` is replaced by `EstimateRightSidebar`.

Steps 2-4 are **three visually distinct skeleton states** on the sheet surface after the server first paints. This matches the symptom report ("a second loading phase after the server paints").

### What does NOT trigger it

- The `CommandPalette` does NOT load the library on its own; it reuses the same `libraryQuery` data (the `enabled` clause includes `showCommandPalette`, so opening the palette can also trigger the fetch if the sidebar is closed — but on the default path the sidebar already triggered it).
- It does not fire when `libraryItems` is server-provided (test/embed path only — production never provides it).

---

## 5. Bundle weight concerns

### Heavy dependencies that ship to the client on this route

| Dependency | Where used | First-paint? | Size risk |
|---|---|---|---|
| `@tanstack/react-query` | everywhere | Yes | baseline, acceptable |
| `@tanstack/react-virtual` (`useVirtualizer`) | `ui/tree.tsx:19`, `estimate-sheet/rows/row-table.tsx:4`, `estimate-sheet/rows/virtual-branch-list.tsx:4` | Yes (tree + row-table both virtualize) | **Medium.** Three call sites. Virtualization is justified by row counts, but the library is pulled into the initial bundle of both the tree chunk and the content chunk. |
| `@phosphor-icons/react/dist/ssr` | throughout (tree, content, sidebar, tabs) | Yes | Low per-icon, but scores of icons are imported across the subtree. SSR-side tree-shakes; client gets the used set. |
| `zustand` (`useEstimateUiStore`, `useEstimateColumnWidthsStore`, `useEstimateWorkspaceState`) | content + tree + sidebar | Yes | Small. |
| Supabase Realtime client (via `@supabase/supabase-js`) | `useEstimateCursorCollaboration` (`use-estimate-cursor-broadcast.ts`) | Yes — opens channel on mount | **Medium.** Pulls the realtime websocket transport into the initial bundle just for cursors. |
| `@/components/ui/*` (modal, popover, context-menu, toast, dropdown-select, bulk-action-toolbar, tree-panel-header, control-input, button, skeleton, badge, filter-popover, action-menu) | across the subtree | Yes | Each is in a shared chunk; collectively the UI kit is a meaningful slice of the route bundle. **UNVERIFIED** — actual chunk sizes not measured here (L6's job). |

### What is NOT on the route (good — already avoided)

- **No `react-complex-tree` / `react-arborist` / `@dnd-kit`.** Tree DnD is a custom, hand-rolled implementation in `ui/tree.tsx` (uses native HTML5 drag events, `dataTransfer`, no DnD library). Confirmed by `rg` over the subtree returning zero hits.
- **No chart library** (`recharts`/`chart.js`/`d3`) on the sheet path.
- **No spreadsheet lib** (`xlsx`/`exceljs`) on the client — proposal export is a server-route download (`/api/.../export/proposal.xlsx`), and the client just does `fetch` + blob download (`EstimateSheetContent.tsx:1716-1742`).
- The two heaviest interaction-gated surfaces (`ProposalExportPreviewDialog`, `ActivityHistoryModal`/`RowDetailsModal`, `CommandPalette`) are already `dynamic(... { ssr: false })`.

### Biggest remaining bundle liability

`EstimateRightSidebar` (`component-library/index.tsx`, 2586 lines, 25+ `useState`, 30+ `useEffect`) + its two tree children (`LibraryTree.tsx` 521 lines, `TemplatesTree.tsx` 1252 lines) are statically imported into `EstimateSheetContent` (`EstimateSheetContent.tsx:39`) and ship in the content chunk. They hydrate on first paint even though the sidebar is visually the lowest-priority pane (it's the one that shows a skeleton until the lazy library loads anyway).

---

## 6. Optimization targets (client-side wins)

Ordered by expected impact / blast-radius trade-off. Each is a plan target, not a spec.

### C1. Promote `loadProjectComponentLibraryLite` to the server page (eliminate the lazy round-trip)

**Problem.** The server page deliberately omits the library dataset and lets the client re-fetch via a server action (page.tsx:33-35), which adds a full RTT after the content chunk hydrates and forces the visible `ComponentLibrarySidebarFallback` skeleton.

**Win.** Fetch the lite dataset in the server page's existing `Promise.all` (page.tsx:36-41) — or in a parallel tail `Promise.all` like the estimates-list page does (`estimates/page.tsx:24-33`) — and pass it as the `libraryItems`/`libraryTemplates`/etc. props. Then `hasServerProvidedLibrary` becomes true (`EstimateSheetContent.tsx:1267`), `shouldLoadLibraryLazily` becomes false, and the sidebar renders `EstimateRightSidebar` directly on first paint with **no skeleton swap**.

**Trade-off.** This adds 1 server DB query (in parallel with existing ones) to first paint. Per the owner note (page.tsx:33-35) this was deferred precisely to keep first paint off library queries; the right call depends on whether the library query is cheap (L2 will measure). If it's <50ms in-region, the user-visible win of removing the second skeleton outweighs the small server-time cost. **Coordinate with L2/L3.**

### C2. Code-split `EstimateRightSidebar` out of the content chunk

**Problem.** The sidebar (2586 + 521 + 1252 = ~4300 lines, ~25 `useState`) is a static import inside `EstimateSheetContent` (`EstimateSheetContent.tsx:39`), so it ships and hydrates with the content chunk even though it's the right-most, lowest-priority pane.

**Win.** Convert it to `dynamic(() => import("./component-library").then(m => m.EstimateRightSidebar), { ssr: false, loading: () => <ComponentLibrarySidebarFallback /> })`. The sidebar's own skeleton already exists (`ComponentLibrarySidebarFallback`); reuse it as the `loading` placeholder. This shaves the sidebar's JS parse/eval off the critical hydration path of the content area.

**Trade-off.** Two chunks to fetch post-paint instead of one; but the content chunk is smaller and the tree/table become interactive sooner. Low risk — sidebar is already designed to render behind a fallback.

### C3. Defer the Realtime cursor channel subscription

**Problem.** `useEstimateCursorCollaboration` opens a Supabase Realtime websocket on first mount of the sheet (`use-estimate-cursor-broadcast.ts:36-53`), contending with hydration for network/CPU.

**Win.** Delay `enabled` until after `idle` (or after the tree chunk has hydrated) — e.g. flip `enabled` true inside a `requestIdleCallback`/`useEffect` with a small timeout. Cursors are non-essential on first paint; a 500ms-1s delay is invisible to the user and removes a websocket handshake from the critical path.

**Trade-off.** Remote cursors appear slightly later in multi-user sessions. Acceptable.

### C4. Parallelize the two `next/dynamic` chunk fetches explicitly (already parallel, but verify prefetch)

**Observation.** `EstimateSheetTree` and `EstimateSheetContent` are both top-level `dynamic` imports in `EstimateWorkspaceClient.tsx:26-38`, so Next issues both chunk requests in parallel. No action needed here unless profiling shows serialization. **Verify with L6.**

### C5. Consider `next/dynamic` with `ssr: true` (not `false`) for the sheet chunks

**Problem.** `EstimateSheetTree` and `EstimateSheetContent` are `dynamic(...)` without `ssr: false` (default SSR-on, `EstimateWorkspaceClient.tsx:26-38`), so they participate in SSR. But they have `"use client"` at the top and consume client-only state — their SSR output is effectively the skeleton anyway. If SSR of these subtrees is producing throwaway HTML that gets replaced on hydration, the SSR pass is pure cost.

**Win.** Either (a) add `ssr: false` so the server only emits the skeleton `<EstimateTreeFallback>`/`<EstimateContentFallback>` directly (no wasted SSR of the client subtree), or (b) keep SSR but ensure the SSR pass produces useful HTML (tree structure, first node) that hydration doesn't discard. **UNVERIFIED** which path applies — needs a `view-source` of the SSR HTML (L6).

### C6. Hoist shared memo/state from `EstimateSheetContent`

**Problem.** `EstimateSheetContent.tsx:1113-3106` is a single 3134-line component with ~30 `useState` and 12 `useEffect`. Every state change re-renders the whole sheet subtree; every memo recomputes if its deps change. This isn't a bundle-weight issue per se but it dominates hydration CPU.

**Win.** Extract the proposal-export state cluster (8 `useState`, ~150 lines of logic, lines 1188-1750), the activity-history state cluster (~8 `useState`, lines 1239-1800), and the cursor layer into child components so re-renders scope. Larger refactor; defer behind C1-C3.

### Non-issues (verified fine, do NOT touch)

- Tree/tab queries are correctly `refetchOnMount: false` + `staleTime: 5min` + `initialData`-seeded — **no double-fetch**.
- No query-on-query `enabled: !!other.data` waterfall.
- Interaction-gated overlays (`CommandPalette`, `ProposalExportPreviewDialog`, `ActivityHistoryModal`, `RowDetailsModal`) are correctly `dynamic(... { ssr: false })`.
- The server page is a Server Component — props flow is correct.

---

## 7. Open questions for other lanes

- **L2:** How expensive is `loadProjectComponentLibraryLite` server-side? Determines whether C1 is a net win or just shifts cost left.
- **L3:** Is the `EstimateSurfaceVariantProvider` (glass) doing any layout-affecting work that serializes behind chunk load? (Read but looked pure — `EstimateWorkspaceClient.tsx:119`.)
- **L6:** Measure (a) time between server paint and `EstimateContentFallback` swap, (b) time between content swap and `ComponentLibrarySidebarFallback` swap (the C1 target window), (c) chunk weights for `EstimateSheetContent` and the proposed split sidebar chunk.
- **L5 (blast radius):** C2 (code-splitting `EstimateRightSidebar`) touches a statically imported symbol; check who else imports `./component-library` (memory note `workspace-component-library-key-inline-literal` flags a related inline-literal consumer of the key).

---

## 8. Provenance

All citations are to files under `/Users/philiplewis/Documents/archestimator/src/` or this plan pack. Marked **UNVERIFIED** where the lane did not directly measure (chunk sizes, exact query-key constant values, SSR HTML). Read-only: no `src/` files were modified. Only this doc was written.
