# 01 — Current-State Audit

**Date:** 2026-06-12 · **Branch:** `main` @ `4289baff` · **Mode:** docs-only planning pass (no source changes)
**Plan pack:** `.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates/` · Index: [00_INDEX.md](00_INDEX.md)

This audit was produced from the live repository (eight parallel read-only audit lanes over the estimate editor, repositories, templates domain, XLSX export, Supabase migrations, collaboration/AI surfaces, tests, and a terminology sweep). Prior plan packs under `.ai/03_plans/2026-06-11-*` were read for history only; where they conflict with live code, live code wins (stale claims flagged in §15).

---

## 1. Current estimate hierarchy

```
Workspace (workspaces)
  → Project (projects, workspace_id)
    → Estimate (estimates, project_id)          ← user-facing "Estimate Sheet"
      → Estimate tree (estimate_nodes, estimate_id, parent_id self-FK)
        → Group / Area nodes (kind ∈ {group, area})
          → Row items (estimate_row_items, estimate_id + node_id)
```

- There is **no tab dimension**. `estimate_id` fully determines one tree: every node/row read filters `.eq("estimate_id", …)` (`src/lib/repositories/estimate-repository.ts:154,159`; `src/lib/repositories/workspace-repository.ts:1611-1612, 1659-1660`).
- Hierarchy rules (`src/lib/estimates/tree-hierarchy.ts:25-28`, `canNestEstimateNodeKind`): root level is **groups only**; groups may nest groups/areas; areas are leaves for nodes and the **only row containers** (`src/lib/domain/estimate-tree.ts:38-40`, `canNodeReceiveRows`). Enforced DB-side by constraint trigger `estimate_nodes_enforce_tree` → `validate_estimate_node_tree(estimate_id)` (`supabase/migrations/20260520222038_enforce_two_kind_estimate_nodes.sql:106-129`) and `estimate_row_items_enforce_area_node` (`:131-156`).
- "Multiple sheets" today means **multiple estimates per project**, listed at `/workshop/projects/[projectId]/estimates` (`src/app/workshop/projects/[projectId]/estimates/page.tsx:10-30`, `listProjectEstimates` at `workspace-repository.ts:1314-1380`). One estimate is open at a time; there is no in-workspace switcher.
- New estimates always seed a fixed default tree: root group "Project Scope" → "General Requirements" / "Site Works" / `{project.name}` → "Ground Floor" → "Project-wide" area (`createEstimateWithDefaultTree`, `src/lib/estimates/actions.ts:962-1068`).

## 2. Current database tables and relationships

(Authoritative detail with column lists in [03_DATABASE_MIGRATION_PLAN.md](03_DATABASE_MIGRATION_PLAN.md) §1; summary here.)

| Table | Keyed by | Notes |
|---|---|---|
| `estimates` | `project_id` | `id, project_id, name, sheet_code, notes, project_budget, currency_code, metadata, created_by, created_at, updated_at` (`src/lib/supabase/types.ts:1995-2007`). `sheet_code` renamed from `revision_label` (`supabase/migrations/20260519103000_rename_estimate_revision_label_to_sheet_code.sql`). Composite unique `(id, project_id)` for collaboration FKs (`20260526142913:26-34`). |
| `estimate_nodes` | `estimate_id`, self-FK `parent_id` | `kind` CHECK in `('group','area')` (`20260520222038:5-26`); deferrable unique sort `(estimate_id, parent_id, sort_order)` incl. `nulls not distinct` root variant (`20260518090000:93`; `20260519192045:26-40`); index `(estimate_id, parent_id, sort_order)`. |
| `estimate_row_items` | `estimate_id` **and** `node_id` (denormalized) | unique `(node_id, sort_order)` deferrable; `row_revision` optimistic concurrency (`20260524033151:8-9`); `contingency_percentage` −100..100 (`20260528184224`). |
| `estimate_templates` / `estimate_template_nodes` / `estimate_template_row_items` | `workspace_id` / `template_id` | Separate persisted template graph (`20260522091621_component_library_templates.sql:4-60`); `category` is a **text column**, not a table (`:9`). |
| `estimate_sheet_access_settings` | PK `estimate_id` | `inherit_project_access boolean` (`20260526142913:53-64`). |
| `estimate_sheet_members` | PK `(estimate_id, user_id)` | role enum owner/admin/editor/viewer (`20260526142913:66-79`). |
| `estimate_sheet_events` | `estimate_id` (+ `estimate_node_id`, `target_row_id`, `workspace_id`) | append-only audit; free-text `event_type`; ≤32 KB payload (`20260524033151:11-36`). **No tab column.** |
| `estimate_sheet_versions` | `estimate_id` | jsonb `snapshot` ≤5 MB (`20260524033151:38-54`). **Dormant** (§12). |
| `project_publications` | `project_id` | frozen `snapshot_json` + `selected_estimate_ids uuid[]` + `snapshot_version` (`20260527120000:15-38`). |

Relationship invariant to protect: rows carry both `estimate_id` and `node_id`; nothing today can express "this node belongs to tab X".

## 3. Current route model (node-id route + estimate-id fallback)

- Route: `/workshop/projects/[projectId]/estimates/[nodeId]` (`src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx:10-13`).
- `page.tsx:34-37` loads `Promise.all([getProjectEstimateTreeByNode(projectId, nodeId), requireCurrentUserContext()])` and passes `projectId`, `estimateId`, `projectName`, `selectedNodeId`, `nodes`, collaboration identity, and `proposalExportMetadata` into `EstimateWorkspaceClient` (`page.tsx:66-75`). **Verified** against the prompt's seed claim, with one precision: `sheet_code`-derived metadata reaches the workspace only via `proposalExportMetadata.estimateSheetCode` (`page.tsx:58,74`); the metadata-strip payload goes to the sibling `ProjectEstimateMetadataPublisher` (`page.tsx:65`).
- **Fallback:** `getProjectEstimateTreeByNode` (`src/lib/repositories/workspace-repository.ts:1642-1671`) looks up `estimate_nodes` by id with an `estimates!inner` project-scoped join; on miss it re-interprets the same segment as an estimate id: `if (!selectedNode) return getProjectEstimateTreeByEstimate(projectId, nodeId)` (`:1655`). The URL segment therefore accepts **either** a node id or an estimate id.
- Client-side, selection updates rewrite the URL without a server round-trip via `window.history.replaceState` (`src/components/workshop/EstimateSheetTree.tsx:468-479`); a segment equal to `estimateId` means "no node selected" (`:214-226`).
- Link builders use first node id when known, else estimate id (`src/components/workshop/EstimateListCard.tsx:16-18`; `src/components/workshop/ProjectEstimatesTable.tsx:134-136`). Landing node = first **area** in depth-first order (`src/lib/estimates/tree-hierarchy.ts:66-112`, `selectFirstEstimateNodeIds`).

## 4. Current template database shape

- `estimate_templates` (workspace-scoped), `estimate_template_nodes` (same-template composite FK `(template_id, parent_id)`), `estimate_template_row_items` (same-template composite FK; unique `(template_node_id, sort_order)`), all in `supabase/migrations/20260522091621_component_library_templates.sql:4-60`; `contingency_percentage` added by `20260524050746:4-5`.
- Tree validation mirrors estimates: `validate_estimate_template_tree(uuid)` + deferrable constraint triggers (`20260522091621:77-205`).
- Insertion RPC: clients call `insert_estimate_template_into_estimate_with_history(target_project_id, target_estimate_id, target_parent_node_id, source_template_id, acting_user_id, correlation_id)` (`20260524033151:1000-1064`); the base function (`20260522091621:207-407`) enforces same-workspace source/target (`:250-252`), requires the target parent to be a **group** node (`:254-262`), remaps IDs via temp table `estimate_template_copy_map` (`:281-304`), appends roots at `max_sibling_sort_order + root_rank*10` (`:319-322`), and stamps provenance metadata `sourceTemplateId/...` (`:323-327, 362-383`). Direct execute on the base function is revoked (`20260524050746:1476`).
- RLS: all three tables FOR ALL via `is_workspace_member(workspace_id)` directly or through the parent template (`20260522091621:575-620`).

## 5. Current templates UI shape

Three surfaces share one dataset and one cache key (`["workspace-component-library"]`):

1. **Estimate-sidebar panel** — `EstimateRightSidebar` (`src/components/workshop/component-library/index.tsx:284`) with two tabs Components/Templates (`:83-88`). Templates render in `TemplatesTree` (`src/components/workshop/component-library/tree/TemplatesTree.tsx`), whose datum union is template-only (**verified**):
   `TemplatesTreeDatum = {type:"category"} | {type:"template"} | {type:"template-node"} | {type:"template-row"}` (`TemplatesTree.tsx:33-37`), rendered with the in-house `src/components/ui/tree` primitive (not react-complex-tree).
2. **Route-level browse** — `/workshop/library/templates` (`src/app/workshop/library/templates/page.tsx:12-14`) → `TemplatesBrowseManager` (left tree, `BrowseTreeDatum = {type:"all"|"category"|"template"}` at `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx:59-62`), `TemplateGallery`, `TemplatePreviewDock`, and `InsertIntoEstimatePicker` (project → estimate cascade via `listEstimateInsertTargets`, `src/lib/component-library/actions.ts:1116-1131`). **Every browsed item is typed `EstimateTemplate`** (`TemplatesBrowseManager.tsx:62, 504-506`; `TemplateGallery.tsx:153-166`; `TemplatePreviewDock.tsx:58-63`) — the prompt's seed claim is verified.
3. **Template editor** — `/workshop/library/templates/[templateId]` (`src/app/workshop/library/templates/[templateId]/page.tsx:12-20`) → `TemplateEditorClient`, which re-hosts `EstimateRightSidebar` (`TemplateEditorClient.tsx:242-259`) and reuses estimate-sheet presentational rows/drop-zones (`TemplateEditorSheet.tsx:17-19`). Mutations in `src/lib/component-library/template-editor-actions.ts` rely on the DB trigger as hierarchy backstop (`:31-36`).
- `/workshop/templates` is a permanent redirect to `/workshop/library/templates` (`src/app/workshop/templates/page.tsx:3-5`).
- Category management: free-text categories; rename = bulk text update (`renameTemplateCategory`, `src/lib/component-library/actions.ts:1084-1103`); move = `moveEstimateTemplateToCategory` (`:1057-1081`); UI label is "Group".

## 6. Current drag/drop template insertion flow

- Mime types: `ESTIMATE_TEMPLATE_DRAG_MIME_TYPE = "application/x-archestimator-estimate-template"` (`src/components/workshop/component-library/templates.ts:7`); payload union `{kind:"templates", templateIds} | {kind:"template-node", templateId, templateNodeId}` parsed by `readEstimateTemplateDragPayload` (`templates.ts:54-79`). Components use `application/x-archestimator-library-item`; tree-internal node drags use `ESTIMATE_TREE_DRAG_ITEM_DATA_TYPE` (`EstimateSheetTree.tsx:62`).
- Drop targets: `TemplateDropZone` rows (`src/components/workshop/estimate-sheet/rows/drop-zones.tsx:130-171`); left tree accepts sidebar template drags onto group rows (`tests/vitest/estimate-sheet-tree-dom.test.tsx`).
- Server paths: whole template → `insertEstimateTemplateIntoEstimate` (`src/lib/estimates/actions.ts:1895-1922`, single RPC, then full tree refetch `:1918`); template subtree → `insertEstimateTemplateNodeIntoEstimate` (`:1952-2102`, loops `create_estimate_node_with_history` + `insert_estimate_row_item_with_history`; documented non-transactional `:1945-1951`); area-target drop → `wrapEstimateAreaAndInsertTemplate` (`:2126-2207`, creates wrapper group named via `getEstimateWrapGroupName`, moves area via `reorder_estimate_nodes_with_history` `:2173`).
- Client optimistic layer in `EstimateSheetContent.tsx`: `insertTemplateIntoParent` (`:1188-1217`), `insertTemplateNodeIntoParent` (`:1306-1336`), `wrapAreaAndInsertTemplates` (`:1233-1290`); window events `archestimator:insert-estimate-template` / `archestimator:add-estimate-template` / `archestimator:create-template-from-node` bridge tree ↔ sidebar (`templates.ts:14-46`).
- "Save as template" from the estimate: `createEstimateTemplateFromEstimateNode({projectId, estimateId, sourceNodeId, …})` (`src/lib/component-library/actions.ts:672-827`) — reads a project estimate subtree server-side and remaps into template tables; provenance recorded in `metadata.savedFrom` (`:749-753`).

## 7. Current estimate tree mutation flow

- Node CRUD lives in `EstimateSheetTree` calling server actions `createEstimateNode / renameEstimateNode / deleteEstimateNode / deleteEstimateNodesBulk / reorderEstimateTreeNodes` (`EstimateSheetTree.tsx:26`). All go through SECURITY DEFINER history RPCs: `create/rename/delete_estimate_node_with_history`, `reorder_estimate_nodes_with_history` (`src/lib/estimates/actions.ts:1738, 1777, 1802, 1333`).
- Row mutations in `useEstimateRowMutations` (`src/hooks/use-estimate-row-mutations.ts:131`): insert/replace/delete with caller-side optimistic tree patches + rollback closures; `updateRow`/`detachRow` patch in-hook with per-row `operationId` guards and per-row promise queues (`:220-268, 291-301`). Server actions call `insert/update/replace/delete_estimate_row_item_with_history` and `unlink_estimate_row_item_from_library_with_history` with `expected_row_revision`, `acting_user_id`, `correlation_id` (`actions.ts:2243, 2284, 2304, 2365, 2346`).
- App-side nesting validation duplicates the DB rule before reorder (`actions.ts:1300-1319`). `reorder_estimate_nodes_with_history` takes **no project id** — only `target_estimate_id` + `move_updates` (`src/lib/supabase/types.ts:3185-3193`).
- Permission gate asymmetry: only `detachEstimateRowItemFromLibrary` calls `assertCanEditEstimate` → RPC `can_edit_estimate` app-side (`actions.ts:333-337, 2343`); other mutations rely on the history RPCs' own `resolve_estimate_workspace` check, which verifies **workspace membership**, not `can_edit_estimate` (`20260524033151:77-122`; see [08_ACCESS_SECURITY_RLS_PLAN.md](08_ACCESS_SECURITY_RLS_PLAN.md) §2).

## 8. Current query keys and cache boundaries

Factory `estimateQueryKeys` (`src/hooks/use-estimate-query.ts:9-12`):

| Key | Loads | Config |
|---|---|---|
| `["estimate", estimateId]` (`detail`) | browser-side `estimateRepository.getEstimateTree` | populated only by `ProjectEstimatesTable` prefetch (`ProjectEstimatesTable.tsx:633-650`), invalidated by every row mutation |
| `["estimate", estimateId, "area-tree"]` (`areaTree`) | server action `fetchEstimateTree` → `getProjectEstimateTreeByEstimate` (`actions.ts:1076-1080`) | `initialData` from route props, `staleTime: 5min` (`use-estimate-query.ts:35-42`); falls back to literal `"local-estimate"` when estimateId undefined (`:33`) |
| `["estimate", estimateId, "area-tree", "revision"]` | raw cache slot — monotonic counter guarding optimistic rollbacks (`use-estimate-query.ts:34, 44-69`) |
| `["workspace-component-library"]` | `loadCurrentWorkspaceComponentLibrary` server action | **global, not estimate-keyed**; lazy-enabled (`EstimateSheetContent.tsx:691-696`) |

- Global QueryClient defaults: `staleTime`/`gcTime` 5 min, `refetchOnWindowFocus: false`, `retry: 1` (`src/app/providers.tsx:13-27`).
- Row mutations invalidate `areaTree` + `detail` with `refetchType: "none"` (`use-estimate-row-mutations.ts:144-145, 205-216, 254-266`).
- Dead code worth noting: `useEstimateQuery` and `useMoveEstimateRowItem` (`use-estimate-query.ts:14-19, 78-95`) have zero consumers; `estimateRepository.moveEstimateRowItem` bypasses history RPCs (`estimate-repository.ts:175-186`) and is currently unreachable.

## 9. Current client state boundaries

- **Selection/expansion (estimateId-keyed zustand):** `use-estimate-workspace-state.ts` — `selectedNodeIdByEstimateId`, `expandedNodeIdsByEstimateId` records (`:6-11`); `useEstimateWorkspaceSelection(estimateId, routeSelectedNodeId)` syncs route prop into the store (`:77-98`); `resolveEstimateWorkspaceSelection` falls back to first node (`:61-75`).
- **`src/stores/estimate-ui-store.ts` is dead code** — global/unkeyed selection/drag fields with zero importers anywhere (verified by grep). Real drag state travels through DOM `dataTransfer` mimes instead.
- **Local React state:** tree panel rename/delete/bulk/search state (`EstimateSheetTree.tsx:256-267`); sheet-side `collapsedNodeIds` (independent of the tree store), `bulkSelectedRowIds`, proposal preview, activity inspector, `sheetSearchQuery` (`EstimateSheetContent.tsx:660-740`).
- **Sidebar/templates panel:** all local `useState` — `activeTab: "components"|"templates"`, `templateList`, `templatesExpandedIds`; prefs persisted to localStorage `LIBRARY_PREFS_KEY` (+ legacy `estimate_library_active_tab`) (`component-library/index.tsx:320-331, 406-408`). Not keyed by estimate.
- **Panel width:** localStorage + cookie key `estimate_sheet_tree_width` (`EstimateSheetTree.tsx:1267-1274`; `src/components/workshop/side-panel-widths.ts:14`).
- **A latent tab affordance already exists:** the tree panel header is wired for tabs with exactly one hardcoded entry `ESTIMATE_TREE_TABS = [{ id: "sheets", label: "Sheets" }]` (`EstimateSheetTree.tsx:63`, passed at `:1303-1305`).

## 10. Current XLSX export route and workbook structure

- Route `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`: `nodejs` runtime, `force-dynamic` (`:9-10`); loads via `getProjectEstimateTreeByEstimate(projectId, estimateId, { maxNodeCount: 1200, maxRowItemCount: 3000 })` (`:12-13, 46-49`); 404 on missing project/estimate (`:51-53`); **413** on load-limit overflow (`:55-66`); no explicit auth call — auth inherited through `requireCurrentUserContext` inside the loader chain plus RLS (`src/lib/auth/session.ts:87-91`); `src/proxy.ts:56` skips `/api` in middleware. Response is fully buffered with `Cache-Control: private, no-store` (`:32-42`).
- Filename: `buildProposalWorkbookFilename(project_code||name, sheet_code||name)` → `{slug}-{slug}-proposal.xlsx`, NFKD-sanitized, no length cap (`…/export/proposal.xlsx/filename.ts:1-14`; used at `route.ts:84`).
- Workbook (`src/lib/proposal-export/create-proposal-workbook.ts:383-401`) — four **static literal** worksheets in order: `"Bid Form"` (`:174`), `"Summary"` (`:265`), `"Commercial Terms"` (`:316`), `"Source Breakdown"` (`:347`, gated by `includeSourceBreakdownSheet`). **No sanitization/truncation/dedup of worksheet names exists anywhere** (verified by grep).
- Model: `buildProposalExportModel` flattens **area** rows only (`build-proposal-export-model.ts:257-286`), consolidates identical items **across areas** by a JSON key (`:288-344`), aggregates per-section summary rows and totals (`:187-236`).
- Formulas: per-row `E{n}+F{n}` and `IF(OR(I{n}=…),0,D{n}*G{n}+{constants})` with contingency/misc baked in as numeric constants (`create-proposal-workbook.ts:107-110, 210-230`); section subtotals `SUM(H{a}:H{b})` (`:246`); the **only cross-worksheet formula** is Summary's `'Bid Form'!H{subtotalRow}` (`:283`); Summary fixed block at A27–B32 (`:290-302`, collides beyond ~12 sections). No named ranges, no hidden sheets.
- Preview parity: the same `buildProposalExportModel` runs client-side over the live edited tree (`EstimateSheetContent.tsx:977-987`), rendered by `ProposalExportPreviewDialog` with a staleness signature (`:191-221, 722-725`). Version label logic is **duplicated** between page and route with a subtle case difference (`page.tsx:15-25` vs `route.ts:19-30`).
- Hosted verification: `scripts/verify-hosted-export-route.ts` checks status/MIME/disposition/ZIP magic/size/cache headers against an HTTPS allowlist; it never inspects worksheet names or rows.

## 11. Current collaboration/access assumptions

- Access model: workspace role ∪ project role ∪ sheet (= estimate) role. Helper chain `can_access_project` → `can_access_estimate` / `can_edit_estimate` with `estimate_inherits_project_access` defaulting true (`20260526142913:218-410`). Estimate-level overrides live in `estimate_sheet_access_settings` + `estimate_sheet_members`.
- App-side rank math mirrors this (`src/lib/collaboration/actions.ts:45-52, 119-193`); member/invite mutations run through manager asserts then a **service-role admin client** (`:80-98`) — RLS is not the enforcement path for those writes.
- Member UI: `ProjectTeamspaceHeader` (invite per sheet, inherit/restrict select, role baseline copy) (`src/components/workshop/ProjectTeamspaceHeader.tsx:311-597`).
- Presence: project channel `project:{projectId}` with `activeEstimateId` in payload (`src/hooks/use-project-presence.ts:8-83`). Cursors: estimate channel `estimate:{estimateId}`, payload `{x, y, rowId, columnId}` relative to one pointer surface (`src/hooks/use-estimate-cursor-broadcast.ts:7-19, 78-80`; layer at `EstimateSheetContent.tsx:536-586`). **Two users on different future tabs would share one channel and one coordinate space** — ghost-cursor risk.
- The access boundary is the estimate. Nothing references sub-estimate scopes; tab-level access does not exist and is not implied anywhere.

## 12. Current versioning/audit event assumptions

- **Active:** append-only `estimate_sheet_events` written exclusively by `*_with_history` SECURITY DEFINER RPCs (no app-side inserts). Event types observed in migrations/composer: `row_added, row_blank_added, row_updated, row_replaced, row_deleted, row_unlinked, node_created, node_renamed, node_deleted_with_children, tree_reordered, template_inserted, sheet_code_updated, sheet_metadata_updated` (`src/lib/activity/activity-composer.ts:75-102`). Read path: `fetchEstimateSheetVersionControl` with sheet/row/node-with-descendants scopes and cursor pagination (`src/lib/estimates/actions.ts:1082-1224`); rendered by `ActivityHistoryModal` (`src/components/workshop/estimate-sheet/activity-history.tsx`).
- **Dormant:** named versions. `estimate_sheet_versions`, `estimate_sheet_snapshot(target_estimate_id)`, `create_estimate_sheet_version`, `restore_estimate_sheet_version_as_copy` exist in SQL and generated types (`src/lib/supabase/types.ts:3072-3093`) but have **zero TypeScript call sites** (verified repo-wide). The activity feed actively filters out `sheet_version_created` / `sheet_restored_as_copy` (`actions.ts:430-445`). This **refutes** the prompt's seed phrasing that app code "currently calls" these RPCs — only `reorder_estimate_nodes_with_history` is live (`actions.ts:1333, 2173`). Consequence for planning: snapshot/version RPCs must be *updated or explicitly version-bumped* for tabs before that feature is ever awakened, but no application behavior depends on them today.
- `estimate_sheet_snapshot` v2 shape: `{schemaVersion:'2026-05-24.v2', estimate, nodes[], rows[], summary}` (`20260524050746:131-180`) — has no tab concept.

## 13. Current shared-link/publication snapshot assumptions

- Publishing **copies** data: `buildSnapshotForProject` reads `estimates` (optionally filtered to `selected_estimate_ids`), `estimate_nodes`, `estimate_row_items` via admin client (`src/lib/publication/actions.ts:342-437`); `buildProjectPublicationSnapshot` emits a fully denormalized JSON (`schemaVersion: 1`, per-estimate `treeNodes` added "v1.1") (`src/lib/publication/snapshot.ts:118-187`; types `src/lib/publication/types.ts:62-95`). Share pages render only the frozen snapshot — never live tables.
- The share page **already renders estimates as tabs**: `SharePageTabs` tablist `aria-label="Estimate sheets"` (`src/components/share/SharePageTabs.tsx:245`); `ShareEstimateTreePanel` has a "Sheets" tab (`:402-404`); tree reconstruction prefers snapshot `treeNodes` with designation/discipline fallback (`src/lib/share/reconstruct-share-tree.ts:81-338`).
- Staleness warning compares `estimates.updated_at` vs `snapshot.generatedAt` (`workspace-repository.ts:1282-1311`). Comments/responses anchor to `estimateId`/`rowId` with snapshot-version locking RPCs (`20260603210653`, `20260603214151`).
- Tab impact: `buildSnapshotTreeNodes` assumes parentless nodes are roots (`snapshot.ts:118-144`); introducing tabs requires a snapshot schema bump (v1.2) carrying tab grouping; **old snapshots remain valid** because data is copied.

## 14. Current AI / Ask Flip / package-builder surfaces

- Entry: `AskFlipFooterAssistant` parses the estimate URL with a regex that assigns the second segment to `selectedNodeId` (`src/components/workshop/EstimateCopilotFloatingButton.tsx:165-172`) — **any new route segment shape breaks this regex**.
- Read context resolves node → estimate via `estimate_nodes.estimate_id` (`src/lib/ai/read-context.ts:895-905, 1764-1768`), loads nodes/rows by `estimate_id` with caps (`:1799-1826`), reads `estimate_sheet_events` (`:934-942`), and uses sheet vocabulary in labels/prompts ("Sheet code updated", "Estimate sheet") (`:463-464, 786, 807`; `src/app/api/ai/ask/handler.ts:83`).
- AI audit tables `ai_data_access_events` carry `target_project_id/estimate_id/node_id/row_id` — **no tab column** (`src/lib/ai/audit.ts:11-23, 253-287`).
- Package builder applies writes through the same `*_with_history` RPCs (`src/lib/ai/package-builder/apply.ts:1010-1179`) so AI writes share the audit trail; draft targeting uses the hardcoded root alias `"existing-estimate-root"` and assumes a single-root-per-estimate tree (`draft.ts:313-359`).
- Intent regexes match the user-typed word "sheet" (`EstimateCopilotFloatingButton.tsx:103-145`; `draft.ts:128-179`) — after the rebrand these should match "tab" **in addition to** "sheet", not instead.

## 15. Current tests touching these areas

Full inventory in [09_TEST_AND_VALIDATION_PLAN.md](09_TEST_AND_VALIDATION_PLAN.md) §1–2. Headlines:

- Layout: `tests/unit/` (3 files, bun), `tests/vitest/` (228 files, jsdom, serial `--maxWorkers=1`), `e2e/` (15 Playwright specs, most env-flag-gated). Conventions: `vi.hoisted` server-action mocks, deferred-promise optimistic races, chainable Supabase query fakes, and **84/228 vitest files are source-text contract tests** (readFileSync + literal string asserts) — renames break them even when behavior is preserved.
- Estimate tree/sheet characterization family ("137/137" gate from the 2026-06-11 extraction): `estimate-sheet-cost-inputs`, `estimate-sheet-library-insert`, `estimate-sheet-tree-dnd`, `estimate-sheet-tree-dom`, `estimate-tree-context-menu`, `estimate-template-drop-zones`, `estimate-sheet-version-control-ui`, `tests/vitest/perf/*` (perf suites assert **zero re-renders** of non-edited tables — a new tab container/provider around the sheet can trip them).
- Export tests pin worksheet names/order and exact cell formulas (`tests/vitest/proposal-workbook.test.ts:92-97, 134, 193`; `proposal-export-route-workbook.test.ts:123-128`); e2e scrapes workbook rows (`e2e/workshop-project-specific-unlink-smoke.spec.ts:315-332`).
- RLS proof pattern without Docker: ephemeral Homebrew Postgres 16 cluster applying real migration files (`scripts/prove-notification-rls-postgres.mjs`; `package.json` script `prove:notification-rls`) — the canonical local DB-proof channel for this repo (hosted SQL is approval-gated).
- **`bun run validate` is not currently clean**: documented pre-existing failures at base `8f6f116` (21 vitest DOM, 1 bun unit — `tests/unit/reset-baseline.test.ts:54` re-verified failing live, 3 ESLint errors) per `.ai/10_state/current-state.md:60-68`. Implementation phases must baseline against these, not assume green.
- Prior plan packs: the 2026-06-11 unification pack's claims verified against live code (templates browse = Phase 2 shipped; zero migrations needed — still true). The 2026-06-11 Templates-Page-UX-UI-Audit is **stale as description**: it audited `TemplateLibraryManager`, which no longer exists in `src/`; its insertion-handoff gap is resolved by `InsertIntoEstimatePicker`.

## 16. Terminology debt — where "sheet" appears

Full sweep in the buckets below (counts: `src/` 1,289 matches / 114 files; `tests/` 1,267 / 87; `supabase/` ~418 / 23; `e2e/` 33 / 9; ~2,610 matches in 233 files overall).

**A. User-facing copy (must flip to "tab"/"estimate" vocabulary — exhaustive list lives in [05_ESTIMATE_TABS_UI_UX_PLAN.md](05_ESTIMATE_TABS_UI_UX_PLAN.md) §10; representative anchors):**
- Estimates list: "Create Estimate Sheet", "No estimate sheets yet", "Search Estimate Sheets" (`src/components/workshop/ProjectEstimatesClient.tsx:37-111`); table headers "Sheet Code"/"Estimate Sheet Name", typed deletion phrase **`DELETE SHEET` / `DELETE n SHEETS`** (`src/components/workshop/ProjectEstimatesTable.tsx:545-986`, paired server tokens at `src/lib/mass-deletion/bulk-action.ts:76,82` — must flip atomically).
- Editor: "Sheet controls/tools/search", "Main estimate sheet", tree tab "Sheets", "Loading estimate sheet", "Estimate sheet name" (`EstimateSheetContent.tsx:459-470, 1610`; `EstimateSheetTree.tsx:63`; `EstimateWorkspaceClient.tsx:98,109`; `ProjectEstimateMetadataStrip.tsx:195-209`).
- Activity: "Sheet code updated", "Sheets" tab, "No sheet activity yet", "Audit trail · {code}" (`activity-history.tsx:59-63, 190-191, 1313-1314, 1583`).
- Collaboration: "Estimate sheet access", "Sheets inherit project roles…", "Only sheet owners and admins…", "Sheet invite email sent.", "Open sheet", "Sheet-only" (`ProjectTeamspaceHeader.tsx:353-666`; `src/lib/collaboration/actions.ts:196-1031`; `LiveProjectCard.tsx:70-296`; `src/app/invite/[token]/page.tsx:152`).
- Publication/share: "Estimate sheets to include", tablist "Estimate sheets", OG description "`n` estimate sheets • …" (`ProjectPublicationHeader.tsx:401-694`; `SharePageTabs.tsx:245`; `src/app/share/[token]/page.tsx:252`).
- Server copy that persists into data: default estimate name `` `${sheetCode} Estimate Sheet` `` (`src/lib/estimates/actions.ts:1374`) — existing rows already contain the word "Sheet".
- Marketing/landing "sheet" product nouns (`src/app/features/page.tsx`, `src/app/pricing/page.tsx`, `src/components/landing/FeaturesSection.tsx`, etc.) — separate copy decision; "spreadsheet" mentions are not rebrand targets.

**B. Routes/API/keys:** no route segment contains "sheet"; localStorage `estimate_sheet_tree_width`; DOM ids/data-attrs (`estimate-sheet-center-column`, `data-template-editor-sheet`, …); invite redirect param value `targetLabel=Open sheet` (`src/app/invite/[token]/accept/route.ts:65`).

**C. Code identifiers (rename later, not first):** `EstimateSheetContent/Tree/Branch/Header/CursorLayer`, `SheetMutationHandlers`, `fetchEstimateSheetVersionControl`, `createEstimateSheetDraft`, `duplicateEstimateSheet`, `sheetCode` (113 occurrences), discriminator string values (`mode:"sheet"`, `kind:"sheet"`, accessKind `"sheet-member"`, tab id `"sheets"`), 14 `estimate-sheet-*` test filenames.

**D. Database/internal (see "do not rename yet"):** tables `estimate_sheet_events/versions/members/access_settings`; column `estimates.sheet_code`; RPCs `estimate_sheet_snapshot`, `create_estimate_sheet_version`, `restore_estimate_sheet_version_as_copy`, `preview/execute_bulk_delete_estimate_sheets`, `get_estimate_sheet_version_control_preflight`; **stored event-type values** `sheet_code_updated`, `sheet_metadata_updated`, `sheet_version_created`, `sheet_restored_as_copy` (renaming would require a data migration).

**E. Excel-legitimate "sheet" (never rebrand):** all of `src/lib/proposal-export/` (ExcelJS worksheets, `includeSourceBreakdownSheet`), MIME literal `…spreadsheetml.sheet`, `workbook.eachSheet` in e2e, plus two non-Excel do-not-touch families: the `Sheet` overlay UI primitive (`src/components/ui/overlays/sheet-drawer.tsx`) and construction-material copy ("sheet vinyl", "Sheet Membranes", unit "sheet" in `src/lib/component-library/unit-options.ts:45,142`).

## 17. "Do not rename yet" — compatibility names that stay stable in the first implementation

| Name | Why it stays |
|---|---|
| Tables `estimate_sheet_events`, `estimate_sheet_versions`, `estimate_sheet_members`, `estimate_sheet_access_settings` | RLS policies, FK names, indexes, generated types, 84 source-contract tests, and e2e DB reads reference them; renaming is a high-risk migration with zero user-facing value. |
| Column `estimates.sheet_code` + legacy `revision_label` compat (`src/lib/repositories/estimate-schema-compat.ts:27-36`; `insertEstimateWithSheetCodeFallback`, `actions.ts:761-801`) | It identifies the **estimate** (ES-001), not a tab; only its UI label changes (see 05 §10). |
| All `*_with_history` RPC names and `estimate_sheet_snapshot` / `create_estimate_sheet_version` / `restore_estimate_sheet_version_as_copy` | SECURITY DEFINER grant surface; shared by human UI and AI apply; dormant version RPCs only need tab-awareness notes, not renames. |
| Stored `event_type` values `sheet_*` | Persisted rows in user data; renaming requires a backfill migration for zero benefit — activity labels are mapped in `activity-composer.ts` instead. |
| Component/file names `EstimateSheet*`, `estimate-sheet/` directory, `SheetMutationHandlers`, test filenames | Protected by the 137/137 characterization gate and source-contract tests; rename in a later cleanup phase only (Phase 8 of [10_IMPLEMENTATION_PHASES.md](10_IMPLEMENTATION_PHASES.md)). |
| Mass-deletion confirm tokens `SHEET`/`SHEETS` (`src/lib/mass-deletion/bulk-action.ts:76,82`) | Flip only together with the client phrase in `ProjectEstimatesTable.tsx:684` in the rebrand phase (atomic pair), not before. |
| localStorage keys (`estimate_sheet_tree_width`, `estimate_library_active_tab`) and DOM data-attrs | Persisted user prefs / e2e seams; migrate or alias only during cleanup. |
| `Sheet` overlay primitive, ExcelJS vocabulary, construction-material strings | Different meanings of "sheet"; excluded from every mechanical rename. |

## Evidence Used

- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx` (route load, props, metadata)
- `src/lib/repositories/workspace-repository.ts` (`getProjectEstimateTreeByEstimate` :1590, `getProjectEstimateTreeByNode` :1642, `buildEstimateTree` :1544, collaboration readers)
- `src/lib/repositories/estimate-repository.ts`; `src/hooks/use-estimate-query.ts`; `src/hooks/use-estimate-row-mutations.ts`; `src/hooks/use-estimate-workspace-state.ts`; `src/stores/estimate-ui-store.ts`
- `src/lib/estimates/actions.ts` (action + RPC inventory); `src/lib/estimates/tree-hierarchy.ts`; `src/lib/domain/estimate-tree.ts`
- `src/components/workshop/EstimateSheetTree.tsx`, `EstimateSheetContent.tsx`, `component-library/index.tsx`, `component-library/tree/TemplatesTree.tsx`, `library/templates-browse/*`
- `src/lib/component-library/actions.ts`, `estimate-templates.ts`, `template-editor-actions.ts`; `src/lib/repositories/component-library-repository.ts`
- `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` + `filename.ts`; `src/lib/proposal-export/*`; `scripts/verify-hosted-export-route.ts`
- `supabase/migrations/20260518090000`, `20260520222038`, `20260522091621`, `20260524033151`, `20260524050746`, `20260526142913`, `20260527120000`, `20260528220000`, `20260601184343`, `20260602090000`, `20260611031500`
- `src/lib/collaboration/actions.ts`; `src/lib/publication/{actions,snapshot,types}.ts`; `src/components/share/SharePageTabs.tsx`; `src/lib/ai/{read-context,audit}.ts`; `src/lib/ai/package-builder/{draft,apply}.ts`
- `tests/unit/`, `tests/vitest/` (incl. proposal/export/estimate-sheet suites), `e2e/`; `package.json`; `scripts/enforce-app-design-system.mjs`; `scripts/prove-notification-rls-postgres.mjs`
- `.ai/10_state/current-state.md`, `.ai/10_state/decisions.md`, `.ai/00_system/VALIDATION_MATRIX.md:165-179` (types-regeneration command)
