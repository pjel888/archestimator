# MOP-6 Continuation Slice 6 — Numeric Estimate Tree Sort Order

Date: 2026-06-25

## Scope

- Source IDs: tree `F-04`, `M-02`, `M-03`; requirement `ESO-DATA-05`.
- Files changed:
  - `supabase/migrations/20260625221500_estimate_nodes_numeric_sort_order.sql`
  - `src/lib/estimates/estimate-tree-reorder.ts`
  - `src/lib/estimates/actions.ts`
  - `src/lib/estimates/types.ts`
  - `src/lib/repositories/workspace-repository.ts`
  - `src/lib/ai/package-builder/schemas.ts`
  - focused Vitest coverage for reorder planning, action payloads,
    repository mapping, and migration contract.

## Implemented

- Converted `estimate_nodes.sort_order` to `numeric(20,4)` in migration
  `20260625221500`.
- Preserved the tab-aware unique sort constraints and parent/sort indexes.
- Rewrote active estimate-node RPC sort-order contracts from integer to
  numeric and removed the old integer create-node overload.
- Made sparse reorder planning preserve persisted numeric sort values and emit
  a single midpoint update when adjacent persisted sort values have enough gap.
- Kept fallback full-sibling renumbering for untrusted or missing persisted sort
  values.
- Added package-builder and repository parsing support for non-integer
  sort-order values.

## Provider Evidence

- Linked project: Archestimator Supabase project `ebxxqidacheyapmmzavr`.
- Broad `supabase db push` was not used because unrelated hosted
  migration-history drift remains.
- `supabase db dump --linked --schema public --data-only --use-copy` was
  attempted first and failed because Docker is not running in this shell.
- Scoped backup captured before provider mutation:
  `/tmp/archestimator-estimate-nodes-before-numeric-sort-order-20260625.json`
  (53 KB). The backup contains `estimate_nodes` rows and touched RPC
  definitions; it is intentionally outside the repo.
- Provider preflight before apply showed:
  - column type `integer`
  - 5 rows
  - min sort order 10, max 40
  - 0 rows below 10
  - 0 non-multiple-of-10 values
  - no duplicate sibling sort slots
  - tab-aware unique constraints and sort indexes present.
- Transactional rollback dry run passed:
  `supabase db query --linked --file /tmp/archestimator-numeric-sort-order-dry-run-rollback.sql`.
- Scoped provider apply passed:
  `supabase db query --linked --file /tmp/archestimator-numeric-sort-order-apply.sql`.
- Migration history repair passed:
  `supabase migration repair --linked --status applied 20260625221500`.
- Provider readback after apply showed:
  - `estimate_nodes.sort_order` is `numeric(20,4)` and non-null with default 0
  - 5 rows remain, min 10, max 40
  - no duplicate sibling sort slots
  - `estimate_nodes_tab_unique_sort` and
    `estimate_nodes_tab_unique_sort_with_root` are preserved and deferrable
  - `estimate_nodes_estimate_parent_sort_idx` and
    `estimate_nodes_tab_parent_sort_idx` are preserved
  - integer `create_estimate_node_with_history(... integer ...)` overload is
    absent
  - numeric `create_estimate_node_with_history(... numeric ...)` overload is
    present
  - `supabase_migrations.schema_migrations` contains `20260625221500`.

## Local Validation

- `bun x vitest run tests/vitest/estimate-tree-reorder.test.ts tests/vitest/estimate-node-reorder-action.test.ts tests/vitest/workspace-repository-estimate-tree.test.ts tests/vitest/estimate-node-sort-order-migration.test.ts --maxWorkers=1`
  - Passed: 4 files / 60 tests.
- `bun x vitest run tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-sheet-tree-dom.test.tsx tests/vitest/estimate-template-drop-zones.test.tsx tests/vitest/ai-package-builder-apply.test.ts --maxWorkers=1`
  - Passed as part of the final broader affected matrix.
- `bun run type-check`
  - Passed.
- Targeted ESLint on the changed estimate/tree/package-builder/repository files
  and focused tests passed.
- `git diff --check`
  - Passed.

## Remaining Risk

- The provider still has unrelated migration-list drift outside this numeric
  slice; use scoped SQL plus explicit history repair until that drift is
  reconciled.
- Local Supabase reset/apply proof could not run because Docker is unavailable
  in this shell.
