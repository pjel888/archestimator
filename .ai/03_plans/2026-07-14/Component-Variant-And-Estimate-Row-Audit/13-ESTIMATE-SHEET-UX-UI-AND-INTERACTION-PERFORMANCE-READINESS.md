# Estimate Sheet UX, UI, And Interaction-Performance Readiness

**Status:** canonical planning authority for dense Estimate Sheet interaction styling and render-scope readiness  
**Product implementation:** not performed by this artifact  
**Primary route observed:** `/workshop/projects/[projectId]/estimates/[nodeId]`  
**Current proof level:** source review plus read-only in-app browser inspection; implementation and release proof remain open

## Outcome

The Estimate Sheet should feel calm while the user works quickly. Entering edit mode must not repaint the surrounding row, branch, tab, or group. Compact filters and dropdown triggers must not look like large form fields. Loading and filtering must stay inside the object or sidebar that actually changed.

This artifact turns that direction into one implementation contract for:

- Area, tab, Library-folder, project-group, Template, and Template-category rename flows;
- the Templates source-family filter (`All sources`, `Custom templates`, and project sources);
- compact dropdown and context-menu state language across the Estimate Sheet;
- dense row, tree, and sidebar interaction feedback; and
- render isolation, layout stability, deferred filtering, and existing virtualization boundaries.

It does not redesign the Estimate Sheet, replace the current primitives, add a new dependency, or authorize product tests. It narrows existing behaviors into one consistent system.

## Evidence And Limits

### Current live-route observations

The current desktop route was inspected read-only at a `2502 x 1324` viewport on 2026-07-15.

1. The Templates source-family trigger is a full-width boxed control. Its observed trigger surface was white with a hairline border, `40px` high, and approximately `502px` wide for three short options.
2. Opening that trigger produces a popup as wide as the sidebar control, leaving large unused horizontal space around `All sources`, `Custom templates`, and `From projects`.
3. The filter vocabulary and visible tree vocabulary disagree: the option says `From projects`, while the source section says `Projects`.
4. Area rename replaces the label with a transparent input, but entry auto-selects the full value, the pointer-hover fill remains visible, and confirm/cancel controls appear in the row. The result reads as a visually different row rather than the same row in edit mode.
5. The right sidebar already groups Custom Templates and Projects visibly. The source-family filter is useful for long lists, but its current field treatment duplicates hierarchy instead of acting as a lightweight scope control.

### Current source observations

| Surface | Current behavior | Readiness implication |
| --- | --- | --- |
| Estimate Tree rename | `EstimateSheetTree.tsx` swaps in a transparent input, adds confirm/cancel controls, disables/fades it while saving, and `use-estimate-tree-rename-editor.ts` calls `select()` on entry. | Preserve the same row surface and geometry, stop automatic full-value selection, and reserve any trailing status/control space. |
| Tab rename | `EstimateTabStrip.tsx` adds an inset focus ring, sizes the input from draft length, and selects the whole value on entry. | Keep the selected-tab geometry and underline stable; focus belongs to the text editor, not a new tab surface. |
| Library-folder rename | `LibraryTree.tsx` uses a bordered `bg-surface` input and re-selects the full value on focus. | It visibly diverges from the Area and group edit patterns and should use the shared inline-edit contract. |
| Project-group rename | `ProjectGroupFlag.tsx` is transparent, but it commits on mouse leave in addition to blur/Enter. | Mouse movement must not save a rename; the commit model must be consistent. |
| Manage Groups | `ManageGroupsPopover.tsx` applies `focus-visible:bg-accentSoft` to create and rename inputs. | Focus may remain visible without changing the field fill. |
| Templates filter | `component-library/index.tsx` explicitly selects `variant="boxed"` and `className="w-full"`. | This is the direct source of the oversized field treatment. |
| Shared dropdown | `dropdown-select.tsx` already has a transparent underline variant and a boxed form variant. | Prefer existing behavior and the smallest primitive change; do not create a second dropdown system. |
| Tree rendering | The Area rename draft is captured by `renderEstimateTreeRowLabel`; its callback identity changes while typing and is passed to every memoized `TreeFlatRow`. | There is a source-level render-amplification risk: one draft keystroke can invalidate every visible row even though only one row changed. |
| Source filtering | Templates source-family filtering is derived from already loaded arrays with `useMemo`; project search is deferred and Template summaries are bounded with selected detail hydration. | Preserve these strengths. Switching a loaded source family must not introduce a network request or remount the Estimate Sheet. |
| Large collections | Shared trees and Estimate rows already have thresholded virtualization; search already uses deferred values. | Measure and preserve before adding any new virtualization or state layer. |

This inspection is not proof that all viewports, keyboard paths, datasets, or async failures work. It is sufficient to define the implementation target and the evidence still required.

## Design Direction

The product direction is **stable surface, precise focus**:

- parent panels, branch headers, tree rows, tabs, and toolbar rows remain visually unchanged when their value enters edit mode;
- the editable text itself carries focus through a caret and a restrained underline or one-pixel focus outline;
- selection, current location, drag target, invalid state, and destructive state remain distinct semantic states and are not conflated with editing;
- compact toolbar filters are text-and-chevron controls, not form-field rectangles;
- popup menus retain one opaque paper surface for legibility and focus containment, but selected items do not need a persistent filled row; and
- motion is limited to opacity or transform where it materially clarifies state, with reduced-motion parity.

### Explicit non-goals

- Do not remove meaningful selection, current-location, drag-target, invalid, or destructive feedback.
- Do not make modal/form inputs transparent merely because inline editors are transparent.
- Do not make floating menu panels transparent; only their resting triggers and persistent selected-option fills are being reduced.
- Do not replace `DropdownSelect`, `Tree`, Tabs, or the existing context-menu substrate unless the current primitive cannot satisfy the contract with a narrow change.
- Do not add animation, glass, gradients, extra cards, new typography, or decorative color.
- Do not add a new performance library, client state store, or virtualization layer without measured evidence.

## Readiness Findings

| ID | Priority | Finding | Current consequence | Canonical owner |
| --- | --- | --- | --- | --- |
| `UI-F-001` | `P1` | Inline rename states use different fills, borders, rings, action rails, and selection behavior. | The same action reads as different products across Area, tab, folder, group, and Template surfaces. | `UX-002`, `UNIT-003`, `UNIT-004`, `UNIT-009` |
| `UI-F-002` | `P1` | Project-group rename commits on pointer exit while other rename flows use Enter/blur/Escape. | Ordinary pointer movement can become an accidental save and users cannot learn one reliable model. | `UX-002`, `UNIT-004` |
| `UI-F-003` | `P2` | The Templates source filter is a full-width boxed form field for three short scope values. | It becomes the strongest object in the sidebar and duplicates the visible source hierarchy. | `UX-002`, `UNIT-005`, `UNIT-009` |
| `UI-F-004` | `P2` | Source labels vary between `From projects`, `Projects`, and project-source terminology. | The filter and tree do not describe the same scope consistently. | `UX-002`, `UNIT-005`, `UNIT-009` |
| `UI-F-005` | `P2` | Resting, selected, hovered, focused, editing, and pending states rely on overlapping background fills. | State meaning is ambiguous and dense surfaces shimmer as focus moves. | `UX-002`, `UNIT-003`–`UNIT-005`, `UNIT-009` |
| `UI-F-006` | `P2` | Context actions, inline confirmation controls, and persistent action icons compete with primary content. | Scanning becomes slower and edit entry can shift available label width. | `UX-002`, `UNIT-003`–`UNIT-005` |
| `UI-F-007` | `P1` | Removing fill without a replacement focus contract would weaken keyboard visibility. | A cosmetic cleanup could regress accessibility even while looking calmer. | `UX-002`, `AC-016`, `UNIT-008` |
| `UI-F-008` | `P1` | Area rename draft changes the shared row-renderer identity passed to all memoized visible tree rows. | Typing in one row has a source-level risk of re-rendering every visible row. | `PERF-002`, `UNIT-003` |
| `UI-F-009` | `P2` | Source-family filtering has no explicit render/network/layout acceptance contract. | A visual refactor could accidentally remount the sidebar, lose scroll/expansion, or add fetch churn. | `PERF-002`, `UNIT-005`, `UNIT-009` |

No finding above is a data-loss or authorization P0. `UI-F-001`, `UI-F-002`, `UI-F-007`, and `UI-F-008` are release-important because they affect predictable editing, keyboard access, and long-session responsiveness. The remaining findings are coherence and efficiency improvements that should ship in the same focused pass when their shared primitive is already being touched.

## Canonical Interaction State Model

| State | Parent surface | Text/control treatment | Allowed feedback |
| --- | --- | --- | --- |
| Rest | Transparent over the parent surface. | Normal label and tertiary action affordances. | No persistent fill. |
| Hover | Parent remains stable for inline-editable labels unless a list-row hover is needed for discovery. | Text or icon contrast may strengthen. | Any transient hover tint must disappear on edit entry and must not be the edit signal. |
| Current/selected | Existing current rail, underline, checkbox, or accepted selection cue remains. | Do not replace it with the edit state. | Semantic selection styling may persist because it existed before editing. |
| Editing | Exactly the same parent fill, height, indentation, and content origin as before edit. | Caret plus restrained underline/one-pixel focus outline; no automatic whole-value selection. | Reserved trailing slot may show confirm/cancel only where pointer discoverability requires it. |
| Saving | Same geometry and surface as editing. | Input becomes read-only or guarded without opacity wash over the row. | Small inline progress/status in the reserved slot; no success flash. |
| Error | Same geometry and surface. | Text/focus error cue plus concise message anchored to the field. | No full-row danger fill unless the whole row is invalid. |
| Drag target | Existing drag-specific line/inside target. | Edit cannot begin concurrently. | Drag styling is allowed because it describes topology, not editing. |

## Inline Rename Contract

### Entry

1. Double click, F2, context action, or explicit rename trigger enters the same editor.
2. The label is replaced in place. Its left edge, baseline, height, indentation, and surrounding row/tab/header dimensions do not move.
3. Focus lands in the editor with the caret at the end. Do not automatically select the entire value or re-select it on every focus event. `Cmd/Ctrl+A` remains available.
4. The parent background, selected/current marker, border, and branch fill remain exactly what they were immediately before edit entry.
5. Existing hover fill cannot become a sticky editing fill.

### Commit and cancel

1. `Enter` commits and never inserts a newline in single-line editors.
2. `Escape` restores the original value and geometry.
3. Blur may commit once when valid, but the commit path must deduplicate blur after Enter or menu focus handoff.
4. Pointer exit does not commit.
5. Empty/invalid values keep focus with concise inline error copy; they do not silently cancel or save a fallback name.
6. Save pending is object-scoped. It cannot fade or skeletonize sibling Areas, groups, tabs, folders, Templates, or rows.
7. On success, return to the same label without a background flash, toast-only confirmation, or focus loss to the document body.

### Geometry and action rails

- Reserve any confirm/cancel/progress slot before editing or use an overlay that does not reduce label width.
- Tab width may follow the existing tab sizing rule, but entering edit mode cannot suddenly expand or contract the selected tab.
- Error text may overlay below a dense row only when it does not move sibling rows; otherwise use the nearest fixed message region.
- Inline editors inherit the surface typography. They do not introduce a larger font, padding, radius, or filled input treatment.

### Scope

Apply this contract to:

- Estimate Tree Area names;
- Estimate tab names;
- project group labels and Manage Groups rename rows;
- Library folder names;
- Template names/categories where rename is inline or popover-based;
- Template editor group/Area names; and
- any future dense Estimate Sheet inline rename using the same primitives.

Dialog-based create/edit forms remain normal form controls and are outside the transparent-inline rule.

## Dropdown And Menu Contract

### Templates source-family filter

The filter remains because it becomes useful as Custom Template and project-source lists grow, and it already hides when only one source family exists. Its visual treatment changes:

1. Use one compact, content-sized, transparent text trigger aligned with the source toolbar or first tree line.
2. Keep the current value plus a small caret. Remove the full-width white rectangle and persistent boxed border.
3. Use consistent vocabulary in trigger, options, empty states, and tree sections:
   - `All sources`
   - `Custom templates`
   - `Project sources`
4. Preserve both grouped sections for `All sources`; choosing one family filters locally without clearing expansion state for the hidden family.
5. Clearing or changing the filter may clear incompatible selection/preview state, but it must announce that outcome and must not erase canonical tree expansion or scroll state.
6. If future evidence shows the control is not useful below a collection-size threshold, it may be hidden until both source families are present; do not remove the capability outright in this pass.

### Popup panel and options

- Keep one opaque floating paper surface with a restrained hairline/shadow. A transparent popup over dense Estimate content is rejected for legibility.
- Size the popup to its labels and minimum pointer target, not the full sidebar width.
- Represent the selected option with a checkmark and text weight; do not keep a persistent selected-row fill.
- Hover and keyboard focus may use a short-lived neutral cue, but they cannot look like a saved selection after focus leaves.
- Destructive actions stay in a separated final group and never depend on color alone.
- Open/close motion is optional and, if present, uses opacity/transform only with reduced-motion parity.

### Shared dropdown streamlining

Audit the Estimate Sheet's toolbar filters, context menus, row selectors, and sidebar scope controls by purpose:

- **Inline value selector:** underline or text-only treatment over the row.
- **Toolbar scope/filter:** compact transparent trigger with current value.
- **Dialog form select:** boxed control is allowed because it is a form field.
- **Context/action menu:** icon/text trigger over the parent surface; opaque floating menu.

Do not flatten all four purposes into one visual variant. Consistency means the same purpose uses the same treatment.

## Broader UX And UI Streamlining

1. **Reduce state color collisions.** Editing is caret/focus, selection is rail/underline/check, pending is scoped progress, error is field/message, and drag is topology line/inside target.
2. **Use progressive disclosure for row actions.** Keep primary content visible; reveal secondary duplicate/activity/delete/move controls on row hover, row focus-within, or keyboard navigation without changing row geometry.
3. **Preserve keyboard parity.** Every right-click action remains available through Shift+F10/context-menu key; rename keeps F2 where already established.
4. **Keep focus local.** Closing a menu returns focus to its trigger or the new inline editor; successful rename returns focus to the renamed object.
5. **Use concise recovery copy.** Errors name the object and next action. Avoid generic success banners and avoid the removed pattern of noisy inline “renamed” mutation strips.
6. **Keep hierarchy legible.** The Templates tab should have one tab label, one compact scope control, and visible source sections. Do not add another card/header layer around each.
7. **Avoid accidental saves.** Mouse leave never commits; blur commits once; Enter saves; Escape cancels.
8. **Keep empty states actionable.** Filtered empty states distinguish “no items in this family” from “no search matches” and offer clear filter/search recovery.
9. **Retain dense typography.** This pass does not enlarge the app or reduce information density; it removes chrome so hierarchy carries the load.
10. **No color-only meaning.** Selected options, current rows, pending states, and errors retain shape, icon, text, or ARIA signals when fills are reduced.

## Interaction-Performance Contract

The roadmap remains the global owner, but implementation cannot depend on an unrelated document lookup. This slice freezes the exact local budgets below; any later roadmap tightening supersedes them only through an explicit plan refresh.

| Interaction | Target | Hard ceiling / invariant | Regression signal |
| --- | --- | --- | --- |
| Single-line rename/input direct intent | `<100ms` perceived response | `<200ms` beta ceiling | delayed caret/commit feedback or a new debounce on direct intent |
| One rename keystroke | edited row/direct owner only | `0` unrelated visible-row material rerenders | shared renderer identity or draft prop invalidates sibling rows |
| Loaded source-family toggle | `<100ms` target, `<200ms` ceiling | `0` new network requests and `0` outer Estimate Sheet remounts | query invocation, remount key, lost sheet state, or whole-sheet loading |
| Edit/filter geometry | immediate and stable | `0px` row/tab/header width or height delta | width/height/padding/border/grid-track/row-position change |
| Dependency/bundle impact | `0 KB` intended | no new dependency | any dependency or measurable main-route bundle growth requires separate owner review |

### Preserve current strengths

- Keep deferred search for expensive source-tree filtering.
- Keep Custom Template summaries bounded and selected graph hydration on demand.
- Keep fixed-dimension skeleton replacement for first project-source load.
- Keep existing thresholded Tree, Estimate-row, and master-column virtualization.
- Keep stable dropdown refs and memoized derived source arrays.

### Required improvements

1. **Isolate rename draft rendering.** Typing in one Area/folder/group/tab editor may update that editor and its direct status only. Do not invalidate every visible tree row through a changing shared renderer prop.
2. **Keep source-family filtering local.** Switching among loaded source families changes the right source tree only. It must not remount the left tree, center Estimate sheet, selected tab, or running totals.
3. **No fetch churn for loaded filters.** A source-family toggle over already loaded summary arrays performs no new request. Search/detail reads retain their existing bounded and deferred behavior.
4. **Preserve continuity.** Rename/filter/menu transitions retain scroll position, expanded IDs, current selection, and keyboard focus unless the chosen filter makes a selected preview inapplicable.
5. **Avoid layout animation.** Do not animate width, height, padding, border width, grid tracks, or row position during edit/filter/menu transitions. Use no animation or opacity/transform only.
6. **Do not debounce direct intent.** Search may be deferred; rename typing, Enter/Escape, option selection, and menu commands respond immediately.
7. **Do not virtualize by instinct.** Existing thresholds remain until route measurement demonstrates a different boundary. No new dependency or list rewrite is part of this pass.
8. **Keep pending object-scoped.** Rename and Template/source operations show progress only on the affected editor, target node, or source list; no whole-sheet skeleton or opacity wash.

### Required implementation evidence without test authorization

- Source/static ownership receipt showing rename draft state is local to the edited row/direct owner and loaded source-family selection does not invoke a query path or outer-sheet remount key.
- Class/style and DOM-ownership receipt showing edit entry/exit preserves the same parent row/tab/header container and changes no width/height/padding/border/grid-track contract.
- Dependency/diff receipt showing no new package and `0 KB` intended critical-route bundle impact.
- Authoritative mutation/read-back receipts from owning units; no UI state may claim success before its object-scoped mutation settles.

### Proposed browser evidence when explicitly authorized

- React Profiler or equivalent render-count receipt for one Area rename keystroke, showing only the edited row/direct owner changes materially.
- Network capture for each Templates source-family toggle after summaries are loaded, showing no new request.
- Before/editing/saving/error/after visual-state capture for Area, tab, folder/group, and Templates filter/menu.
- Layout geometry comparison for edit entry/exit showing stable row/tab/header bounds.
- Keyboard/focus walkthrough for F2/context-menu rename, Enter, Escape, blur de-duplication, menu open/close, and source-filter selection.

The current planning turn collected only the baseline live-route and source evidence described above. Missing proposed browser evidence leaves browser/release proof unevaluated but does not block source/D1 implementation completion.

## Unit Ownership

| Unit | Added UX/UI/performance responsibility |
| --- | --- |
| `UNIT-001` | Freeze the observed rename/filter baseline, shared primitive owners, current render/loading strengths, and the exact local budgets above before implementation. |
| `UNIT-003` | Apply stable-surface rename to Estimate Tree Areas and tabs; isolate the active rename row from sibling tree-row rendering. |
| `UNIT-004` | Apply the same rename behavior to Library folders and project/group surfaces touched by the Estimate workflow; remove mouse-leave commit. |
| `UNIT-005` | Replace the Templates source-family boxed field with the compact transparent trigger, unify labels, preserve target-scoped pending, and prove local/no-fetch filtering. |
| `UNIT-009` | Apply the filter/menu and inline rename contract to Template/category/editor lifecycle without changing detached Template semantics. |
| `UNIT-008` | Reconcile required source/static/D1 proof; run visual, focus, geometry, render-scope, network, and reduced-motion evidence only when explicitly authorized, then make the truthful implementation/release decision. |

`UNIT-002`, `UNIT-006`, and `UNIT-007` do not gain new UI work unless their existing mutation/loading/publication changes touch one of the shared primitives above.

## Acceptance Mapping

| Criterion | Pass condition | Evidence owner |
| --- | --- | --- |
| `AC-016` / `UX-002` | Dense inline rename preserves the parent surface and geometry; Enter saves, Escape cancels, blur deduplicates, pointer exit does not save, full-value auto-selection is removed, focus remains visible, and Templates source filtering uses the compact transparent trigger with consistent labels and an opaque accessible menu. | `UNIT-003`, `UNIT-004`, `UNIT-005`, `UNIT-009`, integrated by `UNIT-008` |
| `AC-017` / `PERF-002` | One rename draft does not invalidate unrelated visible rows; loaded source-family toggles make no new request or outer-sheet remount; edit/filter transitions preserve geometry, scroll, expansion, selection, and focus; exact latency/rerender/network/geometry/dependency budgets above hold; existing deferred/bounded/virtualized paths remain intact. | `UNIT-003`, `UNIT-005`, `UNIT-009`, integrated by `UNIT-008` |

Both criteria remain `FAIL` until implementation and their decisive evidence exists. Source/static evidence can close implementation ownership claims; browser-only claims stay `FAIL` or `NOT_EVALUATED` until explicitly authorized. This planning artifact is collected evidence for readiness only.

## Stop Condition

This UX/UI readiness slice is complete only when:

1. all scoped rename surfaces follow one stable-surface interaction model;
2. the Templates source-family control is compact, transparent at rest, consistently labeled, and locally filtered;
3. menu panels remain readable and keyboard-accessible without persistent selection fills;
4. no scoped edit/filter action causes unrelated loading, remount, fetch, scroll loss, or layout shift;
5. accessibility remains explicit after background fills are removed; and
6. `AC-016` and `AC-017` have fresh evidence and the canonical pack still passes validation.

Source/static implementation may be complete before this release-evidence stop condition. Without explicit browser authorization, keep browser-only portions of `AC-016`/`AC-017` `FAIL` or `NOT_EVALUATED` and report the boundary; do not reopen otherwise proven local implementation work.
