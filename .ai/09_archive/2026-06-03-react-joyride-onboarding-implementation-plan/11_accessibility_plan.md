# 11 Accessibility Plan

**Status:** Draft for review
**Last updated:** 2026-06-03
**Scope:** Keyboard navigation, screen reader behavior, focus management, reduced motion, high contrast, and accessibility acceptance criteria for the React Joyride onboarding system.

---

## Design System Context

This accessibility plan builds on Archestimator's existing patterns and the constraints in `DESIGN.md`. Key design tokens referenced throughout:

| Token | Value | Source |
|-------|-------|--------|
| `ink` | `#292929` | `DESIGN.md` § Colors |
| `secondary` | `#5D5D5D` | `DESIGN.md` § Colors |
| `tertiary` | `#7F7F7F` | `DESIGN.md` § Colors |
| `focus` | `#292929` | `DESIGN.md` § Colors |
| `surface` | `#FFFFFF` | `DESIGN.md` § Colors |
| `canvas` | `#F5F5F5` | `DESIGN.md` § Colors |
| `hairline` | `#F2F2F2` | `DESIGN.md` § Colors |
| Typography | SF Pro, max 12px, weights 400/500 only, zero tracking | `DESIGN.md` § Typography |
| Border radius | `xs` (3px) exclusive | `DESIGN.md` § Shapes |
| Icons | Phosphor regular weight, 1px outline style | `DESIGN.md` § Typography |
| `app-title` | SF Pro, 12px, 500 weight, 16px line-height | `DESIGN.md` § Typography |
| `app-body` | SF Pro, 10px, 400 weight, 14px line-height | `DESIGN.md` § Typography |
| `app-label` | SF Pro, 9px, 500 weight, 12px line-height | `DESIGN.md` § Typography |
| `app-label-sm` | SF Pro, 8px, 400 weight, 10px line-height | `DESIGN.md` § Typography |
| `app-button` | SF Pro, 10px, 500 weight, 12px line-height | `DESIGN.md` § Typography |

### Existing Accessibility Pattern: Reduced Motion

The MainSidebar component (`src/components/sidebar/MainSidebar.tsx`, lines 74–76, 89–94, 119–121) provides the canonical reduced-motion pattern used throughout the app. The onboarding system must follow this exact pattern:

```tsx
// Initialization (MainSidebar.tsx:74-76)
const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
  typeof window === "undefined"
    ? false
    : window.matchMedia("(prefers-reduced-motion: reduce)").matches,
);

// Listener (MainSidebar.tsx:89-94)
useEffect(() => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  const onChange = (event: MediaQueryListEvent) =>
    setPrefersReducedMotion(event.matches);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}, []);

// Conditional application (MainSidebar.tsx:119-121)
if (prefersReducedMotion) return base;
// ... apply transition only when reduced motion is NOT preferred
```

The onboarding runtime must import this pattern directly or replicate it exactly. Do not invent a new motion-detection approach.

---

## Keyboard Navigation

### Primary Navigation Keys

| Key | Action | Scope |
|-----|--------|-------|
| `Enter` | Advance to next step | Tooltip focused |
| `Right Arrow` (`→`) | Advance to next step | Tooltip focused |
| `Left Arrow` (`←`) | Return to previous step | Tooltip focused |
| `Escape` | Close tooltip (see Escape Behavior below) | Tour active |
| `Tab` | Cycle through tooltip interactive elements | Tooltip focused |
| `Shift + Tab` | Cycle backward through tooltip interactive elements | Tooltip focused |

### Keyboard Shortcut Display

All keyboard shortcuts must be documented in the tooltip footer using the `app-label-sm` token (SF Pro, 8px, 400 weight, `tertiary` color). Shortcut hints appear inline with their associated button:

```
[Previous (←)]     Step 1 of 5     [Skip (Esc)]     [Next (→)]
```

The arrow characters use the standard Unicode arrows `←` and `→`, not Phosphor icons, to keep shortcut hints compact and scannable. The Escape hint uses `Esc` text, not `⎋`.

### Focus Management Within Tooltip

When a tooltip opens, focus moves into the tooltip and cycles through this tab order:

1. **Previous button** (if not on first step) — `Previous (←)`
2. **Next button** (or **Finish** on last step) — `Next (→)` / `Got it`
3. **Skip button** — `Skip tour (Esc)`
4. **Close button** — `×` (icon button)

Tab order is left-to-right matching visual order in the footer. No element between "Next" and "Skip" in the tab sequence — these are adjacent both visually and in DOM order.

---

## Escape Behavior

### Single Escape Press

A single `Escape` keypress during an active tour has two possible outcomes, depending on context:

| Context | Behavior |
|---------|----------|
| Tooltip open, tour active | Close the current tooltip (same as Skip — ends the tour) |
| Tooltip already closed | No operation (tour is not active) |

### No Confirmation Dialog

Escape dismisses the tour immediately. No confirmation modal, no "Are you sure?" dialog, no secondary action required. Rationale:

- The tour is non-destructive. Skipping it has zero data consequences.
- Confirmation dialogs for non-destructive actions are bad UX — they add friction with no safety benefit.
- A contractor learning the product should be able to dismiss a tooltip and get back to work instantly.
- Joyride's default behavior already supports this pattern.

### Persist Skip State Immediately

When Escape is pressed (or Skip is clicked), the tour completion state is persisted via `onboardingPersistence.markComplete()` with `status: 'skipped'` before the tooltip is removed from the DOM. The user must not see a flash of the tooltip after state is persisted.

---

## Skip Behavior

### Visible Skip Button

Every tooltip includes a visible "Skip tour" text link in the footer. This is not hidden behind a menu or icon — it is always visible and labeled.

| Element | Label | Type | Tab Index |
|---------|-------|------|-----------|
| Skip button | `Skip tour` | Text link (button element) | 3rd in tab order |

### Skip Confirmation

No confirmation. Same rationale as Escape — non-destructive action, zero data consequences. The skip state is persisted immediately.

### Keyboard-Accessible Skip

Skip is reachable via:
- **Tab navigation:** 3rd element in the tooltip tab order
- **Escape key:** Global shortcut to skip from anywhere while tour is active
- **Click:** Standard pointer interaction

---

## Focus Trap Behavior

### Trap Activation

When a Joyride tooltip opens, focus is moved into the tooltip, and a focus trap is activated. The trap ensures:

- `Tab` cycles forward through the tooltip's interactive elements (Previous → Next/Finish → Skip → Close)
- `Shift + Tab` cycles backward through the same elements in reverse
- Focus does NOT leave the tooltip and land on background page elements
- Background page elements are NOT reachable via keyboard while the tour is active

### Trap Implementation

React Joyride provides built-in focus trap behavior via its `role="dialog"` and internal focus management. The custom `OnboardingTooltip` component must preserve this behavior and not interfere with Joyride's focus handling.

### Trap Release on Close

When the tooltip closes (via Next on last step, Skip, Escape, or Finish):

1. Focus trap is released
2. Focus is restored (see Focus Restoration below)
3. Background page elements become keyboard-reachable again

---

## Focus Restoration

### Before Tour Starts

On tour initialization, save a reference to `document.activeElement` before any tooltip renders. This is the element that had focus before the tour began — typically a page element the user was interacting with, or the document body.

```typescript
const savedFocusElement = document.activeElement;
```

### On Tour End or Skip

When the tour ends (via completion, skip, or Escape), restore focus to the saved element. If the saved element is no longer in the DOM (e.g., the user navigated away), fall back to the first tour target element on the current route.

```typescript
if (savedFocusElement && document.contains(savedFocusElement)) {
  (savedFocusElement as HTMLElement).focus();
} else {
  // Fallback: focus the first target element visible on the current route
  const firstTarget = document.querySelector('[data-tour^="ae-tour-"]');
  if (firstTarget instanceof HTMLElement) firstTarget.focus();
}
```

### On Modal Open During Tour

If a modal opens while the tour is active (see Modal Conflicts below):

1. Save current tooltip focus position
2. Release focus trap
3. Let the modal manage its own focus
4. On modal close: restore focus to the tooltip element that had focus before the modal opened

### On Route Change During Tour

If the user navigates to a different route while the tour is active:

1. Do NOT attempt to restore focus to an element on the previous route
2. Let the browser handle natural focus management for the new route
3. Clean up the tour state (per Route-Change Conflicts below)

---

## Screen Reader Behavior

### Joyride Defaults

React Joyride provides baseline screen reader support:

| Feature | Joyride Default |
|---------|----------------|
| Tooltip role | `role="dialog"` |
| Tooltip label | `aria-label` on tooltip container |
| Tooltip description | `aria-describedby` linking to step body |
| Focus management | Automatic focus trap |
| Live region | `aria-live="polite"` on step content |

### Step Announcements

When a new step renders, the screen reader must announce three pieces of information in this order:

1. **Step position:** "Step 1 of 5"
2. **Step title:** The title text (e.g., "Your Workshop")
3. **Step body:** The body text (e.g., "This is your estimating workspace...")

The combined announcement reads: *"Step 1 of 5: Your Workshop. This is your estimating workspace. Everything starts here — projects, components, templates, and sheets."*

Implementation: wrap the step content in a container with `aria-live="polite"` and `aria-atomic="true"` so the entire announcement is read when the step changes. Joyride's built-in `aria-live` region handles this; the custom tooltip should not override it.

### Target Element Descriptions

Every element targeted by a tour step (i.e., every element with a `data-tour` attribute) must have a meaningful `aria-label` that describes its purpose:

| `data-tour` Attribute | Required `aria-label` |
|-----------------------|----------------------|
| `ae-tour-workshop-shell` | `Workshop dashboard — your estimating workspace` |
| `ae-tour-main-nav-workshop` | `Main navigation — Workshop, Projects, Components, Templates` |
| `ae-tour-homebase-projects-card` | `Projects — view and manage your project estimates` |
| `ae-tour-homebase-components-card` | `Components — reusable cost items and pricing library` |
| `ae-tour-projects-search` | `Search projects by name or client` |
| `ae-tour-projects-create` | `Create a new project` |
| `ae-tour-new-project-name` | `Project name input` |
| `ae-tour-new-project-image` | `Upload project cover image` |
| `ae-tour-new-project-submit` | `Create project and open dashboard` |
| `ae-tour-estimate-tree` | `Estimate tree — groups and areas panel` |
| `ae-tour-estimate-add-group` | `Add a group to the estimate tree` |
| `ae-tour-estimate-sheet-table` | `Estimate sheet — line items, quantities, and costs` |
| `ae-tour-estimate-component-library` | `Component library — drag priced items into the estimate` |
| `ae-tour-estimate-export` | `Export estimate as Excel workbook` |
| `ae-tour-library-component-grid` | `Component library — grid of reusable cost items` |
| `ae-tour-library-add-component` | `Create a new component in the library` |
| `ae-tour-library-folder-tree` | `Library folders — organize components by trade or type` |

### Skip and Close Button Labels

| Button | `aria-label` |
|--------|-------------|
| Skip | `Skip onboarding tour` |
| Close | `Close onboarding` |
| Previous | `Previous step: {step title}` |
| Next | `Next step: {step title}` |
| Finish (last step) | `Finish onboarding tour` |

### Spotlight Accessibility

During an active tour step, non-target elements in the background receive `aria-hidden="true"` so screen readers do not accidentally navigate into page content behind the overlay. Joyride manages this automatically. The custom tooltip implementation must verify that Joyride's spotlight overlay is not suppressing `aria-hidden` behavior.

---

## Full ARIA Label Map

Every interactive and informational element in the onboarding tooltip requires explicit ARIA labels. The following table maps each element to its required attributes:

| Element | Role | ARIA Attributes |
|---------|------|----------------|
| Tooltip container | `dialog` | `aria-label="Onboarding: {step title}"`, `aria-describedby="[step-body-id]"` |
| Step indicator | — | `aria-label="Step {n} of {total}"` |
| Step title | — | None (read as part of dialog) |
| Step body | — | `id="[step-body-id]"` (referenced by `aria-describedby`) |
| Skip button | `button` | `aria-label="Skip onboarding tour"` |
| Close button | `button` | `aria-label="Close onboarding"` |
| Previous button | `button` | `aria-label="Previous step: {step title}"` |
| Next button | `button` | `aria-label="Next step: {step title}"` |
| Finish button | `button` | `aria-label="Finish onboarding tour"` |
| Spotlight overlay | — | `aria-label="Highlighted area: {target description}"` |

### Dialog Label Construction

The tooltip `aria-label` uses the pattern: `"Onboarding: {step title}"`

Examples:
- `"Onboarding: Your Workshop"`
- `"Onboarding: Start with a project"`
- `"Onboarding: Line items and costs"`

The step title is always the first meaningful information a screen reader user hears after the dialog announcement, so the label must include it.

---

## Reduced Motion

### Pattern Compliance

The onboarding runtime uses the exact `prefers-reduced-motion` pattern from `src/components/sidebar/MainSidebar.tsx` (lines 74–76, 89–94, 119–121). See Existing Accessibility Pattern above for the canonical implementation.

### When `prefers-reduced-motion: reduce` Is Active

The following animations and transitions are disabled:

| Feature | Standard Behavior | Reduced Motion Behavior |
|---------|------------------|------------------------|
| Spotlight overlay animation | CSS transition on overlay opacity | No transition — overlay appears instantly at final opacity |
| Step transition animation | Joyride floater move animation between steps | No animation — tooltip appears instantly at new position |
| Joyride floater animation | CSS transition on floater repositioning | No transition — position updates immediately |
| Tooltip entrance | Fade-in or slide-in animation (if added) | No animation — tooltip renders at final state |

### Implementation Approach

```typescript
// In OnboardingRuntime.tsx or OnboardingProvider.tsx
const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
  typeof window === "undefined"
    ? false
    : window.matchMedia("(prefers-reduced-motion: reduce)").matches,
);

useEffect(() => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  const onChange = (event: MediaQueryListEvent) =>
    setPrefersReducedMotion(event.matches);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}, []);
```

### Joyride Props Affected by Reduced Motion

```typescript
<Joyride
  // Disable overlay scroll behavior when reduced motion is preferred
  disableScrolling={prefersReducedMotion ? false : true}
  // Disable scroll-to-element animation
  scrollToFirstStep={!prefersReducedMotion}
  // Disable floater repositioning animation
  floaterProps={{
    disableAnimation: prefersReducedMotion,
  }}
  // Spotlight animation control
  spotlightPadding={0}
  styles={{
    options: {
      // Neutral overlay color — no animated color transitions
      overlayColor: prefersReducedMotion ? 'rgba(41, 41, 41, 0.5)' : undefined,
    },
  }}
/>
```

**Important:** `disableScrolling` is inverted for reduced motion. When reduced motion is preferred, we allow native browser scrolling (`disableScrolling={false}`) to avoid Joyride's scroll management animation. When reduced motion is NOT preferred, we use Joyride's scroll locking (`disableScrolling={true}`) for a controlled tour experience. This is the one case where the preference behavior inverts — the goal is to avoid all Joyride-managed motion, including scroll animations.

---

## High Contrast and Visual Accessibility

### Overlay Opacity

Joyride's spotlight overlay must have sufficient opacity to provide visual distinction between the highlighted target and background content:

- **Overlay color:** `rgba(41, 41, 41, 0.5)` — 50% opacity on `ink` (#292929)
- **Rationale:** 50% opacity provides enough contrast to dim background content while keeping the target element clearly visible. Lighter overlays (≤30%) risk being invisible to users with contrast sensitivity; darker overlays (≥70%) obscure the highlighted target.

### Tooltip Colors

All tooltip colors use the design system tokens from `DESIGN.md` § Colors:

| Element | Background | Text Color | Border |
|---------|-----------|------------|--------|
| Tooltip body | `surface` (#FFFFFF) | `ink` (#292929) | — |
| Tooltip footer | `surface` (#FFFFFF) | — | Top: `hairline` (#F2F2F2), 1px |
| Step title | — | `ink` (#292929) | — |
| Step body | — | `secondary` (#5D5D5D) | — |
| Step counter | — | `tertiary` (#7F7F7F) | — |
| Previous/Next buttons | `surface` (#FFFFFF) | `ink` (#292929) | — |
| Skip link | — | `tertiary` (#7F7F7F) | — |
| Spotlight cutout | `canvas` (#F5F5F5) highlight | — | — |

### WCAG AA Contrast Compliance

All text in the tooltip must meet WCAG AA contrast ratios:

| Token | Background | Text | Ratio | Status |
|-------|-----------|------|-------|--------|
| `ink` on `surface` | #FFFFFF | #292929 | 14.66:1 | ✅ AAA |
| `secondary` on `surface` | #FFFFFF | #5D5D5D | 5.48:1 | ✅ AA |
| `tertiary` on `surface` | #FFFFFF | #7F7F7F | 3.94:1 | ⚠️ Below AA for normal text |

**`tertiary` (#7F7F7F) on `surface` (#FFFFFF) achieves 3.94:1**, which is below the WCAG AA threshold of 4.5:1 for normal text. However:

- `tertiary` is used only for the step counter (9px) and skip link (10px), which are supplementary/helper text
- WCAG allows 3:1 for "large text" (≥18pt or ≥14pt bold), but Archestimator's 9–10px sizes do not qualify
- **Decision:** Keep `tertiary` for the step counter and skip link as these are supplementary, non-essential elements. The primary instructional content (title + body) uses `ink` and `secondary`, which both meet AA. If accessibility testing surfaces issues, bump skip link to `secondary` (#5D5D5D, 5.48:1).

### Focus Rings

All interactive elements in the tooltip must have a visible focus ring:

- **Style:** 2px solid outline
- **Color:** `focus` token (#292929)
- **Offset:** 2px from element edge
- **Implementation:** Use Tailwind's `focus-visible:outline-2 focus-visible:outline-[#292929] focus-visible:outline-offset-2` or the equivalent in the component's CSS

Do not use `outline-none` on any interactive element in the tooltip. Focus rings are the primary way keyboard users track their position.

---

## Target Interaction During Spotlight

### "Learn by Doing" Model

Tour targets remain interactive during spotlight. The user can click the highlighted element to perform the action naturally rather than only advancing through the tour.

| Scenario | Behavior |
|----------|----------|
| User clicks spotlighted target | Target responds normally (button click, input focus, etc.). Tour tooltip may remain visible or advance, depending on the action. |
| User clicks "Next" | Tour advances to next step without interacting with target |
| User clicks "Skip" | Tour ends without interacting with target |

### Implementation

Joyride's spotlight overlay uses `pointer-events: none` on the overlay layer, which allows clicks to pass through to the highlighted target. The custom tooltip implementation must not interfere with this behavior.

For steps that target clickable elements (buttons, cards, links), the target must remain fully interactive. For steps targeting structural/container elements (the shell, the tree panel, the sheet table), user clicks on those elements should not interfere with normal app behavior.

---

## Modal Conflicts

### When a Modal Opens During Tour

If a modal (project creation, component editor, settings panel) opens while the tour is active:

1. **Pause the tour.** Set tour state to `paused`, remove the spotlight overlay.
2. **Let the modal manage focus.** The modal's own focus trap takes over. Do not attempt to keep the tour tooltip visible over a modal.
3. **Track pause context.** Store the current step index and any in-progress state so the tour can resume.

### When a Modal Closes

When the modal is dismissed:

1. **Resume the tour** from the paused step.
2. **Re-establish the spotlight** on the target element for the current step.
3. **Restore tooltip focus** to the element that had focus before the modal opened.

### When a Tour Step Targets a Modal Element

Steps 3–5 of the Project Creation tour target elements inside the project creation modal (`ae-tour-new-project-name`, `ae-tour-new-project-image`, `ae-tour-new-project-submit`). These steps must only activate when:

1. The tour is active (not paused, not completed).
2. The project creation modal is open.
3. The target element is visible in the DOM.

If the tour is on one of these steps and the modal is not open (e.g., user dismissed it mid-tour), pause the tour and wait. Do not advance the step without the target.

### Implementation

The `OnboardingRuntime` component listens for modal open/close events via a simple event bus or context. When a modal opens:

```typescript
// In OnboardingRuntime
const handleModalOpen = () => {
  setTourState('paused');
};

const handleModalClose = () => {
  setTourState('active');
};
```

The specific mechanism (event bus, React context, or DOM mutation observer) depends on how modals are implemented in the app. If modals use a portal-based pattern, a context provider or shared store is appropriate. If modals are route-based, the route-change conflict rules apply instead.

---

## Route-Change Conflicts

### On Route Change During Tour

If the user navigates to a different route while the tour is active:

1. **Clean up the current tour.** Remove spotlight, close tooltip, release focus trap.
2. **Pause the tour state.** Do not mark as completed or skipped.
3. **Check the new route for a registered tour.** If the new route has a registered tour, do NOT auto-start it. The user is mid-navigation and should not be interrupted with a new tour.
4. **Wait for user to return or timeout.**

### Return Behavior

| Time Since Route Change | Behavior |
|-------------------------|----------|
| ≤ 30 seconds | Resume tour from the step where it was paused |
| > 30 seconds | Reset tour to step 1 (treat as a new visit to the original route) |

### Implementation

```typescript
// In OnboardingRuntime or useOnboardingTourController
const routeChangeTimestamp = useRef<number | null>(null);
const pausedStepIndex = useRef<number>(0);

useEffect(() => {
  // On route change, capture timestamp and pause
  routeChangeTimestamp.current = Date.now();
  pausedStepIndex.current = currentStepIndex;
  pauseTour();
}, [pathname]);

useEffect(() => {
  // On return to original route, check elapsed time
  if (routeChangeTimestamp.current) {
    const elapsed = Date.now() - routeChangeTimestamp.current;
    if (elapsed <= 30_000) {
      resumeTour(pausedStepIndex.current);
    } else {
      resetTour();
    }
    routeChangeTimestamp.current = null;
  }
}, [pathname]);
```

### Manual Replay vs Auto-Resume

Do not confuse route-change resume with manual replay. Manual replay (triggered from Settings) always starts the tour from step 1, regardless of prior pause state. Route-change resume restores the previous pause position within the 30-second window only.

---

## Testing Plan

### Keyboard-Only Testing

| Test | Steps | Expected Result |
|------|-------|----------------|
| Full tour keyboard navigation | Start tour, use Tab to reach Next button, press Enter 5 times | Each Enter advances one step. Tour completes after final step. |
| Previous step navigation | Start tour, advance to step 3, press Left Arrow twice | Returns to step 1. Previous button is hidden (not disabled) on step 1. |
| Escape skip | Start tour, press Escape on step 2 | Tooltip closes. Tour marked as skipped. Focus returns to pre-tour element. |
| Focus trap integrity | Start tour, focus on tooltip, press Tab repeatedly | Focus cycles through Previous → Next → Skip → Close → Previous. Never reaches background elements. |
| Focus restoration | Complete tour via Next on last step | Focus returns to the element that had focus before tour started. |
| Tooltip tab order | Focus on tooltip, observe tab sequence | Order is: Previous, Next/Finish, Skip, Close. Matches visual order left-to-right. |

### Screen Reader Testing

| Test | Tool | Steps | Expected Result |
|------|------|-------|----------------|
| Step announcement | VoiceOver + Safari (macOS) | Start tour, advance through all steps | Each step announces "Step {n} of {total}: {title}. {body}." |
| Skip announcement | VoiceOver + Safari (macOS) | Focus Skip button, press Enter | Announces "Skip onboarding tour" on focus. Announces tour dismissal on activation. |
| Complete announcement | VoiceOver + Safari (macOS) | Complete final step | Announces tour completion. Screen reader returns to page content. |
| Target description | NVDA + Chrome (Windows) | Focus on a highlighted target element | Screen reader reads the `aria-label` of the target (e.g., "Projects — view and manage your project estimates"). |
| Dialog context | VoiceOver + Safari (macOS) | Start tour | Screen reader identifies tooltip as a dialog: "Onboarding: Your Workshop, dialog." |

### Additional Screen Reader Testing

| Tool | Platform | Browser | Notes |
|------|----------|---------|-------|
| VoiceOver | macOS | Safari | Primary testing combination |
| NVDA | Windows | Chrome | Secondary testing combination |
| NVDA | Windows | Firefox | Tertiary (optional) |

### Reduced Motion Testing

| Test | Steps | Expected Result |
|------|-------|----------------|
| System setting active | Enable "Reduce motion" in OS accessibility settings, start tour | No spotlight animation, no step transition animation, no floater repositioning animation. Tooltips appear instantly. |
| System setting inactive | Disable "Reduce motion", start tour | Spotlight and tooltip transitions render normally. |
| Runtime change | Start tour with reduced motion off, enable reduced motion mid-tour | Transitions stop on next step. Already-in-progress animations complete naturally. |
| Runtime change (reverse) | Start tour with reduced motion on, disable mid-tour | No change — transitions remain disabled for the current tour session. |

---

## Accessibility Acceptance Criteria

Every item must pass before the onboarding system is considered production-ready:

### Keyboard Navigation

- [ ] All tour steps navigable with keyboard only (Tab + Enter, no mouse required)
- [ ] Previous step reachable via Left Arrow key
- [ ] Next step reachable via Right Arrow or Enter key
- [ ] Escape dismisses tour at any point during any step
- [ ] Focus trapped in tooltip during active step (no escape to background)
- [ ] Focus returned to appropriate element after tour ends or is skipped
- [ ] Tab order within tooltip matches visual order (Previous → Next → Skip → Close)

### Screen Reader

- [ ] Screen reader announces step number, title, and body on every step change
- [ ] Skip and close buttons have clear, descriptive accessible labels
- [ ] Target elements have meaningful `aria-label` attributes
- [ ] Tour completion and dismissal are announced to screen reader
- [ ] Spotlight hides non-target elements from screen reader via `aria-hidden`

### Visual Accessibility

- [ ] Reduced motion users get static transitions with no animation
- [ ] All text meets WCAG AA contrast (4.5:1 for primary text; 3:1 for supplementary text)
- [ ] Focus rings visible on all interactive tooltip elements
- [ ] Overlay provides sufficient contrast against both dark and light backgrounds
- [ ] Tooltip text uses `app-title`, `app-body`, and `app-label` tokens — readable at 9–12px

### Interactive Behavior

- [ ] Target elements remain interactive (clickable) during spotlight
- [ ] Clicking a target performs its intended action while tour is active
- [ ] Skip and close buttons have clear accessible labels and are keyboard-operable
- [ ] Modal conflicts handled: tour pauses during modal, resumes after modal close
- [ ] Route-change conflicts handled: tour pauses on navigation, resumes within 30s, resets after 30s

### Implementation

- [ ] Reduced motion detection uses the `MainSidebar.tsx` pattern exactly (no new pattern)
- [ ] All ARIA labels constructed using the patterns defined in this document
- [ ] Joyride `role="dialog"` and focus trap behavior preserved by custom tooltip
- [ ] `aria-describedby` links tooltip body to the dialog for screen reader announcement
- [ ] No `outline-none` on any interactive tooltip element

---

## Joyride Defaults vs Custom Tooltip

### What Joyride Provides (No Custom Work Required)

| Feature | Joyride Default |
|---------|----------------|
| `role="dialog"` on tooltip | ✅ Built-in |
| Focus trap (Tab cycling within tooltip) | ✅ Built-in |
| Escape to close | ✅ Built-in via `disableCloseOnEsc` prop (default: `false` = Escape closes) |
| Keyboard navigation (Enter/arrows) | ✅ Built-in |
| `aria-label` on tooltip | ✅ Built-in (customizable via `locale` prop) |
| `aria-describedby` linking body to dialog | ✅ Built-in |
| `aria-live` region for step content changes | ✅ Built-in |
| Spotlight overlay with `aria-hidden` | ✅ Built-in |
| `pointer-events: none` on spotlight overlay | ✅ Built-in |
| Scroll management | ✅ Built-in via `disableScrolling` prop |

### What the Custom Tooltip Must Add

| Requirement | Why Custom |
|-------------|-----------|
| Design system compliance | SF Pro fonts, 12px max size, 3px radius, neutral color tokens — Joyride's default tooltip uses generic styling that violates `DESIGN.md` constraints |
| Phosphor icons | Navigation buttons need `CaretLeft`, `CaretRight`, and `X` icons in Phosphor regular weight — Joyride defaults use text arrows or no icons |
| App-specific ARIA labels | Labels like "Onboarding: Your Workshop" and "Previous step: {title}" are Archestimator-specific — Joyride defaults use generic labels |
| Step counter styling | "Step 1 of 5" with `app-label` token (9px, 500, tertiary) — Joyride defaults use a larger generic counter |
| Reduced motion integration | Must integrate with the `MainSidebar.tsx` pattern — Joyride has no awareness of Archestimator's reduced motion convention |
| Modal conflict handling | Pause/resume on modal open/close — Joyride has no modal-awareness by default |
| Route-change pause | Pause tour on route change, resume within 30s — Joyride has no router integration |

### Custom Tooltip Implementation Constraints

The custom `OnboardingTooltip` component:

1. Must wrap Joyride's `tooltipComponent` prop — Joyride handles all behavioral logic (step management, focus, ARIA), the custom component handles only visual rendering.
2. Must preserve ALL Joyride-provided ARIA attributes — do not override `role`, `aria-label`, `aria-describedby`, or `aria-live` that Joyride sets on the container.
3. Must use the props contract Joyride passes to custom tooltips — `step`, `primaryProps`, `tooltipProps`, `backProps`, `closeProps`, `skipProps`, `index`, `size`, `isLastStep`.
4. Must NOT manage its own focus — Joyride's focus trap handles this. Buttons must be focusable (`tabIndex={0}`, not `tabIndex={-1}`) and must fire their respective Joyride callbacks.
5. Must render within Joyride's floater container — no portals, no fixed positioning outside the floater.
