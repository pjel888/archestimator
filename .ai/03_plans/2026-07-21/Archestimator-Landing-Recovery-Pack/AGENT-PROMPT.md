# Ready-to-Paste Implementation Prompt

Rebuild the Archestimator `/new` landing page using this recovery pack as the controlling brief.

Read every file in this pack before editing code. Treat `00-FOUNDER-RESET.md` as founder authority. It supersedes the current Attio-led 18-band plan, the 15-main-block invariant in `src/components/landing/new-redesign/content.ts`, and the ban on Three.js/WebGL.

The required outcome is a compact immersive page with no more than four main narrative sections plus footer, no more than 260 visible words before the footer, and no more than 4,200px of desktop document height at 1440 × 900.

Use one purposeful Three.js visual: the Living Estimate. Recover the conceptual and technical discipline from commit `b074741c5ea90f45f4d7129110cea51cf386a231`, especially:

- `src/components/landing-new/LivingEstimateScene.tsx`
- `src/components/landing-new/living-estimate-model.ts`
- `src/components/landing-new/LivingEstimatePoster.tsx`

Do not revert the old page. Port only the scene idea and useful lifecycle/geometry patterns into the new compact architecture described in `04-IMPLEMENTATION.md`.

The scene must show estimate plates assembling, compressing into a proposal, receiving a review pin, and lifting a revised row while a ghost preserves the prior state. A Signal-orange Cost Thread stays connected through all four states. Use semantic DOM copy for meaning; do not render fake UI, browser chrome, canvas text, or pseudo-screenshots.

Use the existing GSAP/ScrollTrigger dependencies for one native-scroll timeline. Do not add Lenis. Re-add `three` and `@types/three` only when the scene is in active use.

Build static content and the SVG/poster fallback first. Then add the dynamic client-only canvas. The page must remain usable with JavaScript disabled, reduced motion, WebGL failure, and on mobile.

Before declaring completion, capture and inspect desktop, mobile, reduced-motion, WebGL-failure, and full-page states. Measure document height and enforce every checkbox in `05-ACCEPTANCE.md`. Do not preserve a section merely because it existed in the current implementation.
