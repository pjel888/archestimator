# Design QA: Kimi3D Hero

- **Source visual truth:** `/var/folders/bn/7b1mmzfj6j52jkpfny_33f840000gn/T/codex-clipboard-e963f8be-54c1-453e-9ac2-f2ed96b334c1.png`.
- **Implementation screenshot:** `/Users/philiplewis/.codex/visualizations/2026/07/23/019f8d99-aac1-7822-9700-05617afaa108/kimi3d-hero-jersey25-final.jpg`.
- **Combined comparison:** `/Users/philiplewis/.codex/visualizations/2026/07/23/019f8d99-aac1-7822-9700-05617afaa108/kimi3d-hero-reference-vs-actual.jpg`, with the source on the left and current implementation on the right.
- **Viewport and density:** the final visual capture is `1872x1365` CSS pixels at `devicePixelRatio: 1.2`. Exact responsive geometry was also checked at `1280x800` and `415x843`.
- **State:** public `/kimi3d` route at the top of the page, signed-out CTA variant, desktop navigation open, no overlays or dialogs.
- **Full-view comparison:** the accepted panoramic architectural image remains the dominant element, now without the source reference frame. The headline, supporting copy, and CTA form a single asymmetric composition beneath it.
- **Focused hero comparison:** the product-category eyebrow now precedes the image in DOM and visual order. The headline uses Jersey 25 at its native weight `400`; the mono subtitle and dense dot grid retain the technical voxel register.
- **Desktop geometry:** at `1280x800`, the eyebrow is at `y=82–97`, image at `y=97–498`, headline at `y=543–610`, description at `y=571–694`, and CTA at `y=722–771`. Document width equals viewport width.
- **Mobile geometry:** at `415x843`, document width equals viewport width; the headline wraps to two lines at `45.65px/800`, and the CTA remains single-line and visible through `y=788`.
- **Interactions:** the hero is static apart from existing reveal motion. The primary CTA renders as one enabled link with a non-wrapping label.
- **Console:** no browser warnings or errors in the final desktop or responsive checks.
- **Static checks:** targeted ESLint and `git diff --check` pass for the changed hero source.
- **Independent review:** two read-only reviewers returned `PASS`; no blocking Hallmark, hierarchy, overflow, fold-fit, typography-family, honest-copy, or CTA-readability issues remain.

## Comparison History

1. **Initial:** eyebrow below image, lightweight dotted display face, and supporting copy pushed out of the opening composition.
2. **Round one:** eyebrow moved above image; headline switched to an `800`-weight geometric face; copy and CTA aligned in an eight/four-column split.
3. **Final:** headline moved to Jersey 25, the trailing square accent was removed, responsive overflow and fold fit were rechecked, and both independent gates passed.

final result: passed

---

# Design QA: Workshop First Estimate Checklist

- **Source visual truth:** `.omx/artifacts/visual-ralph/first-estimate-checklist/baseline-workshop.png` and `.omx/artifacts/visual-ralph/first-estimate-checklist/baseline-checklist.jpg`.
- **Implementation screenshots:** `.omx/artifacts/visual-ralph/first-estimate-checklist/final-workshop-3440.png`, `.omx/artifacts/visual-ralph/first-estimate-checklist/final-checklist-3440.jpg`, and `.omx/artifacts/visual-ralph/first-estimate-checklist/collapsed-1440-checklist.png`.
- **Combined comparison:** `.omx/artifacts/visual-ralph/first-estimate-checklist/comparison-wide.png`; `.omx/artifacts/visual-ralph/first-estimate-checklist/pixel-diff-wide.png` is secondary evidence of the intentional structural redesign.
- **Viewport and density:** primary implementation capture is `3440x1322` CSS pixels at `devicePixelRatio: 1`. The focused baseline is `510x246` pixels; the focused final comparison canvas is `987x254` pixels, with the rendered checklist at `946.84x214` CSS pixels.
- **State:** authenticated `/workshop`, expanded checklist, saved-work progress `2/4`, next step “Add an area and priced row.”
- **Full-view comparison:** the checklist now participates in the dashboard grid instead of reading as an undersized lower-left modal. It spans the appropriate adaptive columns while preserving the surrounding dashboard hierarchy.
- **Focused comparison:** global progress and controls occupy an architectural summary rail; the four tasks form one continuous matrix with hairline divisions, restrained green saved states, orange next-step emphasis, and neutral pending treatment.
- **Responsive evidence:** `.omx/artifacts/visual-ralph/first-estimate-checklist/responsive-1024-checklist.png`, `.omx/artifacts/visual-ralph/first-estimate-checklist/responsive-768-checklist.png`, `.omx/artifacts/visual-ralph/first-estimate-checklist/responsive-414-checklist.png`, `.omx/artifacts/visual-ralph/first-estimate-checklist/responsive-375-checklist.png`, and `.omx/artifacts/visual-ralph/first-estimate-checklist/responsive-320-checklist.png`.
- **Responsive geometry:** no checklist or document overflow at any checked width. The `1024px` card is `653.42x133.11`; narrower layouts stack into a single flow with an exact `8px` gap to the next dashboard region.
- **Primary interactions:** Hide checklist produced the `758.84x64` collapsed strip at `1440px`; Reopen restored the expanded `2/4` state. Existing guide and task links remain real links, and visibility controls remain buttons.
- **Console:** no console errors or page errors in the final desktop, responsive, collapsed, or reopened checks.
- **Static evidence:** targeted ESLint and `git diff --check` pass. Full TypeScript checking remains blocked only by unrelated stale `.next/types` imports and existing `src/lib/admin/user-actions.ts` nullability errors; neither changed file appears in the error output.
- **Independent verdict:** Visual Ralph scored the final artifacts `97/100`, with empty P0, P1, and P2 findings. The read-only code review also found no P0, P1, or P2 behavior, accessibility, or responsive-CSS issues.

## Comparison History

1. **Baseline:** weak hierarchy, generic nested cards, undersized dashboard presence, and limited brand expression.
2. **First implementation:** introduced the summary rail, continuous task matrix, saved/next/pending state system, and adaptive desktop column spans.
3. **Responsive repair:** removed mobile clipping and tablet overlap, restored normal-flow height below `1024px`, and verified the `8px` dashboard gap.
4. **92/100 refinement:** retained descriptions at `1024px`, strengthened the Doto title weight, and relaxed the `320px` task rhythm.
5. **97/100 final:** no actionable P0, P1, or P2 visual findings remain.

final result: passed

---

# Prior Design QA: Mistral Landing

- **Source visual truth:** `.omx/artifacts/visual-ralph/mistral-landing/source-desktop.png` and `.omx/artifacts/visual-ralph/mistral-landing/source-mobile.png`.
- **Implementation screenshots:** `.omx/artifacts/visual-ralph/mistral-landing/implementation-desktop-final-v4.png`, `.omx/artifacts/visual-ralph/mistral-landing/implementation-mobile-final-v5.png`, `.omx/artifacts/visual-ralph/mistral-landing/implementation-full-final-v4.png`, and `.omx/artifacts/visual-ralph/mistral-landing/implementation-mobile-full-final-v5.png`.
- **Viewport:** desktop CSS viewport `1440x900`; mobile CSS viewport `390x844`.
- **Dimensions and density:** desktop source and implementation are both `1800x1125` pixels; mobile source and implementation are both `488x1054` pixels. Both comparison pairs use the same `1.25` screenshot raster scale. The Chrome viewport override reported `devicePixelRatio: 0.8` for both states, so comparison used matched source and implementation dimensions rather than mixing density bases.
- **State:** top-of-page hero, signed-in CTA variant, mobile menu closed for the primary captures, saved cookie consent with the home-page settings trigger rendered in normal document flow. The Next.js development indicator is not application UI and was excluded from scoring.
- **Full-view comparison evidence:** the desktop and mobile fold captures compare the complete supplied source composition. Full-page implementation captures verify global page bounds; focused browser checks carry reveal-dependent module evidence because stitched full-page capture does not trigger every scroll reveal.
- **Focused region evidence:** desktop header `48px`, primary split at `x=1007.74`, hero row seam at `y=540.64`, visual field `y=540.64–900.02`, and first product field `x=0.63–1439.38`. Mobile support is three lines, rail `y=317.84–444.93`, visual field `y=445.56–664.93`, and workflow strip `y=664.93–824.93`.
- **Layout findings:** no active `LandingContainer`, no runtime class containing `container`, `body` margin `0`, and horizontal overflow `0` at both viewports. Browser rectangle checks found no title/statement, canvas/rail, rail/canvas, or canvas/workflow-strip collision.
- **Primary interactions:** the mobile menu resolved to one exact control, opened a `390x233.6` panel from `y=48`, preserved zero horizontal overflow, and closed cleanly. The home-page cookie settings trigger is static after consent instead of covering landing content.
- **Console:** final Chrome warning/error log was empty.
- **Static checks:** targeted ESLint and `git diff --check` pass. Full TypeScript checking reaches only pre-existing failures in `src/lib/admin/user-actions.ts` and `src/lib/repositories/workspace-repository.ts`; no changed landing file appears in the TypeScript error output.

## Comparison History

1. **79/100, request changes:** randomized muted tiles, incorrect header action, two-line support, weak rail hierarchy, top-indexed mobile strip, and contaminated evidence capture.
2. **88/100, request changes:** macro geometry passed; remaining P1 issues were muted WebGL output, wrong statement tone, black mobile action, two-line mobile support, and the fixed cookie trigger.
3. **93/100, approved:** matched WebGL palette response, corrected desktop statement tone, light mobile action, three-line support, in-flow cookie trigger, seven-column mobile field, larger mark, nine-dot menu icon, and vertical rail controls. No P0 or P1 issues remain.

## Remaining P2 Differences

- The Archestimator-adapted tile art omits Mistral-specific labels, character art, and merged bars.
- Desktop nav cadence and the visible logo silhouette remain slightly shorter than the source.
- The right rail and mobile workflow strip preserve Archestimator content rather than copying Mistral-specific news and customer marks.

final result: passed
