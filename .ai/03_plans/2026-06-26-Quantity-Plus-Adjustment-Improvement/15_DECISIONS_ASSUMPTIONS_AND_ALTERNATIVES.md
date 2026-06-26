# 15 — Decisions, Assumptions, And Alternatives

## Decision Log

### D-1: QTY expression grammar is `base + contingency`

**Problem**: How should users express contingency within the QTY cell?

**Decision**: Use inline `base + contingency`, for example `100+20`.

**Rules**:

- Whitespace is allowed and stripped.
- Only digits, `.`, and one `+` are accepted after whitespace removal.
- Both operands are required when `+` is present.
- `+20` is invalid; use `0+20` for an intentional zero base.
- Negative values, exponent notation, commas, and HTML are rejected.

**Rejected**:

| Option | Reason |
|---|---|
| Two always-visible inputs | Slower and clutters the row cell |
| Percentage-only popover | Does not match the requested inline `+` syntax |
| Sanitizing invalid characters away | Can silently change user intent and weaken validation |

### D-2: Contingency column is derived once a QTY chip exists

**Problem**: Should the Contingency column and QTY chip both be directly editable after an expression exists?

**Decision**: Once a QTY chip exists, the Contingency column is read-only and derived from the chip values. Direct percentage entry is allowed only on a plain row with no chip; on commit it generates the initial `base+N` expression.

**Reasoning**: This keeps one edit authority for quantity-mode rows and avoids rounding conflicts between chip quantity and percentage.

**Rejected**:

| Option | Reason |
|---|---|
| Full bidirectional editing after chip exists | More complex and risks drift between absolute quantity and percentage |
| Always read-only Contingency | Loses a useful plain-row entry path |

### D-3: Totals-area Adjustment storage is estimate-level in `estimate_sheet_adjustments`

**Problem**: Where should the new Adjustment row store its percentage and mode?

**Decision**: Store one adjustment per estimate in `public.estimate_sheet_adjustments`, keyed by `estimate_id` with `UNIQUE(estimate_id)`.

**Reasoning**: The audited code path has an `estimates` table but no confirmed `estimate_sheets` table. A dedicated table is explicit, additive, and leaves room for future per-node overrides.

**Rejected**:

| Option | Reason |
|---|---|
| New columns on `estimate_sheets` | The table is not part of the confirmed implementation surface |
| Per-node adjustment now | More UI/data complexity than the first implementation needs |
| JSON column on estimate | Harder RLS/query/test story and less explicit than a table |

### D-4: Chip base edits keep the absolute contingency amount

**Problem**: If `100+20` is edited to base `150`, should the add-on stay `20` or preserve `20%`?

**Decision**: Keep the absolute add-on. `100+20` changed to base `150` becomes `150+20`, total `170`, raw percentage `13.3333`, displayed as `13%`.

**Reasoning**: The user typed `+20` as an explicit extra quantity. Changing that amount silently would be surprising.

**Rejected**:

| Option | Reason |
|---|---|
| Preserve percentage | Mutates the add-on without a direct user edit |
| Add lock toggle now | Extra UI complexity for the first implementation |

### D-5: Per-row discount is removed for new/converted quantity-mode rows

**Problem**: The existing Adjustment column supports contingency and discount modes, but the user wants the per-row column to become Contingency only.

**Decision**: New and converted rows use quantity-based Contingency only. Per-row discount mode is removed from that UI. Legacy rows with `quantityBase IS NULL` preserve old subtotal-adjustment behavior until a user explicitly converts/edits the row.

**Reasoning**: This respects the explicit product direction without rewriting existing estimates.

**Rejected**:

| Option | Reason |
|---|---|
| Zero out existing discounts in migration | Destructive and unnecessary |
| Keep per-row discount for new rows | Contradicts the requested simplification |

### D-6: Rollback is non-destructive by default

**Problem**: How should the team recover if implementation or rollout has issues?

**Decision**: Code revert, feature flag disablement, or fix-forward are the default recovery paths. Leave additive columns and `estimate_sheet_adjustments` in place unless a fresh backup and explicit owner approval support destructive cleanup.

**Rejected**:

| Option | Reason |
|---|---|
| Drop columns/table during normal rollback | Risks data loss and is unnecessary for nullable additive objects |
| `supabase migration repair` as rollback procedure | Repairs migration metadata; it is not a safe substitute for a designed rollback |

## Resolved Delegated Decisions

| ID | Decision | Status |
|---|---|---|
| OD-1 | Surplus row placement | Resolved: ship Adjustment in totals area below row table; future surplus row can be inserted above it |
| OD-2 | Whitespace tolerance | Resolved: strip whitespace before strict parsing |
| OD-3 | Chip visual positioning | Resolved for plan: compact top-right desktop chip; mobile/touch may use two-row or overlay editor with 44px targets |
| OD-4 | Decimal precision display | Resolved: show rounded integer percentage by default; store raw numeric values |
| OD-5 | Adjustment persistence scope | Resolved: estimate-level dedicated table; per-node deferred |
| OD-6 | Contingency edit authority | Resolved: chip is edit authority after expression exists |

## Assumptions For Implementation

- Archestimator Supabase project is `ebxxqidacheyapmmzavr`.
- Existing estimate rows use `quantityBase = NULL` after migration and therefore remain legacy rows.
- The row update path continues through `update_estimate_row_item_with_history`.
- Browser proof is deferred until implementation because this plan pack changes docs only.
- No app code or database migration has been applied by this plan improvement pass.
