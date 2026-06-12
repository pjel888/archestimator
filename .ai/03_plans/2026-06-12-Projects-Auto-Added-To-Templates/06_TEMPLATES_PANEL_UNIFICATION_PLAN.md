# 06 — Templates Panel Unification Plan

**Date:** 2026-06-12 · Grounding: [01_CURRENT_STATE_AUDIT.md](01_CURRENT_STATE_AUDIT.md) §4–6; architecture: [02_TARGET_ARCHITECTURE.md](02_TARGET_ARCHITECTURE.md) §2, §4.
**Critical principle honored throughout:** project-derived sources are **virtual/read-through** — nothing is copied into `estimate_templates*` unless the user explicitly saves a template. Unification happens at the UI + insertion layer, not the storage layer.

---

## 1. Current templates UI audit (summary)

Three surfaces, one dataset (`["workspace-component-library"]`), template-only types everywhere:
- Sidebar panel `EstimateRightSidebar` → `TemplatesTree` with union `{category|template|template-node|template-row}` (`src/components/workshop/component-library/tree/TemplatesTree.tsx:33-37`).
- Browse route `TemplatesBrowseManager` (+Gallery/PreviewDock/InsertIntoEstimatePicker) with union `{all|category|template}` (`TemplatesBrowseManager.tsx:59-62`); every item typed `EstimateTemplate` (verified, 01 §5).
- Template editor re-hosting the sidebar (`TemplateEditorClient.tsx:242-259`).
Drag payloads: `application/x-archestimator-estimate-template` with `{templateId}` / `{templateId, templateNodeId}` / `{templateIds}` (`templates.ts:7, 54-79`). Insertion: single RPC for whole templates; RPC loop for subtrees; wrap-group flow for area targets (01 §6).

## 2. New unified source model

One concept — **Reusable source** — two providers:
- **Custom Templates** (persisted, workspace-scoped, full management).
- **Projects** (virtual, live, read-only management — browse/preview/insert/save-as-template only). This section defaults to all readable projects in the current workspace because cross-project reuse is the point of the feature.

Both share: tree presentation, search, preview dock, drag payload envelope, insertion targeting rules (groups receive subtrees; areas trigger wrap-group), bulk selection, keyboard insertion.

## 3. Discriminated union design

Extend, don't replace, the existing daums. New types in `src/lib/reusable-sources/types.ts` ([04](04_DOMAIN_AND_REPOSITORY_PLAN.md) §1):

```ts
// directional guidance, not final code
type ReusableSourceDatum =
  | { type: "section"; section: "custom-templates" | "projects" }
  | { type: "category"; category: string }                                   // existing
  | { type: "template"; template: EstimateTemplate }                          // existing
  | { type: "template-node"; template: EstimateTemplate; node: EstimateTreeNode }   // existing
  | { type: "template-row"; template: EstimateTemplate; item: EstimateRowItem }     // existing
  | { type: "project"; projectId: string; name: string }
  | { type: "project-estimate"; projectId: string; estimateId: string; name: string; sheetCode: string }
  | { type: "project-tab"; projectId: string; estimateId: string; tabId: string; name: string }
  | { type: "project-node"; projectId: string; estimateId: string; tabId: string;
      nodeId: string; nodeKind: "group" | "area"; name: string };
```

`TemplatesTree` keeps its four template variants; the unified tree wraps them under the `section` nodes. Project-row items are **not** individually exposed in v1 (insertable units are whole tab / group / area — row-level granularity already exists via components in the Components tab). Exhaustive-switch discipline per [04](04_DOMAIN_AND_REPOSITORY_PLAN.md) §8.

## 4. Left navigation tree (recommended structure — the prompt's proposed shape, adopted)

```
Reusable
  Custom Templates
    {Category ("Group")}
      {Template}
        {Template nodes/rows}            ← existing TemplatesTree behavior
  Projects
    {Project Name}
      {Estimate Name (Estimate code)}
        {Tab Name}
          Whole tab                       ← inserts all root groups of the tab
          {Group / Area nodes}            ← subtree sources
```

- Current project/estimate floats to the top of `Projects` ("This estimate" affinity) since the sidebar already receives `projectId`/`estimateId` props (`component-library/index.tsx:229-230`).
- Single-tab estimates collapse the tab level visually (children render directly under the estimate) to avoid a one-child level — datum still carries `tabId`.
- Row-id scheme extends the existing conventions (`templatesTreeCategoryId`, `template-{id}::node-{nid}` — `TemplatesTree.tsx:39-49`) with `source-project-{id}`, `source-estimate-{id}`, `source-tab-{id}`, `source-node-{id}`.

## 5. Search and filtering

- **Search:** one query box (existing panel search) fans out across both sections. Custom templates: existing `templateMatchesQuery` incl. row content (`templates.ts:81-99`). Project sources: server-backed search action `searchReusableProjectSources(query)` using the `searchLibraryOverview` ilike pattern (`src/lib/component-library/actions.ts:1239-1286`) over accessible projects/estimates/tabs/node names — results render as flattened hits under each section with "Reveal in tree". Client-only filtering of already-expanded levels happens instantly; server search debounces ≥250 ms.
- **Filtering:** section toggle chips (`All · Templates · Projects`). Within Projects, show all readable workspace projects by default in both the estimate-editor right sidebar and the route-level browse view. Provide a secondary "Current project only" filter as an optional narrowing control, default OFF. Preserve scannability with search, collapsed project groups, recent/favorite project affordances, and clear current-project labeling rather than hiding other projects.

## 6. Preview, staleness, and "live source" metadata

- Preview dock reuses `TemplatePreviewDock`'s structure-outline + totals layout (`TemplatePreviewDock.tsx:24-56, 134-139`). For project sources the dock shows: **project, estimate (code), tab, node path, last updated (`estimates.updated_at`), row count, total cost** — all fields the prompt asks to evaluate: adopt them all; counts/totals come from the per-estimate aggregate pattern (`listProjectEstimates`, `workspace-repository.ts:1351-1377`) scoped to the tab/subtree.
- **Live-source representation (no copying):** a "Live" chip + "as of {relative time}" caption from query `dataUpdatedAt`; a refresh icon invalidates `["reusable-sources", "estimate", estimateId]`. Stale-while-revalidate budget: list/outline queries use `staleTime: 60_000`, no polling, and one manual refresh affordance per panel. Tighten only with performance evidence; do not lengthen beyond 60s without product approval because these are live project sources.
- Stale-data hazard at insert time is solved server-side: the insert action re-reads the source at execution (§7), so a stale preview can never insert stale-beyond-now data.

## 7. Drag/drop payloads and insertion

- **New mime:** `application/x-archestimator-project-source` with payload `{ kind: "project-tab" | "project-node", projectId, estimateId, tabId, nodeId? }`, parsed by a `readProjectSourceDragPayload` sibling of `readEstimateTemplateDragPayload` (`templates.ts:58-79`). Existing template mime/payloads unchanged. Drop zones (`drop-zones.tsx:130-171`) and the tree's external-drop router (`tree-external-drop` handling) accept the new mime alongside the template mime.
- **Insertion server path (one new RPC, preferred):** `insert_estimate_subtree_into_estimate_with_history(target_project_id, target_estimate_id, target_parent_node_id, source_estimate_id, source_node_id | source_tab_id, acting_user_id, correlation_id)` — an estimate→estimate sibling of the template-insert RPC (`20260522091621:207-407`): same temp-table ID remap, sibling-sort append, metadata provenance stamp (`sourceEstimateId/sourceTabId/sourceNodeId` instead of `sourceTemplateId`), tree validation, single transaction. A single RPC avoids the non-transactional contract the template-node loop carries (`actions.ts:1945-1951`). Whole-tab insert = iterate the tab's root groups inside the same RPC. Server action wrapper: `insertProjectSourceIntoEstimate` mirroring `insertEstimateTemplateIntoEstimate` (`actions.ts:1895-1922`) including the area-target wrap-group flow (`:2126-2207`).
- **Permission gates (required rule):** the RPC is `SECURITY DEFINER` with explicit checks in this order: `can_access_estimate(source_estimate_id)`, `can_edit_estimate(target_estimate_id)`, source/target same workspace, valid target parent, and post-copy tree validation. This matches [08_ACCESS_SECURITY_RLS_PLAN.md](08_ACCESS_SECURITY_RLS_PLAN.md) §5 and avoids relying on owner-bypass side effects. The action also calls `assertCanEditEstimate` app-side (existing helper, `actions.ts:333-337`).
- Cross-workspace insertion is rejected exactly as templates do (`20260522091621:250-252` precedent).

## 8. Read path and permission-safe browsing (required rule)

Traced access logic (01 §11): `listCurrentWorkspaceProjects` already computes per-project access kinds including `sheet-member` via RLS-scoped reads (`workspace-repository.ts:701-830`); `listEstimateInsertTargets` enumerates projects + estimates as the user (`actions.ts:1116-1131`, excludes `pending-invite` at `:1119`); estimate/node/row tables enforce `can_access_estimate` RLS (`20260526142913:726-754`).

New read actions (all RLS-scoped user clients — **never** the admin client):
- `listReusableProjectSources()` → projects + estimates (reuse `listEstimateInsertTargets` internals).
- `getReusableEstimateOutline(estimateId)` → tabs + top-level groups/areas with counts (new repository read over `estimate_tabs` + `estimate_nodes`).
Because every query runs under RLS, a user can never see a project/estimate/tab they cannot read; pending-invite projects stay excluded. Cross-workspace denial and cross-project allowed-copy scenarios are both test-mandated: readable Project B/C sources in the same workspace must appear and insert into Project A when the user can edit Project A; unreadable or cross-workspace sources must not appear or must fail closed (08 §7, 09 §4).

## 9. Action model — what differs per source type

| Action | Custom template | Project-derived source |
|---|---|---|
| Insert (drag, context menu, bulk) | ✅ | ✅ |
| Preview dock | ✅ | ✅ (+ live metadata §6) |
| Rename / Duplicate / Move category / Delete | ✅ (existing actions `renameEstimateTemplate`, `moveEstimateTemplateToCategory`, … `component-library/actions.ts:831-1103`) | ❌ — menu items absent (not merely disabled); editing the original happens in the project ("Open in project" link instead) |
| Save as custom template | n/a | ✅ → `createEstimateTemplateFromEstimateNode` (`actions.ts:672-827`); whole-tab variant wraps the tab's roots into one template; naming conflicts → keep both (templates have no unique-name constraint; categories are free text) with " (2)" suffix offered in the modal **[A]** |
| Open editor | ✅ template editor route | ❌ — "Open in project" navigates to `/workshop/projects/{projectId}/estimates/{nodeId-or-estimateId}` |

Category management (rename group, move between groups, drag-between-folders — `TemplatesBrowseManager.tsx:268-398`) remains **custom-templates-only**; project subtree never participates in category drag/drop.

## 10. Route-level browse vs estimate-sidebar parity

- **Match:** unified two-section tree, search across both, preview dock fields, insert actions (browse uses `InsertIntoEstimatePicker` exactly as today, extended to accept project-source payloads → target estimate **and tab** pickers — the picker grows a Tab select fed by `getEstimateTabs`).
- **Intentionally differ:** the browse route keeps template management (rename/duplicate/delete/category ops) and the template editor entry; the sidebar keeps its insert-target context (selected node) and `templateCreateMode`. The browse route does **not** force route-level management actions onto project sources (§9) — and project sources never link to the template editor route (`/workshop/library/templates/[templateId]` stays template-only; `getEstimateTemplateById` already 404s non-template ids, `component-library-repository.ts:1045-1086`).
- Bulk selection across mixed types: checked units resolve per provider — template units via `getCheckedTemplateUnits` (`TemplatesTree.tsx:181-207`), project units via a parallel resolver; one "Add selected" action runs template inserts then source inserts sequentially with a single result toast (partial-failure reporting lists failed units) **[D]** exact batching at implementation.

## 11. Duplicate/stale/conflict handling

- Inserting the same source twice is legal (copies, like templates). Provenance metadata distinguishes copies (`sourceTabId`/`sourceNodeId` stamps, §7).
- Source recency surfaces via §6 chips; no background polling — manual refresh + on-expand refetch only (performance guard, 02 §12).
- Deleted-underneath sources (estimate/tab/node removed between expand and insert): RPC re-validates existence and returns a typed error → toast "That source no longer exists. Refresh the Projects section." (denial scenario tested, 09 §4).

## 12. Template editor interaction

Project-derived sources do not enter the template editor. The editor's own insert surfaces (`EstimateRightSidebar` re-host with `templateCreateMode="scratch"`, `TemplateEditorClient.tsx:242-259`) **may** show the Projects section in a later slice; v1 hides it there (insert-into-template from project content = save-as-template first, then compose via existing `insertTemplateIntoTemplate`, `template-editor-actions.ts:462-573`). Recorded as deferred (D-8 in [12](12_OPEN_QUESTIONS_AND_DECISIONS.md)).

## Evidence Used

- `src/components/workshop/component-library/index.tsx` (panel tabs, drag handlers, bulk add, insert gating)
- `src/components/workshop/component-library/tree/TemplatesTree.tsx` (datum union, id scheme, context menus, checked units)
- `src/components/workshop/component-library/templates.ts` (mimes, payload parser, window events, search)
- `src/components/workshop/library/templates-browse/*` (browse tree/gallery/preview/picker)
- `src/lib/component-library/actions.ts` (`createEstimateTemplateFromEstimateNode` :672, `listEstimateInsertTargets` :1116, `searchLibraryOverview` :1239, category actions :1057-1103)
- `src/lib/estimates/actions.ts` (template insert family :1895-2207, non-transactional contracts :1945-1951)
- `supabase/migrations/20260522091621_component_library_templates.sql:207-407` (RPC to mirror for estimate→estimate copy)
- `src/lib/repositories/workspace-repository.ts:701-830, 1314-1405` (access resolver + aggregates)
- `supabase/migrations/20260526142913:726-754` (RLS the read path leans on)
- [02_TARGET_ARCHITECTURE.md](02_TARGET_ARCHITECTURE.md) §4 read/write diagrams; [08_ACCESS_SECURITY_RLS_PLAN.md](08_ACCESS_SECURITY_RLS_PLAN.md) §5 (insert gate detail)
