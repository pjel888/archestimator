# Design QA

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
