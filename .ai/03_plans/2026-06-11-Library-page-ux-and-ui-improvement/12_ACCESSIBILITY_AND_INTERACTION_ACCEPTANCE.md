# Accessibility and Interaction Acceptance

Status: executable acceptance plan. No code changes yet.

## Standards Baseline

Target: WCAG 2.2 AA for product UI, with WCAG 2.2 focus appearance guidance treated as a strong quality preference even when not strictly AA.

## Global Acceptance Criteria

| Area | Criteria |
| --- | --- |
| Keyboard | Every core action is reachable and operable by keyboard. |
| Focus | Focus is visible, not obscured, and returns predictably after overlays close. |
| Names | Visible labels and accessible names match for controls where speech input may be used. |
| Roles/states | Custom controls expose correct role, expanded/selected/pressed/disabled/value states. |
| Contrast | Text contrast >= 4.5:1 for normal text; non-text cues >= 3:1 where applicable. |
| Target size | Controls meet 24 x 24 CSS px minimum or equivalent spacing. |
| Status messages | Dynamic search/add/archive/loading/error changes are announced without stealing focus. |
| Reflow | At 320 CSS px and high zoom, content reflows without page-level two-dimensional scrolling. |
| Reduced motion | Sidebar, overlays, and future animations respect `prefers-reduced-motion`. |

## Search Acceptance

1. Search has a persistent visible label or a documented dense-header exception that passes usability review.
2. Accessible name includes the visible label text.
3. Typing updates results without moving focus.
4. Result count changes are exposed as a status message.
5. Clear button has an accessible name and meets target size.
6. No-results state identifies the query and offers recovery.
7. Rapid typing does not cause visible lag or dropped input.

## Toolbar Acceptance

1. No visible toolbar control is a no-op.
2. Icon-only controls have accessible names and tooltip/help affordances where meaning is not obvious.
3. Pressed/selected state is exposed for toggles.
4. Disabled controls explain disabled state if the reason is not obvious.
5. Add action uses neutral design tokens and preserves focus after modal close.

## Catalogue/Card Acceptance

1. Card list exposes list semantics or another deliberate structure.
2. Card visual affordance matches behavior. If card is not clickable, it should not visually promise click-to-detail.
3. Archive checkbox accessible name includes the component name.
4. Thumbnail alt text is meaningful or intentionally decorative when text already duplicates it.
5. Critical metadata is not hidden only on hover.
6. Truncation does not remove the only visible component identifier.
7. Discontinued state is visible if included in result set.

## Tree Panel Acceptance

Choose one pattern and verify against it:

| Pattern | Acceptance |
| --- | --- |
| True tree | Arrow keys expand/collapse/move, `aria-expanded` and selection state correct, active item visible. |
| Nested button list | Simpler roles, clear expand/collapse buttons, no false tree semantics. |

Additional criteria:

1. Tree search has label, clear, no-results, and status messaging.
2. View mode controls expose selected state.
3. Drag/drop has keyboard alternative or is scoped as pointer-only with alternate management path.
4. Empty folders/categories are announced clearly.

## Modal/Overlay Acceptance

1. Add Component modal opens with focus on title or first field.
2. Focus remains trapped while modal is open.
3. Escape and close button behavior are predictable.
4. Close returns focus to Add action.
5. Required fields expose labels and errors.
6. Comboboxes follow APG behavior.
7. File upload errors and progress are announced.
8. Save loading state prevents duplicate submission.
9. Archive preview states item count and consequences.
10. Destructive action requires deliberate confirmation.

## Responsive Acceptance

| Viewport | Criteria |
| --- | --- |
| 1440x900 | Collapsed rail, header, sheet, catalogue, and tree panel fit without overlap. |
| 1200x800 | Primary workflow remains visible; tree does not crush catalogue. |
| 768x1024 | Tree behavior is intentional: hidden, docked, or stacked. |
| 390x844 | Search/add/core browsing remain usable; no tiny overlapping toolbar cluster. |

## Test Artifacts Required

1. Keyboard walkthrough notes.
2. Focus order list.
3. Accessibility tree snapshots for search, toolbar, tree, card, modal.
4. Contrast report for text and non-text controls.
5. Screen-reader smoke notes for result updates and modal.
6. Responsive screenshots.
7. Reduced-motion screenshot or recording.

## Failure Handling

Any P1 accessibility failure blocks implementation completion. P2 issues may ship only with explicit product-owner acceptance and a follow-up issue.
