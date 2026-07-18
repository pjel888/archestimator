# UNIT-007 Execution Addendum

This addendum is the current execution source for `UNIT-007`, `AC-007`, and `TEST-007`. It closes the direct-query export, duplication-orchestration, actor, return-shape, and test-retarget choices found during current-source preflight. Where this addendum conflicts with UNIT-007 wording in `IMPLEMENTATION_PLAN.md`, this addendum controls; the fixed dispatcher map, owned paths, Admin scope boundary, and all other behavior-preservation requirements remain unchanged.

## Execution gate and risk

Start only after the manifest advances to `UNIT-007`, all earlier unit writers are terminal, and every UNIT-007-owned path has been re-read and rehashed. GitNexus preflight is CRITICAL for `EstimateActionsD1Client`, `createEstimateActionsD1Client`, and `prepareHistoryEventInsert`, and HIGH for the faux query/dispatcher plus row, template, history, and reusable-source flows. Migrate and verify the four family checkpoints fixed in the canonical plan; never leave the old facade and a new typed implementation simultaneously active for one operation.

## Frozen concrete exports

`d1-intents/database.ts` exports only:

- `requireEstimateD1Database`
- `firstD1Row`
- `allD1Rows`
- `runD1Statement`
- `runD1Batch`
- `runPreparedD1Batch`

It owns shared D1 acquisition, execution, and row normalization only. It may not own auth, actors, `.from`, action strings, table strings, projection strings, domain policy, or query emulation.

`d1-intents/access.ts` exports:

- `canEditEstimate`
- `canEditProject`
- `validateEstimateRowImageAsset`
- `getEstimateActivityRetentionMetrics`

`d1-intents/estimate-records.ts` exports the two dispatcher functions named in the canonical plan plus:

- `getEstimateRecordForProject`
- `createEstimateRecordWithDefaultTab`
- `duplicateEstimateRecordGraph`

`duplicateEstimateRecordGraph` owns duplication orchestration. Tab, node, and row SQL remains in its owning sibling module. Preserve parent-before-child order, legacy default-tab fallback, row sanitization, landing-node selection, and the current non-atomic sequencing; do not invent a transaction or generic graph copier.

`d1-intents/tabs.ts` exports the six fixed tab mutations plus:

- `createDefaultEstimateTab`
- `readEstimateTabsForDuplication`
- `insertEstimateTabsForDuplication`

`d1-intents/nodes.ts` exports the five fixed node mutations plus:

- `readEstimateNodesForDuplication`
- `insertEstimateNodesForDuplication`
- `resolveEstimateActivityNodeScope`

`d1-intents/rows.ts` exports the nine fixed row mutations plus:

- `readEstimateRowsForDuplication`
- `insertEstimateRowsForDuplication`

Cost-library, price-option, cost-entry, source/component-fingerprint, attachment, and move-projection helpers remain private to `rows.ts`. Do not export raw projection helpers solely for tests.

`d1-intents/templates.ts` exports exactly the three fixed template insertion functions. `d1-intents/bulk-sheets.ts` exports exactly `previewBulkDeleteEstimateSheets` and `executeBulkDeleteEstimateSheets`.

`d1-intents/component-impact.ts` exports `previewEstimateComponentEditImpact`, `EstimateComponentEditImpact`, and `EstimateComponentEditImpactEstimate`. `actions.ts` may publicly re-export the two types from this module, but may not retain an implementation or compatibility facade.

`d1-intents/history-events.ts` preserves these exports:

- `prepareHistoryEventInsert`
- `insertHistoryEvent`
- `runMutationWithHistory`
- `readEstimateSheetVersionControl`

The `profiles` actor-label read and its lookup helper remain private to `history-events.ts`. `reusable-sources/actions.ts` imports `prepareHistoryEventInsert` directly from this module.

## Boundary and behavior rules

- Typed intent functions accept injected D1 and actor context, return domain values, and throw the original errors. Do not recreate `{ data, error }` wrappers.
- Access checks without an actor return `false`. Guarded mutations preserve the exact `"Estimate edit access denied."` error. Server-action authorization, rate limits, telemetry, normalization, domain-response adaptation, revalidation, and client-safe boundaries remain in `actions.ts`.
- The proof router calls `updateEstimateRowItemWithHistory(database, actor, args)` directly.
- Preserve transaction coupling for the primary mutation, idempotency receipt, publication revision, history event, and outbox work.
- Preserve receipt replay and mismatch behavior, optimistic concurrency/row-revision conflicts, source and component fingerprints, cross-project authorization, attachment reconciliation, exact statement ordering, and the 1,000-statement intent boundary.
- Preserve current SQL, bind order, returned domain fields, error names/messages, actor rules, history semantics, and non-atomic behavior where the current implementation is intentionally non-atomic.
- No new generic repository, factory, client, interface, query builder, dispatcher, compatibility re-export, or second storage implementation is allowed.

## Test-source ownership

Source-contract files must read the responsible new module or modules. Class/client tests import the exact typed functions and inject their current D1/actor fixtures.

Retarget `tests/vitest/estimate-action-d1-library-source-projection.test.ts` to private projection ownership in `d1-intents/rows.ts`; it must not force those helpers public. Preserve all existing behavioral assertions in the twenty authorized files. The exact TEST-007 command is:

```sh
bunx vitest run tests/vitest/activity-durable-write.test.ts tests/vitest/activity-history-lifecycle-contract.test.ts tests/vitest/activity-variant-propagation.test.ts tests/vitest/d1-access-created-by.test.ts tests/vitest/estimate-action-d1-library-source-projection.test.ts tests/vitest/estimate-actions-d1-reorder-history.test.ts tests/vitest/estimate-actions-d1-row-restore-history.test.ts tests/vitest/estimate-area-activation-batch.test.ts tests/vitest/estimate-insert-target-authz.test.tsx tests/vitest/estimate-node-reorder-action.test.ts tests/vitest/estimate-revision-fact-producers.test.ts tests/vitest/estimate-row-activation-batch.test.ts tests/vitest/estimate-row-atomic-d1-contracts.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts tests/vitest/estimate-sheet-create-empty-tree.test.ts tests/vitest/estimate-sheet-version-control-actions.test.ts tests/vitest/estimate-template-trusted-insert.test.ts tests/vitest/mass-deletion-contract.test.ts tests/vitest/security-findings-auth-contracts.test.ts tests/vitest/upload-domain-contracts.test.ts
```

Also require TypeScript, scoped ESLint, `git diff --check`, the canonical facade/table/action residue scans, exact Admin-entry diff proof, GitNexus change detection, and import-cycle comparison. The receipt must reconcile every direct production consumer: `estimates/actions.ts`, `reusable-sources/actions.ts`, the Estimate history proof router, and the one Admin persistence pointer.
