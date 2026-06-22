# Target UX And Requirements

## Target IA

Recommended top-level tabs:

1. `Library`
2. `Project`
3. `Templates`

If the product keeps the existing label for one release, `Components | Project | Templates` is acceptable, but the stronger model is `Library | Project | Templates` because Project entries are also components.

Owner confirmation after the first planning pass: `Project` is an ownership/scope tab, not a new component type. Future implementation should preserve that distinction.

## Semantics

| Tab | Meaning | Contains | Excludes |
| --- | --- | --- | --- |
| `Library` | Reusable workspace component catalog | Workspace-owned reusable component rows | Project-projected rows |
| `Project` | Project-owned component rows | Express/inline-authored rows and detached/project-specific rows projected from this project | Clean linked library rows, copied used rows, source-less manual rows unless explicitly projected, templates |
| `Templates` | Reusable estimate structures | Saved templates and project-derived estimate sources | Component rows as primary content |

## Core Requirements

### R1 - Add Project Tab

The Estimate Sheet right sidebar must expose a third top-level tab for project-owned components.

Acceptance:

- Tab order is `Library`, `Project`, `Templates`.
- The tab strip remains in the existing `TreePanelHeader`.
- The tab strip fits the current right dock width constraints without introducing a new layout system.

### R2 - Split Item Ownership

The sidebar must partition `libraryItems` into:

- reusable library items
- project-projected items

Acceptance:

- Project items are detected through `readProjectComponentProjectionMetadata(item.metadata)` and project-folder/projection rules.
- Library tab does not show project-projected rows in any view mode.
- Project tab does not show ordinary workspace library rows.

### R3 - Preserve Current Projection Rules

The Project tab must use the current project projection contract:

- include express/inline-authored rows
- include detached/project-specific rows
- exclude clean linked library rows
- exclude ordinary used rows
- exclude malformed project-folder impostors

Acceptance:

- Projection unit tests cover inclusion and exclusion.
- The tree fails closed when metadata is missing or malformed.

### R4 - Reuse Existing Sidebar Format

The Project tab should copy the existing Library tab format where practical:

- same right sidebar panel
- same header and tab strip
- same search control pattern
- same `LibraryTree` row density
- same preview/add/drag affordances for component rows

Acceptance:

- No new visual system.
- No new card layout.
- No change to right sidebar width policy.

### R5 - Project-Specific Copy

The Project tab must explain ownership without implementation terms.

Recommended empty-state copy:

> No project components yet. Add an inline Project Component or make a Library Component project-specific.

Recommended search copy:

- Library: `Search Library`
- Project: `Search Project Components`
- Templates: `Search Templates`

Acceptance:

- UI does not use `express`, `detached-library`, `projection`, `source snapshot`, or `projectComponentProjection`.
- `Library Component` and `Project Component` remain the user-facing component labels.

### R6 - Toolbar Behavior

The Project tab should not inherit Library management controls blindly.

Recommended v1:

- Library tab: keep component facets, view-by, add folder, add component.
- Project tab: search, expand/collapse, add selected/drag/add component rows to the estimate; no folder creation; no project-row deletion from the sidebar.
- Templates tab: keep template controls.

Acceptance:

- `View by` is either disabled/hidden on Project or scoped deliberately.
- `Add folder` does not appear on Project.
- `Delete selected components` does not appear for Project rows unless actual project-row deletion semantics are designed.

### R7 - Preserve Templates

Templates project-source behavior must remain separate.

Acceptance:

- Existing project-derived estimate sources still appear under Templates.
- Templates project-source insert payloads remain distinct from component insert payloads.
- Rename Templates filter copy from `Project sources` to `From projects` or `Project-derived sources` to reduce confusion.

### R8 - Persist Tab Safely

Stored sidebar preferences must tolerate the new tab.

Acceptance:

- Existing stored `components` or `templates` values still hydrate.
- New `project` value hydrates.
- Unknown values fall back to `library`/`components`.
- No SSR/localStorage hydration mismatch is introduced.

### R9 - No Provider Migration

The first implementation should not require database or Supabase schema changes.

Acceptance:

- Reuse `loadProjectComponentLibraryLite(projectId)` unless a later implementation proves a separate loader is necessary.
- Reuse current cache invalidation prefixes.

## UX Decision

Use `Project` as the tab label, not `Project Components`, because the tab strip is cramped and the neighboring tabs are nouns. The content, search label, empty state, and preview metadata should make clear that it means project-owned components.

## Product Default For Ambiguity

If a row is user-facing as `Project Component` in row details but does not carry projection metadata, do not show it in the Project tab in v1. This keeps the sidebar fail-closed and matches the existing projection code. Expand later only after source-less manual row ownership is explicitly modeled.
