---
title: Current State Audit
date: 2026-06-15
status: implementation-ready evidence
type: audit
scope: /workshop/projects
---

# Current State Audit

## Render tree

- `src/app/workshop/projects/page.tsx` reads `listCurrentWorkspaceProjects()` and renders `WorkshopPageShell` plus `ProjectsPageClient`.
- `src/components/workshop/projects-page-client.tsx` owns page state, access tabs, search, view density, toolbar wiring, project rendering, and empty/sample states.
- `src/components/workshop/WorkshopCollectionLayout.tsx` wraps the route in `TreePanelHeader` and renders the page body.
- `src/components/workshop/LiveProjectCard.tsx` renders live project cards for list, small, medium, and large densities.
- `src/components/workshop/projects-page-client.tsx` renders sample `ProjectCard` cards only when there are no live projects in the owned projects tab.

## Toolbar architecture

Current projects page wiring:

- Search is passed through `searchValue`, `searchLabel`, `searchPlaceholder`, and `onSearchChange`.
- View density is currently passed as four `leadingActions` toolbar buttons.
- Add project is passed through `addActions`.
- Access tabs are passed through `toolbarPanel`.

Shared primitives already have the hook needed for the new controls:

- `HeaderIconToolbar` accepts `filterSlot?: ReactNode`.
- `TreePanelHeader` accepts `filterSlot?: ReactNode` and forwards it to `HeaderIconToolbar`.
- `WorkshopCollectionLayout` currently drops `filterSlot`; it must be updated to accept and forward that prop.
- `WorkshopCollectionLayout` renders `toolbarPanel` (the access tabs) as a sibling *after* `TreePanelHeader`, not through `TreePanelHeader` children/tabs; the new `filterSlot` threads into `TreePanelHeader` separately from `toolbarPanel`.

Important constraint: `leadingActions` is an array of scalar `HeaderIconToolbarAddAction` entries. It maps to `ToolbarIconButton` and cannot host arbitrary dropdown children. View and Sort must therefore render through `filterSlot`, not `leadingActions`.

## View mode today

- Storage key: `archestimator_projects_view_mode_v1`.
- Change event: `archestimator:projects-view-mode-change`.
- Values: `list`, `small`, `medium`, `large`.
- Default server snapshot: `large`.
- Persistence uses a `useSyncExternalStore` pattern and localStorage.
- Existing tests assert four individual buttons with labels like `View projects as List`; these tests will need to become one View combobox test while preserving the storage-key and density coverage.

## Search today

Search is in-memory over:

- project name
- client name
- project code
- location
- access-related text for shared and pending states

Search state lives above the access tabs, so it persists across tab switches. The new sort must apply after search and inside the active access tab.

## Ordering today

The repository returns two `updated_at desc` segments plus appended pending invites — not one globally sorted list:

- owned projects ordered by `updated_at desc`
- shared projects ordered by `updated_at desc`
- pending/shared invite items appended through the same project item shape

Because the segments are concatenated (owned, then shared, then appended invites), the array is not globally sorted; the client splits by tab, so within a tab the order is `updated_at desc`.

The client does not currently sort. It filters to the active access tab, filters by search, and renders in repository order. The v1 sort should preserve the current default by using Last updated, newest first.

## Card date metadata today

- Live cards display updated or invite-expiration dates with month/day formatting.
- Created date is not visible on the project cards.
- Adding a Date created sort without showing created date would make the sort feel opaque.
- The new created-date display should be limited to the large card secondary meta so compact modes remain dense.

## Existing tests to preserve or rewrite

- `tests/vitest/projects-page-view-mode.test.tsx` covers density switching, persistence, sample fallback, and search miss copy.
- `tests/vitest/projects-page-access-tabs.test.tsx` covers access-tab keyboard behavior and search persistence.
- `tests/vitest/projects-page-shared-access.test.tsx` covers shared and pending card badges/date copy across densities.
- `tests/vitest/header-icon-toolbar-ui.test.tsx` already proves `filterSlot` can render custom content and coexist with other toolbar actions.
- `tests/vitest/project-creation-ui.test.ts` has static governance checks for the old view buttons and must be updated to the new contract.

## Pain points to solve

1. Four adjacent icon-only view buttons consume toolbar space and make density state harder to read.
2. There is no user-facing sort control even though users naturally organize projects by freshness, created date, client, or name.
3. The current toolbar has a fixed-height row; dynamic labels can create wrapping or Add-button displacement if width behavior is not specified.
4. Created date is a planned sort field but is currently invisible in the card UI.
