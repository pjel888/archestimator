# Templates Panel UX/UI — Estimate Workspace

## Phase 6 addendum (2026-06-11): one tree scale across all panels

Owner question answered: all three estimate-page sidebar trees (sheets,
components, templates) DO share the ui `Tree` primitive — the "left tree
looks bigger" came from its row icons alone (hand-sized at 14px via
`h-3.5 w-3.5` while the right trees used 12px). Fix: `TREE_ROW_ICON_SIZE`
(12) is now exported from `src/components/ui/tree.tsx` and consumed by all
three trees' row icons; a DOM test pins the parity.

REMAINING CONSOLIDATION (long run, owner-endorsed): the workshop layer has
a second tree system (`workshop-tree.tsx` + `tree-visual-style.ts`, from
the perf workstream) used by the sheet center, share pages, and the
components-page folder tree, with its own metrics (indent 20 vs 16, icon
slot 16px). Those surfaces should converge on the ui `Tree` primitives /
constants in a dedicated pass, coordinated with the active
Path-To-Estimate-Sheet-Performance-Optimization plan to avoid mid-flight
collisions.

## Phase 5 addendum (2026-06-11): drag + right-click are the only add paths

Hover "+" buttons removed from every templates-tree row (template roots,
inner nodes, components); double-click-add removed too. One shared
node-row renderer (name + cost) now serves categories, templates, and
inner groups/areas, so each node kind behaves identically. Context menus
and drag are the insertion paths; tests and the template-insert e2e smoke
were migrated from the row button to the context menu.

NOTE — concurrent-agent collision repaired this session: a second tool
(Sisyphus) committed slices mid-flight (6caf132, ba3f617) and transiently
deleted `estimate-workshop-drag.ts` + reverted the left tree/sheet; the
lost pieces were restored and the merged state verified green (177 tests,
13 suites). Avoid running two agents on this working tree simultaneously.

## Phase 4 addendum (2026-06-11): no category type — uniform node tree

Owner direction: the templates tree must read as ONE kind of tree — groups
nesting groups/areas, areas holding components. Category rows now render
identically to group node rows (folder icon, plain label, summed cost,
tabular tertiary) with the "N templates" count removed; template rows drop
the "X groups · Y areas · Z rows" meta and keep name + cost on a single
line. The `category` text column stays as the grouping data (no schema
change); only its UI identity as a separate "type" is gone. The
create-template modal field is relabeled "Group" to match. Costs remain on
every row level.

- **Drag payload union** (`EstimateTemplateDragPayload`): `{kind:"templates",
  templateIds}` | `{kind:"template-node", templateId, templateNodeId}` —
  single-template, category, and now node-inside-template drags all normalize
  through one reader; the insert window event mirrors the union.
- **Server**: `insertEstimateTemplateNodeIntoEstimate` (estimates/actions.ts)
  recreates ONE template node + subtree under a target group by looping the
  history-aware `create_estimate_node_with_history` /
  `insert_estimate_row_item_with_history` RPCs — versioned, no migration.
- **TemplatesTree**: every row is draggable AND selectable (categories →
  templates → inner groups/areas → component rows). Categories render as
  group-node-style rows (folder icon, standard label, template count) per
  owner direction — organizational only, never inserted as a node. Inner
  nodes get hover-Add, double-click-add, and context-menu Add.
- **Bulk**: cascade selections resolve via `getCheckedTemplateUnits` to
  top-most units (whole template > subtree > component row); the toolbar's
  "Add selected to estimate" routes templates/subtrees to the group target
  and components to the area target.
- **Sheet + left tree** accept the node payload: zones/sections insert the
  subtree optimistically with rollback; the left tree dispatches the union
  detail.

Verification: tsc clean · eslint clean · design lint pass · 177 vitest tests
green across 13 suites.

## Phase 2 addendum (2026-06-11): tree right-click CRUD

All three estimate-page trees now expose CRUD through the shared
ContextMenu/ActionMenu primitives (Storybook: Menus/ContextMenu, new
`TreeCrudPattern` story):

- **Primitives**: SubTrigger text ">" → CaretRight icon; menu min-width
  36; `ContextActionMenuContent` reserves the icon slot menu-wide so mixed
  menus keep one label axis.
- **Sheets tree**: groups get "New Group inside" / "New Area Node inside"
  (`handleAddTreeNode` gained a parent override); every node gets "Save as
  template" (window event `archestimator:create-template-from-node` → the
  sidebar opens NewTemplateModal with that node as source), Rename, Delete.
  Fixed a real race: menu-triggered creates now arm the same
  close-auto-focus suppression refs as menu renames, otherwise Radix's
  focus return blurred the just-mounted inline-rename editor and silently
  committed the placeholder name.
- **Components tree**: item rows add Edit / Duplicate / favorite toggle /
  Delete (wired to the sidebar's existing flows); folders add New
  Component.
- **Templates tree**: template rows add Rename / Delete backed by new
  workspace-scoped server actions (`renameEstimateTemplate`,
  `deleteEstimateTemplate`); categories add New Template with the category
  prefilled (`NewTemplateModal.defaultCategory`); sidebar hosts the rename
  dialog + delete confirm with optimistic list updates.

Verification: tsc clean · eslint clean · design-system lint pass (caught
and fixed a filled Star icon) · 163 vitest tests green across 11 suites.

Date: 2026-06-11 · Branch: `claude/projects-pages-ux-and-ui-design` · Status: IMPLEMENTED (uncommitted, in working tree)

Verification: `tsc --noEmit` clean · ESLint clean on all touched files ·
`lint:design-system` pass · 165 vitest tests green across 13 suites (16 new
tests: tree external drops, templates tree, sheet drag-aware zones, left-tree
template drop event, create-template modal) · `detect_changes` medium risk,
no affected execution flows · live page SSR smoke clean (templates tab +
Add Template render, zero console errors; interactive drag pass blocked by
the known background-tab hydration gate — needs one foregrounded-tab look).

## Goal

Make the right-sidebar Templates panel a first-class tree (same primitives and
affordances as the left estimate tree), enable dragging templates directly into
the left sidebar tree and into the estimate sheet, make sheet drop zones appear
only during an active drag, enforce nesting rules in the UI (areas never accept
groups/areas/templates), and add a "create template" entry point next to the
existing "create component" button.

## Constraints discovered (authoritative)

- **Server nesting rule** (`insert_estimate_template_into_estimate`, migration
  `20260524050746`): target parent **must be an existing `group` node** — no
  root-level template insertion, regardless of the template's root kinds. UI
  therefore offers template drops **only on groups** (sheet sections + left
  tree rows, position `inside`).
- `canNestEstimateNodeKind`: root accepts only groups; areas accept nothing.
- Template tables (`estimate_templates`, `estimate_template_nodes`,
  `estimate_template_row_items`) have member-manage RLS → a plain server action
  can create templates; no new migration needed.
- There is **no existing write path** for templates; creation will copy a
  selected estimate node subtree (matches "template is a group node or an area
  node at parent level").
- Drag/drop across panels is HTML5 DnD with custom MIME types:
  `application/x-archestimator-estimate-template` (payload `{templateId}`),
  `application/x-archestimator-library-item` (payload = full row JSON).
- Left tree and sheet share React Query cache `["estimate", id, "area-tree"]`,
  so the sheet's optimistic template insert already updates the left tree.
- `Tree` (src/components/ui/tree.tsx) only understands intra-tree drags today;
  `dataTransfer.getData` is unreadable during `dragover`, so external accepts
  must key off `dataTransfer.types`.

## Decisions

1. **Tree primitive gains `externalDrop`** `{ types, canDrop, onDrop }` —
   detected when no internal drag source is set and types match; candidate
   positions tried in order [band-computed, "inside"]; reuses existing drop
   indicators; folder auto-expands on inside drop.
2. **Cross-panel drag visibility** via a small zustand store
   (`useEstimateWorkshopDrag`): set in sidebar dragstart, cleared on dragend.
   Sheet zones and hints render from this store, so "Drag and drop … here"
   only exists mid-drag; at rest a quiet "+ Add row" affordance remains (the
   drop zone was also the add-blank-row button — that affordance must not
   vanish).
3. **TemplatesTree** mirrors LibraryTree: categories → template rows
   (draggable, icon = root kind, counts + total) → internal nodes (read-only)
   → component leaves draggable as plain library items (a component inside a
   template can be dropped into any area).
4. **Left tree drop → sheet mutation** via window CustomEvent
   `archestimator:insert-estimate-template` (same pattern as the existing
   `archestimator:add-library-item` listener); EstimateSheetContent owns the
   optimistic insert + rollback.
5. **Create template = save selected estimate node as template** (server reads
   the subtree authoritatively; client never ships tree payloads). Modal:
   name / category / description + source-node summary. New template appends
   to the sidebar list and selects the Templates tab.
6. Templates tab becomes **always visible** (empty state explains creation);
   the old "hide tab when no templates" test gets updated intentionally.
7. Empty **group** sections stop showing the component drop zone (today it's a
   dead affordance there); they show a guidance row, plus the template zone
   during template drags.

## Touched files

- `src/components/ui/tree.tsx` (+ stories) — externalDrop
- `src/components/workshop/estimate-workshop-drag.ts` — NEW store
- `src/components/workshop/component-library/tree/TemplatesTree.tsx` — NEW
- `src/components/workshop/component-library/index.tsx` — tab, header button,
  modal, drag-store hooks, bulk add
- `src/components/workshop/component-library/NewTemplateModal.tsx` — NEW
- `src/components/workshop/EstimateSheetTree.tsx` — externalDrop + event
- `src/components/workshop/EstimateSheetContent.tsx` — listener, drag-aware
  zones, TemplateDropZone, empty-group fix
- `src/lib/component-library/actions.ts` — createEstimateTemplateFromEstimateNode
- `tests/vitest/*` — updates + new coverage

## Verification gates

vitest (tree/system/library/sheet files) → typecheck → `bun run
lint:design-system` → live browser pass on
`/workshop/projects/2222…/estimates/a9c5…` → `detect_changes` → commit.
