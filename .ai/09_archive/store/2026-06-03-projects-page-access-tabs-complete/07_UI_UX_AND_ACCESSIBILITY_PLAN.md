# 07 UI/UX and Accessibility Plan

## User journey

The Projects page is now two contexts, not one mixed grid:

1. A user opens `/workshop/projects`.
2. They immediately see two tabs: **Your Projects** and **Projects shared to you**.
3. They understand whether a project is theirs or collaborative before scanning cards.
4. They search and change view mode within the current context.
5. They switch tabs to see invited/shared work.
6. If they have only shared projects, the page starts on `Projects shared to you` so they are not greeted by an empty owned state.

This is a product clarity change. The core insight: ownership is an operating boundary. A project someone shared with you should not feel the same as a project you created, because permissions, expectations, and possible actions differ.

## Screen/component impact

### `/workshop/projects`

Current UI:

- Search row.
- Header icon toolbar with view mode and add project actions.
- Optional inline access filter (`All / Owned / Shared`) inside scroll content only when shared projects exist.
- Grid/list cards.

Target UI:

- Search row.
- Header icon toolbar with view mode and add project actions.
- Always-visible two-tab strip through `toolbarPanel`.
- Active tab panel grid/list cards or tab-specific empty state.

### `ProjectAccessTabs` local component

Recommended structure:

```tsx
function ProjectAccessTabs({ activeTab, ownedCount, sharedCount, onTabChange }: Props) {
  return (
    <div className="border-b border-hairline bg-white px-2 py-1">
      <div role="tablist" aria-label="Project access tabs" className="inline-flex rounded-xs border border-hairline bg-surfaceMuted p-0.5">
        ...tabs
      </div>
    </div>
  );
}
```

Visual requirements:

- Height compact enough to fit the existing 38px search + toolbar rhythm.
- Active tab: `bg-white text-ink shadow-sm` or equivalent existing surface treatment.
- Inactive tab: `text-tertiary hover:bg-white/70 hover:text-ink`.
- Count badge: optional but recommended; keep neutral and small.
- No orange/accent color unless representing invites or existing card badge semantics.

## Empty/loading/error/success states

There is no loading state because the page is server-rendered before client interaction. Error handling remains at the route/error-boundary level.

### Owned tab states

| State | Title | Description | Action |
|---|---|---|---|
| No live projects anywhere | `Create the first live project` | Preserve existing copy or close variant: `Sample cards below are references only. Start a project to create estimates, insert components, and export a bid workbook.` | `Create project` |
| No owned projects but shared exists | `No projects created yet` | `Create your first project here, or switch to shared projects to open work others invited you into.` | `Create project` |
| Search miss | `No projects match your search` | `Try an owned project name, client, code, or location.` | Optional clear search; no new component required |

### Shared tab states

| State | Title | Description | Action |
|---|---|---|---|
| No shared records | `No projects shared to you yet` | `When someone invites you as a viewer, editor, admin, or sheet collaborator, the project will appear here.` | None |
| Search miss | `No shared projects match your search` | `Try a project name, owner, invite code, role, or shared sheet.` | Optional clear search; no create action |
| Pending invite | Existing pending invite card | Existing Accept/Expired controls | Existing form action |

## Interaction details

### Tab switching

- Click activates the selected tab and updates visible panel immediately.
- Search value remains unchanged when switching tabs. This is useful because a user can search once, then check both contexts.
- View mode remains unchanged when switching tabs.
- Counts update from props and favorite/search state should not affect counts; counts represent total items in each tab before search.
- If active tab becomes invalid due prop refresh (for example owned count becomes zero after deletion), keep the user's active tab unless it creates a dead first-load experience. Initial load default is the only smart default required.

### Project creation

- Toolbar Add Project remains globally available because project creation always creates an owned project.
- Owned empty state can include Create Project.
- Shared empty state must not include Create Project because creating a project is not how one receives a shared project.

### Favorites

- Owned project favorite behavior remains unchanged.
- Shared project favorite control should be hidden/suppressed in this task unless a separate shared-favorite data model is implemented.
- Pending invite favorite is already hidden and should stay hidden.

## Responsive behavior

The Projects page appears desktop/workshop-oriented. Keep the existing responsive grid classes:

- List: `flex flex-col gap-1.5`
- Small: `grid-cols-[repeat(auto-fill,minmax(128px,156px))]`
- Medium: `grid-cols-[repeat(auto-fill,minmax(180px,220px))]`
- Large: `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5`

Tabs should:

- Fit inside available width.
- Allow labels to remain readable on desktop/tablet widths.
- Use `flex-wrap` or horizontal overflow only if labels collide. Preferred: keep `inline-flex` and compact count badges.
- Not push search or toolbar controls out of view.

## Accessibility checks

Required tab pattern:

```tsx
<button
  id="projects-tab-your-projects"
  role="tab"
  aria-selected={activeTab === "your-projects"}
  aria-controls="projects-panel-your-projects"
>
  Your Projects
</button>

<section
  id="projects-panel-your-projects"
  role="tabpanel"
  aria-labelledby="projects-tab-your-projects"
>
```

Keyboard behavior:

- `ArrowRight`: move from owned to shared; wrap to owned if already shared.
- `ArrowLeft`: move from shared to owned; wrap to shared if already owned.
- `Home`: move to owned.
- `End`: move to shared.
- Focus should move with activation.

Screen reader labels:

- Tablist label: `Project access tabs`.
- Tab accessible names should include counts if counts are visible, e.g. `Your Projects, 3 projects` and `Projects shared to you, 2 projects`.
- Panel labels should be `Your projects` and `Projects shared to you`.

Do not use `role="tab"` if keyboard and panel associations are not implemented. Since the UI is a true tabbed panel, implement the full pattern.

## Copy/content requirements

Exact tab labels:

- `Your Projects`
- `Projects shared to you`

Avoid:

- `Owned` — too database-like and not what Philip asked for.
- `Shared` — too vague; shared by you vs shared to you is ambiguous.
- `All` — out of scope and weakens the split.

Recommended counts:

- `Your Projects 3`
- `Projects shared to you 2`

Accessible count text should be explicit: `3 projects`, `1 project`, `0 projects`.

## Visual consistency requirements

Use existing product classes/patterns:

- `rounded-xs`
- `border-hairline`
- `bg-white`
- `bg-surfaceMuted`
- `text-ink`
- `text-tertiary`
- `text-[8px]`, `text-[9px]`, `text-[10px]`
- `font-medium`
- `focus-visible:ring-2 focus-visible:ring-focus` or equivalent existing focus style

Do not introduce:

- Large marketing typography.
- New color tokens.
- New component library.
- Heavy animation.
- Card redesign.

## UX acceptance review checklist

- The page reads as two contexts immediately.
- An invited collaborator can find shared work without knowing what `Owned` means.
- A founder/owner can still create projects quickly.
- Pending invites feel like shared access, not owned project clutter.
- Empty states teach the model without overexplaining.
- Keyboard-only navigation works.
- Screen reader user hears selected tab and panel relationship.
