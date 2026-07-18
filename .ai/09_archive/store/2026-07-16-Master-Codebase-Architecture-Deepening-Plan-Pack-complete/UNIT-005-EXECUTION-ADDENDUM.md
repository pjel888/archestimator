# UNIT-005 Execution Addendum

This addendum is the current execution source for `UNIT-005`, `AC-005`, and `TEST-005`. It adds one exact fixture-maintenance path discovered by the fresh gate run. Where this addendum conflicts with the `UNIT-005` owned-path or test-source wording in `IMPLEMENTATION_PLAN.md`, this addendum controls; the component/folder extraction contract and all frozen receipts remain unchanged.

## Verified preflight finding

The first fresh `TEST-005` run passed seven of eight files and 51 of 53 assertions. Both failures occurred during `seedDatabase()` in `tests/vitest/component-library-update-atomicity.test.ts`, before an action or extracted D1 function executed. The file is unchanged from `HEAD`; it applies committed migration `0086_component_category_folder_enforcement.sql`, whose insert trigger rejects a `cost_library_items` row without a workspace-owned `library_folder_id`.

## Exact additional owned path

- `tests/vitest/component-library-update-atomicity.test.ts` (fixture seed maintenance only)

## Authorized fixture repair

1. Add one stable folder fixture ID.
2. Seed a workspace-owned default category folder after the workspace and before the component.
3. Add `library_folder_id` to the seeded component and bind that folder ID.
4. Do not change product code, migration code, test names, behavior assertions, injected failure location, or expected atomicity/replay results.

## AC-005

The original criterion is unchanged: the two concrete modules own the moved statement graphs, actions retain their public boundary responsibilities, and atomic write/fanout/archive/permanent-delete/revalidation behavior remains proven.

## TEST-005

Run the exact original eight-file command after the fixture repair:

```sh
bunx vitest run tests/vitest/component-library-update-atomicity.test.ts tests/vitest/component-library-folder-actions.test.ts tests/vitest/component-library-actions-revalidation.test.ts tests/vitest/component-library-d1-bind-budget.test.ts tests/vitest/component-permanent-delete-action.test.ts tests/vitest/component-library-versioning-schema.test.ts tests/vitest/component-library-cost-governance-actions.test.ts tests/vitest/mass-deletion-action-contract.test.ts
```

The gate passes only at eight files and 53 assertions passing, followed by fresh type-check, scoped lint, residue, and diff checks.
