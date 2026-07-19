# Plan 007: Add the `isLatestScopedRow` staleness guard to `insertMutation.onSuccess`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0a2667db9..HEAD -- src/hooks/use-estimate-row-mutations.ts`
> If it changed since this plan was written, compare "Current state" against
> the live code; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: correctness
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters

Every row mutation in `use-estimate-row-mutations.ts` (`update`, `replace`,
`delete`, `move`) guards its `onSuccess` with `isLatestScopedRow(input.rowId, context)`
to drop stale callbacks for superseded operations. `insertMutation.onSuccess`
(line 894) is the only one that doesn't — it unconditionally applies the server
patch to the tree and calls `finishScopedRowMutation`. On an insert-then-
immediately-replace sequence targeting a deterministic client row id, a stale
insert patch can overwrite newer state for one render and mark a superseded
operation as completed. This plan makes `insertMutation` consistent with its
siblings. Low-risk: the guard only suppresses a no-op patch on superseded
contexts; insert success semantics for the latest operation are unchanged.

## Current state

`src/hooks/use-estimate-row-mutations.ts:894-910` (`insertMutation.onSuccess`, verified):

```ts
onSuccess: (result, input, context) => {
  if (input.mutationId) duplicateInsertRevisionByMutationIdRef.current.delete(input.mutationId);
  markSaved();
  finishScopedRowMutation(context);
  const queryKey = estimateTabId ? estimateQueryKeys.tabTree(input.estimateId, estimateTabId) : estimateQueryKeys.areaTree(input.estimateId);
  if (result) {
    queryClient.setQueryData<EstimateTreeNode[]>(queryKey, (currentTree) =>
      currentTree
        ? patchEstimateRowItemInTree(currentTree, input.rowId, estimateRowMutationResultToPatch(result))
        : currentTree,
    );
  }
  input.onSuccess?.(result);
  invalidateProjectComponentProjectionCaches("insert_row_success", context?.operation ?? "insert_row", input.projectId);
  void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
  if (detailQueryKey) void queryClient.invalidateQueries({ queryKey: detailQueryKey, refetchType: "none" });
},
```

The sibling `replaceMutation.onSuccess` (line ~939-940, verified pattern) applies
the guard **after** `markSaved()` / `finishScopedRowMutation()`:

```ts
onSuccess: (result, input, context) => {
  markSaved();
  finishScopedRowMutation(context);
  if (!isLatestScopedRow(input.rowId, context)) return;   // <-- the guard
  // ... apply tree patch, invalidate ...
},
```

`isLatestScopedRow` is defined at line ~755: returns `true` if the context's
operation id is still the latest recorded for that rowId. Its purpose is to drop
stale callbacks.

The `duplicateInsertRevisionByMutationIdRef.current.delete(input.mutationId)`
line at the top of `insertMutation.onSuccess` is insert-specific cleanup — it
must run regardless of staleness (the duplicate-revision tracking should be
cleaned up either way), so it stays before the guard.

## Commands you will need

| Purpose   | Command                | Expected on success |
|-----------|------------------------|---------------------|
| Install   | `bun install`          | exit 0              |
| Typecheck | `bun run type-check`   | exit 0              |
| Tests     | `bun run test:dom`     | all pass            |

## Scope

**In scope** (the only file you should modify):
- `src/hooks/use-estimate-row-mutations.ts` — add the guard to
  `insertMutation.onSuccess`.

**Out of scope**:
- The other four mutations — they already have the guard.
- `isLatestScopedRow` definition, `beginScopedRowMutation` /
  `finishScopedRowMutation`, or the duplicate-revision ref logic — unchanged.
- Any change to the server action `insertEstimateRowItemFromLibrary`.

## Git workflow

- Branch: `advisor/007-insert-staleness-guard`.
- Commit message: `fix(estimate-sheet): drop stale insert patches via isLatestScopedRow`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Reorder `insertMutation.onSuccess` to match `replaceMutation`

Edit `src/hooks/use-estimate-row-mutations.ts` so `insertMutation.onSuccess`
becomes:

```ts
onSuccess: (result: UpdateEstimateRowItemResult | undefined, input, context) => {
  if (input.mutationId) duplicateInsertRevisionByMutationIdRef.current.delete(input.mutationId);
  markSaved();
  finishScopedRowMutation(context);
  if (!isLatestScopedRow(input.rowId, context)) return;
  const queryKey = estimateTabId ? estimateQueryKeys.tabTree(input.estimateId, estimateTabId) : estimateQueryKeys.areaTree(input.estimateId);
  if (result) {
    queryClient.setQueryData<EstimateTreeNode[]>(queryKey, (currentTree) =>
      currentTree
        ? patchEstimateRowItemInTree(currentTree, input.rowId, estimateRowMutationResultToPatch(result))
        : currentTree,
    );
  }
  input.onSuccess?.(result);
  invalidateProjectComponentProjectionCaches("insert_row_success", context?.operation ?? "insert_row", input.projectId);
  void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
  if (detailQueryKey) void queryClient.invalidateQueries({ queryKey: detailQueryKey, refetchType: "none" });
},
```

The only structural change is inserting `if (!isLatestScopedRow(input.rowId, context)) return;`
between `finishScopedRowMutation(context);` and the `queryKey` / patch logic.
The duplicate-revision ref delete stays first (runs regardless of staleness).

**Verify**: `bun run type-check` → exit 0.

### Step 2: Run the estimate-sheet test suite

**Verify**: `bun run test:dom` → all pass. If a test specifically exercises a
stale insert callback and asserts the stale patch IS applied (contradicting the
new guard), update that test to reflect the corrected behavior — do not remove
the guard.

## Test plan

No new tests required (consistency fix). If the user authorized tests (TEST_TASK),
add a vitest case that fires two inserts against the same deterministic rowId in
rapid succession and asserts that only the latest insert's patch is applied to
the tree. Model on `tests/vitest/estimate-sheet-*.test.tsx` (the existing
`use-estimate-row-mutations` coverage).

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run test:dom` exits 0
- [ ] `grep -A2 "finishScopedRowMutation(context);" src/hooks/use-estimate-row-mutations.ts`
      shows the `isLatestScopedRow` guard immediately after it in the
      `insertMutation` block
- [ ] No files outside the in-scope list are modified
- [ ] `README.md` status row updated to DONE

## STOP conditions

- Drift in `use-estimate-row-mutations.ts` (the line numbers or surrounding
  logic no longer match).
- The `replaceMutation` guard ordering has changed such that the "finish then
  guard" pattern no longer holds — re-derive the correct order before proceeding.
- A test asserts stale-insert patches are applied and cannot be reasonably
  updated.

## Maintenance notes

- All five row mutations now share the same staleness-guard contract. If a sixth
  mutation is added, it must follow the same pattern.
- Reviewer: confirm the duplicate-revision ref delete still runs before the
  guard (it must, to avoid leaking the ref entry on superseded inserts), and
  that `markSaved()` / `finishScopedRowMutation()` still run before the early
  return (so the saving-state UI clears correctly even on dropped stale patches).
