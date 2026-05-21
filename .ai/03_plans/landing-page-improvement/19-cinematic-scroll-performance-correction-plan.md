# Cinematic Scroll Performance Correction Plan

**Status:** Active correction plan
**Created:** 2026-05-21
**Scope:** Public landing page `/`; below-hero scroll behavior only.
**Hero boundary:** Do not alter visible hero content, layout, or copy.

## Diagnosis

Philip wanted smooth, cinematic scrolling with a subtle section settle. The current implementation overshot the intent because it combines three scroll systems at once:

1. Lenis smooth wheel scrolling.
2. Native CSS `scroll-snap-type: y mandatory` and `scroll-snap-stop: always` on the document.
3. A custom wheel listener that calls `event.preventDefault()`, locks Lenis, and immediately sends the user to the next section.

This makes the landing page feel like a hard slideshow instead of a smooth page. Browser evidence showed one small wheel event landing at the next section by the first 100 ms sample, which explains the perceived lag/jump/fighting behavior.

## Correct experience target

The page should feel like a premium cinematic landing page, not a presentation deck.

- Wheel/trackpad input remains responsive; do not hijack every wheel event.
- Lenis provides continuous smooth scrolling.
- Sections still have visual resting points, but they should feel magnetic/settled, not hard-stopped.
- When the user stops scrolling between major sections on desktop, the page gently settles to the nearest/next appropriate section.
- Small accidental wheel movement should not force a full-section jump.
- Keyboard navigation can remain discrete because Arrow/Page keys are explicit commands.
- Reduced-motion users get native scrolling, no Lenis, no scroll settling, and paused carousel motion.

## Implementation direction

### 1. Remove hard native snap

Modify `src/app/globals.css`:

- Remove desktop `scroll-snap-type: y mandatory` from `html` and `body`.
- Remove `scroll-snap-align: start` and `scroll-snap-stop: always` as the primary behavior.
- Keep `scroll-padding-top: 68px` so anchor and programmatic scrolls land below the fixed header.
- Keep reduced-motion rules for explicit no-motion safety where useful.

### 2. Replace wheel hijack with soft scroll settling

Modify `src/components/landing/LandingSnapController.tsx`:

- Do not call `event.preventDefault()` on wheel events.
- Do not lock Lenis during normal wheel scrolling.
- Listen for user input only to record intent and direction.
- Listen to Lenis/native scroll updates and debounce a settle action after the user stops scrolling.
- Use progress between adjacent landing snap points:
  - if progress is close to the previous section, settle back;
  - if progress crosses a deliberate threshold toward the next section, settle forward;
  - avoid snapping from tiny accidental scrolls.
- Use a slower/easier easing curve for the settle, not an instant jump.

### 3. Tune Lenis for smooth but not sluggish motion

Modify `src/components/landing/LandingSmoothScrollProvider.tsx`:

- Slightly lower `lerp` from the current quick value.
- Slightly reduce wheel multiplier if needed.
- Keep `smoothWheel: true`.
- Keep `prevent` support for nested/interactive regions.

### 4. Preserve accessibility

- Reduced motion disables Lenis and the soft settle controller.
- Interactive controls are ignored by section settling.
- Keyboard section navigation handles `Shift+Space` as backward movement.
- Carousel pause/resume control remains keyboard-accessible.

## Acceptance criteria

### Browser evidence

At desktop width:

- Homepage returns 200.
- No console errors or page errors.
- `html` / `body` no longer report hard `scroll-snap-type: y mandatory`.
- Lenis is active for normal-motion users.
- A small wheel delta does not jump to the next section within 100 ms.
- A deliberate wheel sequence smoothly progresses and settles to a section rest point after input stops.
- Product tabs and carousel pause/resume still work.

At reduced motion:

- Lenis class is absent.
- Scroll snap/settle behavior is absent.
- Company proof marquee animation is disabled and duplicate track is hidden.

### Verification commands

- `bun run test:dom -- tests/vitest/landing-company-proof.test.ts tests/vitest/landing-interactivity.test.tsx`
- `bun run type-check`
- `bun run lint`
- `bun run validate`
- `git diff --check`
- `bun run build`
- Production browser smoke on `http://localhost:3034/`

## Non-goals

- Do not rewrite landing content in this correction pass.
- Do not replace placeholders with fake proof.
- Do not add GSAP or another animation library for scroll behavior before proving Lenis-only tuning fails.
- Do not alter the accepted hero content/layout.
