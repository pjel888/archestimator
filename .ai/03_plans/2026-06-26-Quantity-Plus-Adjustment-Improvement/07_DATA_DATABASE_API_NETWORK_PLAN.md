# 07 — Data, Database, API, And Network Plan

## Database Schema

### Migration Files

**Primary migration**: `supabase/migrations/20260626000000_add_quantity_contingency_columns.sql`

The migration is additive and must not rewrite existing estimate row values. Existing rows remain legacy rows until a user explicitly edits or converts them.

```sql
ALTER TABLE public.estimate_row_items
  ADD COLUMN IF NOT EXISTS quantity_base numeric(14, 4),
  ADD COLUMN IF NOT EXISTS quantity_contingency_amount numeric(14, 4);

COMMENT ON COLUMN public.estimate_row_items.quantity_base IS
  'Base quantity before contingency add-on. NULL means legacy subtotal-adjustment semantics.';
COMMENT ON COLUMN public.estimate_row_items.quantity_contingency_amount IS
  'Quantity contingency add-on. Meaningful only when quantity_base is non-NULL.';

ALTER TABLE public.estimate_row_items
  ADD CONSTRAINT estimate_row_items_quantity_base_non_negative
  CHECK (quantity_base IS NULL OR quantity_base >= 0);

ALTER TABLE public.estimate_row_items
  ADD CONSTRAINT estimate_row_items_quantity_contingency_non_negative
  CHECK (quantity_contingency_amount IS NULL OR quantity_contingency_amount >= 0);

ALTER TABLE public.estimate_row_items
  ADD CONSTRAINT estimate_row_items_quantity_contingency_requires_base
  CHECK (quantity_base IS NOT NULL OR quantity_contingency_amount IS NULL);
```

**Adjustment storage migration**: same migration or an immediately following migration.

The totals-area Adjustment row is estimate-level for the first implementation. There is no `estimate_sheets` table in the audited code path, so the initial storage is a dedicated table keyed by `estimate_id`. Per-node overrides are a future extension and are not part of this plan.

```sql
CREATE TABLE IF NOT EXISTS public.estimate_sheet_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  percentage numeric(5, 2) NOT NULL DEFAULT 0
    CHECK (percentage >= 0 AND percentage <= 100),
  mode text NOT NULL DEFAULT 'contingency'
    CHECK (mode IN ('contingency', 'discount')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (estimate_id)
);
```

Add the repo-standard `updated_at` trigger if one already exists for similar tables. If not, keep the first migration minimal and update `updated_at` in the server action.

### RLS

Existing row-level policies on `estimate_row_items` cover the new nullable columns automatically. The implementation still must verify that `update_estimate_row_item_with_history` does not bypass `canEditEstimate` or RLS expectations for the caller.

`estimate_sheet_adjustments` needs explicit RLS:

```sql
ALTER TABLE public.estimate_sheet_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view estimate sheet adjustments"
  ON public.estimate_sheet_adjustments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.estimates e
      JOIN public.project_members pm ON pm.project_id = e.project_id
      WHERE e.id = estimate_sheet_adjustments.estimate_id
        AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can insert estimate sheet adjustments"
  ON public.estimate_sheet_adjustments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.estimates e
      JOIN public.project_members pm ON pm.project_id = e.project_id
      WHERE e.id = estimate_sheet_adjustments.estimate_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'admin', 'manager', 'editor')
    )
  );

CREATE POLICY "Editors can update estimate sheet adjustments"
  ON public.estimate_sheet_adjustments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.estimates e
      JOIN public.project_members pm ON pm.project_id = e.project_id
      WHERE e.id = estimate_sheet_adjustments.estimate_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'admin', 'manager', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.estimates e
      JOIN public.project_members pm ON pm.project_id = e.project_id
      WHERE e.id = estimate_sheet_adjustments.estimate_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'admin', 'manager', 'editor')
    )
  );

CREATE POLICY "Editors can delete estimate sheet adjustments"
  ON public.estimate_sheet_adjustments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.estimates e
      JOIN public.project_members pm ON pm.project_id = e.project_id
      WHERE e.id = estimate_sheet_adjustments.estimate_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'admin', 'manager', 'editor')
    )
  );
```

If the repo already exposes a canonical `can_edit_estimate` SQL helper, prefer that helper over repeating role logic.

## Repository And Type Propagation

The row-update path is not a direct table upsert. Current code evidence shows `updateEstimateRowItem` uses the `update_estimate_row_item_with_history` RPC. The plan must update every layer that serializes or selects row item fields:

- Supabase generated database types.
- `EstimateRowItem`, row snapshots, and version-control/history model types.
- `UpdateEstimateRowItemInput`.
- `update_estimate_row_item_with_history` RPC argument JSON, update statement, changed-field diff, and activity/history snapshot.
- `src/lib/domain/estimate-repository.ts` and `src/lib/domain/workspace-repository.ts` selectors.
- Route-context RPC/selectors that hydrate estimate sheets.
- `src/hooks/use-estimate-row-mutations.ts` payload building and optimistic rollback.
- Any publication/share/proposal snapshot serializer that stores `EstimateRowItem`.

The generated and hand-written selectors must include:

```typescript
quantityBase?: number | null;
quantityContingencyAmount?: number | null;
```

## Server Actions

### `updateEstimateRowItem`

**File**: `src/lib/estimates/actions.ts`

Extend the action input:

```typescript
type UpdateEstimateRowItemInput = {
  // existing fields...
  quantity?: number | null;
  quantityBase?: number | null;
  quantityContingencyAmount?: number | null;
};
```

Server validation rules:

- `quantityBase` and `quantityContingencyAmount` must be finite, non-negative numbers when present.
- Values must fit `numeric(14,4)`.
- If `quantityBase` is `null`, `quantityContingencyAmount` must also be `null`; this is legacy mode.
- If `quantityBase` is non-null, `quantityContingencyAmount` defaults to `0` when omitted.
- The server computes `quantity = quantityBase + quantityContingencyAmount` for quantity-mode rows and rejects client totals that disagree beyond the existing decimal tolerance.
- Raw QTY expression strings are not persisted.
- Existing rows with `quantityBase IS NULL` preserve legacy `contingencyPercentage` subtotal semantics until converted by a user edit.
- New or converted rows use quantity-based contingency and do not use per-row discount mode.

### `updateEstimateSheetAdjustment`

**File**: `src/lib/estimates/actions.ts`

Add a separate action for the totals-area Adjustment row:

```typescript
type UpdateEstimateSheetAdjustmentInput = {
  estimateId: string;
  percentage: number;
  mode: "contingency" | "discount";
};

export async function updateEstimateSheetAdjustment(input: UpdateEstimateSheetAdjustmentInput) {
  // canEditEstimate gate
  // validate percentage is finite and 0..100
  // validate mode allow-list
  // upsert into public.estimate_sheet_adjustments on estimate_id
}
```

Use `percentage = 0` and `mode = "contingency"` as the no-op state. Do not delete the row just because the user clears the UI; keeping a stable row makes optimistic updates and export settings simpler.

## Realtime / Collaboration Event

`src/hooks/use-estimate-cursor-broadcast.ts` is cursor-only and must not become the row data transport by accident. Implement either:

- `src/hooks/use-estimate-row-update-broadcast.ts`, or
- a typed collaboration-event hook with a discriminated `type: "row-update"` union.

Row update event payload:

```typescript
interface RowUpdateBroadcast {
  type: "row-update";
  estimateId: string;
  rowId: string;
  rowRevision?: number;
  fields: {
    quantity?: number;
    quantityBase?: number | null;
    quantityContingencyAmount?: number | null;
    contingencyPercentage?: number | null;
  };
  senderId: string;
  timestamp: string;
}
```

Receiver validation:

- `estimateId` matches the open estimate.
- `rowId` exists in local editable rows.
- Optional revision/timestamp is not older than the local row state.
- Numeric fields are finite, non-negative, and inside database bounds.
- Broadcast state is display-optimistic only. Server state remains authoritative; refetch on mismatch, missing row, stale revision, or validation failure.

## Excel Export

Export math must distinguish legacy rows from quantity-mode rows:

```typescript
const hasQuantityMode = sourceRow.quantityBase != null;
const quantityBase = hasQuantityMode ? sourceRow.quantityBase : sourceRow.quantity;
const quantityContingencyAmount = hasQuantityMode
  ? sourceRow.quantityContingencyAmount ?? 0
  : 0;
const totalQuantity = roundQuantity(quantityBase + quantityContingencyAmount);
const materialSubtotal = roundMoney(materialUnitCost * totalQuantity);
const contingencySubtotal = hasQuantityMode
  ? 0
  : roundMoney((materialSubtotal * (sourceRow.contingencyPercentage ?? 0)) / 100);
```

Rules:

- `quantityBase != null` means row contingency is quantity-based and already included in material subtotal.
- `quantityBase == null` means legacy row and keeps the old subtotal-contingency formula.
- The totals-area Adjustment feeds or replaces the existing proposal-level contingency/discount setting exactly once.
- Do not apply both `estimate_sheet_adjustments.percentage` and `ProposalExportSettings.contingencyRate` unless they are deliberately reconciled to the same single source.

Optional export columns `quantityBase` and `quantityContingencyAmount` may be added behind `includeQuantityBreakdown`; the main correctness requirement is no double-counting.
