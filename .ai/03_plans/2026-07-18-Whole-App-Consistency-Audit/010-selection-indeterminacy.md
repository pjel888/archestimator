# Unit 010 — `getSelectionState` Hides Partial Selection Under A Selected Parent (MEDIUM)

**Finding:** F-10 · **Severity:** MEDIUM · **Priority:** P3 · **Effort:** S · **Risk:** LOW
**Requirement:** `REQ-010` (item) · **Status:** TODO · **Depends on:** — · **Test:** NOT_REQUIRED

## Problem

When a node is itself selectable and in `selectedIds`, `getSelectionState`
short-circuits to `{ checked: true, indeterminate: false }` without inspecting
descendants. If a user deselects a leaf under a selected parent (where the parent
is also independently selectable), the parent still renders fully checked, hiding
the partial state.

## Evidence

`src/lib/bulk-selection/tree-selection.ts:61-77`:
```ts
export function getSelectionState(nodes, selectedIds, nodeId) {
  const node = findNode(nodes, nodeId);
  if (!node) return { checked: false, indeterminate: false };
  if (isSelectable(node) && selectedIds.has(node.id)) return { checked: true, indeterminate: false }; // ← short-circuit
  const ids = selectableIdsForSubtree(node, { includeRoot: false });
  ...
}
```

## Fix Direction

When the node is selected, still check whether any descendant selectable id is NOT
in `selectedIds`; if so, return indeterminate instead of fully checked:

```ts
if (isSelectable(node) && selectedIds.has(node.id)) {
  const descendantIds = selectableIdsForSubtree(node, { includeRoot: false });
  const unselected = descendantIds.filter((id) => !selectedIds.has(id.id ?? id));
  if (unselected.length > 0) return { checked: false, indeterminate: true };
  return { checked: true, indeterminate: false };
}
```

(Adapt to the actual id-accessor shape of `selectableIdsForSubtree`.)

### Owned paths
- `src/lib/bulk-selection/tree-selection.ts`

### Prohibited
- Do not change the selection set itself — this is read-only state derivation.
- Preserve the existing `toggleCascadeSelection` ancestor-cleanup behavior (audit
  confirmed it is correct).

## Acceptance Evidence

- `AC-001`: a selected parent with one deselected selectable leaf renders
  `indeterminate: true`.

## Recovery

None needed.
