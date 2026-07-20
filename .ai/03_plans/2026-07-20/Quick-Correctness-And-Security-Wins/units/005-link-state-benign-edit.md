# UNIT-005 — Stop flipping link state to linked-overridden on benign edits

## Goal

Stop silently downgrading a library-linked estimate row's `linkState` from
`linked-clean` to `linked-overridden` when the user edits a non-library-derived
field (quantity, description, etc.). The downgrade should fire only when the
patch actually changes a library-derived field.

## Status

`READY` · depends on: (none) · requirement: `DATA-001` · risks: `RISK-002`

## Why this matters

Today, any edit to a library-sourced row that does not explicitly pass
`linkState` gets `linked-overridden` silently applied. This (a) misleads
operators about which rows still auto-update when the library component version
bumps, (b) causes library-sync reconciliation to treat the row as diverged and
skip or warn on future syncs, and (c) corrupts link-state analytics. The user
is never told. Library-sync integrity depends on this flag being accurate.

## Current state

File: `src/lib/estimates/actions.ts`, function `updateEstimateRowItem`
(~line 2735). The patch is built at lines 2783–2803:

```ts
const rowPatch = {
  ...(material !== undefined ? { material } : {}),
  ...(description !== undefined ? { description } : {}),
  ...(supplier !== undefined ? { supplier } : {}),
  ...(unit !== undefined ? { unit } : {}),
  ...(unitCost !== undefined ? { unitCost } : {}),
  ...(normalizedPriceOptionLabel !== undefined ? { priceOptionLabel: normalizedPriceOptionLabel } : {}),
  ...(categoryNodeId !== undefined ? { categoryNodeId } : {}),
  ...(supplierId !== undefined ? { supplierId } : {}),
  ...(quantity !== undefined ? { quantity } : {}),
  ...(quantityBase !== undefined ? { quantityBase } : {}),
  ...(quantityContingencyAmount !== undefined ? { quantityContingencyAmount } : {}),
  ...(contingencyPercentage !== undefined ? { contingencyPercentage } : {}),
  ...(adjustmentPercentage !== undefined ? { adjustmentPercentage } : {}),
  ...(miscCost !== undefined ? { miscCost } : {}),
  ...(sourceSnapshotPatch !== undefined ? { sourceSnapshot: sourceSnapshotPatch } : {}),
  ...(metadata !== undefined ? { metadata } : {}),
  ...(sourceLibraryItemId !== undefined ? { sourceLibraryItemId } : {}),
  ...(linkState !== undefined ? { linkState } : {}),
  ...(row.source_library_item_id && linkState === undefined ? { linkState: "linked-overridden" } : {}),  // line 2802 — THE BUG
};
```

The lower-level `normalizeEstimateRowSourceLinkState` at
`src/lib/estimates/d1-intents/rows.ts:1666-1678` passes `linkState` through
unchanged, so the action layer is the right place to fix the rule.

## Library-derived vs user-local field set

The library sync reconciles on a specific field set (see
`src/lib/component-library/component-mutation-d1.ts` and
`src/lib/component-library/template-linked-mutation-d1.ts`). The
**library-derived** fields — the ones whose change legitimately marks a row as
diverged from its source — are:

- `material`
- `unit`
- `unitCost` (and its `priceOptionLabel`)
- `miscCost` (when sourced from the library)
- `sourceLibraryItemId` (changing the link itself)
- `sourceSnapshot` (the cached library snapshot)

The **user-local** fields — edits to which must NOT flip link state — are:

- `quantity`, `quantityBase`, `quantityContingencyAmount`
- `contingencyPercentage`, `adjustmentPercentage`
- `description`, `supplier`, `supplierId`, `categoryNodeId`
- `metadata`

Confirm the field classification against
`src/lib/component-library/component-mutation-d1.ts` before finalizing — the
authoritative source is whichever fields the library-sync reconciler compares.

## Owned paths / resources

- `src/lib/estimates/actions.ts` — the only file to edit (the `updateEstimateRowItem`
  patch builder).

## Implementation boundary

1. Confirm the file matches the excerpt above (reread lines 2783–2803 before edit).
2. Define the library-derived field set as a local constant at the top of the
   function (or just above it), e.g.:

   ```ts
   const LIBRARY_DERIVED_ROW_FIELDS = [
     "material", "unit", "unitCost", "priceOptionLabel", "miscCost",
     "sourceLibraryItemId", "sourceSnapshot",
   ] as const;
   ```

3. Replace the unconditional flip on line 2802 with a conditional that checks
   whether any library-derived field is actually present in the patch:

   ```ts
   const patchTouchesLibraryDerivedField =
     row.source_library_item_id
     && linkState === undefined
     && LIBRARY_DERIVED_ROW_FIELDS.some((field) => (rowPatch as Record<string, unknown>)[field] !== undefined);
   ...(patchTouchesLibraryDerivedField ? { linkState: "linked-overridden" } : {}),
   ```

   Note the `rowPatch` reference: the library-derived check must run **after**
   the rest of `rowPatch` is assembled, so restructure so this spread is last
   (it already is) and the boolean is computed just before it.

4. Do **not** touch the explicit `linkState` passthrough on the line above
   (line 2801) — when the caller explicitly passes `linkState`, it is
   authoritative.

## Commands you will need

| Purpose    | Command              | Expected on success |
|------------|----------------------|---------------------|
| Type-check | `bun run type-check` | exit 0, no errors   |
| Lint       | `bun run lint`       | exit 0              |

## Scope

**In scope:** `src/lib/estimates/actions.ts` only.

**Out of scope:**
- `src/lib/estimates/d1-intents/rows.ts:1666-1678`
  (`normalizeEstimateRowSourceLinkState`) — it passes through correctly.
- The library-sync reconciler itself — it continues to treat explicit
  `linkState` patches and version-bump-driven syncs authoritatively.
- Other action functions (`replaceEstimateRowItemWithLibrary`, etc.) — they
  explicitly set `linkState` and are correct.
- Tests (gate is `NOT_REQUIRED`).

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run lint` exits 0
- [ ] `LIBRARY_DERIVED_ROW_FIELDS` constant defined
- [ ] A patch containing only `{ quantity: 5 }` on a library-sourced row does
      NOT add `linkState: "linked-overridden"` (read the assembled patch)
- [ ] A patch containing `{ unitCost: 10 }` on a library-sourced row DOES add
      `linkState: "linked-overridden"`
- [ ] An explicit `linkState` in the input still wins
- [ ] No files outside `src/lib/estimates/actions.ts` are modified

## Acceptance evidence

- Read the restructured patch builder and confirm the boolean logic.
- `git diff src/lib/estimates/actions.ts` shows the constant added and line 2802
  replaced; the explicit-linkState passthrough preserved.

## STOP conditions

- The library-derived field set in `component-mutation-d1.ts` differs materially
  from the list above. If reconciling the lists reveals a different
  classification (e.g. `supplier` is library-derived), update
  `LIBRARY_DERIVED_ROW_FIELDS` to match — the source of truth is the reconciler.
- The `rowPatch` object's keys do not match the action-parameter names (e.g.
  `unit_cost` vs `unitCost`). The patch uses camelCase as shown in the excerpt;
  confirm before keying into it.

## Recovery

The fix is one boolean and one conditional spread. If type-check fails, it is
almost certainly the `rowPatch as Record<string, unknown>` cast — adjust to read
the fields directly if the types allow.

## Maintenance notes

- **RISK-002:** this changes a data-model invariant. Library-sync reconciliation
  continues to work because it compares the row's current fields against the
  library version; the link-state flag is a cached hint, not the source of
  truth. A reviewer should confirm the reconciler does not exclusively gate on
  `linkState === "linked-overridden"`.
- If a new library-derived field is added to the row model in the future, add it
  to `LIBRARY_DERIVED_ROW_FIELDS` — this is the single maintenance touchpoint.
- Pack D (integrity unification) will refactor around this area; the
  `LIBRARY_DERIVED_ROW_FIELDS` constant should be hoisted into the shared
  intent-primitive layer when that lands.
