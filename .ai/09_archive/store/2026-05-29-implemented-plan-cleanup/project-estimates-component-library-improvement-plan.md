# Project Estimates + Component Library Improvement Plan

**Date:** 2026-05-18
**Status:** Product/UX improvement plan for the current feature spec
**Companion spec:** `.ai/06_specs/current-project-estimates-component-library-spec.md`
**Feature scope:** `/workshop/projects/[projectId]/estimates/[nodeId]`, estimate hierarchy tree, center estimate sheet, estimate-page Component Library sidebar
**Planning question:** From the persona of a contractor creating a project cost estimate, what would make the work faster, clearer, and less error-prone?

---

## 1. User persona and working context

### Primary persona

A small contractor, design-build contractor, fit-out estimator, or architect-contractor preparing a project cost estimate under time pressure.

### What the user is trying to do

The user is not trying to admire a spreadsheet. The user is trying to finish a credible estimate quickly enough to price a project, discuss scope with a client, revise after changes, and avoid missing major costs.

### Typical work session

1. Open a project estimate.
2. Navigate to a building / floor / room / scope area.
3. Add components or assemblies from a reusable library.
4. Adjust quantities, unit costs, labor, other costs, and notes.
5. Check subtotals and total impact.
6. Repeat across areas.
7. Review missing quantities, stale prices, low-confidence rows, and changed scope.
8. Export or prepare the next revision later.

### Pain points in the current slice

The current feature proves the direction, but it still makes the user do too much manual work:

- component insertion still depends heavily on clicking/dragging from the right sidebar;
- click insertion fails silently when a non-area node is selected;
- quantity editing is not yet spreadsheet-fast;
- search/filter/view controls in the estimate header are not yet wired;
- tree search and add-area are visual only;
- there is no command-style fast insert path;
- no paste/import path from Excel or supplier spreadsheets;
- no assemblies/templates for repeated contractor work;
- no explicit source/confidence/needs-review workflow;
- no revision/delta workflow;
- some repeated UI controls still need extraction into shared primitives.

---

## 2. Research basis

This plan synthesizes best practices from data-table/grid UX, spreadsheet-like editing, construction estimating workflows, and adjacent structured-data tools.

### Data table / grid UX sources

- Nielsen Norman Group, **Designing Data Tables**: https://www.nngroup.com/articles/data-tables/
- WAI-ARIA Authoring Practices, **Grid Pattern**: https://www.w3.org/WAI/ARIA/apg/patterns/grid/
- WAI-ARIA Authoring Practices, **Treegrid Pattern**: https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/
- Material Design 3, **Data tables**: https://m3.material.io/components/data-tables/guidelines
- Carbon Design System, **Data table usage**: https://carbondesignsystem.com/components/data-table/usage/
- Microsoft Fluent 2, **DataGrid guidance**: https://fluent2.microsoft.design/components/web/react/core/datagrid/usage
- AG Grid, **Cell editing**: https://www.ag-grid.com/javascript-data-grid/cell-editing/
- AG Grid, **Keyboard navigation**: https://www.ag-grid.com/javascript-data-grid/keyboard-navigation/
- AG Grid, **Clipboard**: https://www.ag-grid.com/javascript-data-grid/clipboard/
- AG Grid, **Column pinning**: https://www.ag-grid.com/javascript-data-grid/column-pinning/
- AG Grid, **Tree data**: https://www.ag-grid.com/javascript-data-grid/tree-data/
- MUI X Data Grid, **Editing**: https://mui.com/x/react-data-grid/editing/
- MUI X Data Grid, **Accessibility**: https://mui.com/x/react-data-grid/accessibility/
- TanStack Table, **Column pinning**: https://tanstack.com/table/latest/docs/guide/column-pinning
- Handsontable, **Cell editor / clipboard patterns**: https://handsontable.com/docs/javascript-data-grid/cell-editor/

### Construction estimating / adjacent workflow sources

- Procore Estimating: https://www.procore.com/en-sg/products/estimating
- Autodesk Takeoff: https://construction.autodesk.com/products/autodesk-takeoff/
- Bluebeam quantity takeoff: https://www.bluebeam.com/solutions/quantity-takeoff/
- STACK Construction Technologies: https://www.stackct.com/
- PlanSwift: https://www.planswift.com/
- RIB CostX: https://www.rib-software.com/en/products/rib-costx
- Buildxact estimating: https://www.buildxact.com/
- Buildertrend estimating: https://buildertrend.com/features/estimating/
- Houzz Pro estimates: https://www.houzz.com/pro
- Trimble WinEst: https://www.trimble.com/en/products/trimble-winest
- Airtable grouping/templates concepts: https://support.airtable.com/
- Notion database grouping/templates concepts: https://www.notion.so/help/category/databases
- Microsoft Excel support patterns: https://support.microsoft.com/en-us/excel
- Google Sheets support patterns: https://support.google.com/docs/topic/9054603

### Research conclusion

The best fit is not a full Excel clone. The right direction is a **hierarchical contractor estimating workspace with spreadsheet-grade speed for the cells that estimators edit repeatedly**.

In other words:

- keep Archestimator's project → lot/structure/floor/area model;
- keep Component Library insertion as a first-class estimating action;
- add spreadsheet-like speed where it improves quantity/cost entry;
- avoid arbitrary spreadsheet complexity such as full formulas, cell styling, multi-sheet workbooks, and pivot-table behavior;
- use domain actions: insert component, insert assembly, duplicate row, move row to area, apply markup, flag stale price, save area as template, compare revision.

---

## 3. Fit analysis: spreadsheet-like UX vs Archestimator's use case

### Fits strongly

#### Inline cell editing

Why it fits:

- Contractors repeatedly edit quantities, labor, and allowances.
- Modal editing would be too slow.
- Enter/Tab flows match spreadsheet muscle memory.

Archestimator application:

- quantity, labor cost, other cost, discipline, designation, notes, source confidence, and inclusion status should be editable inline or through compact popovers.
- totals and rollups should remain calculated and visibly locked.

#### Keyboard navigation

Why it fits:

- Estimating is repetitive.
- Mouse-only workflows slow down power users.

Archestimator application:

- arrow keys move focus;
- Enter edits/commits;
- Tab commits and moves right;
- Escape cancels;
- `/` or `Cmd/Ctrl+K` opens fast insert;
- `Cmd/Ctrl+D` duplicates/fills down;
- `Cmd/Ctrl+C/V` supports safe copy/paste.

#### Sticky headers and pinned identity columns

Why it fits:

- Estimates can become wide.
- The user must never lose row identity or column meaning.

Archestimator application:

- sticky estimate header and column header;
- pinned material/component identity column;
- optional pinned right total column;
- numeric values right-aligned with tabular numerals.

#### Safe copy/paste

Why it fits:

- Contractors often start from Excel, supplier spreadsheets, or previous estimates.
- Paste can dramatically reduce manual entry.

Archestimator application:

- paste into editable fields only;
- reject or flag invalid unit/cost/quantity cells;
- preview multi-row paste before commit;
- map columns when importing from external sheets.

#### Bulk edit and row operations

Why it fits:

- Users need to change many rows at once: discipline, supplier, markup, area, include/exclude, confidence, notes.

Archestimator application:

- multi-select rows;
- bulk action bar with affected row count;
- domain actions, not generic spreadsheet transforms.

### Fits with caution

#### Fill handle / fill down

Why it can help:

- Repeating quantities, supplier, discipline, or labor assumptions is common.

Risk:

- Easy to accidentally overwrite important estimate values.

Recommendation:

- Start with `Cmd/Ctrl+D` fill down and an undo stack before adding a visible drag fill handle.
- Do not fill calculated totals.

#### Formula-like quantity expressions

Why it can help:

- Estimators often calculate quantities while typing.
- `12*8`, `2*(10+12)`, or `4 rooms * 2` avoids switching to a calculator.

Risk:

- Full spreadsheet formulas create complexity and trust issues.

Recommendation:

- Support simple arithmetic expressions in quantity fields only.
- Store evaluated value plus expression note.
- Do not support arbitrary cross-cell formulas in MVP.

#### Treegrid behavior

Why it can help:

- Construction estimates are hierarchical.

Risk:

- If left tree and center hierarchy both compete, the user may be confused.

Recommendation:

- Left tree is navigation and scope overview.
- Center sheet is the editable branch.
- Keep route-selected context clear at all times.

### Does not fit now

- Full Excel formula engine.
- Cell styling and arbitrary formatting.
- Pivot tables.
- Hidden sheets/tabs as core UX.
- Macro recording.
- Drawing/takeoff sync.
- Supplier marketplace procurement.
- Formal change orders.
- Multi-user locking/permissions.
- Full ERP/accounting integration.

---

## 4. North-star UX path

### Target path: Fast estimate creation from a selected area

1. User opens project estimate.
2. Left tree shows project hierarchy and selected context.
3. Center sheet shows only the selected branch.
4. Right sidebar shows Component Library picker.
5. User presses `/` or `Cmd/Ctrl+K`.
6. Search opens with cursor active.
7. User types `paint`.
8. Results rank recent/favorite/high-confidence components first.
9. User presses Enter to insert the highlighted component into the selected area.
10. Quantity cell is focused immediately.
11. User types `2*(4.2+3.8)*2.7`, presses Enter.
12. The field evaluates quantity, stores expression, updates subtotal/total.
13. User presses Shift+Enter or keeps insert open to add the next component.
14. Row receives source/confidence metadata and needs-review warning if applicable.
15. User moves through rows with keyboard, not mouse.

### Target path: Reusing a typical room/scope

1. User selects `Bedroom 2` area.
2. User chooses `Insert template`.
3. User selects `Bedroom - standard finishes`.
4. Preview shows row count, disciplines, estimated subtotal, and assumptions.
5. User inserts.
6. Rows are grouped under collapsible template/assembly groups.
7. User edits only the quantities that differ.
8. User saves the adjusted area as a reusable template if useful.

### Target path: Fast revision after client changes

1. User duplicates estimate as `R02`.
2. User filters `Changed since previous` or `Needs review`.
3. User changes quantities or swaps components.
4. Rows show `Added`, `Qty changed`, `Cost changed`, or `Source changed` badges.
5. Header shows revision delta: total increase/decrease.
6. User reviews low-confidence or stale-price rows before export.

---

## 5. UI improvement plan by surface

## 5.1 Left estimate tree

### Current issue

The tree is route-backed and visually useful, but tree search and add-area are not yet functional. Click insertion from the right sidebar can fail when the selected node is not an area.

### Improvement goals

- Make the user's current insertion target unambiguous.
- Let the user find areas fast.
- Let the user create estimate structure without leaving the workflow.

### Planned UX improvements

#### A. Functional tree search

Behavior:

- Search filters visible nodes by name, kind, and path.
- Matching children reveal parent path.
- Matches are highlighted.
- Keyboard up/down moves through matches.
- Enter navigates to highlighted node.

Fit:

- Strong. Large estimates need quick area navigation.

#### B. Selected target indicator

Behavior:

- Header and sidebar should both show:
  - `Target: Ground Floor / Kitchen`
  - if selected node is non-area: `Target required: choose an area`
- If a non-area is selected, the Add button in library cards should not silently no-op.

Options:

1. Disable Add with explanation: `Select an area to insert`.
2. Let user choose from eligible descendant areas in a small target picker.
3. Default to first visible descendant only if explicitly confirmed.

Recommendation:

- Phase 1: Disable Add with clear target picker prompt.
- Phase 2: Add explicit target picker.
- Never silently insert into the first area.

#### C. Add area / add child flow

Behavior:

- Add button opens a compact menu:
  - Add lot group
  - Add structure under selected lot
  - Add level under selected structure
  - Add area under selected parent
- Menu only enables valid child kinds.
- New node name enters inline edit mode.

Fit:

- Strong, but after insertion/editing speed improvements.

#### D. Area badges

Show compact badges in tree rows:

- row count;
- subtotal;
- warning count;
- changed count.

Design constraint:

- Keep text at 8–10px.
- Use tabular numerals.
- Avoid turning the tree into a wide table.

---

## 5.2 Center estimate sheet

### Current issue

The center sheet supports local row editing and totals, but it is not yet spreadsheet-fast. It also has visual controls for search/filter/view that are not wired.

### Improvement goals

- Make row entry/editing as fast as a spreadsheet for common fields.
- Preserve hierarchy and construction semantics.
- Reduce error risk with validation and source/status indicators.

### Planned UX improvements

#### A. Formal interaction states

Define distinct states:

- row hover;
- row selected;
- cell focused;
- cell editing;
- invalid cell;
- calculated/read-only cell;
- row overridden;
- row needs review;
- row inserted recently.

Acceptance criteria:

- selected row is not confused with focused cell;
- editing state is visibly stronger than focus state;
- calculated cells cannot look editable;
- invalid values stay near the field with a clear message.

#### B. Keyboard-first cell flow

Minimum keyboard support:

- Arrow keys: move between cells.
- Enter: start edit or commit and move down.
- Shift+Enter: commit and move up.
- Tab: commit and move right.
- Shift+Tab: commit and move left.
- Escape: cancel edit.
- Cmd/Ctrl+C: copy selected cells/rows.
- Cmd/Ctrl+V: paste into editable cells with validation.
- Cmd/Ctrl+D: fill down / duplicate depending on selection mode.
- Cmd/Ctrl+Z: undo.
- Cmd/Ctrl+Shift+Z: redo.
- Delete/Backspace: clear selected editable cells or delete selected rows with guardrails.

Implementation note:

- This does not require adopting a full grid package immediately, but if native implementation becomes brittle, run a Glide Data Grid spike behind an adapter.

#### C. Sticky headers and pinned identity

Behavior:

- Column header remains sticky while scrolling the sheet.
- Material/component identity stays visible during horizontal scroll if wide columns are introduced.
- Right total column may be pinned if table becomes horizontally scrollable.

Design:

- Header text 8–9px, uppercase only where useful.
- Body/control text 10px.
- Strongest row/group labels max 12px.

#### D. Wired row search/filter/view controls

Search should filter visible rows by:

- material/name;
- supplier;
- description;
- category;
- discipline;
- designation;
- source/confidence;
- notes.

Filters should include:

- missing quantity;
- low confidence;
- stale price;
- manually overridden;
- changed since revision;
- added rows;
- included/excluded/alternate;
- discipline;
- supplier;
- source type.

View presets:

- Entry: item, quantity, unit, base cost, total.
- Pricing: supplier, unit cost, source, confidence, last updated.
- Labor: labor cost, productivity, crew/note later.
- Review: warnings, source, notes, changed since previous.
- Compact: minimal high-density row view.

#### E. Quantity expressions

Behavior:

- Quantity field accepts simple arithmetic expressions.
- Examples:
  - `12*8`
  - `2*(10+12)`
  - `4*2.5`
  - `=12*8`
- Store:
  - evaluated quantity;
  - original expression as optional note/source.
- Show a small expression indicator on rows where expression was used.

Fit:

- Very strong. Contractors often compute while estimating.

Guardrail:

- Do not add cross-row formulas yet.

#### F. Bulk action bar

When rows are selected, show a compact contextual bar:

- `3 rows selected`
- Duplicate
- Move to area
- Change discipline
- Change designation
- Apply supplier
- Mark included/excluded
- Mark needs quote
- Reprice from library later
- Delete

Acceptance criteria:

- bar appears only when selection exists;
- destructive actions require confirmation or undo;
- affected row count is visible;
- all controls use shared primitives.

#### G. Row grouping inside area nodes

Add optional grouping below an area:

- group by discipline;
- group by assembly;
- group by source/confidence;
- custom group heading.

Group row features:

- collapse/expand;
- subtotal;
- warning count;
- duplicate group;
- move group to another area;
- save group as template/assembly.

Fit:

- Strong, after basic editing is faster.

---

## 5.3 Right Component Library sidebar

### Current issue

The sidebar is already useful and contains search/filter/group/sort/view/preview/create behavior, but the main workflow can still be faster and clearer.

### Improvement goals

- Make insertion nearly keyboard-speed.
- Keep library picker separate from full library administration.
- Make target, source trust, and recently used items obvious.

### Planned UX improvements

#### A. Command insert path

Add a command-style overlay or inline mode:

- `/` opens insert search from the estimate sheet.
- `Cmd/Ctrl+K` opens global command palette with insert actions.
- Results are sourced from the same Component Library helper functions.
- Enter inserts highlighted component.
- Shift+Enter inserts and keeps picker open.
- Esc closes.

Result card minimum fields:

- component name;
- unit;
- default cost;
- discipline/category;
- source/confidence;
- recent/favorite indicator.

Fit:

- Very strong. This is the fastest improvement for repeated insertion.

#### B. Target-aware add buttons

Each library card should reflect target state:

- Area selected: `Add to Kitchen`.
- Non-area selected: `Choose target area`.
- No valid target: disabled with explanation.

Do not let Add silently fail.

#### C. Insert-and-edit mode

After inserting a component:

- focus its quantity cell immediately;
- show a short inserted confirmation;
- keep library search state if user is adding multiple items.

This reduces context switching.

#### D. Multi-insert / selected areas

Later behavior:

- select multiple area nodes in tree;
- insert component into all selected areas;
- show preview: `Insert 1 component into 4 areas`.

Fit:

- Useful for repeated items like lighting, outlets, paint, doors.

#### E. Assemblies tab

Add tabs or segmented view in the insert surface:

- Components;
- Assemblies;
- Templates;
- Recent.

Keep the sidebar picker-first. Full admin/editing belongs in `/workshop/components` later.

#### F. Source/confidence display

In compact cards, show one compact trust marker:

- `Library · Medium`
- `Supplier · Verify`
- `Custom · Manual`
- `Stale · Review`

Preview panel can show full metadata.

#### G. Shared component cleanup

Extract repeated raw controls into shared primitives before expanding sidebar complexity:

- `ControlSelect`
- `FilterPill`
- `CompactChip`
- `MenuItemButton`
- `CompactNumberField`
- `EmptyState`
- `InlineBadge`

This is required because future feature depth will otherwise multiply one-off buttons, chips, and inputs.

---

## 5.4 Header, totals, and review layer

### Current issue

The estimate header shows project total, row count, and area count. It does not yet function as a review command center.

### Improvement goals

- Surface risk and change signals without crowding the sheet.
- Make review mode fast.

### Planned UX improvements

#### A. Header status chips

Show compact, actionable chips:

- `142 rows`
- `8 areas`
- `₱4.82M total`
- `6 missing qty`
- `12 stale prices`
- `R02 +₱184k`

Clicking a chip applies a filter or opens a review panel.

#### B. Issues/review panel

Add a collapsible review panel or right-inspector mode:

- Missing quantity;
- Missing labor;
- Low confidence;
- Stale price;
- Unit mismatch;
- Manually overridden;
- Excluded but has cost;
- Added/changed since previous revision.

Fit:

- Strong after source/confidence fields exist.

#### C. Total change visibility

When revisions exist:

- show current total;
- show delta vs previous;
- show top changed areas/groups.

---

## 6. Domain features that make the estimator faster

## 6.1 Lightweight assemblies

### Why

Estimators rarely price one component at a time. They use repeated assemblies like door sets, paint room, bathroom fixture set, drywall wall, flooring area, or concrete slab.

### MVP behavior

Assembly contains:

- name;
- discipline;
- description;
- input fields;
- child components;
- child quantity formulas;
- default labor/other cost assumptions;
- source/confidence metadata.

Insertion flow:

1. Select area.
2. Open Insert.
3. Choose Assemblies.
4. Pick assembly.
5. Enter required dimensions/counts.
6. Preview child rows and subtotal.
7. Insert as collapsible group.
8. Child rows remain editable.
9. Edited child rows show `overridden`.

First recommended assemblies:

- Interior Door Assembly.
- Paint Room Assembly.
- Flooring Area Assembly.
- Baseboard/Trim Assembly.
- Bathroom Fixture Set.
- Kitchen Sink/Faucet Set.
- Basic Lighting Set.

### Fit

High, but after spreadsheet-speed editing and target-aware insertion.

## 6.2 Area and scope templates

### Why

Contractors reuse similar room/scope structures across projects.

### MVP behavior

Template types:

- project estimate template;
- area template;
- scope template;
- saved group template.

Actions:

- Create estimate from template.
- Insert area from template.
- Save selected area as template.
- Save selected rows/group as template.
- Clone previous project estimate as starting point.

### Fit

Very high. Templates directly reduce repeated manual setup.

## 6.3 Source, confidence, and needs-review metadata

### Why

The user needs to move fast but still know which numbers are trustworthy.

### MVP fields

- source type: library, supplier, previous project, manual, assembly, imported;
- confidence: high, medium, low, unknown;
- pricing date;
- source note;
- override status: default, edited, locked, needs review;
- stale threshold.

### UI behavior

- compact row badge;
- filter by low confidence/stale/needs review;
- metadata popover for full source details;
- warning count in area/tree/header.

### Fit

High. This supports contractor risk management without requiring supplier integrations.

## 6.4 Revision snapshots and deltas

### Why

Construction estimates change constantly. Revision speed is part of the product wedge.

### MVP behavior

- Save snapshot.
- Duplicate estimate as revision.
- Compare to previous.
- Row badges: added, removed, quantity changed, labor changed, cost changed, source changed.
- Header delta: total amount and percentage.
- Filter: changed since previous.

### Fit

Medium-high. Add after editing/insertion workflow becomes fast.

## 6.5 Alternates and exclusions

### Why

Contractors often price optional scope, deduct alternates, owner-supplied items, and exclusions.

### MVP behavior

Add row/group status:

- included;
- excluded;
- owner-supplied;
- allowance;
- provisional;
- alternate add;
- alternate deduct;
- by others.

Totals should show:

- base total;
- included alternates;
- excluded/optional total separately.

### Fit

Medium-high. Important before proposal/export, but not first editing-speed priority.

---

## 7. Prioritized implementation sequence

## Phase 0 — Governance and shared primitives

### Goal

Prevent future UI expansion from creating more one-off buttons, chips, inputs, and oversized text.

### Work

- Extract shared compact primitives used by this feature:
  - `ControlSelect`
  - `FilterPill`
  - `CompactChip`
  - `MenuItemButton`
  - `CompactNumberField`
  - `InlineBadge`
  - `EmptyState`
- Replace repeated raw controls in Component Library and tree/header where practical.
- Confirm visible text remains within the non-landing 12px max.

### Why first

The feature is about to become more complex. If primitives are not fixed early, every improvement will create more UI drift.

### Acceptance criteria

- No new feature-local raw button/search/icon-button patterns for repeated controls.
- Search uses shared `SearchInput` or an extension of it.
- Buttons use shared `Button` or a shared wrapper.
- Component docs identify which primitive owns each repeated pattern.

---

## Phase 1 — Make the current workflow fast

### 1. Target-aware insertion

Problem:

- Add can fail when selected node is not an area.

Solution:

- Add visible target label.
- Disable or redirect Add when target is invalid.
- Provide target-area picker for non-area nodes.

Acceptance criteria:

- User always knows where a component will be inserted.
- No silent no-op insertion.
- Tests cover area and non-area selection.

### 2. Insert-and-edit flow

Problem:

- After inserting, user still has to find the row and edit quantity.

Solution:

- Inserted row is highlighted briefly.
- Quantity cell receives focus.
- User can immediately type quantity.

Acceptance criteria:

- Add component → quantity field focused.
- Enter commits and recalculates total.

### 3. Keyboard editing baseline

Problem:

- Estimate row editing is slower than a spreadsheet.

Solution:

- Implement focus/edit states and Enter/Tab/Escape behavior for editable row fields.

Acceptance criteria:

- Enter, Tab, Shift+Tab, Escape behave predictably.
- Calculated cells cannot be edited.
- Invalid values show field-level error.

### 4. Functional estimate row search/filter

Problem:

- Header controls are visual only.

Solution:

- Wire row search.
- Add filters for missing qty, discipline, supplier, source/confidence when fields exist.

Acceptance criteria:

- Search filters visible rows in selected branch.
- Empty search result state is compact and actionable.

### 5. Functional tree search

Problem:

- Tree search is visual only.

Solution:

- Filter and highlight matching nodes.
- Enter navigates to selected match.

Acceptance criteria:

- Search query reveals parent paths for matched nodes.
- Keyboard navigation works.

---

## Phase 2 — Add spreadsheet-grade speed safely

### 1. Copy/paste cells and rows

Scope:

- Copy selected editable cells/rows.
- Paste from Excel/Sheets into selected editable cells.
- Validate before commit.

Acceptance criteria:

- Pasted quantity/cost values parse safely.
- Invalid cells are flagged, not silently ignored.
- Calculated cells reject paste.

### 2. Multi-row selection and bulk actions

Scope:

- Row selection checkboxes or keyboard row selection.
- Bulk action bar with affected count.

First actions:

- duplicate rows;
- delete rows;
- move to area;
- change discipline;
- change designation;
- mark needs quote;
- include/exclude.

### 3. Undo/redo

Scope:

- Undo row insert/delete/edit/move/duplicate.
- Redo last undone action.

Acceptance criteria:

- Destructive row actions are reversible.
- User receives compact feedback.

### 4. Quantity expressions

Scope:

- Arithmetic expressions in quantity field.
- Store evaluated quantity and expression note.

Acceptance criteria:

- `12*8`, `2*(10+12)`, and `=4*2.5` evaluate safely.
- Invalid expression shows clear inline error.
- No cross-row formulas.

---

## Phase 3 — Reuse: assemblies and templates

### 1. Component assemblies

Scope:

- Assembly tab in insert UI.
- Insert as collapsible group.
- Child rows editable.
- Overridden child rows marked.

Acceptance criteria:

- Inserted assembly creates multiple rows under selected area.
- Assembly subtotal updates from child rows.
- User can ungroup or edit child rows.

### 2. Area/scope templates

Scope:

- Insert area template.
- Save selected area/group as template.
- Preview template before insert.

Acceptance criteria:

- Template insertion creates nodes/rows in valid hierarchy.
- User can edit inserted template rows normally.

### 3. Grouping and subtotal rows

Scope:

- Group rows by discipline/assembly/custom group.
- Collapse/expand groups.
- Show group subtotals.

Acceptance criteria:

- Group subtotal equals visible child totals.
- Groups can be moved/duplicated without losing row metadata.

---

## Phase 4 — Trust and review

### 1. Source/confidence metadata

Scope:

- Add compact row badges.
- Metadata popover.
- Filter low-confidence/stale/needs-review rows.

Acceptance criteria:

- User can find all risky rows quickly.
- Source metadata does not crowd the main row.

### 2. Stale price / needs quote review

Scope:

- Pricing date age warning.
- Needs quote marker.
- Review chip in header and tree.

Acceptance criteria:

- Stale/low-confidence rows are visible at row, area, and project levels.

### 3. Review mode

Scope:

- View preset focused on warnings, source, changes, notes.

Acceptance criteria:

- User can switch from entry mode to review mode without losing selected context.

---

## Phase 5 — Revision speed

### 1. Estimate snapshots

Scope:

- Save snapshot.
- Duplicate as revision.
- Name revision and add notes.

### 2. Diff indicators

Scope:

- Compare to previous snapshot.
- Show row-level change badges.
- Show total delta.

### 3. Alternates and exclusions

Scope:

- Base / alternate add / alternate deduct / excluded / owner-supplied statuses.
- Totals separate included vs optional/excluded values.

---

## 8. What to defer

Do not build these until the focused estimate workflow earns them:

- PDF plan takeoff;
- drawing measurement sync;
- AI plan parsing;
- supplier quote marketplace;
- procurement/vendor bidding workflow;
- formal change order workflow;
- multi-user collaboration and permissions;
- accounting/ERP integration;
- complex nested parametric assemblies;
- full WBS/cost-code accounting engine;
- complete Excel formula engine;
- pivot-table/report designer;
- arbitrary spreadsheet formatting.

---

## 9. UI design constraints for implementation

These constraints are mandatory for this feature:

- Outside landing page, no visible UI text over 12px unless Philip explicitly approves a named exception.
- Normal app/table/control/body/button text should be around 10px.
- Meta labels and compact badges should be 8–9px.
- Do not create feature-local raw buttons, search inputs, icon buttons, chips, tabs, filters, dropdowns, cards, or panels when a shared primitive can exist.
- The estimate workspace must remain a hierarchical estimating workspace, not a generic spreadsheet clone.
- The center sheet is the primary work area; side panels must support it, not crowd it.
- Right Component Library sidebar must remain usable at a real minimum width of at least 320px.
- Prefer independent panel scrolling over document-level scrolling.
- Numeric values should use tabular numerals and right alignment where practical.
- Totals/rollups must look calculated, not manually editable.

---

## 10. Testing and verification plan

### Helper tests

Add or extend tests for:

- target resolver for insertion;
- component search ranking;
- row filter predicates;
- sort/group behavior;
- quantity expression parser;
- copy/paste parser;
- row total calculations;
- group subtotal calculations;
- warning/confidence/stale-price predicates.

### Component/interaction tests

Add tests for:

- Add component to selected area;
- Add component while non-area selected shows target requirement;
- Inserted row receives focus;
- keyboard Enter/Tab/Escape editing;
- invalid quantity/cost field behavior;
- row search/filter empty state;
- tree search navigation;
- bulk action affected row count;
- assembly insertion creates grouped child rows;
- undo restores deleted row.

### Accessibility checks

Verify:

- keyboard-only insertion path;
- grid/treegrid roles or equivalent semantic behavior;
- visible focus state;
- aria labels for icon-only controls;
- no drag-only functionality;
- dialogs/popovers trap/restore focus correctly.

### Validation commands

For docs-only changes:

```bash
git diff --check
```

For implementation changes:

```bash
bun run validate
git diff --check
```

For route/grid behavior changes where build output matters:

```bash
bun run build
```

For interactive flows after tests exist:

```bash
bun run test:e2e
```

---

## 11. Success metrics

Use these as qualitative product checks before implementation grows too broad:

- User can insert a known component into an area in under 5 seconds using keyboard search.
- User can add five common rows to an area without touching the mouse after the first target selection.
- User can edit quantities down a column using Enter/Tab without losing context.
- User always knows the current insertion target.
- User can identify missing quantities/stale prices/low-confidence rows without manually scanning every row.
- User can reuse a room/scope template instead of rebuilding repeated areas from scratch.
- User can see how a revision changed total cost.
- The interface remains compact, professional, and readable with no non-landing text above 12px.

---

## 12. Recommended immediate next slice

The next implementation slice should not jump straight to assemblies or revisions. The immediate highest-value slice is:

**Target-aware insert + insert-and-edit + keyboard editing baseline.**

### Why this slice

- It fixes a current usability defect: add can fail when non-area selected.
- It shortens the main workflow: insert component → edit quantity immediately.
- It establishes the interaction model needed for future spreadsheet-like improvements.
- It can be tested without adding backend persistence.

### Acceptance criteria for immediate slice

- Right sidebar shows current insertion target.
- Add button behavior is explicit for area and non-area selections.
- Inserted row highlights and focuses quantity field.
- Quantity field supports Enter/Tab/Escape baseline editing.
- Totals update after commit.
- No new one-off button/search/input patterns.
- All visible non-landing text remains ≤12px.
