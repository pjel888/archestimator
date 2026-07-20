# `/new` Landing Page Design QA

## Comparison Setup

- **Source visual truth:** `.ai/03_plans/2026-07-20/Landing-Page-Reorganization-And-Redesign/ARCHESTIMATOR_NEW_LANDING_PAGE_COMPREHENSIVE_AUDIT_AND_IMPROVEMENT_PLAN_V1_2026-07-20.md`
- **Supporting creative direction:** `.ai/03_plans/2026-07-20/Landing-Page-Reorganization-And-Redesign/ARCHESTIMATOR_LANDING_PAGE_CREATIVE_DIRECTION_IMPLEMENTATION_BRIEF_V1_2026-07-20.md`
- **Baseline screenshots:** `.omx/artifacts/visual-ralph/landing-new/baseline/desktop.png`, `.omx/artifacts/visual-ralph/landing-new/baseline/mobile.png`
- **Final implementation screenshots:** `.omx/artifacts/visual-ralph/landing-new/final/desktop.png`, `.omx/artifacts/visual-ralph/landing-new/final/mobile.png`
- **Fallback screenshots:** `.omx/artifacts/visual-ralph/landing-new/final/reduced-motion.png`, `.omx/artifacts/visual-ralph/landing-new/final/no-webgl.png`
- **Route:** `http://127.0.0.1:3000/new`
- **Viewports:** 1440 × 900 desktop, 768 × 1024 tablet, 390 × 844 mobile
- **State:** public route, essential cookies selected, desktop Living Estimate settled, first FAQ expanded on mobile

## Full-View Comparison Evidence

The baseline desktop page was 6,952px tall, clipped most of its animated hero headline, and left three long proof chapters visually empty until their sticky state was activated. The final desktop page is 5,493px tall, renders the approved headline in exactly three visible lines, and exposes the entire connected estimate-to-proposal proof sequence without requiring scroll-trigger activation.

The final mobile page has `scrollWidth === clientWidth === 390`, keeps the primary CTA above the proof scene, renders the poster instead of mounting WebGL, exposes the full proof sequence as one column, and preserves the cost-knowledge, trust, FAQ, and final conversion chapters.

## Focused Region Evidence

- **Hero:** `.omx/artifacts/visual-ralph/landing-new/final/desktop.png` proves one H1, a three-line desktop wrap, a 48px primary CTA, the four-stage workflow trail, and the single Living Estimate scene.
- **Connected product proof:** the same capture shows one large verified-column estimate artifact followed by proposal, discussion/decision, and activity evidence. Each software-like artifact is explicitly labelled as a concept model rather than a screenshot.
- **Responsive behavior:** `.omx/artifacts/visual-ralph/landing-new/final/mobile.png` proves the mobile poster, single-column evidence flow, working menu, expanded FAQ, and no horizontal overflow.
- **Fallbacks:** reduced-motion keeps the H1 and complete page; forced WebGL failure mounts zero canvases and leaves the poster visible.

## Required Fidelity Surfaces

### Fonts and Typography

- Uses the existing Inter/SF and Roboto Mono project stacks; no new font was introduced.
- Desktop H1 is exactly three lines at 1440px, uses `-0.04em` tracking, and remains visible without JavaScript.
- Body copy stays within readable measures and uses balanced/pretty wrapping where appropriate.
- Small metadata uses mono selectively for estimate provenance, status, and revision details.

### Spacing and Layout Rhythm

- Replaced the 6,952px sticky-scroll composition with six distinct chapters and a 5,493px desktop document.
- Product proof receives the largest content area; audience and trust content are deliberately quieter.
- Large surfaces use the brief's 12–16px radius allowance; controls use compact 3–4px geometry.
- Desktop, tablet, and mobile have no horizontal viewport overflow.

### Colors and Visual Tokens

- Retains the approved paper, graphite, and signal-orange direction.
- Orange is limited to action, source/evidence, active state, changed value, and the connected Cost Thread.
- The dark cost-knowledge chapter creates one deliberate contrast reset rather than alternating generic card bands.

### Image Quality and Asset Fidelity

- No stock construction photography, fake browser chrome, custom logo replacement, emoji, or placeholder imagery is used.
- The WebGL scene is explicitly a semantic concept illustration; it is not presented as a current-product screenshot.
- Product-like proof uses current source terminology and decision labels and carries an explicit concept-model disclosure.
- The static poster remains the complete no-WebGL and mobile visual.

### Copy and Content

- The hero identifies the category immediately and preserves the plan's strongest outcome headline.
- The page follows one sequence: estimate → proposal → feedback/decision → revision.
- The standalone three-benefit card grid, broad role taxonomy, repeated trust copy, and redundant FAQs were removed.
- The primary CTA is consistently “Request early access” and resolves to `/contact?intent=access`.
- No fabricated metrics, testimonials, customer logos, AI claims, or superiority claims appear.

## Comparison History

### Iteration 0 — Baseline

- **P1:** Hero headline clipped during the global GSAP line reveal.
- **P1:** Sticky proof left major desktop regions visually empty in full-page and non-animated states.
- **P1:** Four fake interface states carried more visual authority than their product-truth status allowed.
- **P2:** The page repeated its connected-workflow argument across too many sections and 6,952px of desktop scroll.

### Iteration 1 — Structural Rewrite

- Removed the universal line-mask reveal and replaced it with a finite whole-heading entrance.
- Replaced pinned proof choreography with one static-first proof ledger and visible evidence rail.
- Reduced the page to one dominant story and moved authentic source vocabulary into the first proof chapter.
- Replaced generic benefit cards with a four-step editorial workflow summary.
- Post-fix evidence: `.omx/artifacts/visual-ralph/landing-new/iteration-1/desktop.png` and `.omx/artifacts/visual-ralph/landing-new/iteration-1/mobile.png`.

### Iteration 2 — Hero and Responsive Refinement

- Gave the exact approved headline full editorial width, producing a measured three-line desktop wrap.
- Moved the Living Estimate into a wide stage under the message, clarifying hierarchy and removing the underpowered split.
- Verified desktop, tablet, mobile, reduced-motion, and no-WebGL states with no console errors.
- Post-fix evidence: `.omx/artifacts/visual-ralph/landing-new/final/desktop.png`, `.omx/artifacts/visual-ralph/landing-new/final/mobile.png`, `.omx/artifacts/visual-ralph/landing-new/final/reduced-motion.png`, and `.omx/artifacts/visual-ralph/landing-new/final/no-webgl.png`.

## Findings

No actionable P0, P1, or P2 findings remain for the redesigned `/new` route.

## Primary Interactions Tested

- Desktop Living Estimate state control changes to Proposal.
- Mobile navigation opens and exposes the early-access CTA.
- FAQ disclosure opens through its native summary control.
- Hero CTA resolves to `/contact?intent=access`, which returns HTTP 200 locally.
- Console and page-error collection returned no errors in the final captures.

## Follow-up Polish

- **P3:** Replace the explicitly labelled concept-model proof with sanctioned, sanitized current-product captures when founder-approved fixtures are available.
- **P3:** Re-run the same capture matrix after any future public-route cutover from `/new` to `/`.

## Validation Note

Targeted ESLint passes and the route compiles and renders through Next.js. The repository-wide typecheck is not green because unrelated current work in `src/lib/auth/better-auth-cloudflare.ts` supplies an incomplete D1 mock shape at lines 211, 219, and 327.

## Final Result

passed
