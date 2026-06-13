# BASELINE — Library Optimization implementation

**Branch:** `2026-06-14-Library-Optimization-Plan` (worktree `distracted-lovelace-50a310`), forked clean from `main` @ `6e02e061`.
**Implementer:** autonomous execution session, 2026-06-14.
**Stack confirmed at ground-truth:** Next.js **16.2.6**, React 19.2.6, `@tanstack/react-query` 5.100.14, Zustand 5.0.14. Node nvm v25.8.0. Vitest via `bun run test:dom`.

This file closes the `09_PREIMPLEMENTATION_GAP_REVIEW.md` readiness gates (G1–G7) and records the P0b architecture decision before product-code edits.

---

## G1 — Baseline metrics + scenario matrix

**Honest tooling constraint:** the live workshop requires the user's authenticated Chrome session — dev-auth bypass is disabled and a second `next dev` will not start (project memory: `workshop-browser-verification-setup`). Therefore the browser-measured metrics (TTFB, FCP/LCP/INP, wall-clock tab-switch ms, runtime CLS, live Supabase round-trips) **cannot be captured autonomously in this session**. They are recorded as a **deferred manual gate** (see G6). What CAN be established objectively from the source is recorded here and is the contract each `AFTER_*` claim is measured against.

### Structural baseline (static analysis of `main` @ 6e02e061)

| Metric | Baseline (pre-change) | Evidence |
|---|---|---|
| Full-app blur overlay trigger on internal `<a>` click | YES — immediate, 250ms floor | `navigation-listener.tsx:38`, `navigation-ui-store.ts:12,35` (pre-T1) |
| Blur overlay trigger on `router.refresh()` (every mutation) | YES | `use-navigation-router.ts:27` (pre-T1) |
| Overview skeleton shape vs content | MISMATCH (grid + 312px right rail vs single column) → wrong-shape flash/CLS | `library/loading.tsx` (pre-T2) vs `LibraryOverview.tsx:230-298` |
| Browse tabs using TanStack Query cache | NONE (3 server-prop tabs, 0 `useQuery`) | only `TemplateEditorClient.tsx:121` uses a query |
| Warm-revisit route `loading.tsx` re-fire | YES on every revisit (dynamic segments, no `experimental.staleTimes`) | `next.config.ts` had no `staleTimes`; obs 5941 |
| Mutation tails calling `router.refresh()` (full server re-run) | 11 sites (4 component, 6 template, 1 editor-shared) | mapped: `ComponentLibraryManager` 1175/1203/1334/1409, `TemplatesBrowseManager` 603/617/651/673/710/747, `use-template-editor.ts:76` |
| Skeleton states per standard session (overlay + route loading.tsx + dynamic() fallback) | ~8 (≈2–3 per tab) | `00_INDEX.md` finding F5 |
| Library data volume (not the bottleneck) | 154 components / 3 templates / 10 template nodes | `02_AUDIT_DATABASE.md §B` |

### Target after implementation
- Overlay count for fast intra-Library nav/mutations: **0** (delayed-show, never on refresh).
- Skeleton-flash count for the standard session: **≤1** (cold load only).
- Mutation → visible: instant (optimistic, already present) **and settled without a full server segment re-run** (cache invalidation, not `router.refresh()`).

---

## G2 — P0b architecture + query-key / data-shape decision (REQUIRED before coding)

**Chosen path: route client-shells that own a TanStack `useQuery`, seeded by `initialData` from the existing server fetch, PLUS `experimental.staleTimes` so Next's Router Cache reuses warm dynamic segments.** (08 Q1 default = route client shells; this keeps URLs and route-file ownership.)

Rationale: the warm-revisit route `loading.tsx` is caused by dynamic segments re-rendering server-side on every navigation (no Router Cache reuse). Two mechanisms together close it without a full routing rewrite:
1. **`experimental.staleTimes` (`dynamic`/`static`)** — lets the client Router Cache reuse a recently-rendered segment on Link/back-forward navigation, so a warm revisit does **not** re-suspend the server segment (no `loading.tsx`). Reversible config-only change; documented as app-wide in `DECISIONS`/state for sibling agents.
2. **`useQuery` data ownership** at the client shell (`LibraryPageClient`, `TemplatesBrowsePageClient`) seeded with `initialData` from the server fetch — preserves SSR cold first-paint, gives a 5-min `staleTime` client cache, and lets mutations update the cache instead of `router.refresh()` (T4).

**Query keys (exact, reused by T4 invalidation + T5 editor seeding):**
- Components management tab → **new distinct key** `WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY = ["workspace-component-rows-library"]`. The Components tab dataset is `ComponentRowsLibraryDataset` (rows + tree + suppliers + brands + folders, **no templates**) — a *different shape* from the editor dock's full `ComponentLibraryDataset` (with templates). Per D4 they must NOT share a key. The editor dock keeps its own `["workspace-component-library"]`.
- Templates browse tab → **new key** `WORKSPACE_ESTIMATE_TEMPLATES_QUERY_KEY = ["workspace-estimate-templates"]`, data `EstimateTemplate[]`.

**Data shape:** the client shell caches the **whole dataset object** (not item-only), so a mutation that touches folders/suppliers/brands/items updates one coherent cache entry — eliminating the stale-folders / fresh-items split the audit flagged (`ComponentLibraryManager.tsx:1106-1109` reconciled only `libraryItems`).

**Invalidation surface (T4):** every Library mutation calls `queryClient.setQueryData(<rows or templates key>, patch)` for the optimistic durable update and/or `invalidateQueries` (silent refetch) where a full reconcile is needed — **never `router.refresh()`** inside the Library managers. The client shell re-renders from cache; the manager's existing optimistic local state + rollback is preserved.

**Why stale mixed state cannot occur:** one whole-dataset cache entry per tab; managers keep their `{source, items}` reconciliation which reseeds from the (now cache-fed) props; mutations patch the same entry. The editor dock's separate key is invalidated by the editor's own `handleLibraryDataChanged` (already present) and by a shared-prefix invalidate where appropriate.

**Verification reality:** the no-warm-revisit-skeleton claim is **correct-by-construction** (staleTimes Router-Cache reuse + warm client query) and is unit-tested at the cache layer (render-from-cache without refetch). The wall-clock browser proof is a deferred manual gate (G6). If browser testing later shows a residual route `loading.tsx`, the fallback is the client-panel-tabs path (08 Q1 alternative).

---

## G3 — Folder strategy (P2 T13)

`library_folders` remains the **canonical persisted source of truth** for every item-addressable `library_folder_id` and every customized folder row (create/rename/delete/reorder live in `ComponentLibraryManager.tsx:1343-1395`; rows persist `source_category_node_id`). Any taxonomy virtualization is **view-layer only** for unchanged taxonomy nodes. T13 must classify taxonomy-backed vs user-custom rows and prove customized names/order/deletes and item-folder references survive before moving `ensureWorkspaceLibraryFolders` off the read path. Default = **hybrid** (08 Q3), not pure virtual. Gated with the rest of P2 on the prove-harness.

## G4 — Principal fixtures (P2/P3 T15/T17)

Viewer/editor/admin RLS proofs use the existing local PG17 prove-harness pattern (`scripts/prove-*-postgres.mjs`, e.g. `prove:estimate-tabs-rls`). Fixtures: one workspace, three members (viewer, editor, admin), asserting viewer **denied** and editor/admin **allowed** across component items, price options, versions, cost entries, attachments, history, templates, nodes, rows, folders. Docker is absent (project memory) → local PG17 harness, not `supabase start`.

## G5 — Per-phase rollback

- **P0 (T1–T4):** each task is its own commit; rollback = `git revert <commit>`. T1 store rollback restores immediate-show; T4 rollback restores `router.refresh()` tails + the prop-reconciliation. staleTimes rollback = remove the `experimental.staleTimes` block.
- **P1 (T5–T8):** per-task commits; editor double-fetch / cache-seed revertible independently.
- **P2 (T9–T16):** every migration is **additive / relax-only** (new index, new RPC functions, added columns + backfill, `(select auth.uid())` initplan rewrite — all non-destructive → 0 data loss). `.sql` written + locally proven; hosted apply is the final gated step with a `drop function` / forward-fix revert path recorded per migration.
- **P3 (T17–T21):** headers behind Report-Only CSP first; RLS write-splits are relax-only (add WITH CHECK); rate-limit + error sanitization are app-layer reverts.

## G6 — Browser evidence path (deferred manual gate)

A Playwright perf spec exists (`e2e/route-transition-performance.spec.ts`, `bun run test:e2e:perf`) but the workshop standard session requires the user's authenticated Chrome session (dev-auth disabled). **Autonomous unit/DOM tests + `type-check` + `build` + design-lint are the in-session proof.** The wall-clock standard-session run (overlay count, skeleton-flash count, tab-switch ms, mutation-settle) is recorded as a **deferred manual verification** the owner runs in their Chrome session; results append to `AFTER_P0.md`. This is disclosed, not silently skipped.

## G7 — Dirty-worktree boundary

This branch was forked **clean** from `main` @ `6e02e061`; `git status` shows only this plan's own commits. There are **no unrelated dirty changes** in this worktree to preserve. Concurrent agents work in sibling worktrees (`awesome-almeida-5eca3e`, `sharp-jones-bd5d63`/Teamspace); shared-symbol edits (navigation store, `next.config.ts`, repositories) are committed in small units to ease the final merge to `main` via fast-forward push.
