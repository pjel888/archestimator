# Bug Plan — Shared Project Favorite Action Rejects Visible Shared Projects

**Date:** 2026-06-03
**Bug slug:** `shared-project-favorite-action-rejects-visible-shared-projects`
**Classification:** `NON_BLOCKING_CURRENT_PLAN` if favorite controls are suppressed in the tab feature; `BLOCKING_CURRENT_PLAN` if implementation leaves favorite controls visible for shared cards.
**Status:** `OPEN_PLANNED_FOR_SUPPRESSION_OR_FIX`

## Summary

The Projects page can render shared project cards, and `ProjectsPageClient` currently passes `toggleProjectFavorite` into every `LiveProjectCard`. `LiveProjectCard` hides the favorite star for pending invites, but not for accepted shared project access (`project-member` or `sheet-member`). The server action `setProjectFavorite()` only allows favoriting projects in the current default workspace, so externally owned shared projects can expose a star button that fails with `Project was not found in this workspace.`

## Discovery context

Discovered while planning `.ai/03_plans/2026-06-03-projects-page-access-tabs-plan/`. The requested feature makes the shared project context first-class, so this existing behavior becomes more visible and must be addressed or suppressed.

## Reproduction steps or evidence

1. Ensure the current user has a visible shared project through `project_members` or `estimate_sheet_members` where the project belongs to another workspace.
2. Open `/workshop/projects`.
3. Locate the shared project card.
4. Click the favorite star.
5. `ProjectsPageClient.toggleProjectFavorite()` calls `setProjectFavorite({ projectId, favorite })`.
6. `setProjectFavorite()` queries `projects` with `.eq("id", projectId).eq("workspace_id", workspace.id)`.
7. For an externally owned shared project, that query returns no row and throws `Project was not found in this workspace.`

## Expected behavior

A visible UI control must either work or not render. Shared project cards should not expose a broken favorite star.

## Actual behavior

Accepted shared project cards can render a favorite star even though the current server action rejects externally owned shared projects.

## Suspected root cause

`project_favorites` and `setProjectFavorite()` are scoped to the current workspace/project composite relationship, while `listCurrentWorkspaceProjects()` can show projects from other workspaces through collaboration memberships. The UI did not differentiate favorite eligibility from card visibility.

## Affected files/modules

- `src/components/workshop/projects-page-client.tsx`
- `src/components/workshop/LiveProjectCard.tsx`
- `src/lib/workshop/actions.ts`
- `src/lib/repositories/workspace-repository.ts`
- `src/lib/supabase/types.ts` (`project_favorites_project_workspace_fkey`)

## Impact

- User-facing error or silent rollback when favoriting shared project cards.
- More visible after implementing the `Projects shared to you` tab.
- Potential trust issue: a visible action implies permission that does not exist.

## Severity

`High` for UX correctness on shared project cards.
`Medium` for data integrity because the action rejects rather than corrupts data.

## Relationship to current task

Directly related. The requested tabs make shared projects a primary page surface. The safest implementation should suppress favorite controls for non-owned project cards in this task.

## Proposed fix plan

### Low-risk fix for current tab feature

1. In `ProjectsPageClient`, pass `onToggleFavorite` only when `item.accessKind === "owned"`.
2. In `LiveProjectCard`, render the favorite star only when a favorite handler is provided and the card is not a pending invite.
3. Keep `setProjectFavorite()` unchanged.
4. Add a DOM test asserting shared project cards do not expose favorite controls.

### Future full fix if product wants shared favorites

1. Define favorite ownership semantics for shared projects.
2. Add/adjust schema and RLS if needed.
3. Update `listCurrentWorkspaceProjects()` favorite reads for shared items.
4. Update `setProjectFavorite()` authorization to allow accessible shared projects safely.
5. Add server/action/security tests for allowed and denied shared-favorite cases.

## Verification plan

Focused DOM tests:

```bash
bun run test:dom -- tests/vitest/projects-page-access-tabs.test.tsx --maxWorkers=1
```

Assertions:

- Owned cards still show favorite controls and call the mocked action.
- Shared accepted cards do not show favorite controls after suppression.
- Pending invite cards still do not show favorite controls.

Full verification:

```bash
bun run type-check
bun run lint
bun run lint:design-system
bun run validate
```

## Blocks implementation?

It does not block the tab feature if favorite controls are suppressed for non-owned cards. It blocks implementation if the shared tab ships while leaving the broken control visible.
