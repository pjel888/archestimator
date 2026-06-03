# 08 Security, Performance, and Data Plan

## Security implications

This feature should not expand access. It should only categorize data already returned to the user by the existing server-side repository and Supabase access layer.

Security rule:

```text
Tabs do not authorize. Tabs display already-authorized records.
```

Do not add client-side fetches for arbitrary project IDs. Do not infer access from URL params. Do not expose collaboration tokens or hidden workspace details.

## Auth/authorization concerns

### Existing access surface

`listCurrentWorkspaceProjects()` already composes visible project records from:

- Projects in the current default workspace.
- Project memberships for the current user.
- Estimate sheet memberships for the current user.
- Pending invitations visible to the current user's email through `list_pending_collaboration_invitations`.

Implementation should not change this access logic for the tab feature.

### Role semantics

Existing collaboration roles are:

```ts
type CollaborationRole = "owner" | "admin" | "editor" | "viewer";
```

No new role values are needed. The shared tab should display existing role badges/copy through `LiveProjectCard`.

### Favorite action risk

Current `setProjectFavorite()` is not safe for externally owned shared projects because it validates the project belongs to the current default workspace before inserting a favorite. `project_favorites` also references `projects(id, workspace_id)`, making the workspace dimension meaningful.

Low-risk security decision for this task:

- Do not change favorite authorization/data semantics.
- Suppress favorite controls for non-owned project cards.

If shared favorites are implemented later, that separate task must answer:

1. Should favorites be scoped to the viewer's workspace, the owner workspace, or the user only?
2. What RLS rule proves a user can favorite a project they can access through project/sheet membership?
3. How are favorites removed after access revocation?
4. Should shared favorites appear on Workshop homebase?

## Input validation concerns

No new user-supplied server inputs should be introduced. Client state inputs:

- `activeTab` constrained to `"your-projects" | "shared-to-you"`.
- `searchQuery` existing string state; no server call added.
- `projectViewMode` existing localStorage state; keep validation through `isProjectViewMode()`.

If keyboard handlers read key values, restrict to known keys and ignore everything else.

## Secrets/environment variables

No environment variable change. Do not add feature flags, secrets, API keys, or provider configuration for this UI-only feature.

## Data privacy concerns

The shared tab can make collaboration relationships more visible, but only to the signed-in user who already has access to the records. Preserve existing card-level data fields:

- Project name/code/client/location.
- Role label.
- Owner workspace/inviter display label if already present.
- Shared sheet count.
- Pending invite status.
- Publication badge if already visible.

Do not add:

- Collaborator email lists.
- Invitation token hints.
- Owner user IDs.
- Workspace IDs in the UI.
- Raw Supabase errors.

## Performance implications

Expected performance impact is minimal:

- All categorization is array filtering over already-loaded props.
- Search is already client-side; it now filters a smaller active array.
- Tab switching is local state only.
- No new network request.
- No new bundle dependency.
- No image/card rendering change beyond fewer cards per tab.

Recommended memoization:

```ts
const projectItems = useMemo(() => projects.map(normalizeProjectListItem), [projects]);
const ownedProjectItems = useMemo(() => projectItems.filter(...), [projectItems]);
const sharedProjectItems = useMemo(() => projectItems.filter(...), [projectItems]);
const activeBaseProjects = activeTab === "your-projects" ? ownedProjectItems : sharedProjectItems;
const displayProjects = useMemo(() => filterBySearch(activeBaseProjects, searchQuery), [activeBaseProjects, searchQuery]);
```

Do not over-memoize trivial JSX or introduce Zustand/TanStack Query for this local state.

## Caching implications

No change to server cache or route cache. Existing route refresh behavior after favorite toggles should remain:

- `setProjectFavorite()` revalidates `/workshop` and `/workshop/projects`.
- Projects page still receives fresh `favoriteProjectIds` after router refresh.

If suppressing shared favorites, only owned favorites can trigger that refresh from Projects page.

## Database/query/migration concerns

No migration for tabs.

Do not alter these tables/functions for the tab feature:

- `projects`
- `project_members`
- `estimate_sheet_members`
- `collaboration_invitations`
- `project_favorites`
- `estimate_favorites`
- `workspace_members`
- `list_pending_collaboration_invitations`

Exception: if product explicitly decides shared favorites are part of this task, create a separate migration/security plan first. Do not mix that into a UI tab task casually.

## Rate limits/concurrency concerns

No new server mutations except existing owned favorite toggles and pending invite acceptance. Tab switching/search do not hit the server.

Existing concurrency behavior to preserve:

- Favorite optimistic update rolls back on error.
- Pending favorite ID prevents duplicate busy state for one card.
- Pending invite form behavior remains server-action-driven.

## Security acceptance checks

- `src/app/workshop/projects/page.tsx` still obtains projects server-side through `listCurrentWorkspaceProjects()`.
- No client API route fetch is introduced for shared projects.
- No migration is added for this task.
- Shared tab records are exactly `accessKind !== "owned"` from server-returned items.
- Shared cards do not expose a broken or unauthorized favorite action.
- DOM tests do not require secrets, real Supabase credentials, or production data.
