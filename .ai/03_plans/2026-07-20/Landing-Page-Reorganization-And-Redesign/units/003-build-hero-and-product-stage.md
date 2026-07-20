# UNIT-003 — Build Hero and Product Stage

**Status:** READY  
**Depends on:** UNIT-002  
**Goal:** Implement Attio ordinal Band 03 as one centered hero/product composition with an original four-state Archestimator stage and exact type/motion boundaries.

## Owned paths

- `src/components/landing/new-redesign/sections/Hero.tsx`
- `src/components/landing/new-redesign/sections/Hero.module.css`
- `src/components/landing/new-redesign/sections/ProductStage.tsx`
- `src/components/landing/new-redesign/sections/ProductStage.module.css`
- `src/components/landing/new-redesign/interactions/HeroStage.client.tsx`
- `src/components/landing/new-redesign/interactions/ProductPlayback.client.tsx`

## Implementation

1. Render the approved eyebrow, H1, subheadline, and one CTA server-side.
2. Lock the desktop H1 break after “build,” and use the architecture's exact type ramp: `40/38`, `56/54`, then `64–80/.95`.
3. Build the product stage as original DOM/SVG using the shared sanitized fixture:
   - Estimate: hierarchical rows and calculated fields.
   - Reusable knowledge: source search, selection, and preview.
   - Proposal output: preview/Excel/issued state.
   - Client review: targeted comment and decision/version context.
4. Keep visual internals presentation-only where appropriate and provide a concise semantic summary for each selected tab.
5. Implement `ProductPlayback.client.tsx` as a state/timer controller only; it toggles data/state, does not render a second client copy of the entire scene.
6. Start playback only when the stage approaches the viewport; pause offscreen and when the tab is hidden; stop after one full cycle; stop permanently after manual selection.
7. Use the reference dwell sequence only while each scene has meaningful staged activity. No idle animated progress.
8. Implement hero entry order and desktop initial-scroll response in `HeroStage.client.tsx`; below `768px` and under reduced motion, render an in-flow, fully visible static state.
9. Use the pale Signal gradient/stripe atmosphere and product-only layered shadow. No blue reference gradient, canvas, video, Three, GSAP, or draggable satellite windows.

## Acceptance

- Hero copy and CTA exactly match canonical content.
- Hero copy and product stage form one continuous Band 03 rather than two independently spaced page sections.
- Desktop product stage is visually dominant without exceeding the `1440px` cap.
- Mobile product visuals are purpose-built/readable, not scaled desktop UI.
- Four tabs are keyboard and screen-reader understandable.
- Autoplay obeys in-view, visibility, single-cycle, manual-stop, and reduced-motion rules.
- The review scene does not imply that a revision request automatically changes the estimate.
- No text or control shifts when scenes change.

## Decisive verification

- Source inspection of timer/observer/listener cleanup and media-query branch.
- Type/LSP diagnostics and scoped lint.
- Static scan proving no `canvas`, `three`, `gsap`, video, or old landing import.

## Recovery

Remove the new Hero/ProductStage files and restore the scaffold slots; the active `/new` route still points to the old tree.
