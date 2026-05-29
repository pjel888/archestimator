# Workshop Bento Favorites

**Status:** implemented slice in progress, 2026-05-26

## Goal

Turn `/workshop` into the first-contact homebase for new and power users without restoring the old Recent Projects gallery. The page should use the existing protected header/footer shell, shared search input, shared header icon toolbar, and a full-width bento layout.

## Product Shape

- Route destinations: Projects, Components, Templates.
- Pinned shortcuts: favorite projects and favorite estimate sheets.
- Utility lists: project shortcuts and estimate-sheet shortcuts so users can star items from the homebase.
- Typography: app/workshop visible text remains at `12px` maximum.

## Data Shape

Favorites are user-specific and workspace-scoped:

- `project_favorites(user_id, workspace_id, project_id, created_at)`
- `estimate_favorites(user_id, workspace_id, project_id, estimate_id, created_at)`

Do not store favorites in `projects.metadata` or `estimates.metadata`.
