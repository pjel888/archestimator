# Estimate System visual redesign — design QA

**Date:** 2026-07-15  
**Route:** `/admin/estimate-system`  
**Current result:** STATIC + DOM PASS; fresh live visual/browser recheck pending

## Result

The five-view guide now uses the Admin workspace as its only vertical scroll owner. Product, Features, Pages, UX, and Knowledge no longer place their indexes inside fixed-height vertical viewports, and the former `overscroll-contain` boundary cannot trap wheel or touch input over a rail.

The workspace is vertical-only (`overflow-y-auto` plus `overflow-x-clip`), both document roots clip accidental horizontal overflow, and long guide labels may wrap anywhere instead of widening the page.

Below 640px, the shared Admin sidebar becomes a 54px accessible icon rail instead of consuming 188px. The optional Knowledge canvas opens at readable 1x scale; its full-system Overview intentionally hides text below 0.92 scale and tells the user to zoom in or choose Readable.

All source-level P0, P1, and P2 findings from the second independent review are closed:

- Feature, Page, persona, path, related-path, Knowledge action, and Knowledge entity selections scroll to and focus the newly selected record.
- Every tab exposes `aria-controls`, and the active and hidden panels retain matching `tabpanel` relationships.
- Compact Product and persona indexes are one-dimensional.
- A guide-scoped typography floor renders metadata at 10px, body copy at 11px, section labels at 12px, and record/page titles at 14px while preserving medium weight.
- The readable Knowledge impact path is always visible. The relationship canvas remains optional and mounts only when expanded.
- Knowledge action search includes target-entity language.
- Entity records aggregate all explicit changes and unchanged claims, include relation-endpoint actions, and retain both labels for intentional operation aliases.
- The 54-action inventory and 52 effect guides validate in both directions, with no orphan effect guide.

## Five-view interaction receipt

A final JSDOM + Testing Library UltraQA rerun executed 186 assertions with an SVG geometry polyfill for D3. It completed with 9 programmatic outer-page scroll calls, 45 SVG labels, readable/label-free canvas-mode transitions, and zero runtime exceptions.

| View | Scenarios covered | Result |
| --- | --- | --- |
| Product | reload default, five label-only tabs, product-area index, tab-to-panel relationships | PASS |
| Features | view render, record selection, destination focus, impossible-search empty state, search-clear focus recovery | PASS |
| Pages | grouped index, record selection, destination focus, impossible-search empty state, search-clear focus recovery | PASS |
| UX | persona selection, destination focus, path-search empty state, search-clear focus recovery, Intersections mode | PASS |
| Knowledge | default delete-row guide, visible changes/unchanged/guards/recovery/impact path, collapsed narrow-screen action index, action/entity focus, target-entity search, entity-selection index collapse, both legacy alias actions, search-clear focus recovery, optional canvas mount, 1x readable mode, label-free Overview, accurate touch guidance, accessible SVG fills | PASS |
| Whole route | no nested `overflow-y-auto` or `overscroll-contain` owner inside the guide; vertical-only workspace; 54px mobile Admin rail; compact two-column Knowledge scope switch | PASS |

## Static and runtime receipts

- Focused ESLint on the four Estimate System UI components and Knowledge contract: PASS.
- Repository TypeScript diagnostics with `bunx tsc --noEmit`: PASS.
- `git diff --check`: PASS.
- Server rendering: PASS; 19,398 bytes, all five tabs, five matching tabpanels, and five `aria-controls` relationships present.
- Documentation integrity: PASS.
- Product guide counts: 7 areas, 8 features, 14 pages, 7 personas, 9 paths, and 11 intersections.
- Knowledge integrity: 27 entities, 75 relationships, 52 effect guides, 54/54 unique actions, 9 groups, zero orphan effect guides.
- Intentional aliases only: legacy create/republish and Portal publish/supersede.
- Scoped tertiary text uses a contrast-safe mix equivalent to approximately `#6b6b6b` on white while remaining quieter than secondary text.
- SVG tertiary labels inherit the same scoped accessible token rather than the raw application tertiary color.
- Independent ontology, source-coverage, and final usability reviewers reported no remaining P0, P1, or P2 usability or Knowledge-contract defect after the repair.

## Anti-slop and hierarchy receipt

- No tab counters.
- No ordinary `Current`, `Verified`, or confidence badges in the primary reading path.
- Exceptional Partial, Guarded, Boundary, Legacy, and Not applicable states remain written in text.
- No colored selection rails; selected rows use neutral fill plus weight and inset outline.
- No `transition-all`.
- No fixed-height vertical index viewport.
- Compact typography remains medium-weight; a route-scoped floor prevents 8–10px wiki copy from rendering below 10–11px and raises primary record titles to 14px.
- Flat rows and hairline sections replace nested metric/card stacks.
- Source notes, guide metadata, and the spatial canvas remain progressively disclosed; core behavior and impact explanations stay visible.
- The canvas never asks users to read transformed microtext: text remains visible only at 0.92 scale or higher, while Overview becomes an explicitly label-free orientation mode.

## Remaining proof boundary

The final in-app browser attempt bound the existing Estimate System tab, but the browser URL policy rejected reloading the localhost route. No workaround or alternate browser surface was attempted. Prior browser receipts describe earlier UI states and are not treated as current visual proof. Do not promote this redesign to fully browser-verified until the current route is reloaded and the five tabs are exercised in the user's visible browser.
