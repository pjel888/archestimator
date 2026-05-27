# 05 - Workshop Projects Membership UI Plan

Controlling note: `11-ux-ui-screen-copy-spec.md` and `13-current-code-delta-and-blast-radius.md` are the UI/data authority for shared project cards. This file is first-pass UI context.

## Current `/workshop/projects` Surface

The current projects page:

- loads `listCurrentWorkspaceProjects()`;
- renders `ProjectsPageClient`;
- supports large, medium, small, and list card densities;
- uses `LiveProjectCard` for persisted projects;
- supports favorite toggles;
- filters by search text;
- has no visible ownership or membership semantics.

## Required Data Shape

Introduce a decorated project record for the page instead of passing raw `Tables<"projects">[]` only:

```ts
type WorkshopProjectAccessKind = "workspace" | "project-member" | "sheet-member";

type WorkshopProjectListItem = Tables<"projects"> & {
  accessKind: WorkshopProjectAccessKind;
  currentUserRole: "owner" | "admin" | "editor" | "viewer";
  ownerWorkspaceName: string | null;
  sharedEstimateCount?: number;
};
```

Repository behavior:

- load projects from the user's default/current workspace;
- load project ids from `project_members` for the current user;
- load project ids from `estimate_sheet_members` for the current user;
- merge and de-duplicate by project id;
- sort by project `updated_at` unless a future workspace switcher changes this;
- keep favorites user-scoped.

## Card Treatment

Owned/workspace projects:

- keep the existing default card treatment.
- no extra owner/admin badge in v1 unless the shared filter requires it later.

Shared project-member projects:

- add a subtle left accent or inset ring using neutral/blue-gray, not a warning color;
- show a compact role badge: `Admin`, `Editor`, or `Viewer`;
- add a meta line: `Shared project`;
- keep the same `Open` action.

Sheet-only projects:

- use a `Sheet-only` badge;
- show `Shared sheets: N` when known;
- project dashboard copy avoids implying full project edit access.

## Visual Details

Follow the product design system:

- max text size 12px;
- normal card/meta text 8-10px;
- xs radius only;
- neutral surfaces;
- zero letter spacing;
- regular-outline icons;
- no large explanatory text blocks inside the app.

Required card additions:

```txt
top-left media overlay: favorite button remains
top-right media overlay: expand button remains
bottom metadata row: project code remains
new small badge near client/meta line: Shared project, Viewer, Editor, Admin, Sheet-only
left border or inset accent: only for accessKind != "workspace"
```

Do not make shared projects look disabled. Membership is a normal access state.

## Filters

Add a compact segmented filter once at least one shared or sheet-only project is present:

```txt
All | Owned | Shared
```

Default selected filter is `All`.

## Empty States

Scenarios:

- no owned projects and no shared projects: keep current no-live-projects reference state.
- no owned projects but has shared projects: do not show "No live projects yet"; show the shared projects immediately.
- search hides all shared/owned projects: existing no-match state is fine, but it should apply to the merged list.

## Accessibility

- Role badges must be text, not color-only.
- Shared border/accent must be supplementary.
- Card labels include role context for screen readers, for example `Lewis Residence, shared project, Viewer`.
- Buttons keep existing accessible names.
- The ownership filter uses `aria-pressed` or tabs with stable labels.

## Acceptance Criteria

- Shared projects appear on `/workshop/projects` for project members and sheet members.
- The page does not require switching workspace to find a shared project.
- Users can visually distinguish owned/workspace projects from shared projects.
- Search works across all visible projects.
- Favorites continue to work for accessible projects.
- A viewer cannot mutate project data because UI badges are not the permission source.
