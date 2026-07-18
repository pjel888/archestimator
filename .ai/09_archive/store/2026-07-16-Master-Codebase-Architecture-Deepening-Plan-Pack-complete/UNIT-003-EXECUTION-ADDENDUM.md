# UNIT-003 Execution Addendum

This addendum is the current execution source for `UNIT-003`, `AC-003`, and `TEST-003`. It closes the exact export, cycle, subtree, and legacy-selection choices found during current-source preflight. Where this addendum conflicts with the UNIT-003 wording in `IMPLEMENTATION_PLAN.md`, this addendum controls; public repository signatures and all other unit contracts remain unchanged.

## Fixed extraction boundary

Create `src/lib/estimates/estimate-tree-read-repository.ts` and move the cohesive tab/node/row D1 read, normalization, load-limit, optional-adjustment, legacy-tree, subtree, batched-tree, tree-build, and tab-grouping implementation into it.

The module exports only:

- `buildEstimateTree`
- `groupEstimateTabTrees`
- `readEstimateTabsD1`
- `readDefaultEstimateTabD1`
- `readLegacyEstimateTreeD1`
- `readEstimateTabTreeD1`
- `readEstimateTabTreePayloadD1`
- `readEstimateNodeSubtreeD1`
- `readEstimateTreesForTabsD1`
- `isEstimateTabsSchemaMissing`
- the input/output/query-row types required by those operations and the focused pure consumers

Low-level tab/node/row query helpers stay private. `workspace-repository.ts` keeps every current public orchestration export/signature, `readEstimateForProject`, workspace/project lookup, D1 acquisition, current-user context, access/edit checks, route-context trace phases, project-scoped selected-node joins, cache clearing, and the fast route-context path.

## Cycle and behavior constraints

1. The new module must not import `workspace-repository.ts`, workspace/auth orchestration, `DatabaseTables`, or generated workspace table types.
2. It may import only the current D1, Estimate domain, tree/lazy, schema-compatibility, timing, image/source-option, and JSON utilities that do not reverse-import the workspace repository.
3. Recreate the narrow optional-table missing-schema predicate privately rather than importing the workspace-local helper. Export `isEstimateTabsSchemaMissing` because the legacy wrapper still requires that D1-level classifier.
4. `getEstimateNodeSubtree` and `getEstimateTreesForTabs` remain public wrappers; move only their post-authorization SQL/BFS/build bodies to the named D1 operations.
5. `readLegacyEstimateTreeD1` accepts the preferred node ID and computes legacy selection from fetched raw nodes before display-kind filtering, preserving current requested-node behavior.
6. Preserve columns, ordering, chunk sizes, limits, adjustment defaulting, fallback conditions, trace labels, selected-node rules, completeness annotation, totals, and legacy Main normalization byte-for-byte in behavior.

## Exact source-contract retargets

- `workspace-repository-estimate-tree.test.ts`: import pure builder/query types from the new module and read the new source for private query/SQL-order ownership assertions.
- `proposal-export-tab-grouping.test.ts`: retarget grouping/query-type imports only.
- `estimate-tabs-domain.test.ts`: split ownership assertions. Keep public wrappers, authorization/project joins, route traces, and selected-node orchestration against the workspace source; retarget legacy fallback implementation, tab/node/row readers, payload/build/load-limit, and tree trace implementation to the new source.
- `live-estimate-node-route.test.ts`: keep ownership/project-routing joins against the workspace source and retarget only `buildEstimateTree` ownership.

Do not re-export builders from `workspace-repository.ts` and do not perform a pathname-only source-test replacement.

## AC-003 / TEST-003

Pass only when the workspace repository has no moved D1/build implementation, the new module has no reverse orchestration dependency, all current public caller contracts remain intact, and the four focused files pass:

```sh
bunx vitest run tests/vitest/workspace-repository-estimate-tree.test.ts tests/vitest/proposal-export-tab-grouping.test.ts tests/vitest/estimate-tabs-domain.test.ts tests/vitest/live-estimate-node-route.test.ts
```

Also require scoped TypeScript, ESLint, `git diff --check`, residue scans, refreshed GitNexus impact for the CRITICAL `getEstimateTabTree` surface, and change detection.
