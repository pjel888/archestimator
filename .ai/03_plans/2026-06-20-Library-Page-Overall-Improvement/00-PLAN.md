# 00 - Plan

## Exact User Job

As a contractor, estimator, or catalog steward, I need to manage reusable components and templates, quickly find the right reusable item, trust its cost/source context, and reuse it in estimates without losing my place.

## Scope

Included:

- Library overview route: `/workshop/library`.
- Components route: `/workshop/library/components`.
- Templates route: `/workshop/library/templates`.
- Template editor route: `/workshop/library/templates/[templateId]`.
- Library overlays: modals, drawers, docks, popovers, command/search popups, dropdown menus, context menus, confirmation dialogs, and text-prompt dialogs.
- Library-adjacent shared surfaces when they affect consistency, especially the estimate-page component library panel and reusable overlay primitives.

Non-goals:

- Database schema changes unless a future implementation task proves they are required.
- Production deployment.
- A visual redesign implementation in this planning pass.
- Replacing the whole app shell or changing the global navigation model.
- Reintroducing deprecated standalone `/workshop/components` or `/workshop/templates` surfaces except as redirects.

## Current Product Decision Constraints

- The unified Library is the canonical hub. Components and templates stay inside `/workshop/library`.
- `DESIGN.md` is a guide, not enforceable law, but its app/workshop density guidance is still the best local baseline.
- The Library should stay compact, keyboard-friendly, and work-focused.
- Component Library data must preserve source, pricing date, confidence, supplier, lifecycle, and copied estimate snapshots.
- Browser automation is not a default planning artifact. Use it later only when it proves a browser-only claim.
- Older specs that reference standalone `/workshop/templates` or `/workshop/components` are historical context only unless a newer decision explicitly restores them.
- Public/shared proposal surfaces must not expose protected Library source URLs, internal notes, confidence labels, or workspace-only price history by default.
- Implementation must start with the Phase 0 contract lock in `13-DATA-CONTRACTS-ROUTE-CACHE.md`, `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md`, and `17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md`.

## Planning Readiness Rating After Hardening

| Dimension | Before Hardening | Hardened Target | Closure Artifact |
| --- | ---: | ---: | --- |
| Product strategy | 78-84% | 95%+ | `09-MVP-STRATEGY-AND-SUCCESS-METRICS.md` |
| UI/UX specification | 72-86% | 95%+ | `10-LIBRARY-SURFACE-SPECS.md`, `11-SOURCE-TRUST-STATE-MATRIX.md`, `12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md` |
| Implementation feasibility | 58-82% | 95%+ | `13-DATA-CONTRACTS-ROUTE-CACHE.md`, `17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md` |
| Security/readiness | 32-45% | 95%+ | `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md`, `15-INPUT-IMPORT-EXPORT-FILE-HANDLING.md` |
| QA/adversarial coverage | 58-72% | 95%+ | `16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md`, `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md` |

The remaining gap is implementation-only evidence: rendered UI proof, actual
tests, schema/RLS confirmation, and provider validation cannot be claimed from a
planning pass.

## Design Thesis

The Library should feel like a professional source-trust command center, not a card gallery with scattered actions.

The stable mental model:

- Left side: scope, folder, supplier, brand, or template group.
- Top toolbar: exact search, filters, sort, display mode, create action.
- Center: dense results that support selection, comparison, and quick action.
- Right dock: source evidence, usage, preview, edit/insert actions, and warnings.
- Modals: short, user-initiated tasks that require interruption.
- Drawers/non-modal docks: longer create/edit/compare tasks that benefit from keeping Library context visible.
- Popovers/menus: lightweight option selection only.

## Priority Problems

1. Exact search does not preserve the selected component.
2. Native prompt/confirm flows remain in component folder management and Add Component draft discard.
3. Trust metadata is strong in some component surfaces but not consistently visible at every reuse decision.
4. Add Component is a very large modal and mixes quick capture with advanced catalog stewardship.
5. Template insertion does not make the final destination group/area explicit enough.
6. Applied filter state is too hidden for a professional catalog.
7. Bulk archive copy conflicts with itself.
8. Larger libraries will need a denser maintenance mode than cards alone.
9. Route-state, payload, cache, and insert-target contracts are not explicit enough for implementation.
10. Security, IDOR, RLS/authz, public exposure, and workspace-switch cache bleed require explicit gates.
11. Import/export and file handling are deferred, but their validation and privacy constraints must shape the MVP.
12. Large-list, network failure, out-of-order response, and concurrent edit behavior need designed states.

## Acceptance Criteria

A future implementation should be considered successful when:

- From Overview search or recent components, selecting a component opens the Components tab with that component selected, highlighted, and visible in the inspector.
- All Library-owned native prompts/confirms are replaced by shared dialogs or modals with clear labels, validation, cancel behavior, and focus return.
- Component cards, overview cards, template rows, and preview/inspector surfaces expose enough source/trust state to decide whether reuse is safe.
- Add Component supports a fast path with only required catalog fields and keeps advanced details progressive.
- Template insert flows disclose the destination target before commit and recover inline from empty/error states.
- Filter state is visible outside the filter popover and can be reset at the category and global level.
- Keyboard behavior is defined for tabs, search comboboxes, menus, tree views, dialogs, drawers, and escape/close sequencing.
- Targeted Vitest coverage proves route state, modal behavior, cache behavior, and action payloads before any browser proof.
- Actor capability, RLS/authz, cross-workspace IDOR, public/private redaction, and workspace-switch cache behavior are tested or explicitly blocked before release.
- Selected component/template route params fail safely, preserve surrounding search/filter context, and do not leak cross-workspace object existence.
- Large-list behavior has a server/index or rendering fallback once beta-scale thresholds are reached.
- Network, stale target, and concurrent edit failures preserve safe user context and never silently mutate a different estimate, folder, component, or template.
- Rollback/fix-forward plans exist for each phase before implementation begins.

## Beta Outcome Metrics

The implementation pass should prove or instrument:

- A seeded user can find a known component or template from `/workshop/library` in under 30 seconds.
- At least 90% of visible component cards/rows expose enough information to classify pricing as current, stale, missing, or low confidence.
- A user can insert a component or template into the intended estimate without losing search/filter context.
- A user can create a basic component through Quick Add in under 90 seconds.
- Public/shared surfaces show zero private source URLs, internal supplier notes, confidence labels, or workspace-only price-history fields.

## Expected File Areas

Primary file areas likely to change later:

- `src/components/workshop/library/overview/LibraryOverviewSearch.tsx`
- `src/components/workshop/library/overview/RecentComponentCard.tsx`
- `src/components/workshop/LibraryPageClient.tsx`
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
- `src/components/workshop/component-library-manager/AddComponentModal.tsx`
- `src/components/workshop/component-library-manager/BulkActionToolbar.tsx`
- `src/components/workshop/component-library-manager/ComponentInspectorDock.tsx`
- `src/components/workshop/component-library-manager/component-facet-filter.tsx`
- `src/components/workshop/library/EditComponentDrawer.tsx`
- `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx`
- `src/components/workshop/library/templates-browse/InsertIntoEstimatePicker.tsx`
- `src/components/workshop/library/template-editor/TemplateEditorClient.tsx`
- Shared overlays under `src/components/ui/overlays/` and `src/components/ui/`

Expected test areas:

- `tests/vitest/library-overview.test.tsx`
- `tests/vitest/library-tabs-layout.test.tsx`
- `tests/vitest/library-tab-a11y.test.tsx`
- `tests/vitest/workshop-library-consolidation-ui.test.tsx`
- `tests/vitest/library-components-cache.test.tsx`
- `tests/vitest/library-templates-cache.test.tsx`
- `tests/vitest/library-folder-tree-selection.test.tsx`
- `tests/vitest/template-gallery.test.tsx`
- `tests/vitest/template-editor.test.tsx`
- `tests/vitest/new-template-modal.test.tsx`
- Shared primitive tests such as `ui-modal-tooltip.test.tsx`, `ui-dropdown-popup-core.test.tsx`, `ui-dropdown-select.test.tsx`, and `ui-tabs.test.tsx`

## Implementation Phases

### Phase 0a - Contract Lock

Before UI work, lock the data/route/cache/security/performance contracts:

- `13-DATA-CONTRACTS-ROUTE-CACHE.md`
- `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md`
- `15-INPUT-IMPORT-EXPORT-FILE-HANDLING.md`
- `16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md`
- `17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md`
- `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md`

Why first: richer source metadata and deeper route state create security,
privacy, and cache risks unless object ownership, public exposure, stale target,
and workspace-switch behavior are specified first.

### Phase 0 - Overlay and Route-State Reliability

Replace remaining native prompts/confirms, define Library overlay rules, align destructive and reversible action copy, and add the URL state needed to deep-open a selected component.

Why first: it removes the most visible inconsistency and gives later flows stable routing and focus behavior.

### Phase 1 - Findability and Applied Filter State

Improve Overview search continuation, add visible applied-filter chips or summary rows, clarify result counts, and make the component result state shareable through URL params.

Why second: users must find the right reusable item before any deeper creation/edit work matters.

### Phase 2 - Trust and Source Visibility

Normalize trust metadata across component cards, overview cards, template rows, preview docks, and editor insert decisions.

Why third: beta users need cost confidence and source provenance at the moment of reuse.

### Phase 3 - Add/Edit Component Flow Split

Create a quick-add path for common catalog capture and keep advanced variants, attachments, measurement metadata, activity, and source evidence progressive.

Why fourth: this is a larger implementation surface and depends on the overlay policy.

### Phase 4 - Template Browse, Insert, and Editor Clarity

Add explicit insertion target selection/disclosure, improve template group move controls, and carry source confidence into template preview/editor decisions.

Why fifth: templates are powerful but less foundational than component findability for the immediate Library hub.

### Phase 5 - Dense Maintenance Mode and Browser-Proven Polish

Add a table/list maintenance mode, then run browser/manual proof for sticky headers, portal placement, scroll containment, mobile layout, and keyboard journeys.

Why last: dense maintenance is valuable at scale, but it should land after source trust and route/overlay consistency.

## Deletion Criteria

Remove or retire:

- Library-owned `window.prompt` and `window.confirm` calls.
- Duplicate one-off modal/popup patterns where a shared overlay primitive exists.
- Text that says an archive operation is both reversible and impossible to undo.
- Any hidden or non-shareable route state that prevents returning to the selected component or template context.
- Any helper layer that exists only to work around an overlay or route-state limitation fixed by this plan.

## Stop Condition

Stop the future implementation loop only when targeted tests pass, the changed route/action behavior is verified, browser-only claims have matching browser proof or are explicitly out of scope, and remaining risks are documented.
