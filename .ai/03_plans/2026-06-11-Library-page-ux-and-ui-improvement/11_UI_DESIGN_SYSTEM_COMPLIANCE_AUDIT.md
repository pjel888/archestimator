# UI Design System Compliance Audit

Status: design-system audit plan for `/workshop/library`.

## Binding Design Contract

From `DESIGN.md` and project instructions:

| Rule | Library implication |
| --- | --- |
| Product/workshop UI uses SF Pro | Do not introduce landing typography. |
| App text max is 12px | Dense labels, card text, buttons, and headings must stay within app scale unless `DESIGN.md` is updated. |
| Letter spacing is 0 | No tracked labels or negative landing-style tracking. |
| Radius is 3px | Cards, buttons, inputs, panels, modals should use `rounded-xs`/3px patterns. |
| Neutral product palette | Avoid orange app/workshop UI unless explicitly authorized. |
| Existing UI library first | Reuse `src/components/ui` before new markup. |
| App UI should be dense and scannable | Avoid marketing hero/page-section language. |
| Cards only when they serve an interaction | Catalogue cards must justify shadow/depth and affordance. |

## Known Compliance Risks

| Risk | Evidence | Severity |
| --- | --- | --- |
| Add toolbar button uses orange default classes | `src/components/ui/header-icon-toolbar.tsx:113` | P1 |
| Filter/group no-op buttons | `HeaderIconToolbar` default actions render without handlers | P1 |
| Persistent 288px sidebar model in docs | Old plan docs, now corrected | Resolved in docs |
| Card shadow/depth may exceed crisp product style | `CATALOGUE_CARD_SHELL_CLASS` source includes shadow | P2 pending visual review |
| Placeholder-only search field | Search has placeholder and aria label but no persistent visible label | P1 accessibility/usability audit |
| Single-tab tablist | Current UI uses one selected tab for context | P2 semantic simplification candidate |

## Component Reuse Matrix

| Need | Preferred existing primitive | Avoid |
| --- | --- | --- |
| Filter controls | `FilterPopover`, `Popover`, `DropdownMenu`, `Chip`, `ButtonGroup` | One-off floating divs or hidden no-op icons. |
| Grouping/data mode | `Tabs`, `ButtonGroup`, `ToolbarIconButton` | Ambiguous "view mode" labels. |
| Detail inspector | `InspectorDrawer`, `Sheet`, `SidePanel`, `ScrollArea` | Modal-first detail that hides catalogue context. |
| Dense table/list | `DataTable`, `ScrollArea`, `Pagination` | Bespoke table markup unless existing table cannot serve. |
| Add/edit form | `ControlInput`, `ControlTextarea`, `ControlSelect`, `CreatableCombobox`, `CurrencyInput`, `DatePicker`, `FileUpload` | Raw inputs with inconsistent labels/states. |
| Destructive archive | `ConfirmDialog`, `DeleteConfirmDialog`, existing `BulkDestructivePreviewModal` | Unreviewed destructive modals. |
| Feedback | `Toast`, `Alert`, `Banner`, `EmptyState`, `Skeleton` | Silent failures or blank panels. |

## Visual Audit Checklist

| Check | Pass criteria |
| --- | --- |
| Typography | SF Pro, app scale, no overflow, no hidden truncation of critical data. |
| Color | Neutral app tokens, semantic colors only for semantic states, contrast passes. |
| Radius | 3px throughout unless existing primitive requires otherwise. |
| Spacing | Compact but readable, no cramped overlap, stable row/card dimensions. |
| Affordance | Clickable things look clickable; non-clickable cards do not imply detail click. |
| State coverage | Default, hover, focus, active, disabled, loading, error, empty. |
| Icon usage | Buttons use icons with accessible names and tooltips where needed. |
| Surface hierarchy | No nested cards, no decorative shadows where borders suffice. |
| Responsive | No incoherent overlap at mobile/tablet/desktop. |
| Motion | 150-250ms where useful, respects reduced motion. |

## Design Decisions To Make Before Coding

1. Should cards become interactive detail triggers, or should detail open from a discrete action?
2. Should detail use right inspector drawer, tree panel replacement, or separate sheet?
3. Should discontinued items be shown by default?
4. Should empty DB roots be visible by default?
5. Should filters be faceted with counts or simple field filters?
6. Should the one-tab context strip remain a tablist?
7. Should the Add action be icon-only or icon plus visible label in this dense header?

## Visual Ralph Readiness

Visual Ralph should not implement yet. When implementation is approved:

1. Capture approved baseline screenshots from the current authenticated page.
2. Record viewports, auth state, seed data, and route state.
3. Use the baseline as the reference for measured iteration.
4. Run visual verdict before each UI edit.
5. Require score >= 90 for final visual parity or document intentional deviations.
