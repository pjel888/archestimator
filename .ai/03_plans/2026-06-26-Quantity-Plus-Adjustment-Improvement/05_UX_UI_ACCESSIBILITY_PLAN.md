# 05 — UX, UI, And Accessibility Plan

## Primary user journey

1. Estimator opens an estimate sheet tab, navigates to a node with rows.
2. In the QTY column, the user sees the current quantity (e.g., `100`).
3. User clicks the QTY cell → it becomes editable (as today).
4. User types `100+20` (base + contingency) → the cell displays `120`, a small `Chip` appears in the upper-right corner reading `100 + 20`.
5. The adjacent **Contingency** column (now positioned between QTY and Subtotal) shows `20%`.
6. The Subtotal column updates to `120 × unitCost`.
7. User can click the chip to open two inline number inputs (base, contingency). Editing either updates both the QTY cell total and the Contingency column percentage.
8. User presses Tab → focus moves to Contingency column (or closes chip first if open).
9. In the totals area below the row table, a new **Adjustment** row with a contingency/discount dropdown applies a percentage to the subtotal. If a separate surplus row later exists, the Adjustment row moves directly after it.

## Component states

### QTY Cell States

| State | Visual | Behavior |
|---|---|---|
| **Display (plain)** | Shows single number, no chip | Click to edit |
| **Display (with contingency)** | Shows total number, chip in upper-right | Click cell to edit expression; click chip to edit breakdown |
| **Editing (plain)** | Input field with single number value | Type new value or `+N`. Blur/Enter commits |
| **Editing (expression)** | Input field with `100+20` text | Show preview of parsed result below/inside. Blur/Enter commits |
| **Chip editor open** | Two small inline inputs below chip: `Base: [100]`, `Contingency: [20]` | Editable independently. Escape closes. Tab cycles. Blur outside closes |
| **Validation error** | Red-tinted input + error chip `Invalid quantity` | Stay in edit mode until corrected or cancelled with Escape |

### Contingency Column States

| State | Visual | Behavior |
|---|---|---|
| **Empty (no contingency)** | Blank cell | Click to enter percentage directly (legacy behavior with contingency-only mode) |
| **Derived (from QTY expression)** | Shows `20%` text (read-only, muted) | Cannot edit directly while chip is active. Click prompts "Edit quantity contingency from the QTY chip" tooltip |
| **Editable (plain row, no chip)** | Shows percentage input | User can type percentage → QTY cell gets `+N` expression generated |

### Chip States

| State | Visual | Behavior |
|---|---|---|
| **Default** | Neutral tone Chip, `100 + 20` text | Click opens editor |
| **Hover** | Chip background darkens slightly | Cursor: pointer |
| **Focus** | Ring-2 ring-focus | Enter key opens editor |
| **Editor open** | Chip active/highlighted + two inline inputs below | See chip editor state |

### Totals-Area Adjustment Row States

| State | Visual | Behavior |
|---|---|---|
| **Default** | Dropdown (Contingency/Discount) + percentage input + computed ₱ value | As the legacy per-row Adjustment column today |
| **Empty** | Dropdown shows "—" or "None", inputs empty | No adjustment applied |
| **Saving** | Inputs disabled or pending state shown inline | Preserve last displayed computed value until save completes |
| **Error** | Error text below row; values remain editable | Do not change totals until successful persistence |
| **Read-only** | Values shown as text for viewers | Viewer cannot focus inputs or open dropdown |

## Information hierarchy

- **QTY total**: Most prominent (10px font, tabular nums, ink color)
- **Chip breakdown**: Secondary (9px font, muted borders, neutral tone)
- **Contingency percentage**: Tertiary (9px font, tertiary color when read-only)
- **Contingency ₱ value**: Removed from per-row Contingency column (was money-based, now quantity-based; the money equivalent is visible in Subtotal column)
- **Totals-area Adjustment ₱ value**: Show computed peso amount below percentage input

## Responsive behavior

- QTY column min-width: 52px, max-width: 140px. The chip must fit within this range.
- At min-width: chip text may truncate to `100+…` with tooltip showing full breakdown.
- At wider widths: chip shows full `100 + 20` text.
- The totals-area Adjustment controls follow the same sizing rules as the existing adjustment controls (min 92px, max 240px where column sizing applies).
- On narrow/touch layouts, tapping the chip turns the QTY cell into a two-row edit surface instead of trying to fit two 44px touch inputs inside the 52px minimum column. The edit surface may overflow/overlay within the row, but its controls must stay at least 44px high and remain inside the viewport.

## Keyboard navigation

| Key | Context | Action |
|---|---|---|
| Tab | Any cell | Move to next editable cell |
| Shift+Tab | Any cell | Move to previous editable cell |
| Enter | QTY cell (editing) | Commit expression, close editor |
| Escape | QTY cell (editing) | Revert to previous value, close editor |
| `+` | QTY cell (editing) | Typed as part of expression (not interpreted as keyboard shortcut) |
| Enter | Chip (focused) | Open chip editor |
| Tab | Chip editor (base input) | Move to contingency input |
| Tab | Chip editor (contingency input) | Close editor, move to next column |
| Escape | Chip editor | Close editor, revert changes, return focus to chip |
| Arrow keys | QTY cell (editing) | Stop propagation (prevent tree navigation while typing) |

## Chip editor focus and commit matrix

| Trigger | Commit? | Focus after action | Error behavior |
|---|---|---|---|
| Open chip with Enter/click | No | Base input | Announce "Editing quantity breakdown" |
| Enter in base or contingency input | Yes | Chip | If invalid, keep focus in invalid input and show `role="alert"` |
| Tab from base input | No | Contingency input | If base invalid, keep focus in base input |
| Tab from contingency input | Yes | Next editable grid cell | If contingency invalid, keep focus in contingency input |
| Escape | No; revert draft | Chip | Clear draft error |
| Outside click / blur outside editor | Yes | QTY cell | If invalid, keep editor open |

## Screen-reader semantics

- **QTY cell**: `<td role="gridcell" aria-label="Quantity for {itemName}, {value}{', with contingency ' + contingencyInfo}">`
- **Chip**: `<button aria-label="Quantity breakdown: base {base}, contingency {contingency}. Press Enter to edit.">`
- **Chip editor inputs**: `<input aria-label="Base quantity">` and `<input aria-label="Contingency quantity">`
- **Contingency column**: `<td aria-label="Contingency percentage for {itemName}, {pct}%{, 'derived from QTY expression'}">`
- **Live region**: When chip editor opens, announce "Editing quantity breakdown. Use Tab to move between base and contingency fields."
- **Validation errors**: `<span role="alert">Invalid quantity expression. Use format: 100 + 20</span>`

## Color and contrast

- Chip: neutral tone (`border-hairline bg-surfaceMuted text-ink`) — sufficient contrast against white/neutral-50 background.
- Focus ring: `ring-2 ring-focus` (blue-500 equivalent, 3:1 minimum contrast).
- Error state: `text-danger` on `bg-dangerSoft` — meets 4.5:1 ratio.
- Chip text: `9px` font, `text-ink` — meets minimum contrast at that size.

## Touch targets

- Chip: visual chip can remain compact on desktop, but on touch/narrow layouts the opened editor controls must be at least 44×44px. Add explicit `min-w-[24px]` to the closed chip and do not rely on 20px height as the only tap target.
- QTY cell: full cell is tappable → edit mode. Chip is an independent sub-target.
- Distinguish: tapping the number area opens the expression editor; tapping the chip opens the breakdown editor. Implementation: the chip has `onClick stopPropagation`. The cell wrapper has its own `onClick`.

## Design-system reuse

- `Chip` from `src/components/ui/chip.tsx` — exactly matches the "small breakdown" requirement.
- `ControlInput` from `src/components/ui/control-input-base.tsx` — used in chip editor inline inputs.
- `DropdownSelect` from `src/components/ui/dropdown-select.tsx` — used in totals-area Adjustment mode toggle.
- No new UI primitives needed. No new dependencies.

## Edge cases

- **Zero base with contingency**: User types `0+20`. This is weird but valid (base=0, contingency=20). Display as total=20, chip reads `0 + 20`, percentage=∞. Handle: percentage column shows `—` or `N/A` when base=0.
- **Zero contingency**: `100+0` → same as `100`. No chip, no contingency.
- **Typing `+` first**: `+20` → parser treats as incomplete/invalid; user must type an explicit base such as `0+20`.
- **Typing only `+`**: `+` alone → incomplete, editor stays open, no commit.
- **Very large numbers**: `999999+999999` → no overflow. Numbers use `numeric(14,4)` in DB (max ~10^10).
- **Concurrent editing**: Two users edit the same row's QTY. Last write wins with optimistic rollback — same behavior as today. Broadcast structured payload ensures consistency.
