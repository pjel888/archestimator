---
title: Component Library Inventory
date: 2026-06-15
status: implementation-ready evidence
type: inventory
scope: /workshop/projects
---

# Component Library Inventory

## Correct primitive choice

Use `src/components/ui/dropdown-select.tsx` for both View and Sort field.

Why:

- It is the repo's existing single-select value picker.
- It uses a select-only combobox/listbox pattern with `value`, `onValueChange`, options, `aria-selected`, typeahead, and a hidden native select.
- It is built on `useDropdownPopup`, which portals the popup to `document.body` with `position: fixed` (clip-safe) and uses keyboard navigation + typeahead.
- It avoids inventing a new toolbar picker or abusing an action menu as a value picker.

Two primitive facts that shape how View and Sort labels are authored:

- `DropdownSelectOption` is exactly `{ value: string; label: string; disabled?: boolean }`. There is **no** `icon` field and the trigger has **no** leading-icon slot — the trigger renders only the selected option's `label` text plus a built-in `CaretDown` chevron. You cannot prefix or decorate the trigger, so any mode prefix (`"View:"`, `"Sort:"`) must be encoded in the label text itself.
- `DropdownSelect` has **no** default accessible name. You **must** pass `aria-label` (or `aria-labelledby`) or the combobox is unnamed and the "named combobox" a11y tests fail. The label flows to both the `role="combobox"` trigger and the `role="listbox"` panel.
- `onValueChange` is skipped when the new value equals the current value (native-select parity). `disabled` is hard (not focusable); `ariaDisabled` is transient (stays focusable).

Do not use `DropdownMenu` for View or Sort field in this MVP. It is useful for action menus, but it does not provide a selected value API or native `menuitemradio`/`aria-checked` behavior in the current implementation.

### `DropdownSelect` API (relevant surface)

Option shape:

```ts
type DropdownSelectOption = { value: string; label: string; disabled?: boolean };
```

Key props: `options` (readonly option array), `value` (controlled current value), `onValueChange(next: string)`, `aria-label` (required here — no default name), `disabled` (hard, not focusable), `ariaDisabled` (transient, stays focusable), `variant` (`"underline"` default | `"boxed"`).

View usage (RD1 — separate page-local label map, `aria-label` for the accessible name):

```tsx
<DropdownSelect
  aria-label="View"
  value={viewMode}
  options={VIEW_SELECT_OPTIONS}
  onValueChange={(next) => writeProjectViewModePreference(next as ProjectCardViewMode)}
/>
```

Sort field uses the same primitive with `aria-label="Sort field"` and `"Sort: …"`-prefixed labels (RD2): `Sort: Last updated` / `Sort: Date created` / `Sort: Client` / `Sort: Project name`. The trigger always reflects the selected field verbatim, so a bare "Sort" label while untouched is not buildable with this primitive — drop that behavior. Direction is a separate compact toggle button (RD3), not part of the `DropdownSelect`.

## Toolbar host

Use the existing `filterSlot` path:

1. Add `filterSlot?: ReactNode` to `WorkshopCollectionLayoutProps`.
2. Destructure `filterSlot` in `WorkshopCollectionLayout`.
3. Pass it to `TreePanelHeader`.
4. In `projects-page-client.tsx`, render a small no-wrap wrapper containing:
   - View `DropdownSelect`
   - Sort-field `DropdownSelect`
   - direction toggle button

Do not modify:

- `src/components/ui/header-icon-toolbar.tsx`
- `src/components/ui/tree-panel-header.tsx`
- `src/components/ui/dropdown-select.tsx`

## Layout rules for the slot wrapper

The toolbar is a compact app header, not a floating form row. The wrapper should:

- stay one line
- align center
- avoid cards, pills, gradients, and oversized labels
- set max widths on dynamic labels, especially the Sort trigger
- allow text truncation before it pushes Add off the right edge
- keep the Add action in its existing right-aligned `ml-auto` area
- collapse labels at the narrowest breakpoint only if implementation pressure requires it, while preserving accessible names

## Existing primitives and their role

| Primitive | Role in this plan | Notes |
| --- | --- | --- |
| `DropdownSelect` | Required for View and Sort field | Best semantic fit for single-select controls. |
| `HeaderIconToolbar.filterSlot` | Required host | Accepts arbitrary React content and is already forwarded by `TreePanelHeader`. |
| `ToolbarIconButton` | Direction toggle only if already practical | Use the existing visual language for a compact icon/text button. |
| `DropdownMenu` | Not used for View/Sort field | Action menu, not current selected-value picker. |
| `SegmentedControl` | Rejected for v1 | Good for high-frequency switching, but does not satisfy the requested consolidation. |
| `FilterPopover` / `Popover` | Deferred | Not portaled at all (an absolute-positioned div inside a relative span), so the toolbar's overflow/stacking context can clip it; `DropdownSelect` portals to `document.body` and is the clip-safe choice. No validated filter facets are in scope either. |

## Anti-patterns to avoid

- Do not render dropdowns through `leadingActions`; it cannot host children.
- Do not copy the component-library manager's hand-rolled absolute menu pattern.
- Do not add a shared `SortSelect` primitive for one page.
- Do not add icons inside `DropdownSelect` unless the shared primitive is intentionally enhanced in a separate design-system task.
- Do not use `aria-checked` or `menuitemradio` assertions with `DropdownSelect`; tests should target combobox/listbox/options and `aria-selected`.

## Accessibility contract

The plan follows the existing `DropdownSelect` behavior:

- trigger has combobox semantics
- popup has listbox semantics
- selected option exposes selected state
- keyboard opens, navigates, commits, and closes through the existing primitive
- focus returns to the trigger after selection/close

Implementation tests should verify repo behavior through roles and labels, not through private implementation classes.
