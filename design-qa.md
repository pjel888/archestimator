## 2026-06-25 hero mount motion QA

route: http://localhost:3000/
viewport/state: 1920x1080 public landing page, no-preference motion, cookie consent pre-set to essential for unobstructed screenshots.

implementation screenshot paths:
- /tmp/archestimator-hero-motion-clean-pre-mockup.png
- /tmp/archestimator-hero-motion-clean-emerging.png
- /tmp/archestimator-hero-motion-clean-final.png
- /tmp/archestimator-hero-motion-clean-reduced.png

focused motion evidence:
- At 1800ms, title opacity is 1, hero illustration opacity is 1, metric card opacities are 0.9955 / 0.9774 / 0.9284, and the product mockup is still opacity 0 with translateY 56px.
- At 2200ms, the metric cards are fully visible and the product mockup has just started: opacity 0.0889, translateY 51.0194px, blur 12.7548px, clip-path inset 10.9327%.
- At 2600ms, the product mockup has faded/risen into place: opacity 0.9623, translateY 2.1111px, blur 0.5278px.
- At 3300ms, the product mockup is settled: opacity 1, transform none, filter none, clip-path none.
- Reduced motion at 250ms shows title, illustration, metric cards, and product mockup all visible with transform none.

patches verified:
- Product mockup is registered as `data-hero-motion="mockup"` and sequenced by the existing GSAP hero mount timeline.
- Independent CSS keyframe mount animations were removed from the mockup shell/body/dots so the mockup no longer races the hero timeline.
- Mockup starts hidden and lower, then fades upward as the last hero beat after the title, hero image, CTAs, and metric cards.
- Reduced-motion CSS and GSAP fallback keep the mockup visible immediately without transform/filter animation.

verification:
- `bunx eslint src/components/landing-v3/HeroMountMotion.tsx src/components/landing-v3/ArchestimatorLandingPage.tsx --max-warnings=0` passed.
- `git diff --check -- src/components/landing-v3/HeroMountMotion.tsx src/components/landing-v3/ArchestimatorLandingPage.tsx src/components/landing-v3/landing-v3.module.css` passed.
- `PLAYWRIGHT_PORT=3000 bun run test:e2e -- e2e/frontdoor-landing-visual.spec.ts --project=chromium` passed: 3 tests.

final result: passed

## 2026-06-24 responsive landing hero QA

source visual truth path: /Users/philiplewis/.codex/attachments/6c5166d4-c743-4a98-8eb3-55f777b30755/image-1.png

implementation screenshot paths:
- /tmp/archestimator-product-phase-2048.png
- /tmp/archestimator-product-phase-2560.png
- /tmp/archestimator-intro-fix-1440.png
- /tmp/archestimator-intro-fix-390.png
- /tmp/archestimator-intro-fix-320.png

viewport/state coverage:
- 2048x1200 and 2560x1200, public landing page, cookie settings collapsed, hero mockup waited to `drag-fauxwood` so the estimate rows and right library sidebar are visible.
- 1440x1200, product mockup visible with the mid-desktop left inset adjustment.
- 1439px and below, product mockup hidden before it can collide with the copy/CTA; metric/photo surface remains visible.
- 820px, 390px, and 320px, compact stacked metric cards with no text collision.

focused evidence:
- 2048 mockup measured at x 537, y 257, width 1467, height 439, right 2004, matching the reference composition.
- 2560 mockup measured at x 666, y 257, width 1848, height 499, right 2514; large-screen metric cards are capped at 502px tall instead of ballooning.
- 1440 mockup measured at x 416, y 251, width 988, height 439; no overlap with heading, intro, primary CTA, or secondary CTA.
- 390 and 320 have no horizontal overflow and no internal metric label collisions.
- Product-phase screenshots confirm visible faucet/ceramic estimate rows, visible `600x600 ceramic tiles`, and visible highlighted `200x1200 faux wood tiles` in the right sidebar.

patches verified:
- Capped large-screen metric grid row height with `min(var(--hero-grid-cell), 15.45rem)`.
- Increased mockup height only above 2048px so very wide screens preserve the product surface proportion.
- Hid the product mockup in the narrow desktop handoff range where it cannot fit without colliding.
- Shifted the 1440-1535px mockup start inward so the product stays visible without covering CTAs.
- Tightened hero intro measure to keep longer copy out of the mockup.
- Added compact metric card layout below 820px so phone/tablet widths do not squeeze desktop cards into unreadable columns.

verification:
- `git diff --check -- src/components/landing-v3/landing-v3.module.css` passed.
- `bunx eslint src/components/landing-v3/ArchestimatorLandingPage.tsx src/components/landing-v3/HeroEstimateWorkspaceMockup.tsx e2e/frontdoor-landing-visual.spec.ts --max-warnings=0` passed.
- `PLAYWRIGHT_PORT=3000 bun run test:e2e -- e2e/frontdoor-landing-visual.spec.ts --project=chromium` passed: 3 tests.

final result: passed

source visual truth path: /var/folders/xg/_lqq86w138vctk9_ll6g8h840000gn/T/codex-clipboard-7b4a9b80-646d-4cd3-9f60-a66426700d3a.png
implementation screenshot path: /tmp/archestimator-hero-corrected-drag-faucet.png
animation screenshots:
- /tmp/archestimator-hero-corrected-drag-faucet.png
- /tmp/archestimator-hero-corrected-drag-ceramic.png
- /tmp/archestimator-hero-corrected-drag-fauxwood.png
- /tmp/archestimator-hero-corrected-fauxwood-replaced.png
viewport: 2048x1200 CSS px
state: public landing page at http://localhost:3000/ with the hero mockup using the real estimate workspace components.

full-view comparison evidence:
- The hero mockup now renders `EstimateWorkspaceClient` with sanitized data, so the visible panes are the actual sheet tree, estimate sheet, and right library sidebar components rather than a hand-drawn clone.
- The complete right sidebar fits within the mockup body at desktop width.
- The expand/collapse sidebar controls and expand/collapse tree/tab controls are hidden only in the decorative hero mockup.

focused region comparison evidence:
- Measured headline bottom: y 257.
- Measured mockup parent: x 537, y 257, width 1467, height 439, right 2004.
- Measured mockup body: x 541, y 295, width 1458, height 397, right 1999.
- Measured left pane: x 545, y 298, width 308, right 853.
- Measured estimate sheet: x 856, y 298, width 678, right 1534.
- Measured right sidebar: x 1537, y 298, width 459, right 1996.
- Top alignment result: mockup parent top aligns to the headline bottom with 0px delta.
- Resulting visible gutters after scaling: 3px left padding, 3px tree-to-sheet gap, 3px sheet-to-sidebar gap, 3px right padding.
- Decorative resize handles are hidden in the hero mockup so the sidebar-to-sheet gap is not doubled.
- Required structure labels present: Estimate Tree, Lot 24A, Ground Floor, Living Room, Kitchen, Dining Room, Powder Room, Second Floor, Master Bedroom, Bedroom A, Bedroom B, Library, Project, Templates.
- Per-node tree disclosure controls are visible for the expandable nodes: Lot 24A, Ground Floor, and Second Floor.
- Kitchen is the active selected node: the center estimate sheet starts with Kitchen and the tree row carries the selected left-border treatment.
- The selected Kitchen tree row no longer uses the white glass lift background; only the left selection rail remains.
- The Kitchen sheet section has 6px of top breathing room before its header.
- Kitchen sheet header and add-row band continue to use the existing glass system: `.estimate-glass-headchrome`, `border-hairline`, and the standard glass add-row surface.
- The shared estimate sheet pointer surface now uses `pt-1`; computed top padding is 4px.
- Direct unauthenticated browser verification of the requested real estimate URL redirects to `/login`, but the changed selectors and source are shared by that route.
- The right Library sidebar is populated with Fixture > Faucet and Finishes > Floor; the Furniture folder has been removed.
- Library components present: Single-lever kitchen faucet, 600x600 ceramic tiles, and 200x1200 faux wood tiles.
- Corrected animation follows the real component flow: hover reveals the library row drag rail, drag publishes the real library-item drag state, and the Kitchen sheet renders the actual dashed "Drag and drop estimate component into Kitchen" drop zone.
- Faucet drag evidence: the Single-lever kitchen faucet source row shows a visible 16px drag rail with opacity 1, the Kitchen drop zone is present, and the arrow cursor plus drag ghost sit over the drop zone.
- Ceramic drag evidence: the 600x600 ceramic tiles source row shows a visible drag rail with opacity 1, the Kitchen drop zone is present below the faucet row, and the inserted row displays 24 sqm with a ₱18,720 subtotal.
- Replacement evidence: the 200x1200 faux wood tiles source row shows a visible drag rail with opacity 1, the faux-wood drag highlights the existing 600x600 ceramic tile material cell, and the final same row id displays 200x1200 faux wood tiles with quantity value 24.
- Computer Use note: direct Computer Use against the Codex in-app browser is blocked for `com.openai.codex`; real interaction study used the workspace source for drag/drop rules and system Chrome for non-auth visual proof.

findings:
- No actionable P0/P1/P2 findings remain for the requested hero estimate-workspace mockup composition.

required fidelity surfaces:
- Fonts and typography: inherited from the real estimate workspace components.
- Spacing and layout rhythm: outer decorative inset is reduced; inner pane padding and gaps are tightened inside the hero only so the scaled panes fit the small mockup without excessive side gutters.
- Colors and visual tokens: shell keeps the landing frosted chrome; internal surfaces use the actual glass estimate workspace styling.
- Copy and content: sanitized data only, matching the requested top-of-sheet structure.

patches made:
- Added `HeroEstimateWorkspaceMockup` to render `EstimateWorkspaceClient` with sanitized project, sheet tree, tab, library, and template data.
- Replaced the sparse placeholder tree with a realistic `Lot 24A` hierarchy containing floor and room areas.
- Set the mockup's selected node to Kitchen on the active Page 001 tab.
- Removed the selected tree row's white background and added top padding to the Kitchen sheet branch with hero-scoped CSS.
- Promoted selected glass tree-row background removal to the shared estimate glass styles so real estimate pages use the same treatment.
- Added shared top padding to the estimate sheet pointer surface below the tab strip.
- Added sanitized library folders and reusable component items to the hero workspace mockup.
- Removed the Furniture library folder from the sanitized hero mockup.
- Added a slower hero animation with a triangular arrow cursor, source hover phases, drag-image style ghosts, real component-drop-zone state for insert drags, and row replacement targeting for the final faux-wood swap.
- Placed that component inside the landing hero mockup frame.
- Removed the decorative expand/minimize controls from the hero mockup via scoped CSS.
- Removed the decorative resize handles from the hero mockup via scoped CSS.
- Reduced the mockup body inset and scoped workspace padding/gap to keep the right sidebar visible and avoid oversized gutters.
- Increased the mockup parent height and moved its top edge upward to align with the top line of the hero headline.
- Shifted the full hero visual stage downward so the mockup parent top aligns with the CTA row while preserving mockup and hero image sizes.
- Increased the mockup parent height upward again so its top edge aligns with the bottom of the hero headline while preserving the lower edge.

final result: passed
