# 07 - Acceptance Criteria

## Planning Pack Criteria

- [x] All files in `README.md` exist.
- [x] `01` through `04` cite current source file/line evidence for load-bearing audit claims.
- [x] Visual-system decisions name the reference surface and the intentional divergence.
- [x] Gap analysis separates P0/P1/P2/defer and names affected files.
- [x] `HeaderIconToolbar` contract covers slots, label policy, no-op action avoidance, and shared regression risk.
- [x] Roadmap phases are ordered, reversible, and scoped.
- [x] Verification matrix states where browser proof is required and why it is not run for this planning-only pass.
- [x] Independent review findings are recorded and reconciled.
- [x] Strategy, quality, and implementation-readiness scores are recorded and closed to 100% planning readiness.
- [x] Security, data, cache, provider, and network risks have explicit forbidden diffs and proof commands.
- [x] Open questions are converted to resolved defaults, phase gates, or out-of-scope boundaries.
- [x] Visual Ralph reference, verdict schema, score threshold, and stop condition are specified for implementation.

Implementation criteria below are future gates for the app UI work; they are not claimed as passed by this planning-only pack.

## Visual Parity Criteria

Given a user opens any Library route,
when the page renders,
then the content should read as one Workshop workspace with a grey canvas, liquid-glass chrome, and crisp paper content where data is dense.

Pass conditions:

- No route-level full white page slabs inside the glass shell.
- Overview, Components, Templates, and Template Editor share one surface grammar.
- Dashboard-inspired elements remain restrained and do not use dashboard-only display scale.
- Dense data stays legible on paper-like surfaces.
- There is no stacked child `backdrop-blur` inside already blurred glass panels.

## Toolbar Criteria

Given a Library pane has search, filter, view, expand/collapse, or add actions,
when the pane renders,
then it uses `TreePanelHeader`, `HeaderIconToolbar`, `ToolbarIconButton`, or shared collection primitives instead of a local toolbar invention.

Pass conditions:

- Icon-only actions have labels/tooltips.
- Add actions are real handlers or deliberate disabled states.
- At most one visible-label primary add action appears in a toolbar area.
- No orphan dividers or no-op controls.
- Toolbar height and tab placement remain stable under hover/focus/loading.

## Layout Criteria

Given a user moves across Overview, Components, Templates, and Template Editor,
when they compare layout,
then the app should feel like one Library family.

Pass conditions:

- Route tabs remain in the shared subheader.
- Components and Templates use comparable left rail, center content, optional right dock geometry.
- Overview is a command surface, not a centered marketing page or generic dashboard.
- Loading, empty, and error states reserve the same geometry as real content.
- Right docks do not cover primary controls or break pane scrolling.

## Accessibility Criteria

- Route tabs keep ARIA semantics.
- Pane header controls are keyboard reachable in logical order.
- Docks/drawers return focus to opener.
- Empty/error states include a clear next action.
- Color and opacity choices pass readable contrast in normal and reduced-transparency states.
- Hover-only controls also have keyboard/focus access.

## Responsive Criteria

- No horizontal overflow at mobile widths.
- Tabs can scroll or fit without clipping labels.
- Toolbar actions wrap, collapse, or menu safely.
- Left/right rails resize or become drawers without hiding core content.
- Text does not overflow buttons, cards, rows, or tab containers.

## Scope Boundary Criteria

- No Supabase schema or provider state changes.
- No route-state, query-key, mutation, authz, or taxonomy changes unless a later implementation plan explicitly expands scope.
- No shared primitive changes before Library-local slot work proves the need.
- No new dependencies.
- Browser proof is required for implementation paint/geometry/focus claims, but not for this docs-only pack.

## Acceptance-To-Proof Matrix

| Acceptance area | Required proof during implementation |
|---|---|
| Route-family visual parity | Browser route/state matrix in `14`; Visual Ralph verdict score `>= 90` for changed surfaces |
| Toolbar correctness | `header-icon-toolbar-ui`, `tab-strip`, `tree-panel-header-border`, and route-specific DOM tests |
| Layout and responsive safety | 1440, 1280, 1024, 390, and 320-width evidence for changed paint/geometry |
| Accessibility and focus | Existing route/tab/modal/dock tests plus browser focus proof when portals/docks change |
| Dense mode performance | 5000-row dense e2e geometry/performance gate from `14` |
| Security and authz boundaries | Security/cache commands in `13` and forbidden-diff review |
| Database/provider non-change | Diff review proving no migrations/RLS/RPC/provider/storage route changes unless separately scoped |
| Planning pack completeness | `git diff --check` and source-grounded doc review; no browser claim for docs-only pass |
