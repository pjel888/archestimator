# 04 — Target Architecture (Performance Refactor End-State)

> **Status:** Design target. Authoritative inputs: `_research/_SYNTHESIS.md` (contract) + dossiers R1–R7. Respects `DESIGN.md` (component-reuse contract, type-scale tokens), `AGENTS.md` (lean-workflow / proportional-verification / Next.js-16-is-different), and `.ai/10_state/decisions.md`.
>
> This file describes the **desired end-state** after the slow refactor — concrete enough that Phase plan-writers (W5–W10) and future implementers can build without re-deciding architecture. It does **not** prescribe migration steps (that is `05_PHASED_REFACTOR_PLAN` and the per-phase plans); it describes where the codebase should *land*.
>
> TypeScript-ish sketches below are **design targets, not code to commit verbatim**. Interfaces name real files where the symbol should live. Every target traces back to a contract §3 track and the pinned findings.
>
> **Conventions used:** Priority `P0–P3`, Risk `Low/Medium/High/Critical`, evidence `path:line — observation` (contract §4). New scripts are flagged "to be added in Phase N." No `src/**` changes are made by this document.

---

## 0. Architectural principles (inherited, non-negotiable)

These constrain every target below. They come from the contract §0, DESIGN.md, AGENTS.md, and the pinned "confirmed positives" — do not regress them while refactoring.

1. **Preserve the load-bearing render guards.** `areEstimateSheetBranchPropsEqual` (`branch.tsx:111-156`) and `areEstimateRowItemsTablePropsEqual` (`row-table.tsx:86-116`) key on per-row `editableRows[id]` identity + stable callbacks. The refactor reduces **compute**, not these guards (contract §1, R4). Any new state shape must keep per-row reference equality intact.
2. **All `page.tsx` are Server Components; keep them so** (R1 A0). Pages do server data work and hand to client islands. Client `"use client"` is a deliberate island boundary, not a default.
3. **Reuse-first UI (DESIGN.md "Component reuse contract").** A visible duplicate primitive is a *blocking* defect. New primitives encode the type scale internally (SF Pro, regular/medium weights, allowed sizes, `rounded-xs` only, zero tracking).
4. **Don't rebuild the confirmed-good.** exceljs server-only boundary (R1 B2); NeatWireframe WebGL lifecycle (R1 B3); `publication/public-repository.ts` `cache()` + split column sets (R5); `project_estimate_list_summaries` RPC; project-charts `.limit(N+1)` overflow discipline; active RLS-initplan remediation. These are the *patterns to generalize*, not replace.
5. **Server stays authoritative.** Optimistic UI is a latency mask over RPC-encapsulated, history-tracked, RLS-gated writes (R5). Client caches never become the source of truth for permissions or persistence.
6. **Proportional verification (AGENTS.md).** Each canonical kernel ships with the narrowest gate that proves it — render-isolation tests for hot paths, query-count budgets for data paths (Phase 9).
7. **Next.js 16 is not the Next.js in training data** (AGENTS.md). RSC/Suspense/`router.refresh` semantics are read from `node_modules/next/dist/docs/` before implementation, not assumed.

### 0.1 Law 3 — repeated-shape pipeline (Bible §2 Law 3)

Bible §2 Law 3 ("normalize → index → project → virtualize/render") is the spine of §6/§7 but is never stated repo-wide. It is **not** tree-only: **every** repeated collection shape in this codebase follows the same four-stage pipeline. The covenant: store the flat normal form, derive the index once per version, project for the active view, render through the virtualization layer. (Mirrors the Bible §2 Law-3 6-row table, tailored to repo paths.)

| Repeated shape | Normalize (flat arrays) | Index maps (built once / version) | Project (active view) | Virtualize / render |
|---|---|---|---|---|
| Estimate tree | flat `EstimateRowItem[]` from cache (§4.1 `tree` key) | `TreeIndex<T>` `byId/parentOf/depthOf/pathOf/descendantsOf` (§6.1) | `flattenVisible(expanded)` → `FlatRow[]` + indexed filter (§6.1) | `Tree` (`ui/tree.tsx`) virtualized, threshold-tuned (§6.2/§7.5) |
| Estimate sheet rows | `EditableRowsStore` snapshot `Map<id,EditableRowValue>` (§7.2) | per-row subscription + `nodeTotalsById` rollup over `TreeIndex` (§7.3) | per-row `computedItem` + `displayedNodeTotals` on displayed subtree | `virtual-branch-list` / `row-table` per-surface thresholds (§7.5) |
| Component library | explicit-column DTO rows, no `.select("*")` (§9.1) | `componentLibrary` keys + `buildTreeIndex` on folder tree (§4.1/§6) | filtered/faceted library projection server-side where possible (§1.2) | `Tree` (folders) + virtualized list (`Skeleton.List` fallback, §10) |
| Templates / project-source | flat project-source rows | already-indexed `filterProjectSourcesByQuery` index (R3 §4 — the model) | `filterKeepingAncestors` projection (§6.1) | `Tree` (retire `TemplatesTree` bespoke pulse, §10) |
| Project lists | `ProjectEstimateListRow[]` DTO via `project_estimate_list_summaries` RPC (§9) | list key factory + client `byId` map for optimistic reconcile (§4.1/§8) | sorted/grouped/favorited projection (selector, not state) | `Skeleton.List rows={n}` (§10) + streamed list (§1.3) |
| Charts | `get_project_chart_buckets` buckets-only payload (§9.2) | bucket-by-key map (server-aggregated, no raw facts) | series projection for active chart range | `d3-shape` dynamic at every consumer (R-7), skeleton fallback |

---

## 1. Next.js route / data architecture

**Resolves:** contract §1 RSC/bundle (provider topology, streaming sparsity, `router.refresh` ×12), track 5.

### 1.1 Provider topology (split authed vs public)

Today `src/app/providers.tsx:30-46` mounts **every** provider — including `RealtimeAuthBridge`, `NotificationProvider`, `PerformanceMonitor`, `NavigationListener` — on the root layout, so they load on `/`, `/pricing`, `/share/[token]` (R1 A6/finding-1, contract §1). `RealtimeAuthBridge` (`realtime-auth-bridge.tsx:22-66`) drags `@supabase/ssr` + supabase-js into the shared/landing bundle and fires an auth roundtrip on marketing pages.

**Target topology:**

```
src/app/layout.tsx (root)
  └─ <RootProviders>            // PUBLIC-SAFE set only
       QueryClientProvider      // shared; cheap
       ToastProvider            // shared; cheap
       VercelWebAnalytics       // already global, lightweight (R1 B8)
       (RouteLoadingOverlay)    // pure UI; no supabase

src/app/workshop/layout.tsx (authed segment)
  └─ <WorkshopProviders>        // AUTHED-ONLY set
       RealtimeAuthBridge       // supabase realtime — authed only
       NotificationProvider     // authed feature
       PerformanceMonitor       // authed instrumentation
       NavigationListener       // authed nav telemetry
       BfcacheHandler           // where it belongs to the app shell
```

- Net effect: marketing/landing routes ship **no supabase-js / realtime / notifications** code and fire **no auth roundtrip**. `/share/[token]` (public) likewise stays clean.
- `QueryClientProvider` may remain global (it is small and some public surfaces use queries); if analyzer (Phase 0) shows it pulls weight, scope it too.
- **Validation:** `ANALYZE=true bun run build` before/after confirms supabase leaves the landing chunk (contract §5 Q-bundle); the landing-audit e2e asserts no auth network call on `/`.

### 1.2 RSC ↔ client boundary strategy

- **Pages (RSC):** stay server. They resolve auth/session via `cache()`-wrapped `getCurrentUserContext` (`auth/session.ts:31`), fetch the **read DTO** (see §9), and pass a *projection* — not raw rows — to the client island.
- **Client islands:** receive serializable DTOs as props (server-projected initial state) + hydrate TanStack Query from those props so the first paint needs **no client fetch**. This is the existing `EstimateWorkspaceClient.tsx:124-129` `setQueryData`-from-props pattern, generalized.
- **Server projections** (new discipline): wherever a large client island today fetches-then-derives (e.g. estimate list, library overview, homebase), the derivation moves server-side into the repository/DTO layer (§9) so the island renders pre-shaped data. This shrinks both the client bundle and per-render compute.

### 1.3 Streaming / Suspense strategy

Today only ~4 `Suspense` sites; the project layout (`projects/[projectId]/layout.tsx:42-51`) is the reference (header chrome + content each in `<Suspense>` with skeletons) (R1 A3).

**Target:** Replicate the project-layout streaming shape on the next-heaviest authed routes:

- **Estimates list** (`/workshop/projects/[id]/estimates`): stream the list summary (RPC-backed, §9) behind a shared list skeleton (§10) while the shell paints immediately.
- **Library overview** (`/workshop/library`): stream the overview (already well-built server read, R5 `getLibraryOverview`) behind a skeleton.
- **Homebase** (`/workshop`): once `getWorkshopHomebaseData`'s serial tail is collapsed (§9 / Phase 8), stream the summary.

Each streamed boundary uses the **canonical route shell** (§10) so `loading.tsx` and the streamed skeleton are pixel-consistent (no layout shift).

### 1.4 `router.refresh()` → scoped invalidation

`router.refresh()` spans **12 files** (contract §1 correction; R1 A4/R2). Each re-runs a server segment + RSC payload. **Target rule:** prefer scoped TanStack invalidation (`patchAndMarkStale`, §4) over `router.refresh()` whenever the change is representable in the client cache. `router.refresh()` is reserved for cases that genuinely need a fresh RSC payload (auth/permission changes, route-structure changes). Each retained call site carries a one-line justification comment. The real call behind the estimates store is `ProjectEstimatesClient.tsx:215` (not the store — contract correction).

### 1.5 Config

- `next.config.ts:55` `optimizePackageImports` extends from phosphor-only to: `@tanstack/react-table`, `@tanstack/react-virtual`, `@radix-ui/react-context-menu`, `d3-shape` (R1 B5, track 5).
- `experimental.staleTimes {dynamic:60, static:180}` (`next.config.ts:64-67`) stays — it intentionally pairs the Router Cache with warm TanStack caches.
- Add an `analyze` npm script wrapping `ANALYZE=true next build` (R1 A5 ergonomics; "to be added in Phase 0/7").

---

## 2. Server / client component boundary rules (checklist)

A rule list implementers apply mechanically. Derived from R1 + DESIGN + decisions.

- [ ] **R-1** Every `page.tsx` is a Server Component (no top `"use client"`). It fetches DTOs and renders an island. (R1 A0)
- [ ] **R-2** A `"use client"` file exports **only** what the client needs; never re-export server-only modules through it (server actions are fine — they're stubbed on the client). A `"use client"` file is a **bundle boundary**: in the hot client route files (`EstimateSheetContent.tsx`, `EstimateSheetTree.tsx`) no helper barrels / re-export blocks are allowed — see `13_PHASE_7_BUNDLE_RUNTIME_PLAN.md §5` (no-barrel-in-hot-client) and the `no-hot-barrel-imports` static check (doc 27 SC-3).
- [ ] **R-3** No supabase-js / realtime / notifications import may be reachable from a public route's component graph. Authed-only providers live under `src/app/workshop/layout.tsx` (§1.1).
- [ ] **R-4** Pure data transforms (export model building, projections, aggregation, signatures-for-server) belong in `src/lib/**` and run server-side when possible — not inside a client island. (R1 finding-2: `build-proposal-export-model` is client-bundled today.)
- [ ] **R-5** A `"use server"` file exports **only async functions** (MEMORY: tsc + Vitest miss a sync export; only `next build` catches it). Run `bun run build` after editing any actions file.
- [ ] **R-6** Heavy/optional UI (charts, modals, WebGL, command palette) is `next/dynamic` with a skeleton fallback; default to dynamic for anything ≥ a few hundred LOC or carrying a heavy dep. (R1 A2)
- [ ] **R-7** `d3-shape` charts are dynamic at **every** consumer, not just the charts route — including the public `SharePageTabs.tsx:23` and `CostBreakdownSection.tsx:5`. (R1 B4)
- [ ] **R-8** Initial client state is hydrated from server-projected props via `setQueryData`, not a first client fetch. (R1 A3 / EstimateWorkspaceClient pattern)
- [ ] **R-9** Prefer Suspense streaming + the canonical route shell over `loading.tsx`-only + client fetch for heavy authed routes. (§1.3)
- [ ] **R-10** Prefer `patchAndMarkStale` over `router.refresh()` unless a fresh RSC payload is genuinely required (§1.4).
- [ ] **R-11** Type-only imports of heavy libs are allowed (erased); a value import of a dead lib is not. `react-complex-tree` value-imports → zero (it is deleted, §6). (R1 B7, R3)

---

## 3. Server action contracts (return-shape convention)

**Resolves:** R5 ("no action returns `.select("*")` blobs except via flagged repos"), feeds §5/§9.

Server actions are the mutation/read seam between client islands and RPC-encapsulated DB writes. Today they are mostly thin RPC wrappers (good, R5) but return shapes vary. **Target:** one discriminated result envelope so the optimistic adapter (§8) can reconcile uniformly.

```ts
// src/lib/server/action-result.ts  (new home for the convention)
type ActionResult<T> =
  | { ok: true; data: T; reconcile?: ReconcilePatch }   // server-id, revision, canonical row
  | { ok: false; error: ActionError };                  // typed, user-presentable

interface ActionError {
  code: "FORBIDDEN" | "CONFLICT" | "NOT_FOUND" | "VALIDATION" | "SCHEMA_MISSING" | "UNKNOWN";
  message: string;       // safe to toast
  retryable: boolean;
}

// Reconcile payload an optimistic flow applies on success (server-id, revision, canonical fields)
interface ReconcilePatch {
  tempId?: string;       // optimistic placeholder to replace
  serverId?: string;
  revision?: number;     // for revision-guarded flows (estimate tree)
  // canonical field corrections the server computed (codes, totals, snapshots)
  fields?: Record<string, unknown>;
}
```

**Rules:**
- Read actions return **DTOs** (§9), never raw multi-table `.select("*")` payloads.
- Mutation actions return `ActionResult<Row>` with a `ReconcilePatch` carrying the server id + revision so the client can swap its optimistic temp without a refetch.
- Errors are typed `ActionError` (the `SCHEMA_MISSING` code formalizes the existing `isEstimateTabsSchemaMissing` fail-open edge from decisions.md — fail *closed* by default, fail-open only where explicitly probed).
- This is **additive/wrapping** — existing thin RPC wrappers adopt the envelope; the underlying `*_with_history` RPC contracts (R5) are untouched.

---

## 4. Query / cache contracts

**Resolves:** contract §1 state (5 key conventions, tabTree/areaTree branch ×14, `patchAndMarkStale` ×22, no central staleTime policy), R2 candidate-kernels 2 & 3, track 4.

### 4.1 Unified query-key factory

Collapse the 5 conventions (R2: nested-factory ×3, bare-const+builders, inline fns) into **one nested-factory module**, modeled on the clean `favoritesQueryKeys` / `notificationQueryKeys` (R2). The estimate factory **folds the `tabTree`/`areaTree` branch** (replicated ~14× across `use-estimate-row-mutations.ts`) into a single resolver.

```ts
// src/lib/query/keys.ts  (single source of truth)
export const queryKeys = {
  estimate: {
    all: ["estimate"] as const,
    detail: (id: string) => ["estimate", id, "detail"] as const,
    tabs:   (id: string) => ["estimate", id, "tabs"] as const,
    // ONE resolver replaces every `tabId ? tabTree : areaTree` ternary:
    tree:   (id: string, tabId?: string | null) =>
      tabId ? (["estimate", id, "tabTree", tabId] as const)
            : (["estimate", id, "areaTree"] as const),
    treeRevision: (id: string, tabId?: string | null) =>
      [...queryKeys.estimate.tree(id, tabId), "revision"] as const,
  },
  favorites:     { all: [...], sidebar: (scope) => [...] },      // adopt existing clean shape
  notifications: { all: [...], feed: [...], unreadCount: [...] }, // adopt existing
  componentLibrary: { workspace: [...], lite: (...) => [...], rows: (...) => [...] },
  projectCollaboration: (projectId: string) => [...],
} as const;
```

- `areaTree` is **retired** once Q (contract §5) confirms no non-tab estimate still needs it; until then the resolver keeps both arms but the call sites stop hand-branching.
- The `...key, "revision"` sibling-key pattern (`use-estimate-query.ts:40,101`) is formalized via `treeRevision` rather than re-built inline.

### 4.2 `patchAndMarkStale` helper

The `setQueryData` + `invalidate({refetchType:"none"})` idiom appears at **22 sites** (contract §1, R2). One helper:

```ts
// src/lib/query/patch-and-mark-stale.ts
function patchAndMarkStale<T>(
  client: QueryClient,
  key: QueryKey,
  updater: (prev: T | undefined) => T,
): { previous: T | undefined } {        // returns snapshot for rollback
  const previous = client.getQueryData<T>(key);
  client.setQueryData<T>(key, updater);
  client.invalidateQueries({ queryKey: key, refetchType: "none" });
  return { previous };
}
```

Returning the snapshot lets the optimistic adapter (§8) use it directly for rollback.

### 4.3 invalidate vs setQueryData rules

- **`setQueryData` (via `patchAndMarkStale`)** for optimistic writes and server reconciles where the client already holds the canonical shape — the dominant path. (R2: setQueryData in 9 files.)
- **`invalidateQueries({refetchType:"active"})`** only when the server computed something the client cannot derive (cross-entity rollups, permission changes) and a real refetch is required.
- **Never** double-fetch: a `cache()`-wrapped server read feeding a client query must not also be `invalidate`-refetched on mount (R5 open question — audit overlap in Phase 4).

### 4.4 staleTime / gcTime policy

One central policy in the `QueryClient` default (`providers.tsx:18-19`), overrides only where behavior demands it:

| Class | staleTime | gcTime | Rationale |
|---|---|---|---|
| Default (most reads) | `5 * 60_000` | `5 * 60_000` | Existing global; remove the ≥7 redundant per-query restatements (R2). |
| Long-warm lazy (component library lite) | `5 * 60_000` | `30 * 60_000` | Keep the intentional long cache (`EstimateSheetContent.tsx:1193-1196`). |
| Always-fresh (sidebar favorites) | `0` | default | Keep the intentional D4 override (`use-sidebar-favorites-query.ts:30`). |
| Short (notifications) | named constants 30s/60s | — | Keep, but source the constants from one module. |

Implementers **delete** the redundant `5 * 60 * 1000` literals that merely restate the global (R2: ≥7 sites).

---

### 4.5 Law 2 — state holds choices/facts, never derived data (Bible §2 Law 2)

State must answer exactly one of two questions: **"what did the user choose?"** or **"what is externally true?"** Anything computable from those two — a filtered list, a selected object, a full ancestor path, a total — is **derived**, and must be a memo/selector, not state. Never store derived data in state via a `useEffect` that mirrors other state, **unless** it is an explicit indexed cache with a declared invalidation key (e.g. `TreeIndex` keyed on tree revision, §6.3). A `useEffect` that recomputes a derived value on every dependency change is the anti-pattern; an indexed cache that rebuilds only when its invalidation key changes is the sanctioned exception.

| Holds a choice/fact → **state** | Derived → **memo/selector** |
|---|---|
| `selectedNodeId` (user choice) | `selectedNode` / `nodeById` (look-up over the cache) |
| `expandedNodeIds` (user choice) | `visibleTreeRows` (`flattenVisible(expanded)`, §6.1) |
| cache tree (externally true) | `nodeTotalsById` (rollup over `TreeIndex`, §7.3) |
| search query text (user choice) | filtered/faceted display set (selector, §6.1) |

Doc 27 holds the **enforceable merge-gate** version of this law (lint/CI rule); this subsection is the architectural statement it enforces.

---

## 5. Zustand / UI-state contracts

**Resolves:** contract §1 state (two selection stores, server-state-in-Zustand, high-freq dragState, arrays-vs-sets), R2 candidate-kernel 5.

### 5.1 What lives where

| Concern | Home | Why |
|---|---|---|
| Server/persistent data (estimate rows, lists, trees) | **TanStack Query cache** | Single source; never Zustand. Retire `project-estimates-store`'s row ownership (R2). |
| Cross-component UI state (selection, expansion, active tab, column widths, activity scope) | **Zustand** | UI-only, survives re-render, shared across trees. |
| Render-local ephemeral (open menus, hover, in-flight draft text) | **`useState`/`useRef`** in the owning island/hook | Not shared; keep out of stores. |
| High-frequency transient (drag position) | **dedicated isolated store/atom** | Must not re-render selection subscribers. |

### 5.2 Merged selection/expansion store

`use-estimate-workspace-state.ts` and `estimate-ui-store.ts` both model `selectedNodeId` + `expandedNodeIds` (R2 anti-pattern 1). **Target:** one workspace UI store keyed by estimate/tab, with `Set`/`Map` instead of arrays.

```ts
// src/stores/estimate-workspace-ui-store.ts  (merged)
interface EstimateWorkspaceUiState {
  selectedNodeIdByScope:  Map<ScopeKey, string>;       // estimateId|tabId
  expandedNodeIdsByScope: Map<ScopeKey, Set<string>>;  // Set, not string[] (O(1) toggle/has)
  selectedRowIds:         Set<string>;                  // was string[] in estimate-ui-store
  activeTabIdByEstimate:  Map<string, string>;
  activityScopeDirectOnly: Map<string, boolean>;
  // setters bail early when unchanged (preserve the existing equality short-circuits)
}
```

- `expandedNodeIds` moves from `string[]` + O(n) `areNodeIdsEqual` (R2: `use-estimate-workspace-state.ts:105-108`) to `Set<string>`.
- **`dragState` is extracted** into its own store/atom (`use-estimate-drag-store`) so per-pointer-move updates (`estimate-ui-store.ts:49`) never re-render selection/expansion subscribers (R2 anti-pattern 3).
- **`bulkSelectedRowIds`** (local `Set` at `EstimateSheetContent.tsx:1099`) and `editableRows` are evaluated for merge into this store vs staying local (contract §5 Q — measure before merging; the local Set is already correct as a Set).
- `use-estimate-header-actions-store.ts` (callbacks-as-cross-tree-bridge) stays but is documented as an intentional event bridge.

### 5.3 Atomic-selector + equality law (Bible §8.1 / §8.2)

Subscription granularity is a correctness constraint, not a tuning knob:

- **Smallest-slice subscription (§8.1).** A hot component subscribes to the **smallest slice** it needs, never the whole store. `useStore((s) => s.selectedNodeId)` — not `const s = useStore()` then `s.selectedNodeId`. A render that reads one field must not re-render when an unrelated field changes.
- **Object/array selectors need equality (§8.2).** A selector that returns a fresh object or array each call re-renders on every store update (new reference every time). Such a selector **must** either use `useShallow(...)` or be **split into atomic selectors**. Prefer splitting on the hottest paths.
- **Setters bail early when unchanged (§8.2).** Every setter short-circuits when the next value equals the current one (`if (next === prev) return;` / `Object.is`). This is the **canonical `use-estimate-workspace-state` equality-guard pattern** (R2: `areNodeIdsEqual` short-circuit) — preserve it on the merged store (§5.2), upgraded to `Set`/`Map` membership checks.

### 5.4 Scoped-store cleanup / eviction (Bible §8.3)

A long-lived store must not let memory grow with user activity. Two rules:

- **Scope keys by entity.** Per-scope state is keyed by `estimateId | tabId | projectId | workspaceId | publicationId` (the `ScopeKey` shape, §5.2), never flat globals that accumulate across navigation.
- **Evict closed/unmounted scopes.** When a scope closes (estimate/tab closed, project left, workspace switched, publication dismissed), its keyed entries are **deleted** — a `clearScope(key)` on unmount or close. A store keyed by scope without eviction is a leak that grows with session length. Ties **RISK-18** and **Q-34** (lifecycle owner + eviction trigger to confirm in measurement).

---

## 6. Canonical tree kernel

**Resolves:** contract §1 trees (7 families, ≥8 finders, ≥5 descendant collectors, ≥4 filters, ≥3 cascade engines, two presentation kernels, dead `react-complex-tree`), track 1, R3 (the central lens).

Two layers: a **headless index/ops library** (pure, the real win) + the **single `Tree` presentation kernel** (already good — keep, retire `WorkshopTree`).

### 6.1 Headless `TreeIndex` + ops

A node type is described once via a `TreeAdapter`; everything else is generic. Built **once per tree version** and reused by every consumer and handler — replacing the per-render/per-keystroke fresh DFS that ≥8 finders do today (R3).

```ts
// src/lib/tree/tree-kernel.ts  (new canonical home)

// 1. Describe any node type once.
interface TreeAdapter<T> {
  id: (n: T) => string;
  children: (n: T) => readonly T[] | undefined;
  withChildren?: (n: T, c: T[]) => T;   // for typed immutable ops
}

// 2. Computed once per tree version; reused everywhere.
interface TreeIndex<T> {
  byId:        ReadonlyMap<string, T>;
  parentOf:    ReadonlyMap<string, string | null>;
  depthOf:     ReadonlyMap<string, number>;
  pathOf:      ReadonlyMap<string, readonly string[]>;     // ancestor ids
  find:        (id: string) => T | undefined;              // O(1) — replaces ≥8 DFS finders
  descendantsOf: (id: string) => ReadonlySet<string>;      // memoized — replaces ≥5 collectors
  ancestorsOf: (id: string) => readonly string[];
  flattenVisible: (expanded: ReadonlySet<string>) => readonly FlatRow<T>[];
  allIds:      () => readonly string[];
  folderIds:   () => ReadonlySet<string>;
}
function buildTreeIndex<T>(roots: readonly T[], a: TreeAdapter<T>): TreeIndex<T>;

// 3. Immutable mutations — ONE engine (estimate + library reorder collapse here).
function moveNode<T>(roots: readonly T[], a: TreeAdapter<T>,
  draggedId: string, target: { id: string; pos: "before" | "after" | "inside" }
): ReorderResult<T>;
function removeNodes<T>(roots: readonly T[], a: TreeAdapter<T>, ids: ReadonlySet<string>
): { next: T[]; fallbackId: string | null };
function mapNode<T>(roots: readonly T[], a: TreeAdapter<T>, id: string, fn: (n: T) => T): T[];

// 4. Indexed filter — keep matches + ancestors (replaces ≥4 filter impls).
function filterKeepingAncestors<T>(idx: TreeIndex<T>, predicate: (n: T) => boolean): T[];

// 5. Cascade selection — generalize the existing tree-selection.ts engine over TreeAdapter.
//    toggleCascade / getSelectionState / dedupeRoots (replaces ≥3 cascade engines).

// 6. Rollup — bottom-up reduce with memoized subtree cache (replaces 4+ rollup DFS).
function rollup<T, A>(idx: TreeIndex<T>, a: TreeAdapter<T>,
  seed: (n: T) => A, combine: (parent: A, child: A) => A
): ReadonlyMap<string, A>;

// 7. Structural hash — replaces full-tree JSON.stringify content signature.
function structuralHash<T>(idx: TreeIndex<T>, a: TreeAdapter<T>,
  fields: (n: T) => unknown[]                       // only the fields that matter
): string;                                          // cheap; not a 19-field whole-tree stringify
```

- **`structuralHash`** retires `getEstimateTreeContentSignature` (`estimate-tree-reorder.ts:181-220`), which JSON.stringifies ~19 fields × every row on every reorder, called 5× in `EstimateSheetTree.tsx` incl. initial render (contract §1, R3 finding-3). Pairs with the existing revision counters for structure.
- **One reorder/delete planner.** `buildEstimateNodeReorderPlan` and `buildLibraryFolderReorderPlan` (the near-identical pair, R3 §3) collapse into `moveNode`/`removeNodes`; the only legitimate divergence (sort-order persistence step) is a small adapter param, not a duplicate engine (R3 open question).

### 6.2 Single presentation kernel `Tree`

- `Tree` (`ui/tree.tsx`, ~1328 LOC, virtualized, ARIA, roving focus, DnD, cascade indeterminate) is the **only** renderer. Its `TreeNode` interface (`tree.tsx:30`) stays the render contract; consumers map their domain nodes to `TreeNode[]` via the adapter + `flattenVisible`.
- **`WorkshopTree` is deleted.** The only consumer — the read-only Share view (`ShareEstimateTreeView.tsx:298`) — moves onto `Tree` in a read-only mode (no DnD, no selection). The Share 500-row cap (`reconstruct-share-tree.ts:29`) means virtualization is optional there but free once on `Tree` (R3 finding-4, open question).
- **`react-complex-tree` is removed** from `package.json`. Its only uses are CSS (`app/workshop/layout.tsx:15`) and one `TreeItemIndex` type alias (`library-folder-reorder.ts:1,86`) — replace the type with a local `type TreeItemIndex = string`, drop the CSS import, delete the dep (R3, R1 B7, contract §1).

### 6.3 Where the index lives (derived state, not store)

`TreeIndex` is **derived** from the tree in the TanStack cache — a memoized selector layer, not Zustand (R3↔R2 reconciliation). It is recomputed only when the tree version/revision changes, and **every consumer + handler reads the same index instance** instead of re-DFS-ing. This is what severs the per-keystroke rebuild: a keystroke changes `editableRows` (§7), not tree structure, so the index is reused untouched.

### 6.4 Adoption order (for Phase 2 plan)

Estimate sheet (highest churn) → library/folders (collapse the duplicate reorder planner) → templates (donate its already-indexed `filterProjectSourcesByQuery`, R3 §4 — the model the other filters should adopt) → Share render onto `Tree`, then delete `WorkshopTree` + `react-complex-tree`.

---

## 7. Canonical sheet / grid architecture

**Resolves:** contract §1 estimate sheet (2950 LOC file / 1881 LOC fn / ~17 responsibilities / ~40 atoms; `editableRows` fan-out; full-tree totals DFS per keystroke; proposal-signature DFS), track 2 & 3, R4.

### 7.1 Decompose `EstimateSheetContent`

The 1881-LOC component (`:1042-2922`) splits along R4's responsibility map into hooks + presentational children, **preserving the §0 render guards**. Highest-value first:

| Target unit | Owns (R4 ref) | Win |
|---|---|---|
| `useEstimateEditableRows` (hook) | R-C editable state + resync effect (`:1766-1783`) + `collectEditableRows` | Per-row subscription (§7.2) — the single biggest perf lever |
| `useEstimateTotals` (hook) | R-J totals (`:1401-1410`) | Incremental totals (§7.3) |
| `useProposalExport` + `<ProposalExportController>` | R-L + signature (`:287-318`, `:1583-1669`) | Signature off the keystroke path |
| `useEstimateActivityHistory` (hook) | R-K (already well-gated) | Clean extraction |
| `useEstimateRowOperations` (hook) | R-M 15 mutation callbacks + inline tree mutators | Largest LOC win; feeds optimistic adapter (§8) |
| `useSheetDisplayTransforms` (hook) | R-G search/facet/group (`:682-826`) | Isolates filter recompute |
| `<EstimateSheetCenterColumn>` (presentational) | R-Q center JSX (`:2662-2892`) | Pre-derived props only |

Cursor layer (`:866-1040`) is **already** extracted — use it as the extraction template. Constraint: callbacks stay identity-stable (`useStableCallback`) and the `displayedSheetNode === selectedNode` identity short-circuit (`:1307-1315, :1404`) is preserved (R4 constraint).

### 7.2 Per-row subscription model (sever the `editableRows` fan-out)

`editableRows` is a single `useState<Record<id, EditableRowValue>>` (`:1093`); each keystroke replaces the map identity (`updateEditableRowValue` returns `{...current,[id]:...}`, `src/components/workshop/estimate-sheet/rows/editable-row-model.ts:29-52`), fanning out to 6+ whole-tree memos (`:1252, 1401, 1405, 1413, 1429, 1590`) (contract §1, R4 finding-4).

**Target:** an external store for editable rows that components subscribe to **per row id** (e.g. `useSyncExternalStore` or a Zustand row store), so a keystroke in row A notifies only row A's subscriber and the totals selector for A's ancestor chain — **not** every tree-wide memo.

```ts
// src/components/workshop/estimate-sheet/rows/editable-rows-store.ts  (target; sibling of editable-row-model.ts)
interface EditableRowsStore {
  get: (rowId: string) => EditableRowValue | undefined;
  set: (rowId: string, value: EditableRowValue) => void;   // notifies only rowId subscribers
  subscribeRow: (rowId: string, cb: () => void) => () => void;
  snapshot: () => ReadonlyMap<string, EditableRowValue>;    // for export/server reconcile only
}
```

- The row component reads its own value via `subscribeRow(item.id)` — the per-row memo guard (`row-table.tsx:86-116`) is **kept** and now reinforced by per-row subscription.
- Whole-map snapshots are taken **only** on cold paths (export model build, server reconcile), never on the keystroke path.
- The tree→editableRows resync effect (`:1766-1783`, full-tree `collectEditableRows`) runs only on server reconcile, not per keystroke.

### 7.3 Incremental totals

`computeNodeTotals` (`src/components/workshop/estimate-sheet/rows/editable-row-model.ts:162-183`) is a full-tree DFS rerunning on **every** cost-cell keystroke because `editableRows` identity changes (`:1401`) (contract §1, R4 finding-2).

**Target:** totals are a memoized `rollup` (§6.1, kernel item 6) over the `TreeIndex`, recomputed **only along the changed row's ancestor chain** (`TreeIndex.ancestorsOf`) rather than the whole tree. On a keystroke in row A:
1. row A's leaf total recomputes (cheap, already in the memoized `computedItem`, `row-table.tsx:201-238`);
2. only A's ancestors' subtree totals recompute via the cached `rollup`.

- The search/facet `displayedNodeTotals` second pass (`:1402-1406`) reuses the same incremental rollup keyed on the displayed subtree, not a second full DFS.
- The branch fallback `nodeTotals?.get(id) ?? computeNodeTotal(...)` (`branch.tsx:177`) stays as a latent guard but the kernel guarantees `nodeTotals` is always present (no O(n²) risk).
- `reportEstimateNodeTotalsCompute` (render-probe) asserts `nodeTotalsComputes === 1` per keystroke (existing gate, R7) — incremental totals must keep that at 1.

**Totals-Map reference-stability (CORRECTED per D-017).** The totals Map is **number-valued** (`ReadonlyMap<string, number>`), and the §0 per-row/per-branch memo guard short-circuits on **VALUE equality** — `Object.is` over the numeric totals entry (`branch.tsx:147`), not over an object reference. So a plain recompute that produces equal numeric values does **not** break render isolation: `Object.is(prevTotal, nextTotal)` is `true` whenever the numbers match, regardless of Map identity. Therefore **no structural-sharing helper and no `Object.is(prevTotals.get(id), nextTotals.get(id))` reference-identity gate are required for the totals Map** — there is no reference-identity requirement on number-valued totals, and `09 §13` says such a gate must NOT exist. The reference-identity concern applies **only** to the **object-valued** `editableRows` per-row store (`branch.tsx:101`), where a re-created row object with identical contents would defeat the guard; that surface is handled by the per-row store (Phase 3 Step 4), and the `withUpdatedEntry`/structural-sharing primitive targets object-valued surfaces only (Q-33/Q-25). Cross-ref **D-017**, `09 §5` (item 3, gate #3), **RISK-16**.

### 7.4 Proposal signature off the hot path

`createProposalPreviewSignature` (`:287-318`) is a full-tree 15-field string DFS rebuilt per keystroke once the dialog has been opened (`:1260-1263`) (R4 finding-3). **Target:** the signature is computed **lazily on dialog open** and debounced thereafter, and/or replaced by `structuralHash` (§6.1 item 7) over only the fields the stale-badge needs. The existing `estimate-sheet-memoization.test.tsx` gate (`proposalSignatureComputes === 0` on keystroke, R7) becomes the contract.

### 7.5 Virtualization

The virtualization flags **already default ON** (`src/lib/workshop/virtualization-flags.ts:11-13`) — this is not the lever. The real gate is the **thresholds**: branch virtualization needs ≥80 sections (`virtual-branch-list.tsx:93`) and row virtualization is per-table threshold-gated (`row-table.tsx:22`), so a tree composed of many *small* areas never crosses any single threshold and renders fully un-virtualized (contract §1, R4 finding-5). **Target:** **tune the per-surface thresholds** (`WORKSHOP_VIRTUALIZATION_DEFAULTS`: `estimateRowsMinRows = 75`, `estimateMasterColumnMinSections = 80`, `treeMinRows = 150`) so a tree composed of many *small* areas — where no single section/table crosses its own threshold even though the whole tree is large — still virtualizes; lower them as the render-isolation gates prove no regression at the new thresholds. Also **confirm the prod env does not override these flags to off** (the flags read `NEXT_PUBLIC_*_VIRTUALIZATION` env vars and disable on `0/false/no/off`, `virtualization-flags.ts:1-15`, contract §5 Q-C); the defaults being ON is moot if a prod-only env var disables them. Separately, the `findScrollParent` `getComputedStyle` DOM walks (`virtual-branch-list.tsx:34-42`, `row-table.tsx:130-138`) are cached per scroll container, not recomputed per call.

---

## 8. Canonical optimistic mutation adapter

**Resolves:** contract §1 state (13 hand-rolled flows, 5 rollback mechanisms, no-rollback on notifications + collaborator-role), track 4, R2 candidate-kernel 1.

One lifecycle replaces the 13 flows + 5 rollback mechanisms (patch-snapshot, whole-tree snapshot, revision-guarded restore, cache-snapshot, closure-restore):

```ts
// src/lib/query/create-optimistic-mutation.ts
interface OptimisticConfig<TInput, TData, TCtx> {
  key: (input: TInput) => QueryKey;                 // from queryKeys factory (§4.1)
  mutationFn: (input: TInput) => Promise<ActionResult<TData>>;  // §3 envelope
  // apply optimistic patch; returns the rollback snapshot (uses patchAndMarkStale, §4.2)
  apply: (client: QueryClient, input: TInput) => TCtx;
  // reconcile server truth (server-id swap, revision, canonical fields)
  reconcile?: (client: QueryClient, data: TData, input: TInput) => void;
  // single rollback contract — restore the snapshot captured by `apply`
  rollback: (client: QueryClient, ctx: TCtx) => void;
  // optional ordering guard (subsumes per-row operationId + promise queue)
  identity?: { revisionKey?: (input: TInput) => QueryKey };
}
function createOptimisticMutation<I, D, C>(cfg: OptimisticConfig<I, D, C>): UseMutationOptions<...>;
```

**Lifecycle (one path for all flows):** `onMutate` → `apply` (capture snapshot) → `mutationFn` → on `ok:true` `reconcile` (swap temp-id → server-id, set revision) → on `ok:false`/throw `rollback` → toast typed `ActionError`.

- **The 5 rollback mechanisms become one** (`rollback(ctx)` over the snapshot from `apply`). The revision-guarded restore (`use-estimate-query.ts:70-75`) is expressed via `identity.revisionKey`; the whole-tree snapshot (move, `:180`) and patch snapshot (row update, `:395-398`) are both just different `apply`/`rollback` closures over the same contract.
- **Notifications + collaborator-role get rollback for free** by adopting the adapter (closes the no-rollback gap, R2 finding-3 / `useNotificationsQuery.ts:83-164`, `use-project-collaboration-query.ts:45-63`).
- **Pending-id strategy is unified:** `mutationId` + optional `revision`; the per-row `operationId` + serialized promise queue (`use-estimate-row-mutations.ts:201-202,426-436`) is retained **only** if measurement shows ordering still needs it (R2 open question) — otherwise the adapter's identity guard subsumes it.
- The tree-patch reconciliation pair (`patchEstimateRowItemInTree` + `findEstimateRowItemInTree` + `toXxxRowPatch`, R2 candidate-kernel 4) is centralized as the estimate-domain `apply`/`reconcile` implementations on top of `mapNode` (§6.1).

---

## 9. Canonical projection / DTO layer

**Resolves:** contract §1 data (`.select("*")` unbounded component library; serial homebase tail; JS chart aggregation; `projects` `.select("*")`; activity N+1), track 5, R5.

### 9.1 Read DTOs + `.select` discipline

- Every read crossing the server→client boundary returns an **explicit-column DTO**, not `.select("*")`. The model is `ESTIMATE_LIST_COLUMNS` (R5) and the publication repo's split `ACCESS_LOOKUP_COLUMNS` / `SNAPSHOT_LOOKUP_COLUMNS` (R5 — read the heavy `snapshot_json`/`source_snapshot` blob **only** when the consumer needs it).
- **Fixes:** `projects` `.select("*")` (`workspace-repository.ts:837/908`) → explicit columns; `loadCurrentWorkspaceComponentRowsLibrary` (`component-library-repository.ts:530-746`) → explicit columns on all 8 tables **and `.limit()`** on `cost_library_items` + per-item history (the [HIGH] unbounded finding — gated on contract §5 Q: does prod call the Lite variant?).
- DTO types are frozen interfaces (the `ProjectEstimateListRow` precedent, decisions.md D8) so the optimistic adapter (§8) reconciles against a stable shape.

### 9.2 Server-side aggregation / RPC

Push JS aggregation down to SQL where the data volume crosses the boundary only to be reduced:

- **Ship `get_project_chart_buckets`** (designed, golden-master-proven, *never shipped*; `project-charts-repository.ts:101-128` / decisions.md notes the recursive-CTE fix). Charts payload stays buckets-only (decisions.md Charts decision — do not reintroduce raw facts). Cutover must pass the golden-master oracle + deploy probe (fail-open on partial drift).
- **Collapse `getWorkshopHomebaseData`'s serial tail** (`workspace-repository.ts:1126-1222`, 5–7 sequential awaits, several independent) into another `Promise.all` wave or a `workspace_homebase_summary` RPC (R5 [HIGH] finding-3).
- **`estimate_activity_node_scope`** recursive-CTE RPC replaces the JS BFS full-node fetch (`estimates/actions.ts:670-719`); fold actor labels into the event read to kill the N+1 (`:600-622`) (R5 [MED]).

### 9.3 DB performance (Phase 8 planning items — not applied here)

- **Hot-path FK indexes** (the read-relevant subset of the 87 unindexed FKs, contract §1): `estimate_nodes(parent_id)`, `estimate_nodes(estimate_tab_id)`, `project_favorites`, `estimate_favorites`, `project_members`, `project_group_memberships`, `estimate_sheet_members`, `notification_deliveries`. Defer audit/AI-table FK indexes (cascade-delete cost only).
- Re-evaluate the 13 `unused_index` entries for DROP after a longer traffic window (R5 open question).
- RLS-initplan stays remediated; a fresh `bun run prove:rls-initplan` + advisor pass confirms no new bare `auth.uid()` in a USING/CHECK clause (R5, decisions.md).

These are planning items with risk + validation only (contract §4 hard constraint).

---

## 10. Canonical loading / skeleton strategy

**Resolves:** contract §1 UI (6 bespoke `animate-pulse` bypass `Skeleton`; divergent `loading.tsx` shells), R6.

- **One `Skeleton` primitive** (`ui/skeleton.tsx`, already correct: `animate-pulse rounded-xs bg-muted/40` + `motion-reduce:animate-none`). The 6 hand-rolled `animate-pulse` blocks (`data-table.tsx` ×2, `TemplatesTree.tsx`, `component-library/index.tsx`) adopt it — they currently skip `motion-reduce` (R6).
- **Add `<Skeleton.List rows={n} />`** (data-driven list skeleton) so the bespoke `ProjectEstimatesListSkeleton` and the various lists share one source (R6).
- **One route-shell contract:** every `loading.tsx` composes `StaticWorkshopLoadingShell` + `Skeleton` (today `library/loading.tsx:1` uses bare `Skeleton` with no shell — layout-shift risk, R6). The streamed Suspense fallbacks (§1.3) use the **same** shell so `loading.tsx`, the streamed skeleton, and the real route are pixel-consistent.

---

## 11. Canonical performance instrumentation

**Resolves:** contract §1 tests/perf (only 4 render-isolation gates; no render-count budgets for tree/tabs/sidebar/charts; orphan benchmarks), R7.

- **Render probes:** generalize the `estimate-sheet-render-probe.ts` pattern (`reportEstimateSheetContentRender`, `reportEstimateNodeTotalsCompute`) into a reusable `createRenderProbe(name)` so tree, tabs, sidebar, and charts each expose render/compute counters the gates can assert (R7 gap-1).
- **Render-count harness:** the 4 jsdom render-isolation tests in `tests/vitest/perf/` (relief, memoization, cursor-isolation, baseline) are the **template** (R7 finding-1). The refactor adds the same shape for: tree expand/collapse, tree filter, tab switch, right-sidebar search (R7 gap-1) — each asserting exact `0`/`1` render counts.
- **Query-count budget:** wire `build-performance-query-inventory.ts` (today orphan/ungated, R7) into a gated check asserting "estimate sheet load issues ≤ N queries" and catching new N+1s (R7 gap-4).
- **Bundle-size budget:** an `analyze` script + a per-route/chunk kb ceiling so a heavy dep regression is visible (R7 gap-5; analyzer is wired but ungated).
- **Real large-data fixture:** a genuine large-tree/large-estimate fixture (1000+ row sheet, deep multi-level tree, 100+ project list) — today the seed is manifest-only (`seed-performance-test-data.ts:116`) and profiles are synthetic ≤200 rows (R7 gap-3).

All "new script" items are flagged "to be added in Phase 0/9" (contract §4).

---

## 12. Testing / benchmark gates (the refactor gate)

**Resolves:** contract §2 Phase 9, R7 gaps.

The refactor is "done" for a given kernel only when its gate is green. The gate layers (Phase 9):

1. **Existing aggregate gate** (`bun run validate` = type-check + lint + lint:design-system + lint:design + test + test:dom) stays the baseline. It does **not** run e2e/perf/storybook/bundle (contract §0) — so the perf gates below are added explicitly.
2. **Render-isolation gates (hard):** the 4 existing perf tests + the new tree/tabs/sidebar/charts ones (§11) assert exact render/compute counts. A keystroke must keep `nodeTotalsComputes === 1`, `proposalSignatureComputes === 0`, `rendersOutside === 0` (R7).
3. **Query-count budget (hard):** ≤ N Supabase queries per hot-path load; no new N+1 (§11).
4. **Bundle-size budget (hard):** per-route/chunk kb ceiling; landing chunk contains **no** supabase/realtime (§1.1 / §11).
5. **DS reuse/duplication lint (new, Phase 6):** `enforce-app-design-system.mjs` gains a primitive-adoption/duplication rule so a re-introduced duplicate fails CI (R6 finding-1 — today duplicates pass because they're token-compliant; DESIGN.md "a visible duplicate is a blocking defect" is currently unenforced).
6. **Route-transition budgets tightened:** the loose 15s/10s/30s medians + overlay cap 1.0 (`check-route-transition-readiness.ts:108-112`) tightened to real warm targets so they actually bite (R7 gap-6).
7. **Proportional verification (AGENTS.md):** each kernel ships with the narrowest gate proving it; broad `validate`/`build` reserved for shared-logic/auth/DB/high-blast-radius work.

---

## 13. Canonical patterns (Bible §19)

Copy-paste TS sketches for the laws above — **design targets, not committed code**. They name the laws they satisfy. (The `use cache` / `cacheTag` snippet lives in **doc 26** — cross-ref it; not duplicated here.)

```ts
// (a) Atomic Zustand selector — smallest slice (§5.3 / Bible §8.1)
const selectedNodeId = useEstimateWorkspaceUiStore((s) => s.selectedNodeIdByScope.get(scopeKey));
// NOT: const s = useEstimateWorkspaceUiStore(); s.selectedNodeIdByScope.get(scopeKey)
```

```ts
// (b) useShallow multi-selector — object/array return needs equality (§5.3 / Bible §8.2)
import { useShallow } from "zustand/react/shallow";
const { selectedRowIds, activeTabId } = useEstimateWorkspaceUiStore(
  useShallow((s) => ({
    selectedRowIds: s.selectedRowIds,
    activeTabId: s.activeTabIdByEstimate.get(estimateId),
  })),
);
// Hottest paths: prefer two atomic selectors over one useShallow object.
```

```ts
// (c) useDeferredValue — deferred search keeps typing responsive (§7.1 / Bible §19)
const deferredQuery = useDeferredValue(searchQuery);            // searchQuery is state (a user choice, §4.5)
const displayed = useMemo(
  () => filterKeepingAncestors(treeIndex, (n) => matches(n, deferredQuery)), // derived (§4.5/§6.1)
  [treeIndex, deferredQuery],
);
```

```ts
// (d) Scoped mutation-result DTO — §3 envelope carrying scope + reconcile
type MoveRowResult = ActionResult<{
  scope: { estimateId: string; tabId: string | null };          // ScopeKey fields (§5.4)
  reconcile: ReconcilePatch;                                     // tempId→serverId, revision (§3)
}>;
```

```ts
// (e) Reconcile via setQueryData — swap optimistic temp for server truth (§8 / §4.2)
function reconcileMovedRow(client: QueryClient, data: MoveRowResult["data"]) {
  if (!data) return;
  const key = queryKeys.estimate.tree(data.scope.estimateId, data.scope.tabId);
  patchAndMarkStale(client, key, (prev) =>
    mapNode(prev ?? [], estimateAdapter, data.reconcile.tempId ?? data.reconcile.serverId!, (n) => ({
      ...n,
      id: data.reconcile.serverId ?? n.id,
      ...(data.reconcile.fields ?? {}),
    })),
  );
}
```

```tsx
// (f) Route-shaped skeleton — same shell as loading.tsx + streamed fallback (§1.3 / §10)
function EstimateWorkspaceSkeleton() {
  return (
    <StaticWorkshopLoadingShell>
      <div className="grid grid-cols-[1fr_2fr_minmax(0,20rem)] gap-3">
        <TreeSkeleton />          {/* left tree pane */}
        <SheetRowsSkeleton />     {/* center sheet — Skeleton.List rows={n} */}
        <RightDockSkeleton />     {/* right dock */}
      </div>
    </StaticWorkshopLoadingShell>
  );
}
```

---

## Traceability matrix (target → contract track / finding)

| Section | Track | Pinned finding |
|---|---|---|
| §1 Routes/data, §2 boundaries | 5 | RSC providers on public routes; `router.refresh` ×12; sparse streaming (R1) |
| §3 Action contracts | 5 | No `.select("*")` to client; typed results (R5) |
| §4 Query/cache | 4 | 5 key conventions; tabTree/areaTree ×14; `patchAndMarkStale` ×22; no staleTime policy (R2) |
| §5 Zustand/UI-state | 4 | Two selection stores; server-state-in-Zustand; dragState; arrays-vs-Sets (R2) |
| §6 Tree kernel | 1 | 7 families; ≥8 finders; two presentation kernels; dead react-complex-tree (R3) |
| §7 Sheet/grid | 2, 3 | 1881 LOC fn; editableRows fan-out; full-tree totals/signature per keystroke (R4) |
| §8 Optimistic adapter | 4 | 13 flows / 5 rollbacks; no-rollback notifications + collaborator (R2) |
| §9 Projection/DTO | 5 | `.select("*")` unbounded library; serial homebase; JS chart aggregation; FK indexes (R5) |
| §10 Loading/skeleton | — | 6 bespoke animate-pulse; divergent loading.tsx (R6) |
| §11 Instrumentation, §12 gates | — | 4 render gates only; orphan benchmarks; ungated bundle/query (R7) |

## Deferred to open-questions (architectural tensions not resolved here)

Recorded for `19_OPEN_QUESTIONS.md` (Q-IDs owned by W11):

- **Q-A** Should `editableRows` live in the TanStack tree cache (single source) **or** as a per-row external store (§7.2)? This design picks the external per-row store to sever the fan-out, but R2/R3 flag interaction with the tree-as-cache model — confirm with measurement before committing.
- **Q-B** Can `areaTree` be fully retired from the key resolver (§4.1), or is it load-bearing for a non-tab estimate? (contract §5)
- **Q-C** The virtualization flags default ON (`virtualization-flags.ts:11-13`), but does the prod env override them (or the thresholds) to off/0 (§7.5)? Lowering thresholds only helps if prod actually runs with virtualization enabled. (contract §5)
- **Q-D** Does the left `EstimateSheetTree` run its own totals DFS, doubling per-keystroke compute (R3↔R4 seam)? The incremental-totals target (§7.3) assumes a single shared `TreeIndex`/rollup serves both panels — must be verified.
- **Q-E** Does prod call the full or Lite component-library loader (§9.1)? Decides whether the unbounded `.select("*")` fix is on the hot path. (contract §5)
- **Q-F** Is `lint:design` (impeccable `detect.mjs`) a real gate or a no-op loader? Decides whether the DS reuse rule (§12.5) extends it or is net-new in `enforce-app-design-system.mjs`. (contract §5, R6 caveat)
