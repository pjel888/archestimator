# 03 - Modals, Popovers, And Overlays

## Overlay Principle

Use the least disruptive surface that still preserves correctness.

- Modal dialog: short, user-initiated, high-attention, blocking tasks.
- Alert dialog: destructive or consequence-heavy confirmation.
- Text-prompt dialog: short named input that benefits from validation and focus control.
- Drawer/sheet: extended edit work where context should stay visible.
- Inspector dock: read/compare/act on selected item without blocking browse.
- Popover: lightweight filters, display options, or short selection controls.
- Menu/context menu: compact action list with no long-form input.
- Tooltip: nonessential help only.

## Current Inventory

| Surface | Component | Current primitive | Risk | Target |
| --- | --- | --- | --- | --- |
| Add Component | `component-library-manager/AddComponentModal.tsx` | Modal | Too much work in one default surface; native dirty confirm | Quick-add modal plus advanced progressive sections; design-system dirty confirm |
| Edit Component | `library/EditComponentDrawer.tsx` | Sheet drawer | Source/confidence model differs from add | Normalize source/confidence fields with Add Component |
| Component Inspector | `library/ComponentInspectorDock.tsx` | Right dock | Good pattern | Keep as primary compare/trust surface |
| Bulk Archive | `BulkDestructivePreviewModal.tsx` | Confirmation modal | Copy conflicts with reversible archive | Action-specific copy |
| Component folder create/rename | `ComponentLibraryManager.tsx` | `window.prompt` | Inconsistent, weak validation/focus | Shared text-prompt dialog |
| Component folder delete | `ComponentLibraryManager.tsx` | `window.confirm` | Inconsistent, unclear consequence | Shared destructive `ConfirmDialog` |
| Overview search | `LibraryOverviewSearch.tsx` | Combobox/listbox popup | Good base, but component result destination is weak | Preserve exact selected component in route state |
| Component facet filter | `component-facet-filter.tsx` | Popover | Applied state hidden outside popover | Add visible applied filter strip/chips |
| New Template | `component-library/NewTemplateModal.tsx` | Modal | Good for short creation | Keep, but maintain source summary clarity |
| Insert Template | `templates-browse/InsertIntoEstimatePicker.tsx` | Modal | Target destination under-specified | Add group/area target disclosure or selection |
| Template rename/move/delete | `TemplatesBrowseManager.tsx` | ConfirmDialog/text prompt | Stronger than component folder flows | Use as model, replace move prompt with combobox later |
| Template editor add/rename/delete | `template-editor/TemplateEditorClient.tsx` | ConfirmDialog/text prompt | Good | Keep |

## Required Replacements

Replace these Library-owned native browser interactions:

- `ComponentLibraryManager.tsx`: folder create `window.prompt`.
- `ComponentLibraryManager.tsx`: folder rename `window.prompt`.
- `ComponentLibraryManager.tsx`: folder delete `window.confirm`.
- `AddComponentModal.tsx`: dirty draft discard `window.confirm`.

Adjacent follow-up:

- `src/components/workshop/component-library/index.tsx` still has native prompts/confirms in the estimate-page component library panel. This is outside the primary Library page scope, but shared component-library consistency will eventually require aligning it too.

## Focus And Keyboard Requirements

Every Library overlay implementation should prove:

- The opener has the right popup cue when applicable, such as `aria-haspopup`.
- Modal content uses `role="dialog"` or `role="alertdialog"` and has a clear accessible name.
- Modal content is actually modal only when outside content is inert and focus is trapped.
- Initial focus is useful, not arbitrary.
- `Tab` and `Shift+Tab` cycle within modal dialogs.
- `Escape` closes the topmost dismissible overlay only.
- Closing returns focus to the invoking element unless the invoking element no longer exists.
- Nested popups inside modals close before the modal itself.
- Menus open with `Enter`/`Space` and focus the first item.
- Combobox/listbox popups keep `aria-activedescendant` in sync with keyboard navigation.
- Tree views distinguish focus and selection.

## Overlay Stacking Policy

The existing shared popup system already has a useful ordering model:

- Modal: around `z-[1000]`.
- Menu/popover: around `z-[1050]`.
- Tooltip: around `z-[1100]`.

Future Library work should avoid local z-index inventions. If a Library overlay needs a different layer, update the shared primitive policy instead of adding one-off classes in the feature component.

## Modal Count Audit For Top Tasks

Before implementation, count overlays per top task and reduce where possible:

| Task | Current likely overlay chain | Target |
| --- | --- | --- |
| Find component from Overview | Search popup, then route drop | Search popup, selected inspector opens in Components |
| Add quick component | Modal, nested listboxes/popovers, native discard confirm | Short modal, nested listboxes, DS discard confirm |
| Edit component | Inspector dock, drawer, dropdowns | Keep |
| Create folder | Native prompt | Text-prompt dialog |
| Delete folder | Native confirm | Destructive dialog |
| Browse template then insert | Preview dock, insert picker | Preview dock, insert picker with explicit target |
| Rename/move template | Text prompt | Keep, later replace move with combobox |

## Copy Policy

- Destructive copy should name the object and consequence.
- Reversible actions should not say "cannot be undone".
- Archive, hide, delete, and detach should use distinct copy.
- Confirmation actions should use verbs that match the domain action.
- Helper copy should be short enough for a compact professional workspace.

## Implementation Guardrails

- Do not add a new overlay primitive for this work unless an existing primitive cannot satisfy the behavior.
- Do not place long forms in alert dialogs.
- Do not nest modals for normal Library tasks.
- Do not use browser prompts/confirms for Library-owned flows.
- Do not put critical information only in placeholder text or tooltip content.

## Screen Reader And State Announcement Addendum

Use concise live-region announcements for:

- selected component/template changed from a search result or URL param
- inspector opened or closed
- filters changed and result count updated
- destructive action completed
- insert target changed
- mutation failed while previous context was preserved

Do not announce every visual badge. Source-trust badges need accessible names on
focusable rows/cards/inspector content, while result-count and mutation changes
use live announcements.

Every overlay implementation should also define:

- permission-denied announcement
- concurrent-change announcement
- mutation-success announcement
- error focus target
- focus return when the trigger no longer exists

Advanced Add must not become a long modal with every possible field visible. Use
a full editor page or persistent drawer when the user needs source
reconciliation, attachments, assemblies, price history, or provider-mapping
work.
