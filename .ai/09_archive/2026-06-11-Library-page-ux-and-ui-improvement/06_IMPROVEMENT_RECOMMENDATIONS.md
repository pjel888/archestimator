# Improvement Recommendations

Status: reprioritized from verified evidence. These recommendations are not implementation approval.

## Priority Model

| Priority | Meaning |
| --- | --- |
| P0 | Audit/readiness blocker. Do not implement feature changes until resolved. |
| P1 | High-value UX/UI correctness issue likely needed for beta readiness. |
| P2 | Measurement-gated improvement or medium-risk refinement. |
| P3 | Backlog idea requiring user research or beta feedback before implementation. |

## P0: Readiness Blockers

### P0-1: Capture authenticated visual and interaction baseline

The current local smoke check only proves signed-out redirect behavior. Before coding, capture the actual signed-in page at desktop/tablet/mobile with console, network, accessibility tree, and performance trace.

Acceptance:

- Desktop 1440x900 and 1200x800 screenshots.
- Tablet 768x1024 screenshot.
- Mobile 390x844 screenshot.
- Reduced-motion state checked.
- Console and network logs attached.
- Route data count compared with DB query.

### P0-2: Freeze corrected evidence model

The old "12 divisions", "Zone 1 sidebar", "~50 thumbnails", and "metadata sparse" claims must not be used as requirements.

Acceptance:

- All active docs cite DB/source evidence or state pending status.
- Future implementation issues reference this hardened folder, not the previous draft claims.

### P0-3: Define exact beta task success criteria

The Library page must be audited against construction cost-library jobs, not generic catalogue aesthetics.

Acceptance:

- Find known component.
- Compare cost/source confidence.
- Add component.
- Maintain taxonomy/supplier/brand data.
- Archive safely.
- Navigate dense hierarchy without losing context.

## P1: High-Value UX/UI Corrections

### P1-1: Remove or implement no-op Filter and Group controls

Visible no-op buttons are a direct trust issue. The lowest-risk beta fix is to hide default actions until real behavior is planned. If implemented, use existing `FilterPopover`, `DropdownMenu`, or equivalent primitives with full keyboard semantics.

Acceptance:

- No visible toolbar button lacks a handler.
- Filters expose selected state, count impact, reset behavior, and no-results recovery.
- Grouping labels distinguish data mode from visual layout.

### P1-2: Correct Add action styling to workshop design tokens

The default add icon path uses orange classes. Workshop UI should stay neutral unless `DESIGN.md` explicitly authorizes orange on that surface.

Acceptance:

- Add action uses `primary`, `accent`, `surface`, `hairline`, or approved semantic tokens.
- Contrast passes.
- Hover/focus/active/disabled states are defined.

### P1-3: Plan a real component detail/inspection surface

Cards currently cannot be inspected or edited. A dense cost library needs a trustworthy detail surface, but it should not default to another modal. Prefer an `InspectorDrawer`, `Sheet`, or right dock that keeps list context visible.

Acceptance:

- Detail surface shows identity, full description, taxonomy path, supplier, brand, unit, current price, price options, source URL, pricing date, confidence, lifecycle, version history, state history, thumbnail/assets, and attachment state.
- It preserves search/tree/card context.
- It supports keyboard open/close and focus return.
- Editing is separately designed as a versioned mutation flow.

### P1-4: Add lifecycle clarity for discontinued items

The route currently includes one discontinued item. Users should not mistake it for an available cost item.

Acceptance:

- Either exclude `discontinued` along with `archived`, or show a clear lifecycle badge/filter and explain its use.
- Search and counts reflect the decision.

### P1-5: Accessibility acceptance before UI changes

No UI recommendation is complete without keyboard, focus, name/role/value, contrast, target-size, and status-message criteria.

Acceptance:

- Criteria in `12_ACCESSIBILITY_AND_INTERACTION_ACCEPTANCE.md` are executable.
- Add, archive, search, tree, and no-results states are covered.

### P1-6: Align search/facet design with user intent

Filtering should be based on construction estimator tasks, not arbitrary fields.

Initial facet candidates:

- Category path.
- Supplier.
- Brand.
- Lifecycle state.
- Confidence.
- Pricing date freshness.
- Source availability.
- Missing brand only if hygiene workflow is prioritized.

Acceptance:

- Facets are tested against real tasks.
- Filter changes preserve position and do not surprise-refresh the page.
- Result count and applied filters are visible and announced.

## P2: Measurement-Gated Improvements

### P2-1: LCP image preload only after proof

If a component thumbnail is proven as LCP, add Next.js 16 `preload` to the appropriate image path. Do not add broad eager loading.

Acceptance:

- Production trace identifies LCP element.
- Only the LCP image is preloaded.
- CLS and bandwidth do not regress.

### P2-2: Tree/catalogue density improvements

The DB has 685 category nodes and some empty top-level roots. The page may need better prioritization, but the exact UI should follow authenticated screenshots and task observation.

Acceptance:

- Empty branches have a clear collapsed/default policy.
- Populated paths are easier to scan.
- Tree search has clear no-results and result count states.

### P2-3: Virtualization or pagination only if measured

Do not add `react-window`, `@tanstack/virtual`, or equivalent until current and seeded performance tests prove DOM/INP risk.

Acceptance:

- Current 154-item trace establishes baseline.
- 500+ item fixture or trace shows actual failure.
- Accessibility plan preserves semantics and focus if virtualization is adopted.

### P2-4: Replace single-tab semantics if unnecessary

A one-tab `tablist` may add semantic noise without user benefit.

Acceptance:

- Either it becomes a real multi-state tab control, or it becomes a plain context label/count strip.

## P3: Backlog Ideas That Need Evidence

These should not be included in the first implementation unless beta research proves demand:

1. Favorites.
2. Export.
3. Multiple visual density modes.
4. Full list/grid toggle.
5. Bulk supplier assignment.
6. Advanced price range analytics.
7. Saved filter presets.

## Recommended Sequence

1. Finish audit readiness: screenshots, DB verification, accessibility matrix, performance trace.
2. Remove/hide no-op controls and neutralize Add styling as first small UI correction.
3. Decide lifecycle policy for discontinued rows.
4. Design detail/inspection surface using existing drawer/sheet primitives.
5. Add task-backed filters only after the search and task model is validated.
6. Optimize performance based on measurements, not assumptions.

## Rejected Recommendations From Prior Draft

| Prior recommendation | Rejected or changed because |
| --- | --- |
| "Fix chunk 404 as P0" | Not reproduced in current production-like evidence. Keep as cache scenario. |
| "Add `priority` to images" | Next.js 16 favors `preload` for proven LCP images. |
| "Virtualize immediately" | Current 154-item volume does not prove need; virtualization carries accessibility cost. |
| "Fix missing supplier data broadly" | Supplier coverage is 153/154 visible items. |
| "Treat 12 divisions as canonical" | DB has 9 root categories. |
| "Modal-first detail/edit" | Product workspace should preserve list context; drawer/sheet/inspector is the stronger default. |
