# 03 - Modals, Popovers, And Overlays

Bindings for this doc defer to `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md`
(keystone) — overlay primitive exports, z-index tiers, glossary terms, and the
canonical phase map all live there. This doc binds the overlay/route-state work
to **Phase 0B (Overlay & Route-State Reliability)** and **Phase 4 (Templates
Browse/Insert/Editor Clarity)** of that map.

## Overlay Principle

Use the least disruptive surface that still preserves correctness. Each surface
below names the real primitive export it maps to (`ui/overlays/*`, keystone
"Overlay primitives" table):

- Modal dialog (`Modal` / `AppModal` / `BlurModal`, `ui/overlays/modal.tsx`): short, user-initiated, high-attention, blocking tasks.
- Alert dialog (`ConfirmDialog`, `ui/overlays/confirm-dialog.tsx`): destructive or consequence-heavy confirmation.
- Text-prompt dialog (the inline `ConfirmDialog` + child `<input>` pattern — there is NO standalone primitive): short named input that benefits from validation and focus control.
- Drawer/sheet (`Sheet` / `Drawer` family, `ui/overlays/sheet-drawer.tsx`): extended edit work where context should stay visible.
- Inspector dock (`ComponentInspectorDock.tsx`): read/compare/act on selected item without blocking browse.
- Popover (`ui/overlays/popover.tsx`): lightweight filters, display options, or short selection controls.
- Menu/context menu (`ui/dropdown-menu.tsx` / `ui/context-menu.tsx` / `ui/action-menu.tsx`): compact action list with no long-form input.
- Creatable combobox (`ui/creatable-combobox.tsx`): the Phase 4 template-move target selector.
- Tooltip (`ui/overlays/tooltip.tsx`): nonessential help only.

## Current Inventory

Paths are the real on-disk paths (keystone "Verified File Paths"). Note the
three most-cited surfaces — inspector, facet filter, bulk archive — are NOT under
`component-library-manager/`.

| Surface | Real path | Current primitive | Risk | Target (phase) |
| --- | --- | --- | --- | --- |
| Add Component | `component-library-manager/AddComponentModal.tsx` (2359 ln) | `Modal` | Too much work in one default surface; native dirty confirm (`window.confirm("Discard this component draft?")` :963) | Quick-add modal plus advanced progressive sections (Phase 3); replace native confirm with inline `ConfirmDialog` (Phase 0B) |
| Edit Component | `library/EditComponentDrawer.tsx` | `Sheet`/`Drawer` family | Source/confidence fields differ from Add | Normalize Add/Edit source fields onto the same columns (`pricing_source`, `confidence` free text) — Phase 3 |
| Component inspector dock | `library/ComponentInspectorDock.tsx` (315 ln) | inspector dock | Good pattern | Keep as primary compare/trust surface (Phase 2 hosts trust chips) |
| Bulk action toolbar | `workshop/BulkActionToolbar.tsx` (shared primitive `ui/bulk-action-toolbar.tsx`) | toolbar that opens `BulkDestructivePreviewModal` | Selection-action entry point; keep | Keep; entry point for the bulk-archive copy fix (Phase 0B) |
| Bulk archive | `workshop/BulkDestructivePreviewModal.tsx` | confirmation `Modal` | `confirmationHint` (:107-108) gates "This action cannot be undone." on `canExecute`, NOT on the verb — wrong for reversible archive | Branch the hint on `actionCopy.verb` so archive does not claim irreversibility (Phase 0B) |
| Component folder create/rename | `component-library-manager/ComponentLibraryManager.tsx` | `window.prompt("Folder name")` create :1493, rename :1515 | Inconsistent, weak validation/focus | Inline `ConfirmDialog` + child `<input>` text-prompt pattern from `TemplatesBrowseManager.tsx:531-895` (Phase 0B) |
| Component folder delete | `component-library-manager/ComponentLibraryManager.tsx` | `window.confirm` delete :1534 | Inconsistent, unclear consequence | Destructive `ConfirmDialog` (`ui/overlays/confirm-dialog.tsx`) — Phase 0B |
| Overview search | `library/overview/LibraryOverviewSearch.tsx` | combobox/listbox popup | Good base, but component result destination is weak | Preserve exact selected component as `?component=<id>` route state, owned by `LibraryPageClient.tsx` (Phase 1, route state lands Phase 0B) |
| Component facet filter | `library/component-facet-filter.tsx` | `Popover` | Applied state hidden outside popover | Add visible applied-filter chips + reset (Phase 1) |
| New Template | `component-library/NewTemplateModal.tsx` | `Modal` | Good for short creation | Keep, but maintain source summary clarity (Phase 4) |
| Insert Template | `library/templates-browse/InsertIntoEstimatePicker.tsx` | `Modal` | Target destination under-specified | Surface the explicit insert target via `resolveEstimateTemplateInsertTarget` (Phase 4) |
| Template rename/move/delete | `templates-browse/TemplatesBrowseManager.tsx` | `ConfirmDialog` + inline text-prompt (`:531-895`) | Already migrated; stronger than component folder flows | Use as the copy model; replace the move text-prompt with `ui/creatable-combobox.tsx` (Phase 4) |
| Template editor add/rename/delete | `template-editor/TemplateEditorClient.tsx` | `ConfirmDialog` + inline text-prompt | Already migrated off native prompts | Keep |

## Required Replacements

Replace these Library-owned native browser interactions. All four land in
**Phase 0B**; folder-prompt replacement lands HERE (early), NOT after Quick Add.
Each reuses the inline `ConfirmDialog` + child `<input>` text-prompt pattern from
`TemplatesBrowseManager.tsx:531-895` (state at `:531` via
`const [textPrompt, setTextPrompt]`; inline `ConfirmDialog`+`<input>` block through
`:895`; search its local `textPrompt` state) — there is no standalone
`PromptDialog`/`InputDialog` primitive to call.

- `component-library-manager/ComponentLibraryManager.tsx:1493`: folder create `window.prompt("Folder name")` -> inline text-prompt dialog; submit calls `createLibraryFolder`.
- `component-library-manager/ComponentLibraryManager.tsx:1515`: folder rename `window.prompt("Folder name")` -> inline text-prompt dialog; submit calls `renameLibraryFolder`.
- `component-library-manager/ComponentLibraryManager.tsx:1534`: folder delete `window.confirm("Delete \"<name>\"? Row items assigned to it will stay in the library without a folder.")` (exact current copy at :1534) -> destructive `ConfirmDialog`; confirm calls `deleteLibraryFolder`. The replacement must preserve the "row items stay in the library without a folder" consequence in the new dialog body (see `22-COPY-DECK-AND-MICROCOPY.md`).
- `component-library-manager/AddComponentModal.tsx:963`: dirty draft discard `window.confirm("Discard this component draft?")` -> inline `ConfirmDialog`.

In-scope adjacent file (do NOT call it out-of-scope — `00-PLAN.md` scope covers it):

- `src/components/workshop/component-library/index.tsx` is the estimate-page component-library panel and still carries native overlays: `window.confirm("Discard component changes?")` :939 and `window.prompt("Folder name")` :1428. Schedule it as a **Phase 3 rider** (Add/Edit Flow Split already touches this same estimate-page component-library panel, so the native-overlay replacement rides that change) — after the primary Library-page surfaces land in Phase 0B — using the same inline `ConfirmDialog`/text-prompt replacements. Owner: phase lead; tracked in `05-IMPLEMENTATION-ROADMAP.md`. Do not silently drop it.

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

This global checklist is verified via the manual ARIA/focus DOM suites
pre-registered in `24-EXECUTION-EVIDENCE-LEDGER.md` (the "Overlay a11y global
checklist" row binds these assertions to `...modal-a11y.test.tsx` and
`component-library-folder-actions.test.ts`; pass criteria = role/name present,
focus trapped, `Escape` closes the topmost only, focus returns to invoker) — there
is no axe harness (keystone "Test Commands"). Owner: implementer of each phase.

## Per-Overlay Acceptance Criteria

The global checklist above is necessary but not sufficient. Each overlay this
pack touches must satisfy a specific trigger / initial-focus / close / error /
focus-return contract. Verify these as manual ARIA/focus assertions in Testing
Library (there is NO axe/jest-axe harness — keystone "Test Commands"; adding
`jest-axe` is a separate net-new prerequisite). Run with `bun run test:dom` or
`vitest run tests/vitest/<file>` — never `bun test`, which only runs
`tests/unit`.

| Overlay | Trigger | Initial focus | Close / cancel | Error focus | Focus return |
| --- | --- | --- | --- | --- | --- |
| Folder create (inline text-prompt) | "New folder" button in folder tree (`ComponentLibraryManager.tsx`) | the `<input>` | `Escape` or Cancel; no folder created | on `createLibraryFolder` failure, move focus to the inline error and keep the input value | the "New folder" trigger |
| Folder rename (inline text-prompt) | folder row rename action | the `<input>`, pre-filled + selected | `Escape` or Cancel; name unchanged | on `renameLibraryFolder` failure, focus inline error, preserve typed value | the rename trigger / row |
| Folder delete (destructive `ConfirmDialog`) | folder row delete action | the destructive confirm button (NOT auto-confirm) | `Escape` or Cancel; folder kept | on `deleteLibraryFolder` failure, focus dialog error, dialog stays open | the delete trigger / row |
| Add dirty-discard (`ConfirmDialog` in `AddComponentModal`) | Close/`Escape` on a dirty Add modal | "Keep editing" (safe default), NOT "Discard" | confirm discards; cancel returns to the form | n/a (local decision, no server call) | the Add form field last focused, or the Add trigger if the modal also closes |
| Bulk archive (`BulkDestructivePreviewModal`) | `BulkActionToolbar` archive action | the modal's primary confirm | `Escape` or Cancel; selection preserved | on `executeBulkArchiveLibraryComponents` failure, focus the modal error, keep selection | the toolbar / restored selection |
| Quick Add (`Modal`) | "Add component" button | the `name` field (first required) | `Escape` (clean) closes; dirty `Escape` routes to the dirty-discard confirm above | on `createCostLibraryComponent` failure, focus the form error summary, keep entered values | the "Add component" trigger |
| Overview search popup | search input on `LibraryOverview` | search input | `Escape` closes the listbox, input retains text | n/a | input; selecting a `searchLibraryOverview` result sets `?component=<id>` (owned by `LibraryPageClient.tsx`, doc 13 "Component Route State"). On open from a search result, move focus INTO the inspector dock (first focusable / dialog heading); on close, return focus to the originating row/card per doc 10 "Close behavior" / doc 13. The open/close focus contract is single-sourced in doc 13 "Component Route State". |
| Facet filter (`Popover`) | facet trigger button (`aria-haspopup`) | first interactive control in the popover | `Escape` closes popover; applied filters persist as visible chips | n/a | the facet trigger |
| Insert template (`InsertIntoEstimatePicker` `Modal`) | "Insert into estimate" action | the insert-target selector | `Escape` or Cancel; nothing inserted | on `resolveEstimateTemplateInsertTarget` failure, focus the target error | the insert trigger |
| Template move (`creatable-combobox`) | move action on a template row | the combobox input | `Escape` closes; template unmoved | on move failure, focus combobox error, keep the typed target | the move trigger / row |

Proving suites for each overlay row are pre-registered in
`24-EXECUTION-EVIDENCE-LEDGER.md`, keyed by overlay name: Folder
create/rename/delete -> `vitest run tests/vitest/component-library-folder-actions.test.ts`
(pass: input focused on open, `Escape` closes with no mutation, failure focuses the
inline error and preserves the value, focus returns to trigger); Add dirty-discard +
Quick Add -> `vitest run tests/vitest/library-add-component-modal-a11y.test.tsx`;
Overview search -> `vitest run tests/vitest/library-overview-navigation.test.tsx`.
Owner: implementer of the owning phase (0B / 1 / 3).

## Overlay Stacking Policy

The shared overlay primitives already define exact z-index tiers as Tailwind
classes (keystone "Overlay primitives + z-index tiers"). Use these literal
classes; do not approximate:

- Modal: `z-[1000]`.
- Menu / popover: `z-[1050]`.
- Tooltip: `z-[1100]`.

Future Library work should avoid local z-index inventions. If a Library overlay needs a different layer, update the shared primitive policy instead of adding one-off classes in the feature component.

## Modal Count Audit For Top Tasks

Before implementation, count overlays per top task and reduce where possible:

| Task | Current likely overlay chain | Target |
| --- | --- | --- |
| Find component from Overview | Search popup, then route drop | Search popup; selecting a `searchLibraryOverview` result sets `?component=<id>` (owned by `LibraryPageClient.tsx`, doc 13 "Component Route State") and opens the inspector dock in Components (Phase 1) |
| Add quick component | Modal, nested listboxes/popovers, native discard confirm | Short Quick Add `Modal`, nested listboxes, inline `ConfirmDialog` discard (Phase 3 form split; Phase 0B confirm) |
| Edit component | Inspector dock, `Sheet`/`Drawer` family, dropdowns | Keep |
| Create folder | Native `window.prompt` | Inline text-prompt dialog (`ConfirmDialog`+`<input>`) |
| Delete folder | Native `window.confirm` | Destructive `ConfirmDialog` |
| Browse template then insert | Preview dock, insert picker | Preview dock, `InsertIntoEstimatePicker` with explicit target via `resolveEstimateTemplateInsertTarget` |
| Rename/move template | Inline text-prompt | Keep rename; replace move text-prompt with `ui/creatable-combobox.tsx` (Phase 4) |

## Copy Policy

- Destructive copy should name the object and consequence.
- Reversible actions should not say "cannot be undone". Concrete fix: in `BulkDestructivePreviewModal.tsx`, `confirmationHint` (:107-108) currently sets "This action cannot be undone." whenever `canExecute` is true — independent of the verb. Branch the irreversibility line on `actionCopy.verb` so reversible archive does not falsely claim irreversibility. Source strings live in `22-COPY-DECK-AND-MICROCOPY.md`.
- Archive, hide, delete, and detach should use distinct copy.
- Confirmation actions should use verbs that match the domain action (the modal already exposes `actionCopy.verb` / `actionCopy.gerund`).
- Helper copy should be short enough for a compact professional workspace.

## Implementation Guardrails

- Do not add a new overlay primitive for this work unless an existing primitive cannot satisfy the behavior. For named input specifically, reuse the inline `ConfirmDialog`+`<input>` pattern (`TemplatesBrowseManager.tsx:531-895`); there is no standalone text-prompt primitive. Extracting one is a separately scoped task, not an implicit dependency of Phase 0B.
- Do not place long forms in alert dialogs (`ConfirmDialog` is for confirmation, not data entry beyond a single named input).
- Do not nest modals for normal Library tasks.
- Do not use browser `window.prompt`/`window.confirm` for Library-owned flows.
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
