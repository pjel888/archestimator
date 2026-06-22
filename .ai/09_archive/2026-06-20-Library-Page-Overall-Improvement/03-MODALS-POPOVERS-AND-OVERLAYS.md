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
`TemplatesBrowseManager.tsx:531-883` (state at `:531` via
`const [textPrompt, setTextPrompt]`; inline `ConfirmDialog`+`<input>` block through
`:883`; search its local `textPrompt` state) — there is no standalone
`PromptDialog`/`InputDialog` primitive to call.

### The PromptDialog absence (precision note — closes the §3 gap)

A `PromptDialog` / `InputDialog` primitive **does not exist** in this codebase.
Verified 2026-06-21: `rg -l "PromptDialog\|InputDialog" src/components/ui/` → 0 hits;
`rg -l "PromptDialog\|InputDialog" src/` → 0 hits (no definition, no consumer). The
text-prompt pattern (a named-input dialog with validation + focus control) is implemented
**inline** as a `ConfirmDialog` (`ui/overlays/confirm-dialog.tsx`) hosting a child
`<input>` in its `children` slot, driven by a local `textPrompt` state hook. The canonical
instance is `TemplatesBrowseManager.tsx:531-883` (folder create/rename + template
rename/move). The four Phase-0B replacements below MUST clone this inline pattern; they
MUST NOT assume a primitive exists. If a future refactor extracts a shared `PromptDialog`,
it is **separately scoped work** (not an implicit Phase-0B dependency) and MUST preserve
the `ConfirmDialog` prop contract (`open`, `onOpenChange`, `title`, `description?`,
`children`, `variant?`, `onConfirm`, `initialFocusRef?` — see doc 23 §Prop-level API) so
existing call sites migrate without a behavior change.

- `component-library-manager/ComponentLibraryManager.tsx:1493`: folder create `window.prompt("Folder name")` -> inline text-prompt dialog; submit calls `createLibraryFolder`.
- `component-library-manager/ComponentLibraryManager.tsx:1515`: folder rename `window.prompt("Folder name")` -> inline text-prompt dialog; submit calls `renameLibraryFolder`.
- `component-library-manager/ComponentLibraryManager.tsx:1534`: folder delete `window.confirm("Delete \"<name>\"? Row items assigned to it will stay in the library without a folder.")` (exact current copy at :1534) -> destructive `ConfirmDialog`; confirm calls `deleteLibraryFolder`. The replacement must preserve the "row items stay in the library without a folder" consequence in the new dialog body (see `22-COPY-DECK-AND-MICROCOPY.md`).
- `component-library-manager/AddComponentModal.tsx:963`: dirty draft discard `window.confirm("Discard this component draft?")` -> inline `ConfirmDialog`.

Phase-later residual file (resolves C-003/C-017 — tracked, NOT in phases 0A-5 critical path):

- `src/components/workshop/component-library/index.tsx` is the estimate-page component-library panel and still carries native overlays: `window.confirm("Discard component changes?")` :939 and `window.prompt("Folder name")` :1428. It is **Phase-later residual — tracked, not in phases 0A-5 critical path** (keystone "Verified File Paths"; see `05-IMPLEMENTATION-ROADMAP.md` §Phase-later). Do NOT silently drop it, and do NOT describe it as "in-scope adjacent" or "out-of-scope" — the canonical disposition is Phase-later residual. When eventually touched, it reuses the same inline `ConfirmDialog`/text-prompt replacements and inherits the per-overlay acceptance + telemetry rows below. Owner: phase lead.

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
focus-return contract, PLUS a per-overlay flag / rollback / telemetry event /
browser-proof boundary / i18n-RTL row. Verify the a11y columns as manual
ARIA/focus assertions in Testing Library (there is NO axe/jest-axe harness
today — keystone "Test Commands"; C-014 — adding `jest-axe` is a Phase 0A
net-new prerequisite, not assumed). Run with `bun run test:dom` or
`vitest run tests/vitest/<file>` — never `bun test`, which only runs
`tests/unit` (C-005).

Flag names, rollback, and telemetry event names are canonical:
flags come from `21-FEATURE-FLAGS-AND-ROLLOUT.md`; telemetry events come from
`20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md` (the overlay-open/close family
reuses `overlay.opened_announcement`/`overlay.closed_announcement` from
doc 22 §12A; the four canonical overlay lifecycle events are
`overlay_opened` / `overlay_closed` / `overlay_error` / `overlay_focus_returned`);
i18n keys come from `22-COPY-DECK-AND-MICROCOPY.md`; RTL rules from
`28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md`.

| Overlay | Trigger | Initial focus | Close / cancel | Error focus | Focus return | flag | rollback | telemetry event | browser-proof | i18n/RTL |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Folder create (inline text-prompt) | "New folder" button in folder tree (`ComponentLibraryManager.tsx`) | the `<input>` | `Escape` or Cancel; no folder created | on `createLibraryFolder` failure, move focus to the inline error and keep the input value | the "New folder" trigger | `library_folder_dialogs` | redeploy flag=false (build-time env; C-010) | `overlay_opened` on open, `overlay_closed`/`overlay_focus_returned` on close, `overlay_error` on `createLibraryFolder` failure | Playwright (jsdom ARIA/focus + e2e folder CRUD) | key-based; input is `dir="auto"` per doc 28 §5 |
| Folder rename (inline text-prompt) | folder row rename action | the `<input>`, pre-filled + selected | `Escape` or Cancel; name unchanged | on `renameLibraryFolder` failure, focus inline error, preserve typed value | the rename trigger / row | `library_folder_dialogs` | redeploy flag=false | `overlay_opened`/`overlay_closed`/`overlay_focus_returned`; `overlay_error` on rename failure | Playwright | key-based |
| Folder delete (destructive `ConfirmDialog`) | folder row delete action | the destructive confirm button (NOT auto-confirm) | `Escape` or Cancel; folder kept | on `deleteLibraryFolder` failure, focus dialog error, dialog stays open | the delete trigger / row | `library_folder_dialogs` | redeploy flag=false | `overlay_opened`/`overlay_closed`/`overlay_focus_returned`; `overlay_error` on delete failure | Playwright | key-based; close/X mirrors to top-left under `dir="rtl"` (doc 28 §5) |
| Add dirty-discard (`ConfirmDialog` in `AddComponentModal`) | Close/`Escape` on a dirty Add modal | "Keep editing" (safe default), NOT "Discard" | confirm discards; cancel returns to the form | n/a (local decision, no server call) | the Add form field last focused, or the Add trigger if the modal also closes | `library_folder_dialogs` (overlay policy) | git revert | `overlay_opened`/`overlay_closed`; `quick_add_abandoned` on confirm discard | jsdom | key-based |
| Bulk archive (`BulkDestructivePreviewModal`) | `BulkActionToolbar` archive action | the modal's primary confirm | `Escape` or Cancel; selection preserved | on `executeBulkArchiveLibraryComponents` failure, focus the modal error, keep selection | the toolbar / restored selection | n/a (copy fix on existing modal) | git revert | `overlay_opened`/`overlay_closed`; `component.archived_announcement` (doc 22 §12A) on success | jsdom | ICU plural `{n}` (doc 22 §12) |
| Quick Add (`Modal`) | "Add component" button | the `name` field (first required) | `Escape` (clean) closes; dirty `Escape` routes to the dirty-discard confirm above | on `createCostLibraryComponent` failure, focus the form error summary, keep entered values | the "Add component" trigger | `library_quick_add` | redeploy flag=false | `overlay_opened`/`overlay_closed`; `quick_add_started`/`quick_add_saved`/`quick_add_failed` (doc 20 §6) | Playwright | key-based |
| Overview search popup | search input on `LibraryOverview` | search input | `Escape` closes the listbox, input retains text | n/a | input; selecting a `searchLibraryOverview` result sets `?component=<id>` (owned by `LibraryPageClient.tsx`, doc 13 "Component Route State"). On open from a search result, move focus INTO the inspector dock (first focusable / dialog heading); on close, return focus to the originating row/card per doc 10 "Close behavior" / doc 13. The open/close focus contract is single-sourced in doc 13 "Component Route State". | `library_component_deep_link` | redeploy flag=false → broad route, no inspector deep-link | `overlay_opened`/`overlay_closed` (listbox open/close); `search.result_announcement` (doc 22 §12A) on result-set change | Playwright | ICU plural `{count}` (doc 22 §12A); RTL: input aligns right, chips mirror (doc 28 §5) |
| Facet filter (`Popover`) | facet trigger button (`aria-haspopup`) | first interactive control in the popover | `Escape` closes popover; applied filters persist as visible chips | n/a | the facet trigger | `library_component_deep_link` (Phase 1 applied-filter chips) | redeploy flag=false | `overlay_opened`/`overlay_closed`; `filter.applied_announcement` (doc 22 §12A) | jsdom | key-based; RTL: chips mirror, input aligns right (doc 28 §5) |
| Insert template (`InsertIntoEstimatePicker` `Modal`) | "Insert into estimate" action | the insert-target selector | `Escape` or Cancel; nothing inserted | on `resolveEstimateTemplateInsertTarget` failure, focus the target error | the insert trigger | `library_trust_chips` | redeploy flag=false | `overlay_opened`/`overlay_closed`; `insert_target_confirmed`/`insert_target_mismatch` (doc 20 §6) | Playwright | key-based |
| Template move (`creatable-combobox`) | move action on a template row | the combobox input | `Escape` closes; template unmoved | on move failure, focus combobox error, keep the typed target | the move trigger / row | `library_trust_chips` | redeploy flag=false | `overlay_opened`/`overlay_closed`; `overlay_error` on move failure | Playwright | key-based |

> **C-010 (rollback shape):** every build-time-flag rollback above is a
> **redeploy of the previous env (fix-forward, ~5 min)**, NOT an instant kill;
> a runtime kill-switch is Phase-later. See
> `21-FEATURE-FLAGS-AND-ROLLOUT.md` §Rollback mapping.

Proving suites for each overlay row are pre-registered in
`24-EXECUTION-EVIDENCE-LEDGER.md`, keyed by overlay name: Folder
create/rename/delete -> `vitest run tests/vitest/component-library-folder-actions.test.ts`
(pass: input focused on open, `Escape` closes with no mutation, failure focuses the
inline error and preserves the value, focus returns to trigger); Add dirty-discard +
Quick Add -> `vitest run tests/vitest/library-add-component-modal-a11y.test.tsx`;
Overview search -> `vitest run tests/vitest/library-overview-navigation.test.tsx`.
Owner: implementer of the owning phase (0B / 1 / 3).

### Mobile + RTL pass per overlay (closes the §3 "limited RTL/i18n/mobile" gap)

Every overlay row above already carries an `i18n/RTL` column; this subsection makes the
**mobile** (touch + small-viewport) and **RTL** behavior explicit per overlay, bound to
the breakpoint contract in doc 35 §9 and the bidi rules in doc 28 §5. "Mobile" = `<768px`;
"RTL" = `[dir="rtl"]`.

| Overlay | Mobile (`<768px`) | RTL (`[dir="rtl"]`) | Binding |
| --- | --- | --- | --- |
| Folder create/rename (text-prompt) | full-width dialog; `<input>` keeps 16px tap padding; confirm/cancel buttons stack if needed | `<input>` is `dir="auto"`; dialog close/X mirrors to top-left (doc 28 §5); submit-on-Enter preserved | doc 35 §9 mobile row; doc 28 §5 |
| Folder delete (destructive confirm) | full-width; destructive confirm button ≥44px touch target | close/X mirrors; "Delete" verb stays untranslated (verb localization via doc 22) | doc 31 §4 touch target; doc 28 §5 |
| Add dirty-discard | full-width; "Keep editing" stays the safe default | button order mirrors (cancel at reading-start) | doc 22 §discard copy |
| Bulk archive | full-width; selection count + archive preview scroll vertically | preview list mirrors; `{n}` plural per doc 22 §12 | `BulkDestructivePreviewModal.tsx:107` |
| Quick Add (`Modal`) | full-width; required fields stay reachable above the fold; advanced fields collapse | field labels right-align; validation icons mirror | `AddComponentModal.tsx` |
| Overview search popup | listbox becomes full-width dropdown; result rows ≥44px touch height | input aligns right; result chips mirror | doc 28 §5 |
| Facet filter (`Popover`) | popover becomes full-width bottom sheet on mobile (via `side` prop) | applied-filter chips mirror via `flex-row-reverse` (doc 23 §RTL) | doc 23 §Applied-Filter Chip |
| Insert template (`InsertIntoEstimatePicker`) | full-width; target selector stays usable one-handed | target list mirrors; `{estimateName}` interpolation per doc 22 §10 | `InsertIntoEstimatePicker.tsx` |
| Template move (`CreatableCombobox`) | combobox dropdown becomes full-width; options ≥44px touch height | input aligns right; `dir="auto"` on the combobox input | `ui/creatable-combobox.tsx:210` |
| Edit Component drawer | full-width drawer from the right (or bottom on mobile per `side` prop) | drawer direction mirrors — opens from the left under RTL | `ui/overlays/sheet-drawer.tsx` `side` prop |
| Inspector drawer (narrow) | single glass panel on screen; no nested glass (doc 35 §9 mobile row) | drawer direction mirrors | doc 35 §9 |

**Mobile testing boundary:** every overlay's mobile behavior is **Playwright-REQUIRED**
(jsdom cannot prove touch-target size, viewport-driven `side` selection, or full-width
dropdown layout). The Playwright capture for each overlay at `<768px` is registered in
doc 29; the pass criterion is "no overlay renders below 320px width, no touch target below
44×44px, and the overlay's focus/focus-return contract from the table above still holds."
**RTL testing boundary:** jsdom proves the `dir="auto"` / `flex-row-reverse` class is
present on the right elements; Playwright (with `dir="rtl"` on `<html>`) proves the visual
mirror. Both are registered in doc 29 §RTL capture list.

## Overlay Stacking Policy

The shared overlay primitives already define exact z-index tiers as Tailwind
classes (keystone "Overlay primitives + z-index tiers"). Use these literal
classes; do not approximate:

- Modal: `z-[1000]`.
- Menu / popover: `z-[1050]`.
- Tooltip: `z-[1100]`.

Future Library work should avoid local z-index inventions. If a Library overlay needs a different layer, update the shared primitive policy instead of adding one-off classes in the feature component.

## Overlay Surface Variants — liquid glass (cross-ref [35](35-LIQUID-GLASS-LIBRARY-UX-SPEC.md) §5)

The marquee UX ask is a liquid-glass overlay treatment matching the workshop
shell (sidebar / dashboard / estimate-sheet). Wherever this doc binds a Library
overlay to a primitive, the glass layer is owned by
`35-LIQUID-GLASS-LIBRARY-UX-SPEC.md` §5 (the binding material/grid layer for
the Library visual language). This doc does NOT re-spec the glass tokens or
slots — it only states the per-overlay contract:

| Overlay | Glass material (per [35](35-LIQUID-GLASS-LIBRARY-UX-SPEC.md) §5) | One-blur-per-region | Phase |
| --- | --- | --- | --- |
| `Modal` / `AppModal` / `InsertIntoEstimatePicker` / `BulkDestructivePreviewModal` | **paper** content panel; scrim = translucent dark wash, NO panel blur. Forms/tables stay crisp and focus order stays unambiguous. (`BlurModal` exists if a frosted panel is genuinely wanted — use sparingly.) | yes — scrim may carry the single region blur, the panel does not | 0B/3/4 |
| `ConfirmDialog` (folder delete, Add dirty-discard) | paper panel; destructive variant keeps `danger` tokens | yes — scrim only | 0B |
| Text-prompt dialog (folder create/rename) | paper `ConfirmDialog` + child `<input>` | yes — scrim only | 0B |
| `InspectorDrawer` (narrow inspector, < `lg`) | **glass** panel (single blur); children translucent | yes — the drawer IS a glass panel (it is a rail moved to a drawer) | 0B/1 |
| `Sheet` / `Drawer` / `SidePanel` (Edit Component drawer) | glass panel (one blur); editable fields stay paper inside | yes | 3 |
| Popover / dropdown / menu (facet filter, row action menu) | paper (NO blur); they sit above glass via z-tier, not frost | yes — the underlying region carries the blur, the popover does not | 1 |
| Tooltip | paper | yes | all |

**Binding rules (from [35](35-LIQUID-GLASS-LIBRARY-UX-SPEC.md) §5/§8/§10):**
the scrim + a drawer panel may be glass; a modal's content panel stays paper;
**one blur per overlay, always**; drawer open/close never animates the blur
value (deferred arming via `<html data-glass="ready">`, §8); focus trap inside
every dialog/drawer and focus returns to the trigger on close (destructive
confirms hold focus until closed). Glass-surface a11y acceptance (cross-ref
[35](35-LIQUID-GLASS-LIBRARY-UX-SPEC.md) §10 and doc 12 "Glass-surface a11y
acceptance"): text contrast AA on frosted white (`--ink`/`--secondary`), no
`--tertiary` (#7F7F7F) for load-bearing text, and the `--focus` (#3D3D3D)
focus ring ≥2px / ≥3:1 stays visible on glass. The `component-library/index.tsx`
overlay work noted above is Phase-later residual and inherits this same
per-overlay material table when eventually touched.

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

Use concise live-region announcements. Each category below maps to a verbatim
copy string registered in `22-COPY-DECK-AND-MICROCOPY.md` §12A (live-region
copy); this doc does NOT re-author those strings — copy verbatim from doc 22.
All announcements are `polite` (`aria-live="polite"` / `role="status"`) EXCEPT
errors, destructive results, and permission-denied, which are `assertive`
(`aria-live="assertive"` / `role="alert"`) per doc 22 §12A.

| Category (when to announce) | Copy string (doc 22 §12A key) | Politeness |
| --- | --- | --- |
| Result count + scope after a filter/search change | `{count, plural, =0 {No results} =1 {1 result found} other {# results found}}` — `search.result_announcement` | polite |
| Filter applied | `Filter applied: {filterLabel}.` — `filter.applied_announcement` | polite |
| Selected component/template changed from a search result or URL param | `Component trust updated to {state}.` — `trust.state_change_announcement` (trust-context); inspector-open is covered by `overlay.opened_announcement` below | polite |
| Overlay opened (inspector, dialog, drawer, modal) | `{overlayName} opened.` — `overlay.opened_announcement` | polite |
| Overlay closed (inspector/drawer/modal closed) | `{overlayName} closed.` — `overlay.closed_announcement` | polite |
| Destructive action completed (bulk archive succeeded) | `Component archived.` — `component.archived_announcement` | polite |
| Insert success / insert target changed | `insert_target_confirmed` is a telemetry event (doc 20 §6); the user-facing success copy is `Added to {estimateName}.` (doc 22 §10 `templates.insert_success_*`) | polite |
| Mutation failed while previous context was preserved | `Error: {message}.` — `error.announcement` | assertive |
| Permission denied | `You do not have permission to {action}.` — `permission.denied_announcement` | assertive |

Do not announce every visual chip. Source-trust chips need accessible names on
focusable rows/cards/inspector content (chip, NOT badge — C-002; doc 22 §3),
while result-count and mutation changes use live announcements above. Chips carry
no `aria-live`.

Every overlay implementation should also define (local-state announcements
without a doc 22 key are authored against the §12A pattern, `polite` unless
listed `assertive`):

- permission-denied announcement — `permission.denied_announcement` (assertive)
- concurrent-change announcement — e.g. folder `folder.error.concurrent` body read into the dialog error slot (polite/error-focus)
- mutation-success announcement — per-action success copy (doc 22 §10)
- error focus target — `error.announcement` (assertive) + inline error slot
- focus return when the trigger no longer exists — falls back to the owning region's first focusable (polite `overlay.closed_announcement`)

Advanced Add must not become a long modal with every possible field visible. Use
a full editor page or persistent drawer when the user needs source
reconciliation, attachments, assemblies, price history, or provider-mapping
work.
