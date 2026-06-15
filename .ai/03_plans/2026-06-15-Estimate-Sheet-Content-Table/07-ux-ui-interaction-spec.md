# 07 — UX/UI Interaction Spec: Shared Resizable Estimate Columns

**Date:** 2026-06-15
**Type:** Planning / UX specification only. No source code was modified.
**Scope:** User-facing behavior for resizing estimate-sheet columns across all node groups.

This document turns the technical recommendation in `06` into a product contract an implementer can build and a reviewer can verify.

---

## 1. Product intent

Users work in a dense estimating surface for long sessions. Column resizing should feel like a precise spreadsheet affordance: quiet, predictable, keyboard-accessible, and consistent across every area/table in the estimate. It must not turn the estimate sheet into a decorative dashboard or add a separate settings panel before direct manipulation works.

**User promise:** when a user widens or narrows a data column once, every row group in the current estimate uses that same width immediately.

**Non-promise:** column widths are not collaborative document state, not proposal/export formatting, and not a server-backed beta requirement for MVP.

---

## 2. Visual placement and information architecture

### Canonical resize surface

Use **one canonical column ruler/header** for resize handles. Do not render independent active handles in every node-group table header.

Recommended placement:

- A sticky estimate-row column ruler immediately below the existing sticky estimate sheet header/toolbar and above the first row-bearing group.
- The ruler stays inside the `[data-estimate-pointer-surface]` subtree so it inherits the same `--est-col-*` variables as body rows.
- Per-node table headers can remain passive labels during migration, but they must not present separate active resize handles once the shared ruler ships.

Alignment contract under horizontal scroll:

```
[data-estimate-pointer-surface]  (overflow-auto; owns scrollLeft and --est-col-* vars)
  ├─ sticky shared column ruler  (same COLUMN_TEMPLATE; horizontally scrolls/mirrors with surface content)
  └─ EstimateSheetVirtualBranchList
      └─ N row-table headers/body rows (same COLUMN_TEMPLATE)
```

The ruler must either participate in the same horizontally scrolling content
flow as the rows or explicitly mirror the surface `scrollLeft`. A sticky ruler
that is pinned visually but not scroll-synchronized is a no-go because handles
will drift from body columns.

Why: the sheet has many independent `EstimateRowItemsTable` instances. N active headers editing one shared width model is visually noisy and makes it unclear which handle owns the drag.

### Column labels

Use the live header vocabulary:

| Track | Label | Resize? | Interaction role |
|---:|---|---:|---|
| 1 | `#` | No | row-number gutter |
| 2 | select checkbox | No | selection chrome |
| 3 | `Materials` | Yes | rich material / express component content |
| 4 | `Qty` | Yes | editable quantity and unit suffix |
| 5 | `Subtotal` | Yes | computed subtotal |
| 6 | `Adjustment` | Yes | adjustment mode, percent, value |
| 7 | `Misc Cost` | Yes | editable misc cost |
| 8 | `Total Item Cost` | Yes | computed line total |
| 9 | actions | No | row action buttons |

Do not introduce user-facing names such as `Unit Cost` or `Contingency` unless the row UI is also renamed. `unit` is inline content inside `Qty`; it is not a standalone column.
For storage/CSS IDs and backing field names, use the canonical mapping in
`04-shared-width-state-design.md` (`subTotal`, `adjustment` over contingency
fields, `totalItemCosts`).

---

## 3. Resize behavior

### Pointer

- Resize handle appears on the inline end of each resizable data-column header.
- Visual line: 1px neutral hairline at rest; 2px strong/focus line on hover, focus, or active resize.
- Hit area: at least 8px mouse target and at least 24px touch target, without making the visual line look heavy.
- On pointer down: stop propagation, set `draggable={false}` on the handle, prevent text selection, and do not start any HTML5 drag interaction.
- During drag: update the shared CSS variable on the common ancestor, not React state.
- On pointer up/cancel: clamp, commit once to the width store, then announce final width if an aria-live path is used.

### Keyboard

Every resize handle must be keyboard reachable and expose:

- `role="separator"`
- `aria-orientation="vertical"`
- `aria-label="Resize {Column} column"`
- `aria-valuemin`, `aria-valuemax`, and `aria-valuenow` in CSS pixels
- `Tab` focuses the handle in header order
- `ArrowLeft` / `ArrowRight` resize by 16px in LTR
- `Shift+ArrowLeft` / `Shift+ArrowRight` resize by 48px
- `Home` resets that column to its default
- `Escape` restores the width that was active when the focused keyboard-resize session began, then blurs the handle. If implementation cannot make that deterministic, omit Escape cancel behavior rather than leaving partial CSS/store state.

If RTL is ever enabled, use TanStack `columnResizeDirection: "rtl"` semantics or invert the keyboard delta consistently. The MVP may explicitly document LTR-only if the app has no shipped RTL locale.

### Reset

Provide both:

- Double-click on a handle resets that column.
- One compact action, `Reset column widths`, resets every data column for the estimate.

The all-column reset belongs in an existing sheet/header action menu, not as a permanent toolbar button.

---

## 4. Layout constraints

### Fixed-height row contract

Rows remain 96px fast-path rows. Resizing never enables wrapping that changes row height. `Materials` remains truncating/clamped, including express component cards.

Acceptance:

- At minimum width, the material card still shows a stable image placeholder area, component name, supplier/source line, and essential edit affordances without layout overlap.
- The express-card floor must be measured before user-visible resize. Known fixed constituents are `size-14` image (56px), `gap-2`, `pr-[92px]` title/supplier reserve, and the `w-[84px]` cost field. Default/min remains 160 until that measurement proves a higher floor; if raised, the byte-identical Phase 0 rollout promise must be removed from `04`/`06`.
- Supplier/source meta must not rely on `tertiary #7F7F7F` when it is the only visible identifier at a narrow width. Use `secondary #5D5D5D` or another AA-safe treatment for load-bearing meta text.
- Numeric cells use `tabular-nums`, truncate gracefully, and keep controls keyboard reachable.
- No row grows taller because a column narrows.

### Width bounds

Recommended data-column bounds:

| Column | Default | Min | Max | Notes |
|---|---:|---:|---:|---|
| `material` | 160 min + flex | 160 pending U0 measurement | 640 | Express card is the limiting UI. If measurement proves the usable floor is higher, raise default and min together. |
| `quantity` | 58 | 52 | 140 | Must preserve input plus `/ unit` suffix. |
| `subTotal` | 92 | 76 | 220 | Read-only currency. |
| `adjustment` | 106 | 92 | 240 | Contains dropdown, percent input, and value. |
| `miscCost` | 92 | 76 | 220 | Editable currency. |
| `totalItemCosts` | 108 | 88 | 260 | Read-only currency; should not truncate ordinary totals at desktop width. |

Implementation should clamp stored values on read and write.

### Horizontal overflow

MVP contract:

- Keep `Materials` flexible where possible so the sheet fills available width.
- If user widths exceed viewport width, horizontal scroll lives on the shared sheet surface, never inside individual node-group tables.
- Sticky-left `#` / selection columns are not required for MVP, but must be listed as a follow-up if horizontal scroll becomes common.

---

## 5. Responsive behavior

### Desktop and large laptop

Full resize behavior is enabled. The shared ruler/header is visible and keyboard reachable.

### Tablet

Resize handles may remain available if hit targets and horizontal scroll are usable. The right dock/drawers must not cover the active handle during drag.

### Mobile

Dense estimate editing is already a constrained secondary flow. Recommended MVP: hide resize handles below the estimate-workspace mobile breakpoint and use default column geometry or a simplified mobile editing surface. Persisted desktop widths should not make mobile unusable.

Acceptance: below the workshop mobile breakpoint, ignore custom desktop widths
or clamp them to a mobile-safe layout. On coarse pointers, use at least a 24px
hit area and prefer 44px when resize remains enabled. A stored wide desktop
layout must not cause the mobile page to render with inaccessible primary
controls.

---

## 6. States to design and test

| State | Required behavior |
|---|---|
| Resting | Handle visible on header hover/focus or subtly always visible in the ruler; no visual noise in every body row. |
| Hover | Divider darkens from hairline (`#F2F2F2`) to secondary (`#5D5D5D`). |
| Focus | Visible accent (`#3D3D3D`) focus line with AA contrast; handle has a clear accessible name. |
| Active drag | Body cursor becomes `col-resize`; text selection disabled; live width preview updates all groups. |
| Keyboard resize | Width changes in deterministic steps; `aria-valuenow` updates. |
| Commit | Final width persists once; optional polite announcement only after final width. |
| Cancel | Pointer cancel or Escape does not leave partial React/store state inconsistent with CSS vars. |
| Storage unavailable | Resizing still works for the session; persistence failure is swallowed like existing storage helpers. |
| Corrupt stored widths | Defaults render; no broken grid. |
| Express editor active | Focus stays in the editor; resize does not remount the row. |
| Search/filter active | Widths remain stable as row groups mount/unmount. |
| Empty node group | No empty table/ruler clone appears inside that node. |
| Virtualized rows | Resize does not change mounted row count except normal virtualizer behavior from scrolling. |
| Read-only estimate | Because widths are a view preference, resize may remain available in read-only mode if product policy allows personal view customization. If policy forbids it, hide handles and remove them from the tab order. |

---

## 7. Accessibility acceptance criteria

- All resizable data headers expose a focusable `role="separator"` handle.
- Gutter, selection, and action columns do not expose resize handles.
- Keyboard-only user can resize and reset columns without entering the estimate cell navigation loop.
- Screen reader user hears the column name and current size.
- Active/focus line passes contrast against white and neutral header backgrounds.
- Resize does not announce continuously on every pointer move.
- Reduced-motion users see the same immediate state change; no decorative animation is required.
- Pointer/touch target does not block the select-all checkbox or column labels.
- 200% zoom keeps handles reachable and labels/cells non-overlapping.
- Forced-colors / high-contrast mode preserves a visible separator and focus state.
- Truncated material/meta content has an accessible full-text path through label/description or the row inspector; `title` alone is not enough for touch or screen reader users.

---

## 8. Design-system fit

Use the app/workshop product register:

- SF Pro/system stack only.
- 10px header/body scale; no headline typography.
- 3px radius only if any handle focus background or menu surface needs radius.
- Neutral/hairline borders; no orange except already-approved estimate-sheet add/occupancy exceptions, which do not apply to resize handles.
- No heavy shadows, gradient handles, animated flourishes, or decorative color.
- Resting divider uses hairline, hover uses secondary, and focus/active uses the `accent` token. Do not hardcode a blue focus color.

The resize UI should feel like a precision tool, not a feature announcement.
