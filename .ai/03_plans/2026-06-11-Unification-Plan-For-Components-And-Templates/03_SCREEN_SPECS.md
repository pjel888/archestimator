# 03 — Screen Specifications

All measurements use DESIGN.md tokens: SF Pro stack, 12px max type, 3px radius, hairline `#F2F2F2`, ink `#292929`, secondary `#5D5D5D`, tertiary `#7F7F7F`, muted `#F5F5F5`. Mockup references: `mockups/01..03`.

## Shared shell (all library routes)

```
[ rail 64px | title bar 48px ──────────────────────────────── ]
[           | TabStrip 32px (Overview | Components | Templates) ]
[           | tree 264px | sheet flex | dock 380px (collapsible) ]
```

- **Title bar (48px):** `Library` 12px/500 ink; right: notification + settings icon buttons (existing `WorkshopPageShell` chrome).
- **Page TabStrip (32px):** existing primitive; active tab lifts onto white; each tab = icon (12px) + label (10px/500) + count badge (8px tnum on muted). Tabs are links.
- **Tree panel (left, default 264px):** `ResizableSidePanel` (min 216 / max 432), collapsible to rail; width persisted per tab. Header: 40px `TreePanelHeader` — search icon disclosure (existing pattern), then per-tab actions (below). No tab strip inside the tree panel (the page tabs replaced the single-tab `WorkshopTreeTabs`, killing the "tab bar with one tab" finding).
- **Sheet (center, flex):** **one** 40px `TreePanelHeader` row owns ALL sheet controls — search as the magnifier-icon disclosure (opens a dropdown `SearchInput` panel over the content, exactly like `EstimateSheetHeader` at `EstimateSheetContent.tsx:1735`), then filter / expand-collapse / add actions in the same row. No persistent search input in panels (the dense-header search-disclosure pattern is the documented DESIGN.md exception that satisfies audit R6); `⌘K` opens the disclosure and focuses the input via the existing `searchInputRef` prop. Below the toolbar: a 28px context strip — text only, zero controls — `{selection} · {n} {noun}` left + sort note right. Content region scrolls.
- **Dock (right, default 380px):** `ResizableSidePanel` (360–560), collapsible; 40px header with 11px/500 title + overflow menu; body scrolls; sticky footer for primary actions. Dock content is contextual per screen.

Focus order: rail → title actions → tabs → tree toolbar → tree → sheet toolbar → sheet content → dock. All interactive elements ≥24×24px targets, visible focus rings (`ring-focus`).

---

## 0. Overview home (`/workshop/library`, mockup 00) — [PHILIP-CONFIRMED v1 SURFACE]

No tree, no dock: a single full-width sheet under the `Overview | Components | Templates` tab strip. Four stacked regions, 20–24px gutters:

1. **Top row:** cross-library `SearchInput` 360px (`Search components and templates`, ⌘K). Typing opens a grouped results popover (Components / Templates sections, max 6 + 3, "See all in tab" rows); Enter on a result deep-links into the owning tab with the item selected. Right: `New template` ghost + `Add component` ink primary.
2. **Components section:** header `Components` 12px/500 + meta `154 in 9 categories · 22 suppliers · 29 brands` 9px + `Open components` link. One row of 6 **recently updated** component cards (same card primitive as the tab, thumb 72px). Card click → Components tab with that item selected in the inspector.
3. **Templates section:** header `Templates` + meta `3 in 2 groups` + `Open templates` link. Recent-template rows (icon, name 11px/500, singular-correct counts, group chip, ₱ total tnum, `Open` mini button → editor). Max 5, ordered by `updated_at`.
4. **Library health line:** hairline-topped stat row — `{n} prices older than 90 days` · `{n} discontinued items still in use` · `{n} components missing a brand` · `last library update {date}`. Each stat is a link into the Components tab pre-filtered to that facet (this is why the Filter facets in §1 include freshness/lifecycle/brand). Stats with value 0 are omitted, not shown as zero.

Data: one lightweight server fetch (`getLibraryOverview()`: two count queries + 6 recent items + 5 recent templates + 3 health counts — all indexed lookups, no full datasets). States: skeleton rows; brand-new workspace → the two sections collapse into the teach empty-states from brief §7 side by side.

---

## 1. Components tab (`/workshop/library/components`, mockup 01)

### Left tree
- Modes: Categories (default) / Suppliers / Brands via existing `DropdownSelect` in the tree header (existing view-mode control carried over).
- Rows 26px: chevron 12px, folder icon 12px (regular weight), label 10px, count 9px tnum tertiary right-aligned.
- Interactions: click filters sheet; drag-to-reorganize folders and items between folders (existing `LibraryFolderTree` mechanics); right-click context menu: `New folder`, `Rename`, `Move to…`, `Delete` (with occupancy-aware confirm). Empty root categories render collapsed (audit R14 option A).

### Sheet
- Toolbar (single header row): search disclosure icon (`Search components` placeholder in the dropdown panel), Filter icon button **wired** to a `FilterPopover` with facets: category path, supplier, brand, lifecycle, confidence, pricing-date freshness (audit R2 option B / R13). If filter facets slip the phase, the button is hidden via `showDefaultActions={false}` — never inert. `Add component` = ink primary in the same row (`addVisibleLabel`; kills the orange `bg-orange-50` violation, audit R3).
- Context strip: `Finishes · 42 components`; search active → `{n} of {total} match "{q}"` announced via live region (audit R12).
- Card grid: existing `repeat(auto-fill, minmax(164px,1fr))`; card = thumb 84px, name 10px/500 ink (1-line ellipsis), `subcategory · supplier` 9px tertiary, price 10px/500 tnum + `/ unit` 8px. Lifecycle badge on thumb for non-available items (`Discontinued` warning-soft, audit R4 — badge, not exclusion, so data stays honest). Selected card: ink border + `#FAFAFA` bg. Click selects + opens inspector; ⌘-click multi-selects for bulk archive (existing flow).
- States: loading = skeleton grid (sized to prevent CLS); empty folder = inline empty state with `Add component`; no results = copy from brief §7 + `Clear search`.

### Right dock — Component inspector (NEW; closes audit P1-3/C1–C5)
- Header `Component details` + overflow (Archive, View in tree, Copy ID).
- Body: thumb 120px, name 12px/500, taxonomy path 9px tertiary; key-value grid (96px label column): Unit cost (tnum), Supplier, Brand, Pricing date, Confidence (pill: success-soft `Quoted` / warning-soft `Estimated`), Lifecycle, Version (`v3 · current`).
- Sections: **Price history** (`cost_library_item_price_history`, date + tnum price rows, latest 5 + `View all`); **Used in** (`{n} templates · {m} estimates`, counts link to filtered views later — counts only in v1).
- Footer: `Edit component` primary (opens edit drawer — the add modal generalized to versioned edit, Phase 1.5), `Duplicate`, overflow.
- No selection → dock collapsed by default; first selection opens it. Esc closes and returns focus to the card.

---

## 2. Templates tab, browse (`/workshop/library/templates`, mockup 02)

### Left tree
- Hierarchy: `All Templates` → groups (from `estimate_templates.category`, rendered as plain folder nodes per the templates-panel "no category type" decision) → templates (Blueprint-style icon, name + ₱ total tnum 9px).
- Header actions: search disclosure, expand/collapse, `+` (New template, group pre-filled from selection).
- Interactions: click filters gallery / selects template (syncs preview dock); drag templates between groups (updates `category` + stored sibling order); right-click: groups `New template`, `Rename group`; templates `Open`, `Insert into estimate…`, `Rename`, `Duplicate`, `Delete` (server actions exist for rename/delete).

### Sheet — template gallery
- Toolbar (single header row): search disclosure icon (`Search templates`; matcher extended to row item names/suppliers per audit rec 7), `New template` ink primary in the same row.
- Context strip: `All Templates · 3 templates` (pluralization fixed).
- Template rows (not a card grid — these are assemblies, scanned by name+size+cost): 11px/500 name · `2 groups · 3 areas · 8 rows` 9px tertiary (singular-correct) · ₱ total 11px/500 tnum right; description 9px; footer: group/area chips 8px + actions `Open` (mini primary), `Insert into estimate ▾`, kebab (Rename/Duplicate/Delete). Row click selects (preview dock); double-click or `Open` enters editor.
- `Insert into estimate ▾` opens a project→estimate picker popover and calls the existing `insertEstimateTemplateIntoEstimate` action — the audit's #1 missing handoff, available without leaving browse.
- States: loading skeleton rows; empty state per brief §7; no-results with clear.

### Right dock — Template preview
- Header `Template preview`; body: name 12px/500, `{group} · updated {date}` 9px; structure outline (group/area/item rows, 12px icons, qty 9px tnum right); `Template total` separator row 12px/500 tnum.
- Footer: `Open template` primary, `Insert into estimate ▾` secondary.

---

## 3. Template editor (`/workshop/library/templates/[templateId]`, mockup 03)

### Title bar (replaces the Library title row for this route)
- Breadcrumb 10px: `Library / Templates / {Group} /` tertiary links + `{Template name}` 12px/500 ink.
- **TEMPLATE mode chip**: 18px, blueprint icon 10px + `TEMPLATE` 8px/500, muted bg, hairline border (Decision D6).
- Right: `Saved · just now` 9px tertiary (autosave indicator), `Insert into estimate ▾` ghost button, overflow (Rename, Duplicate, Delete, Export later).
- Page TabStrip hidden on this route — the breadcrumb owns orientation; back returns to browse.

### Left tree — this template's structure
- 28px back-strip `‹ All templates` above the tree toolbar.
- Tree = template root → groups → areas (mirrors estimate left tree), each with ₱ totals; selecting scrolls/filters the sheet; drag-to-reorder nodes; right-click: `Add group`, `Add area`, `Rename`, `Duplicate`, `Delete`.
- Toolbar `+` = Add group/area menu.

### Sheet — editable template grid (estimate-sheet anatomy)
- Toolbar (single header row, mirrors `EstimateSheetHeader`): search disclosure icon, expand/collapse all, `Add group` / `Add area` actions.
- Grid columns: Item 44% / Qty 10% num / Unit 10% / Unit cost 18% num / Total 18% num; 8px/500 tertiary sticky header row.
- Row types: group rows (muted bg, 10px/500 ink, folder icon), area rows (indented, pin icon), item rows (40px indent, drag handle dots-six, name ink, tnum numerics, 30px height), trailing ghost row `+ Add row from library, or type to create an allowance row` (typing creates a non-library allowance row; picking inserts a `source_library_item_id` row).
- Inline edit: qty/unit/unit-cost editable in place (same editors as estimate cells); name edits the row label override.
- Drag-and-drop: drop zones between item rows and on group/area headers appear only during a compatible drag (`useEstimateWorkshopDrag`); drop target = muted bg + 1.5px ink top/bottom rules + label `Drop to add "{name}" here`. Sources: right dock leaves (single), dock bulk selection, and reorder of existing rows. **Hierarchy constraint (server-enforced by RPC `validate_estimate_template_tree`): groups live at root, areas under groups — drop zones must only appear on parents where the drop is valid; a component dropped on a group header routes into that group's first/selected area (or prompts to create one if the group has none).**
- Footer (36px): `Template total` 9px label + 12px/500 tnum value; right caption `Totals are reference pricing: estimates re-price on insert`.
- States: empty template = full-sheet drop-target hero (`Drag components here from the right panel, or add a group to start the structure.`); saving error = toast + row-level retry; concurrent-edit conflicts resolved last-write-wins with toast (templates are single-author in practice; revisit post-beta).

### Right dock — Components palette (the estimate dock, re-hosted)
- Same `EstimateRightSidebar` anatomy: panel tabs `Components | Templates`, 40px toolbar (search disclosure, expand, add), category/supplier/brand tree with draggable leaves (name + `₱price / unit` 9px tnum), bulk dock (`{n} components selected` + `Add to template` primary) targeting the selected area/group.
- The dock's **Templates** tab allows inserting another template's subtree into this one (composition — Philip-approved Q4, ships as Phase 3.5). It is server-guarded against self/circular insertion (it copies rows, so cycles can't form, but self-insert is blocked client-side as a footgun). The only cut-line is Phase 3 overrunning, in which case the dock ships Components-only and 3.5 follows separately.

---

## 4. Responsive behavior (structural, per product register)

- **≥1280px:** full three-panel layout.
- **1024–1280px:** dock overlays (sheet keeps width) when opened; tree collapsible.
- **768–1024px:** tree and dock become drawers; sheet primary; tab strip stays.
- **<768px:** Components = searchable card list; Templates = gallery + preview sheet (bottom drawer); template editor is read-only with `Insert into estimate` (dense grid editing is not a mobile task — matches DESIGN.md mobile stance).

## 5. Accessibility acceptance (inherits audit doc 12 wholesale)

Keyboard reachability for every action; APG tree pattern on all trees; live-region announcements for result counts and save state; labeled search (visible name = accessible name); focus return on dock/dialog close; 24px targets; reduced-motion variants for panel slides (crossfade); drag-and-drop always has a keyboard/menu equivalent (context-menu `Add to template…` / `Move to…` mirrors every drop).
