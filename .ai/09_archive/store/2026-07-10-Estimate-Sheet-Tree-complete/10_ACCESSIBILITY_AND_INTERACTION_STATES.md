# Accessibility And Interaction States

## Phase 0 Impact (added 2026-07-06)

Phase 0 is backend-only. It does not affect accessibility. The existing `aria-live` region at `EstimateSheetTree.tsx:1972-1981` covers saving/saved messages; current errors primarily go through toast, so do not claim Phase 0 creates an error live-region path.

## Current State

- Tree uses `role="tree"` and `role="treeitem"`.
- Keyboard navigation supports arrows, Home/End, typeahead, F2, Shift+F10, Enter, and Space.
- Rows expose `aria-grabbed` and `aria-dropeffect`.
- Reorder status is announced through an `sr-only` live output (`EstimateSheetTree.tsx:1972-1981`).
- Subtree load status announces "Loading..." / "Load failed" via polite live output (`EstimateSheetTree.tsx:1748-1757`).

## Gaps

- `aria-grabbed` and `aria-dropeffect` alone are not a sufficient modern DnD experience.
- There is no live narration like "Moving Kitchen before Site Works."
- Move dialog disabled radios are skipped by keyboard, so the reason text is not reliably reachable.
- Active route and keyboard focus can use the same left-border cue.
- Pointer-disabled reasons are mostly implicit.
- Context-menu disabled reasons are mostly title-only today, which is not reliable for keyboard or screen-reader users.
- Rename input and icon buttons use `focus-visible:outline-none`; visible focus needs review.
- Filter/search empty state reuses true-empty copy ("No areas yet") and can mislead users.
- Touch/pointer fallback depends on the Move dialog, which is currently inside-only.

## Required States

### Idle

- Drag handle visible on row hover/focus.
- Active route and keyboard focus are visually distinct.

### Dragging

- Source row marked.
- Exactly one valid target indicator.
- Before/inside/after are distinct by shape and text, not only color.

### Invalid

- No actionable insertion indicator.
- Reason exposed through live/help text if hovering or keyboard-selecting invalid target.

### Saving

- Visible compact status.
- `aria-live="polite"` announcement.

### Saved

- Brief non-disruptive visible status and live update.

### Error

- Rollback.
- Toast/live alert.
- Focus returns to source/restored row.

### Disabled

- Search, rename, saving, and optimistic-create gates explain what must finish first.

### Context Menu

- Disabled menu items expose reasons as visible text or described-by content, not only `title`.
- Menu close returns focus predictably without stealing focus from inline rename.

### Search/Filter Empty

- True empty tree and no search/filter matches use distinct copy.
- Clear search/filter remains reachable.

### Drag activation

- In EstimateSheetTree, the drag handle is the only pointer drag source.
- Row body dragstart should not set tree drag data or call `onDrop`.
- Keyboard focus and context menu remain available from the row body.
- Shared `Tree` default row-drag behavior remains available for consumers that do not opt into handle activation.

## Tests

- DOM assertions for focus return after Move dialog.
- DOM assertions for disabled reasons being reachable.
- DOM assertions for `aria-live` status.
- DOM assertions for valid/invalid drop target attributes and visuals.
- DOM assertions that EstimateSheetTree handle drag starts a move and row-body drag does not.
- DOM assertions that the live region announces success after Phase 0 (no error announcement).
- DOM assertions that disabled context-menu reasons are reachable without a mouse.
- DOM assertions that search/filter empty copy is distinct from true empty.
- DOM assertions that restore failure is reported without resurrecting stale UI if restore remains available.

## WCAG 2.2 AA Coverage

| Criterion | Coverage |
| --- | --- |
| 2.1.1 Keyboard | Partial — keyboard DnD not yet supported; Move dialog parity closes this (Phase 4) |
| 2.1.2 No keyboard trap | Pass — Move dialog has Cancel; rename has Escape |
| 2.4.3 Focus order | Pass — tree roving tabindex; Move dialog focus chain |
| 2.4.7 Focus visible | Partial — active route and focus currently share visual cue |
| 3.3.1 Error identification | Pass — `aria-invalid`, `role="alert"` on rename error |
| 3.3.3 Error suggestion | Partial — disabled reasons exist in source but are not reliably reachable |
| 4.1.2 Name, Role, Value | Pass — `aria-label`, `role`, `aria-checked` etc. |
| 4.1.3 Status messages | Partial — saving/saved use `aria-live`; drag narration and some errors do not |
| 1.4.1 Use of color | Partial — drop indicator relies partly on color |
| 1.4.11 Non-text contrast | Partial — orange accent on caret |
| 2.3.3 Animation from interactions | TBD — reduced-motion behavior during drag preview not explicitly handled |
