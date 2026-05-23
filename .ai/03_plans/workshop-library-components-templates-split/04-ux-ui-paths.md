# 04 UX/UI Paths

## Information Architecture

### Workshop Sidebar

Library group should contain two sibling destinations:

```txt
Library
  Components  -> /workshop/library
  Templates   -> /workshop/templates
```

Rationale:
- Components and templates are different reusable assets.
- Components are row-level reusable cost logic.
- Templates are estimate-structure bundles.
- Users should not need to enter a component page and then switch tabs to manage templates.

## `/workshop/library` UX

### Purpose

Browse, organize, and inspect component rows.

### Layout

Keep the existing right-sidebar layout:

```txt
[ component sheet / rows / search ] [ right resizable component tree ]
```

### Right Sidebar Copy

| Current | New |
| --- | --- |
| `Categories` | `Components` |
| `Templates` | removed from this route |
| `Default folders` | `View By: Default` |
| `Suppliers` | `Suppliers` |
| `Organize categories by` | `View components by` |

Recommended exact control shape:

```txt
Components

[ View By: Default ] [ Suppliers ]
```

If the existing compact segmented control is kept, use:

- group aria label: `View components by`
- first button visible text: `View By: Default`
- second button visible text: `Suppliers`

### Sheet Behavior After Dropdown Removal

Default view:
- selecting a folder in the right sidebar updates the left sheet to that folder's rows;
- selecting a folder with no direct rows shows the existing empty-state style;
- custom folder rows remain available only by selecting their folder;
- uncategorized rows are not exposed as a separate dropdown mode in this slice.

Supplier view:
- selecting `All Suppliers` shows supplier-backed component rows;
- selecting a supplier shows rows for that supplier;
- unsourced rows are excluded from supplier-backed views.

Sheet header:
- keep sheet search;
- keep sheet toolbar if useful;
- remove the row-collection dropdown and all options;
- keep the selected context tab/label if it is still useful as a title.

### Removed UI

The following must not be visible in `/workshop/library`:

- `Library row collection` select.
- `Estimate Row Items`.
- `Custom Row Items`.
- `Uncategorized`.
- `Supplier Row Items`.
- `Templates` tab.
- `All Templates`.
- template list rows.

## `/workshop/templates` UX

### Purpose

Browse estimate templates as reusable estimate structures.

### Layout

Match `/workshop/library` for now:

```txt
[ template sheet / search / rows ] [ right resizable template tree ]
```

### Right Sidebar

Recommended starting tree:

```txt
Templates
  All Templates
  Residential Rooms
  ...
```

The current helpers already build:

- `All Templates`
- category children from `template.category`

This is acceptable for the first route.

### Sheet

Use the current `TemplateLibrarySheet` behavior:

- search template names/descriptions/categories/nodes;
- show summary counts: group count, area count, row count;
- show template total;
- show empty state when selected category has no templates.

### Future Deferred UX

Do not add until separately scoped:

- create template;
- edit template;
- delete template;
- duplicate template;
- template preview inspector;
- template drag/drop into estimates from this route;
- template folder CRUD.

## Browser Smoke Paths

### Components Route

1. Open `/workshop/library`.
2. Confirm route shell loads.
3. Confirm right panel is present and on the right.
4. Confirm visible text `Components`.
5. Confirm no `Templates` tab.
6. Confirm no sheet dropdown.
7. Confirm `View By: Default` and `Suppliers`.
8. Select a default folder and verify the sheet context changes.
9. Switch to `Suppliers`, select a supplier, and verify sheet rows are supplier-scoped.

### Templates Route

1. Open `/workshop/templates`.
2. Confirm route shell loads.
3. Confirm layout matches `/workshop/library`.
4. Confirm visible text `Templates`.
5. Confirm `All Templates`.
6. Select a template category and verify the sheet rows change.
7. Confirm no component-specific dropdown or component row collection copy.

### Navigation

1. Expand/hover main sidebar.
2. Confirm Library group includes `Components` and `Templates`.
3. Click `Components` and confirm `/workshop/library`.
4. Click `Templates` and confirm `/workshop/templates`.
