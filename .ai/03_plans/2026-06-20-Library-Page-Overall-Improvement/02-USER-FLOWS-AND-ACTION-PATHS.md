# 02 - User Flows And Action Paths

## Flow 1 - Find A Component From Overview

Current path:

1. User lands on `/workshop/library`.
2. User searches in `LibraryOverviewSearch`.
3. Template results open the template editor.
4. Component results route to `/workshop/library/components` without selecting the item.

Friction:

- The exact item intent is lost.
- The user may need to search again or scan the folder tree.
- Recent component cards have the same issue.

Target path:

1. Search result or recent card routes to `/workshop/library/components?component=<id>`.
2. Components route opens the inspector for that item.
3. The card is highlighted, scrolled into view, and focus lands on a sensible inspector heading or close/edit action.
4. Back returns to Overview with the search state or at least route history intact.

Priority: P1

## Flow 2 - Browse, Filter, And Inspect Components

Current path:

1. User enters Components tab.
2. Left tree scopes folders/suppliers/brands.
3. Search and facet filters narrow catalogue cards.
4. User opens inspector from a card.
5. User can edit, duplicate, archive, or promote a projection.

Strengths:

- Strong metadata on cards and inspector.
- Cache warming keeps route transitions efficient.
- Folder tree and selected branch context are useful.

Friction:

- Applied filter state is mostly hidden behind the filter popover.
- Card format is slower for maintenance comparison.
- Component exact selection is not URL-addressable enough yet.

Target path:

- Keep the current browse model.
- Add visible applied filter chips or a compact applied-filter strip.
- Add clear-all and per-category reset.
- Add dense list/table mode after P0/P1 are stable.
- Make selected component state URL-driven and shareable.

Priority: P1 to P3

## Flow 3 - Add A Component

Current path:

1. User clicks Add Component from Overview or Components.
2. Query param `?add=component` can open the modal from Overview.
3. Large modal collects identity, folders, variants, costs, measurement, attachments, lifecycle, and activity.
4. Dirty close uses native confirm.

Friction:

- The modal is too large for quick catalog capture.
- Advanced fields compete with required fields.
- Native discard confirm breaks overlay consistency.

Target path:

- Default to Quick Add:
  - Name.
  - Folder.
  - Unit.
  - Unit cost.
  - Pricing date.
  - Source/supplier or source note.
  - Confidence.
- Offer Advanced Catalog Record:
  - Variants.
  - Cost entries.
  - Measurements.
  - Attachments.
  - Lifecycle and activity.
- Use shared confirmation for dirty close.
- Preserve focus return to the opener and restore draft state only when intentionally supported.

Priority: P1/P2

## Flow 4 - Manage Component Folders

Current path:

1. User creates, renames, or deletes folders from the component tree.
2. Create/rename use native prompt.
3. Delete uses native confirm.

Friction:

- Native prompts are inconsistent with the rest of Library.
- Error recovery and validation cannot be styled consistently.
- Focus return is browser-controlled rather than product-controlled.

Target path:

- Use a shared text-prompt dialog for create/rename.
- Use a destructive confirmation dialog for delete.
- Show exact folder name and consequence copy.
- Show inline mutation errors without closing.
- Return focus to the invoking menu/button.

Priority: P1

## Flow 5 - Archive Components In Bulk

Current path:

1. User checks component cards.
2. Bulk toolbar appears.
3. Bulk archive preview modal shows affected components and confirmation.

Strengths:

- Typed confirmation and server preview hash are good safety patterns.
- Selection mode is explicit.

Friction:

- Current copy conflicts about reversibility.
- Bulk action scope could expand later, but archive copy must be fixed first.

Target path:

- Copy reflects the actual action.
- Archive says hidden/restorable if reversible.
- Irreversible delete language is used only for delete.
- Future bulk actions can include move folder, lifecycle update, source refresh, and export.

Priority: P2

## Flow 6 - Browse Templates

Current path:

1. User enters Templates tab.
2. Left tree scopes template groups.
3. Gallery rows open preview dock or editor.
4. User can insert into an estimate, rename, duplicate, move, delete, or create template.

Strengths:

- Tree/gallery/preview model is clear.
- Template browse already uses design-system dialogs for rename/move/delete.
- Preview dock preserves browse context.

Friction:

- Move prompt is text-based and will not scale well.
- Trust/source confidence for template contents is not prominent.

Target path:

- Replace move text entry with a group combobox/select.
- Add template confidence summary when templates contain component-backed rows.
- Keep preview in dock, not modal, because users compare while browsing.

Priority: P2/P3

## Flow 7 - Insert Template Into Estimate

Current path:

1. User selects Insert into estimate.
2. Modal asks for project and estimate.
3. Submit resolves target group/area.

Friction:

- The final insert destination is implicit.
- Empty/error target states arrive late.

Target path:

- Picker displays Project, Estimate, and group/area target.
- If only one valid target exists, disclose it before submit.
- Submit remains disabled until target is valid.
- Success offers "Open estimate".
- Failure remains inline and keeps selections.

Priority: P1/P2

## Flow 8 - Edit Template

Current path:

1. User opens a template editor route.
2. Left tree manages structure.
3. Center sheet edits rows.
4. Right dock can insert components.
5. Add/rename/delete actions use design-system confirmations.

Strengths:

- Template editor is already closer to the desired overlay model.
- Self-insert prevention exists.
- Inline quantity and optimistic row behavior are covered by tests.

Friction:

- Source confidence for rows is not prominent enough.
- Insert target fallback logic can feel implicit.

Target path:

- Show source/trust chips for component-backed rows.
- Add source-change or stale-cost indicators when data exists.
- Keep add/rename/delete dialog pattern as the model for component folder actions.

Priority: P2
