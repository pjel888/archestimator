# Estimate Mutation Primitive Map

Evidence-backed map of the shared integrity primitives that already exist in
the `d1-intents/` family and siblings. Produced by the 2026-07-21 deep
code-tree trace. Pack D routes forks through these; it does NOT extract new
primitives.

## Primitive surface

### `src/lib/estimates/d1-intents/database.ts` — D1 I/O

| Export | Signature | Line |
|--------|-----------|------|
| `D1IntentStatement` | type `{ sql: string; values?: readonly unknown[] }` | 11 |
| `requireEstimateD1Database` | `() => Promise<D1DatabaseLike>` | 36 |
| `firstD1Row<T>` | `(database, sql, values?) => Promise<T \| null>` | 42 |
| `allD1Rows<T>` | `(database, sql, values?) => Promise<T[]>` | 50 |
| `runD1Statement` | `(database, sql, values?) => Promise<D1Result>` | 60 |
| `runD1Batch` | `(database, statements) => Promise<void>` (prefers `.batch`, falls back to serial) | 70 |
| `runPreparedD1Batch` | `(database, statements, preparedStatements) => Promise<void>` | 87 |

### `src/lib/estimates/d1-intents/history-events.ts` — history + outbox

| Export | Signature | Line |
|--------|-----------|------|
| `prepareHistoryEventInsert` | `(database, input: HistoryEventInput) => Promise<PreparedHistoryEvent>` | 328 |
| `insertHistoryEvent` | `(database, input) => Promise<string>` | 414 |
| `runMutationWithHistory` | `(database, mutationStatements, historyInput, preparedStatements?) => Promise<string>` | 425 |

`PreparedHistoryEvent` is `{ statement: null }` for idempotent replay, or
`{ statement, outboxStatement }` — a 2-element batch where `outboxStatement`
inserts into `activity_event_outbox` with `ON CONFLICT(event_id) DO NOTHING`
(history-events.ts:401-410). **The outbox row is mandatory** — it is what
`reconcileActivityOutbox` (worker.ts cron) drains to produce the workspace
activity feed.

Canonical `estimate_sheet_events` INSERT columns (history-events.ts:355-378):
`id, estimate_id, workspace_id, project_id, estimate_node_id, estimate_tab_id,
target_row_id, event_type, event_source, correlation_id, actor_user_id,
changed_fields, row_context, old_snapshot, new_snapshot, payload, metadata,
total_delta, created_at`. `event_source` hardcoded `"server_action"` (line 388).

`runMutationWithHistory` callers (rg across `src/`): **only 3 sibling files** —
`estimate-records.ts:21,366,423`, `tabs.ts:20,415,442,509,702`,
`nodes.ts:24,463,497`. **Zero callers in `rows.ts` or any fork.** Adopting it
in forks is greenfield.

### `src/lib/estimates/d1-intents/intent-context.ts` — access + intent + revision

| Export | Signature | Line |
|--------|-----------|------|
| `readEstimateIntentProjectContext` | `(database, projectId) => Promise<EstimateIntentProjectContext \| null>` | 46 |
| `readEstimateIntentContext` | `(database, {projectId, estimateId}) => Promise<EstimateIntentContext \| null>` | 63 |
| `assertProjectEditIntent` | `(database, actor, projectId) => Promise<EstimateIntentProjectContext>` (throws on deny) | 84 |
| `assertEstimateEditIntent` | `(database, actor, estimateId) => Promise<EstimateIntentContext>` (throws on deny) | 97 |
| `prepareEstimateMutationIntent<T>` | `(database, actor, {projectId, estimateId, correlationId, commandKind, request}) => Promise<{context, committedResult}>` | 120 |
| `readConcurrentEstimateMutationReceipt<T>` | `(database, context) => Promise<T \| null>` | 152 |
| `buildEstimateMutationReceiptStatement` | `(context, resourceType, resourceId, result, timestamp) => D1IntentStatement` | 163 |
| `buildProjectPublicationRevisionForEstimate` | `(projectId, workspaceId, estimateId) => D1IntentStatement` | 179 |
| `buildProjectPublicationRevisionForProject` | `(projectId, workspaceId) => D1IntentStatement` | 201 |

`prepareEstimateMutationIntent` is the composed entrypoint: access check +
context resolution + fingerprint (`createMutationRequestFingerprint`, sha256
over canonicalized request JSON) + idempotent receipt read. The fingerprint is
the load-bearing idempotency token — stored in
`estimate_mutation_receipts.request_fingerprint`, compared on every replay. A
mismatch raises `MutationIntentConflictError`.

### `src/lib/estimates/d1-intents/access.ts` — access wrappers

| Export | Signature | Line |
|--------|-----------|------|
| `canEditEstimate` | `(database, actor \| null, estimateId) => Promise<boolean>` | 57 |
| `canEditProject` | `(database, actor \| null, projectId) => Promise<boolean>` | 66 |

Pure passthrough to `canEditEstimateStrictInD1` / `canEditProjectStrictInD1` in
`authz/d1-access.ts`, with a null-actor short-circuit. The non-strict
`canEditEstimateInD1` / `isWorkspaceEditorInD1` / `canAccessEstimateInD1` also
live in `authz/d1-access.ts` and are what the forks import directly (the gap
UNIT-004 closes).

### `src/lib/estimates/mutation-receipts.ts` — idempotency receipts + limit

| Export | Signature | Line |
|--------|-----------|------|
| `D1_MUTATION_HARD_STATEMENT_LIMIT` | const `1_000` | 5 |
| `MutationIntentConflictError` | class `Error` (`code = "mutation_intent_conflict"`) | 28 |
| `createMutationRequestFingerprint` | `(value: unknown) => string` (sha256 over canonicalized JSON) | 48 |
| `assertD1MutationStatementLimit` | `(statementCount: number) => void` (throws >1000) | 52 |
| `readCommittedMutationReceipt<T>` | `(database, identity, parseResult) => Promise<T \| null>` | 61 |
| `buildCommittedMutationReceiptStatement` | `(identity & {resourceType, resourceId?, result, timestamp}) => MutationReceiptStatement` | 89 |

Receipt row (`estimate_mutation_receipts`): `id, workspace_id, command_kind,
intent_id, actor_user_id, resource_type, resource_id, request_fingerprint,
status='committed', result_json, created_at, updated_at`. Composite dedupe key
`(workspace_id, command_kind, intent_id)`.

### `src/lib/estimates/project-component-attachment-retention.ts` — retention

| Export | Signature | Line |
|--------|-----------|------|
| `buildProjectComponentAttachmentDeleteRetentionStatements` | `({workspaceId, projectId, sourceDeleteEventId, deletedRows, deletedAt}) => ProjectComponentAttachmentRetentionStatement[]` | 90 |
| `buildProjectComponentAttachmentRestoreRetentionStatements` | `({projectId, sourceDeleteEventId, restoredRows, restoredAt}) => { guardStatements, releaseStatements }` | 138 |
| `expireProjectComponentAttachmentRetentionHolds` | `(database, options?) => Promise<{...counts}>` | 212 |

6 consumers (rg): `apply.ts:8,1470`, `d1-intents/{rows:27,2605,2720, tabs:10,767,
bulk-sheets:6,150, nodes:9}.ts`, `app/api/internal/upload-cleanup/route.ts`.

## Fork gap matrix (9 forks)

Legend: ✓ consumes; ✗ re-implements/skips; — N/A; partial = some sub-primitives.

| Fork | database | history+outbox | intent/receipt/fingerprint | revision guard | statement limit | access | retention |
|------|----------|----------------|----------------------------|----------------|-----------------|--------|-----------|
| `ai/package-builder/apply.ts` | ✗ | ✗ (UNIT-001) | ✗ (UNIT-002) | ✗ | ✗ | half (UNIT-004) | ✓ |
| `estimates/express-promotion-actions.ts` | ✗ | ✗ (UNIT-001) | ✗ (UNIT-002) | ✗ | ✗ | half (UNIT-004) | — |
| `component-library/component-mutation-d1.ts` | ✗ | ✗ (UNIT-001) | partial | ✗ (UNIT-003) | ✓ | delegated | — |
| `component-library/template-propagation-d1.ts` | ✗ | ✓ | ✗ | ✓ | ✓ | bg job (UNIT-004 exception) | — |
| `component-library/template-instance-actions.ts` | ✓ | ✓ | ✓ | ✓ | ✗ | half (UNIT-004) | — |
| `component-library/template-lifecycle-actions.ts` | ✗ indirect | ✗ (UNIT-001) | partial | ✗ | ✓ indirect | half (UNIT-004) | — |
| `component-library/component-permanent-delete.ts` | ✗ | ✗ (UNIT-001) | ✗ (UNIT-002) | ✗ (UNIT-003) | ✗ | delegated | — |
| `reusable-sources/actions.ts` | ✓ | ✓ | ✓ | ✗ (UNIT-003) | ✓ | half (UNIT-004) | — |
| `component-library/template-linked-mutation-d1.ts` | self-contained | n/a | self-contained | self-contained | — | — | — |

UNIT-NNN annotations show which Pack D unit addresses each gap.

## Canonical write-path composition (the reference pattern)

From `rows.ts:1918-2070` (`updateEstimateRowItemWithHistory` and siblings),
repeated at 7 sites:

```ts
const { context, committedResult } = await prepareEstimateMutationIntent<Result>(
  database, actor, { projectId, estimateId, correlationId, commandKind, request: rowPatch }
);
if (committedResult) return committedResult; // idempotent replay

const prepared = await prepareHistoryEventInsert(database, { estimateId, projectId, ... });

const statements: D1IntentStatement[] = [
  ...mutationStatements,
  buildProjectPublicationRevisionForEstimate(projectId, workspaceId, estimateId),
  buildEstimateMutationReceiptStatement(context, "estimate_row", rowId, result, timestamp),
  ...(prepared.statement ? [prepared.statement, prepared.outboxStatement!] : []),
  ...buildProjectComponentAttachmentDeleteRetentionStatements({ ... }),
];
assertD1MutationStatementLimit(statements.length);
await runPreparedD1Batch(database, statements, preparedStatements);
return result;
```

Pack D's work: make each fork compose this shape (or the subset relevant to its
mutation) instead of hand-rolling pieces.

## What Pack D does NOT do

- Does NOT extract new primitives (they exist).
- Does NOT extend `runMutationWithHistory` to be the single composed entrypoint
  (a possible future uplift, but not required — the per-fork composition à la
  `rows.ts` is sufficient and matches the existing canonical pattern).
- Does NOT merge the 9 write paths (each exists for a reason).
