# UNIT-007 Execution Addendum 2 — Contract Hardening

This is the current execution source for `UNIT-007`, `AC-007`, and `TEST-007`. It supersedes `UNIT-007-EXECUTION-ADDENDUM.md` for execution while preserving that file as preflight provenance. The canonical plan still controls the fixed dispatcher-to-family map, the narrow Admin pointer edit, and all behavior-preservation requirements unless this addendum explicitly deepens them.

## Execution gate

Start only after the manifest advances to `UNIT-007`, all earlier writers are terminal, and every owned path is re-read against current source. Refresh GitNexus before editing. The current index reports `CRITICAL` impact for the façade and history preparation and `HIGH` impact for row, template, reusable-source, proof-router, and action consumers; disclose that risk and reconcile every direct caller before the first edit.

Use one writer and the four fixed checkpoints in the canonical plan. At each checkpoint, move one family and its callers together, delete the retired façade branch for that family, run the narrow static/focused gate, and only then continue. Never keep both implementations active for the same operation.

## Additional owned paths

Add these paths to the canonical owned set:

- new `src/lib/estimates/d1-intents/intent-context.ts`
- new internal `src/lib/estimates/d1-intents/_component-identity.ts`
- new `tests/vitest/estimate-record-d1-intents.test.ts`

The exact focused gate therefore contains 21 test files, not 20. No other product or test path is authorized by this unit.

## Mandatory acyclic dependency graph

Dependencies point left to right:

```text
database
  -> intent-context
  -> access
  -> history-events
  -> tabs / nodes / rows / templates / bulk-sheets / component-impact
  -> estimate-records
  -> actions

_component-identity
  -> rows
  -> component-impact

database + access + rows
  -> estimate-history-proof-router

database + history-events
  -> reusable-sources/actions
```

Hard constraints:

- `intent-context.ts` imports only `database.ts`, canonical D1 authz helpers, `mutation-receipts.ts`, IDs, and shared types.
- `history-events.ts` does not import `nodes.ts`; the action adapter resolves optional node scope and passes it into the history read.
- `tabs.ts`, `nodes.ts`, and `rows.ts` do not import `estimate-records.ts`; `estimate-records.ts` alone coordinates graph duplication helpers.
- `_component-identity.ts` is internal-only and may be imported only by `rows.ts` and `component-impact.ts`. It owns the single canonical component identity SQL/fingerprint helpers currently shared inside the façade.
- Actions, proof code, reusable sources, and tests do not import either internal helper module.
- No `d1-intents` module imports another module to its right in the graph.
- The four current GitNexus cycles may remain. No new cycle may contain `d1-intents`, Estimate actions, reusable sources, or the proof router.

## Actor and session trust contract

Use one actor type:

```ts
export type EstimateD1Actor = Readonly<
  Pick<CurrentUserContext, "userId" | "role">
>;
```

Session identity remains confined to trusted adapters. `src/lib/estimates/actions.ts` and `src/lib/reusable-sources/actions.ts` retain their existing Server Action authentication boundaries, including `requireCurrentUserContext` where currently required. The proof router retains its existing proof-auth boundary and passes its explicit editor, viewer, or stranger actor into typed intents. No `d1-intents` module may import `requireCurrentUserContext`, `getCurrentUserContext`, `headers`, or cookies.

Mandatory rules:

- `canEditEstimate` and `canEditProject` accept `EstimateD1Actor | null`; null returns `false` without preparing a D1 statement.
- Every guarded mutation takes a non-null actor as its second argument and defensively rejects a runtime-null actor with the existing denial message.
- Mutation input objects contain no `acting_user_id`, `actingUserId`, `actorUserId`, `createdBy`, or `updatedBy` field.
- History actors, mutation receipts, activation intents, audit actors, `created_by`, and `updated_by` derive only from `actor.userId`.
- A spoofed extra actor-shaped field on a runtime-cast payload must not affect any write, event, receipt, or return value.
- `HistoryEventInput.actorUserId` remains only for trusted infrastructure history producers. Family mutations construct it internally from the injected actor.
- Bulk-sheet preview and execute receive the actor explicitly and remove both hidden session lookups now present in the façade path.
- Guarded typed intents repeat authorization internally. Existing action-layer authorization, telemetry, rate limiting, and normalization remain even though this produces a second read-only access probe.
- The proof router passes its explicit editor, viewer, or stranger actor directly. It may not install a global actor override or resolve a session.
- `reusable-sources/actions.ts` resolves its actor at the Server Action boundary and passes that actor into the typed history intent. It does not move session lookup into `d1-intents`.

## Shared types and internal context contract

Type ownership is explicit:

- `database.ts` owns and exports `D1IntentStatement` and the shared D1 execution result aliases it needs.
- `intent-context.ts` owns and exports `EstimateD1Actor` plus the three intent-context types.
- `history-events.ts` owns and exports `HistoryEventInput`, `PreparedHistoryEvent`, `EstimateSheetHistoryCursor`, `EstimateSheetHistoryEvent`, `EstimateSheetVersionControlData`, and `NormalizedEstimateSheetVersionControlRead`.
- `rows.ts` owns its authoritative row and conflict result types.
- `component-impact.ts` owns its two public impact types.
- `access.ts` owns its image descriptor and retention metric result types.
- `actions.ts` type-re-exports the existing client-consumed history, retention, and component-impact types from their owning modules. Family modules never import types from `actions.ts`.

```ts
export type D1IntentStatement = {
  sql: string;
  values?: readonly unknown[];
};

export type HistoryEventInput = {
  projectId: string;
  estimateId: string;
  workspaceId?: string | null;
  estimateNodeId?: string | null;
  estimateTabId?: string | null;
  targetRowId?: string | null;
  eventType: string;
  actorUserId?: string | null;
  correlationId: string;
  changedFields?: string[];
  rowContext?: Record<string, unknown>;
  oldSnapshot?: unknown;
  newSnapshot?: unknown;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  totalDelta?: number | null;
};

export type PreparedHistoryEvent =
  | { eventId: string; statement: null; outboxStatement: null }
  | {
      eventId: string;
      statement: D1IntentStatement;
      outboxStatement: D1IntentStatement;
    };

export type EstimateIntentProjectContext = {
  projectId: string;
  workspaceId: string;
};

export type EstimateIntentContext = EstimateIntentProjectContext & {
  estimateId: string;
};

export type EstimateMutationIntentContext = EstimateIntentContext & {
  actorUserId: string;
  commandKind: string;
  intentId: string;
  requestFingerprint: string;
};
```

`intent-context.ts` exports exactly:

- `EstimateD1Actor`
- `EstimateIntentProjectContext`
- `EstimateIntentContext`
- `EstimateMutationIntentContext`
- `readEstimateIntentProjectContext(database, projectId)`
- `readEstimateIntentContext(database, { projectId, estimateId })`
- `assertProjectEditIntent(database, actor, projectId)`
- `assertEstimateEditIntent(database, actor, estimateId)`
- `prepareEstimateMutationIntent<T>(database, actor, { projectId, estimateId, correlationId, commandKind, request })`
- `readConcurrentEstimateMutationReceipt<T>(database, context)`
- `buildEstimateMutationReceiptStatement(...)`
- `buildProjectPublicationRevisionForEstimate(...)`
- `buildProjectPublicationRevisionForProject(...)`

`prepareEstimateMutationIntent` returns `{ context, committedResult }`, where `committedResult` is `T | null`. These helpers preserve existing receipt fingerprints, replay, mismatch, and publication-revision SQL without exposing façade arguments.

## Concrete public export contract

All functions return typed domain values or throw. Inputs use camelCase domain names; legacy snake-case façade arguments end at the action adapter and are not reproduced in the new modules.

### `database.ts`

Export only:

```ts
requireEstimateD1Database(): Promise<D1DatabaseLike>;
firstD1Row<T>(database, sql, values?): Promise<T | null>;
allD1Rows<T>(database, sql, values?): Promise<T[]>;
runD1Statement(database, sql, values?): Promise<D1Result>;
runD1Batch(database, statements): Promise<void>;
runPreparedD1Batch(database, statements, preparedStatements): Promise<void>;
```

It owns D1 acquisition, prepare/bind/run, batch execution, and row normalization only. It exposes no table names, projections, action strings, `.from`, `.select`, `.call`, class, client, or query emulation.

### `access.ts`

Export only:

```ts
canEditEstimate(database, actor, estimateId): Promise<boolean>;
canEditProject(database, actor, projectId): Promise<boolean>;
validateEstimateRowImageAsset(database, {
  projectId, estimateId, rowId, assetId, uploadSessionId,
}): Promise<EstimateRowImageAssetDescriptor | null>;
getEstimateActivityRetentionMetrics(database, {
  projectId,
}): Promise<EstimateActivityRetentionMetrics | null>;
```

The image descriptor and retention metric shapes remain byte-for-byte compatible with current consumers. Access-probe failures are adapted to `false` only by the capability-read action; validation/read errors otherwise propagate.

### `history-events.ts`

Export only:

```ts
prepareHistoryEventInsert(database, input): Promise<PreparedHistoryEvent>;
insertHistoryEvent(database, input): Promise<string>;
runMutationWithHistory(database, mutationStatements, historyInput, preparedStatements?): Promise<string>;
readEstimateSheetVersionControl(database, normalizedInput): Promise<EstimateSheetVersionControlData>;
```

The profiles actor-label query remains private. The existing event/outbox batch coupling, idempotent existing-event union, correlation behavior, statement order, and event return IDs are unchanged.

The normalized read input is frozen as:

```ts
export type NormalizedEstimateSheetVersionControlRead = {
  projectId: string;
  estimateId: string;
  eventLimit: number;
  filters: {
    eventTypes: string[];
    dateFrom: string | null;
    dateTo: string | null;
    searchPattern: string | null;
  };
  fetchSheetEvents: boolean;
  targetRowId: string | null;
  targetNodeId: string | null;
  includeDescendants: boolean;
  nodeScope: {
    nodeIds: string[];
    rowIds: string[];
  } | null;
  sheetCursor: EstimateSheetHistoryCursor | null;
  rowCursor: EstimateSheetHistoryCursor | null;
  nodeCursor: EstimateSheetHistoryCursor | null;
};
```

`actions.ts` retains authentication, workspace/project resolution, public input normalization, event-type/date/search validation, limit bounding, cursor validation, and scope selection. When node activity is requested it calls `nodes.ts:resolveEstimateActivityNodeScope` first and passes the result. `history-events.ts` owns event SQL, cursor predicates, descendant node/row filtering from the supplied scope, dormant-event exclusion, paging, private profile label lookup, and final event/result normalization. It does not re-resolve authorization or import nodes/actions.

### `estimate-records.ts`

Export:

- `getEstimateRecordForProject(database, { projectId, estimateId })`
- `getNextEstimateSheetCode(database, { projectId, excludedEstimateId? })`
- `createEstimateRecordWithDefaultTab(database, actor, { project, name, sheetCode })`
- `duplicateEstimateRecordGraph(database, actor, { projectId, estimateId })`
- `updateEstimateDetailsWithHistory(database, actor, { projectId, estimateId, correlationId, patch })`
- `updateEstimateSheetAdjustmentWithHistory(database, actor, { projectId, estimateId, correlationId, mode, percentage, expectedRowRevision })`

`createEstimateRecordWithDefaultTab` returns `{ estimate, firstNodeId: null, nodeCount: 0 }`. `duplicateEstimateRecordGraph` returns the new estimate, first landing node, node and row counts, total project cost, and sheet code. It alone coordinates tab, node, and row duplication helpers while preserving active-tab filtering, legacy synthetic-default fallback, parent-before-child writes, unsafe-row-image sanitization, fresh identity maps, area-first depth-first landing-node selection, current non-atomic sequencing, and current error messages.

### `tabs.ts`

Export the six fixed tab mutations plus `createDefaultEstimateTab`, `readEstimateTabsForDuplication`, and `insertEstimateTabsForDuplication`.

Inputs are `(database, actor, { projectId, estimateId, correlationId, ...operationFields })`. Operation fields are: create `{ name }`; rename `{ tabId, name }`; reorder `{ updates: Array<{ id, sortOrder }> }`; duplicate `{ sourceTabId, name? }`; archive/delete `{ tabId }`. Preserve the current result fields, including both `estimateTabId` and `tabId` for create, duplicate counts/fingerprint/event ID, and delete replacement/count fields. Duplication reads return `[]` for a legacy estimate; only the coordinator creates `__legacy_default_tab__`.

### `nodes.ts`

Export the five fixed node mutations plus:

- `getEstimateNodeForProject(database, { projectId, estimateId, nodeId })`
- `resolveEstimateActivityNodeScope(database, { projectId, estimateId, nodeId, includeDescendants })`
- `readEstimateNodesForDuplication(...)`
- `insertEstimateNodesForDuplication(...)`

Create input is `{ parentNodeId, estimateTabId, kind: "group" | "area", name }`; the module owns the exact parent, tab, archived-tab, sibling, and maximum-sort reads rather than accepting a caller-computed sort order. Reorder accepts `{ updates: Array<{ id, parentId, sortOrder }> }`. Delete accepts `{ nodeIds }`; restore accepts `{ sourceEventId, nodeIds? }`. Preserve existing payload aliases, delete/restore counts, fallback node, topology guards, attachment-retention statements, activation outbox behavior, and error strings.

### `rows.ts`

Export the nine fixed row mutations plus:

- `getEstimateRowForProject(database, { projectId, estimateId, rowId })`
- `readEstimateRowsForDuplication(...)`
- `insertEstimateRowsForDuplication(...)`

Every mutation takes `(database, actor, input)`. The shared scope is `{ projectId, estimateId, correlationId }`. Preserve these operation fields:

- insert: `{ nodeId, activeTabId, rowPayload, librarySource? }`
- duplicate: `{ sourceRowId, expectedSourceRowRevision, targetNodeId, activeTabId, duplicatedRowId }`
- update: `{ rowId, expectedRowRevision, rowPatch, componentMutationIntent?, expectedComponentImpactFingerprint?, removedPriceOptionReplacements? }`
- replace: `{ rowId, expectedRowRevision, replacementPayload, librarySource }`
- delete: `{ rowId, expectedRowRevision }`
- bulk delete: current row-ID/revision list and current conflict result union
- move item: current ordered row-ID/revision/target-node input and current authoritative-row result
- move component: `{ activeTabId, sourceRowId, targetRowId, expectedSourceRowRevision, expectedTargetRowRevision, sourceLibraryItem, targetLibraryItem }` and the current conflict result union. The action passes both raw Library sources. The row intent privately re-reads and revalidates both sources, including current cost and option projections, then constructs both replacement payloads before preparing any write. It must not accept caller-built replacement payloads alongside the raw sources.
- restore: `{ sourceEventId, rowIds?, activeTabId? }`; there is no target-node field

The row history result keeps `rowId`, optional `eventId`, and the full authoritative row fields currently returned by the façade. Conflict unions remain values with `status: "conflict"`, conflict row IDs, and authoritative rows. Library item, option, current-cost, source/component fingerprint, attachment, and move projections remain private. `librarySource` is supplied to the public insert/replace intent, which privately re-reads and validates freshness before any batch; tests exercise the public intent, never a projection helper.

### `templates.ts`, `bulk-sheets.ts`, and `component-impact.ts`

`templates.ts` exports exactly the three fixed insertion functions. They take `(database, actor, { projectId, estimateId, correlationId, targetParentNodeId, targetTabId?, unavailableSourcePolicy, templateId | templateIds | templateNodeId })`. The return is non-null and is exactly the current confirmation-or-inserted union, including existing camel/snake compatibility aliases and statement counts. Plural insertion remains one ordered atomic history/receipt batch, not repeated singular calls.

`bulk-sheets.ts` exports only preview and execute. Both take `(database, actor, input)`. Preview input is `{ projectId, estimateIds }`; execute adds `{ expectedPreviewHash, correlationId }`. Preserve stable sorting/hash, retention/revision/delete/audit order, one atomic execute batch, stale-preview zero-write behavior, and current `rpc_error` action adaptation.

`component-impact.ts` exports only `previewEstimateComponentEditImpact`, `EstimateComponentEditImpact`, and `EstimateComponentEditImpactEstimate`. The function takes `(database, actor, { projectId, estimateId, rowId })`. `actions.ts` may type-re-export the two types but may not retain an implementation façade.

## Direct-query disposition

Every current shallow query has one owner:

| Current query family | Mandatory owner |
|---|---|
| Profiles actor labels | private `history-events.ts` helper |
| Activity node/descendant and scoped row IDs | `nodes.ts:resolveEstimateActivityNodeScope` |
| Project-scoped estimate read/reload | `estimate-records.ts:getEstimateRecordForProject` |
| Estimate-code list/uniqueness | private helper behind `getNextEstimateSheetCode` and create/update checks |
| Project-scoped node validation | `nodes.ts:getEstimateNodeForProject` |
| Project-scoped row validation | `rows.ts:getEstimateRowForProject` |
| Library item/option/current-cost freshness | private row-intent helpers |
| Estimate insert and legacy-column fallback | `createEstimateRecordWithDefaultTab` plus private record insert |
| Default-tab insert | `tabs.ts:createDefaultEstimateTab` |
| Version/event/profile reads | `history-events.ts:readEstimateSheetVersionControl` |
| Tree reorder topology/sibling reads | owning node intent |
| Estimate graph duplication | record coordinator plus tab/node/row duplication helpers |
| Bulk delete preview and cascade reads | owning bulk-sheet intents |
| Template header/node/row/source reads | owning template intents |
| Component identity/impact projections | `_component-identity.ts`, `rows.ts`, and `component-impact.ts` only |

No façade-style faux query, client, table-string API, or dispatcher access remains in actions, reusable sources, or the proof router. Estimate production operations in those adapters use named typed intents. `reusable-sources/actions.ts` retains its purpose-built subtree-copy SQL and owns that workflow directly; it must not depend on the retired façade. The proof router retains only its proof fixture/setup/cleanup SQL and uses typed intents for the estimate operations being proved.

## Return, null, and error adaptation

- Functions return typed values or throw. Do not recreate `{ data, error }` in the intent layer.
- Only row-first reads, scoped getters, image validation, retention metrics, committed receipt lookups, and the idempotent history union return null.
- Collection reads return `[]`, never null. Successful mutations never return null or undefined.
- Row conflict unions remain values; D1/runtime failures remain throws.
- Row mutations and sheet adjustment retain `throwEstimateRowMutationError` adaptation.
- Bulk actions retain current `rpc_error` results.
- Template, tab, node, and estimate actions retain their current operation-specific error prefixes and confirmation parsing.
- Node rename, create/duplicate estimate, component impact, and history reads retain their current propagation behavior.
- `canEditEstimate` and `canEditProject` return `false` for a missing record, null actor, or explicit denial. With a non-null actor, D1 preparation/execution failures propagate from the typed access intent.
- Only the public `fetchEstimateEditCapability` action catches an access-probe failure and adapts it to `false`, preserving its current public capability contract. Other validation and read errors propagate unless an operation-specific adapter above says otherwise.

The proof router may own this narrow adapter only:

```ts
export async function captureEstimateHistoryProofIntent<T>(
  operation: () => Promise<T>,
): Promise<{ data: T | null; error: Error | null }>;
```

It converts an expected typed-intent result/throw into the existing proof JSON fields. It does not become a general repository wrapper. Every proof mutation goes through it; cleanup still runs after both expected denials and unexpected throws, and unexpected throws produce the existing 500 proof response.

## Implementation checkpoints

1. Add `database`, `intent-context`, `access`, and `estimate-records`; migrate capability, image, retention, create/duplicate/details/adjustment callers; remove their façade branches.
2. Add `tabs`, `nodes`, `templates`, and `bulk-sheets`; migrate action callers; remove their branches.
3. Add `_component-identity`, `rows`, `component-impact`, and `history-events`; migrate Estimate actions and direct history consumers; remove their branches and faux-table reads.
4. Migrate reusable sources and the proof router, make the exact Admin pointer edit, delete every client/query/dispatcher symbol, then delete `d1-action-client.ts`.

Reread shared action/proof files immediately before each patch. Do not start UNIT-008 until UNIT-007 is fully verified and the final Server Action adapter shapes are stable.

## TEST-007 proof matrix

In addition to preserving existing assertions, the focused files must prove:

- `estimate-record-d1-intents.test.ts`: active multi-tab and legacy-fallback graph duplication, irregular parent order, fresh IDs/maps, source row sanitization, landing-node selection, counts, actor attribution, and intentional non-atomic sequencing.
- `activity-durable-write.test.ts`: import `HistoryEventInput` and all three history functions directly from `history-events.ts`; preserve exact event/outbox/idempotency and batch-failure assertions.
- `mass-deletion-contract.test.ts`: direct preview/execute happy path, stable sorted hash, full ordered cascade/audit batch, injected actor, and stale-preview zero writes.
- `estimate-template-trusted-insert.test.ts`: plural templates remain one ordered batch with one history event, outbox, and receipt; preserve the 1,000-statement boundary.
- `estimate-action-d1-library-source-projection.test.ts`: public replace-row intent accepts a current Library source and rejects stale source data before row/history writes; component move revalidates both source and target Library sources, including current cost and option projections, before preparing either row/history write and performs zero writes when either source is stale; private projections remain private.
- `d1-access-created-by.test.ts`: null actor returns false for estimate and project access without preparing SQL.
- `estimate-actions-d1-reorder-history.test.ts`: runtime-cast spoof actor data never reaches history, receipts, activation, or audit values.
- `security-findings-auth-contracts.test.ts`: the proof router imports typed access/row intents directly, has no client/class/`.call`, adapts expected denials without aborting proof output, returns unexpected throws as 500, and performs cleanup in both paths.

Exact command:

```sh
bunx vitest run tests/vitest/activity-durable-write.test.ts tests/vitest/activity-history-lifecycle-contract.test.ts tests/vitest/activity-variant-propagation.test.ts tests/vitest/d1-access-created-by.test.ts tests/vitest/estimate-action-d1-library-source-projection.test.ts tests/vitest/estimate-actions-d1-reorder-history.test.ts tests/vitest/estimate-actions-d1-row-restore-history.test.ts tests/vitest/estimate-area-activation-batch.test.ts tests/vitest/estimate-insert-target-authz.test.tsx tests/vitest/estimate-node-reorder-action.test.ts tests/vitest/estimate-record-d1-intents.test.ts tests/vitest/estimate-revision-fact-producers.test.ts tests/vitest/estimate-row-activation-batch.test.ts tests/vitest/estimate-row-atomic-d1-contracts.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts tests/vitest/estimate-sheet-create-empty-tree.test.ts tests/vitest/estimate-sheet-version-control-actions.test.ts tests/vitest/estimate-template-trusted-insert.test.ts tests/vitest/mass-deletion-contract.test.ts tests/vitest/security-findings-auth-contracts.test.ts tests/vitest/upload-domain-contracts.test.ts
```

Also require full TypeScript, ESLint scoped to all owned production/test paths, scoped and repository `git diff --check`, GitNexus `detect_changes`, and `check({ cycles: true })` against the four-cycle baseline.

## Mandatory residue and scope proof

All canonical residue commands still apply, plus:

```sh
rg -n 'acting_user_id|actingUserId|requireCurrentUserContext|getCurrentUserContext' src/lib/estimates/d1-intents
rg -n 'intent-context|_component-identity' src/lib/estimates/actions.ts src/lib/reusable-sources/actions.ts src/lib/cloudflare/estimate-history-proof-router.ts tests/vitest
```

Both commands must be empty. Exact Admin diff proof must show only the `sources.persistence` path and note changed. `d1-action-client.ts` must be absent, and no compatibility re-export, class, client, dispatcher, query builder, table-string API, or second storage implementation may remain.

## Pass condition

`AC-007` passes only when every old dispatcher/direct-query operation has one typed owner, session and actor trust are explicit, the dependency graph is acyclic relative to the four-cycle baseline, all 21 focused files pass, TypeScript/lint/diff/residue gates pass, Admin scope is exact, graph impact matches the intended Estimate/history/reusable-source/proof flows, and an independent adversarial review finds no remaining correctness or architecture defect.
