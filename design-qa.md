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
