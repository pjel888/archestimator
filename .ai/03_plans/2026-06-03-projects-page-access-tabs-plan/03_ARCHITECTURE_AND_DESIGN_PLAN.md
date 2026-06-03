# 03 Architecture and Design Plan

## Proposed approach

Implement the feature as a client-side categorization and layout refinement of the existing Projects page. Keep the current server route and repository function untouched unless implementation discovers a verified access bug. The data source already returns owned, project-member, sheet-member, and pending-invite records; the client should split those records into two tabs and render only the active tab.

The architecture should be intentionally small:

- **Server:** unchanged `src/app/workshop/projects/page.tsx` fetches `listCurrentWorkspaceProjects()` and passes props.
- **Repository:** unchanged `listCurrentWorkspaceProjects()` continues to produce `ProjectListItem`-compatible records.
- **Client:** `src/components/workshop/projects-page-client.tsx` owns tab state, search state, view mode, empty states, counts, and card rendering.
- **Card:** `src/components/workshop/LiveProjectCard.tsx` gets a narrow safety change so favorite controls do not render as no-op/broken controls for shared cards.
- **Tests:** add focused Vitest DOM tests under `tests/vitest/projects-page-access-tabs.test.tsx`.

## Why this fits the existing codebase

The existing client already derives `projectItems` and filters by access kind. This plan keeps that model and changes the product structure from an optional three-filter control to a stable two-tab navigation. It also uses `WorkshopCollectionLayout.toolbarPanel`, which already exists for content between the header toolbar and scrollable body.

This avoids overengineering:

- No route segments.
- No API endpoints.
- No Supabase migration.
- No new dependencies.
- No global state store.
- No persistent tab localStorage.

## Current data flow

```text
/workshop/projects page
  -> listCurrentWorkspaceProjects()
    -> owned projects from projects.workspace_id = current workspace
    -> project_members where user_id = current profile
    -> estimate_sheet_members where user_id = current profile
    -> pending invites from list_pending_collaboration_invitations RPC
    -> project publication summaries
    -> favoriteProjectIds filtered by current workspace/user
  -> ProjectsPageClient(projects, favoriteProjectIds)
    -> normalizeProjectListItem()
    -> accessFilter = all/owned/shared
    -> search filter
    -> render cards
```

## Target data flow

```text
/workshop/projects page
  -> listCurrentWorkspaceProjects()  # unchanged
  -> ProjectsPageClient(projects, favoriteProjectIds)
    -> normalizeProjectListItem()
    -> partition:
       ownedProjectItems = accessKind === "owned"
       sharedProjectItems = accessKind !== "owned"
    -> activeTab = "your-projects" or "shared-to-you"
       initial default: shared when owned count is 0 and shared count > 0, otherwise owned
    -> activeBaseItems = ownedProjectItems or sharedProjectItems
    -> search filter within activeBaseItems
    -> toolbarPanel renders two tabs with counts
    -> scroll body renders active tab panel and cards/empty states
```

## Files likely to change

| File | Expected changes |
|---|---|
| `src/components/workshop/projects-page-client.tsx` | Replace `PROJECT_ACCESS_FILTER_OPTIONS` / `ProjectAccessFilter` with `PROJECT_ACCESS_TABS`; partition item arrays; render tabs through `toolbarPanel`; make empty states tab-aware; ensure search filters active tab; pass favorite handler only for owned cards or pass a new `favoriteEnabled` prop. |
| `src/components/workshop/LiveProjectCard.tsx` | Add a narrow guard so the favorite star renders only when a handler is provided and the card is allowed to toggle favorites. Recommended: introduce `favoriteEnabled?: boolean` defaulting to `Boolean(onToggleFavorite)` or conditionally render the star when `onToggleFavorite` is present. |
| `tests/vitest/projects-page-access-tabs.test.tsx` | New focused DOM tests for tab rendering, switching, mixed lists, only-shared default tab, empty shared copy, search-within-tab, and favorite safety. |
| `.ai/04_tasks/...` | Implementation agent should update or create the task packet during implementation. |
| `.ai/05_logs/...` | Implementation log after coding/verification. |
| `.ai/10_state/...` | State note after implementation. |
| `.ai/15_Bugs/...` | Update bug status if shared favorite issue is fixed/suppressed. |

## New files likely to be created

- `tests/vitest/projects-page-access-tabs.test.tsx`
- `.ai/04_tasks/2026-06-03-projects-page-access-tabs.md` or equivalent task note if not already applied from this package.
- `.ai/05_logs/2026-06-03-projects-page-access-tabs-planning-log.md` or implementation log update.
- `.ai/10_state/2026-06-03-projects-page-access-tabs-state-note.md` or current-state update.

No new production component file is required. A local helper component inside `projects-page-client.tsx` is enough unless the implementation grows unexpectedly. If a reusable tab component is desired later, extract only after this feature proves stable.

## Interfaces/contracts affected

### `ProjectsPageClientProps`

No external prop contract change required:

```ts
type ProjectsPageClientProps = {
  projects: Array<Tables<"projects"> | ProjectListItem>;
  favoriteProjectIds?: string[];
};
```

Keep this contract to preserve compatibility with legacy bare project records.

### `ProjectListItem`

No change required. It already contains all fields needed for tab grouping and card rendering.

### `LiveProjectCardProps`

Two safe options:

**Recommended low-risk option:** add an optional prop:

```ts
favoriteEnabled?: boolean;
```

Then render the favorite star only when:

```ts
const canToggleFavorite = favoriteEnabled !== false && Boolean(onToggleFavorite) && !isPendingInvite;
```

In `ProjectsPageClient`, pass:

```tsx
favoriteEnabled={item.accessKind === "owned"}
onToggleFavorite={item.accessKind === "owned" ? toggleProjectFavorite : undefined}
```

**Lower-change option:** do not add a prop; render the star only when `onToggleFavorite` exists. Then pass the handler only for owned items. This is acceptable if no other card caller depends on no-op star rendering.

## UI structure sketch

In `ProjectsPageClient`:

```tsx
type ProjectAccessTab = "your-projects" | "shared-to-you";

const PROJECT_ACCESS_TABS = [
  { id: "your-projects", label: "Your Projects" },
  { id: "shared-to-you", label: "Projects shared to you" },
] as const;
```

Render layout:

```tsx
<WorkshopCollectionLayout
  ...
  toolbarPanel={
    <ProjectAccessTabs
      activeTab={activeTab}
      counts={{ owned: ownedProjectItems.length, shared: sharedProjectItems.length }}
      onTabChange={setActiveTab}
    />
  }
>
  <section
    id={activePanelId}
    role="tabpanel"
    aria-labelledby={activeTabId}
    aria-label={activeTab === "your-projects" ? "Your projects" : "Projects shared to you"}
  >
    {/* active tab grid or empty state */}
  </section>
</WorkshopCollectionLayout>
```

## Reuse opportunities

| Existing code | Reuse plan |
|---|---|
| `normalizeProjectListItem()` | Keep. It handles bare project rows as owned records. |
| `getProjectAccessSearchText()` | Keep and reuse for active-tab search. |
| `getProjectGridClassName()` | Keep. View modes apply to both tabs. |
| `WorkshopCollectionLayout.toolbarPanel` | Use for primary tabs. |
| `EmptyState` | Keep and vary title/description/action by active tab/search state. |
| `LiveProjectCard` access badges | Keep. Shared tab cards already show role/source labels. |
| `Button`, `cn`, Phosphor icons | Keep existing UI primitives and design-system classes. |

## Alternatives considered and rejected

| Alternative | Rejection reason |
|---|---|
| Add route-level `/workshop/projects/shared` page. | Too much routing overhead for a view split; current server data already includes both categories. |
| Keep `All / Owned / Shared` and rename labels. | User specifically asked for two tabs. `All` blurs ownership/shared mental model. |
| Show tabs only when shared projects exist. | User asked for tabs on the Projects page; hiding the shared tab makes the feature undiscoverable. |
| Store active tab in localStorage. | Adds unnecessary persistence and state complexity; view mode already has persistence. |
| Fetch shared projects through a new client API. | Existing server repository already returns shared records; client fetch would add latency and access risk. |
| Implement full shared-project favorites in this task. | Current favorite schema/action is workspace-bound; changing it is a data-model decision beyond tabs. Suppress the broken control instead. |

## Backward compatibility requirements

- Bare `Tables<"projects">` entries must still render as owned projects through `normalizeProjectListItem()`.
- Existing view-mode localStorage key must remain `archestimator_projects_view_mode_v1`.
- Existing card links must remain `/workshop/projects/${project.id}`.
- Pending invite form action must remain `acceptPendingInvitationById` through `LiveProjectCard`.
- Project creation modal must still open from the toolbar and owned empty state.
- Existing CSS/data attributes used by cards such as `data-project-view-mode` and `data-project-access-kind` should remain unless tests prove they are unused and a follow-up cleanup is approved.
