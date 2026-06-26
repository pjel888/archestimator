---
title: MOP-3 Tree Integrity Evidence
type: evidence
date: 2026-06-25
status: active
---

# MOP-3 Tree Integrity Evidence

## Scope

Implemented the local tree security and reconciliation slice:

- Added app-level `can_edit_estimate` enforcement before tree write RPCs for
  reorder, create, rename, single delete, and bulk delete server actions.
- Added a local forward migration that hardens
  `rename_estimate_node_with_history` to use
  `assert_can_edit_estimate_for_history`.
- Replaced action-computed final delete metadata with RPC-consumed
  `deletedNodeIds` and `fallbackNodeId`, with local fallbacks for older
  returned payloads.
- Added a local forward migration that makes single and bulk tree delete RPCs
  return authoritative deleted-node and fallback metadata.
- Changed `getEstimateTreeContentSignature` to structure-only semantics: path,
  kind, name, and child order affect the signature; row-only totals/items do
  not.
- Kept the existing stepped integer reorder payload scheme for now. No hosted
  numeric/sparse migration was attempted while linked migration drift remains
  unresolved.

No hosted Supabase migration, provider setting change, production deploy,
browser automation, paid add-on, or destructive hosted data operation was used.

## RED Evidence

Command:

```bash
bun x vitest run tests/vitest/estimate-tree-reorder.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts tests/vitest/estimate-node-reorder-action.test.ts --maxWorkers=1
```

Result before implementation: failed as expected.

- `getEstimateTreeContentSignature` changed when only row-item fields and node
  totals changed.
- Tree mutation actions did not deny a viewer at the app-level
  `can_edit_estimate` guard before reaching tree write paths.

## GREEN Evidence

Commands after implementation:

```bash
bun x vitest run tests/vitest/estimate-tree-reorder.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts tests/vitest/estimate-node-reorder-action.test.ts tests/vitest/estimate-sheet-version-control-schema.test.ts --maxWorkers=1
bun x vitest run tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-tree-context-menu.test.tsx tests/vitest/estimate-tree-bulk-selection.test.tsx tests/vitest/estimate-tree-refetch-on-mount.test.tsx --maxWorkers=1
bun x vitest run tests/vitest/security-findings-auth-contracts.test.ts tests/vitest/estimate-sheet-version-control-actions.test.ts --maxWorkers=1
bun x vitest run tests/vitest/share-no-store-invariants.test.ts tests/vitest/shared-link-header-smoke-script.test.ts tests/vitest/share-estimate-tree-panel-a11y.test.tsx --maxWorkers=1
bun run type-check
git diff --check
```

Results:

- Focused MOP-3 schema/action/signature tests: passed, 4 files / 64 tests.
- Adjacent tree UI race/regression tests: passed, 4 files / 49 tests.
- Security/action regression tests: passed, 2 files / 43 tests.
- Share/cache/a11y regression tests: passed, 3 files / 19 tests.
- Type-check: passed.
- `git diff --check`: passed.

Vitest emitted the known Node `module.register()` deprecation warning; no test
failed on that warning.

## Follow-Up Boundaries

- The new tree migration is local only until the linked Supabase migration drift
  recorded in MOP-0 is reconciled.
- A numeric/sparse tree sort-order migration was intentionally not attempted in
  this slice because hosted drift makes broad linked DDL unsafe.
- Shared custom-event parser, malformed event telemetry, trust-gate recents,
  disabled-reason UI, and keyboard move alternatives remain MOP-4/MOP-5 work.
