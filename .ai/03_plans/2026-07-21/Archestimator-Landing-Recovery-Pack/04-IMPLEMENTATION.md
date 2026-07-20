# Implementation Plan

## File architecture

Create a compact replacement tree rather than extending the current 15-block structure.

```text
src/components/landing/immersive/
  ImmersiveLandingExperience.tsx       # server composition
  ImmersiveLandingHeader.tsx           # server-first chrome
  content.ts                           # short copy only
  immersive.module.css                 # page rhythm and responsive layout
  LivingEstimateStory.client.tsx       # scroll state + semantic copy
  LivingEstimateScene.client.tsx       # Three.js lifecycle
  living-estimate-model.ts             # pure state/layout math
  LivingEstimatePoster.tsx             # SVG/static fallback
```

Keep the route `force-static`, `noindex` during review, and preserve the current canonical CTA destination.

## Remove from the new page

- `mainBlocks` and its exact-length assertion.
- Capability matrix.
- Five full-screen workflow chapters.
- Reusable-intelligence playback.
- Decision-signals playback.
- Deliverables pseudo-screenshots.
- Traceability inspector.
- Founder section as an independent band.
- Honest-proof matrix.
- Illustrative-workflow playback.
- Current-product rail.
- FAQ accordion.
- Announcement bar unless truly needed.
- Repeated `ProductPlayback` instances.
- `demoProject` as the organizing device for the page.

Product truth may still inform the scene and copy; it does not need to appear as faux interface panels.

## Build sequence

### Step 1 — Freeze the short contract

- Replace the current block-count contract with the four-section spine.
- Add automated checks for maximum section count and copy budget.
- Keep the old `/new` import available behind a temporary local-only switch until the new tree renders.

### Step 2 — Recover the scene model

- Read the earlier scene at commit `b074741c5ea90f45f4d7129110cea51cf386a231`.
- Port only the useful scene/model ideas.
- Remove old fixture-specific presentation copy and old page coupling.
- Keep geometry and lifecycle discipline.

### Step 3 — Build static page first

- Implement semantic DOM content and SVG poster before mounting Three.js.
- Verify the page succeeds with JavaScript disabled and WebGL unavailable.
- Verify desktop and mobile height budgets before animation work.

### Step 4 — Add scroll-linked scene

- Use existing GSAP and ScrollTrigger dependencies.
- One timeline, one pinned story, four states.
- Copy remains readable and controllable by native scrolling.
- Add reduced-motion and visibility handling before polish.

### Step 5 — Cut over and delete bloat

- Swap `/new` to the immersive tree.
- Remove the current `new-redesign` section/playback components once rollback is no longer needed.
- Re-add `three` and `@types/three` only if the final scene is accepted.
- Do not add Lenis or a general animation framework.

## Verification

- 1440 × 900 desktop screenshot at top, each state, and full page.
- 390 × 844 mobile screenshot at top and full page.
- Reduced-motion screenshot.
- Forced WebGL failure screenshot.
- JavaScript-disabled content check.
- Keyboard navigation and focus-visible check.
- Console and page-error check.
- Full-page height measurement.
- Bundle delta and route performance measurement.
