# Storybook Story Coverage Matrix

## P0 Required Stories

| Story group | Required stories | Done condition |
|---|---|---|
| Foundations/Colors | neutral, text, border, status, focus | All roles visible and named. |
| Foundations/Typography | app title, label, body, table, button, long text | Matches `DESIGN.md` density. |
| Foundations/Density | spacing, radius, shadow, focus ring | External-library defaults are visibly rejected. |
| Icons/Gallery | Phosphor regular icons, sizes, labels | Icon-only a11y labels documented. |
| Actions/Button | variants, sizes, icons, loading, disabled, long label | Keyboard/focus and aria-busy shown. |
| Actions/IconButton | toolbar, selected, disabled, danger, tooltip | aria-label required in docs. |
| Forms/TextField | text, search, numeric, invalid, disabled, helper | Label/error association shown. |
| Forms/SelectField | closed, open, disabled, invalid | Keyboard behavior documented. |
| Status/BadgeChip | neutral, success, warning, danger, removable | Contrast and remove label shown. |
| Menus/ActionMenu | trigger, grouped, disabled, destructive | Arrow/escape/focus return noted. |
| Menus/ContextMenu | row actions, nested or grouped, destructive | Keyboard behavior noted. |
| Overlay/Modal | basic, form, destructive, busy/error | Focus trap and title labels noted. |
| Overlay/Tooltip | hover, focus, icon trigger | Nonessential/help text policy noted. |
| Feedback/Toast | info, success, warning, error, persistent | Live-region/status policy noted. |
| Feedback/EmptyLoading | empty, filtered empty, skeleton, route loading | Nonblocking semantics noted. |

## P1 Required Stories

| Story group | Required stories | Done condition |
|---|---|---|
| Forms/Combobox | search, create, empty, loading, invalid | Arrow-key and active option noted. |
| Navigation/Tabs | compact, icon, overflow, disabled | `aria-controls` relationship noted. |
| Navigation/AppShell | workshop shell, collapsed/expanded, loading | Landmark/focus order noted. |
| DataTable | empty, loading, sortable, selected, overflow | Header and row semantics noted. |
| EditableCell | editing, saving, invalid, rollback | Keyboard commit/cancel documented. |
| TreeShell | expanded, collapsed, selected, empty, invalid target | Expand/collapse keyboard documented. |
| EstimateTree | group, area, row, editing/dirty state | Domain risk and no migration label. |
| ShareReviewTree | readonly, selected, decision state | Readonly interaction policy. |
| ComponentLibrary | category, template, supplier view, no results | Shared data/fixture isolation. |
| NotificationCenter | unread, read, modal announcement, empty | Dialog/list focus behavior. |
| LayoutPrimitives | stack, inline, toolbar, split pane, overflow | Stable alignment under long labels. |
| DomainBlocks | project card/table, estimate editor frame, proposal review frame | Static fixture only. |

## P2/P3 Deferred Stories

- Breadcrumbs
- Side panel/drawer
- Alert/banner variants
- File dropzone
- Thumbnail/document preview
- Cost summary chart
- Number stepper/range slider
- Aceternity-style landing-only effects
- Public Storybook landing page

## Coverage Status Labels

| Label | Meaning |
|---|---|
| `NOT_STARTED` | Story does not exist. |
| `DRAFT` | Story renders but states/a11y are incomplete. |
| `REVIEW_READY` | Story covers required states and fixture policy. |
| `APPROVED` | Philip approved the story result. |
| `REJECTED` | Story must not be migrated. |
| `DEFERRED` | Not part of MVP. |
