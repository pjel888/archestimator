# Settings Modal Audit

## Scope

- Surface: Storybook Settings modal in `Domain/Workshop/ModalPatterns`.
- Evidence:
  - `settings-modal-audit-desktop.png`
  - `settings-modal-audit-mobile.png`
  - `settings-modal-audit-capture.json`
- Design source: repo `DESIGN.md` app UI tokens and current Storybook modal pattern.

## Steps

1. Desktop Settings modal: Healthy with follow-up polish.
2. Narrow Settings modal: Mostly healthy, with responsive density risk.

## Strengths

- The shell is clear: close strip, title header, content body, and lower-left location footer read as separate zones.
- The white surface is simple and consistent with the repo's product UI direction.
- Settings rows follow a predictable title, helper text, and trailing action pattern.

## UX Risks

- Initial focus currently lands on the close button. That is safe, but it may over-prioritize leaving the modal over reviewing settings.
- Category navigation looks like stable settings IA, but the active state is static rather than clearly tied to selected or scrolled section state.
- Mobile category navigation fits the current three categories, but it has limited capacity for longer labels or additional settings groups.

## Accessibility Risks

- Screenshots confirm labels and visible structure, but not the full keyboard trap, tab sequence, or screen-reader announcement order.
- The hash-link category nav should be checked for keyboard and screen-reader clarity if it remains anchor-based.
- Long labels, zoom, and contrast for every interaction state still need targeted checks.

## Recommendations

1. Decide whether initial focus should remain on Close settings or move to the modal title/container/first category.
2. Make the category navigation state explicit when a user selects or scrolls to a section.
3. Define mobile overflow behavior before adding more settings categories.
4. Run a focused accessibility pass for Tab order, Escape behavior, screen-reader labels, zoom, and contrast.
