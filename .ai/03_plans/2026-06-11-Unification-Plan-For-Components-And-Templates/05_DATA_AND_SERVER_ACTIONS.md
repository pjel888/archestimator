# 05 — Data Layer & Server Actions

> Every fact in this document was verified against the working tree at commit `8f6f116` on 2026-06-11 (generated Supabase types in `src/lib/supabase/types.ts` + migrations, including `20260522091621` and `20260524050746`). If the tree has moved significantly, re-verify the cited lines before relying on them.

## Schema (verified — NO migrations required for ANY phase)

### Components side
- `cost_library_items` (types.ts ~932–1050): `id, name, description, category, category_node_id, library_folder_id, supplier, supplier_id, brand, brand_id, unit, unit_cost, misc_cost, pricing_source, pricing_date, confidence, thumbnail_path, lifecycle_state, lifecycle_state_changed_at, active_price_option_id, current_version_number, metadata, created_by, created_at, updated_at`. 154 visible items.
- `component_category_nodes` (685; 9 roots) · `library_folders` (with `folder_kind` taxonomy/custom, optional `category_node_id` mapping) · `component_suppliers` (22) · `component_brands` (29)
- Inspector data tables all exist in generated types: `cost_library_item_price_history`, `cost_library_item_versions`, `cost_library_item_price_options`, `cost_library_item_state_history`, `cost_library_item_variant_attachments`, `cost_library_item_variant_cost_entries`.
- RLS enabled throughout; advisor notes multiple permissive policies on `cost_library_items` — review before adding edit mutations (Phase 1.5 gate).

### Templates side — VERIFIED COLUMN LISTS

**`estimate_templates`** (types.ts ~1947–1983):
`id (uuid PK), workspace_id (uuid FK), name (text, required), description (text, default ''), category (text, default 'General'), sort_order (int, default 0), metadata (jsonb, default '{}'), created_by (uuid|null), created_at, updated_at`

**`estimate_template_nodes`** (types.ts ~1785–1818):
`id (uuid PK), template_id (uuid FK), parent_id (uuid|null self-FK), kind (estimate_node_kind: 'group'|'area'), name (text), sort_order (int, default 0), metadata (jsonb), created_at, updated_at`

**`estimate_template_row_items`** (types.ts ~1836–1908) — **richer than a pure reference table; the editor needs NO new columns**:
`id (uuid PK), template_id (uuid FK), template_node_id (uuid FK), sort_order (int, default 0), source_library_item_id (uuid|null FK → cost_library_items), source_snapshot (jsonb|null), category_node_id (text|null), supplier_id (uuid|null), material (text, default '' — the row label), description (text, default ''), supplier (text, default ''), unit (text, default 'unit'), quantity (numeric, NOT NULL, ≥0), unit_cost (numeric, NOT NULL, ≥0), misc_cost (numeric, NOT NULL, ≥0), contingency_percentage (numeric(7,4), [0,100]), discipline (text), designation (text), link_state (estimate_row_link_state enum, default 'unlinked'), metadata (jsonb), created_at, updated_at`

Indexes (migration `20260522091621`): `(template_node_id, sort_order)`, `source_library_item_id`, `category_node_id`, `supplier_id`.

**Consequences for the design:**
- Phase 3.3 inline editing (qty / unit / unit cost / misc / contingency / label-as-`material`) writes existing columns directly. Former open question Q6 (migration) is **resolved: not needed**.
- `link_state` lets the editor show linked / unlinked / detached row badges, same vocabulary as estimate rows.
- Allowance rows (typed, no library source) are simply rows with `source_library_item_id = null` — already supported.

**Hierarchy rule (server-enforced):** RPC `validate_estimate_template_tree(target_template_id)` runs from a DB trigger on every node/row mutation and enforces: groups at root, group children may be groups OR areas (nested groups are legal), and row items attach to AREA nodes only. *(Corrected 2026-06-11 during implementation: the original plan text said "areas under groups" without the nested-group allowance; the migration source is authoritative.)* The editor UI mirrors this: drop zones on invalid parents either route the drop into a valid child or do not appear.

**RLS:** `estimate_templates` gated directly by `is_workspace_member(workspace_id)`; `estimate_template_nodes` and `estimate_template_row_items` gated via EXISTS on the parent template's workspace (migration `20260522091621`).

### Client type gap (small but real)
The client `EstimateTemplate` type (`src/lib/component-library/estimate-templates.ts:3-9`) is `{id, name, description, category, nodes}` — it does NOT carry `sort_order` or `updated_at`. The Overview's "updated {date}" and recents ordering require adding `updatedAt` (and optionally `sortOrder`) to the repository mapping in `buildEstimateTemplatesFromRows()` (`component-library-repository.ts:444-502`). One-line type + mapping change; flagged in Phase 2.5 tasks.

### "Used in" counts (inspector) — feasible, verified
- Templates: count `estimate_template_row_items.source_library_item_id` (indexed).
- Estimates: `estimate_row_items.source_library_item_id` exists (types.ts ~1530, FK on delete set null). `estimate_row_items` has no `workspace_id`; scope via the estimate→project chain or accept workspace-wide counts from RLS-visible rows.

## Server fetching per route

| Route | Fetch |
|---|---|
| `/workshop/library` (Overview) | NEW `getLibraryOverview()`: counts + 6 recent items + 5 recent templates + 3 health counts (all indexed lookups) |
| `/workshop/library/components` | `getCurrentWorkspaceComponentRowsLibrary()` (`component-library-repository.ts:749`) — unchanged |
| `/workshop/library/templates` | `getCurrentWorkspaceEstimateTemplates()` (`:755`) — keep tabs' datasets separate; do NOT switch to the combined `getCurrentWorkspaceComponentLibrary()` (`:761`) |
| `/workshop/library/templates/[id]` | NEW `getEstimateTemplateById(templateId)` (verified: no single-template fetch exists today) **plus** the component dataset for the dock, loaded behind the existing dynamic-import boundary so the sheet streams first |

Notes: all three repository functions resolve workspace via `ensureDefaultWorkspace()` + `createSupabaseServerClient()`. Template list ordering is `sort_order, name` asc. `getTemplateTableFallbackTemplates()` (`:504`) returns hardcoded seed templates only when the table is missing — keep that behavior.

Client managers must be dynamically imported on every tab. Today `LibraryPageClient` uses `next/dynamic` for `ComponentLibraryManager` but `TemplatesPageClient.tsx:3` imports `TemplateLibraryManager` directly — fix during Phase 2 (Templates audit rec 9).

## Mutations

### Already exist (reuse verbatim; all paths verified)
| Action | Source |
|---|---|
| `insertEstimateTemplateIntoEstimate({projectId, estimateId, targetParentNodeId, templateId})` → RPC `insert_estimate_template_into_estimate_with_history(target_project_id, target_estimate_id, target_parent_node_id, source_template_id, acting_user_id, correlation_id)` | `src/lib/estimates/actions.ts:1895` |
| `insertEstimateTemplateNodeIntoEstimate({projectId, estimateId, targetParentNodeId, templateId, templateNodeId})` — loops history-aware node/row ops, no single RPC | `src/lib/estimates/actions.ts:1952` |
| `renameEstimateTemplate` (`:824`), `deleteEstimateTemplate` (`:846`), `createEstimateTemplateFromEstimateNode` (`:666`) | `src/lib/component-library/actions.ts` |
| Component CRUD: `createCostLibraryComponent` (`:353`), `updateCostLibraryComponent` (`:384`), `upsertCostLibraryComponentPriceOption` (`:401`), `changeCostLibraryComponentLifecycleState` (`:419`), `previewBulkArchiveLibraryComponents` (`:445`), `executeBulkArchiveLibraryComponents` (`:469`) | `src/lib/component-library/actions.ts` |
| Folder CRUD: `createLibraryFolder` (`:509`), `renameLibraryFolder` (`:552`), `deleteLibraryFolder` (`:569`), `reorderLibraryFolders` (`:584`), `moveCostLibraryComponentToFolder` (`:604`) | same file |

`updateCostLibraryComponent` already exists — the Phase 1.5 "Edit component" drawer wires to it (plus `upsertCostLibraryComponentPriceOption` for price changes); no new component mutation needed.

**Revalidation:** `component-library/actions.ts` calls `revalidatePath("/workshop/templates")` at lines 806, 841, 861 — all three must become `revalidatePath("/workshop/library/templates")` (plus the editor path where relevant) in Phase 0.

### New for Phase 2 (browse management)
- `duplicateEstimateTemplate(templateId)` — copy template + nodes + rows (all columns), `name + " copy"`, next `sort_order`.
- `moveEstimateTemplateToCategory(templateId, category, sortOrder)` — backs drag-between-groups.
- `renameTemplateCategory(workspaceId, from, to)` — bulk `category` text update.

### New for Phase 3 (template editor)
Plain mutations with `updated_at` touch (templates do not need estimate-grade history). *(Implementation note 2026-06-11: these live in `src/lib/component-library/template-editor-actions.ts`, a sibling module of `actions.ts`, to keep the editor mutation surface cohesive and avoid colliding with the Phase 2 actions added to `actions.ts` in parallel.)*
- `createEstimateTemplateNode(templateId, parentId, kind, name, sortOrder)` / `renameEstimateTemplateNode` / `deleteEstimateTemplateNode` (cascade rows) / `moveEstimateTemplateNode` (reparent + reorder; must satisfy `validate_estimate_template_tree`)
- `addEstimateTemplateRowItem(templateId, nodeId, sourceLibraryItemId, quantity, sortOrder)` — copies `material/description/supplier/unit/unit_cost/misc_cost/category_node_id/supplier_id/source_snapshot` from the library item (mirror what `createEstimateTemplateFromEstimateNode` writes); bulk variant for the dock's `Add to template`.
- `updateEstimateTemplateRowItem(rowId, patch)` — patch ⊆ {material, quantity, unit, unit_cost, misc_cost, contingency_percentage, description}; columns verified present, **no migration**.
- `removeEstimateTemplateRowItem(rowId)`, `reorderEstimateTemplateRowItems(nodeId, orderedIds)`
- `insertTemplateIntoTemplate(targetTemplateId, targetNodeId, sourceTemplateId)` — copy semantics; self-insert blocked client-side (Q4 approved → Phase 3.5)

Validation mirrors the estimate insert action: workspace membership, template-in-workspace, parent rules via `validate_estimate_template_tree`, sibling `sort_order` integrity.

## Client state & cache

- TanStack Query for the editor: add `templateQueryKeys.tree = ["template", templateId, "tree"]` mirroring `estimateQueryKeys.areaTree` (`src/hooks/use-estimate-query.ts:9-12`); optimistic add/remove/reorder with rollback toasts (same pattern as `EstimateSheetContent`).
- Zustand: new `useLibraryWorkspaceState` (selection + expanded per tab) modeled on `useEstimateWorkspaceState` (`src/hooks/use-estimate-workspace-state.ts`) — note that store is **ephemeral, memory-only** (verified: no localStorage), and the new one should match.
- localStorage panel widths: BOTH keys already exist in `src/components/workshop/side-panel-widths.ts` — `component_library_tree_width` (line ~30) and `template_library_tree_width` (line ~38). Reuse; add dock-width keys alongside them in the same file.
- Favorites/recents: `LIBRARY_FAVORITES_KEY = "archestimator_component_library_favorites_v1"`, `LIBRARY_RECENTS_KEY = "archestimator_component_library_recents_v1"` (`component-library/helpers.ts:659-660`) keep working in the dock.

## Performance gates (carried from both audits — measurement before optimization)

1. Capture authenticated baselines (desktop/tablet/mobile + trace) for the two current pages **before** Phase 1, and after each phase (Library audit P0-1/R1, R7).
2. Targets: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 at p75; search typing INP ≤200ms on 154 items.
3. Virtualization only on measured failure or a 500+ item fixture showing degradation (Library R9; Templates audit projects tree render as the first bottleneck near ~500).
4. Resolve the Templates audit's RSC-POST contradiction (tree clicks observed firing RSC requests): tab-internal interactions must be pure client state — verify zero RSC round-trips post-load in Phase 2 acceptance.
5. Bundle: measure before/after per phase; both tab managers dynamically imported; the template editor route splits the dock chunk.
