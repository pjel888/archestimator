# 00 — Two-Node Estimate Tree Domain Decision

Decision date: 2026-05-20
Decision owner: Philip
Status: active requirement for the drag/drop reorganization implementation plan

## Decision

The estimate tree has exactly two technical node kinds:

1. `group`
2. `area`

Do not encode domain shape as technical node kinds. Names such as Lot, General Requirements, House, Ground Floor, Roof, Trade, Phase, or any future organizing label are user/UX content on a `group` node, not separate storage kinds.

## Node semantics

### Group Node

Purpose:

- Organizes the estimate tree.
- May contain other Group Nodes.
- May contain Area Nodes.
- Must not own `EstimateRowItem` records.

Technical shape:

```ts
type EstimateNodeKind = "group" | "area";
```

React Complex Tree mapping:

- `isFolder: true`
- `children: child node ids`
- folder icon / group visual treatment

### Area Node

Purpose:

- Owns `EstimateRowItem` records.
- Represents the leaf location where estimate rows live.
- Must not contain child nodes.

React Complex Tree mapping:

- `isFolder: false` or omitted
- `children: undefined`
- row/area icon visual treatment

## Root rule

The persisted tree still has no real root node; React Complex Tree uses a synthetic root item.

Preserve the current invariant unless Philip explicitly changes it later:

- synthetic root may contain Group Nodes;
- synthetic root must not contain Area Nodes.

Reason: this keeps every row-owning Area Node inside an organizing context and matches the existing `canNestEstimateNodeKind(area, null) === false` behavior.

If product later wants top-level Area Nodes, that is a separate hierarchy decision and must update TypeScript, SQL constraints, tests, and Playwright acceptance criteria together.

## Current codebase mismatch that must be resolved before DnD

The current code is partially simplified in UI copy but not technically simplified yet.

Exact findings from the live repo:

- `src/lib/estimates/tree-hierarchy.ts` still defines `EstimateTreeNodeKind = "group" | "lot" | "general" | "structure" | "level" | "area"` and maps every non-area value to display kind `group`.
- `src/lib/domain/estimate-tree.ts` still defines `EstimateNodeKind = "lot" | "general" | "structure" | "level" | "area" | "group" | "assembly"`.
- `src/components/workshop/estimate-tree-data.ts` still types `EstimateAreaNode.kind` as `"group" | "lot" | "general" | "structure" | "level" | "area"` and the sample tree still uses `lot`, `general`, `structure`, and `level`. The `EstimateAreaNode` type name is now semantically stale because it represents both Group Nodes and Area Nodes; implementation should rename it or introduce a clearer alias when updating the model.
- `src/lib/repositories/workspace-repository.ts` currently excludes `group` in `isDisplayNodeKind`, which is incorrect for the new two-kind model and already incorrect for current seed data.
- `src/lib/supabase/types.ts` still has generated enum values `lot`, `general`, `structure`, `level`, `area`, `group`, and `assembly` for `estimate_node_kind`.
- `supabase/migrations/20260519192045_atomic_estimate_node_moves.sql` validates legacy group-like kinds in SQL.
- `tests/vitest/estimate-tree-data.test.ts` and `tests/vitest/supabase-performance-migrations.test.ts` currently assert the legacy compatibility matrix.

## Required technical simplification before drag/drop

Before enabling React Complex Tree drag/drop, the implementation must first make the technical model truly two-kind:

1. Collapse TypeScript unions to `"group" | "area"`.
2. Convert sample/static tree data to use only `group` and `area`.
3. Ensure repository tree build accepts only `group` and `area`, and does not filter out `group`.
4. Update add-node form/action so the only create choices are `group` and `area`; any old `general` alias must be removed unless kept as a temporary form-input compatibility shim.
5. Add a Supabase migration that normalizes any existing `lot`, `general`, `structure`, `level`, or `assembly` estimate nodes to `group` before narrowing/enforcing the active domain.
6. Update SQL hierarchy validation so it allows only:
   - root -> group;
   - group -> group;
   - group -> area;
   - area -> no children.
7. Regenerate/update Supabase types after the database enum/function changes.
8. Update tests so no test expects `lot`, `general`, `structure`, `level`, or `assembly` as active estimate node kinds.

## Database migration note

PostgreSQL enum values cannot be removed with a simple `ALTER TYPE ... DROP VALUE` in the same way values are added. The safe migration path is:

1. Update existing rows with legacy estimate node kinds to `group`.
2. Drop or update dependent functions/triggers that reference the old enum values.
3. Create a replacement enum with only `group` and `area` or add a strict database check/domain if the enum cannot be narrowed in the current migration window.
4. Alter `estimate_nodes.kind` through a text cast to the replacement enum, then rename types if needed.
5. Recreate hierarchy and row-item triggers against the two-kind matrix.
6. Re-run migration alignment tests and regenerate `src/lib/supabase/types.ts`.

If the team decides not to narrow the physical enum immediately, the code must still reject legacy values on create/move and SQL must enforce a `kind in ('group', 'area')` constraint. That is a temporary compatibility compromise, not the final desired model.

## Impact evidence

Fresh GitNexus checks on 2026-05-20 show:

- `canNestEstimateNodeKind`: HIGH upstream risk, 5 impacted nodes, direct callers include `createEstimateNode`, `getDefaultNodeKind`, and `validParentOptions`; affected processes include `createEstimateNode`, `ProjectEstimateNodePage`, and `EstimateSheetTree`.
- `isEstimateGroupNodeKind`: LOW upstream risk but broad UI use inside `EstimateSheetTree` and `EstimateSheetContent` via `getEstimateNodeDisplayKind` and folder rendering.
- `buildEstimateTree`: LOW graph risk, direct callers are `getProjectEstimateTreeByEstimate` and `getProjectEstimateTreeByNode`, but functionally critical because it decides what tree nodes are visible.

Conclusion: the domain simplification is a prerequisite high-risk slice and should be implemented/tested before any DnD UI work.
