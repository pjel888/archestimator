## 2026-06-27 estimate sheet header/footer continuity QA

source visual truth path:
- Reference target: `/workshop/projects` in-app browser screenshot from the user's previous reference, where header, canvas, and footer read as one continuous shell.
- Failure evidence: /var/folders/xg/_lqq86w138vctk9_ll6g8h840000gn/T/codex-clipboard-4ca32bf3-7b9a-4b56-a099-98248918d6ea.png

implementation screenshot path:
- blocked: current authenticated `http://localhost:3000/workshop/projects/0139e1e5-951d-4f2f-9081-6c953d288d8a/estimates/8080f04c-fe18-4314-a1d8-9222e62d1eed` cannot be captured from a fresh system Chrome context because it redirects to `/login`.

viewport: desktop in-app browser screenshot, approximately 2048px wide.

state: Estimate sheet with left estimate tree, center estimate grid, right Project library tab, and bottom running-total footer visible.

full-view comparison evidence:
- The failure screenshot shows a distinct top header strip, a separately painted center estimate well, and a distinct bottom totals footer strip.
- Projects reference behavior is a single continuous shell material behind header/content/footer, without the header and footer reading as independent cards or bands.
- Code evidence after patch: the estimate route marker `[data-workshop-page-shell-canvas][data-estimate-sheet-route="true"]` now paints `--estimate-glass-well-bg` once on `.workshop-workspace-glass-surface`, while `.estimate-glass-well` is transparent with no inset shadow.

focused region comparison evidence:
- Top seam: the prior header area used shell chrome over a different background than the estimate content well.
- Bottom seam: the prior totals footer used shell chrome over a different background than the estimate content well.
- Center estimate name: the prior estimate-name chip had its own `bg-white/70`, shadow, and backdrop blur; it now uses transparent background and no shadow.
- A fresh focused screenshot comparison is blocked by authenticated in-app session access.

findings:
- [P1] Header and footer still read as separate bands in the supplied estimate-sheet screenshot.
  Location: `WorkshopPageShell` estimate route shell, `.workshop-workspace-glass-surface`, `.estimate-glass-well`, and `ProjectEstimateMetadataStrip`.
  Evidence: the user screenshot shows three background planes: header strip, estimate workspace well, footer strip.
  Impact: the estimate sheet feels assembled from disconnected layers instead of matching the seamless projects-page shell.
  Fix: paint the estimate well material once at the shared shell level for estimate routes, make the inner estimate well transparent, and remove the center header chip fill/shadow.

patches made since previous QA pass:
- Added `--estimate-glass-well-bg` token to `src/app/globals.css`.
- Scoped estimate routes so `.workshop-workspace-glass-surface` uses `--estimate-glass-well-bg`.
- Changed `.estimate-glass-well` to `background: transparent` and removed its inset shadow so it no longer creates a second plane.
- Removed the estimate-name metadata chip's white background, shadow, and backdrop blur in `src/components/workshop/ProjectEstimateMetadataStrip.tsx`.

verification:
- `git diff --check -- src/app/globals.css src/components/workshop/ProjectEstimateMetadataStrip.tsx` passed.
- `bunx tsc --noEmit --pretty false` is blocked by pre-existing schema/type errors around `adjustment_percentage` in estimate/publication repositories; these errors are unrelated to the touched CSS/header files.

final result: blocked

## 2026-06-25 library toolbar background QA

source visual truth path:
- /Users/philiplewis/.codex/attachments/c9a8ee93-3c18-4739-9f13-aba35dcab00d/image-1.png
- /Users/philiplewis/.codex/attachments/c9a8ee93-3c18-4739-9f13-aba35dcab00d/image-2.png

implementation screenshot path:
- blocked: current `http://localhost:3000/workshop/library` requires the user's authenticated in-app session; a fresh system Chrome context redirects to `/login?next=%2Fworkshop%2Flibrary`.

viewport: desktop in-app browser reference viewport.

state: `/workshop/library` page-level search header icon toolbar and tabs toolbar compared against `/workshop/projects`.

full-view comparison evidence:
- Source Library screenshot shows a pale rectangular slab behind the search icon row and library tab row.
- Source Projects screenshot shows the toolbar and tab controls blending into the same washed canvas surface, without a distinct header slab.
- Code evidence after patch: `LibraryTabsLayoutClient` now uses `dashboard-canvas-wash estimate-glass-divider shrink-0 bg-transparent` for the Library toolbar/tabs wrapper instead of `estimate-glass-chrome estimate-glass-divider shrink-0`.

focused region comparison evidence:
- Focused visual issue is confined to the page-level Library toolbar/tabs wrapper.
- `HeaderIconToolbar` remains explicitly `bg-transparent`.
- `TabStrip` remains `variant="glass"` with `className="border-b-0 bg-transparent"`.
- Live focused screenshot comparison is blocked by auth/session access as noted above; no broader layout or content regions were changed.

findings:
- No source-level P0/P1/P2 findings remain for the requested toolbar background mismatch.
- Browser-rendered visual QA remains blocked by authenticated session access.

patches made since previous QA pass:
- Replaced the Library page-level toolbar/tabs wrapper's frosted glass chrome background with the shared dashboard canvas wash used by the Projects page family.
- Preserved the existing soft divider, search behavior, add action, tab ids, and tab active-state behavior.

verification:
- `bun run type-check --pretty false` passed.
- `bun run lint -- src/components/workshop/library/LibraryTabsLayoutClient.tsx` passed.
- `git diff --check -- src/components/workshop/library/LibraryTabsLayoutClient.tsx` passed.

final result: blocked

## 2026-06-25 workshop project card comment 1 QA

source visual truth path: Browser Comment 1 inline screenshot from `http://localhost:3000/workshop/projects` (chat attachment; no filesystem path exposed)
implementation screenshot path: /Users/philiplewis/Documents/archestimator/.omx/artifacts/visual-ralph/project-card-comment-1/implementation-card.png
viewport: in-app browser desktop viewport, focused card crop
state: `/workshop/projects`, Lewis Residence project card visible after local dev-server reload

full-view comparison evidence:
- The map/thumbnail now runs to the inner card's visible top/side edges, separated only by the 1px hairline border.
- The information area below the thumbnail has a translucent frosted background instead of a flat white block.
- The project information retains padding inside the lower panel.
- The previous `1 favorite` metadata pill is no longer rendered on the tile.

focused region comparison evidence:
- DOM measurement after reload: thumbnail edge deltas versus the inner card were left `1px`, right `1px`, top `1px`.
- Computed info-panel padding was `8px` on all sides.
- Computed info-panel background was a layered translucent white/cool-white gradient over `rgba(255,255,255,0.34)`.
- DOM check for the project-card vitals text returned `hasFavoriteVital: false`.

findings:
- No actionable P0/P1/P2 findings remain for the requested card changes.

patches made since previous QA pass:
- Removed the favorite-count metadata vital from project tiles while leaving the actual favorite toggle control intact.
- Made the tile thumbnail flush with the inner card edges.
- Added `.workshop-project-card-content` as a reusable frosted lower information panel.
- Kept the lower information area padded and constrained to the existing project-card glass system.

final result: passed

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
