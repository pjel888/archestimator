# 12 - Responsive Accessibility Interaction Contract

## Responsive Model

| Width Class | Layout |
| --- | --- |
| Desktop/wide | Overview plus full component/template surfaces; inspector as right-side panel. |
| Laptop | Dense toolbar wraps; inspector may reduce content density but remains side panel. |
| Tablet | Primary list/card area with inspector drawer; toolbar filters collapse progressively. |
| Mobile | Single-column browse; drawers for inspector/preview; sticky primary actions only when non-overlapping. |

## Toolbar And Filter Behavior

- Search remains visible before secondary filters.
- Applied filters show as chips or compact summary.
- Reset filters remains reachable without opening every filter control.
- Bulk actions appear only when rows are selected and permission allows them.
- Long labels wrap or truncate with accessible names; they do not overflow
  buttons.

## Keyboard Contract

Required keyboard paths:

- search overview and open a result
- move through component cards or rows
- open and close inspector
- switch card/dense mode
- reset filters
- create/rename/delete a folder
- quick-add a valid component
- preview and insert a template

Rules:

- Tab order follows visual order.
- Escape closes the active overlay/drawer when safe.
- Enter/Space activates focused buttons and checkboxes.
- Focus is returned to the trigger after close or cancel.
- Destructive confirmation keeps focus inside the dialog until closed.

## Screen Reader Contract

Accessible names must include:

- component name
- price/unit when a row/card action depends on it
- freshness/confidence/lifecycle labels
- selected state
- destructive consequences
- target estimate/project for insert

Live-region announcements:

- result count after filter/search changes
- selected component/template opened from route/search
- inspector/drawer closed
- destructive action completed
- insert success/failure
- retry failure while context is preserved

Do not announce every badge update as a live event. Badges should be readable
when the user reaches the row/card/inspector content.

## Table Versus Grid Decision

Use a native table when dense mode is read-mostly and row actions are normal
buttons/links.

Use ARIA grid only if:

- cells become directly editable
- keyboard navigation inside rows/cells is essential
- the team accepts the additional focus-management and testing burden

If ARIA grid is used, implementation must follow the WAI-ARIA grid pattern:
one focusable composite in the page tab sequence and managed focus movement
inside the grid.

## Overlay Focus Rules

Every overlay must document:

- trigger
- initial focus
- close/cancel behavior
- submit behavior
- error focus
- focus return
- permission-denied handling
- concurrent-change handling

## No-Overlap Rules

- Sticky toolbars and bottom actions must not cover rows, cards, drawers, or
  validation messages.
- Drawer width/height must keep close and primary action controls visible.
- Text inside buttons and badges must fit at mobile and laptop widths.
- Density toggles, filter chips, and result counts must not reflow in a way that
  changes the selected row/card height unexpectedly.

## Reduced Motion

Drawer/overlay animations should honor reduced-motion preferences. State
changes must not depend on animation timing to be understandable.
