# 04 — Domain and Repository Plan

**Date:** 2026-06-12 · Grounding: [01_CURRENT_STATE_AUDIT.md](01_CURRENT_STATE_AUDIT.md) §7–9; schema: [03_DATABASE_MIGRATION_PLAN.md](03_DATABASE_MIGRATION_PLAN.md).
Naming boundary (applies to everything below): **user-facing copy says "tab"; new domain code says "tab"; legacy DB tables/RPCs with "sheet" names remain; compatibility comments explain why** (01 §17).

---

## 1. New domain types

Add in `src/lib/estimates/types.ts` (alongside `EstimateTreeNode` at `:134-141`) and `src/lib/domain/estimate-tree.ts` where DB-shaped:

| Type | Shape (directional) | Home |
|---|---|---|
| `EstimateTab` | `{ id, estimateId, name, sortOrder, isDefault, archivedAt: string \| null, metadata, createdAt, updatedAt }` — camelCase mirror of `estimate_tabs` | `src/lib/domain/estimate-tree.ts` (DB-shaped, next to `EstimateNode` `:3-31`) |
| `EstimateTabSummary` | `{ id, name, sortOrder, isDefault, nodeCount?, rowCount?, totalCost? }` — strip metadata for lists/strips | `src/lib/estimates/types.ts` |
| `EstimateTabTree` | `{ tab: EstimateTabSummary, tree: EstimateTreeNode[], loadLimitState? }` — what the editor renders per tab | `src/lib/estimates/types.ts` |
| `EstimateWithTabs` | `{ estimate: NormalizedEstimateRecord, tabs: EstimateTabSummary[], defaultTabId: string }` | `src/lib/estimates/types.ts` |
| `ReusableEstimateSource` | discriminated union for the templates panel: `{ kind: "custom-template", template: EstimateTemplate } \| { kind: "project", projectId, name } \| { kind: "project-estimate", projectId, estimateId, name, sheetCode } \| { kind: "project-tab", projectId, estimateId, tabId, name } \| { kind: "project-node", projectId, estimateId, tabId, nodeId, nodeKind, name }` | new `src/lib/reusable-sources/types.ts` (detail in [06_TEMPLATES_PANEL_UNIFICATION_PLAN.md](06_TEMPLATES_PANEL_UNIFICATION_PLAN.md) §3) |

Known hazard to avoid repeating: `EstimateRowItem` is already defined twice with different shapes (`src/lib/estimates/types.ts:81-132` vs `src/lib/domain/estimate-tree.ts:3-31`). New tab types get exactly one definition each; UI-shape vs DB-shape live in the files named above.

## 2. Query key redesign

Extend the existing factory `estimateQueryKeys` (`src/hooks/use-estimate-query.ts:9-12`) — do not fork a second factory:

| Key | Content | Notes |
|---|---|---|
| `["estimate", estimateId]` (`detail`) | unchanged | keep `ProjectEstimatesTable` prefetch behavior (`ProjectEstimatesTable.tsx:633-650`) |
| `["estimate", estimateId, "tabs"]` (`tabs`) | `EstimateTabSummary[]` | small payload; staleTime 5 min like the rest |
| `["estimate", estimateId, "tab", tabId, "area-tree"]` (`tabTree`) | `EstimateTreeNode[]` for one tab | replaces `areaTree`; per-tab revision slot `[..., "revision"]` mirrors `use-estimate-query.ts:34, 44-69` |
| `["estimate", estimateId, "area-tree"]` (legacy `areaTree`) | **compat alias** during Phases 2–3: resolved to the default tab's tree by the wrapper hook | deleted in cleanup (§12) |
| `["workspace-component-library"]` | unchanged | global library dataset (01 §8) |
| `["reusable-sources", "projects"]` / `["reusable-sources", "estimate", estimateId]` | project-derived source levels | lazy, short staleTime; see 06 §6 |

`useEstimateAreaTreeQuery` (`use-estimate-query.ts:21-76`) becomes `useEstimateTabTreeQuery(estimateId, tabId, initialNodes?)` with the same `setTree/snapshot/restore/getTreeRevision/prepareOptimisticUpdate` contract — the optimistic machinery is tab-agnostic once the key carries `tabId`. The `"local-estimate"` fallback quirk (`:33`) carries over as `"local-tab"`.

## 3. Repository changes (`src/lib/repositories/workspace-repository.ts` + `estimate-repository.ts`)

New server-side functions (workspace-repository, following the loader conventions at `:1590-1671`):

| Function | Behavior |
|---|---|
| `getEstimateTabs(projectId, estimateId)` | project-scope estimate (`.eq("id", estimateId).eq("project_id", project.id)` as `:1599-1604`), then `estimate_tabs` by `estimate_id` ordered `sort_order`, excluding `archived_at is not null` by default |
| `getDefaultEstimateTab(estimateId)` | `is_default = true` lookup (partial unique index guarantees one, 03 §3) |
| `getEstimateTabTree(projectId, estimateId, tabId, options)` | nodes by `.eq("estimate_tab_id", tabId)` using the new index; rows by `.in("node_id", nodeIds)` **or** keep `.eq("estimate_id", …)` + filter — choose by EXPLAIN during implementation **[D]**; same `maxNodeCount/maxRowItemCount` overflow contract as `:1614-1635` but per tab |
| `resolveEstimateTabRouteContext(projectId, routeSegment)` | the tab-aware successor of the node/estimate fallback (`:1642-1671`): node hit → `{estimate, tab: node's tab, selectedNodeId}`; estimate hit → `{estimate, tab: default, selectedNodeId: first area of default tab}`; extends `selectFirstEstimateNodeIds` (`src/lib/estimates/tree-hierarchy.ts:66-112`) to per-tab scope |

New server actions (`src/lib/estimates/actions.ts`, mirroring the existing action prologue + history-RPC pattern, e.g. `createEstimateNode` `:1684-1764`):

- `createEstimateTab`, `renameEstimateTab`, `reorderEstimateTabs`, `duplicateEstimateTab`, `archiveEstimateTab`, `deleteEstimateTab` → the new `*_estimate_tab_with_history` RPCs (03 §8). `duplicateEstimateTab` follows the `duplicateEstimateSheet` replay shape (`:1383-1497`) scoped to one tab; `deleteEstimateTab` must refuse to delete the last unarchived tab and re-point `is_default` when deleting the default (RPC-enforced).
- `fetchEstimateTabs`, `fetchEstimateTabTree` read actions for client hydration (pattern: `fetchEstimateTree` `:1076-1080`).

Tab-aware mutations:

- Node creates at **root** need an explicit `estimateTabId` (child creates derive from parent) — extend `createEstimateNode` input and the RPC (03 §8). Reorder payload validation gains a same-tab check beside `canNestEstimateNodeKind` (`actions.ts:1300-1319`).
- Row mutations (`insert/update/replace/delete/detach`) are unchanged in signature — rows resolve tab via node. `useEstimateRowMutations` (`src/hooks/use-estimate-row-mutations.ts:131`) only changes its invalidation targets: `tabTree(estimateId, tabId)` + `detail` (tabId threaded via hook param or read from the row's node in the cached tree).
- Browser-side `estimateRepository.getEstimateTree(estimateId)` (`estimate-repository.ts:148-173`) gains a `getEstimateTabTree(estimateId, tabId)` sibling; the dead `moveEstimateRowItem` direct-upsert path (`:175-186`) should be deleted in cleanup rather than made tab-aware (01 §8 dead-code findings).

## 4. Backward-compatible wrappers

- `getProjectEstimateTreeByEstimate(projectId, estimateId, options)` keeps its exact signature and return type (`LiveEstimateTreeResult`); internally it resolves the default tab and delegates to `getEstimateTabTree`. **Callers that stay untouched through Phase 2:** export route (`route.ts:46`), `fetchEstimateTree` (`actions.ts:1076`), template-insert refetch (`:1918`), AI read context, publication snapshot builder. Compatibility comment required at the wrapper site.
- `getProjectEstimateTreeByNode(projectId, nodeId)` keeps the node→estimate fallback (`:1655`) and additionally returns tab context once `resolveEstimateTabRouteContext` exists; the page migrates to the resolver in Phase 3.
- **Multi-tab caveat to encode in the wrapper:** once a caller needs *all* content (export all-tabs, snapshots), it must move off the wrapper to an explicit all-tabs loader — the wrapper returns the default tab only. Tracked per caller in [10_IMPLEMENTATION_PHASES.md](10_IMPLEMENTATION_PHASES.md) Phases 5–6.

## 5. Optimistic update strategy

Unchanged in mechanism, re-keyed per tab: caller-side tree patches with rollback closures for insert/replace/delete; in-hook patches with `operationId` guards and per-row queues for update/detach (`use-estimate-row-mutations.ts:139-268, 291-301`); revision-slot race guards (`use-estimate-query.ts:44-69`). Tab CRUD gets its own optimistic layer on the `tabs` key: create appends a temp tab (id prefix `optimistic-`, consistent with the node-id guard at `actions.ts:261-263`), rename/reorder patch in place, all with rollback on action failure — mirroring `TemplatesBrowseManager`'s optimistic rename/reorder pattern (`TemplatesBrowseManager.tsx:593-657`).

## 6. Cache invalidation strategy

- Row/node mutations: invalidate `tabTree(estimateId, activeTabId)` + `detail(estimateId)` with `refetchType: "none"` (today's discipline, `use-estimate-row-mutations.ts:144-145`).
- Tab CRUD: invalidate `tabs(estimateId)`; duplicate/delete also invalidate the affected `tabTree`s; cross-tab summaries (per-tab totals in the strip, if shown) ride the `tabs` key.
- Template/source insertion into a tab: server action returns the refreshed tab tree (today's contract, `actions.ts:1918`) → `setTree` replaces cache; no broad invalidation.
- Project-derived source panels: `["reusable-sources", …]` invalidated on demand (manual refresh affordance) — live-source staleness is displayed, not chased (06 §11).
- `revalidatePath` policy unchanged: estimate-content mutations deliberately skip revalidation (comment at `actions.ts:1760-1762`); estimate-level CRUD keeps `revalidateProjectEstimatePaths` (`:1070-1074`). Tab CRUD joins the **no-revalidate** group (client reconciles), except archive/delete which should also revalidate the estimates index route since per-estimate aggregates surface there (`listProjectEstimates`).

## 7. Event/audit strategy

- New tab RPCs write `tab_*` events; node/row history RPCs stamp `estimate_tab_id` (03 §8). `fetchEstimateSheetVersionControl` (`actions.ts:1082-1224`) gains an optional tab filter parameter; scope union extends to `{ mode: "tab"; tabId }` beside sheet/row/node (`activity-history.tsx:22-24`). Composer labels for new event types in `src/lib/activity/activity-composer.ts:75-102` + copy dictionary.
- Old events (NULL tab) render under the estimate scope exactly as today — no backfill of historical events.

## 8. Type-safety strategy

- All new tables/RPCs enter via regenerated `src/lib/supabase/types.ts` (03 §14); no hand-written `Tables<…>` shims. Domain types in §1 are the only translation layer; conversion helpers live beside `normalizeEstimateRecord` (`src/lib/repositories/estimate-schema-compat.ts:27-36`) — note that file's legacy-fallback pattern is **not** needed for `estimate_tabs` (new table, no legacy readers).
- The `ReusableEstimateSource` union must be exhaustively switched (eslint `default` guard or `never` checks) so adding a source kind breaks compilation at every consumer — same discipline as the `TemplatesTreeDatum` union consumers (`TemplatesTree.tsx:328-501`).

## 9. "Sheet"→"tab" naming migration in code

- **New code:** tab vocabulary only (`EstimateTab`, `getEstimateTabs`, `tab_created`).
- **Touched-but-kept identifiers:** `fetchEstimateSheetVersionControl`, `EstimateSheetContent`, `SheetMutationHandlers`, `sheetCode` fields, etc. stay until Phase 8 cleanup; every compat site gets a one-line comment (`// legacy "sheet" name kept for compatibility; see plan 2026-06-12 §01-17`).
- **Forbidden renames now:** anything in 01 §17 (DB names, stored event values, Excel/UI-primitive/material "sheet" meanings).

## 10. Server action changes — revalidation & failure modes

- **Estimate-node CRUD:** + tab param on root create; no other signature change. **Row CRUD:** unchanged. **Duplication:** `duplicateEstimateSheet` replays tabs first, then nodes per tab, then rows (`actions.ts:1417-1488` extension). **Restore/versioning:** dormant — no action work (03 §9). **Activity/history:** tab filter (§7).
- **Revalidation for old and new routes:** unchanged route set (`/workshop/projects/{id}`, `…/estimates`, `…/charts` — `actions.ts:1070-1074`); no new routes exist in v1 (02 §13), so no new revalidation targets.
- **Failure modes / rollback:** keep the established contracts — optimistic rollback closures; `estimate_sheet_row_revision_conflict` surfacing (`20260524050746:489-497`); non-transactional multi-RPC flows (template-node insert `actions.ts:1945-1951`, wrap-and-insert `:2118-2125`) must declare the same "mid-way failure leaves created nodes visible" contract for any new project-source insert loop, or use a single new RPC to avoid it (06 §7 prefers the single-RPC route).

## 11. Tab-aware UI state

`use-estimate-workspace-state.ts` records re-key from `…ByEstimateId` to `…ByTabId` (`:6-11`): `selectedNodeIdByTabId`, `expandedNodeIdsByTabId`, plus `activeTabIdByEstimateId` so switching estimates restores the last active tab. `resolveEstimateWorkspaceSelection` (`:61-75`) gains tab scope. The dead `src/stores/estimate-ui-store.ts` is deleted in cleanup, not extended (01 §9).

## 12. Compatibility-shim deletion criteria (Phase 8)

Two cleanup classes:

- **Immediate after Phase 7:** delete dead code with no runtime consumer (`src/stores/estimate-ui-store.ts`, dead `useEstimateQuery` / `useMoveEstimateRowItem`, browser direct-upsert row repository methods) once `rg` confirms zero imports, source-contract tests are updated, and VG passes.
- **After one beta release cycle:** delete compatibility wrappers, legacy `areaTree` aliases, route-fallback scaffolding, or rename `EstimateSheet*` symbols only when all are true: (a) no caller imports the legacy key or wrapper-only behavior of `getProjectEstimateTreeByEstimate` (grep-verified); (b) export + snapshot + AI surfaces use explicit all-tabs/active-tab loaders; (c) one completed beta release carrying Phases 1–7 has provider/manual proof archived with no estimate-tabs rollback opened; (d) characterization suites green after the rename batch (renames break source-contract tests — schedule them together, 09 §10); (e) owner/reviewer approval recorded per [14_IMPLEMENTATION_HANDOFF.md](14_IMPLEMENTATION_HANDOFF.md) §6.1 and [15_REVIEW_CHECKLIST.md](15_REVIEW_CHECKLIST.md) §8–9.

## Evidence Used

- `src/hooks/use-estimate-query.ts` (key factory, optimistic machinery, dead hooks)
- `src/hooks/use-estimate-row-mutations.ts` (mutation contracts, invalidation discipline)
- `src/hooks/use-estimate-workspace-state.ts`; `src/stores/estimate-ui-store.ts` (state boundaries, dead store)
- `src/lib/repositories/workspace-repository.ts:1590-1671` (loaders to wrap); `src/lib/repositories/estimate-repository.ts`
- `src/lib/estimates/actions.ts` (action prologue, history RPC call sites, revalidation policy, non-transactional contracts)
- `src/lib/estimates/tree-hierarchy.ts:66-112`; `src/lib/repositories/estimate-schema-compat.ts`
- `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx:593-657` (optimistic CRUD pattern to mirror)
- [03_DATABASE_MIGRATION_PLAN.md](03_DATABASE_MIGRATION_PLAN.md) §8 (RPC evolution this plan consumes)
