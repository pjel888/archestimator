# Bug: Share Page Decision Confirmation Modal Lacks Verified Focus Trap and Keyboard Accessibility

**Title:** Decision confirmation modal focus trap, Escape-to-close, and focus restoration not verified as accessible
**Classification:** Accessibility Defect / Potential WCAG Violation
**Date Discovered:** 2026-06-03 (second-pass plan refinement)
**Discovery Context:** Second-pass audit of share page UX/UI overhaul plan. The plan identifies accessibility as a requirement but does not audit the current modal's keyboard/focus behavior.

## Evidence

The current decision confirmation modal in `SharePageDecision.tsx` uses a custom `<div role="dialog">` implementation (per plan's UI/UX plan, `07_UI_UX_AND_ACCESSIBILITY_PLAN.md`). The plan proposes to extract this into `SharePageDecisionBar.tsx` but does not audit the current modal's:

1. Focus trapping (does Tab cycle within the modal?)
2. Escape key handling (does Escape close the modal?)
3. Focus restoration (does focus return to the triggering button after modal close?)
4. `aria-modal="true"` and `aria-labelledby` correctness
5. Initial focus placement (does the modal receive focus when opened?)

No existing accessibility tests verify these behaviors for the decision modal.

## Reproduction

1. Open share page with valid recipient session
2. Click Accept, Decline, or Request Revision button
3. Confirm modal appears
4. Press Tab repeatedly — does focus stay within the modal?
5. Press Escape — does the modal close?
6. After closing via Escape — does focus return to the triggering button?

## Expected Behavior

All interactive dialogs/MODALS must:
- Trap focus within the dialog while open (Tab cycles between dialog elements)
- Close on Escape key press
- Return focus to the trigger element on close
- Have `aria-modal="true"`
- Have `aria-labelledby` pointing to the dialog title
- Put initial focus on the first focusable element or the dialog itself

## Actual Behavior

**Not verified.** Current implementation's accessibility compliance is unknown. The component was built as a custom `role="dialog"` div without explicit focus management, which typically requires JavaScript to implement focus trapping correctly.

## Suspected Root Cause

The modal was built as a simple overlay with `role="dialog"` but without programmatic focus management (focus trapping, Escape handler, focus restoration). Custom dialogs require explicit JavaScript for accessibility compliance.

## Affected Files/Modules

- `src/components/share/SharePageDecision.tsx` (current, to be extracted to `SharePageDecisionBar.tsx`)
- Future: `src/components/share/SharePageDecisionBar.tsx` (plan's new component)

## Impact

- **Severity:** Medium (accessibility gap, potential WCAG 2.1 AA violation for keyboard users)
- **User Impact:** Keyboard-only and screen-reader users may not be able to properly interact with the decision confirmation flow
- **Compliance:** May violate WCAG 2.1 SC 2.4.3 (Focus Order), SC 2.1.1 (Keyboard), SC 2.4.7 (Focus Visible)

## Relationship to Current Plan

The plan's Phase 6 (Accessibility & Mobile) includes Step 6.1: "Ensure confirmation modal traps focus" and specifies keyboard navigation requirements. However, this is currently implemented as a general accessibility step without specific focus management implementation details.

## Proposed Fix Plan

1. Implement proper focus trapping using a focus-trap hook or library pattern:
   - On dialog open: find all focusable elements within the dialog
   - On Tab at last focusable element: wrap to first
   - On Shift+Tab at first focusable element: wrap to last
2. Add Escape key handler to close the dialog
3. Store the trigger element reference and restore focus on close
4. Ensure `aria-modal="true"` is set on the dialog
5. Ensure `aria-labelledby` points to the confirmation message
6. Set initial focus to the safest action (Cancel/Close button)
7. Add accessibility DOM tests verifying all four behaviors

## Verification Plan

1. DOM test: Dialog open → pressing Tab cycles within dialog elements only
2. DOM test: Dialog open → pressing Escape triggers close callback
3. DOM test: Dialog close → focus returns to trigger element
4. DOM test: Dialog renders with `aria-modal="true"` and valid `aria-labelledby`
5. `bun run lint:design-system` passes

## Status

**Open** — requires implementation during share page overhaul (Phase 6, Step 6.1)

## References

- Plan folder: `.ai/03_plans/2026-06-03-share-page-client-review-ux-ui-overhaul/`
- UI/UX plan: `07_UI_UX_AND_ACCESSIBILITY_PLAN.md` lines 216-241
- Implementation step: Phase 6, Step 6.1 in `04_IMPLEMENTATION_SEQUENCE.md`
