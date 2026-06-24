# 08 — Templates CRUD Audit

## Create

### Entry points
1. **Toolbar "Add Template"** → `setAddTemplateOpen(true)` → `NewTemplateModal`
2. **Category context menu "New Template"** → `setTemplateDefaultCategory(category)` + modal
3. **Left tree "Save as template"** → `CREATE_ESTIMATE_TEMPLATE_FROM_NODE_EVENT` window event → sidebar listener → modal with `sourceNode`

### Modes
- **`estimate-node`** (default): saves the selected estimate Area + subtree. Calls `createEstimateTemplateFromEstimateNode`. Requires `sourceNode`, `projectId`, `estimateId`.
- **`estimate-tab`**: saves an entire tab. Calls `createEstimateTemplateFromEstimateTab`. Requires `sourceTabId`.
- **`scratch`**: creates an empty template. Calls `createEstimateTemplate`. No source required.

### Persistence
- **Persisted**: ✅ via server actions
- **Authorization**: `assertCanManageLibrary` + `assertCanPublishEstimateTemplateFromEstimate` (RPC `can_edit_estimate`)
- **Quota**: `LIBRARY_TEMPLATE_CAP = 2_000` per workspace
- **Transaction safety**: `createEstimateTemplateFromEstimateNode` wraps the insert in a try/catch — on failure, the orphan template is deleted (`supabase.from("estimate_templates").delete().eq("id", insertedTemplate.id)`). **Partial failure recovery**: ✅
- **Cache invalidation**: `onLibraryDataChanged?.()` called after success
- **Optimistic append**: the returned template is appended to `templateList` immediately

### Tab-name display vs stored name
**Evidence**: `NewTemplateModal.tsx:273-274` + test at `component-library-ui.test.tsx:264-279`:
- The modal shows `sourceDisplayName` (e.g., "Page 001") as the source label
- But sends the raw `sourceTabName` (e.g., "Lobby Main") to the server
- This is **intentional and correct** — the display label is derived from tab sort order, while the stored name preserves the user-given tab name

## Rename

- **Entry**: context menu "Rename" → modal dialog
- **Persisted**: ✅ via `renameEstimateTemplate` server action
- **Optimistic**: local update + reconcile on server response
- **Guard**: `renameTemplatePending` disables double-submit
- **Empty name**: validation error ("Template name is required")
- **Finding**: None — correctly implemented

## Delete

- **Entry**: context menu "Delete" → confirm dialog
- **Persisted**: ✅ via `deleteEstimateTemplate` server action (hard delete with cascade to nodes + row items)
- **Optimistic**: local removal
- **Confirmation copy**: generic (not showing template name or dependent estimate count)
- **Undo**: ❌ **NOT available** — once confirmed, the delete is permanent
- **Finding**: P3 — consider soft-delete (archive) instead of hard delete, or add an undo window

## Categories / Groups

### Current data model
Categories are **free-text strings** on `estimate_templates.category`. There is NO separate `estimate_template_categories` table.

### "New Template Group" flow
- **Entry**: toolbar "Add Template Group" button → `setAddTemplateGroupOpen(true)` → simple name input
- **Persisted**: ❌ **LOCAL-ONLY** — `setCustomTemplateGroups(append)`
- **Survives refresh**: ❌ — on remount, categories are derived purely from template data via `buildTemplateCategoryTreeNodes` (`TemplatesTreeModel.ts:226-235`)
- **Empty group**: disappears on refresh (no templates → no category)
- **Rename group**: ❌ not available
- **Delete group**: ❌ not available
- **Reorder group**: ❌ not available
- **Finding**: **F-10** (P1) — misleading "created" behavior

### Recommended model
Either:
- **(A) Remove the "New Template Group" affordance** entirely — categories emerge naturally from template creation. When creating a template, the user types a category; it appears in the tree. This matches the actual data model.
- **(B) Persist categories** as an `estimate_template_categories` table with workspace scoping. This adds rename/delete/reorder but is heavier.

**Recommendation**: Option A (simplest, honest).

## Component rows inside templates

Template component rows (`estimate_template_row_items`) are read-only in the sidebar. The `TemplatesTree` renders them with an "Add" context-menu action but no edit/delete/duplicate.

**VERIFIED**: `TemplatesTree.tsx:387-403` — context menu for `template-row` type only offers "Add component" (insert into estimate).

## Source filtering

The Templates tab has a `templateSourceFilter` dropdown: "All sources" / "Custom templates" / "From projects".

- **All**: shows both custom templates and reusable project sources
- **Custom**: shows only custom templates (hides the "Projects" section)
- **From projects**: shows only reusable project sources (hides the "Custom Templates" section)

**Not persisted**: resets to "all" on remount.
