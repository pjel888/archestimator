# Estimate System Wiki Knowledge Graph — Implementation Evidence

> Current presentation note: LOOP-005 through LOOP-007 replace the fixed-height viewport chaining, text remapping, tab-counter, and Knowledge-layout details described in the historical receipts below. The current authoritative design receipt is `../visual-redesign/DESIGN_QA.md`; fresh live browser proof for the current redesign remains pending.

Status: CURRENT STATIC + DOM PASS; FRESH LIVE VISUAL PROOF PENDING  
Verified: 2026-07-15  
Scope: local implementation, focused Knowledge-view UltraQA, and whole-page usability repair

## LOOP-007 Current Usability Evidence

- Product, Features, Pages, UX, and Knowledge share the Admin workspace as their only vertical scroll owner. No guide subtree contains `overflow-y-auto` or `overscroll-contain`.
- A final JSDOM + Testing Library pass executed 186 assertions across all five tabs, tab-panel relationships, record selection, search empty states, Feature/Page/UX/Knowledge search-clear focus recovery, narrow-screen Knowledge disclosure, entity selection, action aliases, optional canvas mounting, semantic heading order, responsive Admin rail source, and absence of nested guide scroll traps.
- The interaction pass made nine outer-page scroll requests, checked 45 SVG text labels at 11px-or-larger source size and weight 500-or-lower, verified readable/label-free zoom transitions, and captured zero runtime errors.
- Knowledge action and entity selections both collapse the narrow-screen action index before focusing the selected record.
- A scoped rendered typography floor keeps metadata at 10px, body copy at 11px, section labels at 12px, and primary titles at 14px without changing typography elsewhere in the product.
- Below 640px, the Admin sidebar uses a 54px icon rail with accessible link names instead of reserving the 188px desktop width.
- The Admin workspace clips horizontal overflow while retaining vertical scrolling, both document roots clip accidental horizontal overflow, and the compact Knowledge scope switch becomes a full-width two-column control before returning to content width on larger screens.
- The Knowledge canvas starts and returns at readable 1x scale. Overview fits the full spatial model but hides all text below 0.92 scale and exposes a visible explanation; zooming in or choosing Readable restores labels. Touch guidance now names the two-finger gesture, and SVG tertiary labels use the guide's accessible token.
- Fresh focused ESLint, full `bunx tsc --noEmit`, `git diff --check`, typed graph integrity, and server rendering passed. Server output contained 19,398 bytes, all five tabs, five tabpanels, and five `aria-controls` relationships.
- Current graph integrity remains 27 entities, 75 relationships, 52 effect guides, 54/54 distinct actions in nine groups, zero orphan guides, and only the two intentional alias pairs.
- Independent ontology, source-coverage, and final usability reviewers found no remaining P0, P1, or P2 source defect after the final usability repair.
- Fresh screenshot, wheel/touch, responsive visual comparison, and browser-console proof remain uncollected. A final in-app browser attempt bound the existing Estimate System tab, but the browser URL policy rejected reloading the localhost route; no workaround or alternate browser surface was attempted. Historical browser receipts below do not close this current proof boundary.

## Historical LOOP-001 through LOOP-004 Evidence

The remaining sections preserve the earlier implementation and live-browser receipts. They are useful provenance, but any fixed-height rail, tab-counter, compact-text, or canvas-placement statement in them is superseded by the current receipt above.

## Delivered Result

`/admin/estimate-system` now keeps `Product`, `Features`, `Pages`, and `UX`, preserves `Product` as the reload default, and adds a fifth `Knowledge` view. The new view is a source-grounded product wiki and deterministic relationship canvas for estimate entities, CRUD/lifecycle operations, effects, unchanged boundaries, guards, recovery, and evidence.

Fresh runtime integrity:

- 5 stages
- 27 entities
- 75 relationships
- 52 detailed effect guides
- 54/54 required CRUD and lifecycle inventory items across 9 groups
- 19/19 cited implementation source files present

The 52-to-54 difference is intentional: legacy create/republish share one product transaction guide, and Portal publish/supersede share one product transaction guide.

## Requirement and Acceptance Evidence

| Criterion | Result | Decisive evidence |
| --- | --- | --- |
| AC-001 | PASS | Reload selected `Product`; the four earlier views remained available; `Knowledge 54` opened as the fifth tab. |
| AC-002 | PASS | Runtime graph construction rejected missing and non-reciprocal references during implementation; final typed load returned `ok: true` for both documentation and knowledge integrity. |
| AC-003 | PASS | Canonical validator returned exactly 54 unique required IDs, no missing/extra/unmapped items, 9 groups, and 52 intentional operation records. Independent truth review passed. |
| AC-004 | PASS | Focused delete-row view exposed 8 relationships covering optimistic live deletion, persisted removal, history/Undo, estimate/proposal total rollup, another-editor refetch boundary, preserved legacy snapshot, and preserved immutable Portal issue. Independent truth review passed. |
| AC-005 | PASS | Focused browser proof covered action/entity search, preset selection, node selection, direct-neighborhood dimming, focused/whole-system scope, 27 whole-system nodes, 75 whole-system relationships, zoom, pan, fit, and reset. |
| AC-006 | PASS | Every active canvas relationship appeared in the ordered semantic list with explanation, timing, confidence, status, and source notes; entity records exposed relationships, changes, unchanged behavior, operations, guides, and sources. |
| AC-007 | PASS | SVG nodes were keyboard-selectable; compact 1280px layout placed the complete linear list before the collapsed optional canvas, kept the inspector before the full inventory, matched visual and DOM order, and had no horizontal page overflow. A clean fresh tab produced no console warning or error. Independent UI review passed. |
| AC-008 | PASS | This evidence maps every requirement; model and UI critics returned no actionable finding; static, browser, impact, and plan validation receipts are recorded here. |

## Browser UltraQA Receipt

The user explicitly invoked UltraQA, authorizing focused local Knowledge-view interaction proof.

- Default reload: `Product` selected.
- Knowledge counts: `27` entities, `52` effect guides, `75` relationships, `54/54` CRUD classified.
- Delete-row focused graph: `8 relationships`; every required live, total, history, projection, Undo, legacy, and Portal distinction present.
- Search: natural phrases including `variant removal` resolved both Project and Library variant operations.
- Canvas: zoom changed scale; node selection preserved the zoom; a pointer drag changed translation; Fit restored fitted framing; Reset changed to the documented deterministic baseline.
- Keyboard: Enter on an SVG entity opened its entity record, including `What can change` and `What stays the same`.
- Whole system: 27 rendered entity controls and 75 semantic relationships.
- Compact viewport: 1280 CSS pixels; linear list visible before the collapsed canvas; inspector before the complete inventory; no CSS-order focus reversal.
- Overflow: document scroll width equaled client width in wide and compact views.
- Console: a new clean QA tab had four informational/HMR entries and zero warnings/errors.

## Static and Runtime Receipt

- `bunx eslint` on the touched Estimate System UI files: PASS.
- `git diff --check`: PASS.
- Typed runtime import of `estimateSystemDocumentation`: PASS with documentation and Knowledge integrity `ok: true`.
- Full repository `bunx tsc --noEmit`: PASS on the final usability-repair state.
- Automated product test suites and builds: NOT RUN. They were outside the focused UltraQA authorization and were not required for this curated documentation surface.

## LOOP-004 Whole-Page Usability Receipt

The user reported that most tabs would not scroll and explicitly requested another complete live-page review. The repair and browser sweep established:

- Root cause: the Admin workspace was the intended page scroll owner, while guide-local `ScrollArea` viewports inherited `overscroll-contain` and trapped wheel input when they had no local scroll range.
- Scroll repair: all seven Product/Feature/Page, UX, and Knowledge viewports now opt into boundary chaining with `overscroll-auto`; the shared scroll primitive remains unchanged.
- Real wheel proof: Product workspace `8 → 240`; Knowledge action index `0 → 2812` with workspace held at `8`, followed by boundary chaining to workspace `608`.
- Navigation: Product exposed all seven page-map controls; Product → Page, Feature → Page, and Page → Feature links selected the right tab, focused the destination heading, and returned the workspace to the guide top.
- Search: Feature `portal` selected `Publish a client portal`; Page `client review` selected the matching record; Knowledge `template fallback` selected its matching saved-fallback guide; impossible queries showed dedicated no-match records with no stale detail content or relationships.
- UX: Client recipient selection, path search, Intersections, Happy path, and keyboard tab navigation all updated correctly.
- Knowledge: `delete row` opened `Delete an estimate row` and focused the relationship guide; selecting `Issued row projection` focused its inspector; inventory navigation returned focus to the selected operation; Whole system, Show canvas, zoom, fit, and reset all worked. SVG keyboard focus remained on a node with a visible 2px outline until Enter activation moved focus to the inspector, whose visible focus ring was confirmed.
- Readability and semantics: former 8/9/10px guide text computed as 11/12/13px; direct buttons carrying important 8/9px utilities also computed at 13px; top tabs computed at 13px with an AA-passing inactive color; search inputs have visible boundaries; small controls have a 24px minimum; and the page contains one `main` landmark. Product/Feature/Page index and record viewports are keyed to explicit tab/cross-link navigation so compact layouts reset descendant scroll without disrupting normal in-index selection.
- Final live browser logs contained no warning or error. The page was left on Product at the guide top.

## Impact and Independent Review Receipt

- Pre-edit GitNexus impact for `EstimateSystemMap`, `EstimateSystemGraph`, and `defineEstimateSystemDocumentation`: LOW, with no indexed execution process.
- Post-edit GitNexus detection: aggregate MEDIUM because the shared worktree contained 25 changed files and concurrent workshop work; the scoped admin documentation symbols affected no indexed process.
- Post-edit code-review graph over the seven scoped admin files: zero affected flows. Its unrelated workshop priorities are shared-worktree/index noise and are not part of this package.
- Independent truth reviewer: PASS for AC-003 and AC-004; exact 54/54 inventory, 9 groups, reciprocal references, 19/19 sources, truthful Portal access boundary, variant-removal fan-out, totals, and template fallback.
- Independent UI reviewer: PASS for REQ-005, REQ-006, and REQ-007; no remaining actionable source-level issue.

## Changed Product Files

- `src/lib/admin/estimate-system-knowledge.ts`
- `src/lib/admin/estimate-system-knowledge-data.ts`
- `src/lib/admin/estimate-system-map.ts`
- `src/lib/admin/estimate-system-map-data.ts`
- `src/components/admin/estimate-system-map/EstimateSystemKnowledgeGraph.tsx`
- `src/components/admin/estimate-system-map/EstimateSystemMap.tsx`
- `src/components/admin/estimate-system-map/EstimateSystemGraph.tsx`
- `src/components/admin/estimate-system-map/EstimateSystemUx.tsx`
- `src/components/admin/AdminShell.tsx`
- `src/components/admin/AdminSidebar.tsx`
- `src/app/globals.css` (scoped to `.estimate-system-guide`)

No estimate, component, publication, Portal mutation, database, migration, deployment, or public contract was changed by this package.

## Closeout

The closeout statement above belonged to the historical LOOP-001 through LOOP-004 layout. The successor pack is active again for the current single-scroll redesign and will not return to `COMPLETE` / `ACHIEVED` until fresh visible-browser proof closes the remaining boundary.
