# 07 — Project-Specific / Unlink Components Plan

**Date:** 2026-06-01
**Priority:** P0 — Critical MVP blocker

## User Story

A user drags/clicks a component from the library into an estimate. By default, the row remembers its source library component (`source_library_item_id`, `link_state = "linked-clean"`). The user needs a `"Make project-specific"` action that:

1. Breaks the link to the library component
2. Preserves the row values as a frozen project-specific copy
3. Lets the user edit material, description, supplier, unit, unit cost, notes without affecting the library
4. Prevents future library changes from affecting this row
5. Shows the user a visible badge confirming the row is now project-specific

## Current Row/Link Architecture

### Database State

**Table:** `estimate_row_items`
- `source_library_item_id: uuid?` → FK to `cost_library_items.id`, nullable, `ON DELETE SET NULL`
- `link_state: estimate_row_link_state` → enum: `unlinked | linked-clean | linked-overridden | detached | source-changed`
- `source_snapshot: jsonb` → frozen copy of library item at insert time (category, brand, supplier, unit_cost, pricing date, image URL, etc.)
- `row_revision: integer` → optimistic concurrency guard

### Schema Enum Values

Defined in `supabase/migrations/20260518090000_archestimator_core_schema.sql`:

```sql
CREATE TYPE public.estimate_row_link_state AS ENUM (
  'unlinked',        -- No library source (manual rows, blank rows)
  'linked-clean',    -- Linked, no overrides
  'linked-overridden', -- Linked, scalar fields edited (quantity, contingency%, miscCost)
  'detached',         -- Was linked, explicitly unlinked (DEFINED BUT NEVER SET)
  'source-changed'    -- Library source was updated (DEFINED BUT NEVER SET)
);
```

### Current Code Behavior

**Insert (linked):** Sets `link_state = "linked-clean"`, stores `source_library_item_id`, captures `source_snapshot`.

**Scalar edit (quantity, contingency%, miscCost):** If `source_library_item_id` exists, sets `link_state = "linked-overridden"`. Does NOT clear `source_library_item_id`.

**Replace component:** New library item replaces old, new snapshot, new `source_library_item_id`.

**Delete row:** Row removed entirely.

**Clear/replace-with-blank:** Sets `source_library_item_id = null`, `link_state = "unlinked"`.

**What's MISSING:** No code path ever writes `link_state = "detached"` or `link_state = "source-changed"`. No user-facing unlink action. No row inspector fields are editable (they're read-only).

### Key Finding

The `"detached"` state already exists in the Postgres enum, TypeScript types, and UI label map. We don't need a new `"project-specific"` state — `"detached"` is the correct term for "was linked but explicitly unlinked." The enum constraint is already in the schema with `"detached"` as a valid value.

## DB Schema Decision

**Prefer no schema change.** Use existing `link_state = "detached"`.

The existing enum supports all needed states:
- `unlinked` → manual/blank row, never had a library source
- `linked-clean` → linked, no overrides
- `linked-overridden` → linked, scalar edits made
- `detached` → **was linked, now explicitly unlinked (project-specific)**
- `source-changed` → library source updated (future feature)

**Migration strategy:** No ALTER TYPE needed. No new migration required. Just use `detached` in the new RPC.

## RPC / Server Action Proposal

### New RPC: `unlink_estimate_row_item_from_library`

**Purpose:** Unlink a row from its library source, making it project-specific.

**Signature:**
```sql
CREATE OR REPLACE FUNCTION public.unlink_estimate_row_item_from_library(
  p_row_id uuid,
  p_expected_row_revision integer,
  p_unlink_reason text DEFAULT NULL
) RETURNS SETOF estimate_row_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_workspace_id uuid;
  v_project_id uuid;
  v_estimate_id uuid;
  v_row estimate_row_items;
BEGIN
  -- Resolve workspace ownership through the chain
  SELECT e.workspace_id, e.project_id, e.id
  INTO v_workspace_id, v_project_id, v_estimate_id
  FROM estimate_nodes n
  JOIN estimates e ON e.id = n.estimate_id
  WHERE n.id = (
    SELECT area_node_id FROM estimate_row_items WHERE id = p_row_id
  );

  -- Verify row exists and revision matches (optimistic concurrency)
  SELECT * INTO v_row
  FROM estimate_row_items
  WHERE id = p_row_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Row not found' USING ERRCODE = 'no_data_found';
  END IF;

  IF v_row.row_revision != p_expected_row_revision THEN
    RAISE EXCEPTION 'Row revision conflict: expected %, got %',
      p_expected_row_revision, v_row.row_revision
    USING ERRCODE = 'estimate_sheet_row_revision_conflict';
  END IF;

  -- Verify row is currently linked (has source_library_item_id)
  IF v_row.source_library_item_id IS NULL THEN
    RAISE EXCEPTION 'Row is not linked to a library component'
    USING ERRCODE = 'check_violation';
  END IF;

  -- Link state must be linked-clean or linked-overridden (not already detached)
  IF v_row.link_state NOT IN ('linked-clean', 'linked-overridden') THEN
    RAISE EXCEPTION 'Row is not in a linkable state: %', v_row.link_state
    USING ERRCODE = 'check_violation';
  END IF;

  -- Perform the unlink
  UPDATE estimate_row_items
  SET
    source_library_item_id = NULL,
    link_state = 'detached',
    source_snapshot = source_snapshot || jsonb_build_object(
      'unlinkedFromLibraryItemId', source_library_item_id,
      'unlinkedFromPriceOptionId', source_snapshot->'priceOptionId',
      'unlinkedFromComponentVersionId', source_snapshot->'componentVersionId',
      'unlinkedAt', now()::text,
      'unlinkedBy', auth.uid()::text,
      'unlinkReason', p_unlink_reason
    ),
    row_revision = row_revision + 1,
    updated_at = now()
  WHERE id = p_row_id
  AND row_revision = p_expected_row_revision;

  -- Record history event
  INSERT INTO estimate_sheet_events (
    estimate_id, project_id, workspace_id,
    event_type, target_type, target_id,
    actor_id, snapshot, metadata
  ) VALUES (
    v_estimate_id, v_project_id, v_workspace_id,
    'row_unlinked_from_library', 'row_item', p_row_id,
    auth.uid(),
    to_jsonb(v_row),
    jsonb_build_object(
      'unlinkedLibraryItemId', v_row.source_library_item_id,
      'unlinkReason', p_unlink_reason
    )
  );

  RETURN QUERY
  SELECT * FROM estimate_row_items WHERE id = p_row_id;
END;
$$;

-- Grant execute to authenticated only
GRANT EXECUTE ON FUNCTION public.unlink_estimate_row_item_from_library TO authenticated;
REVOKE EXECUTE ON FUNCTION public.unlink_estimate_row_item_from_library FROM anon, public;

-- Add unlink event type to the estimate sheet event enum
ALTER TYPE public.estimate_sheet_event_type ADD VALUE IF NOT EXISTS 'row_unlinked_from_library';
```

### Server Action (TypeScript)

**File:** `src/lib/estimates/actions.ts` (new function)

```typescript
export async function unlinkEstimateRowItem(input: {
  rowId: string;
  expectedRowRevision: number;
  unlinkReason?: string;
}) {
  // Verify user is authenticated workspace member
  const { workspaceId } = await requireCurrentWorkspace();
  
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc(
    'unlink_estimate_row_item_from_library',
    {
      p_row_id: input.rowId,
      p_expected_row_revision: input.expectedRowRevision,
      p_unlink_reason: input.unlinkReason ?? null,
    }
  ).single();

  if (error) throw error;
  
  revalidatePath('/workshop/projects/[projectId]/estimates/[nodeId]');
  return data;
}
```

### Client-Side Mutation Hook

**File:** `src/hooks/use-estimate-row-mutations.ts` (add new mutation):

```typescript
const unlinkMutation = useMutation({
  mutationFn: unlinkEstimateRowItem,
  onMutate: async ({ rowId }) => {
    // Optimistic: update row in query cache to detached state
    await queryClient.cancelQueries({ queryKey: estimateQueryKeys.areaTree(estimateId) });
    const previousTree = queryClient.getQueryData(estimateQueryKeys.areaTree(estimateId));
    
    queryClient.setQueryData(estimateQueryKeys.areaTree(estimateId), (old) => {
      // Traverse tree to find and update the row
      return updateRowInTree(old, rowId, {
        sourceLibraryItemId: null,
        linkState: 'detached',
        sourceSnapshot: {
          ...row.sourceSnapshot,
          unlinkedAt: new Date().toISOString(),
        },
      });
    });
    
    return { previousTree };
  },
  onError: (_err, _vars, context) => {
    // Rollback
    if (context?.previousTree) {
      queryClient.setQueryData(estimateQueryKeys.areaTree(estimateId), context.previousTree);
    }
    toast.error('Failed to unlink component');
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: estimateQueryKeys.areaTree(estimateId) });
  },
  onSuccess: () => {
    toast.success('Component unlinked — now project-specific');
  },
});
```

## UI Proposal

### 1. Row Link-State Badge

Add a visible badge next to or on each row in the estimate sheet, showing link state:

| link_state | Badge text | Badge style |
|-----------|-----------|-------------|
| `linked-clean` | "Linked to library" | Subtle chip, `text-tertiary` |
| `linked-overridden` | "Linked, edited" | Warning chip, `text-warning` |
| `detached` | "Project-specific" | Success chip, `text-success` |
| `unlinked` | (no badge) | — |

**Location:** `src/components/workshop/EstimateSheetContent.tsx` — add a small badge in the component cell (next to material name) or as a separate column.

### 2. "Make Project-Specific" Action

**Location:** Row action menu (the 3-dot action that opens Row Details modal). Add a new action:

```
┌─────────────────────────┐
│  Row item details   →   │
│  Make project-specific   │  ← NEW
│  Replace component   →   │
│  Delete row              │
└─────────────────────────┘
```

**Condition:** Only shown when `link_state` is `"linked-clean"` or `"linked-overridden"`. Hidden (or disabled with tooltip) for `"detached"` and `"unlinked"`.

### 3. Confirmation Dialog

Before executing unlink, show a confirmation modal:

> **Make this component project-specific?**
> 
> This creates a project-specific copy of "{component name}". Future edits to this row will not affect the library component, and library updates will not change this estimate row.
> 
> [Cancel]  [Make project-specific]

### 4. Row Inspector — Editable Fields for Project-Specific Rows

**Current state:** Row Details modal is entirely read-only.

**New behavior for `detached` rows:**
The Component tab becomes editable for these fields:
- **material/name** — text input
- **description** — text input
- **supplier text** — text input
- **unit** — text input (searchable picker from known units)
- **unit cost** — numeric input
- **notes** — text input

Optional (if low risk):
- category (via category taxonomy picker)
- brand text
- pricing source / pricing date / pricing confidence

These edits must mutate ONLY `estimate_row_items` — never `cost_library_items` or price option tables.

**Server action:** New or extended `updateEstimateRowItemComponentFields` — separate from scalar edit path to avoid accidental library mutation:

```typescript
export async function updateProjectSpecificRowComponent(input: {
  rowId: string;
  expectedRowRevision: number;
  material?: string;
  description?: string;
  supplier?: string;
  unit?: string;
  unitCost?: number;
  notes?: string;
}) {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc(
    'update_project_specific_row_component',
    {
      p_row_id: input.rowId,
      p_expected_row_revision: input.expectedRowRevision,
      p_material: input.material,
      p_description: input.description,
      p_supplier: input.supplier,
      p_unit: input.unit,
      p_unit_cost: input.unitCost,
      p_notes: input.notes,
    }
  ).single();
  
  if (error) throw error;
  
  revalidatePath('/workshop/projects/[projectId]/estimates/[nodeId]');
  return data;
}
```

**RPC guard:** The RPC must verify `link_state = 'detached'` before allowing component field edits. Rows with `linked-clean` or `linked-overridden` should be rejected — users must unlink first.

## Activity / History Event

**Event type:** `row_unlinked_from_library`

**Rendered in Activity tab:**
> "{actor}" unlinked "{material}" from library component. [Timestamp]

**Metadata stored:**
- `unlinkedLibraryItemId` — the library component that was unlinked
- `unlinkReason` — optional reason text

## Export Behavior

The Excel export must use the row's current values regardless of link state:
- **linked-clean / linked-overridden:** Use row values (which may match library values)
- **detached:** Use row values (project-specific, may differ from library)
- **unlinked:** Use row values (manual)

No special handling needed — the export already reads `estimate_row_items` directly. The values are always the row's own values, not library values.

## Test Plan

### Vitest (Unit)

1. **RPC tests:**
   - `unlink_estimate_row_item_from_library` succeeds for linked-clean row
   - `unlink_estimate_row_item_from_library` succeeds for linked-overridden row
   - `unlink_estimate_row_item_from_library` fails for unlinked row
   - `unlink_estimate_row_item_from_library` fails for already-detached row (idempotency)
   - `unlink_estimate_row_item_from_library` fails on row revision conflict
   - Unlink clears `source_library_item_id`
   - Unlink sets `link_state = 'detached'`
   - Unlink preserves `source_snapshot` with unlink metadata appended
   - Unlink writes `row_unlinked_from_library` history event
   - `update_project_specific_row_component` succeeds for detached row
   - `update_project_specific_row_component` fails for linked-clean row (must unlink first)
   - `update_project_specific_row_component` fails for linked-overridden row
   - Editing detached row component fields does NOT mutate `cost_library_items`
   - Editing master library component after detach does NOT change detached row

2. **UI tests:**
   - "Linked to library" badge renders for linked-clean rows
   - "Linked, edited" badge renders for linked-overridden rows
   - "Project-specific" badge renders for detached rows
   - No badge for unlinked rows
   - "Make project-specific" action visible for linked rows
   - "Make project-specific" action hidden for detached/unlinked rows
   - Confirmation dialog renders with correct component name
   - Row inspector Component tab is editable for detached rows
   - Row inspector Component tab is read-only for linked rows

3. **Hook tests:**
   - `useUnlinkRowMutation` optimistically updates cache
   - `useUnlinkRowMutation` rolls back on failure
   - `useUnlinkRowMutation` shows success toast
   - `useUnlinkRowMutation` shows error toast on failure

### E2E (Playwright)

4. **Full workflow:**
   - Insert library component → verify linked-clean badge → unlink → verify detached badge → edit component fields → verify library unchanged → export → verify export values

## Edge Cases

| Case | Behavior |
|------|----------|
| Unlink a row that's already unlinked | Show disabled action or tooltip: "Already project-specific" |
| Unlink a manual (never-linked) row | Action hidden (not applicable) |
| Unlink while another user edits the row | Row revision conflict → rollback with error toast |
| Unlink then try to "re-link" | Not supported in MVP. User must replace component via drag |
| Row with `source-changed` state | Treat same as linked-overridden (can unlink) |
| Export after unlink | Uses current row values, not library |
| Activity feed | Shows unlink event with actor, component name, timestamp |
| Duplicate estimate with detached rows | Attached rows stay detached in copy (no re-link) |
| Template insertion with project-specific components | Templates copy snapshot, inserted rows are linked-clean (not detached) |

## Migration Strategy

1. **No new schema migration needed.** `link_state = 'detached'` already exists in the enum.
2. Create new migration for the RPC function `unlink_estimate_row_item_from_library`.
3. Add `row_unlinked_from_library` to `estimate_sheet_event_type` enum if not already present.
4. Apply to linked Supabase, verify, repair migration history.

## Rollback Strategy

- RPC is read-only except for the row update. Rollback = drop the RPC function.
- UI changes are additive (new badge, new action, new modal). Rollback = remove the code.
- No data migration needed — existing rows stay as-is.

## Acceptance Criteria

- [ ] Linked row (linked-clean) can be unlinked to become project-specific (detached)
- [ ] Linked row (linked-overridden) can be unlinked to become project-specific
- [ ] Unlinked row clears `source_library_item_id`
- [ ] Unlinked row sets `link_state = 'detached'`
- [ ] Unlinked row preserves `source_snapshot` with unlink metadata
- [ ] Editing detached row component fields does NOT mutate `cost_library_items`
- [ ] Editing master library component after detach does NOT change detached row
- [ ] Export uses detached row values, not library values
- [ ] Activity/history shows `row_unlinked_from_library` event
- [ ] "Linked to library" badge renders for linked-clean
- [ ] "Linked, edited" badge renders for linked-overridden
- [ ] "Project-specific" badge renders for detached
- [ ] "Make project-specific" action visible with confirmation dialog
- [ ] Row inspector editable for detached rows, read-only for linked rows
- [ ] Already detached rows don't show redundant unlink action
- [ ] Already unlinked (never-linked) rows don't show unlink action

## Files to Touch

### New files
- `supabase/migrations/XXXXXX_unlink_estimate_row_item.sql` — RPC migration

### Modified files
- `src/lib/estimates/actions.ts` — add `unlinkEstimateRowItem`, `updateProjectSpecificRowComponent`
- `src/hooks/use-estimate-row-mutations.ts` — add unlink mutation, project-specific edit mutation
- `src/components/workshop/EstimateSheetContent.tsx` — add badges, unlink action, editable inspector
- `src/lib/supabase/types.ts` — update generated types (or manual extension)
- `tests/vitest/unlink-estimate-row.test.tsx` — new test file
- `tests/vitest/estimate-sheet-row-mutations.test.tsx` — add unlink tests

### Impact-analysis targets (run BEFORE editing)
- `updateEstimateRowItem` — all row writes
- `EstimateSheetContent` — central estimate surface
- `useEstimateRowMutations` — all row mutation hooks
- `estimate_row_items` — DB table
