# Rollout, Rollback, And Operations

## Rollout Strategy

This is a local product surface change first. No provider rollout is required unless future phases add schema/RPC work.

Recommended rollout:

1. Ship right-dock `visibleTabs` configurability behind direct props and tests; no visible behavior change on estimate routes.
2. Apply the template route workbench transition.
3. Apply editor read-only gating.
4. Run targeted test matrix.
5. Add gated browser proof only for changed routing/provider/mobile claims.

## Rollback Strategy

All phases should stay reversible:

- If configurable dock tabs regress estimate route behavior, remove the prop use from template hosts and fall back to current sidebar.
- If the browse workbench center underperforms, keep the left rail and restore `TemplateGallery` + `TemplatePreviewDock`.
- If Project data loading is not ready, keep the Project tab visible and ship the selector/unavailable state rather than forcing incorrect project data or hiding the tab.
- If the Project selector/source adapter proves larger than intended, ship the visible Project tab with unavailable copy and keep project-source loading behind a follow-up only if the unavailable state is explicitly accepted by product; do not silently show an inert or misleading tree.
- If read-only gating causes unexpected editor access friction, preserve server action denial and revert only the UI hiding logic after tests identify the conflict.

## Performance Gates

Required:

- First paint is not blocked by source dock component/project datasets.
- Inactive hidden `Templates` tree has zero render work on template-focused hosts.
- Template route query cache remains warm and partitioned.
- No broad `router.refresh()` introduced into browse route mutations.
- Route transition overlay count remains `0` for measured scenarios if route transitions are changed.

Suggested budgets:

- Keep existing route-transition budget baseline from `authenticatedWorkshopTransition`.
- Keep right dock width bounded to avoid center squeeze.
- Keep lazy dock request on pointer/focus/click intent unless measured otherwise.

## Observability

Use existing local proof before adding instrumentation:

- Perf tests for render counts.
- Existing route transition measurement script if navigation changes.
- Server timing labels already present on template routes.
- Query invalidation tests for cache behavior.

## Provider Boundary

No Supabase mutation is part of the conservative UI transition.

If integrated editor hardening adds RPCs/migrations, use the standing Archestimator Supabase project boundary only: `ebxxqidacheyapmmzavr`, with reviewable migrations, RLS/grant checks, and rollback/fix-forward notes.
